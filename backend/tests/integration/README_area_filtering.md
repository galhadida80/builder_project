# Area-Inspection Filtering Integration Test

## Purpose

This integration test verifies the Area-Inspection filtering functionality in the supervision inspection system. It ensures that:

1. Inspections can be created with a specific `area_id` (area-specific inspections)
2. The area-based filtering endpoint correctly returns only inspections for a specific area
3. Project-wide inspections (without `area_id`) are properly isolated from area-specific queries
4. Multiple areas maintain proper isolation (Area 1 inspections don't appear in Area 2 queries)

## Test Coverage

### Test 1: Create Inspection with Area ID
- Creates a ProjectInspection with a specific area_id
- Verifies the inspection is properly linked to the area

### Test 2: Query Inspections by Area ID
- Simulates the GET `/projects/{id}/areas/{area_id}/inspections` endpoint
- Verifies that all returned inspections belong to the specified area

### Test 3: Create Project-Wide Inspection
- Creates a ProjectInspection without an area_id (project-wide)
- Verifies the inspection is created with `area_id = NULL`

### Test 4: Verify Project-Wide Inspection Isolation
- Confirms project-wide inspections don't appear in area-specific queries
- Confirms project-wide inspections do appear in project-level queries

### Test 5: Multiple Area Inspection Isolation
- Creates inspections for multiple areas
- Verifies that Area 1 inspections don't appear in Area 2 queries and vice versa

## Requirements

The verification steps specified in subtask-6-2 are:

1. ✓ Create inspection with area_id
2. ✓ GET /projects/{id}/areas/{area_id}/inspections
3. ✓ Verify only inspections for that area returned
4. ✓ Create inspection without area_id (project-wide)
5. ✓ Verify it doesn't appear in area-specific query

All requirements are covered by this test suite.

## Database Setup

Before running the test, ensure PostgreSQL is running and accessible:

```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Or if running locally
pg_isready -h localhost -p 5432
```

## Running the Test

### Option 1: Using pytest (Recommended)

```bash
cd backend
pytest tests/integration/test_area_inspection_filtering.py -v
```

### Option 2: Direct execution

```bash
cd backend
python tests/integration/test_area_inspection_filtering.py
```

### Option 3: Run all integration tests

```bash
cd backend
pytest tests/integration/ -v
```

## Expected Output

When all tests pass, you should see output like:

```
============================================================
Area-Inspection Filtering Integration Tests
============================================================

=== Setup: Create Base Test Data ===
✓ Created test project: <uuid>
✓ Created test consultant type: <uuid>
✓ Created test area 1: <uuid>
✓ Created test area 2: <uuid>

=== Test 1: Create Inspection with Area ID ===
✓ Created inspection for area 1: <uuid>
✓ Inspection created with correct area_id

=== Test 2: Query Inspections by Area ID ===
✓ Found 1 inspection(s) for area <uuid>
✓ All inspections correctly filtered by area_id=<uuid>

=== Test 3: Create Project-Wide Inspection (no area_id) ===
✓ Created project-wide inspection: <uuid>
✓ Project-wide inspection created without area_id

=== Test 4: Verify Project-Wide Inspection Not in Area Query ===
✓ Project-wide inspection not found in area 1 query (correct)
✓ Project-wide inspection not found in area 2 query (correct)
✓ Project-wide inspection found in project-level query (correct)

=== Test 5: Multiple Area Inspections (Verify Isolation) ===
✓ Created inspection for area 2: <uuid>
✓ Area 2 inspection not found in area 1 query (correct isolation)
✓ Area 2 inspection found in area 2 query (correct)
✓ Area inspection isolation verified: Area 1 has 1 inspection(s), Area 2 has 1 inspection(s)

============================================================
✓ All tests passed!
============================================================
```

## Test Data Cleanup

The test includes automatic cleanup of all created test data:
- All test inspections
- All test areas
- Test project
- Test consultant type

Cleanup runs in the `finally` block to ensure it executes even if tests fail.

## Implementation Details

### API Endpoint Being Tested

The test verifies the functionality of:

```python
@router.get("/projects/{project_id}/areas/{area_id}/inspections")
async def list_area_inspections(
    project_id: UUID,
    area_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(ProjectInspection)
        .where(
            ProjectInspection.project_id == project_id,
            ProjectInspection.area_id == area_id
        )
        .order_by(ProjectInspection.created_at.desc())
    )
    return result.scalars().all()
```

### Database Schema

The test relies on these database relationships:

```
Project (1) ----< (N) ConstructionArea
Project (1) ----< (N) ProjectInspection
ConstructionArea (1) ----< (N) ProjectInspection [optional]
ConsultantType (1) ----< (N) ProjectInspection
```

Key field: `ProjectInspection.area_id` (nullable UUID)

### Assertions

The test makes these key assertions:

1. Inspections with `area_id` are created correctly
2. Area-specific queries only return inspections with matching `area_id`
3. Inspections with `area_id = NULL` don't appear in area-specific queries
4. Inspections for different areas remain properly isolated

## Troubleshooting

### Database Connection Issues

If you see connection errors:

```bash
# Check database URL in backend/.env
cat backend/.env | grep DATABASE_URL

# Verify PostgreSQL is running
docker-compose ps
```

### Import Errors

If you see import errors for app modules:

```bash
# Ensure you're in the backend directory
cd backend

# Set PYTHONPATH if needed
export PYTHONPATH="${PYTHONPATH}:$(pwd)"
```

### Foreign Key Constraint Errors

If tests fail with foreign key errors, ensure the migration has been applied:

```bash
cd backend
alembic upgrade head
alembic current
```

## Related Files

- Implementation: `backend/app/api/v1/inspections.py` (lines 37-52)
- Models: `backend/app/models/inspection.py`, `backend/app/models/area.py`
- Previous test: `backend/tests/integration/test_project_inspection_relationship.py`

## Notes

This test is designed to run in environments where the database is not immediately available (e.g., during development in sandboxed environments). The test will:

1. Create its own database session
2. Create all necessary test data
3. Run all verification queries
4. Clean up all test data

No pre-existing data is required, and the test does not affect existing data.
