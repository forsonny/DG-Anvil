# 07 - The Court

The Court is Anvil's adversarial reviewer. It exists because self-review is structurally unable to catch the failures that self-review is meant to catch.

## What the Court is

A fresh subagent, invoked once per task (after Verify) and once per branch (before PR open), with three inputs and no others:

1. The active Contract.
2. The diff produced by the implementer.
3. The captured Verify output.

The Court does not receive: the Plan, the Ledger, the implementer's commit message, the implementer's reasoning, any prior Court verdict on sibling tasks, any personal context about the codebase beyond what the diff shows.

This input isolation is not a preference; it is what makes adversarial review work. An agent that can see the implementer's reasoning will rationalize along the same path. An agent that sees only contract + diff + output is forced to check, not to agree.

## Two passes in fixed order

### Pass 1 - Spec compliance

The question: **does the evidence match the contract, criterion by criterion?**

For each criterion in the contract:

- Confirm Exists was green by inspecting the diff.
- Confirm Substantive was green by inspecting the diff for the `must_implement` and `must_not` clauses.
- Confirm Wired was green by tracing the named call site in the diff.
- Confirm Functional was green by reading the captured tool output for the probe command and the named tests.

Output: per-criterion verdict (pass / fail / suspicious) with exact line citations from the diff and exact string citations from the output. A "suspicious" verdict (the evidence technically passes but looks contrived - a test that asserts trivially, a symbol whose body looks like it was written to satisfy the probe and nothing else) is a fail that requires an escalation tag, not a reset.

### Pass 2 - Code quality

Only runs if Pass 1 is fully green. The question: **would I merge this?**

Not "is this good code" - the Court does not have taste. "Would I merge this" means:

- Does the diff touch only files the task scope names, or does it drift?
- Are there changes unrelated to the contract (drive-by refactoring, comment additions, formatting changes)?
- Are there new abstractions that the contract did not request?
- Are there orphans: new imports, new symbols, new files that are not referenced?
- Does the diff contradict any Invariant in the contract (even one not caught by Verify)?

Output: merge / request-changes / request-clarification. Request-changes fails the task; request-clarification surfaces to escalation.

## Why spec first, quality second

If quality is assessed first and fails, the implementer gets feedback on style and the spec gap is never surfaced - the next iteration fixes style and stays wrong. Spec-first forces the failure to be categorical: the code does not meet the contract; iterate until it does; *then* ask whether it is mergeable.

## Why the Court cannot see the Ledger

The Ledger was already consulted when the contract was authored. The contract itself is the compiled output of Ledger queries. Letting the Court see the Ledger directly would cause it to interpret the contract through the lens of past failures, which is the contracting skill's job, not the Court's. The Court judges **this** contract against **this** diff.

## Why the Court cannot see the Plan

The Plan is the implementer's roadmap. It contains decisions about decomposition, ordering, and file choice that the contract does not mandate. Showing the Plan to the Court biases it toward "did the implementer follow the plan" - but the contract is the source of truth, not the plan. A plan mistake that still produces contract-compliant code is acceptable; a plan success that produces contract-noncompliant code is not.

## The Devil's Advocate subagent

When a Verify output is Medium or Low confidence - the probe passed but under suspicious conditions (coverage delta is zero, test output is shorter than expected, tool returned success but stderr contains warning strings) - the Court dispatches a second subagent in parallel with Pass 1 whose sole instruction is "find the reason this is wrong."

Devil's Advocate does not have veto power. Its output is attached to the Pass 1 verdict as a confidence modifier. A Pass 1 green plus a non-empty Devil's Advocate output is escalated to Pass 2 with a `suspicious` tag that makes Pass 2 stricter (treats all `request-clarification` as `request-changes`).

This pattern addresses the single empirical weakness of verifier-only gates: a test that passes because it tests nothing. Devil's Advocate is cheap (one short subagent call) and its false-positive rate is tolerable because it cannot reject, only modify.

## Whole-branch Court

Before `/ship` opens a PR, a final Court runs once on the full branch diff (everything from the base commit to HEAD) against the full contract. This catches:

- **Cross-task architectural drift.** No per-task review sees the whole surface; the orchestrator holds only metadata. Drift that accumulates across tasks is invisible until someone reads the full diff. The whole-branch Court is that reader.
- **Invariant violations across tasks.** A single task may respect each invariant in isolation, yet their composition may violate one (e.g. two tasks each adding a valid import, but the combined set triggers `no_new_dependencies`).
- **Orphans created by later tasks removing earlier tasks' consumers.** A function wired by task 2 whose caller is removed by task 4 is orphaned by the final state regardless of per-task Court passing.

Whole-branch Court is expensive (it reads the full diff) and runs once per PR. If it fails, the failure is always escalated, never auto-reset - by this point the cost of another loop is higher than the cost of a human look.

## Why the Court is not a persona

Predecessors sometimes modeled review as a persona ("senior engineer", "security auditor", "test engineer"). Personas are stances; stances are prose; prose is a weak forcing function. The Court is instead parameterized by the contract's check types. A security-heavy contract invokes a Court prompted to scrutinize injection, credential flow, and trust boundaries. A performance-heavy contract invokes a Court prompted to scrutinize allocation patterns, blocking IO, and complexity classes. The parameterization comes from the contract, not from a stance library. One primitive, parameterized. Not a catalogue of roles.

## Court output format

```yaml
court_verdict:
  task: T3
  pass: 1           # spec compliance
  result: fail
  findings:
    - criterion: C1
      level: substantive
      verdict: fail
      evidence_cited: "src/middleware/rate_limit.py:22-28"
      output_cited: "test_6th_request_returns_429: FAIL - received 200"
      reason: "bucket decrement condition never fires when request rate matches exactly max_req / window; off-by-one in the comparison"
      suspicious: false
  recommendation:
    action: reset
    diagnose_target: "contract_gap.substantive; criterion C1 under-specified on boundary conditions"
```

Every finding must cite the diff line and the output string. Unevidenced findings are rejected at the output-parse step - the Court cannot hand-wave.

## Cost discipline

The Court is expensive because it uses the strongest model available. Anvil does not make this negotiable. Token budget is not a scoping axis in this plugin; a Court pass that catches a spec-to-implementation mismatch saves the cost of a full reset plus a full re-execute plus a subsequent patch cycle. The economic argument for cheap review is exactly inverted once you measure theatre-drift cost in weeks-to-find-bugs.
