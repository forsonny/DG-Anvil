'use strict';

const fs = require('fs');
const path = require('path');
const yaml = require('./yaml.js');
const io = require('./io.js');
const { makeError } = require('./errors.js');

const SCHEMA_PATH = path.join(__dirname, '..', 'plan-schema.json');

function loadSchema() {
  return JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8'));
}

function parse(text) {
  try {
    return yaml.parse(text);
  } catch (err) {
    if (err.code === 'E_INVALID_YAML') throw err;
    throw makeError('E_INVALID_YAML', String(err.message || err), { cause: 'yaml' });
  }
}

function reject(rule, path, expected, actual) {
  throw makeError('E_INVALID_PLAN', 'plan invalid: ' + rule, { rule, path, expected, actual });
}

function validate(parsed, contract) {
  const root = parsed;
  if (!root || typeof root !== 'object' || Array.isArray(root)) reject('missing_version', '$', 'object', typeof root);

  if (!('anvil_plan_version' in root)) reject('missing_version', '$.anvil_plan_version', 'integer', undefined);
  if (root.anvil_plan_version !== 1) reject('wrong_version', '$.anvil_plan_version', 1, root.anvil_plan_version);

  if (!('tasks' in root) || !Array.isArray(root.tasks) || root.tasks.length === 0) {
    reject('missing_tasks', '$.tasks', 'non-empty array', root.tasks);
  }

  const allowedTop = new Set(['anvil_plan_version', 'contract_ref', 'tasks', 'waves']);
  for (const key of Object.keys(root)) {
    if (!allowedTop.has(key)) reject('unknown_top_level_key', '$.' + key, 'one of ' + Array.from(allowedTop).join('|'), key);
  }

  const taskIds = new Set();
  root.tasks.forEach((t, idx) => {
    if (!t || typeof t !== 'object') reject('task_missing_id', '$.tasks[' + idx + ']', 'object', typeof t);
    if (!('id' in t) || typeof t.id !== 'string' || t.id.length === 0) reject('task_missing_id', '$.tasks[' + idx + '].id', 'non-empty string', t.id);
    if (!('wave' in t) || typeof t.wave !== 'number' || !Number.isInteger(t.wave) || t.wave < 0) {
      reject('task_missing_wave', '$.tasks[' + idx + '].wave', 'non-negative integer', t.wave);
    }
    if (!('criterion_ids' in t)) reject('task_missing_criterion_ids', '$.tasks[' + idx + '].criterion_ids', 'non-empty array', undefined);
    if (!Array.isArray(t.criterion_ids) || t.criterion_ids.length === 0) {
      reject('task_empty_criterion_ids', '$.tasks[' + idx + '].criterion_ids', 'non-empty array', t.criterion_ids);
    }
    taskIds.add(t.id);
  });

  const contractCriterionIds = new Set((contract && contract.criteria || []).map(c => c.id));
  if (contract) {
    root.tasks.forEach((t, idx) => {
      t.criterion_ids.forEach(cid => {
        if (!contractCriterionIds.has(cid)) reject('task_unknown_criterion_id', '$.tasks[' + idx + '].criterion_ids', 'known criterion id', cid);
      });
    });
  }

  root.tasks.forEach((t, idx) => {
    if (Array.isArray(t.depends_on)) {
      t.depends_on.forEach(d => {
        if (!taskIds.has(d)) reject('task_unknown_depends_on', '$.tasks[' + idx + '].depends_on', 'existing task id', d);
      });
    }
  });

  try {
    topologicalWaves(root.tasks);
  } catch (err) {
    if (err.code === 'E_INVALID_PLAN') throw err;
    reject('cyclic_dependency', '$.tasks', 'acyclic DAG', err.message);
  }

  const waveById = new Map();
  root.tasks.forEach(t => waveById.set(t.id, t.wave));
  root.tasks.forEach((t, idx) => {
    if (Array.isArray(t.depends_on)) {
      t.depends_on.forEach(d => {
        const dep = waveById.get(d);
        if (dep !== undefined && dep >= t.wave) {
          reject('forward_wave_reference', '$.tasks[' + idx + '].depends_on', 'wave < ' + t.wave, 'wave=' + dep);
        }
      });
    }
  });

  return root;
}

function topologicalWaves(tasks) {
  const byId = new Map();
  tasks.forEach(t => byId.set(t.id, t));
  const state = new Map();
  const order = [];
  function visit(id, stack) {
    const s = state.get(id);
    if (s === 'done') return;
    if (s === 'visiting') reject('cyclic_dependency', '$.tasks', 'acyclic DAG', stack.concat(id).join(' -> '));
    state.set(id, 'visiting');
    const t = byId.get(id);
    if (!t) return;
    if (Array.isArray(t.depends_on)) {
      for (const d of t.depends_on) visit(d, stack.concat(id));
    }
    state.set(id, 'done');
    order.push(id);
  }
  tasks.forEach(t => visit(t.id, []));
  const waves = new Map();
  order.forEach(id => {
    const t = byId.get(id);
    const w = t.wave;
    if (!waves.has(w)) waves.set(w, []);
    waves.get(w).push(id);
  });
  const keys = Array.from(waves.keys()).sort((a, b) => a - b);
  return keys.map(k => waves.get(k));
}

function loadAndValidate(filePath, contract) {
  const text = io.readFileUtf8(filePath);
  const parsed = parse(text);
  validate(parsed, contract);
  return parsed;
}

module.exports = { parse, validate, topologicalWaves, loadAndValidate, loadSchema };
