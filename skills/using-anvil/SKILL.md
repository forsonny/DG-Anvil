---
name: using-anvil
description: Bootstrap loader for the DG-Anvil plugin. Enumerates the five primitives, seven skills, five commands, and the core loop. Loaded at session-start.
---

## Overview

DG-Anvil enforces the Anvil loop as structural gates, not advisory prompts.

Five primitives: Contract, Plan, Loop, Ledger, Court.

Seven skills that compose the loop:

1. `contracting` - turn an intent into a machine-readable contract with four verification levels per criterion.
2. `planning` - decompose the contract into an atomic task DAG with wave ordering; every task cites contract criterion ids.
3. `executing` - dispatch a task to a fresh subagent in an isolated worktree.
4. `verifying` - run the four verification probes (Exists, Substantive, Wired, Functional) against the task output.
5. `judging` - dispatch the Court on evidence-only inputs to adjudicate the verification result.
6. `resetting` - on fail, append a non-null lesson to the ledger and re-queue the task.
7. `authoring-skills` - meta-skill governing how skills themselves are written, reviewed, and retired.

Five commands surfaced by the plugin:

- `/start` - begin a run: draft and confirm the contract, then produce the plan.
- `/continue` - resume the loop at the next task.
- `/ship` - finalize and integrate passing work.
- `/abort` - stop the run, capture a lesson if appropriate.
- `/ledger` - query the global lesson ledger.

## When to Use

Loaded by `hooks/session-start` on every fresh Claude Code session and after any `/clear` or `/compact`. Re-load it at the start of any sub-session where the contract must be rehydrated into context.

## Process

1. Read the active contract at `./anvil/contract.yml`. If absent, route to `contracting`.
2. Read the active plan at `./anvil/plan.yml`. If absent, route to `planning`.
3. For the next queued task, dispatch `executing` in a fresh worktree.
4. On task completion, run `verifying` against all four levels named on the criterion.
5. If any level fails, dispatch `judging`; otherwise mark the task verified.
6. On Court verdict fail, run `resetting`: append a non-null lesson, re-queue the task.
7. When all tasks pass, run `/ship`.

## Rationalizations

Reject the following shortcuts (failure-taxonomy row citations in parentheses):

- "The contract is obvious; skip to plan." (row 7: skipping the contract step.)
- "This task is small; verify informally." (row 24: verification by agent claim.)
- "One fail is fine; proceed to next task." (row 28: ignoring a fail by minimising it.)

## Red Flags

If any of these conditions obtain, stop and route back to the loop:

- Contract missing the four verification levels on any criterion (row 8: contract without levels).
- Plan with a task that cites no criterion id (row 14: plan drift from contract).
- Agent attempting to mark a task verified without running all named levels (row 25: claim-over-check).

## Verification

Check the current loop state with `anvil contract --validate` and `anvil plan --validate`. Both must exit 0 for the loop to proceed. If either exits non-zero, the structured error names the failing invariant and the skill to route to.
