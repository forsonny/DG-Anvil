# Scenario 09: Third-Party Integration - Stripe Checkout

## User Intent

"Add Stripe subscription checkout. Three tiers (Starter $9, Pro $29, Team $99/seat/mo). Stripe-hosted checkout. Webhook handling for `subscription.created/updated/deleted`, `invoice.payment_failed`. Idempotent webhook processing. Self-serve cancellation via Customer Portal. Test mode + production keys. Don't screw up billing."

## Context

Three high-stakes surfaces collide: money, asynchronous delivery, and a third-party system whose sandbox is only a partial simulacrum of production. The failure modes are silent (duplicate charges, double-provisioned seats), the feedback latency is long (dunning cycles span weeks), and the remediation cost is real (chargebacks, refunds, trust damage). "The test passed" is the classic lie here: Stripe's test webhook arrives from `stripe-cli`, not from the real webhook infrastructure, retry timing is compressed, and the signing secret differs per environment.

## The Load-Bearing Question

How does Anvil's Contract encode "don't screw up billing" as something a separate process can verify? How does Verify probe a webhook whose origin is an external service running on someone else's cluster? How does the Ledger prevent the three most common agent mistakes on this task: writing a non-idempotent webhook handler, leaking a secret into a log, and letting the test-mode key ship to production?

## Walk-Through: Anvil Handles This

### 1. Contract

The `contracting` skill produces `anvil\contract.yml`. Because the intent triggers Ledger patterns `payment`, `webhook`, `idempotency`, `stripe`, up to five counter-examples are injected before the criteria are drafted.

```yaml
---
anvil_contract_version: 1
goal: "Stripe subscription checkout with idempotent webhook handling"
source_intent: "add stripe subscription checkout"
ledger_queried: true
ledger_hits:
  - pattern: "webhook-idempotency"
    lessons: ["2026-01-08-003", "2025-11-22-019"]
  - pattern: "stripe-signature"
    lessons: ["2025-09-14-007"]
  - pattern: "secret-in-log"
    lessons: ["2026-02-19-011"]
---

## Criteria

- id: C1
  statement: "Webhook endpoint verifies Stripe signature before any parsing"
  exists:
    file: "src\\webhooks\\stripe.py"
    symbol: "stripe_webhook"
  substantive:
    must_implement:
      - "calls stripe.Webhook.construct_event with raw body + signature header + endpoint secret"
      - "returns 400 on SignatureVerificationError before DB touch"
      - "reads endpoint secret from env, never from code"
    must_not:
      - "parses JSON body before signature check"
      - "logs request body, signature header, or Stripe-Signature"
  wired:
    call_site:
      file: "src\\routes\\__init__.py"
      must_contain_route: "POST /webhooks/stripe"
  functional:
    probe:
      runner: "pytest"
      target: "tests\\test_stripe_webhook.py"
      must_pass:
        - "test_valid_signature_accepted"
        - "test_bad_signature_rejected_400"
        - "test_missing_signature_header_rejected_400"
        - "test_body_not_parsed_before_verify"

- id: C2
  statement: "Every state-mutating webhook handler is idempotent via event.id dedup"
  exists:
    file: "src\\webhooks\\idempotency.py"
    symbol: "WebhookIdempotencyGuard"
  substantive:
    must_implement:
      - "persists stripe event.id to webhook_events table before handler body runs"
      - "on duplicate event.id returns 200 without re-executing handler"
      - "wraps handler body + insert in single DB transaction"
    must_not:
      - "uses in-memory set for dedup"
      - "inserts event.id after mutation (race window)"
  wired:
    call_site:
      file: "src\\webhooks\\stripe.py"
      must_contain_symbol: "WebhookIdempotencyGuard"
  functional:
    probe:
      runner: "pytest"
      target: "tests\\test_webhook_idempotency.py"
      must_pass:
        - "test_duplicate_event_noop"
        - "test_concurrent_delivery_single_mutation"
        - "test_out_of_order_delivery_converges"

- id: C3
  statement: "Subscription DB state mirrors Stripe authoritative state"
  substantive:
    must_implement:
      - "subscription.created inserts row keyed by stripe_subscription_id"
      - "subscription.updated upserts by stripe_subscription_id with status + current_period_end"
      - "subscription.deleted sets status=canceled, does not delete row"
      - "invoice.payment_failed sets status=past_due, does not cancel"

- id: C4
  statement: "Customer Portal link gated on active subscription"
  substantive:
    must_implement:
      - "portal_url endpoint returns 403 when user has no stripe_customer_id"
      - "portal session created with return_url from env, not from request"

- id: C5
  statement: "Test vs production key selection is explicit"
  substantive:
    must_implement:
      - "STRIPE_SECRET_KEY read from env at module load"
      - "startup check: key prefix matches env (sk_test_ in dev/staging, sk_live_ only in production)"
      - "startup fails closed if prefix mismatches APP_ENV"

## Invariants
- no_secret_patterns:
    - "sk_live_[A-Za-z0-9]+"
    - "sk_test_[A-Za-z0-9]+"
    - "whsec_[A-Za-z0-9]+"
- no_cc_data_logged: true
- no_new_dependencies_except: ["stripe"]
- request_body_not_logged_in: ["src\\webhooks\\"]
```

### 2. Plan

The DAG, wave-ordered:

- **Wave 1**: `T1` price catalogue + env config, `T2` idempotency table migration, `T5` test-vs-prod key guard
- **Wave 2** (depends on T1, T2): `T3` checkout session endpoint, `T4` webhook signature + idempotency guard
- **Wave 3** (depends on T4): `T6` `subscription.created/updated/deleted` handlers, `T7` `invoice.payment_failed` handler
- **Wave 4** (depends on T6): `T8` customer portal endpoint, `T9` end-to-end probe via `stripe-cli`

Every task cites contract line ids. `T4` cites C1 + C2. `T9` cites C1 through C5 because it is the integration probe.

### 3. Execute and Verify

Each task runs in a fresh worktree with a fresh subagent. For `T4` (webhook handler):

- **Exists**: the `verifying` skill opens `src\webhooks\stripe.py`, confirms `stripe_webhook` symbol with matching signature, and opens `src\webhooks\idempotency.py`, confirms `WebhookIdempotencyGuard`.
- **Substantive**: behavioural probes run the handler with fixture events. Coverage delta confirms signature branch executes. A static pass inspects the AST: if `request.json` or `json.loads(body)` appears before `construct_event`, Substantive fails. A second static pass greps for logger calls inside `src\webhooks\` whose arguments include `signature`, `body`, `event`.
- **Wired**: the route table is walked from the Flask/FastAPI app root; `POST /webhooks/stripe` must resolve to `stripe_webhook`.
- **Functional**: `pytest` runs four test categories:
  1. Valid signature (generated with test `whsec_...` against raw body bytes) -> 200.
  2. Tampered body -> 400, no DB insert.
  3. Same `event.id` delivered twice -> single row in `webhook_events`, handler body called once (asserted via side-effect counter).
  4. Concurrent delivery: two threads POST the same event simultaneously; exactly one `subscriptions` row, exactly one `webhook_events` row.

The subtle point: the Functional probe generates its own Stripe-shaped payload and signs it with the test webhook secret. It does not call Stripe's API. The parity gap is handled by `T9`'s integration probe, which invokes `stripe-cli trigger subscription.created` against a local listener and asserts the same DB outcome.

### 4. Judge

Pass 1 (spec compliance): the Court sees contract + diff + Verify output only. For each criterion, it cites the line in `src\webhooks\stripe.py` where `construct_event` appears and confirms no `request.json` precedes it. For C2, it traces the `WebhookIdempotencyGuard` call site and inspects whether the `webhook_events` insert is inside the same transaction as the handler body. For C5, it confirms the startup guard compares `APP_ENV` against the key prefix and raises on mismatch.

Pass 2 (quality): the Court checks whether the diff drifts (does it touch the password-reset flow? a new ORM base class?), whether invariants hold (does any new file contain a regex match for `sk_live_`?), and whether handlers guard against Stripe event shapes the contract did not name (`customer.subscription.trial_will_end` - gracefully ignored, not silently failed).

Devil's Advocate triggers on `T9` because the integration probe's output is short (a single "200 OK" line). Its findings: "the probe does not assert the DB row's `current_period_end` matches the event's `current_period_end`; a handler that writes the wrong column would still produce 200." This becomes a `suspicious` tag; Pass 2 escalates the `request-clarification` to `request-changes`, forcing `T9` to expand its assertions.

### 5. Ledger interaction

Pre-existing lessons injected into this contract:

- `2026-01-08-003` (webhook-idempotency): event.id inserted after mutation. This prior lesson is why C2 requires the insert-before-handler ordering with a must_not clause.
- `2025-09-14-007` (stripe-signature): signature verified against re-serialized JSON. This is why C1 has the "calls construct_event with raw body" and the "must_not parse JSON body before signature check" clauses.
- `2026-02-19-011` (secret-in-log): DEBUG logger leaked signature header. This is why `request_body_not_logged_in` is an Invariant and why Substantive has an explicit must_not.

## A Realistic Failure and Reset

`T4` executes. The implementer writes a correct signature check and an idempotency guard using `@transaction.atomic`, but places the event.id insert inside the handler body, after the subscription upsert. Verify Functional runs `test_concurrent_delivery_single_mutation`. Two threads fire the same event. Both acquire connections, both read "no row for this event.id", both run the subscription upsert, then one tries to insert event.id and hits the unique constraint. The handler returns 500 on the loser; test asserts single-mutation and sees two upsert side effects. Fails.

The `resetting` skill diagnoses: the input (contract C2) said "wraps handler body + insert in single DB transaction" but did not say "event.id row created first, then SELECT FOR UPDATE, then handler body". The contract gap is ordering, not transaction scope. A new lesson is written:

```json
{
  "id": "2026-04-14-042",
  "pattern": ["webhook-idempotency", "stripe", "race"],
  "contract_gap": {
    "level": "substantive",
    "criterion": "C2",
    "was": "persists stripe event.id to webhook_events table before handler body runs",
    "should_have_been": "INSERTs event.id with ON CONFLICT DO NOTHING and checks rowcount; proceeds to handler body only if rowcount == 1; otherwise returns 200 without handler execution"
  },
  "remediation": {
    "contract_patch": "substantive.must_implement[C2][0] = 'INSERT INTO webhook_events (event_id) VALUES (?) ON CONFLICT DO NOTHING; if rowcount==0 return 200 without handler body'"
  }
}
```

The contract is patched, the task is re-queued. The second execution uses the insert-then-check-rowcount pattern; the concurrent test passes because only one thread sees `rowcount==1`.

## Critical Issues Surfaced by Deep Discovery

1. **Sandbox-vs-production parity is not verifiable in unit tests.** Stripe's test mode differs in retry timing, event ordering, and dunning. Anvil's contract can only encode what is testable in CI; the `T9` stripe-cli probe is a necessary but insufficient bridge. The honest move is a C6 criterion: `must_document_staging_test_checklist`, with a `docs\stripe-staging-runbook.md` artefact the human executes before merge.
2. **Webhook signature secret rotation is not in scope and probably should be.** If Stripe rotates the `whsec_` during an incident, the handler returns 400 for every event. Add a dual-secret window as a follow-up contract.
3. **Key-prefix guard at startup is necessary but not sufficient.** A developer could set `APP_ENV=production` locally and still have an `sk_test_` key; the guard fails closed but does not catch the inverse (staging with live keys).
4. **Idempotency table unbounded growth.** `webhook_events` grows forever. The contract does not encode a retention policy. Add C7 for TTL sweeper.
5. **Customer Portal return_url must come from env, not request.** Open redirect otherwise. This is in C4 but the Court Pass 2 should also check for `request.args.get('return_url')` patterns.
6. **Seat-pricing (Team $99/seat/mo) requires `quantity` on subscription items.** The contract covers tiers but does not encode seat count sync. Add C8.
7. **Currency and tax are absent from the contract.** Multi-currency or Stripe Tax changes the payload shape.
8. **Race between checkout completion and first webhook.** User lands on success page before `subscription.created` arrives. Contract needs a polling or pending-state pattern.
9. **Dunning and past_due transitions are silent.** `invoice.payment_failed` sets status but does not notify the user.
10. **Anvil cannot verify what it cannot run.** Stripe-hosted checkout redirects off-domain. The Functional probe cannot script a human entering a card number.

## Strengths Confirmed

1. Substantive clauses distinguish "has idempotency code" from "idempotency that works under concurrent delivery", because the probe runs concurrent threads.
2. The Invariants section carries `no_secret_patterns` as a diff regex, so secret-leak is caught at Verify time, not in production logs.
3. Prior Ledger lessons became contract clauses; the agent cannot rediscover these failures in the same phrasing.
4. The test-vs-prod key prefix guard is encoded at Substantive level and fails closed at startup.
5. Court Pass 1 on C1 traces the diff for `request.json` appearing before `construct_event`, catching the signature-on-parsed-body class.
6. Devil's Advocate on T9 catches shallow integration probes (200 OK without asserting persisted state).
7. Wired probe confirms the webhook route is actually registered, not just the handler exists.
8. Whole-branch Court catches cross-task drift, e.g. a later task adding a middleware that re-parses the body before the signature handler sees it.
9. Human touchpoint at `/ship` pairs with the staging runbook for the correctness gap CI cannot close.
10. Ledger entry `2026-04-14-042` makes every future payment contract stricter on idempotency ordering.

## Design Refinements Proposed

**Webhook-idempotency probe template**: under `docs\contract-examples\webhook-idempotency.yml`, a reusable C-block with the concurrent-delivery, out-of-order, and replay assertions. Contracting skill applies it on pattern `webhook`.

**No-secrets-in-log invariant**: `request_body_not_logged_in: [path]` becomes a first-class Invariant type. The Verify skill greps for logger calls within the named paths whose arguments reference `body`, `signature`, `event`, or any env var matching `*_SECRET` / `*_KEY`.

**Production-key-gated env check as skill**: a reusable `env-parity-check` Substantive template that cross-checks `APP_ENV` against known key prefixes for Stripe, AWS, GitHub, etc.

**Payment-integration Ledger vocabulary**: formalise pattern tags `payment`, `webhook-idempotency`, `signature-verification`, `sandbox-parity`, `key-prefix`, `dunning`, `seat-sync`, `open-redirect`.

**Staging runbook as artefact**: extend contract schema to allow a `human_verification_runbook` field that contributes to the `/ship` gate. The runbook is not optional; the human must check the boxes.

## Bottom Line

Anvil handles Stripe integration about as well as a machine-verifiable loop can. The Contract encodes idempotency ordering, signature-before-parse, env-gated keys, no-secret-in-log, and concrete side-effect assertions. The Ledger carries forward the exact prior failures that make payment integrations notoriously silent. The Court, reading only contract plus diff, cannot be fooled by a test that passes because it asserts nothing - Devil's Advocate handles the short-output case, and Pass 2 rejects scope drift into the checkout success page. What Anvil cannot do is make Stripe's sandbox equivalent to production, cannot script a human entering a card number on a hosted page, cannot simulate a six-week dunning cycle. That gap is honest: the `/ship` gate requires a human running a staging runbook, and the runbook itself becomes a contract artefact. The work that remains - webhook secret rotation, seat-sync, currency pinning, retention sweepers, open-redirect hardening on the portal return URL - is not infrastructure Anvil lacks; it is additional criteria that belong in this contract or the next one. "Don't screw up billing" is not a slogan the agent understands; it is the twelve clauses in this contract plus the next twelve after the next reset. That is the only form in which a loop can carry a financial-correctness mandate.
