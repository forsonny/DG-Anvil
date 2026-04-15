'use strict';

const TaxonomyCitationRequired = true;

function runStubDispatcher(scenario, includeSkill) {
  const outcome = includeSkill
    ? (typeof scenario.withSkillOutcome === 'function' ? scenario.withSkillOutcome() : scenario.withSkillOutcome)
    : (typeof scenario.withoutSkillOutcome === 'function' ? scenario.withoutSkillOutcome() : scenario.withoutSkillOutcome);
  return { includeSkill: includeSkill === true, outcome: outcome };
}

async function runPressure(config) {
  if (!config || !config.scenario) {
    throw new Error('runPressure requires { scenario, withSkill, withoutSkill } config');
  }
  const scenario = config.scenario;
  const withSkill = typeof config.withSkill === 'function'
    ? await config.withSkill(scenario)
    : runStubDispatcher(scenario, true);
  const withoutSkill = typeof config.withoutSkill === 'function'
    ? await config.withoutSkill(scenario)
    : runStubDispatcher(scenario, false);
  return { withSkill: withSkill, withoutSkill: withoutSkill, taxonomyRow: scenario.taxonomyRow || null };
}

module.exports = { runPressure, TaxonomyCitationRequired };
