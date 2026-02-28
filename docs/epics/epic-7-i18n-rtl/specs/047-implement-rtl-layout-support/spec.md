# Specification: Implement RTL Layout Support

## Overview

This feature implements comprehensive Right-to-Left (RTL) layout support for the application to properly handle RTL languages like Hebrew and Arabic. The implementation leverages Material-UI's native RTL capabilities with emotion cache configuration and migrates existing CSS to use logical properties, enabling seamless bidirectional layout switching based on language selection.

## Workflow Type

**Type**: feature

**Rationale**: This is a new capability being added to support RTL languages. It requires new package installations, integration of Material-UI RTL system, refactoring of existing CSS patterns, and extending the current i18n infrastructure without breaking existing functionality.

## Task Scope

### Services Involved
- **frontend** (primary) - React application with Material-UI theming and i18n infrastructure

### This Task Will:
- [ ] Install required RTL dependencies (@mui/stylis-plugin-rtl, @emotion/cache, stylis)
- [ ] Configure Emotion cache with RTL plugin for Material-UI components
- [ ] Integrate CacheProvider wrapper in ThemeContext to enable dynamic RTL/LTR switching
- [ ] Migrate CSS from physical properties (left/right) to logical properties (inline-start/inline-end)
- [ ] Refactor rtl.css to remove !important overrides in favor of logical properties
- [ ] Verify RTL layout matches reference design (29-hebrew-rtl.png)
- [ ] Test bidirectional layout switching with existing LanguageToggle component

### Out of Scope:
- Translation of text content (i18next already handles this)
- RTL support for backend services
- Creating new language options beyond existing English/Hebrew
- Mobile-specific RTL optimizations
- RTL text editor or WYSIWYG components

## Service Context

### Frontend

**Tech Stack:**
- Language: TypeScript
- Framework: React
- Build Tool: Vite
- Styling: Emotion (@emotion/react, @emotion/styled)
- Component Library: Material-UI v5.15.6
- Internationalization: i18next v25.8.0
- Key directories: src/

**Entry Point:** `src/App.tsx`

**How to Run:**
```bash
cd frontend
npm run dev
```

**Port:** 3000

**Existing i18n Infrastructure:**
- `useLanguage` hook manages language state and sets `document.dir` attribute
- `LanguageToggle` component provides UI for language switching
- Languages configured: English (LTR), Hebrew (RTL)
- i18next provides `i18n.dir()` API for directional queries

## Files to Modify

| File | Service | What to Change |
|------|---------|---------------|
| `frontend/package.json` | frontend | Add dependencies: @mui/stylis-plugin-rtl, @emotion/cache, stylis |
| `frontend/src/theme/ThemeContext.tsx` | frontend | Add CacheProvider wrapper with dynamic RTL/LTR cache based on language direction |
| `frontend/src/styles/rtl.css` | frontend | Migrate from physical properties with !important to CSS logical properties |
| `frontend/src/hooks/useLanguage.ts` | frontend | Verify document.dir synchronization (already working, may need adjustment) |

## Files to Reference

These files show patterns to follow:

| File | Pattern to Copy |
|------|----------------|
| `frontend/src/hooks/useLanguage.ts` | Language state management and document.dir attribute setting |
| `frontend/src/components/common/LanguageToggle.tsx` | Language switching UI pattern |
| `frontend/src/theme/ThemeContext.tsx` | Existing theme provider structure and Material-UI theming |

## Patterns to Follow

### Emotion Cache Configuration for RTL

**Pattern:** Material-UI requires CacheProvider above ThemeProvider to enable RTL transformations via stylis plugin.

```typescript
import { CacheProvider } from '@emotion/react';
import createCache from '@emotion/cache';
import rtlPlugin from '@mui/stylis-plugin-rtl';
import { prefixer } from 'stylis';

// Create LTR cache (default)
const cacheLtr = createCache({
  key: 'muiltr',
  stylisPlugins: [prefixer],
});

// Create RTL cache
const cacheRtl = createCache({
  key: 'muirtl',
  stylisPlugins: [prefixer, rtlPlugin],
});

// Use based on current direction
const cache = direction === 'rtl' ? cacheRtl : cacheLtr;

<CacheProvider value={cache}>
  <ThemeProvider theme={theme}>
    {children}
  </ThemeProvider>
</CacheProvider>
```

**Key Points:**
- CacheProvider MUST be above ThemeProvider in component tree
- Use different cache keys for LTR ('muiltr') and RTL ('muirtl')
- RTL cache includes both prefixer and rtlPlugin
- Cache selection must be dynamic based on current language direction

### CSS Logical Properties Migration

**Pattern:** Replace directional physical properties with logical equivalents.

```css
/* BEFORE (Physical Properties) */
.element {
  margin-left: 16px;
  padding-right: 8px;
  border-left: 1px solid #ccc;
  text-align: left;
  left: 0;
  right: auto;
}

/* AFTER (Logical Properties) */
.element {
  margin-inline-start: 16px;
  padding-inline-end: 8px;
  border-inline-start: 1px solid #ccc;
  text-align: start;
  inset-inline-start: 0;
  inset-inline-end: auto;
}
```

**Key Points:**
- `left` → `inline-start`, `right` → `inline-end`
- `margin-left/right` → `margin-inline-start/end`
- `padding-left/right` → `padding-inline-start/end`
- `border-left/right` → `border-inline-start/end`
- `text-align: left/right` → `text-align: start/end`
- `top/bottom` remain unchanged (block-axis properties)
- Remove all `!important` declarations

### LTR-Only Content Handling

**Pattern:** Some content must remain LTR regardless of document direction (URLs, code, numbers).

```css
.ltr-content {
  direction: ltr;
  text-align: left;
  unicode-bidi: embed;
}
```

**Use for:**
- URLs and email addresses
- Code snippets
- Version numbers
- Numeric IDs
- File paths

## Requirements

### Functional Requirements

1. **Dynamic RTL/LTR Cache Selection**
   - Description: CacheProvider must dynamically select RTL or LTR cache based on current language
   - Acceptance: Cache switches when language changes, Material-UI components flip layout correctly

2. **Material-UI Component RTL Support**
   - Description: All MUI components (Drawer, Tooltip, Popover, etc.) must render correctly in RTL mode
   - Acceptance: Hebrew mode shows all MUI components mirrored as expected, matching 29-hebrew-rtl.png reference

3. **CSS Logical Properties Migration**
   - Description: Replace all physical directional CSS properties with logical equivalents
   - Acceptance: No hardcoded left/right properties in custom CSS, layout flows correctly in both directions

4. **Bidirectional Layout Switching**
   - Description: Layout must update immediately when language changes via LanguageToggle
   - Acceptance: Switching between English and Hebrew updates all layouts without page reload

5. **Theme Direction Synchronization**
   - Description: MUI theme direction must match HTML dir attribute
   - Acceptance: theme.direction and document.dir are always synchronized

### Edge Cases

1. **Mixed-Direction Content** - Handle embedded LTR content (URLs, code) in RTL context using .ltr-content class
2. **Transform Operations** - CSS transforms (translateX) don't auto-flip; manually handle or use logical properties
3. **Absolute Positioning** - Elements with position: absolute need logical properties (inset-inline-start/end)
4. **Icon Directionality** - Some icons (arrows, back buttons) may need manual mirroring in RTL contexts
5. **Third-Party Components** - Non-MUI components may need manual RTL handling

## Implementation Notes

### DO
- Use dynamic cache creation in ThemeContext based on i18n.dir()
- Install exact versions compatible with Emotion 11.11.3: stylis@^4, stylis-plugin-rtl@^2
- Leverage existing useLanguage hook for direction state
- Test all MUI components in Hebrew mode (Drawer, Popover, Tooltip especially)
- Use CSS logical properties consistently across all new and modified styles
- Preserve existing i18next functionality and LanguageToggle behavior

### DON'T
- Use `!important` to override RTL styles (migrate to logical properties instead)
- Mix logical and physical properties in same ruleset
- Hardcode LTR assumptions in component logic
- Modify i18next configuration (already working correctly)
- Create separate RTL/LTR stylesheets (use logical properties for unified approach)
- Break existing English (LTR) layouts

## Development Environment

### Start Services

```bash
# Frontend
cd frontend
npm install @mui/stylis-plugin-rtl @emotion/cache stylis
npm run dev
```

### Service URLs
- Frontend: http://localhost:3000

### Required Environment Variables
- `VITE_API_URL`: http://localhost:8001/api/v1 (already configured)

### Browser Requirements
- CSS Logical Properties support: Chrome 89+, Firefox 66+, Safari 15+ (excellent coverage)

## Success Criteria

The task is complete when:

1. [ ] All required packages installed (@mui/stylis-plugin-rtl, @emotion/cache, stylis)
2. [ ] CacheProvider integrated in ThemeContext with dynamic RTL/LTR cache selection
3. [ ] Theme direction synchronizes with document.dir when language changes
4. [ ] All custom CSS migrated from physical to logical properties
5. [ ] rtl.css refactored to use logical properties (no !important overrides)
6. [ ] Hebrew layout matches reference design in 29-hebrew-rtl.png
7. [ ] Language toggle switches layout correctly without page reload
8. [ ] No console errors in either English or Hebrew modes
9. [ ] Existing tests still pass
10. [ ] Material-UI components (Drawer, Tooltip, Popover, AppBar, Menu) render correctly in RTL
11. [ ] Browser verification shows proper RTL layout with Hebrew text

## QA Acceptance Criteria

**CRITICAL**: These criteria must be verified by the QA Agent before sign-off.

### Unit Tests
| Test | File | What to Verify |
|------|------|----------------|
| Cache Selection Logic | `src/theme/ThemeContext.test.tsx` | Correct cache selected based on direction (RTL vs LTR) |
| Direction Synchronization | `src/hooks/useLanguage.test.ts` | document.dir updates when language changes |

### Integration Tests
| Test | Services | What to Verify |
|------|----------|----------------|
| Theme-Language Integration | frontend | Theme direction matches language direction |
| MUI Component RTL Rendering | frontend | Material-UI components render correctly in RTL mode |

### End-to-End Tests
| Flow | Steps | Expected Outcome |
|------|-------|------------------|
| Language Toggle | 1. Start in English 2. Click LanguageToggle 3. Switch to Hebrew | Layout flips to RTL, all components mirror correctly |
| RTL Component Interaction | 1. Switch to Hebrew 2. Open Drawer 3. Open Tooltip 4. Open Menu | All components render and behave correctly in RTL |
| Bidirectional Switching | 1. Toggle English→Hebrew→English 2. Navigate between pages | No layout glitches, smooth transitions, no console errors |

### Browser Verification (if frontend)
| Page/Component | URL | Checks |
|----------------|-----|--------|
| Main Application | `http://localhost:3000` (Hebrew) | - Document has dir="rtl" attribute<br>- Text flows right-to-left<br>- Layout matches 29-hebrew-rtl.png<br>- Scrollbars on left side |
| MUI Drawer Component | Any page with drawer in Hebrew | - Drawer slides from right side<br>- Close button on right<br>- Content aligned to right |
| Form Components | Any form in Hebrew | - Labels on right side<br>- Input fields aligned right<br>- Validation messages on right |
| Navigation | AppBar/Menu in Hebrew | - Menu items aligned right<br>- Icons positioned correctly<br>- Dropdowns expand correctly |

### CSS Verification
| Check | Command | Expected |
|-------|---------|----------|
| No physical properties in custom CSS | `grep -r "margin-left\|margin-right\|padding-left\|padding-right" frontend/src --include="*.css" --include="*.tsx"` | Only logical properties found |
| No !important in rtl.css | `grep "!important" frontend/src/styles/rtl.css` | No matches or very limited justified use |
| Logical properties used | `grep -r "margin-inline\|padding-inline\|inset-inline" frontend/src/styles` | Logical properties present |

### Package Verification
| Check | Command | Expected |
|-------|---------|----------|
| RTL packages installed | `npm list @mui/stylis-plugin-rtl @emotion/cache stylis` | All packages present with correct versions |
| No dependency conflicts | `npm list --depth=0` | No unmet peer dependencies |

### QA Sign-off Requirements
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] All E2E tests pass (including bidirectional switching)
- [ ] Browser verification complete with Hebrew language selected
- [ ] CSS verification shows logical properties used consistently
- [ ] No physical directional properties in new code
- [ ] Package.json contains all required RTL dependencies
- [ ] No regressions in existing English (LTR) functionality
- [ ] Code follows established patterns from ThemeContext and useLanguage
- [ ] No security vulnerabilities introduced
- [ ] Reference design (29-hebrew-rtl.png) matches actual Hebrew layout
- [ ] Performance acceptable (no lag when switching languages)
- [ ] All Material-UI components tested in RTL (Drawer, Tooltip, Popover, Menu, AppBar, Tabs)
