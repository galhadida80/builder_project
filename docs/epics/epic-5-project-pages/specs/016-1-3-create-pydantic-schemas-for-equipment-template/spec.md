# Specification: Create Pydantic Schemas for Equipment Templates

## Overview

Create a comprehensive set of Pydantic schemas in `backend/app/schemas/equipment_template.py` to support equipment template CRUD operations. This includes definition schemas for documents, specifications, and checklist items, as well as full CRUD schema sets for equipment templates, approval submissions, approval decisions, and consultant types. The schemas will follow the existing project patterns for validation, sanitization, and bilingual (English/Hebrew) field support.

## Workflow Type

**Type**: feature

**Rationale**: This is a new feature adding a complete schema module for equipment template management. It requires creating new schemas following established patterns, with no modifications to existing code or database structures.

## Task Scope

### Services Involved
- **backend** (primary) - Create new Pydantic schema definitions for equipment template functionality

### This Task Will:
- [ ] Create `backend/app/schemas/equipment_template.py` with all required schema definitions
- [ ] Implement DocumentDefinition schema with bilingual support and source validation
- [ ] Implement SpecificationDefinition schema with field type validation and conditional options
- [ ] Implement ChecklistItemDefinition schema with file requirement tracking
- [ ] Create CRUD schema triplets (Create/Update/Response) for EquipmentTemplate
- [ ] Create CRUD schema triplets (Create/Update/Response) for EquipmentApprovalSubmission
- [ ] Create CRUD schemas (Create/Response) for EquipmentApprovalDecision
- [ ] Create Response schema for ConsultantType
- [ ] Add proper field validators for text sanitization following project patterns
- [ ] Implement conditional validation for specification options (only valid for select type)

### Out of Scope:
- Database models or migrations for equipment templates
- API endpoint implementations
- Frontend integration or UI components
- Business logic or service layer implementations
- Authentication or authorization logic

## Service Context

### Backend

**Tech Stack:**
- Language: Python
- Framework: FastAPI
- ORM: SQLAlchemy
- Validation: Pydantic v2
- Key directories: app/ (application code)

**Entry Point:** `app/main.py`

**How to Run:**
```bash
# Backend typically runs via Docker Compose
docker-compose up backend

# Or for local development with uvicorn
cd backend
uvicorn app.main:app --reload --port 8000
```

**Port:** 8000

**API Documentation:**
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Files to Modify

| File | Service | What to Change |
|------|---------|---------------|
| `backend/app/schemas/equipment_template.py` | backend | Create new file with all equipment template schemas |

## Files to Reference

These files show patterns to follow:

| File | Pattern to Copy |
|------|----------------|
| `backend/app/schemas/equipment.py` | CRUD schema structure (Base/Create/Update/Response), field validators, ChecklistItem pattern |
| `backend/app/schemas/material.py` | Base/Create/Update pattern with all fields optional in Update |
| `backend/app/schemas/approval.py` | Approval-related schemas, minimal action schemas |
| `backend/app/core/validators.py` | Validation utilities, CamelCaseModel, sanitize_string function, field length constants |

## Patterns to Follow

### 1. CRUD Schema Pattern

From `backend/app/schemas/material.py`:

```python
class MaterialBase(BaseModel):
    name: str = Field(min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)
    # ... other required/optional fields

    @field_validator('name', 'notes', mode='before')
    @classmethod
    def sanitize_text(cls, v: str | None) -> str | None:
        return sanitize_string(v)

class MaterialCreate(MaterialBase):
    pass

class MaterialUpdate(BaseModel):
    # All fields optional with | None
    name: str | None = Field(default=None, min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)
    # ...

class MaterialResponse(CamelCaseModel):
    id: UUID
    project_id: UUID
    name: str
    # ... all fields from base
    status: str
    created_at: datetime
    updated_at: datetime
    created_by: UserResponse | None = None
```

**Key Points:**
- Base class defines the core fields with validation
- Create inherits from Base (or just passes if identical)
- Update has all fields optional (use `| None` and `default=None`)
- Response uses CamelCaseModel for camelCase JSON output
- Response includes metadata: id, timestamps, created_by
- Use modern type hints: `str | None` not `Optional[str]`, `list` not `List`

### 2. Field Validation and Sanitization

From `backend/app/schemas/equipment.py`:

```python
@field_validator('name', 'equipment_type', 'notes', mode='before')
@classmethod
def sanitize_text(cls, v: str | None) -> str | None:
    return sanitize_string(v)
```

**Key Points:**
- Use `@field_validator` decorator with `mode='before'` for pre-processing
- Apply sanitize_string to all user-facing text fields
- List all fields to sanitize in the decorator arguments
- Always use classmethod

### 3. Nested Schema Definitions

From `backend/app/schemas/equipment.py`:

```python
class ChecklistItem(BaseModel):
    id: str = Field(max_length=100)
    label: str = Field(min_length=1, max_length=MAX_NAME_LENGTH)
    is_completed: bool = False
    completed_at: datetime | None = None
    notes: str | None = Field(default=None, max_length=MAX_NOTES_LENGTH)
```

**Key Points:**
- Define nested structures as separate BaseModel classes
- Use clear field names with appropriate defaults
- Apply length constraints with Field()
- Include optional timestamp fields for state tracking

### 4. Constants and Validators

From `backend/app/core/validators.py`:

```python
MIN_NAME_LENGTH = 2
MAX_NAME_LENGTH = 255
MAX_NOTES_LENGTH = 5000

class CamelCaseModel(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
        alias_generator=to_camel,
        populate_by_name=True,
    )
```

**Key Points:**
- Import validation constants from app.core.validators
- Use CamelCaseModel for Response schemas (converts to camelCase for API)
- from_attributes=True enables ORM model conversion
- populate_by_name=True allows both snake_case and camelCase input

## Requirements

### Functional Requirements

1. **DocumentDefinition Schema**
   - Description: Define document structure required for equipment templates
   - Fields:
     - name (str): English document name
     - name_he (str): Hebrew document name
     - description (Optional[str]): Document description
     - source (Literal): One of "consultant", "project_manager", "contractor"
     - required (bool): Whether document is mandatory (default: True)
   - Acceptance: Schema validates source field to only accept the three allowed values, supports bilingual naming

2. **SpecificationDefinition Schema**
   - Description: Define dynamic specification fields for equipment with type validation
   - Fields:
     - name (str): English specification name
     - name_he (str): Hebrew specification name
     - field_type (Literal): One of "text", "number", "boolean", "select", "file"
     - options (Optional[List[str]]): Valid only for "select" type
     - unit (Optional[str]): Unit of measurement for numeric specs
     - required (bool): Whether spec is mandatory (default: True)
   - Acceptance: Schema validates field_type, conditionally validates options only when field_type is "select"

3. **ChecklistItemDefinition Schema**
   - Description: Define checklist items for equipment approval workflow
   - Fields:
     - name (str): English checklist item name
     - name_he (str): Hebrew checklist item name
     - requires_file (bool): Whether file attachment is required (default: False)
   - Acceptance: Schema supports bilingual naming and file requirement flag

4. **EquipmentTemplate CRUD Schemas**
   - Description: Create, Update, and Response schemas for equipment template entities
   - Acceptance: Following Base/Create/Update/Response pattern, includes all template metadata in Response

5. **EquipmentApprovalSubmission CRUD Schemas**
   - Description: Create, Update, and Response schemas for approval submission workflow
   - Acceptance: Supports submission lifecycle with proper field validation

6. **EquipmentApprovalDecision Schemas**
   - Description: Create and Response schemas for approval decisions (no Update needed)
   - Acceptance: Captures decision data with timestamps and comments

7. **ConsultantType Response Schema**
   - Description: Response schema for consultant categorization
   - Acceptance: Returns consultant type metadata in camelCase format

### Edge Cases

1. **Conditional Options Validation** - Options field should only be present and validated when field_type is "select"; add field validator to enforce this rule
2. **Empty Specifications/Documents** - Allow empty lists for documents, specifications, and checklist items in template definitions
3. **Bilingual Field Requirements** - Both name and name_he must be present; consider minimum length validation for both
4. **Hebrew Text Validation** - Ensure sanitize_string properly handles Hebrew characters without corruption
5. **Literal Type Enforcement** - Pydantic will automatically reject invalid Literal values; no custom validator needed

## Implementation Notes

### DO
- Follow the Base/Create/Update/Response pattern exactly as shown in equipment.py and material.py
- Import and use `CamelCaseModel` for all Response schemas
- Import validation constants (`MIN_NAME_LENGTH`, `MAX_NAME_LENGTH`, etc.) from app.core.validators
- Apply `@field_validator` with `sanitize_string` to all user-facing text fields
- Use modern Python type hints: `str | None` instead of `Optional[str]`, `list` instead `List`
- Use `Field()` for length constraints and default values
- Import `UUID`, `datetime` from standard library as needed
- Import `UserResponse` from app.schemas.user for created_by fields in Response schemas
- Use `Literal` from typing for enumerated values (source, field_type)
- Set appropriate defaults: `required=True`, `requires_file=False`

### DON'T
- Don't create database models - this task is schemas only
- Don't implement business logic or validation beyond field-level constraints
- Don't add API endpoints or route handlers
- Don't modify existing schema files
- Don't use old-style Optional[] syntax - use `| None` instead
- Don't forget bilingual fields (name and name_he) on user-facing schemas
- Don't skip text sanitization validators
- Don't make all fields required in Update schemas - they should all be optional

## Development Environment

### Start Services

```bash
# Start all services via Docker Compose
docker-compose up

# Or start backend only
docker-compose up backend

# For local development without Docker
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Service URLs
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

### Required Environment Variables
(No specific environment variables needed for schema definition - this is pure Python code)

### Testing Schemas Locally
```python
# In Python REPL or test script
from backend.app.schemas.equipment_template import DocumentDefinition

# Test valid data
doc = DocumentDefinition(
    name="Safety Certificate",
    name_he="תעודת בטיחות",
    source="consultant",
    required=True
)

# Test invalid source (should raise ValidationError)
doc = DocumentDefinition(
    name="Test",
    name_he="בדיקה",
    source="invalid_source"  # This will fail
)
```

## Success Criteria

The task is complete when:

1. [ ] File `backend/app/schemas/equipment_template.py` exists with all required schemas
2. [ ] DocumentDefinition schema validates source field with Literal type (3 allowed values)
3. [ ] SpecificationDefinition schema validates field_type with Literal type (5 allowed values)
4. [ ] ChecklistItemDefinition schema includes bilingual fields and requires_file flag
5. [ ] All CRUD schema sets (EquipmentTemplate, EquipmentApprovalSubmission, EquipmentApprovalDecision, ConsultantType) are implemented
6. [ ] All text fields have proper sanitization validators using @field_validator
7. [ ] All Response schemas extend CamelCaseModel for JSON serialization
8. [ ] Schema imports are correct and follow project conventions
9. [ ] No syntax errors - Python can import the module successfully
10. [ ] Schemas follow the exact pattern from existing equipment.py and material.py files
11. [ ] Bilingual support (name/name_he) is present on all user-facing schemas
12. [ ] Default values are set correctly (required=True, requires_file=False)

## QA Acceptance Criteria

**CRITICAL**: These criteria must be verified by the QA Agent before sign-off.

### Unit Tests
| Test | File | What to Verify |
|------|------|----------------|
| Schema Import | `backend/app/schemas/equipment_template.py` | Module imports without errors |
| DocumentDefinition Validation | Test script | Valid source values pass, invalid values raise ValidationError |
| SpecificationDefinition Validation | Test script | Valid field_type values pass, invalid values raise ValidationError |
| Bilingual Fields | Test script | Both name and name_he are required and accepted |
| Default Values | Test script | required=True and requires_file=False defaults are applied |
| Sanitization | Test script | Text fields are properly sanitized (XSS patterns removed) |
| CamelCase Conversion | Test script | Response schemas convert snake_case to camelCase |

### Integration Tests
| Test | Services | What to Verify |
|------|----------|----------------|
| Schema-Model Compatibility | backend | Response schemas can serialize SQLAlchemy models (if models exist) |
| Schema-API Compatibility | backend | Schemas can be used in FastAPI endpoint type hints without errors |

### End-to-End Tests
| Flow | Steps | Expected Outcome |
|------|-------|------------------|
| Schema Validation Flow | 1. Import schemas 2. Create instances with valid data 3. Attempt invalid data | Valid data creates instances, invalid data raises ValidationError |

### Browser Verification (if frontend)
Not applicable - backend-only task with no UI changes.

### Database Verification (if applicable)
Not applicable - no database changes in this task.

### Code Quality Checks
| Check | Command | Expected |
|-------|---------|----------|
| Python syntax | `python -m py_compile backend/app/schemas/equipment_template.py` | No errors |
| Import check | `python -c "from app.schemas.equipment_template import *"` | Successful import |
| Type checking | `mypy backend/app/schemas/equipment_template.py` (if configured) | No type errors |

### QA Sign-off Requirements
- [ ] All schemas defined as specified in requirements
- [ ] Schemas follow project patterns (Base/Create/Update/Response)
- [ ] Literal types properly restrict enumerated values
- [ ] Bilingual fields (name/name_he) present on all user-facing schemas
- [ ] Text sanitization validators applied to all text fields
- [ ] CamelCaseModel used for all Response schemas
- [ ] Modern Python type hints used throughout (str | None, not Optional[str])
- [ ] Appropriate defaults set (required=True, requires_file=False)
- [ ] No syntax errors - Python can parse and import the file
- [ ] Code follows established patterns from equipment.py and material.py
- [ ] No regressions in existing schema imports
- [ ] Documentation strings added for complex schemas (optional but recommended)
