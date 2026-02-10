import uuid
from typing import Optional

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.approval import ApprovalRequest, ApprovalStep
from app.models.equipment import ApprovalStatus, Equipment
from app.models.project import Project, ProjectMember
from app.models.user import User

API_V1 = "/api/v1"
FAKE_PROJECT_ID = str(uuid.uuid4())
FAKE_EQUIPMENT_ID = str(uuid.uuid4())


def equipment_url(project_id: str) -> str:
    return f"{API_V1}/projects/{project_id}/equipment"


def equipment_detail_url(project_id: str, equipment_id: str) -> str:
    return f"{API_V1}/projects/{project_id}/equipment/{equipment_id}"


def equipment_submit_url(project_id: str, equipment_id: str) -> str:
    return f"{API_V1}/projects/{project_id}/equipment/{equipment_id}/submit"


def checklist_url(project_id: str, equipment_id: str) -> str:
    return f"{API_V1}/projects/{project_id}/equipment/{equipment_id}/checklists"


def valid_equipment_payload(**overrides) -> dict:
    base = {
        "name": "Test Crane XL",
        "equipment_type": "Crane",
        "manufacturer": "Caterpillar",
        "model_number": "CAT-320F",
        "serial_number": "SN-12345",
        "specifications": {"weight": "10 tons", "height": "50m"},
        "notes": "Standard construction crane",
    }
    base.update(overrides)
    return base


def valid_checklist_payload(**overrides) -> dict:
    base = {
        "checklist_name": "Safety Checklist",
        "items": [
            {"id": "item-1", "label": "Check brakes", "is_completed": False},
            {"id": "item-2", "label": "Check hydraulics", "is_completed": True, "notes": "Passed"},
        ],
    }
    base.update(overrides)
    return base


async def create_equipment_via_api(client: AsyncClient, project_id: str, payload: Optional[dict] = None) -> dict:
    data = payload or valid_equipment_payload()
    resp = await client.post(equipment_url(project_id), json=data)
    assert resp.status_code == 200
    return resp.json()


class TestCreateEquipment:

    async def test_create_equipment_success(self, admin_client: AsyncClient, project: Project):
        payload = valid_equipment_payload()
        resp = await admin_client.post(equipment_url(str(project.id)), json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["name"] == "Test Crane XL"
        assert data["status"] == "draft"
        assert "id" in data

    async def test_create_returns_camel_case_fields(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.post(equipment_url(str(project.id)), json=valid_equipment_payload())
        data = resp.json()
        assert "equipmentType" in data
        assert "modelNumber" in data
        assert "serialNumber" in data
        assert "projectId" in data
        assert "createdAt" in data
        assert "updatedAt" in data
        assert "installationDate" in data
        assert "warrantyExpiry" in data

    async def test_create_with_minimal_fields(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.post(equipment_url(str(project.id)), json={"name": "AB"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["name"] == "AB"
        assert data["equipmentType"] is None
        assert data["manufacturer"] is None

    async def test_create_with_dates(self, admin_client: AsyncClient, project: Project):
        payload = valid_equipment_payload(
            installation_date="2024-06-15T10:00:00",
            warranty_expiry="2025-06-15T10:00:00",
        )
        resp = await admin_client.post(equipment_url(str(project.id)), json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["installationDate"] is not None
        assert data["warrantyExpiry"] is not None

    async def test_create_with_null_dates(self, admin_client: AsyncClient, project: Project):
        payload = valid_equipment_payload(installation_date=None, warranty_expiry=None)
        resp = await admin_client.post(equipment_url(str(project.id)), json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["installationDate"] is None
        assert data["warrantyExpiry"] is None

    async def test_create_sets_project_id(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.post(equipment_url(str(project.id)), json=valid_equipment_payload())
        assert resp.json()["projectId"] == str(project.id)

    async def test_create_sets_created_by(self, admin_client: AsyncClient, project: Project, admin_user: User):
        resp = await admin_client.post(equipment_url(str(project.id)), json=valid_equipment_payload())
        data = resp.json()
        assert data["createdBy"] is not None
        assert data["createdBy"]["id"] == str(admin_user.id)

    async def test_create_checklists_empty_initially(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.post(equipment_url(str(project.id)), json=valid_equipment_payload())
        assert resp.json()["checklists"] == []

    @pytest.mark.parametrize("name,expected_status", [
        ("AB", 200),
        ("A" * 255, 200),
        ("Valid Equipment Name", 200),
        ("Crane-Model_v2.0 (Special)", 200),
    ])
    async def test_create_valid_names(self, admin_client: AsyncClient, project: Project, name, expected_status):
        resp = await admin_client.post(equipment_url(str(project.id)), json={"name": name})
        assert resp.status_code == expected_status

    @pytest.mark.parametrize("name,desc", [
        ("", "empty name"),
        ("A", "single char too short"),
        ("A" * 256, "256 chars too long"),
    ])
    async def test_create_invalid_names(self, admin_client: AsyncClient, project: Project, name, desc):
        resp = await admin_client.post(equipment_url(str(project.id)), json={"name": name})
        assert resp.status_code == 422, f"Failed for: {desc}"

    async def test_create_missing_name(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.post(equipment_url(str(project.id)), json={})
        assert resp.status_code == 422

    @pytest.mark.parametrize("field,value,expected_status", [
        ("equipment_type", "Crane", 200),
        ("equipment_type", None, 200),
        ("equipment_type", "A" * 100, 200),
        ("equipment_type", "A" * 101, 422),
        ("manufacturer", "Caterpillar Inc.", 200),
        ("manufacturer", None, 200),
        ("manufacturer", "A" * 255, 200),
        ("manufacturer", "A" * 256, 422),
        ("model_number", "CAT-320F", 200),
        ("model_number", None, 200),
        ("model_number", "A" * 100, 200),
        ("model_number", "A" * 101, 422),
        ("serial_number", "SN-12345", 200),
        ("serial_number", None, 200),
        ("serial_number", "A" * 100, 200),
        ("serial_number", "A" * 101, 422),
        ("notes", "Some notes here", 200),
        ("notes", None, 200),
        ("notes", "A" * 5000, 200),
        ("notes", "A" * 5001, 422),
    ])
    async def test_create_field_validation(
        self, admin_client: AsyncClient, project: Project, field, value, expected_status
    ):
        payload = {"name": "Test Equipment"}
        payload[field] = value
        resp = await admin_client.post(equipment_url(str(project.id)), json=payload)
        assert resp.status_code == expected_status, f"Field {field}={repr(value)[:50]} expected {expected_status}"


class TestCreateEquipmentSpecifications:

    @pytest.mark.parametrize("specs,expected_status", [
        (None, 200),
        ({}, 200),
        ({"key": "value"}, 200),
        ({"weight": "100kg", "height": "50m"}, 200),
        ({"flag": True}, 200),
        ({"count": 42}, 200),
        ({"ratio": 3.14}, 200),
        ({"empty_val": None}, 200),
        ({"bool_true": True, "bool_false": False, "int_val": 10, "float_val": 1.5, "str_val": "ok", "null_val": None}, 200),
    ])
    async def test_create_valid_specifications(
        self, admin_client: AsyncClient, project: Project, specs, expected_status
    ):
        payload = valid_equipment_payload(specifications=specs)
        resp = await admin_client.post(equipment_url(str(project.id)), json=payload)
        assert resp.status_code == expected_status

    async def test_create_specs_too_many_keys(self, admin_client: AsyncClient, project: Project):
        specs = {f"key_{i}": f"val_{i}" for i in range(51)}
        payload = valid_equipment_payload(specifications=specs)
        resp = await admin_client.post(equipment_url(str(project.id)), json=payload)
        assert resp.status_code == 422

    async def test_create_specs_exactly_50_keys(self, admin_client: AsyncClient, project: Project):
        specs = {f"key_{i}": f"val_{i}" for i in range(50)}
        payload = valid_equipment_payload(specifications=specs)
        resp = await admin_client.post(equipment_url(str(project.id)), json=payload)
        assert resp.status_code == 200

    async def test_create_specs_key_too_long(self, admin_client: AsyncClient, project: Project):
        specs = {"a" * 101: "value"}
        payload = valid_equipment_payload(specifications=specs)
        resp = await admin_client.post(equipment_url(str(project.id)), json=payload)
        assert resp.status_code == 422

    async def test_create_specs_key_max_length(self, admin_client: AsyncClient, project: Project):
        specs = {"a" * 100: "value"}
        payload = valid_equipment_payload(specifications=specs)
        resp = await admin_client.post(equipment_url(str(project.id)), json=payload)
        assert resp.status_code == 200

    async def test_create_specs_value_too_long(self, admin_client: AsyncClient, project: Project):
        specs = {"key": "x" * 501}
        payload = valid_equipment_payload(specifications=specs)
        resp = await admin_client.post(equipment_url(str(project.id)), json=payload)
        assert resp.status_code == 422

    async def test_create_specs_value_max_length(self, admin_client: AsyncClient, project: Project):
        specs = {"key": "x" * 500}
        payload = valid_equipment_payload(specifications=specs)
        resp = await admin_client.post(equipment_url(str(project.id)), json=payload)
        assert resp.status_code == 200

    @pytest.mark.parametrize("bad_value,desc", [
        ([1, 2, 3], "list value"),
        ({"nested": "dict"}, "nested dict value"),
        ([{"a": 1}], "list of dicts"),
    ])
    async def test_create_specs_invalid_value_types(
        self, admin_client: AsyncClient, project: Project, bad_value, desc
    ):
        specs = {"key": bad_value}
        payload = valid_equipment_payload(specifications=specs)
        resp = await admin_client.post(equipment_url(str(project.id)), json=payload)
        assert resp.status_code == 422, f"Should reject {desc}"


class TestCreateEquipmentXSSSanitization:

    @pytest.mark.parametrize("field", [
        "name", "equipment_type", "manufacturer", "model_number", "serial_number", "notes",
    ])
    @pytest.mark.parametrize("xss_payload,should_be_absent", [
        ('<script>alert("xss")</script>', "<script"),
        ('javascript:alert(1)', "javascript:"),
        ('<img src=x onerror=alert(1)>', "<img"),
        ('<iframe src="evil.com"></iframe>', "<iframe"),
        ('<svg onload=alert(1)></svg>', "<svg"),
        ('<object data="evil"></object>', "<object"),
        ('<embed src="evil">', "<embed"),
        ('<link rel="stylesheet" href="evil">', "<link"),
        ('<meta http-equiv="refresh">', "<meta"),
        ('<style>body{display:none}</style>', "<style"),
    ])
    async def test_xss_sanitization_on_fields(
        self, admin_client: AsyncClient, project: Project, field, xss_payload, should_be_absent
    ):
        if field == "name":
            payload = {"name": f"Safe {xss_payload} Name"}
        else:
            payload = {"name": "Safe Equipment"}
            payload[field] = f"Safe {xss_payload} Text"
        resp = await admin_client.post(equipment_url(str(project.id)), json=payload)
        if resp.status_code == 200:
            data = resp.json()
            camel_field = field
            if field == "equipment_type":
                camel_field = "equipmentType"
            elif field == "model_number":
                camel_field = "modelNumber"
            elif field == "serial_number":
                camel_field = "serialNumber"
            field_val = data.get(camel_field, data.get(field, ""))
            if field_val:
                assert should_be_absent not in field_val.lower()

    @pytest.mark.parametrize("xss_in_key", [
        '<script>alert(1)</script>',
        'onload=alert(1)',
    ])
    async def test_xss_sanitization_in_spec_keys(
        self, admin_client: AsyncClient, project: Project, xss_in_key
    ):
        payload = valid_equipment_payload(specifications={xss_in_key: "value", "safe_key": "safe"})
        resp = await admin_client.post(equipment_url(str(project.id)), json=payload)
        if resp.status_code == 200:
            specs = resp.json().get("specifications", {})
            for key in specs:
                assert "<script" not in key.lower()

    @pytest.mark.parametrize("xss_in_value", [
        '<script>alert(1)</script>',
        'javascript:void(0)',
        '<img src=x onerror=alert(1)>',
    ])
    async def test_xss_sanitization_in_spec_values(
        self, admin_client: AsyncClient, project: Project, xss_in_value
    ):
        payload = valid_equipment_payload(specifications={"key": xss_in_value})
        resp = await admin_client.post(equipment_url(str(project.id)), json=payload)
        if resp.status_code == 200:
            specs = resp.json().get("specifications", {})
            for val in specs.values():
                if isinstance(val, str):
                    assert "<script" not in val.lower()


class TestGetEquipment:

    async def test_get_equipment_by_id(self, admin_client: AsyncClient, project: Project):
        created = await create_equipment_via_api(admin_client, str(project.id))
        resp = await admin_client.get(equipment_detail_url(str(project.id), created["id"]))
        assert resp.status_code == 200
        assert resp.json()["id"] == created["id"]
        assert resp.json()["name"] == created["name"]

    async def test_get_equipment_returns_camel_case(self, admin_client: AsyncClient, project: Project):
        created = await create_equipment_via_api(admin_client, str(project.id))
        resp = await admin_client.get(equipment_detail_url(str(project.id), created["id"]))
        data = resp.json()
        assert "equipmentType" in data
        assert "modelNumber" in data
        assert "serialNumber" in data
        assert "projectId" in data
        assert "createdAt" in data
        assert "updatedAt" in data

    async def test_get_nonexistent_equipment(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.get(equipment_detail_url(str(project.id), FAKE_EQUIPMENT_ID))
        assert resp.status_code == 404

    async def test_get_equipment_nonexistent_project(self, admin_client: AsyncClient):
        resp = await admin_client.get(equipment_detail_url(FAKE_PROJECT_ID, FAKE_EQUIPMENT_ID))
        assert resp.status_code == 403

    async def test_get_equipment_wrong_project(self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User):
        created = await create_equipment_via_api(admin_client, str(project.id))
        other_project = Project(
            id=uuid.uuid4(), name="Other Project", code="OTH-001",
            status="active", created_by_id=admin_user.id,
        )
        db.add(other_project)
        await db.flush()
        db.add(ProjectMember(project_id=other_project.id, user_id=admin_user.id, role="project_admin"))
        await db.commit()
        resp = await admin_client.get(equipment_detail_url(str(other_project.id), created["id"]))
        assert resp.status_code == 404

    async def test_get_equipment_includes_checklists(self, admin_client: AsyncClient, project: Project):
        created = await create_equipment_via_api(admin_client, str(project.id))
        await admin_client.post(
            checklist_url(str(project.id), created["id"]),
            json=valid_checklist_payload(),
        )
        resp = await admin_client.get(equipment_detail_url(str(project.id), created["id"]))
        data = resp.json()
        assert len(data["checklists"]) == 1


class TestListEquipment:

    async def test_list_empty(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.get(equipment_url(str(project.id)))
        assert resp.status_code == 200
        assert resp.json() == []

    async def test_list_single_item(self, admin_client: AsyncClient, project: Project):
        await create_equipment_via_api(admin_client, str(project.id))
        resp = await admin_client.get(equipment_url(str(project.id)))
        assert resp.status_code == 200
        assert len(resp.json()) == 1

    async def test_list_multiple_items(self, admin_client: AsyncClient, project: Project):
        for i in range(3):
            await create_equipment_via_api(
                admin_client, str(project.id), {"name": f"Equipment {i}"}
            )
        resp = await admin_client.get(equipment_url(str(project.id)))
        assert resp.status_code == 200
        assert len(resp.json()) == 3

    async def test_list_scoped_to_project(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        await create_equipment_via_api(admin_client, str(project.id))
        other_project = Project(
            id=uuid.uuid4(), name="Other", code="OTH-002",
            status="active", created_by_id=admin_user.id,
        )
        db.add(other_project)
        await db.flush()
        db.add(ProjectMember(project_id=other_project.id, user_id=admin_user.id, role="project_admin"))
        await db.commit()
        resp = await admin_client.get(equipment_url(str(other_project.id)))
        assert resp.status_code == 200
        assert len(resp.json()) == 0

    async def test_list_returns_camel_case(self, admin_client: AsyncClient, project: Project):
        await create_equipment_via_api(admin_client, str(project.id))
        resp = await admin_client.get(equipment_url(str(project.id)))
        item = resp.json()[0]
        assert "equipmentType" in item
        assert "modelNumber" in item


class TestFlatListEquipment:

    async def test_flat_list_no_filter(self, admin_client: AsyncClient, project: Project):
        await create_equipment_via_api(admin_client, str(project.id))
        resp = await admin_client.get(f"{API_V1}/equipment")
        assert resp.status_code == 200
        assert len(resp.json()) >= 1

    async def test_flat_list_with_project_filter(self, admin_client: AsyncClient, project: Project):
        await create_equipment_via_api(admin_client, str(project.id))
        resp = await admin_client.get(f"{API_V1}/equipment", params={"project_id": str(project.id)})
        assert resp.status_code == 200
        assert len(resp.json()) == 1
        assert resp.json()[0]["projectId"] == str(project.id)

    async def test_flat_list_with_nonexistent_project_filter(self, admin_client: AsyncClient, project: Project):
        await create_equipment_via_api(admin_client, str(project.id))
        resp = await admin_client.get(f"{API_V1}/equipment", params={"project_id": FAKE_PROJECT_ID})
        assert resp.status_code == 200
        assert len(resp.json()) == 0

    async def test_flat_list_without_filter_returns_all(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        await create_equipment_via_api(admin_client, str(project.id), {"name": "Equip A"})
        other_project = Project(
            id=uuid.uuid4(), name="Other", code="OTH-003",
            status="active", created_by_id=admin_user.id,
        )
        db.add(other_project)
        await db.flush()
        db.add(ProjectMember(project_id=other_project.id, user_id=admin_user.id, role="project_admin"))
        await db.commit()
        await create_equipment_via_api(admin_client, str(other_project.id), {"name": "Equip B"})
        resp = await admin_client.get(f"{API_V1}/equipment")
        assert resp.status_code == 200
        assert len(resp.json()) >= 2

    async def test_flat_list_empty(self, admin_client: AsyncClient):
        resp = await admin_client.get(f"{API_V1}/equipment")
        assert resp.status_code == 200
        assert resp.json() == []

    async def test_flat_list_returns_camel_case(self, admin_client: AsyncClient, project: Project):
        await create_equipment_via_api(admin_client, str(project.id))
        resp = await admin_client.get(f"{API_V1}/equipment")
        item = resp.json()[0]
        assert "equipmentType" in item
        assert "serialNumber" in item


class TestUpdateEquipment:

    async def test_update_name(self, admin_client: AsyncClient, project: Project):
        created = await create_equipment_via_api(admin_client, str(project.id))
        resp = await admin_client.put(
            equipment_detail_url(str(project.id), created["id"]),
            json={"name": "Updated Name"},
        )
        assert resp.status_code == 200
        assert resp.json()["name"] == "Updated Name"

    @pytest.mark.parametrize("field,value,camel_key", [
        ("name", "New Name", "name"),
        ("equipment_type", "Excavator", "equipmentType"),
        ("manufacturer", "Komatsu", "manufacturer"),
        ("model_number", "KOM-100", "modelNumber"),
        ("serial_number", "SN-99999", "serialNumber"),
        ("notes", "Updated notes here", "notes"),
    ])
    async def test_update_individual_string_fields(
        self, admin_client: AsyncClient, project: Project, field, value, camel_key
    ):
        created = await create_equipment_via_api(admin_client, str(project.id))
        resp = await admin_client.put(
            equipment_detail_url(str(project.id), created["id"]),
            json={field: value},
        )
        assert resp.status_code == 200
        assert resp.json()[camel_key] == value

    async def test_update_specifications(self, admin_client: AsyncClient, project: Project):
        created = await create_equipment_via_api(admin_client, str(project.id))
        new_specs = {"power": "500hp", "fuel": "diesel"}
        resp = await admin_client.put(
            equipment_detail_url(str(project.id), created["id"]),
            json={"specifications": new_specs},
        )
        assert resp.status_code == 200
        assert resp.json()["specifications"] == new_specs

    async def test_update_dates(self, admin_client: AsyncClient, project: Project):
        created = await create_equipment_via_api(admin_client, str(project.id))
        resp = await admin_client.put(
            equipment_detail_url(str(project.id), created["id"]),
            json={
                "installation_date": "2024-01-15T08:00:00",
                "warranty_expiry": "2026-01-15T08:00:00",
            },
        )
        assert resp.status_code == 200
        assert resp.json()["installationDate"] is not None
        assert resp.json()["warrantyExpiry"] is not None

    async def test_update_preserves_unchanged_fields(self, admin_client: AsyncClient, project: Project):
        created = await create_equipment_via_api(admin_client, str(project.id))
        original_type = created["equipmentType"]
        resp = await admin_client.put(
            equipment_detail_url(str(project.id), created["id"]),
            json={"name": "Only Name Changed"},
        )
        assert resp.status_code == 200
        assert resp.json()["equipmentType"] == original_type

    async def test_update_nonexistent_equipment(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.put(
            equipment_detail_url(str(project.id), FAKE_EQUIPMENT_ID),
            json={"name": "Ghost"},
        )
        assert resp.status_code == 404

    async def test_update_returns_camel_case(self, admin_client: AsyncClient, project: Project):
        created = await create_equipment_via_api(admin_client, str(project.id))
        resp = await admin_client.put(
            equipment_detail_url(str(project.id), created["id"]),
            json={"name": "Camel Test"},
        )
        data = resp.json()
        assert "equipmentType" in data
        assert "modelNumber" in data
        assert "serialNumber" in data

    @pytest.mark.parametrize("name,expected_status", [
        ("AB", 200),
        ("A" * 255, 200),
        ("A", 422),
        ("", 422),
        ("A" * 256, 422),
    ])
    async def test_update_name_validation(
        self, admin_client: AsyncClient, project: Project, name, expected_status
    ):
        created = await create_equipment_via_api(admin_client, str(project.id))
        resp = await admin_client.put(
            equipment_detail_url(str(project.id), created["id"]),
            json={"name": name},
        )
        assert resp.status_code == expected_status

    @pytest.mark.parametrize("field,value,expected_status", [
        ("equipment_type", "A" * 101, 422),
        ("manufacturer", "A" * 256, 422),
        ("model_number", "A" * 101, 422),
        ("serial_number", "A" * 101, 422),
        ("notes", "A" * 5001, 422),
        ("equipment_type", "A" * 100, 200),
        ("manufacturer", "A" * 255, 200),
        ("model_number", "A" * 100, 200),
        ("serial_number", "A" * 100, 200),
        ("notes", "A" * 5000, 200),
    ])
    async def test_update_field_length_validation(
        self, admin_client: AsyncClient, project: Project, field, value, expected_status
    ):
        created = await create_equipment_via_api(admin_client, str(project.id))
        resp = await admin_client.put(
            equipment_detail_url(str(project.id), created["id"]),
            json={field: value},
        )
        assert resp.status_code == expected_status

    @pytest.mark.parametrize("field", [
        "name", "equipment_type", "manufacturer", "model_number", "serial_number", "notes",
    ])
    async def test_update_xss_sanitization(self, admin_client: AsyncClient, project: Project, field):
        created = await create_equipment_via_api(admin_client, str(project.id))
        xss = '<script>alert("xss")</script>'
        val = f"Safe {xss}" if field != "name" else f"Safe {xss} Name"
        resp = await admin_client.put(
            equipment_detail_url(str(project.id), created["id"]),
            json={field: val},
        )
        if resp.status_code == 200:
            data = resp.json()
            camel_map = {
                "name": "name", "equipment_type": "equipmentType",
                "manufacturer": "manufacturer", "model_number": "modelNumber",
                "serial_number": "serialNumber", "notes": "notes",
            }
            result_val = data.get(camel_map[field], "")
            if result_val:
                assert "<script" not in result_val.lower()

    async def test_update_specs_invalid_value_type(self, admin_client: AsyncClient, project: Project):
        created = await create_equipment_via_api(admin_client, str(project.id))
        resp = await admin_client.put(
            equipment_detail_url(str(project.id), created["id"]),
            json={"specifications": {"key": [1, 2, 3]}},
        )
        assert resp.status_code == 422

    async def test_update_specs_too_many_keys(self, admin_client: AsyncClient, project: Project):
        created = await create_equipment_via_api(admin_client, str(project.id))
        specs = {f"k{i}": f"v{i}" for i in range(51)}
        resp = await admin_client.put(
            equipment_detail_url(str(project.id), created["id"]),
            json={"specifications": specs},
        )
        assert resp.status_code == 422


class TestDeleteEquipment:

    async def test_delete_equipment_success(self, admin_client: AsyncClient, project: Project):
        created = await create_equipment_via_api(admin_client, str(project.id))
        resp = await admin_client.delete(equipment_detail_url(str(project.id), created["id"]))
        assert resp.status_code == 200
        assert resp.json()["message"] == "Equipment deleted"

    async def test_delete_then_get_returns_404(self, admin_client: AsyncClient, project: Project):
        created = await create_equipment_via_api(admin_client, str(project.id))
        await admin_client.delete(equipment_detail_url(str(project.id), created["id"]))
        resp = await admin_client.get(equipment_detail_url(str(project.id), created["id"]))
        assert resp.status_code == 404

    async def test_delete_nonexistent_equipment(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.delete(equipment_detail_url(str(project.id), FAKE_EQUIPMENT_ID))
        assert resp.status_code == 404

    async def test_delete_removes_from_list(self, admin_client: AsyncClient, project: Project):
        created = await create_equipment_via_api(admin_client, str(project.id))
        await admin_client.delete(equipment_detail_url(str(project.id), created["id"]))
        resp = await admin_client.get(equipment_url(str(project.id)))
        assert len(resp.json()) == 0


class TestAuthRequirements:

    @pytest.mark.parametrize("method,url_func,needs_body", [
        ("POST", lambda pid: equipment_url(pid), True),
        ("PUT", lambda pid: equipment_detail_url(pid, FAKE_EQUIPMENT_ID), True),
        ("DELETE", lambda pid: equipment_detail_url(pid, FAKE_EQUIPMENT_ID), False),
        ("POST", lambda pid: equipment_submit_url(pid, FAKE_EQUIPMENT_ID), False),
    ])
    async def test_unauthenticated_returns_401(
        self, client: AsyncClient, project: Project, method, url_func, needs_body
    ):
        url = url_func(str(project.id))
        kwargs = {}
        if needs_body:
            kwargs["json"] = valid_equipment_payload()
        resp = await client.request(method, url, **kwargs)
        assert resp.status_code == 401

    async def test_list_requires_auth(self, client: AsyncClient, project: Project):
        resp = await client.get(equipment_url(str(project.id)))
        assert resp.status_code == 401

    async def test_flat_list_requires_auth(self, client: AsyncClient):
        resp = await client.get(f"{API_V1}/equipment")
        assert resp.status_code == 401

    async def test_get_detail_requires_auth(self, client: AsyncClient, project: Project):
        resp = await client.get(equipment_detail_url(str(project.id), FAKE_EQUIPMENT_ID))
        assert resp.status_code == 401

    async def test_create_with_user_client(self, user_client: AsyncClient, project: Project, db: AsyncSession, regular_user: User):
        db.add(ProjectMember(project_id=project.id, user_id=regular_user.id, role="contractor"))
        await db.commit()
        resp = await user_client.post(equipment_url(str(project.id)), json=valid_equipment_payload())
        assert resp.status_code == 200

    async def test_update_with_user_client(self, user_client: AsyncClient, admin_client: AsyncClient, project: Project, db: AsyncSession, regular_user: User):
        db.add(ProjectMember(project_id=project.id, user_id=regular_user.id, role="contractor"))
        await db.commit()
        created = await create_equipment_via_api(admin_client, str(project.id))
        resp = await user_client.put(
            equipment_detail_url(str(project.id), created["id"]),
            json={"name": "User Updated"},
        )
        assert resp.status_code == 200

    async def test_delete_with_user_client(self, user_client: AsyncClient, admin_client: AsyncClient, project: Project, db: AsyncSession, regular_user: User):
        db.add(ProjectMember(project_id=project.id, user_id=regular_user.id, role="contractor"))
        await db.commit()
        created = await create_equipment_via_api(admin_client, str(project.id))
        resp = await user_client.delete(equipment_detail_url(str(project.id), created["id"]))
        assert resp.status_code == 200


class TestSubmitForApproval:

    async def test_submit_changes_status_to_submitted(self, admin_client: AsyncClient, project: Project):
        created = await create_equipment_via_api(admin_client, str(project.id))
        resp = await admin_client.post(equipment_submit_url(str(project.id), created["id"]))
        assert resp.status_code == 200
        assert resp.json()["status"] == "submitted"

    async def test_submit_creates_approval_request(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession
    ):
        created = await create_equipment_via_api(admin_client, str(project.id))
        await admin_client.post(equipment_submit_url(str(project.id), created["id"]))
        result = await db.execute(
            select(ApprovalRequest).where(
                ApprovalRequest.entity_id == uuid.UUID(created["id"]),
                ApprovalRequest.entity_type == "equipment",
            )
        )
        approval = result.scalar_one_or_none()
        assert approval is not None
        assert approval.current_status == "submitted"
        assert approval.project_id == project.id

    async def test_submit_creates_two_approval_steps(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession
    ):
        created = await create_equipment_via_api(admin_client, str(project.id))
        await admin_client.post(equipment_submit_url(str(project.id), created["id"]))
        result = await db.execute(
            select(ApprovalRequest).where(
                ApprovalRequest.entity_id == uuid.UUID(created["id"]),
            )
        )
        approval = result.scalar_one()
        steps_result = await db.execute(
            select(ApprovalStep).where(ApprovalStep.approval_request_id == approval.id)
            .order_by(ApprovalStep.step_order)
        )
        steps = steps_result.scalars().all()
        assert len(steps) == 2
        assert steps[0].step_order == 1
        assert steps[0].approver_role == "consultant"
        assert steps[1].step_order == 2
        assert steps[1].approver_role == "inspector"

    async def test_submit_nonexistent_equipment(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.post(equipment_submit_url(str(project.id), FAKE_EQUIPMENT_ID))
        assert resp.status_code == 404

    async def test_submit_returns_camel_case(self, admin_client: AsyncClient, project: Project):
        created = await create_equipment_via_api(admin_client, str(project.id))
        resp = await admin_client.post(equipment_submit_url(str(project.id), created["id"]))
        data = resp.json()
        assert "equipmentType" in data
        assert "projectId" in data

    async def test_submit_unauthenticated(self, client: AsyncClient, db: AsyncSession, project: Project, admin_user: User):
        equip = Equipment(
            id=uuid.uuid4(), project_id=project.id, name="Submit Test",
            status=ApprovalStatus.DRAFT.value, created_by_id=admin_user.id,
        )
        db.add(equip)
        await db.flush()
        resp = await client.post(equipment_submit_url(str(project.id), str(equip.id)))
        assert resp.status_code == 401


class TestChecklistOperations:

    async def test_create_checklist_success(self, admin_client: AsyncClient, project: Project):
        created = await create_equipment_via_api(admin_client, str(project.id))
        resp = await admin_client.post(
            checklist_url(str(project.id), created["id"]),
            json=valid_checklist_payload(),
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["checklistName"] == "Safety Checklist"
        assert len(data["items"]) == 2

    async def test_create_checklist_returns_camel_case(self, admin_client: AsyncClient, project: Project):
        created = await create_equipment_via_api(admin_client, str(project.id))
        resp = await admin_client.post(
            checklist_url(str(project.id), created["id"]),
            json=valid_checklist_payload(),
        )
        data = resp.json()
        assert "checklistName" in data
        assert "equipmentId" in data
        assert "createdAt" in data

    async def test_create_checklist_with_completed_items(self, admin_client: AsyncClient, project: Project):
        created = await create_equipment_via_api(admin_client, str(project.id))
        payload = {
            "checklist_name": "Completion Check",
            "items": [
                {
                    "id": "c1",
                    "label": "Item done",
                    "is_completed": True,
                    "notes": "Completed by inspector",
                },
            ],
        }
        resp = await admin_client.post(checklist_url(str(project.id), created["id"]), json=payload)
        assert resp.status_code == 200
        assert resp.json()["items"][0]["is_completed"] is True

    @pytest.mark.parametrize("checklist_name,expected_status", [
        ("AB", 200),
        ("A" * 255, 200),
        ("A", 422),
        ("", 422),
        ("A" * 256, 422),
    ])
    async def test_checklist_name_validation(
        self, admin_client: AsyncClient, project: Project, checklist_name, expected_status
    ):
        created = await create_equipment_via_api(admin_client, str(project.id))
        payload = valid_checklist_payload(checklist_name=checklist_name)
        resp = await admin_client.post(checklist_url(str(project.id), created["id"]), json=payload)
        assert resp.status_code == expected_status

    async def test_checklist_empty_items_list(self, admin_client: AsyncClient, project: Project):
        created = await create_equipment_via_api(admin_client, str(project.id))
        payload = {"checklist_name": "Empty Checklist", "items": []}
        resp = await admin_client.post(checklist_url(str(project.id), created["id"]), json=payload)
        assert resp.status_code == 200
        assert resp.json()["items"] == []

    async def test_checklist_too_many_items(self, admin_client: AsyncClient, project: Project):
        created = await create_equipment_via_api(admin_client, str(project.id))
        items = [{"id": f"item-{i}", "label": f"Item {i}"} for i in range(101)]
        payload = {"checklist_name": "Too Many", "items": items}
        resp = await admin_client.post(checklist_url(str(project.id), created["id"]), json=payload)
        assert resp.status_code == 422

    async def test_checklist_max_items(self, admin_client: AsyncClient, project: Project):
        created = await create_equipment_via_api(admin_client, str(project.id))
        items = [{"id": f"item-{i}", "label": f"Item {i}"} for i in range(100)]
        payload = {"checklist_name": "Max Items", "items": items}
        resp = await admin_client.post(checklist_url(str(project.id), created["id"]), json=payload)
        assert resp.status_code == 200
        assert len(resp.json()["items"]) == 100

    @pytest.mark.parametrize("item_label,expected_status", [
        ("A", 200),
        ("A" * 255, 200),
        ("", 422),
        ("A" * 256, 422),
    ])
    async def test_checklist_item_label_validation(
        self, admin_client: AsyncClient, project: Project, item_label, expected_status
    ):
        created = await create_equipment_via_api(admin_client, str(project.id))
        payload = {
            "checklist_name": "Label Test",
            "items": [{"id": "t1", "label": item_label}],
        }
        resp = await admin_client.post(checklist_url(str(project.id), created["id"]), json=payload)
        assert resp.status_code == expected_status

    @pytest.mark.parametrize("item_id,expected_status", [
        ("valid-id", 200),
        ("a" * 100, 200),
        ("a" * 101, 422),
    ])
    async def test_checklist_item_id_validation(
        self, admin_client: AsyncClient, project: Project, item_id, expected_status
    ):
        created = await create_equipment_via_api(admin_client, str(project.id))
        payload = {
            "checklist_name": "ID Test",
            "items": [{"id": item_id, "label": "Some label"}],
        }
        resp = await admin_client.post(checklist_url(str(project.id), created["id"]), json=payload)
        assert resp.status_code == expected_status

    async def test_checklist_item_notes_too_long(self, admin_client: AsyncClient, project: Project):
        created = await create_equipment_via_api(admin_client, str(project.id))
        payload = {
            "checklist_name": "Notes Test",
            "items": [{"id": "n1", "label": "Check", "notes": "A" * 5001}],
        }
        resp = await admin_client.post(checklist_url(str(project.id), created["id"]), json=payload)
        assert resp.status_code == 422

    async def test_checklist_item_notes_max_length(self, admin_client: AsyncClient, project: Project):
        created = await create_equipment_via_api(admin_client, str(project.id))
        payload = {
            "checklist_name": "Notes Max",
            "items": [{"id": "n2", "label": "Check", "notes": "A" * 5000}],
        }
        resp = await admin_client.post(checklist_url(str(project.id), created["id"]), json=payload)
        assert resp.status_code == 200

    @pytest.mark.parametrize("xss_target", ["checklist_name", "item_label", "item_notes"])
    async def test_checklist_xss_sanitization(
        self, admin_client: AsyncClient, project: Project, xss_target
    ):
        created = await create_equipment_via_api(admin_client, str(project.id))
        xss = '<script>alert("xss")</script>'
        if xss_target == "checklist_name":
            payload = {
                "checklist_name": f"Safe {xss} Name",
                "items": [{"id": "x1", "label": "Normal"}],
            }
        elif xss_target == "item_label":
            payload = {
                "checklist_name": "Normal",
                "items": [{"id": "x1", "label": f"Safe {xss} Label"}],
            }
        else:
            payload = {
                "checklist_name": "Normal",
                "items": [{"id": "x1", "label": "Check", "notes": f"Safe {xss} Notes"}],
            }
        resp = await admin_client.post(checklist_url(str(project.id), created["id"]), json=payload)
        if resp.status_code == 200:
            data = resp.json()
            if xss_target == "checklist_name":
                assert "<script" not in data["checklistName"].lower()
            elif xss_target == "item_label":
                assert "<script" not in data["items"][0]["label"].lower()
            else:
                assert "<script" not in data["items"][0]["notes"].lower()

    async def test_multiple_checklists_per_equipment(self, admin_client: AsyncClient, project: Project):
        created = await create_equipment_via_api(admin_client, str(project.id))
        for i in range(3):
            resp = await admin_client.post(
                checklist_url(str(project.id), created["id"]),
                json={"checklist_name": f"Checklist {i}", "items": [{"id": f"i{i}", "label": f"L{i}"}]},
            )
            assert resp.status_code == 200
        detail = await admin_client.get(equipment_detail_url(str(project.id), created["id"]))
        assert len(detail.json()["checklists"]) == 3


class TestCRUDFullWorkflow:

    async def test_full_crud_lifecycle(self, admin_client: AsyncClient, project: Project):
        payload = valid_equipment_payload()
        create_resp = await admin_client.post(equipment_url(str(project.id)), json=payload)
        assert create_resp.status_code == 200
        eq_id = create_resp.json()["id"]

        get_resp = await admin_client.get(equipment_detail_url(str(project.id), eq_id))
        assert get_resp.status_code == 200
        assert get_resp.json()["name"] == payload["name"]

        list_resp = await admin_client.get(equipment_url(str(project.id)))
        assert any(e["id"] == eq_id for e in list_resp.json())

        update_resp = await admin_client.put(
            equipment_detail_url(str(project.id), eq_id),
            json={"name": "Updated Crane", "notes": "Modified"},
        )
        assert update_resp.status_code == 200
        assert update_resp.json()["name"] == "Updated Crane"
        assert update_resp.json()["notes"] == "Modified"

        delete_resp = await admin_client.delete(equipment_detail_url(str(project.id), eq_id))
        assert delete_resp.status_code == 200

        gone_resp = await admin_client.get(equipment_detail_url(str(project.id), eq_id))
        assert gone_resp.status_code == 404

    async def test_create_submit_workflow(self, admin_client: AsyncClient, project: Project, db: AsyncSession):
        created = await create_equipment_via_api(admin_client, str(project.id))
        assert created["status"] == "draft"

        submit_resp = await admin_client.post(equipment_submit_url(str(project.id), created["id"]))
        assert submit_resp.status_code == 200
        assert submit_resp.json()["status"] == "submitted"

        get_resp = await admin_client.get(equipment_detail_url(str(project.id), created["id"]))
        assert get_resp.json()["status"] == "submitted"

    async def test_create_add_checklist_then_submit(self, admin_client: AsyncClient, project: Project):
        created = await create_equipment_via_api(admin_client, str(project.id))
        cl_resp = await admin_client.post(
            checklist_url(str(project.id), created["id"]),
            json=valid_checklist_payload(),
        )
        assert cl_resp.status_code == 200
        submit_resp = await admin_client.post(equipment_submit_url(str(project.id), created["id"]))
        assert submit_resp.status_code == 200
        assert submit_resp.json()["status"] == "submitted"


class TestResponseFormat:

    async def test_response_has_all_expected_fields(self, admin_client: AsyncClient, project: Project):
        created = await create_equipment_via_api(admin_client, str(project.id))
        resp = await admin_client.get(equipment_detail_url(str(project.id), created["id"]))
        data = resp.json()
        expected_fields = [
            "id", "projectId", "name", "equipmentType", "manufacturer",
            "modelNumber", "serialNumber", "specifications", "installationDate",
            "warrantyExpiry", "notes", "status", "createdAt", "updatedAt",
            "createdBy", "checklists",
        ]
        for field in expected_fields:
            assert field in data, f"Missing field: {field}"

    async def test_response_id_is_uuid_string(self, admin_client: AsyncClient, project: Project):
        created = await create_equipment_via_api(admin_client, str(project.id))
        try:
            uuid.UUID(created["id"])
        except ValueError:
            pytest.fail("id is not a valid UUID string")

    async def test_response_project_id_matches(self, admin_client: AsyncClient, project: Project):
        created = await create_equipment_via_api(admin_client, str(project.id))
        assert created["projectId"] == str(project.id)

    async def test_response_created_by_structure(self, admin_client: AsyncClient, project: Project):
        created = await create_equipment_via_api(admin_client, str(project.id))
        cb = created["createdBy"]
        assert cb is not None
        assert "id" in cb
        assert "email" in cb

    @pytest.mark.parametrize("camel_field,snake_input", [
        ("equipmentType", "equipment_type"),
        ("modelNumber", "model_number"),
        ("serialNumber", "serial_number"),
        ("projectId", None),
        ("createdAt", None),
        ("updatedAt", None),
        ("installationDate", "installation_date"),
        ("warrantyExpiry", "warranty_expiry"),
    ])
    async def test_camel_case_field_present(
        self, admin_client: AsyncClient, project: Project, camel_field, snake_input
    ):
        payload = valid_equipment_payload()
        if snake_input and snake_input in payload:
            pass
        resp = await admin_client.post(equipment_url(str(project.id)), json=payload)
        assert camel_field in resp.json()

    async def test_list_response_is_array(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.get(equipment_url(str(project.id)))
        assert isinstance(resp.json(), list)

    async def test_flat_list_response_is_array(self, admin_client: AsyncClient):
        resp = await admin_client.get(f"{API_V1}/equipment")
        assert isinstance(resp.json(), list)


class TestDatetimeFields:

    @pytest.mark.parametrize("date_str", [
        "2024-01-15T10:00:00",
        "2024-12-31T23:59:59",
        "2025-06-15T00:00:00",
    ])
    async def test_valid_installation_dates(self, admin_client: AsyncClient, project: Project, date_str):
        payload = valid_equipment_payload(installation_date=date_str)
        resp = await admin_client.post(equipment_url(str(project.id)), json=payload)
        assert resp.status_code == 200
        assert resp.json()["installationDate"] is not None

    @pytest.mark.parametrize("date_str", [
        "2024-01-15T10:00:00",
        "2026-12-31T23:59:59",
    ])
    async def test_valid_warranty_expiry_dates(self, admin_client: AsyncClient, project: Project, date_str):
        payload = valid_equipment_payload(warranty_expiry=date_str)
        resp = await admin_client.post(equipment_url(str(project.id)), json=payload)
        assert resp.status_code == 200
        assert resp.json()["warrantyExpiry"] is not None

    async def test_null_installation_date(self, admin_client: AsyncClient, project: Project):
        payload = valid_equipment_payload(installation_date=None)
        resp = await admin_client.post(equipment_url(str(project.id)), json=payload)
        assert resp.status_code == 200
        assert resp.json()["installationDate"] is None

    async def test_null_warranty_expiry(self, admin_client: AsyncClient, project: Project):
        payload = valid_equipment_payload(warranty_expiry=None)
        resp = await admin_client.post(equipment_url(str(project.id)), json=payload)
        assert resp.status_code == 200
        assert resp.json()["warrantyExpiry"] is None

    @pytest.mark.parametrize("bad_date", [
        "not-a-date",
        "2024-13-01T00:00:00",
        "yesterday",
    ])
    async def test_invalid_date_formats(self, admin_client: AsyncClient, project: Project, bad_date):
        payload = valid_equipment_payload(installation_date=bad_date)
        resp = await admin_client.post(equipment_url(str(project.id)), json=payload)
        assert resp.status_code == 422


class TestNotFoundResponses:

    @pytest.mark.parametrize("method,path_func,body", [
        ("GET", lambda: equipment_detail_url(FAKE_PROJECT_ID, FAKE_EQUIPMENT_ID), None),
        ("PUT", lambda: equipment_detail_url(FAKE_PROJECT_ID, FAKE_EQUIPMENT_ID), {"name": "Ghost"}),
        ("DELETE", lambda: equipment_detail_url(FAKE_PROJECT_ID, FAKE_EQUIPMENT_ID), None),
        ("POST", lambda: equipment_submit_url(FAKE_PROJECT_ID, FAKE_EQUIPMENT_ID), None),
    ])
    async def test_403_for_nonexistent_project(
        self, admin_client: AsyncClient, method, path_func, body
    ):
        kwargs = {}
        if body:
            kwargs["json"] = body
        resp = await admin_client.request(method, path_func(), **kwargs)
        assert resp.status_code == 403

    async def test_get_invalid_uuid_format(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.get(
            f"{API_V1}/projects/{project.id}/equipment/not-a-uuid"
        )
        assert resp.status_code == 422


class TestParametrizedCreateAllFields:

    @pytest.mark.parametrize("payload,expected_status,desc", [
        ({"name": "AB"}, 200, "minimal payload"),
        ({"name": "AB", "equipment_type": "Crane"}, 200, "with equipment_type"),
        ({"name": "AB", "manufacturer": "CAT"}, 200, "with manufacturer"),
        ({"name": "AB", "model_number": "M1"}, 200, "with model_number"),
        ({"name": "AB", "serial_number": "S1"}, 200, "with serial_number"),
        ({"name": "AB", "specifications": {"k": "v"}}, 200, "with specs"),
        ({"name": "AB", "notes": "Some notes"}, 200, "with notes"),
        ({"name": "AB", "installation_date": "2024-01-01T00:00:00"}, 200, "with install date"),
        ({"name": "AB", "warranty_expiry": "2025-01-01T00:00:00"}, 200, "with warranty"),
        (
            {
                "name": "Full Equipment",
                "equipment_type": "Generator",
                "manufacturer": "Honda",
                "model_number": "EU2200i",
                "serial_number": "GEN-001",
                "specifications": {"power": "2200W", "fuel": "gasoline", "portable": True},
                "installation_date": "2024-03-01T08:00:00",
                "warranty_expiry": "2027-03-01T08:00:00",
                "notes": "Backup generator for site office",
            },
            200,
            "all fields populated",
        ),
        ({}, 422, "empty payload"),
        ({"equipment_type": "Crane"}, 422, "missing name"),
        ({"name": ""}, 422, "empty name string"),
        ({"name": "A"}, 422, "name too short"),
        ({"name": "A" * 256}, 422, "name too long"),
    ])
    async def test_create_parametrized(
        self, admin_client: AsyncClient, project: Project, payload, expected_status, desc
    ):
        resp = await admin_client.post(equipment_url(str(project.id)), json=payload)
        assert resp.status_code == expected_status, f"Failed: {desc}"


class TestParametrizedSpecsEdgeCases:

    @pytest.mark.parametrize("specs,expected_status,desc", [
        (None, 200, "null specs"),
        ({}, 200, "empty dict"),
        ({"a": "b"}, 200, "single string pair"),
        ({"num": 42}, 200, "integer value"),
        ({"flt": 3.14}, 200, "float value"),
        ({"flag": True}, 200, "bool true"),
        ({"flag": False}, 200, "bool false"),
        ({"empty": None}, 200, "null value"),
        ({"k": "v" * 500}, 200, "max length value"),
        ({"k": "v" * 501}, 422, "value too long"),
        ({"k" * 100: "v"}, 200, "max length key"),
        ({"k" * 101: "v"}, 422, "key too long"),
        ({f"k{i}": "v" for i in range(50)}, 200, "50 keys (max)"),
        ({f"k{i}": "v" for i in range(51)}, 422, "51 keys (over max)"),
        ({"k": [1, 2]}, 422, "list value"),
        ({"k": {"nested": "dict"}}, 422, "nested dict value"),
        ({"k": [{"a": 1}]}, 422, "list of dicts value"),
        ({"mixed": "str", "num": 1, "b": True, "n": None}, 200, "mixed valid types"),
    ])
    async def test_specs_edge_cases(
        self, admin_client: AsyncClient, project: Project, specs, expected_status, desc
    ):
        payload = {"name": "Spec Test Equipment", "specifications": specs}
        if specs is None:
            payload.pop("specifications")
            payload["specifications"] = None
        resp = await admin_client.post(equipment_url(str(project.id)), json=payload)
        assert resp.status_code == expected_status, f"Failed: {desc}"


class TestParametrizedXSSAllFields:

    XSS_VECTORS = [
        ('<script>alert("xss")</script>', "<script"),
        ('javascript:alert(1)', "javascript:"),
        ('<img src=x onerror=alert(1)>', "<img"),
        ('<iframe src="evil"></iframe>', "<iframe"),
        ('<svg onload=alert(1)></svg>', "<svg"),
        ('<object data="e"></object>', "<object"),
        ('<embed src="e">', "<embed"),
        ('<link href="e">', "<link"),
        ('<meta charset="e">', "<meta"),
        ('<style>*{display:none}</style>', "<style"),
    ]

    FIELDS_AND_CAMEL = [
        ("name", "name"),
        ("equipment_type", "equipmentType"),
        ("manufacturer", "manufacturer"),
        ("model_number", "modelNumber"),
        ("serial_number", "serialNumber"),
        ("notes", "notes"),
    ]

    @pytest.mark.parametrize("field,camel", FIELDS_AND_CAMEL)
    @pytest.mark.parametrize("xss,marker", XSS_VECTORS)
    async def test_xss_removed_from_field(
        self, admin_client: AsyncClient, project: Project, field, camel, xss, marker
    ):
        if field == "name":
            payload = {"name": f"Prefix {xss} Suffix"}
        else:
            payload = {"name": "Safe Name", field: f"Prefix {xss} Suffix"}
        resp = await admin_client.post(equipment_url(str(project.id)), json=payload)
        if resp.status_code == 200:
            val = resp.json().get(camel, "")
            if val:
                assert marker not in val.lower(), f"XSS marker '{marker}' found in {camel}"


class TestParametrizedUpdateFields:

    @pytest.mark.parametrize("field,value,camel_key,expected_status", [
        ("name", "Updated", "name", 200),
        ("name", "AB", "name", 200),
        ("name", "A" * 255, "name", 200),
        ("name", "A", "name", 422),
        ("name", "A" * 256, "name", 422),
        ("equipment_type", "Loader", "equipmentType", 200),
        ("equipment_type", "A" * 100, "equipmentType", 200),
        ("equipment_type", "A" * 101, "equipmentType", 422),
        ("manufacturer", "Volvo", "manufacturer", 200),
        ("manufacturer", "A" * 255, "manufacturer", 200),
        ("manufacturer", "A" * 256, "manufacturer", 422),
        ("model_number", "V100", "modelNumber", 200),
        ("model_number", "A" * 100, "modelNumber", 200),
        ("model_number", "A" * 101, "modelNumber", 422),
        ("serial_number", "SN-X", "serialNumber", 200),
        ("serial_number", "A" * 100, "serialNumber", 200),
        ("serial_number", "A" * 101, "serialNumber", 422),
        ("notes", "Short note", "notes", 200),
        ("notes", "A" * 5000, "notes", 200),
        ("notes", "A" * 5001, "notes", 422),
    ])
    async def test_update_field_parametrized(
        self, admin_client: AsyncClient, project: Project, field, value, camel_key, expected_status
    ):
        created = await create_equipment_via_api(admin_client, str(project.id))
        resp = await admin_client.put(
            equipment_detail_url(str(project.id), created["id"]),
            json={field: value},
        )
        assert resp.status_code == expected_status, f"Update {field}={repr(value)[:40]}"
        if expected_status == 200:
            assert resp.json()[camel_key] == value


class TestParametrizedChecklistValidation:

    @pytest.mark.parametrize("checklist_name,expected_status,desc", [
        ("AB", 200, "min valid name"),
        ("A" * 255, 200, "max valid name"),
        ("Normal Checklist", 200, "normal name"),
        ("A", 422, "too short"),
        ("", 422, "empty"),
        ("A" * 256, 422, "too long"),
    ])
    async def test_checklist_name_parametrized(
        self, admin_client: AsyncClient, project: Project, checklist_name, expected_status, desc
    ):
        created = await create_equipment_via_api(admin_client, str(project.id))
        payload = {"checklist_name": checklist_name, "items": [{"id": "i1", "label": "Test"}]}
        resp = await admin_client.post(checklist_url(str(project.id), created["id"]), json=payload)
        assert resp.status_code == expected_status, f"Failed: {desc}"

    @pytest.mark.parametrize("label,expected_status,desc", [
        ("A", 200, "single char label"),
        ("A" * 255, 200, "max label"),
        ("Check oil level", 200, "normal label"),
        ("", 422, "empty label"),
        ("A" * 256, 422, "label too long"),
    ])
    async def test_checklist_item_label_parametrized(
        self, admin_client: AsyncClient, project: Project, label, expected_status, desc
    ):
        created = await create_equipment_via_api(admin_client, str(project.id))
        payload = {"checklist_name": "Test CL", "items": [{"id": "i1", "label": label}]}
        resp = await admin_client.post(checklist_url(str(project.id), created["id"]), json=payload)
        assert resp.status_code == expected_status, f"Failed: {desc}"

    @pytest.mark.parametrize("item_id,expected_status,desc", [
        ("x", 200, "single char id"),
        ("a" * 100, 200, "max id"),
        ("item-123", 200, "normal id"),
        ("a" * 101, 422, "id too long"),
    ])
    async def test_checklist_item_id_parametrized(
        self, admin_client: AsyncClient, project: Project, item_id, expected_status, desc
    ):
        created = await create_equipment_via_api(admin_client, str(project.id))
        payload = {"checklist_name": "Test CL", "items": [{"id": item_id, "label": "Label"}]}
        resp = await admin_client.post(checklist_url(str(project.id), created["id"]), json=payload)
        assert resp.status_code == expected_status, f"Failed: {desc}"

    @pytest.mark.parametrize("notes,expected_status,desc", [
        (None, 200, "null notes"),
        ("Short", 200, "short notes"),
        ("A" * 5000, 200, "max notes"),
        ("A" * 5001, 422, "notes too long"),
    ])
    async def test_checklist_item_notes_parametrized(
        self, admin_client: AsyncClient, project: Project, notes, expected_status, desc
    ):
        created = await create_equipment_via_api(admin_client, str(project.id))
        item = {"id": "n1", "label": "Check"}
        if notes is not None:
            item["notes"] = notes
        payload = {"checklist_name": "Test CL", "items": [item]}
        resp = await admin_client.post(checklist_url(str(project.id), created["id"]), json=payload)
        assert resp.status_code == expected_status, f"Failed: {desc}"

    @pytest.mark.parametrize("is_completed", [True, False])
    async def test_checklist_item_is_completed_values(
        self, admin_client: AsyncClient, project: Project, is_completed
    ):
        created = await create_equipment_via_api(admin_client, str(project.id))
        payload = {
            "checklist_name": "Bool CL",
            "items": [{"id": "b1", "label": "Check", "is_completed": is_completed}],
        }
        resp = await admin_client.post(checklist_url(str(project.id), created["id"]), json=payload)
        assert resp.status_code == 200
        assert resp.json()["items"][0]["is_completed"] is is_completed


class TestParametrizedAuthEndpoints:

    @pytest.mark.parametrize("method,use_body", [
        ("POST", True),
        ("PUT", True),
        ("DELETE", False),
    ])
    async def test_unauthenticated_mutation_returns_401(
        self, client: AsyncClient, project: Project, method, use_body
    ):
        if method == "POST":
            url = equipment_url(str(project.id))
        else:
            url = equipment_detail_url(str(project.id), FAKE_EQUIPMENT_ID)
        kwargs = {}
        if use_body:
            kwargs["json"] = valid_equipment_payload()
        resp = await client.request(method, url, **kwargs)
        assert resp.status_code == 401

    async def test_submit_unauthenticated_returns_401(self, client: AsyncClient, project: Project):
        resp = await client.post(equipment_submit_url(str(project.id), FAKE_EQUIPMENT_ID))
        assert resp.status_code == 401

    @pytest.mark.parametrize("endpoint,path", [
        ("list", "/api/v1/projects/{project_id}/equipment"),
        ("flat_list", "/api/v1/equipment"),
        ("detail", "/api/v1/projects/{project_id}/equipment/00000000-0000-0000-0000-000000000099"),
    ])
    async def test_read_endpoints_require_auth(
        self, client: AsyncClient, project: Project, endpoint, path
    ):
        url = path.format(project_id=project.id)
        resp = await client.get(url)
        assert resp.status_code == 401


class TestParametrizedMultipleEquipment:

    @pytest.mark.parametrize("count", [1, 2, 5, 10])
    async def test_create_and_list_n_equipment(
        self, admin_client: AsyncClient, project: Project, count
    ):
        for i in range(count):
            await create_equipment_via_api(
                admin_client, str(project.id), {"name": f"Equipment #{i+1}"}
            )
        resp = await admin_client.get(equipment_url(str(project.id)))
        assert len(resp.json()) == count

    @pytest.mark.parametrize("delete_index", [0, 1, 2])
    async def test_delete_one_of_three(
        self, admin_client: AsyncClient, project: Project, delete_index
    ):
        ids = []
        for i in range(3):
            eq = await create_equipment_via_api(
                admin_client, str(project.id), {"name": f"Equip {i}"}
            )
            ids.append(eq["id"])
        await admin_client.delete(equipment_detail_url(str(project.id), ids[delete_index]))
        resp = await admin_client.get(equipment_url(str(project.id)))
        remaining_ids = [e["id"] for e in resp.json()]
        assert ids[delete_index] not in remaining_ids
        assert len(remaining_ids) == 2
