# Epic 18: Budget & Cost Tracking

**Status:** COMPLETED
**Priority:** P1 - High
**Estimate:** 12 points (3 stories)
**Sprint:** 11

## Description

Budget management with line items, cost entries, and change orders. Budget summary with variance tracking across project categories.

## User Stories

See `docs/LINEAR_EPICS_STORIES.md` — US-18.1 through US-18.3.

## Audit Trail

### Models
- `backend/app/models/budget.py` — BudgetLineItem, CostEntry, ChangeOrder

### Schemas
- `backend/app/schemas/budget.py`

### API Endpoints
- `backend/app/api/v1/budget.py` — GET/POST/PATCH/DELETE for `/projects/{project_id}/budget/*` (line items, cost entries, change orders, budget summary)

### Migrations
- `029` — `budget_line_items`, `cost_entries`, `change_orders` tables

### Frontend
- `frontend/src/pages/BudgetPage.tsx` — Tabs: Budget Overview, Cost Entries, Change Orders. Budget line item CRUD, cost tracking, change order management

## Implementation Notes

- Business logic is inline in the API router (no separate service file)
- Budget summary computes variance between planned and actual costs
- Change orders track scope modifications with financial impact
