# Specification: Create Alembic Migration for Equipment Templates

## Overview

Create database migration to support the Equipment Templates feature, enabling the system to manage standardized equipment configurations, consultant type associations, and approval workflows. This migration adds five new tables: consultant_types for defining consultant categories, equipment_templates for storing template configurations, equipment_template_consultants as a junction table for many-to-many relationships, and two tables (equipment_approval_submissions and equipment_approval_decisions) to track the approval workflow from submission to final decision.

## Workflow Type

**Type**: feature

**Rationale**: This task introduces new database schema to support a new feature (Equipment Templates), which includes multiple interconnected tables and establishes foundational data structures for template management and approval workflows. The migration adds net-new functionality to the database schema.

## Task Scope

### Services Involved
- **backend** (primary) - Python/FastAPI service containing SQLAlchemy models and Alembic migrations

### This Task Will:
- [x] Define SQLAlchemy models for 5 new tables (consultant_types, equipment_templates, equipment_template_consultants, equipment_approval_submissions, equipment_approval_decisions)
- [x] Generate Alembic migration using autogenerate with message "add equipment templates"
- [x] Add required indexes for query performance (name, category, project_id, template_id, status, submission_id)
- [x] Apply migration to database using `alembic upgrade head`
- [x] Verify migration creates all tables and indexes correctly

### Out of Scope:
- API endpoints for equipment templates (separate task)
- Frontend UI for template management
- Business logic for approval workflows
- Data seeding or initial template creation
- Migration rollback testing (standard practice only)

## Service Context

### Backend Service

**Tech Stack:**
- Language: Python
- Framework: FastAPI
- ORM: SQLAlchemy
- Migration Tool: Alembic
- Database: PostgreSQL

**Entry Point:** `app/main.py`

**How to Run:**
```bash
cd backend
# Start development server
uvicorn app.main:app --reload --port 8000

# Run migrations
alembic revision --autogenerate -m "add equipment templates"
alembic upgrade head

# Check migration status
alembic current
alembic history
```

**Port:** 8000

**Key Directories:**
- `app/models/` - SQLAlchemy model definitions
- `alembic/versions/` - Migration files
- `alembic.ini` - Alembic configuration
- `app/db/` - Database session and connection setup

## Files to Modify

| File | Service | What to Change |
|------|---------|---------------|
| *New file* `backend/app/models/equipment_template.py` | backend | Create new model file with 5 model classes: ConsultantType, EquipmentTemplate, EquipmentTemplateConsultant, EquipmentApprovalSubmission, EquipmentApprovalDecision |
| `backend/app/models/__init__.py` | backend | Import new models to ensure Alembic discovers them for autogeneration |
| *New file* `backend/alembic/versions/004_add_equipment_templates.py` | backend | Generated migration file (via `alembic revision --autogenerate`) |

## Files to Reference

These files show patterns to follow:

| File | Pattern to Copy |
|------|----------------|
| `backend/app/models/equipment.py` | SQLAlchemy model structure: UUID primary keys, Mapped types, mapped_column syntax, DateTime defaults, ForeignKey relationships, cascade deletes |
| `backend/app/models/approval.py` | Approval workflow patterns: status tracking, foreign keys to users, timestamps, text fields for comments |
| `backend/alembic/versions/001_initial_tables.py` | Migration structure: revision metadata, upgrade/downgrade functions, op.create_table syntax, postgresql.UUID usage, index creation |
| `backend/alembic/versions/003_add_inspection_models.py` | Recent migration pattern: simpler migration with related tables, proper foreign key cascades |

## Patterns to Follow

### Pattern 1: SQLAlchemy Model Definition

From `backend/app/models/equipment.py`:

```python
import uuid
from datetime import datetime
from sqlalchemy import String, Text, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.session import Base

class Equipment(Base):
    __tablename__ = "equipment"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    project = relationship("Project", back_populates="equipment")
```

**Key Points:**
- Use UUID primary keys with `default=uuid.uuid4`
- Use `Mapped[]` type hints with `mapped_column()`
- Include `created_at` and `updated_at` timestamps with defaults
- Use `ForeignKey` with `ondelete="CASCADE"` for parent-child relationships
- Define relationships using `relationship()` for ORM navigation

### Pattern 2: Junction Table for Many-to-Many

From database design patterns:

```python
class EquipmentTemplateConsultant(Base):
    __tablename__ = "equipment_template_consultants"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    template_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("equipment_templates.id", ondelete="CASCADE"))
    consultant_type_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("consultant_types.id", ondelete="CASCADE"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
```

**Key Points:**
- Junction tables should have their own UUID primary key
- Reference both parent tables with foreign keys
- Use CASCADE delete to maintain referential integrity
- Optionally add UniqueConstraint if duplicates shouldn't exist
- Keep junction tables simple with minimal additional fields

### Pattern 3: Alembic Migration Structure

From `backend/alembic/versions/003_add_inspection_models.py`:

```python
"""Add equipment templates

Revision ID: 004
Revises: 003
Create Date: 2026-01-29

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = '004'
down_revision: Union[str, None] = '003'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.create_table(
        'consultant_types',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('description', sa.Text()),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
    )
    # Add indexes
    op.create_index('ix_equipment_templates_name', 'equipment_templates', ['name'])

def downgrade() -> None:
    op.drop_index('ix_equipment_templates_name')
    op.drop_table('consultant_types')
```

**Key Points:**
- Include descriptive docstring with revision ID and date
- Set `revision` and `down_revision` to maintain migration chain
- Use `postgresql.UUID(as_uuid=True)` for UUID columns
- Use `server_default=sa.func.now()` for timestamp defaults
- Create indexes after tables for query performance
- Implement downgrade to reverse changes (drop in reverse order)

## Requirements

### Functional Requirements

1. **Consultant Types Table**
   - Description: Base table to define types of consultants (e.g., structural, electrical, mechanical)
   - Columns: id (UUID PK), name (String 100, required), description (Text), created_at (DateTime)
   - Acceptance: Table created, can insert consultant type records, supports lookups by ID and name

2. **Equipment Templates Table**
   - Description: Master table for equipment template definitions
   - Columns: id (UUID PK), name (String 255, required), category (String 100), description (Text), specifications (JSONB), is_active (Boolean), created_at, updated_at, created_by_id (UUID FK to users)
   - Indexes: name, category
   - Acceptance: Table created with all columns, indexes exist, foreign key to users table is valid

3. **Equipment Template Consultants Junction Table**
   - Description: Links equipment templates to required consultant types (many-to-many)
   - Columns: id (UUID PK), template_id (UUID FK to equipment_templates), consultant_type_id (UUID FK to consultant_types), created_at
   - Acceptance: Table created, foreign keys enforce referential integrity, cascade deletes work correctly

4. **Equipment Approval Submissions Table**
   - Description: Tracks approval submission requests for equipment
   - Columns: id (UUID PK), project_id (UUID FK to projects), template_id (UUID FK to equipment_templates), equipment_id (UUID FK to equipment), status (String 50), submitted_at (DateTime), submitted_by_id (UUID FK to users), created_at, updated_at
   - Indexes: project_id, template_id, status
   - Acceptance: Table created with all indexes, foreign keys validate, status column supports workflow states

5. **Equipment Approval Decisions Table**
   - Description: Records approval decisions made on submissions
   - Columns: id (UUID PK), submission_id (UUID FK to equipment_approval_submissions), approver_id (UUID FK to users), decision (String 50), comments (Text), decided_at (DateTime), created_at
   - Indexes: submission_id
   - Acceptance: Table created, foreign key links to submissions, can query decisions by submission efficiently

### Edge Cases

1. **Orphaned Records** - Ensure CASCADE deletes work: if equipment_template is deleted, all related equipment_template_consultants, approval_submissions should cascade delete
2. **Null Foreign Keys** - Some foreign keys like equipment_id in submissions may be null initially (template-only submissions), ensure nullable is set appropriately
3. **Timestamp Precision** - Use DateTime (not Date) for audit fields to preserve exact timing
4. **JSONB Performance** - specifications column uses JSONB for flexible schema; consider GIN index in future if queries filter on JSONB content
5. **Migration Rollback** - Ensure downgrade() drops tables in reverse dependency order to avoid foreign key constraint violations

## Implementation Notes

### DO
- Follow the pattern in `equipment.py` for model structure (UUID, Mapped types, timestamps)
- Import all new models in `app/models/__init__.py` so Alembic autogenerate finds them
- Use `alembic revision --autogenerate -m "add equipment templates"` to generate migration
- Review the generated migration file before applying to ensure all tables and indexes are included
- Run `alembic upgrade head` to apply the migration
- Add `ondelete="CASCADE"` to foreign keys for parent-child relationships (template → consultants, submission → decisions)
- Use `ondelete="SET NULL"` for soft references where deletion shouldn't cascade (e.g., user references)
- Create indexes after tables in upgrade(), drop indexes before tables in downgrade()

### DON'T
- Don't manually write the migration file - use autogenerate to ensure consistency
- Don't forget to import models in `__init__.py` (autogenerate won't detect them otherwise)
- Don't skip reviewing the generated migration (autogenerate may miss indexes or constraints)
- Don't use Date when DateTime is needed (submissions/decisions need precise timestamps)
- Don't create indexes on every column - only on fields frequently used in WHERE/JOIN clauses
- Don't forget to increment revision ID (004) and chain to previous revision (003)

## Development Environment

### Start Services

```bash
# From project root
cd backend

# Ensure database is running (via Docker Compose)
docker-compose up -d db

# Create models
# Edit app/models/equipment_template.py to define all 5 models

# Update imports
# Add new models to app/models/__init__.py

# Generate migration
alembic revision --autogenerate -m "add equipment templates"

# Review generated migration file
cat alembic/versions/004_*.py

# Apply migration
alembic upgrade head

# Verify migration
alembic current
psql -h localhost -U <user> -d <db> -c "\dt"  # List tables
psql -h localhost -U <user> -d <db> -c "\d equipment_templates"  # Describe table
psql -h localhost -U <user> -d <db> -c "\di"  # List indexes
```

### Service URLs
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

### Required Environment Variables
(Typically in backend/.env)
- `DATABASE_URL`: PostgreSQL connection string (e.g., postgresql://user:pass@localhost:5432/builder_db)
- `POSTGRES_USER`: Database username
- `POSTGRES_PASSWORD`: Database password
- `POSTGRES_DB`: Database name

## Success Criteria

The task is complete when:

1. [x] All 5 model classes defined in `app/models/equipment_template.py` following existing patterns
2. [x] Models imported in `app/models/__init__.py`
3. [x] Migration generated via `alembic revision --autogenerate -m "add equipment templates"`
4. [x] Generated migration reviewed and includes all 5 tables with correct columns and types
5. [x] All required indexes created (equipment_templates: name, category; equipment_approval_submissions: project_id, template_id, status; equipment_approval_decisions: submission_id)
6. [x] Migration applied via `alembic upgrade head` without errors
7. [x] Database schema verified: tables exist, columns have correct types, foreign keys enforced, indexes present
8. [x] No console errors during migration
9. [x] Alembic history shows new migration at head
10. [x] Downgrade function properly reverses changes

## QA Acceptance Criteria

**CRITICAL**: These criteria must be verified by the QA Agent before sign-off.

### Unit Tests
| Test | File | What to Verify |
|------|------|----------------|
| Model imports work | `app/models/__init__.py` | All 5 new models can be imported without errors |
| Model instantiation | `app/models/equipment_template.py` | Each model class can be instantiated with required fields |
| Foreign key relationships | Model tests | Foreign keys correctly reference parent tables (users, projects, equipment, equipment_templates, consultant_types) |

### Integration Tests
| Test | Services | What to Verify |
|------|----------|----------------|
| Migration applies cleanly | backend ↔ database | `alembic upgrade head` completes without errors |
| Migration rollback works | backend ↔ database | `alembic downgrade -1` successfully removes tables |
| Foreign key constraints | backend ↔ database | Attempting to insert record with invalid FK fails with integrity error |
| Cascade deletes work | backend ↔ database | Deleting equipment_template cascades to equipment_template_consultants |

### End-to-End Tests
| Flow | Steps | Expected Outcome |
|------|-------|------------------|
| Full migration lifecycle | 1. Fresh DB 2. Run `alembic upgrade head` 3. Verify tables 4. Run `alembic downgrade -1` 5. Verify tables dropped | All 5 tables created and dropped correctly |
| Index performance | 1. Insert test data 2. Query by indexed columns (name, category, project_id, status) 3. Check query plan | Indexes are used in query execution plans |

### Database Verification
| Check | Query/Command | Expected |
|-------|---------------|----------|
| Tables exist | `SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename LIKE '%equipment%' OR tablename='consultant_types'` | consultant_types, equipment_templates, equipment_template_consultants, equipment_approval_submissions, equipment_approval_decisions appear in results |
| Column data types | `SELECT column_name, data_type FROM information_schema.columns WHERE table_name='equipment_templates'` | All columns have correct types (UUID, VARCHAR, TEXT, JSONB, BOOLEAN, TIMESTAMP) |
| Foreign keys defined | `SELECT constraint_name, table_name FROM information_schema.table_constraints WHERE constraint_type='FOREIGN KEY' AND table_name IN ('equipment_templates', 'equipment_template_consultants', 'equipment_approval_submissions', 'equipment_approval_decisions')` | Foreign key constraints exist for all FK columns |
| Indexes created | `SELECT indexname FROM pg_indexes WHERE tablename IN ('equipment_templates', 'equipment_approval_submissions', 'equipment_approval_decisions')` | Expected indexes: ix_equipment_templates_name, ix_equipment_templates_category, ix_equipment_approval_submissions_project_id, ix_equipment_approval_submissions_template_id, ix_equipment_approval_submissions_status, ix_equipment_approval_decisions_submission_id |
| Migration at head | `alembic current` | Shows revision 004 (add equipment templates) as current |

### QA Sign-off Requirements
- [x] Migration generated without warnings or errors
- [x] All 5 tables created with correct schema
- [x] All foreign key relationships properly defined
- [x] All required indexes created and functioning
- [x] Cascade delete behavior verified for junction table
- [x] Migration can be rolled back cleanly (downgrade works)
- [x] No regressions in existing functionality (other tables unaffected)
- [x] Code follows established SQLAlchemy model patterns
- [x] No security vulnerabilities introduced (SQL injection, permission issues)
- [x] Alembic history is clean and properly chained
