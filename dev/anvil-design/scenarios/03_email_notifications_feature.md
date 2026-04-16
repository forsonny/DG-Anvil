# Scenario 03: New Feature - Email Notifications

## User Intent

Add email notifications to an existing Django app via Postmark. Events: task-assigned, task-commented, weekly Monday digest. Per-user, per-event preferences. Unsubscribe links. Templates that render cleanly in Outlook, Gmail, Apple Mail. Existing User and Task models must be integrated into, not rewritten.

## Context

This is the hardest scenario class Anvil has faced so far: brownfield integration plus cross-cutting concern (notifications touch nearly every write path) plus external I/O (Postmark) plus a presentation layer (HTML email) whose correctness is judged by rendering engines from 2007. The contract must defend three surfaces at once: the existing user experience, the template output, and the async delivery behaviour.

## The Load-Bearing Question

How does the Contract express "do not break existing user flows" as a machine-checkable predicate, rather than as a prose wish? And how does Verify catch a template that parses fine in isolation but renders as stacked garbage in Outlook 2016 because a CSS float drops?

Anvil's answer is that the contract adopts the existing test suite as a first-class Invariant (regression becomes a verifiable criterion, not an afterthought), and that template rendering is tested against a multi-client render probe (Litmus-style snapshot, pixel diff against a baseline). Email quality beyond "it does not explode" remains a human judgement in Pass 2 of the Court.

## Walk-Through: Anvil Handles This

### 1. Contract

The `contracting` skill queries the Ledger for patterns `["email", "postmark", "django-signals", "async-task", "html-email"]` and finds prior lessons about Outlook float collapse, unverified webhook signatures, and sending to soft-bounced addresses. The draft contract:

```yaml
anvil_contract_version: 1
goal: "Email notifications via Postmark for task-assigned, task-commented, weekly Monday digest"
ledger_queried: true
ledger_hits:
  - pattern: "html-email-outlook"
    lessons: ["2026-01-22-003"]
  - pattern: "postmark-webhook-unverified"
    lessons: ["2025-11-09-018"]
  - pattern: "email-to-soft-bounced"
    lessons: ["2026-02-14-007"]

criteria:
  - id: C1
    statement: "NotificationPreference model exists per user, per event type"
    exists:
      file: "notifications\\models.py"
      symbol: "NotificationPreference"
    substantive:
      must_implement:
        - "FK to User with on_delete=CASCADE"
        - "event_type choices: assigned, commented, digest"
        - "enabled bool default True"
        - "unique_together (user, event_type)"
    wired:
      call_site:
        file: "notifications\\signals.py"
        must_contain_symbol: "NotificationPreference.objects.filter"
    functional:
      probe: { runner: "pytest", target: "tests\\test_preference_model.py", exit_code: 0 }

  - id: C2
    statement: "Postmark adapter sends only to opted-in, non-bounced addresses"
    exists:
      file: "notifications\\adapters\\postmark.py"
      symbol: "PostmarkAdapter.send"
    substantive:
      must_implement:
        - "checks NotificationPreference.enabled before send"
        - "checks SuppressionList for hard/soft bounce"
        - "verifies webhook signature on inbound events"
      must_not:
        - "hardcodes POSTMARK_TOKEN"
        - "sends when preference.enabled is False"
    wired:
      call_site:
        file: "notifications\\tasks.py"
        must_contain_symbol: "PostmarkAdapter().send"
    functional:
      probe:
        runner: "pytest"
        target: "tests\\test_postmark_adapter.py"
        must_pass:
          - "test_skips_when_opted_out"
          - "test_skips_soft_bounced"
          - "test_rejects_unsigned_webhook"

  - id: C3
    statement: "Templates render correctly across Outlook 2016, Gmail, Apple Mail"
    exists:
      files:
        - "notifications\\templates\\email\\assigned.html"
        - "notifications\\templates\\email\\commented.html"
        - "notifications\\templates\\email\\digest.html"
    substantive:
      must_implement:
        - "table-based layout (no flexbox, no grid)"
        - "inline CSS (no <style> block dependencies)"
        - "MSO conditional comments for Outlook"
        - "unsubscribe link present and resolvable"
      must_not:
        - "uses float: (known Outlook 2016 collapse)"
        - "references external CSS file"
    wired:
      call_site:
        file: "notifications\\render.py"
        must_contain_symbol: "render_email_template"
    functional:
      probe:
        runner: "anvil verify template-render"
        target: "notifications\\templates\\email\\*.html"
        clients: ["outlook-2016", "gmail-web", "apple-mail-16"]
        must_pass: "pixel_diff < 0.03 vs baseline"

  - id: C4
    statement: "Sending is async; web requests do not block on Postmark"
    exists:
      file: "notifications\\tasks.py"
      symbol: "send_notification_task"
    substantive:
      must_implement:
        - "decorated with @shared_task (Celery)"
        - "called via .delay() from signal handlers"
    wired:
      call_site:
        file: "notifications\\signals.py"
        must_contain_symbol: "send_notification_task.delay"
    functional:
      probe:
        runner: "pytest"
        target: "tests\\test_signal_async.py"
        must_pass:
          - "test_task_created_signal_enqueues_not_sends"
          - "test_web_request_does_not_call_postmark_sync"

  - id: C5
    statement: "Existing user and task flows are unchanged"
    exists: { test_suite: "tests\\" }
    substantive: { unchanged: true }
    wired: { no_modifications_to: ["users\\models.py::User", "tasks\\models.py::Task::save"] }
    functional:
      probe: { runner: "pytest", target: "tests\\ -k 'not notifications'", exit_code: 0 }

invariants:
  regression_suite: "tests\\ -k 'not notifications' exit 0 unchanged"
  no_new_dependencies_except: ["postmark", "celery", "premailer"]
  public_api_unchanged: ["users.models.User", "tasks.models.Task.save"]
  no_secret_patterns: ["POSTMARK_[A-Z_]+_TOKEN\\s*=\\s*['\"][a-z0-9-]{20,}"]
  unsubscribe_link_required: "every outbound template must call {% unsubscribe_url %}"
```

C5 is load-bearing. It elevates "do not break existing flows" from prose to a verified criterion: the existing test suite minus the new notifications folder must pass unchanged. The `regression_suite` Invariant is re-run on every task Verify, not only at ship time.

### 2. Plan

The `planning` skill produces a DAG. Wave order is topological:

- **Wave 1:** T1 preference model + migration (cites C1). T2 Postmark adapter shell (cites C2 Exists/Substantive).
- **Wave 2:** T3 template system + render helper (cites C3). T4 Celery task wrapper (cites C4 Exists/Substantive).
- **Wave 3:** T5 signal wiring (cites C1 Wired, C4 Wired). T6 digest cron (cites C4).
- **Wave 4:** T7 preference UI endpoint (cites C1 functional). T8 unsubscribe endpoint (cites C3 substantive `unsubscribe_link present`).
- **Wave 5:** T9 end-to-end functional probes (cites C2, C3, C4 Functional).

Every task cites at least one contract criterion line. Planning rejects any task without a citation. Notice the preference model comes before the adapter - the adapter reads the model, not the reverse.

### 3. Execute and Verify

Each task runs in a fresh worktree, in a fresh subagent. Verify walks the four levels for the criteria the task cites:

- **Exists:** `notifications\models.py::NotificationPreference` present after T1? `notifications\templates\email\assigned.html` present after T3?
- **Substantive:** for C1, the probe instantiates a NotificationPreference, calls `.save()`, and asserts the unique_together constraint raises on a duplicate. Behavioural, not regex. For C3, the probe renders the template with sample context and asserts the output HTML contains `<table role="presentation">`, lacks `float:`, and contains the unsubscribe placeholder.
- **Wired:** call-graph walk confirms `send_notification_task.delay` appears in `notifications\signals.py` at the post_save handler for Task. Confirms no synchronous Postmark call exists in any request handler.
- **Functional:**
  - Postmark calls are mocked with a fixture that captures payload. The mock asserts: `To` is the recipient, `MessageStream` is `outbound`, webhook signature present on inbound test.
  - The regression invariant probe runs `pytest -k 'not notifications'` and asserts exit 0.
  - The template-render probe is the novel piece. It launches headless rendering against three engines (Outlook rendering via `premailer` + MSO conditional simulation, Gmail via Chromium with Gmail's CSS sandbox applied, Apple Mail via WebKit headless), pixel-diffs against committed baselines, and fails if any diff exceeds 3%.

On T3, the first Execute picks a flexbox layout because the stub template inherited the site's base stylesheet. The template-render probe fires: pixel diff in Outlook 2016 simulation is 47%. Verify fails at Functional.

### 4. Judge

Assume Wave 2 passes Verify cleanly. The Court fires, fresh subagent, three inputs only: contract, diff, captured Verify output.

**Pass 1 - Spec compliance.** Reads C3's Substantive `must_not: uses float:` and greps the diff. Reads the pixel-diff tool output, confirms all three clients under 3%. Reads C2's `must_implement: verifies webhook signature` and confirms the adapter code includes HMAC check with citation to `notifications\adapters\postmark.py:88-102`. Every finding cites diff line + tool output string. Verdict: pass.

**Pass 2 - Code quality.** Reads the diff for scope creep. Finds that T3's implementer added a "reusable" `BaseEmailTemplate` abstraction with three subclasses for only three templates. Contract did not request this. Verdict: `request-changes` - speculative abstraction (failure mode 10), unjustified new structure. The diff also contains a drive-by rename of `Task.assignee` to `Task.assigned_to` in `tasks\models.py`. Invariant `public_api_unchanged` is violated even though tests were updated. Verdict: `request-changes`.

The task resets. The `resetting` skill writes a lesson:

```json
{
  "id": "2026-04-14-022",
  "pattern": ["email-template", "speculative-abstraction"],
  "contract_gap": {
    "level": "substantive",
    "criterion": "C3",
    "was": "table-based layout, inline CSS",
    "should_have_been": "table-based layout, inline CSS, NO base class abstraction until 4+ templates exist"
  },
  "remediation": {
    "contract_patch": "substantive.must_not += 'creates abstract base class for fewer than 4 concrete templates'"
  }
}
```

The patch flows into the re-queued T3 input. The fresh subagent reads the updated contract, produces three flat templates, passes.

### 5. Ledger Interaction

Three prior lessons were injected at contract time:

1. **Outlook float collapse.** Became a `must_not: uses float:` clause in C3. The implementer was told in the contract text itself not to use floats.
2. **Unverified webhook signatures.** Became a `must_implement: verifies webhook signature` clause in C2. The Substantive probe now checks for HMAC validation.
3. **Sending to soft-bounced addresses.** Became a `must_implement: checks SuppressionList for hard/soft bounce` in C2, and `test_skips_soft_bounced` as a required Functional test.

Each lesson's `hit_count` was incremented on injection. If the tasks pass first try, `prevented_count` also increments - growing the lesson's effect-size ratio. Lessons below 0.2 efficacy after 20 hits are auto-retired.

## A Realistic Failure and Reset

Wave 3, T5 signal wiring. The implementer takes the path of least resistance: the signal handler calls `PostmarkAdapter().send()` directly. Unit tests pass - they mock Postmark. But the C4 Functional probe `test_web_request_does_not_call_postmark_sync` asserts that during a Task.save() inside an HTTP request, Postmark's HTTP client is never instantiated in the request thread. The probe fails: Postmark client is constructed synchronously; the request takes 340ms when Postmark is slow.

Verify fails at Functional. `resetting` diagnoses: contract-gap is not on the criterion - C4 Wired correctly requires `.delay()`. The gap is that Wave 3's task input didn't name the anti-pattern loudly enough. Lesson written:

```json
{
  "pattern": ["django-signal", "async-enqueue", "sync-leak"],
  "contract_gap": {
    "level": "wired",
    "criterion": "C4",
    "should_have_been": "must_contain_symbol: send_notification_task.delay AND must_not_contain_symbol: PostmarkAdapter().send in signals.py"
  }
}
```

The contract patch adds a negative call-site constraint. The task re-queues. Fresh subagent sees the stricter wiring spec, uses `.delay()`, passes.

## Critical Issues Surfaced by Deep Discovery

1. **Email rendering is not fully machine-verifiable.** Pixel-diff probes catch catastrophic layout breakage but miss subjective quality (ugly spacing, wrong font fallback). The contract must acknowledge this and defer subjective quality to Court Pass 2 with a human-readable `request-clarification` path on first render.
2. **Postmark is a live external service.** Test mocks cover contract; they cannot cover Postmark's actual bounce classification, rate limiting, or template variable escaping. Anvil needs a staging-mode Invariant: the final `/ship` step hits a Postmark sandbox with a real send to a catch-all address, not only the mock.
3. **The regression invariant is expensive.** Running the full test suite on every Wave verify slows iteration. The plan must mark C5's probe as a wave-level rather than task-level check, running once per wave completion rather than once per task.
4. **Preference UI scope is underspecified.** The contract says "per event type" but not "settings page URL, required fields, success feedback." Contracting must either add a UI criterion or explicitly defer it to a follow-up contract.
5. **Digest correctness across timezones.** "Monday" in the user's timezone or server's? Contract does not say. Ledger has no prior pattern. Add a C6 with timezone-explicit Substantive clause.
6. **Unsubscribe token forgery.** Unsubscribe links need HMAC-signed tokens; guessable tokens let anyone unsubscribe anyone. The contract's `unsubscribe_link_required` Invariant is necessary but insufficient.
7. **Existing signals collision.** If the app already has post_save receivers on Task, ordering matters. Plan must include a signal inventory step before T5.
8. **Template internationalization.** If the app is i18n, templates need `{% trans %}` tags; pixel-diff baselines must exist per-locale or the probe must be locale-aware.
9. **Celery may not exist yet.** The contract assumes Celery infrastructure. If the app has no broker, T4 implicitly adds one - a significant architectural change hidden behind a task. This should be an explicit pre-wave criterion.
10. **The Devil's Advocate is underused here.** Mocked Postmark tests that pass are exactly the "quiet output" pattern. Pass 1 must flag mock-only functional probes as suspicious and trigger Devil's Advocate.

## Strengths Confirmed

1. **C5 as machine-checked regression invariant** is precisely the answer to "don't disrupt." Not "please be careful" but `pytest -k 'not notifications' exit 0` on every task.
2. **Four-level verification scales to brownfield.** Wired catches the silent-orphan signal handler; Substantive catches the stub adapter; Functional catches the sync-leak.
3. **Ledger lessons become contract clauses.** Prior Outlook, webhook, and bounce lessons shaped the new contract automatically - no human reminder needed.
4. **Court Pass 2 catches drive-by refactors.** The `Task.assignee` rename would otherwise hide behind green tests.
5. **Fresh-subagent-per-task contains context pollution** in a feature that touches many modules. No agent carries T3's template decisions into T7's UI work.
6. **Template-render probe is a novel Verify extension** that the grammar supports without new skills - it is a new probe runner, not a new verb.
7. **Whole-branch Court before ship** catches the cross-task composition failure common in cross-cutting features (e.g., a preference check skipped in the digest path but enforced elsewhere).
8. **Counter-examples are injected as contract text**, meaning the implementer reads them on every execute; the agent does not need to "remember."
9. **Reset-writes-lesson forbids silent churn.** Each failure above produced a durable artefact.
10. **`pre-tool-use` hard-blocks POSTMARK_TOKEN commits** via `no_secret_patterns`, defeating credential leak before it reaches the diff.

## Design Refinements Proposed

1. **New Invariant type: `regression_suite`.** First-class schema entry for "run this probe on every verify; treat as cross-cutting." Avoids ad hoc criterion abuse.
2. **New Verify probe: `template_visual`.** Declared with client matrix, baseline path, pixel-diff threshold. Runs in a containerized render environment.
3. **New Ledger pattern cluster: `email-integration`.** Bundles the six recurring email lessons (template rendering, webhook signature, bounce handling, token forgery, timezone, i18n). A new email contract pulls the whole cluster at once.
4. **New contract frontmatter slot: `assumed_infrastructure`.** Declares Celery, Postmark account, broker. `anvil audit` verifies before planning begins.
5. **Devil's Advocate auto-trigger on mock-only probes.** When a Functional probe's evidence is entirely from mocked I/O, Pass 1 attaches a suspicious tag by default.

## Bottom Line

Anvil handles email notifications in an existing Django app without special-casing "brownfield" because the contract expresses non-disruption as a regression Invariant, and the four-level verification catches the three pathologies this scenario invites (stub adapter, orphan signal, drive-by refactor). The one surface Anvil cannot fully machine-verify is email aesthetic quality across clients; the design honestly defers this to Court Pass 2 and template pixel-diff probes with human-reviewed baselines. The Ledger's prior email lessons ship as contract clauses, not reminders, so the implementer sees Outlook and bounce constraints in the spec on first read. The honest residue: infrastructure assumptions (Celery, Postmark account, i18n) must be surfaced in a new `assumed_infrastructure` slot, and mock-only functional probes should automatically trigger Devil's Advocate. With those two refinements, Anvil's loop converts the hardest kind of feature - cross-cutting, external, presentation-sensitive - into the same nine-phase loop as everything else.
