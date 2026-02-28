# Specification: Implement Mobile-First Responsive Design

## Overview

This task establishes a comprehensive mobile-first responsive design system for the Construction Operations Platform frontend. The implementation will define a consistent breakpoint system, ensure all interactive elements meet touch target size requirements, and implement mobile-optimized navigation patterns. This foundation will ensure the application provides an optimal user experience across all device sizes, with particular focus on mobile and tablet devices commonly used on construction sites.

## Workflow Type

**Type**: feature

**Rationale**: This is a new feature implementation that adds mobile-first responsive capabilities to the existing application. It involves establishing new design patterns, updating the theme system, and implementing new mobile navigation components.

## Task Scope

### Services Involved
- **frontend** (primary) - All responsive design changes occur in the Next.js frontend application

### This Task Will:
- [ ] Establish a mobile-first breakpoint system in the MUI theme configuration
- [ ] Audit and update interactive elements to meet minimum touch target sizes (44x44px)
- [ ] Implement mobile-optimized navigation pattern (hamburger menu or bottom navigation)
- [ ] Create responsive layout utilities and components
- [ ] Update existing pages and components to be mobile-responsive
- [ ] Add responsive design testing and validation

### Out of Scope:
- Backend API changes (all APIs remain unchanged)
- Database schema modifications
- New feature functionality (only responsive design improvements)
- Complete redesign of existing UI (maintain current design language, just make it responsive)

## Service Context

### Frontend

**Tech Stack:**
- Language: TypeScript
- Framework: Next.js
- Styling: Emotion (CSS-in-JS)
- UI Library: Material-UI (MUI)
- Build Tool: Vite
- Testing: Vitest (unit), Playwright (E2E)

**Entry Point:** `src/App.tsx`

**How to Run:**
```bash
cd frontend
npm run dev
```

**Port:** 3000

**Key Libraries for Responsive Design:**
- `@mui/material` - Provides theme system and responsive utilities
- `@emotion/react` - CSS-in-JS styling
- `@emotion/styled` - Styled components with responsive capabilities

## Files to Modify

| File | Service | What to Change |
|------|---------|---------------|
| `frontend/src/theme/index.ts` (or similar theme config) | frontend | Add/update breakpoint definitions in MUI theme |
| `frontend/src/components/layout/Header.tsx` (or navigation component) | frontend | Implement mobile navigation (hamburger menu) |
| `frontend/src/components/layout/Sidebar.tsx` (if exists) | frontend | Make sidebar responsive with drawer behavior on mobile |
| `frontend/src/App.tsx` | frontend | Update main layout for responsive behavior |
| `frontend/src/styles/global.css` (if exists) | frontend | Add base responsive styles and touch target CSS custom properties |

**Note:** The exact file paths may vary. Common patterns in Next.js apps include:
- Theme: `theme/`, `styles/theme/`, `lib/theme/`
- Layout components: `components/layout/`, `components/navigation/`
- Global styles: `styles/`, `app/globals.css`

## Files to Reference

These MUI documentation patterns should be followed:

| Pattern | Reference |
|---------|-----------|
| MUI Breakpoints | [MUI Theme Breakpoints](https://mui.com/material-ui/customization/breakpoints/) |
| MUI useMediaQuery hook | [MUI useMediaQuery](https://mui.com/material-ui/react-use-media-query/) |
| MUI Responsive Drawer | [MUI Drawer](https://mui.com/material-ui/react-drawer/) for mobile nav |
| MUI AppBar | [MUI AppBar](https://mui.com/material-ui/react-app-bar/) for responsive header |

## Patterns to Follow

### Mobile-First Breakpoint System

Define breakpoints in MUI theme following mobile-first approach:

```typescript
// theme/index.ts
import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  breakpoints: {
    values: {
      xs: 0,      // Mobile portrait
      sm: 640,    // Mobile landscape / small tablet
      md: 768,    // Tablet portrait
      lg: 1024,   // Tablet landscape / small desktop
      xl: 1280,   // Desktop
    },
  },
});
```

**Key Points:**
- Start with mobile styles as default
- Use `theme.breakpoints.up()` for progressive enhancement
- Example: `[theme.breakpoints.up('md')]` applies styles for tablet and above

### Touch Target Sizing

Ensure all interactive elements meet WCAG 2.1 Level AAA guidelines:

```typescript
// Minimum touch target: 44x44px
const StyledButton = styled(Button)(({ theme }) => ({
  minWidth: '44px',
  minHeight: '44px',
  padding: theme.spacing(1.5),

  // For icon-only buttons
  '&.icon-button': {
    width: '44px',
    height: '44px',
  },
}));
```

**Key Points:**
- Minimum 44x44px for all touchable elements (buttons, links, inputs)
- Add adequate spacing between touch targets (8px minimum)
- Use `padding` rather than fixed sizes when possible for flexibility

### Responsive Navigation Pattern

Implement responsive AppBar with mobile drawer:

```typescript
// components/layout/Header.tsx
import { AppBar, IconButton, Drawer, useMediaQuery, useTheme } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';

export function Header() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      <AppBar position="fixed">
        {isMobile && (
          <IconButton
            edge="start"
            color="inherit"
            aria-label="menu"
            onClick={() => setDrawerOpen(true)}
            sx={{ minWidth: 44, minHeight: 44 }}
          >
            <MenuIcon />
          </IconButton>
        )}
        {/* Desktop navigation */}
      </AppBar>

      {isMobile && (
        <Drawer
          anchor="left"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
        >
          {/* Mobile navigation menu */}
        </Drawer>
      )}
    </>
  );
}
```

**Key Points:**
- Use `useMediaQuery` hook for responsive behavior
- Drawer for mobile, inline navigation for desktop
- Ensure touch targets in mobile menu are 44x44px minimum

### Responsive Layout Components

Use MUI Grid and Container with responsive props:

```typescript
import { Container, Grid } from '@mui/material';

<Container maxWidth="xl">
  <Grid container spacing={{ xs: 2, md: 3 }}>
    <Grid item xs={12} md={6} lg={4}>
      {/* Responsive grid item */}
    </Grid>
  </Grid>
</Container>
```

**Key Points:**
- Use responsive spacing: `spacing={{ xs: 2, md: 3 }}`
- Define column spans per breakpoint: `xs={12} md={6} lg={4}`
- Use `Container` with `maxWidth` to constrain content on large screens

## Requirements

### Functional Requirements

1. **Breakpoint System**
   - Description: Define mobile-first breakpoints in MUI theme (xs, sm, md, lg, xl)
   - Acceptance: Theme exports breakpoints that can be used with `useMediaQuery` and responsive props

2. **Touch Target Compliance**
   - Description: All interactive elements (buttons, links, inputs, icons) meet 44x44px minimum size
   - Acceptance: Manual testing on mobile device confirms all elements are easily tappable without mis-taps

3. **Mobile Navigation**
   - Description: Implement hamburger menu or bottom navigation for mobile devices
   - Acceptance: On screens <768px, navigation collapses to mobile-friendly pattern; on larger screens, shows full navigation

4. **Responsive Layout**
   - Description: All pages and major components adapt to different screen sizes
   - Acceptance: Pages are usable and properly formatted on mobile (375px), tablet (768px), and desktop (1280px+) viewports

### Edge Cases

1. **Orientation Changes** - Handle device rotation (portrait ↔ landscape) without breaking layout
2. **Very Small Screens** - Support minimum width of 320px (iPhone SE)
3. **Extra Large Screens** - Cap maximum content width to maintain readability (1440px-1920px)
4. **Touch vs Mouse** - Ensure hover states don't interfere with touch interactions
5. **Drawer State Persistence** - Mobile drawer should close on navigation and not persist when resizing to desktop

## Implementation Notes

### DO
- Start with mobile styles first, then enhance for larger screens
- Use MUI's `useMediaQuery` hook for JavaScript-based responsive logic
- Use MUI's responsive props (`sx={{ fontSize: { xs: '14px', md: '16px' } }}`) for CSS-based responsiveness
- Test on actual mobile devices or browser DevTools device emulation
- Ensure all touch targets have adequate spacing (minimum 8px)
- Use semantic HTML and ARIA labels for mobile navigation
- Consider landscape orientation as well as portrait

### DON'T
- Don't use pixel values directly; use theme spacing (`theme.spacing()`)
- Don't hide critical functionality on mobile
- Don't rely on hover states for mobile interactions
- Don't use viewport width units (`vw`, `vh`) without careful testing
- Don't create separate mobile/desktop codebases; use responsive design
- Don't forget to test forms and data entry on mobile (keyboard behavior)

## Development Environment

### Start Services

```bash
# Frontend
cd frontend
npm run dev
# Access at http://localhost:3000

# Backend (if needed for testing)
cd backend
python -m uvicorn app.main:app --reload
# Access at http://localhost:8000
```

### Service URLs
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/api/v1
- API Docs: http://localhost:8000/docs

### Required Environment Variables
- `NEXT_PUBLIC_API_URL` or `VITE_API_URL`: Backend API URL (http://localhost:8000/api/v1)

### Testing Responsive Design

**Browser DevTools:**
```bash
# Chrome DevTools device emulation
# 1. Open DevTools (F12)
# 2. Toggle device toolbar (Ctrl+Shift+M)
# 3. Test on: iPhone SE (375px), iPad (768px), Desktop (1280px)
```

**Playwright E2E Tests:**
```bash
cd frontend
npm run test:e2e
```

## Success Criteria

The task is complete when:

1. [ ] MUI theme includes mobile-first breakpoint configuration (xs: 0, sm: 640, md: 768, lg: 1024, xl: 1280)
2. [ ] All buttons, links, and interactive elements meet 44x44px minimum touch target size
3. [ ] Mobile navigation (hamburger menu or drawer) is implemented and functional on screens <768px
4. [ ] Desktop navigation is shown inline on screens ≥768px
5. [ ] All existing pages render properly on mobile (375px), tablet (768px), and desktop (1280px+) viewports
6. [ ] No horizontal scrolling on any viewport size
7. [ ] Typography scales appropriately across breakpoints
8. [ ] No console errors or warnings related to responsive behavior
9. [ ] Existing unit tests still pass
10. [ ] Manual testing on actual mobile device or browser DevTools confirms usability

## QA Acceptance Criteria

**CRITICAL**: These criteria must be verified by the QA Agent before sign-off.

### Unit Tests
| Test | File | What to Verify |
|------|------|----------------|
| Theme breakpoints | `frontend/src/theme/index.test.ts` (create if needed) | Verify theme exports correct breakpoint values |
| Responsive hook behavior | `frontend/src/hooks/useResponsive.test.ts` (if custom hook created) | Verify responsive utilities work correctly |
| Mobile navigation toggle | `frontend/src/components/layout/Header.test.tsx` | Verify drawer opens/closes on mobile |

### Integration Tests
| Test | Services | What to Verify |
|------|----------|----------------|
| API calls from mobile | frontend ↔ backend | API calls work correctly from mobile viewport |
| Navigation flow | frontend | User can navigate between pages on mobile |

### End-to-End Tests
| Flow | Steps | Expected Outcome |
|------|-------|------------------|
| Mobile navigation | 1. Resize to 375px 2. Click hamburger menu 3. Click nav link | Drawer opens, navigation works, drawer closes |
| Responsive layout | 1. Visit dashboard at 375px 2. Resize to 768px 3. Resize to 1280px | Layout adapts smoothly at each breakpoint |
| Touch targets | 1. Open on mobile device 2. Tap all interactive elements | No mis-taps, all elements respond to touch |

### Browser Verification (Frontend)
| Page/Component | URL | Checks |
|----------------|-----|--------|
| Home/Dashboard | `http://localhost:3000/` | ✓ Layout responsive ✓ Navigation works ✓ No horizontal scroll |
| Any form page | `http://localhost:3000/[form-page]` | ✓ Form inputs 44px+ height ✓ Buttons 44x44px+ ✓ Keyboard opens correctly |
| Navigation | `http://localhost:3000/` | ✓ Hamburger visible <768px ✓ Drawer functional ✓ Desktop nav visible ≥768px |

**Testing Viewports:**
- Mobile: 375x667 (iPhone SE)
- Tablet: 768x1024 (iPad)
- Desktop: 1280x720

### Responsive Design Verification
| Check | Test Method | Expected |
|-------|-------------|----------|
| Breakpoint system | DevTools responsive mode | Theme breakpoints active at correct widths |
| Touch targets | Mobile device or DevTools touch mode | All buttons/links minimum 44x44px, easy to tap |
| Mobile navigation | Resize browser <768px | Hamburger menu appears, drawer functional |
| Desktop navigation | Resize browser ≥768px | Full navigation inline, no hamburger |
| No horizontal scroll | Test all pages at 320px-2560px | No horizontal scrollbar at any width |
| Typography scaling | Compare mobile vs desktop | Text readable on mobile, appropriately sized on desktop |
| Image/media responsiveness | Check images on mobile | Images scale, don't overflow container |

### QA Sign-off Requirements
- [ ] All unit tests pass
- [ ] Mobile navigation (drawer) opens and closes correctly
- [ ] Desktop navigation displays inline on larger screens
- [ ] All touch targets meet 44x44px minimum on mobile testing
- [ ] No horizontal scrolling on any tested viewport (320px-2560px)
- [ ] No regressions in existing functionality
- [ ] Code follows established MUI/Emotion patterns
- [ ] No accessibility violations (ARIA labels on mobile nav)
- [ ] Tested on at least one physical mobile device or comprehensive DevTools testing
- [ ] Performance acceptable on mobile (no jank during resize/scroll)
