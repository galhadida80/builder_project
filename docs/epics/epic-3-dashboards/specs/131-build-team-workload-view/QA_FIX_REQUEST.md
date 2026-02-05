# QA Fix Request

**Status**: REJECTED
**Date**: 2026-02-02
**QA Session**: 1

---

## Critical Issues to Fix

### 1. Incorrect Color Coding Logic in Workload Calculation
**Problem**: The `getWorkloadColor` function in `frontend/src/utils/workloadCalculation.ts` uses the wrong threshold, causing incorrect color visualization throughout the application.

**Location**: `frontend/src/utils/workloadCalculation.ts` lines 97-105

**Current Code (WRONG)**:
```typescript
export const getWorkloadColor = (workloadPercent: number): WorkloadColor => {
  if (workloadPercent <= WORKLOAD_THRESHOLDS.OPTIMAL) { // 90% - WRONG!
    return 'success' // Green (under-utilized and optimal)
  }
  if (workloadPercent <= WORKLOAD_THRESHOLDS.HIGH) { // 100%
    return 'warning' // Orange (high)
  }
  return 'error' // Red (over-allocated)
}
```

**Required Fix**:
```typescript
export const getWorkloadColor = (workloadPercent: number): WorkloadColor => {
  if (workloadPercent <= WORKLOAD_THRESHOLDS.UNDER_UTILIZED) { // 60%
    return 'success' // Green (under-utilized)
  }
  if (workloadPercent <= WORKLOAD_THRESHOLDS.OPTIMAL) { // 90%
    return 'warning' // Yellow (optimal)
  }
  return 'error' // Red (high/over-allocated)
}
```

**Why This is Critical**:
- Users will see 0-90% as green (should be 0-60%)
- Users will see 91-100% as yellow (should be red/orange)
- Inconsistent with WorkloadBar and TeamCard components which have correct logic
- Misleads project managers about actual team capacity

**Verification**:
1. After fixing, run: `cd frontend && npm test -- workloadCalculation.test.ts`
2. Verify test with 70% workload returns 'warning' (not 'success')
3. Start app and check:
   - 50% workload → green ✓
   - 75% workload → yellow ✓
   - 95% workload → red ✓

---

### 2. Missing Vitest Test Dependencies
**Problem**: Test scripts exist in package.json but Vitest is not installed. The 932 unit tests and 317 E2E tests cannot be executed.

**Location**: `frontend/package.json`

**Required Fix**:
```bash
cd frontend
npm install --save-dev vitest@^1.0.0 @vitest/ui@^1.0.0 jsdom@^23.0.0 @testing-library/react@^14.0.0 @testing-library/jest-dom@^6.1.0
```

**Why This is Critical**:
- Tests cannot run without these dependencies
- Cannot verify the 932 unit tests pass
- Cannot validate workload calculation logic
- Blocks QA from verifying implementation correctness

**Verification**:
1. Install dependencies as shown above
2. Run: `cd frontend && npm test`
3. Verify all tests pass
4. If any tests fail, fix them
5. Commit both package.json and package-lock.json

---

### 3. Verify TypeScript Compilation
**Problem**: Cannot verify that TypeScript compiles without errors due to environment limitations.

**Location**: All TypeScript files

**Required Fix**:
```bash
cd frontend
npx tsc --noEmit
```

**Why This is Critical**:
- TypeScript errors will cause runtime failures
- Type safety is essential for maintainability
- Must verify no compilation errors before merge

**Verification**:
1. Run TypeScript compiler: `npx tsc --noEmit`
2. Fix any reported errors
3. Re-run until zero errors
4. Note: Pre-existing errors in RFIPage.tsx can be ignored if they don't affect this feature

---

## Major Issues to Fix (Recommended)

### 4. Remove Duplicate Color Coding Logic
**Problem**: Three different implementations of `getWorkloadColor` function across the codebase creates maintenance burden and inconsistency risk.

**Locations**:
- `frontend/src/utils/workloadCalculation.ts` - Utility function (has bug)
- `frontend/src/components/WorkloadBar.tsx` - Local function (correct)
- `frontend/src/components/TeamCard.tsx` - Local function (correct)

**Required Fix**:

**In WorkloadBar.tsx**:
```typescript
// Remove lines 25-32 (local getWorkloadColor function)

// Add import at top:
import { getWorkloadColor } from '../utils/workloadCalculation'

// Use imported function instead of local one (no changes needed, it's already used)
```

**In TeamCard.tsx**:
```typescript
// Remove lines 39-44 (local getWorkloadColor function)

// Add import at top:
import { getWorkloadColor } from '../utils/workloadCalculation'

// Use imported function instead of local one (no changes needed, it's already used)
```

**Benefits**:
- Single source of truth for color logic
- Easier to maintain (change logic in one place)
- Prevents future inconsistencies
- Better testability

**Verification**:
1. Remove duplicate functions
2. Add imports
3. Run: `npx tsc --noEmit` (should compile)
4. Run: `npm test` (all tests should pass)
5. Test in browser - colors should still display correctly

---

## Detailed Fix Instructions

### Step 1: Fix Color Coding Logic (5 minutes)

1. Open `frontend/src/utils/workloadCalculation.ts`
2. Navigate to line 98
3. Change:
   ```typescript
   if (workloadPercent <= WORKLOAD_THRESHOLDS.OPTIMAL) {
     return 'success' // Green (under-utilized and optimal)
   }
   ```
   To:
   ```typescript
   if (workloadPercent <= WORKLOAD_THRESHOLDS.UNDER_UTILIZED) {
     return 'success' // Green (under-utilized)
   }
   if (workloadPercent <= WORKLOAD_THRESHOLDS.OPTIMAL) {
     return 'warning' // Yellow (optimal)
   }
   ```
4. Save file

### Step 2: Install Test Dependencies (2 minutes)

```bash
cd frontend
npm install --save-dev vitest @vitest/ui jsdom @testing-library/react @testing-library/jest-dom
```

### Step 3: Verify Tests Pass (10 minutes)

```bash
cd frontend
npm test
```

**If tests fail**:
- Read error messages carefully
- Most likely failure: `getWorkloadColor` tests with 61-90% range
- Fix any test expectations that were based on the buggy logic
- Re-run until all tests pass

### Step 4: Verify TypeScript Compiles (2 minutes)

```bash
cd frontend
npx tsc --noEmit
```

**If errors occur**:
- Fix type errors in new code
- Ignore pre-existing errors in other files (not part of this feature)

### Step 5: (Optional) Refactor Duplicate Logic (10 minutes)

**WorkloadBar.tsx**:
```typescript
// Line 1: Add import
import { getWorkloadColor } from '../utils/workloadCalculation'

// Lines 25-32: Remove this function
function getWorkloadColor(percent: number): 'success' | 'warning' | 'error' {
  // Delete this entire function
}
```

**TeamCard.tsx**:
```typescript
// Line 1: Add import (after existing imports)
import { getWorkloadColor } from '../utils/workloadCalculation'

// Lines 39-44: Remove this function
function getWorkloadColor(percent: number): 'success' | 'warning' | 'error' | 'default' {
  // Delete this entire function
}
```

Then verify:
```bash
npx tsc --noEmit  # Should compile
npm test           # Should pass
```

### Step 6: Test in Browser (15 minutes)

1. Start services:
   ```bash
   chmod +x init.sh && ./init.sh
   ```

2. Open browser: `http://localhost:3000/team-workload`

3. Verify color coding:
   - Team members with 0-60% workload show **green**
   - Team members with 61-90% workload show **yellow**
   - Team members with 91%+ workload show **red**

4. Check browser console for errors (should be zero)

5. Test responsive design:
   - Desktop (1920px) - All elements visible
   - Tablet (768px) - 2-column layout
   - Mobile (375px) - Single column layout

### Step 7: Commit Fixes

```bash
git add -A
git commit -m "fix: correct workload color coding logic and install test dependencies (qa-requested)

- Fix getWorkloadColor to use 60% threshold for green (was 90%)
- Add missing condition for 61-90% optimal range (yellow)
- Install Vitest and testing dependencies
- Verify all 62 unit tests pass
- Verify TypeScript compilation succeeds
- Refactor components to use utility function (removes code duplication)

Fixes QA critical issues #1, #2, #3 and major issue #4
Tested: Colors display correctly, all tests pass, no console errors"
```

---

## After Fixes

Once fixes are complete and committed:

1. **Self-verify**:
   - Run `npm test` - all tests pass ✓
   - Run `npx tsc --noEmit` - no errors ✓
   - Start app - loads without console errors ✓
   - Colors display correctly (green 0-60%, yellow 61-90%, red 91%+) ✓

2. **QA will automatically re-run** and verify:
   - Critical bugs fixed
   - Tests pass
   - TypeScript compiles
   - Browser verification
   - Responsive design
   - No regressions

3. **Expected outcome**: QA APPROVED ✓

---

## Estimated Time to Fix

- **Critical Issues (must fix)**: 20 minutes
  - Fix #1: 5 minutes
  - Fix #2: 2 minutes
  - Fix #3: 2 minutes
  - Testing: 10 minutes
  - Commit: 1 minute

- **Major Issue (recommended)**: +10 minutes
  - Fix #4: 10 minutes

**Total**: 20-30 minutes

---

## Questions?

If any part of these instructions is unclear:

1. Read the full QA report: `qa_report.md`
2. Check the original spec: `spec.md`
3. Review the implementation plan: `implementation_plan.json`

The fixes are straightforward and well-defined. All critical issues can be resolved quickly.

---

**QA Agent**: Automated Review System
**Report Generated**: 2026-02-02
**Priority**: HIGH - Blocks production deployment
