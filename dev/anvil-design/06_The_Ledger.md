# 06 - The Ledger

The Ledger is the one component with no precedent in the class of plugins being replaced. It is the reason Anvil's loop converges instead of oscillating.

## What the Ledger is

An append-only, pattern-indexed, user-scoped store of lessons. Every reset in the loop writes one entry. Every future contract query reads.

- Storage: `~/.anvil/ledger.jsonl` (one lesson per line, JSON).
- Index: `~/.anvil/ledger.index.json` (pattern -> list of lesson ids).
- Scope: user, not repo. Lessons compound across projects because failure modes are not repo-local.
- Mutability: append-only. An entry can be marked `superseded_by: <id>` but never deleted. Bad lessons are corrected by the supersession chain.

## What a lesson is

A lesson is a JSON object with this shape:

```json
{
  "id": "2026-04-14-007",
  "created": "2026-04-14T19:22:11Z",
  "pattern": ["rate-limit", "middleware", "python", "flask"],
  "intent_shape": "add rate limiting to HTTP endpoint",
  "contract_gap": {
    "level": "substantive",
    "criterion": "C1",
    "was": "decrements bucket per request",
    "should_have_been": "decrements bucket per request with explicit window_s and max_req provided to constructor; no defaults"
  },
  "evidence": {
    "verify_output": "test_6th_request_returns_429: FAIL - received 200",
    "diagnostic": "middleware used hardcoded window=60,max=100; contract did not specify; implementer chose defaults"
  },
  "remediation": {
    "contract_patch": "substantive.must_implement[].0 = 'decrements bucket per request with window_s and max_req from constructor args'",
    "counter_example_text": "Rate-limit middleware without explicit window/threshold; implementer chose defaults that drifted from product intent."
  },
  "hit_count": 0,
  "prevented_count": 0
}
```

Every field is load-bearing:

- **pattern**: an array of tags the indexer uses. Produced by the `resetting` skill with a small controlled vocabulary (nouns the contracting skill expects to see in intents).
- **intent_shape**: a canonical form of the user prompt that triggered the failure. Used for fuzzy matching at contract time.
- **contract_gap**: the exact slot in the prior contract that was insufficient. This is the remediation target.
- **evidence**: the captured Verify or Court output that caught the failure. Not narration - tool output.
- **remediation.contract_patch**: a literal patch expression. The next contract-authoring pass applies it.
- **remediation.counter_example_text**: the sentence that will appear in the next contract's Counter-examples section.
- **hit_count**: how many times the ledger has been queried and returned this lesson.
- **prevented_count**: how many times this lesson was injected and the subsequent task passed first try. The ratio of `prevented_count` to `hit_count` is the lesson's effect size.

## How the Ledger is written

The `resetting` skill is the only writer.

1. Verify or Court fails on a task.
2. `resetting` is invoked with: the task, the contract criterion that failed, the captured evidence, and the pre-reset input.
3. `resetting` diagnoses: what about the **input** made this failure possible? Not what about the agent's output was wrong - that framing is explicitly forbidden. The question is always "what did the contract (or the plan task) fail to say?"
4. `resetting` proposes a `contract_patch` and a `counter_example_text`.
5. The Ledger appends the entry.
6. The orchestrator injects the patch into the live contract and re-queues the task.

A reset that cannot produce a lesson is not a reset; it is an escalation. The `resetting` skill is forbidden from emitting a null lesson. If the skill cannot identify an input-level gap, the loop escalates to human and the unresolved failure is tagged `architectural`.

## How the Ledger is queried

The `contracting` skill is the primary reader.

1. User enters intent.
2. `contracting` computes `intent_shape` and pattern tags.
3. Index lookup returns candidate lessons.
4. `contracting` filters for relevance (similarity on `intent_shape`, overlap on pattern tags).
5. Up to five lessons are injected into the new contract as Counter-examples.
6. Each injected lesson's `hit_count` is incremented.

`anvil ledger query <pattern>` is the read-only CLI surface for humans. `anvil metrics` reports Ledger effect size: per-pattern prevented-to-hit ratio over rolling windows.

## How the Ledger converges

For a given pattern, the first lesson is raw. The second lesson is usually more specific. By the fifth or sixth, the pattern's counter-example section in contracts tends to be precise enough that new failures on that pattern are structurally different - which is the signal to create a new pattern tag rather than another lesson under the old one.

The Ledger is not a memorizer. It is a specification-improver. The output of the loop is not "the agent got better" - it is "the contract got stricter."

## What the Ledger is not

- **Not a memory of past code.** The Ledger does not store diffs or implementations.
- **Not a prompt library.** Lessons are contract patches, not prompt templates.
- **Not a training dataset.** Nothing in the Ledger is used for weights. Everything is applied in-context as contract text.
- **Not shareable across users by default.** The Ledger is user-scoped because it contains intent phrasings that may be project-confidential. An `anvil ledger export --sanitize` command produces a sharable subset, but sharing is explicit, not default.

## Pruning and supersession

The Ledger never deletes. Two mechanisms keep it tractable:

- **Supersession.** A new lesson can mark itself `supersedes: ["<old-id>"]`. The old lesson is still stored but is not returned by queries unless `include_superseded=true`.
- **Effect-size retirement.** Lessons with `hit_count >= 20 and prevented_count / hit_count < 0.2` are marked `low_efficacy`. The contracting skill skips them by default; a query flag brings them back.

Retirement is a soft signal, not a delete. The audit trail is preserved.

## Failure modes the Ledger itself could exhibit

Two, both anticipated:

- **False-universality.** A lesson learned in one context becomes a constraint in a context where it is wrong. Mitigated by requiring every lesson to specify its `pattern` array; the contracting skill injects only on pattern overlap, not substring match.
- **Lesson drift.** The remediation in an old lesson becomes stale as libraries evolve. Mitigated by tagging every lesson with `created` and by the `anvil ledger audit` subcommand, which flags lessons whose referenced files or symbols no longer exist in the repo where the lesson was first captured.

Both failure modes are detected by the observability layer (page 08) and surfaced in `anvil metrics`, not silently tolerated.
