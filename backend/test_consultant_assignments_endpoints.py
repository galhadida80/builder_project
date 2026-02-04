#!/usr/bin/env python3
"""
Test script for consultant_assignments API endpoints.
This script verifies the endpoint definitions are correct.
"""

import sys
import inspect

# Add the app directory to the path
sys.path.insert(0, 'app')

def test_endpoint_definitions():
    """Test that all required endpoints are defined in the router."""
    print("Testing consultant_assignments endpoint definitions...")
    print("-" * 60)

    try:
        # Import the router
        from app.api.v1.consultant_assignments import router
        print("✓ Successfully imported consultant_assignments router")

        # Get all routes
        routes = []
        for route in router.routes:
            if hasattr(route, 'methods') and hasattr(route, 'path'):
                for method in route.methods:
                    routes.append((method, route.path))
                    print(f"✓ Found endpoint: {method} {route.path}")

        # Expected endpoints
        expected = [
            ("GET", "/consultant-assignments"),
            ("POST", "/consultant-assignments"),
            ("GET", "/consultant-assignments/{assignment_id}"),
            ("PUT", "/consultant-assignments/{assignment_id}"),
            ("DELETE", "/consultant-assignments/{assignment_id}"),
        ]

        print("\n" + "-" * 60)
        print("Verifying expected endpoints...")
        print("-" * 60)

        for method, path in expected:
            if (method, path) in routes:
                print(f"✓ {method} {path} - FOUND")
            else:
                print(f"✗ {method} {path} - MISSING")
                return False

        print("\n" + "=" * 60)
        print("SUCCESS: All required endpoints are defined!")
        print("=" * 60)
        return True

    except ImportError as e:
        print(f"✗ Failed to import router: {e}")
        return False
    except Exception as e:
        print(f"✗ Error during testing: {e}")
        return False


def test_schema_definitions():
    """Test that all required schemas are defined."""
    print("\n\nTesting consultant_assignment schema definitions...")
    print("-" * 60)

    try:
        from app.schemas.consultant_assignment import (
            ConsultantAssignmentCreate,
            ConsultantAssignmentUpdate,
            ConsultantAssignmentResponse
        )
        print("✓ Successfully imported all required schemas")
        print("  - ConsultantAssignmentCreate")
        print("  - ConsultantAssignmentUpdate")
        print("  - ConsultantAssignmentResponse")
        return True
    except ImportError as e:
        print(f"✗ Failed to import schemas: {e}")
        return False


def test_model_definition():
    """Test that the model is properly defined."""
    print("\n\nTesting ConsultantAssignment model definition...")
    print("-" * 60)

    try:
        from app.models.consultant_assignment import ConsultantAssignment
        print("✓ Successfully imported ConsultantAssignment model")

        # Check for required attributes
        required_attrs = [
            'id', 'consultant_id', 'project_id', 'consultant_type_id',
            'start_date', 'end_date', 'status', 'notes',
            'created_at', 'updated_at'
        ]

        for attr in required_attrs:
            if hasattr(ConsultantAssignment, attr):
                print(f"✓ Model has attribute: {attr}")
            else:
                print(f"✗ Model missing attribute: {attr}")
                return False

        return True
    except ImportError as e:
        print(f"✗ Failed to import model: {e}")
        return False


def print_manual_test_instructions():
    """Print instructions for manual API testing."""
    print("\n\n" + "=" * 60)
    print("MANUAL API TESTING INSTRUCTIONS")
    print("=" * 60)
    print("\nOnce the backend server is running with the migrated database,")
    print("you can test the endpoints with these curl commands:\n")

    print("1. List all consultant assignments:")
    print("   curl -X GET http://localhost:8000/api/v1/consultant-assignments\n")

    print("2. Create a new consultant assignment:")
    print("   curl -X POST http://localhost:8000/api/v1/consultant-assignments \\")
    print("     -H 'Content-Type: application/json' \\")
    print("     -H 'Authorization: Bearer YOUR_TOKEN' \\")
    print("     -d '{")
    print('         "consultant_id": "USER_UUID",')
    print('         "project_id": "PROJECT_UUID",')
    print('         "consultant_type_id": "CONSULTANT_TYPE_UUID",')
    print('         "start_date": "2026-02-10",')
    print('         "end_date": "2026-02-20",')
    print('         "status": "pending"')
    print("     }'\n")

    print("3. Get a specific assignment:")
    print("   curl -X GET http://localhost:8000/api/v1/consultant-assignments/{assignment_id}\n")

    print("4. Update an assignment:")
    print("   curl -X PUT http://localhost:8000/api/v1/consultant-assignments/{assignment_id} \\")
    print("     -H 'Content-Type: application/json' \\")
    print("     -H 'Authorization: Bearer YOUR_TOKEN' \\")
    print("     -d '{\"status\": \"active\"}'\n")

    print("5. Delete an assignment:")
    print("   curl -X DELETE http://localhost:8000/api/v1/consultant-assignments/{assignment_id} \\")
    print("     -H 'Authorization: Bearer YOUR_TOKEN'\n")

    print("Note: POST, PUT, and DELETE endpoints require authentication.")
    print("=" * 60)


if __name__ == "__main__":
    print("\n" + "=" * 60)
    print("CONSULTANT ASSIGNMENTS API ENDPOINT TEST")
    print("=" * 60 + "\n")

    # Run all tests
    test1 = test_endpoint_definitions()
    test2 = test_schema_definitions()
    test3 = test_model_definition()

    # Print manual testing instructions
    print_manual_test_instructions()

    # Final result
    print("\n" + "=" * 60)
    if test1 and test2 and test3:
        print("RESULT: All automated tests PASSED ✓")
        print("=" * 60)
        sys.exit(0)
    else:
        print("RESULT: Some tests FAILED ✗")
        print("=" * 60)
        sys.exit(1)
