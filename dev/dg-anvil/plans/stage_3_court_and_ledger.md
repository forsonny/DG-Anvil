# Stage 3 Plan - Court and Ledger

## Frontmatter

```yaml
stage: 3
stage_name: Court and Ledger
prerequisites:
  architecture_doc: reports/DG-Anvil/00_Architecture.md
  anvil_design_sections:
    - reports/Anvil-Design/06_The_Ledger.md
    - reports/Anvil-Design/07_The_Court.md
    - reports/Anvil-Design/11_Implementation_Plan.md
    - reports/Anvil-Design/04_Anatomy.md
    - reports/Anvil-Design/02_Design_Thesis.md
    - reports/Anvil-Design/10_Anti-Patterns_Defeated.md
    - reports/Anvil-Design/03_The_Core_Loop.md
    - reports/Anvil-Design/05_The_Contract.md
  prior_stage_plan: reports/DG-Anvil/plans/stage_2_execute_and_verify.md
produces:
  - cli/lib/court.js
  - cli/lib/ledger-write.js
  - cli/ledger-schema.json
  - skills/judging/SKILL.md
  - skills/resetting/SKILL.md
  - commands/abort.md
  - commands/ledger.md
  - docs/ledger-examples/good/
  - docs/ledger-examples/bad/
  - tests/unit/court.test.js
  - tests/unit/ledger.test.js
  - tests/pressure/judging.pressure.js
  - tests/pressure/resetting.pressure.js
  - tests/loop/fixture-repo-python/
  - cli/anvil.js
  - cli/lib/verifier.js
```

## Scope

### In scope

- `cli/lib/court.js` dispatches a fresh subagent per task (after Verify) and once per branch (Stage 4 wires whole-branch). The Court subagent receives exactly three inputs: the active contract, the diff, the captured Verify output. The module is structurally unable (enforced in code per Invariant 14) to pass Plan, commit messages, Ledger, or prior Court verdicts to the Court. Two passes in fixed order: Pass 1 Spec compliance; Pass 2 Code quality (only runs if Pass 1 fully green). Devil's Advocate subagent runs in parallel with Pass 1 when Verify confidence is Medium or Low; attaches as a confidence modifier, not a vetoer.
- `cli/lib/ledger-write.js` is the only writer of `~/.anvil/ledger.jsonl` (per Invariant 17). Append-only JSONL. Maintains `~/.anvil/ledger.index.json` on every write (pattern -> list of lesson ids). Validates every lesson against `cli/ledger-schema.json`. Rejects null lessons (per Invariant 15): any entry whose `contract_gap`, `evidence`, or `remediation` fields are null or empty is rejected and the reset that produced it escalates instead.
- `cli/ledger-schema.json` finalized from the Stage 0 frozen draft. Any shape change from the draft is paired with an `anvil ledger-migrate` subcommand entry.
- `cli/lib/verifier.js` extended to add Python support (per Stage 3 Wired-probe language support). JavaScript support remains unchanged.
- `skills/judging/SKILL.md` finalized with the six canonical H2 sections. Process: dispatch Court subagent with the three inputs; parse structured YAML verdict; invoke Devil's Advocate when appropriate; map request-clarification to escalation.
- `skills/resetting/SKILL.md` finalized with the six canonical H2 sections. Process: diagnose input-level gap; forbid null lessons; produce `contract_patch` and `counter_example_text`; append lesson via `cli/lib/ledger-write.js`; inject patch into live contract; re-queue task. Includes a Rationalizations table entry refuting "this failure was the agent's fault, not the contract's".
- `commands/abort.md` the `/abort` command. Requires a reason. Writes an aborted-lesson (distinct from a reset-lesson) to the Ledger via `cli/lib/ledger-write.js`.
- `commands/ledger.md` the `/ledger <query>` command. Read-only. Invokes `anvil ledger query`. Returns ranked candidates.
- `docs/ledger-examples/good/*.jsonl` minimum three good fixtures.
- `docs/ledger-examples/bad/*.jsonl` minimum one fixture per rejection rule (including null-lesson rejection, invalid supersession, malformed pattern array).
- `tests/unit/court.test.js` asserts the Court dispatch cannot be called with Plan, commit message, Ledger, or prior verdicts as inputs (structural enforcement check). Exercises two-pass logic, Devil's Advocate parallel dispatch, and the suspicious-tag upgrade path.
- `tests/unit/ledger.test.js` extended from Stage 1 with write-path coverage, null-lesson rejection, index maintenance round-trip, supersession chain, and effect-size retirement.
- `tests/pressure/judging.pressure.js` cites failure-taxonomy row 2 (Sycophantic convergence). Without-skill run sees the implementer's rationale and agrees; with-skill run sees only contract plus diff plus output and catches a spec gap.
- `tests/pressure/resetting.pressure.js` cites failure-taxonomy row 20 (Reset-without-lesson). Without-skill run silently resets; with-skill run refuses to reset without a non-null lesson and escalates instead.
- `tests/loop/fixture-repo-python/` the second loop-test fixture. Minimal Python repository with a deliberately under-specified contract. The loop test runs the full Execute -> Verify -> Judge -> Reset cycle: Verify fails; reset produces a non-null lesson; lesson is injected; re-run passes. This fixture exercises Python Wired-probe language support added in Stage 3.
- `cli/anvil.js` wired subcommands `anvil judge`, `anvil ledger append`, `anvil ledger audit`, and the finalized `anvil ledger query`.

### Out of scope

- `post-tool-use` hook body (Stage 4).
- `pre-tool-use` hook body (Stage 4).
- `user-prompt-submit` hook body (Stage 4).
- `stop` hook body (Stage 4).
- `anvil metrics` implementation (Stage 4).
- Whole-branch Court orchestration (Stage 4).
- PR open via `gh` (Stage 4).

## Prerequisites Verification

No work begins until every check below exits 0. Any failure stops the stage without writing a file.

1. `test -f dg-anvil/cli/lib/executor.js` - exit 0 (Stage 2 Task 2.4 executor exists).
2. `node -e "const ex=require('./dg-anvil/cli/lib/executor.js'); if(typeof ex.executeTask!=='function'){process.exit(1)} if(!Object.isFrozen(ex.MUTABLE_STATE)||Object.keys(ex.MUTABLE_STATE).length!==0){process.exit(1)}"` - exit 0 (executor exports `executeTask` and the fresh-subagent discipline marker).
3. `test -f dg-anvil/cli/lib/verifier.js` - exit 0 (Stage 2 Task 2.6 verifier exists).
4. `node -e "const v=require('./dg-anvil/cli/lib/verifier.js'); for(const f of ['verifyAll','probeExists','probeSubstantive','probeWired','probeFunctional','evaluateInvariants']){if(typeof v[f]!=='function'){process.exit(1)}}"` - exit 0 (verifier exports the five probes plus `verifyAll`).
5. `test -f dg-anvil/cli/lib/worktree.js` - exit 0 (Stage 2 Task 2.2 worktree manager exists).
6. `node -e "const w=require('./dg-anvil/cli/lib/worktree.js'); for(const f of ['create','remove','list','alarmOrphan']){if(typeof w[f]!=='function'){process.exit(1)}}"` - exit 0 (worktree manager exports the four functions).
7. `test -f dg-anvil/cli/lib/contract.js` - exit 0 (Stage 1 contract parser exists).
8. `test -f dg-anvil/cli/lib/plan.js` - exit 0 (Stage 1 plan parser exists).
9. `test -f dg-anvil/cli/lib/ledger.js` - exit 0 (Stage 1 ledger read path exists).
10. `node -e "const l=require('./dg-anvil/cli/lib/ledger.js'); if(typeof l.load!=='function'||typeof l.query!=='function'||typeof l.append!=='function'||typeof l.updateIndex!=='function'){process.exit(1)}"` - exit 0 (ledger read path exports `load`, `query`; `append` and `updateIndex` throw `E_NOT_IMPLEMENTED` until this stage finalizes them).
11. `test -f dg-anvil/cli/lib/errors.js` - exit 0 (error module exists).
12. `node -e "const e=require('./dg-anvil/cli/lib/errors.js'); for(const k of ['E_NOT_IMPLEMENTED','E_UNKNOWN_SUBCOMMAND','E_UNKNOWN_FLAG','E_MISSING_ARG','E_INVALID_JSON','E_INVALID_YAML','E_IO','E_INVALID_CONTRACT','E_INVALID_PLAN','E_WORKTREE_CREATE','E_WORKTREE_REMOVE','E_EXECUTOR','E_VERIFY','E_STATE','E_UNKNOWN_DISPATCHER','E_UNSUPPORTED_LANGUAGE','E_COVERAGE_UNAVAILABLE']){if(e.CODES[k]!==k){process.exit(1)}}"` - exit 0 (all Stage 0, 1, 2 error codes present).
13. `test -f dg-anvil/cli/ledger-schema.json` - exit 0 (Stage 0 frozen draft exists).
14. `jq -e '.properties.anvil_ledger_entry_version.const == 1 and (.required | index("contract_gap")) and (.required | index("evidence")) and (.required | index("remediation"))' dg-anvil/cli/ledger-schema.json` - exit 0 (frozen draft names `contract_gap`, `evidence`, `remediation` as required).
15. `test -f dg-anvil/skills/judging/SKILL.md` - exit 0 (Stage 0 stub exists).
16. `awk '/^## /{print $0}' dg-anvil/skills/judging/SKILL.md | tr '\n' '|' | grep -qE '^## Overview\|## When to Use\|## Process\|## Rationalizations\|## Red Flags\|## Verification\|$'` - exit 0 (judging stub has the six canonical headers).
17. `test -f dg-anvil/skills/resetting/SKILL.md` - exit 0 (Stage 0 stub exists).
18. `awk '/^## /{print $0}' dg-anvil/skills/resetting/SKILL.md | tr '\n' '|' | grep -qE '^## Overview\|## When to Use\|## Process\|## Rationalizations\|## Red Flags\|## Verification\|$'` - exit 0 (resetting stub has the six canonical headers).
19. `test -f dg-anvil/tests/pressure/harness.js` - exit 0 (Stage 0 harness exists).
20. `node -e "const h=require('./dg-anvil/tests/pressure/harness.js'); if(typeof h.runPressure!=='function'){process.exit(1)}"` - exit 0 (`runPressure` exported).
21. `test -f dg-anvil/tests/unit/ledger.test.js` - exit 0 (Stage 1 Task 1.9 read-path unit test exists and is extended by this stage).
22. `test -f dg-anvil/tests/loop/fixture-repo-node/loop.test.js` - exit 0 (Stage 2 Task 2.13 first loop fixture exists).
23. `node --test dg-anvil/tests/loop/fixture-repo-node/loop.test.js` - exit 0 (Stage 2 loop test still passes).
24. `node --test dg-anvil/tests/unit/executor.test.js dg-anvil/tests/unit/verifier.test.js dg-anvil/tests/unit/worktree.test.js` - exit 0 (Stage 2 unit tests still pass).
25. `node --test dg-anvil/tests/pressure/executing.pressure.js dg-anvil/tests/pressure/verifying.pressure.js` - exit 0 (Stage 2 pressure tests still pass).
26. `node --test dg-anvil/tests/unit/contract.test.js dg-anvil/tests/unit/plan.test.js dg-anvil/tests/unit/ledger.test.js dg-anvil/tests/unit/yaml.test.js` - exit 0 (Stage 1 unit tests still pass).
27. `node --test dg-anvil/tests/pressure/authoring-skills.pressure.js dg-anvil/tests/pressure/contracting.pressure.js dg-anvil/tests/pressure/planning.pressure.js` - exit 0 (Stage 0 and Stage 1 pressure tests still pass).
28. `test -f dg-anvil/docs/ledger-examples/good/.gitkeep` - exit 0 (Stage 0 sentinel exists and is removed by Task 3.9).
29. `test -f dg-anvil/docs/ledger-examples/bad/.gitkeep` - exit 0 (Stage 0 sentinel exists and is removed by Task 3.9).
30. `command -v python3 >/dev/null || command -v python >/dev/null` - exit 0 (Python available for `fixture-repo-python` loop test and the Python Wired-probe support added in Task 3.3).
31. `command -v git >/dev/null` - exit 0 (git on PATH; worktree creation depends on it).

If any check fails, stop without writing any file.

## Phased Tasks

### Task 3.1: Finalize the ledger schema

#### Goal

Finalize `cli/ledger-schema.json` from the Stage 0 frozen draft. Every field named in `reports/Anvil-Design/06_The_Ledger.md` "What a lesson is" is a schema property with the type implied by context; `contract_gap`, `evidence`, `remediation` are required non-null objects with required non-empty subfields; `supersedes` and `superseded_by` are schematized; `hit_count` and `prevented_count` are integers with a zero floor.

#### Inputs

- `reports/Anvil-Design/06_The_Ledger.md` "What a lesson is"; "How the Ledger is written"; "Pruning and supersession"; "Failure modes the Ledger itself could exhibit".
- `reports/DG-Anvil/00_Architecture.md` Section 5 (Schema files and version labels; Schema versioning rules; Schema authoring source), Section 6 (Invariants 7, 15).
- `dg-anvil/cli/ledger-schema.json` (Stage 0 frozen draft).

#### Outputs

- `dg-anvil/cli/ledger-schema.json`
  - Retains `$schema: https://json-schema.org/draft/2020-12/schema` and `$id: https://dg-anvil/schemas/ledger-schema.json`.
  - Top-level `type: object`; `additionalProperties: true` at the top level (ledger is backward-compatible forever; new fields allowed; removed fields forbidden).
  - Required top-level fields: `anvil_ledger_entry_version`, `id`, `created`, `pattern`, `intent_shape`, `contract_gap`, `evidence`, `remediation`.
  - `anvil_ledger_entry_version: {type: 'integer', const: 1}`.
  - `id: {type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}-\\d{3}$'}` (date plus three-digit sequence, per the canonical example in `06_The_Ledger.md`).
  - `created: {type: 'string', format: 'date-time'}`.
  - `pattern: {type: 'array', minItems: 1, items: {type: 'string', minLength: 1}}`.
  - `intent_shape: {type: 'string', minLength: 1}`.
  - `contract_gap: {type: 'object', required: ['level', 'criterion', 'was', 'should_have_been'], properties: {level: {type: 'string', enum: ['exists', 'substantive', 'wired', 'functional', 'invariant']}, criterion: {type: 'string', minLength: 1}, was: {type: 'string', minLength: 1}, should_have_been: {type: 'string', minLength: 1}}, additionalProperties: false}`.
  - `evidence: {type: 'object', required: ['verify_output', 'diagnostic'], properties: {verify_output: {type: 'string', minLength: 1}, diagnostic: {type: 'string', minLength: 1}}, additionalProperties: false}`.
  - `remediation: {type: 'object', required: ['contract_patch', 'counter_example_text'], properties: {contract_patch: {type: 'string', minLength: 1}, counter_example_text: {type: 'string', minLength: 1}}, additionalProperties: false}`.
  - `hit_count: {type: 'integer', minimum: 0, default: 0}` (optional; absent means zero).
  - `prevented_count: {type: 'integer', minimum: 0, default: 0}` (optional; absent means zero).
  - `supersedes: {type: 'array', items: {type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}-\\d{3}$'}}` (optional; referenced ids must exist in the ledger at write time, enforced by the validator in Task 3.2, not the schema).
  - `superseded_by: {type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}-\\d{3}$'}` (optional; indicates this lesson has been superseded by a newer lesson id).
  - `low_efficacy: {type: 'boolean'}` (optional; set by `anvil ledger audit` for effect-size retirement).
  - `kind: {type: 'string', enum: ['reset', 'aborted']}` (optional; defaults to `reset` when absent; aborted-lesson entries come from `/abort` and are written by Task 3.8).
  - File parses as valid JSON; `jq empty` exits 0.

#### Decisions already made

- Schema file is `cli/ledger-schema.json`; version label per entry `anvil_ledger_entry_version: 1`. (source: 00_Architecture.md Section 5 Schema files and version labels)
- Canonical shape source is `reports/Anvil-Design/06_The_Ledger.md` "What a lesson is" section. (source: 00_Architecture.md Section 5 Schema authoring source)
- Ledger is backward-compatible forever; new fields allowed; removed fields forbidden. (source: 00_Architecture.md Section 5 Schema versioning rules; 06_The_Ledger.md "What the Ledger is")
- Null-lesson prohibition: `contract_gap`, `evidence`, `remediation` must not be null or empty. Schema declares them as required with non-empty subfield requirements; code in `cli/lib/ledger-write.js` enforces the emptiness rule (Task 3.2). (source: 00_Architecture.md Section 6 Invariant 15; 06_The_Ledger.md "How the Ledger is written")
- Supersession marks a lesson; never deletes. (source: 06_The_Ledger.md "Pruning and supersession")
- Effect-size retirement flags `low_efficacy`; never deletes. (source: 06_The_Ledger.md "Pruning and supersession")
- Aborted-lesson kind distinguishes `/abort` entries from reset entries. (source: 04_Anatomy.md Five slash commands table; `/abort` row)
- Any schema change from the Stage 0 frozen draft is paired with a `ledger-migrate` CLI subcommand. Task 3.7 wires that subcommand. (source: 00_Architecture.md Section 5 Schema versioning rules; Invariant 7)

#### Tests or fixtures

- `tests/unit/ledger.test.js` (Task 3.4, extending Stage 1's) asserts the schema validates every fixture in `docs/ledger-examples/good/` and rejects every fixture in `docs/ledger-examples/bad/`.

#### Verification command

```
jq -e '.properties.anvil_ledger_entry_version.const == 1 and (.required | index("contract_gap")) and (.required | index("evidence")) and (.required | index("remediation")) and .properties.contract_gap.required and .properties.evidence.required and .properties.remediation.required and (.additionalProperties == true)' dg-anvil/cli/ledger-schema.json
```

Expected exit 0.

#### Done when

`cli/ledger-schema.json` validates, names `contract_gap`, `evidence`, `remediation` as required top-level fields with required non-empty subfields, allows additional top-level properties for backward compatibility, schematizes supersession, and declares the `kind` enum.

### Task 3.2: Author the ledger write path

#### Goal

Ship `cli/lib/ledger-write.js` as the only writer of `~/.anvil/ledger.jsonl` (per Invariant 17). Append-only JSONL. Maintains `~/.anvil/ledger.index.json` on every write. Validates every lesson against `cli/ledger-schema.json`. Rejects null lessons (per Invariant 15).

#### Inputs

- `reports/Anvil-Design/06_The_Ledger.md` (all sections; canonical lesson shape; index behaviour; supersession; effect-size retirement).
- `reports/DG-Anvil/00_Architecture.md` Section 3 (Error format), Section 5 (Schema authoring source for Ledger), Section 6 (Invariants 5, 7, 11, 15, 17).
- `dg-anvil/cli/ledger-schema.json` (from Task 3.1).
- `dg-anvil/cli/lib/ledger.js` (Stage 1 read path; `append` currently throws `E_NOT_IMPLEMENTED`).
- `dg-anvil/cli/lib/errors.js`.
- `dg-anvil/cli/lib/io.js`, `dg-anvil/cli/lib/yaml.js`.

#### Outputs

- `dg-anvil/cli/lib/ledger-write.js`
  - Exports `append(lesson, {ledgerPath, indexPath})` that:
    1. Validates `lesson` against `cli/ledger-schema.json` using a hand-written schema validator (identical shape and rules to the validator in `cli/lib/contract.js`). Raises `E_INVALID_LESSON` on any schema violation with `details = {rule, path, expected, actual}`.
    2. Enforces the null-lesson prohibition: if `lesson.contract_gap.was`, `lesson.contract_gap.should_have_been`, `lesson.evidence.verify_output`, `lesson.evidence.diagnostic`, `lesson.remediation.contract_patch`, or `lesson.remediation.counter_example_text` is empty, null, or whitespace-only, raises `E_NULL_LESSON` with `details = {field, reason}`.
    3. If `lesson.supersedes` is present, loads the current ledger and confirms every id in `lesson.supersedes` refers to an existing entry; raises `E_INVALID_SUPERSESSION` on a missing referent with `details = {missing_ids}`.
    4. Opens `~/.anvil/ledger.jsonl` for append via `fs.openSync(..., 'a')`; writes `JSON.stringify(lesson) + '\n'`; calls `fs.fsyncSync(fd)` before closing so a crash cannot leave a torn line (append-only durability).
    5. Updates `~/.anvil/ledger.index.json`: reads the file via `cli/lib/io.js` `readFileUtf8` (empty object if missing), for each `pattern` tag appends `lesson.id` to `index[tag]` (creating the array if absent), writes back via `cli/lib/io.js` `writeFileUtf8`. If the write fails after the JSONL append, the error is captured and the inconsistency is surfaced as a structured error `E_INDEX_DESYNC` with `details = {lesson_id, patterns, cause}`; the lesson record in the JSONL is not retracted (append-only).
    6. If `lesson.supersedes` is present, opens the referenced entries in the ledger and writes a new entry marking each old entry's id with `superseded_by: lesson.id`; the supersession chain is realized by appending a minimal supersession-pointer entry (since the JSONL is append-only, the old record is not rewritten in place; readers merge supersession pointers at load time).
    7. Returns `{id, appendedAt: ISO-8601, patternsIndexed: string[]}` on success.
  - Exports `appendAbortedLesson({reason, taskId, contract, runId}, {ledgerPath, indexPath})` that:
    - Produces a lesson object with `kind: 'aborted'`, `contract_gap.level: 'invariant'`, `contract_gap.criterion: '/abort'`, `contract_gap.was: reason`, `contract_gap.should_have_been: 'session did not converge'`, `evidence.verify_output: '<aborted by user>'`, `evidence.diagnostic: <abort-reason>`, `remediation.contract_patch: '<none; abort>'`, `remediation.counter_example_text: <abort-reason>`, `pattern: ['aborted', taskId or 'no-task']`, `intent_shape: <contract.source_intent or 'no-contract'>`, `id: <allocated via allocateId>`, `created: <ISO-8601>`.
    - Calls `append` with the produced lesson. Aborted lessons bypass no validation; they must carry non-null values for every required field.
  - Exports `allocateId({ledgerPath, date})` that scans the ledger for existing ids on the given date (default today, UTC) and returns the next id `<YYYY-MM-DD>-<NNN>` where NNN is the smallest three-digit integer not yet taken.
  - Exports `updateIndex({ledgerPath, indexPath})` that rebuilds `~/.anvil/ledger.index.json` from scratch by scanning the JSONL. Used by `anvil ledger audit` (Task 3.7) and by recovery tests.
  - Exports `markLowEfficacy({id, ledgerPath, indexPath})` that appends a low-efficacy marker entry for `id`; the read path in `cli/lib/ledger.js` merges markers at load time so `query` skips low-efficacy entries unless `include_retired: true`.
  - Path handling: the literal string `~/.anvil/ledger.jsonl` appears ONLY in this file as the default path resolution (per Invariant 17). All default paths are composed at module-load time as `DEFAULT_LEDGER_PATH = path.join(os.homedir(), '.anvil', 'ledger.jsonl')` and `DEFAULT_INDEX_PATH = path.join(os.homedir(), '.anvil', 'ledger.index.json')`. Callers pass explicit paths in tests.
  - Adds error codes `E_NULL_LESSON`, `E_INVALID_LESSON`, `E_INVALID_SUPERSESSION`, `E_INDEX_DESYNC` to `cli/lib/errors.js` in one edit (append to the frozen `CODES` object, re-freeze).
  - Imports only from `fs`, `path`, `os`, `cli/lib/errors.js`, `cli/lib/io.js`.
  - No `TODO`, `FIXME`, `XXX`, `HACK`, `TBD`, `WIP`, `NOTE:` markers.

- `dg-anvil/cli/lib/ledger.js` (extended)
  - `append(lesson, options)` now delegates to `require('./ledger-write.js').append(lesson, options)` (removing the Stage 1 `E_NOT_IMPLEMENTED` throw).
  - `updateIndex(options)` now delegates to `require('./ledger-write.js').updateIndex(options)`.
  - `load({ledgerPath, indexPath})` is updated to merge supersession-pointer entries: when the JSONL contains a supersession marker, the target id's effective record has `superseded_by` populated.
  - `query(pattern, {ledgerPath, indexPath, limit, include_superseded, include_retired})` honours `include_superseded` (default `false`; superseded lessons are skipped unless explicit) and `include_retired` (default `false`; low-efficacy lessons are skipped unless explicit), per `06_The_Ledger.md` "Pruning and supersession".
  - The read path does NOT contain the literal `~/.anvil/ledger.jsonl`; it composes via `os.homedir()` + `path.join` as established in Stage 1 Task 1.9. The write path's literal in `ledger-write.js` is the single-writer anchor.

- `dg-anvil/cli/lib/errors.js`
  - Append `E_NULL_LESSON: 'E_NULL_LESSON'`, `E_INVALID_LESSON: 'E_INVALID_LESSON'`, `E_INVALID_SUPERSESSION: 'E_INVALID_SUPERSESSION'`, `E_INDEX_DESYNC: 'E_INDEX_DESYNC'`, `E_COURT_INPUT_VIOLATION: 'E_COURT_INPUT_VIOLATION'`, `E_INVALID_VERDICT: 'E_INVALID_VERDICT'`, `E_RESET_REFUSED: 'E_RESET_REFUSED'`, `E_ABORT_REASON_REQUIRED: 'E_ABORT_REASON_REQUIRED'` to the frozen `CODES` object.
  - Re-freeze. The four court and reset and abort codes are added here so the module's single edit captures every Stage 3 addition. `E_COURT_INPUT_VIOLATION` is consumed by Task 3.5; `E_INVALID_VERDICT` is consumed by Task 3.5; `E_RESET_REFUSED` is consumed by Tasks 3.10 and 3.12; `E_ABORT_REASON_REQUIRED` is consumed by Task 3.8.

#### Decisions already made

- Only `cli/lib/ledger-write.js` may append to `~/.anvil/ledger.jsonl` (single-writer). (source: 00_Architecture.md Section 6 Invariant 17; 06_The_Ledger.md "How the Ledger is written")
- Append-only JSONL. (source: 06_The_Ledger.md "What the Ledger is"; 00_Architecture.md Section 4 Stage 3 produces row)
- Index is maintained on every write; `~/.anvil/ledger.index.json` maps pattern -> list of lesson ids. (source: 06_The_Ledger.md "What the Ledger is"; 00_Architecture.md Section 4 Stage 3 produces row)
- Null-lesson prohibition: `contract_gap`, `evidence`, `remediation` non-null and non-empty. A failed reset that cannot produce a non-null lesson escalates. (source: 00_Architecture.md Section 6 Invariant 15; 06_The_Ledger.md "How the Ledger is written"; 02_Design_Thesis.md architectural consequence 4; 10_Anti-Patterns_Defeated.md row 20)
- Supersession marks; never deletes. (source: 06_The_Ledger.md "Pruning and supersession")
- Effect-size retirement flags `low_efficacy`; never deletes. (source: 06_The_Ledger.md "Pruning and supersession")
- Aborted-lesson kind distinguishes `/abort` entries from reset entries. (source: 04_Anatomy.md Five slash commands table; `/abort` row)
- Error codes are stable strings defined in `cli/lib/errors.js`; additions are additive and must be registered when introduced. (source: 00_Architecture.md Section 3 Error format)
- Zero runtime dependencies; hand-written schema validator. (source: 00_Architecture.md Section 3 Runtime; Invariant 11)
- `fs.fsyncSync` after append so the JSONL cannot be torn by a process crash. (source: 06_The_Ledger.md "What the Ledger is" "Mutability: append-only")
- The literal path `~/.anvil/ledger.jsonl` appears only in `cli/lib/ledger-write.js`. (source: 00_Architecture.md Section 6 Invariant 17)

#### Tests or fixtures

- `tests/unit/ledger.test.js` (Task 3.4) extends Stage 1's coverage with the write-path tests.
- `docs/ledger-examples/good/*.jsonl` and `docs/ledger-examples/bad/*.jsonl` (Task 3.9) are exercised by the unit test.

#### Verification command

```
node -e "const w=require('./dg-anvil/cli/lib/ledger-write.js'); for(const f of ['append','appendAbortedLesson','allocateId','updateIndex','markLowEfficacy']){if(typeof w[f]!=='function'){process.exit(1)}}; const e=require('./dg-anvil/cli/lib/errors.js'); for(const k of ['E_NULL_LESSON','E_INVALID_LESSON','E_INVALID_SUPERSESSION','E_INDEX_DESYNC']){if(e.CODES[k]!==k){process.exit(1)}}"
```

Expected exit 0.

#### Done when

`cli/lib/ledger-write.js` exports `append`, `appendAbortedLesson`, `allocateId`, `updateIndex`, `markLowEfficacy`; every append validates against `cli/ledger-schema.json`; null lessons are rejected with `E_NULL_LESSON`; invalid supersession is rejected with `E_INVALID_SUPERSESSION`; the index is maintained on every write; `cli/lib/ledger.js` delegates `append` and `updateIndex` to this module; the literal `~/.anvil/ledger.jsonl` appears only in this file.

### Task 3.3: Extend the verifier for Python support

#### Goal

Extend `cli/lib/verifier.js` (originally authored in Stage 2 for JavaScript only) to add Python support to the Wired probe, the Substantive probe coverage tooling (via `coverage.py`), and the Functional probe runner (via `pytest` or `python -m unittest`). JavaScript behaviour is unchanged. This task is the Wired-probe language rollout named in `00_Architecture.md` Section 3 "Wired-probe language support" for Stage 3.

#### Inputs

- `reports/DG-Anvil/00_Architecture.md` Section 3 "Wired-probe language support"; "Coverage tooling".
- `reports/Anvil-Design/05_The_Contract.md` "Wired verification - the silent orphan fix"; "Substantive verification - the hard one"; "Functional".
- `dg-anvil/cli/lib/verifier.js` (Stage 2 Task 2.6 JavaScript implementation).
- `dg-anvil/cli/lib/io.js`, `dg-anvil/cli/lib/errors.js`.

#### Outputs

- `dg-anvil/cli/lib/verifier.js` (extended)
  - Language dispatch: the module detects the target source language from the criterion's `exists.file` extension (`.js`, `.mjs`, `.cjs` -> JavaScript; `.py` -> Python; anything else -> `E_UNSUPPORTED_LANGUAGE`). The language support set at Stage 3 is `['javascript', 'python']` exactly; Go lands in Stage 4.
  - `probeWired({worktreePath, criterion})` extended: when the target is Python, the walker implements a minimal recursive-descent identifier-extractor that reads the file, strips Python comments (`#`), strips string literals, and scans for the pattern `<symbol>(` where `<symbol>` is `criterion.wired.call_site.must_contain_symbol`. The walker respects the contract's `line_range` if present. Zero external dependencies (no `ast` import, no `jedi`; pure string scanning with language-specific comment and string rules).
  - Python walker edge-case rules (explicit; the walker honours all four unconditionally):
    (a) Triple-quoted strings (`"""..."""` and `'''...'''`) are stripped before scanning; a symbol mention inside a multi-line string literal is not counted as a call.
    (b) Raw string prefixes (`r"..."`, `b"..."`, `f"..."`, and combinations) are stripped correctly; the walker tracks the prefix and the opening/closing quote sequence together.
    (c) Single-line comments (`#`) are stripped; a `#` inside a string literal is treated as literal text, not a comment.
    (d) The symbol name appearing inside a docstring (a triple-quoted string that is the first statement of a function or class body) does not count as a call; docstrings are stripped by the same rule as (a).
  - Paired Python unit-test cases (added in the Task 3.3 unit-test extension in `tests/unit/verifier.test.js`): (1) a fixture where the target symbol appears inside a triple-quoted docstring and the walker must NOT count it as a call; (2) a fixture with an `r"..."` raw string containing the target symbol where the walker correctly tracks the raw-string prefix; (3) a fixture with the target symbol inside a `#` single-line comment where the walker strips the comment before scanning.
  - Source for edge-case rules: the Python Language Reference sections on string literals (including triple-quoted and string prefixes), comments, and documentation strings.
  - `probeSubstantive({worktreePath, criterion, diffPath, toolOutputPath})` extended: when the target is Python, the coverage path invokes `python -m coverage run --include=<target-file> -- <runner> <args>` via `io.spawn`. If `python` or `python3` is not on PATH, returns `E_UNSUPPORTED_LANGUAGE` (not `E_COVERAGE_UNAVAILABLE`; the interpreter itself is missing). If Python is available but `coverage.py` is not importable (detected by a preflight `python -c "import coverage"` spawn that exits non-zero), returns `E_COVERAGE_UNAVAILABLE` with `details = {language: 'python', reason: 'coverage.py not installed'}`. The plugin does not install `coverage.py` for the user.
  - `probeFunctional({worktreePath, criterion})` extended: the runner schema gains two entries for Python: `pytest` (invoked as `pytest <target>` with JUnit-XML output parsed for `must_pass` name matching) and `python -m unittest` (invoked as `python -m unittest <target>` with line-based output parsed for `OK` or `FAILED` plus `must_pass` names). The runner argument shape is declared at the top of the module. When `criterion.functional.probe.runner` is a Python runner, the `target` is resolved relative to `worktreePath` and the spawn path uses `io.spawn` with the argument array.
  - `evaluateInvariants({worktreePath, contract, diffPath})` unchanged in function shape; the four invariant checkers (`no_new_dependencies`, `public_api_unchanged`, `coverage.new_code_minimum`, `no_secret_patterns`) are language-aware only where their content requires: `no_new_dependencies` reads `package.json` for JavaScript and `pyproject.toml` / `requirements.txt` for Python; `public_api_unchanged` uses the same symbol-declaration regex family as `probeExists`, now Python-aware.
  - The language-support version constant is exported: `SUPPORTED_LANGUAGES = Object.freeze(['javascript', 'python'])`. Stage 4 appends `'go'`.
  - No `TODO`, `FIXME`, `XXX`, `HACK`, `TBD`, `WIP`, `NOTE:` markers. No persona phrasing.

#### Decisions already made

- Stage 3 ships Python Wired-probe support; `fixture-repo-python` is the reference fixture. (source: 00_Architecture.md Section 3 "Wired-probe language support")
- Python coverage tooling: `coverage.py` invoked via `python -m coverage run ...`. (source: 00_Architecture.md Section 3 "Coverage tooling")
- If `coverage.py` is not installed in the target repository's Python environment, Substantive emits `E_COVERAGE_UNAVAILABLE` and the criterion fails; the plugin does not install it. (source: 00_Architecture.md Section 3 "Coverage tooling")
- A Wired probe invoked against a language not yet supported by the current stage returns `E_UNSUPPORTED_LANGUAGE` - this applies only when no language support exists for the target. With Python supported in Stage 3, only Go fixtures would return `E_UNSUPPORTED_LANGUAGE` until Stage 4. (source: 00_Architecture.md Section 3 "Wired-probe language support")
- Zero runtime dependencies; no external AST parsers. (source: 00_Architecture.md Section 3 Runtime; Invariant 11)
- The Wired probe's authority is the presence of a call expression inside the named file's line range; the walker is minimal and not a compiler. (source: 05_The_Contract.md "Wired verification"; stage_2_execute_and_verify.md Task 2.6)
- `python -m coverage run` is invoked via `io.spawn` with an argument array; no shell interpolation. (source: 00_Architecture.md Section 3 Subprocess invocation)

#### Tests or fixtures

- `tests/unit/verifier.test.js` (Stage 2) is extended in this task with Python positive and negative cases for each of the four probe functions plus the invariants evaluator. The new cases use `fs.mkdtempSync` to build a disposable Python source file and runner; the test skips on hosts without Python via a preflight `command -v python3` check and records the skip as structured output (not a silent pass).
- `tests/loop/fixture-repo-python/` (Task 3.11) is the integration-level exercise.

#### Verification command

```
node -e "const v=require('./dg-anvil/cli/lib/verifier.js'); if(!Array.isArray(v.SUPPORTED_LANGUAGES)||!v.SUPPORTED_LANGUAGES.includes('javascript')||!v.SUPPORTED_LANGUAGES.includes('python')){process.exit(1)}; if(!Object.isFrozen(v.SUPPORTED_LANGUAGES)){process.exit(1)}"
```

Expected exit 0.

#### Done when

`cli/lib/verifier.js` exports `SUPPORTED_LANGUAGES` frozen at `['javascript', 'python']`; every probe dispatches on the criterion's target extension; Python coverage is invoked via `python -m coverage run` and returns `E_COVERAGE_UNAVAILABLE` when `coverage.py` is absent; `pytest` and `python -m unittest` runner shapes are declared; `tests/unit/verifier.test.js` runs green on hosts where Python is installed and records a structured skip on hosts where it is not.

### Task 3.4: Extend the ledger unit test with write-path coverage

#### Goal

Extend `tests/unit/ledger.test.js` (originally authored in Stage 1 for the read path) to cover the write path: schema validation, null-lesson rejection, index maintenance round-trip, supersession chain, effect-size retirement, and the aborted-lesson kind.

#### Inputs

- `reports/DG-Anvil/00_Architecture.md` Section 7 (Test tiers), Section 6 (Invariants 15, 17).
- `reports/Anvil-Design/06_The_Ledger.md` (all sections).
- `dg-anvil/cli/lib/ledger-write.js` (from Task 3.2).
- `dg-anvil/cli/lib/ledger.js` (extended in Task 3.2).
- `dg-anvil/cli/ledger-schema.json` (from Task 3.1).
- `dg-anvil/docs/ledger-examples/good/` and `bad/` fixtures (Task 3.9).
- `dg-anvil/tests/unit/ledger.test.js` (Stage 1 Task 1.9 read-path test).

#### Outputs

- `dg-anvil/tests/unit/ledger.test.js` (extended)
  - Retains every Stage 1 read-path test unchanged.
  - Adds a `setup()` helper: creates a temp directory via `fs.mkdtempSync`, composes `ledgerPath` and `indexPath` under it, and returns the paths for each test.
  - Positive write tests:
    - `append(valid lesson)` writes one line to the JSONL, updates the index (each pattern tag maps to `[lesson.id]`), and returns `{id, appendedAt, patternsIndexed}`.
    - `append` called twice with the same pattern merges both ids into the index array.
    - `allocateId({ledgerPath, date: '2026-04-15'})` returns `2026-04-15-001` on an empty ledger; a subsequent call returns `2026-04-15-002`.
    - Supersession: `append(lesson2 with supersedes: [lesson1.id])` succeeds when `lesson1.id` already exists; subsequent `query(pattern, {include_superseded: false})` returns only `lesson2`; `query(pattern, {include_superseded: true})` returns both.
    - Effect-size retirement: `markLowEfficacy({id: lesson1.id, ledgerPath, indexPath})` marks the entry; `query` with default options skips it; `query` with `include_retired: true` returns it.
    - `appendAbortedLesson({reason: 'user aborted test', taskId: 'T0', contract: <stub>, runId: 'r-abcd1234'})` writes an aborted-kind entry; `query` retrieves it by the `'aborted'` pattern tag.
    - `updateIndex` on a JSONL with three lessons produces an index whose pattern arrays match every pattern tag on every lesson.
  - Negative write tests:
    - `append(lesson with empty contract_gap.was)` throws `E_NULL_LESSON` with `details.field = 'contract_gap.was'`.
    - `append(lesson with empty remediation.counter_example_text)` throws `E_NULL_LESSON`.
    - `append(lesson without anvil_ledger_entry_version)` throws `E_INVALID_LESSON` with `details.rule` naming the missing version rule.
    - `append(lesson with anvil_ledger_entry_version: 2)` throws `E_INVALID_LESSON` (wrong version).
    - `append(lesson with malformed pattern: [])` throws `E_INVALID_LESSON` (empty pattern array violates schema `minItems: 1`).
    - `append(lesson with supersedes: ['9999-99-99-999'])` throws `E_INVALID_SUPERSESSION` when the referent does not exist.
    - `appendAbortedLesson({reason: ''})` throws `E_NULL_LESSON` (empty reason is null-lesson equivalent on the aborted path).
  - Fixture round-trip tests:
    - For every file in `docs/ledger-examples/good/`: asserts `append(JSON.parse(contents))` succeeds.
    - For every file in `docs/ledger-examples/bad/`: reads the paired `.meta.json` for the expected error code and rejection rule; asserts `append(JSON.parse(contents))` throws with matching `code`.
  - Single-writer discipline assertion: the test greps `cli/lib/` source files for the literal `~/.anvil/ledger.jsonl` and asserts it appears only in `cli/lib/ledger-write.js` (the path literal count must equal 1 across all `.js` files).
  - `teardown()`: removes the temp directory.
  - CommonJS.

#### Decisions already made

- Unit tests are paired one-to-one with `cli/lib/<module>.js`; every exported function has at least one positive and one negative test; rejection rules have dedicated tests. (source: 00_Architecture.md Section 7 Test tiers)
- Fixture tests load every good fixture and assert acceptance, load every bad fixture and assert rejection with the expected error code. (source: 00_Architecture.md Section 7 Fixture discipline)
- Single-writer discipline for the ledger is asserted structurally by the path-literal count test. (source: 00_Architecture.md Section 6 Invariant 17)
- Null-lesson prohibition is asserted by the `E_NULL_LESSON` negative cases. (source: 00_Architecture.md Section 6 Invariant 15)
- Supersession and effect-size retirement are exercised end-to-end through `append`, `query`, and `markLowEfficacy`. (source: 06_The_Ledger.md "Pruning and supersession")

#### Tests or fixtures

- Self-contained plus the fixture files produced in Task 3.9.

#### Verification command

```
node --test dg-anvil/tests/unit/ledger.test.js
```

Expected exit 0.

#### Done when

`tests/unit/ledger.test.js` runs green against `cli/lib/ledger-write.js` and the extended `cli/lib/ledger.js`; every exported write-path function has at least one positive and one negative test; every `docs/ledger-examples/bad/` fixture is rejected with its expected code; the single-writer path-literal assertion passes.

### Task 3.5: Author the Court module

#### Goal

Ship `cli/lib/court.js` as the Court dispatcher: a fresh subagent per task (after Verify), two passes in fixed order (Pass 1 Spec compliance then Pass 2 Code quality only if Pass 1 fully green), Devil's Advocate in parallel with Pass 1 on Medium or Low confidence Verify output. The module is STRUCTURALLY UNABLE (enforced in code per Invariant 14) to pass Plan, commit messages, Ledger, or prior Court verdicts to the Court subagent.

#### Inputs

- `reports/Anvil-Design/07_The_Court.md` (all sections; input isolation; two-pass order; Devil's Advocate; Court output format).
- `reports/Anvil-Design/02_Design_Thesis.md` architectural consequence 3 (Review must be adversarial and context-isolated).
- `reports/Anvil-Design/10_Anti-Patterns_Defeated.md` row 2 (Sycophantic convergence), row 3 (Mock tautology), row 4 (Scope creep).
- `reports/DG-Anvil/00_Architecture.md` Section 3 (Error format; Dispatcher identifiers), Section 6 (Invariants 3, 4, 5, 13, 14).
- `dg-anvil/cli/lib/contract.js`, `cli/lib/verifier.js`, `cli/lib/io.js`, `cli/lib/yaml.js`, `cli/lib/errors.js`.

#### Outputs

- `dg-anvil/cli/lib/court.js`
  - Exports `judge({taskId, contract, diff, verifyOutput, confidence, dispatcher})` where:
    - `taskId` is the string task id being judged.
    - `contract` is the parsed-and-validated contract object from `cli/lib/contract.js`.
    - `diff` is a string (the captured diff from the worktree, read by the caller).
    - `verifyOutput` is the structured `verifyAll` return value from `cli/lib/verifier.js`.
    - `confidence` is one of `'high' | 'medium' | 'low'` derived from the verifier's captured output (see below).
    - `dispatcher` is an injected function with signature `dispatch(briefing) -> Promise<{verdict}>`.
  - The STRUCTURAL INPUT ISOLATION (Invariant 14) is enforced as follows:
    - `judge` accepts ONLY the five named parameters above. It has no optional `plan`, `commitMessage`, `ledger`, `priorVerdicts`, or `rationale` parameter. The function signature is the structural firewall.
    - An internal helper `composeBriefing({taskId, contract, diff, verifyOutput})` constructs the Court subagent's briefing as a plain object whose keys are exactly `{task_id, contract, diff, verify_output}` and nothing else. `Object.freeze` is applied recursively before dispatch.
    - A static guard: the module exports a frozen array `ALLOWED_COURT_BRIEFING_KEYS = Object.freeze(['task_id', 'contract', 'diff', 'verify_output'])`. A runtime assertion inside `composeBriefing` verifies `Object.keys(briefing).sort().join(',') === ALLOWED_COURT_BRIEFING_KEYS.slice().sort().join(',')`; any mismatch throws `E_COURT_INPUT_VIOLATION` with `details = {extraneous_keys, missing_keys}`.
    - A second static guard: the module exports `FORBIDDEN_COURT_INPUT_KEYS = Object.freeze(['plan', 'commit_message', 'ledger', 'prior_verdicts', 'rationale', 'narration', 'implementer_reasoning'])`. Before dispatch, `composeBriefing` walks the briefing object recursively; if any key name (at any depth) matches an entry in `FORBIDDEN_COURT_INPUT_KEYS`, it throws `E_COURT_INPUT_VIOLATION` with `details = {forbidden_key, path}`.
  - Pass 1 (Spec compliance) dispatches the Court subagent with the briefing and the instruction constant:
    - `COURT_PASS_1_INSTRUCTION`: a plain-string instruction naming: for each criterion in the contract, confirm Exists was green by inspecting the diff; confirm Substantive was green by inspecting the diff for `must_implement` and `must_not`; confirm Wired was green by tracing the named call site in the diff; confirm Functional was green by reading the captured tool output for the probe command and the named tests. Return per-criterion verdict (`pass` | `fail` | `suspicious`) with exact line citations from the diff and exact string citations from the output. The instruction constant is persona-free (Invariant 4).
    - `COURT_PASS_1_INSTRUCTION` ENDS WITH the exact text: `"Return the verdict as block-style YAML matching the Court output format in 07_The_Court.md. Do not emit JSON. Do not use flow-style braces or brackets."`
  - Pass 2 (Code quality) dispatches the Court subagent ONLY if Pass 1 returns `all_criteria_pass === true`. Instruction constant `COURT_PASS_2_INSTRUCTION`: the question "would I merge this?" parameterized by the contract's check types; returns `merge` | `request-changes` | `request-clarification`. If Pass 1 has any fail or suspicious, Pass 2 is not dispatched and `judge` returns the Pass 1 verdict with `pass2: null`.
    - `COURT_PASS_2_INSTRUCTION` ENDS WITH the exact text: `"Return the verdict as block-style YAML matching the Court output format in 07_The_Court.md. Do not emit JSON. Do not use flow-style braces or brackets."`
  - Devil's Advocate: when `confidence === 'medium' || confidence === 'low'`, dispatches a second subagent IN PARALLEL with Pass 1 using `Promise.all([pass1Dispatch, devilsAdvocateDispatch])`. Instruction constant `DEVILS_ADVOCATE_INSTRUCTION`: "Find the reason this is wrong." The Devil's Advocate briefing is exactly the same three-input object plus nothing else. Its verdict is attached as a confidence modifier on the Pass 1 result: if the Devil's Advocate returns non-empty findings, the Pass 1 verdict is upgraded to carry `suspicious: true` on every criterion that Pass 1 marked pass but the Devil's Advocate flagged; Pass 2 (when it runs) treats all `request-clarification` outputs as `request-changes` under the suspicious tag. Devil's Advocate cannot veto: its findings modify but do not replace Pass 1's verdicts.
    - `DEVILS_ADVOCATE_INSTRUCTION` ENDS WITH the exact text: `"Return the verdict as block-style YAML matching the Court output format in 07_The_Court.md. Do not emit JSON. Do not use flow-style braces or brackets."`
  - Confidence derivation: the module exports `deriveConfidence(verifyOutput)` that returns `'low'` if any criterion's substantive `evidence.diagnostic` (from the verifier's captured output) is empty OR if coverage delta is zero OR if runner stderr contains strings from `SUSPICIOUS_STDERR_TOKENS = Object.freeze(['warning', 'skipped', 'deprecation', 'placeholder'])`; `'medium'` if only one of these signals is present; `'high'` otherwise. The token list is closed at Stage 3 scope; additions require an architecture update.
  - Parses the subagent's returned YAML verdict via `cli/lib/yaml.js` `parse`; asserts the parsed verdict matches the Court output format shape in `07_The_Court.md` (`court_verdict.task`, `.pass`, `.result`, `.findings[]` each with `criterion`, `level`, `verdict`, `evidence_cited`, `output_cited`, `reason`, `suspicious`; `.recommendation.action`, `.recommendation.diagnose_target`). Unevidenced findings (empty `evidence_cited` or empty `output_cited`) are rejected at the output-parse step: throw `E_INVALID_VERDICT` with `details = {finding_index, missing_field}`. This matches `07_The_Court.md` "Every finding must cite the diff line and the output string. Unevidenced findings are rejected at the output-parse step - the Court cannot hand-wave."
  - Mapping: Pass 2 `request-clarification` maps to escalation (the caller marks the task status `escalated`, per `00_Architecture.md` Section 3 Runtime state file shape). Pass 2 `request-changes` maps to reset (the caller invokes the `resetting` skill). Pass 2 `merge` maps to pass.
  - Returns a structured result `{taskId, pass1: {criteria: [...], all_criteria_pass}, pass2: null | {result, reason}, devilsAdvocate: null | {findings: [...]}, confidence, recommendation: {action: 'reset' | 'escalate' | 'merge', diagnose_target?}}`.
  - Fresh-subagent discipline (Invariant 13): the module carries no module-level mutable state across calls. `MUTABLE_STATE = Object.freeze({})` is exported for structural assertion. Every dispatch freezes the briefing.
  - The dispatcher identifier for the Court is the same `anvil_subagent` vs `stub` set as the executor (per `00_Architecture.md` Section 3 "Dispatcher identifiers"). Unknown identifiers throw `E_UNKNOWN_DISPATCHER`. The live dispatch path is wired in Stage 4 along with the executor; Stage 3 uses the `stub` dispatcher for tests and the stubbed `anvil_subagent` for the fixture-repo-python loop test.
  - Imports only from `crypto`, `cli/lib/io.js`, `cli/lib/yaml.js`, `cli/lib/errors.js`. Does NOT import `cli/lib/plan.js`, `cli/lib/ledger.js`, `cli/lib/ledger-write.js` (structural enforcement: the module has no access surface to Plan or Ledger).
  - No `TODO`, `FIXME`, `XXX`, `HACK`, `TBD`, `WIP`, `NOTE:` markers. No persona phrasing in any string constant.

#### Decisions already made

- Court has exactly three inputs: active Contract, diff, captured Verify output. (source: 07_The_Court.md "What the Court is"; 02_Design_Thesis.md architectural consequence 3)
- Court does NOT receive: Plan, Ledger, implementer commit message, implementer reasoning, prior Court verdict on sibling tasks. (source: 07_The_Court.md "What the Court is"; "Why the Court cannot see the Ledger"; "Why the Court cannot see the Plan")
- Two passes in fixed order: Pass 1 Spec compliance first; Pass 2 Code quality only if Pass 1 fully green. (source: 07_The_Court.md "Two passes in fixed order"; "Why spec first, quality second")
- Pass 1 per-criterion verdict: pass | fail | suspicious with line and output citations. (source: 07_The_Court.md "Pass 1 - Spec compliance")
- Pass 2 output: merge | request-changes | request-clarification. Request-clarification surfaces to escalation. (source: 07_The_Court.md "Pass 2 - Code quality")
- Devil's Advocate runs in parallel with Pass 1 on Medium or Low confidence; is a confidence modifier, not a vetoer; upgrades suspicion tagging. (source: 07_The_Court.md "The Devil's Advocate subagent")
- Input isolation enforced STRUCTURALLY in code, not in prose. (source: 00_Architecture.md Section 6 Invariant 14)
- Every finding must cite the diff line and the output string; unevidenced findings are rejected at parse. (source: 07_The_Court.md "Court output format")
- No persona phrasing. (source: 00_Architecture.md Section 6 Invariant 4; 07_The_Court.md "Why the Court is not a persona")
- Fresh-subagent discipline (Invariant 13) applies: no module-level state across calls; briefings are frozen before dispatch. (source: 00_Architecture.md Section 6 Invariant 13)
- Dispatcher identifier set is fixed: `anvil_subagent` and `stub` only; unknown identifiers return `E_UNKNOWN_DISPATCHER`. The live `anvil_subagent` dispatch wires in Stage 4. (source: 00_Architecture.md Section 3 "Dispatcher identifiers")
- Whole-branch Court is Stage 4; Stage 3 ships per-task Court only. (source: 00_Architecture.md Section 8 Stage 3 out-of-scope; 11_Implementation_Plan.md Stage 4)
- Court instruction constants end with an explicit block-style YAML demand. Without this, live Court dispatch throws `E_INVALID_YAML` at parse because LLMs default to JSON. (source: 00_Architecture.md Section 3 YAML subset; 07_The_Court.md Court output format)

#### Tests or fixtures

- `tests/unit/court.test.js` (Task 3.6) exercises the structural input-isolation guards, two-pass logic, Devil's Advocate parallel dispatch, and the suspicious-tag upgrade path.
- `tests/unit/court.test.js` asserts each of the three instruction constants contains the substring `block-style YAML`.

#### Verification command

```
node -e "const c=require('./dg-anvil/cli/lib/court.js'); for(const f of ['judge','composeBriefing','deriveConfidence']){if(typeof c[f]!=='function'){process.exit(1)}}; for(const k of ['ALLOWED_COURT_BRIEFING_KEYS','FORBIDDEN_COURT_INPUT_KEYS','SUSPICIOUS_STDERR_TOKENS']){if(!Array.isArray(c[k])||!Object.isFrozen(c[k])){process.exit(1)}}; if(!Object.isFrozen(c.MUTABLE_STATE)||Object.keys(c.MUTABLE_STATE).length!==0){process.exit(1)}"
```

Expected exit 0.

#### Done when

`cli/lib/court.js` exports `judge` with a five-parameter signature that has no `plan`, `commitMessage`, `ledger`, `priorVerdicts`, or `rationale` parameter; `composeBriefing` throws `E_COURT_INPUT_VIOLATION` on any forbidden key; Pass 2 runs only if Pass 1 fully green; Devil's Advocate runs in parallel on medium or low confidence and upgrades suspicion tagging; module carries no mutable state; all constants are frozen; unevidenced findings throw `E_INVALID_VERDICT`.

### Task 3.6: Author the Court unit test

#### Goal

Ship `tests/unit/court.test.js` that exercises the structural input isolation guards (asserts the Court dispatch CANNOT be called with Plan, commit message, Ledger, or prior verdicts as inputs), the two-pass logic, the Devil's Advocate parallel dispatch, and the suspicious-tag upgrade path.

#### Inputs

- `reports/DG-Anvil/00_Architecture.md` Section 6 (Invariants 13, 14), Section 7 (Test tiers).
- `reports/Anvil-Design/07_The_Court.md`.
- `dg-anvil/cli/lib/court.js` (from Task 3.5).

#### Outputs

- `dg-anvil/tests/unit/court.test.js`
  - Uses `node:test` and `node:assert`.
  - Fixtures: a minimal contract (one criterion, all four levels populated; synthesised inline or loaded from `docs/contract-examples/good/rate-limit-001.yml`), a minimal diff string, a minimal verifyOutput object (from `verifier.verifyAll` shape).
  - Structural input-isolation tests (Invariant 14):
    - Asserts `judge.length === 1` (accepts exactly one argument object) and that passing `{taskId, contract, diff, verifyOutput, confidence, dispatcher, plan: {...}}` throws `E_COURT_INPUT_VIOLATION`. This is asserted by a test that attempts to spread an extra `plan` key into the argument object; the test asserts the thrown error's `details.forbidden_key === 'plan'`.
    - Asserts the same for `commit_message`, `ledger`, `prior_verdicts`, `rationale`, `narration`, `implementer_reasoning`. Each forbidden key has its own test.
    - Asserts the Court module file does NOT import `cli/lib/plan.js` or `cli/lib/ledger.js` or `cli/lib/ledger-write.js`. The test reads the source file via `fs.readFileSync` and greps for `require('./plan')`, `require('./ledger')`, `require('./ledger-write')`; each must return no match.
    - Asserts `ALLOWED_COURT_BRIEFING_KEYS` is exactly `['task_id', 'contract', 'diff', 'verify_output']` and is frozen.
    - Asserts `FORBIDDEN_COURT_INPUT_KEYS` includes every key named in `07_The_Court.md` "What the Court is": `plan`, `commit_message`, `ledger`, `prior_verdicts`, `rationale`.
  - Two-pass logic tests:
    - Stub dispatcher returns a Pass 1 verdict with every criterion `pass`. Assert `judge` returns with `pass2` non-null (Pass 2 was dispatched).
    - Stub dispatcher returns a Pass 1 verdict with one criterion `fail`. Assert `judge` returns with `pass2: null` (Pass 2 was NOT dispatched) and `recommendation.action === 'reset'`.
    - Stub dispatcher returns a Pass 1 verdict with one criterion `suspicious`. Assert `pass2: null` and `recommendation.action === 'escalate'` (suspicious is a fail requiring escalation tag, per `07_The_Court.md` Pass 1).
  - Devil's Advocate parallel dispatch tests:
    - `deriveConfidence` returns `'low'` for a verifyOutput with zero coverage delta; `'medium'` for a verifyOutput with one `SUSPICIOUS_STDERR_TOKEN` match; `'high'` for a clean verifyOutput.
    - When `confidence === 'low'` and the stub dispatcher records call order, assert both the Pass 1 dispatch and the Devil's Advocate dispatch were invoked. The test uses `Promise.all` timing via the stub's recorded timestamps to confirm parallel dispatch (both start timestamps within a tight window, not sequential).
    - Suspicious-tag upgrade: when Pass 1 returns all green and the Devil's Advocate returns a non-empty findings array with a specific criterion id, assert the Pass 1 verdict for that criterion has `suspicious: true` appended; Pass 2 runs and any `request-clarification` output is upgraded to `request-changes`.
  - Unevidenced verdict parse test:
    - Stub dispatcher returns a YAML verdict with a finding whose `evidence_cited` is empty. Assert `judge` throws `E_INVALID_VERDICT` with `details.missing_field === 'evidence_cited'`.
  - Fresh-subagent discipline assertion:
    - Run `judge` twice in sequence; assert `Object.keys(court.MUTABLE_STATE).length === 0` both before and after.
  - Dispatcher identifier test:
    - Calling `judge` with `dispatcher: 'unknown_identifier_string'` throws `E_UNKNOWN_DISPATCHER` (the `dispatcher` parameter is a function in normal use; passing a string triggers the guard that maps to the `anvil_subagent` and `stub` identifier set per `00_Architecture.md` Section 3 "Dispatcher identifiers").
  - CommonJS.

#### Decisions already made

- Structural input isolation is asserted by the test, not trusted in prose. (source: 00_Architecture.md Section 6 Invariant 14)
- Every exported function has at least one positive and one negative test. (source: 00_Architecture.md Section 7 Test tiers)
- Every forbidden Court input key has its own test case. (source: 07_The_Court.md "What the Court is"; 00_Architecture.md Section 6 Invariant 14)
- The source file is inspected to confirm the Court module does not import Plan, Ledger, or Ledger-write modules. (source: Task 3.5 structural enforcement requirement)
- Parallel Devil's Advocate dispatch is asserted via recorded call timestamps from the stub. (source: 07_The_Court.md "The Devil's Advocate subagent")

#### Tests or fixtures

- Self-contained; fixtures are synthesised inline or loaded from Stage 1 fixtures.

#### Verification command

```
node --test dg-anvil/tests/unit/court.test.js
```

Expected exit 0.

#### Done when

`tests/unit/court.test.js` runs green; every forbidden Court input key is tested; the source-file import check confirms the Court module does not import Plan or Ledger; Devil's Advocate parallel dispatch is asserted by timestamp; suspicious-tag upgrade path is asserted; `MUTABLE_STATE` stays empty.

### Task 3.7: Wire `anvil judge`, `anvil ledger append`, `anvil ledger audit`, and `anvil ledger-migrate`

#### Goal

Replace the Stage 0 `stubJudge`, the Stage 1-partial `stubLedger` (which currently has `query` wired), and the Stage 0 `stubLedgerMigrate` handlers in `cli/anvil.js` with functional dispatchers that orchestrate the Court, the ledger write path, the audit scan, and the ledger schema migration.

#### Inputs

- `reports/Anvil-Design/04_Anatomy.md` One CLI binary table (`anvil judge [--task <id>]`, `anvil ledger query <pattern>`, `anvil ledger append <json>`, `anvil ledger audit`).
- `reports/Anvil-Design/07_The_Court.md`.
- `reports/Anvil-Design/06_The_Ledger.md`.
- `reports/DG-Anvil/00_Architecture.md` Section 3 (Error format; Dispatcher identifiers), Section 4 (Stage 3 produces row), Section 5 (Schema versioning rules), Section 6 (Invariants 5, 7).
- `dg-anvil/cli/anvil.js` (Stage 0 / 1 / 2 dispatch skeleton).
- `dg-anvil/cli/lib/court.js` (from Task 3.5).
- `dg-anvil/cli/lib/ledger-write.js` (from Task 3.2).
- `dg-anvil/cli/lib/ledger.js` (extended in Task 3.2).
- `dg-anvil/cli/lib/contract.js`, `cli/lib/plan.js`, `cli/lib/verifier.js`, `cli/lib/worktree.js`, `cli/lib/args.js`.

#### Outputs

- `dg-anvil/cli/anvil.js`
  - `stubJudge` replaced by a handler accepting:
    - `--task <id>` - required.
    - `--contract <path>` - optional; defaults to `anvil/contract.yml`.
    - `--worktree <path>` - required; names the worktree the `judging` skill should read (diff and verify output come from `<worktree>/anvil/`).
    - `--dispatcher <name>` - optional; default `anvil_subagent`; `stub` is permitted for tests. Unknown identifiers return `E_UNKNOWN_DISPATCHER`.
    - Process:
      1. Loads and validates the contract via `cli/lib/contract.js` `loadAndValidate`.
      2. Reads the captured diff from `<worktree>/anvil/diff.patch` via `cli/lib/io.js` `readFileUtf8`; reads `<worktree>/anvil/tool-output.jsonl`; reads the last `verifyAll` result from `<worktree>/anvil/verify/verify-result.json` (written by Stage 2's `anvil verify` finalization, extended here to serialize the structured result to disk for the judge to read).
      3. Derives `confidence` via `court.deriveConfidence(verifyOutput)`.
      4. Calls `court.judge({taskId, contract, diff, verifyOutput, confidence, dispatcher})`.
      5. Writes the structured verdict to stdout as JSON; writes the verdict to `<worktree>/anvil/judge-result.json` for the `resetting` skill to consume.
      6. Exits 0 when `recommendation.action === 'merge'`; exits 1 with structured error carrying the recommendation on any other outcome. The exit code alone is a pass-or-fail; the structured body names the action.
  - `stubLedger` `append` sub-subcommand replaced by a handler accepting:
    - `--json <json-string>` OR `--file <path>` - exactly one of the two must be present.
    - Process:
      1. Parses the input JSON (via `JSON.parse`).
      2. Calls `ledger-write.append(lesson)` with default paths.
      3. Prints `{id, appendedAt, patternsIndexed}` on stdout on success.
      4. Exits 0 on success; exits 1 on any thrown error (structured JSON on stderr).
  - `stubLedger` `audit` sub-subcommand replaced by a handler that:
    - Scans the ledger via `cli/lib/ledger.js` `load`.
    - For each lesson, checks: (a) every referenced file or symbol in `remediation.contract_patch` still exists in at least one recorded repo (the audit is advisory here; if the reference is to a symbol name, the check is token presence rather than full AST resolution); (b) the lesson is not superseded; (c) `hit_count >= 20` and `prevented_count / hit_count < 0.2` flags `low_efficacy` via `ledger-write.markLowEfficacy`.
    - Prints a JSON summary to stdout: `{scanned, flagged_low_efficacy: [...], supersession_chains: [...]}`.
    - Exits 0 on success. This matches `06_The_Ledger.md` "Failure modes the Ledger itself could exhibit" ("stale lesson; `anvil ledger audit` flags lessons whose referenced files or symbols no longer exist").
  - `stubLedgerMigrate` replaced by a functional handler that:
    - Accepts `--in <path>` and `--out <path>`.
    - Reads the input JSONL line by line, validates each line against the current `cli/ledger-schema.json`, and writes the validated lines to the output path.
    - Stage 3 is the finalization stage; the migration is an identity transform v1 -> v1 (the ledger starts and ends at v1 per `00_Architecture.md` Section 5 "Stage 3 finalizes the ledger schema"). A round-trip test in `tests/unit/ledger.test.js` exercises the code path so the slot is not dead. (source: Invariant 7 "test in `tests/unit/` that exercises the migration round-trip")
    - Exits 1 with `E_INVALID_YAML` (despite being JSON; `E_INVALID_JSON` is the more precise code, already in the Stage 0 initial codes) - corrected: the migration subcommand rejects malformed input with `E_INVALID_JSON` on parse failure, `E_INVALID_LESSON` on schema failure.
  - `stubLedger` `query` sub-subcommand already wired in Stage 1; this task finalizes the argument shape: `--limit <integer>` (default 5), positional `<pattern>`, plus new flags `--include-superseded` (default false) and `--include-retired` (default false) matching the Task 3.2 `query` options.
  - `stubVerify` extended in Stage 3: the verify subcommand handler (from Stage 2 Task 2.12) is extended here to additionally persist the structured `verifyAll` return value to `<worktree>/anvil/verify/verify-result.json` via `cli/lib/io.js` `writeFileUtf8` and directory-ensure logic (`cli/lib/io.js` `ensureDir`), before emitting the result to stdout. Stage 2 stdout-only behaviour is preserved when the caller passes `--print-only`. The default is write-and-print. The persisted file is the authoritative evidence input consumed by `anvil judge` (step 2 above) and by the Stage 4 `/ship` whole-branch Court aggregation. (source: 00_Architecture.md Section 3 Verify-result persistence)
  - Every other Stage 0, Stage 1, Stage 2 dispatch entry preserved unchanged, excluding `stubVerify` (the verify subcommand handler authored in Stage 2 Task 2.12 is extended by this task per the Stage 3 Verify-result persistence above).
  - `--help` output extended to document `anvil judge` flags, the new ledger flags, and the `anvil verify --print-only` flag.

#### Decisions already made

- Subcommand shapes from `04_Anatomy.md`: `anvil judge [--task <id>]`, `anvil ledger query <pattern>`, `anvil ledger append <json>`, `anvil ledger audit`. (source: 04_Anatomy.md One CLI binary)
- Every CLI subcommand exits 0 on success, non-zero with `{error, code, details}` on stderr on failure. (source: 00_Architecture.md Section 3 Error format; Invariant 5)
- Dispatcher identifier set is fixed at `anvil_subagent` and `stub`; unknown identifiers return `E_UNKNOWN_DISPATCHER`. (source: 00_Architecture.md Section 3 "Dispatcher identifiers")
- Ledger schema is finalized in Stage 3; the migration subcommand is now functional for the identity v1 -> v1 round trip. (source: 00_Architecture.md Section 5 "Schema lifecycle across stages"; Invariant 7)
- Ledger audit is a read-only scan that flags low-efficacy lessons and stale references. (source: 06_The_Ledger.md "Failure modes the Ledger itself could exhibit"; 04_Anatomy.md One CLI binary `anvil audit` row and the `anvil ledger audit` sub-subcommand referenced in `00_Architecture.md` Section 4 Stage 3 produces row)
- `anvil judge` reads the captured verify result from `<worktree>/anvil/verify/verify-result.json`; Stage 2's `anvil verify` is extended here to persist its structured return value to that path. (source: 00_Architecture.md Section 4 Stage 2 produces row "captures raw output"; 07_The_Court.md "What the Court is" "captured Verify output")
- `anvil verify` is extended to persist `verify-result.json` to the worktree before emitting to stdout; the extension is required by Stage 3 Court consumption per Section 3 Verify-result persistence. (source: 00_Architecture.md Section 3 Verify-result persistence)

#### Tests or fixtures

- `tests/unit/court.test.js` (Task 3.6) covers the module.
- `tests/unit/ledger.test.js` (Task 3.4) includes a migration round-trip test for `anvil ledger-migrate --in <fixture> --out <tmp>`.
- `tests/loop/fixture-repo-python/loop.test.js` (Task 3.11) exercises `anvil judge` end-to-end.

#### Verification command

```
node dg-anvil/cli/anvil.js --help 2>&1 | grep -qE 'judge|ledger append|ledger audit|ledger-migrate'
```

Expected exit 0.

#### Done when

`anvil judge --task <id> --worktree <path>` dispatches the Court and exits 0 on merge, non-zero on reset or escalate; `anvil ledger append --json <json>` or `--file <path>` writes a lesson via the write path; `anvil ledger audit` produces a JSON summary on stdout; `anvil ledger-migrate --in --out` performs the identity v1 round-trip; every other dispatch entry is preserved.

### Task 3.8: Author `commands/abort.md` and `commands/ledger.md`

#### Goal

Create the `/abort` and `/ledger` slash commands per `04_Anatomy.md` Five slash commands table. `/abort` requires a reason and writes an aborted-lesson to the Ledger; `/ledger <query>` is read-only and invokes `anvil ledger query`.

#### Inputs

- `reports/Anvil-Design/04_Anatomy.md` Five slash commands table (`/abort`, `/ledger <query>` rows).
- `reports/Anvil-Design/06_The_Ledger.md` "How the Ledger is written" (abort vs reset distinction).
- `reports/DG-Anvil/00_Architecture.md` Section 4 (Stage 3 produces row), Section 6 (Invariants 4, 5).
- `dg-anvil/cli/lib/ledger-write.js` (from Task 3.2).

#### Outputs

- `dg-anvil/commands/abort.md`
  - Frontmatter (YAML, fenced with triple-dash): `name: abort`, `description: Stop the current loop. Requires a reason; the reason is written to the Ledger as an aborted-lesson.`, `arguments: [reason]`.
  - Body: imperative instructions:
    1. Require a `reason` argument. If empty, exit with `{error: "abort reason required", code: "E_ABORT_REASON_REQUIRED", details: {}}` and do NOT write a ledger entry.
    2. Read `anvil/state.json` via `cli/lib/io.js` `readFileUtf8` to capture the active `run_id` and the most recent `taskId`. If the file does not exist, the abort proceeds with `taskId: null`.
    3. Read `anvil/contract.yml` via `cli/lib/contract.js` `loadAndValidate`. If the contract does not exist, proceed with `contract: null` and set `intent_shape: 'no-contract'`.
    4. Invoke `cli/lib/ledger-write.js` `appendAbortedLesson({reason, taskId, contract, runId})`. The appended lesson has `kind: 'aborted'`; null-lesson prohibition applies (empty reason is rejected by Task 3.2's `appendAbortedLesson` validation).
    5. Update `anvil/state.json` to set the most recent task's status to `'escalated'` with `last_lesson_id` pointing to the aborted-lesson id. If `state.json tasks[taskId].last_lesson_id` is already set, push that value onto `state.json tasks[taskId].prior_lesson_ids` (array; initialised to `[]` if missing) before setting `last_lesson_id` to the new aborted-lesson id.
    6. Print a structured summary `{aborted: true, lesson_id, reason}` on stdout and exit 0.
  - No persona phrasing; no forbidden markers.

- `dg-anvil/commands/ledger.md`
  - Frontmatter: `name: ledger`, `description: Query the Ledger. Returns ranked candidate lessons matching the given pattern.`, `arguments: [query]`.
  - Body: imperative instructions:
    1. Require a `query` argument. If empty, exit with `E_MISSING_ARG` and `details = {flag: 'query'}`.
    2. Invoke `anvil ledger query <query>` via `cli/lib/io.js` `spawn` with an argument array (no shell interpolation).
    3. Print the returned JSON array on stdout.
    4. Exit 0 on success; propagate any non-zero exit code from `anvil ledger query`.
  - Read-only: no mutation; no ledger write. No persona phrasing; no forbidden markers.

#### Decisions already made

- `/abort` requires a reason; the reason is written to the Ledger as an aborted-lesson (distinct from a reset-lesson). (source: 04_Anatomy.md Five slash commands table; 06_The_Ledger.md "How the Ledger is written")
- `/ledger <query>` is read-only; invokes `anvil ledger query`. (source: 04_Anatomy.md Five slash commands table; 06_The_Ledger.md "How the Ledger is queried")
- Error code `E_ABORT_REASON_REQUIRED` is added in Task 3.2's `errors.js` edit. (source: 00_Architecture.md Section 3 Error format; Task 3.2)
- Aborted-lesson kind is distinguished from reset-lesson kind by `kind: 'aborted'`. (source: 06_The_Ledger.md "What a lesson is" field set; Task 3.1 schema `kind` enum)
- No persona phrasing in command bodies. (source: 00_Architecture.md Section 6 Invariant 4)
- Every CLI subcommand and command body exits with structured errors. (source: 00_Architecture.md Section 6 Invariant 5)
- Lesson history is preserved via `prior_lesson_ids` on every overwrite; single-lesson overwrite never discards history. (source: 00_Architecture.md Section 3 Runtime state file shape)

#### Tests or fixtures

- The `/abort` and `/ledger` commands are exercised indirectly by the loop test in Task 3.11 when the fixture's reset path writes an aborted lesson on a second abort.
- `tests/unit/ledger.test.js` adds a case: task with prior `last_lesson_id = L1`; abort attaches lesson L2; state.json shows `last_lesson_id: L2` and `prior_lesson_ids: ['L1']`.

#### Verification command

```
test -f dg-anvil/commands/abort.md && test -f dg-anvil/commands/ledger.md && grep -qE 'name: abort' dg-anvil/commands/abort.md && grep -qE 'arguments:\s*\[reason\]' dg-anvil/commands/abort.md && grep -qE 'E_ABORT_REASON_REQUIRED' dg-anvil/commands/abort.md && grep -qE 'name: ledger' dg-anvil/commands/ledger.md && grep -qE 'anvil ledger query' dg-anvil/commands/ledger.md && ! grep -qE 'as a senior engineer|you are an expert in' dg-anvil/commands/abort.md dg-anvil/commands/ledger.md
```

Expected exit 0.

#### Done when

`commands/abort.md` requires a reason, rejects empty reasons with `E_ABORT_REASON_REQUIRED`, invokes `appendAbortedLesson`, and updates `anvil/state.json`; `commands/ledger.md` is read-only and invokes `anvil ledger query`; neither has persona phrasing or forbidden markers.

### Task 3.9: Author ledger fixtures

#### Goal

Populate `docs/ledger-examples/good/` with a minimum of three good fixtures and `docs/ledger-examples/bad/` with a minimum of one bad fixture per rejection rule. Each `.gitkeep` is removed in the same commit as the first real fixture in that directory.

#### Inputs

- `reports/Anvil-Design/06_The_Ledger.md` "What a lesson is" (canonical example).
- `reports/DG-Anvil/00_Architecture.md` Section 7 (Fixture discipline), Section 4 (Stage 3 produces row).
- Rejection rule list from Task 3.2 Outputs (null-lesson, invalid supersession, malformed pattern array, missing version, wrong version, schema rejections).

#### Outputs

- `dg-anvil/docs/ledger-examples/good/rate-limit-001.jsonl`
  - The canonical example from `06_The_Ledger.md` "What a lesson is", rendered as a single JSONL line. Paired `.meta.json` names the pattern (`rate-limit`).
- `dg-anvil/docs/ledger-examples/good/cache-add-002.jsonl`
  - A cache-add lesson with two pattern tags, a supersession chain (this lesson supersedes a hypothetical `2026-04-10-001` if referenced; for the self-contained fixture, `supersedes` is absent and only the canonical shape is verified).
- `dg-anvil/docs/ledger-examples/good/aborted-003.jsonl`
  - An aborted-lesson fixture with `kind: 'aborted'` and a non-null reason in `contract_gap.was`.
- `dg-anvil/docs/ledger-examples/bad/null-lesson-was-001.jsonl`
  - Paired `.meta.json`: `{"rejection_rule": "null_contract_gap_was", "expected_code": "E_NULL_LESSON"}`. Body: lesson with `contract_gap.was: ""`.
- `dg-anvil/docs/ledger-examples/bad/null-lesson-should-have-been-002.jsonl`
  - Rule: `null_contract_gap_should_have_been`. Body: `contract_gap.should_have_been: null`.
- `dg-anvil/docs/ledger-examples/bad/null-lesson-verify-output-003.jsonl`
  - Rule: `null_evidence_verify_output`. Body: `evidence.verify_output: ""`.
- `dg-anvil/docs/ledger-examples/bad/null-lesson-diagnostic-004.jsonl`
  - Rule: `null_evidence_diagnostic`.
- `dg-anvil/docs/ledger-examples/bad/null-lesson-contract-patch-005.jsonl`
  - Rule: `null_remediation_contract_patch`.
- `dg-anvil/docs/ledger-examples/bad/null-lesson-counter-example-006.jsonl`
  - Rule: `null_remediation_counter_example_text`.
- `dg-anvil/docs/ledger-examples/bad/missing-version-007.jsonl`
  - Rule: `missing_version`. Expected code: `E_INVALID_LESSON`.
- `dg-anvil/docs/ledger-examples/bad/wrong-version-008.jsonl`
  - Rule: `wrong_version`. Body: `anvil_ledger_entry_version: 2`.
- `dg-anvil/docs/ledger-examples/bad/malformed-pattern-array-009.jsonl`
  - Rule: `malformed_pattern`. Body: `pattern: []`.
- `dg-anvil/docs/ledger-examples/bad/invalid-supersession-010.jsonl`
  - Rule: `invalid_supersession`. Body: `supersedes: ["9999-99-99-999"]` (referent does not exist in the target ledger).
- `dg-anvil/docs/ledger-examples/bad/missing-required-contract-gap-011.jsonl`
  - Rule: `missing_contract_gap`.
- `dg-anvil/docs/ledger-examples/bad/missing-required-evidence-012.jsonl`
  - Rule: `missing_evidence`.
- `dg-anvil/docs/ledger-examples/bad/missing-required-remediation-013.jsonl`
  - Rule: `missing_remediation`.
- Each bad-fixture file has a paired `<basename>.meta.json` naming the rejection rule and expected error code (JSONL has no native comment syntax; per `00_Architecture.md` Section 7 Fixture discipline "a paired `<shape>-<id>.meta.json` file holds the reason").
- Remove `dg-anvil/docs/ledger-examples/good/.gitkeep` and `dg-anvil/docs/ledger-examples/bad/.gitkeep` in the same commit as the first real fixture in each directory.

#### Decisions already made

- Minimum three good fixtures; minimum one bad fixture per rejection rule, including null-lesson rejection, invalid supersession, malformed pattern array. (source: 00_Architecture.md Section 4 Stage 3 produces row)
- Fixture file names follow `<shape>-<id>.jsonl`. (source: 00_Architecture.md Section 2 File naming rules; Section 7 Fixture discipline)
- Paired `.meta.json` holds the rejection rule and expected error code (JSONL has no syntactic comment). (source: 00_Architecture.md Section 7 Fixture discipline)
- The six Stage 0 `.gitkeep` sentinels are removed in the same commit as the first real fixture in each directory. (source: 00_Architecture.md Section 2 Empty-directory convention)
- Canonical example body comes from `06_The_Ledger.md` "What a lesson is". (source: 00_Architecture.md Section 5 Schema authoring source)
- A good fixture that fails validation is a test failure; a bad fixture that passes is a test failure. (source: 00_Architecture.md Section 7 Fixture discipline)

#### Tests or fixtures

- `tests/unit/ledger.test.js` (Task 3.4) loads every file in both directories and asserts accept or reject behaviour against the expected code.

#### Verification command

```
test $(ls dg-anvil/docs/ledger-examples/good/*.jsonl 2>/dev/null | wc -l) -ge 3 && test $(ls dg-anvil/docs/ledger-examples/bad/*.jsonl 2>/dev/null | wc -l) -ge 13 && ! test -f dg-anvil/docs/ledger-examples/good/.gitkeep && ! test -f dg-anvil/docs/ledger-examples/bad/.gitkeep && for f in dg-anvil/docs/ledger-examples/bad/*.jsonl; do test -f "${f%.jsonl}.meta.json" || exit 1; done
```

Expected exit 0.

#### Done when

`docs/ledger-examples/good/` contains at least three `.jsonl` files; `docs/ledger-examples/bad/` contains at least thirteen `.jsonl` files with paired `.meta.json` files; both `.gitkeep` sentinels are removed.

### Task 3.10: Finalize the `judging` skill

#### Goal

Replace the Stage 0 `skills/judging/SKILL.md` stub with a finalized skill whose six canonical sections are populated. Process dispatches the Court subagent with the three inputs; parses the structured YAML verdict; invokes Devil's Advocate when appropriate; maps request-clarification to escalation.

#### Inputs

- `reports/Anvil-Design/07_The_Court.md` (all sections).
- `reports/Anvil-Design/04_Anatomy.md` Seven skills table row 5.
- `reports/Anvil-Design/03_The_Core_Loop.md` phase 7 (Judge).
- `reports/Anvil-Design/02_Design_Thesis.md` architectural consequence 3.
- `reports/Anvil-Design/10_Anti-Patterns_Defeated.md` row 2 (Sycophantic convergence), row 3 (Mock tautology), row 4 (Scope creep), row 7 (Rationalized shortcut), row 14 (Theatre drift), row 27 (Spirit-versus-letter).
- `reports/DG-Anvil/00_Architecture.md` Section 6 (Invariants 3, 4, 6, 8, 12, 13, 14).
- `dg-anvil/skills/judging/SKILL.md` (Stage 0 stub).

#### Outputs

- `dg-anvil/skills/judging/SKILL.md`
  - Six H2 headers in order: `## Overview`, `## When to Use`, `## Process`, `## Rationalizations`, `## Red Flags`, `## Verification`. No additional H2 headings.
  - `## Overview`: one paragraph stating the skill dispatches a fresh Court subagent per task with exactly three inputs (active contract, diff, captured Verify output); the Court does NOT receive Plan, Ledger, implementer commit message, implementer reasoning, or prior Court verdicts; two passes in fixed order (Pass 1 Spec compliance then Pass 2 Code quality only if Pass 1 fully green); Devil's Advocate runs in parallel with Pass 1 on Medium or Low confidence; request-clarification maps to escalation, request-changes maps to reset, merge maps to pass.
  - `## When to Use`: invoked by the orchestrator after `verifying` returns, once per task; also invoked once per branch before `/ship` (Stage 4 wires the whole-branch variant). Not invoked by user prompts directly.
  - `## Process`: numbered steps:
    1. Read the confirmed `anvil/contract.yml` via `cli/lib/contract.js` `loadAndValidate`.
    2. Read the captured diff from `<worktreePath>/anvil/diff.patch` and the captured `verifyAll` result from `<worktreePath>/anvil/verify/verify-result.json`.
    3. Derive confidence via `cli/lib/court.js` `deriveConfidence(verifyOutput)`.
    4. Invoke `anvil judge --task <id> --worktree <path>` which calls `cli/lib/court.js` `judge`. The Court subagent's briefing contains EXACTLY four keys: `task_id`, `contract`, `diff`, `verify_output`. Any attempt to add a fifth key throws `E_COURT_INPUT_VIOLATION`.
    5. On Pass 1 any fail: the recommendation is reset; hand off to the `resetting` skill.
    6. On Pass 1 any suspicious: the recommendation is escalate; the suspicious tag is a fail that requires an escalation tag, not a reset.
    7. If Pass 1 is fully green: Pass 2 runs automatically inside `judge`; if Devil's Advocate flagged any criterion, the suspicious tag upgrades Pass 2's `request-clarification` to `request-changes`.
    8. On Pass 2 merge: the task passes.
    9. On Pass 2 request-changes: hand off to `resetting`.
    10. On Pass 2 request-clarification: escalate.
  - `## Rationalizations`: at least three verbatim-shaped entries, each ending with `(failure-taxonomy row N)`. Required rows: 2 (Sycophantic convergence), 3 (Mock tautology), 7 (Rationalized shortcut). Each entry refutes a specific reason an agent might skip Court dispatch or accept a suspicious finding.
  - `## Red Flags`: at least three entries citing rows 2, 14 (Theatre drift), 27 (Spirit-versus-letter). Each entry names a concrete diff or output signal that should elevate suspicion.
  - `## Verification`: a numbered checklist: `anvil judge --task <id> --worktree <path>` exits 0 on merge; the Court briefing contains exactly four keys (structurally enforced); Pass 2 runs only if Pass 1 is fully green; Devil's Advocate runs in parallel on medium or low confidence; every Court finding cites the diff line and the output string (no hand-waving).
  - Under 200 lines.
  - No `TODO`, `FIXME`, `XXX`, `HACK`, `TBD`, `WIP`, `NOTE:` markers.
  - No persona phrasing (no "as a senior engineer", no "as a security auditor", no "as a test engineer", no "you are an expert in").

#### Decisions already made

- Six canonical skill sections in exact order. (source: 00_Architecture.md Section 6 Invariant 6)
- The `judging` skill produces "Two verdicts (spec, quality), with evidence citations". (source: 04_Anatomy.md Seven skills table row 5)
- The Court receives exactly three inputs: active contract, diff, captured Verify output. (source: 07_The_Court.md "What the Court is"; 02_Design_Thesis.md architectural consequence 3)
- Input isolation is structurally enforced in code, not in prose. (source: 00_Architecture.md Section 6 Invariant 14)
- Two passes in fixed order: Pass 1 Spec compliance, Pass 2 Code quality only if Pass 1 fully green. (source: 07_The_Court.md "Two passes in fixed order"; "Why spec first, quality second")
- Devil's Advocate runs in parallel on medium or low confidence; is a confidence modifier, not a vetoer. (source: 07_The_Court.md "The Devil's Advocate subagent")
- Mapping: request-clarification -> escalate; request-changes -> reset; merge -> pass. (source: 07_The_Court.md "Pass 2 - Code quality")
- No persona phrasing; the Court is not a persona. (source: 00_Architecture.md Section 6 Invariant 4; 07_The_Court.md "Why the Court is not a persona")
- Pressure test pairing: Task 3.12 pairs this skill with `tests/pressure/judging.pressure.js` citing row 2. (source: 00_Architecture.md Section 6 Invariants 8 and 12)
- Under 200 lines matches the discipline applied to the other finalized skills. (source: Stage 0, 1, 2 plan conventions)

#### Tests or fixtures

- `dg-anvil/tests/pressure/judging.pressure.js` (Task 3.12) is the paired pressure test required by Invariant 8.

#### Verification command

```
awk '/^## /{print $0}' dg-anvil/skills/judging/SKILL.md | tr '\n' '|' | grep -qE '^## Overview\|## When to Use\|## Process\|## Rationalizations\|## Red Flags\|## Verification\|$' && grep -qE 'row 2|taxonomy row 2' dg-anvil/skills/judging/SKILL.md && grep -qE 'row 3|taxonomy row 3' dg-anvil/skills/judging/SKILL.md && grep -qE 'anvil judge' dg-anvil/skills/judging/SKILL.md && grep -qE 'Devil.s Advocate' dg-anvil/skills/judging/SKILL.md && test $(wc -l < dg-anvil/skills/judging/SKILL.md) -lt 200
```

Expected exit 0.

#### Done when

`skills/judging/SKILL.md` has the six canonical sections populated; cites the required failure-taxonomy rows (2, 3, 7, 14, 27); names `anvil judge` and the Devil's Advocate discipline; is under 200 lines; has no forbidden markers or persona phrasing.

### Task 3.11: Finalize the `resetting` skill

#### Goal

Replace the Stage 0 `skills/resetting/SKILL.md` stub with a finalized skill whose six canonical sections are populated. Process diagnoses the input-level gap; forbids null lessons; produces `contract_patch` and `counter_example_text`; appends a lesson via `cli/lib/ledger-write.js`; injects the patch into the live contract; re-queues the task. Rationalizations table includes an entry refuting "this failure was the agent's fault, not the contract's" (resetting always frames the gap as input-level).

#### Inputs

- `reports/Anvil-Design/06_The_Ledger.md` "How the Ledger is written"; "What a lesson is".
- `reports/Anvil-Design/04_Anatomy.md` Seven skills table row 6.
- `reports/Anvil-Design/03_The_Core_Loop.md` phase 8 (Reset).
- `reports/Anvil-Design/02_Design_Thesis.md` architectural consequence 4 (Failure must produce a durable artifact).
- `reports/Anvil-Design/10_Anti-Patterns_Defeated.md` row 20 (Reset-without-lesson), row 21 (Stale-lesson injection), row 30 (Loop-without-convergence), row 7 (Rationalized shortcut).
- `reports/DG-Anvil/00_Architecture.md` Section 6 (Invariants 3, 4, 6, 8, 12, 15, 17).
- `dg-anvil/skills/resetting/SKILL.md` (Stage 0 stub).

#### Outputs

- `dg-anvil/skills/resetting/SKILL.md`
  - Six H2 headers in order: `## Overview`, `## When to Use`, `## Process`, `## Rationalizations`, `## Red Flags`, `## Verification`. No additional H2 headings.
  - `## Overview`: one paragraph stating the skill is the only writer of reset-kind lessons to the Ledger; invoked after Verify or Court fails on a task; diagnoses what about the INPUT (the contract or the plan task) made the failure possible; produces `contract_patch` and `counter_example_text`; appends a lesson via `cli/lib/ledger-write.js`; injects the patch into the live contract; re-queues the task. A reset that cannot produce a non-null lesson is not a reset; it is an escalation. The skill never frames the gap as "the agent was wrong"; the frame is always "the contract was insufficient".
  - `## When to Use`: invoked by the orchestrator on any fail from `verifying` or `judging`. Not invoked by user prompts directly.
  - `## Process`: numbered steps:
    1. Read the captured Verify output from `<worktreePath>/anvil/verify/verify-result.json` (and optionally the Court verdict from `<worktreePath>/anvil/judge-result.json`).
    2. Identify the input-level gap: what did the contract or the plan task fail to say? Pick the closest row in `docs/failure-taxonomy.md` to phrase the gap.
    3. Compose a lesson object with every required field populated and non-empty:
       - `id`: via `cli/lib/ledger-write.js` `allocateId`.
       - `created`: ISO-8601 UTC.
       - `pattern`: a small array of controlled-vocabulary tags derived from the intent.
       - `intent_shape`: a canonical form of the user prompt.
       - `contract_gap`: `{level, criterion, was, should_have_been}` all non-empty.
       - `evidence`: `{verify_output, diagnostic}` both non-empty; `verify_output` is the captured tool output substring that proves the failure.
       - `remediation`: `{contract_patch, counter_example_text}` both non-empty.
       - `kind`: `reset` (default; `/abort` writes `aborted`).
    4. Call `cli/lib/ledger-write.js` `append(lesson)`. If the append throws `E_NULL_LESSON`, `E_INVALID_LESSON`, or `E_INVALID_SUPERSESSION`, the skill escalates immediately (it does NOT retry with a weaker lesson; Invariant 15).
    5. Inject the `contract_patch` into the live `anvil/contract.yml` by applying the patch expression to the named slot.
    6. Inject the `counter_example_text` into the contract's `counter_examples` section (keyed by the new lesson id).
    7. Kill the failed session's worktree via `cli/lib/worktree.js` `remove({repoRoot, worktreePath})`. On orphan-worktree alarm, record the alarm and continue (the reset proceeds; the orphan is an operational signal handled by the Stage 4 `stop` hook).
    8. Re-queue the task by setting `state.tasks[taskId].status = 'queued'` and incrementing `state.tasks[taskId].loop_count`.
    9. If `loop_count` has reached the task's `loop_cap` (default 3), escalate instead of re-queuing.
  - `## Rationalizations`: at least three verbatim-shaped entries, each ending with `(failure-taxonomy row N)`. Required rows: 20 (Reset-without-lesson), 21 (Stale-lesson injection), 30 (Loop-without-convergence). One entry MUST refute the rationalization "this failure was the agent's fault, not the contract's". The refutation names the frame: resetting always frames the gap as input-level; framing it as agent-level is an escape hatch that leaks the loop.
  - `## Red Flags`: at least three entries citing rows 20, 21, 7. Each entry names a concrete condition under which a null lesson would be tempting: empty evidence fields, identical pattern tags to a prior failure, inability to name the contract slot that failed.
  - `## Verification`: a numbered checklist: the appended lesson passes `cli/ledger-schema.json` validation; `contract_gap`, `evidence`, `remediation` are all non-null and non-empty; `anvil/contract.yml` has been updated with the patched slot and the counter-example entry; `anvil/state.json` records the new `last_lesson_id` on the re-queued task; `loop_count` matches the number of resets for this task.
  - Under 200 lines.
  - No `TODO`, `FIXME`, `XXX`, `HACK`, `TBD`, `WIP`, `NOTE:` markers.
  - No persona phrasing.

#### Decisions already made

- Six canonical skill sections in exact order. (source: 00_Architecture.md Section 6 Invariant 6)
- The `resetting` skill produces "Lesson written to Ledger, task re-queued with improved input". (source: 04_Anatomy.md Seven skills table row 6)
- The `resetting` skill is the ONLY writer of reset-kind lessons (Invariant 17); `/abort` is the only writer of aborted-kind lessons; both route through `cli/lib/ledger-write.js`. (source: 00_Architecture.md Section 6 Invariant 17)
- Null-lesson prohibition: a reset that cannot produce a non-null lesson escalates. (source: 00_Architecture.md Section 6 Invariant 15; 06_The_Ledger.md "How the Ledger is written"; 10_Anti-Patterns_Defeated.md row 20)
- Framing: the question is always "what did the contract (or the plan task) fail to say?", not "what did the agent do wrong". (source: 06_The_Ledger.md "How the Ledger is written")
- Loop cap per task: default 3; reaching the cap escalates. (source: 03_The_Core_Loop.md Human touchpoints; 04_Anatomy.md plan primitive)
- Pressure test pairing: Task 3.13 pairs this skill with `tests/pressure/resetting.pressure.js` citing row 20. (source: 00_Architecture.md Section 6 Invariants 8 and 12)
- No persona phrasing; no unshipped markers. (source: 00_Architecture.md Section 6 Invariants 3 and 4)

#### Tests or fixtures

- `dg-anvil/tests/pressure/resetting.pressure.js` (Task 3.13) is the paired pressure test required by Invariant 8.

#### Verification command

```
awk '/^## /{print $0}' dg-anvil/skills/resetting/SKILL.md | tr '\n' '|' | grep -qE '^## Overview\|## When to Use\|## Process\|## Rationalizations\|## Red Flags\|## Verification\|$' && grep -qE 'row 20|taxonomy row 20' dg-anvil/skills/resetting/SKILL.md && grep -qE 'row 21|taxonomy row 21' dg-anvil/skills/resetting/SKILL.md && grep -qE 'contract_gap|input-level' dg-anvil/skills/resetting/SKILL.md && grep -qE "agent.s fault|agent-level" dg-anvil/skills/resetting/SKILL.md && test $(wc -l < dg-anvil/skills/resetting/SKILL.md) -lt 200
```

Expected exit 0.

#### Done when

`skills/resetting/SKILL.md` has the six canonical sections populated; cites the required failure-taxonomy rows (20, 21, 30, 7); names the null-lesson prohibition; includes a Rationalizations entry refuting the agent-fault frame; is under 200 lines; has no forbidden markers or persona phrasing.

### Task 3.12: Author the `judging` pressure test

#### Goal

Ship `tests/pressure/judging.pressure.js` as the paired pressure test for the `judging` skill. Cites failure-taxonomy row 2 (Sycophantic convergence). The without-skill run sees the implementer's rationale and agrees; the with-skill run sees only contract plus diff plus output and catches a spec gap.

#### Inputs

- `reports/Anvil-Design/10_Anti-Patterns_Defeated.md` row 2 (Sycophantic convergence).
- `reports/Anvil-Design/07_The_Court.md` "What the Court is"; "Why spec first, quality second"; "Why the Court cannot see the Ledger"; "Why the Court cannot see the Plan".
- `reports/DG-Anvil/00_Architecture.md` Section 6 (Invariants 8, 12, 14), Section 7 (Pressure test harness).
- `dg-anvil/tests/pressure/harness.js`.
- `dg-anvil/skills/judging/SKILL.md` (from Task 3.10).
- `dg-anvil/cli/lib/court.js` (from Task 3.5).

#### Outputs

- `dg-anvil/tests/pressure/judging.pressure.js`
  - First line (comment): `// taxonomy row 2: Sycophantic convergence`.
  - CommonJS: `const test = require('node:test'); const assert = require('node:assert'); const { runPressure } = require('../pressure/harness.js');`.
  - Declares a scenario: a contract with one criterion naming a specific observable side effect (`must_implement: ["decrements a named counter"]`); an implementer diff whose body does not decrement the counter but does update an unrelated variable; an implementer commit message that claims "implemented counter decrement with refactoring; tests passing". The captured verify output shows the functional probe passing (the test asserts a superficial property that does not cover the missing side effect) and the substantive probe failing (the named counter is never decremented).
  - `withoutSkill` expected outcome: the judging path is stubbed to also receive the implementer's commit message and rationale (an allowed path when `judging` is not invoked; the raw Court dispatcher is called directly with the four-key briefing plus extras). Assert: the verdict returns `merge` because the sycophantic Court agrees with the implementer's claim; the structural input isolation guard was bypassed.
  - `withSkill` expected outcome: `judging` is invoked; the Court briefing contains EXACTLY four keys (task_id, contract, diff, verify_output); the `composeBriefing` guard throws `E_COURT_INPUT_VIOLATION` if any forbidden key is added; Pass 1 returns `fail` on the substantive criterion with evidence citing the specific diff line where the counter was expected to be decremented but is not. Assert: the verdict returns with `recommendation.action === 'reset'`; the Court did NOT see the commit message.
  - Uses `node:assert` for both outcomes.
  - Consumes `cli/lib/court.js` `judge` with the stub dispatcher used in Task 3.6.

#### Decisions already made

- Every pressure test cites the failure-taxonomy row it is stressing. (source: 00_Architecture.md Section 6 Invariant 12)
- `judging` skill authored in Task 3.10 is paired with this pressure test in the same stage per Invariant 8. (source: 00_Architecture.md Section 6 Invariant 8)
- Row 2 (Sycophantic convergence) is the canonical failure this skill addresses. (source: 10_Anti-Patterns_Defeated.md row 2)
- Harness contract: `runPressure({ scenario, withSkill, withoutSkill })`. (source: 00_Architecture.md Section 7 Pressure test harness)
- Structural input isolation is asserted by the test. (source: 00_Architecture.md Section 6 Invariant 14)

#### Tests or fixtures

- The pressure test is itself the artefact.

#### Verification command

```
grep -qE 'taxonomy row 2|row 2' dg-anvil/tests/pressure/judging.pressure.js && grep -qE "require\\(.*tests/pressure/harness" dg-anvil/tests/pressure/judging.pressure.js && node --test dg-anvil/tests/pressure/judging.pressure.js
```

Expected exit 0.

#### Done when

`tests/pressure/judging.pressure.js` exists, cites row 2, imports `runPressure`, and `node --test` exits 0 with the without-skill run asserting sycophantic agreement and the with-skill run asserting spec-gap detection through the four-key briefing.

### Task 3.13: Author the `resetting` pressure test

#### Goal

Ship `tests/pressure/resetting.pressure.js` as the paired pressure test for the `resetting` skill. Cites failure-taxonomy row 20 (Reset-without-lesson). The without-skill run silently resets without writing a lesson; the with-skill run refuses to reset without a non-null lesson and escalates instead.

#### Inputs

- `reports/Anvil-Design/10_Anti-Patterns_Defeated.md` row 20 (Reset-without-lesson).
- `reports/Anvil-Design/06_The_Ledger.md` "How the Ledger is written".
- `reports/DG-Anvil/00_Architecture.md` Section 6 (Invariants 8, 12, 15), Section 7 (Pressure test harness).
- `dg-anvil/tests/pressure/harness.js`.
- `dg-anvil/skills/resetting/SKILL.md` (from Task 3.11).
- `dg-anvil/cli/lib/ledger-write.js` (from Task 3.2).

#### Outputs

- `dg-anvil/tests/pressure/resetting.pressure.js`
  - First line (comment): `// taxonomy row 20: Reset-without-lesson`.
  - CommonJS imports as in Task 3.12.
  - Declares a scenario: a Verify failure whose captured output does not name a specific input-level gap (the failure is ambiguous; multiple contract slots could be the source). The subagent is asked to reset the task.
  - `withoutSkill` expected outcome: the reset proceeds by writing an empty or token-valued lesson to the Ledger (in the test harness, via a direct call to a mock write path that bypasses the `ledger-write.append` guard). Assert: the test inspects the test-ledger JSONL and finds a lesson whose `contract_gap.was` is empty or whose `remediation.contract_patch` is the literal string `'retry'`. This is the row-20 failure.
  - `withSkill` expected outcome: the reset path refuses the null-lesson candidate. The `ledger-write.append` call throws `E_NULL_LESSON`; the `resetting` skill catches the throw and escalates (no lesson is appended; the task status becomes `escalated`). Assert: the test-ledger JSONL contains no new line from this run; the `anvil/state.json` (or the in-memory equivalent) records `status: 'escalated'` and `last_lesson_id: null`.
  - Uses `node:assert` for both outcomes.
  - Consumes `cli/lib/ledger-write.js` `append` with a temp-directory ledger path.

#### Decisions already made

- Every pressure test cites the failure-taxonomy row it is stressing. (source: 00_Architecture.md Section 6 Invariant 12)
- `resetting` skill authored in Task 3.11 is paired with this pressure test in the same stage per Invariant 8. (source: 00_Architecture.md Section 6 Invariant 8)
- Row 20 (Reset-without-lesson) is the canonical failure this skill addresses. (source: 10_Anti-Patterns_Defeated.md row 20)
- Null-lesson prohibition is enforced by `cli/lib/ledger-write.js` `append`. (source: 00_Architecture.md Section 6 Invariant 15; Task 3.2)
- Harness contract: `runPressure({ scenario, withSkill, withoutSkill })`. (source: 00_Architecture.md Section 7 Pressure test harness)

#### Tests or fixtures

- The pressure test is itself the artefact.

#### Verification command

```
grep -qE 'taxonomy row 20|row 20' dg-anvil/tests/pressure/resetting.pressure.js && grep -qE "require\\(.*tests/pressure/harness" dg-anvil/tests/pressure/resetting.pressure.js && node --test dg-anvil/tests/pressure/resetting.pressure.js
```

Expected exit 0.

#### Done when

`tests/pressure/resetting.pressure.js` exists, cites row 20, imports `runPressure`, and `node --test` exits 0 with the without-skill run asserting silent reset (null lesson written) and the with-skill run asserting null-lesson refusal plus escalation.

### Task 3.14: Ship the second loop-test fixture `fixture-repo-python`

#### Goal

Create `tests/loop/fixture-repo-python/` as a minimal Python repository with a DELIBERATELY UNDER-SPECIFIED contract. The loop test runs the full Execute -> Verify -> Judge -> Reset cycle: Verify fails on first run; reset produces a non-null lesson; lesson is injected as a counter-example patch; re-run passes. This fixture is the Stage 3 exit-criteria artefact and exercises the Python Wired-probe support added in Task 3.3.

#### Inputs

- `reports/Anvil-Design/11_Implementation_Plan.md` Stage 3 ("Stage 3 is complete when a task with a deliberately under-specified contract fails Verify, triggers a reset with a non-null lesson, is re-run with the injected counter-example, and passes.").
- `reports/Anvil-Design/05_The_Contract.md` Format.
- `reports/Anvil-Design/06_The_Ledger.md`.
- `reports/DG-Anvil/00_Architecture.md` Section 3 ("Wired-probe language support"; "Coverage tooling"), Section 4 (Stage 3 produces row), Section 7 (Loop tests).
- `dg-anvil/cli/lib/executor.js`, `verifier.js`, `worktree.js`, `court.js`, `ledger-write.js`.
- `dg-anvil/cli/anvil.js` (wired in Task 3.7).

#### Outputs

- `dg-anvil/tests/loop/fixture-repo-python/README.md`
  - A short file naming the fixture, its under-specified task, and the command `node --test ../loop.test.js` that runs the loop test against it. No persona phrasing; no forbidden markers.
- `dg-anvil/tests/loop/fixture-repo-python/pyproject.toml`
  - Minimal: `[project]\nname = "fixture-repo-python"\nversion = "0.1.0"\nrequires-python = ">=3.9"\n`. No runtime dependencies; test-only `coverage` and `pytest` are assumed present on the host (the loop test skips with a structured message if they are missing, matching Task 3.3's preflight rule).
- `dg-anvil/tests/loop/fixture-repo-python/.gitattributes`
  - `* text=auto eol=lf`.
- `dg-anvil/tests/loop/fixture-repo-python/src/rate_limit.py`
  - A Python module implementing a `class RateLimiter` whose `def consume(self, request_id: str) -> bool` method decrements a bucket. The initial implementation uses hardcoded `window_s = 60` and `max_req = 100`, ignoring any constructor arguments (this is the deliberate under-specification: the contract does not name these defaults, so the implementer silently chooses them).
- `dg-anvil/tests/loop/fixture-repo-python/src/app.py`
  - Imports `RateLimiter` from `rate_limit.py` and calls `consume` at a specific line range. This is the Wired-probe entry point.
- `dg-anvil/tests/loop/fixture-repo-python/tests/test_rate_limit.py`
  - `pytest` tests: `test_first_request_allowed`, `test_under_limit_allowed`, `test_over_limit_denied`. The third test (`test_over_limit_denied`) fails on the first run because the hardcoded defaults do not match the contract's intended semantics (the test passes six requests within a one-second window and asserts the sixth returns `False`; the hardcoded `window_s = 60, max_req = 100` makes all six return `True`).
- `dg-anvil/tests/loop/fixture-repo-python/anvil/contract.yml`
  - Hand-authored under-specified contract:
    - `anvil_contract_version: 1`, `goal`, `created`, `source_intent`.
    - One criterion `C1`:
      - `exists`: `file: src/rate_limit.py`, `symbol: RateLimiter.consume`, `signature: "(self, request_id: str) -> bool"`.
      - `substantive`: `must_implement: ["decrements a named bucket on each call"]` (DELIBERATELY UNDER-SPECIFIED: does not name `window_s` or `max_req` as constructor inputs; does not name the ordering semantics; does not name the per-request budget).
      - `wired`: `call_site: {file: src/app.py, line_range: [1, 30], must_contain_symbol: consume}`.
      - `functional`: `probe: {runner: pytest, target: tests/test_rate_limit.py, must_pass: [test_first_request_allowed, test_under_limit_allowed, test_over_limit_denied], exit_code: 0}`.
    - Optional `invariants: {no_new_dependencies: true, coverage: {new_code_minimum: 50}}`.
- `dg-anvil/tests/loop/fixture-repo-python/anvil/plan.yml`
  - `anvil_plan_version: 1`.
  - One task `T0`: `id: T0`, `wave: 0`, `title: "implement rate limiter"`, `criterion_ids: ["C1"]`, `depends_on: []`, `loop_cap: 3`.
- `dg-anvil/tests/loop/fixture-repo-python/loop.test.js`
  - Uses `node:test` and `node:assert`.
  - Preflight: checks `command -v python3` or `command -v python` and `python -c "import coverage"`; on missing interpreter or missing coverage.py, records a structured skip and exits 0 (per Task 3.3's rule: missing interpreter is `E_UNSUPPORTED_LANGUAGE`; missing coverage.py is `E_COVERAGE_UNAVAILABLE`).
  - Loop-test setup:
    1. Copies the fixture repo into a disposable temp directory via `fs.cpSync(..., { recursive: true })`.
    2. Initialises git in the temp directory and creates a baseline commit.
    3. Invokes `anvil run --task T0 --contract anvil/contract.yml --plan anvil/plan.yml --dispatcher stub` where the stub dispatcher is a built-in loop-test dispatcher that produces the initial deliberately-buggy implementation (hardcoded defaults).
    4. Asserts the CLI exits non-zero with `E_VERIFY` (the `test_over_limit_denied` test fails under Functional; or equivalently, the Substantive probe fails because the `must_implement` observable is not produced on the boundary case the test exposes).
    5. Invokes `anvil judge --task T0 --worktree <path> --dispatcher stub` where the stub Court dispatcher returns a Pass 1 verdict with `fail` on `C1.substantive` with a specific evidence citation.
    6. Invokes the `resetting` skill (directly via the skill's process steps executed as a node module path; Stage 3 does not expose a dedicated `anvil reset` CLI subcommand, per `04_Anatomy.md` One CLI binary; resetting is invoked by the orchestrator, which in Stage 3 means the loop test). The skill produces a non-null lesson whose `contract_gap.should_have_been` names the missing `window_s` and `max_req` slots; appends it to a temp-directory ledger; injects the patch into the contract; re-queues the task.
    7. Asserts the ledger JSONL in the temp directory contains exactly one new line with `kind: 'reset'`, `contract_gap.was` non-empty, `remediation.contract_patch` non-empty.
    8. Asserts the contract file has been updated to include the patched `substantive.must_implement` slot naming `window_s` and `max_req` as constructor arguments, and the counter-examples section has been populated with the new lesson's `counter_example_text`.
    9. Invokes `anvil run --task T0` again. The stub dispatcher this time produces a fixed implementation that honours the constructor arguments (the patched contract tells the implementer to accept `window_s` and `max_req`).
    10. Asserts the CLI exits 0 with `allGreen: true` on Verify and `recommendation.action === 'merge'` on the Court verdict.
    11. Reads `anvil/state.json` and asserts `tasks.T0.status === 'passed'`, `tasks.T0.loop_count === 1`, `tasks.T0.last_lesson_id` equals the lesson id appended in step 7.
    12. Asserts the worktree under `.anvil-worktrees/task-T0` has been removed on pass (no orphan worktrees).
    13. Tears down the temp directory.
  - Taxonomy citation: first line `// loop test for Stage 3; exercises row 20 (Reset-without-lesson) via the non-null lesson assertion and row 26 (Spec-to-plan drift) via the under-specified contract patch cycle`.
  - CommonJS.

#### Decisions already made

- Stage 3 ships the second loop-test fixture repo (`fixture-repo-python`). (source: 00_Architecture.md Section 4 Stage 3 produces row; Section 7 Loop tests)
- Stage 3 is complete when a task with a deliberately under-specified contract fails Verify, triggers a reset with a non-null lesson, is re-run with the injected counter-example, and passes. (source: 11_Implementation_Plan.md Stage 3)
- The fixture is Python because Stage 3 adds Python Wired-probe support (Task 3.3). (source: 00_Architecture.md Section 3 "Wired-probe language support")
- Coverage tooling: `coverage.py` invoked via `python -m coverage run ...`. If missing, the probe emits `E_COVERAGE_UNAVAILABLE`; the loop test records a structured skip. (source: 00_Architecture.md Section 3 "Coverage tooling")
- The Stage 3 loop test uses the stub dispatcher because the real subagent dispatcher's host wiring lands in Stage 4. (source: 00_Architecture.md Section 8 Stage 3 out-of-scope "PR open via gh"; Stage 4 produces row)
- Zero runtime dependencies in the fixture's `pyproject.toml`; `pytest` and `coverage.py` are test-time only and assumed present on the host. (source: 00_Architecture.md Section 3 Runtime; Invariant 11 applies to the plugin; the fixture repo's test dependencies are external to the plugin itself)
- The fixture's contract covers all four verification levels; it does not save otherwise. (source: 05_The_Contract.md Format; 02_Design_Thesis.md architectural consequence 1)

#### Tests or fixtures

- `dg-anvil/tests/loop/fixture-repo-python/loop.test.js` is the loop test authored in this task.

#### Verification command

```
node --test dg-anvil/tests/loop/fixture-repo-python/loop.test.js
```

Expected exit 0 (or structured skip on hosts without Python or coverage.py).

#### Done when

`tests/loop/fixture-repo-python/` contains a minimal Python repo plus `anvil/contract.yml`, `anvil/plan.yml`, and `loop.test.js`; the loop test invokes `anvil run --task T0` twice (first run fails Verify; reset produces a non-null lesson; second run passes), asserts exit 0 on the second run and `allGreen: true`, and the worktree is cleaned up; or records a structured skip on hosts without Python or coverage.py.

## Invariants Check

- Invariant 1 (No advisory hooks): Stage 3 adds no hooks. Hooks remain as Stage 0 set them. No new advisory behaviour introduced. Verified by the absence of any hook-file edit in the Stage 3 produces list.
- Invariant 2 (No fallback light-paths): `cli/anvil.js` additions do not introduce `fast`, `quick`, `do`, `skip`, or `override` subcommands. `cli/lib/court.js`, `ledger-write.js`, and the two new commands do not declare light-paths. Verified by `grep -iE "(--fast|--quick|--skip|--override|/fast|/quick|/do|/skip|/override)" dg-anvil/cli dg-anvil/commands dg-anvil/skills` returning exit 1.
- Invariant 3 (No unshipped markers): `grep -rE "(TODO|FIXME|XXX|HACK|TBD|WIP|NOTE:)" dg-anvil/cli/lib/court.js dg-anvil/cli/lib/ledger-write.js dg-anvil/skills/judging dg-anvil/skills/resetting dg-anvil/commands/abort.md dg-anvil/commands/ledger.md dg-anvil/tests/unit/court.test.js dg-anvil/tests/unit/ledger.test.js dg-anvil/tests/pressure/judging.pressure.js dg-anvil/tests/pressure/resetting.pressure.js dg-anvil/tests/loop/fixture-repo-python dg-anvil/docs/ledger-examples` returns exit 1. `docs/failure-taxonomy.md` (unchanged in Stage 3) remains excluded as in Stages 0, 1, 2. Ledger bad-fixture bodies that contain literal `TODO` inside a quoted scalar as a null-lesson negative example remain permitted per prior stages' exemptions.
- Invariant 4 (No persona definitions): `grep -rE "as a senior engineer|as a security auditor|as a test engineer|you are an expert in" dg-anvil/skills/judging dg-anvil/skills/resetting dg-anvil/commands/abort.md dg-anvil/commands/ledger.md dg-anvil/cli/lib/court.js dg-anvil/cli/lib/ledger-write.js dg-anvil/tests/loop/fixture-repo-python` returns exit 1. The Court is not a persona; it is parameterized by the contract's check types. (source: 07_The_Court.md "Why the Court is not a persona")
- Invariant 5 (Structured errors on every exit): every Stage 3 CLI path (`anvil judge`, `anvil ledger append`, `anvil ledger audit`, `anvil ledger-migrate`, finalized `anvil ledger query`) and every exported module function either returns a structured success value or throws `{error, code, details}`. Verified by the unit tests in Tasks 3.4, 3.6 and the loop test in Task 3.14. The Stage 3 additions to `cli/lib/errors.js` (Task 3.2) are `E_NULL_LESSON`, `E_INVALID_LESSON`, `E_INVALID_SUPERSESSION`, `E_INDEX_DESYNC`, `E_COURT_INPUT_VIOLATION`, `E_INVALID_VERDICT`, `E_RESET_REFUSED`, `E_ABORT_REASON_REQUIRED`.
- Invariant 6 (Six canonical skill sections): `skills/judging/SKILL.md` and `skills/resetting/SKILL.md` both have the six H2 headers in order, no additional H2 headings. Verified by the awk header-extraction command on each file.
- Invariant 7 (Schema changes require a migration): `cli/ledger-schema.json` is finalized in this stage (any delta from the Stage 0 frozen draft is a shape change). `cli/anvil.js` exposes `ledger-migrate` as a functional handler (Task 3.7); `tests/unit/ledger.test.js` (Task 3.4) includes a migration round-trip test. Verified by the round-trip assertion and the ledger-migrate help output.
- Invariant 8 (Skill changes require RED-then-GREEN pressure transcript): Stage 3 finalizes `skills/judging/SKILL.md` and `skills/resetting/SKILL.md`. Both have paired pressure tests authored in the same stage: `tests/pressure/judging.pressure.js` (Task 3.12) and `tests/pressure/resetting.pressure.js` (Task 3.13). Verified by the existence and taxonomy-row citation checks in the Exit Criteria.
- Invariant 9 (Polyglot hooks with graceful degradation): Stage 3 adds no hooks. Not modified.
- Invariant 10 (UTF-8 LF encoding): every file authored in Stage 3 is written UTF-8 without BOM with LF line endings. Verified by `file` inspection of a sample.
- Invariant 11 (Zero runtime dependencies): `package.json` `dependencies` and `devDependencies` remain empty. Every Stage 3 module imports only Node builtins and `cli/lib/*.js`. `tests/loop/fixture-repo-python/pyproject.toml` has no runtime dependencies; `pytest` and `coverage.py` are test-time-only and host-supplied, not plugin-installed. Verified by `node -e "const p=require('./dg-anvil/package.json'); if(Object.keys(p.dependencies||{}).length||Object.keys(p.devDependencies||{}).length){process.exit(1)}"`.
- Invariant 12 (Failure-taxonomy row citation): `tests/pressure/judging.pressure.js` cites row 2; `tests/pressure/resetting.pressure.js` cites row 20; `tests/loop/fixture-repo-python/loop.test.js` cites rows 20 and 26 as the integration-level taxonomy anchors. Verified by grep.
- Invariant 13 (Fresh-subagent discipline): `cli/lib/court.js` carries no module-level mutable state; `MUTABLE_STATE` is `Object.freeze({})`; every `judge` call freezes the briefing; `tests/unit/court.test.js` (Task 3.6) asserts no state is carried across dispatches. Verified by the unit test and the pressure test in Task 3.12.
- Invariant 14 (Evidence-only Court inputs): `cli/lib/court.js` is STRUCTURALLY UNABLE to pass Plan, commit messages, Ledger, or prior Court verdicts to the Court subagent. Enforcement: the `judge` function signature accepts only `{taskId, contract, diff, verifyOutput, confidence, dispatcher}`; `composeBriefing` throws `E_COURT_INPUT_VIOLATION` on any forbidden key in `FORBIDDEN_COURT_INPUT_KEYS`; the module does NOT import `cli/lib/plan.js`, `cli/lib/ledger.js`, or `cli/lib/ledger-write.js` (source-file import check in `tests/unit/court.test.js` Task 3.6). The guard is enforced in code, not in prose. Verified by the unit test (Task 3.6) and the pressure test (Task 3.12).
- Invariant 15 (Null-lesson prohibition): `cli/lib/ledger-write.js` rejects any lesson entry whose `contract_gap`, `evidence`, or `remediation` fields are null or empty with `E_NULL_LESSON`. A reset that cannot produce a non-null lesson escalates instead. Verified by `tests/unit/ledger.test.js` (Task 3.4) and `tests/pressure/resetting.pressure.js` (Task 3.13).
- Invariant 16 (No auto-pick gates): Stage 3 introduces no list-of-N gates. The Court's per-criterion verdict is pass/fail/suspicious (not a list of options). Pass 2's output `merge | request-changes | request-clarification` is a categorical verdict, not a silently-selected option. `/abort` requires a reason (binary: reason present or not). Verified by the absence of any list-of-N auto-pick in the Stage 3 produced code.
- Invariant 17 (Single-writer discipline for the ledger): The literal path `~/.anvil/ledger.jsonl` appears in exactly one source file: `cli/lib/ledger-write.js`. No other Stage 0, 1, 2, or 3 module encodes the literal. Verified by `grep -n '~/\\.anvil/ledger\\.jsonl' dg-anvil/cli/lib/*.js` returning exactly one match (the `cli/lib/ledger-write.js` `DEFAULT_LEDGER_PATH` composition). `tests/unit/ledger.test.js` (Task 3.4) includes the path-literal count assertion.
- Invariant 18 (Trace fields are closed): Stage 3 does not write trace events. Trace event writing is Stage 4. `cli/lib/court.js` and `cli/lib/ledger-write.js` do not write to `anvil/trace.jsonl` or to any structure matching the closed trace-field schema in `00_Architecture.md` Section 3. N/A at Stage 3 as a write-side assertion.

## Exit Criteria

```
set -e
# 1. Every Stage 3 produced file exists.
for f in \
  dg-anvil/cli/lib/court.js \
  dg-anvil/cli/lib/ledger-write.js \
  dg-anvil/cli/ledger-schema.json \
  dg-anvil/skills/judging/SKILL.md \
  dg-anvil/skills/resetting/SKILL.md \
  dg-anvil/commands/abort.md \
  dg-anvil/commands/ledger.md \
  dg-anvil/tests/unit/court.test.js \
  dg-anvil/tests/unit/ledger.test.js \
  dg-anvil/tests/pressure/judging.pressure.js \
  dg-anvil/tests/pressure/resetting.pressure.js \
  dg-anvil/tests/loop/fixture-repo-python/README.md \
  dg-anvil/tests/loop/fixture-repo-python/pyproject.toml \
  dg-anvil/tests/loop/fixture-repo-python/.gitattributes \
  dg-anvil/tests/loop/fixture-repo-python/src/rate_limit.py \
  dg-anvil/tests/loop/fixture-repo-python/src/app.py \
  dg-anvil/tests/loop/fixture-repo-python/tests/test_rate_limit.py \
  dg-anvil/tests/loop/fixture-repo-python/anvil/contract.yml \
  dg-anvil/tests/loop/fixture-repo-python/anvil/plan.yml \
  dg-anvil/tests/loop/fixture-repo-python/loop.test.js; do test -f "$f"; done
# 2. Stage 3 error codes registered in cli/lib/errors.js.
node -e "const e=require('./dg-anvil/cli/lib/errors.js'); for(const k of ['E_NULL_LESSON','E_INVALID_LESSON','E_INVALID_SUPERSESSION','E_INDEX_DESYNC','E_COURT_INPUT_VIOLATION','E_INVALID_VERDICT','E_RESET_REFUSED','E_ABORT_REASON_REQUIRED']){if(e.CODES[k]!==k){process.exit(1)}}"
# 3. Stage 3 ledger fixtures exist with at least 3 good and 13 bad.
test $(ls dg-anvil/docs/ledger-examples/good/*.jsonl 2>/dev/null | wc -l) -ge 3
test $(ls dg-anvil/docs/ledger-examples/bad/*.jsonl 2>/dev/null | wc -l) -ge 13
! test -f dg-anvil/docs/ledger-examples/good/.gitkeep
! test -f dg-anvil/docs/ledger-examples/bad/.gitkeep
# 4. Stage 3 unit tests pass.
node --test dg-anvil/tests/unit/court.test.js
node --test dg-anvil/tests/unit/ledger.test.js
# 5. Stage 3 pressure tests pass.
node --test dg-anvil/tests/pressure/judging.pressure.js
node --test dg-anvil/tests/pressure/resetting.pressure.js
# 6. Stage 2 regression: unit, pressure, and loop tests still pass.
node --test dg-anvil/tests/unit/executor.test.js dg-anvil/tests/unit/verifier.test.js dg-anvil/tests/unit/worktree.test.js
node --test dg-anvil/tests/pressure/executing.pressure.js dg-anvil/tests/pressure/verifying.pressure.js
node --test dg-anvil/tests/loop/fixture-repo-node/loop.test.js
# 7. Stage 1 regression: unit tests still pass (including extended ledger test).
node --test dg-anvil/tests/unit/contract.test.js dg-anvil/tests/unit/plan.test.js dg-anvil/tests/unit/yaml.test.js
# 8. Stage 0 and Stage 1 pressure tests still pass.
node --test dg-anvil/tests/pressure/authoring-skills.pressure.js dg-anvil/tests/pressure/contracting.pressure.js dg-anvil/tests/pressure/planning.pressure.js
# 9. Wired CLI subcommands behave (regression + new).
node dg-anvil/cli/anvil.js contract --validate dg-anvil/docs/contract-examples/good/rate-limit-001.yml
node dg-anvil/cli/anvil.js plan --validate dg-anvil/docs/plan-examples/good/rate-limit-001.yml --contract dg-anvil/docs/contract-examples/good/rate-limit-001.yml
node dg-anvil/cli/anvil.js ledger query rate-limit
node dg-anvil/cli/anvil.js ledger append --file dg-anvil/docs/ledger-examples/good/rate-limit-001.jsonl >/dev/null 2>&1 || true
node dg-anvil/cli/anvil.js ledger audit >/dev/null
node dg-anvil/cli/anvil.js --help 2>&1 | grep -qE 'judge|ledger append|ledger audit|ledger-migrate'
# 10. The Stage 3 exit-criteria artefact: a task with a deliberately under-specified contract fails Verify, triggers a reset with a non-null lesson, is re-run with the injected counter-example, and passes.
node --test dg-anvil/tests/loop/fixture-repo-python/loop.test.js
# 11. No unshipped markers in Stage 3 files outside the copied failure taxonomy.
! grep -rE "(TODO|FIXME|XXX|HACK|TBD|WIP|NOTE:)" dg-anvil/cli/lib/court.js dg-anvil/cli/lib/ledger-write.js dg-anvil/skills/judging dg-anvil/skills/resetting dg-anvil/commands/abort.md dg-anvil/commands/ledger.md dg-anvil/tests/unit/court.test.js dg-anvil/tests/unit/ledger.test.js dg-anvil/tests/pressure/judging.pressure.js dg-anvil/tests/pressure/resetting.pressure.js dg-anvil/tests/loop/fixture-repo-python
# 12. Stage 3 skills have exactly the six canonical H2 headers.
for s in judging resetting; do
  headers=$(awk '/^## /{print $0}' dg-anvil/skills/$s/SKILL.md | tr '\n' '|')
  test "$headers" = "## Overview|## When to Use|## Process|## Rationalizations|## Red Flags|## Verification|"
done
# 13. Structural input isolation for the Court: the module does not import Plan, Ledger, or Ledger-write.
! grep -nE "require\\(.*['\"](\\.\\/)?(plan|ledger|ledger-write)['\"]\\)" dg-anvil/cli/lib/court.js
# 14. Single-writer discipline for the ledger: exactly one source file encodes the literal path.
count=$(grep -lnE '~/\\.anvil/ledger\\.jsonl' dg-anvil/cli/lib/*.js 2>/dev/null | wc -l)
test "$count" = "1"
grep -lnE '~/\\.anvil/ledger\\.jsonl' dg-anvil/cli/lib/*.js | grep -q ledger-write.js
# 15. Fresh-subagent discipline: court carries no module-level state.
node -e "const c=require('./dg-anvil/cli/lib/court.js'); if(!Object.isFrozen(c.MUTABLE_STATE) || Object.keys(c.MUTABLE_STATE).length!==0){process.exit(1)}"
# 16. Substantive check: the Red Flags section of skills/resetting/SKILL.md contains an entry that names null lessons.
awk '/^## Red Flags$/{flag=1; next} /^## /{flag=0} flag' dg-anvil/skills/resetting/SKILL.md | grep -qi 'null lesson'
# 17. Second substantive check: the Process section of skills/judging/SKILL.md contains the literal phrase "the commit message" in the context of "inputs the Court must not see" (a row-2 input-isolation defeater).
awk '/^## Process/,/^## /{print}' dg-anvil/skills/judging/SKILL.md | grep -q 'the commit message'
awk '/^## Process/,/^## /{print}' dg-anvil/skills/judging/SKILL.md | grep -q 'inputs the Court must not see'
echo "stage 3 exit criteria: pass"
# Expected exit 0.
```

## Handoff to Next Stage

Stage 4 consumes from Stage 3 the items listed in Section 4 Stage 4 "Consumes from prior stage" column (the complete Contract-Plan-Execute-Verify-Judge-Reset loop):

- produces `cli/lib/court.js` for Stage 4 to use as the per-task Court dispatcher that the whole-branch Court extends; Stage 4 adds a whole-branch variant that reads the full branch diff against the full contract.
- produces `cli/lib/ledger-write.js` for Stage 4 to continue using as the single writer of the ledger; Stage 4 does not modify it.
- produces `cli/ledger-schema.json` for Stage 4 to continue honouring; no schema change in Stage 4.
- produces `skills/judging/SKILL.md` for Stage 4 to continue using; Stage 4 does not modify it.
- produces `skills/resetting/SKILL.md` for Stage 4 to continue using; Stage 4 does not modify it.
- produces `commands/abort.md` for Stage 4 to continue using; Stage 4 does not modify it.
- produces `commands/ledger.md` for Stage 4 to continue using; Stage 4 does not modify it.
- produces `cli/lib/verifier.js` (extended to Python) for Stage 4 to extend further to Go support for the `fixture-repo-go` loop fixture.
- produces `cli/lib/executor.js` (unchanged from Stage 2) for Stage 4 to wire the live `anvil_subagent` dispatch path (replacing the stubbed Stage 2 and Stage 3 dispatcher for production use).
- produces `cli/anvil.js` (wired with `judge`, `ledger append`, `ledger audit`, `ledger-migrate`) for Stage 4 to extend with `metrics`, `audit`, `ship` subcommands.
- produces the complete Contract -> Plan -> Execute -> Verify -> Judge -> Reset loop for Stage 4 to wrap in the observability layer (`post-tool-use` trace, `pre-tool-use`, `user-prompt-submit`, `stop` hooks), the metrics catalogue, the whole-branch Court, and the `/ship` command.

## Known Non-Goals for This Stage

- `post-tool-use` hook body (Stage 4) (picked up in Stage 4).
- `pre-tool-use` hook body (Stage 4) (picked up in Stage 4).
- `user-prompt-submit` hook body (Stage 4) (picked up in Stage 4).
- `stop` hook body (Stage 4) (picked up in Stage 4).
- `anvil metrics` implementation (Stage 4) (picked up in Stage 4).
- Whole-branch Court orchestration (Stage 4) (picked up in Stage 4).
- PR open via `gh` (Stage 4) (picked up in Stage 4).
