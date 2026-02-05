# End-to-End Verification Guide
## Apartment Checklist Template System

This guide provides instructions for verifying the complete implementation of the Apartment Checklist Template System.

## Prerequisites

- Docker and Docker Compose installed
- Python 3.11+ installed
- `requests` library (`pip install requests`)

## Quick Start

### Option 1: Automated Script (Recommended)

```bash
# Make the script executable (if not already)
chmod +x run_e2e_verification.sh

# Run the automated verification
./run_e2e_verification.sh
```

This script will:
1. Start Docker services (db, redis, backend)
2. Wait for services to be healthy
3. Run all E2E verification tests
4. Report results
5. Keep services running for inspection

### Option 2: Manual Verification

#### Step 1: Start Services

```bash
# Start all required services
docker-compose up -d db redis backend

# Wait for services to be ready (check logs)
docker-compose logs -f backend

# Verify backend is running
curl http://localhost:8000/health
```

#### Step 2: Run E2E Tests

```bash
# Run the Python verification script
python3 backend/tests/e2e_checklist_verification.py
```

#### Step 3: View Results

The script will output detailed results for each verification step:
- ✓ Green checkmarks indicate success
- ✗ Red X marks indicate failures
- Blue [STEP] headers show progress

## Verification Steps

The E2E verification tests the following workflow:

### 1. Create Template
- **Endpoint:** `POST /api/v1/projects/{project_id}/checklist-templates`
- **Test Data:** Template named "פרוטוקול מסירה לדייר"
- **Verification:** Template created with correct Hebrew text

### 2. Create Subsections
- **Endpoint:** `POST /api/v1/checklist-templates/{template_id}/subsections`
- **Test Data:** Two subsections: "כניסה" (order 1) and "מטבח" (order 2)
- **Verification:** Both subsections created and linked to template

### 3. Create Items
- **Endpoint:** `POST /api/v1/subsections/{subsection_id}/items`
- **Test Data:** 3 items per subsection (6 total) with must_image flags
- **Items for "כניסה":**
  - בדיקת דלת כניסה (must_image=true)
  - בדיקת אינטרקום (must_image=true, must_note=true)
  - בדיקת צבע קירות (must_image=true)
- **Items for "מטבח":**
  - בדיקת ארונות מטבח (must_image=true)
  - בדיקת כיור וברזים (must_image=true, must_note=true)
  - בדיקת חיבורי גז (must_image=true, must_note=true, must_signature=true)
- **Verification:** All 6 items created with correct flags

### 4. Create Instance
- **Endpoint:** `POST /api/v1/projects/{project_id}/checklist-instances`
- **Test Data:** Instance for "דירה 12, קומה 3" linked to template
- **Verification:** Instance created with correct unit identifier and status

### 5. Record Responses
- **Endpoint:** `POST /api/v1/checklist-instances/{instance_id}/responses`
- **Test Data:** 2 responses for first 2 items with Hebrew notes
- **Response 1:** Door check - "דלת כניסה במצב מעולה, ללא פגמים" (status: approved)
- **Response 2:** Intercom check - "אינטרקום פועל תקין, נבדק עם שומר" (status: approved)
- **Verification:** Both responses created with timestamps

### 6. Verify Template Hierarchy
- **Endpoint:** `GET /api/v1/projects/{project_id}/checklist-templates/{template_id}`
- **Expected:** Full hierarchy returned (template → subsections → items)
- **Verification Checks:**
  - Template name matches
  - 2 subsections present
  - 3 items per subsection
  - All Hebrew text preserved
  - Metadata fields populated

### 7. Verify Instance Responses
- **Endpoint:** `GET /api/v1/projects/{project_id}/checklist-instances/{instance_id}`
- **Expected:** Instance with all responses included
- **Verification Checks:**
  - Unit identifier matches
  - 2 responses present
  - Response status and notes correct
  - Timestamps recorded

### 8. Test Cascade Delete
- **Endpoint:** `DELETE /api/v1/projects/{project_id}/checklist-templates/{template_id}`
- **Expected:** Template and all related entities deleted
- **Verification:** 404 returned when trying to fetch deleted template

## Expected Results

### Success Criteria
- All 8 verification steps pass
- Hebrew text properly encoded/decoded
- Nested relationships work correctly
- Cascade deletes function properly
- Timestamps auto-generated
- Audit logs created (check database)

### Example Success Output

```
[STEP] Waiting for backend to be ready...
✓ Backend is ready!

[STEP] Creating test project...
✓ Created project: 550e8400-e29b-41d4-a716-446655440000

[STEP] Step 1: Creating template 'פרוטוקול מסירה לדייר'...
✓ Created template: 661f9511-f39c-52e5-b827-557766551111
  Name: פרוטוקול מסירה לדייר

[STEP] Step 2: Creating subsections 'כניסה' and 'מטבח'...
✓ Created subsection 'כניסה': 772faa22-g40d-63f6-c938-668877662222
✓ Created subsection 'מטבח': 883fbb33-h51e-74g7-d049-779988773333

[STEP] Step 3: Creating 3 items per subsection with must_image flags...
  Creating items for subsection 1...
    ✓ Created item 'בדיקת דלת כניסה' 📷: 994fcc44-i62f-85h8-e15a-88aa99884444
    ✓ Created item 'בדיקת אינטרקום' 📷 📝: aa5fdd55-j73g-96i9-f26b-99bbaa995555
    ✓ Created item 'בדיקת צבע קירות' 📷: bb6fee66-k84h-a7ja-037c-aaccbb0a6666
  Creating items for subsection 2...
    ✓ Created item 'בדיקת ארונות מטבח' 📷: cc7fff77-l95i-b8kb-148d-bbddcc1b7777
    ✓ Created item 'בדיקת כיור וברזים' 📷 📝: dd8ggg88-ma6j-c9lc-259e-cceedd2c8888
    ✓ Created item 'בדיקת חיבורי גז' 📷 📝 ✍️: ee9hhh99-nb7k-dalm-36af-ddfee3d9999

[STEP] Step 4: Creating instance for 'דירה 12, קומה 3'...
✓ Created instance: ff0iii00-oc8l-ebnd-47bg-eeffaae0000
  Unit: דירה 12, קומה 3
  Status: pending

[STEP] Step 5: Recording 2 item responses with notes and timestamps...
✓ Created response: 001jjj11-pd9m-fcoe-58ch-ff00bb1f1111
  Status: approved
  Notes: דלת כניסה במצב מעולה, ללא פגמים...
✓ Created response: 112kkk22-qean-gdpf-69di-00211cc21222
  Status: approved
  Notes: אינטרקום פועל תקין, נבדק עם שומר...

[STEP] Step 6: Verifying template hierarchy...
✓ Template has correct structure:
  Name: פרוטוקול מסירה לדייר
  Level: project
  Group: מסירות
  Subsections: 2
    כניסה: 3 items
    מטבח: 3 items
✓ Template hierarchy verified successfully!

[STEP] Step 7: Verifying instance includes responses...
✓ Instance has correct structure:
  Unit: דירה 12, קומה 3
  Status: pending
  Responses: 2
    Response 001jjj11: approved
      Notes: דלת כניסה במצב מעולה, ללא פגמים...
    Response 112kkk22: approved
      Notes: אינטרקום פועל תקין, נבדק עם שומר...
✓ Instance responses verified successfully!

[STEP] Step 8: Deleting template and verifying cascade deletes...
✓ Template deleted successfully
✓ Verified template no longer exists
✓ Cascade delete verified (subsections and items deleted)

============================================================
✓ ALL VERIFICATION STEPS PASSED!
============================================================
```

## Manual API Testing

If you prefer to test manually using cURL or Postman, follow these steps:

### 1. Get Authentication Token
```bash
# The demo environment auto-creates a user
TOKEN="Bearer test-token"
```

### 2. Create a Project
```bash
curl -X POST http://localhost:8000/api/v1/projects \
  -H "Authorization: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Project",
    "description": "E2E Test",
    "status": "active"
  }'
# Save the returned project ID
```

### 3. Create a Template
```bash
curl -X POST http://localhost:8000/api/v1/projects/{PROJECT_ID}/checklist-templates \
  -H "Authorization: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "פרוטוקול מסירה לדייר",
    "level": "project",
    "group": "מסירות",
    "category": "apartment_handover"
  }'
# Save the returned template ID
```

### 4. Continue with remaining steps...
(See the Python script for complete request payloads)

## Troubleshooting

### Backend Won't Start
```bash
# Check logs
docker-compose logs backend

# Common issues:
# - Database not ready: Wait longer or check db logs
# - Port 8000 in use: Stop other services using this port
# - Migration failed: Check migration files
```

### Database Connection Issues
```bash
# Verify database is running
docker-compose ps db

# Check database logs
docker-compose logs db

# Verify connection string in .env or docker-compose.yml
```

### Hebrew Text Issues
```bash
# Verify UTF-8 encoding is supported
locale

# Check database encoding
docker-compose exec db psql -U postgres -d builder_db -c "SHOW client_encoding;"
# Should return: UTF8
```

### Test Failures
```bash
# Get detailed API error messages by enabling debug mode
# Check backend/app/config.py DEBUG setting

# View backend logs in real-time
docker-compose logs -f backend

# Check audit logs in database
docker-compose exec db psql -U postgres -d builder_db -c "SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 10;"
```

## Database Verification

After running tests, verify the database state:

```bash
# Connect to database
docker-compose exec db psql -U postgres -d builder_db

# Check tables exist
\dt checklist*

# Count records
SELECT 'templates' as table_name, COUNT(*) FROM checklist_templates
UNION ALL
SELECT 'subsections', COUNT(*) FROM checklist_subsections
UNION ALL
SELECT 'items', COUNT(*) FROM checklist_item_templates
UNION ALL
SELECT 'instances', COUNT(*) FROM checklist_instances
UNION ALL
SELECT 'responses', COUNT(*) FROM checklist_item_responses;

# Verify foreign keys
SELECT constraint_name, table_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name LIKE 'checklist%' AND constraint_type = 'FOREIGN KEY';

# Check JSONB columns
SELECT column_name, table_name, data_type
FROM information_schema.columns
WHERE table_name LIKE 'checklist%' AND data_type = 'jsonb';
```

## API Documentation

After services are running, view the complete API documentation:

- **Swagger UI:** http://localhost:8000/api/v1/docs
- **ReDoc:** http://localhost:8000/api/v1/redoc

## Cleanup

```bash
# Stop services but keep data
docker-compose stop

# Stop and remove containers (keeps volumes)
docker-compose down

# Remove everything including data
docker-compose down -v
```

## Success Indicators

✅ **All tests pass** - Green checkmarks for all 8 steps
✅ **Hebrew text preserved** - No encoding issues in responses
✅ **Nested data loads** - Full hierarchy returned in single request
✅ **Cascade deletes work** - Deleting template removes all children
✅ **Audit logs created** - Check `audit_logs` table for CREATE/UPDATE/DELETE entries
✅ **API docs updated** - All endpoints visible in Swagger UI
✅ **Database constraints** - Foreign keys enforce referential integrity

## Next Steps

After successful verification:
1. ✅ Mark subtask-5-1 as completed in implementation_plan.json
2. ✅ Commit all changes to git
3. ✅ Update build-progress.txt with results
4. ➡️ Proceed to subtask-5-2: API documentation verification
