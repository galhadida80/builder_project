import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.organization import Organization, OrganizationMember
from app.models.role import OrganizationRole
from app.models.user import User

API = "/api/v1"


@pytest.fixture
async def organization(db: AsyncSession, admin_user: User) -> Organization:
    """Fixture that creates a test organization with admin user as member"""
    org = Organization(
        id=uuid.uuid4(),
        name="Test Organization",
        code="TEST-ORG",
        description="Test organization for roles testing",
    )
    db.add(org)
    await db.flush()

    member = OrganizationMember(
        organization_id=org.id,
        user_id=admin_user.id,
        role="org_admin",
    )
    db.add(member)
    await db.commit()
    await db.refresh(org)
    return org


@pytest.fixture
async def regular_org_member(
    db: AsyncSession,
    organization: Organization,
    regular_user: User
) -> OrganizationMember:
    """Fixture that creates a non-admin organization member"""
    member = OrganizationMember(
        organization_id=organization.id,
        user_id=regular_user.id,
        role="org_member",
    )
    db.add(member)
    await db.commit()
    await db.refresh(member)
    return member


@pytest.fixture
async def organization_role(
    db: AsyncSession,
    organization: Organization,
    admin_user: User
) -> OrganizationRole:
    """Fixture that creates a test organization role"""
    role = OrganizationRole(
        id=uuid.uuid4(),
        organization_id=organization.id,
        name="Project Manager",
        description="Manages projects within the organization",
        permissions=["create_project", "edit_project", "view_reports"],
        is_system_role=False,
        created_by_id=admin_user.id,
    )
    db.add(role)
    await db.commit()
    await db.refresh(role)
    return role


@pytest.fixture
async def system_role(
    db: AsyncSession,
    organization: Organization,
    admin_user: User
) -> OrganizationRole:
    """Fixture that creates a system role that cannot be modified"""
    role = OrganizationRole(
        id=uuid.uuid4(),
        organization_id=organization.id,
        name="System Admin",
        description="Built-in system administrator role",
        permissions=["*"],
        is_system_role=True,
        created_by_id=admin_user.id,
    )
    db.add(role)
    await db.commit()
    await db.refresh(role)
    return role


class TestListOrganizationRoles:
    """Tests for GET /organizations/{org_id}/roles endpoint"""

    @pytest.mark.asyncio
    async def test_list_roles_as_admin(
        self,
        admin_client: AsyncClient,
        organization: Organization,
        organization_role: OrganizationRole,
    ):
        resp = await admin_client.get(f"{API}/organizations/{organization.id}/roles")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)
        assert len(resp.json()) >= 1

    @pytest.mark.asyncio
    async def test_list_roles_returns_role_fields(
        self,
        admin_client: AsyncClient,
        organization: Organization,
        organization_role: OrganizationRole,
    ):
        resp = await admin_client.get(f"{API}/organizations/{organization.id}/roles")
        assert resp.status_code == 200
        roles = resp.json()
        role = roles[0]
        assert "id" in role
        assert "name" in role
        assert "description" in role
        assert "permissions" in role
        assert "isSystemRole" in role
        assert "createdById" in role
        assert "createdAt" in role
        assert "updatedAt" in role

    @pytest.mark.asyncio
    async def test_list_roles_camel_case_fields(
        self,
        admin_client: AsyncClient,
        organization: Organization,
        organization_role: OrganizationRole,
    ):
        resp = await admin_client.get(f"{API}/organizations/{organization.id}/roles")
        assert resp.status_code == 200
        role = resp.json()[0]
        assert "isSystemRole" in role
        assert "is_system_role" not in role
        assert "createdById" in role
        assert "created_by_id" not in role

    @pytest.mark.asyncio
    async def test_list_roles_ordered_by_name(
        self,
        admin_client: AsyncClient,
        organization: Organization,
        db: AsyncSession,
        admin_user: User,
    ):
        role_a = OrganizationRole(
            organization_id=organization.id,
            name="Alpha Role",
            permissions=["view"],
            created_by_id=admin_user.id,
        )
        role_z = OrganizationRole(
            organization_id=organization.id,
            name="Zeta Role",
            permissions=["edit"],
            created_by_id=admin_user.id,
        )
        db.add(role_a)
        db.add(role_z)
        await db.commit()

        resp = await admin_client.get(f"{API}/organizations/{organization.id}/roles")
        assert resp.status_code == 200
        roles = resp.json()
        names = [r["name"] for r in roles]
        assert names == sorted(names)

    @pytest.mark.asyncio
    async def test_list_roles_as_regular_member(
        self,
        user_client: AsyncClient,
        organization: Organization,
        organization_role: OrganizationRole,
        regular_org_member: OrganizationMember,
    ):
        resp = await user_client.get(f"{API}/organizations/{organization.id}/roles")
        assert resp.status_code == 200
        assert len(resp.json()) >= 1

    @pytest.mark.asyncio
    async def test_list_roles_non_member_forbidden(
        self,
        user_client: AsyncClient,
        organization: Organization,
    ):
        resp = await user_client.get(f"{API}/organizations/{organization.id}/roles")
        assert resp.status_code == 403

    @pytest.mark.asyncio
    async def test_list_roles_unauthenticated(
        self,
        client: AsyncClient,
        organization: Organization,
    ):
        resp = await client.get(f"{API}/organizations/{organization.id}/roles")
        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_list_roles_invalid_org_id(self, admin_client: AsyncClient):
        invalid_id = uuid.uuid4()
        resp = await admin_client.get(f"{API}/organizations/{invalid_id}/roles")
        assert resp.status_code == 403


class TestCreateOrganizationRole:
    """Tests for POST /organizations/{org_id}/roles endpoint"""

    @pytest.mark.asyncio
    async def test_create_role_success(
        self,
        admin_client: AsyncClient,
        organization: Organization,
    ):
        data = {
            "organization_id": str(organization.id),
            "name": "New Role",
            "description": "A new custom role",
            "permissions": ["create", "edit", "view"],
        }
        resp = await admin_client.post(
            f"{API}/organizations/{organization.id}/roles", json=data
        )
        assert resp.status_code == 201
        body = resp.json()
        assert body["name"] == "New Role"
        assert body["description"] == "A new custom role"
        assert body["permissions"] == ["create", "edit", "view"]
        assert body["isSystemRole"] is False

    @pytest.mark.asyncio
    async def test_create_role_returns_id(
        self,
        admin_client: AsyncClient,
        organization: Organization,
    ):
        data = {
            "organization_id": str(organization.id),
            "name": "Role with ID",
            "permissions": [],
        }
        resp = await admin_client.post(
            f"{API}/organizations/{organization.id}/roles", json=data
        )
        assert resp.status_code == 201
        assert "id" in resp.json()

    @pytest.mark.asyncio
    async def test_create_role_sets_created_by(
        self,
        admin_client: AsyncClient,
        organization: Organization,
        admin_user: User,
    ):
        data = {
            "organization_id": str(organization.id),
            "name": "Tracked Role",
            "permissions": [],
        }
        resp = await admin_client.post(
            f"{API}/organizations/{organization.id}/roles", json=data
        )
        assert resp.status_code == 201
        assert resp.json()["createdById"] == str(admin_user.id)

    @pytest.mark.asyncio
    async def test_create_role_org_id_mismatch(
        self,
        admin_client: AsyncClient,
        organization: Organization,
    ):
        different_org_id = uuid.uuid4()
        data = {
            "organization_id": str(different_org_id),
            "name": "Mismatched Role",
            "permissions": [],
        }
        resp = await admin_client.post(
            f"{API}/organizations/{organization.id}/roles", json=data
        )
        assert resp.status_code == 400
        assert "mismatch" in resp.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_create_role_duplicate_name(
        self,
        admin_client: AsyncClient,
        organization: Organization,
        organization_role: OrganizationRole,
    ):
        data = {
            "organization_id": str(organization.id),
            "name": organization_role.name,
            "permissions": [],
        }
        resp = await admin_client.post(
            f"{API}/organizations/{organization.id}/roles", json=data
        )
        assert resp.status_code == 409
        assert "already exists" in resp.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_create_role_as_regular_member(
        self,
        user_client: AsyncClient,
        organization: Organization,
        regular_org_member: OrganizationMember,
    ):
        data = {
            "organization_id": str(organization.id),
            "name": "Unauthorized Role",
            "permissions": [],
        }
        resp = await user_client.post(
            f"{API}/organizations/{organization.id}/roles", json=data
        )
        assert resp.status_code == 403

    @pytest.mark.asyncio
    async def test_create_role_missing_name(
        self,
        admin_client: AsyncClient,
        organization: Organization,
    ):
        data = {
            "organization_id": str(organization.id),
            "permissions": [],
        }
        resp = await admin_client.post(
            f"{API}/organizations/{organization.id}/roles", json=data
        )
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_create_role_empty_name(
        self,
        admin_client: AsyncClient,
        organization: Organization,
    ):
        data = {
            "organization_id": str(organization.id),
            "name": "",
            "permissions": [],
        }
        resp = await admin_client.post(
            f"{API}/organizations/{organization.id}/roles", json=data
        )
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_create_role_name_too_long(
        self,
        admin_client: AsyncClient,
        organization: Organization,
    ):
        data = {
            "organization_id": str(organization.id),
            "name": "X" * 101,
            "permissions": [],
        }
        resp = await admin_client.post(
            f"{API}/organizations/{organization.id}/roles", json=data
        )
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_create_role_without_description(
        self,
        admin_client: AsyncClient,
        organization: Organization,
    ):
        data = {
            "organization_id": str(organization.id),
            "name": "No Description",
            "permissions": [],
        }
        resp = await admin_client.post(
            f"{API}/organizations/{organization.id}/roles", json=data
        )
        assert resp.status_code == 201
        assert resp.json()["description"] is None


class TestGetOrganizationRole:
    """Tests for GET /organizations/{org_id}/roles/{role_id} endpoint"""

    @pytest.mark.asyncio
    async def test_get_role_success(
        self,
        admin_client: AsyncClient,
        organization: Organization,
        organization_role: OrganizationRole,
    ):
        resp = await admin_client.get(
            f"{API}/organizations/{organization.id}/roles/{organization_role.id}"
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["id"] == str(organization_role.id)
        assert body["name"] == organization_role.name

    @pytest.mark.asyncio
    async def test_get_role_not_found(
        self,
        admin_client: AsyncClient,
        organization: Organization,
    ):
        invalid_role_id = uuid.uuid4()
        resp = await admin_client.get(
            f"{API}/organizations/{organization.id}/roles/{invalid_role_id}"
        )
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_get_role_wrong_organization(
        self,
        admin_client: AsyncClient,
        organization: Organization,
        organization_role: OrganizationRole,
    ):
        different_org_id = uuid.uuid4()
        resp = await admin_client.get(
            f"{API}/organizations/{different_org_id}/roles/{organization_role.id}"
        )
        assert resp.status_code == 403

    @pytest.mark.asyncio
    async def test_get_role_as_regular_member(
        self,
        user_client: AsyncClient,
        organization: Organization,
        organization_role: OrganizationRole,
        regular_org_member: OrganizationMember,
    ):
        resp = await user_client.get(
            f"{API}/organizations/{organization.id}/roles/{organization_role.id}"
        )
        assert resp.status_code == 200

    @pytest.mark.asyncio
    async def test_get_role_unauthenticated(
        self,
        client: AsyncClient,
        organization: Organization,
        organization_role: OrganizationRole,
    ):
        resp = await client.get(
            f"{API}/organizations/{organization.id}/roles/{organization_role.id}"
        )
        assert resp.status_code == 401


class TestUpdateOrganizationRole:
    """Tests for PUT /organizations/{org_id}/roles/{role_id} endpoint"""

    @pytest.mark.asyncio
    async def test_update_role_name(
        self,
        admin_client: AsyncClient,
        organization: Organization,
        organization_role: OrganizationRole,
    ):
        data = {"name": "Updated Role Name"}
        resp = await admin_client.put(
            f"{API}/organizations/{organization.id}/roles/{organization_role.id}",
            json=data,
        )
        assert resp.status_code == 200
        assert resp.json()["name"] == "Updated Role Name"

    @pytest.mark.asyncio
    async def test_update_role_description(
        self,
        admin_client: AsyncClient,
        organization: Organization,
        organization_role: OrganizationRole,
    ):
        data = {"description": "Updated description"}
        resp = await admin_client.put(
            f"{API}/organizations/{organization.id}/roles/{organization_role.id}",
            json=data,
        )
        assert resp.status_code == 200
        assert resp.json()["description"] == "Updated description"

    @pytest.mark.asyncio
    async def test_update_role_permissions(
        self,
        admin_client: AsyncClient,
        organization: Organization,
        organization_role: OrganizationRole,
    ):
        data = {"permissions": ["new_permission", "another_permission"]}
        resp = await admin_client.put(
            f"{API}/organizations/{organization.id}/roles/{organization_role.id}",
            json=data,
        )
        assert resp.status_code == 200
        assert set(resp.json()["permissions"]) == {"new_permission", "another_permission"}

    @pytest.mark.asyncio
    async def test_update_role_multiple_fields(
        self,
        admin_client: AsyncClient,
        organization: Organization,
        organization_role: OrganizationRole,
    ):
        data = {
            "name": "Multi Update",
            "description": "All fields updated",
            "permissions": ["all"],
        }
        resp = await admin_client.put(
            f"{API}/organizations/{organization.id}/roles/{organization_role.id}",
            json=data,
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["name"] == "Multi Update"
        assert body["description"] == "All fields updated"
        assert body["permissions"] == ["all"]

    @pytest.mark.asyncio
    async def test_update_role_duplicate_name(
        self,
        admin_client: AsyncClient,
        organization: Organization,
        organization_role: OrganizationRole,
        db: AsyncSession,
        admin_user: User,
    ):
        existing_role = OrganizationRole(
            organization_id=organization.id,
            name="Existing Role",
            permissions=[],
            created_by_id=admin_user.id,
        )
        db.add(existing_role)
        await db.commit()

        data = {"name": "Existing Role"}
        resp = await admin_client.put(
            f"{API}/organizations/{organization.id}/roles/{organization_role.id}",
            json=data,
        )
        assert resp.status_code == 409

    @pytest.mark.asyncio
    async def test_update_system_role_forbidden(
        self,
        admin_client: AsyncClient,
        organization: Organization,
        system_role: OrganizationRole,
    ):
        data = {"name": "Try to Update System"}
        resp = await admin_client.put(
            f"{API}/organizations/{organization.id}/roles/{system_role.id}",
            json=data,
        )
        assert resp.status_code == 403
        assert "system" in resp.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_update_role_as_regular_member(
        self,
        user_client: AsyncClient,
        organization: Organization,
        organization_role: OrganizationRole,
        regular_org_member: OrganizationMember,
    ):
        data = {"name": "Unauthorized Update"}
        resp = await user_client.put(
            f"{API}/organizations/{organization.id}/roles/{organization_role.id}",
            json=data,
        )
        assert resp.status_code == 403

    @pytest.mark.asyncio
    async def test_update_role_not_found(
        self,
        admin_client: AsyncClient,
        organization: Organization,
    ):
        invalid_role_id = uuid.uuid4()
        data = {"name": "Nonexistent"}
        resp = await admin_client.put(
            f"{API}/organizations/{organization.id}/roles/{invalid_role_id}",
            json=data,
        )
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_update_role_empty_name(
        self,
        admin_client: AsyncClient,
        organization: Organization,
        organization_role: OrganizationRole,
    ):
        data = {"name": ""}
        resp = await admin_client.put(
            f"{API}/organizations/{organization.id}/roles/{organization_role.id}",
            json=data,
        )
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_update_role_name_too_long(
        self,
        admin_client: AsyncClient,
        organization: Organization,
        organization_role: OrganizationRole,
    ):
        data = {"name": "X" * 101}
        resp = await admin_client.put(
            f"{API}/organizations/{organization.id}/roles/{organization_role.id}",
            json=data,
        )
        assert resp.status_code == 422


class TestDeleteOrganizationRole:
    """Tests for DELETE /organizations/{org_id}/roles/{role_id} endpoint"""

    @pytest.mark.asyncio
    async def test_delete_role_success(
        self,
        admin_client: AsyncClient,
        organization: Organization,
        organization_role: OrganizationRole,
    ):
        resp = await admin_client.delete(
            f"{API}/organizations/{organization.id}/roles/{organization_role.id}"
        )
        assert resp.status_code == 200
        body = resp.json()
        assert "message" in body
        assert "deleted" in body["message"].lower()

    @pytest.mark.asyncio
    async def test_delete_role_not_found(
        self,
        admin_client: AsyncClient,
        organization: Organization,
    ):
        invalid_role_id = uuid.uuid4()
        resp = await admin_client.delete(
            f"{API}/organizations/{organization.id}/roles/{invalid_role_id}"
        )
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_delete_system_role_forbidden(
        self,
        admin_client: AsyncClient,
        organization: Organization,
        system_role: OrganizationRole,
    ):
        resp = await admin_client.delete(
            f"{API}/organizations/{organization.id}/roles/{system_role.id}"
        )
        assert resp.status_code == 403
        assert "system" in resp.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_delete_role_as_regular_member(
        self,
        user_client: AsyncClient,
        organization: Organization,
        organization_role: OrganizationRole,
        regular_org_member: OrganizationMember,
    ):
        resp = await user_client.delete(
            f"{API}/organizations/{organization.id}/roles/{organization_role.id}"
        )
        assert resp.status_code == 403

    @pytest.mark.asyncio
    async def test_delete_role_unauthenticated(
        self,
        client: AsyncClient,
        organization: Organization,
        organization_role: OrganizationRole,
    ):
        resp = await client.delete(
            f"{API}/organizations/{organization.id}/roles/{organization_role.id}"
        )
        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_delete_role_wrong_organization(
        self,
        admin_client: AsyncClient,
        organization: Organization,
        organization_role: OrganizationRole,
    ):
        different_org_id = uuid.uuid4()
        resp = await admin_client.delete(
            f"{API}/organizations/{different_org_id}/roles/{organization_role.id}"
        )
        assert resp.status_code == 403
