# Specification: Add Form Validation to Equipment Creation

## Overview

This task enhances the Equipment creation form with comprehensive validation for the serial number field and ensures proper error feedback. While basic validation exists for equipment name and notes, the serial number field currently accepts any input without format validation. This enhancement will add alphanumeric format validation for serial numbers and display inline validation errors to guide users.

## Workflow Type

**Type**: feature

**Rationale**: This is a feature enhancement to an existing form. While validation infrastructure exists (validateEquipmentForm function, error state management, inline error display), it needs to be extended to cover the serial number field with format validation.

## Task Scope

### Services Involved
- **frontend** (primary) - React/TypeScript application containing the Equipment form

### This Task Will:
- [x] Add serial number format validation to `validateEquipmentForm` function
- [x] Update EquipmentPage.tsx to display serial number validation errors
- [x] Add helper text showing valid format to serial number field
- [x] Ensure form submission is blocked when serial number is invalid
- [x] Follow existing validation patterns (similar to equipment name and notes fields)

### Out of Scope:
- Backend validation changes (backend already has field length constraints)
- Adding new validation libraries (use existing validation utilities)
- Validating other equipment fields beyond serial number
- Unit tests (validation is frontend-only with low risk per complexity assessment)

## Service Context

### Frontend

**Tech Stack:**
- Language: TypeScript
- Framework: React
- Build Tool: Vite
- UI Library: Material-UI (@mui/material)
- Package Manager: npm

**Entry Point:** `src/App.tsx`

**How to Run:**
```bash
cd frontend
npm run dev
```

**Port:** 3000

**Key Dependencies:**
- React 18+ for UI components
- Material-UI for form components (TextField, Dialog)
- TypeScript for type safety

## Files to Modify

| File | Service | What to Change |
|------|---------|---------------|
| `frontend/src/utils/validation.ts` | frontend | Add `validateSerialNumber` helper function and update `validateEquipmentForm` to validate serial number format |
| `frontend/src/pages/EquipmentPage.tsx` | frontend | Add error and helperText props to serial number TextField (lines 382-387) to display validation feedback |

## Files to Reference

These files show patterns to follow:

| File | Pattern to Copy |
|------|----------------|
| `frontend/src/utils/validation.ts` | Validation helper functions (validatePhone, validateEmail, validateCode) show pattern for format validation with regex |
| `frontend/src/pages/EquipmentPage.tsx` | Equipment name field (lines 343-353) shows complete pattern for displaying validation errors with helperText and character count |
| `backend/app/schemas/equipment.py` | EquipmentBase schema (line 48) shows serial_number constraints: optional, max_length=100 |

## Patterns to Follow

### Validation Helper Function Pattern

From `frontend/src/utils/validation.ts` (lines 48-55):

```typescript
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
- Return null for empty values (serial number is optional)
- Trim whitespace before validation
- Use regex for format validation
- Return clear, user-friendly error message
- Accept fieldName parameter for reusable validation

### Form Validation Integration Pattern

From `frontend/src/utils/validation.ts` (lines 101-111):

```typescript
export const validateEquipmentForm = (data: { name?: string; notes?: string }): ValidationError => {
  const errors: ValidationError = {}

  errors.name = validateRequired(data.name, 'Equipment Name')
    || validateMinLength(data.name, VALIDATION.MIN_NAME_LENGTH, 'Equipment Name')
    || validateMaxLength(data.name, VALIDATION.MAX_NAME_LENGTH, 'Equipment Name')

  errors.notes = validateMaxLength(data.notes, VALIDATION.MAX_NOTES_LENGTH, 'Notes')

  return errors
}
```

**Key Points:**
- Chain validation helpers with || operator (returns first error or null)
- Add validated field to the function's data parameter type
- Assign validation result to errors object with field name as key

### Inline Error Display Pattern

From `frontend/src/pages/EquipmentPage.tsx` (lines 343-353):

```typescript
<TextField
  fullWidth
  label="Equipment Name"
  margin="normal"
  required
  value={formData.name}
  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
  error={!!errors.name}
  helperText={errors.name || (formData.name.length > 0 ? `${formData.name.length}/${VALIDATION.MAX_NAME_LENGTH}` : undefined)}
  inputProps={{ maxLength: VALIDATION.MAX_NAME_LENGTH }}
/>
```

**Key Points:**
- Set `error={!!errors.name}` to show red border when validation fails
- Use `helperText` to show validation error OR character count
- Priority: Show error message first, then character count when valid
- Add `inputProps={{ maxLength: ... }}` to enforce hard limit at browser level

## Requirements

### Functional Requirements

1. **Serial Number Format Validation**
   - Description: Validate that serial numbers contain only alphanumeric characters, hyphens, and underscores
   - Acceptance:
     - Valid formats: "ABC123", "SN-2024-001", "EQUIP_001"
     - Invalid formats: "SN@123", "ABC 123" (spaces), "!SERIAL"
     - Empty/null values are accepted (field is optional)
     - Validation error displays: "Serial Number must contain only letters, numbers, hyphens, and underscores"

2. **Inline Validation Feedback**
   - Description: Display validation errors directly below the serial number field
   - Acceptance:
     - Error text appears in red below the field when format is invalid
     - TextField border turns red when error exists
     - Error clears when user corrects the format
     - Helper text shows character count when no error exists

3. **Form Submission Gating**
   - Description: Prevent form submission when serial number format is invalid
   - Acceptance:
     - Existing validation in `handleSaveEquipment` (line 120) catches serial number errors
     - Form does not submit when `hasErrors(validationErrors)` returns true
     - User sees inline error messages indicating what needs to be fixed

### Edge Cases

1. **Empty Serial Number** - Allow empty values since serial number is optional (don't show error for empty field)
2. **Whitespace Handling** - Trim leading/trailing spaces before validation, but reject values with spaces in the middle
3. **Special Characters** - Only allow hyphens and underscores (no @, #, $, %, spaces, etc.)
4. **Maximum Length** - Respect 100 character limit from backend (use inputProps maxLength)

## Implementation Notes

### DO
- Follow the exact pattern from `validateCode` function for serial number validation
- Use the same regex pattern structure for alphanumeric validation with hyphens/underscores
- Add serial number field to `validateEquipmentForm` function's data type parameter
- Copy the error/helperText pattern from equipment name field to serial number field
- Test with various serial number formats to ensure validation works correctly

### DON'T
- Don't make serial number required (backend schema shows it's optional)
- Don't add a validation library dependency (use existing validation helpers)
- Don't modify backend validation (backend already has max_length constraint)
- Don't change the form's overall structure or other field validations

## Development Environment

### Start Services

```bash
# Frontend only (this is a frontend-only task)
cd frontend
npm install  # if needed
npm run dev
```

### Service URLs
- Frontend: http://localhost:3000
- Navigate to: Projects → Select Project → Equipment tab

### Required Environment Variables
No additional environment variables needed for this frontend-only validation task.

## Success Criteria

The task is complete when:

1. [x] Serial number field validates format (alphanumeric + hyphens/underscores only)
2. [x] Invalid serial numbers display clear error message below the field
3. [x] TextField shows red border when serial number is invalid
4. [x] Form submission is blocked when serial number format is invalid
5. [x] Empty serial numbers are accepted (field is optional)
6. [x] Valid serial numbers show character count helper text
7. [x] No console errors when interacting with the serial number field
8. [x] Validation pattern matches existing code style (validateCode, validatePhone, etc.)

## QA Acceptance Criteria

**CRITICAL**: These criteria must be verified by the QA Agent before sign-off.

### Unit Tests
| Test | File | What to Verify |
|------|------|----------------|
| N/A - No unit tests | N/A | Per complexity assessment: "minimal validation with unit tests if they exist" - no existing unit tests for validation utils |

### Integration Tests
| Test | Services | What to Verify |
|------|----------|----------------|
| N/A - Frontend only | frontend | No integration between services for this validation |

### End-to-End Tests
| Flow | Steps | Expected Outcome |
|------|-------|------------------|
| N/A - Manual testing sufficient | N/A | Low-risk frontend-only change per complexity assessment |

### Browser Verification (if frontend)
| Page/Component | URL | Checks |
|----------------|-----|--------|
| Equipment Page - Create Form | `http://localhost:3000/projects/{project-id}` → Equipment tab → Add Equipment | 1. Enter invalid serial "SN@123" → see error message<br>2. Enter valid serial "SN-2024-001" → no error<br>3. Leave serial empty → no error<br>4. Try to submit with invalid serial → blocked with error message<br>5. Valid serial shows character count (e.g., "11/100") |
| Equipment Page - Edit Form | `http://localhost:3000/projects/{project-id}` → Equipment tab → Edit existing equipment | Same checks as Create Form with pre-populated data |

### Database Verification (if applicable)
| Check | Query/Command | Expected |
|-------|---------------|----------|
| N/A - No database changes | N/A | Frontend-only validation, no schema changes |

### QA Sign-off Requirements
- [x] Browser verification complete (create and edit forms)
- [x] Serial number format validation working correctly:
  - [x] Valid formats accepted: "ABC123", "SN-2024-001", "EQUIP_001", empty string
  - [x] Invalid formats rejected: "SN@123", "ABC 123", "SERIAL!"
- [x] Error messages display correctly below field
- [x] TextField shows red border for errors
- [x] Form submission blocked for invalid serial numbers
- [x] Character count shows for valid serial numbers
- [x] No regressions in existing equipment name and notes validation
- [x] Code follows established validation patterns (similar to validateCode, validatePhone)
- [x] No console errors in browser DevTools
- [x] No security vulnerabilities (validation is client-side sanitization only)

## Risk Assessment

**Risk Level**: Low (per complexity assessment)

**Concerns**:
1. **Breaking existing form functionality** - Mitigated by following exact existing patterns
2. **Serial number format too restrictive** - Using permissive alphanumeric pattern (similar to validateCode)
3. **User frustration from validation** - Serial number is optional, validation only triggers if user enters a value

**Mitigation Strategy**:
- Follow existing validation patterns exactly (validateCode pattern)
- Test with various serial number formats before submitting
- Ensure validation error messages are clear and helpful
- Keep serial number optional to avoid blocking users
