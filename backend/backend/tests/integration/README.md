# Integration Tests for Project-Inspection Relationship

This directory contains integration tests for verifying the Project-Inspection relationship integrity.

## Test: Project-Inspection Relationship Integrity

**File:** `test_project_inspection_relationship.py`

**Purpose:** Verify that the Project-Inspection relationship works correctly with proper foreign key constraints.

### Prerequisites

1. PostgreSQL database running and accessible
2. Required Python dependencies installed:
   ```bash
   pip install greenlet asyncpg
   ```
3. Database migrations applied:
   ```bash
   alembic upgrade head
   ```

### What the Test Verifies

#### Test 1: Create Project Inspection
- Creates a test project
- Creates a test consultant type
- Creates a project inspection linking to both
- Verifies all relationships are correctly established

#### Test 2: Query Inspection by Project ID
- Queries inspections filtered by project_id
- Verifies the inspection can be found
- Confirms the project_id filter works correctly

#### Test 3: Verify Foreign Key Constraints
- Loads the inspection with its relationships
- Verifies the foreign key references are correct
- Confirms `inspection.project_id` matches `project.id`
- Confirms `inspection.consultant_type_id` matches `consultant_type.id`

#### Test 4: Non-existent Project (Negative Test)
- Attempts to create an inspection for a non-existent project
- Expects a foreign key constraint violation error
- Verifies the database enforces referential integrity

### Running the Tests

#### Option 1: Direct Execution

```bash
cd backend
PYTHONPATH=. ./venv/bin/python tests/integration/test_project_inspection_relationship.py
```

#### Option 2: Using pytest (recommended)

```bash
cd backend
pytest tests/integration/test_project_inspection_relationship.py -v
```

### Expected Output

When all tests pass, you should see:

```
============================================================
Project-Inspection Relationship Integrity Tests
============================================================

=== Test 1: Create Project Inspection ===
✓ Created test project: <uuid>
✓ Created test consultant type: <uuid>
✓ Created test inspection: <uuid>
✓ Inspection created with correct relationships

=== Test 2: Query Inspection by Project ID ===
✓ Found 1 inspection(s) for project <uuid>
✓ Successfully queried inspection <uuid> by project_id

=== Test 3: Verify Foreign Key Constraints ===
✓ Foreign key constraint verified: inspection.project_id == <uuid>
✓ Foreign key constraint verified: inspection.consultant_type_id == <uuid>

=== Test 4: Create Inspection for Non-existent Project ===
✓ Confirmed project <uuid> does not exist
✓ Expected error caught: Foreign key constraint violation
  Error: IntegrityError

============================================================
✓ All tests passed!
============================================================
✓ Cleaned up test data
```

### Test Cleanup

The test automatically cleans up all created test data after execution, regardless of success or failure. This ensures no test pollution in the database.

### Troubleshooting

**Error: `ModuleNotFoundError: No module named 'app'`**
- Make sure to run with `PYTHONPATH=.` from the backend directory

**Error: `No module named 'greenlet'`**
- Install greenlet: `pip install greenlet`

**Error: Database connection refused**
- Ensure PostgreSQL is running
- Check the `database_url` in your `.env` file or `app/config.py`

**Error: Table does not exist**
- Run migrations: `alembic upgrade head`

## Database Schema Dependencies

The test requires the following tables to exist:
- `projects` - Project model
- `consultant_types` - Consultant type model
- `project_inspections` - Project inspection model with foreign keys to both projects and consultant_types

These tables are created by the Alembic migration: `003_add_supervision_inspections.py`
