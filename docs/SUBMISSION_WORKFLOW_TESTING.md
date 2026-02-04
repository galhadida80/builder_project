# Submission Workflow Testing - Subtask 7-3

## Overview

This document covers the integration testing for **Equipment Submission Workflow with Template Linkage** (Subtask 7-3). This test verifies the end-to-end flow of creating equipment submissions based on templates, updating submissions, and verifying audit trail.

## Test Objectives

The test validates these key requirements:

1. ✅ **Create submission from template** via POST `/projects/{id}/equipment-submissions`
2. ✅ **Verify submission linkage** to both template and project
3. ✅ **Update submission** via PUT `/projects/{id}/equipment-submissions/{id}`
4. ✅ **Verify audit log entries** for all operations

## Prerequisites

Before running the tests, ensure:

1. **Backend server is running**
   ```bash
   docker-compose up -d
   # OR
   cd backend && uvicorn app.main:app --reload --port 8000
   ```

2. **Database migration applied**
   ```bash
   cd backend && alembic upgrade head
   # OR (if using Docker)
   docker exec -it builder_backend alembic upgrade head
   ```

3. **Test users exist in database**
   - Admin user: `admin@example.com` / `admin123`
   - Regular user: `user@example.com` / `user123`

## Test Script Usage

### Quick Start

```bash
# Make script executable (already done)
chmod +x ./test_submission_workflow.sh

# Run the test
./test_submission_workflow.sh
```

### Expected Output

When successful, you'll see:

```
========================================
Equipment Submission Workflow Test
Subtask 7-3: Submission with Template Linkage
========================================

ℹ Checking if backend server is running...
✓ Server is running on port 8000

ℹ STEP 1: Authentication
----------------------------------------
ℹ Authenticating as admin (admin@example.com)...
✓ Authenticated as admin

ℹ STEP 2: Create Equipment Template (Prerequisite)
----------------------------------------
✓ Create template - Status: 201
ℹ Template ID: [UUID]

ℹ STEP 3: Get Project for Testing
----------------------------------------
✓ Using Project ID: [UUID]

ℹ STEP 4: Create Equipment Submission from Template
----------------------------------------
✓ Create submission from template - Status: 201
ℹ Submission ID: [UUID]
✓ Submission is linked to template: [UUID]
✓ Submission is linked to project: [UUID]

ℹ STEP 5: Verify Submission Details
----------------------------------------
✓ Get submission details - Status: 200
✓ Submission name is correct

ℹ STEP 6: Update Equipment Submission
----------------------------------------
✓ Update submission - Status: 200
✓ Submission updated successfully

ℹ STEP 7: List Project Submissions
----------------------------------------
✓ List project submissions - Status: 200
✓ Submission found in project list

ℹ STEP 8: Audit Log Verification
----------------------------------------
[SQL query for manual verification]

========================================
TEST SUMMARY
========================================
Tests Passed: 10
Tests Failed: 0

✓ All tests passed! ✓
```

## Manual Testing via Swagger UI

If you prefer to test manually using the Swagger UI:

### Step 1: Open Swagger UI

Navigate to: http://localhost:8000/api/v1/docs

### Step 2: Authenticate

1. Click the **"Authorize"** button at the top
2. Enter admin credentials:
   - Username: `admin@example.com`
   - Password: `admin123`
3. Click "Authorize" then "Close"

### Step 3: Create Equipment Template

1. Expand **POST /api/v1/equipment-templates**
2. Click "Try it out"
3. Use this request body:
   ```json
   {
     "name": "Excavator Template",
     "category": "Heavy Equipment",
     "description": "Standard excavator template",
     "specifications": {
       "type": "Hydraulic Excavator",
       "bucket_capacity": "1.5 cubic yards",
       "engine_power": "150 HP"
     }
   }
   ```
4. Click "Execute"
5. **Expected**: 201 Created
6. **Copy the template ID** from the response

### Step 4: Get Project ID

1. Expand **GET /api/v1/projects**
2. Click "Try it out" → "Execute"
3. **Copy a project ID** from the response
4. If no projects exist, create one first using POST /api/v1/projects

### Step 5: Create Equipment Submission

1. Expand **POST /api/v1/projects/{project_id}/equipment-submissions**
2. Click "Try it out"
3. Enter the **project_id** from step 4
4. Use this request body (replace TEMPLATE_ID with actual ID):
   ```json
   {
     "template_id": "TEMPLATE_ID_FROM_STEP_3",
     "name": "Excavator for Site A",
     "description": "Excavator needed for foundation work",
     "specifications": {
       "type": "Hydraulic Excavator",
       "bucket_capacity": "1.5 cubic yards",
       "engine_power": "150 HP",
       "location": "Site A"
     },
     "notes": "Urgent requirement"
   }
   ```
5. Click "Execute"
6. **Expected**: 201 Created
7. **Verify** response contains:
   - `templateId` matches the template ID
   - `projectId` matches the project ID
   - `status` is "draft"
8. **Copy the submission ID** from the response

### Step 6: Verify Submission Details

1. Expand **GET /api/v1/projects/{project_id}/equipment-submissions/{submission_id}**
2. Click "Try it out"
3. Enter both **project_id** and **submission_id**
4. Click "Execute"
5. **Expected**: 200 OK
6. **Verify** response contains all the data you entered

### Step 7: Update Equipment Submission

1. Expand **PUT /api/v1/projects/{project_id}/equipment-submissions/{submission_id}**
2. Click "Try it out"
3. Enter both **project_id** and **submission_id**
4. Use this request body:
   ```json
   {
     "name": "Updated Excavator for Site A",
     "description": "Updated requirements based on site survey",
     "specifications": {
       "type": "Hydraulic Excavator",
       "bucket_capacity": "2.0 cubic yards",
       "engine_power": "180 HP",
       "location": "Site A - Zone B"
     },
     "notes": "Requirements updated"
   }
   ```
5. Click "Execute"
6. **Expected**: 200 OK
7. **Verify** response shows updated values

### Step 8: List Project Submissions

1. Expand **GET /api/v1/projects/{project_id}/equipment-submissions**
2. Click "Try it out"
3. Enter the **project_id**
4. Click "Execute"
5. **Expected**: 200 OK with array of submissions
6. **Verify** your submission is in the list

## Verification Checklist

Use this checklist to ensure all requirements are met:

- [ ] Backend server running on port 8000
- [ ] Database migration applied (tables exist)
- [ ] Template can be created successfully
- [ ] Submission can be created from template
- [ ] Submission has correct `template_id` in response
- [ ] Submission has correct `project_id` in response
- [ ] Submission starts with `status: "draft"`
- [ ] Submission details can be retrieved
- [ ] Submission can be updated successfully
- [ ] Updated values are reflected in GET response
- [ ] Project submissions list includes the submission
- [ ] Audit logs exist for all operations

## Database Verification

After running the tests, verify audit logs were created:

### Check Audit Logs

```sql
-- Connect to database
psql -d builder_db

-- Query audit logs for our operations
SELECT
    entity_type,
    action,
    entity_id,
    project_id,
    created_at,
    CASE
        WHEN old_values IS NOT NULL THEN 'Has old_values'
        ELSE 'NULL'
    END as old_values,
    CASE
        WHEN new_values IS NOT NULL THEN 'Has new_values'
        ELSE 'NULL'
    END as new_values
FROM audit_logs
WHERE entity_type IN ('equipment_template', 'equipment_submission')
ORDER BY created_at DESC
LIMIT 20;
```

### Expected Audit Log Entries

You should see at least these entries:

1. **Template Creation**
   - entity_type: `equipment_template`
   - action: `CREATE`
   - new_values: Contains template data
   - old_values: NULL

2. **Submission Creation**
   - entity_type: `equipment_submission`
   - action: `CREATE`
   - new_values: Contains submission data
   - old_values: NULL
   - project_id: Not NULL

3. **Submission Update**
   - entity_type: `equipment_submission`
   - action: `UPDATE`
   - new_values: Contains updated data
   - old_values: Contains original data
   - project_id: Not NULL

### Check Data Relationships

```sql
-- Verify submission is linked to template and project
SELECT
    es.id as submission_id,
    es.name as submission_name,
    es.project_id,
    es.template_id,
    es.status,
    et.name as template_name,
    p.name as project_name
FROM equipment_submissions es
JOIN equipment_templates et ON es.template_id = et.id
JOIN projects p ON es.project_id = p.id
ORDER BY es.created_at DESC
LIMIT 10;
```

## What the Test Validates

### 1. Template-to-Submission Linkage

The test creates a template and then creates a submission that references that template. It verifies:

- Template ID is correctly stored in submission
- Template data can be inherited/referenced
- Foreign key relationship works correctly

### 2. Project-Scoping

The test verifies submissions are properly scoped to projects:

- Project ID is required for submission creation
- Submissions can only be accessed via project-scoped endpoints
- Project ID is included in audit logs

### 3. CRUD Operations

The test validates all CRUD operations work:

- **Create**: POST creates new submission with proper defaults
- **Read**: GET retrieves submission with all relationships
- **Update**: PUT updates submission fields correctly
- **List**: GET returns filtered submissions by project

### 4. Audit Trail

The test verifies audit logging:

- CREATE audit log entry for template
- CREATE audit log entry for submission
- UPDATE audit log entry for submission update
- All audit logs include proper metadata (project_id, old_values, new_values)

## Troubleshooting

### Issue: Server not responding

**Symptoms:**
```
✗ Server is not responding on port 8000
```

**Solution:**
```bash
# Check if server is running
docker-compose ps

# If not running, start it
docker-compose up -d

# Check logs for errors
docker-compose logs backend
```

### Issue: Authentication failed

**Symptoms:**
```
✗ Failed to authenticate as admin
```

**Solution:**
```bash
# Verify user exists in database
docker exec -it builder_postgres psql -U builder_user -d builder_db

# Check users table
SELECT email, role FROM users WHERE email = 'admin@example.com';

# If user doesn't exist, create one (adjust SQL as needed)
```

### Issue: Template or project not found

**Symptoms:**
```
404 Not Found - Equipment template not found
404 Not Found - Project not found
```

**Solution:**
1. Ensure database migration was applied
2. Verify tables exist: `\dt equipment_*`
3. Check if projects exist in database
4. Create test project manually if needed

### Issue: Foreign key constraint error

**Symptoms:**
```
Foreign key constraint violation
```

**Solution:**
- Ensure template ID is valid and exists
- Ensure project ID is valid and exists
- Check that migration created proper foreign keys

### Issue: Audit logs not created

**Symptoms:**
No audit logs in database after operations

**Solution:**
1. Check audit_service is imported correctly
2. Verify audit_logs table exists
3. Check for any errors in server logs
4. Ensure `create_audit_log` is called after `db.flush()`

## Test Coverage

This test covers the following endpoints:

✅ **POST** `/equipment-templates` - Create template (prerequisite)
✅ **GET** `/projects` - Get project ID (prerequisite)
✅ **POST** `/projects/{project_id}/equipment-submissions` - Create submission
✅ **GET** `/projects/{project_id}/equipment-submissions/{submission_id}` - Get submission
✅ **PUT** `/projects/{project_id}/equipment-submissions/{submission_id}` - Update submission
✅ **GET** `/projects/{project_id}/equipment-submissions` - List project submissions

## Success Criteria

Subtask 7-3 is complete when:

- [x] Test script created and executable
- [ ] All tests pass when script is run
- [ ] Submissions can be created from templates
- [ ] Template linkage is verified in response
- [ ] Project linkage is verified in response
- [ ] Submissions can be updated successfully
- [ ] Audit logs are created for all operations
- [ ] Manual Swagger UI testing completed (optional)
- [ ] Database verification completed
- [ ] Documentation complete

## Next Steps

After completing this subtask:

1. Mark subtask-7-3 as **completed** in `implementation_plan.json`
2. Commit changes:
   ```bash
   git add .
   git commit -m "auto-claude: subtask-7-3 - Test submission workflow with template linkage"
   ```
3. Proceed to **subtask-7-4**: Test approval decision workflow

## Files Created

- `test_submission_workflow.sh` - Automated test script for submission workflow
- `SUBMISSION_WORKFLOW_TESTING.md` - This documentation

## Related Documentation

- `INTEGRATION_TESTING_STATUS.md` - Template CRUD testing (Subtask 7-2)
- `MANUAL_TESTING_INSTRUCTIONS.md` - Initial setup and migration (Subtask 7-1)
- `.auto-claude/specs/015-1-4-create-equipment-template-api-endpoints/spec.md` - Full specification
