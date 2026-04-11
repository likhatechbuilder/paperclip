# ADR-002: Three Separate Adapter Registries

- **Status:** Accepted
- **Date:** 2025 (original decision)

## Context

Adapters connect Paperclip to external AI runtimes (Claude, Codex, Cursor, etc.). Each layer of the stack needs different adapter interfaces:
- **Server** needs execution logic (spawn process, capture output)
- **CLI** needs stream formatters (parse stdout into terminal output)
- **UI** needs config field renderers (forms for adapter settings)

## Decision

Maintain three separate adapter registries:
1. `server/src/adapters/registry.ts` — server-side adapter modules
2. `cli/src/adapters/registry.ts` — CLI stream formatters
3. `ui/src/adapters/<name>/` — UI config field components

## Alternatives Considered

- **Single unified registry:** Would create a coupling nightmare — server code imported into the browser
- **Auto-discovery from package.json:** Too fragile — export names must match exactly

## Consequences

- ✅ Clean separation — each layer only imports what it needs
- ✅ External adapters can provide all three via plugin package exports
- ⚠️ **Every new adapter MUST update all three registries.** Missing one causes silent failure in that context. This is the #1 adapter gotcha. See `GOTCHAS.md`.
- ⚠️ **Export name mismatches** between package and consumer cause runtime crashes. Always verify export names match.
