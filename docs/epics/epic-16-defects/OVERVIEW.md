# Epic 16: Defect Tracking & AI Analysis

**Status:** COMPLETED
**Priority:** P1 - High
**Estimate:** 15 points (3 stories)
**Sprint:** 11

## Description

Defect tracking system with CRUD operations, assignee management, status workflow, and HTML report generation. Integrated with project-level dashboards.

## User Stories

See `docs/LINEAR_EPICS_STORIES.md` — US-16.1 through US-16.3.

## Audit Trail

### Models
- `backend/app/models/defect.py` — Defect, DefectAssignee

### Schemas
- `backend/app/schemas/defect.py`

### Services
- `backend/app/services/defect_report_service.py` — Defect report generation

### API Endpoints
- `backend/app/api/v1/defects.py` — Full CRUD, assignment management, status updates, report generation

### Email Template
- `backend/app/templates/defects_report.html` — Jinja2 defect report template

### Migrations
- `025` — `defects` and `defect_assignees` tables

### Frontend
- `frontend/src/pages/DefectsPage.tsx` — Defects list view with filters
- `frontend/src/pages/DefectDetailPage.tsx` — Individual defect detail/editing
- `frontend/src/components/defects/DefectCardList.tsx` — Card-based list component
- `frontend/src/components/defects/DefectFormModal.tsx` — Create/edit modal
- `frontend/src/api/defects.ts` — API client

## Implementation Notes

- Defect status workflow: open → in_progress → resolved → closed
- Supports priority levels and severity classification
- Report export includes defect details and assignee info
