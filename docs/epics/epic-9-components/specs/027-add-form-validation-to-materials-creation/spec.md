# Specification: Add Form Validation to Materials Creation

## Overview

This task enhances the Materials creation form with proper validation to prevent invalid data submission. The MaterialsPage.tsx currently has basic validation for name and quantity, but lacks validation for delivery dates in the past. This spec adds a warning system for past delivery dates while maintaining existing validation patterns established in the codebase.

## Workflow Type

**Type**: feature

**Rationale**: This is adding new validation functionality (delivery date warning) to an existing form. While the form already has some validation in place, the missing delivery date validation represents a new feature enhancement that improves data quality and user experience.

## Task Scope

### Services Involved
- **frontend** (primary) - React/TypeScript application with Material-UI components

### This Task Will:
- [x] Add validation helper function for checking if a date is in the past
- [x] Extend validateMaterialForm to accept and validate expectedDelivery parameter
- [x] Display warning (non-blocking) when delivery date is in the past
- [x] Maintain existing validation for name (required), quantity (positive), and notes (length)
- [x] Ensure all validation errors display inline with clear, user-friendly messages

### Out of Scope:
- Backend validation (this is frontend-only)
- Changing validation logic for name or quantity (already implemented correctly)
- Adding new fields to the Materials form
- Modifying API contracts or database schemas

## Service Context

### Frontend

**Tech Stack:**
- Language: TypeScript
- Framework: React 18+ with Vite
- UI Library: Material-UI (MUI)
- Styling: Emotion (via MUI)
- Key directories:
  - `src/pages/` - Page components
  - `src/utils/` - Utility functions including validation
  - `src/api/` - API client functions

**Entry Point:** `src/App.tsx`

**How to Run:**
```bash
cd frontend
npm run dev
```

**Port:** 3000

**Development URL:** http://localhost:3000

## Files to Modify

| File | Service | What to Change |
|------|---------|---------------|
| `frontend/src/utils/validation.ts` | frontend | Add `validatePastDate` helper function and extend `validateMaterialForm` to accept `expectedDelivery` parameter |
| `frontend/src/pages/MaterialsPage.tsx` | frontend | Update validation call to include `expectedDelivery`, display warning on the date field using error/helperText props |

## Files to Reference

These files show patterns to follow:

| File | Pattern to Copy |
|------|----------------|
| `frontend/src/pages/MaterialsPage.tsx` | Existing validation pattern: error state management, inline error display with TextField error/helperText props |
| `frontend/src/utils/validation.ts` | Validation helper structure: validateMaterialForm, validatePositiveNumber, hasErrors patterns |
| `frontend/src/pages/EquipmentPage.tsx` | Similar form validation implementation for reference |

## Patterns to Follow

### Validation Helper Pattern

From `frontend/src/utils/validation.ts`:

```typescript
export const validatePositiveNumber = (value: number | undefined | null, fieldName: string): string | null => {
  if (value !== undefined && value !== null && value < 0) {
    return `${fieldName} must be a positive number`
  }
  return null
}
```

**Key Points:**
- Return `null` if valid, return error message string if invalid
- Accept `undefined | null` for optional fields
- Use descriptive, user-friendly error messages
- Field name should be passed as parameter for reusability

### Form Validation Pattern

From `frontend/src/pages/MaterialsPage.tsx` (lines 111-117):

```typescript
const validationErrors = validateMaterialForm({
  name: formData.name,
  notes: formData.notes,
  quantity: formData.quantity ? parseFloat(formData.quantity) : undefined
})
setErrors(validationErrors)
if (hasErrors(validationErrors)) return
```

**Key Points:**
- Call validation function before save
- Store errors in state
- Use `hasErrors()` to check if submission should be blocked
- Parse string inputs to appropriate types before validation

### Inline Error Display Pattern

From `frontend/src/pages/MaterialsPage.tsx` (lines 296-300):

```typescript
<TextField
  fullWidth
  label="Quantity"
  type="number"
  margin="normal"
  value={formData.quantity}
  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
  error={!!errors.quantity}
  helperText={errors.quantity}
  inputProps={{ min: 0, max: 999999999 }}
/>
```

**Key Points:**
- Use `error` prop with boolean value (`!!errors.fieldName`)
- Use `helperText` prop to display the error message
- Material-UI automatically styles error states with red color
- Helper text appears below the field

## Requirements

### Functional Requirements

1. **Past Delivery Date Warning**
   - Description: When user selects a delivery date in the past, show a warning message
   - Acceptance: Warning message appears in yellow/warning style below the Expected Delivery Date field when a past date is selected
   - Note: This should be a WARNING, not a blocking error - users can still submit with past dates

2. **Maintain Existing Validations**
   - Description: All current validations must continue working
   - Acceptance:
     - Material name required validation works (blocking error)
     - Quantity positive number validation works (blocking error)
     - Notes length validation works (blocking error)
     - All error messages display inline

3. **Non-Blocking Warning System**
   - Description: Past date warnings should inform but not prevent submission
   - Acceptance: Form can be submitted even with delivery date in the past (warning shown but not blocking)

### Edge Cases

1. **No Date Provided** - If expectedDelivery is empty/undefined, don't show warning (date is optional)
2. **Today's Date** - Today should be considered valid (not in the past)
3. **Invalid Date Format** - Handle gracefully if date string is malformed
4. **Future Dates** - No warning should appear for future dates

## Implementation Notes

### DO
- Follow the existing validation pattern structure (validateXXX functions returning ValidationError)
- Use the same inline error display pattern with TextField error/helperText props
- Reuse existing validation utilities and patterns from validation.ts
- Make the past date check a WARNING (non-blocking) since legitimate scenarios exist for past dates
- Check date comparison using native Date objects (new Date())
- Consider timezone implications when comparing dates

### DON'T
- Create a new validation pattern - use the existing structure
- Block form submission for past dates (warning only, not error)
- Modify existing validation logic for name, quantity, or notes
- Change the signature of validateMaterialForm in a breaking way (add optional parameter)

### Implementation Strategy

1. **Add validation helper** (validation.ts):
   ```typescript
   export const validatePastDate = (value: string | undefined | null, fieldName: string): string | null => {
     if (!value) return null // Optional field
     const selectedDate = new Date(value)
     const today = new Date()
     today.setHours(0, 0, 0, 0) // Compare dates only, not times

     if (selectedDate < today) {
       return `Warning: ${fieldName} is in the past`
     }
     return null
   }
   ```

2. **Extend validateMaterialForm** (validation.ts):
   ```typescript
   export const validateMaterialForm = (data: {
     name?: string;
     notes?: string;
     quantity?: number;
     expectedDelivery?: string; // Add this parameter
   }): ValidationError => {
     const errors: ValidationError = {}

     errors.name = validateRequired(data.name, 'Material Name')
       || validateMinLength(data.name, VALIDATION.MIN_NAME_LENGTH, 'Material Name')
       || validateMaxLength(data.name, VALIDATION.MAX_NAME_LENGTH, 'Material Name')

     errors.notes = validateMaxLength(data.notes, VALIDATION.MAX_NOTES_LENGTH, 'Notes')
     errors.quantity = validatePositiveNumber(data.quantity, 'Quantity')
     errors.expectedDelivery = validatePastDate(data.expectedDelivery, 'Expected Delivery Date') // Add this

     return errors
   }
   ```

3. **Update MaterialsPage.tsx validation call** (around line 111):
   ```typescript
   const validationErrors = validateMaterialForm({
     name: formData.name,
     notes: formData.notes,
     quantity: formData.quantity ? parseFloat(formData.quantity) : undefined,
     expectedDelivery: formData.expectedDelivery // Add this
   })
   ```

4. **Update TextField for expectedDelivery** (around line 314):
   ```typescript
   <TextField
     fullWidth
     label="Expected Delivery Date"
     type="date"
     margin="normal"
     InputLabelProps={{ shrink: true }}
     value={formData.expectedDelivery}
     onChange={(e) => setFormData({ ...formData, expectedDelivery: e.target.value })}
     error={!!errors.expectedDelivery}
     helperText={errors.expectedDelivery}
   />
   ```

## Development Environment

### Start Services

```bash
# Frontend
cd frontend
npm install
npm run dev

# Backend (if testing API integration)
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Service URLs
- Frontend: http://localhost:3000
- Backend: http://localhost:8000
- Backend API Docs: http://localhost:8000/docs

### Required Environment Variables
- Frontend: None required for basic development
- Backend: Check `.env.example` for database and storage configuration

## Success Criteria

The task is complete when:

1. [x] Past delivery date validation helper function exists in validation.ts
2. [x] validateMaterialForm accepts and validates expectedDelivery parameter
3. [x] Warning message displays below Expected Delivery Date field when past date selected
4. [x] Warning is styled appropriately (shows with error prop but doesn't block submission)
5. [x] Form can still be submitted with past delivery dates (warning only)
6. [x] All existing validations (name, quantity, notes) still work correctly
7. [x] No console errors in browser developer tools
8. [x] TypeScript compilation passes with no errors
9. [x] Manual testing confirms all validation scenarios work

## QA Acceptance Criteria

**CRITICAL**: These criteria must be verified by the QA Agent before sign-off.

### Unit Tests
| Test | File | What to Verify |
|------|------|----------------|
| validatePastDate - past date | `frontend/src/utils/validation.ts` | Returns warning message when date is in the past |
| validatePastDate - future date | `frontend/src/utils/validation.ts` | Returns null when date is in the future |
| validatePastDate - today | `frontend/src/utils/validation.ts` | Returns null for today's date |
| validatePastDate - empty | `frontend/src/utils/validation.ts` | Returns null when date is undefined/null |
| validateMaterialForm - with expectedDelivery | `frontend/src/utils/validation.ts` | Validates expectedDelivery field correctly |

### Integration Tests
| Test | Services | What to Verify |
|------|----------|----------------|
| Material creation with past date | frontend ↔ backend | Material can be created with past delivery date (warning shown but not blocking) |
| Material creation validation | frontend ↔ backend | Required field validation blocks submission when name is empty |
| Material creation validation | frontend ↔ backend | Negative quantity validation blocks submission |

### End-to-End Tests
| Flow | Steps | Expected Outcome |
|------|-------|------------------|
| Create material - happy path | 1. Open Materials page 2. Click "Add Material" 3. Fill all fields with valid data 4. Click save | Material created successfully, no errors displayed |
| Create material - empty name | 1. Open Materials page 2. Click "Add Material" 3. Leave name empty 4. Fill other fields 5. Click save | Error message "Material Name is required" appears, form not submitted |
| Create material - negative quantity | 1. Open Materials page 2. Click "Add Material" 3. Fill name 4. Enter -10 for quantity 5. Click save | Error message "Quantity must be a positive number" appears, form not submitted |
| Create material - past delivery date | 1. Open Materials page 2. Click "Add Material" 3. Fill all fields 4. Select yesterday's date for delivery 5. Click save | Warning "Expected Delivery Date is in the past" appears, but material IS created successfully |
| Create material - future delivery date | 1. Open Materials page 2. Click "Add Material" 3. Fill all fields 4. Select tomorrow's date 5. Click save | No warning, material created successfully |

### Browser Verification (if frontend)
| Page/Component | URL | Checks |
|----------------|-----|--------|
| Materials Page | `http://localhost:3000/projects/{projectId}/materials` | ✓ Materials list loads ✓ "Add Material" button works ✓ Form dialog opens |
| Materials Form | `http://localhost:3000/projects/{projectId}/materials` (dialog) | ✓ All fields present ✓ Validation errors display inline ✓ Past date warning appears in yellow/warning style ✓ Form submits with valid data |
| Console | Browser DevTools Console | ✓ No console errors ✓ No TypeScript compilation errors ✓ No React warnings |

### Database Verification (if applicable)
| Check | Query/Command | Expected |
|-------|---------------|----------|
| Material saved with past date | Query materials table for newly created material | Material record exists with past expectedDelivery date |
| Material name validation | Attempt to create material with empty name via API | API returns validation error (backend validation) |

### QA Sign-off Requirements
- [x] All unit tests pass (validation helpers)
- [x] All integration tests pass (form submission with various validation states)
- [x] All E2E tests pass (user flows for creating materials with different validation scenarios)
- [x] Browser verification complete - form displays and validates correctly
- [x] Database state verified - materials saved correctly with past dates
- [x] No regressions in existing functionality (existing validations still work)
- [x] Code follows established patterns (validation helper structure, inline error display)
- [x] No security vulnerabilities introduced (input sanitization already exists)
- [x] TypeScript compilation passes with no errors
- [x] Warning styling is appropriate (distinguishable from blocking errors)
- [x] User experience is smooth (validation messages are clear and helpful)

## Implementation Plan Preview

**Phase 1**: Update validation.ts
- Add validatePastDate helper function
- Extend validateMaterialForm to accept expectedDelivery
- Export new validation function

**Phase 2**: Update MaterialsPage.tsx
- Pass expectedDelivery to validateMaterialForm
- Add error/helperText props to expectedDelivery TextField
- Test in browser

**Phase 3**: QA Verification
- Manual testing of all validation scenarios
- Verify warning vs blocking error behavior
- Check console for errors
- Confirm existing validations still work

---

**Linear Issue**: [BUI-10](https://linear.app/builder-project/issue/BUI-10/add-form-validation-to-materials-creation)
**Priority**: High
**Status**: Backlog → In Progress
