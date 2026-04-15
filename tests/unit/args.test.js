'use strict';

const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const args = require(path.join(__dirname, '..', '..', 'cli', 'lib', 'args.js'));

test('positional and long-flag with equals', () => {
  const s = { positional: ['pattern'], options: { limit: { type: 'integer' } }, shortAliases: { l: 'limit' } };
  const r = args.parse(['foo', '--limit=3'], s);
  assert.strictEqual(r.positional[0], 'foo');
  assert.strictEqual(r.options.limit, 3);
});

test('long-flag with separate value', () => {
  const s = { positional: [], options: { in: { type: 'string' } }, shortAliases: {} };
  const r = args.parse(['--in', 'file.yml'], s);
  assert.strictEqual(r.options.in, 'file.yml');
});

test('boolean flag without value', () => {
  const s = { positional: [], options: { verbose: { type: 'boolean' } }, shortAliases: {} };
  const r = args.parse(['--verbose'], s);
  assert.strictEqual(r.options.verbose, true);
});

test('unknown flag throws E_UNKNOWN_FLAG', () => {
  const s = { positional: [], options: {}, shortAliases: {} };
  try { args.parse(['--bogus'], s); assert.fail('should throw'); }
  catch (err) { assert.strictEqual(err.code, 'E_UNKNOWN_FLAG'); }
});

test('required missing throws E_MISSING_ARG', () => {
  const s = { positional: [], options: { in: { type: 'string', required: true } }, shortAliases: {} };
  try { args.parse([], s); assert.fail('should throw'); }
  catch (err) { assert.strictEqual(err.code, 'E_MISSING_ARG'); }
});

test('integer coercion rejects non-integer', () => {
  const s = { positional: [], options: { n: { type: 'integer' } }, shortAliases: {} };
  try { args.parse(['--n=not-a-number'], s); assert.fail('should throw'); }
  catch (err) {
    assert.strictEqual(err.code, 'E_MISSING_ARG');
    assert.strictEqual(err.details.reason, 'not_integer');
  }
});

test('short flag cluster', () => {
  const s = { positional: [], options: { verbose: { type: 'boolean' }, quiet: { type: 'boolean' } }, shortAliases: { v: 'verbose', q: 'quiet' } };
  const r = args.parse(['-vq'], s);
  assert.strictEqual(r.options.verbose, true);
  assert.strictEqual(r.options.quiet, true);
});

test('terminator moves rest to remainder', () => {
  const s = { positional: [], options: {}, shortAliases: {} };
  const r = args.parse(['--', '--not-a-flag', 'x'], s);
  assert.deepStrictEqual(r.remainder, ['--not-a-flag', 'x']);
});

test('default applied when option not provided', () => {
  const s = { positional: [], options: { limit: { type: 'integer', default: 5 } }, shortAliases: {} };
  const r = args.parse([], s);
  assert.strictEqual(r.options.limit, 5);
});

test('prefix constants exported', () => {
  assert.strictEqual(args.LONG_FLAG_PREFIX, '--');
  assert.strictEqual(args.SHORT_FLAG_PREFIX, '-');
  assert.strictEqual(args.TERMINATOR, '--');
});
