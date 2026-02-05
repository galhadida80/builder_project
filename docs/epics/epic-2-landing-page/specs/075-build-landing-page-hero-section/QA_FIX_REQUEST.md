# QA Fix Request

**Status**: REJECTED ❌
**Date**: 2026-02-04
**QA Session**: 1

## Critical Issues to Fix

### 1. Create Unit Tests for Hero Component

**Problem**: No unit tests exist. The spec explicitly requires `Hero.test.tsx` with tests for rendering, props, click handlers, and logo display.

**Location**: `frontend/src/components/Hero.test.tsx` (file does not exist)

**Required Fix**: Create a comprehensive test file with the following test cases:
1. Component renders with default props
2. Component renders with custom title and subtitle
3. CTA click handlers are called correctly
4. Trust logos render when provided
5. Trust logos are hidden when showTrustLogos is false

**Test Framework**: Use React Testing Library (@testing-library/react)

**Example Test Structure**:
```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { Hero } from './Hero'

describe('Hero Component', () => {
  it('renders with default props', () => {
    render(<Hero />)
    expect(screen.getByText(/Build Smarter/)).toBeInTheDocument()
  })

  it('calls CTA handlers on click', () => {
    const primaryHandler = jest.fn()
    const secondaryHandler = jest.fn()
    render(
      <Hero
        ctaPrimaryAction={primaryHandler}
        ctaSecondaryAction={secondaryHandler}
      />
    )
    fireEvent.click(screen.getByText('Request Demo'))
    fireEvent.click(screen.getByText('Login'))
    expect(primaryHandler).toHaveBeenCalledTimes(1)
    expect(secondaryHandler).toHaveBeenCalledTimes(1)
  })

  // Additional tests for props, logos, etc.
})
```

**Verification**:
- Run `npm test -- Hero.test`
- All tests should pass
- Coverage should include component rendering, props, and interactions

---

### 2. Enable Trust Logos Feature

**Problem**: The `showTrustLogos` prop is set to `false` in `LandingPage.tsx`, which completely hides the trust logos section. The spec requires trust logos to be displayed.

**Location**: `frontend/src/pages/LandingPage.tsx:32`

**Required Fix**:
1. Change `showTrustLogos={false}` to `showTrustLogos={true}`
2. Define a `trustLogos` array with data for 5 companies
3. Pass the `trustLogos` array to the Hero component

**Code Changes**:
```typescript
// Add this near the top of the LandingPage component
const trustLogos = [
  {
    name: 'Turner Construction',
    imageUrl: '/src/assets/logos/turner.png',
    alt: 'Turner Construction logo'
  },
  {
    name: 'Bechtel',
    imageUrl: '/src/assets/logos/bechtel.png',
    alt: 'Bechtel logo'
  },
  {
    name: 'Fluor',
    imageUrl: '/src/assets/logos/fluor.png',
    alt: 'Fluor logo'
  },
  {
    name: 'Kiewit',
    imageUrl: '/src/assets/logos/kiewit.png',
    alt: 'Kiewit logo'
  },
  {
    name: 'Skanska',
    imageUrl: '/src/assets/logos/skanska.png',
    alt: 'Skanska logo'
  },
]

// In the Hero component JSX:
<Hero
  title="Build Smarter Inspect Faster Deliver Excellence"
  subtitle="Streamline your construction management with our comprehensive platform. From project planning to final inspection, we've got you covered."
  ctaPrimaryText="Request Demo"
  ctaPrimaryAction={handleRequestDemo}
  ctaSecondaryText="Login"
  ctaSecondaryAction={handleLogin}
  trustLogos={trustLogos}        // ← ADD THIS
  showTrustLogos={true}           // ← CHANGE FROM false TO true
/>
```

**Verification**:
- Trust logos section should be visible in the Hero component
- Section should display "Trusted by Industry Leaders" heading
- 5 logos should be rendered

---

### 3. Add Trust Logo Image Assets

**Problem**: No actual logo image files exist in the `frontend/src/assets/logos/` directory. Only a `.gitkeep` file is present.

**Location**: `frontend/src/assets/logos/`

**Required Fix**: Add 5 logo image files for the following companies:
- Turner Construction → `turner.png` (or .svg)
- Bechtel → `bechtel.png` (or .svg)
- Fluor → `fluor.png` (or .svg)
- Kiewit → `kiewit.png` (or .svg)
- Skanska → `skanska.png` (or .svg)

**Options**:
1. **Preferred**: Use actual company logos (ensure proper licensing/permissions)
2. **Alternative**: Create placeholder images with company names as text
3. **Quick Fix**: Use a placeholder service like https://via.placeholder.com/150x50/1a1a1a/ffffff?text=CompanyName

**Image Requirements**:
- Format: PNG or SVG
- Dimensions: Approximately 120x40px (will be constrained by CSS)
- Background: Transparent or white
- Color: Ideally color logos (CSS will apply grayscale filter)

**Verification**:
- 5 image files should exist in `frontend/src/assets/logos/`
- Files should be accessible and loadable
- Images should display correctly when Hero component is rendered

---

### 4. Verify Development Environment (If Possible)

**Problem**: Development server could not be started during QA due to environment issues (npm not found in PATH).

**Location**: Environment configuration

**Required Fix**:
- Ensure Node.js and npm are properly installed and accessible
- Verify that `npm run dev` works from the `frontend/` directory
- If environment issues persist, document them and request clarification

**Verification**:
- Run `npm run dev` successfully
- Access http://localhost:3000 in browser
- Landing page should load without errors

---

## Summary of Changes Required

1. ✅ **Create** `frontend/src/components/Hero.test.tsx` with comprehensive unit tests
2. ✅ **Modify** `frontend/src/pages/LandingPage.tsx`:
   - Add `trustLogos` array definition
   - Change `showTrustLogos` from `false` to `true`
   - Pass `trustLogos` prop to Hero component
3. ✅ **Add** 5 logo image files to `frontend/src/assets/logos/`
4. ✅ **Verify** development environment works

---

## Commit Message Template

After implementing all fixes:

```
fix: add unit tests, enable trust logos, add logo assets (qa-requested)

- Create Hero.test.tsx with comprehensive component tests
- Enable trust logos display in LandingPage
- Add trustLogos array with 5 company logos
- Add logo image assets (turner, bechtel, fluor, kiewit, skanska)
- Fix development environment issues (if applicable)

Addresses QA feedback from session 1
```

---

## After Fixes

Once fixes are complete:
1. ✅ Commit changes with the message above
2. ✅ Update build-progress.txt with fix details
3. ✅ QA will automatically re-run validation
4. ✅ Loop continues until approved

---

## QA Re-Run Checklist

When QA agent re-runs, it will verify:
- [ ] `Hero.test.tsx` exists and all tests pass
- [ ] Trust logos are enabled in LandingPage
- [ ] 5 logo files exist in assets directory
- [ ] trustLogos array is properly defined
- [ ] Development server starts successfully
- [ ] Browser shows trust logos section
- [ ] No console errors
- [ ] Responsive design works at all breakpoints
- [ ] All spec requirements are met

---

## Notes for Coder Agent

**What's Good** ✅:
- Hero component is well-implemented with excellent code quality
- MUI styled() pattern is correctly followed
- Responsive design breakpoints are properly defined
- TypeScript typing is thorough
- No security issues
- Routing is correctly configured
- Button integration works properly

**What Needs Fixing** ❌:
- Missing unit tests (critical for spec compliance)
- Trust logos feature disabled (spec requires it enabled)
- Missing logo assets (can't display logos without images)

**Difficulty**: LOW - These are straightforward fixes that don't require architectural changes.

**Estimated Time**: 30-45 minutes to implement all fixes
