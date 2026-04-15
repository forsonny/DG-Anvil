'use strict';

// taxonomy row 8: Claim-without-evidence (integration-level anchor).

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const FIXTURE = __dirname;
const DG_ROOT = path.resolve(__dirname, '..', '..', '..');
const ANVIL = path.join(DG_ROOT, 'cli', 'anvil.js');
const io = require(path.join(DG_ROOT, 'cli', 'lib', 'io.js'));
const verifier = require(path.join(DG_ROOT, 'cli', 'lib', 'verifier.js'));
const executor = require(path.join(DG_ROOT, 'cli', 'lib', 'executor.js'));
const contractLib = require(path.join(DG_ROOT, 'cli', 'lib', 'contract.js'));
const planLib = require(path.join(DG_ROOT, 'cli', 'lib', 'plan.js'));
const worktreeMgr = require(path.join(DG_ROOT, 'cli', 'lib', 'worktree.js'));

function copyFixtureToTemp() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'anvil-loop-node-'));
  function copyDir(src, dst) {
    fs.mkdirSync(dst, { recursive: true });
    for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
      const s = path.join(src, entry.name);
      const d = path.join(dst, entry.name);
      if (entry.isDirectory()) copyDir(s, d);
      else fs.copyFileSync(s, d);
    }
  }
  copyDir(FIXTURE, dir);
  io.spawn('git', ['init', '-q', dir]);
  io.spawn('git', ['-C', dir, 'config', 'user.email', 'test@example.com']);
  io.spawn('git', ['-C', dir, 'config', 'user.name', 'Test']);
  io.spawn('git', ['-C', dir, 'add', '.']);
  io.spawn('git', ['-C', dir, 'commit', '-q', '-m', 'initial']);
  return dir;
}

function rmDir(dir) {
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch (_) {}
}

async function stubDispatcher(briefing) {
  return {
    diff: '',
    toolOutput: [{ tool: 'stub', stdout: '', stderr: '', status: 0, tool_input_hash: 'sha256:0' }],
    status: 'ok'
  };
}

test('fixture-repo-node: anvil run + verify passes all four levels', async () => {
  const repo = copyFixtureToTemp();
  try {
    const contract = contractLib.loadAndValidate(path.join(repo, 'anvil', 'contract.yml')).frontmatter;
    const plan = planLib.loadAndValidate(path.join(repo, 'anvil', 'plan.yml'), contract);
    const task = plan.tasks[0];
    const runResult = await executor.executeTask({ repoRoot: repo, task, contract, dispatcher: stubDispatcher });
    assert.strictEqual(runResult.status, 'ok');

    const worktreePath = runResult.worktreePath;
    const verifyResult = verifier.verifyAll({
      worktreePath,
      contract,
      diffPath: runResult.diffPath,
      toolOutputPath: runResult.toolOutputPath
    });
    assert.strictEqual(verifyResult.allGreen, true, JSON.stringify(verifyResult, null, 2));

    worktreeMgr.remove({ repoRoot: repo, worktreePath });
  } finally { rmDir(repo); }
});

test('anvil verify exits 0 on fixture-repo-node', () => {
  const repo = copyFixtureToTemp();
  try {
    const wt = worktreeMgr.create({ repoRoot: repo, taskId: 'TCLI', baseRef: 'HEAD' });
    io.ensureDir(path.join(wt.worktreePath, 'anvil'));
    io.writeFileUtf8(path.join(wt.worktreePath, 'anvil', 'diff.patch'), '');
    io.writeFileUtf8(path.join(wt.worktreePath, 'anvil', 'tool-output.jsonl'), '');
    const r = spawnSync(process.execPath, [ANVIL, 'verify', '--worktree', wt.worktreePath, '--contract', path.join(wt.worktreePath, 'anvil', 'contract.yml')], { encoding: 'utf8' });
    assert.strictEqual(r.status, 0, r.stderr + ' || ' + r.stdout);
    worktreeMgr.remove({ repoRoot: repo, worktreePath: wt.worktreePath });
  } finally { rmDir(repo); }
});
