# RTL and Internationalization - Complete Implementation

## Overview
# [EPIC] RTL and Internationalization

**Linear Issue:** [BUI-43](https://linear.app/builder-project/issue/BUI-43/epic-rtl-and-internationalization)
**Priority:** High
**Status:** Backlog


## Description

Hebrew RTL support and bilingual infrastructure. Priority: P1. Points: 8


## Workflow Type

**Type**: feature

**Rationale**: This is a foundational feature addition that introduces new capabilities (internationalization and RTL support) to the application. It requires new infrastructure, configuration, translation files, and UI components for language switching, making it a feature workflow rather than a refactor or investigation.

## Task Scope

### Services Involved
- **frontend** (primary) - React/TypeScript application requiring i18n setup, RTL styling, and language switching UI

### This Task Will:
- [ ] Configure i18next with language detection and fallback mechanisms
- [ ] Create translation file structure for English and Hebrew
- [ ] Implement RTL-aware CSS architecture using logical properties
- [ ] Build language switcher component in the UI
- [ ] Extract hardcoded strings to translation keys
- [ ] Set up direction (LTR/RTL) detection and application
- [ ] Ensure Material-UI components support RTL properly
- [ ] Add language persistence to localStorage
- [ ] Create developer documentation for adding new translations

### Out of Scope:
- Translation of backend API responses or error messages
- Complete translation of all UI strings (will be incremental)
- Additional languages beyond English and Hebrew
- Automated translation or translation management platforms
- Currency or number format localization (future enhancement)
- Date format localization (dayjs already configured, but full integration deferred)

## Service Context

### frontend

**Tech Stack:**
- Language: TypeScript
- Framework: React
- Build Tool: Vite
- Styling: Emotion (CSS-in-JS)
- UI Library: Material-UI (@mui/material)
- i18n: i18next (already installed)

**Key Dependencies (Pre-installed):**
- `i18next` - Core internationalization framework
- `react-i18next` - React bindings for i18next
- `i18next-browser-languagedetector` - Automatic language detection

**Entry Point:** `src/App.tsx`

**How to Run:**
```bash
cd frontend
npm run dev
```

**Port:** 3000

## Files to Modify

| File | Service | What to Change |
|------|---------|---------------|
| `frontend/src/main.tsx` or `frontend/src/App.tsx` | frontend | Wrap app with I18nextProvider and initialize i18n |
| `frontend/src/i18n/config.ts` | frontend | Create i18next configuration with language detection and resources |
| `frontend/src/i18n/locales/en/common.json` | frontend | Create English translation file (new file) |
| `frontend/src/i18n/locales/he/common.json` | frontend | Create Hebrew translation file (new file) |
| `frontend/src/theme/theme.ts` | frontend | Add direction property to theme based on language |
| `frontend/src/components/LanguageSwitcher.tsx` | frontend | Create language switcher component (new file) |
| `frontend/src/styles/rtl.css` | frontend | Create RTL-specific style overrides (new file) |
| `frontend/vite.config.ts` | frontend | Ensure i18next resources are bundled correctly |

## Files to Reference

These files show patterns to follow:

| File | Pattern to Copy |
|------|----------------|
| `frontend/src/App.tsx` | Root component structure, provider wrapping pattern |
| `frontend/src/theme/theme.ts` | Material-UI theme configuration pattern |
| `frontend/package.json` | Existing dependencies (i18next already installed) |

## Patterns to Follow

### 1. i18next Configuration Pattern

Create `frontend/src/i18n/config.ts`:

```typescript
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import enCommon from './locales/en/common.json';
import heCommon from './locales/he/common.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { common: enCommon },
      he: { common: heCommon }
    },
    fallbackLng: 'en',
    defaultNS: 'common',
    interpolation: {
      escapeValue: false // React already escapes
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage']
    }
  });

export default i18n;
```

**Key Points:**
- Use LanguageDetector for automatic language selection
- Fallback to English if language not supported
- Cache language preference in localStorage
- Use namespaces (common) for organization

### 2. Material-UI RTL Theme Pattern

Update `frontend/src/theme/theme.ts`:

```typescript
import { createTheme, ThemeOptions } from '@mui/material/styles';
import { prefixer } from 'stylis';
import rtlPlugin from 'stylis-plugin-rtl';

export const createAppTheme = (direction: 'ltr' | 'rtl') => {
  const themeOptions: ThemeOptions = {
    direction,
    // ... existing theme configuration
  };

  return createTheme(themeOptions);
};
```

**Key Points:**
- Direction should be dynamically set based on current language
- Material-UI supports RTL through direction property
- May need stylis-plugin-rtl for Emotion (check if needed)

### 3. Translation Hook Pattern

```typescript
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t, i18n } = useTranslation('common');

  return (
    <div>
      <h1>{t('welcome.title')}</h1>
      <button onClick={() => i18n.changeLanguage('he')}>
        {t('language.switchToHebrew')}
      </button>
    </div>
  );
}
```

**Key Points:**
- Use `useTranslation` hook to access translations
- Call `t()` function with translation key
- Use `i18n.changeLanguage()` to switch languages

### 4. CSS Logical Properties Pattern

Use logical properties instead of directional properties:

```css
/* ❌ Don't use directional properties */
.card {
  margin-left: 16px;
  text-align: left;
  padding-right: 8px;
}

/* ✅ Use logical properties */
.card {
  margin-inline-start: 16px;
  text-align: start;
  padding-inline-end: 8px;
}
```

**Key Points:**
- `margin-inline-start` instead of `margin-left`
- `padding-inline-end` instead of `padding-right`
- `text-align: start` instead of `text-align: left`
- `border-inline-start` instead of `border-left`

## Requirements

### Functional Requirements

1. **i18n Configuration**
   - Description: Set up i18next with language detection, fallback, and resource loading
   - Acceptance:
     - Application initializes with detected browser language (English or Hebrew)
     - Falls back to English if browser language is not supported
     - Language preference persists across page reloads via localStorage

2. **Translation Files**
   - Description: Create structured JSON translation files for English and Hebrew
   - Acceptance:
     - `frontend/src/i18n/locales/en/common.json` contains English translations
     - `frontend/src/i18n/locales/he/common.json` contains Hebrew translations
     - Translation keys follow nested structure (e.g., `navigation.home`, `forms.submit`)
     - At least 20 core UI strings are translated

3. **RTL Layout Support**
   - Description: Implement CSS architecture that automatically adjusts for RTL languages
   - Acceptance:
     - When Hebrew is selected, entire UI flips to RTL orientation
     - Navigation menus, sidebars, and card layouts mirror correctly
     - Icons and buttons align to appropriate side
     - Text direction changes to RTL for Hebrew content

4. **Language Switcher Component**
   - Description: Build UI component allowing users to switch between languages
   - Acceptance:
     - Language switcher visible in app header/navigation
     - Shows current language (e.g., "EN" or "עב")
     - Clicking switcher changes language and updates UI immediately
     - Language change reflected in document direction and translations

5. **Material-UI RTL Integration**
   - Description: Configure Material-UI theme to support RTL direction
   - Acceptance:
     - MUI components (buttons, inputs, dialogs) respect RTL direction
     - Theme direction updates when language changes
     - No visual glitches or misaligned MUI components in RTL mode

6. **Developer Documentation**
   - Description: Create guide for developers to add new translations
   - Acceptance:
     - README or CONTRIBUTING guide explains translation file structure
     - Examples provided for adding new translation keys
     - Instructions for testing RTL layouts

### Edge Cases

1. **Missing Translation Keys** - If a translation key is missing, display the key itself (default i18next behavior) and log warning to console
2. **Language Detection Failure** - If language detection fails, always fallback to English
3. **Mixed Content (LTR in RTL)** - Use `<span dir="ltr">` for content that should remain LTR (e.g., code snippets, URLs)
4. **Long Hebrew Text** - Ensure text wrapping and overflow work correctly in RTL mode
5. **Form Validation Messages** - Translate validation error messages and ensure they display properly in RTL
6. **Third-Party Components** - If a third-party component doesn't support RTL, document the limitation and consider alternatives

## Implementation Notes

### DO
- Use i18next's existing installation (already in package.json)
- Use CSS logical properties (`inline-start`, `inline-end`) for all new styles
- Test language switching while navigating between pages
- Use `dir="auto"` on user-generated content that might be mixed LTR/RTL
- Audit existing components incrementally (don't try to translate everything at once)
- Use meaningful translation key namespaces (e.g., `navigation.*`, `forms.*`, `errors.*`)
- Keep translation files in version control

### DON'T
- Don't hardcode any display text in components (use `t()` instead)
- Don't use `margin-left`, `padding-right` etc. (use logical properties)
- Don't translate technical terms like API keys, error codes, or variable names
- Don't over-nest translation keys (keep structure 2-3 levels deep max)
- Don't mix translation concerns with business logic
- Don't forget to set `lang` attribute on `<html>` tag when language changes

## Development Environment

### Start Services

```bash
# Start frontend development server
cd frontend
npm run dev
```

### Service URLs
- Frontend: http://localhost:3000

### Required Environment Variables
- None specifically for i18n (all configuration is code-based)

### Testing RTL
1. Open browser DevTools
2. Change language to Hebrew using language switcher
3. Verify layout mirrors correctly
4. Test navigation, forms, modals, and data tables
5. Check that Material-UI components flip appropriately

## Success Criteria

The task is complete when:

1. [ ] i18next is configured and initializes on app startup
2. [ ] Translation files exist for English and Hebrew with core UI strings
3. [ ] Language switcher component is implemented and functional
4. [ ] Switching to Hebrew triggers RTL layout transformation
5. [ ] Material-UI theme respects language direction
6. [ ] Language preference persists in localStorage
7. [ ] At least 20 core UI strings are translated and working
8. [ ] No console errors related to i18n or missing translations
9. [ ] Existing tests still pass (no regressions)
10. [ ] New functionality verified via browser testing in both languages
11. [ ] Developer documentation for translations is written

## QA Acceptance Criteria

**CRITICAL**: These criteria must be verified by the QA Agent before sign-off.

### Unit Tests

| Test | File | What to Verify |
|------|------|----------------|
| i18n config initialization | `frontend/src/i18n/config.test.ts` | i18next initializes with correct languages and fallback |
| LanguageSwitcher renders | `frontend/src/components/LanguageSwitcher.test.tsx` | Component renders current language and allows switching |
| Translation hook usage | `frontend/src/components/ExampleComponent.test.tsx` | Components using `useTranslation` receive correct translated strings |
| Direction detection | `frontend/src/theme/theme.test.ts` | Theme direction changes when language changes |

### Integration Tests

| Test | Services | What to Verify |
|------|----------|----------------|
| Language persistence | frontend | Language selection persists after page reload (localStorage) |
| Theme direction sync | frontend | MUI theme direction updates when language changes |
| Translation loading | frontend | Translation files load correctly on app initialization |

### End-to-End Tests

| Flow | Steps | Expected Outcome |
|------|-------|------------------|
| Language Switching | 1. Open app 2. Click language switcher 3. Select Hebrew 4. Navigate to different pages | All pages display Hebrew text, layout is RTL, preference persists |
| Fallback Behavior | 1. Open app with unsupported browser language (e.g., Spanish) 2. Verify UI | App displays in English (fallback language) |
| Mixed Content | 1. Switch to Hebrew 2. View page with code snippets or URLs | LTR content remains LTR within RTL context |

### Browser Verification

| Page/Component | URL | Checks |
|----------------|-----|--------|
| App Initialization | `http://localhost:3000/` | Detects browser language, loads correct translations |
| Language Switcher | `http://localhost:3000/` | Visible in header, shows current language, clickable |
| RTL Layout | `http://localhost:3000/` (with Hebrew) | Layout mirrors: sidebar, navigation, forms, cards |
| Material-UI Components | Various pages | Buttons, inputs, dialogs, menus render correctly in RTL |
| Translation Keys | Various pages | No missing translation warnings in console |
| Direction Attribute | View source | `<html dir="rtl">` when Hebrew selected |

### Visual QA Checklist

- [ ] Hebrew text displays with correct font and rendering
- [ ] RTL layout mirrors correctly (no overlapping elements)
- [ ] Icons and buttons align to appropriate side in RTL
- [ ] Dropdowns and menus open in correct direction
- [ ] Form inputs align and validate in RTL
- [ ] Navigation menu flips correctly
- [ ] Modal dialogs and popups position correctly
- [ ] Data tables flip column order appropriately
- [ ] No horizontal scrollbars introduced by RTL

### Translation Quality

- [ ] Hebrew translations are grammatically correct
- [ ] Translation keys follow consistent naming pattern
- [ ] No hardcoded strings remain in translated components
- [ ] Technical terms handled appropriately (not translated when shouldn't be)

### Performance Verification

| Check | Command | Expected |
|-------|---------|----------|
| Bundle size increase | `npm run build` | Translation files add minimal size (<50KB total) |
| Initial load time | Browser DevTools Network tab | No significant delay from i18n initialization |

### QA Sign-off Requirements

- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] All E2E tests pass
- [ ] Browser verification complete for both languages
- [ ] Visual QA checklist completed
- [ ] Translation quality verified by Hebrew speaker (if available)
- [ ] Performance metrics acceptable
- [ ] No regressions in existing functionality
- [ ] Code follows established patterns (logical properties, translation hooks)
- [ ] No accessibility violations introduced (screen readers, keyboard navigation)
- [ ] Developer documentation reviewed and accurate

## Additional Resources

### Helpful Links
- i18next Documentation: https://www.i18next.com/
- react-i18next Guide: https://react.i18next.com/
- Material-UI RTL Guide: https://mui.com/material-ui/guides/right-to-left/
- CSS Logical Properties: https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Logical_Properties

### Hebrew Language Considerations
- Hebrew is written from right to left
- Hebrew uses Unicode range U+0590 to U+05FF
- Some punctuation remains LTR even in RTL context (parentheses, quotes)
- Numbers in Hebrew text are written LTR

### Future Enhancements (Out of Scope)
- Additional languages (Arabic, Farsi)
- Pluralization rules for Hebrew
- Date and time localization
- Currency formatting
- Automated translation management (e.g., Crowdin, Phrase)
- Server-side rendering (SSR) with language detection
