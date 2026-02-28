# Specification: Build Equipment Tracking Table

## Overview

Build a sortable equipment tracking table component with visual badge indicators for status. This component will display project equipment data fetched from the existing FastAPI equipment endpoints, providing users with a comprehensive view of all equipment items with sorting and status visualization capabilities.

## Workflow Type

**Type**: feature

**Rationale**: This is a new feature implementation that adds a complete table component with sorting and badge functionality. It integrates with existing backend equipment APIs and follows established MUI patterns in the codebase.

## Task Scope

### Services Involved
- **frontend** (primary) - New table component implementation
- **backend** (integration) - Existing equipment API endpoints

### This Task Will:
- [ ] Create an Equipment Table component using MUI DataGrid
- [ ] Implement sortable columns for equipment data (name, status, type, location, etc.)
- [ ] Add visual badge components to indicate equipment status
- [ ] Integrate with existing equipment API endpoints (`/projects/{project_id}/equipment`)
- [ ] Design responsive table layout based on reference mockup `16-equipment-list.png`
- [ ] Implement proper TypeScript typing for equipment data

### Out of Scope:
- Creating new backend API endpoints (equipment APIs already exist)
- Equipment CRUD operations (focus is on display/table only)
- Equipment detail view/modal
- Equipment filtering/search functionality (can be added later)
- Pagination (initial implementation will show all equipment)

## Service Context

### Frontend

**Tech Stack:**
- Language: TypeScript
- Framework: Next.js
- UI Library: Material-UI (@mui/material, @mui/x-data-grid)
- Styling: Emotion
- Key directories: `src/`, `components/`, `app/`, `pages/`

**Entry Point:** `src/App.tsx`

**How to Run:**
```bash
cd frontend
npm run dev
```

**Port:** 3000

**Available Dependencies:**
- `@mui/x-data-grid` - For advanced table functionality with sorting
- `@mui/material` - For badge components and styling
- `axios` - For API calls
- TypeScript - For type safety

### Backend

**Tech Stack:**
- Language: Python
- Framework: FastAPI
- ORM: SQLAlchemy

**Equipment API Endpoints:**
- `GET /api/v1/projects/{project_id}/equipment` - List all equipment for a project
- `GET /api/v1/equipment` - List all equipment
- `GET /api/v1/projects/{project_id}/equipment/{equipment_id}` - Get single equipment
- `POST /api/v1/projects/{project_id}/equipment` - Create equipment
- `PUT /api/v1/projects/{project_id}/equipment/{equipment_id}` - Update equipment
- `DELETE /api/v1/projects/{project_id}/equipment/{equipment_id}` - Delete equipment

**How to Run:**
```bash
cd backend
uvicorn app.main:app --reload
```

**Port:** 8000

## Files to Modify

| File | Service | What to Change |
|------|---------|---------------|
| `frontend/components/equipment/EquipmentTable.tsx` | frontend | **CREATE NEW** - Main equipment table component with MUI DataGrid |
| `frontend/components/equipment/StatusBadge.tsx` | frontend | **CREATE NEW** - Reusable badge component for equipment status |
| `frontend/types/equipment.ts` | frontend | **CREATE NEW** - TypeScript interfaces for equipment data |
| `frontend/pages/projects/[projectId]/equipment.tsx` | frontend | **CREATE OR UPDATE** - Page to render equipment table |

## Files to Reference

These files show patterns to follow:

| File | Pattern to Copy |
|------|----------------|
| *MUI DataGrid examples in codebase* | Table implementation with sorting |
| *Existing API service files* | API call patterns with axios |
| *Existing badge/chip components* | Badge styling and color schemes |
| *Existing TypeScript type definitions* | Type definition patterns |

## Patterns to Follow

### MUI DataGrid Pattern

The MUI X Data Grid provides built-in sorting, and the codebase already includes `@mui/x-data-grid`:

```typescript
import { DataGrid, GridColDef } from '@mui/x-data-grid';

const columns: GridColDef[] = [
  { field: 'id', headerName: 'ID', width: 90 },
  { field: 'name', headerName: 'Name', width: 200, sortable: true },
  { field: 'status', headerName: 'Status', width: 150, sortable: true },
];

<DataGrid
  rows={equipmentData}
  columns={columns}
  sortingMode="client"
  autoHeight
/>
```

**Key Points:**
- Use `GridColDef` for column definitions
- Enable `sortable: true` on relevant columns
- Use `sortingMode="client"` for client-side sorting

### Badge Component Pattern

Use MUI Chip component for status badges:

```typescript
import { Chip } from '@mui/material';

const StatusBadge = ({ status }: { status: string }) => {
  const getColor = () => {
    switch(status) {
      case 'active': return 'success';
      case 'pending': return 'warning';
      case 'inactive': return 'default';
      default: return 'default';
    }
  };

  return <Chip label={status} color={getColor()} size="small" />;
};
```

**Key Points:**
- Map status values to MUI color schemes
- Use `size="small"` for table cells
- Consider using `variant="outlined"` for visual distinction

### API Integration Pattern

Follow existing API patterns in the codebase:

```typescript
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export const fetchEquipment = async (projectId: string) => {
  const response = await axios.get(`${API_BASE_URL}/projects/${projectId}/equipment`);
  return response.data;
};
```

## Requirements

### Functional Requirements

1. **Display Equipment Data**
   - Description: Fetch and display equipment list from backend API
   - Acceptance: Table shows all equipment for selected project with columns: ID, Name, Type, Status, Location, Last Updated

2. **Sortable Columns**
   - Description: Enable sorting on all text/numeric columns
   - Acceptance: Clicking column headers sorts data ascending/descending, visual indicator shows sort direction

3. **Status Badges**
   - Description: Display visual badges for equipment status
   - Acceptance: Status column shows colored badges (Active=green, Pending=yellow, Inactive=grey)

4. **Responsive Layout**
   - Description: Table adapts to different screen sizes
   - Acceptance: Table is scrollable on mobile, full width on desktop, matches mockup design

### Edge Cases

1. **Empty State** - Display "No equipment found" message when project has no equipment
2. **Loading State** - Show loading skeleton/spinner while fetching data
3. **Error State** - Display error message if API call fails
4. **Long Text** - Truncate long equipment names with ellipsis and show full text on hover
5. **Missing Status** - Handle equipment items without status field gracefully

## Implementation Notes

### DO
- Use MUI DataGrid for built-in sorting functionality
- Follow existing component structure in `frontend/components/`
- Define TypeScript interfaces for equipment data structure
- Use Emotion for any custom styling (consistency with existing code)
- Implement loading and error states with proper UX
- Reference design mockup `16-equipment-list.png` for visual guidance
- Use existing axios instance/configuration for API calls
- Implement proper error handling and user feedback

### DON'T
- Create custom table sorting logic (use DataGrid built-in)
- Hardcode API URLs (use environment variables)
- Skip TypeScript types (maintain type safety)
- Implement CRUD operations in this component (display only)
- Add authentication logic (assume existing auth context handles this)

## Development Environment

### Start Services

```bash
# Terminal 1 - Backend
cd backend
uvicorn app.main:app --reload

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### Service URLs
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

### Required Environment Variables
- `NEXT_PUBLIC_API_URL`: `http://localhost:8000/api/v1` (frontend)
- `DATABASE_URL`: PostgreSQL connection string (backend - already configured)

## Success Criteria

The task is complete when:

1. [ ] Equipment table component renders with data from backend API
2. [ ] All columns are sortable (ascending/descending)
3. [ ] Status badges display with appropriate colors
4. [ ] Table matches design reference `16-equipment-list.png`
5. [ ] Loading and error states are handled
6. [ ] No console errors
7. [ ] Existing tests still pass
8. [ ] Component is properly typed with TypeScript
9. [ ] Table is responsive on mobile and desktop

## QA Acceptance Criteria

**CRITICAL**: These criteria must be verified by the QA Agent before sign-off.

### Unit Tests
| Test | File | What to Verify |
|------|------|----------------|
| EquipmentTable renders correctly | `frontend/components/equipment/__tests__/EquipmentTable.test.tsx` | Component renders without errors, displays columns |
| StatusBadge shows correct colors | `frontend/components/equipment/__tests__/StatusBadge.test.tsx` | Badge displays correct color for each status |
| Equipment types are valid | `frontend/types/__tests__/equipment.test.ts` | TypeScript interfaces compile without errors |

### Integration Tests
| Test | Services | What to Verify |
|------|----------|----------------|
| Equipment API integration | frontend ↔ backend | GET /projects/{id}/equipment returns data, table displays it |
| Sorting functionality | frontend | Clicking column headers sorts data correctly |
| Error handling | frontend ↔ backend | Failed API calls show error message, no crashes |

### End-to-End Tests
| Flow | Steps | Expected Outcome |
|------|-------|------------------|
| View Equipment List | 1. Navigate to project page 2. Click Equipment tab | Equipment table loads and displays all items |
| Sort Equipment | 1. Load equipment table 2. Click column header | Data sorts ascending, click again for descending |
| View Status Badges | 1. Load equipment table | Status column shows colored badges for each item |

### Browser Verification (frontend)
| Page/Component | URL | Checks |
|----------------|-----|--------|
| Equipment Table | `http://localhost:3000/projects/{projectId}/equipment` | ✓ Table renders<br>✓ Data loads from API<br>✓ Sorting works<br>✓ Badges display correctly<br>✓ No console errors |
| Responsive Design | Same URL, resize browser | ✓ Mobile view scrollable<br>✓ Desktop view full width |

### Database Verification (if applicable)
| Check | Query/Command | Expected |
|-------|---------------|----------|
| Equipment data exists | `SELECT * FROM equipment LIMIT 5;` | At least 1 equipment record exists |
| Equipment has status field | `SELECT status FROM equipment;` | Status field present and populated |

### QA Sign-off Requirements
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] All E2E tests pass
- [ ] Browser verification complete (frontend)
- [ ] Table sorts correctly on all sortable columns
- [ ] Status badges display with correct colors
- [ ] Loading state shows while fetching data
- [ ] Error state shows when API fails
- [ ] Empty state shows when no equipment exists
- [ ] Design matches reference mockup `16-equipment-list.png`
- [ ] No regressions in existing functionality
- [ ] Code follows established TypeScript/React patterns
- [ ] No security vulnerabilities introduced
- [ ] Responsive design works on mobile and desktop
