# i18n Research Findings

**Date:** 2026-02-04
**Task:** Add Hebrew Language Support
**Subtask:** subtask-1-1 - Research codebase

---

## Summary

The application currently has **NO i18n framework** installed or configured. However, it has **partial Hebrew font support** already in place through the theme system. All UI strings are currently **hardcoded in English** throughout the codebase.

---

## Current i18n Status

### ❌ No i18n Framework
- **No internationalization library installed** (no react-i18next, next-intl, or similar)
- **No translation files** exist (no locales/, translations/, or i18n/ directories)
- **All strings are hardcoded** in English directly in components
- **No language switching mechanism** exists

### ✅ Partial Infrastructure Already Present

#### 1. **Hebrew Font Already Configured**
Location: `frontend/index.html` (line 9)
```html
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&family=Noto+Sans+Hebrew:wght@300;400;500;700&family=Fira+Code:wght@400;500&display=swap" rel="stylesheet" />
```

Location: `frontend/src/theme/tokens.ts` (lines 89-92)
```typescript
fontFamily: {
  english: '"Plus Jakarta Sans", system-ui, -apple-system, sans-serif',
  hebrew: '"Noto Sans Hebrew", "Plus Jakarta Sans", system-ui, sans-serif',
  mono: '"Fira Code", "JetBrains Mono", monospace',
}
```

#### 2. **RTL Support Partially Configured**
Location: `frontend/src/theme/theme.ts` (lines 76-78)
```typescript
'[dir="rtl"] body': {
  fontFamily: typography.fontFamily.hebrew,
}
```

The theme is configured to use Hebrew font when `dir="rtl"` is set on the HTML element.

---

## Technology Stack

### Frontend Framework
- **React 18.2.0** with TypeScript
- **React Router v6** for routing
- **Vite** as build tool

### UI Framework
- **Material-UI (MUI) v5.15.6**
  - `@mui/material`
  - `@mui/icons-material`
  - `@mui/x-data-grid`
  - `@mui/x-date-pickers`
- **Emotion** for CSS-in-JS styling

### State Management
- Custom context providers:
  - `ThemeProvider` (`frontend/src/theme/ThemeContext.tsx`)
  - `ToastProvider` (`frontend/src/components/common/ToastProvider.tsx`)
- Local state with React hooks
- LocalStorage for persistence

---

## Current Application Structure

### Key Directories
```
frontend/
├── src/
│   ├── api/              # API client and services
│   ├── components/       # Reusable UI components
│   │   ├── common/      # Common components (Toast, ThemeToggle, etc.)
│   │   ├── layout/      # Layout components (Header, Sidebar, Layout)
│   │   └── ui/          # UI primitives (Button, Card, Modal, etc.)
│   ├── pages/           # Page components (Dashboard, Projects, etc.)
│   ├── theme/           # Theme configuration
│   │   ├── ThemeContext.tsx
│   │   ├── theme.ts
│   │   └── tokens.ts
│   ├── types/           # TypeScript types
│   ├── utils/           # Utility functions
│   ├── App.tsx          # Main app component with routes
│   └── main.tsx         # Entry point
└── index.html           # HTML template with font imports
```

### Sample Components with Hardcoded Strings

**Sidebar Navigation** (`frontend/src/components/layout/Sidebar.tsx`):
- Lines 33-36: Main navigation items
- Lines 38-47: Project navigation items
- Lines 49-52: System navigation items

Example:
```typescript
const mainNavItems: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: <DashboardIcon /> },
  { label: 'Projects', path: '/projects', icon: <FolderIcon /> },
]
```

**Header Component** (`frontend/src/components/layout/Header.tsx`):
- Line 101: "Notifications"
- Lines 106-120: Notification messages
- Lines 140-151: Menu items ("Profile", "Settings", "Logout")

---

## LocalStorage Usage Patterns

The application uses localStorage for persisting user preferences:

1. **Authentication**: `authToken`, `userId`
2. **Theme Mode**: `theme-mode` (stored as 'light', 'dark', or 'system')

**Pattern from ThemeContext.tsx (lines 30-32, 46-48):**
```typescript
const [mode, setMode] = useState<ThemeMode>(() => {
  const stored = localStorage.getItem('theme-mode')
  return (stored as ThemeMode) || 'system'
})

useEffect(() => {
  localStorage.setItem('theme-mode', mode)
}, [mode])
```

This pattern should be followed for **language preference persistence**.

---

## Recommended i18n Framework

Based on the technology stack (React + TypeScript + Vite), the recommended options are:

### Option 1: **react-i18next** (RECOMMENDED)
- Most popular React i18n solution
- Excellent TypeScript support
- Works well with Material-UI
- Supports RTL out of the box
- Good performance with lazy-loading translations

### Option 2: **next-intl**
- Modern, lightweight
- Good TypeScript support
- But primarily designed for Next.js (may have limitations with Vite)

### Recommendation: **react-i18next**
It's the industry standard for React applications and has proven integration with Material-UI.

---

## Implementation Plan Requirements

Based on research, the following changes are needed:

### 1. Install Dependencies
```bash
npm install react-i18next i18next i18next-browser-languagedetector
```

### 2. Create i18n Configuration
- Create `frontend/src/i18n/` directory
- Create `frontend/src/i18n/config.ts` with i18next setup
- Create translation files:
  - `frontend/src/i18n/locales/en.json`
  - `frontend/src/i18n/locales/he.json`

### 3. Integrate with App
- Wrap app with `I18nextProvider` in `main.tsx`
- Configure language detection to check localStorage → browser language → default 'en'

### 4. Create Language Switcher Component
- Add to Header or Settings menu
- Follow existing ThemeToggle pattern (`frontend/src/components/common/ThemeToggle.tsx`)
- Persist selection to localStorage (key: `language` or `locale`)

### 5. Add RTL Support
- Configure Material-UI theme direction based on language
- Update ThemeContext to accept and handle direction
- Set `dir` attribute on `<html>` element when Hebrew is selected

### 6. Extract Hardcoded Strings
**High Priority Components:**
- Sidebar navigation items
- Header menu items
- Common UI messages (notifications, toasts, errors)
- Page titles

**Medium Priority:**
- Page content (Dashboard, Projects, etc.)
- Form labels and validation messages
- Empty states and placeholders

### 7. Font Configuration
- ✅ Already done! Noto Sans Hebrew is loaded
- Verify font rendering with actual Hebrew text

---

## RTL Considerations

### What Works Already
- Font switching via `[dir="rtl"]` CSS selector
- Material-UI has built-in RTL support via theme.direction

### What Needs Implementation
- Setting `theme.direction` based on selected language
- Setting `dir` attribute on HTML element
- Testing layout components in RTL mode
- Adjusting any hardcoded left/right CSS values

### Known Patterns from Codebase
Material-UI's `sx` prop is used throughout for styling, which automatically handles RTL when theme.direction is set.

Example from Header.tsx (line 65):
```typescript
sx={{
  ml: '260px',  // Material-UI will automatically convert to mr in RTL
  width: 'calc(100% - 260px)',
}}
```

---

## String Extraction Scope

Estimated **200-300 UI strings** need extraction based on:
- Navigation items: ~20 strings
- Page titles and headers: ~40 strings
- Form labels and buttons: ~80 strings
- Notifications and messages: ~60 strings
- Empty states and placeholders: ~40 strings
- Other UI text: ~40 strings

---

## Example Components for Pattern Matching

When implementing i18n, follow patterns from:

1. **ThemeToggle** (`frontend/src/components/common/ThemeToggle.tsx`)
   - For creating LanguageSwitcher component

2. **ThemeContext** (`frontend/src/theme/ThemeContext.tsx`)
   - For language context and persistence pattern

3. **Sidebar** (`frontend/src/components/layout/Sidebar.tsx`)
   - Example of components with many hardcoded strings

---

## Notes and Gotchas

1. **Hebrew is RTL**: Layout direction must flip when Hebrew is selected
2. **Mixed Content**: English terms (like "API", "RFI") may appear in Hebrew text - ensure proper bidirectional text handling
3. **Date Formatting**: Currently using `toLocaleString('en-US')` in some places - should be updated to use i18n locale
4. **Performance**: Consider lazy-loading translation files
5. **Theme Integration**: RTL direction must be coordinated with theme system
6. **Material-UI**: Most components handle RTL automatically via theme.direction

---

## Next Steps (Subtasks 1-2 through 1-6)

1. **subtask-1-2**: Install react-i18next and configure i18n framework
2. **subtask-1-3**: Create Hebrew translation file with extracted strings
3. **subtask-1-4**: Implement RTL layout support in theme
4. **subtask-1-5**: Verify Hebrew font rendering (mostly done!)
5. **subtask-1-6**: Create LanguageSwitcher component and add to Header

---

## Verification Checklist

- [x] Identified i18n framework status (none exists)
- [x] Located language files (none exist)
- [x] Documented current implementation patterns
- [x] Identified existing Hebrew font configuration
- [x] Identified RTL support infrastructure
- [x] Documented localStorage patterns
- [x] Recommended i18n framework (react-i18next)
- [x] Created implementation roadmap
- [x] Identified string extraction scope
- [x] Documented RTL considerations
