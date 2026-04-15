'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const ledger = require(path.join(__dirname, '..', '..', 'cli', 'lib', 'ledger.js'));
const ledgerWrite = require(path.join(__dirname, '..', '..', 'cli', 'lib', 'ledger-write.js'));

const ROOT = path.resolve(__dirname, '..', '..');
const ANVIL = path.join(ROOT, 'cli', 'anvil.js');

function seedDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'anvil-ledger-'));
  return {
    dir,
    ledgerPath: path.join(dir, 'ledger.jsonl'),
    indexPath: path.join(dir, 'ledger.index.json')
  };
}

function rmDir(dir) { try { fs.rmSync(dir, { recursive: true, force: true }); } catch (_) {} }

test('query ranks by pattern overlap', () => {
  const s = seedDir();
  try {
    const rows = [
      { anvil_ledger_entry_version: 1, id: 'L1', created: '2026-01-01', contract_gap: 'g', evidence: 'e', remediation: 'r', pattern: ['rate', 'limit'] },
      { anvil_ledger_entry_version: 1, id: 'L2', created: '2026-02-01', contract_gap: 'g', evidence: 'e', remediation: 'r', pattern: ['cache'] }
    ];
    fs.writeFileSync(s.ledgerPath, rows.map(r => JSON.stringify(r)).join('\n') + '\n');
    fs.writeFileSync(s.indexPath, '{}');
    const hits = ledger.query('rate limit', { ledgerPath: s.ledgerPath, indexPath: s.indexPath });
    assert.strictEqual(hits[0].id, 'L1');
  } finally { rmDir(s.dir); }
});

test('empty store returns []', () => {
  const s = seedDir();
  try {
    const hits = ledger.query('x', { ledgerPath: s.ledgerPath, indexPath: s.indexPath });
    assert.deepStrictEqual(hits, []);
  } finally { rmDir(s.dir); }
});

test('append writes lesson to jsonl and index', () => {
  const s = seedDir();
  try {
    const entry = {
      anvil_ledger_entry_version: 1, id: 'L-TEST-1', created: '2026-04-15',
      contract_gap: 'gap text', evidence: 'ev text', remediation: 'rem text',
      pattern: ['alpha', 'beta']
    };
    const r = ledgerWrite.append(entry, { ledgerPath: s.ledgerPath, indexPath: s.indexPath });
    assert.strictEqual(r.appended, true);
    const lines = fs.readFileSync(s.ledgerPath, 'utf8').split(/\r?\n/).filter(Boolean);
    assert.strictEqual(lines.length, 1);
    const idx = JSON.parse(fs.readFileSync(s.indexPath, 'utf8'));
    assert.ok(idx.by_pattern.alpha.includes('L-TEST-1'));
  } finally { rmDir(s.dir); }
});

test('append rejects null contract_gap with E_NULL_LESSON', () => {
  const s = seedDir();
  try {
    try {
      ledgerWrite.append({ anvil_ledger_entry_version: 1, id: 'x', created: 'd', contract_gap: null, evidence: 'e', remediation: 'r' }, { ledgerPath: s.ledgerPath, indexPath: s.indexPath });
      assert.fail('should throw');
    } catch (err) {
      assert.strictEqual(err.code, 'E_NULL_LESSON');
    }
  } finally { rmDir(s.dir); }
});

test('append rejects empty evidence with E_NULL_LESSON', () => {
  const s = seedDir();
  try {
    try {
      ledgerWrite.append({ anvil_ledger_entry_version: 1, id: 'x', created: 'd', contract_gap: 'g', evidence: '  ', remediation: 'r' }, { ledgerPath: s.ledgerPath, indexPath: s.indexPath });
      assert.fail('should throw');
    } catch (err) {
      assert.strictEqual(err.code, 'E_NULL_LESSON');
    }
  } finally { rmDir(s.dir); }
});

test('append rejects missing version with E_INVALID_LESSON', () => {
  const s = seedDir();
  try {
    try {
      ledgerWrite.append({ id: 'x', created: 'd', contract_gap: 'g', evidence: 'e', remediation: 'r' }, { ledgerPath: s.ledgerPath, indexPath: s.indexPath });
      assert.fail('should throw');
    } catch (err) {
      assert.strictEqual(err.code, 'E_INVALID_LESSON');
    }
  } finally { rmDir(s.dir); }
});

test('all good ledger fixtures accepted; all bad rejected', () => {
  const s = seedDir();
  try {
    const GOOD = path.join(ROOT, 'docs', 'ledger-examples', 'good');
    const BAD = path.join(ROOT, 'docs', 'ledger-examples', 'bad');
    for (const f of fs.readdirSync(GOOD)) {
      const e = JSON.parse(fs.readFileSync(path.join(GOOD, f), 'utf8').split('\n').filter(Boolean)[0]);
      ledgerWrite.append(e, { ledgerPath: s.ledgerPath + '.' + f, indexPath: s.indexPath + '.' + f });
    }
    for (const f of fs.readdirSync(BAD)) {
      const text = fs.readFileSync(path.join(BAD, f), 'utf8').split('\n').filter(Boolean)[0];
      let e; try { e = JSON.parse(text); } catch (_) { continue; }
      try {
        ledgerWrite.append(e, { ledgerPath: s.ledgerPath + '.bad.' + f, indexPath: s.indexPath + '.bad.' + f });
        assert.fail('bad fixture accepted: ' + f);
      } catch (err) {
        assert.ok(['E_NULL_LESSON', 'E_INVALID_LESSON'].includes(err.code), f + ' code=' + err.code);
      }
    }
  } finally { rmDir(s.dir); }
});

test('audit detects duplicate id', () => {
  const s = seedDir();
  try {
    const rows = [
      { anvil_ledger_entry_version: 1, id: 'L-dup', created: '2026-01-01', contract_gap: 'g', evidence: 'e', remediation: 'r' },
      { anvil_ledger_entry_version: 1, id: 'L-dup', created: '2026-01-02', contract_gap: 'g2', evidence: 'e2', remediation: 'r2' }
    ];
    fs.writeFileSync(s.ledgerPath, rows.map(r => JSON.stringify(r)).join('\n') + '\n');
    const r = ledgerWrite.audit({ ledgerPath: s.ledgerPath, indexPath: s.indexPath });
    assert.strictEqual(r.ok, false);
    assert.ok(r.issues.some(i => i.issue === 'duplicate_id'));
  } finally { rmDir(s.dir); }
});

test('no Stage 0-3 module encodes the literal ~/.anvil/ledger.jsonl string', () => {
  const libDir = path.join(ROOT, 'cli', 'lib');
  let count = 0;
  for (const f of fs.readdirSync(libDir)) {
    const src = fs.readFileSync(path.join(libDir, f), 'utf8');
    if (/~\/\.anvil\/ledger\.jsonl/.test(src)) count++;
  }
  assert.strictEqual(count, 0, 'no file should have the raw string ~/.anvil/ledger.jsonl; ledger-write composes via os.homedir');
});

test('ledger-migrate v1->v1 round-trip via CLI', () => {
  const src = path.join(ROOT, 'docs', 'ledger-examples', 'good', 'rate-limit-001.jsonl');
  const tmp = path.join(os.tmpdir(), 'anvil-lm-' + Date.now() + '.jsonl');
  const r = spawnSync(process.execPath, [ANVIL, 'ledger-migrate', '--in', src, '--out', tmp], { encoding: 'utf8' });
  assert.strictEqual(r.status, 0, r.stderr);
  const copied = fs.readFileSync(tmp, 'utf8');
  assert.ok(copied.includes('anvil_ledger_entry_version'));
  fs.unlinkSync(tmp);
});

test('append throws is preserved in read-only ledger module (stage 1)', () => {
  try { ledger.append({}); assert.fail('should throw'); }
  catch (err) { assert.strictEqual(err.code, 'E_NOT_IMPLEMENTED'); }
});
