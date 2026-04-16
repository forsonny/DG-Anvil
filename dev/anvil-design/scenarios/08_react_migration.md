# Scenario 08: Framework Migration - React 17 to 19

## User Intent

"Upgrade our React app from 17 to 19. ~180 components. We use React Router 5, Redux Toolkit, MUI 4. Tests in RTL + Jest. Need to handle: Suspense changes, concurrent features, strict-mode compatibility, deprecated lifecycles, React Router v6 migration, MUI v5 migration. Don't break anything. Don't ship it in pieces - we need a clean migration PR."

## Context

The canonical long-tail task. Three simultaneous major-version bumps (React 17->19, Router 5->6, MUI 4->5) entangled at the import boundary. ~180 components means ~540+ edit sites at minimum. Deprecated lifecycles (`componentWillMount`, `componentWillReceiveProps`, `componentWillUpdate`) must be rewritten per-component. Router v6's elimination of `useHistory` and switch to `Routes`/`element` prop is a mechanical but unforgiving rewrite. MUI v5's switch from JSS to emotion breaks every `withStyles`/`makeStyles` call site.

A partial migration is worthless: the app cannot run with React 19 and MUI 4 simultaneously. The deliverable is one merge-or-nothing PR.

## The Load-Bearing Question

Can Anvil's atomic-task DAG handle 50+ mechanical tasks where (a) task inter-dependencies are pathological (React bump forces Router + MUI bump simultaneously), (b) partial completion is useless, and (c) mid-run Ledger accumulation is the primary convergence engine because failure patterns repeat hundreds of times?

## Walk-Through: Anvil Handles This

### 1. Contract

The `contracting` skill queries the Ledger on the intent shape "framework major migration" and produces a contract that encodes deprecation as a first-class signal, not a warning:

```yaml
anvil_contract_version: 1
goal: "Upgrade React 17 to 19, Router 5 to 6, MUI 4 to 5. Zero deprecation warnings. All tests green. All routes resolve. Visual regression within threshold."
source_intent: "react 17 to 19 migration with router and mui"
ledger_hits:
  - pattern: ["framework-migration", "react", "major-version"]
    lessons: ["2026-03-02-018", "2026-02-14-007"]
  - pattern: ["codemod", "partial-applicability"]
    lessons: ["2026-01-22-031"]

criteria:
  - id: C1
    statement: "package.json pins react@^19, react-dom@^19, react-router-dom@^6, @mui/material@^5"
    exists: { file: "package.json", keys: ["dependencies.react", "dependencies.react-dom", "dependencies.react-router-dom", "dependencies.@mui/material"] }
    substantive: { must_match: { "react": "^19", "react-router-dom": "^6", "@mui/material": "^5" } }
    wired: { lockfile_consistent: "package-lock.json" }
    functional: { probe: { runner: "npm", args: ["ci"], exit_code: 0 } }

  - id: C2
    statement: "Zero React deprecation warnings in CI stderr"
    exists: { script: "ci\\check-deprecations.sh" }
    substantive: { must_implement: ["greps jest stderr for 'Warning:' and 'deprecated'", "exit 1 if any found"] }
    wired: { call_site: { file: ".github\\workflows\\ci.yml", must_contain: "check-deprecations" } }
    functional:
      probe:
        runner: "bash"
        args: ["ci\\check-deprecations.sh"]
        stderr_must_not_contain: ["componentWillMount", "componentWillReceiveProps", "findDOMNode", "ReactDOM.render", "defaultProps on function components", "UNSAFE_"]
        exit_code: 0

  - id: C3
    statement: "All 180 component test files pass"
    functional: { probe: { runner: "jest", args: ["--ci", "--silent"], exit_code: 0 } }

  - id: C4
    statement: "All routes from route manifest resolve under v6"
    exists: { file: "src\\routes\\manifest.ts" }
    functional: { probe: { runner: "node", args: ["scripts\\verify-routes.js"], exit_code: 0 } }

  - id: C5
    statement: "Visual regression under 0.5 percent per-route"
    functional: { probe: { runner: "playwright", args: ["test", "--reporter=json"], must_satisfy: "max_diff_pct < 0.5" } }

invariants:
  no_new_dependencies_except: ["@mui/material@^5", "@emotion/react", "@emotion/styled", "react-router-dom@^6"]
  public_api_unchanged: ["src\\index.tsx::App"]
  banned_symbols:
    - "withStyles"
    - "makeStyles"
    - "useHistory"
    - "Switch as RouterSwitch"
    - "ReactDOM.render"
    - "componentWillMount"
    - "UNSAFE_componentWillReceiveProps"

counter_examples:
  - "2026-03-02-018: codemod silently skipped files with non-default export; 14 components missed"
  - "2026-02-14-007: MUI v5 FormControl prop drops silently; visual diff was the only signal"
```

The `banned_symbols` invariant is critical. Every deprecated API becomes a regex the Verify layer grep-checks on every wave. Zero-warnings becomes the actual gate, not a hope.

### 2. Plan

The `planning` skill produces a wave-ordered DAG of ~55 tasks. Each task cites contract criteria.

```yaml
waves:
  - id: W0
    tasks:
      - T1: "npm install react@19 react-dom@19 react-router-dom@6 @mui/material@5 @emotion/react @emotion/styled"
        cites: [C1]
      - T2: "Update package.json pins; run npm ci; ensure lockfile consistent"
        cites: [C1]

  - id: W1
    parallel_tasks:
      - T3: "Run react-codemods/update-react-imports across src\\"
        cites: [C2]
      - T4: "Run react-router-codemods/v6-migration across src\\"
        cites: [C4]
      - T5: "Run mui-codemods/v4-to-v5 across src\\"
        cites: [C2]
      - T6: "Replace ReactDOM.render with createRoot in src\\index.tsx"
        cites: [C1, C2]

  - id: W2
    parallel_tasks:
      - T7..T57: "Per-component manual-fix tasks"
        pattern: "one task per component file that still has a banned_symbol after W1 codemods"
        cites: [C2, C3]

  - id: W3
    tasks:
      - T58: "Regenerate route manifest and verify every route resolves"
      - T59: "Run full Jest suite with strict-mode enabled"
      - T60: "Run Playwright visual regression"

  - id: W4_ship
    tasks:
      - T61: "Contract replay; whole-branch Court; PR open"
```

Wave 2 is the per-component wave. Tasks are auto-generated from the output of wave 1: after codemods run, a probe greps for remaining banned_symbols, and every file with a hit becomes a task. No guesswork; the enumeration is mechanical.

### 3. Execute and Verify

For each wave-2 task, a fresh subagent is dispatched in an isolated worktree. Task T14 ("fix src\components\UserProfile.tsx: useHistory -> useNavigate") runs.

Verify runs the four levels:

- **Exists**: `src\components\UserProfile.tsx` still present; new symbol `useNavigate` imported from `react-router-dom`.
- **Substantive**: imports changed; call sites replaced; coverage delta on the file greater than zero after re-running its test.
- **Wired**: file is still imported from its original consumers (verified by call-graph walk from `src\App.tsx`).
- **Functional**: `jest src\components\__tests__\UserProfile.test.tsx` exits 0 AND stderr contains no warning matching `banned_symbols` regex.

The stderr-empty check is the migration-specific move. Jest happily passes tests while React prints deprecation warnings. Anvil's contract makes those warnings a hard fail.

### 4. Judge

The Court, fresh context, sees only contract + diff + verify output.

**Pass 1 (spec):** confirms every criterion's evidence. For T14: does the diff remove `useHistory`? Does it add `useNavigate`? Does the test output show zero deprecation warnings in stderr? Does the diff touch only `UserProfile.tsx` plus its test?

**Pass 2 (quality):** would I merge this?

- Scope: diff touches only the named file and its test. No drive-by formatting.
- Consistency: the rewrite pattern for `useHistory -> useNavigate` matches the pattern the codemod already used in T3. If a sibling task solved the same pattern differently, the Court flags inconsistency.
- Orphans: no new imports without consumers.
- Behavior preservation: the previous `history.push('/foo')` is now `navigate('/foo')`, not `navigate('/foo', { replace: true })`. Replace-semantics is a different API; if the diff chose `replace: true` without justification, Court flags drift from "modernized" to "behavior-changed."

### 5. Ledger Interaction

The migration's magic is here. Consider the actual sequence:

- **T3 codemod** runs, leaves 47 files with remaining `useHistory` references the codemod could not auto-fix (closures, conditional imports, renamed imports).
- **T14** is the first manual-fix task. Subagent fixes it correctly. Passes.
- **T15** (src\components\OrderHistory.tsx) fails: subagent writes `const history = useNavigate(); history.push('/orders')` - treating `useNavigate` as if it returned a history-like object. Verify catches the `.push` call on the navigate function via runtime test failure.
- `resetting` diagnoses: **contract gap.** Substantive clause for "useHistory -> useNavigate migration" did not specify calling conventions. Writes Ledger entry:

```json
{
  "id": "2026-04-14-031",
  "pattern": ["react-router-v6", "useNavigate", "calling-convention", "same-run"],
  "intent_shape": "replace useHistory().push(x) with useNavigate()",
  "contract_gap": {
    "level": "substantive",
    "was": "replace useHistory with useNavigate",
    "should_have_been": "useNavigate returns a function. Call it directly: navigate(to). Do NOT call .push on the return value."
  },
  "remediation": {
    "counter_example_text": "useNavigate returns a bare function, not a history object. navigate(to) replaces history.push(to). No .push on the return value.",
    "same_run_priority": true
  }
}
```

- The `same_run_priority: true` flag is new. It tells the contracting layer: inject this lesson into the remaining wave-2 tasks' inputs immediately, not just on the next `/start`.
- Tasks T16 through T57 each get the counter-example injected. When T22 runs, its subagent reads the contract with the new clause in `substantive.must_implement`. It doesn't repeat the mistake.

This is the Ledger's strongest use case. The same repo, same day, same pattern, dozens of applications. Mid-run accumulation turns a 50-task reset-storm into a 2-3 reset convergence.

## A Realistic Failure and Reset

Task T34: migrate `src\components\SettingsDialog.tsx`. This file uses MUI v4's `FormControl` with a `margin="dense"` prop that in v5 was moved to `size="small"` with different semantics. The codemod (T5) did not handle this edge case.

Subagent runs. Applies what it thinks is the right transformation. Jest passes. Visual regression passes its 0.5 percent threshold because the dialog is small. Substantive clause green. Wired green. Functional green.

Court Pass 1 green. Pass 2: a Devil's Advocate subagent runs (dispatched because stderr contained a single `Warning:` line about `margin` prop that didn't match the banned_symbols regex but did show the word `Warning`). Devil's Advocate finds it: "MUI v5 dropped `margin='dense'`; this component now has slightly different spacing; the stderr warning confirms prop was not consumed."

Pass 2 comes back `request-clarification`. Escalated.

Human decides: amend contract. Add `FormControl margin prop -> size prop with fontSize="small"` to the migration-specific substantive clauses. Resume.

This is correct Anvil behavior: the failure wasn't "the agent was bad," it was "the contract didn't know about this MUI-specific silent drop." The contract gets stricter; the loop resumes; the Ledger now has this lesson forever.

## Critical Issues Surfaced by Deep Discovery

1. **Wave-2 task enumeration depends on codemod quality.** If the codemod in W1 leaves inconsistent remnants, the task generator over-fires. Mitigation: the contract must include `banned_symbols` regex specific enough to miss nothing and precise enough to avoid false positives.

2. **Cross-task invariant violations are common in migrations.** Two tasks each adding a valid `@emotion/styled` import can accidentally combine into a bundle-size regression. The whole-branch Court catches this, but only at the end - expensive to unwind.

3. **Visual regression thresholds are a judgment call the Court cannot make.** 0.5 percent is a guess. Some components legitimately shift 2 percent under MUI v5 spacing changes; others shifting 0.3 percent indicate a real bug. Anvil needs a per-component threshold table, not a global one.

4. **Deprecation warnings are noisy across dependencies.** Not all warnings come from user code. The check-deprecations script must whitelist known-safe warnings from pinned transitive dependencies, and that whitelist is itself a maintenance burden.

5. **Ledger pattern overlap with prior migrations is partial.** A React 16->17 lesson does not apply cleanly to 17->19. The `created` field + pattern specificity partially handle this, but the contracting skill's relevance filter is the weak link.

6. **Same-run-lesson-priority is not in the base design.** The current Ledger is queried at contract time only. For migrations, mid-run injection is the convergence mechanism. Without it, every wave-2 task re-learns the same lesson from scratch.

7. **Rollback semantics are underspecified.** If task T48 fails irrecoverably after 47 passes, Anvil's loop-cap escalates that task but does not automatically roll back the 47. The orchestrator holds no concept of "migration atomicity at PR boundary."

8. **Codemod artefacts confuse the Substantive probe.** A codemod-produced diff is technically "substantive" (it changed lines) but behaviorally identical. The probe needs to distinguish "real change" from "syntactic shuffle."

9. **Router v6 behavior changes are not all mechanical.** `Switch` -> `Routes` is mechanical. But `<Route path="/foo">` with nested children has fundamentally different semantics for matching. Some components will require real design decisions, not rewrites.

10. **MUI v5 emotion runtime adds bundle size and SSR complications.** Not visible in any of the contract's probes. Only caught if the contract includes a bundle-size criterion.

## Strengths Confirmed

1. **Wave-based DAG per-component is natural.** Migrations are embarrassingly parallel within a wave. Anvil's default plan shape is exactly this.

2. **Ledger for mid-migration reuse is extraordinary** (once same-run-priority is added). Migration is the highest-multiplier context for the Ledger: same patterns, same day, dozens of applications.

3. **All-or-nothing ship forces real completion.** The `/ship` gate with full contract replay + whole-branch Court + final human merge means no one accidentally ships 47 out of 55 tasks.

4. **Deprecation warnings as criteria (not warnings) is the right shape.** Most tooling treats them as informational; Anvil's contract makes them hard gates.

5. **Court Pass 2 "preserved behavior vs modernized" is exactly the migration judgment.** The distinction is the entire migration question; baking it into the reviewer's mandate is correct.

6. **Fresh subagent per task prevents cross-component contamination.**

7. **Codemods and manual-fix waves compose cleanly.** The DAG shape naturally expresses "run the automated tool, then fan out one task per leftover."

8. **Substantive + Wired probes catch codemod silent-skips.** A codemod that misses a file leaves banned_symbols in it; the substantive probe trips; the task enters wave 2.

9. **Invariant `banned_symbols` is a killer feature here.** One list, checked everywhere, no escapes.

10. **Escalation on design decisions, not on mechanical fixes, is correct triage.**

## Design Refinements Proposed

1. **Same-run-lesson-priority flag.** Add `same_run_priority: boolean` to lesson schema. When set, `resetting` skill updates the in-memory contract for all queued tasks in the current run, not only the Ledger for future runs. Enforces mid-run convergence.

2. **Migration contract template.** A canonical `contracting` skill sub-template for "framework-major-migration" intent shape. Pre-populates: `banned_symbols` invariant, `deprecation-warning-probe` functional criterion, `visual-regression-threshold` per-route table, `rollback-atomicity` ship criterion.

3. **Batch-abort mechanism.** `/abort --preserve-waves W0,W1` discards wave 2+ state but keeps completed upstream waves' artefacts on a branch. Allows human to inspect partial state, amend the contract, and `/continue` without redoing infrastructure waves.

4. **Mandatory deprecation-warning probe.** Any migration-shaped contract MUST include a `stderr_must_not_contain` clause. `contracting` skill refuses to save a migration contract without it.

5. **Per-component visual threshold table.** Contract criterion `visual_regression` accepts a map of `component_glob -> max_diff_pct` instead of a global number.

6. **Codemod artefact tag.** Diffs produced by codemods carry a `source: codemod` tag; the Substantive probe relaxes coverage-delta requirements for tagged diffs but tightens behavior-preservation requirements.

7. **Whole-branch Court mid-migration.** For migrations over 40 tasks, insert a mid-run whole-branch Court between wave 2 and wave 3. Catches cross-task drift earlier than ship-time.

## Bottom Line

Anvil is structurally well-matched to framework migrations. The wave-based DAG, the per-task fresh context, the banned-symbols invariant, and the mandate that deprecation warnings are gates (not hints) cover the mechanical 80 percent of this work cleanly. The Ledger, with a same-run-priority extension, turns a 50-task migration into a 2-3 reset convergence, which is the honest difference between "we tried an agent migration" and "we shipped an agent migration."

The 20 percent that remains is genuinely human: behavior-preserving-vs-modernizing judgments on API changes that have real semantic deltas (router nested routes, MUI margin semantics), visual regression thresholds that require taste, and rollback atomicity at the PR boundary. Anvil routes these to escalation correctly rather than faking through them, which is the design virtue, but an operator running this migration should expect 10-15 human touchpoints, not 2. For this task shape, the two-touchpoint default is wrong and the contract-amendment-on-escalation flow will be the daily driver. The plugin is fit for purpose; the expectation of autonomy needs calibration.
