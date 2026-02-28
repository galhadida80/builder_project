# Specification: Implement RTL Layout Support

## Overview

This task implements comprehensive Right-to-Left (RTL) layout support for the application to enable proper display of Hebrew and other RTL languages. The implementation uses the `dir="rtl"` HTML attribute combined with CSS logical properties to ensure automatic layout mirroring without duplicating CSS rules.

## Workflow Type

**Type**: feature

**Rationale**: This is a new capability being added to the application to support internationalization for RTL languages. It requires frontend architecture changes, styling updates, and comprehensive testing to ensure visual consistency in both LTR and RTL modes.

## Task Scope

### Services Involved
- **frontend** (primary) - All UI components, layouts, and styling will be updated to support RTL layout

### This Task Will:
- [ ] Add `dir` attribute support to the application root based on language selection
- [ ] Migrate directional CSS properties to CSS logical properties (margin-left → margin-inline-start, etc.)
- [ ] Update layout components to use logical properties for proper RTL mirroring
- [ ] Ensure MUI components render correctly in RTL mode
- [ ] Verify icon and directional element flipping in RTL mode
- [ ] Test all major UI flows in both LTR and RTL modes
- [ ] Reference the Hebrew RTL design mockup (29-hebrew-rtl.png)

### Out of Scope:
- Translation of text content to Hebrew (this task focuses on layout direction only)
- Backend API changes (RTL is purely a frontend presentation concern)
- Language detection or automatic locale switching
- Database schema changes for storing language preferences

## Service Context

### Frontend

**Tech Stack:**
- Language: TypeScript
- Framework: React
- Styling: Emotion (CSS-in-JS)
- UI Components: Material UI (@mui/material)
- Build Tool: Vite

**Entry Point:** `src/App.tsx`

**How to Run:**
```bash
cd frontend
npm run dev
```

**Port:** 3000

**Key Dependencies:**
- `@emotion/react` - CSS-in-JS styling
- `@emotion/styled` - Styled components
- `@mui/material` - UI component library
- `react` - UI framework
- `react-dom` - React rendering
- `react-router-dom` - Routing

## Files to Modify

Since the context phase didn't identify specific files, the implementation should focus on:

| Pattern | Service | What to Change |
|---------|---------|---------------|
| Global theme/styling setup | frontend | Add RTL direction configuration |
| Layout components | frontend | Convert physical CSS properties to logical properties |
| Emotion styled components | frontend | Update directional styles to use logical properties |
| Root application component | frontend | Apply `dir` attribute based on language |
| Navigation components | frontend | Ensure proper mirroring in RTL mode |

## Files to Reference

| Reference | Pattern to Observe |
|-----------|-------------------|
| `29-hebrew-rtl.png` | Visual specification showing expected RTL layout |
| MUI documentation | RTL support patterns for Material UI components |
| Emotion documentation | CSS logical properties with CSS-in-JS |

## Patterns to Follow

### CSS Logical Properties

Instead of physical properties (left/right), use logical properties that automatically flip in RTL:

**Before (LTR-only):**
```css
.element {
  margin-left: 16px;
  padding-right: 8px;
  text-align: left;
  border-left: 1px solid #ccc;
}
```

**After (LTR + RTL compatible):**
```css
.element {
  margin-inline-start: 16px;
  padding-inline-end: 8px;
  text-align: start;
  border-inline-start: 1px solid #ccc;
}
```

**Key Mappings:**
- `left` → `inline-start`
- `right` → `inline-end`
- `margin-left` → `margin-inline-start`
- `margin-right` → `margin-inline-end`
- `padding-left` → `padding-inline-start`
- `padding-right` → `padding-inline-end`
- `border-left` → `border-inline-start`
- `border-right` → `border-inline-end`
- `text-align: left` → `text-align: start`
- `text-align: right` → `text-align: end`

### MUI RTL Support

Material UI provides built-in RTL support through the theme:

```typescript
import { createTheme, ThemeProvider } from '@mui/material/styles';
import rtlPlugin from 'stylis-plugin-rtl';
import { CacheProvider } from '@emotion/react';
import createCache from '@emotion/cache';
import { prefixer } from 'stylis';

// Create RTL cache
const cacheRtl = createCache({
  key: 'muirtl',
  stylisPlugins: [prefixer, rtlPlugin],
});

// Create theme with RTL direction
const theme = createTheme({
  direction: 'rtl',
});

// Apply in component
<CacheProvider value={cacheRtl}>
  <ThemeProvider theme={theme}>
    <App />
  </ThemeProvider>
</CacheProvider>
```

### HTML Direction Attribute

Apply the `dir` attribute at the root level:

```tsx
// In App.tsx or root component
const isRTL = currentLanguage === 'he' || currentLanguage === 'ar';

return (
  <div dir={isRTL ? 'rtl' : 'ltr'}>
    {/* Application content */}
  </div>
);
```

## Requirements

### Functional Requirements

1. **Directional Layout Mirroring**
   - Description: All layouts automatically mirror when RTL mode is active
   - Acceptance: Navigation, sidebars, forms, and content layouts display in reverse when dir="rtl" is applied

2. **CSS Logical Properties Migration**
   - Description: All directional CSS properties use logical equivalents
   - Acceptance: No hardcoded left/right properties remain in component styles; layout mirrors correctly in RTL

3. **Icon and Directional Element Handling**
   - Description: Directional icons (arrows, chevrons) flip appropriately in RTL mode
   - Acceptance: Navigation arrows, expand/collapse icons, and directional indicators face the correct direction

4. **MUI Component Compatibility**
   - Description: Material UI components render correctly in RTL mode
   - Acceptance: All MUI components (DataGrid, DatePickers, Dialogs, Menus) display properly in RTL

5. **Visual Consistency**
   - Description: RTL layout matches the design specification in 29-hebrew-rtl.png
   - Acceptance: Hebrew RTL layout matches the reference mockup visually

### Edge Cases

1. **Mixed Content** - Handle pages with both LTR (numbers, English terms) and RTL (Hebrew) text gracefully
2. **Nested Directions** - Support nested LTR content within RTL pages (e.g., code snippets, email addresses)
3. **Absolute Positioning** - Components using absolute positioning should respect RTL direction
4. **Transform Properties** - CSS transforms that reference directions (translateX) should flip in RTL
5. **Flexbox/Grid** - Flex and Grid layouts should reverse their flow direction in RTL mode

## Implementation Notes

### DO
- Use CSS logical properties (`inline-start/end`, `block-start/end`) for all directional styling
- Test with MUI's RTL cache provider and theme configuration
- Apply `dir` attribute at the root level (html or body element)
- Use the Emotion theme to manage RTL/LTR state globally
- Verify all layouts in both directions during development
- Reference the 29-hebrew-rtl.png mockup for expected visual behavior
- Install `stylis-plugin-rtl` for Emotion RTL support: `npm install stylis-plugin-rtl`

### DON'T
- Don't use physical directional properties (left, right, margin-left, padding-right) in new code
- Don't create separate RTL-specific CSS files or duplicate styles
- Don't hardcode LTR assumptions in JavaScript logic
- Don't forget to flip directional icons and images
- Don't assume text-align: left is safe (use text-align: start instead)

## Development Environment

### Start Services

```bash
# Start frontend
cd frontend
npm run dev

# Frontend will be available at http://localhost:3000
```

### Service URLs
- Frontend: http://localhost:3000

### Required Environment Variables
- `VITE_API_URL`: http://localhost:8000/api/v1 (already configured)

### Additional Dependencies to Install

```bash
cd frontend
npm install stylis-plugin-rtl
npm install @emotion/cache
```

## Success Criteria

The task is complete when:

1. [ ] Application supports `dir="rtl"` attribute on the root element
2. [ ] All layout components use CSS logical properties instead of physical properties
3. [ ] MUI components render correctly with RTL cache provider configured
4. [ ] Navigation, sidebars, forms, and tables mirror properly in RTL mode
5. [ ] Directional icons and elements flip appropriately
6. [ ] RTL layout matches the 29-hebrew-rtl.png reference design
7. [ ] No console errors when switching between LTR and RTL modes
8. [ ] Existing LTR layouts remain visually unchanged
9. [ ] Browser testing confirms RTL support in Chrome, Firefox, and Safari

## QA Acceptance Criteria

**CRITICAL**: These criteria must be verified by the QA Agent before sign-off.

### Unit Tests
| Test | File | What to Verify |
|------|------|----------------|
| CSS logical property usage | `frontend/src/**/*.tsx` | No usage of `margin-left`, `margin-right`, `padding-left`, `padding-right`, `left`, `right`, `text-align: left`, `text-align: right` in new/updated components |
| Direction context | `frontend/src/App.tsx` or theme setup | `dir` attribute is correctly applied based on language setting |

### Integration Tests
| Test | Services | What to Verify |
|------|----------|----------------|
| MUI RTL integration | frontend | MUI theme configured with RTL direction and Emotion cache provider set up |
| Layout mirroring | frontend | Navigation, sidebars, and main content areas reverse correctly |

### End-to-End Tests
| Flow | Steps | Expected Outcome |
|------|-------|------------------|
| RTL Mode Activation | 1. Load application 2. Switch to Hebrew language (if language switcher exists) or manually set dir="rtl" | Layout mirrors completely, all content flows right-to-left |
| Navigation in RTL | 1. Enable RTL mode 2. Navigate through all major pages | All pages display correctly in RTL without layout breaks |
| Form Interaction | 1. Enable RTL mode 2. Fill out forms | Input fields, labels, and buttons align correctly (right-aligned) |
| Data Tables | 1. Enable RTL mode 2. View DataGrid components | Column headers, cell content, and action buttons flow RTL |

### Browser Verification (Frontend)
| Page/Component | URL | Checks |
|----------------|-----|--------|
| Main Application | `http://localhost:3000` | Add `dir="rtl"` to root element manually or via DevTools; verify complete layout mirroring |
| Navigation | `http://localhost:3000` | Sidebar/menu appears on right, navigation items align right |
| Forms | `http://localhost:3000/*` | Form labels on right, inputs flow RTL |
| Data Tables | `http://localhost:3000/*` | Tables flow RTL, columns reverse order |

### Visual Verification
| Check | Reference | Expected |
|-------|-----------|----------|
| Hebrew RTL Layout | 29-hebrew-rtl.png | Visual layout matches the design mockup |
| Icon Flipping | Visual inspection | Directional icons (arrows, chevrons) point in mirrored directions |
| Text Alignment | Visual inspection | Text aligns to the right edge in RTL mode |

### Code Quality Checks
| Check | Command/Tool | Expected |
|-------|--------------|----------|
| CSS Property Audit | Search for `margin-left`, `margin-right`, `padding-left`, `padding-right`, `left:`, `right:`, `text-align: left`, `text-align: right` in modified files | All instances replaced with logical equivalents |
| TypeScript Compilation | `npm run build` in frontend | No TypeScript errors |
| Console Errors | Browser DevTools | No console errors in LTR or RTL modes |

### QA Sign-off Requirements
- [ ] All unit tests pass (no physical CSS properties in updated components)
- [ ] MUI RTL configuration verified (theme + cache provider)
- [ ] Browser verification complete in Chrome, Firefox, Safari
- [ ] RTL layout visually matches 29-hebrew-rtl.png reference
- [ ] No regressions in existing LTR functionality
- [ ] Code follows Emotion and MUI best practices
- [ ] No console errors in either LTR or RTL modes
- [ ] All directional icons and elements flip correctly
- [ ] Forms, tables, and navigation components work in RTL mode
- [ ] Performance is not degraded (no significant bundle size increase)
