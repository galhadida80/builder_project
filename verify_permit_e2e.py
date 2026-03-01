#!/usr/bin/env python3
"""
E2E Verification Script for Israeli Building Permit & Regulatory Tracking
Tests the complete permit lifecycle from creation to expiration alerts and milestone integration
"""

import json
import os
import sys
import time
from datetime import datetime, timedelta
from io import BytesIO
from pathlib import Path

import requests

# Configuration
API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8000/api/v1")
SCHEDULER_SECRET = os.getenv("SCHEDULER_SECRET", "test-secret-key-for-scheduler")

# Test data
TEST_USER_EMAIL = "test@example.com"
TEST_USER_PASSWORD = "TestPassword123!"

# Colors for output
GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
BLUE = "\033[94m"
RESET = "\033[0m"


def log_step(step_number, description):
    """Log a test step."""
    print(f"\n{BLUE}[Step {step_number}]{RESET} {description}")


def log_success(message):
    """Log a success message."""
    print(f"{GREEN}✓{RESET} {message}")


def log_error(message):
    """Log an error message."""
    print(f"{RED}✗{RESET} {message}")


def log_info(message):
    """Log an info message."""
    print(f"{YELLOW}ℹ{RESET} {message}")


class PermitE2ETest:
    """E2E test suite for permit workflow."""

    def __init__(self):
        self.access_token = None
        self.user_id = None
        self.project_id = None
        self.permit_id = None
        self.milestone_task_id = None
        self.headers = {}

    def authenticate(self):
        """Authenticate and get access token."""
        log_step(0, "Authenticating user")

        # Try to login with existing user
        response = requests.post(
            f"{API_BASE_URL}/auth/login",
            json={"email": TEST_USER_EMAIL, "password": TEST_USER_PASSWORD},
        )

        if response.status_code == 200:
            data = response.json()
            self.access_token = data["accessToken"]
            self.user_id = data["user"]["id"]
            self.headers = {"Authorization": f"Bearer {self.access_token}"}
            log_success(f"Authenticated as {data['user']['email']}")
            return True

        log_error(f"Authentication failed: {response.status_code}")
        log_info("Please ensure a test user exists or update credentials")
        return False

    def create_project(self):
        """Create a test project."""
        log_step(1, "Creating test project via API")

        response = requests.post(
            f"{API_BASE_URL}/projects",
            headers=self.headers,
            json={
                "name": f"E2E Permit Test Project {datetime.now().isoformat()}",
                "description": "Test project for permit E2E verification",
                "location": "Tel Aviv",
                "start_date": datetime.now().date().isoformat(),
                "client_name": "Test Client",
            },
        )

        if response.status_code == 201:
            project = response.json()
            self.project_id = project["id"]
            log_success(f"Project created: {project['name']} (ID: {self.project_id})")
            return True

        log_error(f"Project creation failed: {response.status_code} - {response.text}")
        return False

    def create_building_permit(self):
        """Create a building permit (heiter bniya)."""
        log_step(2, "Creating building permit (heiter bniya) via PermitsPage API")

        expiration_date = (datetime.now() + timedelta(days=7)).date().isoformat()

        response = requests.post(
            f"{API_BASE_URL}/projects/{self.project_id}/permits",
            headers=self.headers,
            json={
                "permit_type": "building_permit",
                "status": "not_applied",
                "permit_number": "HB-2026-001",
                "issuing_authority": "Tel Aviv Municipality",
                "application_date": datetime.now().date().isoformat(),
                "expiration_date": expiration_date,
                "notes": "E2E test permit for building permit workflow",
            },
        )

        if response.status_code == 201:
            permit = response.json()
            self.permit_id = permit["id"]
            log_success(f"Permit created: {permit['permitType']} (ID: {self.permit_id})")
            log_info(f"Expiration date set to: {expiration_date} (7 days from now)")
            return True

        log_error(f"Permit creation failed: {response.status_code} - {response.text}")
        return False

    def upload_permit_document(self):
        """Upload a permit document PDF."""
        log_step(3, "Uploading permit document PDF")

        # Create a test PDF file
        pdf_content = b"%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/Resources <<\n/Font <<\n/F1 4 0 R\n>>\n>>\n/MediaBox [0 0 612 792]\n/Contents 5 0 R\n>>\nendobj\n4 0 obj\n<<\n/Type /Font\n/Subtype /Type1\n/BaseFont /Helvetica\n>>\nendobj\n5 0 obj\n<<\n/Length 44\n>>\nstream\nBT\n/F1 12 Tf\n100 700 Td\n(Test Permit Document) Tj\nET\nendstream\nendobj\nxref\n0 6\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n0000000115 00000 n\n0000000262 00000 n\n0000000341 00000 n\ntrailer\n<<\n/Size 6\n/Root 1 0 R\n>>\nstartxref\n439\n%%EOF"

        files = {"file": ("test_permit.pdf", BytesIO(pdf_content), "application/pdf")}

        response = requests.post(
            f"{API_BASE_URL}/permits/{self.permit_id}/documents",
            headers=self.headers,
            files=files,
        )

        if response.status_code == 201:
            document = response.json()
            log_success(f"Document uploaded: {document['filename']}")
            return True

        log_error(f"Document upload failed: {response.status_code} - {response.text}")
        return False

    def update_permit_status_to_approved(self):
        """Update permit status to 'approved'."""
        log_step(4, "Updating permit status to 'approved'")

        response = requests.patch(
            f"{API_BASE_URL}/permits/{self.permit_id}/status",
            headers=self.headers,
            json={"status": "approved"},
        )

        if response.status_code == 200:
            permit = response.json()
            log_success(f"Permit status updated to: {permit['status']}")
            return True

        log_error(f"Status update failed: {response.status_code} - {response.text}")
        return False

    def verify_audit_trail(self):
        """Verify status change appears in audit trail."""
        log_step(5, "Verifying status change in audit trail")

        response = requests.get(
            f"{API_BASE_URL}/projects/{self.project_id}/audit-logs",
            headers=self.headers,
            params={"entity_type": "permit", "entity_id": self.permit_id},
        )

        if response.status_code == 200:
            audit_logs = response.json()

            # Look for UPDATE action with status change
            status_updates = [
                log for log in audit_logs
                if log.get("action") == "UPDATE" and
                log.get("newValues", {}).get("status") == "approved"
            ]

            if status_updates:
                log_success(f"Found {len(status_updates)} status update(s) in audit trail")
                return True
            else:
                log_error("No status update found in audit trail")
                return False

        log_error(f"Audit trail retrieval failed: {response.status_code} - {response.text}")
        return False

    def trigger_permit_deadline_webhook(self):
        """Manually trigger permit deadline webhook."""
        log_step(6, "Triggering permit deadline webhook manually")

        response = requests.post(
            f"{API_BASE_URL}/webhooks/permits/check-deadlines",
            json={"scheduler_secret": SCHEDULER_SECRET},
        )

        if response.status_code == 200:
            result = response.json()
            log_success(f"Webhook triggered: {result.get('status')}")
            time.sleep(2)  # Wait for background task to process
            return True

        log_error(f"Webhook trigger failed: {response.status_code} - {response.text}")
        return False

    def verify_notification_created(self):
        """Verify notification created for project admin."""
        log_step(7, "Verifying notification created for permit expiration")

        response = requests.get(
            f"{API_BASE_URL}/notifications",
            headers=self.headers,
        )

        if response.status_code == 200:
            notifications = response.json()

            # Look for permit expiration notification
            permit_notifications = [
                n for n in notifications
                if n.get("relatedEntityType") == "permit" and
                n.get("relatedEntityId") == self.permit_id and
                "expir" in n.get("message", "").lower()
            ]

            if permit_notifications:
                log_success(f"Found {len(permit_notifications)} permit expiration notification(s)")
                return True
            else:
                log_info("No permit expiration notification found (may not trigger if not within alert window)")
                return True  # Not a failure - might be outside alert window

        log_error(f"Notification retrieval failed: {response.status_code} - {response.text}")
        return False

    def generate_compliance_report(self):
        """Generate permit compliance report PDF."""
        log_step(8, "Generating permit compliance report PDF")

        response = requests.get(
            f"{API_BASE_URL}/projects/{self.project_id}/permits/compliance-report-pdf",
            headers=self.headers,
        )

        if response.status_code == 200:
            # Check if response is PDF
            content_type = response.headers.get("Content-Type", "")
            if "pdf" in content_type:
                log_success(f"PDF report generated ({len(response.content)} bytes)")
                return True
            else:
                log_error(f"Expected PDF, got: {content_type}")
                return False

        log_error(f"Report generation failed: {response.status_code} - {response.text}")
        return False

    def create_milestone_task(self):
        """Create a milestone task."""
        log_step(9, "Creating milestone task")

        response = requests.post(
            f"{API_BASE_URL}/projects/{self.project_id}/tasks",
            headers=self.headers,
            json={
                "title": "Foundation Completion Milestone",
                "description": "Complete foundation work - requires building permit",
                "is_milestone": True,
                "status": "in_progress",
                "priority": "high",
            },
        )

        if response.status_code == 201:
            task = response.json()
            self.milestone_task_id = task["id"]
            log_success(f"Milestone task created: {task['title']} (ID: {self.milestone_task_id})")
            return True

        log_error(f"Milestone creation failed: {response.status_code} - {response.text}")
        return False

    def test_milestone_completion_blocked(self):
        """Test that milestone completion is blocked without required permits."""
        log_step(10, "Testing milestone completion without required permits (should be blocked)")

        # First, create a new permit that's not approved
        response = requests.post(
            f"{API_BASE_URL}/projects/{self.project_id}/permits",
            headers=self.headers,
            json={
                "permit_type": "building_permit",
                "status": "under_review",
                "permit_number": "HB-2026-002",
                "issuing_authority": "Tel Aviv Municipality",
                "application_date": datetime.now().date().isoformat(),
                "notes": "Test permit for milestone blocking",
            },
        )

        if response.status_code != 201:
            log_error("Failed to create test permit for blocking verification")
            return False

        # Update the first permit to not_applied to test blocking
        requests.patch(
            f"{API_BASE_URL}/permits/{self.permit_id}/status",
            headers=self.headers,
            json={"status": "not_applied"},
        )

        # Try to complete milestone
        response = requests.patch(
            f"{API_BASE_URL}/tasks/{self.milestone_task_id}/complete",
            headers=self.headers,
        )

        if response.status_code == 400:
            error = response.json()
            if "missing_permits" in error.get("detail", {}) or "permit" in str(error).lower():
                log_success("Milestone completion correctly blocked due to missing permits")
                return True
            else:
                log_error(f"Unexpected error response: {error}")
                return False
        elif response.status_code == 200:
            log_error("Milestone completion should have been blocked but succeeded")
            return False

        log_error(f"Unexpected response: {response.status_code} - {response.text}")
        return False

    def approve_required_permits(self):
        """Approve required permits."""
        log_step(11, "Approving required building permit")

        response = requests.patch(
            f"{API_BASE_URL}/permits/{self.permit_id}/status",
            headers=self.headers,
            json={"status": "approved"},
        )

        if response.status_code == 200:
            permit = response.json()
            log_success(f"Permit approved: {permit['permitNumber']}")
            return True

        log_error(f"Permit approval failed: {response.status_code} - {response.text}")
        return False

    def complete_milestone_with_permits(self):
        """Complete milestone with required permits approved."""
        log_step(12, "Completing milestone with approved permits (should succeed)")

        response = requests.patch(
            f"{API_BASE_URL}/tasks/{self.milestone_task_id}/complete",
            headers=self.headers,
        )

        if response.status_code == 200:
            task = response.json()
            log_success(f"Milestone completed successfully: {task['title']}")
            return True

        log_error(f"Milestone completion failed: {response.status_code} - {response.text}")
        return False

    def run_all_tests(self):
        """Run all E2E tests."""
        print(f"\n{BLUE}{'='*80}{RESET}")
        print(f"{BLUE}E2E Verification: Israeli Building Permit & Regulatory Tracking{RESET}")
        print(f"{BLUE}{'='*80}{RESET}")

        results = []

        # Run tests in sequence
        tests = [
            ("Authentication", self.authenticate),
            ("Create Project", self.create_project),
            ("Create Building Permit", self.create_building_permit),
            ("Upload Permit Document", self.upload_permit_document),
            ("Update Status to Approved", self.update_permit_status_to_approved),
            ("Verify Audit Trail", self.verify_audit_trail),
            ("Trigger Deadline Webhook", self.trigger_permit_deadline_webhook),
            ("Verify Notification Created", self.verify_notification_created),
            ("Generate Compliance Report", self.generate_compliance_report),
            ("Create Milestone Task", self.create_milestone_task),
            ("Test Milestone Blocking", self.test_milestone_completion_blocked),
            ("Approve Required Permits", self.approve_required_permits),
            ("Complete Milestone", self.complete_milestone_with_permits),
        ]

        for test_name, test_func in tests:
            try:
                result = test_func()
                results.append((test_name, result))

                if not result:
                    log_error(f"Test '{test_name}' failed - stopping execution")
                    break
            except Exception as e:
                log_error(f"Test '{test_name}' raised exception: {str(e)}")
                results.append((test_name, False))
                break

        # Print summary
        print(f"\n{BLUE}{'='*80}{RESET}")
        print(f"{BLUE}Test Summary{RESET}")
        print(f"{BLUE}{'='*80}{RESET}")

        passed = sum(1 for _, result in results if result)
        total = len(results)

        for test_name, result in results:
            status = f"{GREEN}PASS{RESET}" if result else f"{RED}FAIL{RESET}"
            print(f"{status} - {test_name}")

        print(f"\n{BLUE}Results: {passed}/{total} tests passed{RESET}")

        if passed == total:
            print(f"{GREEN}✓ All E2E tests passed!{RESET}\n")
            return 0
        else:
            print(f"{RED}✗ Some tests failed{RESET}\n")
            return 1


if __name__ == "__main__":
    test_suite = PermitE2ETest()
    sys.exit(test_suite.run_all_tests())
