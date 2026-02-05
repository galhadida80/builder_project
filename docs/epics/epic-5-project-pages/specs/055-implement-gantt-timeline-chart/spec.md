# Specification: Implement Gantt Timeline Chart

## Overview

This task implements a new Gantt Timeline Chart component for the Construction Operations Platform. The component will visualize project tasks as horizontal bars on a timeline, showing task durations, dependencies between tasks, and overall project scheduling. This feature will enable project managers to view and manage construction project timelines in a visual, industry-standard Gantt chart format.

## Workflow Type

**Type**: feature

**Rationale**: This is a new feature implementation that adds a Gantt chart visualization component to the application. It requires creating new UI components, integrating with existing Material-UI patterns, and establishing data structures for timeline visualization.

## Task Scope

### Services Involved
- **frontend** (primary) - Create Gantt chart component with task bars and dependency visualization

### This Task Will:
- [ ] Install and configure `gantt-task-react` library for Gantt chart rendering
- [ ] Create a new GanttChart component that integrates with Material-UI design system
- [ ] Implement task data structure with support for task bars, dependencies, and milestones
- [ ] Add interactive features (drag-to-reschedule, progress updates, zoom controls)
- [ ] Style component to match existing application theme using Emotion/MUI
- [ ] Create example/demo view showing Gantt chart functionality
- [ ] Add TypeScript type definitions for task data structures

### Out of Scope:
- Backend API endpoints for task/project data persistence
- Real-time collaborative editing of tasks
- Export to MS Project or other project management formats
- Critical path analysis or resource allocation features
- Mobile-responsive optimizations (desktop-first implementation)

## Service Context

### Frontend

**Tech Stack:**
- Language: TypeScript
- Framework: React 18.2.0
- Build Tool: Vite
- Styling: Emotion + Material-UI v5.15.6
- Key directories: src/

**Entry Point:** `src/App.tsx`

**How to Run:**
```bash
cd frontend
npm run dev
```

**Port:** 3000

**Available Libraries:**
- @mui/material (v5.15.6) - UI components
- @mui/icons-material - Icons
- dayjs (v1.11.10) - Date manipulation
- react-router-dom - Routing

## Files to Modify

| File | Service | What to Change |
|------|---------|---------------|
| `frontend/package.json` | frontend | Add `gantt-task-react` dependency |
| `frontend/src/components/GanttChart.tsx` | frontend | Create new Gantt chart component (new file) |
| `frontend/src/types/gantt.ts` | frontend | Define TypeScript interfaces for task data (new file) |
| `frontend/src/App.tsx` or router config | frontend | Add route/navigation to Gantt chart demo page |

## Files to Reference

These files show patterns to follow:

| File | Pattern to Copy |
|------|----------------|
| `frontend/src/components/**/*.tsx` | Material-UI component patterns, Emotion styling approach |
| `frontend/src/types/**/*.ts` | TypeScript interface definitions and type patterns |

## Patterns to Follow

### Material-UI Integration Pattern

Look at existing MUI components in the codebase to understand:

**Key Points:**
- Use MUI Box, Paper, and Container for layout structure
- Use MUI IconButtons for toolbar controls (zoom in/out, today button)
- Apply theme colors via `theme.palette` for consistency
- Use `sx` prop for inline styling with theme access
- Wrap third-party components in MUI Paper/Card for visual consistency

### TypeScript Type Safety

Follow existing TypeScript patterns:

**Key Points:**
- Define strict interfaces for all data structures
- Export types from dedicated `types/` directory
- Use discriminated unions for task types ('task' | 'milestone' | 'project')
- Avoid `any` types - prefer proper typing for library interfaces

### Date Handling with dayjs

Already available in project:

**Key Points:**
- Use dayjs for all date parsing and formatting
- Convert ISO strings to Date objects before passing to gantt-task-react
- Use dayjs for "Today" indicator calculations

## Requirements

### Functional Requirements

1. **Task Bar Visualization**
   - Description: Display tasks as horizontal bars on a timeline with start/end dates
   - Acceptance: Tasks appear as colored bars spanning their duration on the chart

2. **Task Dependencies**
   - Description: Show arrows connecting dependent tasks
   - Acceptance: Dependency arrows render between tasks with correct directional flow

3. **Milestones**
   - Description: Display milestone markers (diamond shape) on timeline
   - Acceptance: Milestones appear as distinct markers at specific dates

4. **Interactive Controls**
   - Description: Zoom controls (Hour/Day/Week/Month views), "Today" button
   - Acceptance: Users can switch between time granularities and jump to current date

5. **Drag-to-Reschedule**
   - Description: Drag task bars to update start/end dates
   - Acceptance: Dragging a task updates its dates in component state

6. **Progress Tracking**
   - Description: Visual indication of task completion percentage
   - Acceptance: Task bars show filled portion representing progress (0-100%)

7. **Filter Functionality**
   - Description: Dropdown filter button to filter tasks by criteria (e.g., task type, status, team)
   - Acceptance: Filter menu displays, filtering updates visible tasks on chart

### Edge Cases

1. **Task Overlap** - Multiple tasks can overlap in time; ensure bars don't visually collide (library handles this with row positioning)
2. **Empty Data** - Show placeholder message when no tasks are provided
3. **Invalid Dates** - Validate that end date is after start date before rendering
4. **Circular Dependencies** - Don't crash if tasks have circular dependency references (log warning)
5. **Very Long/Short Tasks** - Ensure tasks spanning years or hours render appropriately at different zoom levels

## Implementation Notes

### DO
- **Import library components** - `import { Gantt, Task, ViewMode } from 'gantt-task-react';`
- **Import CSS file** - CRITICAL: `import "gantt-task-react/dist/index.css";` is mandatory
- Use Material-UI Box/Paper to wrap the Gantt component for consistent styling
- Use dayjs to convert date strings to Date objects (library requires Date, not strings)
- Set progress as 0-100 (NOT 0-1) - common mistake with this library
- Match MUI theme colors for task bars (`barProgressColor`, `barBackgroundColor`)
- Create reusable TypeScript interfaces for task data in `src/types/gantt.ts`
- Add event handlers: `onDateChange`, `onProgressChange`, `onDelete`, `onExpanderClick`
- Use ViewMode enum for zoom levels: `ViewMode.Hour`, `ViewMode.Day`, `ViewMode.Week`, `ViewMode.Month`, etc.
- Dependencies must be string arrays: `dependencies: ['task-id-1', 'task-id-2']`

### DON'T
- Don't forget the CSS import - chart won't render properly without it
- Don't pass ISO date strings directly - convert to Date objects first
- Don't use progress values 0-1 (use 0-100)
- Don't create custom date picker UI - use dayjs for date calculations
- Don't hardcode colors - pull from MUI theme
- Don't skip TypeScript types - define proper interfaces

## Development Environment

### Start Services

```bash
# Terminal 1: Start frontend dev server
cd frontend
npm run dev
```

### Service URLs
- Frontend: http://localhost:3000

### Required Environment Variables
- `VITE_API_URL`: http://localhost:8001/api/v1 (optional for this frontend-only feature)

### Install Dependencies

```bash
# Install gantt-task-react
cd frontend
npm install gantt-task-react
```

## Success Criteria

The task is complete when:

1. [ ] `gantt-task-react` installed and imported with CSS in component
2. [ ] GanttChart component renders task bars with proper styling
3. [ ] Task dependencies display as arrows between related tasks
4. [ ] Milestones render as diamond markers
5. [ ] Zoom controls (ViewMode switcher) change timeline granularity
6. [ ] Drag-to-reschedule updates task dates
7. [ ] Progress bars show completion percentage visually
8. [ ] Filter button displays menu with filter options
9. [ ] Filtering tasks updates chart display
10. [ ] Component matches Material-UI theme styling
11. [ ] No console errors when rendering chart
12. [ ] TypeScript types defined for task data structures
13. [ ] Demo page accessible via routing shows working Gantt chart

## QA Acceptance Criteria

**CRITICAL**: These criteria must be verified by the QA Agent before sign-off.

### Unit Tests
| Test | File | What to Verify |
|------|------|----------------|
| Task data conversion | `frontend/src/components/GanttChart.test.tsx` | Dates converted from strings to Date objects correctly |
| Progress validation | `frontend/src/components/GanttChart.test.tsx` | Progress values in range 0-100 |
| Dependency validation | `frontend/src/components/GanttChart.test.tsx` | Circular dependencies handled gracefully |

### Integration Tests
| Test | Services | What to Verify |
|------|----------|----------------|
| MUI Theme Integration | frontend | GanttChart uses theme colors for bars and UI elements |
| Date Handling | frontend | dayjs correctly parses and formats dates for display |

### End-to-End Tests
| Flow | Steps | Expected Outcome |
|------|-------|------------------|
| View Gantt Chart | 1. Navigate to Gantt demo page 2. Observe chart renders | Chart displays with task bars, dependencies, and controls |
| Change Zoom Level | 1. Click zoom control 2. Switch between Day/Week/Month views | Timeline granularity updates, bars rescale appropriately |
| Drag Task | 1. Drag task bar horizontally 2. Observe date change | Task start/end dates update, onDateChange callback fires |

### Browser Verification (if frontend)
| Page/Component | URL | Checks |
|----------------|-----|--------|
| GanttChart Component | `http://localhost:3000/gantt` (or demo route) | ✓ Task bars render with correct colors<br>✓ Dependencies show as arrows<br>✓ Milestones appear as diamonds<br>✓ Zoom controls work<br>✓ Drag-to-reschedule functional<br>✓ Progress bars visible<br>✓ No console errors<br>✓ Matches MUI theme |

### Database Verification (if applicable)
N/A - This is a frontend-only component. Future iterations may add backend persistence.

### QA Sign-off Requirements
- [ ] Component renders without errors in browser console
- [ ] CSS import present (verified by checking rendered styles)
- [ ] Task bars display with correct start/end positions
- [ ] Dependency arrows render between connected tasks
- [ ] Milestones appear as distinct diamond markers
- [ ] Zoom controls change timeline view (Day/Week/Month)
- [ ] Filter button opens dropdown menu with filter options
- [ ] Filtering tasks correctly updates visible tasks on chart
- [ ] Drag-to-reschedule updates task dates in state
- [ ] Progress bars show completion percentage
- [ ] Component uses MUI theme colors (not hardcoded colors)
- [ ] TypeScript compiles without errors
- [ ] No regressions in existing application functionality
- [ ] Code follows React/TypeScript best practices
- [ ] Design matches reference image `18-gantt-timeline.png`

## Implementation Checklist

**Note:** All paths below are relative to the `frontend/` directory. Ensure you're in the frontend directory before starting implementation.

### Phase 1: Setup & Installation
- [ ] Run `npm install gantt-task-react` in frontend directory
- [ ] Verify library installed in package.json

### Phase 2: Type Definitions
- [ ] Create `src/types/gantt.ts`
- [ ] Define GanttTask interface (id: string, name: string, type: 'task'|'milestone'|'project', start: Date, end: Date, progress: number, dependencies: string[])
- [ ] Note: dependencies is an array of task ID strings
- [ ] Define GanttViewMode type
- [ ] Export types for component usage

### Phase 3: Component Creation
- [ ] Create `src/components/GanttChart.tsx`
- [ ] Import gantt-task-react: `import { Gantt, Task, ViewMode } from 'gantt-task-react';`
- [ ] Import CSS: `import "gantt-task-react/dist/index.css";`
- [ ] Import Material-UI components (Box, Paper, IconButton, Menu, MenuItem)
- [ ] Create component skeleton with props interface

### Phase 4: Core Rendering
- [ ] Wrap Gantt component in MUI Paper
- [ ] Pass sample task data to Gantt component
- [ ] Configure StylingOption props with MUI theme colors
- [ ] Verify task bars render correctly

### Phase 5: Interactive Features
- [ ] Implement ViewMode selector (zoom controls)
- [ ] Add filter dropdown button using MUI Menu component
- [ ] Implement filter logic to show/hide tasks based on criteria
- [ ] Add onDateChange handler for drag-to-reschedule
- [ ] Add onProgressChange handler
- [ ] Add onDelete handler
- [ ] Add onExpanderClick for hierarchical tasks

### Phase 6: Demo Page
- [ ] Create demo/example page with sample project data
- [ ] Add navigation route to Gantt demo
- [ ] Populate with realistic construction project tasks
- [ ] Show examples of tasks, milestones, and dependencies

### Phase 7: Styling & Polish
- [ ] Apply MUI theme colors to task bars
- [ ] Add "Today" indicator line
- [ ] Ensure responsive container sizing
- [ ] Add loading state (if applicable)
- [ ] Add empty state message

### Phase 8: Testing & Validation
- [ ] Test with empty data
- [ ] Test with overlapping tasks
- [ ] Test with circular dependencies
- [ ] Verify TypeScript compilation
- [ ] Check browser console for errors
- [ ] Compare against reference design `18-gantt-timeline.png`

## Reference Design

**Design File:** `18-gantt-timeline.png`

Review this design file to understand:
- Task bar colors and styling
- Dependency arrow appearance
- Milestone marker style
- Timeline header layout
- Overall visual aesthetic

Ensure the implemented component matches the design's look and feel while maintaining Material-UI design system consistency.

## Library Documentation

**gantt-task-react:** [GitHub Repository](https://github.com/MaTeMaTuK/gantt-task-react)

Key API reference:
- Component props: tasks, viewMode, onDateChange, onProgressChange, onDelete
- StylingOption: barProgressColor, barBackgroundColor, fontSize, fontFamily
- ViewMode enum: Hour, QuarterDay, HalfDay, Day, Week, Month, QuarterYear, Year
- Task type: 'task' | 'milestone' | 'project'

## Notes

- This is a frontend-only implementation; backend integration for data persistence is out of scope
- Focus on creating a reusable component that can later be integrated with real project data
- Prioritize matching the reference design while maintaining Material-UI consistency
- The component should be production-ready but may need refinement based on user feedback
