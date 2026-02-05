# Specification: Create EquipmentTemplate and ConsultantType Models

## Overview

This task creates SQLAlchemy models for an equipment template management system that defines reusable templates for equipment types, their required documentation, specifications, and approval workflows. The models support bilingual (English/Hebrew) content and use flexible JSONB storage for dynamic configuration without schema migrations.

## Workflow Type

**Type**: feature

**Rationale**: This is a foundational model creation task that introduces new database entities and relationships to support equipment template functionality. It follows standard SQLAlchemy ORM patterns already established in the codebase.

## Task Scope

### Services Involved
- **backend** (primary) - SQLAlchemy model layer implementation

### This Task Will:
- [ ] Create ConsultantType model/enum to define consultant categories for equipment approvals
- [ ] Create EquipmentTemplate model with bilingual fields and JSONB storage for flexible configuration
- [ ] Create EquipmentTemplateConsultant junction table for many-to-many relationships
- [ ] Register models in app/models/__init__.py
- [ ] Follow existing model patterns for UUIDs, timestamps, relationships, and type hints

### Out of Scope:
- Alembic migrations (separate task)
- API endpoints and CRUD operations
- Pydantic schemas for validation
- Frontend integration
- Seeding initial data

## Service Context

### Backend

**Tech Stack:**
- Language: Python 3.10+
- Framework: FastAPI
- ORM: SQLAlchemy (async)
- Database: PostgreSQL
- Migrations: Alembic
- Key directories: app/models (model definitions), app/db (database session)

**Entry Point:** `app/main.py`

**How to Run:**
```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

**Port:** 8000

**Database Access:**
```bash
# View connection in docker-compose
docker-compose ps
# Connect to database
docker-compose exec db psql -U <username> -d <database>
```

## Files to Modify

| File | Service | What to Change |
|------|---------|---------------|
| `backend/app/models/__init__.py` | backend | Add imports for ConsultantType, EquipmentTemplate, EquipmentTemplateConsultant |

## Files to Create

| File | Service | Purpose |
|------|---------|---------|
| `backend/app/models/equipment_template.py` | backend | Define ConsultantType, EquipmentTemplate, and EquipmentTemplateConsultant models |

## Files to Reference

These files show patterns to follow:

| File | Pattern to Copy |
|------|----------------|
| `backend/app/models/equipment.py` | UUID primary keys, JSONB fields, enum definitions, basic relationships |
| `backend/app/models/meeting.py` | Many-to-many junction table pattern (MeetingAttendee) |
| `backend/app/models/checklist_templates.py` | Template pattern with relationships, UniqueConstraint usage |
| `backend/app/db/session.py` | Base class import for model definitions |

## Patterns to Follow

### 1. UUID Primary Keys

From `backend/app/models/equipment.py`:

```python
import uuid
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

id: Mapped[uuid.UUID] = mapped_column(
    UUID(as_uuid=True),
    primary_key=True,
    default=uuid.uuid4
)
```

**Key Points:**
- Always use `UUID(as_uuid=True)` for native UUID support
- Set `default=uuid.uuid4` for automatic ID generation
- Use modern `Mapped[]` type hints

### 2. Modern Type Hints (Python 3.10+)

From `backend/app/models/equipment.py`:

```python
from sqlalchemy import String, Text, DateTime, Boolean
from sqlalchemy.orm import Mapped, mapped_column

name: Mapped[str] = mapped_column(String(255), nullable=False)
description: Mapped[str | None] = mapped_column(Text)  # NOT Optional[str]
is_active: Mapped[bool] = mapped_column(Boolean, default=True)
```

**Key Points:**
- Use `str | None` syntax (not `Optional[str]`)
- Use `Mapped[Type]` for all columns
- Explicitly set `nullable=False` for required fields

### 3. JSONB for Flexible Schemas

From `backend/app/models/equipment.py`:

```python
from sqlalchemy.dialects.postgresql import JSONB

specifications: Mapped[dict | None] = mapped_column(JSONB, default=dict)
```

**Key Points:**
- Use `JSONB` for flexible, queryable JSON storage
- Set `default=dict` or `default=list` for non-nullable JSONB fields
- Type hint as `dict | None` or `list | None`

### 4. Timestamp Audit Fields

From `backend/app/models/equipment.py`:

```python
from datetime import datetime
from sqlalchemy import DateTime

created_at: Mapped[datetime] = mapped_column(
    DateTime,
    default=datetime.utcnow
)
updated_at: Mapped[datetime] = mapped_column(
    DateTime,
    default=datetime.utcnow,
    onupdate=datetime.utcnow
)
```

**Key Points:**
- Always use `datetime.utcnow` (not `datetime.now()`)
- Use `onupdate=datetime.utcnow` for automatic update timestamps
- Non-nullable by default (no `| None`)

### 5. Many-to-Many Junction Table

From `backend/app/models/meeting.py`:

```python
class MeetingAttendee(Base):
    __tablename__ = "meeting_attendees"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    meeting_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("meetings.id", ondelete="CASCADE")
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE")
    )

    meeting = relationship("Meeting", back_populates="attendees")
    user = relationship("User")
```

**Key Points:**
- Junction tables have their own primary key (UUID)
- Use `ondelete="CASCADE"` to auto-delete junction records
- Define relationships with `back_populates` for bidirectional access

### 6. String Enums

From `backend/app/models/equipment.py`:

```python
from enum import Enum

class ApprovalStatus(str, Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    UNDER_REVIEW = "under_review"
```

**Key Points:**
- Inherit from both `str` and `Enum` for database compatibility
- Use UPPERCASE for enum names, lowercase for values
- Store as String in database, not as integer

### 7. Bilingual Support Pattern

Requirements specify:

```python
name: Mapped[str] = mapped_column(String(255), nullable=False)
name_he: Mapped[str] = mapped_column(String(255), nullable=False)
```

**Key Points:**
- Duplicate all user-facing text fields with `_he` suffix for Hebrew
- Both fields should be non-nullable
- Use same column type and constraints for both

## Requirements

### Functional Requirements

1. **ConsultantType Model**
   - Description: Defines categories of consultants who approve equipment submissions
   - Fields:
     - `id`: UUID primary key
     - `name`: English name (String, required)
     - `name_he`: Hebrew name (String, required)
     - `category`: Consultant category (String, indexed)
   - Categories: structural, electrical, plumbing, hvac, safety, architecture
   - Timestamps: created_at, updated_at
   - Acceptance: Model can be instantiated, saved to database, and queried

2. **EquipmentTemplate Model**
   - Description: Reusable template defining equipment types with validation rules
   - Core Fields:
     - `id`: UUID primary key
     - `name`: English equipment type name (String, required)
     - `name_he`: Hebrew equipment type name (String, required)
     - `category`: Equipment category (String, indexed)
     - `is_active`: Soft delete flag (Boolean, default True)
   - JSONB Fields (flexible schemas):
     - `required_documents`: List of document definitions
     - `required_specifications`: List of specification field definitions
     - `submission_checklist`: List of checklist items
   - Timestamps: created_at, updated_at
   - Relationships:
     - `approving_consultants`: Many-to-many with ConsultantType
   - Acceptance: Template can be created with all fields, consultant relationships can be added/queried

3. **EquipmentTemplateConsultant Junction Table**
   - Description: Bridges many-to-many relationship between templates and consultant types
   - Fields:
     - `id`: UUID primary key
     - `template_id`: Foreign key to EquipmentTemplate (CASCADE delete)
     - `consultant_type_id`: Foreign key to ConsultantType (CASCADE delete)
   - Acceptance: Junction records auto-deleted when parent records are deleted

### Edge Cases

1. **Soft Deletion** - Templates marked `is_active=False` should not be hard-deleted
2. **Empty JSONB Fields** - JSONB fields can be empty lists/dicts without errors
3. **Cascade Deletes** - Deleting a template or consultant type removes junction records automatically
4. **Bilingual Validation** - Both name and name_he must be provided (cannot be null)
5. **Circular Imports** - Models must avoid circular dependencies (use string references in relationships)

## Implementation Notes

### DO
- Follow the pattern in `backend/app/models/equipment.py` for basic model structure
- Reuse the junction table pattern from `backend/app/models/meeting.py` (MeetingAttendee)
- Use `UUID(as_uuid=True)` with `default=uuid.uuid4` for all primary keys
- Set `ondelete="CASCADE"` on foreign keys in junction table
- Use `Mapped[str | None]` type hints (not `Optional[str]`)
- Add all models to `backend/app/models/__init__.py` exports
- Use `datetime.utcnow` for timestamp defaults
- Define relationships with `back_populates` for bidirectional access
- Set `default=dict` for JSONB fields to avoid None values

### DON'T
- Don't use `Optional[Type]` syntax (use `Type | None` instead)
- Don't use `datetime.now()` (use `datetime.utcnow` for consistency)
- Don't create migrations in this task (separate task)
- Don't hardcode foreign key IDs without proper ForeignKey constraints
- Don't forget to import models in __init__.py
- Don't use auto-increment integers for primary keys (use UUIDs)
- Don't omit `cascade="all, delete-orphan"` on parent relationships when appropriate

### ConsultantType Implementation Decision

The requirements state "enum or table" for ConsultantType. **Recommendation: Use a database table** for the following reasons:

1. **Extensibility**: New consultant types can be added without code changes
2. **Bilingual Support**: Table allows `name` and `name_he` fields (enums cannot store translations)
3. **Relationships**: Many-to-many relationship with EquipmentTemplate requires foreign keys (enums cannot be referenced)
4. **Consistency**: Other lookup entities in the codebase use tables (e.g., MeetingStatus, ApprovalStatus are enums for state machines, but entities are tables)

If enum approach is needed later, category values can be constrained via Pydantic schemas or database CHECK constraints.

## Development Environment

### Start Services

```bash
# Start database and backend
docker-compose up -d db backend

# Or start all services
docker-compose up -d

# View logs
docker-compose logs -f backend
```

### Service URLs
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs
- Database: localhost:5432 (via docker-compose)

### Verify Models

```bash
# Python REPL test
cd backend
python3 -c "
from app.models.equipment_template import ConsultantType, EquipmentTemplate, EquipmentTemplateConsultant
print('✓ Models imported successfully')
"

# Check model registration
python3 -c "
from app.models import ConsultantType, EquipmentTemplate, EquipmentTemplateConsultant
print('✓ Models registered in __init__.py')
"
```

### Required Environment Variables
- `DATABASE_URL`: PostgreSQL connection string (from docker-compose.yml)
- `DEBUG`: Enable SQL echo logging (optional)

## Success Criteria

The task is complete when:

1. [ ] ConsultantType model is defined in `backend/app/models/equipment_template.py`
2. [ ] EquipmentTemplate model is defined with all required fields (UUID, name, name_he, category, JSONB fields, is_active, timestamps)
3. [ ] EquipmentTemplateConsultant junction table is defined with proper foreign keys and CASCADE deletes
4. [ ] All models are registered in `backend/app/models/__init__.py` with proper imports and __all__ exports
5. [ ] Models can be imported without errors: `from app.models import ConsultantType, EquipmentTemplate, EquipmentTemplateConsultant`
6. [ ] Relationships are bidirectional (EquipmentTemplate has `approving_consultants`, ConsultantType has `templates`)
7. [ ] Modern Python 3.10+ type hints are used (`Mapped[str | None]`, not `Optional[str]`)
8. [ ] JSONB fields default to empty dict/list (not None)
9. [ ] No console errors or import errors when starting the backend service
10. [ ] Code follows patterns from existing models (equipment.py, meeting.py, checklist_templates.py)

## QA Acceptance Criteria

**CRITICAL**: These criteria must be verified by the QA Agent before sign-off.

### Unit Tests

Since this is a model definition task without business logic, unit tests are not strictly required. However, the following verifications should be performed:

| Test | Method | What to Verify |
|------|--------|----------------|
| Model Import Test | Python REPL | All models can be imported without errors |
| Model Structure Test | Python inspection | All fields defined with correct types |
| Relationship Test | Python inspection | Relationships properly configured |

### Integration Tests

| Test | Services | What to Verify |
|------|----------|----------------|
| Database Session Test | backend + db | Models can be instantiated and added to session without errors |
| Foreign Key Test | backend + db | Junction table foreign keys reference correct tables |

### Database Verification

| Check | Query/Command | Expected |
|-------|---------------|----------|
| Models Registered | `from app.models import *` | No import errors, ConsultantType/EquipmentTemplate/EquipmentTemplateConsultant available |
| Base Class | `ConsultantType.__bases__` | Inherits from `Base` (DeclarativeBase) |
| Table Names | `ConsultantType.__tablename__` | Correct table names defined |
| UUID Fields | Inspect `id` field | UUID type with uuid4 default |
| Relationships | Inspect `EquipmentTemplate.approving_consultants` | Relationship defined with correct type |

### Code Quality Checks

| Check | Command | Expected Outcome |
|-------|---------|-----------------|
| Import Check | `python3 -c "from app.models.equipment_template import *"` | No errors |
| Registration Check | `python3 -c "from app.models import ConsultantType, EquipmentTemplate, EquipmentTemplateConsultant"` | No errors |
| Type Hints Valid | `mypy backend/app/models/equipment_template.py` (if available) | No type errors |
| Linting | `pylint backend/app/models/equipment_template.py` (if configured) | No critical errors |

### QA Sign-off Requirements
- [ ] All models defined with correct field types and constraints
- [ ] Models can be imported from both `app.models.equipment_template` and `app.models`
- [ ] Relationships are bidirectional and properly configured
- [ ] JSONB fields have appropriate defaults
- [ ] Timestamps use `datetime.utcnow`
- [ ] Modern Python 3.10+ syntax used throughout
- [ ] No regressions in existing model imports
- [ ] Code follows established patterns from equipment.py, meeting.py, checklist_templates.py
- [ ] Bilingual fields (name/name_he) are non-nullable
- [ ] Junction table has CASCADE delete on foreign keys

## Migration Notes (For Next Task)

After models are defined, the next task will be to create Alembic migrations:

```bash
# Generate migration (DO NOT RUN IN THIS TASK)
cd backend
alembic revision --autogenerate -m "Add equipment template and consultant type models"

# Review and edit migration file
# Run migration
alembic upgrade head
```

Expected tables to be created:
1. `consultant_types` - ConsultantType model
2. `equipment_templates` - EquipmentTemplate model
3. `equipment_template_consultants` - Junction table

## Additional Context

### JSONB Schema Examples

While not enforced at the model level, here are example structures for JSONB fields:

**required_documents:**
```json
[
  {
    "name": "Technical Specification Sheet",
    "name_he": "גיליון מפרט טכני",
    "required": true,
    "file_types": ["pdf", "doc", "docx"]
  },
  {
    "name": "Manufacturer Certificate",
    "name_he": "תעודת יצרן",
    "required": true,
    "file_types": ["pdf"]
  }
]
```

**required_specifications:**
```json
[
  {
    "field": "power_rating",
    "label": "Power Rating (kW)",
    "label_he": "הספק (קילוואט)",
    "type": "number",
    "required": true,
    "validation": {"min": 0, "max": 1000}
  },
  {
    "field": "voltage",
    "label": "Voltage (V)",
    "label_he": "מתח (וולט)",
    "type": "select",
    "options": ["220V", "380V"],
    "required": true
  }
]
```

**submission_checklist:**
```json
[
  {
    "item": "Verify all technical specifications",
    "item_he": "אמת את כל המפרטים הטכניים",
    "order": 1
  },
  {
    "item": "Attach manufacturer documentation",
    "item_he": "צרף תיעוד יצרן",
    "order": 2
  }
]
```

These are examples only - the model does not enforce these schemas (flexibility by design).

---

**Linear Issue**: [BUI-19](https://linear.app/builder-project/issue/BUI-19/11-create-equipmenttemplate-and-consultanttype-models)
**Priority**: Medium
**Status**: Backlog
