# Specification: Create Project Overview Page

## Overview

Create a new Project Overview Page that displays project progress, timeline, and organized content through tabs. This page will serve as a comprehensive dashboard for tracking project status and key milestones. The design reference is `15-project-overview.png` (to be located during implementation).

## Workflow Type

**Type**: feature

**Rationale**: This is a new feature implementation that introduces a completely new page with multiple UI components (progress ring, timeline, tabs) to the application. It requires frontend development with new components and potentially new backend endpoints for data fetching.

## Task Scope

### Services Involved
- **frontend** (primary) - Main implementation of the new page with UI components
- **backend** (integration) - API endpoints to provide data for progress, timeline, and tab content

### This Task Will:
- [ ] Create a new Project Overview page component
- [ ] Implement a progress ring component to visualize project completion
- [ ] Implement a timeline component to display project milestones and activities
- [ ] Implement a tabs component for content organization
- [ ] Add routing for the new page
- [ ] Create/integrate backend API endpoints for fetching project overview data
- [ ] Ensure responsive design and accessibility

### Out of Scope:
- Modifications to existing project list or detail pages
- Real-time updates via WebSockets (can be added later)
- Export functionality for timeline or progress data
- Advanced timeline filtering/search (basic view only)

## Service Context

### Frontend

**Tech Stack:**
- Language: TypeScript
- Framework: Next.js
- UI Library: Material-UI (@mui/material)
- Styling: Emotion
- Charts: @mui/x-charts (for progress visualization)
- Key directories: src, app, components, pages

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
- Database: PostgreSQL
- Key directories: app, tests

**How to Run:**
```bash
cd backend
# Activate virtual environment first
uvicorn app.main:app --reload
```

**Port:** 8000

## Files to Modify

| File | Service | What to Change |
|------|---------|---------------|
| `frontend/app/projects/[id]/overview/page.tsx` | frontend | Create new page component for project overview (new file) |
| `frontend/components/ProjectProgressRing.tsx` | frontend | Create progress ring component (new file) |
| `frontend/components/ProjectTimeline.tsx` | frontend | Create timeline component (new file) |
| `frontend/components/ProjectOverviewTabs.tsx` | frontend | Create tabs component (new file) |
| `backend/app/api/v1/projects.py` | backend | Add endpoint for project overview data |
| `backend/app/schemas/project.py` | backend | Add schema for project overview response |

## Files to Reference

These files show patterns to follow:

| File | Pattern to Copy |
|------|----------------|
| `frontend/app/projects/[id]/page.tsx` | Next.js dynamic routing pattern and project data fetching |
| Existing MUI component files | Material-UI component composition and theming |
| `backend/app/api/v1/projects.py` | FastAPI route structure and response patterns |
| `backend/app/api/v1/inspections.py` | Timeline-like data structure (inspection history) |

## Patterns to Follow

### Next.js App Router Pattern

For the new overview page route:

```typescript
// frontend/app/projects/[id]/overview/page.tsx
import { FC } from 'react';

interface ProjectOverviewPageProps {
  params: { id: string };
}

const ProjectOverviewPage: FC<ProjectOverviewPageProps> = async ({ params }) => {
  // Fetch project data
  // Render components
  return (
    <div>
      {/* Page content */}
    </div>
  );
};

export default ProjectOverviewPage;
```

**Key Points:**
- Use Next.js App Router file-based routing
- Follow existing project detail page pattern
- Use TypeScript for type safety

### Material-UI Component Pattern

For custom components:

```typescript
import { Box, CircularProgress, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';

const StyledBox = styled(Box)(({ theme }) => ({
  // Custom styles using theme
}));

export const ProgressRing: FC<Props> = ({ value, label }) => {
  return (
    <Box sx={{ position: 'relative', display: 'inline-flex' }}>
      <CircularProgress variant="determinate" value={value} />
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          bottom: 0,
          right: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Typography>{label}</Typography>
      </Box>
    </Box>
  );
};
```

**Key Points:**
- Use Material-UI components as building blocks
- Use Emotion styled() for custom styling
- Follow existing theme patterns

### FastAPI Endpoint Pattern

For backend API:

```python
@router.get("/{project_id}/overview", response_model=ProjectOverviewResponse)
async def get_project_overview(
    project_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get project overview including progress, timeline, and key metrics."""
    # Implementation
    return overview_data
```

**Key Points:**
- Use async/await for database operations
- Include proper response models
- Add authentication dependency
- Follow RESTful conventions

## Requirements

### Functional Requirements

1. **Progress Ring Visualization**
   - Description: Display a circular progress indicator showing project completion percentage
   - Acceptance: Ring shows accurate percentage, updates when data changes, displays label/value

2. **Timeline Component**
   - Description: Display chronological project milestones, activities, and key events
   - Acceptance: Timeline shows events in chronological order, displays dates and descriptions, supports scrolling for long timelines

3. **Tab Navigation**
   - Description: Organize project overview content into logical sections using tabs
   - Acceptance: Tabs switch content without page reload, maintain state, show active tab indicator

4. **Data Integration**
   - Description: Fetch and display real project data from backend API
   - Acceptance: Page loads with actual project data, handles loading states, displays errors gracefully

5. **Responsive Layout**
   - Description: Page adapts to different screen sizes
   - Acceptance: Components stack appropriately on mobile, maintain readability on all devices

### Edge Cases

1. **Empty/New Project** - Show placeholder states when project has no timeline events or zero progress
2. **Long Timeline** - Implement pagination or virtual scrolling for projects with many events
3. **Loading States** - Show skeleton/spinner while data loads
4. **Error States** - Display user-friendly error messages if data fetch fails
5. **Permission Handling** - Verify user has access to view project overview

## Implementation Notes

### DO
- Use Material-UI's `CircularProgress` component for the progress ring
- Use Material-UI's `Tabs` and `Tab` components for tab navigation
- Create a reusable Timeline component that can be used elsewhere
- Follow existing project routing structure (e.g., `/projects/[id]/overview`)
- Use TypeScript interfaces for all props and data structures
- Implement proper loading and error states
- Add unit tests for new components (Vitest)
- Add E2E tests for the overview page (Playwright)
- Reference the design file `15-project-overview.png` for exact layout and styling

### DON'T
- Create new progress/chart libraries when Material-UI provides them
- Hardcode project data - always fetch from API
- Ignore mobile responsiveness
- Skip error handling
- Use inline styles - use styled components or sx prop

## Development Environment

### Start Services

```bash
# Terminal 1 - Backend
cd backend
# Activate virtual environment
source venv/bin/activate  # or `venv\Scripts\activate` on Windows
uvicorn app.main:app --reload --port 8000

# Terminal 2 - Database (if not using Docker)
# Ensure PostgreSQL is running

# Terminal 3 - Frontend
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
- `ENVIRONMENT`: development
- `DEBUG`: true
- `API_V1_PREFIX`: /api/v1

## Success Criteria

The task is complete when:

1. [ ] New Project Overview page is accessible at `/projects/[id]/overview`
2. [ ] Progress ring displays project completion percentage correctly
3. [ ] Timeline shows project events in chronological order
4. [ ] Tabs component allows switching between different overview sections
5. [ ] Backend API endpoint returns project overview data
6. [ ] Page is responsive on mobile, tablet, and desktop
7. [ ] No console errors in browser or terminal
8. [ ] Existing tests still pass
9. [ ] New functionality verified via browser testing

## QA Acceptance Criteria

**CRITICAL**: These criteria must be verified by the QA Agent before sign-off.

### Unit Tests
| Test | File | What to Verify |
|------|------|----------------|
| ProgressRing renders with correct value | `frontend/components/__tests__/ProjectProgressRing.test.tsx` | Component displays percentage correctly, handles 0-100 range |
| Timeline renders events | `frontend/components/__tests__/ProjectTimeline.test.tsx` | Events display in order, dates format correctly |
| Tabs switch content | `frontend/components/__tests__/ProjectOverviewTabs.test.tsx` | Tab clicks change active panel, maintains state |

### Integration Tests
| Test | Services | What to Verify |
|------|----------|----------------|
| GET /api/v1/projects/{id}/overview | backend ↔ database | Returns correct project data structure, includes progress and timeline |
| Overview page data fetch | frontend ↔ backend | Page successfully fetches and displays API data |

### End-to-End Tests
| Flow | Steps | Expected Outcome |
|------|-------|------------------|
| View Project Overview | 1. Login 2. Navigate to project 3. Click "Overview" tab | Overview page loads with progress ring, timeline, and tabs visible |
| Check Progress Ring | 1. Open project with known completion % | Progress ring displays correct percentage matching project state |
| Navigate Tabs | 1. Click different tabs on overview | Content switches, tab indicator updates, no page reload |

### Browser Verification (if frontend)
| Page/Component | URL | Checks |
|----------------|-----|--------|
| Project Overview Page | `http://localhost:3000/projects/1/overview` | Progress ring renders, timeline shows events, tabs work, no layout issues |
| Mobile View | `http://localhost:3000/projects/1/overview` (mobile viewport) | Components stack properly, text readable, touch targets adequate |

### Database Verification (if applicable)
| Check | Query/Command | Expected |
|-------|---------------|----------|
| N/A | N/A | No new database tables required (uses existing project data) |

### QA Sign-off Requirements
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] All E2E tests pass
- [ ] Browser verification complete (desktop and mobile)
- [ ] Design file (`15-project-overview.png`) requirements met
- [ ] No regressions in existing project pages
- [ ] Code follows established patterns (Next.js, Material-UI, TypeScript)
- [ ] No security vulnerabilities introduced
- [ ] API endpoints properly documented in FastAPI docs
- [ ] Components are accessible (keyboard navigation, screen readers)
