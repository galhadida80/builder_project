# Specification: Create Form Input Components

## Overview

Build a reusable set of form input components for the Builder project that provides a consistent API and styling across all forms. These components will wrap Material UI base components with custom styling, validation patterns, and accessibility features to streamline form development throughout the application.

## Workflow Type

**Type**: feature

**Rationale**: This task introduces new reusable components to the codebase that will enhance the form development workflow across the application. It's a foundational feature that establishes patterns for future form implementations.

## Task Scope

### Services Involved
- **frontend** (primary) - React/TypeScript service where components will be created

### This Task Will:
- [ ] Create a TextInput component for single-line text entry
- [ ] Create a TextareaInput component for multi-line text entry
- [ ] Create a SelectInput component for dropdown selections
- [ ] Create a CheckboxInput component for boolean inputs
- [ ] Create a DatePickerInput component for date selection
- [ ] Create a FileUploadInput component for file uploads
- [ ] Ensure all components support validation and error states
- [ ] Implement consistent styling using Emotion
- [ ] Add TypeScript interfaces for all component props
- [ ] Include accessibility features (ARIA labels, keyboard navigation)

### Out of Scope:
- Form state management library integration (Formik, React Hook Form, etc.)
- Backend validation logic
- Complex composite form components (e.g., address fields, credit card inputs)
- Form submission handling
- Internationalization of error messages

## Service Context

### Frontend

**Tech Stack:**
- Language: TypeScript
- Framework: React
- Build Tool: Vite
- Styling: Emotion (CSS-in-JS)
- UI Library: Material UI (@mui/material)
- Additional Libraries:
  - @mui/x-date-pickers (for date picker)
  - react-dropzone (for file upload)
  - dayjs (date manipulation)

**Entry Point:** `src/App.tsx`

**How to Run:**
```bash
npm run dev
```

**Port:** 3000

## Files to Modify

| File | Service | What to Change |
|------|---------|---------------|
| `frontend/src/components/forms/TextInput.tsx` | frontend | Create new text input component |
| `frontend/src/components/forms/TextareaInput.tsx` | frontend | Create new textarea component |
| `frontend/src/components/forms/SelectInput.tsx` | frontend | Create new select dropdown component |
| `frontend/src/components/forms/CheckboxInput.tsx` | frontend | Create new checkbox component |
| `frontend/src/components/forms/DatePickerInput.tsx` | frontend | Create new date picker component |
| `frontend/src/components/forms/FileUploadInput.tsx` | frontend | Create new file upload component |
| `frontend/src/components/forms/index.ts` | frontend | Export barrel file for all form components |
| `frontend/src/components/forms/types.ts` | frontend | Shared TypeScript interfaces for form components |

## Files to Reference

These files show patterns to follow:

| File | Pattern to Copy |
|------|----------------|
| `frontend/src/App.tsx` | TypeScript component structure and imports |
| Existing Material UI usage in codebase | Component composition with MUI |
| `frontend/package.json` | Available dependencies (@mui/material, @mui/x-date-pickers, react-dropzone) |

## Patterns to Follow

### Material UI Component Composition

The project uses Material UI as the base component library. Components should:

**Key Points:**
- Wrap Material UI components rather than building from scratch
- Use Emotion for custom styling via `styled` or `sx` prop
- Support all standard Material UI props via prop spreading
- Follow controlled component pattern for form inputs

### TypeScript Prop Interfaces

All components must have strongly typed props:

```typescript
interface TextInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  helperText?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  // ...spread Material UI TextField props
}
```

**Key Points:**
- Use optional props for non-required fields
- Include error and helperText for validation feedback
- Allow Material UI props to be passed through

### Emotion Styling

Components should use Emotion for styling consistency:

```typescript
import styled from '@emotion/styled';

const StyledTextField = styled(TextField)`
  /* Custom styles here */
`;
```

**Key Points:**
- Use the `styled` function from @emotion/styled
- Maintain theme consistency
- Support responsive design

## Requirements

### Functional Requirements

1. **TextInput Component**
   - Description: Single-line text input field
   - Props: label, value, onChange, error, helperText, placeholder, required, disabled
   - Acceptance: Can render, accept input, display errors, and handle validation states

2. **TextareaInput Component**
   - Description: Multi-line text input field
   - Props: label, value, onChange, error, helperText, placeholder, required, disabled, rows, maxRows
   - Acceptance: Supports multiple lines, auto-resizing, character count display (optional)

3. **SelectInput Component**
   - Description: Dropdown selection component
   - Props: label, value, onChange, options (array of {label, value}), error, helperText, required, disabled, multiple
   - Acceptance: Renders dropdown, handles single/multiple selection, displays selected values

4. **CheckboxInput Component**
   - Description: Boolean checkbox input
   - Props: label, checked, onChange, error, helperText, required, disabled
   - Acceptance: Toggles on/off, shows checked state, supports indeterminate state

5. **DatePickerInput Component**
   - Description: Date selection component using Material UI Date Picker
   - Props: label, value (Date or null), onChange, error, helperText, required, disabled, minDate, maxDate
   - Acceptance: Opens calendar picker, allows date selection, validates date ranges

6. **FileUploadInput Component**
   - Description: File upload component using react-dropzone
   - Props: label, value (File or File[]), onChange, error, helperText, required, disabled, accept (file types), multiple, maxSize
   - Acceptance: Drag-and-drop support, file type validation, size validation, shows selected files

### Edge Cases

1. **Validation Errors** - All components must display error messages clearly below the input
2. **Disabled State** - All components must visually indicate disabled state and prevent interaction
3. **Required Fields** - Components should show required indicator (asterisk) when required=true
4. **Empty Values** - Components should handle null/undefined values gracefully
5. **Long Text** - TextInput and SelectInput should handle overflow with ellipsis
6. **File Upload Limits** - FileUploadInput should prevent uploads exceeding maxSize
7. **Date Validation** - DatePickerInput should prevent selection outside min/max range

## Implementation Notes

### DO
- Use Material UI components as the foundation (@mui/material)
- Use @mui/x-date-pickers for the DatePickerInput component
- Use react-dropzone for FileUploadInput drag-and-drop functionality
- Implement consistent error handling across all components
- Add ARIA labels for accessibility
- Support keyboard navigation
- Export all components from `frontend/src/components/forms/index.ts`
- Create shared types in `frontend/src/components/forms/types.ts`
- Use controlled component pattern (value + onChange)

### DON'T
- Install new dependencies (all required libraries are already installed)
- Create form state management (components should be controlled by parent)
- Implement backend validation (client-side only)
- Override Material UI theme globally
- Create complex composite components in this task

## Development Environment

### Start Services

```bash
# Frontend
cd frontend
npm run dev
```

### Service URLs
- Frontend: http://localhost:3000

### Required Environment Variables
- `VITE_API_URL`: http://localhost:8000/api/v1 (optional for this task)

## Success Criteria

The task is complete when:

1. [ ] All 6 form input components are created and exported
2. [ ] Each component has TypeScript interfaces with proper typing
3. [ ] Components use Material UI and Emotion for styling
4. [ ] Error states and validation feedback work correctly
5. [ ] All components support required, disabled, and error props
6. [ ] DatePickerInput uses @mui/x-date-pickers
7. [ ] FileUploadInput uses react-dropzone for drag-and-drop
8. [ ] Components are accessible (ARIA labels, keyboard navigation)
9. [ ] No console errors or TypeScript compilation errors
10. [ ] Existing tests still pass
11. [ ] Components can be imported from `components/forms`

## QA Acceptance Criteria

**CRITICAL**: These criteria must be verified by the QA Agent before sign-off.

### Unit Tests
| Test | File | What to Verify |
|------|------|----------------|
| TextInput renders | `frontend/src/components/forms/__tests__/TextInput.test.tsx` | Component renders with label and value |
| TextInput handles onChange | `frontend/src/components/forms/__tests__/TextInput.test.tsx` | onChange callback fires with correct value |
| SelectInput renders options | `frontend/src/components/forms/__tests__/SelectInput.test.tsx` | Dropdown shows all option labels |
| CheckboxInput toggles | `frontend/src/components/forms/__tests__/CheckboxInput.test.tsx` | Checked state changes on click |
| DatePickerInput validation | `frontend/src/components/forms/__tests__/DatePickerInput.test.tsx` | Min/max date constraints work |
| FileUploadInput accepts files | `frontend/src/components/forms/__tests__/FileUploadInput.test.tsx` | Files can be dropped and onChange fires |

### Integration Tests
| Test | Services | What to Verify |
|------|----------|----------------|
| Form component integration | frontend | Components work together in a form context |
| Error state propagation | frontend | Error messages display correctly from parent state |

### End-to-End Tests
| Flow | Steps | Expected Outcome |
|------|-------|------------------|
| Fill out form | 1. Enter text 2. Select option 3. Pick date 4. Upload file | All inputs accept values and display correctly |
| Validation | 1. Leave required field empty 2. Submit form | Error messages appear on invalid fields |

### Browser Verification (if frontend)
| Page/Component | URL | Checks |
|----------------|-----|--------|
| Storybook/Demo Page | `http://localhost:3000/forms-demo` | All 6 components render correctly |
| TextInput | Demo page | Can type text, shows error state, shows required indicator |
| TextareaInput | Demo page | Multi-line input works, auto-resizes |
| SelectInput | Demo page | Dropdown opens, options selectable, shows selected value |
| CheckboxInput | Demo page | Checkbox toggles, shows checked state |
| DatePickerInput | Demo page | Calendar opens, date selectable, formatted correctly |
| FileUploadInput | Demo page | Drag-and-drop works, file preview shows, size validation works |
| Accessibility | Demo page | All components have ARIA labels, keyboard navigation works |

### Database Verification (if applicable)
Not applicable - this task is frontend-only with no database interactions.

### QA Sign-off Requirements
- [ ] All unit tests pass (`npm test`)
- [ ] All integration tests pass
- [ ] TypeScript compilation succeeds with no errors (`npm run build`)
- [ ] Browser verification complete for all 6 components
- [ ] All components accessible via keyboard
- [ ] Error states display correctly
- [ ] No console warnings or errors in browser
- [ ] Components follow Material UI design patterns
- [ ] Code follows established TypeScript conventions
- [ ] No security vulnerabilities introduced (file upload sanitization)
- [ ] Components are properly exported from index.ts
