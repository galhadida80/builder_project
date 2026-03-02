#!/usr/bin/env python3
"""
BuilderOps Massive E2E Test Script
Creates 1200+ items across all entity types, tests status transitions,
RFI emails, meetings, approvals, checklists, and more.
"""
import json
import time
import random
import sys
from datetime import datetime, timedelta
from urllib.request import Request, urlopen
from urllib.error import HTTPError

API = "https://builderops-backend-295612488497.me-west1.run.app/api/v1"
TOKEN = None
PID = "27074dd3-9ebe-47e9-b075-5dd0544590e8"
USER_ID = "6c35bda5-03f2-46fb-ae27-12d30728615c"
BUGS = []
STATS = {"created": 0, "errors": 0, "status_changes": 0, "tests_passed": 0}


def api(method, path, data=None, expect_error=False):
    url = f"{API}{path}"
    body = json.dumps(data).encode() if data else None
    headers = {"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"}
    req = Request(url, data=body, headers=headers, method=method)
    try:
        resp = urlopen(req, timeout=60)
        result = json.loads(resp.read().decode())
        return result
    except HTTPError as e:
        err_body = e.read().decode() if e.fp else str(e)
        if not expect_error:
            print(f"  ERROR {e.code}: {method} {path} -> {err_body[:200]}")
            STATS["errors"] += 1
        return None
    except Exception as e:
        if not expect_error:
            print(f"  EXCEPTION: {method} {path} -> {str(e)[:200]}")
            STATS["errors"] += 1
        return None


def log_bug(category, description, details=""):
    BUGS.append({"category": category, "description": description, "details": details, "time": datetime.now().isoformat()})
    print(f"  BUG FOUND: [{category}] {description}")


def login():
    global TOKEN
    data = {"email": "claude.test@builderops.dev", "password": "ClaudeTest2026!"}
    result = api("POST", "/auth/login", data)
    if result and result.get("accessToken"):
        TOKEN = result["accessToken"]
        print(f"Logged in as {result['user']['fullName']}")
        return True
    print("LOGIN FAILED")
    return False


# ── EQUIPMENT ──
def test_equipment():
    print("\n=== EQUIPMENT TESTS ===")
    templates = api("GET", "/equipment-templates") or []
    print(f"Found {len(templates)} equipment templates")
    created_ids = []

    for i, tmpl in enumerate(templates):
        eq_data = {
            "equipment_type": tmpl.get("category", "general"),
            "name": f"Test-{tmpl['name'][:30]}-{i+1}",
            "manufacturer": f"Manufacturer-{i+1}",
            "model_number": f"MDL-{i+1:04d}",
            "serial_number": f"SN-{random.randint(10000, 99999)}",
            "location": random.choice(["Floor 1", "Floor 2", "Floor 3", "Basement", "Roof"]),
            "notes": f"Auto-test equipment from template: {tmpl['name']}",
            "template_id": tmpl["id"],
        }
        result = api("POST", f"/projects/{PID}/equipment", eq_data)
        if result:
            created_ids.append(result["id"])
            STATS["created"] += 1
            if (i + 1) % 10 == 0:
                print(f"  Created {i+1}/{len(templates)} equipment items")
        else:
            log_bug("equipment", f"Failed to create equipment from template: {tmpl['name']}")

    print(f"  Total equipment created: {len(created_ids)}")

    # Test submit + approval workflow (requires consultant/inspector contacts)
    contacts = api("GET", f"/projects/{PID}/contacts") or []
    consultant_contacts = [c for c in contacts if c.get("contactType") == "consultant"]
    inspector_contacts = [c for c in contacts if c.get("contactType") == "inspector"]
    if not consultant_contacts:
        # Create a consultant contact for approvals
        c = api("POST", f"/projects/{PID}/contacts", {
            "contact_name": "Test Consultant", "contact_type": "consultant",
            "email": "consultant@test.local", "company_name": "Consulting Corp",
            "role_description": "Structural Consultant",
        })
        if c:
            consultant_contacts = [c]
    if not inspector_contacts:
        c = api("POST", f"/projects/{PID}/contacts", {
            "contact_name": "Test Inspector", "contact_type": "inspector",
            "email": "inspector@test.local", "company_name": "Inspection Corp",
            "role_description": "Building Inspector",
        })
        if c:
            inspector_contacts = [c]

    consul_id = consultant_contacts[0]["id"] if consultant_contacts else None
    inspec_id = inspector_contacts[0]["id"] if inspector_contacts else None

    print(f"  Testing submit+approve workflow on {min(10, len(created_ids))} items...")
    for eq_id in created_ids[:10]:
        submit_body = {}
        if consul_id:
            submit_body["consultant_contact_id"] = consul_id
        if inspec_id:
            submit_body["inspector_contact_id"] = inspec_id
        if not submit_body:
            log_bug("equipment", "No contacts available for submit workflow")
            break

        result = api("POST", f"/projects/{PID}/equipment/{eq_id}/submit", submit_body)
        if result:
            STATS["status_changes"] += 1
            if result.get("status") != "submitted":
                log_bug("equipment", f"Expected 'submitted' after submit, got: {result.get('status')}")
            else:
                print(f"    Equipment {eq_id[:8]}... submitted OK")
        else:
            log_bug("equipment", f"Failed to submit equipment {eq_id[:8]}...")

    # Try to get approvals and approve them
    approvals = api("GET", f"/projects/{PID}/approvals") or []
    eq_approvals = [a for a in approvals if a.get("entityType") == "equipment"]
    print(f"  Found {len(eq_approvals)} equipment approvals to process")
    for appr in eq_approvals[:5]:
        appr_id = appr["id"]
        # Try quick approve
        result = api("POST", f"/approvals/{appr_id}/approve", {"comments": "Auto-approved by test"})
        if result:
            STATS["status_changes"] += 1
            print(f"    Approved: {appr_id[:8]}...")
        else:
            log_bug("equipment", f"Failed to approve equipment approval {appr_id[:8]}")

    # Try to reject a couple
    for appr in eq_approvals[5:7]:
        appr_id = appr["id"]
        result = api("POST", f"/approvals/{appr_id}/reject", {"comments": "Auto-rejected by test"})
        if result:
            STATS["status_changes"] += 1

    print(f"  Status transitions tested: {STATS['status_changes']}")
    return created_ids


# ── MATERIALS ──
def test_materials():
    print("\n=== MATERIALS TESTS ===")
    templates = api("GET", "/material-templates") or []
    print(f"Found {len(templates)} material templates")
    created_ids = []

    for i, tmpl in enumerate(templates):
        for j in range(3):  # 3 materials per template
            mat_data = {
                "name": f"Test-{tmpl['name'][:25]}-{i+1}-{j+1}",
                "material_type": tmpl.get("category", "general"),
                "quantity": random.randint(10, 500),
                "unit": random.choice(["kg", "m", "m2", "m3", "units", "tons"]),
                "manufacturer": f"Supplier-{random.randint(1, 20)}",
                "notes": f"From template: {tmpl['name']}",
                "template_id": tmpl["id"],
            }
            result = api("POST", f"/projects/{PID}/materials", mat_data)
            if result:
                created_ids.append(result["id"])
                STATS["created"] += 1

    print(f"  Total materials created: {len(created_ids)}")

    # Test submit + approval workflow
    contacts = api("GET", f"/projects/{PID}/contacts") or []
    consultant_contacts = [c for c in contacts if c.get("contactType") == "consultant"]
    inspector_contacts = [c for c in contacts if c.get("contactType") == "inspector"]
    consul_id = consultant_contacts[0]["id"] if consultant_contacts else None
    inspec_id = inspector_contacts[0]["id"] if inspector_contacts else None

    print(f"  Testing material submit+approve on {min(10, len(created_ids))} items...")
    for mat_id in created_ids[:10]:
        submit_body = {}
        if consul_id:
            submit_body["consultant_contact_id"] = consul_id
        if inspec_id:
            submit_body["inspector_contact_id"] = inspec_id
        if not submit_body:
            break
        result = api("POST", f"/projects/{PID}/materials/{mat_id}/submit", submit_body)
        if result:
            STATS["status_changes"] += 1
        else:
            log_bug("materials", f"Failed to submit material {mat_id[:8]}...")

    # Approve material approvals
    approvals = api("GET", f"/projects/{PID}/approvals") or []
    mat_approvals = [a for a in approvals if a.get("entityType") == "material"]
    for appr in mat_approvals[:5]:
        result = api("POST", f"/approvals/{appr['id']}/approve", {"comments": "Auto-approved"})
        if result:
            STATS["status_changes"] += 1

    return created_ids


# ── CONTACTS ──
def test_contacts():
    print("\n=== CONTACTS TESTS ===")
    created_ids = []
    contact_types = ["contractor", "consultant", "supplier", "client", "inspector", "architect", "engineer"]

    for i in range(60):
        contact_data = {
            "contact_name": f"Test Contact {i+1}",
            "contact_type": random.choice(contact_types),
            "email": f"testcontact{i+1}@example.com",
            "phone": f"05{random.randint(10000000, 99999999)}",
            "company_name": f"Company {random.randint(1, 30)}",
            "role_description": f"Role {random.choice(['Manager', 'Engineer', 'Foreman', 'Inspector', 'Director'])}",
        }
        result = api("POST", f"/projects/{PID}/contacts", contact_data)
        if result:
            created_ids.append(result["id"])
            STATS["created"] += 1

    # Also add the real email contacts
    for email, name in [("kodkod800@gmail.com", "Kodkod Test"), ("galhadida80@gmail.com", "Gal Hadida")]:
        contact_data = {
            "contact_name": name,
            "contact_type": "client",
            "email": email,
            "company_name": "BuilderOps Test",
            "role_description": "Tester",
        }
        result = api("POST", f"/projects/{PID}/contacts", contact_data)
        if result:
            created_ids.append(result["id"])
            STATS["created"] += 1

    print(f"  Total contacts created: {len(created_ids)}")
    return created_ids


# ── AREAS ──
def test_areas():
    print("\n=== AREAS TESTS ===")
    created_ids = []

    for floor in range(1, 11):
        for unit in range(1, 9):
            area_data = {
                "name": f"Unit {floor}{unit:02d}",
                "area_code": f"F{floor}-U{unit:02d}",
                "floor_number": floor,
                "total_units": 1,
                "current_progress": random.randint(0, 100),
            }
            result = api("POST", f"/projects/{PID}/areas", area_data)
            if result:
                created_ids.append(result["id"])
                STATS["created"] += 1

    print(f"  Total areas created: {len(created_ids)}")
    return created_ids


# ── TASKS ──
def test_tasks():
    print("\n=== TASKS TESTS ===")
    created_ids = []
    priorities = ["low", "medium", "high", "urgent"]
    task_titles = [
        "Install electrical wiring", "Pour concrete foundation", "Mount drywall panels",
        "Inspect plumbing connections", "Paint interior walls", "Install HVAC ducts",
        "Lay floor tiles", "Install windows", "Connect fire alarm", "Test water supply",
        "Setup security cameras", "Install elevator shaft", "Build partition walls",
        "Apply waterproofing", "Install ceiling lights", "Check structural beams",
        "Mount kitchen cabinets", "Install bathroom fixtures", "Test emergency exits",
        "Setup intercom system",
    ]

    for i in range(100):
        start = datetime.now() + timedelta(days=random.randint(0, 30))
        due = start + timedelta(days=random.randint(3, 21))
        task_data = {
            "title": f"{random.choice(task_titles)} - Task {i+1}",
            "description": f"Automated test task #{i+1}. Priority: {random.choice(priorities)}",
            "status": random.choice(["not_started", "in_progress", "completed"]),
            "priority": random.choice(priorities),
            "start_date": start.strftime("%Y-%m-%d"),
            "due_date": due.strftime("%Y-%m-%d"),
            "estimated_hours": random.randint(2, 40),
        }
        result = api("POST", f"/projects/{PID}/tasks", task_data)
        if result:
            created_ids.append(result["id"])
            STATS["created"] += 1

    print(f"  Total tasks created: {len(created_ids)}")

    # Test status transitions
    for task_id in created_ids[:20]:
        for status in ["not_started", "in_progress", "completed", "on_hold", "not_started"]:
            result = api("PUT", f"/projects/{PID}/tasks/{task_id}", {"status": status})
            if result:
                STATS["status_changes"] += 1

    # Test dependencies (depends_on_id is a query param)
    for i in range(0, min(len(created_ids) - 1, 20), 2):
        result = api("POST", f"/projects/{PID}/tasks/{created_ids[i+1]}/dependencies?depends_on_id={created_ids[i]}")
        if result:
            STATS["created"] += 1
        else:
            if i == 0:
                log_bug("tasks", "Failed to create task dependency")

    return created_ids


# ── MEETINGS ──
def test_meetings():
    print("\n=== MEETINGS TESTS ===")
    created_ids = []
    meeting_types = ["kickoff", "progress", "review", "safety", "handover", "milestone"]

    for i in range(50):
        scheduled = datetime.now() + timedelta(days=random.randint(1, 60), hours=random.randint(8, 17))
        meeting_data = {
            "title": f"Test Meeting {i+1} - {random.choice(meeting_types).title()}",
            "description": f"Automated test meeting #{i+1}",
            "scheduled_date": scheduled.isoformat(),
            "location": random.choice(["Site Office", "Conference Room A", "Online - Zoom", "Floor 3 Meeting Room"]),
            "meeting_type": random.choice(meeting_types),
        }
        result = api("POST", f"/projects/{PID}/meetings", meeting_data)
        if result:
            created_ids.append(result["id"])
            STATS["created"] += 1

    print(f"  Total meetings created: {len(created_ids)}")

    # Test status transitions
    for meet_id in created_ids[:10]:
        for status in ["scheduled", "invitations_sent", "completed", "cancelled"]:
            result = api("PUT", f"/projects/{PID}/meetings/{meet_id}", {"status": status})
            if result:
                STATS["status_changes"] += 1
            else:
                log_bug("meetings", f"Failed to update meeting status to {status}")

    return created_ids


# ── RFIs ──
def test_rfis():
    print("\n=== RFI TESTS ===")
    created_ids = []
    categories = ["design", "structural", "mep", "architectural", "specifications", "schedule", "cost", "other"]

    # Send real RFIs to test emails
    real_rfis = [
        {"to_email": "kodkod800@gmail.com", "to_name": "Kodkod Test", "subject": "Structural Load Capacity Clarification"},
        {"to_email": "galhadida80@gmail.com", "to_name": "Gal Hadida", "subject": "MEP Coordination - Floor 3 HVAC Routing"},
        {"to_email": "kodkod800@gmail.com", "to_name": "Kodkod Test", "subject": "Architectural Detail - Window Specifications"},
        {"to_email": "galhadida80@gmail.com", "to_name": "Gal Hadida", "subject": "Schedule Impact - Elevator Installation Delay"},
    ]

    for rfi_data in real_rfis:
        full_data = {
            "subject": rfi_data["subject"],
            "question": f"This is an automated test RFI. Please confirm receipt.\n\nTest timestamp: {datetime.now().isoformat()}",
            "to_email": rfi_data["to_email"],
            "to_name": rfi_data["to_name"],
            "category": random.choice(categories),
            "priority": random.choice(["low", "medium", "high", "urgent"]),
            "due_date": (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d"),
        }
        result = api("POST", f"/projects/{PID}/rfis", full_data)
        if result:
            created_ids.append(result["id"])
            STATS["created"] += 1
            print(f"  RFI created -> {rfi_data['to_email']}: {rfi_data['subject']}")

            # Try to send the RFI
            send_result = api("POST", f"/rfis/{result['id']}/send")
            if send_result:
                print(f"  RFI sent successfully to {rfi_data['to_email']}")
            else:
                log_bug("rfi", f"Failed to send RFI to {rfi_data['to_email']}")

    # Create more RFIs (not sent)
    for i in range(46):
        rfi_data = {
            "subject": f"Test RFI {i+5} - {random.choice(categories).title()} Question",
            "question": f"Automated test RFI question #{i+5}. Need clarification on specifications.",
            "to_email": f"testrfi{i+5}@example.com",
            "to_name": f"Test Recipient {i+5}",
            "category": random.choice(categories),
            "priority": random.choice(["low", "medium", "high", "urgent"]),
            "due_date": (datetime.now() + timedelta(days=random.randint(3, 30))).strftime("%Y-%m-%d"),
        }
        result = api("POST", f"/projects/{PID}/rfis", rfi_data)
        if result:
            created_ids.append(result["id"])
            STATS["created"] += 1

    print(f"  Total RFIs created: {len(created_ids)}")

    # Status transitions (use dedicated status endpoint)
    for rfi_id in created_ids[:10]:
        for status in ["open", "answered", "closed", "open"]:
            result = api("PATCH", f"/rfis/{rfi_id}/status", {"status": status})
            if result:
                STATS["status_changes"] += 1
            else:
                log_bug("rfi", f"Failed to update RFI status to {status}")

    return created_ids


# ── INSPECTIONS ──
def test_inspections():
    print("\n=== INSPECTIONS TESTS ===")
    created_ids = []

    # Get INSPECTION consultant types (different from regular consultant-types!)
    consultant_types = api("GET", "/inspection-consultant-types") or []
    if not consultant_types:
        log_bug("inspections", "No consultant types found")
        return []

    # Spread inspections across consultant types and different dates to avoid duplicates
    for i in range(50):
        ct = consultant_types[i % len(consultant_types)]
        day_offset = (i // len(consultant_types)) + 1  # Ensure unique date per consultant_type
        scheduled = datetime.now() + timedelta(days=day_offset, hours=random.randint(8, 17))
        insp_data = {
            "consultant_type_id": ct["id"],
            "scheduled_date": scheduled.isoformat(),
            "notes": f"Automated test inspection #{i+1} - {ct.get('name', 'unknown')}",
        }
        result = api("POST", f"/projects/{PID}/inspections", insp_data)
        if result:
            created_ids.append(result["id"])
            STATS["created"] += 1
        else:
            if i < 5:  # Only log first few to avoid spam
                log_bug("inspections", f"Failed to create inspection #{i+1} for type {ct.get('name', ct['id'][:8])}")

    print(f"  Total inspections created: {len(created_ids)}")

    # Status transitions
    for insp_id in created_ids[:10]:
        for status in ["pending", "in_progress", "completed"]:
            result = api("PUT", f"/projects/{PID}/inspections/{insp_id}", {"status": status})
            if result:
                STATS["status_changes"] += 1

    return created_ids


# ── DEFECTS ──
def test_defects():
    print("\n=== DEFECTS TESTS ===")
    created_ids = []
    categories = ["concrete_structure", "structural", "wet_room_waterproofing", "plaster", "roof",
                   "roof_waterproofing", "painting", "plumbing", "flooring", "tiling",
                   "fire_passage_sealing", "fire_safety", "building_general", "moisture",
                   "waterproofing", "insulation", "hvac", "electrical", "lighting",
                   "windows_doors", "drainage", "elevator", "other"]
    severities = ["low", "medium", "high", "critical"]

    for i in range(80):
        defect_data = {
            "category": random.choice(categories),
            "description": f"Test defect #{i+1}: {random.choice(['Crack in wall', 'Water leak', 'Exposed wiring', 'Missing tile', 'Damaged paint', 'Broken fixture'])}",
            "severity": random.choice(severities),
            "status": "open",
            "due_date": (datetime.now() + timedelta(days=random.randint(3, 30))).strftime("%Y-%m-%d"),
        }
        result = api("POST", f"/projects/{PID}/defects", defect_data)
        if result:
            created_ids.append(result["id"])
            STATS["created"] += 1

    print(f"  Total defects created: {len(created_ids)}")

    # Status transitions
    for def_id in created_ids[:15]:
        for status in ["open", "in_progress", "resolved", "closed"]:
            result = api("PUT", f"/projects/{PID}/defects/{def_id}", {"status": status})
            if result:
                STATS["status_changes"] += 1

    return created_ids


# ── BUDGET ──
def test_budget():
    print("\n=== BUDGET TESTS ===")
    created_ids = []
    categories = ["labor", "materials", "equipment", "subcontractor", "overhead", "permits", "other"]

    for i in range(30):
        budget_data = {
            "name": f"Budget Item {i+1} - {random.choice(categories).title()}",
            "category": random.choice(categories),
            "description": f"Test budget line item #{i+1}",
            "budgeted_amount": round(random.uniform(5000, 500000), 2),
        }
        result = api("POST", f"/projects/{PID}/budget", budget_data)
        if result:
            created_ids.append(result["id"])
            STATS["created"] += 1

            # Add cost entries
            for j in range(random.randint(1, 5)):
                cost_data = {
                    "description": f"Cost entry {j+1} for {budget_data['name']}",
                    "amount": round(random.uniform(100, 50000), 2),
                    "entry_date": (datetime.now() - timedelta(days=random.randint(0, 60))).strftime("%Y-%m-%d"),
                    "vendor": f"Vendor {random.randint(1, 20)}",
                    "reference_number": f"INV-{random.randint(1000, 9999)}",
                }
                cost_result = api("POST", f"/projects/{PID}/budget/{result['id']}/costs", cost_data)
                if cost_result:
                    STATS["created"] += 1

    print(f"  Total budget items created: {len(created_ids)}")
    return created_ids


# ── DISCUSSIONS ──
def test_discussions():
    print("\n=== DISCUSSIONS TESTS ===")
    created_ids = []
    entity_types = ["equipment", "material", "rfi", "inspection", "defect", "meeting", "task", "area"]

    for i in range(50):
        disc_data = {
            "entity_type": random.choice(entity_types),
            "entity_id": PID,  # Use project ID as entity
            "content": f"Test discussion #{i+1}: This is an automated test comment about {random.choice(entity_types)}.",
        }
        result = api("POST", f"/projects/{PID}/discussions", disc_data)
        if result:
            created_ids.append(result["id"])
            STATS["created"] += 1

            # Add replies
            for j in range(random.randint(0, 3)):
                reply_data = {
                    "entity_type": disc_data["entity_type"],
                    "entity_id": disc_data["entity_id"],
                    "content": f"Reply {j+1} to discussion #{i+1}",
                    "parent_id": result["id"],
                }
                reply_result = api("POST", f"/projects/{PID}/discussions", reply_data)
                if reply_result:
                    STATS["created"] += 1

    print(f"  Total discussions created: {len(created_ids)}")
    return created_ids


# ── CHECKLISTS ──
def test_checklists():
    print("\n=== CHECKLISTS TESTS ===")

    # Get checklist templates
    templates = api("GET", f"/projects/{PID}/checklist-templates") or []
    print(f"  Found {len(templates)} checklist templates")

    created_ids = []
    for i, tmpl in enumerate(templates[:10]):
        inst_data = {
            "template_id": tmpl["id"],
            "unit_identifier": f"Unit-{i+1}",
        }
        result = api("POST", f"/projects/{PID}/checklist-instances", inst_data)
        if result:
            created_ids.append(result["id"])
            STATS["created"] += 1

    print(f"  Total checklist instances created: {len(created_ids)}")
    return created_ids


# ── CUSTOM KPIs ──
def test_kpis():
    print("\n=== KPI TESTS ===")
    created_ids = []
    kpi_names = [
        "Safety Score", "Schedule Adherence", "Budget Variance", "Quality Index",
        "Defect Resolution Rate", "Inspection Pass Rate", "Labor Productivity",
        "Material Waste Ratio", "Equipment Utilization", "Client Satisfaction",
    ]

    kpi_types = ["count", "ratio", "average", "sum"]
    entity_types = ["equipment", "material", "inspection", "rfi", "defect", "task", "budget", "area"]
    for i, name in enumerate(kpi_names):
        kpi_data = {
            "name": name,
            "kpi_type": kpi_types[i % len(kpi_types)],
            "entity_type": entity_types[i % len(entity_types)],
            "calculation": random.choice(["count", "percentage", "sum"]),
            "unit": random.choice(["%", "days", "ratio", "score"]),
            "target_value": round(random.uniform(70, 100), 1),
            "threshold_value": round(random.uniform(50, 69), 1),
            "is_active": True,
            "project_id": PID,
        }
        result = api("POST", "/analytics/kpi-definitions", kpi_data)
        if result:
            created_ids.append(result["id"])
            STATS["created"] += 1

    print(f"  Total KPIs created: {len(created_ids)}")
    return created_ids


# ── CHANGE ORDERS ──
def test_change_orders(budget_ids):
    print("\n=== CHANGE ORDERS TESTS ===")
    created_ids = []

    for i in range(20):
        co_data = {
            "title": f"Change Order {i+1} - {random.choice(['Scope Change', 'Design Change', 'Site Condition', 'Client Request'])}",
            "description": f"Test change order #{i+1}",
            "amount": round(random.uniform(-50000, 100000), 2),
            "status": "pending",
            "budget_item_id": random.choice(budget_ids) if budget_ids else None,
        }
        result = api("POST", f"/projects/{PID}/change-orders", co_data)
        if result:
            created_ids.append(result["id"])
            STATS["created"] += 1

            # Test approve/reject
            if i % 3 == 0:
                api("PUT", f"/projects/{PID}/change-orders/{result['id']}", {"status": "approved"})
                STATS["status_changes"] += 1
            elif i % 3 == 1:
                api("PUT", f"/projects/{PID}/change-orders/{result['id']}", {"status": "rejected"})
                STATS["status_changes"] += 1

    print(f"  Total change orders created: {len(created_ids)}")
    return created_ids


# ── REPORTS ──
def test_reports():
    print("\n=== REPORTS TESTS ===")
    report_types = ["inspection-summary", "approval-status", "rfi-aging"]
    date_from = (datetime.now() - timedelta(days=90)).strftime("%Y-%m-%d")
    date_to = datetime.now().strftime("%Y-%m-%d")

    for rt in report_types:
        if rt == "rfi-aging":
            result = api("GET", f"/projects/{PID}/reports/{rt}")
        else:
            result = api("GET", f"/projects/{PID}/reports/{rt}?date_from={date_from}&date_to={date_to}")
        if result:
            STATS["tests_passed"] += 1
            print(f"  Report '{rt}': OK")
        else:
            log_bug("reports", f"Failed to generate report: {rt}")

    # Test CSV export
    print("  Testing CSV exports...")
    for rt in report_types:
        try:
            url = f"{API}/projects/{PID}/reports/export?report_type={rt}&date_from={date_from}&date_to={date_to}"
            req = Request(url, headers={"Authorization": f"Bearer {TOKEN}"})
            resp = urlopen(req, timeout=60)
            if resp.status == 200:
                STATS["tests_passed"] += 1
                print(f"  CSV export '{rt}': OK ({len(resp.read())} bytes)")
        except Exception as e:
            log_bug("reports", f"CSV export failed for {rt}: {str(e)[:100]}")


# ── DASHBOARD & ANALYTICS ──
def test_analytics():
    print("\n=== ANALYTICS TESTS ===")

    # Dashboard stats
    result = api("GET", f"/analytics/projects/{PID}/dashboard-stats")
    if result:
        STATS["tests_passed"] += 1
        print(f"  Dashboard stats: OK")
        for key in ["equipmentDistribution", "materialDistribution", "rfiDistribution", "overallProgress"]:
            if key not in result:
                log_bug("analytics", f"Missing field in dashboard stats: {key}")
    else:
        log_bug("analytics", "Dashboard stats endpoint failed")

    # KPI values
    date_from = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
    date_to = datetime.now().strftime("%Y-%m-%d")
    result = api("GET", f"/analytics/kpi-values?project_id={PID}&date_from={date_from}&date_to={date_to}")
    if result is not None:
        STATS["tests_passed"] += 1
        print(f"  KPI values: OK ({len(result) if isinstance(result, list) else 'N/A'} values)")


# ── MAIN ──
def main():
    print("=" * 60)
    print("BuilderOps Massive E2E Test")
    print(f"Started at: {datetime.now().isoformat()}")
    print("=" * 60)

    if not login():
        sys.exit(1)

    # Run all tests
    test_contacts()
    equipment_ids = test_equipment()
    material_ids = test_materials()
    test_areas()
    test_tasks()
    test_meetings()
    test_rfis()
    test_inspections()
    test_defects()
    budget_ids = test_budget()
    test_change_orders(budget_ids)
    test_discussions()
    test_checklists()
    test_kpis()
    test_reports()
    test_analytics()

    # Final summary
    print("\n" + "=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)
    print(f"Items created:      {STATS['created']}")
    print(f"Status changes:     {STATS['status_changes']}")
    print(f"Tests passed:       {STATS['tests_passed']}")
    print(f"Errors:             {STATS['errors']}")
    print(f"Bugs found:         {len(BUGS)}")
    print(f"Finished at:        {datetime.now().isoformat()}")

    if BUGS:
        print("\n--- BUGS FOUND ---")
        for i, bug in enumerate(BUGS, 1):
            print(f"{i}. [{bug['category']}] {bug['description']}")
            if bug['details']:
                print(f"   Details: {bug['details']}")

    # Write bugs to file
    with open("/Users/galhadida/projects/builder_project/builder_program/docs/E2E_BUGS.md", "w") as f:
        f.write(f"# E2E Test Bugs - {datetime.now().strftime('%Y-%m-%d %H:%M')}\n\n")
        f.write(f"## Summary\n")
        f.write(f"- Items created: {STATS['created']}\n")
        f.write(f"- Status changes: {STATS['status_changes']}\n")
        f.write(f"- Tests passed: {STATS['tests_passed']}\n")
        f.write(f"- Errors: {STATS['errors']}\n")
        f.write(f"- Bugs found: {len(BUGS)}\n\n")
        if BUGS:
            f.write("## Bugs\n\n")
            for i, bug in enumerate(BUGS, 1):
                f.write(f"### Bug {i}: [{bug['category']}] {bug['description']}\n")
                if bug['details']:
                    f.write(f"- Details: {bug['details']}\n")
                f.write(f"- Time: {bug['time']}\n\n")
        else:
            f.write("## No bugs found!\n")

    return len(BUGS)


if __name__ == "__main__":
    bug_count = main()
    sys.exit(1 if bug_count > 0 else 0)
