---
name: planning
description: Decompose a confirmed contract into an atomic task DAG with wave ordering. Every task cites one or more contract criterion ids.
---

## Overview

This skill produces `anvil/plan.yml` as a task DAG with wave ordering. An atomic task is one that produces one diff that one Verify pass can score. Every task names the contract criterion id(s) it is accountable for; tasks without citations are invalid and do not execute. Waves are topologically sorted: a task in wave `k` depends only on tasks in waves strictly less than `k`.

## When to Use

Invoked by the orchestrator after `anvil/contract.yml` is confirmed. Not invoked from user prompts directly. If the contract is edited after the plan is written, this skill is re-invoked to regenerate the plan from scratch.

## Process

1. Read the confirmed `anvil/contract.yml` via `cli/lib/contract.js loadAndValidate`.
2. Decompose the work into atomic tasks. An atomic task produces one diff that one Verify pass can score. Cross-cutting refactors that touch three criteria should become three tasks, not one.
3. For every task, name the contract criterion id(s) in `criterion_ids`. A task with an empty citation list is invalid. Re-run decomposition until every criterion is covered by at least one task.
4. Assign a `wave` integer per task. Wave 0 has no `depends_on`; wave `k` tasks depend only on tasks whose wave is less than `k`. Parallelism is the default; tasks in the same wave run in parallel worktrees.
5. Write `anvil/plan.yml` and run `anvil plan --validate anvil/plan.yml --contract anvil/contract.yml`. Exit code 0 is required to save.
6. If validation fails, surface the `details.rule` string to the orchestrator; do not save a half-valid plan.

## Rationalizations

Reject the following shortcuts:

- "This one task covers everything; no need to split." Scope creep disguises itself as efficiency; an atomic task is scorable, a combined task is not (failure-taxonomy row 4: Scope creep).
- "Over-produce now and trim later." Over-production burns context and muddies the Verify signal (failure-taxonomy row 10: Over-production).
- "The plan can drift from the spec; the agent will catch it later." Plan drift is silent until Verify fails on a criterion no task cited (failure-taxonomy row 26: Spec-to-plan drift).

## Red Flags

If any of these conditions obtain, the plan is rejected:

- A contract criterion id does not appear in any task's `criterion_ids` (failure-taxonomy row 26: Spec-to-plan drift).
- A task's scope extends beyond the criterion it cites (failure-taxonomy row 4: Scope creep).
- Two tasks in different waves touch the same file without a declared `depends_on` edge (failure-taxonomy row 17: Cross-task architectural drift).

## Verification

Before saving the plan, run in order:

1. `anvil plan --validate anvil/plan.yml --contract anvil/contract.yml` exits 0.
2. Every contract criterion id appears in at least one task's `criterion_ids` array.
3. The task DAG, interpreted via `topologicalWaves`, produces one wave per distinct `wave` integer and contains no cycles.
4. Every task in wave `k > 0` has a `depends_on` whose members are tasks in waves `< k`.
