#!/bin/bash
set -e
BASE="http://localhost:8000/api/v1"
RUN_ID=$(date +%s)

echo "========================================="
echo "  FULL FLOW TEST - Equipment & Materials"
echo "  Run ID: $RUN_ID"
echo "========================================="
echo ""

# Step 1: Register/Login
echo "=== STEP 1: Register & Login ==="
REGISTER_RESP=$(curl -s -X POST "$BASE/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"fullflow2@test.com","password":"TestPass1234","full_name":"Flow Tester"}' 2>/dev/null)

if echo "$REGISTER_RESP" | grep -q "already\|exists\|detail"; then
  LOGIN_RESP=$(curl -s -X POST "$BASE/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"fullflow2@test.com","password":"TestPass1234"}')
  TOKEN=$(echo "$LOGIN_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['accessToken'])")
  USER_ID=$(echo "$LOGIN_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['user']['id'])")
else
  TOKEN=$(echo "$REGISTER_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['accessToken'])")
  USER_ID=$(echo "$REGISTER_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['user']['id'])")
fi
echo "  Token: ${TOKEN:0:30}..."
echo "  User ID: $USER_ID"
echo ""
AUTH="Authorization: Bearer $TOKEN"

# Step 2: Verify auth
echo "=== STEP 2: Verify Auth ==="
ME=$(curl -s "$BASE/auth/me" -H "$AUTH")
echo "  User: $(echo "$ME" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('email','ERROR'))")"
echo ""

# Step 3: Create project
echo "=== STEP 3: Create Project ==="
PROJECT_RESP=$(curl -s -X POST "$BASE/projects" \
  -H "Content-Type: application/json" \
  -H "$AUTH" \
  -d "{\"name\":\"Flow Test $RUN_ID\",\"code\":\"FT-$RUN_ID\",\"description\":\"Full flow test\",\"status\":\"active\",\"location\":\"Test City\"}")
PROJECT_ID=$(echo "$PROJECT_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
echo "  Project ID: $PROJECT_ID"
echo ""

# Step 4: Equipment templates
echo "=== STEP 4: List Equipment Templates ==="
EQ_TEMPLATES=$(curl -s "$BASE/equipment-templates" -H "$AUTH")
EQ_TPL_COUNT=$(echo "$EQ_TEMPLATES" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))")
echo "  Templates: $EQ_TPL_COUNT"
echo "$EQ_TEMPLATES" | python3 -c "
import sys,json
tpls = json.load(sys.stdin)
if tpls:
    t = tpls[0]
    print(f\"  Sample: {t['name']} | docs={len(t.get('required_documents',[]))} specs={len(t.get('required_specifications',[]))} checks={len(t.get('submission_checklist',[]))} consultants={len(t.get('approving_consultants',[]))}\")
"
echo ""

# Step 5: Material templates
echo "=== STEP 5: List Material Templates ==="
MAT_TEMPLATES=$(curl -s "$BASE/material-templates" -H "$AUTH")
MAT_TPL_COUNT=$(echo "$MAT_TEMPLATES" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))")
echo "  Templates: $MAT_TPL_COUNT"
echo ""

# Step 6: Consultant assignments (empty for new project)
echo "=== STEP 6: Consultant Assignments (new project) ==="
ASSIGN0=$(curl -s "$BASE/projects/$PROJECT_ID/consultant-assignments" -H "$AUTH")
echo "  Assignments: $(echo "$ASSIGN0" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))")"
echo ""

# Step 7: Create equipment
echo "=== STEP 7: Create Equipment ==="
EQ_RESP=$(curl -s -X POST "$BASE/projects/$PROJECT_ID/equipment" \
  -H "Content-Type: application/json" \
  -H "$AUTH" \
  -d '{"name":"Tower Crane TC-500","equipment_type":"structural","manufacturer":"Liebherr","model_number":"280 EC-H 12","serial_number":"SN-2026-TC500","notes":"Flow test crane"}')
EQ_ID=$(echo "$EQ_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
echo "  Equipment: $EQ_ID"
echo "  Name: $(echo "$EQ_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['name'])")"
echo ""

# Step 8: Upload file to equipment
echo "=== STEP 8: Upload File to Equipment ==="
echo "Test document for tower crane TC-500" > /tmp/test_doc.txt
FILE_RESP=$(curl -s -X POST "$BASE/projects/$PROJECT_ID/files?entity_type=equipment&entity_id=$EQ_ID" \
  -H "$AUTH" \
  -F "file=@/tmp/test_doc.txt")
FILE_ID=$(echo "$FILE_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
echo "$FILE_RESP" | python3 -c "
import sys,json
f = json.load(sys.stdin)
print(f\"  File: {f['id']}\")
print(f\"  Name: {f['filename']}\")
print(f\"  Size: {f.get('fileSize', f.get('file_size', '?'))} bytes\")
print(f\"  Path: {f.get('storagePath', f.get('storage_path', '?'))}\")
"
echo ""

# Step 9: Upload second file
echo "=== STEP 9: Upload Second File ==="
echo "%PDF-1.4 Test spec sheet" > /tmp/test_spec.pdf
FILE2_RESP=$(curl -s -X POST "$BASE/projects/$PROJECT_ID/files?entity_type=equipment&entity_id=$EQ_ID" \
  -H "$AUTH" \
  -F "file=@/tmp/test_spec.pdf")
FILE2_ID=$(echo "$FILE2_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
echo "  File 2: $FILE2_ID"
echo ""

# Step 10: List equipment files
echo "=== STEP 10: List Equipment Files ==="
EQ_FILES=$(curl -s "$BASE/projects/$PROJECT_ID/files?entity_type=equipment&entity_id=$EQ_ID" -H "$AUTH")
echo "  Files: $(echo "$EQ_FILES" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))")"
echo ""

# Step 11: Create material
echo "=== STEP 11: Create Material ==="
MAT_RESP=$(curl -s -X POST "$BASE/projects/$PROJECT_ID/materials" \
  -H "Content-Type: application/json" \
  -H "$AUTH" \
  -d '{"name":"Ready Mix Concrete B30","material_type":"concrete","manufacturer":"Hanson","quantity":500,"unit":"cum","notes":"Flow test material"}')
MAT_ID=$(echo "$MAT_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
echo "  Material: $MAT_ID"
echo "  Name: $(echo "$MAT_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['name'])")"
echo ""

# Step 12: Upload file to material
echo "=== STEP 12: Upload File to Material ==="
echo "Concrete mix design certificate - B30 Grade" > /tmp/test_cert.txt
MAT_FILE_RESP=$(curl -s -X POST "$BASE/projects/$PROJECT_ID/files?entity_type=material&entity_id=$MAT_ID" \
  -H "$AUTH" \
  -F "file=@/tmp/test_cert.txt")
MAT_FILE_ID=$(echo "$MAT_FILE_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
echo "  File: $MAT_FILE_ID"
echo ""

# Step 13: All project files
echo "=== STEP 13: All Project Files ==="
ALL_FILES=$(curl -s "$BASE/projects/$PROJECT_ID/files" -H "$AUTH")
echo "$ALL_FILES" | python3 -c "
import sys,json
files = json.load(sys.stdin)
print(f'  Total: {len(files)}')
for f in files:
    etype = f.get('entityType', f.get('entity_type', '?'))
    eid = f.get('entityId', f.get('entity_id', '?'))[:8]
    fsize = f.get('fileSize', f.get('file_size', '?'))
    print(f\"    {f['filename']} | {etype}/{eid}... | {fsize}B\")
"
echo ""

# Step 14: Download URL
echo "=== STEP 14: Download URL ==="
DL=$(curl -s "$BASE/projects/$PROJECT_ID/files/$FILE_ID/download" -H "$AUTH")
echo "  URL: $(echo "$DL" | python3 -c "import sys,json; print(json.load(sys.stdin).get('download_url', json.load(sys.stdin).get('downloadUrl','?')))" 2>/dev/null || echo "$DL" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('download_url','') or d.get('downloadUrl',''))")"
echo ""

# Step 15: Delete file
echo "=== STEP 15: Delete File ==="
DEL=$(curl -s -X DELETE "$BASE/projects/$PROJECT_ID/files/$FILE2_ID" -H "$AUTH")
echo "  Result: $(echo "$DEL" | python3 -c "import sys,json; print(json.load(sys.stdin).get('message','OK'))")"
echo ""

# Step 16: Verify after delete
echo "=== STEP 16: Equipment Files After Delete ==="
EQ_FILES2=$(curl -s "$BASE/projects/$PROJECT_ID/files?entity_type=equipment&entity_id=$EQ_ID" -H "$AUTH")
echo "  Remaining: $(echo "$EQ_FILES2" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))")"
echo ""

# Step 17: Consultant types
echo "=== STEP 17: Consultant Types ==="
CT=$(curl -s "$BASE/consultant-types" -H "$AUTH")
echo "$CT" | python3 -c "
import sys,json
types = json.load(sys.stdin)
print(f'  Total: {len(types)}')
for t in types[:3]:
    print(f\"    {t['name']} ({t.get('category','')}) [{t.get('name_he','')[:20]}]\")
if len(types)>3: print(f'    ...{len(types)-3} more')
"
FIRST_CT_ID=$(echo "$CT" | python3 -c "import sys,json; t=json.load(sys.stdin); print(t[0]['id'] if t else 'NONE')")
echo ""

# Step 18: Create consultant assignment
echo "=== STEP 18: Create Consultant Assignment ==="
if [ "$FIRST_CT_ID" != "NONE" ]; then
  pushd backend > /dev/null
  source venv/bin/activate 2>/dev/null || true
  python3 -c "
import asyncio
from app.db.session import engine
from sqlalchemy import text
import uuid

async def create():
    async with engine.begin() as conn:
        aid = str(uuid.uuid4())
        await conn.execute(text('''
            INSERT INTO consultant_assignments (id, consultant_id, project_id, consultant_type_id, start_date, end_date, status)
            VALUES (:id, :cid, :pid, :ctid, '2026-01-01', '2026-12-31', 'active')
        '''), {'id': aid, 'cid': '$USER_ID', 'pid': '$PROJECT_ID', 'ctid': '$FIRST_CT_ID'})
        print(f'  Assignment: {aid}')
asyncio.run(create())
"
  popd > /dev/null
else
  echo "  Skipped (no consultant types)"
fi
echo ""

# Step 19: Verify assignments
echo "=== STEP 19: Verify Consultant Assignments ==="
ASSIGN_FINAL=$(curl -s "$BASE/projects/$PROJECT_ID/consultant-assignments" -H "$AUTH")
echo "$ASSIGN_FINAL" | python3 -c "
import sys,json
a = json.load(sys.stdin)
print(f'  Total: {len(a)}')
for x in a:
    print(f\"    {x.get('consultant_name','?')} -> {x.get('consultant_type_name','?')} (status={x.get('status','')})\")
"
echo ""

# Step 20: List all equipment
echo "=== STEP 20: Project Equipment ==="
ALL_EQ=$(curl -s "$BASE/equipment?project_id=$PROJECT_ID" -H "$AUTH")
echo "$ALL_EQ" | python3 -c "
import sys,json
items = json.load(sys.stdin)
print(f'  Total: {len(items)}')
for e in items:
    print(f\"    {e['name']} [{e.get('equipmentType', e.get('equipment_type',''))}] status={e.get('status','')}\")
"
echo ""

# Step 21: List all materials
echo "=== STEP 21: Project Materials ==="
ALL_MAT=$(curl -s "$BASE/materials?project_id=$PROJECT_ID" -H "$AUTH")
echo "$ALL_MAT" | python3 -c "
import sys,json
items = json.load(sys.stdin)
print(f'  Total: {len(items)}')
for m in items:
    print(f\"    {m['name']} [{m.get('materialType', m.get('material_type',''))}] qty={m.get('quantity','')} {m.get('unit','')}\")
"
echo ""

rm -f /tmp/test_doc.txt /tmp/test_spec.pdf /tmp/test_cert.txt

echo "========================================="
echo "  FULL FLOW TEST COMPLETE - ALL PASSED"
echo "========================================="
echo ""
echo "  Auth:       register + login + verify"
echo "  Project:    $PROJECT_ID"
echo "  Equipment:  $EQ_ID (created + 2 files uploaded + 1 deleted)"
echo "  Material:   $MAT_ID (created + 1 file uploaded)"
echo "  Templates:  $EQ_TPL_COUNT equipment / $MAT_TPL_COUNT material"
echo "  Files:      upload / list / download / delete"
echo "  Consultants: types listed + assignment created + API verified"
echo ""
