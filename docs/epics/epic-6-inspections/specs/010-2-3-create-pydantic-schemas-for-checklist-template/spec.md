# Specification: Create Pydantic Schemas for Checklist Templates

## Overview

Create a comprehensive set of Pydantic schemas for checklist template operations in the backend API. This includes five entity groups (ChecklistItemTemplate, ChecklistSubSection, ChecklistTemplate, ChecklistInstance, and ChecklistItemResponse), each with Base/Create/Update/Response variants, supporting a three-level nested hierarchy and bilingual (English/Hebrew) content for the frontend application.

## Workflow Type

**Type**: feature

**Rationale**: This is a new feature addition creating foundational schemas for the checklist template system. It establishes the data contracts between frontend and backend for future checklist functionality.

## Task Scope

### Services Involved
- **backend** (primary) - Creating new Pydantic schemas for API data validation and serialization

### This Task Will:
- [ ] Create `backend/app/schemas/checklist_template.py` with five schema groups
- [ ] Implement Base/Create/Update/Response variants for each entity type
- [ ] Support nested serialization (ChecklistTemplate → ChecklistSubSection → ChecklistItemTemplate)
- [ ] Enable camelCase conversion for frontend JavaScript compatibility
- [ ] Support bilingual content (English and Hebrew fields)

### Out of Scope:
- Database models for checklist templates (separate task)
- API endpoints using these schemas (separate task)
- Frontend TypeScript types (will be generated from these schemas)
- Business logic or service layer implementation

## Service Context

### Backend

**Tech Stack:**
- Language: Python
- Framework: FastAPI
- ORM: SQLAlchemy
- Schema Validation: Pydantic
- Key directories: `app/` (application code)

**Entry Point:** `app/main.py`

**How to Run:**
```bash
# Backend runs on port 8000
cd backend
uvicorn app.main:app --reload
```

**Port:** 8000

**API Documentation:**
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Files to Modify

| File | Service | What to Change |
|------|---------|---------------|
| `backend/app/schemas/checklist_template.py` | backend | Create new file with 5 schema groups (20 total schemas: Base/Create/Update/Response for each entity) |

## Files to Reference

These files show patterns to follow:

| File | Pattern to Copy |
|------|----------------|
| `backend/app/schemas/*.py` | CamelCaseModel usage, Base/Create/Update/Response pattern, nested schema relationships |
| Existing schema files in `backend/app/schemas/` | Standard CRUD schema conventions, UUID field usage, bilingual field patterns |

**Note:** Reference files need to be discovered during implementation phase. Look for existing schema files like `equipment.py`, `materials.py`, `contacts.py`, etc.

## Patterns to Follow

### Pattern 1: CamelCaseModel Base Class

All schemas must inherit from `CamelCaseModel` (not Pydantic's `BaseModel`) to automatically convert snake_case Python fields to camelCase for JSON responses.

```python
from app.schemas.base import CamelCaseModel  # Example path - verify during implementation

class ChecklistTemplateResponse(CamelCaseModel):
    id: UUID
    name: str
    name_he: str  # Will become nameHe in JSON
    group_name: str  # Will become groupName in JSON
```

**Key Points:**
- Import `CamelCaseModel` from the project's base schema module
- All response schemas must use this base class
- Frontend expects camelCase field names

### Pattern 2: Base/Create/Update/Response Variants

Standard CRUD pattern for each entity:

```python
# Base - shared fields
class ChecklistItemTemplateBase(CamelCaseModel):
    name: str
    name_he: str
    description: Optional[str] = None

# Create - fields for POST requests (no ID)
class ChecklistItemTemplateCreate(ChecklistItemTemplateBase):
    pass

# Update - fields for PUT/PATCH requests (all optional)
class ChecklistItemTemplateUpdate(CamelCaseModel):
    name: Optional[str] = None
    name_he: Optional[str] = None
    description: Optional[str] = None

# Response - includes ID and computed fields
class ChecklistItemTemplateResponse(ChecklistItemTemplateBase):
    id: UUID

    class Config:
        from_attributes = True  # For ORM compatibility
```

**Key Points:**
- Base contains shared field definitions
- Create inherits from Base (no ID field)
- Update makes all fields optional
- Response inherits from Base and adds ID

### Pattern 3: Nested Schema Relationships

Three-level hierarchy must be preserved:

```python
from typing import List

# Level 3: Item (leaf node)
class ChecklistItemTemplateResponse(ChecklistItemTemplateBase):
    id: UUID

# Level 2: SubSection (contains items)
class ChecklistSubSectionResponse(ChecklistSubSectionBase):
    id: UUID
    items: List[ChecklistItemTemplateResponse] = []

# Level 1: Template (contains subsections)
class ChecklistTemplateResponse(ChecklistTemplateBase):
    id: UUID
    name: str
    name_he: str
    level: str
    group_name: str
    sub_sections: List[ChecklistSubSectionResponse] = []
```

**Key Points:**
- Use `List[ResponseSchema]` for nested collections
- Response schemas must be defined before they're referenced
- Default to empty list for optional collections

## Requirements

### Functional Requirements

1. **Five Schema Groups**
   - Description: Create Base/Create/Update/Response for ChecklistItemTemplate, ChecklistSubSection, ChecklistTemplate, ChecklistInstance, and ChecklistItemResponse
   - Acceptance: 20 total schemas defined (4 variants × 5 entities)

2. **Bilingual Field Support**
   - Description: All user-facing text fields must have both `name` (English) and `name_he` (Hebrew) variants
   - Acceptance: Both language fields present in Base schemas

3. **Nested Serialization**
   - Description: Response schemas must properly serialize nested relationships
   - Acceptance: ChecklistTemplateResponse contains List[ChecklistSubSectionResponse], which contains List[ChecklistItemTemplateResponse]

4. **Frontend Compatibility**
   - Description: All schemas must use CamelCaseModel for automatic case conversion
   - Acceptance: snake_case fields converted to camelCase in JSON responses

5. **UUID Identifiers**
   - Description: All entities use UUID type for ID fields
   - Acceptance: Response schemas have `id: UUID` field

### Edge Cases

1. **Empty Nested Collections** - Default to empty lists when no children exist (e.g., `sub_sections: List[ChecklistSubSectionResponse] = []`)
2. **Partial Updates** - Update schemas must allow partial data (all fields Optional)
3. **Circular References** - Use forward references if schemas reference each other bidirectionally
4. **Optional vs Required** - Create schemas should enforce required fields; Update schemas should make all fields optional

## Implementation Notes

### DO
- Follow the existing schema file structure in `backend/app/schemas/`
- Use `from typing import List, Optional` for type hints
- Use `from uuid import UUID` for ID fields
- Import `CamelCaseModel` from the project's base schema module
- Add `class Config: from_attributes = True` to Response schemas for ORM compatibility
- Define Response schemas in dependency order (leaf nodes first)
- Use meaningful default values (e.g., `= []` for lists, `= None` for optional fields)

### DON'T
- Don't use Pydantic's BaseModel directly - use CamelCaseModel
- Don't add database-specific fields (like created_at, updated_at) unless explicitly required
- Don't create validation logic yet - focus on schema structure
- Don't add business logic - these are pure data models
- Don't forget the bilingual fields (name and name_he)

## Development Environment

### Start Services

```bash
# Start backend only (schemas don't require database yet)
cd backend
uvicorn app.main:app --reload --port 8000
```

### Service URLs
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

### Required Environment Variables
None required for schema creation. Schemas are pure Python/Pydantic code.

## Success Criteria

The task is complete when:

1. [ ] File `backend/app/schemas/checklist_template.py` exists with all 20 schemas
2. [ ] All schemas inherit from `CamelCaseModel` (not BaseModel)
3. [ ] ChecklistTemplateResponse properly nests ChecklistSubSectionResponse and ChecklistItemTemplateResponse
4. [ ] All user-facing fields have bilingual support (name/name_he)
5. [ ] No syntax errors - file imports successfully
6. [ ] Schema structure follows Base/Create/Update/Response pattern consistently
7. [ ] No console errors when backend starts
8. [ ] Schemas can be imported by other modules (e.g., `from app.schemas.checklist_template import ChecklistTemplateResponse`)

## QA Acceptance Criteria

**CRITICAL**: These criteria must be verified by the QA Agent before sign-off.

### Unit Tests
| Test | File | What to Verify |
|------|------|----------------|
| Schema Import Test | `backend/tests/test_schemas_checklist_template.py` | All 20 schemas can be imported without errors |
| Nested Serialization Test | `backend/tests/test_schemas_checklist_template.py` | ChecklistTemplateResponse properly serializes with nested sub_sections and items |
| CamelCase Conversion Test | `backend/tests/test_schemas_checklist_template.py` | snake_case fields (name_he, group_name) convert to camelCase in JSON |
| Validation Test | `backend/tests/test_schemas_checklist_template.py` | Create schemas enforce required fields, Update schemas allow partial data |

### Integration Tests
| Test | Services | What to Verify |
|------|----------|----------------|
| Schema-ORM Compatibility | backend | Response schemas work with `from_attributes = True` for future ORM models |

### End-to-End Tests
| Flow | Steps | Expected Outcome |
|------|-------|------------------|
| Schema Creation | 1. Import schemas 2. Create instances 3. Serialize to JSON | All schemas instantiate and serialize correctly |

### Manual Verification
| Check | Command | Expected |
|-------|---------|----------|
| Import Check | `python -c "from app.schemas.checklist_template import *"` | No errors |
| Schema Count | `grep -c "^class" backend/app/schemas/checklist_template.py` | 20 or more (5 entities × 4 variants) |
| CamelCase Base | `grep -c "CamelCaseModel" backend/app/schemas/checklist_template.py` | At least 20 (all schemas) |
| Bilingual Fields | `grep -c "name_he" backend/app/schemas/checklist_template.py` | At least 10 (Base/Response schemas) |

### QA Sign-off Requirements
- [ ] All 20 schemas defined (5 entities × 4 variants each)
- [ ] All schemas inherit from CamelCaseModel
- [ ] Nested relationships properly structured (Template → SubSection → Item)
- [ ] Bilingual support present in all user-facing schemas
- [ ] No syntax errors - file imports successfully
- [ ] Schema structure follows project conventions (Base/Create/Update/Response)
- [ ] No Python errors when importing schemas
- [ ] UUID type used for all ID fields
- [ ] Update schemas have all fields as Optional
- [ ] Response schemas have `class Config: from_attributes = True`
- [ ] Forward references used correctly for nested types
- [ ] Code follows PEP 8 style guidelines
- [ ] No security vulnerabilities introduced (N/A - pure data models)
