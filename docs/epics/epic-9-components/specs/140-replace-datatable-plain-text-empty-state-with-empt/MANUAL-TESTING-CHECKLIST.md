# Manual Browser Testing Checklist

**Task**: Verify backward compatibility of DataTable EmptyState changes
**Date**: 2026-02-05

## Prerequisites

1. ✅ Dev server running on http://localhost:3000
2. ✅ Backend services running (if needed for data)
3. ✅ Have a test project with ID accessible

## Testing Instructions

### How to Test Empty States

For each page, you need to ensure the DataTable has **no data**:
- Create a fresh project with no equipment/materials/RFIs/inspections
- OR use filters/search to result in 0 items
- OR temporarily clear data in the database

---

## Page 1: Equipment Page ✅

**URL**: `http://localhost:3000/projects/:projectId/equipment`

**Steps**:
1. Navigate to a project with no equipment items
2. Verify the empty state appears

**Expected Result**:
- ✅ EmptyState component renders (not plain text)
- ✅ InboxIcon displayed in a circular container
- ✅ Title shows: "No data available"
- ✅ Description shows: "No equipment found"
- ✅ No console errors
- ✅ Styling matches the EmptyState design system

**Screenshot**: (Take a screenshot for documentation)

**Status**: [ ] PASS / [ ] FAIL

**Notes**:
_____________________________________________________

---

## Page 2: Materials Page ✅

**URL**: `http://localhost:3000/projects/:projectId/materials`

**Steps**:
1. Navigate to a project with no materials
2. Verify the empty state appears

**Expected Result**:
- ✅ EmptyState component renders (external, not from DataTable)
- ✅ SearchOffIcon displayed (no-results variant)
- ✅ Title shows: "No materials found"
- ✅ Description shows: "Try adjusting your search or add a new material"
- ✅ "Add Material" button visible
- ✅ No console errors
- ✅ No visual regression from before

**Notes**:
This page uses an EXTERNAL EmptyState (not the DataTable's internal one).
The DataTable's emptyMessage should never be visible because of the
conditional check on line 361.

**Status**: [ ] PASS / [ ] FAIL

**Notes**:
_____________________________________________________

---

## Page 3: RFI Page ✅

**URL**: `http://localhost:3000/projects/:projectId/rfi`

**Steps**:
1. Navigate to a project with no RFIs
2. Verify the empty state appears

**Expected Result**:
- ✅ EmptyState component renders (not plain text)
- ✅ InboxIcon displayed in a circular container
- ✅ Title shows: "No data available"
- ✅ Description shows: "No RFIs found"
- ✅ No console errors
- ✅ Styling matches the EmptyState design system

**Status**: [ ] PASS / [ ] FAIL

**Notes**:
_____________________________________________________

---

## Page 4: Inspections Page ✅

**URL**: `http://localhost:3000/projects/:projectId/inspections`

**Important**: This page has **TWO** DataTable instances to test!

### DataTable 1: Inspection Stages

**Steps**:
1. Ensure project has no inspection stages defined
2. Check the stages DataTable at the top

**Expected Result**:
- ✅ EmptyState component renders
- ✅ InboxIcon displayed
- ✅ Title shows: "No data available"
- ✅ Description shows: "No stages defined"
- ✅ No console errors

**Status**: [ ] PASS / [ ] FAIL

### DataTable 2: Inspections List

**Steps**:
1. Ensure project has no inspections
2. Check the inspections DataTable below stages

**Expected Result**:
- ✅ EmptyState component renders
- ✅ InboxIcon displayed
- ✅ Title shows: "No data available"
- ✅ Description shows: "No inspections found"
- ✅ No console errors

**Status**: [ ] PASS / [ ] FAIL

**Notes**:
_____________________________________________________

---

## Page 5: Audit Log Page ✅

**URL**: `http://localhost:3000/projects/:projectId/audit`

**Steps**:
1. Navigate to a project with no audit log entries
2. Verify the empty state appears

**Expected Result**:
- ✅ EmptyState component renders (not plain text)
- ✅ InboxIcon displayed in a circular container
- ✅ Title shows: "No data available"
- ✅ Description shows: "No audit logs found"
- ✅ No console errors
- ✅ Styling matches the EmptyState design system

**Status**: [ ] PASS / [ ] FAIL

**Notes**:
_____________________________________________________

---

## Visual Regression Checks

For **ALL** pages above:

1. **Layout**:
   - [ ] EmptyState is centered in the table container
   - [ ] Padding/spacing looks correct
   - [ ] Icon size is appropriate (80x80px circle)

2. **Typography**:
   - [ ] Title is bold and prominent
   - [ ] Description text is smaller and gray
   - [ ] Text is centered

3. **Colors**:
   - [ ] Icon container has subtle background (theme.palette.action.hover)
   - [ ] Icon is gray/secondary color
   - [ ] Text colors match design system

4. **Consistency**:
   - [ ] All DataTable empty states look similar
   - [ ] Matches the EmptyState used elsewhere in the app

---

## Console Error Checks

Open browser console on each page:

- [ ] EquipmentPage: No errors
- [ ] MaterialsPage: No errors
- [ ] RFIPage: No errors
- [ ] InspectionsPage: No errors
- [ ] AuditLogPage: No errors

Common errors to watch for:
- Type errors
- Missing props warnings
- Render errors
- Icon import errors

---

## Testing with Data (Non-empty state)

For each page, also verify that when data IS present:

- [ ] EquipmentPage: Table renders normally with data
- [ ] MaterialsPage: Table renders normally with data
- [ ] RFIPage: Table renders normally with data
- [ ] InspectionsPage: Both tables render normally with data
- [ ] AuditLogPage: Table renders normally with data

This ensures the changes only affect the empty state.

---

## Overall Assessment

**All Pages Tested**: [ ] YES / [ ] NO

**Any Visual Regressions**: [ ] YES / [ ] NO

**Any Console Errors**: [ ] YES / [ ] NO

**Backward Compatibility Verified**: [ ] YES / [ ] NO

---

## Issues Found

If any issues found, document here:

| Page | Issue | Severity | Screenshot |
|------|-------|----------|------------|
|      |       |          |            |

---

## Sign-off

**Tested By**: ________________

**Date**: ________________

**Status**: [ ] APPROVED / [ ] NEEDS FIXES

**Notes**:
_____________________________________________________

---

## Next Steps

If all tests pass:
- ✅ Mark subtask-1-3 as completed
- ✅ Phase 1 is complete
- → Proceed to Phase 2 (optional enhancements)

If issues found:
- Document issues above
- Create fix commits
- Re-test failed pages
