# QA Fix Request

**Status**: ❌ REJECTED
**Date**: 2026-01-30
**QA Session**: 1
**Spec**: 029 - Login Form Bypasses Authentication Security Issue

---

## Executive Summary

**CRITICAL ISSUE**: The spec requires **FIXING** the authentication bypass vulnerability, but the implementation only **VERIFIED** its existence. The security vulnerability **STILL EXISTS** and must be fixed before QA approval.

**Root Cause**: Task incorrectly scoped as "verification-only" workflow when it should be "implementation" workflow.

**Current Status**: LoginPage.tsx still hardcodes `'dev-token'` and bypasses authentication (lines 27-29)

---

## Critical Issues to Fix

### 1. **Implement authApi.login() Method**
**Problem**: Auth API service missing login method
**Location**: `frontend/src/api/auth.ts`
**Required Fix**: Add login method to call backend authentication endpoint

**Implementation**:
```typescript
// Add this interface
interface LoginResponse {
  accessToken: string
  tokenType: string
  user: User
}

// Add this method to authApi object
export const authApi = {
  // ... existing methods ...

  login: async (email: string, password: string): Promise<LoginResponse> => {
    const response = await apiClient.post('/auth/login', {
      email,
      password
    })
    return response.data
  },
}
```

**Verification**:
- Method can be imported from auth.ts
- TypeScript compilation succeeds
- Method signature matches backend API contract

---

### 2. **Fix Authentication Bypass in LoginPage**
**Problem**: Hardcoded fake token allows authentication bypass
**Location**: `frontend/src/pages/LoginPage.tsx:27-29`
**Required Fix**: Replace hardcoded token with real API call

**Current Code (VULNERABLE)**:
```typescript
try {
  localStorage.setItem('authToken', 'dev-token')  // ❌ Hardcoded
  navigate('/dashboard')                          // ❌ No validation
```

**Required Code (SECURE)**:
```typescript
try {
  const response = await authApi.login(email, password)  // ✓ Real API call
  localStorage.setItem('authToken', response.accessToken) // ✓ Real JWT
  localStorage.setItem('userId', response.user.id)        // ✓ User context
  navigate('/dashboard')                                   // ✓ After auth
} catch (error) {
  setError('Invalid email or password')  // ✓ Error handling
}
```

**Additional Requirements**:
1. Import authApi at top of file: `import { authApi } from '../api/auth'`
2. Ensure error handling catches API errors (401, network errors)
3. Keep existing loading state logic (already correct)

**Verification**:
- Submit form with valid credentials → API call made, JWT stored, redirect to dashboard
- Submit form with invalid credentials → Error message displayed, no redirect
- Check localStorage → Contains real JWT token (not 'dev-token')
- Check network tab → POST request to `/api/v1/auth/login` visible
- Check console → No errors

---

### 3. **Implement userId Storage**
**Problem**: User ID not stored after successful login
**Location**: `frontend/src/pages/LoginPage.tsx` (in the fix above)
**Required Fix**: Store userId in localStorage after successful authentication

**Implementation**:
```typescript
// After storing authToken, add:
localStorage.setItem('userId', response.user.id)
```

**Verification**:
- After successful login, localStorage contains 'userId' key
- userId value matches authenticated user

---

### 4. **Update Google Login Handler**
**Problem**: Google login also uses hardcoded token (lines 42-43)
**Location**: `frontend/src/pages/LoginPage.tsx:42-43`
**Required Fix**: This is out of scope for current spec, but document for future fix

**Current Code**:
```typescript
await new Promise(resolve => setTimeout(resolve, 1000))
localStorage.setItem('authToken', 'dev-token')
```

**Note**: Leave as-is for now (out of scope), but add TODO comment:
```typescript
// TODO: Implement Google OAuth authentication (out of scope for BUI-8)
```

---

## Verification Requirements

After implementing fixes above, verify:

### Functional Testing
1. **Successful Login Flow**
   - Navigate to http://localhost:3000/login
   - Enter valid credentials (get from backend team or use test user)
   - Click "Sign In"
   - **Expected**:
     - POST request to `/api/v1/auth/login` visible in network tab
     - Response contains accessToken and user object
     - Redirected to `/dashboard`
     - localStorage contains real JWT in 'authToken' key
     - localStorage contains user ID in 'userId' key

2. **Failed Login Flow**
   - Navigate to http://localhost:3000/login
   - Enter invalid credentials (e.g., wrong@test.com / wrongpass)
   - Click "Sign In"
   - **Expected**:
     - POST request to `/api/v1/auth/login` visible in network tab
     - Response is 401 "Invalid email or password"
     - Error message displayed on screen
     - No redirect occurs (stays on /login page)
     - No token stored in localStorage

3. **Loading States**
   - During login attempt, button should show loading spinner
   - Button should be disabled during request
   - Loading state should clear after response

### Security Testing
1. **Token Validation**
   - Stored token should be a valid JWT (3 parts separated by dots)
   - Token should NOT be 'dev-token'
   - Token should contain encoded user information

2. **Authentication Bypass Check**
   - Cannot access dashboard without valid credentials
   - Invalid credentials do not grant access
   - Hardcoded token bypass is removed

3. **Error Handling**
   - Network errors display user-friendly message
   - 401 errors display "Invalid email or password"
   - No sensitive information leaked in error messages

### Code Quality
1. **TypeScript Compilation**
   ```bash
   cd frontend
   npm run type-check  # or npm run build
   ```
   Expected: No type errors

2. **Linting**
   ```bash
   cd frontend
   npm run lint
   ```
   Expected: No new linting errors

3. **Console Errors**
   - Open browser console during login
   - Expected: No errors or warnings

---

## Testing Checklist

Before requesting QA re-review, ensure:

- [ ] `authApi.login()` method implemented in `frontend/src/api/auth.ts`
- [ ] LoginResponse interface added with correct types
- [ ] LoginPage.tsx updated to call `authApi.login()` instead of hardcoded token
- [ ] Hardcoded `'dev-token'` removed from handleEmailLogin
- [ ] userId storage implemented
- [ ] TypeScript compilation succeeds with no errors
- [ ] Successful login with valid credentials works end-to-end
- [ ] Failed login with invalid credentials shows error message
- [ ] Loading states work correctly
- [ ] No console errors during authentication flow
- [ ] localStorage contains real JWT token (not 'dev-token')
- [ ] localStorage contains userId
- [ ] Network tab shows POST request to `/api/v1/auth/login`

---

## Backend API Contract (Reference)

The backend endpoint is **operational** and ready for use:

**Endpoint**: `POST /api/v1/auth/login`

**Request**:
```json
{
  "email": "user@example.com",
  "password": "userpassword"
}
```

**Response (200 Success)**:
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "tokenType": "bearer",
  "user": {
    "id": "user-uuid",
    "email": "user@example.com",
    "name": "User Name",
    ...
  }
}
```

**Response (401 Unauthorized)**:
```json
{
  "detail": "Invalid email or password"
}
```

**Note**: Backend testing confirmed this endpoint exists and works correctly (see `api-test-report.md`).

---

## Files to Modify

| File | What to Change | Lines |
|------|----------------|-------|
| `frontend/src/api/auth.ts` | Add `login()` method and `LoginResponse` interface | Add after line 14 |
| `frontend/src/pages/LoginPage.tsx` | Import authApi, replace hardcoded token with API call | Lines 1, 27-29 |
| `frontend/src/pages/LoginPage.tsx` | Add userId storage | After line 28 (in fixed code) |
| `frontend/src/pages/LoginPage.tsx` | Add TODO comment for Google login | Line 42 |

---

## Success Criteria for Re-submission

QA will approve when:

1. ✓ Authentication bypass vulnerability is **FIXED** (not just documented)
2. ✓ LoginPage calls real backend API via `authApi.login()`
3. ✓ Real JWT token stored in localStorage (not 'dev-token')
4. ✓ userId stored in localStorage
5. ✓ Successful login with valid credentials works end-to-end
6. ✓ Failed login with invalid credentials shows error message
7. ✓ No security vulnerabilities remain
8. ✓ All spec acceptance criteria met (9/9)
9. ✓ TypeScript compilation succeeds
10. ✓ No console errors during authentication flow

---

## After Fixes

Once fixes are complete:

1. **Commit changes** with message:
   ```
   fix: implement proper authentication to replace hardcoded token bypass (qa-requested)

   - Add authApi.login() method to call backend /api/v1/auth/login
   - Replace hardcoded 'dev-token' with real JWT from API response
   - Implement userId storage in localStorage
   - Fix CWE-287 authentication bypass vulnerability

   Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
   ```

2. **Update build-progress.txt** with fix summary

3. **Request QA re-review** - QA will automatically re-run validation

4. **QA will verify**:
   - Authentication bypass is fixed
   - All acceptance criteria met
   - No security vulnerabilities
   - Ready for production

---

## Questions or Blockers?

If you encounter issues during implementation:

1. **Backend endpoint not working?**
   - Verify backend is running on port 8000
   - Check `api-test-report.md` for endpoint verification
   - Backend endpoint was confirmed working during verification

2. **Don't have valid test credentials?**
   - Check backend documentation for test users
   - Ask backend team for test account
   - Or implement user registration first (if needed)

3. **TypeScript errors with LoginResponse?**
   - Ensure User type is imported from '../types'
   - Verify LoginResponse interface matches backend contract
   - Check that response.data structure matches interface

4. **Network errors during testing?**
   - Verify frontend and backend are both running
   - Check VITE_API_URL environment variable
   - Verify CORS is configured in backend

---

**Fix Request Created**: 2026-01-30
**QA Status**: REJECTED - Awaiting fixes
**Estimated Fix Time**: 30-60 minutes
**Priority**: CRITICAL - Security vulnerability must be fixed

---

## Summary

**What to do**: Implement proper authentication flow
**Why**: Current code has critical security vulnerability (authentication bypass)
**How**: Add authApi.login() method and replace hardcoded token with real API call
**Verify**: Test with valid/invalid credentials, check localStorage contains real JWT
**Success**: Authentication bypass fixed, all tests pass, QA approves
