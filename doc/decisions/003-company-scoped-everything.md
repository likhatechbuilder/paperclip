# ADR-003: Company-Scoped Everything

- **Status:** Accepted
- **Date:** 2025 (original decision)

## Context

Paperclip runs multiple AI companies from a single deployment. Data isolation between companies is a hard requirement — no company's agents should see another company's issues, goals, or costs.

## Decision

Every domain entity table has a `companyId` foreign key. All API queries filter by company. Routes enforce company access via middleware.

## Consequences

- ✅ True multi-tenant isolation from a single deployment
- ✅ Separate audit trails per company
- ✅ Company export/import is clean — just filter by companyId
- ⚠️ **Every new table MUST have companyId** — no exceptions
- ⚠️ **Every new route MUST enforce company access** via middleware
- ⚠️ **Forgetting the company filter** creates a data leak between tenants
