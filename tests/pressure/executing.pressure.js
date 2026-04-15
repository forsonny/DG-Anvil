'use strict';

// taxonomy row 1: Context pollution.
// taxonomy row 16: Context-window collapse.

const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { runPressure } = require(path.join(__dirname, 'harness.js'));

const scenario = {
  name: 'two tasks in sequence; second should not inherit first task state',
  taxonomyRow: 1,
  taxonomyRowSecondary: 16,
  withoutSkillOutcome: {
    second_briefing_references_first: true,
    orchestrator_holds_narration: true,
    passes: false,
    reason: 'row 1 + row 16: orchestrator carried first subagent narration into second dispatch'
  },
  withSkillOutcome: {
    second_briefing_references_first: false,
    orchestrator_holds_narration: false,
    passes: true,
    reason: 'fresh subagent per task; only captured diff and tool output survive'
  }
};

test('executing defeats context pollution (row 1) and context-window collapse (row 16)', async () => {
  const result = await runPressure({ scenario });
  assert.strictEqual(result.taxonomyRow, 1);
  assert.strictEqual(result.withoutSkill.outcome.passes, false);
  assert.strictEqual(result.withoutSkill.outcome.second_briefing_references_first, true);
  assert.strictEqual(result.withoutSkill.outcome.orchestrator_holds_narration, true);
  assert.strictEqual(result.withSkill.outcome.passes, true);
  assert.strictEqual(result.withSkill.outcome.second_briefing_references_first, false);
  assert.strictEqual(result.withSkill.outcome.orchestrator_holds_narration, false);
});

test('executor carries no module-level mutable state (Invariant 13)', () => {
  const executor = require(path.join(__dirname, '..', '..', 'cli', 'lib', 'executor.js'));
  assert.ok(Object.isFrozen(executor.MUTABLE_STATE));
  assert.strictEqual(Object.keys(executor.MUTABLE_STATE).length, 0);
});
