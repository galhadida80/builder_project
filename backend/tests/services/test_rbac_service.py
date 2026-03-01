"""Tests for RBAC service permission inheritance and role management."""

import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.organization import Organization
from app.models.permission_audit import PermissionAction
from app.models.project import Project
from app.models.role import OrganizationRole, ProjectRole
from app.models.user import User
from app.schemas.role import (
    OrganizationRoleCreate,
    OrganizationRoleUpdate,
    ProjectRoleCreate,
    ProjectRoleUpdate,
)
from app.services.rbac_service import RBACService


@pytest.mark.asyncio
async def test_permission_inheritance():
    """Test that project roles inherit permissions from organization roles."""
    db = AsyncMock(spec=AsyncSession)
    service = RBACService(db)

    # Mock organization role with base permissions
    org_role = OrganizationRole(
        id=uuid.uuid4(),
        organization_id=uuid.uuid4(),
        name="Base Inspector",
        description="Organization-level inspector role",
        permissions=["inspection.view", "inspection.create", "area.view"],
        is_system_role=False,
        created_by_id=uuid.uuid4()
    )

    # Mock project role that inherits from org role and adds additional permissions
    project_role = ProjectRole(
        id=uuid.uuid4(),
        project_id=uuid.uuid4(),
        name="Senior Inspector",
        description="Project-level senior inspector with additional permissions",
        permissions=["inspection.approve", "report.create"],
        inherits_from_id=org_role.id,
        is_system_role=False,
        created_by_id=uuid.uuid4()
    )
    project_role.inherits_from = org_role

    # Test permission inheritance
    effective_permissions = await service.get_effective_permissions(project_role)

    # Should have both inherited permissions and project-specific permissions
    assert "inspection.view" in effective_permissions  # from org role
    assert "inspection.create" in effective_permissions  # from org role
    assert "area.view" in effective_permissions  # from org role
    assert "inspection.approve" in effective_permissions  # project-specific
    assert "report.create" in effective_permissions  # project-specific

    # Total should be 5 unique permissions
    assert len(effective_permissions) == 5


@pytest.mark.asyncio
async def test_permission_inheritance_no_parent():
    """Test that project roles without inheritance only have their own permissions."""
    db = AsyncMock(spec=AsyncSession)
    service = RBACService(db)

    # Mock project role without inheritance
    project_role = ProjectRole(
        id=uuid.uuid4(),
        project_id=uuid.uuid4(),
        name="Standalone Role",
        description="Project role without inheritance",
        permissions=["equipment.view", "equipment.edit"],
        inherits_from_id=None,
        is_system_role=False,
        created_by_id=uuid.uuid4()
    )
    project_role.inherits_from = None

    # Test permission inheritance
    effective_permissions = await service.get_effective_permissions(project_role)

    # Should only have project-specific permissions
    assert "equipment.view" in effective_permissions
    assert "equipment.edit" in effective_permissions
    assert len(effective_permissions) == 2


@pytest.mark.asyncio
async def test_permission_inheritance_deduplication():
    """Test that duplicate permissions are deduplicated."""
    db = AsyncMock(spec=AsyncSession)
    service = RBACService(db)

    # Mock organization role
    org_role = OrganizationRole(
        id=uuid.uuid4(),
        organization_id=uuid.uuid4(),
        name="Base Role",
        description="Organization role",
        permissions=["inspection.view", "inspection.create", "area.view"],
        is_system_role=False,
        created_by_id=uuid.uuid4()
    )

    # Mock project role with overlapping permissions
    project_role = ProjectRole(
        id=uuid.uuid4(),
        project_id=uuid.uuid4(),
        name="Extended Role",
        description="Project role with overlapping permissions",
        permissions=["inspection.view", "inspection.approve"],  # inspection.view is duplicate
        inherits_from_id=org_role.id,
        is_system_role=False,
        created_by_id=uuid.uuid4()
    )
    project_role.inherits_from = org_role

    # Test permission inheritance with deduplication
    effective_permissions = await service.get_effective_permissions(project_role)

    # Should deduplicate inspection.view
    assert effective_permissions.count("inspection.view") == 1
    assert len(effective_permissions) == 4  # inspection.view, inspection.create, area.view, inspection.approve


@pytest.mark.asyncio
async def test_permission_inheritance_empty_permissions():
    """Test handling of empty permission lists."""
    db = AsyncMock(spec=AsyncSession)
    service = RBACService(db)

    # Mock organization role with no permissions
    org_role = OrganizationRole(
        id=uuid.uuid4(),
        organization_id=uuid.uuid4(),
        name="Empty Base Role",
        description="Organization role with no permissions",
        permissions=[],
        is_system_role=False,
        created_by_id=uuid.uuid4()
    )

    # Mock project role with some permissions
    project_role = ProjectRole(
        id=uuid.uuid4(),
        project_id=uuid.uuid4(),
        name="Project Role",
        description="Project role",
        permissions=["equipment.view"],
        inherits_from_id=org_role.id,
        is_system_role=False,
        created_by_id=uuid.uuid4()
    )
    project_role.inherits_from = org_role

    # Test permission inheritance
    effective_permissions = await service.get_effective_permissions(project_role)

    # Should only have project permissions
    assert "equipment.view" in effective_permissions
    assert len(effective_permissions) == 1


@pytest.mark.asyncio
async def test_resource_permission_check():
    """Test resource-scoped permission checking."""
    from app.models.resource_permission import ResourcePermission

    db = AsyncMock(spec=AsyncSession)
    service = RBACService(db)

    project_member_id = uuid.uuid4()
    area_id = uuid.uuid4()

    # Test case 1: Permission is explicitly granted
    mock_result = MagicMock()
    granted_permission = ResourcePermission(
        id=uuid.uuid4(),
        project_member_id=project_member_id,
        resource_type="area",
        resource_id=area_id,
        permission="inspection.view",
        granted=True,
        granted_by_id=uuid.uuid4()
    )
    mock_result.scalar_one_or_none.return_value = granted_permission
    db.execute.return_value = mock_result

    has_permission = await service.check_resource_permission(
        project_member_id=project_member_id,
        resource_type="area",
        resource_id=area_id,
        permission="inspection.view"
    )
    assert has_permission is True

    # Test case 2: Permission is explicitly denied
    denied_permission = ResourcePermission(
        id=uuid.uuid4(),
        project_member_id=project_member_id,
        resource_type="area",
        resource_id=area_id,
        permission="equipment.edit",
        granted=False,
        granted_by_id=uuid.uuid4()
    )
    mock_result.scalar_one_or_none.return_value = denied_permission

    has_permission = await service.check_resource_permission(
        project_member_id=project_member_id,
        resource_type="area",
        resource_id=area_id,
        permission="equipment.edit"
    )
    assert has_permission is False

    # Test case 3: No explicit resource permission exists (deny by default)
    mock_result.scalar_one_or_none.return_value = None

    has_permission = await service.check_resource_permission(
        project_member_id=project_member_id,
        resource_type="area",
        resource_id=area_id,
        permission="equipment.delete"
    )
    assert has_permission is False


class TestOrganizationRoleCRUD:
    """Test organization role CRUD operations."""

    @pytest.mark.asyncio
    async def test_create_organization_role(self):
        """Test creating a new organization role."""
        db = AsyncMock(spec=AsyncSession)
        service = RBACService(db)

        org_id = uuid.uuid4()
        user_id = uuid.uuid4()
        role_data = OrganizationRoleCreate(
            organization_id=org_id,
            name="Custom Inspector",
            description="Custom inspector role",
            permissions=["inspection.view", "inspection.create"]
        )

        role = await service.create_organization_role(role_data, user_id)

        assert role.organization_id == org_id
        assert role.name == "Custom Inspector"
        assert role.description == "Custom inspector role"
        assert role.permissions == ["inspection.view", "inspection.create"]
        assert role.created_by_id == user_id
        assert db.add.call_count == 2  # Role + audit log
        db.flush.assert_called_once()
        db.commit.assert_called_once()
        db.refresh.assert_called_once()

    @pytest.mark.asyncio
    async def test_get_organization_role(self):
        """Test retrieving an organization role by ID."""
        db = AsyncMock(spec=AsyncSession)
        service = RBACService(db)

        role_id = uuid.uuid4()
        org_id = uuid.uuid4()
        expected_role = OrganizationRole(
            id=role_id,
            organization_id=org_id,
            name="Test Role",
            description="Test description",
            permissions=["test.view"],
            is_system_role=False,
            created_by_id=uuid.uuid4()
        )

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = expected_role
        db.execute.return_value = mock_result

        role = await service.get_organization_role(role_id)

        assert role == expected_role
        assert role.id == role_id
        db.execute.assert_called_once()

    @pytest.mark.asyncio
    async def test_get_organization_role_not_found(self):
        """Test retrieving a non-existent organization role."""
        db = AsyncMock(spec=AsyncSession)
        service = RBACService(db)

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        db.execute.return_value = mock_result

        role = await service.get_organization_role(uuid.uuid4())

        assert role is None

    @pytest.mark.asyncio
    async def test_list_organization_roles(self):
        """Test listing all roles for an organization."""
        db = AsyncMock(spec=AsyncSession)
        service = RBACService(db)

        org_id = uuid.uuid4()
        roles = [
            OrganizationRole(
                id=uuid.uuid4(),
                organization_id=org_id,
                name="Role A",
                permissions=["a.view"],
                is_system_role=False,
                created_by_id=uuid.uuid4()
            ),
            OrganizationRole(
                id=uuid.uuid4(),
                organization_id=org_id,
                name="Role B",
                permissions=["b.view"],
                is_system_role=False,
                created_by_id=uuid.uuid4()
            ),
        ]

        mock_result = MagicMock()
        mock_scalars = MagicMock()
        mock_scalars.all.return_value = roles
        mock_result.scalars.return_value = mock_scalars
        db.execute.return_value = mock_result

        result = await service.list_organization_roles(org_id)

        assert len(result) == 2
        assert result[0].name == "Role A"
        assert result[1].name == "Role B"
        db.execute.assert_called_once()

    @pytest.mark.asyncio
    async def test_update_organization_role(self):
        """Test updating an organization role."""
        db = AsyncMock(spec=AsyncSession)
        service = RBACService(db)

        role_id = uuid.uuid4()
        org_id = uuid.uuid4()
        existing_role = OrganizationRole(
            id=role_id,
            organization_id=org_id,
            name="Old Name",
            description="Old description",
            permissions=["old.view"],
            is_system_role=False,
            created_by_id=uuid.uuid4()
        )

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = existing_role
        db.execute.return_value = mock_result

        update_data = OrganizationRoleUpdate(
            name="New Name",
            description="New description",
            permissions=["new.view", "new.edit"]
        )

        updated_role = await service.update_organization_role(
            role_id, update_data, uuid.uuid4()
        )

        assert updated_role.name == "New Name"
        assert updated_role.description == "New description"
        assert updated_role.permissions == ["new.view", "new.edit"]
        db.commit.assert_called_once()
        db.refresh.assert_called_once()

    @pytest.mark.asyncio
    async def test_update_organization_role_partial(self):
        """Test partially updating an organization role."""
        db = AsyncMock(spec=AsyncSession)
        service = RBACService(db)

        role_id = uuid.uuid4()
        existing_role = OrganizationRole(
            id=role_id,
            organization_id=uuid.uuid4(),
            name="Original Name",
            description="Original description",
            permissions=["original.view"],
            is_system_role=False,
            created_by_id=uuid.uuid4()
        )

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = existing_role
        db.execute.return_value = mock_result

        update_data = OrganizationRoleUpdate(name="Updated Name")

        updated_role = await service.update_organization_role(
            role_id, update_data, uuid.uuid4()
        )

        assert updated_role.name == "Updated Name"
        assert updated_role.description == "Original description"
        assert updated_role.permissions == ["original.view"]

    @pytest.mark.asyncio
    async def test_update_organization_role_not_found(self):
        """Test updating a non-existent organization role."""
        db = AsyncMock(spec=AsyncSession)
        service = RBACService(db)

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        db.execute.return_value = mock_result

        update_data = OrganizationRoleUpdate(name="New Name")
        result = await service.update_organization_role(
            uuid.uuid4(), update_data, uuid.uuid4()
        )

        assert result is None
        db.commit.assert_not_called()

    @pytest.mark.asyncio
    async def test_delete_organization_role(self):
        """Test deleting an organization role."""
        db = AsyncMock(spec=AsyncSession)
        service = RBACService(db)

        role_id = uuid.uuid4()
        existing_role = OrganizationRole(
            id=role_id,
            organization_id=uuid.uuid4(),
            name="Test Role",
            permissions=["test.view"],
            is_system_role=False,
            created_by_id=uuid.uuid4()
        )

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = existing_role
        db.execute.return_value = mock_result

        result = await service.delete_organization_role(role_id, uuid.uuid4())

        assert result is True
        db.delete.assert_called_once_with(existing_role)
        db.commit.assert_called_once()

    @pytest.mark.asyncio
    async def test_delete_organization_role_not_found(self):
        """Test deleting a non-existent organization role."""
        db = AsyncMock(spec=AsyncSession)
        service = RBACService(db)

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        db.execute.return_value = mock_result

        result = await service.delete_organization_role(uuid.uuid4(), uuid.uuid4())

        assert result is False
        db.delete.assert_not_called()
        db.commit.assert_not_called()

    @pytest.mark.asyncio
    async def test_delete_system_role_forbidden(self):
        """Test that system roles cannot be deleted."""
        db = AsyncMock(spec=AsyncSession)
        service = RBACService(db)

        role_id = uuid.uuid4()
        system_role = OrganizationRole(
            id=role_id,
            organization_id=uuid.uuid4(),
            name="System Admin",
            permissions=["admin.*"],
            is_system_role=True,
            created_by_id=uuid.uuid4()
        )

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = system_role
        db.execute.return_value = mock_result

        result = await service.delete_organization_role(role_id, uuid.uuid4())

        assert result is False
        db.delete.assert_not_called()


class TestProjectRoleCRUD:
    """Test project role CRUD operations."""

    @pytest.mark.asyncio
    async def test_create_project_role(self):
        """Test creating a new project role."""
        db = AsyncMock(spec=AsyncSession)
        service = RBACService(db)

        project_id = uuid.uuid4()
        user_id = uuid.uuid4()
        parent_role_id = uuid.uuid4()

        project = Project(
            id=project_id,
            name="Test Project",
            organization_id=uuid.uuid4(),
            created_by_id=user_id
        )
        db.get.return_value = project

        role_data = ProjectRoleCreate(
            project_id=project_id,
            name="Custom PM",
            description="Custom project manager",
            permissions=["project.edit", "task.create"],
            inherits_from_id=parent_role_id
        )

        role = await service.create_project_role(role_data, user_id)

        assert role.project_id == project_id
        assert role.name == "Custom PM"
        assert role.description == "Custom project manager"
        assert role.permissions == ["project.edit", "task.create"]
        assert role.inherits_from_id == parent_role_id
        assert role.created_by_id == user_id
        assert db.add.call_count == 2  # Role + audit log
        db.flush.assert_called_once()
        db.commit.assert_called_once()

    @pytest.mark.asyncio
    async def test_create_project_role_without_inheritance(self):
        """Test creating a project role without inheritance."""
        db = AsyncMock(spec=AsyncSession)
        service = RBACService(db)

        project_id = uuid.uuid4()
        user_id = uuid.uuid4()

        project = Project(
            id=project_id,
            name="Test Project",
            organization_id=uuid.uuid4(),
            created_by_id=user_id
        )
        db.get.return_value = project

        role_data = ProjectRoleCreate(
            project_id=project_id,
            name="Standalone Role",
            permissions=["view.only"],
            inherits_from_id=None
        )

        role = await service.create_project_role(role_data, user_id)

        assert role.inherits_from_id is None
        assert role.permissions == ["view.only"]

    @pytest.mark.asyncio
    async def test_get_project_role(self):
        """Test retrieving a project role by ID."""
        db = AsyncMock(spec=AsyncSession)
        service = RBACService(db)

        role_id = uuid.uuid4()
        expected_role = ProjectRole(
            id=role_id,
            project_id=uuid.uuid4(),
            name="Test Role",
            permissions=["test.view"],
            is_system_role=False,
            created_by_id=uuid.uuid4()
        )

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = expected_role
        db.execute.return_value = mock_result

        role = await service.get_project_role(role_id)

        assert role == expected_role
        assert role.id == role_id

    @pytest.mark.asyncio
    async def test_list_project_roles(self):
        """Test listing all roles for a project."""
        db = AsyncMock(spec=AsyncSession)
        service = RBACService(db)

        project_id = uuid.uuid4()
        roles = [
            ProjectRole(
                id=uuid.uuid4(),
                project_id=project_id,
                name="Role A",
                permissions=["a.view"],
                is_system_role=False,
                created_by_id=uuid.uuid4()
            ),
            ProjectRole(
                id=uuid.uuid4(),
                project_id=project_id,
                name="Role B",
                permissions=["b.view"],
                is_system_role=False,
                created_by_id=uuid.uuid4()
            ),
        ]

        mock_result = MagicMock()
        mock_scalars = MagicMock()
        mock_scalars.all.return_value = roles
        mock_result.scalars.return_value = mock_scalars
        db.execute.return_value = mock_result

        result = await service.list_project_roles(project_id)

        assert len(result) == 2
        assert result[0].name == "Role A"
        assert result[1].name == "Role B"

    @pytest.mark.asyncio
    async def test_update_project_role(self):
        """Test updating a project role."""
        db = AsyncMock(spec=AsyncSession)
        service = RBACService(db)

        role_id = uuid.uuid4()
        project_id = uuid.uuid4()
        existing_role = ProjectRole(
            id=role_id,
            project_id=project_id,
            name="Old Name",
            description="Old description",
            permissions=["old.view"],
            inherits_from_id=None,
            is_system_role=False,
            created_by_id=uuid.uuid4()
        )

        project = Project(
            id=project_id,
            name="Test Project",
            organization_id=uuid.uuid4(),
            created_by_id=uuid.uuid4()
        )

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = existing_role
        db.execute.return_value = mock_result
        db.get.return_value = project

        new_parent_id = uuid.uuid4()
        update_data = ProjectRoleUpdate(
            name="New Name",
            permissions=["new.view"],
            inherits_from_id=new_parent_id
        )

        updated_role = await service.update_project_role(
            role_id, update_data, uuid.uuid4()
        )

        assert updated_role.name == "New Name"
        assert updated_role.permissions == ["new.view"]
        assert updated_role.inherits_from_id == new_parent_id

    @pytest.mark.asyncio
    async def test_delete_project_role(self):
        """Test deleting a project role."""
        db = AsyncMock(spec=AsyncSession)
        service = RBACService(db)

        role_id = uuid.uuid4()
        project_id = uuid.uuid4()
        existing_role = ProjectRole(
            id=role_id,
            project_id=project_id,
            name="Test Role",
            permissions=["test.view"],
            is_system_role=False,
            created_by_id=uuid.uuid4()
        )

        project = Project(
            id=project_id,
            name="Test Project",
            organization_id=uuid.uuid4(),
            created_by_id=uuid.uuid4()
        )

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = existing_role
        db.execute.return_value = mock_result
        db.get.return_value = project

        result = await service.delete_project_role(role_id, uuid.uuid4())

        assert result is True
        db.delete.assert_called_once_with(existing_role)
        db.commit.assert_called_once()

    @pytest.mark.asyncio
    async def test_delete_project_system_role_forbidden(self):
        """Test that project system roles cannot be deleted."""
        db = AsyncMock(spec=AsyncSession)
        service = RBACService(db)

        role_id = uuid.uuid4()
        system_role = ProjectRole(
            id=role_id,
            project_id=uuid.uuid4(),
            name="System PM",
            permissions=["admin.*"],
            is_system_role=True,
            created_by_id=uuid.uuid4()
        )

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = system_role
        db.execute.return_value = mock_result

        result = await service.delete_project_role(role_id, uuid.uuid4())

        assert result is False
        db.delete.assert_not_called()
