'use strict';

const io = require('./io.js');
const { makeError } = require('./errors.js');

function nowIso() {
  return new Date().toISOString();
}

function create(opts) {
  const { repoRoot, taskId, baseRef } = opts;
  const branch = 'anvil/task-' + taskId;
  const worktreePath = io.pathJoin(repoRoot, '.anvil-worktrees', 'task-' + taskId);
  const r = io.spawn('git', ['-C', repoRoot, 'worktree', 'add', '-b', branch, worktreePath, baseRef || 'HEAD']);
  if (r.status !== 0) {
    throw makeError('E_WORKTREE_CREATE', 'git worktree add failed', {
      stderr: r.stderr,
      stdout: r.stdout,
      status: r.status,
      taskId,
      worktreePath
    });
  }
  return { worktreePath, branch, baseRef: baseRef || 'HEAD', createdAt: nowIso() };
}

function remove(opts) {
  const { repoRoot, worktreePath } = opts;
  const r = io.spawn('git', ['-C', repoRoot, 'worktree', 'remove', '--force', worktreePath]);
  if (r.status !== 0) {
    const alarm = alarmOrphan({ worktreePath, reason: 'git_remove_failed', details: { stderr: r.stderr, status: r.status } });
    process.stderr.write('ANVIL_ALARM ' + JSON.stringify(alarm) + '\n');
    throw makeError('E_WORKTREE_REMOVE', 'git worktree remove failed', { stderr: r.stderr, status: r.status, worktreePath });
  }
  return { removed: true, worktreePath };
}

function list(opts) {
  const { repoRoot } = opts;
  const r = io.spawn('git', ['-C', repoRoot, 'worktree', 'list', '--porcelain']);
  if (r.status !== 0) {
    throw makeError('E_WORKTREE_CREATE', 'git worktree list failed', { stderr: r.stderr, status: r.status });
  }
  const entries = [];
  let current = {};
  const lines = r.stdout.split(/\r?\n/);
  for (const line of lines) {
    if (line === '') {
      if (Object.keys(current).length) entries.push(current);
      current = {};
      continue;
    }
    const [key, ...rest] = line.split(' ');
    const value = rest.join(' ');
    current[key] = value;
  }
  if (Object.keys(current).length) entries.push(current);
  return entries.map(e => ({ path: e.worktree || null, branch: e.branch || null, HEAD: e.HEAD || null }));
}

function alarmOrphan(opts) {
  const { worktreePath, reason, details } = opts;
  return {
    alarm: 'orphan_worktree',
    worktreePath,
    reason,
    details: details || {},
    at: nowIso()
  };
}

module.exports = { create, remove, list, alarmOrphan };
