# Specification: Create Consultant Assignment UI

## Overview

Create a dual-view interface for managing consultant assignments in construction projects. The feature provides both a list view for tabular data management and a calendar view for temporal visualization of consultant availability and assignments. This enables project managers to efficiently assign consultants to projects and track their workload across time.

## Workflow Type

**Type**: feature

**Rationale**: This is a new feature implementation that introduces a complete UI component with dual viewing modes (list and calendar), data management capabilities, and integration with existing consultant-type backend APIs.

## Task Scope

### Services Involved
- **frontend** (primary) - Create the consultant assignment UI components with list and calendar views
- **backend** (integration) - May require new API endpoints for consultant assignment CRUD operations

### This Task Will:
- [ ] Create a consultant assignment list view with MUI DataGrid showing assignments in tabular format
- [ ] Create a consultant assignment calendar view showing assignments on a timeline
- [ ] Implement view toggle between list and calendar modes
- [ ] Connect to existing consultant-types API endpoints
- [ ] Create forms for creating/editing consultant assignments
- [ ] Implement filtering and search capabilities
- [ ] Design consistent with reference image `24-consultant-assignment.png`

### Out of Scope:
- Backend API endpoints for consultant assignments (may be added if needed)
- User authentication/authorization changes
- Mobile-specific responsive design (desktop-first approach)
- Integration with external calendar systems (Google Calendar, Outlook)
- Consultant availability conflict detection (future enhancement)

## Service Context

### Frontend Service

**Tech Stack:**
- Language: TypeScript
- Framework: Next.js
- UI Library: Material-UI (@mui/material)
- Styling: Emotion
- Key directories: components/, pages/, app/, src/

**Entry Point:** `src/App.tsx`

**How to Run:**
```bash
cd frontend
npm run dev
```

**Port:** 3000

**Key Dependencies:**
- `@mui/material` - UI components
- `@mui/x-data-grid` - Advanced data grid for list view
- `@mui/x-date-pickers` - Date selection components
- `dayjs` - Date manipulation
- `axios` - API requests

### Backend Service

**Tech Stack:**
- Language: Python
- Framework: FastAPI
- ORM: SQLAlchemy
- Key directories: app/, tests/

**Existing Relevant Endpoints:**
- `GET /consultant-types` - List all consultant types
- `GET /consultant-types/{consultant_type_id}` - Get consultant type details
- `POST /consultant-types` - Create new consultant type
- `GET /team-members` - List team members (potential consultants)
- `GET /team-members/{team_member_id}/assignments` - Get member assignments

**How to Run:**
```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

**Port:** 8000

## Files to Modify

| File | Service | What to Change |
|------|---------|---------------|
| `frontend/components/consultants/` (new directory) | frontend | Create new consultant assignment components |
| `frontend/pages/consultants/assignments.tsx` (new file) | frontend | Create main assignment page with view toggle |
| `frontend/app/api/consultants.ts` (new file) | frontend | API client for consultant assignment endpoints |

## Files to Reference

These files show patterns to follow:

| File | Pattern to Copy |
|------|----------------|
| Existing MUI DataGrid implementations in frontend | List view implementation pattern |
| Existing date picker usage in frontend | Date selection component patterns |
| `frontend/components/` structure | Component organization and naming |
| Backend API route patterns in `app/api/v1/` | API endpoint structure if new endpoints needed |

## Patterns to Follow

### MUI DataGrid Pattern

The project uses `@mui/x-data-grid` for list views:

**Key Points:**
- Use DataGrid for tabular display of assignments
- Implement column definitions with proper field types
- Add sorting, filtering, and pagination
- Handle row selection for bulk actions

### Date Handling Pattern

Using `dayjs` for date operations:

**Key Points:**
- Use dayjs for date formatting and manipulation
- Integrate with MUI DatePicker components
- Handle timezone considerations
- Format dates consistently across the application

### Component Structure Pattern

Follow existing frontend component organization:

**Key Points:**
- Create feature-specific directory under `components/`
- Separate presentational and container components
- Use TypeScript interfaces for props
- Implement proper error boundaries

### API Integration Pattern

Using `axios` for API calls:

**Key Points:**
- Create dedicated API client modules
- Handle loading and error states
- Use async/await syntax
- Implement proper error handling with user feedback

## Requirements

### Functional Requirements

1. **List View Display**
   - Description: Display consultant assignments in a tabular format using MUI DataGrid
   - Acceptance: Grid shows assignment details (consultant name, project, dates, status) with sorting and filtering

2. **Calendar View Display**
   - Description: Display consultant assignments on a calendar/timeline view
   - Acceptance: Assignments appear on calendar with visual indicators for duration and status

3. **View Toggle**
   - Description: Users can switch between list and calendar views
   - Acceptance: Toggle button switches between views, state persists during session

4. **Create Assignment**
   - Description: Form to create new consultant assignments
   - Acceptance: Modal/dialog form captures consultant, project, date range, and saves via API

5. **Edit Assignment**
   - Description: Edit existing consultant assignments
   - Acceptance: Clicking an assignment opens edit form with current values, updates save successfully

6. **Delete Assignment**
   - Description: Remove consultant assignments
   - Acceptance: Delete action (with confirmation) removes assignment from system

7. **Filter and Search**
   - Description: Filter assignments by consultant, project, date range, status
   - Acceptance: Filters update the displayed assignments in both views

### Edge Cases

1. **Overlapping Assignments** - Display visual indicator when consultant has multiple assignments at same time
2. **Date Range Validation** - Prevent end date before start date in assignment forms
3. **Empty States** - Show helpful messaging when no assignments exist or match filters
4. **Long Consultant Names** - Truncate with tooltip in grid cells to prevent layout issues
5. **Network Errors** - Display error messages with retry options when API calls fail

## Implementation Notes

### DO
- Use MUI DataGrid for the list view to leverage existing project dependencies
- Follow the existing component structure pattern in `frontend/components/`
- Implement TypeScript interfaces for all data models (Assignment, Consultant, etc.)
- Use dayjs for date manipulation to match existing project dependencies
- Create reusable form components for assignment creation/editing
- Implement loading states for all async operations
- Add proper error handling with user-friendly messages
- Use Emotion for styling to match project conventions

### DON'T
- Don't install new calendar libraries without evaluating existing solutions
- Don't bypass existing API client patterns
- Don't hardcode API URLs (use environment variables)
- Don't skip TypeScript type definitions
- Don't implement custom date pickers (use MUI components)
- Don't create global state if local component state suffices

## Development Environment

### Start Services

```bash
# Terminal 1 - Backend
cd backend
uvicorn app.main:app --reload --port 8000

# Terminal 2 - Frontend
cd frontend
npm run dev
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
- `CORS_ORIGINS`: ["http://localhost:3000", ...]

## Success Criteria

The task is complete when:

1. [ ] List view displays consultant assignments with all required columns
2. [ ] Calendar view shows assignments on a timeline
3. [ ] View toggle switches between list and calendar successfully
4. [ ] Create assignment form saves new assignments via API
5. [ ] Edit assignment form updates existing assignments
6. [ ] Delete assignment removes records with confirmation
7. [ ] Filters work correctly in both views
8. [ ] No console errors in browser
9. [ ] Existing tests still pass
10. [ ] New functionality verified via browser at http://localhost:3000

## QA Acceptance Criteria

**CRITICAL**: These criteria must be verified by the QA Agent before sign-off.

### Unit Tests
| Test | File | What to Verify |
|------|------|----------------|
| Assignment List Component | `frontend/components/consultants/__tests__/AssignmentList.test.tsx` | Renders grid with correct columns, handles row selection |
| Assignment Calendar Component | `frontend/components/consultants/__tests__/AssignmentCalendar.test.tsx` | Renders calendar view, displays assignments correctly |
| Assignment Form Component | `frontend/components/consultants/__tests__/AssignmentForm.test.tsx` | Form validation, submit handler, date range validation |
| API Client | `frontend/app/api/__tests__/consultants.test.ts` | API calls with correct params, error handling |

### Integration Tests
| Test | Services | What to Verify |
|------|----------|----------------|
| Fetch Assignments | frontend ↔ backend | GET request retrieves assignment list, displays in UI |
| Create Assignment | frontend ↔ backend | POST request creates new assignment, appears in list/calendar |
| Update Assignment | frontend ↔ backend | PUT/PATCH request updates assignment, UI reflects changes |
| Delete Assignment | frontend ↔ backend | DELETE request removes assignment, UI updates |

### End-to-End Tests
| Flow | Steps | Expected Outcome |
|------|-------|------------------|
| View Toggle | 1. Load assignment page 2. Click view toggle 3. Switch between list/calendar | Both views display assignments correctly |
| Create Assignment Flow | 1. Click "New Assignment" 2. Fill form 3. Submit | Assignment appears in both views |
| Edit Assignment Flow | 1. Click assignment 2. Edit form 3. Save | Changes reflect in UI immediately |
| Delete Assignment Flow | 1. Select assignment 2. Click delete 3. Confirm | Assignment removed from both views |
| Filter Assignments | 1. Apply date filter 2. Apply consultant filter | Only matching assignments display |

### Browser Verification (Frontend)
| Page/Component | URL | Checks |
|----------------|-----|--------|
| Assignment Page | `http://localhost:3000/consultants/assignments` | Page loads, no errors, view toggle visible |
| Assignment List View | Same as above | DataGrid renders, columns display, sorting works |
| Assignment Calendar View | Same as above | Calendar renders, assignments visible with dates |
| Assignment Form Modal | Click "New Assignment" | Form appears, all fields present, validation works |
| Network Requests | Developer Tools Network tab | API calls succeed (200 status), correct endpoints |

### Database Verification (if applicable)
| Check | Query/Command | Expected |
|-------|---------------|----------|
| Assignment Records | `SELECT * FROM consultant_assignments;` | New assignments exist in database |
| Data Integrity | Check foreign keys to consultants/projects | Relations properly maintained |

### QA Sign-off Requirements
- [ ] All unit tests pass (`npm test` in frontend)
- [ ] All integration tests pass (API endpoints respond correctly)
- [ ] All E2E tests pass (user flows work end-to-end)
- [ ] Browser verification complete (no console errors, UI functional)
- [ ] Database state verified (if new tables/fields added)
- [ ] No regressions in existing functionality (other pages still work)
- [ ] Code follows established patterns (TypeScript, MUI, component structure)
- [ ] No security vulnerabilities introduced (input validation, XSS prevention)
- [ ] Performance acceptable (list/calendar render within 2 seconds for 100 assignments)
- [ ] Design matches reference image `24-consultant-assignment.png`

## Additional Implementation Details

### Data Model

**ConsultantAssignment Interface:**
```typescript
interface ConsultantAssignment {
  id: string;
  consultantId: string;
  consultantName: string;
  consultantType: string;
  projectId: string;
  projectName: string;
  startDate: Date;
  endDate: Date;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Calendar View Options

Consider these approaches for calendar implementation:
1. Custom calendar using MUI Grid and DatePicker
2. Integrate react-big-calendar (requires new dependency)
3. Use MUI DateCalendar with custom day rendering
4. Timeline view using Gantt-like display (gantt-task-react already in dependencies)

**Recommendation:** Evaluate if `gantt-task-react` (already in project) can be adapted for consultant timeline view before adding new dependencies.

### API Endpoints to Create (Backend)

If backend endpoints don't exist:
```
GET    /api/v1/consultant-assignments
POST   /api/v1/consultant-assignments
GET    /api/v1/consultant-assignments/{assignment_id}
PUT    /api/v1/consultant-assignments/{assignment_id}
DELETE /api/v1/consultant-assignments/{assignment_id}
GET    /api/v1/projects/{project_id}/consultant-assignments
```

### State Management

Use React Context or component state for:
- Current view mode (list vs calendar)
- Active filters
- Selected assignments
- Form modal open/close state

Avoid Redux/external state management unless already in use for similar features.
