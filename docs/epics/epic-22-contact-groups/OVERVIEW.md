# Epic 22: Contact Groups & Discussions

**Status:** COMPLETED
**Priority:** P1 - High
**Estimate:** 6 points (2 stories)
**Sprint:** 13

## Description

Contact grouping system for organizing project contacts by role or team, plus project discussions for team collaboration.

## User Stories

See `docs/LINEAR_EPICS_STORIES.md` — US-22.1 through US-22.2.

## Audit Trail

### Models
- `backend/app/models/contact_group.py` — ContactGroup, ContactGroupMember
- `backend/app/models/discussion.py` — Discussion

### Schemas
- `backend/app/schemas/contact_group.py`
- `backend/app/schemas/discussion.py`

### API Endpoints
- `backend/app/api/v1/contact_groups.py` — GET/POST/PATCH/DELETE `/projects/{project_id}/contact-groups`, member management
- `backend/app/api/v1/discussions.py` — GET/POST/PATCH/DELETE `/projects/{project_id}/discussions`

### Migrations
- `024` — `contact_groups` and `contact_group_members` tables
- `032` — `discussions` table

### Frontend
- `frontend/src/pages/ContactsPage.tsx` — Integrated contact group management via tabs/modal

## Implementation Notes

- Contact groups enable bulk operations (email, assign to meetings)
- Discussions support threaded conversations within projects
- Business logic inline in API routers (no separate service files)
