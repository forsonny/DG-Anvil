'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const bridge = require(path.join(__dirname, '..', '..', 'cli', 'lib', 'subagent-bridge.js'));

test('redact strips API keys', () => {
  const r = bridge.redact('key=sk-ant-abc123def456 another=plain');
  assert.ok(r.includes('[REDACTED]'));
  assert.ok(!r.includes('sk-ant-abc123def456'));
});

test('redact strips authorization header', () => {
  const r = bridge.redact('authorization: Bearer secret-token-here');
  assert.ok(r.includes('[REDACTED]'));
});

test('record + replay round-trip', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cassette-'));
  try {
    const cassettePath = path.join(dir, 'c.json');
    const briefing = { taskId: 'T0', contract: { criteria: [{ id: 'C1' }] } };
    const response = { action: 'merge', per_criterion: [{ id: 'C1', status: 'pass' }] };
    bridge.recordCassette({ cassettePath, scenario: 'test', briefing, response });
    const replayed = bridge.replayCassette({ cassettePath, briefing });
    assert.deepStrictEqual(replayed, response);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('replay rejects briefing hash mismatch', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cassette-'));
  try {
    const cassettePath = path.join(dir, 'c.json');
    bridge.recordCassette({ cassettePath, scenario: 'test', briefing: { a: 1 }, response: { ok: true } });
    try {
      bridge.replayCassette({ cassettePath, briefing: { a: 2 } });
      assert.fail('should throw');
    } catch (err) {
      assert.strictEqual(err.code, 'E_IO');
    }
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
