# QA Fix Request

**Status**: REJECTED
**Date**: 2026-01-29
**QA Session**: 1

---

## Overview

The implementation is incomplete. While all production code has been created, the **required testing infrastructure was completely omitted**. The spec explicitly requires automated tests, but ZERO tests were created.

---

## Critical Issues to Fix

### Issue 1: Create Unit Test File with 12 Required Tests

**Problem**: Spec requires 12 unit tests in `tests/api/v1/test_equipment_templates.py` but this file does NOT exist.

**Location**: `backend/tests/api/v1/test_equipment_templates.py`

**Required Tests**:
1. `test_create_template_as_admin` - Admin creates template, returns 201
2. `test_create_template_as_user` - Non-admin gets 403 Forbidden
3. `test_list_templates` - Returns all templates with correct schema
4. `test_get_template_by_id` - Returns single template, 404 if not found
5. `test_update_template` - Updates fields, audit log created
6. `test_delete_template` - Deletes template, prevents if has submissions
7. `test_create_submission` - Creates submission linked to template and project
8. `test_list_submissions_by_project` - Returns only submissions for project
9. `test_update_submission_draft` - Allows update when status is draft
10. `test_update_submission_approved` - Prevents update when status is approved
11. `test_add_approval_decision` - Creates decision, updates submission status
12. `test_list_decisions` - Returns all decisions for submission

**Fix Steps**:
1. Create directory: `backend/tests/api/v1/`
2. Create file: `test_equipment_templates.py`
3. Implement all 12 tests using pytest
4. Use fixtures for database, client, users, authentication
5. Verify HTTP status codes and response schemas
6. Test both success and failure cases

**Verification**: Run `cd backend && pytest tests/api/v1/test_equipment_templates.py -v` - all 12 tests must pass

---

### Issue 2: Create Integration Tests with 4 Required Workflows

**Problem**: Spec requires 4 integration tests but ZERO were created.

**Location**: `backend/tests/integration/test_equipment_template_workflow.py`

**Required Tests**:
1. `test_template_to_submission_flow` - Create template → create submission → verify linkage
2. `test_submission_to_approval_flow` - Create submission → add decision → verify status update
3. `test_admin_access_control` - Verify admin endpoints require admin role
4. `test_audit_log_integration` - Verify all operations create audit logs

**Fix Steps**:
1. Create directory: `backend/tests/integration/`
2. Create file: `test_equipment_template_workflow.py`
3. Implement all 4 integration tests
4. Test complete end-to-end workflows
5. Verify database state changes
6. Verify relationships between entities

**Verification**: Run `cd backend && pytest tests/integration/ -v` - all 4 tests must pass

---

### Issue 3: Create Test Fixtures

**Problem**: Tests require fixtures for database, client, users, authentication

**Location**: `backend/tests/conftest.py`

**Required Fixtures**:
- `db()` - Async database session
- `client()` - FastAPI test client
- `admin_user()` - Admin user for testing
- `regular_user()` - Non-admin user for testing
- `project()` - Test project
- `admin_token()` - Admin authentication token
- `user_token()` - Regular user authentication token

**Fix Steps**:
1. Create file: `backend/tests/conftest.py`
2. Implement all required fixtures
3. Use async patterns for database operations
4. Follow existing test patterns from other test files

---

### Issue 4: Restart Backend Server

**Problem**: New endpoints created but server not restarted, so endpoints return 404

**Location**: Backend service on port 8000

**Fix Steps**:

For Docker deployment:
```bash
docker-compose restart backend
until curl -f http://localhost:8000/health; do sleep 1; done
```

For local development:
```bash
# Find and kill uvicorn process
ps aux | grep uvicorn
kill <PID>

# Restart server
cd backend
python -m uvicorn app.main:app --reload --port 8000
```

**Verification**:
```bash
curl http://localhost:8000/api/v1/equipment-templates
# Expected: 200 OK with JSON response (not 404)

curl http://localhost:8000/openapi.json | grep equipment-templates
# Expected: Should find multiple matches
```

---

### Issue 5: Apply Database Migration

**Problem**: Migration file created but not applied to database

**Location**: `backend/alembic/versions/004_add_equipment_templates.py`

**Fix Steps**:
```bash
cd backend
alembic upgrade head
alembic current  # Should show: 004 (head)
```

**Verification**:
```bash
# Check tables exist (using psql or database client)
# Expected tables: equipment_templates, equipment_submissions, approval_decisions
```

---

## Implementation Priority

Fix in this order:

1. **First**: Create test fixtures (conftest.py)
2. **Second**: Restart backend server + apply migration
3. **Third**: Create unit tests (all 12)
4. **Fourth**: Create integration tests (all 4)
5. **Fifth**: Run all tests and verify they pass

---

## Definition of Done

✅ Test directory structure exists
✅ `backend/tests/conftest.py` exists with all required fixtures
✅ `backend/tests/api/v1/test_equipment_templates.py` exists with 12 tests
✅ `backend/tests/integration/test_equipment_template_workflow.py` exists with 4 tests
✅ All 16 tests pass: `pytest tests/ -v`
✅ Backend server restarted and endpoints accessible (not 404)
✅ Database migration applied and tables exist
✅ Swagger UI shows all 12 equipment-template endpoints
✅ Code committed: "fix: add required unit and integration tests (qa-requested)"

---

## After Fixes

Once all fixes are complete:

1. Commit your changes
2. Signal completion (or wait for auto-detection)
3. QA will automatically re-run and verify
4. Loop continues until all issues resolved and QA approves

---

## Important Notes

- The shell test scripts you created are useful for manual testing but DO NOT satisfy the requirement for pytest unit/integration tests
- The spec explicitly lists 12 required unit tests by name - all must be implemented
- Without tests, we cannot verify the implementation works correctly
- Production readiness requires automated test coverage

---

**QA Agent will re-run automatically after fixes are committed.**

**Target**: 100% of tests passing before sign-off approval.
