import uuid
from datetime import datetime

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.material_template import MaterialTemplate, MaterialTemplateConsultant
from app.models.equipment_template import ConsultantType
from app.models.user import User
from app.models.project import Project


API_V1 = "/api/v1"
TEMPLATES_URL = f"{API_V1}/material-templates"
FAKE_TEMPLATE_ID = str(uuid.uuid4())


def template_detail_url(template_id: str) -> str:
    return f"{TEMPLATES_URL}/{template_id}"


def consultant_link_url(template_id: str, consultant_type_id: str) -> str:
    return f"{TEMPLATES_URL}/{template_id}/consultants/{consultant_type_id}"


def valid_template_payload(**overrides) -> dict:
    base = {
        "name": "Concrete Mix C30",
        "name_he": "תערובת בטון C30",
        "category": "Concrete",
    }
    base.update(overrides)
    return base


async def create_template_in_db(db: AsyncSession, **overrides) -> MaterialTemplate:
    data = {
        "id": uuid.uuid4(),
        "name": "DB Material Template",
        "name_he": "תבנית חומר DB",
        "category": "General",
        "is_active": True,
    }
    data.update(overrides)
    template = MaterialTemplate(**data)
    db.add(template)
    await db.flush()
    await db.refresh(template)
    return template


async def create_consultant_type_in_db(db: AsyncSession, **overrides) -> ConsultantType:
    data = {
        "id": uuid.uuid4(),
        "name": "Materials Inspector",
        "name_he": "בודק חומרים",
        "category": "inspection",
    }
    data.update(overrides)
    ct = ConsultantType(**data)
    db.add(ct)
    await db.flush()
    await db.refresh(ct)
    return ct


class TestListMaterialTemplates:

    async def test_list_empty(self, client: AsyncClient):
        resp = await client.get(TEMPLATES_URL)
        assert resp.status_code == 200
        assert resp.json() == []

    async def test_list_returns_all(self, client: AsyncClient, db: AsyncSession):
        await create_template_in_db(db, name="M1", name_he="ח1")
        await create_template_in_db(db, name="M2", name_he="ח2")
        await db.commit()
        resp = await client.get(TEMPLATES_URL)
        assert len(resp.json()) == 2

    async def test_list_filter_by_category(self, client: AsyncClient, db: AsyncSession):
        await create_template_in_db(db, name="M1", name_he="ח1", category="Concrete")
        await create_template_in_db(db, name="M2", name_he="ח2", category="Steel")
        await db.commit()
        resp = await client.get(TEMPLATES_URL, params={"category": "Concrete"})
        data = resp.json()
        assert len(data) == 1
        assert data[0]["category"] == "Concrete"

    async def test_list_filter_by_is_active_true(self, client: AsyncClient, db: AsyncSession):
        await create_template_in_db(db, name="Active", name_he="פעיל", is_active=True)
        await create_template_in_db(db, name="Inactive", name_he="לא פעיל", is_active=False)
        await db.commit()
        resp = await client.get(TEMPLATES_URL, params={"is_active": True})
        data = resp.json()
        assert len(data) == 1
        assert data[0]["name"] == "Active"

    async def test_list_filter_by_is_active_false(self, client: AsyncClient, db: AsyncSession):
        await create_template_in_db(db, name="Active", name_he="פעיל", is_active=True)
        await create_template_in_db(db, name="Inactive", name_he="לא פעיל", is_active=False)
        await db.commit()
        resp = await client.get(TEMPLATES_URL, params={"is_active": False})
        data = resp.json()
        assert len(data) == 1
        assert data[0]["name"] == "Inactive"

    async def test_list_filter_category_no_match(self, client: AsyncClient, db: AsyncSession):
        await create_template_in_db(db, category="Concrete")
        await db.commit()
        resp = await client.get(TEMPLATES_URL, params={"category": "NonExistent"})
        assert resp.json() == []

    async def test_list_response_has_required_fields(self, client: AsyncClient, db: AsyncSession):
        await create_template_in_db(db)
        await db.commit()
        resp = await client.get(TEMPLATES_URL)
        item = resp.json()[0]
        for field in ["id", "name", "name_he", "category", "is_active", "created_at", "updated_at"]:
            assert field in item

    async def test_list_includes_approving_consultants(self, client: AsyncClient, db: AsyncSession):
        await create_template_in_db(db)
        await db.commit()
        resp = await client.get(TEMPLATES_URL)
        assert "approving_consultants" in resp.json()[0]

    async def test_list_with_consultants(self, client: AsyncClient, db: AsyncSession):
        tpl = await create_template_in_db(db)
        ct = await create_consultant_type_in_db(db)
        db.add(MaterialTemplateConsultant(id=uuid.uuid4(), template_id=tpl.id, consultant_type_id=ct.id))
        await db.commit()
        resp = await client.get(TEMPLATES_URL)
        consultants = resp.json()[0]["approving_consultants"]
        assert len(consultants) == 1
        assert consultants[0]["name"] == ct.name

    async def test_list_no_auth_required(self, client: AsyncClient):
        resp = await client.get(TEMPLATES_URL)
        assert resp.status_code == 200

    async def test_list_combined_filters(self, client: AsyncClient, db: AsyncSession):
        await create_template_in_db(db, name="M1", name_he="ח1", category="Concrete", is_active=True)
        await create_template_in_db(db, name="M2", name_he="ח2", category="Concrete", is_active=False)
        await create_template_in_db(db, name="M3", name_he="ח3", category="Steel", is_active=True)
        await db.commit()
        resp = await client.get(TEMPLATES_URL, params={"category": "Concrete", "is_active": True})
        data = resp.json()
        assert len(data) == 1
        assert data[0]["name"] == "M1"


class TestGetMaterialTemplate:

    async def test_get_existing(self, client: AsyncClient, db: AsyncSession):
        tpl = await create_template_in_db(db, name="Specific Material", name_he="חומר ספציפי")
        await db.commit()
        resp = await client.get(template_detail_url(str(tpl.id)))
        assert resp.status_code == 200
        assert resp.json()["name"] == "Specific Material"

    async def test_get_not_found(self, client: AsyncClient):
        resp = await client.get(template_detail_url(FAKE_TEMPLATE_ID))
        assert resp.status_code == 404

    async def test_get_404_message(self, client: AsyncClient):
        resp = await client.get(template_detail_url(FAKE_TEMPLATE_ID))
        assert "not found" in resp.json()["detail"].lower()

    async def test_get_invalid_uuid(self, client: AsyncClient):
        resp = await client.get(template_detail_url("invalid"))
        assert resp.status_code == 422

    async def test_get_returns_all_fields(self, client: AsyncClient, db: AsyncSession):
        tpl = await create_template_in_db(db)
        await db.commit()
        resp = await client.get(template_detail_url(str(tpl.id)))
        data = resp.json()
        assert data["id"] == str(tpl.id)
        assert data["name"] == tpl.name
        assert data["is_active"] == tpl.is_active

    async def test_get_with_documents(self, client: AsyncClient, db: AsyncSession):
        docs = [{"name": "Lab Report", "name_he": "דוח מעבדה", "source": "consultant", "required": True}]
        tpl = await create_template_in_db(db, required_documents=docs)
        await db.commit()
        resp = await client.get(template_detail_url(str(tpl.id)))
        assert len(resp.json()["required_documents"]) == 1

    async def test_get_with_specifications(self, client: AsyncClient, db: AsyncSession):
        specs = [{"name": "Strength", "name_he": "חוזק", "field_type": "number", "required": True}]
        tpl = await create_template_in_db(db, required_specifications=specs)
        await db.commit()
        resp = await client.get(template_detail_url(str(tpl.id)))
        assert len(resp.json()["required_specifications"]) == 1

    async def test_get_with_checklist(self, client: AsyncClient, db: AsyncSession):
        checklist = [{"name": "Check sample", "name_he": "בדיקת דגימה", "requires_file": False}]
        tpl = await create_template_in_db(db, submission_checklist=checklist)
        await db.commit()
        resp = await client.get(template_detail_url(str(tpl.id)))
        assert len(resp.json()["submission_checklist"]) == 1

    async def test_get_no_auth_required(self, client: AsyncClient, db: AsyncSession):
        tpl = await create_template_in_db(db)
        await db.commit()
        resp = await client.get(template_detail_url(str(tpl.id)))
        assert resp.status_code == 200


class TestCreateMaterialTemplate:

    async def test_create_success(self, admin_client: AsyncClient):
        payload = valid_template_payload()
        resp = await admin_client.post(TEMPLATES_URL, json=payload)
        assert resp.status_code == 201
        assert resp.json()["name"] == "Concrete Mix C30"

    async def test_create_returns_id(self, admin_client: AsyncClient):
        resp = await admin_client.post(TEMPLATES_URL, json=valid_template_payload())
        assert "id" in resp.json()
        uuid.UUID(resp.json()["id"])

    async def test_create_with_is_active_false(self, admin_client: AsyncClient):
        payload = valid_template_payload(is_active=False)
        resp = await admin_client.post(TEMPLATES_URL, json=payload)
        assert resp.status_code == 201
        assert resp.json()["is_active"] is False

    async def test_create_default_is_active_true(self, admin_client: AsyncClient):
        payload = valid_template_payload()
        resp = await admin_client.post(TEMPLATES_URL, json=payload)
        assert resp.json()["is_active"] is True

    async def test_create_with_documents(self, admin_client: AsyncClient):
        docs = [{"name": "Test Report", "name_he": "דוח בדיקה", "source": "project_manager", "required": True}]
        payload = valid_template_payload(required_documents=docs)
        resp = await admin_client.post(TEMPLATES_URL, json=payload)
        assert resp.status_code == 201

    async def test_create_with_specifications(self, admin_client: AsyncClient):
        specs = [{"name": "Grade", "name_he": "דרגה", "field_type": "text", "required": True}]
        payload = valid_template_payload(required_specifications=specs)
        resp = await admin_client.post(TEMPLATES_URL, json=payload)
        assert resp.status_code == 201

    async def test_create_with_checklist(self, admin_client: AsyncClient):
        checklist = [{"name": "Visual Check", "name_he": "בדיקה חזותית", "requires_file": True}]
        payload = valid_template_payload(submission_checklist=checklist)
        resp = await admin_client.post(TEMPLATES_URL, json=payload)
        assert resp.status_code == 201

    async def test_create_missing_name(self, admin_client: AsyncClient):
        payload = {"name_he": "חומר", "category": "General"}
        resp = await admin_client.post(TEMPLATES_URL, json=payload)
        assert resp.status_code == 422

    async def test_create_missing_name_he(self, admin_client: AsyncClient):
        payload = {"name": "Material", "category": "General"}
        resp = await admin_client.post(TEMPLATES_URL, json=payload)
        assert resp.status_code == 422

    async def test_create_missing_category(self, admin_client: AsyncClient):
        payload = {"name": "Material", "name_he": "חומר"}
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
        resp = await user_client.post(TEMPLATES_URL, json=valid_template_payload())
        assert resp.status_code == 403

    async def test_create_unauthenticated(self, client: AsyncClient):
        resp = await client.post(TEMPLATES_URL, json=valid_template_payload())
        assert resp.status_code in [401, 403]

    async def test_create_sets_timestamps(self, admin_client: AsyncClient):
        resp = await admin_client.post(TEMPLATES_URL, json=valid_template_payload())
        data = resp.json()
        assert data["created_at"] is not None
        assert data["updated_at"] is not None

    async def test_create_multiple(self, admin_client: AsyncClient):
        r1 = await admin_client.post(TEMPLATES_URL, json=valid_template_payload(name="M1", name_he="ח1"))
        r2 = await admin_client.post(TEMPLATES_URL, json=valid_template_payload(name="M2", name_he="ח2"))
        assert r1.status_code == 201
        assert r2.status_code == 201
        assert r1.json()["id"] != r2.json()["id"]

    async def test_create_spec_select_requires_options(self, admin_client: AsyncClient):
        specs = [{"name": "Type", "name_he": "סוג", "field_type": "select", "required": True}]
        payload = valid_template_payload(required_specifications=specs)
        resp = await admin_client.post(TEMPLATES_URL, json=payload)
        assert resp.status_code == 422

    async def test_create_spec_select_with_options(self, admin_client: AsyncClient):
        specs = [{"name": "Type", "name_he": "סוג", "field_type": "select", "options": ["A", "B"], "required": True}]
        payload = valid_template_payload(required_specifications=specs)
        resp = await admin_client.post(TEMPLATES_URL, json=payload)
        assert resp.status_code == 201


class TestUpdateMaterialTemplate:

    async def test_update_name(self, admin_client: AsyncClient, db: AsyncSession):
        tpl = await create_template_in_db(db)
        await db.commit()
        resp = await admin_client.put(template_detail_url(str(tpl.id)), json={"name": "Updated Name"})
        assert resp.status_code == 200
        assert resp.json()["name"] == "Updated Name"

    async def test_update_name_he(self, admin_client: AsyncClient, db: AsyncSession):
        tpl = await create_template_in_db(db)
        await db.commit()
        resp = await admin_client.put(template_detail_url(str(tpl.id)), json={"name_he": "שם חדש"})
        assert resp.status_code == 200
        assert resp.json()["name_he"] == "שם חדש"

    async def test_update_category(self, admin_client: AsyncClient, db: AsyncSession):
        tpl = await create_template_in_db(db)
        await db.commit()
        resp = await admin_client.put(template_detail_url(str(tpl.id)), json={"category": "Steel"})
        assert resp.status_code == 200
        assert resp.json()["category"] == "Steel"

    async def test_update_is_active(self, admin_client: AsyncClient, db: AsyncSession):
        tpl = await create_template_in_db(db, is_active=True)
        await db.commit()
        resp = await admin_client.put(template_detail_url(str(tpl.id)), json={"is_active": False})
        assert resp.status_code == 200
        assert resp.json()["is_active"] is False

    async def test_update_not_found(self, admin_client: AsyncClient):
        resp = await admin_client.put(template_detail_url(FAKE_TEMPLATE_ID), json={"name": "NonExistent"})
        assert resp.status_code == 404

    async def test_update_requires_admin(self, user_client: AsyncClient, db: AsyncSession):
        tpl = await create_template_in_db(db)
        await db.commit()
        resp = await user_client.put(template_detail_url(str(tpl.id)), json={"name": "Hack"})
        assert resp.status_code == 403

    async def test_update_partial(self, admin_client: AsyncClient, db: AsyncSession):
        tpl = await create_template_in_db(db, name="Original", name_he="מקורי", category="Concrete")
        await db.commit()
        resp = await admin_client.put(template_detail_url(str(tpl.id)), json={"name": "Changed"})
        data = resp.json()
        assert data["name"] == "Changed"
        assert data["name_he"] == "מקורי"
        assert data["category"] == "Concrete"

    async def test_update_preserves_id(self, admin_client: AsyncClient, db: AsyncSession):
        tpl = await create_template_in_db(db)
        await db.commit()
        resp = await admin_client.put(template_detail_url(str(tpl.id)), json={"name": "Updated"})
        assert resp.json()["id"] == str(tpl.id)

    async def test_update_empty_name_fails(self, admin_client: AsyncClient, db: AsyncSession):
        tpl = await create_template_in_db(db)
        await db.commit()
        resp = await admin_client.put(template_detail_url(str(tpl.id)), json={"name": ""})
        assert resp.status_code == 422

    async def test_update_unauthenticated(self, client: AsyncClient, db: AsyncSession):
        tpl = await create_template_in_db(db)
        await db.commit()
        resp = await client.put(template_detail_url(str(tpl.id)), json={"name": "Nope"})
        assert resp.status_code in [401, 403]

    async def test_update_with_documents(self, admin_client: AsyncClient, db: AsyncSession):
        tpl = await create_template_in_db(db)
        await db.commit()
        docs = [{"name": "New Doc", "name_he": "מסמך חדש", "source": "contractor", "required": False}]
        resp = await admin_client.put(template_detail_url(str(tpl.id)), json={"required_documents": docs})
        assert resp.status_code == 200


class TestDeleteMaterialTemplate:

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

    async def test_delete_unauthenticated(self, client: AsyncClient, db: AsyncSession):
        tpl = await create_template_in_db(db)
        await db.commit()
        resp = await client.delete(template_detail_url(str(tpl.id)))
        assert resp.status_code in [401, 403]

    async def test_delete_invalid_uuid(self, admin_client: AsyncClient):
        resp = await admin_client.delete(template_detail_url("bad"))
        assert resp.status_code == 422


class TestMaterialTemplateConsultantLink:

    async def test_add_consultant_to_template(self, admin_client: AsyncClient, db: AsyncSession):
        tpl = await create_template_in_db(db)
        ct = await create_consultant_type_in_db(db)
        await db.commit()
        resp = await admin_client.post(consultant_link_url(str(tpl.id), str(ct.id)))
        assert resp.status_code == 201

    async def test_add_consultant_template_not_found(self, admin_client: AsyncClient, db: AsyncSession):
        ct = await create_consultant_type_in_db(db)
        await db.commit()
        resp = await admin_client.post(consultant_link_url(FAKE_TEMPLATE_ID, str(ct.id)))
        assert resp.status_code == 404

    async def test_add_consultant_type_not_found(self, admin_client: AsyncClient, db: AsyncSession):
        tpl = await create_template_in_db(db)
        await db.commit()
        resp = await admin_client.post(consultant_link_url(str(tpl.id), FAKE_TEMPLATE_ID))
        assert resp.status_code == 404

    async def test_add_duplicate_consultant_fails(self, admin_client: AsyncClient, db: AsyncSession):
        tpl = await create_template_in_db(db)
        ct = await create_consultant_type_in_db(db)
        db.add(MaterialTemplateConsultant(id=uuid.uuid4(), template_id=tpl.id, consultant_type_id=ct.id))
        await db.commit()
        resp = await admin_client.post(consultant_link_url(str(tpl.id), str(ct.id)))
        assert resp.status_code == 400

    async def test_add_consultant_requires_admin(self, user_client: AsyncClient, db: AsyncSession):
        tpl = await create_template_in_db(db)
        ct = await create_consultant_type_in_db(db)
        await db.commit()
        resp = await user_client.post(consultant_link_url(str(tpl.id), str(ct.id)))
        assert resp.status_code == 403

    async def test_remove_consultant_from_template(self, admin_client: AsyncClient, db: AsyncSession):
        tpl = await create_template_in_db(db)
        ct = await create_consultant_type_in_db(db)
        db.add(MaterialTemplateConsultant(id=uuid.uuid4(), template_id=tpl.id, consultant_type_id=ct.id))
        await db.commit()
        resp = await admin_client.delete(consultant_link_url(str(tpl.id), str(ct.id)))
        assert resp.status_code == 200

    async def test_remove_nonexistent_link_fails(self, admin_client: AsyncClient, db: AsyncSession):
        tpl = await create_template_in_db(db)
        ct = await create_consultant_type_in_db(db)
        await db.commit()
        resp = await admin_client.delete(consultant_link_url(str(tpl.id), str(ct.id)))
        assert resp.status_code == 404

    async def test_remove_consultant_requires_admin(self, user_client: AsyncClient, db: AsyncSession):
        tpl = await create_template_in_db(db)
        ct = await create_consultant_type_in_db(db)
        db.add(MaterialTemplateConsultant(id=uuid.uuid4(), template_id=tpl.id, consultant_type_id=ct.id))
        await db.commit()
        resp = await user_client.delete(consultant_link_url(str(tpl.id), str(ct.id)))
        assert resp.status_code == 403

    async def test_add_then_list_shows_consultant(self, admin_client: AsyncClient, client: AsyncClient, db: AsyncSession):
        tpl = await create_template_in_db(db)
        ct = await create_consultant_type_in_db(db)
        await db.commit()
        await admin_client.post(consultant_link_url(str(tpl.id), str(ct.id)))
        resp = await client.get(TEMPLATES_URL)
        consultants = resp.json()[0]["approving_consultants"]
        assert len(consultants) == 1

    async def test_remove_then_list_shows_empty(self, admin_client: AsyncClient, client: AsyncClient, db: AsyncSession):
        tpl = await create_template_in_db(db)
        ct = await create_consultant_type_in_db(db)
        db.add(MaterialTemplateConsultant(id=uuid.uuid4(), template_id=tpl.id, consultant_type_id=ct.id))
        await db.commit()
        await admin_client.delete(consultant_link_url(str(tpl.id), str(ct.id)))
        resp = await client.get(TEMPLATES_URL)
        consultants = resp.json()[0]["approving_consultants"]
        assert len(consultants) == 0


class TestMaterialTemplateResponseFormat:

    async def test_id_is_valid_uuid(self, client: AsyncClient, db: AsyncSession):
        tpl = await create_template_in_db(db)
        await db.commit()
        resp = await client.get(template_detail_url(str(tpl.id)))
        uuid.UUID(resp.json()["id"])

    async def test_is_active_is_boolean(self, client: AsyncClient, db: AsyncSession):
        tpl = await create_template_in_db(db)
        await db.commit()
        resp = await client.get(template_detail_url(str(tpl.id)))
        assert isinstance(resp.json()["is_active"], bool)

    async def test_created_at_parseable(self, client: AsyncClient, db: AsyncSession):
        tpl = await create_template_in_db(db)
        await db.commit()
        resp = await client.get(template_detail_url(str(tpl.id)))
        datetime.fromisoformat(resp.json()["created_at"].replace("Z", "+00:00"))

    async def test_updated_at_parseable(self, client: AsyncClient, db: AsyncSession):
        tpl = await create_template_in_db(db)
        await db.commit()
        resp = await client.get(template_detail_url(str(tpl.id)))
        datetime.fromisoformat(resp.json()["updated_at"].replace("Z", "+00:00"))

    async def test_lists_default_empty(self, client: AsyncClient, db: AsyncSession):
        tpl = await create_template_in_db(db)
        await db.commit()
        resp = await client.get(template_detail_url(str(tpl.id)))
        data = resp.json()
        assert data["required_documents"] == []
        assert data["required_specifications"] == []
        assert data["submission_checklist"] == []


class TestMaterialTemplateEdgeCases:

    async def test_unicode_name(self, admin_client: AsyncClient):
        payload = valid_template_payload(name="Beton haute performance", name_he="בטון ביצועים גבוהים")
        resp = await admin_client.post(TEMPLATES_URL, json=payload)
        assert resp.status_code == 201
        assert resp.json()["name_he"] == "בטון ביצועים גבוהים"

    async def test_long_name(self, admin_client: AsyncClient):
        payload = valid_template_payload(name="A" * 200, name_he="א" * 200)
        resp = await admin_client.post(TEMPLATES_URL, json=payload)
        assert resp.status_code == 201

    async def test_empty_lists_on_create(self, admin_client: AsyncClient):
        payload = valid_template_payload(
            required_documents=[], required_specifications=[], submission_checklist=[]
        )
        resp = await admin_client.post(TEMPLATES_URL, json=payload)
        assert resp.status_code == 201

    async def test_create_and_get_consistency(self, admin_client: AsyncClient, client: AsyncClient):
        payload = valid_template_payload(name="Consistent Material")
        create_resp = await admin_client.post(TEMPLATES_URL, json=payload)
        tpl_id = create_resp.json()["id"]
        get_resp = await client.get(template_detail_url(tpl_id))
        assert get_resp.json()["name"] == "Consistent Material"

    async def test_update_then_get_consistency(self, admin_client: AsyncClient, client: AsyncClient, db: AsyncSession):
        tpl = await create_template_in_db(db)
        await db.commit()
        await admin_client.put(template_detail_url(str(tpl.id)), json={"name": "Updated Consistently"})
        resp = await client.get(template_detail_url(str(tpl.id)))
        assert resp.json()["name"] == "Updated Consistently"

    async def test_delete_then_list_not_present(self, admin_client: AsyncClient, client: AsyncClient, db: AsyncSession):
        tpl = await create_template_in_db(db)
        await db.commit()
        await admin_client.delete(template_detail_url(str(tpl.id)))
        resp = await client.get(TEMPLATES_URL)
        ids = [t["id"] for t in resp.json()]
        assert str(tpl.id) not in ids

    async def test_multiple_creates(self, admin_client: AsyncClient):
        results = []
        for i in range(5):
            payload = valid_template_payload(name=f"Mat {i}", name_he=f"חומר {i}")
            resp = await admin_client.post(TEMPLATES_URL, json=payload)
            results.append(resp)
        assert all(r.status_code == 201 for r in results)
        ids = [r.json()["id"] for r in results]
        assert len(set(ids)) == 5


class TestMaterialTemplateDocumentDefinitions:

    async def test_doc_consultant_source(self, admin_client: AsyncClient):
        docs = [{"name": "Lab Report", "name_he": "דוח מעבדה", "source": "consultant", "required": True}]
        payload = valid_template_payload(required_documents=docs)
        resp = await admin_client.post(TEMPLATES_URL, json=payload)
        assert resp.status_code == 201

    async def test_doc_project_manager_source(self, admin_client: AsyncClient):
        docs = [{"name": "Approval Form", "name_he": "טופס אישור", "source": "project_manager", "required": True}]
        payload = valid_template_payload(required_documents=docs)
        resp = await admin_client.post(TEMPLATES_URL, json=payload)
        assert resp.status_code == 201

    async def test_doc_contractor_source(self, admin_client: AsyncClient):
        docs = [{"name": "Delivery Note", "name_he": "תעודת משלוח", "source": "contractor", "required": True}]
        payload = valid_template_payload(required_documents=docs)
        resp = await admin_client.post(TEMPLATES_URL, json=payload)
        assert resp.status_code == 201

    async def test_doc_invalid_source_rejected(self, admin_client: AsyncClient):
        docs = [{"name": "Bad", "name_he": "רע", "source": "unknown", "required": True}]
        payload = valid_template_payload(required_documents=docs)
        resp = await admin_client.post(TEMPLATES_URL, json=payload)
        assert resp.status_code == 422

    async def test_doc_optional(self, admin_client: AsyncClient):
        docs = [{"name": "Extra Info", "name_he": "מידע נוסף", "source": "consultant", "required": False}]
        payload = valid_template_payload(required_documents=docs)
        resp = await admin_client.post(TEMPLATES_URL, json=payload)
        assert resp.status_code == 201

    async def test_doc_with_description(self, admin_client: AsyncClient):
        docs = [{
            "name": "Spec Sheet", "name_he": "דף מפרט",
            "source": "contractor", "required": True,
            "description": "Full specification sheet from manufacturer"
        }]
        payload = valid_template_payload(required_documents=docs)
        resp = await admin_client.post(TEMPLATES_URL, json=payload)
        assert resp.status_code == 201

    async def test_multiple_documents(self, admin_client: AsyncClient):
        docs = [
            {"name": "Doc 1", "name_he": "מסמך 1", "source": "consultant", "required": True},
            {"name": "Doc 2", "name_he": "מסמך 2", "source": "contractor", "required": False},
        ]
        payload = valid_template_payload(required_documents=docs)
        resp = await admin_client.post(TEMPLATES_URL, json=payload)
        assert resp.status_code == 201


class TestMaterialTemplateSpecDefinitions:

    async def test_spec_text_type(self, admin_client: AsyncClient):
        specs = [{"name": "Description", "name_he": "תיאור", "field_type": "text", "required": True}]
        payload = valid_template_payload(required_specifications=specs)
        resp = await admin_client.post(TEMPLATES_URL, json=payload)
        assert resp.status_code == 201

    async def test_spec_number_type(self, admin_client: AsyncClient):
        specs = [{"name": "Strength", "name_he": "חוזק", "field_type": "number", "required": True}]
        payload = valid_template_payload(required_specifications=specs)
        resp = await admin_client.post(TEMPLATES_URL, json=payload)
        assert resp.status_code == 201

    async def test_spec_boolean_type(self, admin_client: AsyncClient):
        specs = [{"name": "Fireproof", "name_he": "עמיד אש", "field_type": "boolean", "required": True}]
        payload = valid_template_payload(required_specifications=specs)
        resp = await admin_client.post(TEMPLATES_URL, json=payload)
        assert resp.status_code == 201

    async def test_spec_file_type(self, admin_client: AsyncClient):
        specs = [{"name": "Certificate", "name_he": "תעודה", "field_type": "file", "required": True}]
        payload = valid_template_payload(required_specifications=specs)
        resp = await admin_client.post(TEMPLATES_URL, json=payload)
        assert resp.status_code == 201

    async def test_spec_invalid_type_rejected(self, admin_client: AsyncClient):
        specs = [{"name": "Bad", "name_he": "רע", "field_type": "date", "required": True}]
        payload = valid_template_payload(required_specifications=specs)
        resp = await admin_client.post(TEMPLATES_URL, json=payload)
        assert resp.status_code == 422

    async def test_spec_number_with_unit(self, admin_client: AsyncClient):
        specs = [{"name": "Weight", "name_he": "משקל", "field_type": "number", "unit": "kg", "required": True}]
        payload = valid_template_payload(required_specifications=specs)
        resp = await admin_client.post(TEMPLATES_URL, json=payload)
        assert resp.status_code == 201

    async def test_spec_select_with_valid_options(self, admin_client: AsyncClient):
        specs = [{"name": "Grade", "name_he": "דרגה", "field_type": "select", "options": ["A", "B", "C"], "required": True}]
        payload = valid_template_payload(required_specifications=specs)
        resp = await admin_client.post(TEMPLATES_URL, json=payload)
        assert resp.status_code == 201

    async def test_spec_select_empty_options_fails(self, admin_client: AsyncClient):
        specs = [{"name": "Grade", "name_he": "דרגה", "field_type": "select", "options": [], "required": True}]
        payload = valid_template_payload(required_specifications=specs)
        resp = await admin_client.post(TEMPLATES_URL, json=payload)
        assert resp.status_code == 422

    async def test_spec_text_with_options_fails(self, admin_client: AsyncClient):
        specs = [{"name": "Notes", "name_he": "הערות", "field_type": "text", "options": ["A"], "required": True}]
        payload = valid_template_payload(required_specifications=specs)
        resp = await admin_client.post(TEMPLATES_URL, json=payload)
        assert resp.status_code == 422

    async def test_multiple_specs(self, admin_client: AsyncClient):
        specs = [
            {"name": "S1", "name_he": "מ1", "field_type": "text", "required": True},
            {"name": "S2", "name_he": "מ2", "field_type": "number", "unit": "m", "required": True},
            {"name": "S3", "name_he": "מ3", "field_type": "select", "options": ["X", "Y"], "required": False},
        ]
        payload = valid_template_payload(required_specifications=specs)
        resp = await admin_client.post(TEMPLATES_URL, json=payload)
        assert resp.status_code == 201


class TestMaterialTemplateChecklistDefinitions:

    async def test_checklist_item_basic(self, admin_client: AsyncClient):
        items = [{"name": "Visual check", "name_he": "בדיקה חזותית", "requires_file": False}]
        payload = valid_template_payload(submission_checklist=items)
        resp = await admin_client.post(TEMPLATES_URL, json=payload)
        assert resp.status_code == 201

    async def test_checklist_item_with_file(self, admin_client: AsyncClient):
        items = [{"name": "Photo proof", "name_he": "הוכחה בתמונה", "requires_file": True}]
        payload = valid_template_payload(submission_checklist=items)
        resp = await admin_client.post(TEMPLATES_URL, json=payload)
        assert resp.status_code == 201

    async def test_multiple_checklist_items(self, admin_client: AsyncClient):
        items = [
            {"name": "Step 1", "name_he": "שלב 1", "requires_file": False},
            {"name": "Step 2", "name_he": "שלב 2", "requires_file": True},
        ]
        payload = valid_template_payload(submission_checklist=items)
        resp = await admin_client.post(TEMPLATES_URL, json=payload)
        assert resp.status_code == 201


class TestMaterialTemplateFullLifecycle:

    async def test_create_update_delete(self, admin_client: AsyncClient, client: AsyncClient):
        payload = valid_template_payload(name="Lifecycle Mat")
        create_resp = await admin_client.post(TEMPLATES_URL, json=payload)
        assert create_resp.status_code == 201
        tpl_id = create_resp.json()["id"]

        update_resp = await admin_client.put(
            template_detail_url(tpl_id), json={"name": "Updated Lifecycle Mat"}
        )
        assert update_resp.status_code == 200
        assert update_resp.json()["name"] == "Updated Lifecycle Mat"

        delete_resp = await admin_client.delete(template_detail_url(tpl_id))
        assert delete_resp.status_code == 200

        get_resp = await client.get(template_detail_url(tpl_id))
        assert get_resp.status_code == 404

    async def test_create_add_consultant_list(self, admin_client: AsyncClient, client: AsyncClient, db: AsyncSession):
        ct = await create_consultant_type_in_db(db)
        await db.commit()
        payload = valid_template_payload(name="With Consultant")
        create_resp = await admin_client.post(TEMPLATES_URL, json=payload)
        tpl_id = create_resp.json()["id"]

        add_resp = await admin_client.post(consultant_link_url(tpl_id, str(ct.id)))
        assert add_resp.status_code == 201

        list_resp = await client.get(TEMPLATES_URL)
        tpl_data = [t for t in list_resp.json() if t["id"] == tpl_id][0]
        assert len(tpl_data["approving_consultants"]) == 1

    async def test_deactivate_and_filter(self, admin_client: AsyncClient, client: AsyncClient):
        payload = valid_template_payload(name="Deactivatable", is_active=True)
        create_resp = await admin_client.post(TEMPLATES_URL, json=payload)
        tpl_id = create_resp.json()["id"]
        await admin_client.put(template_detail_url(tpl_id), json={"is_active": False})
        resp = await client.get(TEMPLATES_URL, params={"is_active": True})
        ids = [t["id"] for t in resp.json()]
        assert tpl_id not in ids
