# Specification: Create Alembic Migration for Checklist Templates

## Overview

Create a database migration using Alembic to add five new tables that support a checklist templates system. This migration will enable templates to be defined hierarchically (template → sub-sections → items), instantiated for specific projects/areas, and tracked through user responses. This is part of Linear issue BUI-29.

## Workflow Type

**Type**: feature

**Rationale**: This is a new database schema addition that introduces a complete feature subsystem (checklist templates) to the application. It follows a structured migration approach using Alembic's autogenerate capability.

## Task Scope

### Services Involved
- **backend** (primary) - Define SQLAlchemy models and generate Alembic migration

### This Task Will:
- [ ] Create SQLAlchemy model definitions for 5 new tables
- [ ] Run Alembic autogenerate to create migration file
- [ ] Review and enhance generated migration with required indexes
- [ ] Test migration upgrade and downgrade paths
- [ ] Verify all foreign key relationships and indexes are correct

### Out of Scope:
- API endpoints for checklist templates (future task)
- Frontend components to display checklists (future task)
- Seeding initial template data (future task)
- Integration with existing project/area features (future task)

## Service Context

### Backend

**Tech Stack:**
- Language: Python
- Framework: FastAPI
- ORM: SQLAlchemy
- Migration Tool: Alembic
- Database: PostgreSQL (via psycopg2-binary)
- Key directories: `app/` (application code)

**Entry Point:** N/A (database migration task)

**How to Run:**
```bash
cd backend
source venv/bin/activate  # or activate your virtual environment
alembic upgrade head
```

**Port:** 8000 (not directly relevant for migration)

**Migration Directory:** `alembic/versions`
**Config File:** `alembic.ini`

## Files to Modify

| File | Service | What to Change |
|------|---------|---------------|
| `backend/app/models/` (new file) | backend | Create new model file for checklist template models (e.g., `checklist_templates.py`) |
| `backend/alembic/versions/` (new file) | backend | Alembic will autogenerate a new migration file here |

## Files to Reference

These files show patterns to follow:

| File | Pattern to Copy |
|------|----------------|
| `backend/app/models/*.py` (existing models) | SQLAlchemy model structure, table naming, foreign keys, indexes |
| `backend/alembic/versions/*.py` (existing migrations) | Migration file structure, upgrade/downgrade patterns |
| `backend/app/models/user.py` | User model pattern for relationships if needed |

## Database Schema Design

### Table: checklist_templates

**Purpose**: Root-level template definitions

**Columns** (inferred from requirements):
- `id` (UUID, PK)
- `name` (String) - Template name
- `level` (String, indexed) - Template categorization level
- `group_name` (String, indexed) - Template grouping
- `description` (Text, nullable) - Template description
- `created_at` (DateTime)
- `updated_at` (DateTime)

**Indexes**:
- `ix_checklist_templates_level` on `level`
- `ix_checklist_templates_group_name` on `group_name`

---

### Table: checklist_sub_sections

**Purpose**: Organize checklist items into sections within templates

**Columns** (inferred):
- `id` (UUID, PK)
- `template_id` (UUID, FK → checklist_templates.id, indexed)
- `title` (String) - Section title
- `order` (Integer, indexed) - Display order within template
- `description` (Text, nullable)
- `created_at` (DateTime)
- `updated_at` (DateTime)

**Indexes**:
- `ix_checklist_sub_sections_template_id` on `template_id`
- `ix_checklist_sub_sections_order` on `order`

**Foreign Keys**:
- `template_id` → `checklist_templates.id` (CASCADE on delete)

---

### Table: checklist_item_templates

**Purpose**: Individual checklist item definitions within sub-sections

**Columns** (inferred):
- `id` (UUID, PK)
- `sub_section_id` (UUID, FK → checklist_sub_sections.id, indexed)
- `text` (Text) - Item text/question
- `order` (Integer, indexed) - Display order within sub-section
- `item_type` (String) - Type of response (checkbox, text, number, etc.)
- `required` (Boolean, default=False)
- `created_at` (DateTime)
- `updated_at` (DateTime)

**Indexes**:
- `ix_checklist_item_templates_sub_section_id` on `sub_section_id`
- `ix_checklist_item_templates_order` on `order`

**Foreign Keys**:
- `sub_section_id` → `checklist_sub_sections.id` (CASCADE on delete)

---

### Table: checklist_instances

**Purpose**: Concrete instances of templates applied to projects

**Columns** (inferred):
- `id` (UUID, PK)
- `project_id` (UUID, FK → projects.id, indexed)
- `template_id` (UUID, FK → checklist_templates.id, indexed)
- `area_id` (UUID, FK → areas.id, indexed, nullable)
- `status` (String, indexed) - Workflow state (draft, in_progress, completed)
- `created_by` (UUID, FK → users.id, nullable)
- `created_at` (DateTime)
- `updated_at` (DateTime)
- `completed_at` (DateTime, nullable)

**Indexes**:
- `ix_checklist_instances_project_id` on `project_id`
- `ix_checklist_instances_template_id` on `template_id`
- `ix_checklist_instances_area_id` on `area_id`
- `ix_checklist_instances_status` on `status`

**Foreign Keys**:
- `project_id` → `projects.id` (CASCADE on delete)
- `template_id` → `checklist_templates.id` (RESTRICT on delete - prevent deletion of templates in use)
- `area_id` → `areas.id` (SET NULL on delete)
- `created_by` → `users.id` (SET NULL on delete)

---

### Table: checklist_item_responses

**Purpose**: User responses to checklist items within an instance

**Columns** (inferred):
- `id` (UUID, PK)
- `instance_id` (UUID, FK → checklist_instances.id, indexed)
- `item_template_id` (UUID, FK → checklist_item_templates.id, indexed)
- `response_value` (Text, nullable) - User's response
- `completed` (Boolean, default=False)
- `responded_by` (UUID, FK → users.id, nullable)
- `responded_at` (DateTime, nullable)
- `created_at` (DateTime)
- `updated_at` (DateTime)

**Indexes**:
- `ix_checklist_item_responses_instance_id` on `instance_id`
- `ix_checklist_item_responses_item_template_id` on `item_template_id`

**Unique Constraint**:
- `unique_instance_item` on (`instance_id`, `item_template_id`) - One response per item per instance

**Foreign Keys**:
- `instance_id` → `checklist_instances.id` (CASCADE on delete)
- `item_template_id` → `checklist_item_templates.id` (RESTRICT on delete)
- `responded_by` → `users.id` (SET NULL on delete)

---

## Patterns to Follow

### SQLAlchemy Model Pattern

From existing models in `backend/app/models/`:

```python
from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey, Text, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.base_class import Base
import uuid
from datetime import datetime

class ChecklistTemplate(Base):
    __tablename__ = "checklist_templates"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    level = Column(String, nullable=False, index=True)
    group_name = Column(String, index=True)
    description = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    sub_sections = relationship("ChecklistSubSection", back_populates="template", cascade="all, delete-orphan")
```

**Key Points:**
- Use UUID for primary keys with `default=uuid.uuid4`
- Use `index=True` for single-column indexes
- Define relationships with `back_populates` for bidirectional access
- Include `created_at` and `updated_at` timestamps
- Use appropriate SQLAlchemy types (String, Text, Integer, Boolean, DateTime)

### Alembic Migration Pattern

From existing migrations in `backend/alembic/versions/`:

```python
"""add checklist templates

Revision ID: xxxxx
Revises: yyyyy
Create Date: 2026-01-29

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'xxxxx'
down_revision = 'yyyyy'
branch_labels = None
depends_on = None

def upgrade():
    # Create tables
    op.create_table(
        'checklist_templates',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        # ... more columns
    )

    # Create indexes
    op.create_index('ix_checklist_templates_level', 'checklist_templates', ['level'])

def downgrade():
    # Drop in reverse order
    op.drop_index('ix_checklist_templates_level')
    op.drop_table('checklist_templates')
```

**Key Points:**
- Autogenerate creates most of the structure
- Review generated migration for completeness
- Ensure all indexes are present
- Test both upgrade and downgrade paths
- Drop tables in reverse order of creation (due to foreign keys)

## Requirements

### Functional Requirements

1. **Define SQLAlchemy Models**
   - Description: Create model classes for all 5 tables with proper types, relationships, and indexes
   - Acceptance: Models import successfully and follow existing patterns in the codebase

2. **Generate Alembic Migration**
   - Description: Run `alembic revision --autogenerate -m "add checklist templates"` to create migration file
   - Acceptance: Migration file created in `backend/alembic/versions/` with correct table definitions

3. **Review and Enhance Migration**
   - Description: Manually review generated migration and add any missing indexes or constraints
   - Acceptance: All required indexes from the specification are present in the migration

4. **Test Migration Paths**
   - Description: Test both upgrade and downgrade operations
   - Acceptance: `alembic upgrade head` and `alembic downgrade -1` execute without errors

### Edge Cases

1. **Foreign Key Deletion Behavior** - Carefully set CASCADE vs RESTRICT vs SET NULL based on business logic (instances should be deleted when projects are deleted, but templates should not be deletable if in use)
2. **Unique Constraint on Responses** - Ensure one response per item per instance to prevent duplicates
3. **Nullable Area ID** - Areas are optional for checklist instances (project-level vs area-level checklists)
4. **Order Column Gaps** - Order values don't need to be sequential, but should support reordering

## Implementation Notes

### DO
- Follow existing model patterns in `backend/app/models/` for consistency
- Use UUID primary keys matching existing tables
- Include `created_at` and `updated_at` timestamps on all tables
- Review the autogenerated migration file carefully before applying
- Test both upgrade and downgrade paths in development environment
- Use PostgreSQL UUID type: `UUID(as_uuid=True)`
- Set appropriate cascade behaviors on foreign keys

### DON'T
- Don't skip index creation - they're critical for query performance
- Don't forget to test the downgrade path - it should cleanly remove all tables
- Don't use auto-incrementing integers for IDs - use UUIDs to match project patterns
- Don't apply migration to production without testing locally first
- Don't create models in the wrong location - they should be in `backend/app/models/`

## Development Environment

### Start Services

```bash
# Start PostgreSQL database
docker-compose up -d db

# Activate backend environment
cd backend
source venv/bin/activate  # or your virtualenv activation command

# Run migration
alembic upgrade head
```

### Service URLs
- Backend API: http://localhost:8000
- PostgreSQL: localhost:5432 (database: `builder_db` - verify in docker-compose.yml)

### Required Environment Variables
- `DATABASE_URL`: PostgreSQL connection string (verify in `.env` or `alembic.ini`)

## Success Criteria

The task is complete when:

1. [ ] SQLAlchemy models created for all 5 tables with correct column types
2. [ ] All required indexes defined in model classes or migration file
3. [ ] Alembic migration file generated successfully
4. [ ] Migration reviewed and manually enhanced if necessary
5. [ ] `alembic upgrade head` executes successfully without errors
6. [ ] `alembic downgrade -1` executes successfully without errors
7. [ ] Database tables created with correct schema (verified via psql or database tool)
8. [ ] All foreign key relationships present and correct
9. [ ] All indexes exist in the database
10. [ ] No console errors or warnings during migration
11. [ ] Existing tests still pass (if any)

## QA Acceptance Criteria

**CRITICAL**: These criteria must be verified by the QA Agent before sign-off.

### Unit Tests
| Test | File | What to Verify |
|------|------|----------------|
| Model Import Test | `backend/tests/models/test_checklist_templates.py` (to be created) | All model classes import successfully |
| Model Instantiation Test | `backend/tests/models/test_checklist_templates.py` | Models can be instantiated with valid data |

### Integration Tests
| Test | Services | What to Verify |
|------|----------|----------------|
| Migration Upgrade Test | backend ↔ database | `alembic upgrade head` completes without errors |
| Migration Downgrade Test | backend ↔ database | `alembic downgrade -1` completes without errors |
| Foreign Key Test | backend ↔ database | Foreign key constraints work correctly (test cascade behavior) |

### Database Verification
| Check | Query/Command | Expected |
|-------|---------------|----------|
| Tables exist | `\dt checklist*` in psql | All 5 tables listed |
| Indexes exist | `\di checklist*` in psql | All required indexes listed |
| Schema matches spec | `\d checklist_templates` (repeat for each table) | Column types and constraints match specification |
| Migration recorded | `SELECT * FROM alembic_version;` | New revision ID present |

### Manual Verification Steps
1. **Check table creation**:
   ```bash
   docker exec -it <postgres-container> psql -U <user> -d builder_db -c "\dt checklist*"
   ```
   Expected: 5 tables listed (checklist_templates, checklist_sub_sections, checklist_item_templates, checklist_instances, checklist_item_responses)

2. **Check indexes**:
   ```bash
   docker exec -it <postgres-container> psql -U <user> -d builder_db -c "\di checklist*"
   ```
   Expected: All required indexes present (9 total indexes across tables)

3. **Check foreign keys**:
   ```bash
   docker exec -it <postgres-container> psql -U <user> -d builder_db -c "\d checklist_sub_sections"
   ```
   Expected: Foreign key constraint on `template_id` referencing `checklist_templates(id)`

4. **Test downgrade**:
   ```bash
   cd backend
   alembic downgrade -1
   # Verify tables are gone
   docker exec -it <postgres-container> psql -U <user> -d builder_db -c "\dt checklist*"
   # Re-upgrade
   alembic upgrade head
   ```
   Expected: Tables removed cleanly, then recreated successfully

### QA Sign-off Requirements
- [ ] All 5 tables created successfully
- [ ] All 9 required indexes exist in database
- [ ] All foreign key relationships verified
- [ ] Migration upgrade executes without errors
- [ ] Migration downgrade executes without errors and removes all tables cleanly
- [ ] No regressions in existing functionality
- [ ] Database schema matches specification exactly
- [ ] Alembic version table updated correctly
- [ ] No orphaned objects left after downgrade
