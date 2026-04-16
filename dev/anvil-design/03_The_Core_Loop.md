# 03 - The Core Loop

Open `anvil_workflow.svg` alongside this page. Every other section of the report is commentary on that picture.

## The nine phases

| # | Phase | Who runs it | Output | Hard gate? |
|---|---|---|---|---|
| 1 | **Intake** | Orchestrator | Parsed intent + target repo | No |
| 2 | **Contract** | Contracting skill (authored by orchestrator, queries Ledger) | `anvil/contract.yml` | Yes - human confirms once |
| 3 | **Plan** | Planning skill | `anvil/plan.yml` (DAG of atomic tasks, wave-ordered) | Yes - plan must parse; every task must cite contract lines |
| 4 | **Dispatch** | Orchestrator | One worktree per task in the current wave | No - deterministic |
| 5 | **Execute** | Fresh subagent per task | Diff in worktree + captured tool output | No |
| 6 | **Verify** | Verifying skill (runs in separate process) | Pass/fail per level (Exists, Substantive, Wired, Functional) | Yes - all four must green |
| 7 | **Judge** | The Court (fresh subagent, sees only contract + diff + verify output) | Two verdicts (spec, quality) | Yes - both verdicts must green |
| 8a | **Mark Done** | Orchestrator | Task state -> done; next wave unlocks | - |
| 8b | **Reset** | Resetting skill | Session killed; lesson written to Ledger; task re-queued with improved input | - |
| 9 | **Ship** | Orchestrator | Contract replay + final whole-branch Court + PR opened | Yes - human merges |

## The loop, written as pseudocode

```
contract = author_contract(user_intent, ledger.query(user_intent))
confirm_once(contract)                     # human touchpoint 1

plan = author_plan(contract)
waves = topo_sort(plan.tasks)

for wave in waves:
    for task in parallel(wave):
        loop_count = 0
        while True:
            loop_count += 1
            worktree = fresh_worktree(task)
            diff, output = execute_in_fresh_subagent(task, worktree)
            v = verify(contract.criteria_for(task), diff, output)
            if not v.all_green:
                lesson = diagnose(task, v, output)
                ledger.append(lesson)
                task.input = inject_lesson(task.input, lesson)
                if loop_count >= task.loop_cap:
                    escalate(task, reason="loop cap reached")
                    break
                continue
            j = court(contract, diff, output)   # fresh context, two passes
            if not j.all_green:
                lesson = diagnose(task, j, output)
                ledger.append(lesson)
                task.input = inject_lesson(task.input, lesson)
                if loop_count >= task.loop_cap:
                    escalate(task, reason="judge reject cap")
                    break
                continue
            mark_done(task)
            break

contract.replay()                          # re-run the whole contract against HEAD
court.whole_branch(contract, full_diff)    # Court runs once more on the full change set
open_pr()                                  # human touchpoint 2
```

Everything the plugin does is inside this loop or in service of it.

## Hard gates (what the agent cannot skip)

- **Contract parse.** If the contract file does not parse into all four verification levels for every criterion, it does not save. The orchestrator cannot proceed without a well-formed contract.
- **Task-to-contract citation.** Every task in the plan must cite at least one contract line number. Tasks without citations do not execute.
- **Verify all-or-nothing.** Three greens out of four is a fail. There is no partial credit. "Exists and Substantive but not Wired" means the code is orphaned, not done.
- **Court context isolation.** The Court subagent is given only three inputs: the contract file, the diff, and the captured verify output. Not the plan. Not the implementer's commit message. Not the Ledger. (The Ledger is queried only at Contract time.)
- **Reset-writes-lesson.** A reset that cannot produce a Ledger entry is not allowed; the orchestrator escalates instead. Resetting silently is the theatre-drift failure mode, and Anvil's Ledger is structured so that a null lesson is invalid.
- **Ship replay.** Before PR opens, the full contract is replayed from a clean worktree. The final Court review runs on the whole branch diff, not just the last task.

## Human touchpoints

Two. Confirm the contract once at the start; merge the PR at the end. Everything in between is autonomous or escalated.

**Escalation** is the only non-autonomous interruption in the middle. It fires on:

- Loop cap reached for a task (default: 3 resets per task).
- A lesson the Ledger has already recorded three times without resolution (indicates an architectural problem, not an input problem).
- A Verify or Court failure that names a contract criterion the agent cannot satisfy with the available files (signals contract error, not implementation error).

Escalation pauses the loop and surfaces a structured report. The human decides: amend the contract, amend the plan, or abort with a captured lesson.

## Parallelism

Waves are topologically sorted. Tasks within a wave run in parallel worktrees with isolated subagents. A failure in one worktree does not affect others; the wave only commits once all tasks in it pass. Hooks run once per wave at merge time, not per task, to preserve the single post-wave guarantee.

## Context discipline

The orchestrator holds: the Contract, the Plan, the per-task state (queued, running, passed, failed, escalated), and an index into the Ledger. It does not hold: any implementer's output, any diff, any rationale. Those live in worktrees and in `trace.jsonl`. When the loop ends, the orchestrator can be discarded; the Ledger and the trace remain.

## What this diagram does not show

- The observability layer is drawn across the bottom of the SVG; in practice it wraps every arrow. Every transition writes to `trace.jsonl` with timestamp, agent id, task id, phase, evidence, duration, cost, and outcome.
- The hook layer is drawn as a strip at the bottom. In practice, hooks fire at specific points: `session-start` at the very beginning, `pre-tool-use` before any write/delete/push, `post-tool-use` on every tool result, `user-prompt-submit` on every human turn, `stop` at session end to replay the contract.
- The skill layer is not drawn at all. Skills are the scripts that run each phase; they are listed on page 04.
