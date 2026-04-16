---
name: planning
description: Decompose a confirmed contract into an atomic task DAG with wave ordering. Every task cites one or more contract criterion ids.
---

## Overview

This skill produces `anvil/plan.yml` as a task DAG with wave ordering. An atomic task is one that produces one diff that one Verify pass can score. Every task names the contract criterion id(s) it is accountable for; tasks without citations are invalid and do not execute. Waves are topologically sorted: a task in wave `k` depends only on tasks in waves strictly less than `k`.

**Invoking the Anvil CLI:** the CLI is `cli/anvil.js` inside the plugin directory, NOT on `PATH`. Use `node "$CLAUDE_PLUGIN_ROOT/cli/anvil.js" <subcommand> ...` for every invocation.

## When to Use

Invoked by the orchestrator after `anvil/contract.yml` is confirmed. Not invoked from user prompts directly. If the contract is edited after the plan is written, this skill is re-invoked to regenerate the plan from scratch.

## Process

Steps 1 and 4 run in the orchestrator's main thread. Steps 2 and 3 (decomposition + YAML authoring) are dispatched to a fresh subagent. The orchestrator holds only the confirmed contract and the written `anvil/plan.yml` file. It never holds the decomposition reasoning.

1. Confirm `anvil/contract.yml` exists and validates (`node "$CLAUDE_PLUGIN_ROOT/cli/anvil.js" contract --validate anvil/contract.yml` exits 0). If it does not, route back to `contracting`; planning does not run against an unconfirmed contract.
2. **Dispatch the `plan-drafter` agent** (defined at `agents/plan-drafter.md`) using the `Task` tool. Pass in the briefing: the repository path and the path to `anvil/contract.yml`. The subagent reads the contract, decomposes the work into an atomic task DAG with wave ordering, writes `anvil/plan.yml`, runs `anvil plan --validate`, and returns exactly one sentence. **Do NOT decompose or write the YAML inline in the orchestrator thread** - the orchestrator's context stays clean.
3. Read the returned one-sentence summary from the subagent. If the summary indicates a validation failure, surface the `details.rule` string to the user and stop.
4. The orchestrator now holds the task DAG by file reference (`anvil/plan.yml`). It does not re-read the whole plan for every subsequent dispatch; it reads individual task records as the `executing` skill requests them.

## Rationalizations

Reject the following shortcuts:

- "This one task covers everything; no need to split." Scope creep disguises itself as efficiency; an atomic task is scorable, a combined task is not (failure-taxonomy row 4: Scope creep).
- "Over-produce now and trim later." Over-production burns context and muddies the Verify signal (failure-taxonomy row 10: Over-production).
- "The plan can drift from the spec; the agent will catch it later." Plan drift is silent until Verify fails on a criterion no task cited (failure-taxonomy row 26: Spec-to-plan drift).
- "I'll decompose the tasks inline; it's faster." Inline decomposition fills the orchestrator context with reasoning that should live in a fresh subagent (failure-taxonomy row 16: Context-window collapse).

## Red Flags

If any of these conditions obtain, the plan is rejected:

- A contract criterion id does not appear in any task's `criterion_ids` (failure-taxonomy row 26: Spec-to-plan drift).
- A task's scope extends beyond the criterion it cites (failure-taxonomy row 4: Scope creep).
- Two tasks in different waves touch the same file without a declared `depends_on` edge (failure-taxonomy row 17: Cross-task architectural drift).
- The orchestrator decomposes tasks in its own thread instead of dispatching the `plan-drafter` agent (failure-taxonomy row 16: Context-window collapse).

## Verification

Before saving the plan, run in order:

1. `node "$CLAUDE_PLUGIN_ROOT/cli/anvil.js" plan --validate anvil/plan.yml --contract anvil/contract.yml` exits 0.
2. Every contract criterion id appears in at least one task's `criterion_ids` array.
3. The task DAG, interpreted via `topologicalWaves`, produces one wave per distinct `wave` integer and contains no cycles.
4. Every task in wave `k > 0` has a `depends_on` whose members are tasks in waves `< k`.
