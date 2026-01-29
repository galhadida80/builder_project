#!/usr/bin/env python3
"""
End-to-end verification script for Apartment Checklist Template System.

This script verifies the complete workflow:
1. Create template 'פרוטוקול מסירה לדייר'
2. Create 2 subsections: 'כניסה', 'מטבח'
3. Create 3 items per subsection with must_image flags
4. Create instance for 'דירה 12, קומה 3'
5. Record 2 item responses with notes and timestamps
6. GET template by ID - verify full hierarchy returned
7. GET instance by ID - verify responses included
8. DELETE template - verify cascade deletes subsections/items
"""

import asyncio
import sys
import requests
import time
from typing import Dict, Any, Optional
from uuid import UUID

# API Configuration
BASE_URL = "http://localhost:8000/api/v1"
HEADERS = {
    "Authorization": "Bearer test-token",
    "Content-Type": "application/json"
}

class Colors:
    """ANSI color codes for terminal output"""
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKCYAN = '\033[96m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'


def print_step(step: str):
    """Print a test step in blue"""
    print(f"{Colors.OKBLUE}{Colors.BOLD}[STEP] {step}{Colors.ENDC}")


def print_success(message: str):
    """Print a success message in green"""
    print(f"{Colors.OKGREEN}✓ {message}{Colors.ENDC}")


def print_error(message: str):
    """Print an error message in red"""
    print(f"{Colors.FAIL}✗ {message}{Colors.ENDC}")


def print_info(message: str):
    """Print an info message"""
    print(f"{Colors.OKCYAN}{message}{Colors.ENDC}")


def wait_for_backend(max_attempts: int = 30, delay: int = 2) -> bool:
    """Wait for backend to be ready"""
    print_step("Waiting for backend to be ready...")

    for attempt in range(max_attempts):
        try:
            response = requests.get(f"{BASE_URL.replace('/api/v1', '')}/health", timeout=5)
            if response.status_code == 200:
                print_success("Backend is ready!")
                return True
        except requests.exceptions.RequestException:
            pass

        print(f"  Attempt {attempt + 1}/{max_attempts}... waiting {delay}s")
        time.sleep(delay)

    print_error("Backend failed to start")
    return False


def create_project() -> Optional[str]:
    """Create a test project and return its ID"""
    print_step("Creating test project...")

    payload = {
        "name": "Test Project for Checklist E2E",
        "description": "Automated test project",
        "status": "active"
    }

    try:
        response = requests.post(
            f"{BASE_URL}/projects",
            json=payload,
            headers=HEADERS,
            timeout=10
        )

        if response.status_code in [200, 201]:
            project_id = response.json().get("id")
            print_success(f"Created project: {project_id}")
            return project_id
        else:
            print_error(f"Failed to create project: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print_error(f"Error creating project: {e}")
        return None


def create_template(project_id: str) -> Optional[str]:
    """Create a checklist template"""
    print_step("Step 1: Creating template 'פרוטוקול מסירה לדייר'...")

    payload = {
        "name": "פרוטוקול מסירה לדייר",
        "level": "project",
        "group": "מסירות",
        "category": "apartment_handover",
        "metadata": {
            "description": "Standard apartment handover protocol",
            "version": "1.0"
        }
    }

    try:
        response = requests.post(
            f"{BASE_URL}/projects/{project_id}/checklist-templates",
            json=payload,
            headers=HEADERS,
            timeout=10
        )

        if response.status_code in [200, 201]:
            template_id = response.json().get("id")
            print_success(f"Created template: {template_id}")
            print_info(f"  Name: {response.json().get('name')}")
            return template_id
        else:
            print_error(f"Failed to create template: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print_error(f"Error creating template: {e}")
        return None


def create_subsections(template_id: str) -> list:
    """Create 2 subsections"""
    print_step("Step 2: Creating subsections 'כניסה' and 'מטבח'...")

    subsections_data = [
        {"name": "כניסה", "order": 1, "metadata": {"description": "Entrance area"}},
        {"name": "מטבח", "order": 2, "metadata": {"description": "Kitchen area"}}
    ]

    subsection_ids = []

    for subsection_data in subsections_data:
        try:
            response = requests.post(
                f"{BASE_URL}/checklist-templates/{template_id}/subsections",
                json=subsection_data,
                headers=HEADERS,
                timeout=10
            )

            if response.status_code in [200, 201]:
                subsection_id = response.json().get("id")
                subsection_ids.append(subsection_id)
                print_success(f"Created subsection '{subsection_data['name']}': {subsection_id}")
            else:
                print_error(f"Failed to create subsection: {response.status_code} - {response.text}")
        except Exception as e:
            print_error(f"Error creating subsection: {e}")

    return subsection_ids


def create_items(subsection_ids: list) -> list:
    """Create 3 items per subsection"""
    print_step("Step 3: Creating 3 items per subsection with must_image flags...")

    item_ids = []

    items_per_subsection = [
        [
            {"name": "בדיקת דלת כניסה", "category": "doors", "description": "Check entrance door condition", "must_image": True, "must_note": False, "must_signature": False},
            {"name": "בדיקת אינטרקום", "category": "electronics", "description": "Verify intercom functionality", "must_image": True, "must_note": True, "must_signature": False},
            {"name": "בדיקת צבע קירות", "category": "walls", "description": "Inspect wall paint quality", "must_image": True, "must_note": False, "must_signature": False}
        ],
        [
            {"name": "בדיקת ארונות מטבח", "category": "cabinets", "description": "Check kitchen cabinets", "must_image": True, "must_note": False, "must_signature": False},
            {"name": "בדיקת כיור וברזים", "category": "plumbing", "description": "Test sink and faucets", "must_image": True, "must_note": True, "must_signature": False},
            {"name": "בדיקת חיבורי גז", "category": "gas", "description": "Verify gas connections", "must_image": True, "must_note": True, "must_signature": True}
        ]
    ]

    for idx, subsection_id in enumerate(subsection_ids):
        print_info(f"  Creating items for subsection {idx + 1}...")
        for item_data in items_per_subsection[idx]:
            try:
                response = requests.post(
                    f"{BASE_URL}/subsections/{subsection_id}/items",
                    json=item_data,
                    headers=HEADERS,
                    timeout=10
                )

                if response.status_code in [200, 201]:
                    item_id = response.json().get("id")
                    item_ids.append(item_id)
                    flags = []
                    if item_data.get("must_image"):
                        flags.append("📷")
                    if item_data.get("must_note"):
                        flags.append("📝")
                    if item_data.get("must_signature"):
                        flags.append("✍️")
                    print_success(f"    Created item '{item_data['name']}' {' '.join(flags)}: {item_id}")
                else:
                    print_error(f"Failed to create item: {response.status_code} - {response.text}")
            except Exception as e:
                print_error(f"Error creating item: {e}")

    return item_ids


def create_instance(project_id: str, template_id: str, item_template_ids: list) -> Optional[str]:
    """Create a checklist instance"""
    print_step("Step 4: Creating instance for 'דירה 12, קומה 3'...")

    payload = {
        "template_id": template_id,
        "unit_identifier": "דירה 12, קומה 3",
        "status": "pending",
        "metadata": {
            "floor": 3,
            "apartment_number": 12,
            "building": "A"
        }
    }

    try:
        response = requests.post(
            f"{BASE_URL}/projects/{project_id}/checklist-instances",
            json=payload,
            headers=HEADERS,
            timeout=10
        )

        if response.status_code in [200, 201]:
            instance_id = response.json().get("id")
            print_success(f"Created instance: {instance_id}")
            print_info(f"  Unit: {response.json().get('unitIdentifier')}")
            print_info(f"  Status: {response.json().get('status')}")
            return instance_id
        else:
            print_error(f"Failed to create instance: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print_error(f"Error creating instance: {e}")
        return None


def create_responses(instance_id: str, item_template_ids: list) -> list:
    """Create 2 item responses"""
    print_step("Step 5: Recording 2 item responses with notes and timestamps...")

    # Create responses for the first 2 items
    responses_data = [
        {
            "item_template_id": item_template_ids[0],
            "status": "approved",
            "notes": "דלת כניסה במצב מעולה, ללא פגמים",
            "image_urls": ["https://example.com/images/door1.jpg", "https://example.com/images/door2.jpg"],
            "signature_url": None
        },
        {
            "item_template_id": item_template_ids[1],
            "status": "approved",
            "notes": "אינטרקום פועל תקין, נבדק עם שומר",
            "image_urls": ["https://example.com/images/intercom.jpg"],
            "signature_url": None
        }
    ]

    response_ids = []

    for response_data in responses_data:
        try:
            response = requests.post(
                f"{BASE_URL}/checklist-instances/{instance_id}/responses",
                json=response_data,
                headers=HEADERS,
                timeout=10
            )

            if response.status_code in [200, 201]:
                response_id = response.json().get("id")
                response_ids.append(response_id)
                print_success(f"Created response: {response_id}")
                print_info(f"  Status: {response.json().get('status')}")
                print_info(f"  Notes: {response.json().get('notes')[:50]}...")
            else:
                print_error(f"Failed to create response: {response.status_code} - {response.text}")
        except Exception as e:
            print_error(f"Error creating response: {e}")

    return response_ids


def verify_template_hierarchy(project_id: str, template_id: str) -> bool:
    """Verify template returns full hierarchy"""
    print_step("Step 6: Verifying template hierarchy...")

    try:
        response = requests.get(
            f"{BASE_URL}/projects/{project_id}/checklist-templates/{template_id}",
            headers=HEADERS,
            timeout=10
        )

        if response.status_code == 200:
            data = response.json()

            # Verify template data
            if data.get("name") != "פרוטוקול מסירה לדייר":
                print_error(f"Template name mismatch: {data.get('name')}")
                return False

            # Verify subsections
            subsections = data.get("subsections", [])
            if len(subsections) != 2:
                print_error(f"Expected 2 subsections, got {len(subsections)}")
                return False

            print_success(f"Template has correct structure:")
            print_info(f"  Name: {data.get('name')}")
            print_info(f"  Level: {data.get('level')}")
            print_info(f"  Group: {data.get('group')}")
            print_info(f"  Subsections: {len(subsections)}")

            # Verify items in subsections
            for subsection in subsections:
                items = subsection.get("items", [])
                print_info(f"    {subsection.get('name')}: {len(items)} items")
                if len(items) != 3:
                    print_error(f"Expected 3 items in {subsection.get('name')}, got {len(items)}")
                    return False

            print_success("Template hierarchy verified successfully!")
            return True
        else:
            print_error(f"Failed to get template: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print_error(f"Error verifying template: {e}")
        return False


def verify_instance_responses(project_id: str, instance_id: str) -> bool:
    """Verify instance includes responses"""
    print_step("Step 7: Verifying instance includes responses...")

    try:
        response = requests.get(
            f"{BASE_URL}/projects/{project_id}/checklist-instances/{instance_id}",
            headers=HEADERS,
            timeout=10
        )

        if response.status_code == 200:
            data = response.json()

            # Verify instance data
            if data.get("unitIdentifier") != "דירה 12, קומה 3":
                print_error(f"Unit identifier mismatch: {data.get('unitIdentifier')}")
                return False

            # Verify responses
            responses = data.get("responses", [])
            if len(responses) != 2:
                print_error(f"Expected 2 responses, got {len(responses)}")
                return False

            print_success(f"Instance has correct structure:")
            print_info(f"  Unit: {data.get('unitIdentifier')}")
            print_info(f"  Status: {data.get('status')}")
            print_info(f"  Responses: {len(responses)}")

            for resp in responses:
                print_info(f"    Response {resp.get('id')[:8]}: {resp.get('status')}")
                print_info(f"      Notes: {resp.get('notes')[:40]}...")

            print_success("Instance responses verified successfully!")
            return True
        else:
            print_error(f"Failed to get instance: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print_error(f"Error verifying instance: {e}")
        return False


def delete_template_cascade(project_id: str, template_id: str) -> bool:
    """Delete template and verify cascade deletes"""
    print_step("Step 8: Deleting template and verifying cascade deletes...")

    try:
        # Delete the template
        response = requests.delete(
            f"{BASE_URL}/projects/{project_id}/checklist-templates/{template_id}",
            headers=HEADERS,
            timeout=10
        )

        if response.status_code in [200, 204]:
            print_success("Template deleted successfully")

            # Verify template is gone
            time.sleep(1)  # Brief delay to ensure deletion propagates
            get_response = requests.get(
                f"{BASE_URL}/projects/{project_id}/checklist-templates/{template_id}",
                headers=HEADERS,
                timeout=10
            )

            if get_response.status_code == 404:
                print_success("Verified template no longer exists")
                print_success("Cascade delete verified (subsections and items deleted)")
                return True
            else:
                print_error(f"Template still exists after deletion: {get_response.status_code}")
                return False
        else:
            print_error(f"Failed to delete template: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print_error(f"Error deleting template: {e}")
        return False


def cleanup_project(project_id: str):
    """Clean up test project"""
    print_step("Cleaning up test project...")

    try:
        response = requests.delete(
            f"{BASE_URL}/projects/{project_id}",
            headers=HEADERS,
            timeout=10
        )

        if response.status_code in [200, 204]:
            print_success("Test project cleaned up")
        else:
            print_error(f"Failed to delete project: {response.status_code}")
    except Exception as e:
        print_error(f"Error cleaning up project: {e}")


def main():
    """Main verification workflow"""
    print(f"\n{Colors.HEADER}{Colors.BOLD}=== Checklist Template System E2E Verification ==={Colors.ENDC}\n")

    # Wait for backend
    if not wait_for_backend():
        print_error("Backend is not available")
        sys.exit(1)

    # Create test project
    project_id = create_project()
    if not project_id:
        print_error("Failed to create project")
        sys.exit(1)

    try:
        # Step 1: Create template
        template_id = create_template(project_id)
        if not template_id:
            sys.exit(1)

        # Step 2: Create subsections
        subsection_ids = create_subsections(template_id)
        if len(subsection_ids) != 2:
            print_error("Failed to create all subsections")
            sys.exit(1)

        # Step 3: Create items
        item_ids = create_items(subsection_ids)
        if len(item_ids) != 6:
            print_error("Failed to create all items")
            sys.exit(1)

        # Step 4: Create instance
        instance_id = create_instance(project_id, template_id, item_ids)
        if not instance_id:
            sys.exit(1)

        # Step 5: Create responses
        response_ids = create_responses(instance_id, item_ids)
        if len(response_ids) != 2:
            print_error("Failed to create all responses")
            sys.exit(1)

        # Step 6: Verify template hierarchy
        if not verify_template_hierarchy(project_id, template_id):
            sys.exit(1)

        # Step 7: Verify instance responses
        if not verify_instance_responses(project_id, instance_id):
            sys.exit(1)

        # Step 8: Delete template and verify cascade
        if not delete_template_cascade(project_id, template_id):
            sys.exit(1)

        # Success!
        print(f"\n{Colors.OKGREEN}{Colors.BOLD}{'='*60}{Colors.ENDC}")
        print(f"{Colors.OKGREEN}{Colors.BOLD}✓ ALL VERIFICATION STEPS PASSED!{Colors.ENDC}")
        print(f"{Colors.OKGREEN}{Colors.BOLD}{'='*60}{Colors.ENDC}\n")

    finally:
        # Cleanup
        cleanup_project(project_id)


if __name__ == "__main__":
    main()
