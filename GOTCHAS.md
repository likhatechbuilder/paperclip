# GOTCHAS.md — Hard-Won Fixes & Platform Traps

> Read this before making changes. Every item here cost real debugging time.
> When you discover a new gotcha, add it here.

---

## Windows / NTFS

### `fs.realpathSync()` causes event-loop deadlocks
**Symptom**: Server hangs silently forever with zero output.
**Root Cause**: On NTFS, `realpathSync` can deadlock the Node.js event loop when called during module initialization or in hot paths.
**Fix Pattern**: Always guard with `if (process.platform === "win32") return;` or use async `fs.realpath()`.
**Files patched**: `server/src/dev-watch-ignore.ts`, `server/src/config.ts`, `scripts/ensure-workspace-package-links.ts`

### Drive letter casing mismatch kills `isMainModule`
**Symptom**: Server starts via `tsx` but `startServer()` never executes — process exits silently.
**Root Cause**: `import.meta.url` returns `file:///f:/...` (lowercase) but `process.argv` resolves as `F:\...` (uppercase). The `isMainModule()` equality check fails.
**Fix**: Normalize both sides to lowercase before comparing on Windows.
**File**: `server/src/index.ts`

### `tsx watch` spawns zombie processes
**Symptom**: Port 3100 stays occupied after stopping the dev server. Multiple `node.exe` processes accumulate.
**Root Cause**: `tsx watch` on Windows doesn't properly clean up child processes on restart/exit.
**Fix**: Use plain `tsx` (non-watch mode) on Windows. `dev-runner.ts` already provides its own file-watching and restart logic, so `tsx watch` is redundant.
**File**: `scripts/dev-runner.ts` — `serverScript` selection bypasses `dev:watch` on `win32`.

### `npx vite build` hangs indefinitely on NTFS
**Symptom**: Build process locks up with no output.
**Fix**: Use `node node_modules/vite/bin/vite.js build` directly instead.

### Kill ALL processes before restarting
**Command**: `taskkill /F /IM node.exe /T` before running `pnpm dev`.
**Why**: Zombie `node.exe` processes from previous sessions hold ports and database locks.

---

## Database (Embedded PostgreSQL / PGlite)

### Only ONE connection per process
**Symptom**: Second DB connection attempt hangs forever or produces cryptic lock errors.
**Root Cause**: PGlite's embedded postgres only supports a single active connection per Node.js process.
**Rule**: Never run migration checks from `dev-runner.ts` AND the server simultaneously.
**Fix**: `refreshPendingMigrations()` in `dev-runner.ts` is bypassed on Windows — the server handles migrations via `PAPERCLIP_MIGRATION_AUTO_APPLY=true`.

### Reset local dev DB
```bash
rm -rf data/pglite
pnpm dev
```
The database will be recreated and migrations auto-applied on next startup.

---

## Build System

### Plugin SDK build is expensive (~15s)
**Symptom**: Every `pnpm dev` restart takes 15+ seconds before the server even starts.
**Root Cause**: `buildPluginSdk()` in `dev-runner.ts` always runs `tsc` even when outputs are fresh.
**Fix**: Check for `dist/index.js` existence before rebuilding. Already patched in `dev-runner.ts`.

### Workspace link verification can hang
**Symptom**: `preflight:workspace-links` script hangs indefinitely.
**Root Cause**: The script does deep `realpathSync` traversal of `node_modules`.
**Fix**: Bypassed entirely on Windows in `scripts/ensure-workspace-package-links.ts`.

---

## Adapters

### Export names MUST match between package and consumer
**Symptom**: `SyntaxError: does not provide an export named 'X'` on startup.
**Example**: `@paperclipai/adapter-ollama-local/cli` exports `formatStdoutEvent` but `cli/src/adapters/registry.ts` was importing `printOllamaStreamEvent`.
**Fix**: Use `import { formatStdoutEvent as printOllamaStreamEvent }` or rename the export.
**Rule**: When adding a new adapter, check that the export name in the package matches what `server/src/adapters/registry.ts` AND `cli/src/adapters/registry.ts` expect.

### Adapter registry exists in THREE places
1. `server/src/adapters/registry.ts` — server-side adapter modules
2. `cli/src/adapters/registry.ts` — CLI stream formatters
3. `ui/src/adapters/` — UI config field renderers

**Rule**: When adding or modifying an adapter, update ALL THREE registries.

---

## Environment Variables

### Critical env vars for dev
| Variable | Purpose | Default |
|----------|---------|---------|
| `PAPERCLIP_API_SERVER_ENTRY` | Forces `startServer()` execution from tsx wrapper | Not set (uses `isMainModule`) |
| `PAPERCLIP_UI_DEV_MIDDLEWARE` | Enables Vite dev middleware for hot-reload UI | `true` in dev |
| `PAPERCLIP_MIGRATION_AUTO_APPLY` | Auto-applies pending DB migrations | `true` in dev |
| `PAPERCLIP_MIGRATION_PROMPT` | Controls migration prompt behavior | `never` in dev |
| `DATABASE_URL` | External postgres URL; leave unset for embedded PGlite | Unset (uses PGlite) |

---

## Git & Multi-Account

### Multiple GitHub accounts on same machine
**Symptom**: Push/pull silently uses wrong account credentials.
**Fix**: Embed username in remote URL:
```bash
git remote set-url origin https://<USERNAME>@github.com/<OWNER>/<REPO>.git
```
Or enable per-repo credential caching:
```bash
git config --local credential.useHttpPath true
```
