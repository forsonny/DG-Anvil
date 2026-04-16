# 09 - What It Replaces

Anvil retires the class. Every strong idea from the predecessor plugins is preserved somewhere in Anvil; every weak idea is dropped. This page is the full crossing-off list.

## Capabilities matrix

Columns are six predecessor systems. Rows are capabilities. A check means the predecessor had the capability in some form. The `Anvil` column names the Anvil component that owns the capability in the unified design.

| Capability | A | B | C | D | E | F | Anvil |
|---|:-:|:-:|:-:|:-:|:-:|:-:|---|
| Anti-rationalization tables | X | X |   | X |   |   | Baked into every skill's six-section format |
| Hard gates over prose |   | X |   | X |   |   | `pre-tool-use`, `stop`, Verify, Court |
| Analysis vs. action separation |   |   |   |   | X |   | Verify (analysis) and Court (analysis) never mutate; only `executing` mutates |
| Fresh-subagent-per-task | X |   | X |   |   |   | Core primitive; orchestrator never holds implementer context |
| Two-stage review (spec then quality) | X |   |   |   |   |   | Court Pass 1 / Pass 2 |
| File-based state |   |   | X |   | X |   | `anvil/contract.yml`, `anvil/plan.yml`, `anvil/trace.jsonl` |
| Atomic locks on state |   |   | X |   |   |   | Single-writer orchestrator; no concurrent mutation |
| Wave-based parallelism via DAG |   |   | X |   |   |   | Plan is always a DAG; waves are topologically sorted |
| Worktree isolation | X |   | X |   |   |   | Per-task worktree mandatory |
| 4-level verification |   |   | X |   |   |   | Exists / Substantive / Wired / Functional - contract grammar |
| 6-section skill format |   | X |   |   |   |   | Canonical for all seven skills |
| TDD-for-skills | X |   |   |   |   |   | `authoring-skills` meta-skill enforces |
| Counter-exemplar conditioning |   |   |   |   |   | X | Ledger-injected Counter-examples in every contract |
| External verification as loop closer |   |   |   |   |   | X | Verify + Court |
| Reset > patch on failure |   |   |   |   |   |   | Master rule; patch-in-place forbidden |
| Role separation (Coord/Lead/Scout/Build/Review) |   |   |   |   |   |   | Collapsed: orchestrator + executing + Court. No persona library |
| Quality gates at every handoff |   |   | X |   | X |   | Verify and Court at every task; replay at ship |
| Progressive disclosure | X | X | X | X |   | X | Skills under 100 lines; references loaded on demand |
| Convergence loops with iteration cap |   |   | X |   | X |   | Loop cap per task; escalate on reach |
| Two-step plan-shell lifecycle |   |   |   |   | X |   | Plan tasks with `pattern_survey_at_dispatch` flag |
| Knowledge compounding |   |   |   |   | X |   | The Ledger (stronger form than `/self-improve`) |
| User supremacy in instruction order | X |   |   |   |   |   | User instructions > Anvil skills > default system |
| Foundational defeater clause | X |   |   |   |   |   | "Violating the letter is violating the spirit" preserved |
| Evidence-over-claim verification | X |   | X |   |   | X | Entire Verify layer |
| Polyglot bootstrap hook (bash/CMD) | X |   |   |   |   |   | `hooks/run-hook.cmd` pattern |
| Standard interfaces (git, PR, FS) |   |   |   |   | X |   | Kept; no custom bus |
| AskUserQuestion gates (bounded-autonomy) |   |   | X |   | X |   | Refused. Contract one-shot confirm; escalation otherwise |
| Many overlapping light-paths |   |   | X |   |   |   | Refused. One loop |
| Persona catalogue (code-reviewer, security-auditor, etc.) |   | X |   |   |   |   | Refused. Court parameterized by contract check type |
| Skill proliferation (21 - 73 skills) |   | X | X |   | X |   | Refused. Seven skills, policy-capped |
| First-option auto-select in gates |   |   | X |   |   |   | Refused. Gates never silently pick |
| Advisory-only hooks |   |   | X |   |   |   | Refused. Hooks block or emit; never advisory |
| Pattern-only stub detection |   |   | X |   |   |   | Replaced by behavioural Substantive probe |
| Observability layer |   |   |   |   |   |   | New. `trace.jsonl` + `anvil metrics` + calibration |
| Theatre-drift detector |   |   |   |   |   |   | New. Derived index from trace + Devil's Advocate |
| Pattern-indexed lesson store |   |   |   |   |   |   | New. The Ledger |
| Whole-branch final Court |   |   |   |   |   |   | New. Mandatory before `/ship` |
| Explicit failure taxonomy cross-ref |   |   |   |   |   |   | New. Page 10 |

Legend: A = superpowers, B = agent-skills, C = GSD, D = agent-coding-framework, E = turbo, F = karpathy-guidelines.

## What Anvil preserves by absorption

These patterns are not drawn out of a single predecessor - they recur across several, and Anvil keeps them unified:

- **Fresh-subagent-per-atomic-task** (superpowers, GSD). Core to the loop.
- **Evidence-over-claim** (superpowers, GSD, agent-coding-framework). Every gate produces evidence; no gate trusts narration.
- **Progressive disclosure** (all of them). Skills are short; references load on demand.
- **Counter-example-driven conditioning** (karpathy EXAMPLES.md, agent-skills Rationalizations). The Ledger is the generalized and persisted form.
- **Hard-gated linear pipeline** (superpowers, agent-skills). One loop, not a branching tree of modes.
- **File-based state as shared memory** (GSD, turbo). `./anvil/` is the whole surface.

## What Anvil rejects, with reason

- **Bounded autonomy via AskUserQuestion.** (turbo, GSD) The plugin is hands-off; `AskUserQuestion` gates turn every ambiguity into a human checkpoint, inverting the design goal.
- **Persona libraries.** (agent-skills) Personas are prose stances; the Court is a parameterized role. One primitive wins.
- **21, 70, or 73 skills.** (agent-skills, turbo, GSD) Discoverability collapses above a small number. Anvil pays the expressiveness tax by forcing failures into contract/verify/ledger rows rather than into new skills.
- **`/quick`, `/fast`, `/do` light-paths.** (GSD) Carve-outs for "small" work are the soft place where discipline leaks. One loop.
- **Advisory-only hooks.** (GSD) A hook that cannot enforce is a comment. Anvil's hooks block or emit.
- **First-option auto-select.** (GSD) A silent pick defeats the whole point of a gate.
- **Pattern-based stub detectors.** (GSD) Semantic emptiness is not grep-matchable.
- **Single-context skill authoring.** (all) Anvil's `authoring-skills` meta-skill requires a subagent pressure test before any skill change is merged.
- **No observability.** (all) Not a choice - the load-bearing addition.

## One-paragraph migration statement

A team on any predecessor moves to Anvil by deleting that predecessor's plugin, installing Anvil, running `/start <their first real task>`, and letting the Ledger accrue. There is no bridge layer, no compatibility shim, no gradual adoption path. The replacement is clean because the replacement is narrower than any individual predecessor and more capable in the precise places that matter.
