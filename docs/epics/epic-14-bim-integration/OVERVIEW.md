# Epic 14: Autodesk Revit/BIM Integration

**Status:** In Progress (9/11 stories done)
**Priority:** P0 - Critical
**Estimate:** 47 points (11 stories)
**Sprint:** 10

## Description

Full BIM integration with Autodesk Platform Services (APS). Upload Revit/IFC files, view in browser via Forge Viewer, extract equipment/material quantities with fuzzy template matching, and import into project inventory.

## User Stories

See `docs/LINEAR_EPICS_STORIES.md` — US-14.1 through US-14.11.

## Audit Trail

### Models
- `backend/app/models/bim.py` — BimModel (translation_status enum: uploaded/translating/complete/failed)
- `backend/app/models/blueprint_extraction.py` — BlueprintExtraction, BlueprintImport

### Schemas
- `backend/app/schemas/bim.py`
- `backend/app/schemas/blueprint.py`

### Services
- `backend/app/services/aps_service.py` — APS httpx async client, 2-legged cached token
- `backend/app/services/bim_extraction_service.py` — Fuzzy matching with `difflib.SequenceMatcher` + token overlap scoring (threshold 0.80)
- `backend/app/services/blueprint_extraction_service.py` — Blueprint document processing

### API Endpoints
- `backend/app/api/v1/bim.py` — 9 endpoints: upload, status polling, OAuth callbacks
- `backend/app/api/v1/bim_extract.py` — Equipment/material extraction and mapping

### Migrations
- `022` — `bim_models` and `autodesk_connections` tables
- `044` — `blueprint_extractions` and `blueprint_imports` tables
- `051` — `template_id` FK on `equipment` and `materials` tables (nullable, SET NULL on delete)

### Frontend
- `frontend/src/pages/BIMPage.tsx` — Upload + model list + viewer
- `frontend/src/components/bim/ForgeViewer.tsx` — Autodesk Forge SDK integration
- `frontend/src/components/bim/IFCViewer.tsx` — IFC file viewer
- `frontend/src/components/bim/BimImportWizard.tsx` — Multi-step import wizard
- `frontend/src/api/bim.ts` — API client

## Implementation Notes

- Allowed upload extensions: .rvt, .ifc, .nwd, .nwc, .dwg
- `EQUIPMENT_NAME_EN_MAP` provides English translations for Hebrew equipment template names
- Import endpoints accept `item_mappings` with per-item template overrides
- Remaining: US-14.10 (ACC RFI Sync Outbound), US-14.11 (ACC RFI Sync Inbound)
