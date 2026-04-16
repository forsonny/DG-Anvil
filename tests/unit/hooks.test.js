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

test('detectCodeChangeIntent: fix verb triggers', () => {
  assert.strictEqual(hooks.detectCodeChangeIntent('fix the rate limiter bug'), true);
});

test('detectCodeChangeIntent: add verb triggers', () => {
  assert.strictEqual(hooks.detectCodeChangeIntent('add a retry for 429 responses'), true);
});

test('detectCodeChangeIntent: bug noun triggers', () => {
  assert.strictEqual(hooks.detectCodeChangeIntent('there is a bug in the cache layer'), true);
});

test('detectCodeChangeIntent: informational question does not trigger', () => {
  assert.strictEqual(hooks.detectCodeChangeIntent('how does the rate limiter work?'), false);
});

test('detectCodeChangeIntent: explain request does not trigger', () => {
  assert.strictEqual(hooks.detectCodeChangeIntent('explain the cache layer'), false);
});

test('detectCodeChangeIntent: what-is does not trigger', () => {
  assert.strictEqual(hooks.detectCodeChangeIntent('what is a rolling window?'), false);
});

test('detectCodeChangeIntent: slash command bypassed', () => {
  assert.strictEqual(hooks.detectCodeChangeIntent('/start fix the bug'), false);
});

test('detectCodeChangeIntent: short prompt bypassed', () => {
  assert.strictEqual(hooks.detectCodeChangeIntent('hi'), false);
});

test('maybeSuggestStart: suggests when intent detected and no active run', () => {
  const r = hooks.maybeSuggestStart('fix the rate limiter bug', null);
  assert.ok(r);
  assert.strictEqual(r.suggest, 'route_to_start');
  assert.ok(r.context.includes('/start'));
});

test('maybeSuggestStart: silent when in-flight task running', () => {
  const state = { tasks: { T1: { status: 'running' } } };
  assert.strictEqual(hooks.maybeSuggestStart('fix the bug', state), null);
});

test('maybeSuggestStart: silent when contract unconfirmed', () => {
  const state = { meta: { contract_unconfirmed: true } };
  assert.strictEqual(hooks.maybeSuggestStart('fix the bug', state), null);
});

test('maybeSuggestStart: silent for informational prompt', () => {
  assert.strictEqual(hooks.maybeSuggestStart('explain how it works', null), null);
});
