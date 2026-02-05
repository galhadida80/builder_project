# Specification: Create Language Toggle UI Component

## Overview

Build a language toggle UI component with persistent state management to enable users to switch between supported languages. The component will use Material-UI for consistency with the existing design system and localStorage for client-side persistence. This lays the foundation for future internationalization (i18n) integration.

## Workflow Type

**Type**: feature

**Rationale**: This is a new UI component that adds language selection functionality to the application. It introduces new state management, UI elements, and persistence mechanisms without modifying existing features.

## Task Scope

### Services Involved
- **frontend** (primary) - React application where the language toggle component will be implemented

### This Task Will:
- [ ] Create a reusable LanguageToggle UI component using Material-UI
- [ ] Implement localStorage-based persistence for selected language
- [ ] Set up React Context for global language state management
- [ ] Add the toggle component to the application navigation/header
- [ ] Provide TypeScript type safety for language selection
- [ ] Support initial set of languages (English, Spanish)

### Out of Scope:
- Full i18n implementation (translation strings, locale files)
- Backend API for language preferences
- Translation of existing UI strings
- RTL (right-to-left) language support
- Dynamic language loading from server

## Service Context

### Frontend

**Tech Stack:**
- Language: TypeScript
- Framework: React
- UI Library: Material-UI (@mui/material)
- Styling: Emotion
- Build Tool: Vite

**Entry Point:** `src/App.tsx`

**How to Run:**
```bash
cd frontend
npm run dev
```

**Port:** 3000

**Key Dependencies:**
- `@mui/material` - UI components
- `@mui/icons-material` - Icons for toggle
- `react` - Component framework
- `react-dom` - React rendering
- `@emotion/react` - Styling engine

## Files to Modify

| File | Service | What to Change |
|------|---------|---------------|
| `frontend/src/components/LanguageToggle.tsx` | frontend | Create new component for language selection toggle |
| `frontend/src/contexts/LanguageContext.tsx` | frontend | Create new context for global language state |
| `frontend/src/hooks/useLanguage.ts` | frontend | Create custom hook for accessing language context |
| `frontend/src/types/language.ts` | frontend | Create TypeScript types for language selection |
| `frontend/src/utils/localStorage.ts` | frontend | Add localStorage utility for language persistence |
| `frontend/src/App.tsx` | frontend | Wrap app with LanguageProvider and add LanguageToggle to header/nav |

## Files to Reference

These files show patterns to follow:

| File | Pattern to Copy |
|------|----------------|
| `frontend/src/**/*.tsx` | React component structure, TypeScript patterns, MUI usage |
| `frontend/src/App.tsx` | Application structure, context provider patterns |

## Patterns to Follow

### Material-UI Component Pattern

The project uses Material-UI for all UI components. The language toggle should follow MUI patterns:

**Key Points:**
- Use MUI components (Select, Menu, IconButton, etc.)
- Follow MUI theming and styling conventions
- Use Emotion for custom styling if needed
- Ensure responsive design
- Support dark/light theme modes

### React Context Pattern

For global state management, use React Context:

```typescript
// Example Context Pattern
import React, { createContext, useContext, useState, useEffect } from 'react';

interface LanguageContextType {
  language: string;
  setLanguage: (lang: string) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<string>('en');

  // Load from localStorage on mount
  // Save to localStorage on change

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};
```

**Key Points:**
- Use TypeScript for type safety
- Load initial state from localStorage
- Persist changes to localStorage
- Provide hook for easy consumption

### LocalStorage Persistence Pattern

```typescript
// Example localStorage utility
const LANGUAGE_KEY = 'app_language';

export const getStoredLanguage = (): string | null => {
  return localStorage.getItem(LANGUAGE_KEY);
};

export const setStoredLanguage = (language: string): void => {
  localStorage.setItem(LANGUAGE_KEY, language);
};
```

**Key Points:**
- Use consistent key naming
- Handle localStorage errors gracefully
- Provide default fallback values
- Clear/validate stored values

## Requirements

### Functional Requirements

1. **Language Toggle Component**
   - Description: Interactive UI element allowing users to select from available languages
   - Acceptance: Component renders with language options, responds to user selection, updates global state

2. **State Persistence**
   - Description: Selected language persists across browser sessions and page reloads
   - Acceptance: Language choice is saved to localStorage and restored on app initialization

3. **Global Language State**
   - Description: Language preference accessible throughout the application via React Context
   - Acceptance: Any component can access current language using useLanguage hook

4. **Visual Feedback**
   - Description: Clear indication of currently selected language
   - Acceptance: Selected language is highlighted in toggle UI, icon/flag shows current selection

### Edge Cases

1. **localStorage Unavailable** - Gracefully degrade if localStorage is disabled/blocked; use in-memory fallback
2. **Invalid Stored Value** - Validate stored language against supported languages; reset to default if invalid
3. **First-Time User** - Detect browser language preference and set as default if supported
4. **Mid-Session Language Change** - Handle dynamic language switching without requiring page reload

## Implementation Notes

### DO
- Use Material-UI Select or Menu component for the toggle
- Follow existing TypeScript patterns in the project
- Add proper TypeScript types for language codes
- Use React.FC type for functional components
- Test component in isolation before integration
- Add ARIA labels for accessibility
- Support keyboard navigation (tab, enter, arrow keys)

### DON'T
- Don't create custom dropdown from scratch - use MUI components
- Don't fetch language data from API (client-side only for now)
- Don't translate existing strings in this task (out of scope)
- Don't use global variables - use React Context
- Don't hardcode component placement - make it reusable

## Development Environment

### Start Services

```bash
# Frontend only
cd frontend
npm install
npm run dev
```

### Service URLs
- Frontend: http://localhost:3000

### Required Environment Variables
- `VITE_API_URL`: http://localhost:8000/api/v1 (optional for this feature)

## Success Criteria

The task is complete when:

1. [ ] LanguageToggle component renders and displays available languages
2. [ ] Clicking/selecting a language updates the global language state
3. [ ] Selected language persists in localStorage
4. [ ] On page reload, the previously selected language is restored
5. [ ] useLanguage hook provides access to current language in any component
6. [ ] Component follows Material-UI design patterns
7. [ ] No console errors or TypeScript errors
8. [ ] Existing functionality is not broken
9. [ ] Component is accessible (keyboard navigation, ARIA labels)

## QA Acceptance Criteria

**CRITICAL**: These criteria must be verified by the QA Agent before sign-off.

### Unit Tests
| Test | File | What to Verify |
|------|------|----------------|
| LanguageContext Provider | `frontend/src/contexts/LanguageContext.test.tsx` | Context provides language state and setter function |
| useLanguage Hook | `frontend/src/hooks/useLanguage.test.ts` | Hook returns current language and allows updates |
| localStorage Utilities | `frontend/src/utils/localStorage.test.ts` | Get/set language works correctly, handles errors |
| LanguageToggle Component | `frontend/src/components/LanguageToggle.test.tsx` | Component renders, handles selection, updates context |

### Integration Tests
| Test | Services | What to Verify |
|------|----------|----------------|
| Language State Flow | frontend | Selecting language → updates context → saves to localStorage |
| Persistence on Reload | frontend | Language selection survives page refresh |

### End-to-End Tests
| Flow | Steps | Expected Outcome |
|------|-------|------------------|
| First-Time User Flow | 1. Open app (no stored language) 2. Default language loads | Default language (English) is selected |
| Language Selection Flow | 1. Open language toggle 2. Select Spanish 3. Close toggle | UI shows Spanish selected, localStorage contains "es" |
| Persistence Flow | 1. Select language 2. Refresh page | Selected language is restored from localStorage |
| Invalid Storage Flow | 1. Manually set invalid language in localStorage 2. Reload app | App resets to default language |

### Browser Verification (if frontend)
| Page/Component | URL | Checks |
|----------------|-----|--------|
| LanguageToggle Component | `http://localhost:3000` | Toggle appears in header/nav, displays language options |
| Language Selection | `http://localhost:3000` | Click language option → UI updates, no errors in console |
| Persistence Check | `http://localhost:3000` (after reload) | Selected language is retained after browser refresh |
| localStorage Inspection | DevTools → Application → localStorage | Key `app_language` exists with correct value ("en" or "es") |

### Database Verification (if applicable)
Not applicable - this feature uses client-side storage only.

### QA Sign-off Requirements
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] All E2E tests pass
- [ ] Browser verification complete
- [ ] LocalStorage persistence verified in DevTools
- [ ] No regressions in existing functionality
- [ ] Component follows Material-UI design patterns
- [ ] TypeScript compilation successful with no errors
- [ ] Accessibility verified (keyboard navigation, screen reader support)
- [ ] No security vulnerabilities introduced (localStorage sanitization)
- [ ] Component is reusable and properly typed
