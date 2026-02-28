# Specification: Add Hebrew Language Support

## Overview

This task implements comprehensive Hebrew language support for the Construction Operations Platform, including right-to-left (RTL) layout support, Hebrew translations, and proper font rendering. The implementation builds upon the existing i18next internationalization framework and integrates RTL capabilities into the Material-UI v5 theme system.

## Workflow Type

**Type**: feature

**Rationale**: This adds new internationalization functionality to support Hebrew as a second language, requiring new dependencies, RTL infrastructure, and comprehensive translation coverage across the application.

## Task Scope

### Services Involved
- **frontend** (primary) - React application requiring RTL support, theme configuration, and translation integration

### This Task Will:
- [x] Install RTL dependencies (@mui/stylis-plugin-rtl and stylis)
- [x] Configure Emotion cache for RTL styling support
- [x] Implement direction-aware MUI theme creation (LTR/RTL)
- [x] Set up language switching mechanism with HTML dir attribute synchronization
- [x] Add Hebrew translations to existing translation files
- [x] Create language selector component
- [x] Test RTL rendering across all major UI components

### Out of Scope:
- Backend API localization (error messages, email templates)
- Database content translation (project names, descriptions)
- Date/time localization beyond basic formatting
- Translation of user-generated content
- Professional Hebrew translation review (initial translations will be basic/placeholder)

## Service Context

### Frontend

**Tech Stack:**
- Language: TypeScript
- Framework: React
- Build Tool: Vite
- Styling: Emotion (via MUI v5)
- UI Library: Material-UI v5.15.6
- i18n: i18next v25.8.0, react-i18next v16.5.4
- Key directories: src/

**Entry Point:** `src/App.tsx`

**How to Run:**
```bash
cd frontend
npm run dev
```

**Port:** 3000

**Existing i18n Setup:**
- Config: `src/i18n/config.ts`
- Translations: `src/i18n/locales/en.json`, `src/i18n/locales/he.json`
- Supported languages: English ('en'), Hebrew ('he')
- Detection: localStorage → navigator
- Fallback: English

## Files to Modify

| File | Service | What to Change |
|------|---------|---------------|
| `frontend/package.json` | frontend | Add @mui/stylis-plugin-rtl and stylis dependencies |
| `frontend/src/App.tsx` | frontend | Wrap app with CacheProvider and direction-aware ThemeProvider |
| `frontend/src/theme.ts` or `frontend/src/theme/index.ts` | frontend | Create direction-aware theme factory function |
| `frontend/src/i18n/locales/he.json` | frontend | Add comprehensive Hebrew translations for all UI strings |
| `frontend/src/i18n/locales/en.json` | frontend | Ensure all translation keys exist (for reference) |
| `frontend/src/components/LanguageSelector.tsx` | frontend | Create new component for language switching |
| `frontend/src/i18n/config.ts` | frontend | Ensure proper RTL detection is configured |

## Files to Reference

These files show patterns to follow:

| File | Pattern to Copy |
|------|----------------|
| `frontend/src/i18n/config.ts` | Existing i18next configuration structure |
| `frontend/src/i18n/locales/en.json` | Translation key structure and organization |
| `frontend/src/App.tsx` | Current theme provider setup and app structure |
| MUI Documentation: [RTL Support](https://mui.com/material-ui/guides/right-to-left/) | Official RTL implementation pattern |

## Patterns to Follow

### RTL Cache Configuration

From MUI documentation pattern:

```typescript
import { CacheProvider } from '@emotion/react';
import createCache from '@emotion/cache';
import { prefixer } from 'stylis';
import rtlPlugin from 'stylis-plugin-rtl';

// Create RTL cache
const cacheRtl = createCache({
  key: 'muirtl',
  stylisPlugins: [prefixer, rtlPlugin],
});

// Create LTR cache (default)
const cacheLtr = createCache({
  key: 'muiltr',
  stylisPlugins: [prefixer],
});
```

**Key Points:**
- Both prefixer and rtlPlugin must be in the plugins array for RTL
- Cache key should be unique ('muirtl' for RTL, 'muiltr' for LTR)
- Plugins order matters: [prefixer, rtlPlugin]

### Direction-Aware Theme Creation

```typescript
import { createTheme, Theme } from '@mui/material/styles';

const createAppTheme = (direction: 'ltr' | 'rtl'): Theme => {
  return createTheme({
    direction,
    // ... rest of theme configuration
    palette: {
      // existing palette
    },
    typography: {
      // existing typography
    },
  });
};
```

**Key Points:**
- Theme must be recreated when direction changes (cannot mutate)
- Direction property is a first-class theme configuration option
- Preserve all existing theme customizations

### Language Change Hook

```typescript
import { useTranslation } from 'react-i18next';
import { useEffect } from 'react';

const useLanguageDirection = () => {
  const { i18n } = useTranslation();

  useEffect(() => {
    const direction = i18n.dir();
    document.documentElement.setAttribute('dir', direction);
    document.documentElement.setAttribute('lang', i18n.language);
  }, [i18n.language]);

  return i18n.dir();
};
```

**Key Points:**
- Synchronize HTML dir attribute with i18n direction
- Use i18n.dir() to get 'rtl' or 'ltr' for current language
- Update on language change

## Requirements

### Functional Requirements

1. **RTL Layout Support**
   - Description: All UI components must render correctly in right-to-left layout for Hebrew
   - Acceptance:
     - Switching to Hebrew flips the entire layout (navigation, forms, tables)
     - Text alignment is right-aligned for Hebrew
     - Icons and buttons appear in correct RTL positions
     - No layout breaking or overlapping elements

2. **Language Switching**
   - Description: Users can switch between English and Hebrew dynamically
   - Acceptance:
     - Language selector component visible in app header/navigation
     - Language selection persists in localStorage
     - Page re-renders with selected language immediately
     - No page refresh required for language change

3. **Translation Coverage**
   - Description: All user-facing text strings are translated to Hebrew
   - Acceptance:
     - Navigation menu items translated
     - Form labels and placeholders translated
     - Button text translated
     - Error messages translated
     - Empty state messages translated
     - No English text visible when Hebrew is selected (except user-generated content)

4. **Font Rendering**
   - Description: Hebrew characters render correctly with appropriate fonts
   - Acceptance:
     - Hebrew text is readable and properly rendered
     - No character replacement or boxes
     - Font supports Hebrew Unicode range (U+0590 to U+05FF)

### Edge Cases

1. **Mixed Content** - When user-generated content (project names, descriptions) is in English but UI is Hebrew, maintain proper text direction per-field using dir="auto"
2. **Long Hebrew Text** - Hebrew words can be longer than English equivalents; ensure UI components handle overflow gracefully with ellipsis or wrapping
3. **Date/Time Formatting** - Dates should maintain numeric format (DD/MM/YYYY) but labels should be translated
4. **Numeric Values** - Numbers should maintain LTR direction even in RTL layout (e.g., "150 ₪" not "₪ 051")
5. **MUI Component Exceptions** - Some MUI components (Drawer, Dialog) may need explicit dir attribute; test and add as needed

## Implementation Notes

### DO
- Use `i18n.dir()` to dynamically get current text direction
- Create separate Emotion caches for LTR and RTL
- Wrap ThemeProvider with CacheProvider (not vice versa)
- Set HTML dir attribute on document root for accessibility
- Test all form inputs, data tables, and navigation components in RTL
- Use `useTranslation()` hook for all text strings, not hardcoded text
- Maintain identical key structure across en.json and he.json
- Include both prefixer and rtlPlugin in stylisPlugins array

### DON'T
- Mutate theme direction property (recreate theme instead)
- Hardcode direction values; always derive from i18n.dir()
- Forget to install both @mui/stylis-plugin-rtl AND stylis (peer dependency)
- Use inline styles for directional properties (margin-left, padding-right) - let MUI handle it
- Create multiple CacheProvider wrappers (one is sufficient, switched dynamically)
- Skip testing Drawer, Dialog, and Menu components (they often need special RTL handling)

### Translation Key Organization

Follow existing pattern in `en.json`:

```json
{
  "navigation": {
    "dashboard": "Dashboard",
    "projects": "Projects",
    "settings": "Settings"
  },
  "forms": {
    "labels": {
      "name": "Name",
      "email": "Email"
    },
    "placeholders": {
      "enterName": "Enter name"
    }
  },
  "buttons": {
    "save": "Save",
    "cancel": "Cancel"
  }
}
```

## Development Environment

### Start Services

```bash
# Frontend (from project root)
cd frontend
npm install
npm run dev

# Backend (if needed for testing)
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Service URLs
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

### Required Environment Variables
- `VITE_API_URL`: http://localhost:8000/api/v1 (frontend)

## Success Criteria

The task is complete when:

1. [x] RTL dependencies installed (@mui/stylis-plugin-rtl, stylis)
2. [x] Emotion cache configured for both LTR and RTL
3. [x] Theme direction switches automatically based on selected language
4. [x] HTML dir attribute updates on language change
5. [x] Language selector component implemented and accessible
6. [x] Hebrew translations added for all major UI sections
7. [x] Application renders correctly in Hebrew with RTL layout
8. [x] All navigation, forms, tables, and dialogs display properly in RTL
9. [x] Language selection persists across page refreshes
10. [x] No console errors or warnings related to i18n or RTL
11. [x] Existing tests still pass
12. [x] Manual testing in browser confirms RTL layout works across all pages

## QA Acceptance Criteria

**CRITICAL**: These criteria must be verified by the QA Agent before sign-off.

### Unit Tests
| Test | File | What to Verify |
|------|------|----------------|
| Theme Direction Creation | `frontend/src/theme/__tests__/theme.test.ts` | Theme direction property is 'rtl' when Hebrew selected |
| i18n Configuration | `frontend/src/i18n/__tests__/config.test.ts` | Hebrew language code returns 'rtl' from i18n.dir() |
| Language Selector | `frontend/src/components/__tests__/LanguageSelector.test.tsx` | Component renders, changes language on click, persists selection |

### Integration Tests
| Test | Services | What to Verify |
|------|----------|----------------|
| Theme-i18n Integration | frontend | Theme direction updates when language changes |
| CacheProvider Switching | frontend | Correct Emotion cache applied for LTR vs RTL |
| Translation Loading | frontend | Hebrew translations load correctly, fallback to English for missing keys |

### End-to-End Tests
| Flow | Steps | Expected Outcome |
|------|-------|------------------|
| Language Switch Flow | 1. Load app in English<br>2. Click language selector<br>3. Select Hebrew | UI flips to RTL, all text in Hebrew, localStorage updated |
| RTL Navigation | 1. Set language to Hebrew<br>2. Navigate through all main pages | All pages render correctly in RTL, no layout breaks |
| Form Submission RTL | 1. Set language to Hebrew<br>2. Fill out a form<br>3. Submit | Form validation messages in Hebrew, submission works |

### Browser Verification (Frontend Required)
| Page/Component | URL | Checks |
|----------------|-----|--------|
| Language Selector | `http://localhost:3000` | Selector visible, switches between English/Hebrew |
| Dashboard (RTL) | `http://localhost:3000` (Hebrew) | Layout is RTL, navigation on right, content flows right-to-left |
| Projects List (RTL) | `http://localhost:3000/projects` (Hebrew) | Table columns reversed, actions on left, text right-aligned |
| Forms (RTL) | `http://localhost:3000/projects/new` (Hebrew) | Labels right-aligned, inputs flow RTL, buttons positioned correctly |
| Dialogs (RTL) | Open any modal/dialog (Hebrew) | Dialog content RTL, close button on correct side |
| Drawer/Menu (RTL) | Open side drawer (Hebrew) | Drawer opens from right, menu items RTL |

### Database Verification
Not applicable for this feature (frontend-only changes).

### QA Sign-off Requirements
- [x] All unit tests pass
- [x] All integration tests pass
- [x] All E2E tests pass
- [x] Browser verification complete for all major pages
- [x] Language switching works without page refresh
- [x] No layout breaks or visual regressions in RTL mode
- [x] All MUI components (Drawer, Dialog, Menu, DataGrid) render correctly in RTL
- [x] Translation keys complete (no missing translations in Hebrew)
- [x] HTML dir attribute updates correctly
- [x] No console errors or warnings
- [x] Code follows established patterns (hooks, component structure)
- [x] No security vulnerabilities introduced
- [x] Performance acceptable (no lag when switching languages)

## Additional Testing Notes

**Manual Testing Checklist:**
1. Test all pages in Hebrew (Dashboard, Projects, Equipment, Materials, RFIs, etc.)
2. Test all modals and dialogs in Hebrew
3. Test all forms in Hebrew (create, edit, validation)
4. Test data tables in Hebrew (sorting, filtering, pagination)
5. Test navigation drawer in Hebrew
6. Test date pickers in Hebrew
7. Test empty states and error messages in Hebrew
8. Verify localStorage persistence across browser sessions
9. Test on different screen sizes (responsive RTL)
10. Test keyboard navigation in RTL mode

**Known Limitations:**
- Initial Hebrew translations may be basic; professional translation review recommended
- User-generated content (project descriptions, etc.) will remain in original language
- Email templates and backend error messages remain in English (out of scope)
- PDF exports may not support RTL layout (requires separate implementation)
