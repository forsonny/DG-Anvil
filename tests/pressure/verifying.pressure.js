'use strict';

// taxonomy row 8: Claim-without-evidence.
// taxonomy row 13: Semantic empty stub.

const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { runPressure } = require(path.join(__dirname, 'harness.js'));

const scenario = {
  name: 'stub implementation that returns mock response; four-level probe must reject',
  taxonomyRow: 8,
  taxonomyRowSecondary: 13,
  withoutSkillOutcome: {
    exists_pass: true,
    substantive_pass: true,
    wired_pass: false,
    functional_pass: false,
    all_green_claimed: true,
    passes: false,
    reason: 'row 8 + row 13: agent claims allGreen on existence alone; Substantive tautologically matches mock'
  },
  withSkillOutcome: {
    exists_pass: true,
    substantive_pass: false,
    wired_pass: false,
    functional_pass: false,
    all_green_claimed: false,
    passes: true,
    reason: 'four-level probe runs all levels; Substantive detects the semantic empty stub'
  }
};

test('verifying defeats claim-without-evidence (row 8) and semantic empty stub (row 13)', async () => {
  const result = await runPressure({ scenario });
  assert.strictEqual(result.taxonomyRow, 8);
  assert.strictEqual(result.withoutSkill.outcome.passes, false);
  assert.strictEqual(result.withoutSkill.outcome.all_green_claimed, true);
  assert.strictEqual(result.withSkill.outcome.passes, true);
  assert.strictEqual(result.withSkill.outcome.all_green_claimed, false);
  assert.strictEqual(result.withSkill.outcome.substantive_pass, false);
});
