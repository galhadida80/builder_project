# QA Fix Request

**Status**: REJECTED
**Date**: 2026-02-02
**QA Session**: 1
**Linear Issue**: BUI-105

---

## Summary

The RFIFormDialog component implementation is functionally complete with all 12 form fields, validation, and API integration. However, **critical QA requirements are missing**:

1. ❌ No unit tests (required >80% code coverage)
2. ❌ No integration tests
3. ❌ Browser verification not performed

These are explicitly required in the spec's "QA Acceptance Criteria" section before sign-off.

---

## Critical Issues to Fix

### 1. CRITICAL: Unit Tests Required

**Problem**: The QA Acceptance Criteria requires unit tests with >80% code coverage for the RFIFormDialog component. No tests were created.

**Location**: `frontend/src/components/RFI/RFIFormDialog.test.tsx` (missing)

**Required Fix**:

Create comprehensive unit tests covering:

```
1. Component Rendering
   - [ ] Component renders with all 12 form fields
   - [ ] Dialog opens with correct title
   - [ ] All fields are visible and interactive
   - [ ] Cancel button closes dialog

2. Form Validation
   - [ ] Required fields (toEmail, subject, question) show errors when empty
   - [ ] Email validation rejects invalid emails (test@invalid, missing @, etc.)
   - [ ] Email validation accepts valid emails
   - [ ] Error messages display below fields with correct text
   - [ ] Errors clear when field becomes valid
   - [ ] Form cannot be submitted with validation errors
   - [ ] Form can be submitted with only required fields filled

3. Optional Fields
   - [ ] Optional fields don't prevent submission when empty
   - [ ] Optional fields accept values when provided
   - [ ] toName field is optional and doesn't show error when empty
   - [ ] location, drawingReference, specificationReference are optional

4. Multi-Email CC Field
   - [ ] Can add multiple emails
   - [ ] Can remove individual emails
   - [ ] Each email is validated
   - [ ] Invalid emails show error

5. Dropdowns
   - [ ] Category dropdown shows 8 options
   - [ ] Priority dropdown shows 4 options
   - [ ] Selection updates form state

6. Date Picker
   - [ ] Date picker accepts dates
   - [ ] Date picker handles null/empty values

7. Rich Text Editor
   - [ ] Rich text editor renders
   - [ ] Text entered in editor is captured
   - [ ] Formatting (bold, italic, lists) is captured

8. File Upload
   - [ ] Files can be added via dropzone
   - [ ] Multiple files can be added
   - [ ] Files show in list with name and size
   - [ ] Files can be removed from list
   - [ ] Maximum 10MB file size is enforced
   - [ ] Oversized files are rejected

9. Draft Handler
   - [ ] "Save as Draft" button is visible in create mode
   - [ ] Clicking "Save as Draft" calls onSubmit with action='draft'
   - [ ] Draft handler includes error handling
   - [ ] Form resets after successful draft save
   - [ ] Dialog closes after successful draft save

10. Send Handler
    - [ ] "Send Now" button is visible in create mode
    - [ ] Clicking "Send Now" calls onSubmit with action='send'
    - [ ] Send handler includes error handling
    - [ ] Form resets after successful send
    - [ ] Dialog closes after successful send

11. Loading States
    - [ ] Form fields are disabled during submission
    - [ ] Buttons show loading spinner during submission
    - [ ] File upload is disabled during submission
    - [ ] Cancel button is disabled during submission
    - [ ] Form is re-enabled after submission completes

12. Error Handling
    - [ ] Error messages display in Alert component
    - [ ] Errors can be dismissed via close button
    - [ ] Errors persist until dismissed or form resets
    - [ ] API errors show user-friendly message

13. Edit Mode
    - [ ] In edit mode, only "Save Changes" button is shown
    - [ ] "Save as Draft" and "Send Now" buttons are hidden in edit mode
```

**Implementation Approach**:

Use Vitest (already in devDependencies):
```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RFIFormDialog } from './RFIFormDialog'

describe('RFIFormDialog', () => {
  // Test cases here
})
```

Mock rfiApi for testing submit handlers:
```typescript
vi.mock('../api/rfi', () => ({
  rfiApi: {
    create: vi.fn(),
  },
}))
```

**Verification**:
- Run: `cd frontend && npm test -- RFIFormDialog.test`
- Coverage should be >80%
- All tests should pass

---

### 2. MAJOR: Integration Tests Required

**Problem**: The QA Acceptance Criteria requires integration tests for RFI API integration. No integration tests were created.

**Location**: `frontend/src/components/RFI/__tests__/RFIFormDialog.integration.test.ts` (missing)

**Required Fix**:

Create integration tests that verify:

```
1. RFI API Integration
   - [ ] POST request sent to /api/v1/projects/{id}/rfis
   - [ ] Request payload contains correct snake_case keys
   - [ ] Request includes status='draft' when saving as draft
   - [ ] Request includes status='sent' when sending
   - [ ] Response status is 201 Created
   - [ ] Response contains RFI object with id and status
   - [ ] Response is properly handled by component
   - [ ] Form resets after API success

2. Error Handling
   - [ ] API errors show user-friendly message
   - [ ] Network errors are handled gracefully
   - [ ] 400 Bad Request errors show field validation messages
   - [ ] 500 Server errors show generic error message
   - [ ] User can retry after error
```

**Implementation Approach**:

Use Vitest with @playwright/test or similar:
```typescript
import { test, expect } from '@playwright/test'

test.describe('RFI Form API Integration', () => {
  // Start backend API server
  // Create real or test database

  test('should create RFI with draft status', async () => {
    // Call form submission
    // Verify API was called
    // Verify database record created
    // Verify response handling
  })
})
```

**Verification**:
- Run: `cd frontend && npm run test:integration`
- All integration tests should pass
- API contracts verified

---

### 3. MAJOR: Browser Verification Required

**Problem**: The QA Acceptance Criteria requires browser verification with manual testing. This was not performed.

**Location**: Manual testing in real browser

**Required Fix**:

Perform the following checks in a real browser:

```
1. Setup
   - [ ] Run `cd frontend && npm install`
   - [ ] Run `cd frontend && npm run dev`
   - [ ] Open http://localhost:3000/test/rfi-form-dialog
   - [ ] Open browser DevTools Console (F12)

2. Visual Verification
   - [ ] Dialog opens with title "Create New RFI"
   - [ ] All 12 form fields are visible:
       - [ ] To Email (text input)
       - [ ] To Name (text input)
       - [ ] CC Emails (autocomplete with chips)
       - [ ] Subject (text input)
       - [ ] Category (dropdown with 8 options)
       - [ ] Priority (dropdown with 4 options)
       - [ ] Due Date (date/time picker)
       - [ ] Question (rich text editor with toolbar)
       - [ ] Location (text input)
       - [ ] Drawing Reference (text input)
       - [ ] Specification Reference (text input)
       - [ ] Attachments (drag-and-drop area)
   - [ ] Required fields marked with asterisk (*)
   - [ ] Buttons visible: Cancel, "Save as Draft", "Send Now"
   - [ ] No visual glitches or broken layouts

3. Rich Text Editor
   - [ ] Click in Question field
   - [ ] Toolbar appears above editor
   - [ ] Bold, Italic, List buttons are visible
   - [ ] Type text and apply formatting
   - [ ] Formatted text is preserved

4. File Upload
   - [ ] Click in file upload area
   - [ ] File picker dialog opens
   - [ ] Select a file (under 10MB)
   - [ ] File appears in list below upload area
   - [ ] File name and size are displayed
   - [ ] Delete button (trash icon) appears on file
   - [ ] Click delete to remove file
   - [ ] Try dragging a file into upload area
   - [ ] File is accepted and added to list
   - [ ] Try uploading a file > 10MB
   - [ ] File is rejected with error message

5. Date Picker
   - [ ] Click Due Date field
   - [ ] Calendar popup appears
   - [ ] Click a date to select it
   - [ ] Selected date appears in field
   - [ ] Can clear the field

6. Category Dropdown
   - [ ] Click Category dropdown
   - [ ] All 8 options appear:
       - [ ] Design
       - [ ] Structural
       - [ ] MEP
       - [ ] Architectural
       - [ ] Specifications
       - [ ] Schedule
       - [ ] Cost
       - [ ] Other
   - [ ] Click an option to select it
   - [ ] Selected value appears in field

7. Priority Dropdown
   - [ ] Click Priority dropdown
   - [ ] All 4 options appear:
       - [ ] Low
       - [ ] Medium
       - [ ] High
       - [ ] Urgent
   - [ ] Selection works correctly

8. CC Emails Field
   - [ ] Click CC Emails field
   - [ ] Type an email: "test@example.com"
   - [ ] Press Enter or Tab
   - [ ] Email appears as a chip below the input
   - [ ] Can type another email and add it
   - [ ] Click X on chip to remove email
   - [ ] Type invalid email: "not-an-email"
   - [ ] Field shows red error border
   - [ ] Error message displays: "Invalid email address"
   - [ ] After fixing email, error clears

9. Form Validation
   - [ ] Leave To Email empty
   - [ ] Click "Send Now"
   - [ ] Error message appears: "Valid email address is required"
   - [ ] Form does NOT submit
   - [ ] Type invalid email: "test@"
   - [ ] Click "Send Now"
   - [ ] Error message appears
   - [ ] Leave Subject empty, click "Send Now"
   - [ ] Error appears under Subject field
   - [ ] Leave Question empty, click "Send Now"
   - [ ] Error appears in red below Question field
   - [ ] Fill in To Email: "recipient@example.com"
   - [ ] Fill in Subject: "Test RFI"
   - [ ] Type in Question field: "Please review this"
   - [ ] All error messages clear
   - [ ] Form can now be submitted

10. Loading States
    - [ ] Click "Save as Draft"
    - [ ] Buttons show loading spinner
    - [ ] Form fields are grayed out (disabled)
    - [ ] Cannot click buttons during loading
    - [ ] Cannot type in fields during loading
    - [ ] After submission completes, form re-enables
    - [ ] Dialog closes after success

11. Success Scenarios
    - [ ] Fill required fields (To Email, Subject, Question)
    - [ ] Click "Save as Draft"
    - [ ] Loading spinner shows
    - [ ] After 1-2 seconds, dialog closes
    - [ ] Form is cleared (all fields empty)
    - [ ] No error messages display
    - [ ] Repeat for "Send Now" button
    - [ ] Both buttons work correctly

12. Console Verification
    - [ ] Browser console has NO RED errors
    - [ ] Browser console has NO YELLOW warnings
    - [ ] Console shows form submission logs (if any)
    - [ ] Network tab shows POST request to /api/v1/projects/*/rfis
    - [ ] Request has correct status (draft or sent)
    - [ ] Response status is 201 Created

13. Edit Mode
    - [ ] Initialize dialog with mode="edit"
    - [ ] Verify title is "Edit RFI"
    - [ ] Verify only "Save Changes" button is shown
    - [ ] Verify "Save as Draft" and "Send Now" buttons are hidden
    - [ ] Click "Save Changes"
    - [ ] Form submits without action parameter
```

**Documentation Required**:

Create a file `QA_BROWSER_VERIFICATION_RESULTS.md` with:
- Screenshots of each major UI element
- Checkbox list of all items verified
- Any bugs or issues found
- Confirmation that all requirements passed

**Verification**:
- All items checked and passing
- No console errors
- All API requests successful
- Form validation working correctly

---

## After Fixes Are Complete

Once the Coder Agent completes the above fixes:

1. **Commit Changes**
   ```bash
   git add frontend/src/components/RFI/*.test.ts
   git add frontend/src/components/RFI/__tests__/
   git add QA_BROWSER_VERIFICATION_RESULTS.md
   git commit -m "fix: Add unit tests and integration tests for RFIFormDialog (qa-requested)"
   ```

2. **Verify Tests Pass**
   ```bash
   cd frontend
   npm test -- RFIFormDialog.test
   npm run test:integration
   ```

3. **QA Will Re-Run**
   - Verify all tests pass
   - Review test coverage (must be >80%)
   - Review browser verification results
   - Provide final sign-off if all requirements met

---

## Test Setup Requirements

The following testing packages are likely needed:
```json
{
  "@testing-library/react": "^14.0.0",
  "@testing-library/user-event": "^14.5.0",
  "@testing-library/jest-dom": "^6.1.0",
  "vitest": "^0.34.0",
  "@vitest/ui": "^0.34.0"
}
```

Check `frontend/package.json` for available test runners and frameworks.

---

## Timeline

**Recommended Implementation Order**:

1. **Day 1**: Create unit tests (4-6 hours)
   - Covers 80% of requirements
   - Fastest to implement
   - Most critical

2. **Day 2**: Create integration tests (2-3 hours)
   - Covers API contract
   - Requires backend running

3. **Day 2**: Perform browser verification (1-2 hours)
   - Manual testing
   - Document results

4. **Total**: ~8 hours of work

---

## Escalation

If the Coder Agent encounters any issues:

1. **Test Setup Issues**
   - Check existing test configuration in project
   - Look for .vitest.config.ts or jest.config.js
   - Review existing test files for patterns

2. **Mock Issues**
   - Mock rfiApi.create() to test without backend
   - Mock useDropzone for file upload testing
   - Mock useEditor for rich text editor testing

3. **Browser Verification Issues**
   - Ensure Node.js and npm are installed
   - Run `npm install` before `npm run dev`
   - Check port 3000 is not in use
   - Clear browser cache if styling issues appear

---

## Success Criteria for Re-approval

All of the following must be true:

- ✅ Unit test file exists: `frontend/src/components/RFI/RFIFormDialog.test.ts`
- ✅ Unit tests run without errors: `npm test -- RFIFormDialog.test`
- ✅ Code coverage >80%: Shown in coverage report
- ✅ Integration test file exists
- ✅ Integration tests run without errors
- ✅ Browser verification completed and documented
- ✅ Browser console has NO red errors
- ✅ All visual elements verified
- ✅ Form validation tested in browser
- ✅ API submission tested and working
- ✅ Loading states verified
- ✅ Error handling verified

After these are complete, QA will automatically re-run and provide final sign-off. ✓

---

## Questions?

Refer to:
- **Spec**: `.auto-claude/specs/088-create-rfi-form-dialog-component/spec.md`
- **Implementation Plan**: `.auto-claude/specs/088-create-rfi-form-dialog-component/implementation_plan.json`
- **QA Report**: `.auto-claude/specs/088-create-rfi-form-dialog-component/qa_report.md`
- **API Guide**: `API_INTEGRATION_TEST_GUIDE.md`
- **Validation Guide**: `FORM_VALIDATION_TEST_SCENARIOS.md`
