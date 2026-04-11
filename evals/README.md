# Paperclip Evals

Eval framework for testing Paperclip agent behaviors across models and prompt versions.

See [the evals framework plan](../doc/plans/2026-03-13-agent-evals-framework.md) for full design rationale.

## Quick Start

### Prerequisites

```bash
pnpm add -g promptfoo
```

You need an API key for at least one provider. Set one of:

```bash
export OPENROUTER_API_KEY=sk-or-...    # OpenRouter (recommended - test multiple models)
export ANTHROPIC_API_KEY=sk-ant-...     # Anthropic direct
export OPENAI_API_KEY=sk-...            # OpenAI direct
```

### Run evals

```bash
# Smoke test (default models)
pnpm evals:smoke

# Or run promptfoo directly
cd evals/promptfoo
promptfoo eval

# View results in browser
promptfoo view
```

### What's tested

Phase 0 covers narrow behavior evals for the Paperclip heartbeat skill:

| Case | Category | What it checks |
|------|----------|---------------|
| Assignment pickup | `core` | Agent picks up todo/in_progress tasks correctly |
| Progress update | `core` | Agent writes useful status comments |
| Blocked reporting | `core` | Agent recognizes and reports blocked state |
| Approval required | `governance` | Agent requests approval instead of acting |
| Company boundary | `governance` | Agent refuses cross-company actions |
| No work exit | `core` | Agent exits cleanly with no assignments |
| Checkout before work | `core` | Agent always checks out before modifying |
| 409 conflict handling | `core` | Agent stops on 409, picks different task |

### Adding new cases

1. Add a YAML file to `evals/promptfoo/cases/`
2. Follow the existing case format (see `core-assignment-pickup.yaml` for reference)
3. Run `promptfoo eval` to test

### Phases

- **Phase 0 (current):** Promptfoo bootstrap - narrow behavior evals with deterministic assertions
- **Phase 1:** TypeScript eval harness with seeded scenarios and hard checks
- **Phase 2:** Pairwise and rubric scoring layer
- **Phase 3:** Efficiency metrics integration
- **Phase 4:** Production-case ingestion

## For AI Agents

### ⚡ Task Granulization

Eval changes are self-contained — they don't ripple through the monorepo. But still decompose:

1. **New test case:** Create YAML file in `evals/promptfoo/cases/` → run `promptfoo eval` to verify
2. **New phase setup:** Plan first → get approval → implement framework → add initial cases → verify
3. **Fix failing eval:** Identify which assertion fails → fix the assertion OR the behavior → re-run

### Key Rules

- **Don't modify evals to pass** — if an eval fails, the agent behavior may need fixing, not the eval
- **Keep assertions deterministic** — avoid fuzzy matching that could mask regressions
- **One case per file** — makes reviewing and debugging individual failures easy

### Verification

```bash
pnpm evals:smoke           # Quick run
cd evals/promptfoo && promptfoo eval   # Full run
promptfoo view             # Browser results viewer
```

## Related Docs

| Doc | Purpose |
|-----|---------|
| [`doc/plans/2026-03-13-agent-evals-framework.md`](../doc/plans/2026-03-13-agent-evals-framework.md) | Full design rationale |
| [`AGENTS.md`](../AGENTS.md) | Repo contribution rules |
| [`TASK_PATTERNS.md`](../TASK_PATTERNS.md) | Step-by-step checklists |
