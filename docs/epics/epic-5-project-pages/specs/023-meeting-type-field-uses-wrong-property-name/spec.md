# Specification: Fix Meeting Type Property Name Mismatch

## Overview

The Meeting interface in the frontend TypeScript types defines `startTime` and `endTime` properties, but the backend API returns `scheduledDate` and `scheduledTime` fields instead. This causes runtime errors when frontend code attempts to access `meeting.startTime` because the property doesn't exist in the actual API response. This specification addresses fixing the type mismatch and updating all affected frontend code to use the correct backend schema.

## Workflow Type

**Type**: refactor

**Rationale**: This is a bug fix that requires refactoring the frontend TypeScript types and updating multiple usages across the codebase to align with the backend API schema. While classified as "feature" in requirements, this is fundamentally a type correction and code refactoring task.

## Task Scope

### Services Involved
- **frontend** (primary) - TypeScript interface definitions and all meeting-related UI components

### This Task Will:
- [x] Update the Meeting interface in `frontend/src/types/index.ts` to match backend schema
- [x] Update `frontend/src/pages/DashboardPage.tsx` to use correct property name
- [x] Update `frontend/src/pages/MeetingsPage.tsx` to handle the backend schema correctly
- [x] Update `frontend/src/mocks/data.ts` to use correct property names
- [x] Search for any other usages of `startTime`/`endTime` on Meeting objects
- [x] Ensure date/time formatting continues to work correctly

### Out of Scope:
- Adding end time storage to the backend (future enhancement)
- Modifying backend API schema or database models
- Changing meeting duration tracking functionality

## Service Context

### Frontend

**Tech Stack:**
- Language: TypeScript
- Framework: React
- Build Tool: Vite
- Styling: Emotion
- Key directories: `src/` (source code)

**Entry Point:** `src/App.tsx`

**How to Run:**
```bash
cd frontend
npm run dev
```

**Port:** 3000

### Backend (Reference Only)

**Tech Stack:**
- Language: Python
- Framework: FastAPI
- ORM: SQLAlchemy

**API Endpoint:** `/meetings` and `/projects/{project_id}/meetings`
**Schema File:** `backend/app/schemas/meeting.py`
**Model File:** `backend/app/models/meeting.py`

**Backend Schema Returns:**
- `scheduledDate` (datetime) - The meeting start date/time
- `scheduledTime` (string | null) - Optional time string (may be redundant)
- No `endTime` field exists in backend

## Files to Modify

| File | Service | What to Change |
|------|---------|---------------|
| `frontend/src/types/index.ts` | frontend | Update Meeting interface: replace `startTime`/`endTime` with `scheduledDate` |
| `frontend/src/pages/DashboardPage.tsx` | frontend | Update line 214: change `meeting.startTime` to `meeting.scheduledDate` |
| `frontend/src/pages/MeetingsPage.tsx` | frontend | Update all references to `startTime`/`endTime` throughout the file (form handling, display, etc.) |
| `frontend/src/mocks/data.ts` | frontend | Update mock meeting data to use `scheduledDate` instead of `startTime`/`endTime` |

## Files to Reference

These files show the backend schema to match:

| File | Pattern to Copy |
|------|----------------|
| `backend/app/models/meeting.py` | Backend database model showing `scheduled_date` field (line 26) |
| `backend/app/schemas/meeting.py` | Backend Pydantic schema showing `scheduled_date` field (line 49, 86) and CamelCaseModel usage |
| `backend/alembic/versions/001_initial_tables.py` | Database migration showing meetings table structure (lines 122-138) |

## Patterns to Follow

### Backend Schema Pattern

From `backend/app/schemas/meeting.py`:

```python
class MeetingResponse(CamelCaseModel):
    id: UUID
    project_id: UUID
    title: str
    description: str | None = None
    meeting_type: str | None = None
    location: str | None = None
    scheduled_date: datetime  # ← This becomes scheduledDate in API response
    scheduled_time: str | None = None
    google_event_id: str | None = None
    summary: str | None = None
    action_items: list[ActionItem] | None = None
    status: str
    created_at: datetime
    created_by: UserResponse | None = None
    attendees: list[MeetingAttendeeResponse] = []
```

**Key Points:**
- Backend uses `CamelCaseModel` which converts snake_case to camelCase
- `scheduled_date` becomes `scheduledDate` in JSON responses
- No `endTime` field exists in the backend schema
- The `scheduled_date` is a full datetime, not just a date

### Date Formatting Pattern

From `frontend/src/pages/DashboardPage.tsx` (line 214):

```typescript
new Date(meeting.startTime).toLocaleString('en-US', {
  weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
})
```

**Key Points:**
- Date formatting logic is correct, just needs to use `scheduledDate` property
- `toLocaleString` works with ISO datetime strings
- Keep the same formatting pattern, just change property access

## Requirements

### Functional Requirements

1. **Update TypeScript Interface**
   - Description: Change Meeting interface to match backend API schema
   - Acceptance: Meeting interface defines `scheduledDate: string` instead of `startTime/endTime`

2. **Fix DashboardPage Date Display**
   - Description: Update the upcoming meetings section to use correct property
   - Acceptance: Meeting times display correctly without console errors

3. **Fix MeetingsPage CRUD Operations**
   - Description: Update all form handling and display logic for meetings
   - Acceptance: Creating, editing, and viewing meetings works without errors

4. **Update Mock Data**
   - Description: Ensure test/mock data matches the corrected schema
   - Acceptance: Mock data uses `scheduledDate` property

### Edge Cases

1. **Existing Code Using startTime/endTime** - Search entire codebase to ensure no other components are accessing these properties
2. **Meeting Duration Display** - Where end time was shown, decide how to handle (e.g., show "scheduled for HH:MM" instead of "HH:MM - HH:MM")
3. **Form Validation** - Update validation logic that checks start/end time relationships
4. **Date Parsing** - Ensure date parsing works with backend's datetime format

## Implementation Notes

### DO
- Search the entire frontend codebase for `meeting.startTime` and `meeting.endTime` references
- Use `scheduledDate` which contains the full datetime from backend
- Keep existing date formatting utilities (`toLocaleString`, etc.)
- Update form submission to send `scheduledDate` to backend API
- Test all meeting-related pages after changes (Dashboard, Meetings page)

### DON'T
- Don't modify backend code (this is frontend-only fix)
- Don't add duration/end time calculation logic (out of scope)
- Don't change the visual presentation significantly
- Don't remove the `scheduledTime` field from types (backend still has it)

## Development Environment

### Start Services

```bash
# Start frontend
cd frontend
npm run dev

# Start backend (for API testing)
cd backend
uvicorn app.main:app --reload
```

### Service URLs
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

### Required Environment Variables
- `VITE_API_BASE_URL`: Backend API URL (usually http://localhost:8000)

## Success Criteria

The task is complete when:

1. [x] Meeting interface in `types/index.ts` defines `scheduledDate` instead of `startTime`/`endTime`
2. [x] DashboardPage displays meeting times without console errors
3. [x] MeetingsPage allows creating/editing meetings successfully
4. [x] Mock data uses correct property names
5. [x] No console errors related to undefined `startTime` property
6. [x] Existing tests still pass (if any)
7. [x] Meeting times display correctly throughout the application
8. [x] Global search for `startTime`/`endTime` returns no remaining references to Meeting objects

## QA Acceptance Criteria

**CRITICAL**: These criteria must be verified by the QA Agent before sign-off.

### Unit Tests
| Test | File | What to Verify |
|------|------|----------------|
| Type checking | `frontend/src/types/index.ts` | TypeScript compilation succeeds without errors |
| Mock data validity | `frontend/src/mocks/data.ts` | Mock meetings have `scheduledDate` property |

### Integration Tests
| Test | Services | What to Verify |
|------|----------|----------------|
| Meeting API fetch | frontend ↔ backend | API response correctly maps to Meeting type |
| Meeting creation | frontend ↔ backend | Creating a meeting sends correct `scheduledDate` field |
| Meeting update | frontend ↔ backend | Updating a meeting preserves and updates `scheduledDate` |

### End-to-End Tests
| Flow | Steps | Expected Outcome |
|------|-------|------------------|
| View meetings on dashboard | 1. Navigate to dashboard 2. Check "Upcoming Meetings" section | Meeting times display correctly, no console errors |
| Create new meeting | 1. Navigate to Meetings page 2. Click "Create Meeting" 3. Fill form 4. Submit | Meeting created successfully, appears in list with correct date |
| Edit existing meeting | 1. Open Meetings page 2. Click on a meeting 3. Update date/time 4. Save | Meeting updates successfully, displays new date correctly |
| View meeting details | 1. Open Meetings page 2. Click on a meeting | Meeting details modal shows correct date/time |

### Browser Verification (if frontend)
| Page/Component | URL | Checks |
|----------------|-----|--------|
| Dashboard | `http://localhost:3000/` | "Upcoming Meetings" section renders without errors, dates display correctly |
| Meetings List | `http://localhost:3000/meetings` | All meetings display with dates, no "Invalid Date" or errors |
| Meeting Form | `http://localhost:3000/meetings` (create/edit dialog) | Date/time inputs work correctly |
| Meeting Details | `http://localhost:3000/meetings` (details dialog) | Meeting details show correct scheduled date |

### Code Verification
| Check | Command | Expected |
|-------|---------|----------|
| TypeScript compilation | `cd frontend && npm run build` | Build succeeds without type errors |
| No remaining old properties | Search: `\b(startTime\|endTime)\b` in `frontend/src` (excluding mocks if needed) | Only type definitions, no usages in Meeting context |
| ESLint passes | `cd frontend && npm run lint` | No new linting errors |

### QA Sign-off Requirements
- [x] All unit tests pass (TypeScript compiles)
- [x] All integration tests pass (API calls work correctly)
- [x] All E2E tests pass (UI flows work end-to-end)
- [x] Browser verification complete (visual check of all pages)
- [x] Code verification complete (build succeeds, no old property references)
- [x] No regressions in existing functionality
- [x] Code follows established patterns (consistent with other type definitions)
- [x] No security vulnerabilities introduced
- [x] Console is clean (no errors or warnings)

## Risk Assessment

### Low Risk
- Type definition change is straightforward
- Limited to frontend code only
- Backend already has correct schema

### Medium Risk
- Multiple files need updates
- Need to ensure all usages are found and updated
- Could break meeting display/creation if any references are missed

### Mitigation
- Comprehensive codebase search before and after changes
- Test all meeting-related pages manually
- Use TypeScript compiler to catch any type errors
- Run build to ensure no compilation errors

## Implementation Order

1. **Phase 1: Update Types** - Update Meeting interface in `types/index.ts`
2. **Phase 2: Update Usages** - Fix all files that reference the old properties
3. **Phase 3: Update Mocks** - Update mock data for consistency
4. **Phase 4: Test** - Verify all meeting-related functionality works
5. **Phase 5: Final Search** - Do final codebase search to ensure nothing was missed
