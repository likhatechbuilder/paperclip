# Research: Ollama Integration (V1 Revisions)

## Objective
Deepen the integration of local inference (Ollama) into the Paperclip control plane. All local agents should prioritize Ollama for coding and low-latency tasks when available.

## Status Mapping
- **Local API**: `http://localhost:11434` (REACHABLE)
- **Preferred Models**: `codellama`, `deepseek-coder`, `llama3`
- **Adapter**: `ollama-local` (MERGED to master)
- **Dashboard Synchronization**: In progress

## Implementation Plan (Revisions)

### 1. Refined Adapter (ollama-local)
- [ ] Add `testConnection` health check to the server adapter.
- [ ] Implement `pullModel` logic via CLI/API if a requested model is missing.
- [ ] Support streaming logs for local inference runs.

### 2. Shared Context Protocol
- [x] Create `research.md` (this file).
- [ ] Create `.paperclip/memento.json` for agent local memory persistence.
- [ ] Integrate `research.md` as context for ALL agents using the Ollama adapter.

### 3. Agent Lifecycle: The "Mission Request" Flow
- When an Ollama agent is stuck, it must draft a **Mission Request**.
- Mission Requests are posted as `issue_comments` with a specific `[MISSION_REQUEST]` tag.
- Jules (the Architect) monitors these tags to provide guidance or switch to higher-res models (Claude/Gemini).

## Shared Observations
- *Antigravity*: Confirmed Ollama connectivity at 2026-03-31T21:15:20.
- *Antigravity*: Merged 'jules' and master; verified adapter registration in CLI and server routes.
- *Antigravity*: Operational Protocol activated.
