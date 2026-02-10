import uuid

import pytest
from sqlalchemy import select

from app.models.approval import ApprovalRequest, ApprovalStep
from app.models.equipment import ApprovalStatus, Equipment
from app.models.project import Project, ProjectMember

API = "/api/v1"
FAKE_UUID = str(uuid.uuid4())
FAKE_UUID_2 = str(uuid.uuid4())


def eq_url(pid):
    return f"{API}/projects/{pid}/equipment"


def eq_detail(pid, eid):
    return f"{API}/projects/{pid}/equipment/{eid}"


def eq_submit(pid, eid):
    return f"{API}/projects/{pid}/equipment/{eid}/submit"


def cl_url(pid, eid):
    return f"{API}/projects/{pid}/equipment/{eid}/checklists"


def sub_url(pid):
    return f"{API}/projects/{pid}/equipment-submissions"


def sub_detail(pid, sid):
    return f"{API}/projects/{pid}/equipment-submissions/{sid}"


def payload(**overrides):
    base = {
        "name": "Tower Crane TC-200",
        "equipment_type": "Crane",
        "manufacturer": "Liebherr",
        "model_number": "LTM-1300",
        "serial_number": "SN-TC200-001",
        "specifications": {"capacity": "300 tons", "boom_length": "80m"},
        "notes": "Primary tower crane for site",
    }
    base.update(overrides)
    return base


async def create_eq(client, pid, **overrides):
    resp = await client.post(eq_url(str(pid)), json=payload(**overrides))
    assert resp.status_code == 200, f"Create failed: {resp.text}"
    return resp.json()


async def make_other_project(db, user):
    code = f"OTH-{uuid.uuid4().hex[:4].upper()}"
    proj = Project(
        id=uuid.uuid4(), name="Other Project", code=code,
        status="active", created_by_id=user.id,
    )
    db.add(proj)
    await db.flush()
    db.add(ProjectMember(project_id=proj.id, user_id=user.id, role="project_admin"))
    await db.commit()
    await db.refresh(proj)
    return proj


async def make_equipment_in_db(db, project_id, user_id, **overrides):
    defaults = {
        "name": "DB Equipment",
        "equipment_type": "Excavator",
        "status": ApprovalStatus.DRAFT.value,
    }
    defaults.update(overrides)
    eq = Equipment(
        id=uuid.uuid4(), project_id=project_id,
        created_by_id=user_id, **defaults,
    )
    db.add(eq)
    await db.commit()
    await db.refresh(eq)
    return eq


class TestCreateEquipmentExtended:

    @pytest.mark.asyncio
    async def test_create_returns_correct_status_draft(self, admin_client, project):
        data = await create_eq(admin_client, project.id)
        assert data["status"] == "draft"

    @pytest.mark.asyncio
    async def test_create_with_unicode_name(self, admin_client, project):
        resp = await admin_client.post(eq_url(str(project.id)), json={"name": "Crane Tower"})
        assert resp.status_code == 200

    @pytest.mark.asyncio
    async def test_create_with_hebrew_name(self, admin_client, project):
        resp = await admin_client.post(eq_url(str(project.id)), json={"name": "מנוף צריח"})
        assert resp.status_code == 200
        assert resp.json()["name"] == "מנוף צריח"

    @pytest.mark.asyncio
    async def test_create_with_arabic_name(self, admin_client, project):
        resp = await admin_client.post(eq_url(str(project.id)), json={"name": "رافعة برجية"})
        assert resp.status_code == 200

    @pytest.mark.asyncio
    async def test_create_with_special_chars_in_name(self, admin_client, project):
        name = "Equipment #42 (Rev.A) - Phase 2/3 & Final"
        resp = await admin_client.post(eq_url(str(project.id)), json={"name": name})
        assert resp.status_code == 200
        assert resp.json()["name"] == name

    @pytest.mark.asyncio
    async def test_create_sets_timestamps(self, admin_client, project):
        data = await create_eq(admin_client, project.id)
        assert data["createdAt"] is not None
        assert data["updatedAt"] is not None

    @pytest.mark.asyncio
    async def test_create_two_equipment_different_ids(self, admin_client, project):
        eq1 = await create_eq(admin_client, project.id, name="Eq One")
        eq2 = await create_eq(admin_client, project.id, name="Eq Two")
        assert eq1["id"] != eq2["id"]

    @pytest.mark.asyncio
    async def test_create_preserves_specs_structure(self, admin_client, project):
        specs = {"power": 500, "voltage": "380V", "portable": False, "rating": None}
        data = await create_eq(admin_client, project.id, specifications=specs)
        assert data["specifications"]["power"] == 500
        assert data["specifications"]["voltage"] == "380V"
        assert data["specifications"]["portable"] is False
        assert data["specifications"]["rating"] is None

    @pytest.mark.asyncio
    async def test_create_with_empty_specs_dict(self, admin_client, project):
        data = await create_eq(admin_client, project.id, specifications={})
        assert data["specifications"] == {}

    @pytest.mark.asyncio
    async def test_create_with_null_specs(self, admin_client, project):
        data = await create_eq(admin_client, project.id, specifications=None)
        assert data["specifications"] is None or data["specifications"] == {}

    @pytest.mark.asyncio
    async def test_create_missing_body_returns_422(self, admin_client, project):
        resp = await admin_client.post(eq_url(str(project.id)), content=b"", headers={"Content-Type": "application/json"})
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_create_name_boundary_2_chars(self, admin_client, project):
        resp = await admin_client.post(eq_url(str(project.id)), json={"name": "XY"})
        assert resp.status_code == 200

    @pytest.mark.asyncio
    async def test_create_name_boundary_255_chars(self, admin_client, project):
        name = "E" * 255
        resp = await admin_client.post(eq_url(str(project.id)), json={"name": name})
        assert resp.status_code == 200
        assert len(resp.json()["name"]) == 255


class TestReadEquipmentExtended:

    @pytest.mark.asyncio
    async def test_get_returns_all_response_fields(self, admin_client, project):
        eq = await create_eq(admin_client, project.id)
        resp = await admin_client.get(eq_detail(str(project.id), eq["id"]))
        data = resp.json()
        required = ["id", "projectId", "name", "equipmentType", "manufacturer",
                     "modelNumber", "serialNumber", "specifications", "status",
                     "createdAt", "updatedAt", "createdBy", "checklists",
                     "installationDate", "warrantyExpiry", "notes"]
        for f in required:
            assert f in data, f"Missing: {f}"

    @pytest.mark.asyncio
    async def test_get_created_by_has_email(self, admin_client, project, admin_user):
        eq = await create_eq(admin_client, project.id)
        resp = await admin_client.get(eq_detail(str(project.id), eq["id"]))
        cb = resp.json()["createdBy"]
        assert cb["email"] == admin_user.email

    @pytest.mark.asyncio
    async def test_get_nonexistent_equipment_returns_404(self, admin_client, project):
        resp = await admin_client.get(eq_detail(str(project.id), FAKE_UUID))
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_get_equipment_from_wrong_project(self, admin_client, project, db, admin_user):
        eq = await create_eq(admin_client, project.id)
        other = await make_other_project(db, admin_user)
        resp = await admin_client.get(eq_detail(str(other.id), eq["id"]))
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_get_invalid_uuid_returns_422(self, admin_client, project):
        resp = await admin_client.get(eq_detail(str(project.id), "invalid-uuid"))
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_get_equipment_includes_checklists_empty(self, admin_client, project):
        eq = await create_eq(admin_client, project.id)
        resp = await admin_client.get(eq_detail(str(project.id), eq["id"]))
        assert resp.json()["checklists"] == []


class TestListEquipmentExtended:

    @pytest.mark.asyncio
    async def test_list_empty_project(self, admin_client, project):
        resp = await admin_client.get(eq_url(str(project.id)))
        assert resp.status_code == 200
        assert resp.json() == []

    @pytest.mark.asyncio
    async def test_list_returns_correct_count(self, admin_client, project):
        for i in range(5):
            await create_eq(admin_client, project.id, name=f"Eq {i}")
        resp = await admin_client.get(eq_url(str(project.id)))
        assert len(resp.json()) == 5

    @pytest.mark.asyncio
    async def test_list_is_ordered_by_created_at_desc(self, admin_client, project):
        for i in range(3):
            await create_eq(admin_client, project.id, name=f"Equipment {i}")
        resp = await admin_client.get(eq_url(str(project.id)))
        data = resp.json()
        dates = [d["createdAt"] for d in data]
        assert dates == sorted(dates, reverse=True)

    @pytest.mark.asyncio
    async def test_list_project_isolation(self, admin_client, project, db, admin_user):
        await create_eq(admin_client, project.id, name="Project A Equipment")
        other = await make_other_project(db, admin_user)
        await create_eq(admin_client, other.id, name="Project B Equipment")
        resp_a = await admin_client.get(eq_url(str(project.id)))
        resp_b = await admin_client.get(eq_url(str(other.id)))
        assert len(resp_a.json()) == 1
        assert resp_a.json()[0]["name"] == "Project A Equipment"
        assert len(resp_b.json()) == 1
        assert resp_b.json()[0]["name"] == "Project B Equipment"

    @pytest.mark.asyncio
    async def test_list_each_item_has_camel_case(self, admin_client, project):
        await create_eq(admin_client, project.id)
        resp = await admin_client.get(eq_url(str(project.id)))
        for item in resp.json():
            assert "equipmentType" in item
            assert "modelNumber" in item
            assert "serialNumber" in item

    @pytest.mark.asyncio
    async def test_list_response_is_array_type(self, admin_client, project):
        resp = await admin_client.get(eq_url(str(project.id)))
        assert isinstance(resp.json(), list)


class TestFlatListExtended:

    @pytest.mark.asyncio
    async def test_flat_list_empty(self, admin_client):
        resp = await admin_client.get(f"{API}/equipment")
        assert resp.status_code == 200
        assert resp.json() == []

    @pytest.mark.asyncio
    async def test_flat_list_returns_from_member_projects_only(self, admin_client, project, db, admin_user):
        await create_eq(admin_client, project.id, name="Visible")
        resp = await admin_client.get(f"{API}/equipment")
        assert len(resp.json()) >= 1

    @pytest.mark.asyncio
    async def test_flat_list_filter_by_project(self, admin_client, project, db, admin_user):
        await create_eq(admin_client, project.id)
        other = await make_other_project(db, admin_user)
        await create_eq(admin_client, other.id, name="Other Eq")
        resp = await admin_client.get(f"{API}/equipment", params={"project_id": str(project.id)})
        assert len(resp.json()) == 1
        assert resp.json()[0]["projectId"] == str(project.id)

    @pytest.mark.asyncio
    async def test_flat_list_invalid_project_filter_returns_422(self, admin_client):
        resp = await admin_client.get(f"{API}/equipment", params={"project_id": "bad-uuid"})
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_flat_list_nonexistent_project_returns_empty(self, admin_client, project):
        await create_eq(admin_client, project.id)
        resp = await admin_client.get(f"{API}/equipment", params={"project_id": FAKE_UUID})
        assert resp.json() == []

    @pytest.mark.asyncio
    async def test_flat_list_all_projects(self, admin_client, project, db, admin_user):
        await create_eq(admin_client, project.id, name="Alpha")
        other = await make_other_project(db, admin_user)
        await create_eq(admin_client, other.id, name="Bravo")
        resp = await admin_client.get(f"{API}/equipment")
        names = [e["name"] for e in resp.json()]
        assert "Alpha" in names
        assert "Bravo" in names


class TestUpdateEquipmentExtended:

    @pytest.mark.asyncio
    async def test_update_single_field(self, admin_client, project):
        eq = await create_eq(admin_client, project.id)
        resp = await admin_client.put(eq_detail(str(project.id), eq["id"]), json={"name": "Updated"})
        assert resp.status_code == 200
        assert resp.json()["name"] == "Updated"

    @pytest.mark.asyncio
    async def test_update_preserves_unset_fields(self, admin_client, project):
        eq = await create_eq(admin_client, project.id)
        resp = await admin_client.put(eq_detail(str(project.id), eq["id"]), json={"notes": "New note"})
        assert resp.json()["manufacturer"] == eq["manufacturer"]
        assert resp.json()["equipmentType"] == eq["equipmentType"]

    @pytest.mark.asyncio
    async def test_update_multiple_fields(self, admin_client, project):
        eq = await create_eq(admin_client, project.id)
        resp = await admin_client.put(
            eq_detail(str(project.id), eq["id"]),
            json={"name": "Multi", "equipment_type": "Loader", "notes": "Changed"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["name"] == "Multi"
        assert data["equipmentType"] == "Loader"
        assert data["notes"] == "Changed"

    @pytest.mark.asyncio
    async def test_update_specifications_replaces(self, admin_client, project):
        eq = await create_eq(admin_client, project.id, specifications={"old": "val"})
        resp = await admin_client.put(
            eq_detail(str(project.id), eq["id"]),
            json={"specifications": {"new": "val2"}},
        )
        assert resp.json()["specifications"] == {"new": "val2"}

    @pytest.mark.asyncio
    async def test_update_empty_body_is_noop(self, admin_client, project):
        eq = await create_eq(admin_client, project.id)
        resp = await admin_client.put(eq_detail(str(project.id), eq["id"]), json={})
        assert resp.status_code == 200
        assert resp.json()["name"] == eq["name"]

    @pytest.mark.asyncio
    async def test_update_nonexistent_returns_404(self, admin_client, project):
        resp = await admin_client.put(eq_detail(str(project.id), FAKE_UUID), json={"name": "Ghost"})
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_update_wrong_project_returns_404(self, admin_client, project, db, admin_user):
        eq = await create_eq(admin_client, project.id)
        other = await make_other_project(db, admin_user)
        resp = await admin_client.put(eq_detail(str(other.id), eq["id"]), json={"name": "Wrong"})
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_update_with_installation_date(self, admin_client, project):
        eq = await create_eq(admin_client, project.id)
        resp = await admin_client.put(
            eq_detail(str(project.id), eq["id"]),
            json={"installation_date": "2025-03-01T09:00:00"},
        )
        assert resp.status_code == 200
        assert resp.json()["installationDate"] is not None

    @pytest.mark.asyncio
    async def test_update_clear_optional_to_null(self, admin_client, project):
        eq = await create_eq(admin_client, project.id)
        resp = await admin_client.put(
            eq_detail(str(project.id), eq["id"]),
            json={"equipment_type": None, "manufacturer": None},
        )
        assert resp.status_code == 200
        assert resp.json()["equipmentType"] is None
        assert resp.json()["manufacturer"] is None

    @pytest.mark.asyncio
    @pytest.mark.parametrize("field,value,expected_status", [
        ("name", "A", 422),
        ("name", "", 422),
        ("name", "A" * 256, 422),
        ("equipment_type", "A" * 101, 422),
        ("model_number", "A" * 101, 422),
        ("serial_number", "A" * 101, 422),
        ("manufacturer", "A" * 256, 422),
        ("notes", "A" * 5001, 422),
    ])
    async def test_update_validation_rejects_invalid(self, admin_client, project, field, value, expected_status):
        eq = await create_eq(admin_client, project.id)
        resp = await admin_client.put(eq_detail(str(project.id), eq["id"]), json={field: value})
        assert resp.status_code == expected_status


class TestDeleteEquipmentExtended:

    @pytest.mark.asyncio
    async def test_delete_success(self, admin_client, project):
        eq = await create_eq(admin_client, project.id)
        resp = await admin_client.delete(eq_detail(str(project.id), eq["id"]))
        assert resp.status_code == 200
        assert resp.json()["message"] == "Equipment deleted"

    @pytest.mark.asyncio
    async def test_delete_then_get_404(self, admin_client, project):
        eq = await create_eq(admin_client, project.id)
        await admin_client.delete(eq_detail(str(project.id), eq["id"]))
        resp = await admin_client.get(eq_detail(str(project.id), eq["id"]))
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_delete_then_not_in_list(self, admin_client, project):
        eq = await create_eq(admin_client, project.id)
        await admin_client.delete(eq_detail(str(project.id), eq["id"]))
        resp = await admin_client.get(eq_url(str(project.id)))
        assert len(resp.json()) == 0

    @pytest.mark.asyncio
    async def test_delete_nonexistent_returns_404(self, admin_client, project):
        resp = await admin_client.delete(eq_detail(str(project.id), FAKE_UUID))
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_delete_one_preserves_others(self, admin_client, project):
        eq1 = await create_eq(admin_client, project.id, name="Keep")
        eq2 = await create_eq(admin_client, project.id, name="Remove")
        await admin_client.delete(eq_detail(str(project.id), eq2["id"]))
        resp = await admin_client.get(eq_url(str(project.id)))
        assert len(resp.json()) == 1
        assert resp.json()[0]["name"] == "Keep"

    @pytest.mark.asyncio
    async def test_delete_double_delete_returns_404(self, admin_client, project):
        eq = await create_eq(admin_client, project.id)
        await admin_client.delete(eq_detail(str(project.id), eq["id"]))
        resp = await admin_client.delete(eq_detail(str(project.id), eq["id"]))
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_delete_wrong_project_returns_404(self, admin_client, project, db, admin_user):
        eq = await create_eq(admin_client, project.id)
        other = await make_other_project(db, admin_user)
        resp = await admin_client.delete(eq_detail(str(other.id), eq["id"]))
        assert resp.status_code == 404


class TestSubmitForApprovalExtended:

    @pytest.mark.asyncio
    async def test_submit_changes_status(self, admin_client, project):
        eq = await create_eq(admin_client, project.id)
        resp = await admin_client.post(eq_submit(str(project.id), eq["id"]))
        assert resp.status_code == 200
        assert resp.json()["status"] == "submitted"

    @pytest.mark.asyncio
    async def test_submit_creates_approval_request(self, admin_client, project, db):
        eq = await create_eq(admin_client, project.id)
        await admin_client.post(eq_submit(str(project.id), eq["id"]))
        result = await db.execute(
            select(ApprovalRequest).where(
                ApprovalRequest.entity_id == uuid.UUID(eq["id"]),
                ApprovalRequest.entity_type == "equipment",
            )
        )
        approval = result.scalar_one_or_none()
        assert approval is not None
        assert approval.current_status == "submitted"

    @pytest.mark.asyncio
    async def test_submit_creates_two_steps(self, admin_client, project, db):
        eq = await create_eq(admin_client, project.id)
        await admin_client.post(eq_submit(str(project.id), eq["id"]))
        result = await db.execute(
            select(ApprovalRequest).where(ApprovalRequest.entity_id == uuid.UUID(eq["id"]))
        )
        approval = result.scalar_one()
        steps_result = await db.execute(
            select(ApprovalStep).where(ApprovalStep.approval_request_id == approval.id)
        )
        steps = steps_result.scalars().all()
        assert len(steps) == 2
        roles = sorted([s.approver_role for s in steps])
        assert roles == ["consultant", "inspector"]

    @pytest.mark.asyncio
    async def test_submit_nonexistent_equipment_returns_404(self, admin_client, project):
        resp = await admin_client.post(eq_submit(str(project.id), FAKE_UUID))
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_submit_preserves_equipment_data(self, admin_client, project):
        eq = await create_eq(admin_client, project.id)
        resp = await admin_client.post(eq_submit(str(project.id), eq["id"]))
        data = resp.json()
        assert data["name"] == eq["name"]
        assert data["manufacturer"] == eq["manufacturer"]
        assert data["equipmentType"] == eq["equipmentType"]

    @pytest.mark.asyncio
    async def test_submit_returns_camel_case(self, admin_client, project):
        eq = await create_eq(admin_client, project.id)
        resp = await admin_client.post(eq_submit(str(project.id), eq["id"]))
        data = resp.json()
        assert "equipmentType" in data
        assert "projectId" in data
        assert "createdAt" in data

    @pytest.mark.asyncio
    async def test_submit_then_verify_get_status(self, admin_client, project):
        eq = await create_eq(admin_client, project.id)
        await admin_client.post(eq_submit(str(project.id), eq["id"]))
        resp = await admin_client.get(eq_detail(str(project.id), eq["id"]))
        assert resp.json()["status"] == "submitted"


class TestStatusTransitionsViaDB:

    @pytest.mark.asyncio
    async def test_draft_status_default(self, admin_client, project):
        eq = await create_eq(admin_client, project.id)
        assert eq["status"] == "draft"

    @pytest.mark.asyncio
    async def test_submitted_via_api(self, admin_client, project):
        eq = await create_eq(admin_client, project.id)
        resp = await admin_client.post(eq_submit(str(project.id), eq["id"]))
        assert resp.json()["status"] == "submitted"

    @pytest.mark.asyncio
    @pytest.mark.parametrize("initial_status", [
        "draft", "submitted", "under_review", "approved", "rejected", "revision_requested",
    ])
    async def test_all_valid_statuses_exist_in_enum(self, initial_status):
        found = any(s.value == initial_status for s in ApprovalStatus)
        assert found, f"{initial_status} not in ApprovalStatus"

    @pytest.mark.asyncio
    async def test_db_equipment_status_persists(self, db, project, admin_user):
        eq = await make_equipment_in_db(db, project.id, admin_user.id, status="under_review")
        result = await db.execute(select(Equipment).where(Equipment.id == eq.id))
        fetched = result.scalar_one()
        assert fetched.status == "under_review"

    @pytest.mark.asyncio
    @pytest.mark.parametrize("status", [
        "draft", "submitted", "under_review", "approved", "rejected", "revision_requested",
    ])
    async def test_db_equipment_all_statuses_writable(self, db, project, admin_user, status):
        eq = await make_equipment_in_db(db, project.id, admin_user.id, status=status)
        assert eq.status == status


class TestAuthenticationExtended:

    @pytest.mark.asyncio
    async def test_unauthenticated_list_returns_401(self, client, project):
        resp = await client.get(eq_url(str(project.id)))
        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_unauthenticated_flat_list_returns_401(self, client):
        resp = await client.get(f"{API}/equipment")
        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_unauthenticated_create_returns_401(self, client, project):
        resp = await client.post(eq_url(str(project.id)), json=payload())
        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_unauthenticated_get_returns_401(self, client, project):
        resp = await client.get(eq_detail(str(project.id), FAKE_UUID))
        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_unauthenticated_update_returns_401(self, client, project):
        resp = await client.put(eq_detail(str(project.id), FAKE_UUID), json={"name": "X"})
        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_unauthenticated_delete_returns_401(self, client, project):
        resp = await client.delete(eq_detail(str(project.id), FAKE_UUID))
        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_unauthenticated_submit_returns_401(self, client, project):
        resp = await client.post(eq_submit(str(project.id), FAKE_UUID))
        assert resp.status_code == 401


class TestProjectAccessControl:

    @pytest.mark.asyncio
    async def test_user_without_project_access_gets_403(self, user_client, project):
        resp = await user_client.get(eq_url(str(project.id)))
        assert resp.status_code == 403

    @pytest.mark.asyncio
    async def test_user_with_project_access_can_list(self, user_client, project, db, regular_user):
        db.add(ProjectMember(project_id=project.id, user_id=regular_user.id, role="contractor"))
        await db.commit()
        resp = await user_client.get(eq_url(str(project.id)))
        assert resp.status_code == 200

    @pytest.mark.asyncio
    async def test_user_with_project_access_can_create(self, user_client, project, db, regular_user):
        db.add(ProjectMember(project_id=project.id, user_id=regular_user.id, role="contractor"))
        await db.commit()
        resp = await user_client.post(eq_url(str(project.id)), json=payload())
        assert resp.status_code == 200

    @pytest.mark.asyncio
    async def test_user_create_sets_own_user_as_creator(self, user_client, project, db, regular_user):
        db.add(ProjectMember(project_id=project.id, user_id=regular_user.id, role="contractor"))
        await db.commit()
        resp = await user_client.post(eq_url(str(project.id)), json=payload())
        assert resp.json()["createdBy"]["id"] == str(regular_user.id)

    @pytest.mark.asyncio
    async def test_user_can_update_equipment(self, user_client, admin_client, project, db, regular_user):
        db.add(ProjectMember(project_id=project.id, user_id=regular_user.id, role="contractor"))
        await db.commit()
        eq = await create_eq(admin_client, project.id)
        resp = await user_client.put(eq_detail(str(project.id), eq["id"]), json={"name": "User Updated"})
        assert resp.status_code == 200

    @pytest.mark.asyncio
    async def test_user_can_delete_equipment(self, user_client, admin_client, project, db, regular_user):
        db.add(ProjectMember(project_id=project.id, user_id=regular_user.id, role="contractor"))
        await db.commit()
        eq = await create_eq(admin_client, project.id)
        resp = await user_client.delete(eq_detail(str(project.id), eq["id"]))
        assert resp.status_code == 200

    @pytest.mark.asyncio
    async def test_user_can_submit_for_approval(self, user_client, admin_client, project, db, regular_user):
        db.add(ProjectMember(project_id=project.id, user_id=regular_user.id, role="contractor"))
        await db.commit()
        eq = await create_eq(admin_client, project.id)
        resp = await user_client.post(eq_submit(str(project.id), eq["id"]))
        assert resp.status_code == 200

    @pytest.mark.asyncio
    async def test_nonexistent_project_returns_403(self, admin_client):
        resp = await admin_client.get(eq_url(FAKE_UUID))
        assert resp.status_code == 403

    @pytest.mark.asyncio
    async def test_create_nonexistent_project_returns_403(self, admin_client):
        resp = await admin_client.post(eq_url(FAKE_UUID), json=payload())
        assert resp.status_code == 403


class TestChecklistExtended:

    @pytest.mark.asyncio
    async def test_create_checklist_success(self, admin_client, project):
        eq = await create_eq(admin_client, project.id)
        cl_payload = {
            "checklist_name": "Safety Check",
            "items": [
                {"id": "s1", "label": "Inspect cables", "is_completed": False},
                {"id": "s2", "label": "Check load limit", "is_completed": True, "notes": "OK"},
            ],
        }
        resp = await admin_client.post(cl_url(str(project.id), eq["id"]), json=cl_payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["checklistName"] == "Safety Check"
        assert len(data["items"]) == 2

    @pytest.mark.asyncio
    async def test_checklist_appears_in_equipment_detail(self, admin_client, project):
        eq = await create_eq(admin_client, project.id)
        cl_payload = {"checklist_name": "Pre-op Check", "items": [{"id": "p1", "label": "Visual"}]}
        await admin_client.post(cl_url(str(project.id), eq["id"]), json=cl_payload)
        resp = await admin_client.get(eq_detail(str(project.id), eq["id"]))
        assert len(resp.json()["checklists"]) == 1

    @pytest.mark.asyncio
    async def test_multiple_checklists(self, admin_client, project):
        eq = await create_eq(admin_client, project.id)
        for i in range(3):
            cl_payload = {"checklist_name": f"CL {i}", "items": [{"id": f"x{i}", "label": f"Item {i}"}]}
            resp = await admin_client.post(cl_url(str(project.id), eq["id"]), json=cl_payload)
            assert resp.status_code == 200
        detail = await admin_client.get(eq_detail(str(project.id), eq["id"]))
        assert len(detail.json()["checklists"]) == 3

    @pytest.mark.asyncio
    async def test_checklist_empty_items_allowed(self, admin_client, project):
        eq = await create_eq(admin_client, project.id)
        resp = await admin_client.post(
            cl_url(str(project.id), eq["id"]),
            json={"checklist_name": "Empty", "items": []},
        )
        assert resp.status_code == 200
        assert resp.json()["items"] == []

    @pytest.mark.asyncio
    async def test_checklist_name_too_short(self, admin_client, project):
        eq = await create_eq(admin_client, project.id)
        resp = await admin_client.post(
            cl_url(str(project.id), eq["id"]),
            json={"checklist_name": "A", "items": []},
        )
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_checklist_name_too_long(self, admin_client, project):
        eq = await create_eq(admin_client, project.id)
        resp = await admin_client.post(
            cl_url(str(project.id), eq["id"]),
            json={"checklist_name": "A" * 256, "items": []},
        )
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_checklist_too_many_items(self, admin_client, project):
        eq = await create_eq(admin_client, project.id)
        items = [{"id": f"i{i}", "label": f"Item {i}"} for i in range(101)]
        resp = await admin_client.post(
            cl_url(str(project.id), eq["id"]),
            json={"checklist_name": "Too Many", "items": items},
        )
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_checklist_100_items_ok(self, admin_client, project):
        eq = await create_eq(admin_client, project.id)
        items = [{"id": f"i{i}", "label": f"Item {i}"} for i in range(100)]
        resp = await admin_client.post(
            cl_url(str(project.id), eq["id"]),
            json={"checklist_name": "Max Items", "items": items},
        )
        assert resp.status_code == 200

    @pytest.mark.asyncio
    async def test_checklist_xss_sanitized_name(self, admin_client, project):
        eq = await create_eq(admin_client, project.id)
        resp = await admin_client.post(
            cl_url(str(project.id), eq["id"]),
            json={"checklist_name": 'Safe <script>alert(1)</script> Name', "items": []},
        )
        if resp.status_code == 200:
            assert "<script" not in resp.json()["checklistName"].lower()

    @pytest.mark.asyncio
    async def test_checklist_xss_sanitized_item_label(self, admin_client, project):
        eq = await create_eq(admin_client, project.id)
        resp = await admin_client.post(
            cl_url(str(project.id), eq["id"]),
            json={
                "checklist_name": "XSS Test",
                "items": [{"id": "x1", "label": 'Check <img src=x onerror=alert(1)> cables'}],
            },
        )
        if resp.status_code == 200:
            assert "<img" not in resp.json()["items"][0]["label"].lower()


class TestXSSSanitizationExtended:

    @pytest.mark.asyncio
    @pytest.mark.parametrize("xss,marker", [
        ('<script>document.cookie</script>', "<script"),
        ('<IMG SRC="javascript:alert(1)">', "javascript:"),
        ('<div onmouseover="alert(1)">', "onmouseover="),
        ('<IFRAME SRC="data:text/html,<script>alert(1)</script>">', "<iframe"),
    ])
    async def test_xss_stripped_from_name_on_create(self, admin_client, project, xss, marker):
        resp = await admin_client.post(
            eq_url(str(project.id)), json={"name": f"Safe {xss} Name"}
        )
        if resp.status_code == 200:
            assert marker not in resp.json()["name"].lower()

    @pytest.mark.asyncio
    @pytest.mark.parametrize("xss,marker", [
        ('<script>alert("xss")</script>', "<script"),
        ('<svg onload=alert(1)></svg>', "<svg"),
        ('<style>body{display:none}</style>', "<style"),
    ])
    async def test_xss_stripped_from_notes_on_create(self, admin_client, project, xss, marker):
        resp = await admin_client.post(
            eq_url(str(project.id)), json={"name": "Safe Eq", "notes": f"Note {xss} here"}
        )
        if resp.status_code == 200:
            assert marker not in resp.json()["notes"].lower()

    @pytest.mark.asyncio
    async def test_xss_stripped_from_spec_keys(self, admin_client, project):
        resp = await admin_client.post(
            eq_url(str(project.id)),
            json={"name": "Spec XSS", "specifications": {'<script>alert(1)</script>': "val"}},
        )
        if resp.status_code == 200:
            for k in resp.json().get("specifications", {}):
                assert "<script" not in k.lower()

    @pytest.mark.asyncio
    async def test_xss_stripped_from_spec_values(self, admin_client, project):
        resp = await admin_client.post(
            eq_url(str(project.id)),
            json={"name": "Spec Val XSS", "specifications": {"k": '<img src=x onerror=alert(1)>'}},
        )
        if resp.status_code == 200:
            for v in resp.json().get("specifications", {}).values():
                if isinstance(v, str):
                    assert "<img" not in v.lower()

    @pytest.mark.asyncio
    @pytest.mark.parametrize("field", ["equipment_type", "manufacturer", "model_number", "serial_number"])
    async def test_xss_stripped_from_optional_fields(self, admin_client, project, field):
        data = {"name": "Safe", field: '<script>alert(1)</script>Injected'}
        resp = await admin_client.post(eq_url(str(project.id)), json=data)
        if resp.status_code == 200:
            camel_map = {
                "equipment_type": "equipmentType", "manufacturer": "manufacturer",
                "model_number": "modelNumber", "serial_number": "serialNumber",
            }
            val = resp.json().get(camel_map[field], "")
            if val:
                assert "<script" not in val.lower()


class TestResponseFormatExtended:

    @pytest.mark.asyncio
    async def test_no_snake_case_keys_in_response(self, admin_client, project):
        eq = await create_eq(admin_client, project.id)
        data = eq
        snake_keys = ["equipment_type", "model_number", "serial_number",
                       "project_id", "created_at", "updated_at", "created_by_id",
                       "installation_date", "warranty_expiry"]
        for k in snake_keys:
            assert k not in data, f"Snake case key '{k}' found in response"

    @pytest.mark.asyncio
    async def test_id_is_valid_uuid(self, admin_client, project):
        eq = await create_eq(admin_client, project.id)
        parsed = uuid.UUID(eq["id"])
        assert str(parsed) == eq["id"]

    @pytest.mark.asyncio
    async def test_project_id_matches_request(self, admin_client, project):
        eq = await create_eq(admin_client, project.id)
        assert eq["projectId"] == str(project.id)

    @pytest.mark.asyncio
    async def test_created_by_structure(self, admin_client, project, admin_user):
        eq = await create_eq(admin_client, project.id)
        cb = eq["createdBy"]
        assert isinstance(cb, dict)
        assert "id" in cb
        assert "email" in cb
        assert cb["id"] == str(admin_user.id)

    @pytest.mark.asyncio
    async def test_delete_response_has_message(self, admin_client, project):
        eq = await create_eq(admin_client, project.id)
        resp = await admin_client.delete(eq_detail(str(project.id), eq["id"]))
        assert "message" in resp.json()


class TestEquipmentSubmissionsIntegration:

    @pytest.mark.asyncio
    async def test_create_submission_for_project(self, admin_client, project, equipment_template):
        resp = await admin_client.post(
            sub_url(str(project.id)),
            json={"template_id": str(equipment_template.id), "name": "Test Submission"},
        )
        assert resp.status_code == 201
        assert resp.json()["status"] == "draft"

    @pytest.mark.asyncio
    async def test_list_submissions_empty(self, admin_client, project):
        resp = await admin_client.get(sub_url(str(project.id)))
        assert resp.status_code == 200
        assert resp.json() == []

    @pytest.mark.asyncio
    async def test_submission_create_returns_camel_case(self, admin_client, project, equipment_template):
        resp = await admin_client.post(
            sub_url(str(project.id)),
            json={"template_id": str(equipment_template.id), "name": "Camel Sub"},
        )
        data = resp.json()
        assert "projectId" in data
        assert "templateId" in data
        assert "createdAt" in data

    @pytest.mark.asyncio
    async def test_submission_get_by_id(self, admin_client, project, equipment_template):
        create_resp = await admin_client.post(
            sub_url(str(project.id)),
            json={"template_id": str(equipment_template.id), "name": "Get Sub"},
        )
        sub_id = create_resp.json()["id"]
        resp = await admin_client.get(sub_detail(str(project.id), sub_id))
        assert resp.status_code == 200
        assert resp.json()["name"] == "Get Sub"

    @pytest.mark.asyncio
    async def test_submission_update(self, admin_client, project, equipment_template):
        create_resp = await admin_client.post(
            sub_url(str(project.id)),
            json={"template_id": str(equipment_template.id), "name": "Before Update"},
        )
        sub_id = create_resp.json()["id"]
        resp = await admin_client.put(
            sub_detail(str(project.id), sub_id),
            json={"name": "After Update"},
        )
        assert resp.status_code == 200
        assert resp.json()["name"] == "After Update"

    @pytest.mark.asyncio
    async def test_submission_delete(self, admin_client, project, equipment_template):
        create_resp = await admin_client.post(
            sub_url(str(project.id)),
            json={"template_id": str(equipment_template.id), "name": "Delete Sub"},
        )
        sub_id = create_resp.json()["id"]
        resp = await admin_client.delete(sub_detail(str(project.id), sub_id))
        assert resp.status_code == 200

    @pytest.mark.asyncio
    async def test_submission_nonexistent_returns_404(self, admin_client, project):
        resp = await admin_client.get(sub_detail(str(project.id), FAKE_UUID))
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_submission_project_scoping(self, admin_client, project, equipment_template, db, admin_user):
        resp = await admin_client.post(
            sub_url(str(project.id)),
            json={"template_id": str(equipment_template.id), "name": "P1 Sub"},
        )
        sub_id = resp.json()["id"]
        other = await make_other_project(db, admin_user)
        resp2 = await admin_client.get(sub_detail(str(other.id), sub_id))
        assert resp2.status_code == 404


class TestCRUDWorkflows:

    @pytest.mark.asyncio
    async def test_full_lifecycle(self, admin_client, project):
        eq = await create_eq(admin_client, project.id)
        eid = eq["id"]
        pid = str(project.id)
        get_resp = await admin_client.get(eq_detail(pid, eid))
        assert get_resp.status_code == 200
        upd_resp = await admin_client.put(eq_detail(pid, eid), json={"name": "Renamed"})
        assert upd_resp.json()["name"] == "Renamed"
        sub_resp = await admin_client.post(eq_submit(pid, eid))
        assert sub_resp.json()["status"] == "submitted"
        del_resp = await admin_client.delete(eq_detail(pid, eid))
        assert del_resp.status_code == 200
        gone = await admin_client.get(eq_detail(pid, eid))
        assert gone.status_code == 404

    @pytest.mark.asyncio
    async def test_create_with_checklist_then_submit(self, admin_client, project):
        eq = await create_eq(admin_client, project.id)
        pid = str(project.id)
        cl = {"checklist_name": "Pre-submit", "items": [{"id": "c1", "label": "Verified"}]}
        await admin_client.post(cl_url(pid, eq["id"]), json=cl)
        resp = await admin_client.post(eq_submit(pid, eq["id"]))
        assert resp.json()["status"] == "submitted"
        detail = await admin_client.get(eq_detail(pid, eq["id"]))
        assert len(detail.json()["checklists"]) == 1

    @pytest.mark.asyncio
    async def test_update_after_submit_still_works(self, admin_client, project):
        eq = await create_eq(admin_client, project.id)
        pid = str(project.id)
        await admin_client.post(eq_submit(pid, eq["id"]))
        resp = await admin_client.put(eq_detail(pid, eq["id"]), json={"notes": "Post submit note"})
        assert resp.status_code == 200
        assert resp.json()["notes"] == "Post submit note"

    @pytest.mark.asyncio
    async def test_create_multiple_then_delete_all(self, admin_client, project):
        ids = []
        pid = str(project.id)
        for i in range(5):
            eq = await create_eq(admin_client, project.id, name=f"Batch {i}")
            ids.append(eq["id"])
        for eid in ids:
            resp = await admin_client.delete(eq_detail(pid, eid))
            assert resp.status_code == 200
        resp = await admin_client.get(eq_url(pid))
        assert resp.json() == []


class TestEdgeCasesExtended:

    @pytest.mark.asyncio
    async def test_create_with_extra_fields_ignored(self, admin_client, project):
        data = payload()
        data["unknown_field"] = "should be ignored"
        data["extra"] = 42
        resp = await admin_client.post(eq_url(str(project.id)), json=data)
        assert resp.status_code == 200

    @pytest.mark.asyncio
    async def test_create_with_whitespace_only_name(self, admin_client, project):
        resp = await admin_client.post(eq_url(str(project.id)), json={"name": "   "})
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_create_with_leading_trailing_whitespace_name(self, admin_client, project):
        resp = await admin_client.post(eq_url(str(project.id)), json={"name": "  Crane  "})
        assert resp.status_code == 200
        assert resp.json()["name"].strip() == "Crane"

    @pytest.mark.asyncio
    async def test_create_duplicate_names_allowed(self, admin_client, project):
        for _ in range(3):
            resp = await admin_client.post(eq_url(str(project.id)), json={"name": "Same Name"})
            assert resp.status_code == 200
        resp = await admin_client.get(eq_url(str(project.id)))
        same = [e for e in resp.json() if e["name"] == "Same Name"]
        assert len(same) == 3

    @pytest.mark.asyncio
    async def test_get_with_invalid_project_uuid(self, admin_client):
        resp = await admin_client.get(f"{API}/projects/not-uuid/equipment")
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_specs_with_boolean_values(self, admin_client, project):
        specs = {"active": True, "calibrated": False}
        data = await create_eq(admin_client, project.id, specifications=specs)
        assert data["specifications"]["active"] is True
        assert data["specifications"]["calibrated"] is False

    @pytest.mark.asyncio
    async def test_specs_with_numeric_values(self, admin_client, project):
        specs = {"weight_kg": 1500, "height_m": 45.5}
        data = await create_eq(admin_client, project.id, specifications=specs)
        assert data["specifications"]["weight_kg"] == 1500
        assert data["specifications"]["height_m"] == 45.5

    @pytest.mark.asyncio
    async def test_specs_with_null_value(self, admin_client, project):
        specs = {"pending_inspection": None}
        data = await create_eq(admin_client, project.id, specifications=specs)
        assert data["specifications"]["pending_inspection"] is None

    @pytest.mark.asyncio
    async def test_specs_50_keys_max(self, admin_client, project):
        specs = {f"key_{i}": f"val_{i}" for i in range(50)}
        resp = await admin_client.post(eq_url(str(project.id)), json={"name": "Max Keys", "specifications": specs})
        assert resp.status_code == 200

    @pytest.mark.asyncio
    async def test_specs_51_keys_rejected(self, admin_client, project):
        specs = {f"key_{i}": f"val_{i}" for i in range(51)}
        resp = await admin_client.post(eq_url(str(project.id)), json={"name": "Over Keys", "specifications": specs})
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_specs_key_100_chars_ok(self, admin_client, project):
        specs = {"k" * 100: "value"}
        resp = await admin_client.post(eq_url(str(project.id)), json={"name": "Long Key", "specifications": specs})
        assert resp.status_code == 200

    @pytest.mark.asyncio
    async def test_specs_key_101_chars_rejected(self, admin_client, project):
        specs = {"k" * 101: "value"}
        resp = await admin_client.post(eq_url(str(project.id)), json={"name": "Too Long Key", "specifications": specs})
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_specs_value_500_chars_ok(self, admin_client, project):
        specs = {"key": "v" * 500}
        resp = await admin_client.post(eq_url(str(project.id)), json={"name": "Long Val", "specifications": specs})
        assert resp.status_code == 200

    @pytest.mark.asyncio
    async def test_specs_value_501_chars_rejected(self, admin_client, project):
        specs = {"key": "v" * 501}
        resp = await admin_client.post(eq_url(str(project.id)), json={"name": "Too Long Val", "specifications": specs})
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_specs_nested_dict_rejected(self, admin_client, project):
        specs = {"key": {"nested": "dict"}}
        resp = await admin_client.post(eq_url(str(project.id)), json={"name": "Nested", "specifications": specs})
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_specs_list_value_rejected(self, admin_client, project):
        specs = {"key": [1, 2, 3]}
        resp = await admin_client.post(eq_url(str(project.id)), json={"name": "List", "specifications": specs})
        assert resp.status_code == 422


class TestDatetimeFieldsExtended:

    @pytest.mark.asyncio
    @pytest.mark.parametrize("dt", [
        "2024-01-01T00:00:00",
        "2025-06-15T12:30:00",
        "2030-12-31T23:59:59",
    ])
    async def test_valid_installation_dates(self, admin_client, project, dt):
        data = await create_eq(admin_client, project.id, installation_date=dt)
        assert data["installationDate"] is not None

    @pytest.mark.asyncio
    @pytest.mark.parametrize("dt", [
        "2025-01-01T00:00:00",
        "2028-12-31T23:59:59",
    ])
    async def test_valid_warranty_expiry(self, admin_client, project, dt):
        data = await create_eq(admin_client, project.id, warranty_expiry=dt)
        assert data["warrantyExpiry"] is not None

    @pytest.mark.asyncio
    async def test_both_dates_set(self, admin_client, project):
        data = await create_eq(
            admin_client, project.id,
            installation_date="2024-06-01T08:00:00",
            warranty_expiry="2027-06-01T08:00:00",
        )
        assert data["installationDate"] is not None
        assert data["warrantyExpiry"] is not None

    @pytest.mark.asyncio
    async def test_null_dates_by_default(self, admin_client, project):
        data = await create_eq(
            admin_client, project.id,
            installation_date=None, warranty_expiry=None,
        )
        assert data["installationDate"] is None
        assert data["warrantyExpiry"] is None

    @pytest.mark.asyncio
    @pytest.mark.parametrize("bad_date", [
        "not-a-date", "2024-13-01T00:00:00", "yesterday", "12/31/2024",
    ])
    async def test_invalid_date_rejected(self, admin_client, project, bad_date):
        resp = await admin_client.post(
            eq_url(str(project.id)),
            json={"name": "Bad Date", "installation_date": bad_date},
        )
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_update_installation_date(self, admin_client, project):
        eq = await create_eq(admin_client, project.id)
        resp = await admin_client.put(
            eq_detail(str(project.id), eq["id"]),
            json={"installation_date": "2025-01-15T09:00:00"},
        )
        assert resp.status_code == 200
        assert resp.json()["installationDate"] is not None

    @pytest.mark.asyncio
    async def test_update_warranty_expiry(self, admin_client, project):
        eq = await create_eq(admin_client, project.id)
        resp = await admin_client.put(
            eq_detail(str(project.id), eq["id"]),
            json={"warranty_expiry": "2028-01-15T09:00:00"},
        )
        assert resp.status_code == 200
        assert resp.json()["warrantyExpiry"] is not None


class TestMultipleEquipmentExtended:

    @pytest.mark.asyncio
    @pytest.mark.parametrize("count", [1, 3, 7, 10])
    async def test_create_n_and_list(self, admin_client, project, count):
        for i in range(count):
            await create_eq(admin_client, project.id, name=f"Eq-{i}")
        resp = await admin_client.get(eq_url(str(project.id)))
        assert len(resp.json()) == count

    @pytest.mark.asyncio
    @pytest.mark.parametrize("delete_idx", [0, 1, 2])
    async def test_delete_one_of_three(self, admin_client, project, delete_idx):
        ids = []
        for i in range(3):
            eq = await create_eq(admin_client, project.id, name=f"Del-{i}")
            ids.append(eq["id"])
        await admin_client.delete(eq_detail(str(project.id), ids[delete_idx]))
        resp = await admin_client.get(eq_url(str(project.id)))
        remaining = [e["id"] for e in resp.json()]
        assert ids[delete_idx] not in remaining
        assert len(remaining) == 2

    @pytest.mark.asyncio
    async def test_update_one_does_not_affect_other(self, admin_client, project):
        eq1 = await create_eq(admin_client, project.id, name="Original A")
        eq2 = await create_eq(admin_client, project.id, name="Original B")
        await admin_client.put(
            eq_detail(str(project.id), eq1["id"]), json={"name": "Changed A"}
        )
        resp = await admin_client.get(eq_detail(str(project.id), eq2["id"]))
        assert resp.json()["name"] == "Original B"


class TestNotFoundAndErrorExtended:

    @pytest.mark.asyncio
    @pytest.mark.parametrize("method,path_func", [
        ("GET", lambda pid: eq_detail(pid, FAKE_UUID)),
        ("PUT", lambda pid: eq_detail(pid, FAKE_UUID)),
        ("DELETE", lambda pid: eq_detail(pid, FAKE_UUID)),
        ("POST", lambda pid: eq_submit(pid, FAKE_UUID)),
    ])
    async def test_404_for_nonexistent_equipment(self, admin_client, project, method, path_func):
        url = path_func(str(project.id))
        if method == "PUT":
            resp = await admin_client.put(url, json={"name": "Ghost"})
        elif method == "POST":
            resp = await admin_client.post(url)
        elif method == "DELETE":
            resp = await admin_client.delete(url)
        else:
            resp = await admin_client.get(url)
        assert resp.status_code == 404

    @pytest.mark.asyncio
    @pytest.mark.parametrize("method", ["GET", "POST", "PUT", "DELETE"])
    async def test_403_for_nonexistent_project(self, admin_client, method):
        if method == "GET":
            resp = await admin_client.get(eq_url(FAKE_UUID))
        elif method == "POST":
            resp = await admin_client.post(eq_url(FAKE_UUID), json=payload())
        elif method == "PUT":
            resp = await admin_client.put(eq_detail(FAKE_UUID, FAKE_UUID_2), json={"name": "Ghost"})
        else:
            resp = await admin_client.delete(eq_detail(FAKE_UUID, FAKE_UUID_2))
        assert resp.status_code == 403

    @pytest.mark.asyncio
    async def test_422_for_invalid_uuid_equipment_id(self, admin_client, project):
        resp = await admin_client.get(eq_detail(str(project.id), "not-uuid"))
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_422_for_invalid_uuid_project_id(self, admin_client):
        resp = await admin_client.get(eq_url("not-uuid"))
        assert resp.status_code == 422


class TestParametrizedCreateValidation:

    @pytest.mark.asyncio
    @pytest.mark.parametrize("payload_data,expected_status,desc", [
        ({"name": "AB"}, 200, "minimal"),
        ({"name": "AB", "equipment_type": "Crane"}, 200, "with type"),
        ({"name": "AB", "manufacturer": "CAT"}, 200, "with manufacturer"),
        ({"name": "AB", "model_number": "M1"}, 200, "with model"),
        ({"name": "AB", "serial_number": "S1"}, 200, "with serial"),
        ({"name": "AB", "specifications": {"k": "v"}}, 200, "with specs"),
        ({"name": "AB", "notes": "Some notes"}, 200, "with notes"),
        ({"name": "AB", "installation_date": "2024-01-01T00:00:00"}, 200, "with install date"),
        ({"name": "AB", "warranty_expiry": "2025-01-01T00:00:00"}, 200, "with warranty"),
        ({}, 422, "empty payload"),
        ({"equipment_type": "Crane"}, 422, "missing name"),
        ({"name": ""}, 422, "empty name"),
        ({"name": "A"}, 422, "name too short"),
        ({"name": "A" * 256}, 422, "name too long"),
    ])
    async def test_create_parametrized(self, admin_client, project, payload_data, expected_status, desc):
        resp = await admin_client.post(eq_url(str(project.id)), json=payload_data)
        assert resp.status_code == expected_status, f"Failed: {desc}"


class TestParametrizedFieldLengths:

    @pytest.mark.asyncio
    @pytest.mark.parametrize("field,valid_len,over_len", [
        ("equipment_type", 100, 101),
        ("manufacturer", 255, 256),
        ("model_number", 100, 101),
        ("serial_number", 100, 101),
        ("notes", 5000, 5001),
    ])
    async def test_field_at_max_length_ok(self, admin_client, project, field, valid_len, over_len):
        data = {"name": "Test", field: "X" * valid_len}
        resp = await admin_client.post(eq_url(str(project.id)), json=data)
        assert resp.status_code == 200

    @pytest.mark.asyncio
    @pytest.mark.parametrize("field,valid_len,over_len", [
        ("equipment_type", 100, 101),
        ("manufacturer", 255, 256),
        ("model_number", 100, 101),
        ("serial_number", 100, 101),
        ("notes", 5000, 5001),
    ])
    async def test_field_over_max_length_rejected(self, admin_client, project, field, valid_len, over_len):
        data = {"name": "Test", field: "X" * over_len}
        resp = await admin_client.post(eq_url(str(project.id)), json=data)
        assert resp.status_code == 422


class TestParametrizedCamelCaseFields:

    @pytest.mark.asyncio
    @pytest.mark.parametrize("camel_field", [
        "equipmentType", "modelNumber", "serialNumber", "projectId",
        "createdAt", "updatedAt", "installationDate", "warrantyExpiry",
    ])
    async def test_camel_case_present_in_create(self, admin_client, project, camel_field):
        data = await create_eq(admin_client, project.id)
        assert camel_field in data

    @pytest.mark.asyncio
    @pytest.mark.parametrize("camel_field", [
        "equipmentType", "modelNumber", "serialNumber", "projectId",
        "createdAt", "updatedAt", "installationDate", "warrantyExpiry",
    ])
    async def test_camel_case_present_in_get(self, admin_client, project, camel_field):
        eq = await create_eq(admin_client, project.id)
        resp = await admin_client.get(eq_detail(str(project.id), eq["id"]))
        assert camel_field in resp.json()
