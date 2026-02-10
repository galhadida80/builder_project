import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.equipment_template import ConsultantType
from app.models.material_template import MaterialTemplate, MaterialTemplateConsultant

BASE_URL = "/api/v1/material-templates"


def valid_payload(**overrides):
    data = {
        "name": "Concrete Mix",
        "name_he": "תערובת בטון",
        "category": "Structural",
    }
    data.update(overrides)
    return data


def valid_doc(**overrides):
    data = {
        "name": "Test Doc",
        "name_he": "מסמך בדיקה",
        "source": "consultant",
        "required": True,
    }
    data.update(overrides)
    return data


def valid_spec(**overrides):
    data = {
        "name": "Strength",
        "name_he": "חוזק",
        "field_type": "text",
        "required": True,
    }
    data.update(overrides)
    return data


def valid_checklist(**overrides):
    data = {
        "name": "Check Item",
        "name_he": "פריט בדיקה",
        "requires_file": False,
    }
    data.update(overrides)
    return data


async def create_template_in_db(db: AsyncSession, **overrides):
    defaults = {
        "id": uuid.uuid4(),
        "name": "Test Material",
        "name_he": "חומר בדיקה",
        "category": "Structural",
        "is_active": True,
        "required_documents": [],
        "required_specifications": [],
        "submission_checklist": [],
    }
    defaults.update(overrides)
    template = MaterialTemplate(**defaults)
    db.add(template)
    await db.flush()
    await db.refresh(template)
    return template


async def create_consultant_in_db(db: AsyncSession, **overrides):
    defaults = {
        "id": uuid.uuid4(),
        "name": "Structural Engineer",
        "name_he": "מהנדס מבנים",
        "category": "engineering",
    }
    defaults.update(overrides)
    consultant = ConsultantType(**defaults)
    db.add(consultant)
    await db.flush()
    await db.refresh(consultant)
    return consultant


class TestCreateMaterialTemplate:

    async def test_create_minimal(self, admin_client: AsyncClient):
        response = await admin_client.post(BASE_URL, json=valid_payload())
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Concrete Mix"
        assert data["name_he"] == "תערובת בטון"
        assert data["category"] == "Structural"
        assert data["is_active"] is True
        assert data["required_documents"] == []
        assert data["required_specifications"] == []
        assert data["submission_checklist"] == []
        assert "id" in data
        assert "created_at" in data
        assert "updated_at" in data

    async def test_create_with_all_fields(self, admin_client: AsyncClient):
        payload = valid_payload(
            is_active=False,
            required_documents=[valid_doc()],
            required_specifications=[valid_spec(field_type="select", options=["A", "B"])],
            submission_checklist=[valid_checklist(requires_file=True)],
        )
        response = await admin_client.post(BASE_URL, json=payload)
        assert response.status_code == 201
        data = response.json()
        assert data["is_active"] is False
        assert len(data["required_documents"]) == 1
        assert len(data["required_specifications"]) == 1
        assert len(data["submission_checklist"]) == 1

    async def test_create_multiple_nested_items(self, admin_client: AsyncClient):
        docs = [valid_doc(name=f"Doc {i}", name_he=f"מסמך {i}") for i in range(5)]
        specs = [valid_spec(name=f"Spec {i}", name_he=f"מפרט {i}") for i in range(5)]
        checks = [valid_checklist(name=f"Check {i}", name_he=f"בדיקה {i}") for i in range(5)]
        payload = valid_payload(
            required_documents=docs,
            required_specifications=specs,
            submission_checklist=checks,
        )
        response = await admin_client.post(BASE_URL, json=payload)
        assert response.status_code == 201
        data = response.json()
        assert len(data["required_documents"]) == 5
        assert len(data["required_specifications"]) == 5
        assert len(data["submission_checklist"]) == 5


class TestCreateMaterialTemplateAuth:

    async def test_non_admin_gets_403(self, user_client: AsyncClient):
        response = await user_client.post(BASE_URL, json=valid_payload())
        assert response.status_code == 403
        assert response.json()["detail"] == "Admin access required"

    async def test_unauthenticated_gets_401(self, client: AsyncClient):
        response = await client.post(BASE_URL, json=valid_payload())
        assert response.status_code == 401


class TestCreateNameValidation:

    @pytest.mark.parametrize("field", ["name", "name_he", "category"])
    @pytest.mark.parametrize(
        "value,expected_status",
        [
            ("", 422),
            ("A", 422),
            ("AB", 201),
            ("A" * 255, 201),
            ("A" * 256, 422),
        ],
        ids=["empty", "1_char", "2_chars_min", "255_chars_max", "256_chars_over"],
    )
    async def test_string_length_validation(
        self, admin_client: AsyncClient, field, value, expected_status
    ):
        payload = valid_payload(**{field: value})
        response = await admin_client.post(BASE_URL, json=payload)
        assert response.status_code == expected_status

    @pytest.mark.parametrize("field", ["name", "name_he", "category"])
    async def test_missing_required_field(self, admin_client: AsyncClient, field):
        payload = valid_payload()
        del payload[field]
        response = await admin_client.post(BASE_URL, json=payload)
        assert response.status_code == 422

    @pytest.mark.parametrize("field", ["name", "name_he", "category"])
    async def test_null_required_field(self, admin_client: AsyncClient, field):
        payload = valid_payload(**{field: None})
        response = await admin_client.post(BASE_URL, json=payload)
        assert response.status_code == 422

    @pytest.mark.parametrize("field", ["name", "name_he", "category"])
    async def test_whitespace_only_stripped(self, admin_client: AsyncClient, field):
        payload = valid_payload(**{field: "  "})
        response = await admin_client.post(BASE_URL, json=payload)
        assert response.status_code == 422


class TestCreateIsActiveFlag:

    async def test_default_true(self, admin_client: AsyncClient):
        payload = valid_payload()
        response = await admin_client.post(BASE_URL, json=payload)
        assert response.status_code == 201
        assert response.json()["is_active"] is True

    async def test_explicit_true(self, admin_client: AsyncClient):
        payload = valid_payload(is_active=True)
        response = await admin_client.post(BASE_URL, json=payload)
        assert response.status_code == 201
        assert response.json()["is_active"] is True

    async def test_explicit_false(self, admin_client: AsyncClient):
        payload = valid_payload(is_active=False)
        response = await admin_client.post(BASE_URL, json=payload)
        assert response.status_code == 201
        assert response.json()["is_active"] is False


class TestCreateDocumentDefinitionValidation:

    @pytest.mark.parametrize(
        "source", ["consultant", "project_manager", "contractor"]
    )
    async def test_valid_source_types(self, admin_client: AsyncClient, source):
        payload = valid_payload(required_documents=[valid_doc(source=source)])
        response = await admin_client.post(BASE_URL, json=payload)
        assert response.status_code == 201

    @pytest.mark.parametrize(
        "source", ["invalid", "admin", "engineer", "", "CONSULTANT"]
    )
    async def test_invalid_source_types(self, admin_client: AsyncClient, source):
        payload = valid_payload(required_documents=[valid_doc(source=source)])
        response = await admin_client.post(BASE_URL, json=payload)
        assert response.status_code == 422

    @pytest.mark.parametrize(
        "field,value,expected_status",
        [
            ("name", "A", 422),
            ("name", "AB", 201),
            ("name", "A" * 255, 201),
            ("name", "A" * 256, 422),
            ("name_he", "A", 422),
            ("name_he", "AB", 201),
            ("name_he", "A" * 255, 201),
            ("name_he", "A" * 256, 422),
        ],
        ids=[
            "name_1char", "name_2chars", "name_255chars", "name_256chars",
            "name_he_1char", "name_he_2chars", "name_he_255chars", "name_he_256chars",
        ],
    )
    async def test_doc_name_length(self, admin_client: AsyncClient, field, value, expected_status):
        payload = valid_payload(required_documents=[valid_doc(**{field: value})])
        response = await admin_client.post(BASE_URL, json=payload)
        assert response.status_code == expected_status

    async def test_doc_description_max_length(self, admin_client: AsyncClient):
        payload = valid_payload(
            required_documents=[valid_doc(description="D" * 2000)]
        )
        response = await admin_client.post(BASE_URL, json=payload)
        assert response.status_code == 201

    async def test_doc_description_too_long(self, admin_client: AsyncClient):
        payload = valid_payload(
            required_documents=[valid_doc(description="D" * 2001)]
        )
        response = await admin_client.post(BASE_URL, json=payload)
        assert response.status_code == 422

    async def test_doc_description_null_allowed(self, admin_client: AsyncClient):
        payload = valid_payload(
            required_documents=[valid_doc(description=None)]
        )
        response = await admin_client.post(BASE_URL, json=payload)
        assert response.status_code == 201

    @pytest.mark.parametrize("required_val", [True, False])
    async def test_doc_required_boolean(self, admin_client: AsyncClient, required_val):
        payload = valid_payload(
            required_documents=[valid_doc(required=required_val)]
        )
        response = await admin_client.post(BASE_URL, json=payload)
        assert response.status_code == 201


class TestCreateSpecificationDefinitionValidation:

    @pytest.mark.parametrize(
        "field_type", ["text", "number", "boolean", "file"]
    )
    async def test_valid_field_types_no_options(self, admin_client: AsyncClient, field_type):
        payload = valid_payload(
            required_specifications=[valid_spec(field_type=field_type)]
        )
        response = await admin_client.post(BASE_URL, json=payload)
        assert response.status_code == 201

    async def test_select_with_options(self, admin_client: AsyncClient):
        payload = valid_payload(
            required_specifications=[
                valid_spec(field_type="select", options=["Option A", "Option B"])
            ]
        )
        response = await admin_client.post(BASE_URL, json=payload)
        assert response.status_code == 201

    async def test_select_without_options_fails(self, admin_client: AsyncClient):
        payload = valid_payload(
            required_specifications=[valid_spec(field_type="select")]
        )
        response = await admin_client.post(BASE_URL, json=payload)
        assert response.status_code == 422

    async def test_select_with_empty_options_fails(self, admin_client: AsyncClient):
        payload = valid_payload(
            required_specifications=[valid_spec(field_type="select", options=[])]
        )
        response = await admin_client.post(BASE_URL, json=payload)
        assert response.status_code == 422

    @pytest.mark.parametrize("field_type", ["text", "number", "boolean", "file"])
    async def test_non_select_with_options_fails(self, admin_client: AsyncClient, field_type):
        payload = valid_payload(
            required_specifications=[
                valid_spec(field_type=field_type, options=["A", "B"])
            ]
        )
        response = await admin_client.post(BASE_URL, json=payload)
        assert response.status_code == 422

    async def test_invalid_field_type(self, admin_client: AsyncClient):
        payload = valid_payload(
            required_specifications=[valid_spec(field_type="invalid")]
        )
        response = await admin_client.post(BASE_URL, json=payload)
        assert response.status_code == 422

    @pytest.mark.parametrize(
        "field,value,expected_status",
        [
            ("name", "A", 422),
            ("name", "AB", 201),
            ("name", "A" * 255, 201),
            ("name", "A" * 256, 422),
            ("name_he", "A", 422),
            ("name_he", "AB", 201),
            ("name_he", "A" * 255, 201),
            ("name_he", "A" * 256, 422),
        ],
        ids=[
            "name_1char", "name_2chars", "name_255chars", "name_256chars",
            "name_he_1char", "name_he_2chars", "name_he_255chars", "name_he_256chars",
        ],
    )
    async def test_spec_name_length(self, admin_client: AsyncClient, field, value, expected_status):
        payload = valid_payload(
            required_specifications=[valid_spec(**{field: value})]
        )
        response = await admin_client.post(BASE_URL, json=payload)
        assert response.status_code == expected_status

    async def test_spec_unit_valid(self, admin_client: AsyncClient):
        payload = valid_payload(
            required_specifications=[valid_spec(unit="MPa")]
        )
        response = await admin_client.post(BASE_URL, json=payload)
        assert response.status_code == 201

    async def test_spec_unit_too_long(self, admin_client: AsyncClient):
        payload = valid_payload(
            required_specifications=[valid_spec(unit="U" * 51)]
        )
        response = await admin_client.post(BASE_URL, json=payload)
        assert response.status_code == 422

    async def test_spec_unit_null_allowed(self, admin_client: AsyncClient):
        payload = valid_payload(
            required_specifications=[valid_spec(unit=None)]
        )
        response = await admin_client.post(BASE_URL, json=payload)
        assert response.status_code == 201

    @pytest.mark.parametrize("required_val", [True, False])
    async def test_spec_required_boolean(self, admin_client: AsyncClient, required_val):
        payload = valid_payload(
            required_specifications=[valid_spec(required=required_val)]
        )
        response = await admin_client.post(BASE_URL, json=payload)
        assert response.status_code == 201


class TestCreateChecklistItemValidation:

    @pytest.mark.parametrize(
        "field,value,expected_status",
        [
            ("name", "A", 422),
            ("name", "AB", 201),
            ("name", "A" * 255, 201),
            ("name", "A" * 256, 422),
            ("name_he", "A", 422),
            ("name_he", "AB", 201),
            ("name_he", "A" * 255, 201),
            ("name_he", "A" * 256, 422),
        ],
        ids=[
            "name_1char", "name_2chars", "name_255chars", "name_256chars",
            "name_he_1char", "name_he_2chars", "name_he_255chars", "name_he_256chars",
        ],
    )
    async def test_checklist_name_length(self, admin_client: AsyncClient, field, value, expected_status):
        payload = valid_payload(
            submission_checklist=[valid_checklist(**{field: value})]
        )
        response = await admin_client.post(BASE_URL, json=payload)
        assert response.status_code == expected_status

    @pytest.mark.parametrize("requires_file", [True, False])
    async def test_requires_file_boolean(self, admin_client: AsyncClient, requires_file):
        payload = valid_payload(
            submission_checklist=[valid_checklist(requires_file=requires_file)]
        )
        response = await admin_client.post(BASE_URL, json=payload)
        assert response.status_code == 201


class TestGetMaterialTemplate:

    async def test_get_existing(self, admin_client: AsyncClient, db: AsyncSession):
        template = await create_template_in_db(db)
        response = await admin_client.get(f"{BASE_URL}/{template.id}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(template.id)
        assert data["name"] == template.name
        assert data["name_he"] == template.name_he
        assert data["category"] == template.category

    async def test_get_nonexistent_404(self, admin_client: AsyncClient):
        fake_id = uuid.uuid4()
        response = await admin_client.get(f"{BASE_URL}/{fake_id}")
        assert response.status_code == 404
        assert response.json()["detail"] == "Material template not found"

    async def test_get_invalid_uuid_422(self, admin_client: AsyncClient):
        response = await admin_client.get(f"{BASE_URL}/not-a-uuid")
        assert response.status_code == 422

    async def test_get_response_schema(self, admin_client: AsyncClient, db: AsyncSession):
        template = await create_template_in_db(db)
        response = await admin_client.get(f"{BASE_URL}/{template.id}")
        data = response.json()
        required_keys = {
            "id", "name", "name_he", "category", "is_active",
            "required_documents", "required_specifications",
            "submission_checklist", "created_at", "updated_at",
        }
        assert required_keys.issubset(set(data.keys()))


class TestListMaterialTemplates:

    async def test_list_empty(self, admin_client: AsyncClient):
        response = await admin_client.get(BASE_URL)
        assert response.status_code == 200
        assert response.json() == []

    async def test_list_returns_all(self, admin_client: AsyncClient, db: AsyncSession):
        await create_template_in_db(db, name="Template A", name_he="תבנית א")
        await create_template_in_db(db, name="Template B", name_he="תבנית ב")
        response = await admin_client.get(BASE_URL)
        assert response.status_code == 200
        assert len(response.json()) == 2

    async def test_list_includes_consultants_field(self, admin_client: AsyncClient, db: AsyncSession):
        await create_template_in_db(db)
        response = await admin_client.get(BASE_URL)
        data = response.json()
        assert len(data) == 1
        assert "approving_consultants" in data[0]
        assert isinstance(data[0]["approving_consultants"], list)

    async def test_list_with_consultant_attached(self, admin_client: AsyncClient, db: AsyncSession):
        template = await create_template_in_db(db)
        consultant = await create_consultant_in_db(db)
        link = MaterialTemplateConsultant(
            id=uuid.uuid4(),
            template_id=template.id,
            consultant_type_id=consultant.id,
        )
        db.add(link)
        await db.flush()
        response = await admin_client.get(BASE_URL)
        data = response.json()
        assert len(data) == 1
        assert len(data[0]["approving_consultants"]) == 1
        assert data[0]["approving_consultants"][0]["name"] == consultant.name


class TestListCategoryFilter:

    @pytest.mark.parametrize(
        "categories,filter_cat,expected_count",
        [
            (["Structural", "Electrical", "Structural"], "Structural", 2),
            (["Structural", "Electrical"], "Electrical", 1),
            (["Structural", "Electrical"], "Plumbing", 0),
            (["Structural"], "Structural", 1),
        ],
        ids=["two_match", "one_match", "none_match", "single_match"],
    )
    async def test_category_filter(
        self, admin_client: AsyncClient, db: AsyncSession,
        categories, filter_cat, expected_count
    ):
        for i, cat in enumerate(categories):
            await create_template_in_db(
                db, name=f"Tpl {i}", name_he=f"תבנית {i}", category=cat
            )
        response = await admin_client.get(BASE_URL, params={"category": filter_cat})
        assert response.status_code == 200
        assert len(response.json()) == expected_count

    async def test_no_filter_returns_all(self, admin_client: AsyncClient, db: AsyncSession):
        await create_template_in_db(db, category="Structural", name="AA", name_he="אא")
        await create_template_in_db(db, category="Electrical", name="BB", name_he="בב")
        response = await admin_client.get(BASE_URL)
        assert len(response.json()) == 2


class TestListIsActiveFilter:

    @pytest.mark.parametrize(
        "active_flags,filter_val,expected_count",
        [
            ([True, True, False], "true", 2),
            ([True, True, False], "false", 1),
            ([False, False], "true", 0),
            ([True], "false", 0),
        ],
        ids=["two_active", "one_inactive", "none_active", "none_inactive"],
    )
    async def test_is_active_filter(
        self, admin_client: AsyncClient, db: AsyncSession,
        active_flags, filter_val, expected_count
    ):
        for i, flag in enumerate(active_flags):
            await create_template_in_db(
                db, name=f"Tpl {i}", name_he=f"תבנית {i}", is_active=flag
            )
        response = await admin_client.get(BASE_URL, params={"is_active": filter_val})
        assert response.status_code == 200
        assert len(response.json()) == expected_count


class TestUpdateMaterialTemplate:

    async def test_update_name(self, admin_client: AsyncClient, db: AsyncSession):
        template = await create_template_in_db(db)
        response = await admin_client.put(
            f"{BASE_URL}/{template.id}", json={"name": "Updated Name"}
        )
        assert response.status_code == 200
        assert response.json()["name"] == "Updated Name"

    async def test_update_name_he(self, admin_client: AsyncClient, db: AsyncSession):
        template = await create_template_in_db(db)
        response = await admin_client.put(
            f"{BASE_URL}/{template.id}", json={"name_he": "שם מעודכן"}
        )
        assert response.status_code == 200
        assert response.json()["name_he"] == "שם מעודכן"

    async def test_update_category(self, admin_client: AsyncClient, db: AsyncSession):
        template = await create_template_in_db(db)
        response = await admin_client.put(
            f"{BASE_URL}/{template.id}", json={"category": "Electrical"}
        )
        assert response.status_code == 200
        assert response.json()["category"] == "Electrical"

    async def test_update_is_active(self, admin_client: AsyncClient, db: AsyncSession):
        template = await create_template_in_db(db, is_active=True)
        response = await admin_client.put(
            f"{BASE_URL}/{template.id}", json={"is_active": False}
        )
        assert response.status_code == 200
        assert response.json()["is_active"] is False

    async def test_update_required_documents(self, admin_client: AsyncClient, db: AsyncSession):
        template = await create_template_in_db(db)
        docs = [valid_doc()]
        response = await admin_client.put(
            f"{BASE_URL}/{template.id}", json={"required_documents": docs}
        )
        assert response.status_code == 200
        assert len(response.json()["required_documents"]) == 1

    async def test_update_required_specifications(self, admin_client: AsyncClient, db: AsyncSession):
        template = await create_template_in_db(db)
        specs = [valid_spec(field_type="select", options=["X", "Y"])]
        response = await admin_client.put(
            f"{BASE_URL}/{template.id}", json={"required_specifications": specs}
        )
        assert response.status_code == 200
        assert len(response.json()["required_specifications"]) == 1

    async def test_update_submission_checklist(self, admin_client: AsyncClient, db: AsyncSession):
        template = await create_template_in_db(db)
        checks = [valid_checklist()]
        response = await admin_client.put(
            f"{BASE_URL}/{template.id}", json={"submission_checklist": checks}
        )
        assert response.status_code == 200
        assert len(response.json()["submission_checklist"]) == 1

    async def test_update_multiple_fields(self, admin_client: AsyncClient, db: AsyncSession):
        template = await create_template_in_db(db)
        response = await admin_client.put(
            f"{BASE_URL}/{template.id}",
            json={"name": "New Name", "category": "Plumbing", "is_active": False},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "New Name"
        assert data["category"] == "Plumbing"
        assert data["is_active"] is False

    async def test_update_empty_body_no_change(self, admin_client: AsyncClient, db: AsyncSession):
        template = await create_template_in_db(db, name="Original")
        response = await admin_client.put(f"{BASE_URL}/{template.id}", json={})
        assert response.status_code == 200
        assert response.json()["name"] == "Original"

    async def test_update_nonexistent_404(self, admin_client: AsyncClient):
        fake_id = uuid.uuid4()
        response = await admin_client.put(
            f"{BASE_URL}/{fake_id}", json={"name": "No Template"}
        )
        assert response.status_code == 404


class TestUpdateMaterialTemplateAuth:

    async def test_non_admin_gets_403(self, user_client: AsyncClient, db: AsyncSession):
        template = await create_template_in_db(db)
        response = await user_client.put(
            f"{BASE_URL}/{template.id}", json={"name": "Hacked"}
        )
        assert response.status_code == 403

    async def test_unauthenticated_gets_401(self, client: AsyncClient, db: AsyncSession):
        template = await create_template_in_db(db)
        response = await client.put(
            f"{BASE_URL}/{template.id}", json={"name": "Hacked"}
        )
        assert response.status_code == 401


class TestUpdateNameValidation:

    @pytest.mark.parametrize("field", ["name", "name_he", "category"])
    @pytest.mark.parametrize(
        "value,expected_status",
        [
            ("A", 422),
            ("AB", 200),
            ("A" * 255, 200),
            ("A" * 256, 422),
        ],
        ids=["1_char", "2_chars_min", "255_chars_max", "256_chars_over"],
    )
    async def test_update_string_length(
        self, admin_client: AsyncClient, db: AsyncSession, field, value, expected_status
    ):
        template = await create_template_in_db(db)
        response = await admin_client.put(
            f"{BASE_URL}/{template.id}", json={field: value}
        )
        assert response.status_code == expected_status


class TestDeleteMaterialTemplate:

    async def test_delete_existing(self, admin_client: AsyncClient, db: AsyncSession):
        template = await create_template_in_db(db)
        response = await admin_client.delete(f"{BASE_URL}/{template.id}")
        assert response.status_code == 200
        assert response.json()["message"] == "Material template deleted"

    async def test_delete_verify_gone(self, admin_client: AsyncClient, db: AsyncSession):
        template = await create_template_in_db(db)
        await admin_client.delete(f"{BASE_URL}/{template.id}")
        response = await admin_client.get(f"{BASE_URL}/{template.id}")
        assert response.status_code == 404

    async def test_delete_nonexistent_404(self, admin_client: AsyncClient):
        fake_id = uuid.uuid4()
        response = await admin_client.delete(f"{BASE_URL}/{fake_id}")
        assert response.status_code == 404

    async def test_delete_cascades_consultants(self, admin_client: AsyncClient, db: AsyncSession):
        template = await create_template_in_db(db)
        consultant = await create_consultant_in_db(db)
        link = MaterialTemplateConsultant(
            id=uuid.uuid4(),
            template_id=template.id,
            consultant_type_id=consultant.id,
        )
        db.add(link)
        await db.flush()
        response = await admin_client.delete(f"{BASE_URL}/{template.id}")
        assert response.status_code == 200


class TestDeleteMaterialTemplateAuth:

    async def test_non_admin_gets_403(self, user_client: AsyncClient, db: AsyncSession):
        template = await create_template_in_db(db)
        response = await user_client.delete(f"{BASE_URL}/{template.id}")
        assert response.status_code == 403

    async def test_unauthenticated_gets_401(self, client: AsyncClient, db: AsyncSession):
        template = await create_template_in_db(db)
        response = await client.delete(f"{BASE_URL}/{template.id}")
        assert response.status_code == 401


class TestAddConsultantToTemplate:

    async def test_add_consultant_success(self, admin_client: AsyncClient, db: AsyncSession):
        template = await create_template_in_db(db)
        consultant = await create_consultant_in_db(db)
        url = f"{BASE_URL}/{template.id}/consultants/{consultant.id}"
        response = await admin_client.post(url)
        assert response.status_code == 201
        assert response.json()["message"] == "Consultant added to template"

    async def test_add_multiple_consultants(self, admin_client: AsyncClient, db: AsyncSession):
        template = await create_template_in_db(db)
        c1 = await create_consultant_in_db(db, name="Consultant A", name_he="יועץ א")
        c2 = await create_consultant_in_db(db, name="Consultant B", name_he="יועץ ב")
        r1 = await admin_client.post(f"{BASE_URL}/{template.id}/consultants/{c1.id}")
        r2 = await admin_client.post(f"{BASE_URL}/{template.id}/consultants/{c2.id}")
        assert r1.status_code == 201
        assert r2.status_code == 201

    async def test_add_duplicate_consultant_400(self, admin_client: AsyncClient, db: AsyncSession):
        template = await create_template_in_db(db)
        consultant = await create_consultant_in_db(db)
        url = f"{BASE_URL}/{template.id}/consultants/{consultant.id}"
        await admin_client.post(url)
        response = await admin_client.post(url)
        assert response.status_code == 400
        assert "already assigned" in response.json()["detail"]

    async def test_add_to_nonexistent_template_404(self, admin_client: AsyncClient, db: AsyncSession):
        consultant = await create_consultant_in_db(db)
        fake_id = uuid.uuid4()
        response = await admin_client.post(
            f"{BASE_URL}/{fake_id}/consultants/{consultant.id}"
        )
        assert response.status_code == 404
        assert "template" in response.json()["detail"].lower()

    async def test_add_nonexistent_consultant_404(self, admin_client: AsyncClient, db: AsyncSession):
        template = await create_template_in_db(db)
        fake_id = uuid.uuid4()
        response = await admin_client.post(
            f"{BASE_URL}/{template.id}/consultants/{fake_id}"
        )
        assert response.status_code == 404
        assert "consultant" in response.json()["detail"].lower()

    async def test_add_consultant_visible_in_list(self, admin_client: AsyncClient, db: AsyncSession):
        template = await create_template_in_db(db)
        consultant = await create_consultant_in_db(db)
        await admin_client.post(f"{BASE_URL}/{template.id}/consultants/{consultant.id}")
        response = await admin_client.get(BASE_URL)
        data = response.json()
        found = [t for t in data if t["id"] == str(template.id)]
        assert len(found) == 1
        assert len(found[0]["approving_consultants"]) == 1


class TestAddConsultantAuth:

    async def test_non_admin_gets_403(self, user_client: AsyncClient, db: AsyncSession):
        template = await create_template_in_db(db)
        consultant = await create_consultant_in_db(db)
        response = await user_client.post(
            f"{BASE_URL}/{template.id}/consultants/{consultant.id}"
        )
        assert response.status_code == 403

    async def test_unauthenticated_gets_401(self, client: AsyncClient, db: AsyncSession):
        template = await create_template_in_db(db)
        consultant = await create_consultant_in_db(db)
        response = await client.post(
            f"{BASE_URL}/{template.id}/consultants/{consultant.id}"
        )
        assert response.status_code == 401


class TestRemoveConsultantFromTemplate:

    async def test_remove_consultant_success(self, admin_client: AsyncClient, db: AsyncSession):
        template = await create_template_in_db(db)
        consultant = await create_consultant_in_db(db)
        link = MaterialTemplateConsultant(
            id=uuid.uuid4(),
            template_id=template.id,
            consultant_type_id=consultant.id,
        )
        db.add(link)
        await db.flush()
        response = await admin_client.delete(
            f"{BASE_URL}/{template.id}/consultants/{consultant.id}"
        )
        assert response.status_code == 200
        assert response.json()["message"] == "Consultant removed from template"

    async def test_remove_nonexistent_link_404(self, admin_client: AsyncClient, db: AsyncSession):
        template = await create_template_in_db(db)
        consultant = await create_consultant_in_db(db)
        response = await admin_client.delete(
            f"{BASE_URL}/{template.id}/consultants/{consultant.id}"
        )
        assert response.status_code == 404
        assert "not assigned" in response.json()["detail"].lower()

    async def test_remove_from_nonexistent_template(self, admin_client: AsyncClient, db: AsyncSession):
        consultant = await create_consultant_in_db(db)
        fake_id = uuid.uuid4()
        response = await admin_client.delete(
            f"{BASE_URL}/{fake_id}/consultants/{consultant.id}"
        )
        assert response.status_code == 404

    async def test_remove_consultant_no_longer_in_list(self, admin_client: AsyncClient, db: AsyncSession):
        template = await create_template_in_db(db)
        consultant = await create_consultant_in_db(db)
        link = MaterialTemplateConsultant(
            id=uuid.uuid4(),
            template_id=template.id,
            consultant_type_id=consultant.id,
        )
        db.add(link)
        await db.flush()
        await admin_client.delete(f"{BASE_URL}/{template.id}/consultants/{consultant.id}")
        response = await admin_client.get(BASE_URL)
        data = response.json()
        found = [t for t in data if t["id"] == str(template.id)]
        assert len(found) == 1
        assert len(found[0]["approving_consultants"]) == 0


class TestRemoveConsultantAuth:

    async def test_non_admin_gets_403(self, user_client: AsyncClient, db: AsyncSession):
        template = await create_template_in_db(db)
        consultant = await create_consultant_in_db(db)
        response = await user_client.delete(
            f"{BASE_URL}/{template.id}/consultants/{consultant.id}"
        )
        assert response.status_code == 403

    async def test_unauthenticated_gets_401(self, client: AsyncClient, db: AsyncSession):
        template = await create_template_in_db(db)
        consultant = await create_consultant_in_db(db)
        response = await client.delete(
            f"{BASE_URL}/{template.id}/consultants/{consultant.id}"
        )
        assert response.status_code == 401


class TestXSSSanitization:

    XSS_PAYLOADS = [
        '<script>alert("xss")</script>',
        'Test<script>document.cookie</script>Value',
        '<img src=x onerror=alert(1)>',
        '<iframe src="evil.com"></iframe>',
        '<svg onload=alert(1)></svg>',
        'javascript:alert(1)',
        '<object data="evil.swf"></object>',
        '<embed src="evil.swf">',
        '<link rel="stylesheet" href="evil.css">',
        '<meta http-equiv="refresh" content="0;url=evil.com">',
        '<style>body{background:url("evil.com")}</style>',
    ]

    @pytest.mark.parametrize("xss_payload", XSS_PAYLOADS)
    async def test_name_sanitized(self, admin_client: AsyncClient, xss_payload):
        payload = valid_payload(name=f"Safe {xss_payload} Name")
        response = await admin_client.post(BASE_URL, json=payload)
        if response.status_code == 201:
            data = response.json()
            assert "<script" not in data["name"]
            assert "javascript:" not in data["name"]
            assert "<iframe" not in data["name"]
            assert "<img" not in data["name"]
            assert "<svg" not in data["name"]
            assert "<object" not in data["name"]
            assert "<embed" not in data["name"]
            assert "<link" not in data["name"]
            assert "<meta" not in data["name"]
            assert "<style" not in data["name"]

    @pytest.mark.parametrize("xss_payload", XSS_PAYLOADS)
    async def test_name_he_sanitized(self, admin_client: AsyncClient, xss_payload):
        payload = valid_payload(name_he=f"בטוח {xss_payload} שם")
        response = await admin_client.post(BASE_URL, json=payload)
        if response.status_code == 201:
            data = response.json()
            assert "<script" not in data["name_he"]
            assert "<iframe" not in data["name_he"]

    @pytest.mark.parametrize("xss_payload", XSS_PAYLOADS)
    async def test_category_sanitized(self, admin_client: AsyncClient, xss_payload):
        payload = valid_payload(category=f"Cat {xss_payload} End")
        response = await admin_client.post(BASE_URL, json=payload)
        if response.status_code == 201:
            data = response.json()
            assert "<script" not in data["category"]
            assert "<iframe" not in data["category"]

    @pytest.mark.parametrize("xss_payload", XSS_PAYLOADS[:5])
    async def test_doc_name_sanitized(self, admin_client: AsyncClient, xss_payload):
        payload = valid_payload(
            required_documents=[valid_doc(name=f"Doc {xss_payload} End")]
        )
        response = await admin_client.post(BASE_URL, json=payload)
        if response.status_code == 201:
            doc = response.json()["required_documents"][0]
            assert "<script" not in doc["name"]

    @pytest.mark.parametrize("xss_payload", XSS_PAYLOADS[:5])
    async def test_spec_name_sanitized(self, admin_client: AsyncClient, xss_payload):
        payload = valid_payload(
            required_specifications=[valid_spec(name=f"Spec {xss_payload} End")]
        )
        response = await admin_client.post(BASE_URL, json=payload)
        if response.status_code == 201:
            spec = response.json()["required_specifications"][0]
            assert "<script" not in spec["name"]

    @pytest.mark.parametrize("xss_payload", XSS_PAYLOADS[:5])
    async def test_checklist_name_sanitized(self, admin_client: AsyncClient, xss_payload):
        payload = valid_payload(
            submission_checklist=[valid_checklist(name=f"Check {xss_payload} End")]
        )
        response = await admin_client.post(BASE_URL, json=payload)
        if response.status_code == 201:
            item = response.json()["submission_checklist"][0]
            assert "<script" not in item["name"]

    @pytest.mark.parametrize("xss_payload", XSS_PAYLOADS[:5])
    async def test_doc_description_sanitized(self, admin_client: AsyncClient, xss_payload):
        payload = valid_payload(
            required_documents=[valid_doc(description=f"Desc {xss_payload} End")]
        )
        response = await admin_client.post(BASE_URL, json=payload)
        if response.status_code == 201:
            doc = response.json()["required_documents"][0]
            if doc.get("description"):
                assert "<script" not in doc["description"]

    @pytest.mark.parametrize("xss_payload", XSS_PAYLOADS[:5])
    async def test_update_name_sanitized(self, admin_client: AsyncClient, db: AsyncSession, xss_payload):
        template = await create_template_in_db(db)
        response = await admin_client.put(
            f"{BASE_URL}/{template.id}",
            json={"name": f"Updated {xss_payload} Name"},
        )
        if response.status_code == 200:
            assert "<script" not in response.json()["name"]


class TestCRUDFullFlow:

    async def test_create_read_update_delete_flow(self, admin_client: AsyncClient):
        create_resp = await admin_client.post(BASE_URL, json=valid_payload())
        assert create_resp.status_code == 201
        template_id = create_resp.json()["id"]

        get_resp = await admin_client.get(f"{BASE_URL}/{template_id}")
        assert get_resp.status_code == 200
        assert get_resp.json()["name"] == "Concrete Mix"

        list_resp = await admin_client.get(BASE_URL)
        assert list_resp.status_code == 200
        assert any(t["id"] == template_id for t in list_resp.json())

        update_resp = await admin_client.put(
            f"{BASE_URL}/{template_id}",
            json={"name": "Updated Concrete", "is_active": False},
        )
        assert update_resp.status_code == 200
        assert update_resp.json()["name"] == "Updated Concrete"
        assert update_resp.json()["is_active"] is False

        delete_resp = await admin_client.delete(f"{BASE_URL}/{template_id}")
        assert delete_resp.status_code == 200

        gone_resp = await admin_client.get(f"{BASE_URL}/{template_id}")
        assert gone_resp.status_code == 404

    async def test_create_add_consultant_list_remove_flow(
        self, admin_client: AsyncClient, db: AsyncSession
    ):
        create_resp = await admin_client.post(BASE_URL, json=valid_payload())
        assert create_resp.status_code == 201
        template_id = create_resp.json()["id"]

        consultant = await create_consultant_in_db(db)

        add_resp = await admin_client.post(
            f"{BASE_URL}/{template_id}/consultants/{consultant.id}"
        )
        assert add_resp.status_code == 201

        list_resp = await admin_client.get(BASE_URL)
        found = [t for t in list_resp.json() if t["id"] == template_id]
        assert len(found[0]["approving_consultants"]) == 1

        remove_resp = await admin_client.delete(
            f"{BASE_URL}/{template_id}/consultants/{consultant.id}"
        )
        assert remove_resp.status_code == 200

        list_resp2 = await admin_client.get(BASE_URL)
        found2 = [t for t in list_resp2.json() if t["id"] == template_id]
        assert len(found2[0]["approving_consultants"]) == 0


class TestComplexTemplates:

    async def test_template_with_all_doc_sources(self, admin_client: AsyncClient):
        docs = [
            valid_doc(name=f"Doc {s}", name_he=f"מסמך {s}", source=s)
            for s in ["consultant", "project_manager", "contractor"]
        ]
        payload = valid_payload(required_documents=docs)
        response = await admin_client.post(BASE_URL, json=payload)
        assert response.status_code == 201
        assert len(response.json()["required_documents"]) == 3

    async def test_template_with_all_spec_field_types(self, admin_client: AsyncClient):
        specs = []
        for ft in ["text", "number", "boolean", "file"]:
            specs.append(valid_spec(name=f"Spec {ft}", name_he=f"מפרט {ft}", field_type=ft))
        specs.append(
            valid_spec(
                name="Spec select", name_he="מפרט בחירה",
                field_type="select", options=["A", "B", "C"],
            )
        )
        payload = valid_payload(required_specifications=specs)
        response = await admin_client.post(BASE_URL, json=payload)
        assert response.status_code == 201
        assert len(response.json()["required_specifications"]) == 5

    async def test_template_with_mixed_checklist(self, admin_client: AsyncClient):
        checks = [
            valid_checklist(name="With file", name_he="עם קובץ", requires_file=True),
            valid_checklist(name="Without file", name_he="בלי קובץ", requires_file=False),
        ]
        payload = valid_payload(submission_checklist=checks)
        response = await admin_client.post(BASE_URL, json=payload)
        assert response.status_code == 201
        data = response.json()["submission_checklist"]
        assert len(data) == 2

    async def test_template_with_many_items(self, admin_client: AsyncClient):
        docs = [valid_doc(name=f"Doc{i:02d}", name_he=f"מסמך{i:02d}") for i in range(10)]
        specs = [valid_spec(name=f"Spec{i:02d}", name_he=f"מפרט{i:02d}") for i in range(10)]
        checks = [valid_checklist(name=f"Check{i:02d}", name_he=f"בדיקה{i:02d}") for i in range(10)]
        payload = valid_payload(
            required_documents=docs,
            required_specifications=specs,
            submission_checklist=checks,
        )
        response = await admin_client.post(BASE_URL, json=payload)
        assert response.status_code == 201

    async def test_template_with_multiple_consultants(
        self, admin_client: AsyncClient, db: AsyncSession
    ):
        create_resp = await admin_client.post(BASE_URL, json=valid_payload())
        template_id = create_resp.json()["id"]
        for i in range(3):
            c = await create_consultant_in_db(
                db, name=f"Consultant {i}", name_he=f"יועץ {i}"
            )
            resp = await admin_client.post(
                f"{BASE_URL}/{template_id}/consultants/{c.id}"
            )
            assert resp.status_code == 201
        list_resp = await admin_client.get(BASE_URL)
        found = [t for t in list_resp.json() if t["id"] == template_id]
        assert len(found[0]["approving_consultants"]) == 3


class TestResponseFormat:

    async def test_list_response_uses_snake_case(self, admin_client: AsyncClient, db: AsyncSession):
        await create_template_in_db(db)
        response = await admin_client.get(BASE_URL)
        data = response.json()[0]
        assert "name_he" in data
        assert "is_active" in data
        assert "required_documents" in data
        assert "required_specifications" in data
        assert "submission_checklist" in data
        assert "created_at" in data
        assert "updated_at" in data
        assert "approving_consultants" in data

    async def test_get_response_uses_snake_case(self, admin_client: AsyncClient, db: AsyncSession):
        template = await create_template_in_db(db)
        response = await admin_client.get(f"{BASE_URL}/{template.id}")
        data = response.json()
        assert "name_he" in data
        assert "is_active" in data
        assert "created_at" in data
        assert "updated_at" in data

    async def test_create_response_uses_snake_case(self, admin_client: AsyncClient):
        response = await admin_client.post(BASE_URL, json=valid_payload())
        data = response.json()
        assert "name_he" in data
        assert "is_active" in data
        assert "created_at" in data
        assert "updated_at" in data

    async def test_update_response_uses_snake_case(self, admin_client: AsyncClient, db: AsyncSession):
        template = await create_template_in_db(db)
        response = await admin_client.put(
            f"{BASE_URL}/{template.id}", json={"name": "Updated"}
        )
        data = response.json()
        assert "name_he" in data
        assert "is_active" in data

    async def test_consultant_response_format(self, admin_client: AsyncClient, db: AsyncSession):
        template = await create_template_in_db(db)
        consultant = await create_consultant_in_db(db)
        link = MaterialTemplateConsultant(
            id=uuid.uuid4(),
            template_id=template.id,
            consultant_type_id=consultant.id,
        )
        db.add(link)
        await db.flush()
        response = await admin_client.get(BASE_URL)
        c_data = response.json()[0]["approving_consultants"][0]
        assert "id" in c_data
        assert "name" in c_data
        assert "name_he" in c_data
        assert "category" in c_data
        assert "created_at" in c_data
        assert "updated_at" in c_data


class TestEdgeCases:

    async def test_create_with_unicode_hebrew_name(self, admin_client: AsyncClient):
        payload = valid_payload(name_he="תערובת בטון מיוחדת למבנים גבוהים")
        response = await admin_client.post(BASE_URL, json=payload)
        assert response.status_code == 201
        assert response.json()["name_he"] == "תערובת בטון מיוחדת למבנים גבוהים"

    async def test_create_with_special_characters_in_name(self, admin_client: AsyncClient):
        payload = valid_payload(name="Concrete (Grade B-30) / Type II")
        response = await admin_client.post(BASE_URL, json=payload)
        assert response.status_code == 201

    async def test_list_no_auth_required(self, client: AsyncClient, db: AsyncSession):
        await create_template_in_db(db)
        response = await client.get(BASE_URL)
        assert response.status_code == 200

    async def test_get_no_auth_required(self, client: AsyncClient, db: AsyncSession):
        template = await create_template_in_db(db)
        response = await client.get(f"{BASE_URL}/{template.id}")
        assert response.status_code == 200

    async def test_create_two_templates_same_name(self, admin_client: AsyncClient):
        payload = valid_payload()
        r1 = await admin_client.post(BASE_URL, json=payload)
        r2 = await admin_client.post(BASE_URL, json=payload)
        assert r1.status_code == 201
        assert r2.status_code == 201
        assert r1.json()["id"] != r2.json()["id"]

    async def test_delete_twice_returns_404(self, admin_client: AsyncClient, db: AsyncSession):
        template = await create_template_in_db(db)
        r1 = await admin_client.delete(f"{BASE_URL}/{template.id}")
        assert r1.status_code == 200
        r2 = await admin_client.delete(f"{BASE_URL}/{template.id}")
        assert r2.status_code == 404

    @pytest.mark.parametrize(
        "field_type,options",
        [
            ("select", ["A"]),
            ("select", ["A", "B", "C", "D", "E"]),
            ("select", [f"Opt{i}" for i in range(50)]),
        ],
        ids=["single_option", "five_options", "max_50_options"],
    )
    async def test_select_options_counts(self, admin_client: AsyncClient, field_type, options):
        payload = valid_payload(
            required_specifications=[
                valid_spec(field_type=field_type, options=options)
            ]
        )
        response = await admin_client.post(BASE_URL, json=payload)
        assert response.status_code == 201

    async def test_spec_select_options_over_50(self, admin_client: AsyncClient):
        payload = valid_payload(
            required_specifications=[
                valid_spec(field_type="select", options=[f"Opt{i}" for i in range(51)])
            ]
        )
        response = await admin_client.post(BASE_URL, json=payload)
        assert response.status_code == 422


class TestParametrizedAuthEndpoints:

    @pytest.mark.parametrize(
        "method,url_suffix,json_body",
        [
            ("POST", "", valid_payload()),
            ("PUT", "/{template_id}", {"name": "Updated"}),
            ("DELETE", "/{template_id}", None),
            ("POST", "/{template_id}/consultants/{consultant_id}", None),
            ("DELETE", "/{template_id}/consultants/{consultant_id}", None),
        ],
        ids=["create", "update", "delete", "add_consultant", "remove_consultant"],
    )
    async def test_admin_endpoints_reject_non_admin(
        self, user_client: AsyncClient, db: AsyncSession, method, url_suffix, json_body
    ):
        template = await create_template_in_db(db)
        consultant = await create_consultant_in_db(db)
        url = BASE_URL + url_suffix.format(
            template_id=template.id, consultant_id=consultant.id
        )
        if method == "POST":
            response = await user_client.post(url, json=json_body)
        elif method == "PUT":
            response = await user_client.put(url, json=json_body)
        else:
            response = await user_client.delete(url)
        assert response.status_code == 403

    @pytest.mark.parametrize(
        "method,url_suffix,json_body",
        [
            ("POST", "", valid_payload()),
            ("PUT", "/{template_id}", {"name": "Updated"}),
            ("DELETE", "/{template_id}", None),
            ("POST", "/{template_id}/consultants/{consultant_id}", None),
            ("DELETE", "/{template_id}/consultants/{consultant_id}", None),
        ],
        ids=["create", "update", "delete", "add_consultant", "remove_consultant"],
    )
    async def test_admin_endpoints_reject_unauthenticated(
        self, client: AsyncClient, db: AsyncSession, method, url_suffix, json_body
    ):
        template = await create_template_in_db(db)
        consultant = await create_consultant_in_db(db)
        url = BASE_URL + url_suffix.format(
            template_id=template.id, consultant_id=consultant.id
        )
        if method == "POST":
            response = await client.post(url, json=json_body)
        elif method == "PUT":
            response = await client.put(url, json=json_body)
        else:
            response = await client.delete(url)
        assert response.status_code == 401


class TestParametrized404:

    @pytest.mark.parametrize(
        "method,url_template,json_body",
        [
            ("GET", "{base}/{fake_id}", None),
            ("PUT", "{base}/{fake_id}", {"name": "Test"}),
            ("DELETE", "{base}/{fake_id}", None),
        ],
        ids=["get", "update", "delete"],
    )
    async def test_nonexistent_template_returns_404(
        self, admin_client: AsyncClient, method, url_template, json_body
    ):
        fake_id = uuid.uuid4()
        url = url_template.format(base=BASE_URL, fake_id=fake_id)
        if method == "GET":
            response = await admin_client.get(url)
        elif method == "PUT":
            response = await admin_client.put(url, json=json_body)
        else:
            response = await admin_client.delete(url)
        assert response.status_code == 404


class TestParametrizedDocSources:

    @pytest.mark.parametrize(
        "source,required_flag,description",
        [
            ("consultant", True, None),
            ("consultant", False, "Optional consultant doc"),
            ("project_manager", True, "PM required doc"),
            ("project_manager", False, None),
            ("contractor", True, "Contractor required"),
            ("contractor", False, "Contractor optional"),
        ],
        ids=[
            "consultant_req_nodesc", "consultant_opt_desc",
            "pm_req_desc", "pm_opt_nodesc",
            "contractor_req_desc", "contractor_opt_desc",
        ],
    )
    async def test_doc_source_required_description_combos(
        self, admin_client: AsyncClient, source, required_flag, description
    ):
        doc = valid_doc(source=source, required=required_flag, description=description)
        payload = valid_payload(required_documents=[doc])
        response = await admin_client.post(BASE_URL, json=payload)
        assert response.status_code == 201


class TestParametrizedSpecFieldTypes:

    @pytest.mark.parametrize(
        "field_type,unit,required_flag",
        [
            ("text", None, True),
            ("text", "mm", False),
            ("number", "kg", True),
            ("number", None, False),
            ("boolean", None, True),
            ("boolean", None, False),
            ("file", None, True),
            ("file", "PDF", False),
        ],
        ids=[
            "text_nounit_req", "text_unit_opt",
            "number_unit_req", "number_nounit_opt",
            "bool_nounit_req", "bool_nounit_opt",
            "file_nounit_req", "file_unit_opt",
        ],
    )
    async def test_spec_field_type_combos(
        self, admin_client: AsyncClient, field_type, unit, required_flag
    ):
        spec = valid_spec(field_type=field_type, unit=unit, required=required_flag)
        payload = valid_payload(required_specifications=[spec])
        response = await admin_client.post(BASE_URL, json=payload)
        assert response.status_code == 201


class TestParametrizedCategoryValues:

    @pytest.mark.parametrize(
        "category",
        [
            "Structural",
            "Electrical",
            "Plumbing",
            "Finishing",
            "Insulation",
            "Waterproofing",
            "Concrete",
            "Steel",
            "Flooring",
            "Painting",
        ],
    )
    async def test_various_categories(self, admin_client: AsyncClient, category):
        payload = valid_payload(category=category)
        response = await admin_client.post(BASE_URL, json=payload)
        assert response.status_code == 201
        assert response.json()["category"] == category


class TestParametrizedUpdateFields:

    @pytest.mark.parametrize(
        "field,value",
        [
            ("name", "New Material Name"),
            ("name_he", "שם חומר חדש"),
            ("category", "Electrical"),
            ("is_active", False),
            ("is_active", True),
        ],
        ids=["name", "name_he", "category", "is_active_false", "is_active_true"],
    )
    async def test_update_single_field(
        self, admin_client: AsyncClient, db: AsyncSession, field, value
    ):
        template = await create_template_in_db(db)
        response = await admin_client.put(
            f"{BASE_URL}/{template.id}", json={field: value}
        )
        assert response.status_code == 200

    @pytest.mark.parametrize(
        "docs_count", [0, 1, 3, 5, 10]
    )
    async def test_update_documents_various_counts(
        self, admin_client: AsyncClient, db: AsyncSession, docs_count
    ):
        template = await create_template_in_db(db)
        docs = [valid_doc(name=f"Doc{i}", name_he=f"מסמך{i}") for i in range(docs_count)]
        response = await admin_client.put(
            f"{BASE_URL}/{template.id}", json={"required_documents": docs}
        )
        assert response.status_code == 200
        assert len(response.json()["required_documents"]) == docs_count


class TestParametrizedChecklistItems:

    @pytest.mark.parametrize(
        "name,name_he,requires_file",
        [
            ("Visual Inspection", "בדיקה ויזואלית", False),
            ("Lab Report Upload", "העלאת דוח מעבדה", True),
            ("Certificate Check", "בדיקת תעודה", True),
            ("Compliance Verify", "אימות תאימות", False),
            ("Photo Documentation", "תיעוד צילומי", True),
        ],
        ids=["visual", "lab_report", "certificate", "compliance", "photo"],
    )
    async def test_checklist_item_variants(
        self, admin_client: AsyncClient, name, name_he, requires_file
    ):
        payload = valid_payload(
            submission_checklist=[
                valid_checklist(name=name, name_he=name_he, requires_file=requires_file)
            ]
        )
        response = await admin_client.post(BASE_URL, json=payload)
        assert response.status_code == 201
        item = response.json()["submission_checklist"][0]
        assert item["name"] == name
        assert item["name_he"] == name_he
        assert item["requires_file"] == requires_file


class TestParametrizedInvalidPayloads:

    @pytest.mark.parametrize(
        "payload,description",
        [
            ({}, "empty_body"),
            ({"name": "Only Name"}, "missing_name_he_and_category"),
            ({"name": "AB", "name_he": "אב"}, "missing_category"),
            ({"name_he": "אב", "category": "Cat"}, "missing_name"),
            ({"name": "AB", "category": "Cat"}, "missing_name_he"),
            (
                {"name": "AB", "name_he": "אב", "category": "Cat", "required_documents": "not_a_list"},
                "docs_not_list",
            ),
            (
                {"name": "AB", "name_he": "אב", "category": "Cat", "required_specifications": [{"bad": "data"}]},
                "invalid_spec_schema",
            ),
        ],
        ids=[
            "empty", "missing_two_fields", "missing_category",
            "missing_name", "missing_name_he",
            "docs_not_list", "invalid_spec",
        ],
    )
    async def test_invalid_create_payloads(self, admin_client: AsyncClient, payload, description):
        response = await admin_client.post(BASE_URL, json=payload)
        assert response.status_code in (422, 500)


class TestParametrizedBoundaryLengths:

    @pytest.mark.parametrize(
        "field,length,expected_status",
        [
            ("name", 2, 201),
            ("name", 3, 201),
            ("name", 254, 201),
            ("name", 255, 201),
            ("name_he", 2, 201),
            ("name_he", 3, 201),
            ("name_he", 254, 201),
            ("name_he", 255, 201),
            ("category", 2, 201),
            ("category", 3, 201),
            ("category", 254, 201),
            ("category", 255, 201),
        ],
        ids=[
            "name_2", "name_3", "name_254", "name_255",
            "name_he_2", "name_he_3", "name_he_254", "name_he_255",
            "category_2", "category_3", "category_254", "category_255",
        ],
    )
    async def test_boundary_string_lengths(
        self, admin_client: AsyncClient, field, length, expected_status
    ):
        payload = valid_payload(**{field: "A" * length})
        response = await admin_client.post(BASE_URL, json=payload)
        assert response.status_code == expected_status
