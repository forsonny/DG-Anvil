'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { sum } = require('../src/sum.js');

test('sum_zero', () => {
  assert.strictEqual(sum(0, 0), 0);
});

test('sum_positive', () => {
  assert.strictEqual(sum(2, 3), 5);
});

test('sum_negative', () => {
  assert.strictEqual(sum(-1, -2), -3);
});
