# Manual Testing Checklist for Error Handling

## Quick Setup

```bash
# Terminal 1 - Backend
cd backend
uvicorn app.main:app --reload

# Terminal 2 - Frontend
cd frontend
npm run dev
```

Access: http://localhost:3000

## Test Checklist

### ✅ Test 1: Success Toast (2 min)
- [ ] Navigate to http://localhost:3000/projects
- [ ] Click "New Project"
- [ ] Fill: Name="Test", Code="TST", Description="Test"
- [ ] Submit form
- [ ] **VERIFY**: Green toast appears bottom-right saying "Project created successfully!"
- [ ] **VERIFY**: Toast auto-dismisses after ~5 seconds

### ✅ Test 2: Error Toast (2 min)
- [ ] Stop backend service (Ctrl+C in Terminal 1)
- [ ] Try to create another project
- [ ] **VERIFY**: Red toast appears saying "Failed to create project. Please try again."
- [ ] **VERIFY**: Toast auto-dismisses after ~5 seconds

### ✅ Test 3: Error Toast on Load (1 min)
- [ ] Backend still stopped
- [ ] Refresh http://localhost:3000/projects
- [ ] **VERIFY**: Red toast appears saying "Failed to load projects. Please try again."

### ✅ Test 4: 401 Redirect (3 min)
- [ ] Restart backend service
- [ ] Login to application
- [ ] Open DevTools (F12) → Application → Local Storage
- [ ] Find `authToken` key
- [ ] Change value to: `invalid_token_12345`
- [ ] Navigate to http://localhost:3000/dashboard
- [ ] **VERIFY**: Redirected to /login
- [ ] **VERIFY**: authToken removed from localStorage
- [ ] **VERIFY**: No console errors

### ✅ Test 5: No Redirect Loop on Auth (2 min)
- [ ] At /login page (from Test 4)
- [ ] Enter wrong username/password
- [ ] Click Login
- [ ] **VERIFY**: Login fails (expected)
- [ ] **VERIFY**: Still on /login page (NO redirect)
- [ ] **VERIFY**: Can retry login

### ✅ Test 6: Multiple Pages Coverage (3 min)
With backend running, test these pages show toasts:

- [ ] /dashboard - Error toast if backend stopped
- [ ] /projects - Already tested above
- [ ] /projects/{id}/equipment - Create equipment, see success toast
- [ ] /projects/{id}/materials - Create material, see success toast
- [ ] /projects/{id}/areas - Create area, see success toast

### ✅ Test 7: Toast Positioning (1 min)
- [ ] Trigger any error
- [ ] **VERIFY**: Toast appears at bottom-right corner
- [ ] **VERIFY**: Doesn't block main content
- [ ] **VERIFY**: Has appropriate color (red=error, green=success)

### ✅ Test 8: Console Errors (2 min)
- [ ] Open DevTools → Console
- [ ] Navigate through several pages
- [ ] Trigger errors and successes
- [ ] **VERIFY**: No React warnings
- [ ] **VERIFY**: No unhandled promise rejections
- [ ] **NOTE**: console.error for debugging is OK (technical errors)
- [ ] **VERIFY**: User sees friendly toast messages

### ✅ Test 9: Toast Queuing (1 min)
- [ ] Stop backend
- [ ] Rapidly try to:
  - Create project
  - Load projects
  - Create another project
- [ ] **VERIFY**: Only one toast visible at a time
- [ ] **VERIFY**: Toasts don't stack up on screen

## Summary

- **Total Time**: ~15-20 minutes
- **Total Tests**: 9 scenarios
- **Required**: All tests should pass

## Pass Criteria

- ✅ All toasts appear at bottom-right
- ✅ All toasts auto-dismiss after 5 seconds
- ✅ Error toasts are red with error messages
- ✅ Success toasts are green with success messages
- ✅ 401 errors redirect to login
- ✅ Auth endpoints don't cause redirect loops
- ✅ No console errors or warnings
- ✅ Only one toast shows at a time

## If Tests Fail

1. Check browser console for errors
2. Verify both services are running
3. Check network tab for API calls
4. Verify localStorage has/doesn't have token as expected
5. Check that ToastProvider is wrapped around App routes

## Sign-off

- [ ] All tests passed
- [ ] No console errors observed
- [ ] Toast behavior is consistent
- [ ] User experience is smooth

**Tested by**: _____________
**Date**: _____________
**Notes**: _____________
