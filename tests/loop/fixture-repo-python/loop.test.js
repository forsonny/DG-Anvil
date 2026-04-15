'use strict';

// taxonomy row 20: Null-lesson escape hatch (integration anchor).
// taxonomy row 26: Spec-to-plan drift (integration anchor).

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const ledgerWrite = require(path.resolve(__dirname, '..', '..', '..', 'cli', 'lib', 'ledger-write.js'));
const court = require(path.resolve(__dirname, '..', '..', '..', 'cli', 'lib', 'court.js'));

function haveCmd(cmd) {
  const { spawnSync } = require('child_process');
  const r = spawnSync(process.platform === 'win32' ? 'where' : 'which', [cmd], { encoding: 'utf8' });
  return r.status === 0;
}

test('fixture-repo-python: first run lesson + second run passes', async () => {
  if (!haveCmd('python') && !haveCmd('python3')) {
    console.log('# SKIP: python not available on host');
    return;
  }
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'anvil-rst-'));
  const ledgerPath = path.join(tmpDir, 'ledger.jsonl');
  const indexPath = path.join(tmpDir, 'ledger.index.json');
  const lesson = {
    anvil_ledger_entry_version: 1,
    id: 'L-integration-1',
    created: '2026-04-15',
    contract_gap: 'Rolling-window reset not observable in original draft',
    evidence: 'Verify Substantive saw counter stuck at 100 across window boundary',
    remediation: 'Contracts for rate-limit-shaped work must name the counter-reset observable',
    pattern: ['rate', 'limit', 'window']
  };
  const r = ledgerWrite.append(lesson, { ledgerPath, indexPath });
  assert.strictEqual(r.appended, true);

  const verdict = { action: 'merge', per_criterion: [{ id: 'C1', status: 'pass' }] };
  const judged = await court.judge({ taskId: 'T0', contract: { criteria: [{ id: 'C1' }] }, diff: '', verifyOutput: { allGreen: true }, confidence: 0.9, dispatcher: async () => verdict });
  assert.strictEqual(judged.verdict.action, 'merge');

  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (_) {}
});
