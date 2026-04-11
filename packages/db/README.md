# @paperclipai/db — Database Package

Drizzle ORM schema definitions, migration runtime, embedded PostgreSQL management, and database client factory for Paperclip.

## What This Package Does

1. **Defines the schema** — 60+ Drizzle table definitions in `src/schema/`
2. **Manages migrations** — generation, inspection, auto-apply, and journal repair
3. **Creates DB clients** — factory function for both embedded PGlite and external PostgreSQL
4. **Handles embedded PostgreSQL** — PGlite lifecycle, error formatting, data directory management
5. **Database backups** — automated backup with retention policies

## Architecture

```
packages/db/
├── src/
│   ├── index.ts                  # Barrel export — re-exports everything consumers need
│   ├── client.ts                 # createDb() factory, connection management
│   ├── schema/                   # Drizzle table definitions (64 files)
│   │   ├── index.ts              # Schema barrel export
│   │   ├── companies.ts          # Companies table
│   │   ├── agents.ts             # Agents table
│   │   ├── issues.ts             # Issues (tickets/tasks) table
│   │   ├── goals.ts              # Goals hierarchy
│   │   ├── cost_events.ts        # Budget/cost tracking
│   │   ├── heartbeat_runs.ts     # Agent run records
│   │   ├── plugins.ts            # Plugin installation records
│   │   ├── routines.ts           # Scheduled routines
│   │   └── ...                   # 55+ more tables
│   ├── migrations/               # Generated SQL migration files
│   ├── migration-runtime.ts      # Migration inspection, apply, journal reconciliation
│   ├── migration-status.ts       # Status reporting for UI/CLI
│   ├── backup-lib.ts             # Backup execution and retention management
│   ├── seed.ts                   # Default data seeding
│   └── runtime-config.ts         # DB runtime configuration
│
├── drizzle.config.ts             # Drizzle Kit config (reads compiled schema from dist/)
├── package.json
└── tsconfig.json
```

## Usage

```typescript
import { createDb, companies, agents, issues } from "@paperclipai/db";

// Create a database client
const db = createDb("postgres://user:pass@localhost:5432/paperclip");

// Query with Drizzle
const allCompanies = await db.select().from(companies);
const companyAgents = await db.select().from(agents).where(eq(agents.companyId, companyId));
```

## Schema Conventions

- **Every domain table has `companyId`** — company-scoped data isolation is enforced at the schema level
- **UUID primary keys** — all tables use `uuid` PKs with `gen_random_uuid()` default
- **Timestamps** — `createdAt` and `updatedAt` on most tables
- **Enum-like constraints** — status fields use `text` with CHECK constraints, not PostgreSQL enums (for migration flexibility)

## Adding a New Table

> Follow [`TASK_PATTERNS.md`](../../TASK_PATTERNS.md) pattern #2 for the full checklist.

**Atomic sub-tasks:**

1. Create `src/schema/<table_name>.ts` — define table with Drizzle `pgTable()`
2. Export from `src/schema/index.ts` — add to barrel
3. Generate migration: `pnpm db:generate`
4. Typecheck: `pnpm -r typecheck`
5. Add shared types in `packages/shared/src/types/` if needed
6. Create service layer in `server/src/services/`
7. Create route handlers in `server/src/routes/`
8. Typecheck again: `pnpm -r typecheck`

> ⚠️ **`pnpm db:generate` compiles the package first.** It reads schema from `dist/schema/*.js`, not from TypeScript source directly.

## Migration Workflow

```bash
# Generate migration after schema change
pnpm db:generate

# Apply migrations manually
pnpm db:migrate

# Reset local dev database
rm -rf data/pglite
pnpm dev          # Auto-creates and migrates fresh DB
```

### Migration Auto-Apply

In dev mode, migrations are auto-applied when:
- `PAPERCLIP_MIGRATION_AUTO_APPLY=true` is set, or
- The database is freshly created (no existing data)

## For AI Agents

### ⚡ Task Granulization

Schema changes ripple through the **entire stack**. Never batch schema + routes + UI in one change.

| Step | What | Verify |
|------|------|--------|
| 1 | Edit `src/schema/<table>.ts` | `pnpm -r typecheck` |
| 2 | Export from `src/schema/index.ts` | `pnpm -r typecheck` |
| 3 | `pnpm db:generate` | Check generated SQL is correct |
| 4 | Add types to `packages/shared` | `pnpm -r typecheck` |
| 5 | Add service in `server/src/services/` | `pnpm -r typecheck` |
| 6 | Add routes in `server/src/routes/` | `pnpm -r typecheck` |
| 7 | Add UI in `ui/src/` | `pnpm -r typecheck` |

### Key Gotchas

- **Drizzle config reads from `dist/`** — the schema must be compiled before migration generation
- **PGlite single-connection** — only one process can connect at a time. Don't run migration checks in `dev-runner.ts` AND the server simultaneously. See [`GOTCHAS.md`](../../GOTCHAS.md).
- **64 schema files** — maintain alphabetical ordering and consistent naming conventions

## Related Docs

| Doc | Purpose |
|-----|---------|
| [`doc/DATABASE.md`](../../doc/DATABASE.md) | Schema conventions and migration workflow |
| [`TASK_PATTERNS.md`](../../TASK_PATTERNS.md) | Full checklists for common changes |
| [`GOTCHAS.md`](../../GOTCHAS.md) | PGlite traps and Windows-specific issues |
