# 00 - DG-Anvil Build Architecture

This document is the build architecture for DG-Anvil. It resolves every cross-stage decision once. The five stage plans in `reports/DG-Anvil/plans/` derive their specifics from this document and from the Anvil-Design report under `reports/Anvil-Design/`.

This document does not restate the product design. The product design is `reports/Anvil-Design/00_intro.md` through `reports/Anvil-Design/12_Bottom_Line.md`. Read those first if unfamiliar.

## 1. Purpose and reading order

### Purpose

An implementer agent tasked with executing any one of the five stage plans must be able to complete that stage without consulting any third source. That is the completeness test for this document.

### What this document resolves

- File and directory layout for the entire plugin, from the first Stage 0 file to the final Stage 4 file.
- Technology choices: language, version floors, allowed builtins, prohibited patterns.
- The dependency graph between stages: exactly which files each stage consumes from the prior stage and produces for the next.
- The three authoritative schemas (contract, plan, ledger) and their lifecycle across stages.
- Cross-stage invariants: rules every stage must respect.
- Testing discipline: what "complete" means for each stage.
- Per-stage scope boundaries: explicit out-of-scope lists.
- The stage plan format contract: the template every stage plan must follow.

### Reading order for an implementer agent

For any Stage N plan:

1. Read `reports/DG-Anvil/00_Architecture.md` (this document), end to end.
2. Read `reports/Anvil-Design/11_Implementation_Plan.md`, at minimum the section for Stage N.
3. Read the canonical Anvil-Design sections for Stage N listed below.
4. For N greater than 0, read `reports/DG-Anvil/plans/stage_<N-1>_<name>.md` to confirm the prior stage's output.
5. Read `reports/DG-Anvil/plans/stage_<N>_<name>.md` (the plan being executed).

### Canonical Anvil-Design sections per stage

| Stage | Canonical Anvil-Design reading |
|---|---|
| Stage 0 | `04_Anatomy.md` (complete); `11_Implementation_Plan.md` Stage 0 |
| Stage 1 | `05_The_Contract.md`; `03_The_Core_Loop.md` phases 2 and 3; `11_Implementation_Plan.md` Stage 1 |
| Stage 2 | `03_The_Core_Loop.md` phases 4, 5, 6; `05_The_Contract.md` section "Why four verification levels"; `11_Implementation_Plan.md` Stage 2 |
| Stage 3 | `06_The_Ledger.md` (complete); `07_The_Court.md` (complete); `11_Implementation_Plan.md` Stage 3 |
| Stage 4 | `08_Observability_and_Calibration.md` (complete); `10_Anti-Patterns_Defeated.md` (complete); `11_Implementation_Plan.md` Stage 4 |

Every stage also reads `10_Anti-Patterns_Defeated.md` for the 30-row failure taxonomy, because the testing discipline references taxonomy rows by number.

## 2. Source tree layout

The complete plugin source tree is committed up front. Stage 0 creates every directory shown below. Later stages add files inside these directories; they do not create new top-level directories.

```
dg-anvil/
  .claude-plugin/
    plugin.json
  hooks/
    hooks.json
    run-hook.cmd
    session-start
    pre-tool-use
    post-tool-use
    user-prompt-submit
    stop
  commands/
    start.md
    continue.md
    ship.md
    abort.md
    ledger.md
  skills/
    using-anvil/SKILL.md
    authoring-skills/SKILL.md
    contracting/SKILL.md
    planning/SKILL.md
    executing/SKILL.md
    verifying/SKILL.md
    judging/SKILL.md
    resetting/SKILL.md
  cli/
    anvil.js
    contract-schema.json
    plan-schema.json
    ledger-schema.json
    lib/
      contract.js
      plan.js
      ledger.js
      ledger-write.js
      executor.js
      verifier.js
      worktree.js
      court.js
      metrics.js
      trace.js
      hooks.js
      subagent-bridge.js
      yaml.js
      errors.js
      args.js
      io.js
  docs/
    failure-taxonomy.md
    anvil_workflow.svg
    contract-examples/
      good/*.yml
      bad/*.yml
    plan-examples/
      good/*.yml
      bad/*.yml
    ledger-examples/
      good/*.jsonl
      bad/*.jsonl
  tests/
    unit/
      contract.test.js
      plan.test.js
      ledger.test.js
      executor.test.js
      verifier.test.js
      court.test.js
      worktree.test.js
      metrics.test.js
      trace.test.js
      yaml.test.js
    loop/
      fixture-repo-python/
      fixture-repo-node/
      fixture-repo-go/
      loop.test.js
    pressure/
      harness.js
      contracting.pressure.js
      planning.pressure.js
      executing.pressure.js
      verifying.pressure.js
      judging.pressure.js
      resetting.pressure.js
      authoring-skills.pressure.js
  README.md
  CHANGELOG.md
  LICENSE
  package.json
```

### Per-repository directory (created at runtime, not by the plugin install)

```
./anvil/
  contract.yml
  plan.yml
  trace.jsonl
  state.json
  calibration.jsonl
  verify/
    verify-result.json
```

### Global directory (user-level, created at runtime)

```
~/.anvil/
  ledger.jsonl
  ledger.index.json
  config.json
```

### Empty-directory convention

- Empty directories that must be tracked by git carry a zero-byte `.gitkeep` file. This applies only to directories that are referenced by tests or code but are empty at the end of their creating stage. In Stage 0 these are the six fixture subdirectories (`docs/contract-examples/good`, `docs/contract-examples/bad`, `docs/plan-examples/good`, `docs/plan-examples/bad`, `docs/ledger-examples/good`, `docs/ledger-examples/bad`).
- All other directories in the source tree are populated by at least one non-`.gitkeep` file in the stage that creates them and therefore do not require `.gitkeep`.
- When a later stage adds fixture files to one of the six directories, the `.gitkeep` is removed in the same commit as the first real fixture.

### File naming rules

- Source files: lowercase, hyphens or nothing (no camelCase in filenames). `ledger-write.js`, not `ledgerWrite.js`.
- Test files: `<module>.test.js`. Paired one-to-one with a `cli/lib/<module>.js`.
- Fixture files: `<shape>-<id>.yml` under `good/` or `bad/`. Example: `rate-limit-001.yml`.
- Schema files: `<name>-schema.json` at `cli/`.
- Skill files: always `SKILL.md` (all caps), one per skill directory.
- Hook files: no extension on Unix side, `.cmd` on Windows launcher. Polyglot pattern follows superpowers convention.

## 3. Technology baseline and constraints

### Runtime

- Node.js 20.0.0 minimum. Stage 0 writes `"engines": {"node": ">=20.0.0"}` into `package.json`.
- Zero runtime dependencies. `package.json` has no `dependencies` key. `devDependencies` is also empty; testing uses Node's builtin `node:test` and `node:assert`.
- Allowed Node builtins: `fs`, `fs/promises`, `path`, `child_process`, `crypto`, `os`, `readline`, `util`, `url`, `events`, `stream`, `process`. Any builtin not listed here requires an architecture document update.
- No ESM. Use CommonJS (`require`, `module.exports`) for Node compatibility across older CI environments and to keep `node:test` ergonomics simple.

### YAML

- No npm YAML library. A vendored minimal YAML reader lives at `cli/lib/yaml.js`.
- The YAML subset supported: block-style mappings; block-style sequences; scalars (strings, integers, booleans, null); frontmatter (triple-dash delimiters); triple-quoted and single-line strings; comments. No anchors. No flow style. No tags other than implicit scalar types.
- If a contract or plan file uses a feature outside this subset, `cli/lib/yaml.js` throws a structured error with the line and column.
- `cli/lib/yaml.js` is written in Stage 0 as a skeleton with the parser contract, finalized in Stage 1 when contract and plan parsing first runs.

### File encoding

- UTF-8 without BOM.
- LF line endings. Stage 0 commits `.gitattributes` with `* text=auto eol=lf`.
- Repository is committed with LF; checkout on Windows does not convert to CRLF.

### Hooks

- Polyglot bash plus CMD. Bash scripts live without extension (`session-start`, `pre-tool-use`, etc.). A Windows launcher `run-hook.cmd` dispatches to the bash script via git-bash or falls back to exit 0 if no bash is found.
- Pattern is identical to the superpowers reference under `superpowers-main/hooks/`. Stage 0 copies the pattern.
- Every hook exits 0 when bash is unavailable. Hook absence never blocks a Claude Code session; hook presence enforces.

### Subprocess invocation

- `cli/lib/io.js` wraps `child_process.spawnSync` with structured stdout, stderr, exit-code capture.
- Never shell-interpolate user input into a command string. Always pass arguments as an array to `spawnSync`.
- Tool output is captured as-is and written to worktree-relative paths; the orchestrator does not parse tool output with regex for control flow decisions.

### CLI argument parsing

- No external argument parser. `cli/lib/args.js` implements a minimal parser: positional arguments, long options (`--flag`, `--flag=value`), short options (`-f`), `--` terminator. Stage 0 ships the skeleton; Stage 1 finalizes.
- Every subcommand's argument shape is declared as a small schema object at the top of each subcommand handler. The parser rejects unknown options with a structured error.

### Error format

- Every CLI subcommand either exits 0 with JSON or human-readable output on stdout, or exits non-zero with a JSON error object on stderr.
- Error JSON shape: `{ "error": string, "code": string, "details": object_or_null }`.
- Error codes are stable strings defined in `cli/lib/errors.js`. Stage 0 creates the file with the initial code set; later stages add codes.
- Initial codes (Stage 0): `E_NOT_IMPLEMENTED`, `E_UNKNOWN_SUBCOMMAND`, `E_UNKNOWN_FLAG`, `E_MISSING_ARG`, `E_INVALID_JSON`, `E_INVALID_YAML`, `E_IO`.
- Later stage codes are additive and must be registered in `cli/lib/errors.js` when introduced.

### Runtime state file shape

`./anvil/state.json` is the orchestrator's per-repository state file. Shape (committed as part of the architecture; Stage 2 is the first stage to write it):

```json
{
  "anvil_state_version": 1,
  "run_id": "<r-<8hex>>",
  "contract_path": "anvil/contract.yml",
  "plan_path": "anvil/plan.yml",
  "current_wave": "<integer or null>",
  "tasks": {
    "<task_id>": {
      "status": "<one of: queued | running | verified | judged | passed | failed | escalated>",
      "worktree_path": "<string or null>",
      "started_at": "<ISO-8601 or null>",
      "finished_at": "<ISO-8601 or null>",
      "loop_count": "<integer, default 0>",
      "last_verify_result": "<object or null>",
      "last_judge_result": "<object or null>",
      "last_lesson_id": "<string or null>",
      "prior_lesson_ids": "<array of strings, default []>"
    }
  },
  "meta": {
    "ship_approval_token": "<string or null>",
    "ship_approval_token_expires_at": "<ISO-8601 UTC or null>",
    "contract_unconfirmed": "<boolean, default false>"
  }
}
```

The `meta.ship_approval_token` field is set during `/ship` (Stage 4) to bypass the `pre-tool-use` hook's destructive-pattern block for ship-phase operations. `meta.ship_approval_token_expires_at` is a short TTL (maximum 5 minutes after issuance). The `pre-tool-use` hook (Stage 4) rejects any token whose `ship_approval_token_expires_at` is in the past or null. The `/ship` command removes both fields on success, failure, or timeout. A process crash mid-ship leaves a stale token, but the expiry check renders it inert within the TTL.

The `prior_lesson_ids` field preserves the history of lesson ids attached to a task when multiple reset or abort cycles occur. `last_lesson_id` always points to the most recent lesson attached to the task; when a new lesson is attached and `last_lesson_id` was already set, the prior value is pushed onto `prior_lesson_ids` before `last_lesson_id` is overwritten. This preserves the reset-attempt audit trail through a subsequent abort or re-reset.

The `meta.contract_unconfirmed` field is `true` while a draft contract exists in `anvil/contract.yml` awaiting the one-shot user confirmation and `false` after confirmation or when no contract is active. The sole writer is the `contracting` skill (Stage 1). The sole reader is `hooks/user-prompt-submit` (Stage 4), which routes the user turn to the contracting surface while the flag is `true`. No other module writes or reads this field.

### Escalation handler

An escalated task (status `escalated`) is the product's only non-autonomous interruption in the middle of the loop (per `03_The_Core_Loop.md` "Human touchpoints"). Escalations fire on loop-cap-reached, duplicate-lesson-pattern, or Court `request-clarification`. The escalation handler is the named resolution path that takes an escalated task to a human decision (amend contract / amend plan / abort with lesson). Stage 4 authors the handler as:

- A CLI surface: `anvil escalation list` prints every task in state.json with status `escalated`, its failing criterion, evidence snippet, and the three available next-action options. `anvil escalation describe --task <id>` prints a single task's full escalation record. Both are read-only.
- A routing rule in `hooks/user-prompt-submit` (Stage 4): if any task in state.json has status `escalated`, the hook prepends a structured escalation banner to the user prompt surface citing the task id and the CLI command to inspect it.
- A command: `/abort --from-escalation --task <id>` routes escalations to the abort path without losing the prior lesson id (uses `prior_lesson_ids` per above).

No new skill is authored; escalation is a compositional outcome of existing skills (resetting's "escalate" branch names the transition; the handler is the surface that presents it). New error codes introduced in Stage 4: `E_NO_ESCALATED_TASKS` (when `list` finds none), `E_ESCALATION_TASK_NOT_FOUND` (when `describe` names a missing task).

### Parallel wave dispatch

`03_The_Core_Loop.md` "Parallelism" section specifies tasks within a wave run in parallel worktrees. v1 ships with in-process parallelism via `Promise.allSettled` over wave-member task dispatches. Concurrency bound: the number of tasks in the wave (each gets its own worktree). Stage 4 wires the parallel orchestrator in the executor (`cli/lib/executor.js`). Cross-worktree file conflicts are prevented by the worktree-per-task invariant; wave commit policy (from `03_The_Core_Loop.md`) is "the wave only commits once all tasks in it pass" - implemented by the orchestrator holding results until all Promise.allSettled members resolve, then merging in task-id order. Failure in any task fails the wave; passing tasks keep their worktrees for inspection and orphan-worktree alarm at session stop.

The state file is not a first-class schema in Section 5 because it is orchestrator-internal and never presented to the user. `anvil_state_version` is bumped for any shape change; bump requires a migration subcommand `anvil state-migrate` (same discipline as the three first-class schemas). `anvil state-migrate` is authored in the stage that first introduces an `anvil_state_version` bump; v1 ships at version 1 with no migration subcommand, and the dispatch table in `cli/anvil.js` does not reserve a slot for it. When a future stage bumps the version, that stage's plan authors the migration subcommand as part of its produces list.

### Dispatcher identifiers

The executor (`cli/lib/executor.js`, Stage 2) accepts a dispatcher identifier naming the subagent dispatch backend. Stage 2 ships two identifiers:

- `anvil_subagent` - the default. Dispatches via the host's subagent primitive (Claude Code's Agent tool or equivalent). In Stage 2 this is stubbed to return a canned result for the fixture-repo-node loop test only; the live dispatch path is wired in Stage 4 when the runtime surface fills in.
- `stub` - a test-only dispatcher used by unit and pressure tests. Returns a pre-defined result from a test fixture.

No other dispatcher identifier exists in v1. Future host-bound identifiers (OpenCode, Cursor, Gemini CLI, Copilot CLI per `11_Implementation_Plan.md` platform coverage) extend this list post-v1. The `anvil run --dispatcher <id>` flag rejects unknown identifiers with `E_UNKNOWN_DISPATCHER`.

### Wired-probe language support

The Wired verification probe (Stage 2) walks the call graph from the contract's named entry point in the target repository's source language. Per-language support is rolled out across stages to match the loop-test fixtures:

- Stage 2 ships JavaScript support. `fixture-repo-node` is the reference.
- Stage 3 ships Python support. `fixture-repo-python` is the reference.
- Stage 4 ships Go support. `fixture-repo-go` is the reference.

A Wired probe invoked against a language not yet supported by the current stage returns `E_UNSUPPORTED_LANGUAGE` (a structured error), not a pass or a soft warning. The contract author must either target a supported language or the contract fails at Plan-time.

### Skill invocation from tests

Loop tests (`tests/loop/**`) exercise the full Anvil loop end-to-end. A loop test is not the orchestrator; it is a node test that drives the CLI and the `cli/lib/*.js` modules directly. A skill's Process steps (written in `skills/*/SKILL.md`) are reified as code paths in `cli/lib/*.js`. Tests invoke skills by calling those code paths, never by parsing SKILL.md at test time. Example: the `resetting` skill's Process step "append lesson and re-queue task" is reified in `cli/lib/ledger-write.js` (the append) and in the orchestrator's task-queue logic; a loop test invokes those directly.

This means no skill has a dedicated CLI subcommand for "invoke this skill". The CLI surface exposes primitive operations (`anvil contract`, `anvil plan`, `anvil run`, `anvil verify`, `anvil judge`, `anvil ledger append`, `anvil ledger query`, `anvil ledger audit`, `anvil metrics`, `anvil audit`, `anvil ship`) from which skill Process steps compose. Any Process step that is not expressible as a composition of existing CLI primitives is a defect in the skill (the skill should be rewritten to compose primitives, not the CLI extended with a skill-named subcommand).

### Verify-result persistence

The `anvil verify` subcommand writes its structured result to a worktree-relative path for downstream consumers (Court in Stage 3, metrics and trace writer in Stage 4) to read. Path: `<worktree>/anvil/verify/verify-result.json`. Shape: the same object returned by `cli/lib/verifier.js`, serialised as JSON. Stage 2 wires `anvil verify` to compute the structured result and emit it on stdout; Stage 3 extends the subcommand to additionally persist the result to the worktree-relative path before the Court reads it. Stage 3 plans that extend Stage 2's `anvil verify` to add persistence are consistent with this architecture.

### Coverage tooling

The Substantive verification probe (Stage 2) captures a coverage delta to confirm the target symbol took the expected control-flow branches. Per-language tooling:

- JavaScript: Node built-in coverage (`node --experimental-test-coverage` in Node 20, stable `--test-coverage` in Node 22 when adopted; the executor invokes whichever is present). No external dependency.
- Python: `coverage.py` invoked via `python -m coverage run ...`. If `coverage.py` is not installed in the target repository's Python environment, the Substantive probe emits `E_COVERAGE_UNAVAILABLE` and the criterion fails. The plugin does not install `coverage.py` for the user.
- Go: Go built-in `go test -coverprofile`. No external dependency.

A contract targeting a language whose coverage tool is missing fails Substantive, not passes. "Coverage unavailable" is never a pass.

### Trace event format (Stage 4 finalizes, Stage 0 reserves)

The trace event shape is fixed at architecture time even though it is written only from Stage 4:

```json
{
  "ts": "<ISO-8601 UTC with ms>",
  "run_id": "<r-<8hex>>",
  "task": "<task-id or null>",
  "phase": "<one of: intake | contract | plan | dispatch | execute | verify | judge | reset | ship | hook>",
  "level": "<one of: exists | substantive | wired | functional | null>",
  "agent_id": "<a-<short> or null>",
  "tool": "<tool name or null>",
  "tool_input_hash": "<sha256:hex or null>",
  "outcome": "<one of: pass | fail | suspicious | start | end | error>",
  "evidence_ref": "<string or null>",
  "duration_ms": "<integer or null>",
  "tokens_in": "<integer or null>",
  "tokens_out": "<integer or null>",
  "cost_usd": "<number or null>",
  "model": "<string or null>",
  "confidence": "<0..1 or null>",
  "meta": "<object, may be empty>"
}
```

The field set is closed. Stage 4 does not add fields; it only starts writing them.

## 4. Stage dependency graph

Every stage consumes exactly what is listed as its "consumes" entry. Every stage produces exactly what is listed as its "produces" entry. No implicit consumption and no implicit production.

| Stage | Consumes from prior stage | Produces |
|---|---|---|
| Stage 0 | Nothing | `cli/anvil.js` (skeleton dispatching to stub handlers); `cli/lib/errors.js`; `cli/lib/args.js` (skeleton); `cli/lib/io.js` (skeleton); `cli/lib/yaml.js` (skeleton); `cli/contract-schema.json`; `cli/plan-schema.json`; `cli/ledger-schema.json`; `.claude-plugin/plugin.json`; `hooks/hooks.json`; `hooks/run-hook.cmd`; `hooks/session-start`; empty hook files for the other four hooks (exit-0 stubs); `skills/using-anvil/SKILL.md`; `skills/authoring-skills/SKILL.md`; skill directory stubs for the remaining six skills (empty SKILL.md with only the six required headers); `package.json`; `.gitattributes`; `README.md` (placeholder, one paragraph); `tests/pressure/harness.js` (skeleton); `tests/pressure/authoring-skills.pressure.js` (paired pressure test for the authoring-skills skill finalized this stage); `docs/failure-taxonomy.md` (copy of `reports/Anvil-Design/10_Anti-Patterns_Defeated.md` rendered as the v1 failure taxonomy); `docs/anvil_workflow.svg` (copy of `reports/Anvil-Design/anvil_workflow.svg`); `docs/contract-examples/good/.gitkeep`; `docs/contract-examples/bad/.gitkeep`; `docs/plan-examples/good/.gitkeep`; `docs/plan-examples/bad/.gitkeep`; `docs/ledger-examples/good/.gitkeep`; `docs/ledger-examples/bad/.gitkeep` |
| Stage 1 | Stage 0 output; specifically `cli/anvil.js` skeleton, the three schema files, `cli/lib/yaml.js` skeleton, `cli/lib/args.js` skeleton, `cli/lib/errors.js`, `cli/lib/io.js` | `cli/lib/contract.js` (parser + validator); `cli/lib/plan.js` (parser + validator); `cli/lib/ledger.js` (read-only: query and index-lookup, write path is stubbed with `E_NOT_IMPLEMENTED`); `cli/lib/yaml.js` (finalized); `cli/lib/args.js` (finalized); finalized `cli/contract-schema.json`; finalized `cli/plan-schema.json`; `skills/contracting/SKILL.md` (finalized with all six sections); `skills/planning/SKILL.md` (finalized); `commands/start.md`; `commands/continue.md` (skeleton that reads state and exits with `E_NOT_IMPLEMENTED` for task continuation); `docs/contract-examples/good/*.yml` (minimum three good fixtures, replacing `.gitkeep`); `docs/contract-examples/bad/*.yml` (minimum one fixture per contract-validator rejection rule, replacing `.gitkeep`); `docs/plan-examples/good/*.yml` (minimum three, replacing `.gitkeep`); `docs/plan-examples/bad/*.yml` (minimum one per rejection rule, replacing `.gitkeep`); `tests/unit/contract.test.js`; `tests/unit/plan.test.js`; `tests/unit/ledger.test.js` (read path only); `tests/unit/yaml.test.js`; `tests/pressure/contracting.pressure.js`; `tests/pressure/planning.pressure.js`; wired CLI subcommands: `anvil contract`, `anvil plan`, `anvil ledger query` |
| Stage 2 | Stage 1 output; specifically the contract parser, the plan parser, the ledger read path, the schemas, the `/start` and `/continue` commands | `cli/lib/executor.js`; `cli/lib/verifier.js`; `cli/lib/worktree.js`; `skills/executing/SKILL.md`; `skills/verifying/SKILL.md`; `commands/continue.md` (finalized); `tests/unit/executor.test.js`; `tests/unit/verifier.test.js`; `tests/unit/worktree.test.js`; `tests/pressure/executing.pressure.js`; `tests/pressure/verifying.pressure.js`; `tests/loop/fixture-repo-node/` (minimum one trivial test repository with a known-good contract that runs to Verify green); wired CLI subcommands: `anvil run`, `anvil verify` |
| Stage 3 | Stage 2 output; specifically the executor, the verifier, the worktree manager, the contract and plan parsers, the ledger read path | `cli/lib/court.js`; `cli/lib/ledger-write.js` (finalizes ledger write and index maintenance); finalized `cli/ledger-schema.json`; `skills/judging/SKILL.md`; `skills/resetting/SKILL.md`; `commands/abort.md`; `commands/ledger.md`; `docs/ledger-examples/good/*.jsonl` (minimum three good fixtures); `docs/ledger-examples/bad/*.jsonl` (minimum one per rejection rule); `tests/unit/court.test.js`; `tests/unit/ledger.test.js` (add write-path coverage to the file first created in Stage 1); `tests/pressure/judging.pressure.js`; `tests/pressure/resetting.pressure.js`; `tests/loop/fixture-repo-python/` (a repository with a deliberately under-specified contract; the loop must reset with a non-null lesson and pass on retry); wired CLI subcommands: `anvil judge`, `anvil ledger append`, `anvil ledger query` (finalized if it was a skeleton), `anvil ledger audit` |
| Stage 4 | Stage 3 output; the complete Contract-Plan-Execute-Verify-Judge-Reset loop | `hooks/pre-tool-use`; `hooks/post-tool-use`; `hooks/user-prompt-submit`; `hooks/stop`; finalized `hooks/session-start` (Stage 0 exit-0 stub replaced with delegation to `anvil hook session-start`; emits one structured trace event with `phase: "hook"`, `outcome: "start"`, `meta: {hook: "session-start", loaded_skill: "using-anvil"}`; no raw echo/printf in script body); `cli/lib/metrics.js`; `cli/lib/trace.js`; `cli/lib/hooks.js` (centralised hook-policy module invoked from the four polyglot shell scripts; required by Invariant 1 because hook policy cannot live in bash alone without duplication); `cli/lib/escalation.js` (standalone handler module for the escalation surface; exports `listEscalated`, `describeEscalated`, `escalationBanner`; peer of other `cli/lib/*.js` modules); `cli/lib/subagent-bridge.js` (host-bridge for live `anvil_subagent` dispatch; consumed by `executor.js` and `court.js`); `commands/ship.md`; finalized `README.md`; finalized `docs/failure-taxonomy.md`; finalized `tests/loop/fixture-repo-go/` (third language, third repository); `tests/loop/loop.test.js` (orchestrates all three fixture repos; covers three repositories and three languages: JavaScript, Python, Go - satisfying both the Stage 4 completion bar and the v1 success-criteria bar); `tests/loop/seeded-faults/.gitkeep` (reserves the seeded-fault corpus directory used by the v1 metrics assertions; populated during release preparation); `tests/cassettes/pressure/.gitkeep` (reserves the cassette directory populated by the release checklist with recorded Anthropic responses for the integration pressure-test pass); `tests/unit/metrics.test.js`; `tests/unit/trace.test.js`; `tests/unit/hooks.test.js`; `tests/unit/escalation.test.js`; `tests/unit/subagent-bridge.test.js`; wired CLI subcommands: `anvil metrics`, `anvil audit`, `anvil ship`, `anvil hook` (internal sub-dispatch invoked by the polyglot hook scripts), `anvil escalation list`, `anvil escalation describe --task <id>`, `anvil cassette record --scenario <name>` |

### Consume-produce contract enforcement

A stage plan's prerequisite verification step must check every "consumes" item by file path. If any item is missing, the plan stops. A stage plan's exit-criteria check must confirm every "produces" item exists. Stage plans that add to the produces list without updating this table in the architecture document are rejected by the review loop.

## 5. Schemas as first-class artefacts

Three JSON Schemas govern every file the plugin reads or writes as structured data.

### Schema files and version labels

- `cli/contract-schema.json` - governs `anvil/contract.yml`. Version label in the YAML frontmatter: `anvil_contract_version: 1`.
- `cli/plan-schema.json` - governs `anvil/plan.yml`. Version label: `anvil_plan_version: 1`.
- `cli/ledger-schema.json` - governs `~/.anvil/ledger.jsonl` entries. Version label per entry: `anvil_ledger_entry_version: 1`.

### Schema lifecycle across stages

- **Stage 0** writes all three schema files as frozen drafts. "Frozen" means the schema file is complete and compiled, but the code that validates against it is stubbed. The schema draft is authored from `05_The_Contract.md`, the Ledger shape in `06_The_Ledger.md`, and the Plan shape inferred from `03_The_Core_Loop.md` and `04_Anatomy.md`.
- **Stage 1** finalizes the contract and plan schemas. "Finalizes" means the parser and validator are wired, every schema field has a validator test, every rejection rule has a bad-fixture test.
- **Stage 3** finalizes the ledger schema. The write path and the index maintenance are the final additions.

### Schema versioning rules

- Version field is required. Missing version is a structured parse error, not a default.
- Schema version is an integer. No decimals. Bump is a migration.
- Every schema bump is paired with a CLI migration subcommand: `anvil contract-migrate`, `anvil plan-migrate`, `anvil ledger-migrate`. The migration subcommand reads a file at old version and writes a file at new version. It never rewrites in place silently.
- The ledger is backward-compatible forever. New fields are allowed; removed fields are forbidden. Ledger readers ignore unknown fields.

### Schema authoring source

- Contract schema: `reports/Anvil-Design/05_The_Contract.md` "Format" section is the canonical shape.
- Plan schema: no single section in Anvil-Design gives the full shape; the Stage 0 plan must synthesise it from `03_The_Core_Loop.md` ("Plan" phase row), `04_Anatomy.md` (Plan primitive), and `11_Implementation_Plan.md` Stage 1 text. The synthesised schema is the authoritative source, and Stage 1's contract-examples fixtures must match it.
- Ledger schema: `reports/Anvil-Design/06_The_Ledger.md` "What a lesson is" section is the canonical shape.

## 6. Cross-stage invariants

Every stage plan's Invariants check section must restate the applicable subset of these rules with stage-specific assertions. A rule is applicable if the stage produces or modifies files the rule governs.

### Rules

1. **No advisory hooks.** Every hook either blocks the action or emits a structured event. A hook that prints a warning and returns 0 is not a hook.
2. **No fallback light-paths.** No commands named `/fast`, `/quick`, `/do`, `/skip`, `/override`. No code path that downgrades a verification level on agent claim alone.
3. **No unshipped markers.** Shipped source files contain no `TODO`, `FIXME`, `XXX`, `HACK`, `TBD`, `WIP`, `NOTE:`, or date-tagged comment like `// 2026-04-15 -`. Tests and fixtures may contain `TODO:` only inside a string literal intentionally used as a Substantive probe negative example.
4. **No persona definitions.** Subagents are dispatched with role-free briefings. The Court is parameterized by contract check types, not by a stance library. Words forbidden in any prompt constant: `as a senior engineer`, `as a security auditor`, `as a test engineer`, `you are an expert in`.
5. **Structured errors on every exit.** Every CLI subcommand returns exit code 0 on success, non-zero on error, with `{error, code, details}` JSON on stderr for error paths.
6. **Six canonical skill sections.** Every `skills/*/SKILL.md` file has these sections as H2 headings in this order: `Overview`, `When to Use`, `Process`, `Rationalizations`, `Red Flags`, `Verification`. Section names are exact. No additional top-level sections. Subheadings inside sections are allowed.
7. **Schema changes require a migration.** Any change to `cli/*-schema.json` requires a paired CLI migration subcommand entry in `cli/anvil.js` and a test in `tests/unit/` that exercises the migration round-trip.
8. **Skill changes require RED-then-GREEN pressure transcript.** When a stage plan authors or modifies any `skills/*/SKILL.md` file, it must also author or modify the paired `tests/pressure/<skill>.pressure.js`. The pressure test asserts the skill's presence catches a scenario its absence would miss. Exempt: `skills/using-anvil/SKILL.md` is the bootstrap loader (it loads at session-start and enumerates the other skills; it enforces no runtime behaviour of its own). `using-anvil` has no paired pressure test. Every other skill, including `authoring-skills`, requires a pressure test in the same stage that authors it.
9. **Polyglot hooks with graceful degradation.** Every hook ships with a bash script and is invokable from `hooks/run-hook.cmd` on Windows. On any platform where bash is missing, the hook exits 0.
10. **UTF-8 LF encoding.** All source files are UTF-8 without BOM, LF line endings. No binary files checked in except the SVG in `docs/`.
11. **Zero runtime dependencies.** `package.json` has an empty `dependencies` object and empty `devDependencies`. Any change that would add a dependency is rejected.
12. **Failure-taxonomy row citation.** Every pressure test names the failure-taxonomy row (numbered 1 through 30 in `10_Anti-Patterns_Defeated.md`) it is stressing. A pressure test without a taxonomy citation is rejected.
13. **Fresh-subagent discipline.** Any runtime code path that dispatches work to a subagent (Stage 2 onward) uses a fresh context for that subagent. No orchestrator carries diffs, rationales, or tool output across dispatches.
14. **Evidence-only Court inputs.** The `cli/lib/court.js` module is structurally unable to pass Plan, commit messages, or prior Court verdicts to the Court subagent. This is enforced in code, not in prose.
15. **Null-lesson prohibition.** `cli/lib/ledger-write.js` rejects any lesson entry whose `contract_gap`, `evidence`, or `remediation` fields are null or empty. A failed reset that cannot produce a non-null lesson escalates instead.
16. **No auto-pick gates.** Every human gate in Anvil is binary: accept or reject. There is no list-of-N gate whose top option is silently selected on timeout.
17. **Single-writer discipline for the ledger.** Only `cli/lib/ledger-write.js` may append to `~/.anvil/ledger.jsonl`. No other module writes. Enforced by code review; the path literal appears in exactly one source file.
18. **Trace fields are closed.** No code path writes a trace event with fields outside the schema in Section 3. Additions require an architecture update.

## 7. Testing discipline

### Test runner

- Node builtin `node:test`. No external test framework.
- Test discovery: `node --test tests/**/*.test.js` from repository root. `package.json` declares `"scripts": { "test": "node --test tests/**/*.test.js" }`.
- Coverage: `node --test --experimental-test-coverage tests/**/*.test.js` (Node 20 builtin). No coverage tool added.

### Test tiers

1. **Unit tests** - `tests/unit/<module>.test.js`. Paired one-to-one with `cli/lib/<module>.js`. Every exported function has at least one positive test and one negative test. Rejection rules have dedicated tests.
2. **Fixture tests** - `tests/unit/<module>.test.js` also loads every fixture in `docs/<name>-examples/good/*` and asserts the validator accepts it; loads every fixture in `docs/<name>-examples/bad/*` and asserts the validator rejects it with the expected error code.
3. **Pressure tests** - `tests/pressure/<skill>.pressure.js`. One per skill. Uses the harness from `tests/pressure/harness.js` to dispatch a subagent with and without the skill under test. The test passes only if the skill-absent run fails in the expected way and the skill-present run passes.
4. **Loop tests** - `tests/loop/loop.test.js`. Runs `/start` through `/ship` against a fixture repository. Fixture repositories live under `tests/loop/fixture-repo-<language>/`. Stage 2 ships the first fixture repo; Stage 3 ships the second; Stage 4 ships the third.

### Definition of "complete per stage"

A stage is complete when:

1. Every file listed in the stage's "produces" column in Section 4 exists.
2. `node --test tests/**/*.test.js` exits 0.
3. The stage's exit criteria command in the stage plan exits 0.
4. No file in the stage's changes contains any string from invariant 3 (no unshipped markers).
5. Every skill authored or modified has a passing pressure test with a taxonomy row citation.

### Fixture discipline

- Fixture file names follow pattern `<shape>-<id>.yml` or `<shape>-<id>.jsonl`.
- Every bad fixture file has a comment at the top (a `#`-prefixed line for YAML, a JSONL comment is not syntactic so a paired `<shape>-<id>.meta.json` file holds the reason) naming the rejection rule the fixture triggers and the expected error code.
- The good-and-bad directory structure is enforced by test setup; a good fixture that fails validation is a test failure, and a bad fixture that passes validation is a test failure.

### Pressure test harness

- `tests/pressure/harness.js` exports `runPressure({ scenario, withSkill, withoutSkill })`. Both runs dispatch a subagent against the scenario; one run includes the skill file in the subagent's briefing, the other does not.
- A pressure test asserts: the without-skill run fails (outcome matches the scenario's failure criteria); the with-skill run passes.
- A pressure test names the failure-taxonomy row it is stressing. Example: `// taxonomy row 7: Rationalized shortcut`.

## 8. Scope boundaries

Each list below is the definitive "definitely out of scope" set for that stage. A stage plan proposing any item in its stage's out-of-scope list is rejected.

### Stage 0 out of scope

- Contract parsing logic (belongs in Stage 1).
- Plan parsing logic (Stage 1).
- Ledger read path or write path (read in Stage 1, write in Stage 3).
- Any subagent dispatch (Stage 2).
- Worktree creation (Stage 2).
- Any verify probe (Stage 2).
- Court dispatch (Stage 3).
- `pre-tool-use`, `post-tool-use`, `user-prompt-submit`, `stop` hooks as functional enforcement (they exist as exit-0 stubs only).
- Metrics computation (Stage 4).
- Ship command (Stage 4).

### Stage 1 out of scope

- Worktree creation or management (Stage 2).
- Subagent dispatch (Stage 2).
- Verify probes (Stage 2).
- Court dispatch (Stage 3).
- Ledger write path or index maintenance on write (Stage 3).
- `pre-tool-use`, `post-tool-use`, `user-prompt-submit`, `stop` hook behaviour (Stage 4).
- Metrics (Stage 4).
- Ship (Stage 4).
- Final `README.md` content (Stage 4).

### Stage 2 out of scope

- Court dispatch or verdict parsing (Stage 3).
- Ledger write path (Stage 3).
- `resetting` skill (Stage 3).
- Observability hooks (Stage 4).
- Metrics (Stage 4).
- Ship (Stage 4).

### Stage 3 out of scope

- `post-tool-use` hook body (Stage 4).
- `pre-tool-use` hook body (Stage 4).
- `user-prompt-submit` hook body (Stage 4).
- `stop` hook body (Stage 4).
- `anvil metrics` implementation (Stage 4).
- Whole-branch Court orchestration (Stage 4).
- PR open via `gh` (Stage 4).

### Stage 4 out of scope

- OpenCode adapter (post-v1 per `11_Implementation_Plan.md` platform coverage section).
- Cursor adapter (post-v1).
- Gemini CLI adapter (post-v1).
- GitHub Copilot CLI adapter (post-v1).
- Multi-user ledger (post-v1).
- Model abstraction layer (post-v1).
- Web dashboard (never, per `11_Implementation_Plan.md` non-goals).
- Custom Verify probe plugins (post-v1).
- Cost dashboard beyond what `anvil metrics` reports (never, per `04_Anatomy.md` "What is deliberately absent").

## 9. Stage plan format contract

Every stage plan uses these H2 section headers in this exact order. Section names are case-sensitive. No additional H2 sections. H3 headings inside sections are allowed.

### Required H2 sections (in order)

1. `## Frontmatter`
2. `## Scope`
3. `## Prerequisites Verification`
4. `## Phased Tasks`
5. `## Invariants Check`
6. `## Exit Criteria`
7. `## Handoff to Next Stage`
8. `## Known Non-Goals for This Stage`

### Section content rules

#### Frontmatter

A fenced YAML block, containing:

```yaml
stage: <0 | 1 | 2 | 3 | 4>
stage_name: <string matching the Implementation Plan stage name>
prerequisites:
  architecture_doc: reports/DG-Anvil/00_Architecture.md
  anvil_design_sections:
    - <relative path under reports/Anvil-Design/>
  prior_stage_plan: <path or null>
produces:
  - <relative path under dg-anvil/>
```

No other keys.

#### Scope

Two subsections:

- `### In scope`: a bulleted list. Every item maps one-to-one to an entry in the stage's "produces" list (Section 4 of the architecture document).
- `### Out of scope`: a bulleted list. Every item is a verbatim line from Section 8 of the architecture document for this stage.

#### Prerequisites Verification

A numbered list of shell commands the executing agent runs before doing any work. Each item shows the command and the expected outcome. Example:

```
1. `test -f cli/anvil.js` - exit 0 (Stage 0 skeleton exists).
2. `jq empty cli/contract-schema.json` - exit 0 (schema parses).
```

If any check fails, the stage plan instructs the agent to stop without writing any file.

#### Phased Tasks

Numbered tasks. Each task has exactly these H3 subheadings:

- `### Task N.M: <short imperative title>`
- `#### Goal`
- `#### Inputs`
- `#### Outputs`
- `#### Decisions already made`
- `#### Tests or fixtures`
- `#### Verification command`
- `#### Done when`

Content rules per subheading:

- **Goal**: one sentence.
- **Inputs**: bulleted list of file paths or sections to read before the task.
- **Outputs**: bulleted list of exact file paths to produce, each with a sub-bullet describing what the file must contain (function signatures, schema fields, CLI argument shapes, skill section bodies, hook exit behaviour).
- **Decisions already made**: bulleted list; each bullet ends with `(source: <file or section>)`.
- **Tests or fixtures**: bulleted list of test files or fixture files this task produces or updates.
- **Verification command**: a fenced shell block showing the command and the expected exit code or stdout substring.
- **Done when**: a single sentence that names the binary pass/fail condition.

#### Invariants Check

A bulleted list. Each bullet names one invariant from Section 6 of the architecture document that applies to this stage and states the stage-specific assertion.

Example bullet: `- Invariant 3 (No unshipped markers): grep -rE '(TODO|FIXME|XXX|HACK|TBD|WIP)' cli/ hooks/ skills/ returns exit 1.`

#### Exit Criteria

A single fenced shell block containing the command or short script that proves the stage is complete. The block ends with a one-line assertion of expected exit code.

#### Handoff to Next Stage

A bulleted list of every item in the next stage's "consumes" column in Section 4, phrased as "produces `<path>` for Stage N+1 to use as `<purpose>`".

#### Known Non-Goals for This Stage

A bulleted list. Every bullet is verbatim from the stage's out-of-scope entry in Section 8, followed by a parenthetical pointer: `(picked up in Stage X)` or `(post-v1)` or `(never)`.

### Stage plan file-naming convention

- Stage 0: `reports/DG-Anvil/plans/stage_0_bootstrap.md`
- Stage 1: `reports/DG-Anvil/plans/stage_1_contract_and_plan.md`
- Stage 2: `reports/DG-Anvil/plans/stage_2_execute_and_verify.md`
- Stage 3: `reports/DG-Anvil/plans/stage_3_court_and_ledger.md`
- Stage 4: `reports/DG-Anvil/plans/stage_4_observability_and_ship.md`

### Length

- No hard length limit. Stage plans are as long as the decisions require. The test is whether the executing agent has to make any architectural decision; if yes, the plan is incomplete.

### Forbidden contents

- No narrative justification. The plan states what to do, not why the author chose it. Rationale lives in `00_Architecture.md` and `reports/Anvil-Design/`, not in stage plans.
- No conditional instructions that depend on agent judgement ("if it seems better to X, do X").
- No references to "future improvements" or "things to consider later" beyond the Known Non-Goals section.
- No comparisons to predecessor plugins.
