#!/usr/bin/env python3
"""Parallel Stress Test — 10 agents x 10 entities = 100 items.
Creates a new user + project, seeds base data, then 10 agents run in parallel
creating contacts, areas, equipment, materials, defects, RFIs, meetings,
inspections. Verifies all counts and checks for bugs.
"""
import json
import subprocess
import sys
import time
import urllib.request
import urllib.error
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timedelta

API = "https://builderops-backend-a6cumfv4ga-zf.a.run.app/api/v1"
TIMESTAMP = int(time.time())
EMAIL = f"stresstest{TIMESTAMP}@builderops.dev"
PASSWORD = "StressTest2026!"
FULL_NAME = "Stress Test Agent"
PROJECT_NAME = f"Stress Test {TIMESTAMP}"
PROJECT_CODE = f"ST-{str(TIMESTAMP)[-6:]}"

bugs = []


def api(method, path, token, body=None):
    url = f"{API}{path}"
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return resp.status, json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        body_text = e.read().decode() if e.fp else ""
        try:
            return e.code, json.loads(body_text)
        except Exception:
            return e.code, {"error": body_text}
    except Exception as e:
        return 0, {"error": str(e)}


def report_bug(agent, msg):
    line = f"[BUG][{agent}] {msg}"
    bugs.append(line)
    print(f"  \033[91m{line}\033[0m")


def report_ok(agent, msg):
    print(f"  \033[92m[OK][{agent}] {msg}\033[0m")


def agent_contacts(token, project_id):
    ok = fail = 0
    for i in range(1, 11):
        status, resp = api("POST", f"/projects/{project_id}/contacts", token, {
            "contact_name": f"Contact-{i}",
            "contact_type": "contractor",
            "company_name": f"Company {i}",
            "email": f"contact{TIMESTAMP}{i}@test.com",
            "phone": f"050-{1000000 + i}",
        })
        if 200 <= status < 300 and "id" in resp:
            ok += 1
        else:
            fail += 1
            report_bug("contacts", f"#{i} status={status} resp={resp}")
    report_ok("contacts", f"{ok}/10 created") if fail == 0 else None
    return "contacts", ok, fail


def agent_areas(token, project_id):
    ok = fail = 0
    for i in range(1, 11):
        status, resp = api("POST", f"/projects/{project_id}/areas", token, {
            "name": f"Area-{i}",
            "area_code": f"A{TIMESTAMP}{i}",
            "floor_number": i,
            "total_units": i * 2,
        })
        if 200 <= status < 300 and "id" in resp:
            ok += 1
        else:
            fail += 1
            report_bug("areas", f"#{i} status={status} resp={resp}")
    report_ok("areas", f"{ok}/10 created") if fail == 0 else None
    return "areas", ok, fail


def agent_equipment(token, project_id):
    ok = fail = 0
    types = ["crane", "excavator", "bulldozer", "loader", "mixer",
             "pump", "drill", "welder", "generator", "compressor"]
    for i in range(10):
        status, resp = api("POST", f"/projects/{project_id}/equipment", token, {
            "name": f"{types[i]} Unit-{i+1}",
            "equipment_type": types[i],
            "model_number": f"M-{TIMESTAMP}-{i+1}",
            "serial_number": f"SN-{TIMESTAMP}-{i+1}",
            "manufacturer": f"TestMfg {i+1}",
        })
        if 200 <= status < 300 and "id" in resp:
            ok += 1
        else:
            fail += 1
            report_bug("equipment", f"#{i+1} status={status} resp={resp}")
    report_ok("equipment", f"{ok}/10 created") if fail == 0 else None
    return "equipment", ok, fail


def agent_materials(token, project_id):
    ok = fail = 0
    types = ["concrete", "steel", "wood", "glass", "brick",
             "insulation", "pipe", "wire", "tile", "paint"]
    for i in range(10):
        status, resp = api("POST", f"/projects/{project_id}/materials", token, {
            "name": f"{types[i]} Batch-{i+1}",
            "material_type": types[i],
            "manufacturer": f"MatMfg {i+1}",
            "model_number": f"MAT-{TIMESTAMP}-{i+1}",
        })
        if 200 <= status < 300 and "id" in resp:
            ok += 1
        else:
            fail += 1
            report_bug("materials", f"#{i+1} status={status} resp={resp}")
    report_ok("materials", f"{ok}/10 created") if fail == 0 else None
    return "materials", ok, fail


def agent_defects(token, project_id):
    ok = fail = 0
    cats = ["concrete_structure", "plaster", "painting", "plumbing", "flooring",
            "hvac", "lighting", "roof", "waterproofing", "building_general"]
    sevs = ["low", "medium", "high", "critical", "low",
            "medium", "high", "critical", "medium", "high"]
    for i in range(10):
        status, resp = api("POST", f"/projects/{project_id}/defects", token, {
            "description": f"Defect {i+1}: Test issue in {cats[i]} area",
            "category": cats[i],
            "severity": sevs[i],
            "assignee_ids": [],
        })
        if 200 <= status < 300 and "id" in resp:
            ok += 1
        else:
            fail += 1
            report_bug("defects", f"#{i+1} status={status} resp={resp}")
    report_ok("defects", f"{ok}/10 created") if fail == 0 else None
    return "defects", ok, fail


def agent_rfis(token, project_id):
    ok = fail = 0
    cats = ["design", "structural", "mep", "architectural", "specifications",
            "schedule", "cost", "other", "design", "structural"]
    pris = ["low", "medium", "high", "urgent", "low",
            "medium", "high", "urgent", "medium", "high"]
    for i in range(10):
        status, resp = api("POST", f"/projects/{project_id}/rfis", token, {
            "subject": f"RFI {i+1} Subject - {cats[i]}",
            "question": f"RFI {i+1}: Question about {cats[i]} issue?",
            "category": cats[i],
            "priority": pris[i],
            "to_email": f"engineer{i+1}@test.com",
        })
        if 200 <= status < 300 and "id" in resp:
            ok += 1
        else:
            fail += 1
            report_bug("rfis", f"#{i+1} status={status} resp={resp}")
    report_ok("rfis", f"{ok}/10 created") if fail == 0 else None
    return "rfis", ok, fail


def agent_meetings(token, project_id):
    ok = fail = 0
    for i in range(1, 11):
        future = (datetime.now() + timedelta(days=i)).strftime("%Y-%m-%dT10:00:00")
        status, resp = api("POST", f"/projects/{project_id}/meetings", token, {
            "title": f"Meeting-{i}",
            "description": f"Stress test meeting {i}",
            "scheduled_date": future,
            "location": f"Room {i}",
        })
        if 200 <= status < 300 and "id" in resp:
            ok += 1
        else:
            fail += 1
            report_bug("meetings", f"#{i} status={status} resp={resp}")
    report_ok("meetings", f"{ok}/10 created") if fail == 0 else None
    return "meetings", ok, fail


def agent_inspections(token, project_id, consultant_type_id):
    if not consultant_type_id:
        report_bug("inspections", "No consultant_type_id, skipping")
        return "inspections", 0, 10
    ok = fail = 0
    for i in range(1, 11):
        future = (datetime.now() + timedelta(days=i)).strftime("%Y-%m-%dT09:00:00")
        status, resp = api("POST", f"/projects/{project_id}/inspections", token, {
            "consultant_type_id": consultant_type_id,
            "scheduled_date": future,
            "notes": f"Inspection {i}",
        })
        if 200 <= status < 300 and "id" in resp:
            ok += 1
        else:
            fail += 1
            report_bug("inspections", f"#{i} status={status} resp={resp}")
    report_ok("inspections", f"{ok}/10 created") if fail == 0 else None
    return "inspections", ok, fail


def verify_counts(token, project_id, label="verify"):
    endpoints = ["contacts", "areas", "equipment", "materials",
                 "defects", "rfis", "meetings", "inspections"]
    total_bugs = 0
    for ep in endpoints:
        status, resp = api("GET", f"/projects/{project_id}/{ep}", token)
        if not (200 <= status < 300):
            report_bug(label, f"GET /{ep} returned {status}")
            total_bugs += 1
            continue
        if isinstance(resp, dict) and "items" in resp:
            count = len(resp["items"])
        elif isinstance(resp, list):
            count = len(resp)
        else:
            count = 0
        if count >= 10:
            report_ok(label, f"/{ep}: {count} items")
        else:
            report_bug(label, f"/{ep}: only {count} items (expected >= 10)")
            total_bugs += 1

    status, resp = api("GET", f"/projects/{project_id}/defects/summary", token)
    total = resp.get("total", 0) if 200 <= status < 300 else 0
    if total >= 10:
        report_ok(label, f"/defects/summary: total={total}")
    else:
        report_bug(label, f"/defects/summary: total={total} (expected >= 10)")
        total_bugs += 1

    status, resp = api("GET", f"/projects/{project_id}/audit", token)
    audit_count = len(resp) if 200 <= status < 300 and isinstance(resp, list) else 0
    if audit_count >= 50:
        report_ok(label, f"/audit: {audit_count} entries")
    else:
        report_bug(label, f"/audit: only {audit_count} entries (expected >= 50)")
        total_bugs += 1

    return total_bugs


def test_updates(token, project_id):
    total_bugs = 0
    status, resp = api("GET", f"/projects/{project_id}/defects", token)
    if 200 <= status < 300 and resp:
        defect_id = resp[0]["id"]
        s2, r2 = api("PUT", f"/projects/{project_id}/defects/{defect_id}", token,
                      {"status": "resolved"})
        if 200 <= s2 < 300 and r2.get("status") == "resolved":
            report_ok("updates", "Defect status -> resolved OK")
        else:
            report_bug("updates", f"Defect status change failed: {s2} {r2}")
            total_bugs += 1

    status, resp = api("GET", f"/projects/{project_id}/rfis", token)
    rfi_items = resp.get("items", []) if isinstance(resp, dict) else resp if isinstance(resp, list) else []
    if 200 <= status < 300 and rfi_items:
        rfi_id = rfi_items[0]["id"]
        s2, r2 = api("PATCH", f"/rfis/{rfi_id}", token,
                      {"subject": "Updated RFI Subject"})
        if 200 <= s2 < 300 and "id" in r2:
            report_ok("updates", "RFI update OK")
        else:
            report_bug("updates", f"RFI update failed: {s2} {r2}")
            total_bugs += 1

    return total_bugs


def check_gcp_logs():
    try:
        result = subprocess.run(
            ["gcloud", "logging", "read",
             'resource.type="cloud_run_revision" AND resource.labels.service_name="builderops-backend" AND severity>=ERROR',
             "--limit=20", "--format=table(timestamp, textPayload)", "--freshness=5m"],
            capture_output=True, text=True, timeout=30,
        )
        output = result.stdout.strip()
        if not output or "Listed 0 items" in output:
            print("  No errors in GCP logs")
        else:
            print(f"  GCP errors found:\n{output}")
            report_bug("gcp", f"Errors in logs: {output[:200]}")
    except Exception as e:
        print(f"  Could not fetch GCP logs: {e}")


def main():
    print(f"\n{'='*50}")
    print("  BuilderOps Parallel Stress Test")
    print(f"{'='*50}\n")

    # Step 1: Register
    print("Step 1: Registering user...")
    status, resp = api("POST", "/auth/register", None, {
        "email": EMAIL, "password": PASSWORD, "full_name": FULL_NAME,
    })
    if status not in (200, 201) or "accessToken" not in resp:
        print(f"FATAL: Registration failed: {status} {resp}")
        sys.exit(1)
    token = resp["accessToken"]
    user_id = resp["user"]["id"]
    print(f"  Registered: {EMAIL} ({user_id})")

    # Step 2: Create project
    print("\nStep 2: Creating project...")
    status, resp = api("POST", "/projects", token, {
        "name": PROJECT_NAME, "code": PROJECT_CODE,
        "description": "Automated stress test project",
    })
    if status not in (200, 201) or "id" not in resp:
        print(f"FATAL: Project creation failed: {status} {resp}")
        sys.exit(1)
    project_id = resp["id"]
    print(f"  Created: {PROJECT_NAME} ({project_id})")

    # Step 3: Create consultant type for inspections
    print("\nStep 3: Creating consultant type for inspections...")
    status, resp = api("POST", "/inspection-consultant-types", token, {
        "name": f"Stress Test Consultant {TIMESTAMP}",
        "name_he": f"יועץ מבחן {TIMESTAMP}",
        "category": "structural",
    })
    consultant_type_id = resp.get("id") if 200 <= status < 300 else None
    if consultant_type_id:
        print(f"  Created consultant type: {consultant_type_id}")
    else:
        print(f"  Failed to create consultant type: {status} {resp}")
        status2, resp2 = api("GET", "/inspection-consultant-types", token)
        if 200 <= status2 < 300 and resp2:
            consultant_type_id = resp2[0]["id"]
            print(f"  Using existing: {consultant_type_id}")

    # Step 4: Run 10 agents in parallel
    print(f"\nStep 4: Launching 8 creation agents in parallel...")
    print("  Each agent creates 10 items (80 total)\n")
    start = time.time()

    agents = [
        ("contacts", lambda: agent_contacts(token, project_id)),
        ("areas", lambda: agent_areas(token, project_id)),
        ("equipment", lambda: agent_equipment(token, project_id)),
        ("materials", lambda: agent_materials(token, project_id)),
        ("defects", lambda: agent_defects(token, project_id)),
        ("rfis", lambda: agent_rfis(token, project_id)),
        ("meetings", lambda: agent_meetings(token, project_id)),
        ("inspections", lambda: agent_inspections(token, project_id, consultant_type_id)),
    ]

    results = {}
    with ThreadPoolExecutor(max_workers=10) as pool:
        futures = {pool.submit(fn): name for name, fn in agents}
        for future in as_completed(futures):
            name, ok, fail = future.result()
            results[name] = (ok, fail)

    elapsed = time.time() - start
    print(f"\n  All agents completed in {elapsed:.1f}s")

    # Step 5: Verify + updates (sequential, after all creation done)
    print(f"\nStep 5: Final verification...")
    verify_counts(token, project_id, "final")

    print(f"\nStep 6: Testing updates...")
    test_updates(token, project_id)

    print(f"\nStep 7: Checking GCP logs...")
    check_gcp_logs()

    # Summary
    print(f"\n{'='*50}")
    print("  STRESS TEST SUMMARY")
    print(f"{'='*50}")
    print(f"  User:      {EMAIL}")
    print(f"  Project:   {PROJECT_NAME} ({PROJECT_CODE})")
    print(f"  ProjectID: {project_id}")
    print(f"  Duration:  {elapsed:.1f}s")
    print()
    for name, (ok, fail) in sorted(results.items()):
        mark = "OK" if fail == 0 else "FAIL"
        print(f"  {name:15s} {ok:2d}/10  [{mark}]")
    print()
    if bugs:
        print(f"  BUGS FOUND: {len(bugs)}")
        for b in bugs:
            print(f"    {b}")
    else:
        print("  ALL TESTS PASSED - No bugs found")
    print(f"{'='*50}\n")


if __name__ == "__main__":
    main()
