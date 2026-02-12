# Specification: Fix Login Form Authentication Bypass

## Overview

The login form currently bypasses authentication entirely, allowing any user to access the dashboard without credential validation. This critical security vulnerability must be fixed by implementing proper authentication flow that calls the backend API, validates credentials, stores JWT tokens, and handles authentication failures appropriately.

## Workflow Type

**Type**: feature

**Rationale**: While this is fundamentally a critical security bug fix, the workflow type is classified as "feature" because it requires implementing a complete authentication flow that was previously non-existent. This involves integrating with the backend API, implementing token management, and adding error handling - essentially building out the authentication feature properly.

## Task Scope

### Services Involved
- **frontend** (primary) - Fix LoginPage.tsx to implement proper authentication flow
- **backend** (integration) - Utilize existing `/login` endpoint in auth.py

### This Task Will:
- [ ] Replace mock authentication delay with actual backend API call to `/login` endpoint
- [ ] Implement JWT token storage in localStorage upon successful authentication
- [ ] Add error handling for invalid credentials (401 responses)
- [ ] Add proper loading states during authentication requests
- [ ] Implement error messaging for failed login attempts
- [ ] Ensure successful authentication redirects to dashboard with valid token

### Out of Scope:
- Changes to backend authentication logic (already exists)
- Registration flow modifications
- Password reset functionality
- Multi-factor authentication
- Session management beyond JWT storage
- Protected route implementation (separate concern)

## Service Context

### Frontend

**Tech Stack:**
- Language: TypeScript
- Framework: React
- Build Tool: Vite
- Styling: Emotion + Material-UI
- HTTP Client: axios (available in dependencies)
- Routing: react-router-dom

**Entry Point:** `src/App.tsx`

**How to Run:**
```bash
cd frontend
npm run dev
```

**Port:** 3000

**Key Dependencies:**
- `axios` - HTTP client for API calls
- `react-router-dom` - Navigation after authentication
- `@mui/material` - UI components for error display

### Backend

**Tech Stack:**
- Language: Python
- Framework: FastAPI
- Authentication: JWT (python-jose)
- ORM: SQLAlchemy

**Authentication Endpoint:**
- Path: `/login`
- Method: POST
- File: `app/api/v1/auth.py`
- Requires Auth: false

**How to Run:**
```bash
cd backend
# (Docker Compose likely used - see docker-compose.yml)
```

**Port:** 8000

**Authentication Strategy:**
- JWT tokens using python-jose library
- User model located at `app/models/user.py`

## Files to Modify

| File | Service | What to Change |
|------|---------|---------------|
| `frontend/src/pages/LoginPage.tsx` | frontend | Replace mock timeout with API call to `/login`, add token storage, implement error handling |
| `frontend/src/utils/api.ts` (or create) | frontend | Create/update API client with authentication endpoints |
| `frontend/src/context/AuthContext.tsx` (or create) | frontend | Create/update auth context for token management and user state |

## Files to Reference

These files show patterns to follow:

| File | Pattern to Copy |
|------|----------------|
| `backend/app/api/v1/auth.py` | Backend API contract - understand request/response format for `/login` endpoint |
| `frontend/src/App.tsx` | Existing routing patterns and context providers setup |
| `backend/app/models/user.py` | User model structure to understand what data is returned |

## Patterns to Follow

### Backend Authentication API Pattern

From `backend/app/api/v1/auth.py`:

**Expected pattern for `/login` endpoint:**

```python
@router.post("/login")
async def login(credentials: LoginRequest):
    # Validate credentials
    # Return JWT token and user data
    return {
        "access_token": "jwt_token_string",
        "token_type": "bearer",
        "user": {...}
    }
```

**Key Points:**
- POST request to `/login` with email/username and password
- Returns JWT access token and user information
- Token should be included in Authorization header for protected routes

### Frontend API Client Pattern

**Expected pattern for axios API calls:**

```typescript
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default apiClient;
```

**Key Points:**
- Use environment variable for API base URL
- Store token in localStorage
- Use axios interceptors for automatic token injection

### Authentication Context Pattern

**Expected pattern for auth state management:**

```typescript
import React, { createContext, useContext, useState } from 'react';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  const login = async (email: string, password: string) => {
    // API call, store token, set user
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};
```

**Key Points:**
- Centralize auth state management
- Provide login/logout methods
- Track authentication status

## Requirements

### Functional Requirements

1. **Backend Authentication Integration**
   - Description: Login form must POST credentials to backend `/login` endpoint
   - Acceptance: Successful login with valid credentials receives JWT token

2. **JWT Token Storage**
   - Description: Store JWT token in localStorage on successful authentication
   - Acceptance: Token persists across page refreshes and is accessible for API calls

3. **Error Handling**
   - Description: Display appropriate error messages for failed authentication attempts
   - Acceptance: 401 responses show user-friendly error message; network errors handled gracefully

4. **Loading States**
   - Description: Show loading indicator during authentication request
   - Acceptance: Submit button disabled and loading indicator visible during API call

5. **Successful Authentication Flow**
   - Description: Redirect to dashboard after successful login with stored token
   - Acceptance: User navigates to `/dashboard` only after valid token is stored

### Edge Cases

1. **Network Errors** - Display error message and allow retry if API request fails
2. **Invalid Credentials** - Show "Invalid email or password" message for 401 responses
3. **Empty Fields** - Validate form fields before submission
4. **Session Expiry** - Handle expired tokens with redirect to login (future consideration)
5. **Concurrent Requests** - Prevent multiple simultaneous login attempts

## Implementation Notes

### DO
- Follow the REST API pattern established in `backend/app/api/v1/auth.py`
- Use axios for HTTP client (already in dependencies)
- Store JWT token in localStorage with key `access_token`
- Implement proper TypeScript interfaces for API request/response types
- Add error boundary for authentication failures
- Use Material-UI components for consistent UI (Snackbar for error messages)
- Clear any existing tokens before attempting new login

### DON'T
- Create custom HTTP client when axios is available
- Store sensitive data beyond the JWT token in localStorage
- Bypass error handling with empty catch blocks
- Hard-code API URLs (use environment variables)
- Navigate to dashboard before token is stored
- Leave the mock 1-second timeout in place

## Development Environment

### Start Services

**Backend:**
```bash
cd backend
# Using Docker Compose
docker-compose up backend

# Or direct Python
uvicorn app.main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm run dev
```

### Service URLs
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- Backend API Docs: http://localhost:8000/docs

### Required Environment Variables

**Frontend (.env):**
```
VITE_API_URL=http://localhost:8000
```

**Backend (.env):**
```
DATABASE_URL=postgresql://user:password@localhost/dbname
JWT_SECRET_KEY=your-secret-key
JWT_ALGORITHM=HS256
```

## Success Criteria

The task is complete when:

1. [ ] Login form calls backend `/login` API endpoint with email/password
2. [ ] JWT token is stored in localStorage on successful authentication
3. [ ] User is redirected to dashboard only after successful authentication
4. [ ] Invalid credentials display appropriate error message
5. [ ] Loading state is shown during API request
6. [ ] Network errors are handled gracefully with user feedback
7. [ ] No console errors during authentication flow
8. [ ] Existing tests still pass
9. [ ] Authentication flow verified in browser with valid/invalid credentials

## QA Acceptance Criteria

**CRITICAL**: These criteria must be verified by the QA Agent before sign-off.

### Unit Tests
| Test | File | What to Verify |
|------|------|----------------|
| Login API Call | `frontend/src/pages/LoginPage.test.tsx` | Verify API endpoint called with correct credentials |
| Token Storage | `frontend/src/pages/LoginPage.test.tsx` | Verify localStorage.setItem called with token on success |
| Error Handling | `frontend/src/pages/LoginPage.test.tsx` | Verify error message displayed on 401 response |
| Loading State | `frontend/src/pages/LoginPage.test.tsx` | Verify loading state active during API call |

### Integration Tests
| Test | Services | What to Verify |
|------|----------|----------------|
| Authentication Flow | frontend ↔ backend | POST to `/login` returns JWT token for valid credentials |
| Invalid Credentials | frontend ↔ backend | POST to `/login` returns 401 for invalid credentials |
| Token Persistence | frontend ↔ backend | Token stored in localStorage can be used for authenticated requests |

### End-to-End Tests
| Flow | Steps | Expected Outcome |
|------|-------|------------------|
| Successful Login | 1. Navigate to /login 2. Enter valid credentials 3. Click submit | Redirected to /dashboard with token in localStorage |
| Failed Login | 1. Navigate to /login 2. Enter invalid credentials 3. Click submit | Error message displayed, remain on /login page |
| Form Validation | 1. Navigate to /login 2. Leave fields empty 3. Click submit | Validation errors shown, no API call made |

### Browser Verification (if frontend)
| Page/Component | URL | Checks |
|----------------|-----|--------|
| Login Page | `http://localhost:3000/login` | Form renders correctly with email/password fields |
| Login Success | `http://localhost:3000/login` | Valid credentials redirect to dashboard |
| Login Error | `http://localhost:3000/login` | Invalid credentials show error message |
| Token Storage | DevTools > Application > localStorage | `access_token` key exists after successful login |

### API Verification
| Endpoint | Method | Expected Behavior |
|----------|--------|-------------------|
| `/login` | POST | Returns 200 + JWT token for valid credentials |
| `/login` | POST | Returns 401 for invalid credentials |
| `/me` | GET | Returns user data when authenticated with valid token |

### Security Verification
| Check | Command/Action | Expected |
|-------|----------------|----------|
| No Token Leakage | Check browser console/network | Token not exposed in console logs or URL |
| HTTPS in Production | Environment check | API calls use HTTPS in production |
| XSS Prevention | Code review | No dangerouslySetInnerHTML with user input |

### QA Sign-off Requirements
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] All E2E tests pass
- [ ] Browser verification complete - login flow works end-to-end
- [ ] API endpoints return expected responses
- [ ] Token stored correctly in localStorage
- [ ] No security vulnerabilities introduced
- [ ] No regressions in existing functionality
- [ ] Code follows established React/TypeScript patterns
- [ ] Error handling covers all edge cases
- [ ] Loading states provide good UX
- [ ] No console errors or warnings
