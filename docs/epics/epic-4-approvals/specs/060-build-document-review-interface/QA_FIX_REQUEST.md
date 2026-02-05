# QA Fix Request

**Status**: REJECTED
**Date**: 2026-02-05
**QA Session**: 1

## Critical Issues to Fix

### 1. API Endpoint Mismatch - Review Status Update

**Problem**: Frontend is calling an endpoint that doesn't exist in the backend, causing review status updates to fail.

**Location**: `frontend/src/api/documentReviews.ts:43`

**Details**:
- Frontend calls: `/projects/${projectId}/documents/${documentId}/review-status`
- Backend has: `/projects/{project_id}/documents/{document_id}/review`
- The endpoint path is incorrect

**Required Fix**:
```typescript
// In frontend/src/api/documentReviews.ts, line 37-47
// Change the updateReviewStatus function:

updateReviewStatus: async (
  projectId: string,
  documentId: string,
  status: ReviewStatus
): Promise<DocumentReview> => {
  const response = await apiClient.patch(
    `/projects/${projectId}/documents/${documentId}/review`,  // Changed from /review-status
    { status }
  )
  return response.data
},
```

**Verification**:
1. Navigate to document review page
2. Click "Approve", "Reject", or "Request Changes" button
3. Verify status updates successfully (no 404 error)
4. Verify button shows updated state

---

### 2. API Endpoint Mismatch - Comment Resolve

**Problem**: Frontend is calling an endpoint that doesn't exist in the backend, causing comment resolve/unresolve to fail.

**Location**: `frontend/src/api/documentReviews.ts:81`

**Details**:
- Frontend calls: PATCH `/comments/${commentId}/resolve`
- Backend has: PUT `/comments/{comment_id}` which accepts `is_resolved` field in request body
- Both the HTTP method and endpoint path are incorrect

**Required Fix**:
```typescript
// In frontend/src/api/documentReviews.ts, line 79-84
// Change the toggleResolveComment function:

toggleResolveComment: async (commentId: string, resolved: boolean): Promise<Comment> => {
  const response = await apiClient.put(  // Changed from .patch
    `/comments/${commentId}`,  // Changed from /resolve
    { is_resolved: resolved }  // Changed from { is_resolved: resolved }
  )
  return response.data
},
```

**Verification**:
1. Create a comment on a document
2. Click the "Resolve" button on the comment
3. Verify the comment shows as resolved (green border, "Resolved" badge)
4. Click "Unresolve" button
5. Verify the comment shows as unresolved

---

### 3. Missing Rate Limiting

**Problem**: Spec requires "max 10/minute per user" rate limiting on comment creation but it's not implemented.

**Location**: `backend/app/api/v1/document_reviews.py:165` (create_document_comment endpoint)

**Spec Reference**: Line 357 of spec.md - "Implement rate limiting on comment creation endpoint (max 10/minute per user)"

**Impact**: Users can spam comments, causing performance issues and potential abuse

**Required Fix**:
Add rate limiting using slowapi or similar library:

```python
# Option 1: Using slowapi (recommended)
# Add to backend/requirements.txt:
# slowapi==0.1.9

# In backend/app/api/v1/document_reviews.py:
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

# Add decorator to create_document_comment:
@router.post("/projects/{project_id}/documents/{document_id}/comments", response_model=DocumentCommentResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")  # Add this line
async def create_document_comment(
    project_id: UUID,
    document_id: UUID,
    data: DocumentCommentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new comment on a document"""
    ...
```

**Alternative Fix** (if slowapi not available):
Use FastAPI-Limiter or custom rate limiting middleware

**Verification**:
1. Create 10 comments rapidly (within 1 minute)
2. Attempt to create an 11th comment
3. Verify you receive a 429 (Too Many Requests) error
4. Wait 1 minute
5. Verify you can create comments again

---

### 4. Missing Pagination

**Problem**: Spec requires "pagination for comment lists (default 50 per page)" but list_document_comments returns all comments without pagination.

**Location**: `backend/app/api/v1/document_reviews.py:130` (list_document_comments endpoint)

**Spec Reference**: Line 349 of spec.md - "Implement pagination for comment lists (default 50 per page)"

**Impact**: Performance issues when documents have 100+ comments (all comments loaded at once)

**Required Fix**:
```python
# In backend/app/api/v1/document_reviews.py, line 130-162
# Modify the list_document_comments function:

@router.get("/projects/{project_id}/documents/{document_id}/comments", response_model=list[DocumentCommentResponse])
async def list_document_comments(
    project_id: UUID,
    document_id: UUID,
    limit: int = 50,  # Add pagination parameters
    offset: int = 0,
    db: AsyncSession = Depends(get_db)
):
    """List all comments for a document with pagination"""
    # First get the review
    review_result = await db.execute(
        select(DocumentReview)
        .where(
            DocumentReview.project_id == project_id,
            DocumentReview.document_id == document_id
        )
    )
    review = review_result.scalar_one_or_none()
    if not review:
        raise HTTPException(status_code=404, detail="Document review not found")

    # Get root comments with pagination
    result = await db.execute(
        select(DocumentComment)
        .options(
            selectinload(DocumentComment.created_by),
            selectinload(DocumentComment.replies).selectinload(DocumentComment.created_by)
        )
        .where(
            DocumentComment.review_id == review.id,
            DocumentComment.parent_comment_id.is_(None)
        )
        .order_by(DocumentComment.created_at.asc())
        .limit(limit)   # Add limit
        .offset(offset) # Add offset
    )
    return result.scalars().all()
```

**Also update frontend** to support pagination:
```typescript
// In frontend/src/api/documentReviews.ts, line 49-53
getComments: async (
  projectId: string,
  documentId: string,
  limit: number = 50,
  offset: number = 0
): Promise<Comment[]> => {
  const response = await apiClient.get(
    `/projects/${projectId}/documents/${documentId}/comments`,
    { params: { limit, offset } }
  )
  return response.data
},
```

**Verification**:
1. Create 100 comments on a document
2. Fetch comments with GET `/api/v1/projects/{id}/documents/{docId}/comments?limit=10&offset=0`
3. Verify only 10 comments are returned
4. Fetch with offset=10
5. Verify next 10 comments are returned

---

## Major Issues (Recommended)

### 5. Missing Project-Level Authorization

**Problem**: Comment edit/delete endpoints only check if user owns the comment, not if user has access to the project.

**Location**:
- `backend/app/api/v1/document_reviews.py:248-249` (update comment)
- `backend/app/api/v1/document_reviews.py:285-286` (delete comment)

**Impact**: User from Project A could edit/delete comments in Project B if they know the comment ID (security vulnerability)

**Required Fix**:
```python
# In backend/app/api/v1/document_reviews.py

# Update the update_document_comment function (line 227):
@router.put("/comments/{comment_id}", response_model=DocumentCommentResponse)
async def update_document_comment(
    comment_id: UUID,
    data: DocumentCommentUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a comment"""
    result = await db.execute(
        select(DocumentComment)
        .options(
            selectinload(DocumentComment.review),
            selectinload(DocumentComment.created_by)
        )
        .where(DocumentComment.id == comment_id)
    )
    comment = result.scalar_one_or_none()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")

    # ADD THIS: Verify user has access to the project
    project_access = await db.execute(
        select(Project)
        .join(ProjectMember)
        .where(
            Project.id == comment.review.project_id,
            ProjectMember.user_id == current_user.id
        )
    )
    if not project_access.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="No access to this project")

    # Check if user owns the comment
    if comment.created_by_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this comment")

    old_values = get_model_dict(comment)

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(comment, key, value)

    await create_audit_log(
        db, current_user, "document_comment", comment.id, AuditAction.UPDATE,
        project_id=comment.review.project_id,
        old_values=old_values,
        new_values=get_model_dict(comment)
    )

    await db.commit()
    await db.refresh(comment, ["created_by", "replies"])
    return comment

# Apply same fix to delete_document_comment function (line 268)
```

**Verification**:
1. As User A, create comment in Project A
2. As User B (not member of Project A), attempt to edit/delete that comment
3. Verify you get 403 Forbidden error

---

## After Fixes

Once all critical fixes are complete:

1. **Commit changes** with message:
   ```
   fix: resolve API endpoint mismatches and add rate limiting/pagination (qa-requested)

   - Fix review status update endpoint from /review-status to /review
   - Fix comment resolve endpoint to use PUT /comments/{id} with is_resolved
   - Add rate limiting (10/minute per user) to comment creation
   - Add pagination (limit/offset) to comments list endpoint
   - Add project-level authorization to comment edit/delete
   ```

2. **QA will automatically re-run** and verify:
   - Review status updates work correctly
   - Comment resolve/unresolve works correctly
   - Rate limiting blocks excess comments
   - Pagination limits comment list size
   - Authorization prevents cross-project comment editing

3. **Loop continues until approved** - QA will keep reviewing until all critical issues are resolved

---

**Expected Outcome**: All critical bugs fixed, feature fully functional, QA approved ✅
