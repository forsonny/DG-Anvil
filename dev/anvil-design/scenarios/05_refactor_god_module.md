# Scenario 05: Refactoring - God-Module Breakup

## User Intent

Break `services\user_service.py` (2800 lines) into domain modules (auth, profile, billing, notifications, admin) without changing any externally observable behavior. 140 tests must remain green. No caller should need to change its imports or call sites in the first pass.

## Context

Refactoring is the one task category where success is defined by invariance, not by new capability. The agent is being asked to move code, not to write code. Every line that is "improved" during the move is a correctness risk. Python makes this worse: dynamic imports, monkey-patching, `hasattr` checks, implicit re-exports, and module-level side effects mean a refactor can pass the full test suite and still break production.

Anvil's verification primitives (Exists, Substantive, Wired, Functional) were designed assuming the contract describes a new behavior. Here the contract must describe the absence of behavior change, which is a fundamentally different shape.

## The Load-Bearing Question

How does Anvil prove NON-CHANGE? The four Verify levels work against positive specifications ("this symbol exists, this call happens, this test passes"). Refactoring requires proving a negative ("no observable behavior differs from baseline"). And: refactoring is the canonical scope-creep trap. The agent sees a function it thinks is ugly and rewrites it while moving it. How does Court Pass 2 keep "move" from becoming "improve"?

## Walk-Through: Anvil Handles This

### 1. Contract

The Contract is dominated by Invariants, not Criteria. Criteria are mostly structural (Wired + Substantive as identity checks against a captured baseline), and the one Functional criterion is "test suite passes unchanged with coverage delta >= 0."

Sketch:

```yaml
goal: "Decompose services\\user_service.py into domain modules without changing external behavior"
baseline_capture_phase: required
ledger_queried: true

criteria:
  - id: C1
    statement: "Symbol auth_login moved to services\\auth\\login.py with identical body"
    exists:
      file: "services\\auth\\login.py"
      symbol: "auth_login"
      signature: "(username: str, password: str, *, remember: bool = False) -> LoginResult"
    substantive:
      body_hash_matches_baseline: "services\\user_service.py::auth_login@baseline"
      ast_normalized_diff: empty
    wired:
      re_exported_from: "services\\user_service.py"
      importers_unchanged: true
    functional:
      probe: "pytest tests\\ -k auth_login"
      exit_code: 0

invariants:
  public_api_unchanged:
    - "services\\user_service.py::* (all 47 public symbols re-exportable)"
  no_new_public_exports: true
  no_signature_changes: true
  no_default_value_changes: true
  no_decorator_changes: true
  no_import_cycles: true
  test_suite_green: "pytest tests\\ (all 140)"
  coverage_delta_floor: 0
  no_behavior_deltas_in_golden_trace: true
```

Key design point: the contract has a required **baseline_capture_phase**. Before any move, the agent must produce `anvil\baseline\` containing (a) the AST-normalized body of every public and private symbol in the original file, (b) the full import graph rooted at that file, (c) a golden trace of the test suite with captured stdout/stderr/side-effect log, (d) a list of every symbol any test or consumer references by name.

### 2. Plan

The Plan is a DAG where order is driven by blast radius, not by "what looks easiest":

```
W0: capture_baseline (AST hashes, import graph, golden test trace)
W1: create compat shim (services\user_service.py becomes re-export barrel)
W2: extract admin domain (smallest, most isolated)
W3: extract notifications domain
W4: extract profile domain
W5: extract billing domain
W6: extract auth domain (largest, most entangled)
W7: verify no call site imports from domain modules directly (shim still load-bearing)
W8: deprecation notice on shim (do NOT remove yet; removal is a separate contract)
```

Every task cites the contract criterion it advances. Every task has an explicit "touches only these files" scope list. The shim stays in place through all waves; its removal is deliberately outside this contract because removing it changes caller imports, which violates "nothing callers see should break."

### 3. Execute and Verify

Per task (e.g., W4 "extract profile domain"):

- **Exists**: `services\profile\*.py` files created; each moved symbol is importable from its new location.
- **Substantive**: for each moved symbol, the AST-normalized body hash equals the baseline hash for that symbol. Whitespace, comment, and formatting differences are collapsed by the normalizer, but any token change (renamed local, changed default, added guard, "cleaned up" error message) fails this check. This is the canonical answer to "how do you prove non-change": hash the AST, not the text.
- **Wired**: `services\user_service.py` still exports the symbol via `from services.profile.foo import bar`. Every file in the importer set (computed in W0) still resolves its imports from `services.user_service` unchanged.
- **Functional**: full pytest run, 140 green, coverage delta >= 0, and the golden trace diff (captured stdout + captured side-effect log from a behavioral probe suite) is empty.

Verify also runs three refactor-specific probes:
- **import-cycle probe**: `python -c "import services.user_service"` in a subprocess under `-W error`; any circular-import warning fails the gate.
- **no-new-public-symbol probe**: diff of `dir(services.user_service)` between baseline and current; additions fail unless the contract named them.
- **dynamic-reference probe**: grep the repo for string-literal references to moved symbols (`getattr(user_service, "auth_login")`, `importlib.import_module("services.user_service")`, SQLAlchemy event listener strings, Celery task names). Any string-literal hit whose target moved without a shim entry fails.

### 4. Judge

**Pass 1 (Spec compliance)**: for each moved symbol, the Court reads the diff and confirms the body in the new file is byte-identical-post-normalization to the deleted body from the old file. It cites line ranges in both the old file (from the diff's `-` side) and the new file (from the `+` side). The golden-trace delta is read and must be empty.

**Pass 2 (Code quality, refactor-specialized)**: the Court is given a stricter prompt for refactor contracts. It explicitly rejects:

- **Rewrite-while-moving**: any body difference beyond the AST normalizer's allowed set.
- **Signature "improvement"**: added type hints, changed default values, reordered kwargs, kwarg-only promotion, added `*` marker.
- **Rename**: any change to the public or private name of a moved symbol. `_get_user_id` moving to `get_user_id` fails. Even if the caller surface appears unchanged because of a re-export alias, the name difference fails.
- **Helper deprecation**: replacing a local helper call with a stdlib equivalent ("this `_parse_bool` is now `distutils.util.strtobool`"). Out of scope.
- **Docstring "cleanup"**: the docstring is part of the body for refactor purposes. Its content must be preserved; only indentation normalization is allowed.
- **Import reordering in the origin file beyond what's required to shim**: `isort`-style tidying is out of scope.
- **Edits outside the move**: any line in the old file that was not a move-related deletion, or any line in a caller file that was edited at all, fails Pass 2 unless explicitly listed in task scope.

The Court's Pass 2 prompt for refactor contracts has one additional forcing question: "If I reverted every change in this diff except the file creations and the shim re-exports, would the behavior be the same as with the full diff applied?" If no, the diff contains something that is not a move.

### 5. Ledger interaction

At contract-authoring time, the Ledger is queried on `["refactor", "python", "module-split", "behavior-preservation"]`. Expected prior lessons that flow into this contract as Counter-examples:

- **"kwarg default silently changed"**: past incident where `timeout=30` was moved as `timeout: int = 30` and a caller depending on `timeout is None` as a sentinel broke. Remediation: contract must fail on any default-value token change, not just signature-presence.
- **"circular import via relative-to-absolute rewrite"**: past incident where during a move the agent changed `from .helpers import x` to `from services.user_service.helpers import x` and created a cycle that manifested only under a specific import order in production. Remediation: import-cycle probe under `-W error` with a cold interpreter.
- **"helper cleanup broke rare branch"**: past incident where a 4-line `_coerce_legacy_id` helper was inlined during a move because "it's only called once," but the helper had a rare `None` branch that a quarterly admin job depended on. Remediation: contract invariant `no_helper_inlining` plus Substantive AST hash on every private symbol, not just public ones.
- **"re-export shim missed a star-import consumer"**: a module doing `from services.user_service import *` lost symbols that weren't in `__all__` but were previously accessed by name. Remediation: baseline phase captures actual name-access, not declared `__all__`.

## A Realistic Failure and Reset

Wave W6, task "extract auth domain, move auth helpers." The agent moves `_get_user_id` from `user_service.py` to `auth\identity.py`, and while moving, renames it to `get_user_id` because "the leading underscore is no longer meaningful now that it's in its own module; it's the module's public API."

Verify Exists passes (the symbol is present under the new name). Substantive fails: AST hash does not match baseline because the function name node differs. The agent, seeing the reset lesson injection, retries by keeping `_get_user_id` internal and adding `get_user_id = _get_user_id` as a public alias.

Court Pass 2 still rejects. Citation: "diff introduces new public symbol `get_user_id` at `services\auth\identity.py:14`; contract invariant `no_new_public_exports: true`; the contract describes a move, not an API surface addition."

Reset. Ledger appends:

```json
{
  "pattern": ["refactor", "rename-during-move", "python"],
  "intent_shape": "break module into domains",
  "contract_gap": {
    "level": "substantive",
    "was": "body_hash_matches_baseline",
    "should_have_been": "body_hash_matches_baseline AND symbol_name_matches_baseline AND no_new_public_aliases"
  },
  "remediation.counter_example_text": "Rename != move. A refactor contract forbids any name change to a moved symbol, including adding a public alias to an internal name."
}
```

Third attempt succeeds: the agent moves `_get_user_id` unchanged, adds it to `user_service.py`'s re-export shim as `from services.auth.identity import _get_user_id`, leaves its leading underscore intact. Pass 1 green, Pass 2 green.

## Critical Issues Surfaced by Deep Discovery

1. **Baseline-capture is a missing phase in the core loop.** Anvil's standard loop assumes the contract is fully knowable before W0. Refactors need a W0 that reads current-state and freezes it as ground truth. This is a schema change to the plan DAG, not just a skill tweak.
2. **AST normalization is a correctness hazard.** Too loose and it allows real behavior changes (a renamed local shadowing a closure variable); too strict and it fails on trivia (Black reformatting). The normalizer's exact ruleset is load-bearing and needs its own contract-schema entry.
3. **Dynamic Python patterns escape static Wired verification.** `getattr`, `importlib`, SQLAlchemy string-typed relationships, Django `apps.get_model`, Celery task names, pytest plugin entry points, and `__init_subclass__` hooks all reach symbols by string. The dynamic-reference probe must be contract-configurable because each framework's discovery mechanism differs.
4. **Module-level side effects are invisible to the AST hash.** If `user_service.py` had a `_cache = LRUCache()` at module scope, splitting the module splits the cache. Every module-level assignment is a potential behavior change the AST comparison cannot catch; requires a separate "module init effects" probe.
5. **The test suite being green is insufficient evidence of non-change.** 140 tests covering 2800 lines is roughly 50 lines per test. Many behaviors are exercised incidentally, not asserted. Refactors need a behavioral probe beyond the test suite (golden-trace capture, or property-based fuzzing of public entry points).
6. **Circular imports manifest at import-order, not at call-time.** A CI that runs tests in the same order every time may never trigger a cycle that production's import order hits. The import-cycle probe must try multiple cold-start orderings.
7. **Public-API-unchanged is underspecified.** Does it mean signatures? Signatures plus docstrings? Signatures plus decorators? Signatures plus runtime metaclass effects? The contract invariant needs an explicit enumeration.
8. **Court Pass 2 has no refactor-specific prompt by default.** The generic "would I merge this" question is too permissive; a "would I merge this as a move-only refactor" question is what's needed.
9. **Re-export shims hide orphan risk.** Wired verification can pass because the shim re-exports, but if no caller ever touches the shim (all callers have been silently updated), the shim is dead weight; if any caller was missed, removal in a future contract breaks silently.
10. **Ledger pattern tags for refactors are shallow.** "refactor" alone is too broad; the controlled vocabulary needs sub-tags (module-split, symbol-rename, signature-change, inline-helper, extract-method) to prevent false-universality.

## Strengths Confirmed

1. **Fresh subagent per wave** prevents the agent from "remembering" the ugly code it saw two waves ago and trying to fix it now.
2. **Court sees only contract + diff + verify output**: ideal for refactors, where "would the reviewer merge this" is exactly the right question and rationale-blindness prevents the agent's justifications from slipping through.
3. **Contract Invariants** are a natural home for "public API unchanged" lists and for `no_new_dependencies`.
4. **Reset-writes-lesson** is especially valuable here; refactor drift patterns (rename-during-move, kwarg-default-drift) are exactly the kind of recurrent, hard-to-catch errors the Ledger is designed to compound against.
5. **Whole-branch Court before ship** catches the composition failure where each wave individually preserves behavior but their sum introduces an import cycle or an orphan.
6. **Wave ordering by blast radius** puts the hardest move (auth) last, after the easier moves have built evidence that the shim pattern works.
7. **Two human touchpoints only** is realistic; a refactor is tedious to review turn-by-turn, and the contract + final PR are exactly the right bracketing.
8. **Substantive probe is behavioral, not regex**: the natural extension to "behavior before equals behavior after" via golden trace capture is consistent with Anvil's existing philosophy.
9. **No partial credit on Verify** prevents "tests pass but imports broken" from being called success.
10. **`pre-tool-use` destructive-action blocking** prevents an agent from deleting `user_service.py` before the shim is in place.

## Design Refinements Proposed

1. **Add a `refactor` contract template** with baseline_capture_phase as a required top-level key. The template enforces the Invariant set (public_api_unchanged, no_new_public_exports, no_signature_changes, no_default_value_changes, no_decorator_changes, no_import_cycles) by default.
2. **Add a `baseline` primitive** alongside Contract, Plan, Loop, Ledger, Court. Storage: `anvil\baseline\` per contract. Lifespan: one per refactor contract. Purpose: the ground truth the Substantive probe compares against.
3. **Add Verify check type `ast_hash_matches`** and its config: allowed normalizations (whitespace, comments, import-order-within-group), forbidden normalizations (name changes, default changes, decorator changes).
4. **Add Court Pass 2 refactor-mode prompt** keyed by contract type. The "revert-and-compare" question becomes mandatory.
5. **Add Ledger pattern sub-tags** for refactor categories. Seed with the four known drift patterns (rename-during-move, kwarg-default-drift, inline-helper, circular-import-via-rewrite).
6. **Add a `module-init-effects` Verify probe** that captures module-level assignments and compares pre/post split.
7. **Add a `dynamic-reference` Verify probe** configurable per framework (Django, SQLAlchemy, Celery, pytest).
8. **Change Court's whole-branch pass** to include a "compat-shim necessity" check: every symbol in the shim must be verifiable as still imported by at least one caller (else it's dead), and no caller may import from the new domain modules directly in this contract's scope (else the shim is dead and the contract is mis-scoped).

## Bottom Line

Anvil's bones are the right shape for this scenario, but the scenario exposes that the framework implicitly assumes "contract describes new behavior." Refactoring inverts that: the contract describes the preservation of existing behavior, which requires a baseline-capture phase, AST-hash Substantive probes, a refactor-specialized Court prompt, and dynamic-reference probes that don't exist in the current design. The Court Pass 1 / Pass 2 split is especially well-suited to catching rewrite-while-moving (Pass 2's "would I merge this" becomes "would I merge this as a pure move"), and the Ledger is the right place to accumulate the canonical drift patterns (rename, default-change, inline-helper, import-cycle). Without the proposed additions, a refactor can pass all four Verify gates and both Court passes while silently breaking a Celery task string or a module-level cache. With them, Anvil becomes genuinely strong at the hardest behavior-preservation task: the one where the tests don't cover everything and the agent wants to improve things while it's in there. The honest assessment: the current Anvil design is about 70 percent of what this scenario needs; the missing 30 percent is a `baseline` primitive, a `refactor` contract template, and roughly four new Verify probes. None of them contradict the existing design; all of them fit the "new rows, not new skills" extension policy.
