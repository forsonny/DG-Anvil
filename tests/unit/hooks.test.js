'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const hooks = require(path.join(__dirname, '..', '..', 'cli', 'lib', 'hooks.js'));

test('shouldBlock detects rm -rf', () => {
  const r = hooks.shouldBlock({ command: 'rm -rf /' }, null);
  assert.ok(r);
  assert.strictEqual(r.reason, 'destructive_pattern');
});

test('shouldBlock detects git push --force', () => {
  const r = hooks.shouldBlock({ command: 'git push --force origin main' }, null);
  assert.ok(r);
});

test('shouldBlock returns null on safe command', () => {
  assert.strictEqual(hooks.shouldBlock({ command: 'ls -la' }, null), null);
});

test('valid ship token bypasses block', () => {
  const future = new Date(Date.now() + 60_000).toISOString();
  const state = { meta: { ship_approval_token: 't', ship_approval_token_expires_at: future } };
  assert.strictEqual(hooks.shouldBlock({ command: 'rm -rf nope' }, state), null);
});

test('expired ship token does not bypass', () => {
  const past = new Date(Date.now() - 60_000).toISOString();
  const state = { meta: { ship_approval_token: 't', ship_approval_token_expires_at: past } };
  assert.ok(hooks.shouldBlock({ command: 'rm -rf nope' }, state));
});

test('escalationBanner returns null without escalated tasks', () => {
  assert.strictEqual(hooks.escalationBanner({ tasks: { T1: { status: 'passed' } } }), null);
});

test('escalationBanner returns banner when tasks escalated', () => {
  const b = hooks.escalationBanner({ tasks: { T1: { status: 'escalated' }, T2: { status: 'passed' } } });
  assert.strictEqual(b.banner, 'anvil_escalation');
  assert.deepStrictEqual(b.task_ids, ['T1']);
});

test('contractUnconfirmedRouting routes to contracting when flag set', () => {
  const r = hooks.contractUnconfirmedRouting({ meta: { contract_unconfirmed: true } });
  assert.strictEqual(r.route, 'contracting');
});
