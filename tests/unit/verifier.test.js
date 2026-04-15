'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const verifier = require(path.join(__dirname, '..', '..', 'cli', 'lib', 'verifier.js'));

function makeRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'anvil-ver-'));
  fs.mkdirSync(path.join(dir, 'src'));
  fs.mkdirSync(path.join(dir, 'tests'));
  return dir;
}

function rmDir(dir) {
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch (_) {}
}

test('probeExists passes when file + symbol present', () => {
  const dir = makeRepo();
  try {
    fs.writeFileSync(path.join(dir, 'src', 'ratelimit.js'), 'function checkQuota() { return true; }\n');
    const crit = { id: 'C1', exists: { paths: ['src/ratelimit.js'], symbols: ['checkQuota'] } };
    const r = verifier.probeExists({ worktreePath: dir, criterion: crit });
    assert.strictEqual(r.status, 'pass');
  } finally { rmDir(dir); }
});

test('probeExists fails when file missing', () => {
  const dir = makeRepo();
  try {
    const crit = { id: 'C1', exists: { paths: ['src/not-here.js'] } };
    const r = verifier.probeExists({ worktreePath: dir, criterion: crit });
    assert.strictEqual(r.status, 'fail');
  } finally { rmDir(dir); }
});

test('probeWired passes when entry contains call', () => {
  const dir = makeRepo();
  try {
    fs.writeFileSync(path.join(dir, 'src', 'server.js'), "const { checkQuota } = require('./ratelimit');\nfunction handle(req) { return checkQuota(req); }\n");
    const crit = { id: 'C1', wired: { entry_point: 'src/server.js', reachable_symbols: ['checkQuota'] } };
    const r = verifier.probeWired({ worktreePath: dir, criterion: crit });
    assert.strictEqual(r.status, 'pass');
  } finally { rmDir(dir); }
});

test('probeWired fails when symbol not called', () => {
  const dir = makeRepo();
  try {
    fs.writeFileSync(path.join(dir, 'src', 'server.js'), 'function handle() {}\n');
    const crit = { id: 'C1', wired: { entry_point: 'src/server.js', reachable_symbols: ['checkQuota'] } };
    const r = verifier.probeWired({ worktreePath: dir, criterion: crit });
    assert.strictEqual(r.status, 'fail');
  } finally { rmDir(dir); }
});

test('probeWired: symbol mention inside comment is not a call', () => {
  const dir = makeRepo();
  try {
    fs.writeFileSync(path.join(dir, 'src', 'server.js'), '// checkQuota\nfunction handle() { return 1; }\n');
    const crit = { id: 'C1', wired: { entry_point: 'src/server.js', reachable_symbols: ['checkQuota'] } };
    const r = verifier.probeWired({ worktreePath: dir, criterion: crit });
    assert.strictEqual(r.status, 'fail');
  } finally { rmDir(dir); }
});

test('probeWired: symbol mention inside template literal is not a call', () => {
  const dir = makeRepo();
  try {
    fs.writeFileSync(path.join(dir, 'src', 'server.js'), 'const s = `call checkQuota()`;\nfunction handle() { return s; }\n');
    const crit = { id: 'C1', wired: { entry_point: 'src/server.js', reachable_symbols: ['checkQuota'] } };
    const r = verifier.probeWired({ worktreePath: dir, criterion: crit });
    assert.strictEqual(r.status, 'fail');
  } finally { rmDir(dir); }
});

test('probeWired throws E_UNSUPPORTED_LANGUAGE for non-js', () => {
  const dir = makeRepo();
  try {
    const crit = { id: 'C1', wired: { entry_point: 'x.go', language: 'go', reachable_symbols: ['x'] } };
    verifier.probeWired({ worktreePath: dir, criterion: crit });
    assert.fail('should throw');
  } catch (err) {
    assert.strictEqual(err.code, 'E_UNSUPPORTED_LANGUAGE');
  } finally { rmDir(dir); }
});

test('evaluateInvariants: unknown invariant blocks allGreen with warning', () => {
  const dir = makeRepo();
  try {
    const contract = { invariants: { protect_user_data: true } };
    fs.writeFileSync(path.join(dir, 'diff.patch'), '');
    const r = verifier.evaluateInvariants({ worktreePath: dir, contract, diffPath: path.join(dir, 'diff.patch') });
    assert.strictEqual(r.status, 'fail');
    assert.ok(r.results.some(x => x.invariant === 'protect_user_data' && x.status === 'unknown'));
  } finally { rmDir(dir); }
});

test('evaluateInvariants: no_new_dependencies detects package.json add', () => {
  const dir = makeRepo();
  try {
    const contract = { invariants: { no_new_dependencies: true } };
    const diffText = 'diff --git a/package.json b/package.json\n+    "left-pad": "^1.0.0",\n';
    const diffPath = path.join(dir, 'diff.patch');
    fs.writeFileSync(diffPath, diffText);
    const r = verifier.evaluateInvariants({ worktreePath: dir, contract, diffPath });
    assert.strictEqual(r.status, 'fail');
  } finally { rmDir(dir); }
});

test('verifyAllWithProbes: Exists fail short-circuits other levels', () => {
  const dir = makeRepo();
  try {
    const contract = {
      criteria: [{
        id: 'C1', statement: 's',
        exists: { paths: ['src/nope.js'] },
        substantive: { coverage_min: 0.5 },
        wired: { entry_point: 'src/nope.js', reachable_symbols: ['x'] },
        functional: { probe: { runner: 'node --test', target: 'tests', exit_code: 0 } }
      }]
    };
    let subCount = 0, wiredCount = 0, funcCount = 0;
    const probes = {
      exists: verifier.probeExists,
      substantive: () => { subCount++; return { status: 'pass', evidence: '', rawPath: '' }; },
      wired: () => { wiredCount++; return { status: 'pass', evidence: '', rawPath: '' }; },
      functional: () => { funcCount++; return { status: 'pass', evidence: '', rawPath: '' }; },
      invariants: () => ({ status: 'pass', results: [], rawPath: '' })
    };
    const r = verifier.verifyAllWithProbes({ worktreePath: dir, contract, diffPath: null, toolOutputPath: null, probes });
    assert.strictEqual(r.allGreen, false);
    assert.strictEqual(subCount, 0);
    assert.strictEqual(wiredCount, 0);
    assert.strictEqual(funcCount, 0);
  } finally { rmDir(dir); }
});
