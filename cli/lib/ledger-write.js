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

function tokenize(s) {
  return String(s || '').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
}

function jaccardSimilarity(a, b) {
  const sa = new Set(tokenize(a));
  const sb = new Set(tokenize(b));
  if (sa.size === 0 && sb.size === 0) return 1;
  let inter = 0;
  for (const t of sa) if (sb.has(t)) inter++;
  const unionSize = sa.size + sb.size - inter;
  return unionSize === 0 ? 0 : inter / unionSize;
}

function normalizePatterns(arr) {
  const out = new Set();
  for (const raw of Array.isArray(arr) ? arr : []) {
    for (const tok of tokenize(raw)) out.add(tok);
  }
  return Array.from(out);
}

function findSimilar(gapText, opts) {
  const options = opts || {};
  const ledgerPath = options.ledgerPath || DEFAULT_LEDGER_PATH;
  const threshold = options.threshold == null ? 0.7 : options.threshold;
  if (!fs.existsSync(ledgerPath)) return [];
  const lines = fs.readFileSync(ledgerPath, 'utf8').split(/\r?\n/).filter(Boolean);
  const hits = [];
  for (const line of lines) {
    let entry;
    try { entry = JSON.parse(line); } catch (_) { continue; }
    if (!entry.contract_gap) continue;
    const s = jaccardSimilarity(gapText, entry.contract_gap);
    if (s >= threshold) hits.push({ id: entry.id, similarity: s, entry });
  }
  hits.sort((a, b) => b.similarity - a.similarity);
  return hits;
}

function retroactive(input, opts) {
  const contract = input && input.contract;
  const gap = input && input.confirmed_gap_note;
  const criterionId = input && input.criterion_id;
  const sourceIntent = input && input.source_intent;
  const patterns = input && input.patterns;

  if (!contract || !Array.isArray(contract.criteria)) {
    throw makeError('E_INVALID_LESSON', 'retroactive: contract with criteria required', { rule: 'missing_contract' });
  }
  if (typeof gap !== 'string' || gap.trim().length === 0) {
    throw makeError('E_NULL_LESSON', 'retroactive: confirmed_gap_note required and non-empty', { field: 'confirmed_gap_note' });
  }
  if (typeof criterionId !== 'string' || criterionId.length === 0) {
    throw makeError('E_INVALID_LESSON', 'retroactive: criterion_id required', { rule: 'missing_criterion_id' });
  }
  const criterion = contract.criteria.find(c => c.id === criterionId);
  if (!criterion) {
    throw makeError('E_INVALID_LESSON', 'retroactive: criterion_id not found in contract', { rule: 'unknown_criterion_id', criterionId });
  }
  if (typeof sourceIntent !== 'string' || sourceIntent.trim().length === 0) {
    throw makeError('E_NULL_LESSON', 'retroactive: source_intent required', { field: 'source_intent' });
  }

  const normPatterns = normalizePatterns(patterns);
  const structuralTags = Array.from(new Set(normPatterns.concat(['shipped_gap', 'post_hoc'])));

  const similar = findSimilar(gap.trim(), {
    ledgerPath: (opts && opts.ledgerPath) || DEFAULT_LEDGER_PATH,
    threshold: (opts && opts.threshold) != null ? opts.threshold : 0.7
  });

  const entry = {
    anvil_ledger_entry_version: 1,
    id: makeLessonId(),
    created: new Date().toISOString().slice(0, 10),
    contract_gap: gap.trim(),
    evidence: 'retroactive: criterion ' + criterionId + ' passed after post-ship fix (source_intent: ' + sourceIntent.trim().slice(0, 200) + ')',
    remediation: criterion.statement,
    pattern: normPatterns,
    tags: structuralTags,
    source_criterion_id: criterionId
  };
  if (similar.length > 0) {
    entry.supersedes = similar.slice(0, 3).map(s => s.id);
    entry.supersedes_reason = 'retroactive lesson consolidates near-duplicate (Jaccard >= 0.7) prior lessons on same contract_gap';
  }

  return append(entry, opts);
}

function invalidate(lessonId, reason, opts) {
  const allowedReasons = new Set(['revert', 'stale', 'wrong']);
  if (!lessonId || typeof lessonId !== 'string') {
    throw makeError('E_INVALID_LESSON', 'invalidate requires a lesson id', { rule: 'missing_lesson_id' });
  }
  if (!allowedReasons.has(reason)) {
    throw makeError('E_INVALID_LESSON', 'invalidate reason must be one of: revert, stale, wrong', { received: reason });
  }
  const options = opts || {};
  const ledgerPath = options.ledgerPath || DEFAULT_LEDGER_PATH;
  if (!fs.existsSync(ledgerPath)) {
    throw makeError('E_INVALID_LESSON', 'ledger file missing', { ledgerPath });
  }
  const lines = fs.readFileSync(ledgerPath, 'utf8').split(/\r?\n/).filter(Boolean);
  const found = lines.map(l => { try { return JSON.parse(l); } catch (_) { return null; } }).find(e => e && e.id === lessonId);
  if (!found) {
    throw makeError('E_INVALID_LESSON', 'lesson not found: ' + lessonId, { lessonId });
  }
  const marker = {
    anvil_ledger_entry_version: 1,
    id: makeLessonId(),
    created: new Date().toISOString().slice(0, 10),
    invalidates: lessonId,
    invalidation_reason: reason,
    contract_gap: 'invalidation marker for ' + lessonId,
    evidence: 'reason: ' + reason,
    remediation: 'prior lesson ' + lessonId + ' is invalidated (' + reason + '); future queries should skip it',
    tags: ['invalidation', reason],
    pattern: Array.isArray(found.pattern) ? found.pattern : []
  };
  return append(marker, opts);
}

module.exports = {
  append,
  updateIndex,
  supersede,
  audit,
  validateEntry,
  makeLessonId,
  retroactive,
  invalidate,
  findSimilar,
  jaccardSimilarity,
  normalizePatterns,
  DEFAULT_LEDGER_PATH,
  DEFAULT_INDEX_PATH
};
