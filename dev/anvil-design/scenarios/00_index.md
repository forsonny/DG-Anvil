# Anvil Scenarios - Index

Ten hypothetical runs through the Anvil plugin, each pressure-tested by a 100-question deep-discovery interrogation. The goal is to show what the plugin does on realistic user tasks, not to sell it - each scenario is explicit about where the design fits, where it strains, and where a human still has to look.

## The ten scenarios

| # | Title | Load-bearing question |
|---|---|---|
| 01 | Frontend Design - Polished Landing Page | How does Anvil verify a frontend LOOKS GOOD, not just works? |
| 02 | Backend Design - Multi-Tenant API with RLS | How does an atomic-task DAG propagate a global invariant across dozens of endpoint tasks that never share context? |
| 03 | New Feature - Email Notifications | How does the Contract express "do not break existing flows" as a machine-checkable predicate? |
| 04 | Bug Fix - Flaky Race Condition | How does Anvil force root-cause diagnosis instead of patch-and-pray? |
| 05 | Refactoring - God-Module Breakup | How does Anvil prove NON-CHANGE? |
| 06 | Security Hardening - Pentest Remediation | How does the Court catch "fixed the reported instance but left the pattern elsewhere"? |
| 07 | Performance - Dashboard Latency Fix | How does Anvil enforce measure-first, and avoid declaring victory at a local minimum? |
| 08 | Framework Migration - React 17 to 19 | How does the Ledger accumulate mid-run to turn a 50-task migration into a 2-3-reset convergence? |
| 09 | Third-Party Integration - Stripe Checkout | How does Verify probe a webhook that fires from Stripe, not from test code? |
| 10 | Test Backfill - Billing Module | How does Anvil verify that tests actually test something, without the tests testing themselves? |

## How to read a scenario

Each scenario follows the same structure:

- **User Intent** - the user's exact prompt.
- **Context** - what the situation makes hard.
- **The Load-Bearing Question** - the single pressure point that tests Anvil's design.
- **Walk-Through** - how the Contract, Plan, Execute/Verify, Judge, and Ledger actually handle the task, with concrete YAML and code.
- **A Realistic Failure and Reset** - one concrete loop iteration showing the closed-loop mechanism.
- **Critical Issues Surfaced by Deep Discovery** - honest gaps found by the 100-question interrogation.
- **Strengths Confirmed** - what the design genuinely handles well.
- **Design Refinements Proposed** - schema additions, new probe types, or contract templates that fell out of the analysis.
- **Bottom Line** - one paragraph: is Anvil genuinely useful for this task, and what residual human judgment remains?

## Cross-cutting insights (aggregated across the ten)

The 100-question discoveries repeatedly surfaced the same kinds of refinement. These are stronger evidence than any single scenario's recommendation:

### 1. Contract templates per task-kind

The generic contract schema serves feature work well, but **every other task class needs a specialised template**:

- `kind: refactor` - baseline-capture phase, AST-hash Substantive, no_new_public_exports invariant (Scenario 05).
- `kind: performance` - C0 baseline criterion as gate on C1, regression-budget invariant (Scenario 07).
- `kind: bug-fix` - reproducer-determinism criterion, root-cause-named vocabulary (Scenario 04).
- `kind: framework-migration` - banned_symbols invariant, deprecation-warning probe, same-run-lesson-priority (Scenario 08).
- `kind: security-remediation` - threat-model Invariants, pattern_scan probe, exploit_replay (Scenario 06).
- `kind: test-backfill` - mutation-survival probe, no_mocking_sut invariant (Scenario 10).

Design implication: the `contracting` skill should select a sub-template from intent shape, and refuse to save a contract missing that sub-template's mandatory slots.

### 2. New Verify probe types needed

The four-level grammar (Exists, Substantive, Wired, Functional) is the right skeleton, but several **new probe types** emerged repeatedly:

- `pattern_scan` (semgrep/bandit/gitleaks): Scenarios 06, 10.
- `exploit_replay` (pre-fix fails + post-fix passes): Scenario 06.
- `mutation_survival` (mutmut/stryker): Scenario 10.
- `template_visual` (Outlook/Gmail/Apple Mail render diff): Scenario 03.
- `rhythm_audit` / `token_audit` / `motion_audit`: Scenario 01.
- `stress` (concurrent-ops under load): Scenarios 04, 07, 09.
- `ast_hash_matches` (body-identity to baseline): Scenario 05.
- `policy_coverage_probe` (RLS policy scan across schema): Scenario 02.
- `webhook_idempotency` (replay + concurrent-delivery): Scenario 09.

All of these are new rows in the Verify catalogue, not new skills. Anvil's "new rows, not new skills" extension policy holds.

### 3. Invariant types, not just Invariant list

Scenarios repeatedly pushed the `Invariants` block beyond a flat list. **Typed invariants** carry metadata the flat form cannot:

- `system_invariants` with re-evaluation triggers (Scenario 02): re-check on any task that touches the matching surface, not only the declaring task.
- `regression_suite` as a named type (Scenario 03): run the existing test suite on every Verify, not only at ship.
- `regression_budget` with per-endpoint tolerances (Scenario 07).
- `cwe_budget` naming a vulnerability class with required count (Scenario 06).
- `banned_symbols` with regex + scope (Scenario 08).
- `mock_allowed_at` allow-list for test contracts (Scenario 10).
- `no_secret_patterns` / `request_body_not_logged_in` (Scenarios 03, 09).

Design implication: promote Invariants from a free list to a typed block with per-type enforcement cadence.

### 4. Mid-run Ledger injection

Single strongest architectural change proposed. Today, the Ledger is queried at contract-authoring time. **Mid-run injection** (Scenarios 08 and 06 most acutely) turns large repetitive tasks from a reset-storm into a 2-3-iteration convergence. A Ledger lesson written on the first reset needs to reach tasks T16..T57 in the same run, not only the next `/start`.

Add `same_run_priority: true` to lesson schema. The `resetting` skill patches the live contract for queued tasks, not only the Ledger for future runs.

### 5. Court Pass 2 parameterisation by task-kind

The generic "would I merge this" question is correct for features but too permissive for other task classes:

- Refactor: "would I merge this as a pure move?" (Scenario 05)
- Migration: "preserved behavior vs 'modernized'?" (Scenario 08)
- Performance: "did the optimizer fix the biggest thing or the easy thing?" (Scenario 07)
- Security: "narrow enough to ship, wide enough to close the pattern class?" (Scenario 06)
- Test backfill: "would this test fail if the SUT broke plausibly?" (Scenario 10)
- Frontend: "does this match the reference, or is it generic-shadcn?" (Scenario 01)

Design implication: Court Pass 2 prompt is parameterised by `contract.kind`. The contract schema names the kind; the Court inherits the stance.

### 6. Baseline-capture as a missing primitive

Two scenarios independently demanded a pre-execution baseline phase: refactor (AST hash of current behaviour) and performance (profiler + latency baseline). Neither fits the current "contract describes a new-behaviour goal" shape.

Design implication: a `baseline` primitive alongside Contract, Plan, Loop, Ledger, Court. Storage `anvil\baseline\` per contract. Populated by an explicit baseline-capture task that runs before any mutating task.

### 7. Staging-runbook / human-verification artefact

For scenarios whose correctness CI cannot reach (Stripe sandbox-vs-production, security pentest findings requiring staging, hosted checkout UI), Anvil must surface a machine-readable `human_verification_runbook` at `/ship` time. The runbook is a criterion, not a hope.

### 8. Devil's Advocate auto-trigger heuristics

Devil's Advocate fires on "suspicious" verify output. The scenarios surfaced a more specific list of suspicion signals:

- Probe output shorter than expected (Scenarios 04, 09).
- Probe runs in 0.00s when a real DB or network call was expected (Scenario 02).
- Mock-only Functional probe (Scenarios 03, 09).
- Coverage delta = 0 on a task that should add behaviour (Scenario 01).
- Bimodal mutation survival - some mutants die instantly, others survive (Scenario 10).
- Test newly passes on bug-fix task (Scenario 04).

Encode as probe-output heuristics the orchestrator runs automatically, not as ad hoc Court judgements.

### 9. Ledger pattern vocabularies (controlled, not free-text)

Every scenario proposed a domain vocabulary for Ledger pattern tags: frontend design pathologies, RLS pathologies, race-condition mechanisms, test-theatre patterns, migration patterns, CWE identifiers, payment-integration patterns. These become `pattern` array values in Ledger entries and index keys.

Design implication: a `cli\vocabularies\` directory with one YAML file per domain. `resetting` skill must pick pattern tags from the vocabulary, not invent free text. Prevents index fragmentation and cross-project false-universality.

### 10. Anvil's honest residue

Every scenario named an irreducible human touchpoint somewhere:

- Aesthetic "premium feel" (Scenario 01).
- Trust topology for rate limiting (Scenario 06).
- Property invariants for arithmetic (Scenario 10).
- Router-v6 nested-route semantics vs mechanical rewrite (Scenario 08).
- Domain expertise on tax edge cases (Scenario 10).
- Stripe sandbox-vs-production parity (Scenario 09).
- Mock-boundary judgment (Scenario 10).

Anvil does not claim to eliminate these. It surfaces them, concentrates them at the contract-confirm and ship touchpoints, and prevents them from hiding in the middle of the loop. The contract-amendment-on-escalation flow is not a failure mode; it is the correct shape for work where the plugin knows it cannot judge.

## What this means for the design

The ten scenarios pressure-tested the design in ten different shapes. The pattern is consistent:

- **The loop structure is correct.** No scenario called for changing the loop shape. The Intake -> Contract -> Plan -> Execute -> Verify -> Judge -> Pass/Reset cycle with a Ledger feedback arrow survived every scenario.
- **The extension surface is correct.** Every proposed refinement adds rows: new probe types, new Invariant types, new Ledger vocabularies, new contract templates. None of them added skills beyond the seven, and none argued for a new primitive beyond the five (except `baseline`, which falls out cleanly).
- **The honest gaps are the same gaps.** Aesthetic judgment, domain expertise, staging-vs-production parity, and irreducibly risky decisions remain human. Anvil does not claim otherwise.

The plugin is ready to be built in the shape described in the main report. The scenarios tell us what to build first, what to defer, and what to leave in the human's hands.
