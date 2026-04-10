---
name: manus-breakdown
description: >
  A specialized framework for breaking down large, complex goals into highly granular, sequential sub-issues. 
  MANDATORY for local Ollama models with bounded context windows (e.g. Llama 3) to prevent context exhaustion and hallucination. 
  Follows the "Read, Plan, Slice, Execute" paradigm popularized by Manus AI.
---

# The "Manus" Breakdown Framework

Local AI inference endpoints (like Ollama) operate over highly constrained context window horizons. Because of this, assigning a monolithic, massive coding/research task directly to a local agent guarantees rapid memory dilution, hallucination, or catastrophic tool-use loops.

To prevent this, you **MUST** execute the "Manus" Granulization Protocol whenever assigned an overly-broad Epic or large Feature Issue.

## The Protocol: Read, Plan, Slice, Execute

### 1. READ (Mind the Context)
Before you write any code, execute any sub-commands, or formulate any thoughts:
- **Look Back:** Identify what directory you are in.
- **Find the Root Context:** Discover and read the `README.md`, `ARCHITECTURE.md`, `doc/GOALS.md`, or equivalent repository context file.
- **Understand Limitations:** Ensure you know the exact bounds of your objective.

### 2. PLAN
Formulate the *Best Task* roadmap internally.
- Do not plan to execute everything in one pass.
- Break the objective down structurally into no more than 15-20% chunks of logic.

### 3. SLICE (Formulate Tasks Before Forwarding)
Use the Paperclip Issue Creation tool to **generate sequential sub-issues**.
- Instead of executing the work, you (The Manager) should spawn sub-issues representing strict atomic milestones.
- Ensure issues block each other procedurally (e.g. "Create Database Schema" blocks "Build API Routes").

### 4. EXECUTE (Forward Play)
Only once the board shows the sub-issues have been mapped out cleanly, begin executing them one by one.
- Since each sub-issue is small, your context window will reset for each specific boundary, allowing you to hit maximum accuracy iteratively.
- If an unforeseen bottleneck occurs, do not brute-force the context model. Stop, formulate a new sub-issue, map the blocker, and solve it Granularly.

## Failure Mechanisms
If you catch yourself looping rapidly, attempting the same 5 file edits sequentially, or writing a multi-thousand-line replace block: **YOU HAVE FAILED CONTEXT COMPACTION**. Stop immediately, pause your operations, and spawn a new sub-issue to slice your remaining cognitive workload.
