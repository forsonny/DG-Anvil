# 08 - Observability and Calibration

The predecessor plugins share one blind spot: **they do not measure themselves.** Anvil is the opposite. Every transition writes a line to `trace.jsonl`; every metric is derivable from the trace; every agent's confidence is calibrated against its outcome.

## The trace

Storage: `./anvil/trace.jsonl` per repo. One JSON object per event, newline-delimited.

Events are emitted by:

- The `post-tool-use` hook (every tool call by any subagent).
- The orchestrator, at every phase transition (contract save, plan save, dispatch, verify start, verify end, judge start, judge end, mark-done, reset, escalate, ship).
- Subagents themselves, via a structured-output protocol (`ANVIL_EVENT {json}` markers in stdout that the orchestrator parses).

### Event shape

```json
{
  "ts": "2026-04-14T19:22:11.493Z",
  "run_id": "r-7f2a",
  "task": "T3",
  "phase": "verify",
  "level": "substantive",
  "agent_id": "a-b3",
  "tool": "bash",
  "tool_input_hash": "sha256:9e12...",
  "outcome": "fail",
  "evidence_ref": "output.1892",
  "duration_ms": 4821,
  "tokens_in": 18432,
  "tokens_out": 2104,
  "cost_usd": 0.38,
  "model": "claude-opus-4-6",
  "confidence": 0.74,
  "meta": {
    "note": "probe exit 1"
  }
}
```

Events are **never** narrative. Narrative goes in the worktree; the trace is a structured record.

## The metrics catalogue

`anvil metrics` reads the trace and the Ledger and emits:

| Metric | Definition | Actionable signal |
|---|---|---|
| **reset rate** | resets / (resets + passes), per task class | Rising -> contracts getting worse, Ledger getting stale, or model regression |
| **time to green** | ts(mark-done) - ts(dispatch), median per task class | Rising -> either contracts more ambitious or verifier slower |
| **contract pass rate** | passes at first try / total tasks | Falling -> Ledger injection not closing the loop |
| **lesson hit rate** | lessons injected / contracts | How much the Ledger is doing |
| **lesson effect size** | prevented_count / hit_count, per lesson | Which lessons are earning their keep |
| **judge reject rate** | Court fails / total Court runs | Falling -> sycophancy suspected, check calibration below |
| **judge suspicious rate** | Court `suspicious` tags / total | Rising -> Verify is leaking; probes are weak |
| **escalation rate** | escalations / runs | Rising -> loop cap misconfigured or architectural problems leaking through |
| **cost per shipped PR** | sum(cost_usd) from /start to merge, median | For economic sanity; not a scoping axis |
| **theatre drift index** | see below | The single most important derived number |

## The theatre-drift index

**Theatre drift** is the condition where every phase reports green while the product does not work. It is the failure mode that ate the predecessor plugins. Anvil detects it by comparing three signals per task:

1. Verify reported pass.
2. Court Pass 1 reported pass with no `suspicious` findings.
3. The Devil's Advocate output was non-empty.

The theatre-drift index is the fraction of `mark-done` transitions where signal 3 was non-empty despite signals 1 and 2 being green. A healthy system sits below 5 percent. A theatre-drifting system climbs above 15 percent, and the metrics surface flags it.

When the theatre-drift index exceeds threshold, `anvil metrics` returns a non-zero exit code and a structured report naming the tasks that triggered. This is the single circuit that prevents Anvil from lying to itself.

## Calibration

Every subagent event carries a `confidence` field - the agent's self-reported certainty that its output is correct. The calibration report compares per-agent confidence distributions against outcome distributions. Two tables:

### Agent calibration table

| Agent class | n | Mean confidence | Pass rate | Calibration error |
|---|---|---|---|---|
| executing-sonnet | 2431 | 0.81 | 0.72 | +0.09 overconfident |
| executing-opus | 891 | 0.86 | 0.88 | -0.02 well-calibrated |
| verifying-opus | 2431 | 0.93 | 0.91 | +0.02 well-calibrated |
| judging-opus | 2431 | 0.77 | 0.79 | -0.02 well-calibrated |

A persistently overconfident agent class is a signal to either upgrade the model, narrow the contract, or add a stricter Substantive probe.

### Claim-versus-evidence table

| Task | Agent claim | Evidence outcome | Gap |
|---|---|---|---|
| T3 | "implemented token-bucket with 5/30 window" | test_6th_request_returns_429 FAIL | claim ahead of evidence |
| T7 | "all tests passing" | 3 skipped, 1 error captured in stderr | claim sees only exit code |

This table is the sycophancy detector. It is emitted every run and saved to `./anvil/calibration.jsonl`. Over time it is the truest measure of agent quality.

## Hook-layer capture

The `post-tool-use` hook writes an event for every tool call. This is unconditional and cannot be opted out of. Hooks do not trust agent cooperation because capture must survive hostile behaviour (agents that rationalize skipping).

The `stop` hook runs a final check: if any criterion in the active contract is not green, the stop is blocked and a lesson is written. A session that ends with a failing contract leaves a trace; it cannot leave silently.

## The self-improvement loop

`anvil metrics --since <date>` produces a report. The report is plain enough that a monthly human read-through catches drift the plugin cannot flag itself. In this sense Anvil's observability is also its own feedback loop:

- If reset rate is rising, the Ledger is stale -> audit lessons.
- If judge reject rate is falling, sycophancy suspected -> run the calibration report.
- If theatre drift exceeds threshold, Devil's Advocate is earning its keep -> tighten Substantive probes.

The plugin does not auto-tune itself. But every variable worth tuning is visible.

## What is not captured

Deliberately:

- No input prompts from the user. The trace is a record of agent action, not of human thinking.
- No proprietary code content. The trace cites by path and line range; the content lives in the diff and the worktree, not in the trace.
- No Ledger content. Lessons are written to the Ledger; the trace records that a lesson was written, not the lesson itself.

These absences keep the trace safe to share in CI logs and to ship with support reports.

## Against the predecessors

Every plugin in the class being replaced shipped with no equivalent. GSD captured files, not calibration. Superpowers captured a PR rejection rate in its README but had no runtime report. Agent-skills and turbo had nothing. The observability layer is not a new feature; it is the one feature the class forgot to build.
