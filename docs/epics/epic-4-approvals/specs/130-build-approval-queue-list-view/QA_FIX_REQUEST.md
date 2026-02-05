# QA Fix Request

**Status**: REJECTED
**Date**: 2026-02-02
**QA Session**: 1

## Critical Issues to Fix

### 1. Missing Unit Tests (CRITICAL - Blocks Sign-off)

**Problem**: No unit test files exist for the new components. The spec explicitly requires unit tests.

**Location**:
- Missing: `frontend/src/components/ApprovalQueueList.test.tsx`
- Missing: `frontend/src/api/approvals.test.ts` (if not already tested)

**Required Fix**: Create comprehensive unit tests covering:

#### ApprovalQueueList.test.tsx

**Required test cases:**
1. **Rendering Tests**:
   - Component renders with empty data
   - Component shows loading skeleton during data fetch
   - Component renders populated data correctly
   - Table displays all 7 columns (ID, Title, Project, Requester, Status, Created Date, Actions)

2. **Filter Functionality**:
   - Tab switching updates displayed approvals (Pending/Approved/Rejected/All)
   - Badge counts are accurate for each tab
   - Search field filters by entity name
   - Search field filters by requester name
   - Filters work in combination (tab + search)

3. **Action Handlers**:
   - Clicking Approve button opens confirmation dialog
   - Clicking Reject button opens confirmation dialog
   - Dialog shows entity details correctly
   - Approve action calls `approvalsApi.approve(id, comment)`
   - Reject action calls `approvalsApi.reject(id, comment)`
   - Reject button is disabled when comment is empty
   - Success toast appears after successful action
   - Error toast appears on API failure
   - Table reloads after successful action

4. **State Management**:
   - Loading state shows skeleton
   - Error state shows EmptyState with retry button
   - Retry button calls loadData() again
   - Empty state shows appropriate message based on tab
   - Submitting state disables buttons during action

5. **API Integration** (with mocked API):
   - `approvalsApi.myPending()` is called on mount
   - API errors are caught and displayed
   - Data transformation works correctly (entityName, requesterName)

**Example test structure:**

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ApprovalQueueList } from './ApprovalQueueList'
import { approvalsApi } from '../api/approvals'
import { ToastProvider } from './common/ToastProvider'

// Mock the API
jest.mock('../api/approvals')

// Mock toast provider
const mockShowSuccess = jest.fn()
const mockShowError = jest.fn()
jest.mock('./common/ToastProvider', () => ({
  useToast: () => ({
    showSuccess: mockShowSuccess,
    showError: mockShowError,
  }),
}))

describe('ApprovalQueueList', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders with empty data', async () => {
    ;(approvalsApi.myPending as jest.Mock).mockResolvedValue([])

    render(
      <ToastProvider>
        <ApprovalQueueList />
      </ToastProvider>
    )

    await waitFor(() => {
      expect(screen.getByText(/no pending approvals/i)).toBeInTheDocument()
    })
  })

  it('shows loading state', () => {
    ;(approvalsApi.myPending as jest.Mock).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    )

    render(
      <ToastProvider>
        <ApprovalQueueList />
      </ToastProvider>
    )

    // Check for loading skeleton
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('renders populated data correctly', async () => {
    const mockData = [
      {
        id: 'approval-123',
        projectId: 'project-1',
        entityType: 'equipment',
        entityId: 'equip-1',
        currentStatus: 'pending',
        createdAt: '2026-02-01T00:00:00Z',
        createdBy: { fullName: 'John Doe', email: 'john@example.com' },
        steps: [],
      },
    ]
    ;(approvalsApi.myPending as jest.Mock).mockResolvedValue(mockData)

    render(
      <ToastProvider>
        <ApprovalQueueList />
      </ToastProvider>
    )

    await waitFor(() => {
      expect(screen.getByText(/Equipment equip-1/i)).toBeInTheDocument()
      expect(screen.getByText(/John Doe/i)).toBeInTheDocument()
    })
  })

  it('filters by tab selection', async () => {
    const mockData = [
      { id: '1', currentStatus: 'pending', /* ... */ },
      { id: '2', currentStatus: 'approved', /* ... */ },
      { id: '3', currentStatus: 'rejected', /* ... */ },
    ]
    ;(approvalsApi.myPending as jest.Mock).mockResolvedValue(mockData)

    render(
      <ToastProvider>
        <ApprovalQueueList />
      </ToastProvider>
    )

    await waitFor(() => screen.getByText(/Pending/i))

    // Click Approved tab
    fireEvent.click(screen.getByText(/Approved/i))

    // Should only show approved items
    // Add assertions for filtered items
  })

  it('handles approve action', async () => {
    const mockData = [
      {
        id: 'approval-123',
        projectId: 'project-1',
        entityType: 'equipment',
        entityId: 'equip-1',
        currentStatus: 'pending',
        createdAt: '2026-02-01T00:00:00Z',
        createdBy: { fullName: 'John Doe' },
        steps: [],
      },
    ]
    ;(approvalsApi.myPending as jest.Mock).mockResolvedValue(mockData)
    ;(approvalsApi.approve as jest.Mock).mockResolvedValue({})

    render(
      <ToastProvider>
        <ApprovalQueueList />
      </ToastProvider>
    )

    await waitFor(() => screen.getByText(/Equipment equip-1/i))

    // Click approve button
    const approveButton = screen.getByTitle(/Approve/i)
    fireEvent.click(approveButton)

    // Dialog should open
    expect(screen.getByText(/Approve Request/i)).toBeInTheDocument()

    // Click confirm
    const confirmButton = screen.getByText(/Confirm Approval/i)
    fireEvent.click(confirmButton)

    await waitFor(() => {
      expect(approvalsApi.approve).toHaveBeenCalledWith('approval-123', undefined)
      expect(mockShowSuccess).toHaveBeenCalledWith('Request approved successfully!')
    })
  })

  it('handles reject action with comment', async () => {
    const mockData = [
      {
        id: 'approval-123',
        projectId: 'project-1',
        entityType: 'equipment',
        entityId: 'equip-1',
        currentStatus: 'pending',
        createdAt: '2026-02-01T00:00:00Z',
        createdBy: { fullName: 'John Doe' },
        steps: [],
      },
    ]
    ;(approvalsApi.myPending as jest.Mock).mockResolvedValue(mockData)
    ;(approvalsApi.reject as jest.Mock).mockResolvedValue({})

    render(
      <ToastProvider>
        <ApprovalQueueList />
      </ToastProvider>
    )

    await waitFor(() => screen.getByText(/Equipment equip-1/i))

    // Click reject button
    const rejectButton = screen.getByTitle(/Reject/i)
    fireEvent.click(rejectButton)

    // Dialog should open
    expect(screen.getByText(/Reject Request/i)).toBeInTheDocument()

    // Submit should be disabled without comment
    const confirmButton = screen.getByText(/Confirm Rejection/i)
    expect(confirmButton).toBeDisabled()

    // Type comment
    const commentField = screen.getByLabelText(/Rejection Reason/i)
    fireEvent.change(commentField, { target: { value: 'Does not meet requirements' } })

    // Now should be enabled
    expect(confirmButton).not.toBeDisabled()

    // Click confirm
    fireEvent.click(confirmButton)

    await waitFor(() => {
      expect(approvalsApi.reject).toHaveBeenCalledWith('approval-123', 'Does not meet requirements')
      expect(mockShowSuccess).toHaveBeenCalledWith('Request rejected.')
    })
  })

  it('shows error state on API failure', async () => {
    ;(approvalsApi.myPending as jest.Mock).mockRejectedValue(new Error('API Error'))

    render(
      <ToastProvider>
        <ApprovalQueueList />
      </ToastProvider>
    )

    await waitFor(() => {
      expect(screen.getByText(/Failed to load approvals/i)).toBeInTheDocument()
      expect(mockShowError).toHaveBeenCalledWith('Failed to load approvals. Please try again.')
    })

    // Retry button should be present
    expect(screen.getByText(/Retry/i)).toBeInTheDocument()
  })

  it('searches by entity name and requester', async () => {
    const mockData = [
      {
        id: '1',
        entityType: 'equipment',
        entityId: 'drill-1',
        currentStatus: 'pending',
        createdAt: '2026-02-01T00:00:00Z',
        createdBy: { fullName: 'John Doe' },
        projectId: 'project-1',
        steps: [],
      },
      {
        id: '2',
        entityType: 'material',
        entityId: 'cement-1',
        currentStatus: 'pending',
        createdAt: '2026-02-01T00:00:00Z',
        createdBy: { fullName: 'Jane Smith' },
        projectId: 'project-1',
        steps: [],
      },
    ]
    ;(approvalsApi.myPending as jest.Mock).mockResolvedValue(mockData)

    render(
      <ToastProvider>
        <ApprovalQueueList />
      </ToastProvider>
    )

    await waitFor(() => screen.getByText(/Equipment drill-1/i))

    // Search by entity name
    const searchField = screen.getByPlaceholderText(/Search approvals/i)
    fireEvent.change(searchField, { target: { value: 'drill' } })

    // Should only show drill item
    expect(screen.getByText(/Equipment drill-1/i)).toBeInTheDocument()
    expect(screen.queryByText(/Material cement-1/i)).not.toBeInTheDocument()

    // Search by requester
    fireEvent.change(searchField, { target: { value: 'Jane' } })

    // Should only show Jane's item
    expect(screen.queryByText(/Equipment drill-1/i)).not.toBeInTheDocument()
    expect(screen.getByText(/Material cement-1/i)).toBeInTheDocument()
  })
})
```

**Minimum Coverage**: 80% for ApprovalQueueList.tsx

**Verification**:
```bash
cd frontend
npm test
# All tests should pass
# Coverage should be > 80%
```

---

### 2. Run Full Test Suite (CRITICAL - Verification Required)

**Problem**: Cannot verify that TypeScript compiles, tests run, and no regressions exist.

**Required Commands**:

```bash
cd frontend

# 1. TypeScript type check
npx tsc --noEmit
# Expected: No errors

# 2. Run unit tests
npm test
# Expected: All tests pass (including new tests)

# 3. Build check
npm run build
# Expected: Build succeeds with no errors

# 4. E2E tests (if backend is running)
npx playwright test
# Expected: All existing tests still pass (no regressions)
```

**Verification**: Document test results in git commit message

---

### 3. Browser Verification (Required Before Sign-off)

**Problem**: UI functionality has not been manually tested.

**Required Steps**:

1. **Start Services**:
   ```bash
   # Terminal 1: Backend
   cd backend
   uvicorn app.main:app --reload --port 8000

   # Terminal 2: Frontend
   cd frontend
   npm run dev
   ```

2. **Complete Verification Checklist**:

   **✓ Basic Functionality**:
   - [ ] Navigate to `http://localhost:3000/approval-queue`
   - [ ] Page loads without 404 or routing errors
   - [ ] Table renders with correct columns
   - [ ] No console errors in DevTools

   **✓ Filter Tabs**:
   - [ ] Click "Pending" tab - shows only pending approvals
   - [ ] Click "Approved" tab - shows only approved items
   - [ ] Click "Rejected" tab - shows only rejected items
   - [ ] Click "All" tab - shows all approvals
   - [ ] Badge counts are accurate

   **✓ Search**:
   - [ ] Type in search field
   - [ ] Results update in real-time
   - [ ] Search works for entity names
   - [ ] Search works for requester names

   **✓ Actions**:
   - [ ] Click "Approve" button on a pending item
   - [ ] Confirmation dialog opens
   - [ ] Dialog shows entity details
   - [ ] Click "Confirm Approval"
   - [ ] Success toast appears
   - [ ] Table refreshes automatically

   - [ ] Click "Reject" button on a pending item
   - [ ] Confirmation dialog opens
   - [ ] Submit button is disabled without comment
   - [ ] Type rejection reason
   - [ ] Submit button becomes enabled
   - [ ] Click "Confirm Rejection"
   - [ ] Success toast appears
   - [ ] Table refreshes automatically

   **✓ States**:
   - [ ] Loading skeleton shows during initial data fetch
   - [ ] Empty state displays when no data matches filters
   - [ ] Error state shows if API fails (test by stopping backend)
   - [ ] Retry button works in error state

   **✓ Responsive Layout**:
   - [ ] Resize browser to 1280px width - layout works
   - [ ] Resize browser to 1920px width - layout works
   - [ ] Table columns don't overlap
   - [ ] Action buttons remain accessible

   **✓ Console**:
   - [ ] Open DevTools console
   - [ ] No red errors
   - [ ] No warnings about missing keys or deprecated APIs
   - [ ] Network tab shows successful API calls

**Verification**: Take screenshots and document any issues found

---

## After Fixes

Once fixes are complete:

1. **Commit Changes**:
   ```bash
   git add frontend/src/components/ApprovalQueueList.test.tsx
   git commit -m "test: add unit tests for ApprovalQueueList component (qa-requested)

   - Add comprehensive unit tests for ApprovalQueueList
   - Test rendering, filtering, search, actions
   - Test loading, error, and empty states
   - Test API integration with mocked calls
   - Achieve >80% code coverage

   Addresses QA Session 1 Critical Issue #1"
   ```

2. **Run All Tests**:
   ```bash
   cd frontend
   npm test
   npm run build
   npx playwright test  # If e2e tests exist
   ```

3. **Document Results**:
   - Update `build-progress.txt` with test results
   - Note any failing tests or issues
   - Include test coverage percentage

4. **QA Will Automatically Re-run**:
   - QA agent will verify tests pass
   - QA agent will complete browser verification
   - QA agent will check for regressions
   - Loop continues until approved

---

## Summary

**Critical Issues**: 3
- Missing unit tests (BLOCKING)
- Cannot run test suite (BLOCKING - environment issue)
- Browser verification incomplete (BLOCKING)

**Code Quality**: Excellent ✓
- Security: Perfect
- Patterns: Perfect
- TypeScript: Perfect
- API Integration: Correct

**Estimated Fix Time**: 2-3 hours
- Write unit tests: 1.5-2 hours
- Run tests and fix issues: 0.5-1 hour
- Browser verification: 30 minutes

**Next Action**: Create unit tests, run full test suite, complete browser verification, then re-run QA.
