# TASK_PATTERNS.md — Step-by-Step Checklists for Common Changes

> Each pattern below is a recipe. Follow the steps in order.
> If you add a new pattern, keep the same structure.

---

## 1. Add a New API Route

1. **Define the route path constant** in `packages/shared/src/api-paths.ts`
2. **Create the route handler** in `server/src/routes/<domain>.ts`
   - Use existing route files as templates (e.g., `agents.ts`, `issues.ts`)
   - Apply company-scoping middleware
   - Add activity logging for mutations
3. **Register the route** in `server/src/app.ts` — import and `.use()` the router
4. **Add shared types** if needed in `packages/shared/src/types/`
5. **Add UI API client function** in `ui/src/api/`
6. **Wire up the UI page/component** in `ui/src/pages/` or `ui/src/components/`
7. **Verify**:
   ```bash
   pnpm -r typecheck
   pnpm test:run
   curl http://localhost:3100/api/<your-route>
   ```

---

## 2. Add a New Database Table

1. **Create schema file** in `packages/db/src/schema/<table>.ts`
   - Follow Drizzle conventions — see existing `agents.ts`, `issues.ts` as templates
   - Include `companyId` FK for company-scoped entities
2. **Export from barrel** in `packages/db/src/schema/index.ts`
3. **Generate migration**:
   ```bash
   pnpm db:generate
   ```
4. **Add shared types** in `packages/shared/src/types/`
5. **Create service layer** in `server/src/services/<domain>.ts`
6. **Create route handlers** in `server/src/routes/<domain>.ts`
7. **Verify**:
   ```bash
   pnpm -r typecheck
   pnpm test:run
   pnpm build
   ```

---

## 3. Add a New Agent Adapter

> Also read the `create-agent-adapter` skill at `.agents/skills/create-agent-adapter/SKILL.md`

1. **Create adapter package** in `packages/adapters/<name>/`
   - `package.json` with proper `name` and `exports` map
   - `src/server.ts` — implements `ServerAdapter` interface
   - `src/cli.ts` — implements CLI stream formatter
   - `src/ui-parser.ts` — (optional) UI config field renderer
2. **Register in server** — add entry in `server/src/adapters/registry.ts`
3. **Register in CLI** — add entry in `cli/src/adapters/registry.ts`
4. **Add UI renderer** — create file in `ui/src/adapters/<name>/`
5. **⚠️ Check export names match** between package and consumer (see GOTCHAS.md)
6. **Verify**:
   ```bash
   pnpm -r typecheck
   pnpm build
   ```

---

## 4. Modify Shared Types

1. **Edit types** in `packages/shared/src/types/<file>.ts` or `packages/shared/src/constants.ts`
2. **Update DB schema** if type change reflects a data model change
3. **Update validators** in `packages/shared/src/validators/`
4. **Check all consumers**:
   ```bash
   pnpm -r typecheck    # This will reveal all broken imports
   ```
5. **Fix server routes/services** that use the changed types
6. **Fix UI components** that use the changed types
7. **Fix CLI commands** if applicable
8. **Verify**:
   ```bash
   pnpm -r typecheck
   pnpm test:run
   ```

---

## 5. Fix a Windows-Specific Bug

1. **Identify the symptom** — hang, crash, wrong behavior
2. **Check GOTCHAS.md** — is this already documented?
3. **Apply a platform guard**:
   ```typescript
   if (process.platform === 'win32') {
     // Windows-safe alternative
   } else {
     // Original behavior
   }
   ```
4. **Test on Windows** — run `pnpm dev` and verify the fix
5. **Document the fix in GOTCHAS.md** — add a new section if it's a new class of bug
6. **Verify**:
   ```bash
   pnpm -r typecheck
   pnpm dev             # Must start without hanging
   ```

---

## 6. Create an Agent Company Package

> Use the `company-creator` skill at `.agents/skills/company-creator/SKILL.md`

1. **Interview** — determine purpose, agents, workflow pattern
2. **Generate package** in `companies/<slug>/`
   - `COMPANY.md` — spec header + mission
   - `agents/<role>.md` — per-agent profile + skills
   - `teams/<team>.md` — team definitions (if multi-team)
   - `knowledge/` — shared reference docs
   - `skills/` — reusable skill definitions
3. **Import into Paperclip**:
   ```bash
   npx paperclipai import ./companies/<slug>
   ```
4. **Verify** — check that agents appear in the Board UI

---

## 7. Run Full Verification

Before claiming any work is done:

```bash
# 1. Type-check all packages
pnpm -r typecheck

# 2. Run tests
pnpm test:run

# 3. Build everything
pnpm build

# 4. Start dev server (smoke test)
pnpm dev
# → Wait for "Paperclip is ready" banner
# → curl http://localhost:3100/api/health
```

If `pnpm build` hangs on Windows, use:
```bash
node node_modules/vite/bin/vite.js build
```

---

## 8. Create a Feature Branch & PR

1. **Branch naming**: `feat/<short-slug>`, `fix/<short-slug>`, `docs/<short-slug>`
2. **Read the PR template**: `.github/PULL_REQUEST_TEMPLATE.md`
3. **Fill ALL sections** including:
   - Thinking Path
   - What Changed
   - Verification
   - Risks
   - Model Used
4. **Run verification** (pattern #7 above) before opening PR
