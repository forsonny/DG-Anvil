'use strict';

const crypto = require('crypto');
const { makeError } = require('./errors.js');

const MUTABLE_STATE = Object.freeze({});
const ALLOWED_COURT_INPUT_KEYS = Object.freeze(['taskId', 'contract', 'diff', 'verifyOutput', 'confidence']);
const FORBIDDEN_COURT_INPUT_KEYS = Object.freeze(['plan', 'ledger', 'commit_message', 'commitMessage', 'prior_verdicts', 'priorVerdicts', 'narration', 'toolOutput']);
const VALID_VERDICTS = Object.freeze(['merge', 'request-changes', 'request-clarification']);

function deepFreeze(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  Object.keys(obj).forEach(k => deepFreeze(obj[k]));
  return Object.freeze(obj);
}

function composeBriefing(opts) {
  for (const forbidden of FORBIDDEN_COURT_INPUT_KEYS) {
    if (forbidden in opts) {
      throw makeError('E_COURT_INPUT_VIOLATION', 'Court input contains forbidden key: ' + forbidden, { forbidden, allowed: Array.from(ALLOWED_COURT_INPUT_KEYS) });
    }
  }
  const briefing = {
    taskId: opts.taskId,
    contract: opts.contract,
    diff: opts.diff,
    verifyOutput: opts.verifyOutput,
    confidence: opts.confidence == null ? null : opts.confidence
  };
  return deepFreeze(briefing);
}

function validateVerdict(verdict) {
  if (!verdict || typeof verdict !== 'object') throw makeError('E_INVALID_VERDICT', 'verdict must be an object', { received: typeof verdict });
  if (!VALID_VERDICTS.includes(verdict.action)) {
    throw makeError('E_INVALID_VERDICT', 'unknown verdict action: ' + verdict.action, { allowed: Array.from(VALID_VERDICTS), received: verdict.action });
  }
  if (!Array.isArray(verdict.per_criterion)) throw makeError('E_INVALID_VERDICT', 'per_criterion must be an array', {});
  for (const c of verdict.per_criterion) {
    if (!c || typeof c.id !== 'string') throw makeError('E_INVALID_VERDICT', 'per_criterion entry missing id', {});
    if (!['pass', 'fail', 'suspicious'].includes(c.status)) {
      throw makeError('E_INVALID_VERDICT', 'per_criterion status invalid', { id: c.id, status: c.status });
    }
  }
  return verdict;
}

async function judge(opts) {
  const { dispatcher } = opts;
  if (typeof dispatcher !== 'function') throw makeError('E_COURT_INPUT_VIOLATION', 'dispatcher required', { reason: 'missing_dispatcher' });
  const briefing = composeBriefing(opts);
  const briefingHash = 'sha256:' + crypto.createHash('sha256').update(JSON.stringify(briefing)).digest('hex');
  let raw;
  try { raw = await dispatcher(briefing); }
  catch (err) { throw makeError('E_INVALID_VERDICT', 'Court dispatcher threw: ' + (err.message || err), { cause: err.message }); }
  const verdict = validateVerdict(raw);
  return { verdict, briefingHash };
}

const COURT_WHOLE_BRANCH_INSTRUCTION = 'Adjudicate the full branch diff against every contract criterion. Inputs are contract + diff + per-task verify outputs. Plan, commit messages, prior verdicts, and ledger are structurally withheld.';

async function judgeBranch(opts) {
  const { dispatcher } = opts;
  if (typeof dispatcher !== 'function') throw makeError('E_COURT_INPUT_VIOLATION', 'dispatcher required', { reason: 'missing_dispatcher' });
  for (const key of Object.keys(opts)) {
    if (key === 'dispatcher') continue;
    if (FORBIDDEN_COURT_INPUT_KEYS.includes(key)) {
      throw makeError('E_COURT_INPUT_VIOLATION', 'whole-branch Court input contains forbidden key: ' + key, { forbidden: key });
    }
  }
  const briefing = deepFreeze({
    instruction: COURT_WHOLE_BRANCH_INSTRUCTION,
    contract: opts.contract,
    branchDiff: opts.branchDiff,
    perTaskVerify: opts.perTaskVerify,
    confidence: opts.confidence == null ? null : opts.confidence
  });
  const briefingHash = 'sha256:' + crypto.createHash('sha256').update(JSON.stringify(briefing)).digest('hex');
  let raw;
  try { raw = await dispatcher(briefing); }
  catch (err) { throw makeError('E_WHOLE_BRANCH_COURT_FAILED', 'whole-branch dispatcher threw: ' + err.message, { cause: err.message }); }
  const verdict = validateVerdict(raw);
  return { verdict, briefingHash };
}

module.exports = {
  judge,
  judgeBranch,
  composeBriefing,
  validateVerdict,
  MUTABLE_STATE,
  ALLOWED_COURT_INPUT_KEYS,
  FORBIDDEN_COURT_INPUT_KEYS,
  VALID_VERDICTS,
  COURT_WHOLE_BRANCH_INSTRUCTION
};
