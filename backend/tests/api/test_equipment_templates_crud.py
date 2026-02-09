import uuid
from datetime import datetime

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.equipment_template import EquipmentTemplate, ConsultantType, EquipmentTemplateConsultant
from app.models.equipment_submission import EquipmentSubmission
from app.models.user import User
from app.models.project import Project


API_V1 = "/api/v1"
TEMPLATES_URL = f"{API_V1}/equipment-templates"
FAKE_TEMPLATE_ID = str(uuid.uuid4())


def template_detail_url(template_id: str) -> str:
    return f"{TEMPLATES_URL}/{template_id}"


def valid_template_payload(**overrides) -> dict:
    base = {
        "name": "Tower Crane",
        "name_he": "מנוף צריח",
        "category": "Heavy Machinery",
    }
    base.update(overrides)
    return base


async def create_template_in_db(db: AsyncSession, **overrides) -> EquipmentTemplate:
    data = {
        "id": uuid.uuid4(),
        "name": "DB Template",
        "name_he": "תבנית DB",
        "category": "General",
    }
    data.update(overrides)
    template = EquipmentTemplate(**data)
    db.add(template)
    await db.flush()
    await db.refresh(template)
    return template


async def create_consultant_type_in_db(db: AsyncSession, **overrides) -> ConsultantType:
    data = {
        "id": uuid.uuid4(),
        "name": "Structural Engineer",
        "name_he": "מהנדס מבנים",
        "category": "engineering",
    }
    data.update(overrides)
    ct = ConsultantType(**data)
    db.add(ct)
    await db.flush()
    await db.refresh(ct)
    return ct


class TestListEquipmentTemplates:

    async def test_list_empty(self, client: AsyncClient):
        resp = await client.get(TEMPLATES_URL)
        assert resp.status_code == 200
        assert resp.json() == []

    async def test_list_returns_all_templates(self, client: AsyncClient, db: AsyncSession):
        await create_template_in_db(db, name="Template A", name_he="תבנית א")
        await create_template_in_db(db, name="Template B", name_he="תבנית ב")
        await db.commit()
        resp = await client.get(TEMPLATES_URL)
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 2

    async def test_list_ordered_by_created_at_desc(self, client: AsyncClient, db: AsyncSession):
        t1 = await create_template_in_db(db, name="Older Template", name_he="ישן")
        t2 = await create_template_in_db(db, name="Newer Template", name_he="חדש")
        await db.commit()
        resp = await client.get(TEMPLATES_URL)
        data = resp.json()
        assert data[0]["name"] == "Newer Template"

    async def test_list_response_contains_required_fields(self, client: AsyncClient, db: AsyncSession):
        await create_template_in_db(db)
        await db.commit()
        resp = await client.get(TEMPLATES_URL)
        data = resp.json()
        item = data[0]
        assert "id" in item
        assert "name" in item
        assert "name_he" in item
        assert "category" in item
        assert "created_at" in item
        assert "updated_at" in item

    async def test_list_includes_approving_consultants_field(self, client: AsyncClient, db: AsyncSession):
        await create_template_in_db(db)
        await db.commit()
        resp = await client.get(TEMPLATES_URL)
        data = resp.json()
        assert "approving_consultants" in data[0]
        assert isinstance(data[0]["approving_consultants"], list)

    async def test_list_with_consultant_types(self, client: AsyncClient, db: AsyncSession):
        tpl = await create_template_in_db(db)
        ct = await create_consultant_type_in_db(db)
        link = EquipmentTemplateConsultant(
            id=uuid.uuid4(), template_id=tpl.id, consultant_type_id=ct.id
        )
        db.add(link)
        await db.commit()
        resp = await client.get(TEMPLATES_URL)
        data = resp.json()
        consultants = data[0]["approving_consultants"]
        assert len(consultants) == 1
        assert consultants[0]["name"] == ct.name

    async def test_list_multiple_consultants(self, client: AsyncClient, db: AsyncSession):
        tpl = await create_template_in_db(db)
        ct1 = await create_consultant_type_in_db(db, name="Engineer A", name_he="מהנדס א")
        ct2 = await create_consultant_type_in_db(db, name="Engineer B", name_he="מהנדס ב")
        db.add(EquipmentTemplateConsultant(id=uuid.uuid4(), template_id=tpl.id, consultant_type_id=ct1.id))
        db.add(EquipmentTemplateConsultant(id=uuid.uuid4(), template_id=tpl.id, consultant_type_id=ct2.id))
        await db.commit()
        resp = await client.get(TEMPLATES_URL)
        data = resp.json()
        assert len(data[0]["approving_consultants"]) == 2

    async def test_list_no_auth_required(self, client: AsyncClient, db: AsyncSession):
        await create_template_in_db(db)
        await db.commit()
        resp = await client.get(TEMPLATES_URL)
        assert resp.status_code == 200

    async def test_list_returns_json_array(self, client: AsyncClient):
        resp = await client.get(TEMPLATES_URL)
        assert isinstance(resp.json(), list)

    async def test_list_content_type_json(self, client: AsyncClient):
        resp = await client.get(TEMPLATES_URL)
        assert "application/json" in resp.headers["content-type"]


class TestGetEquipmentTemplate:

    async def test_get_existing_template(self, client: AsyncClient, db: AsyncSession):
        tpl = await create_template_in_db(db, name="Specific Template", name_he="תבנית ספציפית")
        await db.commit()
        resp = await client.get(template_detail_url(str(tpl.id)))
        assert resp.status_code == 200
        data = resp.json()
        assert data["name"] == "Specific Template"

    async def test_get_template_not_found(self, client: AsyncClient):
        resp = await client.get(template_detail_url(FAKE_TEMPLATE_ID))
        assert resp.status_code == 404

    async def test_get_template_404_message(self, client: AsyncClient):
        resp = await client.get(template_detail_url(FAKE_TEMPLATE_ID))
        assert "not found" in resp.json()["detail"].lower()

    async def test_get_template_invalid_uuid(self, client: AsyncClient):
        resp = await client.get(template_detail_url("not-a-uuid"))
        assert resp.status_code == 422

    async def test_get_template_response_fields(self, client: AsyncClient, db: AsyncSession):
        tpl = await create_template_in_db(db, description="Some description")
        await db.commit()
        resp = await client.get(template_detail_url(str(tpl.id)))
        data = resp.json()
        assert data["id"] == str(tpl.id)
        assert data["name"] == tpl.name
        assert data["name_he"] == tpl.name_he
        assert data["category"] == tpl.category

    async def test_get_template_with_required_documents(self, client: AsyncClient, db: AsyncSession):
        docs = [{"name": "Doc A", "name_he": "מסמך א", "source": "consultant", "required": True}]
        tpl = await create_template_in_db(db, required_documents=docs)
        await db.commit()
        resp = await client.get(template_detail_url(str(tpl.id)))
        data = resp.json()
        assert len(data["required_documents"]) == 1

    async def test_get_template_with_specifications(self, client: AsyncClient, db: AsyncSession):
        specs = [{"name": "Weight", "name_he": "משקל", "field_type": "number", "required": True}]
        tpl = await create_template_in_db(db, required_specifications=specs)
        await db.commit()
        resp = await client.get(template_detail_url(str(tpl.id)))
        data = resp.json()
        assert len(data["required_specifications"]) == 1

    async def test_get_template_with_checklist(self, client: AsyncClient, db: AsyncSession):
        checklist = [{"name": "Check item", "name_he": "פריט בדיקה", "requires_file": False}]
        tpl = await create_template_in_db(db, submission_checklist=checklist)
        await db.commit()
        resp = await client.get(template_detail_url(str(tpl.id)))
        data = resp.json()
        assert len(data["submission_checklist"]) == 1

    async def test_get_template_empty_lists_default(self, client: AsyncClient, db: AsyncSession):
        tpl = await create_template_in_db(db)
        await db.commit()
        resp = await client.get(template_detail_url(str(tpl.id)))
        data = resp.json()
        assert data["required_documents"] == []
        assert data["required_specifications"] == []
        assert data["submission_checklist"] == []

    async def test_get_template_no_auth_required(self, client: AsyncClient, db: AsyncSession):
        tpl = await create_template_in_db(db)
        await db.commit()
        resp = await client.get(template_detail_url(str(tpl.id)))
        assert resp.status_code == 200


class TestCreateEquipmentTemplate:

    async def test_create_success(self, admin_client: AsyncClient):
        payload = valid_template_payload()
        resp = await admin_client.post(TEMPLATES_URL, json=payload)
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "Tower Crane"
        assert "id" in data

    async def test_create_returns_all_fields(self, admin_client: AsyncClient):
        payload = valid_template_payload()
        resp = await admin_client.post(TEMPLATES_URL, json=payload)
        data = resp.json()
        assert "id" in data
        assert "name" in data
        assert "name_he" in data
        assert "category" in data
        assert "created_at" in data
        assert "updated_at" in data

    async def test_create_with_description(self, admin_client: AsyncClient):
        payload = valid_template_payload(description="Full crane description")
        resp = await admin_client.post(TEMPLATES_URL, json=payload)
        assert resp.status_code == 201

    async def test_create_with_documents(self, admin_client: AsyncClient):
        docs = [{"name": "Safety Cert", "name_he": "תעודת בטיחות", "source": "consultant", "required": True}]
        payload = valid_template_payload(required_documents=docs)
        resp = await admin_client.post(TEMPLATES_URL, json=payload)
        assert resp.status_code == 201

    async def test_create_with_specifications(self, admin_client: AsyncClient):
        specs = [{"name": "Load Capacity", "name_he": "כושר העמסה", "field_type": "number", "required": True}]
        payload = valid_template_payload(required_specifications=specs)
        resp = await admin_client.post(TEMPLATES_URL, json=payload)
        assert resp.status_code == 201

    async def test_create_with_checklist(self, admin_client: AsyncClient):
        checklist = [{"name": "Inspect cables", "name_he": "בדיקת כבלים", "requires_file": True}]
        payload = valid_template_payload(submission_checklist=checklist)
        resp = await admin_client.post(TEMPLATES_URL, json=payload)
        assert resp.status_code == 201

    async def test_create_missing_name(self, admin_client: AsyncClient):
        payload = {"name_he": "תבנית", "category": "General"}
        resp = await admin_client.post(TEMPLATES_URL, json=payload)
        assert resp.status_code == 422

    async def test_create_missing_name_he(self, admin_client: AsyncClient):
        payload = {"name": "Template", "category": "General"}
        resp = await admin_client.post(TEMPLATES_URL, json=payload)
        assert resp.status_code == 422

    async def test_create_empty_name(self, admin_client: AsyncClient):
        payload = valid_template_payload(name="")
        resp = await admin_client.post(TEMPLATES_URL, json=payload)
        assert resp.status_code == 422

    async def test_create_empty_body(self, admin_client: AsyncClient):
        resp = await admin_client.post(TEMPLATES_URL, json={})
        assert resp.status_code == 422

    async def test_create_requires_admin(self, user_client: AsyncClient):
        payload = valid_template_payload()
        resp = await user_client.post(TEMPLATES_URL, json=payload)
        assert resp.status_code == 403

    async def test_create_unauthenticated(self, client: AsyncClient):
        payload = valid_template_payload()
        resp = await client.post(TEMPLATES_URL, json=payload)
        assert resp.status_code in [401, 403]

    async def test_create_multiple_templates(self, admin_client: AsyncClient):
        resp1 = await admin_client.post(TEMPLATES_URL, json=valid_template_payload(name="T1", name_he="ת1"))
        resp2 = await admin_client.post(TEMPLATES_URL, json=valid_template_payload(name="T2", name_he="ת2"))
        assert resp1.status_code == 201
        assert resp2.status_code == 201
        assert resp1.json()["id"] != resp2.json()["id"]

    async def test_create_generates_uuid(self, admin_client: AsyncClient):
        resp = await admin_client.post(TEMPLATES_URL, json=valid_template_payload())
        data = resp.json()
        uuid.UUID(data["id"])

    async def test_create_sets_timestamps(self, admin_client: AsyncClient):
        resp = await admin_client.post(TEMPLATES_URL, json=valid_template_payload())
        data = resp.json()
        assert data["created_at"] is not None
        assert data["updated_at"] is not None

    async def test_create_with_all_optional_fields(self, admin_client: AsyncClient):
        payload = valid_template_payload(
            description="Full description",
            required_documents=[],
            required_specifications=[],
            submission_checklist=[]
        )
        resp = await admin_client.post(TEMPLATES_URL, json=payload)
        assert resp.status_code == 201

    async def test_create_spec_select_requires_options(self, admin_client: AsyncClient):
        specs = [{"name": "Color", "name_he": "צבע", "field_type": "select", "required": True}]
        payload = valid_template_payload(required_specifications=specs)
        resp = await admin_client.post(TEMPLATES_URL, json=payload)
        assert resp.status_code == 422

    async def test_create_spec_select_with_options(self, admin_client: AsyncClient):
        specs = [{"name": "Color", "name_he": "צבע", "field_type": "select", "options": ["Red", "Blue"], "required": True}]
        payload = valid_template_payload(required_specifications=specs)
        resp = await admin_client.post(TEMPLATES_URL, json=payload)
        assert resp.status_code == 201

    async def test_create_spec_text_with_options_fails(self, admin_client: AsyncClient):
        specs = [{"name": "Note", "name_he": "הערה", "field_type": "text", "options": ["A"], "required": True}]
        payload = valid_template_payload(required_specifications=specs)
        resp = await admin_client.post(TEMPLATES_URL, json=payload)
        assert resp.status_code == 422


class TestUpdateEquipmentTemplate:

    async def test_update_name(self, admin_client: AsyncClient, db: AsyncSession):
        tpl = await create_template_in_db(db)
        await db.commit()
        resp = await admin_client.put(
            template_detail_url(str(tpl.id)),
            json={"name": "Updated Name"}
        )
        assert resp.status_code == 200
        assert resp.json()["name"] == "Updated Name"

    async def test_update_name_he(self, admin_client: AsyncClient, db: AsyncSession):
        tpl = await create_template_in_db(db)
        await db.commit()
        resp = await admin_client.put(
            template_detail_url(str(tpl.id)),
            json={"name_he": "שם חדש"}
        )
        assert resp.status_code == 200
        assert resp.json()["name_he"] == "שם חדש"

    async def test_update_category(self, admin_client: AsyncClient, db: AsyncSession):
        tpl = await create_template_in_db(db)
        await db.commit()
        resp = await admin_client.put(
            template_detail_url(str(tpl.id)),
            json={"category": "Updated Category"}
        )
        assert resp.status_code == 200
        assert resp.json()["category"] == "Updated Category"

    async def test_update_not_found(self, admin_client: AsyncClient):
        resp = await admin_client.put(
            template_detail_url(FAKE_TEMPLATE_ID),
            json={"name": "Updated"}
        )
        assert resp.status_code == 404

    async def test_update_requires_admin(self, user_client: AsyncClient, db: AsyncSession):
        tpl = await create_template_in_db(db)
        await db.commit()
        resp = await user_client.put(
            template_detail_url(str(tpl.id)),
            json={"name": "Hack"}
        )
        assert resp.status_code == 403

    async def test_update_partial_fields(self, admin_client: AsyncClient, db: AsyncSession):
        tpl = await create_template_in_db(db, name="Original", name_he="מקורי")
        await db.commit()
        resp = await admin_client.put(
            template_detail_url(str(tpl.id)),
            json={"name": "Changed"}
        )
        data = resp.json()
        assert data["name"] == "Changed"
        assert data["name_he"] == "מקורי"

    async def test_update_with_required_documents(self, admin_client: AsyncClient, db: AsyncSession):
        tpl = await create_template_in_db(db)
        await db.commit()
        docs = [{"name": "New Doc", "name_he": "מסמך חדש", "source": "contractor", "required": True}]
        resp = await admin_client.put(
            template_detail_url(str(tpl.id)),
            json={"required_documents": docs}
        )
        assert resp.status_code == 200

    async def test_update_empty_name_fails(self, admin_client: AsyncClient, db: AsyncSession):
        tpl = await create_template_in_db(db)
        await db.commit()
        resp = await admin_client.put(
            template_detail_url(str(tpl.id)),
            json={"name": ""}
        )
        assert resp.status_code == 422

    async def test_update_preserves_id(self, admin_client: AsyncClient, db: AsyncSession):
        tpl = await create_template_in_db(db)
        await db.commit()
        resp = await admin_client.put(
            template_detail_url(str(tpl.id)),
            json={"name": "Updated"}
        )
        assert resp.json()["id"] == str(tpl.id)

    async def test_update_unauthenticated(self, client: AsyncClient, db: AsyncSession):
        tpl = await create_template_in_db(db)
        await db.commit()
        resp = await client.put(
            template_detail_url(str(tpl.id)),
            json={"name": "Updated"}
        )
        assert resp.status_code in [401, 403]


class TestDeleteEquipmentTemplate:

    async def test_delete_success(self, admin_client: AsyncClient, db: AsyncSession):
        tpl = await create_template_in_db(db)
        await db.commit()
        resp = await admin_client.delete(template_detail_url(str(tpl.id)))
        assert resp.status_code == 200
        assert "deleted" in resp.json()["message"].lower()

    async def test_delete_not_found(self, admin_client: AsyncClient):
        resp = await admin_client.delete(template_detail_url(FAKE_TEMPLATE_ID))
        assert resp.status_code == 404

    async def test_delete_requires_admin(self, user_client: AsyncClient, db: AsyncSession):
        tpl = await create_template_in_db(db)
        await db.commit()
        resp = await user_client.delete(template_detail_url(str(tpl.id)))
        assert resp.status_code == 403

    async def test_delete_actually_removes(self, admin_client: AsyncClient, client: AsyncClient, db: AsyncSession):
        tpl = await create_template_in_db(db)
        await db.commit()
        await admin_client.delete(template_detail_url(str(tpl.id)))
        resp = await client.get(template_detail_url(str(tpl.id)))
        assert resp.status_code == 404

    async def test_delete_with_submission_fails(
        self, admin_client: AsyncClient, db: AsyncSession, project: Project, regular_user: User
    ):
        tpl = await create_template_in_db(db)
        submission = EquipmentSubmission(
            id=uuid.uuid4(),
            project_id=project.id,
            template_id=tpl.id,
            name="Test submission",
            status="draft",
            created_by_id=regular_user.id,
        )
        db.add(submission)
        await db.commit()
        resp = await admin_client.delete(template_detail_url(str(tpl.id)))
        assert resp.status_code == 400
        assert "submissions" in resp.json()["detail"].lower()

    async def test_delete_unauthenticated(self, client: AsyncClient, db: AsyncSession):
        tpl = await create_template_in_db(db)
        await db.commit()
        resp = await client.delete(template_detail_url(str(tpl.id)))
        assert resp.status_code in [401, 403]

    async def test_delete_invalid_uuid(self, admin_client: AsyncClient):
        resp = await admin_client.delete(template_detail_url("bad-uuid"))
        assert resp.status_code == 422


class TestEquipmentTemplateResponseFormat:

    async def test_id_is_valid_uuid(self, client: AsyncClient, db: AsyncSession):
        tpl = await create_template_in_db(db)
        await db.commit()
        resp = await client.get(template_detail_url(str(tpl.id)))
        uuid.UUID(resp.json()["id"])

    async def test_created_at_is_datetime_string(self, client: AsyncClient, db: AsyncSession):
        tpl = await create_template_in_db(db)
        await db.commit()
        resp = await client.get(template_detail_url(str(tpl.id)))
        datetime.fromisoformat(resp.json()["created_at"].replace("Z", "+00:00"))

    async def test_updated_at_is_datetime_string(self, client: AsyncClient, db: AsyncSession):
        tpl = await create_template_in_db(db)
        await db.commit()
        resp = await client.get(template_detail_url(str(tpl.id)))
        datetime.fromisoformat(resp.json()["updated_at"].replace("Z", "+00:00"))

    async def test_required_documents_is_list(self, client: AsyncClient, db: AsyncSession):
        tpl = await create_template_in_db(db)
        await db.commit()
        resp = await client.get(template_detail_url(str(tpl.id)))
        assert isinstance(resp.json()["required_documents"], list)

    async def test_required_specifications_is_list(self, client: AsyncClient, db: AsyncSession):
        tpl = await create_template_in_db(db)
        await db.commit()
        resp = await client.get(template_detail_url(str(tpl.id)))
        assert isinstance(resp.json()["required_specifications"], list)

    async def test_submission_checklist_is_list(self, client: AsyncClient, db: AsyncSession):
        tpl = await create_template_in_db(db)
        await db.commit()
        resp = await client.get(template_detail_url(str(tpl.id)))
        assert isinstance(resp.json()["submission_checklist"], list)

    async def test_category_string_value(self, client: AsyncClient, db: AsyncSession):
        tpl = await create_template_in_db(db, category="Special Category")
        await db.commit()
        resp = await client.get(template_detail_url(str(tpl.id)))
        assert resp.json()["category"] == "Special Category"

    async def test_list_response_consultant_type_fields(self, client: AsyncClient, db: AsyncSession):
        tpl = await create_template_in_db(db)
        ct = await create_consultant_type_in_db(db)
        db.add(EquipmentTemplateConsultant(id=uuid.uuid4(), template_id=tpl.id, consultant_type_id=ct.id))
        await db.commit()
        resp = await client.get(TEMPLATES_URL)
        consultant = resp.json()[0]["approving_consultants"][0]
        assert "id" in consultant
        assert "name" in consultant
        assert "name_he" in consultant
        assert "category" in consultant
        assert "created_at" in consultant
        assert "updated_at" in consultant


class TestEquipmentTemplateCategories:

    async def test_different_categories(self, client: AsyncClient, db: AsyncSession):
        await create_template_in_db(db, name="T1", name_he="ת1", category="Cranes")
        await create_template_in_db(db, name="T2", name_he="ת2", category="Excavators")
        await db.commit()
        resp = await client.get(TEMPLATES_URL)
        categories = [t["category"] for t in resp.json()]
        assert "Cranes" in categories
        assert "Excavators" in categories

    async def test_same_category_multiple_templates(self, client: AsyncClient, db: AsyncSession):
        await create_template_in_db(db, name="T1", name_he="ת1", category="General")
        await create_template_in_db(db, name="T2", name_he="ת2", category="General")
        await db.commit()
        resp = await client.get(TEMPLATES_URL)
        data = resp.json()
        assert len(data) == 2
        assert all(t["category"] == "General" for t in data)


class TestEquipmentTemplateEdgeCases:

    async def test_create_long_name(self, admin_client: AsyncClient):
        payload = valid_template_payload(name="A" * 200, name_he="א" * 200)
        resp = await admin_client.post(TEMPLATES_URL, json=payload)
        assert resp.status_code == 201

    async def test_create_unicode_name(self, admin_client: AsyncClient):
        payload = valid_template_payload(name="Grue a tour", name_he="מנוף צריח גדול")
        resp = await admin_client.post(TEMPLATES_URL, json=payload)
        assert resp.status_code == 201
        assert resp.json()["name_he"] == "מנוף צריח גדול"

    async def test_create_special_characters_in_description(self, admin_client: AsyncClient):
        payload = valid_template_payload(description="Notes: <brackets> & 'quotes' \"double\"")
        resp = await admin_client.post(TEMPLATES_URL, json=payload)
        assert resp.status_code == 201

    async def test_create_empty_lists(self, admin_client: AsyncClient):
        payload = valid_template_payload(
            required_documents=[],
            required_specifications=[],
            submission_checklist=[]
        )
        resp = await admin_client.post(TEMPLATES_URL, json=payload)
        assert resp.status_code == 201

    async def test_update_then_get_consistency(self, admin_client: AsyncClient, client: AsyncClient, db: AsyncSession):
        tpl = await create_template_in_db(db)
        await db.commit()
        await admin_client.put(
            template_detail_url(str(tpl.id)),
            json={"name": "Consistent Name"}
        )
        resp = await client.get(template_detail_url(str(tpl.id)))
        assert resp.json()["name"] == "Consistent Name"

    async def test_create_and_list_consistency(self, admin_client: AsyncClient, client: AsyncClient):
        payload = valid_template_payload(name="Listable")
        create_resp = await admin_client.post(TEMPLATES_URL, json=payload)
        created_id = create_resp.json()["id"]
        list_resp = await client.get(TEMPLATES_URL)
        ids = [t["id"] for t in list_resp.json()]
        assert created_id in ids

    async def test_delete_then_list_not_present(self, admin_client: AsyncClient, client: AsyncClient, db: AsyncSession):
        tpl = await create_template_in_db(db)
        await db.commit()
        await admin_client.delete(template_detail_url(str(tpl.id)))
        resp = await client.get(TEMPLATES_URL)
        ids = [t["id"] for t in resp.json()]
        assert str(tpl.id) not in ids

    async def test_multiple_concurrent_creates(self, admin_client: AsyncClient):
        results = []
        for i in range(5):
            payload = valid_template_payload(name=f"Template {i}", name_he=f"תבנית {i}")
            resp = await admin_client.post(TEMPLATES_URL, json=payload)
            results.append(resp)
        assert all(r.status_code == 201 for r in results)
        ids = [r.json()["id"] for r in results]
        assert len(set(ids)) == 5


class TestEquipmentTemplateConsultantRelationship:

    async def test_template_with_no_consultants(self, client: AsyncClient, db: AsyncSession):
        await create_template_in_db(db)
        await db.commit()
        resp = await client.get(TEMPLATES_URL)
        assert resp.json()[0]["approving_consultants"] == []

    async def test_consultant_type_response_structure(self, client: AsyncClient, db: AsyncSession):
        tpl = await create_template_in_db(db)
        ct = await create_consultant_type_in_db(db, name="Tester", name_he="בודק", category="testing")
        db.add(EquipmentTemplateConsultant(id=uuid.uuid4(), template_id=tpl.id, consultant_type_id=ct.id))
        await db.commit()
        resp = await client.get(TEMPLATES_URL)
        consultant = resp.json()[0]["approving_consultants"][0]
        assert consultant["name"] == "Tester"
        assert consultant["name_he"] == "בודק"
        assert consultant["category"] == "testing"

    async def test_multiple_templates_different_consultants(self, client: AsyncClient, db: AsyncSession):
        tpl1 = await create_template_in_db(db, name="T1", name_he="ת1")
        tpl2 = await create_template_in_db(db, name="T2", name_he="ת2")
        ct1 = await create_consultant_type_in_db(db, name="C1", name_he="י1", category="a")
        ct2 = await create_consultant_type_in_db(db, name="C2", name_he="י2", category="b")
        db.add(EquipmentTemplateConsultant(id=uuid.uuid4(), template_id=tpl1.id, consultant_type_id=ct1.id))
        db.add(EquipmentTemplateConsultant(id=uuid.uuid4(), template_id=tpl2.id, consultant_type_id=ct2.id))
        await db.commit()
        resp = await client.get(TEMPLATES_URL)
        data = resp.json()
        names_map = {t["name"]: [c["name"] for c in t["approving_consultants"]] for t in data}
        assert "C1" in names_map.get("T1", [])
        assert "C2" in names_map.get("T2", [])

    async def test_shared_consultant_across_templates(self, client: AsyncClient, db: AsyncSession):
        tpl1 = await create_template_in_db(db, name="T1", name_he="ת1")
        tpl2 = await create_template_in_db(db, name="T2", name_he="ת2")
        ct = await create_consultant_type_in_db(db)
        db.add(EquipmentTemplateConsultant(id=uuid.uuid4(), template_id=tpl1.id, consultant_type_id=ct.id))
        db.add(EquipmentTemplateConsultant(id=uuid.uuid4(), template_id=tpl2.id, consultant_type_id=ct.id))
        await db.commit()
        resp = await client.get(TEMPLATES_URL)
        data = resp.json()
        for t in data:
            assert len(t["approving_consultants"]) == 1
            assert t["approving_consultants"][0]["name"] == ct.name


class TestEquipmentTemplateSubmissions:

    async def test_list_submissions_empty(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.get(f"{API_V1}/projects/{project.id}/equipment-submissions")
        assert resp.status_code == 200
        assert resp.json() == []

    async def test_create_submission(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession
    ):
        tpl = await create_template_in_db(db)
        await db.commit()
        payload = {
            "template_id": str(tpl.id),
            "name": "Crane Submission",
            "description": "Submit a crane",
            "status": "draft",
            "specifications": {"weight": "5t"},
        }
        resp = await admin_client.post(
            f"{API_V1}/projects/{project.id}/equipment-submissions", json=payload
        )
        assert resp.status_code == 201

    async def test_get_submission(
        self, admin_client: AsyncClient, project: Project, equipment_submission: EquipmentSubmission
    ):
        resp = await admin_client.get(
            f"{API_V1}/projects/{project.id}/equipment-submissions/{equipment_submission.id}"
        )
        assert resp.status_code == 200
        assert resp.json()["name"] == equipment_submission.name

    async def test_get_submission_not_found(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.get(
            f"{API_V1}/projects/{project.id}/equipment-submissions/{FAKE_TEMPLATE_ID}"
        )
        assert resp.status_code == 404

    async def test_submission_requires_project_access(self, user_client: AsyncClient):
        resp = await user_client.get(
            f"{API_V1}/projects/{FAKE_TEMPLATE_ID}/equipment-submissions"
        )
        assert resp.status_code == 403

    async def test_delete_submission(
        self, admin_client: AsyncClient, project: Project, equipment_submission: EquipmentSubmission
    ):
        resp = await admin_client.delete(
            f"{API_V1}/projects/{project.id}/equipment-submissions/{equipment_submission.id}"
        )
        assert resp.status_code == 200

    async def test_update_submission(
        self, admin_client: AsyncClient, project: Project, equipment_submission: EquipmentSubmission
    ):
        resp = await admin_client.put(
            f"{API_V1}/projects/{project.id}/equipment-submissions/{equipment_submission.id}",
            json={"name": "Updated Submission"}
        )
        assert resp.status_code == 200
        assert resp.json()["name"] == "Updated Submission"

    async def test_update_submission_not_found(self, admin_client: AsyncClient, project: Project):
        fake_sub_id = str(uuid.uuid4())
        resp = await admin_client.put(
            f"{API_V1}/projects/{project.id}/equipment-submissions/{fake_sub_id}",
            json={"name": "NonExistent Submission"}
        )
        assert resp.status_code == 404

    async def test_delete_submission_not_found(self, admin_client: AsyncClient, project: Project):
        fake_sub_id = str(uuid.uuid4())
        resp = await admin_client.delete(
            f"{API_V1}/projects/{project.id}/equipment-submissions/{fake_sub_id}"
        )
        assert resp.status_code == 404


class TestEquipmentTemplateDocumentDefinitions:

    async def test_doc_all_sources(self, admin_client: AsyncClient):
        for source in ["consultant", "project_manager", "contractor"]:
            docs = [{"name": f"Doc {source}", "name_he": f"מסמך {source}", "source": source, "required": True}]
            payload = valid_template_payload(
                name=f"T {source}", name_he=f"ת {source}", required_documents=docs
            )
            resp = await admin_client.post(TEMPLATES_URL, json=payload)
            assert resp.status_code == 201

    async def test_doc_invalid_source(self, admin_client: AsyncClient):
        docs = [{"name": "Doc", "name_he": "מסמך", "source": "invalid_source", "required": True}]
        payload = valid_template_payload(required_documents=docs)
        resp = await admin_client.post(TEMPLATES_URL, json=payload)
        assert resp.status_code == 422

    async def test_doc_required_false(self, admin_client: AsyncClient):
        docs = [{"name": "Optional Doc", "name_he": "מסמך אופציונלי", "source": "consultant", "required": False}]
        payload = valid_template_payload(required_documents=docs)
        resp = await admin_client.post(TEMPLATES_URL, json=payload)
        assert resp.status_code == 201

    async def test_doc_with_description(self, admin_client: AsyncClient):
        docs = [{
            "name": "Safety Doc", "name_he": "מסמך בטיחות",
            "source": "consultant", "required": True,
            "description": "Detailed safety documentation"
        }]
        payload = valid_template_payload(required_documents=docs)
        resp = await admin_client.post(TEMPLATES_URL, json=payload)
        assert resp.status_code == 201

    async def test_multiple_documents(self, admin_client: AsyncClient):
        docs = [
            {"name": "Doc A", "name_he": "מסמך א", "source": "consultant", "required": True},
            {"name": "Doc B", "name_he": "מסמך ב", "source": "contractor", "required": False},
            {"name": "Doc C", "name_he": "מסמך ג", "source": "project_manager", "required": True},
        ]
        payload = valid_template_payload(required_documents=docs)
        resp = await admin_client.post(TEMPLATES_URL, json=payload)
        assert resp.status_code == 201


class TestEquipmentTemplateSpecDefinitions:

    async def test_spec_all_field_types(self, admin_client: AsyncClient):
        for ft in ["text", "number", "boolean", "file"]:
            specs = [{"name": f"Spec {ft}", "name_he": f"מפרט {ft}", "field_type": ft, "required": True}]
            payload = valid_template_payload(
                name=f"T {ft}", name_he=f"ת {ft}", required_specifications=specs
            )
            resp = await admin_client.post(TEMPLATES_URL, json=payload)
            assert resp.status_code == 201

    async def test_spec_invalid_field_type(self, admin_client: AsyncClient):
        specs = [{"name": "Bad", "name_he": "רע", "field_type": "invalid", "required": True}]
        payload = valid_template_payload(required_specifications=specs)
        resp = await admin_client.post(TEMPLATES_URL, json=payload)
        assert resp.status_code == 422

    async def test_spec_with_unit(self, admin_client: AsyncClient):
        specs = [{"name": "Weight", "name_he": "משקל", "field_type": "number", "unit": "kg", "required": True}]
        payload = valid_template_payload(required_specifications=specs)
        resp = await admin_client.post(TEMPLATES_URL, json=payload)
        assert resp.status_code == 201

    async def test_spec_required_false(self, admin_client: AsyncClient):
        specs = [{"name": "Optional", "name_he": "אופציונלי", "field_type": "text", "required": False}]
        payload = valid_template_payload(required_specifications=specs)
        resp = await admin_client.post(TEMPLATES_URL, json=payload)
        assert resp.status_code == 201

    async def test_spec_select_empty_options_fails(self, admin_client: AsyncClient):
        specs = [{"name": "Sel", "name_he": "בחירה", "field_type": "select", "options": [], "required": True}]
        payload = valid_template_payload(required_specifications=specs)
        resp = await admin_client.post(TEMPLATES_URL, json=payload)
        assert resp.status_code == 422

    async def test_multiple_specifications(self, admin_client: AsyncClient):
        specs = [
            {"name": "Weight", "name_he": "משקל", "field_type": "number", "unit": "kg", "required": True},
            {"name": "Color", "name_he": "צבע", "field_type": "select", "options": ["Red", "Blue"], "required": True},
            {"name": "Notes", "name_he": "הערות", "field_type": "text", "required": False},
        ]
        payload = valid_template_payload(required_specifications=specs)
        resp = await admin_client.post(TEMPLATES_URL, json=payload)
        assert resp.status_code == 201


class TestEquipmentTemplateChecklistDefinitions:

    async def test_checklist_item_requires_file_true(self, admin_client: AsyncClient):
        items = [{"name": "Photo proof", "name_he": "הוכחה בתמונה", "requires_file": True}]
        payload = valid_template_payload(submission_checklist=items)
        resp = await admin_client.post(TEMPLATES_URL, json=payload)
        assert resp.status_code == 201

    async def test_checklist_item_requires_file_false(self, admin_client: AsyncClient):
        items = [{"name": "Visual check", "name_he": "בדיקה חזותית", "requires_file": False}]
        payload = valid_template_payload(submission_checklist=items)
        resp = await admin_client.post(TEMPLATES_URL, json=payload)
        assert resp.status_code == 201

    async def test_multiple_checklist_items(self, admin_client: AsyncClient):
        items = [
            {"name": "Step 1", "name_he": "שלב 1", "requires_file": False},
            {"name": "Step 2", "name_he": "שלב 2", "requires_file": True},
            {"name": "Step 3", "name_he": "שלב 3", "requires_file": False},
        ]
        payload = valid_template_payload(submission_checklist=items)
        resp = await admin_client.post(TEMPLATES_URL, json=payload)
        assert resp.status_code == 201
