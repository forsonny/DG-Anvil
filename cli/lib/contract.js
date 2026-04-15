'use strict';

const fs = require('fs');
const path = require('path');
const yaml = require('./yaml.js');
const io = require('./io.js');
const { makeError } = require('./errors.js');

const SCHEMA_PATH = path.join(__dirname, '..', 'contract-schema.json');

function loadSchema() {
  return JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8'));
}

function parse(text) {
  try {
    return yaml.parseFrontmatter(text);
  } catch (err) {
    if (err.code === 'E_INVALID_YAML') throw err;
    throw makeError('E_INVALID_YAML', String(err.message || err), { cause: 'yaml' });
  }
}

function reject(rule, path, expected, actual) {
  throw makeError('E_INVALID_CONTRACT', 'contract invalid: ' + rule, { rule, path, expected, actual });
}

function validate(parsed) {
  const root = parsed && parsed.frontmatter ? parsed.frontmatter : parsed;
  if (!root || typeof root !== 'object') reject('missing_version', '$', 'object', typeof root);

  if (!('anvil_contract_version' in root)) reject('missing_version', '$.anvil_contract_version', 'integer', undefined);
  if (root.anvil_contract_version !== 1) reject('wrong_version', '$.anvil_contract_version', 1, root.anvil_contract_version);

  if (!('goal' in root) || typeof root.goal !== 'string' || root.goal.length === 0) {
    reject('missing_goal', '$.goal', 'non-empty string', root.goal);
  }

  if (!('created' in root) || typeof root.created !== 'string' || root.created.length === 0) {
    reject('missing_created', '$.created', 'non-empty string', root.created);
  }

  if (!('source_intent' in root) || typeof root.source_intent !== 'string' || root.source_intent.length === 0) {
    reject('missing_source_intent', '$.source_intent', 'non-empty string', root.source_intent);
  }

  if (!('criteria' in root) || !Array.isArray(root.criteria) || root.criteria.length === 0) {
    reject('missing_criteria', '$.criteria', 'non-empty array', root.criteria);
  }

  const allowedTop = new Set(['anvil_contract_version', 'goal', 'created', 'source_intent', 'criteria', 'invariants', 'notes', 'counter_examples', 'ledger_queried', 'ledger_hits']);
  for (const key of Object.keys(root)) {
    if (!allowedTop.has(key)) reject('unknown_top_level_key', '$.' + key, 'one of ' + Array.from(allowedTop).join('|'), key);
  }

  root.criteria.forEach((c, idx) => {
    if (!c || typeof c !== 'object') reject('criterion_missing_id', '$.criteria[' + idx + ']', 'object', typeof c);
    if (!('id' in c) || typeof c.id !== 'string' || c.id.length === 0) reject('criterion_missing_id', '$.criteria[' + idx + '].id', 'non-empty string', c.id);
    if (!('statement' in c) || typeof c.statement !== 'string') reject('criterion_missing_statement', '$.criteria[' + idx + '].statement', 'string', c.statement);
    for (const slot of ['exists', 'substantive', 'wired', 'functional']) {
      if (!(slot in c)) reject('criterion_missing_' + slot, '$.criteria[' + idx + '].' + slot, 'object', undefined);
      const val = c[slot];
      if (!val || typeof val !== 'object' || Array.isArray(val) || Object.keys(val).length === 0) {
        reject('criterion_empty_level', '$.criteria[' + idx + '].' + slot, 'non-empty object', val);
      }
    }
  });

  if ('counter_examples' in root) {
    if (!root.counter_examples || typeof root.counter_examples !== 'object' || Array.isArray(root.counter_examples)) {
      reject('counter_example_not_string', '$.counter_examples', 'object<string,string>', typeof root.counter_examples);
    }
    for (const [k, v] of Object.entries(root.counter_examples)) {
      if (typeof v !== 'string') reject('counter_example_not_string', '$.counter_examples.' + k, 'string', typeof v);
    }
  }

  return root;
}

function loadAndValidate(filePath) {
  const text = io.readFileUtf8(filePath);
  const parsed = parse(text);
  validate(parsed);
  return parsed;
}

module.exports = { parse, validate, loadAndValidate, loadSchema };
