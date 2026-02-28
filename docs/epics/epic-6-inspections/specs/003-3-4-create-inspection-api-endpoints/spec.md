# Specification: Create Inspection API Endpoints

## Overview

Create a comprehensive inspection management system API for the builder project. This feature implements a three-tier architecture: admin-level consultant type templates with stage definitions, project-scoped inspection instances tied to specific projects, and dashboard analytics. The system follows existing project patterns for project-scoped resources with CRUD operations, audit logging, and hierarchical relationships between templates and instances.

## Workflow Type

**Type**: feature

**Rationale**: This task introduces entirely new API endpoints for a new domain entity (inspections) with multiple models, schemas, and relationships. It requires database migrations, new business logic for inspection workflows, and integration with existing project and approval systems. This is a substantial feature addition rather than a refactor or bug fix.

## Task Scope

### Services Involved
- **backend** (primary) - FastAPI service where new inspection endpoints will be created
- **frontend** (integration) - Will consume the new inspection APIs (future task)

### This Task Will:
- [ ] Create database models for InspectionConsultantType, InspectionStage, Inspection, and Finding
- [ ] Create Pydantic schemas for all inspection-related request/response models
- [ ] Implement 13 FastAPI endpoints across three categories (admin, project, dashboard)
- [ ] Add router registration for inspection endpoints in `app/api/v1/router.py`
- [ ] Create Alembic migration for inspection-related database tables
- [ ] Implement audit logging for all create/update/delete operations
- [ ] Add validation for inspection workflows (stage progression, status transitions)

### Out of Scope:
- Frontend UI components for inspections
- Real-time notifications for inspection updates
- File attachments for findings (will use existing file system)
- Automated inspection scheduling/reminders
- Integration with external inspection systems

## Service Context

### Backend

**Tech Stack:**
- Language: Python 3.x
- Framework: FastAPI
- ORM: SQLAlchemy (async)
- Database: PostgreSQL
- Migrations: Alembic
- Authentication: JWT (python-jose)
- Key directories: `app/` (application code)

**Entry Point:** `app/main.py`

**How to Run:**
```bash
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Port:** 8000

**API Documentation:** http://localhost:8000/api/v1/docs

## Files to Modify

| File | Service | What to Change |
|------|---------|---------------|
| `backend/app/api/v1/inspections.py` | backend | Create new file with all 13 inspection endpoints |
| `backend/app/api/v1/router.py` | backend | Add inspections router registration |
| `backend/app/models/inspection.py` | backend | Create new models: InspectionConsultantType, InspectionStage, Inspection, Finding |
| `backend/app/schemas/inspection.py` | backend | Create new schemas for all CRUD operations and responses |
| `alembic/versions/XXX_add_inspection_tables.py` | backend | Create migration for inspection tables |

## Files to Reference

These files show patterns to follow:

| File | Pattern to Copy |
|------|----------------|
| `backend/app/api/v1/equipment.py` | Project-scoped CRUD endpoints with nested resources and status workflow |
| `backend/app/api/v1/contacts.py` | Simple project-scoped CRUD pattern with audit logging |
| `backend/app/api/v1/meetings.py` | Project-scoped resource with nested entities (attendees pattern for findings) |
| `backend/app/models/equipment.py` | Model with status enum, JSONB fields, and relationships |
| `backend/app/schemas/contact.py` | Schema patterns for Create/Update/Response with validation |
| `backend/app/core/security.py` | Authentication dependency pattern with get_current_user |

## Patterns to Follow

### Pattern 1: Project-Scoped CRUD Endpoints

From `backend/app/api/v1/contacts.py`:

```python
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.models.user import User
from app.core.security import get_current_user

router = APIRouter()

@router.get("/projects/{project_id}/contacts", response_model=list[ContactResponse])
async def list_contacts(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Contact)
        .where(Contact.project_id == project_id)
        .order_by(Contact.created_at.desc())
    )
    return result.scalars().all()
```

**Key Points:**
- Use UUID for all IDs
- Async/await with AsyncSession
- Dependency injection for db and current_user
- SQLAlchemy select statements with filters

### Pattern 2: Audit Logging for All Mutations

From `backend/app/api/v1/equipment.py`:

```python
from app.services.audit_service import create_audit_log, get_model_dict
from app.models.audit import AuditAction

@router.post("/projects/{project_id}/equipment", response_model=EquipmentResponse)
async def create_equipment(
    project_id: UUID,
    data: EquipmentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    equipment = Equipment(**data.model_dump(), project_id=project_id, created_by_id=current_user.id)
    db.add(equipment)
    await db.flush()

    await create_audit_log(db, current_user, "equipment", equipment.id, AuditAction.CREATE,
                          project_id=project_id, new_values=get_model_dict(equipment))

    await db.refresh(equipment, ["created_by"])
    return equipment
```

**Key Points:**
- Call create_audit_log after db.flush() for CREATE/UPDATE/DELETE
- Use get_model_dict() to capture old/new values
- Include project_id in audit logs for project-scoped entities

### Pattern 3: Model Definition with Relationships

From `backend/app/models/equipment.py`:

```python
import uuid
from datetime import datetime
from enum import Enum
from sqlalchemy import String, Text, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.session import Base

class ApprovalStatus(str, Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    APPROVED = "approved"

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
- Use CASCADE delete for project relationships
- Define bidirectional relationships

### Pattern 4: Pydantic Schemas with Validation

From `backend/app/schemas/contact.py`:

```python
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field
from app.core.validators import CamelCaseModel

class ContactBase(BaseModel):
    contact_name: str = Field(min_length=1, max_length=255)
    company_name: str | None = Field(default=None, max_length=255)
    role_description: str | None = None

class ContactCreate(ContactBase):
    pass

class ContactUpdate(BaseModel):
    contact_name: str | None = Field(default=None, min_length=1, max_length=255)
    company_name: str | None = None
    role_description: str | None = None

class ContactResponse(CamelCaseModel):
    id: UUID
    project_id: UUID
    contact_name: str
    company_name: str | None = None
    created_at: datetime
```

**Key Points:**
- Base schema for shared fields
- Create schema extends Base (all required)
- Update schema has all optional fields
- Response schema uses CamelCaseModel for frontend compatibility

### Pattern 5: Nested Resource Management

From `backend/app/api/v1/meetings.py` (attendees pattern):

```python
@router.post("/projects/{project_id}/meetings/{meeting_id}/attendees")
async def add_attendee(
    project_id: UUID,
    meeting_id: UUID,
    data: AttendeeCreate,
    db: AsyncSession = Depends(get_db)
):
    attendee = MeetingAttendee(meeting_id=meeting_id, user_id=data.user_id)
    db.add(attendee)
    await db.flush()
    await db.refresh(attendee, ["user"])
    return attendee
```

**Key Points:**
- Nested endpoints for sub-resources (findings under inspections)
- Parent ID in path + child data in body
- Eager load relationships with db.refresh()

## Requirements

### Functional Requirements

#### FR1: Admin Template Management

**Description**: Administrators can create and manage consultant type templates with predefined inspection stages.

**Endpoints**:
- `GET /inspection-consultant-types` - List all consultant types with their stages
- `POST /inspection-consultant-types` - Create new consultant type
- `GET /inspection-consultant-types/{id}` - Get consultant type with all stages
- `POST /inspection-consultant-types/{id}/stages` - Add stage template to consultant type

**Acceptance**:
- Admin can create consultant types (e.g., "Structural Engineer", "MEP Inspector")
- Each type can have multiple ordered stages (e.g., "Initial Review", "On-Site Inspection")
- Stages include: name, description, order, required_documentation fields
- Templates are reusable across multiple projects

#### FR2: Project Inspection Lifecycle

**Description**: Users can schedule inspections from templates, track progress through stages, and mark them complete.

**Endpoints**:
- `GET /projects/{project_id}/inspections` - List all inspections for a project
- `GET /projects/{project_id}/inspections/pending` - List pending inspections only
- `POST /projects/{project_id}/inspections` - Schedule new inspection from template
- `GET /projects/{project_id}/inspections/{id}` - Get inspection details with findings
- `PUT /projects/{project_id}/inspections/{id}` - Update inspection (stage, status, notes)
- `POST /projects/{project_id}/inspections/{id}/complete` - Mark inspection complete

**Acceptance**:
- Inspections created from consultant type templates
- Track: scheduled_date, completed_date, current_stage, status (pending/in_progress/completed/failed)
- Filter inspections by status (pending endpoint)
- Update inspection stage and status
- Completion workflow validates all required stages passed

#### FR3: Findings Management

**Description**: Users can add and manage findings during inspections.

**Endpoints**:
- `POST /projects/{project_id}/inspections/{id}/findings` - Add finding to inspection
- `PUT /inspections/findings/{finding_id}` - Update existing finding

**Acceptance**:
- Findings attached to specific inspections
- Fields: title, description, severity (low/medium/high/critical), status (open/resolved), location, photos (JSON array)
- Users can update finding status and details
- Findings displayed with inspection details

#### FR4: Dashboard Analytics

**Description**: Provide summary view of inspection progress across a project.

**Endpoints**:
- `GET /projects/{project_id}/inspections/summary` - Inspection progress summary

**Acceptance**:
- Returns: total inspections, pending count, in-progress count, completed count, failed count
- Groups findings by severity
- Shows overdue inspections (scheduled_date < today && status != completed)

### Edge Cases

1. **Deleting Consultant Type with Active Inspections** - Prevent deletion or cascade with warning
2. **Completing Inspection with Open Critical Findings** - Allow but log warning in audit
3. **Invalid Stage Progression** - Validate stage order when updating inspection
4. **Duplicate Inspection Scheduling** - Allow multiple inspections of same type for same project
5. **Empty Findings** - Inspection can be completed without findings (optional)
6. **Past Scheduled Dates** - Allow scheduling inspections in the past for record-keeping

## Implementation Notes

### DO
- Follow the project-scoped pattern from `contacts.py` for all project inspection endpoints
- Use the nested resource pattern from `meetings.py` for findings management
- Implement status enum similar to `ApprovalStatus` in equipment.py for inspection status
- Add audit logging for all CREATE/UPDATE/DELETE operations using `create_audit_log`
- Use `selectinload` for eager loading of relationships (consultant_type, stages, findings, created_by)
- Validate required fields in Pydantic schemas with Field() constraints
- Return proper HTTP status codes (200, 201, 404, 400)
- Add CASCADE delete on project foreign keys
- Use JSONB for flexible fields like photos array and required_documentation

### DON'T
- Don't skip audit logging - it's required for all mutations
- Don't use synchronous database calls - always use async/await
- Don't create custom authentication - use existing `get_current_user` dependency
- Don't forget to refresh entities with relationships after db operations
- Don't allow orphaned findings - use CASCADE delete
- Don't expose internal IDs to frontend - UUIDs are fine
- Don't skip validation on Update schemas - validate even optional fields
- Don't forget to register the router in `app/api/v1/router.py`

## Development Environment

### Start Services

```bash
# Start all services
docker-compose up -d

# Or start backend only
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Create migration after adding models
cd backend
alembic revision --autogenerate -m "Add inspection tables"

# Apply migration
alembic upgrade head
```

### Service URLs
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/api/v1/docs
- PostgreSQL: localhost:5432

### Required Environment Variables
- `DATABASE_URL`: PostgreSQL connection string
- `SECRET_KEY`: JWT secret key
- `CORS_ORIGINS`: Allowed CORS origins

## Success Criteria

The task is complete when:

1. [ ] All 13 endpoints are implemented and return correct responses
2. [ ] Database models created with proper relationships and constraints
3. [ ] Alembic migration successfully creates all inspection tables
4. [ ] All endpoints appear in OpenAPI docs at /api/v1/docs
5. [ ] Audit logs created for all create/update/delete operations
6. [ ] Pydantic validation works for all request schemas
7. [ ] Router registered in `app/api/v1/router.py`
8. [ ] No console errors or warnings during endpoint calls
9. [ ] Relationships properly loaded (consultant types with stages, inspections with findings)
10. [ ] Status transitions validated (can't complete without valid progression)

## QA Acceptance Criteria

**CRITICAL**: These criteria must be verified by the QA Agent before sign-off.

### Unit Tests

| Test | File | What to Verify |
|------|------|----------------|
| Model relationships | `tests/models/test_inspection.py` | Verify cascade deletes, relationship loading, and foreign key constraints |
| Schema validation | `tests/schemas/test_inspection.py` | Test required fields, optional fields in Update schemas, field length limits |
| Enum values | `tests/models/test_inspection.py` | Verify InspectionStatus enum values accepted |

### Integration Tests

| Test | Services | What to Verify |
|------|----------|----------------|
| Admin template endpoints | backend ↔ database | Create consultant type, add stages, retrieve with stages |
| Project inspection CRUD | backend ↔ database | Create inspection from template, list, filter by status, update, complete |
| Findings management | backend ↔ database | Add findings to inspection, update findings, retrieve with inspection |
| Audit logging | backend ↔ database | Verify audit logs created for all mutations |
| Authentication | backend | Endpoints require valid JWT except GET endpoints |

### End-to-End Tests

| Flow | Steps | Expected Outcome |
|------|-------|------------------|
| Create Inspection Template | 1. POST consultant type 2. POST stages to type 3. GET type with stages | Template created with ordered stages |
| Schedule and Complete Inspection | 1. POST inspection from template 2. GET pending inspections 3. PUT update stage 4. POST findings 5. POST complete | Inspection lifecycle tracked, findings attached |
| Dashboard Summary | 1. Create multiple inspections with different statuses 2. GET summary | Correct counts by status, overdue flagged |

### API Verification

| Endpoint | Method | Checks |
|----------|--------|--------|
| `/inspection-consultant-types` | GET | Returns array, includes stages, ordered correctly |
| `/inspection-consultant-types` | POST | Creates type, returns 201, validates required fields |
| `/inspection-consultant-types/{id}` | GET | Returns single type with stages, 404 if not found |
| `/inspection-consultant-types/{id}/stages` | POST | Adds stage, validates order field, returns 201 |
| `/projects/{project_id}/inspections` | GET | Returns project inspections, includes consultant_type |
| `/projects/{project_id}/inspections/pending` | GET | Filters to pending only, excludes completed/failed |
| `/projects/{project_id}/inspections` | POST | Creates from template, validates project_id, returns 201 |
| `/projects/{project_id}/inspections/{id}` | GET | Returns with findings array, 404 if not found |
| `/projects/{project_id}/inspections/{id}` | PUT | Updates fields, validates status transitions |
| `/projects/{project_id}/inspections/{id}/complete` | POST | Sets completed status and date, returns 200 |
| `/projects/{project_id}/inspections/{id}/findings` | POST | Adds finding, validates severity enum |
| `/inspections/findings/{finding_id}` | PUT | Updates finding, validates status enum |
| `/projects/{project_id}/inspections/summary` | GET | Returns correct counts, groups findings by severity |

### Database Verification

| Check | Query/Command | Expected |
|-------|---------------|----------|
| Tables exist | `\dt` in psql | inspection_consultant_types, inspection_stages, inspections, findings |
| Foreign keys | Check constraints | project_id → projects.id (CASCADE), consultant_type_id → consultant_types.id |
| Indexes | Check indexes | Primary keys, foreign keys indexed |
| Migration applied | `alembic current` | Shows latest migration with inspection tables |
| Cascade deletes | Delete project with inspections | Inspections and findings deleted |

### QA Sign-off Requirements
- [ ] All 13 endpoints respond correctly with valid data
- [ ] All integration tests pass
- [ ] Database migration runs without errors
- [ ] Audit logs verified in database after mutations
- [ ] Relationship loading works (no N+1 queries)
- [ ] No regressions in existing endpoints (equipment, contacts, meetings)
- [ ] Code follows established patterns (async, dependencies, schemas)
- [ ] OpenAPI documentation generated correctly
- [ ] Authentication enforced where required
- [ ] Status transition validation works correctly
- [ ] Cascade deletes work as expected
- [ ] No SQL errors or warnings in logs
