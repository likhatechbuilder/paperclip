# STRUCTURE.md — Paperclip Repository Map

> Quick-reference for AI agents and contributors. Each entry has a 1-line purpose.

```
paperclip/
├── AGENTS.md                    # Contribution rules, anti-hallucination protocol, PR template
├── CONVENTIONS.md               # Coding style, naming, imports, DB schema rules
├── CONTRIBUTING.md              # Human contributor guide
├── GOTCHAS.md                   # Platform traps — MANDATORY on Windows
├── README.md                    # Project overview, features, quick start
├── TASK_PATTERNS.md             # Step-by-step checklists for common change types
│
├── .context/                    # AUTO-GENERATED — machine-readable context for AI agents
│   ├── shared-exports.md        # All types, constants, validators from @paperclipai/shared
│   ├── schema-snapshot.md       # All 69 database table exports from @paperclipai/db
│   ├── api-surface.md           # All API routes across 30 route files
│   └── adapter-registry.md      # All 9 adapters and their registration status
│
├── server/                      # Express REST API + orchestration engine
│   └── src/
│       ├── index.ts             # Server entrypoint — config, DB init, startServer()
│       ├── app.ts               # Express app factory — middleware chain, route mounting
│       ├── config.ts            # Environment & .env loading, feature flags
│       ├── routes/              # HTTP route handlers (agents, companies, issues, runs…)
│       ├── services/            # Business logic layer (run orchestration, heartbeat, supervisor)
│       ├── adapters/            # Server-side adapter registry + adapter runner
│       ├── middleware/          # Auth, logging, error-handling middleware
│       ├── auth/                # Board auth, agent JWT, bootstrap flow
│       ├── secrets/             # Secret storage abstraction
│       ├── realtime/            # SSE / WebSocket event broadcasting
│       ├── storage/             # File/artifact storage
│       └── types/               # Express type augmentations
│   └── scripts/
│       └── dev-watch.ts         # tsx watch wrapper for hot-reload dev mode
│
├── ui/                          # React + Vite board UI
│   └── src/
│       ├── App.tsx              # Root router — all page routes defined here
│       ├── main.tsx             # Vite entrypoint, context providers
│       ├── index.css            # Global design system tokens + utility styles
│       ├── pages/               # Full-page route components
│       ├── components/          # Shared UI components (Sidebar, IssueRow, RunCards…)
│       ├── adapters/            # Per-adapter UI config field renderers
│       ├── api/                 # API client functions (fetch wrappers)
│       ├── context/             # React Context providers (company, auth, theme)
│       ├── hooks/               # Custom React hooks
│       ├── lib/                 # Utility functions
│       └── plugins/             # Plugin UI components
│
├── cli/                         # `paperclipai` CLI — company import, agent runs, onboarding
│   └── src/
│       ├── index.ts             # Commander.js entrypoint
│       ├── commands/            # CLI command implementations
│       └── adapters/            # CLI-side adapter registry + stream formatters
│
├── packages/                    # Shared workspace packages
│   ├── shared/                  # Types, constants, validators, API path constants
│   ├── db/                      # Drizzle ORM schema, migrations, DB client factory
│   ├── adapters/                # Agent adapter implementations (claude, codex, cursor, gemini, ollama…)
│   ├── adapter-utils/           # Shared adapter utilities (process spawning, streaming)
│   ├── plugins/                 # Plugin system (SDK, loader, job coordinator)
│   └── mcp-server/             # Model Context Protocol server package
│
├── scripts/                     # Dev tooling scripts
│   ├── dev-runner.ts            # Main dev orchestrator — builds, watches, restarts server
│   ├── ensure-workspace-package-links.ts  # Verifies pnpm workspace symlinks
│   └── dev-service.ts           # Dev process manager (start/stop/status)
│
├── companies/                   # Agent company packages (agentcompanies/v1 spec)
│   └── antigravity-engineering/ # Your AI engineering agency
│
├── doc/                         # Product & operational documentation
│   ├── GOAL.md                  # Project vision
│   ├── PRODUCT.md               # Product requirements
│   ├── SPEC.md                  # Long-horizon product spec
│   ├── SPEC-implementation.md   # V1 build contract (THE source of truth)
│   ├── DEVELOPING.md            # Developer setup guide
│   ├── DATABASE.md              # Schema & migration docs
│   ├── mistakes.md              # Anti-pattern registry — do not repeat these
│   ├── memory-landscape.md      # Memory system research survey
│   └── decisions/               # Architecture Decision Records (ADRs)
│       ├── 001-embedded-postgres.md
│       ├── 002-three-adapter-registries.md
│       ├── 003-company-scoped-everything.md
│       ├── 004-tsx-watch-bypass-windows.md
│       ├── 005-plugin-sdk-build-cache.md
│       └── 006-external-hermes-adapter.md
│
├── docs/                        # Public-facing specification docs
│   └── companies/               # Agent Companies specification
│
├── tests/                       # Integration & E2E tests
├── evals/                       # Agent evaluation benchmarks
└── releases/                    # Release changelogs
```

## Key Files to Read First

| Priority | File | Why |
|----------|------|-----|
| 1 | `AGENTS.md` | Repo rules, anti-hallucination protocol, verification commands |
| 2 | `CONVENTIONS.md` | Coding style — prevents drift from training data patterns |
| 3 | `STRUCTURE.md` | This file — recover repo layout fast |
| 4 | `GOTCHAS.md` | Platform traps — read BEFORE editing anything |
| 5 | `TASK_PATTERNS.md` | Step-by-step checklists for common changes |
| 6 | `doc/decisions/` | Architecture Decision Records — why things are this way |
| 7 | `doc/mistakes.md` | Known anti-patterns — do NOT repeat |
| 8 | `doc/SPEC-implementation.md` | THE V1 build contract |
| 9 | `doc/DEVELOPING.md` | Dev environment setup |
| 10 | `doc/DATABASE.md` | Schema conventions & migration workflow |
