import uuid
from decimal import Decimal

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.equipment import Equipment, ApprovalStatus
from app.models.material import Material
from app.models.project import Project, ProjectMember
from app.models.user import User

API_V1 = "/api/v1"
FAKE_UUID = str(uuid.uuid4())
FAKE_UUID_2 = str(uuid.uuid4())


def eq_url(project_id):
    return f"{API_V1}/projects/{project_id}/equipment"


def eq_detail_url(project_id, equipment_id):
    return f"{API_V1}/projects/{project_id}/equipment/{equipment_id}"


def mat_url(project_id):
    return f"{API_V1}/projects/{project_id}/materials"


def mat_detail_url(project_id, material_id):
    return f"{API_V1}/projects/{project_id}/materials/{material_id}"


def valid_equipment(**overrides):
    base = {
        "name": "Tower Crane TC-500",
        "equipment_type": "crane",
        "manufacturer": "Liebherr",
        "model_number": "TC500",
        "serial_number": "SN-98765",
        "specifications": {"max_load": "12 tons", "boom_length": "60m"},
        "notes": "Main tower crane for site A",
    }
    base.update(overrides)
    return base


def valid_material(**overrides):
    base = {
        "name": "Reinforced Steel Rebar",
        "material_type": "steel",
        "manufacturer": "ArcelorMittal",
        "model_number": "RB-16",
        "quantity": "500.00",
        "unit": "tons",
        "specifications": {"grade": "Fe500", "diameter": "16mm"},
        "storage_location": "Yard B - Stack 4",
        "notes": "Grade Fe500 ribbed bars",
    }
    base.update(overrides)
    return base


async def create_eq(client, project_id, **overrides):
    payload = valid_equipment(**overrides)
    resp = await client.post(eq_url(str(project_id)), json=payload)
    assert resp.status_code == 200
    return resp.json()


async def create_mat(client, project_id, **overrides):
    payload = valid_material(**overrides)
    resp = await client.post(mat_url(str(project_id)), json=payload)
    assert resp.status_code == 200
    return resp.json()


async def create_second_project(db, admin_user):
    proj = Project(
        id=uuid.uuid4(),
        name="Second Project",
        code="SEC-001",
        status="active",
        created_by_id=admin_user.id,
    )
    db.add(proj)
    await db.flush()
    member = ProjectMember(
        project_id=proj.id,
        user_id=admin_user.id,
        role="project_admin",
    )
    db.add(member)
    await db.commit()
    await db.refresh(proj)
    return proj


# ---------------------------------------------------------------------------
# EQUIPMENT CRUD TESTS (~35)
# ---------------------------------------------------------------------------


class TestEquipmentCreate:

    @pytest.mark.asyncio
    async def test_create_equipment_all_fields(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.post(eq_url(str(project.id)), json=valid_equipment())
        assert resp.status_code == 200
        data = resp.json()
        assert data["name"] == "Tower Crane TC-500"
        assert data["equipmentType"] == "crane"
        assert data["manufacturer"] == "Liebherr"
        assert data["modelNumber"] == "TC500"
        assert data["serialNumber"] == "SN-98765"
        assert data["status"] == "draft"

    @pytest.mark.asyncio
    async def test_create_equipment_minimal_name_only(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.post(eq_url(str(project.id)), json={"name": "AB"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["name"] == "AB"
        assert data["equipmentType"] is None
        assert data["manufacturer"] is None
        assert data["modelNumber"] is None

    @pytest.mark.asyncio
    async def test_create_equipment_missing_name_returns_422(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.post(eq_url(str(project.id)), json={})
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_create_equipment_empty_body_returns_422(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.post(eq_url(str(project.id)), json={})
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_create_equipment_name_too_short(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.post(eq_url(str(project.id)), json={"name": "A"})
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_create_equipment_name_too_long(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.post(eq_url(str(project.id)), json={"name": "X" * 256})
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_create_equipment_default_status_is_draft(self, admin_client: AsyncClient, project: Project):
        data = await create_eq(admin_client, project.id)
        assert data["status"] == "draft"

    @pytest.mark.asyncio
    async def test_create_equipment_sets_project_id(self, admin_client: AsyncClient, project: Project):
        data = await create_eq(admin_client, project.id)
        assert data["projectId"] == str(project.id)

    @pytest.mark.asyncio
    async def test_create_equipment_sets_created_by(self, admin_client: AsyncClient, project: Project, admin_user: User):
        data = await create_eq(admin_client, project.id)
        assert data["createdBy"]["id"] == str(admin_user.id)

    @pytest.mark.asyncio
    async def test_create_equipment_with_specifications(self, admin_client: AsyncClient, project: Project):
        specs = {"voltage": "380V", "phase": 3, "certified": True}
        data = await create_eq(admin_client, project.id, specifications=specs)
        assert data["specifications"]["voltage"] == "380V"
        assert data["specifications"]["phase"] == 3
        assert data["specifications"]["certified"] is True

    @pytest.mark.asyncio
    async def test_create_equipment_with_null_specs(self, admin_client: AsyncClient, project: Project):
        data = await create_eq(admin_client, project.id, specifications=None)
        assert data["specifications"] is None

    @pytest.mark.asyncio
    async def test_create_equipment_with_empty_specs(self, admin_client: AsyncClient, project: Project):
        data = await create_eq(admin_client, project.id, specifications={})
        assert data["specifications"] == {}

    @pytest.mark.asyncio
    async def test_create_equipment_with_installation_date(self, admin_client: AsyncClient, project: Project):
        data = await create_eq(admin_client, project.id, installation_date="2025-03-01T09:00:00")
        assert data["installationDate"] is not None

    @pytest.mark.asyncio
    async def test_create_equipment_id_is_valid_uuid(self, admin_client: AsyncClient, project: Project):
        data = await create_eq(admin_client, project.id)
        uuid.UUID(data["id"])


class TestEquipmentList:

    @pytest.mark.asyncio
    async def test_list_equipment_empty(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.get(eq_url(str(project.id)))
        assert resp.status_code == 200
        assert resp.json() == []

    @pytest.mark.asyncio
    async def test_list_equipment_with_items(self, admin_client: AsyncClient, project: Project):
        await create_eq(admin_client, project.id, name="Equip Alpha")
        await create_eq(admin_client, project.id, name="Equip Beta")
        resp = await admin_client.get(eq_url(str(project.id)))
        assert resp.status_code == 200
        assert len(resp.json()) == 2

    @pytest.mark.asyncio
    async def test_list_equipment_returns_camel_case(self, admin_client: AsyncClient, project: Project):
        await create_eq(admin_client, project.id)
        resp = await admin_client.get(eq_url(str(project.id)))
        item = resp.json()[0]
        assert "equipmentType" in item
        assert "modelNumber" in item
        assert "serialNumber" in item
        assert "projectId" in item

    @pytest.mark.asyncio
    async def test_flat_list_equipment_no_filter(self, admin_client: AsyncClient, project: Project):
        await create_eq(admin_client, project.id)
        resp = await admin_client.get(f"{API_V1}/equipment")
        assert resp.status_code == 200
        assert len(resp.json()) >= 1

    @pytest.mark.asyncio
    async def test_flat_list_equipment_with_project_filter(self, admin_client: AsyncClient, project: Project):
        await create_eq(admin_client, project.id)
        resp = await admin_client.get(f"{API_V1}/equipment", params={"project_id": str(project.id)})
        assert resp.status_code == 200
        assert all(e["projectId"] == str(project.id) for e in resp.json())

    @pytest.mark.asyncio
    async def test_flat_list_nonexistent_project_filter_returns_empty(self, admin_client: AsyncClient, project: Project):
        await create_eq(admin_client, project.id)
        resp = await admin_client.get(f"{API_V1}/equipment", params={"project_id": FAKE_UUID})
        assert resp.status_code == 200
        assert resp.json() == []


class TestEquipmentGetSingle:

    @pytest.mark.asyncio
    async def test_get_equipment_by_id(self, admin_client: AsyncClient, project: Project):
        created = await create_eq(admin_client, project.id)
        resp = await admin_client.get(eq_detail_url(str(project.id), created["id"]))
        assert resp.status_code == 200
        assert resp.json()["id"] == created["id"]
        assert resp.json()["name"] == created["name"]

    @pytest.mark.asyncio
    async def test_get_equipment_not_found(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.get(eq_detail_url(str(project.id), FAKE_UUID))
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_get_equipment_wrong_project(self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User):
        created = await create_eq(admin_client, project.id)
        proj2 = await create_second_project(db, admin_user)
        resp = await admin_client.get(eq_detail_url(str(proj2.id), created["id"]))
        assert resp.status_code == 404


class TestEquipmentUpdate:

    @pytest.mark.asyncio
    async def test_update_equipment_name(self, admin_client: AsyncClient, project: Project):
        created = await create_eq(admin_client, project.id)
        resp = await admin_client.put(
            eq_detail_url(str(project.id), created["id"]),
            json={"name": "Updated Crane Name"},
        )
        assert resp.status_code == 200
        assert resp.json()["name"] == "Updated Crane Name"

    @pytest.mark.asyncio
    async def test_update_equipment_partial_preserves_fields(self, admin_client: AsyncClient, project: Project):
        created = await create_eq(admin_client, project.id)
        resp = await admin_client.put(
            eq_detail_url(str(project.id), created["id"]),
            json={"notes": "New notes only"},
        )
        assert resp.status_code == 200
        assert resp.json()["notes"] == "New notes only"
        assert resp.json()["manufacturer"] == "Liebherr"

    @pytest.mark.asyncio
    async def test_update_equipment_specifications(self, admin_client: AsyncClient, project: Project):
        created = await create_eq(admin_client, project.id)
        new_specs = {"power": "200kW", "fuel_type": "diesel"}
        resp = await admin_client.put(
            eq_detail_url(str(project.id), created["id"]),
            json={"specifications": new_specs},
        )
        assert resp.status_code == 200
        assert resp.json()["specifications"] == new_specs

    @pytest.mark.asyncio
    async def test_update_equipment_not_found(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.put(
            eq_detail_url(str(project.id), FAKE_UUID),
            json={"name": "Ghost"},
        )
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_update_equipment_full(self, admin_client: AsyncClient, project: Project):
        created = await create_eq(admin_client, project.id)
        update_payload = {
            "name": "Fully Updated",
            "equipment_type": "excavator",
            "manufacturer": "Komatsu",
            "model_number": "PC200",
            "serial_number": "SN-NEWWW",
            "specifications": {"bucket_size": "1.2m3"},
            "notes": "Fully replaced data",
        }
        resp = await admin_client.put(
            eq_detail_url(str(project.id), created["id"]),
            json=update_payload,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["name"] == "Fully Updated"
        assert data["equipmentType"] == "excavator"
        assert data["manufacturer"] == "Komatsu"
        assert data["modelNumber"] == "PC200"

    @pytest.mark.asyncio
    async def test_update_equipment_empty_body_succeeds(self, admin_client: AsyncClient, project: Project):
        created = await create_eq(admin_client, project.id)
        resp = await admin_client.put(
            eq_detail_url(str(project.id), created["id"]),
            json={},
        )
        assert resp.status_code == 200


class TestEquipmentDelete:

    @pytest.mark.asyncio
    async def test_delete_equipment_success(self, admin_client: AsyncClient, project: Project):
        created = await create_eq(admin_client, project.id)
        resp = await admin_client.delete(eq_detail_url(str(project.id), created["id"]))
        assert resp.status_code == 200
        assert resp.json()["message"] == "Equipment deleted"

    @pytest.mark.asyncio
    async def test_delete_equipment_then_get_returns_404(self, admin_client: AsyncClient, project: Project):
        created = await create_eq(admin_client, project.id)
        await admin_client.delete(eq_detail_url(str(project.id), created["id"]))
        resp = await admin_client.get(eq_detail_url(str(project.id), created["id"]))
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_delete_equipment_not_found(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.delete(eq_detail_url(str(project.id), FAKE_UUID))
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_delete_equipment_removes_from_list(self, admin_client: AsyncClient, project: Project):
        eq1 = await create_eq(admin_client, project.id, name="Keep This")
        eq2 = await create_eq(admin_client, project.id, name="Delete This")
        await admin_client.delete(eq_detail_url(str(project.id), eq2["id"]))
        resp = await admin_client.get(eq_url(str(project.id)))
        names = [e["name"] for e in resp.json()]
        assert "Keep This" in names
        assert "Delete This" not in names

    @pytest.mark.asyncio
    async def test_delete_equipment_idempotency_second_delete_returns_404(self, admin_client: AsyncClient, project: Project):
        created = await create_eq(admin_client, project.id)
        await admin_client.delete(eq_detail_url(str(project.id), created["id"]))
        resp = await admin_client.delete(eq_detail_url(str(project.id), created["id"]))
        assert resp.status_code == 404


class TestEquipmentStatusTransitions:

    @pytest.mark.asyncio
    async def test_submit_equipment_changes_status_to_submitted(self, admin_client: AsyncClient, project: Project):
        created = await create_eq(admin_client, project.id)
        resp = await admin_client.post(
            f"{API_V1}/projects/{project.id}/equipment/{created['id']}/submit"
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "submitted"

    @pytest.mark.asyncio
    async def test_equipment_specifications_jsonb_update_replaces(self, admin_client: AsyncClient, project: Project):
        created = await create_eq(admin_client, project.id, specifications={"old": "data"})
        resp = await admin_client.put(
            eq_detail_url(str(project.id), created["id"]),
            json={"specifications": {"new": "data"}},
        )
        assert resp.status_code == 200
        assert "old" not in resp.json()["specifications"]
        assert resp.json()["specifications"]["new"] == "data"


# ---------------------------------------------------------------------------
# MATERIALS CRUD TESTS (~35)
# ---------------------------------------------------------------------------


class TestMaterialCreate:

    @pytest.mark.asyncio
    async def test_create_material_all_fields(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.post(mat_url(str(project.id)), json=valid_material())
        assert resp.status_code == 200
        data = resp.json()
        assert data["name"] == "Reinforced Steel Rebar"
        assert data["materialType"] == "steel"
        assert data["manufacturer"] == "ArcelorMittal"
        assert data["modelNumber"] == "RB-16"
        assert data["unit"] == "tons"
        assert data["status"] == "draft"

    @pytest.mark.asyncio
    async def test_create_material_minimal_name_only(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.post(mat_url(str(project.id)), json={"name": "Concrete Mix"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["name"] == "Concrete Mix"
        assert data["materialType"] is None
        assert data["manufacturer"] is None
        assert data["quantity"] is None
        assert data["unit"] is None

    @pytest.mark.asyncio
    async def test_create_material_missing_name_returns_422(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.post(mat_url(str(project.id)), json={"material_type": "wood"})
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_create_material_empty_body_returns_422(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.post(mat_url(str(project.id)), json={})
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_create_material_name_too_short(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.post(mat_url(str(project.id)), json={"name": "X"})
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_create_material_name_too_long(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.post(mat_url(str(project.id)), json={"name": "X" * 256})
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_create_material_default_status_is_draft(self, admin_client: AsyncClient, project: Project):
        data = await create_mat(admin_client, project.id)
        assert data["status"] == "draft"

    @pytest.mark.asyncio
    async def test_create_material_sets_project_id(self, admin_client: AsyncClient, project: Project):
        data = await create_mat(admin_client, project.id)
        assert data["projectId"] == str(project.id)

    @pytest.mark.asyncio
    async def test_create_material_sets_created_by(self, admin_client: AsyncClient, project: Project, admin_user: User):
        data = await create_mat(admin_client, project.id)
        assert data["createdBy"]["id"] == str(admin_user.id)

    @pytest.mark.asyncio
    async def test_create_material_with_quantity_and_unit(self, admin_client: AsyncClient, project: Project):
        data = await create_mat(admin_client, project.id, quantity="250.50", unit="m3")
        assert float(data["quantity"]) == pytest.approx(250.50, abs=0.01)
        assert data["unit"] == "m3"

    @pytest.mark.asyncio
    async def test_create_material_zero_quantity(self, admin_client: AsyncClient, project: Project):
        data = await create_mat(admin_client, project.id, quantity=0, unit="kg")
        assert float(data["quantity"]) == 0

    @pytest.mark.asyncio
    async def test_create_material_negative_quantity_returns_422(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.post(
            mat_url(str(project.id)),
            json={"name": "Bad Qty", "quantity": -10},
        )
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_create_material_quantity_over_max_returns_422(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.post(
            mat_url(str(project.id)),
            json={"name": "Over Max", "quantity": 1000000000},
        )
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_create_material_with_specifications(self, admin_client: AsyncClient, project: Project):
        specs = {"tensile_strength": "500MPa", "elongation": 14}
        data = await create_mat(admin_client, project.id, specifications=specs)
        assert data["specifications"]["tensile_strength"] == "500MPa"
        assert data["specifications"]["elongation"] == 14

    @pytest.mark.asyncio
    async def test_create_material_with_delivery_dates(self, admin_client: AsyncClient, project: Project):
        data = await create_mat(
            admin_client, project.id,
            expected_delivery="2026-06-15",
            actual_delivery="2026-06-20",
        )
        assert data["expectedDelivery"] == "2026-06-15"
        assert data["actualDelivery"] == "2026-06-20"

    @pytest.mark.asyncio
    async def test_create_material_with_storage_location(self, admin_client: AsyncClient, project: Project):
        data = await create_mat(admin_client, project.id, storage_location="Warehouse C")
        assert data["storageLocation"] == "Warehouse C"

    @pytest.mark.asyncio
    async def test_create_material_id_is_valid_uuid(self, admin_client: AsyncClient, project: Project):
        data = await create_mat(admin_client, project.id)
        uuid.UUID(data["id"])

    @pytest.mark.asyncio
    @pytest.mark.parametrize("unit", ["kg", "bags", "liters", "m3", "tons", "pcs"])
    async def test_create_material_different_units(self, admin_client: AsyncClient, project: Project, unit):
        data = await create_mat(admin_client, project.id, unit=unit)
        assert data["unit"] == unit


class TestMaterialList:

    @pytest.mark.asyncio
    async def test_list_materials_empty(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.get(mat_url(str(project.id)))
        assert resp.status_code == 200
        assert resp.json() == []

    @pytest.mark.asyncio
    async def test_list_materials_with_items(self, admin_client: AsyncClient, project: Project):
        await create_mat(admin_client, project.id, name="Mat Alpha")
        await create_mat(admin_client, project.id, name="Mat Beta")
        resp = await admin_client.get(mat_url(str(project.id)))
        assert resp.status_code == 200
        assert len(resp.json()) == 2

    @pytest.mark.asyncio
    async def test_list_materials_returns_camel_case(self, admin_client: AsyncClient, project: Project):
        await create_mat(admin_client, project.id)
        resp = await admin_client.get(mat_url(str(project.id)))
        item = resp.json()[0]
        assert "materialType" in item
        assert "modelNumber" in item
        assert "storageLocation" in item
        assert "expectedDelivery" in item
        assert "projectId" in item

    @pytest.mark.asyncio
    async def test_flat_list_materials_no_filter(self, admin_client: AsyncClient, project: Project):
        await create_mat(admin_client, project.id)
        resp = await admin_client.get(f"{API_V1}/materials")
        assert resp.status_code == 200
        assert len(resp.json()) >= 1

    @pytest.mark.asyncio
    async def test_flat_list_materials_with_project_filter(self, admin_client: AsyncClient, project: Project):
        await create_mat(admin_client, project.id)
        resp = await admin_client.get(f"{API_V1}/materials", params={"project_id": str(project.id)})
        assert resp.status_code == 200
        assert all(m["projectId"] == str(project.id) for m in resp.json())


class TestMaterialGetSingle:

    @pytest.mark.asyncio
    async def test_get_material_by_id(self, admin_client: AsyncClient, project: Project):
        created = await create_mat(admin_client, project.id)
        resp = await admin_client.get(mat_detail_url(str(project.id), created["id"]))
        assert resp.status_code == 200
        assert resp.json()["id"] == created["id"]

    @pytest.mark.asyncio
    async def test_get_material_not_found(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.get(mat_detail_url(str(project.id), FAKE_UUID))
        assert resp.status_code == 404


class TestMaterialUpdate:

    @pytest.mark.asyncio
    async def test_update_material_name(self, admin_client: AsyncClient, project: Project):
        created = await create_mat(admin_client, project.id)
        resp = await admin_client.put(
            mat_detail_url(str(project.id), created["id"]),
            json={"name": "Updated Rebar Name"},
        )
        assert resp.status_code == 200
        assert resp.json()["name"] == "Updated Rebar Name"

    @pytest.mark.asyncio
    async def test_update_material_quantity(self, admin_client: AsyncClient, project: Project):
        created = await create_mat(admin_client, project.id)
        resp = await admin_client.put(
            mat_detail_url(str(project.id), created["id"]),
            json={"quantity": "750.25"},
        )
        assert resp.status_code == 200
        assert float(resp.json()["quantity"]) == pytest.approx(750.25, abs=0.01)

    @pytest.mark.asyncio
    async def test_update_material_partial_preserves_fields(self, admin_client: AsyncClient, project: Project):
        created = await create_mat(admin_client, project.id)
        resp = await admin_client.put(
            mat_detail_url(str(project.id), created["id"]),
            json={"notes": "Partial update only"},
        )
        assert resp.status_code == 200
        assert resp.json()["notes"] == "Partial update only"
        assert resp.json()["manufacturer"] == "ArcelorMittal"

    @pytest.mark.asyncio
    async def test_update_material_full(self, admin_client: AsyncClient, project: Project):
        created = await create_mat(admin_client, project.id)
        resp = await admin_client.put(
            mat_detail_url(str(project.id), created["id"]),
            json={
                "name": "Full Update",
                "material_type": "concrete",
                "manufacturer": "Holcim",
                "model_number": "HC-50",
                "quantity": "300",
                "unit": "bags",
                "notes": "Fully replaced",
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["name"] == "Full Update"
        assert data["materialType"] == "concrete"
        assert data["manufacturer"] == "Holcim"

    @pytest.mark.asyncio
    async def test_update_material_not_found(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.put(
            mat_detail_url(str(project.id), FAKE_UUID),
            json={"name": "Ghost"},
        )
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_update_material_specifications(self, admin_client: AsyncClient, project: Project):
        created = await create_mat(admin_client, project.id)
        new_specs = {"compressive_strength": "40MPa", "slump": "100mm"}
        resp = await admin_client.put(
            mat_detail_url(str(project.id), created["id"]),
            json={"specifications": new_specs},
        )
        assert resp.status_code == 200
        assert resp.json()["specifications"] == new_specs

    @pytest.mark.asyncio
    async def test_update_material_delivery_dates(self, admin_client: AsyncClient, project: Project):
        created = await create_mat(admin_client, project.id)
        resp = await admin_client.put(
            mat_detail_url(str(project.id), created["id"]),
            json={"expected_delivery": "2026-09-01", "actual_delivery": "2026-09-05"},
        )
        assert resp.status_code == 200
        assert resp.json()["expectedDelivery"] == "2026-09-01"
        assert resp.json()["actualDelivery"] == "2026-09-05"


class TestMaterialDelete:

    @pytest.mark.asyncio
    async def test_delete_material_success(self, admin_client: AsyncClient, project: Project):
        created = await create_mat(admin_client, project.id)
        resp = await admin_client.delete(mat_detail_url(str(project.id), created["id"]))
        assert resp.status_code == 200
        assert resp.json()["message"] == "Material deleted"

    @pytest.mark.asyncio
    async def test_delete_material_then_get_returns_404(self, admin_client: AsyncClient, project: Project):
        created = await create_mat(admin_client, project.id)
        await admin_client.delete(mat_detail_url(str(project.id), created["id"]))
        resp = await admin_client.get(mat_detail_url(str(project.id), created["id"]))
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_delete_material_not_found(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.delete(mat_detail_url(str(project.id), FAKE_UUID))
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_delete_material_removes_from_list(self, admin_client: AsyncClient, project: Project):
        mat1 = await create_mat(admin_client, project.id, name="Keeper")
        mat2 = await create_mat(admin_client, project.id, name="Goner")
        await admin_client.delete(mat_detail_url(str(project.id), mat2["id"]))
        resp = await admin_client.get(mat_url(str(project.id)))
        names = [m["name"] for m in resp.json()]
        assert "Keeper" in names
        assert "Goner" not in names

    @pytest.mark.asyncio
    async def test_delete_material_second_delete_returns_404(self, admin_client: AsyncClient, project: Project):
        created = await create_mat(admin_client, project.id)
        await admin_client.delete(mat_detail_url(str(project.id), created["id"]))
        resp = await admin_client.delete(mat_detail_url(str(project.id), created["id"]))
        assert resp.status_code == 404


class TestMaterialSubmitWorkflow:

    @pytest.mark.asyncio
    async def test_submit_material_changes_status(self, admin_client: AsyncClient, project: Project):
        created = await create_mat(admin_client, project.id)
        resp = await admin_client.post(
            f"{API_V1}/projects/{project.id}/materials/{created['id']}/submit"
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "submitted"

    @pytest.mark.asyncio
    async def test_submit_material_preserves_data(self, admin_client: AsyncClient, project: Project):
        created = await create_mat(admin_client, project.id)
        resp = await admin_client.post(
            f"{API_V1}/projects/{project.id}/materials/{created['id']}/submit"
        )
        assert resp.json()["name"] == "Reinforced Steel Rebar"
        assert resp.json()["manufacturer"] == "ArcelorMittal"


# ---------------------------------------------------------------------------
# SECURITY / ACCESS CONTROL TESTS (~20)
# ---------------------------------------------------------------------------


class TestEquipmentAuthRequired:

    @pytest.mark.asyncio
    async def test_create_equipment_unauthenticated_returns_401(self, client: AsyncClient, project: Project):
        resp = await client.post(eq_url(str(project.id)), json=valid_equipment())
        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_update_equipment_unauthenticated_returns_401(self, client: AsyncClient, project: Project):
        resp = await client.put(
            eq_detail_url(str(project.id), FAKE_UUID),
            json={"name": "Unauthorized"},
        )
        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_delete_equipment_unauthenticated_returns_401(self, client: AsyncClient, project: Project):
        resp = await client.delete(eq_detail_url(str(project.id), FAKE_UUID))
        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_submit_equipment_unauthenticated_returns_401(self, client: AsyncClient, project: Project):
        resp = await client.post(f"{API_V1}/projects/{project.id}/equipment/{FAKE_UUID}/submit")
        assert resp.status_code == 401


class TestMaterialAuthRequired:

    @pytest.mark.asyncio
    async def test_create_material_unauthenticated_returns_401(self, client: AsyncClient, project: Project):
        resp = await client.post(mat_url(str(project.id)), json=valid_material())
        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_update_material_unauthenticated_returns_401(self, client: AsyncClient, project: Project):
        resp = await client.put(
            mat_detail_url(str(project.id), FAKE_UUID),
            json={"name": "Unauthorized"},
        )
        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_delete_material_unauthenticated_returns_401(self, client: AsyncClient, project: Project):
        resp = await client.delete(mat_detail_url(str(project.id), FAKE_UUID))
        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_submit_material_unauthenticated_returns_401(self, client: AsyncClient, project: Project):
        resp = await client.post(f"{API_V1}/projects/{project.id}/materials/{FAKE_UUID}/submit")
        assert resp.status_code == 401


class TestProjectAccessControl:

    @pytest.mark.asyncio
    async def test_user_without_project_access_cannot_create_equipment(
        self, user_client: AsyncClient, db: AsyncSession, admin_user: User
    ):
        isolated_proj = Project(
            id=uuid.uuid4(), name="No Access Proj", code="NAP-001",
            status="active", created_by_id=admin_user.id,
        )
        db.add(isolated_proj)
        await db.commit()
        resp = await user_client.post(
            eq_url(str(isolated_proj.id)),
            json=valid_equipment(),
        )
        assert resp.status_code == 403

    @pytest.mark.asyncio
    async def test_user_without_project_access_cannot_create_material(
        self, user_client: AsyncClient, db: AsyncSession, admin_user: User
    ):
        isolated_proj = Project(
            id=uuid.uuid4(), name="No Access Mat", code="NAM-001",
            status="active", created_by_id=admin_user.id,
        )
        db.add(isolated_proj)
        await db.commit()
        resp = await user_client.post(
            mat_url(str(isolated_proj.id)),
            json=valid_material(),
        )
        assert resp.status_code == 403

    @pytest.mark.asyncio
    async def test_user_without_project_access_cannot_update_equipment(
        self, user_client: AsyncClient, db: AsyncSession, admin_user: User,
    ):
        isolated_proj = Project(
            id=uuid.uuid4(), name="Iso Upd Eq", code="IUE-001",
            status="active", created_by_id=admin_user.id,
        )
        db.add(isolated_proj)
        await db.flush()
        member = ProjectMember(project_id=isolated_proj.id, user_id=admin_user.id, role="project_admin")
        db.add(member)
        equip = Equipment(
            id=uuid.uuid4(), project_id=isolated_proj.id, name="DB Created Eq",
            status=ApprovalStatus.DRAFT.value, created_by_id=admin_user.id,
        )
        db.add(equip)
        await db.commit()
        resp = await user_client.put(
            eq_detail_url(str(isolated_proj.id), str(equip.id)),
            json={"name": "Forbidden"},
        )
        assert resp.status_code == 403

    @pytest.mark.asyncio
    async def test_user_without_project_access_cannot_delete_material(
        self, user_client: AsyncClient, db: AsyncSession, admin_user: User,
    ):
        isolated_proj = Project(
            id=uuid.uuid4(), name="Iso Del Mat", code="IDM-001",
            status="active", created_by_id=admin_user.id,
        )
        db.add(isolated_proj)
        await db.flush()
        member = ProjectMember(project_id=isolated_proj.id, user_id=admin_user.id, role="project_admin")
        db.add(member)
        mat = Material(
            id=uuid.uuid4(), project_id=isolated_proj.id, name="DB Created Mat",
            status=ApprovalStatus.DRAFT.value, created_by_id=admin_user.id,
        )
        db.add(mat)
        await db.commit()
        resp = await user_client.delete(mat_detail_url(str(isolated_proj.id), str(mat.id)))
        assert resp.status_code == 403


class TestCrossProjectIsolation:

    @pytest.mark.asyncio
    async def test_equipment_from_project_a_not_visible_in_project_b(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        eq = await create_eq(admin_client, project.id, name="Project A Only")
        proj_b = await create_second_project(db, admin_user)
        resp = await admin_client.get(eq_detail_url(str(proj_b.id), eq["id"]))
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_material_from_project_a_not_visible_in_project_b(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        mat = await create_mat(admin_client, project.id, name="Project A Material")
        proj_b = await create_second_project(db, admin_user)
        resp = await admin_client.get(mat_detail_url(str(proj_b.id), mat["id"]))
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_equipment_list_scoped_to_project(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        await create_eq(admin_client, project.id, name="Eq In A")
        proj_b = await create_second_project(db, admin_user)
        await create_eq(admin_client, proj_b.id, name="Eq In B")
        resp_a = await admin_client.get(eq_url(str(project.id)))
        resp_b = await admin_client.get(eq_url(str(proj_b.id)))
        names_a = [e["name"] for e in resp_a.json()]
        names_b = [e["name"] for e in resp_b.json()]
        assert "Eq In A" in names_a
        assert "Eq In B" not in names_a
        assert "Eq In B" in names_b
        assert "Eq In A" not in names_b

    @pytest.mark.asyncio
    async def test_material_list_scoped_to_project(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        await create_mat(admin_client, project.id, name="Mat In A")
        proj_b = await create_second_project(db, admin_user)
        await create_mat(admin_client, proj_b.id, name="Mat In B")
        resp_a = await admin_client.get(mat_url(str(project.id)))
        resp_b = await admin_client.get(mat_url(str(proj_b.id)))
        names_a = [m["name"] for m in resp_a.json()]
        names_b = [m["name"] for m in resp_b.json()]
        assert "Mat In A" in names_a
        assert "Mat In B" not in names_a
        assert "Mat In B" in names_b

    @pytest.mark.asyncio
    async def test_cannot_update_equipment_via_wrong_project(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        eq = await create_eq(admin_client, project.id)
        proj_b = await create_second_project(db, admin_user)
        resp = await admin_client.put(
            eq_detail_url(str(proj_b.id), eq["id"]),
            json={"name": "IDOR Attack"},
        )
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_cannot_delete_material_via_wrong_project(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        mat = await create_mat(admin_client, project.id)
        proj_b = await create_second_project(db, admin_user)
        resp = await admin_client.delete(mat_detail_url(str(proj_b.id), mat["id"]))
        assert resp.status_code == 404


class TestInvalidUUIDFormat:

    @pytest.mark.asyncio
    async def test_invalid_uuid_equipment_id(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.get(
            f"{API_V1}/projects/{project.id}/equipment/not-a-uuid"
        )
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_invalid_uuid_material_id(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.get(
            f"{API_V1}/projects/{project.id}/materials/not-a-uuid"
        )
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_invalid_uuid_project_id_equipment(self, admin_client: AsyncClient):
        resp = await admin_client.get(f"{API_V1}/projects/bad-uuid/equipment")
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_invalid_uuid_project_id_materials(self, admin_client: AsyncClient):
        resp = await admin_client.get(f"{API_V1}/projects/bad-uuid/materials")
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_invalid_uuid_flat_list_filter_equipment(self, admin_client: AsyncClient):
        resp = await admin_client.get(f"{API_V1}/equipment", params={"project_id": "not-uuid"})
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_invalid_uuid_flat_list_filter_materials(self, admin_client: AsyncClient):
        resp = await admin_client.get(f"{API_V1}/materials", params={"project_id": "not-uuid"})
        assert resp.status_code == 422


# ---------------------------------------------------------------------------
# FULL LIFECYCLE TESTS
# ---------------------------------------------------------------------------


class TestFullLifecycle:

    @pytest.mark.asyncio
    async def test_equipment_full_crud_lifecycle(self, admin_client: AsyncClient, project: Project):
        created = await create_eq(admin_client, project.id)
        eq_id = created["id"]

        get_resp = await admin_client.get(eq_detail_url(str(project.id), eq_id))
        assert get_resp.status_code == 200

        list_resp = await admin_client.get(eq_url(str(project.id)))
        assert any(e["id"] == eq_id for e in list_resp.json())

        upd_resp = await admin_client.put(
            eq_detail_url(str(project.id), eq_id),
            json={"name": "Lifecycle Updated"},
        )
        assert upd_resp.status_code == 200
        assert upd_resp.json()["name"] == "Lifecycle Updated"

        del_resp = await admin_client.delete(eq_detail_url(str(project.id), eq_id))
        assert del_resp.status_code == 200

        gone_resp = await admin_client.get(eq_detail_url(str(project.id), eq_id))
        assert gone_resp.status_code == 404

    @pytest.mark.asyncio
    async def test_material_full_crud_lifecycle(self, admin_client: AsyncClient, project: Project):
        created = await create_mat(admin_client, project.id)
        mat_id = created["id"]

        get_resp = await admin_client.get(mat_detail_url(str(project.id), mat_id))
        assert get_resp.status_code == 200

        list_resp = await admin_client.get(mat_url(str(project.id)))
        assert any(m["id"] == mat_id for m in list_resp.json())

        upd_resp = await admin_client.put(
            mat_detail_url(str(project.id), mat_id),
            json={"name": "Lifecycle Updated Mat", "quantity": "999"},
        )
        assert upd_resp.status_code == 200
        assert upd_resp.json()["name"] == "Lifecycle Updated Mat"

        del_resp = await admin_client.delete(mat_detail_url(str(project.id), mat_id))
        assert del_resp.status_code == 200

        gone_resp = await admin_client.get(mat_detail_url(str(project.id), mat_id))
        assert gone_resp.status_code == 404

    @pytest.mark.asyncio
    async def test_equipment_create_then_submit(self, admin_client: AsyncClient, project: Project):
        created = await create_eq(admin_client, project.id)
        assert created["status"] == "draft"
        submit_resp = await admin_client.post(
            f"{API_V1}/projects/{project.id}/equipment/{created['id']}/submit"
        )
        assert submit_resp.status_code == 200
        assert submit_resp.json()["status"] == "submitted"

    @pytest.mark.asyncio
    async def test_material_create_then_submit(self, admin_client: AsyncClient, project: Project):
        created = await create_mat(admin_client, project.id)
        assert created["status"] == "draft"
        submit_resp = await admin_client.post(
            f"{API_V1}/projects/{project.id}/materials/{created['id']}/submit"
        )
        assert submit_resp.status_code == 200
        assert submit_resp.json()["status"] == "submitted"
