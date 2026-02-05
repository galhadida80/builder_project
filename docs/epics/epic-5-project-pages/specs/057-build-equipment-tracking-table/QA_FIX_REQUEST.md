# QA Fix Request

**Status**: REJECTED
**Date**: 2026-02-05T00:45:00Z
**QA Session**: 1

---

## Critical Issues to Fix

### 1. Error State Not Propagated to Equipment Table

**Problem**: The equipment page catches API errors but doesn't maintain error state to pass to the EquipmentTable component. The table has error handling capability (LoadingError component and onRetry prop) but these features are not being utilized.

**Location**: `src/pages/projects/[projectId]/equipment.tsx:14-37`

**Current Issue**:
```typescript
// Missing error state variable
const [loading, setLoading] = useState(true)
const [equipment, setEquipment] = useState<Equipment[]>([])
// ❌ No error state!

const loadEquipment = async () => {
  try {
    setLoading(true)
    const data = await equipmentApi.list(projectId)
    setEquipment(data)
  } catch (error) {
    showError('Failed to load equipment. Please try again.')
    // ❌ Error only shown in toast, not in table UI
  } finally {
    setLoading(false)
  }
}

// ❌ Missing error and onRetry props
<EquipmentTable
  equipment={equipment}
  loading={loading}
  onRowClick={handleRowClick}
/>
```

**Required Fix**:
```typescript
// ✅ Add error state
const [loading, setLoading] = useState(true)
const [equipment, setEquipment] = useState<Equipment[]>([])
const [error, setError] = useState<string | null>(null)  // ← ADD THIS

const loadEquipment = async () => {
  if (!projectId) {
    setLoading(false)
    return
  }

  try {
    setLoading(true)
    setError(null)  // ← ADD: Clear previous errors
    const data = await equipmentApi.list(projectId)
    setEquipment(data)
  } catch (error) {
    const errorMsg = 'Failed to load equipment. Please try again.'
    setError(errorMsg)  // ← ADD: Set error state
    showError(errorMsg)
  } finally {
    setLoading(false)
  }
}

// ✅ Pass error and onRetry to table
<EquipmentTable
  equipment={equipment}
  loading={loading}
  error={error}              // ← ADD THIS
  onRetry={loadEquipment}    // ← ADD THIS
  onRowClick={handleRowClick}
/>
```

**Verification Steps**:
1. Navigate to equipment page
2. Simulate API error (disconnect network or use invalid project ID)
3. Verify error message displays in the table (not just toast notification)
4. Verify "Retry" button appears in error state
5. Click retry button
6. Verify error clears and data loads successfully
7. Verify toast notification still appears for user feedback

---

## Minor Issues to Fix (Optional but Recommended)

### 2. useEffect Missing Dependency Warning

**Problem**: React Hook useEffect has missing dependency 'loadEquipment' which will trigger React warnings.

**Location**: `src/pages/projects/[projectId]/equipment.tsx:18-20`

**Current Issue**:
```typescript
useEffect(() => {
  loadEquipment()
}, [projectId])  // ❌ Missing loadEquipment dependency
```

**Required Fix**:
```typescript
// ✅ Wrap loadEquipment in useCallback
const loadEquipment = useCallback(async () => {
  if (!projectId) {
    setLoading(false)
    return
  }

  try {
    setLoading(true)
    setError(null)
    const data = await equipmentApi.list(projectId)
    setEquipment(data)
  } catch (error) {
    const errorMsg = 'Failed to load equipment. Please try again.'
    setError(errorMsg)
    showError(errorMsg)
  } finally {
    setLoading(false)
  }
}, [projectId, showError])  // ← Dependencies

// ✅ Add loadEquipment to useEffect dependencies
useEffect(() => {
  loadEquipment()
}, [loadEquipment])  // ← Updated dependency
```

**Add Import**:
```typescript
import { useState, useEffect, useCallback } from 'react'  // ← Add useCallback
```

**Verification Steps**:
1. Open browser console
2. Navigate to equipment page
3. Verify no React warnings about missing dependencies
4. Verify equipment loads correctly on mount
5. Change projectId (navigate to different project)
6. Verify equipment reloads with new project data

---

## After Fixes

Once you've implemented both fixes:

1. **Test locally**:
   - Start frontend dev server: `npm run dev`
   - Navigate to equipment page
   - Test error state and retry functionality
   - Check console for any warnings
   - Verify sorting, pagination, and status badges still work

2. **Commit changes**:
   ```bash
   git add src/pages/projects/[projectId]/equipment.tsx
   git commit -m "fix: add error state propagation to equipment table (qa-requested)"
   ```

3. **QA will automatically re-run** and verify:
   - Error state is properly displayed
   - Retry button works
   - No React warnings
   - All original functionality still works
   - Code follows patterns

---

## Summary

**Files to Modify**: 1
- `src/pages/projects/[projectId]/equipment.tsx`

**Changes Required**:
- Add error state variable (1 line)
- Set/clear error state in loadEquipment (2 lines)
- Pass error and onRetry props to EquipmentTable (2 props)
- Wrap loadEquipment in useCallback (function wrapper + import)
- Update useEffect dependency array (1 line)

**Estimated Time**: 10-15 minutes

**Risk Level**: Low - Simple state management change, no logic modifications

---

## Questions?

If you have any questions about these fixes, refer to:
- Full QA report: `qa_report.md`
- EquipmentTable component: `src/components/equipment/EquipmentTable.tsx` (lines 11-13 show error/onRetry props)
- Error handling pattern examples in codebase (see other pages that use DataTable with error states)
