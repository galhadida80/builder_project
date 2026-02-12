# Quick Spec: Remove Google Sign-in Button

## Overview
Remove the non-functional "Continue with Google" button from the login page. The button currently bypasses authentication and navigates directly to the dashboard without actual Google OAuth implementation, misleading users into thinking Google authentication is available.

## Workflow Type
simple

## Task Scope
This is a simple removal task targeting a single frontend file. Remove the Google Sign-in button component, its click handler, and any related imports or styling from `frontend/src/pages/LoginPage.tsx`. No Google OAuth implementation is needed - this is purely a removal of misleading UI elements.

## Files to Modify
- `frontend/src/pages/LoginPage.tsx` - Remove Google Sign-in button and related code

## Change Details
1. Locate the "Continue with Google" button component in LoginPage.tsx
2. Remove the button element and its click handler
3. Remove any Google-related imports or dependencies (if unused elsewhere)
4. Clean up any styling specific to the Google button layout

## Success Criteria
- [ ] Login page renders correctly without Google button
- [ ] Existing login functionality (email/password) still works
- [ ] No console errors on page load
- [ ] UI layout remains clean and properly aligned

## Notes
- This is a simple removal task - no Google OAuth implementation needed
- Priority is HIGH/URGENT - should be completed quickly
- Keep all other login functionality intact
