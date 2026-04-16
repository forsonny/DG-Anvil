# Scenario 01: Frontend Design - Polished Landing Page

## User Intent

"Build a marketing landing page for my SaaS product (project-management tool called 'Tacet'). Hero, three-feature section, pricing table (3 tiers), testimonials carousel, FAQ accordion, footer. Must feel PREMIUM - think Linear, Vercel, Stripe quality. Use Next.js + Tailwind + shadcn/ui. Match the brand tokens in tokens/brand.json."

## Context

Stack: Next.js 15 App Router, Tailwind v4, shadcn/ui primitives. Brand tokens supplied. Six sections. The user has explicitly flagged the hard part: machine-verifiable does not equal beautiful. Anvil's Contract is machine-evaluable by design; the question is whether proxies plus the Court plus the Ledger compose to something better than a "barely passing stub," and where the irreducible human eye must land.

## The Load-Bearing Question

How does Anvil verify that a frontend LOOKS GOOD, not just functions? Four-level verification (Exists, Substantive, Wired, Functional) was built for rate-limit middleware, not visual rhythm. The Court Pass 2 asks "would I merge this" but has no reference for "premium." The Ledger stores pattern counter-examples but only those a past failure wrote down. Walk through how all three combine, and be honest about where they do not.

## Walk-Through: Anvil Handles This

### 1. Contract

```yaml
---
anvil_contract_version: 1
goal: "Marketing landing page for Tacet SaaS; premium visual quality"
source_intent: "Build a marketing landing page (Tacet) - premium feel"
ledger_queried: true
ledger_hits:
  - pattern: ["landing-page", "tailwind", "premium"]
    lessons: ["2026-02-08-003", "2026-03-22-011", "2026-03-29-007"]
design_reference:
  style_anchors: ["linear.app/homepage", "vercel.com", "stripe.com/payments"]
  brand_tokens: "tokens\\brand.json"
  reference_shots:
    desktop_1440: "anvil\\refs\\tacet_home_1440.png"
    mobile_375: "anvil\\refs\\tacet_home_375.png"
---

## Criteria

- id: C1
  statement: "Hero renders with brand typographic scale, CTA pair, and eyebrow"
  exists:
    file: "src\\components\\landing\\Hero.tsx"
    symbol: "Hero"
  substantive:
    must_implement:
      - "renders h1 with tokens.typography.display.xl"
      - "renders exactly 2 CTAs: primary + secondary"
      - "renders eyebrow kicker above h1"
      - "background uses tokens.color.surface.hero only"
    must_not:
      - "uses arbitrary tailwind values (bracket syntax)"
      - "contains placeholder copy matching /lorem|ipsum|dolor/i"
      - "imports from outside design-system or shadcn/ui"
  wired:
    call_site:
      file: "src\\app\\page.tsx"
      must_contain_symbol: "Hero"
  functional:
    probes:
      - runner: "playwright"
        target: "tests\\visual\\hero.spec.ts"
        must_pass: ["hero_matches_reference_1440", "hero_matches_reference_375"]
        tolerance: { pixel_ratio: 0.02, color_dE: 3 }
      - runner: "axe"
        target: "http://localhost:3000"
        selector: "section[data-section=hero]"
        max_violations: 0
      - runner: "token-audit"
        target: "src\\components\\landing\\Hero.tsx"
        forbid_regex: "\\[(?:\\d|#)[^\\]]+\\]"
      - runner: "rhythm-audit"
        target: "src\\components\\landing\\Hero.tsx"
        spacing_scale: [0,4,8,12,16,24,32,48,64,96,128]

- id: C2
  statement: "Pricing table 3 tiers with consistent visual rhythm and scale-emphasis on recommended"
  exists: { file: "src\\components\\landing\\Pricing.tsx", symbol: "Pricing" }
  substantive:
    must_implement:
      - "exactly 3 PricingCard children"
      - "middle card has data-recommended=true and 1.04 scale transform"
      - "each card: tier name, price, 5+ feature rows, CTA"
      - "feature rows align on baseline across cards"
  wired: { call_site: { file: "src\\app\\page.tsx", must_contain_symbol: "Pricing" } }
  functional:
    probes:
      - runner: "playwright"
        target: "tests\\visual\\pricing.spec.ts"
        must_pass: ["pricing_baseline_grid", "pricing_recommended_emphasis"]
      - runner: "lighthouse"
        target: "/"
        budgets: { performance: 95, accessibility: 100, best-practices: 95 }

## Invariants

- tokens_only: true
- no_arbitrary_tailwind: true
- no_placeholder_copy: true
- brand_tokens_source: "tokens\\brand.json"
- max_bundle_delta_kb: 80
- motion_tokens_only: true
- font_sources: ["next/font"]

## Counter-examples (injected from Ledger)

- "2026-02-08-003": "Hero passed Substantive with lorem ipsum h1 copy; probe must forbid placeholder regex."
- "2026-03-22-011": "Pricing functional but tier cards had drifting baselines (feature rows not aligned); rhythm-audit added."
- "2026-03-29-007": "Generic shadcn defaults produced low-distinctiveness hero; reference screenshot diff required."
```

### 2. Plan

```
wave 1  T1 tokens-map       -> src\lib\tokens.ts from tokens\brand.json  (cites C1,C2)
        T2 layout-shell     -> src\app\layout.tsx with next/font         (cites C1)
wave 2  T3 hero             -> src\components\landing\Hero.tsx           (cites C1)
        T4 features         -> src\components\landing\Features.tsx       (cites C3)
        T5 pricing          -> src\components\landing\Pricing.tsx        (cites C2)
        T6 testimonials     -> src\components\landing\Testimonials.tsx   (cites C4)
        T7 faq              -> src\components\landing\FAQ.tsx            (cites C5)
        T8 footer           -> src\components\landing\Footer.tsx         (cites C6)
wave 3  T9 page-compose     -> src\app\page.tsx imports + orders         (cites C1-C6)
        T10 visual-tests    -> tests\visual\*.spec.ts capture + compare  (cites C1-C6)
wave 4  T11 lighthouse-ci   -> performance + a11y budget gate            (cites invariants)
```

Tasks in wave 2 run in parallel worktrees; worktrees merge only after every task passes Verify and Court.

### 3. Execute and Verify

The `executing` skill dispatches a fresh subagent per task. Each subagent receives: the task scope, the full contract, the counter-examples section, and the brand tokens file. No prior agent's output, no plan history.

The Verify skill runs these probes outside the agent process:

- `playwright-screenshot`: renders the page headless at 1440x900 and 375x812, compares to `anvil\refs\*.png` with per-channel dE tolerance 3 and pixel-ratio tolerance 0.02. Failures produce a diff image into `anvil\diffs\`.
- `lighthouse`: performance >=95, accessibility ==100, best-practices >=95. Unmet budget is a Functional fail.
- `axe-core`: zero violations. Warnings captured for Devil's Advocate.
- `token-audit`: grep over every edited TSX for Tailwind arbitrary-value syntax `\[[^\]]+\]`, non-token hex, inline styles. Any hit fails Substantive.
- `rhythm-audit`: AST walk of Tailwind classes; spacing utilities must draw from `[0,4,8,12,16,24,32,48,64,96,128]`. Font sizes must be named scale entries. Any off-scale is Substantive fail.
- `placeholder-audit`: regex over rendered DOM text for lorem/ipsum/dolor/TODO/FIXME/"your ... here".
- `motion-audit`: animations must reference `tokens.motion.*`. Raw `transition-all` without a token-named duration fails.

### 4. Judge (the Court)

**Pass 1 - Spec compliance.** Court subagent is handed: contract + diff + captured probe output. For each criterion: confirm Exists by file inspection, Substantive by scanning diff against `must_implement`/`must_not`, Wired by finding the import+JSX in `page.tsx`, Functional by reading the captured Playwright/Lighthouse/axe output. Devil's Advocate runs in parallel if any probe passed with zero-delta coverage or suspiciously quiet output.

**Pass 2 - Code quality and visual judgment.** Parameterized for frontend: the Court additionally receives the reference screenshots and the diff images from the Playwright probe. Pass 2 asks would-I-merge across:

- Scope discipline: only files the task named are touched.
- No unsolicited abstractions (no new hooks, no Context provider not in contract).
- Visual comparison against reference: does the diff image show only anti-aliasing noise, or does it show structural drift (spacing wrong, typography off, color mismatch beyond tolerance)?
- Motion sanity: does hover/scroll animation use token durations?
- Copy sanity: no placeholder, CTAs match product voice.

Pass 2 verdict is `merge` / `request-changes` / `request-clarification`. Request-clarification surfaces to escalation (e.g. "reference shows teal gradient; brand tokens do not define a gradient token - contract is ambiguous").

### 5. Ledger Interaction

Likely lessons queried and injected at Contract time:

- `2026-02-08-003` "Hero passed Substantive with lorem ipsum h1 copy" - produces the `placeholder-audit` must_not clause.
- `2026-03-22-011` "Pricing tiers passed Functional but baselines drifted across cards" - produces `rhythm-audit` and the visual baseline_grid probe.
- `2026-03-29-007` "Generic shadcn defaults scored green but read as stock template" - produces the `design_reference` section and screenshot-diff probe.

Likely lessons written on reset in this run:

- Testimonials carousel passes a11y and functionality but cards have inconsistent heights - new lesson tags `["carousel", "card-height", "rhythm-broken"]`, remediation adds Substantive `"all TestimonialCard render at identical computed height"`.
- FAQ accordion uses Tailwind default `transition-all duration-200` - new lesson tags `["motion-default", "token-drift"]`, remediation adds `motion-audit` to probe list for interactive components.

## A Realistic Failure and Reset

Wave 2, task T5 (pricing). First execute: Playwright visual test fails `pricing_recommended_emphasis`. Diff image shows middle card is visually indistinguishable from siblings - agent implemented scale-1.04 but applied it to inner content, not the card container. Verify Functional: FAIL. The `resetting` skill is invoked.

Diagnosis: the input (Contract criterion C2.substantive) said "middle card has data-recommended=true and 1.04 scale transform" but did not name the scope of the transform. The agent picked inner content; humans would expect card container. This is an input-level gap.

Lesson written:

```json
{
  "id": "2026-04-14-022",
  "pattern": ["pricing-table", "recommended-tier", "scale-emphasis"],
  "contract_gap": {
    "level": "substantive",
    "criterion": "C2",
    "was": "middle card has 1.04 scale transform",
    "should_have_been": "middle card container element (outermost div of PricingCard) has class 'scale-[1.04]' applied; inner content untransformed"
  },
  "remediation": {
    "counter_example_text": "Scale-emphasis applied to inner content instead of card container produces no visual hierarchy change."
  }
}
```

Contract is patched. Session is killed. Fresh subagent re-runs T5 with the tightened criterion. Second execute passes; Court Pass 1 green; Pass 2 green with merge verdict.

## Critical Issues Surfaced by Deep Discovery

1. **No native Aesthetic verification level.** Exists/Substantive/Wired/Functional cover behavior; "premium feel" is not a fifth column. Anvil currently approximates via Functional probes (visual diff, token audit). Proposal below adds a formal `aesthetic` slot to Contract grammar.
2. **Reference screenshots are a chicken-and-egg problem.** Playwright diff needs references; references come from designers or prior runs. First-run has no reference, so first-run aesthetic fidelity collapses to Court Pass 2 judgment alone, which is the weakest link.
3. **The Court has no taste, only scope.** Pass 2 catches drive-by refactors and unreferenced orphans, not "this hero looks like every other shadcn template." Parameterizing the Court with a reference image helps, but the Court's verdict on "premium-ness" is still a model opinion, not a measurement.
4. **Brand tokens cannot express motion and interaction.** `brand.json` in the wild names colors and spacing; it rarely names easing curves, stagger offsets, scroll behavior. Premium feel lives there. Contract has no grammar for it until it is added.
5. **Copywriting is out of scope but load-bearing.** "Would I merge this" includes "does the copy sound like Tacet." Anvil has no copy-voice probe and the Ledger cannot accumulate one without explicit tagging.
6. **Irreducible human-eye step.** Touchpoint 2 is currently "merge the PR." For aesthetic work, it must become "visual sign-off + merge." Anvil should surface a rendered preview in the PR body with reference + actual side-by-side, not treat the PR as a code-only review.

## Strengths Confirmed

1. **Token-audit and rhythm-audit are genuinely effective.** Catching arbitrary Tailwind values and off-scale spacing kills the most common "looks cheap" failure mode deterministically.
2. **Placeholder-audit catches a real footgun.** Lorem-ipsum-passes-Substantive is the exact "barely passing stub" the user feared; one regex closes it.
3. **Wave-parallel section tasks with strict scope.** Six sections in parallel worktrees with Court Pass 2 scope enforcement prevents inter-section refactor drift.
4. **Ledger compounds across frontend projects.** Lessons from one landing page ("scale-emphasis applied to wrong element") apply to the next. This is exactly the cross-project compounding the Ledger was designed for.
5. **Whole-branch Court catches composition drift.** Six sections individually passing can still compose into a page with inconsistent vertical rhythm; the final pass is the net.
6. **Invariants enforce bundle, fonts, and token sourcing at the contract level**, not as hopes.

## Design Refinements Proposed

1. **New Contract check type: `design_reference`.** First-class frontmatter slot naming a reference URL or screenshot path per breakpoint. Probes inherit tolerance. Without it, aesthetic criteria cannot pass.
2. **Fifth verification level, optional: `aesthetic`.** Structurally parallel to Functional, gated on (a) screenshot-diff within tolerance, (b) token-audit clean, (c) rhythm-audit clean, (d) motion-audit clean. Contracts that do not opt in do not get this level; contracts that do cannot ship without it.
3. **`visual-court` parameterization.** A Court invocation where Pass 2 receives the reference screenshot, the actual screenshot, and the diff image alongside the code diff. Prompt includes: "Cite a specific region of the diff image for any finding; hand-waving is rejected at output-parse."
4. **Ledger pattern namespace for design pathologies.** Controlled vocabulary: `placeholder-copy`, `token-drift`, `rhythm-broken`, `scale-emphasis-wrong-scope`, `motion-default`, `card-height-drift`, `generic-shadcn`, `baseline-drift`, `cta-hierarchy-flat`. These become the `pattern` array values in Ledger entries and the index keys the next contract query hits.
5. **Contract grammar extension for motion.** `motion_tokens` block naming durations, easings, stagger offsets; probes enforce references only.
6. **PR body auto-renders reference vs actual.** `/ship` attaches the side-by-side to the PR description so the human touchpoint is a visual sign-off, not a blind stamp.
7. **Copy-voice probe (future).** A small LLM-as-probe that compares copy to a product-voice spec in the contract. Out of scope for v1 but flagged as the next Ledger pattern class.

## Bottom Line

Anvil can drive a Tacet landing page to "competently premium" with high confidence. Token-audit, rhythm-audit, placeholder-audit, Playwright screenshot diff against references, Lighthouse and axe budgets, and a Court Pass 2 parameterized with visual inputs catch roughly eighty percent of "barely-passing stub" failures deterministically. The remaining twenty percent - the distinction between Linear-quality and generic-shadcn-quality - is irreducibly aesthetic judgment. Anvil's honest answer is to concentrate that judgment at touchpoint 2: a visual sign-off with side-by-side PR rendering, backed by a Ledger that tags design pathologies and feeds them back as counter-examples on the next contract. The first landing page is the weakest, because the Ledger is empty for that project's tone; the fifth is much stronger, because pathologies from the prior four have been encoded into machine-checkable probes. Anvil does not replace a designer's eye; it makes the designer's eye the scarcest and most leveraged input instead of the middle of a feedback chain.
