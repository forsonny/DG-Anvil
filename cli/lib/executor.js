'use strict';

const crypto = require('crypto');
const worktree = require('./worktree.js');
const io = require('./io.js');
const { makeError } = require('./errors.js');

const MUTABLE_STATE = Object.freeze({});

function deepFreeze(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  Object.keys(obj).forEach(k => deepFreeze(obj[k]));
  return Object.freeze(obj);
}

function hashBriefing(obj) {
  const h = crypto.createHash('sha256');
  h.update(JSON.stringify(obj));
  return 'sha256:' + h.digest('hex');
}

async function executeTask(opts) {
  const start = Date.now();
  const { repoRoot, task, contract, dispatcher } = opts;
  if (!task || !task.id) throw makeError('E_EXECUTOR', 'task.id is required', { rule: 'missing_task_id' });
  if (!contract || !Array.isArray(contract.criteria)) throw makeError('E_EXECUTOR', 'contract.criteria is required', { rule: 'missing_contract' });

  const criteriaById = new Map(contract.criteria.map(c => [c.id, c]));
  const missing = (task.criterion_ids || []).filter(cid => !criteriaById.has(cid));
  if (missing.length > 0) {
    throw makeError('E_EXECUTOR', 'task cites criterion id not in contract', { rule: 'unknown_criterion_id', taskId: task.id, missing });
  }

  let wt;
  try {
    wt = worktree.create({ repoRoot, taskId: task.id, baseRef: task.baseRef || 'HEAD' });
  } catch (err) {
    throw err;
  }

  const criteriaForTask = (task.criterion_ids || []).map(cid => criteriaById.get(cid));
  const briefing = deepFreeze({
    task: {
      id: task.id,
      title: task.title || null,
      criterion_ids: Array.from(task.criterion_ids || []),
      depends_on: Array.from(task.depends_on || []),
      wave: task.wave
    },
    contract: contract,
    worktreePath: wt.worktreePath,
    criteriaForTask: criteriaForTask
  });
  const briefingHash = hashBriefing(briefing);

  let result;
  let status = 'ok';
  let error = null;
  try {
    result = await dispatcher(briefing);
  } catch (err) {
    status = 'error';
    error = { message: err.message || String(err), code: err.code || 'DISPATCHER_THREW', details: err.details || null };
    result = { diff: '', toolOutput: [], status: 'error' };
  }

  const diffDir = io.pathJoin(wt.worktreePath, 'anvil');
  io.ensureDir(diffDir);
  const diffPath = io.pathJoin(diffDir, 'diff.patch');
  io.writeFileUtf8(diffPath, result.diff || '');
  const toolOutputPath = io.pathJoin(diffDir, 'tool-output.jsonl');
  const toolLines = Array.isArray(result.toolOutput)
    ? result.toolOutput.map(r => JSON.stringify(r)).join('\n') + (result.toolOutput.length ? '\n' : '')
    : '';
  io.writeFileUtf8(toolOutputPath, toolLines);

  return {
    taskId: task.id,
    worktreePath: wt.worktreePath,
    diffPath,
    toolOutputPath,
    status,
    error,
    durationMs: Date.now() - start,
    briefingHash
  };
}

module.exports = { executeTask, MUTABLE_STATE };
