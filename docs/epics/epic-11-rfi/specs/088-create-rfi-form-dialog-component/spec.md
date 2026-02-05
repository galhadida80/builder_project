# Create RFI Form Dialog Component

## Overview
# Create RFI Form Dialog Component

**Linear Issue:** [BUI-105](https://linear.app/builder-project/issue/BUI-105/create-rfi-form-dialog-component)
**Priority:** No priority
**Status:** Backlog


## Description

## User Story

As a user, I want to create new RFIs through a form so that I can submit questions to consultants.

## Acceptance Criteria

- [ ] Create `RFIFormDialog` component
- [ ] Form fields:
  - To email (required, email validation)
  - To name
  - CC emails (multi-input)
  - Subject (required)
  - Category dropdown (Design, Structural, MEP, etc.)
  - Priority dropdown (Low, Medium, High, Urgent)
  - Due date picker
  - Question (rich text editor)
  - Location reference
  - Drawing/specification reference
  - Attachments upload (multi-file)
- [ ] Form validation with error messages
- [ ] "Save as Draft" button
- [ ] "Send Now" button
- [ ] Loading states during submission

## Labels

frontend, component, rfi


## Workflow Type

**Type**: feature

**Rationale**: This is a new feature that adds a complete user-facing component with form handling, validation, and API integration. It introduces new functionality to the application without modifying existing features.

## Task Scope

### Services Involved
- **frontend** (primary) - React TypeScript component with MUI form integration

### This Task Will:
- [ ] Create `RFIFormDialog` component with MUI Dialog wrapper
- [ ] Implement 12 form fields with React Hook Form + Zod validation
- [ ] Integrate rich text editor (mui-tiptap) for question field
- [ ] Add multi-file upload capability using react-dropzone
- [ ] Implement dual submit actions ("Save as Draft" and "Send Now")
- [ ] Add loading states and error handling during API calls
- [ ] Install required dependencies (react-hook-form, zod, mui-tiptap, @tiptap packages)
- [ ] Create TypeScript types for RFI form data
- [ ] Integrate with existing RFI API endpoints

### Out of Scope:
- Backend API modifications (endpoints already exist)
- RFI listing or viewing components
- Email notification templates
- RFI response handling
- Database schema changes

## Service Context

### frontend

**Tech Stack:**
- Language: TypeScript
- Framework: React
- Build Tool: Vite
- UI Library: Material-UI (@mui/material 5.15.6)
- Styling: Emotion
- Key directories: src/components, src/types, src/services

**Entry Point:** `src/App.tsx`

**How to Run:**
```bash
cd frontend
npm run dev
```

**Port:** 3000

**Existing Dependencies Available:**
- @mui/material (5.15.6)
- @mui/x-date-pickers (6.19.2)
- @mui/icons-material
- react-dropzone
- dayjs
- axios

## Files to Modify

| File | Service | What to Change |
|------|---------|---------------|
| `frontend/package.json` | frontend | Add new dependencies: react-hook-form, zod, @hookform/resolvers, mui-tiptap, @tiptap/react, @tiptap/starter-kit |
| `frontend/src/components/RFI/RFIFormDialog.tsx` | frontend | Create new component file (main form dialog) |
| `frontend/src/types/rfi.ts` | frontend | Add RFI form data types and validation schema |
| `frontend/src/services/api/rfiApi.ts` | frontend | Create API service for RFI operations (if doesn't exist) or update existing |

## Files to Reference

Since the context gathering phase did not identify specific reference files, follow these established patterns in the codebase:

| Pattern | Guidance |
|---------|----------|
| MUI Dialog Components | Look for existing Dialog components in `src/components` to match styling and structure |
| Form Patterns | Search for existing form implementations using Material-UI TextField, Select components |
| API Service Pattern | Review existing API service files in `src/services/api` for axios configuration and error handling |
| File Upload Components | Check if react-dropzone is used elsewhere for consistent upload UI patterns |

## Patterns to Follow

### React Hook Form + MUI Controller Pattern

**CRITICAL**: Material-UI components do NOT support React Hook Form's `register()` method. You MUST use the `Controller` wrapper:

```typescript
import { Controller, useForm } from 'react-hook-form';
import { TextField } from '@mui/material';

<Controller
  name="fieldName"
  control={control}
  render={({ field, fieldState: { error } }) => (
    <TextField
      {...field}
      label="Field Label"
      error={!!error}
      helperText={error?.message}
      fullWidth
    />
  )}
/>
```

**Key Points:**
- Every MUI input (TextField, Select, Autocomplete, DatePicker) requires Controller
- Access validation errors via `fieldState.error`
- Use `{...field}` spread to pass value and onChange handlers

### Zod Validation Schema

```typescript
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const rfiFormSchema = z.object({
  toEmail: z.string().email('Valid email required'),
  subject: z.string().min(1, 'Subject is required'),
  ccEmails: z.array(z.string().email()).optional(),
  category: z.enum(['Design', 'Structural', 'MEP', 'Other']).optional(),
  priority: z.enum(['Low', 'Medium', 'High', 'Urgent']).optional(),
  dueDate: z.date().optional(),
  // ... other fields
});

type RFIFormData = z.infer<typeof rfiFormSchema>;

const { control, handleSubmit, formState } = useForm<RFIFormData>({
  resolver: zodResolver(rfiFormSchema),
});
```

**Key Points:**
- Define schema first, then infer TypeScript types
- Built-in validators: `.email()`, `.min()`, `.optional()`
- Automatic runtime validation on form submission

### MUI Autocomplete for Multi-Email Input (CC Field)

```typescript
<Controller
  name="ccEmails"
  control={control}
  render={({ field }) => (
    <Autocomplete
      {...field}
      multiple
      freeSolo
      options={[]} // Can provide suggestions
      renderTags={(value, getTagProps) =>
        value.map((email, index) => (
          <Chip label={email} {...getTagProps({ index })} />
        ))
      }
      renderInput={(params) => (
        <TextField {...params} label="CC Emails" placeholder="Add email..." />
      )}
      onChange={(_, data) => field.onChange(data)}
    />
  )}
/>
```

**Key Points:**
- `multiple={true}` for multi-selection
- `freeSolo={true}` allows custom email entry
- Renders as chips for visual clarity

### Rich Text Editor (mui-tiptap)

```typescript
import { RichTextEditor, useEditor } from 'mui-tiptap';
import StarterKit from '@tiptap/starter-kit';

const editor = useEditor({
  extensions: [StarterKit],
  content: '<p></p>',
});

<Controller
  name="question"
  control={control}
  render={({ field }) => (
    <RichTextEditor
      editor={editor}
      onUpdate={({ editor }) => field.onChange(editor.getHTML())}
    />
  )}
/>
```

**Key Points:**
- Auto-styled from MUI theme
- Use StarterKit for basic formatting (bold, italic, lists, headings)
- Extract HTML via `editor.getHTML()`

### Date Picker with LocalizationProvider

**REQUIRED**: Wrap DatePicker in `LocalizationProvider` at app root or component level:

```typescript
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';

<LocalizationProvider dateAdapter={AdapterDayjs}>
  <Controller
    name="dueDate"
    control={control}
    render={({ field }) => (
      <DateTimePicker
        {...field}
        label="Due Date"
        slotProps={{
          textField: {
            fullWidth: true,
            error: !!errors.dueDate,
            helperText: errors.dueDate?.message,
          },
        }}
      />
    )}
  />
</LocalizationProvider>
```

### File Upload with react-dropzone

```typescript
import { useDropzone } from 'react-dropzone';

const { getRootProps, getInputProps, acceptedFiles } = useDropzone({
  multiple: true,
  maxSize: 10485760, // 10MB
});

<Box {...getRootProps()} sx={{ border: '2px dashed', p: 2, cursor: 'pointer' }}>
  <input {...getInputProps()} />
  <Typography>Drag files here or click to upload</Typography>
</Box>
```

## Requirements

### Functional Requirements

1. **Required Field Validation**
   - Description: Validate "To Email" (with email format check) and "Subject" fields
   - Acceptance: Form cannot be submitted if required fields are empty or invalid; error messages display below fields

2. **Multi-Input CC Emails**
   - Description: Allow users to add multiple CC email addresses with chip-based UI
   - Acceptance: Users can type multiple emails, remove individual emails, and all emails are validated

3. **Category Dropdown**
   - Description: Dropdown with predefined categories (Design, Structural, MEP, Other)
   - Acceptance: Users can select one category from the dropdown list

4. **Priority Dropdown**
   - Description: Dropdown with priority levels (Low, Medium, High, Urgent)
   - Acceptance: Users can select one priority level from the dropdown list

5. **Due Date Picker**
   - Description: Date/time picker for RFI response deadline
   - Acceptance: Users can select both date and time; picker displays calendar interface

6. **Rich Text Question Editor**
   - Description: Rich text editor with formatting toolbar (bold, italic, lists, headings)
   - Acceptance: Users can format question text; HTML content is saved to backend

7. **Multi-File Attachments**
   - Description: Drag-and-drop area for uploading multiple files
   - Acceptance: Users can upload multiple files; file names display in list; files can be removed before submission

8. **Dual Submit Actions**
   - Description: Two submit buttons with different behaviors
   - Acceptance:
     - "Save as Draft": Saves RFI with status='draft' without sending email
     - "Send Now": Saves RFI with status='sent' and triggers email to recipients

9. **Loading States**
   - Description: Visual feedback during API calls
   - Acceptance: Buttons show loading spinner during submission; form fields are disabled while submitting

10. **Form Reset After Success**
    - Description: Clear form and close dialog after successful submission
    - Acceptance: Dialog closes and all fields reset to initial state after API success response

### Edge Cases

1. **Invalid Email Format in CC Field** - Display validation error message; prevent submission
2. **File Upload Size Limit** - Reject files over 10MB; show error message
3. **Network Error During Submission** - Display user-friendly error message; allow retry
4. **Empty Optional Fields** - Allow submission with null/empty values for optional fields
5. **Duplicate CC Emails** - Remove duplicates automatically before submission
6. **Dialog Close with Unsaved Changes** - Prompt user for confirmation if form is dirty

## Implementation Notes

### DO
- Use `Controller` from react-hook-form for ALL MUI components
- Define Zod schema for type-safe validation
- Wrap DatePicker in `LocalizationProvider` with `AdapterDayjs`
- Use `freeSolo={true}` on Autocomplete for custom email entry
- Show loading state by disabling form during submission
- Reset form with `reset()` method after successful submission
- Use `formState.errors` to access and display validation errors
- Extract rich text content with `editor.getHTML()`
- Upload files via FormData to backend API

### DON'T
- Don't use `register()` directly with MUI components (won't work)
- Don't forget to install new dependencies before implementation
- Don't skip email validation on CC field
- Don't allow form submission while validation errors exist
- Don't forget to handle API errors gracefully
- Don't commit sensitive test data or API keys
- Don't skip loading states (poor UX)
- Don't use inline styles; prefer MUI `sx` prop or styled components

## Development Environment

### Install New Dependencies

```bash
cd frontend
npm install react-hook-form zod @hookform/resolvers
npm install mui-tiptap @tiptap/react @tiptap/starter-kit
```

### Start Services

```bash
# Terminal 1: Start backend (for API integration)
cd backend
python -m uvicorn app.main:app --reload --port 8000

# Terminal 2: Start frontend
cd frontend
npm run dev
```

### Service URLs
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

### Required Environment Variables
- `VITE_API_URL`: http://localhost:8000/api/v1 (in frontend/.env)

### API Endpoints to Use

**Create RFI (Draft):**
```
POST /api/v1/projects/{project_id}/rfis
Body: { ...form data, status: 'draft' }
```

**Send RFI:**
```
POST /api/v1/projects/{project_id}/rfis
Body: { ...form data, status: 'sent' }
```

Note: Backend endpoints already exist at `app/api/v1/rfis.py`

## Success Criteria

The task is complete when:

1. [ ] `RFIFormDialog` component renders with all 12 form fields
2. [ ] Required field validation prevents submission with missing/invalid data
3. [ ] Rich text editor displays with formatting toolbar and allows text editing
4. [ ] Multi-file upload accepts files via drag-and-drop and click
5. [ ] "Save as Draft" button creates RFI with status='draft' via API
6. [ ] "Send Now" button creates RFI with status='sent' via API
7. [ ] Loading spinner displays during API calls; buttons are disabled
8. [ ] Form resets and dialog closes after successful submission
9. [ ] Error messages display for validation failures and API errors
10. [ ] No console errors in browser developer tools
11. [ ] Component follows TypeScript best practices with proper type definitions
12. [ ] All new dependencies are added to package.json

## QA Acceptance Criteria

**CRITICAL**: These criteria must be verified by the QA Agent before sign-off.

### Unit Tests
| Test | File | What to Verify |
|------|------|----------------|
| Form Validation | `frontend/src/components/RFI/RFIFormDialog.test.tsx` | Required fields show errors when empty; email validation works |
| Submit Handlers | `frontend/src/components/RFI/RFIFormDialog.test.tsx` | Draft button calls API with status='draft'; Send button calls API with status='sent' |
| Loading States | `frontend/src/components/RFI/RFIFormDialog.test.tsx` | Form disables during submission; loading spinner displays |

### Integration Tests
| Test | Services | What to Verify |
|------|----------|----------------|
| RFI API Integration | frontend ↔ backend | POST request to `/projects/{id}/rfis` succeeds with correct payload structure |
| File Upload Flow | frontend ↔ backend | Files are uploaded as FormData; backend receives and processes files |

### End-to-End Tests
| Flow | Steps | Expected Outcome |
|------|-------|------------------|
| Create Draft RFI | 1. Open dialog 2. Fill required fields 3. Click "Save as Draft" | RFI created with status='draft'; dialog closes; success message displays |
| Send RFI Immediately | 1. Open dialog 2. Fill all fields 3. Upload file 4. Click "Send Now" | RFI created with status='sent'; email sent to recipients; dialog closes |
| Validation Errors | 1. Open dialog 2. Click "Send Now" without filling fields | Error messages display under required fields; form does not submit |
| Multi-Email CC | 1. Add 3 emails to CC field 2. Remove 1 email 3. Submit | Correct 2 emails sent in API payload |

### Browser Verification (Frontend)
| Page/Component | URL | Checks |
|----------------|-----|--------|
| RFI Form Dialog | Open dialog from RFI listing page | Dialog opens; all fields render correctly; no visual glitches |
| Rich Text Editor | Click into Question field | Toolbar displays; formatting buttons work (bold, italic, lists) |
| File Upload Area | Drag file into upload zone | File name displays in list; remove button works |
| Date Picker | Click Due Date field | Calendar popup opens; date selection updates field value |
| Autocomplete CC | Type email in CC field | Chip displays after entering email; remove icon works |

### Database Verification (Backend)
| Check | Query/Command | Expected |
|-------|---------------|----------|
| RFI Created | `SELECT * FROM rfis WHERE id = <new_rfi_id>` | Row exists with correct status, subject, to_email |
| Attachments Saved | `SELECT * FROM rfi_attachments WHERE rfi_id = <rfi_id>` | Attachment records exist with correct file paths |

### QA Sign-off Requirements
- [ ] All unit tests pass with >80% code coverage for new component
- [ ] Integration test confirms API contract matches frontend expectations
- [ ] End-to-end test for "Send Now" flow completes successfully
- [ ] Browser verification shows no visual bugs or console errors
- [ ] Database verification confirms RFI and attachments are persisted correctly
- [ ] No regressions in existing RFI listing or viewing functionality
- [ ] Code follows React/TypeScript/MUI conventions established in project
- [ ] No security vulnerabilities (e.g., XSS via rich text editor, file upload exploits)
- [ ] Form is accessible (keyboard navigation, screen reader compatible)
- [ ] Performance is acceptable (form submission < 2 seconds under normal network conditions)
