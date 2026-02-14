import io
import uuid
from datetime import datetime, timedelta

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.project import Project, ProjectMember
from app.models.user import User

API_V1 = "/api/v1"
FAKE_PROJECT_ID = str(uuid.uuid4())
FAKE_CONTACT_ID = str(uuid.uuid4())
FAKE_MEETING_ID = str(uuid.uuid4())


def contacts_url(project_id: str) -> str:
    return f"{API_V1}/projects/{project_id}/contacts"


def contact_detail_url(project_id: str, contact_id: str) -> str:
    return f"{API_V1}/projects/{project_id}/contacts/{contact_id}"


def contacts_export_url(project_id: str) -> str:
    return f"{API_V1}/projects/{project_id}/contacts/export"


def contacts_import_url(project_id: str) -> str:
    return f"{API_V1}/projects/{project_id}/contacts/import"


def meetings_url(project_id: str) -> str:
    return f"{API_V1}/projects/{project_id}/meetings"


def meetings_flat_url() -> str:
    return f"{API_V1}/meetings"


def meeting_detail_url(project_id: str, meeting_id: str) -> str:
    return f"{API_V1}/projects/{project_id}/meetings/{meeting_id}"


def meeting_attendees_url(project_id: str, meeting_id: str) -> str:
    return f"{API_V1}/projects/{project_id}/meetings/{meeting_id}/attendees"


def meeting_attendee_url(project_id: str, meeting_id: str, user_id: str) -> str:
    return f"{API_V1}/projects/{project_id}/meetings/{meeting_id}/attendees/{user_id}"


def valid_contact_payload(**overrides) -> dict:
    base = {
        "contact_name": "John Doe",
        "contact_type": "contractor",
        "company_name": "ABC Corp",
        "email": "john@abc.com",
        "phone": "050-1234567",
        "role_description": "Site Manager",
    }
    base.update(overrides)
    return base


def valid_meeting_payload(**overrides) -> dict:
    base = {
        "title": "Weekly Progress Meeting",
        "description": "Discuss weekly progress",
        "scheduled_date": (datetime.utcnow() + timedelta(days=1)).isoformat(),
        "location": "Site Office",
        "meeting_type": "progress",
    }
    base.update(overrides)
    return base


async def create_contact_via_api(client: AsyncClient, project_id: str, payload: dict = None) -> dict:
    data = payload or valid_contact_payload()
    resp = await client.post(contacts_url(project_id), json=data)
    assert resp.status_code == 200
    return resp.json()


async def create_meeting_via_api(client: AsyncClient, project_id: str, payload: dict = None) -> dict:
    data = payload or valid_meeting_payload()
    resp = await client.post(meetings_url(project_id), json=data)
    assert resp.status_code == 200
    return resp.json()


async def create_second_project(db: AsyncSession, admin_user: User) -> Project:
    proj = Project(
        id=uuid.uuid4(),
        name="Second Project",
        code="TEST-002",
        description="Second test project",
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


# =============================================================================
# CONTACTS CRUD TESTS
# =============================================================================


class TestCreateContact:

    @pytest.mark.asyncio
    async def test_create_contact_success(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.post(contacts_url(str(project.id)), json=valid_contact_payload())
        assert resp.status_code == 200
        data = resp.json()
        assert data["contactName"] == "John Doe"
        assert data["contactType"] == "contractor"
        assert data["companyName"] == "ABC Corp"
        assert data["email"] == "john@abc.com"
        assert "id" in data

    @pytest.mark.asyncio
    async def test_create_contact_missing_contact_name(self, admin_client: AsyncClient, project: Project):
        payload = valid_contact_payload()
        del payload["contact_name"]
        resp = await admin_client.post(contacts_url(str(project.id)), json=payload)
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_create_contact_missing_contact_type(self, admin_client: AsyncClient, project: Project):
        payload = valid_contact_payload()
        del payload["contact_type"]
        resp = await admin_client.post(contacts_url(str(project.id)), json=payload)
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_create_contact_empty_contact_name(self, admin_client: AsyncClient, project: Project):
        payload = valid_contact_payload(contact_name="")
        resp = await admin_client.post(contacts_url(str(project.id)), json=payload)
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_create_contact_empty_contact_type(self, admin_client: AsyncClient, project: Project):
        payload = valid_contact_payload(contact_type="")
        resp = await admin_client.post(contacts_url(str(project.id)), json=payload)
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_create_contact_with_all_fields(self, admin_client: AsyncClient, project: Project):
        payload = valid_contact_payload(
            is_primary=True,
            role_description="Lead Contractor for foundations",
        )
        resp = await admin_client.post(contacts_url(str(project.id)), json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["isPrimary"] is True
        assert data["roleDescription"] == "Lead Contractor for foundations"

    @pytest.mark.asyncio
    async def test_create_contact_minimal_fields(self, admin_client: AsyncClient, project: Project):
        payload = {"contact_name": "Min Contact", "contact_type": "other", "email": "min@test.com"}
        resp = await admin_client.post(contacts_url(str(project.id)), json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["contactName"] == "Min Contact"
        assert data["companyName"] is None
        assert data["phone"] is None

    @pytest.mark.asyncio
    async def test_create_contact_invalid_email(self, admin_client: AsyncClient, project: Project):
        payload = valid_contact_payload(email="not-an-email")
        resp = await admin_client.post(contacts_url(str(project.id)), json=payload)
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_create_contact_invalid_phone(self, admin_client: AsyncClient, project: Project):
        payload = valid_contact_payload(phone="abc-not-phone!")
        resp = await admin_client.post(contacts_url(str(project.id)), json=payload)
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_create_contact_various_types(self, admin_client: AsyncClient, project: Project):
        types = ["contractor", "subcontractor", "supplier", "consultant", "architect", "engineer", "inspector", "client", "other"]
        for i, ctype in enumerate(types):
            resp = await admin_client.post(
                contacts_url(str(project.id)),
                json={"contact_name": f"Test {ctype}", "contact_type": ctype, "email": f"type{i}@test.com"},
            )
            assert resp.status_code == 200
            assert resp.json()["contactType"] == ctype

    @pytest.mark.asyncio
    async def test_create_contact_xss_sanitized(self, admin_client: AsyncClient, project: Project):
        payload = valid_contact_payload(contact_name='<script>alert("xss")</script>Safe Name')
        resp = await admin_client.post(contacts_url(str(project.id)), json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert "<script>" not in data["contactName"]
        assert "Safe Name" in data["contactName"]


class TestListContacts:

    @pytest.mark.asyncio
    async def test_list_contacts_empty(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.get(contacts_url(str(project.id)))
        assert resp.status_code == 200
        assert resp.json() == []

    @pytest.mark.asyncio
    async def test_list_contacts_with_data(self, admin_client: AsyncClient, project: Project):
        await create_contact_via_api(admin_client, str(project.id))
        await create_contact_via_api(admin_client, str(project.id), valid_contact_payload(contact_name="Jane Doe", email="jane@test.com"))
        resp = await admin_client.get(contacts_url(str(project.id)))
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 2

    @pytest.mark.asyncio
    async def test_list_contacts_ordered_by_company_then_name(self, admin_client: AsyncClient, project: Project):
        await create_contact_via_api(admin_client, str(project.id), valid_contact_payload(contact_name="Zara", company_name="B Corp"))
        await create_contact_via_api(admin_client, str(project.id), valid_contact_payload(contact_name="Alice", company_name="A Corp", email="a@a.com"))
        await create_contact_via_api(admin_client, str(project.id), valid_contact_payload(contact_name="Bob", company_name="A Corp", email="b@b.com"))
        resp = await admin_client.get(contacts_url(str(project.id)))
        data = resp.json()
        assert len(data) == 3
        assert data[0]["companyName"] == "A Corp"
        assert data[1]["companyName"] == "A Corp"
        assert data[2]["companyName"] == "B Corp"

    @pytest.mark.asyncio
    async def test_list_contacts_project_isolation(self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User):
        await create_contact_via_api(admin_client, str(project.id))
        proj2 = await create_second_project(db, admin_user)
        await create_contact_via_api(admin_client, str(proj2.id), valid_contact_payload(contact_name="Other Project Contact", email="other@test.com"))
        resp1 = await admin_client.get(contacts_url(str(project.id)))
        resp2 = await admin_client.get(contacts_url(str(proj2.id)))
        assert len(resp1.json()) == 1
        assert len(resp2.json()) == 1
        assert resp1.json()[0]["contactName"] == "John Doe"
        assert resp2.json()[0]["contactName"] == "Other Project Contact"


class TestGetContact:

    @pytest.mark.asyncio
    async def test_get_contact_success(self, admin_client: AsyncClient, project: Project):
        created = await create_contact_via_api(admin_client, str(project.id))
        resp = await admin_client.get(contact_detail_url(str(project.id), created["id"]))
        assert resp.status_code == 200
        assert resp.json()["contactName"] == "John Doe"

    @pytest.mark.asyncio
    async def test_get_contact_not_found(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.get(contact_detail_url(str(project.id), FAKE_CONTACT_ID))
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_get_contact_wrong_project(self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User):
        created = await create_contact_via_api(admin_client, str(project.id))
        proj2 = await create_second_project(db, admin_user)
        resp = await admin_client.get(contact_detail_url(str(proj2.id), created["id"]))
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_get_contact_has_all_response_fields(self, admin_client: AsyncClient, project: Project):
        created = await create_contact_via_api(admin_client, str(project.id))
        resp = await admin_client.get(contact_detail_url(str(project.id), created["id"]))
        data = resp.json()
        assert "id" in data
        assert "projectId" in data
        assert "contactName" in data
        assert "contactType" in data
        assert "createdAt" in data


class TestUpdateContact:

    @pytest.mark.asyncio
    async def test_update_contact_full(self, admin_client: AsyncClient, project: Project):
        created = await create_contact_via_api(admin_client, str(project.id))
        update_payload = {
            "contact_name": "Updated Name",
            "contact_type": "architect",
            "company_name": "New Corp",
            "email": "updated@new.com",
            "phone": "052-9876543",
            "role_description": "Architect Lead",
            "is_primary": True,
        }
        resp = await admin_client.put(contact_detail_url(str(project.id), created["id"]), json=update_payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["contactName"] == "Updated Name"
        assert data["contactType"] == "architect"
        assert data["companyName"] == "New Corp"
        assert data["isPrimary"] is True

    @pytest.mark.asyncio
    async def test_update_contact_partial(self, admin_client: AsyncClient, project: Project):
        created = await create_contact_via_api(admin_client, str(project.id))
        resp = await admin_client.put(
            contact_detail_url(str(project.id), created["id"]),
            json={"company_name": "Partial Update Corp"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["companyName"] == "Partial Update Corp"
        assert data["contactName"] == "John Doe"

    @pytest.mark.asyncio
    async def test_update_contact_change_type(self, admin_client: AsyncClient, project: Project):
        created = await create_contact_via_api(admin_client, str(project.id))
        resp = await admin_client.put(
            contact_detail_url(str(project.id), created["id"]),
            json={"contact_type": "engineer"},
        )
        assert resp.status_code == 200
        assert resp.json()["contactType"] == "engineer"

    @pytest.mark.asyncio
    async def test_update_contact_not_found(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.put(
            contact_detail_url(str(project.id), FAKE_CONTACT_ID),
            json={"contact_name": "Ghost"},
        )
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_update_contact_wrong_project(self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User):
        created = await create_contact_via_api(admin_client, str(project.id))
        proj2 = await create_second_project(db, admin_user)
        resp = await admin_client.put(
            contact_detail_url(str(proj2.id), created["id"]),
            json={"contact_name": "Cross project"},
        )
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_update_contact_set_primary(self, admin_client: AsyncClient, project: Project):
        created = await create_contact_via_api(admin_client, str(project.id))
        assert created["isPrimary"] is False
        resp = await admin_client.put(
            contact_detail_url(str(project.id), created["id"]),
            json={"is_primary": True},
        )
        assert resp.status_code == 200
        assert resp.json()["isPrimary"] is True


class TestDeleteContact:

    @pytest.mark.asyncio
    async def test_delete_contact_success(self, admin_client: AsyncClient, project: Project):
        created = await create_contact_via_api(admin_client, str(project.id))
        resp = await admin_client.delete(contact_detail_url(str(project.id), created["id"]))
        assert resp.status_code == 200
        assert resp.json()["message"] == "Contact deleted"
        get_resp = await admin_client.get(contact_detail_url(str(project.id), created["id"]))
        assert get_resp.status_code == 404

    @pytest.mark.asyncio
    async def test_delete_contact_not_found(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.delete(contact_detail_url(str(project.id), FAKE_CONTACT_ID))
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_delete_contact_wrong_project(self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User):
        created = await create_contact_via_api(admin_client, str(project.id))
        proj2 = await create_second_project(db, admin_user)
        resp = await admin_client.delete(contact_detail_url(str(proj2.id), created["id"]))
        assert resp.status_code == 404
        still_exists = await admin_client.get(contact_detail_url(str(project.id), created["id"]))
        assert still_exists.status_code == 200

    @pytest.mark.asyncio
    async def test_delete_contact_removes_from_list(self, admin_client: AsyncClient, project: Project):
        c1 = await create_contact_via_api(admin_client, str(project.id))
        await create_contact_via_api(admin_client, str(project.id), valid_contact_payload(contact_name="Keep Me", email="keep@test.com"))
        await admin_client.delete(contact_detail_url(str(project.id), c1["id"]))
        resp = await admin_client.get(contacts_url(str(project.id)))
        assert len(resp.json()) == 1
        assert resp.json()[0]["contactName"] == "Keep Me"


# =============================================================================
# CONTACTS CSV IMPORT/EXPORT TESTS
# =============================================================================


class TestExportContactsCsv:

    @pytest.mark.asyncio
    async def test_export_empty_project(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.get(contacts_export_url(str(project.id)))
        assert resp.status_code == 200
        assert "text/csv" in resp.headers["content-type"]
        lines = resp.text.strip().split("\n")
        assert len(lines) == 1
        assert "contact_name" in lines[0]

    @pytest.mark.asyncio
    async def test_export_with_contacts(self, admin_client: AsyncClient, project: Project):
        await create_contact_via_api(admin_client, str(project.id))
        await create_contact_via_api(admin_client, str(project.id), valid_contact_payload(contact_name="Jane", email="jane@test.com"))
        resp = await admin_client.get(contacts_export_url(str(project.id)))
        assert resp.status_code == 200
        lines = resp.text.strip().split("\n")
        assert len(lines) == 3

    @pytest.mark.asyncio
    async def test_export_csv_headers(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.get(contacts_export_url(str(project.id)))
        header_line = resp.text.strip().split("\n")[0]
        expected_headers = ["contact_name", "contact_type", "company_name", "role_description", "email", "phone", "notes"]
        for header in expected_headers:
            assert header in header_line

    @pytest.mark.asyncio
    async def test_export_csv_content_values(self, admin_client: AsyncClient, project: Project):
        await create_contact_via_api(admin_client, str(project.id))
        resp = await admin_client.get(contacts_export_url(str(project.id)))
        content = resp.text
        assert "John Doe" in content
        assert "contractor" in content
        assert "ABC Corp" in content
        assert "john@abc.com" in content

    @pytest.mark.asyncio
    async def test_export_csv_content_disposition(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.get(contacts_export_url(str(project.id)))
        assert "content-disposition" in resp.headers
        assert "attachment" in resp.headers["content-disposition"]
        assert "contacts_" in resp.headers["content-disposition"]

    @pytest.mark.asyncio
    async def test_export_csv_ordered(self, admin_client: AsyncClient, project: Project):
        await create_contact_via_api(admin_client, str(project.id), valid_contact_payload(contact_name="Zara", company_name="ZZZ Corp", email="z@z.com"))
        await create_contact_via_api(admin_client, str(project.id), valid_contact_payload(contact_name="Alice", company_name="AAA Corp", email="a@a.com"))
        resp = await admin_client.get(contacts_export_url(str(project.id)))
        lines = resp.text.strip().split("\n")
        assert "AAA Corp" in lines[1]
        assert "ZZZ Corp" in lines[2]


class TestImportContactsCsv:

    @pytest.mark.asyncio
    async def test_import_valid_csv(self, admin_client: AsyncClient, project: Project):
        csv_content = "contact_name,contact_type,company_name,role_description,email,phone,notes\nBob,engineer,BuildCo,Lead,bob@b.com,555-999,"
        files = {"file": ("contacts.csv", io.BytesIO(csv_content.encode()), "text/csv")}
        resp = await admin_client.post(contacts_import_url(str(project.id)), files=files)
        assert resp.status_code == 200
        data = resp.json()
        assert data["imported_count"] == 1

    @pytest.mark.asyncio
    async def test_import_multiple_rows(self, admin_client: AsyncClient, project: Project):
        csv_content = (
            "contact_name,contact_type,company_name,role_description,email,phone,notes\n"
            "Bob,engineer,BuildCo,,bob@b.com,555-001,\n"
            "Alice,architect,DesignCo,,alice@d.com,555-002,\n"
            "Charlie,inspector,SafetyCo,,charlie@s.com,555-003,\n"
        )
        files = {"file": ("contacts.csv", io.BytesIO(csv_content.encode()), "text/csv")}
        resp = await admin_client.post(contacts_import_url(str(project.id)), files=files)
        assert resp.status_code == 200
        assert resp.json()["imported_count"] == 3

    @pytest.mark.asyncio
    async def test_import_skips_rows_missing_contact_name(self, admin_client: AsyncClient, project: Project):
        csv_content = (
            "contact_name,contact_type,company_name,role_description,email,phone,notes\n"
            ",engineer,BuildCo,,bob@b.com,,\n"
            "Valid,architect,DesignCo,,,,\n"
        )
        files = {"file": ("contacts.csv", io.BytesIO(csv_content.encode()), "text/csv")}
        resp = await admin_client.post(contacts_import_url(str(project.id)), files=files)
        assert resp.status_code == 200
        assert resp.json()["imported_count"] == 1

    @pytest.mark.asyncio
    async def test_import_skips_rows_missing_contact_type(self, admin_client: AsyncClient, project: Project):
        csv_content = (
            "contact_name,contact_type,company_name,role_description,email,phone,notes\n"
            "Bob,,BuildCo,,bob@b.com,,\n"
            "Valid,engineer,DesignCo,,,,\n"
        )
        files = {"file": ("contacts.csv", io.BytesIO(csv_content.encode()), "text/csv")}
        resp = await admin_client.post(contacts_import_url(str(project.id)), files=files)
        assert resp.status_code == 200
        assert resp.json()["imported_count"] == 1

    @pytest.mark.asyncio
    async def test_import_empty_csv_body(self, admin_client: AsyncClient, project: Project):
        csv_content = "contact_name,contact_type,company_name,role_description,email,phone,notes\n"
        files = {"file": ("contacts.csv", io.BytesIO(csv_content.encode()), "text/csv")}
        resp = await admin_client.post(contacts_import_url(str(project.id)), files=files)
        assert resp.status_code == 200
        assert resp.json()["imported_count"] == 0

    @pytest.mark.asyncio
    async def test_import_with_bom_encoding(self, admin_client: AsyncClient, project: Project):
        csv_content = "contact_name,contact_type,company_name,role_description,email,phone,notes\nBob,engineer,BuildCo,,bob@b.com,,"
        bom_bytes = b"\xef\xbb\xbf" + csv_content.encode("utf-8")
        files = {"file": ("contacts.csv", io.BytesIO(bom_bytes), "text/csv")}
        resp = await admin_client.post(contacts_import_url(str(project.id)), files=files)
        assert resp.status_code == 200
        assert resp.json()["imported_count"] == 1

    @pytest.mark.asyncio
    async def test_import_special_characters_in_names(self, admin_client: AsyncClient, project: Project):
        csv_content = (
            "contact_name,contact_type,company_name,role_description,email,phone,notes\n"
            "Jose Garcia-Lopez,contractor,Construccion S.A.,,jose@c.com,,\n"
        )
        files = {"file": ("contacts.csv", io.BytesIO(csv_content.encode()), "text/csv")}
        resp = await admin_client.post(contacts_import_url(str(project.id)), files=files)
        assert resp.status_code == 200
        assert resp.json()["imported_count"] == 1
        contacts_resp = await admin_client.get(contacts_url(str(project.id)))
        names = [c["contactName"] for c in contacts_resp.json()]
        assert "Jose Garcia-Lopez" in names

    @pytest.mark.asyncio
    async def test_import_duplicate_entries(self, admin_client: AsyncClient, project: Project):
        csv_content = (
            "contact_name,contact_type,company_name,role_description,email,phone,notes\n"
            "Duplicate,contractor,Corp,,d@d.com,,\n"
            "Duplicate,contractor,Corp,,d@d.com,,\n"
        )
        files = {"file": ("contacts.csv", io.BytesIO(csv_content.encode()), "text/csv")}
        resp = await admin_client.post(contacts_import_url(str(project.id)), files=files)
        assert resp.status_code == 200
        assert resp.json()["imported_count"] == 2

    @pytest.mark.asyncio
    async def test_import_then_verify_in_list(self, admin_client: AsyncClient, project: Project):
        csv_content = (
            "contact_name,contact_type,company_name,role_description,email,phone,notes\n"
            "Imported Person,supplier,SupplyCo,,supply@co.com,555-7777,\n"
        )
        files = {"file": ("contacts.csv", io.BytesIO(csv_content.encode()), "text/csv")}
        await admin_client.post(contacts_import_url(str(project.id)), files=files)
        resp = await admin_client.get(contacts_url(str(project.id)))
        assert len(resp.json()) == 1
        assert resp.json()[0]["contactName"] == "Imported Person"
        assert resp.json()[0]["companyName"] == "SupplyCo"

    @pytest.mark.asyncio
    async def test_export_then_reimport(self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User):
        await create_contact_via_api(admin_client, str(project.id))
        await create_contact_via_api(admin_client, str(project.id), valid_contact_payload(contact_name="Second", contact_type="architect", email="s@s.com"))
        export_resp = await admin_client.get(contacts_export_url(str(project.id)))
        csv_text = export_resp.text
        proj2 = await create_second_project(db, admin_user)
        files = {"file": ("contacts.csv", io.BytesIO(csv_text.encode()), "text/csv")}
        import_resp = await admin_client.post(contacts_import_url(str(proj2.id)), files=files)
        assert import_resp.status_code == 200
        assert import_resp.json()["imported_count"] == 2

    @pytest.mark.asyncio
    async def test_import_whitespace_trimmed(self, admin_client: AsyncClient, project: Project):
        csv_content = (
            "contact_name,contact_type,company_name,role_description,email,phone,notes\n"
            "  Trimmed Name  ,  contractor  ,  Some Corp  ,,trim@t.com,,\n"
        )
        files = {"file": ("contacts.csv", io.BytesIO(csv_content.encode()), "text/csv")}
        resp = await admin_client.post(contacts_import_url(str(project.id)), files=files)
        assert resp.status_code == 200
        assert resp.json()["imported_count"] == 1
        contacts_resp = await admin_client.get(contacts_url(str(project.id)))
        assert contacts_resp.json()[0]["contactName"] == "Trimmed Name"

    @pytest.mark.asyncio
    async def test_import_optional_fields_empty(self, admin_client: AsyncClient, project: Project):
        csv_content = (
            "contact_name,contact_type,company_name,role_description,email,phone,notes\n"
            "Bare Minimum,consultant,,,,,"
        )
        files = {"file": ("contacts.csv", io.BytesIO(csv_content.encode()), "text/csv")}
        resp = await admin_client.post(contacts_import_url(str(project.id)), files=files)
        assert resp.status_code == 200
        assert resp.json()["imported_count"] == 1


# =============================================================================
# MEETINGS CRUD TESTS
# =============================================================================


class TestCreateMeeting:

    @pytest.mark.asyncio
    async def test_create_meeting_success(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.post(meetings_url(str(project.id)), json=valid_meeting_payload())
        assert resp.status_code == 200
        data = resp.json()
        assert data["title"] == "Weekly Progress Meeting"
        assert data["status"] == "scheduled"
        assert "id" in data

    @pytest.mark.asyncio
    async def test_create_meeting_missing_title(self, admin_client: AsyncClient, project: Project):
        payload = valid_meeting_payload()
        del payload["title"]
        resp = await admin_client.post(meetings_url(str(project.id)), json=payload)
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_create_meeting_missing_scheduled_date(self, admin_client: AsyncClient, project: Project):
        payload = valid_meeting_payload()
        del payload["scheduled_date"]
        resp = await admin_client.post(meetings_url(str(project.id)), json=payload)
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_create_meeting_empty_title(self, admin_client: AsyncClient, project: Project):
        payload = valid_meeting_payload(title="")
        resp = await admin_client.post(meetings_url(str(project.id)), json=payload)
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_create_meeting_with_all_fields(self, admin_client: AsyncClient, project: Project):
        payload = valid_meeting_payload(
            scheduled_time="10:00",
            meeting_type="safety",
        )
        resp = await admin_client.post(meetings_url(str(project.id)), json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["scheduledTime"] == "10:00"
        assert data["meetingType"] == "safety"

    @pytest.mark.asyncio
    async def test_create_meeting_various_types(self, admin_client: AsyncClient, project: Project):
        types = ["site_visit", "progress", "safety", "kickoff", "closeout", "other"]
        for mtype in types:
            resp = await admin_client.post(
                meetings_url(str(project.id)),
                json=valid_meeting_payload(title=f"Meeting {mtype}", meeting_type=mtype),
            )
            assert resp.status_code == 200
            assert resp.json()["meetingType"] == mtype

    @pytest.mark.asyncio
    async def test_create_meeting_minimal_fields(self, admin_client: AsyncClient, project: Project):
        payload = {
            "title": "Quick Standup",
            "scheduled_date": datetime.utcnow().isoformat(),
        }
        resp = await admin_client.post(meetings_url(str(project.id)), json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["title"] == "Quick Standup"
        assert data["description"] is None
        assert data["location"] is None

    @pytest.mark.asyncio
    async def test_create_meeting_has_created_by(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.post(meetings_url(str(project.id)), json=valid_meeting_payload())
        data = resp.json()
        assert data["createdBy"] is not None
        assert data["createdBy"]["email"] == "admin@test.com"

    @pytest.mark.asyncio
    async def test_create_meeting_default_status_scheduled(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.post(meetings_url(str(project.id)), json=valid_meeting_payload())
        assert resp.json()["status"] == "scheduled"

    @pytest.mark.asyncio
    async def test_create_meeting_xss_sanitized(self, admin_client: AsyncClient, project: Project):
        payload = valid_meeting_payload(title='<script>alert("xss")</script>Safe Title')
        resp = await admin_client.post(meetings_url(str(project.id)), json=payload)
        assert resp.status_code == 200
        assert "<script>" not in resp.json()["title"]
        assert "Safe Title" in resp.json()["title"]


class TestListMeetings:

    @pytest.mark.asyncio
    async def test_list_meetings_empty(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.get(meetings_url(str(project.id)))
        assert resp.status_code == 200
        assert resp.json() == []

    @pytest.mark.asyncio
    async def test_list_meetings_with_data(self, admin_client: AsyncClient, project: Project):
        await create_meeting_via_api(admin_client, str(project.id))
        await create_meeting_via_api(admin_client, str(project.id), valid_meeting_payload(title="Second Meeting"))
        resp = await admin_client.get(meetings_url(str(project.id)))
        assert resp.status_code == 200
        assert len(resp.json()) == 2

    @pytest.mark.asyncio
    async def test_list_meetings_ordered_by_date_desc(self, admin_client: AsyncClient, project: Project):
        past = (datetime.utcnow() - timedelta(days=5)).isoformat()
        future = (datetime.utcnow() + timedelta(days=5)).isoformat()
        await create_meeting_via_api(admin_client, str(project.id), valid_meeting_payload(title="Past Meeting", scheduled_date=past))
        await create_meeting_via_api(admin_client, str(project.id), valid_meeting_payload(title="Future Meeting", scheduled_date=future))
        resp = await admin_client.get(meetings_url(str(project.id)))
        data = resp.json()
        assert data[0]["title"] == "Future Meeting"
        assert data[1]["title"] == "Past Meeting"

    @pytest.mark.asyncio
    async def test_list_meetings_project_isolation(self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User):
        await create_meeting_via_api(admin_client, str(project.id))
        proj2 = await create_second_project(db, admin_user)
        await create_meeting_via_api(admin_client, str(proj2.id), valid_meeting_payload(title="Other Project Meeting"))
        resp1 = await admin_client.get(meetings_url(str(project.id)))
        resp2 = await admin_client.get(meetings_url(str(proj2.id)))
        assert len(resp1.json()) == 1
        assert len(resp2.json()) == 1

    @pytest.mark.asyncio
    async def test_list_meetings_flat_endpoint(self, admin_client: AsyncClient, project: Project):
        await create_meeting_via_api(admin_client, str(project.id))
        resp = await admin_client.get(meetings_flat_url())
        assert resp.status_code == 200
        assert len(resp.json()) >= 1

    @pytest.mark.asyncio
    async def test_list_meetings_flat_shows_only_user_projects(self, admin_client: AsyncClient, project: Project):
        await create_meeting_via_api(admin_client, str(project.id), valid_meeting_payload(title="My Meeting"))
        resp = await admin_client.get(meetings_flat_url())
        titles = [m["title"] for m in resp.json()]
        assert "My Meeting" in titles


class TestGetMeeting:

    @pytest.mark.asyncio
    async def test_get_meeting_success(self, admin_client: AsyncClient, project: Project):
        created = await create_meeting_via_api(admin_client, str(project.id))
        resp = await admin_client.get(meeting_detail_url(str(project.id), created["id"]))
        assert resp.status_code == 200
        assert resp.json()["title"] == "Weekly Progress Meeting"

    @pytest.mark.asyncio
    async def test_get_meeting_not_found(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.get(meeting_detail_url(str(project.id), FAKE_MEETING_ID))
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_get_meeting_wrong_project(self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User):
        created = await create_meeting_via_api(admin_client, str(project.id))
        proj2 = await create_second_project(db, admin_user)
        resp = await admin_client.get(meeting_detail_url(str(proj2.id), created["id"]))
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_get_meeting_includes_attendees(self, admin_client: AsyncClient, project: Project):
        created = await create_meeting_via_api(admin_client, str(project.id))
        resp = await admin_client.get(meeting_detail_url(str(project.id), created["id"]))
        data = resp.json()
        assert "attendees" in data
        assert isinstance(data["attendees"], list)

    @pytest.mark.asyncio
    async def test_get_meeting_includes_created_by(self, admin_client: AsyncClient, project: Project):
        created = await create_meeting_via_api(admin_client, str(project.id))
        resp = await admin_client.get(meeting_detail_url(str(project.id), created["id"]))
        data = resp.json()
        assert data["createdBy"] is not None
        assert data["createdBy"]["email"] == "admin@test.com"


class TestUpdateMeeting:

    @pytest.mark.asyncio
    async def test_update_meeting_full(self, admin_client: AsyncClient, project: Project):
        created = await create_meeting_via_api(admin_client, str(project.id))
        update_payload = {
            "title": "Updated Meeting",
            "description": "Updated description",
            "location": "New Location",
            "meeting_type": "safety",
            "status": "completed",
            "summary": "Meeting went well",
        }
        resp = await admin_client.put(meeting_detail_url(str(project.id), created["id"]), json=update_payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["title"] == "Updated Meeting"
        assert data["status"] == "completed"
        assert data["summary"] == "Meeting went well"

    @pytest.mark.asyncio
    async def test_update_meeting_partial(self, admin_client: AsyncClient, project: Project):
        created = await create_meeting_via_api(admin_client, str(project.id))
        resp = await admin_client.put(
            meeting_detail_url(str(project.id), created["id"]),
            json={"location": "Updated Location Only"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["location"] == "Updated Location Only"
        assert data["title"] == "Weekly Progress Meeting"

    @pytest.mark.asyncio
    async def test_update_meeting_change_status(self, admin_client: AsyncClient, project: Project):
        created = await create_meeting_via_api(admin_client, str(project.id))
        resp = await admin_client.put(
            meeting_detail_url(str(project.id), created["id"]),
            json={"status": "cancelled"},
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "cancelled"

    @pytest.mark.asyncio
    async def test_update_meeting_reschedule(self, admin_client: AsyncClient, project: Project):
        created = await create_meeting_via_api(admin_client, str(project.id))
        new_date = (datetime.utcnow() + timedelta(days=30)).isoformat()
        resp = await admin_client.put(
            meeting_detail_url(str(project.id), created["id"]),
            json={"scheduled_date": new_date},
        )
        assert resp.status_code == 200

    @pytest.mark.asyncio
    async def test_update_meeting_not_found(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.put(
            meeting_detail_url(str(project.id), FAKE_MEETING_ID),
            json={"title": "Ghost"},
        )
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_update_meeting_wrong_project(self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User):
        created = await create_meeting_via_api(admin_client, str(project.id))
        proj2 = await create_second_project(db, admin_user)
        resp = await admin_client.put(
            meeting_detail_url(str(proj2.id), created["id"]),
            json={"title": "Cross project"},
        )
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_update_meeting_with_action_items(self, admin_client: AsyncClient, project: Project):
        created = await create_meeting_via_api(admin_client, str(project.id))
        action_items = [
            {"id": "ai-1", "description": "Review drawings", "is_completed": False},
            {"id": "ai-2", "description": "Order materials", "is_completed": True},
        ]
        resp = await admin_client.put(
            meeting_detail_url(str(project.id), created["id"]),
            json={"action_items": action_items},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["actionItems"] is not None
        assert len(data["actionItems"]) == 2


class TestDeleteMeeting:

    @pytest.mark.asyncio
    async def test_delete_meeting_success(self, admin_client: AsyncClient, project: Project):
        created = await create_meeting_via_api(admin_client, str(project.id))
        resp = await admin_client.delete(meeting_detail_url(str(project.id), created["id"]))
        assert resp.status_code == 200
        assert resp.json()["message"] == "Meeting deleted"
        get_resp = await admin_client.get(meeting_detail_url(str(project.id), created["id"]))
        assert get_resp.status_code == 404

    @pytest.mark.asyncio
    async def test_delete_meeting_not_found(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.delete(meeting_detail_url(str(project.id), FAKE_MEETING_ID))
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_delete_meeting_wrong_project(self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User):
        created = await create_meeting_via_api(admin_client, str(project.id))
        proj2 = await create_second_project(db, admin_user)
        resp = await admin_client.delete(meeting_detail_url(str(proj2.id), created["id"]))
        assert resp.status_code == 404
        still_exists = await admin_client.get(meeting_detail_url(str(project.id), created["id"]))
        assert still_exists.status_code == 200

    @pytest.mark.asyncio
    async def test_delete_meeting_removes_from_list(self, admin_client: AsyncClient, project: Project):
        m1 = await create_meeting_via_api(admin_client, str(project.id))
        await create_meeting_via_api(admin_client, str(project.id), valid_meeting_payload(title="Keep This"))
        await admin_client.delete(meeting_detail_url(str(project.id), m1["id"]))
        resp = await admin_client.get(meetings_url(str(project.id)))
        assert len(resp.json()) == 1
        assert resp.json()[0]["title"] == "Keep This"


# =============================================================================
# MEETING ATTENDEES TESTS
# =============================================================================


class TestMeetingAttendees:

    @pytest.mark.asyncio
    async def test_add_attendee(self, admin_client: AsyncClient, project: Project, admin_user: User):
        meeting = await create_meeting_via_api(admin_client, str(project.id))
        resp = await admin_client.post(
            meeting_attendees_url(str(project.id), meeting["id"]),
            json={"user_id": str(admin_user.id), "role": "organizer"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["role"] == "organizer"
        assert data["confirmed"] is False

    @pytest.mark.asyncio
    async def test_remove_attendee(self, admin_client: AsyncClient, project: Project, admin_user: User):
        meeting = await create_meeting_via_api(admin_client, str(project.id))
        await admin_client.post(
            meeting_attendees_url(str(project.id), meeting["id"]),
            json={"user_id": str(admin_user.id), "role": "organizer"},
        )
        resp = await admin_client.delete(
            meeting_attendee_url(str(project.id), meeting["id"], str(admin_user.id)),
        )
        assert resp.status_code == 200
        assert resp.json()["message"] == "Attendee removed"

    @pytest.mark.asyncio
    async def test_remove_attendee_not_found(self, admin_client: AsyncClient, project: Project):
        meeting = await create_meeting_via_api(admin_client, str(project.id))
        resp = await admin_client.delete(
            meeting_attendee_url(str(project.id), meeting["id"], str(uuid.uuid4())),
        )
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_confirm_attendance(self, admin_client: AsyncClient, project: Project, admin_user: User):
        meeting = await create_meeting_via_api(admin_client, str(project.id))
        await admin_client.post(
            meeting_attendees_url(str(project.id), meeting["id"]),
            json={"user_id": str(admin_user.id), "role": "attendee"},
        )
        resp = await admin_client.put(
            f"{meeting_attendee_url(str(project.id), meeting['id'], str(admin_user.id))}/confirm",
        )
        assert resp.status_code == 200
        assert resp.json()["confirmed"] is True


# =============================================================================
# SECURITY TESTS
# =============================================================================


class TestContactsSecurity:

    @pytest.mark.asyncio
    async def test_unauthenticated_list_contacts(self, client: AsyncClient, project: Project):
        resp = await client.get(contacts_url(str(project.id)))
        assert resp.status_code in (401, 403)

    @pytest.mark.asyncio
    async def test_unauthenticated_create_contact(self, client: AsyncClient, project: Project):
        resp = await client.post(contacts_url(str(project.id)), json=valid_contact_payload())
        assert resp.status_code in (401, 403)

    @pytest.mark.asyncio
    async def test_unauthenticated_export_contacts(self, client: AsyncClient, project: Project):
        resp = await client.get(contacts_export_url(str(project.id)))
        assert resp.status_code in (401, 403)

    @pytest.mark.asyncio
    async def test_user_without_project_access_list_contacts(self, user_client: AsyncClient, project: Project):
        resp = await user_client.get(contacts_url(str(project.id)))
        assert resp.status_code == 403

    @pytest.mark.asyncio
    async def test_user_without_project_access_create_contact(self, user_client: AsyncClient, project: Project):
        resp = await user_client.post(contacts_url(str(project.id)), json=valid_contact_payload())
        assert resp.status_code == 403

    @pytest.mark.asyncio
    async def test_user_without_project_access_export_contacts(self, user_client: AsyncClient, project: Project):
        resp = await user_client.get(contacts_export_url(str(project.id)))
        assert resp.status_code == 403

    @pytest.mark.asyncio
    async def test_user_without_project_access_import_contacts(self, user_client: AsyncClient, project: Project):
        csv_content = "contact_name,contact_type\nTest,contractor\n"
        files = {"file": ("c.csv", io.BytesIO(csv_content.encode()), "text/csv")}
        resp = await user_client.post(contacts_import_url(str(project.id)), files=files)
        assert resp.status_code == 403

    @pytest.mark.asyncio
    async def test_cross_project_contact_idor(self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User):
        created = await create_contact_via_api(admin_client, str(project.id))
        proj2 = await create_second_project(db, admin_user)
        get_resp = await admin_client.get(contact_detail_url(str(proj2.id), created["id"]))
        assert get_resp.status_code == 404
        put_resp = await admin_client.put(contact_detail_url(str(proj2.id), created["id"]), json={"contact_name": "Hacked"})
        assert put_resp.status_code == 404
        del_resp = await admin_client.delete(contact_detail_url(str(proj2.id), created["id"]))
        assert del_resp.status_code == 404

    @pytest.mark.asyncio
    async def test_nonexistent_project_contacts(self, admin_client: AsyncClient):
        resp = await admin_client.get(contacts_url(FAKE_PROJECT_ID))
        assert resp.status_code == 403


class TestMeetingsSecurity:

    @pytest.mark.asyncio
    async def test_unauthenticated_list_meetings(self, client: AsyncClient, project: Project):
        resp = await client.get(meetings_url(str(project.id)))
        assert resp.status_code in (401, 403)

    @pytest.mark.asyncio
    async def test_unauthenticated_create_meeting(self, client: AsyncClient, project: Project):
        resp = await client.post(meetings_url(str(project.id)), json=valid_meeting_payload())
        assert resp.status_code in (401, 403)

    @pytest.mark.asyncio
    async def test_user_without_project_access_list_meetings(self, user_client: AsyncClient, project: Project):
        resp = await user_client.get(meetings_url(str(project.id)))
        assert resp.status_code == 403

    @pytest.mark.asyncio
    async def test_user_without_project_access_create_meeting(self, user_client: AsyncClient, project: Project):
        resp = await user_client.post(meetings_url(str(project.id)), json=valid_meeting_payload())
        assert resp.status_code == 403

    @pytest.mark.asyncio
    async def test_cross_project_meeting_idor(self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User):
        created = await create_meeting_via_api(admin_client, str(project.id))
        proj2 = await create_second_project(db, admin_user)
        get_resp = await admin_client.get(meeting_detail_url(str(proj2.id), created["id"]))
        assert get_resp.status_code == 404
        put_resp = await admin_client.put(meeting_detail_url(str(proj2.id), created["id"]), json={"title": "Hacked"})
        assert put_resp.status_code == 404
        del_resp = await admin_client.delete(meeting_detail_url(str(proj2.id), created["id"]))
        assert del_resp.status_code == 404

    @pytest.mark.asyncio
    async def test_nonexistent_project_meetings(self, admin_client: AsyncClient):
        resp = await admin_client.get(meetings_url(FAKE_PROJECT_ID))
        assert resp.status_code == 403
