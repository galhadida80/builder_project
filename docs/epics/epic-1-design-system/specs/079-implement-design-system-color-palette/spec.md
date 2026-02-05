# Quick Spec: Design System Color Palette CSS Custom Properties

## Overview
Define CSS custom properties (CSS variables) for Construction Navy palette and semantic colors to complement the existing TypeScript token system. This is an additive change that enables direct stylesheet usage of design system colors while preserving the existing Material-UI theme configuration.

## Workflow Type
**Type:** feature

This is a new feature implementation that adds CSS custom properties to the design system without modifying existing TypeScript tokens.

## Task Scope
**In Scope:**
- Create new CSS file with Construction Navy palette (10 shades: navy-50 to navy-900)
- Define 16 semantic color variables (success, warning, error, info with 4 variants each)
- Import CSS file globally in main.tsx
- Follow naming convention: `--color-[category]-[shade]`

**Out of Scope:**
- Modifying existing TypeScript tokens in tokens.ts
- Updating existing components to use new CSS variables
- Dark mode color definitions
- Accessibility contrast validation (assumed to be handled in design phase)

## Success Criteria
- [ ] CSS custom properties file created at `frontend/src/styles/design-tokens.css`
- [ ] File contains 10 Construction Navy palette colors (--color-navy-50 through --color-navy-900)
- [ ] File contains 16 semantic color variables (4 categories × 4 variants)
- [ ] CSS file imported in `frontend/src/main.tsx`
- [ ] CSS variables visible in browser DevTools under :root selector
- [ ] No console errors on page load
- [ ] All color values use hex format for consistency

## Files to Modify
- **NEW:** `frontend/src/styles/design-tokens.css` - CSS custom properties for design system colors
- `frontend/src/main.tsx` - Import the new CSS file

## Change Details

### Current State
- Colors are defined in `frontend/src/theme/tokens.ts` as TypeScript objects
- Used primarily for Material-UI theme configuration
- No CSS custom properties available for direct use in stylesheets

### Required Changes

**1. Create `frontend/src/styles/design-tokens.css`:**
- Define Construction Navy palette (primary brand colors)
- Map semantic colors (success, warning, error, info) to CSS variables
- Follow naming convention: `--color-[category]-[shade]`

**2. Import in `frontend/src/main.tsx`:**
- Add import statement to make CSS variables available globally

### Construction Navy Palette Structure
```css
--color-navy-900: [darkest]
--color-navy-800: 
--color-navy-700:
--color-navy-600:
--color-navy-500: [base]
--color-navy-400:
--color-navy-300:
--color-navy-200:
--color-navy-100:
--color-navy-50: [lightest]
```

### Semantic Colors
```css
--color-success-main
--color-success-light
--color-success-dark
--color-success-bg

--color-warning-main
--color-warning-light
--color-warning-dark
--color-warning-bg

--color-error-main
--color-error-light
--color-error-dark
--color-error-bg

--color-info-main
--color-info-light
--color-info-dark
--color-info-bg
```

## Verification
- [ ] CSS file created with all color variables defined
- [ ] Import added to main.tsx
- [ ] Browser DevTools shows CSS variables in :root
- [ ] No console errors on page load

## Notes
- Keep existing TypeScript tokens unchanged - CSS variables are additive
- Use hex color values for consistency with existing tokens
- Construction Navy values should be navy/blue tones suitable for construction industry branding
- Consider using existing `accent` palette as basis for Construction Navy if specific values not provided
