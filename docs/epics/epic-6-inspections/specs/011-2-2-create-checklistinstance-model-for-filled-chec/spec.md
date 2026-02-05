# Specification: Create ChecklistInstance Model for Filled Checklists

## Overview

Create SQLAlchemy models to support quality control workflows in construction project management by implementing a template-instance pattern for checklists. This task adds two new models (`ChecklistInstance` and `ChecklistItemResponse`) to track filled/active checklists derived from templates, enabling inspectors to complete checklists for specific project areas and track individual item responses with evidence (images, signatures, notes).

## Workflow Type

**Type**: feature

**Rationale**: This task introduces new data models that enable a new capability (tracking filled checklist instances) without modifying existing functionality. It lays the foundation for future API endpoints and UI components to support quality control workflows.

## Task Scope

### Services Involved
- **backend** (primary) - Add SQLAlchemy models for checklist instances and item responses

### This Task Will:
- [ ] Create `ChecklistInstance` model in `backend/app/models/checklist_template.py`
- [ ] Create `ChecklistItemResponse` model in `backend/app/models/checklist_template.py`
- [ ] Define proper foreign key relationships to existing models (Project, User, ChecklistTemplate, ChecklistItemTemplate, ConstructionArea)
- [ ] Define two status enums for instance-level and item-level tracking
- [ ] Use JSONB columns for flexible data storage (file IDs, additional metadata)

### Out of Scope:
- API endpoints for creating/updating checklist instances (future task)
- Frontend components for displaying/filling checklists (future task)
- Database migration file creation (will be handled by Alembic after model definition)
- Business logic or validation rules (model definition only)

## Service Context

### Backend

**Tech Stack:**
- Language: Python
- Framework: FastAPI
- ORM: SQLAlchemy
- Database: PostgreSQL (supports JSONB)
- Migrations: Alembic

**Entry Point:** `app/main.py`

**How to Run:**
```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

**Port:** 8000

**Key Directories:**
- `app/models/` - SQLAlchemy model definitions
- `app/api/v1/` - API route handlers
- `alembic/versions/` - Database migration files

**Relevant Existing Models:**
- `Project` - Construction projects
- `User` - System users (inspectors, approvers)
- `ConstructionArea` - Project areas/units/apartments
- `ChecklistTemplate` - Template definitions (assumed to exist)
- `ChecklistItemTemplate` - Template item definitions (assumed to exist)

## Files to Modify

| File | Service | What to Change |
|------|---------|---------------|
| `backend/app/models/checklist_template.py` | backend | Add two new model classes: `ChecklistInstance` and `ChecklistItemResponse` with all specified fields, relationships, and enums |

## Files to Reference

These files show patterns to follow:

| File | Pattern to Copy |
|------|----------------|
| `backend/app/models/user.py` | SQLAlchemy model structure, UUID primary keys, timestamp columns |
| `backend/app/models/*.py` | Foreign key relationship patterns, enum definitions, JSONB column usage |
| `alembic/versions/*.py` | Migration file structure (for reference after model creation) |

## Patterns to Follow

### SQLAlchemy Model Pattern

Expected structure for SQLAlchemy models in this project:

```python
from sqlalchemy import Column, String, DateTime, ForeignKey, Enum
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.db.base_class import Base
import uuid
from datetime import datetime
import enum

class StatusEnum(str, enum.Enum):
    value_one = "value_one"
    value_two = "value_two"

class ModelName(Base):
    __tablename__ = "table_name"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    foreign_key_id = Column(UUID(as_uuid=True), ForeignKey("other_table.id"), nullable=False)
    status = Column(Enum(StatusEnum), default=StatusEnum.value_one)
    jsonb_field = Column(JSONB, default={})
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    related_model = relationship("OtherModel", back_populates="reverse_relation")
```

**Key Points:**
- Use `UUID(as_uuid=True)` for UUID columns with `uuid.uuid4` as default
- Use `Enum` from SQLAlchemy with Python enum classes for status fields
- Use `JSONB` from `sqlalchemy.dialects.postgresql` for flexible JSON storage
- Include `created_at` and `updated_at` timestamps with `datetime.utcnow`
- Define bidirectional relationships with `back_populates`
- Use `ForeignKey` with proper table references for relationships

### JSONB Usage Pattern

For fields storing arrays or objects:

```python
# Array of UUIDs (file IDs)
image_file_ids = Column(JSONB, default=list)

# Flexible metadata object
additional_data = Column(JSONB, default=dict)
```

**Key Points:**
- Use `default=list` for array fields (not `[]` to avoid mutable default issues)
- Use `default=dict` for object fields (not `{}` to avoid mutable default issues)
- JSONB allows indexing and querying in PostgreSQL

## Requirements

### Functional Requirements

1. **ChecklistInstance Model**
   - Description: Represents a filled/active checklist instance linked to a project and template, with optional area/unit assignment
   - Acceptance: Model has all specified fields (id, project_id, template_id, area_id, unit_identifier, status, started_at, completed_at, completed_by, additional_data, created_at, updated_at) and relationships to ChecklistItemResponse

2. **ChecklistItemResponse Model**
   - Description: Tracks individual item responses within a checklist instance with pass/fail/na status, notes, images, and signatures
   - Acceptance: Model has all specified fields (id, instance_id, item_template_id, status, note, image_file_ids, signature_file_id, responded_by, responded_at, additional_data) and relationships to ChecklistInstance

3. **Instance Status Enum**
   - Description: Enum for checklist instance lifecycle status
   - Acceptance: Enum defined with exact values: `not_started`, `in_progress`, `completed`, `approved`

4. **Item Status Enum**
   - Description: Enum for individual item response status
   - Acceptance: Enum defined with exact values: `pending`, `passed`, `failed`, `na`

5. **Foreign Key Relationships**
   - Description: Proper SQLAlchemy relationships to existing models
   - Acceptance: All foreign keys (project_id, template_id, area_id, completed_by, instance_id, item_template_id, responded_by) properly defined with ForeignKey constraints

### Edge Cases

1. **Optional Fields** - `area_id`, `unit_identifier`, `completed_at`, `note`, `signature_file_id` must be nullable
2. **JSONB Defaults** - Use callable defaults (list/dict) not literal [] or {} to avoid mutable default issues
3. **Enum String Values** - Enum values must be exact strings as specified (lowercase with underscores)
4. **Timestamp Fields** - `started_at` is required, `completed_at` is optional (only set when status becomes completed)
5. **File ID Storage** - `image_file_ids` is JSONB array, `signature_file_id` is single UUID

## Implementation Notes

### DO
- Follow the exact field names and types specified in requirements.json
- Use `UUID(as_uuid=True)` for all UUID columns
- Import JSONB from `sqlalchemy.dialects.postgresql`
- Define two separate enum classes: one for instance status, one for item status
- Use `default=list` for `image_file_ids` JSONB array
- Use `default=dict` for `additional_data` JSONB objects
- Include proper `__tablename__` attributes (e.g., `checklist_instances`, `checklist_item_responses`)
- Define bidirectional relationships with `back_populates`

### DON'T
- Don't use literal `[]` or `{}` as default values (causes mutable default issues)
- Don't create new enum values beyond those specified
- Don't add database indexes or constraints beyond basic foreign keys (keep it simple for now)
- Don't implement validation logic or business rules (model definition only)
- Don't create the migration file manually (Alembic will auto-generate it)

## Development Environment

### Start Services

```bash
# Start database and backend
docker-compose up -d db
cd backend
pip install -r requirements.txt  # if not already installed
uvicorn app.main:app --reload --port 8000
```

### Service URLs
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs
- PostgreSQL: localhost:5432

### Required Environment Variables
Ensure `.env` file in backend directory has:
- `DATABASE_URL` - PostgreSQL connection string
- Other existing environment variables from project

### Create Migration After Model Definition

```bash
cd backend
alembic revision --autogenerate -m "Add ChecklistInstance and ChecklistItemResponse models"
alembic upgrade head
```

## Success Criteria

The task is complete when:

1. [ ] `ChecklistInstance` model exists in `backend/app/models/checklist_template.py` with all 12 specified fields
2. [ ] `ChecklistItemResponse` model exists in `backend/app/models/checklist_template.py` with all 10 specified fields
3. [ ] Two status enums defined with correct values (instance: not_started/in_progress/completed/approved, item: pending/passed/failed/na)
4. [ ] All foreign key relationships properly defined with correct table references
5. [ ] JSONB fields use proper defaults (list/dict callables)
6. [ ] Models follow existing project patterns (UUID primary keys, timestamps, relationship definitions)
7. [ ] Code passes Python linting (no syntax errors)
8. [ ] Models can be imported without errors (`from app.models.checklist_template import ChecklistInstance, ChecklistItemResponse`)

## QA Acceptance Criteria

**CRITICAL**: These criteria must be verified by the QA Agent before sign-off.

### Unit Tests
| Test | File | What to Verify |
|------|------|----------------|
| Model Instantiation | `backend/tests/test_models_checklist_instance.py` | ChecklistInstance and ChecklistItemResponse can be instantiated with required fields |
| Default Values | `backend/tests/test_models_checklist_instance.py` | UUID auto-generated, timestamps set, JSONB defaults to list/dict, status defaults correct |
| Enum Values | `backend/tests/test_models_checklist_instance.py` | Status enums contain exact specified values |
| Relationships | `backend/tests/test_models_checklist_instance.py` | Bidirectional relationships work correctly |

### Integration Tests
| Test | Services | What to Verify |
|------|----------|----------------|
| Database Table Creation | backend ↔ PostgreSQL | Alembic migration creates tables with correct schema (columns, types, constraints) |
| Foreign Key Constraints | backend ↔ PostgreSQL | Foreign keys properly reference existing tables (projects, users, checklist_templates, construction_areas) |
| JSONB Storage | backend ↔ PostgreSQL | JSONB columns can store and retrieve arrays/objects correctly |

### End-to-End Tests
| Flow | Steps | Expected Outcome |
|------|-------|------------------|
| Migration Execution | 1. Run `alembic revision --autogenerate` 2. Run `alembic upgrade head` | Migration file created, tables added to database without errors |
| Model Import | 1. Start Python REPL 2. Import models | `from app.models.checklist_template import ChecklistInstance, ChecklistItemResponse` succeeds |

### Database Verification (if applicable)
| Check | Query/Command | Expected |
|-------|---------------|----------|
| Tables Exist | `\dt checklist_instances` in psql | Table `checklist_instances` exists |
| Tables Exist | `\dt checklist_item_responses` in psql | Table `checklist_item_responses` exists |
| Columns Correct | `\d checklist_instances` in psql | All 12 columns present with correct types (UUID, ENUM, JSONB, TIMESTAMP) |
| Columns Correct | `\d checklist_item_responses` in psql | All 10 columns present with correct types |
| Foreign Keys | `\d checklist_instances` in psql | Foreign keys to projects, users, checklist_templates, construction_areas visible |
| Foreign Keys | `\d checklist_item_responses` in psql | Foreign keys to checklist_instances, checklist_item_templates, users visible |

### Code Quality Verification
| Check | Command | Expected |
|-------|---------|----------|
| Python Syntax | `python -m py_compile backend/app/models/checklist_template.py` | No syntax errors |
| Import Check | `python -c "from app.models.checklist_template import ChecklistInstance, ChecklistItemResponse"` (from backend dir) | No import errors |
| Enum Values | Python REPL check enum members | Instance status enum has 4 values, item status enum has 4 values |

### QA Sign-off Requirements
- [ ] Both models defined with all specified fields
- [ ] Status enums have correct values
- [ ] JSONB defaults use callables (not literals)
- [ ] Foreign key relationships properly defined
- [ ] Migration file created successfully via Alembic
- [ ] Migration applies without errors (`alembic upgrade head`)
- [ ] Database tables created with correct schema
- [ ] Models can be imported without errors
- [ ] No syntax errors or linting issues
- [ ] Code follows existing project patterns
- [ ] All timestamps fields present (created_at, updated_at, started_at, completed_at, responded_at)
- [ ] UUID fields use `UUID(as_uuid=True)` type
