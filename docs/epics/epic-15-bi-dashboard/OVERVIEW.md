# Epic 15: BI Dashboard & Reporting

**Status:** COMPLETED
**Priority:** P1 - High
**Estimate:** 8 points (3 stories)
**Sprint:** 9

## Description

Business intelligence dashboard with KPI tracking, trend analysis, data distribution charts, and CSV export. Includes custom KPI definitions with target/threshold values and snapshot history.

## User Stories

See `docs/LINEAR_EPICS_STORIES.md` — US-15.1 through US-15.3.

## Audit Trail

### Models
- `backend/app/models/analytics.py` — CustomKpiDefinition, KpiSnapshot

### Schemas
- `backend/app/schemas/analytics.py`
- `backend/app/schemas/analytics_bi.py`

### Services
- `backend/app/services/analytics_service.py` — KPI computation, trend analysis, benchmarking

### API Endpoints
- `backend/app/api/v1/analytics.py` — `/analytics/metrics`, `/analytics/project-trends`, `/analytics/distributions`, `/projects/{project_id}/dashboard-stats`
- `backend/app/api/v1/analytics_bi.py` — KPI definitions CRUD, KPI values over time, snapshot recording, CSV export

### Migrations
- `031` — `custom_kpi_definitions` table
- `036` — KPI enhancements: target/threshold columns + `kpi_snapshots` table

### Frontend
- `frontend/src/pages/DashboardPage.tsx` — Main dashboard view
- `frontend/src/pages/CustomKPIPage.tsx` — Custom KPI definition interface
- `frontend/src/pages/Analytics/AnalyticsDashboard.tsx` — Advanced analytics view
- `frontend/src/pages/Analytics/components/` — KPICard, DistributionChart, DateRangeSelector, ExportButton, ProjectMetricsChart
- `frontend/src/components/kpi/` — KpiCard, KpiFormDialog, KpiSparkline
- `frontend/src/services/analyticsService.ts`
- `frontend/src/api/analytics.ts`, `frontend/src/api/dashboardStats.ts`

## Implementation Notes

- Role-specific dashboards: ProjectManagerDashboard, InspectorDashboard
- CSV export supports: equipment, material, inspection, rfi, defect
- KPI snapshots enable historical tracking and sparkline charts
