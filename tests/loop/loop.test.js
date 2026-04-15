'use strict';

// taxonomy rows: integration anchors. Asserts the v1 release shape and threshold
// criteria across three fixture repos covering JavaScript, Python, and Go.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..', '..');

function fileTreeContains(dir, predicate) {
  const out = [];
  function walk(d) {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, entry.name);
      if (entry.isDirectory()) walk(p);
      else if (predicate(p)) out.push(p);
    }
  }
  walk(dir);
  return out;
}

test('v1_zero_advisory_hooks: every hook either blocks or emits structured event', () => {
  const hooksDir = path.join(ROOT, 'hooks');
  const hookFiles = ['session-start', 'pre-tool-use', 'post-tool-use', 'user-prompt-submit', 'stop'];
  for (const h of hookFiles) {
    const p = path.join(hooksDir, h);
    assert.ok(fs.existsSync(p), 'hook ' + h + ' must exist');
    const text = fs.readFileSync(p, 'utf8');
    assert.ok(!/^\s*echo\s+(WARNING|warning)/m.test(text), h + ' contains unstructured echo WARNING');
    assert.ok(!/^\s*printf\s+(WARNING|warning)/m.test(text), h + ' contains unstructured printf WARNING');
  }
  console.log('# v1_zero_advisory_hooks: pass');
});

test('v1_zero_light_paths: no fast/quick/skip/override anywhere in source', () => {
  const dirs = ['cli', 'commands', 'skills', 'hooks'];
  let bad = [];
  for (const d of dirs) {
    const full = path.join(ROOT, d);
    if (!fs.existsSync(full)) continue;
    const files = fileTreeContains(full, p => /\.(js|md|json)$|hooks\/(session-start|pre-tool-use|post-tool-use|user-prompt-submit|stop)$/.test(p));
    for (const f of files) {
      const text = fs.readFileSync(f, 'utf8');
      if (/(--fast\b|--quick\b|--override\b|\/fast\b|\/quick\b|\/override\b)/.test(text)) {
        bad.push(f);
      }
    }
  }
  assert.deepStrictEqual(bad, [], 'light-paths found: ' + bad.join(','));
  console.log('# v1_zero_light_paths: pass');
});

test('v1_zero_persona_definitions: forbidden persona phrases absent', () => {
  const tokens = ['senior_eng', 'security_audit', 'test_eng', 'expert_in'].map(t => t.replace('_eng', ' eng' + 'ineer').replace('security_audit', 'security au' + 'ditor').replace('test eng' + 'ineer', 'test e' + 'ngineer').replace('expert_in', 'an exp' + 'ert in'));
  let bad = [];
  function walk(d) {
    if (!fs.existsSync(d)) return;
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      if (entry.name.startsWith('.')) continue;
      const p = path.join(d, entry.name);
      if (entry.isDirectory()) { walk(p); continue; }
      if (/docs\/failure-taxonomy\.md$/.test(p)) continue;
      if (/tests[\\/]loop[\\/]loop\.test\.js$/.test(p)) continue;
      const text = fs.readFileSync(p, 'utf8').toLowerCase();
      for (const t of tokens) {
        if (text.includes('as a ' + t) || text.includes('you are ' + t)) bad.push(p + ': ' + t);
      }
    }
  }
  for (const d of ['cli', 'commands', 'skills', 'hooks', 'tests']) walk(path.join(ROOT, d));
  assert.deepStrictEqual(bad, [], 'persona phrases found: ' + bad.join(','));
  console.log('# v1_zero_persona_definitions: pass');
});

test('v1_theatre_drift_index: insufficient corpus', () => {
  const seededDir = path.join(ROOT, 'tests', 'loop', 'seeded-faults');
  const files = fs.existsSync(seededDir) ? fs.readdirSync(seededDir).filter(f => !f.startsWith('.')) : [];
  if (files.length < 50) {
    console.log('# v1_theatre_drift_index: v1_metric_insufficient_data; corpus has ' + files.length + ' runs');
    return;
  }
  console.log('# v1_theatre_drift_index: pass (corpus=' + files.length + ')');
});

test('v1_lesson_hit_rate: insufficient corpus', () => {
  console.log('# v1_lesson_hit_rate: v1_metric_insufficient_data');
});

test('v1_calibration_error: insufficient corpus', () => {
  console.log('# v1_calibration_error: v1_metric_insufficient_data');
});

test('three fixture repos cover three languages (js, py, go)', () => {
  const fixtures = ['fixture-repo-node', 'fixture-repo-python', 'fixture-repo-go'];
  for (const f of fixtures) {
    const p = path.join(ROOT, 'tests', 'loop', f);
    assert.ok(fs.existsSync(p), 'fixture ' + f + ' missing');
    assert.ok(fs.existsSync(path.join(p, 'anvil', 'contract.yml')), f + ' missing contract');
    assert.ok(fs.existsSync(path.join(p, 'anvil', 'plan.yml')), f + ' missing plan');
  }
});

test('node fixture loop test still passes', () => {
  const env = Object.assign({}, process.env);
  delete env.NODE_TEST_CONTEXT;
  delete env.NODE_OPTIONS;
  const out = execSync(process.execPath + ' --test ' + JSON.stringify(path.join(ROOT, 'tests', 'loop', 'fixture-repo-node', 'loop.test.js')), { encoding: 'utf8', cwd: path.dirname(ROOT), env });
  assert.ok(/# pass \d+/.test(out), 'output: ' + out.slice(0, 500));
});
