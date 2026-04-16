# 02 - Design Thesis

## The problem, stated precisely

A coding agent is a probabilistic pattern-completer. Under context pressure it will do four things reliably:

- Produce more than was asked for (speculative abstraction).
- Confidently silent-pick among ambiguous interpretations.
- Claim completion without fresh evidence.
- Rationalize shortcuts in language that mimics discipline.

Every prior plugin in this class names some subset of these pathologies and prescribes some mix of prose rules, slash commands, and hooks. None of them close the loop. The residual is reliable: a senior human must read diffs to catch what the framework missed.

## The thesis

The only thing that reliably closes the agent loop is **fresh external evidence compared against a machine-evaluable contract, adjudicated by a second agent that never saw the implementer's reasoning.** Everything else - rationalization tables, anti-skip prose, checklists, personas - is preparation, not closure. The loop has to close, or the human never leaves.

## What follows from the thesis

Four architectural consequences. Everything in Anvil is downstream of these.

### 1. Success must be machine-readable before execution starts

Ambiguity in the success criteria is the single largest driver of agent drift. If the agent can satisfy the prose and still be wrong, the prose is insufficient. Anvil's **Contract** is a YAML-plus-Markdown artifact whose every criterion names a file, a symbol, a call site, a test, and an expected output string. Four verification levels (Exists, Substantive, Wired, Functional) are grammatical slots, not optional annotations. A contract that does not parse into all four does not get saved.

### 2. Verification must be external

An agent cannot verify itself. The **Verify** step runs the contract's evidence probes in a clean process. Tool output is captured as-is. The judge reads the captured output, not the subagent's narration. "The test passed because I read the report" is not verification; it is claim-laundering.

### 3. Review must be adversarial and context-isolated

The single empirically strongest pattern in the predecessor plugins is the spec-compliance reviewer that is told "Do not trust the report." Anvil elevates this to a core primitive: the **Court** runs in a fresh subagent with exactly three inputs - the contract, the diff, and the captured test output. It cannot be sycophantically influenced by the implementer's reasoning because it does not have access to that reasoning. Two passes: spec compliance first (does the evidence match the contract?); code quality second (would I merge this?).

### 4. Failure must produce a durable artifact

Resetting a session without extracting the lesson is waste. Anvil's **Ledger** is the only state that survives across loops. Every reset writes a pattern-indexed entry: what input shape triggered the failure, what the evidence showed, and what the contract should have said. Future contracts query the Ledger at authoring time and inject matching lessons as counter-examples. The loop converges.

## Why narrowness is a feature, not a limit

Every predecessor grew by accumulation. A rationalization was observed, a skill was added, a hook was registered, a light-path was carved out. The result was discoverability collapse - seventy files whose only catalogue was the LLM's own description-field pattern-matching. Anvil refuses this growth mode. New failure modes do not produce new skills; they produce new **rows** in three tables:

- New contract criterion types.
- New Verify probes.
- New Ledger pattern indexes.

The surface stays constant. The catalogue stays small. The agent's attention budget is spent on execution, not on skill routing.

## What the predecessor plugins got right that Anvil keeps

- Context pollution is the dominant failure mode; fresh subagents per atomic task are the only mitigation that works.
- Rationalizations are enumerable; every captured rationalization should close a loophole.
- "Violating the letter of the rules is violating the spirit of the rules" - the foundational defeater that disarms spirit-versus-letter deflection.
- Progressive disclosure keeps context usable.
- Analysis skills and action skills are different species; they must not be fused.

## What the predecessor plugins got wrong that Anvil refuses

- Advisory-only hooks. In Anvil, hooks that can be ignored are not hooks; they are decoration.
- First-option auto-select in autonomous mode. A gate that silently picks the top option is not a gate.
- Pattern-based stub detection. Anvil's Verify Substantive step is behavioural, not string-matching.
- Theatre-drift untracked. Anvil's calibration layer reports the difference between claimed completion and evidenced completion, per agent, per task class.
- Skill proliferation without pruning. Anvil has seven skills and a policy that adding an eighth requires retiring one.
- Reset without lesson. Every reset writes to the Ledger; runs that cannot extract a lesson do not reset - they escalate.

## The bet

A narrow orchestrator that insists on four disciplines - Contract, Verify, Court, Ledger - outperforms a wide catalogue that covers all known failure modes in prose. The accumulated discipline is the product. The skills, commands, and hooks are the delivery mechanism.
