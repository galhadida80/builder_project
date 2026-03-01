import uuid
from datetime import datetime, timedelta

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.organization import Organization, OrganizationMember
from app.models.permission_audit import PermissionAction, PermissionAudit
from app.models.permission_override import PermissionOverride
from app.models.project import Project, ProjectMember
from app.models.resource_permission import ResourcePermission
from app.models.role import OrganizationRole, ProjectRole
from app.models.user import User

API = "/api/v1"


@pytest.fixture
async def organization(db: AsyncSession, admin_user: User) -> Organization:
    """Fixture that creates a test organization"""
    org = Organization(
        id=uuid.uuid4(),
        name="Test Organization",
        code="TEST-ORG",
        description="Test organization for permissions testing",
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
async def project_with_org(
    db: AsyncSession, admin_user: User, organization: Organization
) -> Project:
    """Fixture that creates a test project with organization"""
    proj = Project(
        id=uuid.uuid4(),
        name="Test Project",
        description="Test project for permissions testing",
        status="active",
        created_by_id=admin_user.id,
        organization_id=organization.id,
    )
    db.add(proj)
    await db.flush()

    admin_member = ProjectMember(
        project_id=proj.id,
        user_id=admin_user.id,
        role="project_admin",
    )
    db.add(admin_member)
    await db.commit()
    await db.refresh(proj)
    return proj


@pytest.fixture
async def project_member_regular(
    db: AsyncSession, project_with_org: Project, regular_user: User
) -> ProjectMember:
    """Fixture that creates a regular project member"""
    member = ProjectMember(
        project_id=project_with_org.id,
        user_id=regular_user.id,
        role="project_member",
    )
    db.add(member)
    await db.commit()
    await db.refresh(member)
    return member


@pytest.fixture
async def organization_role(
    db: AsyncSession, organization: Organization, admin_user: User
) -> OrganizationRole:
    """Fixture that creates a test organization role"""
    role = OrganizationRole(
        id=uuid.uuid4(),
        organization_id=organization.id,
        name="Custom Inspector",
        description="Custom role for inspectors",
        permissions=["create_inspection", "edit_inspection", "view_inspection"],
        is_system_role=False,
        created_by_id=admin_user.id,
    )
    db.add(role)
    await db.commit()
    await db.refresh(role)
    return role


@pytest.fixture
async def project_role(
    db: AsyncSession, project_with_org: Project, admin_user: User
) -> ProjectRole:
    """Fixture that creates a test project role"""
    role = ProjectRole(
        id=uuid.uuid4(),
        project_id=project_with_org.id,
        name="Custom Manager",
        description="Custom role for project managers",
        permissions=["create_task", "edit_task", "delete_task"],
        is_system_role=False,
        created_by_id=admin_user.id,
    )
    db.add(role)
    await db.commit()
    await db.refresh(role)
    return role


@pytest.fixture
async def permission_audit_entry(
    db: AsyncSession, project_with_org: Project, admin_user: User, regular_user: User
) -> PermissionAudit:
    """Fixture that creates a permission audit log entry"""
    audit = PermissionAudit(
        id=uuid.uuid4(),
        action=PermissionAction.ROLE_ASSIGNED.value,
        user_id=admin_user.id,
        target_user_id=regular_user.id,
        project_id=project_with_org.id,
        entity_type="project_member",
        entity_id=uuid.uuid4(),
        old_values={"role": "viewer"},
        new_values={"role": "project_member"},
    )
    db.add(audit)
    await db.commit()
    await db.refresh(audit)
    return audit


class TestGetPermissionMatrix:
    """Tests for GET /projects/{project_id}/permissions/matrix endpoint"""

    @pytest.mark.asyncio
    async def test_get_matrix_as_admin(
        self,
        admin_client: AsyncClient,
        project_with_org: Project,
        project_member_regular: ProjectMember,
    ):
        resp = await admin_client.get(
            f"{API}/projects/{project_with_org.id}/permissions/matrix"
        )
        assert resp.status_code == 200

    @pytest.mark.asyncio
    async def test_get_matrix_returns_expected_fields(
        self,
        admin_client: AsyncClient,
        project_with_org: Project,
        project_member_regular: ProjectMember,
    ):
        resp = await admin_client.get(
            f"{API}/projects/{project_with_org.id}/permissions/matrix"
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "projectId" in data
        assert "projectName" in data
        assert "members" in data
        assert isinstance(data["members"], list)

    @pytest.mark.asyncio
    async def test_get_matrix_returns_camel_case_fields(
        self,
        admin_client: AsyncClient,
        project_with_org: Project,
        project_member_regular: ProjectMember,
    ):
        resp = await admin_client.get(
            f"{API}/projects/{project_with_org.id}/permissions/matrix"
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "projectId" in data
        assert "project_id" not in data
        assert "projectName" in data
        assert "project_name" not in data

    @pytest.mark.asyncio
    async def test_get_matrix_member_fields(
        self,
        admin_client: AsyncClient,
        project_with_org: Project,
        project_member_regular: ProjectMember,
    ):
        resp = await admin_client.get(
            f"{API}/projects/{project_with_org.id}/permissions/matrix"
        )
        assert resp.status_code == 200
        members = resp.json()["members"]
        assert len(members) >= 1
        member = members[0]
        assert "userId" in member
        assert "userName" in member
        assert "email" in member
        assert "role" in member
        assert "effectivePermissions" in member
        assert "resourcePermissions" in member

    @pytest.mark.asyncio
    async def test_get_matrix_includes_all_members(
        self,
        admin_client: AsyncClient,
        project_with_org: Project,
        project_member_regular: ProjectMember,
    ):
        resp = await admin_client.get(
            f"{API}/projects/{project_with_org.id}/permissions/matrix"
        )
        assert resp.status_code == 200
        members = resp.json()["members"]
        assert len(members) >= 2

    @pytest.mark.asyncio
    async def test_get_matrix_project_not_found(
        self,
        admin_client: AsyncClient,
    ):
        fake_id = uuid.uuid4()
        resp = await admin_client.get(f"{API}/projects/{fake_id}/permissions/matrix")
        assert resp.status_code == 403

    @pytest.mark.asyncio
    async def test_get_matrix_requires_authentication(
        self,
        client: AsyncClient,
        project_with_org: Project,
    ):
        resp = await client.get(
            f"{API}/projects/{project_with_org.id}/permissions/matrix"
        )
        assert resp.status_code == 401


class TestBulkAssignPermissions:
    """Tests for POST /projects/{project_id}/permissions/bulk-assign endpoint"""

    @pytest.mark.asyncio
    async def test_bulk_assign_with_project_role(
        self,
        admin_client: AsyncClient,
        project_with_org: Project,
        project_member_regular: ProjectMember,
        project_role: ProjectRole,
    ):
        resp = await admin_client.post(
            f"{API}/projects/{project_with_org.id}/permissions/bulk-assign",
            json={
                "user_ids": [str(project_member_regular.user_id)],
                "role_id": str(project_role.id),
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert data["users_updated"] == 1

    @pytest.mark.asyncio
    async def test_bulk_assign_with_org_role(
        self,
        admin_client: AsyncClient,
        project_with_org: Project,
        project_member_regular: ProjectMember,
        organization_role: OrganizationRole,
    ):
        resp = await admin_client.post(
            f"{API}/projects/{project_with_org.id}/permissions/bulk-assign",
            json={
                "user_ids": [str(project_member_regular.user_id)],
                "role_id": str(organization_role.id),
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True

    @pytest.mark.asyncio
    async def test_bulk_assign_with_permission_overrides(
        self,
        admin_client: AsyncClient,
        project_with_org: Project,
        project_member_regular: ProjectMember,
    ):
        resp = await admin_client.post(
            f"{API}/projects/{project_with_org.id}/permissions/bulk-assign",
            json={
                "user_ids": [str(project_member_regular.user_id)],
                "permission_overrides": [
                    {"permission": "create", "granted": True},
                    {"permission": "delete", "granted": False},
                ],
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True

    @pytest.mark.asyncio
    async def test_bulk_assign_multiple_users(
        self,
        admin_client: AsyncClient,
        db: AsyncSession,
        project_with_org: Project,
        project_member_regular: ProjectMember,
    ):
        user2 = User(
            id=uuid.uuid4(),
            firebase_uid="user2-test-uid",
            email="user2@test.com",
            full_name="User Two",
            role="user",
            is_active=True,
        )
        db.add(user2)
        await db.flush()

        member2 = ProjectMember(
            project_id=project_with_org.id,
            user_id=user2.id,
            role="viewer",
        )
        db.add(member2)
        await db.commit()

        resp = await admin_client.post(
            f"{API}/projects/{project_with_org.id}/permissions/bulk-assign",
            json={
                "user_ids": [str(project_member_regular.user_id), str(user2.id)],
                "permission_overrides": [
                    {"permission": "view_all", "granted": True}
                ],
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["users_updated"] == 2

    @pytest.mark.asyncio
    async def test_bulk_assign_user_not_member(
        self,
        admin_client: AsyncClient,
        project_with_org: Project,
    ):
        fake_user_id = uuid.uuid4()
        resp = await admin_client.post(
            f"{API}/projects/{project_with_org.id}/permissions/bulk-assign",
            json={
                "user_ids": [str(fake_user_id)],
                "permission_overrides": [{"permission": "view_all", "granted": True}],
            },
        )
        assert resp.status_code == 400

    @pytest.mark.asyncio
    async def test_bulk_assign_role_not_found(
        self,
        admin_client: AsyncClient,
        project_with_org: Project,
        project_member_regular: ProjectMember,
    ):
        fake_role_id = uuid.uuid4()
        resp = await admin_client.post(
            f"{API}/projects/{project_with_org.id}/permissions/bulk-assign",
            json={
                "user_ids": [str(project_member_regular.user_id)],
                "role_id": str(fake_role_id),
            },
        )
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_bulk_assign_role_wrong_project(
        self,
        admin_client: AsyncClient,
        db: AsyncSession,
        project_with_org: Project,
        project_member_regular: ProjectMember,
        admin_user: User,
    ):
        other_project = Project(
            id=uuid.uuid4(),
            name="Other Project",
            description="Another project",
            status="active",
            created_by_id=admin_user.id,
        )
        db.add(other_project)
        await db.flush()

        other_role = ProjectRole(
            id=uuid.uuid4(),
            project_id=other_project.id,
            name="Other Role",
            description="Role from different project",
            permissions=["view_project"],
            is_system_role=False,
            created_by_id=admin_user.id,
        )
        db.add(other_role)
        await db.commit()

        resp = await admin_client.post(
            f"{API}/projects/{project_with_org.id}/permissions/bulk-assign",
            json={
                "user_ids": [str(project_member_regular.user_id)],
                "role_id": str(other_role.id),
            },
        )
        assert resp.status_code == 400

    @pytest.mark.asyncio
    async def test_bulk_assign_requires_authentication(
        self,
        client: AsyncClient,
        project_with_org: Project,
    ):
        resp = await client.post(
            f"{API}/projects/{project_with_org.id}/permissions/bulk-assign",
            json={"user_ids": [], "permission_overrides": []},
        )
        assert resp.status_code == 401


class TestGetPermissionAuditLog:
    """Tests for GET /projects/{project_id}/permissions/audit endpoint"""

    @pytest.mark.asyncio
    async def test_get_audit_log(
        self,
        admin_client: AsyncClient,
        project_with_org: Project,
        permission_audit_entry: PermissionAudit,
    ):
        resp = await admin_client.get(
            f"{API}/projects/{project_with_org.id}/permissions/audit"
        )
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    @pytest.mark.asyncio
    async def test_get_audit_log_returns_fields(
        self,
        admin_client: AsyncClient,
        project_with_org: Project,
        permission_audit_entry: PermissionAudit,
    ):
        resp = await admin_client.get(
            f"{API}/projects/{project_with_org.id}/permissions/audit"
        )
        assert resp.status_code == 200
        logs = resp.json()
        assert len(logs) >= 1
        log = logs[0]
        assert "id" in log
        assert "action" in log
        assert "user" in log
        assert "entityType" in log
        assert "createdAt" in log

    @pytest.mark.asyncio
    async def test_get_audit_log_camel_case_fields(
        self,
        admin_client: AsyncClient,
        project_with_org: Project,
        permission_audit_entry: PermissionAudit,
    ):
        resp = await admin_client.get(
            f"{API}/projects/{project_with_org.id}/permissions/audit"
        )
        assert resp.status_code == 200
        log = resp.json()[0]
        assert "entityType" in log
        assert "entity_type" not in log
        assert "createdAt" in log
        assert "created_at" not in log

    @pytest.mark.asyncio
    async def test_get_audit_log_filter_by_action(
        self,
        admin_client: AsyncClient,
        project_with_org: Project,
        permission_audit_entry: PermissionAudit,
    ):
        resp = await admin_client.get(
            f"{API}/projects/{project_with_org.id}/permissions/audit",
            params={"action": PermissionAction.ROLE_ASSIGNED.value},
        )
        assert resp.status_code == 200
        logs = resp.json()
        for log in logs:
            assert log["action"] == PermissionAction.ROLE_ASSIGNED.value

    @pytest.mark.asyncio
    async def test_get_audit_log_filter_by_user_id(
        self,
        admin_client: AsyncClient,
        project_with_org: Project,
        permission_audit_entry: PermissionAudit,
        admin_user: User,
    ):
        resp = await admin_client.get(
            f"{API}/projects/{project_with_org.id}/permissions/audit",
            params={"user_id": str(admin_user.id)},
        )
        assert resp.status_code == 200

    @pytest.mark.asyncio
    async def test_get_audit_log_with_pagination(
        self,
        admin_client: AsyncClient,
        project_with_org: Project,
        permission_audit_entry: PermissionAudit,
    ):
        resp = await admin_client.get(
            f"{API}/projects/{project_with_org.id}/permissions/audit",
            params={"limit": 10, "offset": 0},
        )
        assert resp.status_code == 200
        logs = resp.json()
        assert len(logs) <= 10

    @pytest.mark.asyncio
    async def test_get_audit_log_limit_max_validation(
        self,
        admin_client: AsyncClient,
        project_with_org: Project,
    ):
        resp = await admin_client.get(
            f"{API}/projects/{project_with_org.id}/permissions/audit",
            params={"limit": 2000},
        )
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_get_audit_log_requires_authentication(
        self,
        client: AsyncClient,
        project_with_org: Project,
    ):
        resp = await client.get(
            f"{API}/projects/{project_with_org.id}/permissions/audit"
        )
        assert resp.status_code == 401


class TestExportPermissionAuditLog:
    """Tests for GET /projects/{project_id}/permissions/audit/export endpoint"""

    @pytest.mark.asyncio
    async def test_export_audit_log_csv(
        self,
        admin_client: AsyncClient,
        project_with_org: Project,
        permission_audit_entry: PermissionAudit,
    ):
        resp = await admin_client.get(
            f"{API}/projects/{project_with_org.id}/permissions/audit/export",
            params={"format": "csv"},
        )
        assert resp.status_code == 200
        assert "text/csv" in resp.headers["content-type"]
        assert "attachment" in resp.headers["content-disposition"]

    @pytest.mark.asyncio
    async def test_export_audit_log_json(
        self,
        admin_client: AsyncClient,
        project_with_org: Project,
        permission_audit_entry: PermissionAudit,
    ):
        resp = await admin_client.get(
            f"{API}/projects/{project_with_org.id}/permissions/audit/export",
            params={"format": "json"},
        )
        assert resp.status_code == 200
        assert "application/json" in resp.headers["content-type"]
        assert "attachment" in resp.headers["content-disposition"]

    @pytest.mark.asyncio
    async def test_export_audit_log_csv_contains_headers(
        self,
        admin_client: AsyncClient,
        project_with_org: Project,
        permission_audit_entry: PermissionAudit,
    ):
        resp = await admin_client.get(
            f"{API}/projects/{project_with_org.id}/permissions/audit/export",
            params={"format": "csv"},
        )
        assert resp.status_code == 200
        content = resp.text
        assert "id" in content
        assert "action" in content
        assert "user_id" in content

    @pytest.mark.asyncio
    async def test_export_audit_log_json_valid_structure(
        self,
        admin_client: AsyncClient,
        project_with_org: Project,
        permission_audit_entry: PermissionAudit,
    ):
        resp = await admin_client.get(
            f"{API}/projects/{project_with_org.id}/permissions/audit/export",
            params={"format": "json"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)

    @pytest.mark.asyncio
    async def test_export_audit_log_filter_by_action(
        self,
        admin_client: AsyncClient,
        project_with_org: Project,
        permission_audit_entry: PermissionAudit,
    ):
        resp = await admin_client.get(
            f"{API}/projects/{project_with_org.id}/permissions/audit/export",
            params={
                "format": "json",
                "action": PermissionAction.ROLE_ASSIGNED.value,
            },
        )
        assert resp.status_code == 200

    @pytest.mark.asyncio
    async def test_export_audit_log_invalid_format(
        self,
        admin_client: AsyncClient,
        project_with_org: Project,
    ):
        resp = await admin_client.get(
            f"{API}/projects/{project_with_org.id}/permissions/audit/export",
            params={"format": "xml"},
        )
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_export_audit_log_requires_authentication(
        self,
        client: AsyncClient,
        project_with_org: Project,
    ):
        resp = await client.get(
            f"{API}/projects/{project_with_org.id}/permissions/audit/export",
            params={"format": "csv"},
        )
        assert resp.status_code == 401
