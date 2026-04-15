'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const worktree = require(path.join(__dirname, '..', '..', 'cli', 'lib', 'worktree.js'));
const io = require(path.join(__dirname, '..', '..', 'cli', 'lib', 'io.js'));

function initRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'anvil-wt-'));
  io.spawn('git', ['init', '-q', dir]);
  io.spawn('git', ['-C', dir, 'config', 'user.email', 'test@example.com']);
  io.spawn('git', ['-C', dir, 'config', 'user.name', 'Test']);
  fs.writeFileSync(path.join(dir, 'README.md'), '# test\n');
  io.spawn('git', ['-C', dir, 'add', '.']);
  io.spawn('git', ['-C', dir, 'commit', '-q', '-m', 'initial']);
  return dir;
}

function rmDir(dir) {
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch (_) { /* ignore */ }
}

test('create returns worktreePath, branch, baseRef, createdAt', () => {
  const repo = initRepo();
  try {
    const wt = worktree.create({ repoRoot: repo, taskId: 'T0', baseRef: 'HEAD' });
    assert.ok(wt.worktreePath.includes('task-T0'));
    assert.strictEqual(wt.branch, 'anvil/task-T0');
    assert.ok(typeof wt.createdAt === 'string');
    assert.ok(fs.existsSync(wt.worktreePath));
    worktree.remove({ repoRoot: repo, worktreePath: wt.worktreePath });
  } finally { rmDir(repo); }
});

test('list returns worktree entries', () => {
  const repo = initRepo();
  try {
    const wt = worktree.create({ repoRoot: repo, taskId: 'T1', baseRef: 'HEAD' });
    const entries = worktree.list({ repoRoot: repo });
    const paths = entries.map(e => e.path).filter(Boolean);
    assert.ok(paths.some(p => p && p.includes('task-T1')));
    worktree.remove({ repoRoot: repo, worktreePath: wt.worktreePath });
  } finally { rmDir(repo); }
});

test('remove cleans up worktree', () => {
  const repo = initRepo();
  try {
    const wt = worktree.create({ repoRoot: repo, taskId: 'T2', baseRef: 'HEAD' });
    const r = worktree.remove({ repoRoot: repo, worktreePath: wt.worktreePath });
    assert.strictEqual(r.removed, true);
  } finally { rmDir(repo); }
});

test('create with invalid baseRef throws E_WORKTREE_CREATE', () => {
  const repo = initRepo();
  try {
    worktree.create({ repoRoot: repo, taskId: 'TFAIL', baseRef: 'nonexistent-ref-xyzzy' });
    assert.fail('should throw');
  } catch (err) {
    assert.strictEqual(err.code, 'E_WORKTREE_CREATE');
    assert.ok(err.details && typeof err.details.stderr === 'string');
  } finally { rmDir(repo); }
});

test('alarmOrphan returns structured alarm', () => {
  const a = worktree.alarmOrphan({ worktreePath: '/tmp/x', reason: 'test', details: { note: 'n' } });
  assert.strictEqual(a.alarm, 'orphan_worktree');
  assert.strictEqual(a.worktreePath, '/tmp/x');
  assert.ok(typeof a.at === 'string');
});
