# Manual Testing Guide: Date Validation in Create Project Dialog

## Test Environment Setup
1. Open terminal in project root
2. Run `cd frontend && npm run dev`
3. Wait for server to start (typically http://localhost:3000)
4. Open browser to http://localhost:3000
5. Navigate to Projects page
6. Open browser DevTools Console (F12)

---

## Test Case 1: Create Mode - Invalid Date Range

### Steps:
1. Click "New Project" button
2. Fill in required fields:
   - Project Name: "Test Project"
   - Project Code: "TEST"
3. Set Start Date: `2026-02-15` (future date)
4. Set End Date: `2026-02-10` (before start date)

### Expected Results:
- ✅ Error message appears below End Date field: "End Date must be after Start Date"
- ✅ End Date field has red border
- ✅ Submit button is disabled
- ✅ No console errors

---

## Test Case 2: Create Mode - Valid Date Range

### Steps:
1. Continue from Test Case 1
2. Change End Date to: `2026-02-20` (after start date)

### Expected Results:
- ✅ Error message disappears
- ✅ End Date field border returns to normal
- ✅ Submit button is enabled
- ✅ No console errors

---

## Test Case 3: Create Mode - Same Start and End Date

### Steps:
1. Open "New Project" dialog
2. Fill in required fields (name, code)
3. Set Start Date: `2026-02-15`
4. Set End Date: `2026-02-15` (same as start date)

### Expected Results:
- ✅ No error message (same dates are valid)
- ✅ Submit button is enabled
- ✅ No console errors

---

## Test Case 4: Create Mode - Empty Dates

### Steps:
1. Open "New Project" dialog
2. Fill in required fields (name, code)
3. Leave both Start Date and End Date empty

### Expected Results:
- ✅ No error message (dates are optional)
- ✅ Submit button is enabled
- ✅ No console errors

---

## Test Case 5: Create Mode - Only Start Date Provided

### Steps:
1. Open "New Project" dialog
2. Fill in required fields (name, code)
3. Set Start Date: `2026-02-15`
4. Leave End Date empty

### Expected Results:
- ✅ No error message (end date is optional)
- ✅ Submit button is enabled
- ✅ No console errors

---

## Test Case 6: Create Mode - Only End Date Provided

### Steps:
1. Open "New Project" dialog
2. Fill in required fields (name, code)
3. Leave Start Date empty
4. Set End Date: `2026-02-15`

### Expected Results:
- ✅ No error message (start date is optional)
- ✅ Submit button is enabled
- ✅ No console errors

---

## Test Case 7: Edit Mode - Invalid Date Range

### Steps:
1. From Projects page, click the menu (⋮) on any existing project
2. Click "Edit Project"
3. Modify dates:
   - Start Date: `2026-03-01`
   - End Date: `2026-02-28` (before start date)

### Expected Results:
- ✅ Error message appears below End Date field
- ✅ End Date field has red border
- ✅ Save button is disabled
- ✅ No console errors

---

## Test Case 8: Edit Mode - Valid Date Range

### Steps:
1. Continue from Test Case 7
2. Change End Date to: `2026-03-15` (after start date)

### Expected Results:
- ✅ Error message disappears
- ✅ End Date field border returns to normal
- ✅ Save button is enabled
- ✅ No console errors

---

## Test Case 9: Existing Validations Still Work

### Steps:
1. Open "New Project" dialog
2. Leave Project Name empty
3. Set invalid dates (end before start)
4. Try to submit

### Expected Results:
- ✅ Error message under Project Name: "Project Name is required"
- ✅ Error message under End Date: "End Date must be after Start Date"
- ✅ Submit button is disabled
- ✅ Both validations work independently

---

## Test Case 10: Code Validation Still Works

### Steps:
1. Open "New Project" dialog
2. Fill Project Name: "Test"
3. Fill Project Code: "test@#$" (invalid characters)
4. Set valid dates

### Expected Results:
- ✅ Error message under Project Code about invalid characters
- ✅ Submit button is disabled
- ✅ Date validation doesn't interfere with code validation

---

## Verification Checklist

### Implementation Verification:
- ✅ `validateDateRange` function exists in `frontend/src/utils/validation.ts`
- ✅ Function follows existing validation pattern (returns `string | null`)
- ✅ Function handles edge cases (empty dates, same dates)
- ✅ `validateProjectForm` accepts `startDate` and `estimatedEndDate` parameters
- ✅ Date validation is integrated into `validateProjectForm`
- ✅ Start Date field has `error` and `helperText` props
- ✅ End Date field has `error` and `helperText` props
- ✅ Submit button uses `hasErrors(errors)` to determine disabled state

### Code Quality:
- ✅ No console.log statements
- ✅ Follows TypeScript best practices
- ✅ Consistent with existing validation patterns
- ✅ Error messages are clear and descriptive
- ✅ Code is properly formatted

### Browser Testing (To Be Completed):
- ⏳ All 10 test cases executed
- ⏳ No console errors during any test
- ⏳ Error styling appears correctly (red border, red text)
- ⏳ Submit/Save buttons respond correctly to validation state
- ⏳ Form can be submitted with valid or empty dates
- ⏳ Form cannot be submitted with invalid date range

---

## Notes for QA

- The validation is **client-side only** - no backend changes
- Dates are **optional fields** - validation only applies when both dates are provided
- The error message format is: "End Date must be after Start Date"
- The validation allows same start and end dates (end >= start, not end > start)
- All existing validations (name, code, description, address) remain unchanged
- The implementation uses Material-UI's built-in error styling

---

## Issues Found (If Any)

_Document any issues discovered during testing here_

---

## Sign-off

**Tested By:** _________________
**Date:** _________________
**Result:** ⬜ PASS  ⬜ FAIL
**Comments:** _________________
