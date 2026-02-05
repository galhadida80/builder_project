# Specification: Add Form Validation to Create Project Dialog

## Overview

Add date validation and error display to the Create Project dialog form. The form currently has validation for text fields (name, code, description, address) but is missing validation for the date fields. Users can submit forms where the end date precedes the start date, and no error messages are displayed for date-related validation failures. This task will complete the validation implementation by adding date comparison logic and displaying validation errors for the date input fields.

## Workflow Type

**Type**: feature

**Rationale**: This is a feature enhancement that adds missing validation functionality to an existing form. While it fixes a bug (invalid date logic), it implements new validation rules and UI error feedback rather than fixing broken existing functionality.

## Task Scope

### Services Involved
- **frontend** (primary) - React TypeScript application where the validation logic and UI changes will be implemented

### This Task Will:
- [ ] Add date validation function to check that end date >= start date
- [ ] Update `validateProjectForm` to accept and validate date fields
- [ ] Add error state display to Start Date and End Date input fields
- [ ] Display helpful error messages when date validation fails
- [ ] Ensure submit button is disabled when date validation errors exist

### Out of Scope:
- Backend validation (this is client-side validation only)
- Validation for other forms in the application
- Changes to the API or database schema
- Testing infrastructure setup (unit tests if time permits)

## Service Context

### Frontend

**Tech Stack:**
- Language: TypeScript
- Framework: React + Vite
- UI Library: Material-UI (MUI)
- Key directories: src/pages/, src/utils/, src/components/

**Entry Point:** `src/main.tsx`

**How to Run:**
```bash
cd frontend
npm run dev
```

**Port:** 3000

**Service URL:** http://localhost:3000

## Files to Modify

| File | Service | What to Change |
|------|---------|---------------|
| `frontend/src/utils/validation.ts` | frontend | Add `validateDateRange` function and update `validateProjectForm` to accept and validate startDate and estimatedEndDate parameters |
| `frontend/src/pages/ProjectsPage.tsx` | frontend | Add `error` and `helperText` props to Start Date and End Date TextField components (lines 365-383) to display validation errors |

## Files to Reference

These files show patterns to follow:

| File | Pattern to Copy |
|------|----------------|
| `frontend/src/utils/validation.ts` | Existing validation functions pattern (validateRequired, validateMinLength, validateCode) - shows how to return error strings or null |
| `frontend/src/pages/ProjectsPage.tsx` | Existing error display pattern (lines 319-341) - shows how TextField components use error and helperText props with validation errors |

## Patterns to Follow

### Validation Function Pattern

From `frontend/src/utils/validation.ts` (lines 27-55):

```typescript
export const validateRequired = (value: string | undefined | null, fieldName: string): string | null => {
  if (!value || value.trim() === '') {
    return `${fieldName} is required`
  }
  return null
}

export const validateCode = (value: string | undefined | null, fieldName: string): string | null => {
  if (!value) return null
  const trimmed = value.trim()
  if (!/^[A-Za-z0-9][A-Za-z0-9\-_]*[A-Za-z0-9]?$/.test(trimmed)) {
    return `${fieldName} must contain only letters, numbers, hyphens, and underscores`
  }
  return null
}
```

**Key Points:**
- Validation functions return `string | null` (error message or null if valid)
- Functions accept the value and a fieldName for error messages
- Early return pattern: return null if value is empty/undefined (optional fields)
- Use descriptive error messages that include the field name

### Form Validation Aggregation Pattern

From `frontend/src/utils/validation.ts` (lines 84-99):

```typescript
export const validateProjectForm = (data: { name?: string; code?: string; description?: string; address?: string }): ValidationError => {
  const errors: ValidationError = {}

  errors.name = validateRequired(data.name, 'Project Name')
    || validateMinLength(data.name, VALIDATION.MIN_NAME_LENGTH, 'Project Name')
    || validateMaxLength(data.name, VALIDATION.MAX_NAME_LENGTH, 'Project Name')

  errors.code = validateRequired(data.code, 'Project Code')
    || validateCode(data.code, 'Project Code')
    || validateMaxLength(data.code, VALIDATION.MAX_CODE_LENGTH, 'Project Code')

  errors.description = validateMaxLength(data.description, VALIDATION.MAX_DESCRIPTION_LENGTH, 'Description')
  errors.address = validateMaxLength(data.address, VALIDATION.MAX_ADDRESS_LENGTH, 'Address')

  return errors
}
```

**Key Points:**
- Use logical OR (`||`) to chain multiple validation rules for a single field
- First failing validation returns its error message, stopping further checks
- All fields get entries in the errors object (even if null)
- Function signature uses interface with optional properties

### Error Display Pattern

From `frontend/src/pages/ProjectsPage.tsx` (lines 319-341):

```typescript
<TextField
  fullWidth
  label="Project Name"
  margin="normal"
  required
  value={formData.name}
  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
  error={!!errors.name}
  helperText={errors.name || (formData.name.length > 0 ? `${formData.name.length}/${VALIDATION.MAX_NAME_LENGTH}` : undefined)}
  inputProps={{ maxLength: VALIDATION.MAX_NAME_LENGTH }}
/>
<TextField
  fullWidth
  label="Project Code"
  margin="normal"
  required
  disabled={!!editingProject}
  value={formData.code}
  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
  error={!!errors.code}
  helperText={editingProject ? 'Code cannot be changed' : (errors.code || 'Letters, numbers, hyphens only')}
  inputProps={{ maxLength: VALIDATION.MAX_CODE_LENGTH }}
/>
```

**Key Points:**
- Use `error={!!errors.fieldName}` to convert error string to boolean
- Use `helperText={errors.fieldName || 'default hint'}` to show error or helpful hint
- MUI TextField automatically styles error state (red border, red helper text)
- Helper text can show character count or format hints when no error exists

## Requirements

### Functional Requirements

1. **Date Range Validation**
   - Description: Validate that the estimated end date is not before the start date
   - Acceptance: If both dates are provided and end date < start date, display error message "End date must be after or equal to start date"
   - Implementation: Create new `validateDateRange` function that compares two date strings

2. **Start Date Error Display**
   - Description: Show validation errors for the Start Date field
   - Acceptance: When start date validation fails, TextField displays error state with red border and error message below
   - Implementation: Add `error` and `helperText` props to Start Date TextField (line ~367-373)

3. **End Date Error Display**
   - Description: Show validation errors for the End Date field
   - Acceptance: When end date validation fails, TextField displays error state with red border and error message below
   - Implementation: Add `error` and `helperText` props to End Date TextField (line ~374-383)

4. **Submit Button State**
   - Description: Submit button should remain disabled when date validation errors exist
   - Acceptance: With invalid date range, submit button is disabled and clicking it does nothing
   - Implementation: Already implemented via `hasErrors(validationErrors)` check on line 105

### Edge Cases

1. **Empty Date Fields** - Allow submission with no dates (dates are optional), validation only applies when both dates are provided
2. **Only Start Date Provided** - Allow submission (no end date constraint violation)
3. **Only End Date Provided** - Allow submission (no constraint to check against)
4. **Same Start and End Date** - Allow submission (dates can be equal, constraint is end >= start)
5. **Edit Mode** - Validation applies equally to both create and edit modes

## Implementation Notes

### DO
- Follow the existing validation function pattern (return string | null)
- Use the logical OR pattern for chaining validation rules
- Add date validation to the existing `validateProjectForm` function signature
- Match the error display pattern used by other TextField components
- Keep date fields optional (only validate when both dates are provided)
- Use descriptive error messages that clearly explain the constraint

### DON'T
- Don't create a separate validation state for dates - use the existing errors object
- Don't add new dependencies or external validation libraries
- Don't validate dates independently - only validate their relationship when both exist
- Don't change the form submission logic (it already checks hasErrors)
- Don't modify the backend or API (client-side validation only)

## Development Environment

### Start Services

```bash
# Terminal 1 - Frontend
cd frontend
npm run dev
```

### Service URLs
- Frontend: http://localhost:3000

### Test the Feature
1. Navigate to http://localhost:3000/projects
2. Click "New Project" button
3. Fill in required fields (name, code)
4. Set Start Date to tomorrow's date
5. Set End Date to today's date (before start date)
6. Observe error message appears below End Date field
7. Verify Submit button is disabled
8. Fix the dates so end >= start
9. Verify error disappears and Submit button is enabled

### Required Environment Variables
None required for this feature (frontend-only validation)

## Success Criteria

The task is complete when:

1. [ ] Date validation function exists that compares start and end dates
2. [ ] `validateProjectForm` function validates date fields
3. [ ] Start Date field displays validation errors when applicable
4. [ ] End Date field displays validation errors when date range is invalid
5. [ ] Error message clearly states "End date must be after or equal to start date"
6. [ ] Submit button is disabled when date validation fails
7. [ ] Form can be submitted when dates are valid or empty
8. [ ] No console errors during form interaction
9. [ ] Existing validation for other fields still works correctly
10. [ ] Browser test confirms validation works in Create and Edit modes

## QA Acceptance Criteria

**CRITICAL**: These criteria must be verified by the QA Agent before sign-off.

### Unit Tests
| Test | File | What to Verify |
|------|------|----------------|
| Date validation function | `frontend/src/utils/validation.ts` | Test validateDateRange with: (1) end date before start date (should return error), (2) end date after start date (should return null), (3) same dates (should return null), (4) empty dates (should return null) |
| Project form validation | `frontend/src/utils/validation.ts` | Test validateProjectForm includes date validation in returned errors object |

### Integration Tests
| Test | Services | What to Verify |
|------|----------|----------------|
| Form validation integration | frontend | Mock form submission with invalid date range - verify errors state is set and form is not submitted |

### End-to-End Tests
| Flow | Steps | Expected Outcome |
|------|-------|------------------|
| Create project with invalid dates | 1. Open Create Project dialog 2. Fill required fields 3. Set end date before start date 4. Click Submit | Error message displayed, form not submitted, submit button disabled |
| Create project with valid dates | 1. Open Create Project dialog 2. Fill required fields 3. Set end date after start date 4. Click Submit | No date errors, form submits successfully |
| Edit project with invalid dates | 1. Open Edit Project dialog 2. Set end date before start date 3. Click Save | Error message displayed, form not saved |

### Browser Verification (Frontend)
| Page/Component | URL | Checks |
|----------------|-----|--------|
| Projects Page - Create Dialog | `http://localhost:3000/projects` | 1. Click "New Project", 2. Fill name="Test", code="TEST", 3. Set startDate=2026-02-15, estimatedEndDate=2026-02-10, 4. Verify error shown below End Date field, 5. Verify submit button is disabled, 6. Change estimatedEndDate=2026-02-20, 7. Verify error clears, 8. Verify submit button is enabled |
| Projects Page - Edit Dialog | `http://localhost:3000/projects` | 1. Click menu on existing project, 2. Click "Edit Project", 3. Set end date before start date, 4. Verify error shown, 5. Verify save button disabled |

### Database Verification
Not applicable - client-side validation only, no database changes.

### QA Sign-off Requirements
- [ ] Date validation function returns correct error messages for invalid date ranges
- [ ] Date validation function returns null for valid date ranges
- [ ] Date validation does not interfere with optional date behavior (empty dates allowed)
- [ ] Error messages display correctly in the UI with red styling
- [ ] Submit button correctly reflects form validation state
- [ ] All existing validations continue to work (name, code, description, address)
- [ ] No console errors or warnings during form interaction
- [ ] Create mode validation works correctly
- [ ] Edit mode validation works correctly
- [ ] Browser verification complete - all checks pass
- [ ] No regressions in existing project form functionality

## Technical Implementation Details

### New Function: validateDateRange

```typescript
/**
 * Validates that end date is not before start date
 * @param startDate - Start date string (YYYY-MM-DD format)
 * @param endDate - End date string (YYYY-MM-DD format)
 * @param startLabel - Label for start date field in error message
 * @param endLabel - Label for end date field in error message
 * @returns Error message if end date is before start date, null otherwise
 */
export const validateDateRange = (
  startDate: string | undefined | null,
  endDate: string | undefined | null,
  startLabel: string = 'Start Date',
  endLabel: string = 'End Date'
): string | null => {
  // If either date is missing, no validation error (dates are optional)
  if (!startDate || !endDate) return null

  // Parse dates for comparison
  const start = new Date(startDate)
  const end = new Date(endDate)

  // Check if end date is before start date
  if (end < start) {
    return `${endLabel} must be after or equal to ${startLabel}`
  }

  return null
}
```

### Updated Function: validateProjectForm

Update the function signature and add date validation:

```typescript
export const validateProjectForm = (data: {
  name?: string;
  code?: string;
  description?: string;
  address?: string;
  startDate?: string;
  estimatedEndDate?: string;
}): ValidationError => {
  const errors: ValidationError = {}

  errors.name = validateRequired(data.name, 'Project Name')
    || validateMinLength(data.name, VALIDATION.MIN_NAME_LENGTH, 'Project Name')
    || validateMaxLength(data.name, VALIDATION.MAX_NAME_LENGTH, 'Project Name')

  errors.code = validateRequired(data.code, 'Project Code')
    || validateCode(data.code, 'Project Code')
    || validateMaxLength(data.code, VALIDATION.MAX_CODE_LENGTH, 'Project Code')

  errors.description = validateMaxLength(data.description, VALIDATION.MAX_DESCRIPTION_LENGTH, 'Description')
  errors.address = validateMaxLength(data.address, VALIDATION.MAX_ADDRESS_LENGTH, 'Address')

  // Add date validation
  errors.estimatedEndDate = validateDateRange(data.startDate, data.estimatedEndDate, 'Start Date', 'End Date')

  return errors
}
```

### Updated Date Input Fields in ProjectsPage.tsx

Change lines 365-383 from:

```typescript
<Box sx={{ display: 'flex', gap: 2 }}>
  <TextField
    fullWidth
    label="Start Date"
    type="date"
    margin="normal"
    InputLabelProps={{ shrink: true }}
    value={formData.startDate}
    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
  />
  <TextField
    fullWidth
    label="End Date"
    type="date"
    margin="normal"
    InputLabelProps={{ shrink: true }}
    value={formData.estimatedEndDate}
    onChange={(e) => setFormData({ ...formData, estimatedEndDate: e.target.value })}
  />
</Box>
```

To:

```typescript
<Box sx={{ display: 'flex', gap: 2 }}>
  <TextField
    fullWidth
    label="Start Date"
    type="date"
    margin="normal"
    InputLabelProps={{ shrink: true }}
    value={formData.startDate}
    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
    error={!!errors.startDate}
    helperText={errors.startDate}
  />
  <TextField
    fullWidth
    label="End Date"
    type="date"
    margin="normal"
    InputLabelProps={{ shrink: true }}
    value={formData.estimatedEndDate}
    onChange={(e) => setFormData({ ...formData, estimatedEndDate: e.target.value })}
    error={!!errors.estimatedEndDate}
    helperText={errors.estimatedEndDate}
  />
</Box>
```

## Dependencies

**No new dependencies required.** This implementation uses:
- Existing validation.ts patterns
- Standard JavaScript Date API
- Material-UI TextField error states (already in use)

## References

- **Linear Issue:** [BUI-6](https://linear.app/builder-project/issue/BUI-6/add-form-validation-to-create-project-dialog)
- **Priority:** Urgent
- **Component:** ProjectsPage.tsx
- **Validation Module:** validation.ts
