# Scenario 04: Bug Fix - Flaky Race Condition

## User Intent

"Our login endpoint intermittently returns 500 under load. Happens roughly 1 in 200 requests at peak. Sentry shows `IntegrityError: duplicate key value violates unique constraint user_sessions_session_id_key`. No local reproduction. Fix it."

Translated: the user wants the error to stop appearing in Sentry. They did not say "explain the concurrency model" or "prove the fix." The drift risk is they will accept any change that makes Sentry quiet for 48 hours.

## Context

Intermittent 500s at 0.5% rate under peak load. `user_sessions.session_id` has a UNIQUE constraint. The error name implies two concurrent transactions produced identical session_id values and both reached INSERT. Plausible root causes: (a) session_id generator has insufficient entropy, (b) the login handler does `SELECT WHERE session_id = x; if none: INSERT` in a non-serializable isolation level (check-then-insert race), (c) token reuse after logout with id collision on replay, (d) a retry layer retries an INSERT whose original commit actually succeeded, (e) two web workers caching a session object keyed by user id and racing the upsert. Each has a different fix. All are theatre-compatible.

## The Load-Bearing Question

Bug fixes are where agents patch symptoms, satisfy a regression test, declare victory while the root cause lurks. Anvil's master rule says "never fix bad output; diagnose the input." For bugs, the input is the broken code plus the observed failure. How does Anvil's Contract / Verify / Court structure force root-cause diagnosis instead of patch-and-pray? How does it prevent "the test passes, ship it" when the test merely masks the race?

## Walk-Through: Anvil Handles This

### 1. Contract

`/start "fix intermittent 500 with IntegrityError on user_sessions.session_id under load"` invokes `contracting`. The skill queries the Ledger for patterns `race-condition`, `integrity-error`, `unique-constraint`, `login`, `session`. Hits likely include lessons from prior projects: "retry-loop masks race without fixing it," "try/except IntegrityError swallows the symptom," "UUIDv4 collision claim is almost never the true cause." These are injected as Counter-examples.

The draft contract has four criteria, each with Exists / Substantive / Wired / Functional slots:

- **C1 (reproducer)**: `tests\test_login_race.py` exists with a test that fires N concurrent login requests for the same user against a test database and asserts that zero requests return 500. Functional probe: the test MUST fail deterministically against current HEAD (reproducer-determinism check); if it does not fail 100 out of 100 runs before any fix is applied, the contract is invalid.
- **C2 (root-cause document)**: `anvil\root-cause.md` names the mechanism: specific file and line of the check-then-insert, the SQL isolation level, the precise interleaving that produces duplicate INSERT. "Race condition" alone is not acceptable; the named mechanism must be one of a finite set (check-then-insert-at-read-committed, insufficient-entropy, at-least-once-retry, cache-stale-upsert).
- **C3 (fix)**: diff touches the file named in C2 at the line range named in C2. Substantive `must_implement` derived from the root cause: if C2 names "check-then-insert," the fix must use `INSERT ... ON CONFLICT` or SERIALIZABLE. `must_not` includes "bare try/except IntegrityError" and "retry-on-IntegrityError loop."
- **C4 (regression)**: all existing auth tests pass; `public_api_unchanged` on the login handler signature; no new dependencies.

Invariants pin the shape of a legitimate fix: `no_new_retry_loops_wrapping_insert: true`, `no_bare_except_IntegrityError: true`. The contract confirm is the first and only pre-execution human touchpoint. A user who hits accept has ratified the requirement that a reproducer fail deterministically first.

### 2. Plan

The `planning` skill emits a DAG with four waves:

- Wave 1, task T1: construct the reproducer. Cites C1. No other task is allowed to start.
- Wave 2, task T2: identify the root cause. Cites C2. Depends on T1 (the reproducer gives us something to trace).
- Wave 3, task T3: implement the fix. Cites C3. Depends on T2.
- Wave 4, task T4: regression check. Cites C4. Depends on T3.

This ordering is forced by the DAG citation rule: every task cites contract criteria, and criteria are chained through "depends-on-evidence" in the contract body. The reproducer must exist and fail before any change is permitted to source code. This single structural constraint is what disarms patch-and-pray. An agent cannot write the fix before there is a failing test, because T3 cannot be dispatched until T1 and T2 are marked done, and T1's Functional criterion is "the new test fails deterministically against current HEAD."

### 3. Execute and Verify

**T1 (reproducer).** Fresh subagent in a worktree. Exists: `tests\test_login_race.py` created with content that uses an async pool or threaded executor to fire 200 concurrent login requests at the same user. Substantive: the test body calls the real login route under the real DB with real UNIQUE constraint, not mocks. Wired: the test is collected by pytest's default discovery and is not marked skip. Functional: a dedicated Verify probe runs the test 100 times on HEAD (pre-fix code) and asserts `integrity_error_count >= 95` across runs. This is the reproducer-determinism check. A probabilistic reproducer that fails only sometimes is rejected here, not accepted with a shrug. If the subagent produces a flaky reproducer (1 in 200, like the original Sentry signal), Verify fails, the task resets, and the lesson is written: "reproducer must be load-amplified until determinism is reached; 200 concurrent same-user logins is the floor, not 10."

**T2 (root cause).** Fresh subagent. Exists: `anvil\root-cause.md`. Substantive: the document must contain specific file path and line numbers from the source tree; must name one mechanism from the controlled vocabulary; must include the exact interleaving in a time-ordered pseudo-trace (T0: req A SELECT, T1: req B SELECT, T2: both see empty, T3: both INSERT, T4: one fails). Wired: every line and file cited must actually exist in the codebase (validated by path check). Functional: a probe re-runs the reproducer with instrumentation (SQL log capture, isolation-level query) and the observed trace must match the one claimed in the document. A root cause that cannot be corroborated by captured tool output fails Functional.

**T3 (fix).** Fresh subagent. Exists: diff modifies the file and line range named in T2's document. Substantive: the diff contains one of the acceptable remediations matched to the named mechanism: `INSERT ... ON CONFLICT (session_id) DO NOTHING RETURNING id` plus retry with a new id on zero-row return; or raising the isolation level to SERIALIZABLE on the transaction that creates the session; or fixing the id generator if T2 named insufficient entropy (which would be a schema/library change). Must_not: no bare `try/except IntegrityError: pass`, no retry-on-IntegrityError wrapper that swallows the race without fixing the ordering. Wired: the modified call site is reachable from the login route. Functional: the reproducer that deterministically failed in T1 now passes 100/100 runs, AND a stress probe runs 10,000 concurrent logins across varied user ids with zero 500s and zero duplicate session_ids in the resulting table.

**T4 (regression).** Existing auth test suite green, contract invariants hold.

### 4. Judge

Pass 1 (spec): the Court reads contract, diff, verify output. For C1 through C4 it cites the exact reproducer file lines, the exact root-cause document sentences, the exact diff lines, and the exact stress-probe output strings. A suspicious verdict fires if the fix is substantively smaller than expected (one-line change to wrap in try/except), or if the stress probe's run count is below the contract floor. Any criterion failing Pass 1 resets the task.

Pass 2 (quality): would I merge this? The Court checks for drive-by changes (did the agent also "improve" the logger?), for unrelated defensive code ("while we're in here" try/except on unrelated INSERTs), for new abstractions (a SessionFactory class that wraps a two-line fix). The contract's minimality invariant is the anchor. A fix that touches ten files for a race in one code path fails Pass 2 on scope drift.

The Devil's Advocate fires because "test newly passes" is the highest-theatre output in the catalogue. Its instruction: find the reason this is wrong. It inspects whether the fix could be vacuous (retry loop that eventually succeeds, masking the duplicate); whether the reproducer still exercises the race after the fix (did the fix narrow the window rather than closing it?); whether the test itself was weakened. Non-empty Devil's Advocate output upgrades Pass 2 to strict mode.

### 5. Ledger interaction

Prior lessons present at contracting time: "retry-loop masks," "try/except IntegrityError patches the log not the bug," "probabilistic tests are not reproducers." These shape C1 (reproducer-determinism requirement), C3 (must_not on retry and bare-except patterns), and C2 (mechanism must be named from vocabulary). New lessons written during this run, if any resets occur, go back into the Ledger and refine the next race-condition contract.

## A Realistic Failure and Reset

First loop on T3: the subagent reads C3 and, under pressure of a failing reproducer, produces a fix that wraps the INSERT in `try: insert(); except IntegrityError: regenerate_session_id(); insert()`. It reruns the reproducer. The reproducer now passes 97/100 runs. The subagent marks the task done and hands off to Verify. Verify runs the Functional probe: 100/100 required for green, 97/100 observed. Fail. Reset.

Lesson written: "a retry-on-IntegrityError pattern is a probabilistic fix, not a deterministic one; C3 Substantive must_not clause must read 'no retry wrapping the INSERT; the fix must eliminate the race, not re-run it.'" The contract_patch is applied; C3's must_not list gains a row. Task T3 is re-queued with the patched contract.

Second loop on T3: the subagent, reading the updated Substantive must_not, sees that retry is out. It reads T2's root-cause document: mechanism is check-then-insert-at-read-committed. It changes the SELECT-then-INSERT to `INSERT ... ON CONFLICT (session_id) DO NOTHING RETURNING id`; if no row is returned, it regenerates id once and retries the INSERT once (bounded, not unbounded, and structurally different from retry-on-exception). Reruns reproducer: 100/100. Stress probe: 10,000 requests, zero 500s, zero duplicate ids.

Devil's Advocate inspects. It notes the fix still has a retry on zero-row return. It asks: is this a retry loop by another name? The Court reads the contract's must_not more carefully: the clause forbids retry wrapping the INSERT to recover from IntegrityError; it does not forbid regenerating an id on ON CONFLICT DO NOTHING, which is semantically different (the INSERT succeeded in the sense that the DB rejected the duplicate cleanly; there is no exception to swallow). Devil's Advocate output is noted but not escalating. Pass 1 green. Pass 2: the diff touches only the session-creation function, nothing else; merge. T3 marked done. T4 green. `/ship` runs whole-branch Court, replays the contract from a clean worktree, opens the PR.

## Critical Issues Surfaced by Deep Discovery

1. **Reproducer-determinism is the load-bearing promise.** If the reproducer is allowed to pass probabilistically before the fix, every downstream gate is theatre. The contract must reject a reproducer whose pre-fix failure rate is not near-100%.
2. **"Race condition" is not a root cause.** Without a controlled vocabulary of mechanisms, agents will write "concurrency issue" in C2 and pass Substantive. The vocabulary must be enumerated in the contract schema for the bug-fix intent shape.
3. **Stress probe is non-negotiable for concurrency fixes.** A reproducer that passes once post-fix is not evidence. 10,000 concurrent operations across varied ids is the floor because concurrency bugs are distribution-shaped, not point-shaped.
4. **Retry-as-fix is the dominant rationalization.** The Ledger must carry this as a pre-loaded lesson for every bug-fix contract, not wait for the project to learn it in-house.
5. **Local-repro-impossible is a contract input, not an excuse.** The contract must demand that T1 either reproduce locally under load amplification or escalate immediately. "Will fix in production and watch Sentry" is not an acceptable plan.
6. **Isolation-level and DB-config changes are scope-expanding.** A fix that changes transaction isolation level touches every transaction, not just the login path. Pass 2 must check for unintended scope when the diff modifies DB config.
7. **Idempotency is a spec gap, not a code gap.** If login is not idempotent by design, every race fix is a patch. The contract should surface this question: is the intended invariant "at most one session per concurrent login burst" or "exactly one"?
8. **Sentry silence is not evidence.** A fix that reduces 500 rate from 1/200 to 1/20000 looks successful and is still broken. Functional probes must count, not sample.
9. **The ORM layer may be the source.** If the codebase uses SQLAlchemy or similar, the retry logic may live in the ORM's session handling, not in the route. T2 must trace through the ORM, not stop at the route.
10. **Ledger can over-constrain.** The lesson "no retry on IntegrityError" is correct for check-then-insert races but wrong for legitimate optimistic-concurrency patterns with proper version columns. Pattern tags must distinguish.

## Strengths Confirmed

1. DAG ordering (reproduce first) makes patch-and-pray structurally impossible.
2. Contract's reproducer-determinism check rejects probabilistic tests at save time.
3. Court's separation from Plan prevents sycophantic agreement with the fix author.
4. Devil's Advocate fires specifically on "test newly passes," which is the bug-fix failure signature.
5. Ledger injects prior race-condition lessons without requiring fresh learning.
6. Four-level verification catches orphan fixes (diff unreachable from the actual login handler).
7. Whole-branch Court before ship catches cross-cutting effects of isolation-level changes.
8. Resetting skill's inability to emit null lessons forces real diagnosis after each failed loop.
9. The Rationalizations table in `executing` preloads "retry masks" so the first loop is already primed against the common anti-fix.
10. Stop-hook contract replay means Sentry silence does not close the ticket; the reproducer does.

## Design Refinements Proposed

1. **New check type: `reproducer_determinism`.** Schema addition to Contract: `functional.determinism: {runs: 100, required_fail_rate: 1.0}` for reproducer criteria. Enforced by Verify.
2. **Mandatory `root_cause_named` slot for bug-fix contracts.** When `intent_shape` matches "fix bug / error / crash", the contract schema requires a criterion whose Substantive block names a mechanism from `cli\root-cause-vocabulary.json`. Contracts without this slot fail to save.
3. **Ledger race-condition vocabulary.** Seed the Ledger with canonical entries: `check-then-insert-at-read-committed`, `at-least-once-retry-without-idempotency`, `cache-stale-upsert`, `insufficient-entropy`, `commit-then-revisit-under-auto-rollback`. The `resetting` skill must pick from this list when tagging a race-condition lesson.
4. **Stress-probe default for concurrency contracts.** A new Verify probe type `stress: {concurrent_ops: N, varied_inputs: bool, max_error_rate: 0}` that is auto-added to Functional when `pattern` includes `race-condition`.

## Bottom Line

Concurrency bugs are the genre where patch-and-pray is most rewarded by superficial metrics and most expensive in production. Anvil's structure handles this well because the ordering of its gates maps exactly to the discipline a careful engineer applies: reproduce first, name the mechanism second, change code third, verify under stress fourth, have an adversarial reviewer read it cold fifth. The DAG, the reproducer-determinism check, the named-mechanism requirement, the stress probe, and the Devil's Advocate together turn "the test passes" from a success signal into a starting point. The honest caveat is that concurrency bugs resist automated fixing at the implementation layer; Anvil cannot guarantee the right fix, it can only guarantee that the wrong fix is visibly wrong. That is the correct scope for a loop of this kind: not to make agents reason about race conditions, but to make their failures impossible to ship.
