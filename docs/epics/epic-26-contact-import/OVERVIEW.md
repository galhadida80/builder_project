# Epic 26: Contact Import

**Status:** COMPLETED
**Priority:** P1 - High
**Estimate:** 5 points (2 stories)
**Sprint:** 15

## Description

CSV and bulk JSON import for project contacts. Supports field mapping, duplicate detection by email, validation, and audit logging for each imported contact.

## User Stories

See `docs/LINEAR_EPICS_STORIES.md` — US-26.1 through US-26.2.

## Audit Trail

### Schemas
- `backend/app/schemas/contact.py` — BulkContactImport, BulkImportResponse (imported_count, skipped_count, errors)

### API Endpoints
- `backend/app/api/v1/contacts.py`:
  - `GET /projects/{project_id}/contacts/export` — CSV export with headers: contact_name, email, phone, contact_type, company_name, role_description
  - `POST /projects/{project_id}/contacts/import` — CSV file upload, parses rows, creates contacts with dedup by email
  - `POST /projects/{project_id}/contacts/import-bulk` — JSON bulk import via `BulkContactImport` schema

### Frontend
- `frontend/src/pages/ContactsPage.tsx` — Import/export buttons integrated into contacts list

## Implementation Notes

- CSV import supports UTF-8 with BOM
- Duplicate detection by (contact_name, phone, email) within same project
- Per-contact validation: email format, phone length, field length limits
- Audit log entry created per imported contact
- RBAC: requires `CREATE` permission on the project
- No dedicated migration — uses existing `contacts` table
