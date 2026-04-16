# Changelog

All notable changes to DG-Anvil are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

Nothing yet.

## [0.6.0] - 2026-04-16

Retroactive-lesson capture at `/ship` - close the cross-project learning gap without adding a third human touchpoint.

### The problem being solved

Prior releases captured Ledger lessons only when Verify or the Court failed DURING a run. A post-ship bug fix that sailed through on the first try taught the Ledger nothing. Two months later, a different project hit the same mistake. The revised design (vetted through 100-question deep discovery) closes this loop without breaking any of the 18 cross-stage invariants.

### Added

- **`cli/lib/ledger-write.js retroactive(input)`**. New entry point that writes a lesson with structural non-null guarantees: `confirmed_gap_note` must be non-empty, `criterion_id` MUST exist in `contract.criteria` (otherwise `E_INVALID_LESSON, rule: unknown_criterion_id`), `source_intent` must be non-empty. The lesson's `remediation` is the matched criterion's `statement` (a structural reference, not user prose); `evidence` names the passing-criterion bar.
- **Jaccard-similarity supersession.** Before appending a retroactive lesson, `findSimilar` runs Jaccard on `contract_gap` tokens against every existing lesson. At similarity >= 0.7, the new lesson writes `supersedes: [<oldId>]` instead of a near-duplicate. Prevents Ledger flood.
- **Structural tags.** Retroactive lessons carry `tags: [shipped_gap, post_hoc, ...pattern-tokens]` so future `anvil ledger query` calls can segregate reactive vs. retroactive lessons if needed.
- **`anvil ledger retroactive --contract <file> --criterion <id> --gap-note <text>`**. CLI surface for the orchestrator to call during `/ship`.
- **`anvil ledger invalidate --lesson <id> --reason <revert|stale|wrong>`**. Writes an invalidation marker (not a delete) so reverted shipped work does not keep teaching future contracts. `ledger.query` now filters out invalidated lessons. Audit trail preserved.
- **Contract schema v2**. `anvil_contract_version` accepts `1` or `2`. New optional fields `shipped_gap_note` and `shipped_gap_note_draft` at the top level; `additionalProperties: false` still enforced.
- **`anvil contract-migrate --target-version 2`**. Default target is now v2; `--target-version 1` preserves identity round-trip.

### Changed

- **`agents/contract-drafter.md`**. The drafter now scans `source_intent` for file paths that exist at repo HEAD. If any match, it populates the optional `shipped_gap_note_draft` field on the contract (<=240 chars, one sentence). This is agent-authored text the user reviews at `/ship`; it is NOT a contract-time question. Greenfield work leaves the field unset and the mechanism never fires.
- **`skills/resetting/SKILL.md`**. Process now has two entry points: reactive (Verify/Court failure) and retroactive (post-ship bug-fix gate). Both route through `cli/lib/ledger-write.js`, preserving Invariant 17 (single-writer) and keeping `resetting` as the sole lesson composer.
- **`commands/ship.md`**. New Step 3.5: if `contract.shipped_gap_note_draft` is present, present a binary-ish gate (`confirm C<N>` / `edit C<N>: <text>` / `skip`) as a sub-question of the existing PR-review touchpoint. This is NOT a third human touchpoint; it piggybacks on touchpoint two.
- **`cli/lib/ledger.js query`** now filters invalidated lessons (both the marker entries and the lessons they invalidate).
- **`docs/contract-examples/bad/wrong-version-002.yml`** now uses `anvil_contract_version: 99` (was `2`, which is valid under the v2 schema).

### Invariants respected (audited via 100-question deep discovery)

| Invariant | How it survives |
|---|---|
| Two human touchpoints, total | Step 3.5 piggybacks on the existing /ship touchpoint. No new interruption. |
| 15 (Null-lesson prohibition) | `retroactive` refuses empty gap-notes AND missing criterion ids. Lesson remediation is a structural criterion reference, not user prose. |
| 16 (No auto-pick gates) | Ship gate is binary-ish (confirm/edit/skip). `skip` writes nothing. |
| 17 (Single-writer discipline) | All retroactive writes route through `ledger-write.append` via `ledger-write.retroactive`. `resetting` remains the sole composer. |
| 7 (Schema changes require a migration) | `anvil_contract_version` bumped to 2; `anvil contract-migrate` now defaults to v2; round-trip test added. |

### Known limitation

Cross-framework pattern match (e.g. `astro+tailwind+shadcn` -> `vite+react+shadcn`) still fails on token-overlap alone. Semantic similarity retrieval (embedding-based) is a post-1.0 conversation, not v0.6.0. The revised proposal is honest about this: for same-framework cross-project learning, the mechanism works; for cross-framework, lesson injection requires at least one overlapping lexical token.

### Tests

- 8 contract unit tests pass (added v1-to-v2 migration round-trip, v2 validator acceptance, unknown-top-level-key rejection).
- 18 ledger unit tests pass (added retroactive happy-path, missing-criterion refusal, empty-gap refusal, Jaccard supersession, invalidate hides from query, unknown-reason rejection, Jaccard + normalizePatterns helpers).
- Stage 4 exit criteria still pass unchanged.

## [0.5.0] - 2026-04-16

Worktree lifecycle + orchestrator-edit blocker. Fixes the three-bug cascade observed during real-world testing: stale worktrees failing retry, orchestrator improvising `git merge`/`git stash` manually, and orchestrator writing production files directly outside any worktree.

### Added

- **`anvil merge-task --task <id>`.** Commits pending changes in the task worktree, merges the branch back into the parent with `--no-ff`, removes the worktree, and deletes the branch. The orchestrator never runs `git commit`, `git merge`, `git stash`, or manual conflict resolution - the plugin owns the worktree lifecycle.
- **`anvil reset-task --task <id>`.** Force-removes a stale worktree (even if git's internal state is corrupt) and deletes the branch, without trying to merge. For recovery from a stuck or aborted prior run.
- **Pre-tool-use orchestrator guard.** The `pre-tool-use` hook now blocks `Write`, `Edit`, `MultiEdit`, and `NotebookEdit` tool calls targeting paths *outside* `.anvil-worktrees/` or `anvil/` whenever an Anvil run is active. The block is structural (exit 2 with a `permissionDecision: "deny"` payload and an `E_HOOK_BLOCKED` error), per Invariant 1. Reason string points the orchestrator at `anvil merge-task` as the correct landing path.

### Changed

- **`cli/lib/worktree.js create`** now calls `forceRemoveStale` before `git worktree add`. A prior failed or aborted run no longer blocks retry with `a branch named 'anvil/task-T01' already exists`. The force-clean removes the worktree directory, runs `git worktree prune`, and deletes the stale branch.
- **`skills/executing/SKILL.md` Process** now has eight numbered steps. Orchestrator responsibilities are explicit: dispatch via Task tool, run `anvil verify`, then `anvil merge-task` on green or `anvil reset-task` on stuck. The skill's Red Flags now reject direct orchestrator file edits and manual git operations.

### Fixed

- **Stale worktree/branch blocks retry.** See real-world failure: `fatal: a branch named 'anvil/task-T01' already exists`.
- **Orchestrator improvising git operations.** Prior releases had no surface for "land this task", so the orchestrator ran `git commit`, `git merge`, `git stash` in the main thread, hitting conflicts and improvising recovery. `anvil merge-task` is now the single landing surface.
- **Orchestrator editing production files directly.** Prior releases would silently let `Write(tailwind.config.mjs)` fire in the main repo bypass worktree + Verify discipline. The `pre-tool-use` hook now blocks such calls during an active run.

### Tests

- Existing 30 hooks unit tests still pass.
- Manual verification: pre-tool-use hook blocks a Write to `/c/dev/anime website/src/main.js` during an active run and allows a Write to `/repo/.anvil-worktrees/task-T1/src/main.js`.

## [0.4.0] - 2026-04-16

Move heavy skill work out of the main conversation thread.

### Added

- **`agents/contract-drafter.md`.** A dedicated Claude Code subagent that drafts `anvil/contract.yml` in a fresh context. Takes the user's intent, the extracted pattern tags, and the Ledger query results as briefing; returns exactly one sentence to the orchestrator. The full YAML authoring, the counter-example injection, and the `anvil contract --validate` loop all happen inside the subagent so the main conversation stays clean.
- **`agents/plan-drafter.md`.** A dedicated subagent that decomposes the confirmed `anvil/contract.yml` into an atomic task DAG and writes `anvil/plan.yml`. Returns exactly one sentence (task count + wave count); all the decomposition reasoning stays in the subagent context.
- **`agents/` directory.** New top-level plugin component for dispatched subagents. Auto-discovered by Claude Code alongside `commands/`, `skills/`, and `hooks/`.

### Changed

- **`skills/contracting/SKILL.md` Process.** Step 3 now explicitly dispatches the `contract-drafter` agent via the `Task` tool instead of drafting YAML inline. The orchestrator holds only `source_intent`, the pattern tags, the Ledger results, and eventually the written contract file - never the drafting reasoning.
- **`skills/planning/SKILL.md` Process.** Steps 2 and 3 now dispatch the `plan-drafter` agent. The orchestrator holds only the task DAG by file reference; individual task records are read as the `executing` skill requests them.

### Fixed

- **Main conversation context bloat.** In prior releases, the `contracting` and `planning` skills drafted YAML and decomposed tasks inline in the main conversation thread, which filled the context window during the first two phases of every run. Heavy work now happens in fresh subagents per the design's "orchestrator holds artifacts, not narration" discipline; the main thread holds only file pointers and one-line status messages.

### Audited: which phases already used subagents

| Phase | Status at 0.4.0 |
|---|---|
| `contracting` | Dispatches `contract-drafter` (new in this release) |
| `planning` | Dispatches `plan-drafter` (new in this release) |
| `executing` | Already dispatched a fresh subagent per task at 0.1.0 |
| `verifying` | External CLI probes; minimal LLM work - no subagent needed |
| `judging` | Dispatches the Court as a fresh subagent at 0.1.0 |
| `resetting` | Composes lesson then CLI-appends; small enough to stay inline |

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

[Unreleased]: https://github.com/forsonny/DG-Anvil/compare/v0.6.0...HEAD
[0.6.0]: https://github.com/forsonny/DG-Anvil/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/forsonny/DG-Anvil/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/forsonny/DG-Anvil/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/forsonny/DG-Anvil/compare/v0.2.1...v0.3.0
[0.2.1]: https://github.com/forsonny/DG-Anvil/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/forsonny/DG-Anvil/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/forsonny/DG-Anvil/releases/tag/v0.1.0
