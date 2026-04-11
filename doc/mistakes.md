# Known Mistakes & Anti-Patterns — Do Not Repeat

> Every entry here cost real debugging time. If you're an AI agent, read this before attempting any fix.
> When you discover a new anti-pattern, add it here.

---

## Platform Anti-Patterns (Windows/NTFS)

### ❌ Using `fs.realpathSync()` in hot paths
**What happened:** Silent event-loop deadlock. Process freezes forever with zero output.
**Root cause:** `realpathSync` on NTFS can trigger a synchronous kernel call that never returns when the filesystem is under load from watchers.
**Correct approach:** Use `process.platform === "win32"` guard to skip, or use async `fs.realpath()`.
**Files patched:** `server/src/config.ts`, `server/src/dev-watch-ignore.ts`, `scripts/ensure-workspace-package-links.ts`
**ADR:** See `doc/decisions/004-tsx-watch-bypass-windows.md`

### ❌ Comparing file paths case-sensitively on Windows
**What happened:** `isMainModule()` check failed — server started but `startServer()` never executed.
**Root cause:** `import.meta.url` returns `file:///f:/...` (lowercase) but `process.argv` resolves as `F:\...` (uppercase). Case-sensitive comparison returns false.
**Correct approach:** Normalize both sides to `.toLowerCase()` before comparing.
**File patched:** `server/src/index.ts`

### ❌ Using `npx vite build` on NTFS
**What happened:** Build hangs indefinitely with no output.
**Correct approach:** Use `node node_modules/vite/bin/vite.js build` directly.

### ❌ Using `tsx watch` on Windows
**What happened:** Zombie `node.exe` processes accumulate. Ports stay locked after stopping.
**Correct approach:** Use plain `tsx` and let `dev-runner.ts` handle file watching.
**ADR:** See `doc/decisions/004-tsx-watch-bypass-windows.md`

---

## Database Anti-Patterns

### ❌ Running concurrent PGlite connections
**What happened:** Database lock contention. Migration checks in `dev-runner.ts` locked the DB while the server was trying to connect.
**Root cause:** PGlite (embedded postgres) supports only ONE active connection per process.
**Correct approach:** Only the server process connects to PGlite. `dev-runner.ts` skips migration checks on Windows.
**ADR:** See `doc/decisions/001-embedded-postgres.md`

### ❌ Using PostgreSQL enums for status fields
**What happened:** (Preventive) Enum migrations are notoriously difficult — adding values requires `ALTER TYPE` which can't run inside a transaction.
**Correct approach:** Use `text` columns with CHECK constraints. See `CONVENTIONS.md`.

---

## Adapter Anti-Patterns

### ❌ Missing `.js` extension in relative imports
**What happened:** TS2835 errors during `pnpm -r typecheck`. Imports compile fine in some configs but fail under Node16 module resolution.
**Correct approach:** Always use `.js` extensions: `import { foo } from "./bar.js"`.
**Files patched:** `packages/adapters/ollama-local/src/server/index.ts`

### ❌ Registering adapter in only one registry
**What happened:** Adapter works from CLI but not from UI (or vice versa). Silent failure — no error, just missing config fields or missing execution.
**Root cause:** Adapters have THREE separate registries (server, CLI, UI). Missing any one causes silent failure.
**Correct approach:** Always update all three. See `CONVENTIONS.md` and `TASK_PATTERNS.md` pattern #3.
**ADR:** See `doc/decisions/002-three-adapter-registries.md`

### ❌ Export name mismatch between adapter package and consumer
**What happened:** `SyntaxError: does not provide an export named 'X'` at runtime.
**Example:** `@paperclipai/adapter-ollama-local/cli` exports `formatStdoutEvent` but CLI registry imported `printOllamaStreamEvent`.
**Correct approach:** Verify export names match exactly. Use `import { X as Y }` if renaming is needed.

---

## Build System Anti-Patterns

### ❌ Rebuilding plugin SDK on every dev restart
**What happened:** 15-second mandatory compilation tax before server starts.
**Correct approach:** Check for `dist/index.js` existence and skip if present.
**ADR:** See `doc/decisions/005-plugin-sdk-build-cache.md`
**Caveat:** After changing SDK source, manually rebuild: `pnpm --filter @paperclipai/plugin-sdk build`

### ❌ Running `pnpm -r typecheck` only at the end
**What happened:** Cascading type errors across 4+ packages. Impossible to tell which change broke what.
**Correct approach:** Typecheck after EVERY sub-task, not just at the end. See `AGENTS.md` §2.1.

---

## Documentation Anti-Patterns

### ❌ Replacing strategic docs wholesale
**What happened:** Agent rewrote `doc/SPEC.md` entirely, losing nuance and decisions from months of work.
**Correct approach:** Prefer additive updates. Only replace when explicitly asked.

### ❌ Not reading GOTCHAS.md before making changes
**What happened:** Agent spent 2 hours debugging a `realpathSync` deadlock that was already documented.
**Correct approach:** Read `GOTCHAS.md` first. Every time. Especially on Windows.
