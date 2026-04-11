# Coding Conventions

> Canonical reference for coding style in this repo. When in doubt, follow what's here — not patterns from training data.

---

## TypeScript

### Imports
- **Always use `.js` extensions** in relative imports (Node16/ESM requirement)
  ```typescript
  // ✅ Correct
  import { execute } from "./execute.js";
  import type { Agent } from "./types.js";

  // ❌ Wrong — will cause TS2835 at typecheck
  import { execute } from "./execute";
  ```
- **Prefer `type` imports** when importing only types:
  ```typescript
  import type { Agent, Issue } from "@paperclipai/shared";
  ```
- **No deep imports** from other packages — always import from the package barrel (`index.ts`):
  ```typescript
  // ✅ Correct
  import { companies, agents } from "@paperclipai/db";

  // ❌ Wrong — bypasses the public API
  import { companies } from "@paperclipai/db/src/schema/companies";
  ```

### Naming
| Thing | Convention | Example |
|-------|-----------|---------|
| Schema files | `snake_case.ts` matching table name | `cost_events.ts`, `heartbeat_runs.ts` |
| Route files | `kebab-case.ts` matching domain | `agents.ts`, `company-export.ts` |
| Service files | `kebab-case.ts` matching domain | `run-orchestrator.ts`, `cost-tracking.ts` |
| React components | `PascalCase.tsx` | `AgentDetail.tsx`, `RunTranscriptView.tsx` |
| Hooks | `camelCase.ts` with `use` prefix | `useCompany.ts`, `useApi.ts` |
| Boolean variables | `is`/`has`/`should` prefix | `isRunning`, `hasAccess`, `shouldAutoApply` |
| Constants | `SCREAMING_SNAKE_CASE` | `ISSUE_STATUSES`, `API_PATHS` |

### Error Handling
- **Never silently swallow errors.** Always log or surface them:
  ```typescript
  // ✅ Correct
  try { ... } catch (err) {
    logger.error({ err }, "Failed to checkout issue");
    throw err;
  }

  // ❌ Wrong
  try { ... } catch {}
  ```
- **Use consistent HTTP error codes:** `400/401/403/404/409/422/500`

---

## Database (Drizzle ORM)

### Schema Rules
- **Every domain table has `companyId` FK** — no exceptions. Multi-tenant isolation is a control-plane invariant.
- **UUID primary keys** with `gen_random_uuid()` default
- **Timestamps:** `createdAt` and `updatedAt` on most tables
- **Status fields:** Use `text` with CHECK constraints, **not** PostgreSQL enums (enums are painful to migrate)
- **New tables must be exported** from `packages/db/src/schema/index.ts`

### Migration Rules
- Run `pnpm db:generate` after schema changes (it compiles to `dist/` first)
- Never hand-edit generated migration SQL
- Drizzle config reads from `dist/schema/*.js`, not TypeScript source

---

## API Routes (Express)

### Structure
- **All routes under `/api`**
- **Company scoping** enforced via middleware on every domain route
- **Activity log entry** for every mutation (create, update, delete, checkout)
- **Consistent return shapes:**
  ```typescript
  // Success
  res.json({ data: result });

  // Error
  res.status(404).json({ error: "not_found", message: "Issue not found" });
  ```

### Auth
- **Board access:** Session cookie (full control)
- **Agent access:** Bearer API key header (company-scoped only)
- Agent keys must **never** access other companies

### Adding a New Route
Follow [`TASK_PATTERNS.md`](TASK_PATTERNS.md) pattern #1:
1. Add path constant in `packages/shared/src/api.ts`
2. Create route handler in `server/src/routes/`
3. Register in `server/src/app.ts`
4. Add activity logging for mutations
5. `pnpm -r typecheck`

---

## UI (React)

### Component Rules
- Routes live in `ui/src/App.tsx` — the root router. No separate routes file.
- Every page must use `CompanyContext` to scope API calls
- Never silently ignore API errors — surface them to the user
- Use CSS custom properties from `index.css`, not ad-hoc colors

### Adapter UI
- One directory per adapter type in `ui/src/adapters/<name>/`
- Always create a `config-fields.tsx` rendering the adapter's configuration form
- Register in the UI adapter map

---

## Adapters

### Three Registries Rule
Every adapter **must** be registered in ALL THREE places:
1. `server/src/adapters/registry.ts` — server adapter module
2. `cli/src/adapters/registry.ts` — CLI stream formatter
3. `ui/src/adapters/<name>/` — UI config fields

Missing any one causes silent failure in that context.

### Package Naming
- Local adapters: `@paperclipai/adapter-<name>-local`
- Gateway adapters: `@paperclipai/adapter-<name>-gateway`
- External adapters: installed via `~/.paperclip/adapter-plugins.json`

---

## Git

### Commit Messages
- Use conventional commit format: `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`
- Reference issue numbers when applicable: `fix: resolve PGlite deadlock (#123)`

### Branch Naming
- Features: `feat/<short-slug>`
- Fixes: `fix/<short-slug>`
- Docs: `docs/<short-slug>`

---

## Cross-Cutting Rules

1. **Never use `realpathSync`** on Windows. See [`GOTCHAS.md`](GOTCHAS.md).
2. **Always typecheck** after changes: `pnpm -r typecheck`
3. **Don't replace strategic docs wholesale** — prefer additive updates
4. **Keep changes company-scoped** — every entity belongs to a company
