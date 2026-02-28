"""
Integration tests for subscription usage limits enforcement.

Tests verify that user limits, project limits, and storage limits are properly
enforced across the subscription system.
"""
import uuid
from datetime import datetime

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.organization import Organization, OrganizationMember
from app.models.project import Project, ProjectMember
from app.models.subscription import Subscription, SubscriptionPlan
from app.models.user import User
from app.services.subscription_service import SubscriptionService


@pytest.fixture
async def starter_plan(db: AsyncSession) -> SubscriptionPlan:
    """Create a Starter plan with limits: 5 users, 3 projects, 10GB storage"""
    plan = SubscriptionPlan(
        tier="starter",
        name="Starter Plan",
        description="For small teams",
        monthly_price=99.0,
        annual_price=990.0,
        max_users=5,
        max_projects=3,
        max_storage_gb=10,
        is_active=True,
    )
    db.add(plan)
    await db.commit()
    await db.refresh(plan)
    return plan


@pytest.fixture
async def professional_plan(db: AsyncSession) -> SubscriptionPlan:
    """Create a Professional plan with limits: 25 users, 15 projects, 100GB storage"""
    plan = SubscriptionPlan(
        tier="professional",
        name="Professional Plan",
        description="For growing teams",
        monthly_price=299.0,
        annual_price=2990.0,
        max_users=25,
        max_projects=15,
        max_storage_gb=100,
        is_active=True,
    )
    db.add(plan)
    await db.commit()
    await db.refresh(plan)
    return plan


@pytest.fixture
async def organization(db: AsyncSession, test_user: User) -> Organization:
    """Create a test organization"""
    org = Organization(
        name="Test Organization",
        created_by_id=test_user.id,
    )
    db.add(org)
    await db.flush()

    # Add creator as org admin
    member = OrganizationMember(
        organization_id=org.id,
        user_id=test_user.id,
        role="org_admin",
    )
    db.add(member)
    await db.commit()
    await db.refresh(org)
    return org


@pytest.fixture
async def subscription_with_starter(
    db: AsyncSession, organization: Organization, starter_plan: SubscriptionPlan
) -> Subscription:
    """Create a subscription with starter plan"""
    subscription = Subscription(
        organization_id=organization.id,
        plan_id=starter_plan.id,
        billing_cycle="monthly",
        status="active",
        trial_ends_at=None,
        current_period_start=datetime.utcnow(),
        current_period_end=datetime.utcnow(),
    )
    db.add(subscription)
    await db.commit()
    await db.refresh(subscription)
    return subscription


class TestUserLimitEnforcement:
    """Test that user count limits are enforced"""

    async def test_check_usage_limits_within_user_limit(
        self,
        db: AsyncSession,
        organization: Organization,
        subscription_with_starter: Subscription,
        test_user: User,
    ):
        """Test that usage limits pass when within user limit"""
        service = SubscriptionService(db)

        # Organization has 1 user (creator), limit is 5
        result = await service.check_usage_limits(organization.id)

        assert result["within_limits"] is True
        assert len(result["violations"]) == 0
        assert result["usage"]["users"] == 1
        assert result["usage"]["max_users"] == 5

    async def test_check_usage_limits_exceeds_user_limit(
        self,
        db: AsyncSession,
        organization: Organization,
        subscription_with_starter: Subscription,
        test_user: User,
    ):
        """Test that usage limits fail when exceeding user limit"""
        # Add 5 more users (total 6, limit is 5)
        for i in range(5):
            user = User(
                email=f"user{i}@example.com",
                first_name=f"User{i}",
                last_name="Test",
            )
            db.add(user)
            await db.flush()

            member = OrganizationMember(
                organization_id=organization.id,
                user_id=user.id,
                role="project_member",
            )
            db.add(member)

        await db.commit()

        service = SubscriptionService(db)
        result = await service.check_usage_limits(organization.id)

        assert result["within_limits"] is False
        assert len(result["violations"]) >= 1
        assert any("User count" in v for v in result["violations"])
        assert result["usage"]["users"] == 6
        assert result["usage"]["max_users"] == 5

    async def test_add_seat_enforces_user_limit(
        self,
        db: AsyncSession,
        organization: Organization,
        subscription_with_starter: Subscription,
    ):
        """Test that add_seat method enforces user limit"""
        service = SubscriptionService(db)

        # Add users up to the limit (5 total including creator)
        for i in range(4):
            user = User(
                email=f"user{i}@example.com",
                first_name=f"User{i}",
                last_name="Test",
            )
            db.add(user)
            await db.flush()

            member = OrganizationMember(
                organization_id=organization.id,
                user_id=user.id,
                role="project_member",
            )
            db.add(member)

        await db.commit()

        # Try to add one more user (would be 6th, exceeds limit of 5)
        new_user = User(
            email="newuser@example.com",
            first_name="New",
            last_name="User",
        )
        db.add(new_user)
        await db.commit()

        with pytest.raises(ValueError) as exc_info:
            await service.add_seat(organization.id, new_user.id)

        assert "User limit" in str(exc_info.value)
        assert "5" in str(exc_info.value)


class TestProjectLimitEnforcement:
    """Test that project count limits are enforced"""

    async def test_check_usage_limits_within_project_limit(
        self,
        db: AsyncSession,
        organization: Organization,
        subscription_with_starter: Subscription,
        test_user: User,
    ):
        """Test that usage limits pass when within project limit"""
        # Create 2 projects (limit is 3)
        for i in range(2):
            project = Project(
                organization_id=organization.id,
                name=f"Test Project {i}",
                created_by_id=test_user.id,
            )
            db.add(project)

        await db.commit()

        service = SubscriptionService(db)
        result = await service.check_usage_limits(organization.id)

        assert result["within_limits"] is True
        assert len(result["violations"]) == 0
        assert result["usage"]["projects"] == 2
        assert result["usage"]["max_projects"] == 3

    async def test_check_usage_limits_exceeds_project_limit(
        self,
        db: AsyncSession,
        organization: Organization,
        subscription_with_starter: Subscription,
        test_user: User,
    ):
        """Test that usage limits fail when exceeding project limit"""
        # Create 4 projects (limit is 3)
        for i in range(4):
            project = Project(
                organization_id=organization.id,
                name=f"Test Project {i}",
                created_by_id=test_user.id,
            )
            db.add(project)

        await db.commit()

        service = SubscriptionService(db)
        result = await service.check_usage_limits(organization.id)

        assert result["within_limits"] is False
        assert len(result["violations"]) >= 1
        assert any("Project count" in v for v in result["violations"])
        assert result["usage"]["projects"] == 4
        assert result["usage"]["max_projects"] == 3


class TestStorageLimitEnforcement:
    """Test that storage limits are enforced"""

    async def test_check_usage_limits_within_storage_limit(
        self,
        db: AsyncSession,
        organization: Organization,
        subscription_with_starter: Subscription,
    ):
        """Test that usage limits pass when within storage limit"""
        service = SubscriptionService(db)

        # Assuming no storage used initially (limit is 10GB)
        result = await service.check_usage_limits(organization.id)

        # Storage check should pass
        assert result["usage"]["storage_gb"] <= result["usage"]["max_storage_gb"]


class TestDowngradeLimitEnforcement:
    """Test that downgrades are blocked when current usage exceeds new plan limits"""

    async def test_downgrade_blocked_when_exceeds_new_plan_user_limit(
        self,
        db: AsyncSession,
        organization: Organization,
        professional_plan: SubscriptionPlan,
        starter_plan: SubscriptionPlan,
        test_user: User,
    ):
        """Test that downgrade is blocked when user count exceeds new plan limit"""
        # Create subscription with Professional plan (25 user limit)
        subscription = Subscription(
            organization_id=organization.id,
            plan_id=professional_plan.id,
            billing_cycle="monthly",
            status="active",
            trial_ends_at=None,
            current_period_start=datetime.utcnow(),
            current_period_end=datetime.utcnow(),
        )
        db.add(subscription)
        await db.commit()

        # Add 6 users (would exceed Starter plan limit of 5)
        for i in range(5):
            user = User(
                email=f"user{i}@example.com",
                first_name=f"User{i}",
                last_name="Test",
            )
            db.add(user)
            await db.flush()

            member = OrganizationMember(
                organization_id=organization.id,
                user_id=user.id,
                role="project_member",
            )
            db.add(member)

        await db.commit()

        # Try to downgrade to Starter plan
        service = SubscriptionService(db)

        with pytest.raises(ValueError) as exc_info:
            await service.downgrade_plan(organization.id, starter_plan.id)

        assert "Cannot downgrade" in str(exc_info.value)
        assert "User count" in str(exc_info.value)

    async def test_downgrade_blocked_when_exceeds_new_plan_project_limit(
        self,
        db: AsyncSession,
        organization: Organization,
        professional_plan: SubscriptionPlan,
        starter_plan: SubscriptionPlan,
        test_user: User,
    ):
        """Test that downgrade is blocked when project count exceeds new plan limit"""
        # Create subscription with Professional plan (15 project limit)
        subscription = Subscription(
            organization_id=organization.id,
            plan_id=professional_plan.id,
            billing_cycle="monthly",
            status="active",
            trial_ends_at=None,
            current_period_start=datetime.utcnow(),
            current_period_end=datetime.utcnow(),
        )
        db.add(subscription)
        await db.commit()

        # Create 4 projects (would exceed Starter plan limit of 3)
        for i in range(4):
            project = Project(
                organization_id=organization.id,
                name=f"Test Project {i}",
                created_by_id=test_user.id,
            )
            db.add(project)

        await db.commit()

        # Try to downgrade to Starter plan
        service = SubscriptionService(db)

        with pytest.raises(ValueError) as exc_info:
            await service.downgrade_plan(organization.id, starter_plan.id)

        assert "Cannot downgrade" in str(exc_info.value)
        assert "Project count" in str(exc_info.value)


class TestMultipleViolations:
    """Test that multiple limit violations are reported together"""

    async def test_multiple_violations_reported(
        self,
        db: AsyncSession,
        organization: Organization,
        subscription_with_starter: Subscription,
        test_user: User,
    ):
        """Test that all violations are reported when multiple limits are exceeded"""
        # Add 6 users (exceeds 5 user limit)
        for i in range(5):
            user = User(
                email=f"user{i}@example.com",
                first_name=f"User{i}",
                last_name="Test",
            )
            db.add(user)
            await db.flush()

            member = OrganizationMember(
                organization_id=organization.id,
                user_id=user.id,
                role="project_member",
            )
            db.add(member)

        # Add 4 projects (exceeds 3 project limit)
        for i in range(4):
            project = Project(
                organization_id=organization.id,
                name=f"Test Project {i}",
                created_by_id=test_user.id,
            )
            db.add(project)

        await db.commit()

        service = SubscriptionService(db)
        result = await service.check_usage_limits(organization.id)

        assert result["within_limits"] is False
        assert len(result["violations"]) >= 2
        assert any("User count" in v for v in result["violations"])
        assert any("Project count" in v for v in result["violations"])
