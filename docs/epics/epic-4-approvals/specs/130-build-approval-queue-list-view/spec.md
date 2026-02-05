# Specification: Build Approval Queue List View

## Overview

This feature adds a new Approval Queue List View component to the frontend that displays pending approvals in a filterable, sortable table format. Users will be able to view all approvals requiring their action, filter by various criteria, and take action directly from the list view. The component will consume the existing `/my-approvals` and `/approvals` API endpoints to fetch approval data.

## Workflow Type

**Type**: feature

**Rationale**: This is a new user-facing component that adds functionality to display and manage approval queues. It introduces a new view with table display, filtering capabilities, and action buttons, making it a standard feature implementation workflow.

## Task Scope

### Services Involved
- **frontend** (primary) - Create new approval queue list view component with table, filters, and actions
- **backend** (integration) - Consume existing approval endpoints for data retrieval and action execution

### This Task Will:
- [ ] Create a new ApprovalQueueList component using Material-UI DataGrid
- [ ] Implement filter controls for status, project, date range, and approval type
- [ ] Add action buttons for approve/reject/view details
- [ ] Integrate with existing `/my-approvals` and `/approvals` API endpoints
- [ ] Add routing configuration for the new approval queue page
- [ ] Implement loading and error states
- [ ] Add pagination support for large datasets

### Out of Scope:
- Backend API modifications (existing approval endpoints will be used as-is)
- Approval workflow logic changes
- Email notifications for approval actions
- Bulk approval operations (can be added in future iteration)
- Mobile-optimized view (desktop-first approach)

## Service Context

### Frontend

**Tech Stack:**
- Language: TypeScript
- Framework: React
- UI Library: Material-UI (@mui/material, @mui/x-data-grid)
- Styling: Emotion
- Build Tool: Vite
- HTTP Client: axios
- Routing: react-router-dom

**Key directories:**
- `src/` - Source code directory
- `src/components/` - Reusable components (expected location)
- `src/pages/` - Page-level components (expected location)
- `src/api/` - API integration layer (expected location)

**Entry Point:** `src/App.tsx`

**How to Run:**
```bash
cd frontend
npm run dev
```

**Port:** 3000

**Environment Variables:**
- `VITE_API_URL`: http://localhost:8000/api/v1

### Backend

**Tech Stack:**
- Language: Python
- Framework: FastAPI
- ORM: SQLAlchemy
- Database: PostgreSQL

**Key directories:**
- `app/` - Application code
- `app/api/v1/` - API route handlers
- `app/models/` - Database models

**How to Run:**
```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

**Port:** 8000

**Relevant API Endpoints:**
- `GET /approvals` - Get all approvals
- `GET /projects/{project_id}/approvals` - Get project-specific approvals
- `GET /projects/{project_id}/approvals/{approval_id}` - Get approval details
- `POST /projects/{project_id}/approvals/{approval_id}/steps/{step_id}/action` - Take action on approval step
- `GET /my-approvals` - Get approvals for current user

## Files to Modify

| File | Service | What to Change |
|------|---------|---------------|
| `frontend/src/App.tsx` | frontend | Add new route for approval queue page |
| `frontend/src/pages/ApprovalQueuePage.tsx` | frontend | Create new page component (new file) |
| `frontend/src/components/ApprovalQueueList.tsx` | frontend | Create table component with filters (new file) |
| `frontend/src/api/approvals.ts` | frontend | Create API client for approval endpoints (new file) |
| `frontend/src/types/approval.ts` | frontend | Create TypeScript types for approval data (new file) |

## Files to Reference

These files show patterns to follow:

| File | Pattern to Copy |
|------|----------------|
| Files to be discovered | Material-UI DataGrid usage pattern |
| Files to be discovered | API integration with axios pattern |
| Files to be discovered | Filter component implementation |
| Files to be discovered | Page routing configuration |
| `backend/app/api/v1/approvals.py` | Response data structure for approvals |

## Patterns to Follow

### Material-UI DataGrid Pattern

The frontend uses `@mui/x-data-grid` for table displays. Expected pattern:

```typescript
import { DataGrid, GridColDef } from '@mui/x-data-grid';

const columns: GridColDef[] = [
  { field: 'id', headerName: 'ID', width: 90 },
  { field: 'title', headerName: 'Title', width: 200 },
  { field: 'status', headerName: 'Status', width: 130 },
  // ... more columns
];

<DataGrid
  rows={data}
  columns={columns}
  pageSize={25}
  rowsPerPageOptions={[10, 25, 50, 100]}
  checkboxSelection
  disableSelectionOnClick
  loading={isLoading}
/>
```

**Key Points:**
- Define column configuration with GridColDef type
- Use pagination props for large datasets
- Handle loading states with loading prop
- Use checkboxSelection for future bulk actions

### API Integration Pattern

Frontend uses axios for HTTP requests:

```typescript
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL;

export const fetchApprovals = async (filters?: ApprovalFilters) => {
  const response = await axios.get(`${API_BASE}/my-approvals`, {
    params: filters
  });
  return response.data;
};
```

**Key Points:**
- Use environment variable for API base URL
- Export async functions for each endpoint
- Handle query parameters for filtering
- Return typed response data

### React Page Component Pattern

Expected structure for page components:

```typescript
import React, { useState, useEffect } from 'react';
import { Container, Typography, Box } from '@mui/material';

export const ApprovalQueuePage: React.FC = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch data on mount
  }, []);

  return (
    <Container maxWidth="xl">
      <Typography variant="h4" component="h1" gutterBottom>
        Approval Queue
      </Typography>
      {/* Component content */}
    </Container>
  );
};
```

**Key Points:**
- Use functional components with TypeScript
- Manage state with useState hooks
- Fetch data with useEffect
- Use Material-UI Container for layout

## Requirements

### Functional Requirements

1. **Display Approval Queue Table**
   - Description: Show all pending approvals in a paginated table view
   - Acceptance: Table displays approval ID, title, project, requester, status, created date, and due date columns

2. **Filter Approvals**
   - Description: Provide filter controls above the table for status, project, and date range
   - Acceptance: Filters update table data when changed, with immediate visual feedback

3. **Sort Approvals**
   - Description: Allow sorting by any column (ascending/descending)
   - Acceptance: Clicking column headers sorts the data

4. **View Approval Details**
   - Description: Navigate to detailed approval view when clicking a row
   - Acceptance: Clicking a row opens approval detail page

5. **Take Actions**
   - Description: Provide approve/reject action buttons in the action column
   - Acceptance: Action buttons trigger appropriate API calls and update UI on success

6. **Show Loading States**
   - Description: Display loading indicators while fetching data
   - Acceptance: Skeleton or spinner shown during API calls

7. **Handle Empty State**
   - Description: Show helpful message when no approvals match filters
   - Acceptance: "No approvals found" message with illustration displayed when table is empty

### Edge Cases

1. **API Error Handling** - Display error message in Snackbar/Alert component when API fails, allow retry
2. **Stale Data** - Implement refresh button or auto-refresh to ensure data is current
3. **Permission-Based Display** - Show only approvals the current user has permission to view/act upon
4. **Long Approval Titles** - Truncate long text with ellipsis and show full text on hover
5. **Concurrent Actions** - Disable action buttons after click to prevent duplicate submissions

## Implementation Notes

### DO
- Use Material-UI DataGrid (@mui/x-data-grid) for the table component
- Implement TypeScript interfaces for all approval data structures
- Follow existing Material-UI theming and styling patterns
- Use axios for API calls with proper error handling
- Add loading skeletons during data fetch
- Implement proper TypeScript types for all props and state
- Use react-router-dom for navigation to detail pages
- Add responsive design considerations (min-width for table)

### DON'T
- Don't create custom table components when DataGrid provides required functionality
- Don't hardcode API URLs - use environment variables
- Don't fetch all approvals at once - use pagination
- Don't implement new backend endpoints (use existing ones)
- Don't add authentication logic (assume existing auth context)

## Development Environment

### Start Services

```bash
# Terminal 1 - Backend
cd backend
uvicorn app.main:app --reload --port 8000

# Terminal 2 - Frontend
cd frontend
npm run dev

# Terminal 3 - Database (if not running)
docker-compose up db redis
```

### Service URLs
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs

### Required Environment Variables
- Frontend:
  - `VITE_API_URL`: http://localhost:8000/api/v1
- Backend:
  - `DATABASE_URL`: postgresql+asyncpg://localhost:5432/builder_db
  - `REDIS_URL`: redis://localhost:6379/0
  - (Other backend env vars as defined in project_index.json)

## Success Criteria

The task is complete when:

1. [ ] Approval queue page is accessible via navigation/routing
2. [ ] Table displays all relevant approval columns with proper formatting
3. [ ] Filter controls update the table data correctly
4. [ ] Sorting works on all sortable columns
5. [ ] Action buttons trigger API calls and show success/error feedback
6. [ ] Loading states are visible during API operations
7. [ ] Empty state message displays when no approvals exist
8. [ ] No console errors or TypeScript compilation errors
9. [ ] Existing tests still pass
10. [ ] Page is responsive and usable at standard desktop resolutions (1280px+)

## QA Acceptance Criteria

**CRITICAL**: These criteria must be verified by the QA Agent before sign-off.

### Unit Tests
| Test | File | What to Verify |
|------|------|----------------|
| ApprovalQueueList rendering | `frontend/src/components/ApprovalQueueList.test.tsx` | Component renders with empty data, loading state, and populated data |
| Filter functionality | `frontend/src/components/ApprovalQueueList.test.tsx` | Filters correctly update query parameters and trigger data fetch |
| API client functions | `frontend/src/api/approvals.test.ts` | API functions construct correct URLs and handle responses/errors |

### Integration Tests
| Test | Services | What to Verify |
|------|----------|----------------|
| Approval data fetch | frontend ↔ backend | GET /my-approvals returns expected data structure |
| Approval action | frontend ↔ backend | POST action endpoint updates approval status |
| Error handling | frontend ↔ backend | API errors are caught and displayed to user |

### End-to-End Tests
| Flow | Steps | Expected Outcome |
|------|-------|------------------|
| View approvals | 1. Navigate to approval queue 2. Wait for load | Table displays with approval data |
| Filter approvals | 1. Open filter controls 2. Select status filter 3. Apply | Table updates to show only filtered items |
| Sort approvals | 1. Click date column header | Table sorts by date ascending, click again for descending |
| Take action | 1. Click approve button 2. Confirm | Success message shown, row updates or disappears |
| View details | 1. Click table row | Navigation to approval detail page occurs |

### Browser Verification (if frontend)
| Page/Component | URL | Checks |
|----------------|-----|--------|
| Approval Queue Page | `http://localhost:3000/approvals` | Page loads without errors, table visible |
| Filter Controls | `http://localhost:3000/approvals` | Filters are visible, functional, and reset properly |
| Action Buttons | `http://localhost:3000/approvals` | Buttons are enabled for actionable items, disabled otherwise |
| Empty State | `http://localhost:3000/approvals` | Mock empty response to verify empty state displays |
| Loading State | `http://localhost:3000/approvals` | Throttle network to verify loading indicators show |

### Database Verification (if applicable)
| Check | Query/Command | Expected |
|-------|---------------|----------|
| N/A | N/A | No database changes required (read-only feature) |

### QA Sign-off Requirements
- [ ] All unit tests pass (npm test)
- [ ] Integration tests for approval endpoints pass
- [ ] E2E tests covering key user flows pass
- [ ] Browser verification complete in Chrome and Firefox
- [ ] No console errors or warnings in browser DevTools
- [ ] No regressions in existing functionality (navigation, auth, other pages)
- [ ] Code follows established TypeScript and React patterns
- [ ] No security vulnerabilities (XSS, injection) in filter inputs
- [ ] TypeScript compilation successful with no type errors
- [ ] Material-UI theme consistency maintained
- [ ] Loading states and error messages display correctly
- [ ] Table pagination works correctly with 10, 25, 50, 100 rows per page
- [ ] Responsive layout doesn't break at 1280px and 1920px widths
