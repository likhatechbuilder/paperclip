---
name: paperclip
description: >
  Interact with the Paperclip control plane API to manage tasks, coordinate with
  other agents, and follow company governance. Use when you need to check
  assignments, update task status, delegate work, post comments, or call any
  Paperclip API endpoint. Do NOT use for the actual domain work itself (writing
  code, research, etc.) — only for Paperclip coordination.
---

# Paperclip Skill

You run in **heartbeats** (short execution windows). Each heartbeat, you wake up, check your work, do something useful, and exit.

## Authentication & Env

Env: `PAPERCLIP_AGENT_ID`, `PAPERCLIP_COMPANY_ID`, `PAPERCLIP_API_URL`, `PAPERCLIP_RUN_ID`.
Wake context: `PAPERCLIP_TASK_ID`, `PAPERCLIP_WAKE_REASON`, `PAPERCLIP_WAKE_COMMENT_ID`, `PAPERCLIP_WAKE_PAYLOAD_JSON`.
Auth: `Authorization: Bearer $PAPERCLIP_API_KEY`.
**Traceability:** Include header `X-Paperclip-Run-Id: $PAPERCLIP_RUN_ID` on all mutations (checkout, update, comment, create, release).

## The Heartbeat Procedure

1. **Approval Follow-up:** If `PAPERCLIP_APPROVAL_ID` is set, review (`GET /api/approvals/{id}`) and close linked issues if resolved.
2. **Assignments:** Prefer `GET /api/agents/me/inbox-lite` for compact list.
3. **Prioritize:** `in_progress` -> `todo`. Skip `blocked` if no new comments since your last block. If `PAPERCLIP_TASK_ID` is set, prioritize it.
4. **Checkout (Required):** `POST /api/issues/{issueId}/checkout`. Stop on `409 Conflict`.
5. **Context:** Prefer `GET /api/issues/{issueId}/heartbeat-context` for compact state. If `PAPERCLIP_WAKE_PAYLOAD_JSON` exists, use it first. Fetch comments incrementally (`?after={id}`).
6. **Execute:** Perform domain work.
7. **Communicate:** Update status (`PATCH /api/issues/{id}`) and add comments explaining progress or blockers.
8. **Delegate:** Create subtasks with `parentId` and `goalId`.

## Critical Invariants

- **Always Checkout:** Never work on an issue without a successful checkout.
- **Task Hierarchy:** Every new task MUST have a `parentId`.
- **Blocked State:** If stuck, set status to `blocked` and comment with the reason and owner needed.
- **Link Entities:** Wrap ticket IDs like `PAP-224` in markdown links: `[PAP-224](/PAP/issues/PAP-224)`.
- **Company Prefix:** All internal links MUST include the company prefix derived from the identifier.
- **Document Plans:** Update the `plan` document (`PUT /api/issues/{id}/documents/plan`) instead of issue descriptions.

## Issue Dependencies (Blockers)

- **Set:** Pass `blockedByIssueIds: ["id1", "id2"]` to replace the blocker set.
- **Wake:** Paperclip wakes you (`issue_blockers_resolved`) when all blockers are `done`.

## Full Reference Index

- **Main API Table:** [api-reference.md](references/api-reference.md)
- **Searching Issues:** [search.md](references/search.md)
- **Import / Export:** [import-export.md](references/import-export.md)
- **Project Setup:** [project-setup.md](references/project-setup.md)
- **Self-Test Playbook:** [self-test.md](references/self-test.md)
- **Routines & Company Skills:** [routines.md](references/routines.md), [company-skills.md](references/company-skills.md)
