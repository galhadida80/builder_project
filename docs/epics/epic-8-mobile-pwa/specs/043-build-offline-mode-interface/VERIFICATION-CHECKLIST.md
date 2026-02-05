# Offline Mode E2E Verification Checklist

**Quick Reference for Manual Testing**

## Setup
```bash
cd frontend
npm run dev
# Open http://localhost:3000 in browser
# Open DevTools (F12)
# Go to Network tab
```

## Test Cases

### ✅ Basic Functionality

- [ ] **Online State**: No banner shows when online
- [ ] **Go Offline**: Banner appears within 1 second when DevTools Network set to "Offline"
- [ ] **Go Online**: Banner disappears when Network set back to "No throttling"
- [ ] **Banner Message**: Shows "You are currently offline. Some features may be unavailable."

### ✅ Sync Status

- [ ] **Sync Status Visible**: Chip component visible in header (right side, before theme toggle)
- [ ] **Idle State**: Shows CloudQueue icon with "Idle" label
- [ ] **Status Updates**: Can change sync status (if integrated with API calls)

### ✅ Debouncing

- [ ] **No Flicker**: Rapidly toggling Online/Offline does NOT cause rapid banner flickering
- [ ] **500ms Delay**: Banner changes respect debounce delay
- [ ] **Settles Correctly**: Banner eventually shows correct state after toggle storm

### ✅ Persistence & Navigation

- [ ] **Reload Offline**: Page reloads while offline → banner appears immediately
- [ ] **Route Navigation**: Banner persists when navigating between pages while offline
- [ ] **Layout Integrity**: Banner doesn't break header/sidebar positioning

### ✅ Visual Design

- [ ] **Full Width**: Banner spans full viewport width
- [ ] **Top Position**: Banner at very top of screen (fixed position)
- [ ] **Smooth Animation**: Slide-down animation when appearing
- [ ] **Warning Color**: Orange/yellow warning severity
- [ ] **Z-Index**: Banner appears above all other content

### ✅ Quality Checks

- [ ] **No Console Errors**: No errors in browser console during any test
- [ ] **No TypeScript Errors**: No TS errors when running dev server
- [ ] **No Warnings**: No React warnings in console
- [ ] **Responsive**: Works on different screen sizes

## Pass Criteria

All checkboxes above must be ✅ for subtask to be considered complete.

## Issues Found

_(Document any issues here)_

---

## Tester Sign-off

- [ ] All tests passed
- [ ] Design matches 30-offline-mode.png
- [ ] Ready for production

**Tested by:** ________________
**Date:** ________________
**Browser:** ________________
