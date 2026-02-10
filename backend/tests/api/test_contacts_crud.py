import io
import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.project import Project, ProjectMember
from app.models.user import User

API_V1 = "/api/v1"
FAKE_PROJECT_ID = str(uuid.uuid4())
FAKE_CONTACT_ID = str(uuid.uuid4())


def contacts_url(project_id: str) -> str:
    return f"{API_V1}/projects/{project_id}/contacts"


def contact_detail_url(project_id: str, contact_id: str) -> str:
    return f"{API_V1}/projects/{project_id}/contacts/{contact_id}"


def export_url(project_id: str) -> str:
    return f"{API_V1}/projects/{project_id}/contacts/export"


def import_url(project_id: str) -> str:
    return f"{API_V1}/projects/{project_id}/contacts/import"


def valid_contact_payload(**overrides) -> dict:
    base = {
        "contact_name": "John Doe",
        "contact_type": "contractor",
        "company_name": "BuildCo Inc.",
        "email": "john@buildco.com",
        "phone": "+1-555-0100",
        "role_description": "Lead Contractor",
        "is_primary": False,
    }
    base.update(overrides)
    return base


async def create_contact_via_api(client: AsyncClient, project_id: str, payload: dict = None) -> dict:
    data = payload or valid_contact_payload()
    resp = await client.post(contacts_url(project_id), json=data)
    assert resp.status_code == 200
    return resp.json()


class TestCreateContact:

    @pytest.mark.asyncio
    async def test_create_contact_success(self, admin_client: AsyncClient, project: Project):
        payload = valid_contact_payload()
        resp = await admin_client.post(contacts_url(str(project.id)), json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["contactName"] == "John Doe"
        assert data["contactType"] == "contractor"
        assert "id" in data

    @pytest.mark.asyncio
    async def test_create_returns_camel_case_fields(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.post(contacts_url(str(project.id)), json=valid_contact_payload())
        data = resp.json()
        assert "contactName" in data
        assert "contactType" in data
        assert "companyName" in data
        assert "roleDescription" in data
        assert "isPrimary" in data
        assert "projectId" in data
        assert "createdAt" in data

    @pytest.mark.asyncio
    async def test_create_sets_project_id(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.post(contacts_url(str(project.id)), json=valid_contact_payload())
        assert resp.json()["projectId"] == str(project.id)

    @pytest.mark.asyncio
    async def test_create_with_minimal_fields(self, admin_client: AsyncClient, project: Project):
        payload = {"contact_name": "Jane Doe", "contact_type": "client"}
        resp = await admin_client.post(contacts_url(str(project.id)), json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["contactName"] == "Jane Doe"
        assert data["contactType"] == "client"
        assert data["companyName"] is None
        assert data["email"] is None
        assert data["phone"] is None
        assert data["roleDescription"] is None
        assert data["isPrimary"] is False

    @pytest.mark.asyncio
    async def test_create_with_all_fields(self, admin_client: AsyncClient, project: Project):
        payload = valid_contact_payload(is_primary=True)
        resp = await admin_client.post(contacts_url(str(project.id)), json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["isPrimary"] is True
        assert data["email"] == "john@buildco.com"
        assert data["companyName"] == "BuildCo Inc."

    @pytest.mark.asyncio
    async def test_create_missing_contact_name(self, admin_client: AsyncClient, project: Project):
        payload = {"contact_type": "contractor"}
        resp = await admin_client.post(contacts_url(str(project.id)), json=payload)
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_create_missing_contact_type(self, admin_client: AsyncClient, project: Project):
        payload = {"contact_name": "Jane Doe"}
        resp = await admin_client.post(contacts_url(str(project.id)), json=payload)
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_create_empty_payload(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.post(contacts_url(str(project.id)), json={})
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_create_id_is_valid_uuid(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.post(contacts_url(str(project.id)), json=valid_contact_payload())
        uuid.UUID(resp.json()["id"])

    @pytest.mark.asyncio
    @pytest.mark.parametrize("name,expected_status", [
        ("AB", 200),
        ("A" * 255, 200),
        ("Valid Contact Name", 200),
    ])
    async def test_create_valid_contact_names(self, admin_client: AsyncClient, project: Project, name, expected_status):
        payload = valid_contact_payload(contact_name=name)
        resp = await admin_client.post(contacts_url(str(project.id)), json=payload)
        assert resp.status_code == expected_status

    @pytest.mark.asyncio
    @pytest.mark.parametrize("name,desc", [
        ("", "empty name"),
        ("A", "single char too short"),
        ("A" * 256, "256 chars too long"),
    ])
    async def test_create_invalid_contact_names(self, admin_client: AsyncClient, project: Project, name, desc):
        payload = valid_contact_payload(contact_name=name)
        resp = await admin_client.post(contacts_url(str(project.id)), json=payload)
        assert resp.status_code == 422, f"Failed for: {desc}"

    @pytest.mark.asyncio
    async def test_create_contact_type_max_length(self, admin_client: AsyncClient, project: Project):
        payload = valid_contact_payload(contact_type="A" * 50)
        resp = await admin_client.post(contacts_url(str(project.id)), json=payload)
        assert resp.status_code == 200

    @pytest.mark.asyncio
    async def test_create_contact_type_too_long(self, admin_client: AsyncClient, project: Project):
        payload = valid_contact_payload(contact_type="A" * 51)
        resp = await admin_client.post(contacts_url(str(project.id)), json=payload)
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_create_contact_type_empty_string(self, admin_client: AsyncClient, project: Project):
        payload = valid_contact_payload(contact_type="")
        resp = await admin_client.post(contacts_url(str(project.id)), json=payload)
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_create_company_name_max_length(self, admin_client: AsyncClient, project: Project):
        payload = valid_contact_payload(company_name="A" * 255)
        resp = await admin_client.post(contacts_url(str(project.id)), json=payload)
        assert resp.status_code == 200

    @pytest.mark.asyncio
    async def test_create_company_name_too_long(self, admin_client: AsyncClient, project: Project):
        payload = valid_contact_payload(company_name="A" * 256)
        resp = await admin_client.post(contacts_url(str(project.id)), json=payload)
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_create_role_description_max_length(self, admin_client: AsyncClient, project: Project):
        payload = valid_contact_payload(role_description="A" * 2000)
        resp = await admin_client.post(contacts_url(str(project.id)), json=payload)
        assert resp.status_code == 200

    @pytest.mark.asyncio
    async def test_create_role_description_too_long(self, admin_client: AsyncClient, project: Project):
        payload = valid_contact_payload(role_description="A" * 2001)
        resp = await admin_client.post(contacts_url(str(project.id)), json=payload)
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_create_phone_max_length(self, admin_client: AsyncClient, project: Project):
        payload = valid_contact_payload(phone="1" * 30)
        resp = await admin_client.post(contacts_url(str(project.id)), json=payload)
        assert resp.status_code == 200

    @pytest.mark.asyncio
    async def test_create_phone_too_long(self, admin_client: AsyncClient, project: Project):
        payload = valid_contact_payload(phone="1" * 31)
        resp = await admin_client.post(contacts_url(str(project.id)), json=payload)
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_create_with_null_optional_fields(self, admin_client: AsyncClient, project: Project):
        payload = {
            "contact_name": "Null Fields",
            "contact_type": "vendor",
            "company_name": None,
            "email": None,
            "phone": None,
            "role_description": None,
        }
        resp = await admin_client.post(contacts_url(str(project.id)), json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["companyName"] is None
        assert data["email"] is None
        assert data["phone"] is None
        assert data["roleDescription"] is None

    @pytest.mark.asyncio
    async def test_create_is_primary_true(self, admin_client: AsyncClient, project: Project):
        payload = valid_contact_payload(is_primary=True)
        resp = await admin_client.post(contacts_url(str(project.id)), json=payload)
        assert resp.status_code == 200
        assert resp.json()["isPrimary"] is True

    @pytest.mark.asyncio
    async def test_create_is_primary_default_false(self, admin_client: AsyncClient, project: Project):
        payload = {"contact_name": "No Primary", "contact_type": "vendor"}
        resp = await admin_client.post(contacts_url(str(project.id)), json=payload)
        assert resp.status_code == 200
        assert resp.json()["isPrimary"] is False


class TestCreateContactEmailValidation:

    @pytest.mark.asyncio
    @pytest.mark.parametrize("email,expected_status", [
        ("valid@example.com", 200),
        ("user.name+tag@domain.co", 200),
        (None, 200),
    ])
    async def test_valid_emails(self, admin_client: AsyncClient, project: Project, email, expected_status):
        payload = valid_contact_payload(email=email)
        resp = await admin_client.post(contacts_url(str(project.id)), json=payload)
        assert resp.status_code == expected_status

    @pytest.mark.asyncio
    @pytest.mark.parametrize("email", [
        "not-an-email",
        "missing@",
        "@domain.com",
        "",
    ])
    async def test_invalid_emails(self, admin_client: AsyncClient, project: Project, email):
        payload = valid_contact_payload(email=email)
        resp = await admin_client.post(contacts_url(str(project.id)), json=payload)
        assert resp.status_code == 422


class TestCreateContactPhoneValidation:

    @pytest.mark.asyncio
    @pytest.mark.parametrize("phone,expected_status", [
        ("+1-555-0100", 200),
        ("(555) 555-0100", 200),
        ("555.555.0100", 200),
        ("+972 50 123 4567", 200),
        ("1234567890", 200),
        (None, 200),
    ])
    async def test_valid_phones(self, admin_client: AsyncClient, project: Project, phone, expected_status):
        payload = valid_contact_payload(phone=phone)
        resp = await admin_client.post(contacts_url(str(project.id)), json=payload)
        assert resp.status_code == expected_status

    @pytest.mark.asyncio
    @pytest.mark.parametrize("phone", [
        "abc-def-ghij",
        "phone: 123",
        "call me",
    ])
    async def test_invalid_phones(self, admin_client: AsyncClient, project: Project, phone):
        payload = valid_contact_payload(phone=phone)
        resp = await admin_client.post(contacts_url(str(project.id)), json=payload)
        assert resp.status_code == 422


class TestCreateContactXSS:

    @pytest.mark.asyncio
    @pytest.mark.parametrize("field", ["contact_name", "contact_type", "company_name", "role_description"])
    @pytest.mark.parametrize("xss_payload,marker", [
        ('<script>alert("xss")</script>', "<script"),
        ('javascript:alert(1)', "javascript:"),
        ('<img src=x onerror=alert(1)>', "<img"),
        ('<iframe src="evil"></iframe>', "<iframe"),
    ])
    async def test_xss_sanitization(self, admin_client: AsyncClient, project: Project, field, xss_payload, marker):
        if field == "contact_name":
            payload = valid_contact_payload(contact_name=f"Safe {xss_payload} Name")
        elif field == "contact_type":
            payload = valid_contact_payload(contact_type=f"Safe{xss_payload}Type")
        else:
            payload = valid_contact_payload(**{field: f"Safe {xss_payload} Text"})
        resp = await admin_client.post(contacts_url(str(project.id)), json=payload)
        if resp.status_code == 200:
            camel_map = {
                "contact_name": "contactName", "contact_type": "contactType",
                "company_name": "companyName", "role_description": "roleDescription",
            }
            val = resp.json().get(camel_map[field], "")
            if val:
                assert marker not in val.lower()


class TestCreateContactTypes:

    @pytest.mark.asyncio
    @pytest.mark.parametrize("contact_type", [
        "contractor", "subcontractor", "client", "consultant",
        "inspector", "architect", "engineer", "vendor", "supplier",
    ])
    async def test_various_contact_types(self, admin_client: AsyncClient, project: Project, contact_type):
        payload = valid_contact_payload(contact_type=contact_type)
        resp = await admin_client.post(contacts_url(str(project.id)), json=payload)
        assert resp.status_code == 200
        assert resp.json()["contactType"] == contact_type


class TestGetContact:

    @pytest.mark.asyncio
    async def test_get_contact_by_id(self, admin_client: AsyncClient, project: Project):
        created = await create_contact_via_api(admin_client, str(project.id))
        resp = await admin_client.get(contact_detail_url(str(project.id), created["id"]))
        assert resp.status_code == 200
        assert resp.json()["id"] == created["id"]
        assert resp.json()["contactName"] == created["contactName"]

    @pytest.mark.asyncio
    async def test_get_contact_returns_camel_case(self, admin_client: AsyncClient, project: Project):
        created = await create_contact_via_api(admin_client, str(project.id))
        resp = await admin_client.get(contact_detail_url(str(project.id), created["id"]))
        data = resp.json()
        assert "contactName" in data
        assert "contactType" in data
        assert "companyName" in data
        assert "isPrimary" in data
        assert "projectId" in data
        assert "createdAt" in data

    @pytest.mark.asyncio
    async def test_get_nonexistent_contact(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.get(contact_detail_url(str(project.id), FAKE_CONTACT_ID))
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_get_contact_nonexistent_project(self, admin_client: AsyncClient):
        resp = await admin_client.get(contact_detail_url(FAKE_PROJECT_ID, FAKE_CONTACT_ID))
        assert resp.status_code == 403

    @pytest.mark.asyncio
    async def test_get_contact_wrong_project(self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User):
        created = await create_contact_via_api(admin_client, str(project.id))
        other_project = Project(
            id=uuid.uuid4(), name="Other Project", code="OTH-CON",
            status="active", created_by_id=admin_user.id,
        )
        db.add(other_project)
        await db.flush()
        db.add(ProjectMember(project_id=other_project.id, user_id=admin_user.id, role="project_admin"))
        await db.commit()
        resp = await admin_client.get(contact_detail_url(str(other_project.id), created["id"]))
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_get_contact_invalid_uuid(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.get(f"{API_V1}/projects/{project.id}/contacts/not-a-uuid")
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_get_contact_has_all_expected_fields(self, admin_client: AsyncClient, project: Project):
        created = await create_contact_via_api(admin_client, str(project.id))
        resp = await admin_client.get(contact_detail_url(str(project.id), created["id"]))
        data = resp.json()
        expected_fields = [
            "id", "projectId", "contactType", "companyName",
            "contactName", "email", "phone", "roleDescription",
            "isPrimary", "createdAt",
        ]
        for field in expected_fields:
            assert field in data, f"Missing field: {field}"


class TestListContacts:

    @pytest.mark.asyncio
    async def test_list_empty(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.get(contacts_url(str(project.id)))
        assert resp.status_code == 200
        assert resp.json() == []

    @pytest.mark.asyncio
    async def test_list_single_item(self, admin_client: AsyncClient, project: Project):
        await create_contact_via_api(admin_client, str(project.id))
        resp = await admin_client.get(contacts_url(str(project.id)))
        assert resp.status_code == 200
        assert len(resp.json()) == 1

    @pytest.mark.asyncio
    async def test_list_multiple_items(self, admin_client: AsyncClient, project: Project):
        for i in range(3):
            await create_contact_via_api(
                admin_client, str(project.id),
                valid_contact_payload(contact_name=f"Contact {i}", email=f"c{i}@test.com")
            )
        resp = await admin_client.get(contacts_url(str(project.id)))
        assert resp.status_code == 200
        assert len(resp.json()) == 3

    @pytest.mark.asyncio
    async def test_list_scoped_to_project(self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User):
        await create_contact_via_api(admin_client, str(project.id))
        other_project = Project(
            id=uuid.uuid4(), name="Other", code="OTH-CON2",
            status="active", created_by_id=admin_user.id,
        )
        db.add(other_project)
        await db.flush()
        db.add(ProjectMember(project_id=other_project.id, user_id=admin_user.id, role="project_admin"))
        await db.commit()
        resp = await admin_client.get(contacts_url(str(other_project.id)))
        assert resp.status_code == 200
        assert len(resp.json()) == 0

    @pytest.mark.asyncio
    async def test_list_returns_camel_case(self, admin_client: AsyncClient, project: Project):
        await create_contact_via_api(admin_client, str(project.id))
        resp = await admin_client.get(contacts_url(str(project.id)))
        item = resp.json()[0]
        assert "contactName" in item
        assert "contactType" in item

    @pytest.mark.asyncio
    async def test_list_ordered_by_company_then_name(self, admin_client: AsyncClient, project: Project):
        await create_contact_via_api(admin_client, str(project.id),
                                      valid_contact_payload(contact_name="Zara", company_name="AlphaCo", email="z@a.com"))
        await create_contact_via_api(admin_client, str(project.id),
                                      valid_contact_payload(contact_name="Adam", company_name="AlphaCo", email="a@a.com"))
        await create_contact_via_api(admin_client, str(project.id),
                                      valid_contact_payload(contact_name="Mike", company_name="BetaCo", email="m@b.com"))
        resp = await admin_client.get(contacts_url(str(project.id)))
        items = resp.json()
        companies = [c["companyName"] for c in items]
        assert companies == sorted(companies)

    @pytest.mark.asyncio
    async def test_list_response_is_array(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.get(contacts_url(str(project.id)))
        assert isinstance(resp.json(), list)

    @pytest.mark.asyncio
    @pytest.mark.parametrize("count", [1, 5, 10])
    async def test_list_n_contacts(self, admin_client: AsyncClient, project: Project, count):
        for i in range(count):
            await create_contact_via_api(
                admin_client, str(project.id),
                valid_contact_payload(contact_name=f"Contact #{i}", email=f"c{i}@example.com")
            )
        resp = await admin_client.get(contacts_url(str(project.id)))
        assert len(resp.json()) == count


class TestUpdateContact:

    @pytest.mark.asyncio
    async def test_update_contact_name(self, admin_client: AsyncClient, project: Project):
        created = await create_contact_via_api(admin_client, str(project.id))
        resp = await admin_client.put(
            contact_detail_url(str(project.id), created["id"]),
            json={"contact_name": "Updated Name"},
        )
        assert resp.status_code == 200
        assert resp.json()["contactName"] == "Updated Name"

    @pytest.mark.asyncio
    async def test_update_contact_type(self, admin_client: AsyncClient, project: Project):
        created = await create_contact_via_api(admin_client, str(project.id))
        resp = await admin_client.put(
            contact_detail_url(str(project.id), created["id"]),
            json={"contact_type": "architect"},
        )
        assert resp.status_code == 200
        assert resp.json()["contactType"] == "architect"

    @pytest.mark.asyncio
    async def test_update_company_name(self, admin_client: AsyncClient, project: Project):
        created = await create_contact_via_api(admin_client, str(project.id))
        resp = await admin_client.put(
            contact_detail_url(str(project.id), created["id"]),
            json={"company_name": "NewCo LLC"},
        )
        assert resp.status_code == 200
        assert resp.json()["companyName"] == "NewCo LLC"

    @pytest.mark.asyncio
    async def test_update_email(self, admin_client: AsyncClient, project: Project):
        created = await create_contact_via_api(admin_client, str(project.id))
        resp = await admin_client.put(
            contact_detail_url(str(project.id), created["id"]),
            json={"email": "new@email.com"},
        )
        assert resp.status_code == 200
        assert resp.json()["email"] == "new@email.com"

    @pytest.mark.asyncio
    async def test_update_phone(self, admin_client: AsyncClient, project: Project):
        created = await create_contact_via_api(admin_client, str(project.id))
        resp = await admin_client.put(
            contact_detail_url(str(project.id), created["id"]),
            json={"phone": "+972-50-123-4567"},
        )
        assert resp.status_code == 200
        assert resp.json()["phone"] == "+972-50-123-4567"

    @pytest.mark.asyncio
    async def test_update_role_description(self, admin_client: AsyncClient, project: Project):
        created = await create_contact_via_api(admin_client, str(project.id))
        resp = await admin_client.put(
            contact_detail_url(str(project.id), created["id"]),
            json={"role_description": "Senior Architect"},
        )
        assert resp.status_code == 200
        assert resp.json()["roleDescription"] == "Senior Architect"

    @pytest.mark.asyncio
    async def test_update_is_primary(self, admin_client: AsyncClient, project: Project):
        created = await create_contact_via_api(admin_client, str(project.id))
        assert created["isPrimary"] is False
        resp = await admin_client.put(
            contact_detail_url(str(project.id), created["id"]),
            json={"is_primary": True},
        )
        assert resp.status_code == 200
        assert resp.json()["isPrimary"] is True

    @pytest.mark.asyncio
    async def test_update_preserves_unchanged_fields(self, admin_client: AsyncClient, project: Project):
        created = await create_contact_via_api(admin_client, str(project.id))
        original_type = created["contactType"]
        resp = await admin_client.put(
            contact_detail_url(str(project.id), created["id"]),
            json={"contact_name": "Only Name Changed"},
        )
        assert resp.status_code == 200
        assert resp.json()["contactType"] == original_type

    @pytest.mark.asyncio
    async def test_update_nonexistent_contact(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.put(
            contact_detail_url(str(project.id), FAKE_CONTACT_ID),
            json={"contact_name": "Ghost"},
        )
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_update_returns_camel_case(self, admin_client: AsyncClient, project: Project):
        created = await create_contact_via_api(admin_client, str(project.id))
        resp = await admin_client.put(
            contact_detail_url(str(project.id), created["id"]),
            json={"contact_name": "Camel Test"},
        )
        data = resp.json()
        assert "contactName" in data
        assert "contactType" in data
        assert "companyName" in data

    @pytest.mark.asyncio
    @pytest.mark.parametrize("name,expected_status", [
        ("AB", 200),
        ("A" * 255, 200),
        ("A", 422),
        ("", 422),
        ("A" * 256, 422),
    ])
    async def test_update_name_validation(self, admin_client: AsyncClient, project: Project, name, expected_status):
        created = await create_contact_via_api(admin_client, str(project.id))
        resp = await admin_client.put(
            contact_detail_url(str(project.id), created["id"]),
            json={"contact_name": name},
        )
        assert resp.status_code == expected_status

    @pytest.mark.asyncio
    async def test_update_contact_type_too_long(self, admin_client: AsyncClient, project: Project):
        created = await create_contact_via_api(admin_client, str(project.id))
        resp = await admin_client.put(
            contact_detail_url(str(project.id), created["id"]),
            json={"contact_type": "A" * 51},
        )
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_update_company_name_too_long(self, admin_client: AsyncClient, project: Project):
        created = await create_contact_via_api(admin_client, str(project.id))
        resp = await admin_client.put(
            contact_detail_url(str(project.id), created["id"]),
            json={"company_name": "A" * 256},
        )
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_update_role_description_too_long(self, admin_client: AsyncClient, project: Project):
        created = await create_contact_via_api(admin_client, str(project.id))
        resp = await admin_client.put(
            contact_detail_url(str(project.id), created["id"]),
            json={"role_description": "A" * 2001},
        )
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_update_invalid_email(self, admin_client: AsyncClient, project: Project):
        created = await create_contact_via_api(admin_client, str(project.id))
        resp = await admin_client.put(
            contact_detail_url(str(project.id), created["id"]),
            json={"email": "not-an-email"},
        )
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_update_invalid_phone(self, admin_client: AsyncClient, project: Project):
        created = await create_contact_via_api(admin_client, str(project.id))
        resp = await admin_client.put(
            contact_detail_url(str(project.id), created["id"]),
            json={"phone": "call me maybe"},
        )
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_update_multiple_fields_at_once(self, admin_client: AsyncClient, project: Project):
        created = await create_contact_via_api(admin_client, str(project.id))
        resp = await admin_client.put(
            contact_detail_url(str(project.id), created["id"]),
            json={
                "contact_name": "New Name",
                "company_name": "New Company",
                "role_description": "New Role",
                "is_primary": True,
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["contactName"] == "New Name"
        assert data["companyName"] == "New Company"
        assert data["roleDescription"] == "New Role"
        assert data["isPrimary"] is True

    @pytest.mark.asyncio
    @pytest.mark.parametrize("field", ["contact_name", "contact_type", "company_name", "role_description"])
    async def test_update_xss_sanitization(self, admin_client: AsyncClient, project: Project, field):
        created = await create_contact_via_api(admin_client, str(project.id))
        xss = '<script>alert("xss")</script>'
        val = f"Safe {xss} Text"
        resp = await admin_client.put(
            contact_detail_url(str(project.id), created["id"]),
            json={field: val},
        )
        if resp.status_code == 200:
            camel_map = {
                "contact_name": "contactName", "contact_type": "contactType",
                "company_name": "companyName", "role_description": "roleDescription",
            }
            result_val = resp.json().get(camel_map[field], "")
            if result_val:
                assert "<script" not in result_val.lower()

    @pytest.mark.asyncio
    async def test_update_with_empty_json(self, admin_client: AsyncClient, project: Project):
        created = await create_contact_via_api(admin_client, str(project.id))
        resp = await admin_client.put(
            contact_detail_url(str(project.id), created["id"]),
            json={},
        )
        assert resp.status_code == 200
        assert resp.json()["contactName"] == created["contactName"]


class TestDeleteContact:

    @pytest.mark.asyncio
    async def test_delete_contact_success(self, admin_client: AsyncClient, project: Project):
        created = await create_contact_via_api(admin_client, str(project.id))
        resp = await admin_client.delete(contact_detail_url(str(project.id), created["id"]))
        assert resp.status_code == 200
        assert resp.json()["message"] == "Contact deleted"

    @pytest.mark.asyncio
    async def test_delete_then_get_returns_404(self, admin_client: AsyncClient, project: Project):
        created = await create_contact_via_api(admin_client, str(project.id))
        await admin_client.delete(contact_detail_url(str(project.id), created["id"]))
        resp = await admin_client.get(contact_detail_url(str(project.id), created["id"]))
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_delete_nonexistent_contact(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.delete(contact_detail_url(str(project.id), FAKE_CONTACT_ID))
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_delete_removes_from_list(self, admin_client: AsyncClient, project: Project):
        created = await create_contact_via_api(admin_client, str(project.id))
        await admin_client.delete(contact_detail_url(str(project.id), created["id"]))
        resp = await admin_client.get(contacts_url(str(project.id)))
        assert len(resp.json()) == 0

    @pytest.mark.asyncio
    @pytest.mark.parametrize("delete_index", [0, 1, 2])
    async def test_delete_one_of_three(self, admin_client: AsyncClient, project: Project, delete_index):
        ids = []
        for i in range(3):
            c = await create_contact_via_api(
                admin_client, str(project.id),
                valid_contact_payload(contact_name=f"Contact {i}", email=f"c{i}@test.com")
            )
            ids.append(c["id"])
        await admin_client.delete(contact_detail_url(str(project.id), ids[delete_index]))
        resp = await admin_client.get(contacts_url(str(project.id)))
        remaining_ids = [c["id"] for c in resp.json()]
        assert ids[delete_index] not in remaining_ids
        assert len(remaining_ids) == 2

    @pytest.mark.asyncio
    async def test_delete_contact_from_wrong_project(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        created = await create_contact_via_api(admin_client, str(project.id))
        other_project = Project(
            id=uuid.uuid4(), name="Other", code="OTH-CDEL",
            status="active", created_by_id=admin_user.id,
        )
        db.add(other_project)
        await db.flush()
        db.add(ProjectMember(project_id=other_project.id, user_id=admin_user.id, role="project_admin"))
        await db.commit()
        resp = await admin_client.delete(contact_detail_url(str(other_project.id), created["id"]))
        assert resp.status_code == 404


class TestCSVExport:

    @pytest.mark.asyncio
    async def test_export_empty_csv(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.get(export_url(str(project.id)))
        assert resp.status_code == 200
        assert "text/csv" in resp.headers.get("content-type", "")

    @pytest.mark.asyncio
    async def test_export_csv_has_headers(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.get(export_url(str(project.id)))
        content = resp.text
        first_line = content.strip().split("\n")[0]
        assert "contact_name" in first_line
        assert "contact_type" in first_line
        assert "company_name" in first_line
        assert "email" in first_line
        assert "phone" in first_line

    @pytest.mark.asyncio
    async def test_export_csv_contains_contacts(self, admin_client: AsyncClient, project: Project):
        await create_contact_via_api(admin_client, str(project.id))
        resp = await admin_client.get(export_url(str(project.id)))
        content = resp.text
        lines = content.strip().split("\n")
        assert len(lines) == 2

    @pytest.mark.asyncio
    async def test_export_csv_multiple_contacts(self, admin_client: AsyncClient, project: Project):
        for i in range(3):
            await create_contact_via_api(
                admin_client, str(project.id),
                valid_contact_payload(contact_name=f"Contact {i}", email=f"c{i}@test.com")
            )
        resp = await admin_client.get(export_url(str(project.id)))
        lines = resp.text.strip().split("\n")
        assert len(lines) == 4

    @pytest.mark.asyncio
    async def test_export_csv_content_disposition(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.get(export_url(str(project.id)))
        cd = resp.headers.get("content-disposition", "")
        assert "attachment" in cd
        assert "contacts_" in cd
        assert ".csv" in cd

    @pytest.mark.asyncio
    async def test_export_csv_scoped_to_project(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        await create_contact_via_api(admin_client, str(project.id))
        other_project = Project(
            id=uuid.uuid4(), name="Other", code="OTH-EXP",
            status="active", created_by_id=admin_user.id,
        )
        db.add(other_project)
        await db.flush()
        db.add(ProjectMember(project_id=other_project.id, user_id=admin_user.id, role="project_admin"))
        await db.commit()
        resp = await admin_client.get(export_url(str(other_project.id)))
        lines = resp.text.strip().split("\n")
        assert len(lines) == 1


class TestCSVImport:

    @pytest.mark.asyncio
    async def test_import_csv_success(self, admin_client: AsyncClient, project: Project):
        csv_content = "contact_name,contact_type,company_name,email,phone\nAlice,contractor,ACME,alice@acme.com,555-0001\n"
        files = {"file": ("contacts.csv", io.BytesIO(csv_content.encode()), "text/csv")}
        resp = await admin_client.post(import_url(str(project.id)), files=files)
        assert resp.status_code == 200
        assert resp.json()["imported_count"] == 1

    @pytest.mark.asyncio
    async def test_import_csv_multiple_rows(self, admin_client: AsyncClient, project: Project):
        csv_content = (
            "contact_name,contact_type,company_name,email\n"
            "Alice,contractor,ACME,alice@acme.com\n"
            "Bob,client,BuildCo,bob@buildco.com\n"
            "Charlie,vendor,Supply Ltd,charlie@supply.com\n"
        )
        files = {"file": ("contacts.csv", io.BytesIO(csv_content.encode()), "text/csv")}
        resp = await admin_client.post(import_url(str(project.id)), files=files)
        assert resp.status_code == 200
        assert resp.json()["imported_count"] == 3

    @pytest.mark.asyncio
    async def test_import_csv_skips_rows_without_name(self, admin_client: AsyncClient, project: Project):
        csv_content = (
            "contact_name,contact_type,company_name\n"
            ",contractor,ACME\n"
            "Bob,client,BuildCo\n"
        )
        files = {"file": ("contacts.csv", io.BytesIO(csv_content.encode()), "text/csv")}
        resp = await admin_client.post(import_url(str(project.id)), files=files)
        assert resp.status_code == 200
        assert resp.json()["imported_count"] == 1

    @pytest.mark.asyncio
    async def test_import_csv_skips_rows_without_type(self, admin_client: AsyncClient, project: Project):
        csv_content = (
            "contact_name,contact_type,company_name\n"
            "Alice,,ACME\n"
            "Bob,client,BuildCo\n"
        )
        files = {"file": ("contacts.csv", io.BytesIO(csv_content.encode()), "text/csv")}
        resp = await admin_client.post(import_url(str(project.id)), files=files)
        assert resp.status_code == 200
        assert resp.json()["imported_count"] == 1

    @pytest.mark.asyncio
    async def test_import_csv_then_list(self, admin_client: AsyncClient, project: Project):
        csv_content = (
            "contact_name,contact_type,company_name\n"
            "Alice,contractor,ACME\n"
            "Bob,client,BuildCo\n"
        )
        files = {"file": ("contacts.csv", io.BytesIO(csv_content.encode()), "text/csv")}
        await admin_client.post(import_url(str(project.id)), files=files)
        resp = await admin_client.get(contacts_url(str(project.id)))
        assert len(resp.json()) == 2

    @pytest.mark.asyncio
    async def test_import_csv_empty_file(self, admin_client: AsyncClient, project: Project):
        csv_content = "contact_name,contact_type\n"
        files = {"file": ("contacts.csv", io.BytesIO(csv_content.encode()), "text/csv")}
        resp = await admin_client.post(import_url(str(project.id)), files=files)
        assert resp.status_code == 200
        assert resp.json()["imported_count"] == 0

    @pytest.mark.asyncio
    async def test_import_csv_with_bom(self, admin_client: AsyncClient, project: Project):
        csv_content = "\ufeffcontact_name,contact_type\nAlice,contractor\n"
        files = {"file": ("contacts.csv", io.BytesIO(csv_content.encode("utf-8-sig")), "text/csv")}
        resp = await admin_client.post(import_url(str(project.id)), files=files)
        assert resp.status_code == 200
        assert resp.json()["imported_count"] == 1

    @pytest.mark.asyncio
    async def test_import_csv_with_optional_fields(self, admin_client: AsyncClient, project: Project):
        csv_content = (
            "contact_name,contact_type,company_name,role_description,email,phone,notes\n"
            "Alice,contractor,ACME,Lead,alice@acme.com,555-0001,Note here\n"
        )
        files = {"file": ("contacts.csv", io.BytesIO(csv_content.encode()), "text/csv")}
        resp = await admin_client.post(import_url(str(project.id)), files=files)
        assert resp.status_code == 200
        assert resp.json()["imported_count"] == 1


class TestAuthRequirements:

    @pytest.mark.asyncio
    async def test_list_requires_auth(self, client: AsyncClient, project: Project):
        resp = await client.get(contacts_url(str(project.id)))
        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_get_requires_auth(self, client: AsyncClient, project: Project):
        resp = await client.get(contact_detail_url(str(project.id), FAKE_CONTACT_ID))
        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_create_requires_auth(self, client: AsyncClient, project: Project):
        resp = await client.post(contacts_url(str(project.id)), json=valid_contact_payload())
        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_update_requires_auth(self, client: AsyncClient, project: Project):
        resp = await client.put(
            contact_detail_url(str(project.id), FAKE_CONTACT_ID),
            json={"contact_name": "Auth Test"},
        )
        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_delete_requires_auth(self, client: AsyncClient, project: Project):
        resp = await client.delete(contact_detail_url(str(project.id), FAKE_CONTACT_ID))
        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_export_requires_auth(self, client: AsyncClient, project: Project):
        resp = await client.get(export_url(str(project.id)))
        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_import_requires_auth(self, client: AsyncClient, project: Project):
        csv_content = "contact_name,contact_type\nAlice,contractor\n"
        files = {"file": ("contacts.csv", io.BytesIO(csv_content.encode()), "text/csv")}
        resp = await client.post(import_url(str(project.id)), files=files)
        assert resp.status_code == 401


class TestProjectAccessControl:

    @pytest.mark.asyncio
    async def test_create_on_nonexistent_project(self, admin_client: AsyncClient):
        resp = await admin_client.post(contacts_url(FAKE_PROJECT_ID), json=valid_contact_payload())
        assert resp.status_code == 403

    @pytest.mark.asyncio
    async def test_list_on_nonexistent_project(self, admin_client: AsyncClient):
        resp = await admin_client.get(contacts_url(FAKE_PROJECT_ID))
        assert resp.status_code == 403

    @pytest.mark.asyncio
    async def test_get_on_nonexistent_project(self, admin_client: AsyncClient):
        resp = await admin_client.get(contact_detail_url(FAKE_PROJECT_ID, FAKE_CONTACT_ID))
        assert resp.status_code == 403

    @pytest.mark.asyncio
    async def test_update_on_nonexistent_project(self, admin_client: AsyncClient):
        resp = await admin_client.put(
            contact_detail_url(FAKE_PROJECT_ID, FAKE_CONTACT_ID),
            json={"contact_name": "No Access"},
        )
        assert resp.status_code == 403

    @pytest.mark.asyncio
    async def test_delete_on_nonexistent_project(self, admin_client: AsyncClient):
        resp = await admin_client.delete(contact_detail_url(FAKE_PROJECT_ID, FAKE_CONTACT_ID))
        assert resp.status_code == 403

    @pytest.mark.asyncio
    async def test_user_with_project_access_can_create(
        self, user_client: AsyncClient, project: Project, db: AsyncSession, regular_user: User
    ):
        db.add(ProjectMember(project_id=project.id, user_id=regular_user.id, role="contractor"))
        await db.commit()
        resp = await user_client.post(contacts_url(str(project.id)), json=valid_contact_payload())
        assert resp.status_code == 200

    @pytest.mark.asyncio
    async def test_user_without_project_access_cannot_create(
        self, user_client: AsyncClient, project: Project
    ):
        resp = await user_client.post(contacts_url(str(project.id)), json=valid_contact_payload())
        assert resp.status_code == 403

    @pytest.mark.asyncio
    async def test_user_without_project_access_cannot_list(
        self, user_client: AsyncClient, project: Project
    ):
        resp = await user_client.get(contacts_url(str(project.id)))
        assert resp.status_code == 403

    @pytest.mark.asyncio
    async def test_export_on_nonexistent_project(self, admin_client: AsyncClient):
        resp = await admin_client.get(export_url(FAKE_PROJECT_ID))
        assert resp.status_code == 403

    @pytest.mark.asyncio
    async def test_import_on_nonexistent_project(self, admin_client: AsyncClient):
        csv_content = "contact_name,contact_type\nAlice,contractor\n"
        files = {"file": ("contacts.csv", io.BytesIO(csv_content.encode()), "text/csv")}
        resp = await admin_client.post(import_url(FAKE_PROJECT_ID), files=files)
        assert resp.status_code == 403


class TestFullCRUDWorkflow:

    @pytest.mark.asyncio
    async def test_full_contact_lifecycle(self, admin_client: AsyncClient, project: Project):
        payload = valid_contact_payload()
        create_resp = await admin_client.post(contacts_url(str(project.id)), json=payload)
        assert create_resp.status_code == 200
        contact_id = create_resp.json()["id"]

        get_resp = await admin_client.get(contact_detail_url(str(project.id), contact_id))
        assert get_resp.status_code == 200
        assert get_resp.json()["contactName"] == payload["contact_name"]

        list_resp = await admin_client.get(contacts_url(str(project.id)))
        assert any(c["id"] == contact_id for c in list_resp.json())

        update_resp = await admin_client.put(
            contact_detail_url(str(project.id), contact_id),
            json={"contact_name": "Updated Contact", "is_primary": True},
        )
        assert update_resp.status_code == 200
        assert update_resp.json()["contactName"] == "Updated Contact"
        assert update_resp.json()["isPrimary"] is True

        delete_resp = await admin_client.delete(contact_detail_url(str(project.id), contact_id))
        assert delete_resp.status_code == 200

        gone_resp = await admin_client.get(contact_detail_url(str(project.id), contact_id))
        assert gone_resp.status_code == 404

    @pytest.mark.asyncio
    async def test_import_then_export_roundtrip(self, admin_client: AsyncClient, project: Project):
        csv_content = (
            "contact_name,contact_type,company_name,email,phone\n"
            "Alice,contractor,ACME,alice@acme.com,555-0001\n"
            "Bob,client,BuildCo,bob@buildco.com,555-0002\n"
        )
        files = {"file": ("contacts.csv", io.BytesIO(csv_content.encode()), "text/csv")}
        import_resp = await admin_client.post(import_url(str(project.id)), files=files)
        assert import_resp.json()["imported_count"] == 2
        export_resp = await admin_client.get(export_url(str(project.id)))
        export_lines = export_resp.text.strip().split("\n")
        assert len(export_lines) == 3


class TestParametrizedCreateAllFields:

    @pytest.mark.asyncio
    @pytest.mark.parametrize("payload,expected_status,desc", [
        ({"contact_name": "AB", "contact_type": "client"}, 200, "minimal payload"),
        ({"contact_name": "Full", "contact_type": "contractor", "company_name": "Co"}, 200, "with company"),
        ({"contact_name": "Full", "contact_type": "contractor", "email": "a@b.com"}, 200, "with email"),
        ({"contact_name": "Full", "contact_type": "contractor", "phone": "555-0001"}, 200, "with phone"),
        ({"contact_name": "Full", "contact_type": "contractor", "role_description": "Lead"}, 200, "with role"),
        ({"contact_name": "Full", "contact_type": "contractor", "is_primary": True}, 200, "with primary"),
        ({}, 422, "empty payload"),
        ({"contact_type": "contractor"}, 422, "missing name"),
        ({"contact_name": "Jane"}, 422, "missing type"),
        ({"contact_name": "", "contact_type": "client"}, 422, "empty name"),
        ({"contact_name": "A", "contact_type": "client"}, 422, "name too short"),
        ({"contact_name": "A" * 256, "contact_type": "client"}, 422, "name too long"),
        ({"contact_name": "Jane", "contact_type": ""}, 422, "empty type"),
    ])
    async def test_create_parametrized(self, admin_client: AsyncClient, project: Project, payload, expected_status, desc):
        resp = await admin_client.post(contacts_url(str(project.id)), json=payload)
        assert resp.status_code == expected_status, f"Failed: {desc}"


class TestParametrizedUpdateFields:

    @pytest.mark.asyncio
    @pytest.mark.parametrize("field,value,camel_key,expected_status", [
        ("contact_name", "Updated", "contactName", 200),
        ("contact_name", "AB", "contactName", 200),
        ("contact_name", "A" * 255, "contactName", 200),
        ("contact_name", "A", "contactName", 422),
        ("contact_name", "A" * 256, "contactName", 422),
        ("contact_type", "vendor", "contactType", 200),
        ("contact_type", "A" * 50, "contactType", 200),
        ("contact_type", "A" * 51, "contactType", 422),
        ("company_name", "NewCo", "companyName", 200),
        ("company_name", "A" * 255, "companyName", 200),
        ("company_name", "A" * 256, "companyName", 422),
        ("role_description", "Engineer", "roleDescription", 200),
        ("role_description", "A" * 2000, "roleDescription", 200),
        ("role_description", "A" * 2001, "roleDescription", 422),
    ])
    async def test_update_field_parametrized(
        self, admin_client: AsyncClient, project: Project, field, value, camel_key, expected_status
    ):
        created = await create_contact_via_api(admin_client, str(project.id))
        resp = await admin_client.put(
            contact_detail_url(str(project.id), created["id"]),
            json={field: value},
        )
        assert resp.status_code == expected_status, f"Update {field}={repr(value)[:40]}"
        if expected_status == 200:
            assert resp.json()[camel_key] == value


class TestResponseFormat:

    @pytest.mark.asyncio
    async def test_response_id_is_uuid_string(self, admin_client: AsyncClient, project: Project):
        created = await create_contact_via_api(admin_client, str(project.id))
        try:
            uuid.UUID(created["id"])
        except ValueError:
            pytest.fail("id is not a valid UUID string")

    @pytest.mark.asyncio
    async def test_response_project_id_matches(self, admin_client: AsyncClient, project: Project):
        created = await create_contact_via_api(admin_client, str(project.id))
        assert created["projectId"] == str(project.id)

    @pytest.mark.asyncio
    async def test_created_at_is_set(self, admin_client: AsyncClient, project: Project):
        created = await create_contact_via_api(admin_client, str(project.id))
        assert created["createdAt"] is not None

    @pytest.mark.asyncio
    @pytest.mark.parametrize("camel_field", [
        "contactName", "contactType", "companyName",
        "roleDescription", "isPrimary", "projectId", "createdAt",
    ])
    async def test_camel_case_field_present(self, admin_client: AsyncClient, project: Project, camel_field):
        resp = await admin_client.post(contacts_url(str(project.id)), json=valid_contact_payload())
        assert camel_field in resp.json()

    @pytest.mark.asyncio
    async def test_email_stored_correctly(self, admin_client: AsyncClient, project: Project):
        payload = valid_contact_payload(email="Test.Email@Example.COM")
        resp = await admin_client.post(contacts_url(str(project.id)), json=payload)
        assert resp.status_code == 200
        assert resp.json()["email"] is not None

    @pytest.mark.asyncio
    async def test_phone_stored_correctly(self, admin_client: AsyncClient, project: Project):
        payload = valid_contact_payload(phone="+1 (555) 123-4567")
        resp = await admin_client.post(contacts_url(str(project.id)), json=payload)
        assert resp.status_code == 200
        assert resp.json()["phone"] == "+1 (555) 123-4567"


class TestContactMultipleCreation:

    @pytest.mark.asyncio
    async def test_create_multiple_primary_contacts(self, admin_client: AsyncClient, project: Project):
        c1 = await create_contact_via_api(admin_client, str(project.id),
                                           valid_contact_payload(contact_name="Primary 1", is_primary=True, email="p1@x.com"))
        c2 = await create_contact_via_api(admin_client, str(project.id),
                                           valid_contact_payload(contact_name="Primary 2", is_primary=True, email="p2@x.com"))
        assert c1["isPrimary"] is True
        assert c2["isPrimary"] is True

    @pytest.mark.asyncio
    async def test_create_contacts_with_same_email(self, admin_client: AsyncClient, project: Project):
        c1 = await create_contact_via_api(admin_client, str(project.id),
                                           valid_contact_payload(contact_name="Alice"))
        c2 = await create_contact_via_api(admin_client, str(project.id),
                                           valid_contact_payload(contact_name="Bob"))
        assert c1["id"] != c2["id"]

    @pytest.mark.asyncio
    async def test_create_contacts_same_name_different_type(self, admin_client: AsyncClient, project: Project):
        c1 = await create_contact_via_api(admin_client, str(project.id),
                                           valid_contact_payload(contact_type="contractor", email="a@a.com"))
        c2 = await create_contact_via_api(admin_client, str(project.id),
                                           valid_contact_payload(contact_type="client", email="b@b.com"))
        assert c1["contactType"] == "contractor"
        assert c2["contactType"] == "client"

    @pytest.mark.asyncio
    async def test_toggle_is_primary(self, admin_client: AsyncClient, project: Project):
        created = await create_contact_via_api(admin_client, str(project.id),
                                                valid_contact_payload(is_primary=False))
        assert created["isPrimary"] is False
        resp = await admin_client.put(
            contact_detail_url(str(project.id), created["id"]),
            json={"is_primary": True},
        )
        assert resp.json()["isPrimary"] is True
        resp = await admin_client.put(
            contact_detail_url(str(project.id), created["id"]),
            json={"is_primary": False},
        )
        assert resp.json()["isPrimary"] is False


class TestNotFoundAndEdgeCases:

    @pytest.mark.asyncio
    async def test_double_delete(self, admin_client: AsyncClient, project: Project):
        created = await create_contact_via_api(admin_client, str(project.id))
        await admin_client.delete(contact_detail_url(str(project.id), created["id"]))
        resp = await admin_client.delete(contact_detail_url(str(project.id), created["id"]))
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_update_deleted_contact(self, admin_client: AsyncClient, project: Project):
        created = await create_contact_via_api(admin_client, str(project.id))
        await admin_client.delete(contact_detail_url(str(project.id), created["id"]))
        resp = await admin_client.put(
            contact_detail_url(str(project.id), created["id"]),
            json={"contact_name": "Ghost"},
        )
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_create_with_unicode_name(self, admin_client: AsyncClient, project: Project):
        payload = valid_contact_payload(contact_name="איש קשר בדיקה")
        resp = await admin_client.post(contacts_url(str(project.id)), json=payload)
        assert resp.status_code == 200
        assert resp.json()["contactName"] == "איש קשר בדיקה"

    @pytest.mark.asyncio
    async def test_create_with_special_chars(self, admin_client: AsyncClient, project: Project):
        payload = valid_contact_payload(contact_name="John O'Brien-Smith")
        resp = await admin_client.post(contacts_url(str(project.id)), json=payload)
        assert resp.status_code == 200

    @pytest.mark.asyncio
    async def test_contacts_from_different_projects_not_visible(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        proj_a = project
        proj_b = Project(
            id=uuid.uuid4(), name="Project B", code="PRJ-CB",
            status="active", created_by_id=admin_user.id,
        )
        db.add(proj_b)
        await db.flush()
        db.add(ProjectMember(project_id=proj_b.id, user_id=admin_user.id, role="project_admin"))
        await db.commit()
        await create_contact_via_api(admin_client, str(proj_a.id),
                                      valid_contact_payload(contact_name="Contact A", email="a@a.com"))
        await create_contact_via_api(admin_client, str(proj_b.id),
                                      valid_contact_payload(contact_name="Contact B", email="b@b.com"))
        resp_a = await admin_client.get(contacts_url(str(proj_a.id)))
        resp_b = await admin_client.get(contacts_url(str(proj_b.id)))
        names_a = [c["contactName"] for c in resp_a.json()]
        names_b = [c["contactName"] for c in resp_b.json()]
        assert "Contact A" in names_a
        assert "Contact B" not in names_a
        assert "Contact B" in names_b
        assert "Contact A" not in names_b

    @pytest.mark.asyncio
    async def test_create_with_whitespace_name(self, admin_client: AsyncClient, project: Project):
        payload = valid_contact_payload(contact_name="   Padded Name   ")
        resp = await admin_client.post(contacts_url(str(project.id)), json=payload)
        assert resp.status_code == 200
