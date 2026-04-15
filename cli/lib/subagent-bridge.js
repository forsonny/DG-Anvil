'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { makeError } = require('./errors.js');

const REDACT_PATTERNS = [
  /sk-ant-[a-zA-Z0-9_-]+/g,
  /sk-[a-zA-Z0-9_-]{20,}/g,
  /(authorization:\s*)[^\n]+/gi,
  /(x-api-key:\s*)[^\n]+/gi
];

function redact(text) {
  let out = String(text);
  for (const re of REDACT_PATTERNS) {
    out = out.replace(re, function (_, prefix) { return (prefix || '') + '[REDACTED]'; });
  }
  return out;
}

function recordCassette(opts) {
  const { cassettePath, scenario, briefing, response } = opts;
  fs.mkdirSync(path.dirname(cassettePath), { recursive: true });
  const briefingHash = 'sha256:' + crypto.createHash('sha256').update(JSON.stringify(briefing)).digest('hex');
  const record = {
    scenario,
    briefingHash,
    recordedAt: new Date().toISOString(),
    response: JSON.parse(redact(JSON.stringify(response)))
  };
  fs.writeFileSync(cassettePath, JSON.stringify(record, null, 2));
  return { recorded: true, cassettePath, briefingHash };
}

function replayCassette(opts) {
  const { cassettePath, briefing } = opts;
  if (!fs.existsSync(cassettePath)) throw makeError('E_IO', 'cassette not found: ' + cassettePath, { reason: 'missing_cassette' });
  const record = JSON.parse(fs.readFileSync(cassettePath, 'utf8'));
  const expected = 'sha256:' + crypto.createHash('sha256').update(JSON.stringify(briefing)).digest('hex');
  if (record.briefingHash !== expected) {
    throw makeError('E_IO', 'cassette briefing hash mismatch', { expected, recorded: record.briefingHash });
  }
  return record.response;
}

function liveDispatcher(opts) {
  return async function (briefing) {
    return { status: 'not_implemented', message: 'live dispatcher: host wiring TBD; use stub or cassette in tests' };
  };
}

module.exports = { recordCassette, replayCassette, liveDispatcher, redact };
