# 11 - Implementation Plan

This page is the plan to ship Anvil v1. It is consciously short because the architecture is narrow.

## Build order

Five stages, strictly sequential. Each stage has a contract and a Court pass; Anvil is built with its own discipline from stage 2 on (bootstrap problem: stage 1 is hand-built).

### Stage 0 - Bootstrap

One week of hand-crafted work. Produce:

- `cli/anvil.js` skeleton with subcommands `contract`, `plan`, `run`, `verify`, `judge`, `ledger`, `metrics`, `audit`, `ship`.
- `cli/contract-schema.json`, `cli/plan-schema.json`, `cli/ledger-schema.json` (authoritative, versioned).
- Minimal `.claude-plugin/plugin.json`, `hooks/run-hook.cmd`, `hooks/session-start` (polyglot, exits 0 if bash missing).
- `skills/using-anvil/SKILL.md` (<200 lines, imperative, lists the seven other skills and the five primitives).

No loop yet. CLI subcommands return structured errors "not implemented" so the orchestrator can be tested against stubs.

### Stage 1 - Contract and Plan

Implement `contracting` and `planning` skills, and the CLI backends for `anvil contract` and `anvil plan`.

- Contract parser and validator (rejects contracts that do not cover all four verification levels).
- Plan parser and validator (rejects tasks without criterion citations).
- Ledger read path (append and query); write path is stubbed until stage 3.

Stage 1 is complete when `/start <intent>` produces a valid contract and a valid plan against a test repository, and the contract validator rejects every known-bad contract in `docs/contract-examples/`.

### Stage 2 - Execute and Verify

Implement `executing`, `verifying` skills and the CLI backends.

- `executing` dispatches a fresh subagent per task, inside a per-task git worktree, with the task text and the contract inlined.
- `verifying` runs the four-level probe per criterion; captures raw output; returns structured pass/fail.
- Worktree cleanup on task completion; orphan worktree alarm on failure.

Stage 2 is complete when a hand-authored contract + plan for a trivial test task runs end-to-end to Verify-pass.

### Stage 3 - Court and Ledger

Implement `judging`, `resetting` skills and their CLI backends.

- Court: two-pass adversarial review; input isolation enforced structurally (the CLI subcommand refuses to pass Plan or commit message to the Court subagent).
- Devil's Advocate: second parallel subagent; confidence modifier on Pass 1.
- Ledger: append-only JSONL; index maintained on every write; query returns ranked candidates.
- `resetting`: null-lesson rejection; input-patch proposal.

Stage 3 is complete when a task with a deliberately under-specified contract fails Verify, triggers a reset with a non-null lesson, is re-run with the injected counter-example, and passes.

### Stage 4 - Observability and Ship

Implement `post-tool-use` trace, `anvil metrics`, `stop` hook, `/ship`.

- `trace.jsonl` write path; atomic append.
- Metrics catalogue computed from trace + Ledger.
- Theatre-drift index; calibration report.
- Whole-branch Court; PR open via `gh` CLI.

Stage 4 is complete when a full loop from `/start` to merged PR runs with zero human touchpoints besides contract confirm and PR merge, on three non-trivial test tasks across three different repositories and two languages.

## Testing discipline

- **Contract fixtures** (`docs/contract-examples/`) are the regression suite for the Contract parser and the `contracting` skill. Every known-bad contract has a fixture.
- **Plan fixtures** - same for `planning`.
- **Loop tests** run a full `/start` -> PR cycle against a fixture repo with a known fault (deliberately under-specified contract, deliberately buggy implementation target). The test verifies that the loop resets, writes a specific Ledger entry, re-runs, and passes.
- **Pressure tests** for skills use `authoring-skills`' dispatch pattern: a subagent is given a contrived pressure scenario (sunk-cost, time, authority) and the skill under test; the run is scored RED (skill absent) and GREEN (skill present); merge requires a measurable delta.

## Platform coverage

Day 1: Claude Code on macOS, Linux, Windows (via Git Bash). The hook is polyglot from day one. OpenCode and Cursor by adapter, following the bootstrap patterns proven in the predecessor class. Gemini CLI and GitHub Copilot CLI are stretch goals; the CLI binary (`anvil`) runs unchanged on any host that can spawn node.

## Documentation policy

Three doc artefacts only:

- `README.md` - 500 lines. Install, one example, pointer to the report.
- `docs/failure-taxonomy.md` - the table from page 10, cross-referenced with stable ids.
- `docs/anvil_workflow.svg` - the diagram from page 03.

No extended tutorials. No "getting started" garden-of-forks. The README shows the loop; the loop teaches itself by running.

## Change control

- Schema changes (contract, plan, ledger) require a migration. The CLI ships a `contract-migrate` and `plan-migrate` subcommand for every schema bump. No silent rewrite of user data.
- Skill changes require a pressure test via `authoring-skills`. A skill change without an accompanying RED-then-GREEN subagent transcript is rejected.
- Hook changes require a cross-platform smoke test on all three supported OSes.
- Ledger schema is backward-compatible forever; new fields only.

## Non-goals for v1

- Multi-user Ledger. User-scoped only; team-scoped is a future extension with an explicit sanitizer.
- Model abstraction layer. Claude Code is the reference platform; other hosts get adapters later.
- Web dashboard. `anvil metrics` is a CLI; dashboards are a third-party concern built on the trace.
- Custom Verify probe plugins. The probes (Exists, Substantive, Wired, Functional) are a fixed set in v1; extensibility is deferred.

## Risk register

| Risk | Mitigation |
|---|---|
| The seven skills overfit to the first wave of user patterns | `authoring-skills` pressure test forces every skill to justify its existence against alternative skills |
| Contract verbosity drives users back to prose specs | Provide a `contracting` draft mode that is as short as the prose spec but with levels auto-filled; users edit the filled skeleton |
| Court cost is higher than expected | Token budget is not a scoping axis; if cost becomes unacceptable, the Court becomes a smaller model with tighter prompts, not a skipped step |
| Ledger grows unbounded | Supersession + effect-size retirement; `anvil ledger audit` nightly |
| Theatre drift persists anyway | Metrics surface it; human review of the index once a month; re-author contracts or tighten probes |

## Success criteria for v1 release

- A fresh repository can run a realistic task (e.g. "add a feature with tests") from `/start` to merged PR with two human touchpoints and no manual intervention on three languages.
- Theatre-drift index on a seeded-fault corpus below 5%.
- Lesson hit rate above 0.25 within 50 runs on a stable codebase.
- Calibration error for `judging-opus` inside +-0.05.
- Zero advisory-only hooks. Zero light-paths. Zero persona definitions.
