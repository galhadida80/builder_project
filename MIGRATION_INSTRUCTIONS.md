# Migration Application Instructions

## Status
The Alembic migration `004_add_equipment_templates.py` has been successfully created and is ready to be applied to the database.

## Migration Details
- **File**: `backend/alembic/versions/004_add_equipment_templates.py`
- **Revision**: 004
- **Previous Revision**: 001
- **Tables Created**: 5 (consultant_types, equipment_templates, equipment_template_consultants, equipment_approval_submissions, equipment_approval_decisions)
- **Indexes Created**: 6

## How to Apply the Migration

### Option 1: Using Docker Compose (Recommended)
The backend service is configured to automatically run migrations on startup:

```bash
# From project root
docker compose up -d db          # Start database
docker compose up backend        # Start backend (runs alembic upgrade head)
```

### Option 2: Manual Alembic Command
If you have direct database access and alembic installed:

```bash
# From project root
cd backend

# Ensure DATABASE_URL is set
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/builder_db"

# Apply migration
alembic upgrade head

# Verify migration
alembic current
# Expected output: 004 (head)

# List migration history
alembic history
```

### Option 3: Using Backend Container
If the backend container is already running:

```bash
docker compose exec backend alembic upgrade head
docker compose exec backend alembic current
```

## Verification Commands

After applying the migration, verify the database schema:

```bash
# Check tables exist
psql -h localhost -U postgres -d builder_db -c "\dt" | grep -E "(consultant_types|equipment_templates|equipment_template_consultants|equipment_approval_submissions|equipment_approval_decisions)"

# Check indexes
psql -h localhost -U postgres -d builder_db -c "\di" | grep -E "(equipment_templates|equipment_approval)"

# Describe equipment_templates table
psql -h localhost -U postgres -d builder_db -c "\d equipment_templates"
```

## Expected Results

### Tables Created:
1. `consultant_types` - Consultant type definitions
2. `equipment_templates` - Equipment template configurations
3. `equipment_template_consultants` - Junction table (many-to-many)
4. `equipment_approval_submissions` - Approval submission tracking
5. `equipment_approval_decisions` - Approval decision records

### Indexes Created:
1. `ix_equipment_templates_name`
2. `ix_equipment_templates_category`
3. `ix_equipment_approval_submissions_project_id`
4. `ix_equipment_approval_submissions_template_id`
5. `ix_equipment_approval_submissions_status`
6. `ix_equipment_approval_decisions_submission_id`

## Environment Limitations

**Note**: This migration was created in a restricted worktree environment where:
- `alembic` command is blocked for security
- Docker commands are not available
- Database connection is not accessible

The migration file is complete and ready to be applied in the main development or deployment environment.

## Rollback Instructions

If needed, to rollback this migration:

```bash
cd backend
alembic downgrade -1
```

This will drop all 5 tables and their indexes in the correct order to respect foreign key dependencies.
