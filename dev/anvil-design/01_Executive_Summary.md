# 01 - Executive Summary

## What Anvil is

Anvil is a Claude Code plugin that turns an ambiguous user intent into a merged pull request with at most two human touchpoints. The plugin is a single loop - Intake, Contract, Plan, Dispatch, Execute, Verify, Judge, Pass or Reset - plus a persistent Ledger that grows on every reset and feeds every future run. There are no optional modes, no competing pipelines, no light-path shortcuts. One orchestration system, narrow on purpose.

## The three commitments

1. **Evidence closes every loop.** A task is not "done" because a subagent says so. It is done when an independent process reads fresh output from the contract's own checks and confirms them, and a judge in isolated context confirms the output matches the contract.
2. **Bad output is diagnostic, never product.** A failing task is never patched in place. The session is killed, the cache is dropped, the input is repaired, a lesson is written, and the task is re-run. Patch-in-place is syntactically forbidden.
3. **The agent is disposable; the Ledger is not.** Fresh subagents do every atomic task. The orchestrator carries nothing but the Plan, the Contract, and the Ledger index. Context is expected to die. Learning is not.

## What gets replaced

One plugin replaces the class that currently includes superpowers, agent-skills, get-shit-done, turbo, karpathy-guidelines, and the agent-coding-framework diagram. The strongest ideas in each are preserved under one roof; the accumulated sprawl, the overlapping light-paths, the advisory-only hooks, and the compensatory-patch layers are dropped. See page 09 for the capabilities matrix.

## What is new versus the class it replaces

- **The Ledger** - the feedback loop none of the predecessors had. Every reset produces an indexed lesson that is queried on the next run.
- **The Court** - an adversarial judge that only ever sees the contract, the diff, and the test output. Never the implementer's reasoning, never the plan's history. Sycophantic drift has nowhere to hide.
- **The Contract** - a machine-evaluable success object, not a prose spec. Four-level verification (Exists, Substantive, Wired, Functional) is built into its grammar.
- **Observability as a first-class layer** - `trace.jsonl` plus a metrics CLI covers reset rate, time-to-green, lesson hit rate, judge reject rate, and per-agent calibration. Theatre-drift has a detector.
- **Hands-off default** - two human touchpoints: contract confirmation at the start, PR merge at the end. Escalation is the exception, not the rhythm.

## What is deliberately out of scope

- **Not a skill catalogue.** Seven skills, not twenty-one, not seventy. If a task does not need a skill, it does not get one.
- **Not a meta-methodology.** Anvil does not teach "senior-engineer discipline" in prose. It enforces a loop. Discipline is a side effect, not the product.
- **Not pluggable.** There is no plugin-of-plugins architecture. The loop is the loop. Extensions happen by adding new Contract check types, new Verify probes, and new Ledger pattern indexes, not by adding new modes.
- **Not a replacement for the developer's judgment.** Anvil makes agent work cheap to absorb, not cheap to trust. The final merge is still the human's.

## What the reader will find in the rest of this report

A narrow design, spelled out. Every page exists because a specific failure mode in the predecessor class demands a specific answer. Page 10 is the index of those failure modes and the component that answers each.
