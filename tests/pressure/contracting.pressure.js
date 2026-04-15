'use strict';

// taxonomy row 9: Silent assumption-making.

const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { runPressure } = require(path.join(__dirname, 'harness.js'));

const scenario = {
  name: 'ambiguous "add caching" intent without scope or eviction',
  taxonomyRow: 9,
  withoutSkillOutcome: {
    criteria_count: 1,
    auto_picked: true,
    ambiguities_surfaced: false,
    passes: false,
    reason: 'row 9: silent assumption filled the four slots with one unacknowledged interpretation'
  },
  withSkillOutcome: {
    criteria_count: 3,
    auto_picked: false,
    ambiguities_surfaced: true,
    passes: true,
    reason: 'ambiguity surfaced as distinct criteria; one-shot confirm gate reached without auto-pick'
  }
};

test('contracting defeats silent assumption-making (row 9)', async () => {
  const result = await runPressure({ scenario });
  assert.strictEqual(result.taxonomyRow, 9, 'pressure test must cite failure-taxonomy row 9');
  assert.strictEqual(result.withoutSkill.outcome.passes, false, 'without-skill run must fail in the expected way');
  assert.strictEqual(result.withoutSkill.outcome.auto_picked, true, 'without the skill, the agent silently picks one interpretation');
  assert.strictEqual(result.withoutSkill.outcome.ambiguities_surfaced, false, 'without the skill, ambiguities are not surfaced');
  assert.strictEqual(result.withSkill.outcome.passes, true, 'with-skill run must pass');
  assert.ok(result.withSkill.outcome.criteria_count >= 2, 'with the skill, multiple candidate interpretations are distinct criteria');
  assert.strictEqual(result.withSkill.outcome.auto_picked, false, 'with the skill, the one-shot confirm gate is not silently auto-picked');
  assert.strictEqual(result.withSkill.outcome.ambiguities_surfaced, true, 'with the skill, ambiguities are visible to the user');
});
