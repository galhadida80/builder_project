# Specification: Add RFI Dashboard Widget

## Overview

Create a new dashboard widget component (`RFIStatsWidget`) that displays real-time RFI (Request for Information) statistics including open RFIs, overdue items, items answered today, and monthly closure counts. This widget provides users with at-a-glance visibility of RFI status without leaving the dashboard, with click-through functionality to navigate to the full RFI list with appropriate filters applied.

## Workflow Type

**Type**: feature

**Rationale**: This is a new feature addition that creates a reusable dashboard widget component, integrates with existing RFI APIs, and enhances the dashboard user experience. It requires new component creation, API integration, navigation logic, and visual design implementation.

## Task Scope

### Services Involved
- **frontend** (primary) - React/TypeScript application for UI component creation and dashboard integration

### This Task Will:
- [ ] Create new `RFIStatsWidget` component with TypeScript
- [ ] Fetch RFI statistics from existing backend API (`/projects/{project_id}/rfis/summary`)
- [ ] Display 4 key metrics: Open RFIs, Overdue RFIs, Answered Today, Total Closed This Month
- [ ] Implement visual indicators (MUI icons, color coding) for different RFI states
- [ ] Add click handlers for navigation to RFI list with appropriate filters
- [ ] Integrate widget into main dashboard layout
- [ ] Implement loading states and error handling
- [ ] Add responsive styling using Emotion/MUI

### Out of Scope:
- Backend API modifications (existing `/projects/{project_id}/rfis/summary` endpoint should provide necessary data)
- RFI list view modifications (assuming filtering capability already exists)
- Creating new RFI data models or database changes
- Authentication or authorization changes
- Real-time updates via WebSockets (initial implementation will poll or refresh on dashboard load)

## Service Context

### frontend

**Tech Stack:**
- Language: TypeScript
- Framework: React
- Build Tool: Vite
- Styling: Emotion
- Component Library: Material-UI (MUI)
- Key dependencies: @mui/material, @mui/icons-material, react-router-dom, axios, dayjs

**Entry Point:** `src/App.tsx`

**How to Run:**
```bash
cd frontend
npm run dev
```

**Port:** 3000

**Key Directories:**
- `src/` - Source code including components, pages, hooks, services

## Files to Modify

| File | Service | What to Change |
|------|---------|---------------|
| `src/pages/Dashboard.tsx` (or similar) | frontend | Add `<RFIStatsWidget />` component to dashboard layout |
| `src/components/dashboard/RFIStatsWidget.tsx` (new) | frontend | Create new widget component with stat display and navigation |
| `src/services/rfiService.ts` (or similar) | frontend | Add API call to fetch RFI summary statistics if not already present |
| `src/types/rfi.ts` (or similar) | frontend | Add TypeScript interface for RFI statistics response |

## Files to Reference

These files show patterns to follow (exact paths will need to be discovered during implementation):

| File | Pattern to Copy |
|------|----------------|
| Existing dashboard widget components (e.g., `*Widget.tsx`) | Dashboard widget structure, layout, and styling patterns |
| Existing RFI components (e.g., `RFIList.tsx`, `RFICard.tsx`) | RFI data fetching patterns, navigation, and filtering logic |
| API service files (e.g., `src/services/*.ts`) | Axios configuration, error handling, and TypeScript typing |
| Dashboard layout file | How widgets are registered and rendered on the dashboard |

## Patterns to Follow

### Component Structure Pattern

Follow existing dashboard widget patterns:

```typescript
// Example widget component structure
import React from 'react';
import { Box, Card, CardContent, Typography, Grid } from '@mui/material';
import { useNavigate } from 'react-router-dom';

interface RFIStatsWidgetProps {
  projectId: string;
}

export const RFIStatsWidget: React.FC<RFIStatsWidgetProps> = ({ projectId }) => {
  const [stats, setStats] = useState<RFIStats | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Fetch data, handle click events

  return (
    <Card>
      <CardContent>
        {/* Stat display with icons and colors */}
      </CardContent>
    </Card>
  );
};
```

**Key Points:**
- Use MUI Card component as container
- Implement loading and error states
- Use TypeScript interfaces for type safety
- Follow React Hooks patterns (useState, useEffect)

### API Integration Pattern

```typescript
// src/services/rfiService.ts
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export interface RFIStats {
  open_count: number;
  overdue_count: number;
  answered_today: number;
  closed_this_month: number;
}

export const fetchRFIStats = async (projectId: string): Promise<RFIStats> => {
  const response = await axios.get(`${API_BASE_URL}/projects/${projectId}/rfis/summary`);
  return response.data;
};
```

**Key Points:**
- Use axios for HTTP requests
- Environment variable for API URL
- Proper TypeScript typing for responses
- Error handling with try-catch

### Navigation Pattern

```typescript
const navigate = useNavigate();

const handleStatClick = (filter: string) => {
  navigate(`/projects/${projectId}/rfis?status=${filter}`);
};
```

**Key Points:**
- Use react-router-dom's useNavigate hook
- Pass filter parameters via query strings
- Maintain project context in navigation

## Requirements

### Functional Requirements

1. **Display Open RFIs Count**
   - Description: Show the number of RFIs awaiting response
   - Acceptance: Widget displays accurate count of RFIs with "open" or "pending" status, clicking navigates to RFI list filtered by open items

2. **Display Overdue RFIs Count**
   - Description: Show the number of RFIs past their due date
   - Acceptance: Widget displays accurate count of overdue RFIs (due_date < today), clicking navigates to RFI list filtered by overdue items, displayed with warning color (e.g., red/orange)

3. **Display Answered Today Count**
   - Description: Show the number of RFIs answered in the current day
   - Acceptance: Widget displays count of RFIs answered today (response_date = today), clicking navigates to RFI list filtered by today's responses

4. **Display Total Closed This Month Count**
   - Description: Show the total number of RFIs closed in the current month
   - Acceptance: Widget displays count of RFIs closed in current month, clicking navigates to RFI list filtered by closed items from this month

5. **Visual Indicators**
   - Description: Use icons and color coding for different states
   - Acceptance: Each stat has an appropriate MUI icon (e.g., InfoIcon, WarningIcon, CheckCircleIcon), colors reflect status urgency (red for overdue, green for completed, blue for open)

6. **Dashboard Integration**
   - Description: Widget is visible on the main dashboard
   - Acceptance: Widget appears in dashboard layout, responsive across screen sizes, loads automatically when dashboard is accessed

### Edge Cases

1. **No RFI Data Available** - Display zeros or "No data" message with appropriate empty state styling
2. **API Error or Timeout** - Show error message in widget with retry option, don't crash the dashboard
3. **Project Without RFIs** - Display all counts as 0, maintain visual structure
4. **Loading State** - Show skeleton loaders or spinner while fetching data
5. **Timezone Handling** - Ensure "today" and "this month" calculations respect user's timezone using dayjs

## Implementation Notes

### DO
- Follow existing dashboard widget component patterns for consistency
- Reuse MUI components (Card, Typography, Grid, Box) for layout
- Use dayjs for date calculations (already in dependencies)
- Implement proper TypeScript interfaces for all data structures
- Add loading skeletons using MUI Skeleton component
- Use MUI icons from @mui/icons-material package
- Implement error boundaries to prevent dashboard crashes
- Make the widget responsive using MUI Grid system
- Add hover effects on clickable stat items for better UX
- Use existing axios instance configuration from service layer

### DON'T
- Create custom date parsing when dayjs is available
- Make synchronous API calls (always use async/await)
- Hardcode API URLs (use environment variables)
- Skip loading and error states
- Forget to handle null/undefined data from API
- Create new styling system (use Emotion with MUI theme)
- Bypass existing routing structure for navigation
- Add inline styles (use MUI's sx prop or Emotion's styled components)

## Development Environment

### Start Services

```bash
# Terminal 1: Start backend API
cd backend
uvicorn app.main:app --reload --port 8000

# Terminal 2: Start frontend dev server
cd frontend
npm run dev

# Terminal 3 (optional): Start database if needed
docker-compose up db redis
```

### Service URLs
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

### Required Environment Variables

**Frontend** (`.env` file in `frontend/` directory):
```
VITE_API_URL=http://localhost:8000/api/v1
```

**Backend** (already configured, no changes needed):
- DATABASE_URL
- REDIS_URL
- See backend/.env for full configuration

## Success Criteria

The task is complete when:

1. [ ] `RFIStatsWidget` component is created and displays all 4 required metrics
2. [ ] API integration with `/projects/{project_id}/rfis/summary` endpoint works correctly
3. [ ] Visual indicators (icons and colors) are implemented using MUI components
4. [ ] Click-through navigation to RFI list with appropriate filters functions properly
5. [ ] Widget is integrated into main dashboard and loads automatically
6. [ ] Loading states and error handling are implemented
7. [ ] Component is responsive and works on mobile, tablet, and desktop
8. [ ] No console errors or warnings
9. [ ] Existing tests still pass
10. [ ] TypeScript compilation succeeds with no errors
11. [ ] New functionality verified via browser at http://localhost:3000

## QA Acceptance Criteria

**CRITICAL**: These criteria must be verified by the QA Agent before sign-off.

### Unit Tests
| Test | File | What to Verify |
|------|------|----------------|
| RFIStatsWidget renders correctly | `frontend/src/components/dashboard/RFIStatsWidget.test.tsx` | Component renders with all 4 stat sections |
| Loading state displays | `frontend/src/components/dashboard/RFIStatsWidget.test.tsx` | Skeleton or spinner shows while loading |
| Error state displays | `frontend/src/components/dashboard/RFIStatsWidget.test.tsx` | Error message shows when API fails |
| Click handlers work | `frontend/src/components/dashboard/RFIStatsWidget.test.tsx` | Navigation is triggered with correct filters |
| API service function | `frontend/src/services/rfiService.test.ts` | fetchRFIStats returns correct data structure |

### Integration Tests
| Test | Services | What to Verify |
|------|----------|----------------|
| Widget fetches real API data | frontend ↔ backend | Widget successfully calls `/projects/{project_id}/rfis/summary` and displays data |
| Navigation to RFI list | frontend ↔ routing | Clicking stat items navigates to RFI list with correct query parameters |
| Error handling | frontend ↔ backend | Widget handles API errors gracefully (500, 404, network errors) |

### End-to-End Tests
| Flow | Steps | Expected Outcome |
|------|-------|------------------|
| Dashboard load with RFI widget | 1. Login 2. Navigate to dashboard 3. Observe widget | Widget loads and displays RFI stats without errors |
| Click open RFIs stat | 1. Click "Open RFIs" in widget 2. Observe navigation | Navigate to RFI list page with status=open filter applied |
| Click overdue RFIs stat | 1. Click "Overdue RFIs" in widget 2. Observe navigation | Navigate to RFI list page with overdue filter applied |
| Widget with no RFI data | 1. Navigate to project with no RFIs 2. View dashboard | Widget displays all counts as 0, no errors |

### Browser Verification (Frontend)
| Page/Component | URL | Checks |
|----------------|-----|--------|
| Dashboard with RFI Widget | `http://localhost:3000/dashboard` (or project dashboard) | ✓ Widget is visible<br>✓ All 4 stats display<br>✓ Icons are present<br>✓ Colors indicate status<br>✓ No console errors |
| Responsive Design | Same URL (resize browser) | ✓ Widget adapts to mobile (320px)<br>✓ Widget adapts to tablet (768px)<br>✓ Widget adapts to desktop (1920px) |
| Loading State | Same URL (throttle network) | ✓ Loading indicator appears<br>✓ UI doesn't break during load |
| Error State | Same URL (kill backend) | ✓ Error message appears<br>✓ Dashboard doesn't crash<br>✓ Retry option works |

### Database Verification (Not Applicable)
No database changes required. Backend API endpoint already exists.

### QA Sign-off Requirements
- [ ] All unit tests pass (component rendering, click handlers, API service)
- [ ] All integration tests pass (API communication, navigation)
- [ ] All E2E tests pass (full user flows)
- [ ] Browser verification complete (visual design, responsive behavior)
- [ ] Widget displays correct data matching backend API response
- [ ] Navigation to RFI list with filters works correctly
- [ ] Loading and error states function properly
- [ ] No regressions in existing dashboard functionality
- [ ] Code follows established patterns (TypeScript, React Hooks, MUI styling)
- [ ] No security vulnerabilities introduced (no exposed API keys, proper error handling)
- [ ] Performance is acceptable (widget loads in < 2 seconds)
- [ ] TypeScript compilation succeeds with no errors or warnings
