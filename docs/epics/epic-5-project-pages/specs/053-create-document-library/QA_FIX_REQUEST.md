# QA Fix Request - Session 2

**Status**: REJECTED
**Date**: 2026-02-02
**QA Session**: 2
**Spec**: 053-create-document-library

---

## Previous Session Status

**QA Session 1**: REJECTED with 4 issues
**Fix Commit**: 280fa49
**Session 1 Fixes**: ✅ ALL VERIFIED

All 4 issues from QA Session 1 were successfully fixed:
1. ✅ Duplicate Toast Notifications - FIXED
2. ✅ Missing Unit Tests - FIXED  
3. ✅ Folder Deletion Check - FIXED
4. ✅ FilePreview Memory Leak - FIXED

However, a new critical bug was introduced during the fix implementation.

---

## Critical Issue to Fix

### 1. Add Missing loadPreview Function

**Problem**: The FilePreview component references a `loadPreview` function on line 206 that doesn't exist. This will cause a **ReferenceError** at runtime when users click the "Try Again" button after a preview fails to load.

**Location**: `frontend/src/components/documents/FilePreview.tsx:206`

**Root Cause**: During QA Session 1 fixes, the original `loadPreview` function was removed and replaced with an inline `load()` function inside the useEffect (line 89). However, the error handling code that still references `loadPreview` was not updated.

**Current Code** (Line 195-210):
```typescript
{error && (
  <EmptyState
    variant="error"
    title="Failed to load preview"
    description="Unable to load the file preview. Please try downloading the file."
    action={{
      label: 'Download File',
      onClick: handleDownload,
    }}
    secondaryAction={{
      label: 'Try Again',
      onClick: loadPreview,  // ❌ ReferenceError: loadPreview is not defined!
    }}
  />
)}
```

**Required Fix**:

Add the `loadPreview` function after the `handleDownload` function (around line 137):

```typescript
// File: frontend/src/components/documents/FilePreview.tsx
// Add after the handleDownload function (line ~137)

const loadPreview = () => {
  if (!file) return

  setError(false)
  setLoading(true)

  filesApi.getDownloadUrl(projectId, file.id)
    .then(url => {
      setPreviewUrl(url)
      setError(false)
    })
    .catch(() => {
      setError(true)
    })
    .finally(() => {
      setLoading(false)
    })
}
```

**Verification Steps**:
1. Start frontend dev server: `cd frontend && npm run dev`
2. Navigate to `/projects/:projectId/documents`
3. Simulate preview failure:
   - Disconnect network OR
   - Modify filesApi.getDownloadUrl to throw error OR
   - Use browser DevTools to block network request
4. Click on a file to trigger preview
5. Error state should appear with "Try Again" button
6. Click "Try Again" button
7. **Expected**: Preview attempts to reload without console errors
8. **Without fix**: Console error: "ReferenceError: loadPreview is not defined"

---

## Implementation Details

**Function Placement**: Add after line 136 (after the `handleDownload` function closes)

**Function Purpose**:
- Clears error state
- Sets loading state
- Attempts to fetch preview URL again
- Handles success/failure states
- Provides user with retry capability

**Why This Fix**:
- Matches user expectation when clicking "Try Again"
- Follows existing error handling patterns in the codebase
- Provides better UX than crashing with error
- Simple, focused solution

---

## After Fix

Once the fix is applied:

1. **Build Check**:
```bash
cd frontend
npm run build
```
Should complete without TypeScript errors.

2. **Test the Fix** (if dev server available):
   - Follow verification steps above
   - Ensure no console errors
   - Verify retry works correctly

3. **Commit the Fix**:
```bash
git add frontend/src/components/documents/FilePreview.tsx
git commit -m "fix: add missing loadPreview function in FilePreview component (qa-requested)"
```

4. **QA Will Re-Run**: QA Session 3 will automatically validate the fix

---

## Expected Outcome

After applying this fix:
- ✅ No runtime errors when clicking "Try Again"
- ✅ Preview retry functionality works correctly
- ✅ Error state properly clears on successful retry
- ✅ No console errors
- ✅ Ready for QA approval

---

**Status**: AWAITING FIX
**Next QA Session**: 3 (will run after commit with "(qa-requested)" message)
**Estimated Fix Time**: 2 minutes
