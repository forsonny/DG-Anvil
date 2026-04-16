# 05 - The Contract

The Contract is the single authoritative answer to the question "what does success look like, machine-readably?"

## What a Contract is

A YAML-plus-Markdown file committed under `anvil/contract.yml` in the target repo. Every criterion is a record with four mandatory slots that correspond one-to-one with the Verify levels. A contract that does not parse into all four levels is rejected at save time; the plugin cannot proceed without a well-formed contract.

## Format

```yaml
---
anvil_contract_version: 1
goal: "Add token-bucket rate limiting to POST /login with 5 req / 30s per IP"
created: 2026-04-14
source_intent: "add rate limiting to login"
ledger_queried: true
ledger_hits:
  - pattern: "rate-limit"
    lessons: ["2026-03-11-001", "2026-02-02-014"]
---

## Criteria

- id: C1
  statement: "Token-bucket middleware exists and is invoked for POST /login"
  exists:
    file: "src/middleware/rate_limit.py"
    symbol: "TokenBucketLimiter"
    signature: "(window_s: int, max_req: int) -> Callable"
  substantive:
    must_implement:
      - "decrements bucket per request"
      - "refills bucket at window / max_req intervals"
      - "returns 429 when bucket empty"
    must_not:
      - "body raises NotImplementedError"
      - "body returns None unconditionally"
  wired:
    call_site:
      file: "src/routes/auth.py"
      line_range: [40, 60]
      must_contain_symbol: "TokenBucketLimiter"
  functional:
    probe:
      runner: "pytest"
      target: "tests/test_rate_limit.py"
      must_pass:
        - "test_first_5_requests_allowed"
        - "test_6th_request_returns_429"
        - "test_refills_after_window"
      exit_code: 0

- id: C2
  statement: "Existing auth tests continue to pass"
  exists: {test_suite: "tests/test_auth.py"}
  substantive: {unchanged: true}
  wired: {no_new_imports_in: "src/routes/auth.py without appearing in contract"}
  functional:
    probe: {runner: "pytest", target: "tests/test_auth.py", exit_code: 0}

## Invariants

- no_new_dependencies: true
- public_api_unchanged: ["src/routes/auth.py::login_handler signature"]
- coverage:
    new_code_minimum: 90

## Counter-examples (injected from Ledger)

- "2026-03-11-001": "Rate-limit middleware without explicit window/threshold; implementer chose defaults that drifted from product intent."
- "2026-02-02-014": "Bucket state stored in process memory; multi-worker setup silently shared no state."
```

## Why four verification levels

The four levels are not a convenience; they are the full decomposition of "done":

| Level | Question | Failure mode it catches |
|---|---|---|
| **Exists** | Is the named file, symbol, or test present? | Phantom implementation, renamed-off, missing artefact |
| **Substantive** | Is the body non-empty and behaviourally meaningful? | Stub bodies, `return None`, commented-out implementation, single-line pass-through |
| **Wired** | Is it called from the path the contract names? | Orphaned implementation, implemented-but-unreferenced, wrong call site |
| **Functional** | Does it behave correctly under the probe? | Wrong logic, wrong threshold, off-by-one |

All four must be green. Partial credit is a fail. The levels were chosen because each corresponds to a verifiable artefact that a separate process can produce without running the agent.

## Substantive verification - the hard one

"Substantive" is the level most predecessor plugins get wrong. String-matching for `return None`, `TODO`, `NotImplementedError` misses semantic emptiness - a function that runs but does nothing useful.

Anvil's Substantive probe runs the target symbol under a contract-provided input set and captures:

- Whether the symbol was called.
- Whether control flow took the expected branches (via coverage delta).
- Whether any side effect in `must_implement` is observable (mutation of state, network call, log emission, metric increment).

If the contract cannot provide a Substantive probe for a criterion, the criterion cannot be saved. This forces contract authors (the `contracting` skill, typically) to think in observables, not in prose.

## Wired verification - the silent orphan fix

"Wired" is where half the predecessor plugins leak. A correct-but-unreferenced implementation passes Exists, Substantive, and even Functional (if tests are unit-scoped), but is never called in the real code path. Anvil's Wired probe:

- Does a call-graph walk from the contract's named entry point.
- Confirms the target symbol is reachable with concrete arguments matching the contract signature.
- Records the call site's file + line range.

If the contract names a call-site file + line range and the symbol is not found there, Wired fails regardless of test output.

## Invariants

Invariants are cross-cutting rules that any task could violate. Expressed as a short list of boolean predicates. Evaluated on every Verify pass, not only the last. Examples:

- `no_new_dependencies`: true
- `public_api_unchanged`: a list of symbols that must not change signature
- `coverage.new_code_minimum`: floor
- `no_secret_patterns`: regex list that must not appear in the diff

Invariants exist because they are cheap to express and expensive to catch later.

## Counter-examples from the Ledger

At contract-authoring time, the `contracting` skill queries the Ledger for patterns matching the intent. Matching lessons are injected as a **Counter-examples** section. They become part of the contract document the agent reads on every execution of every task.

The point is not that the model will remember them - it is that the Verify and Judge steps will check the diff against the specific pathologies named in the counter-examples. A counter-example that reads "middleware without explicit window/threshold" becomes a Substantive `must_implement` clause "decrements bucket per request at an explicit threshold provided to the constructor" on the next contract. The Ledger does not just remind; it **shapes** the next contract.

## Who authors the contract

The `contracting` skill does. It is the first skill invoked by `/start`. Its process:

1. Parse user intent.
2. Query Ledger for related patterns.
3. Produce a draft contract populating all four verification levels for every criterion.
4. Present draft to user with a one-shot confirmation: accept, edit, or reject.
5. On accept: save, lock, proceed.
6. On reject: no ambiguous half-state. The intent is discarded; the user re-enters with a clearer prompt.

The one-shot confirm is the first and least-negotiable human touchpoint. It exists because every downstream gate depends on the contract being correct; there is no cheap way to catch a bad contract after planning.

## Versioning

`anvil_contract_version: 1` in the frontmatter. Migrations are data-driven: a `contract-migrate` CLI subcommand reads old contracts and emits new ones, never silently rewriting. The schema file (`cli/contract-schema.json`) is the canonical source.
