---
name: ledger
description: Query, append, or audit the global lesson Ledger.
arguments:
  - subcommand
  - rest
---

Interact with the global lesson Ledger at `~/.anvil/ledger.jsonl`.

The Anvil CLI is `cli/anvil.js` inside the plugin directory and is NOT on `PATH`. Invoke it as `node "$CLAUDE_PLUGIN_ROOT/cli/anvil.js" ledger <subcommand>`.

Subcommands:

- `/ledger query <pattern>` -> `node "$CLAUDE_PLUGIN_ROOT/cli/anvil.js" ledger query <pattern>`. Returns up to five lessons whose pattern tokens overlap with `<pattern>`.
- `/ledger append --file <path>` -> `node "$CLAUDE_PLUGIN_ROOT/cli/anvil.js" ledger append --file <path>`. Rejects null lessons with `E_NULL_LESSON`.
- `/ledger audit` -> `node "$CLAUDE_PLUGIN_ROOT/cli/anvil.js" ledger audit`. Reports null lessons, duplicate ids, and index-desync issues.
