# QA Fix Request

**Status**: REJECTED
**Date**: 2026-01-29T08:55:00Z
**QA Session**: 1

---

## Critical Issues to Fix

### 1. Field Name Mismatch in validateEquipmentForm
**Severity**: CRITICAL
**Problem**: The validation function uses `serial_number` (snake_case) but the formData and UI use `serialNumber` (camelCase). This causes validation to never run.

**Location**: `frontend/src/utils/validation.ts` lines 95-103

**Current Code**:
```typescript
export const validateEquipmentForm = (data: {
  name?: string;
  notes?: string;
  serial_number?: string  // ❌ WRONG - doesn't match formData
}): ValidationError => {
  const errors: ValidationError = {}

  errors.name = validateRequired(data.name, 'Equipment Name')
    || validateMinLength(data.name, VALIDATION.MIN_NAME_LENGTH, 'Equipment Name')
    || validateMaxLength(data.name, VALIDATION.MAX_NAME_LENGTH, 'Equipment Name')

  errors.serial_number = validateSerialNumber(data.serial_number, 'Serial Number')
    || validateMaxLength(data.serial_number, VALIDATION.MAX_SERIAL_NUMBER_LENGTH, 'Serial Number')
  // ^^^ Both occurrences of serial_number need to change

  errors.notes = validateMaxLength(data.notes, VALIDATION.MAX_NOTES_LENGTH, 'Notes')

  return errors
}
```

**Required Fix**:
```typescript
export const validateEquipmentForm = (data: {
  name?: string;
  notes?: string;
  serialNumber?: string  // ✓ CORRECT - matches formData
}): ValidationError => {
  const errors: ValidationError = {}

  errors.name = validateRequired(data.name, 'Equipment Name')
    || validateMinLength(data.name, VALIDATION.MIN_NAME_LENGTH, 'Equipment Name')
    || validateMaxLength(data.name, VALIDATION.MAX_NAME_LENGTH, 'Equipment Name')

  errors.serialNumber = validateSerialNumber(data.serialNumber, 'Serial Number')
    || validateMaxLength(data.serialNumber, VALIDATION.MAX_SERIAL_NUMBER_LENGTH, 'Serial Number')
  // ^^^ Change both to serialNumber (camelCase)

  errors.notes = validateMaxLength(data.notes, VALIDATION.MAX_NOTES_LENGTH, 'Notes')

  return errors
}
```

**Changes Required**:
1. Line 95: Change `serial_number?: string` to `serialNumber?: string`
2. Line 102: Change `errors.serial_number` to `errors.serialNumber`
3. Line 102: Change `data.serial_number` (both occurrences) to `data.serialNumber`

**Why This is Critical**:
- Without this fix, `data.serial_number` is undefined when the function is called
- `validateSerialNumber(undefined, ...)` returns null (correct for optional fields)
- No validation errors are ever generated
- UI checks for `errors.serialNumber` which doesn't exist
- Result: ALL serial numbers pass validation, including "SN@123", "ABC 123", etc.

**Verification Steps**:
After making the fix:
1. Build the TypeScript project: `cd frontend && npm run build`
2. Start the dev server: `npm run dev`
3. Navigate to Equipment page and click "Add Equipment"
4. Test invalid serial "SN@123" → should show error message and red border
5. Test valid serial "SN-2024-001" → should show character count "11/100"
6. Test empty serial → should show "0/100", no error
7. Try to submit form with invalid serial → should be blocked
8. Submit with valid serial or empty → should succeed
9. Check browser console → should have no errors

**How QA Will Verify**:
QA will re-run all validation tests to confirm:
- Invalid formats trigger error messages
- Valid formats show character count
- Form submission is properly blocked for invalid input
- No console errors appear
- Pattern matches other form fields (equipment name, notes)

---

## After Fixes

Once fixes are complete:
1. **Commit** with message: `fix: correct field name mismatch in serial number validation (qa-requested)`
2. **QA will automatically re-run** all validation checks
3. **Loop continues** until approved

---

## Additional Notes

**What was done correctly**:
- The `validateSerialNumber` helper function is perfect
- The UI implementation in EquipmentPage.tsx is correct
- Pattern compliance is excellent
- Security review passed

**What needs fixing**:
- Only the field name in validateEquipmentForm function (3 changes on 2 lines)

This is a simple fix that will make the entire feature functional!
