# Epic 27: Form Validation UX & Signature Stamp

**Status:** COMPLETED
**Priority:** P1 - High
**Estimate:** 5 points (3 stories)
**Sprint:** 15

## Description

Enhanced form validation UX with shake animations, haptic feedback, error toasts, signature stamp auto-apply system, and date validation guards preventing past-date scheduling.

## User Stories

See `docs/LINEAR_EPICS_STORIES.md` — US-27.1 through US-27.3.

## Audit Trail

### Frontend Hooks
- `frontend/src/hooks/useFormShake.ts` — Shake animation + `navigator.vibrate()` + error toast on validation failure
- `frontend/src/hooks/useSignatureStamp.ts` — Auto-loads user's saved signature, applies as contractor stamp

### Frontend Utilities
- `frontend/src/utils/validation.ts` — `validateFutureDate()`, form validators for all 8 entity types (project, equipment, material, contact, meeting, area, RFI, inspection)
- `frontend/src/utils/animations.ts` — CSS shake keyframe animation
- `frontend/src/schemas/validation.ts` — Zod schemas with `.refine()` for future date validation

### Frontend Components
- `frontend/src/components/forms/TextInput.tsx` — Shake animation on `.Mui-error` state
- `frontend/src/components/ui/SignaturePad.tsx` — Canvas-based signature drawing

### Frontend Pages
- `frontend/src/pages/ProfilePage.tsx` — Signature as "Active Stamp" with green badge and gradient card
- All 8 form pages integrate `useFormShake`: Meetings, Inspections, Equipment, Materials, Contacts, Areas, RFIs, Projects

### Migrations
- `038` — `signature_url` column on `users` table

## Implementation Notes

- Shake animation triggers on form submission with validation errors
- Mobile haptic feedback via `navigator.vibrate([50, 30, 50])`
- Equipment/Material forms auto-apply user's signature stamp on open (if saved)
- `validateFutureDate()` blocks scheduling meetings and inspections in the past
- Zod schemas use `.refine()` as second layer of date validation
