# Specification: Implement Gantt Timeline Chart

## Overview

Implement a Gantt timeline chart component for visualizing construction project schedules with hierarchical tasks, dependencies, and milestones. The component will display task bars on a timeline, show dependency relationships between tasks, highlight milestones with visual markers, and provide interactive controls for zoom and filtering. This addresses Linear issue BUI-71 to enable project managers to visualize and track construction schedules across multiple phases.

## Workflow Type

**Type**: feature

**Rationale**: This is a new feature adding timeline visualization capabilities to the construction operations platform. It involves creating new components, integrating a third-party Gantt library, and adding a new route to the application.

## Task Scope

### Services Involved
- **frontend** (primary) - React/TypeScript application where the Gantt chart component will be implemented

### This Task Will:
- [ ] Install and integrate `@svar-ui/react-gantt` library (v2.3.0+)
- [ ] Create a new `GanttTimelinePage.tsx` page component
- [ ] Create a reusable `GanttChart.tsx` component in `components/ui/`
- [ ] Add routing for `/projects/:projectId/timeline`
- [ ] Implement task hierarchy with collapsible groups (Foundation, Framing, Electrical, Plumbing)
- [ ] Display task bars on timeline with proper scaling
- [ ] Render dependency arrows between related tasks
- [ ] Show milestone markers (orange diamonds) with labels
- [ ] Add "Today" indicator (red vertical line)
- [ ] Implement zoom controls (+/- buttons)
- [ ] Add filter dropdown for task filtering
- [ ] Style the component to match the design reference (18-gantt-timeline.png)
- [ ] Create TypeScript interfaces for task and dependency data structures
- [ ] Add the timeline route to `App.tsx`

### Out of Scope:
- Backend API endpoints for storing/retrieving timeline data (will use mock data initially)
- Database models for tasks and dependencies
- Drag-and-drop task editing functionality
- Export functionality (PDF, PNG, Excel)
- Multi-user real-time collaboration
- Task assignment and notifications
- Integration with existing Areas/Inspections/RFIs modules

## Service Context

### Frontend

**Tech Stack:**
- Language: TypeScript
- Framework: React 18.2.0
- UI Library: Material-UI (MUI) 5.15.6
- Styling: Emotion 11.11.0
- Routing: React Router DOM 6.21.3
- Build Tool: Vite 5.0.12
- Date Handling: Day.js 1.11.10
- Key directories: src/components/, src/pages/, src/api/, src/types/

**Entry Point:** `src/App.tsx`

**How to Run:**
```bash
cd frontend
npm run dev:hmr
```

**Port:** 3000

## Files to Modify

| File | Service | What to Change |
|------|---------|---------------|
| `frontend/package.json` | frontend | Add `@svar-ui/react-gantt` dependency |
| `frontend/src/App.tsx` | frontend | Add route for `/projects/:projectId/timeline` |
| *NEW* `frontend/src/pages/GanttTimelinePage.tsx` | frontend | Create main page component for timeline view |
| *NEW* `frontend/src/components/ui/GanttChart.tsx` | frontend | Create reusable Gantt chart component |
| *NEW* `frontend/src/types/timeline.ts` | frontend | Define TypeScript interfaces for tasks, links, scales |

## Files to Reference

These files show patterns to follow:

| File | Pattern to Copy |
|------|----------------|
| `frontend/src/pages/AreasPage.tsx` | Page component structure, MUI imports, Card usage, PageHeader |
| `frontend/src/components/ui/Card.tsx` | Styled component pattern with Emotion, TypeScript interfaces |
| `frontend/src/App.tsx` | Routing structure for nested project routes |
| `frontend/src/pages/ProjectDetailPage.tsx` | Project context and nested routing pattern |

## Patterns to Follow

### Page Component Pattern

From `frontend/src/pages/AreasPage.tsx`:

```tsx
import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { PageHeader } from '../components/ui/Breadcrumbs'
import { useToast } from '../components/common/ToastProvider'

export default function GanttTimelinePage() {
  const { projectId } = useParams<{ projectId: string }>()
  const { showToast } = useToast()
  const [loading, setLoading] = useState(false)

  // Component logic here

  return (
    <Box>
      <PageHeader title="Project Timeline" />
      {/* Content */}
    </Box>
  )
}
```

**Key Points:**
- Use `useParams` to get `projectId` from URL
- Import MUI components individually (Box, Typography, etc.)
- Use custom UI components from `../components/ui/`
- Use `PageHeader` for consistent page titles

### Styled Component Pattern

From `frontend/src/components/ui/Card.tsx`:

```tsx
import { styled } from '@mui/material/styles'
import { Box } from '@mui/material'

const StyledContainer = styled(Box)(({ theme }) => ({
  borderRadius: 12,
  transition: 'all 200ms ease-out',
  // styles here
}))
```

**Key Points:**
- Use `styled` from '@mui/material/styles' with Emotion
- Theme is available as parameter
- Use TypeScript for prop typing

### Routing Pattern

From `frontend/src/App.tsx`:

```tsx
<Route path="/projects/:projectId" element={<ProjectDetailPage />}>
  <Route path="equipment" element={<EquipmentPage />} />
  <Route path="timeline" element={<GanttTimelinePage />} />
</Route>
```

**Key Points:**
- Nested routes under `/projects/:projectId`
- Timeline will be accessible at `/projects/123/timeline`

## Requirements

### Functional Requirements

1. **Task Hierarchy Display**
   - Description: Display construction tasks in hierarchical groups (Foundation, Framing, Electrical, Plumbing) with collapsible sections
   - Acceptance: Users can expand/collapse task groups; nested tasks are properly indented

2. **Timeline Visualization**
   - Description: Show task bars on a horizontal timeline spanning Oct 2023 - Mar 2024 (from design)
   - Acceptance: Task bars accurately represent start/end dates; timeline grid shows months; horizontal scrolling works for long timelines

3. **Dependency Visualization**
   - Description: Display curved arrow connectors between dependent tasks (e.g., Excavation → Pouring → Foundation Complete)
   - Acceptance: Dependency arrows visually connect the correct task bars; arrows do not overlap task text

4. **Milestone Markers**
   - Description: Show milestone events as orange diamond markers with labels (e.g., "Foundation Complete", "Roof Tight", "Inspections")
   - Acceptance: Milestones appear at correct dates; diamond markers are visible and distinct from task bars

5. **Today Indicator**
   - Description: Display a vertical red line showing the current date with "TODAY - [Date]" label
   - Acceptance: Red line updates to current date; label is visible and positioned above timeline

6. **Zoom Controls**
   - Description: Provide +/- buttons to zoom in/out on the timeline scale
   - Acceptance: Clicking + zooms in (shows more detail); clicking - zooms out (shows longer time span); zoom persists during session

7. **Filter Functionality**
   - Description: Dropdown to filter visible tasks by criteria (phase, status, etc.)
   - Acceptance: Filter dropdown displays options; applying filter hides/shows appropriate tasks

### Edge Cases

1. **Long Task Names** - Truncate with ellipsis if task name exceeds available space in left panel
2. **Overlapping Dependencies** - Ensure arrows route around tasks to avoid visual clutter
3. **No Tasks** - Display EmptyState component when no tasks are available
4. **Mobile/Narrow Screens** - Timeline should scroll horizontally; consider responsive breakpoints for left panel width
5. **Date Edge Cases** - Handle tasks starting before timeline range or extending beyond visible range

## Implementation Notes

### DO
- Install `@svar-ui/react-gantt` version 2.3.0 or higher via npm
- Import the CSS file: `import '@svar-ui/react-gantt/index.css'`
- Follow the data structure pattern from library docs:
  - `tasks`: Array with `{ id, text, start, end, duration, parent, type }`
  - `links`: Array with `{ id, source, target, type }` where type = `e2e|e2s|s2e|s2s`
  - `scales`: Timeline configuration (day/week/month)
- Use Material-UI theme colors for consistency (primary.main, etc.)
- Reuse existing `Card`, `Button`, `PageHeader` components
- Create TypeScript interfaces in `types/timeline.ts` for type safety
- Use mock data initially (hardcoded tasks/dependencies based on design reference)
- Add timeline link to project detail navigation tabs

### DON'T
- Don't implement backend API calls in this phase (use mock data)
- Don't add drag-and-drop editing yet (read-only view for now)
- Don't implement export features (PDF/PNG/Excel) in initial version
- Don't create custom Gantt rendering - use the library's built-in components
- Don't override all library styles - work with default styling and customize minimally for brand consistency

## Development Environment

### Start Services

```bash
# Start frontend (from project root)
cd frontend
npm run dev:hmr

# Or use docker-compose for full stack
docker-compose up frontend
```

### Service URLs
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/api/v1

### Required Environment Variables
- `VITE_API_URL`: http://localhost:8000/api/v1 (already configured in .env)

### Install Gantt Library

```bash
cd frontend
npm install @svar-ui/react-gantt
```

## Success Criteria

The task is complete when:

1. [ ] `@svar-ui/react-gantt` is installed and appears in package.json
2. [ ] New route `/projects/:projectId/timeline` is accessible and renders GanttTimelinePage
3. [ ] Timeline displays hierarchical tasks matching the design reference structure (Foundation → Excavation, Pouring, etc.)
4. [ ] Task bars appear on timeline with correct date ranges
5. [ ] Dependency arrows connect related tasks visually
6. [ ] Milestone markers (orange diamonds) appear with labels
7. [ ] Today indicator (red vertical line) displays with current date
8. [ ] Zoom controls (+/-) adjust timeline scale
9. [ ] Filter dropdown is present (can be non-functional placeholder initially)
10. [ ] Component styling matches design reference (header, colors, layout)
11. [ ] No console errors or TypeScript compilation errors
12. [ ] Existing tests still pass (npm run lint succeeds)
13. [ ] Component is responsive and horizontally scrollable

## QA Acceptance Criteria

**CRITICAL**: These criteria must be verified by the QA Agent before sign-off.

### Unit Tests
| Test | File | What to Verify |
|------|------|----------------|
| N/A - Initial implementation | N/A | No unit tests required for initial visual component (future enhancement) |

### Integration Tests
| Test | Services | What to Verify |
|------|----------|----------------|
| N/A - Mock data only | frontend-only | No integration tests required (no backend integration yet) |

### End-to-End Tests
| Flow | Steps | Expected Outcome |
|------|-------|------------------|
| Navigate to Timeline | 1. Login to app 2. Select a project 3. Click "Timeline" tab | Timeline page loads without errors |
| View Task Hierarchy | 1. Navigate to timeline 2. Observe task groups | Foundation, Framing, Electrical, Plumbing groups visible |
| Expand/Collapse Groups | 1. Click collapse icon on "Foundation" 2. Click expand icon | Tasks hide/show correctly |
| Zoom Timeline | 1. Click "+" zoom button 2. Click "-" zoom button | Timeline scale adjusts; bars resize appropriately |
| Verify Dependencies | 1. Observe Excavation → Pouring arrow 2. Observe Pouring → Foundation Complete arrow | Arrows visually connect correct tasks |
| Verify Milestones | 1. Locate "Foundation Complete" marker 2. Locate "Roof Tight" marker | Orange diamond markers appear at correct dates |
| Today Indicator | 1. Check for red vertical line 2. Verify date label | Red line present with "TODAY - [Date]" label |

### Browser Verification (if frontend)
| Page/Component | URL | Checks |
|----------------|-----|--------|
| Gantt Timeline Page | `http://localhost:3000/projects/1/timeline` | - Page renders without errors<br>- Task list on left, timeline on right<br>- Zoom buttons functional<br>- Filter dropdown present<br>- Horizontal scroll works<br>- No layout overflow issues |
| Timeline Header | Same as above | - "BuilderOps Construction Project Timeline" title visible<br>- Zoom controls (-, +) clickable<br>- Filter dropdown styled correctly<br>- Menu icon (⋮) present |
| Task Groups | Same as above | - Foundation group collapsible<br>- Framing group collapsible<br>- Electrical group collapsible<br>- Plumbing group collapsible<br>- Nested tasks indented |
| Timeline Grid | Same as above | - Month headers visible (Oct 2023, Nov, Dec, Jan 2024, Feb, Mar)<br>- Grid lines visible<br>- Task bars align with dates<br>- Today line positioned correctly |

### Database Verification (if applicable)
| Check | Query/Command | Expected |
|-------|---------------|----------|
| N/A | N/A | No database changes in this phase |

### QA Sign-off Requirements
- [ ] Browser rendering verified in Chrome/Firefox/Safari
- [ ] Timeline displays correctly with mock data
- [ ] All interactive controls (zoom, collapse/expand) work
- [ ] Component matches design reference (18-gantt-timeline.png)
- [ ] No console errors or warnings
- [ ] TypeScript compilation succeeds (npm run build)
- [ ] ESLint passes (npm run lint)
- [ ] No regressions in existing pages (dashboard, equipment, etc.)
- [ ] Code follows established patterns (MUI imports, styled components, TypeScript types)
- [ ] No security vulnerabilities introduced (check library CVEs)
- [ ] Responsive behavior verified (timeline scrolls horizontally on narrow screens)
- [ ] Navigation to/from timeline page works correctly
- [ ] Page performance acceptable (initial render < 2s with mock data)

### Additional Visual QA Checks
- [ ] Task bars have correct color (#4A90E2 blue from design)
- [ ] Milestone diamonds are orange (#FF9500 or similar)
- [ ] Today line is red (#FF0000 or #FF3B30)
- [ ] Font sizes and weights match design
- [ ] Left panel width appropriate (approx 300-350px)
- [ ] Header styling consistent with other pages
- [ ] Dependency arrows are gray/neutral color
- [ ] Hover states on task bars (if applicable)

### Accessibility Checks
- [ ] Color contrast meets WCAG AA standards
- [ ] Keyboard navigation works (tab through controls)
- [ ] Screen reader can announce task names and dates
- [ ] Focus indicators visible on interactive elements
