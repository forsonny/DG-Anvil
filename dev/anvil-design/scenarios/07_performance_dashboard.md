# Scenario 07: Performance - Dashboard Latency Fix

## User Intent

"Our /dashboard page takes 8 seconds to render. Users are complaining. Need P95 latency under 1.5 seconds. Don't know what's slow. No performance budget documented. Don't break anything."

Decoded: (a) make P95 <= 1500ms, (b) discover where time is spent (measurement unknown), (c) preserve correctness. Three sub-goals, not one, and the second is the gate to the first.

## Context

Performance work is the densest concentration of Anvil's most-feared anti-patterns. Row 14 (theatre drift - "gates green, product still broken") sits right on top of it: you can pass unit tests and make the page slower. Row 3 (mock tautology) is easy when benchmarks call a different code path than production. Row 4 (scope creep) explodes because "while I'm here let me also optimize X" is irresistible once a profiler is open. And row 10 (speculative abstraction - caching layers, connection pools, async wrappers) is the default failure mode of performance agents. The load-bearing question is whether Anvil's contract-driven loop can convert "go make it faster" into a measurable, regression-proof, hypothesis-driven workflow.

## The Load-Bearing Question

Performance is measurement-driven or it is cargo cult. The default agent failure is: grep for N+1, add a cache, run one test locally, declare done. Three specific failure shapes Anvil must disarm:

1. **Premature optimization.** Agent optimizes the obvious symbol (the one with `for` in it) instead of the one on the hot path.
2. **Noisy percentiles.** P95 over 10 runs is not P95; it is a sample of the tail. A 1400ms median with a bimodal distribution can show any P95 it wants.
3. **Silent correctness regressions.** Caches go stale. Batched queries reorder. Eager loads drop filters. None of these fail a unit test that does not name them.

## Walk-Through: Anvil Handles This

### 1. Contract

The `contracting` skill cannot accept "make /dashboard fast" as goal text. Four-level verification forces decomposition.

```yaml
---
anvil_contract_version: 1
goal: "Reduce /dashboard P95 latency from 8000ms to <=1500ms under realistic load"
source_intent: "dashboard is slow, need P95 under 1.5s"
ledger_queried: true
ledger_hits:
  - pattern: "cache-stampede"
    lessons: ["2026-01-19-004"]
  - pattern: "n-plus-1-ordering"
    lessons: ["2026-02-27-011"]
  - pattern: "cross-tenant-memoization"
    lessons: ["2025-11-03-002"]
---

## Criteria

- id: C0
  statement: "Baseline captured before any change"
  exists:
    file: "perf\\baseline\\dashboard-2026-04-14.json"
    must_contain_keys: ["p50_ms", "p95_ms", "p99_ms", "sample_size",
                        "load_profile", "git_sha", "hardware_fingerprint",
                        "profiler_flamegraph_path", "top_10_hot_spots"]
  substantive:
    must_implement:
      - "sample_size >= 500"
      - "load_profile matches production traffic shape (concurrency, payload mix)"
      - "profiler is sampling at >=1kHz"
      - "warmup_runs_excluded >= 50"
  wired:
    call_site:
      file: "perf\\run-baseline.sh"
      must_contain_symbol: "POST /dashboard"
  functional:
    probe:
      runner: "bash"
      target: "perf\\assert-baseline-sanity.sh"
      must_pass:
        - "p50 <= p95 <= p99"
        - "coefficient_of_variation < 0.25"
      exit_code: 0

- id: C1
  statement: "P95 latency on /dashboard <= 1500ms under baseline load profile"
  exists:
    file: "perf\\post\\dashboard-<sha>.json"
  substantive:
    must_implement:
      - "same load_profile as C0 baseline"
      - "same hardware_fingerprint class as C0"
      - "sample_size >= 500; warmup_runs_excluded >= 50"
      - "p95_ms derived from raw samples, not server-reported metric"
  wired:
    call_site: {file: "perf\\run-bench.sh", must_contain_symbol: "POST /dashboard"}
  functional:
    probe:
      runner: "bash"
      target: "perf\\assert-target.sh"
      must_pass:
        - "p95_ms <= 1500"
        - "p95_ms <= baseline.p95_ms * 0.20"
        - "runs >= 3 independent invocations all meet target"
      exit_code: 0

- id: C2
  statement: "No correctness regression on /dashboard response payload"
  functional:
    probe:
      runner: "pytest"
      target: "tests\\test_dashboard_contract.py"
      must_pass:
        - "test_payload_schema_unchanged"
        - "test_tenant_isolation_preserved"
        - "test_stale_cache_bounds_respected"
        - "test_ordering_stable_when_sorted"
      exit_code: 0

- id: C3
  statement: "Hypothesis H1 (ranked #1 in baseline top_10_hot_spots) reduced to <= 15% of total"

## Invariants

- no_new_dependencies: true
- cache_ttl_bounded: "all new caches declare max_age_s <= 300 and invalidation_key"
- no_cross_tenant_memoization: "memoize keys must include tenant_id"
- public_api_unchanged: ["/dashboard response schema"]
- regression_budget:
    endpoints_outside_dashboard: "P95 must not increase by >5% on any measured endpoint"

## Counter-examples (from Ledger)

- "2026-01-19-004": "Added Redis cache without bounded TTL; serves stale data indefinitely after write-failure."
- "2026-02-27-011": "N+1 fix reordered query; downstream consumer relied on implicit order."
- "2025-11-03-002": "Memoized tenant-specific query with user_id key alone; cross-tenant read leaked."
```

What this contract enforces that a prose spec cannot:

- **C0 is mandatory and dependency-blocks C1.** No baseline = no post-measurement to compare against. The plan DAG cannot place optimization tasks before C0 is green.
- **Substantive clauses are about measurement hygiene, not prose.** `sample_size >= 500`, `warmup excluded`, `derived from raw samples`. These are what kill noisy-percentile self-deception.
- **C1 demands three independent runs** - one-off wins do not close the criterion.
- **C2 is first-class.** Correctness is not a side check; it is a separate criterion with its own Functional probe.
- **Invariants encode the regression budget.** Making /dashboard fast by making /reports slow is not a pass.

### 2. Plan (DAG)

```yaml
tasks:
  - id: T1   cites: [C0]             kind: measure-baseline
  - id: T2   cites: [C0.substantive] kind: rank-hotspots       depends_on: [T1]
  - id: T3   cites: [C3]             kind: hypothesize         depends_on: [T2]
  - id: T4   cites: [C3, C2]         kind: fix-hypothesis      loop_cap: 2  depends_on: [T3]
  - id: T5   cites: [C1, C2]         kind: re-measure          depends_on: [T4]
  - id: T6   cites: [C1]             kind: cross-endpoint-regression-check depends_on: [T5]
```

Each hypothesis-fix-measure sequence is its own sub-loop inside T4/T5. If T5 fails C1, the lesson is written, the plan re-queues T3 with the injected lesson, and the next hypothesis in rank order is attempted. The agent cannot jump from T1 to T4; the DAG forbids it.

### 3. Execute and Verify

Four verification levels map directly onto the performance workflow:

- **Exists.** The baseline JSON file is present with all required keys. The flamegraph artefact is at the named path. The benchmark script is a file.
- **Substantive.** The baseline JSON deserializes and satisfies the hygiene clauses: sample size, warmup exclusion, coefficient of variation under 0.25, P50 <= P95 <= P99 (sanity), load profile matches production shape.
- **Wired.** The benchmark script actually hits POST /dashboard with the claimed payload. The fix touches the symbol named in the top_10_hot_spots JSON. If the hot spot was a template render and the fix is in the DB layer, Wired fails - the fix is on an unmeasured path.
- **Functional.** The post-change benchmark shows P95 <= 1500ms across three independent runs, and all correctness tests pass (C2), and the regression-budget invariant holds across sibling endpoints.

Devil's Advocate fires when Verify returns Medium confidence: output shorter than expected, coefficient-of-variation jumped between runs, only 100 samples instead of 500, warmup not clearly excluded. Its single question is "find the reason this measurement is wrong."

### 4. Judge

The Court receives contract + diff + verify output. No rationale, no plan.

**Pass 1 - spec compliance.** For C1: does the JSON output (cited by line) show P95 <= 1500ms across three runs? For C2: does the pytest output (cited by string) show all four correctness tests green? For C3: does the hypothesis-specific criterion show the targeted hot spot reduced to the claimed share?

**Pass 2 - would I merge this.** The question every performance reviewer should ask but rarely does: **did the optimizer fix the easy thing or the biggest thing?** The Court compares the top_10_hot_spots from T2 against the file paths in the diff. If hot_spot_rank_1 was `template_render.py` and the diff touches only `db\query.py`, Pass 2 flags `suspicious` - even if Pass 1 is green. Local-minimum detection is structural.

Pass 2 also checks: are new caches bounded? Are memoization keys tenant-scoped? Is the diff contained to files the hypothesis names? Was any change made "while we're here" that does not trace to a contract line? Drive-by optimizations fail on scope.

### 5. Ledger Interaction

At contract-author time, query returns three relevant hits - cache stampede under invalidation, N+1 ordering, cross-tenant memoization. Each is injected as a Counter-example and (crucially) converted into a Substantive `must_not` clause or an Invariant. The lesson does not remind; it constrains the next contract.

If T5 fails C1 on the first hypothesis, the `resetting` skill writes a new lesson: the `contract_gap` is in C3's specificity - "hypothesis did not require that measured contribution exceed 30% of total before attempting fix" - and the remediation patch adds exactly that clause. The next hypothesis starts with tighter framing.

## A Realistic Failure and Reset

First loop: T1 measures baseline, top hot spot looks like a `SELECT` over user_activity with no join predicate. T3 produces hypothesis H1 = "N+1 in activity fetch." T4 rewrites to a batched query. T5 runs the benchmark.

P95 is now 6800ms. C1 fails.

The `resetting` skill is forbidden from blaming the implementer. It asks: what did the contract fail to say? The diagnostic: the N+1 was real but contributed only 900ms. The dominant 5000ms was template rendering (rank 2 in top_10_hot_spots); rank 1 was rendering cost mislabeled as "query" because the profiler sampled the DB-adjacent frame. Lesson written: "profiler flamegraph must distinguish self-time from cumulative-time; top_10_hot_spots must sort on self-time with cumulative-time as secondary".

The contract is patched (Substantive clause on C0). T1 re-runs under the tightened clause. The new baseline puts template rendering at rank 1 at 5100ms self-time. T3 proposes H2 = template compilation caching with bounded TTL. T4 implements with a TTL and cache key including locale and theme. T5 shows P95 = 1380ms across three runs. C2 tests green, including the cache-staleness test. Court Pass 1 green. Court Pass 2: diff is confined to the template subsystem; cache has a `max_age_s=120` and invalidation hook; memoization keys include tenant_id. Merge.

The whole-branch Court catches one more thing: the N+1 fix from the abandoned first attempt was reverted, but a helper function it introduced was left behind as an orphan. Escalation. Human decides: remove the orphan. PR opens with a clean diff.

## Critical Issues Surfaced by Deep Discovery

1. **CI hardware is not production hardware.** Benchmarks in a CI runner with 2 vCPU and shared disk will lie. The `hardware_fingerprint` field in C0 is necessary but not sufficient; Anvil needs a `hardware_class` invariant that rejects benchmarks run outside an approved class.
2. **P95 needs a confidence interval.** 500 samples gives a P95 with a non-trivial confidence band. The current contract asserts a point value; it should assert "P95 upper 95% CI <= 1500ms."
3. **Load profile drift is invisible.** Production traffic shape changes week to week. A baseline captured today against a different traffic mix than tomorrow's benchmark is not comparable. The contract needs a traffic-profile hash.
4. **Warmup semantics are language-specific.** JIT (JVM, V8) vs non-JIT (CPython) vs cold-start systems need different warmup. Substantive clauses assume one convention.
5. **Correctness tests are not complete.** Cache staleness, ordering, tenant isolation are named; race conditions, retry semantics, error-path latency are not. The Ledger needs entries for these.
6. **Third-run flakiness.** Three runs all meeting target is fragile. On noisy hardware this can fail legitimately. Needs a percentile-of-runs criterion (e.g., 4 of 5).
7. **Regression budget is coarse.** "5% on any endpoint" is arbitrary; different endpoints have different tolerance.
8. **Profiler overhead distorts measurement.** Running the profiler and running the benchmark in the same execution are incompatible. Need two phases.
9. **Hot-spot mislabeling.** Self-time vs cumulative-time confusion is exactly the failure that happened above. Should be a first-class Ledger pattern with a forcing Substantive clause.
10. **Court cannot see the Ledger.** The Court cannot check "did the fix avoid known-stale patterns?" because it does not have access. The contract must compile those into explicit Substantive clauses; if the compilation fails, the Court has no hook.

## Strengths Confirmed

1. **Baseline as a contract criterion** prevents "we added caching, it's faster now, probably."
2. **Wired verification** catches fixes to unmeasured code paths - the single biggest performance theatre failure.
3. **C2 as a separate criterion** prevents correctness regressions from being treated as acceptable collateral.
4. **Three independent runs** breaks single-point self-deception.
5. **Invariants for cache bounds and tenant keys** encode the most common post-fix bugs structurally.
6. **Whole-branch Court** caught the orphan helper that per-task Court missed.
7. **Ledger counter-examples as Substantive must_not clauses** move "we learned this once" into "the next contract enforces this."
8. **Devil's Advocate on short or noisy output** catches measurement anemia.
9. **DAG dependency forces measure-before-change.** Agents cannot jump to optimization.
10. **Reset forbidden without a lesson** prevents silent retry until something sticks.

## Design Refinements Proposed

1. **Mandatory baseline-capture phase** (C0-class criterion) is not currently in the generic contract schema. Add it as a contract sub-schema for `kind: performance`. The `contracting` skill should refuse to save a performance contract without a C0 criterion.
2. **Regression-budget invariant** as a first-class invariant kind. Current Invariants section is a free list; performance needs a typed `regression_budget:` block with per-endpoint tolerances.
3. **Ledger pattern tags for performance vocabulary.** New controlled vocabulary: `self-time-vs-cumulative`, `warmup-skew`, `jit-warmup`, `cache-stampede`, `cache-ttl-unbounded`, `cross-tenant-memoization`, `n-plus-1-ordering`, `hardware-class-mismatch`, `load-profile-drift`, `cv-over-threshold`.
4. **Confidence-interval operator in contract grammar.** Allow `p95_ms_upper_ci_95: <=1500` alongside `p95_ms: <=1500`.
5. **Two-phase benchmark invariant.** Profiling phase and measurement phase must be separate executions with distinct artefacts.
6. **Traffic-profile hash** as a required key in baseline and post-fix JSON. If hashes differ, Wired fails even if files exist and sample sizes match.
7. **Judge Pass 2 extension for performance** - a parameterized check list that compares hot_spot_rank_1 against diff file paths.

## Bottom Line

Anvil's contract-first, DAG-enforced, adversarial-review loop maps almost directly onto performance work. The four verification levels already catch the three biggest failure shapes: Wired kills fixes to unmeasured paths, Substantive kills noisy-percentile self-deception when the schema is right, Functional via C2 kills correctness regressions. The big design gap is that Anvil today has no performance sub-schema; the contract schema is general-purpose. That is survivable - the scenario above produces a usable contract in the current schema - but the Ledger will write shapeless lesson patterns and the Court has no parameterized Pass 2 checklist. Fix that gap (performance sub-schema, regression-budget invariant type, controlled performance vocabulary, confidence-interval operator, two-phase benchmark invariant) and Anvil handles this scenario better than any measure-then-guess-then-retry workflow the predecessor class offers. It will not make benchmark noise go away - nothing can - but it will refuse to declare victory on a sample of three, and it will not let an optimizer fix the easy thing and call it the biggest.
