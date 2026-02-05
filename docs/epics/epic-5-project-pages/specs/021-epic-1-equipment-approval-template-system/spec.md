# Specification: Epic 1 - Equipment Approval Template System

## Overview

Build a flexible equipment approval template system to digitize the "רשימת ציוד לאישור.xlsx" (Equipment Approval List) Excel file. The system will enable dynamic equipment type definitions with customizable technical specifications, required documents, and approval workflows. This implements a two-level architecture: **EquipmentTemplate** defines reusable equipment type schemas, and **EquipmentApprovalRequest** captures user submissions based on those templates.

## Workflow Type

**Type**: feature

**Rationale**: This is a new feature implementation that introduces core domain models, schemas, and APIs for equipment approval workflows. It establishes the foundation for the equipment approval system with dynamic JSONB-based attribute storage, bilingual support, and template-driven architecture.

## Task Scope

### Services Involved
- **backend** (primary) - FastAPI/SQLAlchemy service that will contain the new models, schemas, and CRUD operations
- **frontend** (future integration) - React/TypeScript UI will consume these APIs in subsequent tasks

### This Task Will:
- [x] Create Pydantic schemas for equipment template system in `app/schemas/inspection_template.py`
- [x] Define EquipmentTemplate schema with JSONB support for dynamic technical specifications
- [x] Define EquipmentApprovalRequest schema for user submissions
- [x] Define ConsultantType response schema with bilingual support (English/Hebrew)
- [x] Implement Base/Create/Update/Response pattern following existing codebase conventions
- [x] Apply validation patterns (sanitize_string, field validators) consistent with contact.py and equipment.py
- [x] Update `app/schemas/__init__.py` to export new schemas
- [x] Ensure bilingual field support (name/name_he) for consultant types

### Out of Scope:
- Database models (SQLAlchemy ORM) - covered in separate task
- Alembic migrations - separate task after models
- CRUD API endpoints - separate task after schemas and models
- Frontend UI components - future epic/task
- Excel file import functionality - future task
- Document file upload/storage implementation - future task

## Service Context

### Backend

**Tech Stack:**
- Language: Python 3.10+
- Framework: FastAPI
- ORM: SQLAlchemy
- Schema Validation: Pydantic v2
- Migrations: Alembic
- Database: PostgreSQL

**Entry Point:** `app/main.py`

**How to Run:**
```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

**Port:** 8000

**Key Directories:**
- `app/schemas/` - Pydantic request/response schemas
- `app/models/` - SQLAlchemy ORM models (future task)
- `app/api/v1/` - FastAPI route endpoints (future task)
- `app/core/validators.py` - Shared validation utilities

## Files to Modify

| File | Service | What to Change |
|------|---------|---------------|
| `backend/app/schemas/__init__.py` | backend | Add imports and exports for new inspection template schemas (EquipmentTemplateCreate, EquipmentTemplateUpdate, EquipmentTemplateResponse, EquipmentApprovalRequestCreate, EquipmentApprovalRequestUpdate, EquipmentApprovalRequestResponse, InspectionConsultantTypeResponse) |

## Files to Create

| File | Service | Purpose |
|------|---------|---------|
| `backend/app/schemas/inspection_template.py` | backend | Define all equipment template and approval request Pydantic schemas with JSONB support, validation, and bilingual fields |

## Files to Reference

These files show patterns to follow:

| File | Pattern to Copy |
|------|----------------|
| `backend/app/schemas/contact.py` | Base/Create/Update/Response pattern, @field_validator with mode='before', sanitize_string application, modern type hints (Type \| None) |
| `backend/app/schemas/equipment.py` | JSONB field usage (specifications: dict \| None), nested response models (ChecklistResponse), datetime fields, CamelCaseModel for responses |
| `backend/app/core/validators.py` | CamelCaseModel base class with ConfigDict, sanitize_string function, field constraint constants (MIN_NAME_LENGTH, MAX_NAME_LENGTH, etc.) |

## Patterns to Follow

### Pattern 1: CRUD Schema Structure

From `backend/app/schemas/contact.py` and `backend/app/schemas/equipment.py`:

```python
# Base schema - shared fields, used by Create
class EntityBase(BaseModel):
    name: str = Field(min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)
    description: str | None = Field(default=None, max_length=MAX_DESCRIPTION_LENGTH)

    @field_validator('name', 'description', mode='before')
    @classmethod
    def sanitize_text(cls, v: str | None) -> str | None:
        return sanitize_string(v)

# Create schema - inherits from Base
class EntityCreate(EntityBase):
    pass

# Update schema - all fields optional, separate validation
class EntityUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)
    description: str | None = Field(default=None, max_length=MAX_DESCRIPTION_LENGTH)

    @field_validator('name', 'description', mode='before')
    @classmethod
    def sanitize_text(cls, v: str | None) -> str | None:
        return sanitize_string(v)

# Response schema - uses CamelCaseModel, includes id and timestamps
class EntityResponse(CamelCaseModel):
    id: UUID
    name: str
    description: str | None = None
    created_at: datetime
    updated_at: datetime
```

**Key Points:**
- Base contains shared validation and defaults
- Create inherits Base directly (no modifications needed)
- Update has all fields optional with explicit None defaults
- Response uses CamelCaseModel (converts snake_case → camelCase for frontend)
- Modern Python 3.10+ syntax: `Type | None` instead of `Optional[Type]`

### Pattern 2: Field Validation with sanitize_string

From `backend/app/schemas/contact.py`:

```python
@field_validator('contact_type', 'company_name', 'contact_name', 'role_description', mode='before')
@classmethod
def sanitize_text(cls, v: str | None) -> str | None:
    return sanitize_string(v)
```

**Key Points:**
- Apply `@field_validator` with `mode='before'` to process input before Pydantic validation
- List all text fields in a single decorator
- Always use `sanitize_string` from `app.core.validators` to strip whitespace and remove XSS patterns

### Pattern 3: JSONB Fields for Dynamic Attributes

From `backend/app/schemas/equipment.py`:

```python
class EquipmentBase(BaseModel):
    specifications: dict | None = None  # JSONB in database
```

**Key Points:**
- Use `dict | None` for flexible JSONB storage
- No default value (relies on None)
- Database will store as JSONB for efficient querying
- Frontend can send arbitrary JSON structure

### Pattern 4: CamelCaseModel for API Responses

From `backend/app/core/validators.py` and `backend/app/schemas/equipment.py`:

```python
class CamelCaseModel(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,  # Load from SQLAlchemy models
        alias_generator=to_camel,  # snake_case → camelCase
        populate_by_name=True,  # Accept both naming conventions
    )

class EquipmentResponse(CamelCaseModel):
    id: UUID
    project_id: UUID
    created_at: datetime
```

**Key Points:**
- All Response schemas inherit from CamelCaseModel
- Automatically converts `created_at` → `createdAt` in JSON responses
- `from_attributes=True` enables loading from ORM models
- `populate_by_name=True` allows clients to use either snake_case or camelCase

### Pattern 5: Nested Response Models

From `backend/app/schemas/equipment.py`:

```python
class EquipmentResponse(CamelCaseModel):
    id: UUID
    checklists: list[ChecklistResponse] = []  # Nested relationship
    created_by: UserResponse | None = None
```

**Key Points:**
- Use typed lists: `list[ResponseModel]`
- Default to empty list for collections: `= []`
- Use `| None` for optional single relationships
- Nested models must also inherit CamelCaseModel

### Pattern 6: Bilingual Field Support

From context analysis (required for consultant types):

```python
class InspectionConsultantTypeResponse(CamelCaseModel):
    id: UUID
    name: str  # English name (e.g., "Plumbing Consultant")
    name_he: str  # Hebrew name (e.g., "יועץ אינסטלציה")
```

**Key Points:**
- Include both `name` (English) and `name_he` (Hebrew) fields
- Frontend will select appropriate field based on locale
- Both fields are required (not optional) for consultant types

## Requirements

### Functional Requirements

1. **Equipment Template Schema**
   - Description: Define reusable equipment type templates with dynamic technical specifications
   - Fields:
     - `template_name`: Equipment type name (e.g., "Water Pump", "Generator")
     - `template_name_he`: Hebrew equipment type name (e.g., "משאבת מים")
     - `description`: Optional template description
     - `technical_spec_schema`: JSONB defining expected fields (e.g., `{"flow_rate": "number", "quantity": "number"}`)
     - `required_documents`: List of required document labels
     - `consultant_types`: List of consultant type IDs for approval workflow
   - Acceptance: Schema validates JSONB fields, applies sanitize_string to text fields, exports EquipmentTemplateCreate/Update/Response

2. **Equipment Approval Request Schema**
   - Description: User submission instances following a template structure
   - Fields:
     - `template_id`: UUID reference to EquipmentTemplate
     - `project_id`: UUID reference to project (future relationship)
     - `request_name`: User-provided name for this request
     - `technical_specifications`: JSONB matching template schema (e.g., `{"flow_rate": 50, "quantity": 2}`)
     - `submitted_documents`: List of document file paths
     - `approval_status`: Status enum (pending/approved/rejected)
     - `notes`: Optional notes
   - Acceptance: Schema validates template_id as UUID, JSONB specs field, status field, exports EquipmentApprovalRequestCreate/Update/Response

3. **Consultant Type Schema**
   - Description: Define consultant roles with bilingual support
   - Fields:
     - `id`: UUID identifier
     - `name`: English name (e.g., "Plumbing Consultant")
     - `name_he`: Hebrew name (e.g., "יועץ אינסטלציה")
   - Acceptance: Response schema includes both name and name_he fields, inherits CamelCaseModel, exports InspectionConsultantTypeResponse

4. **Schema Export via __init__.py**
   - Description: Make all new schemas importable from app.schemas
   - Acceptance: `app/schemas/__init__.py` exports EquipmentTemplateCreate, EquipmentTemplateUpdate, EquipmentTemplateResponse, EquipmentApprovalRequestCreate, EquipmentApprovalRequestUpdate, EquipmentApprovalRequestResponse, InspectionConsultantTypeResponse

### Edge Cases

1. **Empty JSONB Fields** - Handle `technical_spec_schema: None` and `technical_specifications: None` gracefully
2. **Invalid UUID References** - Schema should accept UUID types, validation happens at database layer
3. **Bilingual Empty Strings** - Apply sanitize_string to both `name` and `name_he` fields
4. **Large JSONB Objects** - No size limit at schema layer, database handles storage efficiently
5. **List Field Defaults** - Empty lists for `required_documents` and `submitted_documents` default to `[]`

## Implementation Notes

### DO
- Follow the Base/Create/Update/Response pattern from contact.py exactly
- Use `dict | None = None` for JSONB fields (technical_spec_schema, technical_specifications)
- Apply `@field_validator` with `mode='before'` and `sanitize_string` to all text fields
- Import validation constants from validators.py (MIN_NAME_LENGTH, MAX_NAME_LENGTH, etc.)
- Use modern type hints: `str | None` not `Optional[str]`
- Use `list[Type]` not `List[Type]`
- Default list fields to empty lists in response schemas: `documents: list[str] = []`
- Include both `name` and `name_he` fields for bilingual consultant types
- Inherit Response schemas from CamelCaseModel for automatic camelCase conversion
- Use UUID type for id and reference fields
- Use datetime type for timestamp fields

### DON'T
- Don't use Optional[Type] syntax (use Type | None)
- Don't use List[Type] (use list[Type])
- Don't skip sanitize_string validation on text fields
- Don't create new validation functions (reuse sanitize_string from validators.py)
- Don't forget to update __init__.py exports
- Don't add database logic in schemas (pure Pydantic validation only)
- Don't create models in this task (SQLAlchemy models are separate task)

## Development Environment

### Start Services

```bash
# Backend only (schemas don't require running server)
cd backend
uvicorn app.main:app --reload --port 8000
```

### Service URLs
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

### Required Environment Variables
None required for schema creation (Pydantic schemas are pure Python)

## Success Criteria

The task is complete when:

1. [x] `backend/app/schemas/inspection_template.py` exists with all schemas defined
2. [x] EquipmentTemplateBase/Create/Update/Response schemas implemented
3. [x] EquipmentApprovalRequestBase/Create/Update/Response schemas implemented
4. [x] InspectionConsultantTypeResponse schema implemented with name/name_he fields
5. [x] All text fields use @field_validator with sanitize_string
6. [x] JSONB fields defined as `dict | None`
7. [x] Response schemas inherit from CamelCaseModel
8. [x] Modern Python 3.10+ type hints used throughout (Type | None, list[Type])
9. [x] `app/schemas/__init__.py` updated with all new schema exports
10. [x] No syntax errors, imports resolve correctly
11. [x] Schemas follow existing patterns from contact.py and equipment.py

## QA Acceptance Criteria

**CRITICAL**: These criteria must be verified by the QA Agent before sign-off.

### Unit Tests
| Test | File | What to Verify |
|------|------|----------------|
| Schema instantiation | `tests/test_schemas/test_inspection_template.py` | EquipmentTemplateCreate instantiates with valid data |
| JSONB validation | `tests/test_schemas/test_inspection_template.py` | technical_spec_schema accepts dict and None values |
| Field sanitization | `tests/test_schemas/test_inspection_template.py` | sanitize_string strips whitespace and removes XSS patterns |
| Bilingual fields | `tests/test_schemas/test_inspection_template.py` | InspectionConsultantTypeResponse includes name and name_he |

### Integration Tests
| Test | Services | What to Verify |
|------|----------|----------------|
| Schema import | backend | All schemas importable from `app.schemas` |
| CamelCaseModel serialization | backend | Response schemas convert snake_case → camelCase in .model_dump() |

### Code Quality Checks
| Check | Command | Expected |
|-------|---------|----------|
| Python syntax | `python -m py_compile backend/app/schemas/inspection_template.py` | No syntax errors |
| Import resolution | `python -c "from app.schemas import EquipmentTemplateCreate, EquipmentTemplateResponse"` | No import errors |
| Type checking | `mypy backend/app/schemas/inspection_template.py --strict` (if mypy configured) | No type errors |

### Manual Verification
| Check | Steps | Expected Outcome |
|-------|-------|------------------|
| Schema structure | Open `inspection_template.py` in IDE | Base/Create/Update/Response pattern visible for both EquipmentTemplate and EquipmentApprovalRequest |
| Field validators | Search for `@field_validator` | All text fields have sanitize_string validation with mode='before' |
| JSONB fields | Search for `dict \| None` | technical_spec_schema and technical_specifications use dict type |
| CamelCaseModel | Check Response class inheritance | All Response schemas inherit from CamelCaseModel |
| Exports | Check `__init__.py` | All 7 new schemas exported |

### QA Sign-off Requirements
- [x] Schema file created with no syntax errors
- [x] All required schemas implemented (EquipmentTemplate, EquipmentApprovalRequest, InspectionConsultantType)
- [x] Validation patterns applied consistently (sanitize_string on all text fields)
- [x] JSONB fields defined correctly (dict | None)
- [x] Bilingual support implemented (name/name_he in consultant type)
- [x] Response schemas use CamelCaseModel
- [x] Modern Python 3.10+ syntax used throughout
- [x] __init__.py exports all new schemas
- [x] Code follows established patterns from contact.py and equipment.py
- [x] No regressions in existing schema imports

---

## Data Model Reference

### Equipment Types from Excel
The following 11 equipment types should be representable via templates:
1. משאבות (Pumps)
2. גנרטורים (Generators)
3. מאווררים (Fans)
4. מעקות (Railings)
5. לוחות חשמל (Electrical Panels)
6. דלתות (Doors)
7. קירות (Walls)
8. תקרות (Ceilings)
9. רצפות (Floors)
10. חלונות (Windows)
11. מערכות אוורור (Ventilation Systems)

### Standard Hebrew Fields
From Excel file "רשימת ציוד לאישור.xlsx":
- **מפרט טכני** (Technical Specification)
- **מפרט טכני מיוחד** (Special Technical Specification)
- **כמות** (Quantity)
- **ספיקה** (Supply/Flow Rate)

### Consultant Types (Hebrew)
From Excel approval workflow:
- **יועץ אינסטלציה** (Plumbing Consultant)
- **יועץ חשמל** (Electrical Consultant)
- **אדריכל** (Architect)
- **קונסטרוקטור** (Structural Engineer)

### JSONB Schema Example

```json
{
  "technical_spec_schema": {
    "fields": [
      {"name": "flow_rate", "type": "number", "label": "ספיקה", "required": true},
      {"name": "quantity", "type": "integer", "label": "כמות", "required": true},
      {"name": "power_kw", "type": "number", "label": "הספק (KW)", "required": false}
    ]
  }
}
```

### Document Requirements Example

```json
{
  "required_documents": [
    "תעודת תקן",
    "אישור יצרן",
    "תיעוד טכני"
  ]
}
```

---

## Appendix: Schema Implementation Checklist

### EquipmentTemplate Schemas
- [ ] EquipmentTemplateBase with fields: template_name, template_name_he, description, technical_spec_schema (dict | None), required_documents (list), consultant_type_ids (list)
- [ ] EquipmentTemplateCreate inherits EquipmentTemplateBase
- [ ] EquipmentTemplateUpdate with all fields optional
- [ ] EquipmentTemplateResponse inherits CamelCaseModel, adds id, created_at, updated_at
- [ ] Field validators apply sanitize_string to template_name, template_name_he, description

### EquipmentApprovalRequest Schemas
- [ ] EquipmentApprovalRequestBase with fields: template_id (UUID), project_id (UUID), request_name, technical_specifications (dict | None), submitted_documents (list), approval_status, notes
- [ ] EquipmentApprovalRequestCreate inherits EquipmentApprovalRequestBase
- [ ] EquipmentApprovalRequestUpdate with all fields optional
- [ ] EquipmentApprovalRequestResponse inherits CamelCaseModel, adds id, created_at, updated_at, created_by
- [ ] Field validators apply sanitize_string to request_name, notes

### InspectionConsultantType Schema
- [ ] InspectionConsultantTypeResponse inherits CamelCaseModel
- [ ] Fields: id (UUID), name (str), name_he (str), created_at, updated_at

### Exports
- [ ] Add all 7 schemas to `app/schemas/__init__.py`

### Validation
- [ ] All text fields use @field_validator with mode='before' and sanitize_string
- [ ] JSONB fields typed as dict | None
- [ ] UUID fields typed as UUID
- [ ] datetime fields typed as datetime
- [ ] list fields typed as list[Type]
- [ ] Optional fields use Type | None syntax

### Code Quality
- [ ] Imports: uuid.UUID, datetime.datetime, pydantic.BaseModel/Field/field_validator, app.core.validators (sanitize_string, constants, CamelCaseModel)
- [ ] No Optional[] or List[] legacy syntax
- [ ] Consistent field ordering: required fields first, optional fields after
- [ ] Docstrings or comments explaining JSONB field structure
