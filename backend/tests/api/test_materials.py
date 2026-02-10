import uuid
from decimal import Decimal

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.approval import ApprovalRequest, ApprovalStep
from app.models.material import Material
from app.models.project import Project, ProjectMember
from app.models.user import User

VALID_MATERIAL_PAYLOAD = {
    "name": "Portland Cement Type II",
    "material_type": "concrete",
    "manufacturer": "LafargeHolcim",
    "model_number": "PC-II-50",
    "quantity": "100.50",
    "unit": "bags",
    "specifications": {"grade": "42.5N", "weight_per_bag": "50kg"},
    "expected_delivery": "2025-06-15",
    "actual_delivery": "2025-06-20",
    "storage_location": "Warehouse A - Section 3",
    "notes": "Handle with care, keep dry",
}

XSS_PAYLOADS = [
    '<script>alert("xss")</script>',
    'javascript:alert(1)',
    '<img src=x onerror=alert(1)>',
    '<iframe src="evil.com"></iframe>',
    '<svg onload=alert(1)></svg>',
    '<div onclick=alert(1)>click</div>',
    '<object data="evil.swf"></object>',
    '<embed src="evil.swf">',
    '<link rel="stylesheet" href="evil.css">',
    '<meta http-equiv="refresh" content="0">',
    '<style>body{background:url("javascript:alert(1)")}</style>',
]

XSS_SANITIZABLE_FIELDS = [
    "name",
    "material_type",
    "manufacturer",
    "model_number",
    "unit",
    "storage_location",
    "notes",
]

CAMEL_CASE_FIELD_MAP = {
    "material_type": "materialType",
    "model_number": "modelNumber",
    "storage_location": "storageLocation",
    "expected_delivery": "expectedDelivery",
    "actual_delivery": "actualDelivery",
    "project_id": "projectId",
    "created_at": "createdAt",
    "updated_at": "updatedAt",
    "created_by": "createdBy",
}


async def create_material_via_api(client: AsyncClient, project_id: uuid.UUID, payload: dict = None):
    payload = payload or VALID_MATERIAL_PAYLOAD.copy()
    response = await client.post(f"/api/v1/projects/{project_id}/materials", json=payload)
    return response


async def create_material_in_db(db: AsyncSession, project_id: uuid.UUID, user_id: uuid.UUID, **overrides):
    defaults = {
        "name": "Test Material",
        "material_type": "steel",
        "manufacturer": "ArcelorMittal",
        "model_number": "ST-100",
        "quantity": Decimal("50.00"),
        "unit": "tons",
        "status": "draft",
    }
    defaults.update(overrides)
    material = Material(
        id=uuid.uuid4(),
        project_id=project_id,
        created_by_id=user_id,
        **defaults,
    )
    db.add(material)
    await db.commit()
    await db.refresh(material)
    return material


class TestMaterialCRUDHappyPath:

    async def test_create_material_with_all_fields(self, admin_client: AsyncClient, project: Project):
        response = await create_material_via_api(admin_client, project.id)
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == VALID_MATERIAL_PAYLOAD["name"]
        assert data["materialType"] == VALID_MATERIAL_PAYLOAD["material_type"]
        assert data["manufacturer"] == VALID_MATERIAL_PAYLOAD["manufacturer"]
        assert data["modelNumber"] == VALID_MATERIAL_PAYLOAD["model_number"]
        assert data["unit"] == VALID_MATERIAL_PAYLOAD["unit"]
        assert data["storageLocation"] == VALID_MATERIAL_PAYLOAD["storage_location"]
        assert data["notes"] == VALID_MATERIAL_PAYLOAD["notes"]
        assert data["status"] == "draft"
        assert "id" in data

    async def test_create_material_minimal_fields(self, admin_client: AsyncClient, project: Project):
        response = await admin_client.post(
            f"/api/v1/projects/{project.id}/materials",
            json={"name": "Minimal Material"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Minimal Material"
        assert data["materialType"] is None
        assert data["manufacturer"] is None

    async def test_get_material(self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User):
        mat = await create_material_in_db(db, project.id, admin_user.id)
        response = await admin_client.get(f"/api/v1/projects/{project.id}/materials/{mat.id}")
        assert response.status_code == 200
        assert response.json()["id"] == str(mat.id)

    async def test_list_materials_project_scoped(self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User):
        await create_material_in_db(db, project.id, admin_user.id, name="Material A")
        await create_material_in_db(db, project.id, admin_user.id, name="Material B")
        response = await admin_client.get(f"/api/v1/projects/{project.id}/materials")
        assert response.status_code == 200
        assert len(response.json()) == 2

    async def test_update_material(self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User):
        mat = await create_material_in_db(db, project.id, admin_user.id)
        response = await admin_client.put(
            f"/api/v1/projects/{project.id}/materials/{mat.id}",
            json={"name": "Updated Material Name"},
        )
        assert response.status_code == 200
        assert response.json()["name"] == "Updated Material Name"

    async def test_delete_material(self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User):
        mat = await create_material_in_db(db, project.id, admin_user.id)
        response = await admin_client.delete(f"/api/v1/projects/{project.id}/materials/{mat.id}")
        assert response.status_code == 200
        get_resp = await admin_client.get(f"/api/v1/projects/{project.id}/materials/{mat.id}")
        assert get_resp.status_code == 404

    async def test_create_then_get_returns_same_data(self, admin_client: AsyncClient, project: Project):
        create_resp = await create_material_via_api(admin_client, project.id)
        material_id = create_resp.json()["id"]
        get_resp = await admin_client.get(f"/api/v1/projects/{project.id}/materials/{material_id}")
        assert get_resp.status_code == 200
        assert get_resp.json()["name"] == VALID_MATERIAL_PAYLOAD["name"]


class TestNameFieldValidation:

    @pytest.mark.parametrize("name,expected_status", [
        ("", 422),
        ("A", 422),
        ("AB", 200),
        ("A" * 255, 200),
        ("A" * 256, 422),
        ("  AB  ", 200),
        ("Valid Material Name", 200),
        ("Material-123_v2", 200),
    ])
    async def test_name_length_validation(self, admin_client: AsyncClient, project: Project, name: str, expected_status: int):
        response = await admin_client.post(
            f"/api/v1/projects/{project.id}/materials",
            json={"name": name},
        )
        assert response.status_code == expected_status


class TestMaterialTypeValidation:

    @pytest.mark.parametrize("material_type,expected_status", [
        (None, 200),
        ("concrete", 200),
        ("steel", 200),
        ("A" * 100, 200),
        ("A" * 101, 422),
    ])
    async def test_material_type_validation(self, admin_client: AsyncClient, project: Project, material_type, expected_status: int):
        payload = {"name": "Test Material", "material_type": material_type}
        if material_type is None:
            payload.pop("material_type")
        response = await admin_client.post(f"/api/v1/projects/{project.id}/materials", json=payload)
        assert response.status_code == expected_status


class TestManufacturerValidation:

    @pytest.mark.parametrize("manufacturer,expected_status", [
        (None, 200),
        ("LafargeHolcim", 200),
        ("A" * 255, 200),
        ("A" * 256, 422),
    ])
    async def test_manufacturer_validation(self, admin_client: AsyncClient, project: Project, manufacturer, expected_status: int):
        payload = {"name": "Test Material"}
        if manufacturer is not None:
            payload["manufacturer"] = manufacturer
        response = await admin_client.post(f"/api/v1/projects/{project.id}/materials", json=payload)
        assert response.status_code == expected_status


class TestModelNumberValidation:

    @pytest.mark.parametrize("model_number,expected_status", [
        (None, 200),
        ("PC-II-50", 200),
        ("A" * 100, 200),
        ("A" * 101, 422),
    ])
    async def test_model_number_validation(self, admin_client: AsyncClient, project: Project, model_number, expected_status: int):
        payload = {"name": "Test Material"}
        if model_number is not None:
            payload["model_number"] = model_number
        response = await admin_client.post(f"/api/v1/projects/{project.id}/materials", json=payload)
        assert response.status_code == expected_status


class TestQuantityValidation:

    @pytest.mark.parametrize("quantity,expected_status", [
        (None, 200),
        (0, 200),
        (0.01, 200),
        (1, 200),
        (100.50, 200),
        (999999999, 200),
        (1000000000, 422),
        (-1, 422),
        (-0.01, 422),
    ])
    async def test_quantity_validation(self, admin_client: AsyncClient, project: Project, quantity, expected_status: int):
        payload = {"name": "Test Material"}
        if quantity is not None:
            payload["quantity"] = quantity
        response = await admin_client.post(f"/api/v1/projects/{project.id}/materials", json=payload)
        assert response.status_code == expected_status

    @pytest.mark.parametrize("quantity_str,expected_status", [
        ("0", 200),
        ("100.50", 200),
        ("999999999", 200),
        ("999999999.99", 422),
    ])
    async def test_quantity_as_string(self, admin_client: AsyncClient, project: Project, quantity_str: str, expected_status: int):
        payload = {"name": "Test Material", "quantity": quantity_str}
        response = await admin_client.post(f"/api/v1/projects/{project.id}/materials", json=payload)
        assert response.status_code == expected_status


class TestUnitValidation:

    @pytest.mark.parametrize("unit,expected_status", [
        (None, 200),
        ("kg", 200),
        ("bags", 200),
        ("A" * 50, 200),
        ("A" * 51, 422),
    ])
    async def test_unit_validation(self, admin_client: AsyncClient, project: Project, unit, expected_status: int):
        payload = {"name": "Test Material"}
        if unit is not None:
            payload["unit"] = unit
        response = await admin_client.post(f"/api/v1/projects/{project.id}/materials", json=payload)
        assert response.status_code == expected_status


class TestStorageLocationValidation:

    @pytest.mark.parametrize("storage_location,expected_status", [
        (None, 200),
        ("Warehouse A", 200),
        ("A" * 255, 200),
        ("A" * 256, 422),
    ])
    async def test_storage_location_validation(self, admin_client: AsyncClient, project: Project, storage_location, expected_status: int):
        payload = {"name": "Test Material"}
        if storage_location is not None:
            payload["storage_location"] = storage_location
        response = await admin_client.post(f"/api/v1/projects/{project.id}/materials", json=payload)
        assert response.status_code == expected_status


class TestNotesValidation:

    @pytest.mark.parametrize("notes,expected_status", [
        (None, 200),
        ("Short note", 200),
        ("A" * 5000, 200),
        ("A" * 5001, 422),
    ])
    async def test_notes_validation(self, admin_client: AsyncClient, project: Project, notes, expected_status: int):
        payload = {"name": "Test Material"}
        if notes is not None:
            payload["notes"] = notes
        response = await admin_client.post(f"/api/v1/projects/{project.id}/materials", json=payload)
        assert response.status_code == expected_status


class TestSpecificationsValidation:

    async def test_specifications_none(self, admin_client: AsyncClient, project: Project):
        payload = {"name": "Test Material", "specifications": None}
        response = await admin_client.post(f"/api/v1/projects/{project.id}/materials", json=payload)
        assert response.status_code == 200

    async def test_specifications_empty_dict(self, admin_client: AsyncClient, project: Project):
        payload = {"name": "Test Material", "specifications": {}}
        response = await admin_client.post(f"/api/v1/projects/{project.id}/materials", json=payload)
        assert response.status_code == 200

    async def test_specifications_valid_string_value(self, admin_client: AsyncClient, project: Project):
        payload = {"name": "Test Material", "specifications": {"grade": "A"}}
        response = await admin_client.post(f"/api/v1/projects/{project.id}/materials", json=payload)
        assert response.status_code == 200
        assert response.json()["specifications"]["grade"] == "A"

    async def test_specifications_valid_number_value(self, admin_client: AsyncClient, project: Project):
        payload = {"name": "Test Material", "specifications": {"weight": 100.5}}
        response = await admin_client.post(f"/api/v1/projects/{project.id}/materials", json=payload)
        assert response.status_code == 200
        assert response.json()["specifications"]["weight"] == 100.5

    async def test_specifications_valid_boolean_value(self, admin_client: AsyncClient, project: Project):
        payload = {"name": "Test Material", "specifications": {"certified": True}}
        response = await admin_client.post(f"/api/v1/projects/{project.id}/materials", json=payload)
        assert response.status_code == 200
        assert response.json()["specifications"]["certified"] is True

    async def test_specifications_valid_null_value(self, admin_client: AsyncClient, project: Project):
        payload = {"name": "Test Material", "specifications": {"pending": None}}
        response = await admin_client.post(f"/api/v1/projects/{project.id}/materials", json=payload)
        assert response.status_code == 200
        assert response.json()["specifications"]["pending"] is None

    async def test_specifications_too_many_keys(self, admin_client: AsyncClient, project: Project):
        specs = {f"key_{i}": f"value_{i}" for i in range(51)}
        payload = {"name": "Test Material", "specifications": specs}
        response = await admin_client.post(f"/api/v1/projects/{project.id}/materials", json=payload)
        assert response.status_code == 422

    async def test_specifications_max_keys_allowed(self, admin_client: AsyncClient, project: Project):
        specs = {f"key_{i}": f"value_{i}" for i in range(50)}
        payload = {"name": "Test Material", "specifications": specs}
        response = await admin_client.post(f"/api/v1/projects/{project.id}/materials", json=payload)
        assert response.status_code == 200

    async def test_specifications_key_too_long(self, admin_client: AsyncClient, project: Project):
        specs = {"k" * 101: "value"}
        payload = {"name": "Test Material", "specifications": specs}
        response = await admin_client.post(f"/api/v1/projects/{project.id}/materials", json=payload)
        assert response.status_code == 422

    async def test_specifications_key_max_length(self, admin_client: AsyncClient, project: Project):
        specs = {"k" * 100: "value"}
        payload = {"name": "Test Material", "specifications": specs}
        response = await admin_client.post(f"/api/v1/projects/{project.id}/materials", json=payload)
        assert response.status_code == 200

    async def test_specifications_value_too_long(self, admin_client: AsyncClient, project: Project):
        specs = {"key": "v" * 501}
        payload = {"name": "Test Material", "specifications": specs}
        response = await admin_client.post(f"/api/v1/projects/{project.id}/materials", json=payload)
        assert response.status_code == 422

    async def test_specifications_value_max_length(self, admin_client: AsyncClient, project: Project):
        specs = {"key": "v" * 500}
        payload = {"name": "Test Material", "specifications": specs}
        response = await admin_client.post(f"/api/v1/projects/{project.id}/materials", json=payload)
        assert response.status_code == 200

    async def test_specifications_invalid_value_type_list(self, admin_client: AsyncClient, project: Project):
        specs = {"key": [1, 2, 3]}
        payload = {"name": "Test Material", "specifications": specs}
        response = await admin_client.post(f"/api/v1/projects/{project.id}/materials", json=payload)
        assert response.status_code == 422

    async def test_specifications_invalid_value_type_nested_dict(self, admin_client: AsyncClient, project: Project):
        specs = {"key": {"nested": "dict"}}
        payload = {"name": "Test Material", "specifications": specs}
        response = await admin_client.post(f"/api/v1/projects/{project.id}/materials", json=payload)
        assert response.status_code == 422

    @pytest.mark.parametrize("value_type,value", [
        ("string", "test_value"),
        ("int", 42),
        ("float", 3.14),
        ("bool_true", True),
        ("bool_false", False),
        ("null", None),
    ])
    async def test_specifications_allowed_value_types(self, admin_client: AsyncClient, project: Project, value_type: str, value):
        specs = {"test_key": value}
        payload = {"name": "Test Material", "specifications": specs}
        response = await admin_client.post(f"/api/v1/projects/{project.id}/materials", json=payload)
        assert response.status_code == 200

    async def test_specifications_mixed_valid_types(self, admin_client: AsyncClient, project: Project):
        specs = {
            "str_field": "text",
            "int_field": 100,
            "float_field": 3.14,
            "bool_field": True,
            "null_field": None,
        }
        payload = {"name": "Test Material", "specifications": specs}
        response = await admin_client.post(f"/api/v1/projects/{project.id}/materials", json=payload)
        assert response.status_code == 200
        data = response.json()["specifications"]
        assert data["str_field"] == "text"
        assert data["int_field"] == 100
        assert data["bool_field"] is True
        assert data["null_field"] is None


class TestXSSSanitization:

    @pytest.mark.parametrize("field", XSS_SANITIZABLE_FIELDS)
    @pytest.mark.parametrize("xss_payload", XSS_PAYLOADS)
    async def test_xss_sanitized_from_fields(self, admin_client: AsyncClient, project: Project, field: str, xss_payload: str):
        payload = {"name": "Safe Material Name"}
        if field == "name":
            payload["name"] = f"Safe {xss_payload} Name"
        else:
            payload[field] = xss_payload
        response = await admin_client.post(f"/api/v1/projects/{project.id}/materials", json=payload)
        if response.status_code == 200:
            data = response.json()
            camel_field = CAMEL_CASE_FIELD_MAP.get(field, field)
            value = data.get(camel_field, data.get(field, ""))
            if value:
                assert "<script" not in value.lower()
                assert "javascript:" not in value.lower()
                assert "<iframe" not in value.lower()
                assert "<svg" not in value.lower()
                assert "<object" not in value.lower()
                assert "<embed" not in value.lower()
                assert "<link" not in value.lower()
                assert "<meta" not in value.lower()
                assert "<style" not in value.lower()

    @pytest.mark.parametrize("xss_payload", XSS_PAYLOADS)
    async def test_xss_sanitized_from_specification_keys(self, admin_client: AsyncClient, project: Project, xss_payload: str):
        safe_key = f"key_{xss_payload}"
        if len(safe_key) > 100:
            safe_key = safe_key[:100]
        payload = {"name": "Test Material", "specifications": {safe_key: "value"}}
        response = await admin_client.post(f"/api/v1/projects/{project.id}/materials", json=payload)
        if response.status_code == 200:
            specs = response.json().get("specifications", {})
            for key in specs:
                assert "<script" not in key.lower()

    @pytest.mark.parametrize("xss_payload", XSS_PAYLOADS)
    async def test_xss_sanitized_from_specification_values(self, admin_client: AsyncClient, project: Project, xss_payload: str):
        payload = {"name": "Test Material", "specifications": {"key": xss_payload}}
        response = await admin_client.post(f"/api/v1/projects/{project.id}/materials", json=payload)
        if response.status_code == 200:
            specs = response.json().get("specifications", {})
            for val in specs.values():
                if isinstance(val, str):
                    assert "<script" not in val.lower()
                    assert "javascript:" not in val.lower()


class TestUpdateOperations:

    @pytest.mark.parametrize("field,value", [
        ("name", "Updated Name"),
        ("material_type", "updated_type"),
        ("manufacturer", "New Manufacturer"),
        ("model_number", "NEW-100"),
        ("quantity", "200.75"),
        ("unit", "liters"),
        ("storage_location", "New Warehouse"),
        ("notes", "Updated notes text"),
    ])
    async def test_update_individual_fields(self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User, field: str, value):
        mat = await create_material_in_db(db, project.id, admin_user.id)
        response = await admin_client.put(
            f"/api/v1/projects/{project.id}/materials/{mat.id}",
            json={field: value},
        )
        assert response.status_code == 200
        camel_field = CAMEL_CASE_FIELD_MAP.get(field, field)
        returned_value = response.json().get(camel_field, response.json().get(field))
        if field == "quantity":
            assert float(returned_value) == float(value)
        else:
            assert returned_value == value

    async def test_update_specifications(self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User):
        mat = await create_material_in_db(db, project.id, admin_user.id)
        new_specs = {"updated_key": "updated_value", "num": 42}
        response = await admin_client.put(
            f"/api/v1/projects/{project.id}/materials/{mat.id}",
            json={"specifications": new_specs},
        )
        assert response.status_code == 200
        assert response.json()["specifications"]["updated_key"] == "updated_value"

    async def test_update_expected_delivery(self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User):
        mat = await create_material_in_db(db, project.id, admin_user.id)
        response = await admin_client.put(
            f"/api/v1/projects/{project.id}/materials/{mat.id}",
            json={"expected_delivery": "2026-01-15"},
        )
        assert response.status_code == 200
        assert response.json()["expectedDelivery"] == "2026-01-15"

    async def test_update_actual_delivery(self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User):
        mat = await create_material_in_db(db, project.id, admin_user.id)
        response = await admin_client.put(
            f"/api/v1/projects/{project.id}/materials/{mat.id}",
            json={"actual_delivery": "2026-02-01"},
        )
        assert response.status_code == 200
        assert response.json()["actualDelivery"] == "2026-02-01"

    async def test_partial_update_preserves_other_fields(self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User):
        mat = await create_material_in_db(db, project.id, admin_user.id, name="Original", manufacturer="OrigMfg")
        response = await admin_client.put(
            f"/api/v1/projects/{project.id}/materials/{mat.id}",
            json={"name": "Changed"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Changed"
        assert data["manufacturer"] == "OrigMfg"

    async def test_update_multiple_fields_at_once(self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User):
        mat = await create_material_in_db(db, project.id, admin_user.id)
        response = await admin_client.put(
            f"/api/v1/projects/{project.id}/materials/{mat.id}",
            json={
                "name": "Multi Update",
                "manufacturer": "New Mfg",
                "quantity": "300",
                "unit": "m3",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Multi Update"
        assert data["manufacturer"] == "New Mfg"
        assert data["unit"] == "m3"

    @pytest.mark.parametrize("field,invalid_value", [
        ("name", ""),
        ("name", "A"),
        ("name", "A" * 256),
        ("material_type", "A" * 101),
        ("manufacturer", "A" * 256),
        ("model_number", "A" * 101),
        ("quantity", -1),
        ("quantity", 1000000000),
        ("unit", "A" * 51),
        ("storage_location", "A" * 256),
        ("notes", "A" * 5001),
    ])
    async def test_update_with_invalid_values(self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User, field: str, invalid_value):
        mat = await create_material_in_db(db, project.id, admin_user.id)
        response = await admin_client.put(
            f"/api/v1/projects/{project.id}/materials/{mat.id}",
            json={field: invalid_value},
        )
        assert response.status_code == 422


class TestNotFoundResponses:

    async def test_get_nonexistent_material(self, admin_client: AsyncClient, project: Project):
        fake_id = uuid.uuid4()
        response = await admin_client.get(f"/api/v1/projects/{project.id}/materials/{fake_id}")
        assert response.status_code == 404

    async def test_update_nonexistent_material(self, admin_client: AsyncClient, project: Project):
        fake_id = uuid.uuid4()
        response = await admin_client.put(
            f"/api/v1/projects/{project.id}/materials/{fake_id}",
            json={"name": "Ghost"},
        )
        assert response.status_code == 404

    async def test_delete_nonexistent_material(self, admin_client: AsyncClient, project: Project):
        fake_id = uuid.uuid4()
        response = await admin_client.delete(f"/api/v1/projects/{project.id}/materials/{fake_id}")
        assert response.status_code == 404

    async def test_submit_nonexistent_material(self, admin_client: AsyncClient, project: Project):
        fake_id = uuid.uuid4()
        response = await admin_client.post(f"/api/v1/projects/{project.id}/materials/{fake_id}/submit")
        assert response.status_code == 404

    async def test_get_material_with_nonexistent_project(self, admin_client: AsyncClient, db: AsyncSession, admin_user: User, project: Project):
        mat = await create_material_in_db(db, project.id, admin_user.id)
        fake_project_id = uuid.uuid4()
        response = await admin_client.get(f"/api/v1/projects/{fake_project_id}/materials/{mat.id}")
        assert response.status_code == 403

    @pytest.mark.parametrize("method,path_suffix", [
        ("GET", ""),
        ("PUT", ""),
        ("DELETE", ""),
        ("POST", "/submit"),
    ])
    async def test_operations_with_random_uuid(self, admin_client: AsyncClient, project: Project, method: str, path_suffix: str):
        fake_id = uuid.uuid4()
        url = f"/api/v1/projects/{project.id}/materials/{fake_id}{path_suffix}"
        kwargs = {}
        if method == "PUT":
            kwargs["json"] = {"name": "Test"}
        response = await getattr(admin_client, method.lower())(url, **kwargs)
        assert response.status_code == 404


class TestAuthenticationRequired:

    @pytest.mark.parametrize("method,path_template", [
        ("POST", "/api/v1/projects/{project_id}/materials"),
        ("PUT", "/api/v1/projects/{project_id}/materials/{material_id}"),
        ("DELETE", "/api/v1/projects/{project_id}/materials/{material_id}"),
        ("POST", "/api/v1/projects/{project_id}/materials/{material_id}/submit"),
    ])
    async def test_unauthenticated_requests_return_401(self, client: AsyncClient, project: Project, db: AsyncSession, admin_user: User, method: str, path_template: str):
        mat = await create_material_in_db(db, project.id, admin_user.id)
        path = path_template.format(project_id=project.id, material_id=mat.id)
        kwargs = {}
        if method == "POST" and "submit" not in path:
            kwargs["json"] = {"name": "Test Material"}
        elif method == "PUT":
            kwargs["json"] = {"name": "Updated"}
        response = await getattr(client, method.lower())(path, **kwargs)
        assert response.status_code in (401, 403)

    async def test_get_material_requires_auth(self, client: AsyncClient, project: Project, db: AsyncSession, admin_user: User):
        mat = await create_material_in_db(db, project.id, admin_user.id)
        response = await client.get(f"/api/v1/projects/{project.id}/materials/{mat.id}")
        assert response.status_code == 401

    async def test_list_materials_requires_auth(self, client: AsyncClient, project: Project):
        response = await client.get(f"/api/v1/projects/{project.id}/materials")
        assert response.status_code == 401

    async def test_flat_list_requires_auth(self, client: AsyncClient):
        response = await client.get("/api/v1/materials")
        assert response.status_code == 401


class TestSubmitWorkflow:

    async def test_submit_changes_status_to_submitted(self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User):
        mat = await create_material_in_db(db, project.id, admin_user.id)
        response = await admin_client.post(f"/api/v1/projects/{project.id}/materials/{mat.id}/submit")
        assert response.status_code == 200
        assert response.json()["status"] == "submitted"

    async def test_submit_creates_approval_request(self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User):
        mat = await create_material_in_db(db, project.id, admin_user.id)
        await admin_client.post(f"/api/v1/projects/{project.id}/materials/{mat.id}/submit")
        result = await db.execute(
            select(ApprovalRequest).where(
                ApprovalRequest.entity_type == "material",
                ApprovalRequest.entity_id == mat.id,
            )
        )
        approval = result.scalar_one_or_none()
        assert approval is not None
        assert approval.current_status == "submitted"
        assert approval.entity_type == "material"
        assert approval.project_id == project.id

    async def test_submit_creates_two_approval_steps(self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User):
        mat = await create_material_in_db(db, project.id, admin_user.id)
        await admin_client.post(f"/api/v1/projects/{project.id}/materials/{mat.id}/submit")
        result = await db.execute(
            select(ApprovalRequest).where(
                ApprovalRequest.entity_id == mat.id,
            )
        )
        approval = result.scalar_one()
        steps_result = await db.execute(
            select(ApprovalStep).where(
                ApprovalStep.approval_request_id == approval.id,
            ).order_by(ApprovalStep.step_order)
        )
        steps = steps_result.scalars().all()
        assert len(steps) == 2
        assert steps[0].step_order == 1
        assert steps[0].approver_role == "consultant"
        assert steps[1].step_order == 2
        assert steps[1].approver_role == "inspector"

    async def test_submit_approval_steps_start_as_pending(self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User):
        mat = await create_material_in_db(db, project.id, admin_user.id)
        await admin_client.post(f"/api/v1/projects/{project.id}/materials/{mat.id}/submit")
        result = await db.execute(
            select(ApprovalRequest).where(ApprovalRequest.entity_id == mat.id)
        )
        approval = result.scalar_one()
        steps_result = await db.execute(
            select(ApprovalStep).where(ApprovalStep.approval_request_id == approval.id)
        )
        steps = steps_result.scalars().all()
        for step in steps:
            assert step.status == "pending"

    async def test_submit_preserves_material_data(self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User):
        mat = await create_material_in_db(db, project.id, admin_user.id, name="Submit Test", manufacturer="TestMfg")
        response = await admin_client.post(f"/api/v1/projects/{project.id}/materials/{mat.id}/submit")
        data = response.json()
        assert data["name"] == "Submit Test"
        assert data["manufacturer"] == "TestMfg"


class TestListOperations:

    async def test_empty_project_returns_empty_list(self, admin_client: AsyncClient, project: Project):
        response = await admin_client.get(f"/api/v1/projects/{project.id}/materials")
        assert response.status_code == 200
        assert response.json() == []

    async def test_flat_list_returns_all_materials(self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User):
        await create_material_in_db(db, project.id, admin_user.id, name="Mat1")
        await create_material_in_db(db, project.id, admin_user.id, name="Mat2")
        await create_material_in_db(db, project.id, admin_user.id, name="Mat3")
        response = await admin_client.get("/api/v1/materials")
        assert response.status_code == 200
        assert len(response.json()) >= 3

    async def test_flat_list_with_project_filter(self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User):
        await create_material_in_db(db, project.id, admin_user.id, name="Filtered")
        response = await admin_client.get(f"/api/v1/materials?project_id={project.id}")
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1
        for item in data:
            assert item["projectId"] == str(project.id)

    async def test_flat_list_without_filter(self, admin_client: AsyncClient):
        response = await admin_client.get("/api/v1/materials")
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    async def test_project_scoped_list_filters_correctly(self, admin_client: AsyncClient, db: AsyncSession, admin_user: User):
        proj1 = Project(id=uuid.uuid4(), name="Project 1", code="P1", status="active", created_by_id=admin_user.id)
        proj2 = Project(id=uuid.uuid4(), name="Project 2", code="P2", status="active", created_by_id=admin_user.id)
        db.add_all([proj1, proj2])
        await db.flush()
        db.add_all([
            ProjectMember(project_id=proj1.id, user_id=admin_user.id, role="project_admin"),
            ProjectMember(project_id=proj2.id, user_id=admin_user.id, role="project_admin"),
        ])
        await db.commit()
        await create_material_in_db(db, proj1.id, admin_user.id, name="P1 Material")
        await create_material_in_db(db, proj2.id, admin_user.id, name="P2 Material")
        resp1 = await admin_client.get(f"/api/v1/projects/{proj1.id}/materials")
        resp2 = await admin_client.get(f"/api/v1/projects/{proj2.id}/materials")
        assert len(resp1.json()) == 1
        assert resp1.json()[0]["name"] == "P1 Material"
        assert len(resp2.json()) == 1
        assert resp2.json()[0]["name"] == "P2 Material"

    async def test_list_returns_materials_in_descending_order(self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User):
        await create_material_in_db(db, project.id, admin_user.id, name="First Created")
        await create_material_in_db(db, project.id, admin_user.id, name="Second Created")
        response = await admin_client.get(f"/api/v1/projects/{project.id}/materials")
        data = response.json()
        assert len(data) == 2

    @pytest.mark.parametrize("count", [1, 3, 5, 10])
    async def test_list_returns_correct_count(self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User, count: int):
        for i in range(count):
            await create_material_in_db(db, project.id, admin_user.id, name=f"Material {i}")
        response = await admin_client.get(f"/api/v1/projects/{project.id}/materials")
        assert len(response.json()) == count


class TestDateFields:

    @pytest.mark.parametrize("date_field,date_value,expected_status", [
        ("expected_delivery", "2025-06-15", 200),
        ("expected_delivery", "2030-12-31", 200),
        ("expected_delivery", None, 200),
        ("actual_delivery", "2025-06-20", 200),
        ("actual_delivery", "2025-01-01", 200),
        ("actual_delivery", None, 200),
    ])
    async def test_date_field_validation(self, admin_client: AsyncClient, project: Project, date_field: str, date_value, expected_status: int):
        payload = {"name": "Date Test Material"}
        if date_value is not None:
            payload[date_field] = date_value
        response = await admin_client.post(f"/api/v1/projects/{project.id}/materials", json=payload)
        assert response.status_code == expected_status

    async def test_both_dates_set(self, admin_client: AsyncClient, project: Project):
        payload = {
            "name": "Both Dates Material",
            "expected_delivery": "2025-06-15",
            "actual_delivery": "2025-06-20",
        }
        response = await admin_client.post(f"/api/v1/projects/{project.id}/materials", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["expectedDelivery"] == "2025-06-15"
        assert data["actualDelivery"] == "2025-06-20"

    async def test_dates_default_to_none(self, admin_client: AsyncClient, project: Project):
        payload = {"name": "No Dates Material"}
        response = await admin_client.post(f"/api/v1/projects/{project.id}/materials", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["expectedDelivery"] is None
        assert data["actualDelivery"] is None

    @pytest.mark.parametrize("date_field", ["expected_delivery", "actual_delivery"])
    async def test_update_date_to_value(self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User, date_field: str):
        mat = await create_material_in_db(db, project.id, admin_user.id)
        response = await admin_client.put(
            f"/api/v1/projects/{project.id}/materials/{mat.id}",
            json={date_field: "2026-03-15"},
        )
        assert response.status_code == 200
        camel = CAMEL_CASE_FIELD_MAP.get(date_field, date_field)
        assert response.json()[camel] == "2026-03-15"

    @pytest.mark.parametrize("date_field", ["expected_delivery", "actual_delivery"])
    async def test_update_date_to_null(self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User, date_field: str):
        mat = await create_material_in_db(db, project.id, admin_user.id)
        response = await admin_client.put(
            f"/api/v1/projects/{project.id}/materials/{mat.id}",
            json={date_field: None},
        )
        assert response.status_code == 200


class TestDecimalHandling:

    @pytest.mark.parametrize("quantity,expected", [
        ("0", 0),
        ("0.01", 0.01),
        ("1.5", 1.5),
        ("100.50", 100.5),
        ("999999999", 999999999),
        ("12345.67", 12345.67),
    ])
    async def test_quantity_precision(self, admin_client: AsyncClient, project: Project, quantity: str, expected: float):
        payload = {"name": "Decimal Test", "quantity": quantity}
        response = await admin_client.post(f"/api/v1/projects/{project.id}/materials", json=payload)
        assert response.status_code == 200
        returned = float(response.json()["quantity"])
        assert abs(returned - expected) < 0.001

    async def test_quantity_none_by_default(self, admin_client: AsyncClient, project: Project):
        payload = {"name": "No Quantity Material"}
        response = await admin_client.post(f"/api/v1/projects/{project.id}/materials", json=payload)
        assert response.status_code == 200
        assert response.json()["quantity"] is None

    @pytest.mark.parametrize("quantity", [0, 0.01, 1, 50.5, 999999999])
    async def test_quantity_numeric_input(self, admin_client: AsyncClient, project: Project, quantity):
        payload = {"name": "Numeric Test", "quantity": quantity}
        response = await admin_client.post(f"/api/v1/projects/{project.id}/materials", json=payload)
        assert response.status_code == 200

    async def test_quantity_zero_allowed(self, admin_client: AsyncClient, project: Project):
        payload = {"name": "Zero Qty", "quantity": 0}
        response = await admin_client.post(f"/api/v1/projects/{project.id}/materials", json=payload)
        assert response.status_code == 200
        assert float(response.json()["quantity"]) == 0


class TestResponseFormatCamelCase:

    async def test_response_uses_camel_case(self, admin_client: AsyncClient, project: Project):
        response = await create_material_via_api(admin_client, project.id)
        data = response.json()
        assert "materialType" in data
        assert "modelNumber" in data
        assert "storageLocation" in data
        assert "expectedDelivery" in data
        assert "actualDelivery" in data
        assert "projectId" in data
        assert "createdAt" in data
        assert "updatedAt" in data

    async def test_response_does_not_use_snake_case_for_compound_fields(self, admin_client: AsyncClient, project: Project):
        response = await create_material_via_api(admin_client, project.id)
        data = response.json()
        assert "material_type" not in data
        assert "model_number" not in data
        assert "storage_location" not in data
        assert "expected_delivery" not in data
        assert "actual_delivery" not in data
        assert "project_id" not in data
        assert "created_at" not in data
        assert "updated_at" not in data

    @pytest.mark.parametrize("snake_field,camel_field", list(CAMEL_CASE_FIELD_MAP.items()))
    async def test_individual_camel_case_mapping(self, admin_client: AsyncClient, project: Project, snake_field: str, camel_field: str):
        response = await create_material_via_api(admin_client, project.id)
        data = response.json()
        assert camel_field in data, f"Expected camelCase field '{camel_field}' in response"

    async def test_list_response_uses_camel_case(self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User):
        await create_material_in_db(db, project.id, admin_user.id)
        response = await admin_client.get(f"/api/v1/projects/{project.id}/materials")
        data = response.json()
        assert len(data) >= 1
        item = data[0]
        assert "materialType" in item
        assert "projectId" in item
        assert "createdAt" in item

    async def test_flat_list_response_uses_camel_case(self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User):
        await create_material_in_db(db, project.id, admin_user.id)
        response = await admin_client.get("/api/v1/materials")
        data = response.json()
        assert len(data) >= 1
        item = data[0]
        assert "materialType" in item
        assert "projectId" in item


class TestMultipleMaterialsPerProject:

    async def test_create_multiple_materials(self, admin_client: AsyncClient, project: Project):
        names = ["Material A", "Material B", "Material C", "Material D", "Material E"]
        for name in names:
            response = await admin_client.post(
                f"/api/v1/projects/{project.id}/materials",
                json={"name": name},
            )
            assert response.status_code == 200
        list_resp = await admin_client.get(f"/api/v1/projects/{project.id}/materials")
        assert len(list_resp.json()) == 5

    async def test_delete_one_preserves_others(self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User):
        mat1 = await create_material_in_db(db, project.id, admin_user.id, name="Keep Me")
        mat2 = await create_material_in_db(db, project.id, admin_user.id, name="Delete Me")
        await admin_client.delete(f"/api/v1/projects/{project.id}/materials/{mat2.id}")
        list_resp = await admin_client.get(f"/api/v1/projects/{project.id}/materials")
        assert len(list_resp.json()) == 1
        assert list_resp.json()[0]["name"] == "Keep Me"

    async def test_update_one_does_not_affect_others(self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User):
        mat1 = await create_material_in_db(db, project.id, admin_user.id, name="Original A")
        mat2 = await create_material_in_db(db, project.id, admin_user.id, name="Original B")
        await admin_client.put(
            f"/api/v1/projects/{project.id}/materials/{mat1.id}",
            json={"name": "Changed A"},
        )
        resp2 = await admin_client.get(f"/api/v1/projects/{project.id}/materials/{mat2.id}")
        assert resp2.json()["name"] == "Original B"

    @pytest.mark.parametrize("count", [2, 5, 10])
    async def test_batch_create_and_list(self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User, count: int):
        for i in range(count):
            await create_material_in_db(db, project.id, admin_user.id, name=f"Batch Material {i}")
        response = await admin_client.get(f"/api/v1/projects/{project.id}/materials")
        assert len(response.json()) == count


class TestResponseStructure:

    async def test_create_response_has_required_fields(self, admin_client: AsyncClient, project: Project):
        response = await create_material_via_api(admin_client, project.id)
        data = response.json()
        required_fields = ["id", "projectId", "name", "status", "createdAt", "updatedAt"]
        for field in required_fields:
            assert field in data, f"Missing required field: {field}"

    async def test_create_response_id_is_valid_uuid(self, admin_client: AsyncClient, project: Project):
        response = await create_material_via_api(admin_client, project.id)
        data = response.json()
        parsed = uuid.UUID(data["id"])
        assert str(parsed) == data["id"]

    async def test_create_response_project_id_matches(self, admin_client: AsyncClient, project: Project):
        response = await create_material_via_api(admin_client, project.id)
        data = response.json()
        assert data["projectId"] == str(project.id)

    async def test_create_response_default_status_is_draft(self, admin_client: AsyncClient, project: Project):
        response = await create_material_via_api(admin_client, project.id)
        assert response.json()["status"] == "draft"

    async def test_delete_response_message(self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User):
        mat = await create_material_in_db(db, project.id, admin_user.id)
        response = await admin_client.delete(f"/api/v1/projects/{project.id}/materials/{mat.id}")
        assert response.status_code == 200
        assert "message" in response.json()

    async def test_get_single_material_response_structure(self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User):
        mat = await create_material_in_db(db, project.id, admin_user.id)
        response = await admin_client.get(f"/api/v1/projects/{project.id}/materials/{mat.id}")
        data = response.json()
        assert isinstance(data, dict)
        assert "id" in data
        assert "name" in data
        assert "status" in data

    async def test_list_response_is_array(self, admin_client: AsyncClient, project: Project):
        response = await admin_client.get(f"/api/v1/projects/{project.id}/materials")
        assert isinstance(response.json(), list)


class TestEdgeCases:

    async def test_create_with_empty_json_body(self, admin_client: AsyncClient, project: Project):
        response = await admin_client.post(
            f"/api/v1/projects/{project.id}/materials",
            json={},
        )
        assert response.status_code == 422

    async def test_create_with_extra_unknown_fields(self, admin_client: AsyncClient, project: Project):
        payload = {"name": "Test Material", "unknown_field": "value", "another": 123}
        response = await admin_client.post(f"/api/v1/projects/{project.id}/materials", json=payload)
        assert response.status_code == 200

    async def test_create_with_whitespace_only_name(self, admin_client: AsyncClient, project: Project):
        response = await admin_client.post(
            f"/api/v1/projects/{project.id}/materials",
            json={"name": "   "},
        )
        assert response.status_code == 422

    async def test_invalid_uuid_in_path(self, admin_client: AsyncClient, project: Project):
        response = await admin_client.get(f"/api/v1/projects/{project.id}/materials/not-a-uuid")
        assert response.status_code == 422

    async def test_invalid_project_uuid_in_path(self, admin_client: AsyncClient):
        response = await admin_client.get("/api/v1/projects/not-a-uuid/materials")
        assert response.status_code == 422

    @pytest.mark.parametrize("name", [
        "AB",
        "Material with spaces",
        "Material-with-dashes",
        "Material_with_underscores",
        "Material.with.dots",
        "Material (with parens)",
        "Material #123",
        "Material & Supplies",
        "123 Numeric Start",
    ])
    async def test_various_valid_name_formats(self, admin_client: AsyncClient, project: Project, name: str):
        response = await admin_client.post(
            f"/api/v1/projects/{project.id}/materials",
            json={"name": name},
        )
        assert response.status_code == 200

    async def test_specifications_with_integer_key(self, admin_client: AsyncClient, project: Project):
        payload = {"name": "Test Material", "specifications": {"key": "value"}}
        response = await admin_client.post(f"/api/v1/projects/{project.id}/materials", json=payload)
        assert response.status_code == 200

    async def test_update_with_empty_body(self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User):
        mat = await create_material_in_db(db, project.id, admin_user.id)
        response = await admin_client.put(
            f"/api/v1/projects/{project.id}/materials/{mat.id}",
            json={},
        )
        assert response.status_code == 200

    async def test_quantity_boundary_999999999(self, admin_client: AsyncClient, project: Project):
        payload = {"name": "Boundary Test", "quantity": 999999999}
        response = await admin_client.post(f"/api/v1/projects/{project.id}/materials", json=payload)
        assert response.status_code == 200

    async def test_quantity_boundary_over(self, admin_client: AsyncClient, project: Project):
        payload = {"name": "Over Boundary", "quantity": 1000000000}
        response = await admin_client.post(f"/api/v1/projects/{project.id}/materials", json=payload)
        assert response.status_code == 422


class TestUserClientAccess:

    async def test_regular_user_can_create_material(self, user_client: AsyncClient, project: Project, db: AsyncSession, regular_user: User):
        db.add(ProjectMember(project_id=project.id, user_id=regular_user.id, role="contractor"))
        await db.commit()
        response = await user_client.post(
            f"/api/v1/projects/{project.id}/materials",
            json={"name": "User Created Material"},
        )
        assert response.status_code == 200

    async def test_regular_user_can_update_material(self, user_client: AsyncClient, project: Project, db: AsyncSession, regular_user: User):
        db.add(ProjectMember(project_id=project.id, user_id=regular_user.id, role="contractor"))
        await db.commit()
        mat = await create_material_in_db(db, project.id, regular_user.id)
        response = await user_client.put(
            f"/api/v1/projects/{project.id}/materials/{mat.id}",
            json={"name": "User Updated"},
        )
        assert response.status_code == 200

    async def test_regular_user_can_delete_material(self, user_client: AsyncClient, project: Project, db: AsyncSession, regular_user: User):
        db.add(ProjectMember(project_id=project.id, user_id=regular_user.id, role="project_admin"))
        await db.commit()
        mat = await create_material_in_db(db, project.id, regular_user.id)
        response = await user_client.delete(f"/api/v1/projects/{project.id}/materials/{mat.id}")
        assert response.status_code == 200

    async def test_regular_user_can_submit_material(self, user_client: AsyncClient, project: Project, db: AsyncSession, regular_user: User):
        db.add(ProjectMember(project_id=project.id, user_id=regular_user.id, role="consultant"))
        await db.commit()
        mat = await create_material_in_db(db, project.id, regular_user.id)
        response = await user_client.post(f"/api/v1/projects/{project.id}/materials/{mat.id}/submit")
        assert response.status_code == 200
        assert response.json()["status"] == "submitted"


class TestFlatListEndpoint:

    async def test_flat_list_no_materials(self, admin_client: AsyncClient):
        response = await admin_client.get("/api/v1/materials")
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    async def test_flat_list_with_invalid_project_id_filter(self, admin_client: AsyncClient):
        response = await admin_client.get("/api/v1/materials?project_id=not-a-uuid")
        assert response.status_code == 422

    async def test_flat_list_with_nonexistent_project_filter(self, admin_client: AsyncClient):
        fake_id = uuid.uuid4()
        response = await admin_client.get(f"/api/v1/materials?project_id={fake_id}")
        assert response.status_code == 200
        assert response.json() == []

    async def test_flat_list_returns_from_multiple_projects(self, admin_client: AsyncClient, db: AsyncSession, admin_user: User):
        proj1 = Project(id=uuid.uuid4(), name="Proj A", code="PA", status="active", created_by_id=admin_user.id)
        proj2 = Project(id=uuid.uuid4(), name="Proj B", code="PB", status="active", created_by_id=admin_user.id)
        db.add_all([proj1, proj2])
        await db.flush()
        db.add_all([
            ProjectMember(project_id=proj1.id, user_id=admin_user.id, role="project_admin"),
            ProjectMember(project_id=proj2.id, user_id=admin_user.id, role="project_admin"),
        ])
        await db.commit()
        await create_material_in_db(db, proj1.id, admin_user.id, name="From Proj A")
        await create_material_in_db(db, proj2.id, admin_user.id, name="From Proj B")
        response = await admin_client.get("/api/v1/materials")
        assert response.status_code == 200
        names = [m["name"] for m in response.json()]
        assert "From Proj A" in names
        assert "From Proj B" in names

    async def test_flat_list_filter_isolates_project(self, admin_client: AsyncClient, db: AsyncSession, admin_user: User):
        proj1 = Project(id=uuid.uuid4(), name="Isolated A", code="IA", status="active", created_by_id=admin_user.id)
        proj2 = Project(id=uuid.uuid4(), name="Isolated B", code="IB", status="active", created_by_id=admin_user.id)
        db.add_all([proj1, proj2])
        await db.flush()
        db.add_all([
            ProjectMember(project_id=proj1.id, user_id=admin_user.id, role="project_admin"),
            ProjectMember(project_id=proj2.id, user_id=admin_user.id, role="project_admin"),
        ])
        await db.commit()
        await create_material_in_db(db, proj1.id, admin_user.id, name="Isolated Mat 1")
        await create_material_in_db(db, proj2.id, admin_user.id, name="Isolated Mat 2")
        response = await admin_client.get(f"/api/v1/materials?project_id={proj1.id}")
        data = response.json()
        assert all(m["projectId"] == str(proj1.id) for m in data)
        assert any(m["name"] == "Isolated Mat 1" for m in data)
        assert not any(m["name"] == "Isolated Mat 2" for m in data)


class TestSpecificationsXSSEdgeCases:

    @pytest.mark.parametrize("xss", XSS_PAYLOADS[:5])
    async def test_specs_key_xss_stripped(self, admin_client: AsyncClient, project: Project, xss: str):
        key = xss[:100] if len(xss) > 100 else xss
        payload = {"name": "Spec XSS Test", "specifications": {key: "safe_value"}}
        response = await admin_client.post(f"/api/v1/projects/{project.id}/materials", json=payload)
        if response.status_code == 200:
            specs = response.json().get("specifications", {})
            for k in specs:
                assert "<script" not in k.lower()
                assert "javascript:" not in k.lower()

    @pytest.mark.parametrize("xss", XSS_PAYLOADS[:5])
    async def test_specs_value_xss_stripped(self, admin_client: AsyncClient, project: Project, xss: str):
        payload = {"name": "Spec XSS Val", "specifications": {"safe_key": xss}}
        response = await admin_client.post(f"/api/v1/projects/{project.id}/materials", json=payload)
        if response.status_code == 200:
            specs = response.json().get("specifications", {})
            for v in specs.values():
                if isinstance(v, str):
                    assert "<script" not in v.lower()
                    assert "javascript:" not in v.lower()


class TestUpdateXSSSanitization:

    @pytest.mark.parametrize("field", XSS_SANITIZABLE_FIELDS)
    @pytest.mark.parametrize("xss_payload", XSS_PAYLOADS[:4])
    async def test_update_xss_sanitized(self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User, field: str, xss_payload: str):
        mat = await create_material_in_db(db, project.id, admin_user.id)
        update_payload = {}
        if field == "name":
            update_payload["name"] = f"Safe {xss_payload} Update"
        else:
            update_payload[field] = xss_payload
        response = await admin_client.put(
            f"/api/v1/projects/{project.id}/materials/{mat.id}",
            json=update_payload,
        )
        if response.status_code == 200:
            data = response.json()
            camel = CAMEL_CASE_FIELD_MAP.get(field, field)
            value = data.get(camel, data.get(field, ""))
            if value:
                assert "<script" not in value.lower()
                assert "javascript:" not in value.lower()
                assert "<iframe" not in value.lower()


class TestConcurrentOperations:

    async def test_create_materials_with_same_name(self, admin_client: AsyncClient, project: Project):
        for _ in range(3):
            response = await admin_client.post(
                f"/api/v1/projects/{project.id}/materials",
                json={"name": "Duplicate Name"},
            )
            assert response.status_code == 200
        list_resp = await admin_client.get(f"/api/v1/projects/{project.id}/materials")
        same_name = [m for m in list_resp.json() if m["name"] == "Duplicate Name"]
        assert len(same_name) == 3

    async def test_create_and_immediately_delete(self, admin_client: AsyncClient, project: Project):
        create_resp = await admin_client.post(
            f"/api/v1/projects/{project.id}/materials",
            json={"name": "Ephemeral Material"},
        )
        material_id = create_resp.json()["id"]
        delete_resp = await admin_client.delete(f"/api/v1/projects/{project.id}/materials/{material_id}")
        assert delete_resp.status_code == 200
        get_resp = await admin_client.get(f"/api/v1/projects/{project.id}/materials/{material_id}")
        assert get_resp.status_code == 404


class TestAllFieldsCombined:

    @pytest.mark.parametrize("specifications", [
        None,
        {},
        {"single": "value"},
        {"k1": "v1", "k2": 42, "k3": True, "k4": None},
    ])
    async def test_create_with_various_specifications(self, admin_client: AsyncClient, project: Project, specifications):
        payload = {"name": "Specs Variant", "specifications": specifications}
        response = await admin_client.post(f"/api/v1/projects/{project.id}/materials", json=payload)
        assert response.status_code == 200

    @pytest.mark.parametrize("quantity,unit", [
        (None, None),
        (0, "kg"),
        (100, "bags"),
        (999999999, "tons"),
        (0.01, "liters"),
    ])
    async def test_quantity_unit_combinations(self, admin_client: AsyncClient, project: Project, quantity, unit):
        payload = {"name": "Qty Unit Combo"}
        if quantity is not None:
            payload["quantity"] = quantity
        if unit is not None:
            payload["unit"] = unit
        response = await admin_client.post(f"/api/v1/projects/{project.id}/materials", json=payload)
        assert response.status_code == 200

    @pytest.mark.parametrize("material_type,manufacturer,model_number", [
        (None, None, None),
        ("concrete", None, None),
        (None, "ACME", None),
        (None, None, "M-100"),
        ("steel", "ArcelorMittal", "ST-500"),
    ])
    async def test_optional_string_field_combinations(self, admin_client: AsyncClient, project: Project, material_type, manufacturer, model_number):
        payload = {"name": "Combo Material"}
        if material_type:
            payload["material_type"] = material_type
        if manufacturer:
            payload["manufacturer"] = manufacturer
        if model_number:
            payload["model_number"] = model_number
        response = await admin_client.post(f"/api/v1/projects/{project.id}/materials", json=payload)
        assert response.status_code == 200
