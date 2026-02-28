# Epic 21: Reports & Compliance

**Status:** COMPLETED
**Priority:** P1 - High
**Estimate:** 6 points (2 stories)
**Sprint:** 12

## Description

Report template management with scheduled report generation. Supports CSV/PDF export for equipment, materials, inspections, RFIs, and defects.

## User Stories

See `docs/LINEAR_EPICS_STORIES.md` — US-21.1 through US-21.2.

## Audit Trail

### Models
- `backend/app/models/scheduled_report.py` — ReportTemplate, ScheduledReport

### Schemas
- `backend/app/schemas/scheduled_report.py`

### Services
- `backend/app/services/report_service.py` — Report generation, CSV export, data collection

### API Endpoints
- `backend/app/api/v1/reports.py` — GET/POST/PATCH/DELETE `/projects/{project_id}/reports`, report template CRUD, scheduled report management, CSV/PDF export

### Migrations
- `041` — `report_templates` and `scheduled_reports` tables

### Frontend
- `frontend/src/pages/ReportsPage.tsx` — Report template management, scheduled report creation, date range filtering, export options

## Implementation Notes

- Report templates define the data sources and format
- Scheduled reports run automatically on configured intervals
- Export supports multiple formats (CSV, PDF)
