# Specification: Document Review Interface

## Overview

Build a document review interface featuring a split-pane layout with a document viewer on one side and an interactive commenting system on the other. This feature enables stakeholders to review project documents (drawings, specs, PDFs) and provide feedback through contextual comments, streamlining the document approval workflow in construction projects.

## Workflow Type

**Type**: feature

**Rationale**: This is a new feature implementation that adds document review and commenting capabilities to the platform. It involves creating new UI components, API endpoints, database models, and integrating with the existing file management system.

## Task Scope

### Services Involved
- **frontend** (primary) - New UI components for split view and commenting interface
- **backend** (integration) - API endpoints for comments, document metadata, and review workflow

### This Task Will:
- [ ] Create a split-view layout component with resizable panes
- [ ] Implement document viewer supporting common file types (PDF, images, etc.)
- [ ] Build commenting system with thread support
- [ ] Create API endpoints for document comments (CRUD operations)
- [ ] Add database models for document reviews and comments
- [ ] Integrate with existing file management system (`/projects/{project_id}/files`)
- [ ] Implement real-time or near-real-time comment updates
- [ ] Add review status tracking (pending, in review, approved, rejected)

### Out of Scope:
- Advanced annotation tools (markup, drawing on documents)
- Version comparison/diff functionality
- Offline support
- Document editing capabilities
- OCR or text extraction from PDFs

## Service Context

### Frontend

**Tech Stack:**
- Language: TypeScript
- Framework: Next.js
- Styling: Emotion + Material-UI (MUI)
- Key directories: `components/`, `app/`, `pages/`

**Entry Point:** `src/App.tsx`

**How to Run:**
```bash
cd frontend
npm run dev
```

**Port:** 3000

**Key Dependencies:**
- @mui/material - UI components
- @mui/icons-material - Icons
- @emotion/react, @emotion/styled - Styling
- axios - API requests
- firebase - Authentication

### Backend

**Tech Stack:**
- Language: Python
- Framework: FastAPI
- ORM: SQLAlchemy
- Database: PostgreSQL
- Task Queue: Celery

**How to Run:**
```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

**Port:** 8000

**API Prefix:** `/api/v1`

**Key Systems:**
- File storage: Local storage or S3 (configurable via `STORAGE_TYPE`)
- Existing file API: `/projects/{project_id}/files/*`
- Authentication: Firebase + JWT

## Files to Modify

| File | Service | What to Change |
|------|---------|---------------|
| `backend/app/models/` | backend | Create new models: `DocumentReview`, `DocumentComment` |
| `backend/app/api/v1/` | backend | Create new router: `document_reviews.py` with comment CRUD endpoints |
| `backend/app/schemas/` | backend | Create Pydantic schemas for comment requests/responses |
| `frontend/components/` | frontend | Create `DocumentReviewPanel/` component directory |
| `frontend/app/projects/[id]/documents/[documentId]/review/` | frontend | Create new page route for document review interface |
| `backend/alembic/versions/` | backend | Add migration for new database tables |

## Files to Reference

These files show patterns to follow:

| File | Pattern to Copy |
|------|----------------|
| `backend/app/api/v1/files.py` | File retrieval and download patterns, project-scoped endpoints |
| `backend/app/api/v1/rfis.py` | Comment/response pattern (RFI has responses similar to comments) |
| `backend/app/models/` (any model file) | SQLAlchemy model structure, relationships, timestamps |
| `frontend/components/` (any MUI component) | MUI theming, Emotion styling patterns |
| Reference image: `27-document-review.png` | UI layout and design specification |

## Patterns to Follow

### Backend API Pattern

From existing FastAPI routes (e.g., `files.py`, `rfis.py`):

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/document-reviews", tags=["document-reviews"])

@router.get("/projects/{project_id}/documents/{document_id}/comments")
async def get_document_comments(
    project_id: int,
    document_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Implementation
    pass
```

**Key Points:**
- Use project-scoped routes for multi-tenancy
- Async/await pattern for database operations
- Dependency injection for database session and auth
- Proper HTTP status codes and error handling

### Frontend Component Pattern

From existing MUI components:

```typescript
import { Box, Paper, Divider } from '@mui/material';
import { styled } from '@mui/material/styles';

const StyledPanel = styled(Paper)(({ theme }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
}));

export const DocumentReviewPanel = () => {
  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      <StyledPanel>{/* Document viewer */}</StyledPanel>
      <Divider orientation="vertical" />
      <StyledPanel>{/* Comments panel */}</StyledPanel>
    </Box>
  );
};
```

**Key Points:**
- Use MUI `styled()` for component styling
- Theme integration via `theme` parameter
- Flexbox for responsive layouts
- TypeScript for type safety

## Requirements

### Functional Requirements

1. **Split View Layout**
   - Description: Two-pane interface with document on left, comments on right
   - Acceptance: User can view document and comments simultaneously; panes are resizable

2. **Document Viewer**
   - Description: Display uploaded documents (PDF, PNG, JPG) with zoom/pan controls
   - Acceptance: Documents render correctly; users can zoom in/out and navigate multi-page PDFs

3. **Comment Thread System**
   - Description: Users can create, read, update, delete comments on documents
   - Acceptance: Comments persist to database; multiple users can comment; timestamps and author info display

4. **Review Status Workflow**
   - Description: Track document review status (pending → in review → approved/rejected)
   - Acceptance: Status updates via API; UI reflects current status

5. **Project Integration**
   - Description: Review interface accessible from project file list
   - Acceptance: Clicking a document in project files opens review interface with correct document loaded

### Edge Cases

1. **Large Documents** - Implement pagination or lazy loading for documents >100 pages
2. **Concurrent Editing** - Handle optimistic updates; show conflicts if two users comment simultaneously
3. **Deleted Documents** - Gracefully handle if underlying file is deleted while review is open
4. **Empty Comment State** - Show helpful empty state when no comments exist yet
5. **Permission Denied** - Handle cases where user doesn't have access to project or document

## Implementation Notes

### DO
- Use the existing file API (`/api/v1/projects/{project_id}/files/{file_id}`) to fetch document metadata
- Follow the SQLAlchemy async pattern used throughout the backend
- Leverage MUI's `Box`, `Grid`, and `Paper` components for layout
- Implement optimistic UI updates for comment submission
- Add loading states and error boundaries in React components
- Use the existing Firebase authentication system
- Create database indexes on `project_id` and `document_id` foreign keys
- Add `created_at`, `updated_at` timestamps to comment model
- Include soft delete capability (mark as deleted rather than hard delete)

### DON'T
- Don't create a new file upload system - use existing endpoints
- Don't hard-code document types - make viewer extensible for future formats
- Don't skip error handling for network failures
- Don't forget to add database migration before running code
- Don't implement real-time features without considering backend load

## Development Environment

### Start Services

```bash
# Terminal 1 - Backend
cd backend
source venv/bin/activate  # or test_env
uvicorn app.main:app --reload --port 8000

# Terminal 2 - Frontend
cd frontend
npm run dev

# Terminal 3 - Database (if not using Docker)
# Ensure PostgreSQL is running

# Optional: Run with Docker Compose
docker-compose up db redis backend frontend
```

### Service URLs
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs
- Database: postgresql://localhost:5432/builder_db

### Required Environment Variables

**Backend (.env):**
- `DATABASE_URL`: postgresql+asyncpg://localhost:5432/builder_db
- `STORAGE_TYPE`: local (or s3)
- `LOCAL_STORAGE_PATH`: ./uploads
- `FIREBASE_CREDENTIALS_PATH`: <path to Firebase creds>

**Frontend (.env.local):**
- `NEXT_PUBLIC_API_URL`: http://localhost:8000/api/v1

## Success Criteria

The task is complete when:

1. [ ] Split-view interface is accessible from project document list
2. [ ] Documents render correctly (PDF and image formats)
3. [ ] Users can create comments via UI and they persist to database
4. [ ] Users can edit and delete their own comments
5. [ ] Comments display author name and timestamp
6. [ ] Review status can be updated (pending/approved/rejected)
7. [ ] No console errors in browser or server logs
8. [ ] Existing tests still pass
9. [ ] New functionality verified via browser testing
10. [ ] Database migration runs successfully

## QA Acceptance Criteria

**CRITICAL**: These criteria must be verified by the QA Agent before sign-off.

### Unit Tests

| Test | File | What to Verify |
|------|------|----------------|
| Comment CRUD operations | `backend/tests/api/v1/test_document_reviews.py` | Create, read, update, delete comments via API |
| Comment validation | `backend/tests/schemas/test_document_review_schemas.py` | Pydantic schemas validate correctly; required fields enforced |
| Database model relationships | `backend/tests/models/test_document_review_models.py` | Foreign keys, cascades, relationships work correctly |
| Component rendering | `frontend/__tests__/components/DocumentReviewPanel.test.tsx` | Split view renders; comments list displays |

### Integration Tests

| Test | Services | What to Verify |
|------|----------|----------------|
| End-to-end comment flow | frontend ↔ backend | Comment created in UI appears in database and re-fetches correctly |
| File retrieval integration | frontend ↔ backend | Document loads via existing file API without errors |
| Authentication flow | frontend ↔ backend | Only authenticated users can create comments; permissions respected |
| Multi-user scenario | frontend ↔ backend | Two users can comment on same document concurrently |

### End-to-End Tests

| Flow | Steps | Expected Outcome |
|------|-------|------------------|
| Document review workflow | 1. Navigate to project files<br>2. Click document<br>3. Review interface opens<br>4. Add comment<br>5. Update review status | Document displays, comment saves and appears in list, status updates |
| Comment thread | 1. User A adds comment<br>2. User B views document<br>3. User B replies to comment | User B sees User A's comment with correct metadata |
| Edit/delete comment | 1. User creates comment<br>2. User edits comment text<br>3. User deletes comment | Changes persist; deleted comment no longer appears |

### Browser Verification

| Page/Component | URL | Checks |
|----------------|-----|--------|
| Document Review Interface | `http://localhost:3000/projects/{id}/documents/{documentId}/review` | - Split view renders correctly<br>- Document displays in left pane<br>- Comments panel on right<br>- No layout breaking/overflow |
| Comment Creation | (same as above) | - Comment form submits successfully<br>- New comment appears in list immediately<br>- Timestamp and author show correctly |
| Responsive Layout | (same as above) | - Layout adapts to window resize<br>- Splitter can be dragged to resize panes |

### Database Verification

| Check | Query/Command | Expected |
|-------|---------------|----------|
| Migration applied | `alembic current` | Migration shows in version history |
| Tables created | `psql -d builder_db -c "\dt"` | `document_reviews`, `document_comments` tables exist |
| Comment persisted | `SELECT * FROM document_comments WHERE id=<test_id>` | Comment data matches what was submitted via UI |
| Foreign key constraints | Attempt to create comment with invalid document_id | Database rejects with FK constraint error |

### API Verification

| Endpoint | Method | Test Case | Expected |
|----------|--------|-----------|----------|
| `/api/v1/projects/{id}/documents/{docId}/comments` | GET | Fetch all comments for a document | Returns 200 with array of comments |
| `/api/v1/projects/{id}/documents/{docId}/comments` | POST | Create new comment | Returns 201 with created comment object |
| `/api/v1/comments/{id}` | PUT | Update existing comment | Returns 200 with updated comment |
| `/api/v1/comments/{id}` | DELETE | Delete comment | Returns 204; comment no longer in DB |
| `/api/v1/projects/{id}/documents/{docId}/review-status` | PATCH | Update review status | Returns 200 with updated status |

### QA Sign-off Requirements
- [ ] All unit tests pass (backend and frontend)
- [ ] All integration tests pass
- [ ] All E2E tests pass
- [ ] Browser verification complete - no visual bugs
- [ ] Database state verified - migrations applied, data persists
- [ ] API endpoints tested - all return correct responses
- [ ] No regressions in existing file management functionality
- [ ] Code follows established patterns (FastAPI async, MUI styling)
- [ ] No security vulnerabilities introduced (SQL injection, XSS, CSRF)
- [ ] Performance acceptable - page loads <2s, comments submit <500ms
- [ ] Error handling verified - network failures, validation errors display properly

## Additional Considerations

### Performance
- Implement pagination for comment lists (default 50 per page)
- Use `React.memo` for comment components to prevent unnecessary re-renders
- Consider caching document metadata to reduce API calls

### Security
- Validate user permissions before allowing comment CRUD operations
- Sanitize comment content to prevent XSS attacks
- Implement rate limiting on comment creation endpoint (max 10/minute per user)

### Accessibility
- Ensure keyboard navigation works in split view
- Add ARIA labels to interactive elements
- Support screen readers for comment content

### Future Enhancements (Not in Scope)
- @mentions in comments to notify specific users
- Rich text formatting in comments
- Attachment support for comment replies
- Annotation tools (highlight, draw on document)
- Export comments to PDF report
