import uuid
from datetime import date, datetime
import pytest
from app.models.consultant_assignment import ConsultantAssignment
from app.models.project import ProjectMember

API = "/api/v1/consultant-assignments"
FAKE = str(uuid.uuid4())


def payload(cid, pid, **ov):
    b = {"consultant_id": str(cid), "project_id": str(pid), "start_date": "2025-01-01",
         "end_date": "2025-12-31", "status": "pending", "notes": "Structural review"}
    b.update(ov)
    return b


async def mk(c, cid, pid, **ov):
    r = await c.post(API, json=payload(cid, pid, **ov))
    assert r.status_code == 200, r.text
    return r.json()


class TestListAssignments:
    async def test_empty(self, admin_client):
        assert (await admin_client.get(API)).json() == []
    async def test_returns_created(self, admin_client, project, admin_user):
        await mk(admin_client, admin_user.id, project.id)
        assert len((await admin_client.get(API)).json()) >= 1
    async def test_multiple(self, admin_client, project, admin_user):
        for i in range(3):
            await mk(admin_client, admin_user.id, project.id, notes=f"A{i}")
        assert len((await admin_client.get(API)).json()) >= 3
    async def test_ordered_desc(self, admin_client, project, admin_user):
        await mk(admin_client, admin_user.id, project.id, start_date="2024-01-01", end_date="2024-12-31")
        await mk(admin_client, admin_user.id, project.id, start_date="2026-01-01", end_date="2026-12-31")
        d = [x["startDate"] for x in (await admin_client.get(API)).json()]
        assert d == sorted(d, reverse=True)
    async def test_camel_case(self, admin_client, project, admin_user):
        await mk(admin_client, admin_user.id, project.id)
        item = (await admin_client.get(API)).json()[0]
        for f in ["consultantId", "projectId", "startDate", "endDate", "createdAt", "updatedAt"]:
            assert f in item


class TestCreateAssignment:
    async def test_success(self, admin_client, project, admin_user):
        d = await mk(admin_client, admin_user.id, project.id)
        assert d["consultantId"] == str(admin_user.id) and d["status"] == "pending" and "id" in d
    async def test_notes(self, admin_client, project, admin_user):
        assert (await mk(admin_client, admin_user.id, project.id, notes="Detail"))["notes"] == "Detail"
    async def test_default_status(self, admin_client, project, admin_user):
        p = payload(admin_user.id, project.id); p.pop("status")
        assert (await admin_client.post(API, json=p)).json()["status"] == "pending"
    async def test_timestamps(self, admin_client, project, admin_user):
        d = await mk(admin_client, admin_user.id, project.id)
        assert d["createdAt"] and d["updatedAt"]
    async def test_unique_ids(self, admin_client, project, admin_user):
        a = await mk(admin_client, admin_user.id, project.id, notes="1")
        assert a["id"] != (await mk(admin_client, admin_user.id, project.id, notes="2"))["id"]
    async def test_null_notes(self, admin_client, project, admin_user):
        assert (await mk(admin_client, admin_user.id, project.id, notes=None))["notes"] is None
    async def test_null_type_id(self, admin_client, project, admin_user):
        assert (await mk(admin_client, admin_user.id, project.id, consultant_type_id=None))["consultantTypeId"] is None
    async def test_hebrew(self, admin_client, project, admin_user):
        assert (await mk(admin_client, admin_user.id, project.id, notes="הקצאה"))["notes"] == "הקצאה"
    async def test_valid_uuid(self, admin_client, project, admin_user):
        assert str(uuid.UUID((await mk(admin_client, admin_user.id, project.id))["id"]))
    @pytest.mark.parametrize("s", ["pending", "active", "completed", "cancelled"])
    async def test_valid_statuses(self, admin_client, project, admin_user, s):
        r = await admin_client.post(API, json=payload(admin_user.id, project.id, status=s))
        assert r.status_code == 200 and r.json()["status"] == s
    async def test_access_403(self, user_client, project, regular_user):
        assert (await user_client.post(API, json=payload(regular_user.id, project.id))).status_code == 403


class TestGetAssignment:
    async def test_ok(self, admin_client, project, admin_user):
        c = await mk(admin_client, admin_user.id, project.id)
        r = await admin_client.get(f"{API}/{c['id']}")
        assert r.status_code == 200 and r.json()["id"] == c["id"]
    async def test_404(self, admin_client):
        assert (await admin_client.get(f"{API}/{FAKE}")).status_code == 404
    async def test_bad_uuid(self, admin_client):
        assert (await admin_client.get(f"{API}/bad")).status_code == 422
    async def test_fields(self, admin_client, project, admin_user):
        c = await mk(admin_client, admin_user.id, project.id)
        d = (await admin_client.get(f"{API}/{c['id']}")).json()
        for f in ["id", "consultantId", "projectId", "startDate", "endDate", "status", "createdAt", "updatedAt"]:
            assert f in d
    async def test_access_403(self, user_client, project, admin_user, db, regular_user):
        a = ConsultantAssignment(id=uuid.uuid4(), consultant_id=admin_user.id, project_id=project.id,
            start_date=date(2025, 1, 1), end_date=date(2025, 12, 31), status="pending")
        db.add(a)
        await db.commit()
        assert (await user_client.get(f"{API}/{a.id}")).status_code == 403
    async def test_member_ok(self, user_client, project, admin_user, db, regular_user):
        db.add(ProjectMember(project_id=project.id, user_id=regular_user.id, role="member"))
        a = ConsultantAssignment(id=uuid.uuid4(), consultant_id=admin_user.id, project_id=project.id,
            start_date=date(2025, 1, 1), end_date=date(2025, 12, 31), status="pending")
        db.add(a)
        await db.commit()
        assert (await user_client.get(f"{API}/{a.id}")).status_code == 200


class TestUpdateAssignment:
    async def test_status(self, admin_client, project, admin_user):
        c = await mk(admin_client, admin_user.id, project.id)
        r = await admin_client.put(f"{API}/{c['id']}", json={"status": "active"})
        assert r.status_code == 200 and r.json()["status"] == "active"
    async def test_notes(self, admin_client, project, admin_user):
        c = await mk(admin_client, admin_user.id, project.id)
        assert (await admin_client.put(f"{API}/{c['id']}", json={"notes": "Up"})).json()["notes"] == "Up"
    async def test_dates(self, admin_client, project, admin_user):
        c = await mk(admin_client, admin_user.id, project.id)
        r = await admin_client.put(f"{API}/{c['id']}", json={"start_date": "2025-03-01", "end_date": "2025-09-30"})
        assert r.json()["startDate"] == "2025-03-01"
    async def test_404(self, admin_client):
        assert (await admin_client.put(f"{API}/{FAKE}", json={"status": "active"})).status_code == 404
    async def test_preserves(self, admin_client, project, admin_user):
        c = await mk(admin_client, admin_user.id, project.id)
        assert (await admin_client.put(f"{API}/{c['id']}", json={"status": "active"})).json()["notes"] == c["notes"]
    async def test_empty_noop(self, admin_client, project, admin_user):
        c = await mk(admin_client, admin_user.id, project.id)
        r = await admin_client.put(f"{API}/{c['id']}", json={})
        assert r.status_code == 200 and r.json()["status"] == c["status"]
    @pytest.mark.parametrize("s", ["pending", "active", "completed", "cancelled"])
    async def test_valid_statuses(self, admin_client, project, admin_user, s):
        c = await mk(admin_client, admin_user.id, project.id)
        assert (await admin_client.put(f"{API}/{c['id']}", json={"status": s})).json()["status"] == s


class TestDeleteAssignment:
    async def test_ok(self, admin_client, project, admin_user):
        c = await mk(admin_client, admin_user.id, project.id)
        r = await admin_client.delete(f"{API}/{c['id']}")
        assert r.status_code == 200 and r.json()["message"] == "Consultant assignment deleted"
    async def test_then_404(self, admin_client, project, admin_user):
        c = await mk(admin_client, admin_user.id, project.id)
        await admin_client.delete(f"{API}/{c['id']}")
        assert (await admin_client.get(f"{API}/{c['id']}")).status_code == 404
    async def test_not_found(self, admin_client):
        assert (await admin_client.delete(f"{API}/{FAKE}")).status_code == 404
    async def test_double_404(self, admin_client, project, admin_user):
        c = await mk(admin_client, admin_user.id, project.id)
        await admin_client.delete(f"{API}/{c['id']}")
        assert (await admin_client.delete(f"{API}/{c['id']}")).status_code == 404
    async def test_preserves_others(self, admin_client, project, admin_user):
        a1 = await mk(admin_client, admin_user.id, project.id, notes="K")
        a2 = await mk(admin_client, admin_user.id, project.id, notes="R")
        await admin_client.delete(f"{API}/{a2['id']}")
        assert (await admin_client.get(f"{API}/{a1['id']}")).status_code == 200
    async def test_bad_uuid(self, admin_client):
        assert (await admin_client.delete(f"{API}/bad")).status_code == 422
    async def test_gone_from_list(self, admin_client, project, admin_user):
        c = await mk(admin_client, admin_user.id, project.id)
        await admin_client.delete(f"{API}/{c['id']}")
        assert c["id"] not in [a["id"] for a in (await admin_client.get(API)).json()]


class TestAssignmentValidation:
    @pytest.mark.parametrize("f", ["consultant_id", "project_id", "start_date", "end_date"])
    async def test_missing_required(self, admin_client, project, admin_user, f):
        p = payload(admin_user.id, project.id); p.pop(f)
        assert (await admin_client.post(API, json=p)).status_code == 422
    async def test_end_before_start(self, admin_client, project, admin_user):
        assert (await admin_client.post(API, json=payload(
            admin_user.id, project.id, start_date="2025-12-31", end_date="2025-01-01"))).status_code == 422
    async def test_same_day_ok(self, admin_client, project, admin_user):
        assert (await admin_client.post(API, json=payload(
            admin_user.id, project.id, start_date="2025-06-15", end_date="2025-06-15"))).status_code == 200
    @pytest.mark.parametrize("s", ["unknown", "deleted", "PENDING", "active!", "in_progress", ""])
    async def test_bad_status(self, admin_client, project, admin_user, s):
        assert (await admin_client.post(API, json=payload(admin_user.id, project.id, status=s))).status_code == 422
    @pytest.mark.parametrize("d", ["not-a-date", "2025-13-01", "yesterday", "12/31/2025"])
    async def test_bad_date(self, admin_client, project, admin_user, d):
        assert (await admin_client.post(API, json=payload(admin_user.id, project.id, start_date=d))).status_code == 422
    async def test_notes_over_max(self, admin_client, project, admin_user):
        assert (await admin_client.post(API, json=payload(admin_user.id, project.id, notes="A"*5001))).status_code == 422
    async def test_notes_at_max(self, admin_client, project, admin_user):
        assert (await admin_client.post(API, json=payload(admin_user.id, project.id, notes="A"*5000))).status_code == 200
    async def test_xss(self, admin_client, project, admin_user):
        d = await mk(admin_client, admin_user.id, project.id, notes='<script>alert("x")</script>Safe')
        assert "<script>" not in d["notes"]
    @pytest.mark.parametrize("xss,m", [
        ('<script>alert(1)</script>', "<script"), ('<img src=x onerror=alert(1)>', "<img"),
        ('<iframe src="e"></iframe>', "<iframe"), ('<svg onload=alert(1)></svg>', "<svg"),
    ])
    async def test_xss_variants(self, admin_client, project, admin_user, xss, m):
        d = await mk(admin_client, admin_user.id, project.id, notes=f"S {xss} t")
        assert m not in d["notes"].lower()
    async def test_update_end_before_start(self, admin_client, project, admin_user):
        c = await mk(admin_client, admin_user.id, project.id)
        assert (await admin_client.put(f"{API}/{c['id']}",
            json={"start_date": "2025-12-31", "end_date": "2025-01-01"})).status_code == 422
    async def test_update_bad_status(self, admin_client, project, admin_user):
        c = await mk(admin_client, admin_user.id, project.id)
        assert (await admin_client.put(f"{API}/{c['id']}", json={"status": "bogus"})).status_code == 422
    async def test_update_notes_over_max(self, admin_client, project, admin_user):
        c = await mk(admin_client, admin_user.id, project.id)
        assert (await admin_client.put(f"{API}/{c['id']}", json={"notes": "B"*5001})).status_code == 422
    async def test_update_xss(self, admin_client, project, admin_user):
        c = await mk(admin_client, admin_user.id, project.id)
        r = await admin_client.put(f"{API}/{c['id']}", json={"notes": '<script>x</script>Safe'})
        assert r.status_code == 200 and "<script>" not in r.json()["notes"]
    async def test_bad_consultant_uuid(self, admin_client, project):
        assert (await admin_client.post(API, json=payload("bad", project.id))).status_code == 422
    async def test_bad_project_uuid(self, admin_client, admin_user):
        assert (await admin_client.post(API, json=payload(admin_user.id, "bad"))).status_code == 422
    async def test_empty_body(self, admin_client):
        assert (await admin_client.post(API, content=b"", headers={"Content-Type": "application/json"})).status_code == 422


class TestAssignmentNoAuth:
    async def test_list(self, client):
        assert (await client.get(API)).status_code == 401
    async def test_create(self, client, project, admin_user):
        assert (await client.post(API, json=payload(admin_user.id, project.id))).status_code == 401
    async def test_get(self, client):
        assert (await client.get(f"{API}/{FAKE}")).status_code == 401
    async def test_update(self, client):
        assert (await client.put(f"{API}/{FAKE}", json={"status": "active"})).status_code == 401
    async def test_delete(self, client):
        assert (await client.delete(f"{API}/{FAKE}")).status_code == 401


class TestAssignmentResponseFormat:
    async def test_no_snake(self, admin_client, project, admin_user):
        d = await mk(admin_client, admin_user.id, project.id)
        for k in ["consultant_id", "project_id", "start_date", "end_date", "created_at", "updated_at"]:
            assert k not in d
    @pytest.mark.parametrize("f", ["consultantId", "projectId", "startDate", "endDate", "createdAt", "updatedAt"])
    async def test_camel(self, admin_client, project, admin_user, f):
        assert f in (await mk(admin_client, admin_user.id, project.id))
    async def test_ids_match(self, admin_client, project, admin_user):
        d = await mk(admin_client, admin_user.id, project.id)
        assert d["projectId"] == str(project.id) and d["consultantId"] == str(admin_user.id)
    async def test_delete_msg(self, admin_client, project, admin_user):
        c = await mk(admin_client, admin_user.id, project.id)
        assert "message" in (await admin_client.delete(f"{API}/{c['id']}")).json()


class TestAssignmentWorkflows:
    async def test_lifecycle(self, admin_client, project, admin_user):
        c = await mk(admin_client, admin_user.id, project.id)
        i = c["id"]
        assert (await admin_client.get(f"{API}/{i}")).status_code == 200
        assert (await admin_client.put(f"{API}/{i}", json={"status": "active"})).json()["status"] == "active"
        assert (await admin_client.put(f"{API}/{i}", json={"status": "completed"})).json()["status"] == "completed"
        assert (await admin_client.delete(f"{API}/{i}")).status_code == 200
        assert (await admin_client.get(f"{API}/{i}")).status_code == 404
    async def test_update_dates(self, admin_client, project, admin_user):
        c = await mk(admin_client, admin_user.id, project.id)
        r = await admin_client.put(f"{API}/{c['id']}", json={"start_date": "2025-06-01", "end_date": "2025-06-30"})
        assert r.json()["startDate"] == "2025-06-01"
    async def test_batch_delete(self, admin_client, project, admin_user):
        ids = [(await mk(admin_client, admin_user.id, project.id, notes=f"B{i}"))["id"] for i in range(3)]
        for i in ids:
            assert (await admin_client.delete(f"{API}/{i}")).status_code == 200
    async def test_isolation(self, admin_client, project, admin_user):
        a1 = await mk(admin_client, admin_user.id, project.id, notes="A")
        a2 = await mk(admin_client, admin_user.id, project.id, notes="B")
        await admin_client.put(f"{API}/{a1['id']}", json={"notes": "X"})
        assert (await admin_client.get(f"{API}/{a2['id']}")).json()["notes"] == "B"


class TestAssignmentProjectAccess:
    async def test_no_access_403(self, user_client, project, regular_user):
        assert (await user_client.post(API, json=payload(regular_user.id, project.id))).status_code == 403
    async def test_member_create(self, user_client, project, db, regular_user):
        db.add(ProjectMember(project_id=project.id, user_id=regular_user.id, role="member"))
        await db.commit()
        assert (await user_client.post(API, json=payload(regular_user.id, project.id))).status_code == 200
    async def test_member_update(self, user_client, project, db, admin_user, regular_user):
        db.add(ProjectMember(project_id=project.id, user_id=regular_user.id, role="member"))
        a = ConsultantAssignment(id=uuid.uuid4(), consultant_id=admin_user.id, project_id=project.id,
            start_date=date(2025, 1, 1), end_date=date(2025, 12, 31), status="pending")
        db.add(a)
        await db.commit()
        assert (await user_client.put(f"{API}/{a.id}", json={"status": "active"})).status_code == 200
    async def test_member_delete(self, user_client, project, db, admin_user, regular_user):
        db.add(ProjectMember(project_id=project.id, user_id=regular_user.id, role="member"))
        a = ConsultantAssignment(id=uuid.uuid4(), consultant_id=admin_user.id, project_id=project.id,
            start_date=date(2025, 1, 1), end_date=date(2025, 12, 31), status="pending")
        db.add(a)
        await db.commit()
        assert (await user_client.delete(f"{API}/{a.id}")).status_code == 200
    async def test_fake_project_403(self, admin_client, admin_user):
        assert (await admin_client.post(API, json=payload(admin_user.id, FAKE))).status_code == 403
