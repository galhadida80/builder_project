# Specification: Create EquipmentApprovalSubmission Model

## Overview

This task creates two SQLAlchemy models (`EquipmentApprovalSubmission` and `EquipmentApprovalDecision`) to support the equipment approval workflow in the builder project management system. These models enable tracking equipment submissions through a multi-stage approval process with flexible data storage for specifications, documents, and checklists, while maintaining a complete audit trail of approval decisions by different consultant types.

## Workflow Type

**Type**: feature

**Rationale**: This is a new feature that adds database models for equipment approval tracking. It extends the existing equipment management system with submission and decision tracking capabilities, requiring new model definitions, enums, and database relationships.

## Task Scope

### Services Involved
- **backend** (primary) - Python/FastAPI service where SQLAlchemy models are defined

### This Task Will:
- [ ] Create new file `backend/app/models/equipment_template.py`
- [ ] Define `EquipmentApprovalSubmission` model with UUID, FK relationships, JSONB fields, and status enum
- [ ] Define `EquipmentApprovalDecision` model with UUID, FK relationships, and decision enum
- [ ] Define status enum (`draft`, `pending_review`, `approved`, `rejected`)
- [ ] Define decision enum (`approved`, `rejected`, `revision_requested`)
- [ ] Add proper relationships between models (submission to decisions, submission to projects/users/templates)
- [ ] Update `backend/app/models/__init__.py` to export new models
- [ ] Create Alembic migration for new tables

### Out of Scope:
- Creating `EquipmentTemplate` model (should be done in a separate task)
- Creating `ConsultantType` model (should be done in a separate task)
- API endpoints for equipment approval submissions (future task)
- Frontend components for approval workflow (future task)
- Business logic for approval processing (future task)

## Service Context

### Backend Service

**Tech Stack:**
- Language: Python
- Framework: FastAPI
- ORM: SQLAlchemy (async with asyncpg)
- Database: PostgreSQL
- Migration tool: Alembic
- Key directories: `backend/app/` (application code)

**Entry Point:** `backend/app/`

**How to Run:**
```bash
cd backend
# Install dependencies
pip install -r requirements.txt

# Run migrations
alembic upgrade head

# Start server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Port:** 8000

**Database Migration Commands:**
```bash
# Create migration
alembic revision --autogenerate -m "add equipment approval models"

# Apply migration
alembic upgrade head

# Rollback migration
alembic downgrade -1
```

## Files to Modify

| File | Service | What to Change |
|------|---------|---------------|
| `backend/app/models/equipment_template.py` | backend | Create new file with `EquipmentApprovalSubmission` and `EquipmentApprovalDecision` models |
| `backend/app/models/__init__.py` | backend | Add imports and exports for new models |

## Files to Reference

These files show patterns to follow:

| File | Pattern to Copy |
|------|----------------|
| `backend/app/models/equipment.py` | SQLAlchemy model structure with UUID, JSONB fields, enums, timestamps, and relationships |
| `backend/app/models/approval.py` | Approval workflow pattern with status tracking and user attribution |
| `backend/app/models/user.py` | Foreign key relationships to User model |
| `backend/app/models/project.py` | Foreign key relationships to Project model, enum definitions |

## Patterns to Follow

### SQLAlchemy 2.0 Model Pattern

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
    UNDER_REVIEW = "under_review"
    APPROVED = "approved"
    REJECTED = "rejected"


class Equipment(Base):
    __tablename__ = "equipment"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    specifications: Mapped[dict | None] = mapped_column(JSONB, default=dict)
    status: Mapped[str] = mapped_column(String(50), default=ApprovalStatus.DRAFT.value)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))

    project = relationship("Project", back_populates="equipment")
    created_by = relationship("User", foreign_keys=[created_by_id])
```

**Key Points:**
- Use `Mapped[Type]` type annotations for all columns
- UUID primary keys with `uuid.uuid4` default
- JSONB for flexible data structures (`specifications`, `documents`, etc.)
- Enums inherit from both `str` and `Enum`
- Foreign keys use `ForeignKey()` with `ondelete="CASCADE"`
- Timestamps use `datetime.utcnow` for default and `onupdate`
- Relationships use `relationship()` with `back_populates` or `foreign_keys`
- Nullable fields use `Type | None` union syntax

### Approval Decision Pattern

From `backend/app/models/approval.py`:

```python
class ApprovalStep(Base):
    __tablename__ = "approval_steps"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    approval_request_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("approval_requests.id", ondelete="CASCADE"))
    status: Mapped[str] = mapped_column(String(50), default="pending")
    approved_by_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    approved_at: Mapped[datetime | None] = mapped_column(DateTime)
    comments: Mapped[str | None] = mapped_column(Text)

    approval_request = relationship("ApprovalRequest", back_populates="steps")
    approved_by = relationship("User", foreign_keys=[approved_by_id])
```

**Key Points:**
- Track who made the decision (`approved_by_id` FK to users)
- Track when decision was made (`approved_at` timestamp)
- Store optional comments as Text field
- Link back to parent entity via FK with CASCADE delete

## Requirements

### Functional Requirements

1. **EquipmentApprovalSubmission Model**
   - Description: Represents an equipment submission for approval, containing all data needed for consultant review including specifications, documents, and checklist responses
   - Fields:
     - `id`: UUID primary key
     - `project_id`: FK to Project (CASCADE delete)
     - `template_id`: FK to EquipmentTemplate (if exists, otherwise nullable)
     - `name`: str(255) - Equipment identifier
     - `specifications`: JSONB - Filled specification values
     - `documents`: JSONB - Document references with file IDs
     - `checklist_responses`: JSONB - Filled checklist data
     - `additional_data`: JSONB - Extensible attributes
     - `status`: enum - Current workflow state
     - `submitted_by`: FK to User
     - `submitted_at`: datetime - When submitted for review
     - `created_at`, `updated_at`: timestamps
   - Relationships:
     - To Project (many-to-one)
     - To EquipmentTemplate (many-to-one, if exists)
     - To User (submitted_by)
     - To EquipmentApprovalDecision (one-to-many)
   - Acceptance: Model can be instantiated, saved to database, and queried with all fields and relationships working

2. **EquipmentApprovalDecision Model**
   - Description: Tracks individual approval decisions by consultants for equipment submissions
   - Fields:
     - `id`: UUID primary key
     - `submission_id`: FK to EquipmentApprovalSubmission (CASCADE delete)
     - `consultant_type_id`: FK to ConsultantType (if exists, otherwise nullable)
     - `approver_id`: FK to User
     - `decision`: enum - Approval decision
     - `comments`: Text - Optional decision notes
     - `decided_at`: datetime - When decision was made
   - Relationships:
     - To EquipmentApprovalSubmission (many-to-one)
     - To ConsultantType (many-to-one, if exists)
     - To User (approver)
   - Acceptance: Model can be instantiated, multiple decisions can be created for one submission, and all relationships work

3. **Status Enum**
   - Description: Workflow states for equipment submissions
   - Values: `draft`, `pending_review`, `approved`, `rejected`
   - Acceptance: Enum values can be assigned to submission status field

4. **Decision Enum**
   - Description: Approval decision options for consultants
   - Values: `approved`, `rejected`, `revision_requested`
   - Acceptance: Enum values can be assigned to decision field

### Edge Cases

1. **Missing ConsultantType model** - Make `consultant_type_id` nullable and add a TODO comment indicating dependency
2. **Missing EquipmentTemplate model** - Make `template_id` nullable and add a TODO comment indicating dependency
3. **Orphaned decisions** - Use CASCADE delete so decisions are removed when submission is deleted
4. **Null timestamps** - `submitted_at` and `decided_at` should be nullable until the action occurs
5. **Empty JSONB fields** - Default to empty dict `{}` for JSONB fields to avoid null issues

## Implementation Notes

### DO
- Follow the exact pattern from `equipment.py` for model structure
- Use `Mapped[Type]` annotations for all fields (SQLAlchemy 2.0 style)
- Define enums as classes inheriting from `str, Enum`
- Use JSONB type from `sqlalchemy.dialects.postgresql` for flexible data
- Set default values: `dict` for JSONB, enum values for status/decision
- Use `datetime.utcnow` for timestamp defaults
- Add `ondelete="CASCADE"` to all foreign keys
- Make `consultant_type_id` and `template_id` nullable with `Type | None` if those models don't exist yet
- Add TODO comments for missing model dependencies
- Update `__init__.py` to export new models
- Create Alembic migration after defining models

### DON'T
- Don't use old SQLAlchemy 1.x column definition style
- Don't forget to import all required types (UUID, JSONB, Enum, etc.)
- Don't create the ConsultantType or EquipmentTemplate models in this file (out of scope)
- Don't add API endpoints or business logic (out of scope)
- Don't skip the Alembic migration
- Don't use `nullable=True` when you can use `Type | None` union syntax
- Don't forget CASCADE delete behavior for dependent records

## Development Environment

### Start Services

```bash
# Start database (if using Docker Compose)
docker-compose up -d db

# Or start full stack
docker-compose up -d

# Backend only
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Service URLs
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs
- Alternative docs: http://localhost:8000/redoc

### Required Environment Variables
- `DATABASE_URL`: PostgreSQL connection string (async format: `postgresql+asyncpg://...`)
- `DEBUG`: Set to `True` for development

## Success Criteria

The task is complete when:

1. [ ] File `backend/app/models/equipment_template.py` exists with both models defined
2. [ ] `EquipmentApprovalSubmission` model has all required fields with correct types
3. [ ] `EquipmentApprovalDecision` model has all required fields with correct types
4. [ ] Status enum with 4 values (`draft`, `pending_review`, `approved`, `rejected`) is defined
5. [ ] Decision enum with 3 values (`approved`, `rejected`, `revision_requested`) is defined
6. [ ] All foreign key relationships are defined with proper `ondelete` behavior
7. [ ] All JSONB fields have default values (empty dict)
8. [ ] Timestamps are properly configured with `datetime.utcnow` defaults
9. [ ] Models are exported in `backend/app/models/__init__.py`
10. [ ] Alembic migration is created and runs successfully
11. [ ] No import errors when importing the models
12. [ ] Database tables are created with correct schema
13. [ ] Models follow the exact pattern from existing models (equipment.py, approval.py)

## QA Acceptance Criteria

**CRITICAL**: These criteria must be verified by the QA Agent before sign-off.

### Unit Tests
| Test | File | What to Verify |
|------|------|----------------|
| Model instantiation | `backend/tests/test_models/test_equipment_template.py` | EquipmentApprovalSubmission and EquipmentApprovalDecision can be created with all fields |
| JSONB field defaults | `backend/tests/test_models/test_equipment_template.py` | JSONB fields default to empty dict `{}` |
| Enum values | `backend/tests/test_models/test_equipment_template.py` | Status and decision enums have correct values |
| Relationships | `backend/tests/test_models/test_equipment_template.py` | Foreign key relationships work correctly |

### Integration Tests
| Test | Services | What to Verify |
|------|----------|----------------|
| Database schema | backend ↔ postgresql | Tables are created with correct columns and constraints |
| CASCADE delete | backend ↔ postgresql | Deleting submission removes associated decisions |
| Foreign key constraints | backend ↔ postgresql | FKs to users, projects work correctly |

### Database Verification
| Check | Query/Command | Expected |
|-------|---------------|----------|
| Migration exists | `ls backend/alembic/versions/ | grep equipment_approval` | Migration file exists |
| Migration applied | `alembic current` | Shows latest migration including this one |
| Tables created | `psql -c "\dt"` or check via SQL client | `equipment_approval_submissions` and `equipment_approval_decisions` tables exist |
| Schema correct | `psql -c "\d equipment_approval_submissions"` | All columns present with correct types |
| Enum types created | `psql -c "\dT"` | Custom enum types exist (if using PostgreSQL enum type) |

### Code Quality Checks
| Check | Command | Expected |
|-------|---------|----------|
| Imports work | `python -c "from app.models.equipment_template import EquipmentApprovalSubmission, EquipmentApprovalDecision"` | No import errors |
| Models exportable | `python -c "from app.models import EquipmentApprovalSubmission, EquipmentApprovalDecision"` | Models accessible from __init__ |
| Linting | `flake8 backend/app/models/equipment_template.py` | No linting errors |
| Type checking | `mypy backend/app/models/equipment_template.py` | No type errors |

### QA Sign-off Requirements
- [ ] Both models defined with correct field types
- [ ] All enums defined with correct values
- [ ] Foreign key relationships work
- [ ] JSONB fields accept dict data
- [ ] Timestamps auto-populate
- [ ] Migration runs without errors
- [ ] Tables created in database
- [ ] Models can be imported without errors
- [ ] Code follows existing patterns from equipment.py and approval.py
- [ ] No breaking changes to existing models
- [ ] Documentation/comments added for missing dependencies (ConsultantType, EquipmentTemplate)
