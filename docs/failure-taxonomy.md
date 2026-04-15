# 10 - Anti-Patterns Defeated

Every known agent failure mode maps to the specific Anvil component that disarms it. This page is the failure taxonomy and its cross-reference. A future failure mode that does not map to this table is either a genuine novelty (write a Ledger pattern and file a contract-schema change) or a symptom of one of the listed patterns under a new name (resolve by cross-reference).

## The taxonomy

| # | Failure mode | How it manifests | Anvil component that disarms it |
|---|---|---|---|
| 1 | **Context pollution** | Long-running session drifts; earlier decisions leak into unrelated tasks; agent answers from stale assumption | Fresh subagent per task; orchestrator holds only Contract + Plan + Ledger index |
| 2 | **Sycophantic convergence** | Reviewer agrees with implementer because it sees the implementer's reasoning | The Court sees only Contract + diff + Verify output; not Plan, not rationale, not commit message |
| 3 | **Mock tautology** | Agent writes a mock and a test that both match the broken code; test passes, code is wrong | Substantive probe is behavioural; Devil's Advocate flags suspiciously quiet outputs; Court Pass 1 inspects evidence, not just pass/fail |
| 4 | **Scope creep** | Diff touches files the task did not name; drive-by refactors; speculative abstraction | Court Pass 2 rejects any file not in task scope; Contract Invariants list symbols that must not change |
| 5 | **Tool loop** | Agent runs the same command repeatedly trying variations | `post-tool-use` hook captures call hash; loop cap per task triggers escalation |
| 6 | **Spec leak** | Agent half-implements while also arguing about the spec mid-task | `contracting` runs before `planning` runs before `executing`; spec is locked at plan time; mid-task spec argument forces reset |
| 7 | **Rationalized shortcut** | Agent skips a gate under a justification that sounds legitimate | Skills carry Rationalizations tables built from verbatim captured excuses; foundational defeater "violating the letter is violating the spirit" closes spirit-vs-letter escapes |
| 8 | **Claim-without-evidence** | Agent announces completion with no artefact proving it | Verify is run by a separate process; Court reads captured output; `stop` hook replays contract |
| 9 | **Silent assumption-making** | Agent picks one interpretation among several without surfacing others | `contracting` skill forces ambiguity into explicit Criteria; one-shot confirm at start |
| 10 | **Over-production (speculative abstraction)** | New abstractions, flexibility, error handling for impossible cases | Contract's Invariants + Court Pass 2 reject unjustified new structure |
| 11 | **Drive-by refactoring** | Unrelated "improvements" to touched files | Court Pass 2 rejects; `pre-tool-use` flags changes outside task scope (soft block, surface to Court) |
| 12 | **Orphan implementation** | Function written, never called; passes Exists + Substantive; invisible unless you look | Wired probe traces call graph from contract's entry point; passes only if reachable |
| 13 | **Semantic empty stub** | Body "does nothing useful" but avoids literal `return None`, `TODO` | Substantive probe is behavioural, not regex; requires observable side effects from `must_implement` |
| 14 | **Theatre drift** | All gates green; product still broken | `anvil metrics` theatre-drift index; Devil's Advocate; whole-branch Court before ship |
| 15 | **Rubber-stamp gate** | Human checkpoint approves by reflex | Only two human touchpoints; both produce artefacts (contract, PR) that persist; trace records the stamp with confidence |
| 16 | **Context-window collapse** | Late-session turns lose earlier constraints | Fresh subagent per task; orchestrator re-reads contract on every dispatch |
| 17 | **Cross-task architectural drift** | Tasks individually fine; composition breaks invariants | Whole-branch Court pass before ship |
| 18 | **Description-field shortcut** | Model reads skill description, skips body, acts on the summary | `authoring-skills` policy: descriptions are triggers, never summaries; pressure-tested |
| 19 | **Ghost code** | Commits with no trace of which agent/task produced them | Trace event per transition; commit messages cite run_id + task id |
| 20 | **Reset-without-lesson** | Session killed; no learning persisted | `resetting` cannot emit a null lesson; null-lesson triggers escalation |
| 21 | **Stale-lesson injection** | Old lesson becomes wrong as libraries evolve | Ledger effect-size retirement; `anvil ledger audit` flags references to missing symbols |
| 22 | **Prompt injection via retrieved content** | Text loaded from a file or web page contains an instruction | `pre-tool-use` tags content boundaries; user-supremacy rule means retrieved instructions never outrank user or skill rules |
| 23 | **Credential leak** | Agent writes a secret into code or a log | `pre-tool-use` blocks on secret patterns; contract has `no_secret_patterns` invariant |
| 24 | **First-option silent pick** | Gate with options silently chooses first | Anvil's contract confirm is binary (accept / reject); no list-of-N silent-selectable gates exist in the loop |
| 25 | **Advisory-hook bypass** | Agent ignores an advisory warning | All hooks block or emit; no advisory tier exists |
| 26 | **Spec-to-plan drift** | Plan omits a spec criterion; downstream review cannot catch it | `planning` skill requires every plan task to cite contract criterion ids; plan with uncited criteria is invalid |
| 27 | **Spirit-versus-letter** | Agent argues it followed the spirit without following the letter | Foundational defeater in every skill: "Violating the letter of the rules is violating the spirit of the rules" |
| 28 | **Cost-escape rationalization** | Skipping a gate "to save tokens" | Token budget is not a scoping axis in Anvil; cost is measured but never drives gate-skipping |
| 29 | **Skill-proliferation drag** | Too many skills; discoverability collapses | Seven skills, policy-capped; new skill requires retiring one |
| 30 | **Loop-without-convergence** | Same task fails repeatedly without learning | Loop cap per task; lesson required on every reset; duplicate lesson pattern triggers escalation |

## How the table is used at runtime

- **When a subagent fails a Verify or Court step**, the `resetting` skill picks the closest row in this table to phrase the `contract_gap` in the new Ledger entry. This keeps failure descriptions in a controlled vocabulary.
- **When a new failure arrives that does not fit any row**, the `authoring-skills` meta-skill is invoked. A pressure test is constructed; either the failure is a variant of an existing row (expand the row's examples) or it is a new row (propose a schema change; merge after two independent reproductions).
- **When `anvil metrics` reports a rising rate for a particular row**, the plugin surfaces the row and the three most recent triggering traces. The human reviewer decides: tighten contracts (row 4, 10, 11), tighten probes (row 3, 13), tighten gates (row 24, 25), or retire a lesson (row 21).

## Why a taxonomy at all

The predecessor plugins named failure modes in prose scattered across Rationalizations tables, Red Flags lists, and Critical Observations sections. There was no single cross-reference that the plugin itself could query. Anvil's taxonomy is machine-readable (`docs/failure-taxonomy.md` with stable row ids), cross-referenced from skill red-flag lists, and the first thing every new contract author reads. It replaces an emergent folklore with a deliberate catalogue.
