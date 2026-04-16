# Stage 4 Plan - Observability and Ship

## Frontmatter

```yaml
stage: 4
stage_name: Observability and Ship
prerequisites:
  architecture_doc: reports/DG-Anvil/00_Architecture.md
  anvil_design_sections:
    - reports/Anvil-Design/08_Observability_and_Calibration.md
    - reports/Anvil-Design/11_Implementation_Plan.md
    - reports/Anvil-Design/10_Anti-Patterns_Defeated.md
    - reports/Anvil-Design/04_Anatomy.md
    - reports/Anvil-Design/07_The_Court.md
    - reports/Anvil-Design/03_The_Core_Loop.md
    - reports/Anvil-Design/02_Design_Thesis.md
    - reports/Anvil-Design/05_The_Contract.md
  prior_stage_plan: reports/DG-Anvil/plans/stage_3_court_and_ledger.md
produces:
  - hooks/session-start
  - hooks/pre-tool-use
  - hooks/post-tool-use
  - hooks/user-prompt-submit
  - hooks/stop
  - cli/lib/metrics.js
  - cli/lib/trace.js
  - cli/lib/hooks.js
  - commands/ship.md
  - README.md
  - docs/failure-taxonomy.md
  - tests/loop/fixture-repo-go/
  - tests/loop/loop.test.js
  - tests/unit/metrics.test.js
  - tests/unit/trace.test.js
  - tests/unit/hooks.test.js
  - cli/anvil.js
  - cli/lib/verifier.js
  - cli/lib/court.js
  - cli/lib/subagent-bridge.js
  - tests/unit/subagent-bridge.test.js
  - tests/cassettes/pressure/.gitkeep
  - tests/loop/seeded-faults/.gitkeep
  - cli/lib/escalation.js
  - tests/unit/escalation.test.js
```

## Scope

### In scope

- `hooks/session-start` finalized. Delegates to `node dg-anvil/cli/anvil.js hook session-start`; the internal handler emits one structured trace event on every Claude Code session start (`phase: "hook"`, `outcome: "start"`, `meta: {hook: "session-start", loaded_skill: "using-anvil"}`) and loads the `using-anvil` meta-skill. No `echo`, no `printf`, no stderr redirection; the only stderr path is a structured JSON error via `cli/lib/errors.js`.
- `hooks/pre-tool-use` finalized. Blocks destructive patterns (`rm -rf`, `git push --force`, `git config`, `npm publish`) and `no_secret_patterns` invariant matches on the active contract. Emits a structured block event and exits non-zero. Ship-phase bypass requires an explicit approval token from the orchestrator; no silent bypass.
- `hooks/post-tool-use` finalized. Unconditional append of one row to `./anvil/trace.jsonl` per tool call, via `cli/lib/trace.js`. Event shape matches Section 3 "Trace event format" exactly (Invariant 18).
- `hooks/user-prompt-submit` finalized. Routes: contracting when contract exists and is unconfirmed; escalation handler when escalation is active; otherwise passthrough.
- `hooks/stop` finalized. Replays the active contract against HEAD; on any failing criterion, writes a lesson via `cli/lib/ledger-write.js` and blocks the stop until the lesson is recorded.
- `cli/lib/trace.js` atomic append writer for `./anvil/trace.jsonl`. Called by hooks and by the orchestrator. Event shape is closed per Section 3; out-of-schema fields throw `E_INVALID_TRACE_EVENT`.
- `cli/lib/metrics.js` reads `./anvil/trace.jsonl` and `~/.anvil/ledger.jsonl`; computes the metrics catalogue from `08_Observability_and_Calibration.md`; emits the calibration report (agent calibration table and claim-vs-evidence table); returns non-zero exit from `anvil metrics` when theatre-drift index exceeds 15 percent.
- `cli/lib/hooks.js` the centralised hook-policy module that the four polyglot hook scripts (`pre-tool-use`, `post-tool-use`, `user-prompt-submit`, `stop`) invoke via `anvil hook <event>` sub-dispatch. Required by Invariant 1 (no advisory hooks) because hook policy cannot live in bash alone without duplication; centralising the policy in Node keeps the four polyglot scripts as thin delegators and keeps the block/emit logic in one testable source. Sourced to `00_Architecture.md` Section 2 (source tree entry `cli/lib/hooks.js` as a peer of the other `cli/lib/*.js` modules) and Section 4 (Stage 4 produces row).
- `commands/ship.md` the `/ship` command. Runs contract replay from a clean worktree. Dispatches the whole-branch Court (extending `cli/lib/court.js` with a branch-diff acceptance path, same input-isolation discipline). Opens PR via `gh` CLI. The only command in v1 that crosses the sandbox boundary. Requires human merge.
- `README.md` finalized, maximum 500 lines per documentation policy. Install, one example, pointer to `reports/Anvil-Design/`.
- `docs/failure-taxonomy.md` finalized. Reviews the Stage 0 copy of `10_Anti-Patterns_Defeated.md` and extends only if new taxonomy rows were added during Stages 1-3; if none, confirms byte-identical to the Stage 0 copy.
- `tests/loop/fixture-repo-go/` third loop-test fixture. Go repository that exercises Go Wired-probe language support added this stage per Section 3 "Wired-probe language support". Minimum one end-to-end task.
- `tests/loop/loop.test.js` orchestrates all three fixture repos. Covers three repositories and three languages (JavaScript from `fixture-repo-node`, Python from `fixture-repo-python`, Go from `fixture-repo-go`), satisfying both the Stage 4 completion bar and the v1 success-criteria bar. Sourced to `00_Architecture.md` Section 4 Stage 4 produces row.
- `tests/unit/metrics.test.js` asserts every metric from the catalogue; asserts theatre-drift threshold exit behaviour.
- `tests/unit/trace.test.js` asserts event-shape validation, atomic append under concurrent writes, `E_INVALID_TRACE_EVENT` rejection of out-of-schema fields.
- `tests/unit/hooks.test.js` asserts block-on-destructive-pattern behaviour (each entry in `DESTRUCTIVE_PATTERNS` triggers `E_HOOK_BLOCKED`); asserts the `no_secret_patterns` invariant check blocks when a contract-declared regex matches tool input; asserts the ship-phase approval-token bypass allows destructive patterns when a valid token is present and rejects with `E_SHIP_APPROVAL_TOKEN_INVALID` when absent or stale; asserts passthrough for non-blocking events (`post-tool-use`, `user-prompt-submit` passthrough route, `stop` with no active contract).
- `cli/anvil.js` wired subcommands `anvil metrics`, `anvil audit`, `anvil ship`, and the internal `anvil hook` sub-dispatch (with sub-subcommands `session-start`, `pre-tool-use`, `post-tool-use`, `user-prompt-submit`, `stop`) invoked by the polyglot hook scripts. Live `anvil_subagent` dispatcher path for the executor and the Court is wired this stage (replacing the Stage 2 and Stage 3 stub-only path for production use).
- `cli/lib/verifier.js` extended to add Go support (Wired-probe walker, `go test -coverprofile` coverage tooling, `go test` functional runner).
- `cli/lib/court.js` extended with a `judgeBranch` entry point that accepts a branch-diff input and a full contract. Same structural input-isolation discipline as the per-task Court; the whole-branch briefing carries exactly the same four keys.
- `cli/lib/subagent-bridge.js` new. The host-bridge module that `cli/lib/executor.js` and `cli/lib/court.js` both route through when dispatching a subagent. Direct Anthropic API invocation via `https` builtin; authentication via `ANTHROPIC_API_KEY` environment variable; model configurable via `~/.anvil/config.json`. Zero npm dependencies.
- `tests/unit/subagent-bridge.test.js` unit test for the bridge covering request shape, response parsing, error handling on network failure, and model override via config.
- `tests/cassettes/pressure/.gitkeep` reserves the cassette directory that the release checklist populates with recorded responses used by the integration pressure-test pass.
- `tests/loop/seeded-faults/.gitkeep` reserves the seeded-fault corpus directory. The corpus is populated during release preparation and contains real fixture repositories whose runs feed the v1 metrics assertions in Task 4.10.
- `cli/lib/escalation.js` new. Handler body for the escalation surface; exports `listEscalated`, `describeEscalated`, `escalationBanner`. Imports only from Node builtins, `cli/lib/io.js`, `cli/lib/errors.js`. Routed by the `anvil escalation` CLI subcommand and consumed by the `userPromptSubmit` hook handler. Sourced to `00_Architecture.md` Section 3 Escalation handler subsection.
- `tests/unit/escalation.test.js` asserts list returns empty on a clean state, non-empty on a state with escalated tasks, describe raises `E_ESCALATION_TASK_NOT_FOUND` on missing task, banner output matches a snapshot for a fixture state.
- `cli/anvil.js` extended with the `anvil escalation list` and `anvil escalation describe --task <id>` subcommands; `cli/lib/hooks.js` `userPromptSubmit` extended to prepend the escalation banner when any task in state.json has status `escalated`.

### Out of scope

- OpenCode adapter (post-v1 per `11_Implementation_Plan.md` platform coverage section).
- Cursor adapter (post-v1).
- Gemini CLI adapter (post-v1).
- GitHub Copilot CLI adapter (post-v1).
- Multi-user ledger (post-v1).
- Model abstraction layer (post-v1).
- Web dashboard (never, per `11_Implementation_Plan.md` non-goals).
- Custom Verify probe plugins (post-v1).
- Cost dashboard beyond what `anvil metrics` reports (never, per `04_Anatomy.md` "What is deliberately absent").

## Prerequisites Verification

No work begins until every check below exits 0. Any failure stops the stage without writing a file.

1. `test -f dg-anvil/cli/lib/court.js` - exit 0 (Stage 3 Task 3.5 Court module exists).
2. `node -e "const c=require('./dg-anvil/cli/lib/court.js'); for(const f of ['judge','composeBriefing','deriveConfidence']){if(typeof c[f]!=='function'){process.exit(1)}}; for(const k of ['ALLOWED_COURT_BRIEFING_KEYS','FORBIDDEN_COURT_INPUT_KEYS','SUSPICIOUS_STDERR_TOKENS']){if(!Array.isArray(c[k])||!Object.isFrozen(c[k])){process.exit(1)}}; if(!Object.isFrozen(c.MUTABLE_STATE)||Object.keys(c.MUTABLE_STATE).length!==0){process.exit(1)}"` - exit 0 (Court exports `judge`, `composeBriefing`, `deriveConfidence`; the three frozen constants; the fresh-subagent marker).
3. `test -f dg-anvil/cli/lib/ledger-write.js` - exit 0 (Stage 3 Task 3.2 ledger write path exists).
4. `node -e "const w=require('./dg-anvil/cli/lib/ledger-write.js'); for(const f of ['append','appendAbortedLesson','allocateId','updateIndex','markLowEfficacy']){if(typeof w[f]!=='function'){process.exit(1)}}"` - exit 0 (ledger write path exports the five functions).
5. `test -f dg-anvil/cli/ledger-schema.json` - exit 0 (Stage 3 Task 3.1 finalized ledger schema exists).
6. `jq -e '.properties.anvil_ledger_entry_version.const == 1 and (.required | index("contract_gap")) and (.required | index("evidence")) and (.required | index("remediation"))' dg-anvil/cli/ledger-schema.json` - exit 0 (ledger schema finalized with required non-null fields).
7. `test -f dg-anvil/cli/lib/verifier.js` - exit 0 (Stage 2 Task 2.6 verifier exists; Stage 3 Task 3.3 extended to Python).
8. `node -e "const v=require('./dg-anvil/cli/lib/verifier.js'); if(!Array.isArray(v.SUPPORTED_LANGUAGES)||!v.SUPPORTED_LANGUAGES.includes('javascript')||!v.SUPPORTED_LANGUAGES.includes('python')){process.exit(1)}; if(!Object.isFrozen(v.SUPPORTED_LANGUAGES)){process.exit(1)}"` - exit 0 (verifier declares javascript and python; frozen).
9. `test -f dg-anvil/cli/lib/executor.js` - exit 0 (Stage 2 Task 2.4 executor exists).
10. `test -f dg-anvil/cli/lib/worktree.js` - exit 0 (Stage 2 Task 2.2 worktree manager exists).
11. `test -f dg-anvil/cli/lib/ledger.js` - exit 0 (Stage 1 read path plus Stage 3 write delegation exists).
12. `test -f dg-anvil/cli/lib/contract.js` - exit 0 (Stage 1 contract parser exists).
13. `test -f dg-anvil/cli/lib/plan.js` - exit 0 (Stage 1 plan parser exists).
14. `test -f dg-anvil/cli/lib/errors.js` - exit 0 (error module exists).
15. `node -e "const e=require('./dg-anvil/cli/lib/errors.js'); for(const k of ['E_NOT_IMPLEMENTED','E_UNKNOWN_SUBCOMMAND','E_UNKNOWN_FLAG','E_MISSING_ARG','E_INVALID_JSON','E_INVALID_YAML','E_IO','E_INVALID_CONTRACT','E_INVALID_PLAN','E_WORKTREE_CREATE','E_WORKTREE_REMOVE','E_EXECUTOR','E_VERIFY','E_STATE','E_UNKNOWN_DISPATCHER','E_UNSUPPORTED_LANGUAGE','E_COVERAGE_UNAVAILABLE','E_NULL_LESSON','E_INVALID_LESSON','E_INVALID_SUPERSESSION','E_INDEX_DESYNC','E_COURT_INPUT_VIOLATION','E_INVALID_VERDICT','E_RESET_REFUSED','E_ABORT_REASON_REQUIRED']){if(e.CODES[k]!==k){process.exit(1)}}"` - exit 0 (all Stage 0, 1, 2, 3 codes present).
16. `test -f dg-anvil/cli/lib/args.js` - exit 0 (args parser exists).
17. `test -f dg-anvil/cli/lib/io.js` - exit 0 (I/O helper exists; extended in Stage 2 for spawn).
18. `test -f dg-anvil/cli/lib/yaml.js` - exit 0 (YAML parser finalized in Stage 1).
19. `test -f dg-anvil/cli/anvil.js` - exit 0 (CLI skeleton exists, wired through Stage 3).
20. `node -e "const a=require('./dg-anvil/cli/anvil.js'); if(typeof a.main!=='function'){process.exit(1)}"` - exit 0 (CLI exports `main`).
21. `test -f dg-anvil/hooks/pre-tool-use` - exit 0 (Stage 0 exit-0 stub exists).
22. `test -f dg-anvil/hooks/post-tool-use` - exit 0 (Stage 0 exit-0 stub exists).
23. `test -f dg-anvil/hooks/user-prompt-submit` - exit 0 (Stage 0 exit-0 stub exists).
24. `test -f dg-anvil/hooks/stop` - exit 0 (Stage 0 exit-0 stub exists).
25. `test -f dg-anvil/hooks/session-start` - exit 0 (Stage 0 Task 0.12 session-start exists; Stage 4 does not modify it).
26. `test -f dg-anvil/hooks/run-hook.cmd` - exit 0 (Stage 0 polyglot launcher exists).
27. `test -f dg-anvil/hooks/hooks.json` - exit 0 (Stage 0 hooks manifest exists).
28. `test -f dg-anvil/skills/judging/SKILL.md` - exit 0 (Stage 3 Task 3.10 judging skill exists; Stage 4 does not modify it).
29. `test -f dg-anvil/skills/resetting/SKILL.md` - exit 0 (Stage 3 Task 3.11 resetting skill exists; Stage 4 does not modify it).
30. `test -f dg-anvil/commands/abort.md` - exit 0 (Stage 3 Task 3.8 abort command exists; Stage 4 does not modify it).
31. `test -f dg-anvil/commands/ledger.md` - exit 0 (Stage 3 Task 3.8 ledger command exists; Stage 4 does not modify it).
32. `test -f dg-anvil/commands/start.md` - exit 0 (Stage 1 start command exists).
33. `test -f dg-anvil/commands/continue.md` - exit 0 (Stage 2 continue command exists).
34. `test -f dg-anvil/tests/pressure/harness.js` - exit 0 (pressure harness exists).
35. `test -f dg-anvil/tests/loop/fixture-repo-node/loop.test.js` - exit 0 (Stage 2 first loop fixture exists).
36. `test -f dg-anvil/tests/loop/fixture-repo-python/loop.test.js` - exit 0 (Stage 3 second loop fixture exists).
37. `node --test dg-anvil/tests/loop/fixture-repo-node/loop.test.js` - exit 0 (Stage 2 loop test still passes).
38. `node --test dg-anvil/tests/loop/fixture-repo-python/loop.test.js` - exit 0 (Stage 3 loop test still passes or records a structured skip on missing Python).
39. `node --test dg-anvil/tests/unit/executor.test.js dg-anvil/tests/unit/verifier.test.js dg-anvil/tests/unit/worktree.test.js dg-anvil/tests/unit/court.test.js dg-anvil/tests/unit/ledger.test.js dg-anvil/tests/unit/contract.test.js dg-anvil/tests/unit/plan.test.js dg-anvil/tests/unit/yaml.test.js` - exit 0 (all prior-stage unit tests still pass).
40. `node --test dg-anvil/tests/pressure/authoring-skills.pressure.js dg-anvil/tests/pressure/contracting.pressure.js dg-anvil/tests/pressure/planning.pressure.js dg-anvil/tests/pressure/executing.pressure.js dg-anvil/tests/pressure/verifying.pressure.js dg-anvil/tests/pressure/judging.pressure.js dg-anvil/tests/pressure/resetting.pressure.js` - exit 0 (all seven pressure tests still pass).
41. `grep -lnE '~/\\.anvil/ledger\\.jsonl' dg-anvil/cli/lib/*.js | wc -l | grep -q '^1$' && grep -lnE '~/\\.anvil/ledger\\.jsonl' dg-anvil/cli/lib/*.js | grep -q ledger-write.js` - exit 0 (Stage 3 Court structural check: single-writer discipline still holds; ledger path literal in exactly one source file and that file is `ledger-write.js`).
42. `! grep -nE "require\\(.*['\"](\\.\\/)?(plan|ledger|ledger-write)['\"]\\)" dg-anvil/cli/lib/court.js` - exit 0 (Stage 3 Court structural check: Court module does not import Plan or Ledger).
43. `command -v git >/dev/null` - exit 0 (git on PATH).
44. `command -v go >/dev/null` - exit 0 (Go available for `fixture-repo-go` loop test and Go Wired-probe support added in Task 4.7).
45. `command -v gh >/dev/null` - exit 0 (GitHub CLI available for `anvil ship` PR-open path).

If any check fails, stop without writing any file.

## Phased Tasks

### Task 4.1: Author `cli/lib/trace.js` atomic append writer

#### Goal

Ship `cli/lib/trace.js` as the atomic append writer for `./anvil/trace.jsonl`. The event shape is closed per Section 3 "Trace event format" (Invariant 18); any attempt to write a non-schema field throws `E_INVALID_TRACE_EVENT`.

#### Inputs

- `reports/DG-Anvil/00_Architecture.md` Section 3 "Trace event format"; Section 6 (Invariants 3, 5, 11, 18).
- `reports/Anvil-Design/08_Observability_and_Calibration.md` "The trace"; "Event shape"; "What is not captured".
- `dg-anvil/cli/lib/io.js` (Stage 2 finalized; provides `writeFileUtf8`, `ensureDir`, `pathJoin`).
- `dg-anvil/cli/lib/errors.js`.

#### Outputs

- `dg-anvil/cli/lib/trace.js`
  - Exports `writeEvent(event, {tracePath})` that:
    1. Validates `event` against the closed field set: `ts`, `run_id`, `task`, `phase`, `level`, `agent_id`, `tool`, `tool_input_hash`, `outcome`, `evidence_ref`, `duration_ms`, `tokens_in`, `tokens_out`, `cost_usd`, `model`, `confidence`, `meta`. Any key outside this set throws `E_INVALID_TRACE_EVENT` with `details = {extraneous_keys, allowed_keys}`.
    2. Enforces enumerated values where the schema fixes them: `phase` in `{intake, contract, plan, dispatch, execute, verify, judge, reset, ship, hook}`; `level` in `{exists, substantive, wired, functional, null}`; `outcome` in `{pass, fail, suspicious, start, end, error}`. Violations throw `E_INVALID_TRACE_EVENT` with `details = {field, value, allowed}`.
    3. Enforces type shapes: `ts` is ISO-8601 UTC with milliseconds (regex anchored); `run_id` matches `^r-[0-9a-f]{8}$`; hash fields match `^sha256:[0-9a-f]+$` or are null; `duration_ms`, `tokens_in`, `tokens_out` are non-negative integers or null; `cost_usd` is a non-negative number or null; `confidence` is a number in `[0,1]` or null; `meta` is a plain object (may be empty). Violations throw `E_INVALID_TRACE_EVENT`.
    4. Opens `<tracePath>` (default `./anvil/trace.jsonl` relative to repoRoot; caller supplies) for append via `fs.openSync(..., 'a')`; writes `JSON.stringify(event) + '\n'`; calls `fs.fsyncSync(fd)` before closing so a process crash cannot leave a torn line. Uses an `fs` advisory lock via a sidecar `<tracePath>.lock` file created with `fs.openSync(..., 'wx')` and removed after the fsync; on `EEXIST`, retries with a short bounded backoff (up to ten attempts, each attempt spinning for a random jitter under 50 ms via `Atomics.wait`-style busy wait driven by `Date.now()`; no external dependency). After ten failed attempts, throws `E_IO` with `details = {reason: 'lock_contention', tracePath}`.
    5. Returns `{appendedAt: ISO-8601 UTC, bytes: integer}` on success.
  - Exports `TRACE_EVENT_KEYS` as a frozen array of the seventeen field names in Section 3 order.
  - Exports `TRACE_PHASES` as a frozen array: `['intake', 'contract', 'plan', 'dispatch', 'execute', 'verify', 'judge', 'reset', 'ship', 'hook']`.
  - Exports `TRACE_LEVELS` as a frozen array: `['exists', 'substantive', 'wired', 'functional', null]`.
  - Exports `TRACE_OUTCOMES` as a frozen array: `['pass', 'fail', 'suspicious', 'start', 'end', 'error']`.
  - Adds error code `E_INVALID_TRACE_EVENT` to `cli/lib/errors.js` in the same edit as Task 4.3 (combined Stage 4 error-code addition).
  - Imports only from `fs`, `crypto`, `path`, `cli/lib/io.js`, `cli/lib/errors.js`.
  - No `TODO`, `FIXME`, `XXX`, `HACK`, `TBD`, `WIP`, `NOTE:` markers.
  - No persona phrasing.

#### Decisions already made

- The trace event shape is fixed at architecture time; Stage 4 does not add fields; it only starts writing them. (source: 00_Architecture.md Section 3 "Trace event format")
- The field set is closed (Invariant 18). (source: 00_Architecture.md Section 6 Invariant 18)
- Storage is `./anvil/trace.jsonl` per repo; one JSON object per event, newline-delimited. (source: 08_Observability_and_Calibration.md "The trace")
- Events are never narrative; narrative goes in the worktree. (source: 08_Observability_and_Calibration.md "The trace")
- Zero runtime dependencies; hand-written validator and lock. (source: 00_Architecture.md Section 3 Runtime; Invariant 11)
- Atomic append with `fs.fsyncSync` so a process crash cannot leave a torn line. (source: 06_The_Ledger.md "Mutability: append-only" discipline applied to the trace per 08_Observability_and_Calibration.md "The trace")
- Enumerated values for `phase`, `level`, `outcome` come from Section 3 "Trace event format". (source: 00_Architecture.md Section 3 "Trace event format")
- Error code for schema violation is `E_INVALID_TRACE_EVENT`. (source: 00_Architecture.md Section 3 Error format; Section 6 Invariant 18)

#### Tests or fixtures

- `dg-anvil/tests/unit/trace.test.js` (Task 4.2) asserts event-shape validation, atomic append under concurrent writes, and `E_INVALID_TRACE_EVENT` rejection.

#### Verification command

```
node -e "const t=require('./dg-anvil/cli/lib/trace.js'); for(const f of ['writeEvent']){if(typeof t[f]!=='function'){process.exit(1)}}; for(const k of ['TRACE_EVENT_KEYS','TRACE_PHASES','TRACE_LEVELS','TRACE_OUTCOMES']){if(!Array.isArray(t[k])||!Object.isFrozen(t[k])){process.exit(1)}}; if(t.TRACE_EVENT_KEYS.length!==17){process.exit(1)}"
```

Expected exit 0.

#### Done when

`cli/lib/trace.js` exports `writeEvent` plus the four frozen constants; `TRACE_EVENT_KEYS` has exactly the seventeen fields in Section 3 order; out-of-schema fields throw `E_INVALID_TRACE_EVENT`; atomic append fsyncs before close; lock contention returns `E_IO` with `reason: 'lock_contention'`.

### Task 4.2: Author the trace unit test

#### Goal

Ship `tests/unit/trace.test.js` asserting event-shape validation, atomic append under concurrent writes, and `E_INVALID_TRACE_EVENT` rejection of out-of-schema fields.

#### Inputs

- `reports/DG-Anvil/00_Architecture.md` Section 3 "Trace event format"; Section 6 (Invariants 5, 18); Section 7 (Test tiers).
- `dg-anvil/cli/lib/trace.js` (from Task 4.1).

#### Outputs

- `dg-anvil/tests/unit/trace.test.js`
  - Uses `node:test` and `node:assert`.
  - `setup()`: creates a temp directory via `fs.mkdtempSync`; composes `tracePath` under it.
  - Positive tests:
    - `writeEvent` with a complete valid event appends one line; reading the file back returns the serialised event exactly.
    - `writeEvent` called ten times appends ten lines in order.
    - `writeEvent` with `level: null` succeeds (null is an allowed value per the `TRACE_LEVELS` enumeration).
    - `writeEvent` with `meta: {}` succeeds (empty object is allowed).
    - Concurrent append: spawns ten child node processes each writing one event to the same path via `child_process.fork`; after all complete, the file contains exactly ten well-formed JSONL lines (no torn lines; the lock prevents interleave); every line parses as JSON and validates against the schema.
  - Negative tests (each triggers `E_INVALID_TRACE_EVENT`):
    - Event with an extra field (`{extraneous_field: 'x'}`) throws; `details.extraneous_keys === ['extraneous_field']`.
    - Event with `phase: 'unknown_phase'` throws; `details.field === 'phase'`.
    - Event with `level: 'bogus'` throws.
    - Event with `outcome: 'maybe'` throws.
    - Event with `ts: 'not-an-iso-date'` throws.
    - Event with `run_id: 'not-a-run-id'` throws.
    - Event with `tool_input_hash: 'sha1:abcd'` (wrong algorithm prefix) throws.
    - Event with `duration_ms: -1` throws.
    - Event with `confidence: 1.5` throws (out of `[0,1]`).
    - Event with `cost_usd: -0.01` throws.
    - Missing required meta field (`event.meta = undefined`) is a schema violation.
  - Closed-field-set assertion: imports `TRACE_EVENT_KEYS`; asserts the set equals the seventeen names in Section 3 order and is frozen.
  - `teardown()`: removes the temp directory.
  - CommonJS.

#### Decisions already made

- Unit tests are paired one-to-one with `cli/lib/<module>.js`. (source: 00_Architecture.md Section 7 Test tiers)
- Every exported function has at least one positive and one negative test. (source: 00_Architecture.md Section 7 Test tiers)
- Rejection rules have dedicated tests. (source: 00_Architecture.md Section 7 Test tiers)
- Concurrent append is a property that atomic append must satisfy; the test exercises it via `child_process.fork`. (source: 00_Architecture.md Section 3 "Trace event format"; 08_Observability_and_Calibration.md "The trace")

#### Tests or fixtures

- Self-contained; `fs.mkdtempSync` produces the test directory.

#### Verification command

```
node --test dg-anvil/tests/unit/trace.test.js
```

Expected exit 0.

#### Done when

`tests/unit/trace.test.js` runs green; every out-of-schema field triggers `E_INVALID_TRACE_EVENT`; the concurrent-append stress test produces ten well-formed lines under the advisory lock; the closed-field-set assertion passes.

### Task 4.3: Author `cli/lib/metrics.js` metrics catalogue reader

#### Goal

Ship `cli/lib/metrics.js` that reads `./anvil/trace.jsonl` and `~/.anvil/ledger.jsonl`, computes the metrics catalogue from `08_Observability_and_Calibration.md`, and emits the calibration report (agent calibration table and claim-vs-evidence table). `anvil metrics` returns non-zero exit when theatre-drift index exceeds 15 percent.

#### Inputs

- `reports/Anvil-Design/08_Observability_and_Calibration.md` (all sections; "The metrics catalogue"; "The theatre-drift index"; "Calibration"; "What is not captured").
- `reports/DG-Anvil/00_Architecture.md` Section 3 "Trace event format"; Section 4 (Stage 4 produces row); Section 6 (Invariants 3, 5, 11, 18).
- `dg-anvil/cli/lib/trace.js` (from Task 4.1).
- `dg-anvil/cli/lib/ledger.js` (Stage 1 read path; Stage 3 extended).
- `dg-anvil/cli/lib/io.js`, `cli/lib/errors.js`.

#### Outputs

- `dg-anvil/cli/lib/metrics.js`
  - Exports `computeMetrics({tracePath, ledgerPath, since})` that:
    1. Reads `<tracePath>` line by line via `cli/lib/io.js` `readFileUtf8` and `split('\n')`; parses each line as JSON; skips empty lines.
    2. Reads the Ledger via `cli/lib/ledger.js` `load({ledgerPath})`.
    3. Optionally filters events and lessons by `since` (ISO-8601; default: no filter).
    4. Computes the ten metrics from the catalogue table in `08_Observability_and_Calibration.md`:
       - `reset_rate`: resets / (resets + passes), per task class (the task class is the `meta.task_class` field when present, else the empty class; the result is an object keyed by class).
       - `time_to_green`: median `ts(mark-done) - ts(dispatch)` per task class (milliseconds).
       - `contract_pass_rate`: passes at first try / total tasks (a "first try" is a task whose `state.tasks[task].loop_count === 0` on the mark-done transition, inferred from the trace by pairing `dispatch` with `mark-done` events).
       - `lesson_hit_rate`: lessons injected / contracts (a lesson injection is a reset event with a non-null `last_lesson_id`; a contract is a contract-save event).
       - `lesson_effect_size`: `prevented_count / hit_count`, per lesson id (reading the Ledger's `hit_count` and `prevented_count` fields).
       - `judge_reject_rate`: Court fails / total Court runs (Court runs are `judge` phase events; fails are `outcome === 'fail'`).
       - `judge_suspicious_rate`: Court `suspicious` tags / total (suspicious is `outcome === 'suspicious'`).
       - `escalation_rate`: escalations / runs (escalations are phase-transition events whose `meta.status === 'escalated'`; runs are the count of distinct `run_id` values).
       - `cost_per_shipped_pr`: median of `sum(cost_usd)` per `run_id` that reached a `ship` phase event with `outcome === 'pass'`.
       - `theatre_drift_index`: the fraction of `mark-done` transitions where the Devil's Advocate output was non-empty (signal 3) despite Verify reporting pass (signal 1) and Court Pass 1 reporting pass with no `suspicious` findings (signal 2). The three signals are read from the trace: signal 1 is a `verify` phase `outcome === 'pass'` event for the task; signal 2 is a `judge` phase event with `meta.pass === 1`, `outcome === 'pass'`, and `meta.suspicious === false`; signal 3 is a `judge` phase event with `meta.devils_advocate_findings_nonempty === true`. The theatre-drift index is the count of `mark-done` transitions where signal 3 is true and signals 1 and 2 are true, divided by the total count of `mark-done` transitions.
    5. Computes the two calibration tables:
       - Agent calibration table: per-agent-class (keyed by `agent_id` prefix; the agent class is the segment before the first dash, e.g. `executing-sonnet` -> `executing-sonnet`) sums `n` (event count), `mean_confidence` (mean of `confidence`), `pass_rate` (pass outcome / total), and `calibration_error = mean_confidence - pass_rate`. Label: `overconfident` if error > 0.05; `underconfident` if error < -0.05; `well-calibrated` otherwise.
       - Claim-versus-evidence table: per-task rows of `{task, agent_claim, evidence_outcome, gap}` where `agent_claim` is captured from the Court's Pass 1 finding `meta.agent_claim` (the implementer's narration recorded on the subagent event that produced the diff) and `evidence_outcome` is the associated `verify` phase event's pass/fail state for the criterion. The gap label is `claim ahead of evidence` when the claim declares implementation but the evidence shows fail; `claim sees only exit code` when the evidence shows a pass but the captured stderr contains suspicious tokens (the `SUSPICIOUS_STDERR_TOKENS` frozen array imported from `cli/lib/court.js`).
    6. Writes the calibration report to `./anvil/calibration.jsonl` (one JSON object per line: one line per agent class row, then one line per claim-vs-evidence row, with a `table` discriminator field). The calibration report path is relative to the repo root (worktree-level); the file is append-style accumulative across runs.
    7. Returns `{metrics: {...}, calibration: {agent_table, claim_vs_evidence_table}, theatreDriftExceedsThreshold: boolean}` where the threshold is 0.15 per `08_Observability_and_Calibration.md` "The theatre-drift index".
  - Exports `formatReport(result)` that returns a plain-text human-readable report string for CLI stdout.
  - Exports `THEATRE_DRIFT_THRESHOLD` as a frozen constant: `0.15`.
  - Exports `THEATRE_DRIFT_HEALTHY_CEILING` as a frozen constant: `0.05` (documented in the human report; the CLI non-zero exit triggers only above `THEATRE_DRIFT_THRESHOLD`; below the healthy ceiling is a reporting band).
  - Exports `METRIC_NAMES` as a frozen array of the ten metric names in the catalogue order.
  - Adds error codes `E_INVALID_TRACE_EVENT`, `E_HOOK_BLOCKED`, `E_THEATRE_DRIFT_EXCEEDED`, `E_SHIP_PR_FAILED`, `E_SHIP_APPROVAL_TOKEN_INVALID`, `E_SHIP_REPLAY_FAILED`, `E_WHOLE_BRANCH_COURT_FAILED` to `cli/lib/errors.js` in a single edit alongside Task 4.1 (combined Stage 4 error-code addition):
    - `E_INVALID_TRACE_EVENT` (Invariant 18; consumed by Task 4.1).
    - `E_HOOK_BLOCKED` (pre-tool-use hard block; consumed by Task 4.5).
    - `E_THEATRE_DRIFT_EXCEEDED` (metrics non-zero exit; consumed by this task and Task 4.11).
    - `E_SHIP_PR_FAILED` (gh CLI failure; consumed by Task 4.9).
    - `E_SHIP_APPROVAL_TOKEN_INVALID` (pre-tool-use bypass requires valid approval token; consumed by Task 4.5 and Task 4.9).
    - `E_SHIP_REPLAY_FAILED` (contract replay fails from the clean worktree; consumed by Task 4.9).
    - `E_WHOLE_BRANCH_COURT_FAILED` (whole-branch Court returns a non-merge verdict; consumed by Task 4.8 and Task 4.9).
  - Imports only from `fs`, `path`, `cli/lib/io.js`, `cli/lib/ledger.js`, `cli/lib/court.js`, `cli/lib/trace.js`, `cli/lib/errors.js`.
  - No `TODO`, `FIXME`, `XXX`, `HACK`, `TBD`, `WIP`, `NOTE:` markers.
  - No persona phrasing.

- `dg-anvil/cli/lib/errors.js`
  - Append the seven Stage 4 codes (listed above) to the frozen `CODES` object; re-freeze.

#### Decisions already made

- `anvil metrics` reads the trace and the Ledger and emits the catalogue. (source: 08_Observability_and_Calibration.md "The metrics catalogue")
- Theatre-drift index threshold is 0.15; healthy system sits below 0.05; above 0.15 triggers non-zero exit and structured report. (source: 08_Observability_and_Calibration.md "The theatre-drift index")
- Theatre-drift definition: fraction of `mark-done` transitions where signal 3 (Devil's Advocate non-empty) was true despite signals 1 (Verify pass) and 2 (Court Pass 1 pass without suspicious) being true. (source: 08_Observability_and_Calibration.md "The theatre-drift index")
- Calibration report writes to `./anvil/calibration.jsonl`; two tables (agent calibration, claim-vs-evidence). (source: 08_Observability_and_Calibration.md "Calibration")
- The plugin does not auto-tune itself; every variable worth tuning is visible. (source: 08_Observability_and_Calibration.md "The self-improvement loop")
- What is not captured: input prompts, proprietary code content, Ledger content. The trace records that a lesson was written, not the lesson itself. (source: 08_Observability_and_Calibration.md "What is not captured")
- Error codes are stable strings defined in `cli/lib/errors.js`; additions are additive and must be registered when introduced. (source: 00_Architecture.md Section 3 Error format)
- Zero runtime dependencies; hand-written statistics. (source: 00_Architecture.md Section 3 Runtime; Invariant 11)

#### Tests or fixtures

- `dg-anvil/tests/unit/metrics.test.js` (Task 4.4) asserts every metric from the catalogue; asserts theatre-drift threshold exit behaviour.

#### Verification command

```
node -e "const m=require('./dg-anvil/cli/lib/metrics.js'); for(const f of ['computeMetrics','formatReport']){if(typeof m[f]!=='function'){process.exit(1)}}; if(m.THEATRE_DRIFT_THRESHOLD!==0.15){process.exit(1)}; if(m.THEATRE_DRIFT_HEALTHY_CEILING!==0.05){process.exit(1)}; if(!Array.isArray(m.METRIC_NAMES)||!Object.isFrozen(m.METRIC_NAMES)||m.METRIC_NAMES.length!==10){process.exit(1)}; const e=require('./dg-anvil/cli/lib/errors.js'); for(const k of ['E_INVALID_TRACE_EVENT','E_HOOK_BLOCKED','E_THEATRE_DRIFT_EXCEEDED','E_SHIP_PR_FAILED','E_SHIP_APPROVAL_TOKEN_INVALID','E_SHIP_REPLAY_FAILED','E_WHOLE_BRANCH_COURT_FAILED']){if(e.CODES[k]!==k){process.exit(1)}}"
```

Expected exit 0.

#### Done when

`cli/lib/metrics.js` exports `computeMetrics`, `formatReport`, `THEATRE_DRIFT_THRESHOLD` (0.15), `THEATRE_DRIFT_HEALTHY_CEILING` (0.05), and `METRIC_NAMES` (ten names); the seven Stage 4 error codes are registered in `cli/lib/errors.js`.

### Task 4.4: Author the metrics unit test

#### Goal

Ship `tests/unit/metrics.test.js` asserting every metric from the catalogue is computed correctly from a synthesised trace and ledger, and asserting theatre-drift threshold exit behaviour.

#### Inputs

- `reports/Anvil-Design/08_Observability_and_Calibration.md` (all sections).
- `reports/DG-Anvil/00_Architecture.md` Section 7 (Test tiers).
- `dg-anvil/cli/lib/metrics.js` (from Task 4.3).

#### Outputs

- `dg-anvil/tests/unit/metrics.test.js`
  - Uses `node:test` and `node:assert`.
  - `setup()`: creates a temp directory via `fs.mkdtempSync`; composes `tracePath` and `ledgerPath` under it.
  - Synthesised-trace helper: a factory that writes a controlled set of trace events (via `cli/lib/trace.js` `writeEvent`) covering every phase, every level, and every outcome named in the closed enumerations.
  - Positive tests (one per metric in `METRIC_NAMES`):
    - `reset_rate`: synthesise five passes and two resets for a class; assert the computed rate equals `2/7`.
    - `time_to_green`: synthesise three task pairs with known durations; assert the median matches.
    - `contract_pass_rate`: synthesise ten task dispatches with five first-try passes; assert 0.5.
    - `lesson_hit_rate`: synthesise two contracts and one lesson injection; assert 0.5.
    - `lesson_effect_size`: populate the ledger with two lessons of known `hit_count` and `prevented_count`; assert the ratios match.
    - `judge_reject_rate`: synthesise eight judge events with three fails; assert 0.375.
    - `judge_suspicious_rate`: synthesise eight judge events with one suspicious; assert 0.125.
    - `escalation_rate`: synthesise five runs with one escalation; assert 0.2.
    - `cost_per_shipped_pr`: synthesise three shipped runs with cost_usd totals of 1.0, 2.0, 3.0; assert median 2.0.
    - `theatre_drift_index`: synthesise twenty `mark-done` transitions; three have signal 3 true with signals 1 and 2 true; assert 0.15.
  - Threshold tests:
    - `theatreDriftExceedsThreshold` is `false` when the index equals 0.15 (threshold is strictly greater; the test asserts non-zero exit triggers only above 0.15).
    - Synthesise a trace whose theatre-drift index is 0.16; assert `theatreDriftExceedsThreshold === true`.
    - Synthesise a trace whose theatre-drift index is 0.14; assert `theatreDriftExceedsThreshold === false`.
  - Calibration tests:
    - Agent calibration table: synthesise one hundred events per agent class with known `confidence` means and outcomes; assert the `calibration_error` label matches (`overconfident`, `well-calibrated`, `underconfident`) per the 0.05 band.
    - Claim-versus-evidence table: synthesise one run with a claim-ahead-of-evidence case; assert the table row appears with the correct `gap` label.
  - Calibration file write:
    - After `computeMetrics`, assert `./anvil/calibration.jsonl` exists and contains one line per agent class row plus one line per claim-vs-evidence row; each line parses as JSON and carries a `table` discriminator.
  - Schema-violation test: a trace line with an out-of-schema field causes `computeMetrics` to reject with `E_INVALID_TRACE_EVENT` and `details.source_line_index`.
  - `teardown()`: removes the temp directory.
  - CommonJS.

#### Decisions already made

- Every exported function has at least one positive and one negative test; rejection rules have dedicated tests. (source: 00_Architecture.md Section 7 Test tiers)
- Ten metrics in the catalogue; each has a dedicated positive test. (source: 08_Observability_and_Calibration.md "The metrics catalogue")
- Theatre-drift threshold is 0.15 (above triggers exit); healthy ceiling is 0.05 (reporting band). (source: 08_Observability_and_Calibration.md "The theatre-drift index")
- Calibration report writes to `./anvil/calibration.jsonl` with two tables. (source: 08_Observability_and_Calibration.md "Calibration")

#### Tests or fixtures

- Self-contained; trace lines and ledger lines are synthesised inline via `cli/lib/trace.js` `writeEvent` and `cli/lib/ledger-write.js` `append`.

#### Verification command

```
node --test dg-anvil/tests/unit/metrics.test.js
```

Expected exit 0.

#### Done when

`tests/unit/metrics.test.js` runs green; every metric in `METRIC_NAMES` has a positive test with a numerically-asserted value; theatre-drift threshold at 0.14, 0.15, 0.16 is asserted; calibration tables are asserted; the calibration file is written and its contents are schema-consistent.

### Task 4.5: Finalize `hooks/pre-tool-use`

#### Goal

Replace the Stage 0 exit-0 stub with a destructive-pattern blocker that emits a structured block event and exits non-zero. Blocks `rm -rf`, `git push --force`, `git config`, `npm publish`, and matches from the active contract's `no_secret_patterns` invariant. Ship-phase bypass requires an explicit approval token from the orchestrator; no silent bypass.

#### Inputs

- `reports/Anvil-Design/04_Anatomy.md` Five hooks table (pre-tool-use row).
- `reports/Anvil-Design/10_Anti-Patterns_Defeated.md` row 22 (Prompt injection), row 23 (Credential leak), row 25 (Advisory-hook bypass).
- `reports/Anvil-Design/08_Observability_and_Calibration.md` "Hook-layer capture".
- `reports/DG-Anvil/00_Architecture.md` Section 3 (Hooks; Subprocess invocation; Error format); Section 6 (Invariants 1, 9).
- `dg-anvil/hooks/pre-tool-use` (Stage 0 exit-0 stub).
- `dg-anvil/cli/lib/trace.js` (from Task 4.1).
- `dg-anvil/cli/lib/contract.js` (from Stage 1).

#### Outputs

- `dg-anvil/hooks/pre-tool-use`
  - Bash script. Starts with `#!/usr/bin/env bash` and a portable guard `if ! command -v bash >/dev/null 2>&1; then exit 0; fi` (Invariant 9: hook absence never blocks).
  - Reads the tool invocation from stdin (Claude Code hooks protocol: JSON on stdin with `tool_name`, `tool_input`, and contextual metadata).
  - Delegates the policy evaluation to `node dg-anvil/cli/anvil.js hook pre-tool-use` (a new internal CLI sub-subcommand registered in Task 4.8; the hook script is a thin shell that passes stdin and forwards the exit code). This keeps the policy implementation in Node so the polyglot hook script stays as thin as possible. On platforms without Node, the script exits 0 (graceful degradation per Invariant 9, matching the bash-availability guard).
  - The internal `hook pre-tool-use` handler:
    1. Parses the invocation JSON from stdin.
    2. Checks the `tool_input.command` (for Bash tool) or `tool_input.file_path` (for Write/Edit) against the destructive-pattern array: `rm -rf`, `git push --force`, `git push -f`, `git config`, `npm publish`. Patterns are literal substrings anchored to word boundaries where appropriate.
    3. Loads the active contract from `anvil/contract.yml` via `cli/lib/contract.js` `loadAndValidate`. If the contract does not exist, the `no_secret_patterns` invariant defaults to an empty-set match (no secret patterns are configured; proceed with destructive-pattern check only).
    4. Matches the tool input against every regex in `contract.invariants.no_secret_patterns` (if the invariant is present). Matches count as a block.
    4a. When `tool_name === 'Bash'` and the command is a commit-creating git invocation (detected via regex `/^\s*git\s+(commit(?:\s+--amend)?|cherry-pick(?:\s+--continue)?|rebase\s+--continue|am|merge)\b/`), the handler extracts the commit message per the per-command rules below and checks for the presence of BOTH `anvil_run_id=r-[0-9a-f]{8}` AND `anvil_task=T[0-9]+` substrings in the message. If either is missing, the handler blocks with `E_HOOK_BLOCKED` and `details.rule` set to the per-command rule name. If both are present, the handler passes through. Per-command message-extraction specification:
        - `git commit` and `git commit --amend`: extract message from `-m <msg>` argument OR from a HEREDOC appended to the command string (detect `<<'EOF'...EOF` or `<<EOF...EOF` and capture between markers). Block with `details.rule: 'commit_message_missing_citation'`.
        - `git cherry-pick`: if `-m <parent-number>` is present, ignore (that is a merge-cherry-pick option); if `--no-commit` is present, skip (no commit created); otherwise the commit inherits the source commit's message. The hook accepts cherry-pick only if the SOURCE commit's message contains the citation. Detect the source commit via the last positional argument; `git log --format=%B -1 <source>` to fetch its message. Block with `details.rule: 'cherry_pick_source_missing_citation'` if absent.
        - `git cherry-pick --continue`: the commit message was set by the cherry-pick startup; the hook checks the cherry-pick HEAD's commit message via `git log --format=%B -1 CHERRY_PICK_HEAD`. Block with `details.rule: 'cherry_pick_continue_missing_citation'`.
        - `git rebase --continue`: check `git log --format=%B -1 REBASE_HEAD` (or equivalent). Block with `details.rule: 'rebase_continue_missing_citation'`.
        - `git am`: extract message from the mailbox (the `From:`/`Subject:` and body). `git am` takes a mailbox file as positional; the hook parses the mailbox and checks each patch's message. Block with `details.rule: 'am_patch_missing_citation'` on any patch without citations.
        - `git merge` (non-fast-forward or with `-m`): extract message from `-m <msg>` or from the default merge message. For non-`-m` merges, the merge message is generated by git; the hook opts the agent into `-m` by blocking the raw `git merge <branch>` form without a message and producing `details.rule: 'merge_message_missing_citation'` with guidance text "merges must use git merge -m ..." Block such invocations entirely.
        Cross-stage instruction note: `skills/executing/SKILL.md` (Stage 2) Process section is updated by Task 4.5 to include the line: "Every commit in a task worktree must include `anvil_run_id=<current run id>` and `anvil_task=<current task id>` in the commit message body. The pre-tool-use hook blocks commits that omit these citations." Stage 4 owns this skill edit because the enforcement mechanism is Stage 4's responsibility.
    5. If the tool invocation carries an approval token in `tool_input.meta.anvil_approval_token`, validates the token against the orchestrator's current `anvil/state.json` `meta.ship_approval_token` (written by `/ship` in Task 4.9 at the start of the ship phase). A valid token allows the destructive pattern to proceed and emits a structured event with `outcome: 'start'` and `meta.ship_phase_bypass: true`. An invalid token is a block. The pre-tool-use handler reads `./anvil/state.json` `meta.ship_approval_token` AND `meta.ship_approval_token_expires_at`. If `expires_at` is null, undefined, or if `Date.now() > Date.parse(expires_at)`, the token is rejected. Emit `E_SHIP_APPROVAL_TOKEN_INVALID` with `details.reason: 'expired'` in the stderr structured error. Only a token that matches AND is not expired permits the bypass.
    6. If blocked, writes a trace event via `cli/lib/trace.js` `writeEvent` with `phase: 'hook'`, `outcome: 'fail'`, `tool: <tool_name>`, `tool_input_hash: sha256(tool_input serialised)`, `meta: {hook: 'pre-tool-use', rule: <rule_name>, contract_criterion: <criterion id if match came from no_secret_patterns else null>}`. Writes a structured error JSON to stderr shaped `{error: 'tool call blocked by pre-tool-use hook', code: 'E_HOOK_BLOCKED', details: {rule, tool, pattern_or_criterion}}` and exits 2 (exit code 2 signals a hard block per Claude Code hooks protocol; the block is not a fallback).
    7. If allowed (no destructive pattern match, no secret-pattern match, or valid bypass token), writes a trace event with `outcome: 'start'` and exits 0.
  - No advisory tier; no warning-and-continue behaviour (Invariant 1; row 25).
  - The hook script is polyglot (Invariant 9); on a platform without bash, `hooks/run-hook.cmd` dispatches; on a platform without bash and without Node, the hook exits 0 gracefully.
  - LF line endings; UTF-8 without BOM.

#### Decisions already made

- Hooks are blocking, not advisory; each hook either prevents an action or emits a structured event. (source: 04_Anatomy.md Five hooks table; 00_Architecture.md Section 6 Invariant 1)
- `pre-tool-use` fires on Write, Edit, Bash with destructive patterns; hard-blocks unless task is in ship phase with explicit approval token. (source: 04_Anatomy.md Five hooks table)
- Destructive patterns: `rm -rf`, `git push --force`, `git config`, `npm publish`. (source: 04_Anatomy.md Five hooks table)
- `no_secret_patterns` is a contract invariant (row 23). (source: 10_Anti-Patterns_Defeated.md row 23)
- Advisory-hook bypass is an explicit anti-pattern (row 25): all hooks block or emit; no advisory tier exists. (source: 10_Anti-Patterns_Defeated.md row 25)
- Polyglot hooks with graceful degradation on absent bash or Node. (source: 00_Architecture.md Section 6 Invariant 9; Section 3 Hooks)
- Ship-phase bypass requires an explicit approval token written by `/ship`; the token lives in `anvil/state.json` `meta.ship_approval_token`. (source: 04_Anatomy.md Five hooks table "unless task is in ship phase with explicit approval token"; 00_Architecture.md Section 4 Stage 4 produces row for `commands/ship.md`)
- Error code for hook blocks is `E_HOOK_BLOCKED`. (source: Task 4.3 errors-module addition)
- Exit code 2 signals a hard block per Claude Code hooks protocol. (source: 04_Anatomy.md Five hooks table "hard blocks")
- Commit-message citation is enforced across every commit-creating git subcommand (commit, commit --amend, cherry-pick, cherry-pick --continue, rebase --continue, am, merge). Row 19 (Ghost code) defeater requires complete coverage; any bypass path is a defect. (source: 10_Anti-Patterns_Defeated.md row 19; Pass 3 critical issue 3)

#### Tests or fixtures

- The hook's behaviour is exercised indirectly by `tests/loop/loop.test.js` (Task 4.10) when the loop test simulates a destructive tool call and asserts the block.

#### Verification command

```
test -x dg-anvil/hooks/pre-tool-use || test -f dg-anvil/hooks/pre-tool-use
head -3 dg-anvil/hooks/pre-tool-use | grep -q 'command -v bash'
grep -q 'hook pre-tool-use' dg-anvil/hooks/pre-tool-use
```

Expected exit 0 (the hook file exists, starts with the bash-availability guard, and delegates to the Node CLI).

#### Done when

`hooks/pre-tool-use` is a bash script that starts with the bash-availability guard; delegates to `node dg-anvil/cli/anvil.js hook pre-tool-use`; the internal handler matches destructive patterns and `no_secret_patterns`; emits a structured block event via `cli/lib/trace.js`; exits 2 on block, 0 on pass, with graceful degradation on missing bash or Node.

### Task 4.5b: Finalize `hooks/session-start`

#### Goal

Finalize `hooks/session-start` from the Stage 0 exit-0 stub to emit a structured trace event on every Claude Code session start and load the `using-anvil` meta-skill into context.

#### Inputs

- `reports/DG-Anvil/00_Architecture.md` Section 3 Trace event format; Section 6 Invariant 1.
- `reports/Anvil-Design/04_Anatomy.md` session-start row.
- `reports/DG-Anvil/plans/stage_0_bootstrap.md` Task 0.12 (current stub behaviour).

#### Outputs

- `dg-anvil/hooks/session-start` finalized as a bash script with the bash-availability guard and polyglot behaviour via `hooks/run-hook.cmd`. Body delegates to `node dg-anvil/cli/anvil.js hook session-start`.
- The internal handler in `cli/lib/hooks.js` (registered alongside the other hook handlers in Task 4.8) emits one trace event with `phase: "hook"`, `outcome: "start"`, `meta: {hook: "session-start", loaded_skill: "using-anvil"}` via `cli/lib/trace.js` and exits 0.
- If `skills/using-anvil/SKILL.md` is missing, writes `E_IO` structured error to stderr via `cli/lib/errors.js` and exits 0 (hook absence never blocks per Invariant 9).
- LF line endings; UTF-8 without BOM; no `TODO`, `FIXME`, `XXX`, `HACK`, `TBD`, `WIP`, `NOTE:` markers; no persona phrasing.

#### Decisions already made

- The hook must not emit advisory stderr or stdout text per Invariant 1. (source: 00_Architecture.md Section 6 Invariant 1)
- The only stderr output path in the finalized hook is a structured JSON error written via the errors module; no raw `echo` or `printf` to stderr. (source: 00_Architecture.md Section 3 Error format)
- Polyglot behaviour is preserved from Stage 0: bash-availability guard, Windows dispatch via `hooks/run-hook.cmd`, graceful exit 0 on missing bash or Node. (source: 00_Architecture.md Section 6 Invariant 9)
- Trace event fields conform to the closed schema in Section 3. (source: 00_Architecture.md Section 6 Invariant 18)

#### Tests or fixtures

- `dg-anvil/tests/unit/hooks.test.js` (from Task 4.8a) is extended with a session-start case asserting the trace event shape is emitted and no raw `echo`/`printf` path exists in the hook script body.

#### Verification command

```
test -f dg-anvil/hooks/session-start
head -3 dg-anvil/hooks/session-start | grep -q 'command -v bash'
grep -q 'hook session-start' dg-anvil/hooks/session-start
! grep -nE '^(echo|printf|[^#]*>&2|[^#]*1>&2)' dg-anvil/hooks/session-start
rm -f ./anvil/trace.jsonl
node dg-anvil/cli/anvil.js hook session-start </dev/null
node -e "const fs=require('fs'); const lines=fs.readFileSync('./anvil/trace.jsonl','utf8').trim().split('\\n'); const last=JSON.parse(lines[lines.length-1]); if(last.phase!=='hook'||last.outcome!=='start'||!last.meta||last.meta.hook!=='session-start'||last.meta.loaded_skill!=='using-anvil'){process.exit(1)}"
```

Expected exit 0.

#### Done when

Running `dg-anvil/hooks/session-start` writes exactly one well-shaped trace event with `phase: "hook"`, `outcome: "start"`, `meta.hook: "session-start"`, `meta.loaded_skill: "using-anvil"`; no `echo` or `printf` is invoked in the hook script body; `grep -E "^(echo|printf|[^#]*>&2)" dg-anvil/hooks/session-start` returns exit 1.

### Task 4.6: Finalize `hooks/post-tool-use`, `hooks/user-prompt-submit`, `hooks/stop`

#### Goal

Finalize the remaining three hooks. `post-tool-use` is unconditional trace-writer. `user-prompt-submit` routes prompts based on session state. `stop` replays the active contract and writes a lesson on any failing criterion.

#### Inputs

- `reports/Anvil-Design/04_Anatomy.md` Five hooks table (post-tool-use, user-prompt-submit, stop rows).
- `reports/Anvil-Design/08_Observability_and_Calibration.md` "Hook-layer capture".
- `reports/Anvil-Design/10_Anti-Patterns_Defeated.md` row 14 (Theatre drift), row 25 (Advisory-hook bypass).
- `reports/DG-Anvil/00_Architecture.md` Section 3 "Trace event format"; Section 6 (Invariants 1, 9, 18).
- `dg-anvil/hooks/post-tool-use`, `user-prompt-submit`, `stop` (Stage 0 exit-0 stubs).
- `dg-anvil/cli/lib/trace.js`, `cli/lib/contract.js`, `cli/lib/verifier.js`, `cli/lib/ledger-write.js`, `cli/lib/worktree.js`.

#### Outputs

- `dg-anvil/hooks/post-tool-use`
  - Bash script with the bash-availability guard.
  - Delegates to `node dg-anvil/cli/anvil.js hook post-tool-use`.
  - Internal handler:
    1. Reads the tool invocation JSON from stdin (Claude Code hooks protocol).
    2. Composes a trace event with every field from Section 3; `phase: 'hook'`; `tool: <tool_name>`; `tool_input_hash: sha256(tool_input serialised)`; `outcome: <'pass' if tool returned exit 0 else 'fail'>`; `duration_ms` from the invocation metadata; `tokens_in`, `tokens_out`, `cost_usd`, `model`, `confidence` from any `ANVIL_EVENT {json}` marker in stdout (via a single pass over the tool output); `meta: {hook: 'post-tool-use', tool_status: <status>}`.
    3. Writes the event via `cli/lib/trace.js` `writeEvent`.
    4. Unconditional: the hook cannot be opted out of. Exits 0 unconditionally (the trace-append is a best-effort; write failure returns `E_IO` structured on stderr but the hook still exits 0 so the tool call is not blocked by an observability failure; however an `E_INVALID_TRACE_EVENT` is still logged to stderr for diagnosis).
  - No advisory tier (Invariant 1); the hook either appends and returns 0, or structured-errors to stderr and returns 0 (the architecture classifies the `post-tool-use` hook as an event emitter, not a blocker, per `04_Anatomy.md` Five hooks table "appends a row to trace.jsonl"; the event emission is the structured action).
- `dg-anvil/hooks/user-prompt-submit`
  - Bash script with the bash-availability guard.
  - Delegates to `node dg-anvil/cli/anvil.js hook user-prompt-submit`.
  - Internal handler:
    1. Reads the user prompt JSON from stdin.
    2. Reads `anvil/state.json` if present to check the `meta.contract_unconfirmed` flag and to scan `state.tasks` for any task with `status: 'escalated'` via `escalation.listEscalated(state)` (the helper authored in Task 4.8b).
    3. Reads `anvil/contract.yml` if present.
    4. If a contract exists and `meta.contract_unconfirmed === true`, emits a structured routing event to stdout shaped `{route: 'contracting', prompt: <prompt>}` and writes a trace event with `phase: 'intake'`, `outcome: 'start'`, `meta: {hook: 'user-prompt-submit', route: 'contracting'}`; exits 0.
    5. If `escalation.listEscalated(state).length > 0` (some task in `state.tasks` has `status: 'escalated'`), emits `{route: 'escalation_handler', prompt: <prompt>}` and writes a trace event with `meta.route: 'escalation_handler'`; exits 0.
    6. Otherwise emits `{route: 'passthrough', prompt: <prompt>}` with a trace event `meta.route: 'passthrough'`; exits 0.
  - No advisory tier; the hook either routes or passes through; every outcome is a structured event.
- `dg-anvil/hooks/stop`
  - Bash script with the bash-availability guard.
  - Delegates to `node dg-anvil/cli/anvil.js hook stop`.
  - Internal handler:
    1. Reads the session end metadata JSON from stdin.
    2. Loads the active contract from `anvil/contract.yml` via `cli/lib/contract.js` `loadAndValidate`. If no contract exists, exits 0 (no criteria to replay).
    3. Determines the repo HEAD via `io.spawn('git', ['rev-parse', 'HEAD'], {cwd: repoRoot})`.
    4. Creates a temporary worktree at HEAD via `cli/lib/worktree.js` `create({repoRoot, taskId: 'stop-replay', baseRef: 'HEAD'})`.
    5. Invokes `cli/lib/verifier.js` `verifyAll({worktreePath, contract, diffPath: null, toolOutputPath: null})` (the replay has no diff or tool output to reference; the verifier operates on the HEAD source tree).
    6. If any criterion returns `allGreen: false`, composes a lesson with `kind: 'reset'`, `contract_gap.level` equal to the first failing level, `contract_gap.was: <captured evidence>`, `contract_gap.should_have_been: <criterion.statement>`, `evidence.verify_output: <serialised verify result>`, `evidence.diagnostic: 'stop-hook replay'`, `remediation.contract_patch: 'tighten criterion ' + <id> + '; session ended without green contract'`, `remediation.counter_example_text: <failure signature>`, `pattern: ['stop-replay', 'end-of-session']`, `intent_shape: contract.source_intent`. Calls `cli/lib/ledger-write.js` `append(lesson)`. If the append throws `E_NULL_LESSON`, the hook blocks the stop with a structured error (the session cannot end silently; the architecture's "session that ends with a failing contract leaves a trace" rule).
    7. Writes a trace event with `phase: 'hook'`, `outcome: <'pass' if allGreen else 'fail'>`, `meta: {hook: 'stop', lesson_id: <id or null>}`.
    8. Removes the temporary worktree via `cli/lib/worktree.js` `remove`. On orphan-worktree alarm, records the alarm event and continues.
    9. Exits 0 if allGreen or if a lesson was successfully recorded; exits non-zero with `E_NULL_LESSON` if a failing contract could not produce a non-null lesson (the session cannot end silently per Invariant 15 analogue for stop).
  - No advisory tier (Invariant 1); every branch emits a structured event.
- Every hook script: LF line endings; UTF-8 without BOM; no `TODO`, `FIXME`, `XXX`, `HACK`, `TBD`, `WIP`, `NOTE:` markers; no persona phrasing.

#### Decisions already made

- `post-tool-use` appends a row to `trace.jsonl` with phase, evidence, cost, outcome; unconditional; cannot be opted out of. (source: 04_Anatomy.md Five hooks table; 08_Observability_and_Calibration.md "Hook-layer capture")
- `post-tool-use` is an event emitter, not a blocker; the structured event is the action. (source: 04_Anatomy.md Five hooks table)
- `user-prompt-submit` routes: contracting when `meta.contract_unconfirmed === true`; escalation handler when any task in `state.tasks` has `status: 'escalated'` (detected via `escalation.listEscalated(state)` from Task 4.8b, matching `00_Architecture.md` Section 3 Escalation handler); otherwise passthrough. (source: 04_Anatomy.md Five hooks table; 00_Architecture.md Section 3 Escalation handler)
- `stop` replays the active contract; on any failing check, writes a lesson and blocks the stop until the lesson is recorded. (source: 04_Anatomy.md Five hooks table; 08_Observability_and_Calibration.md "Hook-layer capture")
- Hooks do not trust agent cooperation; capture must survive hostile behaviour. (source: 08_Observability_and_Calibration.md "Hook-layer capture")
- No advisory tier; every hook blocks or emits a structured event. (source: 00_Architecture.md Section 6 Invariant 1; 10_Anti-Patterns_Defeated.md row 25)
- Polyglot with graceful degradation on absent bash or Node. (source: 00_Architecture.md Section 6 Invariant 9)
- Trace events conform to the closed schema (Invariant 18). (source: 00_Architecture.md Section 6 Invariant 18)
- Null-lesson prohibition applies to the stop-hook lesson path (Invariant 15 analogue): a failing contract with no non-null lesson cannot silently exit. (source: 00_Architecture.md Section 6 Invariant 15; 06_The_Ledger.md "How the Ledger is written"; 08_Observability_and_Calibration.md "Hook-layer capture")

#### Tests or fixtures

- The three hooks are exercised indirectly by `tests/loop/loop.test.js` (Task 4.10) when the loop test drives a full `/start` to `/ship` cycle; the trace file accumulates events from `post-tool-use`; the `user-prompt-submit` routing is asserted on a synthesised contracting-phase prompt; the `stop` hook is asserted by ending a session with a deliberately failing contract and checking that a lesson is appended.

#### Verification command

```
for h in post-tool-use user-prompt-submit stop; do
  test -f dg-anvil/hooks/$h || exit 1
  head -3 dg-anvil/hooks/$h | grep -q 'command -v bash' || exit 1
  grep -q "hook $h" dg-anvil/hooks/$h || exit 1
done
```

Expected exit 0.

#### Done when

`hooks/post-tool-use`, `hooks/user-prompt-submit`, and `hooks/stop` each start with the bash-availability guard, delegate to `node dg-anvil/cli/anvil.js hook <name>`, and emit structured events through `cli/lib/trace.js`. The `stop` hook replays the contract and writes a lesson on failure; a null lesson on failure blocks the stop.

### Task 4.7: Extend `cli/lib/verifier.js` for Go support

#### Goal

Extend `cli/lib/verifier.js` (Stage 2 JavaScript, Stage 3 Python) to add Go support to the Wired probe, the Substantive probe coverage tooling (via `go test -coverprofile`), and the Functional probe runner (via `go test`). JavaScript and Python behaviour unchanged.

#### Inputs

- `reports/DG-Anvil/00_Architecture.md` Section 3 "Wired-probe language support"; "Coverage tooling".
- `reports/Anvil-Design/05_The_Contract.md` "Wired verification"; "Substantive verification"; "Functional".
- `dg-anvil/cli/lib/verifier.js` (Stage 2 JavaScript + Stage 3 Python).
- `dg-anvil/cli/lib/io.js`, `cli/lib/errors.js`.

#### Outputs

- `dg-anvil/cli/lib/verifier.js` (extended)
  - Language dispatch: the module detects the target source language from the criterion's `exists.file` extension: `.js`, `.mjs`, `.cjs` -> JavaScript; `.py` -> Python; `.go` -> Go; anything else -> `E_UNSUPPORTED_LANGUAGE`. The language support set at Stage 4 is `['javascript', 'python', 'go']` exactly; no further languages in v1.
  - `probeWired({worktreePath, criterion})` extended: when the target is Go, the walker implements a minimal recursive-descent identifier-extractor that reads the file, strips Go comments (`//` and `/* */`), strips string literals (including raw strings with backticks), and scans for the pattern `<symbol>(` where `<symbol>` is `criterion.wired.call_site.must_contain_symbol`. The walker respects the contract's `line_range` if present. Zero external dependencies (no `go/ast` or `go vet`; pure string scanning with Go-specific comment and string rules).
  - Go walker edge-case rules (explicit; the walker honours all four unconditionally):
    (a) Backtick raw strings (`` `...` ``) are stripped before scanning; the walker tracks backtick depth and skips all content including embedded backslashes (raw strings have no escape interpretation per the Go specification).
    (b) Interpreted string literals (double-quoted) preserve escape sequences (`\n`, `\t`, `\"`, `\\`) during walker scanning; the walker does not prematurely terminate at an escaped quote.
    (c) Single-line (`//`) and block (`/* */`) comments are stripped before scanning; a symbol mention inside a comment is not counted as a call.
    (d) `import` blocks (both single-line `import "foo"` and multi-line `import ( ... )` forms) do not count as calls; the walker skips identifier scanning inside the import declaration block.
  - Paired Go unit-test cases (added in the Task 4.7 unit-test extension in `tests/unit/verifier.test.js`): (1) a fixture where the target symbol appears inside a backtick raw string and the walker must NOT count it as a call; (2) a fixture with an escaped double-quote inside a double-quoted interpreted string where the walker correctly tracks the string boundary; (3) a fixture with the target symbol name appearing inside a multi-line `import ( ... )` block where the walker does not count the import as a call.
  - Source for edge-case rules: The Go Programming Language Specification sections on string literals (both interpreted and raw), comments, and import declarations.
  - `probeSubstantive({worktreePath, criterion, diffPath, toolOutputPath})` extended: when the target is Go, the coverage path invokes `io.spawn('go', ['test', '-coverprofile=<cov-file>', '-run', <test-name>, <target-package>], {cwd: worktreePath})`. If `go` is not on PATH, returns `E_UNSUPPORTED_LANGUAGE` (not `E_COVERAGE_UNAVAILABLE`; the toolchain itself is missing). Go's `go test -coverprofile` is built-in; there is no separate coverage-tool install path.
  - `probeFunctional({worktreePath, criterion})` extended: the runner schema gains one entry for Go: `go test` (invoked as `go test <target-package>` with the standard Go test output parsed for `PASS`, `FAIL`, and `must_pass` name matching; the test names map to Go test function names like `TestFoo`). The runner argument shape is declared at the top of the module. When `criterion.functional.probe.runner` is `go test`, the `target` is resolved relative to `worktreePath` and the spawn path uses `io.spawn` with the argument array.
  - `evaluateInvariants({worktreePath, contract, diffPath})` unchanged in function shape; the `no_new_dependencies` checker now also reads `go.mod` for Go targets.
  - `SUPPORTED_LANGUAGES` updated: `Object.freeze(['javascript', 'python', 'go'])`. The constant remains frozen.
  - No `TODO`, `FIXME`, `XXX`, `HACK`, `TBD`, `WIP`, `NOTE:` markers. No persona phrasing.

#### Decisions already made

- Stage 4 ships Go Wired-probe support; `fixture-repo-go` is the reference fixture. (source: 00_Architecture.md Section 3 "Wired-probe language support")
- Go coverage tooling: Go built-in `go test -coverprofile`. No external dependency. (source: 00_Architecture.md Section 3 "Coverage tooling")
- A Wired probe invoked against a language not yet supported by the current stage returns `E_UNSUPPORTED_LANGUAGE`. With Go added in Stage 4, no further languages return `E_UNSUPPORTED_LANGUAGE` in v1. (source: 00_Architecture.md Section 3 "Wired-probe language support")
- Zero runtime dependencies; no external AST parsers. (source: 00_Architecture.md Section 3 Runtime; Invariant 11)
- The Wired probe's authority is the presence of a call expression inside the named file's line range; the walker is minimal and not a compiler. (source: 05_The_Contract.md "Wired verification")
- `go test -coverprofile` is invoked via `io.spawn` with an argument array; no shell interpolation. (source: 00_Architecture.md Section 3 Subprocess invocation)

#### Tests or fixtures

- `tests/unit/verifier.test.js` (from Stage 2, extended in Stage 3, extended here) gains Go positive and negative cases for each of the four probe functions plus the invariants evaluator. New cases use `fs.mkdtempSync` to build a disposable Go source file and runner; the test skips on hosts without Go via a preflight `command -v go` check and records the skip as structured output (not a silent pass).
- `tests/loop/fixture-repo-go/` (Task 4.9) is the integration-level exercise.

#### Verification command

```
node -e "const v=require('./dg-anvil/cli/lib/verifier.js'); if(!Array.isArray(v.SUPPORTED_LANGUAGES)||!v.SUPPORTED_LANGUAGES.includes('javascript')||!v.SUPPORTED_LANGUAGES.includes('python')||!v.SUPPORTED_LANGUAGES.includes('go')){process.exit(1)}; if(!Object.isFrozen(v.SUPPORTED_LANGUAGES)){process.exit(1)}; if(v.SUPPORTED_LANGUAGES.length!==3){process.exit(1)}"
```

Expected exit 0.

#### Done when

`cli/lib/verifier.js` exports `SUPPORTED_LANGUAGES` frozen at `['javascript', 'python', 'go']`; every probe dispatches on the criterion's target extension; Go coverage is invoked via `go test -coverprofile`; `go test` runner shape is declared; `tests/unit/verifier.test.js` Go cases run green on hosts where Go is installed and record a structured skip on hosts where it is not.

### Task 4.8: Extend `cli/lib/court.js` with whole-branch Court and wire `anvil metrics`, `anvil audit`, and `anvil hook`

#### Goal

Extend `cli/lib/court.js` with a `judgeBranch` entry point that accepts a branch-diff input and the full contract; the structural input-isolation discipline is preserved. Wire `anvil metrics`, `anvil audit`, and the internal `anvil hook` sub-dispatch (consumed by the hook scripts) in `cli/anvil.js`.

#### Inputs

- `reports/Anvil-Design/07_The_Court.md` "Whole-branch Court".
- `reports/Anvil-Design/04_Anatomy.md` One CLI binary table (`anvil metrics`, `anvil audit`).
- `reports/Anvil-Design/08_Observability_and_Calibration.md` "The metrics catalogue"; "The theatre-drift index".
- `reports/DG-Anvil/00_Architecture.md` Section 3 "Error format"; Section 6 (Invariants 5, 13, 14); Section 4 (Stage 4 produces row).
- `dg-anvil/cli/lib/court.js` (Stage 3).
- `dg-anvil/cli/lib/metrics.js` (from Task 4.3).
- `dg-anvil/cli/lib/trace.js` (from Task 4.1).
- `dg-anvil/cli/anvil.js`.

#### Outputs

- `dg-anvil/cli/lib/court.js` (extended)
  - Exports `judgeBranch({branchDiff, contract, verifyOutput, confidence, dispatcher})` where:
    - `branchDiff` is a string (the full branch diff from base to HEAD, captured by the caller).
    - `contract` is the full parsed-and-validated contract object.
    - `verifyOutput` is the aggregated `verifyAll` structured result across every task in the branch.
    - `confidence` is derived from the verifier's captured output as in `judge`.
    - `dispatcher` is the injected subagent dispatcher.
  - Structural input isolation: `judgeBranch` accepts ONLY the five named parameters. No `plan`, `commitMessage`, `ledger`, `priorVerdicts`, or `rationale` parameter. The same `composeBriefing({task_id, contract, diff, verify_output})` helper is used; for whole-branch, `task_id` is the literal string `'branch'` and `diff` is the branch diff.
  - The same `ALLOWED_COURT_BRIEFING_KEYS` and `FORBIDDEN_COURT_INPUT_KEYS` guards apply.
  - Process: dispatches a fresh subagent with the `COURT_WHOLE_BRANCH_INSTRUCTION` constant (a persona-free prompt that names cross-task architectural drift, invariant violations across tasks, and orphans created by later tasks removing earlier callers; same shape as Pass 1 and Pass 2 instruction constants). Returns the same structured verdict shape as `judge` with an additional `scope: 'branch'` field.
  - Whole-branch Court failures are ALWAYS escalated, never auto-reset (per `07_The_Court.md` "Whole-branch Court is expensive ... if it fails, the failure is always escalated"). The `recommendation.action` for a failing whole-branch Court is `'escalate'` with no reset path.
  - Exports the new instruction constant `COURT_WHOLE_BRANCH_INSTRUCTION` as a frozen string; persona-free. `COURT_WHOLE_BRANCH_INSTRUCTION` ENDS WITH the exact text: `"Return the verdict as block-style YAML matching the Court output format in 07_The_Court.md. Do not emit JSON. Do not use flow-style braces or brackets."`
  - No module-level state added (Invariant 13 preserved).

- `dg-anvil/cli/anvil.js` (extended)
  - `stubMetrics` replaced by a handler accepting:
    - `--since <iso-8601>` - optional (default: no filter).
    - `--trace <path>` - optional (default `./anvil/trace.jsonl`).
    - `--ledger <path>` - optional (default `~/.anvil/ledger.jsonl`).
    - Process:
      1. Calls `metrics.computeMetrics({tracePath, ledgerPath, since})`.
      2. Prints the result via `metrics.formatReport(result)` to stdout.
      3. Writes the calibration report to `./anvil/calibration.jsonl` (handled inside `computeMetrics`).
      4. If `result.theatreDriftExceedsThreshold === true`, exits non-zero with a structured error `{error: 'theatre drift index exceeds threshold', code: 'E_THEATRE_DRIFT_EXCEEDED', details: {theatre_drift_index: <number>, threshold: 0.15, triggering_tasks: [<taskIds>]}}` on stderr.
      5. Otherwise exits 0.
  - `stubAudit` replaced by a handler that:
    - Runs `anvil ledger audit` (the sub-subcommand wired in Stage 3 Task 3.7) plus the analysis-only codebase health pass. The Stage 4 `anvil audit` delegates to `anvil ledger audit` for the ledger portion and adds no code mutation. Per `04_Anatomy.md` One CLI binary "Read-only codebase health pass (analysis skills only, no mutation)".
    - Prints a JSON summary to stdout combining the ledger audit result with the codebase scan (dead-symbol candidates from the Wired probe walker run over every source file, orphan import candidates, secret-pattern candidates from `contract.invariants.no_secret_patterns` applied to the current source tree).
    - Exits 0 on success.
  - New `hook` internal sub-dispatch subcommand added to the dispatch table (authorised by `00_Architecture.md` Section 4 Stage 4 produces row `anvil hook` entry). Arg shape: `anvil hook <event> [--payload <path>]`, where `<event>` is one of `session-start`, `pre-tool-use`, `post-tool-use`, `user-prompt-submit`, `stop` and `--payload` is an optional file path whose contents are parsed as the invocation JSON (default: stdin). Rejects unknown `<event>` with `E_UNKNOWN_SUBCOMMAND`. Each sub-subcommand:
    - Reads invocation JSON from stdin (or from `--payload <path>` when supplied).
    - Routes to the corresponding internal handler in `cli/lib/hooks.js` (a new file authored in this task; imports only from `cli/lib/trace.js`, `cli/lib/contract.js`, `cli/lib/verifier.js`, `cli/lib/ledger-write.js`, `cli/lib/worktree.js`, `cli/lib/io.js`, `cli/lib/errors.js`). Each handler encapsulates the logic described in Tasks 4.5 and 4.6.
    - Exits with the exit code specified by each hook (0, 2 for blocks, etc.).
  - Every other Stage 0/1/2/3 dispatch entry preserved unchanged.
  - The `--help` output is extended to document `anvil metrics`, `anvil audit`, and the `anvil hook` sub-subcommands.

- `dg-anvil/cli/lib/hooks.js` (new; authorised as a peer of the other `cli/lib/*.js` modules per `00_Architecture.md` Section 2 source tree and listed in the Stage 4 produces row per `00_Architecture.md` Section 4)
  - Exports `preToolUse(invocation)`, `postToolUse(invocation)`, `userPromptSubmit(invocation)`, `stop(invocation)` each returning `{exitCode: integer, stdout: string, stderr: string}` based on the logic specified in Tasks 4.5 and 4.6.
  - Exports `DESTRUCTIVE_PATTERNS` as a frozen array of the four literal-substring patterns: `['rm -rf', 'git push --force', 'git push -f', 'git config', 'npm publish']`.
  - Exports `SHIP_APPROVAL_TOKEN_FIELD` as a frozen constant string `'anvil_approval_token'`.
  - Policy responsibilities centralised here (rather than duplicated across the four polyglot shell scripts): destructive-pattern matching on `tool_input.command` and `tool_input.file_path`; `no_secret_patterns` invariant enforcement against the active contract; ship-phase approval-token validation against `anvil/state.json` `meta.ship_approval_token`; trace-event composition for every hook branch (block, allow, passthrough, routing, stop-replay); stop-hook contract replay and lesson synthesis routed through `cli/lib/ledger-write.js`. Required by Invariant 1 (no advisory hooks) because the block/emit discipline cannot live in bash alone without duplication across the four scripts; sourced to `00_Architecture.md` Section 4 Stage 4 produces row ("`cli/lib/hooks.js` (centralised hook-policy module invoked from the four polyglot shell scripts; required by Invariant 1 because hook policy cannot live in bash alone without duplication)").
  - Imports only from Node builtins and from `cli/lib/trace.js`, `cli/lib/contract.js`, `cli/lib/verifier.js`, `cli/lib/ledger-write.js`, `cli/lib/worktree.js`, `cli/lib/io.js`, `cli/lib/errors.js`.
  - No `TODO`, `FIXME`, `XXX`, `HACK`, `TBD`, `WIP`, `NOTE:` markers; no persona phrasing.

#### Decisions already made

- Whole-branch Court: final Court runs once on the full branch diff before `/ship`; catches cross-task architectural drift, invariant violations across tasks, orphans from later tasks. (source: 07_The_Court.md "Whole-branch Court")
- Whole-branch Court failures are always escalated, never auto-reset. (source: 07_The_Court.md "Whole-branch Court is expensive ... always escalated")
- Structural input isolation applies equally to whole-branch Court. (source: 00_Architecture.md Section 6 Invariant 14; 07_The_Court.md "Whole-branch Court" implicitly inherits the Pass 1 / Pass 2 discipline)
- `anvil metrics` returns non-zero exit when theatre-drift exceeds the 0.15 threshold; structured error on stderr. (source: 08_Observability_and_Calibration.md "The theatre-drift index")
- `anvil audit` is read-only; analysis skills only; no mutation. (source: 04_Anatomy.md One CLI binary)
- `cli/lib/hooks.js` is the centralised hook-policy module authorised by `00_Architecture.md` Section 2 source tree (listed as a peer of the other `cli/lib/*.js` modules) and `00_Architecture.md` Section 4 Stage 4 produces row. Its existence is motivated by Invariant 1 (no advisory hooks): the block/emit discipline cannot live in bash alone without duplication across the four polyglot shell scripts, so the policy is centralised in Node and the bash scripts delegate to `node cli/anvil.js hook <event>`. (source: 00_Architecture.md Section 2 source tree; Section 4 Stage 4 produces row; Section 6 Invariant 1)
- `anvil hook` is an internal sub-dispatch subcommand with sub-subcommands one per hook event; it is invoked by the polyglot hook scripts and is not user-facing. The arg shape is `anvil hook <event> [--payload <path>]` where `<event>` is one of `session-start`, `pre-tool-use`, `post-tool-use`, `user-prompt-submit`, `stop` and `--payload` is an optional path to a file containing the invocation JSON (default: stdin). (source: 00_Architecture.md Section 4 Stage 4 produces row)
- Hooks delegate to `node dg-anvil/cli/anvil.js hook <name>` (Tasks 4.5 and 4.6); `cli/lib/hooks.js` centralises the hook policies.
- No external argument parser; the schema is declared inline per subcommand per `cli/lib/args.js`. (source: 00_Architecture.md Section 3 CLI argument parsing)
- Every CLI subcommand exits 0 on success, non-zero with `{error, code, details}` JSON on stderr. (source: 00_Architecture.md Section 3 Error format; Invariant 5)
- Fresh-subagent discipline for `judgeBranch`: no module-level state added; briefings frozen. (source: 00_Architecture.md Section 6 Invariant 13)
- `COURT_WHOLE_BRANCH_INSTRUCTION` ends with an explicit block-style YAML demand. Without this, live whole-branch Court dispatch throws `E_INVALID_YAML` at parse because LLMs default to JSON. (source: 00_Architecture.md Section 3 YAML subset; 07_The_Court.md Court output format)

#### Tests or fixtures

- `tests/unit/court.test.js` (Stage 3) is extended in this task with a `judgeBranch` test that asserts the same structural input-isolation guards (`E_COURT_INPUT_VIOLATION` on any forbidden key; `ALLOWED_COURT_BRIEFING_KEYS` still applies) and asserts whole-branch failures yield `recommendation.action === 'escalate'` (not `'reset'`). The extended test also asserts `COURT_WHOLE_BRANCH_INSTRUCTION` contains the substring `block-style YAML`.
- `tests/unit/hooks.test.js` (Task 4.8a) asserts the hook-policy coverage for `cli/lib/hooks.js`.
- `tests/loop/loop.test.js` (Task 4.10) exercises `anvil metrics`, `anvil audit`, and the hook delegations end-to-end.

#### Verification command

```
node -e "const c=require('./dg-anvil/cli/lib/court.js'); if(typeof c.judgeBranch!=='function'){process.exit(1)}; if(typeof c.COURT_WHOLE_BRANCH_INSTRUCTION!=='string'){process.exit(1)}; const h=require('./dg-anvil/cli/lib/hooks.js'); for(const f of ['preToolUse','postToolUse','userPromptSubmit','stop']){if(typeof h[f]!=='function'){process.exit(1)}}; if(!Array.isArray(h.DESTRUCTIVE_PATTERNS)||!Object.isFrozen(h.DESTRUCTIVE_PATTERNS)){process.exit(1)}"
```

Expected exit 0.

#### Done when

`cli/lib/court.js` exports `judgeBranch` with the same five-parameter discipline as `judge`; `COURT_WHOLE_BRANCH_INSTRUCTION` is a frozen persona-free string; `cli/lib/hooks.js` exports the four hook handlers and the two frozen constants; `cli/anvil.js` wires `anvil metrics`, `anvil audit`, and the `anvil hook` sub-subcommands with the arg shape `anvil hook <event> [--payload <path>]`; `anvil metrics` returns non-zero exit with `E_THEATRE_DRIFT_EXCEEDED` when the threshold is exceeded.

### Task 4.8a: Author the hooks unit test

#### Goal

Ship `tests/unit/hooks.test.js` asserting block-on-destructive-pattern behaviour, `no_secret_patterns` invariant enforcement, ship-phase approval-token bypass, and passthrough for non-blocking events, covering every exported handler of `cli/lib/hooks.js`.

#### Inputs

- `reports/DG-Anvil/00_Architecture.md` Section 4 (Stage 4 produces row naming `tests/unit/hooks.test.js`); Section 6 (Invariants 1, 5, 9, 18); Section 7 (Test tiers).
- `reports/Anvil-Design/04_Anatomy.md` Five hooks table.
- `reports/Anvil-Design/10_Anti-Patterns_Defeated.md` rows 22, 23, 25.
- `dg-anvil/cli/lib/hooks.js` (from Task 4.8).
- `dg-anvil/cli/lib/trace.js` (from Task 4.1).
- `dg-anvil/cli/lib/errors.js`.

#### Outputs

- `dg-anvil/tests/unit/hooks.test.js`
  - Uses `node:test` and `node:assert`.
  - `setup()`: creates a temp directory via `fs.mkdtempSync` with an `anvil/` subfolder carrying a fixture `contract.yml` (one criterion, optional `invariants.no_secret_patterns` entries such as `AKIA[0-9A-Z]{16}` and `AWS_SECRET_ACCESS_KEY`), a fixture `state.json` (with and without `meta.ship_approval_token`), and a `trace.jsonl` sink.
  - Block-on-destructive-pattern tests (one per entry in `DESTRUCTIVE_PATTERNS`):
    - `preToolUse` with a Bash `tool_input.command` containing `rm -rf /tmp/foo` returns `{exitCode: 2}`; stderr parses to `{code: 'E_HOOK_BLOCKED', details: {rule: 'destructive_pattern', pattern: 'rm -rf', tool: 'Bash'}}`.
    - `preToolUse` with `git push --force origin main` returns `exitCode: 2` and `details.pattern === 'git push --force'`.
    - `preToolUse` with `git push -f` returns `exitCode: 2` and `details.pattern === 'git push -f'`.
    - `preToolUse` with `git config user.email ...` returns `exitCode: 2` and `details.pattern === 'git config'`.
    - `preToolUse` with `npm publish` returns `exitCode: 2` and `details.pattern === 'npm publish'`.
  - `no_secret_patterns` invariant tests:
    - Load the fixture contract with `no_secret_patterns: ['AKIA[0-9A-Z]{16}', 'AWS_SECRET_ACCESS_KEY']`. `preToolUse` with a Write `tool_input.content` containing `AKIAABCDEFGHIJKLMNOP` returns `exitCode: 2` and `details.rule === 'no_secret_patterns'` with `details.contract_criterion` set to the matching criterion id (or null if the invariant is contract-global).
    - `preToolUse` with a Write whose content does not match any pattern returns `exitCode: 0`.
    - When no contract is present at `anvil/contract.yml`, the secret-pattern check defaults to an empty set and the destructive-pattern check runs alone (absence of secret patterns is not a block).
  - Ship-phase approval-token bypass tests:
    - `state.json` carries `meta.ship_approval_token: 't-abc'`. `preToolUse` with `tool_input.meta.anvil_approval_token: 't-abc'` and a destructive command returns `exitCode: 0` with a trace event carrying `outcome: 'start'` and `meta.ship_phase_bypass: true`.
    - Same destructive command with `tool_input.meta.anvil_approval_token: 't-wrong'` returns `exitCode: 2` with `details.code === 'E_SHIP_APPROVAL_TOKEN_INVALID'`.
    - Same destructive command with no token field returns `exitCode: 2` and `details.rule === 'destructive_pattern'` (token absence falls through to the standard block).
    - `state.json` with no `meta.ship_approval_token` plus an `tool_input.meta.anvil_approval_token: 't-abc'` returns `exitCode: 2` with `details.code === 'E_SHIP_APPROVAL_TOKEN_INVALID'`.
    - Stale-token case: `state.json` carries a valid token string with `expires_at` set to 10 minutes in the past; `preToolUse` invoked with a destructive command and the matching token returns exit code non-zero with `details.code: 'E_SHIP_APPROVAL_TOKEN_INVALID'` and `details.reason: 'expired'`.
  - Commit-message citation tests (one block test per commit-creating git subcommand path):
    - `preToolUse` with `tool_name: 'Bash'` and `tool_input.command: "git commit -m 'fix: small change'"` (no citations) returns exit code non-zero with `details.code === 'E_HOOK_BLOCKED'` and `details.rule === 'commit_message_missing_citation'`.
    - `preToolUse` with `tool_name: 'Bash'` and `tool_input.command: "git commit -m 'fix: small change\n\nanvil_run_id=r-1a2b3c4d\nanvil_task=T7'"` (both citations present) returns `exitCode: 0`.
    - `preToolUse` with `tool_name: 'Bash'` and `tool_input.command: "git commit -m 'fix\n\nanvil_run_id=r-1a2b3c4d'"` (only run_id, no task) returns exit code non-zero with `details.rule === 'commit_message_missing_citation'`.
    - `preToolUse` with `git commit --amend` whose extracted message lacks citations returns exit code non-zero with `details.rule === 'commit_message_missing_citation'`.
    - `preToolUse` with `git cherry-pick <source>` where the source commit's message (fetched via `git log --format=%B -1 <source>`) lacks citations returns exit code non-zero with `details.rule === 'cherry_pick_source_missing_citation'`.
    - `preToolUse` with `git cherry-pick <source>` where the source commit's message contains both citations returns `exitCode: 0`.
    - `preToolUse` with `git cherry-pick --continue` where `CHERRY_PICK_HEAD`'s message lacks citations returns exit code non-zero with `details.rule === 'cherry_pick_continue_missing_citation'`.
    - `preToolUse` with `git rebase --continue` where `REBASE_HEAD`'s message lacks citations returns exit code non-zero with `details.rule === 'rebase_continue_missing_citation'`.
    - `preToolUse` with `git am <mailbox>` where at least one patch's message lacks citations returns exit code non-zero with `details.rule === 'am_patch_missing_citation'`.
    - `preToolUse` with `git am <mailbox>` where every patch's message contains both citations returns `exitCode: 0`.
    - `preToolUse` with `git merge <branch>` (no `-m`) returns exit code non-zero with `details.rule === 'merge_message_missing_citation'` and guidance text "merges must use git merge -m ...".
    - `preToolUse` with `git merge -m 'merge X\n\nanvil_run_id=r-1a2b3c4d\nanvil_task=T7' <branch>` returns `exitCode: 0`.
  - Passthrough tests for non-blocking events:
    - `postToolUse` with a well-formed invocation appends exactly one well-formed line to `trace.jsonl` and returns `exitCode: 0`. A second call appends a second line. The appended lines parse as JSON and validate against the trace schema (no extraneous keys; every enumerated value in range).
    - `postToolUse` with an invocation that would produce an out-of-schema trace event returns `exitCode: 0` (the hook never blocks the tool call on observability failure per Task 4.6) and writes an `E_INVALID_TRACE_EVENT` structured error to stderr.
    - `userPromptSubmit` with `state.json` `meta.contract_unconfirmed === true` returns stdout `{route: 'contracting', prompt: ...}` and `exitCode: 0`.
    - `userPromptSubmit` with `state.json` whose `state.tasks` contains at least one task with `status: 'escalated'` (detected via `escalation.listEscalated(state)` from Task 4.8b) returns stdout `{route: 'escalation_handler', prompt: ...}` and `exitCode: 0`.
    - `userPromptSubmit` with `state.json` where `meta.contract_unconfirmed` is false/absent and no task in `state.tasks` has `status: 'escalated'` returns stdout `{route: 'passthrough', prompt: ...}` and `exitCode: 0`.
    - `stop` with no contract file returns `exitCode: 0` (no criteria to replay; trace event with `outcome: 'pass'` and `meta.hook: 'stop'`).
    - `stop` with a passing contract returns `exitCode: 0` and writes a trace event with `outcome: 'pass'`.
    - `stop` with a failing contract that can produce a non-null lesson returns `exitCode: 0`, appends one ledger entry via `cli/lib/ledger-write.js`, and writes a trace event with `outcome: 'fail'` and `meta.lesson_id` non-null.
    - `stop` with a failing contract that cannot produce a non-null lesson returns non-zero with `E_NULL_LESSON` (the stop is blocked; session cannot silently end).
  - Constant-freezing assertions:
    - Asserts `DESTRUCTIVE_PATTERNS` is an array of exactly five entries in the declared order and is `Object.isFrozen`.
    - Asserts `SHIP_APPROVAL_TOKEN_FIELD === 'anvil_approval_token'` and is a string primitive.
  - Taxonomy citation: header comment naming rows 22, 23, and 25.
  - `teardown()`: removes the temp directory.
  - CommonJS.

#### Decisions already made

- Unit tests are paired one-to-one with `cli/lib/<module>.js`; `tests/unit/hooks.test.js` pairs with `cli/lib/hooks.js` per `00_Architecture.md` Section 7 and Section 4 Stage 4 produces row. (source: 00_Architecture.md Section 4 Stage 4 produces row; Section 7 Test tiers)
- Every exported function has at least one positive and one negative test; rejection rules have dedicated tests. (source: 00_Architecture.md Section 7 Test tiers)
- Hook-policy invariants from `04_Anatomy.md` Five hooks table and Invariant 1 (no advisory hooks) are tested here, not left to the loop test alone. (source: 00_Architecture.md Section 6 Invariant 1)
- Pressure tests are for skills; hook-policy tests are unit tests because `cli/lib/hooks.js` is a library module. (source: 00_Architecture.md Section 7 Test tiers; Section 6 Invariant 8 scope)

#### Tests or fixtures

- Self-contained; `fs.mkdtempSync` produces the test directory; fixture contract, state, and trace files are written inline.

#### Verification command

```
node --test dg-anvil/tests/unit/hooks.test.js
```

Expected exit 0.

#### Done when

`tests/unit/hooks.test.js` runs green; every entry in `DESTRUCTIVE_PATTERNS` has a dedicated block test; the `no_secret_patterns` invariant is asserted positive and negative; the ship-phase approval-token bypass is asserted for valid, invalid, missing, and unwritten-state cases; passthrough routing is asserted for every `userPromptSubmit`, `postToolUse`, and `stop` branch; the `E_NULL_LESSON` block of the stop hook is asserted.

### Task 4.8b: Wire `anvil escalation` CLI and route user-prompt-submit on escalation

#### Goal

Provide a human-facing surface for escalated tasks. CLI subcommands `anvil escalation list` and `anvil escalation describe --task <id>`; `hooks/user-prompt-submit` prepends an escalation banner when any task in state.json has status `escalated`.

#### Inputs

- `reports/DG-Anvil/00_Architecture.md` Section 3 Escalation handler subsection.
- `reports/DG-Anvil/00_Architecture.md` Section 3 Runtime state file shape.
- `dg-anvil/cli/anvil.js` (extended through Task 4.8).
- `dg-anvil/cli/lib/hooks.js` (from Task 4.8).
- `dg-anvil/cli/lib/io.js`, `cli/lib/errors.js`.

#### Outputs

- `dg-anvil/cli/anvil.js` dispatch table entry `escalation` routing `list` and `describe` sub-subcommands. Arg shape: `anvil escalation list` (no flags) and `anvil escalation describe --task <id>`. Unknown sub-subcommand rejects with `E_UNKNOWN_SUBCOMMAND`.
- `dg-anvil/cli/lib/escalation.js` (new file; peer of existing `cli/lib/*.js` modules per `00_Architecture.md` Section 2 source tree). Handler body for the escalation surface. Imports only from Node builtins, `cli/lib/io.js`, `cli/lib/errors.js`. CommonJS.
  - `listEscalated(state)` returns an array of task records with status `escalated`, each containing task id, failing criterion id, evidence snippet, and the three next-action options (amend contract, amend plan, abort).
  - `describeEscalated(state, taskId)` returns a single record or throws `E_ESCALATION_TASK_NOT_FOUND`.
  - `escalationBanner(state)` returns a short multi-line string for user-prompt-submit to prepend (cites task ids and the CLI command `anvil escalation describe --task <id>`).
- `dg-anvil/cli/lib/hooks.js` `userPromptSubmit` handler body updated: if `escalation.listEscalated(state).length > 0`, prepend `escalation.escalationBanner(state)` to the hook's stdout output; otherwise passthrough.
- `dg-anvil/cli/lib/errors.js` extended with `E_NO_ESCALATED_TASKS` (when `list` finds none) and `E_ESCALATION_TASK_NOT_FOUND` (when `describe` names a missing task).
- `dg-anvil/tests/unit/escalation.test.js` covering list, describe, and banner behaviour. Uses `node:test` and `node:assert`. Fixtures: a clean state.json (no escalated tasks) and a state.json with two escalated tasks. CommonJS.

#### Decisions already made

- `anvil escalation list` is read-only; it never mutates state. (source: 00_Architecture.md Section 3 Escalation handler)
- Escalation banner prepend is the only non-passthrough route from user-prompt-submit for escalated state. (source: 00_Architecture.md Section 3 Escalation handler)
- New codes `E_NO_ESCALATED_TASKS` and `E_ESCALATION_TASK_NOT_FOUND` registered in `cli/lib/errors.js`. (source: 00_Architecture.md Section 3 Error format)
- Escalation handler is a compositional outcome of existing skills; no new SKILL.md is authored. (source: 00_Architecture.md Section 3 Escalation handler)

#### Tests or fixtures

- Unit test asserts `listEscalated` returns empty array on a clean state, non-empty on a state with escalated tasks; `describeEscalated` raises `E_ESCALATION_TASK_NOT_FOUND` on missing task; `escalationBanner` output matches a snapshot for a fixture state with two escalated tasks.

#### Verification command

```
node --test dg-anvil/tests/unit/escalation.test.js
node dg-anvil/cli/anvil.js escalation list --state tests/fixtures/state-escalated.json | grep -q 'escalated'
```

Expected exit 0.

#### Done when

`anvil escalation list` and `anvil escalation describe --task <id>` return structured output; `hooks/user-prompt-submit` prepends the escalation banner when any task is escalated; all unit tests pass; `E_NO_ESCALATED_TASKS` and `E_ESCALATION_TASK_NOT_FOUND` are registered in `cli/lib/errors.js`.

### Task 4.9: Author `commands/ship.md` and wire `anvil ship`

#### Goal

Create the `/ship` command. Runs contract replay from a clean worktree. Dispatches the whole-branch Court. Opens PR via `gh` CLI. Requires human merge.

#### Inputs

- `reports/Anvil-Design/04_Anatomy.md` Five slash commands table (`/ship` row); One CLI binary table (`anvil ship`).
- `reports/Anvil-Design/07_The_Court.md` "Whole-branch Court".
- `reports/Anvil-Design/11_Implementation_Plan.md` Stage 4 ("Whole-branch Court; PR open via `gh` CLI"); "Success criteria for v1 release".
- `reports/DG-Anvil/00_Architecture.md` Section 3 "Error format"; Section 4 (Stage 4 produces row); Section 6 (Invariants 4, 5, 16).
- `dg-anvil/cli/lib/court.js` (extended in Task 4.8).
- `dg-anvil/cli/lib/verifier.js`, `cli/lib/contract.js`, `cli/lib/worktree.js`, `cli/lib/io.js`, `cli/lib/trace.js`, `cli/lib/errors.js`.

#### Outputs

- `dg-anvil/commands/ship.md`
  - Frontmatter (YAML, fenced with triple-dash): `name: ship`, `description: Final gate. Runs contract replay, final whole-branch Court, opens PR. Requires human merge.`, `arguments: []`.
  - Body: imperative instructions:
    1. Read `anvil/state.json`. Assert every task in the plan has `status === 'passed'`. If any task is not passed, exit with `{error: 'ship blocked: unfinished tasks', code: 'E_SHIP_REPLAY_FAILED', details: {unfinished: [<taskIds>]}}`.
    2. Read `anvil/contract.yml` via `cli/lib/contract.js` `loadAndValidate`.
    3. Write an ephemeral `ship_approval_token` into `anvil/state.json` `meta.ship_approval_token` as a random UUID. The token is valid for the duration of this ship invocation. `pre-tool-use` reads this field to authorise any destructive tool call during the ship phase (e.g. `git push` on a ship branch). The token is removed at the end of the ship invocation regardless of outcome. Writes `meta.ship_approval_token` as a cryptographically-random 32-byte hex string from `crypto.randomBytes(32).toString('hex')` and `meta.ship_approval_token_expires_at` as `new Date(Date.now() + 300000).toISOString()` (5-minute TTL per Section 3 of the architecture).
    4. Create a clean worktree via `cli/lib/worktree.js` `create({repoRoot, taskId: 'ship-replay', baseRef: 'HEAD'})`.
    5. Invoke `cli/lib/verifier.js` `verifyAll({worktreePath, contract, diffPath: null, toolOutputPath: null})`. If any criterion returns `allGreen: false`, exit with `E_SHIP_REPLAY_FAILED` and `details = {criterion: <id>, level: <name>, evidence: <raw_path>}`.
    6. Capture the branch diff via `io.spawn('git', ['-C', repoRoot, 'diff', '<base-ref>..HEAD'])` where `<base-ref>` is read from `anvil/state.json` `meta.base_ref` (defaults to the repo's default branch tip at `/start` time; `state.json` records this).
    7. Aggregate the per-task verify results from `<worktree>/anvil/verify/verify-result.json` across every task into a single structured object.
    8. Dispatch the whole-branch Court via `cli/lib/court.js` `judgeBranch({branchDiff, contract, verifyOutput: aggregated, confidence, dispatcher})`. If the verdict's `recommendation.action !== 'merge'`, exit with `{error: 'whole-branch Court non-merge verdict', code: 'E_WHOLE_BRANCH_COURT_FAILED', details: {verdict}}`. Per `07_The_Court.md` "if it fails, the failure is always escalated", the whole-branch Court failure does not trigger reset.
    9. Compose a PR title and body from the contract's `goal`, `source_intent`, and the aggregated verify result (the PR description cites the contract and the verify result paths; no persona phrasing).
    10. Invoke `gh pr create --title <title> --body <body>` via `io.spawn('gh', ['pr', 'create', '--title', <title>, '--body', <body>])`. On any non-zero exit from `gh`, exit with `{error: 'gh PR create failed', code: 'E_SHIP_PR_FAILED', details: {stderr, status}}`.
    11. Write a trace event with `phase: 'ship'`, `outcome: 'pass'`, `meta: {pr_url: <captured stdout>}`.
    12. Remove the `ship_approval_token` from `anvil/state.json` `meta` (clean-up regardless of outcome).
    13. Remove the ship-replay worktree via `cli/lib/worktree.js` `remove`.
    14. Print the PR URL on stdout. Exit 0. Human merge is required; the command does NOT merge the PR.
  - No persona phrasing; no forbidden markers.

- `dg-anvil/cli/anvil.js` (extended)
  - `stubShip` replaced by a handler accepting:
    - `--contract <path>` - optional, default `anvil/contract.yml`.
    - `--state <path>` - optional, default `anvil/state.json`.
    - Process: identical to the `commands/ship.md` body but invoked programmatically. The CLI surface is the authoritative code path; the slash command is a thin wrapper that invokes `anvil ship`.
  - Preserves every other dispatch entry.

#### Decisions already made

- `/ship` is the final gate; runs contract replay, final whole-branch Court, opens PR. The only command that crosses the sandbox boundary. (source: 04_Anatomy.md Five slash commands table)
- `anvil ship` runs contract replay, final Court, opens PR. (source: 04_Anatomy.md One CLI binary)
- Contract replay runs from a clean worktree. (source: 04_Anatomy.md Five slash commands table "Runs contract replay"; 07_The_Court.md "The diff produced by the implementer" runs through a full re-verification)
- Whole-branch Court: final Court on the full branch diff; failures are always escalated. (source: 07_The_Court.md "Whole-branch Court")
- `gh pr create` is the PR-open mechanism; invoked via `io.spawn` with an argument array; no shell interpolation. (source: 00_Architecture.md Section 3 Subprocess invocation)
- Human merge is required; `/ship` does not merge. (source: 04_Anatomy.md Five slash commands table; 11_Implementation_Plan.md "two human touchpoints: contract confirm and PR merge")
- The ship phase is the one context in which destructive tool calls may proceed; the approval token written to `anvil/state.json` `meta.ship_approval_token` is the mechanism `pre-tool-use` checks. (source: 04_Anatomy.md Five hooks table "unless task is in ship phase with explicit approval token")
- `E_SHIP_PR_FAILED`, `E_SHIP_APPROVAL_TOKEN_INVALID`, `E_SHIP_REPLAY_FAILED`, `E_WHOLE_BRANCH_COURT_FAILED` are registered in `cli/lib/errors.js` as part of Task 4.3. (source: Task 4.3 errors-module addition)
- No persona phrasing in PR title or body. (source: 00_Architecture.md Section 6 Invariant 4)
- No auto-pick gate (Invariant 16): the ship-phase bypass token is binary (valid or not); no list-of-N selection. (source: 00_Architecture.md Section 6 Invariant 16)

#### Tests or fixtures

- `tests/loop/loop.test.js` (Task 4.10) exercises `anvil ship` end-to-end against each of the three fixture repos with a stubbed `gh` binary; asserts the contract replay passes, the whole-branch Court returns `merge`, the PR-open spawn is invoked with the right argument array, the approval token is written and cleaned up.

#### Verification command

```
test -f dg-anvil/commands/ship.md && grep -qE 'name: ship' dg-anvil/commands/ship.md && grep -qE 'whole-branch Court|judgeBranch' dg-anvil/commands/ship.md && grep -qE 'gh pr create|gh.*pr.*create' dg-anvil/commands/ship.md && grep -qE 'E_SHIP_PR_FAILED|E_WHOLE_BRANCH_COURT_FAILED' dg-anvil/commands/ship.md && ! grep -qE 'as a senior engineer|you are an expert in' dg-anvil/commands/ship.md
```

Expected exit 0.

#### Done when

`commands/ship.md` runs contract replay from a clean worktree, dispatches the whole-branch Court, opens PR via `gh pr create`, writes and removes the ship approval token, requires human merge; `anvil ship` mirrors the same process path; non-merge whole-branch verdicts exit with `E_WHOLE_BRANCH_COURT_FAILED`; gh failures exit with `E_SHIP_PR_FAILED`.

### Task 4.10: Ship the third loop-test fixture `fixture-repo-go` and the orchestrating `loop.test.js`

#### Goal

Create `tests/loop/fixture-repo-go/` as a minimal Go repository with a hand-authored contract that runs end-to-end through the full Anvil loop. Create `tests/loop/loop.test.js` that orchestrates all three fixture repos (node, python, go) covering three repositories and three languages (JavaScript, Python, Go), satisfying both the Stage 4 completion bar and the v1 success-criteria bar per `00_Architecture.md` Section 4 Stage 4 produces row.

#### Inputs

- `reports/Anvil-Design/11_Implementation_Plan.md` Stage 4 ("Stage 4 is complete when a full loop from `/start` to merged PR runs with zero human touchpoints besides contract confirm and PR merge, on three non-trivial test tasks across three different repositories and two languages.").
- `reports/Anvil-Design/11_Implementation_Plan.md` "Success criteria for v1 release" ("theatre-drift index on a seeded-fault corpus below 5%; lesson hit rate above 0.25 within 50 runs; calibration error for `judging-opus` inside +-0.05; zero advisory-only hooks; zero light-paths; zero persona definitions").
- `reports/Anvil-Design/05_The_Contract.md` Format.
- `reports/DG-Anvil/00_Architecture.md` Section 3 ("Wired-probe language support"; "Coverage tooling"); Section 4 (Stage 4 produces row); Section 7 (Loop tests).
- `dg-anvil/cli/lib/verifier.js` (Go support added in Task 4.7).
- `dg-anvil/cli/anvil.js` (wired in Task 4.8; `ship` wired in Task 4.9).
- `dg-anvil/tests/loop/fixture-repo-node/loop.test.js` (Stage 2 reference).
- `dg-anvil/tests/loop/fixture-repo-python/loop.test.js` (Stage 3 reference).

#### Outputs

- `dg-anvil/tests/loop/fixture-repo-go/README.md`
  - A short file naming the fixture, its task, and the command. No persona phrasing; no forbidden markers.
- `dg-anvil/tests/loop/fixture-repo-go/go.mod`
  - `module fixture-repo-go\n\ngo 1.21\n`. No runtime dependencies.
- `dg-anvil/tests/loop/fixture-repo-go/.gitattributes`
  - `* text=auto eol=lf`.
- `dg-anvil/tests/loop/fixture-repo-go/sum.go`
  - A single exported function `func Sum(a, b int) int` returning `a + b`. Implemented as the known-good target so Verify passes on the re-run.
- `dg-anvil/tests/loop/fixture-repo-go/app.go`
  - Imports `Sum` from `sum.go` and calls it at a specific line range. Wired-probe entry point.
- `dg-anvil/tests/loop/fixture-repo-go/sum_test.go`
  - Go test file with `TestSumBasic` asserting `Sum(1, 2) == 3` and `TestSumZero` asserting `Sum(0, 0) == 0`.
- `dg-anvil/tests/loop/fixture-repo-go/anvil/contract.yml`
  - Hand-authored contract:
    - `anvil_contract_version: 1`, `goal`, `created`, `source_intent`.
    - One criterion `C1`:
      - `exists`: `file: sum.go`, `symbol: Sum`, `signature: "(a, b int) int"`.
      - `substantive`: `must_implement: ["returns integer sum of a and b"]`, `must_not: ["panics on zero inputs"]`.
      - `wired`: `call_site: {file: app.go, line_range: [1, 30], must_contain_symbol: Sum}`.
      - `functional`: `probe: {runner: "go test", target: ".", must_pass: ["TestSumBasic", "TestSumZero"], exit_code: 0}`.
    - Optional `invariants: {no_new_dependencies: true, coverage: {new_code_minimum: 50}}`.
- `dg-anvil/tests/loop/fixture-repo-go/anvil/plan.yml`
  - `anvil_plan_version: 1`.
  - One task `T0`: `id: T0`, `wave: 0`, `title: "verify sum implementation"`, `criterion_ids: ["C1"]`, `depends_on: []`, `loop_cap: 3`.
- `dg-anvil/tests/loop/seeded-faults/.gitkeep`
  - Zero-byte sentinel. Reserves the seeded-fault corpus directory. The corpus is populated during release preparation and contains real fixture repositories whose runs feed the v1 metrics thresholds.

- `dg-anvil/tests/loop/loop.test.js`
  - Uses `node:test` and `node:assert`.
  - Preflight: checks `command -v git`, `command -v node`, `command -v go`, `command -v python3`, `command -v gh`. On missing host binaries, records a structured skip (the test does not silently pass; the skip is a named `SKIPPED_<reason>` record serialised to stderr).
  - Orchestrates three runs in sequence, one per fixture:
    1. `fixture-repo-node` (Stage 2 reference): `anvil run --task T0 --dispatcher stub`; asserts exit 0 and `state.tasks.T0.status === 'passed'`.
    2. `fixture-repo-python` (Stage 3 reference): the deliberately-underspecified task; first `anvil run` fails Verify; reset produces a non-null lesson; second `anvil run` passes; asserts exit 0 on second run, `state.tasks.T0.loop_count === 1`, and `last_lesson_id` non-null.
    3. `fixture-repo-go` (new): `anvil run --task T0 --dispatcher stub`; asserts exit 0 and `state.tasks.T0.status === 'passed'`.
  - Ship-path assertion: after each of the three runs, invokes `anvil ship` with a stubbed `gh` binary (the test shadows the `PATH` to point to a temp-directory `gh` script that records arguments and exits 0 with a known PR URL). Asserts:
    - Contract replay passes (the clean-worktree verify returns `allGreen: true`).
    - Whole-branch Court is dispatched (the stub dispatcher records the call and returns a merge verdict).
    - The ship approval token is written to `anvil/state.json` `meta.ship_approval_token` before the `gh` invocation and removed afterwards.
    - `gh pr create` is invoked with the expected argument array.
    - The trace file records a `phase: 'ship'`, `outcome: 'pass'` event.
  - The loop test runs all three fixture repos to exit and records metrics from those three runs to `./anvil/trace.jsonl` and `~/.anvil/ledger.jsonl`.
  - For each v1-release metric (lesson hit rate, calibration error, theatre-drift index), the loop test asserts one of two outcomes:
    (a) the metric is computed over a corpus of at least 50 real runs sourced from `tests/loop/seeded-faults/` plus the three fixture repos; the corpus meets the threshold (lesson hit rate above 0.25; calibration error for `judging-opus` inside +/-0.05; theatre-drift index below 5 percent), OR
    (b) the corpus has fewer than 50 runs, in which case the test records `v1_metric_insufficient_data` (a structured deferred-claim record with fields `{metric, runs_available, threshold, deferred_until_release: true}`) for that metric and fails with exit code 2 (distinct from the failure exit code 1). Exit code 2 is interpreted by the release checklist as "v1 release not yet earned; accumulate more runs"; exit code 1 is a structural test failure.
  - The seeded-fault corpus lives at `dg-anvil/tests/loop/seeded-faults/` (reserved in this task with a `.gitkeep`); the corpus is grown during release preparation with real fixture repositories each exercising a distinct failure-taxonomy row.
  - Shape-check assertions that do not depend on corpus size (asserted unconditionally):
    - Zero advisory-only hooks: asserts no hook file contains the literal string `WARNING`, `note:` (outside structured JSON emission), or any advisory phrase; `grep -rE` over `dg-anvil/hooks/*` returns exit 1 on advisory patterns.
    - Zero light-paths: asserts `cli/anvil.js` dispatch table has no `fast`, `quick`, `do`, `skip`, or `override` subcommand.
    - Zero persona definitions: asserts `grep -rE "as a senior engineer|as a security auditor|as a test engineer|you are an expert in"` over every Stage 4 file returns exit 1.
  - Repository-and-language-count assertion: three repositories (node, python, go) covering three languages (JavaScript from `fixture-repo-node`, Python from `fixture-repo-python`, Go from `fixture-repo-go`). The test asserts three distinct repositories and three distinct languages, satisfying both the Stage 4 completion bar and the v1 success-criteria bar per `00_Architecture.md` Section 4 Stage 4 produces row.
  - Taxonomy citation: first line `// loop test for Stage 4; exercises row 14 (Theatre drift), row 17 (Cross-task architectural drift), row 19 (Ghost code), row 22 (Prompt injection), row 23 (Credential leak), row 24 (First-option silent pick), row 25 (Advisory-hook bypass)`.
  - Teardown: removes every temp directory created during the test.
  - CommonJS.

#### Decisions already made

- Stage 4 ships the third loop-test fixture (`fixture-repo-go`); the fixture covers Go. (source: 00_Architecture.md Section 4 Stage 4 produces row; Section 3 "Wired-probe language support")
- `tests/loop/loop.test.js` covers three repositories and three languages (JavaScript from `fixture-repo-node`, Python from `fixture-repo-python`, Go from `fixture-repo-go`), satisfying both the Stage 4 completion bar and the v1 success-criteria bar. (source: 00_Architecture.md Section 4 Stage 4 produces row)
- v1 success criteria: theatre-drift index below 5 percent, lesson hit rate above 0.25 within 50 runs, calibration error for `judging-opus` inside +/-0.05, zero advisory-only hooks, zero light-paths, zero persona definitions. (source: 11_Implementation_Plan.md "Success criteria for v1 release")
- Metric assertions are honest: the loop test measures against a real corpus; if the corpus has fewer than 50 runs the test records a `v1_metric_insufficient_data` deferred-claim record and fails with exit code 2, signalling the release checklist that the v1 release has not yet been earned. Synthesising runs to inflate the corpus count is explicitly rejected; shape checks are shape checks, threshold checks are threshold checks, and the two are not conflated. (source: 11_Implementation_Plan.md "Bottom Line"; 08_Observability_and_Calibration.md calibration section; 10_Anti-Patterns_Defeated.md row 8 Claim-without-evidence)
- The seeded-fault corpus at `tests/loop/seeded-faults/` is grown during release preparation; the corpus directory is reserved with a `.gitkeep` at this task. (source: 11_Implementation_Plan.md "Success criteria for v1 release")
- Zero runtime dependencies in the fixture repo; Go is test-time-only host binary. (source: 00_Architecture.md Section 3 Runtime; Invariant 11)
- The Stage 4 loop test uses the stub dispatcher and the stubbed `gh` binary; the live subagent dispatcher wiring in Stage 4 is also available but the loop-test suite must be hermetic. (source: 00_Architecture.md Section 8 Stage 3 out-of-scope "PR open via gh"; Stage 4 produces row)

#### Tests or fixtures

- `dg-anvil/tests/loop/fixture-repo-go/` contents are the Stage 4 fixture.
- `dg-anvil/tests/loop/loop.test.js` is the orchestrator authored in this task.

#### Verification command

```
test -d dg-anvil/tests/loop/fixture-repo-go && test -f dg-anvil/tests/loop/fixture-repo-go/go.mod && test -f dg-anvil/tests/loop/fixture-repo-go/sum.go && test -f dg-anvil/tests/loop/fixture-repo-go/sum_test.go && test -f dg-anvil/tests/loop/fixture-repo-go/anvil/contract.yml && test -f dg-anvil/tests/loop/fixture-repo-go/anvil/plan.yml && test -f dg-anvil/tests/loop/loop.test.js && test -f dg-anvil/tests/loop/seeded-faults/.gitkeep
node --test dg-anvil/tests/loop/loop.test.js
status=$?
case "$status" in
  0) ;;
  2) printf '{"deferred":"v1_metric_insufficient_data","details":{"reason":"seeded-fault corpus below 50 runs"}}\n' 1>&2 ;;
  *) exit "$status" ;;
esac
```

Expected exit 0 (or exit 2 when the corpus is below 50 runs; exit 2 is a deferred-claim signal, not a test failure; any other non-zero exit is a structural failure).

#### Done when

`tests/loop/fixture-repo-go/` contains a minimal Go repo plus `anvil/contract.yml`, `anvil/plan.yml`; `tests/loop/seeded-faults/.gitkeep` reserves the seeded-fault corpus directory; `tests/loop/loop.test.js` orchestrates all three fixture repos, asserts the three shape-check v1 criteria unconditionally (zero advisory-only hooks, zero light-paths, zero persona definitions), and asserts each threshold metric either meets the threshold on a 50-plus-run corpus or records a `v1_metric_insufficient_data` deferred-claim record and exits with code 2; the node, python, and go runs plus the three ship-path assertions all exit green.

### Task 4.11: Finalize `README.md` and `docs/failure-taxonomy.md`

#### Goal

Finalize the plugin-level `README.md` at maximum 500 lines per documentation policy. Install, one example, pointer to `reports/Anvil-Design/`. Finalize `docs/failure-taxonomy.md` by confirming byte-identical to the Stage 0 copy if no new rows were added during Stages 1-3, or by documenting additions if any.

#### Inputs

- `reports/Anvil-Design/11_Implementation_Plan.md` "Documentation policy" ("README.md - 500 lines. Install, one example, pointer to the report.").
- `reports/Anvil-Design/04_Anatomy.md` (five primitives, seven skills, five hooks, five slash commands, one CLI binary).
- `reports/Anvil-Design/10_Anti-Patterns_Defeated.md` (source for docs/failure-taxonomy.md).
- `reports/DG-Anvil/00_Architecture.md` Section 4 (Stage 4 produces row; README finalization; failure-taxonomy finalization); Section 6 (Invariants 3, 4).
- `dg-anvil/README.md` (Stage 0 placeholder).
- `dg-anvil/docs/failure-taxonomy.md` (Stage 0 copy).

#### Outputs

- `dg-anvil/README.md`
  - Maximum 500 lines (hard cap per documentation policy).
  - Sections:
    - Install: plugin install path, Node 20+ requirement, zero-dependency install, reference to `package.json` `engines` field.
    - One example: a compact walkthrough of `/start <intent>` -> contract confirm -> plan -> execute -> verify -> judge -> pass or reset -> ship. The example uses the `fixture-repo-node` scenario as the reference; readers can run it locally.
    - Pointer to `reports/Anvil-Design/`: naming the twelve-file canonical design report (00_intro through 12_Bottom_Line), the failure taxonomy at `docs/failure-taxonomy.md`, and the workflow diagram at `docs/anvil_workflow.svg`.
  - No extended tutorials; no "getting started" garden-of-forks (per documentation policy).
  - No `TODO`, `FIXME`, `XXX`, `HACK`, `TBD`, `WIP`, `NOTE:` markers.
  - No persona phrasing.
  - UTF-8 without BOM; LF line endings.

- `dg-anvil/docs/failure-taxonomy.md`
  - The Stage 0 copy is reviewed against `reports/Anvil-Design/10_Anti-Patterns_Defeated.md` for any new rows that may have been added during Stages 1-3. Stages 1, 2, 3 did not add rows (the plans do not document any additions to the taxonomy; the Stage 0 copy is authoritative). Task 4.11 confirms this by `diff -q reports/Anvil-Design/10_Anti-Patterns_Defeated.md dg-anvil/docs/failure-taxonomy.md` returning identical files.
  - If the diff is clean, the Stage 4 file is the Stage 0 file unchanged.
  - If the diff reports a difference (indicating an earlier stage added a row without updating the Stage 0 copy), Task 4.11 appends the new row(s) to the Stage 4 file and documents the addition in the Stage 4 commit message; the stage plan does not narrate the addition in file contents (Never Do rule).
  - No `TODO`, `FIXME`, `XXX`, `HACK`, `TBD`, `WIP`, `NOTE:` markers outside the copied taxonomy text (the taxonomy itself names these markers as rejection triggers; the Stage 0/4 copy inherits those string mentions and they are exempt per prior stages' markers-exemption rule for `docs/failure-taxonomy.md`).

#### Decisions already made

- Documentation policy: `README.md` - 500 lines. Install, one example, pointer to the report. No extended tutorials. (source: 11_Implementation_Plan.md "Documentation policy")
- `docs/failure-taxonomy.md` is the table from `10_Anti-Patterns_Defeated.md`, cross-referenced with stable ids. (source: 11_Implementation_Plan.md "Documentation policy")
- `docs/anvil_workflow.svg` is the diagram from `03_The_Core_Loop.md` via `reports/Anvil-Design/anvil_workflow.svg`. (source: 11_Implementation_Plan.md "Documentation policy")
- Stage 0 shipped `docs/failure-taxonomy.md` as a copy of `reports/Anvil-Design/10_Anti-Patterns_Defeated.md`; Stage 4 finalizes. (source: 00_Architecture.md Section 4 Stage 0 and Stage 4 produces rows)
- No narrative justification in file contents (Never Do rule). Rationale lives in `00_Architecture.md` and `reports/Anvil-Design/`.
- No persona phrasing in README text. (source: 00_Architecture.md Section 6 Invariant 4)
- UTF-8 without BOM; LF line endings. (source: 00_Architecture.md Section 3 File encoding)

#### Tests or fixtures

- None. The README and taxonomy are documentation artefacts; the correctness check is the 500-line cap and the exact-copy assertion for the taxonomy.

#### Verification command

```
test -f dg-anvil/README.md && test $(wc -l < dg-anvil/README.md) -le 500 && ! grep -qE '(TODO|FIXME|XXX|HACK|TBD|WIP|NOTE:)' dg-anvil/README.md && ! grep -qE 'as a senior engineer|as a security auditor|as a test engineer|you are an expert in' dg-anvil/README.md && diff -q reports/Anvil-Design/10_Anti-Patterns_Defeated.md dg-anvil/docs/failure-taxonomy.md
```

Expected exit 0 (README under 500 lines, no forbidden markers, no persona phrasing; taxonomy byte-identical to the Anvil-Design source).

#### Done when

`README.md` is finalized at maximum 500 lines with Install, One example, and Pointer sections; `docs/failure-taxonomy.md` is either byte-identical to `reports/Anvil-Design/10_Anti-Patterns_Defeated.md` or carries documented additions; both files have no forbidden markers and no persona phrasing.

### Task 4.12: Wire the live `anvil_subagent` dispatcher for executor, Court, and pressure harness

#### Goal

Replace the Stage 2 / Stage 3 stub-only `anvil_subagent` dispatcher with a live implementation that dispatches to the Anthropic API via an HTTPS bridge and rewire `tests/pressure/harness.js` to use the live dispatcher when `ANVIL_LIVE_DISPATCHER=1` is set.

#### Inputs

- `reports/DG-Anvil/00_Architecture.md` Section 3 Dispatcher identifiers.
- `reports/DG-Anvil/plans/stage_2_execute_and_verify.md` Task 2.12 (stub dispatcher).
- `reports/DG-Anvil/plans/stage_3_court_and_ledger.md` Task 3.5 (Court dispatcher).
- `reports/DG-Anvil/plans/stage_0_bootstrap.md` Task 0.16 (harness stub).

#### Outputs

- `dg-anvil/cli/lib/executor.js` extended: the `anvil_subagent` dispatcher now routes to a host-bridge defined in `cli/lib/subagent-bridge.js` (new file). The bridge invokes the Anthropic API directly via an HTTPS request to the configured endpoint using `https` from Node builtins; it sends the subagent system prompt, user briefing, and a tool-allowance array. Authentication via `ANTHROPIC_API_KEY` from the environment. Model selected from `~/.anvil/config.json` (default: `claude-opus-4-6`). Rejects unknown dispatcher invocations with `E_UNKNOWN_DISPATCHER`.
- `dg-anvil/cli/lib/subagent-bridge.js` (new file) with exports `dispatch({briefing, tools, model})` and `streamResponse(response)`. CommonJS. Zero npm dependencies. Uses `https.request` with a POST to `https://api.anthropic.com/v1/messages`. Reads `ANTHROPIC_API_KEY` from environment; never stores credentials in source or on disk. On network failure, returns a structured error with `code: 'E_IO'` and `details.reason: 'subagent_bridge_network'`. Respects the existing Court input-isolation structural guards: the briefing passed to the bridge carries only the four allowed keys defined in `cli/lib/court.js` `ALLOWED_COURT_BRIEFING_KEYS` when invoked by the Court; for executor dispatch, the briefing shape is the executor's frozen briefing object from Stage 2 Task 2.4.
  - `max_tokens` parameter: `dispatch` accepts a `max_tokens` argument (number). Default: 4096. Per-role override via `~/.anvil/config.json` keys: `max_tokens.executor`, `max_tokens.court`, `max_tokens.pressure`. The role is passed from the caller; `dispatch` reads the config file once per process, caches the result, and uses the per-role value when set.
  - `tools` array shape: the `tools` parameter is an array matching Anthropic's tool-use specification: `[{name: string, description: string, input_schema: object}, ...]`. For Stage 4, two frozen constants are exported: `EXECUTOR_TOOLS` (array of the tools an executor subagent may use - Read, Write, Edit, Bash, Grep, Glob, and their schemas) and `COURT_TOOLS = Object.freeze([])` (the Court has NO tool access; it reads its three briefing inputs and emits a YAML verdict). The caller passes one of these; `dispatch` rejects any `tools` value not deep-equal to one of the exported frozen constants via `E_UNAUTHORIZED_TOOLS`.
  - HTTP timeout: `https.request` is invoked with a 60000 ms default timeout. Timeout fires `E_DISPATCHER_TIMEOUT` after the request is aborted. Per-dispatch override via a `timeout_ms` argument (bounded 5000 to 300000).
  - HTTP retry policy: on HTTP 429 response, retry up to 3 times with exponential backoff: 1000 ms, 2000 ms, 4000 ms, each with up to 500 ms of uniform jitter. On HTTP 502/503/504, same retry policy. On HTTP 400/401/403 (client error), fail immediately without retry with a structured error containing the response body. `Retry-After` header, when present on 429, overrides the backoff calculation for that attempt.
  - `stop_reason` handling: after the response is parsed, inspect `response.stop_reason`. If `stop_reason === 'max_tokens'`, `dispatch` throws `E_MAX_TOKENS_EXHAUSTED` with `details = {tokens_requested: max_tokens, tokens_produced: response.usage.output_tokens, suggested_retry_with: max_tokens * 2}`. If `stop_reason === 'end_turn'` or `'tool_use'`, dispatch returns normally. If `stop_reason === 'stop_sequence'`, dispatch returns normally with the stop sequence in meta.
  - Error codes added: `E_UNAUTHORIZED_TOOLS`, `E_DISPATCHER_TIMEOUT`, `E_DISPATCHER_HTTP_CLIENT_ERROR`, `E_DISPATCHER_HTTP_SERVER_ERROR` (after retry exhaustion), `E_MAX_TOKENS_EXHAUSTED`. All registered in `cli/lib/errors.js` per Invariant 5.
- `dg-anvil/cli/lib/subagent-bridge.js` additional exports:
  - `recordCassette({scenario, request, response})` writes `tests/cassettes/pressure/<scenario>-<hash8>.json` containing `{request, response, recordedAt}`. Hash is sha256 of the request body, first 8 hex chars. Before writing the cassette, the function scrubs sensitive values from `request.headers` and the serialized request body. Specifically: (a) replace the value of any header whose name is `x-api-key` (case-insensitive) with `[REDACTED]`; (b) replace the value of any header whose name is `authorization` (case-insensitive) with `[REDACTED]`; (c) scan the entire serialized request body for any substring matching `/sk-ant-[a-zA-Z0-9_-]{20,}/` and replace each match with `[REDACTED]`; (d) scan the serialized request body for any substring that exactly matches the current `process.env.ANTHROPIC_API_KEY` value and replace each match with `[REDACTED]`. The `response` object is written without scrubbing (Anthropic API responses do not contain the key). The `recordedAt` timestamp is added by `recordCassette`, not by the caller.
  - `replayCassette({scenario, request})` reads the matching cassette file; returns the stored response. Throws `E_CASSETTE_NOT_FOUND` if missing.
- `dg-anvil/cli/anvil.js` dispatch table entry: `anvil cassette record --scenario <name>` orchestrates a single pressure-test run with `ANVIL_RECORD_CASSETTE=1` in the environment.
- `dg-anvil/cli/lib/court.js` extended: the Court dispatcher also routes through `cli/lib/subagent-bridge.js`; input-isolation is still structurally enforced by `composeBriefing`, `ALLOWED_COURT_BRIEFING_KEYS`, and `FORBIDDEN_COURT_INPUT_KEYS` from Stage 3 Task 3.5.
- `dg-anvil/tests/pressure/harness.js` finalized: `runPressure` now dispatches through `cli/lib/subagent-bridge.js` when the environment variable `ANVIL_LIVE_DISPATCHER=1` is set, and through the stub dispatcher otherwise. The stub path is preserved for deterministic CI runs; the live path is used for integration runs. When `ANVIL_LIVE_DISPATCHER=1` is set and `ANVIL_RECORD_CASSETTE` is unset, the harness calls `replayCassette` and falls back to `E_CASSETTE_NOT_FOUND` if missing; when `ANVIL_RECORD_CASSETTE=1` is set, the harness calls the live dispatcher and records via `recordCassette` with the pressure-test scenario name.
- `dg-anvil/tests/unit/subagent-bridge.test.js` covering: request shape (method POST, path `/v1/messages`, headers include `x-api-key`, body JSON parses with `model`, `messages`, `system`); response parsing (streamed SSE assembly into a final message object); error handling on network failure (structured `E_IO` with `details.reason: 'subagent_bridge_network'`); model override via `~/.anvil/config.json`. Additionally covers EACH of the following:
  - Test `max_tokens` default and per-role override.
  - Test `tools` rejection of arrays not deep-equal to `EXECUTOR_TOOLS` or `COURT_TOOLS`.
  - Test timeout behaviour with a stub server that never responds.
  - Test retry-on-429 (stub returns 429 twice then 200).
  - Test retry-on-5xx (stub returns 503 twice then 200).
  - Test `Retry-After` override.
  - Test `stop_reason === 'max_tokens'` throws `E_MAX_TOKENS_EXHAUSTED` with the right `details`.
  - Test immediate fail on 400.
- `tests/unit/subagent-bridge.test.js` extends coverage: a test dispatches through `recordCassette` with `ANTHROPIC_API_KEY=sk-ant-testkey-abcdef123456789` set in the environment; reads the written cassette file; asserts the file contains the substring `[REDACTED]` at least three times; asserts the file contains none of the substrings `sk-ant-testkey`, `x-api-key:` (followed by a non-redacted value), `authorization:` (followed by a non-redacted value).
- `dg-anvil/tests/cassettes/pressure/.gitkeep` zero-byte sentinel reserving the cassette directory for release preparation.
- `dg-anvil/cli/lib/errors.js` extended with `E_CASSETTE_NOT_FOUND`.

#### Decisions already made

- The host-bridge mechanism is direct Anthropic API invocation via `https` builtin, not an in-process Claude Code Agent tool call. This is the only path compatible with the zero-runtime-dependency constraint and with the Stage 2 / Stage 3 executor and Court dispatch signatures. (source: 00_Architecture.md Section 3 Runtime, Dispatcher identifiers; 11_Implementation_Plan.md platform coverage)
- Authentication via `ANTHROPIC_API_KEY` environment variable; the plugin does not store credentials on disk or in source. (source: 00_Architecture.md Section 6 Invariant 11, implied by zero-runtime-dep constraint)
- The bridge respects existing input-isolation structural guards for the Court (the briefing passed to the bridge contains only the keys named in `ALLOWED_COURT_BRIEFING_KEYS`). (source: 00_Architecture.md Section 6 Invariant 14)
- The harness stub path is preserved as the default for deterministic unit tests; `ANVIL_LIVE_DISPATCHER=1` selects the live path. (source: Stage 0 Task 0.16)
- Cassette file name format is `<scenario>-<hash8>.json` in `tests/cassettes/pressure/`. Hash is sha256 of the request body, first 8 hex chars. (source: 00_Architecture.md Section 3 zero-dep runtime; `crypto` is an allowed builtin)
- Cassette recording redacts `x-api-key`, `authorization`, and API-key-value substrings before writing. Unredacted cassettes are a security-invariant violation. (source: 00_Architecture.md Section 6 Invariant 11 zero-dep; 04_Anatomy.md 'What is deliberately absent' implicitly; Pass 3 critical issue 1)
- `dispatch` accepts `max_tokens` with default 4096 and per-role override via `~/.anvil/config.json` keys `max_tokens.executor`, `max_tokens.court`, `max_tokens.pressure`; config is read once per process and cached. (source: Anthropic Messages API specification; 00_Architecture.md Section 3 Dispatcher identifiers; Pass 3 critical issue 2)
- `tools` parameter is an array matching Anthropic's tool-use specification; two frozen constants are exported (`EXECUTOR_TOOLS` and `COURT_TOOLS = Object.freeze([])`); the caller passes one of these and `dispatch` rejects any other value via `E_UNAUTHORIZED_TOOLS`. (source: Anthropic Messages API specification; 00_Architecture.md Section 3 Dispatcher identifiers; Pass 3 critical issue 2)
- `https.request` uses a 60000 ms default timeout; timeout fires `E_DISPATCHER_TIMEOUT`; per-dispatch override via `timeout_ms` bounded 5000 to 300000. (source: Anthropic Messages API specification; 00_Architecture.md Section 3 Dispatcher identifiers; Pass 3 critical issue 2)
- HTTP retry policy: 429 and 502/503/504 retry up to 3 times with exponential backoff (1000/2000/4000 ms plus up to 500 ms uniform jitter); 400/401/403 fail immediately without retry; `Retry-After` header overrides backoff on 429. (source: Anthropic Messages API specification; 00_Architecture.md Section 3 Dispatcher identifiers; Pass 3 critical issue 2)
- `stop_reason` handling: `max_tokens` throws `E_MAX_TOKENS_EXHAUSTED` with `details = {tokens_requested, tokens_produced, suggested_retry_with: max_tokens * 2}`; `end_turn` and `tool_use` return normally; `stop_sequence` returns normally with the stop sequence in meta. (source: Anthropic Messages API specification; 00_Architecture.md Section 3 Dispatcher identifiers; Pass 3 critical issue 2)
- Error codes added in this task: `E_UNAUTHORIZED_TOOLS`, `E_DISPATCHER_TIMEOUT`, `E_DISPATCHER_HTTP_CLIENT_ERROR`, `E_DISPATCHER_HTTP_SERVER_ERROR`, `E_MAX_TOKENS_EXHAUSTED`; all registered in `cli/lib/errors.js` per Invariant 5. (source: Anthropic Messages API specification; 00_Architecture.md Section 3 Dispatcher identifiers; Pass 3 critical issue 2)

#### Tests or fixtures

- `dg-anvil/tests/unit/subagent-bridge.test.js` (new, authored in this task).
- Every existing pressure test runs under `ANVIL_LIVE_DISPATCHER=1` in a separate test group (tagged `integration`); the integration group is optional in CI but required for release.

#### Verification command

```
node --test dg-anvil/tests/unit/subagent-bridge.test.js
if [ -d dg-anvil/tests/cassettes/pressure ] && [ "$(ls -1 dg-anvil/tests/cassettes/pressure 2>/dev/null | grep -v '^\.gitkeep$' | wc -l)" -gt 0 ]; then
  ANVIL_LIVE_DISPATCHER=1 node --test dg-anvil/tests/pressure/authoring-skills.pressure.js dg-anvil/tests/pressure/contracting.pressure.js dg-anvil/tests/pressure/planning.pressure.js dg-anvil/tests/pressure/executing.pressure.js dg-anvil/tests/pressure/verifying.pressure.js dg-anvil/tests/pressure/judging.pressure.js dg-anvil/tests/pressure/resetting.pressure.js
else
  printf '{"warning":"ANVIL_LIVE_DISPATCHER_CASSETTES_MISSING","details":{"path":"dg-anvil/tests/cassettes/pressure"}}\n' 1>&2
fi
grep -R "runPressure" dg-anvil/tests/pressure/
```

Expected exit 0. If cassettes are absent, the integration block is skipped with an `ANVIL_LIVE_DISPATCHER_CASSETTES_MISSING` structured warning; this is a deliberate deferral and the release checklist requires cassettes recorded against a real endpoint before v1 tag. The harness does not unconditionally select the stub dispatcher: the `grep` confirms every pressure test flows through `runPressure` and none bypass it.

#### Done when

`cli/lib/subagent-bridge.js` exists and exports `dispatch` and `streamResponse`; `tests/unit/subagent-bridge.test.js` passes; every pressure test also passes under the live dispatcher with cassettes (or records a structured `ANVIL_LIVE_DISPATCHER_CASSETTES_MISSING` warning when cassettes are absent); `grep -R "runPressure" tests/pressure/` confirms no pressure test bypasses the harness; the harness does not unconditionally select the stub dispatcher.

### Task 4.12a: Wire parallel within-wave task dispatch in the executor

#### Goal

Replace the Stage 2 sequential wave loop with a `Promise.allSettled` over wave members, each dispatching to a fresh subagent in its own worktree. Wave results aggregate only after all promises settle.

#### Inputs

- `reports/DG-Anvil/00_Architecture.md` Section 3 Parallel wave dispatch.
- `reports/DG-Anvil/plans/stage_2_execute_and_verify.md` Task 2.4 (executor authoring).
- `dg-anvil/cli/lib/executor.js` (from Stage 2).
- `dg-anvil/cli/lib/worktree.js` (from Stage 2).

#### Outputs

- `dg-anvil/cli/lib/executor.js` extended: `runWave(contract, plan, waveId, state)` iterates all tasks in the wave, kicks off `dispatchTask(task, worktree)` for each, uses `Promise.allSettled` on the array; after all promises settle, iterate the outcome array; for each `{status: 'fulfilled', value}` record the task result; for each `{status: 'rejected', reason}` record the task failure; fail the wave if ANY outcome is rejected, but aggregate all fulfilled results in task-id order regardless.
- `dg-anvil/tests/unit/executor.test.js` extended: add parallel-wave test using a stub dispatcher that simulates delay per task; asserts all-in-flight (all dispatchers receive their start signal before any returns), asserts result ordering by task-id on aggregation, asserts wave failure on one task failure while peers complete. Test case with three tasks where the second rejects and first/third fulfill; asserts all three outcomes are present in the aggregated result; asserts the wave failed.

#### Decisions already made

- Parallelism is `Promise.allSettled`, not `child_process.fork` or a worker pool. (source: 00_Architecture.md Section 3 Parallel wave dispatch)
- Concurrency bound is the number of wave members; no explicit upper limit in v1. (source: 00_Architecture.md Section 3 Parallel wave dispatch)
- In-flight tasks are not cancelled on peer failure; they run to completion and their results are aggregated. (source: 00_Architecture.md Section 3 Parallel wave dispatch)
- Parallel dispatch uses Promise.allSettled, not Promise.all, to preserve peer results on any one task's failure. (source: 00_Architecture.md Section 3 Parallel wave dispatch; Pass 3 spec drift)

#### Tests or fixtures

- Unit test case with three tasks whose stub dispatchers use different delay values to prove parallelism (the slowest task's start timestamp is earlier than the fastest task's end timestamp); another case where one task fails and peers complete with their results included in the aggregated wave output.

#### Verification command

```
node --test dg-anvil/tests/unit/executor.test.js
```

Expected exit 0.

#### Done when

`runWave` dispatches all members concurrently; `Promise.allSettled` aggregation matches task-id order on success; single-failure fails the wave without cancelling peers; the parallel-wave unit test cases pass.

## Invariants Check

- Invariant 1 (No advisory hooks): Every Stage 4 hook (`pre-tool-use`, `post-tool-use`, `user-prompt-submit`, `stop`) either blocks (exit 2 with structured stderr) or emits a structured trace event via `cli/lib/trace.js`. No hook prints a warning and returns 0 as a silent pass. `post-tool-use` is classified as an event emitter per the architecture; its unconditional structured append is the structured action. Verified by `grep -iE "WARNING|note:" dg-anvil/hooks/* dg-anvil/cli/lib/hooks.js` returning exit 1 outside structured JSON emission strings. Load-bearing at Stage 4.
- Invariant 2 (No fallback light-paths): `cli/anvil.js` additions (`metrics`, `audit`, `ship`, `hook`) introduce no `fast`, `quick`, `do`, `skip`, or `override` subcommand. `commands/ship.md` does not carry any light-path flag. The ship approval token is a binary gate (valid or not); it is not a downgrade mechanism for any verification level. Verified by `grep -iE "(--fast|--quick|--skip|--override|/fast|/quick|/do|/skip|/override)" dg-anvil/cli dg-anvil/commands dg-anvil/skills dg-anvil/hooks` returning exit 1. Load-bearing at Stage 4.
- Invariant 3 (No unshipped markers): `grep -rE "(TODO|FIXME|XXX|HACK|TBD|WIP|NOTE:)" dg-anvil/hooks dg-anvil/cli/lib/metrics.js dg-anvil/cli/lib/trace.js dg-anvil/cli/lib/hooks.js dg-anvil/commands/ship.md dg-anvil/README.md dg-anvil/tests/loop/fixture-repo-go dg-anvil/tests/loop/loop.test.js dg-anvil/tests/unit/metrics.test.js dg-anvil/tests/unit/trace.test.js dg-anvil/tests/unit/hooks.test.js` returns exit 1. `docs/failure-taxonomy.md` is exempt as in prior stages (it inherits the copied source text naming the markers as rejection triggers).
- Invariant 4 (No persona definitions): `grep -rE "as a senior engineer|as a security auditor|as a test engineer|you are an expert in" dg-anvil/hooks dg-anvil/cli/lib/metrics.js dg-anvil/cli/lib/trace.js dg-anvil/cli/lib/hooks.js dg-anvil/commands/ship.md dg-anvil/README.md dg-anvil/tests/loop/fixture-repo-go dg-anvil/tests/loop/loop.test.js dg-anvil/tests/unit/hooks.test.js` returns exit 1. The whole-branch Court instruction constant `COURT_WHOLE_BRANCH_INSTRUCTION` is persona-free.
- Invariant 5 (Structured errors on every exit): every Stage 4 CLI path (`anvil metrics`, `anvil audit`, `anvil ship`, `anvil hook pre-tool-use`, `anvil hook post-tool-use`, `anvil hook user-prompt-submit`, `anvil hook stop`) either returns structured success or writes `{error, code, details}` JSON on stderr with a non-zero exit. The seven new Stage 4 error codes (`E_INVALID_TRACE_EVENT`, `E_HOOK_BLOCKED`, `E_THEATRE_DRIFT_EXCEEDED`, `E_SHIP_PR_FAILED`, `E_SHIP_APPROVAL_TOKEN_INVALID`, `E_SHIP_REPLAY_FAILED`, `E_WHOLE_BRANCH_COURT_FAILED`) are registered in `cli/lib/errors.js`.
- Invariant 6 (Six canonical skill sections): Stage 4 does not modify any SKILL.md. `skills/using-anvil`, `skills/authoring-skills`, `skills/contracting`, `skills/planning`, `skills/executing`, `skills/verifying`, `skills/judging`, `skills/resetting` remain as prior stages finalized them. Verified by the awk header-extraction command across all eight files.
- Invariant 7 (Schema changes require a migration): Stage 4 does not change any of the three first-class schemas. `cli/contract-schema.json`, `cli/plan-schema.json`, `cli/ledger-schema.json` remain unchanged from Stages 1 and 3. The trace event shape is defined in `00_Architecture.md` Section 3 but is not a first-class JSON Schema file; trace additions require an architecture update, not a schema migration. No migration subcommand change.
- Invariant 8 (Skill changes require RED-then-GREEN pressure transcript): Stage 4 does not modify any SKILL.md. No new pressure tests are authored; the seven pressure tests from Stages 0, 1, 2, 3 still pass (prerequisite check 40).
- Invariant 9 (Polyglot hooks with graceful degradation): every Stage 4 hook script starts with the bash-availability guard `if ! command -v bash >/dev/null 2>&1; then exit 0; fi`. The Windows launcher `hooks/run-hook.cmd` (from Stage 0) dispatches; on a platform without bash, each hook exits 0. On a platform without Node, the hook exits 0 because the internal delegation `node dg-anvil/cli/anvil.js hook <name>` cannot run. Verified by head-inspection of each hook script.
- Invariant 10 (UTF-8 LF encoding): every file authored in Stage 4 is UTF-8 without BOM with LF line endings. Verified by `file` inspection of a sample.
- Invariant 11 (Zero runtime dependencies): `package.json` `dependencies` and `devDependencies` remain empty. Every Stage 4 module imports only Node builtins and `cli/lib/*.js`. The Go fixture's `go.mod` declares no runtime dependencies. Verified by the `package.json` check.
- Invariant 12 (Failure-taxonomy row citation): `tests/loop/loop.test.js` cites rows 14, 17, 19, 22, 23, 24, 25 as the Stage 4 taxonomy anchors. No new pressure tests are authored in Stage 4 (no new skills); existing pressure tests retain their Stage 0-3 citations.
- Invariant 13 (Fresh-subagent discipline): `cli/lib/court.js` `judgeBranch` inherits the Stage 3 discipline: no module-level mutable state, briefing frozen before dispatch. `cli/lib/hooks.js` is stateless; every hook invocation freshly reads state and contract. Verified by the Stage 4 additions to `tests/unit/court.test.js` asserting `Object.keys(MUTABLE_STATE).length === 0` after `judgeBranch` calls.
- Invariant 14 (Evidence-only Court inputs): `cli/lib/court.js` `judgeBranch` uses the same `composeBriefing` helper and the same `ALLOWED_COURT_BRIEFING_KEYS` and `FORBIDDEN_COURT_INPUT_KEYS` guards. The whole-branch Court briefing contains exactly four keys: `task_id` (literal `'branch'`), `contract`, `diff` (the branch diff), `verify_output` (aggregated across tasks). Plan, commit messages, Ledger, and prior verdicts cannot enter the briefing. Verified by the extended Task 3.6 unit test covering `judgeBranch`.
- Invariant 15 (Null-lesson prohibition): the Stage 4 `stop` hook's lesson path routes through `cli/lib/ledger-write.js` `append`; null-lesson rejection still applies. A failing contract at session end whose captured evidence does not support a non-null lesson blocks the stop with an escalation signal (Task 4.6).
- Invariant 16 (No auto-pick gates): every Stage 4 gate is binary. The ship approval token is valid or not; no list-of-N. `/ship` requires every task `status === 'passed'`; no "first option silently selected" path. `anvil metrics` returns binary pass/fail based on theatre-drift threshold; no silent option choice. Verified by the absence of any list-of-N construct in `commands/ship.md`, `cli/anvil.js` Stage 4 additions, and `cli/lib/hooks.js`. Load-bearing at Stage 4.
- Invariant 17 (Single-writer discipline for the ledger): the literal path `~/.anvil/ledger.jsonl` appears in exactly one source file: `cli/lib/ledger-write.js`. Stage 4 `cli/lib/trace.js`, `cli/lib/metrics.js`, `cli/lib/hooks.js`, and `cli/anvil.js` additions do not encode the ledger path literal. Verified by `grep -lnE '~/\\.anvil/ledger\\.jsonl' dg-anvil/cli/lib/*.js | wc -l` returning exactly 1.
- Invariant 18 (Trace fields are closed): `cli/lib/trace.js` enforces the closed field set from Section 3 "Trace event format". Any attempt to write a non-schema field throws `E_INVALID_TRACE_EVENT`. `TRACE_EVENT_KEYS` is frozen at the seventeen canonical names in Section 3 order. `TRACE_PHASES`, `TRACE_LEVELS`, `TRACE_OUTCOMES` are frozen enumerations matching Section 3. Verified by `tests/unit/trace.test.js` (Task 4.2) and by the closed-field-set assertion in the unit test. Load-bearing at Stage 4.

## Exit Criteria

```
set -e
# 1. Every Stage 4 produced file exists.
for f in \
  dg-anvil/hooks/session-start \
  dg-anvil/hooks/pre-tool-use \
  dg-anvil/hooks/post-tool-use \
  dg-anvil/hooks/user-prompt-submit \
  dg-anvil/hooks/stop \
  dg-anvil/cli/lib/metrics.js \
  dg-anvil/cli/lib/trace.js \
  dg-anvil/cli/lib/hooks.js \
  dg-anvil/cli/lib/subagent-bridge.js \
  dg-anvil/commands/ship.md \
  dg-anvil/README.md \
  dg-anvil/docs/failure-taxonomy.md \
  dg-anvil/tests/loop/fixture-repo-go/README.md \
  dg-anvil/tests/loop/fixture-repo-go/go.mod \
  dg-anvil/tests/loop/fixture-repo-go/.gitattributes \
  dg-anvil/tests/loop/fixture-repo-go/sum.go \
  dg-anvil/tests/loop/fixture-repo-go/app.go \
  dg-anvil/tests/loop/fixture-repo-go/sum_test.go \
  dg-anvil/tests/loop/fixture-repo-go/anvil/contract.yml \
  dg-anvil/tests/loop/fixture-repo-go/anvil/plan.yml \
  dg-anvil/tests/loop/loop.test.js \
  dg-anvil/tests/loop/seeded-faults/.gitkeep \
  dg-anvil/tests/cassettes/pressure/.gitkeep \
  dg-anvil/tests/unit/metrics.test.js \
  dg-anvil/tests/unit/trace.test.js \
  dg-anvil/tests/unit/subagent-bridge.test.js \
  dg-anvil/tests/unit/hooks.test.js; do test -f "$f"; done
# 2. Stage 4 error codes registered in cli/lib/errors.js.
node -e "const e=require('./dg-anvil/cli/lib/errors.js'); for(const k of ['E_INVALID_TRACE_EVENT','E_HOOK_BLOCKED','E_THEATRE_DRIFT_EXCEEDED','E_SHIP_PR_FAILED','E_SHIP_APPROVAL_TOKEN_INVALID','E_SHIP_REPLAY_FAILED','E_WHOLE_BRANCH_COURT_FAILED']){if(e.CODES[k]!==k){process.exit(1)}}"
# 3. Trace module closed-field-set and constants.
node -e "const t=require('./dg-anvil/cli/lib/trace.js'); if(t.TRACE_EVENT_KEYS.length!==17||!Object.isFrozen(t.TRACE_EVENT_KEYS)){process.exit(1)}; if(!Object.isFrozen(t.TRACE_PHASES)||!Object.isFrozen(t.TRACE_LEVELS)||!Object.isFrozen(t.TRACE_OUTCOMES)){process.exit(1)}"
# 4. Metrics module constants.
node -e "const m=require('./dg-anvil/cli/lib/metrics.js'); if(m.THEATRE_DRIFT_THRESHOLD!==0.15||m.THEATRE_DRIFT_HEALTHY_CEILING!==0.05){process.exit(1)}; if(m.METRIC_NAMES.length!==10||!Object.isFrozen(m.METRIC_NAMES)){process.exit(1)}"
# 5. Court module whole-branch extension.
node -e "const c=require('./dg-anvil/cli/lib/court.js'); if(typeof c.judgeBranch!=='function'){process.exit(1)}; if(typeof c.COURT_WHOLE_BRANCH_INSTRUCTION!=='string'){process.exit(1)}"
# 6. Verifier module Go language support.
node -e "const v=require('./dg-anvil/cli/lib/verifier.js'); if(v.SUPPORTED_LANGUAGES.length!==3||!v.SUPPORTED_LANGUAGES.includes('go')){process.exit(1)}; if(!Object.isFrozen(v.SUPPORTED_LANGUAGES)){process.exit(1)}"
# 7. Stage 4 unit tests pass.
node --test dg-anvil/tests/unit/metrics.test.js
node --test dg-anvil/tests/unit/trace.test.js
node --test dg-anvil/tests/unit/hooks.test.js
# 8. Stage 3 regression: unit, pressure tests still pass.
node --test dg-anvil/tests/unit/court.test.js dg-anvil/tests/unit/ledger.test.js
node --test dg-anvil/tests/pressure/judging.pressure.js dg-anvil/tests/pressure/resetting.pressure.js
# 9. Stage 2 regression: unit, pressure, and loop tests still pass.
node --test dg-anvil/tests/unit/executor.test.js dg-anvil/tests/unit/verifier.test.js dg-anvil/tests/unit/worktree.test.js
node --test dg-anvil/tests/pressure/executing.pressure.js dg-anvil/tests/pressure/verifying.pressure.js
node --test dg-anvil/tests/loop/fixture-repo-node/loop.test.js
# 10. Stage 1 regression: unit tests still pass.
node --test dg-anvil/tests/unit/contract.test.js dg-anvil/tests/unit/plan.test.js dg-anvil/tests/unit/yaml.test.js
# 11. Stage 0 and Stage 1 pressure tests still pass.
node --test dg-anvil/tests/pressure/authoring-skills.pressure.js dg-anvil/tests/pressure/contracting.pressure.js dg-anvil/tests/pressure/planning.pressure.js
# 12. Stage 3 loop test still passes or records a structured skip.
node --test dg-anvil/tests/loop/fixture-repo-python/loop.test.js
# 13. Wired CLI subcommands behave (regression + new).
node dg-anvil/cli/anvil.js --help 2>&1 | grep -qE 'metrics|audit|ship'
node dg-anvil/cli/anvil.js contract --validate dg-anvil/docs/contract-examples/good/rate-limit-001.yml
node dg-anvil/cli/anvil.js plan --validate dg-anvil/docs/plan-examples/good/rate-limit-001.yml --contract dg-anvil/docs/contract-examples/good/rate-limit-001.yml
node dg-anvil/cli/anvil.js ledger query rate-limit
node dg-anvil/cli/anvil.js ledger audit >/dev/null
# 14. THE STAGE 4 EXIT-CRITERIA ARTEFACT: the full loop test orchestrates three fixture repos covering three repositories and three languages (JavaScript from fixture-repo-node, Python from fixture-repo-python, Go from fixture-repo-go), satisfying both the Stage 4 completion bar.
set +e
node --test dg-anvil/tests/loop/loop.test.js
loop_status=$?
set -e
case "$loop_status" in
  0) ;;
  2) printf '{"deferred":"v1_metric_insufficient_data","details":{"reason":"seeded-fault corpus below 50 runs; release checklist will block v1 tag until the corpus has accumulated 50+ real runs"}}\n' 1>&2 ;;
  *) exit "$loop_status" ;;
esac
# 15. v1 release success criteria asserted by the loop test runner:
#     The three shape-check assertions (zero advisory-only hooks, zero light-paths, zero persona definitions) must pass unconditionally; the three threshold metrics (theatre-drift, lesson hit rate, calibration error) either pass on a 50-plus-run corpus or record a v1_metric_insufficient_data deferred-claim record and exit code 2 from the loop test.
node --test dg-anvil/tests/loop/loop.test.js 2>&1 | grep -qE 'v1_zero_advisory_hooks.*pass'
node --test dg-anvil/tests/loop/loop.test.js 2>&1 | grep -qE 'v1_zero_light_paths.*pass'
node --test dg-anvil/tests/loop/loop.test.js 2>&1 | grep -qE 'v1_zero_persona_definitions.*pass'
node --test dg-anvil/tests/loop/loop.test.js 2>&1 | grep -qE 'v1_theatre_drift_index.*(pass|v1_metric_insufficient_data)'
node --test dg-anvil/tests/loop/loop.test.js 2>&1 | grep -qE 'v1_lesson_hit_rate.*(pass|v1_metric_insufficient_data)'
node --test dg-anvil/tests/loop/loop.test.js 2>&1 | grep -qE 'v1_calibration_error.*(pass|v1_metric_insufficient_data)'
# 16. No unshipped markers in Stage 4 files outside the copied failure taxonomy.
! grep -rE "(TODO|FIXME|XXX|HACK|TBD|WIP|NOTE:)" dg-anvil/hooks dg-anvil/cli/lib/metrics.js dg-anvil/cli/lib/trace.js dg-anvil/cli/lib/hooks.js dg-anvil/commands/ship.md dg-anvil/README.md dg-anvil/tests/loop/fixture-repo-go dg-anvil/tests/loop/loop.test.js dg-anvil/tests/unit/metrics.test.js dg-anvil/tests/unit/trace.test.js dg-anvil/tests/unit/hooks.test.js
# 17. No persona phrasing in Stage 4 files.
! grep -rE "as a senior engineer|as a security auditor|as a test engineer|you are an expert in" dg-anvil/hooks dg-anvil/cli/lib/metrics.js dg-anvil/cli/lib/trace.js dg-anvil/cli/lib/hooks.js dg-anvil/commands/ship.md dg-anvil/README.md dg-anvil/tests/loop/fixture-repo-go dg-anvil/tests/loop/loop.test.js dg-anvil/tests/unit/hooks.test.js
# 18. README under 500 lines.
test $(wc -l < dg-anvil/README.md) -le 500
# 19. Failure taxonomy byte-identical to Anvil-Design source.
diff -q reports/Anvil-Design/10_Anti-Patterns_Defeated.md dg-anvil/docs/failure-taxonomy.md
# 20. Single-writer discipline for the ledger: exactly one source file encodes the literal path.
count=$(grep -lnE '~/\\.anvil/ledger\\.jsonl' dg-anvil/cli/lib/*.js 2>/dev/null | wc -l)
test "$count" = "1"
grep -lnE '~/\\.anvil/ledger\\.jsonl' dg-anvil/cli/lib/*.js | grep -q ledger-write.js
# 21. Structural input isolation for the Court: the module still does not import Plan, Ledger, or Ledger-write.
! grep -nE "require\\(.*['\"](\\.\\/)?(plan|ledger|ledger-write)['\"]\\)" dg-anvil/cli/lib/court.js
# 22. Trace fields closed: the trace module's TRACE_EVENT_KEYS is frozen and equals the canonical seventeen.
node -e "const t=require('./dg-anvil/cli/lib/trace.js'); const want=['ts','run_id','task','phase','level','agent_id','tool','tool_input_hash','outcome','evidence_ref','duration_ms','tokens_in','tokens_out','cost_usd','model','confidence','meta']; if(t.TRACE_EVENT_KEYS.length!==want.length){process.exit(1)}; for(let i=0;i<want.length;i++){if(t.TRACE_EVENT_KEYS[i]!==want[i]){process.exit(1)}}"
# 23. Zero advisory hooks: every hook either blocks (exit 2) or emits structured events (exit 0 with trace-append). Hooks must not print warnings outside structured JSON.
! grep -iE "(^|[^\"{])WARNING([^\"}]|$)|note: " dg-anvil/hooks/pre-tool-use dg-anvil/hooks/post-tool-use dg-anvil/hooks/user-prompt-submit dg-anvil/hooks/stop dg-anvil/cli/lib/hooks.js
# 24. Zero light-paths: no /fast, /quick, /do, /skip, /override; no --fast, --quick, --skip, --override flags.
! grep -iE "(--fast|--quick|--skip|--override|/fast|/quick|/do|/skip|/override)" dg-anvil/cli dg-anvil/commands dg-anvil/skills dg-anvil/hooks
# 25. Zero persona definitions: none of the forbidden phrases in any Stage 4 file.
! grep -rE "as a senior engineer|as a security auditor|as a test engineer|you are an expert in" dg-anvil/
# 26. Substantive check: README.md contains the substring "two human touchpoints" (ensures the core UX claim is stated, not just implied).
grep -q "two human touchpoints" dg-anvil/README.md
# 27. Second substantive check: docs/failure-taxonomy.md contains all 30 rows (grep -c for row markers).
test $(grep -cE '^\| ?(row )?[0-9]+ ?\|' dg-anvil/docs/failure-taxonomy.md) -ge 30
# 28. Cassette mechanism check: cli/lib/subagent-bridge.js exports recordCassette and replayCassette, and anvil cassette record is in the dispatch table.
node -e "const b=require('./dg-anvil/cli/lib/subagent-bridge.js'); for(const f of ['recordCassette','replayCassette']){if(typeof b[f]!=='function'){process.exit(1)}}"
node dg-anvil/cli/anvil.js --help 2>&1 | grep -qE 'cassette record'
# 29. Cassette redaction: no recorded cassette under tests/cassettes/pressure/ contains unredacted API keys or auth headers.
! grep -rE "(sk-ant-|x-api-key:|authorization:)" dg-anvil/tests/cassettes/pressure/
echo "stage 4 exit criteria: pass"
# Expected exit 0.
```

## Handoff to v1 release

Stage 4 is terminal. The v1 release artefacts are:

- `README.md` - finalized at maximum 500 lines in Task 4.11.
- `CHANGELOG.md` - bumped from the Stage 0 placeholder to a v1.0.0 entry naming the Stage 0-4 build order and the five primitives, seven skills, five hooks, five slash commands, one CLI binary. The CHANGELOG entry is written as part of the v1 release tagging, not as a Stage 4 task file; the entry is a single H2 `## 1.0.0 - Initial Anvil v1 release` with a short paragraph pointing at `reports/Anvil-Design/` and `docs/failure-taxonomy.md`.
- `LICENSE` - already present from Stage 0 Task 0.2 as a standard MIT license; no changes required at v1 release.
- Tagged release - git tag `v1.0.0` on the Stage 4 merge commit.

The two human touchpoints in the production loop are:

1. **Contract confirm.** After `/start <intent>` produces `anvil/contract.yml`, the user reviews the contract and either accepts or rejects it. This is a binary gate (Invariant 16); no list-of-N auto-pick. (source: `03_The_Core_Loop.md` Human touchpoints; `04_Anatomy.md` Five slash commands table `/start` row)
2. **PR merge.** `/ship` opens the PR via `gh pr create`; the human reviews and merges. `/ship` does not merge for the user. (source: `04_Anatomy.md` Five slash commands table `/ship` row; `11_Implementation_Plan.md` Stage 4 "zero human touchpoints besides contract confirm and PR merge")

No further stage plans exist. Stage 4 is the terminal stage of the DG-Anvil build.

## Known Non-Goals for This Stage

- OpenCode adapter (post-v1 per `11_Implementation_Plan.md` platform coverage section) (post-v1).
- Cursor adapter (post-v1) (post-v1).
- Gemini CLI adapter (post-v1) (post-v1).
- GitHub Copilot CLI adapter (post-v1) (post-v1).
- Multi-user ledger (post-v1) (post-v1).
- Model abstraction layer (post-v1) (post-v1).
- Web dashboard (never, per `11_Implementation_Plan.md` non-goals) (never).
- Custom Verify probe plugins (post-v1) (post-v1).
- Cost dashboard beyond what `anvil metrics` reports (never, per `04_Anatomy.md` "What is deliberately absent") (never).
