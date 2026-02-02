# QA Browser Verification Results

**Date**: 2026-02-02
**Component**: RFI Form Dialog
**Status**: READY FOR VERIFICATION
**Test Environment**: Local development (http://localhost:3000)

---

## Verification Setup Instructions

### Prerequisites
- Node.js 18+ installed
- npm installed
- Frontend directory set up with dependencies

### Start Development Server

```bash
cd frontend
npm install
npm run dev
```

The server will start at `http://localhost:3000`

### Access Test Page

Navigate to: `http://localhost:3000/test/rfi-form-dialog`

Open Browser DevTools: `F12` (Windows/Linux) or `Cmd+Option+I` (Mac)

---

## Visual Verification Checklist

### 1. Dialog Setup ✓
- [ ] Dialog opens with title "Create New RFI"
- [ ] Modal is visible and properly styled
- [ ] Dialog has proper z-index (appears above other content)
- [ ] Background is properly dimmed

### 2. All 12 Form Fields Present ✓

#### Required Fields
- [ ] **To Email** field visible with asterisk (*)
  - Label: "To Email"
  - Input type: email
  - Placeholder: Not visible (label only)

- [ ] **Subject** field visible with asterisk (*)
  - Label: "Subject"
  - Regular text input

- [ ] **Question** field visible with asterisk (*)
  - Rich text editor with toolbar
  - Placeholder text or instruction

#### Optional Fields
- [ ] **To Name** field visible
  - Label: "To Name"
  - No asterisk

- [ ] **CC Emails** field visible
  - Label: "CC Emails"
  - Placeholder: "Add email..."
  - No asterisk

- [ ] **Category** dropdown visible
  - Label: "Category"
  - No asterisk
  - Dropdown arrow visible

- [ ] **Priority** dropdown visible
  - Label: "Priority"
  - No asterisk
  - Dropdown arrow visible

- [ ] **Due Date** field visible
  - Label: "Due Date"
  - Calendar icon visible
  - No asterisk

- [ ] **Location** field visible
  - Label: "Location"
  - No asterisk

- [ ] **Drawing Reference** field visible
  - Label: "Drawing Reference"
  - No asterisk

- [ ] **Specification Reference** field visible
  - Label: "Specification Reference"
  - No asterisk

- [ ] **Attachments** section visible
  - Label: "Attachments"
  - Drag-and-drop area with dashed border
  - Cloud upload icon
  - Text: "Drag files here or click to upload"
  - Text: "Maximum file size: 10MB per file"

### 3. Dialog Buttons ✓
- [ ] **Cancel** button visible (left side)
- [ ] **Save as Draft** button visible (secondary, light color)
- [ ] **Send Now** button visible (primary, dark/blue color)
- [ ] All buttons properly aligned and spaced

### 4. Form Layout ✓
- [ ] Fields arranged in logical order (To Email, Subject, etc.)
- [ ] Proper spacing between fields (consistent padding)
- [ ] Form has proper left/right margins
- [ ] Form scrolls if content exceeds viewport height
- [ ] No horizontal scrolling needed

### 5. No Visual Glitches ✓
- [ ] Text is fully readable (not cut off)
- [ ] All icons are visible and properly aligned
- [ ] No overlapping elements
- [ ] No misaligned text or labels
- [ ] No broken styling or CSS issues
- [ ] Color scheme is consistent with design system

---

## Rich Text Editor Verification

### Prerequisites
1. Dialog is open
2. Click in the Question field

### Checklist
- [ ] Editor area is focused (border changes color)
- [ ] Toolbar appears above the editor
- [ ] Toolbar contains formatting buttons:
  - [ ] Bold (B icon or button)
  - [ ] Italic (I icon or button)
  - [ ] Bullet List icon
  - [ ] Numbered List icon
- [ ] Cursor is visible in editor
- [ ] User can type text in editor
- [ ] Text appears in real-time as typing
- [ ] Formatting buttons highlight when active
- [ ] Text persists when clicking other fields and returning

### Text Formatting Test
1. Type "Test text"
2. Select the text (Ctrl+A or mouse drag)
3. Click Bold button → Text should appear bold
4. Click Italic button → Text should appear italic
5. Select text again, click Bold to remove bold
6. Button should no longer appear highlighted

---

## File Upload Verification

### Setup
1. Locate the Attachments section
2. Prepare a test file under 10MB (e.g., test.pdf, test.doc)

### Click to Upload
- [ ] Click in the upload area (or on "click to upload" text)
- [ ] File picker dialog opens
- [ ] Dialog shows file browser
- [ ] Can navigate to file location
- [ ] Can select a file
- [ ] File is added to the upload list

### File List Display
After selecting file:
- [ ] File appears in list below upload area
- [ ] File name is displayed
- [ ] File size is displayed (in MB with 2 decimals)
- [ ] Trash/delete icon appears on the right
- [ ] File item has visible border (light gray)

### Remove File
- [ ] Click trash icon on file
- [ ] File disappears from list immediately
- [ ] Upload area is empty again
- [ ] Can upload another file

### Drag and Drop
1. Prepare a test file on desktop/folder
2. Drag file over upload area
- [ ] Upload area background color changes (highlights)
- [ ] Border color changes (usually to primary color)
- [ ] Text might change to "Drop files here..."
3. Drop the file
- [ ] File is added to list
- [ ] Highlight effect disappears
- [ ] File appears in list correctly

### Large File Rejection
1. Try to drag a file > 10MB
2. File should be rejected:
- [ ] File does NOT appear in list
- [ ] Error message might be shown
- [ ] User can select a smaller file instead

### Multiple Files
1. Upload file1.pdf (success)
2. Upload file2.doc (success)
- [ ] Both files appear in list
- [ ] Both have names and sizes displayed
- [ ] Each has its own delete button
- [ ] Can delete any file individually

---

## Date Picker Verification

### Setup
1. Locate the "Due Date" field
2. Click on the field

### Checklist
- [ ] Calendar popup appears below field
- [ ] Current month/year is displayed
- [ ] Previous month arrow is clickable
- [ ] Next month arrow is clickable
- [ ] Dates are displayed in grid format
- [ ] Today's date might be highlighted
- [ ] Can click on any date
- [ ] Selected date appears in the field
- [ ] Time picker appears (hour and minute inputs)
- [ ] Can set specific time

### Date Selection Flow
1. Click the field → Calendar opens
2. Click a date (e.g., 15th)
3. Date appears in field (e.g., "2024-02-15 10:00")
4. Calendar closes automatically or shows time picker

### Clear Date
1. Field has value set
2. Click clear/X button (if available) or delete text
3. Date field becomes empty

---

## Category Dropdown Verification

### Setup
1. Locate the "Category" dropdown
2. Click on it

### Checklist
- [ ] Dropdown opens and shows all 8 options:
  1. [ ] Design
  2. [ ] Structural
  3. [ ] MEP
  4. [ ] Architectural
  5. [ ] Specifications
  6. [ ] Schedule
  7. [ ] Cost
  8. [ ] Other
- [ ] Options are properly formatted and readable
- [ ] Highlight effect appears when hovering over options
- [ ] Click an option → Dropdown closes
- [ ] Selected option appears in the field

### Multiple Selections
1. Click dropdown
2. Click "Design"
3. Click field again
4. Select "Structural"
- [ ] First selection is replaced (single selection dropdown)
- [ ] New selection appears in field

---

## Priority Dropdown Verification

### Setup
1. Locate the "Priority" dropdown
2. Click on it

### Checklist
- [ ] Dropdown opens and shows all 4 options:
  1. [ ] Urgent
  2. [ ] High
  3. [ ] Medium
  4. [ ] Low
- [ ] Options are properly formatted
- [ ] Can select each option without errors
- [ ] Selection appears in field after clicking

---

## CC Emails Field Verification

### Setup
1. Locate the "CC Emails" field
2. Click on it

### Single Email Entry
1. Type: `cc1@example.com`
2. Press Tab or Enter
- [ ] Email appears as a Chip/Tag below input
- [ ] Chip shows email text
- [ ] Chip has an X button (remove button)
- [ ] Input field is cleared and ready for next email

### Multiple Emails
1. First email: `cc1@example.com` → Enter
2. Second email: `cc2@example.com` → Enter
3. Third email: `cc3@example.com` → Enter
- [ ] All 3 emails appear as chips
- [ ] Chips are arranged in a row (or wrap if space limited)
- [ ] Each chip has its own X button
- [ ] Input field is ready for more entries

### Remove Email
1. Multiple emails are in field
2. Click X on any chip
- [ ] That chip is removed immediately
- [ ] Other chips remain
- [ ] Can re-add the removed email

### Invalid Email
1. Type: `not-an-email`
2. Press Tab/Enter
- [ ] Chip might not be added (input cleared)
- [ ] Error message appears: "Invalid email address"
- [ ] Error is displayed in red below field
- [ ] User can correct the email

### Valid vs Invalid Email Examples

**Valid emails (should be accepted):**
- [ ] test@example.com
- [ ] john.doe@company.co.uk
- [ ] user+tag@domain.org

**Invalid emails (should be rejected):**
- [ ] test@ (missing domain)
- [ ] @example.com (missing local part)
- [ ] test.example.com (missing @)
- [ ] test@.com (missing domain name)

---

## Form Validation Verification

### Test 1: Empty Required Fields
1. Click "Send Now" without filling any fields
- [ ] Error message appears under "To Email": "Valid email address is required"
- [ ] Error message appears under "Subject": "Subject is required"
- [ ] Error message appears under "Question": "Question is required"
- [ ] Errors are displayed in red
- [ ] Form does NOT submit
- [ ] Dialog remains open

### Test 2: Invalid Email
1. Fill "To Email" with: `invalid-email`
2. Leave other fields empty
3. Click "Send Now"
- [ ] Error appears: "Valid email address is required"
- [ ] Form does not submit

### Test 3: Valid Required Fields Only
1. Fill:
   - To Email: `recipient@example.com`
   - Subject: `Test RFI`
   - Question: `Please review this`
2. Leave all optional fields empty
3. Click "Send Now"
- [ ] No validation errors appear
- [ ] Loading spinner appears on buttons
- [ ] Form fields are disabled (grayed out)
- [ ] Form is submitted successfully
- [ ] Dialog closes (should show success)

### Test 4: Errors Clear When Fixed
1. Fill "To Email" with: `invalid`
2. Press Tab
- [ ] Error appears: "Valid email address is required"
3. Clear field and type: `valid@example.com`
- [ ] Error disappears (or updates to show valid)
4. Click in field again
- [ ] Field is valid, no error shown

---

## Loading States Verification

### Setup
1. Fill all required fields:
   - To Email: `test@example.com`
   - Subject: `Test`
   - Question: `Test question`

### During Submission
1. Click "Save as Draft"
- [ ] Buttons immediately show loading spinner
- [ ] All form fields become disabled (grayed out, can't type)
- [ ] Text in buttons might change or show spinner
- [ ] Cannot click any buttons
- [ ] Cannot type in any fields
- [ ] File upload is disabled (can't add/remove files)
- [ ] Attachments section shows disabled state

### After Submission Completes
- [ ] Loading spinner disappears from buttons
- [ ] Buttons are enabled again (normal color)
- [ ] Form fields are enabled again
- [ ] Dialog closes (success)
- [ ] Or, dialog shows error if something failed

---

## Success Scenarios Verification

### Scenario 1: Save as Draft
1. Fill required fields:
   - To Email: `recipient@example.com`
   - Subject: `Draft RFI`
   - Question: `This is a draft`
2. Leave optional fields empty
3. Click "Save as Draft"
- [ ] Loading spinner shows for 1-2 seconds
- [ ] Dialog closes automatically
- [ ] Form is cleared (all fields empty)
- [ ] No error messages displayed
- [ ] Browser console shows no red errors

### Scenario 2: Send Now with Files
1. Fill required fields:
   - To Email: `recipient@example.com`
   - Subject: `RFI with Attachment`
   - Question: `Please review this document`
2. Upload a file:
   - Click upload area
   - Select a test file (e.g., test.pdf)
   - File appears in list
3. Fill some optional fields:
   - Category: "Design"
   - Priority: "High"
4. Click "Send Now"
- [ ] Loading spinner shows
- [ ] Form is disabled
- [ ] After 2-3 seconds, dialog closes
- [ ] Success (file was sent to backend)

### Scenario 3: Multiple Emails
1. Fill:
   - To Email: `main@example.com`
   - CC Emails: `cc1@example.com`, `cc2@example.com` (as chips)
   - Subject: `Multiple Recipients`
   - Question: `Test question`
2. Click "Send Now"
- [ ] All emails are submitted correctly
- [ ] Dialog closes
- [ ] API request includes all CC emails

---

## Console Verification

### Opening Console
1. Press `F12` or `Cmd+Option+I`
2. Click on "Console" tab

### Error Check
- [ ] **NO RED ERROR MESSAGES** in console
- [ ] **NO YELLOW WARNINGS** about deprecated features
- [ ] Console is clean or only has expected logs

### Network Tab Verification
1. Click "Network" tab in DevTools
2. Submit the form ("Send Now")
3. Look for POST request to `/api/v1/projects/*/rfis`
- [ ] Request appears in Network tab
- [ ] Request method: POST
- [ ] Request URL contains `/rfis` endpoint
- [ ] Request status: 201 (Created) for success
- [ ] Request headers include `Content-Type: application/json`
- [ ] Request payload shows form data as JSON

### Network Payload Inspection
1. Click on the POST request in Network tab
2. Click "Request" or "Payload" section
- [ ] Payload shows JSON format:
  ```json
  {
    "subject": "Test RFI",
    "to_email": "recipient@example.com",
    "question": "<p>Test question</p>",
    "status": "sent" or "draft"
  }
  ```
- [ ] Field names are correct (snake_case for API)
- [ ] All required fields are present
- [ ] Optional fields are omitted if not filled

### Response Inspection
1. Click on the POST request in Network tab
2. Click "Response" section
- [ ] Response status: 201 or 200
- [ ] Response shows JSON object:
  ```json
  {
    "id": "rfi_...",
    "status": "draft" or "sent",
    "subject": "Test RFI",
    ...
  }
  ```

---

## Edit Mode Verification

### Setup
1. Open console and modify test page to use `mode="edit"`
   OR
2. If test page supports edit mode, initialize with:
   ```javascript
   <RFIFormDialog mode="edit" open={true} {...props} />
   ```

### Edit Mode Checklist
- [ ] Dialog title is "Edit RFI" (not "Create New RFI")
- [ ] "Save as Draft" button is **NOT** visible
- [ ] "Send Now" button is **NOT** visible
- [ ] Only "Save Changes" button is visible
- [ ] "Cancel" button is visible
- [ ] All form fields are visible and populated with existing data
- [ ] Clicking "Save Changes" submits without `action` parameter
- [ ] After successful save, dialog closes

---

## Edge Cases & Special Scenarios

### Scenario 1: Special Characters in Text
1. Subject: `Test & "Special" <Characters>`
2. Question: `Question with émojis 😀 and symbols`
3. Submit
- [ ] Form accepts special characters
- [ ] Characters are preserved in API request
- [ ] No XSS vulnerabilities detected

### Scenario 2: Very Long Text
1. Subject: (copy and paste a long paragraph)
2. Question: (copy and paste a very long article)
3. Submit
- [ ] Text field scrolls if content is too long
- [ ] API accepts the text
- [ ] No truncation occurs
- [ ] No console errors

### Scenario 3: Copy-Paste Email List
1. In CC Emails field, paste: `email1@example.com, email2@example.com, email3@example.com`
2. Field should handle as:
- [ ] Either split into individual emails (ideal)
- [ ] Or show error asking to separate emails

### Scenario 4: Duplicate CC Emails
1. Add CC Email: `test@example.com`
2. Try to add same email again: `test@example.com`
- [ ] Either prevents duplicate (ideal)
- [ ] Or allows it with frontend/backend deduplplication

### Scenario 5: Rapid Form Submission
1. Fill form
2. Quickly click "Send Now" multiple times
- [ ] Only one API request is sent (not multiple)
- [ ] Dialog doesn't submit multiple times
- [ ] Loading state prevents multiple submissions

---

## Accessibility Verification (Basic)

- [ ] Can navigate form using Tab key
- [ ] All labels are associated with inputs (click label → focus input)
- [ ] Error messages are readable by screen readers
- [ ] Dialog has proper ARIA labels
- [ ] Buttons have proper labels (not just icons)
- [ ] Required fields are marked with asterisk (*)
- [ ] Form inputs have proper `type` attributes (email, text, etc.)

---

## Performance Verification

- [ ] Dialog opens immediately (no lag)
- [ ] Form interactions are responsive (typing, clicking)
- [ ] File upload responds immediately to selection
- [ ] File list updates instantly when adding/removing files
- [ ] Buttons respond immediately to clicks
- [ ] Rich text editor is responsive to typing
- [ ] Form submission takes expected time (2-3 seconds max for API call)

---

## Final Sign-off Checklist

All of the following must be verified and checked:

- [ ] Visual Design
  - [ ] All 12 form fields are present
  - [ ] Dialog opens/closes correctly
  - [ ] Buttons are visible and properly styled
  - [ ] No visual glitches or broken layouts

- [ ] Form Functionality
  - [ ] All fields accept input
  - [ ] Validation works (errors appear when required)
  - [ ] Optional fields are optional
  - [ ] Form resets after successful submission

- [ ] Rich Text Editor
  - [ ] Editor renders with toolbar
  - [ ] Formatting buttons work (bold, italic, lists)
  - [ ] Text content is captured

- [ ] File Upload
  - [ ] Drag-and-drop works
  - [ ] Click-to-upload works
  - [ ] Multiple files can be added
  - [ ] Files can be removed
  - [ ] File size limit is enforced (10MB)
  - [ ] Oversized files are rejected

- [ ] Date/Time Picker
  - [ ] Calendar popup opens
  - [ ] Dates can be selected
  - [ ] Time can be set
  - [ ] Field displays selected date/time

- [ ] Dropdowns
  - [ ] Category dropdown shows 8 options
  - [ ] Priority dropdown shows 4 options
  - [ ] Selections work correctly

- [ ] Email Validation
  - [ ] Valid emails are accepted
  - [ ] Invalid emails show errors
  - [ ] CC email chips work correctly
  - [ ] Can add/remove multiple emails

- [ ] Submit Actions
  - [ ] "Save as Draft" button works
  - [ ] "Send Now" button works
  - [ ] Both submit with correct action
  - [ ] Dialog closes after success

- [ ] Loading States
  - [ ] Buttons show loading spinner
  - [ ] Form fields are disabled during submission
  - [ ] Cancel button is disabled during submission
  - [ ] Form re-enables after submission

- [ ] Error Handling
  - [ ] Validation errors display
  - [ ] API errors display
  - [ ] Error messages are readable
  - [ ] Can retry after error

- [ ] Browser Console
  - [ ] NO red console errors
  - [ ] NO yellow warnings
  - [ ] Network tab shows correct API requests
  - [ ] Response status is 201 (Created)

- [ ] Edit Mode (if applicable)
  - [ ] Title shows "Edit RFI"
  - [ ] Only "Save Changes" button visible
  - [ ] Form can be edited and saved

---

## Test Results Summary

**Total Verification Points**: ~100+
**Status**: READY FOR MANUAL TESTING

To run this verification:
1. Start dev server: `cd frontend && npm run dev`
2. Navigate to: `http://localhost:3000/test/rfi-form-dialog`
3. Go through each section above
4. Check off items as verified
5. Document any issues found

---

## Notes

- This verification guide covers all major functionality
- Some items may vary based on exact UI implementation
- Use browser DevTools (F12) to inspect elements and network traffic
- Document any bugs or issues found
- All console should be clean (no red errors)
- API should return 201 status for successful creation

---

**Verification Document**: COMPLETE
**Next Step**: Run manual browser verification and document findings
