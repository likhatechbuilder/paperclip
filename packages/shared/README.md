# @paperclipai/shared — Shared Types, Constants, and Validators

Cross-package shared definitions consumed by `server`, `ui`, `cli`, and adapter packages. This package is the **single source of truth** for API contracts, type definitions, constants, and validation logic.

## What This Package Contains

| Category | Files | Purpose |
|----------|-------|---------|
| **Types** | `src/types/*.ts` | TypeScript interfaces and type aliases for all domain entities |
| **Constants** | `src/constants.ts` | Enum-like string unions, default values, status labels |
| **Validators** | `src/validators/*.ts` | Zod schemas for request/response validation |
| **API paths** | `src/api.ts` | API endpoint path constants |
| **Adapter types** | `src/adapter-type.ts` | Known adapter type union |
| **Config schema** | `src/config-schema.ts` | JSON Schema for adapter configuration |
| **Barrel export** | `src/index.ts` | Re-exports everything (~19KB of declarations) |

## Architecture

```
packages/shared/
├── src/
│   ├── index.ts                    # Barrel — re-exports all public types/constants
│   ├── constants.ts                # Status enums, defaults, labels (20KB)
│   ├── api.ts                      # API path constants
│   ├── adapter-type.ts             # Adapter type string union
│   ├── config-schema.ts            # JSON Schema for adapter configs
│   ├── types/                      # Domain type definitions
│   │   ├── agent.ts                # Agent interfaces
│   │   ├── issue.ts                # Issue/ticket types
│   │   ├── company.ts              # Company types
│   │   ├── goal.ts                 # Goal types
│   │   ├── run.ts                  # Run/heartbeat types
│   │   ├── cost.ts                 # Budget/cost types
│   │   ├── plugin.ts               # Plugin types
│   │   └── ...
│   ├── validators/                 # Zod validation schemas
│   │   ├── agent.ts                # Agent create/update validators
│   │   ├── issue.ts                # Issue validators
│   │   └── ...
│   ├── project-mentions.ts         # @-mention parsing for projects
│   ├── routine-variables.ts        # Template variable resolution for routines
│   └── telemetry/                  # Telemetry event definitions
│
├── package.json
└── tsconfig.json
```

## Usage

```typescript
import {
  type Agent,
  type Issue,
  type Company,
  ISSUE_STATUSES,
  AGENT_ADAPTER_TYPES,
  API_PATHS,
} from "@paperclipai/shared";

// Type safety for domain entities
const agent: Agent = { ... };

// String union constants
if (issue.status === ISSUE_STATUSES.IN_PROGRESS) { ... }

// API path construction
const url = `${baseUrl}${API_PATHS.AGENTS}/${agentId}`;
```

## The Contract Synchronization Rule

> **When you change this package, you MUST update all consumers.**

This package is imported by:
- `server/` — routes, services, and middleware
- `ui/` — API clients, components, and hooks
- `cli/` — commands and formatters
- `packages/adapters/*` — adapter implementations

A type change here that isn't reflected in consumers will cause typecheck failures. This is **intentional** — it prevents contract drift.

## For AI Agents

### ⚡ Task Granulization

Changes to `packages/shared` are **always cross-package**. The ripple effect is:

```
packages/shared (change here)
    ↓
packages/db (if schema-related)
    ↓
server (routes + services)
    ↓
ui (components + API clients)
    ↓
cli (commands + formatters)
```

**Mandatory sub-task decomposition:**

1. **Make the type/constant change** in `packages/shared` → `pnpm -r typecheck` (expect failures downstream)
2. **Fix `packages/db`** if the change involves schema types → `pnpm -r typecheck`
3. **Fix `server`** routes and services → `pnpm -r typecheck`
4. **Fix `ui`** components and API clients → `pnpm -r typecheck`
5. **Fix `cli`** if applicable → `pnpm -r typecheck` (should now pass clean)

> **Never** add a type to `packages/shared` without checking if existing code needs to adopt it. The typecheck will tell you.

### Common Patterns

| Change | Where |
|--------|-------|
| Add a new issue status | `src/constants.ts` → `ISSUE_STATUSES` |
| Add a new adapter type | `src/adapter-type.ts` → `KNOWN_ADAPTER_TYPES` |
| Add a new API path | `src/api.ts` |
| Add domain type | `src/types/<entity>.ts` → export from `src/index.ts` |
| Add validation schema | `src/validators/<entity>.ts` |

### Verification

```bash
pnpm --filter @paperclipai/shared typecheck   # This package only
pnpm -r typecheck                              # ALL consumers — the real test
```

## Related Docs

| Doc | Purpose |
|-----|---------|
| [`AGENTS.md`](../../AGENTS.md) | Contract sync rule (#2 in Core Engineering Rules) |
| [`TASK_PATTERNS.md`](../../TASK_PATTERNS.md) | Pattern #4: Modify Shared Types |
| [`STRUCTURE.md`](../../STRUCTURE.md) | Full repo directory map |
