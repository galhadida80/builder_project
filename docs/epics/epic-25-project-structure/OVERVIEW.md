# Epic 25: Project Structure & Checklist Integration

**Status:** COMPLETED
**Priority:** P1 - High
**Estimate:** 18 points (5 stories)
**Sprint:** 14

## Description

Connect project structure hierarchy (buildings, floors, units) with the checklist system. Includes a 5-step wizard for defining project structure, area-checklist assignments, and per-area checklist progress tracking.

## User Stories

See `docs/LINEAR_EPICS_STORIES.md` — US-25.1 through US-25.5.

## Audit Trail

### Models
- `backend/app/models/area.py` — ConstructionArea (area_level, status, order columns), AreaChecklistAssignment

### Services
- `backend/app/services/area_structure_service.py` — `process_bulk_area_tree()`, `create_checklists_for_area()`, `compute_area_checklist_progress()`

### API Endpoints
- `backend/app/api/v1/area_structure.py` — `POST /projects/{project_id}/areas/bulk`, `GET/POST /projects/{project_id}/area-checklist-assignments`

### Migrations
- `035` — `area_checklist_assignments` table, `area_id` FK on `checklist_instances`, `area_level`/`status`/`order` on `construction_areas`

### Frontend
- `frontend/src/pages/ProjectStructureWizardPage.tsx` — 5-step wizard (Buildings, Floors/Units, Common Areas, Checklist Assignment, Preview)
- `frontend/src/api/areaStructure.ts` — API client

## Implementation Notes

- Wizard steps: BuildingsStep → FloorsUnitsStep → CommonAreasStep → ChecklistAssignmentStep → StructurePreview
- Bulk area creation is recursive — creates entire building hierarchy in one request
- Auto-create checklist instances based on area type → checklist template assignments
- AreaPickerAutocomplete shared component used in ChecklistsPage for area-aware instance creation
