# QA Fix Request - Session 2

**Status**: REJECTED
**Date**: 2026-01-29 02:15 AM
**QA Session**: 2
**Spec**: 022-hardcoded-documents-list-in-equipment-drawer
**Previous Session**: Session 1 fixes partially applied

---

## Critical Issue to Fix

### 1. Export FileRecord Type from files.ts

**Problem**: The `FileRecord` interface is not exported from `src/api/files.ts`, but is being imported in `EquipmentPage.tsx`. This causes a TypeScript compilation error.

**Location**: `frontend/src/api/files.ts:3`

**Current Code**:
```typescript
interface FileRecord {  // ❌ NOT EXPORTED
  id: string
  projectId: string
  entityType: string
  entityId: string
  filename: string
  fileType: string
  fileSize: number
  storagePath: string
  uploadedAt: string
  uploadedById?: string
}
```

**Import That Fails** (EquipmentPage.tsx:42):
```typescript
import type { FileRecord } from '../api/files'  // ❌ FAILS - FileRecord not exported
```

**TypeScript Error**:
```
error TS2305: Module '"../api/files"' has no exported member 'FileRecord'.
```

**Required Fix**:
```typescript
// frontend/src/api/files.ts line 3
// Change from:
interface FileRecord {

// To:
export interface FileRecord {  // ✅ Add 'export' keyword
```

**Verification**:
1. Add `export` keyword to FileRecord interface (line 3)
2. Verify TypeScript compilation:
   ```bash
   cd frontend
   npx tsc --noEmit
   ```
   Expected: No TS2305 error about FileRecord
3. Verify build succeeds:
   ```bash
   npm run build
   ```
   Expected: Build completes without errors

**Why This Happened**:
In QA Session 1, you correctly changed the import from `FileAttachment` to `FileRecord` in EquipmentPage.tsx, but you forgot to export the `FileRecord` type from `files.ts`. With `isolatedModules: true` in tsconfig.json, TypeScript requires explicit exports for all imported types.

---

## Complete File Changes Required

### File: `frontend/src/api/files.ts`

**Line 3** - Add export keyword:

```typescript
// Change from:
interface FileRecord {

// To:
export interface FileRecord {
```

**That's it!** Just add the word `export` before `interface` on line 3.

---

## Testing Instructions

After making the fix:

### 1. TypeScript Compilation Check
```bash
cd frontend
npx tsc --noEmit
```
**Expected**: No errors related to FileRecord import

### 2. Production Build
```bash
cd frontend
npm run build
```
**Expected**: Build succeeds without TypeScript errors

### 3. Dev Server Still Works
```bash
# Server should already be running, but verify it reloads without errors
# Check terminal for any TypeScript errors
```

### 4. Git Commit
```bash
git add frontend/src/api/files.ts
git commit -m "fix: export FileRecord type from files.ts (qa-requested)

- Add export keyword to FileRecord interface
- Fixes TypeScript compilation error TS2305
- Enables proper type checking for file data structures
- Required for EquipmentPage.tsx FileRecord import

Resolves QA Session 2 critical issue

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## What Was Good in Your Previous Fix

From QA Session 1, you successfully fixed:

✅ **Issue #2**: formatFileSize utility imported and used correctly
✅ **Issue #3**: File sizes now use dynamic units (Bytes, KB, MB, GB, TB)
✅ **Most of Issue #1**: Changed type to FileRecord (just missed the export)

**Great job on**:
- Importing formatFileSize utility
- Using formatFileSize in the rendering code
- Removing hardcoded "MB"
- Removing optional chaining (since FileRecord has required properties)
- Following code patterns correctly

**Just one oversight**: Forgot to export the type when changing from FileAttachment to FileRecord.

---

## Expected Outcome

After this fix:
- ✅ TypeScript compilation succeeds
- ✅ Production build succeeds
- ✅ IDE type errors resolved
- ✅ Type safety fully enforced
- ✅ FileRecord properly exported for reuse elsewhere
- ✅ All QA Session 1 fixes complete

---

## After Fix

Once the fix is committed:
1. QA will automatically re-run (Session 3)
2. QA will verify:
   - TypeScript compilation succeeds
   - FileRecord is properly exported
   - All previous fixes still intact
   - No new issues introduced
3. Manual browser testing can proceed

---

## Questions?

If you need clarification:
- The FileRecord interface is in `frontend/src/api/files.ts` at line 3
- Just add the word `export` before `interface`
- This is a one-word change
- TypeScript requires exports for type imports when isolatedModules is enabled

---

**QA Status**: REJECTED - Type Export Missing
**Next Action**: Add export keyword to FileRecord interface
**Auto Re-run**: QA Session 3 will run after commit
**ETA**: 2 minutes
