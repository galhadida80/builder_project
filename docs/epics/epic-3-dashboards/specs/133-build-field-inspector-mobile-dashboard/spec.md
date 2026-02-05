# Specification: Field Inspector Mobile Dashboard

## Overview

Build a mobile-first field inspector dashboard that provides quick access to today's inspection schedule and common field actions. This standalone page is optimized for mobile devices and enables inspectors to quickly start inspections, take photos, report issues, and view their daily schedule while on-site.

## Workflow Type

**Type**: feature

**Rationale**: This is a new feature implementation that introduces a dedicated mobile dashboard page for field inspectors, complementing the existing desktop-oriented inspections management interface.

## Task Scope

### Services Involved
- **frontend** (primary) - New mobile dashboard page and navigation updates

### This Task Will:
- [ ] Create a new mobile-first inspector dashboard page at `/inspector-dashboard`
- [ ] Display today's inspection schedule with time, location, and inspection type
- [ ] Implement three quick action buttons: Start Inspection, Take Photo, Report Issue
- [ ] Add bottom navigation for mobile (Home, Inspections, Projects, Profile)
- [ ] Add offline status indicator in the header
- [ ] Style the interface to match the design mockup (10-inspector-mobile.png)
- [ ] Ensure mobile viewport optimization (max-width ~375-428px)
- [ ] Add route to existing React Router configuration

### Out of Scope:
- Offline functionality implementation (PWA/service workers)
- Photo upload backend integration
- Issue reporting backend integration
- Desktop layout optimization (mobile-first only)
- Authentication/authorization changes

## Service Context

### Frontend

**Tech Stack:**
- Language: TypeScript
- Framework: React
- Build Tool: Vite
- Styling: Emotion + MUI (Material-UI)
- Key directories: `src/` (source code)

**Entry Point:** `src/App.tsx`

**How to Run:**
```bash
cd frontend
npm run dev
```

**Port:** 3000

## Files to Modify

| File | Service | What to Change |
|------|---------|---------------|
| `frontend/src/App.tsx` | frontend | Add new route for `/inspector-dashboard` |
| `frontend/src/pages/InspectorDashboard.tsx` | frontend | Create new mobile dashboard page component (NEW FILE) |
| `frontend/src/components/layout/MobileBottomNav.tsx` | frontend | Create mobile bottom navigation component (NEW FILE) |

## Files to Reference

These files show patterns to follow:

| File | Pattern to Copy |
|------|----------------|
| `frontend/src/pages/DashboardPage.tsx` | Page structure, loading states, KPI cards, data fetching with useEffect |
| `frontend/src/pages/InspectionsPage.tsx` | Inspections API integration, inspection data types |
| `frontend/src/components/ui/Card.tsx` | Card and KPICard component usage |
| `frontend/src/components/ui/Button.tsx` | Button component with icons and variants |
| `frontend/src/api/inspections.ts` | API client pattern for fetching inspection data |
| `design-assets/dashboard/10-inspector-mobile.png` | Visual design reference (UI layout, colors, spacing) |

## Patterns to Follow

### 1. Page Component Structure

From `frontend/src/pages/DashboardPage.tsx`:

**Key Points:**
- Use `useState` and `useEffect` for data loading
- Show loading skeleton while fetching data
- Use MUI `Box` for layout with responsive `sx` props
- Display data in `Card` components
- Handle error states gracefully

**Example Pattern:**
```typescript
export default function InspectorDashboard() {
  const [loading, setLoading] = useState(true)
  const [inspections, setInspections] = useState<Inspection[]>([])

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      // Fetch data
    } catch (error) {
      console.error('Failed to load:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <Skeleton /> // Loading state
  }

  return <Box sx={{ p: 3 }}>{/* Content */}</Box>
}
```

### 2. API Integration

From `frontend/src/api/inspections.ts`:

**Key Points:**
- Use `apiClient.get()` for fetching data
- Type responses with TypeScript interfaces
- Handle async/await with try/catch
- Use existing `inspectionsApi.getProjectInspections()` to fetch today's inspections

### 3. Mobile-First Layout

From design mockup and MUI responsive patterns:

**Key Points:**
- Use viewport-based sizing: `maxWidth: '428px'` to constrain mobile width
- Center content on larger screens
- Use MUI `sx` prop for responsive styling
- Stack elements vertically with flexbox: `display: 'flex', flexDirection: 'column'`

**Example Pattern:**
```typescript
<Box
  sx={{
    maxWidth: '428px',
    margin: '0 auto',
    minHeight: '100vh',
    bgcolor: 'background.default',
    display: 'flex',
    flexDirection: 'column',
  }}
>
  {/* Mobile content */}
</Box>
```

### 4. Button Components

From `frontend/src/components/ui/Button.tsx`:

**Key Points:**
- Use custom `Button` component with `variant`, `size`, and `icon` props
- Available variants: `primary`, `secondary`, `tertiary`
- Use MUI icons from `@mui/icons-material`
- Style with `sx` prop for custom colors

**Example from Design:**
```typescript
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CameraAltIcon from '@mui/icons-material/CameraAlt'
import ReportProblemIcon from '@mui/icons-material/ReportProblem'

<Button
  variant="primary"
  fullWidth
  icon={<CheckCircleIcon />}
  sx={{ bgcolor: 'success.main', '&:hover': { bgcolor: 'success.dark' } }}
>
  START INSPECTION
</Button>
```

## Requirements

### Functional Requirements

1. **Display Today's Schedule**
   - Description: Fetch and display inspections scheduled for today with time, location, and type
   - Acceptance: Page shows list of today's inspections with formatted times (e.g., "8:00 AM") and location with address (e.g., "123 Main St")

2. **Offline Status Indicator**
   - Description: Show red "OFFLINE" badge when user is offline
   - Acceptance: Red pill-shaped badge appears in header showing offline status (visual only for now, no actual offline detection)

3. **Quick Action Buttons**
   - Description: Three prominent action buttons for common field tasks
   - Acceptance: Three full-width buttons displayed with appropriate icons and colors:
     - Green: "START INSPECTION" (checkmark icon)
     - Blue: "TAKE PHOTO" (camera icon)
     - Red: "REPORT ISSUE" (warning icon)

4. **Mobile Bottom Navigation**
   - Description: Bottom navigation bar with 4 tabs
   - Acceptance: Fixed bottom nav with Home, Inspections, Projects, Profile tabs, with active state highlighting

5. **Mobile-First Responsive Design**
   - Description: Layout optimized for mobile viewport (iPhone-sized screens)
   - Acceptance: Page renders correctly on 375px-428px wide viewports, content is readable and buttons are tappable

### Edge Cases

1. **No Inspections Today** - Display empty state message: "No inspections scheduled for today"
2. **API Error** - Show error message and retry option if data fails to load
3. **Very Long Location Names** - Truncate with ellipsis (...) if address exceeds container width
4. **Multiple Inspections** - Scrollable list if more than 3-4 inspections scheduled

## Implementation Notes

### DO
- Follow the design mockup (`10-inspector-mobile.png`) exactly for layout and styling
- Reuse existing UI components from `src/components/ui/`
- Use existing `inspectionsApi` for data fetching
- Filter inspections to show only today's schedule
- Use MUI Grid or Box with flexbox for layout
- Add proper TypeScript types for all props and state
- Implement loading skeleton matching the page structure
- Use MUI icons that match the design (CheckCircle, CameraAlt, ReportProblem, LocationOn)

### DON'T
- Create new API endpoints (use existing inspections API)
- Implement actual offline functionality (just show the badge)
- Add desktop-specific layouts (mobile-first only for this task)
- Modify existing dashboard or inspections pages
- Add new dependencies unless absolutely necessary

## Development Environment

### Start Services

```bash
# Frontend
cd frontend
npm run dev

# Backend (needed for API)
cd backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Service URLs
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- Inspector Dashboard: http://localhost:3000/inspector-dashboard (after implementation)

### Required Environment Variables
- `VITE_API_URL`: API base URL (default: http://localhost:8000/api/v1)

## Success Criteria

The task is complete when:

1. [ ] New route `/inspector-dashboard` exists and is accessible
2. [ ] Page displays today's inspections in a mobile-optimized list
3. [ ] Three quick action buttons render with correct icons and colors
4. [ ] Mobile bottom navigation is visible and functional
5. [ ] Offline indicator badge appears in header
6. [ ] Page matches design mockup visual layout
7. [ ] Page is responsive on mobile viewport (375-428px width)
8. [ ] No console errors
9. [ ] Existing tests still pass
10. [ ] Page loads inspection data from existing API

## QA Acceptance Criteria

**CRITICAL**: These criteria must be verified by the QA Agent before sign-off.

### Unit Tests
| Test | File | What to Verify |
|------|------|----------------|
| InspectorDashboard renders | `frontend/src/pages/InspectorDashboard.test.tsx` | Component renders without errors |
| Displays loading state | `frontend/src/pages/InspectorDashboard.test.tsx` | Skeleton shows while loading |
| Fetches today's inspections | `frontend/src/pages/InspectorDashboard.test.tsx` | API called with correct params |
| Filters to today only | `frontend/src/pages/InspectorDashboard.test.tsx` | Only today's inspections shown |
| MobileBottomNav renders | `frontend/src/components/layout/MobileBottomNav.test.tsx` | Navigation renders with 4 tabs |

### Integration Tests
| Test | Services | What to Verify |
|------|----------|----------------|
| Dashboard loads inspection data | frontend ↔ backend | API call successful, data displayed |
| Quick actions are clickable | frontend | Buttons respond to click events |
| Navigation between tabs | frontend | Bottom nav tabs change routes |

### End-to-End Tests
| Flow | Steps | Expected Outcome |
|------|-------|------------------|
| View inspector dashboard | 1. Navigate to /inspector-dashboard 2. Wait for load | Today's inspections displayed |
| Start inspection | 1. Click "START INSPECTION" button | Button click handled (console log or navigation) |
| Take photo | 1. Click "TAKE PHOTO" button | Button click handled |
| Report issue | 1. Click "REPORT ISSUE" button | Button click handled |

### Browser Verification (if frontend)
| Page/Component | URL | Checks |
|----------------|-----|--------|
| Inspector Dashboard | `http://localhost:3000/inspector-dashboard` | ✓ Layout matches mockup<br>✓ Schedule list displays<br>✓ Buttons render correctly<br>✓ Bottom nav visible<br>✓ Offline badge shows |
| Mobile Responsiveness | Same URL | ✓ Test on 375px viewport<br>✓ Test on 428px viewport<br>✓ Content fits screen<br>✓ Buttons are tappable |

### Database Verification (if applicable)
| Check | Query/Command | Expected |
|-------|---------------|----------|
| N/A | N/A | No database changes required |

### QA Sign-off Requirements
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] All E2E tests pass
- [ ] Browser verification complete (mobile viewports)
- [ ] Layout matches design mockup (10-inspector-mobile.png)
- [ ] No regressions in existing functionality
- [ ] Code follows established patterns (React hooks, TypeScript, MUI)
- [ ] No security vulnerabilities introduced
- [ ] Console is error-free
- [ ] Inspections data loads correctly from API
- [ ] Quick action buttons are interactive
- [ ] Bottom navigation works correctly
