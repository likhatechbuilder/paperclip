# ADR-007: Hermes Observer God Architecture

**Date:** 2026-04-11
**Status:** Accepted
**Author:** Lead Architect

## Context

Paperclip manages multiple AI agents working across companies. Agents can
make mistakes, develop inefficient patterns, or drift from conventions.
There is no system-level mechanism to detect these issues across agents
and automatically improve organizational knowledge.

## Decision

Hermes is implemented as a **system-level Observer God** — a TypeScript
daemon that runs alongside the Paperclip server. Key design choices:

### 1. Hermes is NOT an agent

Hermes does not appear in the agents list. It does not take issues. It
does not write code. It is a platform-level overseer that sits above all
agents and all companies.

### 2. Ollama is the inference provider

The observer uses the local Ollama HTTP API for analysis. This means:
- Zero cloud cost for observation cycles
- Works offline
- Any local model can be used (llama3, gemma4, etc.)
- Context window is bounded — telemetry is chunked to fit

### 3. All active companies are observed

Hermes iterates over ALL companies with `status: "active"` each cycle.
It does not need per-company configuration.

### 4. Output is approval-gated

Hermes NEVER directly modifies files, skills, or conventions. Every
insight goes through the Approval system (`POST /api/companies/:id/approvals`).
The human Board must explicitly approve before any change takes effect.

### 5. Rate-limited to prevent feedback loops

Maximum 3 insights per observation cycle. If Hermes updates a skill that
changes agent behavior, the next observation cycle sees different telemetry.
Without rate limiting, this creates infinite optimization loops.

### 6. Context is chunked to fit bounded windows

Telemetry is formatted into a text stream and truncated at a configurable
character limit (default: 12,000 chars ≈ ~3,000 tokens). This ensures
even small local models like Llama 3 8B can process it.

## Alternatives Considered

- **Python daemon in hermes-agent repo** — more powerful (30+ tools,
  memory, context compression) but requires maintaining a separate codebase.
  Can be pursued as Phase 2.

- **Hermes as a registered agent** — breaks the "observer never interferes"
  rule because agents can be assigned issues and have heartbeats.

## Consequences

- A new long-running process (`scripts/hermes-observer.ts`) must be started
  alongside `pnpm dev`
- Ollama must be running for the observer to function
- The Approval system becomes the primary feedback channel for organizational
  improvements
