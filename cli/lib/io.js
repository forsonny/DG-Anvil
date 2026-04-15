'use strict';

const fs = require('fs');
const path = require('path');
const child_process = require('child_process');
const { makeError } = require('./errors.js');

const shellInterpolationForbidden = true;

const SHELL_METACHARS = /[;&|`$\r\n]/;

function readFileUtf8(p) {
  return fs.readFileSync(p, 'utf8');
}

function writeFileUtf8(p, content) {
  fs.writeFileSync(p, content, { encoding: 'utf8' });
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function pathJoin(...parts) {
  for (const part of parts) {
    if (typeof part !== 'string') throw makeError('E_IO', 'pathJoin requires strings', { reason: 'not_string' });
    if (part.split(/[\\/]/).includes('..')) {
      throw makeError('E_IO', 'pathJoin rejects .. segments', { reason: 'dotdot_forbidden', part });
    }
  }
  return path.join(...parts);
}

function spawn(cmd, argsArray, options) {
  if (!Array.isArray(argsArray)) {
    throw makeError('E_IO', 'spawn args must be an array', { reason: 'args_not_array' });
  }
  if (typeof cmd !== 'string' || SHELL_METACHARS.test(cmd)) {
    throw makeError('E_IO', 'spawn cmd contains forbidden shell metacharacters', { reason: 'shell_metacharacter_in_cmd', cmd });
  }
  const start = Date.now();
  const opts = Object.assign({ encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 }, options || {});
  const r = child_process.spawnSync(cmd, argsArray, opts);
  return {
    stdout: r.stdout == null ? '' : String(r.stdout),
    stderr: r.stderr == null ? '' : String(r.stderr),
    status: r.status,
    signal: r.signal,
    error: r.error || null,
    durationMs: Date.now() - start
  };
}

module.exports = {
  readFileUtf8,
  writeFileUtf8,
  spawn,
  ensureDir,
  pathJoin,
  shellInterpolationForbidden
};
