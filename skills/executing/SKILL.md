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

The orchestrator dispatches a subagent per task via the Task tool and then lands the work via the plugin's CLI. The orchestrator NEVER invokes `git`, `Write`, `Edit`, `MultiEdit`, or `NotebookEdit` directly during this loop. Every production-code edit happens inside the task worktree via the dispatched subagent; every git operation happens via the `anvil merge-task` / `anvil reset-task` subcommands.

1. Read the confirmed `anvil/contract.yml` and the confirmed `anvil/plan.yml`.
2. For the task at hand, create a fresh worktree via `node "$CLAUDE_PLUGIN_ROOT/cli/anvil.js" run --task <id>`. This subcommand force-cleans any stale worktree or branch for the same task id before creating the new one; a prior failed run does not block retry.
3. Compose the subagent briefing: the task record (id, title, wave, depends_on, criterion_ids), the full contract, and the worktree path. Nothing else. No prior task's diff, no prior task's rationale.
4. Dispatch a fresh subagent with the briefing via the `Task` tool. The subagent works ONLY inside the worktree path returned by step 2. Every tool call's raw output is captured to `<worktreePath>/anvil/tool-output.jsonl`. The diff is captured to `<worktreePath>/anvil/diff.patch`.
5. When the subagent returns, invoke `node "$CLAUDE_PLUGIN_ROOT/cli/anvil.js" verify --worktree <path> --contract anvil/contract.yml` to run the four-level probe.
6. If Verify's `allGreen` is true: invoke `node "$CLAUDE_PLUGIN_ROOT/cli/anvil.js" merge-task --task <id>`. This commits pending changes in the worktree, merges the branch back with `--no-ff`, removes the worktree, and deletes the branch. The orchestrator never runs `git commit`, `git merge`, `git stash`, or any other git command itself.
7. If Verify is not green: dispatch `judging`. Do NOT attempt to commit, merge, or edit files outside the worktree. If the Court calls for reset, dispatch `resetting` (which appends a lesson and re-queues the task). If the run is stuck, call `node "$CLAUDE_PLUGIN_ROOT/cli/anvil.js" reset-task --task <id>` to tear down the worktree/branch before the next try.
8. The orchestrator hands the captured paths to the `verifying` skill. The orchestrator never reads the captured files itself; only `verifying` reads them.

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
- The orchestrator uses `Write`, `Edit`, `MultiEdit`, `NotebookEdit`, or bash `git` commands itself to modify paths outside the task worktree or outside `anvil/`. The `pre-tool-use` hook blocks these edits during an active run with `E_HOOK_BLOCKED`; treat the block as structural, not advisory (failure-taxonomy row 19: Ghost code).
- The orchestrator improvises git operations (`git merge`, `git stash`, `git commit`, manual conflict resolution) instead of calling `anvil merge-task` or `anvil reset-task`. The plugin owns the worktree lifecycle; the orchestrator composes only.

## Verification

Check each dispatch with:

1. `node "$CLAUDE_PLUGIN_ROOT/cli/anvil.js" run --task <id>` exits 0 on success or non-zero with a structured `{error, code, details}` on stderr.
2. `<worktreePath>/anvil/diff.patch` exists; is non-empty iff the task produced any change; is the entire diff captured as-is.
3. `<worktreePath>/anvil/tool-output.jsonl` exists; each line is a valid JSON record matching the closed tool-output schema.
4. The orchestrator's `anvil/state.json` contains no key whose value is a free-form string from the subagent's narration.
