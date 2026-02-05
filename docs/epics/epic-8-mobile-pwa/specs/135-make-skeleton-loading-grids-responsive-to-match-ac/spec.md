# Make skeleton loading grids responsive to match actual content layout

## Overview

Update skeleton loading states across 8+ pages to use the same responsive gridTemplateColumns breakpoints as their corresponding data-loaded layouts, eliminating layout shift when loading completes on mobile devices.

## Rationale

Every page's skeleton loading state uses a fixed column grid (e.g., `repeat(4, 1fr)`) while the actual rendered content uses responsive breakpoints (e.g., `{ xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }`). On mobile, the skeleton shows a cramped 4-column or even 6-column grid that snaps to 1-2 columns when data loads. This causes a jarring Cumulative Layout Shift (CLS) that makes the app feel broken during loading.

---
*This spec was created from ideation and is pending detailed specification.*
