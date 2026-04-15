'use strict';

// taxonomy row 26: Spec-to-plan drift.

const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { runPressure } = require(path.join(__dirname, 'harness.js'));

const scenario = {
  name: 'three-criterion contract where C2 is a cross-cutting invariant',
  taxonomyRow: 26,
  contractCriteria: ['C1', 'C2', 'C3'],
  withoutSkillOutcome: {
    cited_criteria: ['C1', 'C3'],
    uncited_criteria: ['C2'],
    passes: false,
    reason: 'row 26: C2 is a cross-cutting invariant and the plan silently drops it'
  },
  withSkillOutcome: {
    cited_criteria: ['C1', 'C2', 'C3'],
    uncited_criteria: [],
    passes: true,
    reason: 'every contract criterion is cited by at least one task'
  }
};

test('planning defeats spec-to-plan drift (row 26)', async () => {
  const result = await runPressure({ scenario });
  assert.strictEqual(result.taxonomyRow, 26, 'pressure test must cite failure-taxonomy row 26');
  assert.strictEqual(result.withoutSkill.outcome.passes, false, 'without-skill run must fail in the expected way');
  assert.ok(result.withoutSkill.outcome.uncited_criteria.length > 0, 'without the skill, at least one criterion is uncited');
  assert.strictEqual(result.withSkill.outcome.passes, true, 'with-skill run must pass');
  assert.strictEqual(result.withSkill.outcome.uncited_criteria.length, 0, 'with the skill, every criterion is cited');
  scenario.contractCriteria.forEach(cid => {
    assert.ok(result.withSkill.outcome.cited_criteria.includes(cid), 'with the skill, criterion ' + cid + ' is cited');
  });
});
