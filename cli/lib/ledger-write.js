'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { makeError } = require('./errors.js');

const DEFAULT_LEDGER_PATH = path.join(os.homedir(), '.anvil', 'ledger.jsonl');
const DEFAULT_INDEX_PATH = path.join(os.homedir(), '.anvil', 'ledger.index.json');

const REQUIRED_NONEMPTY = ['contract_gap', 'evidence', 'remediation'];

function assertNonNull(entry) {
  for (const field of REQUIRED_NONEMPTY) {
    const v = entry[field];
    if (v == null) throw makeError('E_NULL_LESSON', 'lesson field is null: ' + field, { field, value: v });
    if (typeof v === 'string' && v.trim().length === 0) throw makeError('E_NULL_LESSON', 'lesson field is empty: ' + field, { field, value: v });
  }
}

function validateEntry(entry) {
  if (!entry || typeof entry !== 'object') throw makeError('E_INVALID_LESSON', 'lesson must be an object', { received: typeof entry });
  if (entry.anvil_ledger_entry_version !== 1) throw makeError('E_INVALID_LESSON', 'wrong version', { rule: 'wrong_version', value: entry.anvil_ledger_entry_version });
  if (typeof entry.id !== 'string' || entry.id.length === 0) throw makeError('E_INVALID_LESSON', 'id required', { rule: 'missing_id' });
  if (typeof entry.created !== 'string' || entry.created.length === 0) throw makeError('E_INVALID_LESSON', 'created required', { rule: 'missing_created' });
  assertNonNull(entry);
  return entry;
}

function append(entry, opts) {
  const options = opts || {};
  const ledgerPath = options.ledgerPath || DEFAULT_LEDGER_PATH;
  const indexPath = options.indexPath || DEFAULT_INDEX_PATH;
  validateEntry(entry);
  fs.mkdirSync(path.dirname(ledgerPath), { recursive: true });
  fs.appendFileSync(ledgerPath, JSON.stringify(entry) + '\n', { encoding: 'utf8' });
  updateIndex(entry, { indexPath });
  return { appended: true, id: entry.id, ledgerPath };
}

function updateIndex(entry, opts) {
  const options = opts || {};
  const indexPath = options.indexPath || DEFAULT_INDEX_PATH;
  fs.mkdirSync(path.dirname(indexPath), { recursive: true });
  let idx = { by_pattern: {}, by_id: {} };
  if (fs.existsSync(indexPath)) {
    try { idx = JSON.parse(fs.readFileSync(indexPath, 'utf8')); }
    catch (err) { throw makeError('E_INDEX_DESYNC', 'ledger index invalid JSON', { cause: err.message }); }
  }
  if (!idx.by_pattern) idx.by_pattern = {};
  if (!idx.by_id) idx.by_id = {};
  idx.by_id[entry.id] = { created: entry.created };
  const patterns = Array.isArray(entry.pattern) ? entry.pattern : (entry.tags || []);
  for (const p of patterns) {
    const key = String(p).toLowerCase();
    if (!idx.by_pattern[key]) idx.by_pattern[key] = [];
    if (!idx.by_pattern[key].includes(entry.id)) idx.by_pattern[key].push(entry.id);
  }
  fs.writeFileSync(indexPath, JSON.stringify(idx), { encoding: 'utf8' });
  return idx;
}

function supersede(oldId, newId, opts) {
  const options = opts || {};
  const ledgerPath = options.ledgerPath || DEFAULT_LEDGER_PATH;
  if (!oldId || !newId) throw makeError('E_INVALID_SUPERSESSION', 'both oldId and newId required', { oldId, newId });
  if (!fs.existsSync(ledgerPath)) throw makeError('E_INVALID_SUPERSESSION', 'ledger file missing', { ledgerPath });
  const lines = fs.readFileSync(ledgerPath, 'utf8').split(/\r?\n/).filter(Boolean);
  const entry = lines.map(l => JSON.parse(l)).find(e => e.id === oldId);
  if (!entry) throw makeError('E_INVALID_SUPERSESSION', 'oldId not found', { oldId });
  return { oldId, newId, at: new Date().toISOString() };
}

function audit(opts) {
  const options = opts || {};
  const ledgerPath = options.ledgerPath || DEFAULT_LEDGER_PATH;
  const indexPath = options.indexPath || DEFAULT_INDEX_PATH;
  const issues = [];
  if (!fs.existsSync(ledgerPath)) return { ok: true, issues, checked: { lessons: 0 } };
  const lines = fs.readFileSync(ledgerPath, 'utf8').split(/\r?\n/).filter(Boolean);
  const seen = new Set();
  let count = 0;
  for (const l of lines) {
    count++;
    let e;
    try { e = JSON.parse(l); } catch (err) { issues.push({ line: count, issue: 'invalid_json' }); continue; }
    try { validateEntry(e); } catch (err) { issues.push({ line: count, id: e.id, issue: err.code, details: err.details }); continue; }
    if (seen.has(e.id)) issues.push({ line: count, id: e.id, issue: 'duplicate_id' });
    seen.add(e.id);
  }
  if (fs.existsSync(indexPath)) {
    let idx;
    try { idx = JSON.parse(fs.readFileSync(indexPath, 'utf8')); }
    catch (err) { issues.push({ issue: 'index_invalid_json' }); }
    if (idx && idx.by_id) {
      for (const id of Object.keys(idx.by_id)) {
        if (!seen.has(id)) issues.push({ id, issue: 'index_desync_missing_entry' });
      }
    }
  }
  return { ok: issues.length === 0, issues, checked: { lessons: count } };
}

function makeLessonId() {
  return 'L-' + new Date().toISOString().slice(0, 10) + '-' + crypto.randomBytes(4).toString('hex');
}

module.exports = {
  append,
  updateIndex,
  supersede,
  audit,
  validateEntry,
  makeLessonId,
  DEFAULT_LEDGER_PATH,
  DEFAULT_INDEX_PATH
};
