'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const court = require(path.join(__dirname, '..', '..', 'cli', 'lib', 'court.js'));

test('MUTABLE_STATE is empty and frozen', () => {
  assert.strictEqual(Object.isFrozen(court.MUTABLE_STATE), true);
  assert.strictEqual(Object.keys(court.MUTABLE_STATE).length, 0);
});

test('court.js does not import plan, ledger, or ledger-write', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', '..', 'cli', 'lib', 'court.js'), 'utf8');
  assert.ok(!/require\(['"]\.?\.?\/?plan['"]\)/.test(src), 'must not import plan');
  assert.ok(!/require\(['"]\.?\.?\/?ledger['"]\)/.test(src), 'must not import ledger');
  assert.ok(!/require\(['"]\.?\.?\/?ledger-write['"]\)/.test(src), 'must not import ledger-write');
});

test('composeBriefing rejects forbidden keys', () => {
  const bad = [
    { plan: {} },
    { ledger: {} },
    { commit_message: 'x' },
    { prior_verdicts: [] }
  ];
  for (const extra of bad) {
    try {
      court.composeBriefing(Object.assign({ taskId: 'T0', contract: {}, diff: '', verifyOutput: {}, confidence: 0.9 }, extra));
      assert.fail('should reject ' + JSON.stringify(extra));
    } catch (err) {
      assert.strictEqual(err.code, 'E_COURT_INPUT_VIOLATION');
    }
  }
});

test('composeBriefing allows the four permitted inputs and freezes', () => {
  const b = court.composeBriefing({ taskId: 'T0', contract: { criteria: [] }, diff: '', verifyOutput: { allGreen: true }, confidence: 0.8 });
  assert.strictEqual(Object.isFrozen(b), true);
  assert.strictEqual(b.taskId, 'T0');
});

test('validateVerdict accepts a valid verdict', () => {
  const v = { action: 'merge', per_criterion: [{ id: 'C1', status: 'pass' }] };
  assert.ok(court.validateVerdict(v));
});

test('validateVerdict rejects unknown action', () => {
  try { court.validateVerdict({ action: 'nuke', per_criterion: [] }); assert.fail('should throw'); }
  catch (err) { assert.strictEqual(err.code, 'E_INVALID_VERDICT'); }
});

test('validateVerdict rejects unknown per_criterion status', () => {
  try { court.validateVerdict({ action: 'merge', per_criterion: [{ id: 'C1', status: 'unicorn' }] }); assert.fail('should throw'); }
  catch (err) { assert.strictEqual(err.code, 'E_INVALID_VERDICT'); }
});

test('judge dispatches fresh briefing and returns briefingHash', async () => {
  let receivedBriefing = null;
  const dispatcher = async (b) => { receivedBriefing = b; return { action: 'merge', per_criterion: [{ id: 'C1', status: 'pass' }] }; };
  const r = await court.judge({ taskId: 'T0', contract: { criteria: [{ id: 'C1' }] }, diff: '', verifyOutput: {}, confidence: 0.9, dispatcher });
  assert.strictEqual(r.verdict.action, 'merge');
  assert.ok(r.briefingHash.startsWith('sha256:'));
  assert.strictEqual(Object.isFrozen(receivedBriefing), true);
});

test('judge rejects forbidden briefing key at entry', async () => {
  const dispatcher = async () => ({ action: 'merge', per_criterion: [] });
  try {
    await court.judge({ taskId: 'T0', contract: {}, diff: '', verifyOutput: {}, confidence: 0.9, commit_message: 'injected', dispatcher });
    assert.fail('should throw');
  } catch (err) {
    assert.strictEqual(err.code, 'E_COURT_INPUT_VIOLATION');
  }
});
