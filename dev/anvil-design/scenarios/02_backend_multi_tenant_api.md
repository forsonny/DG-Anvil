# Scenario 02: Backend Design - Multi-Tenant API with RLS

## User Intent

The user wants a multi-tenant project-management SaaS backend built fresh: Postgres + FastAPI + SQLAlchemy, with six core resources (Organization, Workspace, Project, Task, User, Membership), JWT auth carrying an `org_id` claim, REST endpoints with OpenAPI, and - critically - row-level security enforced inside Postgres, not merely in the application layer. This is a green-field systemic build, not a feature addition.

## Context

The user is asking Anvil to execute a task whose failure mode is catastrophic and silent: one wrong RLS policy, one endpoint that forgets to set `SET LOCAL app.org_id`, one superuser-owned connection pool, and tenant A sees tenant B's data. The blast radius extends across every table, every endpoint, every migration. Unlike a bug-fix or a feature bolt-on, the contract must bind decisions in task 1 (schema) to behavior in task 27 (the last endpoint handler), and the Court's per-task isolation - normally a virtue - risks missing the cross-cutting leak.

## The Load-Bearing Question

Anvil's design philosophy - fresh subagents per atomic task, orchestrator holding only Contract/Plan/Ledger-index, Court isolated from Plan - was engineered against context pollution and sycophantic convergence. Those are per-agent failures. RLS correctness is the opposite shape: it is a global invariant that depends on coherent behavior across many tasks that never share context. **How does Anvil propagate a systemic constraint into per-task verification, and how does the whole-branch Court detect the one endpoint that forgot to participate?**

## Walk-Through: Anvil Handles This

### 1. Contract

The `contracting` skill produces `anvil/contract.yml` with criteria at three tiers: (a) schema criteria, (b) per-resource RLS policy criteria, and (c) a large `Invariants` block encoding the cross-cutting rules. The Invariants block is where the systemic constraint lives. The Ledger is queried for patterns `rls`, `multi-tenant`, `jwt-session-var`, `sqlalchemy-pool`.

```yaml
anvil_contract_version: 1
goal: "Multi-tenant PM SaaS backend; Postgres RLS enforced; FastAPI + SQLAlchemy"
---
## Criteria
- id: C3
  statement: "Every tenant-scoped table has FORCE ROW LEVEL SECURITY with a policy keyed on current_setting('app.org_id')"
  exists:
    migration: "migrations\\versions\\0003_rls_policies.py"
    symbols: ["organizations","workspaces","projects","tasks","memberships"]
  substantive:
    must_implement:
      - "ALTER TABLE ... ENABLE ROW LEVEL SECURITY"
      - "ALTER TABLE ... FORCE ROW LEVEL SECURITY"
      - "CREATE POLICY tenant_isolation ON <t> USING (org_id = current_setting('app.org_id')::uuid)"
    must_not:
      - "BYPASSRLS granted to app_role"
  wired:
    probe_sql: "SELECT tablename FROM pg_policies WHERE schemaname='public'"
    must_return_all_of: ["organizations","workspaces","projects","tasks","memberships"]
  functional:
    probe:
      runner: "pytest"
      target: "tests\\integration\\test_tenant_isolation.py"
      must_pass: ["test_tenant_a_cannot_read_tenant_b_tasks",
                  "test_tenant_a_cannot_update_tenant_b_projects",
                  "test_session_without_org_id_returns_zero_rows"]

## Invariants
- no_superuser_in_request_pool: true
- every_request_sets: "SET LOCAL app.org_id = <jwt.org_id>"
- every_tenant_table_has_org_id_column: true
- every_tenant_table_listed_in_pg_policies: true
- no_endpoint_uses_session_factory_bypass: ["engine_admin","create_engine.*isolation_level=.AUTOCOMMIT."]
- openapi_spec_matches_routes: true
```

The Invariants block is not decorative. On every Verify pass, each invariant is evaluated as a boolean predicate against the repo state. The two load-bearing ones are `every_tenant_table_listed_in_pg_policies` (closes the "I added a table and forgot a policy" hole) and `no_superuser_in_request_pool` (closes the bypass-via-connection-identity hole).

### 2. Plan

The `planning` skill produces a wave-ordered DAG. Each task cites the contract lines it satisfies.

```yaml
waves:
  - wave: 1
    tasks:
      - id: T1   cites: [C1]       "Alembic scaffold + base Declarative"
      - id: T2   cites: [C1,Inv.every_tenant_table_has_org_id_column]
                                    "Schema: six tables with org_id FKs"
  - wave: 2
    tasks:
      - id: T3   cites: [C3,Inv.every_tenant_table_listed_in_pg_policies]
                                    "RLS migration: ENABLE+FORCE+POLICY per table"
      - id: T4   cites: [C4,Inv.no_superuser_in_request_pool]
                                    "Two engines: admin_engine (migrations only),
                                     request_engine (LOGIN app_role NOBYPASSRLS)"
  - wave: 3
    tasks:
      - id: T5   cites: [C5]       "JWT verifier; org_id claim extraction"
      - id: T6   cites: [C6,Inv.every_request_sets]
                                    "Middleware: on every request, acquire conn,
                                     SET LOCAL app.org_id = jwt.org_id, yield session"
  - wave: 4    # endpoints, parallel
    tasks:
      - T7..T22  one per (resource x verb); each cites C_resource + Inv.openapi_spec_matches_routes
  - wave: 5
    tasks:
      - T23  "Integration suite: cross-tenant probes"
      - T24  "OpenAPI emission + schemathesis fuzz"
```

Wave 1 and 2 are the load-bearing ones; Wave 4 fans out to many parallel endpoint tasks whose correctness depends on Wave 2 and 3's invariants holding.

### 3. Execute and Verify

Per-task Verify runs Exists / Substantive / Wired / Functional. For T3 (RLS migration):

- **Exists**: `migrations\versions\0003_rls_policies.py` present, names five tables.
- **Substantive**: migration body contains `ENABLE`, `FORCE`, and `CREATE POLICY` for each; behavioural probe runs `alembic upgrade head` against an ephemeral Postgres and captures `\d+ tasks` output.
- **Wired**: the probe SQL `SELECT tablename FROM pg_policies` runs against the upgraded database; result must contain all five table names.
- **Functional**: `pytest tests\integration\test_tenant_isolation.py` - two sessions with different `app.org_id` values; tenant A inserts, tenant B selects, must see zero rows.

For T6 (middleware), Functional includes an integration probe that starts FastAPI, issues one request with tenant-A JWT and one with tenant-B JWT against the same endpoint, and asserts the rows returned do not overlap. For every Wave-4 endpoint task, the Functional probe is an integration test, not a unit test, so the middleware's session setting is exercised.

Invariants are checked on every Verify pass. `every_tenant_table_listed_in_pg_policies` runs a diff-walk: enumerate tables added in the diff, cross-reference `pg_policies`, fail if any appear without a policy.

### 4. Judge

Pass 1 (Court, fresh subagent, sees only contract + diff + verify output) asks criterion-by-criterion: does the evidence in the diff and the pg_policies output match C3's `wired.must_return_all_of`? The Court cannot be fooled by an implementer's narrative about "I handled RLS elsewhere" because it does not see the narrative.

Pass 2 asks mergeable-quality: does the endpoint touch only its scope? Does it add an unrelated migration? Does it introduce a session factory that bypasses the request_engine? Devil's Advocate fires when Verify produces a suspiciously short integration output (e.g. a cross-tenant test passing in 0.02s signals the test may not have opened two sessions).

The **whole-branch Court** before `/ship` reads the full diff and the full contract. This is where cross-task drift is caught: if T14 (an endpoint) imported `engine_admin` because the developer "needed raw access", the single-task Court that reviewed T14 might have rated it mergeable, but the whole-branch Court sees the admin-engine import alongside the `no_superuser_in_request_pool` invariant and fails.

### 5. Ledger interaction

At contract-authoring time the Ledger returns patterns with known RLS pathologies. Representative injected counter-examples:

- "Policy on base table; join table lacked FORCE; tenant A joined through memberships to see tenant B projects."
- "SQLAlchemy pool reused connections; prior request's SET LOCAL leaked when SET was not LOCAL."
- "Superuser role used for migrations *and* requests; BYPASSRLS silently active."
- "Policy used `current_setting('app.org_id')` without `, true`; null setting raised, middleware ate exception, returned 500s that were retried and eventually served cached cross-tenant rows from Redis."

Each becomes a Substantive `must_implement` clause or a new Invariant.

## A Realistic Failure and Reset

Wave 2, task T4. The subagent implements a single `create_engine(url)` used both for Alembic migrations and for the FastAPI dependency. Unit tests green; the task's own Verify for C4 passes because the contract criterion was named but under-specified.

Devil's Advocate fires on the subsequent T6 middleware Verify: the tenant-isolation integration test passes in 0.00s against SQLite (dev default) - Postgres-specific RLS semantics not exercised. The Court Pass 1 marks the Functional verdict `suspicious`. Pass 2 elevates `request-clarification` to `request-changes`.

`resetting` is invoked. The diagnosis is input-level: the contract said "two engines" in prose but the probe did not enforce it. The lesson written:

```json
{
  "pattern": ["rls","sqlalchemy","connection-pool","superuser"],
  "contract_gap": {
    "level": "substantive",
    "criterion": "C4",
    "should_have_been": "request_engine created with distinct LOGIN role 'app_role' that lacks BYPASSRLS; probe queries pg_roles and asserts rolbypassrls=false for that role"
  },
  "remediation": {
    "contract_patch": "add Invariant: request_role_has_no_bypass: {probe_sql: \"SELECT rolbypassrls FROM pg_roles WHERE rolname='app_role'\", must_equal: false}"
  }
}
```

The contract is patched, T4 re-queued, session killed, fresh subagent. This time the Functional probe runs against a throwaway Postgres container and checks `pg_roles`. The second pass succeeds.

## Critical Issues Surfaced by Deep Discovery

1. **The atomic-task boundary is too narrow for schema-coupled contracts.** Wave 4's endpoint tasks assume the schema decisions of T2 and T3. If T3 names a column `tenant_id` but T2 used `org_id`, every Wave-4 task fails the same way. Anvil's current design catches this at per-task Verify, but the failure storm is expensive (N endpoint tasks all reset for the same reason). There is no "wave-level Verify" between waves 2 and 3 beyond the orchestrator's pass-state check.

2. **Invariants are predicates but the contract grammar does not formally type them as system-invariants.** The `Invariants` block is flat list; there is no distinction between a local invariant (coverage floor) and a system-invariant (`every_tenant_table_listed_in_pg_policies`) that must be re-evaluated whenever any task modifies schema. A system-invariant should trigger re-Verify of its predicate on every task that touches the relevant surface, not only on the task that named it.

3. **Whole-branch Court reads diff + contract but not schema state.** The final Court is given the diff as text. A subtle RLS leak - a policy using `USING (org_id = current_setting('app.org_id'))` without the `::uuid` cast where the column is uuid and setting is text, producing a silent type-coercion bypass - is visible only by running the policy against real data. Whole-branch Court currently has no "schema-aware diff reading" capability; it parses SQL as text.

4. **Ledger patterns collide across very different schemas.** A lesson about "RLS join table" learned in a prior project where `memberships` was the join table gets injected when the current project uses `workspace_members`. Pattern tags catch the category but not the naming mismatch; the counter-example text may be ignored because it names a symbol the agent cannot find.

5. **JWT decode failure mode is architectural, not task-level.** If a malformed JWT reaches the middleware and the exception handler is overly broad, the session yields without setting `app.org_id`, and the Postgres default (empty string) causes the policy's cast to fail, which some implementations catch and treat as "no rows" - silent success for a request that should 401. No single task owns this; it emerges from the composition of T5 (JWT), T6 (middleware), and T3 (policy).

6. **OpenAPI drift is a second systemic invariant, not symmetric to RLS.** `openapi_spec_matches_routes` sits in the same Invariants block but is enforced differently (spec emission at the end vs policy check on every task). The contract grammar does not distinguish enforcement cadence.

## Strengths Confirmed

- **Contract-as-machine-object**. The `pg_policies` probe, the `pg_roles` probe, and the cross-tenant integration test are concrete, queryable, and cheaply re-run. Prose specs for RLS historically fail because they cannot be verified without executing SQL; Anvil's Substantive + Wired + Functional decomposition pushes authors into executable criteria.
- **Fresh-subagent-per-task** prevents an implementer who solved T3's RLS policy from carrying assumptions into T4's pool configuration. Each task must reread the contract, which is the only durable carrier of cross-task coherence.
- **Whole-branch Court + Invariants** is the correct architectural pair: per-task Court cannot see composition, whole-branch Court can; per-task Verify cannot re-check policy for a table added two tasks later, but the Invariant `every_tenant_table_listed_in_pg_policies` can and does.
- **Ledger shapes the next contract, not the next agent**. For RLS, this is exactly right - RLS failures are contract-specification failures, not skill failures, and the remediation belongs in tightened `must_implement` and new Invariants.
- **Devil's Advocate** is tailor-made for RLS theatre: a tenant-isolation test that runs in 0.00s is the canonical symptom of "probe did not actually exercise Postgres RLS".

## Design Refinements Proposed

1. **Introduce a `system_invariants` block, separate from `invariants`.** System-invariants declare a re-evaluation trigger (`on_any_task_modifying: [migrations/**, src/models/**]`). The orchestrator re-runs these predicates whenever any matching file changes, not only on the declaring task's Verify.

2. **Add a `wave_gate` between waves**, implemented as a lightweight Court pass that sees only: (a) all diffs from completed waves, (b) the contract's system-invariants, (c) the upcoming wave's tasks. Purpose: catch schema-coupled naming divergences before N parallel tasks all reset for the same reason. Cheaper than whole-branch Court; strictly scoped.

3. **Schema-aware whole-branch Court.** Extend the final Court's inputs to include a materialized schema snapshot (`pg_dump --schema-only`) and the output of `pg_policies`, `pg_roles`, and `information_schema.table_constraints`. The Court should be able to cite "column `tasks.org_id` is `uuid` but policy `tenant_isolation` casts `::text` - silent bypass."

4. **Lesson pattern tagging with schema fingerprint.** Ledger lessons about RLS should tag the schema shape (e.g. `join-table:workspace_members`, `tenant-column:org_id`) so pattern injection requires both category match and naming compatibility. If the current contract's naming differs, the Ledger translates the counter-example text rather than injecting it verbatim.

5. **New Verify probe type: `policy_coverage_probe`.** Given a list of tenant-scoped tables (derived from a schema scan for columns matching `org_id|tenant_id|organization_id`), enumerate `pg_policies` and fail if any table appears without a `FORCE`-d policy. This probe runs after every migration-modifying task, not only on T3.

6. **JWT-to-session contract criterion.** Add a criterion whose Functional probe issues: a valid JWT (must return data), a malformed JWT (must 401 before DB access), an expired JWT (must 401), a JWT with missing `org_id` claim (must 401 - not zero-rows). Closes the composition hole.

## Bottom Line

Anvil handles this scenario well, but not by accident - the Invariants block and whole-branch Court were designed for exactly this failure shape. The atomic-task DAG does not break on systemic constraints; it just shifts the weight onto the contract. The concrete gaps are not in the loop's shape but in the contract grammar's expressiveness around re-evaluation cadence and in the whole-branch Court's access to live schema state. Add `system_invariants` with triggers, a wave-gate, and schema-aware Court inputs, and Anvil becomes genuinely defensible for multi-tenant RLS work. Without those refinements, a single under-specified criterion propagates into N parallel resets and a whole-branch Court that reads SQL as text. The honest takeaway: Anvil's atomic model is compatible with systemic constraints, but only when the contract author front-loads the systemic discipline into Invariants the Verify layer can mechanically check. The loop does not invent coherence; it enforces what the contract declares - so for backend design, contract-authoring is the load-bearing phase, and the `contracting` skill's Ledger-querying and invariant-proposing behavior deserves the most scrutiny.
