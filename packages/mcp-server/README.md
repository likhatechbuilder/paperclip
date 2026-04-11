# Paperclip MCP Server

Model Context Protocol server for Paperclip.

This package is a thin MCP wrapper over the existing Paperclip REST API. It does
not talk to the database directly and it does not reimplement business logic.

## Authentication

The server reads its configuration from environment variables:

- `PAPERCLIP_API_URL` - Paperclip base URL, for example `http://localhost:3100`
- `PAPERCLIP_API_KEY` - bearer token used for `/api` requests
- `PAPERCLIP_COMPANY_ID` - optional default company for company-scoped tools
- `PAPERCLIP_AGENT_ID` - optional default agent for checkout helpers
- `PAPERCLIP_RUN_ID` - optional run id forwarded on mutating requests

## Usage

```sh
npx -y @paperclipai/mcp-server
```

Or locally in this repo:

```sh
pnpm --filter @paperclipai/mcp-server build
node packages/mcp-server/dist/stdio.js
```

## Tool Surface

Read tools:

- `paperclipMe`
- `paperclipInboxLite`
- `paperclipListAgents`
- `paperclipGetAgent`
- `paperclipListIssues`
- `paperclipGetIssue`
- `paperclipGetHeartbeatContext`
- `paperclipListComments`
- `paperclipGetComment`
- `paperclipListIssueApprovals`
- `paperclipListDocuments`
- `paperclipGetDocument`
- `paperclipListDocumentRevisions`
- `paperclipListProjects`
- `paperclipGetProject`
- `paperclipListGoals`
- `paperclipGetGoal`
- `paperclipListApprovals`
- `paperclipGetApproval`
- `paperclipGetApprovalIssues`
- `paperclipListApprovalComments`

Write tools:

- `paperclipCreateIssue`
- `paperclipUpdateIssue`
- `paperclipCheckoutIssue`
- `paperclipReleaseIssue`
- `paperclipAddComment`
- `paperclipUpsertIssueDocument`
- `paperclipRestoreIssueDocumentRevision`
- `paperclipCreateApproval`
- `paperclipLinkIssueApproval`
- `paperclipUnlinkIssueApproval`
- `paperclipApprovalDecision`
- `paperclipAddApprovalComment`

Escape hatch:

- `paperclipApiRequest`

`paperclipApiRequest` is limited to paths under `/api` and JSON bodies. It is
meant for endpoints that do not yet have a dedicated MCP tool.

## How It Works

```
┌──────────────────┐     HTTP/REST     ┌──────────────────┐
│  AI Agent (LLM)  │  ───MCP stdio───▶ │  MCP Server      │ ──────────▶  Paperclip API
│  (Claude, etc.)  │  ◀──responses───  │  (this package)  │ ◀──────────  /api/*
└──────────────────┘                   └──────────────────┘
```

The MCP server is a **thin proxy** — it translates MCP tool calls into REST API requests. It does NOT:
- Talk to the database directly
- Reimplement business logic
- Store state

## For AI Agents

### ⚡ Task Granulization

MCP server changes are typically isolated to this package. Decompose:

1. **New read tool:** Add tool definition → implement API fetch → register tool → test manually
2. **New write tool:** Add tool definition → implement API fetch → add auth header forwarding → test
3. **Fix existing tool:** Identify the API endpoint it calls → verify server-side behavior → fix mapping

### Key Rules

- **Mirror the REST API** — every tool should map 1:1 to an API endpoint
- **Forward auth** — always pass `PAPERCLIP_API_KEY` as bearer token
- **Validate inputs** — use JSON Schema for tool parameters

### Verification

```bash
pnpm --filter @paperclipai/mcp-server build
PAPERCLIP_API_URL=http://localhost:3100 node packages/mcp-server/dist/stdio.js
```

## Related Docs

| Doc | Purpose |
|-----|---------|
| [`server/README.md`](../../server/README.md) | Server API surface and route documentation |
| [`AGENTS.md`](../../AGENTS.md) | Repo contribution rules |
| [`TASK_PATTERNS.md`](../../TASK_PATTERNS.md) | Step-by-step checklists |
