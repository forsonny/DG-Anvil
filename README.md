<div align="center">

# DG-Anvil

**Contract-first, evidence-based development for Claude Code.**

A plugin that turns "the agent thinks it's done" into "the agent has proven it's done."

[![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)](https://github.com/forsonny/DG-Anvil/releases)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg)](https://nodejs.org)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-plugin-orange.svg)](https://code.claude.com)
[![Zero deps](https://img.shields.io/badge/runtime%20deps-0-success.svg)](package.json)

[Quick start](#quick-start) - [Installation](#installation) - [How it works](#how-it-works) - [Commands](#commands) - [Architecture](#architecture)

</div>

---

## What this is

DG-Anvil is a Claude Code plugin that enforces the Anvil loop as **structural gates**. The plugin makes specifications machine-readable before code runs, runs verification probes externally, and persists every failure as a Ledger lesson that future contracts inherit.

In one sentence: **the agent cannot mark work as done; verification can.**

## Why it exists

Most agent loops fail the same way: the agent claims success, the user discovers it didn't actually work, and the lesson lives only in the user's frustration. DG-Anvil solves the three failure modes structurally:

| Failure mode | DG-Anvil's structural gate |
|---|---|
| "Looks done to me" | Four-level Verify probe (Exists, Substantive, Wired, Functional) - all four must pass per criterion |
| "I'll remember next time" | Every failed run appends a non-null lesson to the global Ledger; future contracts inject matching lessons as counter-examples |
| "Trust me, I read the spec" | Contract is YAML, parsed and validated; criteria without all four verification slots are rejected at save time |

## Two human touchpoints

The production loop has exactly two human touchpoints; everything between them runs autonomously:

1. **Contract confirm.** After `/start <intent>`, you review `anvil/contract.yml` and accept or reject. Binary; no list-of-N auto-pick.
2. **PR merge.** `/ship` opens the PR via `gh pr create`. You review and merge; `/ship` does not merge for you.

Everything between those two gates runs autonomously.

---

## Quick start

After [installing](#installation), inside any project repository, in a Claude Code session:

```text
/start add a rate limiter that caps inbound requests at 100 per minute per client
```

The `contracting` skill activates, queries the Ledger for matching prior lessons, drafts `anvil/contract.yml` with all four verification levels populated per criterion, and presents it for one-shot binary confirmation.

After you accept, the loop runs autonomously through:

```text
contracting -> planning -> executing -> verifying -> judging -> (pass | reset)
```

Until every contract criterion is green. Then:

```text
/ship
```

opens the PR via `gh pr create`. You review and merge.

---

## Installation

DG-Anvil is both a Claude Code plugin **and** a single-plugin marketplace. Pick the path that matches how you want it to live in your environment.

### Option A: Marketplace install (recommended)

The supported, upgrade-friendly path. Plugin lives under `~/.claude/plugins/` and is shared across every project.

```text
/plugin marketplace add forsonny/DG-Anvil
/plugin install dg-anvil@dg-anvil
```

Verify:

```text
/plugin list
```

You should see `dg-anvil` enabled. The five slash commands are now available everywhere, and `hooks/session-start` auto-loads `using-anvil` on every fresh session.

**Upgrade later:**

```text
/plugin marketplace update dg-anvil
/plugin install dg-anvil@dg-anvil
```

**Remove:**

```text
/plugin uninstall dg-anvil@dg-anvil
/plugin marketplace remove dg-anvil
```

### Option B: Project-level install (single repo only)

Use this when you want DG-Anvil active in exactly one repository.

From your project root:

```bash
mkdir -p .claude/plugins
git clone https://github.com/forsonny/DG-Anvil.git .claude/plugins/dg-anvil
```

Then in Claude Code:

```text
/plugin marketplace add ./.claude/plugins/dg-anvil
/plugin install dg-anvil@dg-anvil
```

The plugin is now active **for this repository only**. Upgrade with `git -C .claude/plugins/dg-anvil pull`. Add `.claude/plugins/dg-anvil` to your project's `.gitignore` if you do not want to commit the plugin source.

### Option C: User-level install (no marketplace)

Skip the marketplace command and drop the plugin into Claude Code's user-scoped plugin directory:

```bash
mkdir -p ~/.claude/plugins
git clone https://github.com/forsonny/DG-Anvil.git ~/.claude/plugins/dg-anvil
```

Restart any active Claude Code session. Components are auto-discovered. Upgrade with `git -C ~/.claude/plugins/dg-anvil pull`.

### Option D: One-off session

For a single Claude Code session without installing anything:

```bash
git clone https://github.com/forsonny/DG-Anvil.git /tmp/dg-anvil
claude --plugin-dir /tmp/dg-anvil
```

The plugin is loaded for that session only.

### Requirements

| Requirement | Why |
|---|---|
| Node.js 20.0.0+ | Runs `cli/anvil.js`; uses Node's built-in `node:test` and coverage |
| `git` on `PATH` | Executor uses `git worktree add` per task |
| Bash (Unix) or Git for Windows | Polyglot hooks dispatch through `hooks/run-hook.cmd` |
| `python` + `coverage.py` *(optional)* | Verify Python contracts; missing tooling produces structured `E_COVERAGE_UNAVAILABLE`, never silent passes |
| `go` *(optional)* | Verify Go contracts |

DG-Anvil itself ships with **zero runtime dependencies**.

---

## How it works

```text
       user intent
           |
           v
   +---------------+        +-----------+
   |  contracting  |<------>|  Ledger   |   inject counter-examples
   +---------------+        +-----------+
           |
           v   [HUMAN: confirm contract]
   +---------------+
   |    planning   |   atomic task DAG, every task cites criterion ids
   +---------------+
           |
           v   per task, in parallel waves:
   +---------------+
   |   executing   |   fresh subagent, isolated git worktree
   +---------------+
           |
           v   read diff + tool output (never narration):
   +---------------+
   |   verifying   |   Exists -> Substantive -> Wired -> Functional
   +---------------+
           |
           v   if any level fails, dispatch the Court:
   +---------------+        +-----------+
   |    judging    |------->| resetting |---> append lesson, re-queue
   +---------------+        +-----------+
           |                       ^
           v all green             | loop_cap reached -> escalate
   +---------------+
   |     /ship     |   [HUMAN: review PR + merge]
   +---------------+
```

### Five primitives

| Primitive | Where it lives | What it is |
|---|---|---|
| **Contract** | `anvil/contract.yml` | YAML with four verification levels per criterion |
| **Plan** | `anvil/plan.yml` | Atomic task DAG with wave ordering; each task cites criterion ids |
| **Loop** | `cli/lib/executor.js` + `verifier.js` | Contract -> Plan -> Execute -> Verify -> Judge -> Pass or Reset |
| **Ledger** | `~/.anvil/ledger.jsonl` | Durable lesson log; future contracts query and inject counter-examples |
| **Court** | `cli/lib/court.js` | Adversarial adjudicator. Plan, commit messages, prior verdicts are *structurally* withheld |

### Seven skills

| Skill | Triggers |
|---|---|
| `using-anvil` | Loaded by `session-start` on every fresh session |
| `contracting` | `/start <intent>`; whenever no confirmed contract exists |
| `planning` | After contract confirmation |
| `executing` | Per task, once a wave unlocks |
| `verifying` | After each `executing` returns |
| `judging` | After Verify reports allGreen or suspicious |
| `resetting` | When Verify or Court fails; appends lesson, re-queues |
| `authoring-skills` | Meta-skill governing every change to any skill |

### Five commands

| Command | Purpose |
|---|---|
| `/start <intent>` | Begin a new Anvil run. Drafts and confirms the contract. |
| `/continue` | Resume from `anvil/state.json` at the next incomplete task. |
| `/ship` | Whole-branch Court runs; on merge, opens the PR via `gh`. |
| `/abort <reason>` | Stop the run. Captures a final lesson if applicable. |
| `/ledger query \| append \| audit` | Interact with the global lesson Ledger. |

---

## Commands reference

The `anvil` CLI is the canonical surface; every skill is reified as a code path it composes.

```bash
anvil contract --validate <file>
anvil plan     --validate <file> --contract <file>
anvil run      --task <id> [--dispatcher anvil_subagent|stub]
anvil verify   --worktree <dir> --contract <file>
anvil judge    --task <id> --worktree <dir> --contract <file>
anvil ledger   query <pattern> | append --file <jsonl> | audit
anvil metrics  [--trace-path <file>] [--seeded-path <file>]
anvil ship
anvil escalation list | describe --task <id>
anvil cassette record --scenario <name> --out <path>
anvil contract-migrate --in <file> --out <file>
anvil plan-migrate     --in <file> --out <file>
anvil ledger-migrate   --in <file> --out <file>
```

Run `anvil --help` for the full list, or `anvil --version` for the version.

Every error is a structured `{error, code, details}` JSON object on stderr with a non-zero exit. There are no silent failures and no advisory warnings.

---

## Architecture

DG-Anvil's design is documented in two places:

| Document | What it covers |
|---|---|
| `reports/Anvil-Design/00_intro.md` through `12_Bottom_Line.md` | Canonical product design: thesis, anatomy, contract grammar, ledger, court, observability |
| `reports/DG-Anvil/00_Architecture.md` | Build architecture: file layout, schemas, invariants, stage dependency graph |
| `docs/failure-taxonomy.md` | The 30-row failure taxonomy that every pressure test cites by row number |

### Key invariants (enforced in code, not prose)

- **Single-writer Ledger.** Only `cli/lib/ledger-write.js` may append to `~/.anvil/ledger.jsonl`.
- **Evidence-only Court.** `cli/lib/court.js` does not import `plan.js`, `ledger.js`, or `ledger-write.js`. Plan, commit messages, and prior verdicts are structurally withheld.
- **Fresh subagent per task.** Executor carries no module-level state; every briefing is `Object.freeze`d before dispatch.
- **Null-lesson prohibition.** Lessons with empty `contract_gap`, `evidence`, or `remediation` are rejected at the write path. Failed resets escalate instead.
- **Trace fields are closed.** The 17-field trace event schema is frozen; additions require an architecture document update.
- **Zero runtime dependencies.** `package.json` declares no `dependencies` or `devDependencies`.

---

## Project layout

```text
dg-anvil/
  .claude-plugin/
    plugin.json           plugin manifest
    marketplace.json      single-plugin marketplace manifest
  cli/
    anvil.js              CLI entry; dispatch table for every subcommand
    contract-schema.json  JSON Schema, contract.yml frontmatter
    plan-schema.json      JSON Schema, plan.yml
    ledger-schema.json    JSON Schema, ledger.jsonl entries
    lib/                  contract, plan, ledger, ledger-write, executor,
                          verifier, worktree, court, metrics, trace, hooks,
                          subagent-bridge, escalation, errors, args, io, yaml
  commands/               start, continue, ship, abort, ledger
  hooks/                  session-start, pre-tool-use, post-tool-use,
                          user-prompt-submit, stop, hooks.json, run-hook.cmd
  skills/                 using-anvil, authoring-skills, contracting, planning,
                          executing, verifying, judging, resetting
  docs/                   failure-taxonomy.md, anvil_workflow.svg,
                          contract/plan/ledger fixtures
  tests/
    unit/                 per-module unit tests
    pressure/             RED-then-GREEN skill pressure tests
    loop/                 fixture-repo-node, fixture-repo-python,
                          fixture-repo-go, orchestrating loop.test.js
```

## Development

```bash
git clone https://github.com/forsonny/DG-Anvil.git
cd DG-Anvil
npm test                                          # all unit tests
node --test tests/pressure/*.pressure.js          # all pressure tests
node --test tests/loop/loop.test.js               # v1 release shape checks
```

123 tests pass on a clean clone (101 unit + 11 pressure + 11 loop).

## Contributing

Skill changes require a paired RED-then-GREEN pressure test that cites a failure-taxonomy row by number. Schema changes require a paired migration subcommand. New error codes must be registered in `cli/lib/errors.js`. The full discipline is in `skills/authoring-skills/SKILL.md`.

## License

[MIT](LICENSE).
