# Scenario 10: Test Backfill - Billing Module

## User Intent

"Our billing/ module has 0% test coverage. Two years stable in production. We are terrified to touch it. Write meaningful tests - not coverage theater. Tests that would catch a real regression if we refactored." The user has explicitly named the failure mode (theatre) and demanded its opposite.

## Context

Target: `billing\` handling invoice generation, proration, refunds, tax calculation. Decimal arithmetic, legal obligations, multi-tenant, likely datetime-sensitive. Zero existing tests means zero existing fixtures, no known-good oracle, and no CI enforcement to refactor against. The user's real goal is not coverage-percentage - it is refactor-confidence.

## The Load-Bearing Question

Anvil's Substantive verification must apply to *tests themselves*. Tests are code that asserts on code. Normally Substantive asks "does this function do observable work?" Here it must ask "does this test detect observable *breakage*?" A test that calls `generate_invoice()` and asserts `result is not None` is Exists-green, Wired-green, Functional-green (pytest exit 0), and Substantive-dead. The Court must catch this without running the production code.

The self-referential trap: if Anvil's own test-quality checks are themselves tests, they need tests. The way out is that Anvil does not verify test quality by asserting it - it *mutates* the code under test and watches which tests notice. Mutation survival is the observable side-effect that satisfies Substantive for the meta-level.

## Walk-Through: Anvil Handles This

### 1. Contract

```yaml
---
anvil_contract_version: 1
goal: "Add meaningful tests to billing\\ sufficient for refactor-safety"
ledger_queried: true
ledger_hits:
  - pattern: ["test-theatre", "mutation-survival", "decimal-arithmetic"]
    lessons: ["2025-11-04-002", "2026-01-18-009"]
---

## Criteria

- id: C1
  statement: "billing\\proration.py has tests covering all arithmetic branches"
  exists:
    file: "tests\\billing\\test_proration.py"
    symbols: ["test_*"]
  substantive:
    must_implement:
      - "each test asserts on the return value, not on 'is not None' alone"
      - "each arithmetic test uses known-input-expected-output Decimal pairs"
      - "boundary cases covered: zero-day period, full-period, partial with leap day"
    must_not:
      - "assertions of form 'assert result is not None'"
      - "assertions of form 'assert isinstance(result, Decimal)' without value check"
      - "Mock(return_value=<computed>) where computed equals the SUT's return"
      - "test body contains only the call (no assert)"
  wired:
    imports_real_sut:
      file: "tests\\billing\\test_proration.py"
      must_import: "billing.proration"
      must_not_import: ["unittest.mock.patch" with target="billing.proration.*"]
  functional:
    probe:
      runner: "pytest"
      target: "tests\\billing\\"
      exit_code: 0
    coverage:
      tool: "coverage.py"
      file: "billing\\proration.py"
      line_floor: 95
      branch_floor: 90
    mutation:
      tool: "mutmut"
      target: "billing\\proration.py"
      survival_ceiling: 0.15
      timeout_per_mutant_s: 30

## Invariants

- no_trivial_assertions: true
- no_mocking_sut: true
- no_skip_without_documented_reason: true
- property_based_coverage_on_arithmetic: true
- realistic_fixtures: true
```

The Invariants are the anti-theatre ruleset. `no_mocking_sut` means the test file may not patch symbols inside `billing.proration` - you can mock the database, not the arithmetic. `realistic_fixtures` forbids `Mock(spec=Invoice, total=Decimal("42.00"))` in place of a constructed Invoice.

### 2. Plan (DAG)

```yaml
waves:
  - wave: 1
    tasks:
      - T1: map billing\ - symbols, branches, external deps, datetime usage
      - T2: build fixture library - Customer, Plan, Subscription, Invoice factories
  - wave: 2
    tasks:
      - T3: proration tests (cites C1)
      - T4: tax calculation tests (cites C2)
      - T5: refund tests (cites C3)
      - T6: invoice generation tests (cites C4)
  - wave: 3
    tasks:
      - T7: integration tests - full billing cycle end-to-end
      - T8: mutation-test run across whole module
      - T9: coverage gap triage
      - T10: property-based tests for arithmetic invariants
```

Each unit-test task cites a contract criterion id. T2 must complete before T3-T6 because fixtures are a shared dep. T8 runs after all unit waves to avoid mutation-testing partial suites.

### 3. Execute and Verify

Executing subagent for T3 writes `tests\billing\test_proration.py`. Verify runs four probes:

**Exists:** File present, contains `def test_*` functions. Pass.

**Substantive:** The hard one. Anvil runs three greps and one AST pass:
- Regex scan: `assert .+ is not None$`, `assert isinstance\(.+\)$` (no trailing value check), `assert .+\n$` (no assert at all in body). Any hit = fail.
- AST pass: for each `test_*`, walk the body; confirm at least one `Assert` node whose `test` attribute references the SUT's return value via comparison (`==`, `<`, `<=`) or set/list/dict membership against a literal. Identity checks (`is not None`) do not count.
- Mock-target scan: if `unittest.mock.patch` or `@patch` decorates a target inside `billing.proration`, fail (`no_mocking_sut` invariant).
- Fixture realism scan: Mock() instances passed as arguments where the SUT signature expects a domain type. Flag for Court if present.

**Wired:** `import billing.proration` must appear; no sys.modules stub. Pass.

**Functional:** pytest exit 0, coverage >= floors, mutation survival <= ceiling. The mutation run is the teeth: mutmut swaps `+` for `-`, `<` for `<=`, literal constants, boolean operators - and re-runs the suite per mutant. If 40% of mutants survive, the tests are not seeing the code. Fail.

### 4. Judge

**Pass 1 - spec:** The Court reads the diff and the captured verify output. For each test, it cites the assertion line and the mutation-run output. It asks: "does this test's assertion rule out a plausibly-broken implementation of the SUT?" A test asserting `result == Decimal("15.00")` on a 15-day proration of a $30 monthly plan passes this question. A test asserting `result > 0` does not - a broken prorater returning `Decimal("0.01")` would pass it.

**Pass 2 - quality:** "Would I merge this suite for a module I am afraid to touch?" The Court inspects for:
- Tests that parametrize over inputs but assert the same property each time (coverage breadth without assertion diversity - often a theatre-pattern).
- Tests whose names describe intent but whose bodies do not match the name.
- Tests skipped with `@pytest.mark.skip` without a cited reason.
- Fixtures that are themselves partially mocked (mocking the thing you are testing's dependency in a way that echoes the SUT's computation back).

**Devil's Advocate** is dispatched when mutation survival is suspiciously bimodal (some mutants die instantly, others survive - may indicate tests cluster on one branch). Its prompt: "Find the test that would still pass if `billing\proration.py::compute_proration` were replaced with `def compute_proration(*a, **kw): return Decimal('0')`. Cite it by line." If it finds one, that test is dead-weight and the task is reset with a note.

### 5. Ledger Interaction

Prior lessons injected at contract time:

- **2025-11-04-002** `test-theatre/assert-not-none`: "Test passed because assertion was existential not equational. Remediation: Substantive must_not includes `assert .+ is not None` as a standalone predicate."
- **2026-01-18-009** `mock-echo/return-value-tautology`: "Test mocked the function under test to return the value the test asserted. Remediation: no_mocking_sut invariant."
- **2025-08-22-003** `parametrize-without-diversity`: "Tests added coverage lines but every case asserted the same property. Mutation survival was 62%. Remediation: Court Pass 2 checks assertion-value diversity per parametrized test group."

These shape C1's `must_not` and the Invariants. The Ledger does not remind the agent - it hardens the schema.

## A Realistic Failure and Reset

First execution of T3, the subagent produces:

```python
def test_proration_partial_period(invoice_factory):
    inv = invoice_factory(days_used=15, period_days=30, amount=Decimal("30.00"))
    result = compute_proration(inv)
    assert isinstance(result, Decimal)
    assert result is not None
```

**Verify Substantive:** AST pass detects only identity/type assertions, no value comparison. Fail.

Devil's Advocate is not needed here - the regex scan catches it. Resetting skill diagnoses: contract had `must_not` clauses for these patterns but the execute skill's prompt did not foreground them. Ledger lesson appended:

```json
{
  "id": "2026-04-14-031",
  "pattern": ["test-theatre", "isinstance-assert", "billing"],
  "contract_gap": {
    "level": "substantive",
    "criterion": "C1",
    "was": "each test asserts on the return value",
    "should_have_been": "each arithmetic test asserts equality against a precomputed Decimal literal derived from a hand-calculated oracle in the test docstring"
  },
  "remediation": {
    "contract_patch": "C1.substantive.must_implement[].3 = 'test body contains assert result == Decimal(<literal>) where literal is documented in the test docstring as the hand-computed oracle'",
    "counter_example_text": "Tests asserted isinstance/not-None; would have passed if compute_proration returned Decimal(0)."
  }
}
```

Contract is patched live. Task re-queued. New execution produces:

```python
def test_proration_half_month():
    """30 USD monthly, 15 of 30 days consumed -> 15.00 USD proration."""
    result = compute_proration(amount=Decimal("30.00"), days_used=15, period_days=30)
    assert result == Decimal("15.00")
```

Verify passes. Mutation run: swap `*` for `/` in proration body - test fails (good). Swap `days_used` for `period_days` - test fails (good). Change rounding from `ROUND_HALF_EVEN` to `ROUND_HALF_UP` - test survives, because 15/30 of 30 has no fractional cent. Reset again: add `test_proration_third_month` with $30 over 10/30 days = Decimal("10.00") - still no rounding. Devil's Advocate flags: the suite has no test that exercises rounding mode. Reset: add a case with Decimal("29.99") over 7/31 days, hand-computed oracle, assert to quarter-cent precision. Mutation survival drops below ceiling. Pass.

## Critical Issues Surfaced by Deep Discovery

1. **Mutation testing is slow.** mutmut on a 2000-line billing module can take hours. The contract's `timeout_per_mutant_s: 30` may be optimistic. Fix: sample 20% of mutants in-loop, full run only at `/ship`.
2. **Equivalent mutants.** Not every surviving mutant is a test gap - some mutants produce semantically identical code. Anvil cannot distinguish. Must be flagged for human review, not auto-reset.
3. **Oracle problem.** For a 2-year-stable module with no spec, the current implementation *is* the oracle. Tests written against current behavior lock in current bugs. The Contract must name this: "tests encode current behavior; refactor-safety is the goal, not correctness."
4. **Mock-boundary judgment.** `no_mocking_sut` is sharp but where is the SUT boundary? If `compute_proration` calls `fetch_tax_rate`, is mocking `fetch_tax_rate` legitimate isolation or SUT-mocking? The Contract needs an explicit allow-list of mockable boundaries.
5. **Property-based tests need domain expertise.** Hypothesis strategies for money arithmetic (non-negative, finite precision, currency-closed) cannot be auto-generated. The contracting skill must prompt the human for invariants.
6. **Flaky tests masquerade as theatre.** A datetime-sensitive test that fails at midnight passes mutation testing but fails CI intermittently. Anvil's mutation ceiling does not catch flakiness. Add `pytest --count=10` run as a separate Functional probe.
7. **Coverage tools lie about branch coverage.** Python's coverage.py misses some short-circuit branches. The branch_floor alone is insufficient; mutation is the real backstop.
8. **Fixture factories themselves can be theatrical.** A factory that always returns the same Invoice defeats parametrization. Court Pass 2 must sample factory output across tests.
9. **Tests against refunds may require non-deterministic real dependencies** (payment gateway). Anvil cannot test the integration without a sandbox API; the contract must scope this explicitly.
10. **Two years of stability means silent bugs exist.** Writing tests against current output may encode a regression that was never a regression because no one noticed. Honest contract language required.

## Strengths Confirmed

1. **Substantive maps cleanly to mutation testing.** "Does the test notice breakage?" is exactly what mutation survival measures. Anvil's four-level grammar absorbs this without new primitives.
2. **Ledger compounds on anti-patterns.** Each reset adds a `must_not` clause. After five projects, the theatre-test vocabulary is rich enough to reject most bad patterns at Substantive time, before the Court runs.
3. **Devil's Advocate has the right shape.** The prompt "find the test that passes if the function is gutted" is the minimal adversarial stance for test-quality review.
4. **Spec-first Court ordering matters here.** If quality ran first, the Court would praise well-named tests that assert nothing.
5. **Per-task fresh subagents** prevent the drift where one test's pattern contaminates the next.
6. **Invariants as a separate slot** is where the anti-theatre rules live, distinct from per-criterion `must_not`.
7. **Whole-branch Court catches suite-level patterns** - e.g. all tests asserting `isinstance` across files would be invisible per-task, visible at ship.

## Design Refinements Proposed

1. **Elevate mutation-survival to a first-class Substantive probe type** in `contract-schema.json`, not buried in `functional.mutation`. Its semantic is Substantive (observable behavior), not Functional (passes the probe).
2. **Ship a test-anti-pattern scanner rule set** in `cli\probes\test-theatre.yml`, versioned and Ledger-queryable. Patterns: `trivial-assertion`, `mock-echo`, `parametrize-without-diversity`, `skip-without-reason`, `fixture-with-mock-sut`.
3. **Known-input-expected-output requirement for arithmetic domains.** When the contract's `goal` names "arithmetic", "tax", "proration", "currency", or "financial", auto-add Invariant: every test must contain at least one `assert x == <literal>` where `<literal>` is a numeric constant documented in the test's docstring.
4. **Ledger test-quality vocabulary**: add pattern tags `test-theatre`, `mock-echo`, `oracle-missing`, `mutation-gap`, `equivalent-mutant-triage`, `flake-vs-theatre`. This gives `resetting` a controlled vocabulary for test-specific failures.
5. **Explicit mock-boundary allow-list** in the Contract. New field `mock_allowed_at: [list of module paths]`; anything not in the list triggers `no_mocking_sut`.
6. **"Oracle-source" field per criterion** - one of `specification`, `current-behavior`, `hand-computed`, `external-authority`. Forces honesty about what the tests encode.

## Bottom Line

Anvil solves the self-referential verification problem by refusing to verify test quality with more tests. Substantive for test code means mutation survival - an observable side effect on code that is not the test. The Contract's Invariants plus a test-anti-pattern scanner ruleset catch the syntactic theatre patterns (isinstance, not-None, SUT-mocking) at verify time. Devil's Advocate catches the semantic theatre (tests that survive gutting the SUT) at judge time. The Ledger compounds anti-patterns across projects so the ruleset gets stricter. What Anvil cannot do is supply domain expertise: the oracle problem, equivalent-mutant triage, and mock-boundary judgment still require a human in the loop. Anvil makes that human intervention rare, cheap, and surfaced with evidence - not eliminated. The user's terror is justified and remains justified after Anvil ships; the difference is that the refactor can now proceed, because a 15% mutation-survival ceiling on a suite the Court has certified is genuinely more than coverage theater.
