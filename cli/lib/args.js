'use strict';

const { makeError } = require('./errors.js');

const LONG_FLAG_PREFIX = '--';
const SHORT_FLAG_PREFIX = '-';
const TERMINATOR = '--';

function coerce(value, type, flag) {
  if (type === 'string' || type === undefined) return value;
  if (type === 'boolean') return value === true || value === 'true';
  if (type === 'integer') {
    const n = parseInt(value, 10);
    if (Number.isNaN(n) || String(n) !== String(value).trim()) {
      throw makeError('E_MISSING_ARG', 'flag ' + flag + ' requires an integer', { flag, reason: 'not_integer' });
    }
    return n;
  }
  if (type === 'number') {
    const f = Number(value);
    if (Number.isNaN(f)) {
      throw makeError('E_MISSING_ARG', 'flag ' + flag + ' requires a number', { flag, reason: 'not_number' });
    }
    return f;
  }
  return value;
}

function parse(argv, schema) {
  if (!Array.isArray(argv)) throw makeError('E_MISSING_ARG', 'args.parse expects argv array', { reason: 'not_array' });
  const sch = schema || {};
  const positionalNames = sch.positional || [];
  const options = sch.options || {};
  const shortAliases = sch.shortAliases || {};

  const positional = [];
  const opts = {};
  const remainder = [];
  let i = 0;
  while (i < argv.length) {
    const a = argv[i];
    if (a === TERMINATOR) {
      i++;
      while (i < argv.length) { remainder.push(argv[i]); i++; }
      break;
    }
    if (a.startsWith(LONG_FLAG_PREFIX)) {
      const body = a.slice(2);
      const eq = body.indexOf('=');
      let name;
      let value;
      if (eq !== -1) { name = body.slice(0, eq); value = body.slice(eq + 1); }
      else { name = body; value = undefined; }
      const def = options[name];
      if (!def) throw makeError('E_UNKNOWN_FLAG', 'unknown flag --' + name, { flag: '--' + name, argv_index: i });
      if (def.type === 'boolean') {
        opts[name] = value === undefined ? true : coerce(value, 'boolean', '--' + name);
      } else {
        if (value === undefined) {
          if (i + 1 >= argv.length) throw makeError('E_MISSING_ARG', 'flag --' + name + ' requires a value', { flag: '--' + name });
          value = argv[i + 1];
          i++;
        }
        opts[name] = coerce(value, def.type || 'string', '--' + name);
      }
      i++;
      continue;
    }
    if (a.length > 1 && a.startsWith(SHORT_FLAG_PREFIX) && !/^-\d/.test(a)) {
      const cluster = a.slice(1);
      for (let k = 0; k < cluster.length; k++) {
        const ch = cluster[k];
        const longName = shortAliases[ch];
        if (!longName) throw makeError('E_UNKNOWN_FLAG', 'unknown short flag -' + ch, { flag: '-' + ch, argv_index: i });
        const def = options[longName];
        if (!def) throw makeError('E_UNKNOWN_FLAG', 'unknown short flag -' + ch, { flag: '-' + ch, argv_index: i });
        if (def.type === 'boolean') {
          opts[longName] = true;
        } else {
          let value;
          if (k < cluster.length - 1) { value = cluster.slice(k + 1); k = cluster.length; }
          else {
            if (i + 1 >= argv.length) throw makeError('E_MISSING_ARG', 'flag -' + ch + ' requires a value', { flag: '-' + ch });
            value = argv[i + 1];
            i++;
          }
          opts[longName] = coerce(value, def.type || 'string', '-' + ch);
        }
      }
      i++;
      continue;
    }
    positional.push(a);
    i++;
  }

  for (const [name, def] of Object.entries(options)) {
    if (def && def.required && !(name in opts)) {
      throw makeError('E_MISSING_ARG', 'required flag --' + name + ' not provided', { flag: '--' + name });
    }
    if (def && 'default' in def && !(name in opts)) {
      opts[name] = def.default;
    }
  }

  return { positional, options: opts, remainder };
}

module.exports = { parse, LONG_FLAG_PREFIX, SHORT_FLAG_PREFIX, TERMINATOR };
