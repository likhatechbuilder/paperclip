# ADR-004: tsx Watch Bypass on Windows

- **Status:** Accepted
- **Date:** 2026-04-10

## Context

`tsx watch` was the original hot-reload mechanism for the server. On Windows NTFS, it causes:
1. Zombie `node.exe` processes that survive restarts
2. Port locks that prevent re-binding to 3100
3. Event-loop deadlocks from filesystem watcher interactions

The `dev-runner.ts` script already has its own file-watching and restart logic, making `tsx watch` redundant.

## Decision

Bypass `tsx watch` on Windows (`process.platform === "win32"`). Use plain `tsx` (single-run) and let `dev-runner.ts` handle file-watching and process restarts.

## Alternatives Considered

- **Fix tsx watch on NTFS:** Attempted, but the root cause is deep in the `esbuild` file watcher
- **Use nodemon:** Adds another dependency with similar NTFS issues
- **chokidar direct:** dev-runner already uses chokidar internally

## Consequences

- ✅ No more zombie processes
- ✅ No more port locks after restart
- ✅ Dev-runner's existing watcher provides equivalent hot-reload
- ⚠️ Slightly longer restart (no incremental compilation), but acceptable (~2-3s)
