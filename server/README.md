# Paperclip Server

Express REST API and orchestration engine that forms the core of Paperclip. Manages companies, agents, issues, goals, budgets, runs, heartbeats, and the plugin runtime.

## Architecture

```
server/
├── src/
│   ├── index.ts               # Entrypoint — DB init, migrations, startServer()
│   ├── app.ts                 # Express app factory — middleware chain, route mounting
│   ├── config.ts              # Environment & .env loading, feature flags
│   │
│   ├── routes/                # HTTP route handlers
│   │   ├── agents.ts          # Agent CRUD, heartbeat triggers, run management
│   │   ├── issues.ts          # Issue CRUD, checkout/release, comments, documents
│   │   ├── companies.ts       # Company CRUD, import/export
│   │   ├── projects.ts        # Project and workspace management
│   │   ├── goals.ts           # Goal hierarchy CRUD
│   │   ├── approvals.ts       # Approval gates — create, link, decide
│   │   ├── costs.ts           # Budget tracking and cost event queries
│   │   ├── activity.ts        # Activity log reads
│   │   ├── skills.ts          # Skills manager routes
│   │   ├── routines.ts        # Scheduled routine management
│   │   └── plugins.ts         # Plugin installation, config, bridge, streams
│   │
│   ├── services/              # Business logic layer
│   │   ├── run-orchestrator.ts    # Agent run lifecycle (start → execute → finish)
│   │   ├── heartbeat.ts           # Heartbeat scheduler and timer ticks
│   │   ├── routine.ts             # Scheduled routine trigger logic
│   │   ├── supervisor.ts          # Agent supervision and auto-pause
│   │   ├── issue-checkout.ts      # Atomic issue checkout semantics
│   │   ├── cost-tracking.ts       # Budget enforcement and cost aggregation
│   │   ├── activity-log.ts        # Mutation audit trail
│   │   └── company-export.ts      # Company package export/import logic
│   │
│   ├── adapters/              # Server-side adapter system
│   │   ├── registry.ts        # Adapter type registry (built-in + external plugins)
│   │   ├── runner.ts          # Adapter execution harness
│   │   └── plugin-loader.ts   # External adapter package loader
│   │
│   ├── middleware/            # Express middleware
│   │   ├── logger.ts          # Pino structured logger
│   │   ├── company-scope.ts   # Company access enforcement
│   │   ├── agent-auth.ts      # Agent API key validation
│   │   └── error-handler.ts   # Centralized error responses
│   │
│   ├── auth/                  # Authentication
│   │   ├── better-auth.ts     # BetterAuth integration for authenticated mode
│   │   └── auth-setup.ts      # Local trusted board principal setup
│   │
│   ├── realtime/              # Real-time event broadcasting
│   │   └── live-events-ws.ts  # WebSocket server for SSE/live events
│   │
│   ├── secrets/               # Secret storage abstraction
│   ├── storage/               # File/artifact storage
│   └── types/                 # Express type augmentations
│
├── scripts/
│   └── dev-watch.ts           # tsx watch wrapper for hot-reload
│
└── package.json
```

## Key Concepts

### Startup Sequence

`server/src/index.ts` orchestrates the full startup:

1. **Load config** from env + `.env` file
2. **Initialize database** — embedded PGlite (dev) or external PostgreSQL (prod)
3. **Run migrations** — auto-apply if first run, prompt otherwise
4. **Create Express app** — mount middleware and routes
5. **Start HTTP server** — detect free port, bind
6. **Initialize services** — heartbeat scheduler, routine scheduler, backup scheduler
7. **Load external adapters** — wait for plugin adapter registry
8. **Print startup banner** — show URLs and config summary

### Database Modes

| Mode | When | How |
|------|------|-----|
| **Embedded PGlite** | `DATABASE_URL` is unset | Auto-creates PostgreSQL in `data/pglite/` |
| **External PostgreSQL** | `DATABASE_URL` is set | Connects to your Postgres instance |

### Deployment Modes

| Mode | Auth | Use Case |
|------|------|----------|
| `local_trusted` | None (loopback only) | Local development, single user |
| `authenticated` | BetterAuth sessions | Production, multi-user, remote access |

### Adapter System

Adapters connect Paperclip to external AI agent runtimes. The server maintains a registry in `adapters/registry.ts`:

**Built-in adapters:** Claude Code, Codex, Cursor, Gemini CLI, Ollama, OpenClaw Gateway, OpenCode, Pi, Einstein Hand

**External adapters:** Loaded dynamically from `~/.paperclip/adapter-plugins.json` via the plugin-loader.

> ⚠️ **Three registries rule:** Every adapter has registrations in `server/src/adapters/registry.ts` (server), `cli/src/adapters/registry.ts` (CLI), AND `ui/src/adapters/` (UI). All three must be in sync.

## API Surface

- **Base path:** `/api`
- **Auth:** Board sessions (cookie) or Agent API keys (bearer token)
- **Company scoping:** All domain routes enforce company boundaries

### Key Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Server health check |
| GET | `/api/companies` | List companies |
| GET | `/api/agents` | List agents (company-scoped) |
| POST | `/api/agents/:id/run` | Trigger agent run |
| GET | `/api/issues` | List issues |
| POST | `/api/issues/:id/checkout` | Atomic issue checkout |
| GET | `/api/goals` | List goals |
| GET | `/api/costs` | Cost tracking data |
| GET | `/api/activity` | Activity log |
| GET | `/api/approvals` | Approval gates |

> Full API surface is defined in route files under `server/src/routes/`.

## For AI Agents

### ⚡ Task Granulization

Server changes are high-impact because they sit at the center of the stack. Always decompose:

| Change Type | Sub-tasks |
|-------------|-----------|
| **New route** | 1) Add path constant in `packages/shared` → 2) Create route handler → 3) Register in `app.ts` → 4) Add activity logging → 5) Typecheck |
| **New service** | 1) Create service file → 2) Wire into routes → 3) Add types to `packages/shared` → 4) Typecheck |
| **Schema change** | 1) Edit `packages/db/src/schema/` → 2) Export from barrel → 3) `pnpm db:generate` → 4) Update shared types → 5) Update service layer → 6) Update routes → 7) Typecheck |
| **New adapter** | Follow [`TASK_PATTERNS.md`](../TASK_PATTERNS.md) pattern #3 |

### Invariants to Preserve

1. **Single-assignee task model** — only one agent can check out an issue at a time
2. **Atomic issue checkout** — checkout is transactional, no partial states
3. **Budget hard-stop** — agents auto-pause when budget is exhausted
4. **Activity logging** — all mutations produce audit trail entries
5. **Company scoping** — every domain entity is company-scoped, no cross-company leaks

### Critical Files

| File | Why it matters |
|------|---------------|
| `index.ts` | Startup sequence — changes here can break everything |
| `app.ts` | Middleware order matters; adding routes in wrong position breaks auth |
| `config.ts` | Feature flags and env var loading — Windows casing gotchas apply |
| `adapters/registry.ts` | Adapter registration — export name mismatches cause silent failures |

### Windows / NTFS Warning

Read [`GOTCHAS.md`](../GOTCHAS.md) before modifying any server code on Windows. Key issues:
- `realpathSync()` in config/watch paths → event loop deadlock
- Drive letter casing in `isMainModule` check
- `tsx watch` zombie processes

### Verification

```bash
pnpm --filter @paperclipai/server typecheck   # Type-check server
pnpm -r typecheck                              # Type-check everything
pnpm test:run                                  # Run tests
curl http://localhost:3100/api/health          # Smoke test
```

## Related Docs

| Doc | Purpose |
|-----|---------|
| [`AGENTS.md`](../AGENTS.md) | Repo contribution rules and PR requirements |
| [`STRUCTURE.md`](../STRUCTURE.md) | Full repo directory map |
| [`TASK_PATTERNS.md`](../TASK_PATTERNS.md) | Step-by-step checklists for common changes |
| [`GOTCHAS.md`](../GOTCHAS.md) | Platform traps and hard-won fixes |
| [`doc/SPEC-implementation.md`](../doc/SPEC-implementation.md) | V1 build contract |
| [`doc/DATABASE.md`](../doc/DATABASE.md) | Schema conventions and migration workflow |
| [`packages/db/README.md`](../packages/db/README.md) | Database package details |
