import uuid
from decimal import Decimal

import pytest
from sqlalchemy import select

from app.models.approval import ApprovalRequest, ApprovalStep
from app.models.material import ApprovalStatus, Material
from app.models.project import Project, ProjectMember

API = "/api/v1"
FAKE_UUID = str(uuid.uuid4())
FAKE_UUID_2 = str(uuid.uuid4())


def mat_url(pid):
    return f"{API}/projects/{pid}/materials"


def mat_detail(pid, mid):
    return f"{API}/projects/{pid}/materials/{mid}"


def mat_submit(pid, mid):
    return f"{API}/projects/{pid}/materials/{mid}/submit"


def mat_payload(**overrides):
    base = {
        "name": "Portland Cement Type I",
        "material_type": "concrete",
        "manufacturer": "CEMEX",
        "model_number": "PC-I-50",
        "quantity": "200.00",
        "unit": "bags",
        "specifications": {"grade": "42.5N", "color": "grey"},
        "expected_delivery": "2025-08-15",
        "actual_delivery": "2025-08-20",
        "storage_location": "Warehouse B - Section 1",
        "notes": "Keep dry, store indoors",
    }
    base.update(overrides)
    return base


async def create_mat(client, pid, **overrides):
    resp = await client.post(mat_url(str(pid)), json=mat_payload(**overrides))
    assert resp.status_code == 200, f"Create failed: {resp.text}"
    return resp.json()


async def make_other_project(db, user):
    code = f"MTP-{uuid.uuid4().hex[:4].upper()}"
    proj = Project(
        id=uuid.uuid4(), name="Other Material Project", code=code,
        status="active", created_by_id=user.id,
    )
    db.add(proj)
    await db.flush()
    db.add(ProjectMember(project_id=proj.id, user_id=user.id, role="project_admin"))
    await db.commit()
    await db.refresh(proj)
    return proj


async def make_material_in_db(db, project_id, user_id, **overrides):
    defaults = {
        "name": "DB Material",
        "material_type": "steel",
        "manufacturer": "ArcelorMittal",
        "quantity": Decimal("100.00"),
        "unit": "tons",
        "status": ApprovalStatus.DRAFT.value,
    }
    defaults.update(overrides)
    mat = Material(
        id=uuid.uuid4(), project_id=project_id,
        created_by_id=user_id, **defaults,
    )
    db.add(mat)
    await db.commit()
    await db.refresh(mat)
    return mat


class TestCreateMaterialExtended:

    @pytest.mark.asyncio
    async def test_create_with_all_fields(self, admin_client, project):
        data = await create_mat(admin_client, project.id)
        assert data["name"] == "Portland Cement Type I"
        assert data["materialType"] == "concrete"
        assert data["manufacturer"] == "CEMEX"
        assert data["modelNumber"] == "PC-I-50"
        assert data["unit"] == "bags"
        assert data["storageLocation"] == "Warehouse B - Section 1"
        assert data["status"] == "draft"

    @pytest.mark.asyncio
    async def test_create_minimal_fields(self, admin_client, project):
        resp = await admin_client.post(mat_url(str(project.id)), json={"name": "Minimal Material"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["name"] == "Minimal Material"
        assert data["materialType"] is None
        assert data["manufacturer"] is None
        assert data["quantity"] is None
        assert data["unit"] is None

    @pytest.mark.asyncio
    async def test_create_with_unicode_name(self, admin_client, project):
        resp = await admin_client.post(mat_url(str(project.id)), json={"name": "Cement Portland"})
        assert resp.status_code == 200

    @pytest.mark.asyncio
    async def test_create_with_hebrew_name(self, admin_client, project):
        resp = await admin_client.post(mat_url(str(project.id)), json={"name": "מלט פורטלנד"})
        assert resp.status_code == 200
        assert resp.json()["name"] == "מלט פורטלנד"

    @pytest.mark.asyncio
    async def test_create_sets_timestamps(self, admin_client, project):
        data = await create_mat(admin_client, project.id)
        assert data["createdAt"] is not None
        assert data["updatedAt"] is not None

    @pytest.mark.asyncio
    async def test_create_two_materials_different_ids(self, admin_client, project):
        m1 = await create_mat(admin_client, project.id, name="Mat One")
        m2 = await create_mat(admin_client, project.id, name="Mat Two")
        assert m1["id"] != m2["id"]

    @pytest.mark.asyncio
    async def test_create_default_status_is_draft(self, admin_client, project):
        data = await create_mat(admin_client, project.id)
        assert data["status"] == "draft"

    @pytest.mark.asyncio
    async def test_create_preserves_specs(self, admin_client, project):
        specs = {"tensile_strength": 500, "certified": True, "coating": None}
        data = await create_mat(admin_client, project.id, specifications=specs)
        assert data["specifications"]["tensile_strength"] == 500
        assert data["specifications"]["certified"] is True
        assert data["specifications"]["coating"] is None

    @pytest.mark.asyncio
    async def test_create_with_null_specs(self, admin_client, project):
        data = await create_mat(admin_client, project.id, specifications=None)
        assert data["specifications"] is None or data["specifications"] == {}

    @pytest.mark.asyncio
    async def test_create_with_empty_specs(self, admin_client, project):
        data = await create_mat(admin_client, project.id, specifications={})
        assert data["specifications"] == {}

    @pytest.mark.asyncio
    async def test_create_missing_name_returns_422(self, admin_client, project):
        resp = await admin_client.post(mat_url(str(project.id)), json={})
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_create_empty_body_returns_422(self, admin_client, project):
        resp = await admin_client.post(
            mat_url(str(project.id)), content=b"", headers={"Content-Type": "application/json"}
        )
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_create_special_chars_in_name(self, admin_client, project):
        name = "Material #42 (Rev.A) - Phase 2/3 & Final"
        data = await create_mat(admin_client, project.id, name=name)
        assert data["name"] == name


class TestCreateMaterialNameValidation:

    @pytest.mark.asyncio
    @pytest.mark.parametrize("name,expected_status", [
        ("AB", 200),
        ("A" * 255, 200),
        ("Valid Name Here", 200),
        ("A", 422),
        ("", 422),
        ("A" * 256, 422),
    ])
    async def test_name_length_boundaries(self, admin_client, project, name, expected_status):
        resp = await admin_client.post(mat_url(str(project.id)), json={"name": name})
        assert resp.status_code == expected_status

    @pytest.mark.asyncio
    async def test_whitespace_only_name_rejected(self, admin_client, project):
        resp = await admin_client.post(mat_url(str(project.id)), json={"name": "   "})
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_leading_trailing_whitespace_trimmed(self, admin_client, project):
        resp = await admin_client.post(mat_url(str(project.id)), json={"name": "  Cement  "})
        assert resp.status_code == 200
        assert resp.json()["name"].strip() == "Cement"


class TestCreateMaterialFieldValidation:

    @pytest.mark.asyncio
    @pytest.mark.parametrize("field,max_len", [
        ("material_type", 100),
        ("model_number", 100),
        ("unit", 50),
        ("manufacturer", 255),
        ("storage_location", 255),
        ("notes", 5000),
    ])
    async def test_field_max_length_ok(self, admin_client, project, field, max_len):
        data = {"name": "Test"}
        data[field] = "A" * max_len
        resp = await admin_client.post(mat_url(str(project.id)), json=data)
        assert resp.status_code == 200

    @pytest.mark.asyncio
    @pytest.mark.parametrize("field,max_len", [
        ("material_type", 100),
        ("model_number", 100),
        ("unit", 50),
        ("manufacturer", 255),
        ("storage_location", 255),
        ("notes", 5000),
    ])
    async def test_field_over_max_length_rejected(self, admin_client, project, field, max_len):
        data = {"name": "Test"}
        data[field] = "A" * (max_len + 1)
        resp = await admin_client.post(mat_url(str(project.id)), json=data)
        assert resp.status_code == 422

    @pytest.mark.asyncio
    @pytest.mark.parametrize("field", [
        "material_type", "manufacturer", "model_number", "unit",
        "storage_location", "notes",
    ])
    async def test_optional_fields_accept_none(self, admin_client, project, field):
        data = {"name": "Null Field Test"}
        data[field] = None
        resp = await admin_client.post(mat_url(str(project.id)), json=data)
        assert resp.status_code == 200


class TestCreateMaterialQuantityValidation:

    @pytest.mark.asyncio
    @pytest.mark.parametrize("quantity,expected_status", [
        (0, 200),
        (0.01, 200),
        (1, 200),
        (100.50, 200),
        (999999999, 200),
        (-1, 422),
        (-0.01, 422),
        (1000000000, 422),
    ])
    async def test_quantity_boundaries(self, admin_client, project, quantity, expected_status):
        resp = await admin_client.post(
            mat_url(str(project.id)), json={"name": "Qty Test", "quantity": quantity}
        )
        assert resp.status_code == expected_status

    @pytest.mark.asyncio
    @pytest.mark.parametrize("qty_str,expected_status", [
        ("0", 200),
        ("100.50", 200),
        ("999999999", 200),
    ])
    async def test_quantity_as_string(self, admin_client, project, qty_str, expected_status):
        resp = await admin_client.post(
            mat_url(str(project.id)), json={"name": "Str Qty", "quantity": qty_str}
        )
        assert resp.status_code == expected_status

    @pytest.mark.asyncio
    async def test_quantity_none_by_default(self, admin_client, project):
        data = await create_mat(admin_client, project.id, quantity=None)
        assert data["quantity"] is None

    @pytest.mark.asyncio
    async def test_quantity_zero_allowed(self, admin_client, project):
        resp = await admin_client.post(
            mat_url(str(project.id)), json={"name": "Zero Qty", "quantity": 0}
        )
        assert resp.status_code == 200
        assert float(resp.json()["quantity"]) == 0

    @pytest.mark.asyncio
    @pytest.mark.parametrize("qty,expected", [
        ("0.01", 0.01),
        ("12345.67", 12345.67),
        ("100.50", 100.5),
    ])
    async def test_quantity_precision(self, admin_client, project, qty, expected):
        resp = await admin_client.post(
            mat_url(str(project.id)), json={"name": "Precision", "quantity": qty}
        )
        assert resp.status_code == 200
        assert abs(float(resp.json()["quantity"]) - expected) < 0.01


class TestCreateMaterialDateValidation:

    @pytest.mark.asyncio
    @pytest.mark.parametrize("date_field,date_value", [
        ("expected_delivery", "2025-06-15"),
        ("expected_delivery", "2030-12-31"),
        ("actual_delivery", "2025-06-20"),
        ("actual_delivery", "2025-01-01"),
    ])
    async def test_valid_dates(self, admin_client, project, date_field, date_value):
        data = {"name": "Date Test", date_field: date_value}
        resp = await admin_client.post(mat_url(str(project.id)), json=data)
        assert resp.status_code == 200

    @pytest.mark.asyncio
    async def test_both_dates_set(self, admin_client, project):
        data = await create_mat(
            admin_client, project.id,
            expected_delivery="2025-08-15",
            actual_delivery="2025-08-20",
        )
        assert data["expectedDelivery"] == "2025-08-15"
        assert data["actualDelivery"] == "2025-08-20"

    @pytest.mark.asyncio
    async def test_dates_default_to_none(self, admin_client, project):
        resp = await admin_client.post(mat_url(str(project.id)), json={"name": "No Dates"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["expectedDelivery"] is None
        assert data["actualDelivery"] is None

    @pytest.mark.asyncio
    @pytest.mark.parametrize("bad_date", [
        "not-a-date", "2024-13-01", "yesterday", "12/31/2024",
    ])
    async def test_invalid_date_rejected(self, admin_client, project, bad_date):
        resp = await admin_client.post(
            mat_url(str(project.id)),
            json={"name": "Bad Date", "expected_delivery": bad_date},
        )
        assert resp.status_code == 422


class TestCreateMaterialSpecifications:

    @pytest.mark.asyncio
    @pytest.mark.parametrize("specs,expected_status", [
        (None, 200),
        ({}, 200),
        ({"key": "value"}, 200),
        ({"num": 42, "flt": 3.14, "bool": True, "null": None}, 200),
    ])
    async def test_valid_specs(self, admin_client, project, specs, expected_status):
        data = {"name": "Spec Test"}
        if specs is not None:
            data["specifications"] = specs
        resp = await admin_client.post(mat_url(str(project.id)), json=data)
        assert resp.status_code == expected_status

    @pytest.mark.asyncio
    async def test_specs_too_many_keys(self, admin_client, project):
        specs = {f"k{i}": f"v{i}" for i in range(51)}
        resp = await admin_client.post(
            mat_url(str(project.id)), json={"name": "Many Keys", "specifications": specs}
        )
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_specs_50_keys_ok(self, admin_client, project):
        specs = {f"k{i}": f"v{i}" for i in range(50)}
        resp = await admin_client.post(
            mat_url(str(project.id)), json={"name": "50 Keys", "specifications": specs}
        )
        assert resp.status_code == 200

    @pytest.mark.asyncio
    async def test_specs_key_too_long(self, admin_client, project):
        specs = {"k" * 101: "value"}
        resp = await admin_client.post(
            mat_url(str(project.id)), json={"name": "Long Key", "specifications": specs}
        )
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_specs_value_too_long(self, admin_client, project):
        specs = {"key": "v" * 501}
        resp = await admin_client.post(
            mat_url(str(project.id)), json={"name": "Long Val", "specifications": specs}
        )
        assert resp.status_code == 422

    @pytest.mark.asyncio
    @pytest.mark.parametrize("bad_val,desc", [
        ([1, 2], "list"),
        ({"a": "b"}, "nested dict"),
    ])
    async def test_specs_invalid_value_types(self, admin_client, project, bad_val, desc):
        resp = await admin_client.post(
            mat_url(str(project.id)),
            json={"name": "Bad Spec", "specifications": {"key": bad_val}},
        )
        assert resp.status_code == 422, f"Should reject {desc}"


class TestReadMaterialExtended:

    @pytest.mark.asyncio
    async def test_get_by_id(self, admin_client, project):
        mat = await create_mat(admin_client, project.id)
        resp = await admin_client.get(mat_detail(str(project.id), mat["id"]))
        assert resp.status_code == 200
        assert resp.json()["id"] == mat["id"]

    @pytest.mark.asyncio
    async def test_get_returns_all_fields(self, admin_client, project):
        mat = await create_mat(admin_client, project.id)
        resp = await admin_client.get(mat_detail(str(project.id), mat["id"]))
        data = resp.json()
        required = ["id", "projectId", "name", "materialType", "manufacturer",
                     "modelNumber", "quantity", "unit", "specifications",
                     "expectedDelivery", "actualDelivery", "storageLocation",
                     "notes", "status", "createdAt", "updatedAt"]
        for f in required:
            assert f in data, f"Missing: {f}"

    @pytest.mark.asyncio
    async def test_get_nonexistent_returns_404(self, admin_client, project):
        resp = await admin_client.get(mat_detail(str(project.id), FAKE_UUID))
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_get_from_wrong_project(self, admin_client, project, db, admin_user):
        mat = await create_mat(admin_client, project.id)
        other = await make_other_project(db, admin_user)
        resp = await admin_client.get(mat_detail(str(other.id), mat["id"]))
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_get_invalid_uuid_returns_422(self, admin_client, project):
        resp = await admin_client.get(mat_detail(str(project.id), "not-uuid"))
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_get_created_by_has_email(self, admin_client, project, admin_user):
        mat = await create_mat(admin_client, project.id)
        resp = await admin_client.get(mat_detail(str(project.id), mat["id"]))
        cb = resp.json().get("createdBy")
        if cb:
            assert cb["email"] == admin_user.email


class TestListMaterialExtended:

    @pytest.mark.asyncio
    async def test_list_empty(self, admin_client, project):
        resp = await admin_client.get(mat_url(str(project.id)))
        assert resp.status_code == 200
        assert resp.json() == []

    @pytest.mark.asyncio
    async def test_list_correct_count(self, admin_client, project):
        for i in range(4):
            await create_mat(admin_client, project.id, name=f"Mat {i}")
        resp = await admin_client.get(mat_url(str(project.id)))
        assert len(resp.json()) == 4

    @pytest.mark.asyncio
    async def test_list_ordered_by_created_at_desc(self, admin_client, project):
        for i in range(3):
            await create_mat(admin_client, project.id, name=f"Ordered {i}")
        resp = await admin_client.get(mat_url(str(project.id)))
        dates = [m["createdAt"] for m in resp.json()]
        assert dates == sorted(dates, reverse=True)

    @pytest.mark.asyncio
    async def test_list_project_isolation(self, admin_client, project, db, admin_user):
        await create_mat(admin_client, project.id, name="Proj A Mat")
        other = await make_other_project(db, admin_user)
        await create_mat(admin_client, other.id, name="Proj B Mat")
        resp_a = await admin_client.get(mat_url(str(project.id)))
        resp_b = await admin_client.get(mat_url(str(other.id)))
        assert len(resp_a.json()) == 1
        assert resp_a.json()[0]["name"] == "Proj A Mat"
        assert len(resp_b.json()) == 1
        assert resp_b.json()[0]["name"] == "Proj B Mat"

    @pytest.mark.asyncio
    async def test_list_response_is_array(self, admin_client, project):
        resp = await admin_client.get(mat_url(str(project.id)))
        assert isinstance(resp.json(), list)

    @pytest.mark.asyncio
    async def test_list_items_have_camel_case(self, admin_client, project):
        await create_mat(admin_client, project.id)
        resp = await admin_client.get(mat_url(str(project.id)))
        item = resp.json()[0]
        assert "materialType" in item
        assert "modelNumber" in item
        assert "storageLocation" in item
        assert "expectedDelivery" in item
        assert "actualDelivery" in item

    @pytest.mark.asyncio
    @pytest.mark.parametrize("count", [1, 3, 5, 10])
    async def test_list_n_materials(self, admin_client, project, db, admin_user, count):
        for i in range(count):
            await make_material_in_db(db, project.id, admin_user.id, name=f"Batch {i}")
        resp = await admin_client.get(mat_url(str(project.id)))
        assert len(resp.json()) == count


class TestFlatListMaterialExtended:

    @pytest.mark.asyncio
    async def test_flat_list_empty(self, admin_client):
        resp = await admin_client.get(f"{API}/materials")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    @pytest.mark.asyncio
    async def test_flat_list_with_project_filter(self, admin_client, project, db, admin_user):
        await create_mat(admin_client, project.id, name="Filtered")
        other = await make_other_project(db, admin_user)
        await create_mat(admin_client, other.id, name="Other")
        resp = await admin_client.get(f"{API}/materials", params={"project_id": str(project.id)})
        assert len(resp.json()) == 1
        assert resp.json()[0]["projectId"] == str(project.id)

    @pytest.mark.asyncio
    async def test_flat_list_all_projects(self, admin_client, project, db, admin_user):
        await create_mat(admin_client, project.id, name="From A")
        other = await make_other_project(db, admin_user)
        await create_mat(admin_client, other.id, name="From B")
        resp = await admin_client.get(f"{API}/materials")
        names = [m["name"] for m in resp.json()]
        assert "From A" in names
        assert "From B" in names

    @pytest.mark.asyncio
    async def test_flat_list_nonexistent_project_returns_empty(self, admin_client, project):
        await create_mat(admin_client, project.id)
        resp = await admin_client.get(f"{API}/materials", params={"project_id": FAKE_UUID})
        assert resp.json() == []

    @pytest.mark.asyncio
    async def test_flat_list_invalid_project_id_returns_422(self, admin_client):
        resp = await admin_client.get(f"{API}/materials", params={"project_id": "bad-uuid"})
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_flat_list_camel_case_fields(self, admin_client, project):
        await create_mat(admin_client, project.id)
        resp = await admin_client.get(f"{API}/materials")
        if resp.json():
            item = resp.json()[0]
            assert "materialType" in item
            assert "projectId" in item


class TestUpdateMaterialExtended:

    @pytest.mark.asyncio
    async def test_update_single_field(self, admin_client, project):
        mat = await create_mat(admin_client, project.id)
        resp = await admin_client.put(
            mat_detail(str(project.id), mat["id"]), json={"name": "Updated Name"}
        )
        assert resp.status_code == 200
        assert resp.json()["name"] == "Updated Name"

    @pytest.mark.asyncio
    async def test_update_preserves_other_fields(self, admin_client, project):
        mat = await create_mat(admin_client, project.id)
        resp = await admin_client.put(
            mat_detail(str(project.id), mat["id"]), json={"notes": "New note"}
        )
        assert resp.json()["manufacturer"] == mat["manufacturer"]
        assert resp.json()["materialType"] == mat["materialType"]

    @pytest.mark.asyncio
    async def test_update_multiple_fields(self, admin_client, project):
        mat = await create_mat(admin_client, project.id)
        resp = await admin_client.put(
            mat_detail(str(project.id), mat["id"]),
            json={"name": "Multi", "material_type": "wood", "quantity": "500"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["name"] == "Multi"
        assert data["materialType"] == "wood"
        assert float(data["quantity"]) == 500

    @pytest.mark.asyncio
    async def test_update_specifications(self, admin_client, project):
        mat = await create_mat(admin_client, project.id)
        resp = await admin_client.put(
            mat_detail(str(project.id), mat["id"]),
            json={"specifications": {"new_key": "new_val"}},
        )
        assert resp.status_code == 200
        assert resp.json()["specifications"]["new_key"] == "new_val"

    @pytest.mark.asyncio
    async def test_update_dates(self, admin_client, project):
        mat = await create_mat(admin_client, project.id)
        resp = await admin_client.put(
            mat_detail(str(project.id), mat["id"]),
            json={"expected_delivery": "2026-01-15", "actual_delivery": "2026-01-20"},
        )
        assert resp.status_code == 200
        assert resp.json()["expectedDelivery"] == "2026-01-15"
        assert resp.json()["actualDelivery"] == "2026-01-20"

    @pytest.mark.asyncio
    async def test_update_quantity(self, admin_client, project):
        mat = await create_mat(admin_client, project.id)
        resp = await admin_client.put(
            mat_detail(str(project.id), mat["id"]),
            json={"quantity": "750.25"},
        )
        assert resp.status_code == 200
        assert abs(float(resp.json()["quantity"]) - 750.25) < 0.01

    @pytest.mark.asyncio
    async def test_update_empty_body_is_noop(self, admin_client, project):
        mat = await create_mat(admin_client, project.id)
        resp = await admin_client.put(mat_detail(str(project.id), mat["id"]), json={})
        assert resp.status_code == 200
        assert resp.json()["name"] == mat["name"]

    @pytest.mark.asyncio
    async def test_update_nonexistent_returns_404(self, admin_client, project):
        resp = await admin_client.put(
            mat_detail(str(project.id), FAKE_UUID), json={"name": "Ghost"}
        )
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_update_wrong_project_returns_404(self, admin_client, project, db, admin_user):
        mat = await create_mat(admin_client, project.id)
        other = await make_other_project(db, admin_user)
        resp = await admin_client.put(
            mat_detail(str(other.id), mat["id"]), json={"name": "Wrong"}
        )
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_update_clear_optional_to_null(self, admin_client, project):
        mat = await create_mat(admin_client, project.id)
        resp = await admin_client.put(
            mat_detail(str(project.id), mat["id"]),
            json={"material_type": None, "manufacturer": None, "quantity": None},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["materialType"] is None
        assert data["manufacturer"] is None
        assert data["quantity"] is None

    @pytest.mark.asyncio
    @pytest.mark.parametrize("field,value,expected_status", [
        ("name", "A", 422),
        ("name", "", 422),
        ("name", "A" * 256, 422),
        ("material_type", "A" * 101, 422),
        ("model_number", "A" * 101, 422),
        ("unit", "A" * 51, 422),
        ("manufacturer", "A" * 256, 422),
        ("storage_location", "A" * 256, 422),
        ("notes", "A" * 5001, 422),
        ("quantity", -1, 422),
        ("quantity", 1000000000, 422),
    ])
    async def test_update_validation_rejects_invalid(self, admin_client, project, field, value, expected_status):
        mat = await create_mat(admin_client, project.id)
        resp = await admin_client.put(
            mat_detail(str(project.id), mat["id"]), json={field: value}
        )
        assert resp.status_code == expected_status


class TestDeleteMaterialExtended:

    @pytest.mark.asyncio
    async def test_delete_success(self, admin_client, project):
        mat = await create_mat(admin_client, project.id)
        resp = await admin_client.delete(mat_detail(str(project.id), mat["id"]))
        assert resp.status_code == 200
        assert "message" in resp.json()

    @pytest.mark.asyncio
    async def test_delete_then_get_404(self, admin_client, project):
        mat = await create_mat(admin_client, project.id)
        await admin_client.delete(mat_detail(str(project.id), mat["id"]))
        resp = await admin_client.get(mat_detail(str(project.id), mat["id"]))
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_delete_then_not_in_list(self, admin_client, project):
        mat = await create_mat(admin_client, project.id)
        await admin_client.delete(mat_detail(str(project.id), mat["id"]))
        resp = await admin_client.get(mat_url(str(project.id)))
        assert len(resp.json()) == 0

    @pytest.mark.asyncio
    async def test_delete_nonexistent_returns_404(self, admin_client, project):
        resp = await admin_client.delete(mat_detail(str(project.id), FAKE_UUID))
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_delete_one_preserves_others(self, admin_client, project):
        m1 = await create_mat(admin_client, project.id, name="Keep")
        m2 = await create_mat(admin_client, project.id, name="Remove")
        await admin_client.delete(mat_detail(str(project.id), m2["id"]))
        resp = await admin_client.get(mat_url(str(project.id)))
        assert len(resp.json()) == 1
        assert resp.json()[0]["name"] == "Keep"

    @pytest.mark.asyncio
    async def test_delete_double_delete_returns_404(self, admin_client, project):
        mat = await create_mat(admin_client, project.id)
        await admin_client.delete(mat_detail(str(project.id), mat["id"]))
        resp = await admin_client.delete(mat_detail(str(project.id), mat["id"]))
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_delete_wrong_project_returns_404(self, admin_client, project, db, admin_user):
        mat = await create_mat(admin_client, project.id)
        other = await make_other_project(db, admin_user)
        resp = await admin_client.delete(mat_detail(str(other.id), mat["id"]))
        assert resp.status_code == 404


class TestSubmitMaterialForApproval:

    @pytest.mark.asyncio
    async def test_submit_changes_status(self, admin_client, project):
        mat = await create_mat(admin_client, project.id)
        resp = await admin_client.post(mat_submit(str(project.id), mat["id"]))
        assert resp.status_code == 200
        assert resp.json()["status"] == "submitted"

    @pytest.mark.asyncio
    async def test_submit_creates_approval_request(self, admin_client, project, db):
        mat = await create_mat(admin_client, project.id)
        await admin_client.post(mat_submit(str(project.id), mat["id"]))
        result = await db.execute(
            select(ApprovalRequest).where(
                ApprovalRequest.entity_id == uuid.UUID(mat["id"]),
                ApprovalRequest.entity_type == "material",
            )
        )
        approval = result.scalar_one_or_none()
        assert approval is not None
        assert approval.current_status == "submitted"
        assert approval.entity_type == "material"

    @pytest.mark.asyncio
    async def test_submit_creates_two_approval_steps(self, admin_client, project, db):
        mat = await create_mat(admin_client, project.id)
        await admin_client.post(mat_submit(str(project.id), mat["id"]))
        result = await db.execute(
            select(ApprovalRequest).where(ApprovalRequest.entity_id == uuid.UUID(mat["id"]))
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
    async def test_submit_nonexistent_returns_404(self, admin_client, project):
        resp = await admin_client.post(mat_submit(str(project.id), FAKE_UUID))
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_submit_preserves_data(self, admin_client, project):
        mat = await create_mat(admin_client, project.id)
        resp = await admin_client.post(mat_submit(str(project.id), mat["id"]))
        data = resp.json()
        assert data["name"] == mat["name"]
        assert data["manufacturer"] == mat["manufacturer"]

    @pytest.mark.asyncio
    async def test_submit_returns_camel_case(self, admin_client, project):
        mat = await create_mat(admin_client, project.id)
        resp = await admin_client.post(mat_submit(str(project.id), mat["id"]))
        data = resp.json()
        assert "materialType" in data
        assert "projectId" in data
        assert "createdAt" in data

    @pytest.mark.asyncio
    async def test_submit_then_verify_status_via_get(self, admin_client, project):
        mat = await create_mat(admin_client, project.id)
        await admin_client.post(mat_submit(str(project.id), mat["id"]))
        resp = await admin_client.get(mat_detail(str(project.id), mat["id"]))
        assert resp.json()["status"] == "submitted"

    @pytest.mark.asyncio
    async def test_submit_approval_steps_pending(self, admin_client, project, db):
        mat = await create_mat(admin_client, project.id)
        await admin_client.post(mat_submit(str(project.id), mat["id"]))
        result = await db.execute(
            select(ApprovalRequest).where(ApprovalRequest.entity_id == uuid.UUID(mat["id"]))
        )
        approval = result.scalar_one()
        steps_result = await db.execute(
            select(ApprovalStep).where(ApprovalStep.approval_request_id == approval.id)
        )
        for step in steps_result.scalars().all():
            assert step.status == "pending"


class TestStatusTransitionsViaDB:

    @pytest.mark.asyncio
    @pytest.mark.parametrize("status", [
        "draft", "submitted", "under_review", "approved", "rejected", "revision_requested",
    ])
    async def test_all_valid_statuses(self, status):
        found = any(s.value == status for s in ApprovalStatus)
        assert found

    @pytest.mark.asyncio
    @pytest.mark.parametrize("status", [
        "draft", "submitted", "under_review", "approved", "rejected", "revision_requested",
    ])
    async def test_db_material_status_writable(self, db, project, admin_user, status):
        mat = await make_material_in_db(db, project.id, admin_user.id, status=status)
        assert mat.status == status

    @pytest.mark.asyncio
    async def test_db_material_status_persists(self, db, project, admin_user):
        mat = await make_material_in_db(db, project.id, admin_user.id, status="approved")
        result = await db.execute(select(Material).where(Material.id == mat.id))
        fetched = result.scalar_one()
        assert fetched.status == "approved"


class TestAuthenticationExtended:

    @pytest.mark.asyncio
    async def test_unauthenticated_list_returns_401(self, client, project):
        resp = await client.get(mat_url(str(project.id)))
        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_unauthenticated_flat_list_returns_401(self, client):
        resp = await client.get(f"{API}/materials")
        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_unauthenticated_create_returns_401(self, client, project):
        resp = await client.post(mat_url(str(project.id)), json=mat_payload())
        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_unauthenticated_get_returns_401(self, client, project):
        resp = await client.get(mat_detail(str(project.id), FAKE_UUID))
        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_unauthenticated_update_returns_401(self, client, project):
        resp = await client.put(mat_detail(str(project.id), FAKE_UUID), json={"name": "X"})
        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_unauthenticated_delete_returns_401(self, client, project):
        resp = await client.delete(mat_detail(str(project.id), FAKE_UUID))
        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_unauthenticated_submit_returns_401(self, client, project):
        resp = await client.post(mat_submit(str(project.id), FAKE_UUID))
        assert resp.status_code == 401


class TestProjectAccessControl:

    @pytest.mark.asyncio
    async def test_user_without_project_access_gets_403(self, user_client, project):
        resp = await user_client.get(mat_url(str(project.id)))
        assert resp.status_code == 403

    @pytest.mark.asyncio
    async def test_user_with_access_can_list(self, user_client, project, db, regular_user):
        db.add(ProjectMember(project_id=project.id, user_id=regular_user.id, role="contractor"))
        await db.commit()
        resp = await user_client.get(mat_url(str(project.id)))
        assert resp.status_code == 200

    @pytest.mark.asyncio
    async def test_user_with_access_can_create(self, user_client, project, db, regular_user):
        db.add(ProjectMember(project_id=project.id, user_id=regular_user.id, role="contractor"))
        await db.commit()
        resp = await user_client.post(mat_url(str(project.id)), json=mat_payload())
        assert resp.status_code == 200

    @pytest.mark.asyncio
    async def test_user_create_sets_creator(self, user_client, project, db, regular_user):
        db.add(ProjectMember(project_id=project.id, user_id=regular_user.id, role="contractor"))
        await db.commit()
        resp = await user_client.post(mat_url(str(project.id)), json=mat_payload())
        cb = resp.json().get("createdBy")
        if cb:
            assert cb["id"] == str(regular_user.id)

    @pytest.mark.asyncio
    async def test_user_can_update(self, user_client, admin_client, project, db, regular_user):
        db.add(ProjectMember(project_id=project.id, user_id=regular_user.id, role="contractor"))
        await db.commit()
        mat = await create_mat(admin_client, project.id)
        resp = await user_client.put(
            mat_detail(str(project.id), mat["id"]), json={"name": "User Updated"}
        )
        assert resp.status_code == 200

    @pytest.mark.asyncio
    async def test_user_can_delete(self, user_client, admin_client, project, db, regular_user):
        db.add(ProjectMember(project_id=project.id, user_id=regular_user.id, role="contractor"))
        await db.commit()
        mat = await create_mat(admin_client, project.id)
        resp = await user_client.delete(mat_detail(str(project.id), mat["id"]))
        assert resp.status_code == 200

    @pytest.mark.asyncio
    async def test_user_can_submit(self, user_client, admin_client, project, db, regular_user):
        db.add(ProjectMember(project_id=project.id, user_id=regular_user.id, role="contractor"))
        await db.commit()
        mat = await create_mat(admin_client, project.id)
        resp = await user_client.post(mat_submit(str(project.id), mat["id"]))
        assert resp.status_code == 200
        assert resp.json()["status"] == "submitted"

    @pytest.mark.asyncio
    async def test_nonexistent_project_returns_403(self, admin_client):
        resp = await admin_client.get(mat_url(FAKE_UUID))
        assert resp.status_code == 403


class TestXSSSanitizationExtended:

    @pytest.mark.asyncio
    @pytest.mark.parametrize("xss,marker", [
        ('<script>alert("xss")</script>', "<script"),
        ('javascript:alert(1)', "javascript:"),
        ('<img src=x onerror=alert(1)>', "<img"),
        ('<iframe src="evil.com"></iframe>', "<iframe"),
        ('<svg onload=alert(1)></svg>', "<svg"),
        ('<style>body{display:none}</style>', "<style"),
    ])
    async def test_xss_stripped_from_name(self, admin_client, project, xss, marker):
        resp = await admin_client.post(
            mat_url(str(project.id)), json={"name": f"Safe {xss} Name"}
        )
        if resp.status_code == 200:
            assert marker not in resp.json()["name"].lower()

    @pytest.mark.asyncio
    @pytest.mark.parametrize("field", [
        "material_type", "manufacturer", "model_number", "unit",
        "storage_location", "notes",
    ])
    async def test_xss_stripped_from_optional_fields(self, admin_client, project, field):
        data = {"name": "Safe Mat", field: '<script>alert(1)</script>Injected'}
        resp = await admin_client.post(mat_url(str(project.id)), json=data)
        if resp.status_code == 200:
            camel_map = {
                "material_type": "materialType", "manufacturer": "manufacturer",
                "model_number": "modelNumber", "unit": "unit",
                "storage_location": "storageLocation", "notes": "notes",
            }
            val = resp.json().get(camel_map[field], "")
            if val:
                assert "<script" not in val.lower()

    @pytest.mark.asyncio
    async def test_xss_stripped_from_spec_keys(self, admin_client, project):
        resp = await admin_client.post(
            mat_url(str(project.id)),
            json={"name": "Spec XSS", "specifications": {'<script>x</script>': "val"}},
        )
        if resp.status_code == 200:
            for k in resp.json().get("specifications", {}):
                assert "<script" not in k.lower()

    @pytest.mark.asyncio
    async def test_xss_stripped_from_spec_values(self, admin_client, project):
        resp = await admin_client.post(
            mat_url(str(project.id)),
            json={"name": "Spec Val XSS", "specifications": {"key": '<img src=x onerror=alert(1)>'}},
        )
        if resp.status_code == 200:
            for v in resp.json().get("specifications", {}).values():
                if isinstance(v, str):
                    assert "<img" not in v.lower()

    @pytest.mark.asyncio
    @pytest.mark.parametrize("field", ["name", "material_type", "notes"])
    async def test_xss_stripped_on_update(self, admin_client, project, field):
        mat = await create_mat(admin_client, project.id)
        update_data = {}
        if field == "name":
            update_data["name"] = 'Safe <script>alert(1)</script> Name'
        else:
            update_data[field] = '<script>alert(1)</script>Injected'
        resp = await admin_client.put(
            mat_detail(str(project.id), mat["id"]), json=update_data
        )
        if resp.status_code == 200:
            camel_map = {
                "name": "name", "material_type": "materialType", "notes": "notes",
            }
            val = resp.json().get(camel_map[field], "")
            if val:
                assert "<script" not in val.lower()


class TestResponseFormatExtended:

    @pytest.mark.asyncio
    async def test_no_snake_case_keys(self, admin_client, project):
        mat = await create_mat(admin_client, project.id)
        snake_keys = ["material_type", "model_number", "storage_location",
                       "expected_delivery", "actual_delivery", "project_id",
                       "created_at", "updated_at", "created_by_id"]
        for k in snake_keys:
            assert k not in mat, f"Snake case key '{k}' in response"

    @pytest.mark.asyncio
    async def test_id_is_valid_uuid(self, admin_client, project):
        mat = await create_mat(admin_client, project.id)
        parsed = uuid.UUID(mat["id"])
        assert str(parsed) == mat["id"]

    @pytest.mark.asyncio
    async def test_project_id_matches(self, admin_client, project):
        mat = await create_mat(admin_client, project.id)
        assert mat["projectId"] == str(project.id)

    @pytest.mark.asyncio
    async def test_delete_response_has_message(self, admin_client, project):
        mat = await create_mat(admin_client, project.id)
        resp = await admin_client.delete(mat_detail(str(project.id), mat["id"]))
        assert "message" in resp.json()

    @pytest.mark.asyncio
    @pytest.mark.parametrize("camel_field", [
        "materialType", "modelNumber", "storageLocation",
        "expectedDelivery", "actualDelivery", "projectId",
        "createdAt", "updatedAt",
    ])
    async def test_camel_case_field_present(self, admin_client, project, camel_field):
        mat = await create_mat(admin_client, project.id)
        assert camel_field in mat


class TestCRUDWorkflowsExtended:

    @pytest.mark.asyncio
    async def test_full_lifecycle(self, admin_client, project):
        mat = await create_mat(admin_client, project.id)
        mid = mat["id"]
        pid = str(project.id)
        get_resp = await admin_client.get(mat_detail(pid, mid))
        assert get_resp.status_code == 200
        upd_resp = await admin_client.put(mat_detail(pid, mid), json={"name": "Renamed Mat"})
        assert upd_resp.json()["name"] == "Renamed Mat"
        sub_resp = await admin_client.post(mat_submit(pid, mid))
        assert sub_resp.json()["status"] == "submitted"
        del_resp = await admin_client.delete(mat_detail(pid, mid))
        assert del_resp.status_code == 200
        gone = await admin_client.get(mat_detail(pid, mid))
        assert gone.status_code == 404

    @pytest.mark.asyncio
    async def test_create_update_submit(self, admin_client, project):
        mat = await create_mat(admin_client, project.id)
        pid = str(project.id)
        await admin_client.put(
            mat_detail(pid, mat["id"]),
            json={"quantity": "999", "storage_location": "Updated Warehouse"},
        )
        resp = await admin_client.post(mat_submit(pid, mat["id"]))
        assert resp.json()["status"] == "submitted"

    @pytest.mark.asyncio
    async def test_update_after_submit_still_works(self, admin_client, project):
        mat = await create_mat(admin_client, project.id)
        pid = str(project.id)
        await admin_client.post(mat_submit(pid, mat["id"]))
        resp = await admin_client.put(
            mat_detail(pid, mat["id"]), json={"notes": "Post submit note"}
        )
        assert resp.status_code == 200

    @pytest.mark.asyncio
    async def test_create_multiple_then_delete_all(self, admin_client, project):
        ids = []
        pid = str(project.id)
        for i in range(5):
            mat = await create_mat(admin_client, project.id, name=f"Batch {i}")
            ids.append(mat["id"])
        for mid in ids:
            resp = await admin_client.delete(mat_detail(pid, mid))
            assert resp.status_code == 200
        resp = await admin_client.get(mat_url(pid))
        assert resp.json() == []


class TestEdgeCasesExtended:

    @pytest.mark.asyncio
    async def test_create_with_extra_fields_ignored(self, admin_client, project):
        data = mat_payload()
        data["unknown"] = "ignored"
        data["extra"] = 42
        resp = await admin_client.post(mat_url(str(project.id)), json=data)
        assert resp.status_code == 200

    @pytest.mark.asyncio
    async def test_duplicate_names_allowed(self, admin_client, project):
        for _ in range(3):
            resp = await admin_client.post(
                mat_url(str(project.id)), json={"name": "Same Name"}
            )
            assert resp.status_code == 200
        resp = await admin_client.get(mat_url(str(project.id)))
        same = [m for m in resp.json() if m["name"] == "Same Name"]
        assert len(same) == 3

    @pytest.mark.asyncio
    async def test_create_and_immediately_delete(self, admin_client, project):
        mat = await create_mat(admin_client, project.id, name="Ephemeral")
        resp = await admin_client.delete(mat_detail(str(project.id), mat["id"]))
        assert resp.status_code == 200
        resp = await admin_client.get(mat_detail(str(project.id), mat["id"]))
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_invalid_project_uuid_returns_422(self, admin_client):
        resp = await admin_client.get(f"{API}/projects/not-uuid/materials")
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_specs_boolean_values(self, admin_client, project):
        specs = {"certified": True, "recycled": False}
        data = await create_mat(admin_client, project.id, specifications=specs)
        assert data["specifications"]["certified"] is True
        assert data["specifications"]["recycled"] is False

    @pytest.mark.asyncio
    async def test_specs_numeric_values(self, admin_client, project):
        specs = {"weight_kg": 50, "density": 2.4}
        data = await create_mat(admin_client, project.id, specifications=specs)
        assert data["specifications"]["weight_kg"] == 50
        assert data["specifications"]["density"] == 2.4

    @pytest.mark.asyncio
    async def test_update_one_does_not_affect_other(self, admin_client, project):
        m1 = await create_mat(admin_client, project.id, name="Original A")
        m2 = await create_mat(admin_client, project.id, name="Original B")
        await admin_client.put(
            mat_detail(str(project.id), m1["id"]), json={"name": "Changed A"}
        )
        resp = await admin_client.get(mat_detail(str(project.id), m2["id"]))
        assert resp.json()["name"] == "Original B"

    @pytest.mark.asyncio
    @pytest.mark.parametrize("name", [
        "AB",
        "Material with spaces",
        "Material-with-dashes",
        "Material_underscores",
        "Material (parens)",
        "Material #42",
        "123 Numeric Start",
    ])
    async def test_various_valid_name_formats(self, admin_client, project, name):
        resp = await admin_client.post(mat_url(str(project.id)), json={"name": name})
        assert resp.status_code == 200


class TestQuantityUnitCombinations:

    @pytest.mark.asyncio
    @pytest.mark.parametrize("quantity,unit", [
        (None, None),
        (0, "kg"),
        (100, "bags"),
        (999999999, "tons"),
        (0.01, "liters"),
    ])
    async def test_quantity_unit_combos(self, admin_client, project, quantity, unit):
        data = {"name": "Qty Unit Test"}
        if quantity is not None:
            data["quantity"] = quantity
        if unit is not None:
            data["unit"] = unit
        resp = await admin_client.post(mat_url(str(project.id)), json=data)
        assert resp.status_code == 200

    @pytest.mark.asyncio
    async def test_quantity_without_unit(self, admin_client, project):
        data = await create_mat(admin_client, project.id, quantity="50", unit=None)
        assert float(data["quantity"]) == 50
        assert data["unit"] is None

    @pytest.mark.asyncio
    async def test_unit_without_quantity(self, admin_client, project):
        data = await create_mat(admin_client, project.id, quantity=None, unit="m3")
        assert data["quantity"] is None
        assert data["unit"] == "m3"


class TestMultipleMaterialsExtended:

    @pytest.mark.asyncio
    @pytest.mark.parametrize("count", [1, 3, 7, 10])
    async def test_create_n_and_list(self, admin_client, project, count):
        for i in range(count):
            await create_mat(admin_client, project.id, name=f"Mat-{i}")
        resp = await admin_client.get(mat_url(str(project.id)))
        assert len(resp.json()) == count

    @pytest.mark.asyncio
    @pytest.mark.parametrize("delete_idx", [0, 1, 2])
    async def test_delete_one_of_three(self, admin_client, project, delete_idx):
        ids = []
        for i in range(3):
            mat = await create_mat(admin_client, project.id, name=f"Del-{i}")
            ids.append(mat["id"])
        await admin_client.delete(mat_detail(str(project.id), ids[delete_idx]))
        resp = await admin_client.get(mat_url(str(project.id)))
        remaining = [m["id"] for m in resp.json()]
        assert ids[delete_idx] not in remaining
        assert len(remaining) == 2


class TestNotFoundAndErrorExtended:

    @pytest.mark.asyncio
    @pytest.mark.parametrize("method,path_func", [
        ("GET", lambda pid: mat_detail(pid, FAKE_UUID)),
        ("PUT", lambda pid: mat_detail(pid, FAKE_UUID)),
        ("DELETE", lambda pid: mat_detail(pid, FAKE_UUID)),
        ("POST", lambda pid: mat_submit(pid, FAKE_UUID)),
    ])
    async def test_404_for_nonexistent_material(self, admin_client, project, method, path_func):
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
            resp = await admin_client.get(mat_url(FAKE_UUID))
        elif method == "POST":
            resp = await admin_client.post(mat_url(FAKE_UUID), json=mat_payload())
        elif method == "PUT":
            resp = await admin_client.put(
                mat_detail(FAKE_UUID, FAKE_UUID_2), json={"name": "Ghost"}
            )
        else:
            resp = await admin_client.delete(mat_detail(FAKE_UUID, FAKE_UUID_2))
        assert resp.status_code == 403

    @pytest.mark.asyncio
    async def test_422_for_invalid_uuid_material_id(self, admin_client, project):
        resp = await admin_client.get(mat_detail(str(project.id), "not-uuid"))
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_422_for_invalid_uuid_project_id(self, admin_client):
        resp = await admin_client.get(mat_url("not-uuid"))
        assert resp.status_code == 422


class TestMaterialSpecificFields:

    @pytest.mark.asyncio
    async def test_quantity_returned_as_number(self, admin_client, project):
        data = await create_mat(admin_client, project.id, quantity="123.45")
        assert isinstance(data["quantity"], (int, float, str))
        assert abs(float(data["quantity"]) - 123.45) < 0.01

    @pytest.mark.asyncio
    async def test_expected_delivery_format(self, admin_client, project):
        data = await create_mat(admin_client, project.id, expected_delivery="2025-09-15")
        assert data["expectedDelivery"] == "2025-09-15"

    @pytest.mark.asyncio
    async def test_actual_delivery_format(self, admin_client, project):
        data = await create_mat(admin_client, project.id, actual_delivery="2025-09-20")
        assert data["actualDelivery"] == "2025-09-20"

    @pytest.mark.asyncio
    async def test_storage_location_field(self, admin_client, project):
        data = await create_mat(admin_client, project.id, storage_location="Building C - Floor 2")
        assert data["storageLocation"] == "Building C - Floor 2"

    @pytest.mark.asyncio
    async def test_unit_field(self, admin_client, project):
        data = await create_mat(admin_client, project.id, unit="cubic meters")
        assert data["unit"] == "cubic meters"

    @pytest.mark.asyncio
    async def test_material_type_field(self, admin_client, project):
        data = await create_mat(admin_client, project.id, material_type="insulation")
        assert data["materialType"] == "insulation"

    @pytest.mark.asyncio
    async def test_update_quantity_to_zero(self, admin_client, project):
        mat = await create_mat(admin_client, project.id, quantity="100")
        resp = await admin_client.put(
            mat_detail(str(project.id), mat["id"]), json={"quantity": 0}
        )
        assert resp.status_code == 200
        assert float(resp.json()["quantity"]) == 0

    @pytest.mark.asyncio
    async def test_update_expected_delivery(self, admin_client, project):
        mat = await create_mat(admin_client, project.id)
        resp = await admin_client.put(
            mat_detail(str(project.id), mat["id"]),
            json={"expected_delivery": "2026-06-01"},
        )
        assert resp.status_code == 200
        assert resp.json()["expectedDelivery"] == "2026-06-01"

    @pytest.mark.asyncio
    async def test_update_actual_delivery(self, admin_client, project):
        mat = await create_mat(admin_client, project.id)
        resp = await admin_client.put(
            mat_detail(str(project.id), mat["id"]),
            json={"actual_delivery": "2026-06-05"},
        )
        assert resp.status_code == 200
        assert resp.json()["actualDelivery"] == "2026-06-05"

    @pytest.mark.asyncio
    async def test_update_date_to_null(self, admin_client, project):
        mat = await create_mat(admin_client, project.id)
        resp = await admin_client.put(
            mat_detail(str(project.id), mat["id"]),
            json={"expected_delivery": None, "actual_delivery": None},
        )
        assert resp.status_code == 200
