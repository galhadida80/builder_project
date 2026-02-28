# Specification: Build Inspection History Timeline

## Overview

Build a vertical timeline component to display the complete history of inspection events, status changes, findings, and activities. The timeline will provide users with a chronological view of all actions taken on an inspection, similar to activity feeds in project management tools. This feature references the design spec in `25-history-timeline.png`.

## Workflow Type

**Type**: feature

**Rationale**: This is a new UI component that adds timeline visualization functionality to the existing inspections feature. It requires both frontend component development and backend API endpoints to retrieve historical inspection data.

## Task Scope

### Services Involved
- **frontend** (primary) - Create the vertical timeline React component with MUI styling
- **backend** (integration) - Provide API endpoint to fetch inspection history/audit data

### This Task Will:
- [ ] Create a new HistoryTimeline React component that displays events vertically
- [ ] Implement timeline UI following the design in 25-history-timeline.png
- [ ] Add backend API endpoint to retrieve inspection history/audit trail
- [ ] Integrate timeline component into inspection detail pages
- [ ] Display key events: creation, status changes, findings added, completion, updates
- [ ] Style timeline items with icons, timestamps, and user attribution

### Out of Scope:
- Editing or modifying historical events (read-only view)
- Timeline filtering or search functionality (future enhancement)
- Real-time updates via WebSocket (initial version uses polling or manual refresh)
- Export timeline to PDF or other formats

## Service Context

### Frontend

**Tech Stack:**
- Language: TypeScript
- Framework: React
- Build Tool: Vite
- Styling: Emotion, Material-UI (MUI)
- Key directories: src/

**Entry Point:** `src/App.tsx`

**How to Run:**
```bash
cd frontend
npm run dev
```

**Port:** 3000

**Key Dependencies:**
- @mui/material - Component library
- @mui/icons-material - Icons for timeline events
- axios - API calls
- dayjs - Date formatting
- react-router-dom - Navigation

### Backend

**Tech Stack:**
- Language: Python
- Framework: FastAPI
- ORM: SQLAlchemy
- Database: PostgreSQL
- Key directories: app/

**How to Run:**
```bash
cd backend
# Activate virtual environment
uvicorn app.main:app --reload
```

**Port:** 8000

**Existing Inspection API Routes:**
- `GET /api/v1/projects/{project_id}/inspections` - List inspections
- `GET /api/v1/projects/{project_id}/inspections/{inspection_id}` - Get inspection detail
- `POST /api/v1/projects/{project_id}/inspections/{inspection_id}/complete` - Complete inspection
- `POST /api/v1/projects/{project_id}/inspections/{inspection_id}/findings` - Add finding

## Files to Modify

Based on the project structure, the following files will likely need to be created or modified:

| File | Service | What to Change |
|------|---------|---------------|
| `frontend/src/components/InspectionHistoryTimeline.tsx` | frontend | Create new timeline component |
| `frontend/src/pages/InspectionDetailPage.tsx` | frontend | Integrate timeline component into inspection detail view |
| `frontend/src/services/inspectionService.ts` | frontend | Add method to fetch inspection history |
| `backend/app/api/v1/inspections.py` | backend | Add GET endpoint for inspection history |
| `backend/app/crud/inspection.py` | backend | Add CRUD method to retrieve history from audit table |

## Files to Reference

These files show patterns to follow (exact paths may vary based on actual project structure):

| File | Pattern to Copy |
|------|----------------|
| `backend/app/api/v1/audit.py` | How audit/history data is retrieved and structured |
| `frontend/src/components/*Timeline*.tsx` | Existing timeline components (if any) |
| `frontend/src/components/InspectionCard.tsx` | Component structure and MUI styling patterns |
| `backend/app/models/audit.py` | Audit trail database model structure |

## Patterns to Follow

### Backend: Audit Trail Pattern

The project appears to have an audit system (based on `/api/v1/audit` endpoint). Follow this pattern:

**Key Points:**
- Use existing audit table/model to track inspection changes
- Query audit records filtered by `entity_type='inspection'` and `entity_id=inspection_id`
- Return chronological list of events with: timestamp, action, user, changes
- Include related events (findings, status changes, completion)

**Example Response Structure:**
```json
{
  "inspection_id": 123,
  "events": [
    {
      "id": 1,
      "timestamp": "2026-01-15T10:30:00Z",
      "event_type": "created",
      "user": {"id": 5, "name": "John Doe"},
      "description": "Inspection created",
      "metadata": {}
    },
    {
      "id": 2,
      "timestamp": "2026-01-16T14:20:00Z",
      "event_type": "status_changed",
      "user": {"id": 5, "name": "John Doe"},
      "description": "Status changed from Pending to In Progress",
      "metadata": {"from": "pending", "to": "in_progress"}
    },
    {
      "id": 3,
      "timestamp": "2026-01-17T09:15:00Z",
      "event_type": "finding_added",
      "user": {"id": 7, "name": "Jane Smith"},
      "description": "Finding added: Concrete cracking observed",
      "metadata": {"finding_id": 45, "severity": "medium"}
    }
  ]
}
```

### Frontend: MUI Timeline Component

Use Material-UI's Timeline component for consistent styling:

```typescript
import Timeline from '@mui/material/Timeline';
import TimelineItem from '@mui/material/TimelineItem';
import TimelineSeparator from '@mui/material/TimelineSeparator';
import TimelineConnector from '@mui/material/TimelineConnector';
import TimelineContent from '@mui/material/TimelineContent';
import TimelineDot from '@mui/material/TimelineDot';
import TimelineOppositeContent from '@mui/material/TimelineOppositeContent';
```

**Key Points:**
- Use vertical timeline orientation (default)
- Display timestamp on the opposite side
- Use different colored dots/icons for different event types
- Format timestamps with dayjs (e.g., "Jan 15, 2026 10:30 AM")
- Show user avatar or initials for attribution

### Frontend: Event Type Styling

Map event types to appropriate icons and colors:

```typescript
const eventConfig = {
  created: { icon: <AddCircleIcon />, color: 'primary' },
  status_changed: { icon: <SyncIcon />, color: 'info' },
  finding_added: { icon: <WarningIcon />, color: 'warning' },
  completed: { icon: <CheckCircleIcon />, color: 'success' },
  updated: { icon: <EditIcon />, color: 'grey' }
};
```

## Requirements

### Functional Requirements

1. **Display Inspection History Timeline**
   - Description: Show chronological list of all events related to an inspection
   - Acceptance: Timeline displays all events from creation to present, sorted by timestamp (newest first or oldest first)

2. **Event Details**
   - Description: Each timeline item shows timestamp, event type, user, and description
   - Acceptance: Every event displays formatted timestamp, appropriate icon, user who performed action, and human-readable description

3. **Visual Design Consistency**
   - Description: Timeline matches design reference (25-history-timeline.png) and project styling
   - Acceptance: Component uses MUI components, follows color scheme, and matches vertical timeline layout from reference image

4. **Backend API Integration**
   - Description: Frontend fetches timeline data from new backend endpoint
   - Acceptance: API endpoint returns inspection history as structured JSON, frontend displays data without errors

### Edge Cases

1. **Empty Timeline** - If inspection has no events yet, display "No history available" message
2. **Large Event Lists** - For inspections with 50+ events, implement pagination or "Load more" button
3. **Missing User Data** - If user who performed action is deleted, show "Unknown User" or their ID
4. **Concurrent Updates** - Handle case where timeline data changes between page load and refresh
5. **API Errors** - Display error state if history endpoint fails, with retry button

## Implementation Notes

### DO
- Follow the existing inspection detail page layout and component structure
- Reuse the existing audit table/system for tracking inspection events
- Use MUI Timeline components for consistent Material Design styling
- Format all timestamps consistently using dayjs with user's timezone
- Add loading skeleton while fetching timeline data
- Handle empty states gracefully with helpful messaging
- Use TypeScript interfaces for timeline event data
- Write unit tests for the timeline component

### DON'T
- Create a new audit/history tracking system (use existing audit infrastructure)
- Hardcode event type strings (use enums or constants)
- Fetch all audit records (filter by inspection ID server-side)
- Block the page load waiting for timeline data (load asynchronously)
- Mix different date formatting libraries (stick to dayjs)

## Development Environment

### Start Services

```bash
# Terminal 1 - Backend
cd backend
source venv/bin/activate  # or venv\Scripts\activate on Windows
uvicorn app.main:app --reload

# Terminal 2 - Frontend
cd frontend
npm run dev

# Terminal 3 - Database (if not using Docker)
# PostgreSQL should be running on localhost:5432
```

### With Docker Compose

```bash
docker-compose up -d
```

### Service URLs
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

### Required Environment Variables

**Backend (.env):**
- `DATABASE_URL`: postgresql+asyncpg://localhost:5432/builder_db
- `ENVIRONMENT`: development
- `DEBUG`: true

**Frontend (.env):**
- `VITE_API_URL`: http://localhost:8000/api/v1

## Success Criteria

The task is complete when:

1. [ ] Timeline component displays on inspection detail page
2. [ ] All inspection events shown in chronological order with correct timestamps
3. [ ] Event icons and colors match event types appropriately
4. [ ] User attribution shown for each event
5. [ ] Backend endpoint returns inspection history data
6. [ ] Timeline matches visual design from 25-history-timeline.png
7. [ ] No console errors or TypeScript errors
8. [ ] Existing tests still pass
9. [ ] Component handles loading and error states
10. [ ] Timeline is responsive and works on mobile devices

## QA Acceptance Criteria

**CRITICAL**: These criteria must be verified by the QA Agent before sign-off.

### Unit Tests
| Test | File | What to Verify |
|------|------|----------------|
| Timeline Component Render | `frontend/src/components/InspectionHistoryTimeline.test.tsx` | Component renders without crashing with mock data |
| Empty State Display | `frontend/src/components/InspectionHistoryTimeline.test.tsx` | Shows "No history" message when events array is empty |
| Event Rendering | `frontend/src/components/InspectionHistoryTimeline.test.tsx` | Each event displays timestamp, icon, user, and description |
| API Endpoint Test | `backend/tests/api/v1/test_inspections.py` | GET /inspections/{id}/history returns 200 with valid data structure |

### Integration Tests
| Test | Services | What to Verify |
|------|----------|----------------|
| Fetch Timeline Data | frontend ↔ backend | Frontend calls backend API and renders returned events |
| Event Type Mapping | frontend ↔ backend | Backend event types correctly map to frontend icons/colors |
| Timestamp Formatting | frontend ↔ backend | UTC timestamps from backend display correctly in user timezone |

### End-to-End Tests
| Flow | Steps | Expected Outcome |
|------|-------|------------------|
| View Inspection Timeline | 1. Navigate to inspection detail page 2. Scroll to timeline section | Timeline displays with all historical events |
| Verify Event Chronology | 1. Create inspection 2. Add finding 3. Complete inspection 4. View timeline | Timeline shows 3+ events in correct order |

### Browser Verification (if frontend)
| Page/Component | URL | Checks |
|----------------|-----|--------|
| Inspection Detail Page | `http://localhost:3000/projects/{id}/inspections/{id}` | Timeline component visible and styled correctly |
| Timeline Component | Component view | Matches design reference 25-history-timeline.png |
| Responsive Design | Mobile view (375px width) | Timeline is readable and functional on mobile |

### Database Verification (if applicable)
| Check | Query/Command | Expected |
|-------|---------------|----------|
| Audit Records Exist | `SELECT * FROM audit_logs WHERE entity_type='inspection' LIMIT 5` | Records exist for inspection events |

### QA Sign-off Requirements
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] All E2E tests pass
- [ ] Browser verification complete (Desktop and mobile)
- [ ] Timeline displays correctly with real data
- [ ] Visual design matches 25-history-timeline.png reference
- [ ] No regressions in existing inspection functionality
- [ ] Code follows established TypeScript/Python patterns
- [ ] No security vulnerabilities introduced
- [ ] Component performance acceptable (renders in <500ms for 50 events)
- [ ] Accessibility: Timeline is keyboard navigable and screen-reader friendly
