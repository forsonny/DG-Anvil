'use strict';

const fs = require('fs');
const path = require('path');
const { makeError } = require('./errors.js');

const TRACE_EVENT_KEYS = Object.freeze([
  'ts',
  'run_id',
  'task',
  'phase',
  'level',
  'agent_id',
  'tool',
  'tool_input_hash',
  'outcome',
  'evidence_ref',
  'duration_ms',
  'tokens_in',
  'tokens_out',
  'cost_usd',
  'model',
  'confidence',
  'meta'
]);

const TRACE_PHASES = Object.freeze(['intake', 'contract', 'plan', 'dispatch', 'execute', 'verify', 'judge', 'reset', 'ship', 'hook']);
const TRACE_LEVELS = Object.freeze(['exists', 'substantive', 'wired', 'functional', null]);
const TRACE_OUTCOMES = Object.freeze(['pass', 'fail', 'suspicious', 'start', 'end', 'error']);

function nowIso() {
  const d = new Date();
  return d.toISOString();
}

function validateEvent(event) {
  if (!event || typeof event !== 'object') throw makeError('E_INVALID_TRACE_EVENT', 'event must be object', {});
  for (const k of Object.keys(event)) {
    if (!TRACE_EVENT_KEYS.includes(k)) {
      throw makeError('E_INVALID_TRACE_EVENT', 'unknown trace field: ' + k, { field: k, allowed: Array.from(TRACE_EVENT_KEYS) });
    }
  }
  if (!event.ts) throw makeError('E_INVALID_TRACE_EVENT', 'ts is required', {});
  if (!TRACE_PHASES.includes(event.phase)) throw makeError('E_INVALID_TRACE_EVENT', 'unknown phase: ' + event.phase, { allowed: Array.from(TRACE_PHASES) });
  if (event.level !== null && event.level !== undefined && !TRACE_LEVELS.includes(event.level)) {
    throw makeError('E_INVALID_TRACE_EVENT', 'unknown level: ' + event.level, { allowed: Array.from(TRACE_LEVELS) });
  }
  if (!TRACE_OUTCOMES.includes(event.outcome)) throw makeError('E_INVALID_TRACE_EVENT', 'unknown outcome: ' + event.outcome, { allowed: Array.from(TRACE_OUTCOMES) });
  return event;
}

function makeEvent(partial) {
  const ev = {};
  for (const k of TRACE_EVENT_KEYS) ev[k] = partial[k] === undefined ? null : partial[k];
  if (!ev.ts) ev.ts = nowIso();
  if (!ev.meta) ev.meta = {};
  return ev;
}

function append(tracePath, partial) {
  const ev = makeEvent(partial);
  validateEvent(ev);
  fs.mkdirSync(path.dirname(tracePath), { recursive: true });
  fs.appendFileSync(tracePath, JSON.stringify(ev) + '\n', { encoding: 'utf8' });
  return ev;
}

module.exports = {
  TRACE_EVENT_KEYS,
  TRACE_PHASES,
  TRACE_LEVELS,
  TRACE_OUTCOMES,
  validateEvent,
  makeEvent,
  append
};
