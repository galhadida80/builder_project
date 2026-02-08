import uuid
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.dialects.postgresql import JSONB, UUID as PG_UUID
from sqlalchemy.ext.compiler import compiles
from app.models.equipment_template import EquipmentTemplate
from app.models.equipment_submission import EquipmentSubmission
from app.models.user import User
from app.models.project import Project


@compiles(JSONB, "sqlite")
def compile_jsonb_sqlite(type_, compiler, **kw):
    return "JSON"


@compiles(PG_UUID, "sqlite")
def compile_uuid_sqlite(type_, compiler, **kw):
    return "VARCHAR(36)"

BASE_URL = "/api/v1/equipment-templates"

VALID_DOC = {
    "name": "Safety Certificate",
    "name_he": "תעודת בטיחות",
    "source": "consultant",
    "required": True,
}

VALID_SPEC_TEXT = {
    "name": "Weight Capacity",
    "name_he": "קיבולת משקל",
    "field_type": "text",
    "required": True,
}

VALID_SPEC_SELECT = {
    "name": "Color",
    "name_he": "צבע",
    "field_type": "select",
    "options": ["red", "blue", "green"],
    "required": True,
}

VALID_CHECKLIST = {
    "name": "Verify serial number",
    "name_he": "אמת מספר סידורי",
    "requires_file": False,
}

MINIMAL_TEMPLATE = {
    "name": "Crane Model X",
    "name_he": "מנוף דגם X",
    "category": "General",
}


def make_template_payload(**overrides):
    payload = {**MINIMAL_TEMPLATE}
    payload.update(overrides)
    return payload


async def create_template_via_db(db: AsyncSession, admin_user: User, **overrides):
    defaults = {
        "id": uuid.uuid4(),
        "name": "DB Template",
        "name_he": "תבנית DB",
        "category": "General",
    }
    defaults.update(overrides)
    template = EquipmentTemplate(**defaults)
    db.add(template)
    await db.flush()
    await db.refresh(template)
    return template


class TestListEquipmentTemplates:

    async def test_list_returns_empty_when_no_templates(self, admin_client: AsyncClient):
        response = await admin_client.get(BASE_URL)
        assert response.status_code == 200
        assert response.json() == []

    async def test_list_returns_templates(self, admin_client: AsyncClient, db: AsyncSession, admin_user: User):
        await create_template_via_db(db, admin_user, name="Template A", name_he="תבנית א")
        await create_template_via_db(db, admin_user, name="Template B", name_he="תבנית ב")
        response = await admin_client.get(BASE_URL)
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2

    async def test_list_includes_approving_consultants_field(self, admin_client: AsyncClient, db: AsyncSession, admin_user: User):
        await create_template_via_db(db, admin_user)
        response = await admin_client.get(BASE_URL)
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert "approving_consultants" in data[0]
        assert isinstance(data[0]["approving_consultants"], list)

    async def test_list_unauthenticated_allowed(self, client: AsyncClient, db: AsyncSession, admin_user: User):
        await create_template_via_db(db, admin_user)
        response = await client.get(BASE_URL)
        assert response.status_code == 200

    async def test_list_response_fields(self, admin_client: AsyncClient, db: AsyncSession, admin_user: User):
        await create_template_via_db(
            db, admin_user,
            name="Full Template",
            name_he="תבנית מלאה",
            category="Electrical",
            required_documents=[{"name": "Doc", "name_he": "מסמך", "source": "consultant", "required": True}],
        )
        response = await admin_client.get(BASE_URL)
        item = response.json()[0]
        assert "id" in item
        assert "name" in item
        assert "name_he" in item
        assert "category" in item
        assert "required_documents" in item
        assert "required_specifications" in item
        assert "submission_checklist" in item
        assert "created_at" in item
        assert "updated_at" in item


class TestCreateEquipmentTemplate:

    async def test_create_minimal_template(self, admin_client: AsyncClient):
        payload = make_template_payload()
        response = await admin_client.post(BASE_URL, json=payload)
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Crane Model X"
        assert data["name_he"] == "מנוף דגם X"
        assert "id" in data

    async def test_create_with_category(self, admin_client: AsyncClient):
        payload = make_template_payload(category="Heavy Machinery")
        response = await admin_client.post(BASE_URL, json=payload)
        assert response.status_code == 201
        assert response.json()["category"] == "Heavy Machinery"

    async def test_create_with_documents(self, admin_client: AsyncClient):
        payload = make_template_payload(required_documents=[VALID_DOC])
        response = await admin_client.post(BASE_URL, json=payload)
        assert response.status_code == 201
        assert len(response.json()["required_documents"]) == 1

    async def test_create_with_specifications(self, admin_client: AsyncClient):
        payload = make_template_payload(required_specifications=[VALID_SPEC_TEXT])
        response = await admin_client.post(BASE_URL, json=payload)
        assert response.status_code == 201
        assert len(response.json()["required_specifications"]) == 1

    async def test_create_with_checklist(self, admin_client: AsyncClient):
        payload = make_template_payload(submission_checklist=[VALID_CHECKLIST])
        response = await admin_client.post(BASE_URL, json=payload)
        assert response.status_code == 201
        assert len(response.json()["submission_checklist"]) == 1

    async def test_create_full_template(self, admin_client: AsyncClient):
        payload = make_template_payload(
            category="Electrical",
            required_documents=[VALID_DOC],
            required_specifications=[VALID_SPEC_TEXT, VALID_SPEC_SELECT],
            submission_checklist=[VALID_CHECKLIST],
        )
        response = await admin_client.post(BASE_URL, json=payload)
        assert response.status_code == 201
        data = response.json()
        assert len(data["required_documents"]) == 1
        assert len(data["required_specifications"]) == 2
        assert len(data["submission_checklist"]) == 1

    async def test_create_with_empty_lists(self, admin_client: AsyncClient):
        payload = make_template_payload(
            required_documents=[],
            required_specifications=[],
            submission_checklist=[],
        )
        response = await admin_client.post(BASE_URL, json=payload)
        assert response.status_code == 201
        data = response.json()
        assert data["required_documents"] == []
        assert data["required_specifications"] == []
        assert data["submission_checklist"] == []


class TestCreateAuthRequired:

    async def test_unauthenticated_create_returns_401(self, client: AsyncClient):
        payload = make_template_payload()
        response = await client.post(BASE_URL, json=payload)
        assert response.status_code == 401

    async def test_non_admin_create_returns_403(self, user_client: AsyncClient):
        payload = make_template_payload()
        response = await user_client.post(BASE_URL, json=payload)
        assert response.status_code == 403


class TestGetEquipmentTemplate:

    async def test_get_existing_template(self, admin_client: AsyncClient, db: AsyncSession, admin_user: User):
        template = await create_template_via_db(db, admin_user, name="Get Me", name_he="תמצא אותי")
        response = await admin_client.get(f"{BASE_URL}/{template.id}")
        assert response.status_code == 200
        assert response.json()["name"] == "Get Me"

    async def test_get_nonexistent_returns_404(self, admin_client: AsyncClient):
        fake_id = uuid.uuid4()
        response = await admin_client.get(f"{BASE_URL}/{fake_id}")
        assert response.status_code == 404

    async def test_get_unauthenticated_allowed(self, client: AsyncClient, db: AsyncSession, admin_user: User):
        template = await create_template_via_db(db, admin_user)
        response = await client.get(f"{BASE_URL}/{template.id}")
        assert response.status_code == 200

    async def test_get_response_has_all_fields(self, admin_client: AsyncClient, db: AsyncSession, admin_user: User):
        template = await create_template_via_db(
            db, admin_user,
            required_documents=[{"name": "D", "name_he": "ד", "source": "consultant", "required": True}],
            required_specifications=[],
            submission_checklist=[],
        )
        response = await admin_client.get(f"{BASE_URL}/{template.id}")
        data = response.json()
        for field in ["id", "name", "name_he", "category", "required_documents", "required_specifications", "submission_checklist", "created_at", "updated_at"]:
            assert field in data


class TestUpdateEquipmentTemplate:

    async def test_update_name(self, admin_client: AsyncClient, db: AsyncSession, admin_user: User):
        template = await create_template_via_db(db, admin_user)
        response = await admin_client.put(f"{BASE_URL}/{template.id}", json={"name": "Updated Name"})
        assert response.status_code == 200
        assert response.json()["name"] == "Updated Name"

    async def test_update_name_he(self, admin_client: AsyncClient, db: AsyncSession, admin_user: User):
        template = await create_template_via_db(db, admin_user)
        response = await admin_client.put(f"{BASE_URL}/{template.id}", json={"name_he": "שם מעודכן"})
        assert response.status_code == 200
        assert response.json()["name_he"] == "שם מעודכן"

    async def test_update_category(self, admin_client: AsyncClient, db: AsyncSession, admin_user: User):
        template = await create_template_via_db(db, admin_user)
        response = await admin_client.put(f"{BASE_URL}/{template.id}", json={"category": "New Category"})
        assert response.status_code == 200
        assert response.json()["category"] == "New Category"

    async def test_update_documents(self, admin_client: AsyncClient, db: AsyncSession, admin_user: User):
        template = await create_template_via_db(db, admin_user)
        response = await admin_client.put(
            f"{BASE_URL}/{template.id}",
            json={"required_documents": [VALID_DOC]},
        )
        assert response.status_code == 200
        assert len(response.json()["required_documents"]) == 1

    async def test_update_specifications(self, admin_client: AsyncClient, db: AsyncSession, admin_user: User):
        template = await create_template_via_db(db, admin_user)
        response = await admin_client.put(
            f"{BASE_URL}/{template.id}",
            json={"required_specifications": [VALID_SPEC_TEXT]},
        )
        assert response.status_code == 200
        assert len(response.json()["required_specifications"]) == 1

    async def test_update_checklist(self, admin_client: AsyncClient, db: AsyncSession, admin_user: User):
        template = await create_template_via_db(db, admin_user)
        response = await admin_client.put(
            f"{BASE_URL}/{template.id}",
            json={"submission_checklist": [VALID_CHECKLIST]},
        )
        assert response.status_code == 200
        assert len(response.json()["submission_checklist"]) == 1

    async def test_update_nonexistent_returns_404(self, admin_client: AsyncClient):
        response = await admin_client.put(f"{BASE_URL}/{uuid.uuid4()}", json={"name": "No"})
        assert response.status_code == 404

    async def test_update_unauthenticated_returns_401(self, client: AsyncClient, db: AsyncSession, admin_user: User):
        template = await create_template_via_db(db, admin_user)
        response = await client.put(f"{BASE_URL}/{template.id}", json={"name": "Nope"})
        assert response.status_code == 401

    async def test_update_non_admin_returns_403(self, user_client: AsyncClient, db: AsyncSession, admin_user: User):
        template = await create_template_via_db(db, admin_user)
        response = await user_client.put(f"{BASE_URL}/{template.id}", json={"name": "Nope"})
        assert response.status_code == 403

    async def test_partial_update_preserves_other_fields(self, admin_client: AsyncClient, db: AsyncSession, admin_user: User):
        template = await create_template_via_db(
            db, admin_user,
            name="Original",
            name_he="מקורי",
            category="Cat1",
        )
        response = await admin_client.put(f"{BASE_URL}/{template.id}", json={"name": "Changed"})
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Changed"
        assert data["name_he"] == "מקורי"
        assert data["category"] == "Cat1"


class TestDeleteEquipmentTemplate:

    async def test_delete_template(self, admin_client: AsyncClient, db: AsyncSession, admin_user: User):
        template = await create_template_via_db(db, admin_user)
        response = await admin_client.delete(f"{BASE_URL}/{template.id}")
        assert response.status_code == 200
        get_response = await admin_client.get(f"{BASE_URL}/{template.id}")
        assert get_response.status_code == 404

    async def test_delete_nonexistent_returns_404(self, admin_client: AsyncClient):
        response = await admin_client.delete(f"{BASE_URL}/{uuid.uuid4()}")
        assert response.status_code == 404

    async def test_delete_unauthenticated_returns_401(self, client: AsyncClient, db: AsyncSession, admin_user: User):
        template = await create_template_via_db(db, admin_user)
        response = await client.delete(f"{BASE_URL}/{template.id}")
        assert response.status_code == 401

    async def test_delete_non_admin_returns_403(self, user_client: AsyncClient, db: AsyncSession, admin_user: User):
        template = await create_template_via_db(db, admin_user)
        response = await user_client.delete(f"{BASE_URL}/{template.id}")
        assert response.status_code == 403

    async def test_delete_with_submissions_returns_400(
        self, admin_client: AsyncClient, db: AsyncSession, admin_user: User, project: Project
    ):
        template = await create_template_via_db(db, admin_user)
        submission = EquipmentSubmission(
            id=uuid.uuid4(),
            project_id=project.id,
            template_id=template.id,
            name="Test Submission",
            created_by_id=admin_user.id,
        )
        db.add(submission)
        await db.flush()
        response = await admin_client.delete(f"{BASE_URL}/{template.id}")
        assert response.status_code == 400
        assert "existing submissions" in response.json()["detail"].lower()


class TestNameValidation:

    @pytest.mark.parametrize(
        "field,value,expected_status",
        [
            ("name", "AB", 201),
            ("name", "A" * 255, 201),
            ("name", "Valid Crane", 201),
            ("name", "", 422),
            ("name", "A", 422),
            ("name", "A" * 256, 422),
            ("name_he", "AB", 201),
            ("name_he", "א" * 255, 201),
            ("name_he", "מנוף תקין", 201),
            ("name_he", "", 422),
            ("name_he", "א", 422),
            ("name_he", "א" * 256, 422),
        ],
        ids=[
            "name-2-chars-ok",
            "name-255-chars-ok",
            "name-normal-ok",
            "name-empty-fail",
            "name-1-char-fail",
            "name-256-chars-fail",
            "name_he-2-chars-ok",
            "name_he-255-chars-ok",
            "name_he-normal-ok",
            "name_he-empty-fail",
            "name_he-1-char-fail",
            "name_he-256-chars-fail",
        ],
    )
    async def test_name_field_validation(
        self, admin_client: AsyncClient, field: str, value: str, expected_status: int
    ):
        payload = make_template_payload(**{field: value})
        response = await admin_client.post(BASE_URL, json=payload)
        assert response.status_code == expected_status

    @pytest.mark.parametrize(
        "name,name_he,expected_status",
        [
            ("AB", "אב", 201),
            ("A" * 255, "א" * 255, 201),
            ("A", "אב", 422),
            ("AB", "א", 422),
            ("", "אב", 422),
            ("AB", "", 422),
        ],
        ids=[
            "both-min-ok",
            "both-max-ok",
            "name-too-short",
            "name_he-too-short",
            "name-empty",
            "name_he-empty",
        ],
    )
    async def test_name_combinations(
        self, admin_client: AsyncClient, name: str, name_he: str, expected_status: int
    ):
        payload = {"name": name, "name_he": name_he, "category": "General"}
        response = await admin_client.post(BASE_URL, json=payload)
        assert response.status_code == expected_status


class TestCategoryValidation:

    @pytest.mark.parametrize(
        "category,expected_status",
        [
            ("Electrical", 201),
            ("A" * 255, 201),
            ("AB", 201),
            ("A" * 256, 422),
        ],
        ids=[
            "valid-string-ok",
            "max-length-ok",
            "short-ok",
            "too-long-fail",
        ],
    )
    async def test_category_validation(self, admin_client: AsyncClient, category, expected_status: int):
        payload = make_template_payload(category=category)
        response = await admin_client.post(BASE_URL, json=payload)
        assert response.status_code == expected_status


class TestDocumentDefinitionValidation:

    @pytest.mark.parametrize(
        "source",
        ["consultant", "project_manager", "contractor"],
        ids=["source-consultant", "source-project_manager", "source-contractor"],
    )
    async def test_valid_source_types(self, admin_client: AsyncClient, source: str):
        doc = {**VALID_DOC, "source": source}
        payload = make_template_payload(required_documents=[doc])
        response = await admin_client.post(BASE_URL, json=payload)
        assert response.status_code == 201

    @pytest.mark.parametrize(
        "source",
        ["invalid", "admin", "owner", "CLIENT", ""],
        ids=["invalid-source", "admin-source", "owner-source", "uppercase-source", "empty-source"],
    )
    async def test_invalid_source_types(self, admin_client: AsyncClient, source: str):
        doc = {**VALID_DOC, "source": source}
        payload = make_template_payload(required_documents=[doc])
        response = await admin_client.post(BASE_URL, json=payload)
        assert response.status_code == 422

    @pytest.mark.parametrize(
        "required_val",
        [True, False],
        ids=["required-true", "required-false"],
    )
    async def test_required_field(self, admin_client: AsyncClient, required_val: bool):
        doc = {**VALID_DOC, "required": required_val}
        payload = make_template_payload(required_documents=[doc])
        response = await admin_client.post(BASE_URL, json=payload)
        assert response.status_code == 201

    @pytest.mark.parametrize(
        "doc_override,expected_status",
        [
            ({"name": "A", "name_he": "אב", "source": "consultant"}, 422),
            ({"name": "AB", "name_he": "א", "source": "consultant"}, 422),
            ({"name": "A" * 256, "name_he": "אב", "source": "consultant"}, 422),
            ({"name": "AB", "name_he": "א" * 256, "source": "consultant"}, 422),
            ({"name": "AB", "name_he": "אב", "source": "consultant", "description": "A" * 2001}, 422),
            ({"name": "AB", "name_he": "אב", "source": "consultant", "description": "Valid desc"}, 201),
            ({"name": "AB", "name_he": "אב", "source": "consultant", "description": None}, 201),
            ({"name": "AB", "name_he": "אב", "source": "consultant", "description": "A" * 2000}, 201),
        ],
        ids=[
            "doc-name-too-short",
            "doc-name_he-too-short",
            "doc-name-too-long",
            "doc-name_he-too-long",
            "doc-description-too-long",
            "doc-description-valid",
            "doc-description-null",
            "doc-description-max-length",
        ],
    )
    async def test_document_field_validation(
        self, admin_client: AsyncClient, doc_override: dict, expected_status: int
    ):
        payload = make_template_payload(required_documents=[doc_override])
        response = await admin_client.post(BASE_URL, json=payload)
        assert response.status_code == expected_status

    async def test_document_missing_name(self, admin_client: AsyncClient):
        doc = {"name_he": "אב", "source": "consultant"}
        payload = make_template_payload(required_documents=[doc])
        response = await admin_client.post(BASE_URL, json=payload)
        assert response.status_code == 422

    async def test_document_missing_name_he(self, admin_client: AsyncClient):
        doc = {"name": "AB", "source": "consultant"}
        payload = make_template_payload(required_documents=[doc])
        response = await admin_client.post(BASE_URL, json=payload)
        assert response.status_code == 422

    async def test_document_missing_source(self, admin_client: AsyncClient):
        doc = {"name": "AB", "name_he": "אב"}
        payload = make_template_payload(required_documents=[doc])
        response = await admin_client.post(BASE_URL, json=payload)
        assert response.status_code == 422

    async def test_multiple_documents(self, admin_client: AsyncClient):
        docs = [
            {**VALID_DOC, "name": f"Doc {i}", "name_he": f"מסמך {i}"}
            for i in range(5)
        ]
        payload = make_template_payload(required_documents=docs)
        response = await admin_client.post(BASE_URL, json=payload)
        assert response.status_code == 201
        assert len(response.json()["required_documents"]) == 5


class TestSpecificationDefinitionValidation:

    @pytest.mark.parametrize(
        "field_type",
        ["text", "number", "boolean", "file"],
        ids=["field-type-text", "field-type-number", "field-type-boolean", "field-type-file"],
    )
    async def test_valid_non_select_field_types(self, admin_client: AsyncClient, field_type: str):
        spec = {"name": "Spec", "name_he": "מפרט", "field_type": field_type}
        payload = make_template_payload(required_specifications=[spec])
        response = await admin_client.post(BASE_URL, json=payload)
        assert response.status_code == 201

    async def test_valid_select_field_type(self, admin_client: AsyncClient):
        payload = make_template_payload(required_specifications=[VALID_SPEC_SELECT])
        response = await admin_client.post(BASE_URL, json=payload)
        assert response.status_code == 201

    async def test_select_with_empty_options_fails(self, admin_client: AsyncClient):
        spec = {"name": "Spec", "name_he": "מפרט", "field_type": "select", "options": []}
        payload = make_template_payload(required_specifications=[spec])
        response = await admin_client.post(BASE_URL, json=payload)
        assert response.status_code == 422

    async def test_select_without_options_fails(self, admin_client: AsyncClient):
        spec = {"name": "Spec", "name_he": "מפרט", "field_type": "select"}
        payload = make_template_payload(required_specifications=[spec])
        response = await admin_client.post(BASE_URL, json=payload)
        assert response.status_code == 422

    async def test_select_with_too_many_options_fails(self, admin_client: AsyncClient):
        spec = {
            "name": "Spec",
            "name_he": "מפרט",
            "field_type": "select",
            "options": [f"opt{i}" for i in range(51)],
        }
        payload = make_template_payload(required_specifications=[spec])
        response = await admin_client.post(BASE_URL, json=payload)
        assert response.status_code == 422

    async def test_select_with_50_options_ok(self, admin_client: AsyncClient):
        spec = {
            "name": "Spec",
            "name_he": "מפרט",
            "field_type": "select",
            "options": [f"opt{i}" for i in range(50)],
        }
        payload = make_template_payload(required_specifications=[spec])
        response = await admin_client.post(BASE_URL, json=payload)
        assert response.status_code == 201

    @pytest.mark.parametrize(
        "field_type",
        ["text", "number", "boolean", "file"],
        ids=["text-with-options", "number-with-options", "boolean-with-options", "file-with-options"],
    )
    async def test_non_select_with_options_fails(self, admin_client: AsyncClient, field_type: str):
        spec = {
            "name": "Spec",
            "name_he": "מפרט",
            "field_type": field_type,
            "options": ["a", "b"],
        }
        payload = make_template_payload(required_specifications=[spec])
        response = await admin_client.post(BASE_URL, json=payload)
        assert response.status_code == 422

    @pytest.mark.parametrize(
        "field_type",
        ["invalid", "dropdown", "TEXT", "SELECT", ""],
        ids=["invalid-type", "dropdown-type", "uppercase-text", "uppercase-select", "empty-type"],
    )
    async def test_invalid_field_types(self, admin_client: AsyncClient, field_type: str):
        spec = {"name": "Spec", "name_he": "מפרט", "field_type": field_type}
        payload = make_template_payload(required_specifications=[spec])
        response = await admin_client.post(BASE_URL, json=payload)
        assert response.status_code == 422

    async def test_number_with_unit(self, admin_client: AsyncClient):
        spec = {"name": "Weight", "name_he": "משקל", "field_type": "number", "unit": "kg"}
        payload = make_template_payload(required_specifications=[spec])
        response = await admin_client.post(BASE_URL, json=payload)
        assert response.status_code == 201

    async def test_unit_too_long(self, admin_client: AsyncClient):
        spec = {"name": "Weight", "name_he": "משקל", "field_type": "number", "unit": "x" * 51}
        payload = make_template_payload(required_specifications=[spec])
        response = await admin_client.post(BASE_URL, json=payload)
        assert response.status_code == 422

    @pytest.mark.parametrize(
        "required_val",
        [True, False],
        ids=["spec-required-true", "spec-required-false"],
    )
    async def test_spec_required_field(self, admin_client: AsyncClient, required_val: bool):
        spec = {**VALID_SPEC_TEXT, "required": required_val}
        payload = make_template_payload(required_specifications=[spec])
        response = await admin_client.post(BASE_URL, json=payload)
        assert response.status_code == 201

    @pytest.mark.parametrize(
        "spec_override,expected_status",
        [
            ({"name": "A", "name_he": "אב", "field_type": "text"}, 422),
            ({"name": "AB", "name_he": "א", "field_type": "text"}, 422),
            ({"name": "A" * 256, "name_he": "אב", "field_type": "text"}, 422),
            ({"name": "AB", "name_he": "א" * 256, "field_type": "text"}, 422),
        ],
        ids=[
            "spec-name-too-short",
            "spec-name_he-too-short",
            "spec-name-too-long",
            "spec-name_he-too-long",
        ],
    )
    async def test_spec_name_validation(
        self, admin_client: AsyncClient, spec_override: dict, expected_status: int
    ):
        payload = make_template_payload(required_specifications=[spec_override])
        response = await admin_client.post(BASE_URL, json=payload)
        assert response.status_code == expected_status

    async def test_spec_missing_name(self, admin_client: AsyncClient):
        spec = {"name_he": "מפרט", "field_type": "text"}
        payload = make_template_payload(required_specifications=[spec])
        response = await admin_client.post(BASE_URL, json=payload)
        assert response.status_code == 422

    async def test_spec_missing_name_he(self, admin_client: AsyncClient):
        spec = {"name": "Spec", "field_type": "text"}
        payload = make_template_payload(required_specifications=[spec])
        response = await admin_client.post(BASE_URL, json=payload)
        assert response.status_code == 422

    async def test_spec_missing_field_type(self, admin_client: AsyncClient):
        spec = {"name": "Spec", "name_he": "מפרט"}
        payload = make_template_payload(required_specifications=[spec])
        response = await admin_client.post(BASE_URL, json=payload)
        assert response.status_code == 422

    async def test_multiple_specs(self, admin_client: AsyncClient):
        specs = [
            {"name": "Weight", "name_he": "משקל", "field_type": "number", "unit": "kg"},
            {"name": "Color", "name_he": "צבע", "field_type": "select", "options": ["red", "blue"]},
            {"name": "Active", "name_he": "פעיל", "field_type": "boolean"},
            {"name": "Cert", "name_he": "אישור", "field_type": "file"},
            {"name": "Notes", "name_he": "הערות", "field_type": "text"},
        ]
        payload = make_template_payload(required_specifications=specs)
        response = await admin_client.post(BASE_URL, json=payload)
        assert response.status_code == 201
        assert len(response.json()["required_specifications"]) == 5


class TestChecklistItemValidation:

    @pytest.mark.parametrize(
        "requires_file",
        [True, False],
        ids=["requires-file-true", "requires-file-false"],
    )
    async def test_requires_file_flag(self, admin_client: AsyncClient, requires_file: bool):
        item = {**VALID_CHECKLIST, "requires_file": requires_file}
        payload = make_template_payload(submission_checklist=[item])
        response = await admin_client.post(BASE_URL, json=payload)
        assert response.status_code == 201

    async def test_checklist_missing_name(self, admin_client: AsyncClient):
        item = {"name_he": "אב", "requires_file": False}
        payload = make_template_payload(submission_checklist=[item])
        response = await admin_client.post(BASE_URL, json=payload)
        assert response.status_code == 422

    async def test_checklist_missing_name_he(self, admin_client: AsyncClient):
        item = {"name": "AB", "requires_file": False}
        payload = make_template_payload(submission_checklist=[item])
        response = await admin_client.post(BASE_URL, json=payload)
        assert response.status_code == 422

    @pytest.mark.parametrize(
        "checklist_override,expected_status",
        [
            ({"name": "A", "name_he": "אב"}, 422),
            ({"name": "AB", "name_he": "א"}, 422),
            ({"name": "A" * 256, "name_he": "אב"}, 422),
            ({"name": "AB", "name_he": "א" * 256}, 422),
            ({"name": "AB", "name_he": "אב"}, 201),
            ({"name": "A" * 255, "name_he": "א" * 255}, 201),
        ],
        ids=[
            "checklist-name-too-short",
            "checklist-name_he-too-short",
            "checklist-name-too-long",
            "checklist-name_he-too-long",
            "checklist-min-length-ok",
            "checklist-max-length-ok",
        ],
    )
    async def test_checklist_name_validation(
        self, admin_client: AsyncClient, checklist_override: dict, expected_status: int
    ):
        payload = make_template_payload(submission_checklist=[checklist_override])
        response = await admin_client.post(BASE_URL, json=payload)
        assert response.status_code == expected_status

    async def test_multiple_checklist_items(self, admin_client: AsyncClient):
        items = [
            {"name": f"Item {i}", "name_he": f"פריט {i}", "requires_file": i % 2 == 0}
            for i in range(10)
        ]
        payload = make_template_payload(submission_checklist=items)
        response = await admin_client.post(BASE_URL, json=payload)
        assert response.status_code == 201
        assert len(response.json()["submission_checklist"]) == 10


class TestXSSSanitization:

    @pytest.mark.parametrize(
        "field,xss_value",
        [
            ("name", '<script>alert("xss")</script>Safe Name'),
            ("name", 'javascript:alert("xss")'),
            ("name", '<img src=x onerror=alert("xss")>Clean'),
            ("name", '<iframe src="evil.com"></iframe>Name'),
            ("name_he", '<script>alert("xss")</script>שם בטוח'),
            ("name_he", '<svg onload=alert("xss")></svg>שם'),
            ("category", '<script>alert("xss")</script>Category'),
            ("category", '<style>body{display:none}</style>Cat'),
            ("description", '<script>alert("xss")</script>Desc'),
            ("description", '<object data="evil.swf"></object>Desc'),
            ("description", '<embed src="evil.swf">Desc'),
            ("description", '<link rel="stylesheet" href="evil.css">Desc'),
            ("description", '<meta http-equiv="refresh" content="0;url=evil.com">Desc'),
        ],
        ids=[
            "name-script-tag",
            "name-javascript-proto",
            "name-img-onerror",
            "name-iframe",
            "name_he-script-tag",
            "name_he-svg-onload",
            "category-script-tag",
            "category-style-tag",
            "description-script-tag",
            "description-object-tag",
            "description-embed-tag",
            "description-link-tag",
            "description-meta-tag",
        ],
    )
    async def test_xss_in_template_fields(self, admin_client: AsyncClient, field: str, xss_value: str):
        payload = make_template_payload(**{field: xss_value})
        response = await admin_client.post(BASE_URL, json=payload)
        if response.status_code == 201:
            data = response.json()
            if data.get(field):
                assert "<script" not in data[field].lower()
                assert "javascript:" not in data[field].lower()
                assert "<iframe" not in data[field].lower()
                assert "<svg" not in data[field].lower()
                assert "<object" not in data[field].lower()
                assert "<embed" not in data[field].lower()
                assert "<link" not in data[field].lower()
                assert "<meta" not in data[field].lower()
                assert "<style" not in data[field].lower()

    @pytest.mark.parametrize(
        "xss_value",
        [
            '<script>alert("xss")</script>Doc Name',
            '<img src=x onerror=alert("xss")>Doc',
        ],
        ids=["doc-name-script", "doc-name-img-onerror"],
    )
    async def test_xss_in_document_names(self, admin_client: AsyncClient, xss_value: str):
        doc = {**VALID_DOC, "name": xss_value}
        payload = make_template_payload(required_documents=[doc])
        response = await admin_client.post(BASE_URL, json=payload)
        if response.status_code == 201:
            doc_data = response.json()["required_documents"][0]
            assert "<script" not in doc_data["name"].lower()
            assert "<img" not in doc_data["name"].lower()

    @pytest.mark.parametrize(
        "xss_value",
        [
            '<script>alert("xss")</script>Spec Name',
            '<iframe src="evil">Spec</iframe>',
        ],
        ids=["spec-name-script", "spec-name-iframe"],
    )
    async def test_xss_in_specification_names(self, admin_client: AsyncClient, xss_value: str):
        spec = {**VALID_SPEC_TEXT, "name": xss_value}
        payload = make_template_payload(required_specifications=[spec])
        response = await admin_client.post(BASE_URL, json=payload)
        if response.status_code == 201:
            spec_data = response.json()["required_specifications"][0]
            assert "<script" not in spec_data["name"].lower()
            assert "<iframe" not in spec_data["name"].lower()

    @pytest.mark.parametrize(
        "xss_value",
        [
            '<script>alert("xss")</script>Check',
            'onclick=alert("xss") Check',
        ],
        ids=["checklist-name-script", "checklist-name-onclick"],
    )
    async def test_xss_in_checklist_names(self, admin_client: AsyncClient, xss_value: str):
        item = {**VALID_CHECKLIST, "name": xss_value}
        payload = make_template_payload(submission_checklist=[item])
        response = await admin_client.post(BASE_URL, json=payload)
        if response.status_code == 201:
            check_data = response.json()["submission_checklist"][0]
            assert "<script" not in check_data["name"].lower()


class TestComplexTemplates:

    async def test_template_with_all_doc_sources(self, admin_client: AsyncClient):
        docs = [
            {"name": f"Doc {s}", "name_he": f"מסמך {s}", "source": s, "required": True}
            for s in ["consultant", "project_manager", "contractor"]
        ]
        payload = make_template_payload(required_documents=docs)
        response = await admin_client.post(BASE_URL, json=payload)
        assert response.status_code == 201
        assert len(response.json()["required_documents"]) == 3

    async def test_template_with_all_spec_types(self, admin_client: AsyncClient):
        specs = [
            {"name": "Text Spec", "name_he": "מפרט טקסט", "field_type": "text"},
            {"name": "Number Spec", "name_he": "מפרט מספר", "field_type": "number", "unit": "kg"},
            {"name": "Bool Spec", "name_he": "מפרט בול", "field_type": "boolean"},
            {"name": "Select Spec", "name_he": "מפרט בחירה", "field_type": "select", "options": ["a", "b"]},
            {"name": "File Spec", "name_he": "מפרט קובץ", "field_type": "file"},
        ]
        payload = make_template_payload(required_specifications=specs)
        response = await admin_client.post(BASE_URL, json=payload)
        assert response.status_code == 201
        assert len(response.json()["required_specifications"]) == 5

    async def test_template_with_mixed_checklist(self, admin_client: AsyncClient):
        items = [
            {"name": "No file needed", "name_he": "לא צריך קובץ", "requires_file": False},
            {"name": "File needed", "name_he": "צריך קובץ", "requires_file": True},
        ]
        payload = make_template_payload(submission_checklist=items)
        response = await admin_client.post(BASE_URL, json=payload)
        assert response.status_code == 201
        assert len(response.json()["submission_checklist"]) == 2

    async def test_full_complex_template(self, admin_client: AsyncClient):
        payload = make_template_payload(
            category="Complex Equipment",
            required_documents=[
                {"name": "Safety Cert", "name_he": "אישור בטיחות", "source": "consultant", "required": True, "description": "Safety certificate from consultant"},
                {"name": "Manual", "name_he": "מדריך", "source": "contractor", "required": False},
                {"name": "PM Approval", "name_he": "אישור מנהל", "source": "project_manager", "required": True},
            ],
            required_specifications=[
                {"name": "Weight", "name_he": "משקל", "field_type": "number", "unit": "kg", "required": True},
                {"name": "Color", "name_he": "צבע", "field_type": "select", "options": ["red", "blue", "green"], "required": True},
                {"name": "Active", "name_he": "פעיל", "field_type": "boolean", "required": False},
                {"name": "Notes", "name_he": "הערות", "field_type": "text", "required": False},
                {"name": "Certificate", "name_he": "תעודה", "field_type": "file", "required": True},
            ],
            submission_checklist=[
                {"name": "Verify model", "name_he": "אמת דגם", "requires_file": False},
                {"name": "Upload photo", "name_he": "העלה תמונה", "requires_file": True},
                {"name": "Sign form", "name_he": "חתום טופס", "requires_file": True},
            ],
        )
        response = await admin_client.post(BASE_URL, json=payload)
        assert response.status_code == 201
        data = response.json()
        assert len(data["required_documents"]) == 3
        assert len(data["required_specifications"]) == 5
        assert len(data["submission_checklist"]) == 3

    async def test_template_many_documents(self, admin_client: AsyncClient):
        docs = [
            {"name": f"Document {i:03d}", "name_he": f"מסמך {i:03d}", "source": "consultant", "required": True}
            for i in range(20)
        ]
        payload = make_template_payload(required_documents=docs)
        response = await admin_client.post(BASE_URL, json=payload)
        assert response.status_code == 201
        assert len(response.json()["required_documents"]) == 20

    async def test_template_many_specifications(self, admin_client: AsyncClient):
        specs = [
            {"name": f"Spec {i:03d}", "name_he": f"מפרט {i:03d}", "field_type": "text"}
            for i in range(20)
        ]
        payload = make_template_payload(required_specifications=specs)
        response = await admin_client.post(BASE_URL, json=payload)
        assert response.status_code == 201
        assert len(response.json()["required_specifications"]) == 20

    async def test_template_many_checklist_items(self, admin_client: AsyncClient):
        items = [
            {"name": f"Check {i:03d}", "name_he": f"בדיקה {i:03d}", "requires_file": i % 2 == 0}
            for i in range(20)
        ]
        payload = make_template_payload(submission_checklist=items)
        response = await admin_client.post(BASE_URL, json=payload)
        assert response.status_code == 201
        assert len(response.json()["submission_checklist"]) == 20


class TestUpdateValidation:

    @pytest.mark.parametrize(
        "field,value,expected_status",
        [
            ("name", "AB", 200),
            ("name", "A" * 255, 200),
            ("name", "A", 422),
            ("name", "", 422),
            ("name", "A" * 256, 422),
            ("name_he", "אב", 200),
            ("name_he", "א" * 255, 200),
            ("name_he", "א", 422),
            ("name_he", "", 422),
            ("name_he", "א" * 256, 422),
            ("category", "Valid", 200),
            ("category", "A" * 255, 200),
            ("category", "A" * 256, 422),
        ],
        ids=[
            "update-name-min-ok",
            "update-name-max-ok",
            "update-name-too-short",
            "update-name-empty",
            "update-name-too-long",
            "update-name_he-min-ok",
            "update-name_he-max-ok",
            "update-name_he-too-short",
            "update-name_he-empty",
            "update-name_he-too-long",
            "update-category-valid",
            "update-category-max-ok",
            "update-category-too-long",
        ],
    )
    async def test_update_field_validation(
        self, admin_client: AsyncClient, db: AsyncSession, admin_user: User,
        field: str, value: str, expected_status: int
    ):
        template = await create_template_via_db(db, admin_user)
        response = await admin_client.put(f"{BASE_URL}/{template.id}", json={field: value})
        assert response.status_code == expected_status

    async def test_update_with_invalid_documents(self, admin_client: AsyncClient, db: AsyncSession, admin_user: User):
        template = await create_template_via_db(db, admin_user)
        bad_doc = {"name": "A", "name_he": "אב", "source": "consultant"}
        response = await admin_client.put(
            f"{BASE_URL}/{template.id}",
            json={"required_documents": [bad_doc]},
        )
        assert response.status_code == 422

    async def test_update_with_invalid_specs(self, admin_client: AsyncClient, db: AsyncSession, admin_user: User):
        template = await create_template_via_db(db, admin_user)
        bad_spec = {"name": "Spec", "name_he": "מפרט", "field_type": "select"}
        response = await admin_client.put(
            f"{BASE_URL}/{template.id}",
            json={"required_specifications": [bad_spec]},
        )
        assert response.status_code == 422

    async def test_update_with_invalid_checklist(self, admin_client: AsyncClient, db: AsyncSession, admin_user: User):
        template = await create_template_via_db(db, admin_user)
        bad_item = {"name": "A"}
        response = await admin_client.put(
            f"{BASE_URL}/{template.id}",
            json={"submission_checklist": [bad_item]},
        )
        assert response.status_code == 422

    async def test_update_documents_to_empty(self, admin_client: AsyncClient, db: AsyncSession, admin_user: User):
        template = await create_template_via_db(
            db, admin_user,
            required_documents=[{"name": "D", "name_he": "ד", "source": "consultant", "required": True}],
        )
        response = await admin_client.put(
            f"{BASE_URL}/{template.id}",
            json={"required_documents": []},
        )
        assert response.status_code == 200
        assert response.json()["required_documents"] == []

    async def test_update_specs_to_empty(self, admin_client: AsyncClient, db: AsyncSession, admin_user: User):
        template = await create_template_via_db(
            db, admin_user,
            required_specifications=[{"name": "S", "name_he": "ס", "field_type": "text"}],
        )
        response = await admin_client.put(
            f"{BASE_URL}/{template.id}",
            json={"required_specifications": []},
        )
        assert response.status_code == 200
        assert response.json()["required_specifications"] == []

    async def test_update_xss_in_name(self, admin_client: AsyncClient, db: AsyncSession, admin_user: User):
        template = await create_template_via_db(db, admin_user)
        response = await admin_client.put(
            f"{BASE_URL}/{template.id}",
            json={"name": '<script>alert("xss")</script>Updated'},
        )
        if response.status_code == 200:
            assert "<script" not in response.json()["name"].lower()


class TestCRUDFlow:

    async def test_create_read_update_delete_flow(self, admin_client: AsyncClient):
        payload = make_template_payload(category="Flow Test")
        create_resp = await admin_client.post(BASE_URL, json=payload)
        assert create_resp.status_code == 201
        template_id = create_resp.json()["id"]

        get_resp = await admin_client.get(f"{BASE_URL}/{template_id}")
        assert get_resp.status_code == 200
        assert get_resp.json()["name"] == "Crane Model X"

        list_resp = await admin_client.get(BASE_URL)
        assert list_resp.status_code == 200
        assert any(t["id"] == template_id for t in list_resp.json())

        update_resp = await admin_client.put(
            f"{BASE_URL}/{template_id}",
            json={"name": "Updated Crane", "category": "Updated Category"},
        )
        assert update_resp.status_code == 200
        assert update_resp.json()["name"] == "Updated Crane"

        delete_resp = await admin_client.delete(f"{BASE_URL}/{template_id}")
        assert delete_resp.status_code == 200

        get_after_delete = await admin_client.get(f"{BASE_URL}/{template_id}")
        assert get_after_delete.status_code == 404


class TestMissingRequiredFields:

    @pytest.mark.parametrize(
        "payload,description",
        [
            ({}, "empty-payload"),
            ({"name": "Only Name"}, "missing-name_he"),
            ({"name_he": "רק שם"}, "missing-name"),
        ],
        ids=["empty-payload", "missing-name_he", "missing-name"],
    )
    async def test_missing_required_fields(self, admin_client: AsyncClient, payload: dict, description: str):
        response = await admin_client.post(BASE_URL, json=payload)
        assert response.status_code == 422


class TestSelectOptionsEdgeCases:

    @pytest.mark.parametrize(
        "options,expected_status",
        [
            (["single"], 201),
            (["a", "b"], 201),
            ([f"opt{i}" for i in range(50)], 201),
            ([f"opt{i}" for i in range(51)], 422),
            ([], 422),
            (None, 422),
        ],
        ids=[
            "single-option",
            "two-options",
            "50-options-ok",
            "51-options-fail",
            "empty-options-fail",
            "null-options-fail",
        ],
    )
    async def test_select_options_count(self, admin_client: AsyncClient, options, expected_status: int):
        spec = {"name": "Select", "name_he": "בחירה", "field_type": "select"}
        if options is not None:
            spec["options"] = options
        payload = make_template_payload(required_specifications=[spec])
        response = await admin_client.post(BASE_URL, json=payload)
        assert response.status_code == expected_status


class TestDescriptionField:

    @pytest.mark.parametrize(
        "description,expected_status",
        [
            (None, 201),
            ("Valid description", 201),
            ("A" * 2000, 201),
            ("A" * 2001, 422),
            ("", 201),
        ],
        ids=[
            "description-null",
            "description-valid",
            "description-max-ok",
            "description-too-long",
            "description-empty",
        ],
    )
    async def test_description_validation(self, admin_client: AsyncClient, description, expected_status: int):
        payload = make_template_payload(description=description)
        response = await admin_client.post(BASE_URL, json=payload)
        assert response.status_code == expected_status


class TestNonExistentTemplate:

    @pytest.mark.parametrize(
        "method",
        ["GET", "PUT", "DELETE"],
        ids=["get-404", "put-404", "delete-404"],
    )
    async def test_nonexistent_template_returns_404(self, admin_client: AsyncClient, method: str):
        fake_id = uuid.uuid4()
        url = f"{BASE_URL}/{fake_id}"
        if method == "GET":
            response = await admin_client.get(url)
        elif method == "PUT":
            response = await admin_client.put(url, json={"name": "Test"})
        else:
            response = await admin_client.delete(url)
        assert response.status_code == 404


class TestDocumentDefinitionParametrized:

    @pytest.mark.parametrize(
        "doc,expected_status",
        [
            ({"name": "AB", "name_he": "אב", "source": "consultant", "required": True}, 201),
            ({"name": "AB", "name_he": "אב", "source": "consultant", "required": False}, 201),
            ({"name": "AB", "name_he": "אב", "source": "project_manager", "required": True}, 201),
            ({"name": "AB", "name_he": "אב", "source": "contractor", "required": True}, 201),
            ({"name": "AB", "name_he": "אב", "source": "consultant", "description": "Desc"}, 201),
            ({"name": "AB", "name_he": "אב", "source": "consultant", "description": "A" * 2000}, 201),
            ({"name": "AB", "name_he": "אב", "source": "consultant", "description": "A" * 2001}, 422),
            ({"name": "A", "name_he": "אב", "source": "consultant"}, 422),
            ({"name": "AB", "name_he": "א", "source": "consultant"}, 422),
            ({"name": "A" * 256, "name_he": "אב", "source": "consultant"}, 422),
            ({"name": "AB", "name_he": "א" * 256, "source": "consultant"}, 422),
            ({"name": "AB", "name_he": "אב", "source": "invalid"}, 422),
            ({"name_he": "אב", "source": "consultant"}, 422),
            ({"name": "AB", "source": "consultant"}, 422),
            ({"name": "AB", "name_he": "אב"}, 422),
        ],
        ids=[
            "full-valid-required-true",
            "full-valid-required-false",
            "source-pm",
            "source-contractor",
            "with-short-desc",
            "with-max-desc",
            "desc-too-long",
            "name-too-short",
            "name_he-too-short",
            "name-too-long",
            "name_he-too-long",
            "invalid-source",
            "missing-name",
            "missing-name_he",
            "missing-source",
        ],
    )
    async def test_document_definition_combinations(
        self, admin_client: AsyncClient, doc: dict, expected_status: int
    ):
        payload = make_template_payload(required_documents=[doc])
        response = await admin_client.post(BASE_URL, json=payload)
        assert response.status_code == expected_status


class TestSpecificationDefinitionParametrized:

    @pytest.mark.parametrize(
        "spec,expected_status",
        [
            ({"name": "SP", "name_he": "מפ", "field_type": "text"}, 201),
            ({"name": "SP", "name_he": "מפ", "field_type": "number"}, 201),
            ({"name": "SP", "name_he": "מפ", "field_type": "boolean"}, 201),
            ({"name": "SP", "name_he": "מפ", "field_type": "file"}, 201),
            ({"name": "SP", "name_he": "מפ", "field_type": "select", "options": ["a"]}, 201),
            ({"name": "SP", "name_he": "מפ", "field_type": "select", "options": ["a", "b", "c"]}, 201),
            ({"name": "SP", "name_he": "מפ", "field_type": "number", "unit": "kg"}, 201),
            ({"name": "SP", "name_he": "מפ", "field_type": "number", "unit": "x" * 50}, 201),
            ({"name": "SP", "name_he": "מפ", "field_type": "text", "required": True}, 201),
            ({"name": "SP", "name_he": "מפ", "field_type": "text", "required": False}, 201),
            ({"name": "SP", "name_he": "מפ", "field_type": "select", "options": []}, 422),
            ({"name": "SP", "name_he": "מפ", "field_type": "select"}, 422),
            ({"name": "SP", "name_he": "מפ", "field_type": "text", "options": ["a"]}, 422),
            ({"name": "SP", "name_he": "מפ", "field_type": "number", "options": ["a"]}, 422),
            ({"name": "SP", "name_he": "מפ", "field_type": "boolean", "options": ["a"]}, 422),
            ({"name": "SP", "name_he": "מפ", "field_type": "file", "options": ["a"]}, 422),
            ({"name": "SP", "name_he": "מפ", "field_type": "number", "unit": "x" * 51}, 422),
            ({"name": "SP", "name_he": "מפ", "field_type": "invalid"}, 422),
            ({"name": "S", "name_he": "מפ", "field_type": "text"}, 422),
            ({"name": "SP", "name_he": "מ", "field_type": "text"}, 422),
            ({"name": "A" * 256, "name_he": "מפ", "field_type": "text"}, 422),
            ({"name": "SP", "name_he": "א" * 256, "field_type": "text"}, 422),
            ({"name_he": "מפ", "field_type": "text"}, 422),
            ({"name": "SP", "field_type": "text"}, 422),
            ({"name": "SP", "name_he": "מפ"}, 422),
            ({"name": "SP", "name_he": "מפ", "field_type": "select", "options": [f"o{i}" for i in range(51)]}, 422),
        ],
        ids=[
            "text-valid",
            "number-valid",
            "boolean-valid",
            "file-valid",
            "select-single-option",
            "select-multiple-options",
            "number-with-unit",
            "number-unit-max-50",
            "text-required-true",
            "text-required-false",
            "select-empty-options",
            "select-no-options",
            "text-with-options-fail",
            "number-with-options-fail",
            "boolean-with-options-fail",
            "file-with-options-fail",
            "unit-too-long",
            "invalid-field-type",
            "name-too-short",
            "name_he-too-short",
            "name-too-long",
            "name_he-too-long",
            "missing-name",
            "missing-name_he",
            "missing-field-type",
            "select-51-options-fail",
        ],
    )
    async def test_specification_definition_combinations(
        self, admin_client: AsyncClient, spec: dict, expected_status: int
    ):
        payload = make_template_payload(required_specifications=[spec])
        response = await admin_client.post(BASE_URL, json=payload)
        assert response.status_code == expected_status


class TestChecklistItemParametrized:

    @pytest.mark.parametrize(
        "item,expected_status",
        [
            ({"name": "AB", "name_he": "אב"}, 201),
            ({"name": "AB", "name_he": "אב", "requires_file": True}, 201),
            ({"name": "AB", "name_he": "אב", "requires_file": False}, 201),
            ({"name": "A" * 255, "name_he": "א" * 255}, 201),
            ({"name": "A" * 255, "name_he": "א" * 255, "requires_file": True}, 201),
            ({"name": "A", "name_he": "אב"}, 422),
            ({"name": "AB", "name_he": "א"}, 422),
            ({"name": "A" * 256, "name_he": "אב"}, 422),
            ({"name": "AB", "name_he": "א" * 256}, 422),
            ({"name_he": "אב"}, 422),
            ({"name": "AB"}, 422),
            ({}, 422),
        ],
        ids=[
            "valid-minimal",
            "valid-requires-file-true",
            "valid-requires-file-false",
            "valid-max-length",
            "valid-max-length-with-file",
            "name-too-short",
            "name_he-too-short",
            "name-too-long",
            "name_he-too-long",
            "missing-name",
            "missing-name_he",
            "empty-object",
        ],
    )
    async def test_checklist_item_combinations(
        self, admin_client: AsyncClient, item: dict, expected_status: int
    ):
        payload = make_template_payload(submission_checklist=[item])
        response = await admin_client.post(BASE_URL, json=payload)
        assert response.status_code == expected_status


class TestAuthParametrized:

    @pytest.mark.parametrize(
        "method,path_suffix,body",
        [
            ("POST", "", {"name": "Test", "name_he": "טסט"}),
            ("PUT", "/{template_id}", {"name": "Test"}),
            ("DELETE", "/{template_id}", None),
        ],
        ids=["create-401", "update-401", "delete-401"],
    )
    async def test_unauthenticated_admin_endpoints(
        self, client: AsyncClient, db: AsyncSession, admin_user: User,
        method: str, path_suffix: str, body
    ):
        template = await create_template_via_db(db, admin_user)
        url = BASE_URL + path_suffix.replace("{template_id}", str(template.id))
        if method == "POST":
            response = await client.post(url, json=body)
        elif method == "PUT":
            response = await client.put(url, json=body)
        else:
            response = await client.delete(url)
        assert response.status_code == 401

    @pytest.mark.parametrize(
        "method,path_suffix,body",
        [
            ("POST", "", {"name": "Test", "name_he": "טסט"}),
            ("PUT", "/{template_id}", {"name": "Test"}),
            ("DELETE", "/{template_id}", None),
        ],
        ids=["create-403", "update-403", "delete-403"],
    )
    async def test_non_admin_admin_endpoints(
        self, user_client: AsyncClient, db: AsyncSession, admin_user: User,
        method: str, path_suffix: str, body
    ):
        template = await create_template_via_db(db, admin_user)
        url = BASE_URL + path_suffix.replace("{template_id}", str(template.id))
        if method == "POST":
            response = await user_client.post(url, json=body)
        elif method == "PUT":
            response = await user_client.put(url, json=body)
        else:
            response = await user_client.delete(url)
        assert response.status_code == 403


class TestDeleteProtectionParametrized:

    @pytest.mark.parametrize(
        "submission_name",
        [
            "Submission Alpha",
            "Submission Beta",
            "Submission Gamma",
        ],
        ids=["submission-alpha", "submission-beta", "submission-gamma"],
    )
    async def test_cannot_delete_template_with_any_submission(
        self, admin_client: AsyncClient, db: AsyncSession, admin_user: User,
        project: Project, submission_name: str
    ):
        template = await create_template_via_db(db, admin_user)
        submission = EquipmentSubmission(
            id=uuid.uuid4(),
            project_id=project.id,
            template_id=template.id,
            name=submission_name,
            created_by_id=admin_user.id,
        )
        db.add(submission)
        await db.flush()
        response = await admin_client.delete(f"{BASE_URL}/{template.id}")
        assert response.status_code == 400


class TestUpdateWithComplexData:

    @pytest.mark.parametrize(
        "update_field,update_value",
        [
            ("required_documents", [{"name": "New Doc", "name_he": "מסמך חדש", "source": "consultant", "required": True}]),
            ("required_documents", [{"name": "Doc A", "name_he": "מסמך א", "source": "project_manager", "required": False}, {"name": "Doc B", "name_he": "מסמך ב", "source": "contractor", "required": True}]),
            ("required_specifications", [{"name": "New Spec", "name_he": "מפרט חדש", "field_type": "text"}]),
            ("required_specifications", [{"name": "Select", "name_he": "בחירה", "field_type": "select", "options": ["x", "y"]}]),
            ("submission_checklist", [{"name": "New Check", "name_he": "בדיקה חדשה", "requires_file": True}]),
            ("submission_checklist", [{"name": "C1", "name_he": "ב1"}, {"name": "C2", "name_he": "ב2", "requires_file": True}]),
        ],
        ids=[
            "update-single-doc",
            "update-multiple-docs",
            "update-text-spec",
            "update-select-spec",
            "update-single-checklist",
            "update-multiple-checklist",
        ],
    )
    async def test_update_complex_fields(
        self, admin_client: AsyncClient, db: AsyncSession, admin_user: User,
        update_field: str, update_value
    ):
        template = await create_template_via_db(db, admin_user)
        response = await admin_client.put(
            f"{BASE_URL}/{template.id}",
            json={update_field: update_value},
        )
        assert response.status_code == 200
        assert len(response.json()[update_field]) == len(update_value)


class TestEdgeCases:

    async def test_create_template_with_unicode_names(self, admin_client: AsyncClient):
        payload = make_template_payload(
            name="Equipment with special chars: e-acute",
            name_he="ציוד עם תווים מיוחדים",
        )
        response = await admin_client.post(BASE_URL, json=payload)
        assert response.status_code == 201

    async def test_create_template_with_whitespace_names(self, admin_client: AsyncClient):
        payload = make_template_payload(
            name="  Trimmed Name  ",
            name_he="  שם מקוצר  ",
        )
        response = await admin_client.post(BASE_URL, json=payload)
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Trimmed Name"
        assert data["name_he"] == "שם מקוצר"

    async def test_list_ordering_by_created_at_desc(self, admin_client: AsyncClient, db: AsyncSession, admin_user: User):
        t1 = await create_template_via_db(db, admin_user, name="First", name_he="ראשון")
        t2 = await create_template_via_db(db, admin_user, name="Second", name_he="שני")
        response = await admin_client.get(BASE_URL)
        data = response.json()
        assert len(data) == 2
        ids = [item["id"] for item in data]
        assert ids[0] == str(t2.id)
        assert ids[1] == str(t1.id)

    async def test_invalid_uuid_returns_422(self, admin_client: AsyncClient):
        response = await admin_client.get(f"{BASE_URL}/not-a-uuid")
        assert response.status_code == 422

    async def test_delete_returns_message(self, admin_client: AsyncClient, db: AsyncSession, admin_user: User):
        template = await create_template_via_db(db, admin_user)
        response = await admin_client.delete(f"{BASE_URL}/{template.id}")
        assert response.status_code == 200
        assert "message" in response.json()

    async def test_create_multiple_templates(self, admin_client: AsyncClient):
        for i in range(5):
            payload = make_template_payload(name=f"Template {i}", name_he=f"תבנית {i}")
            response = await admin_client.post(BASE_URL, json=payload)
            assert response.status_code == 201
        list_resp = await admin_client.get(BASE_URL)
        assert len(list_resp.json()) == 5


class TestUpdateNameParametrized:

    @pytest.mark.parametrize(
        "update_payload,expected_status",
        [
            ({"name": "Valid Update"}, 200),
            ({"name_he": "עדכון תקין"}, 200),
            ({"name": "Valid", "name_he": "תקין"}, 200),
            ({"category": "New Cat"}, 200),
            ({"name": "V", "name_he": "ת"}, 422),
            ({"required_documents": [{"name": "Doc", "name_he": "מס", "source": "consultant"}]}, 200),
            ({"required_specifications": [{"name": "SP", "name_he": "מפ", "field_type": "text"}]}, 200),
            ({"submission_checklist": [{"name": "C", "name_he": "ב"}]}, 422),
        ],
        ids=[
            "update-name-only",
            "update-name_he-only",
            "update-both-names",
            "update-category-only",
            "update-both-names-too-short",
            "update-documents",
            "update-specifications",
            "update-checklist-name-too-short",
        ],
    )
    async def test_update_variations(
        self, admin_client: AsyncClient, db: AsyncSession, admin_user: User,
        update_payload: dict, expected_status: int
    ):
        template = await create_template_via_db(db, admin_user)
        response = await admin_client.put(
            f"{BASE_URL}/{template.id}",
            json=update_payload,
        )
        assert response.status_code == expected_status


class TestXSSInNestedFields:

    @pytest.mark.parametrize(
        "nested_type,field_name,xss_value",
        [
            ("doc", "name", '<script>alert(1)</script>Name'),
            ("doc", "name_he", '<script>alert(1)</script>שם'),
            ("doc", "description", '<script>alert(1)</script>Description'),
            ("spec", "name", '<script>alert(1)</script>Spec'),
            ("spec", "name_he", '<script>alert(1)</script>מפרט'),
            ("spec", "unit", '<script>alert(1)</script>kg'),
            ("checklist", "name", '<script>alert(1)</script>Check'),
            ("checklist", "name_he", '<script>alert(1)</script>בדיקה'),
        ],
        ids=[
            "doc-name-xss",
            "doc-name_he-xss",
            "doc-description-xss",
            "spec-name-xss",
            "spec-name_he-xss",
            "spec-unit-xss",
            "checklist-name-xss",
            "checklist-name_he-xss",
        ],
    )
    async def test_xss_in_nested_definitions(
        self, admin_client: AsyncClient, nested_type: str, field_name: str, xss_value: str
    ):
        if nested_type == "doc":
            item = {**VALID_DOC, field_name: xss_value}
            payload = make_template_payload(required_documents=[item])
        elif nested_type == "spec":
            item = {**VALID_SPEC_TEXT, field_name: xss_value}
            payload = make_template_payload(required_specifications=[item])
        else:
            item = {**VALID_CHECKLIST, field_name: xss_value}
            payload = make_template_payload(submission_checklist=[item])

        response = await admin_client.post(BASE_URL, json=payload)
        if response.status_code == 201:
            data = response.json()
            if nested_type == "doc":
                val = data["required_documents"][0].get(field_name, "")
            elif nested_type == "spec":
                val = data["required_specifications"][0].get(field_name, "")
            else:
                val = data["submission_checklist"][0].get(field_name, "")
            if val:
                assert "<script" not in val.lower()


class TestSelectOptionsXSS:

    @pytest.mark.parametrize(
        "option_value",
        [
            '<script>alert(1)</script>opt',
            'javascript:void(0)',
            '<img src=x onerror=alert(1)>',
        ],
        ids=["script-in-option", "javascript-proto-in-option", "img-onerror-in-option"],
    )
    async def test_xss_in_select_options(self, admin_client: AsyncClient, option_value: str):
        spec = {
            "name": "Color",
            "name_he": "צבע",
            "field_type": "select",
            "options": [option_value, "safe"],
        }
        payload = make_template_payload(required_specifications=[spec])
        response = await admin_client.post(BASE_URL, json=payload)
        if response.status_code == 201:
            opts = response.json()["required_specifications"][0]["options"]
            for opt in opts:
                assert "<script" not in opt.lower()
                assert "<img" not in opt.lower()


class TestBulkCreateAndList:

    @pytest.mark.parametrize(
        "count",
        [1, 3, 5, 10],
        ids=["create-1", "create-3", "create-5", "create-10"],
    )
    async def test_create_and_list_multiple(self, admin_client: AsyncClient, count: int):
        for i in range(count):
            payload = make_template_payload(name=f"Bulk {i}", name_he=f"בכמות {i}")
            resp = await admin_client.post(BASE_URL, json=payload)
            assert resp.status_code == 201
        list_resp = await admin_client.get(BASE_URL)
        assert len(list_resp.json()) == count


class TestFieldTypeAndOptionsCross:

    @pytest.mark.parametrize(
        "field_type,options,expected_status",
        [
            ("text", None, 201),
            ("number", None, 201),
            ("boolean", None, 201),
            ("file", None, 201),
            ("select", ["a"], 201),
            ("select", ["a", "b", "c"], 201),
            ("text", ["a"], 422),
            ("number", ["a"], 422),
            ("boolean", ["a"], 422),
            ("file", ["a"], 422),
            ("select", [], 422),
            ("select", None, 422),
        ],
        ids=[
            "text-no-options",
            "number-no-options",
            "boolean-no-options",
            "file-no-options",
            "select-one-option",
            "select-three-options",
            "text-with-options",
            "number-with-options",
            "boolean-with-options",
            "file-with-options",
            "select-empty-options",
            "select-null-options",
        ],
    )
    async def test_field_type_options_matrix(
        self, admin_client: AsyncClient, field_type: str, options, expected_status: int
    ):
        spec = {"name": "Spec", "name_he": "מפרט", "field_type": field_type}
        if options is not None:
            spec["options"] = options
        payload = make_template_payload(required_specifications=[spec])
        response = await admin_client.post(BASE_URL, json=payload)
        assert response.status_code == expected_status
