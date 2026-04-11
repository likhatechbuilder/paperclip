# ADR-006: External-Only Hermes Adapter

- **Status:** Accepted
- **Date:** 2026 (fork branch: feat/externalize-hermes-adapter)

## Context

The Hermes adapter was originally built into the core codebase. This created tight coupling — Hermes-specific code in `server/`, `ui/`, and `cli/` source trees. The adapter plugin system (PR #2218) made external adapters possible.

## Decision

Remove all built-in Hermes code from core. Hermes is now installed as an external adapter plugin via `~/.paperclip/adapter-plugins.json` or the Board's Adapter Manager UI.

## Consequences

- ✅ Core has zero Hermes imports — pure dynamic loading
- ✅ UI uses generic config-schema + ui-parser.js from the package
- ✅ Same install path as Droid and any future external adapter
- ⚠️ Hermes must be installed before it can be used (not built-in anymore)
- ⚠️ `createServerAdapter()` must include ALL optional fields (especially `detectModel`)
