'use strict';

const fs = require('fs');
const path = require('path');
const { makeError } = require('./errors.js');
const trace = require('./trace.js');

const DESTRUCTIVE_PATTERNS = [
  /\brm\s+-rf\b/,
  /\bgit\s+push\s+--force\b/,
  /\bgit\s+reset\s+--hard\b/,
  /\bDROP\s+TABLE\b/i,
  /\bgit\s+clean\s+-f\b/
];

const DESTRUCTIVE_PATHS = [
  /\.anvil\/contract\.yml$/,
  /\.anvil\/plan\.yml$/,
  /~\/\.anvil\/ledger\.jsonl$/
];

function readState(statePath) {
  if (!fs.existsSync(statePath)) return null;
  try { return JSON.parse(fs.readFileSync(statePath, 'utf8')); }
  catch (_) { return null; }
}

function tokenStillValid(state) {
  if (!state || !state.meta || !state.meta.ship_approval_token) return false;
  if (!state.meta.ship_approval_token_expires_at) return false;
  return Date.parse(state.meta.ship_approval_token_expires_at) > Date.now();
}

function shouldBlock(toolUse, state) {
  if (tokenStillValid(state)) return null;
  const cmd = toolUse && toolUse.command ? String(toolUse.command) : '';
  for (const re of DESTRUCTIVE_PATTERNS) {
    if (re.test(cmd)) {
      return { reason: 'destructive_pattern', pattern: re.source, command: cmd };
    }
  }
  const filePath = toolUse && toolUse.file_path ? String(toolUse.file_path) : '';
  for (const re of DESTRUCTIVE_PATHS) {
    if (re.test(filePath)) {
      return { reason: 'protected_path', path: filePath };
    }
  }
  return null;
}

function emitHookEvent(opts) {
  const { tracePath, hookName, outcome, meta } = opts;
  return trace.append(tracePath, {
    phase: 'hook',
    outcome: outcome || 'end',
    meta: Object.assign({ hook: hookName }, meta || {})
  });
}

function escalationBanner(state) {
  if (!state || !state.tasks) return null;
  const escalated = Object.keys(state.tasks).filter(id => state.tasks[id].status === 'escalated');
  if (escalated.length === 0) return null;
  return {
    banner: 'anvil_escalation',
    count: escalated.length,
    task_ids: escalated,
    message: 'Tasks are escalated. Run `anvil escalation list` to inspect; `/abort --from-escalation --task <id>` to resolve.'
  };
}

function contractUnconfirmedRouting(state) {
  if (!state || !state.meta) return null;
  if (state.meta.contract_unconfirmed === true) {
    return { route: 'contracting', reason: 'contract_unconfirmed' };
  }
  return null;
}

module.exports = {
  shouldBlock,
  emitHookEvent,
  escalationBanner,
  contractUnconfirmedRouting,
  readState,
  tokenStillValid,
  DESTRUCTIVE_PATTERNS,
  DESTRUCTIVE_PATHS
};
