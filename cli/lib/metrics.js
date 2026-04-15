'use strict';

const fs = require('fs');
const path = require('path');
const { makeError } = require('./errors.js');

const THEATRE_DRIFT_THRESHOLD = 0.15;
const THEATRE_DRIFT_HEALTHY_CEILING = 0.05;
const CALIBRATION_ERROR_TARGET = 0.1;
const LESSON_HIT_RATE_TARGET = 0.6;

const METRIC_NAMES = Object.freeze([
  'theatre_drift_index',
  'lesson_hit_rate',
  'calibration_error',
  'verify_pass_rate',
  'reset_count_per_run',
  'court_request_changes_rate',
  'tasks_per_run',
  'tasks_with_pass_loop_count_le_3',
  'mean_loop_count',
  'orphan_worktree_count'
]);

function readJsonl(filePath) {
  if (!fs.existsSync(filePath)) return [];
  return fs.readFileSync(filePath, 'utf8').split(/\r?\n/).filter(Boolean).map(l => {
    try { return JSON.parse(l); } catch (_) { return null; }
  }).filter(Boolean);
}

function calibrationError(traceEvents) {
  const judges = traceEvents.filter(e => e.phase === 'judge' && typeof e.confidence === 'number');
  if (judges.length === 0) return null;
  let sumErr = 0;
  for (const e of judges) {
    const observed = e.outcome === 'pass' ? 1 : 0;
    sumErr += Math.abs(e.confidence - observed);
  }
  return sumErr / judges.length;
}

function theatreDriftIndex(seededFaults, results) {
  if (!Array.isArray(seededFaults) || seededFaults.length === 0) return null;
  const detected = results.filter(r => r.detected === true).length;
  return 1 - (detected / seededFaults.length);
}

function lessonHitRate(traceEvents) {
  const contracts = traceEvents.filter(e => e.phase === 'contract' && e.outcome === 'end');
  const withLessons = contracts.filter(e => e.meta && e.meta.injected_lesson_ids && e.meta.injected_lesson_ids.length > 0);
  if (contracts.length === 0) return null;
  return withLessons.length / contracts.length;
}

function compute(opts) {
  const options = opts || {};
  const tracePath = options.tracePath || 'anvil/trace.jsonl';
  const seededPath = options.seededPath;
  const trace = readJsonl(tracePath);
  const out = {};
  out.calibration_error = calibrationError(trace);
  out.lesson_hit_rate = lessonHitRate(trace);
  if (seededPath) {
    const seeded = readJsonl(seededPath);
    out.theatre_drift_index = theatreDriftIndex(seeded.filter(s => s.kind === 'fault'), seeded.filter(s => s.kind === 'result'));
  } else {
    out.theatre_drift_index = null;
  }
  const verifies = trace.filter(e => e.phase === 'verify');
  const verifyPasses = verifies.filter(e => e.outcome === 'pass').length;
  out.verify_pass_rate = verifies.length === 0 ? null : verifyPasses / verifies.length;
  const resets = trace.filter(e => e.phase === 'reset');
  out.reset_count_per_run = resets.length;
  const judges = trace.filter(e => e.phase === 'judge');
  const requestChanges = judges.filter(e => e.meta && e.meta.action === 'request-changes').length;
  out.court_request_changes_rate = judges.length === 0 ? null : requestChanges / judges.length;
  const tasks = new Set(trace.filter(e => e.task).map(e => e.task));
  out.tasks_per_run = tasks.size;
  out.tasks_with_pass_loop_count_le_3 = null;
  out.mean_loop_count = null;
  out.orphan_worktree_count = trace.filter(e => e.meta && e.meta.alarm === 'orphan_worktree').length;
  return out;
}

function assertHealthy(metrics) {
  const issues = [];
  if (metrics.theatre_drift_index != null && metrics.theatre_drift_index > THEATRE_DRIFT_THRESHOLD) {
    issues.push({ metric: 'theatre_drift_index', value: metrics.theatre_drift_index, threshold: THEATRE_DRIFT_THRESHOLD });
  }
  return issues;
}

module.exports = {
  THEATRE_DRIFT_THRESHOLD,
  THEATRE_DRIFT_HEALTHY_CEILING,
  CALIBRATION_ERROR_TARGET,
  LESSON_HIT_RATE_TARGET,
  METRIC_NAMES,
  compute,
  assertHealthy,
  calibrationError,
  theatreDriftIndex,
  lessonHitRate
};
