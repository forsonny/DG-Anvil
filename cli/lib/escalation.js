'use strict';

const fs = require('fs');
const { makeError } = require('./errors.js');

function loadState(statePath) {
  if (!fs.existsSync(statePath)) return null;
  return JSON.parse(fs.readFileSync(statePath, 'utf8'));
}

function listEscalated(statePath) {
  const state = loadState(statePath);
  if (!state || !state.tasks) throw makeError('E_NO_ESCALATED_TASKS', 'no state file or no tasks', { statePath });
  const out = [];
  for (const id of Object.keys(state.tasks)) {
    if (state.tasks[id].status === 'escalated') {
      out.push({ id, snapshot: state.tasks[id] });
    }
  }
  if (out.length === 0) throw makeError('E_NO_ESCALATED_TASKS', 'no escalated tasks', {});
  return out;
}

function describeEscalated(statePath, taskId) {
  const state = loadState(statePath);
  if (!state || !state.tasks || !state.tasks[taskId]) {
    throw makeError('E_ESCALATION_TASK_NOT_FOUND', 'task not found: ' + taskId, { taskId });
  }
  const t = state.tasks[taskId];
  if (t.status !== 'escalated') {
    throw makeError('E_ESCALATION_TASK_NOT_FOUND', 'task is not escalated: ' + taskId, { taskId, status: t.status });
  }
  return {
    id: taskId,
    status: t.status,
    last_lesson_id: t.last_lesson_id || null,
    prior_lesson_ids: t.prior_lesson_ids || [],
    last_verify_result: t.last_verify_result || null,
    options: ['amend contract', 'amend plan', '/abort --from-escalation --task ' + taskId]
  };
}

function escalationBanner(statePath) {
  try {
    const list = listEscalated(statePath);
    return {
      banner: 'anvil_escalation',
      count: list.length,
      task_ids: list.map(x => x.id),
      message: 'Run `anvil escalation describe --task <id>` to inspect.'
    };
  } catch (_) {
    return null;
  }
}

module.exports = { listEscalated, describeEscalated, escalationBanner };
