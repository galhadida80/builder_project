# Specification: Senior Supervision Inspection System

## Overview

Create a supervision inspection tracking system that manages required inspections per consultant type across various construction stages. The system will track 21 consultant/supervisor types (Agronomist, Soil, Hydrologist, Waterproofing, Structural Engineer, Architect, Electrical, Plumbing, HVAC, Safety, Accessibility, Traffic, Lighting, Signage, Radiation, Aluminum, Acoustics, Green Building, Development, Interior Design) with 1-7 inspection stages each. Inspections progress through scheduled → completed → approved states, with flexible stage definitions stored in JSONB to accommodate varying requirements per consultant type. The system integrates with existing construction areas and progress tracking.

## Workflow Type

**Type**: feature

**Rationale**: This is a new feature implementation that adds inspection tracking capabilities to the existing construction management system. It requires creating new database models, API endpoints, schemas, and integration with existing project/area tracking infrastructure.

## Task Scope

### Services Involved
- **backend** (primary) - FastAPI service implementing models, schemas, and CRUD APIs for inspection management
- **frontend** (future integration) - React UI will consume the inspection APIs (out of scope for this task)

### This Task Will:
- [ ] Create 4 SQLAlchemy models: ConsultantType, InspectionStageTemplate, ProjectInspection, InspectionResult
- [ ] Implement JSONB-based flexible stage definitions for inspection templates
- [ ] Create Pydantic schemas for all models with validation
- [ ] Build CRUD API endpoints for managing consultant types, templates, inspections, and results
- [ ] Establish relationships with existing Project and Area models
- [ ] Create Alembic migration for new database tables
- [ ] Seed initial data from Excel source (21 consultant types)

### Out of Scope:
- Frontend UI implementation
- Advanced reporting/analytics features
- Email notifications for inspection due dates
- Mobile app integration
- Bulk import tools beyond initial seeding

## Service Context

### Backend

**Tech Stack:**
- Language: Python
- Framework: FastAPI 0.109.0
- ORM: SQLAlchemy 2.0.25
- Validation: Pydantic 2.5.3
- Migrations: Alembic 1.13.1
- Database: PostgreSQL (JSONB support required)

**Entry Point:** `app/main.py`

**How to Run:**
```bash
cd backend
# Activate virtual environment
source venv/bin/activate  # or venv\Scripts\activate on Windows

# Install new dependency for Excel parsing
pip install openpyxl==3.1.5

# Run migrations
alembic upgrade head

# Start server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Port:** 8000

**Key Directories:**
- `app/` - Application code
- `app/models/` - SQLAlchemy models
- `app/schemas/` - Pydantic schemas
- `app/api/v1/` - API route handlers
- `alembic/versions/` - Database migrations

## Files to Modify

| File | Service | What to Change |
|------|---------|---------------|
| `backend/requirements.txt` | backend | Add `openpyxl==3.1.5` for Excel parsing |
| `backend/app/api/v1/__init__.py` | backend | Register new inspections router |
| `backend/app/main.py` | backend | Include inspections API routes |

## Files to Reference

These files show patterns to follow:

| File | Pattern to Copy |
|------|----------------|
| `backend/app/models/area.py` | SQLAlchemy model structure, relationships with Project |
| `backend/app/models/equipment.py` | Model with foreign keys and enums |
| `backend/app/schemas/equipment.py` | Pydantic schema patterns (Create/Update/Response) |
| `backend/app/api/v1/areas.py` | CRUD endpoint structure for project-scoped resources |
| `backend/app/api/v1/equipment.py` | FastAPI router pattern with dependency injection |
| `backend/alembic/versions/*.py` | Migration file structure and patterns |

## Patterns to Follow

### SQLAlchemy Model Pattern

From existing models like `app/models/area.py`:

```python
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship, Mapped, mapped_column
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.mutable import MutableDict
from datetime import datetime

class ModelName(Base):
    __tablename__ = 'table_name'

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    project_id: Mapped[int] = mapped_column(ForeignKey('projects.id'))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # For JSONB columns with mutation tracking
    data: Mapped[dict] = mapped_column(MutableDict.as_mutable(JSONB), default=dict)

    # Relationships
    project = relationship("Project", back_populates="relation_name")
```

**Key Points:**
- Use `Mapped[type]` with `mapped_column()` for SQLAlchemy 2.0 syntax
- JSONB columns MUST use `MutableDict.as_mutable(JSONB)` for change tracking
- Always include `created_at` and `updated_at` timestamps
- Use `ForeignKey` with proper table references

### JSONB Query Pattern

For querying JSONB fields:

```python
from sqlalchemy.dialects.postgresql import JSONB

# Check if JSONB contains specific key
results = session.query(Model).filter(
    Model.jsonb_field.has_key('key_name')
).all()

# Check if JSONB contains values
results = session.query(Model).filter(
    Model.jsonb_field.contains({'key': 'value'})
).all()
```

**Critical Gotcha:**
- In-place mutations (dict updates, list appends) do NOT auto-track
- After modifying JSONB: `from sqlalchemy.orm import flag_modified` then `flag_modified(instance, 'field_name')`
- OR use `MutableDict.as_mutable(JSONB)` wrapper (recommended)

### Pydantic Schema Pattern

From `app/schemas/equipment.py`:

```python
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime

class BaseSchema(BaseModel):
    class Config:
        from_attributes = True  # Enable ORM mode

class CreateSchema(BaseModel):
    name: str = Field(..., min_length=1)
    project_id: int
    data: Dict[str, Any] = Field(default_factory=dict)

class UpdateSchema(BaseModel):
    name: Optional[str] = None
    data: Optional[Dict[str, Any]] = None

class ResponseSchema(BaseSchema):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
```

**Key Points:**
- Separate schemas for Create (all required fields), Update (all optional), Response (includes id/timestamps)
- Use `Dict[str, Any]` for flexible JSONB fields
- `from_attributes = True` (Pydantic v2) for ORM model conversion
- `Field(default_factory=dict)` for mutable defaults

### FastAPI Router Pattern

From `app/api/v1/areas.py`:

```python
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas import schemas_module
from app.models import models_module

router = APIRouter(prefix="/projects/{project_id}/resource", tags=["resource"])

@router.post("/", response_model=schemas_module.ResponseSchema)
async def create_resource(
    project_id: int,
    data: schemas_module.CreateSchema,
    db: Session = Depends(get_db)
):
    # Validation logic
    # Database operations
    return created_resource

@router.get("/{resource_id}", response_model=schemas_module.ResponseSchema)
async def get_resource(
    project_id: int,
    resource_id: int,
    db: Session = Depends(get_db)
):
    resource = db.query(models_module.Model).filter(
        models_module.Model.id == resource_id,
        models_module.Model.project_id == project_id
    ).first()

    if not resource:
        raise HTTPException(status_code=404, detail="Not found")

    return resource
```

**Key Points:**
- Use `APIRouter` with prefix for route grouping
- Dependency injection for database sessions: `db: Session = Depends(get_db)`
- Always validate project_id matches resource's project_id
- Return 404 for missing resources, 400 for validation errors

### Alembic Migration Pattern

From existing migrations in `alembic/versions/`:

```python
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

def upgrade():
    op.create_table(
        'table_name',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('project_id', sa.Integer(), sa.ForeignKey('projects.id'), nullable=False),
        sa.Column('data', postgresql.JSONB(), nullable=False, server_default='{}'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now())
    )

    op.create_index('ix_table_name_project_id', 'table_name', ['project_id'])

def downgrade():
    op.drop_index('ix_table_name_project_id', table_name='table_name')
    op.drop_table('table_name')
```

**Critical Gotchas:**
- **MUST** use `postgresql.JSONB()` not generic `sa.JSON()`
- When converting existing column to JSONB: `postgresql_using='column_name::jsonb'` is MANDATORY
- Import pattern: `from sqlalchemy.dialects import postgresql`
- JSONB indexes NOT auto-detected by autogenerate - create manually
- Use `server_default='{}'` for JSONB columns to avoid null issues

## Requirements

### Functional Requirements

1. **Consultant Type Management**
   - Description: Define and manage 21 consultant/supervisor types with their inspection requirements
   - Acceptance:
     - GET `/consultant-types` returns all consultant types
     - POST `/consultant-types` creates new consultant type
     - Each type stores name, description, and inspection stage count

2. **Inspection Stage Templates**
   - Description: Define dynamic inspection stages per consultant type using JSONB storage
   - Acceptance:
     - Templates stored as JSONB with flexible schema (1-7 stages per consultant)
     - GET `/consultant-types/{id}/templates` returns stage templates
     - POST creates new template with validation
     - Supports nested stage definitions (stage_number, stage_name, requirements)

3. **Project Inspection Tracking**
   - Description: Create and manage actual inspection instances for projects
   - Acceptance:
     - POST `/projects/{project_id}/inspections` creates inspection
     - Links to ConsultantType and Project
     - Tracks status: scheduled, completed, approved
     - GET returns inspections filtered by project and status

4. **Inspection Result Recording**
   - Description: Record completion and approval data for inspection stages
   - Acceptance:
     - POST `/projects/{project_id}/inspections/{id}/results` records result
     - Stores completion date, approval status, notes, inspector details
     - Enforces stage progression (can't approve before completing)
     - Links to specific inspection stage from template

5. **Construction Area Integration**
   - Description: Link inspections to construction areas for progress tracking
   - Acceptance:
     - ProjectInspection has optional area_id foreign key
     - GET `/projects/{project_id}/areas/{area_id}/inspections` filters by area
     - Inspection counts appear in area progress metrics

### Edge Cases

1. **Variable Stage Counts** - Different consultant types have 1-7 stages; JSONB schema must accommodate this without rigid validation
2. **Stage Progression** - Results can only be created for scheduled inspections; approval requires completed status
3. **Project Deletion** - Cascade delete inspections when project is deleted (use ondelete='CASCADE')
4. **Duplicate Prevention** - Prevent multiple active inspections of same consultant type for same area
5. **JSONB Mutation Tracking** - Use MutableDict wrapper to detect in-place changes to stage templates
6. **Hebrew Text Support** - Consultant type names may be Hebrew; ensure UTF-8 encoding throughout
7. **Template Changes** - If template changes after inspection created, inspection retains original template snapshot
8. **Null Area** - Inspections without area_id are project-wide inspections

## Implementation Notes

### DO
- Follow the pattern in `app/api/v1/areas.py` for project-scoped CRUD endpoints
- Reuse database session dependency from `app/database.py`
- Use `MutableDict.as_mutable(JSONB)` for all JSONB columns to track mutations
- Create separate Pydantic schemas for Create/Update/Response patterns
- Include `postgresql_using='column::jsonb'` in migrations when altering to JSONB
- Add indexes on foreign keys (project_id, consultant_type_id, area_id)
- Store template snapshot in ProjectInspection to preserve original requirements
- Use enums for status fields (scheduled, completed, approved)
- Include created_at, updated_at timestamps on all models
- Validate project_id matches in all nested routes

### DON'T
- Create new database connection logic when `get_db()` dependency exists
- Use generic `sa.JSON()` - always use `postgresql.JSONB()` for PostgreSQL
- Rely on autogenerate to detect JSONB indexes - create them manually
- Allow in-place JSONB mutations without MutableDict or flag_modified
- Skip project_id validation in nested routes (security risk)
- Use rigid schema validation for JSONB stage definitions (defeats flexibility purpose)
- Forget to close Excel workbook after parsing (memory leak)
- Use `server_default` on JSONB in migrations (breaks autogenerate)

## Development Environment

### Start Services

```bash
# Start all services via Docker Compose
docker-compose up -d

# OR start backend only
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --port 8000

# Run migrations
cd backend
alembic upgrade head

# Create new migration
alembic revision --autogenerate -m "Add supervision inspection models"
```

### Service URLs
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
- Frontend: http://localhost:3000

### Required Environment Variables
```bash
# backend/.env
DATABASE_URL=postgresql://user:password@localhost/dbname
SECRET_KEY=your-secret-key
ALGORITHM=HS256
```

### Database Setup
```bash
# Connect to PostgreSQL
psql -U postgres

# Verify JSONB support (PostgreSQL 9.4+)
SELECT version();
```

## Success Criteria

The task is complete when:

1. [ ] All 4 models created (ConsultantType, InspectionStageTemplate, ProjectInspection, InspectionResult) with proper relationships
2. [ ] JSONB fields use MutableDict wrapper for mutation tracking
3. [ ] Pydantic schemas created for all models (Create/Update/Response patterns)
4. [ ] CRUD API endpoints functional for all entities
5. [ ] Alembic migration runs successfully without errors
6. [ ] Excel data parsed and 21 consultant types seeded to database
7. [ ] Integration with existing Project and Area models verified
8. [ ] API documentation at /docs shows all new endpoints
9. [ ] No console errors when starting backend
10. [ ] Existing tests still pass
11. [ ] Manual API testing via Swagger UI confirms all CRUD operations work

## QA Acceptance Criteria

**CRITICAL**: These criteria must be verified by the QA Agent before sign-off.

### Unit Tests
| Test | File | What to Verify |
|------|------|----------------|
| `test_consultant_type_crud` | `backend/tests/test_inspections.py` | Create, read, update, delete consultant types |
| `test_jsonb_mutation_tracking` | `backend/tests/test_inspections.py` | JSONB field changes are detected and persisted |
| `test_inspection_status_transitions` | `backend/tests/test_inspections.py` | Status changes follow scheduled → completed → approved flow |
| `test_template_validation` | `backend/tests/test_inspections.py` | JSONB stage templates validate structure |
| `test_duplicate_inspection_prevention` | `backend/tests/test_inspections.py` | Cannot create duplicate inspections for same consultant/area |

### Integration Tests
| Test | Services | What to Verify |
|------|----------|----------------|
| `test_project_inspection_relationship` | backend ↔ database | ProjectInspection correctly links to Project model |
| `test_area_inspection_filtering` | backend ↔ database | Inspections filter correctly by area_id |
| `test_cascade_delete` | backend ↔ database | Deleting project cascades to inspections |
| `test_consultant_type_seeding` | backend ↔ Excel file | All 21 consultant types imported from Excel |

### End-to-End Tests
| Flow | Steps | Expected Outcome |
|------|-------|------------------|
| Create Inspection Workflow | 1. Create consultant type 2. Create template 3. Create project inspection 4. Record result | Full inspection lifecycle tracked |
| Area-Based Filtering | 1. Create inspections with area_id 2. GET by area 3. Verify filtering | Only area-specific inspections returned |
| Status Progression | 1. Create scheduled inspection 2. Mark completed 3. Mark approved | Status transitions enforce order |

### API Verification
| Endpoint | Method | Checks |
|----------|--------|--------|
| `/consultant-types` | GET | Returns all 21 consultant types |
| `/consultant-types` | POST | Creates new consultant type with validation |
| `/consultant-types/{id}/templates` | GET | Returns JSONB stage templates |
| `/projects/{project_id}/inspections` | POST | Creates inspection linked to project |
| `/projects/{project_id}/inspections` | GET | Filters by project_id and status |
| `/projects/{project_id}/inspections/{id}` | GET | Returns single inspection with nested data |
| `/projects/{project_id}/inspections/{id}/results` | POST | Records inspection result |
| `/projects/{project_id}/areas/{area_id}/inspections` | GET | Filters inspections by area |

### Database Verification
| Check | Query/Command | Expected |
|-------|---------------|----------|
| Migration applied | `alembic current` | Shows latest migration hash |
| Tables created | `\dt` in psql | consultant_types, inspection_stage_templates, project_inspections, inspection_results |
| JSONB columns | `\d inspection_stage_templates` | stage_definitions column type is jsonb |
| Foreign keys | `\d project_inspections` | project_id, consultant_type_id, area_id foreign keys exist |
| Indexes | `\di` | Indexes on project_id, consultant_type_id, area_id |
| Seed data | `SELECT COUNT(*) FROM consultant_types;` | Returns 21 |

### QA Sign-off Requirements
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] All API endpoints return correct status codes (200/201/404/400)
- [ ] JSONB mutation tracking verified (update stage_definitions, verify persistence)
- [ ] Excel seeding completes without errors
- [ ] API documentation at /docs displays all new endpoints correctly
- [ ] No regressions in existing /projects, /areas APIs
- [ ] Database foreign key constraints enforced (cannot create inspection for non-existent project)
- [ ] Code follows established SQLAlchemy 2.0 patterns
- [ ] No security vulnerabilities (project_id validation in all nested routes)
- [ ] Hebrew text support verified (consultant types with Hebrew names display correctly)
- [ ] JSONB query patterns functional (filter by has_key, contains)

## Data Model Specifications

### ConsultantType
```python
- id: int (PK)
- name: str (unique, required) - e.g., "Structural Engineer", "אגרונום"
- description: str (optional)
- stage_count: int (1-7) - number of inspection stages
- is_active: bool (default True)
- created_at: datetime
- updated_at: datetime

Relationships:
- templates: List[InspectionStageTemplate]
- inspections: List[ProjectInspection]
```

### InspectionStageTemplate
```python
- id: int (PK)
- consultant_type_id: int (FK to consultant_types)
- stage_definitions: JSONB - flexible stage config
  Example structure:
  {
    "stages": [
      {"stage_number": 1, "stage_name": "Initial Survey", "requirements": ["Site photos", "Soil samples"]},
      {"stage_number": 2, "stage_name": "Foundation Check", "requirements": ["Depth verification"]}
    ]
  }
- version: int (for template versioning)
- is_active: bool
- created_at: datetime
- updated_at: datetime

Relationships:
- consultant_type: ConsultantType
```

### ProjectInspection
```python
- id: int (PK)
- project_id: int (FK to projects)
- consultant_type_id: int (FK to consultant_types)
- area_id: int (FK to areas, nullable) - optional area linkage
- template_snapshot: JSONB - copy of template at creation time
- status: enum (scheduled, completed, approved)
- scheduled_date: date (nullable)
- assigned_inspector: str (nullable)
- notes: text (nullable)
- created_at: datetime
- updated_at: datetime

Relationships:
- project: Project
- consultant_type: ConsultantType
- area: Area (optional)
- results: List[InspectionResult]
```

### InspectionResult
```python
- id: int (PK)
- inspection_id: int (FK to project_inspections)
- stage_number: int - which stage from template
- completion_date: date (nullable)
- approval_date: date (nullable)
- inspector_name: str (nullable)
- result_status: enum (pending, completed, approved, rejected)
- findings: text (nullable)
- attachments: JSONB (list of file references)
- created_at: datetime
- updated_at: datetime

Relationships:
- inspection: ProjectInspection
```

## Excel Data Structure

**File:** `פיקוחים עליונים - כמות בדיקות.xlsx`

**Expected Columns:**
- Column A: Consultant Type Name (Hebrew/English)
- Column B: Number of Inspection Stages (1-7)
- Additional columns may contain stage descriptions

**Parsing Strategy:**
```python
from openpyxl import load_workbook

wb = load_workbook('פיקוחים עליונים - כמות בדיקות.xlsx')
ws = wb.active

for row in ws.iter_rows(min_row=2, values_only=True):
    name = row[0]
    stage_count = row[1]
    # Create ConsultantType record

wb.close()
```

## API Endpoint Summary

### Consultant Types
- `GET /api/v1/consultant-types` - List all consultant types
- `POST /api/v1/consultant-types` - Create consultant type
- `GET /api/v1/consultant-types/{id}` - Get consultant type details
- `PUT /api/v1/consultant-types/{id}` - Update consultant type
- `DELETE /api/v1/consultant-types/{id}` - Delete consultant type (soft delete)
- `GET /api/v1/consultant-types/{id}/templates` - Get stage templates
- `POST /api/v1/consultant-types/{id}/templates` - Create stage template

### Project Inspections
- `GET /api/v1/projects/{project_id}/inspections` - List project inspections (filter by status, consultant_type)
- `POST /api/v1/projects/{project_id}/inspections` - Create inspection
- `GET /api/v1/projects/{project_id}/inspections/{id}` - Get inspection details
- `PUT /api/v1/projects/{project_id}/inspections/{id}` - Update inspection
- `DELETE /api/v1/projects/{project_id}/inspections/{id}` - Delete inspection
- `POST /api/v1/projects/{project_id}/inspections/{id}/results` - Record stage result
- `GET /api/v1/projects/{project_id}/inspections/{id}/results` - Get all results for inspection

### Area-Based Filtering
- `GET /api/v1/projects/{project_id}/areas/{area_id}/inspections` - Get inspections for specific area

## Migration Strategy

1. **Create Migration:**
   ```bash
   alembic revision --autogenerate -m "Add supervision inspection models"
   ```

2. **Manually Add JSONB Indexes:**
   ```python
   # In migration file
   op.create_index(
       'ix_inspection_stage_templates_stage_definitions',
       'inspection_stage_templates',
       ['stage_definitions'],
       postgresql_using='gin'
   )
   ```

3. **Apply Migration:**
   ```bash
   alembic upgrade head
   ```

4. **Seed Data:**
   ```bash
   python scripts/seed_consultant_types.py
   ```

## Security Considerations

1. **Project Scoping:** Always validate that `project_id` in URL matches resource's `project_id`
2. **Authorization:** Future: check user has access to project before allowing inspection operations
3. **SQL Injection:** Use SQLAlchemy parameterized queries (already handled by ORM)
4. **JSONB Injection:** Validate JSONB structure before storing to prevent malicious payloads
5. **File References:** Sanitize file paths in attachments JSONB field

## Performance Considerations

1. **JSONB Indexing:** Use GIN indexes on frequently queried JSONB fields
2. **Eager Loading:** Use `joinedload()` to prevent N+1 queries when fetching inspections with relationships
3. **Pagination:** Implement pagination for list endpoints (limit/offset)
4. **Caching:** Consider caching consultant types (rarely change)

## Future Enhancements (Out of Scope)

- Real-time notifications when inspections are due
- Automated scheduling based on construction progress
- Mobile app for field inspections
- Photo/document upload for inspection results
- Advanced reporting and analytics dashboards
- Integration with external inspection services
- Automated email reminders for pending approvals
