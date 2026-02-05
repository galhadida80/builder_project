# Specification: Create Pydantic Schemas for Checklist Template Operations

## Overview

This task implements comprehensive Pydantic schemas for checklist template operations in the backend API. The schemas support a three-level nested hierarchy (ChecklistTemplate → ChecklistSubSection → ChecklistItemTemplate) and provide bilingual support (English/Hebrew) for a construction project management system. These schemas will enable CRUD operations for checklist templates, runtime instances, and user responses with full frontend compatibility via automatic camelCase conversion.

## Workflow Type

**Type**: feature

**Rationale**: This is a new feature addition that creates a complete schema layer for checklist template functionality. It follows the standard CRUD pattern used throughout the codebase and integrates with the existing schema infrastructure, enabling new API endpoints for checklist template management.

## Task Scope

### Services Involved
- **backend** (primary) - FastAPI service where new Pydantic schemas will be created

### This Task Will:
- [ ] Create `backend/app/schemas/checklist_template.py` with 5 schema groups (20 total schemas)
- [ ] Implement ChecklistItemTemplate schemas (Base/Create/Update/Response)
- [ ] Implement ChecklistSubSection schemas with nested item relationships (Base/Create/Update/Response)
- [ ] Implement ChecklistTemplate schemas with nested sub_section relationships (Base/Create/Update/Response)
- [ ] Implement ChecklistInstance schemas for runtime template instances (Create/Update/Response)
- [ ] Implement ChecklistItemResponse schemas for user responses to checklist items (Create/Update/Response)
- [ ] Apply field validation using sanitize_string for all text fields
- [ ] Support bilingual fields (name, name_he) throughout schema hierarchy
- [ ] Ensure nested response models maintain hierarchical structure with default empty lists
- [ ] Update `backend/app/schemas/__init__.py` to export new schemas

### Out of Scope:
- Database models (will be created in subsequent task)
- API endpoints (will be created in subsequent task)
- Frontend integration (schemas only prepare backend data layer)
- Alembic migrations (dependent on database models)
- Business logic or CRUD operations

## Service Context

### Backend

**Tech Stack:**
- Language: Python
- Framework: FastAPI
- ORM: SQLAlchemy
- Schema Validation: Pydantic v2
- Type System: Python 3.10+ (Type | None syntax)

**Entry Point:** `app/main.py`

**How to Run:**
```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

**Port:** 8000

**Key Directories:**
- `app/schemas/` - Pydantic schema definitions
- `app/core/validators.py` - Shared validation utilities and CamelCaseModel base class

## Files to Modify

| File | Service | What to Change |
|------|---------|---------------|
| `backend/app/schemas/__init__.py` | backend | Add imports for all new checklist template schemas to make them available for API routes |

## Files to Create

| File | Service | Purpose |
|------|---------|---------|
| `backend/app/schemas/checklist_template.py` | backend | New file containing all 5 schema groups (20 schemas total) for checklist template operations |

## Files to Reference

These files show patterns to follow:

| File | Pattern to Copy |
|------|----------------|
| `backend/app/schemas/contact.py` | Standard Base/Create/Update/Response pattern, field validation with sanitize_string |
| `backend/app/schemas/equipment.py` | Nested response models with list relationships (EquipmentResponse.checklists), default empty lists |
| `backend/app/core/validators.py` | CamelCaseModel base class, sanitize_string function, field length constants |

## Patterns to Follow

### 1. CRUD Schema Pattern

From `backend/app/schemas/contact.py`:

```python
# Base schema - shared fields
class ContactBase(BaseModel):
    contact_type: str = Field(min_length=1, max_length=50)
    company_name: str | None = Field(default=None, max_length=MAX_NAME_LENGTH)
    contact_name: str = Field(min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)

    @field_validator('contact_type', 'company_name', 'contact_name', mode='before')
    @classmethod
    def sanitize_text(cls, v: str | None) -> str | None:
        return sanitize_string(v)

# Create schema - inherits from Base
class ContactCreate(ContactBase):
    pass

# Update schema - all fields optional
class ContactUpdate(BaseModel):
    contact_type: str | None = Field(default=None, min_length=1, max_length=50)
    company_name: str | None = Field(default=None, max_length=MAX_NAME_LENGTH)

    @field_validator('contact_type', 'company_name', mode='before')
    @classmethod
    def sanitize_text(cls, v: str | None) -> str | None:
        return sanitize_string(v)

# Response schema - uses CamelCaseModel for frontend
class ContactResponse(CamelCaseModel):
    id: UUID
    project_id: UUID
    contact_type: str
    company_name: str | None = None
    created_at: datetime
```

**Key Points:**
- BaseModel for Base/Create/Update schemas
- CamelCaseModel for Response schemas (converts snake_case → camelCase)
- Create inherits from Base (DRY principle)
- Update has all fields optional with defaults
- Response includes id, timestamps, and relationships

### 2. Nested Response Models

From `backend/app/schemas/equipment.py`:

```python
class EquipmentResponse(CamelCaseModel):
    id: UUID
    project_id: UUID
    name: str
    status: str
    created_at: datetime
    updated_at: datetime
    created_by: UserResponse | None = None
    checklists: list[ChecklistResponse] = []  # Nested list with default
```

**Key Points:**
- Use `list[Type]` syntax (not `List[Type]`)
- Default to empty list `= []` for nested collections
- Type | None for optional relationships (not Optional[Type])

### 3. Field Validation

From `backend/app/schemas/contact.py` and `backend/app/core/validators.py`:

```python
from app.core.validators import (
    sanitize_string,
    MIN_NAME_LENGTH, MAX_NAME_LENGTH, MAX_DESCRIPTION_LENGTH,
    CamelCaseModel
)

# Apply to multiple fields in single decorator
@field_validator('name', 'name_he', 'description', mode='before')
@classmethod
def sanitize_text(cls, v: str | None) -> str | None:
    return sanitize_string(v)
```

**Key Points:**
- Import constants from validators module
- Use mode='before' to sanitize before Pydantic validation
- Apply sanitize_string to all text fields
- List multiple fields in single decorator

### 4. CamelCaseModel Configuration

From `backend/app/core/validators.py`:

```python
class CamelCaseModel(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,  # Allow ORM model conversion
        alias_generator=to_camel,  # snake_case → camelCase
        populate_by_name=True,  # Accept both naming conventions
    )
```

**Key Points:**
- All Response schemas inherit from CamelCaseModel
- Automatic case conversion for frontend compatibility
- from_attributes=True enables SQLAlchemy model serialization

## Requirements

### Functional Requirements

1. **ChecklistItemTemplate Schemas**
   - Description: Individual checklist item templates that can be reused across multiple checklists
   - Fields: id, name, name_he, description, description_he, item_type, is_required, default_value
   - Acceptance: All 4 schemas (Base/Create/Update/Response) created with proper validation

2. **ChecklistSubSection Schemas**
   - Description: Sections that group related checklist items, supporting nested structure
   - Fields: id, name, name_he, order, items (List[ChecklistItemTemplateResponse])
   - Acceptance: Nested items relationship with default empty list, all 4 schemas created

3. **ChecklistTemplate Schemas**
   - Description: Top-level templates containing nested sub-sections
   - Fields: id, name, name_he, level, group_name, sub_sections (List[ChecklistSubSectionResponse])
   - Acceptance: Three-level hierarchy maintained, bilingual support, all 4 schemas created

4. **ChecklistInstance Schemas**
   - Description: Runtime instances created from templates for specific projects/equipment
   - Fields: id, template_id, project_id, equipment_id, status, created_at
   - Acceptance: Only Create/Update/Response schemas (no Base), proper foreign key references

5. **ChecklistItemResponse Schemas**
   - Description: User responses to individual checklist items during execution
   - Fields: id, instance_id, item_template_id, value, is_completed, completed_by, completed_at, notes
   - Acceptance: Only Create/Update/Response schemas, tracks completion state and user

### Technical Requirements

1. **Type System**
   - Use Python 3.10+ syntax: `str | None` instead of `Optional[str]`
   - Use `list[Type]` instead of `List[Type]`
   - Use `datetime` for timestamps (not date unless specifically a date field)
   - Use `UUID` for all ID fields

2. **Validation**
   - Apply sanitize_string to all text fields (name, name_he, description, notes)
   - Use Field() with min_length/max_length constraints from validators module
   - Use @field_validator with mode='before'

3. **Frontend Compatibility**
   - All Response schemas must inherit from CamelCaseModel
   - All Base/Create/Update schemas use BaseModel
   - Nested lists must default to empty list: `= []`

### Edge Cases

1. **Empty Nested Collections** - Response models must default nested lists to [] to prevent None errors in frontend
2. **Optional Bilingual Fields** - Both name and name_he required for templates, but description_he can be optional
3. **Circular Imports** - Forward references may be needed for nested schemas (use string type hints if needed)
4. **Validation Order** - sanitize_string must run before Pydantic's built-in validation (mode='before')

## Implementation Notes

### DO
- Follow the exact Base/Create/Update/Response pattern from `contact.py`
- Import and reuse constants from `validators.py` (MIN_NAME_LENGTH, MAX_NAME_LENGTH, etc.)
- Use `list[ChecklistItemTemplateResponse] = []` for nested collections in Response schemas
- Apply sanitize_string to all text fields using @field_validator
- Use CamelCaseModel for all Response schemas
- Include created_at, updated_at timestamps in all Response schemas
- Support both `name` and `name_he` fields for bilingual content

### DON'T
- Don't use `Optional[Type]` - use `Type | None` instead (Python 3.10+ syntax)
- Don't use `List[Type]` - use `list[Type]` instead
- Don't forget to default nested lists to `[]` in Response schemas
- Don't create custom validators when sanitize_string already exists
- Don't use BaseModel for Response schemas - use CamelCaseModel
- Don't create database models in this task (out of scope)
- Don't skip field validation - all text fields need sanitize_string

## Development Environment

### Start Services

```bash
# Start backend service
cd backend
uvicorn app.main:app --reload --port 8000

# Or use Docker Compose
docker-compose up backend
```

### Service URLs
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

### Required Environment Variables
- `DATABASE_URL`: PostgreSQL connection string (from .env)
- No additional variables needed for schema creation

## Schema Structure Reference

### Required Schema Groups

```
1. ChecklistItemTemplate
   - ChecklistItemTemplateBase
   - ChecklistItemTemplateCreate (inherits Base)
   - ChecklistItemTemplateUpdate (all fields optional)
   - ChecklistItemTemplateResponse (CamelCaseModel)

2. ChecklistSubSection
   - ChecklistSubSectionBase
   - ChecklistSubSectionCreate (inherits Base)
   - ChecklistSubSectionUpdate (all fields optional)
   - ChecklistSubSectionResponse (CamelCaseModel, includes items: list[ChecklistItemTemplateResponse] = [])

3. ChecklistTemplate
   - ChecklistTemplateBase
   - ChecklistTemplateCreate (inherits Base)
   - ChecklistTemplateUpdate (all fields optional)
   - ChecklistTemplateResponse (CamelCaseModel, includes sub_sections: list[ChecklistSubSectionResponse] = [])

4. ChecklistInstance
   - ChecklistInstanceCreate
   - ChecklistInstanceUpdate
   - ChecklistInstanceResponse (CamelCaseModel)

5. ChecklistItemResponse
   - ChecklistItemResponseCreate
   - ChecklistItemResponseUpdate
   - ChecklistItemResponseResponse (CamelCaseModel)
```

## Success Criteria

The task is complete when:

1. [ ] File `backend/app/schemas/checklist_template.py` created with all 20 schemas
2. [ ] All schemas follow Base/Create/Update/Response pattern (where applicable)
3. [ ] All Response schemas inherit from CamelCaseModel for frontend compatibility
4. [ ] All text fields have sanitize_string validation applied
5. [ ] Nested response models use `list[Type] = []` with default empty lists
6. [ ] Bilingual support (name, name_he) implemented in template schemas
7. [ ] Type hints use Python 3.10+ syntax (Type | None, list[Type])
8. [ ] All imports added to `backend/app/schemas/__init__.py`
9. [ ] No console errors when importing the new schema module
10. [ ] File follows existing code style and conventions from reference schemas

## QA Acceptance Criteria

**CRITICAL**: These criteria must be verified by the QA Agent before sign-off.

### Unit Tests
| Test | File | What to Verify |
|------|------|----------------|
| Schema Import Test | Python REPL | Import all schemas from checklist_template module without errors |
| Schema Instantiation | Python REPL | Create instances of each schema with valid data |
| Validation Test | Python REPL | Verify field validators reject invalid data (XSS, empty strings) |
| CamelCase Conversion | Python REPL | Verify Response schemas convert snake_case → camelCase |
| Nested Structure | Python REPL | Verify ChecklistTemplateResponse properly nests sub_sections and items |

### Integration Tests
| Test | Services | What to Verify |
|------|----------|----------------|
| Schema Export | backend | All schemas accessible via `from app.schemas import ChecklistTemplate*` |
| Validators Import | backend | All required validators and constants imported correctly |
| Type Checking | backend | Run mypy or equivalent to verify type hints are valid |

### Code Quality Verification
| Check | Command | Expected |
|-------|---------|----------|
| File exists | `ls backend/app/schemas/checklist_template.py` | File present |
| Import check | `python -c "from app.schemas.checklist_template import *"` | No errors |
| Schema count | `grep -c "^class.*:" backend/app/schemas/checklist_template.py` | At least 20 schemas |
| CamelCaseModel usage | `grep -c "CamelCaseModel" backend/app/schemas/checklist_template.py` | 8 occurrences (all Response schemas) |
| Validator usage | `grep -c "@field_validator" backend/app/schemas/checklist_template.py` | Multiple occurrences |

### Manual Verification Checklist
- [ ] All 5 schema groups present (ChecklistItemTemplate, ChecklistSubSection, ChecklistTemplate, ChecklistInstance, ChecklistItemResponse)
- [ ] Each applicable group has Base/Create/Update/Response variants
- [ ] All Response schemas inherit from CamelCaseModel
- [ ] All Base/Create/Update schemas inherit from BaseModel
- [ ] Nested relationships use `list[Type] = []` syntax
- [ ] Field validators apply sanitize_string to text fields
- [ ] Bilingual fields (name, name_he) present in template schemas
- [ ] Type hints follow Python 3.10+ syntax (Type | None)
- [ ] Constants imported from validators module (MIN_NAME_LENGTH, etc.)
- [ ] No circular import errors
- [ ] Code follows PEP 8 style guidelines
- [ ] Imports organized: stdlib → third-party → local
- [ ] File includes proper docstrings or comments where complex

### QA Sign-off Requirements
- [ ] All manual verification items checked
- [ ] All unit tests pass
- [ ] Schema import successful in Python REPL
- [ ] No linting errors (black, pylint compatible)
- [ ] Type checking passes (mypy compatible)
- [ ] Code follows established patterns from reference files
- [ ] No security vulnerabilities (XSS protection via sanitize_string)
- [ ] No regressions in existing schema imports
- [ ] Documentation comments added where needed
