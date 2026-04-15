---
name: continue
description: Resume from saved state. Reads anvil/state.json and picks up at the next incomplete task.
arguments: []
---

Resume an in-progress Anvil run from saved state.

1. Read `anvil/state.json` via `cli/lib/io.js` `readFileUtf8`. If the file does not exist, exit with `{error: "no state to continue from", code: "E_STATE", details: {}}` on stderr.
2. Load `anvil/contract.yml` via `cli/lib/contract.js` `loadAndValidate`.
3. Load `anvil/plan.yml` via `cli/lib/plan.js` `loadAndValidate(path, contract)`.
4. Iterate the plan's waves in topological order. For the first task whose `state.tasks[task.id].status` is not `'passed'`, invoke `node "$CLAUDE_PLUGIN_ROOT/cli/anvil.js" run --task <id>`. The dispatcher identifier defaults to `anvil_subagent`; `state.run_id` is preserved.
5. If every task is already `'passed'`, exit 0 with `{ok: true, all_passed: true}` on stdout.
6. If the resumed task fails, exit non-zero with the structured `E_VERIFY` error from the verifier propagated by the `anvil run` invocation.
