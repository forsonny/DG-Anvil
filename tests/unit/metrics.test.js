'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const metrics = require(path.join(__dirname, '..', '..', 'cli', 'lib', 'metrics.js'));

test('THEATRE_DRIFT_THRESHOLD is 0.15 and HEALTHY_CEILING is 0.05', () => {
  assert.strictEqual(metrics.THEATRE_DRIFT_THRESHOLD, 0.15);
  assert.strictEqual(metrics.THEATRE_DRIFT_HEALTHY_CEILING, 0.05);
});

test('METRIC_NAMES has 10 frozen entries', () => {
  assert.strictEqual(metrics.METRIC_NAMES.length, 10);
  assert.strictEqual(Object.isFrozen(metrics.METRIC_NAMES), true);
});

test('compute against empty trace yields nulls', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'metrics-'));
  try {
    const tracePath = path.join(dir, 'trace.jsonl');
    fs.writeFileSync(tracePath, '');
    const m = metrics.compute({ tracePath });
    assert.strictEqual(m.calibration_error, null);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('calibrationError computes mean abs error', () => {
  const events = [
    { phase: 'judge', outcome: 'pass', confidence: 1.0 },
    { phase: 'judge', outcome: 'fail', confidence: 0.5 }
  ];
  const e = metrics.calibrationError(events);
  assert.ok(Math.abs(e - 0.25) < 0.0001);
});

test('theatreDriftIndex against zero seeded faults returns null', () => {
  assert.strictEqual(metrics.theatreDriftIndex([], []), null);
});

test('lessonHitRate over contract events', () => {
  const events = [
    { phase: 'contract', outcome: 'end', meta: { injected_lesson_ids: ['L1'] } },
    { phase: 'contract', outcome: 'end', meta: {} }
  ];
  assert.strictEqual(metrics.lessonHitRate(events), 0.5);
});

test('assertHealthy reports issue on theatre drift over threshold', () => {
  const issues = metrics.assertHealthy({ theatre_drift_index: 0.2 });
  assert.strictEqual(issues.length, 1);
  assert.strictEqual(issues[0].metric, 'theatre_drift_index');
});
