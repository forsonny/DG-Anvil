'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { makeError } = require('./errors.js');

function defaultLedgerPath() {
  return path.join(os.homedir(), '.anvil', 'ledger.jsonl');
}

function defaultIndexPath() {
  return path.join(os.homedir(), '.anvil', 'ledger.index.json');
}

function load(opts) {
  const options = opts || {};
  const ledgerPath = options.ledgerPath || defaultLedgerPath();
  const indexPath = options.indexPath || defaultIndexPath();
  let lessons = [];
  let index = {};
  if (fs.existsSync(ledgerPath)) {
    const raw = fs.readFileSync(ledgerPath, 'utf8');
    const lines = raw.split(/\r?\n/).filter(l => l.trim().length > 0);
    lessons = lines.map(l => {
      try { return JSON.parse(l); }
      catch (err) { throw makeError('E_INVALID_JSON', 'ledger line invalid JSON', { cause: err.message }); }
    });
  }
  if (fs.existsSync(indexPath)) {
    const raw = fs.readFileSync(indexPath, 'utf8');
    try { index = JSON.parse(raw); }
    catch (err) { throw makeError('E_INVALID_JSON', 'ledger index invalid JSON', { cause: err.message }); }
  }
  return { lessons, index };
}

function tokenize(s) {
  return String(s || '').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
}

function query(pattern, opts) {
  const options = opts || {};
  const limit = options.limit || 5;
  const { lessons } = load(options);
  const tokens = tokenize(pattern);
  const scored = lessons.map(l => {
    const lessonTokens = new Set(Array.isArray(l.pattern) ? l.pattern.flatMap(tokenize) : tokenize(l.pattern));
    let score = 0;
    for (const t of tokens) if (lessonTokens.has(t)) score++;
    return { lesson: l, score, created: l.created || '' };
  });
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.created.localeCompare(a.created);
  });
  return scored.filter(s => s.score > 0).slice(0, limit).map(s => s.lesson);
}

function append() {
  throw makeError('E_NOT_IMPLEMENTED', 'ledger.append not implemented in Stage 1', { stage: 1, finalized_in: 3 });
}

function updateIndex() {
  throw makeError('E_NOT_IMPLEMENTED', 'ledger.updateIndex not implemented in Stage 1', { stage: 1, finalized_in: 3 });
}

module.exports = { load, query, append, updateIndex, defaultLedgerPath, defaultIndexPath };
