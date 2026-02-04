# Consultant Assignments API Testing Guide

## Overview

This document provides comprehensive testing instructions for the consultant assignments API endpoints.

## Prerequisites

1. Backend server running on port 8000
2. Database migrated with the consultant_assignments table
3. Valid authentication token (for POST, PUT, DELETE operations)
4. Sample data:
   - At least one user (consultant)
   - At least one project
   - At least one consultant type (optional)

## API Endpoints

### 1. List All Consultant Assignments

**Endpoint:** `GET /api/v1/consultant-assignments`

**Authentication:** Not required

**Request:**
```bash
curl -X GET http://localhost:8000/api/v1/consultant-assignments \
  -H "Content-Type: application/json"
```

**Expected Response:** `200 OK`
```json
[
  {
    "id": "uuid",
    "consultantId": "uuid",
    "projectId": "uuid",
    "consultantTypeId": "uuid",
    "startDate": "2026-02-10",
    "endDate": "2026-02-20",
    "status": "pending",
    "notes": "Optional notes",
    "createdAt": "2026-02-05T...",
    "updatedAt": "2026-02-05T...",
    "consultant": {...},
    "project": {...},
    "consultantType": {...}
  }
]
```

### 2. Create New Consultant Assignment

**Endpoint:** `POST /api/v1/consultant-assignments`

**Authentication:** Required (Bearer token)

**Request:**
```bash
curl -X POST http://localhost:8000/api/v1/consultant-assignments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "consultant_id": "VALID_USER_UUID",
    "project_id": "VALID_PROJECT_UUID",
    "consultant_type_id": "VALID_CONSULTANT_TYPE_UUID",
    "start_date": "2026-02-10",
    "end_date": "2026-02-20",
    "status": "pending",
    "notes": "Test assignment"
  }'
```

**Expected Response:** `201 Created`
```json
{
  "id": "newly-created-uuid",
  "consultantId": "...",
  "projectId": "...",
  ...
}
```

### 3. Get Consultant Assignment by ID

**Endpoint:** `GET /api/v1/consultant-assignments/{assignment_id}`

**Authentication:** Not required

**Request:**
```bash
curl -X GET http://localhost:8000/api/v1/consultant-assignments/{assignment_id} \
  -H "Content-Type: application/json"
```

**Expected Response:** `200 OK` (single assignment object)

**Error Response:** `404 Not Found` if assignment doesn't exist

### 4. Update Consultant Assignment

**Endpoint:** `PUT /api/v1/consultant-assignments/{assignment_id}`

**Authentication:** Required (Bearer token)

**Request:**
```bash
curl -X PUT http://localhost:8000/api/v1/consultant-assignments/{assignment_id} \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "status": "active",
    "notes": "Updated notes"
  }'
```

**Expected Response:** `200 OK` (updated assignment object)

**Error Response:** `404 Not Found` if assignment doesn't exist

### 5. Delete Consultant Assignment

**Endpoint:** `DELETE /api/v1/consultant-assignments/{assignment_id}`

**Authentication:** Required (Bearer token)

**Request:**
```bash
curl -X DELETE http://localhost:8000/api/v1/consultant-assignments/{assignment_id} \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Expected Response:** `200 OK`
```json
{
  "message": "Consultant assignment deleted"
}
```

**Error Response:** `404 Not Found` if assignment doesn't exist

## Test Scenarios

### Scenario 1: Complete CRUD Workflow

1. **List assignments** (should be empty or show existing assignments)
   ```bash
   curl -X GET http://localhost:8000/api/v1/consultant-assignments
   ```

2. **Create a new assignment**
   ```bash
   curl -X POST http://localhost:8000/api/v1/consultant-assignments \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -d '{
       "consultant_id": "USER_UUID",
       "project_id": "PROJECT_UUID",
       "start_date": "2026-02-10",
       "end_date": "2026-02-20",
       "status": "pending"
     }'
   ```
   Expected: Status 201, returns created assignment with ID

3. **Get the created assignment** (use ID from step 2)
   ```bash
   curl -X GET http://localhost:8000/api/v1/consultant-assignments/{assignment_id}
   ```
   Expected: Status 200, returns assignment details

4. **Update the assignment**
   ```bash
   curl -X PUT http://localhost:8000/api/v1/consultant-assignments/{assignment_id} \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -d '{"status": "active"}'
   ```
   Expected: Status 200, returns updated assignment

5. **Delete the assignment**
   ```bash
   curl -X DELETE http://localhost:8000/api/v1/consultant-assignments/{assignment_id} \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```
   Expected: Status 200, returns success message

6. **Verify deletion** (try to get deleted assignment)
   ```bash
   curl -X GET http://localhost:8000/api/v1/consultant-assignments/{assignment_id}
   ```
   Expected: Status 404, assignment not found

### Scenario 2: Validation Testing

Test with invalid data:

1. **Missing required fields**
   ```bash
   curl -X POST http://localhost:8000/api/v1/consultant-assignments \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -d '{
       "consultant_id": "USER_UUID"
     }'
   ```
   Expected: Status 422, validation error

2. **Invalid date range** (end_date before start_date)
   ```bash
   curl -X POST http://localhost:8000/api/v1/consultant-assignments \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -d '{
       "consultant_id": "USER_UUID",
       "project_id": "PROJECT_UUID",
       "start_date": "2026-02-20",
       "end_date": "2026-02-10",
       "status": "pending"
     }'
   ```
   Expected: Status 422, validation error

3. **Invalid UUID**
   ```bash
   curl -X GET http://localhost:8000/api/v1/consultant-assignments/invalid-uuid
   ```
   Expected: Status 422, validation error

### Scenario 3: Authentication Testing

1. **Create without authentication**
   ```bash
   curl -X POST http://localhost:8000/api/v1/consultant-assignments \
     -H "Content-Type: application/json" \
     -d '{
       "consultant_id": "USER_UUID",
       "project_id": "PROJECT_UUID",
       "start_date": "2026-02-10",
       "end_date": "2026-02-20",
       "status": "pending"
     }'
   ```
   Expected: Status 401, not authenticated

2. **Update without authentication**
   ```bash
   curl -X PUT http://localhost:8000/api/v1/consultant-assignments/{assignment_id} \
     -H "Content-Type: application/json" \
     -d '{"status": "active"}'
   ```
   Expected: Status 401, not authenticated

## Getting Sample Data

### Get Users (for consultant_id)
```bash
curl -X GET http://localhost:8000/api/v1/users \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Get Projects (for project_id)
```bash
curl -X GET http://localhost:8000/api/v1/projects \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Get Consultant Types (for consultant_type_id)
```bash
curl -X GET http://localhost:8000/api/v1/consultant-types
```

## Verification Checklist

- [ ] GET /consultant-assignments returns 200 and array (empty or with data)
- [ ] POST /consultant-assignments with valid data returns 201
- [ ] POST /consultant-assignments without auth returns 401
- [ ] POST /consultant-assignments with invalid data returns 422
- [ ] GET /consultant-assignments/{id} with valid ID returns 200
- [ ] GET /consultant-assignments/{id} with invalid ID returns 404
- [ ] PUT /consultant-assignments/{id} with valid data returns 200
- [ ] PUT /consultant-assignments/{id} without auth returns 401
- [ ] DELETE /consultant-assignments/{id} with auth returns 200
- [ ] DELETE /consultant-assignments/{id} without auth returns 401
- [ ] Audit logs are created for CREATE, UPDATE, DELETE operations
- [ ] Relationships (consultant, project, consultant_type) are loaded in responses

## Database Verification

Check the database to verify data integrity:

```sql
-- List all consultant assignments
SELECT * FROM consultant_assignments;

-- Verify foreign key relationships
SELECT
  ca.id,
  ca.start_date,
  ca.end_date,
  ca.status,
  u.email as consultant_email,
  p.name as project_name,
  ct.name as consultant_type
FROM consultant_assignments ca
LEFT JOIN users u ON ca.consultant_id = u.id
LEFT JOIN projects p ON ca.project_id = p.id
LEFT JOIN consultant_types ct ON ca.consultant_type_id = ct.id;

-- Check audit logs
SELECT * FROM audit_logs
WHERE entity_type = 'consultant_assignment'
ORDER BY created_at DESC;
```

## Status Codes Summary

- `200 OK` - Successful GET, PUT, DELETE
- `201 Created` - Successful POST
- `401 Unauthorized` - Missing or invalid authentication
- `404 Not Found` - Assignment not found
- `422 Unprocessable Entity` - Validation error

## Notes

1. All POST, PUT, and DELETE operations require authentication
2. GET operations do not require authentication
3. All CUD operations create audit log entries
4. Responses include related objects (consultant, project, consultant_type) via selectinload
5. Dates should be in ISO 8601 format (YYYY-MM-DD)
6. Status values: "pending", "active", "completed", "cancelled"
