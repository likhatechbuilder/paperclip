---
name: manus-breakdown
description: >
  The Granular Task Decomposition framework for AI agents working on Paperclip.
  Prevents context exhaustion, hallucination, and amnesia by enforcing a strict
  6-phase workflow: Ground → Plan → Verify → Slice → Execute → Checkpoint.
  MANDATORY for any task touching 3+ packages or 6+ files.
---

# The Manus Breakdown Framework v2

AI agents — whether running on local Ollama, Claude, Codex, Gemini, or any other
provider — are subject to context window limits, training-data bias, and session
amnesia. Assigning a monolithic task to any agent risks:

- **Hallucination** — referencing files, functions, or APIs that don't exist
- **Amnesia** — forgetting decisions from earlier in the conversation
- **Drift** — using patterns from training data instead of this repo's conventions
- **Context exhaustion** — losing focus as the window fills up

This framework prevents all four failure modes.

## When to Use This Skill

| Condition | Action |
|-----------|--------|
| Task touches **1 package, ≤3 files** | Just do it. No decomposition needed. |
| Task touches **2-3 packages, 3-6 files** | Break into **3-5 sub-tasks**. |
| Task touches **3+ packages, 6+ files** | **MANDATORY: Full Manus protocol.** |
| Task touches **4+ packages, 10+ files** | Write plan in `doc/plans/`, get approval first. |

> These thresholds come from `AGENTS.md` §2.1.

---

## The Protocol: Ground → Plan → Verify → Slice → Execute → Checkpoint

### Phase 1: GROUND (Load Context Fortress)

Before writing any code, load the repo's context system in this exact order:

```
1. Read AGENTS.md            → Rules, anti-hallucination protocol, task sizing
2. Read CONVENTIONS.md       → How WE code (not training-data patterns)
3. Read GOTCHAS.md           → Platform traps (CRITICAL on Windows)
4. Read doc/mistakes.md      → Anti-patterns that cost real debugging time
5. Read STRUCTURE.md         → Repo map — know where everything lives
6. Read TASK_PATTERNS.md     → Pre-made checklists for common changes
```

Then load the relevant **machine-verifiable context**:

```
7. Read .context/shared-exports.md    → If task involves types/constants
8. Read .context/schema-snapshot.md   → If task involves database tables
9. Read .context/api-surface.md       → If task involves API routes
10. Read .context/adapter-registry.md → If task involves adapters
```

If `.context/` files are stale or missing, regenerate:
```bash
pnpm context:generate
```

**Why this order matters:** AGENTS.md tells you the rules. CONVENTIONS.md tells
you the patterns. GOTCHAS.md saves you from known traps. The `.context/` files
give you verifiable facts to check against before writing code.

### Phase 2: PLAN (Design Before Coding)

With full context loaded:

1. **State the goal** in one sentence.
2. **Identify the ripple chain** — which packages will this touch?
   ```
   packages/db → packages/shared → server → ui → cli
   ```
3. **Classify the task size** using the AGENTS.md table:
   - Tiny/Small → proceed directly to Execute
   - Medium → proceed to Slice (3-5 sub-tasks)
   - Large/Epic → proceed to Slice (8-15 sub-tasks), consider doc/plans/
4. **Check for relevant ADRs** — read `doc/decisions/*.md` to understand
   why the current architecture looks the way it does.

**Output:** A mental (or written) task list with explicit package ordering.

### Phase 3: VERIFY (Anti-Hallucination Gate)

Before ANY sub-task execution:

1. **For every file you plan to modify** → verify it exists with `list_dir` or `view_file`
2. **For every type/function you plan to import** → check `.context/shared-exports.md`
3. **For every table you plan to query** → check `.context/schema-snapshot.md`
4. **For every API endpoint you plan to call** → check `.context/api-surface.md`
5. **For every adapter you plan to touch** → check `.context/adapter-registry.md`

If something doesn't exist in `.context/`, it might be:
- New (you need to create it)
- In the source but not the barrel export (add it to index.ts)
- Hallucinated (drop it)

**This phase takes 30 seconds and saves hours of debugging.**

### Phase 4: SLICE (Decompose Into Sub-Tasks)

Convert your plan into atomic, ordered sub-tasks:

**Rules for slicing:**
1. **One concern per sub-task.** Never mix schema + route + UI in one task.
2. **Follow the dependency chain.** DB first, shared second, server third, UI last.
3. **Each sub-task must be independently verifiable** with `pnpm -r typecheck`.
4. **Name sub-tasks clearly** — "Add costEvents table to schema" not "Do database stuff".

**Slicing template (for Paperclip issues):**
```
Sub-task 1: [packages/db]     — Create/modify schema + generate migration
Sub-task 2: [packages/shared] — Add/update types + validators + API path constant
Sub-task 3: [server]          — Create/modify route + service layer
Sub-task 4: [ui]              — Create/modify page + API client
Sub-task 5: [verification]    — Full typecheck + smoke test
```

**For Paperclip board:** Create each sub-task as a separate issue with blocking
dependencies (sub-task 2 blocks on sub-task 1, etc.).

### Phase 5: EXECUTE (One Sub-Task at a Time)

For EACH sub-task:

1. **Re-read the relevant context** for that sub-task's package
2. **Execute the change** — keep edits minimal and focused
3. **Typecheck immediately:**
   ```bash
   pnpm -r typecheck    # MUST pass before moving to next sub-task
   ```
4. **If typecheck fails:** Fix before proceeding. Never stack changes on broken code.
5. **Move to next sub-task** only after current one passes verification.

**Windows-specific:**
- Never use `realpathSync` — see `GOTCHAS.md`
- Never use `npx vite build` — use `node node_modules/vite/bin/vite.js build`
- If server hangs on startup, check drive-letter casing — see `doc/decisions/004-tsx-watch-bypass-windows.md`

### Phase 6: CHECKPOINT (Capture Progress)

After completing ALL sub-tasks:

```bash
pnpm -r typecheck          # Must pass with exit code 0
git diff --stat             # Verify only intended files changed
pnpm context:generate       # Refresh .context/ files if you changed exports/schema/routes
```

If the task changed any exports, schema, or routes, the `.context/` files
are now stale. Regenerate them so the next agent (or your next session)
has accurate data.

---

## Recovery Protocol (When Context Is Lost)

If you feel confused, lost, or are making circular edits:

1. **STOP** — do not write more code.
2. **Read `STRUCTURE.md`** — recover where things live.
3. **Read `CONVENTIONS.md`** — recover how to code here.
4. **Read `doc/mistakes.md`** — check if you're hitting a known trap.
5. **Read `doc/decisions/*.md`** — understand why things are the way they are.
6. **Run `pnpm -r typecheck`** — find out what's actually broken.
7. **Slice the remaining work** into a new sub-issue and start fresh.

---

## Failure Detection

If ANY of these happen, you have **failed context compaction**:

| Symptom | Diagnosis | Remedy |
|---------|-----------|--------|
| Editing the same file 5+ times | Context thrashing | STOP. Slice into sub-issue. |
| Writing a 500+ line replacement block | Monolithic change | STOP. Break into 3-5 smaller edits. |
| Referencing a function that doesn't exist | Hallucination | Read `.context/shared-exports.md`. |
| Import works but runtime crashes | Export name mismatch | Read `.context/adapter-registry.md`. |
| Server hangs on startup | Windows NTFS trap | Read `GOTCHAS.md`. |
| Typecheck passes but server 500s | Missing company scope | Read `doc/decisions/003-company-scoped-everything.md`. |
| Reinventing a pattern that exists | Amnesia / drift | Read `CONVENTIONS.md` + `TASK_PATTERNS.md`. |

**The universal remedy:** STOP → SLICE → RECOVER → RESUME.
