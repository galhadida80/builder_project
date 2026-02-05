# Specification: Seed Initial Equipment Templates from Excel Data

## Overview

Create a database seed script to populate equipment templates from the Excel file `רשימת ציוד לאישור.xlsx`. This script will establish 11 predefined equipment types with their associated document requirements, specification fields, submission checklists, and approving consultant roles. These templates serve as standardized configurations that guide the creation and approval workflow for equipment instances in construction projects.

## Workflow Type

**Type**: feature

**Rationale**: This is a new feature that adds database seeding infrastructure and creates an EquipmentTemplate model to support template-based equipment workflows. The task involves creating new database structures, seed scripts, and potentially a migration to support equipment templates.

## Task Scope

### Services Involved
- **backend** (primary) - Python/FastAPI service that manages database models and seed scripts

### This Task Will:
- [ ] Create EquipmentTemplate model to store template configurations
- [ ] Create database migration for equipment_templates table and consultant mappings
- [ ] Create seeds directory structure at `backend/app/db/seeds/`
- [ ] Create equipment_templates.py seed script
- [ ] Parse Excel data (`רשימת ציוד לאישור.xlsx`) to extract 11 equipment template definitions
- [ ] Populate database with 11 equipment templates including Hebrew/English names
- [ ] Map consultant roles (approver_role) for each template
- [ ] Define required_documents, required_specifications, and submission_checklist for each template

### Out of Scope:
- Frontend UI for viewing/managing equipment templates (future task)
- API endpoints for equipment templates (future task)
- Modifying existing Equipment model structure
- Auto-generating equipment instances from templates (future task)

## Service Context

### Backend

**Tech Stack:**
- Language: Python 3.11+
- Framework: FastAPI
- ORM: SQLAlchemy (async)
- Database: PostgreSQL (psycopg2-binary)
- Migrations: Alembic
- Key directories: `app/` (application code), `alembic/versions/` (migrations)

**Entry Point:** `app/main.py`

**How to Run:**
```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

**Port:** 8000

**Database Commands:**
```bash
# Create migration
alembic revision --autogenerate -m "add equipment templates"

# Run migration
alembic upgrade head

# Run seed script (to be implemented)
python -m app.db.seeds.equipment_templates
```

## Files to Modify

| File | Service | What to Change |
|------|---------|---------------|
| **NEW:** `backend/app/models/equipment_template.py` | backend | Create new EquipmentTemplate and TemplateConsultant models |
| **NEW:** `backend/app/db/seeds/__init__.py` | backend | Create seeds package initializer |
| **NEW:** `backend/app/db/seeds/equipment_templates.py` | backend | Create seed script to populate templates from Excel data |
| `backend/app/models/__init__.py` | backend | Add EquipmentTemplate import to expose model |
| **NEW:** `backend/alembic/versions/004_add_equipment_templates.py` | backend | Migration to create equipment_templates and template_consultants tables |

## Files to Reference

These files show patterns to follow:

| File | Pattern to Copy |
|------|----------------|
| `backend/app/models/equipment.py` | SQLAlchemy model structure, JSONB columns, UUID primary keys, relationships |
| `backend/app/models/approval.py` | Many-to-many relationship patterns, approver_role field pattern |
| `backend/app/models/user.py` | Base model structure, timestamps (created_at, updated_at) |
| `backend/alembic/versions/001_initial_tables.py` | Alembic migration structure, JSONB column creation, foreign keys |
| `backend/app/db/session.py` | Database session management, async patterns |
| `./רשימת ציוד לאישור.xlsx` | Source data for 11 equipment templates |

## Patterns to Follow

### SQLAlchemy Async Model Pattern

From `backend/app/models/equipment.py`:

```python
import uuid
from datetime import datetime
from sqlalchemy import String, Text, DateTime
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.session import Base

class Equipment(Base):
    __tablename__ = "equipment"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    specifications: Mapped[dict | None] = mapped_column(JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
```

**Key Points:**
- Use `Mapped[]` type hints with SQLAlchemy 2.0
- UUID primary keys with `uuid.uuid4` defaults
- JSONB columns for flexible nested data (documents, specifications, checklists)
- Timestamps for audit trail

### Many-to-Many Relationship Pattern

From `backend/app/models/approval.py`:

```python
class ApprovalStep(Base):
    __tablename__ = "approval_steps"

    approver_role: Mapped[str] = mapped_column(String(50), nullable=False)
    # Examples: "קונסטרוקטור", "יועץ קרקע", "אדריכל", "יועץ אינסטלציה"
```

**Key Points:**
- Store consultant roles as strings (matching User.role field)
- Support Hebrew role names (UTF-8 encoding)
- Use association table pattern for template-to-consultant mappings

### Alembic Migration Pattern

From `backend/alembic/versions/001_initial_tables.py`:

```python
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

def upgrade() -> None:
    op.create_table(
        'equipment_templates',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('name_en', sa.String(255)),
        sa.Column('required_documents', postgresql.JSONB(), default=[]),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
    )
```

**Key Points:**
- Use `postgresql.JSONB()` for JSON columns
- Set `server_default=sa.func.now()` for timestamp defaults
- Include both `upgrade()` and `downgrade()` functions

## Requirements

### Functional Requirements

1. **Create EquipmentTemplate Model**
   - Description: Define SQLAlchemy model to store template configurations
   - Fields needed:
     - `id` (UUID, primary key)
     - `name` (String(255)) - Hebrew name (e.g., "קירות סלארים")
     - `name_en` (String(255)) - English name (e.g., "Slurry Walls")
     - `required_documents` (JSONB) - List of document types (["מפרט טכני", "מפרט טכני מיוחד"])
     - `required_specifications` (JSONB) - List of spec fields (["כמות", "ספיקה", "גודל"])
     - `submission_checklist` (JSONB) - List of checklist items
     - `created_at`, `updated_at` (DateTime)
   - Acceptance: Model can be imported and creates valid table via migration

2. **Create Template-Consultant Mapping**
   - Description: Support many-to-many relationship between templates and consultant roles
   - Approach: Create `template_consultants` association table
   - Fields: `template_id` (FK to equipment_templates), `consultant_role` (String(50))
   - Acceptance: Multiple consultants can be assigned to one template

3. **Parse Excel Data**
   - Description: Extract 11 equipment types from `רשימת ציוד לאישור.xlsx`
   - Library: Use `openpyxl` or `pandas` to read Excel
   - Data to extract: Equipment names, approvers, document types, specification fields
   - Acceptance: All 11 equipment types are correctly parsed with full metadata

4. **Create Seed Script**
   - Description: Populate equipment_templates table with 11 predefined templates
   - Location: `backend/app/db/seeds/equipment_templates.py`
   - Should be idempotent: Check if templates exist before inserting (avoid duplicates)
   - Acceptance: Running seed script creates exactly 11 templates with all fields populated

5. **Bilingual Support**
   - Description: Store both Hebrew and English names for each equipment type
   - Examples:
     - קירות סלארים / Slurry Walls
     - משאבת ספרינקלרים / Sprinkler Pumps
     - גנרטור / Generator
   - Acceptance: All templates have both `name` (Hebrew) and `name_en` (English) populated

### Edge Cases

1. **Duplicate Seed Execution** - Seed script should check if template already exists by name before inserting (use upsert or existence check)
2. **Missing Excel File** - Gracefully handle missing Excel file with clear error message
3. **Invalid Consultant Roles** - Validate consultant role strings match expected values
4. **Empty JSONB Fields** - Ensure default empty arrays/objects for optional JSONB columns
5. **Unicode Handling** - Properly handle Hebrew text encoding in PostgreSQL (UTF-8)

## Implementation Notes

### DO
- Follow the async SQLAlchemy pattern from `app/models/equipment.py`
- Use JSONB columns for flexible nested data structures (documents, specs, checklists)
- Store consultant roles as strings matching User.role field values
- Make seed script idempotent (safe to run multiple times)
- Use `openpyxl` library to parse Excel file (already available via pandas dependency)
- Create migration before running seed script
- Store both Hebrew and English names for internationalization support

### DON'T
- Hardcode template data in Python (read from Excel file)
- Modify existing Equipment model structure
- Create API endpoints (out of scope for this task)
- Create frontend UI components (backend-only task)
- Use synchronous database operations (use async/await pattern)

### Equipment Types to Seed

**Construction/Structural (3 types):**
1. **קירות סלארים** (Slurry Walls) → Approvers: קונסטרוקטור, יועץ קרקע, אדריכל
2. **מעקות מרפסות** (Balcony Railings) → Approvers: אדריכל, קונסטרוקטור
3. **דלת כניסה** (Entry Door) → Approver: אדריכל

**Pump Systems (5 types):**
4. **משאבת ספרינקלרים** (Sprinkler Pumps) → Approver: יועץ אינסטלציה
5. **משאבת צריכה** (Consumption Pumps) → Approver: יועץ אינסטלציה
6. **משאבת הגברת לחץ גוקי** (Jockey Pump) → Approver: יועץ אינסטלציה
7. **משאבות כיבוי אש** (Fire Pumps) → Approver: יועץ אינסטלציה
8. **משאבות טבולות** (Submersible Pumps) → Approver: יועץ אינסטלציה

**Electrical/Mechanical Systems (3 types):**
9. **גנרטור** (Generator) → Approvers: יועץ חשמל, יועץ אקוסטיקה
10. **מפוחים** (Fans) → Approvers: יועץ מיזוג, יועץ אקוסטיקה
11. **לוחות חשמל** (Electrical Panels) → Approvers: יועץ חשמל, בניה ירוקה

**Consultant Role Types:**
- קונסטרוקטור (Constructor)
- יועץ קרקע (Soil Consultant)
- אדריכל (Architect)
- יועץ אינסטלציה (Plumbing/Installation Consultant)
- יועץ חשמל (Electrical Consultant)
- יועץ אקוסטיקה (Acoustics Consultant)
- יועץ מיזוג (HVAC Consultant)
- בניה ירוקה (Green Building)

## Development Environment

### Start Services

```bash
# Start PostgreSQL (via Docker Compose)
docker-compose up -d db

# Start backend
cd backend
uvicorn app.main:app --reload --port 8000

# Create migration
alembic revision --autogenerate -m "add equipment templates"

# Run migration
alembic upgrade head

# Run seed script
python -m app.db.seeds.equipment_templates
```

### Service URLs
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/api/v1/docs
- Database: postgresql://localhost:5432 (via Docker Compose)

### Required Environment Variables
- `DATABASE_URL`: PostgreSQL connection string (from .env or docker-compose.yml)
- `DEBUG`: Set to True for development logging

## Success Criteria

The task is complete when:

1. [ ] EquipmentTemplate model exists in `backend/app/models/equipment_template.py`
2. [ ] Database migration creates `equipment_templates` and `template_consultants` tables
3. [ ] Seed script at `backend/app/db/seeds/equipment_templates.py` runs successfully
4. [ ] Database contains exactly 11 equipment template records with:
   - Hebrew and English names
   - Required documents (JSONB array)
   - Required specifications (JSONB array)
   - Submission checklist items (JSONB array)
   - Mapped consultant roles (via template_consultants table)
5. [ ] Seed script is idempotent (can run multiple times without creating duplicates)
6. [ ] No console errors during seed execution
7. [ ] All Hebrew text is properly encoded and stored in PostgreSQL
8. [ ] Migration can be rolled back cleanly (`alembic downgrade -1`)

## QA Acceptance Criteria

**CRITICAL**: These criteria must be verified by the QA Agent before sign-off.

### Unit Tests
| Test | File | What to Verify |
|------|------|----------------|
| test_equipment_template_model | `backend/tests/test_models/test_equipment_template.py` | Model fields, JSONB defaults, relationships, UUID generation |
| test_template_consultant_mapping | `backend/tests/test_models/test_equipment_template.py` | Many-to-many relationship, multiple consultants per template |
| test_seed_idempotency | `backend/tests/test_seeds/test_equipment_templates.py` | Running seed twice creates only 11 records (no duplicates) |

### Integration Tests
| Test | Services | What to Verify |
|------|----------|----------------|
| test_seed_execution | backend ↔ database | Seed script successfully populates database with 11 templates |
| test_template_data_integrity | backend ↔ database | All JSONB fields populated, Hebrew text stored correctly, consultant mappings correct |

### Database Verification
| Check | Query/Command | Expected |
|-------|---------------|----------|
| Template count | `SELECT COUNT(*) FROM equipment_templates;` | Returns exactly 11 |
| Consultant mappings | `SELECT COUNT(*) FROM template_consultants;` | Returns 18+ mappings (some templates have multiple consultants) |
| Hebrew encoding | `SELECT name FROM equipment_templates WHERE name LIKE '%קירות%';` | Returns "קירות סלארים" with proper UTF-8 encoding |
| JSONB structure | `SELECT required_documents FROM equipment_templates LIMIT 1;` | Returns valid JSON array |
| Migration exists | `alembic history` | Shows migration "004_add_equipment_templates" |

### Manual Verification Steps
1. **Run seed script:**
   ```bash
   python -m app.db.seeds.equipment_templates
   ```
   - Output: "Seeded 11 equipment templates successfully"
   - No errors or warnings

2. **Query database:**
   ```bash
   psql -c "SELECT name, name_en, (SELECT COUNT(*) FROM template_consultants WHERE template_id = equipment_templates.id) as consultant_count FROM equipment_templates;"
   ```
   - Verify all 11 templates listed
   - Verify consultant counts match requirements (1-3 consultants per template)

3. **Test idempotency:**
   - Run seed script twice
   - Verify count remains 11 (no duplicates)

4. **Test rollback:**
   ```bash
   alembic downgrade -1
   ```
   - Tables dropped successfully
   - Re-run upgrade and seed to verify reproducibility

### QA Sign-off Requirements
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] Database verification queries return expected results
- [ ] Manual verification steps completed successfully
- [ ] Hebrew text displays correctly in database and console output
- [ ] Seed script is idempotent (verified by running twice)
- [ ] Migration rollback works without errors
- [ ] Code follows SQLAlchemy async patterns from existing models
- [ ] No security vulnerabilities introduced (SQL injection, file path traversal)
- [ ] Excel file path is not hardcoded (configurable or relative path)
