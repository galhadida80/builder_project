# Add React Error Boundary for graceful crash recovery

## Overview

Wrap the application's route tree in a React Error Boundary component that catches JavaScript runtime errors and displays a user-friendly fallback UI with a recovery action, instead of showing a blank white screen.

## Rationale

The app has zero Error Boundary components (confirmed by searching for 'ErrorBoundary' across the entire frontend src). If any component throws a runtime error (e.g., accessing a property on undefined data, a rendering bug), React unmounts the entire component tree and the user sees a blank white page with no way to recover except a full browser refresh. For a construction operations platform used on job sites, this is especially problematic.

---
*This spec was created from ideation and is pending detailed specification.*
