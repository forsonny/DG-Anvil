---
name: authoring-skills
description: Meta-skill governing every change to any skill file. Requires a RED-then-GREEN subagent pressure transcript before a skill change is accepted.
---

## Overview

Authoring a skill is test-driven. A skill change is not merged until a paired pressure run fails without the change and passes with it. The pressure test cites a failure-taxonomy row from `docs/failure-taxonomy.md`. The skill description is a trigger for activation, not a summary of the body.

## When to Use

Whenever any `skills/*/SKILL.md` file is created or modified. Whenever a pressure test under `tests/pressure/` is added, removed, or rewritten. Whenever the canonical section order, skill inventory, or skill-retirement policy is changed.

## Process

1. Identify the failure-taxonomy row the new or amended skill defeats. Write the row number in the pressure test as a single-line comment at the top of the file.
2. Create or update the paired pressure test file at `tests/pressure/<skill>.pressure.js`. Import `runPressure` from `tests/pressure/harness.js`.
3. Define a scenario: a prompt, a minimal repository state, and the assertions that distinguish a skill-absent outcome from a skill-present outcome.
4. Run the test with the skill absent; confirm the RED outcome (expected failure mode reproduces).
5. Write or amend `skills/<name>/SKILL.md`. Keep the six canonical H2 sections in order: Overview, When to Use, Process, Rationalizations, Red Flags, Verification.
6. Run the test with the skill present; confirm the GREEN outcome (skill prevents the failure).
7. Review the description: it must trigger activation, never summarise the body.
8. Adding an eighth skill? Retire one. The skill inventory is capped at seven; each addition requires an explicit retirement in the same change.

## Rationalizations

Reject the following shortcuts:

- "The description is a trigger, not a summary." Authors violate this by writing a description that restates the Overview. The skill will then never be activated at the right time (row 18: description-field shortcut).
- "One more skill is harmless." Skill proliferation erodes the triggering signal for every existing skill (row 29: skill-proliferation drag).
- "The pressure test can come later." Without a RED-then-GREEN transcript, there is no evidence the skill defeats anything. Defer the merge, not the test (row 18 again).

## Red Flags

If any of these conditions obtain, the skill change is rejected:

- No paired `tests/pressure/<skill>.pressure.js` file in the same change set.
- The pressure test does not cite a failure-taxonomy row by number.
- The skill description summarises the body instead of naming an activation trigger (row 18).
- The change adds a new skill without retiring an existing one (row 29).

## Verification

A reviewer accepts a skill change only after confirming, by file inspection:

1. The pressure test file exists and cites a failure-taxonomy row.
2. Both the skill-absent and skill-present runs are recorded with their outcomes.
3. The skill description is a trigger phrase, not a summary of the body.
4. The six canonical sections are present in order with non-empty bodies for any skill other than the bootstrap loader.
