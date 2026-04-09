# Hermes Integration Architecture (Phase 1)
 
 ## The Paradigm Shift
 Paperclip has officially upgraded from a static "Agent Management System" (AMS) into an active, self-reflective **Organizational Operating System (COS)**. 
 
 Within this paradigm:
 1. **Paperclip** acts as the *OS Kernel*. It orchestrates database persistence, holds the UI rendering thread, provides authentication, and issues strict API protocols.
 2. **Hermes** acts as the *Independent Chief of Staff*. It lives purely outside the kernel codebase, communicating securely over HTTP to analyze telemetry and dictate organizational direction.
 
 ---
 
 ## The Observer Advice Loop
 The magic behind the Hermes integration is the **Observer Loop**. 
 
 Instead of forcing Hermes into the core Node application logic, the Paperclip API explicitly exposes raw agent "thoughts" to an external agent logic center.
 
 ### 1. Telemetry Subsystem
 - **Endpoint:** `GET /api/companies/:id/telemetry`
 - **Functionality:** Provides chronological streaming of agent monologues, tool usages, and system errors directly out of the `heartbeat_run_events` database.
 
 ### 2. The Hermes Inference Action
 - Hermes asynchronously polls the telemetry endpoint on an interval.
 - It aggregates chunks of telemetry and pipes it through the native local **Ollama** LLM pipeline.
 - Hermes' prompt specifically looks for *inefficiencies*, *repeated mistakes*, or *behavioral loops* made by other working agents in your system.
 
 ### 3. Approval System Injection
 - **Endpoint:** `POST /api/companies/:id/approvals`
 - When Hermes mathematically identifies a flawed pattern, it submits a new `approve_observer_insight` payload.
 - The `ObserverInsightPayload` UI renders a specialized widget in Paperclip, alerting the Operator ("Board") that Hermes has a recommendation to alter the workspace or provide a new SKILL.md.
 
 ---
 
 ## How to Execute the Ecosystem
 
 As of the completion of this Phase 1 structure, you no longer need to reboot Paperclip to run background checks. 
 
 1. Ensure `PGLite` or Postgres is running.
 2. Ensure Paperclip (`pnpm dev`) is online.
 3. Execute the observer daemon independently in a detached terminal:
    ```sh
    npx tsx scripts/hermes_observer.ts --daemon
    ```
 
 Hermes will now perpetually hover over your organization, suggesting improvements.
