# QA Fix Request

**Status**: REJECTED ✗
**Date**: 2026-02-01
**QA Session**: 1
**Branch**: auto-claude/043-build-offline-mode-interface

---

## Critical Issues to Fix

### 1. TypeScript Type Error in useNetworkStatus Hook ❌ BLOCKING

**Problem**: The hook uses `NodeJS.Timeout` type which is not available in browser-only TypeScript projects. This will cause TypeScript compilation to fail.

**Location**: `frontend/src/hooks/useNetworkStatus.ts:7`

**Current Code**:
```typescript
let timeoutId: NodeJS.Timeout | null = null
```

**Required Fix**:
Replace line 7 with browser-compatible type:

**Option 1** (Recommended - most compatible):
```typescript
let timeoutId: ReturnType<typeof setTimeout> | null = null
```

**Option 2** (Simpler - also correct):
```typescript
let timeoutId: number | null = null
```

**Why This is Critical**:
- The project does NOT have `@types/node` in devDependencies
- TypeScript config is browser-only: `lib: ["ES2020", "DOM", "DOM.Iterable"]`
- Build command `npm run build` will fail with error: `Cannot find name 'NodeJS'`
- This blocks deployment and violates the "Build succeeds with no TypeScript errors" acceptance criteria

**Verification**:
After fix, run:
```bash
cd frontend && npm run build
```
Expected outcome: Build succeeds with no TypeScript errors

**Estimated Time**: 2 minutes

---

## Major Issues (Strongly Recommended)

### 2. Missing Unit Tests ⚠️

**Problem**: Spec explicitly requires unit tests for all new components in QA Acceptance Criteria, but no test files were created.

**Required Files**:
- `frontend/src/hooks/useNetworkStatus.test.tsx`
- `frontend/src/contexts/NetworkContext.test.tsx`
- `frontend/src/components/common/OfflineBanner.test.tsx`
- `frontend/src/components/common/SyncStatus.test.tsx`

**What to Test**:

**useNetworkStatus.test.tsx**:
- Hook returns correct online/offline status
- Event listeners are properly cleaned up on unmount
- Debouncing works (rapid toggles don't cause flicker)
- Initial state from navigator.onLine is correct

**NetworkContext.test.tsx**:
- Context provides correct default values
- Throws error when useNetwork called outside provider
- updateSyncStatus function updates state correctly
- isOnline value updates when network status changes

**OfflineBanner.test.tsx**:
- Banner renders when isOnline is false
- Banner does not render when isOnline is true
- Slide animation triggers on state change
- Shows correct warning message

**SyncStatus.test.tsx**:
- Displays correct label for each status (idle, syncing, synced, error)
- Shows correct icon for each status
- Uses correct color for each status
- Respects size prop (small/medium)

**Verification**:
```bash
cd frontend && npm test
```
Expected: All tests pass with >80% coverage for new code

**Estimated Time**: 2-4 hours

---

### 3. Design Reference File Missing ⚠️

**Problem**: Spec references `30-offline-mode.png` for design compliance verification, but file is not found in the project.

**Required Action**:
- Locate the design file `30-offline-mode.png`
- Add it to the project repository (suggested location: `docs/designs/` or `.auto-claude/specs/043-build-offline-mode-interface/`)
- OR document that no design file exists and implementation follows MUI defaults

**Verification**:
Visual comparison of implemented UI against design specifications

**Estimated Time**: 15 minutes (if file exists)

---

## Fix Instructions

### Step 1: Fix TypeScript Error (CRITICAL)

1. Open `frontend/src/hooks/useNetworkStatus.ts`
2. Change line 7 from:
   ```typescript
   let timeoutId: NodeJS.Timeout | null = null
   ```
   to:
   ```typescript
   let timeoutId: ReturnType<typeof setTimeout> | null = null
   ```
3. Save the file

### Step 2: Verify TypeScript Fix

If npm/node is available:
```bash
cd frontend
npm run build
```

Expected output: Build succeeds with no errors

### Step 3: Create Unit Tests (Recommended)

Create the following test files using React Testing Library or similar:

**frontend/src/hooks/useNetworkStatus.test.tsx**:
```typescript
import { renderHook, act } from '@testing-library/react'
import { useNetworkStatus } from './useNetworkStatus'

describe('useNetworkStatus', () => {
  it('returns initial online status', () => {
    const { result } = renderHook(() => useNetworkStatus())
    expect(result.current).toBe(navigator.onLine)
  })

  it('updates status when going offline', async () => {
    const { result } = renderHook(() => useNetworkStatus())

    act(() => {
      window.dispatchEvent(new Event('offline'))
    })

    // Wait for debounce
    await new Promise(resolve => setTimeout(resolve, 600))

    expect(result.current).toBe(false)
  })

  it('updates status when going online', async () => {
    const { result } = renderHook(() => useNetworkStatus())

    act(() => {
      window.dispatchEvent(new Event('online'))
    })

    // Wait for debounce
    await new Promise(resolve => setTimeout(resolve, 600))

    expect(result.current).toBe(true)
  })

  // Add more tests for debouncing, cleanup, etc.
})
```

Create similar test files for the other components.

### Step 4: Commit Fixes

```bash
git add frontend/src/hooks/useNetworkStatus.ts
git commit -m "fix: correct TypeScript types in useNetworkStatus hook (qa-requested)"

# If tests were added:
git add frontend/src/**/*.test.tsx
git commit -m "test: add unit tests for offline mode components (qa-requested)"
```

### Step 5: Update QA Status

After committing fixes:
1. QA Agent will automatically re-run
2. Verification will check that:
   - TypeScript compilation succeeds
   - Tests pass (if created)
   - No regressions introduced

---

## After Fixes

Once you've made the changes:

1. ✅ **Commit with "fix: [description] (qa-requested)"** message
2. ✅ **QA will automatically re-run**
3. ✅ **Loop continues until approved**

**DO NOT**:
- Skip the TypeScript fix (it's blocking)
- Commit untested code
- Make unrelated changes

**Timeline**:
- Critical fix: 5 minutes
- Unit tests: 2-4 hours (optional but recommended)
- Total estimated time: 5 minutes - 4 hours depending on scope

---

## QA Will Verify (After Fixes)

When QA re-runs, it will check:

### Critical Verification
- ✓ TypeScript compilation succeeds (`npm run build`)
- ✓ No `NodeJS.Timeout` references in browser code
- ✓ Build produces no errors or warnings

### Recommended Verification (if tests added)
- ✓ All unit tests pass
- ✓ Test coverage >80% for new code
- ✓ Tests cover edge cases (debouncing, cleanup, etc.)

### Manual Verification (if dev environment available)
- ✓ Banner appears when going offline
- ✓ Banner disappears when going online
- ✓ Sync status updates correctly
- ✓ No console errors
- ✓ Debouncing prevents flicker

---

## Questions?

If you have questions about these fixes:
1. Check the full QA report in `qa_report.md`
2. Review the spec requirements in `spec.md`
3. Compare patterns with existing code (ThemeContext.tsx, ToastProvider.tsx)

---

**Priority**: 🔴 CRITICAL
**Blocking**: TypeScript compilation
**Estimated Fix Time**: 5 minutes (critical only) to 4 hours (with tests)
**Re-test**: Automatic after commit
