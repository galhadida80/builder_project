# Specification: Create InspectionTemplate Models for Senior Supervision

## Overview

Create two new SQLAlchemy models in the backend to support senior supervision inspection template functionality. These models will define consultant types (e.g., architect, constructor, electrician) and their associated inspection stage templates with bilingual support (English/Hebrew), conditional triggers, and document requirements. This enables structured tracking of construction project inspections across 21 different consultant specializations.

## Workflow Type

**Type**: feature

**Rationale**: This task introduces new database models and relationships to support a new feature domain (senior supervision inspections). It requires creating new tables, defining relationships, and establishing data structures for inspection workflows, making it a feature implementation workflow.

## Task Scope

### Services Involved
- **backend** (primary) - Create SQLAlchemy models, define database schema

### This Task Will:
- [ ] Create new file `backend/app/models/inspection_template.py`
- [ ] Define `InspectionConsultantType` model with bilingual fields
- [ ] Define `InspectionStageTemplate` model with JSONB fields for conditions and documents
- [ ] Establish one-to-many relationship between consultant types and stage templates
- [ ] Update `backend/app/models/__init__.py` to export new models
- [ ] Follow existing model patterns for UUIDs, timestamps, and soft deletion

### Out of Scope:
- API endpoints for inspection templates (separate task)
- Frontend UI for managing templates
- Data migration/seeding of 21 consultant types (separate task)
- Pydantic schemas for validation
- Database migration file creation (will be generated separately)

## Service Context

### Backend

**Tech Stack:**
- Language: Python
- Framework: FastAPI
- ORM: SQLAlchemy
- Database: PostgreSQL
- Migration Tool: Alembic
- Key directories: `app/models/`, `app/db/`

**Entry Point:** `backend/app/`

**How to Run:**
```bash
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Port:** 8000

## Files to Modify

| File | Service | What to Change |
|------|---------|---------------|
| `backend/app/models/inspection_template.py` | backend | **CREATE NEW FILE** - Define InspectionConsultantType and InspectionStageTemplate models |
| `backend/app/models/__init__.py` | backend | Add imports and exports for new inspection template models |

## Files to Reference

These files show patterns to follow:

| File | Pattern to Copy |
|------|----------------|
| `backend/app/models/equipment.py` | UUID primary keys, timestamps, JSONB fields, Enum usage, relationships |
| `backend/app/models/material.py` | Model structure, JSONB specifications field, status handling |
| `backend/app/models/contact.py` | Simple model structure, boolean flags, timestamps |
| `backend/app/models/project.py` | Enum definitions, string constraints, relationship patterns |

## Patterns to Follow

### Pattern 1: Model Structure and Imports

From `backend/app/models/equipment.py` and `backend/app/models/contact.py`:

```python
import uuid
from datetime import datetime
from enum import Enum
from sqlalchemy import String, Text, Boolean, Integer, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.session import Base
```

**Key Points:**
- Always import from `app.db.session` for Base class
- Use `uuid`, `datetime` from standard library
- Import specific SQLAlchemy types needed
- Import JSONB from `sqlalchemy.dialects.postgresql` for JSON fields

### Pattern 2: UUID Primary Keys

From `backend/app/models/equipment.py`:

```python
id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
```

**Key Points:**
- Use `UUID(as_uuid=True)` for PostgreSQL UUID type
- Set `default=uuid.uuid4` for automatic ID generation
- Use `Mapped[uuid.UUID]` type annotation

### Pattern 3: JSONB Fields

From `backend/app/models/equipment.py`:

```python
specifications: Mapped[dict | None] = mapped_column(JSONB, default=dict)
```

**Key Points:**
- Use `JSONB` type from `sqlalchemy.dialects.postgresql`
- Type annotation: `Mapped[dict | None]` or `Mapped[list | None]`
- Set `default=dict` or `default=list` for empty structures

### Pattern 4: Timestamps

From `backend/app/models/equipment.py`:

```python
created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
```

**Key Points:**
- Use `datetime.utcnow` (not `datetime.utcnow()`) as callable
- Include `onupdate=datetime.utcnow` for automatic update tracking
- Non-nullable timestamps: `Mapped[datetime]`

### Pattern 5: Foreign Key Relationships

From `backend/app/models/equipment.py`:

```python
project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"))
project = relationship("Project", back_populates="equipment")
```

**Key Points:**
- Use `ForeignKey("table_name.id", ondelete="CASCADE")` for referential integrity
- Define relationship with `back_populates` for bidirectional access
- Use CASCADE deletion when child records should be removed with parent

### Pattern 6: Boolean Flags

From `backend/app/models/contact.py`:

```python
is_primary: Mapped[bool] = mapped_column(Boolean, default=False)
```

**Key Points:**
- Use `Mapped[bool]` for type safety
- Always set a `default` value for boolean fields
- Use `is_` prefix for boolean field names

### Pattern 7: Enums for Categories

From `backend/app/models/equipment.py`:

```python
class ApprovalStatus(str, Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    APPROVED = "approved"

status: Mapped[str] = mapped_column(String(50), default=ApprovalStatus.DRAFT.value)
```

**Key Points:**
- Enums inherit from `str, Enum` for string serialization
- Use UPPER_CASE for enum members, lowercase for values
- Store as String column, use `.value` for default

## Requirements

### Functional Requirements

1. **InspectionConsultantType Model**
   - Description: Represents a consultant specialization that performs inspections (e.g., architect, structural engineer, electrician)
   - Acceptance: Model created with all required fields including bilingual name support (name, name_he), category, is_active flag, and relationship to inspection stages

2. **InspectionStageTemplate Model**
   - Description: Defines a specific inspection stage for a consultant type with ordering, conditional triggers, and document requirements
   - Acceptance: Model created with bilingual names, stage_order for sequencing, JSONB fields for trigger_conditions and required_documents, and foreign key to consultant type

3. **Model Relationships**
   - Description: One-to-many relationship from InspectionConsultantType to InspectionStageTemplate
   - Acceptance: Relationship defined with cascade delete so that deleting a consultant type removes its associated stages

4. **Soft Deletion Support**
   - Description: Both models support soft deletion via is_active flag
   - Acceptance: is_active field present on both models with Boolean type and default=True

5. **Bilingual Field Support**
   - Description: All user-facing text fields include Hebrew translations
   - Acceptance: Both name and name_he fields exist on both models

### Edge Cases

1. **JSONB Field Structures** - Define expected JSON schemas for trigger_conditions and required_documents in model docstrings for future API/migration reference
2. **Stage Ordering** - stage_order should be an integer to allow flexible insertion and reordering of inspection stages
3. **Null Handling** - Optional fields (description, category) should use `| None` type annotation and not have `nullable=False`
4. **Cascade Deletion** - Ensure ondelete="CASCADE" is set for consultant_type_id foreign key to maintain referential integrity

## Implementation Notes

### DO
- Follow the exact import pattern from `backend/app/models/equipment.py`
- Use `Base` from `app.db.session` as the parent class
- Add docstrings to both models explaining their purpose
- Define JSONB field structures in model docstrings (example schemas for trigger_conditions and required_documents)
- Use `String(255)` for name fields, `String(100)` for category
- Set `nullable=False` only for required fields (id, consultant_type_id, name, name_he, stage_order)
- Add both models to `__init__.py` exports following existing pattern
- Use descriptive table names: `inspection_consultant_types` and `inspection_stage_templates`

### DON'T
- Don't create separate enum for categories - keep it as a flexible string field for future extensibility
- Don't add project_id foreign key at this stage (will be added when actual inspections are implemented)
- Don't create migration files manually - these will be auto-generated by Alembic
- Don't use `datetime.utcnow()` with parentheses - use the callable reference
- Don't forget to add relationship back references for bidirectional navigation

## Development Environment

### Start Services

```bash
# Start backend only (database will start via docker-compose)
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Or start full stack
docker-compose up -d
```

### Service URLs
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs
- PostgreSQL: localhost:5432

### Required Environment Variables
Check `backend/.env` or `backend/.env.example` for:
- `DATABASE_URL`: PostgreSQL connection string
- Other backend configuration

## Success Criteria

The task is complete when:

1. [ ] File `backend/app/models/inspection_template.py` created with both models
2. [ ] InspectionConsultantType model includes: id, name, name_he, category, is_active, timestamps, relationship to stages
3. [ ] InspectionStageTemplate model includes: id, consultant_type_id, name, name_he, description, stage_order, trigger_conditions, required_documents, is_active, timestamps
4. [ ] Relationship defined: InspectionConsultantType.inspection_stages ↔ InspectionStageTemplate.consultant_type
5. [ ] Models exported in `backend/app/models/__init__.py`
6. [ ] No syntax errors - Python imports resolve correctly
7. [ ] Code follows existing patterns from equipment.py, material.py, contact.py
8. [ ] Docstrings present explaining each model's purpose
9. [ ] JSONB field schemas documented in docstrings

## QA Acceptance Criteria

**CRITICAL**: These criteria must be verified by the QA Agent before sign-off.

### Unit Tests
| Test | File | What to Verify |
|------|------|----------------|
| Model Import | `backend/app/models/__init__.py` | New models importable without errors |
| Model Structure | `backend/app/models/inspection_template.py` | Both models have all required fields with correct types |
| Model Instantiation | Python REPL/test script | Can create instances of both models without errors |

### Integration Tests
| Test | Services | What to Verify |
|------|----------|----------------|
| SQLAlchemy Registration | backend | Models properly registered with Base metadata |
| Relationship Navigation | backend | Can access InspectionConsultantType.inspection_stages and InspectionStageTemplate.consultant_type |

### Code Quality Checks
| Check | Command | Expected |
|-------|---------|----------|
| Python Syntax | `python -m py_compile backend/app/models/inspection_template.py` | No syntax errors |
| Model Imports | `python -c "from app.models import InspectionConsultantType, InspectionStageTemplate"` | Successful import (run from backend/) |
| Pattern Compliance | Manual review | Follows patterns from equipment.py, material.py |

### Database Verification (Future - After Migration)
| Check | Query/Command | Expected |
|-------|---------------|----------|
| Migration Creation | `cd backend && alembic revision --autogenerate -m "Add inspection template models"` | Migration file created successfully |
| Migration Apply | `cd backend && alembic upgrade head` | Tables created: inspection_consultant_types, inspection_stage_templates |
| Schema Verification | SQL query or psql `\d` command | Both tables exist with correct columns and foreign keys |

### QA Sign-off Requirements
- [ ] Both model classes defined with all required fields
- [ ] All fields use correct SQLAlchemy types (UUID, String, Boolean, Integer, JSONB, DateTime)
- [ ] Timestamps (created_at, updated_at) present with correct defaults
- [ ] Foreign key relationship established with CASCADE delete
- [ ] is_active fields present on both models for soft deletion
- [ ] Bilingual fields (name, name_he) exist on both models
- [ ] Models properly exported in __init__.py
- [ ] No import errors when loading models module
- [ ] Code follows established patterns from existing models
- [ ] Docstrings present and informative
- [ ] JSONB field schemas documented

### Additional Verification Steps

**Step 1: Verify Model Structure**
```bash
cd backend
python3 -c "
from app.models.inspection_template import InspectionConsultantType, InspectionStageTemplate
import inspect

# Check InspectionConsultantType
print('InspectionConsultantType fields:')
print([attr for attr in dir(InspectionConsultantType) if not attr.startswith('_')])

# Check InspectionStageTemplate
print('\nInspectionStageTemplate fields:')
print([attr for attr in dir(InspectionStageTemplate) if not attr.startswith('_')])
"
```

**Step 2: Verify Imports from __init__.py**
```bash
cd backend
python3 -c "from app.models import InspectionConsultantType, InspectionStageTemplate; print('✓ Models imported successfully')"
```

**Step 3: Create Alembic Migration (Manual)**
```bash
cd backend
alembic revision --autogenerate -m "Add inspection template models"
# Review the generated migration file
# Run: alembic upgrade head
```

**Step 4: Verify Database Schema (After Migration)**
```bash
# Connect to PostgreSQL and verify tables
docker-compose exec db psql -U [user] -d [database] -c "\d inspection_consultant_types"
docker-compose exec db psql -U [user] -d [database] -c "\d inspection_stage_templates"
```
