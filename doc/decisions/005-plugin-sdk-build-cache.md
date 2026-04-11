# ADR-005: Plugin SDK Build Caching

- **Status:** Accepted
- **Date:** 2026-04-10

## Context

Every `pnpm dev` restart triggered a full `tsc` build of `@paperclipai/plugin-sdk` (~15 seconds on Windows). This made the dev loop painful — 15 seconds of mandatory compilation before the server even starts.

## Decision

Check for `dist/index.js` existence before rebuilding the plugin SDK. If the output already exists, skip the build.

## Consequences

- ✅ Dev restarts go from ~20s to ~5s
- ⚠️ If you change plugin SDK source, you must manually rebuild: `pnpm --filter @paperclipai/plugin-sdk build`
- ⚠️ After `git pull` with SDK changes, the cache may be stale — delete `packages/plugins/sdk/dist/` to force rebuild
