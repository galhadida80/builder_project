#!/usr/bin/env python3
"""
API Documentation Verification Script
Verifies that all Apartment Checklist Template System endpoints are properly documented
in the OpenAPI spec at http://localhost:8000/api/v1/docs
"""

import json
import sys
import requests
from typing import Dict, List, Tuple

# ANSI color codes
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
RESET = '\033[0m'

def print_header(text: str):
    print(f"\n{BLUE}{'=' * 80}{RESET}")
    print(f"{BLUE}{text}{RESET}")
    print(f"{BLUE}{'=' * 80}{RESET}")

def print_success(text: str):
    print(f"{GREEN}✓ {text}{RESET}")

def print_error(text: str):
    print(f"{RED}✗ {text}{RESET}")

def print_warning(text: str):
    print(f"{YELLOW}⚠ {text}{RESET}")

def fetch_openapi_spec() -> Dict:
    """Fetch the OpenAPI specification from the running backend."""
    try:
        response = requests.get('http://localhost:8000/api/v1/openapi.json', timeout=5)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.ConnectionError:
        print_error("Cannot connect to http://localhost:8000")
        print("Please ensure the backend server is running:")
        print("  cd backend && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000")
        sys.exit(1)
    except Exception as e:
        print_error(f"Failed to fetch OpenAPI spec: {e}")
        sys.exit(1)

def check_endpoints(spec: Dict) -> Tuple[bool, List[str]]:
    """Verify all checklist endpoints are present in the API documentation."""
    print_header("CHECK 1: All Checklist Endpoints Visible")

    expected_endpoints = [
        # Template endpoints
        ('/checklist-templates', ['get']),
        ('/projects/{project_id}/checklist-templates', ['get', 'post']),
        ('/projects/{project_id}/checklist-templates/{template_id}', ['get', 'put', 'delete']),

        # Subsection endpoints
        ('/checklist-templates/{template_id}/subsections', ['post', 'get']),
        ('/checklist-templates/{template_id}/subsections/{subsection_id}', ['get', 'put', 'delete']),

        # Item template endpoints
        ('/subsections/{subsection_id}/items', ['post', 'get']),
        ('/subsections/{subsection_id}/items/{item_id}', ['get', 'put', 'delete']),

        # Instance endpoints
        ('/checklist-instances', ['get']),
        ('/projects/{project_id}/checklist-instances', ['get', 'post']),
        ('/projects/{project_id}/checklist-instances/{instance_id}', ['get', 'put', 'delete']),

        # Response endpoints
        ('/checklist-instances/{instance_id}/responses', ['post', 'get']),
        ('/checklist-instances/{instance_id}/responses/{response_id}', ['get', 'put', 'delete']),
    ]

    paths = spec.get('paths', {})
    all_paths = list(paths.keys())

    # Find checklist-related paths
    checklist_paths = [p for p in all_paths if any(keyword in p.lower() for keyword in
                       ['checklist-template', 'subsection', 'checklist-instance'])]

    print(f"\nFound {len(checklist_paths)} checklist-related endpoints:")
    for path in sorted(checklist_paths):
        methods = [m.upper() for m in paths[path].keys() if m in ['get', 'post', 'put', 'delete', 'patch']]
        print(f"  {path}")
        for method in methods:
            print(f"    - {method}")

    # Check for expected endpoints
    missing = []
    for endpoint, methods in expected_endpoints:
        # Look for the endpoint (with or without /api/v1 prefix)
        found = False
        for path in all_paths:
            if path.endswith(endpoint) or endpoint in path:
                found_methods = list(paths[path].keys())
                for method in methods:
                    if method not in found_methods:
                        missing.append(f"{method.upper()} {endpoint}")
                found = True
                break

        if not found:
            for method in methods:
                missing.append(f"{method.upper()} {endpoint}")

    if not missing:
        print_success(f"All {len(expected_endpoints)} expected endpoint groups are documented")
        return True, checklist_paths
    else:
        print_error(f"Missing {len(missing)} expected endpoints:")
        for m in missing[:10]:  # Show first 10
            print(f"    {m}")
        return False, checklist_paths

def check_schemas(spec: Dict) -> bool:
    """Verify all checklist schemas are documented."""
    print_header("CHECK 2: Request/Response Schemas with Hebrew Text Examples")

    schemas = spec.get('components', {}).get('schemas', {})

    expected_schemas = [
        'ChecklistTemplateCreate',
        'ChecklistTemplateUpdate',
        'ChecklistTemplateResponse',
        'ChecklistSubSectionCreate',
        'ChecklistSubSectionUpdate',
        'ChecklistSubSectionResponse',
        'ChecklistItemTemplateCreate',
        'ChecklistItemTemplateUpdate',
        'ChecklistItemTemplateResponse',
        'ChecklistInstanceCreate',
        'ChecklistInstanceUpdate',
        'ChecklistInstanceResponse',
        'ChecklistItemResponseCreate',
        'ChecklistItemResponseUpdate',
        'ChecklistItemResponseResponse',
    ]

    found_schemas = []
    missing_schemas = []

    for schema_name in expected_schemas:
        if schema_name in schemas:
            found_schemas.append(schema_name)
            print_success(f"{schema_name}")
        else:
            missing_schemas.append(schema_name)
            print_error(f"{schema_name} - NOT FOUND")

    # Check for Hebrew text examples
    print("\nChecking for Hebrew text examples in schemas:")
    hebrew_count = 0
    for schema_name in found_schemas:
        schema = schemas[schema_name]
        schema_str = json.dumps(schema)
        # Check for Hebrew characters (Unicode range 0x0590-0x05FF)
        if any(ord(c) >= 0x0590 and ord(c) <= 0x05FF for c in schema_str):
            print_success(f"{schema_name} contains Hebrew examples")
            hebrew_count += 1

    if hebrew_count == 0:
        print_warning("No Hebrew text examples found in schema documentation")
        print("Consider adding Hebrew examples to schema docstrings or Field descriptions")
    else:
        print_success(f"{hebrew_count} schemas contain Hebrew text examples")

    return len(missing_schemas) == 0

def check_jsonb_fields(spec: Dict) -> bool:
    """Verify JSONB metadata fields are documented."""
    print_header("CHECK 3: JSONB Fields Documented")

    schemas = spec.get('components', {}).get('schemas', {})

    response_schemas = [s for s in schemas.keys() if 'Response' in s and 'Checklist' in s]

    found_metadata = []
    for schema_name in response_schemas:
        schema = schemas[schema_name]
        props = schema.get('properties', {})

        if 'metadata' in props:
            metadata_def = props['metadata']
            # Check if it's properly typed
            metadata_type = metadata_def.get('anyOf', metadata_def.get('type', 'unknown'))
            print_success(f"{schema_name}.metadata documented")
            found_metadata.append(schema_name)
        else:
            print_warning(f"{schema_name}.metadata not found")

    # Check for other JSONB fields
    jsonb_fields = ['image_urls', 'signature_url']
    for schema_name in ['ChecklistItemResponseResponse']:
        if schema_name in schemas:
            schema = schemas[schema_name]
            props = schema.get('properties', {})
            for field in jsonb_fields:
                if field in props:
                    print_success(f"{schema_name}.{field} documented")

    return len(found_metadata) > 0

def check_nested_relationships(spec: Dict) -> bool:
    """Verify nested relationships are visible in response schemas."""
    print_header("CHECK 4: Nested Relationships Visible in Responses")

    schemas = spec.get('components', {}).get('schemas', {})

    expected_relationships = {
        'ChecklistTemplateResponse': ['subsections'],
        'ChecklistSubSectionResponse': ['items'],
        'ChecklistInstanceResponse': ['responses'],
    }

    all_found = True
    for schema_name, expected_fields in expected_relationships.items():
        if schema_name not in schemas:
            print_error(f"{schema_name} schema not found")
            all_found = False
            continue

        schema = schemas[schema_name]
        props = schema.get('properties', {})

        for field in expected_fields:
            if field in props:
                field_def = props[field]
                field_type = field_def.get('type', '')

                # Check if it's an array
                if field_type == 'array':
                    items = field_def.get('items', {})
                    ref = items.get('$ref', '')
                    ref_name = ref.split('/')[-1] if ref else 'unknown'
                    print_success(f"{schema_name}.{field}: array<{ref_name}>")
                elif 'anyOf' in field_def:
                    # Handle optional arrays
                    array_def = next((x for x in field_def['anyOf'] if x.get('type') == 'array'), None)
                    if array_def:
                        ref = array_def.get('items', {}).get('$ref', '')
                        ref_name = ref.split('/')[-1] if ref else 'unknown'
                        print_success(f"{schema_name}.{field}: array<{ref_name}> (optional)")
                else:
                    print_success(f"{schema_name}.{field}: {field_type}")
            else:
                print_error(f"{schema_name}.{field}: NOT FOUND")
                all_found = False

    return all_found

def main():
    print(f"{BLUE}{'=' * 80}{RESET}")
    print(f"{BLUE}API Documentation Verification{RESET}")
    print(f"{BLUE}Apartment Checklist Template System{RESET}")
    print(f"{BLUE}{'=' * 80}{RESET}")

    # Fetch OpenAPI spec
    print("\nFetching OpenAPI specification from http://localhost:8000/api/v1/openapi.json...")
    spec = fetch_openapi_spec()
    print_success("OpenAPI spec fetched successfully")

    # Run all checks
    checks = []

    endpoints_ok, checklist_paths = check_endpoints(spec)
    checks.append(("All checklist endpoints visible", endpoints_ok))

    schemas_ok = check_schemas(spec)
    checks.append(("Request/response schemas documented", schemas_ok))

    jsonb_ok = check_jsonb_fields(spec)
    checks.append(("JSONB fields documented", jsonb_ok))

    relationships_ok = check_nested_relationships(spec)
    checks.append(("Nested relationships visible", relationships_ok))

    # Print summary
    print_header("VERIFICATION SUMMARY")

    all_passed = all(result for _, result in checks)

    for check_name, result in checks:
        if result:
            print_success(check_name)
        else:
            print_error(check_name)

    print(f"\n{BLUE}{'=' * 80}{RESET}")

    if all_passed:
        print_success("All API documentation checks passed!")
        print("\nTo view the documentation:")
        print("  Browser: http://localhost:8000/api/v1/docs")
        print("  ReDoc:   http://localhost:8000/api/v1/redoc")
        return 0
    else:
        print_error("Some API documentation checks failed")
        print("\nPlease ensure:")
        print("  1. Backend server has been restarted to load new routes")
        print("  2. All models and schemas are properly imported")
        print("  3. Router is registered in app/api/v1/router.py")
        return 1

if __name__ == "__main__":
    sys.exit(main())
