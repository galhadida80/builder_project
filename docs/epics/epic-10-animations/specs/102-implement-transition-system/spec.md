# Specification: Implement Transition System

## Overview

Implement a comprehensive transition system for the Builder application that includes animation tokens (duration and easing), page transitions for route navigation, and modal animations. Research shows that animation tokens and modal animations are already implemented; this task focuses on completing the system by adding page transitions using existing tokens and patterns.

## Workflow Type

**Type**: feature

**Rationale**: This is a new feature implementation that adds page transition capabilities to the application. While animation tokens and modal animations are already in place, the page transition functionality needs to be built from scratch using the existing foundation.

## Task Scope

### Services Involved
- **frontend** (primary) - React/TypeScript application where all transitions will be implemented

### This Task Will:
- [x] Animation tokens for duration and easing (ALREADY COMPLETE - see theme/tokens.ts and utils/animations.ts)
- [x] Modal animations with fade/grow effects (ALREADY COMPLETE - see AnimatedModal.tsx)
- [ ] Page transitions for route navigation (NOT IMPLEMENTED - primary focus)
- [ ] Integration of page transitions with react-router-dom v6
- [ ] Ensure all transitions respect prefers-reduced-motion accessibility setting

### Out of Scope:
- Creating new animation tokens (existing tokens are sufficient)
- Modifying existing modal animation implementation
- Adding new keyframe definitions (14 existing keyframes cover needs)
- Backend changes
- Database migrations
- New external dependencies (all required libraries already installed)

## Service Context

### Frontend

**Tech Stack:**
- Language: TypeScript
- Framework: React
- Build Tool: Vite
- Styling: Emotion (CSS-in-JS)
- UI Library: Material-UI v5.15.6
- Routing: react-router-dom v6.21.3

**Key Directories:**
- `src/` - Source code
- `src/components/` - React components
- `src/components/common/` - Shared components including AnimatedModal
- `src/theme/` - Design system tokens and theme
- `src/utils/` - Utility functions including animations
- `src/App.tsx` - Main application with route definitions

**Entry Point:** `src/App.tsx`

**How to Run:**
```bash
cd frontend
npm run dev
```

**Port:** 3000

**Relevant Dependencies:**
- `@mui/material` ^5.15.6 - Transition components (Fade, Grow, Slide, Zoom)
- `react-router-dom` ^6.21.3 - Routing (v6 requires manual transition implementation)
- `@emotion/react` ^11.11.3 - CSS-in-JS for keyframes
- `react-transition-group` - Available via MUI peer dependency

## Files to Modify

| File | Service | What to Change |
|------|---------|---------------|
| `frontend/src/App.tsx` | frontend | Add transition wrapper for page routes using TransitionGroup and pathname-based keys |
| `frontend/src/components/common/PageTransition.tsx` | frontend | Create new component for page transition logic (similar to AnimatedModal pattern) |

## Files to Reference

These files show patterns to follow:

| File | Pattern to Copy |
|------|----------------|
| `frontend/src/components/common/AnimatedModal.tsx` | Reference implementation for transition component structure, forwardRef usage, timeout handling |
| `frontend/src/utils/animations.ts` | Existing keyframe definitions (fadeIn, fadeOut, slideIn variants) and animation token usage |
| `frontend/src/theme/tokens.ts` | Animation duration tokens (instant/fast/normal/slow) and easing curves (standard/decelerate/accelerate) |
| `frontend/src/theme/theme.ts` | Global prefers-reduced-motion handling pattern |

## Patterns to Follow

### MUI Transition Component Pattern

From `frontend/src/components/common/AnimatedModal.tsx`:

The existing AnimatedModal demonstrates proper MUI transition usage:
- Uses MUI transition components (Fade, Grow) as `TransitionComponent` prop
- Properly forwards refs using `forwardRef`
- Combines multiple transitions by nesting components
- Handles timeout synchronization between parent and child

**Key Points:**
- TransitionComponent must be a forwardRef-wrapped React component
- Parent and child transition timeouts must align for smooth animations
- Can nest transitions for combined effects (e.g., Fade wrapping Grow)

### Animation Token Usage

From `frontend/src/theme/tokens.ts` and `frontend/src/utils/animations.ts`:

```typescript
// Duration tokens
duration: {
  instant: 0,
  fast: 150,
  normal: 250,
  slow: 400
}

// Easing tokens
easing: {
  standard: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
  decelerate: 'cubic-bezier(0.0, 0.0, 0.2, 1)', // entrance
  accelerate: 'cubic-bezier(0.4, 0.0, 1, 1)',   // exit
  sharp: 'cubic-bezier(0.4, 0.0, 0.6, 1)'      // feedback
}
```

**Key Points:**
- Use `duration.normal` (250ms) for standard page transitions
- Use `easing.decelerate` for entrance animations
- Use `easing.accelerate` for exit animations
- All tokens already defined and available for import

### Accessibility Pattern

From `frontend/src/theme/theme.ts`:

The theme already respects `prefers-reduced-motion`:
- Global CSS setting applied at theme level
- Automatically reduces or removes animations for users with motion sensitivity
- No additional work needed for new transitions

**Key Points:**
- New page transitions will automatically respect this setting
- No need to add additional motion detection logic
- Test with browser's reduced motion preference enabled

## Requirements

### Functional Requirements

1. **Page Transition Implementation**
   - Description: Create smooth transitions between route changes using react-router-dom v6
   - Acceptance: Routes animate on navigation with fade transition using existing tokens
   - Implementation: Use `useLocation()` pathname as key for TransitionGroup

2. **Existing Pattern Replication**
   - Description: Follow the component structure and ref handling from AnimatedModal
   - Acceptance: PageTransition component properly forwards refs and handles MUI transitions
   - Implementation: Create PageTransition.tsx following AnimatedModal pattern

3. **Layout Stability**
   - Description: Prevent content jumping during page transitions
   - Acceptance: No layout shift visible when navigating between pages
   - Implementation: Use absolute/fixed positioning during transition

4. **Accessibility Compliance**
   - Description: Respect user's reduced motion preferences
   - Acceptance: Transitions disabled/reduced when prefers-reduced-motion is enabled
   - Implementation: Leverage existing theme setting (already implemented)

### Edge Cases

1. **Rapid Navigation** - Handle quick successive route changes without transition overlap or stacking
2. **Initial Page Load** - First page load should not show entrance animation (only subsequent navigations)
3. **Browser Back/Forward** - Transitions should work correctly with browser navigation buttons
4. **Nested Routes** - If using nested `<Outlet />` components, ensure only appropriate level transitions

## Implementation Notes

### DO
- Follow the pattern in `AnimatedModal.tsx` for component structure and ref forwarding
- Reuse existing keyframes from `animations.ts` (fadeIn, slideIn variants)
- Use animation duration tokens from `tokens.ts` (duration.normal = 250ms)
- Use easing tokens from `tokens.ts` (decelerate for entrance, accelerate for exit)
- Wrap `<Outlet />` in App.tsx with transition logic
- Use `useLocation().pathname` as the key for TransitionGroup
- Apply absolute/fixed positioning to prevent layout shift during transitions
- Test with prefers-reduced-motion enabled in browser

### DON'T
- Create new animation tokens (existing ones are sufficient)
- Modify the existing AnimatedModal implementation
- Add new external dependencies (react-transition-group available via MUI)
- Use direct CSSTransition from react-transition-group (prefer MUI transition components)
- Forget to forward refs properly (will cause React warnings and broken transitions)
- Allow layout shift during page transitions (causes jarring UX)

## Development Environment

### Start Services

```bash
# Frontend only (backend not needed for this feature)
cd frontend
npm run dev
```

### Service URLs
- Frontend: http://localhost:3000

### Required Environment Variables
- `VITE_API_URL`: http://localhost:8000/api/v1 (optional for testing page transitions)

## Success Criteria

The task is complete when:

1. [ ] Page transitions animate smoothly between all routes using fade effect
2. [ ] PageTransition component follows AnimatedModal pattern with proper ref forwarding
3. [ ] Transitions use existing duration and easing tokens (250ms, decelerate/accelerate)
4. [ ] No layout shift occurs during page transitions
5. [ ] Transitions respect prefers-reduced-motion (verify with browser setting)
6. [ ] No console errors or React warnings about refs or keys
7. [ ] Existing tests still pass (no regressions in modal animations or other features)
8. [ ] Browser back/forward navigation works correctly with transitions
9. [ ] Rapid navigation doesn't cause transition stacking or visual glitches

## QA Acceptance Criteria

**CRITICAL**: These criteria must be verified by the QA Agent before sign-off.

### Unit Tests
| Test | File | What to Verify |
|------|------|----------------|
| PageTransition renders children | `frontend/src/components/common/PageTransition.test.tsx` | Component renders child content correctly |
| PageTransition forwards ref | `frontend/src/components/common/PageTransition.test.tsx` | Ref forwarding works without warnings |
| PageTransition uses correct timeout | `frontend/src/components/common/PageTransition.test.tsx` | Timeout matches duration token (250ms) |

### Integration Tests
| Test | Services | What to Verify |
|------|----------|----------------|
| Route transition integration | frontend | Page transitions work when navigating between routes in App.tsx |
| Token integration | frontend | PageTransition correctly uses tokens from theme/tokens.ts |

### End-to-End Tests
| Flow | Steps | Expected Outcome |
|------|-------|------------------|
| Basic Navigation | 1. Load homepage 2. Click navigation link 3. Observe transition | Page fades out/in smoothly over 250ms |
| Browser Navigation | 1. Navigate forward 2. Click back button 3. Observe transition | Back navigation shows same smooth transition |
| Rapid Navigation | 1. Click multiple links quickly 2. Observe behavior | No transition stacking, clean animations |
| Reduced Motion | 1. Enable prefers-reduced-motion 2. Navigate routes | Transitions reduced or disabled per accessibility |

### Browser Verification (frontend)
| Page/Component | URL | Checks |
|----------------|-----|--------|
| All Routes | `http://localhost:3000/*` | Page transitions visible and smooth |
| PageTransition Component | N/A (internal) | No React warnings in console about refs or keys |
| AnimatedModal (regression) | Any page with modal | Existing modal animations still work correctly |

### Accessibility Verification
| Check | Method | Expected |
|-------|--------|----------|
| Reduced Motion Support | Enable in browser settings | Animations reduced/disabled appropriately |
| No Layout Shift | Visual inspection during transitions | Content doesn't jump or reflow |
| Focus Management | Tab through navigation during transition | Focus not lost during page transitions |

### QA Sign-off Requirements
- [ ] All unit tests pass (PageTransition component tests)
- [ ] Integration tests pass (route transitions, token usage)
- [ ] All E2E navigation flows work correctly
- [ ] Browser verification complete (all routes, no console errors)
- [ ] Accessibility verification complete (reduced motion, layout stability, focus management)
- [ ] No regressions in existing modal animations
- [ ] Code follows AnimatedModal pattern
- [ ] Uses existing animation tokens (no new tokens created)
- [ ] No new external dependencies added
- [ ] Performance is acceptable (no janky animations or dropped frames)
