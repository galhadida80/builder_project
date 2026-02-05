# Specification: Add RFI to Project Navigation

## Overview

Add Request for Information (RFI) navigation capabilities to the project management interface, enabling users to access and manage RFIs directly from project navigation tabs and the sidebar menu. This enhancement provides quick access to RFI functionality with visual indicators for pending items.

## Workflow Type

**Type**: feature

**Rationale**: This is a new feature that adds navigation elements and routing to expose existing RFI functionality in the UI. It involves multiple frontend components (navigation tabs, sidebar, routing) but does not modify backend logic or data models.

## Task Scope

### Services Involved
- **frontend** (primary) - Add navigation components, routing, and UI elements

### This Task Will:
- [x] Add "RFIs" tab to project detail page navigation with icon and badge
- [x] Implement route `/projects/:projectId/rfis` for RFI list view
- [x] Add RFI link to sidebar navigation menu
- [x] Display unread/pending RFI count badge on navigation elements
- [x] Integrate with existing MUI icon library (MessageSquare or similar)

### Out of Scope:
- Backend API modifications (RFI endpoints already exist)
- RFI detail page implementation
- RFI CRUD operations
- Email integration or notification system
- RFI status management logic

## Service Context

### Frontend

**Tech Stack:**
- Language: TypeScript
- Framework: React
- Build Tool: Vite
- UI Library: Material-UI (@mui/material)
- Icons: @mui/icons-material
- Routing: react-router-dom
- Styling: Emotion

**Entry Point:** `src/App.tsx`

**How to Run:**
```bash
cd frontend
npm run dev
```

**Port:** 3000

**Key Dependencies:**
- `react-router-dom` - Client-side routing
- `@mui/material` - UI components
- `@mui/icons-material` - Icon library
- `axios` - API requests

## Files to Modify

| File | Service | What to Change |
|------|---------|---------------|
| `frontend/src/App.tsx` or `frontend/src/routes.tsx` | frontend | Add `/projects/:projectId/rfis` route definition |
| `frontend/src/components/ProjectDetailTabs.tsx` or similar | frontend | Add "RFIs" tab with icon and badge to project navigation |
| `frontend/src/components/Sidebar.tsx` or similar | frontend | Add RFI link to sidebar menu |
| `frontend/src/pages/ProjectRFIList.tsx` | frontend | Create new page component for RFI list view (if doesn't exist) |

**Note:** File paths are estimates based on typical React project structure. During implementation, use file search to locate actual navigation components.

## Files to Reference

These files show patterns to follow:

| File | Pattern to Copy |
|------|----------------|
| Existing project tab components | Tab structure, badge implementation, navigation patterns |
| Existing sidebar menu items | Menu item structure, icon usage, routing integration |
| Other project detail pages (e.g., Equipment, Materials) | Page layout, data fetching patterns, routing |

## Patterns to Follow

### Tab Navigation Pattern

Typical MUI Tabs implementation for project detail pages:

```typescript
<Tabs value={currentTab} onChange={handleTabChange}>
  <Tab
    label="Overview"
    icon={<DashboardIcon />}
    iconPosition="start"
  />
  <Tab
    label={
      <Badge badgeContent={pendingCount} color="error">
        RFIs
      </Badge>
    }
    icon={<MessageSquareIcon />}
    iconPosition="start"
  />
</Tabs>
```

**Key Points:**
- Use MUI Badge component for count indicators
- Use `iconPosition="start"` for left-aligned icons
- Badge should show color="error" for pending/unread items
- Tab value should match route structure

### Sidebar Navigation Pattern

Typical sidebar menu item structure:

```typescript
<ListItem button component={Link} to={`/projects/${projectId}/rfis`}>
  <ListItemIcon>
    <Badge badgeContent={unreadCount} color="error">
      <MessageSquareIcon />
    </Badge>
  </ListItemIcon>
  <ListItemText primary="RFIs" />
</ListItem>
```

**Key Points:**
- Use Material-UI List components
- Integrate with React Router's Link component
- Badge should wrap the icon in the ListItemIcon
- Use dynamic projectId from route params or context

### Routing Pattern

React Router v6 route definition:

```typescript
<Route path="/projects/:projectId/rfis" element={<ProjectRFIList />} />
```

**Key Points:**
- Follow existing project-scoped route pattern
- Use route parameter `:projectId` for dynamic project selection
- Lazy load page component if using code splitting

## Requirements

### Functional Requirements

1. **Project Detail Navigation Tab**
   - Description: Add "RFIs" tab to project detail page navigation
   - Acceptance: Tab appears alongside other project tabs, clicking navigates to RFI list

2. **RFI Count Badge**
   - Description: Display count of unread/pending RFIs on navigation elements
   - Acceptance: Badge shows accurate count, updates when RFI status changes, hidden when count is 0

3. **RFI Icon**
   - Description: Use appropriate icon (MessageSquare or similar) for RFI navigation
   - Acceptance: Icon is visible, follows MUI icon sizing, matches existing design system

4. **RFI Route**
   - Description: Create route `/projects/:projectId/rfis` for RFI list view
   - Acceptance: Route is accessible, displays RFI list, handles invalid projectId

5. **Sidebar RFI Link**
   - Description: Add RFI link to sidebar navigation menu
   - Acceptance: Link appears in sidebar, navigates to RFI list, highlights when active

### Edge Cases

1. **No RFIs Exist** - Show empty state message, hide or show "0" on badge (TBD based on design system)
2. **Large RFI Count** - Badge should handle counts > 99 (show "99+" or similar)
3. **Permission Restrictions** - If user lacks RFI permissions, hide navigation elements or disable them
4. **Loading State** - Show skeleton/loading state while fetching RFI count
5. **API Failure** - Handle gracefully if RFI count API fails, don't break navigation

## Implementation Notes

### DO
- Use existing MUI Badge component for count display
- Fetch RFI count from `/projects/{project_id}/rfis/summary` endpoint
- Follow existing tab navigation patterns from other project pages
- Reuse existing icon sizing and styling conventions
- Implement loading and error states for RFI count
- Use React Query or existing data fetching library for API calls
- Ensure navigation is responsive on mobile devices

### DON'T
- Create custom badge component when MUI Badge exists
- Hardcode RFI counts
- Break existing navigation layout
- Add new dependencies for icons (use @mui/icons-material)
- Implement RFI CRUD functionality in this task (out of scope)

## Development Environment

### Start Services

```bash
# Start frontend development server
cd frontend
npm run dev

# Start backend API (for RFI count data)
cd backend
uvicorn app.main:app --reload
```

### Service URLs
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

### Required Environment Variables
- `VITE_API_URL`: http://localhost:8000/api/v1 (frontend)

## Success Criteria

The task is complete when:

1. [x] "RFIs" tab appears on project detail page navigation
2. [x] Tab includes appropriate icon (MessageSquare or similar from MUI icons)
3. [x] Tab displays badge with unread/pending RFI count
4. [x] Clicking tab navigates to `/projects/:projectId/rfis` route
5. [x] RFI link appears in sidebar navigation menu
6. [x] Sidebar link includes icon and count badge
7. [x] Route renders RFI list page component
8. [x] No console errors or warnings
9. [x] Existing tests still pass
10. [x] Navigation is responsive on mobile and desktop
11. [x] Badge count updates when RFI status changes
12. [x] Browser verification shows correct navigation behavior

## QA Acceptance Criteria

**CRITICAL**: These criteria must be verified by the QA Agent before sign-off.

### Unit Tests
| Test | File | What to Verify |
|------|------|----------------|
| Tab Navigation Render | `frontend/src/components/__tests__/ProjectDetailTabs.test.tsx` | RFI tab renders with correct icon and label |
| Badge Count Display | `frontend/src/components/__tests__/ProjectDetailTabs.test.tsx` | Badge shows correct count from API data |
| Sidebar Link Render | `frontend/src/components/__tests__/Sidebar.test.tsx` | RFI link appears in sidebar with icon |
| Route Definition | `frontend/src/__tests__/routes.test.tsx` | RFI route is registered and accessible |

### Integration Tests
| Test | Services | What to Verify |
|------|----------|----------------|
| RFI Count API Fetch | frontend ↔ backend | Frontend fetches count from `/projects/{id}/rfis/summary` |
| Navigation Click Flow | frontend | Clicking tab/link navigates to correct route |

### End-to-End Tests
| Flow | Steps | Expected Outcome |
|------|-------|------------------|
| Access RFIs from Project Tab | 1. Navigate to project detail page<br>2. Click "RFIs" tab | RFI list page loads with project RFIs |
| Access RFIs from Sidebar | 1. Open sidebar<br>2. Click "RFIs" link | Navigates to RFI list for current project |
| Badge Count Accuracy | 1. View project with pending RFIs<br>2. Check badge count | Badge displays accurate count |

### Browser Verification (Frontend)
| Page/Component | URL | Checks |
|----------------|-----|--------|
| Project Detail Navigation | `http://localhost:3000/projects/[id]` | ✓ RFI tab visible<br>✓ Icon present<br>✓ Badge shows count |
| Sidebar Navigation | `http://localhost:3000/projects/[id]` | ✓ RFI link in sidebar<br>✓ Link has icon and badge |
| RFI List Page | `http://localhost:3000/projects/[id]/rfis` | ✓ Page loads<br>✓ RFIs displayed<br>✓ No errors |

### Database Verification
Not applicable - this task only modifies frontend navigation, no database changes.

### QA Sign-off Requirements
- [x] All unit tests pass
- [x] All integration tests pass
- [x] All E2E tests pass
- [x] Browser verification complete (navigation visible and functional)
- [x] No regressions in existing project navigation
- [x] Badge count accurately reflects RFI status
- [x] Navigation works on mobile and desktop viewports
- [x] Code follows established React/TypeScript patterns
- [x] No security vulnerabilities introduced
- [x] No console errors or warnings
- [x] Accessibility: navigation is keyboard accessible and screen reader friendly
