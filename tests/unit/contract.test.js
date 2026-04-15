'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const contract = require(path.join(__dirname, '..', '..', 'cli', 'lib', 'contract.js'));

const ROOT = path.resolve(__dirname, '..', '..');
const GOOD_DIR = path.join(ROOT, 'docs', 'contract-examples', 'good');
const BAD_DIR = path.join(ROOT, 'docs', 'contract-examples', 'bad');
const ANVIL = path.join(ROOT, 'cli', 'anvil.js');

function listYml(dir) {
  return fs.readdirSync(dir).filter(f => f.endsWith('.yml')).map(f => path.join(dir, f));
}

function ruleFromFixture(file) {
  const first = fs.readFileSync(file, 'utf8').split(/\r?\n/)[0];
  const m = first.match(/^# rejection_rule:\s*([^;]+)\s*;\s*expected_code:\s*(\S+)/);
  if (!m) return null;
  return { rule: m[1].trim(), code: m[2].trim() };
}

test('every good contract fixture validates', () => {
  for (const f of listYml(GOOD_DIR)) {
    const parsed = contract.loadAndValidate(f);
    assert.ok(parsed.frontmatter.anvil_contract_version === 1, f + ': version');
  }
});

test('every bad contract fixture rejects with matching rule', () => {
  for (const f of listYml(BAD_DIR)) {
    const meta = ruleFromFixture(f);
    assert.ok(meta, f + ': missing rejection_rule header');
    try {
      contract.loadAndValidate(f);
      assert.fail(f + ': expected rejection but validated');
    } catch (err) {
      assert.strictEqual(err.code, meta.code, f + ': code ' + err.code);
      assert.strictEqual(err.details.rule, meta.rule, f + ': rule ' + err.details.rule);
    }
  }
});

test('anvil contract --validate good fixture exits 0', () => {
  const f = path.join(GOOD_DIR, 'rate-limit-001.yml');
  const r = spawnSync(process.execPath, [ANVIL, 'contract', '--validate', f], { encoding: 'utf8' });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = JSON.parse(r.stdout.trim());
  assert.strictEqual(out.ok, true);
});

test('anvil contract --validate bad fixture exits non-zero', () => {
  const f = path.join(BAD_DIR, 'missing-version-001.yml');
  const r = spawnSync(process.execPath, [ANVIL, 'contract', '--validate', f], { encoding: 'utf8' });
  assert.notStrictEqual(r.status, 0);
  const err = JSON.parse(r.stderr.trim());
  assert.strictEqual(err.code, 'E_INVALID_CONTRACT');
  assert.strictEqual(err.details.rule, 'missing_version');
});

test('contract-migrate v1->v1 round trip', () => {
  const src = path.join(GOOD_DIR, 'rate-limit-001.yml');
  const tmp = path.join(os.tmpdir(), 'anvil-rt-contract-' + Date.now() + '.yml');
  const r = spawnSync(process.execPath, [ANVIL, 'contract-migrate', '--in', src, '--out', tmp], { encoding: 'utf8' });
  assert.strictEqual(r.status, 0, r.stderr);
  const p = contract.loadAndValidate(tmp);
  assert.strictEqual(p.frontmatter.anvil_contract_version, 1);
  fs.unlinkSync(tmp);
});
