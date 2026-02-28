# Specification: Translate Product to Hebrew

## Overview

This task involves implementing comprehensive Hebrew language support for the entire product, including the React frontend UI, backend API responses, and error messages. The implementation will establish a full internationalization (i18n) infrastructure using industry-standard tools, enabling the application to serve Hebrew-speaking users with proper right-to-left (RTL) layout support. This is a foundational feature that enables language localization and sets up the architecture for future language additions.

## Workflow Type

**Type**: feature

**Rationale**: This is a new feature implementation that adds internationalization infrastructure and Hebrew language support to the product. It requires changes across multiple services (frontend and backend), introduces new dependencies, modifies component rendering, and establishes patterns for future localization work.

## Task Scope

### Services Involved
- **frontend** (primary) - React application with all UI components, dialogs, forms, and user-facing text
- **backend** (secondary) - FastAPI application for translating API error messages and response content

### This Task Will:
- [ ] Install and configure i18next internationalization framework in frontend
- [ ] Create Hebrew translation files for all UI strings, labels, buttons, placeholders
- [ ] Extract all hardcoded English strings from React components
- [ ] Implement RTL (right-to-left) support for Hebrew layout
- [ ] Configure language switching mechanism in the application
- [ ] Create backend translation endpoints or response localization layer
- [ ] Add Hebrew language option to user preferences/settings
- [ ] Verify all Material-UI components respect RTL direction
- [ ] Test date, time, number, and currency formatting for Hebrew locale

### Out of Scope:
- Translation of documentation or internal README files
- Marketing website content (if separate from product)
- Mobile app support (unless part of this product)
- Other language support beyond Hebrew (future feature)
- Profiling or optimization of i18n performance
- Cloud-based translation management tools (Crowdin, Lokalise) - using local JSON files
- Voice/audio content translation

## Service Context

### Frontend Service

**Tech Stack:**
- Language: TypeScript
- Framework: React
- Build Tool: Vite
- CSS-in-JS: Emotion
- UI Library: Material-UI (@mui/material)
- HTTP Client: axios
- Router: react-router-dom

**Key Directories:**
- `./frontend/src` - Main source code
- `./frontend/src/components` - React components (primary target for extraction)
- `./frontend/src/pages` - Page components
- `./frontend/src/App.tsx` - Main app component (entry point)

**Entry Point:** `./frontend/src/App.tsx`

**How to Run:**
```bash
cd frontend
npm install
npm run dev
```

**Port:** 3000

### Backend Service

**Tech Stack:**
- Language: Python
- Framework: FastAPI
- ORM: SQLAlchemy
- Task Queue: Celery
- Database: PostgreSQL
- Auth: JWT (python-jose)

**Key Directories:**
- `./backend/app` - Application code
- `./backend/app/api/v1` - API routes (contains ~58 routes)
- `./backend/app/models` - Data models

**Entry Point:** `./backend/app/main.py`

**How to Run:**
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

**Port:** 8000

## Files to Modify

| File | Service | What to Change |
|------|---------|---------------|
| `./frontend/src/App.tsx` | frontend | Import i18next configuration, configure language provider, apply RTL direction |
| `./frontend/src/main.tsx` or entry file | frontend | Initialize i18next before app render |
| `./frontend/src/components/**/*.tsx` | frontend | Replace hardcoded strings with i18n.t() calls |
| `./frontend/src/pages/**/*.tsx` | frontend | Replace hardcoded strings with i18n.t() calls |
| `./frontend/package.json` | frontend | Add i18next, react-i18next, i18next-browser-languagedetector dependencies |
| `./frontend/src/i18n/locales/en.json` | frontend | Create English translation file (baseline) |
| `./frontend/src/i18n/locales/he.json` | frontend | Create Hebrew translation file |
| `./frontend/src/i18n/config.ts` | frontend | NEW - Create i18next configuration file |
| `./frontend/src/theme.ts` or emotion config | frontend | Configure RTL direction support for Emotion theming |
| `./frontend/public/locales/en/translation.json` | frontend | OPTIONAL - Public locales structure (alternative approach) |
| `./frontend/public/locales/he/translation.json` | frontend | OPTIONAL - Hebrew translations in public folder |
| `./backend/app/config.py` or settings | backend | Add available languages configuration |
| `./backend/app/main.py` | backend | Add Accept-Language header handling middleware |
| `./backend/app/api/v1/auth.py` | backend | Add user language preference to user model/response |
| `./backend/app/utils/localization.py` | backend | NEW - Create backend localization utility |
| `./backend/locales/en.json` | backend | Create English API message translations |
| `./backend/locales/he.json` | backend | Create Hebrew API message translations |

## Files to Reference

These files show patterns to follow and demonstrate existing component structures:

| File | Pattern to Copy |
|------|----------------|
| `./frontend/src/components/**/*.tsx` | React component structure and useState/useContext patterns |
| `./frontend/src/pages/**/*.tsx` | Page-level component composition and layout patterns |
| `./backend/app/api/v1/*.py` | FastAPI route structure and response formatting |
| `./backend/app/models/*.py` | SQLAlchemy model patterns |
| `./package.json` | Dependency management and script patterns |

## Patterns to Follow

### Pattern 1: i18next Configuration & React Integration

From similar React i18n implementations:

```typescript
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import enTranslations from './locales/en.json';
import heTranslations from './locales/he.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: enTranslations },
      he: { translation: heTranslations }
    },
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage']
    }
  });

export default i18n;
```

**Key Points:**
- Use `i18next-browser-languagedetector` to auto-detect user's browser language
- Store language preference in localStorage for persistence
- Set fallback to English if locale not found
- Initialize before React app renders

### Pattern 2: Using i18n in React Components

From typical React component patterns with i18n:

```typescript
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t, i18n } = useTranslation();

  return (
    <div>
      <h1>{t('page.title')}</h1>
      <button>{t('buttons.submit')}</button>
      <p>{t('common.welcome', { name: 'User' })}</p>
    </div>
  );
}
```

**Key Points:**
- Use `useTranslation()` hook in functional components
- Access `i18n` object to check current language or change language
- Use dot notation for nested translations (e.g., `page.title`)
- Support interpolation for dynamic values (e.g., `{ name: 'User' }`)

### Pattern 3: RTL (Right-to-Left) Support with Material-UI

From Material-UI RTL documentation:

```typescript
import { ThemeProvider, createTheme } from '@mui/material/styles';

const theme = createTheme({
  direction: i18n.language === 'he' ? 'rtl' : 'ltr',
  // ... other theme properties
});

// In component:
<ThemeProvider theme={theme}>
  <YourApp />
</ThemeProvider>
```

**Key Points:**
- Set `direction` property in Material-UI theme based on current language
- Material-UI components automatically mirror when `direction: 'rtl'`
- Must set document direction: `document.dir = 'rtl'` or `document.dir = 'ltr'`
- Margins and padding automatically reverse for RTL

### Pattern 4: Translation File Structure

JSON translation file structure:

```json
{
  "common": {
    "welcome": "Welcome",
    "goodbye": "Goodbye",
    "submit": "Submit"
  },
  "buttons": {
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete"
  },
  "pages": {
    "home": {
      "title": "Home Page",
      "description": "Welcome to our application"
    }
  },
  "errors": {
    "notFound": "Page not found",
    "unauthorized": "Unauthorized access",
    "serverError": "Server error occurred"
  }
}
```

**Key Points:**
- Use hierarchical structure with dots for nesting (e.g., `pages.home.title`)
- Keep translations organized by feature/page
- Include all variations: buttons, labels, errors, messages
- Support interpolation: `"greeting": "Hello {{name}}"`

### Pattern 5: Backend API Localization

For FastAPI error responses with language support:

```python
from fastapi import Request
from typing import Dict, Optional

MESSAGES = {
  'en': {
    'user_not_found': 'User not found',
    'invalid_credentials': 'Invalid username or password'
  },
  'he': {
    'user_not_found': 'משתמש לא נמצא',
    'invalid_credentials': 'שם משתמש או סיסמה לא תקינים'
  }
}

def get_language(request: Request) -> str:
  accept_language = request.headers.get('Accept-Language', 'en')
  lang = accept_language.split(',')[0].split('-')[0].lower()
  return 'he' if lang == 'he' else 'en'

def translate_message(key: str, lang: str) -> str:
  return MESSAGES.get(lang, {}).get(key, MESSAGES['en'].get(key, key))

@app.get('/api/users/{user_id}')
async def get_user(user_id: int, request: Request):
  lang = get_language(request)
  user = db.get_user(user_id)
  if not user:
    raise HTTPException(
      status_code=404,
      detail={'message': translate_message('user_not_found', lang)}
    )
  return user
```

**Key Points:**
- Read `Accept-Language` header from requests
- Maintain translation dictionaries for each language
- Apply translations in error handlers and response messages
- Store user language preference if user is authenticated

## Requirements

### Functional Requirements

1. **i18n Infrastructure Setup**
   - Description: Establish a complete internationalization framework using i18next in the frontend application
   - Acceptance:
     - i18next is installed and configured in `./frontend/src/i18n/config.ts`
     - Language detection works (detects Hebrew as 'he', English as 'en')
     - Language preference persists in localStorage
     - Can switch languages dynamically without page reload

2. **Frontend String Extraction & Translation**
   - Description: Replace all hardcoded English strings in React components with translation keys
   - Acceptance:
     - All visible text in components uses `t()` function
     - English translation file contains all UI strings (`./frontend/src/i18n/locales/en.json`)
     - Hebrew translation file contains all translations (`./frontend/src/i18n/locales/he.json`)
     - No console warnings about missing translation keys
     - Page title, button labels, form placeholders, error messages all translated

3. **RTL (Right-to-Left) Layout Support**
   - Description: Configure the application to properly display RTL layouts for Hebrew
   - Acceptance:
     - Document direction changes when language is Hebrew (`document.dir = 'rtl'`)
     - Material-UI components automatically adjust for RTL (buttons, inputs, layouts)
     - Emotion/CSS respects direction (margins, padding, text-align reversed appropriately)
     - Icons and images remain unmirrored (or explicitly mirrored if needed)
     - No horizontal scrollbars appear in RTL mode
     - Form inputs display cursor position correctly for RTL text

4. **Language Selection UI**
   - Description: Provide user-facing UI to select between English and Hebrew
   - Acceptance:
     - Language selector component in header/navigation
     - Shows current language (flags or text)
     - Click to switch between English and Hebrew
     - Change immediately reflects in entire UI
     - User preference persists on reload

5. **Backend API Localization**
   - Description: Translate API error messages and responses based on Accept-Language header
   - Acceptance:
     - Accept-Language header is read from requests
     - Error messages return in user's language
     - User language preference is stored if user is authenticated
     - At minimum: /register, /login, and error responses support Hebrew
     - API responses include appropriate Hebrew messages for validation errors

6. **Number, Date, and Time Formatting**
   - Description: Format numbers, dates, and times according to Hebrew locale
   - Acceptance:
     - Dates display in Hebrew format (e.g., "30 ינואר 2026")
     - Numbers use comma as thousands separator (Hebrew style)
     - Times display in 24-hour format standard for Hebrew
     - Material-UI DataGrid respects Hebrew locale if used
     - dayjs or similar library configured for Hebrew locale

### Edge Cases

1. **Mixed LTR/RTL Text** - When English words appear in Hebrew sentences, browser handles with Unicode bidirectional algorithm; ensure text is readable but don't force mirroring
2. **Missing Translations** - If a Hebrew translation key is missing, fallback to English with clear console warning
3. **Long Translated Text** - Hebrew text may be longer than English; ensure UI doesn't break with overflow
4. **Special Characters** - Hebrew Unicode characters display correctly in all browsers; test with terminal/technical text
5. **RTL Form Input** - Text input fields should have cursor at right side for Hebrew, left side for English
6. **API Response Structure** - Backend must maintain consistent JSON structure while translating message text
7. **Date Picker / Time Picker** - Material-UI DatePicker must respect Hebrew calendar display (Gregorian fine, but confirm)
8. **Search/Filter** - Search functionality works with Hebrew text input
9. **Copy/Paste** - User can copy Hebrew text and paste into forms correctly

## Implementation Notes

### DO
- Use i18next as the internationalization framework (industry standard, well-documented, React-friendly)
- Store translations in JSON files within the project (simple, version-controllable, no external dependencies)
- Use dot notation for translation keys (e.g., `buttons.submit`, `errors.notFound`)
- Start with en.json as the source of truth - extract from it
- Test every component that displays text to ensure it uses t() function
- Configure Material-UI theme's `direction` property dynamically based on current language
- Set `document.dir` in App component based on language
- Use `useTranslation()` hook in functional components for accessing translations
- Add translations for **all** error messages and API responses
- Test with actual Hebrew content to verify RTL rendering

### DON'T
- Don't hardcode English strings in components - always use translation keys
- Don't use external cloud-based translation services initially (Crowdin, Lokalise) - use local JSON
- Don't forget to translate Material-UI labels (Button text, Input labels, Dialog titles, etc.)
- Don't assume English string length equals Hebrew string length (Hebrew may be longer)
- Don't mirror icons that should remain directional (arrows, etc.) unless specifically needed
- Don't create separate component files for RTL - use CSS direction property
- Don't forget to initialize i18next before React app renders in main.tsx
- Don't leave console warnings about missing translation keys in production
- Don't translate user-generated content or database values (only UI strings)
- Don't create translations manually without reference - use extraction tools if available

## Development Environment

### Start Services

```bash
# Terminal 1: Start Frontend
cd frontend
npm install
npm run dev
# Frontend runs on http://localhost:3000

# Terminal 2: Start Backend
cd backend
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload
# Backend runs on http://localhost:8000

# Terminal 3: Start Database & Redis (if using docker-compose)
docker-compose up -d
```

### Service URLs
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

### Required Dependencies

**Frontend (add via npm):**
```bash
npm install i18next react-i18next i18next-browser-languagedetector
```

**Backend (add to requirements.txt):**
```
# No new dependencies required - use Python dict for translations
```

### Key Files to Create
- `./frontend/src/i18n/config.ts` - i18next configuration
- `./frontend/src/i18n/locales/en.json` - English translations
- `./frontend/src/i18n/locales/he.json` - Hebrew translations
- `./backend/locales/en.json` - Backend English messages
- `./backend/locales/he.json` - Backend Hebrew messages
- `./backend/app/utils/localization.py` - Localization utility

## Success Criteria

The task is complete when:

1. [ ] i18next is installed and initialized in frontend (`./frontend/src/i18n/config.ts` exists and is called in main)
2. [ ] All hardcoded English strings in React components are replaced with `t()` calls
3. [ ] English translation file exists and is complete (`./frontend/src/i18n/locales/en.json`)
4. [ ] Hebrew translation file exists and is complete (`./frontend/src/i18n/locales/he.json`)
5. [ ] User can switch between English and Hebrew via language selector in UI
6. [ ] Language preference persists across page reloads
7. [ ] Document direction changes correctly when switching to Hebrew (`document.dir = 'rtl'`)
8. [ ] Material-UI components display correctly in RTL mode (no layout broken)
9. [ ] All form inputs, buttons, labels, dialogs display in correct language
10. [ ] No console errors about missing translation keys
11. [ ] Backend API returns localized error messages based on Accept-Language header
12. [ ] Dates and numbers format correctly for Hebrew locale
13. [ ] All existing tests pass
14. [ ] Application functions correctly when set to Hebrew (no broken links, missing text, or rendering issues)

## QA Acceptance Criteria

**CRITICAL**: These criteria must be verified by the QA Agent before sign-off.

### Unit Tests
| Test | File | What to Verify |
|------|------|----------------|
| i18n config initialization | `./frontend/src/i18n/config.ts` | i18next loads both English and Hebrew resources, fallback works |
| Translation key extraction | Translation files (en.json, he.json) | All keys exist in both files, no missing keys |
| useTranslation hook | Component tests | useTranslation hook returns t() function and translations |
| RTL theme switching | Material-UI theme tests | Theme direction updates when language changes |

### Integration Tests
| Test | Services | What to Verify |
|------|----------|----------------|
| Language switch end-to-end | frontend ↔ localStorage | Change language, entire UI updates, preference persists |
| Backend API localization | backend | API accepts Accept-Language header, returns Hebrew messages |
| i18n with routing | react-router ↔ i18n | Language preference maintained across page navigation |
| Date/Time formatting | dayjs ↔ i18n | Dates display in Hebrew format when language is Hebrew |

### End-to-End Tests
| Flow | Steps | Expected Outcome |
|------|-------|------------------|
| Language Selection | 1. Load app 2. Click language selector 3. Choose Hebrew 4. Verify UI | Entire UI displays in Hebrew, layout is RTL, preference saves |
| Form Submission in Hebrew | 1. Switch to Hebrew 2. Fill form 3. Submit 4. See error if validation fails | Form labels/placeholders in Hebrew, error messages in Hebrew |
| Navigation RTL | 1. Set language to Hebrew 2. Navigate to different pages 3. Verify layout | All pages render in RTL, navigation elements correctly positioned |
| API Error Response | 1. Make invalid API request with Accept-Language: he 2. Receive response | Error message and description in Hebrew |
| Persistent Language | 1. Set to Hebrew 2. Close browser 3. Reopen app | Language remains Hebrew without user input |

### Browser Verification (Frontend Focus)
| Page/Component | URL | Checks |
|----------------|-----|--------|
| Home/Main Page | `http://localhost:3000` | All text in Hebrew, layout is RTL, no text overflow |
| Login Page | `http://localhost:3000/login` | Form labels in Hebrew, placeholders in Hebrew, error messages in Hebrew |
| Navigation Header | Header on all pages | Language selector visible, current language displayed |
| Form Pages | `/forms/*` | Input labels, buttons, validation messages all in Hebrew |
| Dialog/Modals | Any modal in app | Dialog title, content, button labels in Hebrew |
| Material-UI Components | All pages | DataGrid, DatePicker, Select dropdowns work in RTL |
| Right-to-Left Layout | All pages | Verify margins, padding, text alignment correct for RTL |
| Icons/Images | All pages | Icons properly positioned (not mirrored unless intended) |

### Database Verification (if applicable)
| Check | Query/Command | Expected |
|-------|---------------|----------|
| User language preference | `SELECT language FROM users WHERE id = ?` | user.language = 'he' if set to Hebrew |
| No data corruption | Check sample records | All data intact, no corruption from text changes |

### QA Sign-off Requirements
- [ ] Entire frontend UI displays correctly in both English and Hebrew
- [ ] No console errors when switching languages
- [ ] RTL layout works correctly (no broken layouts, text overflow, or positioning issues)
- [ ] Language selector works and persists preference
- [ ] All Material-UI components respect RTL direction
- [ ] Forms and inputs work correctly in Hebrew (cursor position, text entry)
- [ ] Backend API returns localized error messages
- [ ] Dates and numbers format correctly for Hebrew locale
- [ ] No hardcoded English strings remain visible in the UI
- [ ] Existing functionality remains unbroken in both English and Hebrew modes
- [ ] Navigation works correctly in both languages
- [ ] All pages/routes are accessible and display correctly
- [ ] Copy/paste of Hebrew text works correctly
- [ ] Search and filtering work with Hebrew text
- [ ] No regressions in existing functionality
- [ ] Code follows established patterns (uses i18next correctly)
- [ ] No security vulnerabilities introduced (i18n library versions are current)
