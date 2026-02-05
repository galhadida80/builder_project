# Manual Testing Instructions for Equipment Template API

## Current Status

All implementation work (Phases 1-6) has been completed successfully:
- ✅ Database models created
- ✅ Pydantic schemas implemented
- ✅ Admin authorization added
- ✅ All 12 API endpoints implemented
- ✅ Database migration created
- ✅ Router registered

**Current Phase:** Phase 7 - Integration Testing (subtask-7-1)

## Environment Restrictions

The automated build environment has restrictions on certain commands:
- `alembic` command is not in the allowed commands
- `docker` and `docker-compose` commands are not available
- Direct database access is restricted

## Manual Steps Required

### Option 1: Using Docker Compose (Recommended)

This will automatically apply migrations and start all services:

```bash
# Navigate to the project root
cd /Users/galhadida/projects/builder_project/builder_program

# Start all services (database, backend, frontend)
docker-compose up -d

# Check logs to verify migration was applied
docker-compose logs backend

# Backend should be available at http://localhost:8000
```

### Option 2: Using Python Virtual Environment

If you prefer to run services locally without Docker:

```bash
# Navigate to backend directory
cd /Users/galhadida/projects/builder_project/builder_program/backend

# Create and activate virtual environment (if not exists)
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Ensure PostgreSQL is running locally
# Update DATABASE_URL in .env file if needed

# Apply migration
alembic upgrade head

# Start backend server
uvicorn app.main:app --reload --port 8000
```

### Option 3: Using Existing Docker Container

If containers are already running:

```bash
# Apply migration in running container
docker exec -it builder_backend alembic upgrade head

# Restart backend to pick up changes
docker-compose restart backend
```

## Verification Steps

Once the backend server is running, verify the implementation:

### 1. Check API Documentation

Open Swagger UI: http://localhost:8000/api/v1/docs

Verify the following endpoint groups are visible:
- **Equipment Templates** (5 endpoints)
  - GET /api/v1/equipment-templates
  - POST /api/v1/equipment-templates
  - GET /api/v1/equipment-templates/{template_id}
  - PUT /api/v1/equipment-templates/{template_id}
  - DELETE /api/v1/equipment-templates/{template_id}

- **Equipment Submissions** (5 endpoints)
  - GET /api/v1/projects/{project_id}/equipment-submissions
  - POST /api/v1/projects/{project_id}/equipment-submissions
  - GET /api/v1/projects/{project_id}/equipment-submissions/{submission_id}
  - PUT /api/v1/projects/{project_id}/equipment-submissions/{submission_id}
  - DELETE /api/v1/projects/{project_id}/equipment-submissions/{submission_id}

- **Approval Decisions** (2 endpoints)
  - POST /api/v1/equipment-submissions/{submission_id}/decisions
  - GET /api/v1/equipment-submissions/{submission_id}/decisions

### 2. Test with curl

```bash
# Test list templates endpoint (should return 200)
curl -X GET http://localhost:8000/api/v1/equipment-templates \
  -H "Content-Type: application/json"

# Expected: 200 OK with empty array or list of templates
```

### 3. Verify Database Migration

```bash
# Check migration status
docker exec -it builder_backend alembic current

# Expected output: Should show "004_add_equipment_templates" (or later)

# Or if using local environment:
cd backend && alembic current
```

### 4. Verify Database Tables

Connect to PostgreSQL and verify tables exist:

```sql
-- List equipment-related tables
\dt equipment_*;

-- Expected tables:
-- equipment_templates
-- equipment_submissions
-- approval_decisions

-- Verify foreign keys on equipment_submissions
\d equipment_submissions;
```

## Success Criteria

The subtask is complete when:

- [x] Migration file exists: `backend/alembic/versions/004_add_equipment_templates.py`
- [ ] Migration has been applied: `alembic current` shows 004 or later
- [ ] Backend server starts without errors
- [ ] API documentation shows all 12 endpoints at http://localhost:8000/api/v1/docs
- [ ] GET /api/v1/equipment-templates returns 200 status
- [ ] Database tables created: equipment_templates, equipment_submissions, approval_decisions
- [ ] No console errors or warnings

## Troubleshooting

### Backend won't start
- Check if port 8000 is already in use: `lsof -i :8000`
- Verify DATABASE_URL environment variable is set correctly
- Check database is running: `docker ps` or `pg_isready -U postgres`

### Migration fails
- Ensure database is accessible
- Check for conflicting migrations: `alembic history`
- Verify migration file syntax is correct

### 404 on endpoints
- Verify router is registered in `backend/app/api/v1/router.py`
- Check server logs for import errors
- Ensure server was restarted after code changes

## Next Steps

After completing this subtask:
1. Proceed to subtask-7-2: Test template CRUD operations via Swagger UI
2. Proceed to subtask-7-3: Test submission workflow with template linkage
3. Proceed to subtask-7-4: Test approval decision workflow
4. Run QA verification and obtain sign-off

## Files Created in This Session

- This instruction document: `MANUAL_TESTING_INSTRUCTIONS.md`

## Notes for QA Agent

When performing QA verification, please confirm:
1. Migration was applied successfully
2. All 12 endpoints are accessible
3. Admin authorization works (403 for non-admin users on template endpoints)
4. Audit logs are created for all operations
5. Database relationships work correctly
