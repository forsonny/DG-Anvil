# DG-Anvil

DG-Anvil is a Claude Code plugin that enforces the Anvil loop as structural gates. The plugin makes specifications machine-readable before code runs, runs verification probes externally, and persists every failure as a Ledger lesson that future contracts inherit.

## Two human touchpoints

The production loop has exactly two human touchpoints:

1. **Contract confirm.** After `/start <intent>`, the user reviews `anvil/contract.yml` and accepts or rejects it. Binary gate; no list-of-N auto-pick.
2. **PR merge.** `/ship` opens the PR via `gh pr create`. The human reviews and merges; `/ship` does not merge for the user.

## Five primitives

- **Contract** (`anvil/contract.yml`): YAML with four verification levels per criterion (Exists, Substantive, Wired, Functional).
- **Plan** (`anvil/plan.yml`): atomic task DAG with wave ordering; every task cites contract criterion ids.
- **Loop**: Contract -> Plan -> Execute -> Verify -> Judge -> Pass or Reset.
- **Ledger** (`~/.anvil/ledger.jsonl`): durable lesson log; future contracts query and inject counter-examples.
- **Court** (`cli/lib/court.js`): adversarial adjudicator parameterised by check types. Plan, commit messages, and prior verdicts are structurally withheld.

## Seven skills

`using-anvil`, `authoring-skills`, `contracting`, `planning`, `executing`, `verifying`, `judging`, `resetting`.

## Five commands

`/start`, `/continue`, `/ship`, `/abort`, `/ledger`.

## CLI

`anvil contract`, `anvil plan`, `anvil run`, `anvil verify`, `anvil judge`, `anvil ledger`, `anvil metrics`, `anvil audit`, `anvil ship`, `anvil escalation`, `anvil cassette`. See `anvil --help`.

---

## Installation

DG-Anvil ships as both a Claude Code plugin and a single-plugin marketplace. Pick whichever installation path matches how you want the plugin to live in your environment.

### Option A: Install via the Claude Code marketplace (recommended)

This is the supported, upgrade-friendly path. The plugin lives under `~/.claude/plugins/` and is shared across every project on the machine.

In any Claude Code session, run:

```text
/plugin marketplace add forsonny/DG-Anvil
/plugin install dg-anvil@dg-anvil
```

`/plugin marketplace add` registers this repository as a marketplace named `dg-anvil` (the `name` field declared in `.claude-plugin/marketplace.json`). `/plugin install dg-anvil@dg-anvil` installs the `dg-anvil` plugin from that marketplace.

Verify the install with:

```text
/plugin list
```

You should see `dg-anvil` listed as enabled. The five slash commands (`/start`, `/continue`, `/ship`, `/abort`, `/ledger`) are now available in any Claude Code session, and `hooks/session-start` will load `using-anvil` automatically when a fresh session begins.

To upgrade later, pull the latest marketplace listing:

```text
/plugin marketplace update dg-anvil
/plugin install dg-anvil@dg-anvil
```

To remove the plugin:

```text
/plugin uninstall dg-anvil@dg-anvil
/plugin marketplace remove dg-anvil
```

### Option B: Install at the project level (single project only)

Use this when you want DG-Anvil active in exactly one repository and do not want it visible in other projects.

From the root of the repository where you want DG-Anvil active:

```bash
mkdir -p .claude/plugins
git clone https://github.com/forsonny/DG-Anvil.git .claude/plugins/dg-anvil
```

Then, in any Claude Code session opened in that repository:

```text
/plugin marketplace add ./.claude/plugins/dg-anvil
/plugin install dg-anvil@dg-anvil
```

The plugin is now active for this repository only. To upgrade, `git -C .claude/plugins/dg-anvil pull` then re-run the install command. Add `.claude/plugins/dg-anvil` to your project's `.gitignore` if you do not want to commit the plugin source into the consuming repository.

### Option C: Install at the user level (no marketplace)

If you prefer to skip the marketplace command and drop the plugin straight into Claude Code's user-scoped plugin directory:

```bash
mkdir -p ~/.claude/plugins
git clone https://github.com/forsonny/DG-Anvil.git ~/.claude/plugins/dg-anvil
```

Restart any active Claude Code session. Components (skills, commands, hooks) are auto-discovered from `~/.claude/plugins/dg-anvil/`. Upgrade with `git -C ~/.claude/plugins/dg-anvil pull`.

### Option D: One-off session (no install)

For a single Claude Code session without installing anything:

```bash
git clone https://github.com/forsonny/DG-Anvil.git /tmp/dg-anvil
claude --plugin-dir /tmp/dg-anvil
```

The plugin is loaded for the duration of that session only.

---

## Requirements

- Node.js 20.0.0 or later (for the `anvil` CLI; runs the `cli/anvil.js` dispatcher).
- `git` on `PATH` (the executor uses `git worktree add` per task).
- Bash on Unix; Git for Windows on Windows (the polyglot hook scripts dispatch through `hooks/run-hook.cmd`).
- Optional per-language tooling at verify time: `python` and `coverage.py` for Python contracts; `go` for Go contracts. Missing tooling produces structured `E_COVERAGE_UNAVAILABLE` errors, never silent passes.

## Quick start

After installing the plugin (any of the four paths above), in any Claude Code session inside your project repository:

```text
/start add a rate limiter that caps inbound requests at 100 per minute per client
```

The `contracting` skill activates, drafts `anvil/contract.yml` from the Ledger plus your intent, and presents it for one-shot binary confirmation. After you accept, the loop runs through `planning`, `executing`, `verifying`, and (on any failure) `resetting` until every contract criterion passes. Finally:

```text
/ship
```

opens the PR via `gh pr create` and stops; you review and merge.

## Architecture

The canonical design is in `reports/Anvil-Design/`. The build architecture and stage plans are in `reports/DG-Anvil/`. The 30-row failure taxonomy is `docs/failure-taxonomy.md`.

## License

MIT. See `LICENSE`.
