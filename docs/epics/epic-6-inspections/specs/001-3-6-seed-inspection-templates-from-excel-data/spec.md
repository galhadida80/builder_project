# Specification: Seed Inspection Templates from Excel Data

## Overview

Create a database seed script that populates inspection consultant types and their associated stages based on data from an Excel file. This script will initialize 21 consultant types (e.g., Agronomist, Soil, Structural, Electrical) with varying numbers of inspection stages (1-7 stages each), supporting bilingual Hebrew-English names. The seed data will enable the inspection workflow system to track construction project inspections across different consultant disciplines.

## Workflow Type

**Type**: feature

**Rationale**: This is a new database seeding capability that creates foundational data for the inspection management system. It involves creating new seed scripts, defining data structures, and potentially creating new database models if they don't exist.

## Task Scope

### Services Involved
- **backend** (primary) - Python/FastAPI service that handles database operations and seed scripts

### This Task Will:
- [ ] Create the seeds directory structure at `backend/app/db/seeds/`
- [ ] Create the inspection templates seed script at `backend/app/db/seeds/inspection_templates.py`
- [ ] Define and seed 21 consultant types with bilingual names (Hebrew/English)
- [ ] Define and seed inspection stages for each consultant type (ranging from 1-7 stages)
- [ ] Include explicit stage names for Soil (4 stages) and Waterproofing (5 stages) consultant types
- [ ] Create a seed runner script or function to execute the seed data loading
- [ ] Verify database models exist for inspection templates (create if needed)

### Out of Scope:
- Creating the API endpoints for accessing inspection templates
- Building the frontend UI for managing inspections
- Creating database migrations (those should exist or be created separately)
- Resolving the TBD status for Protection (מיגון) consultant type
- Adding inspection workflow logic or business rules

## Service Context

### Backend

**Tech Stack:**
- Language: Python
- Framework: FastAPI
- ORM: SQLAlchemy
- Database: PostgreSQL
- Migration Tool: Alembic
- Key directories: app/, alembic/versions/

**Entry Point:** `app/main.py`

**How to Run:**
```bash
# From backend directory
cd backend

# Install dependencies
pip install -r requirements.txt

# Run migrations
alembic upgrade head

# Run seed scripts (to be implemented)
python -m app.db.seeds.inspection_templates

# Start server
uvicorn app.main:main --reload --port 8000
```

**Port:** 8000

## Files to Modify

| File | Service | What to Change |
|------|---------|---------------|
| `backend/app/db/seeds/inspection_templates.py` | backend | Create new seed script with consultant types and stages data |
| `backend/app/db/seeds/__init__.py` | backend | Create package initializer for seeds module |
| `backend/app/models/inspection.py` | backend | Create inspection models if they don't exist (ConsultantType, InspectionStage) |
| `backend/app/models/__init__.py` | backend | Import and export inspection models if newly created |

## Files to Reference

These files show patterns to follow:

| File | Pattern to Copy |
|------|----------------|
| `backend/alembic/versions/001_initial_tables.py` | Database table creation patterns using SQLAlchemy |
| `backend/app/models/project.py` | SQLAlchemy model definition patterns with enums, relationships, and UUID primary keys |
| `backend/app/models/equipment.py` | Model patterns for entities with checklist/template relationships |
| `backend/app/db/session.py` | Database session management and Base class usage |

## Patterns to Follow

### SQLAlchemy Model Pattern

From `backend/app/models/project.py`:

```python
import uuid
from datetime import datetime
from enum import Enum
from sqlalchemy import String, Text, Integer, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.session import Base

class ConsultantType(Base):
    __tablename__ = "consultant_types"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name_en: Mapped[str] = mapped_column(String(100), nullable=False)
    name_he: Mapped[str] = mapped_column(String(100), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    stages = relationship("InspectionStage", back_populates="consultant_type", cascade="all, delete-orphan")
```

**Key Points:**
- Use UUID primary keys with uuid.uuid4 default
- Use SQLAlchemy 2.0 style with Mapped[] type hints
- Include created_at timestamps
- Define bidirectional relationships with cascade options

### Seed Script Pattern

From typical SQLAlchemy seed patterns:

```python
"""Seed script for inspection consultant types and stages"""
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.inspection import ConsultantType, InspectionStage

def seed_inspection_templates():
    """Seed inspection consultant types and their stages"""
    db: Session = SessionLocal()

    try:
        # Check if data already exists
        existing_count = db.query(ConsultantType).count()
        if existing_count > 0:
            print(f"Inspection templates already seeded ({existing_count} consultant types exist)")
            return

        # Define consultant types with stages
        consultant_data = [
            {
                "name_en": "Agronomist",
                "name_he": "אגרונום",
                "stages": [{"stage_number": 1, "name_en": "Stage 1", "name_he": "שלב 1"}]
            },
            # ... more consultant types
        ]

        # Create and commit data
        for data in consultant_data:
            consultant = ConsultantType(name_en=data["name_en"], name_he=data["name_he"])
            db.add(consultant)
            db.flush()  # Get the ID

            for stage in data["stages"]:
                stage_obj = InspectionStage(
                    consultant_type_id=consultant.id,
                    stage_number=stage["stage_number"],
                    name_en=stage["name_en"],
                    name_he=stage["name_he"]
                )
                db.add(stage_obj)

        db.commit()
        print("Successfully seeded inspection templates")

    except Exception as e:
        db.rollback()
        print(f"Error seeding inspection templates: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed_inspection_templates()
```

**Key Points:**
- Check for existing data before seeding (idempotent)
- Use try/except with rollback for error handling
- Use flush() to get IDs before creating related records
- Make script executable with `if __name__ == "__main__"`

## Requirements

### Functional Requirements

1. **Consultant Type Seeding**
   - Description: Create 21 consultant types with bilingual names (English/Hebrew)
   - Acceptance: All 21 consultant types exist in database with both name_en and name_he fields populated

2. **Inspection Stage Seeding**
   - Description: Create inspection stages for each consultant type with the correct count (1-7 stages)
   - Acceptance:
     - Agronomist has 1 stage
     - Soil has 4 stages with explicit Hebrew names (קידוחים, עוגנים, תמיכות פלדה, חפירה)
     - Waterproofing has 5 stages with explicit Hebrew names (רפסודה, קירות דיפון, חדרים רטובים, גגות, תקרת מרתף)
     - All other consultant types have correct stage counts as specified
     - Each stage has a sequential stage_number

3. **Idempotent Seed Execution**
   - Description: Seed script can be run multiple times without creating duplicate data
   - Acceptance: Running the seed script twice results in the same data (no duplicates)

4. **Data Validation**
   - Description: All required fields are populated and valid
   - Acceptance: No NULL values in required fields (name_en, name_he, stage_number)

### Edge Cases

1. **Protection (מיגון) Consultant Type** - This type is marked as TBD in requirements. Implementation should either:
   - Skip it entirely until stage count is clarified
   - Include it with 1 default stage and add a TODO comment
   - Check the Excel file for the actual stage count

2. **Stage Name Generation** - For consultant types without explicit stage names (19 out of 21):
   - Generate default names like "Stage 1", "Stage 2", etc. in English
   - Generate Hebrew equivalents "שלב 1", "שלב 2", etc.
   - Or read from Excel file if available

3. **Database Models Don't Exist** - If ConsultantType and InspectionStage models don't exist:
   - Create them first in `backend/app/models/inspection.py`
   - Create a migration to add the tables
   - Then run the seed script

## Implementation Notes

### DO
- Follow the existing model pattern in `backend/app/models/project.py` for consistency
- Use SQLAlchemy session management from `backend/app/db/session.py`
- Make the seed script idempotent (check for existing data)
- Include both Hebrew and English names for all consultant types and stages
- Use proper error handling with try/except and rollback
- Add logging/print statements to show progress
- Reference the Excel file path in comments: `פיקוחים עליונים - כמות בדיקות.xlsx`

### DON'T
- Create new database connection patterns - use SessionLocal from session.py
- Hardcode UUIDs - use uuid.uuid4() for generation
- Skip error handling or rollback logic
- Create duplicate data if seed is run multiple times
- Use raw SQL - use SQLAlchemy ORM throughout

## Development Environment

### Start Services

```bash
# Start PostgreSQL database (via Docker)
docker-compose up db -d

# Start backend server
cd backend
uvicorn app.main:main --reload --port 8000

# Run seed script
python -m app.db.seeds.inspection_templates
```

### Service URLs
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs
- Database: postgresql://localhost:5432 (via Docker)

### Required Environment Variables
- `DATABASE_URL`: PostgreSQL connection string
- Database credentials from docker-compose.yml or .env file

## Success Criteria

The task is complete when:

1. [ ] Seed directory structure exists at `backend/app/db/seeds/`
2. [ ] Seed script `backend/app/db/seeds/inspection_templates.py` is created
3. [ ] Inspection models exist (ConsultantType, InspectionStage) in `backend/app/models/inspection.py`
4. [ ] Running the seed script populates 21 consultant types
5. [ ] All consultant types have the correct number of stages (1-7 as specified)
6. [ ] Soil and Waterproofing have explicit stage names in Hebrew
7. [ ] Seed script is idempotent (can run multiple times safely)
8. [ ] No console errors when running the seed script
9. [ ] Database query confirms all data is present and correct

## QA Acceptance Criteria

**CRITICAL**: These criteria must be verified by the QA Agent before sign-off.

### Unit Tests
| Test | File | What to Verify |
|------|------|----------------|
| `test_consultant_type_model` | `backend/tests/models/test_inspection.py` | ConsultantType model creates with required fields |
| `test_inspection_stage_model` | `backend/tests/models/test_inspection.py` | InspectionStage model creates with foreign key to ConsultantType |
| `test_seed_idempotency` | `backend/tests/seeds/test_inspection_templates.py` | Running seed twice doesn't duplicate data |
| `test_stage_count_accuracy` | `backend/tests/seeds/test_inspection_templates.py` | Each consultant type has correct number of stages |

### Integration Tests
| Test | Services | What to Verify |
|------|----------|----------------|
| `test_seed_execution` | backend ↔ database | Seed script successfully populates database |
| `test_consultant_type_retrieval` | backend ↔ database | All 21 consultant types can be queried from database |
| `test_stage_relationships` | backend ↔ database | Stages are correctly linked to consultant types via foreign keys |

### End-to-End Tests
| Flow | Steps | Expected Outcome |
|------|-------|------------------|
| Seed and Verify | 1. Run migration 2. Run seed script 3. Query database | 21 consultant types with correct stage counts exist |
| Idempotent Execution | 1. Run seed script 2. Run seed script again 3. Query count | Count remains 21, no duplicates |

### Database Verification
| Check | Query/Command | Expected |
|-------|---------------|----------|
| Consultant Types Count | `SELECT COUNT(*) FROM consultant_types;` | 21 |
| Agronomist Stages | `SELECT COUNT(*) FROM inspection_stages WHERE consultant_type_id = (SELECT id FROM consultant_types WHERE name_en = 'Agronomist');` | 1 |
| Soil Stages | `SELECT COUNT(*) FROM inspection_stages WHERE consultant_type_id = (SELECT id FROM consultant_types WHERE name_en = 'Soil');` | 4 |
| Waterproofing Stages | `SELECT COUNT(*) FROM inspection_stages WHERE consultant_type_id = (SELECT id FROM consultant_types WHERE name_en = 'Waterproofing');` | 5 |
| Hebrew Stage Names for Soil | `SELECT name_he FROM inspection_stages WHERE consultant_type_id = (SELECT id FROM consultant_types WHERE name_en = 'Soil') ORDER BY stage_number;` | Returns: קידוחים, עוגנים, תמיכות פלדה, חפירה |
| Total Stages Count | `SELECT COUNT(*) FROM inspection_stages;` | ~80+ (sum of all stages across 21 consultant types) |

### Manual Verification
| Step | Action | Expected Result |
|------|--------|----------------|
| 1 | Navigate to backend directory | - |
| 2 | Run `python -m app.db.seeds.inspection_templates` | "Successfully seeded inspection templates" message |
| 3 | Run seed script again | "Inspection templates already seeded" message (idempotent) |
| 4 | Check database with queries above | All counts match specifications |
| 5 | Verify no errors in console | No Python exceptions or database errors |

### QA Sign-off Requirements
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] All database verification queries return expected counts
- [ ] Seed script executes without errors
- [ ] Idempotent execution verified (no duplicates on re-run)
- [ ] Hebrew names are correctly encoded and displayed
- [ ] Stage names for Soil and Waterproofing match Excel data exactly
- [ ] No regressions in existing functionality
- [ ] Code follows existing patterns in backend/app/models/
- [ ] Proper error handling and rollback implemented

### Additional Verification Steps
1. **Excel Data Verification**: Compare seeded data against `פיקוחים עליונים - כמות בדיקות.xlsx` to ensure accuracy
2. **Character Encoding**: Verify Hebrew characters display correctly in database queries
3. **Foreign Key Integrity**: Ensure all stages have valid consultant_type_id references
4. **Data Consistency**: Verify stage_number sequences are correct (1, 2, 3... for each consultant type)
