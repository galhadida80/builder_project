# Specification: Create Checklist Template API Endpoints

## Overview

Create a comprehensive FastAPI endpoint system for managing checklist templates and instances. Templates are reusable admin-managed structures (template → sections → items), while instances are project-scoped runtime copies that track completion via item responses. This enables standardized checklists across projects while maintaining individual project progress tracking.

## Workflow Type

**Type**: feature

**Rationale**: This is a new feature implementation adding a complete checklist management system with two distinct resource hierarchies - administrative template management and project-scoped instance tracking. It requires creating new endpoints, database service integration, and follows existing RESTful patterns.

## Task Scope

### Services Involved
- **backend** (primary) - FastAPI service requiring new endpoint file and router registration

### This Task Will:
- [ ] Create `backend/app/api/v1/checklist_templates.py` with all template and instance endpoints
- [ ] Implement 8 template management endpoints (admin-scoped CRUD and nested resource management)
- [ ] Implement 6 instance management endpoints (project-scoped with response tracking)
- [ ] Register new router in FastAPI application
- [ ] Support filtering on template list endpoints (by level and group)
- [ ] Handle hierarchical relationships (templates → sections → items, instances → responses)

### Out of Scope:
- Database model creation (assumed to exist from previous tasks)
- Service layer implementation (business logic layer)
- Pydantic schema definitions
- Authentication/authorization middleware
- Frontend integration
- Database migrations

## Service Context

### Backend

**Tech Stack:**
- Language: Python
- Framework: FastAPI
- ORM: SQLAlchemy
- Database: PostgreSQL (asyncpg driver)
- Auth: JWT (python-jose)
- Key directories: `app/` (application code)

**Entry Point:** `app/main.py`

**How to Run:**
```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

**Port:** 8000

**Existing API Patterns:**
The project follows a consistent RESTful pattern visible in existing endpoints:
- Project-scoped resources: `/projects/{project_id}/resource`
- Standard CRUD: GET (list/detail), POST (create), PUT (update), DELETE (delete)
- Nested resources: `/resource/{id}/sub-resource`
- All routes in `app/api/v1/*.py` files

## Files to Modify

| File | Service | What to Change |
|------|---------|---------------|
| `backend/app/api/v1/checklist_templates.py` | backend | **CREATE NEW FILE** - Implement all 14 endpoints for templates and instances |
| `backend/app/main.py` or router config | backend | Register `checklist_templates` router in API v1 routes |

## Files to Reference

Since no reference files were identified in context phase, follow these existing patterns from the project:

| Pattern | Reference Location |
|---------|-------------------|
| Project-scoped endpoints | Similar to `/projects/{project_id}/equipment` in equipment.py |
| Standard CRUD structure | Similar to contacts.py, materials.py pattern |
| Nested resource management | Similar to meetings.py (attendees management) |
| FastAPI router setup | Any existing `app/api/v1/*.py` file |

## Patterns to Follow

### FastAPI Router Setup

Standard pattern from existing API files:

```python
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app.api import deps  # Database session dependency
from app.schemas import checklist_templates as schemas
from app.services import checklist_template_service

router = APIRouter()

# Example endpoint
@router.get("/checklist-templates", response_model=List[schemas.ChecklistTemplate])
async def list_templates(
    db: Session = Depends(deps.get_db),
    level: Optional[str] = None,
    group: Optional[str] = None,
    current_user = Depends(deps.get_current_admin_user)
):
    """List all checklist templates with optional filters."""
    return checklist_template_service.get_templates(
        db, level=level, group=group
    )
```

**Key Points:**
- Use `APIRouter()` for endpoint grouping
- Inject database session via `Depends(deps.get_db)`
- Use Pydantic schemas for request/response validation
- Delegate business logic to service layer
- Return appropriate HTTP status codes

### Project-Scoped Endpoint Pattern

```python
@router.get("/projects/{project_id}/checklist-instances")
async def list_project_instances(
    project_id: int,
    db: Session = Depends(deps.get_db),
    current_user = Depends(deps.get_current_user)
):
    """List all checklist instances for a project."""
    # Verify project access, then query instances
    return checklist_instance_service.get_project_instances(db, project_id)
```

**Key Points:**
- Path parameters come first (project_id)
- Use path parameter for scoping queries
- Verify user access to project (via dependency or service layer)

### Nested Resource Management Pattern

```python
@router.post("/checklist-templates/{id}/sections")
async def add_section_to_template(
    id: int,
    section: schemas.ChecklistSectionCreate,
    db: Session = Depends(deps.get_db),
    current_user = Depends(deps.get_current_admin_user)
):
    """Add a new section to a checklist template."""
    return checklist_template_service.add_section(db, template_id=id, section=section)
```

**Key Points:**
- Parent resource ID in path
- Child resource data in request body
- Service layer handles relationship creation

## Requirements

### Functional Requirements

#### 1. Template Management (Admin-Level)

**1.1 List Templates with Filtering**
- Description: Retrieve all checklist templates with optional query filters for level and group
- Endpoint: `GET /checklist-templates?level={level}&group={group}`
- Acceptance: Returns array of templates; empty array if no matches; filters work independently

**1.2 Create Template**
- Description: Create a new checklist template (admin only)
- Endpoint: `POST /checklist-templates`
- Acceptance: Returns created template with generated ID; validates required fields

**1.3 Get Template Detail**
- Description: Retrieve a specific template with all nested sections and items
- Endpoint: `GET /checklist-templates/{id}`
- Acceptance: Returns template with complete hierarchy; 404 if not found

**1.4 Update Template**
- Description: Update template metadata (not nested resources)
- Endpoint: `PUT /checklist-templates/{id}`
- Acceptance: Returns updated template; 404 if not found; validates changes

**1.5 Delete Template**
- Description: Remove a template from the system
- Endpoint: `DELETE /checklist-templates/{id}`
- Acceptance: Returns 204 on success; 404 if not found; handles cascade or prevents deletion if instances exist

**1.6 Add Section to Template**
- Description: Add a new section to an existing template
- Endpoint: `POST /checklist-templates/{id}/sections`
- Acceptance: Returns created section linked to template; validates template exists

**1.7 Update Section**
- Description: Update section metadata within a template
- Endpoint: `PUT /checklist-templates/{id}/sections/{section_id}`
- Acceptance: Returns updated section; validates section belongs to template

**1.8 Add Item to Section**
- Description: Add a checklist item to a specific section
- Endpoint: `POST /checklist-templates/sections/{section_id}/items`
- Acceptance: Returns created item; validates section exists; maintains order

#### 2. Instance Management (Project-Scoped)

**2.1 List Project Instances**
- Description: Retrieve all checklist instances for a specific project
- Endpoint: `GET /projects/{project_id}/checklist-instances`
- Acceptance: Returns instances scoped to project; empty array if none

**2.2 Create Instance from Template**
- Description: Create a new checklist instance by copying a template structure
- Endpoint: `POST /projects/{project_id}/checklist-instances`
- Acceptance: Creates instance with all sections/items from template; initializes empty responses

**2.3 Get Instance Detail**
- Description: Retrieve instance with all responses
- Endpoint: `GET /checklist-instances/{id}`
- Acceptance: Returns instance with nested responses; includes completion status

**2.4 Update Instance Status**
- Description: Update instance metadata (e.g., overall status, completion date)
- Endpoint: `PUT /checklist-instances/{id}`
- Acceptance: Returns updated instance; validates status transitions

**2.5 Add/Update Item Response**
- Description: Record or update a response for a checklist item
- Endpoint: `POST /checklist-instances/{id}/responses`
- Acceptance: Creates or updates response; validates item belongs to instance

**2.6 Update Specific Response**
- Description: Update a specific response by ID
- Endpoint: `PUT /checklist-instances/{id}/responses/{response_id}`
- Acceptance: Returns updated response; validates response belongs to instance

### Edge Cases

1. **Template deletion with existing instances** - Prevent deletion or implement soft delete; return appropriate error message
2. **Orphaned sections/items** - Ensure cascade rules prevent orphans when template/section deleted
3. **Duplicate responses** - POST to responses should upsert (update if exists, create if not) based on item_id
4. **Invalid template_id when creating instance** - Return 404 with clear error message
5. **Project access validation** - Verify user has access to project before creating/viewing instances
6. **Empty template instantiation** - Handle templates with no sections/items gracefully
7. **Concurrent response updates** - Consider race conditions; last-write-wins or optimistic locking
8. **Section/item ordering** - Maintain order when adding sections/items (use display_order field)

## Implementation Notes

### DO
- **Follow existing API patterns** - Use same structure as `equipment.py`, `contacts.py`, `materials.py`
- **Use dependency injection** - Inject `db: Session = Depends(deps.get_db)` for database access
- **Delegate to service layer** - Keep endpoints thin; business logic in `app/services/checklist_template_service.py`
- **Use Pydantic schemas** - Define request/response models in `app/schemas/checklist_templates.py`
- **Return appropriate status codes** - 200 for success, 201 for creation, 204 for deletion, 404 for not found, 400 for validation errors
- **Include docstrings** - Document each endpoint with description and parameter explanations
- **Use type hints** - Annotate all function parameters and return types
- **Handle authorization** - Template endpoints require admin, instance endpoints require project member
- **Support query parameters** - level and group filters on template list endpoint
- **Maintain hierarchical integrity** - Validate parent resources exist before creating children

### DON'T
- **Don't implement business logic in endpoints** - Delegate to service layer
- **Don't skip validation** - Use Pydantic schemas for request validation
- **Don't forget error handling** - Use HTTPException for expected errors
- **Don't hardcode values** - Use constants or configuration for magic numbers
- **Don't ignore authentication** - All endpoints require authentication (admin or project member)
- **Don't create duplicate endpoints** - Follow RESTful conventions; avoid redundant routes
- **Don't mix concerns** - Keep template management and instance management logically separated

## Development Environment

### Start Services

```bash
# Start entire stack (PostgreSQL, Redis, backend, frontend)
docker-compose up -d

# Or start backend only (requires database running)
cd backend
uvicorn app.main:app --reload --port 8000
```

### Service URLs
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs (Swagger UI)
- Alternative Docs: http://localhost:8000/redoc (ReDoc)
- OpenAPI Spec: http://localhost:8000/openapi.json

### Required Environment Variables
Check `backend/.env.example` for required variables:
- `DATABASE_URL`: PostgreSQL connection string
- `SECRET_KEY`: JWT signing secret
- `ALGORITHM`: JWT algorithm (default: HS256)
- Additional vars for storage, Redis, etc.

### Database Migrations
```bash
# Apply migrations (assumes checklist models already migrated)
cd backend
alembic upgrade head

# If models not created yet, this task is blocked
# Check alembic/versions/ for checklist-related migrations
```

## Success Criteria

The task is complete when:

1. [ ] `backend/app/api/v1/checklist_templates.py` file created with all 14 endpoints
2. [ ] All template endpoints (8 total) implemented and tested:
   - GET /checklist-templates (with level and group filters)
   - POST /checklist-templates
   - GET /checklist-templates/{id}
   - PUT /checklist-templates/{id}
   - DELETE /checklist-templates/{id}
   - POST /checklist-templates/{id}/sections
   - PUT /checklist-templates/{id}/sections/{section_id}
   - POST /checklist-templates/sections/{section_id}/items
3. [ ] All instance endpoints (6 total) implemented and tested:
   - GET /projects/{project_id}/checklist-instances
   - POST /projects/{project_id}/checklist-instances
   - GET /checklist-instances/{id}
   - PUT /checklist-instances/{id}
   - POST /checklist-instances/{id}/responses
   - PUT /checklist-instances/{id}/responses/{response_id}
4. [ ] Router registered in application (in main.py or api router config)
5. [ ] All endpoints accessible via http://localhost:8000/docs
6. [ ] Query parameter filtering works on template list endpoint
7. [ ] No console errors when starting backend service
8. [ ] Endpoints return appropriate HTTP status codes
9. [ ] Authorization checks in place (admin for templates, project member for instances)

## QA Acceptance Criteria

**CRITICAL**: These criteria must be verified by the QA Agent before sign-off.

### Unit Tests

| Test | File | What to Verify |
|------|------|----------------|
| Template CRUD operations | `backend/tests/api/v1/test_checklist_templates.py` | Create, read, update, delete templates work correctly |
| Template filtering | `backend/tests/api/v1/test_checklist_templates.py` | Level and group query parameters filter results correctly |
| Section management | `backend/tests/api/v1/test_checklist_templates.py` | Add and update sections within templates |
| Item management | `backend/tests/api/v1/test_checklist_templates.py` | Add items to sections |
| Instance creation | `backend/tests/api/v1/test_checklist_instances.py` | Create instance from template copies structure correctly |
| Instance responses | `backend/tests/api/v1/test_checklist_instances.py` | Add and update responses for checklist items |
| Authorization checks | `backend/tests/api/v1/test_checklist_auth.py` | Admin-only endpoints reject non-admin users; project endpoints verify access |

### Integration Tests

| Test | Services | What to Verify |
|------|----------|----------------|
| Template to instance flow | backend ↔ PostgreSQL | Create template → create instance → verify structure matches |
| Response tracking | backend ↔ PostgreSQL | Update responses → verify instance completion status updates |
| Cascade deletion | backend ↔ PostgreSQL | Delete template with instances → verify behavior (prevent or cascade) |
| Project scoping | backend ↔ PostgreSQL | Instances only returned for specified project_id |

### End-to-End Tests

| Flow | Steps | Expected Outcome |
|------|-------|------------------|
| Admin template workflow | 1. Create template 2. Add section 3. Add items 4. Update template | Template exists with full hierarchy |
| Instance lifecycle | 1. Create instance from template 2. Add responses 3. Update responses 4. Mark complete | Instance tracks all responses and shows completion |
| Project isolation | 1. Create instances in different projects 2. Query by project_id | Each project sees only its instances |

### API Verification

| Endpoint | Method | URL | Expected Status | Notes |
|----------|--------|-----|----------------|-------|
| List templates | GET | `/checklist-templates` | 200 | Returns array (empty or populated) |
| List with filter | GET | `/checklist-templates?level=project&group=safety` | 200 | Returns filtered results |
| Create template | POST | `/checklist-templates` | 201 | Returns created template with ID |
| Get template | GET | `/checklist-templates/1` | 200 or 404 | Returns full hierarchy if exists |
| Update template | PUT | `/checklist-templates/1` | 200 or 404 | Returns updated template |
| Delete template | DELETE | `/checklist-templates/1` | 204 or 404 or 409 | Success or not found or conflict |
| Add section | POST | `/checklist-templates/1/sections` | 201 | Returns created section |
| Update section | PUT | `/checklist-templates/1/sections/1` | 200 or 404 | Returns updated section |
| Add item | POST | `/checklist-templates/sections/1/items` | 201 | Returns created item |
| List instances | GET | `/projects/1/checklist-instances` | 200 | Returns project-scoped instances |
| Create instance | POST | `/projects/1/checklist-instances` | 201 | Body: `{"template_id": 1}` |
| Get instance | GET | `/checklist-instances/1` | 200 or 404 | Returns instance with responses |
| Update instance | PUT | `/checklist-instances/1` | 200 or 404 | Body: `{"status": "completed"}` |
| Add response | POST | `/checklist-instances/1/responses` | 201 or 200 | Body: `{"item_id": 1, "value": "yes"}` |
| Update response | PUT | `/checklist-instances/1/responses/1` | 200 or 404 | Body: `{"value": "no", "notes": "..."}` |

### Browser/Tool Verification

| Tool | URL | Checks |
|------|-----|--------|
| Swagger UI | `http://localhost:8000/docs` | All 14 endpoints visible and documented |
| ReDoc | `http://localhost:8000/redoc` | Alternative documentation renders correctly |
| Postman/HTTPie | Manual testing | Test authorization, filtering, nested resource creation |

### Database Verification

| Check | Query/Command | Expected |
|-------|---------------|----------|
| Router registered | Check logs on startup | Should see "/checklist-templates" routes mounted |
| Template models exist | `SELECT * FROM checklist_templates LIMIT 1;` | Table exists (may be empty) |
| Instance models exist | `SELECT * FROM checklist_instances LIMIT 1;` | Table exists (may be empty) |
| Responses tracked | After test run | Response records linked to instances |

### QA Sign-off Requirements

- [ ] All 14 endpoints implemented and functional
- [ ] API documentation (Swagger) shows all endpoints correctly
- [ ] Template filtering by level and group works
- [ ] Instance creation from template copies full structure
- [ ] Response tracking updates instance state correctly
- [ ] Authorization enforced (admin for templates, project member for instances)
- [ ] Appropriate HTTP status codes returned (200, 201, 204, 404, 400, 403, 409)
- [ ] Edge cases handled (template deletion, orphaned resources, duplicate responses)
- [ ] No regressions in existing endpoints
- [ ] Code follows existing FastAPI patterns in the project
- [ ] Router properly registered (visible in logs and /docs)
- [ ] No console errors or warnings on backend startup
- [ ] Database relationships maintained (no orphaned sections/items/responses)
