# Specification: Optimize Touch Interactions

## Overview

This task implements comprehensive touch gesture support, pull-to-refresh functionality, and haptic feedback for the construction operations platform. The goal is to enhance the mobile and touch-device experience by adding responsive gesture handling, intuitive refresh patterns, and tactile feedback. This includes swipe navigation, gesture-based interactions on key components (Cards, DataTables), pull-to-refresh on list views, and haptic feedback for critical user actions. The implementation will modernize the user experience while maintaining desktop compatibility.

## Workflow Type

**Type**: feature

**Rationale**: This is a significant feature addition that introduces new interaction patterns (gestures, haptics, pull-to-refresh) to the application. It requires new dependencies, utility functions, component modifications, and comprehensive testing across touch devices and emulators.

## Task Scope

### Services Involved
- **Frontend** (primary) - React/TypeScript application where all touch interactions will be implemented
- **Backend** (integration) - May provide additional metadata or configurations for gesture behaviors (optional for this phase)

### This Task Will:
- [ ] Implement touch gesture detection and handling (swipe, long-press, pinch)
- [ ] Create reusable gesture hooks for React components
- [ ] Add pull-to-refresh functionality to list views (Projects, Equipment, Materials, etc.)
- [ ] Integrate haptic feedback for key actions (button press, form submission, swipe completion)
- [ ] Update UI components (Button, Card, DataTable) with touch-optimized interactions
- [ ] Add touch-specific CSS and styling (increased touch target sizes, touch feedback)
- [ ] Implement gesture utilities and custom hooks for touch handling
- [ ] Add comprehensive test coverage for gesture handlers
- [ ] Ensure accessibility for touch interactions (ARIA labels, focus states)

### Out of Scope:
- Backend gesture analytics or logging (can be added in future tasks)
- Advanced computer vision or ML-based gesture recognition
- Custom gesture recording or training
- Native mobile app wrappers (this is web-focused)
- Gesture animation libraries beyond CSS transitions

## Service Context

### Frontend

**Tech Stack:**
- Language: TypeScript 5.3
- Framework: React 18.2.0
- Build Tool: Vite 5.0
- UI Library: Material-UI 5.15.6
- Styling: Emotion CSS-in-JS

**Key Directories:**
- `./frontend/src/components/` - React components
- `./frontend/src/components/ui/` - Reusable UI components
- `./frontend/src/hooks/` - Custom React hooks
- `./frontend/src/utils/` - Utility functions
- `./frontend/src/styles/` - Global styles

**Entry Point:** `./frontend/src/main.tsx`

**How to Run:**
```bash
cd frontend
npm install
npm run dev:hmr  # For development with hot module reload
npm test  # Run tests
npm run build  # Production build
```

**Port:** 3000

## Files to Modify

| File | Service | What to Change |
|------|---------|---------------|
| `./frontend/src/components/ui/Button.tsx` | Frontend | Add touch feedback (haptic, visual) and prevent double-tap zoom |
| `./frontend/src/components/ui/Card.tsx` | Frontend | Add swipe gesture detection and swipe-to-action handlers |
| `./frontend/src/components/ui/DataTable.tsx` | Frontend | Implement pull-to-refresh, row swipe actions, touch-optimized interactions |
| `./frontend/src/components/layout/Layout.tsx` | Frontend | Add gesture-aware layout adjustments for sidebar navigation |
| `./frontend/src/App.tsx` | Frontend | Add gesture routing (swipe to go back/forward) |
| `./frontend/src/styles/rtl.css` | Frontend | Add touch-specific CSS utilities (touch targets, haptic feedback) |
| `./frontend/package.json` | Frontend | Add gesture detection library (e.g., Hammer.js or native touch API) |

## Files to Reference

These files show patterns to follow:

| File | Pattern to Copy |
|------|----------------|
| `./frontend/src/components/ui/Button.tsx` | Styled component pattern with state-based transitions, MUI integration |
| `./frontend/src/components/ui/Card.tsx` | Hoverable pattern, styled component configuration, conditional styling |
| `./frontend/src/hooks/useLanguage.tsx` | Custom React hook structure for shared state |
| `./frontend/src/components/layout/Layout.tsx` | Component composition and state management patterns |

## Patterns to Follow

### 1. Styled Components with Touch States

From `./frontend/src/components/ui/Button.tsx` and `./frontend/src/components/ui/Card.tsx`:

```typescript
const StyledComponent = styled(MuiComponent)(() => ({
  transition: 'all 200ms ease-out',
  '&:hover': {
    transform: 'translateY(-1px)',
  },
  '&:active': {
    transform: 'scale(0.98)',
  },
  '&:focus': {
    outline: '2px solid',
    outlineOffset: '2px',
  },
}))
```

**Key Points:**
- Use Material-UI's `styled` function for component styling
- Include transitions for smooth feedback
- Handle `:active` state for touch/click feedback
- Add focus states for accessibility
- Apply transforms sparingly for performance

### 2. Custom React Hooks

From `./frontend/src/hooks/useLanguage.tsx`:

```typescript
export function useCustomTouchHook() {
  const [state, setState] = useState<Type>(initialValue)

  useEffect(() => {
    // Setup listeners
    const handleEvent = () => {
      // Handle event
    }
    element.addEventListener('touchstart', handleEvent)

    return () => {
      element.removeEventListener('touchstart', handleEvent)
    }
  }, [])

  return { state, /* other exports */ }
}
```

**Key Points:**
- Create reusable hooks for gesture detection
- Manage event listeners in useEffect with cleanup
- Return state and handlers
- Memoize callbacks to prevent unnecessary re-renders

### 3. Component Composition

From `./frontend/src/components/layout/Layout.tsx`:

```typescript
export function ComponentWithGestures() {
  const { gestureState } = useGestureHook()
  const { isRTL } = useLanguage()

  return (
    <StyledContainer
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Content */}
    </StyledContainer>
  )
}
```

**Key Points:**
- Use touch event handlers at appropriate container level
- Pass gesture state to child components
- Consider RTL layout when calculating swipe directions
- Prevent event propagation when needed

## Requirements

### Functional Requirements

1. **Touch Gesture Detection**
   - Description: Detect and respond to common touch gestures (swipe, long-press, double-tap, pinch)
   - Acceptance: Swipe gestures detected reliably on touch devices with < 100ms latency response

2. **Pull-to-Refresh Implementation**
   - Description: Add pull-to-refresh to data list views (Projects, Equipment, Materials, etc.)
   - Acceptance: User can pull down on list, see visual feedback, and trigger data refresh via API

3. **Haptic Feedback**
   - Description: Provide tactile feedback for key actions (button clicks, form submissions, swipe completion)
   - Acceptance: Haptic feedback triggers on supported devices (iOS Safari with Vibration API support)

4. **Card Swipe Actions**
   - Description: Swipe cards to reveal context menu or quick actions
   - Acceptance: Swiping left/right on cards reveals action buttons, swiping back hides them

5. **Touch-Optimized Component Sizes**
   - Description: Ensure all interactive elements meet 48x48px minimum touch target size
   - Acceptance: All buttons, links, and interactive elements test as >= 48x48px on mobile

6. **Gesture-Aware Navigation**
   - Description: Support swipe gestures for back/forward navigation
   - Acceptance: Swipe right navigates back, swipe left navigates forward (RTL-aware)

7. **Accessibility for Touch Interactions**
   - Description: Ensure all gesture interactions have keyboard equivalents and proper ARIA labels
   - Acceptance: Screen reader announces gesture alternatives, keyboard navigation works fully

### Edge Cases

1. **Fast/Flick Gestures** - Use velocity calculation to differentiate between slow drag and fast flick; flick should complete action faster
2. **Simultaneous Multi-touch** - Ignore subsequent touches if gesture already in progress (prevent conflicts)
3. **Scrolling vs. Swiping** - Differentiate between vertical scroll and horizontal swipe using angle threshold (< 30°)
4. **Touch on Disabled Elements** - Don't trigger haptics or feedback for disabled buttons/components
5. **Portrait/Landscape Changes** - Recalculate touch targets and gesture zones on device orientation change
6. **Very Small Screens** - Adjust touch target sizes dynamically for screens < 320px wide
7. **Touch with Scroll** - Cancel gesture if user starts scrolling during swipe detection

## Implementation Notes

### DO
- Follow the styled component pattern from existing UI components (Button.tsx, Card.tsx)
- Reuse Material-UI's theming system for touch feedback colors and transitions
- Create custom hooks for gesture detection to enable reusability across components
- Use the Vibration API for haptic feedback (standard modern browser API)
- Add `touch-action: manipulation` CSS to prevent browser default touch behaviors
- Test on actual touch devices (iPhone, Android) not just emulators
- Use event delegation where possible to reduce event listener overhead
- Include proper error handling for browsers without Vibration API support
- Document gesture interactions in component JSDoc comments
- Add data-testid attributes for testing gesture handlers

### DON'T
- Create gesture logic in component render functions (use hooks and event handlers)
- Add heavy gesture libraries when native touch API can handle requirements
- Forget to prevent default touch behaviors that conflict with gestures
- Ignore RTL layout when calculating swipe directions
- Add haptics without checking device support first
- Make touch targets smaller than 44px (44x44 minimum, 48x48 recommended)
- Use transform-based animations with `will-change` without performance testing
- Block touchstart event (use touchstart to detect, but allow default for scrolling)
- Forget to cleanup event listeners in useEffect return

## Development Environment

### Start Services

```bash
# Terminal 1 - Frontend
cd frontend
npm install
npm run dev:hmr

# Terminal 2 (optional) - Backend
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Service URLs
- Frontend: http://localhost:3000
- Backend: http://localhost:8000

### Required Environment Variables
- `.env` file in frontend (if needed for API endpoints)
- VITE_API_URL (optional, defaults to localhost:8000)

### Testing Touch Interactions

```bash
# Chrome DevTools (F12)
- Use Device Emulation (Ctrl+Shift+M or Cmd+Shift+M)
- Select specific device (iPhone, iPad, etc.)
- Enable "Emulate finger touches instead of mouse events"

# Mobile Device Testing
- Use ngrok or similar to expose local dev server: ngrok http 3000
- Access http://[ngrok-url] on actual device
- Use browser DevTools remote debugging for inspection

# Performance Testing
- Monitor FPS during gestures: DevTools > Rendering > Frame Rate
- Check Touch Event performance in DevTools Performance tab
```

## Success Criteria

The task is complete when:

1. [ ] All gesture hooks implemented and working (swipe, long-press, double-tap, pinch)
2. [ ] Pull-to-refresh working on Projects and Equipment list views
3. [ ] Haptic feedback triggers on button clicks and form submissions (with device support check)
4. [ ] All interactive elements meet 48x48px minimum touch target size
5. [ ] Swipe navigation working for back/forward (RTL-aware)
6. [ ] Keyboard equivalents exist for all gesture interactions
7. [ ] No console errors or warnings related to touch handling
8. [ ] All existing tests still pass
9. [ ] Touch interactions verified on actual iOS and Android devices
10. [ ] New touch-specific utilities and hooks documented with JSDoc

## QA Acceptance Criteria

**CRITICAL**: These criteria must be verified by the QA Agent before sign-off.

### Unit Tests

| Test | File | What to Verify |
|------|------|----------------|
| useSwipeGesture Hook | `./frontend/src/hooks/__tests__/useSwipeGesture.test.ts` | Detects swipe left/right correctly, ignores vertical movement > 30° angle, handles quick flicks vs. slow drags |
| useLongPress Hook | `./frontend/src/hooks/__tests__/useLongPress.test.ts` | Triggers after 500ms hold, cancels on move/release before 500ms, passes callback correctly |
| usePullToRefresh Hook | `./frontend/src/hooks/__tests__/usePullToRefresh.test.ts` | Detects pull-down, triggers at 80px threshold, prevents multiple simultaneous refreshes |
| hapticFeedback Utility | `./frontend/src/utils/__tests__/hapticFeedback.test.ts` | Calls navigator.vibrate when available, fails gracefully on unsupported devices |
| Touch Target Size | `./frontend/src/components/ui/__tests__/touchTargets.test.ts` | All buttons/links >= 48x48px, no clickable elements < 44x44px |

### Integration Tests

| Test | Services | What to Verify |
|------|----------|----------------|
| Pull-to-Refresh with API | Frontend ↔ Backend | Pull-to-refresh calls API endpoint, shows loading state, updates list with new data |
| Swipe Navigation | Frontend Router | Swipe right goes back, swipe left goes forward, respects browser history |
| Card Swipe Actions | Frontend | Swiping card reveals action buttons, clicking action triggers handler, swiping back hides buttons |
| Gesture & Scroll Conflict | Frontend | Scrolling up/down doesn't trigger swipe handlers, horizontal swipe doesn't scroll page |

### End-to-End Tests

| Flow | Steps | Expected Outcome |
|------|-------|------------------|
| Pull-to-Refresh List | 1. Open Projects page 2. Pull down 50px 3. Release 4. Wait for refresh | List shows spinner, API called, new data displays, spinner removed |
| Swipe Navigation | 1. Navigate to Projects detail 2. Swipe right 3. Wait 1 second | Page animates back, URL changes to previous page |
| Long-Press Card | 1. Open Projects page 2. Press and hold card for 1 second | Context menu appears with copy/delete options |
| Haptic Feedback | 1. Click button on iOS device 2. Click form submit | Device vibrates (if haptics enabled) |

### Browser Verification (Touch Devices)

| Page/Component | URL | Checks |
|----------------|-----|--------|
| Projects List | `http://localhost:3000/projects` | Can pull-to-refresh, scroll doesn't interfere, cards swipeable, 48px+ touch targets |
| Project Card | `http://localhost:3000/projects` | Swiping left shows actions, no visual jank, smooth 60fps |
| Equipment List | `http://localhost:3000/projects/[id]/equipment` | Pull-to-refresh works, list updates, haptic feedback if available |
| Button Interactions | Any page | All buttons 48x48px minimum, active state visible, haptic on press |
| Form Submission | `http://localhost:3000/projects/[id]/...` | Form submit button triggers haptic, no text selection during gesture |

### Device/Emulator Testing

| Platform | Device | Tests to Run |
|----------|--------|--------------|
| iOS | iPhone 13/14/15 Safari | Pull-to-refresh, haptics, swipe navigation, touch targets |
| iOS | iPad Safari | Landscape/portrait rotation, multi-touch handling, larger touch targets |
| Android | Chrome Mobile | Pull-to-refresh, swipe nav, scroll vs. swipe differentiation |
| Android | Samsung/Pixel | Haptic feedback, performance on lower-end devices |

### Accessibility Verification

| Check | Command/Method | Expected |
|-------|----------------|----------|
| Keyboard Navigation | Tab through all interactive elements | All buttons/actions accessible via keyboard |
| Screen Reader | VoiceOver (iOS) or TalkBack (Android) | Gestures announced, alternatives available |
| ARIA Labels | Inspect element in DevTools | All gesture actions have aria-label or title |
| Focus Visible | Use :focus-visible in DevTools | Clear focus indicator on touch inputs |

### QA Sign-off Requirements
- [ ] All unit tests pass (100% coverage for gesture hooks)
- [ ] All integration tests pass
- [ ] All E2E tests pass on real iOS device
- [ ] All E2E tests pass on real Android device
- [ ] Pull-to-refresh works without breaking scroll
- [ ] Swipe navigation doesn't interfere with page interactions
- [ ] Haptic feedback triggers on iOS (gracefully skips on unsupported)
- [ ] All touch targets >= 48x48px verified on multiple screen sizes
- [ ] No regressions in desktop hover/click interactions
- [ ] Keyboard navigation works for all gesture actions
- [ ] Screen reader announces gesture alternatives
- [ ] No console errors in DevTools on any device
- [ ] Performance tested (60fps during gestures, <100ms response)
- [ ] Code follows established patterns (styled components, hooks, Material-UI)
- [ ] No security vulnerabilities (input sanitization, event handling safe)
- [ ] RTL layout tested and working correctly
- [ ] Tested on minimum supported browsers/devices

