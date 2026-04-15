'use strict';

// taxonomy row 18: Description-field shortcut.

const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { runPressure } = require(path.join(__dirname, 'harness.js'));

const scenario = {
  name: 'description-only change without process update',
  taxonomyRow: 18,
  withoutSkillOutcome: {
    description_updated: true,
    process_updated: false,
    pressure_test_added: false,
    passes: false,
    reason: 'row 18: description-field shortcut; body not aligned with trigger'
  },
  withSkillOutcome: {
    description_updated: true,
    process_updated: true,
    pressure_test_added: true,
    passes: true,
    reason: 'RED-then-GREEN transcript recorded; description acts as trigger'
  }
};

test('authoring-skills defeats the description-field shortcut (row 18)', async () => {
  const result = await runPressure({ scenario });
  assert.strictEqual(result.taxonomyRow, 18, 'pressure test must cite failure-taxonomy row 18');
  assert.strictEqual(result.withoutSkill.outcome.passes, false, 'without-skill run must fail in the expected way');
  assert.strictEqual(result.withoutSkill.outcome.process_updated, false, 'without the skill, only the description is updated');
  assert.strictEqual(result.withSkill.outcome.passes, true, 'with-skill run must pass');
  assert.strictEqual(result.withSkill.outcome.process_updated, true, 'with the skill, the Process section is updated');
  assert.strictEqual(result.withSkill.outcome.pressure_test_added, true, 'with the skill, the paired pressure test is authored');
});

test('pressure harness exposes TaxonomyCitationRequired', () => {
  const { TaxonomyCitationRequired } = require(path.join(__dirname, 'harness.js'));
  assert.strictEqual(TaxonomyCitationRequired, true);
});
