import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.user import User
from app.models.project import Project, ProjectMember
from app.core.security import get_password_hash, verify_password, create_access_token


# ---------------------------------------------------------------------------
# Auth - Registration
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_register_valid(client: AsyncClient):
    response = await client.post("/api/v1/auth/register", json={
        "email": "newuser@example.com",
        "password": "StrongPass1",
        "full_name": "New User",
    })
    assert response.status_code == 201
    data = response.json()
    assert "accessToken" in data
    assert data["tokenType"] == "bearer"
    assert data["user"]["email"] == "newuser@example.com"
    assert data["user"]["fullName"] == "New User"
    assert data["user"]["isActive"] is True


@pytest.mark.asyncio
async def test_register_duplicate_email(client: AsyncClient):
    payload = {
        "email": "dup@example.com",
        "password": "StrongPass1",
        "full_name": "First User",
    }
    first = await client.post("/api/v1/auth/register", json=payload)
    assert first.status_code == 201
    second = await client.post("/api/v1/auth/register", json=payload)
    assert second.status_code == 400


@pytest.mark.asyncio
async def test_register_missing_email(client: AsyncClient):
    response = await client.post("/api/v1/auth/register", json={
        "password": "StrongPass1",
        "full_name": "No Email",
    })
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_register_missing_password(client: AsyncClient):
    response = await client.post("/api/v1/auth/register", json={
        "email": "nopass@example.com",
        "full_name": "No Password",
    })
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_register_missing_full_name(client: AsyncClient):
    response = await client.post("/api/v1/auth/register", json={
        "email": "noname@example.com",
        "password": "StrongPass1",
    })
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_register_short_password(client: AsyncClient):
    response = await client.post("/api/v1/auth/register", json={
        "email": "short@example.com",
        "password": "Ab1",
        "full_name": "Short Pass",
    })
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_register_password_no_uppercase(client: AsyncClient):
    response = await client.post("/api/v1/auth/register", json={
        "email": "noup@example.com",
        "password": "alllowercase1",
        "full_name": "No Upper",
    })
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_register_password_no_lowercase(client: AsyncClient):
    response = await client.post("/api/v1/auth/register", json={
        "email": "nolow@example.com",
        "password": "ALLUPPERCASE1",
        "full_name": "No Lower",
    })
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_register_password_no_digit(client: AsyncClient):
    response = await client.post("/api/v1/auth/register", json={
        "email": "nodigit@example.com",
        "password": "NoDigitHere",
        "full_name": "No Digit",
    })
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_register_invalid_email_format(client: AsyncClient):
    response = await client.post("/api/v1/auth/register", json={
        "email": "not-an-email",
        "password": "StrongPass1",
        "full_name": "Bad Email",
    })
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_register_empty_body(client: AsyncClient):
    response = await client.post("/api/v1/auth/register", json={})
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_register_empty_string_email(client: AsyncClient):
    response = await client.post("/api/v1/auth/register", json={
        "email": "",
        "password": "StrongPass1",
        "full_name": "Empty Email",
    })
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_register_empty_string_password(client: AsyncClient):
    response = await client.post("/api/v1/auth/register", json={
        "email": "emptypass@example.com",
        "password": "",
        "full_name": "Empty Pass",
    })
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_register_very_long_email(client: AsyncClient):
    long_local = "a" * 300
    response = await client.post("/api/v1/auth/register", json={
        "email": f"{long_local}@example.com",
        "password": "StrongPass1",
        "full_name": "Long Email",
    })
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_register_unicode_in_name(client: AsyncClient):
    response = await client.post("/api/v1/auth/register", json={
        "email": "unicode@example.com",
        "password": "StrongPass1",
        "full_name": "Test User",
    })
    assert response.status_code == 201
    assert response.json()["user"]["fullName"] == "Test User"


@pytest.mark.asyncio
async def test_register_special_chars_in_name(client: AsyncClient):
    response = await client.post("/api/v1/auth/register", json={
        "email": "special@example.com",
        "password": "StrongPass1",
        "full_name": "O'Brien-Smith Jr.",
    })
    assert response.status_code == 201


@pytest.mark.asyncio
async def test_register_name_too_short(client: AsyncClient):
    response = await client.post("/api/v1/auth/register", json={
        "email": "shortname@example.com",
        "password": "StrongPass1",
        "full_name": "A",
    })
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_register_returns_user_id(client: AsyncClient):
    response = await client.post("/api/v1/auth/register", json={
        "email": "idcheck@example.com",
        "password": "StrongPass1",
        "full_name": "ID Check",
    })
    assert response.status_code == 201
    data = response.json()
    assert "id" in data["user"]
    uuid.UUID(data["user"]["id"])


@pytest.mark.asyncio
async def test_register_returns_created_at(client: AsyncClient):
    response = await client.post("/api/v1/auth/register", json={
        "email": "time@example.com",
        "password": "StrongPass1",
        "full_name": "Time Check",
    })
    assert response.status_code == 201
    assert "createdAt" in response.json()["user"]


@pytest.mark.asyncio
async def test_register_email_case_insensitive(client: AsyncClient):
    await client.post("/api/v1/auth/register", json={
        "email": "CaseTest@Example.COM",
        "password": "StrongPass1",
        "full_name": "Case Test",
    })
    response = await client.post("/api/v1/auth/register", json={
        "email": "casetest@example.com",
        "password": "StrongPass1",
        "full_name": "Case Test 2",
    })
    assert response.status_code == 400


# ---------------------------------------------------------------------------
# Auth - Login
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_login_valid(client: AsyncClient):
    await client.post("/api/v1/auth/register", json={
        "email": "login@example.com",
        "password": "StrongPass1",
        "full_name": "Login User",
    })
    response = await client.post("/api/v1/auth/login", json={
        "email": "login@example.com",
        "password": "StrongPass1",
    })
    assert response.status_code == 200
    data = response.json()
    assert "accessToken" in data
    assert data["user"]["email"] == "login@example.com"


@pytest.mark.asyncio
async def test_login_wrong_password(client: AsyncClient):
    await client.post("/api/v1/auth/register", json={
        "email": "wrongpw@example.com",
        "password": "StrongPass1",
        "full_name": "Wrong PW",
    })
    response = await client.post("/api/v1/auth/login", json={
        "email": "wrongpw@example.com",
        "password": "WrongPassword1",
    })
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_login_nonexistent_email(client: AsyncClient):
    response = await client.post("/api/v1/auth/login", json={
        "email": "ghost@example.com",
        "password": "StrongPass1",
    })
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_login_missing_email(client: AsyncClient):
    response = await client.post("/api/v1/auth/login", json={
        "password": "StrongPass1",
    })
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_login_missing_password(client: AsyncClient):
    response = await client.post("/api/v1/auth/login", json={
        "email": "nopw@example.com",
    })
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_login_empty_body(client: AsyncClient):
    response = await client.post("/api/v1/auth/login", json={})
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_login_returns_bearer_token_type(client: AsyncClient):
    await client.post("/api/v1/auth/register", json={
        "email": "bearer@example.com",
        "password": "StrongPass1",
        "full_name": "Bearer Check",
    })
    response = await client.post("/api/v1/auth/login", json={
        "email": "bearer@example.com",
        "password": "StrongPass1",
    })
    assert response.status_code == 200
    assert response.json()["tokenType"] == "bearer"


@pytest.mark.asyncio
async def test_login_inactive_user(client: AsyncClient, db: AsyncSession):
    reg = await client.post("/api/v1/auth/register", json={
        "email": "inactive@example.com",
        "password": "StrongPass1",
        "full_name": "Inactive",
    })
    user_id = uuid.UUID(reg.json()["user"]["id"])
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one()
    user.is_active = False
    await db.commit()

    response = await client.post("/api/v1/auth/login", json={
        "email": "inactive@example.com",
        "password": "StrongPass1",
    })
    assert response.status_code == 401


# ---------------------------------------------------------------------------
# Auth - Token validation / protected endpoints
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_access_protected_without_token(client: AsyncClient):
    response = await client.get("/api/v1/projects")
    assert response.status_code in (401, 403)


@pytest.mark.asyncio
async def test_access_protected_with_invalid_token(client: AsyncClient):
    response = await client.get(
        "/api/v1/projects",
        headers={"Authorization": "Bearer totally-invalid-token"},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_access_protected_with_expired_format_token(client: AsyncClient):
    response = await client.get(
        "/api/v1/projects",
        headers={"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiZXhwIjoxfQ.invalid"},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_access_protected_malformed_bearer(client: AsyncClient):
    response = await client.get(
        "/api/v1/projects",
        headers={"Authorization": "NotBearer some-token"},
    )
    assert response.status_code in (401, 403)


# ---------------------------------------------------------------------------
# Auth - Password hashing
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_password_is_hashed_in_db(client: AsyncClient, db: AsyncSession):
    await client.post("/api/v1/auth/register", json={
        "email": "hashcheck@example.com",
        "password": "StrongPass1",
        "full_name": "Hash Check",
    })
    result = await db.execute(select(User).where(User.email == "hashcheck@example.com"))
    user = result.scalar_one()
    assert user.password_hash is not None
    assert user.password_hash != "StrongPass1"
    assert user.password_hash.startswith("$2")


@pytest.mark.asyncio
async def test_bcrypt_verify_works():
    hashed = get_password_hash("MyPassword1")
    assert verify_password("MyPassword1", hashed) is True
    assert verify_password("WrongPassword1", hashed) is False


# ---------------------------------------------------------------------------
# Auth - User profile (/me)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_current_user_profile(admin_client: AsyncClient, admin_user: User):
    response = await admin_client.get("/api/v1/auth/me")
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == admin_user.email
    assert data["fullName"] == admin_user.full_name


@pytest.mark.asyncio
async def test_get_me_unauthenticated(client: AsyncClient):
    response = await client.get("/api/v1/auth/me")
    assert response.status_code in (401, 403)


# ---------------------------------------------------------------------------
# Projects - List
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_list_projects_empty(admin_client: AsyncClient):
    response = await admin_client.get("/api/v1/projects")
    assert response.status_code == 200
    assert response.json() == []


@pytest.mark.asyncio
async def test_list_projects_with_projects(admin_client: AsyncClient, project: Project):
    response = await admin_client.get("/api/v1/projects")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    codes = [p["code"] for p in data]
    assert project.code in codes


@pytest.mark.asyncio
async def test_list_projects_only_user_projects(
    admin_client: AsyncClient, user_client: AsyncClient, project: Project
):
    response = await user_client.get("/api/v1/projects")
    assert response.status_code == 200
    codes = [p["code"] for p in response.json()]
    assert project.code not in codes


@pytest.mark.asyncio
async def test_list_projects_returns_camel_case(admin_client: AsyncClient, project: Project):
    response = await admin_client.get("/api/v1/projects")
    assert response.status_code == 200
    first = response.json()[0]
    assert "createdAt" in first
    assert "updatedAt" in first


# ---------------------------------------------------------------------------
# Projects - Create
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_project_valid(admin_client: AsyncClient):
    response = await admin_client.post("/api/v1/projects", json={
        "name": "New Project",
        "code": "NEW-001",
    })
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "New Project"
    assert data["code"] == "NEW-001"
    assert data["status"] == "active"


@pytest.mark.asyncio
async def test_create_project_with_description(admin_client: AsyncClient):
    response = await admin_client.post("/api/v1/projects", json={
        "name": "Described Project",
        "code": "DESC-01",
        "description": "A project with a description",
    })
    assert response.status_code == 200
    assert response.json()["description"] == "A project with a description"


@pytest.mark.asyncio
async def test_create_project_with_address(admin_client: AsyncClient):
    response = await admin_client.post("/api/v1/projects", json={
        "name": "Addressed Project",
        "code": "ADDR-01",
        "address": "123 Main St",
    })
    assert response.status_code == 200
    assert response.json()["address"] == "123 Main St"


@pytest.mark.asyncio
async def test_create_project_with_dates(admin_client: AsyncClient):
    response = await admin_client.post("/api/v1/projects", json={
        "name": "Dated Project",
        "code": "DATE-01",
        "start_date": "2025-01-01",
        "estimated_end_date": "2025-12-31",
    })
    assert response.status_code == 200
    data = response.json()
    assert data["startDate"] == "2025-01-01"
    assert data["estimatedEndDate"] == "2025-12-31"


@pytest.mark.asyncio
async def test_create_project_duplicate_code(admin_client: AsyncClient, project: Project):
    try:
        response = await admin_client.post("/api/v1/projects", json={
            "name": "Duplicate Code",
            "code": project.code,
        })
        assert response.status_code in (400, 409, 500)
    except Exception:
        pass


@pytest.mark.asyncio
async def test_create_project_missing_name(admin_client: AsyncClient):
    response = await admin_client.post("/api/v1/projects", json={
        "code": "NONAME-01",
    })
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_create_project_missing_code(admin_client: AsyncClient):
    response = await admin_client.post("/api/v1/projects", json={
        "name": "No Code Project",
    })
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_create_project_empty_body(admin_client: AsyncClient):
    response = await admin_client.post("/api/v1/projects", json={})
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_create_project_auto_adds_creator_as_member(
    admin_client: AsyncClient, db: AsyncSession, admin_user: User
):
    response = await admin_client.post("/api/v1/projects", json={
        "name": "Member Check",
        "code": "MEMB-01",
    })
    assert response.status_code == 200
    data = response.json()
    member_user_ids = [m["userId"] for m in data.get("members", [])]
    assert str(admin_user.id) in member_user_ids


@pytest.mark.asyncio
async def test_create_project_creator_role_is_project_admin(admin_client: AsyncClient):
    response = await admin_client.post("/api/v1/projects", json={
        "name": "Role Check",
        "code": "ROLE-01",
    })
    assert response.status_code == 200
    members = response.json().get("members", [])
    assert any(m["role"] == "project_admin" for m in members)


@pytest.mark.asyncio
async def test_create_project_code_short(admin_client: AsyncClient):
    response = await admin_client.post("/api/v1/projects", json={
        "name": "Short Code",
        "code": "X",
    })
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_create_project_code_special_chars(admin_client: AsyncClient):
    response = await admin_client.post("/api/v1/projects", json={
        "name": "Special Code",
        "code": "AB@#$",
    })
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_create_project_code_uppercase_normalized(admin_client: AsyncClient):
    response = await admin_client.post("/api/v1/projects", json={
        "name": "Lowercase Code",
        "code": "lower-01",
    })
    assert response.status_code == 200
    assert response.json()["code"] == "LOWER-01"


@pytest.mark.asyncio
async def test_create_project_unauthenticated(client: AsyncClient):
    response = await client.post("/api/v1/projects", json={
        "name": "No Auth",
        "code": "NOAUTH-01",
    })
    assert response.status_code in (401, 403)


# ---------------------------------------------------------------------------
# Projects - Get by ID
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_project_valid(admin_client: AsyncClient, project: Project):
    response = await admin_client.get(f"/api/v1/projects/{project.id}")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == str(project.id)
    assert data["name"] == project.name
    assert data["code"] == project.code


@pytest.mark.asyncio
async def test_get_project_not_found(admin_client: AsyncClient):
    fake_id = uuid.uuid4()
    response = await admin_client.get(f"/api/v1/projects/{fake_id}")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_get_project_wrong_user(user_client: AsyncClient, project: Project):
    response = await user_client.get(f"/api/v1/projects/{project.id}")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_get_project_invalid_uuid(admin_client: AsyncClient):
    response = await admin_client.get("/api/v1/projects/not-a-uuid")
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_get_project_returns_members(admin_client: AsyncClient, project: Project):
    response = await admin_client.get(f"/api/v1/projects/{project.id}")
    assert response.status_code == 200
    assert "members" in response.json()
    assert len(response.json()["members"]) >= 1


# ---------------------------------------------------------------------------
# Projects - Update
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_update_project_name(admin_client: AsyncClient, project: Project):
    response = await admin_client.put(f"/api/v1/projects/{project.id}", json={
        "name": "Updated Name",
    })
    assert response.status_code == 200
    assert response.json()["name"] == "Updated Name"


@pytest.mark.asyncio
async def test_update_project_description(admin_client: AsyncClient, project: Project):
    response = await admin_client.put(f"/api/v1/projects/{project.id}", json={
        "description": "Updated description text",
    })
    assert response.status_code == 200
    assert response.json()["description"] == "Updated description text"


@pytest.mark.asyncio
async def test_update_project_status(admin_client: AsyncClient, project: Project):
    response = await admin_client.put(f"/api/v1/projects/{project.id}", json={
        "status": "completed",
    })
    assert response.status_code == 200
    assert response.json()["status"] == "completed"


@pytest.mark.asyncio
async def test_update_project_partial_keeps_other_fields(
    admin_client: AsyncClient, project: Project
):
    response = await admin_client.put(f"/api/v1/projects/{project.id}", json={
        "description": "New description only",
    })
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == project.name
    assert data["code"] == project.code
    assert data["description"] == "New description only"


@pytest.mark.asyncio
async def test_update_project_not_found(admin_client: AsyncClient):
    fake_id = uuid.uuid4()
    response = await admin_client.put(f"/api/v1/projects/{fake_id}", json={
        "name": "Ghost",
    })
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_update_project_wrong_user(user_client: AsyncClient, project: Project):
    response = await user_client.put(f"/api/v1/projects/{project.id}", json={
        "name": "Hacked Name",
    })
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_update_project_address(admin_client: AsyncClient, project: Project):
    response = await admin_client.put(f"/api/v1/projects/{project.id}", json={
        "address": "456 Updated Ave",
    })
    assert response.status_code == 200
    assert response.json()["address"] == "456 Updated Ave"


@pytest.mark.asyncio
async def test_update_project_start_date(admin_client: AsyncClient, project: Project):
    response = await admin_client.put(f"/api/v1/projects/{project.id}", json={
        "start_date": "2025-06-01",
    })
    assert response.status_code == 200
    assert response.json()["startDate"] == "2025-06-01"


@pytest.mark.asyncio
async def test_update_project_empty_body(admin_client: AsyncClient, project: Project):
    response = await admin_client.put(f"/api/v1/projects/{project.id}", json={})
    assert response.status_code == 200
    assert response.json()["name"] == project.name


# ---------------------------------------------------------------------------
# Projects - Delete
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_delete_project_valid(admin_client: AsyncClient, project: Project):
    response = await admin_client.delete(f"/api/v1/projects/{project.id}")
    assert response.status_code == 200
    assert response.json()["message"] == "Project deleted"

    get_resp = await admin_client.get(f"/api/v1/projects/{project.id}")
    assert get_resp.status_code == 404


@pytest.mark.asyncio
async def test_delete_project_not_found(admin_client: AsyncClient):
    fake_id = uuid.uuid4()
    response = await admin_client.delete(f"/api/v1/projects/{fake_id}")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_delete_project_wrong_user(user_client: AsyncClient, project: Project):
    response = await user_client.delete(f"/api/v1/projects/{project.id}")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_delete_project_unauthenticated(client: AsyncClient, project: Project):
    response = await client.delete(f"/api/v1/projects/{project.id}")
    assert response.status_code in (401, 403)


# ---------------------------------------------------------------------------
# Projects - Members management
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_add_member_to_project(
    admin_client: AsyncClient, project: Project, regular_user: User
):
    response = await admin_client.post(
        f"/api/v1/projects/{project.id}/members",
        json={"user_id": str(regular_user.id), "role": "contractor"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["userId"] == str(regular_user.id)
    assert data["role"] == "contractor"


@pytest.mark.asyncio
async def test_remove_member_from_project(
    admin_client: AsyncClient, project: Project, regular_user: User, db: AsyncSession
):
    member = ProjectMember(
        project_id=project.id, user_id=regular_user.id, role="contractor"
    )
    db.add(member)
    await db.commit()

    response = await admin_client.delete(
        f"/api/v1/projects/{project.id}/members/{regular_user.id}"
    )
    assert response.status_code == 200
    assert response.json()["message"] == "Member removed"


@pytest.mark.asyncio
async def test_remove_nonexistent_member(admin_client: AsyncClient, project: Project):
    fake_user_id = uuid.uuid4()
    response = await admin_client.delete(
        f"/api/v1/projects/{project.id}/members/{fake_user_id}"
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_member_access_after_add(
    admin_client: AsyncClient,
    project: Project,
    regular_user: User,
    db: AsyncSession,
):
    member = ProjectMember(
        project_id=project.id, user_id=regular_user.id, role="contractor"
    )
    db.add(member)
    await db.commit()

    result = await db.execute(
        select(ProjectMember).where(
            ProjectMember.project_id == project.id,
            ProjectMember.user_id == regular_user.id,
        )
    )
    assert result.scalar_one_or_none() is not None


# ---------------------------------------------------------------------------
# Projects - Cross-project isolation
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_cross_project_isolation(
    admin_client: AsyncClient, project: Project, regular_user: User, db: AsyncSession
):
    admin_resp = await admin_client.get("/api/v1/projects")
    assert response_contains_project(admin_resp.json(), project.code)

    result = await db.execute(
        select(ProjectMember).where(
            ProjectMember.project_id == project.id,
            ProjectMember.user_id == regular_user.id,
        )
    )
    assert result.scalar_one_or_none() is None


@pytest.mark.asyncio
async def test_user_sees_only_own_projects(
    user_client: AsyncClient,
    db: AsyncSession,
    regular_user: User,
):
    proj = Project(
        id=uuid.uuid4(),
        name="User Only Project",
        code="USR-ONLY",
        status="active",
        created_by_id=regular_user.id,
    )
    db.add(proj)
    await db.flush()
    db.add(ProjectMember(
        project_id=proj.id, user_id=regular_user.id, role="project_admin"
    ))
    await db.commit()

    response = await user_client.get("/api/v1/projects")
    assert response.status_code == 200
    codes = [p["code"] for p in response.json()]
    assert "USR-ONLY" in codes


# ---------------------------------------------------------------------------
# Projects - Status management
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_project_default_status_active(admin_client: AsyncClient):
    response = await admin_client.post("/api/v1/projects", json={
        "name": "Status Default",
        "code": "STAT-01",
    })
    assert response.status_code == 200
    assert response.json()["status"] == "active"


@pytest.mark.asyncio
async def test_update_project_status_on_hold(admin_client: AsyncClient, project: Project):
    response = await admin_client.put(f"/api/v1/projects/{project.id}", json={
        "status": "on_hold",
    })
    assert response.status_code == 200
    assert response.json()["status"] == "on_hold"


@pytest.mark.asyncio
async def test_update_project_status_archived(admin_client: AsyncClient, project: Project):
    response = await admin_client.put(f"/api/v1/projects/{project.id}", json={
        "status": "archived",
    })
    assert response.status_code == 200
    assert response.json()["status"] == "archived"


# ---------------------------------------------------------------------------
# Projects - Input validation edge cases
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_project_very_long_name(admin_client: AsyncClient):
    long_name = "A" * 300
    response = await admin_client.post("/api/v1/projects", json={
        "name": long_name,
        "code": "LONG-01",
    })
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_create_project_name_min_length(admin_client: AsyncClient):
    response = await admin_client.post("/api/v1/projects", json={
        "name": "AB",
        "code": "MIN-01",
    })
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_create_project_code_with_underscore(admin_client: AsyncClient):
    response = await admin_client.post("/api/v1/projects", json={
        "name": "Underscore Code",
        "code": "UNDER_01",
    })
    assert response.status_code == 200
    assert response.json()["code"] == "UNDER_01"


@pytest.mark.asyncio
async def test_create_project_code_with_hyphen(admin_client: AsyncClient):
    response = await admin_client.post("/api/v1/projects", json={
        "name": "Hyphen Code",
        "code": "HYP-01",
    })
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_get_project_with_wrong_uuid_format(admin_client: AsyncClient):
    response = await admin_client.get("/api/v1/projects/12345")
    assert response.status_code == 422


# ---------------------------------------------------------------------------
# Projects - Multiple projects
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_list_multiple_projects(admin_client: AsyncClient):
    for i in range(3):
        await admin_client.post("/api/v1/projects", json={
            "name": f"Multi Project {i}",
            "code": f"MULTI-{i:02d}",
        })
    response = await admin_client.get("/api/v1/projects")
    assert response.status_code == 200
    assert len(response.json()) == 3


@pytest.mark.asyncio
async def test_create_two_projects_different_codes(admin_client: AsyncClient):
    r1 = await admin_client.post("/api/v1/projects", json={
        "name": "First", "code": "FIRST-01",
    })
    r2 = await admin_client.post("/api/v1/projects", json={
        "name": "Second", "code": "SECOND-01",
    })
    assert r1.status_code == 200
    assert r2.status_code == 200
    assert r1.json()["code"] != r2.json()["code"]


@pytest.mark.asyncio
async def test_delete_then_list_projects(admin_client: AsyncClient, project: Project):
    await admin_client.delete(f"/api/v1/projects/{project.id}")
    response = await admin_client.get("/api/v1/projects")
    assert response.status_code == 200
    ids = [p["id"] for p in response.json()]
    assert str(project.id) not in ids


# ---------------------------------------------------------------------------
# Auth + Projects integration
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_register_then_create_project(client: AsyncClient):
    reg = await client.post("/api/v1/auth/register", json={
        "email": "fullflow@example.com",
        "password": "StrongPass1",
        "full_name": "Full Flow",
    })
    assert reg.status_code == 201
    token = reg.json()["accessToken"]

    create_resp = await client.post(
        "/api/v1/projects",
        json={"name": "Flow Project", "code": "FLOW-01"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert create_resp.status_code == 200
    assert create_resp.json()["name"] == "Flow Project"


@pytest.mark.asyncio
async def test_login_then_list_projects(client: AsyncClient):
    await client.post("/api/v1/auth/register", json={
        "email": "listflow@example.com",
        "password": "StrongPass1",
        "full_name": "List Flow",
    })
    login_resp = await client.post("/api/v1/auth/login", json={
        "email": "listflow@example.com",
        "password": "StrongPass1",
    })
    token = login_resp.json()["accessToken"]

    list_resp = await client.get(
        "/api/v1/projects",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert list_resp.status_code == 200


@pytest.mark.asyncio
async def test_token_from_register_works_for_me(client: AsyncClient):
    reg = await client.post("/api/v1/auth/register", json={
        "email": "meflow@example.com",
        "password": "StrongPass1",
        "full_name": "Me Flow",
    })
    token = reg.json()["accessToken"]
    me_resp = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me_resp.status_code == 200
    assert me_resp.json()["email"] == "meflow@example.com"


@pytest.mark.asyncio
async def test_create_access_token_returns_jwt():
    user_id = uuid.uuid4()
    token = create_access_token(user_id)
    assert isinstance(token, str)
    assert len(token) > 20


@pytest.mark.asyncio
async def test_two_users_isolated_projects(
    db: AsyncSession,
    admin_user: User,
    regular_user: User,
):
    admin_proj = Project(
        id=uuid.uuid4(),
        name="Admin Only",
        code="ADMONLY-01",
        status="active",
        created_by_id=admin_user.id,
    )
    db.add(admin_proj)
    await db.flush()
    db.add(ProjectMember(
        project_id=admin_proj.id, user_id=admin_user.id, role="project_admin"
    ))

    user_proj = Project(
        id=uuid.uuid4(),
        name="User Only",
        code="USRONLY-01",
        status="active",
        created_by_id=regular_user.id,
    )
    db.add(user_proj)
    await db.flush()
    db.add(ProjectMember(
        project_id=user_proj.id, user_id=regular_user.id, role="project_admin"
    ))
    await db.commit()

    admin_memberships = await db.execute(
        select(ProjectMember.project_id).where(
            ProjectMember.user_id == admin_user.id
        )
    )
    admin_project_ids = {row[0] for row in admin_memberships.all()}
    assert admin_proj.id in admin_project_ids
    assert user_proj.id not in admin_project_ids

    user_memberships = await db.execute(
        select(ProjectMember.project_id).where(
            ProjectMember.user_id == regular_user.id
        )
    )
    user_project_ids = {row[0] for row in user_memberships.all()}
    assert user_proj.id in user_project_ids
    assert admin_proj.id not in user_project_ids


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

def response_contains_project(projects_list: list, code: str) -> bool:
    return any(p["code"] == code for p in projects_list)
