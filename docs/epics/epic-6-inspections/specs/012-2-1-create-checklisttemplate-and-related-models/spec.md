# Specification: Create ChecklistTemplate and Related Models

## Overview

This task implements a three-tier hierarchical checklist template system using SQLAlchemy ORM models in the backend service. The system provides bilingual (English/Hebrew) support for template-based checklists with flexible configuration storage using PostgreSQL JSONB columns. This greenfield implementation establishes the data foundation for checklist functionality across the application.

## Workflow Type

**Type**: feature

**Rationale**: This is a new feature that introduces entirely new database models and data structures. It creates foundational data models that will be consumed by future API endpoints and frontend components, establishing the template architecture for checklist management.

## Task Scope

### Services Involved
- **backend** (primary) - Creating new SQLAlchemy models in `app/models/checklist_template.py`

### This Task Will:
- [ ] Create `ChecklistTemplate` model with bilingual fields, categorization, and soft-delete support
- [ ] Create `ChecklistSubSection` model with ordering and parent-child relationship to templates
- [ ] Create `ChecklistItemTemplate` model with requirement flags, JSONB flexibility, and ordering
- [ ] Establish proper foreign key relationships with cascade behavior
- [ ] Implement UUID primary keys across all models
- [ ] Set up JSONB columns for `file_names` and `additional_config`
- [ ] Add timestamp tracking (`created_at`, `updated_at`) to ChecklistTemplate

### Out of Scope:
- Database migration creation (will be handled separately via Alembic)
- API endpoints for checklist template CRUD operations
- Pydantic schemas for request/response validation
- Frontend integration or UI components
- Data seeding or initial template population
- Integration with existing equipment/material checklist systems

## Service Context

### Backend

**Tech Stack:**
- Language: Python 3.10+
- Framework: FastAPI
- ORM: SQLAlchemy 2.0+ (with modern type annotations)
- Database: PostgreSQL (with JSONB support)
- Migration tool: Alembic

**Key Directories:**
- `app/models/` - SQLAlchemy model definitions
- `app/db/` - Database session and base configuration

**Entry Point:** `app/main.py`

**How to Run:**
```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

**Port:** 8000

**Database:**
- Type: PostgreSQL
- Connection managed via SQLAlchemy session
- Migrations via Alembic

## Files to Modify

| File | Service | What to Change |
|------|---------|---------------|
| *None* | backend | This is a greenfield implementation - no existing files need modification |

## Files to Create

| File | Service | Purpose |
|------|---------|---------|
| `backend/app/models/checklist_template.py` | backend | New file containing all three model classes |

## Files to Reference

These files show patterns to follow:

| File | Pattern to Copy |
|------|----------------|
| `backend/app/models/equipment.py` | UUID primary keys, JSONB columns, relationship definitions, cascade behavior |
| `backend/app/models/project.py` | Modern Mapped[] type hints, timestamp patterns, Enum usage (if needed) |
| `backend/app/db/session.py` | Base class import for SQLAlchemy models |

## Patterns to Follow

### Pattern 1: UUID Primary Keys with Modern Type Hints

From `backend/app/models/equipment.py`:

```python
import uuid
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

class Equipment(Base):
    __tablename__ = "equipment"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
```

**Key Points:**
- Use `uuid.UUID` type hint with `Mapped[]`
- Set `UUID(as_uuid=True)` for PostgreSQL dialect
- Always provide `default=uuid.uuid4` for auto-generation
- This pattern applies to all three models' primary keys

### Pattern 2: Foreign Keys with Cascade Delete

From `backend/app/models/equipment.py`:

```python
class EquipmentChecklist(Base):
    __tablename__ = "equipment_checklists"

    equipment_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("equipment.id", ondelete="CASCADE")
    )
```

**Key Points:**
- Use `ondelete="CASCADE"` for hierarchical data integrity
- ChecklistSubSection should cascade when template deleted
- ChecklistItemTemplate should cascade when subsection deleted
- Table name references in ForeignKey must match `__tablename__` attribute

### Pattern 3: JSONB Columns for Flexible Data

From `backend/app/models/equipment.py`:

```python
from sqlalchemy.dialects.postgresql import JSONB

class Equipment(Base):
    specifications: Mapped[dict | None] = mapped_column(JSONB, default=dict)
    items: Mapped[list] = mapped_column(JSONB, default=list)
```

**Key Points:**
- Use `JSONB` type from `sqlalchemy.dialects.postgresql`
- `file_names` should be `Mapped[list]` with `default=list`
- `additional_config` should be `Mapped[dict | None]` with `default=dict`
- JSONB provides flexibility without schema migrations

### Pattern 4: Bidirectional Relationships

From `backend/app/models/equipment.py`:

```python
class Equipment(Base):
    checklists = relationship(
        "EquipmentChecklist",
        back_populates="equipment",
        cascade="all, delete-orphan"
    )

class EquipmentChecklist(Base):
    equipment = relationship("Equipment", back_populates="checklists")
```

**Key Points:**
- Parent uses `cascade="all, delete-orphan"` for child collection
- Child uses simple `back_populates` reference
- Attribute names must match on both sides
- ChecklistTemplate → sub_sections (parent)
- ChecklistSubSection → items (parent to items)
- ChecklistSubSection → template (child to template)
- ChecklistItemTemplate → sub_section (child)

### Pattern 5: Timestamp Fields

From `backend/app/models/equipment.py`:

```python
from datetime import datetime
from sqlalchemy import DateTime

class Equipment(Base):
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
- Use `datetime.utcnow` (not `datetime.utcnow()` with parentheses)
- `updated_at` needs `onupdate=datetime.utcnow` for automatic updates
- Only ChecklistTemplate requires timestamps (per requirements)

### Pattern 6: Optional Fields with Union Type Syntax

From `backend/app/models/project.py`:

```python
class Project(Base):
    description: Mapped[str | None] = mapped_column(Text)
    address: Mapped[str | None] = mapped_column(Text)
```

**Key Points:**
- Use modern Python 3.10+ union syntax: `str | None` instead of `Optional[str]`
- Apply to: `category`, `logo_name`, `description_file` in ChecklistTemplate
- Apply to: `category`, `description` in ChecklistItemTemplate
- `additional_config` should be `dict | None`

## Requirements

### Functional Requirements

1. **ChecklistTemplate Model**
   - Description: Top-level entity representing a complete checklist template
   - Fields:
     - `id`: UUID primary key (auto-generated)
     - `name`: String (English name, required)
     - `name_he`: String (Hebrew name, required)
     - `level`: String (e.g., "project", required)
     - `group_name`: String (e.g., "מסירות", required)
     - `category`: Optional string for categorization
     - `logo_name`: Optional string for logo file reference
     - `description_file`: Optional string for description file path
     - `is_active`: Boolean for soft-delete (default: True)
     - `created_at`: Timestamp (auto-generated)
     - `updated_at`: Timestamp (auto-updated on changes)
   - Relationships:
     - `sub_sections`: One-to-many with ChecklistSubSection (cascade delete)
   - Acceptance: Can create instance, save to DB, query by is_active flag

2. **ChecklistSubSection Model**
   - Description: Mid-tier grouping within a template
   - Fields:
     - `id`: UUID primary key (auto-generated)
     - `template_id`: Foreign key to ChecklistTemplate (cascade on delete)
     - `name`: String (English name, required)
     - `name_he`: String (Hebrew name, required)
     - `order`: Integer for display sequence (required)
   - Relationships:
     - `template`: Many-to-one back to ChecklistTemplate
     - `items`: One-to-many with ChecklistItemTemplate (cascade delete)
   - Acceptance: Can create subsection linked to template, order subsections

3. **ChecklistItemTemplate Model**
   - Description: Individual checklist item within a subsection
   - Fields:
     - `id`: UUID primary key (auto-generated)
     - `sub_section_id`: Foreign key to ChecklistSubSection (cascade on delete)
     - `name`: String (English name, required)
     - `name_he`: String (Hebrew name, required)
     - `category`: Optional string
     - `description`: Optional string
     - `must_image`: Boolean (default: False)
     - `must_note`: Boolean (default: False)
     - `must_signature`: Boolean (default: False)
     - `file_names`: JSONB list of file name strings
     - `order`: Integer for display sequence (required)
     - `additional_config`: JSONB dictionary for extensible configuration
   - Relationships:
     - `sub_section`: Many-to-one back to ChecklistSubSection
   - Acceptance: Can create item with requirement flags, store file_names array

4. **Bilingual Support**
   - Description: All user-facing text fields support both English and Hebrew
   - Fields affected: `name`, `name_he` across all three models
   - Acceptance: Can store and retrieve both language variants independently

5. **Flexible Configuration**
   - Description: JSONB columns allow schema-free extensibility
   - Fields: `file_names` (array), `additional_config` (object)
   - Acceptance: Can store arbitrary JSON data, query survives model changes

### Edge Cases

1. **Orphan Prevention** - Deleting a template must cascade to subsections and items
2. **Ordering Conflicts** - Multiple items can have same order value (application handles display)
3. **Empty JSONB Fields** - `file_names` defaults to empty list, `additional_config` to empty dict
4. **Soft Delete** - `is_active=False` templates should remain in DB but be filterable
5. **Null vs Empty String** - Optional text fields should be NULL (not empty string)

## Implementation Notes

### DO
- Follow the exact pattern in `equipment.py` for UUID and relationship setup
- Use `Mapped[type]` syntax for all field type hints
- Import `Base` from `app.db.session`
- Use `ondelete="CASCADE"` on all foreign keys
- Set sensible defaults (e.g., `is_active=True`, `must_image=False`)
- Use `String(255)` for name fields, `String(100)` for category/level
- Apply `default=list` and `default=dict` for JSONB fields

### DON'T
- Don't use old `Column()` syntax - use modern `mapped_column()`
- Don't forget `back_populates` on both sides of relationships
- Don't use `Optional[Type]` - use `Type | None` instead
- Don't add indexes yet (defer to migration phase)
- Don't create schemas or API endpoints (out of scope)
- Don't use auto-increment integers for IDs (must be UUID)

### Code Structure Template

```python
import uuid
from datetime import datetime
from sqlalchemy import String, Text, Integer, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.session import Base


class ChecklistTemplate(Base):
    __tablename__ = "checklist_templates"
    # ... fields and relationships


class ChecklistSubSection(Base):
    __tablename__ = "checklist_sub_sections"
    # ... fields and relationships


class ChecklistItemTemplate(Base):
    __tablename__ = "checklist_item_templates"
    # ... fields and relationships
```

## Development Environment

### Start Services

```bash
# Start PostgreSQL via Docker Compose
docker-compose up -d db

# Start backend server
cd backend
uvicorn app.main:app --reload --port 8000
```

### Service URLs
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs
- PostgreSQL: localhost:5432 (internal)

### Required Environment Variables
- `DATABASE_URL`: PostgreSQL connection string
- Configuration loaded from `.env` file via python-dotenv

### Testing Model Creation

```python
# In Python shell or test file
from app.db.session import SessionLocal
from app.models.checklist_template import ChecklistTemplate, ChecklistSubSection, ChecklistItemTemplate

db = SessionLocal()

# Create template
template = ChecklistTemplate(
    name="Project Delivery",
    name_he="מסירות פרויקט",
    level="project",
    group_name="מסירות"
)
db.add(template)
db.commit()

# Verify relationships work
assert template.sub_sections == []
assert template.is_active == True
```

## Success Criteria

The task is complete when:

1. [ ] File `backend/app/models/checklist_template.py` exists with all three model classes
2. [ ] All models inherit from `Base` and define `__tablename__`
3. [ ] All primary keys are UUID type with uuid.uuid4 default
4. [ ] Foreign keys use CASCADE delete behavior
5. [ ] Relationships are bidirectional with correct `back_populates`
6. [ ] JSONB fields have appropriate defaults (list/dict)
7. [ ] Boolean fields have explicit defaults (True for is_active, False for must_* flags)
8. [ ] Bilingual fields (`name` and `name_he`) exist on all models
9. [ ] Timestamp fields (`created_at`, `updated_at`) on ChecklistTemplate only
10. [ ] Code follows patterns from `equipment.py` and `project.py`
11. [ ] No syntax errors when importing models
12. [ ] Models can be instantiated without database connection

## QA Acceptance Criteria

**CRITICAL**: These criteria must be verified by the QA Agent before sign-off.

### Unit Tests

| Test | File | What to Verify |
|------|------|----------------|
| Model Import | `backend/app/models/checklist_template.py` | File imports without errors, all classes accessible |
| Model Instantiation | Test script | Can create instances of all three models with required fields |
| Relationship Navigation | Test script | Can access `template.sub_sections`, `sub_section.items`, `sub_section.template`, `item.sub_section` |
| Default Values | Test script | `is_active` defaults to True, `must_image/note/signature` default to False, JSONB fields default to empty list/dict |
| UUID Generation | Test script | Primary keys auto-generate unique UUIDs on instantiation |

### Integration Tests

| Test | Services | What to Verify |
|------|----------|----------------|
| Database Schema | backend ↔ PostgreSQL | Alembic can detect models for migration generation |
| JSONB Serialization | backend ↔ PostgreSQL | Can save and retrieve complex JSON in `file_names` and `additional_config` |
| Cascade Delete | backend ↔ PostgreSQL | Deleting template removes subsections and items (test after migration) |
| Bilingual Data | backend ↔ PostgreSQL | Can store Hebrew characters in `name_he` fields |

### Code Quality Checks

| Check | Command | Expected |
|-------|---------|----------|
| Import Validation | `python -c "from app.models.checklist_template import ChecklistTemplate, ChecklistSubSection, ChecklistItemTemplate"` | No ImportError |
| Linting | `pylint backend/app/models/checklist_template.py` | No critical errors |
| Type Checking | `mypy backend/app/models/checklist_template.py` (if configured) | No type errors |

### Manual Verification

| Item | What to Check | Expected Result |
|------|---------------|----------------|
| Table Names | Review `__tablename__` attributes | checklist_templates, checklist_sub_sections, checklist_item_templates |
| Type Hints | Review all Mapped[] declarations | Modern syntax using `Type | None` not `Optional[Type]` |
| Import Structure | Check imports at top of file | Clean, organized, no unused imports |
| Documentation | Review docstrings (if added) | Clear description of model purpose |

### QA Sign-off Requirements

- [ ] All three model classes defined in `checklist_template.py`
- [ ] Code follows existing patterns from equipment.py and project.py
- [ ] No syntax errors or import failures
- [ ] All required fields present per specification
- [ ] Relationships properly configured with back_populates
- [ ] JSONB columns use PostgreSQL dialect correctly
- [ ] UUID primary keys configured with auto-generation
- [ ] Timestamp fields use datetime.utcnow (not callable)
- [ ] No regressions in existing model imports
- [ ] Code ready for Alembic migration generation

---

## Next Steps (Out of Scope for This Task)

1. Create Alembic migration for these models
2. Create Pydantic schemas in `app/schemas/checklist_template.py`
3. Implement CRUD operations in `app/crud/checklist_template.py`
4. Create API endpoints in `app/api/v1/checklist_templates.py`
5. Add database indexes for performance optimization
6. Implement data seeding for initial templates
