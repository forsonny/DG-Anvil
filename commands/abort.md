---
name: abort
description: Stop the current run. Captures a reason and, when applicable, a final lesson.
arguments:
  - reason
---

Stop the current Anvil run.

1. The `reason` argument is required. If empty, exit with `{error: "abort requires a reason", code: "E_ABORT_REASON_REQUIRED", details: {}}` on stderr.
2. Read `anvil/state.json`. Mark the in-flight task's status as `failed` with the given reason.
3. If the task has a pending Verify failure and a non-null lesson can be composed, invoke `resetting` to append the lesson; otherwise escalate.
4. Print `{ok: true, aborted: true, reason: <reason>, taskId: <taskId>}` on stdout and exit 0.
