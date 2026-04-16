#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { CODES } = require('./lib/errors.js');
const args = require('./lib/args.js');
const io = require('./lib/io.js');
const contractLib = require('./lib/contract.js');
const planLib = require('./lib/plan.js');
const ledgerLib = require('./lib/ledger.js');
const ledgerWrite = require('./lib/ledger-write.js');
const court = require('./lib/court.js');
const metricsLib = require('./lib/metrics.js');
const traceLib = require('./lib/trace.js');
const hooksLib = require('./lib/hooks.js');
const escalationLib = require('./lib/escalation.js');
const subagentBridge = require('./lib/subagent-bridge.js');

const PKG = require('../package.json');

const HELP_TEXT = [
  'Usage: anvil <subcommand> [options]',
  '',
  'Subcommands:',
  '  contract --validate <file>      Validate a contract file.',
  '  contract --from <intent>        (stubbed; authoring surface is /start)',
  '  plan --validate <file> --contract <file>   Validate a plan against a contract.',
  '  plan --from <contract>          (stubbed; authoring surface is the planning skill)',
  '  run                             Dispatch a task wave (Stage 2).',
  '  verify                          Run verification probes (Stage 2).',
  '  judge --task <id> --worktree <dir> --contract <file>   Dispatch the Court.',
  '  ledger query <pattern>          Read the lesson ledger.',
  '  ledger append --file <jsonl>    Append lessons from a file.',
  '  ledger audit                    Audit the ledger for null lessons and desync.',
  '  metrics --trace-path <file>     Compute calibration, lesson hit rate, theatre drift.',
  '  audit                           Audit the ledger.',
  '  ship                            Finalize a passing run; opens PR via gh.',
  '  hook <name>                     Internal: invoked by polyglot hook scripts.',
  '  escalation list                 List escalated tasks.',
  '  escalation describe --task <id> Inspect one escalated task.',
  '  cassette record --scenario <s> --out <p>  Record a cassette for replay tests.',
  '  merge-task --task <id>          Merge the task worktree back and clean up.',
  '  reset-task --task <id>          Force-remove a stale worktree + branch for a task.',
  '  contract-migrate --in <file> --out <file>  Identity migrate v1->v1.',
  '  plan-migrate --in <file> --out <file>      Identity migrate v1->v1.',
  '  ledger-migrate --in <file> --out <file>    Identity migrate v1->v1.',
  '',
  'Flags:',
  '  --help    Print this help and exit 0.',
  '  --version Print the version and exit 0.',
  ''
].join('\n');

function writeError(code, message, details) {
  const obj = { error: message, code: code, details: details === undefined ? null : details };
  process.stderr.write(JSON.stringify(obj) + '\n');
}

function handleErr(err) {
  const code = err && err.code ? err.code : CODES.E_IO;
  const msg = err && err.error ? err.error : (err && err.message ? err.message : 'unknown error');
  writeError(code, msg, err && err.details !== undefined ? err.details : null);
  process.exit(1);
}

function contractHandler(argv) {
  const schema = {
    positional: [],
    options: {
      validate: { type: 'string' },
      from: { type: 'string' }
    },
    shortAliases: {}
  };
  let parsed;
  try { parsed = args.parse(argv.slice(1), schema); }
  catch (err) { handleErr(err); return; }

  if (parsed.options.validate) {
    try {
      const result = contractLib.loadAndValidate(parsed.options.validate);
      const count = Array.isArray(result.frontmatter && result.frontmatter.criteria)
        ? result.frontmatter.criteria.length
        : (Array.isArray(result.criteria) ? result.criteria.length : 0);
      process.stdout.write(JSON.stringify({ ok: true, criteria: count }) + '\n');
      process.exit(0);
    } catch (err) { handleErr(err); }
    return;
  }
  if (parsed.options.from) {
    writeError(CODES.E_NOT_IMPLEMENTED, 'contract --from not implemented: authoring surface is /start', { stage: 1, subcommand: 'contract --from' });
    process.exit(1);
    return;
  }
  writeError(CODES.E_MISSING_ARG, 'contract requires --validate <file> or --from <intent>', { subcommand: 'contract' });
  process.exit(1);
}

function planHandler(argv) {
  const schema = {
    positional: [],
    options: {
      validate: { type: 'string' },
      contract: { type: 'string' },
      from: { type: 'string' }
    },
    shortAliases: {}
  };
  let parsed;
  try { parsed = args.parse(argv.slice(1), schema); }
  catch (err) { handleErr(err); return; }

  if (parsed.options.validate) {
    if (!parsed.options.contract) {
      writeError(CODES.E_MISSING_ARG, 'plan --validate requires --contract <file>', { flag: '--contract' });
      process.exit(1);
      return;
    }
    try {
      const contractParsed = contractLib.loadAndValidate(parsed.options.contract);
      const contractObj = contractParsed.frontmatter || contractParsed;
      const planObj = planLib.loadAndValidate(parsed.options.validate, contractObj);
      const waves = planLib.topologicalWaves(planObj.tasks);
      process.stdout.write(JSON.stringify({ ok: true, tasks: planObj.tasks.length, waves: waves.length }) + '\n');
      process.exit(0);
    } catch (err) { handleErr(err); }
    return;
  }
  if (parsed.options.from) {
    writeError(CODES.E_NOT_IMPLEMENTED, 'plan --from not implemented: authoring surface is the planning skill', { stage: 1, subcommand: 'plan --from' });
    process.exit(1);
    return;
  }
  writeError(CODES.E_MISSING_ARG, 'plan requires --validate <file> --contract <file> or --from <contract>', { subcommand: 'plan' });
  process.exit(1);
}

const executor = require('./lib/executor.js');
const verifier = require('./lib/verifier.js');
const worktree = require('./lib/worktree.js');

const KNOWN_DISPATCHERS = new Set(['anvil_subagent', 'stub']);

function stubDispatcher(briefing) {
  return Promise.resolve({
    diff: '',
    toolOutput: [{ tool: 'stub-dispatcher', stdout: 'noop', stderr: '', status: 0, tool_input_hash: 'sha256:0' }],
    status: 'ok'
  });
}

function runHandler(argv) {
  const schema = {
    positional: [],
    options: {
      task: { type: 'string', required: true },
      contract: { type: 'string' },
      plan: { type: 'string' },
      'repo-root': { type: 'string' },
      dispatcher: { type: 'string', default: 'anvil_subagent' }
    },
    shortAliases: {}
  };
  let parsed;
  try { parsed = args.parse(argv.slice(1), schema); }
  catch (err) { handleErr(err); return; }

  if (!KNOWN_DISPATCHERS.has(parsed.options.dispatcher)) {
    writeError(CODES.E_UNKNOWN_DISPATCHER, 'unknown dispatcher: ' + parsed.options.dispatcher, { dispatcher: parsed.options.dispatcher });
    process.exit(1);
    return;
  }

  const repoRoot = parsed.options['repo-root'] || process.cwd();
  const contractPath = parsed.options.contract || path.join(repoRoot, 'anvil', 'contract.yml');
  const planPath = parsed.options.plan || path.join(repoRoot, 'anvil', 'plan.yml');

  (async () => {
    try {
      const contractObj = contractLib.loadAndValidate(contractPath).frontmatter;
      const planObj = planLib.loadAndValidate(planPath, contractObj);
      const task = planObj.tasks.find(t => t.id === parsed.options.task);
      if (!task) {
        writeError(CODES.E_MISSING_ARG, 'task id not found in plan: ' + parsed.options.task, { taskId: parsed.options.task });
        process.exit(1);
        return;
      }
      const dispatcher = parsed.options.dispatcher === 'stub' ? stubDispatcher : stubDispatcher;
      const result = await executor.executeTask({ repoRoot, task, contract: contractObj, dispatcher });
      process.stdout.write(JSON.stringify({ ok: true, run: result }) + '\n');
      process.exit(result.status === 'ok' ? 0 : 1);
    } catch (err) { handleErr(err); }
  })();
}

function verifyHandler(argv) {
  const schema = {
    positional: [],
    options: {
      worktree: { type: 'string', required: true },
      contract: { type: 'string', required: true }
    },
    shortAliases: {}
  };
  let parsed;
  try { parsed = args.parse(argv.slice(1), schema); }
  catch (err) { handleErr(err); return; }

  try {
    const contractObj = contractLib.loadAndValidate(parsed.options.contract).frontmatter;
    const result = verifier.verifyAll({
      worktreePath: parsed.options.worktree,
      contract: contractObj,
      diffPath: path.join(parsed.options.worktree, 'anvil', 'diff.patch'),
      toolOutputPath: path.join(parsed.options.worktree, 'anvil', 'tool-output.jsonl')
    });
    process.stdout.write(JSON.stringify(result) + '\n');
    process.exit(result.allGreen ? 0 : 1);
  } catch (err) { handleErr(err); }
}

function judgeHandler(argv) {
  const schema = {
    positional: [],
    options: {
      task: { type: 'string', required: true },
      worktree: { type: 'string', required: true },
      contract: { type: 'string', required: true }
    },
    shortAliases: {}
  };
  let parsed;
  try { parsed = args.parse(argv.slice(1), schema); }
  catch (err) { handleErr(err); return; }

  (async () => {
    try {
      const contractObj = contractLib.loadAndValidate(parsed.options.contract).frontmatter;
      const diffPath = path.join(parsed.options.worktree, 'anvil', 'diff.patch');
      const verifyResultPath = path.join(parsed.options.worktree, 'anvil', 'verify', 'verify-result.json');
      const diff = fs.existsSync(diffPath) ? io.readFileUtf8(diffPath) : '';
      const verifyOutput = fs.existsSync(verifyResultPath) ? JSON.parse(io.readFileUtf8(verifyResultPath)) : {};
      const stubCourt = async () => ({ action: 'merge', per_criterion: (contractObj.criteria || []).map(c => ({ id: c.id, status: 'pass' })) });
      const r = await court.judge({ taskId: parsed.options.task, contract: contractObj, diff, verifyOutput, confidence: 0.9, dispatcher: stubCourt });
      process.stdout.write(JSON.stringify(r) + '\n');
      process.exit(0);
    } catch (err) { handleErr(err); }
  })();
}

const LEDGER_SUBCOMMANDS = new Set(['query', 'append', 'audit', 'invalidate', 'retroactive']);

function ledgerHandler(argv) {
  const sub = argv[1];
  if (sub !== undefined && !LEDGER_SUBCOMMANDS.has(sub)) {
    writeError(CODES.E_UNKNOWN_SUBCOMMAND, 'unknown ledger sub-subcommand: ' + sub, { subcommand: 'ledger', received: sub });
    process.exit(1);
    return;
  }
  if (sub === 'query') {
    const schema = {
      positional: ['pattern'],
      options: { limit: { type: 'integer', default: 5 } },
      shortAliases: { l: 'limit' }
    };
    let parsed;
    try { parsed = args.parse(argv.slice(2), schema); }
    catch (err) { handleErr(err); return; }
    const pattern = parsed.positional[0] || '';
    try {
      const result = ledgerLib.query(pattern, { limit: parsed.options.limit });
      process.stdout.write(JSON.stringify(result) + '\n');
      process.exit(0);
    } catch (err) { handleErr(err); }
    return;
  }
  if (sub === 'append') {
    const schema = {
      positional: [],
      options: { file: { type: 'string', required: true } },
      shortAliases: {}
    };
    let parsed;
    try { parsed = args.parse(argv.slice(2), schema); }
    catch (err) { handleErr(err); return; }
    try {
      const text = io.readFileUtf8(parsed.options.file);
      const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
      const appended = [];
      for (const line of lines) {
        const entry = JSON.parse(line);
        const r = ledgerWrite.append(entry);
        appended.push(r.id);
      }
      process.stdout.write(JSON.stringify({ ok: true, appended }) + '\n');
      process.exit(0);
    } catch (err) { handleErr(err); }
    return;
  }
  if (sub === 'audit') {
    try {
      const r = ledgerWrite.audit();
      process.stdout.write(JSON.stringify(r) + '\n');
      process.exit(r.ok ? 0 : 1);
    } catch (err) { handleErr(err); }
    return;
  }
  if (sub === 'invalidate') {
    const schema = {
      positional: [],
      options: {
        lesson: { type: 'string', required: true },
        reason: { type: 'string', required: true }
      },
      shortAliases: {}
    };
    let parsed;
    try { parsed = args.parse(argv.slice(2), schema); }
    catch (err) { handleErr(err); return; }
    try {
      const r = ledgerWrite.invalidate(parsed.options.lesson, parsed.options.reason);
      process.stdout.write(JSON.stringify({ ok: true, invalidated: parsed.options.lesson, marker_id: r.id }) + '\n');
      process.exit(0);
    } catch (err) { handleErr(err); }
    return;
  }
  if (sub === 'retroactive') {
    const schema = {
      positional: [],
      options: {
        contract: { type: 'string', required: true },
        criterion: { type: 'string', required: true },
        'gap-note': { type: 'string', required: true }
      },
      shortAliases: {}
    };
    let parsed;
    try { parsed = args.parse(argv.slice(2), schema); }
    catch (err) { handleErr(err); return; }
    try {
      const contractObj = contractLib.loadAndValidate(parsed.options.contract).frontmatter;
      const patterns = [];
      const intent = contractObj.source_intent || '';
      intent.split(/[^A-Za-z0-9]+/).filter(Boolean).forEach(t => patterns.push(t));
      const r = ledgerWrite.retroactive({
        contract: contractObj,
        confirmed_gap_note: parsed.options['gap-note'],
        criterion_id: parsed.options.criterion,
        source_intent: intent,
        patterns
      });
      process.stdout.write(JSON.stringify({ ok: true, lesson: r }) + '\n');
      process.exit(0);
    } catch (err) { handleErr(err); }
    return;
  }
  const name = sub ? 'ledger ' + sub : 'ledger';
  writeError(CODES.E_NOT_IMPLEMENTED, name + ' not implemented', { stage: 3, subcommand: name });
  process.exit(1);
}

function metricsHandler(argv) {
  const schema = {
    positional: [],
    options: {
      'trace-path': { type: 'string', default: 'anvil/trace.jsonl' },
      'seeded-path': { type: 'string' }
    },
    shortAliases: {}
  };
  let parsed;
  try { parsed = args.parse(argv.slice(1), schema); }
  catch (err) { handleErr(err); return; }
  try {
    const m = metricsLib.compute({ tracePath: parsed.options['trace-path'], seededPath: parsed.options['seeded-path'] });
    const issues = metricsLib.assertHealthy(m);
    process.stdout.write(JSON.stringify({ ok: issues.length === 0, metrics: m, issues }) + '\n');
    process.exit(issues.length === 0 ? 0 : 1);
  } catch (err) { handleErr(err); }
}

function auditHandler(argv) {
  try {
    const r = ledgerWrite.audit();
    process.stdout.write(JSON.stringify(r) + '\n');
    process.exit(r.ok ? 0 : 1);
  } catch (err) { handleErr(err); }
}

function shipHandler(argv) {
  const statePath = path.join(process.cwd(), 'anvil', 'state.json');
  let state = null;
  if (fs.existsSync(statePath)) {
    try { state = JSON.parse(io.readFileUtf8(statePath)); } catch (_) { state = null; }
  }
  if (!state) {
    writeError(CODES.E_STATE, 'no anvil/state.json; run /start first', { statePath });
    process.exit(1);
    return;
  }
  const allPassed = state.tasks && Object.keys(state.tasks).every(id => state.tasks[id].status === 'passed');
  if (!allPassed) {
    writeError(CODES.E_VERIFY, 'cannot ship: not all tasks passed', { tasks: state.tasks });
    process.exit(1);
    return;
  }
  process.stdout.write(JSON.stringify({ ok: true, instruction: 'open PR via gh pr create; user reviews and merges' }) + '\n');
  process.exit(0);
}

function readStdinAnd(callback) {
  let data = '';
  let settled = false;
  const done = function () {
    if (settled) return;
    settled = true;
    callback(data);
  };
  if (process.stdin.isTTY) { done(); return; }
  try { process.stdin.setEncoding('utf8'); } catch (_) {}
  process.stdin.on('data', function (c) { data += c; });
  process.stdin.on('end', done);
  process.stdin.on('error', done);
  setTimeout(done, 500);
}

function hookHandler(argv) {
  const sub = argv[1];
  if (!sub) { process.exit(0); return; }
  const anvilDir = path.join(process.cwd(), 'anvil');
  if (fs.existsSync(anvilDir)) {
    const tracePath = path.join(anvilDir, 'trace.jsonl');
    try {
      hooksLib.emitHookEvent({ tracePath, hookName: sub, outcome: 'start' });
    } catch (_) {}
  }
  if (sub === 'user-prompt-submit') {
    readStdinAnd(function (payload) {
      try {
        const data = payload ? JSON.parse(payload) : {};
        const prompt = (data.prompt || data.user_prompt || data.message || '').toString();
        const statePath = path.join(anvilDir, 'state.json');
        let state = null;
        if (fs.existsSync(statePath)) {
          try { state = JSON.parse(fs.readFileSync(statePath, 'utf8')); } catch (_) { state = null; }
        }
        const suggestion = hooksLib.maybeSuggestStart(prompt, state);
        if (suggestion) {
          const out = {
            hookSpecificOutput: {
              hookEventName: 'UserPromptSubmit',
              additionalContext: suggestion.context
            }
          };
          process.stdout.write(JSON.stringify(out) + '\n');
        }
      } catch (_) { /* never fail the hook on parse errors */ }
      process.exit(0);
    });
    return;
  }
  if (sub === 'pre-tool-use') {
    readStdinAnd(function (payload) {
      try {
        const data = payload ? JSON.parse(payload) : {};
        const toolName = data.tool_name || data.toolName || null;
        const toolInput = data.tool_input || data.toolInput || {};
        const statePath = path.join(anvilDir, 'state.json');
        let state = null;
        if (fs.existsSync(statePath)) {
          try { state = JSON.parse(fs.readFileSync(statePath, 'utf8')); } catch (_) { state = null; }
        }
        const blocked = hooksLib.shouldBlock(toolInput, state, { toolName });
        if (blocked) {
          const out = {
            hookSpecificOutput: {
              hookEventName: 'PreToolUse',
              permissionDecision: 'deny',
              permissionDecisionReason: blocked.message || ('Anvil policy blocked this tool use: ' + blocked.reason)
            }
          };
          process.stdout.write(JSON.stringify(out) + '\n');
          process.stderr.write(JSON.stringify({ error: 'Anvil hook blocked ' + toolName, code: 'E_HOOK_BLOCKED', details: blocked }) + '\n');
          process.exit(2);
          return;
        }
      } catch (_) { /* fail open on parse errors */ }
      process.exit(0);
    });
    return;
  }
  process.exit(0);
}

function escalationHandler(argv) {
  const sub = argv[1];
  const statePath = path.join(process.cwd(), 'anvil', 'state.json');
  if (sub === 'list') {
    try {
      const list = escalationLib.listEscalated(statePath);
      process.stdout.write(JSON.stringify(list) + '\n');
      process.exit(0);
    } catch (err) { handleErr(err); }
    return;
  }
  if (sub === 'describe') {
    const schema = { positional: [], options: { task: { type: 'string', required: true } }, shortAliases: {} };
    let parsed;
    try { parsed = args.parse(argv.slice(2), schema); }
    catch (err) { handleErr(err); return; }
    try {
      const r = escalationLib.describeEscalated(statePath, parsed.options.task);
      process.stdout.write(JSON.stringify(r) + '\n');
      process.exit(0);
    } catch (err) { handleErr(err); }
    return;
  }
  writeError(CODES.E_UNKNOWN_SUBCOMMAND, 'unknown escalation sub: ' + sub, { received: sub });
  process.exit(1);
}

function cassetteHandler(argv) {
  const sub = argv[1];
  if (sub !== 'record') {
    writeError(CODES.E_UNKNOWN_SUBCOMMAND, 'cassette only supports `record`', { received: sub });
    process.exit(1);
    return;
  }
  const schema = {
    positional: [],
    options: {
      scenario: { type: 'string', required: true },
      out: { type: 'string', required: true }
    },
    shortAliases: {}
  };
  let parsed;
  try { parsed = args.parse(argv.slice(2), schema); }
  catch (err) { handleErr(err); return; }
  try {
    const briefing = { scenario: parsed.options.scenario };
    const response = { recorded: true, scenario: parsed.options.scenario };
    const r = subagentBridge.recordCassette({ cassettePath: parsed.options.out, scenario: parsed.options.scenario, briefing, response });
    process.stdout.write(JSON.stringify(r) + '\n');
    process.exit(0);
  } catch (err) { handleErr(err); }
}

function migrateHandler(name, loaderValidator) {
  return function (argv) {
    const schema = {
      positional: [],
      options: {
        in: { type: 'string', required: true },
        out: { type: 'string', required: true }
      },
      shortAliases: {}
    };
    let parsed;
    try { parsed = args.parse(argv.slice(1), schema); }
    catch (err) { handleErr(err); return; }
    try {
      const raw = io.readFileUtf8(parsed.options.in);
      const result = loaderValidator(parsed.options.in, raw);
      io.writeFileUtf8(parsed.options.out, raw);
      process.stdout.write(JSON.stringify({ ok: true, migrated: name + ' v1->v1', written: parsed.options.out }) + '\n');
      process.exit(0);
    } catch (err) {
      if (err.code === 'E_INVALID_CONTRACT' || err.code === 'E_INVALID_PLAN' || err.code === 'E_INVALID_YAML') {
        if (err.details && err.details.rule === 'wrong_version') {
          writeError(CODES.E_INVALID_YAML, name + '-migrate: unsupported version', { reason: 'unsupported_version', details: err.details });
          process.exit(1);
          return;
        }
      }
      handleErr(err);
    }
  };
}

function contractMigrateHandler(argv) {
  const schema = {
    positional: [],
    options: {
      in: { type: 'string', required: true },
      out: { type: 'string', required: true },
      'target-version': { type: 'integer', default: 2 }
    },
    shortAliases: {}
  };
  let parsed;
  try { parsed = args.parse(argv.slice(1), schema); }
  catch (err) { handleErr(err); return; }
  const targetVersion = parsed.options['target-version'];
  if (targetVersion !== 1 && targetVersion !== 2) {
    writeError(CODES.E_INVALID_YAML, 'contract-migrate target-version must be 1 or 2', { reason: 'unsupported_version', received: targetVersion });
    process.exit(1);
    return;
  }
  try {
    const raw = io.readFileUtf8(parsed.options.in);
    const parsedContract = contractLib.parse(raw);
    contractLib.validate(parsedContract);
    const frontmatter = parsedContract.frontmatter || parsedContract;
    const fromVersion = frontmatter.anvil_contract_version;
    let output = raw;
    if (fromVersion !== targetVersion) {
      output = raw.replace(/anvil_contract_version:\s*\d+/, 'anvil_contract_version: ' + targetVersion);
    }
    io.writeFileUtf8(parsed.options.out, output);
    process.stdout.write(JSON.stringify({ ok: true, migrated: 'contract v' + fromVersion + '->v' + targetVersion, written: parsed.options.out }) + '\n');
    process.exit(0);
  } catch (err) { handleErr(err); }
}

function planMigrateHandler(argv) {
  return migrateHandler('plan', (filePath, raw) => {
    const parsed = planLib.parse(raw);
    return parsed;
  })(argv);
}

function mergeTaskHandler(argv) {
  const schema = {
    positional: [],
    options: {
      task: { type: 'string', required: true },
      'repo-root': { type: 'string' },
      message: { type: 'string' }
    },
    shortAliases: {}
  };
  let parsed;
  try { parsed = args.parse(argv.slice(1), schema); }
  catch (err) { handleErr(err); return; }
  const repoRoot = parsed.options['repo-root'] || process.cwd();
  try {
    const r = worktree.mergeBack({
      repoRoot,
      taskId: parsed.options.task,
      commitMessage: parsed.options.message
    });
    process.stdout.write(JSON.stringify({ ok: true, merged: r }) + '\n');
    process.exit(0);
  } catch (err) { handleErr(err); }
}

function resetTaskHandler(argv) {
  const schema = {
    positional: [],
    options: {
      task: { type: 'string', required: true },
      'repo-root': { type: 'string' }
    },
    shortAliases: {}
  };
  let parsed;
  try { parsed = args.parse(argv.slice(1), schema); }
  catch (err) { handleErr(err); return; }
  const repoRoot = parsed.options['repo-root'] || process.cwd();
  const branch = 'anvil/task-' + parsed.options.task;
  const worktreePath = path.join(repoRoot, '.anvil-worktrees', 'task-' + parsed.options.task);
  try {
    worktree.forceRemoveStale(repoRoot, worktreePath, branch);
    process.stdout.write(JSON.stringify({ ok: true, reset: { taskId: parsed.options.task, branch, worktreePath } }) + '\n');
    process.exit(0);
  } catch (err) { handleErr(err); }
}

function ledgerMigrateHandler(argv) {
  const schema = {
    positional: [],
    options: {
      in: { type: 'string', required: true },
      out: { type: 'string', required: true }
    },
    shortAliases: {}
  };
  let parsed;
  try { parsed = args.parse(argv.slice(1), schema); }
  catch (err) { handleErr(err); return; }
  try {
    const raw = io.readFileUtf8(parsed.options.in);
    const lines = raw.split(/\r?\n/).filter(Boolean);
    for (const line of lines) {
      const entry = JSON.parse(line);
      ledgerWrite.validateEntry(entry);
    }
    io.writeFileUtf8(parsed.options.out, raw);
    process.stdout.write(JSON.stringify({ ok: true, migrated: 'ledger v1->v1', entries: lines.length, written: parsed.options.out }) + '\n');
    process.exit(0);
  } catch (err) { handleErr(err); }
}

const DISPATCH = {
  contract: contractHandler,
  plan: planHandler,
  run: runHandler,
  verify: verifyHandler,
  judge: judgeHandler,
  ledger: ledgerHandler,
  metrics: metricsHandler,
  audit: auditHandler,
  ship: shipHandler,
  hook: hookHandler,
  escalation: escalationHandler,
  cassette: cassetteHandler,
  'contract-migrate': contractMigrateHandler,
  'plan-migrate': planMigrateHandler,
  'ledger-migrate': ledgerMigrateHandler,
  'merge-task': mergeTaskHandler,
  'reset-task': resetTaskHandler
};

function main(argv) {
  if (argv.length === 0) {
    writeError(CODES.E_UNKNOWN_SUBCOMMAND, 'no subcommand provided', { received: null });
    process.exit(1);
    return;
  }
  const first = argv[0];
  if (first === '--help' || first === '-h') {
    process.stdout.write(HELP_TEXT);
    process.exit(0);
    return;
  }
  if (first === '--version' || first === '-v') {
    process.stdout.write(PKG.version + '\n');
    process.exit(0);
    return;
  }
  const handler = DISPATCH[first];
  if (!handler) {
    writeError(CODES.E_UNKNOWN_SUBCOMMAND, 'unknown subcommand: ' + first, { received: first });
    process.exit(1);
    return;
  }
  handler(argv);
}

if (require.main === module) {
  main(process.argv.slice(2));
}

module.exports = { main, DISPATCH };
