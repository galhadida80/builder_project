# Specification: Equipment Template API Endpoints

## Overview

This task creates a comprehensive FastAPI-based API for managing equipment templates, submissions, and approval decisions. Equipment templates are reusable specifications that define standard equipment configurations for construction projects. The system allows administrators to create and manage templates, project members to submit equipment based on templates, and reviewers to make approval decisions on submissions. This follows the existing approval workflow pattern used for materials and equipment in the application.

## Workflow Type

**Type**: feature

**Rationale**: This is a new feature implementation that adds equipment template management capabilities to the existing construction management system. It introduces new API endpoints, database models, and business logic while integrating with existing approval and audit systems.

## Task Scope

### Services Involved
- **backend** (primary) - FastAPI service that will host the new equipment template endpoints

### This Task Will:
- [ ] Create database models for equipment templates, submissions, and decisions
- [ ] Create Pydantic schemas for request/response validation
- [ ] Implement 12 REST API endpoints across 3 resource groups
- [ ] Add admin role-based access control for template management
- [ ] Integrate with existing approval workflow system
- [ ] Add audit logging for all CRUD operations
- [ ] Create database migration for new models
- [ ] Register new router in API v1 router
- [ ] Write unit tests for all endpoints
- [ ] Test integration with existing approval system

### Out of Scope:
- Frontend UI components for equipment templates
- Email notifications for approval decisions
- Template versioning or history tracking
- Template import/export functionality
- Advanced template validation rules
- Template categories or tagging system

## Service Context

### Backend Service

**Tech Stack:**
- Language: Python 3.11+
- Framework: FastAPI
- ORM: SQLAlchemy (async)
- Database: PostgreSQL
- Migrations: Alembic
- Authentication: JWT (python-jose)
- Validation: Pydantic

**Key Directories:**
- `app/` - Application code
- `app/api/v1/` - API endpoint routers
- `app/models/` - SQLAlchemy database models
- `app/schemas/` - Pydantic validation schemas
- `app/core/` - Core utilities (security, config)
- `app/services/` - Business logic services
- `alembic/versions/` - Database migrations

**Entry Point:** `app/main.py`

**How to Run:**
```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

**Port:** 8000

**API Documentation:** http://localhost:8000/api/v1/docs

## Files to Modify

| File | Service | What to Change |
|------|---------|---------------|
| `backend/app/api/v1/equipment_templates.py` | backend | **CREATE NEW FILE** - Implement all 12 API endpoints |
| `backend/app/api/v1/router.py` | backend | Import and register equipment_templates router |
| `backend/app/models/equipment_template.py` | backend | **CREATE NEW FILE** - Define EquipmentTemplate model |
| `backend/app/models/equipment_submission.py` | backend | **CREATE NEW FILE** - Define EquipmentSubmission model |
| `backend/app/models/approval_decision.py` | backend | **CREATE NEW FILE** - Define ApprovalDecision model |
| `backend/app/schemas/equipment_template.py` | backend | **CREATE NEW FILE** - Pydantic schemas for templates |
| `backend/app/schemas/equipment_submission.py` | backend | **CREATE NEW FILE** - Pydantic schemas for submissions |
| `backend/app/schemas/approval_decision.py` | backend | **CREATE NEW FILE** - Pydantic schemas for decisions |
| `backend/app/core/security.py` | backend | Add `get_current_admin_user` dependency function |
| `backend/alembic/versions/004_add_equipment_templates.py` | backend | **CREATE NEW FILE** - Database migration |

## Files to Reference

These files show patterns to follow:

| File | Pattern to Copy |
|------|----------------|
| `backend/app/api/v1/equipment.py` | CRUD endpoint structure, project-scoped resources, audit logging |
| `backend/app/api/v1/materials.py` | Resource listing, creation patterns, submission workflow |
| `backend/app/api/v1/approvals.py` | Approval workflow integration, decision processing |
| `backend/app/models/equipment.py` | SQLAlchemy model structure, relationships, ApprovalStatus enum |
| `backend/app/models/approval.py` | ApprovalRequest and ApprovalStep models |
| `backend/app/schemas/equipment.py` | Pydantic schema patterns, validation, CamelCaseModel |
| `backend/app/core/security.py` | Authentication dependency patterns |

## Patterns to Follow

### 1. Router Structure Pattern

From `backend/app/api/v1/equipment.py`:

```python
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.db.session import get_db
from app.core.security import get_current_user
from app.models.user import User

router = APIRouter()

@router.get("/resource", response_model=list[ResourceResponse])
async def list_resources(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Resource)
        .options(selectinload(Resource.created_by))
        .order_by(Resource.created_at.desc())
    )
    return result.scalars().all()
```

**Key Points:**
- Use AsyncSession for database operations
- Use selectinload() for eager loading relationships
- Return response_model for Pydantic validation
- Follow async/await pattern consistently

### 2. CRUD Operations with Audit Logging

From `backend/app/api/v1/equipment.py`:

```python
from app.services.audit_service import create_audit_log, get_model_dict
from app.models.audit import AuditAction

@router.post("/projects/{project_id}/resource", response_model=ResourceResponse)
async def create_resource(
    project_id: UUID,
    data: ResourceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    resource = Resource(**data.model_dump(), project_id=project_id, created_by_id=current_user.id)
    db.add(resource)
    await db.flush()

    await create_audit_log(db, current_user, "resource", resource.id, AuditAction.CREATE,
                          project_id=project_id, new_values=get_model_dict(resource))

    await db.refresh(resource, ["created_by"])
    return resource
```

**Key Points:**
- Always log CREATE, UPDATE, DELETE operations
- Use db.flush() before audit logging to get generated IDs
- Use db.refresh() to load relationships before returning
- Track old_values and new_values for updates

### 3. Project-Scoped Resources

From `backend/app/api/v1/equipment.py`:

```python
@router.get("/projects/{project_id}/equipment", response_model=list[EquipmentResponse])
async def list_equipment(project_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Equipment)
        .where(Equipment.project_id == project_id)
        .order_by(Equipment.created_at.desc())
    )
    return result.scalars().all()
```

**Key Points:**
- Equipment submissions are scoped to projects
- Always filter by project_id in queries
- Path parameter: `/projects/{project_id}/equipment-submissions`

### 4. SQLAlchemy Model Structure

From `backend/app/models/equipment.py`:

```python
import uuid
from datetime import datetime
from sqlalchemy import String, Text, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.session import Base

class Equipment(Base):
    __tablename__ = "equipment"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default=ApprovalStatus.DRAFT.value)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))

    project = relationship("Project", back_populates="equipment")
    created_by = relationship("User", foreign_keys=[created_by_id])
```

**Key Points:**
- Use UUID primary keys with uuid.uuid4 default
- Add created_at/updated_at timestamps
- Include created_by_id foreign key
- Use CASCADE delete for project relationships
- Define relationships for eager loading

### 5. Pydantic Schema Pattern

From `backend/app/schemas/equipment.py`:

```python
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field, field_validator
from app.core.validators import sanitize_string, MIN_NAME_LENGTH, MAX_NAME_LENGTH, CamelCaseModel

class ResourceBase(BaseModel):
    name: str = Field(min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)
    description: str | None = Field(default=None, max_length=MAX_NOTES_LENGTH)

    @field_validator('name', 'description', mode='before')
    @classmethod
    def sanitize_text(cls, v: str | None) -> str | None:
        return sanitize_string(v)

class ResourceCreate(ResourceBase):
    pass

class ResourceUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)

class ResourceResponse(CamelCaseModel):
    id: UUID
    name: str
    created_at: datetime
    updated_at: datetime
    created_by: UserResponse | None = None
```

**Key Points:**
- Use CamelCaseModel for responses (converts snake_case to camelCase)
- Sanitize all string inputs with field_validator
- Create separate schemas for Create, Update, Response
- Use Field() for validation constraints

### 6. Admin Access Control

New pattern to implement in `backend/app/core/security.py`:

```python
async def get_current_admin_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """Dependency to verify user is an admin"""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user
```

**Key Points:**
- Chain dependencies: get_current_admin_user depends on get_current_user
- Check user.role == "admin"
- Return 403 Forbidden for non-admin users
- Use this dependency for all template management endpoints

## Requirements

### Functional Requirements

#### 1. Equipment Template Management (Admin Only)

**Endpoints:**
- `GET /equipment-templates` - List all templates
- `POST /equipment-templates` - Create new template
- `GET /equipment-templates/{id}` - Get template details
- `PUT /equipment-templates/{id}` - Update template
- `DELETE /equipment-templates/{id}` - Delete template

**Description:**
Administrators can create reusable equipment templates that define standard equipment specifications. Templates include fields like name, category, specifications (JSONB), and default values.

**Acceptance:**
- All endpoints return 403 for non-admin users
- List returns all templates ordered by created_at desc
- Create validates required fields and logs audit entry
- Update tracks old/new values in audit log
- Delete prevents deletion if template has active submissions

#### 2. Equipment Submissions (Project-Scoped)

**Endpoints:**
- `GET /projects/{project_id}/equipment-submissions` - List project submissions
- `POST /projects/{project_id}/equipment-submissions` - Create submission from template
- `GET /projects/{project_id}/equipment-submissions/{id}` - Get submission details
- `PUT /projects/{project_id}/equipment-submissions/{id}` - Update submission
- `DELETE /projects/{project_id}/equipment-submissions/{id}` - Delete submission

**Description:**
Project members create equipment submissions based on templates. Submissions are linked to a specific project and template, with customizable fields and approval status tracking.

**Acceptance:**
- Submissions are filtered by project_id
- Create requires valid template_id
- Submissions start with status="draft"
- GET includes template and approval request relationships
- Update only allowed for draft/revision_requested status
- Delete prevents deletion if status is approved

#### 3. Approval Decisions

**Endpoints:**
- `POST /equipment-submissions/{id}/decisions` - Add approval decision
- `GET /equipment-submissions/{id}/decisions` - List all decisions

**Description:**
Reviewers add approval decisions (approve/reject/request revision) to equipment submissions. Decisions are recorded with comments and timestamps.

**Acceptance:**
- POST creates ApprovalDecision record linked to submission
- Decision updates submission status automatically
- GET returns decisions ordered by created_at
- Audit log created for each decision
- Only authorized reviewers can add decisions

### Edge Cases

1. **Template Deletion with Active Submissions** - Prevent deletion if any submissions reference the template; return 400 with clear error message
2. **Submission Update After Approval** - Prevent updates to approved submissions; return 400 with "Cannot modify approved submission"
3. **Concurrent Decision Creation** - Use database constraints to prevent multiple decisions from same user on same submission
4. **Invalid Template Reference** - Return 404 if template_id doesn't exist when creating submission
5. **Project Access Control** - Verify user has access to project before allowing submission operations
6. **Empty Template List** - Return empty array (not 404) when no templates exist
7. **Malformed UUID** - FastAPI handles this automatically with 422 validation error

## Implementation Notes

### DO
- Follow the exact pattern from `equipment.py` for CRUD operations
- Use `selectinload()` to eager-load relationships (template, created_by, decisions)
- Add audit logging for ALL state changes (create, update, delete, status changes)
- Use the existing `ApprovalStatus` enum from `app.models.equipment` (don't recreate)
- Validate that template exists before creating submission (use foreign key constraint)
- Return 404 with descriptive messages for resource not found errors
- Use JSONB column type for flexible template specifications
- Chain security dependencies: `get_current_admin_user` → `get_current_user`
- Register router with tags: `api_router.include_router(equipment_templates.router, tags=["equipment-templates"])`
- Create migration with descriptive name: `004_add_equipment_templates`

### DON'T
- Don't create a new approval system - integrate with existing ApprovalRequest/ApprovalStep models
- Don't implement complex cascade deletes - use simple foreign key constraints
- Don't add business logic to models - keep models as pure data structures
- Don't skip audit logging - it's required for compliance
- Don't use synchronous database operations - all must be async
- Don't return raw SQLAlchemy models - always use Pydantic response schemas
- Don't implement role-based permissions beyond admin check (future enhancement)
- Don't add custom validation beyond Pydantic field validators

## Development Environment

### Start Services

```bash
# Start all services
docker-compose up -d

# Start only backend
cd backend
uvicorn app.main:app --reload --port 8000

# Create migration
cd backend
alembic revision --autogenerate -m "Add equipment template models"

# Apply migration
alembic upgrade head

# Run tests
cd backend
pytest tests/api/v1/test_equipment_templates.py -v
```

### Service URLs
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/api/v1/docs
- Database: postgresql://localhost:5432

### Required Environment Variables
```
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/builder_db
SECRET_KEY=<jwt-secret-key>
```

## Success Criteria

The task is complete when:

1. [ ] All 12 API endpoints are implemented and return correct responses
2. [ ] Admin-only endpoints return 403 for non-admin users
3. [ ] Database models created with proper relationships
4. [ ] Migration created and applies without errors
5. [ ] Router registered in v1 API router
6. [ ] Audit logs created for all CRUD operations
7. [ ] Pydantic schemas validate request/response data
8. [ ] All endpoints documented in OpenAPI (automatic via FastAPI)
9. [ ] Integration with existing approval workflow works
10. [ ] Manual testing via Swagger UI successful
11. [ ] No console errors or warnings
12. [ ] Existing tests still pass

## QA Acceptance Criteria

**CRITICAL**: These criteria must be verified by the QA Agent before sign-off.

### Unit Tests
| Test | File | What to Verify |
|------|------|----------------|
| test_create_template_as_admin | `tests/api/v1/test_equipment_templates.py` | Admin can create template, returns 201 |
| test_create_template_as_user | `tests/api/v1/test_equipment_templates.py` | Non-admin gets 403 Forbidden |
| test_list_templates | `tests/api/v1/test_equipment_templates.py` | Returns all templates, correct schema |
| test_get_template_by_id | `tests/api/v1/test_equipment_templates.py` | Returns single template, 404 if not found |
| test_update_template | `tests/api/v1/test_equipment_templates.py` | Updates fields, audit log created |
| test_delete_template | `tests/api/v1/test_equipment_templates.py` | Deletes template, prevents if has submissions |
| test_create_submission | `tests/api/v1/test_equipment_templates.py` | Creates submission linked to template and project |
| test_list_submissions_by_project | `tests/api/v1/test_equipment_templates.py` | Returns only submissions for specified project |
| test_update_submission_draft | `tests/api/v1/test_equipment_templates.py` | Allows update when status is draft |
| test_update_submission_approved | `tests/api/v1/test_equipment_templates.py` | Prevents update when status is approved |
| test_add_approval_decision | `tests/api/v1/test_equipment_templates.py` | Creates decision, updates submission status |
| test_list_decisions | `tests/api/v1/test_equipment_templates.py` | Returns all decisions for submission |

### Integration Tests
| Test | Services | What to Verify |
|------|----------|----------------|
| Template to Submission Flow | backend + database | Create template → create submission → verify linkage |
| Submission to Approval Flow | backend + database | Create submission → add decision → verify status update |
| Admin Access Control | backend + auth | Admin endpoints require valid admin role |
| Audit Log Integration | backend + database | All operations create audit log entries |

### End-to-End Tests
| Flow | Steps | Expected Outcome |
|------|-------|------------------|
| Template Management | 1. Admin logs in 2. Creates template 3. Lists templates 4. Updates template | Template visible in list with updates |
| Submission Workflow | 1. User creates submission from template 2. Reviewer adds approval decision 3. Status updates to approved | Submission moves through workflow correctly |
| Permission Enforcement | 1. Regular user attempts to create template 2. User receives 403 | Non-admins blocked from template management |

### API Verification via Swagger UI
| Endpoint | URL | Checks |
|----------|-----|--------|
| List Templates | `GET http://localhost:8000/api/v1/equipment-templates` | Returns 200, array of templates |
| Create Template | `POST http://localhost:8000/api/v1/equipment-templates` | Returns 201 with created object, 403 if not admin |
| List Submissions | `GET http://localhost:8000/api/v1/projects/{project_id}/equipment-submissions` | Returns 200, filtered by project |
| Add Decision | `POST http://localhost:8000/api/v1/equipment-submissions/{id}/decisions` | Returns 201, updates submission status |

### Database Verification
| Check | Query/Command | Expected |
|-------|---------------|----------|
| Migration exists | `alembic history` | Shows 004_add_equipment_templates migration |
| Tables created | `\dt equipment_*` (psql) | equipment_templates, equipment_submissions, approval_decisions tables exist |
| Foreign keys | `\d equipment_submissions` | Shows FK to equipment_templates and projects |
| Indexes | `\d equipment_templates` | Has indexes on created_at, name |

### QA Sign-off Requirements
- [ ] All 12 unit tests pass
- [ ] All 4 integration tests pass
- [ ] All 3 E2E flows complete successfully
- [ ] Swagger UI verification complete for all endpoints
- [ ] Database migration applied cleanly
- [ ] Database tables and relationships verified
- [ ] No regressions in existing equipment or approval endpoints
- [ ] Admin access control verified (403 for non-admins)
- [ ] Audit logs verified for all operations
- [ ] No security vulnerabilities (SQL injection, XSS, etc.)
- [ ] Code follows FastAPI and SQLAlchemy best practices
- [ ] Response schemas use CamelCaseModel for frontend compatibility
