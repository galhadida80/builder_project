# Specification: Add Form Validation to Areas Creation

## Overview

Add comprehensive client-side form validation to the Areas creation form to prevent invalid data submission. The existing AreasPage.tsx form currently accepts invalid inputs including empty required fields, negative numbers, and improperly formatted area codes. This enhancement will implement field-level validation with inline error messages to provide immediate user feedback and ensure data integrity before submission to the backend API.

## Workflow Type

**Type**: feature

**Rationale**: This is a feature enhancement that adds new validation functionality to an existing form. While it fixes validation gaps, it introduces new validation logic, error display mechanisms, and user feedback patterns, making it a feature addition rather than a simple bug fix or refactoring task.

## Task Scope

### Services Involved
- **frontend** (primary) - React frontend where the Areas form resides

### This Task Will:
- [ ] Add required field validation for area name
- [ ] Add format validation for area code
- [ ] Add uniqueness validation for area code (client-side check against existing areas)
- [ ] Add integer validation for floor number (no decimals allowed)
- [ ] Add positive number validation for total units (reject zero and negative values)
- [ ] Implement inline error message display for all validation failures
- [ ] Prevent form submission when validation errors exist
- [ ] Add real-time validation feedback (on blur or on change)

### Out of Scope:
- Backend validation logic (API already has validation, this is client-side only)
- Modifying the Areas API endpoints
- Adding validation to Areas edit/update forms (only creation form)
- Form validation library integration (will use native React state management with MUI error props)
- Unit tests (if not already established in the codebase)

## Service Context

### Frontend

**Tech Stack:**
- Language: TypeScript
- Framework: React
- Build Tool: Vite
- UI Library: Material-UI (@mui/material)
- Styling: Emotion (@emotion/react, @emotion/styled)
- HTTP Client: Axios
- Key directories: src/

**Entry Point:** `src/App.tsx`

**How to Run:**
```bash
cd frontend
npm run dev
```

**Port:** 3000

**Relevant Dependencies:**
- @mui/material - UI components with built-in error handling props
- @mui/icons-material - Icons for validation feedback
- react-router-dom - Routing
- axios - API calls for uniqueness validation

## Files to Modify

| File | Service | What to Change |
|------|---------|---------------|
| `frontend/src/pages/AreasPage.tsx` | frontend | Add validation state management, validation functions, error display logic, and form submission guards |

## Files to Reference

**Note:** The context gathering phase did not identify specific reference files. During implementation, the developer should:
- Search for existing form validation patterns in the codebase (e.g., grep for "error" or "validation" in other page components)
- Review other page components that use MUI TextField with error props
- Check if validation utility functions already exist in a utils/ directory
- Look at the Areas API response schema to understand area code format requirements

## Patterns to Follow

### MUI TextField Error Pattern

Material-UI TextField components support built-in error display:

```tsx
<TextField
  label="Field Name"
  value={fieldValue}
  onChange={handleChange}
  error={Boolean(fieldError)}
  helperText={fieldError || ''}
  required
/>
```

**Key Points:**
- Use `error` prop to indicate validation failure
- Use `helperText` prop to display the error message
- Boolean conversion ensures proper error state handling

### React State Management for Validation

```tsx
const [formData, setFormData] = useState({
  name: '',
  code: '',
  floorNumber: '',
  totalUnits: ''
});

const [errors, setErrors] = useState({
  name: '',
  code: '',
  floorNumber: '',
  totalUnits: ''
});

const validateField = (fieldName: string, value: any) => {
  let error = '';
  // Validation logic here
  setErrors(prev => ({ ...prev, [fieldName]: error }));
  return error === '';
};
```

**Key Points:**
- Separate state for form data and errors
- Validation functions return boolean success status
- Error messages stored as strings for direct display in helperText

## Requirements

### Functional Requirements

1. **Area Name Validation**
   - Description: Area name must not be empty
   - Validation: Required field check
   - Error Message: "Area name is required"
   - Acceptance: Form shows error when field is empty and user attempts to submit or moves focus away

2. **Area Code Format Validation**
   - Description: Area code must follow a specific format (format to be determined by examining API schema or existing area codes)
   - Validation: Pattern matching (e.g., alphanumeric, specific length)
   - Error Message: "Area code must be in format [FORMAT]" (actual format TBD during implementation)
   - Acceptance: Form shows error when code doesn't match expected format

3. **Area Code Uniqueness Validation**
   - Description: Area code must be unique within the project
   - Validation: Check against existing areas in the project (client-side check using loaded areas data)
   - Error Message: "Area code already exists in this project"
   - Acceptance: Form shows error when duplicate code is entered

4. **Floor Number Integer Validation**
   - Description: Floor number must be a valid integer (no decimals)
   - Validation: Integer check (no decimal points, must be whole number)
   - Error Message: "Floor number must be a whole number"
   - Acceptance: Form shows error when user enters decimal values like "3.5"

5. **Total Units Positive Validation**
   - Description: Total units must be a positive number greater than zero
   - Validation: Positive integer check (value > 0)
   - Error Message: "Total units must be greater than zero"
   - Acceptance: Form shows error when user enters 0, negative values, or non-numeric input

6. **Inline Error Display**
   - Description: Validation errors must appear directly beneath the relevant form field
   - Implementation: Use MUI TextField helperText prop with error styling
   - Acceptance: Errors visible in red text below each field when validation fails

7. **Form Submission Guard**
   - Description: Prevent form submission when any validation errors exist
   - Implementation: Disable submit button or show alert when validation fails
   - Acceptance: Submit action only proceeds when all fields are valid

### Edge Cases

1. **Empty String vs Null Handling** - Treat empty strings as invalid for required fields, handle both empty string and null/undefined states
2. **Whitespace-Only Input** - Trim whitespace from text fields before validation; "   " should fail required field validation
3. **Leading Zeros in Numbers** - Decide if "007" is valid for floor number or total units
4. **Very Large Numbers** - Set reasonable max limits for floor number and total units (e.g., max 999 floors, max 9999 units)
5. **Special Characters in Area Code** - Define allowed character set (alphanumeric only? hyphens/underscores allowed?)
6. **Case Sensitivity for Area Code** - Determine if "ABC-123" and "abc-123" are considered duplicates
7. **Validation Timing** - Validate on blur (when user leaves field) to avoid annoying real-time errors while typing
8. **Async Validation for Uniqueness** - If uniqueness check requires API call, handle loading state and potential network errors

## Implementation Notes

### DO
- Follow MUI TextField error/helperText pattern for consistent error display
- Implement validation on onBlur event to avoid interrupting user input flow
- Store all validation errors in a centralized state object
- Disable the submit button when errors exist (add `disabled={hasErrors}` to Button)
- Use TypeScript interfaces for formData and errors state to ensure type safety
- Check if the codebase already has a validation utilities file to avoid code duplication
- Examine existing areas data structure to understand area code format requirements
- Test with various invalid inputs to ensure all edge cases are handled

### DON'T
- Don't validate on every keystroke (onBlur is better UX for most fields)
- Don't create a new validation library when simple inline validation suffices
- Don't forget to clear error messages when the user corrects the input
- Don't allow form submission if any validation errors exist
- Don't use alert() for error messages; use inline error display only
- Don't hardcode area code format without checking existing data or API documentation

## Development Environment

### Start Services

```bash
# Start frontend development server
cd frontend
npm run dev

# Backend should already be running for API calls
# If not running:
cd backend
# Check backend README for start command (likely uvicorn or docker-compose)
```

### Service URLs
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs

### Required Environment Variables
- Check `frontend/.env` or `frontend/.env.example` for required variables
- Likely includes `VITE_API_BASE_URL=http://localhost:8000` or similar

## Success Criteria

The task is complete when:

1. [ ] Area name field shows "required" error when left empty and user exits field
2. [ ] Area code field validates format and shows specific format error when invalid
3. [ ] Area code field validates uniqueness and shows "already exists" error for duplicates
4. [ ] Floor number field rejects decimal values and shows integer-only error
5. [ ] Total units field rejects zero, negative values, and shows positive-only error
6. [ ] All error messages display inline beneath their respective fields using MUI helperText
7. [ ] Form submission is blocked when any validation errors exist
8. [ ] Error messages clear when user corrects the invalid input
9. [ ] No console errors appear during validation or form interaction
10. [ ] Existing tests still pass (if tests exist)
11. [ ] Form successfully submits when all validations pass
12. [ ] Manual browser testing confirms all validation rules work as expected

## QA Acceptance Criteria

**CRITICAL**: These criteria must be verified by the QA Agent before sign-off.

### Unit Tests
| Test | File | What to Verify |
|------|------|----------------|
| Area name required validation | `frontend/src/pages/AreasPage.test.tsx` (if exists) | Test that empty area name triggers error message |
| Floor number integer validation | `frontend/src/pages/AreasPage.test.tsx` (if exists) | Test that decimal values are rejected |
| Total units positive validation | `frontend/src/pages/AreasPage.test.tsx` (if exists) | Test that zero and negative values are rejected |
| Area code uniqueness validation | `frontend/src/pages/AreasPage.test.tsx` (if exists) | Test that duplicate area codes trigger error |

**Note:** If unit tests don't currently exist for AreasPage, QA should verify through browser testing instead.

### Integration Tests
| Test | Services | What to Verify |
|------|----------|----------------|
| Form submission with valid data | frontend ↔ backend | Valid form data successfully creates area via POST /projects/{project_id}/areas |
| Form submission blocked on validation errors | frontend | Form submit button disabled or submission prevented when validation errors exist |

### End-to-End Tests
| Flow | Steps | Expected Outcome |
|------|-------|------------------|
| Create area with missing name | 1. Navigate to Areas page 2. Leave area name empty 3. Fill other fields 4. Click submit or tab away | Error message "Area name is required" appears below name field |
| Create area with decimal floor | 1. Navigate to Areas page 2. Enter "3.5" in floor number 3. Tab away | Error message "Floor number must be a whole number" appears |
| Create area with negative units | 1. Navigate to Areas page 2. Enter "-5" in total units 3. Tab away | Error message "Total units must be greater than zero" appears |
| Create area with duplicate code | 1. Navigate to Areas page 2. Enter area code that already exists 3. Tab away | Error message "Area code already exists" appears |
| Successfully create valid area | 1. Fill all fields with valid data 2. Click submit | Area is created, form resets or navigates away, no errors shown |

### Browser Verification (Frontend)
| Page/Component | URL | Checks |
|----------------|-----|--------|
| Areas Page - Creation Form | `http://localhost:3000/areas` (or wherever AreasPage is routed) | 1. All input fields render correctly 2. Error messages appear in red below fields when validation fails 3. Error messages clear when corrected 4. Submit button is disabled/enabled based on validation state |
| Areas Page - Validation Behavior | `http://localhost:3000/areas` | 1. Try submitting empty form - see required errors 2. Enter invalid data - see format errors 3. Enter valid data - see successful submission 4. Check console for errors (should be none) |

### Database Verification (if applicable)
| Check | Query/Command | Expected |
|-------|---------------|----------|
| Valid area created in DB | Query areas table for newly created area | Area exists with correct data |
| Invalid area NOT created | Attempt to submit invalid form, check DB | No new area record created |

**Note:** Database verification assumes backend validation also exists. This task focuses on client-side validation only.

### QA Sign-off Requirements
- [ ] All validation rules function correctly (name required, code format/unique, floor integer, units positive)
- [ ] Inline error messages display properly using MUI helperText
- [ ] Error messages clear when user corrects input
- [ ] Form submission is blocked when errors exist
- [ ] Form submission succeeds when all data is valid
- [ ] No console errors during validation or form interaction
- [ ] No regressions in existing Areas functionality (viewing, listing areas still works)
- [ ] Code follows established React/TypeScript/MUI patterns
- [ ] No security vulnerabilities introduced (e.g., XSS in error messages)
- [ ] Browser testing confirms all flows in E2E test table above
- [ ] Validation works consistently across different browsers (Chrome, Firefox, Safari if applicable)
