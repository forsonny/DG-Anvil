---
name: executing
description: Dispatch one fresh subagent per plan task inside a per-task git worktree. Capture diff and tool output; never carry state across dispatches.
---

## Overview

This skill dispatches one subagent per plan task, inside a per-task git worktree. Every subagent receives the task record and the contract inlined; the orchestrator reads only the captured diff and the captured tool-output. It does not read implementer narration. State never carries across dispatches; every briefing is composed from the parsed contract and parsed plan.

**Invoking the Anvil CLI:** the CLI is `cli/anvil.js` inside the plugin directory, NOT on `PATH`. Every `anvil` invocation below means `node "$CLAUDE_PLUGIN_ROOT/cli/anvil.js"`.

## When to Use

Invoked by the orchestrator for each plan task once the task's wave unlocks. Not invoked by user prompts. Every task gets its own fresh subagent and its own worktree; two tasks never share a subagent or a worktree.

## Process

1. Read the confirmed `anvil/contract.yml` and the confirmed `anvil/plan.yml`.
2. For the task at hand, create a fresh worktree via `node "$CLAUDE_PLUGIN_ROOT/cli/anvil.js" run --task <id>`, which delegates to `cli/lib/worktree.js create`.
3. Compose the subagent briefing: the task record (id, title, wave, depends_on, criterion_ids), the full contract, and the worktree path. Nothing else. No prior task's diff, no prior task's rationale.
4. Dispatch a fresh subagent with the briefing. The subagent works only inside the worktree. Every tool call's raw output is captured to `<worktreePath>/anvil/tool-output.jsonl`. The diff is captured to `<worktreePath>/anvil/diff.patch`.
5. When the subagent finishes, return `{ diffPath, toolOutputPath, status, briefingHash }`. Discard the subagent's narration.
6. The orchestrator hands the captured paths to the `verifying` skill. The orchestrator never reads the captured files itself; only `verifying` reads them.

## Rationalizations

Reject the following shortcuts:

- "Re-use the previous subagent; it already has the contract in context." That is context pollution; fresh dispatch per task is non-negotiable (failure-taxonomy row 1: Context pollution).
- "The subagent's reasoning is worth preserving; let me summarise it into the orchestrator state." Summaries are narration; the orchestrator does not hold narration. Keep only the captured diff and tool output (failure-taxonomy row 16: Context-window collapse).
- "While I'm in here, let me also clean up that unrelated file." The worktree is scoped to one task; drive-by refactoring violates scope and corrupts the Verify signal (failure-taxonomy row 11: Drive-by refactoring).

## Red Flags

If any of these conditions obtain, the dispatch is rejected:

- The briefing carries a reference to a prior task's diff, rationale, or tool output (failure-taxonomy row 1: Context pollution).
- The orchestrator state after the run contains any key derived from the subagent's narration (failure-taxonomy row 16: Context-window collapse).
- The diff touches files outside the scope declared for the task's criteria (failure-taxonomy row 19: Ghost code).

## Verification

Check each dispatch with:

1. `node "$CLAUDE_PLUGIN_ROOT/cli/anvil.js" run --task <id>` exits 0 on success or non-zero with a structured `{error, code, details}` on stderr.
2. `<worktreePath>/anvil/diff.patch` exists; is non-empty iff the task produced any change; is the entire diff captured as-is.
3. `<worktreePath>/anvil/tool-output.jsonl` exists; each line is a valid JSON record matching the closed tool-output schema.
4. The orchestrator's `anvil/state.json` contains no key whose value is a free-form string from the subagent's narration.
