'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const trace = require(path.join(__dirname, '..', '..', 'cli', 'lib', 'trace.js'));

test('TRACE_EVENT_KEYS has 17 fields, frozen', () => {
  assert.strictEqual(trace.TRACE_EVENT_KEYS.length, 17);
  assert.strictEqual(Object.isFrozen(trace.TRACE_EVENT_KEYS), true);
});

test('TRACE_PHASES, TRACE_LEVELS, TRACE_OUTCOMES are frozen', () => {
  assert.strictEqual(Object.isFrozen(trace.TRACE_PHASES), true);
  assert.strictEqual(Object.isFrozen(trace.TRACE_LEVELS), true);
  assert.strictEqual(Object.isFrozen(trace.TRACE_OUTCOMES), true);
});

test('makeEvent fills all fields', () => {
  const ev = trace.makeEvent({ phase: 'execute', outcome: 'pass' });
  for (const k of trace.TRACE_EVENT_KEYS) assert.ok(k in ev, 'missing ' + k);
});

test('validateEvent rejects unknown field', () => {
  try {
    trace.validateEvent({ ts: 'now', phase: 'execute', outcome: 'pass', unknownField: 'x' });
    assert.fail('should throw');
  } catch (err) {
    assert.strictEqual(err.code, 'E_INVALID_TRACE_EVENT');
    assert.strictEqual(err.details.field, 'unknownField');
  }
});

test('validateEvent rejects unknown phase', () => {
  try {
    trace.validateEvent({ ts: 'now', phase: 'cosmic', outcome: 'pass' });
    assert.fail('should throw');
  } catch (err) {
    assert.strictEqual(err.code, 'E_INVALID_TRACE_EVENT');
  }
});

test('append writes JSONL line', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'trace-'));
  try {
    const tracePath = path.join(dir, 'trace.jsonl');
    trace.append(tracePath, { phase: 'verify', outcome: 'pass' });
    trace.append(tracePath, { phase: 'judge', outcome: 'pass', confidence: 0.9 });
    const lines = fs.readFileSync(tracePath, 'utf8').split(/\r?\n/).filter(Boolean);
    assert.strictEqual(lines.length, 2);
    const first = JSON.parse(lines[0]);
    assert.strictEqual(first.phase, 'verify');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
