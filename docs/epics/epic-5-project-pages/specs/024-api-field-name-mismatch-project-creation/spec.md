# Quick Spec: API Field Name Mismatch - Project Creation

## Overview
Fix API field name mismatch in project creation endpoint where frontend sends incorrect field names to backend API. This is a simple bug fix targeting two field names in the project creation API call.

## Workflow Type
simple

## Task Scope
**Single file change**: `frontend/src/pages/ProjectsPage.tsx` (lines 68-70)

**Mismatches to fix:**
- Frontend sends `location` → Backend expects `address`
- Frontend sends `expectedEndDate` → Backend expects `estimated_end_date`

**Impact**: Bug fix only, no business logic changes, no new features.

## Success Criteria
- [ ] Project creation API call succeeds without field name errors
- [ ] New projects persist with correct address and estimated_end_date values
- [ ] No TypeScript compilation errors
- [ ] Manual verification: Create a project via UI and confirm fields are saved correctly

## Task
Fix API field name mismatch in project creation endpoint.

## Problem
Frontend sends incorrect field names to backend API:
- Sends `location` → Backend expects `address`
- Sends `expectedEndDate` → Backend expects `estimated_end_date`

## Files to Modify
- `frontend/src/pages/ProjectsPage.tsx` (lines 68-70) - Update API call field names

## Change Details
Update the API request object to match backend expectations:

**Current (broken):**
```typescript
location: formData.address,
expectedEndDate: formData.estimatedEndDate
```

**Fixed:**
```typescript
address: formData.address,
estimated_end_date: formData.estimatedEndDate
```

## Verification
- [ ] Project creation API call succeeds without errors
- [ ] New projects are created with correct address and end date
- [ ] No TypeScript errors
- [ ] Manual test: Create a project and verify fields are saved correctly

## Notes
- Data source (`formData.address` and `formData.estimatedEndDate`) remains unchanged
- Only updating the API field names to match backend contract
- Backend uses snake_case convention (`estimated_end_date`)
