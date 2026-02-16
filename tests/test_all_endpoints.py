import json
import os
import urllib.request
import urllib.error
import sys
import time
from datetime import datetime

BASE = "https://builderops-backend-a6cumfv4ga-zf.a.run.app/api/v1"

with open(os.path.join(os.path.dirname(__file__), "test_users.json")) as f:
    ALL_USERS = json.load(f)

ADMIN = ALL_USERS[0]
PROJECT_ID = "27074dd3-9ebe-47e9-b075-5dd0544590e8"

errors = []
successes = []


def api_call(method, path, token, data=None, expect_status=None):
    url = f"{BASE}{path}"
    body = json.dumps(data).encode() if data else None
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"

    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        resp = urllib.request.urlopen(req)
        resp_data = json.loads(resp.read()) if resp.read else None
        return {"status": resp.status, "data": resp_data, "ok": True}
    except urllib.error.HTTPError as e:
        body_text = e.read().decode()
        try:
            err_data = json.loads(body_text)
        except Exception:
            err_data = body_text
        return {"status": e.code, "data": err_data, "ok": False}
    except Exception as e:
        return {"status": 0, "data": str(e), "ok": False}


def test(name, method, path, token, data=None, expect_ok=True):
    result = api_call(method, path, token, data)
    ok = result["ok"] if expect_ok else not result["ok"]
    entry = {
        "test": name,
        "method": method,
        "path": path,
        "status": result["status"],
        "ok": result["ok"],
        "passed": ok,
    }
    if not ok or not result["ok"]:
        entry["response"] = str(result["data"])[:500]

    if ok:
        successes.append(entry)
    else:
        errors.append(entry)

    status_icon = "PASS" if ok else "FAIL"
    print(f"  [{status_icon}] {name} -> {result['status']}")
    return result


def run_tests_for_user(user_idx):
    user = ALL_USERS[user_idx]
    token = user["token"]
    email = user["email"]
    is_admin = user_idx == 0

    print(f"\n{'='*60}")
    print(f"Testing as: {email} (admin={is_admin})")
    print(f"{'='*60}")

    # AUTH
    print("\n--- Auth ---")
    test("GET /auth/me", "GET", "/auth/me", token)
    test("GET /auth/me (no token)", "GET", "/auth/me", None, expect_ok=False)
    test("GET /auth/me (bad token)", "GET", "/auth/me", "invalid_token_123", expect_ok=False)
    test("POST /auth/login (wrong pass)", "POST", "/auth/login", None,
         data={"email": email, "password": "WrongPassword123"}, expect_ok=False)

    # PROJECTS
    print("\n--- Projects ---")
    test("GET /projects", "GET", "/projects", token)

    if is_admin:
        proj = test("GET project detail", "GET", f"/projects/{PROJECT_ID}", token)
    else:
        test("GET project (no access)", "GET", f"/projects/{PROJECT_ID}", token, expect_ok=False)

    test("GET project (bad id)", "GET", "/projects/00000000-0000-0000-0000-000000000000", token, expect_ok=False)

    if not is_admin:
        r = test("POST create project", "POST", "/projects", token,
                 data={"name": f"Test Proj {user_idx}", "code": f"TP{user_idx:02d}", "address": "Test St"})
        if r["ok"] and r.get("data"):
            new_proj_id = r["data"].get("id", "")
            if new_proj_id:
                test("GET own project", "GET", f"/projects/{new_proj_id}", token)
                test("PUT update project", "PUT", f"/projects/{new_proj_id}", token,
                     data={"name": f"Updated Proj {user_idx}", "code": f"TP{user_idx:02d}"})
        return

    # Below tests run only for admin user with project access
    # EQUIPMENT
    print("\n--- Equipment ---")
    test("GET equipment", "GET", f"/projects/{PROJECT_ID}/equipment", token)
    r = test("POST equipment", "POST", f"/projects/{PROJECT_ID}/equipment", token,
             data={"name": f"Test Equip {user_idx}", "equipment_type": "HVAC", "manufacturer": "TestCo", "model_number": "M1"})
    equip_id = r["data"].get("id") if r["ok"] and r.get("data") else None
    if equip_id:
        test("GET equipment detail", "GET", f"/projects/{PROJECT_ID}/equipment/{equip_id}", token)
        test("PUT equipment", "PUT", f"/projects/{PROJECT_ID}/equipment/{equip_id}", token,
             data={"name": f"Updated Equip {user_idx}"})
        test("DELETE equipment", "DELETE", f"/projects/{PROJECT_ID}/equipment/{equip_id}", token)

    test("POST equipment (no name)", "POST", f"/projects/{PROJECT_ID}/equipment", token,
         data={"equipment_type": "HVAC"}, expect_ok=False)

    # MATERIALS
    print("\n--- Materials ---")
    test("GET materials", "GET", f"/projects/{PROJECT_ID}/materials", token)
    r = test("POST material", "POST", f"/projects/{PROJECT_ID}/materials", token,
             data={"name": f"Test Material {user_idx}", "material_type": "concrete", "manufacturer": "TestCo"})
    mat_id = r["data"].get("id") if r["ok"] and r.get("data") else None
    if mat_id:
        test("PUT material", "PUT", f"/projects/{PROJECT_ID}/materials/{mat_id}", token,
             data={"name": f"Updated Material {user_idx}"})
        test("DELETE material", "DELETE", f"/projects/{PROJECT_ID}/materials/{mat_id}", token)

    # AREAS
    print("\n--- Areas ---")
    test("GET areas", "GET", f"/projects/{PROJECT_ID}/areas", token)
    r = test("POST area", "POST", f"/projects/{PROJECT_ID}/areas", token,
             data={"name": f"Test Area {user_idx}", "area_code": f"TA{user_idx}", "floor_number": 1, "total_units": 4})
    area_id = r["data"].get("id") if r["ok"] and r.get("data") else None
    if area_id:
        test("PUT area", "PUT", f"/projects/{PROJECT_ID}/areas/{area_id}", token,
             data={"name": f"Updated Area {user_idx}", "area_code": f"TA{user_idx}"})
        test("DELETE area", "DELETE", f"/projects/{PROJECT_ID}/areas/{area_id}", token)

    # MEETINGS
    print("\n--- Meetings ---")
    test("GET meetings", "GET", f"/projects/{PROJECT_ID}/meetings", token)
    r = test("POST meeting", "POST", f"/projects/{PROJECT_ID}/meetings", token,
             data={"title": f"Test Meeting {user_idx}", "meeting_type": "coordination",
                   "scheduled_date": "2026-03-01T10:00:00", "description": "Test"})
    meet_id = r["data"].get("id") if r["ok"] and r.get("data") else None
    if meet_id:
        test("GET meeting detail", "GET", f"/projects/{PROJECT_ID}/meetings/{meet_id}", token)
        test("PUT meeting", "PUT", f"/projects/{PROJECT_ID}/meetings/{meet_id}", token,
             data={"title": f"Updated Meeting {user_idx}"})
        test("DELETE meeting", "DELETE", f"/projects/{PROJECT_ID}/meetings/{meet_id}", token)

    test("POST meeting (no title)", "POST", f"/projects/{PROJECT_ID}/meetings", token,
         data={"scheduled_date": "2026-03-01T10:00:00"}, expect_ok=False)

    # CONTACTS
    print("\n--- Contacts ---")
    test("GET contacts", "GET", f"/projects/{PROJECT_ID}/contacts", token)
    r = test("POST contact", "POST", f"/projects/{PROJECT_ID}/contacts", token,
             data={"contact_name": f"Contact {user_idx}", "contact_type": "subcontractor",
                   "company_name": "TestCo", "email": f"contact{user_idx}@test.com", "phone": "0501234567"})
    contact_id = r["data"].get("id") if r["ok"] and r.get("data") else None
    if contact_id:
        test("PUT contact", "PUT", f"/projects/{PROJECT_ID}/contacts/{contact_id}", token,
             data={"contact_name": f"Updated Contact {user_idx}", "contact_type": "subcontractor"})
        test("DELETE contact", "DELETE", f"/projects/{PROJECT_ID}/contacts/{contact_id}", token)

    # INSPECTIONS
    print("\n--- Inspections ---")
    test("GET inspections", "GET", f"/projects/{PROJECT_ID}/inspections", token)
    test("GET inspection summary", "GET", f"/projects/{PROJECT_ID}/inspections/summary", token)
    test("GET consultant types", "GET", "/consultant-types", token)

    # RFIs
    print("\n--- RFIs ---")
    test("GET rfis", "GET", f"/projects/{PROJECT_ID}/rfis", token)
    r = test("POST rfi", "POST", f"/projects/{PROJECT_ID}/rfis", token,
             data={"subject": f"Test RFI {user_idx}", "question": "What is the spec?",
                   "to_email": "engineer@test.com", "category": "design", "priority": "medium"})
    rfi_id = r["data"].get("id") if r["ok"] and r.get("data") else None
    if rfi_id:
        test("GET rfi detail", "GET", f"/projects/{PROJECT_ID}/rfis/{rfi_id}", token)
        test("DELETE rfi", "DELETE", f"/projects/{PROJECT_ID}/rfis/{rfi_id}", token)

    # APPROVALS
    print("\n--- Approvals ---")
    test("GET approvals", "GET", f"/projects/{PROJECT_ID}/approvals", token)

    # DEFECTS
    print("\n--- Defects ---")
    test("GET defects", "GET", f"/projects/{PROJECT_ID}/defects", token)

    # CHECKLISTS
    print("\n--- Checklists ---")
    test("GET checklists", "GET", f"/projects/{PROJECT_ID}/checklists", token)

    # NOTIFICATIONS
    print("\n--- Notifications ---")
    test("GET notifications", "GET", "/notifications", token)
    test("GET unread count", "GET", "/notifications/unread-count", token)

    # TEMPLATES
    print("\n--- Templates ---")
    test("GET equipment templates", "GET", "/equipment-templates", token)
    test("GET material templates", "GET", "/material-templates", token)

    # AUDIT LOG
    print("\n--- Audit Log ---")
    test("GET audit log", "GET", f"/projects/{PROJECT_ID}/audit-log", token)

    # MEMBERS
    print("\n--- Members ---")
    test("GET members", "GET", f"/projects/{PROJECT_ID}/members", token)

    # EDGE CASES
    print("\n--- Edge Cases ---")
    test("GET nonexistent endpoint", "GET", "/nonexistent", token, expect_ok=False)
    test("POST equipment (empty body)", "POST", f"/projects/{PROJECT_ID}/equipment", token, data={}, expect_ok=False)
    test("PUT equipment (bad id)", "PUT", f"/projects/{PROJECT_ID}/equipment/00000000-0000-0000-0000-000000000000", token,
         data={"name": "ghost"}, expect_ok=False)
    test("Long name equipment", "POST", f"/projects/{PROJECT_ID}/equipment", token,
         data={"name": "A" * 300}, expect_ok=False)


if __name__ == "__main__":
    user_idx = int(sys.argv[1]) if len(sys.argv) > 1 else 0
    start = time.time()
    run_tests_for_user(user_idx)
    elapsed = time.time() - start

    print(f"\n{'='*60}")
    print(f"RESULTS for user {ALL_USERS[user_idx]['email']}")
    print(f"{'='*60}")
    print(f"Passed: {len(successes)}")
    print(f"Failed: {len(errors)}")
    print(f"Time:   {elapsed:.1f}s")

    if errors:
        print(f"\nFAILURES:")
        for e in errors:
            print(f"  [{e['status']}] {e['test']}: {e.get('response', '')[:200]}")

    # Save results
    output = {
        "user": ALL_USERS[user_idx]["email"],
        "timestamp": datetime.now().isoformat(),
        "elapsed_seconds": round(elapsed, 1),
        "passed": len(successes),
        "failed": len(errors),
        "errors": errors,
        "successes": successes
    }
    output_file = f"/Users/galhadida/projects/builder_project/builder_program/test_results_user{user_idx}.json"
    with open(output_file, "w") as f:
        json.dump(output, f, indent=2)
    print(f"\nResults saved to {output_file}")
