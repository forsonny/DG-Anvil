'use strict';

const { sum } = require('./sum.js');

function main(args) {
  const a = parseInt(args[0] || '0', 10);
  const b = parseInt(args[1] || '0', 10);
  return sum(a, b);
}

module.exports = { main };
