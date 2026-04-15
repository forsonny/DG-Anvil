'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const plan = require(path.join(__dirname, '..', '..', 'cli', 'lib', 'plan.js'));
const contract = require(path.join(__dirname, '..', '..', 'cli', 'lib', 'contract.js'));

const ROOT = path.resolve(__dirname, '..', '..');
const PGOOD = path.join(ROOT, 'docs', 'plan-examples', 'good');
const PBAD = path.join(ROOT, 'docs', 'plan-examples', 'bad');
const CGOOD = path.join(ROOT, 'docs', 'contract-examples', 'good');
const ANVIL = path.join(ROOT, 'cli', 'anvil.js');

function listYml(dir) {
  return fs.readdirSync(dir).filter(f => f.endsWith('.yml')).map(f => path.join(dir, f));
}

function contractRef(planFile) {
  const lines = fs.readFileSync(planFile, 'utf8').split(/\r?\n/);
  for (const l of lines) {
    const m = l.match(/^# contract:\s*(.+)$/);
    if (m) return m[1].trim();
  }
  return null;
}

function ruleFromFixture(file) {
  const first = fs.readFileSync(file, 'utf8').split(/\r?\n/)[0];
  const m = first.match(/^# rejection_rule:\s*([^;]+)\s*;\s*expected_code:\s*(\S+)/);
  if (!m) return null;
  return { rule: m[1].trim(), code: m[2].trim() };
}

test('every good plan fixture validates against paired contract', () => {
  for (const f of listYml(PGOOD)) {
    const cref = contractRef(f);
    assert.ok(cref, f + ': missing contract header');
    const c = contract.loadAndValidate(path.join(CGOOD, cref));
    const p = plan.loadAndValidate(f, c.frontmatter);
    assert.strictEqual(p.anvil_plan_version, 1, f);
  }
});

test('every bad plan fixture rejects with matching rule', () => {
  for (const f of listYml(PBAD)) {
    const meta = ruleFromFixture(f);
    assert.ok(meta, f + ': missing rejection_rule header');
    const cref = contractRef(f) || 'rate-limit-001.yml';
    const c = contract.loadAndValidate(path.join(CGOOD, cref));
    try {
      plan.loadAndValidate(f, c.frontmatter);
      assert.fail(f + ': expected rejection');
    } catch (err) {
      assert.strictEqual(err.code, meta.code, f + ': code ' + err.code);
      assert.strictEqual(err.details.rule, meta.rule, f + ': rule ' + err.details.rule);
    }
  }
});

test('topologicalWaves: positive DAG', () => {
  const tasks = [
    { id: 'T1', wave: 0, criterion_ids: ['C1'] },
    { id: 'T2', wave: 1, criterion_ids: ['C2'], depends_on: ['T1'] }
  ];
  const waves = plan.topologicalWaves(tasks);
  assert.strictEqual(waves.length, 2);
  assert.ok(waves[0].includes('T1'));
  assert.ok(waves[1].includes('T2'));
});

test('topologicalWaves: cycle throws cyclic_dependency', () => {
  const tasks = [
    { id: 'T1', wave: 0, criterion_ids: ['C1'], depends_on: ['T2'] },
    { id: 'T2', wave: 0, criterion_ids: ['C2'], depends_on: ['T1'] }
  ];
  try { plan.topologicalWaves(tasks); assert.fail('should throw'); }
  catch (err) {
    assert.strictEqual(err.code, 'E_INVALID_PLAN');
    assert.strictEqual(err.details.rule, 'cyclic_dependency');
  }
});

test('anvil plan --validate good fixture exits 0', () => {
  const p = path.join(PGOOD, 'rate-limit-001.yml');
  const c = path.join(CGOOD, 'rate-limit-001.yml');
  const r = spawnSync(process.execPath, [ANVIL, 'plan', '--validate', p, '--contract', c], { encoding: 'utf8' });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = JSON.parse(r.stdout.trim());
  assert.strictEqual(out.ok, true);
});

test('plan-migrate v1->v1 round trip', () => {
  const src = path.join(PGOOD, 'rate-limit-001.yml');
  const tmp = path.join(os.tmpdir(), 'anvil-rt-plan-' + Date.now() + '.yml');
  const r = spawnSync(process.execPath, [ANVIL, 'plan-migrate', '--in', src, '--out', tmp], { encoding: 'utf8' });
  assert.strictEqual(r.status, 0, r.stderr);
  const parsed = plan.parse(fs.readFileSync(tmp, 'utf8'));
  assert.strictEqual(parsed.anvil_plan_version, 1);
  fs.unlinkSync(tmp);
});
