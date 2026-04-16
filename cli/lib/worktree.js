'use strict';

const fs = require('fs');
const io = require('./io.js');
const { makeError } = require('./errors.js');

function nowIso() {
  return new Date().toISOString();
}

function branchExists(repoRoot, branch) {
  const r = io.spawn('git', ['-C', repoRoot, 'rev-parse', '--verify', '--quiet', 'refs/heads/' + branch]);
  return r.status === 0;
}

function worktreePathRegistered(repoRoot, worktreePath) {
  const r = io.spawn('git', ['-C', repoRoot, 'worktree', 'list', '--porcelain']);
  if (r.status !== 0) return false;
  return r.stdout.split(/\r?\n/).some(line => line === 'worktree ' + worktreePath);
}

function forceRemoveStale(repoRoot, worktreePath, branch) {
  if (worktreePathRegistered(repoRoot, worktreePath)) {
    io.spawn('git', ['-C', repoRoot, 'worktree', 'remove', '--force', worktreePath]);
  }
  if (fs.existsSync(worktreePath)) {
    try { fs.rmSync(worktreePath, { recursive: true, force: true }); } catch (_) {}
  }
  io.spawn('git', ['-C', repoRoot, 'worktree', 'prune']);
  if (branchExists(repoRoot, branch)) {
    io.spawn('git', ['-C', repoRoot, 'branch', '-D', branch]);
  }
}

function create(opts) {
  const { repoRoot, taskId, baseRef } = opts;
  const branch = 'anvil/task-' + taskId;
  const worktreePath = io.pathJoin(repoRoot, '.anvil-worktrees', 'task-' + taskId);

  forceRemoveStale(repoRoot, worktreePath, branch);

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

function mergeBack(opts) {
  const { repoRoot, taskId, worktreePath, branch, commitMessage } = opts;
  const br = branch || 'anvil/task-' + taskId;
  const wt = worktreePath || io.pathJoin(repoRoot, '.anvil-worktrees', 'task-' + taskId);

  io.spawn('git', ['-C', wt, 'add', '-A']);
  const hasChanges = io.spawn('git', ['-C', wt, 'status', '--porcelain']);
  if (hasChanges.status === 0 && hasChanges.stdout.trim().length > 0) {
    const commitResult = io.spawn('git', ['-C', wt, 'commit', '-m', commitMessage || 'anvil: task ' + taskId]);
    if (commitResult.status !== 0 && !/nothing to commit/.test(commitResult.stdout + commitResult.stderr)) {
      throw makeError('E_WORKTREE_CREATE', 'worktree commit failed', { stderr: commitResult.stderr, status: commitResult.status, taskId });
    }
  }

  const mergeResult = io.spawn('git', ['-C', repoRoot, 'merge', '--no-ff', br, '-m', 'merge anvil/task-' + taskId]);
  if (mergeResult.status !== 0) {
    throw makeError('E_WORKTREE_CREATE', 'merge failed', { stderr: mergeResult.stderr, status: mergeResult.status, taskId, branch: br });
  }

  try { remove({ repoRoot, worktreePath: wt }); } catch (_) {}
  if (branchExists(repoRoot, br)) {
    io.spawn('git', ['-C', repoRoot, 'branch', '-D', br]);
  }

  return { merged: true, branch: br, taskId };
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

module.exports = { create, remove, list, mergeBack, alarmOrphan, forceRemoveStale, branchExists };
