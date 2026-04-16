# dev/

Design provenance for DG-Anvil. Everything in this folder is **optional context for contributors** - it is not required to use, install, or run the plugin. Regular users never need to open it.

## What's here

| Path | What it is |
|---|---|
| `anvil-design/00_intro.md` through `12_Bottom_Line.md` | The thirteen canonical product-design documents. Thesis, anatomy, the Contract grammar, the Ledger, the Court, observability, anti-patterns defeated. If you want to understand *why* DG-Anvil is shaped the way it is, start with `00_intro.md` and read in order. |
| `anvil-design/anvil_workflow.svg` | The workflow diagram referenced from the design docs. A copy also ships at `docs/anvil_workflow.svg` for use by the plugin. |
| `anvil-design/scenarios/` | Ten worked scenarios that show the loop running against real-looking tasks (landing page, multi-tenant API, race condition fix, God-module refactor, Stripe checkout, etc.). Useful for building intuition. |
| `dg-anvil/00_Architecture.md` | The build architecture: source tree, schemas, cross-stage invariants, the stage dependency graph. The definitive single source of truth for every file in the plugin. |
| `dg-anvil/plans/stage_0_bootstrap.md` through `stage_4_observability_and_ship.md` | The five stage plans that produced this plugin. Each plan has phased tasks with inputs, outputs, verification commands, and exit criteria. Rebuilding the plugin from scratch by following these plans is the acceptance test for the architecture document. |

## When to read this

Read `dev/` if you are:

- Trying to understand the design (start with `anvil-design/02_Design_Thesis.md`).
- Adding a new skill (read `dg-anvil/00_Architecture.md` Section 6, then `skills/authoring-skills/SKILL.md`).
- Changing a schema (read `dg-anvil/00_Architecture.md` Section 5).
- Adding a new CLI subcommand (read `dg-anvil/00_Architecture.md` Sections 3 and 4).
- Writing a new pressure test (read `anvil-design/10_Anti-Patterns_Defeated.md` for the 30-row failure taxonomy).

## When not to read this

You do not need `dev/` to:

- Install the plugin (`README.md` in the repo root).
- Use the plugin in a session (`/start`, `/continue`, `/ship`).
- Consume the ledger (`/ledger query <pattern>`).
- Report a bug against the plugin's observable behaviour.

## Provenance

The `anvil-design/` documents were written as a self-contained design report before any code existed. The `dg-anvil/00_Architecture.md` document was written next to resolve every cross-stage decision once. The five stage plans under `dg-anvil/plans/` were derived from the architecture document. The plugin source in the rest of this repository was then produced by executing those stage plans in order. Any divergence between the plugin source and the documents here is a defect; please open an issue or a PR.
