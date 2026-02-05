# Specification: Build Team Workload View

## Overview

This task implements a Team Workload View feature that displays team members organized into team cards, with visual workload indicators (bars) and a calendar component to track team capacity and assignments over time. The feature provides project managers with visibility into team utilization and helps with resource planning and allocation.

## Workflow Type

**Type**: feature

**Rationale**: This is a new feature implementation that introduces a previously non-existent view to the application. It requires creating new UI components, integrating with existing APIs, and potentially adding new data visualization elements.

## Task Scope

### Services Involved
- **frontend** (primary) - React/TypeScript application where the Team Workload View will be implemented
- **backend** (integration) - FastAPI service providing team member, project, and workload data through existing APIs

### This Task Will:
- [ ] Create a new Team Workload View page/component in the frontend
- [ ] Implement team card components displaying team member information
- [ ] Add workload visualization bars showing capacity and utilization
- [ ] Integrate a calendar component for timeline-based workload views
- [ ] Connect to existing backend APIs to fetch team and project data
- [ ] Add routing and navigation to access the new view
- [ ] Implement responsive layout matching the design reference (12-team-workload.png)

### Out of Scope:
- Backend API modifications (using existing endpoints)
- Team member management (CRUD operations)
- Workload calculation algorithms (using existing data)
- Real-time updates via WebSockets
- Export functionality
- Advanced filtering beyond basic date ranges
- Workload editing/reassignment features

## Service Context

### Frontend

**Tech Stack:**
- Language: TypeScript
- Framework: React
- Build Tool: Vite
- UI Library: Material-UI (MUI)
- Styling: Emotion (CSS-in-JS)
- Date Library: dayjs
- Date Pickers: @mui/x-date-pickers
- Data Grid: @mui/x-data-grid
- Routing: react-router-dom

**Entry Point:** `src/App.tsx`

**How to Run:**
```bash
cd frontend
npm run dev
```

**Port:** 3000

**Key Dependencies:**
- `@mui/material` - UI components (Cards, Grids, Typography)
- `@mui/x-date-pickers` - Calendar and date selection
- `dayjs` - Date manipulation
- `axios` - API calls
- `react-router-dom` - Routing

### Backend

**Tech Stack:**
- Language: Python
- Framework: FastAPI
- ORM: SQLAlchemy
- Database: PostgreSQL

**How to Run:**
```bash
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Port:** 8000

**Relevant API Endpoints:**
- `GET /api/v1/projects/{project_id}/members` - Fetch project team members
- `GET /api/v1/meetings` - Get scheduled meetings
- `GET /api/v1/projects/{project_id}/inspections` - Get inspections
- `GET /api/v1/my-approvals` - Get pending approvals
- Additional workload data from project-related endpoints

## Files to Modify

| File | Service | What to Change |
|------|---------|---------------|
| `frontend/src/App.tsx` or routing config | frontend | Add route for `/team-workload` or similar path |
| TBD: Navigation component | frontend | Add menu item/link to Team Workload View |
| TBD: Create new page component | frontend | New file: `frontend/src/pages/TeamWorkload.tsx` or similar |
| TBD: Create team card component | frontend | New file: `frontend/src/components/TeamCard.tsx` or similar |
| TBD: Create workload bar component | frontend | New file: `frontend/src/components/WorkloadBar.tsx` or similar |

**Note:** Exact file paths to be determined during implementation based on existing project structure patterns.

## Files to Reference

These patterns should guide the implementation:

| File | Pattern to Copy |
|------|----------------|
| TBD: Existing dashboard/list view | Page layout structure, data fetching patterns |
| TBD: Existing card components | MUI Card usage, styling patterns |
| TBD: Existing calendar implementations | Date picker integration, date range handling |
| TBD: API service files | Axios request patterns, error handling |

**Note:** During implementation, explore the frontend codebase to identify these reference patterns.

## Patterns to Follow

### 1. MUI Card-Based Layout

Use Material-UI Card components for team cards:

```typescript
import { Card, CardContent, CardHeader, Typography } from '@mui/material';

<Card sx={{ minWidth: 275, mb: 2 }}>
  <CardHeader title="Team Name" />
  <CardContent>
    {/* Team member content */}
  </CardContent>
</Card>
```

**Key Points:**
- Use `sx` prop for styling (Emotion integration)
- Follow existing spacing conventions
- Ensure responsive design with Grid layout

### 2. Date Handling with dayjs

For calendar and date operations:

```typescript
import dayjs from 'dayjs';

const startDate = dayjs();
const endDate = dayjs().add(2, 'week');
```

**Key Points:**
- dayjs is already configured in the project
- Use for date formatting, calculations, and comparisons

### 3. API Integration Pattern

Follow existing patterns for API calls:

```typescript
import axios from 'axios';

const fetchTeamData = async (projectId: string) => {
  try {
    const response = await axios.get(`/api/v1/projects/${projectId}/members`);
    return response.data;
  } catch (error) {
    console.error('Error fetching team data:', error);
    throw error;
  }
};
```

**Key Points:**
- Use axios for HTTP requests
- Base URL already configured via VITE_API_URL
- Implement proper error handling

### 4. React Router Integration

Add route following existing patterns:

```typescript
import { Route, Routes } from 'react-router-dom';
import TeamWorkloadView from './pages/TeamWorkloadView';

<Routes>
  {/* Existing routes */}
  <Route path="/team-workload" element={<TeamWorkloadView />} />
</Routes>
```

## Requirements

### Functional Requirements

1. **Team Card Display**
   - Description: Display team members grouped by team in card format
   - Acceptance: Each team has a card showing member names, roles, and current assignments

2. **Workload Visualization**
   - Description: Visual bars showing workload percentage (0-100%) for each team/member
   - Acceptance: Bars accurately represent current workload based on assignments, with color coding (green: under-utilized, yellow: optimal, red: over-allocated)

3. **Calendar Integration**
   - Description: Calendar or timeline view showing workload distribution over time
   - Acceptance: Users can view workload by day, week, or month; can navigate between time periods

4. **Data Aggregation**
   - Description: Calculate workload from meetings, inspections, approvals, and other assignments
   - Acceptance: Workload percentages reflect all assigned activities for team members

5. **Responsive Design**
   - Description: Layout adapts to different screen sizes
   - Acceptance: View works on desktop (full cards), tablet (2-column grid), mobile (single column)

### Edge Cases

1. **No Team Data** - Display empty state message with helpful text
2. **Zero Workload** - Show 0% with appropriate messaging (available for assignments)
3. **Over 100% Workload** - Cap bars at 100% but show actual percentage in tooltip/label
4. **Missing Calendar Permissions** - Gracefully handle if calendar data unavailable
5. **Large Teams** - Implement pagination or virtualization if team size exceeds 50 members

## Implementation Notes

### DO
- Follow MUI design system and existing theme
- Use TypeScript for type safety
- Reuse existing API service patterns from other pages
- Implement loading states during data fetches
- Add error boundaries for graceful failure handling
- Use dayjs for all date operations (already in dependencies)
- Follow existing folder structure (pages, components, services)
- Reference the design file `12-team-workload.png` for visual specifications

### DON'T
- Create new backend endpoints (use existing APIs)
- Install new major dependencies without justification
- Hardcode workload calculations (derive from actual data)
- Mix date libraries (stick with dayjs)
- Skip accessibility considerations (ARIA labels, keyboard navigation)
- Implement real-time updates (out of scope)

## Development Environment

### Start Services

```bash
# Terminal 1 - Backend
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### Service URLs
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/api/v1
- API Docs: http://localhost:8000/docs

### Required Environment Variables

**Frontend (.env):**
- `VITE_API_URL`: http://localhost:8000/api/v1

**Backend (.env):**
- See backend/.env for full configuration (database, Redis, etc.)

## Success Criteria

The task is complete when:

1. [ ] Team Workload View is accessible via navigation menu
2. [ ] Team cards display correctly with member information
3. [ ] Workload bars visualize capacity accurately with color coding
4. [ ] Calendar component allows date range selection and navigation
5. [ ] Data fetches from existing backend APIs successfully
6. [ ] Layout is responsive across desktop, tablet, and mobile viewports
7. [ ] Loading and error states are handled gracefully
8. [ ] No console errors or warnings in browser
9. [ ] Existing tests still pass (if applicable)
10. [ ] New functionality verified via browser testing
11. [ ] Implementation matches design reference (12-team-workload.png)

## QA Acceptance Criteria

**CRITICAL**: These criteria must be verified by the QA Agent before sign-off.

### Unit Tests

| Test | File | What to Verify |
|------|------|----------------|
| TeamCard component renders | `frontend/src/components/TeamCard.test.tsx` | Component renders with team data props |
| WorkloadBar component displays correctly | `frontend/src/components/WorkloadBar.test.tsx` | Bar width matches workload percentage |
| Workload calculation logic | `frontend/src/utils/workloadCalculation.test.ts` | Correctly aggregates workload from various sources |
| Date range utilities | `frontend/src/utils/dateUtils.test.ts` | Date calculations for calendar views work correctly |

### Integration Tests

| Test | Services | What to Verify |
|------|----------|----------------|
| Fetch team members API | frontend ↔ backend | Successfully retrieves team data from `/api/v1/projects/{id}/members` |
| Aggregate workload data | frontend ↔ backend | Combines data from meetings, inspections, approvals endpoints |
| Error handling | frontend ↔ backend | Gracefully handles API failures with user-friendly messages |

### End-to-End Tests (Playwright)

| Flow | Steps | Expected Outcome |
|------|-------|------------------|
| Navigate to Team Workload | 1. Open app 2. Click Team Workload menu 3. View loads | Page displays team cards with workload bars |
| Select date range | 1. Open calendar picker 2. Select start/end dates 3. Apply | Workload data updates for selected period |
| View team details | 1. Click on team card 2. Expand members | Individual member workloads visible |
| Handle empty state | 1. View with no team data | Shows empty state message |
| Responsive layout | 1. Resize browser to mobile 2. Check layout | Cards stack in single column |

### Browser Verification (Frontend)

| Page/Component | URL | Checks |
|----------------|-----|--------|
| Team Workload View | `http://localhost:3000/team-workload` | ✓ Page loads without errors<br>✓ Team cards render<br>✓ Workload bars display<br>✓ Calendar is interactive<br>✓ No console errors |
| Workload Bar Component | Within team cards | ✓ Correct color coding (green/yellow/red)<br>✓ Percentage labels visible<br>✓ Tooltips show details on hover |
| Calendar Component | Within view | ✓ Date picker opens<br>✓ Date range selectable<br>✓ Navigation buttons work |
| Responsive Layout | Test at 320px, 768px, 1920px | ✓ Layout adapts appropriately<br>✓ No horizontal scroll<br>✓ Text remains readable |

### Database Verification

| Check | Query/Command | Expected |
|-------|---------------|----------|
| N/A (read-only feature) | N/A | Uses existing database schema |

### QA Sign-off Requirements

- [ ] All unit tests pass (`npm test` in frontend)
- [ ] All integration tests pass
- [ ] All E2E tests pass (`npm run test:e2e` in frontend)
- [ ] Browser verification complete (Chrome, Firefox, Safari)
- [ ] Responsive design verified on mobile, tablet, desktop
- [ ] No regressions in existing functionality (navigation, other pages)
- [ ] Code follows established patterns (TypeScript, MUI, React best practices)
- [ ] No security vulnerabilities introduced (no XSS, properly escaped data)
- [ ] Performance is acceptable (page loads < 2s, no memory leaks)
- [ ] Accessibility standards met (WCAG 2.1 Level AA where possible)
- [ ] Design matches reference image (12-team-workload.png)

## Additional Considerations

### Data Sources for Workload Calculation

Aggregate workload from these sources (estimate hours/percentage):
- **Meetings**: Count scheduled meetings, estimate 1-2 hours each
- **Inspections**: Assigned inspections, estimate 2-4 hours each
- **Approvals**: Pending approvals, estimate 0.5-1 hour each
- **Project Tasks**: If task system exists, include task assignments
- **Default Capacity**: Assume 40 hours/week per team member

### Workload Percentage Formula

```
Workload % = (Assigned Hours / Available Hours) × 100

Where:
- Assigned Hours = Sum of all task/meeting/inspection time estimates
- Available Hours = 40 hours/week (or configurable per member)
```

### Color Coding Thresholds

- **Green (Under-utilized)**: 0-60%
- **Yellow (Optimal)**: 61-90%
- **Orange (High)**: 91-100%
- **Red (Over-allocated)**: > 100%

### Future Enhancements (Out of Scope)

- Drag-and-drop workload reassignment
- Real-time collaboration features
- Export to CSV/PDF
- Integration with external calendar systems (Google Calendar, Outlook)
- Predictive workload forecasting
- Skills-based assignment suggestions
