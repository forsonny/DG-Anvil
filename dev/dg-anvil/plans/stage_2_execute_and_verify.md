# Stage 2 Plan - Execute and Verify

## Frontmatter

```yaml
stage: 2
stage_name: Execute and Verify
prerequisites:
  architecture_doc: reports/DG-Anvil/00_Architecture.md
  anvil_design_sections:
    - reports/Anvil-Design/03_The_Core_Loop.md
    - reports/Anvil-Design/05_The_Contract.md
    - reports/Anvil-Design/11_Implementation_Plan.md
    - reports/Anvil-Design/04_Anatomy.md
    - reports/Anvil-Design/02_Design_Thesis.md
    - reports/Anvil-Design/10_Anti-Patterns_Defeated.md
  prior_stage_plan: reports/DG-Anvil/plans/stage_1_contract_and_plan.md
produces:
  - cli/lib/executor.js
  - cli/lib/verifier.js
  - cli/lib/worktree.js
  - skills/executing/SKILL.md
  - skills/verifying/SKILL.md
  - commands/continue.md
  - tests/unit/executor.test.js
  - tests/unit/verifier.test.js
  - tests/unit/worktree.test.js
  - tests/pressure/executing.pressure.js
  - tests/pressure/verifying.pressure.js
  - tests/loop/fixture-repo-node/
  - cli/anvil.js
```

## Scope

### In scope

- `cli/lib/executor.js` dispatches a fresh subagent per task inside a per-task git worktree; inlines the task text and the contract into the dispatch briefing; captures diff and tool output into worktree-relative paths; returns a structured result; never carries state across dispatches.
- `cli/lib/verifier.js` runs the four-level probe (Exists, Substantive, Wired, Functional) per criterion; captures raw output; returns structured pass/fail per level; Substantive probe is behavioural; Wired probe walks the call graph from the contract's named entry point.
- `cli/lib/worktree.js` manages `git worktree add` and `git worktree remove` per task; cleanup on task completion; orphan-worktree alarm on failure.
- `skills/executing/SKILL.md` finalized with the six canonical sections; Process step names one worktree per task, fresh subagent, orchestrator does not read implementer narration.
- `skills/verifying/SKILL.md` finalized with the six canonical sections; Process step runs four levels in order; any failure short-circuits and returns fail.
- `commands/continue.md` finalized; reads `anvil/state.json` and resumes execution at the next incomplete task.
- `tests/unit/executor.test.js` exercises the dispatch path against a stub subagent dispatcher; asserts state is not carried across dispatches; asserts worktree creation and cleanup.
- `tests/unit/verifier.test.js` exercises each of the four levels with fixture contracts and fixture source files; asserts pass and fail on each level.
- `tests/unit/worktree.test.js` exercises worktree add and remove; asserts cleanup on success; asserts alarm structure on failure.
- `tests/pressure/executing.pressure.js` paired pressure test citing failure-taxonomy row 1 (Context pollution) and row 16 (Context-window collapse).
- `tests/pressure/verifying.pressure.js` paired pressure test citing failure-taxonomy row 8 (Claim-without-evidence) and row 13 (Semantic empty stub).
- `tests/loop/fixture-repo-node/` the first loop-test fixture; a minimal node.js repository with a hand-authored `anvil/contract.yml` and `anvil/plan.yml` for a trivial test task that runs through Execute + Verify to Verify-pass.
- `cli/anvil.js` wired subcommands `anvil run` and `anvil verify`.

### Out of scope

- Court dispatch or verdict parsing (Stage 3).
- Ledger write path (Stage 3).
- `resetting` skill (Stage 3).
- Observability hooks (Stage 4).
- Metrics (Stage 4).
- Ship (Stage 4).

## Prerequisites Verification

No work begins until every check below exits 0. Any failure stops the stage without writing a file.

1. `test -f dg-anvil/cli/lib/contract.js` - exit 0 (Stage 1 Task 1.7 contract parser exists).
2. `node -e "const c=require('./dg-anvil/cli/lib/contract.js'); if(typeof c.parse!=='function'||typeof c.validate!=='function'||typeof c.loadAndValidate!=='function'){process.exit(1)}"` - exit 0 (contract parser exports `parse`, `validate`, `loadAndValidate`).
3. `test -f dg-anvil/cli/lib/plan.js` - exit 0 (Stage 1 Task 1.8 plan parser exists).
4. `node -e "const p=require('./dg-anvil/cli/lib/plan.js'); if(typeof p.parse!=='function'||typeof p.validate!=='function'||typeof p.topologicalWaves!=='function'||typeof p.loadAndValidate!=='function'){process.exit(1)}"` - exit 0 (plan parser exports `parse`, `validate`, `topologicalWaves`, `loadAndValidate`).
5. `test -f dg-anvil/cli/lib/ledger.js` - exit 0 (Stage 1 Task 1.9 ledger read path exists).
6. `node -e "const l=require('./dg-anvil/cli/lib/ledger.js'); if(typeof l.load!=='function'||typeof l.query!=='function'||typeof l.append!=='function'){process.exit(1)}"` - exit 0 (ledger read path present; `append` throws `E_NOT_IMPLEMENTED` until Stage 3).
7. `test -f dg-anvil/cli/contract-schema.json` - exit 0 (Stage 1 Task 1.4 finalized contract schema exists).
8. `jq -e '.properties.anvil_contract_version.const == 1 and (.properties.criteria.items.required | length) == 6' dg-anvil/cli/contract-schema.json` - exit 0 (contract schema finalized with the six required criterion fields including the four verification-level slots).
9. `test -f dg-anvil/cli/plan-schema.json` - exit 0 (Stage 1 Task 1.5 finalized plan schema exists).
10. `jq -e '.properties.anvil_plan_version.const == 1 and (.properties.tasks.items.required | index("criterion_ids")) and .properties.tasks.items.properties.criterion_ids.minItems == 1' dg-anvil/cli/plan-schema.json` - exit 0 (plan schema finalized with `criterion_ids` required non-empty per task).
11. `test -f dg-anvil/cli/lib/yaml.js` - exit 0 (Stage 1 Task 1.1 YAML parser finalized).
12. `node -e "const y=require('./dg-anvil/cli/lib/yaml.js'); const r=y.parse('a: 1\\n'); if(r.a!==1){process.exit(1)}"` - exit 0 (YAML parser handles block mapping).
13. `test -f dg-anvil/cli/lib/args.js` - exit 0 (Stage 1 Task 1.3 argument parser finalized).
14. `node -e "const a=require('./dg-anvil/cli/lib/args.js'); const r=a.parse(['--flag=x'], {positional:[], options:{flag:{type:'string'}}, shortAliases:{}}); if(r.options.flag!=='x'){process.exit(1)}"` - exit 0 (args parser handles long options).
15. `test -f dg-anvil/cli/lib/errors.js` - exit 0 (Stage 0/1 error module exists).
16. `node -e "const e=require('./dg-anvil/cli/lib/errors.js'); for(const k of ['E_NOT_IMPLEMENTED','E_UNKNOWN_SUBCOMMAND','E_UNKNOWN_FLAG','E_MISSING_ARG','E_INVALID_JSON','E_INVALID_YAML','E_IO','E_INVALID_CONTRACT','E_INVALID_PLAN']){if(e.CODES[k]!==k){process.exit(1)}}"` - exit 0 (Stage 1 codes `E_INVALID_CONTRACT` and `E_INVALID_PLAN` present; Stage 0 codes still present).
17. `test -f dg-anvil/cli/lib/io.js` - exit 0 (Stage 0 I/O helper exists).
18. `node -e "const io=require('./dg-anvil/cli/lib/io.js'); if(typeof io.readFileUtf8!=='function'||typeof io.writeFileUtf8!=='function'||typeof io.spawn!=='function'){process.exit(1)}"` - exit 0 (I/O helper exports the three functions; `spawn` is finalized as part of Stage 2 since Stage 2 is the first stage that actually spawns child processes).
19. `test -f dg-anvil/skills/executing/SKILL.md` - exit 0 (Stage 0 Task 0.15 stub exists).
20. `awk '/^## /{print $0}' dg-anvil/skills/executing/SKILL.md | tr '\n' '|' | grep -qE '^## Overview\|## When to Use\|## Process\|## Rationalizations\|## Red Flags\|## Verification\|$'` - exit 0 (executing stub has six canonical headers).
21. `test -f dg-anvil/skills/verifying/SKILL.md` - exit 0 (Stage 0 Task 0.15 stub exists).
22. `awk '/^## /{print $0}' dg-anvil/skills/verifying/SKILL.md | tr '\n' '|' | grep -qE '^## Overview\|## When to Use\|## Process\|## Rationalizations\|## Red Flags\|## Verification\|$'` - exit 0 (verifying stub has six canonical headers).
23. `test -f dg-anvil/commands/start.md` - exit 0 (Stage 1 Task 1.17 start command exists; Stage 2 does not modify it).
24. `test -f dg-anvil/commands/continue.md` - exit 0 (Stage 1 Task 1.18 continue skeleton exists; Stage 2 finalizes it).
25. `grep -qE 'E_NOT_IMPLEMENTED' dg-anvil/commands/continue.md` - exit 0 (Stage 1 skeleton returns `E_NOT_IMPLEMENTED` for task-level continuation).
26. `test -f dg-anvil/tests/pressure/harness.js` - exit 0 (Stage 0 Task 0.16 pressure harness exists).
27. `node -e "const h=require('./dg-anvil/tests/pressure/harness.js'); if(typeof h.runPressure!=='function'){process.exit(1)}"` - exit 0 (`runPressure` exported).
28. `node --test dg-anvil/tests/pressure/contracting.pressure.js` - exit 0 (Stage 1 Task 1.11 pressure test still passes).
29. `node --test dg-anvil/tests/pressure/planning.pressure.js` - exit 0 (Stage 1 Task 1.15 pressure test still passes).
30. `node --test dg-anvil/tests/unit/contract.test.js dg-anvil/tests/unit/plan.test.js dg-anvil/tests/unit/ledger.test.js dg-anvil/tests/unit/yaml.test.js` - exit 0 (Stage 1 unit tests still pass).
31. `command -v git >/dev/null` - exit 0 (git is on PATH; worktree creation depends on `git worktree add`).
32. `node dg-anvil/cli/anvil.js contract --validate dg-anvil/docs/contract-examples/good/rate-limit-001.yml` - exit 0 (Stage 1 wired CLI subcommand still behaves).
33. `node dg-anvil/cli/anvil.js plan --validate dg-anvil/docs/plan-examples/good/rate-limit-001.yml --contract dg-anvil/docs/contract-examples/good/rate-limit-001.yml` - exit 0 (Stage 1 wired plan validation still behaves).

If any check fails, stop without writing any file.

## Phased Tasks

### Task 2.1: Finalize the I/O helper spawn path

#### Goal

Replace the Stage 0 `cli/lib/io.js` `spawn` skeleton with a working `child_process.spawnSync` wrapper that captures stdout, stderr, exit code, and elapsed milliseconds; passes arguments as an array; never shell-interpolates user input.

#### Inputs

- `reports/DG-Anvil/00_Architecture.md` Section 3 (Subprocess invocation; Error format).
- `reports/DG-Anvil/plans/stage_0_bootstrap.md` Task 0.5 (io skeleton contract).
- `dg-anvil/cli/lib/io.js` (Stage 0 skeleton).
- `dg-anvil/cli/lib/errors.js`.

#### Outputs

- `dg-anvil/cli/lib/io.js`
  - Keeps Stage 0 exports `readFileUtf8`, `writeFileUtf8`, `shellInterpolationForbidden`.
  - Finalizes `spawn(cmd, argsArray, options)` to call `child_process.spawnSync(cmd, argsArray, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024, ...options })` and return `{ stdout: string, stderr: string, status: number | null, signal: string | null, error: Error | null, durationMs: integer }`.
  - `spawn` rejects a non-array `argsArray` with a structured error shaped `{error, code: 'E_IO', details: { reason: 'args_not_array' }}`.
  - `spawn` rejects `cmd` containing any shell metacharacter (`;`, `&`, `|`, `` ` ``, `$`, newline) with `code = 'E_IO'` and `details = { reason: 'shell_metacharacter_in_cmd' }`.
  - Adds `ensureDir(dirPath)` that creates a directory recursively via `fs.mkdirSync(dirPath, { recursive: true })`.
  - Adds `pathJoin(...parts)` that delegates to `path.join` but rejects any `..` segment with `code = 'E_IO'` and `details = { reason: 'dotdot_forbidden' }` (defence-in-depth against worktree path escape in Task 2.3).
  - Imports only from `fs`, `path`, `child_process`, and `cli/lib/errors.js`.

#### Decisions already made

- `cli/lib/io.js` wraps `child_process.spawnSync` with structured stdout, stderr, exit-code capture. (source: 00_Architecture.md Section 3 Subprocess invocation)
- Never shell-interpolate user input into a command string; always pass arguments as an array. (source: 00_Architecture.md Section 3 Subprocess invocation)
- Tool output is captured as-is; the orchestrator does not parse tool output with regex for control flow. (source: 00_Architecture.md Section 3 Subprocess invocation)
- Allowed Node builtins include `fs`, `path`, `child_process`. (source: 00_Architecture.md Section 3 Runtime)
- `shellInterpolationForbidden` is a structural marker read by linters. (source: stage_0_bootstrap.md Task 0.5)
- Error code for I/O failures is `E_IO`. (source: 00_Architecture.md Section 3 Error format initial codes)

#### Tests or fixtures

- `dg-anvil/tests/unit/worktree.test.js` (Task 2.4) exercises `spawn` indirectly via `git worktree add`.
- `dg-anvil/tests/unit/executor.test.js` (Task 2.6) exercises `spawn` against a stub child program to confirm stdout/stderr capture.

#### Verification command

```
node -e "const io=require('./dg-anvil/cli/lib/io.js'); const r=io.spawn(process.execPath,['-e','console.log(\"hi\"); console.error(\"err\"); process.exit(0)']); if(r.stdout.trim()!=='hi'||r.stderr.trim()!=='err'||r.status!==0||typeof r.durationMs!=='number'){process.exit(1)}; try{io.spawn('ls',';rm -rf /'); process.exit(1)}catch(err){if(err.code!=='E_IO'){process.exit(1)}}"
```

Expected exit 0.

#### Done when

`cli/lib/io.js` `spawn` invokes a child program with an argument array, returns `{stdout, stderr, status, signal, error, durationMs}`, rejects non-array args, rejects shell metacharacters in `cmd`, and `ensureDir` and `pathJoin` are exported with the stated guards.

### Task 2.2: Author the worktree manager

#### Goal

Ship `cli/lib/worktree.js` with `create(taskId)`, `remove(worktreePath)`, and the orphan-worktree alarm structure. Each call shells out via `cli/lib/io.js` `spawn` with `git worktree add` and `git worktree remove`.

#### Inputs

- `reports/Anvil-Design/03_The_Core_Loop.md` phase 4 (Dispatch) and phase 5 (Execute); "The orchestrator holds: the Contract, the Plan, the per-task state... It does not hold: any implementer's output, any diff, any rationale. Those live in worktrees".
- `reports/Anvil-Design/11_Implementation_Plan.md` Stage 2 ("executing dispatches a fresh subagent per task, inside a per-task git worktree"; "Worktree cleanup on task completion; orphan worktree alarm on failure").
- `reports/DG-Anvil/00_Architecture.md` Section 3 (Subprocess invocation), Section 6 (Invariant 13), Section 8 (Stage 2 out-of-scope).
- `dg-anvil/cli/lib/io.js` (finalized in Task 2.1).
- `dg-anvil/cli/lib/errors.js`.

#### Outputs

- `dg-anvil/cli/lib/worktree.js`
  - Exports `create({ repoRoot, taskId, baseRef })` that:
    - Composes a worktree directory under `repoRoot + '/.anvil-worktrees/task-' + taskId` via `io.pathJoin`.
    - Invokes `io.spawn('git', ['-C', repoRoot, 'worktree', 'add', '-b', 'anvil/task-' + taskId, worktreePath, baseRef])`.
    - On success returns `{ worktreePath: string, branch: string, baseRef: string, createdAt: ISO-8601 }`.
    - On failure throws a structured error with `code = 'E_WORKTREE_CREATE'` and `details = { stderr, status, taskId, worktreePath }`.
  - Exports `remove({ repoRoot, worktreePath })` that:
    - Invokes `io.spawn('git', ['-C', repoRoot, 'worktree', 'remove', '--force', worktreePath])`.
    - On success returns `{ removed: true, worktreePath }`.
    - On failure emits an orphan-worktree alarm (see below) and throws `code = 'E_WORKTREE_REMOVE'` with `details = { stderr, status, worktreePath }`.
  - Exports `alarmOrphan({ worktreePath, reason, details })` that returns a structured alarm object `{ alarm: 'orphan_worktree', worktreePath, reason, details, at: ISO-8601 }`. Stage 2 writes the alarm to stderr as a single-line JSON string prefixed with `ANVIL_ALARM ` so a later stage's `stop` hook can scan for it; the return value is also passed to the escalation surface exposed by Task 2.5.
  - Exports `list({ repoRoot })` that invokes `io.spawn('git', ['-C', repoRoot, 'worktree', 'list', '--porcelain'])` and returns the parsed array of worktree records (each with `path`, `branch`, `HEAD`).
  - Adds error codes `E_WORKTREE_CREATE` and `E_WORKTREE_REMOVE` to `cli/lib/errors.js` in the same edit (Stage 2 appends both to the frozen `CODES` object and re-freezes).
  - No `TODO`, `FIXME`, `XXX`, `HACK`, `TBD`, `WIP`, `NOTE:` markers. (source: 00_Architecture.md Section 6 Invariant 3)
  - Imports only from `cli/lib/io.js`, `cli/lib/errors.js`.

- `dg-anvil/cli/lib/errors.js`
  - Append `E_WORKTREE_CREATE: 'E_WORKTREE_CREATE'`, `E_WORKTREE_REMOVE: 'E_WORKTREE_REMOVE'`, `E_EXECUTOR: 'E_EXECUTOR'`, `E_VERIFY: 'E_VERIFY'`, `E_STATE: 'E_STATE'`, `E_UNKNOWN_DISPATCHER: 'E_UNKNOWN_DISPATCHER'`, `E_UNSUPPORTED_LANGUAGE: 'E_UNSUPPORTED_LANGUAGE'`, `E_COVERAGE_UNAVAILABLE: 'E_COVERAGE_UNAVAILABLE'` to the frozen `CODES` object (the executor, verifier, state, dispatcher, language, and coverage codes are added here so the module's single edit captures every Stage 2 addition).
  - Re-freeze the `CODES` object.
  - The three dispatcher/language/coverage codes are registered per `00_Architecture.md` Section 3 "Error format" ("Later stage codes are additive and must be registered in `cli/lib/errors.js` when introduced"), and are consumed by Task 2.12 (`E_UNKNOWN_DISPATCHER`) and Task 2.6 (`E_UNSUPPORTED_LANGUAGE`, `E_COVERAGE_UNAVAILABLE`).

#### Decisions already made

- One worktree per task; worktree cleanup on task completion; orphan-worktree alarm on failure. (source: 11_Implementation_Plan.md Stage 2)
- The orchestrator does not hold diffs or tool output; those live in worktrees. (source: 03_The_Core_Loop.md Context discipline)
- `git worktree add` and `git worktree remove` are the two git operations this module owns; all invocations go through `cli/lib/io.js` `spawn` with an argument array. (source: 00_Architecture.md Section 3 Subprocess invocation)
- Error codes are stable strings defined in `cli/lib/errors.js`; additions are additive and must be registered when introduced. (source: 00_Architecture.md Section 3 Error format)
- The alarm's structure is fixed so the Stage 4 `stop` hook and the Stage 3 escalation surface can both consume it without re-parsing arbitrary stderr. (source: 00_Architecture.md Section 3 Error format; Section 6 Invariant 1)
- `E_UNKNOWN_DISPATCHER` is registered here because the dispatcher identifier set is fixed at architecture time and Stage 2 is the first stage with a `--dispatcher` flag. (source: 00_Architecture.md Section 3 "Dispatcher identifiers")
- `E_UNSUPPORTED_LANGUAGE` is registered here because the Wired probe's language support schedule is fixed at architecture time and Stage 2 is the first stage to ship a Wired probe. (source: 00_Architecture.md Section 3 "Wired-probe language support")
- `E_COVERAGE_UNAVAILABLE` is registered here because Stage 2 is the first stage to ship the Substantive probe and the coverage tooling rule is fixed at architecture time. (source: 00_Architecture.md Section 3 "Coverage tooling")

#### Tests or fixtures

- `dg-anvil/tests/unit/worktree.test.js` (Task 2.4) creates and removes worktrees in a disposable repo fixture (`fs.mkdtempSync` + `git init`); asserts cleanup on success; asserts alarm structure on forced-failure path.

#### Verification command

```
node -e "const w=require('./dg-anvil/cli/lib/worktree.js'); if(typeof w.create!=='function'||typeof w.remove!=='function'||typeof w.list!=='function'||typeof w.alarmOrphan!=='function'){process.exit(1)}; const a=w.alarmOrphan({worktreePath:'/x',reason:'test',details:{}}); if(a.alarm!=='orphan_worktree'||!a.at){process.exit(1)}"
```

Expected exit 0.

#### Done when

`cli/lib/worktree.js` exports `create`, `remove`, `list`, `alarmOrphan`; every git invocation routes through `cli/lib/io.js` `spawn`; `alarmOrphan` returns a structured object; `cli/lib/errors.js` carries the five new Stage 2 codes.

### Task 2.3: Author the worktree unit test

#### Goal

Ship `tests/unit/worktree.test.js` covering `create`, `remove`, `list`, and the orphan-worktree alarm.

#### Inputs

- `reports/DG-Anvil/00_Architecture.md` Section 7 (Test tiers).
- `dg-anvil/cli/lib/worktree.js` (from Task 2.2).

#### Outputs

- `dg-anvil/tests/unit/worktree.test.js`
  - Uses `node:test` and `node:assert`.
  - `setup()`: creates a disposable git repository via `fs.mkdtempSync` + `io.spawn('git', ['init', tempDir])` + an initial commit so `worktree add` has a base ref.
  - Positive tests:
    - `create({repoRoot, taskId: 'T0', baseRef: 'HEAD'})` returns `{worktreePath, branch, baseRef, createdAt}` with the expected path shape.
    - `list({repoRoot})` returns an array that includes the created worktree.
    - `remove({repoRoot, worktreePath})` returns `{removed: true}`; a subsequent `list` no longer includes the path.
  - Negative tests:
    - `create` with an invalid `baseRef` throws `E_WORKTREE_CREATE` with `details.stderr` populated.
    - `remove` on a path that was manually destroyed (via `fs.rmSync` before `worktree remove`) produces the orphan-worktree alarm and throws `E_WORKTREE_REMOVE`; the test parses `stderr` for the `ANVIL_ALARM ` prefix and asserts `alarm === 'orphan_worktree'`.
  - `teardown()`: removes the temp directory.
  - CommonJS.

#### Decisions already made

- Unit tests are paired one-to-one with `cli/lib/<module>.js`. (source: 00_Architecture.md Section 7 Test tiers)
- Every exported function has at least one positive and one negative test. (source: 00_Architecture.md Section 7 Test tiers)
- Rejection rules have dedicated tests. (source: 00_Architecture.md Section 7 Test tiers)
- Test runner is `node --test`. (source: 00_Architecture.md Section 7 Test runner)

#### Tests or fixtures

- Self-contained; fixtures are created in `fs.mkdtempSync`.

#### Verification command

```
node --test dg-anvil/tests/unit/worktree.test.js
```

Expected exit 0.

#### Done when

`tests/unit/worktree.test.js` runs green against `cli/lib/worktree.js`; every exported function has at least one positive and one negative test; the orphan-worktree alarm is asserted via its structured shape.

### Task 2.4: Author the executor module

#### Goal

Ship `cli/lib/executor.js` that, for one task, creates a worktree, dispatches a fresh subagent with the task text and the contract inlined, captures the diff and the tool output into worktree-relative paths, and returns a structured result. The orchestrator never reads implementer narration; it reads only the captured diff and the captured tool output.

#### Inputs

- `reports/Anvil-Design/03_The_Core_Loop.md` phase 4 (Dispatch), phase 5 (Execute); Context discipline ("It does not hold: any implementer's output, any diff, any rationale").
- `reports/Anvil-Design/05_The_Contract.md` (full canonical contract shape, because the executor inlines the contract text into the subagent briefing).
- `reports/Anvil-Design/11_Implementation_Plan.md` Stage 2 ("executing dispatches a fresh subagent per task, inside a per-task git worktree, with the task text and the contract inlined").
- `reports/Anvil-Design/02_Design_Thesis.md` architectural consequence 2 (Verification must be external).
- `reports/Anvil-Design/10_Anti-Patterns_Defeated.md` row 1 (Context pollution), row 16 (Context-window collapse).
- `reports/DG-Anvil/00_Architecture.md` Section 3 (Subprocess invocation; Error format), Section 6 (Invariants 3, 4, 5, 13).
- `dg-anvil/cli/lib/worktree.js` (from Task 2.2).
- `dg-anvil/cli/lib/contract.js` (from Stage 1).
- `dg-anvil/cli/lib/plan.js` (from Stage 1).
- `dg-anvil/cli/lib/io.js` (from Task 2.1).
- `dg-anvil/cli/lib/errors.js`.

#### Outputs

- `dg-anvil/cli/lib/executor.js`
  - Exports `executeTask({ repoRoot, task, contract, dispatcher })` where:
    - `task` is a parsed plan-task object (shape from `cli/plan-schema.json`).
    - `contract` is the parsed-and-validated contract object from `cli/lib/contract.js`.
    - `dispatcher` is an injected function with signature `dispatch(briefing) -> Promise<{ diff, toolOutput, status }>`. In production runs this is the real subagent dispatcher; in unit tests it is a stub. The executor never inlines a real subagent client path so the unit test can substitute a stub without mocks inside the module.
  - Steps:
    1. Calls `worktree.create({ repoRoot, taskId: task.id, baseRef: task.baseRef ?? 'HEAD' })` and captures `worktreePath`.
    2. Composes `briefing` as a plain object (no cross-dispatch state; no agent history reference; no reference to any prior task's diff or output): `{ task: { id, title, criterion_ids, depends_on, wave }, contract: <full frontmatter-plus-body as captured by cli/lib/contract.js>, worktreePath, criteriaForTask: <filtered to only criteria referenced by task.criterion_ids> }`.
    3. Calls `dispatcher(briefing)` inside a `try` block. On any thrown error, captures the error into `{ status: 'error', error }` and proceeds to cleanup.
    4. Captures the returned `diff` into `<worktreePath>/anvil/diff.patch` via `io.ensureDir` + `io.writeFileUtf8`.
    5. Captures the returned `toolOutput` (an array of `{tool, stdout, stderr, status, tool_input_hash}` records as-is) into `<worktreePath>/anvil/tool-output.jsonl` (one record per line).
    6. Returns `{ taskId, worktreePath, diffPath, toolOutputPath, status: 'ok' | 'error' | 'dispatch_rejected', error?: object, durationMs: integer, briefingHash: sha256-hex }`.
    7. Does not remove the worktree automatically; the orchestrator (`anvil run` in Task 2.9) removes the worktree after `verifier.verifyAll` has read it. On executor-internal error, the executor calls `worktree.alarmOrphan` and still returns the structured result so the caller can decide whether to escalate.
  - Fresh-subagent discipline (Invariant 13): the executor carries no module-level mutable state across calls. Every `executeTask` call re-reads the contract from the caller's arguments; no cache, no handle, no accumulator. Assert this structurally by exporting `MUTABLE_STATE = Object.freeze({})` and by using `Object.freeze(briefing)` before passing to the dispatcher.
  - Error code `E_EXECUTOR` (added in Task 2.2's `cli/lib/errors.js` edit) is thrown for executor-internal failures (for example, if `briefing` cannot be composed because `task.criterion_ids` references an id not in `contract.criteria`).
  - Imports only from `crypto` (for `briefingHash`), `cli/lib/worktree.js`, `cli/lib/io.js`, `cli/lib/errors.js`.
  - No `TODO`, `FIXME`, `XXX`, `HACK`, `TBD`, `WIP`, `NOTE:` markers.
  - No persona phrasing in any string constant.

#### Decisions already made

- The executor inlines the task text and the contract into the dispatch briefing. (source: 11_Implementation_Plan.md Stage 2)
- Fresh subagent per task; orchestrator holds only Contract + Plan + Ledger index; does not hold any implementer's output, diff, or rationale. (source: 03_The_Core_Loop.md Context discipline; 10_Anti-Patterns_Defeated.md row 1)
- Fresh context per dispatch; no orchestrator carries diffs, rationales, or tool output across dispatches. (source: 00_Architecture.md Section 6 Invariant 13)
- Captured tool output is written as-is to worktree-relative paths; orchestrator does not parse tool output for control flow. (source: 00_Architecture.md Section 3 Subprocess invocation)
- Diff and tool output are captured into worktree-relative paths (`<worktreePath>/anvil/diff.patch` and `<worktreePath>/anvil/tool-output.jsonl`). (source: 11_Implementation_Plan.md Stage 2 "Diff + captured tool output in worktree"; 04_Anatomy.md Seven skills table row 3)
- The dispatcher is injected to preserve testability; the module never references a specific subagent client. (source: 00_Architecture.md Section 7 Test tiers; Section 6 Invariant 13)
- `briefingHash` is captured so the Stage 4 `post-tool-use` hook can correlate the trace entry with the executor run. (source: 00_Architecture.md Section 3 Trace event format; the `tool_input_hash` field is the closed-schema target for this value)
- Error code `E_EXECUTOR` is added to `cli/lib/errors.js` as part of Task 2.2's `errors.js` edit. (source: 00_Architecture.md Section 3 Error format "additive"; Invariant 7 does not fire because no schema changed)
- No persona phrasing in any prompt constant. (source: 00_Architecture.md Section 6 Invariant 4)
- Adversarial review is a Stage 3 concern; the executor does not pass any commit message or agent rationale back to the orchestrator. (source: 03_The_Core_Loop.md Hard gates "Court context isolation"; 00_Architecture.md Section 8 Stage 2 out-of-scope)

#### Tests or fixtures

- `dg-anvil/tests/unit/executor.test.js` (Task 2.5) exercises `executeTask` against a stub dispatcher; asserts state is not carried across dispatches; asserts worktree creation and cleanup; asserts the briefing is frozen before the dispatcher sees it.

#### Verification command

```
node -e "const ex=require('./dg-anvil/cli/lib/executor.js'); if(typeof ex.executeTask!=='function'){process.exit(1)}; if(typeof ex.MUTABLE_STATE!=='object'||Object.isFrozen(ex.MUTABLE_STATE)!==true||Object.keys(ex.MUTABLE_STATE).length!==0){process.exit(1)}"
```

Expected exit 0.

#### Done when

`cli/lib/executor.js` exports `executeTask`, injects the dispatcher, captures diff and tool output into worktree-relative paths, freezes the briefing, and carries no module-level mutable state.

### Task 2.5: Author the executor unit test

#### Goal

Ship `tests/unit/executor.test.js` that exercises `executeTask` against a stub dispatcher; asserts that state is not carried across dispatches; asserts worktree creation and cleanup paths; asserts the dispatcher receives a frozen briefing containing the filtered contract criteria.

#### Inputs

- `reports/DG-Anvil/00_Architecture.md` Section 6 (Invariant 13), Section 7 (Test tiers).
- `dg-anvil/cli/lib/executor.js` (from Task 2.4).
- `dg-anvil/cli/lib/worktree.js` (from Task 2.2).

#### Outputs

- `dg-anvil/tests/unit/executor.test.js`
  - Uses `node:test` and `node:assert`.
  - Fixture contract: a minimal two-criterion contract with the four verification-level slots populated; loaded via `cli/lib/contract.js` from a fixture file composed inline or from `docs/contract-examples/good/rate-limit-001.yml`.
  - Fixture plan: a two-task plan; each task cites a distinct criterion id; loaded via `cli/lib/plan.js`.
  - Positive tests:
    - `executeTask({repoRoot, task: T0, contract, dispatcher: stub})` returns `status: 'ok'` with `diffPath` pointing to a file that exists; `toolOutputPath` file has the stub's records one per line.
    - Run `executeTask` twice in sequence; the stub dispatcher records the briefing it received; the test asserts the second run's briefing has no reference to the first run's data (no field values from the first run appear in the second run's briefing).
    - The briefing passed to the stub is `Object.isFrozen(briefing)` true and every nested object is frozen.
    - The stub returns a fixed `diff` and `toolOutput`; after the call, `fs.readFileSync(<worktreePath>/anvil/diff.patch, 'utf8')` equals the stub's diff exactly (byte-for-byte, no transformation).
  - Negative tests:
    - A dispatcher that throws produces a result with `status: 'error'` and an `error` field; no exception escapes `executeTask`.
    - A task whose `criterion_ids` references a criterion id not in the contract throws `E_EXECUTOR` with `details.rule = 'unknown_criterion_id'`.
  - Fresh-subagent discipline assertion: the test imports `executor.MUTABLE_STATE` and asserts `Object.keys(MUTABLE_STATE).length === 0` both before and after the two-run sequence (no module-level accumulation).
  - `teardown()`: removes the temp repo.
  - CommonJS.

#### Decisions already made

- Fresh-subagent discipline is enforced structurally; the unit test asserts it. (source: 00_Architecture.md Section 6 Invariant 13)
- Every exported function has at least one positive and one negative test. (source: 00_Architecture.md Section 7 Test tiers)
- Test fixtures for good contracts and plans already exist under `docs/contract-examples/good/` and `docs/plan-examples/good/` (Stage 1 Task 1.12 and 1.13). (source: reports/DG-Anvil/plans/stage_1_contract_and_plan.md Task 1.12 and 1.13)
- Stub dispatchers are injected into `executeTask` as a function parameter; no module-level monkey-patching. (source: 00_Architecture.md Section 7 Test tiers; Invariant 13)

#### Tests or fixtures

- Consumes `docs/contract-examples/good/rate-limit-001.yml` and `docs/plan-examples/good/rate-limit-001.yml`.

#### Verification command

```
node --test dg-anvil/tests/unit/executor.test.js
```

Expected exit 0.

#### Done when

`tests/unit/executor.test.js` runs green; asserts no state across dispatches; asserts worktree creation and cleanup; asserts frozen briefing; asserts `MUTABLE_STATE` stays empty.

### Task 2.6: Author the verifier module

#### Goal

Ship `cli/lib/verifier.js` that runs the four-level probe (Exists, Substantive, Wired, Functional) per criterion, captures raw output, and returns structured pass/fail per level. Any level's failure short-circuits and returns fail for that criterion; other criteria continue to evaluate.

#### Inputs

- `reports/Anvil-Design/05_The_Contract.md` "Why four verification levels"; "Substantive verification - the hard one"; "Wired verification - the silent orphan fix"; "Invariants".
- `reports/Anvil-Design/03_The_Core_Loop.md` phase 6 (Verify); Hard gates "Verify all-or-nothing" ("Three greens out of four is a fail").
- `reports/Anvil-Design/02_Design_Thesis.md` architectural consequence 2 (Verification must be external).
- `reports/Anvil-Design/10_Anti-Patterns_Defeated.md` row 8 (Claim-without-evidence), row 12 (Orphan implementation), row 13 (Semantic empty stub).
- `reports/DG-Anvil/00_Architecture.md` Section 3 (Subprocess invocation; Error format), Section 6 (Invariants 3, 5, 13).
- `dg-anvil/cli/lib/contract.js` (from Stage 1).
- `dg-anvil/cli/lib/io.js` (from Task 2.1).
- `dg-anvil/cli/lib/errors.js`.

#### Outputs

- `dg-anvil/cli/lib/verifier.js`
  - Exports `verifyAll({ worktreePath, contract, diffPath, toolOutputPath })` that iterates every criterion in `contract.criteria` and returns `{ criteria: [{ id, levels: { exists, substantive, wired, functional }, allGreen: boolean }], invariants: [...], allGreen: boolean, raw: { exists: object, substantive: object, wired: object, functional: object, invariants: object } }` where each level is `{ status: 'pass' | 'fail', evidence: string, rawPath: string }`.
  - Exports `probeExists({ worktreePath, criterion })` that:
    - Reads `criterion.exists` for `file`, `symbol`, `signature`, and/or `test_suite`.
    - For `file`: asserts the file exists inside `worktreePath` via `fs.existsSync`.
    - For `symbol` with a `signature`: greps the file for a matching declaration token and records the line. No regex on free-form narration; the pattern uses anchored substring tokens that match a language-agnostic declaration form (`def <name>`, `function <name>`, `class <name>`, `const <name> =`, or `<name>: (...signature...)`).
    - For `test_suite`: asserts the test file exists.
    - Returns `{ status, evidence, rawPath }` where `rawPath` is the absolute path to the captured output file inside `<worktreePath>/anvil/verify/exists-<criterionId>.json`.
  - Exports `probeSubstantive({ worktreePath, criterion, diffPath, toolOutputPath })` that implements the behavioural probe:
    - Stage 2 scope: JavaScript targets only, matching the Wired-probe language support. Non-JavaScript targets return `E_UNSUPPORTED_LANGUAGE` as described above and do not pass. (source: `00_Architecture.md` Section 3 "Wired-probe language support"; Section 3 "Coverage tooling")
    - Writes a self-contained runner script (one per criterion) inside `<worktreePath>/anvil/verify/substantive-<criterionId>-runner` that invokes the target symbol with contract-provided inputs from `criterion.substantive` (for example, the `must_implement` observable effects are asserted; `must_not` effects are negatively asserted).
    - Runs the target symbol via `io.spawn` against the host language's runner (named on the criterion's `functional.probe.runner` if present, else defaulting to `node -e` for JavaScript based on the target file extension).
    - Captures coverage delta via Node built-in coverage for JavaScript (`node --experimental-test-coverage` in Node 20, stable `--test-coverage` in Node 22 when adopted; the probe invokes whichever is present). No external dependency. (source: `00_Architecture.md` Section 3 "Coverage tooling")
    - If coverage tooling is unavailable on the host, the probe returns a structured error with `code = 'E_COVERAGE_UNAVAILABLE'` and `details = { language: 'javascript', runner, reason }`; the criterion fails. "Coverage unavailable" is never a pass. (source: `00_Architecture.md` Section 3 "Coverage tooling")
    - Checks for observable side effects named in `must_implement`: mutation of state (before/after read of a named file or symbol), network call (via a sandbox that intercepts to a local loopback recorder), log emission (stdout/stderr capture), metric increment (a named counter symbol is read before and after).
    - Asserts `must_not` items are not observed.
    - Returns `pass` iff every `must_implement` side effect is observed and no `must_not` side effect is observed.
    - Writes captured runner stdout, stderr, and status into `<worktreePath>/anvil/verify/substantive-<criterionId>.json`.
  - Exports `probeWired({ worktreePath, criterion })` that:
    - Walks the call graph from the contract's named entry point (`criterion.wired.call_site.file` plus `criterion.wired.call_site.line_range` if present).
    - Stage 2 ships JavaScript support only; `fixture-repo-node` is the reference. Python and Go land in Stages 3 and 4 respectively. (source: `00_Architecture.md` Section 3 "Wired-probe language support")
    - When the target repository's source language is not JavaScript at Stage 2 scope, the probe returns a structured error with `code = 'E_UNSUPPORTED_LANGUAGE'` and `details = { language, stage: 2, supported: ['javascript'] }`. This is a structured error, not a pass or a soft warning. (source: `00_Architecture.md` Section 3 "Wired-probe language support")
    - The JavaScript walker implements a minimal recursive-descent identifier-extractor with zero external dependencies. The walker reads the file, strips comments, and scans for the pattern `<symbol>(` where `<symbol>` is `criterion.wired.call_site.must_contain_symbol`. The Wired probe's authority is the presence of a call expression inside the named file's line range, as specified by `05_The_Contract.md`.
    - JavaScript walker edge-case rules (explicit; the walker honours all five unconditionally):
      (a) Multi-line template literals (backtick-delimited strings spanning newlines) are not scanned for symbol names; the walker tracks backtick depth and skips all content inside a template literal.
      (b) Escape sequences inside single-quote, double-quote, and backtick strings are preserved as literal text; the walker does not interpret `\\` or `\n` as string terminators.
      (c) Single-line comments (`//`) and block comments (`/* */`) are stripped before scanning; a symbol mention inside a comment is not counted as a call.
      (d) Regex literals (`/.../flags`) are treated as strings; symbol mentions inside a regex literal are not counted as calls.
      (e) JSX element attributes are not treated as function calls; the walker distinguishes `<Foo prop={bar}/>` from a call expression `Foo(bar)`.
    - Paired JavaScript unit-test cases (added in Task 2.7): (1) a fixture where the target symbol appears inside a template literal and the walker must NOT count it as a call; (2) a fixture with an escaped backtick inside a template literal where the walker correctly tracks the template literal boundary; (3) a fixture with the target symbol inside a `//` line comment where the walker strips the comment before scanning.
    - Source for edge-case rules: ECMA-262 (ECMAScript Language Specification) sections on template literals, string literals, comments, regular expression literals, and JSX extension specification where applicable.
    - Returns `pass` iff the entry-point file contains a call to the named symbol inside the contract's `line_range` (if present) or anywhere in the file (if absent).
    - Writes captured grep output and match positions into `<worktreePath>/anvil/verify/wired-<criterionId>.json`.
  - Exports `probeFunctional({ worktreePath, criterion })` that:
    - Reads `criterion.functional.probe` for `runner` (Stage 2 scope: `node --test`; Python `pytest` and Go `go test` land with their paired fixture repos in Stages 3 and 4), `target` (a test file path relative to `worktreePath`), `must_pass` (an array of test names), and `exit_code` (the expected runner exit code).
    - Invokes the runner via `io.spawn(runner, [...runnerArgs, target])` with the runner-specific argument shape; the runner argument shape is declared as a small schema at the top of the module, keyed by the `runner` string. A Stage 2 invocation against a non-JavaScript runner returns `E_UNSUPPORTED_LANGUAGE` per `00_Architecture.md` Section 3 "Wired-probe language support" (the language support schedule applies to the full Verify probe set, not only Wired).
    - Captures stdout, stderr, status.
    - Checks that the runner exit code equals `criterion.functional.probe.exit_code`.
    - If `must_pass` is present, checks that every named test appears as a pass in the runner's output using the runner's native output format (no regex over free-form prose; Stage 2 supports `node --test` TAP output).
    - Writes captured output into `<worktreePath>/anvil/verify/functional-<criterionId>.json`.
  - Exports `evaluateInvariants({ worktreePath, contract, diffPath })` that evaluates the contract's `invariants` section on every verify pass (not only the last): `no_new_dependencies`, `public_api_unchanged`, `coverage.new_code_minimum`, `no_secret_patterns`. Each invariant has a named checker function inside `verifier.js`; the set is closed at Stage 2 scope (matching the four invariants enumerated in `05_The_Contract.md`). Additional invariant types require an architecture document update. `evaluateInvariants` maintains a frozen `KNOWN_INVARIANTS = Object.freeze(['no_new_dependencies', 'public_api_unchanged', 'coverage.new_code_minimum', 'no_secret_patterns'])`. Any invariant key in `contract.invariants` not in `KNOWN_INVARIANTS` produces a result `{invariant: <key>, status: 'unknown', warning: 'No checker registered for this invariant; it has no effect. Add to KNOWN_INVARIANTS or remove from contract.'}` and causes the invariant to NOT pass. The top-level `allGreen` requires every invariant to be `status: 'pass'`; `status: 'unknown'` blocks `allGreen`. `E_UNKNOWN_INVARIANT` is NOT a new error code: the unknown-invariant path returns a warning result, not an exception, so the code is NOT added to `cli/lib/errors.js`.
  - Short-circuits per criterion: the first failing level returns fail for that criterion; subsequent levels for the same criterion are not evaluated. Other criteria continue to evaluate. `allGreen` at the top level requires every criterion's `allGreen` to be true and every invariant to pass.
  - Error code `E_VERIFY` (added in Task 2.2's `cli/lib/errors.js` edit) is thrown only for verifier-internal failures (schema violation in the criterion object, unavailable runner); probe failures are signalled via the returned `status: 'fail'`, not thrown.
  - Imports only from `fs`, `path`, `crypto`, `cli/lib/io.js`, `cli/lib/errors.js`. The contract object is consumed by shape, not re-parsed.
  - No `TODO`, `FIXME`, `XXX`, `HACK`, `TBD`, `WIP`, `NOTE:` markers.
  - No persona phrasing in any string constant.

#### Decisions already made

- Four verification levels (Exists, Substantive, Wired, Functional) are grammatical slots; all four must be green. (source: 05_The_Contract.md "Why four verification levels"; 02_Design_Thesis.md architectural consequence 1)
- "Three greens out of four is a fail." (source: 03_The_Core_Loop.md Hard gates "Verify all-or-nothing")
- Substantive probe is behavioural: runs the target symbol under contract-provided inputs; captures coverage delta; checks for observable side effects in `must_implement`. (source: 05_The_Contract.md "Substantive verification - the hard one")
- Wired probe walks the call graph from the contract's named entry point; records call-site file and line range. (source: 05_The_Contract.md "Wired verification - the silent orphan fix")
- Invariants are evaluated on every Verify pass, not only the last. (source: 05_The_Contract.md "Invariants")
- Tool output is captured as-is to worktree-relative paths; the orchestrator does not parse tool output for control flow. (source: 00_Architecture.md Section 3 Subprocess invocation)
- Error code format is `{error, code, details}`; new codes are additive and registered in `cli/lib/errors.js`. (source: 00_Architecture.md Section 3 Error format)
- Substantive probe addresses row 13 (Semantic empty stub); Wired probe addresses row 12 (Orphan implementation); Verify as a whole addresses row 8 (Claim-without-evidence). (source: 10_Anti-Patterns_Defeated.md rows 8, 12, 13)
- Zero runtime dependencies; no external AST parser. (source: 00_Architecture.md Section 3 Runtime; Invariant 11)
- Stage 2 Wired probe supports JavaScript only; `fixture-repo-node` is the reference. Python is added in Stage 3; Go is added in Stage 4. (source: 00_Architecture.md Section 3 "Wired-probe language support")
- A Wired probe invoked against a language not yet supported by the current stage returns `E_UNSUPPORTED_LANGUAGE` (structured error), not a pass or a soft warning. (source: 00_Architecture.md Section 3 "Wired-probe language support")
- Substantive probe coverage tooling at Stage 2 is Node built-in coverage for JavaScript (`node --experimental-test-coverage` in Node 20, stable `--test-coverage` in Node 22). No external dependency. (source: 00_Architecture.md Section 3 "Coverage tooling")
- If coverage tooling is missing, the probe returns `E_COVERAGE_UNAVAILABLE` and the criterion fails; "coverage unavailable" is never a pass. (source: 00_Architecture.md Section 3 "Coverage tooling")
- Python `coverage.py` and Go `go test -coverprofile` are out of Stage 2 scope per the language support schedule; they land with their paired fixture repos in Stages 3 and 4. (source: 00_Architecture.md Section 3 "Wired-probe language support"; "Coverage tooling")
- Unknown invariant keys produce `status: 'unknown'` warnings, not validation errors, and block `allGreen`. (source: Section 6 Invariant 5 structured errors for exceptional paths; Invariant 4 no silent accept)

#### Tests or fixtures

- `dg-anvil/tests/unit/verifier.test.js` (Task 2.7) exercises each of the four levels with fixture contracts and fixture source files; asserts pass and fail on each level.
- `tests/unit/verifier.test.js` adds a case: contract with `invariants: {protect_user_data: true}` produces `{status: 'unknown', warning: ...}` for the unknown key and `allGreen: false`.

#### Verification command

```
node -e "const v=require('./dg-anvil/cli/lib/verifier.js'); for(const f of ['verifyAll','probeExists','probeSubstantive','probeWired','probeFunctional','evaluateInvariants']){if(typeof v[f]!=='function'){process.exit(1)}}"
```

Expected exit 0.

#### Done when

`cli/lib/verifier.js` exports the five probe functions plus `verifyAll`; each probe writes raw captured output to a worktree-relative path; any level's failure short-circuits that criterion; `allGreen` requires every criterion's levels to be pass and every invariant to pass.

### Task 2.7: Author the verifier unit test

#### Goal

Ship `tests/unit/verifier.test.js` that exercises each of the four levels with fixture contracts and fixture source files; asserts pass and fail on each level.

#### Inputs

- `reports/DG-Anvil/00_Architecture.md` Section 7 (Test tiers).
- `dg-anvil/cli/lib/verifier.js` (from Task 2.6).
- `dg-anvil/docs/contract-examples/good/rate-limit-001.yml` (from Stage 1 Task 1.12).

#### Outputs

- `dg-anvil/tests/unit/verifier.test.js`
  - Uses `node:test` and `node:assert`.
  - Fixtures (created inside the test via `fs.mkdtempSync` for each test):
    - A disposable worktree with a tiny JavaScript source file implementing a named function; a companion test file using `node --test`.
    - A minimal contract (synthesised inline in the test) whose single criterion names the file, the symbol, the call site, and a functional probe against the companion test file.
  - Positive tests:
    - `probeExists` returns `pass` when the named file contains the symbol; the captured `rawPath` file exists and records the match line.
    - `probeSubstantive` returns `pass` when the target function mutates a state variable named in `must_implement`; captures runner stdout into the expected path.
    - `probeWired` returns `pass` when the entry-point file contains a call to the symbol inside the contract's `line_range`.
    - `probeFunctional` returns `pass` when the runner exits with the expected code and every `must_pass` name is observed in the output.
    - `evaluateInvariants` returns `pass` for a diff that does not add dependencies, does not change public API, meets coverage floor, and contains no secret patterns.
    - `verifyAll` against a good fixture returns `allGreen: true`.
  - Negative tests:
    - `probeExists` returns `fail` when the file is missing.
    - `probeExists` returns `fail` when the file exists but the symbol is absent.
    - `probeSubstantive` returns `fail` when the target function returns but does not produce any `must_implement` side effect (semantic empty stub case).
    - `probeSubstantive` returns `fail` when a `must_not` side effect is observed.
    - `probeWired` returns `fail` when the symbol is declared in a different file than the contract's `call_site.file` (orphan implementation case).
    - `probeFunctional` returns `fail` when the runner exits non-zero or a named `must_pass` test is missing.
    - `evaluateInvariants` returns `fail` when the diff adds a dependency in `package.json`.
    - `verifyAll` with one failing criterion returns `allGreen: false` and exactly that criterion's `allGreen: false`; all other criteria still report a complete `{exists, substantive, wired, functional}` record.
  - Short-circuit assertion: `verifyAll` with a criterion that fails `exists` records `status: 'fail'` on `exists` and does not invoke `probeSubstantive`, `probeWired`, or `probeFunctional` for that criterion. The test asserts this by injecting spy versions of the probes and checking their call counts. The spy injection is via a second exported function `verifyAllWithProbes({ probes })` in `cli/lib/verifier.js` whose `probes` argument is an object whose keys are `{ exists, substantive, wired, functional, invariants }`; the public `verifyAll` delegates to `verifyAllWithProbes` with the built-in probes. This is added to the `cli/lib/verifier.js` exports list in Task 2.6; the test exercises the spy pathway.
  - CommonJS.

#### Decisions already made

- Every exported function has at least one positive and one negative test; rejection rules have dedicated tests. (source: 00_Architecture.md Section 7 Test tiers)
- Four verification levels; all four must be green; "three greens out of four is a fail". (source: 03_The_Core_Loop.md Hard gates)
- Spy injection via a second entry point `verifyAllWithProbes({ probes })` keeps the short-circuit assertion structural, not string-matching. (source: 00_Architecture.md Section 7 Test tiers)

#### Tests or fixtures

- Fixtures are synthesised inside the test file via `fs.mkdtempSync`; no persistent fixture files beyond those already in `docs/contract-examples/good/`.

#### Verification command

```
node --test dg-anvil/tests/unit/verifier.test.js
```

Expected exit 0.

#### Done when

`tests/unit/verifier.test.js` runs green; every level has at least one positive and one negative test; short-circuit behaviour is asserted structurally via the `verifyAllWithProbes` spy pathway.

### Task 2.8: Finalize the `executing` skill

#### Goal

Replace the Stage 0 `skills/executing/SKILL.md` stub with a finalized skill whose six canonical sections are populated. The Process names one worktree per task, fresh subagent per task, and the orchestrator-does-not-read-implementer-narration rule.

#### Inputs

- `reports/Anvil-Design/04_Anatomy.md` Seven skills table row 3 ("`executing` ... Diff + captured tool output in worktree").
- `reports/Anvil-Design/03_The_Core_Loop.md` phase 4 (Dispatch), phase 5 (Execute); Context discipline.
- `reports/Anvil-Design/02_Design_Thesis.md` architectural consequence 2 (Verification must be external).
- `reports/Anvil-Design/10_Anti-Patterns_Defeated.md` row 1 (Context pollution), row 16 (Context-window collapse), row 19 (Ghost code), row 11 (Drive-by refactoring), row 5 (Tool loop).
- `reports/DG-Anvil/00_Architecture.md` Section 6 (Invariants 3, 4, 6, 8, 12, 13).
- `dg-anvil/skills/executing/SKILL.md` (Stage 0 stub).

#### Outputs

- `dg-anvil/skills/executing/SKILL.md`
  - Six H2 headers in order: `## Overview`, `## When to Use`, `## Process`, `## Rationalizations`, `## Red Flags`, `## Verification`. No additional H2 headings.
  - `## Overview`: one paragraph stating the skill dispatches one subagent per task inside a per-task git worktree; the subagent receives the task text and the contract inlined; the orchestrator reads only the captured diff and the captured tool output; the orchestrator does not read implementer narration; state is never carried across dispatches.
  - `## When to Use`: invoked by the orchestrator for every plan task after a wave unlocks. Not invoked by user prompts directly.
  - `## Process`: numbered steps:
    1. Read the confirmed `anvil/contract.yml` and `anvil/plan.yml`.
    2. For the task at hand, create a fresh worktree via `anvil run --task <id>` which delegates to `cli/lib/worktree.js` `create`.
    3. Compose the subagent briefing: the task record (id, title, wave, depends_on, criterion_ids), the contract frontmatter plus the criteria referenced by `task.criterion_ids`, and the worktree path. Nothing else. No prior task's diff, no prior task's rationale, no other task's briefing.
    4. Dispatch a fresh subagent with the briefing. The subagent works only inside the worktree. Every tool call's output is captured to `<worktreePath>/anvil/tool-output.jsonl`. The diff is captured to `<worktreePath>/anvil/diff.patch`.
    5. When the subagent finishes, return control to the orchestrator with `{ diffPath, toolOutputPath, status, briefingHash }`. Do not pass the subagent's narration back.
    6. The orchestrator hands the captured paths to the `verifying` skill. The orchestrator never reads the captured files itself; only `verifying` reads them.
  - `## Rationalizations`: at least three verbatim-shaped entries, each ending with a taxonomy-row citation of the form `(failure-taxonomy row N)`. Required rows: 1 (Context pollution), 16 (Context-window collapse), 11 (Drive-by refactoring).
  - `## Red Flags`: at least three entries, each citing a failure-taxonomy row. Required rows: 1 (Context pollution), 16 (Context-window collapse), 19 (Ghost code).
  - `## Verification`: a numbered checklist: `anvil run --task <id>` exits 0 or with a structured error; `<worktreePath>/anvil/diff.patch` exists and is non-empty iff the task produced any change; `<worktreePath>/anvil/tool-output.jsonl` exists; the orchestrator's state does not contain any key derived from the subagent's narration.
  - Under 200 lines.
  - No `TODO`, `FIXME`, `XXX`, `HACK`, `TBD`, `WIP`, `NOTE:` markers.
  - No persona phrasing.

#### Decisions already made

- Six canonical skill sections in exact order. (source: 00_Architecture.md Section 6 Invariant 6)
- The `executing` skill produces: "Diff + captured tool output in worktree". (source: 04_Anatomy.md Seven skills table row 3)
- Fresh subagent per task; orchestrator holds only Contract + Plan + Ledger index. (source: 03_The_Core_Loop.md Context discipline; 10_Anti-Patterns_Defeated.md row 1)
- Orchestrator does not hold any implementer's output, diff, or rationale. (source: 03_The_Core_Loop.md Context discipline)
- Fresh-subagent discipline enforced structurally. (source: 00_Architecture.md Section 6 Invariant 13)
- Every pressure test cites the failure-taxonomy row it is stressing; Task 2.10 pairs this skill with `tests/pressure/executing.pressure.js`. (source: 00_Architecture.md Section 6 Invariants 8 and 12)
- No persona phrasing. (source: 00_Architecture.md Section 6 Invariant 4)
- No unshipped markers. (source: 00_Architecture.md Section 6 Invariant 3)
- Under 200 lines matches the discipline applied to `using-anvil`. (source: reports/DG-Anvil/plans/stage_0_bootstrap.md Task 0.13)

#### Tests or fixtures

- `dg-anvil/tests/pressure/executing.pressure.js` (Task 2.10) is the paired pressure test required by Invariant 8.

#### Verification command

```
awk '/^## /{print $0}' dg-anvil/skills/executing/SKILL.md | tr '\n' '|' | grep -qE '^## Overview\|## When to Use\|## Process\|## Rationalizations\|## Red Flags\|## Verification\|$' && grep -qE 'row 1|taxonomy row 1' dg-anvil/skills/executing/SKILL.md && grep -qE 'row 16|taxonomy row 16' dg-anvil/skills/executing/SKILL.md && grep -qE 'fresh subagent|worktree' dg-anvil/skills/executing/SKILL.md && test $(wc -l < dg-anvil/skills/executing/SKILL.md) -lt 200
```

Expected exit 0.

#### Done when

`skills/executing/SKILL.md` has the six canonical sections populated; cites the required failure-taxonomy rows; names the worktree and fresh-subagent discipline; is under 200 lines; has no forbidden markers or persona phrasing.

### Task 2.9: Finalize the `verifying` skill

#### Goal

Replace the Stage 0 `skills/verifying/SKILL.md` stub with a finalized skill whose six canonical sections are populated. The Process runs the four levels in order; any level's failure short-circuits and returns fail.

#### Inputs

- `reports/Anvil-Design/04_Anatomy.md` Seven skills table row 4.
- `reports/Anvil-Design/03_The_Core_Loop.md` phase 6 (Verify); Hard gates "Verify all-or-nothing".
- `reports/Anvil-Design/05_The_Contract.md` "Why four verification levels"; "Substantive verification"; "Wired verification".
- `reports/Anvil-Design/02_Design_Thesis.md` architectural consequence 2.
- `reports/Anvil-Design/10_Anti-Patterns_Defeated.md` row 8 (Claim-without-evidence), row 12 (Orphan implementation), row 13 (Semantic empty stub), row 3 (Mock tautology), row 14 (Theatre drift).
- `reports/DG-Anvil/00_Architecture.md` Section 6 (Invariants 3, 4, 6, 8, 12).
- `dg-anvil/skills/verifying/SKILL.md` (Stage 0 stub).

#### Outputs

- `dg-anvil/skills/verifying/SKILL.md`
  - Six H2 headers in order. No additional H2 headings.
  - `## Overview`: one paragraph stating the skill runs the four-level probe (Exists, Substantive, Wired, Functional) per criterion; reads only the captured diff and captured tool output; never reads the implementer's narration; "three greens out of four is a fail".
  - `## When to Use`: invoked by the orchestrator after `executing` returns. Not invoked by user prompts directly.
  - `## Process`: numbered steps:
    1. Read the confirmed `anvil/contract.yml`.
    2. Load the captured diff from `<worktreePath>/anvil/diff.patch` and the captured tool output from `<worktreePath>/anvil/tool-output.jsonl`.
    3. For each criterion in the contract, run `probeExists`. If it returns fail, record fail on that criterion and move to the next criterion; do not run Substantive, Wired, or Functional for this one.
    4. Run `probeSubstantive`. The probe is behavioural: it invokes the target symbol with contract-provided inputs and captures coverage delta plus observable side effects. String-matching is not substantive.
    5. Run `probeWired`. The probe walks the call graph from the contract's named entry point and confirms the target symbol is reachable from that entry point inside the named line range.
    6. Run `probeFunctional`. The probe invokes the named runner against the named target and asserts the expected exit code and the `must_pass` test names.
    7. After every criterion has been probed, evaluate the contract's `invariants` section (no_new_dependencies, public_api_unchanged, coverage.new_code_minimum, no_secret_patterns).
    8. Return a structured result: `{ criteria: [{ id, levels: { exists, substantive, wired, functional }, allGreen }], invariants, allGreen }`. The orchestrator reads only the structured result.
  - `## Rationalizations`: at least three verbatim-shaped entries citing taxonomy rows. Required rows: 8 (Claim-without-evidence), 13 (Semantic empty stub), 3 (Mock tautology).
  - `## Red Flags`: at least three entries citing taxonomy rows. Required rows: 8 (Claim-without-evidence), 12 (Orphan implementation), 14 (Theatre drift).
  - `## Verification`: a numbered checklist: `anvil verify --task <id>` exits 0 when every level is green; every level's raw captured output exists at the expected worktree-relative path; the orchestrator's state does not contain any key derived from the subagent's narration; `allGreen: false` on any criterion surfaces the failing criterion id, the failing level name, and the captured raw path.
  - Under 200 lines.
  - No `TODO`, `FIXME`, `XXX`, `HACK`, `TBD`, `WIP`, `NOTE:` markers.
  - No persona phrasing.

#### Decisions already made

- Six canonical skill sections in exact order. (source: 00_Architecture.md Section 6 Invariant 6)
- The `verifying` skill produces "Pass/fail per level (Exists, Substantive, Wired, Functional)". (source: 04_Anatomy.md Seven skills table row 4)
- "Three greens out of four is a fail." (source: 03_The_Core_Loop.md Hard gates "Verify all-or-nothing")
- Substantive is behavioural, not regex. (source: 05_The_Contract.md "Substantive verification - the hard one"; 10_Anti-Patterns_Defeated.md row 13)
- Wired is a call-graph walk from the contract's named entry point. (source: 05_The_Contract.md "Wired verification - the silent orphan fix"; 10_Anti-Patterns_Defeated.md row 12)
- Verification is external: the Verify step runs the contract's evidence probes in a clean process; tool output is captured as-is; the judge reads the captured output, not the subagent's narration. (source: 02_Design_Thesis.md architectural consequence 2)
- Every pressure test cites the failure-taxonomy row it is stressing; Task 2.11 pairs this skill with `tests/pressure/verifying.pressure.js`. (source: 00_Architecture.md Section 6 Invariants 8 and 12)
- No persona phrasing; no unshipped markers. (source: 00_Architecture.md Section 6 Invariants 3 and 4)

#### Tests or fixtures

- `dg-anvil/tests/pressure/verifying.pressure.js` (Task 2.11) is the paired pressure test required by Invariant 8.

#### Verification command

```
awk '/^## /{print $0}' dg-anvil/skills/verifying/SKILL.md | tr '\n' '|' | grep -qE '^## Overview\|## When to Use\|## Process\|## Rationalizations\|## Red Flags\|## Verification\|$' && grep -qE 'row 8|taxonomy row 8' dg-anvil/skills/verifying/SKILL.md && grep -qE 'row 13|taxonomy row 13' dg-anvil/skills/verifying/SKILL.md && grep -qE 'three greens out of four is a fail' dg-anvil/skills/verifying/SKILL.md && test $(wc -l < dg-anvil/skills/verifying/SKILL.md) -lt 200
```

Expected exit 0.

#### Done when

`skills/verifying/SKILL.md` has the six canonical sections populated; cites the required failure-taxonomy rows; names the four-level short-circuit discipline; is under 200 lines; has no forbidden markers or persona phrasing.

### Task 2.10: Author the `executing` pressure test

#### Goal

Ship `tests/pressure/executing.pressure.js` as the paired pressure test for the `executing` skill. Cites failure-taxonomy row 1 (Context pollution) and row 16 (Context-window collapse). The without-skill run carries state across dispatches; the with-skill run does not.

#### Inputs

- `reports/Anvil-Design/10_Anti-Patterns_Defeated.md` row 1 (Context pollution); row 16 (Context-window collapse).
- `reports/DG-Anvil/00_Architecture.md` Section 6 (Invariants 8, 12, 13), Section 7 (Pressure test harness).
- `dg-anvil/tests/pressure/harness.js` (Stage 0 skeleton).
- `dg-anvil/skills/executing/SKILL.md` (from Task 2.8).
- `dg-anvil/cli/lib/executor.js` (from Task 2.4).

#### Outputs

- `dg-anvil/tests/pressure/executing.pressure.js`
  - First line (comment): `// taxonomy row 1: Context pollution; taxonomy row 16: Context-window collapse`.
  - CommonJS: `const test = require('node:test'); const assert = require('node:assert'); const { runPressure } = require('../pressure/harness.js');`.
  - Declares a scenario with two sequential tasks (`T0`, `T1`) whose contracts are distinct: `T0`'s criterion names file `a.js`, `T1`'s criterion names file `b.js`.
  - `withoutSkill` expected outcome: the dispatcher's briefing for `T1` contains a reference to `T0`'s diff or tool output (carried across dispatches); assert the briefing object includes a field named `prior_diff` or equivalent whose value is non-null.
  - `withSkill` expected outcome: the dispatcher's briefing for `T1` contains only `T1`'s task record plus `T1`'s criteria plus `T1`'s worktree path; the briefing is `Object.isFrozen` and contains no field whose value was derived from `T0`'s run. Assert by comparing the two briefings and checking the absence of any `T0`-derived key.
  - Uses `node:assert` for both outcomes.
  - Consumes `cli/lib/executor.js` `executeTask` with the same stub dispatcher shape used in Task 2.5.

#### Decisions already made

- Every pressure test cites the failure-taxonomy row it is stressing. (source: 00_Architecture.md Section 6 Invariant 12)
- `executing` skill authored in Task 2.8 is paired with this pressure test in the same stage per Invariant 8. (source: 00_Architecture.md Section 6 Invariant 8)
- Row 1 (Context pollution) and row 16 (Context-window collapse) are the canonical failures this skill addresses. (source: 10_Anti-Patterns_Defeated.md rows 1 and 16)
- Harness contract: `runPressure({ scenario, withSkill, withoutSkill })`. (source: 00_Architecture.md Section 7 Pressure test harness)
- Fresh-subagent discipline is structurally enforced; the pressure test exercises the rule. (source: 00_Architecture.md Section 6 Invariant 13)

#### Tests or fixtures

- The pressure test is itself the artefact.

#### Verification command

```
grep -qE 'taxonomy row 1|row 1' dg-anvil/tests/pressure/executing.pressure.js && grep -qE 'taxonomy row 16|row 16' dg-anvil/tests/pressure/executing.pressure.js && grep -qE "require\\(.*tests/pressure/harness" dg-anvil/tests/pressure/executing.pressure.js && node --test dg-anvil/tests/pressure/executing.pressure.js
```

Expected exit 0.

#### Done when

`tests/pressure/executing.pressure.js` exists, cites rows 1 and 16, imports `runPressure`, and `node --test` exits 0 with the without-skill run asserting state-carry and the with-skill run asserting no state-carry.

### Task 2.11: Author the `verifying` pressure test

#### Goal

Ship `tests/pressure/verifying.pressure.js` as the paired pressure test for the `verifying` skill. Cites failure-taxonomy row 8 (Claim-without-evidence) and row 13 (Semantic empty stub). The without-skill run accepts agent narration; the with-skill run reads captured tool output.

#### Inputs

- `reports/Anvil-Design/10_Anti-Patterns_Defeated.md` row 8; row 13.
- `reports/DG-Anvil/00_Architecture.md` Section 6 (Invariants 8, 12), Section 7 (Pressure test harness).
- `dg-anvil/tests/pressure/harness.js`.
- `dg-anvil/skills/verifying/SKILL.md` (from Task 2.9).
- `dg-anvil/cli/lib/verifier.js` (from Task 2.6).

#### Outputs

- `dg-anvil/tests/pressure/verifying.pressure.js`
  - First line: `// taxonomy row 8: Claim-without-evidence; taxonomy row 13: Semantic empty stub`.
  - CommonJS imports as in Task 2.10.
  - Declares a scenario with a contract whose single criterion has a `substantive.must_implement` list that names one observable side effect. The subagent produces a target symbol whose body returns a fixed value without producing the named side effect (a semantic empty stub). The captured tool output contains the subagent's claim `"implemented and tested"` in a narration field.
  - `withoutSkill` expected outcome: the verifier (stubbed to read the subagent's narration) reports `allGreen: true` because the narration claims completion. Assert: the returned result's `allGreen` is true; the returned result has no `rawPath` for the substantive level or the `rawPath` points to a file that was not actually read.
  - `withSkill` expected outcome: the verifier runs the Substantive probe behaviourally; the probe invokes the target symbol and records that the named side effect was not observed; returns `allGreen: false` with `criteria[0].levels.substantive.status === 'fail'`; the captured `rawPath` points to a file whose contents record the observed side-effect set. Assert the pass/fail and the `rawPath` existence.
  - Uses `node:assert` for both outcomes.

#### Decisions already made

- Every pressure test cites the failure-taxonomy row it is stressing. (source: 00_Architecture.md Section 6 Invariant 12)
- `verifying` skill authored in Task 2.9 is paired with this pressure test in the same stage per Invariant 8. (source: 00_Architecture.md Section 6 Invariant 8)
- Row 8 (Claim-without-evidence) and row 13 (Semantic empty stub) are canonical failures. (source: 10_Anti-Patterns_Defeated.md rows 8 and 13)
- Verification is external; the judge reads the captured output, not the subagent's narration. (source: 02_Design_Thesis.md architectural consequence 2)
- Substantive probe is behavioural, not regex. (source: 05_The_Contract.md "Substantive verification - the hard one")

#### Tests or fixtures

- The pressure test is itself the artefact.

#### Verification command

```
grep -qE 'taxonomy row 8|row 8' dg-anvil/tests/pressure/verifying.pressure.js && grep -qE 'taxonomy row 13|row 13' dg-anvil/tests/pressure/verifying.pressure.js && grep -qE "require\\(.*tests/pressure/harness" dg-anvil/tests/pressure/verifying.pressure.js && node --test dg-anvil/tests/pressure/verifying.pressure.js
```

Expected exit 0.

#### Done when

`tests/pressure/verifying.pressure.js` exists, cites rows 8 and 13, imports `runPressure`, and `node --test` exits 0 with the without-skill run asserting narration-based acceptance and the with-skill run asserting behavioural-probe rejection.

### Task 2.12: Wire the `anvil run` and `anvil verify` subcommands

#### Goal

Replace the Stage 0 `stubRun` and `stubVerify` handlers in `cli/anvil.js` with functional dispatchers that orchestrate `cli/lib/executor.js` and `cli/lib/verifier.js` against a loaded contract and plan. The `anvil run` subcommand runs the loop for one task or the whole plan; `anvil verify` runs just the Verify gate.

#### Inputs

- `reports/Anvil-Design/04_Anatomy.md` One CLI binary table (`anvil run [--task <id>]`, `anvil verify [--task <id>]`).
- `reports/Anvil-Design/03_The_Core_Loop.md` phases 4, 5, 6.
- `reports/DG-Anvil/00_Architecture.md` Section 3 (Error format), Section 4 (Stage 2 produces row; wired CLI subcommands).
- `dg-anvil/cli/anvil.js` (Stage 0/1).
- `dg-anvil/cli/lib/executor.js` (from Task 2.4).
- `dg-anvil/cli/lib/verifier.js` (from Task 2.6).
- `dg-anvil/cli/lib/worktree.js` (from Task 2.2).
- `dg-anvil/cli/lib/contract.js`, `cli/lib/plan.js`, `cli/lib/args.js`.

#### Outputs

- `dg-anvil/cli/anvil.js`
  - `stubRun` replaced by a handler accepting:
    - `--task <id>` - optional; if present, runs only that one task.
    - `--contract <path>` - optional; defaults to `anvil/contract.yml` relative to CWD.
    - `--plan <path>` - optional; defaults to `anvil/plan.yml` relative to CWD.
    - `--dispatcher <name>` - optional; the v1 identifier set is exactly two values: `anvil_subagent` (default; dispatches via the host's subagent primitive; Stage 2 ships it stubbed to return a canned result for the fixture-repo-node loop test only; the live dispatch path is wired in Stage 4 when the runtime surface fills in) and `stub` (test-only dispatcher used by unit and pressure tests; returns a pre-defined result from a test fixture). Unknown identifiers are rejected with a structured error shaped `{error, code: 'E_UNKNOWN_DISPATCHER', details: { dispatcher, supported: ['anvil_subagent', 'stub'] }}`. No other dispatcher identifier exists in v1. (source: `00_Architecture.md` Section 3 "Dispatcher identifiers")
    - Process:
      1. Loads and validates the contract via `cli/lib/contract.js` `loadAndValidate`.
      2. Loads and validates the plan via `cli/lib/plan.js` `loadAndValidate(path, contract)`.
      3. If `--task` is present, runs `executor.executeTask` for that task then `verifier.verifyAll` on its worktree; writes the structured result to stdout as JSON; exits 0 on `allGreen: true`, non-zero with `E_VERIFY` on `allGreen: false`.
      4. If `--task` is absent, iterates every wave in topological order; for each wave, iterates every task (Stage 2 runs tasks sequentially within a wave because parallel dispatch is a Stage 4 observability concern tied to the hook surface; Stage 2 supports the loop-test-scale workload); after every task, calls `verifier.verifyAll`; on any `allGreen: false`, stops the wave and exits non-zero with `E_VERIFY` plus `details = { taskId, criterionId, level }`.
      5. After every task, calls `worktree.remove` to clean up; on failure, records the orphan-worktree alarm and continues.
      6. Writes the per-task state (`anvil/state.json`) after each task completes (pass, fail, or error). State-file shape is authoritatively defined in `00_Architecture.md` Section 3 "Runtime state file shape" and is reproduced verbatim here: top-level keys `anvil_state_version` (integer, const 1), `run_id` (string matching `r-<8hex>`), `contract_path` (string, defaults to `anvil/contract.yml`), `plan_path` (string, defaults to `anvil/plan.yml`), `current_wave` (integer or null), and `tasks` (object map keyed by task id). Each per-task subfield: `status` (one of `queued`, `running`, `verified`, `judged`, `passed`, `failed`, `escalated`), `worktree_path` (string or null), `started_at` (ISO-8601 or null), `finished_at` (ISO-8601 or null), `loop_count` (integer, default 0), `last_verify_result` (object or null), `last_judge_result` (object or null), `last_lesson_id` (string or null). A shape change bumps `anvil_state_version` and requires the `anvil state-migrate` subcommand (same discipline as the three first-class schemas; scheduled with the first bump, not ahead of it). (source: `00_Architecture.md` Section 3 "Runtime state file shape")
  - `stubVerify` replaced by a handler accepting:
    - `--task <id>` - required.
    - `--contract <path>`, `--plan <path>` - optional with same defaults.
    - `--worktree <path>` - required; names the worktree the `verifying` skill should read.
    - Process:
      1. Loads contract and plan as above.
      2. Runs `verifier.verifyAll({ worktreePath, contract, diffPath: <worktree>/anvil/diff.patch, toolOutputPath: <worktree>/anvil/tool-output.jsonl })`.
      3. Writes the structured result to stdout as JSON. Stage 2 stdout emission is the authoritative current behaviour; Stage 3 extends this handler to persist `<worktree>/anvil/verify/verify-result.json` per Section 3 Verify-result persistence of the architecture document.
      4. Exits 0 on `allGreen: true`, non-zero with `E_VERIFY` on `allGreen: false`.
  - Every other Stage 0 and Stage 1 dispatch entry preserved unchanged.
  - `--help` output extended to document `--task`, `--contract`, `--plan`, `--dispatcher`, `--worktree` flags.

#### Decisions already made

- Subcommand shapes from `04_Anatomy.md` One CLI binary table: `anvil run [--task <id>]`; `anvil verify [--task <id>]`. (source: 04_Anatomy.md One CLI binary)
- `anvil run` runs the loop for one task or the whole plan. (source: 04_Anatomy.md One CLI binary; 03_The_Core_Loop.md phase 4)
- `anvil verify` runs just the Verify gate. (source: 04_Anatomy.md One CLI binary; 03_The_Core_Loop.md phase 6)
- Stage 2 supports sequential within-wave execution; parallel dispatch is tied to Stage 4's hook wiring. (source: 03_The_Core_Loop.md Parallelism; 00_Architecture.md Section 4 Stage 4 produces row)
- Every CLI subcommand exits 0 on success, non-zero with `{error, code, details}` JSON on stderr. (source: 00_Architecture.md Section 3 Error format; Invariant 5)
- The `--dispatcher` flag accepts exactly two identifiers in v1: `anvil_subagent` (default; stubbed in Stage 2 for the fixture-repo-node loop test; wired live in Stage 4) and `stub` (test-only). Unknown identifiers return `E_UNKNOWN_DISPATCHER`. No other dispatcher identifier exists in v1. (source: 00_Architecture.md Section 3 "Dispatcher identifiers")
- Per-task state is written to `anvil/state.json`; `/continue` reads this file. The file shape (top-level fields `anvil_state_version`, `run_id`, `contract_path`, `plan_path`, `current_wave`, `tasks`; per-task subfields `status`, `worktree_path`, `started_at`, `finished_at`, `loop_count`, `last_verify_result`, `last_judge_result`, `last_lesson_id`) is authoritatively defined at architecture time. (source: 00_Architecture.md Section 3 "Runtime state file shape")
- A state-file shape change bumps `anvil_state_version` and requires an `anvil state-migrate` subcommand, same discipline as the three first-class schemas. Stage 2 writes the initial version and does not author the migration subcommand ahead of a bump. (source: 00_Architecture.md Section 3 "Runtime state file shape")
- Verify-result persistence is deferred to Stage 3 per Section 3 Verify-result persistence; Stage 2 produces the stdout emission path only. (source: 00_Architecture.md Section 3 Verify-result persistence)

#### Tests or fixtures

- `tests/unit/executor.test.js` (Task 2.5) and `tests/unit/verifier.test.js` (Task 2.7) cover the underlying modules.
- `tests/loop/fixture-repo-node/` (Task 2.13) exercises the end-to-end `anvil run` + `anvil verify` path against a real worktree.

#### Verification command

```
node dg-anvil/cli/anvil.js run --help 2>/dev/null || true && node dg-anvil/cli/anvil.js verify --help 2>/dev/null || true && node -e "const a=require('./dg-anvil/cli/anvil.js'); if(typeof a.main!=='function'){process.exit(1)}"
```

Expected exit 0.

#### Done when

`anvil run --task <id>` dispatches the executor and the verifier against a loaded contract and plan, captures state to `anvil/state.json`, and exits 0 on all-green; `anvil verify --task <id> --worktree <path>` runs the verifier and exits 0 on all-green; every other dispatch entry is preserved.

### Task 2.13: Ship the first loop-test fixture `fixture-repo-node`

#### Goal

Create `tests/loop/fixture-repo-node/` as a minimal node.js repository with a hand-authored `anvil/contract.yml` and `anvil/plan.yml` for a trivial test task. The loop test runs the contract + plan through Execute + Verify and asserts Verify-pass. This is the Stage 2 exit-criteria artefact.

#### Inputs

- `reports/Anvil-Design/11_Implementation_Plan.md` Stage 2 ("Stage 2 is complete when a hand-authored contract + plan for a trivial test task runs end-to-end to Verify-pass").
- `reports/Anvil-Design/05_The_Contract.md` Format section.
- `reports/DG-Anvil/00_Architecture.md` Section 4 (Stage 2 produces row), Section 7 (Loop tests).
- `dg-anvil/cli/lib/executor.js`, `verifier.js`, `worktree.js` (from Tasks 2.2, 2.4, 2.6).
- `dg-anvil/cli/anvil.js` (wired in Task 2.12).

#### Outputs

- `dg-anvil/tests/loop/fixture-repo-node/README.md`
  - A short file (a few lines) naming the fixture, its trivial task, and the command `node --test ../loop.test.js` that runs the loop test against it. Stage 2 writes this `README.md` inside the fixture directory; this is not the plugin-level `README.md` (that is Stage 4's responsibility). No persona phrasing; no forbidden markers.
- `dg-anvil/tests/loop/fixture-repo-node/package.json`
  - Minimal `{ "name": "fixture-repo-node", "version": "0.1.0", "engines": { "node": ">=20.0.0" }, "scripts": { "test": "node --test" }, "dependencies": {}, "devDependencies": {} }`.
- `dg-anvil/tests/loop/fixture-repo-node/.gitattributes`
  - `* text=auto eol=lf`.
- `dg-anvil/tests/loop/fixture-repo-node/src/sum.js`
  - A single exported function `sum(a, b)` returning `a + b`. CommonJS. Implemented as the known-good target so Verify passes.
- `dg-anvil/tests/loop/fixture-repo-node/src/index.js`
  - Imports `sum` from `./sum.js` and exports a wrapper `main` that calls `sum` at a specific line range. This is the Wired-probe entry point.
- `dg-anvil/tests/loop/fixture-repo-node/tests/sum.test.js`
  - `node:test` file asserting `sum(1, 2) === 3` and `sum(0, 0) === 0`.
- `dg-anvil/tests/loop/fixture-repo-node/anvil/contract.yml`
  - Hand-authored contract with:
    - `anvil_contract_version: 1`, `goal`, `created`, `source_intent`.
    - One criterion `C1` with all four verification levels populated:
      - `exists`: `file: src/sum.js`, `symbol: sum`, `signature: "(a, b) -> number"`.
      - `substantive`: `must_implement: ["returns numeric sum of a and b"]`, `must_not: ["body raises NotImplementedError", "body returns null unconditionally"]`.
      - `wired`: `call_site: { file: src/index.js, line_range: [1, 20], must_contain_symbol: sum }`.
      - `functional`: `probe: { runner: "node --test", target: "tests/sum.test.js", must_pass: ["sum of 1 and 2 is 3", "sum of 0 and 0 is 0"], exit_code: 0 }`.
    - Optional `invariants: { no_new_dependencies: true, coverage: { new_code_minimum: 50 } }`.
- `dg-anvil/tests/loop/fixture-repo-node/anvil/plan.yml`
  - `anvil_plan_version: 1`.
  - One task `T0`: `id: T0`, `wave: 0`, `title: "verify sum trivially"`, `criterion_ids: ["C1"]`, `depends_on: []`, `loop_cap: 3`.
- `dg-anvil/tests/loop/fixture-repo-node/loop.test.js`
  - Uses `node:test` and `node:assert`.
  - Loop-test setup:
    1. Copies the fixture repo into a disposable temp directory via `fs.cpSync(..., { recursive: true })`.
    2. Initialises git in the temp directory and creates a baseline commit.
    3. Invokes `anvil run --task T0 --contract anvil/contract.yml --plan anvil/plan.yml --dispatcher stub` where the stub dispatcher is a built-in loop-test dispatcher that produces a no-op diff (the fixture already contains the known-good implementation, so Verify passes against the baseline commit without any code change).
    4. Asserts the CLI exits 0.
    5. Reads `anvil/state.json` and asserts `anvil_state_version === 1`, `tasks.T0.status === 'passed'` (per the status enumeration in `00_Architecture.md` Section 3 "Runtime state file shape"), and `tasks.T0.last_verify_result.allGreen === true`.
    6. Asserts the worktree under `.anvil-worktrees/task-T0` has been removed (no orphan worktrees).
    7. Tears down the temp directory.
  - Taxonomy citation: first line `// loop test for Stage 2; exercises row 8 (Claim-without-evidence) via behavioural Verify`. (The loop test stands in as the final integration check for Stage 2, not as a replacement for the paired pressure tests authored in Tasks 2.10 and 2.11.)
  - CommonJS.

#### Decisions already made

- Stage 2 ships the first loop-test fixture repo (`fixture-repo-node`). (source: 00_Architecture.md Section 4 Stage 2 produces row; Section 7 Loop tests)
- Stage 2 is complete when a hand-authored contract + plan for a trivial test task runs end-to-end to Verify-pass. (source: 11_Implementation_Plan.md Stage 2)
- The loop test runs `/start` through `/ship` against a fixture repository in later stages; Stage 2's loop-test scope is `anvil run` + `anvil verify` only, so the test's assertions stop at Verify-pass. (source: 00_Architecture.md Section 7 Loop tests; Section 8 Stage 2 out-of-scope excludes Ship and Court)
- The fixture repo is JavaScript because Stage 2 supports JavaScript Wired-probe walking; Python and Go fixtures land in Stages 3 and 4. (source: 00_Architecture.md Section 4 Stage 3 and Stage 4 produces rows)
- The Stage 2 loop test uses the stub dispatcher because the real subagent dispatcher's host wiring lands in Stage 4. (source: 00_Architecture.md Section 8 Stage 2 out-of-scope; Stage 4 produces row)
- The fixture's contract covers all four verification levels per `05_The_Contract.md` Format; it does not save otherwise. (source: 05_The_Contract.md Format; 02_Design_Thesis.md architectural consequence 1)
- Zero runtime dependencies in the fixture. (source: 00_Architecture.md Section 3 Runtime; Invariant 11 applies to the plugin and to fixtures)

#### Tests or fixtures

- `dg-anvil/tests/loop/fixture-repo-node/loop.test.js` is the loop test authored in this task.

#### Verification command

```
node --test dg-anvil/tests/loop/fixture-repo-node/loop.test.js
```

Expected exit 0.

#### Done when

`tests/loop/fixture-repo-node/` contains a minimal node.js repo plus `anvil/contract.yml`, `anvil/plan.yml`, and `loop.test.js`; the loop test invokes `anvil run --task T0` with the stub dispatcher, asserts exit 0 and `allGreen: true`, and the worktree is cleaned up.

### Task 2.14: Finalize `commands/continue.md`

#### Goal

Replace the Stage 1 `commands/continue.md` skeleton with the finalized command that reads `anvil/state.json` and resumes execution at the next incomplete task via `anvil run`.

#### Inputs

- `reports/Anvil-Design/04_Anatomy.md` Five slash commands table (`/continue` row: "Resume from saved state. Reads `anvil/contract.yml` and `anvil/plan.yml`; picks up at the next incomplete task.").
- `reports/DG-Anvil/00_Architecture.md` Section 4 (Stage 2 produces row for `commands/continue.md`).
- `reports/DG-Anvil/plans/stage_1_contract_and_plan.md` Task 1.18 (Stage 1 skeleton contract).
- `dg-anvil/commands/continue.md` (Stage 1 skeleton).

#### Outputs

- `dg-anvil/commands/continue.md`
  - Frontmatter (YAML, fenced with triple-dash): `name: continue`, `description: Resume from saved state. Reads anvil/state.json and picks up at the next incomplete task.`, `arguments: []`.
  - Body: imperative instructions:
    1. Read `anvil/state.json` via `cli/lib/io.js` `readFileUtf8`. If the file does not exist, exit with `{error: "no state to continue from", code: "E_STATE", details: {}}`.
    2. Load `anvil/contract.yml` via `cli/lib/contract.js` `loadAndValidate`.
    3. Load `anvil/plan.yml` via `cli/lib/plan.js` `loadAndValidate(path, contract)`.
    4. Iterate the plan's waves in topological order. For the first task whose `state.tasks[task.id].status` is not `'passed'`, invoke `anvil run --task <id>`. The dispatcher identifier defaults to `anvil_subagent` per `00_Architecture.md` Section 3 "Dispatcher identifiers"; `state.run_id` is preserved across the resumption.
    5. If every task is already `'passed'`, exit 0 with `{ok: true, all_passed: true}` on stdout.
    6. If the resumed task fails, exit non-zero with the structured `E_VERIFY` error from the verifier (propagated by `anvil run`).
  - No persona phrasing; no forbidden markers.

#### Decisions already made

- `/continue` reads `anvil/contract.yml` and `anvil/plan.yml` and picks up at the next incomplete task. (source: 04_Anatomy.md Five slash commands table)
- Task-level continuation is finalized in Stage 2. (source: 00_Architecture.md Section 4 Stage 2 produces row for `commands/continue.md`)
- `anvil/state.json` is the per-repo runtime state file; its shape is authoritatively defined with top-level keys `anvil_state_version`, `run_id`, `contract_path`, `plan_path`, `current_wave`, `tasks` and per-task subfields `status` (one of `queued`, `running`, `verified`, `judged`, `passed`, `failed`, `escalated`), `worktree_path`, `started_at`, `finished_at`, `loop_count`, `last_verify_result`, `last_judge_result`, `last_lesson_id`. (source: 00_Architecture.md Section 3 "Runtime state file shape")
- Error code `E_STATE` is added to `cli/lib/errors.js` as part of Task 2.2's edit. (source: 00_Architecture.md Section 3 Error format; Task 2.2)
- No persona phrasing. (source: 00_Architecture.md Section 6 Invariant 4)

#### Tests or fixtures

- The loop test in Task 2.13 exercises the resumption path indirectly when `loop.test.js` inspects `anvil/state.json` after `anvil run` completes.

#### Verification command

```
test -f dg-anvil/commands/continue.md && grep -qE 'name: continue' dg-anvil/commands/continue.md && grep -qE 'state.json' dg-anvil/commands/continue.md && grep -qE 'anvil run --task' dg-anvil/commands/continue.md && ! grep -qE 'E_NOT_IMPLEMENTED' dg-anvil/commands/continue.md
```

Expected exit 0.

#### Done when

`commands/continue.md` names `anvil/state.json`, names `anvil run --task <id>` as the resumption handler, and no longer emits `E_NOT_IMPLEMENTED` for task-level continuation.

## Invariants Check

- Invariant 1 (No advisory hooks): Stage 2 adds no hooks. Hooks remain as Stage 0 set them. No new advisory behaviour introduced. Verified by the absence of any hook-file edit in the Stage 2 produces list.
- Invariant 2 (No fallback light-paths): `cli/anvil.js` additions do not introduce `fast`, `quick`, `do`, `skip`, or `override` subcommands. `cli/lib/executor.js`, `verifier.js`, `worktree.js`, and `commands/continue.md` do not declare light-paths. Verified by `grep -iE "(--fast|--quick|--skip|--override|/fast|/quick|/do|/skip|/override)" dg-anvil/cli dg-anvil/commands dg-anvil/skills` returning exit 1.
- Invariant 3 (No unshipped markers): `grep -rE "(TODO|FIXME|XXX|HACK|TBD|WIP|NOTE:)" dg-anvil/cli/lib/executor.js dg-anvil/cli/lib/verifier.js dg-anvil/cli/lib/worktree.js dg-anvil/skills/executing dg-anvil/skills/verifying dg-anvil/commands/continue.md dg-anvil/tests/unit/executor.test.js dg-anvil/tests/unit/verifier.test.js dg-anvil/tests/unit/worktree.test.js dg-anvil/tests/pressure/executing.pressure.js dg-anvil/tests/pressure/verifying.pressure.js dg-anvil/tests/loop/fixture-repo-node` returns exit 1. `dg-anvil/docs/failure-taxonomy.md` (unchanged in Stage 2) is excluded as in Stages 0 and 1. Fixture bad-example strings containing `TODO` inside a quoted scalar as a Substantive-probe negative example remain permitted per Stage 1's exemption.
- Invariant 4 (No persona definitions): `grep -rE "as a senior engineer|as a security auditor|as a test engineer|you are an expert in" dg-anvil/skills/executing dg-anvil/skills/verifying dg-anvil/commands/continue.md dg-anvil/cli/lib/executor.js dg-anvil/cli/lib/verifier.js dg-anvil/cli/lib/worktree.js dg-anvil/tests/loop/fixture-repo-node` returns exit 1.
- Invariant 5 (Structured errors on every exit): every Stage 2 CLI path (`anvil run`, `anvil verify`) and every exported module function either returns a structured success value or throws `{error, code, details}`. Verified by the unit tests in Tasks 2.3, 2.5, 2.7 and the loop test in Task 2.13. Specifically: `anvil run` with an invalid `--task` id exits non-zero with `E_MISSING_ARG` or `E_VERIFY`; `anvil verify` without `--worktree` exits non-zero with `E_MISSING_ARG`; `anvil run --dispatcher <unknown>` exits non-zero with `E_UNKNOWN_DISPATCHER` per `00_Architecture.md` Section 3 "Dispatcher identifiers"; the Wired probe invoked against a language not yet supported at Stage 2 scope returns `E_UNSUPPORTED_LANGUAGE` per `00_Architecture.md` Section 3 "Wired-probe language support"; the Substantive probe invoked with missing coverage tooling returns `E_COVERAGE_UNAVAILABLE` per `00_Architecture.md` Section 3 "Coverage tooling". The Stage 2 additions to `cli/lib/errors.js` (Task 2.2) are `E_WORKTREE_CREATE`, `E_WORKTREE_REMOVE`, `E_EXECUTOR`, `E_VERIFY`, `E_STATE`, `E_UNKNOWN_DISPATCHER`, `E_UNSUPPORTED_LANGUAGE`, `E_COVERAGE_UNAVAILABLE`.
- Invariant 6 (Six canonical skill sections): `skills/executing/SKILL.md` and `skills/verifying/SKILL.md` both have the six H2 headers in order, no additional H2 headings. Verified by the awk header-extraction command on each file.
- Invariant 7 (Schema changes require a migration): Stage 2 does not change any schema. The only registered code additions (`E_WORKTREE_CREATE`, `E_WORKTREE_REMOVE`, `E_EXECUTOR`, `E_VERIFY`, `E_STATE`, `E_UNKNOWN_DISPATCHER`, `E_UNSUPPORTED_LANGUAGE`, `E_COVERAGE_UNAVAILABLE`) are error codes, not schema fields. No migration subcommand change required. Verified by the unchanged state of `cli/contract-schema.json`, `cli/plan-schema.json`, `cli/ledger-schema.json`.
- Invariant 8 (Skill changes require RED-then-GREEN pressure transcript): Stage 2 finalizes `skills/executing/SKILL.md` and `skills/verifying/SKILL.md`. Both have paired pressure tests authored in the same stage: `tests/pressure/executing.pressure.js` (Task 2.10) and `tests/pressure/verifying.pressure.js` (Task 2.11). Verified by the existence and taxonomy-row citation checks in the Exit Criteria.
- Invariant 9 (Polyglot hooks with graceful degradation): Stage 2 adds no hooks. Not modified.
- Invariant 10 (UTF-8 LF encoding): every file authored in Stage 2 is written UTF-8 without BOM with LF line endings. Verified by `file` inspection of a sample.
- Invariant 11 (Zero runtime dependencies): `package.json` `dependencies` and `devDependencies` remain empty. Every Stage 2 module imports only Node builtins and `cli/lib/*.js`. `tests/loop/fixture-repo-node/package.json` also declares zero dependencies. Verified by `node -e "const p=require('./dg-anvil/package.json'); if(Object.keys(p.dependencies||{}).length||Object.keys(p.devDependencies||{}).length){process.exit(1)}"` and the equivalent check against the fixture `package.json`.
- Invariant 12 (Failure-taxonomy row citation): `tests/pressure/executing.pressure.js` cites rows 1 and 16; `tests/pressure/verifying.pressure.js` cites rows 8 and 13; `tests/loop/fixture-repo-node/loop.test.js` cites row 8 as the integration-level taxonomy anchor. Verified by grep.
- Invariant 13 (Fresh-subagent discipline): `cli/lib/executor.js` carries no module-level mutable state; `MUTABLE_STATE` is `Object.freeze({})`; every `executeTask` call freezes the briefing before passing to the dispatcher; `tests/unit/executor.test.js` (Task 2.5) and `tests/pressure/executing.pressure.js` (Task 2.10) both assert no state is carried across dispatches. This is the stage where Invariant 13 first applies because Stage 2 is the first stage that dispatches subagents at runtime. Verified by the unit test and the pressure test.
- Invariant 14 (Evidence-only Court inputs): Stage 2 does not touch `cli/lib/court.js` (Stage 3). N/A at Stage 2. The executor's briefing intentionally does not compose any Court input; the Court is a Stage 3 primitive.
- Invariant 15 (Null-lesson prohibition): Stage 2's ledger remains read-only from Stage 1. No reset path is authored in Stage 2; resetting is Stage 3. N/A at Stage 2.
- Invariant 16 (No auto-pick gates): Stage 2 introduces no gates beyond the four-level Verify, which is not a list-of-N gate. `anvil run`'s per-task result is a binary pass/fail. Verified by the loop test asserting exit 0 on all-green and non-zero on any-fail.
- Invariant 17 (Single-writer discipline for the ledger): `cli/lib/executor.js`, `verifier.js`, `worktree.js` do not contain the literal path `~/.anvil/ledger.jsonl`. The ledger write path stays in `cli/lib/ledger-write.js`, which is Stage 3. Verified by `grep -n '~/.anvil/ledger.jsonl' dg-anvil/cli/lib/executor.js dg-anvil/cli/lib/verifier.js dg-anvil/cli/lib/worktree.js` returning exit 1.
- Invariant 18 (Trace fields are closed): Stage 2 does not write trace events. The executor records `briefingHash` so the Stage 4 `post-tool-use` hook can populate the `tool_input_hash` field of a trace event; Stage 2 does not write the event itself. N/A at Stage 2 as a write-side assertion.

## Exit Criteria

```
set -e
# 1. Every Stage 2 produced file exists.
for f in \
  dg-anvil/cli/lib/executor.js \
  dg-anvil/cli/lib/verifier.js \
  dg-anvil/cli/lib/worktree.js \
  dg-anvil/skills/executing/SKILL.md \
  dg-anvil/skills/verifying/SKILL.md \
  dg-anvil/commands/continue.md \
  dg-anvil/tests/unit/executor.test.js \
  dg-anvil/tests/unit/verifier.test.js \
  dg-anvil/tests/unit/worktree.test.js \
  dg-anvil/tests/pressure/executing.pressure.js \
  dg-anvil/tests/pressure/verifying.pressure.js \
  dg-anvil/tests/loop/fixture-repo-node/README.md \
  dg-anvil/tests/loop/fixture-repo-node/package.json \
  dg-anvil/tests/loop/fixture-repo-node/.gitattributes \
  dg-anvil/tests/loop/fixture-repo-node/src/sum.js \
  dg-anvil/tests/loop/fixture-repo-node/src/index.js \
  dg-anvil/tests/loop/fixture-repo-node/tests/sum.test.js \
  dg-anvil/tests/loop/fixture-repo-node/anvil/contract.yml \
  dg-anvil/tests/loop/fixture-repo-node/anvil/plan.yml \
  dg-anvil/tests/loop/fixture-repo-node/loop.test.js; do test -f "$f"; done
# 2. Stage 2 error codes registered in cli/lib/errors.js.
node -e "const e=require('./dg-anvil/cli/lib/errors.js'); for(const k of ['E_WORKTREE_CREATE','E_WORKTREE_REMOVE','E_EXECUTOR','E_VERIFY','E_STATE','E_UNKNOWN_DISPATCHER','E_UNSUPPORTED_LANGUAGE','E_COVERAGE_UNAVAILABLE']){if(e.CODES[k]!==k){process.exit(1)}}"
# 3. Stage 2 unit tests pass.
node --test dg-anvil/tests/unit/executor.test.js
node --test dg-anvil/tests/unit/verifier.test.js
node --test dg-anvil/tests/unit/worktree.test.js
# 4. Stage 2 pressure tests pass.
node --test dg-anvil/tests/pressure/executing.pressure.js
node --test dg-anvil/tests/pressure/verifying.pressure.js
# 5. Stage 1 unit tests still pass (regression guard).
node --test dg-anvil/tests/unit/contract.test.js dg-anvil/tests/unit/plan.test.js dg-anvil/tests/unit/ledger.test.js dg-anvil/tests/unit/yaml.test.js
# 6. Stage 0 and Stage 1 pressure tests still pass.
node --test dg-anvil/tests/pressure/authoring-skills.pressure.js
node --test dg-anvil/tests/pressure/contracting.pressure.js
node --test dg-anvil/tests/pressure/planning.pressure.js
# 7. Wired CLI subcommands behave (regression + new).
node dg-anvil/cli/anvil.js contract --validate dg-anvil/docs/contract-examples/good/rate-limit-001.yml
node dg-anvil/cli/anvil.js plan --validate dg-anvil/docs/plan-examples/good/rate-limit-001.yml --contract dg-anvil/docs/contract-examples/good/rate-limit-001.yml
node dg-anvil/cli/anvil.js ledger query rate-limit
# 8. The Stage 2 exit-criteria artefact: the loop test runs the contract + plan through Execute + Verify to Verify-pass.
node --test dg-anvil/tests/loop/fixture-repo-node/loop.test.js
# 9. No unshipped markers in Stage 2 files outside the copied failure taxonomy.
! grep -rE "(TODO|FIXME|XXX|HACK|TBD|WIP|NOTE:)" dg-anvil/cli/lib/executor.js dg-anvil/cli/lib/verifier.js dg-anvil/cli/lib/worktree.js dg-anvil/skills/executing dg-anvil/skills/verifying dg-anvil/commands/continue.md dg-anvil/tests/unit/executor.test.js dg-anvil/tests/unit/verifier.test.js dg-anvil/tests/unit/worktree.test.js dg-anvil/tests/pressure/executing.pressure.js dg-anvil/tests/pressure/verifying.pressure.js dg-anvil/tests/loop/fixture-repo-node
# 10. Stage 2 skills have exactly the six canonical H2 headers.
for s in executing verifying; do
  headers=$(awk '/^## /{print $0}' dg-anvil/skills/$s/SKILL.md | tr '\n' '|')
  test "$headers" = "## Overview|## When to Use|## Process|## Rationalizations|## Red Flags|## Verification|"
done
# 11. Fresh-subagent discipline: executor carries no module-level state.
node -e "const ex=require('./dg-anvil/cli/lib/executor.js'); if(!Object.isFrozen(ex.MUTABLE_STATE) || Object.keys(ex.MUTABLE_STATE).length!==0){process.exit(1)}"
# 12. Single-writer discipline for the ledger: no Stage 2 module encodes the literal ledger path.
! grep -nE '~/\\.anvil/ledger\\.jsonl' dg-anvil/cli/lib/executor.js dg-anvil/cli/lib/verifier.js dg-anvil/cli/lib/worktree.js
# 13. Substantive check: the Rationalizations section of skills/executing/SKILL.md contains at least one entry whose text includes the word "fresh" (ensures the fresh-subagent discipline is discussed, not just named in a section header).
awk '/^## Rationalizations$/{flag=1; next} /^## /{flag=0} flag' dg-anvil/skills/executing/SKILL.md | grep -qi 'fresh'
# 14. Second substantive check: the Red Flags section of skills/verifying/SKILL.md contains the literal phrase "the test passed" AND the phrase "what it actually covers" on the same entry (a row-13 mock-tautology defeater).
awk '/^## Red Flags/,/^## /{print}' dg-anvil/skills/verifying/SKILL.md | grep -q 'the test passed'
awk '/^## Red Flags/,/^## /{print}' dg-anvil/skills/verifying/SKILL.md | grep -q 'what it actually covers'
echo "stage 2 exit criteria: pass"
# Expected exit 0.
```

## Handoff to Next Stage

Stage 3 consumes from Stage 2 the items listed in Section 4 Stage 3 "Consumes from prior stage" column:

- produces `cli/lib/executor.js` for Stage 3 to use as the per-task dispatcher whose output (diff, captured tool output, worktree path) feeds the Court and (on failure) the `resetting` skill.
- produces `cli/lib/verifier.js` for Stage 3 to use as the four-level probe that `resetting` reads to phrase the `contract_gap` in a new Ledger entry and that the Court's Pass 1 reads as the evidence of record.
- produces `cli/lib/worktree.js` for Stage 3 to use as the worktree manager `resetting` invokes to kill a failed session's worktree before re-queueing the task.
- produces `cli/lib/contract.js` for Stage 3 to continue using as the contract parser; Stage 3's `cli/lib/court.js` calls `loadAndValidate` when composing the Court's briefing (Court input is exactly contract + diff + verify output per Invariant 14).
- produces `cli/lib/plan.js` for Stage 3 to continue using as the plan parser; Stage 3's escalation path reads the plan to mark a task as escalated.
- produces `cli/lib/ledger.js` for Stage 3 to extend with `cli/lib/ledger-write.js` (finalizes the append path and index maintenance).
- produces `commands/start.md` for Stage 3 to continue using as the entry point; Stage 3 does not modify it.
- produces `commands/continue.md` for Stage 3 to continue using as the resumption handler; Stage 3 does not modify it.

## Known Non-Goals for This Stage

- Court dispatch or verdict parsing (Stage 3) (picked up in Stage 3).
- Ledger write path (Stage 3) (picked up in Stage 3).
- `resetting` skill (Stage 3) (picked up in Stage 3).
- Observability hooks (Stage 4) (picked up in Stage 4).
- Metrics (Stage 4) (picked up in Stage 4).
- Ship (Stage 4) (picked up in Stage 4).
