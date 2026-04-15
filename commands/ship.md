---
name: ship
description: Finalize a passing run. Open a PR via gh pr create. The human reviews and merges; ship does not merge for the user.
arguments: []
---

Finalize the current Anvil run.

1. Read `anvil/state.json`. Confirm every task's `status` is `passed`. If any task is not passed, exit non-zero with `E_VERIFY` plus the failing task ids.
2. Run the whole-branch Court via `cli/lib/court.js judgeBranch`. Inputs are the full branch diff and the per-task verify outputs. Plan, commit messages, and prior verdicts are structurally withheld.
3. On Court action `request-changes` or `request-clarification`, exit non-zero with `E_WHOLE_BRANCH_COURT_FAILED` and the verdict on stderr.
4. On Court action `merge`, mint a short-TTL `state.meta.ship_approval_token` (max 5 minutes) so the `pre-tool-use` hook permits the ship-phase write paths. Open a PR via `gh pr create`. The human reviews and merges; this command does NOT merge for the user. Two human touchpoints: contract confirm and PR merge.
5. On `gh` failure, exit non-zero with `E_SHIP_PR_FAILED`. Clear the approval token on success, failure, or timeout.
