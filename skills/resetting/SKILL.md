---
name: resetting
description: On verify or judge fail, append a non-null lesson to the Ledger and re-queue the task. Null lessons are refused; the task escalates instead.
---

## Overview

This skill closes the failure loop. When Verify or the Court reports fail, the skill composes a lesson from the captured Verify evidence and appends it to the global Ledger at `~/.anvil/ledger.jsonl`. The task is then re-queued with the injected counter-example in the contract's `counter_examples` map. A reset that cannot produce a non-null lesson escalates the task rather than appending a null lesson.

## When to Use

Invoked by the orchestrator when `verifying.allGreen === false` or when the Court returns `request-changes` with a non-empty gap. Not invoked by user prompts directly. Runs at most `loop_cap` times per task before the task is escalated.

## Process

1. Read the Verify result at `<worktreePath>/anvil/verify/verify-result.json` and the per-criterion failures.
2. Read the contract to identify which criterion's gap the reset is closing.
3. Compose a lesson with the required non-null fields: `contract_gap` (the criterion the contract failed to constrain), `evidence` (the Verify probe output that demonstrated the gap), `remediation` (the one-sentence counter-example the next contract should inject). All three must be non-null and non-empty.
4. Attempt to call `ledger-write.append(lesson)`. If any required field is null or empty, `E_NULL_LESSON` is thrown; the reset path catches this and escalates the task instead of appending a null lesson.
5. On successful append, re-queue the task with the fresh counter-example injected into the contract's `counter_examples` map. The task's `loop_count` increments by one.
6. If `loop_count` reaches the task's `loop_cap`, the task is escalated (status `escalated`) rather than re-queued. The escalation surface (Stage 4) presents the options to the user.

## Rationalizations

Reject the following shortcuts:

- "The gap is obvious; I'll write a short remediation and move on." A short remediation that doesn't name the observable counter-example is a null lesson; the Ledger rejects it. Null lessons poison future contracts (failure-taxonomy row 20: Null-lesson escape hatch).
- "One more reset will fix it; push past the loop cap." The loop cap is binding; past it the task escalates. Repeated resets without a new lesson signal a contract defect, not an implementation defect (failure-taxonomy row 20).
- "Appending a lesson with empty `remediation` is fine as a placeholder." `cli/lib/ledger-write.js` refuses the append; placeholders are denied at the write path (structural guard; `E_NULL_LESSON`).

## Red Flags

If any of these conditions obtain, the reset is refused:

- The lesson's `contract_gap`, `evidence`, or `remediation` field is null or empty; this is a null lesson and is refused by `ledger-write.append` (failure-taxonomy row 20: Null-lesson escape hatch).
- The task has reached `loop_cap`; no further reset is attempted; the task is escalated.
- The proposed lesson duplicates an existing lesson's id without superseding it (`E_INVALID_SUPERSESSION`).

## Verification

Each reset checks:

1. `ledger-write.append(lesson)` returned `{ appended: true }` with a valid lesson id.
2. The contract's `counter_examples` map was updated with the new lesson's id and `remediation` text.
3. The task's `loop_count` incremented by exactly one.
4. If the task reached `loop_cap`, the task's status became `escalated` and no append occurred.
