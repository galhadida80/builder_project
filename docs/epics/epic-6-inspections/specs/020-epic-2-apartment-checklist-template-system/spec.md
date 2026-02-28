# Specification: Apartment Checklist Template System

## Overview

Build a flexible, hierarchical checklist template system for apartment and building handover processes. The system will manage 325 checklist items across 5 different checklist types (internal protocols, tenant handovers, tenant files, floor lobbies, possession protocols) organized into 8 room/area categories. This will support construction project managers in standardizing inspection processes while allowing flexible, per-unit instantiation and response tracking.

## Workflow Type

**Type**: feature

**Rationale**: This is a new feature implementation that requires creating new database models, API endpoints, and Pydantic schemas from scratch. It follows the existing codebase patterns for CRUD operations and introduces a new hierarchical data structure to support template-based checklist management. The implementation will be built incrementally with backend models and APIs as the foundation.

## Task Scope

### Services Involved
- **backend** (primary) - Database models, API endpoints, Pydantic schemas, migrations
- **frontend** (future phase) - Not included in this implementation phase

### This Task Will:
- [x] Create 5 database models: ChecklistTemplate, ChecklistSubSection, ChecklistItemTemplate, ChecklistInstance, ChecklistItemResponse
- [x] Implement Pydantic schemas with JSONB fields for flexible attributes
- [x] Build full CRUD API endpoints for all checklist entities
- [x] Create Alembic migration for new database tables
- [x] Support Hebrew text throughout the system
- [x] Enable hierarchical relationships: Template → SubSection → ItemTemplate → Instance → ItemResponse
- [x] Support metadata flags (must_image, must_note, must_signature) on checklist items
- [x] Implement audit logging for all checklist operations

### Out of Scope:
- Frontend UI implementation (separate task)
- Excel import functionality (separate task)
- File attachment implementation for checklist responses (uses existing File model)
- Approval workflow integration (future enhancement)
- Real-time collaboration features
- Mobile app implementation

## Service Context

### Backend

**Tech Stack:**
- Language: Python 3.11+
- Framework: FastAPI
- ORM: SQLAlchemy (async)
- Validation: Pydantic v2
- Database: PostgreSQL with JSONB support
- Migrations: Alembic
- Key directories: backend/app

**Entry Point:** `backend/app/main.py`

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
| `backend/app/models/checklist.py` | backend | **CREATE NEW** - Define 5 SQLAlchemy models with relationships |
| `backend/app/schemas/checklist.py` | backend | **CREATE NEW** - Define Pydantic schemas for all models (Create, Update, Response) |
| `backend/app/api/v1/checklists.py` | backend | **CREATE NEW** - Implement CRUD endpoints for all checklist entities |
| `backend/app/api/v1/router.py` | backend | Add checklist router to api_router |
| `backend/app/models/__init__.py` | backend | Export new checklist models |
| `backend/alembic/versions/003_add_checklist_models.py` | backend | **CREATE NEW** - Migration for checklist tables |

## Files to Reference

These files show patterns to follow:

| File | Pattern to Copy |
|------|----------------|
| `backend/app/models/equipment.py` | SQLAlchemy model structure with UUID, JSONB fields, relationships, enums |
| `backend/app/models/material.py` | Model with project relationship and created_by pattern |
| `backend/app/schemas/equipment.py` | Pydantic schemas: Base/Create/Update/Response, CamelCaseModel, validators |
| `backend/app/api/v1/equipment.py` | FastAPI CRUD endpoints, async DB operations, audit logging, selectinload |
| `backend/app/api/v1/router.py` | Router registration pattern |
| `backend/alembic/versions/001_initial_tables.py` | Alembic migration structure |

## Patterns to Follow

### 1. SQLAlchemy Model Pattern

From `backend/app/models/equipment.py`:

```python
import uuid
from datetime import datetime
from enum import Enum
from sqlalchemy import String, Text, DateTime, ForeignKey, Integer, Boolean
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.session import Base

class ChecklistTemplate(Base):
    __tablename__ = "checklist_templates"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    level: Mapped[str] = mapped_column(String(50))  # e.g., "project"
    group: Mapped[str] = mapped_column(String(100))  # e.g., "מסירות"
    category: Mapped[str | None] = mapped_column(String(100))
    metadata: Mapped[dict | None] = mapped_column(JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))

    # Relationships
    project = relationship("Project", back_populates="checklist_templates")
    created_by = relationship("User", foreign_keys=[created_by_id])
    subsections = relationship("ChecklistSubSection", back_populates="template", cascade="all, delete-orphan")
```

**Key Points:**
- Always use UUID primary keys
- Use JSONB for flexible metadata fields
- Include created_at, updated_at timestamps
- Add created_by_id for audit trail
- Use ForeignKey with ondelete="CASCADE" for proper cleanup
- Define relationships with back_populates

### 2. Pydantic Schema Pattern

From `backend/app/schemas/equipment.py`:

```python
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field, field_validator
from app.core.validators import sanitize_string, MIN_NAME_LENGTH, MAX_NAME_LENGTH, CamelCaseModel

class ChecklistTemplateBase(BaseModel):
    name: str = Field(min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)
    level: str = Field(max_length=50)
    group: str = Field(max_length=100)
    category: str | None = Field(default=None, max_length=100)
    metadata: dict | None = None

    @field_validator('name', 'level', 'group', 'category', mode='before')
    @classmethod
    def sanitize_text(cls, v: str | None) -> str | None:
        return sanitize_string(v)

class ChecklistTemplateCreate(ChecklistTemplateBase):
    pass

class ChecklistTemplateUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)
    # ... all fields optional for updates

class ChecklistTemplateResponse(CamelCaseModel):
    id: UUID
    project_id: UUID
    name: str
    level: str
    group: str
    category: str | None = None
    metadata: dict | None = None
    created_at: datetime
    updated_at: datetime
    created_by: UserResponse | None = None
    subsections: list[ChecklistSubSectionResponse] = []
```

**Key Points:**
- Use Base/Create/Update/Response schema pattern
- Update schemas have all optional fields
- Response schemas extend CamelCaseModel for camelCase JSON output
- Add field_validator for sanitization
- Include nested relationships in Response schemas

### 3. FastAPI CRUD Endpoint Pattern

From `backend/app/api/v1/equipment.py`:

```python
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.db.session import get_db
from app.core.security import get_current_user
from app.services.audit_service import create_audit_log, get_model_dict
from app.models.audit import AuditAction

router = APIRouter()

@router.get("/projects/{project_id}/checklist-templates", response_model=list[ChecklistTemplateResponse])
async def list_checklist_templates(project_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ChecklistTemplate)
        .options(selectinload(ChecklistTemplate.created_by), selectinload(ChecklistTemplate.subsections))
        .where(ChecklistTemplate.project_id == project_id)
        .order_by(ChecklistTemplate.created_at.desc())
    )
    return result.scalars().all()

@router.post("/projects/{project_id}/checklist-templates", response_model=ChecklistTemplateResponse)
async def create_checklist_template(
    project_id: UUID,
    data: ChecklistTemplateCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    template = ChecklistTemplate(**data.model_dump(), project_id=project_id, created_by_id=current_user.id)
    db.add(template)
    await db.flush()

    await create_audit_log(db, current_user, "checklist_template", template.id, AuditAction.CREATE,
                          project_id=project_id, new_values=get_model_dict(template))

    await db.refresh(template, ["created_by", "subsections"])
    return template
```

**Key Points:**
- Use async/await with AsyncSession
- Use selectinload for eager loading relationships
- Include audit logging for all mutations
- Use db.flush() before audit logging to get generated IDs
- Refresh with relationships after operations
- Return 404 with HTTPException when not found

## Requirements

### Functional Requirements

1. **Checklist Template Management**
   - Description: CRUD operations for defining checklist templates with level, group, name, category
   - Acceptance: Can create template "פרוטוקול מסירה לדייר" with group "מסירות" and retrieve it via API

2. **Sub-Section Management**
   - Description: Define room/area subdivisions within templates (כניסה, מטבח, etc.)
   - Acceptance: Can create 8 sub-sections under a template and retrieve them hierarchically

3. **Checklist Item Template Management**
   - Description: Define individual checklist items with metadata (must_image, must_note, must_signature)
   - Acceptance: Can create item "בדיקת צבע קירות" with must_image=True and attach to sub-section

4. **Checklist Instance Creation**
   - Description: Instantiate a template for a specific apartment/unit
   - Acceptance: Can create instance from template for "דירה 12, קומה 3" with all items copied

5. **Item Response Recording**
   - Description: Record completion status, notes, and signatures for individual items
   - Acceptance: Can mark item complete with status="approved", add note, timestamp recorded

6. **Hierarchical Querying**
   - Description: Query templates with all nested subsections and items in single request
   - Acceptance: GET /checklist-templates/{id} returns full hierarchy including 3 levels deep

### Edge Cases

1. **Deleting Template with Active Instances** - Block deletion or cascade with warning, track instance count
2. **Hebrew Text Validation** - Ensure proper UTF-8 encoding, right-to-left text support in responses
3. **Orphaned Responses** - Prevent item responses without valid parent instance via foreign key constraints
4. **Duplicate Subsection Names** - Allow duplicates (e.g., multiple "חדר רחצה"), differentiate by order or ID
5. **Empty Templates** - Allow templates without subsections initially, validate on instance creation
6. **JSONB Metadata Schema** - Document expected keys but allow flexibility, validate required keys in business logic
7. **Large Item Lists** - Consider pagination for templates with 127+ items, implement offset/limit
8. **Concurrent Updates** - Use optimistic locking with updated_at checks for item responses

## Implementation Notes

### DO
- Follow the pattern in `backend/app/models/equipment.py` for SQLAlchemy models with UUID, JSONB, relationships
- Reuse `CamelCaseModel` from `backend/app/core/validators.py` for all Response schemas
- Use `selectinload()` for nested relationships to avoid N+1 queries
- Implement audit logging using `app.services.audit_service` for all CREATE/UPDATE/DELETE operations
- Add field validators using `sanitize_string()` for all text fields
- Use enums for fixed value lists (e.g., response status: pending/completed/not_applicable)
- Add indexes on foreign keys (project_id, template_id, instance_id) in migration
- Support Hebrew text with proper UTF-8 encoding in all string fields
- Use cascade="all, delete-orphan" for parent-child relationships
- Return full nested objects in Response schemas for single-item endpoints

### DON'T
- Create new base classes when Base from `app.db.session` works
- Use synchronous database operations (no `db.execute()` without await)
- Skip audit logging for any data mutations
- Hardcode validation limits - import from `app.core.validators`
- Return SQLAlchemy models directly - always use Pydantic Response schemas
- Create circular imports - import schemas in API routes, not in models
- Use SELECT * - explicitly list columns or use selectinload for relationships
- Forget to add new router to `app.api.v1.router.py`
- Skip migration testing - verify up/down migrations work
- Use nullable foreign keys for required relationships

## Development Environment

### Start Services

```bash
# Start PostgreSQL and Redis via Docker Compose
docker-compose up -d db redis

# Run backend (from backend directory)
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Run migrations
alembic upgrade head

# Create new migration (after model changes)
alembic revision --autogenerate -m "Add checklist models"
```

### Service URLs
- Backend API: http://localhost:8000
- API Docs (Swagger): http://localhost:8000/api/v1/docs
- ReDoc: http://localhost:8000/api/v1/redoc
- PostgreSQL: localhost:5432

### Required Environment Variables
```bash
# Backend .env
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/builder_db
SECRET_KEY=your-secret-key-here
CORS_ORIGINS=http://localhost:3000
```

## Success Criteria

The task is complete when:

1. [x] All 5 models created with proper relationships and JSONB fields
2. [x] All Pydantic schemas defined (Base, Create, Update, Response for each model)
3. [x] CRUD API endpoints implemented for all entities with proper nesting
4. [x] Alembic migration created and tested (upgrade/downgrade)
5. [x] Audit logging integrated for all mutation operations
6. [x] Can create template → subsections → items → instance → responses via API
7. [x] Hebrew text properly stored and retrieved
8. [x] API documentation auto-generated and accessible at /docs
9. [x] No console errors or database warnings
10. [x] Existing tests still pass (if any)
11. [x] New router registered in `app.api.v1.router.py`

## QA Acceptance Criteria

**CRITICAL**: These criteria must be verified by the QA Agent before sign-off.

### Unit Tests
| Test | File | What to Verify |
|------|------|----------------|
| Model relationships | `backend/tests/test_models/test_checklist.py` | Verify template → subsection → item relationships work, cascade deletes properly |
| Schema validation | `backend/tests/test_schemas/test_checklist.py` | Verify Pydantic schemas validate Hebrew text, required fields, field length limits |
| JSONB metadata | `backend/tests/test_models/test_checklist.py` | Verify JSONB fields store/retrieve dicts correctly, handle null values |

### Integration Tests
| Test | Services | What to Verify |
|------|----------|----------------|
| Template CRUD API | backend ↔ db | POST creates template, GET retrieves with subsections, PUT updates, DELETE cascades |
| Instance creation from template | backend ↔ db | POST /templates/{id}/instantiate copies structure to new instance |
| Item response recording | backend ↔ db | POST /instances/{id}/items/{item_id}/responses creates response with timestamp |
| Audit logging | backend ↔ db | All mutations create audit_log entries with correct action types |

### End-to-End Tests
| Flow | Steps | Expected Outcome |
|------|-------|------------------|
| Full checklist workflow | 1. Create template 2. Add 2 subsections 3. Add 3 items per subsection 4. Create instance for unit 5. Complete 2 items with responses | Template has 2 subsections with 6 total items, instance created with all items, 2 responses recorded with timestamps |
| Hierarchy retrieval | 1. Create nested structure 2. GET template by ID | Response includes full hierarchy: template → subsections → items in single response |
| Hebrew text support | 1. Create template with name "פרוטוקול מסירה" 2. Create item with description in Hebrew 3. Retrieve via API | All Hebrew text stored/retrieved correctly, no encoding issues in JSON response |

### API Verification
| Endpoint | Method | Checks |
|----------|--------|--------|
| `/api/v1/projects/{id}/checklist-templates` | GET | Returns list of templates with subsections |
| `/api/v1/projects/{id}/checklist-templates` | POST | Creates template, returns 201, includes created_by |
| `/api/v1/projects/{id}/checklist-templates/{template_id}` | GET | Returns full hierarchy with items |
| `/api/v1/projects/{id}/checklist-templates/{template_id}` | PUT | Updates template, audit log created |
| `/api/v1/projects/{id}/checklist-templates/{template_id}` | DELETE | Deletes template and cascades to subsections/items |
| `/api/v1/projects/{id}/checklist-instances` | POST | Creates instance from template |
| `/api/v1/projects/{id}/checklist-instances/{instance_id}/items/{item_id}/responses` | POST | Records item response |

### Database Verification
| Check | Query/Command | Expected |
|-------|---------------|----------|
| Migration exists | `alembic history` | Shows 003_add_checklist_models migration |
| Tables created | `\dt` in psql | Shows 5 new tables: checklist_templates, checklist_subsections, checklist_item_templates, checklist_instances, checklist_item_responses |
| Foreign keys | `\d checklist_subsections` | Shows FK to checklist_templates with ON DELETE CASCADE |
| JSONB columns | `\d checklist_item_templates` | Shows metadata column with JSONB type |
| Indexes | `\di checklist*` | Shows indexes on project_id, template_id, instance_id foreign keys |

### QA Sign-off Requirements
- [x] All unit tests pass (models, schemas)
- [x] All integration tests pass (CRUD APIs, audit logging)
- [x] All E2E tests pass (full workflow, hierarchy retrieval, Hebrew support)
- [x] API documentation verified at /docs with all endpoints listed
- [x] Database migrations verified (up/down work correctly)
- [x] No regressions in existing equipment/materials/other modules
- [x] Code follows established patterns (matches equipment.py structure)
- [x] No security vulnerabilities introduced (SQL injection, XSS in validation)
- [x] Performance acceptable (nested queries use selectinload, no N+1)
- [x] Hebrew text encoding verified in PostgreSQL and JSON responses

## Data Model Reference

### 5 Core Models

**1. ChecklistTemplate**
- Purpose: Defines overall checklist structure
- Key fields: level, group, name, category, metadata (JSONB)
- Relationships: has many ChecklistSubSections

**2. ChecklistSubSection**
- Purpose: Room/area groupings within template
- Key fields: template_id (FK), name, order, metadata (JSONB)
- Relationships: belongs to ChecklistTemplate, has many ChecklistItemTemplates

**3. ChecklistItemTemplate**
- Purpose: Individual inspection item definition
- Key fields: subsection_id (FK), name, category, description, must_image, must_note, must_signature, metadata (JSONB)
- Relationships: belongs to ChecklistSubSection

**4. ChecklistInstance**
- Purpose: Filled checklist for specific apartment/unit
- Key fields: template_id (FK), project_id (FK), unit_identifier, status, metadata (JSONB)
- Relationships: belongs to ChecklistTemplate, has many ChecklistItemResponses

**5. ChecklistItemResponse**
- Purpose: Individual item completion record
- Key fields: instance_id (FK), item_template_id (FK), status, notes, image_urls, signature_url, completed_at, completed_by_id (FK)
- Relationships: belongs to ChecklistInstance, references ChecklistItemTemplate

### Excel Data Structure Reference

**5 Checklist Types (to be represented as templates):**
1. פרוטוקול פנימי - לפי חללים (Internal Protocol by Spaces) - 127 items
2. פרוטוקול מסירה לדייר (Tenant Handover Protocol) - 125 items
3. תיק דייר (Tenant File) - 36 items
4. לובי קומתי (Floor Lobby) - 30 items
5. פרוטוקול קבלת חזקה בדירה (Apartment Possession Protocol) - 3 items

**8 Sub-sections (room categories):**
1. כניסה (Entrance)
2. מטבח (Kitchen)
3. סלון ומעברים (Living room & Hallways)
4. ממ״ד (Shelter/Safe room)
5. חדר רחצה (Bathroom)
6. חדרים (Bedrooms)
7. מרפסות (Balconies)
8. גג (Roof)

**Item Metadata Flags:**
- `must_image`: Boolean - Photo required for completion
- `must_note`: Boolean - Text note required
- `must_signature`: Boolean - Signature required

## API Endpoint Structure

### Template Management
- `GET /api/v1/projects/{project_id}/checklist-templates` - List all templates
- `POST /api/v1/projects/{project_id}/checklist-templates` - Create template
- `GET /api/v1/projects/{project_id}/checklist-templates/{template_id}` - Get template with full hierarchy
- `PUT /api/v1/projects/{project_id}/checklist-templates/{template_id}` - Update template
- `DELETE /api/v1/projects/{project_id}/checklist-templates/{template_id}` - Delete template

### Subsection Management
- `POST /api/v1/projects/{project_id}/checklist-templates/{template_id}/subsections` - Add subsection
- `PUT /api/v1/projects/{project_id}/checklist-templates/{template_id}/subsections/{subsection_id}` - Update subsection
- `DELETE /api/v1/projects/{project_id}/checklist-templates/{template_id}/subsections/{subsection_id}` - Delete subsection

### Item Template Management
- `POST /api/v1/projects/{project_id}/subsections/{subsection_id}/items` - Add item to subsection
- `PUT /api/v1/projects/{project_id}/subsections/{subsection_id}/items/{item_id}` - Update item
- `DELETE /api/v1/projects/{project_id}/subsections/{subsection_id}/items/{item_id}` - Delete item

### Instance Management
- `GET /api/v1/projects/{project_id}/checklist-instances` - List instances
- `POST /api/v1/projects/{project_id}/checklist-instances` - Create instance from template
- `GET /api/v1/projects/{project_id}/checklist-instances/{instance_id}` - Get instance with responses
- `DELETE /api/v1/projects/{project_id}/checklist-instances/{instance_id}` - Delete instance

### Response Management
- `POST /api/v1/projects/{project_id}/checklist-instances/{instance_id}/responses` - Record item response
- `PUT /api/v1/projects/{project_id}/checklist-instances/{instance_id}/responses/{response_id}` - Update response
- `GET /api/v1/projects/{project_id}/checklist-instances/{instance_id}/responses` - List all responses for instance
