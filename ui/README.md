# @paperclipai/ui — Board UI

React + Vite single-page application for the Paperclip control plane. This is the operator dashboard where you manage companies, agents, issues, goals, budgets, and agent runs.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 18 + TypeScript |
| Build | Vite 5 |
| Routing | React Router v6 |
| Styling | Vanilla CSS (custom design system in `index.css`) |
| State | React Context + custom hooks |
| API | Fetch-based clients in `api/` |

## Architecture

```
ui/src/
├── App.tsx                  # Root router — ALL page routes defined here
├── main.tsx                 # Vite entrypoint, context providers
├── index.css                # Global design system (tokens, utilities, components)
│
├── pages/                   # Full-page route components (45 pages)
│   ├── Dashboard.tsx        # Company dashboard with run cards and metrics
│   ├── Issues.tsx           # Issue list (tickets/tasks)
│   ├── IssueDetail.tsx      # Single issue view with comments, runs, documents
│   ├── Agents.tsx           # Agent list with status indicators
│   ├── AgentDetail.tsx      # Agent config, runs, heartbeat controls
│   ├── Projects.tsx         # Project list
│   ├── ProjectDetail.tsx    # Project settings, workspaces, issues
│   ├── Goals.tsx            # Goal hierarchy
│   ├── GoalDetail.tsx       # Goal progress and linked issues
│   ├── Inbox.tsx            # Unified inbox (assignments, mentions, approvals)
│   ├── Costs.tsx            # Budget tracking and cost analytics
│   ├── Routines.tsx         # Scheduled routine management
│   ├── Companies.tsx        # Company list and company switcher
│   ├── CompanySettings.tsx  # Company-level configuration
│   ├── CompanyImport.tsx    # Import company packages (agentcompanies/v1)
│   ├── CompanyExport.tsx    # Export company to portable package
│   ├── CompanySkills.tsx    # Skills manager
│   ├── AdapterManager.tsx   # External adapter plugin management
│   ├── PluginManager.tsx    # Plugin installation and configuration
│   ├── OrgChart.tsx         # Visual org chart with reporting lines
│   ├── Approvals.tsx        # Approval gates and governance
│   ├── Activity.tsx         # Activity log (audit trail)
│   └── ...                  # Auth, Settings, Design Guide, etc.
│
├── components/              # Shared UI components
│   ├── Sidebar.tsx          # Main navigation sidebar
│   ├── IssueRow.tsx         # Issue list item component
│   ├── RunTranscriptView.tsx# Agent run transcript viewer
│   ├── LatestRunCard.tsx    # Dashboard run summary card
│   └── ...                  # Buttons, modals, forms, etc.
│
├── adapters/                # Per-adapter UI config field renderers
│   ├── claude-local/        # Claude Code config fields
│   ├── codex-local/         # Codex config fields
│   ├── cursor-local/        # Cursor config fields
│   ├── ollama-local/        # Ollama config fields
│   ├── gemini-local/        # Gemini CLI config fields
│   └── ...                  # One directory per adapter type
│
├── api/                     # API client functions (fetch wrappers)
│   ├── agents.ts            # Agent CRUD + heartbeat APIs
│   ├── issues.ts            # Issue CRUD + checkout + comments
│   ├── companies.ts         # Company management APIs
│   └── ...                  # Goals, projects, costs, approvals, etc.
│
├── context/                 # React Context providers
│   ├── CompanyContext.tsx    # Active company selection
│   ├── AuthContext.tsx       # Board auth state
│   └── ThemeContext.tsx      # Dark/light theme
│
├── hooks/                   # Custom React hooks
│   ├── useCompany.ts        # Access active company
│   ├── useApi.ts            # Fetch wrapper with error handling
│   └── ...
│
├── plugins/                 # Plugin UI bridge components
│   └── PluginSlotRenderer.tsx # Dynamic plugin component mounting
│
└── lib/                     # Utility functions
    ├── format.ts            # Date, currency, number formatting
    └── ...
```

## Development

The UI is served by the Express server in dev mode via Vite dev middleware. You don't need to run a separate UI dev server.

```bash
# Start full dev (server + UI hot-reload)
pnpm dev

# Access at http://localhost:3100
```

### Build

```bash
# Standard build
pnpm --filter @paperclipai/ui build

# Windows NTFS workaround (if npx vite build hangs)
node node_modules/vite/bin/vite.js build
```

### Design System

The design system lives in `index.css` with CSS custom properties (tokens):

- `--color-*` — color palette tokens
- `--radius-*` — border radius tokens  
- `--spacing-*` — spacing scale
- `--font-*` — typography tokens

No external CSS framework is used. All styling is vanilla CSS with custom properties.

## For AI Agents

### ⚡ Task Granulization

UI changes tend to cascade. Follow these atomic steps:

1. **New page:** Create file in `pages/`, add route in `App.tsx`, add nav link in Sidebar — typecheck
2. **New API client:** Add function in `api/`, then use in page — typecheck
3. **New adapter UI:** Create directory in `adapters/<name>/`, add `config-fields.tsx`, register in adapter UI registry — typecheck
4. **Styling changes:** Edit `index.css` tokens, verify in browser, then check other pages aren't broken

### Key Rules

- **Routes live in `App.tsx`** — the root router. There is no separate routes file.
- **Company scoping** — every page that shows data must use `CompanyContext` to scope API calls
- **Error surfaces** — never silently swallow API errors. Surface them to the user.
- **Three registries for adapters** — `server/src/adapters/registry.ts`, `cli/src/adapters/registry.ts`, AND `ui/src/adapters/`. All three must be in sync.

### Fork QoL Patches

If you're on the HenkDz fork, these UI patches must be preserved when re-copying source:

1. **`stderr_group`** — amber accordion for MCP init noise in `RunTranscriptView.tsx`
2. **`tool_group`** — accordion for consecutive non-terminal tools (write, read, search, browser)
3. **`Dashboard excerpt`** — `LatestRunCard` strips markdown, shows first 3 lines/280 chars

### Verification

```bash
pnpm --filter @paperclipai/ui typecheck   # Type-check UI
pnpm -r typecheck                          # Type-check everything
pnpm dev                                   # Visual verification in browser
```

## npm Package

The published npm package (`@paperclipai/ui`) contains only the production build under `dist/`. It does not ship the UI source tree or workspace-only dependencies. Install the package, then serve or copy the built files from `node_modules/@paperclipai/ui/dist`.

## Related Docs

| Doc | Purpose |
|-----|---------|
| [`AGENTS.md`](../AGENTS.md) | Repo contribution rules |
| [`STRUCTURE.md`](../STRUCTURE.md) | Full repo directory map |
| [`TASK_PATTERNS.md`](../TASK_PATTERNS.md) | Step-by-step checklists |
| [`GOTCHAS.md`](../GOTCHAS.md) | Platform traps and known issues |
| [`packages/plugins/sdk/README.md`](../packages/plugins/sdk/README.md) | Plugin SDK for UI extension slots |
