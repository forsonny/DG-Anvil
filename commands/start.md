---
name: start
description: Begin a new task stream. Authors a contract from user intent via the contracting skill.
arguments:
  - intent
---

Begin a new Anvil task stream from the user-provided `intent` argument.

1. Load the `contracting` skill from `skills/contracting/SKILL.md`.
2. Pass the `intent` argument to the skill's Process step 1 as the `source_intent` input.
3. Let the `contracting` skill run its Process end-to-end. The one-shot binary confirmation at step 5 is the first human touchpoint. Do not advance past that step without an explicit accept.
