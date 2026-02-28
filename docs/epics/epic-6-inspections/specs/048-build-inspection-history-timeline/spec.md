# Specification: Build Inspection History Timeline

## Overview

Redesign the `InspectionHistoryTimeline` component to display a vertical timeline of inspection records (not audit events) for a project, matching the design specification in `25-history-timeline.png`. The timeline will show inspector avatars, inspection types, status badges, and dates in a card-based layout with filtering capabilities.

## Workflow Type

**Type**: feature

**Rationale**: This is a feature modification task that requires updating an existing component to match new UI/UX requirements. The current `InspectionHistoryTimeline` component incorrectly displays audit log events instead of inspection records. This task refactors the component to display project inspections in a vertical timeline format as specified in the design.

## Task Scope

### Services Involved
- **frontend** (primary) - Update InspectionHistoryTimeline component and supporting code
- **backend** (integration) - Uses existing `/projects/{project_id}/inspections` API endpoint

### This Task Will:
- [x] Refactor `InspectionHistoryTimeline` component to display Inspection records instead of AuditLog events
- [x] Update component UI to match design: card-based layout with avatar, name, inspection type, and status badge
- [x] Add date range filtering functionality (filter by date range dropdown)
- [x] Update component props and types to accept `Inspection[]` instead of `InspectionHistoryEvent[]`
- [x] Update tests to reflect new component behavior
- [x] Add interactive "Click to view details" functionality for inspection cards

### Out of Scope:
- Creating new backend API endpoints (using existing endpoints)
- Modifying inspection data models or database schema
- Implementing inspection detail modal/page (just navigation trigger)
- Adding pagination or infinite scroll (will display all inspections in date range)

## Service Context

### Frontend

**Tech Stack:**
- Language: TypeScript
- Framework: Next.js
- Styling: Emotion, Material-UI (MUI)
- Key directories: `src/components`, `src/pages`, `src/api`, `src/types`

**Entry Point:** `src/App.tsx`

**How to Run:**
```bash
cd frontend
npm run dev
```

**Port:** 3000

### Backend

**Tech Stack:**
- Language: Python
- Framework: FastAPI
- ORM: SQLAlchemy
- Key directories: `app/api/v1`, `app/models`, `app/schemas`

**How to Run:**
```bash
cd backend
source venv/bin/activate  # or test_env/bin/activate
uvicorn app.main:app --reload
```

**Port:** 8000

**Relevant API Endpoints:**
- `GET /api/v1/projects/{project_id}/inspections` - Returns all inspections for a project
- `GET /api/v1/projects/{project_id}/inspections/{inspection_id}` - Get single inspection details

## Files to Modify

| File | Service | What to Change |
|------|---------|---------------|
| `frontend/src/components/InspectionHistoryTimeline.tsx` | frontend | Refactor to display Inspection records in card format matching design; remove audit event logic; add date filtering |
| `frontend/src/components/InspectionHistoryTimeline.test.tsx` | frontend | Update tests to reflect new component behavior with Inspection data |
| `frontend/src/types/index.ts` | frontend | Verify `Inspection` type matches backend schema (already exists, no changes needed) |
| `frontend/src/pages/InspectionsPage.tsx` | frontend | Update to pass Inspection[] data to timeline component instead of fetching history events |

## Files to Reference

These files show patterns to follow:

| File | Pattern to Copy |
|------|----------------|
| `frontend/src/api/inspections.ts` | API client method `getProjectInspections` - already exists and correctly typed |
| `frontend/src/types/index.ts` | `Inspection` interface (lines 267-281) - data structure for timeline items |
| `backend/app/models/inspection.py` | `Inspection` model and `InspectionStatus` enum - backend data structure |
| `backend/app/schemas/audit.py` | DO NOT USE - this is for audit logs, not inspection records |
| `design-assets/inspection/25-history-timeline.png` | Visual design reference |

## Patterns to Follow

### Material-UI Card Pattern

The timeline should use MUI Cards similar to existing patterns in the codebase:

```tsx
import { Card, CardContent, Avatar, Chip, Typography, Box } from '@mui/material'

// Card-based timeline item
<Card sx={{ mb: 2, cursor: 'pointer' }} onClick={handleViewDetails}>
  <CardContent sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
    <Avatar src={inspector.avatar} alt={inspector.name} />
    <Box>
      <Typography variant="h6">{inspectionType}</Typography>
      <Chip label={status} color={statusColor} size="small" />
    </Box>
  </CardContent>
</Card>
```

### Date Display Pattern

From the existing component (lines 124-135), use similar date formatting:

```tsx
new Date(inspection.scheduledDate).toLocaleDateString('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})
```

### Status Badge Color Mapping

```tsx
const statusConfig: Record<InspectionStatus, { color: MUI_COLOR, label: string }> = {
  pending: { color: 'warning', label: 'PENDING' },
  in_progress: { color: 'info', label: 'IN PROGRESS' },
  completed: { color: 'success', label: 'PASSED' },
  failed: { color: 'error', label: 'FAILED' },
}
```

## Requirements

### Functional Requirements

1. **Display Inspection Timeline**
   - Description: Show all project inspections in vertical timeline format sorted by scheduled date (most recent first)
   - Acceptance: Timeline displays inspection cards with date markers, connecting vertical line, and proper chronological order

2. **Inspection Card Content**
   - Description: Each card shows inspector avatar (from `createdBy.fullName`), inspection type (from `consultantType.name`), and status badge
   - Acceptance: Cards display all required information with proper formatting and colors matching design

3. **Date Range Filtering**
   - Description: Dropdown filter to select date range (e.g., "Jan 2024 - Mar 2024")
   - Acceptance: Selecting a date range filters visible inspections; default shows last 3 months

4. **Interactive Cards**
   - Description: Cards are clickable with hover effects; clicking navigates to inspection detail view
   - Acceptance: Cursor changes to pointer on hover; onClick triggers navigation to `/projects/{projectId}/inspections/{inspectionId}`

5. **Empty State**
   - Description: Show EmptyState component when no inspections match filters
   - Acceptance: Displays appropriate message with icon when no data available

6. **Loading State**
   - Description: Show skeleton loaders while fetching inspection data
   - Acceptance: Displays 3 skeleton cards during loading state

### Edge Cases

1. **Missing Inspector Info** - If `createdBy` is null, display "Unknown Inspector" with default avatar
2. **No Consultant Type** - If `consultantType` is null, display "General Inspection"
3. **Date Filtering Edge Cases** - Handle inspections at boundary dates correctly (inclusive range)
4. **Status Colors** - All status values from backend enum must map to appropriate MUI colors
5. **Long Inspection Names** - Truncate text with ellipsis if inspection type name exceeds card width

## Implementation Notes

### DO
- Reuse the existing `Avatar` component from `./ui/Avatar`
- Reuse the `EmptyState` component from `./ui/EmptyState`
- Keep the vertical line connector pattern from current implementation (lines 166-176)
- Use MUI's `Chip` component for status badges
- Format dates consistently using `toLocaleDateString` with same options throughout
- Sort inspections by `scheduledDate` descending (newest first)
- Use `inspectionsApi.getProjectInspections(projectId)` to fetch data

### DON'T
- Use `getInspectionHistory` API endpoint (that's for audit logs)
- Keep the `InspectionHistoryEvent` type references - replace with `Inspection`
- Use the old `eventConfig` mapping - replace with `statusConfig` for inspection statuses
- Display audit actions like "create", "update", "delete" - these aren't relevant
- Make API calls inside the component - fetch data in parent page/container

## Development Environment

### Start Services

**Frontend:**
```bash
cd /Users/galhadida/projects/builder_project/builder_program/frontend
npm run dev
```

**Backend:**
```bash
cd /Users/galhadida/projects/builder_project/builder_program/backend
source venv/bin/activate  # or test_env/bin/activate
uvicorn app.main:app --reload --port 8000
```

**Database (if needed):**
```bash
docker-compose up db
```

### Service URLs
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

### Required Environment Variables
**Frontend (.env.local):**
- `NEXT_PUBLIC_API_URL`: http://localhost:8000/api/v1

**Backend (.env):**
- `DATABASE_URL`: postgresql+asyncpg://localhost:5432/builder_db
- `ENVIRONMENT`: development
- `DEBUG`: true

## Success Criteria

The task is complete when:

1. [x] `InspectionHistoryTimeline` component displays inspection records (not audit events)
2. [x] Timeline UI matches design: cards with avatar, name, type, status badge
3. [x] Date range filtering works correctly
4. [x] Cards are clickable and navigate to inspection details
5. [x] No console errors or TypeScript errors
6. [x] Existing tests updated and passing
7. [x] Component works correctly in InspectionsPage integration
8. [x] Loading and empty states display correctly

## QA Acceptance Criteria

**CRITICAL**: These criteria must be verified by the QA Agent before sign-off.

### Unit Tests
| Test | File | What to Verify |
|------|------|----------------|
| Renders timeline with inspections | `frontend/src/components/InspectionHistoryTimeline.test.tsx` | Component renders list of inspection cards from Inspection[] prop |
| Displays loading state | `frontend/src/components/InspectionHistoryTimeline.test.tsx` | Shows skeleton loaders when loading=true |
| Displays empty state | `frontend/src/components/InspectionHistoryTimeline.test.tsx` | Shows EmptyState when inspections array is empty |
| Formats dates correctly | `frontend/src/components/InspectionHistoryTimeline.test.tsx` | Dates displayed in "MMM DD, YYYY" format |
| Maps status to colors | `frontend/src/components/InspectionHistoryTimeline.test.tsx` | Pending=warning, completed=success, failed=error, in_progress=info |
| Handles missing data | `frontend/src/components/InspectionHistoryTimeline.test.tsx` | Displays fallback text when createdBy or consultantType is null |
| Date filtering works | `frontend/src/components/InspectionHistoryTimeline.test.tsx` | Filters inspections within selected date range |
| Click handler fires | `frontend/src/components/InspectionHistoryTimeline.test.tsx` | Clicking card triggers onInspectionClick callback |

### Integration Tests
| Test | Services | What to Verify |
|------|----------|----------------|
| Fetch and display inspections | frontend ↔ backend | InspectionsPage fetches data from `/projects/{id}/inspections` and passes to timeline component |
| Navigation on click | frontend | Clicking inspection card navigates to correct detail route |

### End-to-End Tests
| Flow | Steps | Expected Outcome |
|------|-------|------------------|
| View inspection timeline | 1. Navigate to project page 2. View inspections tab | Timeline displays with inspection cards sorted by date |
| Filter by date range | 1. Click date range filter 2. Select "Jan 2024 - Mar 2024" | Only inspections in that range display |
| View inspection details | 1. Click on an inspection card | Navigates to inspection detail page |

### Browser Verification
| Page/Component | URL | Checks |
|----------------|-----|--------|
| Inspections Page | `http://localhost:3000/projects/{projectId}/inspections` | Timeline renders correctly |
| Inspection Timeline Component | Component in Inspections Page | Cards display avatar, name, type, status |
| Date Filter | Dropdown in header | Filter options populate and function |
| Status Badges | Each card | Colors match status: yellow=pending, green=passed, red=failed, blue=in progress |
| Hover State | Cards on hover | Cursor changes to pointer, card shows hover effect |
| Empty State | When no inspections exist | EmptyState displays with appropriate message |
| Loading State | On initial page load | Skeleton loaders display during fetch |

### Visual Design Verification
| Element | Design Reference | Implementation Check |
|---------|-----------------|---------------------|
| Timeline layout | `25-history-timeline.png` | Vertical layout with dates on left, cards on right |
| Connecting line | `25-history-timeline.png` | Solid vertical line connects timeline nodes |
| Card design | `25-history-timeline.png` | White cards with shadow, rounded corners |
| Avatar placement | `25-history-timeline.png` | Avatar on left side of card |
| Status badges | `25-history-timeline.png` | Colored chips with uppercase text (PASSED, FAILED, PENDING) |
| Date format | `25-history-timeline.png` | "March 15, 2024" format on left side |
| Spacing | `25-history-timeline.png` | Consistent vertical spacing between timeline items |

### Data Verification
| Check | Query/Command | Expected |
|-------|---------------|----------|
| API endpoint returns inspections | `curl http://localhost:8000/api/v1/projects/{id}/inspections` | Returns array of Inspection objects with status, consultantType, createdBy |
| Frontend API client works | Network tab in DevTools | `getProjectInspections` makes correct API call |
| Component receives data | React DevTools | InspectionHistoryTimeline receives Inspection[] prop |

### QA Sign-off Requirements
- [x] All unit tests pass (`npm test InspectionHistoryTimeline`)
- [x] All integration tests pass
- [x] Timeline visual design matches `25-history-timeline.png`
- [x] Date filtering functionality works correctly
- [x] Click navigation works for all inspection cards
- [x] Status colors correctly map to inspection states
- [x] Loading and empty states display appropriately
- [x] No console errors or warnings
- [x] No TypeScript compilation errors
- [x] Component is accessible (keyboard navigation works)
- [x] Responsive design works on mobile/tablet/desktop
- [x] No regressions in existing inspection functionality
- [x] Code follows established patterns in codebase
