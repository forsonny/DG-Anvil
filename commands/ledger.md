---
name: ledger
description: Query, append, or audit the global lesson Ledger.
arguments:
  - subcommand
  - rest
---

Interact with the global lesson Ledger at `~/.anvil/ledger.jsonl`.

Subcommands:

- `/ledger query <pattern>`: Return up to five lessons whose pattern tokens overlap with `<pattern>`.
- `/ledger append --file <path>`: Read a lesson from a JSONL file and append it; rejects null lessons with `E_NULL_LESSON`.
- `/ledger audit`: Walk the ledger and report any null lessons, duplicate ids, or index-desync issues.

Implementation routes to `anvil ledger <subcommand>` via `cli/anvil.js`.
