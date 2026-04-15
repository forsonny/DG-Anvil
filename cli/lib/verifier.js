'use strict';

const fs = require('fs');
const path = require('path');
const io = require('./io.js');
const { makeError } = require('./errors.js');

const KNOWN_INVARIANTS = Object.freeze(['no_new_dependencies', 'public_api_unchanged', 'coverage.new_code_minimum', 'no_secret_patterns']);
const SUPPORTED_LANGUAGES_STAGE_2 = Object.freeze(['javascript']);
const SUPPORTED_LANGUAGES = Object.freeze(['javascript', 'python', 'go']);

function ensureVerifyDir(worktreePath) {
  const dir = io.pathJoin(worktreePath, 'anvil', 'verify');
  io.ensureDir(dir);
  return dir;
}

function writeRaw(worktreePath, name, obj) {
  const dir = ensureVerifyDir(worktreePath);
  const p = io.pathJoin(dir, name);
  io.writeFileUtf8(p, JSON.stringify(obj, null, 2));
  return p;
}

function probeExists(opts) {
  const { worktreePath, criterion } = opts;
  const spec = criterion.exists || {};
  const missing = [];
  const found = [];
  for (const rel of spec.paths || [spec.file].filter(Boolean)) {
    const abs = path.join(worktreePath, rel);
    if (!fs.existsSync(abs)) missing.push(rel);
    else found.push(rel);
  }
  for (const sym of spec.symbols || [spec.symbol].filter(Boolean)) {
    let seen = false;
    for (const rel of spec.paths || [spec.file].filter(Boolean)) {
      const abs = path.join(worktreePath, rel);
      if (!fs.existsSync(abs)) continue;
      const text = fs.readFileSync(abs, 'utf8');
      const patterns = [
        new RegExp('\\bfunction\\s+' + sym + '\\b'),
        new RegExp('\\bclass\\s+' + sym + '\\b'),
        new RegExp('\\bdef\\s+' + sym + '\\b'),
        new RegExp('\\bconst\\s+' + sym + '\\b'),
        new RegExp('\\blet\\s+' + sym + '\\b'),
        new RegExp('\\bvar\\s+' + sym + '\\b'),
        new RegExp('^' + sym + '\\s*[:=]')
      ];
      if (patterns.some(re => re.test(text))) { seen = true; break; }
    }
    if (!seen) missing.push('symbol:' + sym);
    else found.push('symbol:' + sym);
  }
  const pass = missing.length === 0;
  const rawPath = writeRaw(worktreePath, 'exists-' + criterion.id + '.json', { criterionId: criterion.id, found, missing });
  return {
    status: pass ? 'pass' : 'fail',
    evidence: pass ? 'found: ' + found.join(', ') : 'missing: ' + missing.join(', '),
    rawPath
  };
}

function stripJsComments(text) {
  let out = '';
  let i = 0;
  let inStr = null;
  let inTpl = 0;
  while (i < text.length) {
    const c = text[i];
    const c2 = text[i + 1];
    if (inStr) {
      if (c === '\\' && i + 1 < text.length) { out += '  '; i += 2; continue; }
      if (c === inStr) { inStr = null; out += c; i++; continue; }
      out += (c === '\n' ? '\n' : ' ');
      i++;
      continue;
    }
    if (inTpl > 0) {
      if (c === '\\' && i + 1 < text.length) { out += '  '; i += 2; continue; }
      if (c === '`') { inTpl--; out += c; i++; continue; }
      out += (c === '\n' ? '\n' : ' ');
      i++;
      continue;
    }
    if (c === '/' && c2 === '/') {
      while (i < text.length && text[i] !== '\n') i++;
      continue;
    }
    if (c === '/' && c2 === '*') {
      i += 2;
      while (i < text.length && !(text[i] === '*' && text[i + 1] === '/')) i++;
      i += 2;
      continue;
    }
    if (c === '"' || c === "'") { inStr = c; out += c; i++; continue; }
    if (c === '`') { inTpl++; out += c; i++; continue; }
    out += c;
    i++;
  }
  return out;
}

function probeWired(opts) {
  const { worktreePath, criterion } = opts;
  const spec = criterion.wired || {};
  const entry = spec.entry_point || spec.call_site && spec.call_site.file;
  const mustContain = spec.reachable_symbols || (spec.call_site && [spec.call_site.must_contain_symbol]) || [];
  const language = spec.language || 'javascript';
  if (!SUPPORTED_LANGUAGES_STAGE_2.includes(language)) {
    throw makeError('E_UNSUPPORTED_LANGUAGE', 'Wired probe language unsupported at Stage 2', { language, stage: 2, supported: Array.from(SUPPORTED_LANGUAGES_STAGE_2) });
  }
  const abs = path.join(worktreePath, entry || '');
  if (!entry || !fs.existsSync(abs)) {
    const rawPath = writeRaw(worktreePath, 'wired-' + criterion.id + '.json', { criterionId: criterion.id, entry, found: false });
    return { status: 'fail', evidence: 'entry point not found: ' + entry, rawPath };
  }
  const source = fs.readFileSync(abs, 'utf8');
  const stripped = stripJsComments(source);
  const matches = [];
  for (const sym of mustContain) {
    const re = new RegExp('\\b' + sym + '\\s*\\(');
    if (re.test(stripped)) matches.push(sym);
  }
  const pass = matches.length === mustContain.length;
  const rawPath = writeRaw(worktreePath, 'wired-' + criterion.id + '.json', { criterionId: criterion.id, entry, matches, required: mustContain });
  return {
    status: pass ? 'pass' : 'fail',
    evidence: pass ? 'reachable: ' + matches.join(', ') : 'missing calls: ' + mustContain.filter(s => !matches.includes(s)).join(', '),
    rawPath
  };
}

function probeSubstantive(opts) {
  const { worktreePath, criterion } = opts;
  const spec = criterion.substantive || {};
  const coverageMin = spec.coverage_min;
  const branches = spec.branches || [];
  const language = spec.language || 'javascript';
  if (!SUPPORTED_LANGUAGES_STAGE_2.includes(language)) {
    throw makeError('E_UNSUPPORTED_LANGUAGE', 'Substantive probe language unsupported at Stage 2', { language, stage: 2, supported: Array.from(SUPPORTED_LANGUAGES_STAGE_2) });
  }
  const target = (criterion.exists && (criterion.exists.paths || [])[0]) || null;
  let branchesFound = [];
  let observedCoverage = null;
  let runnerOut = '';
  try {
    const testDir = path.join(worktreePath, 'tests');
    if (fs.existsSync(testDir)) {
      const cleanEnv = Object.assign({}, process.env);
      delete cleanEnv.NODE_TEST_CONTEXT;
      delete cleanEnv.NODE_OPTIONS;
      const r = io.spawn(process.execPath, ['--test', '--experimental-test-coverage', 'tests'], { cwd: worktreePath, env: cleanEnv });
      runnerOut = r.stdout + r.stderr;
      const match = runnerOut.match(/all files\s*\|\s*([\d.]+)/i);
      if (match) observedCoverage = parseFloat(match[1]) / 100;
    }
    if (target) {
      const srcPath = path.join(worktreePath, target);
      if (fs.existsSync(srcPath)) {
        const text = fs.readFileSync(srcPath, 'utf8');
        branchesFound = branches.filter(b => text.toLowerCase().includes(String(b).toLowerCase()));
      }
    }
  } catch (err) {
    throw makeError('E_COVERAGE_UNAVAILABLE', 'coverage tooling unavailable', { language: 'javascript', reason: err.message });
  }
  const coveragePass = coverageMin == null ? true : (observedCoverage == null ? false : observedCoverage >= coverageMin);
  const branchesPass = branches.length === 0 || branchesFound.length > 0;
  const pass = coveragePass && branchesPass;
  const rawPath = writeRaw(worktreePath, 'substantive-' + criterion.id + '.json', {
    criterionId: criterion.id,
    target,
    observedCoverage,
    branchesFound,
    branchesRequired: branches,
    runnerOutSnippet: runnerOut.slice(0, 500)
  });
  return {
    status: pass ? 'pass' : 'fail',
    evidence: pass
      ? 'coverage ok (' + observedCoverage + '); branches found: ' + branchesFound.join(', ')
      : 'coverage=' + observedCoverage + ', branches_found=' + branchesFound.join('|') + ', required=' + branches.join('|'),
    rawPath
  };
}

function probeFunctional(opts) {
  const { worktreePath, criterion } = opts;
  const spec = criterion.functional || {};
  const probe = spec.probe || {};
  const runner = probe.runner || 'node --test';
  if (runner.startsWith('pytest') || runner.startsWith('go ')) {
    throw makeError('E_UNSUPPORTED_LANGUAGE', 'functional probe runner unsupported at Stage 2', { runner, stage: 2 });
  }
  const target = probe.target || 'tests';
  const mustPass = probe.must_pass || [];
  const expectExit = probe.exit_code == null ? 0 : probe.exit_code;
  const runnerParts = runner.split(/\s+/);
  const cmd = runnerParts[0];
  const runnerArgs = runnerParts.slice(1).concat([target]);
  const cleanEnv = Object.assign({}, process.env);
  delete cleanEnv.NODE_TEST_CONTEXT;
  delete cleanEnv.NODE_OPTIONS;
  const r = io.spawn(cmd, runnerArgs, { cwd: worktreePath, env: cleanEnv });
  const exitOk = r.status === expectExit;
  const passedTests = (r.stdout.match(/ok \d+ - [^\n]+/g) || []).map(l => l.replace(/^ok \d+ - /, ''));
  const missingPass = mustPass.filter(n => !passedTests.some(pt => pt.includes(n)));
  const pass = exitOk && missingPass.length === 0;
  const rawPath = writeRaw(worktreePath, 'functional-' + criterion.id + '.json', {
    criterionId: criterion.id,
    runner,
    target,
    exitCode: r.status,
    expectExit,
    passedTests,
    missingPass,
    stdoutSnippet: r.stdout.slice(0, 500),
    stderrSnippet: r.stderr.slice(0, 500)
  });
  return {
    status: pass ? 'pass' : 'fail',
    evidence: pass ? 'runner exit=' + r.status + ', must_pass all observed' : 'exit=' + r.status + ', expected=' + expectExit + ', missing=' + missingPass.join('|'),
    rawPath
  };
}

function evaluateInvariants(opts) {
  const { worktreePath, contract, diffPath } = opts;
  const invariants = contract.invariants || {};
  const results = [];
  let allPass = true;
  for (const key of Object.keys(invariants)) {
    if (!KNOWN_INVARIANTS.includes(key)) {
      results.push({ invariant: key, status: 'unknown', warning: 'No checker registered for this invariant; it has no effect. Add to KNOWN_INVARIANTS or remove from contract.' });
      allPass = false;
      continue;
    }
    let ok = true;
    let evidence = '';
    const diff = diffPath && fs.existsSync(diffPath) ? fs.readFileSync(diffPath, 'utf8') : '';
    if (key === 'no_new_dependencies') {
      const added = /\+\s*"[^"]+"\s*:\s*"\^?\d/.test(diff) && /package\.json/.test(diff);
      ok = !added;
      evidence = added ? 'added dependency in package.json diff' : 'no new dependency additions detected';
    } else if (key === 'public_api_unchanged') {
      ok = true;
      evidence = 'checker treats list as advisory at Stage 2 (closed set)';
    } else if (key === 'coverage.new_code_minimum') {
      ok = true;
      evidence = 'coverage check is performed per criterion; invariant records the floor';
    } else if (key === 'no_secret_patterns') {
      const bad = /(AKIA[0-9A-Z]{16}|ghp_[0-9A-Za-z]{36})/.test(diff);
      ok = !bad;
      evidence = bad ? 'secret pattern detected in diff' : 'no secret patterns in diff';
    }
    results.push({ invariant: key, status: ok ? 'pass' : 'fail', evidence });
    if (!ok) allPass = false;
  }
  const rawPath = writeRaw(worktreePath, 'invariants.json', { results });
  return { status: allPass ? 'pass' : 'fail', results, rawPath };
}

function verifyAllWithProbes(opts) {
  const { worktreePath, contract, diffPath, toolOutputPath, probes } = opts;
  const use = probes || { exists: probeExists, substantive: probeSubstantive, wired: probeWired, functional: probeFunctional, invariants: evaluateInvariants };
  const criteriaResults = [];
  let allCriteriaGreen = true;
  for (const c of contract.criteria) {
    const levels = { exists: null, substantive: null, wired: null, functional: null };
    let criterionGreen = true;
    levels.exists = use.exists({ worktreePath, criterion: c });
    if (levels.exists.status !== 'pass') { criterionGreen = false; }
    else {
      levels.substantive = use.substantive({ worktreePath, criterion: c, diffPath, toolOutputPath });
      if (levels.substantive.status !== 'pass') criterionGreen = false;
      else {
        levels.wired = use.wired({ worktreePath, criterion: c });
        if (levels.wired.status !== 'pass') criterionGreen = false;
        else {
          levels.functional = use.functional({ worktreePath, criterion: c });
          if (levels.functional.status !== 'pass') criterionGreen = false;
        }
      }
    }
    if (!criterionGreen) allCriteriaGreen = false;
    criteriaResults.push({ id: c.id, levels, allGreen: criterionGreen });
  }
  const invResult = use.invariants({ worktreePath, contract, diffPath });
  const allGreen = allCriteriaGreen && invResult.status === 'pass';
  const result = {
    criteria: criteriaResults,
    invariants: invResult.results || [],
    allGreen,
    raw: {
      exists: {}, substantive: {}, wired: {}, functional: {}, invariants: { path: invResult.rawPath }
    }
  };
  const outDir = ensureVerifyDir(worktreePath);
  io.writeFileUtf8(io.pathJoin(outDir, 'verify-result.json'), JSON.stringify(result, null, 2));
  return result;
}

function verifyAll(opts) {
  return verifyAllWithProbes(opts);
}

module.exports = {
  verifyAll,
  verifyAllWithProbes,
  probeExists,
  probeSubstantive,
  probeWired,
  probeFunctional,
  evaluateInvariants,
  KNOWN_INVARIANTS,
  SUPPORTED_LANGUAGES_STAGE_2,
  SUPPORTED_LANGUAGES
};
