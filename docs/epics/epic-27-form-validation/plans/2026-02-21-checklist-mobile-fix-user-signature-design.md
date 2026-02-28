# Checklist Mobile Fix + User Signature Profile

## Part 1: Fix ChecklistsPage Mobile

### Problems
1. Drawer opens full-screen on mobile with no back navigation, no sticky header
2. Bottom complete button hidden behind system nav bar
3. Instance mobile cards don't clearly indicate tappability
4. Chips and progress layout cramped on small screens

### Solution
- On mobile (`isMobile`), tapping an instance navigates to `/projects/{id}/checklists/fill/{instanceId}` (existing MobileChecklistPage) instead of opening drawer
- Keep drawer for desktop (sm+)
- Add chevron to mobile instance cards
- MobileChecklistPage already has: sticky header, fixed bottom bar, proper signature modal, progress tracking

### Files Changed
- `frontend/src/pages/ChecklistsPage.tsx` — detect mobile, use `navigate()` instead of `openDrawer()` on mobile
- `frontend/src/App.tsx` (or router) — ensure route `/projects/:projectId/checklists/fill/:instanceId` exists
- `frontend/src/pages/MobileChecklistPage.tsx` — accept instanceId from URL params, load instance+template from API

## Part 2: User Signature in Profile

### Solution
- Add `signature_url` field to User model (Alembic migration 037)
- Add `PUT /api/v1/users/me/signature` endpoint — accepts base64 PNG, uploads to GCS, stores URL
- Add `DELETE /api/v1/users/me/signature` endpoint — removes signature
- Add `signature_url` to UserResponse schema (camelCase: `signatureUrl`)
- Add signature section to ProfilePage — shows current signature or "draw" CTA
- Uses existing SignaturePad component
- In ChecklistSection/ChecklistFillDrawer: when `must_signature`, pre-populate from user's profile signature via `useAuth()` context

### Backend Changes
- `backend/app/models/user.py` — add `signature_url: str | None`
- `backend/app/schemas/user.py` — add to UserResponse + UserUpdate
- `backend/app/api/v1/auth.py` — add signature upload/delete endpoints
- `backend/alembic/versions/037_add_user_signature.py` — migration

### Frontend Changes
- `frontend/src/pages/ProfilePage.tsx` — signature card with SignaturePad
- `frontend/src/types/index.ts` — add `signatureUrl` to User type
- `frontend/src/api/auth.ts` — add uploadSignature/deleteSignature API calls
- `frontend/src/components/checklist/ChecklistSection.tsx` — pre-fill signature from user profile
- `frontend/src/i18n/locales/he.json` — Hebrew translations first
- `frontend/src/i18n/locales/en.json` — English translations second
