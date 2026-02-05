# QA Fix Request

**Status**: REJECTED
**Date**: 2026-02-01
**QA Session**: 1

## Summary

The implementation is **functionally complete and well-written**, but it **lacks required tests** specified in the QA Acceptance Criteria. All code quality, security, and pattern compliance checks passed. Only testing infrastructure is missing.

## Critical Issues to Fix

### 1. Missing Test Framework Configuration

**Problem**: No testing framework is configured in the project. The package.json has no "test" script, and no testing libraries are installed.

**Location**: `frontend/package.json`

**Required Fix**:

1. Install testing dependencies:
```bash
cd frontend
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

2. Add test script to `package.json`:
```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage"
  }
}
```

3. Create `frontend/vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

4. Create `frontend/src/test/setup.ts`:
```typescript
import { expect, afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import * as matchers from '@testing-library/jest-dom/matchers'

expect.extend(matchers)

afterEach(() => {
  cleanup()
})
```

**Verification**: Run `npm test` - it should execute without errors (even if no tests exist yet)

---

### 2. Missing Unit Tests for InspectorDashboard

**Problem**: Spec requires unit tests for InspectorDashboard component covering: renders, loading state, fetches data, filters to today only, and empty state. No test file exists.

**Location**: File needs to be created: `frontend/src/pages/InspectorDashboard.test.tsx`

**Required Fix**: Create the test file with the following tests:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import InspectorDashboard from './InspectorDashboard'
import { inspectionsApi } from '../api/inspections'
import type { Inspection } from '../types'

// Mock the API
vi.mock('../api/inspections', () => ({
  inspectionsApi: {
    getProjectInspections: vi.fn(),
  },
}))

// Mock MobileBottomNav to avoid router issues
vi.mock('../components/layout/MobileBottomNav', () => ({
  default: () => <div data-testid="mobile-bottom-nav">Mobile Nav</div>,
}))

const mockInspections: Inspection[] = [
  {
    id: '1',
    consultantType: { id: '1', name: 'Structural Inspection', nameHe: 'בדיקה קונסטרוקטיבית' },
    scheduledDate: new Date().toISOString(),
    currentStage: '123 Main St, Building A',
    notes: 'Foundation inspection required',
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '2',
    consultantType: { id: '2', name: 'Electrical Inspection', nameHe: 'בדיקת חשמל' },
    scheduledDate: new Date().toISOString(),
    currentStage: '456 Oak Ave, Unit 5',
    notes: null,
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

const renderComponent = () => {
  return render(
    <BrowserRouter>
      <InspectorDashboard />
    </BrowserRouter>
  )
}

describe('InspectorDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without errors', async () => {
    vi.mocked(inspectionsApi.getProjectInspections).mockResolvedValue([])

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Field Inspector')).toBeInTheDocument()
    })
  })

  it('displays loading state with skeleton', () => {
    vi.mocked(inspectionsApi.getProjectInspections).mockImplementation(
      () => new Promise(() => {}) // Never resolves to keep loading
    )

    renderComponent()

    // Skeleton should be visible during loading
    expect(screen.queryByText('Today\'s Schedule')).not.toBeInTheDocument()
  })

  it('fetches today\'s inspections from API', async () => {
    vi.mocked(inspectionsApi.getProjectInspections).mockResolvedValue(mockInspections)

    renderComponent()

    await waitFor(() => {
      expect(inspectionsApi.getProjectInspections).toHaveBeenCalledWith('1')
    })
  })

  it('filters inspections to show only today', async () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)

    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)

    const mixedInspections: Inspection[] = [
      { ...mockInspections[0], id: '1', scheduledDate: yesterday.toISOString() }, // Yesterday
      { ...mockInspections[0], id: '2', scheduledDate: new Date().toISOString() }, // Today
      { ...mockInspections[0], id: '3', scheduledDate: tomorrow.toISOString() }, // Tomorrow
    ]

    vi.mocked(inspectionsApi.getProjectInspections).mockResolvedValue(mixedInspections)

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Today\'s Schedule')).toBeInTheDocument()
    })

    // Should only show 1 inspection (today's)
    const inspectionCards = screen.queryAllByRole('listitem')
    expect(inspectionCards).toHaveLength(1)
  })

  it('shows empty state when no inspections scheduled for today', async () => {
    vi.mocked(inspectionsApi.getProjectInspections).mockResolvedValue([])

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('No inspections scheduled')).toBeInTheDocument()
      expect(screen.getByText('You have no inspections scheduled for today')).toBeInTheDocument()
    })
  })

  it('displays all three quick action buttons', async () => {
    vi.mocked(inspectionsApi.getProjectInspections).mockResolvedValue([])

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('START INSPECTION')).toBeInTheDocument()
      expect(screen.getByText('TAKE PHOTO')).toBeInTheDocument()
      expect(screen.getByText('REPORT ISSUE')).toBeInTheDocument()
    })
  })

  it('displays offline badge', async () => {
    vi.mocked(inspectionsApi.getProjectInspections).mockResolvedValue([])

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('OFFLINE')).toBeInTheDocument()
    })
  })

  it('displays inspection details correctly', async () => {
    vi.mocked(inspectionsApi.getProjectInspections).mockResolvedValue(mockInspections)

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Structural Inspection')).toBeInTheDocument()
      expect(screen.getByText('123 Main St, Building A')).toBeInTheDocument()
      expect(screen.getByText('Foundation inspection required')).toBeInTheDocument()
    })
  })

  it('displays mobile bottom navigation', async () => {
    vi.mocked(inspectionsApi.getProjectInspections).mockResolvedValue([])

    renderComponent()

    await waitFor(() => {
      expect(screen.getByTestId('mobile-bottom-nav')).toBeInTheDocument()
    })
  })
})
```

**Verification**:
- Run `npm test InspectorDashboard.test.tsx`
- All tests should pass
- Coverage should include: renders, loading, API call, filtering, empty state

---

### 3. Missing Unit Tests for MobileBottomNav

**Problem**: Spec requires unit tests for MobileBottomNav component covering: renders with 4 tabs, active state handling, navigation. No test file exists.

**Location**: File needs to be created: `frontend/src/components/layout/MobileBottomNav.test.tsx`

**Required Fix**: Create the test file:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter, useNavigate, useLocation } from 'react-router-dom'
import MobileBottomNav from './MobileBottomNav'

// Mock react-router-dom hooks
const mockNavigate = vi.fn()
const mockLocation = { pathname: '/inspector-dashboard' }

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => mockLocation,
  }
})

const renderComponent = (props = {}) => {
  return render(
    <BrowserRouter>
      <MobileBottomNav {...props} />
    </BrowserRouter>
  )
}

describe('MobileBottomNav', () => {
  it('renders with 4 tabs', () => {
    renderComponent()

    expect(screen.getByText('Home')).toBeInTheDocument()
    expect(screen.getByText('Inspections')).toBeInTheDocument()
    expect(screen.getByText('Projects')).toBeInTheDocument()
    expect(screen.getByText('Profile')).toBeInTheDocument()
  })

  it('highlights the active tab based on current route', () => {
    mockLocation.pathname = '/inspector-dashboard'

    renderComponent()

    // Home tab should be selected when on /inspector-dashboard
    const homeButton = screen.getByRole('button', { name: /home/i })
    expect(homeButton).toHaveClass('Mui-selected')
  })

  it('navigates to correct route when tab is clicked', async () => {
    const user = userEvent.setup()
    renderComponent()

    const projectsTab = screen.getByRole('button', { name: /projects/i })
    await user.click(projectsTab)

    expect(mockNavigate).toHaveBeenCalledWith('/projects')
  })

  it('navigates to project-specific inspections when projectId is provided', async () => {
    const user = userEvent.setup()
    renderComponent({ projectId: '123' })

    const inspectionsTab = screen.getByRole('button', { name: /inspections/i })
    await user.click(inspectionsTab)

    expect(mockNavigate).toHaveBeenCalledWith('/projects/123/inspections')
  })

  it('renders with fixed position at bottom', () => {
    const { container } = renderComponent()

    const paper = container.querySelector('.MuiPaper-root')
    expect(paper).toHaveStyle({ position: 'fixed' })
  })
})
```

**Verification**:
- Run `npm test MobileBottomNav.test.tsx`
- All tests should pass
- Coverage should include: 4 tabs, active state, navigation

---

## After Fixes

Once all fixes are complete:

1. **Verify tests pass**:
```bash
cd frontend
npm test
```
All tests should pass with no errors.

2. **Commit changes**:
```bash
git add .
git commit -m "test: add unit tests for InspectorDashboard and MobileBottomNav (qa-requested)"
```

3. **QA will automatically re-run** and verify:
   - Unit tests exist and pass
   - Test framework is properly configured
   - All QA acceptance criteria are met

## Expected Outcome

After implementing these fixes:
- ✅ Test framework configured and working
- ✅ Unit tests for InspectorDashboard pass (8 tests)
- ✅ Unit tests for MobileBottomNav pass (5 tests)
- ✅ `npm test` runs successfully
- ✅ QA sign-off can proceed

## Notes

- The actual feature implementation is excellent - no code changes needed to InspectorDashboard.tsx or MobileBottomNav.tsx
- Only test infrastructure and test files are missing
- Once tests are added, the feature should pass QA immediately
- Backend compatibility issue (Python 3.9 vs 3.10) is separate and doesn't block unit tests
