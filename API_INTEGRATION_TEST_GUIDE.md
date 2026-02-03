# API Integration Test Guide

## Prerequisites

Before running these tests, ensure:
1. Backend API is running: `python -m uvicorn app.main:app --reload --port 8000`
2. Frontend dev server is running: `npm run dev` (in frontend directory)
3. Browser is open to: `http://localhost:3000/test/rfi-form-dialog`
4. Browser Developer Tools Console is open (F12 → Console tab)

## Test 1: Component Rendering Verification

### Steps
1. Navigate to `http://localhost:3000/test/rfi-form-dialog`
2. Click "Open RFIFormDialog" button
3. Verify dialog opens without errors

### Expected Results
- Dialog window appears with title "Create New RFI"
- All 12 form fields are visible:
  - To Email (text input, required)
  - To Name (text input)
  - CC Emails (autocomplete with chips)
  - Subject (text input, required)
  - Category (dropdown with 8 options)
  - Priority (dropdown with 4 options)
  - Due Date (date/time picker)
  - Question (rich text editor with toolbar)
  - Location (text input)
  - Drawing Reference (text input)
  - Specification Reference (text input)
  - Attachments (drag-and-drop area)
- Two action buttons visible: "Save as Draft" and "Send Now"
- Cancel button visible
- No console errors

### Verification Code
```javascript
// In browser console:
console.log('Visible fields check:')
console.log('- To Email field:', !!document.querySelector('input[type="email"]'))
console.log('- Subject field:', !!document.querySelector('input[value*="Subject"]'))
console.log('- Rich text editor:', !!document.querySelector('[role="textbox"]'))
```

## Test 2: Form Validation Test

### Steps
1. From the RFI Form Dialog Test page
2. Click "Open RFIFormDialog"
3. Immediately click "Send Now" without filling any fields
4. Observe error messages

### Expected Results
- Dialog remains open
- Red error messages appear under required fields:
  - To Email: "Valid email address is required"
  - Subject: "Subject is required"
  - Question: "Question is required"
- Optional fields do not show errors
- Form is still populated and can be corrected

### Console Output
```
Form validation prevented submission - form still open
```

## Test 3: Save as Draft - API Integration Test

### Steps
1. From RFI Form Dialog Test page, click "Open RFIFormDialog"
2. Fill in the form with:
   ```
   To Email:     test@example.com
   Subject:      Test Draft RFI
   Question:     This is a test question
   ```
3. Leave other fields empty (to test optional field handling)
4. Click "Save as Draft" button
5. Monitor browser console for API logs

### Expected Results

**In Dialog:**
- Buttons become disabled
- Loading spinner appears on "Save as Draft" button
- Form fields become disabled
- Dialog cannot be closed during submission

**In Console:**
```javascript
// Should see:
Form submitted with action: draft
Form data: {subject: "Test Draft RFI", question: "This is a test question", toEmail: "test@example.com", ...}
Sending to API: {subject: "Test Draft RFI", ..., status: "draft"}
API Response: {id: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx", status: "draft", subject: "Test Draft RFI", ...}
```

**Below the Dialog:**
- Success message appears with:
  - Green background
  - "✓ RFI Submitted Successfully" header
  - Chips showing: Action: draft | Status: DRAFT | ID: xxxxxxxx...
  - Form Data Submitted (JSON)
  - API Response (JSON showing complete RFI object)

**API Response Should Contain:**
```json
{
  "id": "unique-id",
  "status": "draft",
  "subject": "Test Draft RFI",
  "question": "This is a test question",
  "to_email": "test@example.com",
  "project_id": "test-project-001",
  "created_at": "2026-02-02T...",
  "updated_at": "2026-02-02T..."
}
```

### Network Tab Verification
In browser DevTools Network tab:
1. Find POST request to `/api/v1/projects/test-project-001/rfis`
2. Status should be `201 Created`
3. Request payload shows: `{"status": "draft", ...}`
4. Response shows complete RFI object

## Test 4: Send Now - API Integration Test

### Steps
1. Click "Open RFIFormDialog" again (from test page)
2. Fill in comprehensive form data:
   ```
   To Email:                 consultant@example.com
   To Name:                  John Consultant
   CC Emails:                cc1@example.com, cc2@example.com
   Subject:                  Urgent Design Question
   Category:                 Design
   Priority:                 Urgent
   Due Date:                 2026-03-15 (any future date)
   Question:                 Can you clarify the design specifications?
   Location:                 Building A, Room 101
   Drawing Reference:        Sheet A1.0
   Specification Reference:  Section 2.3.1
   Attachments:              (drag and drop a file or skip)
   ```
3. Click "Send Now" button
4. Monitor console and UI

### Expected Results

**In Console:**
```javascript
Form submitted with action: send
Form data: {
  subject: "Urgent Design Question",
  question: "Can you clarify...",
  toEmail: "consultant@example.com",
  toName: "John Consultant",
  ccEmails: ["cc1@example.com", "cc2@example.com"],
  category: "design",
  priority: "urgent",
  dueDate: "2026-03-15T...",
  location: "Building A, Room 101",
  drawingReference: "Sheet A1.0",
  specificationReference: "Section 2.3.1"
}
Sending to API: {...same data..., status: "sent"}
API Response: {id: "...", status: "sent", ...}
```

**Success Message:**
- Shows: `Action: send | Status: SENT | ID: ...`
- API Response shows all submitted fields
- Status is "sent"

**Network Request:**
- POST to `/api/v1/projects/test-project-001/rfis`
- HTTP Status: `201 Created`
- Request body includes: `"status": "sent"`

## Test 5: Email Validation Test

### Steps
1. Click "Open RFIFormDialog"
2. Fill form:
   ```
   To Email:     invalid-email-format
   Subject:      Test
   Question:     Test
   ```
3. Click "Send Now"

### Expected Results
- Error message appears: "Valid email address is required"
- Form remains open
- API is NOT called
- No network request in DevTools

### Network Tab
- No POST request should appear
- Form remains with invalid data for correction

## Test 6: Multi-Email CC Field Test

### Steps
1. Open dialog
2. Click in "CC Emails" field
3. Type: `first@example.com`
4. Press Enter or comma
5. Type: `second@example.com`
6. Press Enter
7. Type: `third@example.com`
8. Press Enter
9. Fill required fields and submit
10. Check console/response

### Expected Results
- Each email appears as a chip with delete button
- All three emails are in the submitted data
- API receives: `"cc_emails": ["first@example.com", "second@example.com", "third@example.com"]`

### Console Output
```javascript
ccEmails: Array(3) [
  "first@example.com",
  "second@example.com",
  "third@example.com"
]
```

## Test 7: Rich Text Editor Test

### Steps
1. Open dialog
2. Click in "Question" field
3. Type some text
4. Select text and click Bold (B) button
5. Try other formatting options (italic, list, etc.)
6. Fill required fields and submit

### Expected Results
- Formatting toolbar appears above text area
- Bold, Italic, Lists buttons work
- Formatting is preserved in submitted HTML
- API receives question with HTML tags: `<p><strong>formatted text</strong></p>`

### Console Output
```javascript
question: "<p><strong>Formatted question</strong></p>"
```

## Test 8: File Upload Test

### Steps
1. Open dialog
2. In "Attachments" section, drag a file (< 10MB) into the drop zone
3. Or click zone to open file picker and select file
4. Verify file appears in list
5. Click delete button on file
6. Verify file is removed
7. Upload a new file and submit

### Expected Results
- File name and size display in list
- Delete button removes file from list
- Submitted data includes file information
- File metadata is preserved

### Console Output
```javascript
attachments: Array(1) [{
  name: "filename.pdf",
  size: 12345,
  type: "application/pdf"
}]
```

## Test 9: Loading State Test

### Steps
1. Open dialog
2. Fill required fields
3. Click "Send Now"
4. IMMEDIATELY observe (before API responds):
   - Button appearance
   - Form field states
   - Dialog behavior

### Expected Results
- "Send Now" button shows loading spinner
- Buttons are disabled (greyed out)
- Form fields are disabled (cannot type)
- Dialog cannot be closed
- Loader appears above dialog

### Code Check
```javascript
// Button should have disabled attribute
document.querySelector('button').disabled === true
```

## Test 10: Error Handling Test

### Steps
1. Open dialog
2. Fill required fields
3. Stop backend API (kill the uvicorn process)
4. Click "Send Now"
5. Observe error handling

### Expected Results
- Loading state displays briefly
- Error message appears: "Failed to submit RFI. Please try again." (or similar)
- Dialog remains open with form data intact
- User can correct and retry
- When API is restarted, retry works

### Console Output
```javascript
API Error: {error object}
// Shows connection error or 500 error
```

## Test 11: Form Reset After Success Test

### Steps
1. Submit RFI successfully (either draft or send)
2. Success message appears
3. Click "Open RFIFormDialog" again
4. Check if form is blank

### Expected Results
- New dialog opens with all fields empty
- Rich text editor is blank
- CC emails are cleared
- Files list is empty
- Ready for new RFI submission

## API Response Validation Checklist

When API response appears, verify it contains:

```json
{
  "id": "UUID string",
  "project_id": "test-project-001",
  "rfi_number": "string",
  "subject": "Your subject",
  "question": "Your question (may have HTML)",
  "to_email": "email@example.com",
  "to_name": "Name (if provided)",
  "cc_emails": ["email@example.com"],
  "category": "category value",
  "priority": "priority value",
  "status": "draft or sent",
  "due_date": "ISO date string (if provided)",
  "location": "Location (if provided)",
  "drawing_reference": "Reference (if provided)",
  "specification_reference": "Reference (if provided)",
  "created_at": "ISO timestamp",
  "updated_at": "ISO timestamp"
}
```

## Troubleshooting

### Issue: "Cannot find module 'rfiApi'"
- **Solution**: Ensure backend is started and API client is configured
- **Check**: `frontend/src/api/client.ts` has correct API_BASE_URL

### Issue: "401 Unauthorized"
- **Solution**: Check if auth token is required
- **Check**: Browser localStorage for authToken
- **Action**: May need to login first

### Issue: "404 Not Found" on API endpoint
- **Solution**: Backend might not have RFI endpoints
- **Check**: Ensure backend is running on port 8000
- **Verify**: `http://localhost:8000/docs` should show RFI endpoints

### Issue: API Response is 400 Bad Request
- **Solution**: Check request format matches API expectations
- **Check**: Console logs show request body
- **Verify**: Field names are snake_case: `to_email`, not `toEmail`

### Issue: Form doesn't submit (stuck in loading state)
- **Solution**: Check console for errors
- **Check**: Network tab for failed request
- **Try**: Reload page and submit again
- **Last Resort**: Check backend logs for errors

## Success Criteria

All of the following must pass:

- [ ] Test 1: Component Rendering - Dialog opens with all 12 fields
- [ ] Test 2: Form Validation - Required fields prevent submission
- [ ] Test 3: Save as Draft - Creates RFI with status='draft'
- [ ] Test 4: Send Now - Creates RFI with status='sent'
- [ ] Test 5: Email Validation - Invalid emails are rejected
- [ ] Test 6: Multi-Email CC - Multiple emails are handled correctly
- [ ] Test 7: Rich Text Editor - Formatting is preserved
- [ ] Test 8: File Upload - Files are accepted and listed
- [ ] Test 9: Loading State - Buttons/fields disabled during submission
- [ ] Test 10: Error Handling - Errors are displayed and recoverable
- [ ] Test 11: Form Reset - New dialog opens with blank form
- [ ] API returns 201 status code
- [ ] API response contains all submitted fields
- [ ] No console errors
- [ ] Network requests show correct payload format

## Next Steps

If all tests pass:
1. Mark subtask-3-3 as COMPLETED
2. Update implementation_plan.json with completion timestamp
3. Commit changes with message: "auto-claude: subtask-3-3 - Verify API integration and submission flow"

If any test fails:
1. Document the failure with error message and screenshots
2. Debug the issue
3. Fix implementation
4. Re-run tests
5. Commit fixes before marking complete
