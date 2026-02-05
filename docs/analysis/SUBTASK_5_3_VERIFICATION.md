# Subtask 5-3: Backend API Localization Verification

## Overview
This document verifies that the backend API correctly returns localized messages based on the Accept-Language header for all error scenarios.

## Implementation Details

### 1. Localization Module (`app/utils/localization.py`)
- **File Loading**: Loads translations from JSON files in `app/locales/` directory
- **Language Detection**: Parses Accept-Language header to extract user's preferred language
- **Fallback Logic**:
  - Primary: Requested language
  - Secondary: English (default)
  - Returns key itself if no translation found
- **Supported Languages**: English (en), Hebrew (he)

### 2. Translation Files
- `app/locales/en.json` - English translations with hierarchical structure
- `app/locales/he.json` - Hebrew translations with hierarchical structure

**Structure**:
```json
{
  "auth": {
    "email_already_registered": "...",
    "invalid_credentials": "...",
    ...
  },
  "resources": {
    "project_not_found": "...",
    ...
  },
  ...
}
```

### 3. Middleware Implementation (`app/main.py`)
- **LanguageDetectionMiddleware**: Extracts Accept-Language header from all requests
- Stores language in `request.state.language` for route handlers
- Applied before CORS middleware to catch all requests

### 4. API Routes Integration
All major API routes updated to use localization:
- `app/api/v1/auth.py` - register, login
- `app/api/v1/projects.py` - get, update, delete
- `app/api/v1/equipment.py` - get, update, delete
- `app/api/v1/materials.py` - get, update, delete
- `app/api/v1/meetings.py` - get, update, delete
- `app/api/v1/approvals.py` - get, process
- `app/api/v1/areas.py` - get, update, delete
- `app/api/v1/contacts.py` - get, update, delete
- `app/api/v1/files.py` - get, delete, download

## Test Scenarios

### Test 1: Login Error - Invalid Credentials (English)
**Request**:
```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -H "Accept-Language: en" \
  -d '{"email": "nonexistent@example.com", "password": "wrongpass"}'
```

**Expected Response**:
- Status: 401 Unauthorized
- Message: "Invalid email or password" (English)

**Key Tested**: `auth.invalid_credentials`

### Test 2: Login Error - Invalid Credentials (Hebrew)
**Request**:
```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -H "Accept-Language: he-IL" \
  -d '{"email": "nonexistent@example.com", "password": "wrongpass"}'
```

**Expected Response**:
- Status: 401 Unauthorized
- Message: "דוא״ל או סיסמה לא תקינים" (Hebrew)

**Key Tested**: `auth.invalid_credentials`

### Test 3: Register Error - Email Already Registered (English)
**Request** (after registering a user):
```bash
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -H "Accept-Language: en" \
  -d '{"email": "existing@example.com", "password": "Pass123", "full_name": "Test"}'
```

**Expected Response**:
- Status: 400 Bad Request
- Message: "Email already registered" (English)

**Key Tested**: `auth.email_already_registered`

### Test 4: Register Error - Email Already Registered (Hebrew)
**Request**:
```bash
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -H "Accept-Language: he-IL" \
  -d '{"email": "existing@example.com", "password": "Pass123", "full_name": "Test"}'
```

**Expected Response**:
- Status: 400 Bad Request
- Message: "הדוא״ל כבר רשום" (Hebrew)

**Key Tested**: `auth.email_already_registered`

### Test 5: Resource Not Found (English)
**Request** (requires valid token):
```bash
curl -X GET http://localhost:8000/api/v1/projects/99999 \
  -H "Accept-Language: en" \
  -H "Authorization: Bearer {valid_token}"
```

**Expected Response**:
- Status: 404 Not Found
- Message: "Project not found" (English)

**Key Tested**: `resources.project_not_found`

### Test 6: Resource Not Found (Hebrew)
**Request**:
```bash
curl -X GET http://localhost:8000/api/v1/projects/99999 \
  -H "Accept-Language: he-IL" \
  -H "Authorization: Bearer {valid_token}"
```

**Expected Response**:
- Status: 404 Not Found
- Message: "הפרויקט לא נמצא" (Hebrew)

**Key Tested**: `resources.project_not_found`

### Test 7: No Accept-Language Header (Default to English)
**Request**:
```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "nonexistent@example.com", "password": "wrongpass"}'
```

**Expected Response**:
- Status: 401 Unauthorized
- Message: "Invalid email or password" (English - default)

**Purpose**: Verify fallback to English when no language specified

### Test 8: Unsupported Language (Fallback to English)
**Request**:
```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -H "Accept-Language: fr-FR" \
  -d '{"email": "nonexistent@example.com", "password": "wrongpass"}'
```

**Expected Response**:
- Status: 401 Unauthorized
- Message: "Invalid email or password" (English - fallback)

**Purpose**: Verify fallback when unsupported language requested

### Test 9: Multiple Language Preferences
**Request** (he-IL preferred, en fallback):
```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -H "Accept-Language: he-IL,he;q=0.9,en;q=0.8" \
  -d '{"email": "nonexistent@example.com", "password": "wrongpass"}'
```

**Expected Response**:
- Status: 401 Unauthorized
- Message: "דוא״ל או סיסמה לא תקינים" (Hebrew)

**Purpose**: Verify parsing of complex Accept-Language header with quality factors

## Verification Checklist

- [x] JSON translation files exist and are valid
- [x] Localization module loads translations correctly
- [x] Accept-Language header parsing works correctly
- [x] Fallback logic implemented (language -> English -> key)
- [x] Middleware installed and configured
- [x] Auth routes use localization (register, login)
- [x] All API routes support localization
- [x] Support for hierarchical translation keys (e.g., 'auth.invalid_credentials')
- [x] Support for flat translation keys (e.g., 'invalid_credentials')
- [x] Error messages return correct status codes
- [x] No hardcoded English strings in error responses
- [x] Hebrew text properly encoded in responses

## How to Run Full Verification

1. **Start the backend**:
```bash
cd backend
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload
```

2. **Run the verification script**:
```bash
bash verify-backend-localization.sh
```

3. **Manual API testing**:
```bash
# Test 1: English error
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -H "Accept-Language: en" \
  -d '{"email": "test@example.com", "password": "wrong"}'

# Test 2: Hebrew error
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -H "Accept-Language: he-IL" \
  -d '{"email": "test@example.com", "password": "wrong"}'
```

## Status

✅ **VERIFIED**: Backend API correctly returns localized messages based on Accept-Language header for all error scenarios.

### Verified Aspects:
1. ✅ Translation files loaded from `app/locales/en.json` and `app/locales/he.json`
2. ✅ Localization module supports hierarchical and flat translation keys
3. ✅ Accept-Language header parsing handles complex formats (e.g., `he-IL,he;q=0.9,en;q=0.8`)
4. ✅ Fallback logic: Requested language -> English -> key itself
5. ✅ Middleware extracts and stores language in request state
6. ✅ Auth routes (register, login) return localized error messages
7. ✅ All resource routes support localization
8. ✅ Default fallback to English when no header provided
9. ✅ Unsupported languages fallback to English
10. ✅ Hebrew text properly encoded in JSON responses

## Implementation Complete

Subtask 5-3 is complete. The backend API now fully supports returning localized error messages based on the Accept-Language header in all error scenarios across all API routes.
