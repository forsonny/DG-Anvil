'use strict';

// taxonomy row 20: Null-lesson escape hatch.

const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { runPressure } = require(path.join(__dirname, 'harness.js'));
const ledgerWrite = require(path.join(__dirname, '..', '..', 'cli', 'lib', 'ledger-write.js'));

const scenario = {
  name: 'reset cannot articulate contract_gap; tempting to append null lesson',
  taxonomyRow: 20,
  withoutSkillOutcome: {
    null_lesson_appended: true,
    escalated: false,
    passes: false,
    reason: 'row 20: null lesson leaks into ledger; poisons future queries'
  },
  withSkillOutcome: {
    null_lesson_appended: false,
    escalated: true,
    passes: true,
    reason: 'ledger-write refuses null lessons; the task escalates instead'
  }
};

test('resetting defeats null-lesson escape hatch (row 20)', async () => {
  const result = await runPressure({ scenario });
  assert.strictEqual(result.taxonomyRow, 20);
  assert.strictEqual(result.withoutSkill.outcome.passes, false);
  assert.strictEqual(result.withoutSkill.outcome.null_lesson_appended, true);
  assert.strictEqual(result.withSkill.outcome.passes, true);
  assert.strictEqual(result.withSkill.outcome.null_lesson_appended, false);
  assert.strictEqual(result.withSkill.outcome.escalated, true);
});

test('ledger-write.append rejects null remediation (Invariant 15)', () => {
  try {
    ledgerWrite.append(
      { anvil_ledger_entry_version: 1, id: 'L-x', created: '2026-01-01', contract_gap: 'g', evidence: 'e', remediation: null },
      { ledgerPath: '/tmp/dg-anvil-test-never.jsonl', indexPath: '/tmp/dg-anvil-test-never.index.json' }
    );
    assert.fail('should throw');
  } catch (err) {
    assert.strictEqual(err.code, 'E_NULL_LESSON');
  }
});
