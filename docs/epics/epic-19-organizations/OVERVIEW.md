# Epic 19: Organizations & Multi-tenancy

**Status:** COMPLETED
**Priority:** P1 - High
**Estimate:** 8 points (3 stories)
**Sprint:** 12

## Description

Organization management for multi-tenant project grouping. Organizations contain members and aggregate data across projects (meetings, equipment, materials).

## User Stories

See `docs/LINEAR_EPICS_STORIES.md` — US-19.1 through US-19.3.

## Audit Trail

### Models
- `backend/app/models/organization.py` — Organization, OrganizationMember

### Schemas
- `backend/app/schemas/organization.py`

### API Endpoints
- `backend/app/api/v1/organizations.py` — GET/POST/PATCH/DELETE `/organizations`, member management, aggregation endpoints (projects/meetings/equipment/materials)

### Migrations
- `030` — `organizations` and `organization_members` tables

### Frontend
- `frontend/src/pages/OrganizationsPage.tsx` — List organizations, create new org, member counts
- `frontend/src/pages/OrganizationDetailPage.tsx` — Organization detail view
- `frontend/src/pages/AdminUsersPage.tsx` — Super admin user management

## Implementation Notes

- Business logic is inline in the API router (no separate service file)
- Organization aggregations provide cross-project visibility
- Super admin can manage all organizations and users
