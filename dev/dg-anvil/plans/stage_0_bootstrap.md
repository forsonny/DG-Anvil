# Stage 0 Plan - Bootstrap

## Frontmatter

```yaml
stage: 0
stage_name: Bootstrap
prerequisites:
  architecture_doc: reports/DG-Anvil/00_Architecture.md
  anvil_design_sections:
    - 04_Anatomy.md
    - 11_Implementation_Plan.md
    - 02_Design_Thesis.md
    - 10_Anti-Patterns_Defeated.md
    - 05_The_Contract.md
    - 06_The_Ledger.md
    - 03_The_Core_Loop.md
  prior_stage_plan: null
produces:
  - cli/anvil.js
  - cli/lib/errors.js
  - cli/lib/args.js
  - cli/lib/io.js
  - cli/lib/yaml.js
  - cli/contract-schema.json
  - cli/plan-schema.json
  - cli/ledger-schema.json
  - .claude-plugin/plugin.json
  - hooks/hooks.json
  - hooks/run-hook.cmd
  - hooks/session-start
  - hooks/pre-tool-use
  - hooks/post-tool-use
  - hooks/user-prompt-submit
  - hooks/stop
  - skills/using-anvil/SKILL.md
  - skills/authoring-skills/SKILL.md
  - skills/contracting/SKILL.md
  - skills/planning/SKILL.md
  - skills/executing/SKILL.md
  - skills/verifying/SKILL.md
  - skills/judging/SKILL.md
  - skills/resetting/SKILL.md
  - package.json
  - .gitattributes
  - README.md
  - tests/pressure/harness.js
  - tests/pressure/authoring-skills.pressure.js
  - docs/failure-taxonomy.md
  - docs/anvil_workflow.svg
  - docs/contract-examples/good/.gitkeep
  - docs/contract-examples/bad/.gitkeep
  - docs/plan-examples/good/.gitkeep
  - docs/plan-examples/bad/.gitkeep
  - docs/ledger-examples/good/.gitkeep
  - docs/ledger-examples/bad/.gitkeep
```

## Scope

### In scope

- `cli/anvil.js` skeleton dispatching to stub handlers for every v1 subcommand.
- `cli/lib/errors.js` with the initial error-code set.
- `cli/lib/args.js` skeleton (finalized in Stage 1).
- `cli/lib/io.js` skeleton (finalized later).
- `cli/lib/yaml.js` skeleton with the parser contract (finalized in Stage 1).
- `cli/contract-schema.json` as a frozen draft.
- `cli/plan-schema.json` as a frozen draft.
- `cli/ledger-schema.json` as a frozen draft.
- `.claude-plugin/plugin.json` minimal manifest.
- `hooks/hooks.json` declaring the five hook events.
- `hooks/run-hook.cmd` Windows launcher (polyglot dispatcher).
- `hooks/session-start` bash script (polyglot, exit-0 on missing bash).
- `hooks/pre-tool-use` empty exit-0 stub.
- `hooks/post-tool-use` empty exit-0 stub.
- `hooks/user-prompt-submit` empty exit-0 stub.
- `hooks/stop` empty exit-0 stub.
- `skills/using-anvil/SKILL.md` finalized bootstrap meta-skill.
- `skills/authoring-skills/SKILL.md` finalized (with all six canonical sections).
- `skills/contracting/SKILL.md` stub with only the six canonical H2 headers.
- `skills/planning/SKILL.md` stub with only the six canonical H2 headers.
- `skills/executing/SKILL.md` stub with only the six canonical H2 headers.
- `skills/verifying/SKILL.md` stub with only the six canonical H2 headers.
- `skills/judging/SKILL.md` stub with only the six canonical H2 headers.
- `skills/resetting/SKILL.md` stub with only the six canonical H2 headers.
- `package.json` with Node 20+ engines floor and zero dependencies.
- `.gitattributes` with `* text=auto eol=lf`.
- `README.md` placeholder, one paragraph.
- `tests/pressure/harness.js` skeleton exporting `runPressure`.
- `tests/pressure/authoring-skills.pressure.js` paired pressure test for the `authoring-skills` meta-skill finalized this stage.
- `docs/failure-taxonomy.md` copy of `reports/Anvil-Design/10_Anti-Patterns_Defeated.md`.
- `docs/anvil_workflow.svg` copy of `reports/Anvil-Design/anvil_workflow.svg`.
- `docs/contract-examples/good/.gitkeep` zero-byte sentinel so the empty contract good-fixture directory is tracked.
- `docs/contract-examples/bad/.gitkeep` zero-byte sentinel so the empty contract bad-fixture directory is tracked.
- `docs/plan-examples/good/.gitkeep` zero-byte sentinel so the empty plan good-fixture directory is tracked.
- `docs/plan-examples/bad/.gitkeep` zero-byte sentinel so the empty plan bad-fixture directory is tracked.
- `docs/ledger-examples/good/.gitkeep` zero-byte sentinel so the empty ledger good-fixture directory is tracked.
- `docs/ledger-examples/bad/.gitkeep` zero-byte sentinel so the empty ledger bad-fixture directory is tracked.

### Out of scope

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

## Prerequisites Verification

No prior stage exists. The executing agent verifies only that the repository root is empty of the target paths before beginning, and that the required source reports are readable.

1. `test -d dg-anvil` - exit 1 (plugin root does not yet exist); if it exists, abort without writing.
2. `test -f reports/DG-Anvil/00_Architecture.md` - exit 0 (architecture document readable).
3. `test -f reports/Anvil-Design/04_Anatomy.md` - exit 0 (anatomy source readable).
4. `test -f reports/Anvil-Design/05_The_Contract.md` - exit 0 (contract canonical shape source readable).
5. `test -f reports/Anvil-Design/06_The_Ledger.md` - exit 0 (ledger canonical shape source readable).
6. `test -f reports/Anvil-Design/10_Anti-Patterns_Defeated.md` - exit 0 (failure taxonomy source readable).
7. `test -f reports/Anvil-Design/11_Implementation_Plan.md` - exit 0 (stage scope source readable).
8. `test -f reports/Anvil-Design/anvil_workflow.svg` - exit 0 (workflow diagram source readable).
9. `command -v node >/dev/null && node -e "process.exit(process.versions.node.split('.')[0] >= 20 ? 0 : 1)"` - exit 0 (Node 20+ available for the syntax check).

If any check fails, stop without writing any file.

## Phased Tasks

### Task 0.1: Create the complete source tree layout

#### Goal

Create every directory shown in the source tree so later tasks and later stages only add files, never directories.

#### Inputs

- `reports/DG-Anvil/00_Architecture.md` Section 2 (Source tree layout).

#### Outputs

- `dg-anvil/.claude-plugin/`
  - Empty directory.
- `dg-anvil/hooks/`
  - Empty directory.
- `dg-anvil/commands/`
  - Empty directory.
- `dg-anvil/skills/using-anvil/`
  - Empty directory.
- `dg-anvil/skills/authoring-skills/`
  - Empty directory.
- `dg-anvil/skills/contracting/`
  - Empty directory.
- `dg-anvil/skills/planning/`
  - Empty directory.
- `dg-anvil/skills/executing/`
  - Empty directory.
- `dg-anvil/skills/verifying/`
  - Empty directory.
- `dg-anvil/skills/judging/`
  - Empty directory.
- `dg-anvil/skills/resetting/`
  - Empty directory.
- `dg-anvil/cli/lib/`
  - Empty directory.
- `dg-anvil/docs/contract-examples/good/`
- `dg-anvil/docs/contract-examples/bad/`
- `dg-anvil/docs/plan-examples/good/`
- `dg-anvil/docs/plan-examples/bad/`
- `dg-anvil/docs/ledger-examples/good/`
- `dg-anvil/docs/ledger-examples/bad/`
- `dg-anvil/tests/unit/`
- `dg-anvil/tests/loop/`
- `dg-anvil/tests/pressure/`

#### Decisions already made

- The complete tree is committed at Stage 0. Later stages add files inside these directories and do not create new top-level directories. (source: 00_Architecture.md Section 2)
- File naming: lowercase with hyphens; `SKILL.md` is the only all-caps filename; hook files carry no extension on the Unix side; `.cmd` only on the Windows launcher. (source: 00_Architecture.md Section 2 File naming rules)

#### Tests or fixtures

- None. Structural task; verified by directory-existence check.

#### Verification command

```
find dg-anvil -type d | sort > /tmp/dg-anvil-dirs.txt && test $(wc -l < /tmp/dg-anvil-dirs.txt) -ge 22
```

Expected exit 0.

#### Done when

Every directory shown in Section 2 of the architecture document exists under `dg-anvil/`.

### Task 0.2: Commit encoding discipline and package manifest

#### Goal

Establish Node 20+ engine floor, zero dependencies, and UTF-8 LF encoding for the repository.

#### Inputs

- `reports/DG-Anvil/00_Architecture.md` Section 3 (Technology baseline and constraints).

#### Outputs

- `dg-anvil/package.json`
  - `"name": "dg-anvil"`.
  - `"version": "0.1.0"`.
  - `"engines": {"node": ">=20.0.0"}`.
  - `"dependencies": {}` (empty object, key present).
  - `"devDependencies": {}` (empty object, key present).
  - `"scripts": {"test": "node --test tests/**/*.test.js"}`.
  - `"main": "cli/anvil.js"`.
  - `"bin": {"anvil": "cli/anvil.js"}`.
  - `"license": "MIT"`.
- `dg-anvil/.gitattributes`
  - Single line: `* text=auto eol=lf`.
- `dg-anvil/LICENSE`
  - Placeholder; content is a standard MIT license text.
- `dg-anvil/CHANGELOG.md`
  - Placeholder; single H1 `# Changelog`, single H2 `## 0.1.0 - Bootstrap`, no bullet content.
- `dg-anvil/README.md`
  - Placeholder; a single paragraph naming the plugin and pointing at `reports/Anvil-Design/` for the design report. Stage 4 finalizes.

#### Decisions already made

- Node 20.0.0 minimum; engines floor recorded in `package.json`. (source: 00_Architecture.md Section 3 Runtime)
- Zero runtime and dev dependencies; testing uses Node's builtin `node:test` and `node:assert`. (source: 00_Architecture.md Section 3 Runtime)
- CommonJS, not ESM. (source: 00_Architecture.md Section 3 Runtime)
- UTF-8 without BOM; LF line endings; `.gitattributes` with `* text=auto eol=lf`. (source: 00_Architecture.md Section 3 File encoding)
- Test runner command is `node --test tests/**/*.test.js` from repository root. (source: 00_Architecture.md Section 7 Test runner)
- `README.md` is a placeholder at Stage 0 and is finalized in Stage 4. (source: 00_Architecture.md Section 4 Stage 4 row; Section 8 Stage 1 out-of-scope list)

#### Tests or fixtures

- None at Stage 0; unit tests arrive in later stages.

#### Verification command

```
node -e "const p=require('./dg-anvil/package.json'); if(!p.engines||p.engines.node!=='>=20.0.0'){process.exit(1)} if(Object.keys(p.dependencies||{}).length!==0){process.exit(1)} if(Object.keys(p.devDependencies||{}).length!==0){process.exit(1)}"
```

Expected exit 0.

#### Done when

`package.json` parses, declares the engines floor, and has empty dependencies and devDependencies; `.gitattributes` contains the single LF declaration; `LICENSE`, `CHANGELOG.md`, `README.md` exist as placeholders.

### Task 0.3: Author the initial error-code module

#### Goal

Create `cli/lib/errors.js` with the frozen Stage 0 error-code set and a structured error constructor used by every subcommand handler.

#### Inputs

- `reports/DG-Anvil/00_Architecture.md` Section 3 (Error format; Initial codes (Stage 0)).

#### Outputs

- `dg-anvil/cli/lib/errors.js`
  - Exports a frozen object `CODES` with keys: `E_NOT_IMPLEMENTED`, `E_UNKNOWN_SUBCOMMAND`, `E_UNKNOWN_FLAG`, `E_MISSING_ARG`, `E_INVALID_JSON`, `E_INVALID_YAML`, `E_IO`. Each value equals its key as a string.
  - Exports function `makeError(code, message, details)` returning an object of shape `{error: message, code: code, details: details ?? null}`.
  - Exports function `writeErrorAndExit(code, message, details)` that writes `JSON.stringify(makeError(code, message, details))` to stderr and calls `process.exit(1)`.
  - Module uses CommonJS `module.exports = { CODES, makeError, writeErrorAndExit }`.

#### Decisions already made

- Error JSON shape is `{error: string, code: string, details: object_or_null}`. (source: 00_Architecture.md Section 3 Error format)
- Error codes are stable strings defined in `cli/lib/errors.js`. (source: 00_Architecture.md Section 3 Error format)
- Initial Stage 0 codes: `E_NOT_IMPLEMENTED`, `E_UNKNOWN_SUBCOMMAND`, `E_UNKNOWN_FLAG`, `E_MISSING_ARG`, `E_INVALID_JSON`, `E_INVALID_YAML`, `E_IO`. (source: 00_Architecture.md Section 3 Error format)
- Later codes are additive; any new code must be registered in `cli/lib/errors.js` when introduced. (source: 00_Architecture.md Section 3 Error format)

#### Tests or fixtures

- None at Stage 0; `tests/unit/` coverage for library modules begins in Stage 1.

#### Verification command

```
node -e "const e=require('./dg-anvil/cli/lib/errors.js'); const ks=Object.keys(e.CODES); const need=['E_NOT_IMPLEMENTED','E_UNKNOWN_SUBCOMMAND','E_UNKNOWN_FLAG','E_MISSING_ARG','E_INVALID_JSON','E_INVALID_YAML','E_IO']; for(const k of need){if(e.CODES[k]!==k){process.exit(1)}} if(typeof e.makeError!=='function'||typeof e.writeErrorAndExit!=='function'){process.exit(1)}"
```

Expected exit 0.

#### Done when

`cli/lib/errors.js` loads under Node 20, exposes the seven codes as stable strings, and exposes the two helper functions.

### Task 0.4: Author the argument-parser skeleton

#### Goal

Create `cli/lib/args.js` as a skeleton that defines the parser contract for subcommand invocation; Stage 1 finalizes the implementation.

#### Inputs

- `reports/DG-Anvil/00_Architecture.md` Section 3 (CLI argument parsing).

#### Outputs

- `dg-anvil/cli/lib/args.js`
  - Exports `parse(argv, schema)` where `argv` is an array of strings (typically `process.argv.slice(2)`) and `schema` is an object with keys `positional` (array of positional names), `options` (object mapping long-flag names to option definitions with `type` in `string|boolean|number` and `required` boolean), and `shortAliases` (object mapping short flag to long-flag name).
  - Exports `ParseResult` shape: `{positional: string[], options: object, remainder: string[]}`.
  - Stage 0 body throws `makeError('E_NOT_IMPLEMENTED', 'args.parse not implemented in Stage 0', {stage: 0})` via `cli/lib/errors.js`.
  - Exposes exported constants: `LONG_FLAG_PREFIX = '--'`, `SHORT_FLAG_PREFIX = '-'`, `TERMINATOR = '--'`.
  - Module uses CommonJS `require` to import `cli/lib/errors.js` and `module.exports` to export.

#### Decisions already made

- No external argument parser. Minimal parser with positionals, long options (`--flag`, `--flag=value`), short options (`-f`), and `--` terminator. (source: 00_Architecture.md Section 3 CLI argument parsing)
- Every subcommand's argument shape is declared as a small schema object at the top of each subcommand handler. (source: 00_Architecture.md Section 3 CLI argument parsing)
- Unknown options are rejected with a structured error, using code `E_UNKNOWN_FLAG`. (source: 00_Architecture.md Section 3 CLI argument parsing; Section 3 Error format initial codes)
- Stage 0 ships the skeleton; Stage 1 finalizes. (source: 00_Architecture.md Section 3 CLI argument parsing)

#### Tests or fixtures

- None at Stage 0; `tests/unit/args.test.js` would belong to the stage that finalizes the parser. Stage 0 does not ship `args.test.js` (not listed in the Stage 0 produces row). (source: 00_Architecture.md Section 4)

#### Verification command

```
node -e "const a=require('./dg-anvil/cli/lib/args.js'); if(typeof a.parse!=='function'){process.exit(1)} try{a.parse([],{positional:[],options:{},shortAliases:{}}); process.exit(1)}catch(err){const p=JSON.parse(JSON.stringify(err)); if(err.code!=='E_NOT_IMPLEMENTED' && (!err.error||!err.error.includes('not implemented'))){process.exit(1)}}"
```

Expected exit 0 (the skeleton throws `E_NOT_IMPLEMENTED` on any invocation).

#### Done when

`cli/lib/args.js` loads, exports `parse` and the three prefix constants, and throws `E_NOT_IMPLEMENTED` on call.

### Task 0.5: Author the I/O helper skeleton

#### Goal

Create `cli/lib/io.js` as a skeleton wrapping `child_process.spawnSync` with an argument-array interface; Stage 1 finalizes the body when the contract parser first spawns a verifier probe.

#### Inputs

- `reports/DG-Anvil/00_Architecture.md` Section 3 (Subprocess invocation).

#### Outputs

- `dg-anvil/cli/lib/io.js`
  - Exports `readFileUtf8(path)` returning a string via `fs.readFileSync(path, 'utf8')`. Implemented in Stage 0 because hook scripts and schema files are read as strings at Stage 0 to serve schema-exposing subcommands; the read path itself is trivial and has no parsing behaviour.
  - Exports `writeFileUtf8(path, content)` via `fs.writeFileSync(path, content, {encoding: 'utf8'})`. Implemented in Stage 0 for symmetry with `readFileUtf8`.
  - Exports `spawn(cmd, argsArray, options)` that wraps `child_process.spawnSync(cmd, argsArray, {encoding: 'utf8', ...options})` and returns `{stdout, stderr, status, error}`. Stage 0 body throws `E_NOT_IMPLEMENTED` because no subcommand actually spawns a child process at Stage 0.
  - Exports `shellInterpolationForbidden` constant set to `true` as a structural marker read by linters.
  - Module uses CommonJS; imports only from Node builtins `fs`, `child_process`, and from `cli/lib/errors.js`.

#### Decisions already made

- `cli/lib/io.js` wraps `child_process.spawnSync` with structured `stdout`, `stderr`, exit-code capture. (source: 00_Architecture.md Section 3 Subprocess invocation)
- Never shell-interpolate user input into a command string; always pass arguments as an array. (source: 00_Architecture.md Section 3 Subprocess invocation)
- Tool output is captured as-is; the orchestrator does not parse tool output with regex for control flow. (source: 00_Architecture.md Section 3 Subprocess invocation)
- Allowed Node builtins include `fs`, `fs/promises`, `path`, `child_process`. (source: 00_Architecture.md Section 3 Runtime)

#### Tests or fixtures

- None at Stage 0; `io` tests arrive with the stages that exercise the spawn path.

#### Verification command

```
node -e "const io=require('./dg-anvil/cli/lib/io.js'); if(typeof io.readFileUtf8!=='function'||typeof io.writeFileUtf8!=='function'||typeof io.spawn!=='function'){process.exit(1)} if(io.shellInterpolationForbidden!==true){process.exit(1)} try{io.spawn('node',['-e','0']); process.exit(1)}catch(err){if(err.code!=='E_NOT_IMPLEMENTED' && (!err.error||!err.error.includes('not implemented'))){process.exit(1)}}"
```

Expected exit 0.

#### Done when

`cli/lib/io.js` loads, `readFileUtf8` and `writeFileUtf8` read and write UTF-8 files, `spawn` throws `E_NOT_IMPLEMENTED`, and `shellInterpolationForbidden` is present and true.

### Task 0.6: Author the YAML reader skeleton

#### Goal

Create `cli/lib/yaml.js` as a skeleton declaring the supported YAML subset and the parser contract. Stage 1 finalizes the parser body.

#### Inputs

- `reports/DG-Anvil/00_Architecture.md` Section 3 (YAML).

#### Outputs

- `dg-anvil/cli/lib/yaml.js`
  - Exports `parse(source)` returning a plain object (the root mapping) or an array (the root sequence).
  - Exports `parseFrontmatter(source)` returning `{frontmatter: object, body: string}` by splitting on the first pair of triple-dash delimiters and parsing the frontmatter with `parse`.
  - Exports constant `SUPPORTED_SUBSET` as an array of strings: `['block-mapping', 'block-sequence', 'scalar-string', 'scalar-integer', 'scalar-boolean', 'scalar-null', 'frontmatter', 'triple-quoted-string', 'single-line-string', 'comments']`.
  - Exports constant `UNSUPPORTED` as an array: `['anchors', 'flow-style', 'tags-beyond-implicit-scalars']`.
  - Stage 0 body for `parse` and `parseFrontmatter` throws `E_NOT_IMPLEMENTED`.
  - Module imports only from `cli/lib/errors.js`.

#### Decisions already made

- YAML subset supported: block-style mappings and sequences; string, integer, boolean, null scalars; frontmatter with triple-dash delimiters; triple-quoted and single-line strings; comments. (source: 00_Architecture.md Section 3 YAML)
- No anchors, no flow style, no tags beyond implicit scalar types. (source: 00_Architecture.md Section 3 YAML)
- On a feature outside the subset, `cli/lib/yaml.js` throws a structured error with the line and column. (source: 00_Architecture.md Section 3 YAML)
- `cli/lib/yaml.js` is written in Stage 0 as a skeleton with the parser contract; finalized in Stage 1. (source: 00_Architecture.md Section 3 YAML)
- Parse failures use error code `E_INVALID_YAML`. (source: 00_Architecture.md Section 3 Error format initial codes)
- No npm YAML library; zero runtime dependencies. (source: 00_Architecture.md Section 3 YAML; Section 3 Runtime)

#### Tests or fixtures

- None at Stage 0. `tests/unit/yaml.test.js` ships in Stage 1 when the parser body is finalized. (source: 00_Architecture.md Section 4 Stage 1 produces)

#### Verification command

```
node -e "const y=require('./dg-anvil/cli/lib/yaml.js'); if(!Array.isArray(y.SUPPORTED_SUBSET)||!Array.isArray(y.UNSUPPORTED)){process.exit(1)} try{y.parse(''); process.exit(1)}catch(err){if(err.code!=='E_NOT_IMPLEMENTED'){process.exit(1)}} try{y.parseFrontmatter(''); process.exit(1)}catch(err){if(err.code!=='E_NOT_IMPLEMENTED'){process.exit(1)}}"
```

Expected exit 0.

#### Done when

`cli/lib/yaml.js` loads, exports the two functions and the two subset constants, and both functions throw `E_NOT_IMPLEMENTED`.

### Task 0.7: Author `cli/anvil.js` dispatching skeleton

#### Goal

Create the single CLI entry point that routes a subcommand token to a stub handler. Every stub returns `E_NOT_IMPLEMENTED` with enough structure that the orchestrator can be tested against the stubs.

#### Inputs

- `reports/Anvil-Design/04_Anatomy.md` (the "One CLI binary" table).
- `reports/DG-Anvil/00_Architecture.md` Section 3 (Error format), Section 4 (Stage 0 produces row), Section 5 (Schema files and version labels).

#### Outputs

- `dg-anvil/cli/anvil.js`
  - First line: `#!/usr/bin/env node`.
  - CommonJS `require` of `cli/lib/errors.js`.
  - Exports function `main(argv)` for test entry; when the file is invoked directly (`require.main === module`) calls `main(process.argv.slice(2))`.
  - `main(argv)` reads `argv[0]` as the subcommand token. If missing, writes `E_UNKNOWN_SUBCOMMAND` and exits 1. If unknown, writes `E_UNKNOWN_SUBCOMMAND` and exits 1. If known, calls the stub handler for that subcommand.
  - Subcommand dispatch table (maps subcommand token to stub handler function):
    - `contract` - `stubContract`
    - `plan` - `stubPlan`
    - `run` - `stubRun`
    - `verify` - `stubVerify`
    - `judge` - `stubJudge`
    - `ledger` - `stubLedger` (accepts second-positional subcommand `query`, `append`, `audit`; the ledger stub examines `argv[1]` and rejects unknown sub-subcommands with `E_UNKNOWN_SUBCOMMAND`; each known ledger sub-subcommand returns `E_NOT_IMPLEMENTED`)
    - `metrics` - `stubMetrics`
    - `audit` - `stubAudit`
    - `ship` - `stubShip`
    - `contract-migrate` - `stubContractMigrate`
    - `plan-migrate` - `stubPlanMigrate`
    - `ledger-migrate` - `stubLedgerMigrate`
  - Every stub writes `{error: "<subcommand> not implemented in Stage 0", code: "E_NOT_IMPLEMENTED", details: {stage: 0, subcommand: "<name>"}}` to stderr as a single-line JSON string, then exits 1.
  - Exit code discipline: 0 on success; 1 on any `E_*` error. (Stage 0 has no success path beyond `--help` and `--version`, which are permitted Stage 0 success paths below.)
  - Top-level flags: `--help` prints a fixed help string listing every subcommand and exits 0; `--version` prints the version string from `package.json` (read via `require('../package.json').version`) and exits 0.

#### Decisions already made

- The CLI binary is `anvil`; the source file is `cli/anvil.js`. (source: 04_Anatomy.md "One CLI binary"; 00_Architecture.md Section 2 source tree)
- Initial subcommands per the Anatomy table: `contract`, `plan`, `run`, `verify`, `judge`, `ledger query`, `ledger append`, `metrics`, `audit`, `ship`. (source: 04_Anatomy.md "One CLI binary")
- `ledger audit` is also a wired subcommand, added in Stage 3. The Stage 0 skeleton must include a `ledger audit` stub dispatch so later stages have a slot to finalize. (source: 00_Architecture.md Section 4 Stage 3 produces row)
- Three migration subcommands are required: `contract-migrate`, `plan-migrate`, `ledger-migrate`. (source: 00_Architecture.md Section 5 Schema versioning rules)
- Every CLI subcommand exits 0 on success or non-zero with `{error, code, details}` JSON on stderr on failure. (source: 00_Architecture.md Section 3 Error format)
- Stage 0 CLI returns `E_NOT_IMPLEMENTED` as a structured error for every subcommand, so later stages can be tested against stubs. (source: 11_Implementation_Plan.md Stage 0; 00_Architecture.md Section 4 Stage 0 produces row)
- No `/fast`, `/quick`, `/do`, `/skip`, `/override` commands or subcommand equivalents exist. (source: 00_Architecture.md Section 6 Invariant 2)
- No shell interpolation of arguments; subcommand routing is a plain string equality on `argv[0]`. (source: 00_Architecture.md Section 3 Subprocess invocation)

#### Tests or fixtures

- None at Stage 0. End-to-end subcommand tests arrive with each stage that wires the corresponding handler.

#### Verification command

```
node dg-anvil/cli/anvil.js contract 2>&1 1>/dev/null | node -e "let s='';process.stdin.on('data',d=>s+=d);process.stdin.on('end',()=>{const o=JSON.parse(s.trim());if(o.code!=='E_NOT_IMPLEMENTED'){process.exit(1)}})" && node dg-anvil/cli/anvil.js bogus 2>&1 1>/dev/null | node -e "let s='';process.stdin.on('data',d=>s+=d);process.stdin.on('end',()=>{const o=JSON.parse(s.trim());if(o.code!=='E_UNKNOWN_SUBCOMMAND'){process.exit(1)}})"
```

Expected exit 0: known subcommand returns `E_NOT_IMPLEMENTED`; unknown subcommand returns `E_UNKNOWN_SUBCOMMAND`.

#### Done when

`cli/anvil.js` dispatches to a stub for every subcommand in the dispatch table; `--help` and `--version` exit 0; all other invocations exit 1 with a structured JSON error on stderr.

### Task 0.8: Author the contract schema as a frozen draft

#### Goal

Ship `cli/contract-schema.json` as a parseable JSON Schema document that governs `anvil/contract.yml`. Stage 1 wires the validator; Stage 1 finalizes the schema.

#### Inputs

- `reports/Anvil-Design/05_The_Contract.md` "Format" section (canonical shape for the contract).
- `reports/DG-Anvil/00_Architecture.md` Section 5 (Schema files and version labels; Schema lifecycle across stages; Schema versioning rules; Schema authoring source).

#### Outputs

- `dg-anvil/cli/contract-schema.json`
  - Top-level `$schema` set to `https://json-schema.org/draft/2020-12/schema`.
  - Top-level `$id` set to `https://dg-anvil/schemas/contract-schema.json`.
  - `type: object`.
  - Required top-level keys (five, explicitly enumerated to match Stage 1 Task 1.4): `anvil_contract_version`, `goal`, `created`, `source_intent`, `criteria`. Additional optional top-level keys (`invariants`, `notes`, and any others named in the canonical "Format" section of `05_The_Contract.md`) are captured as optional properties, typed from context.
  - Property `anvil_contract_version`: `{"type": "integer", "const": 1}`.
  - Every criterion-shaped object in the schema includes a `levels` property with `type: array` and items restricted to the enum `["Exists", "Substantive", "Wired", "Functional"]`.
  - `additionalProperties: false` at every object where the canonical source enumerates the field set, so that unknown fields are rejected by the validator in Stage 1.
  - The file parses as valid JSON and passes `jq empty cli/contract-schema.json`.

#### Decisions already made

- Schema file is `cli/contract-schema.json`. (source: 00_Architecture.md Section 5 Schema files and version labels)
- Version label in YAML frontmatter is `anvil_contract_version: 1`. Integer, no decimals. Missing version is a structured parse error. (source: 00_Architecture.md Section 5 Schema files and version labels; Schema versioning rules)
- Stage 0 ships the schema as a frozen draft; Stage 1 wires the parser and validator and finalizes any open fields. (source: 00_Architecture.md Section 5 Schema lifecycle across stages)
- Canonical shape source is `reports/Anvil-Design/05_The_Contract.md` "Format" section. (source: 00_Architecture.md Section 5 Schema authoring source)
- The five required top-level contract keys are enumerated explicitly: `anvil_contract_version`, `goal`, `created`, `source_intent`, `criteria`. This set matches Stage 1 Task 1.4 exactly so the frozen draft does not drift from the final schema and no silent migration is introduced at Stage 1 handoff. (source: 05_The_Contract.md Format; reports/DG-Anvil/plans/stage_1_contract_and_plan.md Task 1.4)
- Four verification levels (Exists, Substantive, Wired, Functional) are grammatical slots, not optional annotations. A contract that does not parse into all four does not get saved. (source: 02_Design_Thesis.md Section "1. Success must be machine-readable before execution starts")
- Every schema bump is paired with a CLI migration subcommand (`contract-migrate`). (source: 00_Architecture.md Section 5 Schema versioning rules; also ensured by Task 0.7 stub dispatch.)

#### Tests or fixtures

- None at Stage 0. Good and bad contract fixtures arrive in Stage 1 under `docs/contract-examples/good/` and `docs/contract-examples/bad/`. (source: 00_Architecture.md Section 4 Stage 1 produces row)

#### Verification command

```
node -e "const fs=require('fs'); const s=JSON.parse(fs.readFileSync('dg-anvil/cli/contract-schema.json','utf8')); if(s.$schema!=='https://json-schema.org/draft/2020-12/schema'){process.exit(1)} if(!s.properties||!s.properties.anvil_contract_version||s.properties.anvil_contract_version.const!==1){process.exit(1)}"
```

Expected exit 0.

#### Done when

`cli/contract-schema.json` parses as JSON, names `anvil_contract_version: 1` as a required constant, and captures every field named in the canonical Format section.

### Task 0.9: Author the plan schema as a frozen draft

#### Goal

Ship `cli/plan-schema.json` as a parseable JSON Schema document synthesised from `03_The_Core_Loop.md` Plan phase, `04_Anatomy.md` Plan primitive, and `11_Implementation_Plan.md` Stage 1 text. Stage 1 wires the validator and finalizes.

#### Inputs

- `reports/Anvil-Design/03_The_Core_Loop.md` Plan phase row.
- `reports/Anvil-Design/04_Anatomy.md` Plan primitive.
- `reports/Anvil-Design/11_Implementation_Plan.md` Stage 1 text.
- `reports/DG-Anvil/00_Architecture.md` Section 5 (Schema authoring source for Plan).

#### Outputs

- `dg-anvil/cli/plan-schema.json`
  - Top-level `$schema: https://json-schema.org/draft/2020-12/schema`.
  - Top-level `$id: https://dg-anvil/schemas/plan-schema.json`.
  - `type: object`.
  - Required: `anvil_plan_version`.
  - Property `anvil_plan_version`: `{"type": "integer", "const": 1}`.
  - Shape: atomic task DAG with wave ordering (per `04_Anatomy.md` Plan primitive). Property `tasks: array` of task objects. Each task has `id` (string), `wave` (integer), `criterion_ids` (array of string, non-empty), `depends_on` (array of string task ids).
  - Property `waves: array` or derived from `tasks[].wave` at validation time; Stage 0 captures both shapes and Stage 1 selects the final one during wiring.
  - `additionalProperties: false` on task objects.
  - The file parses as valid JSON.

#### Decisions already made

- Schema file is `cli/plan-schema.json`; version label `anvil_plan_version: 1`. (source: 00_Architecture.md Section 5 Schema files and version labels)
- No single Anvil-Design section gives the full Plan shape. The Stage 0 plan synthesises from `03_The_Core_Loop.md`, `04_Anatomy.md`, and `11_Implementation_Plan.md`. The synthesised schema is the authoritative source, and Stage 1 contract-examples fixtures match it. (source: 00_Architecture.md Section 5 Schema authoring source)
- `planning` skill requires every plan task to cite contract criterion ids; plan with uncited criteria is invalid. (source: 10_Anti-Patterns_Defeated.md row 26)
- Plan is an atomic task DAG with wave ordering. (source: 04_Anatomy.md Five primitives table; 04_Anatomy.md Seven skills table)
- Stage 0 ships the schema as a frozen draft; Stage 1 finalizes. (source: 00_Architecture.md Section 5 Schema lifecycle across stages)

#### Tests or fixtures

- None at Stage 0. Good and bad plan fixtures arrive in Stage 1 under `docs/plan-examples/good/` and `docs/plan-examples/bad/`. (source: 00_Architecture.md Section 4 Stage 1 produces row)

#### Verification command

```
node -e "const fs=require('fs'); const s=JSON.parse(fs.readFileSync('dg-anvil/cli/plan-schema.json','utf8')); if(s.$schema!=='https://json-schema.org/draft/2020-12/schema'){process.exit(1)} if(!s.properties||!s.properties.anvil_plan_version||s.properties.anvil_plan_version.const!==1){process.exit(1)} if(!s.properties.tasks){process.exit(1)}"
```

Expected exit 0.

#### Done when

`cli/plan-schema.json` parses, declares the version constant, and captures the task-DAG shape with `criterion_ids` required per task.

### Task 0.10: Author the ledger schema as a frozen draft

#### Goal

Ship `cli/ledger-schema.json` as a parseable JSON Schema document for each line of the JSONL ledger file. Stage 3 finalizes the schema and the write path.

#### Inputs

- `reports/Anvil-Design/06_The_Ledger.md` "What a lesson is" section.
- `reports/DG-Anvil/00_Architecture.md` Section 5 (Ledger schema canonical source).

#### Outputs

- `dg-anvil/cli/ledger-schema.json`
  - Top-level `$schema: https://json-schema.org/draft/2020-12/schema`.
  - Top-level `$id: https://dg-anvil/schemas/ledger-schema.json`.
  - `type: object`. This schema governs one JSONL entry (one line).
  - Required: `anvil_ledger_entry_version`, plus every field the "What a lesson is" section names as required.
  - Property `anvil_ledger_entry_version`: `{"type": "integer", "const": 1}`.
  - Properties include `contract_gap`, `evidence`, `remediation` (all three are enforced non-null by `cli/lib/ledger-write.js` in Stage 3; schema declares them as required string fields). (source: 06_The_Ledger.md "What a lesson is"; 00_Architecture.md Section 6 Invariant 15)
  - `additionalProperties: true` at the top level, to honour "Ledger is backward-compatible forever; new fields are allowed". Ledger readers ignore unknown fields. (source: 00_Architecture.md Section 5 Schema versioning rules)
  - The file parses as valid JSON.

#### Decisions already made

- Schema file is `cli/ledger-schema.json`; version label per entry `anvil_ledger_entry_version: 1`. (source: 00_Architecture.md Section 5 Schema files and version labels)
- Canonical shape source is `reports/Anvil-Design/06_The_Ledger.md` "What a lesson is" section. (source: 00_Architecture.md Section 5 Schema authoring source)
- Ledger is backward-compatible forever; new fields allowed, removed fields forbidden. (source: 00_Architecture.md Section 5 Schema versioning rules)
- Stage 3 finalizes the schema and the write path. (source: 00_Architecture.md Section 5 Schema lifecycle across stages)
- Null-lesson prohibition: `contract_gap`, `evidence`, `remediation` must not be null or empty. Enforced in code in Stage 3. (source: 00_Architecture.md Section 6 Invariant 15)

#### Tests or fixtures

- None at Stage 0. Ledger fixtures arrive in Stage 3 under `docs/ledger-examples/good/` and `docs/ledger-examples/bad/`. (source: 00_Architecture.md Section 4 Stage 3 produces row)

#### Verification command

```
node -e "const fs=require('fs'); const s=JSON.parse(fs.readFileSync('dg-anvil/cli/ledger-schema.json','utf8')); if(s.$schema!=='https://json-schema.org/draft/2020-12/schema'){process.exit(1)} if(!s.properties||!s.properties.anvil_ledger_entry_version||s.properties.anvil_ledger_entry_version.const!==1){process.exit(1)} if(!s.required||s.required.indexOf('contract_gap')<0||s.required.indexOf('evidence')<0||s.required.indexOf('remediation')<0){process.exit(1)}"
```

Expected exit 0.

#### Done when

`cli/ledger-schema.json` parses, declares the version constant, names `contract_gap`, `evidence`, `remediation` as required, and allows additional top-level properties for backward compatibility.

### Task 0.11: Author the plugin manifest

#### Goal

Create `.claude-plugin/plugin.json` as the minimal plugin manifest loaded by Claude Code.

#### Inputs

- `reports/DG-Anvil/00_Architecture.md` Section 2 (Source tree).

#### Outputs

- `dg-anvil/.claude-plugin/plugin.json`
  - `"name": "dg-anvil"`.
  - `"version": "0.1.0"`.
  - `"description"`: a single sentence naming the plugin and pointing to `reports/Anvil-Design/` for the canonical design report. Description text does not contain any persona phrasing (no "as a senior engineer", no "you are an expert"). (source: 00_Architecture.md Section 6 Invariant 4)
  - The manifest file parses as valid JSON.

#### Decisions already made

- Minimal plugin manifest is a Stage 0 output. (source: 11_Implementation_Plan.md Stage 0; 00_Architecture.md Section 4 Stage 0 produces row)
- Manifest lives at `.claude-plugin/plugin.json`. (source: 00_Architecture.md Section 2 source tree)
- No persona phrasing in any prompt constant or description. (source: 00_Architecture.md Section 6 Invariant 4)

#### Tests or fixtures

- None at Stage 0.

#### Verification command

```
node -e "const p=require('./dg-anvil/.claude-plugin/plugin.json'); if(!p.name||!p.version||!p.description){process.exit(1)}"
```

Expected exit 0.

#### Done when

`.claude-plugin/plugin.json` exists, parses as JSON, names the plugin, and declares a persona-free description.

### Task 0.12: Author the hook bundle (polyglot with exit-0 stubs)

#### Goal

Create `hooks/hooks.json`, `hooks/run-hook.cmd`, and the five hook script files. All five hook script files ship as polyglot exit-0 stubs at Stage 0; their functional bodies (trace emission, using-anvil loading, tool-use policy, stop-replay, prompt routing) are authored in Stage 4. Every hook exits 0 when bash is unavailable.

#### Inputs

- `reports/DG-Anvil/00_Architecture.md` Section 3 (Hooks).
- `reports/Anvil-Design/04_Anatomy.md` "Five hooks (the enforcement layer)".
- `reports/DG-Anvil/00_Architecture.md` Section 6 (Invariant 9: Polyglot hooks with graceful degradation).

#### Outputs

- `dg-anvil/hooks/hooks.json`
  - Declares five hook events: `SessionStart`, `PreToolUse`, `PostToolUse`, `UserPromptSubmit`, `Stop`. For each event, records the invocation path (`run-hook.cmd` on Windows or the matching extensionless script path on Unix). Conforms to the Claude Code hooks manifest contract.
- `dg-anvil/hooks/run-hook.cmd`
  - Windows CMD launcher that:
    - Accepts the hook name as argv[1].
    - Locates git-bash by `where bash` (or `%ProgramFiles%\Git\bin\bash.exe`).
    - Calls bash with the script path.
    - If bash is not found, exits 0.
- `dg-anvil/hooks/session-start`
  - Stage 0 ships `hooks/session-start` as a polyglot exit-0 stub, identical in shape to the other four hooks. The trace-event emission and `using-anvil` loading behaviour are authored in Stage 4 Task 4.5b. (source: 00_Architecture.md Section 6 Invariant 1)
  - Bash script. Starts with `#!/usr/bin/env bash` and a portable guard `if ! command -v bash >/dev/null 2>&1; then exit 0; fi`.
  - Stage 0 body: single line after the bash guard `exit 0`. No `echo`, no `printf`, no stderr redirection, no stdout emission. The hook is a pure no-op at Stage 0.
- `dg-anvil/hooks/pre-tool-use`
  - Bash exit-0 stub. Single line after the bash guard: `exit 0`.
- `dg-anvil/hooks/post-tool-use`
  - Bash exit-0 stub.
- `dg-anvil/hooks/user-prompt-submit`
  - Bash exit-0 stub.
- `dg-anvil/hooks/stop`
  - Bash exit-0 stub.

#### Decisions already made

- Polyglot bash plus CMD. Bash scripts without extension (`session-start`, `pre-tool-use`, etc.). Windows launcher `run-hook.cmd` dispatches to bash via git-bash or falls back to exit 0. (source: 00_Architecture.md Section 3 Hooks)
- Pattern is identical to the superpowers reference under `superpowers-main/hooks/`. (source: 00_Architecture.md Section 3 Hooks)
- Every hook exits 0 when bash is unavailable. Hook absence never blocks a Claude Code session. (source: 00_Architecture.md Section 3 Hooks; Section 6 Invariant 9)
- At Stage 0, `pre-tool-use`, `post-tool-use`, `user-prompt-submit`, `stop` exist as exit-0 stubs only; functional enforcement is Stage 4. (source: 00_Architecture.md Section 8 Stage 0 out-of-scope)
- Hook bodies do not print advisory warnings that can be ignored; a hook either blocks or emits a structured event. Stage 0 stubs emit nothing, exit 0. (source: 00_Architecture.md Section 6 Invariant 1)
- Line endings in hook scripts are LF. (source: 00_Architecture.md Section 3 File encoding)

#### Tests or fixtures

- None at Stage 0. Hook behaviour tests arrive in Stage 4 when the hooks are finalized.

#### Verification command

```
test -f dg-anvil/hooks/hooks.json && test -f dg-anvil/hooks/run-hook.cmd && for h in session-start pre-tool-use post-tool-use user-prompt-submit stop; do test -f dg-anvil/hooks/$h || exit 1; done && node -e "JSON.parse(require('fs').readFileSync('dg-anvil/hooks/hooks.json','utf8'))" && ! grep -nE '^(echo|printf|[^#]*>&2|[^#]*1>&2)' dg-anvil/hooks/session-start dg-anvil/hooks/pre-tool-use dg-anvil/hooks/post-tool-use dg-anvil/hooks/user-prompt-submit dg-anvil/hooks/stop
```

Expected exit 0. The negated grep asserts the Stage 0 hook script bodies contain no `echo`, no `printf`, and no stderr redirection (`>&2` or `1>&2`).

#### Done when

All seven hook files exist; `hooks/hooks.json` parses as JSON; each extensionless hook script starts with the bash-availability guard; every Stage 0 hook body contains no `echo`, no `printf`, and no stderr redirection; `run-hook.cmd` exits 0 on bash-missing.

### Task 0.13: Author `using-anvil` bootstrap meta-skill

#### Goal

Finalize `skills/using-anvil/SKILL.md` as the bootstrap meta-skill loaded by `session-start`. Imperative, lists the seven other skills and the five primitives, under 200 lines.

#### Inputs

- `reports/Anvil-Design/04_Anatomy.md` (five primitives; seven skills; five hooks; five commands; file layout).
- `reports/Anvil-Design/11_Implementation_Plan.md` Stage 0 bullets (the specific constraints on `using-anvil`).

#### Outputs

- `dg-anvil/skills/using-anvil/SKILL.md`
  - Six H2 sections in order: `## Overview`, `## When to Use`, `## Process`, `## Rationalizations`, `## Red Flags`, `## Verification`.
  - `## Overview` names the five primitives (Contract, Plan, Loop, Ledger, Court) and lists the seven other skills (contracting, planning, executing, verifying, judging, resetting, authoring-skills). Lists the five commands (`/start`, `/continue`, `/ship`, `/abort`, `/ledger`). Imperative voice.
  - `## When to Use`: auto-loaded by `session-start`. Used any time a fresh session begins or after a compact/clear.
  - `## Process`: a numbered list of the canonical flow Contract -> Plan -> Execute -> Verify -> Judge -> Pass or Reset.
  - `## Rationalizations`: at least three verbatim-shaped entries citing rows 7, 24, 28 from the failure taxonomy.
  - `## Red Flags`: at least three entries citing rows 8, 14, 25 from the failure taxonomy.
  - `## Verification`: the procedure an agent uses to check whether it has the current contract in context; names `anvil contract --validate` as the authoritative check.
  - Under 200 lines.
  - No `TODO`, `FIXME`, `XXX`, `HACK`, `TBD`, `WIP`, `NOTE:` markers, or date-tagged comments.
  - No persona phrasing.

#### Decisions already made

- Every `skills/*/SKILL.md` file has exactly these H2 sections in this order: `Overview`, `When to Use`, `Process`, `Rationalizations`, `Red Flags`, `Verification`. No additional top-level sections. (source: 00_Architecture.md Section 6 Invariant 6)
- `using-anvil` is under 200 lines; imperative; lists the seven other skills and the five primitives. (source: 11_Implementation_Plan.md Stage 0)
- No advisory phrasing; no persona phrasing. (source: 00_Architecture.md Section 6 Invariants 1 and 4)
- Red-flag entries cite failure-taxonomy rows by number. (source: 00_Architecture.md Section 6 Invariant 12; 10_Anti-Patterns_Defeated.md)
- `skills/using-anvil/SKILL.md` is exempt from the paired-pressure-test rule: it is the bootstrap loader, loaded at session-start to enumerate the other skills, and enforces no runtime behaviour of its own. No pressure test is authored for `using-anvil`. (source: 00_Architecture.md Section 6 Invariant 8)

#### Tests or fixtures

- None. `using-anvil` is exempt from Invariant 8 per Section 6, so no paired pressure test file is authored. (source: 00_Architecture.md Section 6 Invariant 8)

#### Verification command

```
awk '/^## /{print NR": "$0}' dg-anvil/skills/using-anvil/SKILL.md | head -20
```

Expected stdout: the six canonical H2 headers in order, and nothing else at H2 level.

#### Done when

`skills/using-anvil/SKILL.md` has the six canonical H2 sections in order, is under 200 lines, names the five primitives, the seven other skills, the five commands, and has no forbidden markers.

### Task 0.14: Author `authoring-skills` meta-skill

#### Goal

Finalize `skills/authoring-skills/SKILL.md` with all six canonical sections populated. This is the meta-skill that governs every later skill change.

#### Inputs

- `reports/Anvil-Design/04_Anatomy.md` (Seven skills table row 7; "Policy: adding an eighth skill requires retiring one").
- `reports/Anvil-Design/10_Anti-Patterns_Defeated.md` row 18 (Description-field shortcut) and row 29 (Skill-proliferation drag).
- `reports/DG-Anvil/00_Architecture.md` Section 6 (Invariant 8: Skill changes require RED-then-GREEN pressure transcript; Invariant 12: Failure-taxonomy row citation).

#### Outputs

- `dg-anvil/skills/authoring-skills/SKILL.md`
  - Six H2 sections in order: `## Overview`, `## When to Use`, `## Process`, `## Rationalizations`, `## Red Flags`, `## Verification`.
  - `## Overview`: TDD-for-documentation; a skill change is not merged until a subagent pressure run fails without the change and passes with it.
  - `## When to Use`: whenever any other skill file is created or modified.
  - `## Process`: numbered steps naming the RED-then-GREEN discipline; name of the harness (`tests/pressure/harness.js`); where pressure tests live (`tests/pressure/<skill>.pressure.js`); requirement to cite a failure-taxonomy row.
  - `## Rationalizations`: at least three; include the description-field shortcut (row 18) and skill-proliferation drag (row 29).
  - `## Red Flags`: at least three; include missing failure-taxonomy citation; missing pressure test; skill description used as summary (row 18).
  - `## Verification`: the numbered binary checks the reviewer runs before accepting a skill change (pressure test file exists; both runs recorded; taxonomy row cited; description does not summarize the body).
  - No forbidden markers; no persona phrasing.
- `dg-anvil/tests/pressure/authoring-skills.pressure.js`
  - Imports `runPressure` from `tests/pressure/harness.js`.
  - Declares the failure-taxonomy row it is stressing: row 18 (Description-field shortcut).
  - Defines a scenario in which a subagent is asked to author a small change to an existing `SKILL.md` file.
  - The without-skill run (skill absent) is expected to produce a change that updates only the description field without updating the Process section.
  - The with-skill run (skill present) is expected to produce a change that updates the Process section consistent with the description change.
  - Asserts both outcomes using `node:assert`.
  - Module uses CommonJS `require` to import `runPressure` and `assert`.

#### Decisions already made

- `authoring-skills` enforces TDD-for-documentation: RED-then-GREEN subagent transcript. (source: 04_Anatomy.md Seven skills table; 11_Implementation_Plan.md Change control)
- Adding an eighth skill requires retiring one; the `authoring-skills` pressure test must ask "is this truly a new verb, or is it a new row in an existing skill?". (source: 04_Anatomy.md "Policy: adding an eighth skill requires retiring one")
- Descriptions are triggers, never summaries. (source: 10_Anti-Patterns_Defeated.md row 18)
- Every pressure test names the failure-taxonomy row it is stressing. (source: 00_Architecture.md Section 6 Invariant 12)
- Invariant 8: skill changes require RED-then-GREEN pressure transcript. (source: 00_Architecture.md Section 6 Invariant 8)

#### Tests or fixtures

- `dg-anvil/tests/pressure/authoring-skills.pressure.js` is authored in this task as the paired pressure test for `skills/authoring-skills/SKILL.md`. It imports `runPressure` from `tests/pressure/harness.js`, cites failure-taxonomy row 18, and asserts the without-skill/with-skill outcomes defined in Outputs. (source: 00_Architecture.md Section 4 Stage 0 produces row; Section 6 Invariant 8; Section 7 Pressure tests)

#### Verification command

```
awk '/^## /{print NR": "$0}' dg-anvil/skills/authoring-skills/SKILL.md && test -f dg-anvil/tests/pressure/authoring-skills.pressure.js && grep -qE 'taxonomy row 18|row 18' dg-anvil/tests/pressure/authoring-skills.pressure.js && grep -qE "require\\(.*tests/pressure/harness" dg-anvil/tests/pressure/authoring-skills.pressure.js && node --test dg-anvil/tests/pressure/authoring-skills.pressure.js
```

Expected exit 0: the SKILL.md shows the six canonical H2 headers in order; the pressure test exists, cites row 18, imports `runPressure` from `tests/pressure/harness.js`, and passes against the stub subagent dispatcher.

#### Done when

`skills/authoring-skills/SKILL.md` has the six canonical sections populated, names the RED-then-GREEN discipline, cites failure-taxonomy rows 18 and 29, and references the harness path; and `tests/pressure/authoring-skills.pressure.js` exists, cites row 18, imports `runPressure`, and `node --test` on it exits 0.

### Task 0.15: Stub the remaining six skills

#### Goal

Create `contracting`, `planning`, `executing`, `verifying`, `judging`, `resetting` skill files with only the six required H2 headers and empty section bodies. Later stages finalize each.

#### Inputs

- `reports/DG-Anvil/00_Architecture.md` Section 4 (Stage 0 produces; stub SKILL.md files for remaining six skills).
- `reports/DG-Anvil/00_Architecture.md` Section 6 (Invariant 6: canonical skill sections).

#### Outputs

- `dg-anvil/skills/contracting/SKILL.md`
  - Six H2 headers in order, empty bodies.
- `dg-anvil/skills/planning/SKILL.md`
  - Six H2 headers in order, empty bodies.
- `dg-anvil/skills/executing/SKILL.md`
  - Six H2 headers in order, empty bodies.
- `dg-anvil/skills/verifying/SKILL.md`
  - Six H2 headers in order, empty bodies.
- `dg-anvil/skills/judging/SKILL.md`
  - Six H2 headers in order, empty bodies.
- `dg-anvil/skills/resetting/SKILL.md`
  - Six H2 headers in order, empty bodies.
- Each file: no TODO/FIXME/XXX/HACK/TBD/WIP/NOTE markers; body under each header is empty (one blank line between headers is permitted).

#### Decisions already made

- Skill directory stubs for the remaining six skills: empty `SKILL.md` with only the six required headers. (source: 00_Architecture.md Section 4 Stage 0 produces)
- Canonical section order: Overview, When to Use, Process, Rationalizations, Red Flags, Verification. (source: 00_Architecture.md Section 6 Invariant 6)
- No forbidden markers in any shipped source file. (source: 00_Architecture.md Section 6 Invariant 3)

#### Tests or fixtures

- None. Each stub is finalized in its owning stage (Stage 1 for contracting/planning, Stage 2 for executing/verifying, Stage 3 for judging/resetting) with the paired pressure test.

#### Verification command

```
for s in contracting planning executing verifying judging resetting; do f=dg-anvil/skills/$s/SKILL.md; test -f "$f" || exit 1; awk '/^## /{print $0}' "$f" | tr '\n' '|' | grep -qE '^## Overview\|## When to Use\|## Process\|## Rationalizations\|## Red Flags\|## Verification\|$' || exit 1; done
```

Expected exit 0.

#### Done when

All six stub SKILL.md files exist; each has exactly the six canonical headers in order; no section contains any content at Stage 0.

### Task 0.16: Author the pressure harness skeleton

#### Goal

Create `tests/pressure/harness.js` as the skeleton exporting `runPressure({ scenario, withSkill, withoutSkill })` and a stub subagent dispatcher the paired Stage 0 pressure test (`authoring-skills.pressure.js`) runs against. Stage 1 finalizes the real subagent dispatch path.

#### Inputs

- `reports/DG-Anvil/00_Architecture.md` Section 7 (Pressure test harness).

#### Outputs

- `dg-anvil/tests/pressure/harness.js`
  - Exports `runPressure(config)` with `config.scenario`, `config.withSkill`, `config.withoutSkill`.
  - Exports `TaxonomyCitationRequired` constant to be imported by pressure tests that want a literal constant for their taxonomy-row comment check.
  - Stage 0 body dispatches both the with-skill and without-skill runs through a stub subagent dispatcher whose output each pressure test's scenario fully specifies. Stage 1 replaces the stub dispatcher with the real subagent dispatch path.
  - Module uses CommonJS.

#### Decisions already made

- `tests/pressure/harness.js` exports `runPressure({ scenario, withSkill, withoutSkill })`. Both runs dispatch a subagent; the skill-absent run must fail; the skill-present run must pass. (source: 00_Architecture.md Section 7 Pressure test harness)
- Every pressure test names the failure-taxonomy row it is stressing. (source: 00_Architecture.md Section 6 Invariant 12)
- Stage 0 produces the harness as a skeleton. (source: 00_Architecture.md Section 4 Stage 0 produces row)

#### Tests or fixtures

- `dg-anvil/tests/pressure/authoring-skills.pressure.js` is the paired Stage 0 pressure test authored in Task 0.14 and consumes this harness. `contracting.pressure.js` and `planning.pressure.js` arrive in Stage 1. (source: 00_Architecture.md Section 4 Stage 0 and Stage 1 produces rows)

#### Verification command

```
node -e "const h=require('./dg-anvil/tests/pressure/harness.js'); if(typeof h.runPressure!=='function'){process.exit(1)} if(typeof h.TaxonomyCitationRequired==='undefined'){process.exit(1)}"
```

Expected exit 0.

#### Done when

`tests/pressure/harness.js` loads, exports `runPressure` and `TaxonomyCitationRequired`, and runs the paired `authoring-skills.pressure.js` against the stub subagent dispatcher to completion.

### Task 0.17: Copy failure taxonomy and workflow diagram into docs

#### Goal

Ship `docs/failure-taxonomy.md` as the v1 failure taxonomy (copy of `reports/Anvil-Design/10_Anti-Patterns_Defeated.md`) and `docs/anvil_workflow.svg` as the workflow diagram (copy of `reports/Anvil-Design/anvil_workflow.svg`). Stage 4 finalizes the taxonomy.

#### Inputs

- `reports/Anvil-Design/10_Anti-Patterns_Defeated.md` (the 30-row table).
- `reports/Anvil-Design/anvil_workflow.svg` (the workflow diagram).
- `reports/DG-Anvil/00_Architecture.md` Section 4 (Stage 0 produces; specific copy instructions).

#### Outputs

- `dg-anvil/docs/failure-taxonomy.md`
  - Exact copy of `reports/Anvil-Design/10_Anti-Patterns_Defeated.md` rendered as the v1 failure taxonomy, with LF endings and UTF-8 without BOM.
- `dg-anvil/docs/anvil_workflow.svg`
  - Exact copy of `reports/Anvil-Design/anvil_workflow.svg`. Binary-text (SVG) is permitted per the "no binary files except the SVG in `docs/`" allowance.

#### Decisions already made

- `docs/failure-taxonomy.md` is a copy of `reports/Anvil-Design/10_Anti-Patterns_Defeated.md` rendered as the v1 failure taxonomy. Stage 4 finalizes. (source: 00_Architecture.md Section 4 Stage 0 and Stage 4 produces rows)
- `docs/anvil_workflow.svg` is a copy of `reports/Anvil-Design/anvil_workflow.svg`. (source: 00_Architecture.md Section 4 Stage 0 produces row)
- SVG is the only binary file permitted. (source: 00_Architecture.md Section 6 Invariant 10)

#### Tests or fixtures

- None.

#### Verification command

```
test -f dg-anvil/docs/failure-taxonomy.md && test -f dg-anvil/docs/anvil_workflow.svg && diff -q reports/Anvil-Design/10_Anti-Patterns_Defeated.md dg-anvil/docs/failure-taxonomy.md && diff -q reports/Anvil-Design/anvil_workflow.svg dg-anvil/docs/anvil_workflow.svg
```

Expected exit 0 (diffs report identical files).

#### Done when

Both files exist under `dg-anvil/docs/` and are byte-identical copies of their `reports/Anvil-Design/` sources.

### Task 0.18: Author `.gitkeep` sentinels for the six empty fixture directories

#### Goal

Author a zero-byte `.gitkeep` file at each of the six fixture-directory paths so the empty directories are tracked by git and referenced by later tests.

#### Inputs

- `reports/DG-Anvil/00_Architecture.md` Section 2 (Empty-directory convention).
- `reports/DG-Anvil/00_Architecture.md` Section 4 (Stage 0 produces: the six `.gitkeep` entries).
- `reports/DG-Anvil/00_Architecture.md` Section 7 (Fixture discipline).

#### Outputs

- `dg-anvil/docs/contract-examples/good/.gitkeep`
  - Zero-byte file.
- `dg-anvil/docs/contract-examples/bad/.gitkeep`
  - Zero-byte file.
- `dg-anvil/docs/plan-examples/good/.gitkeep`
  - Zero-byte file.
- `dg-anvil/docs/plan-examples/bad/.gitkeep`
  - Zero-byte file.
- `dg-anvil/docs/ledger-examples/good/.gitkeep`
  - Zero-byte file.
- `dg-anvil/docs/ledger-examples/bad/.gitkeep`
  - Zero-byte file.

#### Decisions already made

- Directories that are empty at end of the creating stage but referenced by code or tests carry a zero-byte `.gitkeep`. The six fixture subdirectories listed in Outputs are the only Stage 0 instances. When a later stage adds a real fixture file, the `.gitkeep` is removed in the same commit. (source: 00_Architecture.md Section 2 Empty-directory convention)
- Stage 0 produces the six `.gitkeep` files explicitly; Section 4 Stage 0 produces row lists each by path. (source: 00_Architecture.md Section 4 Stage 0 produces row)
- Fixture file names follow `<shape>-<id>.yml` or `<shape>-<id>.jsonl`; `.gitkeep` is not a fixture and does not follow that pattern. Stage 0 ships no fixture files. (source: 00_Architecture.md Section 7 Fixture discipline; Section 4 Stage 0 produces row)

#### Tests or fixtures

- None at Stage 0. Fixtures populate in Stages 1 and 3; at that point the `.gitkeep` at each populated path is removed in the same commit as the first real fixture.

#### Verification command

```
for d in docs/contract-examples/good docs/contract-examples/bad docs/plan-examples/good docs/plan-examples/bad docs/ledger-examples/good docs/ledger-examples/bad; do test -f dg-anvil/$d/.gitkeep || exit 1; test ! -s dg-anvil/$d/.gitkeep || exit 1; done
```

Expected exit 0.

#### Done when

All six `.gitkeep` files exist at the exact paths listed in Outputs and each is zero bytes.

## Invariants Check

- Invariant 1 (No advisory hooks): `session-start` body either emits a structured event or blocks; the other four hook scripts exit 0 with no stdout. Stage 0 stubs do not print advisory warnings. Verified by inspecting the five hook scripts for any literal string containing "WARNING" or "note:" outside a structured JSON emission.
- Invariant 2 (No fallback light-paths): `cli/anvil.js` dispatch table contains no `fast`, `quick`, `do`, `skip`, or `override` subcommand. Verified by grep on `cli/anvil.js`.
- Invariant 3 (No unshipped markers): `grep -rE "(TODO|FIXME|XXX|HACK|TBD|WIP|NOTE:)" dg-anvil/cli dg-anvil/hooks dg-anvil/skills dg-anvil/commands dg-anvil/tests dg-anvil/docs` returns exit 1. Exempt: `dg-anvil/docs/failure-taxonomy.md` inherits the source text as-is; if the source contains any of these strings inside a table cell, that is not a marker in the invariant's sense. Verified by running the grep and manually confirming any hit is inside the copied taxonomy.
- Invariant 4 (No persona definitions): `grep -rE "as a senior engineer|as a security auditor|as a test engineer|you are an expert in" dg-anvil/` returns exit 1.
- Invariant 5 (Structured errors on every exit): every subcommand stub in `cli/anvil.js` writes `{error, code, details}` JSON on stderr and exits 1. Verified by invoking each stub and parsing stderr.
- Invariant 6 (Six canonical skill sections): every `skills/*/SKILL.md` has exactly the six H2 headers in the specified order. Verified by running the header-extraction awk script on each file.
- Invariant 7 (Schema changes require a migration): `cli/anvil.js` includes `contract-migrate`, `plan-migrate`, and `ledger-migrate` stub dispatches. No schema changed in this stage; this invariant is satisfied by the presence of the migration dispatch slots.
- Invariant 8 (Skill changes require RED-then-GREEN pressure transcript): Stage 0 authors `skills/authoring-skills/SKILL.md` and its paired `tests/pressure/authoring-skills.pressure.js` in the same stage; `skills/using-anvil/SKILL.md` is exempt per Section 6 Invariant 8 because it is the bootstrap loader and enforces no runtime behaviour of its own. The six Stage 0 stub SKILL.md files (`contracting`, `planning`, `executing`, `verifying`, `judging`, `resetting`) are empty-bodied and carry their paired pressure tests in the stages that finalize them. (source: 00_Architecture.md Section 4 Stage 0 produces row; Section 6 Invariant 8)
- Invariant 9 (Polyglot hooks with graceful degradation): `hooks/run-hook.cmd` exists; each `hooks/<event>` script begins with the bash-availability guard. Verified by head-inspection of each script.
- Invariant 10 (UTF-8 LF encoding): `.gitattributes` contains `* text=auto eol=lf`; Stage 0 writes all files in UTF-8 without BOM. Verified by `file` or equivalent for a sampled file.
- Invariant 11 (Zero runtime dependencies): `package.json` has `"dependencies": {}` and `"devDependencies": {}`. Verified by Task 0.2 command.
- Invariant 12 (Failure-taxonomy row citation): every pressure test names a row. Stage 0 authors `tests/pressure/authoring-skills.pressure.js`, which cites failure-taxonomy row 18 (Description-field shortcut). Verified by grepping the pressure test file for the row-18 citation string.
- Invariant 13 (Fresh-subagent discipline): applies to runtime code paths that dispatch subagents. Stage 0 has no such code path. Asserted as N/A at Stage 0.
- Invariant 14 (Evidence-only Court inputs): applies to `cli/lib/court.js`, which is Stage 3. Asserted as N/A at Stage 0.
- Invariant 15 (Null-lesson prohibition): applies to `cli/lib/ledger-write.js`, which is Stage 3. Asserted as N/A at Stage 0; the schema declares `contract_gap`, `evidence`, `remediation` as required to anticipate the Stage 3 code enforcement.
- Invariant 16 (No auto-pick gates): Stage 0 has no gates beyond `--help` and `--version`. Asserted as N/A at Stage 0.
- Invariant 17 (Single-writer discipline for the ledger): applies to `cli/lib/ledger-write.js`, which is Stage 3. Asserted as N/A at Stage 0; the path literal `~/.anvil/ledger.jsonl` does not appear in any Stage 0 source file.
- Invariant 18 (Trace fields are closed): trace event writing is Stage 4. Asserted as N/A at Stage 0; the field list in Section 3 is not hand-copied into any Stage 0 file.

## Exit Criteria

```
set -e
# 1. Every Stage 0 produced file exists.
for f in \
  dg-anvil/cli/anvil.js \
  dg-anvil/cli/lib/errors.js \
  dg-anvil/cli/lib/args.js \
  dg-anvil/cli/lib/io.js \
  dg-anvil/cli/lib/yaml.js \
  dg-anvil/cli/contract-schema.json \
  dg-anvil/cli/plan-schema.json \
  dg-anvil/cli/ledger-schema.json \
  dg-anvil/.claude-plugin/plugin.json \
  dg-anvil/hooks/hooks.json \
  dg-anvil/hooks/run-hook.cmd \
  dg-anvil/hooks/session-start \
  dg-anvil/hooks/pre-tool-use \
  dg-anvil/hooks/post-tool-use \
  dg-anvil/hooks/user-prompt-submit \
  dg-anvil/hooks/stop \
  dg-anvil/skills/using-anvil/SKILL.md \
  dg-anvil/skills/authoring-skills/SKILL.md \
  dg-anvil/skills/contracting/SKILL.md \
  dg-anvil/skills/planning/SKILL.md \
  dg-anvil/skills/executing/SKILL.md \
  dg-anvil/skills/verifying/SKILL.md \
  dg-anvil/skills/judging/SKILL.md \
  dg-anvil/skills/resetting/SKILL.md \
  dg-anvil/package.json \
  dg-anvil/.gitattributes \
  dg-anvil/README.md \
  dg-anvil/tests/pressure/harness.js \
  dg-anvil/tests/pressure/authoring-skills.pressure.js \
  dg-anvil/docs/failure-taxonomy.md \
  dg-anvil/docs/anvil_workflow.svg; do test -f "$f"; done
# 2. Every fixture directory has a zero-byte .gitkeep.
for d in docs/contract-examples/good docs/contract-examples/bad docs/plan-examples/good docs/plan-examples/bad docs/ledger-examples/good docs/ledger-examples/bad; do test -f dg-anvil/$d/.gitkeep && test ! -s dg-anvil/$d/.gitkeep; done
# 3. The CLI dispatches every subcommand to a stub returning E_NOT_IMPLEMENTED.
for sub in contract plan run verify judge ledger metrics audit ship contract-migrate plan-migrate ledger-migrate; do
  out=$(node dg-anvil/cli/anvil.js "$sub" 2>&1 >/dev/null)
  code=$(printf '%s' "$out" | node -e "let s='';process.stdin.on('data',d=>s+=d);process.stdin.on('end',()=>{try{console.log(JSON.parse(s.trim()).code)}catch(e){console.log('BAD')}}")
  test "$code" = "E_NOT_IMPLEMENTED"
done
# 4. Unknown subcommand returns E_UNKNOWN_SUBCOMMAND.
out=$(node dg-anvil/cli/anvil.js bogus 2>&1 >/dev/null)
code=$(printf '%s' "$out" | node -e "let s='';process.stdin.on('data',d=>s+=d);process.stdin.on('end',()=>{try{console.log(JSON.parse(s.trim()).code)}catch(e){console.log('BAD')}}")
test "$code" = "E_UNKNOWN_SUBCOMMAND"
# 5. package.json has zero dependencies and Node 20+ engines.
node -e "const p=require('./dg-anvil/package.json'); process.exit((p.engines&&p.engines.node==='>=20.0.0' && Object.keys(p.dependencies||{}).length===0 && Object.keys(p.devDependencies||{}).length===0)?0:1)"
# 6. Every skill has exactly the six canonical H2 headers in order.
for s in using-anvil authoring-skills contracting planning executing verifying judging resetting; do
  headers=$(awk '/^## /{print $0}' dg-anvil/skills/$s/SKILL.md | tr '\n' '|')
  test "$headers" = "## Overview|## When to Use|## Process|## Rationalizations|## Red Flags|## Verification|"
done
# 7. No unshipped markers in any Stage 0 source outside the copied failure taxonomy.
! grep -rE "(TODO|FIXME|XXX|HACK|TBD|WIP|NOTE:)" dg-anvil/cli dg-anvil/hooks dg-anvil/skills dg-anvil/commands dg-anvil/tests dg-anvil/.claude-plugin
# 8. The authoring-skills pressure test passes against a stub subagent dispatcher.
node --test dg-anvil/tests/pressure/authoring-skills.pressure.js
# 9. Substantive check: the Process section of skills/using-anvil/SKILL.md and skills/authoring-skills/SKILL.md each contain at least three numbered steps (the section must be more than a heading).
for s in using-anvil authoring-skills; do
  count=$(awk '/^## Process$/{flag=1; next} /^## /{flag=0} flag && /^[[:space:]]*[0-9]+\./' dg-anvil/skills/$s/SKILL.md | wc -l)
  test "$count" -ge 3 || exit 1
done
# 10. Second substantive check: the Rationalizations section of skills/authoring-skills/SKILL.md contains the literal phrase "description is a trigger, not a summary" (a verbatim row-18 defeater excuse).
awk '/^## Rationalizations/,/^## /{print}' dg-anvil/skills/authoring-skills/SKILL.md | grep -q 'description is a trigger, not a summary'
echo "stage 0 exit criteria: pass"
# Expected exit 0.
```

## Handoff to Next Stage

Stage 1 consumes from Stage 0 the items listed in Section 4 Stage 1 "Consumes from prior stage" column:

- produces `cli/anvil.js` for Stage 1 to use as the dispatch entry point that Stage 1 wires real handlers into for `contract`, `plan`, and `ledger query`.
- produces `cli/contract-schema.json` for Stage 1 to use as the frozen-draft contract schema Stage 1 finalizes and validates against.
- produces `cli/plan-schema.json` for Stage 1 to use as the frozen-draft plan schema Stage 1 finalizes and validates against.
- produces `cli/ledger-schema.json` for Stage 1 to use as the ledger read-path schema reference (full finalization in Stage 3).
- produces `cli/lib/yaml.js` for Stage 1 to use as the YAML reader skeleton Stage 1 finalizes.
- produces `cli/lib/args.js` for Stage 1 to use as the argument-parser skeleton Stage 1 finalizes.
- produces `cli/lib/errors.js` for Stage 1 to use as the structured-error module Stage 1 extends with new codes.
- produces `cli/lib/io.js` for Stage 1 to use as the I/O helper module Stage 1 extends for subprocess invocation when required.

## Known Non-Goals for This Stage

- Contract parsing logic (belongs in Stage 1) (picked up in Stage 1).
- Plan parsing logic (Stage 1) (picked up in Stage 1).
- Ledger read path or write path (read in Stage 1, write in Stage 3) (picked up in Stage 1 for read; Stage 3 for write).
- Any subagent dispatch (Stage 2) (picked up in Stage 2).
- Worktree creation (Stage 2) (picked up in Stage 2).
- Any verify probe (Stage 2) (picked up in Stage 2).
- Court dispatch (Stage 3) (picked up in Stage 3).
- `pre-tool-use`, `post-tool-use`, `user-prompt-submit`, `stop` hooks as functional enforcement (they exist as exit-0 stubs only) (picked up in Stage 4).
- Metrics computation (Stage 4) (picked up in Stage 4).
- Ship command (Stage 4) (picked up in Stage 4).
