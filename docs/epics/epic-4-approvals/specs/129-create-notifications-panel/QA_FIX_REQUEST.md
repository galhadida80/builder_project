# QA Fix Request

**Status**: REJECTED ❌
**Date**: 2026-02-01
**QA Session**: 1

---

## Critical Issues to Fix

### 1. API Response Field Name Mismatch - Unread Count

**Severity**: 🚨 CRITICAL (Blocks Sign-off)

**Problem**:
The backend API returns `unread_count` but the frontend expects `count`. This mismatch will cause the unread notifications badge to fail, showing 0 or undefined instead of the actual count.

**Location**:
- Backend: `backend/app/api/v1/notifications.py` line 43
- Frontend: `frontend/src/types/notification.ts` lines 23-25
- Frontend API: `frontend/src/api/notifications.ts` line 12

**Current Code**:
```python
# Backend (backend/app/api/v1/notifications.py line 43)
@router.get("/notifications/unread-count", response_model=dict)
async def get_unread_count(...):
    ...
    return {"unread_count": count}  # ❌ Returns snake_case
```

```typescript
// Frontend (frontend/src/types/notification.ts)
export interface UnreadCountResponse {
  count: number  // ❌ Expects 'count', but backend sends 'unread_count'
}
```

```typescript
// Frontend API (frontend/src/api/notifications.ts line 12)
getUnreadCount: async (): Promise<number> => {
  const response = await apiClient.get<UnreadCountResponse>('/notifications/unread-count')
  return response.data.count  // ❌ Will be undefined!
}
```

**Why It Happens**:
The endpoint uses `response_model=dict` instead of a Pydantic model with `CamelCaseModel`. Other endpoints in this project automatically convert snake_case to camelCase using the `CamelCaseModel` base class, but this endpoint returns a raw dictionary.

**Impact**:
- Unread notifications badge in header will not display correctly
- User won't know they have unread notifications
- Core feature functionality broken

---

## Required Fix

**Choose ONE of the following solutions:**

### Option A: Update Backend to Match Frontend (Recommended)

This is the simplest fix - just change the field name in the backend response.

**File**: `backend/app/api/v1/notifications.py`

**Change line 43 from:**
```python
return {"unread_count": count}
```

**To:**
```python
return {"count": count}
```

**Pros**:
- Minimal change
- Frontend works without modification
- Quick fix

**Cons**:
- Inconsistent with other backend fields (which use snake_case internally)

---

### Option B: Create Pydantic Schema with CamelCaseModel (Better Practice)

This follows the project's established pattern of using Pydantic models for responses.

**Step 1**: Add schema to `backend/app/schemas/notification.py`

```python
class UnreadCountResponse(CamelCaseModel):
    """Response model for unread count endpoint."""
    unread_count: int
```

**Step 2**: Export the schema in `backend/app/schemas/__init__.py`

```python
from app.schemas.notification import (
    NotificationBase,
    NotificationCreate,
    NotificationResponse,
    UnreadCountResponse,  # Add this line
)
```

**Step 3**: Update endpoint in `backend/app/api/v1/notifications.py`

```python
from app.schemas.notification import NotificationResponse, UnreadCountResponse  # Add import

@router.get("/notifications/unread-count", response_model=UnreadCountResponse)
async def get_unread_count(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(func.count(Notification.id))
        .where(Notification.user_id == current_user.id)
        .where(Notification.is_read == False)
    )
    count = result.scalar()
    return UnreadCountResponse(unread_count=count)
```

**Step 4**: Update frontend type in `frontend/src/types/notification.ts`

```typescript
export interface UnreadCountResponse {
  unreadCount: number  // Changed from 'count' to 'unreadCount'
}
```

**Step 5**: Update frontend API in `frontend/src/api/notifications.ts`

```typescript
getUnreadCount: async (): Promise<number> => {
  const response = await apiClient.get<UnreadCountResponse>('/notifications/unread-count')
  return response.data.unreadCount  // Changed from 'count' to 'unreadCount'
}
```

**Pros**:
- Follows established project patterns
- Uses Pydantic validation
- Automatic camelCase conversion via CamelCaseModel
- Consistent with other endpoints
- Type safety

**Cons**:
- Requires changes to both backend and frontend
- Slightly more code

---

## Verification Steps

After implementing the fix, verify it works:

### 1. Manual API Test

```bash
# Get auth token
TOKEN=$(curl -s -X POST http://localhost:8000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"user@example.com","password":"password"}' \
  | jq -r '.accessToken')

# Test unread count endpoint
curl http://localhost:8000/api/v1/notifications/unread-count \
  -H "Authorization: Bearer $TOKEN" | jq

# Expected response (Option A):
# {"count": 5}

# Expected response (Option B):
# {"unreadCount": 5}
```

### 2. Frontend Verification

1. Start frontend: `cd frontend && npm run dev`
2. Open http://localhost:3000
3. Login
4. Check notification bell icon in header
5. Verify badge shows correct unread count (not 0 or undefined)
6. Open browser DevTools → Network tab
7. Click notification bell
8. Find request to `/api/v1/notifications/unread-count`
9. Verify response has correct field name
10. Verify badge updates correctly when marking notifications as read

### 3. Browser Console Check

1. Open browser DevTools → Console
2. No errors related to `undefined` or `count`
3. Badge renders with number visible

---

## Additional Notes

**No other issues found**. The rest of the implementation is excellent:
- ✅ Security best practices followed
- ✅ Code patterns consistent with project
- ✅ Proper authentication on all endpoints
- ✅ Comprehensive unit tests created
- ✅ Good error handling
- ✅ Accessibility considerations
- ✅ Responsive design

This is the **only** blocker for QA sign-off.

---

## After Fixes

Once the fix is implemented and verified:

1. **Commit the fix**:
   ```bash
   git add .
   git commit -m "fix: unread count API field name mismatch (qa-requested)"
   ```

2. **QA will automatically re-run** and validate:
   - The API response field name is correct
   - Frontend badge displays properly
   - All other checks still pass

3. **Expected outcome**: QA approval for merge to main

---

**Priority**: 🔴 HIGH - Feature is non-functional without this fix

**Estimated Time**: 5-10 minutes (Option A) or 15-20 minutes (Option B)

**Recommended Solution**: Option B (Pydantic schema) - More robust and consistent with project patterns

---

**QA Contact**: Auto-Claude QA Agent
**Re-validation**: Automatic after commit
