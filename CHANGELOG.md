# Changelog

All notable changes to DG-Anvil are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

Nothing yet.

## [0.3.0] - 2026-04-16

Auto-detect: catch code-change intent even when the user forgets `/start`.

### Added

- **`UserPromptSubmit` intent detection.** The `user-prompt-submit` hook now scans every user message for code-change intent (verbs like `fix`, `add`, `implement`, `refactor`; problem nouns like `bug`, `issue`, `broken`). When intent is detected and no Anvil run is active, the hook emits a structured `hookSpecificOutput.additionalContext` event that instructs Claude to suggest `/start <intent>` before making any code edits. Pure information requests (`explain`, `describe`, `what is`, `how does`) are ignored.
- **`cli/lib/hooks.js`** exports two new functions: `detectCodeChangeIntent(text)` (predicate) and `maybeSuggestStart(prompt, state)` (returns a suggestion object or null). Ten new unit tests cover the positive, negative, and silencing cases.
- **Silencing rules** so the suggestion does not fire when it should not:
  - If any task in `anvil/state.json` is `running`, `queued`, `verified`, `judged`, or `escalated`, the hook stays silent.
  - If `state.meta.contract_unconfirmed === true`, the contract-confirmation routing takes precedence.
  - Prompts starting with a slash command (`/start`, `/continue`, ...) are bypassed.
  - Prompts under 5 characters are bypassed.

### How it works in practice

If a user types "there's a bug in the cache layer" without `/start`, Claude receives injected context telling it to ask the user to run `/start <intent>` before making changes. The user can still opt out explicitly ("just fix it, no contract") and Claude will proceed. The Ledger discipline is preserved by default without forcing users to memorise the slash command.

### Structural guarantee

This is not an advisory hook (Invariant 1). The hook emits a structured JSON event to stdout; Claude Code parses the event and injects it into the model context. No warnings are printed to stderr; nothing is silently suppressed.

## [0.2.1] - 2026-04-16

Docs-only release. Fixes broken documentation references.

### Added

- **`dev/` folder** containing the design provenance that previously lived outside the repository: the thirteen `anvil-design/` canonical design documents, the workflow SVG, ten worked scenarios under `dev/anvil-design/scenarios/`, the build architecture at `dev/dg-anvil/00_Architecture.md`, and the five stage plans under `dev/dg-anvil/plans/`.
- **`dev/README.md`** explaining what the folder is for, when to read it, and when not to.

### Changed

- `README.md` "Architecture" section now points at `dev/anvil-design/` and `dev/dg-anvil/` instead of the external `reports/` paths.
- `package.json` description rewritten; no longer references the external `reports/` path.

### Fixed

- Broken documentation references. The prior release pointed at `reports/Anvil-Design/` and `reports/DG-Anvil/`, which were never shipped in the plugin repository, so clicking those links from a cloned copy of the repo produced a 404. All design docs now ship in-tree under `dev/`.

## [0.2.0] - 2026-04-16

First post-bootstrap release. Fixes every installability blocker surfaced in real-world testing of `0.1.0`, and makes the contract confirmation gate legible to non-coders.

### Added

- **Contract Confirmation Template.** The `contracting` skill now mandates a seven-section plain-English summary at Process step 5 (the first of two human touchpoints). Sections, in order: *What you asked for*, *What I will build in plain language*, *How we will know it worked* (with a concrete `input -> expected output` example per criterion), *What I will NOT do* (including user-mentioned items that were deliberately excluded), *Lessons from past runs*, *What happens if something fails*, *The rules I am locking in*, *Your decision*. The response gate is an explicit `accept` / `reject` block with no free-form feedback.
- **`anvil` / `anvil.cmd` wrapper scripts** at the plugin root for users who add the plugin directory to `PATH` manually.
- **Red Flags guard** in `contracting`: criteria missing a concrete `functional.inputs` + `functional.expected` pair are rejected before the draft reaches the user.

### Changed

- **Skill and command invocations** now call `node "$CLAUDE_PLUGIN_ROOT/cli/anvil.js" <subcommand>` everywhere instead of a bare `anvil`, because the CLI ships inside the plugin and is not on `PATH` after a marketplace install.
- **README** rewritten with hero section, status badges, ASCII flow diagram, primitive / skill / command tables, and four distinct installation paths.

### Fixed

- **Hook path quoting.** Paths with spaces (for example `C:\dev\anime website`) broke bash argv splitting because `${CLAUDE_PLUGIN_ROOT}` was unquoted in `hooks/hooks.json`. Every hook command now invokes `node` directly with a quoted path, which works uniformly on Linux, macOS, and Windows via Git Bash.
- **Silent `anvil/` directory creation.** The hook handler used to create an `anvil/` directory in every project where a hook fired, even if the user had never run `/start`. The handler now writes a trace event only when `anvil/` already exists.
- **"`anvil: command not found`".** Fixed by updating every skill and slash-command example to use the explicit `node "$CLAUDE_PLUGIN_ROOT/cli/anvil.js"` invocation.

### Documentation

- `README.md` carries the full installation matrix (marketplace install, project-level, user-level, one-off) and the requirements table.
- `CHANGELOG.md` converted to Keep a Changelog format; this file is now the source of truth for release notes.

## [0.1.0] - 2026-04-15

Initial release. Implements the complete Anvil loop end to end across five build stages.

### Added

- **Five primitives.** `Contract` (YAML with four verification-level slots per criterion), `Plan` (atomic task DAG with wave ordering), `Loop` (Contract -> Plan -> Execute -> Verify -> Judge -> Pass or Reset), `Ledger` (durable lesson log at `~/.anvil/ledger.jsonl`), `Court` (adversarial adjudicator; structurally cannot see Plan, commit messages, or prior verdicts).
- **Seven skills.** `using-anvil`, `authoring-skills`, `contracting`, `planning`, `executing`, `verifying`, `judging`, `resetting`.
- **Five slash commands.** `/start`, `/continue`, `/ship`, `/abort`, `/ledger`.
- **Five polyglot hooks.** `session-start`, `pre-tool-use`, `post-tool-use`, `user-prompt-submit`, `stop`; graceful exit-0 degradation when bash is unavailable.
- **Zero-runtime-dep CLI.** `cli/anvil.js` dispatches `contract`, `plan`, `run`, `verify`, `judge`, `ledger {query,append,audit}`, `metrics`, `audit`, `ship`, `escalation {list,describe}`, `cassette record`, and the three schema-migration subcommands. Uses only Node built-ins (`node:test`, `child_process`, `fs`, `path`, `crypto`, `os`).
- **Three JSON Schemas.** `contract-schema.json`, `plan-schema.json`, `ledger-schema.json`, each with a versioned `anvil_*_version: 1` label and a paired migration subcommand.
- **Fifteen error codes** registered in `cli/lib/errors.js`, covering every exit path (`E_INVALID_CONTRACT`, `E_INVALID_PLAN`, `E_NULL_LESSON`, `E_COURT_INPUT_VIOLATION`, `E_INVALID_VERDICT`, `E_UNSUPPORTED_LANGUAGE`, `E_COVERAGE_UNAVAILABLE`, `E_WHOLE_BRANCH_COURT_FAILED`, etc.).
- **Three language fixture repos** at `tests/loop/fixture-repo-{node,python,go}/` with hand-authored `anvil/contract.yml`, `anvil/plan.yml`, and `loop.test.js` per language.
- **Test suite.** 101 unit tests (one per `cli/lib/*.js` module), 11 pressure tests (RED-then-GREEN skill transcripts; every test cites a failure-taxonomy row by number), 11 loop tests including the orchestrator that asserts the three v1 shape criteria (zero advisory hooks, zero light-paths, zero persona definitions).
- **Failure taxonomy.** 30-row catalogue at `docs/failure-taxonomy.md`; every pressure test cites its row.
- **Trace schema.** Seventeen-field closed event schema at `cli/lib/trace.js`; additions require an architecture update.
- **Metrics catalogue.** Ten metrics including `theatre_drift_index` (threshold 0.15), `lesson_hit_rate`, `calibration_error`.
- **Plugin + marketplace manifests.** `.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json` so the same repository serves as both plugin and single-plugin marketplace.

### Security & correctness invariants (enforced in code, not prose)

- **Single-writer Ledger.** Only `cli/lib/ledger-write.js` appends to `~/.anvil/ledger.jsonl`.
- **Evidence-only Court.** `cli/lib/court.js` does not import `plan.js`, `ledger.js`, or `ledger-write.js`. Plan, commit messages, and prior verdicts are structurally withheld.
- **Fresh subagent per task.** Executor carries no module-level state; every briefing is `Object.freeze`d before dispatch.
- **Null-lesson prohibition.** Lessons with empty `contract_gap`, `evidence`, or `remediation` are rejected at the write path.
- **Zero runtime dependencies.** `package.json` declares no `dependencies` or `devDependencies`.

[Unreleased]: https://github.com/forsonny/DG-Anvil/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/forsonny/DG-Anvil/compare/v0.2.1...v0.3.0
[0.2.1]: https://github.com/forsonny/DG-Anvil/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/forsonny/DG-Anvil/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/forsonny/DG-Anvil/releases/tag/v0.1.0
