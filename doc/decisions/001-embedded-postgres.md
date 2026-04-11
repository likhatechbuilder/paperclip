# ADR-001: Embedded PostgreSQL (PGlite) Over SQLite

- **Status:** Accepted
- **Date:** 2025 (original decision)
- **Updated:** 2026-04-10

## Context

Paperclip needs a zero-config database for local dev that matches production PostgreSQL behavior exactly. SQLite has different SQL semantics (no `jsonb`, different date handling, no `gen_random_uuid()`).

## Decision

Use PGlite (embedded PostgreSQL) for dev mode. Leave `DATABASE_URL` unset in dev — the server auto-creates an embedded Postgres instance in `data/pglite/`.

## Alternatives Considered

- **SQLite:** Simpler, but SQL dialect differences cause deploy-time bugs
- **Docker PostgreSQL:** Works, but requires Docker running and isn't zero-config
- **External Postgres:** Works for prod, but adds setup friction for dev

## Consequences

- ✅ Same SQL in dev and prod — no dialect surprises
- ✅ Zero-config — just `pnpm dev`
- ⚠️ **Single-connection limitation:** PGlite only supports one active connection per process. Never run migration checks from `dev-runner.ts` AND the server simultaneously. See `GOTCHAS.md`.
- ⚠️ **NTFS performance:** Embedded Postgres on Windows NTFS is slower than on ext4/APFS
- Reset by deleting: `rm -rf data/pglite && pnpm dev`
