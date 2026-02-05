# Quick Spec: 3-Tier Pricing Section

## Overview

Build a 3-tier pricing section component with Starter, Professional, and Enterprise cards following the design reference (03-pricing.png). This component will provide a reusable pricing display for the application with three distinct tiers, each with customizable pricing, features, and call-to-action buttons.

## Workflow Type

Feature implementation - Creating a new reusable UI component for pricing tier display.

## Task Scope

### Files to Modify/Create
- `frontend/src/components/ui/PricingSection.tsx` - New component with pricing card variants
- `frontend/src/components/ui/index.ts` - Export PricingSection component

### Change Details
Create a reusable PricingSection component with:
- **PricingCard**: Base card component for individual pricing tiers with:
  - Tier name (Starter, Professional, Enterprise)
  - Price display
  - Features list
  - CTA button
  - Optional highlight/featured styling for Professional tier
- **PricingSection**: Container component that renders all three tiers in a responsive grid layout

Style using Material-UI `styled` API and follow existing component patterns (similar to Card, KPICard).

## Success Criteria

- [ ] Component renders all three pricing tiers (Starter, Professional, Enterprise)
- [ ] Professional tier is highlighted/featured
- [ ] Responsive layout works on mobile and desktop
- [ ] Button styling matches existing Button component patterns
- [ ] No TypeScript errors
- [ ] Component is properly exported from ui/index.ts

### Implementation Notes
- Use MUI Card as base component like other UI components
- Professional tier should have visual distinction (e.g., shadow, scale, or highlight)
- Features list should be flexible (array of strings)
- CTA button text is customizable
