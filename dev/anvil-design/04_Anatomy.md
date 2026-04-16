# 04 - Anatomy

Five primitives. Seven skills. Five hooks. Five slash commands. One CLI binary. Nothing more.

## Five primitives (the nouns)

| Primitive | Storage | Lifespan | Purpose |
|---|---|---|---|
| **Contract** | `anvil/contract.yml` | One per task stream, versioned | Machine-evaluable success criteria |
| **Plan** | `anvil/plan.yml` | One per contract | Atomic task DAG with wave ordering |
| **Loop** | Runtime state | One per task | Execute - Verify - Judge - Pass/Reset |
| **Ledger** | `~/.anvil/ledger.jsonl` + `~/.anvil/ledger.index.json` | Permanent, append-only | Pattern-indexed lesson store |
| **Court** | Stateless subagent | Per task + once per branch | Adversarial spec-then-quality review |

These five are the entire noun catalogue. Every file the plugin writes, reads, or mutates is one of these five.

## Seven skills (the verbs)

Each skill is a SKILL.md with the canonical six sections: Overview, When to Use, Process, Rationalizations, Red Flags, Verification. Skills do not call each other directly; they are invoked by the orchestrator or by a slash command.

| # | Skill | Invoked by | Produces |
|---|---|---|---|
| 1 | `contracting` | `/start`, orchestrator | `anvil/contract.yml` |
| 2 | `planning` | Orchestrator, after contract confirm | `anvil/plan.yml` (DAG) |
| 3 | `executing` | Orchestrator, per task | Diff + captured tool output in worktree |
| 4 | `verifying` | Orchestrator, after execute | Pass/fail per level (Exists, Substantive, Wired, Functional) |
| 5 | `judging` | Orchestrator, after verify | Two verdicts (spec, quality), with evidence citations |
| 6 | `resetting` | Orchestrator, on any fail | Lesson written to Ledger, task re-queued with improved input |
| 7 | `authoring-skills` | Meta; invoked when any of the six above are changed | Pressure-tested new skill text |

The seventh is the meta-skill. It enforces TDD-for-documentation: a skill change is not merged until a subagent has been run against a pressure scenario without the new skill, failed in the way the skill is meant to prevent, then run with the new skill and passed. This closes the loop on the plugin's own evolution.

### Policy: adding an eighth skill requires retiring one

New failure modes produce **rows** in Contract, Verify, or Ledger tables, not new skills. The only justification for adding a skill is that the existing seven cannot express the new behaviour without a category error. This policy is enforced by the `authoring-skills` pressure test, which must include a question: "is this truly a new verb, or is it a new row in an existing skill?"

## Five hooks (the enforcement layer)

Hooks are blocking, not advisory. Each one either prevents an action or emits a structured event.

| Hook | Fires on | What it does | Can agent ignore? |
|---|---|---|---|
| **session-start** | SessionStart (startup, clear, compact) | Loads `using-anvil` meta-skill into context; sets up trace writer | No |
| **pre-tool-use** | Any Write, Edit, Bash with destructive patterns (`rm -rf`, `git push --force`, `git config`, `npm publish`, etc.) | Hard blocks unless task is in ship phase with explicit approval token | No - block, not warn |
| **post-tool-use** | Every tool call | Appends a row to `trace.jsonl` with phase, evidence, cost, outcome | No |
| **user-prompt-submit** | Every human turn | Routes: if contract exists and is unconfirmed, user turn goes to contracting; if escalation active, turn goes to escalation handler; otherwise passthrough | No |
| **stop** | End of session | Replays the active contract against HEAD; if any check fails, writes a lesson and blocks the stop until lesson is recorded | No |

Hooks are polyglot (bash + CMD) and cross-platform. Absence of a shell degrades to exit-0, matching the superpowers pattern for Windows compatibility.

## Five slash commands (the human interface)

| Command | Purpose |
|---|---|
| `/start <intent>` | Begin a new task stream. Invokes `contracting`. |
| `/continue` | Resume from saved state. Reads `anvil/contract.yml` and `anvil/plan.yml`; picks up at the next incomplete task. |
| `/ship` | Final gate. Runs contract replay, final whole-branch Court, opens PR. The only command that crosses the sandbox boundary. |
| `/abort` | Stop the current loop. Requires a reason; the reason is written to the Ledger as an aborted-lesson (distinct from a reset-lesson). |
| `/ledger <query>` | Query the Ledger. `/ledger rate-limit` returns every past lesson matching the pattern "rate-limit". Read-only. |

There is no `/fast`, `/quick`, or `/do`. The loop is the loop.

## One CLI binary

`anvil` is installed alongside the plugin as a standalone node binary (zero runtime deps, in the superpowers tradition). It provides the surface the plugin uses internally, and is also usable from a user shell for debugging and for CI:

| Subcommand | Purpose |
|---|---|
| `anvil contract [--from <intent> -|- --validate <file>]` | Author or validate a contract |
| `anvil plan [--from <contract>]` | Emit a plan DAG |
| `anvil run [--task <id>]` | Run the loop for one task or the whole plan |
| `anvil verify [--task <id>]` | Run just the Verify gate |
| `anvil judge [--task <id>]` | Dispatch just the Court |
| `anvil ledger query <pattern>` | Read-only Ledger query |
| `anvil ledger append <json>` | Append a lesson; used by `resetting` |
| `anvil metrics` | Dump reset rate, time-to-green, pass rate, lesson hit rate, judge reject rate, calibration per agent |
| `anvil audit` | Read-only codebase health pass (analysis skills only, no mutation) |
| `anvil ship` | Run contract replay, final Court, open PR |

The CLI is the same code path the plugin uses. Plugin skills shell out to it rather than re-implementing logic. Scripts in CI can call the CLI directly; the plugin is not required for CI verification.

## File layout

```
anvil/
  .claude-plugin/
    plugin.json                    # manifest
  hooks/
    hooks.json
    run-hook.cmd                   # polyglot bash/CMD
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
    using-anvil/SKILL.md           # bootstrap meta-skill
    contracting/SKILL.md
    planning/SKILL.md
    executing/SKILL.md
    verifying/SKILL.md
    judging/SKILL.md
    resetting/SKILL.md
    authoring-skills/SKILL.md
  cli/
    anvil.js                       # zero runtime deps
    contract-schema.json
    plan-schema.json
    ledger-schema.json
  docs/
    anvil_workflow.svg
    failure-taxonomy.md            # indexes anti-patterns defeated
    contract-examples/
    plan-examples/
    ledger-examples/

# per-repo state (gitignored by default)
./anvil/
  contract.yml
  plan.yml
  trace.jsonl
  state.json

# global state (user-level, survives repos)
~/.anvil/
  ledger.jsonl
  ledger.index.json
  config.json
```

Anvil writes into the repo under `./anvil/` and into the user's home under `~/.anvil/`. The Ledger is user-level because lessons compound across projects.

## What is deliberately absent

- **Personas.** The Court is a role, not a persona. No "security-auditor", "code-reviewer", or "test-engineer" agents. Adversarial review is one primitive, parameterized by contract check type.
- **Alternative planners / executors / verifiers.** One of each. Extension is via new Contract check types and new Verify probes, not new skills.
- **Configuration profiles.** No quality / balanced / budget / adaptive / inherit. Token budget is not a scoping axis.
- **Brainstorming mode.** The contract is the brainstorming artefact. If the user does not have a contract-shaped intent, they have not finished thinking, and the plugin will ask for clarification via the contract itself.
- **Cost dashboard.** Trace captures cost; `anvil metrics` reports it; there is no separate "budget" surface.
