import json
import urllib.request
import urllib.error
import time
import concurrent.futures
from datetime import datetime

BASE = "https://builderops-backend-a6cumfv4ga-zf.a.run.app/api/v1"

with open("/Users/galhadida/projects/builder_project/builder_program/test_users.json") as f:
    ALL_USERS = json.load(f)

ADMIN = ALL_USERS[0]
PROJECT_ID = "27074dd3-9ebe-47e9-b075-5dd0544590e8"


def api(method, path, token=None, data=None):
    url = f"{BASE}{path}"
    body = json.dumps(data).encode() if data else None
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        resp = urllib.request.urlopen(req)
        raw = resp.read()
        resp_data = json.loads(raw) if raw else None
        return {"status": resp.status, "data": resp_data, "ok": True}
    except urllib.error.HTTPError as e:
        raw = e.read().decode()
        try:
            err_data = json.loads(raw)
        except Exception:
            err_data = raw
        return {"status": e.code, "data": err_data, "ok": False}
    except Exception as e:
        return {"status": 0, "data": str(e), "ok": False}


def run_user_tests(user_idx):
    user = ALL_USERS[user_idx]
    token = user["token"]
    email = user["email"]
    is_admin = user_idx == 0
    results = {"passed": [], "failed": []}

    def check(name, method, path, data=None, expect_ok=True):
        r = api(method, path, token, data)
        ok = r["ok"] if expect_ok else not r["ok"]
        entry = {"test": name, "method": method, "path": path, "status": r["status"], "ok": r["ok"], "passed": ok}
        if not ok:
            entry["response"] = str(r["data"])[:500]
        (results["passed"] if ok else results["failed"]).append(entry)
        return r

    # AUTH
    check("GET /auth/me", "GET", "/auth/me")
    # Test no-token request directly (not via check() which always sends token)
    r_notoken = api("GET", "/auth/me", token=None)
    entry_notoken = {"test": "GET /auth/me no token", "method": "GET", "path": "/auth/me", "status": r_notoken["status"], "ok": r_notoken["ok"], "passed": not r_notoken["ok"]}
    if r_notoken["ok"]:
        entry_notoken["response"] = str(r_notoken["data"])[:500]
    (results["passed"] if entry_notoken["passed"] else results["failed"]).append(entry_notoken)
    check("Login wrong password", "POST", "/auth/login", {"email": email, "password": "Wrong123"}, expect_ok=False)

    # PROJECTS
    check("GET /projects", "GET", "/projects")
    check("GET bad project", "GET", "/projects/00000000-0000-0000-0000-000000000000", expect_ok=False)

    if not is_admin:
        # New users: create own project, test CRUD on it
        r = check("POST create project", "POST", "/projects",
                   {"name": f"Agent{user_idx} Project", "code": f"AG{user_idx:02d}", "address": "Test"})
        pid = r["data"].get("id") if r["ok"] and r.get("data") else None
        if pid:
            check("GET own project", "GET", f"/projects/{pid}")
            check("PUT own project", "PUT", f"/projects/{pid}",
                  {"name": f"Agent{user_idx} Updated", "code": f"AG{user_idx:02d}"})

            # CRUD on own project
            r2 = check("POST equipment own proj", "POST", f"/projects/{pid}/equipment",
                       {"name": f"Equip-{user_idx}", "equipment_type": "test"})
            eid = r2["data"].get("id") if r2["ok"] and r2.get("data") else None
            if eid:
                check("GET equipment own proj", "GET", f"/projects/{pid}/equipment/{eid}")
                check("DELETE equipment own proj", "DELETE", f"/projects/{pid}/equipment/{eid}")

            r2 = check("POST material own proj", "POST", f"/projects/{pid}/materials",
                       {"name": f"Mat-{user_idx}", "material_type": "test"})
            mid = r2["data"].get("id") if r2["ok"] and r2.get("data") else None
            if mid:
                check("DELETE material own proj", "DELETE", f"/projects/{pid}/materials/{mid}")

            r2 = check("POST area own proj", "POST", f"/projects/{pid}/areas",
                       {"name": f"Area-{user_idx}", "area_code": f"A{user_idx}", "floor_number": user_idx, "total_units": 2})
            aid = r2["data"].get("id") if r2["ok"] and r2.get("data") else None
            if aid:
                check("DELETE area own proj", "DELETE", f"/projects/{pid}/areas/{aid}")

            r2 = check("POST meeting own proj", "POST", f"/projects/{pid}/meetings",
                       {"title": f"Meet-{user_idx}", "scheduled_date": "2026-03-01T10:00:00", "meeting_type": "coordination"})
            meetid = r2["data"].get("id") if r2["ok"] and r2.get("data") else None
            if meetid:
                check("DELETE meeting own proj", "DELETE", f"/projects/{pid}/meetings/{meetid}")

            r2 = check("POST contact own proj", "POST", f"/projects/{pid}/contacts",
                       {"contact_name": f"Contact-{user_idx}", "contact_type": "subcontractor", "company_name": "Co",
                        "email": f"contact{user_idx}@test.com"})
            cid = r2["data"].get("id") if r2["ok"] and r2.get("data") else None
            if cid:
                check("DELETE contact own proj", "DELETE", f"/projects/{pid}/contacts/{cid}")

            r2 = check("POST rfi own proj", "POST", f"/projects/{pid}/rfis",
                       {"subject": f"RFI-{user_idx}", "question": "Test?", "to_email": "eng@test.com",
                        "category": "design", "priority": "low"})
            rid = r2["data"].get("id") if r2["ok"] and r2.get("data") else None
            if rid:
                check("GET rfi detail", "GET", f"/rfis/{rid}")
                check("DELETE rfi", "DELETE", f"/rfis/{rid}")

            r2 = check("POST defect own proj", "POST", f"/projects/{pid}/defects",
                       {"title": f"Defect-{user_idx}", "description": "Crack", "severity": "medium", "category": "concrete_structure"})
            did = r2["data"].get("id") if r2["ok"] and r2.get("data") else None
            if did:
                check("GET defect detail", "GET", f"/projects/{pid}/defects/{did}")
                check("DELETE defect own proj", "DELETE", f"/projects/{pid}/defects/{did}")

            # Test access to OTHER project (should fail)
            check("GET other project equip", "GET", f"/projects/{PROJECT_ID}/equipment", expect_ok=False)
            check("POST equip other proj", "POST", f"/projects/{PROJECT_ID}/equipment",
                  {"name": "Hack"}, expect_ok=False)

            # Cleanup - delete the project
            check("DELETE own project", "DELETE", f"/projects/{pid}")

        # Common endpoints
        check("GET notifications", "GET", "/notifications")
        check("GET unread count", "GET", "/notifications/unread-count")
        check("GET equipment templates", "GET", "/equipment-templates")
        check("GET material templates", "GET", "/material-templates")
        check("GET consultant types", "GET", "/consultant-types")

    else:
        # Admin full CRUD on existing project
        check("GET project detail", "GET", f"/projects/{PROJECT_ID}")

        # Equipment CRUD
        r = check("POST equipment", "POST", f"/projects/{PROJECT_ID}/equipment",
                   {"name": "Admin Equip Test", "equipment_type": "HVAC", "manufacturer": "Co", "model_number": "X1"})
        eid = r["data"].get("id") if r["ok"] and r.get("data") else None
        if eid:
            check("GET equipment", "GET", f"/projects/{PROJECT_ID}/equipment/{eid}")
            check("PUT equipment", "PUT", f"/projects/{PROJECT_ID}/equipment/{eid}", {"name": "Admin Equip Updated"})
            check("DELETE equipment", "DELETE", f"/projects/{PROJECT_ID}/equipment/{eid}")
        check("POST equip no name", "POST", f"/projects/{PROJECT_ID}/equipment", {"equipment_type": "x"}, expect_ok=False)
        check("POST equip long name", "POST", f"/projects/{PROJECT_ID}/equipment", {"name": "A" * 300}, expect_ok=False)

        # Materials CRUD
        r = check("POST material", "POST", f"/projects/{PROJECT_ID}/materials",
                   {"name": "Admin Mat Test", "material_type": "concrete"})
        mid = r["data"].get("id") if r["ok"] and r.get("data") else None
        if mid:
            check("PUT material", "PUT", f"/projects/{PROJECT_ID}/materials/{mid}", {"name": "Admin Mat Updated"})
            check("DELETE material", "DELETE", f"/projects/{PROJECT_ID}/materials/{mid}")

        # Areas CRUD
        r = check("POST area", "POST", f"/projects/{PROJECT_ID}/areas",
                   {"name": "Admin Area Test", "area_code": "ADM1", "floor_number": 5, "total_units": 10})
        aid = r["data"].get("id") if r["ok"] and r.get("data") else None
        if aid:
            check("PUT area", "PUT", f"/projects/{PROJECT_ID}/areas/{aid}", {"name": "Admin Area Updated", "area_code": "ADM1"})
            check("DELETE area", "DELETE", f"/projects/{PROJECT_ID}/areas/{aid}")

        # Meetings CRUD
        r = check("POST meeting", "POST", f"/projects/{PROJECT_ID}/meetings",
                   {"title": "Admin Meeting", "scheduled_date": "2026-03-01T14:00:00", "meeting_type": "site_visit"})
        meetid = r["data"].get("id") if r["ok"] and r.get("data") else None
        if meetid:
            check("GET meeting", "GET", f"/projects/{PROJECT_ID}/meetings/{meetid}")
            check("PUT meeting", "PUT", f"/projects/{PROJECT_ID}/meetings/{meetid}", {"title": "Admin Meeting Updated"})
            check("DELETE meeting", "DELETE", f"/projects/{PROJECT_ID}/meetings/{meetid}")
        check("POST meeting no title", "POST", f"/projects/{PROJECT_ID}/meetings",
              {"scheduled_date": "2026-03-01T10:00:00"}, expect_ok=False)

        # Contacts CRUD
        r = check("POST contact", "POST", f"/projects/{PROJECT_ID}/contacts",
                   {"contact_name": "Admin Contact", "contact_type": "subcontractor", "company_name": "AdminCo",
                    "email": "admin.contact@test.com", "phone": "0501234567"})
        cid = r["data"].get("id") if r["ok"] and r.get("data") else None
        if cid:
            check("PUT contact", "PUT", f"/projects/{PROJECT_ID}/contacts/{cid}",
                  {"contact_name": "Admin Contact Updated", "contact_type": "subcontractor"})
            check("DELETE contact", "DELETE", f"/projects/{PROJECT_ID}/contacts/{cid}")

        # RFIs CRUD (corrected paths)
        r = check("POST rfi", "POST", f"/projects/{PROJECT_ID}/rfis",
                   {"subject": "Admin RFI", "question": "What spec?", "to_email": "eng@test.com",
                    "category": "design", "priority": "medium"})
        rid = r["data"].get("id") if r["ok"] and r.get("data") else None
        if rid:
            check("GET rfi detail", "GET", f"/rfis/{rid}")
            check("DELETE rfi", "DELETE", f"/rfis/{rid}")

        # Inspections
        check("GET inspections", "GET", f"/projects/{PROJECT_ID}/inspections")
        check("GET inspection summary", "GET", f"/projects/{PROJECT_ID}/inspections/summary")
        check("GET consultant types", "GET", "/consultant-types")

        # Approvals
        check("GET approvals", "GET", f"/projects/{PROJECT_ID}/approvals")

        # Defects CRUD
        check("GET defects", "GET", f"/projects/{PROJECT_ID}/defects")
        r = check("POST defect", "POST", f"/projects/{PROJECT_ID}/defects",
                   {"title": "Admin Defect", "description": "Test crack", "severity": "low", "category": "concrete_structure"})
        did = r["data"].get("id") if r["ok"] and r.get("data") else None
        if did:
            check("GET defect detail", "GET", f"/projects/{PROJECT_ID}/defects/{did}")
            check("PUT defect", "PUT", f"/projects/{PROJECT_ID}/defects/{did}",
                  {"title": "Admin Defect Updated", "severity": "low", "category": "concrete_structure"})
            check("DELETE defect", "DELETE", f"/projects/{PROJECT_ID}/defects/{did}")

        # Checklists (corrected paths)
        check("GET checklist templates", "GET", "/checklist-templates")
        check("GET project checklist templates", "GET", f"/projects/{PROJECT_ID}/checklist-templates")
        check("GET checklist instances", "GET", f"/projects/{PROJECT_ID}/checklist-instances")

        # Audit (corrected path)
        check("GET audit log", "GET", f"/projects/{PROJECT_ID}/audit")
        check("GET global audit", "GET", "/audit")

        # Notifications
        check("GET notifications", "GET", "/notifications")
        check("GET unread count", "GET", "/notifications/unread-count")

        # Templates
        check("GET equipment templates", "GET", "/equipment-templates")
        check("GET material templates", "GET", "/material-templates")

        # Members
        check("GET members", "GET", f"/projects/{PROJECT_ID}/members")

        # Edge cases
        check("GET nonexistent", "GET", "/nonexistent", expect_ok=False)
        check("POST equip empty", "POST", f"/projects/{PROJECT_ID}/equipment", {}, expect_ok=False)
        check("PUT equip bad id", "PUT", f"/projects/{PROJECT_ID}/equipment/00000000-0000-0000-0000-000000000000",
              {"name": "x"}, expect_ok=False)
        check("SQL injection name", "POST", f"/projects/{PROJECT_ID}/equipment",
              {"name": "'; DROP TABLE equipment; --"})
        check("XSS in name", "POST", f"/projects/{PROJECT_ID}/equipment",
              {"name": "<script>alert('xss')</script>"}, expect_ok=False)

    return email, results


if __name__ == "__main__":
    start = time.time()
    all_results = {}

    print("Running tests for 11 users in parallel...\n")

    with concurrent.futures.ThreadPoolExecutor(max_workers=11) as executor:
        futures = {executor.submit(run_user_tests, i): i for i in range(11)}
        for future in concurrent.futures.as_completed(futures):
            idx = futures[future]
            email, results = future.result()
            all_results[email] = results
            p = len(results["passed"])
            f = len(results["failed"])
            status = "ALL PASS" if f == 0 else f"{f} FAILURES"
            print(f"  User {idx:2d} ({email:40s}): {p:3d} passed, {f:2d} failed  {status}")

    elapsed = time.time() - start
    total_p = sum(len(r["passed"]) for r in all_results.values())
    total_f = sum(len(r["failed"]) for r in all_results.values())

    print(f"\n{'='*70}")
    print(f"TOTALS: {total_p} passed, {total_f} failed ({elapsed:.1f}s)")
    print(f"{'='*70}")

    # Collect all failures
    all_failures = []
    for email, results in all_results.items():
        for f in results["failed"]:
            all_failures.append({"user": email, **f})

    if all_failures:
        by_test = {}
        for f in all_failures:
            key = f"[{f['status']}] {f['test']}"
            if key not in by_test:
                by_test[key] = {"count": 0, "users": [], "response": f.get("response", "")[:300]}
            by_test[key]["count"] += 1
            by_test[key]["users"].append(f["user"])

        print(f"\nUNIQUE FAILURES ({len(by_test)}):")
        print("-" * 70)
        for k, v in sorted(by_test.items(), key=lambda x: -x[1]["count"]):
            print(f"\n  {k}")
            print(f"    Affected: {v['count']}/{len(all_results)} users")
            if v["count"] <= 5:
                print(f"    Users: {', '.join(v['users'])}")
            print(f"    Response: {v['response'][:200]}")
    else:
        print("\nALL TESTS PASSED!")

    # Cleanup: delete test equip created by SQL/XSS tests
    admin_token = ADMIN["token"]
    equip_list = api("GET", f"/projects/{PROJECT_ID}/equipment", admin_token)
    if equip_list["ok"] and equip_list.get("data"):
        for eq in equip_list["data"]:
            if eq.get("name", "").startswith(("'; DROP", "<script")):
                api("DELETE", f"/projects/{PROJECT_ID}/equipment/{eq['id']}", admin_token)
                print(f"\nCleaned up test equipment: {eq['name'][:30]}")

    report = {
        "timestamp": datetime.now().isoformat(),
        "elapsed": round(elapsed, 1),
        "total_passed": total_p,
        "total_failed": total_f,
        "users_tested": len(all_results),
        "failures": all_failures,
        "per_user": {e: {"passed": len(r["passed"]), "failed": len(r["failed"])} for e, r in all_results.items()}
    }
    with open("/Users/galhadida/projects/builder_project/builder_program/test_final_report.json", "w") as f:
        json.dump(report, f, indent=2)
    print(f"\nFull report saved to test_final_report.json")
