# Specification: Build Landing Page Hero Section

## Overview

Build a dark-themed hero section for the landing page that includes prominent call-to-action (CTA) buttons and a trust logos section to establish credibility. This component will serve as the primary entry point for visitors, communicating the value proposition and encouraging user engagement. The design follows the reference mockup `01-hero-dark.png`.

## Workflow Type

**Type**: feature

**Rationale**: This is a new feature implementation that adds a complete hero section component to the landing page. It involves creating new UI components, implementing responsive design, and integrating brand assets (trust logos).

## Task Scope

### Services Involved
- **frontend** (primary) - React application where the hero section will be implemented

### This Task Will:
- [ ] Create a new Hero component with dark theme styling
- [ ] Implement responsive hero section layout that works across mobile, tablet, and desktop
- [ ] Add CTA button components with appropriate styling and hover states
- [ ] Create a trust logos section displaying partner/brand logos
- [ ] Integrate the hero section into the landing page
- [ ] Ensure accessibility standards (ARIA labels, keyboard navigation, contrast ratios)
- [ ] Match the design specifications from 01-hero-dark.png reference

### Out of Scope:
- Backend API integration for dynamic content (hero text will be static for now)
- A/B testing implementation
- Analytics tracking integration
- CTA button click handlers beyond basic navigation
- Logo carousel/animation effects (static display only)
- Multi-language support (English only for initial implementation)

## Service Context

### frontend

**Tech Stack:**
- Language: TypeScript
- Framework: React
- Build Tool: Vite
- Styling: Emotion (CSS-in-JS)
- Key Dependencies: @emotion/react, @emotion/styled, @mui/material, @mui/icons-material

**Entry Point:** `src/App.tsx`

**How to Run:**
```bash
cd frontend
npm run dev
```

**Port:** 3000

**Key Directories:**
- `src/` - Source code directory
- `src/components/` - Reusable React components (likely location for Hero component)
- `src/pages/` - Page-level components (likely location for Landing page)
- `src/assets/` - Static assets (images, logos)

## Files to Modify

| File | Service | What to Change |
|------|---------|---------------|
| `frontend/src/components/Hero.tsx` | frontend | Create new component for hero section with dark theme |
| `frontend/src/components/Hero.styles.ts` | frontend | Create Emotion styled components for hero styling |
| `frontend/src/pages/LandingPage.tsx` (or similar) | frontend | Import and render Hero component |
| `frontend/src/assets/logos/` | frontend | Add trust logo image assets |

**Note:** The exact file paths may vary based on the existing project structure. These paths are based on common React project conventions.

## Files to Reference

These files should be examined to understand existing patterns:

| File | Pattern to Copy |
|------|----------------|
| `frontend/src/App.tsx` | Entry point structure and routing patterns |
| Existing components in `frontend/src/components/` | Component structure, TypeScript typing, Emotion styling patterns |
| Design reference: `01-hero-dark.png` | Visual design specifications (colors, spacing, layout) |

**Note:** Since the discovery phase did not identify specific reference files, the implementation should follow Material-UI and Emotion best practices as indicated by the project dependencies.

## Patterns to Follow

### Emotion Styled Components Pattern

Based on the project's use of Emotion, components should follow this pattern:

```typescript
import styled from '@emotion/styled';

// Define styled components
export const HeroContainer = styled.div`
  background-color: #1a1a1a; /* Dark theme */
  padding: 80px 20px;
  min-height: 600px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
`;

export const HeroTitle = styled.h1`
  color: #ffffff;
  font-size: 3rem;
  font-weight: bold;
  text-align: center;
  margin-bottom: 1.5rem;

  @media (max-width: 768px) {
    font-size: 2rem;
  }
`;
```

**Key Points:**
- Use Emotion's styled API for component styling
- Implement responsive design with media queries
- Follow dark theme color scheme
- Maintain type safety with TypeScript

### React Component Structure Pattern

```typescript
import React from 'react';
import { HeroContainer, HeroTitle, CTAButton } from './Hero.styles';

interface HeroProps {
  title: string;
  subtitle: string;
  ctaPrimary: string;
  ctaSecondary?: string;
}

export const Hero: React.FC<HeroProps> = ({
  title,
  subtitle,
  ctaPrimary,
  ctaSecondary
}) => {
  return (
    <HeroContainer>
      <HeroTitle>{title}</HeroTitle>
      {/* Component implementation */}
    </HeroContainer>
  );
};
```

**Key Points:**
- Define TypeScript interfaces for props
- Use functional components with React.FC
- Separate styled components from logic

### Material-UI Integration Pattern

Since the project uses Material-UI, consider using MUI components where appropriate:

```typescript
import { Button, Container, Typography } from '@mui/material';
import { styled } from '@emotion/styled';

// Can extend MUI components with Emotion
const StyledButton = styled(Button)`
  background: linear-gradient(45deg, #2196F3 30%, #21CBF3 90%);
  color: white;
  padding: 12px 30px;
  border-radius: 8px;
`;
```

**Key Points:**
- Leverage existing MUI components for accessibility and consistency
- Extend MUI components with Emotion for custom styling
- Use MUI's theming system if available

## Requirements

### Functional Requirements

1. **Dark Theme Hero Container**
   - Description: A full-width hero section with dark background that contrasts with light text and CTAs
   - Acceptance:
     - Background color is dark (e.g., #1a1a1a or similar dark shade)
     - Text is highly readable (WCAG AA contrast ratio of at least 4.5:1)
     - Section spans full viewport width
     - Minimum height ensures content is above the fold on desktop

2. **Primary and Secondary CTA Buttons**
   - Description: Two distinct call-to-action buttons with different visual hierarchy
   - Acceptance:
     - Primary CTA is visually prominent (filled, bright color)
     - Secondary CTA is less prominent (outlined or secondary color)
     - Both buttons have hover states
     - Buttons are keyboard accessible (focus states visible)
     - Click events can be attached (onClick handlers available)

3. **Trust Logos Section**
   - Description: Display of partner/client logos to establish credibility
   - Acceptance:
     - Logos are displayed in a horizontal row (or grid on mobile)
     - Logos are appropriately sized and maintain aspect ratio
     - Section is clearly separated from hero content (visual divider or spacing)
     - Alt text is provided for accessibility

4. **Responsive Design**
   - Description: Hero section adapts to different screen sizes
   - Acceptance:
     - Desktop (≥1024px): Full layout with large typography
     - Tablet (768px-1023px): Adjusted spacing and font sizes
     - Mobile (≤767px): Stacked layout, smaller typography, adjusted CTA button sizing
     - No horizontal scrolling on any breakpoint
     - Touch targets are at least 44x44px on mobile

5. **Accessibility Compliance**
   - Description: Hero section meets WCAG 2.1 Level AA standards
   - Acceptance:
     - All interactive elements are keyboard navigable
     - Focus indicators are visible
     - ARIA labels are provided where needed
     - Color contrast ratios meet standards
     - Semantic HTML elements are used

### Edge Cases

1. **Long Hero Text** - If title or subtitle is longer than expected, implement text overflow handling (ellipsis or wrap) to prevent layout breaking

2. **Missing Logo Assets** - Display placeholder or gracefully hide logo section if assets are not available

3. **Small Viewport Heights** - On very short screens (e.g., landscape mobile), ensure hero doesn't take up more than viewport height to allow scrolling to content below

4. **High Contrast Mode** - Ensure component remains usable in browser high contrast mode for accessibility

5. **Logo Count Variations** - Trust logos section should handle 3-6 logos gracefully, adjusting spacing as needed

## Implementation Notes

### DO
- Follow the design specifications in `01-hero-dark.png` exactly for colors, spacing, and layout
- Use Emotion styled components consistently throughout the implementation
- Leverage Material-UI components (Button, Typography, Container) where appropriate for consistency
- Implement responsive breakpoints at 768px (tablet) and 1024px (desktop)
- Use semantic HTML elements (header, section, h1, etc.) for better accessibility and SEO
- Test with keyboard navigation (Tab, Enter, Space keys)
- Ensure all images have descriptive alt text
- Use TypeScript interfaces for all component props
- Create separate files for component logic (Hero.tsx) and styles (Hero.styles.ts)

### DON'T
- Don't hard-code pixel values everywhere - use consistent spacing variables or theme values
- Don't use inline styles - all styling should be in Emotion styled components
- Don't skip responsive testing - verify on actual devices or browser dev tools
- Don't forget focus states - keyboard users need visible focus indicators
- Don't use generic alt text like "logo" - be descriptive (e.g., "Acme Corp logo")
- Don't make assumptions about CTA destinations - accept them as props or use placeholder links
- Don't implement complex animations in the first iteration - keep it simple and functional

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

Based on the project structure, no additional environment variables are required for the hero section implementation. The frontend uses:

```
VITE_API_URL=http://localhost:8000/api/v1
```

This is already configured but not needed for static hero section.

## Success Criteria

The task is complete when:

1. [ ] Hero component is created and renders correctly with dark theme
2. [ ] Primary and secondary CTA buttons are implemented with proper styling and states
3. [ ] Trust logos section displays logos horizontally (desktop) or in grid (mobile)
4. [ ] Hero section matches the design reference (01-hero-dark.png) in terms of layout, colors, and spacing
5. [ ] Component is fully responsive across mobile (≤767px), tablet (768-1023px), and desktop (≥1024px) breakpoints
6. [ ] All interactive elements are keyboard accessible with visible focus states
7. [ ] Color contrast meets WCAG AA standards (verified with browser tools or automated testing)
8. [ ] No console errors or warnings in browser dev tools
9. [ ] Component is integrated into the landing page and visible when accessing the application
10. [ ] TypeScript compilation succeeds with no type errors

## QA Acceptance Criteria

**CRITICAL**: These criteria must be verified by the QA Agent before sign-off.

### Unit Tests
| Test | File | What to Verify |
|------|------|----------------|
| Hero component renders | `frontend/src/components/Hero.test.tsx` | Component renders without crashing, displays title and CTAs |
| Props are properly typed | `frontend/src/components/Hero.test.tsx` | TypeScript interfaces enforce correct prop types |
| CTA click handlers work | `frontend/src/components/Hero.test.tsx` | onClick events fire correctly for both buttons |
| Logos render correctly | `frontend/src/components/Hero.test.tsx` | Logo section displays images with correct alt text |

### Integration Tests
| Test | Services | What to Verify |
|------|----------|----------------|
| Hero integration in Landing Page | frontend | Hero component is properly imported and rendered in the landing page |
| Responsive behavior | frontend | Component adapts correctly at different viewport sizes |

### End-to-End Tests
| Flow | Steps | Expected Outcome |
|------|-------|------------------|
| Landing page loads | 1. Navigate to http://localhost:3000 2. Observe hero section | Hero section is visible at top of page with dark theme, CTAs, and logos |
| CTA button interactions | 1. Hover over primary CTA 2. Hover over secondary CTA 3. Click each button | Hover states are visible, buttons are clickable (navigation or action occurs) |
| Mobile responsiveness | 1. Resize browser to mobile width (375px) 2. Verify layout | Hero text is readable, CTAs are properly sized, logos stack or wrap appropriately |
| Keyboard navigation | 1. Use Tab key to navigate 2. Press Enter on focused CTA | Focus indicators are visible, buttons are accessible via keyboard |

### Browser Verification (if frontend)
| Page/Component | URL | Checks |
|----------------|-----|--------|
| Hero Component | `http://localhost:3000` | ✓ Dark background is applied<br>✓ Text is readable (white/light on dark)<br>✓ CTAs have distinct styling<br>✓ Trust logos are visible<br>✓ No layout shifts or broken images |
| Responsive Design | `http://localhost:3000` (resize viewport) | ✓ Mobile (375px): Stacked layout works<br>✓ Tablet (768px): Mid-range layout works<br>✓ Desktop (1440px): Full layout displays correctly |
| Accessibility | `http://localhost:3000` (use accessibility tools) | ✓ Color contrast passes WCAG AA<br>✓ All images have alt text<br>✓ Focus states are visible<br>✓ Semantic HTML is used |

### Database Verification (if applicable)
*Not applicable - This is a frontend-only feature with no database interactions.*

### QA Sign-off Requirements
- [ ] All unit tests pass (`npm test` in frontend directory)
- [ ] Component renders without errors in development environment
- [ ] Visual comparison with 01-hero-dark.png reference shows design fidelity
- [ ] Responsive breakpoints tested at 375px, 768px, 1024px, and 1440px widths
- [ ] Keyboard navigation tested and working (Tab, Enter, Esc keys)
- [ ] Color contrast verified with browser DevTools (Lighthouse or axe)
- [ ] No console errors or warnings in browser
- [ ] TypeScript compilation successful with no type errors
- [ ] No regressions in existing landing page functionality
- [ ] Code follows established project patterns (Emotion styling, TypeScript typing)
- [ ] No security vulnerabilities introduced (check for XSS in any dynamic content)

---

## Additional Notes for Implementation

### Design Reference
The design reference `01-hero-dark.png` should be located in the project. If not found, request clarification from the product team or locate it in the design assets folder. The implementation should match:
- Color scheme (dark background, light text)
- Typography hierarchy (heading, subheading sizes)
- CTA button styling (colors, shapes, sizes)
- Logo layout and spacing
- Overall spacing and padding values

### Assumptions
Since the discovery phase did not identify specific files, the following assumptions are made:
1. Landing page component exists or needs to be created in `src/pages/` or `src/`
2. Component structure follows Material-UI + Emotion patterns common in React apps
3. Trust logos will be provided as PNG or SVG files
4. CTA destinations will be placeholder or simple routes for now

### Next Steps After Implementation
1. Gather actual trust/partner logos from marketing team
2. Define CTA button destinations (e.g., signup page, demo request)
3. Consider adding subtle animations (fade-in, parallax) in future iterations
4. Implement CMS integration for dynamic hero content if needed
5. Add analytics tracking for CTA clicks
