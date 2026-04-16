---
name: ship
description: Finalize a passing run. Open a PR via gh pr create. The human reviews and merges; ship does not merge for the user.
arguments: []
---

Finalize the current Anvil run.

1. Read `anvil/state.json`. Confirm every task's `status` is `passed`. If any task is not passed, exit non-zero with `E_VERIFY` plus the failing task ids.
2. Run the whole-branch Court via `cli/lib/court.js judgeBranch`. Inputs are the full branch diff and the per-task verify outputs. Plan, commit messages, and prior verdicts are structurally withheld.
3. On Court action `request-changes` or `request-clarification`, exit non-zero with `E_WHOLE_BRANCH_COURT_FAILED` and the verdict on stderr.

### Step 3.5 — Retroactive-lesson gate (only when applicable)

3.5. Read `anvil/contract.yml`. If the contract contains a non-empty `shipped_gap_note_draft` field (populated by the `contract-drafter` agent when `source_intent` referenced an existing file at repo HEAD), the orchestrator presents a sub-question to the user in the chat. This is a piggyback on the existing PR-review touchpoint - NOT a new touchpoint.

Present this block verbatim:

> Anvil noticed this run modified an existing file, so the original contract for that area may have been under-specified. Proposed lesson for future contracts on `<pattern tags>`:
>
> > `<shipped_gap_note_draft>`
>
> Which criterion in THIS contract guards against that gap? (Pick one: `C1`, `C2`, ...)
>
> Reply `confirm C<N>` (to use the draft text), `edit C<N>: <your text>` (to override the draft), or `skip` (no lesson is written).

On `confirm C<N>` or `edit C<N>: <text>`:

- If the user replied `edit`, use their text; else use the draft text.
- Call `node "$CLAUDE_PLUGIN_ROOT/cli/anvil.js" ledger retroactive --contract anvil/contract.yml --criterion C<N> --gap-note "<text>"`.
- The CLI routes through `cli/lib/ledger-write.js retroactive(...)` which enforces structural non-null, refuses a missing criterion id, and runs the Jaccard-supersession check.
- If the call returns `E_INVALID_LESSON` or `E_NULL_LESSON`, surface the structured error to the user and proceed WITHOUT a retroactive lesson. Do not block `/ship`.

On `skip`:

- Do not write a lesson. Proceed.

If the contract has no `shipped_gap_note_draft` field, skip this step entirely. It never fires for greenfield work.

### Step 4 — PR

4. On Court action `merge` (and after Step 3.5), mint a short-TTL `state.meta.ship_approval_token` (max 5 minutes) so the `pre-tool-use` hook permits the ship-phase write paths. Open a PR via `gh pr create`. The human reviews and merges; this command does NOT merge for the user. **Two human touchpoints**: contract confirm and PR merge (the Step 3.5 sub-question piggybacks on the PR-review touchpoint and is NOT a third touchpoint).

5. On `gh` failure, exit non-zero with `E_SHIP_PR_FAILED`. Clear the approval token on success, failure, or timeout.

### Post-ship revert

If the shipped change is later reverted upstream, invalidate the retroactive lesson without deleting it:

```bash
node "$CLAUDE_PLUGIN_ROOT/cli/anvil.js" ledger invalidate --lesson <lesson_id> --reason revert
```

This writes a marker that future `anvil ledger query` calls honour; the original lesson is preserved as an audit trail.
