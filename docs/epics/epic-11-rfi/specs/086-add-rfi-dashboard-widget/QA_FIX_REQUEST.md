# QA Fix Request

**Status**: REJECTED
**Date**: 2026-02-02
**QA Session**: 1

---

## Summary

The RFI Dashboard Widget implementation has **excellent code quality** but has **2 critical blockers** preventing sign-off:

1. **Widget cannot display RFI data** (no projectId context on dashboard)
2. **Missing unit tests** (required by spec)

---

## Critical Issues to Fix

### 1. Widget Cannot Display RFI Data on Dashboard

**Problem**: The RFIStatsWidget is added to DashboardPage without a projectId prop. The dashboard route (`/dashboard`) has no project context in the URL, so the widget will always show "Select a project to view RFI statistics" instead of actual RFI data.

**Location**:
- `frontend/src/pages/DashboardPage.tsx:549` - Widget rendered without projectId
- `frontend/src/App.tsx:33` - Dashboard route has no project context

**Root Cause**: The app's routing structure has dashboard at `/dashboard` (general) but RFI data requires a project context at `/projects/:projectId`.

**Required Fix**: Implement Project Context Provider

Create a global context to track the currently selected project across the entire app. This is the most flexible solution and follows common dashboard patterns.

**Implementation Steps**:

1. **Create Project Context** - `frontend/src/contexts/ProjectContext.tsx`
```typescript
import { createContext, useContext, useState, ReactNode } from 'react'

interface ProjectContextType {
  selectedProjectId: string | undefined
  setSelectedProjectId: (id: string | undefined) => void
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined)

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>()

  return (
    <ProjectContext.Provider value={{ selectedProjectId, setSelectedProjectId }}>
      {children}
    </ProjectContext.Provider>
  )
}

export function useProject() {
  const context = useContext(ProjectContext)
  if (!context) {
    throw new Error('useProject must be used within ProjectProvider')
  }
  return context
}
```

2. **Wrap App in Provider** - Modify `frontend/src/App.tsx`
```typescript
import { ProjectProvider } from './contexts/ProjectContext'

export default function App() {
  return (
    <ProjectProvider>
      <Routes>
        {/* existing routes unchanged */}
      </Routes>
    </ProjectProvider>
  )
}
```

3. **Update DashboardPage** - Modify `frontend/src/pages/DashboardPage.tsx`
```typescript
import { useProject } from '../contexts/ProjectContext'

export default function DashboardPage() {
  const { selectedProjectId } = useProject()

  // ... existing code unchanged ...

  return (
    <Box sx={{ p: 3 }}>
      {/* ... existing content unchanged ... */}

      <Box sx={{ mt: 3 }}>
        <RFIStatsWidget projectId={selectedProjectId} />
      </Box>
    </Box>
  )
}
```

4. **Connect Project Selector** - Modify `frontend/src/components/layout/Layout.tsx`
```typescript
import { useProject } from '../../contexts/ProjectContext'

function Layout() {
  const { setSelectedProjectId } = useProject()

  // Find existing project selector onChange handler and add:
  const handleProjectChange = (projectId: string) => {
    setSelectedProjectId(projectId)
    // ... existing navigation logic ...
  }

  // ... rest of component unchanged
}
```

**Verification**:
1. Start dev server: `npm run dev:hmr`
2. Navigate to dashboard
3. Select a project from the project selector in the layout
4. Verify RFI widget displays actual stats (not "Select a project" message)
5. Change project selection
6. Verify widget updates with new project's stats

---

### 2. Missing Unit Tests

**Problem**: No unit tests were created for the RFIStatsWidget component. The spec explicitly requires comprehensive unit tests for component rendering, loading states, error handling, and click handlers.

**Location**: Missing file - `frontend/src/components/dashboard/RFIStatsWidget.test.tsx`

**Required Tests** (from spec lines 276-283):
1. Component renders with all 4 stat sections
2. Loading state displays (skeleton loaders)
3. Error state displays with error message and retry button
4. Click handlers trigger navigation with correct filters
5. "Select a project" message when no projectId
6. Retry functionality works after error

**Required Fix**: Create test file with comprehensive coverage

**Implementation**: Create `frontend/src/components/dashboard/RFIStatsWidget.test.tsx`

```typescript
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import RFIStatsWidget from './RFIStatsWidget'
import { rfiApi } from '../../api/rfi'

jest.mock('../../api/rfi')
jest.mock('../common/ToastProvider', () => ({
  useToast: () => ({ showError: jest.fn() })
}))

const mockNavigate = jest.fn()
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate
}))

const mockStats = {
  total_rfis: 10,
  draft_count: 1,
  open_count: 3,
  waiting_response_count: 2,
  answered_count: 2,
  closed_count: 2,
  overdue_count: 1,
  by_priority: {},
  by_category: {}
}

describe('RFIStatsWidget', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders loading state initially', () => {
    (rfiApi.getSummary as jest.Mock).mockReturnValue(new Promise(() => {}))

    render(
      <BrowserRouter>
        <RFIStatsWidget projectId="test-project-id" />
      </BrowserRouter>
    )

    expect(screen.getByText('RFI Statistics')).toBeInTheDocument()
    // Check for skeleton loaders (4 of them)
    const skeletons = screen.getAllByTestId('skeleton')
    expect(skeletons).toHaveLength(4)
  })

  it('renders all 4 stat cards when data loads', async () => {
    (rfiApi.getSummary as jest.Mock).mockResolvedValue(mockStats)

    render(
      <BrowserRouter>
        <RFIStatsWidget projectId="test-project-id" />
      </BrowserRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Open RFIs')).toBeInTheDocument()
      expect(screen.getByText('Overdue')).toBeInTheDocument()
      expect(screen.getByText('Answered')).toBeInTheDocument()
      expect(screen.getByText('Closed')).toBeInTheDocument()
    })

    // Verify stat values are displayed
    expect(screen.getByText('3')).toBeInTheDocument() // open_count
    expect(screen.getByText('1')).toBeInTheDocument() // overdue_count
    expect(screen.getByText('2')).toBeInTheDocument() // answered_count (2 instances)
  })

  it('displays error state when API fails', async () => {
    (rfiApi.getSummary as jest.Mock).mockRejectedValue(new Error('API Error'))

    render(
      <BrowserRouter>
        <RFIStatsWidget projectId="test-project-id" />
      </BrowserRouter>
    )

    await waitFor(() => {
      expect(screen.getByText(/Failed to load RFI statistics/i)).toBeInTheDocument()
      expect(screen.getByText('Retry')).toBeInTheDocument()
    })
  })

  it('shows "Select a project" when no projectId provided', () => {
    render(
      <BrowserRouter>
        <RFIStatsWidget />
      </BrowserRouter>
    )

    expect(screen.getByText('Select a project to view RFI statistics')).toBeInTheDocument()
  })

  it('navigates to RFI list with correct filter on stat click', async () => {
    (rfiApi.getSummary as jest.Mock).mockResolvedValue(mockStats)

    render(
      <BrowserRouter>
        <RFIStatsWidget projectId="test-123" />
      </BrowserRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Open RFIs')).toBeInTheDocument()
    })

    // Click on "Open RFIs" stat
    const openCard = screen.getByText('Open RFIs').closest('div[role="button"]')
    fireEvent.click(openCard!)

    expect(mockNavigate).toHaveBeenCalledWith('/projects/test-123/rfis?status=open')
  })

  it('retry button reloads data after error', async () => {
    (rfiApi.getSummary as jest.Mock)
      .mockRejectedValueOnce(new Error('API Error'))
      .mockResolvedValueOnce(mockStats)

    render(
      <BrowserRouter>
        <RFIStatsWidget projectId="test-project-id" />
      </BrowserRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Retry')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Retry'))

    await waitFor(() => {
      expect(screen.getByText('Open RFIs')).toBeInTheDocument()
    })

    expect(rfiApi.getSummary).toHaveBeenCalledTimes(2)
  })
})
```

**Note**: You may need to adjust the test based on your actual testing setup (Jest config, test-utils, etc.).

**Verification**:
```bash
cd frontend
npm test -- RFIStatsWidget
```
All 6 tests should pass.

---

## Additional Verification Required (Not Blocking, But Important)

These cannot be verified in the current environment but should be checked before merge:

### 3. TypeScript Compilation
```bash
cd frontend
npm run build
```
**Expected**: No TypeScript errors, successful build.

### 4. Browser Manual Testing
```bash
cd frontend
npm run dev:hmr
```
Navigate to `http://localhost:3000/dashboard` and verify:
- ✅ Widget displays with actual RFI data (after Fix #1)
- ✅ All 4 stat cards render correctly
- ✅ Icons and colors are correct (info, error, success, primary)
- ✅ Click navigation works to RFI list with filters
- ✅ Loading state appears briefly during fetch
- ✅ Error state displays if backend is killed
- ✅ Retry button reloads data successfully
- ✅ Responsive layout at 320px, 768px, 1920px widths
- ✅ No console errors or warnings

---

## Code Quality: Already Excellent ✓

The following aspects are **already implemented correctly** and don't need changes:

- ✅ TypeScript types and interfaces
- ✅ Error handling with try-catch
- ✅ Loading states with skeletons
- ✅ Responsive grid layout
- ✅ Uses KPICard pattern correctly
- ✅ API integration via rfiApi.getSummary
- ✅ Navigation handlers with useNavigate
- ✅ MUI icons and color coding
- ✅ No security vulnerabilities
- ✅ Follows all established patterns
- ✅ Clean, maintainable code

---

## After Fixes

Once you've implemented both critical fixes:

1. **Commit your changes**:
```bash
git add frontend/src/contexts/ProjectContext.tsx
git add frontend/src/App.tsx
git add frontend/src/pages/DashboardPage.tsx
git add frontend/src/components/layout/Layout.tsx
git add frontend/src/components/dashboard/RFIStatsWidget.test.tsx
git commit -m "fix: add project context and unit tests for RFI widget (qa-requested)"
```

2. **QA will automatically re-run** and verify:
   - ✅ Project context provides projectId to widget
   - ✅ Widget displays RFI data on dashboard
   - ✅ All unit tests pass
   - ✅ TypeScript compiles successfully
   - ✅ Browser verification complete

---

## Summary of Changes Needed

| File | Action | Purpose |
|------|--------|---------|
| `frontend/src/contexts/ProjectContext.tsx` | **CREATE** | Global project context provider |
| `frontend/src/App.tsx` | **MODIFY** | Wrap app in ProjectProvider |
| `frontend/src/pages/DashboardPage.tsx` | **MODIFY** | Use context to get projectId for widget |
| `frontend/src/components/layout/Layout.tsx` | **MODIFY** | Update context when project changes |
| `frontend/src/components/dashboard/RFIStatsWidget.test.tsx` | **CREATE** | Comprehensive unit test suite |

---

**Next Action**: Coder Agent to implement fixes and request QA re-run.
