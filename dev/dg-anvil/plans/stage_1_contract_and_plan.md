# Stage 1 Plan - Contract and Plan

## Frontmatter

```yaml
stage: 1
stage_name: Contract and Plan
prerequisites:
  architecture_doc: reports/DG-Anvil/00_Architecture.md
  anvil_design_sections:
    - reports/Anvil-Design/05_The_Contract.md
    - reports/Anvil-Design/03_The_Core_Loop.md
    - reports/Anvil-Design/11_Implementation_Plan.md
    - reports/Anvil-Design/04_Anatomy.md
    - reports/Anvil-Design/02_Design_Thesis.md
    - reports/Anvil-Design/10_Anti-Patterns_Defeated.md
    - reports/Anvil-Design/06_The_Ledger.md
  prior_stage_plan: reports/DG-Anvil/plans/stage_0_bootstrap.md
produces:
  - cli/lib/contract.js
  - cli/lib/plan.js
  - cli/lib/ledger.js
  - cli/lib/yaml.js
  - cli/lib/args.js
  - cli/contract-schema.json
  - cli/plan-schema.json
  - skills/contracting/SKILL.md
  - skills/planning/SKILL.md
  - commands/start.md
  - commands/continue.md
  - docs/contract-examples/good/
  - docs/contract-examples/bad/
  - docs/plan-examples/good/
  - docs/plan-examples/bad/
  - tests/unit/contract.test.js
  - tests/unit/plan.test.js
  - tests/unit/ledger.test.js
  - tests/unit/yaml.test.js
  - tests/pressure/contracting.pressure.js
  - tests/pressure/planning.pressure.js
  - cli/anvil.js
```

## Scope

### In scope

- `cli/lib/contract.js` parser and validator that rejects any criterion missing one of the four verification levels.
- `cli/lib/plan.js` parser and validator that rejects tasks without contract criterion citations and enforces DAG-shaped waves via topological sort.
- `cli/lib/ledger.js` read-only module exposing `query(pattern)` over `~/.anvil/ledger.jsonl` and `~/.anvil/ledger.index.json`; write path throws `E_NOT_IMPLEMENTED`.
- `cli/lib/yaml.js` finalized parser for the supported YAML subset, throwing a structured error with line and column on any out-of-subset feature.
- `cli/lib/args.js` finalized argument parser (positional, long, short, `--` terminator) rejecting unknown flags with `E_UNKNOWN_FLAG`.
- `cli/contract-schema.json` finalized from the Stage 0 frozen draft.
- `cli/plan-schema.json` finalized from the Stage 0 frozen draft.
- `skills/contracting/SKILL.md` finalized with the six canonical H2 sections populated.
- `skills/planning/SKILL.md` finalized with the six canonical H2 sections populated.
- `commands/start.md` that invokes the `contracting` skill with the user intent.
- `commands/continue.md` skeleton that reads `anvil/state.json` and returns `E_NOT_IMPLEMENTED` for task-level continuation.
- `docs/contract-examples/good/*.yml` minimum three good fixtures (each `.gitkeep` is removed in the same commit as the first real fixture).
- `docs/contract-examples/bad/*.yml` minimum one fixture per contract-validator rejection rule.
- `docs/plan-examples/good/*.yml` minimum three good fixtures.
- `docs/plan-examples/bad/*.yml` minimum one fixture per plan-validator rejection rule.
- `tests/unit/contract.test.js`, `tests/unit/plan.test.js`, `tests/unit/ledger.test.js` (read path only), `tests/unit/yaml.test.js`.
- `tests/pressure/contracting.pressure.js` paired pressure test citing failure-taxonomy row 9.
- `tests/pressure/planning.pressure.js` paired pressure test citing failure-taxonomy row 26.
- `cli/anvil.js` wired subcommands `anvil contract`, `anvil plan`, `anvil ledger query`, `anvil contract-migrate`, `anvil plan-migrate` (migration subcommands paired with the schema finalization).

### Out of scope

- Worktree creation or management (Stage 2).
- Subagent dispatch (Stage 2).
- Verify probes (Stage 2).
- Court dispatch (Stage 3).
- Ledger write path or index maintenance on write (Stage 3).
- `pre-tool-use`, `post-tool-use`, `user-prompt-submit`, `stop` hook behaviour (Stage 4).
- Metrics (Stage 4).
- Ship (Stage 4).
- Final `README.md` content (Stage 4).

## Prerequisites Verification

No work begins until every check below exits 0. Any failure stops the stage without writing a file.

1. `test -f dg-anvil/cli/anvil.js` - exit 0 (Stage 0 Task 0.7 skeleton exists).
2. `node -e "const a=require('./dg-anvil/cli/anvil.js'); if(typeof a.main!=='function'){process.exit(1)}"` - exit 0 (Stage 0 CLI entry exports `main`).
3. `test -f dg-anvil/cli/lib/errors.js` - exit 0 (Stage 0 Task 0.3 error module exists).
4. `node -e "const e=require('./dg-anvil/cli/lib/errors.js'); for(const k of ['E_NOT_IMPLEMENTED','E_UNKNOWN_SUBCOMMAND','E_UNKNOWN_FLAG','E_MISSING_ARG','E_INVALID_JSON','E_INVALID_YAML','E_IO']){if(e.CODES[k]!==k){process.exit(1)}}"` - exit 0 (Stage 0 codes present).
5. `test -f dg-anvil/cli/lib/args.js` - exit 0 (Stage 0 Task 0.4 skeleton exists).
6. `test -f dg-anvil/cli/lib/io.js` - exit 0 (Stage 0 Task 0.5 skeleton exists).
7. `test -f dg-anvil/cli/lib/yaml.js` - exit 0 (Stage 0 Task 0.6 skeleton exists).
8. `node -e "const y=require('./dg-anvil/cli/lib/yaml.js'); if(!Array.isArray(y.SUPPORTED_SUBSET)||!Array.isArray(y.UNSUPPORTED)){process.exit(1)}"` - exit 0 (Stage 0 YAML subset constants present).
9. `test -f dg-anvil/cli/contract-schema.json` - exit 0 (Stage 0 Task 0.8 frozen draft exists).
10. `jq empty dg-anvil/cli/contract-schema.json` - exit 0 (contract schema parses).
11. `test -f dg-anvil/cli/plan-schema.json` - exit 0 (Stage 0 Task 0.9 frozen draft exists).
12. `jq empty dg-anvil/cli/plan-schema.json` - exit 0 (plan schema parses).
13. `test -f dg-anvil/cli/ledger-schema.json` - exit 0 (Stage 0 Task 0.10 frozen draft exists).
14. `jq empty dg-anvil/cli/ledger-schema.json` - exit 0 (ledger schema parses).
15. `test -f dg-anvil/skills/contracting/SKILL.md` - exit 0 (Stage 0 Task 0.15 stub exists).
16. `awk '/^## /{print $0}' dg-anvil/skills/contracting/SKILL.md | tr '\n' '|' | grep -qE '^## Overview\|## When to Use\|## Process\|## Rationalizations\|## Red Flags\|## Verification\|$'` - exit 0 (contracting stub has six canonical headers).
17. `test -f dg-anvil/skills/planning/SKILL.md` - exit 0 (Stage 0 Task 0.15 stub exists).
18. `awk '/^## /{print $0}' dg-anvil/skills/planning/SKILL.md | tr '\n' '|' | grep -qE '^## Overview\|## When to Use\|## Process\|## Rationalizations\|## Red Flags\|## Verification\|$'` - exit 0 (planning stub has six canonical headers).
19. `test -f dg-anvil/tests/pressure/harness.js` - exit 0 (Stage 0 Task 0.16 harness exists).
20. `node -e "const h=require('./dg-anvil/tests/pressure/harness.js'); if(typeof h.runPressure!=='function'){process.exit(1)}"` - exit 0 (`runPressure` exported).
21. `test -f dg-anvil/tests/pressure/authoring-skills.pressure.js` - exit 0 (Stage 0 Task 0.14 reference pressure test exists).
22. `node --test dg-anvil/tests/pressure/authoring-skills.pressure.js` - exit 0 (reference pressure harness invocation still passes).
23. `test -f dg-anvil/docs/contract-examples/good/.gitkeep` - exit 0 (Stage 0 Task 0.18 sentinel exists and will be removed by Task 1.12).
24. `test -f dg-anvil/docs/contract-examples/bad/.gitkeep` - exit 0 (Stage 0 Task 0.18 sentinel exists and will be removed by Task 1.12).
25. `test -f dg-anvil/docs/plan-examples/good/.gitkeep` - exit 0 (Stage 0 Task 0.18 sentinel exists and will be removed by Task 1.13).
26. `test -f dg-anvil/docs/plan-examples/bad/.gitkeep` - exit 0 (Stage 0 Task 0.18 sentinel exists and will be removed by Task 1.13).

If any check fails, stop without writing any file.

## Phased Tasks

### Task 1.1: Finalize the YAML reader

#### Goal

Replace the Stage 0 `cli/lib/yaml.js` skeleton with a working parser for the supported YAML subset; unsupported features throw `E_INVALID_YAML` with line and column.

#### Inputs

- `reports/DG-Anvil/00_Architecture.md` Section 3 (YAML; File encoding).
- `reports/DG-Anvil/plans/stage_0_bootstrap.md` Task 0.6 (skeleton contract).
- `dg-anvil/cli/lib/yaml.js` (Stage 0 skeleton).
- `dg-anvil/cli/lib/errors.js` (for `makeError`, `CODES.E_INVALID_YAML`).

#### Outputs

- `dg-anvil/cli/lib/yaml.js`
  - Implements `parse(source)` returning a plain object or array by tokenising the supported YAML subset: block mappings, block sequences, string/integer/boolean/null scalars, triple-quoted and single-line strings, and `#`-prefixed comments.
  - Implements `parseFrontmatter(source)` returning `{frontmatter: object, body: string}` by splitting on the first pair of triple-dash delimiter lines and passing the frontmatter body through `parse`.
  - Retains the Stage 0 exports `SUPPORTED_SUBSET` and `UNSUPPORTED` unchanged in shape.
  - Throws a structured error shaped `{error, code, details}` with `code = 'E_INVALID_YAML'` and `details = {line: <integer>, column: <integer>, feature: <string>}` when the input uses anchors, flow style, a non-implicit tag, or any other unsupported feature.
  - Imports only from `fs`, `path`, and `cli/lib/errors.js`.

#### Decisions already made

- Supported subset: block-style mappings and sequences; string/integer/boolean/null scalars; triple-dash frontmatter; triple-quoted and single-line strings; `#`-prefixed comments. (source: 00_Architecture.md Section 3 YAML)
- Unsupported features throw structured errors with line and column. (source: 00_Architecture.md Section 3 YAML)
- Error code for YAML parse failures is `E_INVALID_YAML`. (source: 00_Architecture.md Section 3 Error format initial codes)
- Zero runtime dependencies; no npm YAML library. (source: 00_Architecture.md Section 3 YAML; Invariant 11)
- `cli/lib/yaml.js` is finalized in Stage 1. (source: 00_Architecture.md Section 3 YAML; Section 4 Stage 1 produces row)
- UTF-8 without BOM; LF line endings. (source: 00_Architecture.md Section 3 File encoding)

#### Tests or fixtures

- `dg-anvil/tests/unit/yaml.test.js` authored in Task 1.2 exercises `parse` and `parseFrontmatter` against positive and negative inputs.

#### Verification command

```
node -e "const y=require('./dg-anvil/cli/lib/yaml.js'); const r=y.parse('a: 1\\nb:\\n  - 2\\n  - 3\\n'); if(r.a!==1||!Array.isArray(r.b)||r.b[0]!==2||r.b[1]!==3){process.exit(1)}; try{y.parse('a: &x 1\\n'); process.exit(1)}catch(err){if(err.code!=='E_INVALID_YAML'||typeof err.details.line!=='number'||typeof err.details.column!=='number'){process.exit(1)}}"
```

Expected exit 0.

#### Done when

`cli/lib/yaml.js` parses the supported subset, rejects anchors and flow style with `E_INVALID_YAML` carrying `line` and `column` in `details`, and `parseFrontmatter` separates the frontmatter block from the body.

### Task 1.2: Author the YAML unit test

#### Goal

Ship `tests/unit/yaml.test.js` with positive coverage for every feature in `SUPPORTED_SUBSET` and negative coverage for every feature in `UNSUPPORTED`.

#### Inputs

- `reports/DG-Anvil/00_Architecture.md` Section 3 (YAML), Section 7 (Testing discipline).
- `dg-anvil/cli/lib/yaml.js` (from Task 1.1).

#### Outputs

- `dg-anvil/tests/unit/yaml.test.js`
  - Uses `node:test` and `node:assert`.
  - Positive tests: block mapping of scalars; nested mapping; block sequence of scalars; sequence of mappings; integer and boolean and null scalars; single-line string; triple-quoted string; comment line ignored; frontmatter split.
  - Negative tests: anchor (`&x`, `*x`) throws `E_INVALID_YAML`; flow-style mapping (`{a: 1}`) throws `E_INVALID_YAML`; flow-style sequence (`[1, 2]`) throws `E_INVALID_YAML`; explicit non-scalar tag (`!!map`) throws `E_INVALID_YAML`; every negative case asserts `err.details.line` and `err.details.column` are integers.
  - Uses CommonJS `require`.

#### Decisions already made

- Test runner is Node builtin `node:test`. No external test framework. (source: 00_Architecture.md Section 7 Test runner)
- Test discovery path is `tests/**/*.test.js`. (source: 00_Architecture.md Section 7 Test runner)
- Every exported function has at least one positive and one negative test. (source: 00_Architecture.md Section 7 Test tiers)
- `SUPPORTED_SUBSET` and `UNSUPPORTED` are the authoritative feature lists. (source: stage_0_bootstrap.md Task 0.6)

#### Tests or fixtures

- Self-contained; no external fixture files.

#### Verification command

```
node --test dg-anvil/tests/unit/yaml.test.js
```

Expected exit 0.

#### Done when

`tests/unit/yaml.test.js` runs under `node --test` and passes; every item in `SUPPORTED_SUBSET` has a positive assertion and every item in `UNSUPPORTED` has a negative assertion.

### Task 1.3: Finalize the argument parser

#### Goal

Replace the Stage 0 `cli/lib/args.js` skeleton with a working parser for positional arguments, long options, short options, and the `--` terminator. Unknown options throw `E_UNKNOWN_FLAG`.

#### Inputs

- `reports/DG-Anvil/00_Architecture.md` Section 3 (CLI argument parsing; Error format).
- `reports/DG-Anvil/plans/stage_0_bootstrap.md` Task 0.4 (skeleton contract).
- `dg-anvil/cli/lib/args.js` (Stage 0 skeleton).
- `dg-anvil/cli/lib/errors.js`.

#### Outputs

- `dg-anvil/cli/lib/args.js`
  - Implements `parse(argv, schema)` returning `{positional: string[], options: object, remainder: string[]}`.
  - Accepts long options as `--flag` (boolean true), `--flag=value`, and `--flag value` (when `schema.options[flag].type !== 'boolean'`).
  - Accepts short options as `-f` (boolean), `-f value`, or cluster `-fg` (each char mapped through `schema.shortAliases`).
  - On any unknown option, throws a structured error with `code = 'E_UNKNOWN_FLAG'` and `details = {flag: <string>, argv_index: <integer>}`.
  - On a required option that is missing, throws with `code = 'E_MISSING_ARG'` and `details = {flag: <string>}`.
  - `--` terminates option processing; everything after is placed in `remainder`.
  - Retains the Stage 0 exports `LONG_FLAG_PREFIX`, `SHORT_FLAG_PREFIX`, `TERMINATOR`.
  - Coerces `type: 'integer'` to `Number(parseInt(value, 10))` and rejects `NaN` with `E_MISSING_ARG` plus `details.reason = 'not_integer'`.
  - Imports only from `cli/lib/errors.js`.

#### Decisions already made

- No external argument parser. Minimal parser with positionals, long options, short options, and `--` terminator. (source: 00_Architecture.md Section 3 CLI argument parsing)
- Unknown options rejected with structured error, code `E_UNKNOWN_FLAG`. (source: 00_Architecture.md Section 3 CLI argument parsing; Error format initial codes)
- Stage 0 ships the skeleton; Stage 1 finalizes. (source: 00_Architecture.md Section 3 CLI argument parsing)
- Every subcommand's argument shape is declared as a small schema object at the top of each subcommand handler. (source: 00_Architecture.md Section 3 CLI argument parsing)
- Error JSON shape is `{error, code, details}`. (source: 00_Architecture.md Section 3 Error format)

#### Tests or fixtures

- `dg-anvil/tests/unit/args.test.js` is authored in this task to cover the parser.

#### Verification command

```
node -e "const a=require('./dg-anvil/cli/lib/args.js'); const s={positional:['pattern'], options:{limit:{type:'integer'}}, shortAliases:{l:'limit'}}; const r=a.parse(['foo','--limit=3'],s); if(r.positional[0]!=='foo'||r.options.limit!==3){process.exit(1)}; try{a.parse(['--bogus'], s); process.exit(1)}catch(err){if(err.code!=='E_UNKNOWN_FLAG'){process.exit(1)}}"
```

Expected exit 0.

#### Done when

`cli/lib/args.js` parses the four argv shapes, rejects unknown flags with `E_UNKNOWN_FLAG`, and reports missing required arguments with `E_MISSING_ARG`.

### Task 1.4: Finalize the contract schema

#### Goal

Finalize `cli/contract-schema.json` from the Stage 0 frozen draft. Every field named in `reports/Anvil-Design/05_The_Contract.md` Format section is a schema property with the type implied by context; every criterion requires the four verification-level slots; invariants and counter-examples sections are schematized.

#### Inputs

- `reports/Anvil-Design/05_The_Contract.md` Format, Why four verification levels, Invariants, Counter-examples sections.
- `reports/DG-Anvil/00_Architecture.md` Section 5 (Schema files and version labels; Schema versioning rules; Schema authoring source).
- `dg-anvil/cli/contract-schema.json` (Stage 0 frozen draft).

#### Outputs

- `dg-anvil/cli/contract-schema.json`
  - Retains `$schema: https://json-schema.org/draft/2020-12/schema` and `$id: https://dg-anvil/schemas/contract-schema.json`.
  - Top-level `type: object`, `additionalProperties: false`.
  - Required top-level: `anvil_contract_version`, `goal`, `created`, `source_intent`, `criteria`.
  - `anvil_contract_version: {type: 'integer', const: 1}`.
  - `goal: {type: 'string', minLength: 1}`.
  - `created: {type: 'string', format: 'date'}`.
  - `source_intent: {type: 'string', minLength: 1}`.
  - `ledger_queried: {type: 'boolean'}` (optional).
  - `ledger_hits: {type: 'array'}` with items `{pattern: string, lessons: string[]}` (optional).
  - `criteria: {type: 'array', minItems: 1}` of criterion objects. Each criterion object has: `id: string`, `statement: string`, `exists: object`, `substantive: object`, `wired: object`, `functional: object` - all four required; `additionalProperties: false` on the criterion object.
  - Each of `exists`, `substantive`, `wired`, `functional` is a non-empty object; schema enforces `type: object, minProperties: 1`.
  - Optional top-level `invariants: object` capturing `no_new_dependencies: boolean`, `public_api_unchanged: string[]`, `coverage: {new_code_minimum: number}`, and user-extensible keys (this is the one object with `additionalProperties: true` because Invariants is the user-extensible slot per `05_The_Contract.md`).
  - Optional top-level `counter_examples: object` whose keys are lesson ids and values are strings (per `05_The_Contract.md` Counter-examples section).
  - File parses as valid JSON; `jq empty` exits 0.

#### Decisions already made

- Canonical shape source is `reports/Anvil-Design/05_The_Contract.md` Format section. (source: 00_Architecture.md Section 5 Schema authoring source)
- Four verification levels (Exists, Substantive, Wired, Functional) are grammatical slots, not optional annotations. A contract that does not parse into all four does not save. (source: 02_Design_Thesis.md architectural consequence 1; 05_The_Contract.md "Why four verification levels")
- Version label is `anvil_contract_version: 1`; integer; missing version is a structured parse error. (source: 00_Architecture.md Section 5 Schema files and version labels; Schema versioning rules)
- Any schema change from the Stage 0 frozen draft is paired with a `contract-migrate` CLI subcommand. Task 1.6 wires that subcommand. (source: 00_Architecture.md Section 5 Schema versioning rules; Invariant 7)
- Invariants section is user-extensible; all other object shapes are closed (`additionalProperties: false`). (source: 05_The_Contract.md Invariants section)
- Counter-examples section holds lesson-id -> text pairs injected at contract-authoring time. (source: 05_The_Contract.md Counter-examples section; 06_The_Ledger.md "How the Ledger is queried")

#### Tests or fixtures

- `tests/unit/contract.test.js` (Task 1.7) asserts the schema validates the Stage 1 fixtures under `docs/contract-examples/good/` and rejects every fixture under `docs/contract-examples/bad/`.

#### Verification command

```
jq -e '.properties.anvil_contract_version.const == 1 and (.required | index("criteria")) and (.properties.criteria.items.required | length) == 6' dg-anvil/cli/contract-schema.json
```

Expected exit 0.

#### Done when

`cli/contract-schema.json` validates, the top-level and criterion required-field sets match the rules above, and the four verification-level slots are required on every criterion.

### Task 1.5: Finalize the plan schema

#### Goal

Finalize `cli/plan-schema.json` from the Stage 0 frozen draft. Every task object requires `criterion_ids` to be a non-empty array of strings; DAG validity is expressed through task `depends_on` referencing other task ids and through `wave` integers.

#### Inputs

- `reports/Anvil-Design/03_The_Core_Loop.md` phase 3 (Plan).
- `reports/Anvil-Design/04_Anatomy.md` Five primitives table (Plan row).
- `reports/Anvil-Design/11_Implementation_Plan.md` Stage 1.
- `reports/Anvil-Design/10_Anti-Patterns_Defeated.md` row 26.
- `reports/DG-Anvil/00_Architecture.md` Section 5 (Schema authoring source for Plan).
- `dg-anvil/cli/plan-schema.json` (Stage 0 frozen draft).

#### Outputs

- `dg-anvil/cli/plan-schema.json`
  - Retains `$schema: https://json-schema.org/draft/2020-12/schema` and `$id: https://dg-anvil/schemas/plan-schema.json`.
  - Top-level `type: object`, `additionalProperties: false`.
  - Required top-level: `anvil_plan_version`, `tasks`.
  - `anvil_plan_version: {type: 'integer', const: 1}`.
  - `tasks: {type: 'array', minItems: 1}` of task objects.
  - Each task object has: `id: string (pattern: "^T[0-9]+$")`, `wave: integer (minimum: 0)`, `title: string (minLength: 1)`, `criterion_ids: {type: 'array', minItems: 1, items: {type: 'string'}}`, `depends_on: {type: 'array', items: {type: 'string'}}`, `loop_cap: integer (minimum: 1, default: 3)`.
  - `additionalProperties: false` on task objects.
  - Drops the Stage 0 placeholder `waves` property; wave ordering is derived from `tasks[].wave` at validation time.
  - File parses as valid JSON.

#### Decisions already made

- Plan shape is synthesised from `03_The_Core_Loop.md`, `04_Anatomy.md`, `11_Implementation_Plan.md`. The synthesised schema is authoritative. (source: 00_Architecture.md Section 5 Schema authoring source)
- Plan is an atomic task DAG with wave ordering. (source: 04_Anatomy.md Five primitives table; 03_The_Core_Loop.md phase 3)
- Every task must cite at least one contract criterion id; tasks without citations do not execute. (source: 03_The_Core_Loop.md Hard gates "Task-to-contract citation"; 10_Anti-Patterns_Defeated.md row 26)
- Version label `anvil_plan_version: 1`; migration subcommand paired with any schema change. (source: 00_Architecture.md Section 5 Schema versioning rules; Invariant 7)
- Loop cap per task; default 3. (source: 03_The_Core_Loop.md Human touchpoints "Loop cap reached for a task (default: 3 resets per task)")
- Stage 0's two-shape `waves` accommodation collapses to the single shape "derived from `tasks[].wave`". (source: stage_0_bootstrap.md Task 0.9; 00_Architecture.md Section 5 lifecycle "Stage 1 finalizes")

#### Tests or fixtures

- `tests/unit/plan.test.js` (Task 1.8) asserts the schema validates the Stage 1 plan-example fixtures and rejects every bad fixture.

#### Verification command

```
jq -e '.properties.anvil_plan_version.const == 1 and (.properties.tasks.items.required | index("criterion_ids")) and .properties.tasks.items.properties.criterion_ids.minItems == 1' dg-anvil/cli/plan-schema.json
```

Expected exit 0.

#### Done when

`cli/plan-schema.json` validates, `criterion_ids` is required and non-empty on every task, and the DAG shape is expressed via `wave` and `depends_on`.

### Task 1.6: Wire `contract-migrate` and `plan-migrate` subcommands

#### Goal

Fulfil Invariant 7: because Task 1.4 and Task 1.5 change the Stage 0 frozen drafts, `cli/anvil.js` must expose functional `contract-migrate` and `plan-migrate` subcommands that perform the identity migration (v1 -> v1) and the tests must exercise round-trip parse-and-serialize.

#### Inputs

- `reports/DG-Anvil/00_Architecture.md` Section 5 (Schema versioning rules), Section 6 (Invariant 7).
- `dg-anvil/cli/anvil.js` (Stage 0 dispatch skeleton with stubs for `contract-migrate` and `plan-migrate`).

#### Outputs

- `dg-anvil/cli/anvil.js`
  - Replaces the Stage 0 `stubContractMigrate` handler with a function that:
    - Parses `--in <path>` and `--out <path>` using `cli/lib/args.js`.
    - Reads the input file through `cli/lib/io.js` `readFileUtf8`.
    - Parses through `cli/lib/yaml.js` `parseFrontmatter`.
    - Validates the parsed object against `cli/contract-schema.json` using the validator exported by `cli/lib/contract.js` (Task 1.7).
    - If valid at v1, writes the serialized form to the out path and exits 0.
    - If the version field is missing or not an integer equal to 1, exits 1 with `E_INVALID_YAML` and `details.reason = 'unsupported_version'`.
  - Replaces the Stage 0 `stubPlanMigrate` handler analogously, using `cli/lib/plan.js` (Task 1.8) and `cli/plan-schema.json`.
  - Leaves `stubLedgerMigrate` unchanged (Stage 3 finalizes the ledger migration).
  - Preserves all other Stage 0 dispatch table entries exactly.

#### Decisions already made

- Every schema bump is paired with a CLI migration subcommand. (source: 00_Architecture.md Section 5 Schema versioning rules)
- Invariant 7: schema changes require a paired migration subcommand in `cli/anvil.js` and a migration round-trip test in `tests/unit/`. (source: 00_Architecture.md Section 6 Invariant 7)
- Migration subcommands never rewrite in place silently. (source: 00_Architecture.md Section 5 Schema versioning rules)
- `contract-migrate` and `plan-migrate` dispatch slots exist from Stage 0 Task 0.7. (source: stage_0_bootstrap.md Task 0.7)
- At Stage 1 the migration is an identity transform because both schemas start and end at v1; the round-trip exercises the code path so the slot is not dead. (source: 00_Architecture.md Section 6 Invariant 7 wording "exercises the migration round-trip")

#### Tests or fixtures

- `tests/unit/contract.test.js` (Task 1.7) includes a round-trip migration test: read a good fixture, call `contract-migrate --in <fixture> --out <tmp>`, re-parse the output, assert structural equality.
- `tests/unit/plan.test.js` (Task 1.8) includes the analogous plan-migration round-trip test.

#### Verification command

```
node dg-anvil/cli/anvil.js contract-migrate --in dg-anvil/docs/contract-examples/good/rate-limit-001.yml --out /tmp/contract-rt.yml && node -e "const y=require('./dg-anvil/cli/lib/yaml.js'); const io=require('./dg-anvil/cli/lib/io.js'); const a=y.parseFrontmatter(io.readFileUtf8('/tmp/contract-rt.yml')); if(a.frontmatter.anvil_contract_version!==1){process.exit(1)}"
```

Expected exit 0.

#### Done when

`anvil contract-migrate` and `anvil plan-migrate` both perform the v1 identity round-trip on a good fixture, and their respective unit tests pass.

### Task 1.7: Author the contract parser and validator

#### Goal

Ship `cli/lib/contract.js` with `parse(text)` and `validate(obj)`. Parsing is delegated to `cli/lib/yaml.js`. Validation is a hand-written pass that enforces the schema loaded from `cli/contract-schema.json` and the domain rules (four verification levels present and non-empty on every criterion; counter-examples are lesson-id -> string pairs).

#### Inputs

- `reports/Anvil-Design/05_The_Contract.md` Format, Why four verification levels, Counter-examples.
- `reports/Anvil-Design/02_Design_Thesis.md` architectural consequence 1.
- `reports/DG-Anvil/00_Architecture.md` Section 3 (Error format), Section 5 (Schema files and version labels), Section 6 (Invariants 3, 5, 7).
- `dg-anvil/cli/contract-schema.json` (from Task 1.4).
- `dg-anvil/cli/lib/yaml.js` (from Task 1.1).
- `dg-anvil/cli/lib/errors.js`.

#### Outputs

- `dg-anvil/cli/lib/contract.js`
  - Exports `parse(text)` that calls `yaml.parseFrontmatter(text)` and returns `{frontmatter, body}`; on YAML failure rethrows the `E_INVALID_YAML` error with the original `details`.
  - Exports `validate(parsed)` that walks the parsed frontmatter object against the schema loaded synchronously from `cli/contract-schema.json`. On a violation, throws `{error, code, details}` with `code = 'E_INVALID_CONTRACT'` and `details = {rule, path, expected, actual}`.
  - Exports `loadAndValidate(path)` convenience that reads via `cli/lib/io.js` and calls `parse` then `validate`.
  - Rejection rules enumerated (each rule has its own error `details.rule` string and a paired bad fixture under `docs/contract-examples/bad/`):
    - `missing_version` - `anvil_contract_version` absent.
    - `wrong_version` - `anvil_contract_version` not equal to 1.
    - `missing_goal` - `goal` absent.
    - `missing_criteria` - `criteria` absent or empty.
    - `criterion_missing_id` - a criterion lacks `id`.
    - `criterion_missing_exists` - a criterion lacks the `exists` slot.
    - `criterion_missing_substantive` - a criterion lacks the `substantive` slot.
    - `criterion_missing_wired` - a criterion lacks the `wired` slot.
    - `criterion_missing_functional` - a criterion lacks the `functional` slot.
    - `criterion_empty_level` - one of the four level slots is an empty object.
    - `counter_example_not_string` - counter_examples value is not a string.
    - `unknown_top_level_key` - top-level key not in the allowed set (closed `additionalProperties`).
  - Adds error code `E_INVALID_CONTRACT` to `cli/lib/errors.js` (this task edits `cli/lib/errors.js` to append the new code to the frozen `CODES` object).
  - No `TODO`, `FIXME`, `XXX`, `HACK`, `TBD`, `WIP`, `NOTE:` markers. (source: 00_Architecture.md Section 6 Invariant 3)
  - Imports only from `fs`, `path`, `cli/lib/yaml.js`, `cli/lib/io.js`, `cli/lib/errors.js`.

- `dg-anvil/cli/lib/errors.js`
  - Append `E_INVALID_CONTRACT: 'E_INVALID_CONTRACT'` and `E_INVALID_PLAN: 'E_INVALID_PLAN'` to the frozen `CODES` object (Task 1.8 consumes the plan code; the additions are made here in one edit to keep the module's single-source-of-truth shape).
  - `Object.freeze` is reapplied.

- `dg-anvil/tests/unit/contract.test.js`
  - Uses `node:test` and `node:assert`.
  - For every file in `docs/contract-examples/good/`: asserts `loadAndValidate` returns without throwing.
  - For every file in `docs/contract-examples/bad/`: reads the paired `<basename>.meta.json` or the leading `#` rejection-rule comment, asserts `loadAndValidate` throws with matching `details.rule`.
  - Round-trip migration test: reads a good fixture, invokes `contract-migrate --in <fixture> --out <tmp>` via `child_process.spawnSync`, re-parses the output, asserts structural equality.
  - CommonJS.

#### Decisions already made

- Contract is YAML-plus-Markdown at `anvil/contract.yml`. (source: 05_The_Contract.md "What a Contract is")
- Every criterion has the four verification-level slots; a contract that does not parse into all four is rejected at save time. (source: 05_The_Contract.md "What a Contract is"; 02_Design_Thesis.md architectural consequence 1)
- Counter-examples are pulled from the Ledger and injected at contract-authoring time as a lesson-id -> text mapping. (source: 05_The_Contract.md Counter-examples; 06_The_Ledger.md "How the Ledger is queried")
- Schema version label in frontmatter is `anvil_contract_version: 1`; missing version is a structured parse error, not a default. (source: 00_Architecture.md Section 5 Schema versioning rules)
- Error JSON shape is `{error, code, details}`; error codes are stable strings in `cli/lib/errors.js`; additions are additive and must be registered when introduced. (source: 00_Architecture.md Section 3 Error format)
- `E_INVALID_CONTRACT` is introduced by this task; `E_INVALID_PLAN` is introduced by Task 1.8; both are appended in the same edit to `cli/lib/errors.js` to preserve the module's frozen-object shape. (source: 00_Architecture.md Section 3 Error format "additive")
- Every bad fixture has a comment at the top (or a paired `.meta.json` file) naming the rejection rule and the expected error code. (source: 00_Architecture.md Section 7 Fixture discipline)
- No unshipped markers in shipped source. (source: 00_Architecture.md Section 6 Invariant 3)

#### Tests or fixtures

- `dg-anvil/tests/unit/contract.test.js` authored above.
- Fixture files in `docs/contract-examples/good/` (Task 1.12) and `docs/contract-examples/bad/` (Task 1.12).

#### Verification command

```
node --test dg-anvil/tests/unit/contract.test.js
```

Expected exit 0.

#### Done when

`cli/lib/contract.js` loads, `parse` delegates to `yaml.parseFrontmatter`, `validate` rejects every rule listed above with a matching `details.rule` string, and `tests/unit/contract.test.js` runs green against the Task 1.12 fixtures.

### Task 1.8: Author the plan parser and validator

#### Goal

Ship `cli/lib/plan.js` with `parse(text)` and `validate(obj, contract)`. Validation includes the schema pass and domain rules: every task cites at least one contract criterion id that the passed-in contract object actually declares; `depends_on` references existing task ids; the `wave` integers plus `depends_on` form a topologically sortable DAG (no cycles, no forward references across waves).

#### Inputs

- `reports/Anvil-Design/03_The_Core_Loop.md` phase 3 and Hard gates.
- `reports/Anvil-Design/04_Anatomy.md` Five primitives table; Seven skills table row 2.
- `reports/Anvil-Design/10_Anti-Patterns_Defeated.md` row 26.
- `reports/DG-Anvil/00_Architecture.md` Section 3 (Error format), Section 5, Section 6 (Invariants 3, 5, 7).
- `dg-anvil/cli/plan-schema.json` (from Task 1.5).
- `dg-anvil/cli/lib/yaml.js` (from Task 1.1).
- `dg-anvil/cli/lib/errors.js` (extended in Task 1.7 with `E_INVALID_PLAN`).

#### Outputs

- `dg-anvil/cli/lib/plan.js`
  - Exports `parse(text)` that calls `yaml.parse(text)`. A plan file is pure YAML (no frontmatter body).
  - Exports `validate(parsed, contract)` where `contract` is the parsed-and-validated contract object from `cli/lib/contract.js`. On any violation, throws `{error, code, details}` with `code = 'E_INVALID_PLAN'` and `details = {rule, path, expected, actual}`.
  - Exports `topologicalWaves(tasks)` that returns an array of arrays; each inner array is the set of task ids in one wave in topological order. Throws `E_INVALID_PLAN` with `details.rule = 'cyclic_dependency'` on a cycle.
  - Exports `loadAndValidate(path, contract)` convenience.
  - Rejection rules enumerated (each rule has a paired bad fixture):
    - `missing_version` - `anvil_plan_version` absent.
    - `wrong_version` - not equal to 1.
    - `missing_tasks` - `tasks` absent or empty.
    - `task_missing_id` - a task lacks `id`.
    - `task_missing_wave` - a task lacks `wave`.
    - `task_missing_criterion_ids` - a task lacks `criterion_ids`.
    - `task_empty_criterion_ids` - `criterion_ids` is an empty array.
    - `task_unknown_criterion_id` - a task cites a criterion id the contract does not declare.
    - `task_unknown_depends_on` - a task's `depends_on` entry is not an existing task id.
    - `cyclic_dependency` - `depends_on` forms a cycle.
    - `forward_wave_reference` - a task in wave `k` depends on a task in wave `>= k`.
    - `unknown_top_level_key` - top-level key not in the allowed set.
  - Imports only from `fs`, `path`, `cli/lib/yaml.js`, `cli/lib/io.js`, `cli/lib/errors.js`.
  - No unshipped markers.

- `dg-anvil/tests/unit/plan.test.js`
  - Uses `node:test` and `node:assert`.
  - For every file in `docs/plan-examples/good/`: asserts `loadAndValidate` returns without throwing against the paired good contract (named by the fixture's `#` header line or `.meta.json`).
  - For every file in `docs/plan-examples/bad/`: asserts `loadAndValidate` throws with matching `details.rule`.
  - Round-trip `plan-migrate` test: read good fixture, spawn `anvil plan-migrate --in <fixture> --out <tmp>`, re-parse, assert structural equality.
  - Separate test block for `topologicalWaves`: positive DAG (returns ordered waves); cycle (throws `cyclic_dependency`); forward-wave reference (throws `forward_wave_reference`).
  - CommonJS.

#### Decisions already made

- Every plan task must cite at least one contract criterion id; tasks without citations do not execute. (source: 03_The_Core_Loop.md Hard gates; 10_Anti-Patterns_Defeated.md row 26)
- Plan is an atomic task DAG with wave ordering. (source: 04_Anatomy.md Five primitives table)
- Topological sort is part of the plan validator because a wave ordering that violates DAG constraints is not a valid plan. (source: 03_The_Core_Loop.md Parallelism "Waves are topologically sorted")
- `E_INVALID_PLAN` is the error code; added to `cli/lib/errors.js` in Task 1.7. (source: 00_Architecture.md Section 3 Error format)
- Rejection rules here are the canonical list for Stage 1 validator coverage. (source: 00_Architecture.md Section 7 Fixture tests "Rejection rules have dedicated tests")

#### Tests or fixtures

- `dg-anvil/tests/unit/plan.test.js` authored above.
- Fixture files in `docs/plan-examples/good/` and `docs/plan-examples/bad/` (Task 1.13).

#### Verification command

```
node --test dg-anvil/tests/unit/plan.test.js
```

Expected exit 0.

#### Done when

`cli/lib/plan.js` loads, `validate` rejects every rule listed above with a matching `details.rule` string, `topologicalWaves` returns ordered waves or throws structured errors, and `tests/unit/plan.test.js` runs green against the Task 1.13 fixtures.

### Task 1.9: Author the ledger read-only module

#### Goal

Ship `cli/lib/ledger.js` as a read-only module that loads `~/.anvil/ledger.jsonl` and `~/.anvil/ledger.index.json` and exposes `query(pattern)` returning ranked candidate lessons. The write path throws `E_NOT_IMPLEMENTED` and is finalized in Stage 3.

#### Inputs

- `reports/Anvil-Design/06_The_Ledger.md` (all sections; canonical lesson shape; index behaviour; convergence model).
- `reports/DG-Anvil/00_Architecture.md` Section 4 (Stage 1 produces; Stage 3 produces), Section 5 (Schema authoring source for Ledger), Section 6 (Invariants 11, 15, 17).
- `dg-anvil/cli/ledger-schema.json` (Stage 0 frozen draft).
- `dg-anvil/cli/lib/yaml.js`, `dg-anvil/cli/lib/io.js`, `dg-anvil/cli/lib/errors.js`.

#### Outputs

- `dg-anvil/cli/lib/ledger.js`
  - Exports `load({ledgerPath, indexPath})` returning `{lessons: object[], index: object}`. If either path does not exist, returns `{lessons: [], index: {}}` (first-run case; no error).
  - Exports `query(pattern, {ledgerPath, indexPath, limit})` returning an array of up to `limit` lesson objects ranked by the pattern-overlap heuristic described below. `limit` default is 5 per `06_The_Ledger.md` "Up to five lessons are injected".
  - Pattern-overlap ranking: score = count of tokens in `pattern` argument that appear in the lesson's `pattern` array, with ties broken by more recent `created` first.
  - Default `ledgerPath` resolves to `path.join(os.homedir(), '.anvil', 'ledger.jsonl')`; default `indexPath` resolves to `path.join(os.homedir(), '.anvil', 'ledger.index.json')`.
  - Exports `append()` that throws `E_NOT_IMPLEMENTED` with `details = {stage: 1, finalized_in: 3}`.
  - Exports `updateIndex()` that throws `E_NOT_IMPLEMENTED` with the same `details`.
  - The string literal `~/.anvil/ledger.jsonl` does not appear here; the path is composed via `os.homedir()` + `path.join`. Invariant 17's single-writer check is that the append path is inside `cli/lib/ledger-write.js` (Stage 3), not here. At Stage 1 this module does not write.
  - Imports only from `fs`, `path`, `os`, `cli/lib/errors.js`.

- `dg-anvil/cli/anvil.js`
  - Replace the Stage 0 `stubLedger` sub-subcommand `query` branch with a handler that:
    - Parses `--limit <integer>` (default 5) and positional `<pattern>` via `cli/lib/args.js`.
    - Calls `ledger.query(pattern, {limit})`.
    - Prints the returned lessons as JSON on stdout and exits 0.
  - Keep the `append` and `audit` sub-subcommand stubs returning `E_NOT_IMPLEMENTED` (Stage 3 finalizes).

- `dg-anvil/tests/unit/ledger.test.js`
  - Uses `node:test` and `node:assert`.
  - Fixture: an in-memory temp directory (`fs.mkdtempSync`) seeded with a minimal `ledger.jsonl` and `ledger.index.json`.
  - Positive tests: `query('rate-limit')` returns the matching lesson; multi-token query ranks by overlap; default limit caps at 5; empty store returns `[]` and does not throw.
  - Negative tests: `append({...})` throws `E_NOT_IMPLEMENTED`; `updateIndex()` throws `E_NOT_IMPLEMENTED`.
  - CommonJS.

#### Decisions already made

- Ledger storage shape: JSONL at `~/.anvil/ledger.jsonl` with a paired `~/.anvil/ledger.index.json`. (source: 06_The_Ledger.md "What the Ledger is"; 04_Anatomy.md File layout)
- Ledger is read-only at Stage 1; write and index maintenance finalize in Stage 3. (source: 00_Architecture.md Section 4 Stage 1 and Stage 3 produces rows)
- Query returns up to five lessons, ranked by pattern overlap. (source: 06_The_Ledger.md "How the Ledger is queried")
- Single-writer discipline: the literal path `~/.anvil/ledger.jsonl` appears only in `cli/lib/ledger-write.js` (Stage 3). `cli/lib/ledger.js` composes the path at call time via `os.homedir()` and does not encode the literal. (source: 00_Architecture.md Section 6 Invariant 17)
- At Stage 1, `append` and `updateIndex` throw `E_NOT_IMPLEMENTED` so Stage 3 has a clear finalization target. (source: 00_Architecture.md Section 4 Stage 1 consumes; Section 6 Invariant 15 anticipates enforcement in Stage 3)
- First-run behaviour returns empty store without error so `contracting` can run against a fresh user account. (source: 06_The_Ledger.md "Query" flow; 04_Anatomy.md Five primitives table)

#### Tests or fixtures

- `dg-anvil/tests/unit/ledger.test.js` authored above.

#### Verification command

```
node --test dg-anvil/tests/unit/ledger.test.js
```

Expected exit 0.

#### Done when

`cli/lib/ledger.js` exposes `load` and `query` (functional), `append` and `updateIndex` (throw `E_NOT_IMPLEMENTED`); `anvil ledger query <pattern>` returns a JSON array on stdout; `tests/unit/ledger.test.js` runs green.

### Task 1.10: Finalize the `contracting` skill

#### Goal

Replace the Stage 0 `skills/contracting/SKILL.md` stub with a finalized skill file whose six canonical sections are populated to match `03_The_Core_Loop.md` phase 2 and `05_The_Contract.md` "Who authors the contract". The skill embodies the four architectural consequences of `02_Design_Thesis.md`.

#### Inputs

- `reports/Anvil-Design/05_The_Contract.md` all sections.
- `reports/Anvil-Design/03_The_Core_Loop.md` phase 2 row; Hard gates "Contract parse".
- `reports/Anvil-Design/02_Design_Thesis.md` architectural consequences 1 and 4.
- `reports/Anvil-Design/10_Anti-Patterns_Defeated.md` rows 6, 9, 18, 22, 27.
- `reports/DG-Anvil/00_Architecture.md` Section 6 (Invariants 3, 4, 6, 8, 12).
- `dg-anvil/skills/contracting/SKILL.md` (Stage 0 stub with the six canonical headers and empty bodies).

#### Outputs

- `dg-anvil/skills/contracting/SKILL.md`
  - Six H2 headers in order: `## Overview`, `## When to Use`, `## Process`, `## Rationalizations`, `## Red Flags`, `## Verification`. No additional H2 headings.
  - `## Overview`: one paragraph stating the skill produces `anvil/contract.yml`; naming the four verification levels (Exists, Substantive, Wired, Functional) as grammatical slots that every criterion populates; naming counter-examples as Ledger output injected into the draft.
  - `## When to Use`: auto-invoked by `/start`; invoked by the orchestrator whenever a task stream lacks a confirmed `anvil/contract.yml`.
  - `## Process`: numbered steps mirroring `05_The_Contract.md` "Who authors the contract":
    1. Parse the user intent into `source_intent` and extract pattern tags.
    2. Query the Ledger via `anvil ledger query <pattern>` for matching lessons.
    3. Draft `anvil/contract.yml` with every criterion populating all four verification levels (Exists, Substantive, Wired, Functional). Substantive must name observable side effects, not prose.
    4. Inject the returned lessons as a `counter_examples` YAML section whose keys are lesson ids and values are each lesson's `remediation.counter_example_text` field verbatim. The `remediation.counter_example_text` field is guaranteed non-empty by Invariant 15 at ledger write time; the contracting skill does not fall back to other lesson fields. Sets `state.meta.contract_unconfirmed = true` when a draft contract is written; sets `state.meta.contract_unconfirmed = false` after user confirmation. State writes use `cli/lib/io.js writeFileUtf8` with atomic rename.
    5. Present the draft to the user for one-shot binary confirmation (accept or reject; no silent auto-pick).
    6. On accept, save the file and write `state.meta.contract_unconfirmed = false` via `cli/lib/io.js writeFileUtf8` with atomic rename. On reject, discard the intent; the user re-enters with a clearer prompt. The `meta.contract_unconfirmed` flag is the writer surface read by `hooks/user-prompt-submit` (Stage 4 Task 4.6) to route prompts to the `contracting` skill until the user has confirmed; the field is declared by `00_Architecture.md` Section 3 Runtime state file shape.
  - `## Rationalizations`: at least three verbatim-shaped entries, each ending with a taxonomy-row citation of the form `(failure-taxonomy row N)`. Required rows: 6 (Spec leak), 9 (Silent assumption-making), 27 (Spirit-versus-letter).
  - `## Red Flags`: at least three entries, each citing a failure-taxonomy row. Required rows: 18 (Description-field shortcut), 22 (Prompt injection via retrieved content), 24 (First-option silent pick).
  - `## Verification`: a numbered checklist the contracting skill runs before presenting the draft: `anvil contract --validate anvil/contract.yml` exits 0; every criterion's four verification-level slots are non-empty; `anvil ledger query` was run and the Counter-examples section reflects the top-five results.
  - No `TODO`, `FIXME`, `XXX`, `HACK`, `TBD`, `WIP`, `NOTE:` markers.
  - No persona phrasing (no "as a senior engineer", etc.).
  - Under 200 lines.

#### Decisions already made

- Six canonical skill sections in exact order. (source: 00_Architecture.md Section 6 Invariant 6)
- The `contracting` skill is the first skill invoked by `/start`. (source: 05_The_Contract.md "Who authors the contract")
- Process: parse intent, query Ledger, draft with four levels, inject counter-examples, one-shot binary confirm. (source: 05_The_Contract.md "Who authors the contract"; 03_The_Core_Loop.md phase 2)
- One-shot confirm is binary (accept or reject); rejected intents are discarded, not half-saved. (source: 05_The_Contract.md "Who authors the contract"; 00_Architecture.md Section 6 Invariant 16)
- Descriptions are triggers, never summaries. Each skill body must be read; the description does not substitute. (source: 10_Anti-Patterns_Defeated.md row 18)
- Every pressure test names the failure-taxonomy row it is stressing; Task 1.11 pairs this skill with `tests/pressure/contracting.pressure.js` citing row 9. (source: 00_Architecture.md Section 6 Invariant 8 and Invariant 12)
- Four architectural consequences embodied: machine-readable contract before execution; adversarial-ready grammar; failure produces a durable artefact via the Ledger. (source: 02_Design_Thesis.md)
- No persona phrasing. (source: 00_Architecture.md Section 6 Invariant 4)
- No unshipped markers. (source: 00_Architecture.md Section 6 Invariant 3)
- Counter-example text source is `remediation.counter_example_text` exclusively. (source: 06_The_Ledger.md "What a lesson is"; 00_Architecture.md Section 6 Invariant 15)
- The `contracting` skill is the sole writer of `state.meta.contract_unconfirmed`: sets `true` when a draft contract is written, sets `false` after user confirmation. The field is declared in `00_Architecture.md` Section 3 Runtime state file shape (which the orchestrator extends to declare the field) and is read by `hooks/user-prompt-submit` in Stage 4 Task 4.6 to route prompts to the `contracting` skill until the user has confirmed. The single-writer discipline honours the confirm-once human touchpoint. (source: 00_Architecture.md Section 3 Runtime state file shape; 03_The_Core_Loop.md "Human touchpoints")

#### Tests or fixtures

- `dg-anvil/tests/pressure/contracting.pressure.js` (Task 1.11) is the paired pressure test required by Invariant 8.

#### Verification command

```
awk '/^## /{print $0}' dg-anvil/skills/contracting/SKILL.md | tr '\n' '|' | grep -qE '^## Overview\|## When to Use\|## Process\|## Rationalizations\|## Red Flags\|## Verification\|$' && grep -qE 'row 9|taxonomy row 9' dg-anvil/skills/contracting/SKILL.md && grep -qE 'anvil ledger query' dg-anvil/skills/contracting/SKILL.md && test $(wc -l < dg-anvil/skills/contracting/SKILL.md) -lt 200
```

Expected exit 0.

#### Done when

`skills/contracting/SKILL.md` has the six canonical sections populated; cites the required failure-taxonomy rows; names `anvil ledger query` in the Process; is under 200 lines; has no forbidden markers or persona phrasing.

### Task 1.11: Author the `contracting` pressure test

#### Goal

Ship `tests/pressure/contracting.pressure.js` as the paired pressure test for the `contracting` skill. It cites failure-taxonomy row 9 (Silent assumption-making). The without-skill run is expected to produce a draft that silently picks one of several interpretations; the with-skill run is expected to surface the ambiguity as an explicit Criteria slot and request one-shot confirmation.

#### Inputs

- `reports/Anvil-Design/10_Anti-Patterns_Defeated.md` row 9 (Silent assumption-making).
- `reports/DG-Anvil/00_Architecture.md` Section 6 (Invariants 8, 12), Section 7 (Pressure test harness).
- `dg-anvil/tests/pressure/harness.js` (Stage 0 skeleton; `runPressure` exported).
- `dg-anvil/skills/contracting/SKILL.md` (from Task 1.10).

#### Outputs

- `dg-anvil/tests/pressure/contracting.pressure.js`
  - First line (comment): `// taxonomy row 9: Silent assumption-making`.
  - CommonJS: `const test = require('node:test'); const assert = require('node:assert'); const { runPressure } = require('../pressure/harness.js');`.
  - Declares a scenario with a deliberately ambiguous intent (e.g., "add caching" without specifying scope, eviction, or key schema).
  - `withoutSkill` expected outcome: the draft contract fills the four verification-level slots with one silently-chosen interpretation (assert the draft lacks an "ambiguities" or Counter-examples slot acknowledging the other interpretations).
  - `withSkill` expected outcome: the draft contract surfaces two or more candidate interpretations as distinct Criteria and the run ends at the one-shot confirm gate (assert the draft has `>= 2` criteria whose `statement` fields describe the candidate interpretations; assert the run does not auto-pick).
  - Uses `node:assert` for both outcomes.

#### Decisions already made

- Every pressure test cites the failure-taxonomy row it is stressing. (source: 00_Architecture.md Section 6 Invariant 12)
- `contracting` skill authored in Task 1.10 is paired with this pressure test in the same stage per Invariant 8. (source: 00_Architecture.md Section 6 Invariant 8)
- Row 9 (Silent assumption-making) is the canonical failure this skill addresses per `10_Anti-Patterns_Defeated.md` row 9. (source: 10_Anti-Patterns_Defeated.md row 9)
- Harness contract: `runPressure({ scenario, withSkill, withoutSkill })`; both runs dispatch a subagent; the without-skill run must fail in the expected way; the with-skill run must pass. (source: 00_Architecture.md Section 7 Pressure test harness)

#### Tests or fixtures

- The pressure test is itself the artefact this task produces.

#### Verification command

```
grep -qE 'taxonomy row 9|row 9' dg-anvil/tests/pressure/contracting.pressure.js && grep -qE "require\\(.*tests/pressure/harness" dg-anvil/tests/pressure/contracting.pressure.js && node --test dg-anvil/tests/pressure/contracting.pressure.js
```

Expected exit 0.

#### Done when

`tests/pressure/contracting.pressure.js` exists, cites row 9, imports `runPressure` from `tests/pressure/harness.js`, and `node --test` exits 0 against the harness' Stage 0 subagent dispatcher.

### Task 1.12: Author contract fixtures

#### Goal

Populate `docs/contract-examples/good/` with a minimum of three good fixtures and `docs/contract-examples/bad/` with a minimum of one bad fixture per rejection rule enumerated in Task 1.7. Each `.gitkeep` is removed in the same commit as the first real fixture in that directory.

#### Inputs

- `reports/Anvil-Design/05_The_Contract.md` Format section (canonical example).
- `reports/DG-Anvil/00_Architecture.md` Section 7 (Fixture discipline).
- Rejection rule list from Task 1.7 Outputs.

#### Outputs

- `dg-anvil/docs/contract-examples/good/rate-limit-001.yml`
  - The canonical example from `05_The_Contract.md` Format section, adapted to pass every rule in the finalized schema.
- `dg-anvil/docs/contract-examples/good/cache-add-002.yml`
  - A contract whose criteria cover a caching feature (two criteria, both with four populated levels).
- `dg-anvil/docs/contract-examples/good/auth-bugfix-003.yml`
  - A contract whose criteria cover a bug-fix task with invariants and one counter-example entry.
- `dg-anvil/docs/contract-examples/bad/missing-version-001.yml`
  - Leading `#` comment: `# rejection_rule: missing_version; expected_code: E_INVALID_CONTRACT`.
  - Body: contract missing `anvil_contract_version`.
- `dg-anvil/docs/contract-examples/bad/wrong-version-002.yml`
  - Rule: `wrong_version`. Body: `anvil_contract_version: 2`.
- `dg-anvil/docs/contract-examples/bad/missing-goal-003.yml`
  - Rule: `missing_goal`. Body lacks `goal`.
- `dg-anvil/docs/contract-examples/bad/missing-criteria-004.yml`
  - Rule: `missing_criteria`.
- `dg-anvil/docs/contract-examples/bad/criterion-missing-id-005.yml`
  - Rule: `criterion_missing_id`.
- `dg-anvil/docs/contract-examples/bad/criterion-missing-exists-006.yml`
  - Rule: `criterion_missing_exists`.
- `dg-anvil/docs/contract-examples/bad/criterion-missing-substantive-007.yml`
  - Rule: `criterion_missing_substantive`.
- `dg-anvil/docs/contract-examples/bad/criterion-missing-wired-008.yml`
  - Rule: `criterion_missing_wired`.
- `dg-anvil/docs/contract-examples/bad/criterion-missing-functional-009.yml`
  - Rule: `criterion_missing_functional`.
- `dg-anvil/docs/contract-examples/bad/criterion-empty-level-010.yml`
  - Rule: `criterion_empty_level`. One criterion has `substantive: {}`.
- `dg-anvil/docs/contract-examples/bad/counter-example-not-string-011.yml`
  - Rule: `counter_example_not_string`.
- `dg-anvil/docs/contract-examples/bad/unknown-top-level-key-012.yml`
  - Rule: `unknown_top_level_key`.
- Remove `dg-anvil/docs/contract-examples/good/.gitkeep` and `dg-anvil/docs/contract-examples/bad/.gitkeep` in the same commit as the first real fixture in each directory.

#### Decisions already made

- Minimum three good fixtures and minimum one bad fixture per rejection rule. (source: 00_Architecture.md Section 4 Stage 1 produces row)
- Fixture file names follow `<shape>-<id>.yml`. (source: 00_Architecture.md Section 2 File naming rules; Section 7 Fixture discipline)
- Every bad fixture has a leading `#` comment naming the rejection rule and expected error code. (source: 00_Architecture.md Section 7 Fixture discipline)
- The six Stage 0 `.gitkeep` sentinels are removed in the same commit as the first real fixture in each directory. (source: 00_Architecture.md Section 2 Empty-directory convention)
- Canonical example body comes from `05_The_Contract.md` Format section. (source: 00_Architecture.md Section 5 Schema authoring source)
- A good fixture that fails validation is a test failure; a bad fixture that passes is a test failure. (source: 00_Architecture.md Section 7 Fixture discipline)

#### Tests or fixtures

- `dg-anvil/tests/unit/contract.test.js` (Task 1.7) loads every file in these two directories and asserts the expected accept/reject behaviour.

#### Verification command

```
test $(ls dg-anvil/docs/contract-examples/good/*.yml 2>/dev/null | wc -l) -ge 3 && test $(ls dg-anvil/docs/contract-examples/bad/*.yml 2>/dev/null | wc -l) -ge 12 && ! test -f dg-anvil/docs/contract-examples/good/.gitkeep && ! test -f dg-anvil/docs/contract-examples/bad/.gitkeep && for f in dg-anvil/docs/contract-examples/bad/*.yml; do head -1 "$f" | grep -qE '^# rejection_rule:' || exit 1; done
```

Expected exit 0.

#### Done when

`docs/contract-examples/good/` contains at least three `.yml` files and `docs/contract-examples/bad/` contains at least twelve (one per rejection rule); each bad fixture's first line names the rule; both `.gitkeep` sentinels have been deleted.

### Task 1.13: Author plan fixtures

#### Goal

Populate `docs/plan-examples/good/` with a minimum of three good fixtures and `docs/plan-examples/bad/` with a minimum of one bad fixture per rejection rule enumerated in Task 1.8.

#### Inputs

- `reports/Anvil-Design/03_The_Core_Loop.md` phase 3.
- `reports/Anvil-Design/04_Anatomy.md` Five primitives table (Plan row).
- `reports/DG-Anvil/00_Architecture.md` Section 7 (Fixture discipline).
- Rejection rule list from Task 1.8 Outputs.
- The good contract fixtures from Task 1.12 (plans validate against a contract; each plan fixture names its paired contract fixture in a leading `#` comment).

#### Outputs

- `dg-anvil/docs/plan-examples/good/rate-limit-001.yml`
  - Leading comment names the paired contract fixture (`# contract: rate-limit-001.yml`).
  - Two tasks across two waves; each task cites the contract criterion id(s) it addresses.
- `dg-anvil/docs/plan-examples/good/cache-add-002.yml`
  - Three tasks across two waves; `depends_on` exercises the DAG path.
- `dg-anvil/docs/plan-examples/good/auth-bugfix-003.yml`
  - Single-task plan with `loop_cap: 5`.
- `dg-anvil/docs/plan-examples/bad/missing-version-001.yml` (rule `missing_version`).
- `dg-anvil/docs/plan-examples/bad/wrong-version-002.yml` (rule `wrong_version`).
- `dg-anvil/docs/plan-examples/bad/missing-tasks-003.yml` (rule `missing_tasks`).
- `dg-anvil/docs/plan-examples/bad/task-missing-id-004.yml` (rule `task_missing_id`).
- `dg-anvil/docs/plan-examples/bad/task-missing-wave-005.yml` (rule `task_missing_wave`).
- `dg-anvil/docs/plan-examples/bad/task-missing-criterion-ids-006.yml` (rule `task_missing_criterion_ids`).
- `dg-anvil/docs/plan-examples/bad/task-empty-criterion-ids-007.yml` (rule `task_empty_criterion_ids`).
- `dg-anvil/docs/plan-examples/bad/task-unknown-criterion-id-008.yml` (rule `task_unknown_criterion_id`).
- `dg-anvil/docs/plan-examples/bad/task-unknown-depends-on-009.yml` (rule `task_unknown_depends_on`).
- `dg-anvil/docs/plan-examples/bad/cyclic-dependency-010.yml` (rule `cyclic_dependency`).
- `dg-anvil/docs/plan-examples/bad/forward-wave-reference-011.yml` (rule `forward_wave_reference`).
- `dg-anvil/docs/plan-examples/bad/unknown-top-level-key-012.yml` (rule `unknown_top_level_key`).
- Remove `dg-anvil/docs/plan-examples/good/.gitkeep` and `dg-anvil/docs/plan-examples/bad/.gitkeep` in the same commit as the first real fixture in each directory.

#### Decisions already made

- Minimum three good and minimum one bad per rejection rule. (source: 00_Architecture.md Section 4 Stage 1 produces row)
- Every bad fixture's first line names the rule. (source: 00_Architecture.md Section 7 Fixture discipline)
- Each plan fixture names its paired contract fixture in a leading comment so the unit test can load the pair. (source: 00_Architecture.md Section 7 Fixture discipline extended to plans which must validate against a contract per Task 1.8 `validate(parsed, contract)` signature)
- `.gitkeep` removal rule. (source: 00_Architecture.md Section 2 Empty-directory convention)
- Plan primitive is an atomic task DAG with wave ordering; every task cites at least one contract criterion. (source: 04_Anatomy.md; 10_Anti-Patterns_Defeated.md row 26)

#### Tests or fixtures

- `dg-anvil/tests/unit/plan.test.js` (Task 1.8) loads every file here and asserts accept/reject behaviour.

#### Verification command

```
test $(ls dg-anvil/docs/plan-examples/good/*.yml 2>/dev/null | wc -l) -ge 3 && test $(ls dg-anvil/docs/plan-examples/bad/*.yml 2>/dev/null | wc -l) -ge 11 && ! test -f dg-anvil/docs/plan-examples/good/.gitkeep && ! test -f dg-anvil/docs/plan-examples/bad/.gitkeep && for f in dg-anvil/docs/plan-examples/bad/*.yml; do head -1 "$f" | grep -qE '^# rejection_rule:' || exit 1; done && for f in dg-anvil/docs/plan-examples/good/*.yml; do head -2 "$f" | grep -qE '^# contract:' || exit 1; done
```

Expected exit 0.

#### Done when

`docs/plan-examples/good/` contains at least three `.yml` files and `docs/plan-examples/bad/` contains at least eleven; each bad fixture names its rule; each good fixture names its paired contract fixture; both `.gitkeep` sentinels have been deleted.

### Task 1.14: Finalize the `planning` skill

#### Goal

Replace the Stage 0 `skills/planning/SKILL.md` stub with a finalized skill whose Process produces a task DAG with every task citing contract criterion ids; cite row 26 (Spec-to-plan drift) in Red Flags.

#### Inputs

- `reports/Anvil-Design/03_The_Core_Loop.md` phase 3; Hard gates "Task-to-contract citation"; Parallelism.
- `reports/Anvil-Design/04_Anatomy.md` Seven skills table row 2.
- `reports/Anvil-Design/10_Anti-Patterns_Defeated.md` rows 4, 10, 26.
- `reports/DG-Anvil/00_Architecture.md` Section 6 (Invariants 3, 4, 6, 8, 12).
- `dg-anvil/skills/planning/SKILL.md` (Stage 0 stub).

#### Outputs

- `dg-anvil/skills/planning/SKILL.md`
  - Six H2 headers in order.
  - `## Overview`: one paragraph stating the skill produces `anvil/plan.yml` as a task DAG with wave ordering; every task cites one or more contract criterion ids; tasks without citations are invalid.
  - `## When to Use`: invoked by the orchestrator after the contract is confirmed; not invoked from user prompts directly.
  - `## Process`: numbered steps:
    1. Read the confirmed `anvil/contract.yml`.
    2. Decompose the work into atomic tasks; "atomic" means the task produces one diff that one Verify pass can score.
    3. For every task, name the contract criterion id(s) the task is accountable for.
    4. Assign a `wave` integer; wave 0 has no `depends_on`; wave `k` tasks depend only on tasks in waves `< k`.
    5. Write `anvil/plan.yml` and validate via `anvil plan --validate anvil/plan.yml`.
    6. If validation fails, surface the rejection rule to the orchestrator; do not save.
  - `## Rationalizations`: at least three entries citing taxonomy rows. Required rows: 4 (Scope creep), 10 (Over-production), 26 (Spec-to-plan drift).
  - `## Red Flags`: at least three entries citing taxonomy rows. Required rows: 26 (Spec-to-plan drift), 4 (Scope creep), 17 (Cross-task architectural drift).
  - `## Verification`: `anvil plan --validate` exits 0; every task cites at least one contract criterion id that the contract actually declares; the task DAG is acyclic and wave-ordered.
  - Under 200 lines; no forbidden markers; no persona phrasing.

#### Decisions already made

- Six canonical skill sections in exact order. (source: 00_Architecture.md Section 6 Invariant 6)
- `planning` skill's core output: a task DAG with wave ordering where every task cites contract criterion ids. (source: 03_The_Core_Loop.md phase 3 and Hard gates; 10_Anti-Patterns_Defeated.md row 26)
- "Atomic task" means one diff scorable by one Verify pass. (source: 04_Anatomy.md Seven skills table row 3 "Diff + captured tool output in worktree" per task)
- Waves are topologically sorted. (source: 03_The_Core_Loop.md Parallelism)
- Every pressure test cites a failure-taxonomy row; Task 1.15 pairs this skill with `tests/pressure/planning.pressure.js` citing row 26. (source: 00_Architecture.md Section 6 Invariants 8 and 12)
- No persona phrasing; no forbidden markers. (source: 00_Architecture.md Section 6 Invariants 3 and 4)

#### Tests or fixtures

- `dg-anvil/tests/pressure/planning.pressure.js` (Task 1.15) is the paired pressure test required by Invariant 8.

#### Verification command

```
awk '/^## /{print $0}' dg-anvil/skills/planning/SKILL.md | tr '\n' '|' | grep -qE '^## Overview\|## When to Use\|## Process\|## Rationalizations\|## Red Flags\|## Verification\|$' && grep -qE 'row 26|taxonomy row 26' dg-anvil/skills/planning/SKILL.md && grep -qE 'anvil plan --validate' dg-anvil/skills/planning/SKILL.md && test $(wc -l < dg-anvil/skills/planning/SKILL.md) -lt 200
```

Expected exit 0.

#### Done when

`skills/planning/SKILL.md` has the six canonical sections populated; cites the required taxonomy rows; names `anvil plan --validate`; under 200 lines; no forbidden markers.

### Task 1.15: Author the `planning` pressure test

#### Goal

Ship `tests/pressure/planning.pressure.js` as the paired pressure test for the `planning` skill. Cites failure-taxonomy row 26 (Spec-to-plan drift). Without-skill run produces a plan that omits a contract criterion; with-skill run produces a plan whose tasks collectively cover every criterion in the contract.

#### Inputs

- `reports/Anvil-Design/10_Anti-Patterns_Defeated.md` row 26.
- `reports/DG-Anvil/00_Architecture.md` Section 6 (Invariants 8, 12), Section 7 (Pressure test harness).
- `dg-anvil/tests/pressure/harness.js`.
- `dg-anvil/skills/planning/SKILL.md` (from Task 1.14).

#### Outputs

- `dg-anvil/tests/pressure/planning.pressure.js`
  - First line: `// taxonomy row 26: Spec-to-plan drift`.
  - CommonJS: `const test = require('node:test'); const assert = require('node:assert'); const { runPressure } = require('../pressure/harness.js');`.
  - Scenario: a contract with three criteria (`C1`, `C2`, `C3`) where `C2` is a cross-cutting invariant that is easy to miss.
  - `withoutSkill` expected outcome: the generated plan cites only `C1` and `C3`; `C2` has no citing task.
  - `withSkill` expected outcome: every contract criterion id appears in at least one task's `criterion_ids`.
  - Asserts both outcomes via `node:assert`.

#### Decisions already made

- Every pressure test cites the failure-taxonomy row it is stressing. (source: 00_Architecture.md Section 6 Invariant 12)
- `planning` skill authored in Task 1.14 is paired in the same stage per Invariant 8. (source: 00_Architecture.md Section 6 Invariant 8)
- Row 26 (Spec-to-plan drift) is the canonical failure. (source: 10_Anti-Patterns_Defeated.md row 26)
- Harness contract: `runPressure({ scenario, withSkill, withoutSkill })`. (source: 00_Architecture.md Section 7 Pressure test harness)

#### Tests or fixtures

- The pressure test is itself the artefact.

#### Verification command

```
grep -qE 'taxonomy row 26|row 26' dg-anvil/tests/pressure/planning.pressure.js && grep -qE "require\\(.*tests/pressure/harness" dg-anvil/tests/pressure/planning.pressure.js && node --test dg-anvil/tests/pressure/planning.pressure.js
```

Expected exit 0.

#### Done when

`tests/pressure/planning.pressure.js` exists, cites row 26, imports `runPressure`, and `node --test` exits 0.

### Task 1.16: Wire the `anvil contract` and `anvil plan` subcommands

#### Goal

Replace the Stage 0 `stubContract` and `stubPlan` handlers in `cli/anvil.js` with functional dispatchers that call `cli/lib/contract.js` and `cli/lib/plan.js` for the subcommand shapes declared in `04_Anatomy.md`'s CLI table.

#### Inputs

- `reports/Anvil-Design/04_Anatomy.md` One CLI binary table.
- `reports/DG-Anvil/00_Architecture.md` Section 3 (Error format), Section 4 (Stage 1 produces row wired subcommands).
- `dg-anvil/cli/anvil.js` (Stage 0 dispatch skeleton).
- `dg-anvil/cli/lib/contract.js` (Task 1.7).
- `dg-anvil/cli/lib/plan.js` (Task 1.8).
- `dg-anvil/cli/lib/args.js` (Task 1.3).

#### Outputs

- `dg-anvil/cli/anvil.js`
  - `stubContract` replaced by a handler accepting:
    - `--from <intent>` - Stage 1 behaviour: prints `E_NOT_IMPLEMENTED` (contract authoring is invoked via `/start`, not as a CLI one-shot; Stage 1 leaves this path stubbed because the `contracting` skill is the authoring surface).
    - `--validate <file>` - loads and validates the file via `cli/lib/contract.js`; exits 0 on success with `{ok: true, criteria: <count>}` on stdout, exits 1 with the structured error on stderr on failure.
  - `stubPlan` replaced by a handler accepting:
    - `--from <contract>` - Stage 1 behaviour: prints `E_NOT_IMPLEMENTED` (plan authoring is invoked via the `planning` skill; CLI one-shot is not Stage 1 scope).
    - `--validate <file>` - loads `--contract <path>` (required companion flag) and validates the plan via `cli/lib/plan.js`; exits 0 with `{ok: true, tasks: <count>, waves: <count>}` on success.
  - Every other Stage 0 dispatch entry preserved unchanged.
  - The help string emitted by `--help` is extended to document the new `--validate` flags.

#### Decisions already made

- Subcommand shapes from `04_Anatomy.md` One CLI binary table: `anvil contract [--from <intent> | --validate <file>]`; `anvil plan [--from <contract>]`. (source: 04_Anatomy.md One CLI binary)
- Stage 1 wires the validation paths for both subcommands; the authoring paths (`--from`) remain stubbed because `/start` is the Stage 1 authoring surface, not a CLI one-shot. (source: 11_Implementation_Plan.md Stage 1; 04_Anatomy.md Five slash commands table)
- Every CLI subcommand exits 0 on success, non-zero with structured JSON error on stderr on failure. (source: 00_Architecture.md Section 3 Error format; Section 6 Invariant 5)
- `cli/lib/args.js` is the argument parser; unknown flags return `E_UNKNOWN_FLAG`. (source: 00_Architecture.md Section 3 CLI argument parsing)

#### Tests or fixtures

- `tests/unit/contract.test.js` (Task 1.7) includes end-to-end `anvil contract --validate <fixture>` tests via `child_process.spawnSync`.
- `tests/unit/plan.test.js` (Task 1.8) includes analogous `anvil plan --validate` tests.

#### Verification command

```
node dg-anvil/cli/anvil.js contract --validate dg-anvil/docs/contract-examples/good/rate-limit-001.yml && node dg-anvil/cli/anvil.js contract --validate dg-anvil/docs/contract-examples/bad/missing-version-001.yml; test $? -eq 1 && node dg-anvil/cli/anvil.js plan --validate dg-anvil/docs/plan-examples/good/rate-limit-001.yml --contract dg-anvil/docs/contract-examples/good/rate-limit-001.yml
```

Expected exit 0 on the last command; the middle assertion confirms the bad-fixture run exits 1.

#### Done when

`anvil contract --validate` and `anvil plan --validate` both run against Stage 1 fixtures and return the structured outcomes described above.

### Task 1.17: Author `commands/start.md`

#### Goal

Create `commands/start.md` - the `/start <intent>` command. It invokes the `contracting` skill with the user's intent inlined.

#### Inputs

- `reports/Anvil-Design/04_Anatomy.md` Five slash commands table (`/start <intent>` row).
- `reports/Anvil-Design/03_The_Core_Loop.md` phase 2.
- `reports/Anvil-Design/05_The_Contract.md` "Who authors the contract".
- `reports/DG-Anvil/00_Architecture.md` Section 4 (Stage 1 produces row for `commands/start.md`).

#### Outputs

- `dg-anvil/commands/start.md`
  - Frontmatter (YAML, fenced with triple-dash): `name: start`, `description: Begin a new task stream. Authors a contract from user intent via the contracting skill.`, `arguments: [intent]`.
  - Body: a short, imperative instruction that says exactly:
    1. Load the `contracting` skill file at `skills/contracting/SKILL.md`.
    2. Pass the user-provided `intent` argument to the skill's Process step 1.
    3. Let the `contracting` skill run its Process end-to-end; the one-shot confirmation at step 5 is the first human touchpoint.
  - No persona phrasing; no narrative preamble; no forbidden markers.

#### Decisions already made

- `/start <intent>` invokes `contracting`. (source: 04_Anatomy.md Five slash commands table; 05_The_Contract.md "Who authors the contract")
- The `contracting` skill's Process is the canonical flow; `/start` is the surface that calls it. (source: 03_The_Core_Loop.md phase 2; 05_The_Contract.md "Who authors the contract")
- Two human touchpoints total: contract confirm at `/start`, PR merge at `/ship`. `/start` does not gate beyond invoking `contracting`. (source: 03_The_Core_Loop.md Human touchpoints)
- No persona phrasing. (source: 00_Architecture.md Section 6 Invariant 4)

#### Tests or fixtures

- None at this task level. The paired pressure test for `contracting` (Task 1.11) indirectly exercises the `/start` path.

#### Verification command

```
test -f dg-anvil/commands/start.md && head -1 dg-anvil/commands/start.md | grep -q '^---$' && grep -qE 'name: start' dg-anvil/commands/start.md && grep -qE 'contracting' dg-anvil/commands/start.md
```

Expected exit 0.

#### Done when

`commands/start.md` exists, opens with a triple-dash frontmatter, names `start`, takes an `intent` argument, and directs execution to the `contracting` skill.

### Task 1.18: Author `commands/continue.md`

#### Goal

Create `commands/continue.md` - the `/continue` command skeleton. Reads `anvil/state.json` and returns `E_NOT_IMPLEMENTED` for task-level continuation (task continuation is Stage 2's concern).

#### Inputs

- `reports/Anvil-Design/04_Anatomy.md` Five slash commands table (`/continue` row).
- `reports/DG-Anvil/00_Architecture.md` Section 4 (Stage 1 produces row; Stage 2 produces row finalizes `commands/continue.md`).

#### Outputs

- `dg-anvil/commands/continue.md`
  - Frontmatter: `name: continue`, `description: Resume from saved state.`, `arguments: []`.
  - Body: imperative instructions:
    1. Read `anvil/state.json` via `cli/lib/io.js` `readFileUtf8`.
    2. If the file does not exist, exit with `{error: "no state to continue from", code: "E_NOT_IMPLEMENTED", details: {stage: 1, finalized_in: 2}}`.
    3. If the file exists, print its parsed contents and exit with `E_NOT_IMPLEMENTED` and `details = {stage: 1, finalized_in: 2}`.
  - No persona phrasing; no forbidden markers.

#### Decisions already made

- `/continue` reads `anvil/contract.yml` and `anvil/plan.yml` and picks up at the next incomplete task. (source: 04_Anatomy.md Five slash commands table)
- Task-level continuation is Stage 2's finalization target. (source: 00_Architecture.md Section 4 Stage 2 produces row for `commands/continue.md`; Stage 1 consumes; this task's scope bullet)
- Stage 1 ships the skeleton that reads state and returns `E_NOT_IMPLEMENTED` with structured details. (source: Stage 1 in-scope bullet; 00_Architecture.md Section 3 Error format initial codes)
- `anvil/state.json` path is the per-repo runtime state file. (source: 00_Architecture.md Section 2 Per-repository directory)

#### Tests or fixtures

- None. `/continue` is finalized in Stage 2.

#### Verification command

```
test -f dg-anvil/commands/continue.md && grep -qE 'name: continue' dg-anvil/commands/continue.md && grep -qE 'E_NOT_IMPLEMENTED' dg-anvil/commands/continue.md && grep -qE 'state.json' dg-anvil/commands/continue.md
```

Expected exit 0.

#### Done when

`commands/continue.md` exists with the required frontmatter, names `state.json` as the state file to read, and names `E_NOT_IMPLEMENTED` as the Stage 1 response for task continuation.

## Invariants Check

- Invariant 1 (No advisory hooks): Stage 1 adds no hooks. Hooks remain as Stage 0 set them. No new advisory behaviour introduced.
- Invariant 2 (No fallback light-paths): `cli/anvil.js` additions do not introduce `fast`, `quick`, `do`, `skip`, or `override` subcommands. `commands/start.md` and `commands/continue.md` do not declare light-paths. Verified by `grep -iE "(--fast|--quick|--skip|--override|/fast|/quick|/do|/skip|/override)" dg-anvil/cli dg-anvil/commands dg-anvil/skills` returning exit 1.
- Invariant 3 (No unshipped markers): `grep -rE "(TODO|FIXME|XXX|HACK|TBD|WIP|NOTE:)" dg-anvil/cli dg-anvil/hooks dg-anvil/skills dg-anvil/commands dg-anvil/tests dg-anvil/docs/contract-examples dg-anvil/docs/plan-examples` returns exit 1. `dg-anvil/docs/failure-taxonomy.md` (copy of the source table) is excluded from this check per Stage 0 Invariants Check. Fixture bad-example bodies that contain the literal string `TODO` inside a quoted scalar as a Substantive-probe negative example are permitted per Invariant 3's exemption clause.
- Invariant 4 (No persona definitions): `grep -rE "as a senior engineer|as a security auditor|as a test engineer|you are an expert in" dg-anvil/skills dg-anvil/commands dg-anvil/cli` returns exit 1.
- Invariant 5 (Structured errors on every exit): every Stage 1 CLI path - `contract --validate`, `plan --validate`, `ledger query`, `contract-migrate`, `plan-migrate` - writes `{error, code, details}` on error and returns non-zero, or returns structured JSON on stdout and exits 0. Verified by the unit tests in Task 1.7, 1.8, 1.9 and the `tests/unit/contract.test.js` and `tests/unit/plan.test.js` end-to-end CLI spawn blocks.
- Invariant 6 (Six canonical skill sections): `skills/contracting/SKILL.md` and `skills/planning/SKILL.md` both have the six H2 headers in order, no additional H2 headings. Verified by the awk header-extraction command on each file.
- Invariant 7 (Schema changes require a migration): `cli/contract-schema.json` and `cli/plan-schema.json` are finalized in this stage; `cli/anvil.js` exposes `contract-migrate` and `plan-migrate` as functional handlers (Task 1.6); `tests/unit/contract.test.js` and `tests/unit/plan.test.js` each include a migration round-trip test. Verified by the round-trip assertion in each unit test.
- Invariant 8 (Skill changes require RED-then-GREEN pressure transcript): Stage 1 finalizes `skills/contracting/SKILL.md` and `skills/planning/SKILL.md`. Both have paired pressure tests authored in the same stage: `tests/pressure/contracting.pressure.js` (Task 1.11) and `tests/pressure/planning.pressure.js` (Task 1.15). Verified by the existence and taxonomy-row citation checks.
- Invariant 9 (Polyglot hooks with graceful degradation): Stage 1 adds no hooks. Not modified.
- Invariant 10 (UTF-8 LF encoding): every file authored in Stage 1 is written UTF-8 without BOM with LF line endings. Verified by `file` inspection of a sample.
- Invariant 11 (Zero runtime dependencies): `package.json` `dependencies` and `devDependencies` remain empty. Task 1.1 through 1.9 import only Node builtins and `cli/lib/*.js`. Verified by `node -e "const p=require('./dg-anvil/package.json'); if(Object.keys(p.dependencies||{}).length||Object.keys(p.devDependencies||{}).length){process.exit(1)}"`.
- Invariant 12 (Failure-taxonomy row citation): `tests/pressure/contracting.pressure.js` cites row 9; `tests/pressure/planning.pressure.js` cites row 26. Verified by grep.
- Invariant 13 (Fresh-subagent discipline): Stage 1 adds no runtime subagent dispatch. `cli/lib/contract.js`, `cli/lib/plan.js`, `cli/lib/ledger.js` do not spawn subagents. Asserted as N/A at Stage 1 beyond test harness stubs.
- Invariant 14 (Evidence-only Court inputs): Stage 1 does not touch `cli/lib/court.js` (Stage 3). N/A at Stage 1.
- Invariant 15 (Null-lesson prohibition): Stage 1's ledger module is read-only; `append` throws `E_NOT_IMPLEMENTED`. Enforcement is Stage 3. N/A at Stage 1 beyond the "no writes" assertion.
- Invariant 16 (No auto-pick gates): `/start`'s Process step 5 one-shot confirm is binary (accept or reject). `commands/start.md` does not encode a list-of-N gate. Verified by the `contracting` pressure test asserting the with-skill run does not auto-pick.
- Invariant 17 (Single-writer discipline for the ledger): `cli/lib/ledger.js` does not contain the literal path `~/.anvil/ledger.jsonl`; paths are composed via `os.homedir()` + `path.join`. Verified by `grep -n '~/.anvil/ledger.jsonl' dg-anvil/cli/lib/ledger.js` returning exit 1. The write path is in `cli/lib/ledger-write.js`, which is Stage 3.
- Invariant 18 (Trace fields are closed): Stage 1 does not write trace events. N/A at Stage 1.

## Exit Criteria

```
set -e
# 1. Every Stage 1 produced file exists.
for f in \
  dg-anvil/cli/lib/contract.js \
  dg-anvil/cli/lib/plan.js \
  dg-anvil/cli/lib/ledger.js \
  dg-anvil/cli/lib/yaml.js \
  dg-anvil/cli/lib/args.js \
  dg-anvil/cli/contract-schema.json \
  dg-anvil/cli/plan-schema.json \
  dg-anvil/skills/contracting/SKILL.md \
  dg-anvil/skills/planning/SKILL.md \
  dg-anvil/commands/start.md \
  dg-anvil/commands/continue.md \
  dg-anvil/tests/unit/contract.test.js \
  dg-anvil/tests/unit/plan.test.js \
  dg-anvil/tests/unit/ledger.test.js \
  dg-anvil/tests/unit/yaml.test.js \
  dg-anvil/tests/pressure/contracting.pressure.js \
  dg-anvil/tests/pressure/planning.pressure.js; do test -f "$f"; done
# 2. Stage 0 .gitkeep sentinels in the four fixture dirs populated by Stage 1 are removed.
for d in docs/contract-examples/good docs/contract-examples/bad docs/plan-examples/good docs/plan-examples/bad; do test ! -f dg-anvil/$d/.gitkeep; done
# 3. Every good fixture validates; every bad fixture is rejected with the expected rule.
node --test dg-anvil/tests/unit/contract.test.js
node --test dg-anvil/tests/unit/plan.test.js
node --test dg-anvil/tests/unit/ledger.test.js
node --test dg-anvil/tests/unit/yaml.test.js
# 4. Pressure tests pass.
node --test dg-anvil/tests/pressure/contracting.pressure.js
node --test dg-anvil/tests/pressure/planning.pressure.js
# 5. Wired CLI subcommands behave.
node dg-anvil/cli/anvil.js contract --validate dg-anvil/docs/contract-examples/good/rate-limit-001.yml
set +e
node dg-anvil/cli/anvil.js contract --validate dg-anvil/docs/contract-examples/bad/missing-version-001.yml; rej=$?
set -e
test $rej -ne 0
node dg-anvil/cli/anvil.js plan --validate dg-anvil/docs/plan-examples/good/rate-limit-001.yml --contract dg-anvil/docs/contract-examples/good/rate-limit-001.yml
node dg-anvil/cli/anvil.js ledger query rate-limit
# 6. /start produces a valid contract and a valid plan against a test repository.
tmp=$(mktemp -d)
cp dg-anvil/docs/contract-examples/good/rate-limit-001.yml "$tmp/contract.yml"
cp dg-anvil/docs/plan-examples/good/rate-limit-001.yml "$tmp/plan.yml"
node dg-anvil/cli/anvil.js contract --validate "$tmp/contract.yml"
node dg-anvil/cli/anvil.js plan --validate "$tmp/plan.yml" --contract "$tmp/contract.yml"
# 7. Contract validator rejects every known-bad contract in docs/contract-examples/bad.
for f in dg-anvil/docs/contract-examples/bad/*.yml; do
  set +e
  node dg-anvil/cli/anvil.js contract --validate "$f" >/dev/null 2>&1
  rc=$?
  set -e
  test $rc -ne 0 || { echo "bad fixture accepted: $f"; exit 1; }
done
# 8. No unshipped markers in Stage 1 files outside the copied failure taxonomy.
! grep -rE "(TODO|FIXME|XXX|HACK|TBD|WIP|NOTE:)" dg-anvil/cli/lib/contract.js dg-anvil/cli/lib/plan.js dg-anvil/cli/lib/ledger.js dg-anvil/cli/lib/yaml.js dg-anvil/cli/lib/args.js dg-anvil/skills/contracting dg-anvil/skills/planning dg-anvil/commands dg-anvil/tests/unit dg-anvil/tests/pressure/contracting.pressure.js dg-anvil/tests/pressure/planning.pressure.js
# 9. The two Stage 1 skills have exactly the six canonical H2 headers.
for s in contracting planning; do
  headers=$(awk '/^## /{print $0}' dg-anvil/skills/$s/SKILL.md | tr '\n' '|')
  test "$headers" = "## Overview|## When to Use|## Process|## Rationalizations|## Red Flags|## Verification|"
done
# 10. Stage 0 produces that Stage 1 did not modify still pass Stage 0's exit-criteria checks.
node dg-anvil/cli/anvil.js --version >/dev/null
node dg-anvil/cli/anvil.js --help >/dev/null
node --test dg-anvil/tests/pressure/authoring-skills.pressure.js
# 11. Substantive check: the Process section of skills/contracting/SKILL.md invokes anvil ledger query (not only mentions the word ledger).
awk '/^## Process$/{flag=1; next} /^## /{flag=0} flag' dg-anvil/skills/contracting/SKILL.md | grep -q 'anvil ledger query'
# 12. Second substantive check: the Red Flags section of skills/contracting/SKILL.md contains the literal phrase "I already know what the user wants" (a row-9 silent-assumption defeater).
awk '/^## Red Flags/,/^## /{print}' dg-anvil/skills/contracting/SKILL.md | grep -q 'I already know what the user wants'
echo "stage 1 exit criteria: pass"
# Expected exit 0.
```

## Handoff to Next Stage

Stage 2 consumes from Stage 1 the items listed in Section 4 Stage 2 "Consumes from prior stage" column:

- produces `cli/lib/contract.js` for Stage 2 to use as the contract parser that `verifying` loads to map criteria to their four-level probes.
- produces `cli/lib/plan.js` for Stage 2 to use as the plan parser that the orchestrator loads to dispatch one subagent per task per wave.
- produces `cli/lib/ledger.js` for Stage 2 to use as the read path that `executing` queries (read-only) when staging task input; write path still throws in Stage 2.
- produces `cli/contract-schema.json` for Stage 2 to use as the finalized contract schema the executor references when inlining contract text into the per-task subagent brief.
- produces `cli/plan-schema.json` for Stage 2 to use as the finalized plan schema the dispatch path validates against before spawning worktrees.
- produces `commands/start.md` for Stage 2 to use as the entry point that kicks off the full loop; Stage 2 does not modify it.
- produces `commands/continue.md` for Stage 2 to finalize with task-level continuation logic (Stage 1 shipped the skeleton that throws `E_NOT_IMPLEMENTED`).

## Known Non-Goals for This Stage

- Worktree creation or management (Stage 2) (picked up in Stage 2).
- Subagent dispatch (Stage 2) (picked up in Stage 2).
- Verify probes (Stage 2) (picked up in Stage 2).
- Court dispatch (Stage 3) (picked up in Stage 3).
- Ledger write path or index maintenance on write (Stage 3) (picked up in Stage 3).
- `pre-tool-use`, `post-tool-use`, `user-prompt-submit`, `stop` hook behaviour (Stage 4) (picked up in Stage 4).
- Metrics (Stage 4) (picked up in Stage 4).
- Ship (Stage 4) (picked up in Stage 4).
- Final `README.md` content (Stage 4) (picked up in Stage 4).
