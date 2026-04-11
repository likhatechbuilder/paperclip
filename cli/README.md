# @paperclipai/cli (`paperclipai`)

The Paperclip command-line interface. Onboard, configure, import companies, and interact with your Paperclip server from the terminal.

## Install

```bash
npm install -g paperclipai
# or run without installing:
npx paperclipai
```

## Quick Start

```bash
# First-time setup — creates config, starts server, opens browser
npx paperclipai onboard --yes

# Edit config after onboarding
paperclipai configure

# Import a company package
paperclipai company import --from ./companies/my-company
```

## Commands

| Command | Description |
|---------|-------------|
| `onboard` | First-time setup wizard. Creates `~/.paperclip/config.yaml`, installs dependencies, starts server. |
| `configure` | Interactive config editor. Modify server port, database mode, adapters, etc. |
| `company import` | Import an `agentcompanies/v1` company package into the running Paperclip instance. |
| `company export` | Export a company's full structure (agents, goals, skills, projects) to a portable package. |
| `run` | Execute a one-shot agent run against the server. |
| `health` | Check if the Paperclip server is responsive. |

> Run `paperclipai --help` or `paperclipai <command> --help` for full option docs.

## Architecture

```
cli/
├── src/
│   ├── index.ts              # Commander.js entrypoint — defines all commands
│   ├── commands/              # Command implementations
│   │   ├── onboard.ts         # First-time setup wizard
│   │   ├── configure.ts       # Config editor
│   │   ├── company-import.ts  # Company package import
│   │   ├── company-export.ts  # Company package export
│   │   └── run.ts             # Agent run execution
│   └── adapters/
│       └── registry.ts        # CLI-side adapter stream formatters
└── package.json
```

### Key Integration Points

The CLI talks to the Paperclip server over its REST API (`http://localhost:3100/api`). It does **not** import server code directly.

**Adapter registry:** `cli/src/adapters/registry.ts` contains stream formatters that parse adapter stdout/stderr into human-readable terminal output. When adding a new adapter, you must register its CLI formatter here **in addition to** the server registry and UI registry.

## For AI Agents

### ⚡ Task Granulization

When modifying the CLI, break work into atomic sub-tasks:

1. **Schema/type changes** → `packages/shared` first, then `pnpm -r typecheck`
2. **New command** → create file in `commands/`, register in `index.ts`, typecheck
3. **Adapter support** → add formatter in `adapters/registry.ts`, verify export names match package

### Common Gotchas

- **Export name mismatches:** The CLI imports stream formatters from adapter packages. The export name in the package **must exactly match** what the registry expects. See [`GOTCHAS.md`](../GOTCHAS.md) for details.
- **Three registries rule:** Every adapter has registrations in `server/src/adapters/registry.ts`, `cli/src/adapters/registry.ts`, AND `ui/src/adapters/`. Miss one and the adapter silently fails in that context.

### Verification

```bash
pnpm -r typecheck          # Type-check all packages including CLI
pnpm --filter @paperclipai/cli build   # Build CLI specifically
paperclipai health         # Smoke test against running server
```

## Related Docs

| Doc | Purpose |
|-----|---------|
| [`AGENTS.md`](../AGENTS.md) | Repo contribution rules |
| [`STRUCTURE.md`](../STRUCTURE.md) | Full repo directory map |
| [`TASK_PATTERNS.md`](../TASK_PATTERNS.md) | Step-by-step checklists |
| [`GOTCHAS.md`](../GOTCHAS.md) | Platform traps and known issues |
| [`doc/DEVELOPING.md`](../doc/DEVELOPING.md) | Dev environment setup |
