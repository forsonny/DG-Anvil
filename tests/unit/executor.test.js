'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const executor = require(path.join(__dirname, '..', '..', 'cli', 'lib', 'executor.js'));
const worktree = require(path.join(__dirname, '..', '..', 'cli', 'lib', 'worktree.js'));
const io = require(path.join(__dirname, '..', '..', 'cli', 'lib', 'io.js'));
const contractLib = require(path.join(__dirname, '..', '..', 'cli', 'lib', 'contract.js'));

const ROOT = path.resolve(__dirname, '..', '..');

function initRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'anvil-ex-'));
  io.spawn('git', ['init', '-q', dir]);
  io.spawn('git', ['-C', dir, 'config', 'user.email', 'test@example.com']);
  io.spawn('git', ['-C', dir, 'config', 'user.name', 'Test']);
  fs.writeFileSync(path.join(dir, 'README.md'), '# test\n');
  io.spawn('git', ['-C', dir, 'add', '.']);
  io.spawn('git', ['-C', dir, 'commit', '-q', '-m', 'initial']);
  return dir;
}

function rmDir(dir) {
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch (_) {}
}

function getContract() {
  return contractLib.loadAndValidate(path.join(ROOT, 'docs', 'contract-examples', 'good', 'rate-limit-001.yml')).frontmatter;
}

test('MUTABLE_STATE is empty and frozen', () => {
  assert.strictEqual(Object.isFrozen(executor.MUTABLE_STATE), true);
  assert.strictEqual(Object.keys(executor.MUTABLE_STATE).length, 0);
});

test('executeTask with stub dispatcher returns ok and writes artifacts', async () => {
  const repo = initRepo();
  try {
    const contract = getContract();
    const task = { id: 'T0', title: 'x', wave: 0, criterion_ids: ['C1'] };
    const stub = async (briefing) => {
      assert.ok(Object.isFrozen(briefing));
      return { diff: 'diff --placeholder\n', toolOutput: [{ tool: 'stub', stdout: 'ok', stderr: '', status: 0, tool_input_hash: 'sha256:0' }], status: 'ok' };
    };
    const r = await executor.executeTask({ repoRoot: repo, task, contract, dispatcher: stub });
    assert.strictEqual(r.status, 'ok');
    assert.strictEqual(r.taskId, 'T0');
    assert.ok(fs.existsSync(r.diffPath));
    assert.strictEqual(fs.readFileSync(r.diffPath, 'utf8'), 'diff --placeholder\n');
    assert.ok(fs.existsSync(r.toolOutputPath));
    const lines = fs.readFileSync(r.toolOutputPath, 'utf8').split('\n').filter(Boolean);
    assert.strictEqual(lines.length, 1);
    assert.ok(r.briefingHash.startsWith('sha256:'));
    worktree.remove({ repoRoot: repo, worktreePath: r.worktreePath });
  } finally { rmDir(repo); }
});

test('two sequential dispatches: second briefing has no fields from first', async () => {
  const repo = initRepo();
  try {
    const contract = getContract();
    const task1 = { id: 'TA', title: 'a', wave: 0, criterion_ids: ['C1'] };
    const task2 = { id: 'TB', title: 'b', wave: 0, criterion_ids: ['C2'] };
    const briefings = [];
    const stub = async (briefing) => {
      briefings.push(briefing);
      return { diff: '', toolOutput: [], status: 'ok' };
    };
    const r1 = await executor.executeTask({ repoRoot: repo, task: task1, contract, dispatcher: stub });
    const r2 = await executor.executeTask({ repoRoot: repo, task: task2, contract, dispatcher: stub });
    assert.strictEqual(briefings.length, 2);
    assert.strictEqual(briefings[1].task.id, 'TB');
    assert.notStrictEqual(briefings[1].task.id, briefings[0].task.id);
    assert.ok(Object.keys(executor.MUTABLE_STATE).length === 0);
    worktree.remove({ repoRoot: repo, worktreePath: r1.worktreePath });
    worktree.remove({ repoRoot: repo, worktreePath: r2.worktreePath });
  } finally { rmDir(repo); }
});

test('dispatcher throwing yields status=error, no exception escapes', async () => {
  const repo = initRepo();
  try {
    const contract = getContract();
    const task = { id: 'TX', wave: 0, criterion_ids: ['C1'] };
    const stub = async () => { throw new Error('boom'); };
    const r = await executor.executeTask({ repoRoot: repo, task, contract, dispatcher: stub });
    assert.strictEqual(r.status, 'error');
    assert.ok(r.error);
    worktree.remove({ repoRoot: repo, worktreePath: r.worktreePath });
  } finally { rmDir(repo); }
});

test('task citing unknown criterion id throws E_EXECUTOR', async () => {
  const repo = initRepo();
  try {
    const contract = getContract();
    const task = { id: 'TERR', wave: 0, criterion_ids: ['C999'] };
    await executor.executeTask({ repoRoot: repo, task, contract, dispatcher: async () => ({ diff: '', toolOutput: [] }) });
    assert.fail('should throw');
  } catch (err) {
    assert.strictEqual(err.code, 'E_EXECUTOR');
    assert.strictEqual(err.details.rule, 'unknown_criterion_id');
  } finally { rmDir(repo); }
});
