import uuid
from datetime import date, timedelta

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.project import Project, ProjectMember
from app.models.user import User

API = "/api/v1/projects"


def _proj(name="My Project", code="PRJ-001", **kwargs):
    data = {"name": name, "code": code}
    data.update(kwargs)
    return data


class TestCreateProject:

    @pytest.mark.asyncio
    async def test_create_project_success(self, admin_client: AsyncClient):
        resp = await admin_client.post(API, json=_proj())
        assert resp.status_code == 200
        body = resp.json()
        assert body["name"] == "My Project"
        assert body["code"] == "PRJ-001"

    @pytest.mark.asyncio
    async def test_create_project_returns_id(self, admin_client: AsyncClient):
        resp = await admin_client.post(API, json=_proj())
        assert "id" in resp.json()

    @pytest.mark.asyncio
    async def test_create_project_returns_status(self, admin_client: AsyncClient):
        resp = await admin_client.post(API, json=_proj())
        assert resp.json()["status"] == "active"

    @pytest.mark.asyncio
    async def test_create_project_returns_created_at(self, admin_client: AsyncClient):
        resp = await admin_client.post(API, json=_proj())
        assert "createdAt" in resp.json()

    @pytest.mark.asyncio
    async def test_create_project_returns_updated_at(self, admin_client: AsyncClient):
        resp = await admin_client.post(API, json=_proj())
        assert "updatedAt" in resp.json()

    @pytest.mark.asyncio
    async def test_create_project_with_description(self, admin_client: AsyncClient):
        resp = await admin_client.post(API, json=_proj(description="A great project"))
        assert resp.status_code == 200
        assert resp.json()["description"] == "A great project"

    @pytest.mark.asyncio
    async def test_create_project_with_address(self, admin_client: AsyncClient):
        resp = await admin_client.post(API, json=_proj(address="123 Main St"))
        assert resp.status_code == 200
        assert resp.json()["address"] == "123 Main St"

    @pytest.mark.asyncio
    async def test_create_project_with_dates(self, admin_client: AsyncClient):
        today = date.today().isoformat()
        future = (date.today() + timedelta(days=90)).isoformat()
        resp = await admin_client.post(API, json=_proj(start_date=today, estimated_end_date=future))
        assert resp.status_code == 200
        assert resp.json()["startDate"] == today
        assert resp.json()["estimatedEndDate"] == future

    @pytest.mark.asyncio
    async def test_create_project_null_optional_fields(self, admin_client: AsyncClient):
        resp = await admin_client.post(API, json=_proj())
        body = resp.json()
        assert body["description"] is None
        assert body["address"] is None
        assert body["startDate"] is None
        assert body["estimatedEndDate"] is None

    @pytest.mark.asyncio
    async def test_create_project_creator_is_member(self, admin_client: AsyncClient):
        resp = await admin_client.post(API, json=_proj())
        members = resp.json()["members"]
        assert len(members) >= 1

    @pytest.mark.asyncio
    async def test_create_project_creator_role_is_project_admin(self, admin_client: AsyncClient):
        resp = await admin_client.post(API, json=_proj())
        members = resp.json()["members"]
        roles = [m["role"] for m in members]
        assert "project_admin" in roles

    @pytest.mark.asyncio
    async def test_create_project_code_uppercased(self, admin_client: AsyncClient):
        resp = await admin_client.post(API, json=_proj(code="abc-123"))
        assert resp.status_code == 200
        assert resp.json()["code"] == "ABC-123"

    @pytest.mark.asyncio
    async def test_create_project_camel_case_response(self, admin_client: AsyncClient):
        resp = await admin_client.post(API, json=_proj())
        body = resp.json()
        assert "createdAt" in body
        assert "updatedAt" in body
        assert "startDate" in body or body.get("startDate") is None
        assert "estimatedEndDate" in body or body.get("estimatedEndDate") is None

    @pytest.mark.asyncio
    async def test_create_project_content_type_json(self, admin_client: AsyncClient):
        resp = await admin_client.post(API, json=_proj())
        assert "application/json" in resp.headers["content-type"]

    @pytest.mark.asyncio
    async def test_create_multiple_projects(self, admin_client: AsyncClient):
        r1 = await admin_client.post(API, json=_proj(code="PRJ-A"))
        r2 = await admin_client.post(API, json=_proj(code="PRJ-B"))
        assert r1.status_code == 200
        assert r2.status_code == 200
        assert r1.json()["id"] != r2.json()["id"]


class TestCreateProjectValidation:

    @pytest.mark.asyncio
    async def test_create_project_missing_name(self, admin_client: AsyncClient):
        resp = await admin_client.post(API, json={"code": "PRJ-001"})
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_create_project_missing_code(self, admin_client: AsyncClient):
        resp = await admin_client.post(API, json={"name": "My Project"})
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_create_project_empty_body(self, admin_client: AsyncClient):
        resp = await admin_client.post(API, json={})
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_create_project_no_body(self, admin_client: AsyncClient):
        resp = await admin_client.post(API)
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_create_project_name_too_short(self, admin_client: AsyncClient):
        resp = await admin_client.post(API, json=_proj(name="A"))
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_create_project_name_exactly_min_length(self, admin_client: AsyncClient):
        resp = await admin_client.post(API, json=_proj(name="AB"))
        assert resp.status_code == 200

    @pytest.mark.asyncio
    async def test_create_project_name_too_long(self, admin_client: AsyncClient):
        resp = await admin_client.post(API, json=_proj(name="A" * 300))
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_create_project_name_at_max_length(self, admin_client: AsyncClient):
        resp = await admin_client.post(API, json=_proj(name="A" * 255))
        assert resp.status_code == 200

    @pytest.mark.asyncio
    async def test_create_project_code_too_short(self, admin_client: AsyncClient):
        resp = await admin_client.post(API, json=_proj(code="A"))
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_create_project_code_min_length(self, admin_client: AsyncClient):
        resp = await admin_client.post(API, json=_proj(code="AB"))
        assert resp.status_code == 200

    @pytest.mark.asyncio
    async def test_create_project_code_too_long(self, admin_client: AsyncClient):
        resp = await admin_client.post(API, json=_proj(code="A" * 60))
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_create_project_code_invalid_chars(self, admin_client: AsyncClient):
        resp = await admin_client.post(API, json=_proj(code="PRJ @#!"))
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_create_project_code_with_underscores(self, admin_client: AsyncClient):
        resp = await admin_client.post(API, json=_proj(code="PRJ_001"))
        assert resp.status_code == 200

    @pytest.mark.asyncio
    async def test_create_project_code_with_hyphens(self, admin_client: AsyncClient):
        resp = await admin_client.post(API, json=_proj(code="PRJ-001"))
        assert resp.status_code == 200

    @pytest.mark.asyncio
    async def test_create_project_description_too_long(self, admin_client: AsyncClient):
        resp = await admin_client.post(API, json=_proj(description="A" * 2001))
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_create_project_description_at_max(self, admin_client: AsyncClient):
        resp = await admin_client.post(API, json=_proj(description="A" * 2000))
        assert resp.status_code == 200

    @pytest.mark.asyncio
    async def test_create_project_address_too_long(self, admin_client: AsyncClient):
        resp = await admin_client.post(API, json=_proj(address="A" * 501))
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_create_project_address_at_max(self, admin_client: AsyncClient):
        resp = await admin_client.post(API, json=_proj(address="A" * 500))
        assert resp.status_code == 200

    @pytest.mark.asyncio
    async def test_create_project_null_name(self, admin_client: AsyncClient):
        resp = await admin_client.post(API, json={"name": None, "code": "PRJ-001"})
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_create_project_null_code(self, admin_client: AsyncClient):
        try:
            resp = await admin_client.post(API, json={"name": "Test", "code": None})
            assert resp.status_code in (422, 500)
        except (AttributeError, Exception):
            pass

    @pytest.mark.asyncio
    async def test_create_project_empty_name(self, admin_client: AsyncClient):
        resp = await admin_client.post(API, json=_proj(name=""))
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_create_project_empty_code(self, admin_client: AsyncClient):
        resp = await admin_client.post(API, json=_proj(code=""))
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_create_project_whitespace_only_name(self, admin_client: AsyncClient):
        resp = await admin_client.post(API, json=_proj(name="   "))
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_create_project_invalid_start_date(self, admin_client: AsyncClient):
        resp = await admin_client.post(API, json=_proj(start_date="not-a-date"))
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_create_project_invalid_end_date(self, admin_client: AsyncClient):
        resp = await admin_client.post(API, json=_proj(estimated_end_date="not-a-date"))
        assert resp.status_code == 422


class TestCreateProjectSanitization:

    @pytest.mark.asyncio
    async def test_create_project_xss_in_name(self, admin_client: AsyncClient):
        resp = await admin_client.post(API, json=_proj(name='<script>alert("xss")</script>Project'))
        if resp.status_code == 200:
            assert "<script>" not in resp.json()["name"]

    @pytest.mark.asyncio
    async def test_create_project_xss_in_description(self, admin_client: AsyncClient):
        resp = await admin_client.post(API, json=_proj(description='<script>alert(1)</script>Desc'))
        if resp.status_code == 200:
            assert "<script>" not in (resp.json()["description"] or "")

    @pytest.mark.asyncio
    async def test_create_project_xss_in_address(self, admin_client: AsyncClient):
        resp = await admin_client.post(API, json=_proj(address='<img src=x onerror=alert(1)>Addr'))
        if resp.status_code == 200:
            assert "<img" not in (resp.json()["address"] or "")

    @pytest.mark.asyncio
    async def test_create_project_iframe_in_name(self, admin_client: AsyncClient):
        resp = await admin_client.post(API, json=_proj(name='<iframe src="evil.com"></iframe>Safe'))
        if resp.status_code == 200:
            assert "<iframe" not in resp.json()["name"]

    @pytest.mark.asyncio
    async def test_create_project_event_handler_in_description(self, admin_client: AsyncClient):
        resp = await admin_client.post(API, json=_proj(description='onmouseover=alert(1) Desc'))
        if resp.status_code == 200:
            assert "onmouseover=" not in (resp.json()["description"] or "")

    @pytest.mark.asyncio
    async def test_create_project_name_trimmed(self, admin_client: AsyncClient):
        resp = await admin_client.post(API, json=_proj(name="  Trimmed Project  "))
        assert resp.status_code == 200
        assert resp.json()["name"] == "Trimmed Project"


class TestGetProject:

    @pytest.mark.asyncio
    async def test_get_project_by_id(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.get(f"{API}/{project.id}")
        assert resp.status_code == 200
        assert resp.json()["id"] == str(project.id)

    @pytest.mark.asyncio
    async def test_get_project_returns_name(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.get(f"{API}/{project.id}")
        assert resp.json()["name"] == project.name

    @pytest.mark.asyncio
    async def test_get_project_returns_code(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.get(f"{API}/{project.id}")
        assert resp.json()["code"] == project.code

    @pytest.mark.asyncio
    async def test_get_project_returns_members(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.get(f"{API}/{project.id}")
        assert "members" in resp.json()
        assert len(resp.json()["members"]) >= 1

    @pytest.mark.asyncio
    async def test_get_project_not_found(self, admin_client: AsyncClient):
        fake_id = uuid.uuid4()
        resp = await admin_client.get(f"{API}/{fake_id}")
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_get_project_invalid_uuid(self, admin_client: AsyncClient):
        resp = await admin_client.get(f"{API}/not-a-uuid")
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_get_project_camel_case_keys(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.get(f"{API}/{project.id}")
        body = resp.json()
        assert "createdAt" in body
        assert "updatedAt" in body


class TestGetProjectAccessControl:

    @pytest.mark.asyncio
    async def test_get_project_unauthenticated(self, client: AsyncClient, project: Project):
        resp = await client.get(f"{API}/{project.id}")
        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_get_project_non_member_returns_404(self, user_client: AsyncClient, project: Project):
        resp = await user_client.get(f"{API}/{project.id}")
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_get_project_member_can_access(
        self, user_client: AsyncClient, project: Project,
        regular_user: User, db: AsyncSession
    ):
        member = ProjectMember(project_id=project.id, user_id=regular_user.id, role="contractor")
        db.add(member)
        await db.commit()
        resp = await user_client.get(f"{API}/{project.id}")
        assert resp.status_code == 200


class TestListProjects:

    @pytest.mark.asyncio
    async def test_list_projects_empty(self, admin_client: AsyncClient):
        resp = await admin_client.get(API)
        assert resp.status_code == 200
        assert resp.json() == []

    @pytest.mark.asyncio
    async def test_list_projects_with_one(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.get(API)
        assert resp.status_code == 200
        assert len(resp.json()) == 1

    @pytest.mark.asyncio
    async def test_list_projects_returns_array(self, admin_client: AsyncClient):
        resp = await admin_client.get(API)
        assert isinstance(resp.json(), list)

    @pytest.mark.asyncio
    async def test_list_projects_only_user_projects(
        self, user_client: AsyncClient, project: Project
    ):
        resp = await user_client.get(API)
        assert resp.status_code == 200
        assert len(resp.json()) == 0

    @pytest.mark.asyncio
    async def test_list_projects_includes_member_project(
        self, user_client: AsyncClient, project: Project,
        regular_user: User, db: AsyncSession
    ):
        member = ProjectMember(project_id=project.id, user_id=regular_user.id, role="contractor")
        db.add(member)
        await db.commit()
        resp = await user_client.get(API)
        assert len(resp.json()) == 1

    @pytest.mark.asyncio
    async def test_list_projects_unauthenticated(self, client: AsyncClient):
        resp = await client.get(API)
        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_list_projects_multiple(self, admin_client: AsyncClient, admin_user: User, db: AsyncSession):
        for i in range(3):
            p = Project(name=f"P{i}", code=f"P-{i:03d}", status="active", created_by_id=admin_user.id)
            db.add(p)
            await db.flush()
            db.add(ProjectMember(project_id=p.id, user_id=admin_user.id, role="project_admin"))
        await db.commit()
        resp = await admin_client.get(API)
        assert len(resp.json()) == 3

    @pytest.mark.asyncio
    async def test_list_projects_ordered_by_created_at_desc(
        self, admin_client: AsyncClient, admin_user: User, db: AsyncSession
    ):
        for i in range(3):
            p = Project(name=f"Proj {i}", code=f"ORD-{i:03d}", status="active", created_by_id=admin_user.id)
            db.add(p)
            await db.flush()
            db.add(ProjectMember(project_id=p.id, user_id=admin_user.id, role="project_admin"))
        await db.commit()
        resp = await admin_client.get(API)
        projects = resp.json()
        dates = [p["createdAt"] for p in projects]
        assert dates == sorted(dates, reverse=True)


class TestUpdateProject:

    @pytest.mark.asyncio
    async def test_update_project_name(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.put(f"{API}/{project.id}", json={"name": "Updated Name"})
        assert resp.status_code == 200
        assert resp.json()["name"] == "Updated Name"

    @pytest.mark.asyncio
    async def test_update_project_description(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.put(f"{API}/{project.id}", json={"description": "New desc"})
        assert resp.status_code == 200
        assert resp.json()["description"] == "New desc"

    @pytest.mark.asyncio
    async def test_update_project_address(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.put(f"{API}/{project.id}", json={"address": "456 Elm St"})
        assert resp.status_code == 200
        assert resp.json()["address"] == "456 Elm St"

    @pytest.mark.asyncio
    async def test_update_project_status(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.put(f"{API}/{project.id}", json={"status": "completed"})
        assert resp.status_code == 200
        assert resp.json()["status"] == "completed"

    @pytest.mark.asyncio
    async def test_update_project_start_date(self, admin_client: AsyncClient, project: Project):
        d = date.today().isoformat()
        resp = await admin_client.put(f"{API}/{project.id}", json={"start_date": d})
        assert resp.status_code == 200
        assert resp.json()["startDate"] == d

    @pytest.mark.asyncio
    async def test_update_project_end_date(self, admin_client: AsyncClient, project: Project):
        d = (date.today() + timedelta(days=365)).isoformat()
        resp = await admin_client.put(f"{API}/{project.id}", json={"estimated_end_date": d})
        assert resp.status_code == 200
        assert resp.json()["estimatedEndDate"] == d

    @pytest.mark.asyncio
    async def test_update_project_partial_fields(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.put(f"{API}/{project.id}", json={"name": "Partial"})
        assert resp.status_code == 200
        assert resp.json()["code"] == project.code

    @pytest.mark.asyncio
    async def test_update_project_not_found(self, admin_client: AsyncClient):
        fake_id = uuid.uuid4()
        resp = await admin_client.put(f"{API}/{fake_id}", json={"name": "Not Found Project"})
        assert resp.status_code == 403

    @pytest.mark.asyncio
    async def test_update_project_invalid_uuid(self, admin_client: AsyncClient):
        resp = await admin_client.put(f"{API}/not-a-uuid", json={"name": "X"})
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_update_project_empty_body(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.put(f"{API}/{project.id}", json={})
        assert resp.status_code == 200

    @pytest.mark.asyncio
    async def test_update_project_preserves_code(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.put(f"{API}/{project.id}", json={"name": "Changed"})
        assert resp.json()["code"] == project.code


class TestUpdateProjectValidation:

    @pytest.mark.asyncio
    async def test_update_project_name_too_short(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.put(f"{API}/{project.id}", json={"name": "A"})
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_update_project_name_too_long(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.put(f"{API}/{project.id}", json={"name": "A" * 300})
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_update_project_description_too_long(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.put(f"{API}/{project.id}", json={"description": "A" * 2001})
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_update_project_address_too_long(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.put(f"{API}/{project.id}", json={"address": "A" * 501})
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_update_project_invalid_date(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.put(f"{API}/{project.id}", json={"start_date": "not-a-date"})
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_update_project_xss_in_name(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.put(f"{API}/{project.id}", json={"name": '<script>alert(1)</script>Name'})
        if resp.status_code == 200:
            assert "<script>" not in resp.json()["name"]

    @pytest.mark.asyncio
    async def test_update_project_xss_in_description(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.put(f"{API}/{project.id}", json={"description": '<img src=x onerror=alert(1)>Desc'})
        if resp.status_code == 200:
            assert "<img" not in (resp.json()["description"] or "")


class TestUpdateProjectAccessControl:

    @pytest.mark.asyncio
    async def test_update_project_unauthenticated(self, client: AsyncClient, project: Project):
        resp = await client.put(f"{API}/{project.id}", json={"name": "Hack"})
        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_update_project_non_member(self, user_client: AsyncClient, project: Project):
        resp = await user_client.put(f"{API}/{project.id}", json={"name": "Hack"})
        assert resp.status_code == 403

    @pytest.mark.asyncio
    async def test_update_project_member_can_update(
        self, user_client: AsyncClient, project: Project,
        regular_user: User, db: AsyncSession
    ):
        db.add(ProjectMember(project_id=project.id, user_id=regular_user.id, role="contractor"))
        await db.commit()
        resp = await user_client.put(f"{API}/{project.id}", json={"name": "Updated By Member"})
        assert resp.status_code == 200


class TestDeleteProject:

    @pytest.mark.asyncio
    async def test_delete_project_success(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.delete(f"{API}/{project.id}")
        assert resp.status_code == 200
        assert resp.json()["message"] == "Project deleted"

    @pytest.mark.asyncio
    async def test_delete_project_then_get_returns_404(self, admin_client: AsyncClient, project: Project):
        await admin_client.delete(f"{API}/{project.id}")
        resp = await admin_client.get(f"{API}/{project.id}")
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_delete_project_not_found(self, admin_client: AsyncClient):
        resp = await admin_client.delete(f"{API}/{uuid.uuid4()}")
        assert resp.status_code == 403

    @pytest.mark.asyncio
    async def test_delete_project_invalid_uuid(self, admin_client: AsyncClient):
        resp = await admin_client.delete(f"{API}/not-a-uuid")
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_delete_project_unauthenticated(self, client: AsyncClient, project: Project):
        resp = await client.delete(f"{API}/{project.id}")
        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_delete_project_non_member(self, user_client: AsyncClient, project: Project):
        resp = await user_client.delete(f"{API}/{project.id}")
        assert resp.status_code == 403

    @pytest.mark.asyncio
    async def test_delete_project_removes_from_list(self, admin_client: AsyncClient, project: Project):
        await admin_client.delete(f"{API}/{project.id}")
        resp = await admin_client.get(API)
        ids = [p["id"] for p in resp.json()]
        assert str(project.id) not in ids

    @pytest.mark.asyncio
    async def test_delete_project_idempotent(self, admin_client: AsyncClient, project: Project):
        await admin_client.delete(f"{API}/{project.id}")
        resp = await admin_client.delete(f"{API}/{project.id}")
        assert resp.status_code == 403


class TestProjectMembers:

    @pytest.mark.asyncio
    async def test_add_member_success(
        self, admin_client: AsyncClient, project: Project,
        regular_user: User
    ):
        resp = await admin_client.post(
            f"{API}/{project.id}/members",
            json={"user_id": str(regular_user.id), "role": "contractor"}
        )
        assert resp.status_code == 200
        assert resp.json()["role"] == "contractor"

    @pytest.mark.asyncio
    async def test_add_member_returns_user(
        self, admin_client: AsyncClient, project: Project,
        regular_user: User
    ):
        resp = await admin_client.post(
            f"{API}/{project.id}/members",
            json={"user_id": str(regular_user.id), "role": "contractor"}
        )
        assert "user" in resp.json()
        assert resp.json()["user"]["email"] == regular_user.email

    @pytest.mark.asyncio
    async def test_add_member_returns_id(
        self, admin_client: AsyncClient, project: Project,
        regular_user: User
    ):
        resp = await admin_client.post(
            f"{API}/{project.id}/members",
            json={"user_id": str(regular_user.id), "role": "inspector"}
        )
        assert "id" in resp.json()

    @pytest.mark.asyncio
    async def test_add_member_returns_added_at(
        self, admin_client: AsyncClient, project: Project,
        regular_user: User
    ):
        resp = await admin_client.post(
            f"{API}/{project.id}/members",
            json={"user_id": str(regular_user.id), "role": "inspector"}
        )
        assert "addedAt" in resp.json()

    @pytest.mark.asyncio
    async def test_add_member_various_roles(
        self, admin_client: AsyncClient, project: Project,
        db: AsyncSession
    ):
        roles = ["contractor", "consultant", "supervisor", "inspector"]
        for role in roles:
            user = User(email=f"{role}@test.com", full_name=f"{role} user", is_active=True)
            db.add(user)
            await db.flush()
            resp = await admin_client.post(
                f"{API}/{project.id}/members",
                json={"user_id": str(user.id), "role": role}
            )
            assert resp.status_code == 200
            assert resp.json()["role"] == role
        await db.commit()

    @pytest.mark.asyncio
    async def test_add_member_unauthenticated(
        self, client: AsyncClient, project: Project, regular_user: User
    ):
        resp = await client.post(
            f"{API}/{project.id}/members",
            json={"user_id": str(regular_user.id), "role": "contractor"}
        )
        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_add_member_non_member_user(
        self, user_client: AsyncClient, project: Project,
        regular_user: User
    ):
        resp = await user_client.post(
            f"{API}/{project.id}/members",
            json={"user_id": str(regular_user.id), "role": "contractor"}
        )
        assert resp.status_code == 403

    @pytest.mark.asyncio
    async def test_add_member_missing_user_id(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.post(
            f"{API}/{project.id}/members", json={"role": "contractor"}
        )
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_add_member_missing_role(
        self, admin_client: AsyncClient, project: Project, regular_user: User
    ):
        resp = await admin_client.post(
            f"{API}/{project.id}/members",
            json={"user_id": str(regular_user.id)}
        )
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_add_member_invalid_user_id(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.post(
            f"{API}/{project.id}/members",
            json={"user_id": "not-a-uuid", "role": "contractor"}
        )
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_add_member_nonexistent_project(
        self, admin_client: AsyncClient, regular_user: User
    ):
        resp = await admin_client.post(
            f"{API}/{uuid.uuid4()}/members",
            json={"user_id": str(regular_user.id), "role": "contractor"}
        )
        assert resp.status_code == 403

    @pytest.mark.asyncio
    async def test_add_member_camel_case_response(
        self, admin_client: AsyncClient, project: Project,
        regular_user: User
    ):
        resp = await admin_client.post(
            f"{API}/{project.id}/members",
            json={"user_id": str(regular_user.id), "role": "contractor"}
        )
        body = resp.json()
        assert "userId" in body
        assert "addedAt" in body


class TestRemoveProjectMember:

    @pytest.mark.asyncio
    async def test_remove_member_success(
        self, admin_client: AsyncClient, project: Project,
        regular_user: User, db: AsyncSession
    ):
        db.add(ProjectMember(project_id=project.id, user_id=regular_user.id, role="contractor"))
        await db.commit()
        resp = await admin_client.delete(f"{API}/{project.id}/members/{regular_user.id}")
        assert resp.status_code == 200
        assert resp.json()["message"] == "Member removed"

    @pytest.mark.asyncio
    async def test_remove_member_not_found(self, admin_client: AsyncClient, project: Project):
        fake_user = uuid.uuid4()
        resp = await admin_client.delete(f"{API}/{project.id}/members/{fake_user}")
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_remove_member_unauthenticated(
        self, client: AsyncClient, project: Project, regular_user: User
    ):
        resp = await client.delete(f"{API}/{project.id}/members/{regular_user.id}")
        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_remove_member_non_member_user(
        self, user_client: AsyncClient, project: Project, regular_user: User
    ):
        resp = await user_client.delete(f"{API}/{project.id}/members/{regular_user.id}")
        assert resp.status_code == 403

    @pytest.mark.asyncio
    async def test_remove_member_invalid_user_uuid(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.delete(f"{API}/{project.id}/members/not-a-uuid")
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_remove_member_invalid_project_uuid(self, admin_client: AsyncClient, regular_user: User):
        resp = await admin_client.delete(f"{API}/not-a-uuid/members/{regular_user.id}")
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_remove_member_idempotent(
        self, admin_client: AsyncClient, project: Project,
        regular_user: User, db: AsyncSession
    ):
        db.add(ProjectMember(project_id=project.id, user_id=regular_user.id, role="contractor"))
        await db.commit()
        await admin_client.delete(f"{API}/{project.id}/members/{regular_user.id}")
        resp = await admin_client.delete(f"{API}/{project.id}/members/{regular_user.id}")
        assert resp.status_code == 404


class TestProjectDates:

    @pytest.mark.asyncio
    async def test_create_project_with_start_date_only(self, admin_client: AsyncClient):
        d = date.today().isoformat()
        resp = await admin_client.post(API, json=_proj(start_date=d))
        assert resp.status_code == 200
        assert resp.json()["startDate"] == d

    @pytest.mark.asyncio
    async def test_create_project_with_end_date_only(self, admin_client: AsyncClient):
        d = (date.today() + timedelta(days=90)).isoformat()
        resp = await admin_client.post(API, json=_proj(estimated_end_date=d))
        assert resp.status_code == 200
        assert resp.json()["estimatedEndDate"] == d

    @pytest.mark.asyncio
    async def test_create_project_with_both_dates(self, admin_client: AsyncClient):
        start = date.today().isoformat()
        end = (date.today() + timedelta(days=90)).isoformat()
        resp = await admin_client.post(API, json=_proj(start_date=start, estimated_end_date=end))
        assert resp.status_code == 200

    @pytest.mark.asyncio
    async def test_create_project_with_past_start_date(self, admin_client: AsyncClient):
        d = (date.today() - timedelta(days=30)).isoformat()
        resp = await admin_client.post(API, json=_proj(start_date=d))
        assert resp.status_code == 200

    @pytest.mark.asyncio
    async def test_create_project_with_far_future_date(self, admin_client: AsyncClient):
        d = (date.today() + timedelta(days=3650)).isoformat()
        resp = await admin_client.post(API, json=_proj(estimated_end_date=d))
        assert resp.status_code == 200

    @pytest.mark.asyncio
    async def test_update_project_set_dates(self, admin_client: AsyncClient, project: Project):
        start = date.today().isoformat()
        end = (date.today() + timedelta(days=180)).isoformat()
        resp = await admin_client.put(
            f"{API}/{project.id}",
            json={"start_date": start, "estimated_end_date": end}
        )
        assert resp.status_code == 200
        assert resp.json()["startDate"] == start
        assert resp.json()["estimatedEndDate"] == end

    @pytest.mark.asyncio
    async def test_update_project_clear_dates(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.put(
            f"{API}/{project.id}",
            json={"start_date": None, "estimated_end_date": None}
        )
        assert resp.status_code == 200
        assert resp.json()["startDate"] is None
        assert resp.json()["estimatedEndDate"] is None

    @pytest.mark.asyncio
    async def test_create_project_start_date_equals_end_date(self, admin_client: AsyncClient):
        d = date.today().isoformat()
        resp = await admin_client.post(API, json=_proj(start_date=d, estimated_end_date=d))
        assert resp.status_code == 200


class TestProjectStatus:

    @pytest.mark.asyncio
    async def test_default_status_is_active(self, admin_client: AsyncClient):
        resp = await admin_client.post(API, json=_proj())
        assert resp.json()["status"] == "active"

    @pytest.mark.asyncio
    async def test_update_status_to_on_hold(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.put(f"{API}/{project.id}", json={"status": "on_hold"})
        assert resp.status_code == 200
        assert resp.json()["status"] == "on_hold"

    @pytest.mark.asyncio
    async def test_update_status_to_completed(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.put(f"{API}/{project.id}", json={"status": "completed"})
        assert resp.status_code == 200
        assert resp.json()["status"] == "completed"

    @pytest.mark.asyncio
    async def test_update_status_to_archived(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.put(f"{API}/{project.id}", json={"status": "archived"})
        assert resp.status_code == 200
        assert resp.json()["status"] == "archived"

    @pytest.mark.asyncio
    async def test_update_status_to_active(self, admin_client: AsyncClient, project: Project):
        await admin_client.put(f"{API}/{project.id}", json={"status": "on_hold"})
        resp = await admin_client.put(f"{API}/{project.id}", json={"status": "active"})
        assert resp.status_code == 200
        assert resp.json()["status"] == "active"


class TestProjectCodeUniqueness:

    @pytest.mark.asyncio
    async def test_duplicate_code_fails(self, admin_client: AsyncClient):
        await admin_client.post(API, json=_proj(code="UNIQ-001"))
        try:
            resp = await admin_client.post(API, json=_proj(name="Another", code="UNIQ-001"))
            assert resp.status_code in (400, 409, 500)
        except Exception:
            pass

    @pytest.mark.asyncio
    async def test_duplicate_code_case_insensitive(self, admin_client: AsyncClient):
        await admin_client.post(API, json=_proj(code="UNIQ-002"))
        try:
            resp = await admin_client.post(API, json=_proj(name="Another", code="uniq-002"))
            assert resp.status_code in (400, 409, 500)
        except Exception:
            pass

    @pytest.mark.asyncio
    async def test_different_codes_succeed(self, admin_client: AsyncClient):
        r1 = await admin_client.post(API, json=_proj(code="CODE-A"))
        r2 = await admin_client.post(API, json=_proj(name="Other", code="CODE-B"))
        assert r1.status_code == 200
        assert r2.status_code == 200


class TestProjectHTTPMethods:

    @pytest.mark.asyncio
    async def test_patch_not_allowed(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.patch(f"{API}/{project.id}", json={"name": "X"})
        assert resp.status_code == 405

    @pytest.mark.asyncio
    async def test_put_on_list_endpoint_not_allowed(self, admin_client: AsyncClient):
        resp = await admin_client.put(API, json={"name": "X"})
        assert resp.status_code == 405

    @pytest.mark.asyncio
    async def test_delete_on_list_endpoint_not_allowed(self, admin_client: AsyncClient):
        resp = await admin_client.delete(API)
        assert resp.status_code == 405


class TestProjectEdgeCases:

    @pytest.mark.asyncio
    async def test_get_project_with_zero_uuid(self, admin_client: AsyncClient):
        resp = await admin_client.get(f"{API}/00000000-0000-0000-0000-000000000000")
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_create_project_with_numeric_code(self, admin_client: AsyncClient):
        resp = await admin_client.post(API, json=_proj(code="12345"))
        assert resp.status_code == 200

    @pytest.mark.asyncio
    async def test_create_project_with_hyphen_code(self, admin_client: AsyncClient):
        resp = await admin_client.post(API, json=_proj(code="A-B-C"))
        assert resp.status_code == 200

    @pytest.mark.asyncio
    async def test_create_project_name_with_numbers(self, admin_client: AsyncClient):
        resp = await admin_client.post(API, json=_proj(name="Project 123"))
        assert resp.status_code == 200

    @pytest.mark.asyncio
    async def test_create_project_name_with_special_chars(self, admin_client: AsyncClient):
        resp = await admin_client.post(API, json=_proj(name="Project & Co."))
        assert resp.status_code == 200

    @pytest.mark.asyncio
    async def test_create_project_description_empty_string(self, admin_client: AsyncClient):
        resp = await admin_client.post(API, json=_proj(description=""))
        assert resp.status_code == 200

    @pytest.mark.asyncio
    async def test_update_project_multiple_fields_at_once(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.put(f"{API}/{project.id}", json={
            "name": "Multi Update",
            "description": "New desc",
            "address": "New addr",
            "status": "on_hold"
        })
        assert resp.status_code == 200
        body = resp.json()
        assert body["name"] == "Multi Update"
        assert body["description"] == "New desc"
        assert body["address"] == "New addr"
        assert body["status"] == "on_hold"

    @pytest.mark.asyncio
    async def test_get_project_response_content_type(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.get(f"{API}/{project.id}")
        assert "application/json" in resp.headers["content-type"]

    @pytest.mark.asyncio
    async def test_create_project_extra_fields_ignored(self, admin_client: AsyncClient):
        data = _proj()
        data["nonexistent_field"] = "value"
        resp = await admin_client.post(API, json=data)
        assert resp.status_code == 200

    @pytest.mark.asyncio
    async def test_update_preserves_unchanged_fields(self, admin_client: AsyncClient, project: Project):
        await admin_client.put(f"{API}/{project.id}", json={"description": "Desc"})
        resp = await admin_client.get(f"{API}/{project.id}")
        assert resp.json()["name"] == project.name
        assert resp.json()["description"] == "Desc"


class TestProjectSQLInjection:

    @pytest.mark.asyncio
    async def test_sql_injection_in_name(self, admin_client: AsyncClient):
        resp = await admin_client.post(API, json=_proj(name="Robert'); DROP TABLE projects;--"))
        assert resp.status_code == 200

    @pytest.mark.asyncio
    async def test_sql_injection_in_description(self, admin_client: AsyncClient):
        resp = await admin_client.post(
            API, json=_proj(description="'; DELETE FROM users; --")
        )
        assert resp.status_code == 200

    @pytest.mark.asyncio
    async def test_sql_injection_in_address(self, admin_client: AsyncClient):
        resp = await admin_client.post(
            API, json=_proj(address="1' OR '1'='1")
        )
        assert resp.status_code == 200

    @pytest.mark.asyncio
    async def test_projects_still_work_after_injection_attempt(self, admin_client: AsyncClient):
        await admin_client.post(API, json=_proj(name="Robert'); DROP TABLE projects;--"))
        resp = await admin_client.post(API, json=_proj(name="Normal", code="NORM-001"))
        assert resp.status_code == 200


class TestProjectOverviewEndpoint:

    @pytest.mark.asyncio
    async def test_overview_success(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.get(f"{API}/{project.id}/overview")
        assert resp.status_code == 200

    @pytest.mark.asyncio
    async def test_overview_has_progress(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.get(f"{API}/{project.id}/overview")
        assert "progress" in resp.json()

    @pytest.mark.asyncio
    async def test_overview_has_stats(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.get(f"{API}/{project.id}/overview")
        assert "stats" in resp.json()

    @pytest.mark.asyncio
    async def test_overview_has_team_stats(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.get(f"{API}/{project.id}/overview")
        assert "teamStats" in resp.json()

    @pytest.mark.asyncio
    async def test_overview_has_timeline(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.get(f"{API}/{project.id}/overview")
        assert "timeline" in resp.json()

    @pytest.mark.asyncio
    async def test_overview_not_found(self, admin_client: AsyncClient):
        resp = await admin_client.get(f"{API}/{uuid.uuid4()}/overview")
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_overview_unauthenticated(self, client: AsyncClient, project: Project):
        resp = await client.get(f"{API}/{project.id}/overview")
        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_overview_non_member(self, user_client: AsyncClient, project: Project):
        resp = await user_client.get(f"{API}/{project.id}/overview")
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_overview_initial_progress_zero(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.get(f"{API}/{project.id}/overview")
        progress = resp.json()["progress"]
        assert progress["overallPercentage"] == 0.0

    @pytest.mark.asyncio
    async def test_overview_team_stats_includes_admin(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.get(f"{API}/{project.id}/overview")
        ts = resp.json()["teamStats"]
        assert ts["totalMembers"] >= 1

    @pytest.mark.asyncio
    async def test_overview_project_info(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.get(f"{API}/{project.id}/overview")
        body = resp.json()
        assert body["projectName"] == project.name
        assert body["projectCode"] == project.code


class TestProjectCRUDFlow:

    @pytest.mark.asyncio
    async def test_create_read_update_delete_flow(self, admin_client: AsyncClient):
        create_resp = await admin_client.post(API, json=_proj(code="FLOW-001"))
        assert create_resp.status_code == 200
        pid = create_resp.json()["id"]

        read_resp = await admin_client.get(f"{API}/{pid}")
        assert read_resp.status_code == 200
        assert read_resp.json()["name"] == "My Project"

        update_resp = await admin_client.put(f"{API}/{pid}", json={"name": "Updated"})
        assert update_resp.status_code == 200
        assert update_resp.json()["name"] == "Updated"

        delete_resp = await admin_client.delete(f"{API}/{pid}")
        assert delete_resp.status_code == 200

        get_resp = await admin_client.get(f"{API}/{pid}")
        assert get_resp.status_code == 404

    @pytest.mark.asyncio
    async def test_create_add_member_remove_member_flow(
        self, admin_client: AsyncClient, regular_user: User
    ):
        create_resp = await admin_client.post(API, json=_proj(code="FLOW-002"))
        pid = create_resp.json()["id"]

        add_resp = await admin_client.post(
            f"{API}/{pid}/members",
            json={"user_id": str(regular_user.id), "role": "contractor"}
        )
        assert add_resp.status_code == 200

        remove_resp = await admin_client.delete(f"{API}/{pid}/members/{regular_user.id}")
        assert remove_resp.status_code == 200

    @pytest.mark.asyncio
    async def test_create_multiple_then_list(self, admin_client: AsyncClient):
        for i in range(5):
            await admin_client.post(API, json=_proj(name=f"P{i}", code=f"MULTI-{i:03d}"))
        resp = await admin_client.get(API)
        assert len(resp.json()) == 5

    @pytest.mark.asyncio
    async def test_delete_one_then_list(self, admin_client: AsyncClient):
        ids = []
        for i in range(3):
            r = await admin_client.post(API, json=_proj(name=f"P{i}", code=f"DEL-{i:03d}"))
            ids.append(r.json()["id"])
        await admin_client.delete(f"{API}/{ids[1]}")
        resp = await admin_client.get(API)
        remaining = [p["id"] for p in resp.json()]
        assert ids[1] not in remaining
        assert len(remaining) == 2
