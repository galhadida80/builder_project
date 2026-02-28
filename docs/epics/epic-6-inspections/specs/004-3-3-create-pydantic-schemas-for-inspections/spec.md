# Specification: Create Pydantic Schemas for Inspections

## Overview

This task creates comprehensive Pydantic schemas for the inspection system in the Builder Project backend. The schemas will support CRUD operations for inspection consultant types, stage templates, project inspections, and inspection findings. These schemas enable API validation, serialization, and camelCase conversion for frontend consumption, following the established CRUD pattern used throughout the application.

## Workflow Type

**Type**: feature

**Rationale**: This is a new feature that adds a complete set of schemas for the inspection subsystem. It follows the standard CRUD pattern established in the codebase and introduces new functionality for managing inspections, consultant types, stages, and findings.

## Task Scope

### Services Involved
- **backend** (primary) - Python/FastAPI service where schemas will be created

### This Task Will:
- [ ] Create `backend/app/schemas/inspection_template.py` with all required schemas
- [ ] Implement InspectionConsultantTypeResponse schema
- [ ] Implement InspectionStageTemplate schemas (Base/Create/Update/Response)
- [ ] Implement ProjectInspection schemas (Create/Update/Response)
- [ ] Implement InspectionFinding schemas (Create/Update/Response)
- [ ] Create nested response models (InspectionConsultantTypeWithStages, ProjectInspectionWithFindings)
- [ ] Add proper imports to `backend/app/schemas/__init__.py`
- [ ] Apply validation patterns (sanitize_string, field validators)
- [ ] Support bilingual fields (name/name_he) for Hebrew localization

### Out of Scope:
- Database models for inspections (separate task)
- API endpoints for inspection operations
- Frontend components for inspections
- Migration scripts for database schema
- Business logic for inspection workflows

## Service Context

### Backend

**Tech Stack:**
- Language: Python 3.11+
- Framework: FastAPI
- ORM: SQLAlchemy
- Schema Validation: Pydantic v2
- Key directories: `app/` (application code)

**Entry Point:** `backend/app/main.py`

**How to Run:**
```bash
cd backend
# Install dependencies
pip install -r requirements.txt
# Run development server
uvicorn app.main:app --reload --port 8000
```

**Port:** 8000

**API Documentation:** http://localhost:8000/docs

## Files to Modify

| File | Service | What to Change |
|------|---------|---------------|
| `backend/app/schemas/inspection_template.py` | backend | Create new file with all inspection schemas |
| `backend/app/schemas/__init__.py` | backend | Add imports for new inspection schemas |

## Files to Reference

These files show patterns to follow:

| File | Pattern to Copy |
|------|----------------|
| `backend/app/schemas/equipment.py` | CRUD schema pattern (Base/Create/Update/Response) |
| `backend/app/schemas/contact.py` | Field validation with sanitize_string |
| `backend/app/core/validators.py` | CamelCaseModel base class and validation utilities |
| `backend/app/models/equipment.py` | Enum patterns for status fields |

## Patterns to Follow

### Pattern 1: CRUD Schema Structure

From `backend/app/schemas/contact.py`:

```python
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field, field_validator
from app.core.validators import (
    sanitize_string,
    MIN_NAME_LENGTH, MAX_NAME_LENGTH,
    CamelCaseModel
)

class EntityBase(BaseModel):
    name: str = Field(min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)
    # Shared fields for Create

    @field_validator('name', mode='before')
    @classmethod
    def sanitize_text(cls, v: str | None) -> str | None:
        return sanitize_string(v)

class EntityCreate(EntityBase):
    pass

class EntityUpdate(BaseModel):
    # All fields optional for PATCH operations
    name: str | None = Field(default=None, min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)

    @field_validator('name', mode='before')
    @classmethod
    def sanitize_text(cls, v: str | None) -> str | None:
        return sanitize_string(v)

class EntityResponse(CamelCaseModel):
    id: UUID
    name: str
    created_at: datetime
```

**Key Points:**
- Base class contains shared fields, used by Create
- Update class has all fields optional (for PATCH operations)
- Response class inherits from CamelCaseModel for API serialization
- Use field_validator with mode='before' for sanitization

### Pattern 2: CamelCase Conversion

From `backend/app/core/validators.py`:

```python
class CamelCaseModel(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
        alias_generator=to_camel,
        populate_by_name=True,
    )
```

**Key Points:**
- All Response schemas must inherit from CamelCaseModel
- Converts snake_case field names to camelCase for API responses
- `from_attributes=True` allows loading from ORM models
- `populate_by_name=True` allows both snake_case and camelCase input

### Pattern 3: Nested Relationships

From `backend/app/schemas/equipment.py`:

```python
class EquipmentResponse(CamelCaseModel):
    id: UUID
    project_id: UUID
    name: str
    created_at: datetime
    created_by: UserResponse | None = None
    checklists: list[ChecklistResponse] = []
```

**Key Points:**
- Nested objects use imported response schemas
- Use `list[ResponseType]` for one-to-many relationships
- Default empty list for collections
- Optional relationships use `| None`

### Pattern 4: Field Validation

From `backend/app/schemas/contact.py`:

```python
@field_validator('name', 'description', mode='before')
@classmethod
def sanitize_text(cls, v: str | None) -> str | None:
    return sanitize_string(v)
```

**Key Points:**
- Validate multiple fields in one decorator
- Use `mode='before'` to sanitize before Pydantic validation
- Import sanitize_string from app.core.validators

## Requirements

### Functional Requirements

1. **InspectionConsultantTypeResponse Schema**
   - Description: Response schema for consultant type data
   - Fields: id (UUID), name (str), name_he (str), category (str)
   - Acceptance: Schema validates consultant type responses with bilingual support

2. **InspectionStageTemplate CRUD Schemas**
   - Description: Full CRUD schema set for inspection stage templates
   - Schemas: Base, Create, Update, Response
   - Fields: Standard template fields with ordering and description
   - Acceptance: Complete CRUD operations supported with proper validation

3. **ProjectInspection CRUD Schemas**
   - Description: Schemas for managing project inspections
   - Schemas: Create, Update, Response
   - Fields: stage_id, status, scheduled_date, project_id
   - Acceptance: Create/update project inspections with proper field validation

4. **InspectionFinding CRUD Schemas**
   - Description: Schemas for inspection findings/issues
   - Schemas: Create, Update, Response
   - Fields: inspection_id, finding_type, severity, description, status
   - Acceptance: Track inspection findings with proper categorization

5. **Nested Response Models**
   - Description: Composite schemas with related data
   - InspectionConsultantTypeWithStages: Consultant type + stages list
   - ProjectInspectionWithFindings: Inspection + stage + findings list
   - Acceptance: Efficiently return related data in single API response

### Edge Cases

1. **Optional Date Fields** - scheduled_date can be None for unscheduled inspections
2. **Empty Nested Lists** - stages and findings lists can be empty, default to []
3. **Bilingual Content** - Both name and name_he required for proper localization
4. **Status Transitions** - Status field should accept string values (consider enum in future)

## Implementation Notes

### DO
- Follow the exact CRUD pattern from `backend/app/schemas/contact.py`
- Import CamelCaseModel from `app.core.validators`
- Apply sanitize_string validation to all text fields
- Use UUID type for all ID fields
- Use `datetime` from Python's datetime module for timestamps
- Use `date` type for scheduled_date field
- Use field_validator with `mode='before'`
- Set proper Field constraints (min_length, max_length)
- Default nested lists to empty lists: `list[Type] = []`
- Use `| None` for optional fields (Python 3.10+ union syntax)
- Import validation constants (MIN_NAME_LENGTH, MAX_NAME_LENGTH, etc.)

### DON'T
- Don't create database models - this task is schemas only
- Don't use `Optional[Type]` - use modern `Type | None` syntax
- Don't forget to add imports to `__init__.py`
- Don't skip field validation on Base and Update schemas
- Don't use BaseModel for Response schemas - must use CamelCaseModel
- Don't create enums yet - use string types for status/category fields

## Development Environment

### Start Services

```bash
# Start backend with hot reload
cd backend
uvicorn app.main:app --reload --port 8000

# Or use Docker Compose for full stack
docker-compose up backend
```

### Service URLs
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

### Required Environment Variables
None required for schema creation (schemas are pure Python classes)

## Success Criteria

The task is complete when:

1. [ ] File `backend/app/schemas/inspection_template.py` exists with all schemas
2. [ ] InspectionConsultantTypeResponse schema correctly defines all fields
3. [ ] InspectionStageTemplate has Base/Create/Update/Response schemas
4. [ ] ProjectInspection has Create/Update/Response schemas
5. [ ] InspectionFinding has Create/Update/Response schemas
6. [ ] InspectionConsultantTypeWithStages properly nests stages list
7. [ ] ProjectInspectionWithFindings properly nests stage and findings
8. [ ] All schemas imported in `backend/app/schemas/__init__.py`
9. [ ] Field validation applied to text fields using sanitize_string
10. [ ] No syntax errors - file can be imported successfully
11. [ ] Response schemas use CamelCaseModel base class
12. [ ] Bilingual fields (name/name_he) included where specified

## QA Acceptance Criteria

**CRITICAL**: These criteria must be verified by the QA Agent before sign-off.

### Unit Tests
| Test | File | What to Verify |
|------|------|----------------|
| Schema Import | `backend/app/schemas/inspection_template.py` | File imports successfully without errors |
| Field Validation | Manual validation | Text fields sanitize input correctly |
| CamelCase Conversion | Pydantic test | Response schemas convert snake_case to camelCase |
| Type Validation | Pydantic test | UUID, date, datetime fields validate correctly |

### Integration Tests
| Test | Services | What to Verify |
|------|----------|----------------|
| Schema Registration | backend | All schemas importable from __init__.py |
| Nested Model Resolution | backend | Nested response models resolve correctly |

### Manual Verification
| Check | Command | Expected |
|-------|---------|----------|
| Import Test | `cd backend && python -c "from app.schemas.inspection_template import *"` | No import errors |
| Schema Count | `grep "^class" backend/app/schemas/inspection_template.py \| wc -l` | At least 10 schema classes |
| Init Export | `grep inspection_template backend/app/schemas/__init__.py` | Import statement present |

### Code Quality Checks
- [ ] All schemas follow naming convention (Base/Create/Update/Response)
- [ ] All Response schemas inherit from CamelCaseModel
- [ ] All text fields have field_validator with sanitize_string
- [ ] UUID type used for all ID fields
- [ ] date type used for scheduled_date
- [ ] datetime type used for created_at/updated_at
- [ ] Nested lists have proper type hints: `list[ResponseType]`
- [ ] Optional fields use `| None` syntax
- [ ] Field constraints use constants from validators module
- [ ] No hardcoded magic numbers for field lengths

### QA Sign-off Requirements
- [ ] All schemas defined according to requirements
- [ ] File structure follows established patterns
- [ ] Imports are correct and complete
- [ ] No syntax or type errors
- [ ] Code follows project conventions
- [ ] Validation patterns properly implemented
- [ ] Nested response models correctly structured
- [ ] Bilingual support properly implemented
- [ ] Ready for database model creation (next task)
- [ ] Ready for API endpoint implementation (future task)
