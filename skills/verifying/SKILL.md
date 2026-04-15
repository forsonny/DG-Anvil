---
name: verifying
description: Run the four verification probes (Exists, Substantive, Wired, Functional) per criterion. All four green per criterion or the criterion fails.
---

## Overview

This skill runs the four-level verification probe per criterion. Exists checks the file or symbol is present. Substantive runs the target symbol against contract-provided inputs and checks for the named observable side effects plus the coverage floor. Wired walks the call graph from the contract's named entry point and confirms the symbol is reachable. Functional runs the declared test runner and checks exit code plus named passes. Three greens out of four is a fail. Invariants are evaluated on every verify pass.

## When to Use

Invoked by the orchestrator after each `executing` dispatch returns. Reads only the captured diff and the captured tool output plus the worktree's source files. Does not read implementer narration.

## Process

1. Read the contract via `cli/lib/contract.js loadAndValidate` to get each criterion and its four verification-level slots.
2. Read the captured `<worktreePath>/anvil/diff.patch` and `<worktreePath>/anvil/tool-output.jsonl`.
3. For each criterion, run Exists first. If Exists fails, short-circuit and mark the criterion failed; do not invoke Substantive, Wired, or Functional for that criterion.
4. If Exists passes, run Substantive. It invokes the target symbol and records coverage plus observable side effects. Pass requires every `must_implement` effect observed and every `must_not` effect absent.
5. If Substantive passes, run Wired. It walks the call graph from the contract's named entry point. Pass requires the required symbols to be called inside the declared line range.
6. If Wired passes, run Functional. It runs the declared runner against the declared target and checks the exit code and named passes.
7. After all criteria are evaluated, run `evaluateInvariants` against the contract's invariants section. Any unknown invariant key yields a warning-status result that blocks `allGreen`.
8. Write the structured result to `<worktreePath>/anvil/verify/verify-result.json`. Return `{ criteria, invariants, allGreen }`.

## Rationalizations

Reject the following shortcuts:

- "The test passed, so the criterion is verified." A green test is not a green criterion; four levels must pass together (failure-taxonomy row 8: Claim-without-evidence).
- "The target symbol exists, so Substantive is covered." Existence is a different probe; Substantive requires behavioural evidence (failure-taxonomy row 13: Semantic empty stub).
- "The import references the module, so it must be Wired." Import is not a call; Wired walks the call graph for reachable call expressions (failure-taxonomy row 12: Orphan implementation).

## Red Flags

If any of these conditions obtain, the verify is rejected:

- The agent writes "the test passed" without recording what it actually covers; Substantive requires the probe to assert observable side effects, not the tautology that the mock returned the mock (failure-taxonomy row 13: Semantic empty stub).
- A criterion whose Exists probe fails still has Substantive, Wired, or Functional probes invoked; short-circuit is mandatory (failure-taxonomy row 8: Claim-without-evidence).
- The symbol is declared in a different file than the contract's `wired.entry_point`; the implementation is orphaned (failure-taxonomy row 12: Orphan implementation).

## Verification

Each verify pass checks:

1. Every criterion has a result object with all four level fields present.
2. For every criterion whose Exists is fail, the other three levels are null (short-circuit evidence).
3. `<worktreePath>/anvil/verify/verify-result.json` exists and is valid JSON with `allGreen` boolean.
4. `evaluateInvariants` was called and any unknown invariant key returned `status: 'unknown'` with a warning.
