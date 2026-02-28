# Epic 11: RFI System - Email-Integrated Request for Information

**Status:** COMPLETED
**Priority:** P0 - Critical
**Estimate:** 46 points (13 stories)
**Linear Epic:** BUI-93

## Description

Complete RFI (Request for Information) system with email integration via Gmail API and Google Cloud Pub/Sub. Supports creating, sending, tracking, and responding to RFIs through an official email address integrated with the CRM.

## Architecture

```
OUTBOUND: CRM → FastAPI → Gmail API → Recipient
INBOUND:  Reply → Gmail → Pub/Sub → Webhook → FastAPI → Database → Notifications
```

## User Stories

See `docs/LINEAR_EPICS_STORIES.md` — US-11.1 through US-11.13.

## Audit Trail

### Models
- `backend/app/models/rfi.py` — RFI, RFIResponse, RFIEmailLog

### Schemas
- `backend/app/schemas/rfi.py` — RFICreate, RFIUpdate, RFIResponse schemas

### Services
- `backend/app/services/rfi_service.py` — Business logic, generate_rfi_number(), create_and_send_rfi()
- `backend/app/services/gmail_service.py` — Gmail API service with service account auth
- `backend/app/services/rfi_email_parser.py` — Parse incoming emails, extract RFI numbers

### API Endpoints
- `backend/app/api/v1/rfis.py` — RFI CRUD, send, responses
- `backend/app/api/v1/webhooks.py` — Gmail Pub/Sub webhook

### Frontend
- `frontend/src/pages/RFIsPage.tsx` — RFI list with filters
- `frontend/src/components/rfis/RFIFormDialog.tsx` — Create/edit RFI form
- `frontend/src/api/rfi.ts` — API client

## Specs

- `specs/084-write-rfi-system-integration-tests/spec.md`
- `specs/085-add-rfi-to-project-navigation/spec.md`
- `specs/086-add-rfi-dashboard-widget/spec.md`
- `specs/088-create-rfi-form-dialog-component/spec.md`
