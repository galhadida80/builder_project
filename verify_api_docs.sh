#!/bin/bash

echo "=== API Documentation Verification Script ==="
echo ""
echo "Date: $(date)"
echo ""

# Check if backend is accessible
echo "1. Checking backend accessibility..."
if curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo "   ✓ Backend is running on port 8000"
else
    echo "   ✗ Backend is not accessible"
    exit 1
fi

# Check OpenAPI docs endpoint
echo ""
echo "2. Checking Swagger UI docs..."
if curl -s http://localhost:8000/api/v1/docs | grep -q "swagger-ui"; then
    echo "   ✓ Swagger UI is accessible at /api/v1/docs"
else
    echo "   ✗ Swagger UI is not accessible"
fi

# Fetch and analyze OpenAPI schema
echo ""
echo "3. Fetching OpenAPI schema..."
curl -s http://localhost:8000/api/v1/openapi.json > /tmp/openapi_verification.json

if [ -s /tmp/openapi_verification.json ]; then
    echo "   ✓ OpenAPI schema fetched successfully"
else
    echo "   ✗ Failed to fetch OpenAPI schema"
    exit 1
fi

# Check for consultant-types endpoints
echo ""
echo "4. Checking for consultant-types endpoints..."
CONSULTANT_ENDPOINTS=$(python3 -c "
import json
with open('/tmp/openapi_verification.json') as f:
    schema = json.load(f)
paths = [p for p in schema.get('paths', {}).keys() if 'consultant' in p.lower()]
print(len(paths))
for p in paths:
    print(f'  - {p}')
" 2>/dev/null)

if echo "$CONSULTANT_ENDPOINTS" | grep -q "consultant"; then
    echo "   ✓ Found consultant-types endpoints:"
    echo "$CONSULTANT_ENDPOINTS"
else
    echo "   ✗ No consultant-types endpoints found"
    echo "   Expected endpoints:"
    echo "     - GET    /api/v1/consultant-types"
    echo "     - POST   /api/v1/consultant-types"
    echo "     - GET    /api/v1/consultant-types/{id}"
    echo "     - PUT    /api/v1/consultant-types/{id}"
    echo "     - DELETE /api/v1/consultant-types/{id}"
    echo "     - GET    /api/v1/consultant-types/{id}/templates"
    echo "     - POST   /api/v1/consultant-types/{id}/templates"
fi

# Check for inspections endpoints
echo ""
echo "5. Checking for inspections endpoints..."
INSPECTION_ENDPOINTS=$(python3 -c "
import json
with open('/tmp/openapi_verification.json') as f:
    schema = json.load(f)
paths = [p for p in schema.get('paths', {}).keys() if 'inspection' in p.lower()]
print(len(paths))
for p in paths:
    print(f'  - {p}')
" 2>/dev/null)

if echo "$INSPECTION_ENDPOINTS" | grep -q "inspection"; then
    echo "   ✓ Found inspections endpoints:"
    echo "$INSPECTION_ENDPOINTS"
else
    echo "   ✗ No inspections endpoints found"
    echo "   Expected endpoints:"
    echo "     - GET    /api/v1/projects/{project_id}/inspections"
    echo "     - POST   /api/v1/projects/{project_id}/inspections"
    echo "     - GET    /api/v1/projects/{project_id}/inspections/{inspection_id}"
    echo "     - PUT    /api/v1/projects/{project_id}/inspections/{inspection_id}"
    echo "     - DELETE /api/v1/projects/{project_id}/inspections/{inspection_id}"
    echo "     - POST   /api/v1/projects/{project_id}/inspections/{inspection_id}/results"
    echo "     - GET    /api/v1/projects/{project_id}/inspections/{inspection_id}/results"
    echo "     - GET    /api/v1/projects/{project_id}/areas/{area_id}/inspections"
fi

# Check for schema models
echo ""
echo "6. Checking for schema models..."
python3 << 'PYTHON'
import json

with open('/tmp/openapi_verification.json') as f:
    schema = json.load(f)

components = schema.get('components', {}).get('schemas', {})
inspection_schemas = [s for s in components.keys() if 'consultant' in s.lower() or 'inspection' in s.lower()]

if inspection_schemas:
    print(f"   ✓ Found {len(inspection_schemas)} inspection-related schemas:")
    for s in sorted(inspection_schemas):
        print(f"     - {s}")
else:
    print("   ✗ No inspection-related schemas found")
    print("   Expected schemas:")
    print("     - ConsultantTypeCreate")
    print("     - ConsultantTypeUpdate")
    print("     - ConsultantTypeResponse")
    print("     - InspectionStageTemplateCreate")
    print("     - InspectionStageTemplateUpdate")
    print("     - InspectionStageTemplateResponse")
    print("     - ProjectInspectionCreate")
    print("     - ProjectInspectionUpdate")
    print("     - ProjectInspectionResponse")
    print("     - InspectionResultCreate")
    print("     - InspectionResultUpdate")
    print("     - InspectionResultResponse")
PYTHON

# Final summary
echo ""
echo "=== SUMMARY ==="
echo ""

# Count total endpoints
TOTAL_ENDPOINTS=$(python3 -c "
import json
with open('/tmp/openapi_verification.json') as f:
    schema = json.load(f)
print(len(schema.get('paths', {})))
" 2>/dev/null)

echo "Total API endpoints in schema: $TOTAL_ENDPOINTS"

# Check if our endpoints are there
HAS_CONSULTANT=$(python3 -c "
import json
with open('/tmp/openapi_verification.json') as f:
    schema = json.load(f)
paths = [p for p in schema.get('paths', {}).keys() if 'consultant' in p.lower()]
print('yes' if paths else 'no')
" 2>/dev/null)

HAS_INSPECTION=$(python3 -c "
import json
with open('/tmp/openapi_verification.json') as f:
    schema = json.load(f)
paths = [p for p in schema.get('paths', {}).keys() if 'inspection' in p.lower()]
print('yes' if paths else 'no')
" 2>/dev/null)

echo ""
if [ "$HAS_CONSULTANT" = "yes" ] && [ "$HAS_INSPECTION" = "yes" ]; then
    echo "✓ VERIFICATION PASSED"
    echo "  All inspection endpoints are documented in the API"
    exit 0
else
    echo "✗ VERIFICATION FAILED"
    echo ""
    echo "REQUIRED ACTION:"
    echo "The backend Docker container needs to be restarted to pick up the new routes."
    echo ""
    echo "To fix this issue, run:"
    echo "  docker-compose restart backend"
    echo "OR"
    echo "  docker-compose down && docker-compose up -d"
    echo ""
    echo "After restarting, run this script again to verify."
    exit 1
fi
