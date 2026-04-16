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

const INTENT_VERBS = /\b(fix|add|implement|create|build|change|update|refactor|remove|delete|rewrite|port|migrate|upgrade|bump|rename|extract|wire|integrate|enable|disable|introduce|replace)\b/i;
const INTENT_PROBLEMS = /\b(bug|issue|broken|doesn'?t work|not working|fails|failed|failing|crash(es|ed|ing)?|regression|incorrect|wrong output)\b/i;
const INFORMATIONAL_LEADERS = /^(what|how|why|when|where|who|which)\b/i;
const INFORMATIONAL_VERBS = /\b(explain|describe|show me|tell me|walk me through|clarify|define|document|summari[sz]e|review\s+(my|the|this))\b/i;

function detectCodeChangeIntent(text) {
  if (!text || typeof text !== 'string') return false;
  const t = text.trim();
  if (t.length < 5) return false;
  if (t.startsWith('/')) return false;
  if (INFORMATIONAL_LEADERS.test(t)) return false;
  if (INFORMATIONAL_VERBS.test(t)) return false;
  return INTENT_VERBS.test(t) || INTENT_PROBLEMS.test(t);
}

function inActiveRun(state) {
  if (!state || !state.tasks) return false;
  return Object.values(state.tasks).some(t => ['running', 'queued', 'verified', 'judged', 'escalated'].includes(t.status));
}

function maybeSuggestStart(prompt, state) {
  if (!detectCodeChangeIntent(prompt)) return null;
  if (state && state.meta && state.meta.contract_unconfirmed === true) return null;
  if (inActiveRun(state)) return null;
  return {
    suggest: 'route_to_start',
    context: [
      'Anvil notice: the user appears to be describing a code change without running /start first.',
      'Before you make any code edits, writes, or tool calls that modify the repository, ask the user to run `/start <their-intent>` so Anvil can draft a machine-readable Contract, gate it at a one-shot confirmation, and run the verified loop (Contract -> Plan -> Execute -> Verify -> Judge).',
      'If the user has already explicitly confirmed they want to proceed without Anvil for this change (for example, they said "just fix it, no contract"), you may proceed.',
      'If the prompt is a pure information request (explain, describe, review, discuss, walk through), you may answer without suggesting /start.',
      'Do NOT silently make code changes without first surfacing this choice to the user. Every code change is expected to go through Anvil so the Ledger accumulates lessons and future contracts inherit them.'
    ].join(' ')
  };
}

module.exports = {
  shouldBlock,
  emitHookEvent,
  escalationBanner,
  contractUnconfirmedRouting,
  detectCodeChangeIntent,
  maybeSuggestStart,
  inActiveRun,
  readState,
  tokenStillValid,
  DESTRUCTIVE_PATTERNS,
  DESTRUCTIVE_PATHS
};
