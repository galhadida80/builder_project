# How to Verify API Documentation

## Quick Start (3 Steps)

### Step 1: Restart Backend Server
```bash
cd /Users/galhadida/projects/builder_project/builder_program
docker-compose restart backend
```

### Step 2: Check Routes Loaded
```bash
curl -s http://localhost:8000/api/v1/openapi.json | python3 -c "
import sys, json
spec = json.load(sys.stdin)
paths = [p for p in spec['paths'] if 'checklist-template' in p or 'subsection' in p or 'checklist-instance' in p]
print(f'Found {len(paths)} checklist endpoints')
print('✓ Server loaded new routes!' if len(paths) >= 12 else '✗ Server still on old code')
"
```

Expected: `Found 13 checklist endpoints` and `✓ Server loaded new routes!`

### Step 3: Open Browser
```bash
open http://localhost:8000/api/v1/docs
```

In Swagger UI:
1. Find the **"checklists"** tag
2. Expand it to see all 27 endpoints
3. Try one endpoint using "Try it out"

## What You Should See

### In Swagger UI (http://localhost:8000/api/v1/docs)

**checklists** tag with these sections:

**Templates (6 endpoints):**
- GET /checklist-templates
- GET /projects/{project_id}/checklist-templates
- POST /projects/{project_id}/checklist-templates
- GET /projects/{project_id}/checklist-templates/{template_id}
- PUT /projects/{project_id}/checklist-templates/{template_id}
- DELETE /projects/{project_id}/checklist-templates/{template_id}

**Subsections (5 endpoints):**
- POST /checklist-templates/{template_id}/subsections
- GET /checklist-templates/{template_id}/subsections
- GET /checklist-templates/{template_id}/subsections/{subsection_id}
- PUT /checklist-templates/{template_id}/subsections/{subsection_id}
- DELETE /checklist-templates/{template_id}/subsections/{subsection_id}

**Items (5 endpoints):**
- POST /subsections/{subsection_id}/items
- GET /subsections/{subsection_id}/items
- GET /subsections/{subsection_id}/items/{item_id}
- PUT /subsections/{subsection_id}/items/{item_id}
- DELETE /subsections/{subsection_id}/items/{item_id}

**Instances (6 endpoints):**
- GET /checklist-instances
- GET /projects/{project_id}/checklist-instances
- POST /projects/{project_id}/checklist-instances
- GET /projects/{project_id}/checklist-instances/{instance_id}
- PUT /projects/{project_id}/checklist-instances/{instance_id}
- DELETE /projects/{project_id}/checklist-instances/{instance_id}

**Responses (5 endpoints):**
- POST /checklist-instances/{instance_id}/responses
- GET /checklist-instances/{instance_id}/responses
- GET /checklist-instances/{instance_id}/responses/{response_id}
- PUT /checklist-instances/{instance_id}/responses/{response_id}
- DELETE /checklist-instances/{instance_id}/responses/{response_id}

### Request/Response Schemas

Click on any endpoint to see:
- Request body schema with all fields
- Response schema with nested objects
- Field types and descriptions

Example: POST /projects/{project_id}/checklist-templates

Request body:
```json
{
  "name": "string",
  "level": "string",
  "group": "string",
  "category": "string",
  "metadata": {}
}
```

Response:
```json
{
  "id": "uuid",
  "projectId": "uuid",
  "name": "string",
  "level": "string",
  "group": "string",
  "category": "string",
  "metadata": {},
  "createdAt": "datetime",
  "updatedAt": "datetime",
  "createdBy": {...},
  "subsections": [...]
}
```

## Troubleshooting

### "Only found 1 endpoint"
- Server hasn't restarted yet
- Run: `docker-compose restart backend`

### "Connection refused"
- Backend not running
- Run: `docker-compose up -d backend`

### "404 Not Found" when testing endpoint
- Routes loaded correctly
- Need to create test data first (or test with valid UUID)
- Use POST endpoint to create data, then GET to retrieve

## Done!

When you see all 27 endpoints in Swagger UI, the verification is complete! ✓

---

**Need more details?** See:
- SUBTASK_5-2_SUMMARY.md - Full completion summary
- .auto-claude/specs/.../API_DOCUMENTATION_VERIFICATION.md - Detailed guide
- .auto-claude/specs/.../VERIFICATION_CHECKLIST.md - Full checklist
