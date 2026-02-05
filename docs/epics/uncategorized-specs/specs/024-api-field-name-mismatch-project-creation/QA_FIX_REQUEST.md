# QA Fix Request

**Status**: REJECTED ❌
**Date**: 2026-01-29T17:30:00Z
**QA Session**: 1

---

## Summary

The implementation is **incomplete**. While 2 field names were fixed correctly, there are **3 critical issues** that must be addressed:

1. ❌ Missing field name fix: `startDate` → `start_date`
2. ❌ TypeScript `ProjectCreate` interface not updated
3. ❌ TypeScript `ProjectUpdate` interface not updated

---

## Critical Issues to Fix

### 1. Complete Field Name Fix in ProjectsPage.tsx

**Problem**: The frontend still sends `startDate` (camelCase) but the backend expects `start_date` (snake_case).

**Location**: `frontend/src/pages/ProjectsPage.tsx:76`

**Current Code**:
```typescript
await projectsApi.create({
  name: formData.name,
  code: formData.code,
  description: formData.description || undefined,
  address: formData.address || undefined,
  startDate: formData.startDate || undefined,  // ❌ WRONG
  estimated_end_date: formData.estimatedEndDate || undefined
})
```

**Required Fix**:
```typescript
await projectsApi.create({
  name: formData.name,
  code: formData.code,
  description: formData.description || undefined,
  address: formData.address || undefined,
  start_date: formData.startDate || undefined,  // ✅ FIXED
  estimated_end_date: formData.estimatedEndDate || undefined
})
```

**Change**: Line 76 - Replace `startDate:` with `start_date:`

**Verification**: Create a project with a start date and verify it's saved correctly.

---

### 2. Update ProjectCreate Interface

**Problem**: TypeScript interface has old field names, creating type mismatches.

**Location**: `frontend/src/api/projects.ts:4-11`

**Current Code**:
```typescript
interface ProjectCreate {
  name: string
  code: string
  description?: string
  location?: string        // ❌ WRONG
  startDate?: string       // ❌ WRONG
  expectedEndDate?: string // ❌ WRONG
}
```

**Required Fix**:
```typescript
interface ProjectCreate {
  name: string
  code: string
  description?: string
  address?: string         // ✅ FIXED
  start_date?: string      // ✅ FIXED
  estimated_end_date?: string // ✅ FIXED
}
```

**Changes**: Lines 8-10 - Update all three field names to match backend contract

**Verification**: TypeScript compilation should succeed without type errors.

---

### 3. Update ProjectUpdate Interface

**Problem**: Same as Issue #2, but for the update interface.

**Location**: `frontend/src/api/projects.ts:13-20`

**Current Code**:
```typescript
interface ProjectUpdate {
  name?: string
  description?: string
  location?: string        // ❌ WRONG
  status?: string
  startDate?: string       // ❌ WRONG
  expectedEndDate?: string // ❌ WRONG
}
```

**Required Fix**:
```typescript
interface ProjectUpdate {
  name?: string
  description?: string
  address?: string         // ✅ FIXED
  status?: string
  start_date?: string      // ✅ FIXED
  estimated_end_date?: string // ✅ FIXED
}
```

**Changes**: Lines 16, 18-19 - Update all three field names to match backend contract

**Verification**: TypeScript compilation should succeed without type errors.

---

## Implementation Steps

1. **Fix ProjectsPage.tsx** (1 line change)
   - Open `frontend/src/pages/ProjectsPage.tsx`
   - Line 76: Change `startDate:` to `start_date:`
   - Save file

2. **Fix projects.ts interfaces** (2 interface updates)
   - Open `frontend/src/api/projects.ts`
   - Update `ProjectCreate` interface (lines 8-10):
     - `location` → `address`
     - `startDate` → `start_date`
     - `expectedEndDate` → `estimated_end_date`
   - Update `ProjectUpdate` interface (lines 16, 18-19):
     - `location` → `address`
     - `startDate` → `start_date`
     - `expectedEndDate` → `estimated_end_date`
   - Save file

3. **Verify the fix**
   - If possible, run `npm run build` in frontend directory
   - Check for TypeScript compilation errors
   - Manually test project creation if dev server is available

4. **Commit the changes**
   ```bash
   git add frontend/src/pages/ProjectsPage.tsx frontend/src/api/projects.ts
   git commit -m "fix: complete field name corrections and update TypeScript interfaces (qa-requested)"
   ```

---

## Why These Fixes Are Required

### Backend API Contract

The backend (`backend/app/schemas/project.py`) uses **snake_case** for all field names:

```python
class ProjectCreate(BaseModel):
    name: str
    code: str
    description: str | None
    address: str | None              # snake_case
    start_date: date | None          # snake_case
    estimated_end_date: date | None  # snake_case
```

### No Automatic Conversion

The backend does NOT have automatic camelCase to snake_case conversion:
- ❌ No `alias_generator` in Pydantic schemas
- ❌ No field aliases configured
- ❌ No middleware for field name conversion

Therefore, the frontend MUST send field names in **snake_case** to match the backend contract.

### Type Safety

TypeScript interfaces must match the actual API contract to:
- ✅ Catch errors at compile time
- ✅ Provide accurate autocomplete
- ✅ Prevent future bugs
- ✅ Document the API contract

---

## After Fixes

Once you've completed all 3 fixes and committed:

1. QA will automatically re-run validation
2. QA will verify TypeScript compilation passes (if possible)
3. QA will verify all field names match backend contract
4. If all checks pass, QA will approve the implementation

---

## Questions?

If you encounter any issues implementing these fixes, please document them in the commit message or build-progress.txt.

**Good luck! 🚀**
