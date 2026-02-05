# Specification: Implement Transition System

## Overview

Implement a comprehensive transition system for the Construction Operations Platform frontend, establishing design tokens for animation timing and easing, implementing smooth page transitions for navigation, and creating consistent modal/dialog animations. This system will provide a polished, professional user experience with standardized animation patterns across the application.

## Workflow Type

**Type**: feature

**Rationale**: This task introduces new animation infrastructure including design tokens, page transition logic, and modal animation components. It extends the existing UI system with new capabilities rather than modifying existing behavior, making it a feature addition.

## Task Scope

### Services Involved
- **frontend** (primary) - React/TypeScript application requiring transition system implementation

### This Task Will:
- [ ] Create animation/transition design tokens (timing, duration, easing functions)
- [ ] Implement page transition animations for React Router navigation
- [ ] Create modal/dialog enter/exit animations using Material-UI components
- [ ] Ensure accessibility compliance (respect `prefers-reduced-motion`)
- [ ] Document transition usage patterns for developers

### Out of Scope:
- Backend API changes (this is frontend-only)
- Complex micro-interactions or gesture animations
- Third-party animation library integration (use Material-UI + CSS transitions)
- Performance optimization beyond standard best practices

## Service Context

### Frontend

**Tech Stack:**
- Language: TypeScript
- Framework: React
- Key directories: src/
- Styling: Emotion (CSS-in-JS)
- Component Library: Material-UI (@mui/material)
- Routing: React Router DOM

**Entry Point:** `src/App.tsx`

**How to Run:**
```bash
cd frontend
npm run dev
```

**Port:** 3000

**Key Dependencies:**
- `@emotion/react` - CSS-in-JS for custom animations
- `@mui/material` - Provides built-in Transition components
- `react-router-dom` - Page routing and navigation

## Files to Modify

| File | Service | What to Change |
|------|---------|---------------|
| `frontend/src/theme/transitions.ts` | frontend | Create new file for transition design tokens |
| `frontend/src/App.tsx` | frontend | Wrap router with page transition logic |
| `frontend/src/components/common/PageTransition.tsx` | frontend | Create new reusable page transition component |
| `frontend/src/components/common/AnimatedModal.tsx` | frontend | Create new modal component with animations |

## Files to Reference

These files show patterns to follow:

| File | Pattern to Copy |
|------|----------------|
| `frontend/src/theme/index.ts` | Theme structure and token definition pattern |
| Material-UI Transition API docs | Built-in transition components (Fade, Slide, Grow) |
| `frontend/src/components/**/*.tsx` | Existing component patterns and TypeScript conventions |

## Patterns to Follow

### Design Token Pattern

Material-UI theme extension pattern for custom tokens:

```typescript
// Extend the theme with transition tokens
declare module '@mui/material/styles' {
  interface Theme {
    transitions: {
      duration: {
        shortest: number;
        shorter: number;
        short: number;
        standard: number;
        complex: number;
        enteringScreen: number;
        leavingScreen: number;
      };
      easing: {
        easeInOut: string;
        easeOut: string;
        easeIn: string;
        sharp: string;
      };
    };
  }
}
```

**Key Points:**
- Use Material-UI's existing transition system as foundation
- Define semantic names (e.g., `enteringScreen`, `leavingScreen`)
- Keep values in milliseconds for duration
- Use standard CSS easing function strings

### Material-UI Transition Components

Material-UI provides built-in transition components:

```typescript
import { Fade, Slide, Grow } from '@mui/material';

<Fade in={open} timeout={300}>
  <div>Content</div>
</Fade>
```

**Key Points:**
- `Fade` - Opacity transitions (best for modals)
- `Slide` - Directional slide transitions (good for pages)
- `Grow` - Scale + opacity (good for popovers)
- All respect `prefers-reduced-motion` automatically

### Accessibility Pattern

Always respect user motion preferences:

```typescript
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const duration = prefersReducedMotion ? 0 : theme.transitions.duration.standard;
```

**Key Points:**
- Check `prefers-reduced-motion` media query
- Set duration to 0 when motion is reduced
- Material-UI transitions handle this automatically

## Requirements

### Functional Requirements

1. **Transition Design Tokens**
   - Description: Create centralized design tokens for all transition timing and easing
   - Acceptance: Tokens file exists with duration values (100-500ms range) and easing curves
   - Values should align with Material-UI's default transition system

2. **Page Transitions**
   - Description: Add smooth transitions between route changes
   - Acceptance: Navigation between any two pages shows a fade or slide transition (200-300ms)
   - Should not block user interaction or slow down navigation

3. **Modal Animations**
   - Description: Modals/dialogs enter with fade+scale and exit with reverse animation
   - Acceptance: All modal components use consistent enter/exit animations
   - Backdrop should fade in/out (150-200ms)

4. **Accessibility Compliance**
   - Description: Respect `prefers-reduced-motion` user preference
   - Acceptance: When reduced motion is enabled, all animations complete instantly (0ms)
   - Test with browser DevTools or OS settings

### Edge Cases

1. **Fast Navigation** - If user clicks multiple links rapidly, transitions should cancel and reset properly (use React keys or transition groups)
2. **Modal Stacking** - If multiple modals open, each should animate independently without z-index conflicts
3. **Slow Devices** - Transitions should remain smooth on older hardware (use GPU-accelerated properties: transform, opacity)
4. **Initial Page Load** - First page should not show transition (only subsequent navigations)

## Implementation Notes

### DO
- Use Material-UI's `Fade`, `Slide`, `Grow` components (built-in and accessible)
- Define all timing values as theme tokens (no hardcoded numbers in components)
- Test with `prefers-reduced-motion: reduce` enabled in browser DevTools
- Use CSS `transform` and `opacity` for best performance
- Keep transitions fast (under 300ms for most interactions)
- Document the transition system in code comments

### DON'T
- Install additional animation libraries (Framer Motion, React Spring) - use Material-UI built-ins
- Use JavaScript-based animations for simple transitions (prefer CSS)
- Block user interaction during transitions
- Create overly complex or distracting animations
- Hardcode transition values in individual components

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
- `VITE_API_URL`: http://localhost:8000/api/v1 (optional for this task)

## Success Criteria

The task is complete when:

1. [ ] Transition tokens file created with timing and easing values
2. [ ] Page transitions implemented for all route changes (fade or slide)
3. [ ] Modal components use consistent enter/exit animations
4. [ ] Accessibility: `prefers-reduced-motion` properly respected (animations disabled)
5. [ ] No console errors during transitions
6. [ ] Existing tests still pass
7. [ ] Manual verification shows smooth, professional animations

## QA Acceptance Criteria

**CRITICAL**: These criteria must be verified by the QA Agent before sign-off.

### Unit Tests
| Test | File | What to Verify |
|------|------|----------------|
| Transition tokens export | `frontend/src/theme/transitions.test.ts` | Verify duration and easing values are defined |
| PageTransition renders | `frontend/src/components/common/PageTransition.test.tsx` | Component renders children and accepts transition props |
| AnimatedModal transitions | `frontend/src/components/common/AnimatedModal.test.tsx` | Modal shows/hides with proper transition states |

### Integration Tests
| Test | Services | What to Verify |
|------|----------|----------------|
| Theme integration | frontend | Transition tokens available in theme context |
| Router integration | frontend | Page transitions work with React Router navigation |

### End-to-End Tests
| Flow | Steps | Expected Outcome |
|------|-------|------------------|
| Page navigation | 1. Load home page 2. Click navigation link 3. Observe transition | Smooth fade/slide transition (200-300ms), no flicker |
| Modal open/close | 1. Click button to open modal 2. Observe entrance 3. Close modal | Modal fades+scales in, backdrop appears, exit reverses animation |
| Reduced motion | 1. Enable reduced motion in browser 2. Navigate pages 3. Open modal | All transitions complete instantly (0ms), no animation |

### Browser Verification (if frontend)
| Page/Component | URL | Checks |
|----------------|-----|--------|
| Any page navigation | `http://localhost:3000/*` | Transitions smooth, no layout shift, timing feels natural |
| Modal example | `http://localhost:3000/*` (any page with dialogs) | Modal animates in/out smoothly, backdrop fades |
| Reduced motion test | DevTools: Emulate CSS `prefers-reduced-motion: reduce` | No visible animations occur |

### Database Verification (if applicable)
| Check | Query/Command | Expected |
|-------|---------------|----------|
| N/A | N/A | Frontend-only task, no database changes |

### QA Sign-off Requirements
- [ ] All unit tests pass (transitions tokens, PageTransition, AnimatedModal)
- [ ] Integration tests pass (theme integration, router integration)
- [ ] E2E tests pass (page navigation, modal animations, reduced motion)
- [ ] Browser verification complete:
  - [ ] Page transitions work on all routes
  - [ ] Modals animate consistently
  - [ ] `prefers-reduced-motion` disables animations
- [ ] No regressions in existing functionality
- [ ] Code follows established patterns (TypeScript, Emotion, Material-UI)
- [ ] No accessibility violations (motion preferences respected)
- [ ] Performance acceptable (no janky animations, smooth 60fps)
- [ ] Developer documentation added (how to use transition tokens)

## Additional Notes

### Performance Considerations
- Use `will-change: transform, opacity` sparingly (only during active transitions)
- Prefer CSS transitions over JavaScript-based animations for simple cases
- Test on lower-end devices to ensure smooth performance

### Material-UI Resources
- [Material-UI Transitions API](https://mui.com/material-ui/transitions/)
- [Material-UI Theme Customization](https://mui.com/material-ui/customization/theming/)
- [CSS Easing Functions](https://easings.net/)

### Future Enhancements (Out of Scope)
- Advanced page transition types (e.g., shared element transitions)
- Custom spring physics for more organic motion
- Stagger animations for list items
- Gesture-based animations (swipe to dismiss)
