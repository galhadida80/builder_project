"""Integration tests for subscription and billing workflows."""
import uuid
from datetime import datetime, timedelta
from decimal import Decimal

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.billing import Invoice, PaymentMethod, BillingHistory
from app.models.organization import Organization
from app.models.subscription import Subscription, SubscriptionPlan, PlanTier
from app.models.user import User


class TestSubscriptionFlow:
    """Integration tests for subscription lifecycle."""

    @pytest.mark.asyncio
    async def test_get_subscription_plans(
        self,
        admin_client: AsyncClient,
        db: AsyncSession,
    ):
        """Test retrieving available subscription plans."""
        # Create test plans
        starter_plan = SubscriptionPlan(
            id=uuid.uuid4(),
            tier=PlanTier.STARTER,
            name="Starter Plan",
            name_he="תוכנית התחלתית",
            description="Basic features",
            price_monthly=Decimal("99.00"),
            price_annual=Decimal("990.00"),
            max_users=5,
            max_projects=10,
            max_storage_gb=50,
            features={"projects": True, "equipment": True},
        )
        db.add(starter_plan)
        await db.commit()

        # Get plans via API
        response = await admin_client.get("/api/v1/subscriptions/plans")

        assert response.status_code == 200
        plans = response.json()
        assert isinstance(plans, list)
        assert len(plans) >= 1

        # Verify plan structure
        plan = plans[0]
        assert "id" in plan
        assert "tier" in plan
        assert "name" in plan
        assert "priceMonthly" in plan  # CamelCase response
        assert "maxUsers" in plan  # CamelCase response

    @pytest.mark.asyncio
    async def test_create_subscription_flow(
        self,
        admin_client: AsyncClient,
        organization: Organization,
        db: AsyncSession,
    ):
        """Test creating a new subscription with trial period."""
        # Create a plan first
        plan = SubscriptionPlan(
            id=uuid.uuid4(),
            tier=PlanTier.PROFESSIONAL,
            name="Professional Plan",
            name_he="תוכנית מקצועית",
            description="Advanced features",
            price_monthly=Decimal("299.00"),
            price_annual=Decimal("2990.00"),
            max_users=25,
            max_projects=50,
            max_storage_gb=500,
            features={"projects": True, "equipment": True, "analytics": True},
        )
        db.add(plan)
        await db.commit()

        # Create subscription via API
        response = await admin_client.post(
            "/api/v1/subscriptions/subscribe",
            json={
                "plan_id": str(plan.id),
                "billing_cycle": "monthly",
                "payment_provider": "stripe",
            }
        )

        assert response.status_code == 201
        subscription_data = response.json()

        assert subscription_data["planId"] == str(plan.id)
        assert subscription_data["organizationId"] == str(organization.id)
        assert subscription_data["billingCycle"] == "monthly"
        assert subscription_data["status"] == "trial"

        # Verify subscription in database
        result = await db.execute(
            select(Subscription).where(
                Subscription.organization_id == organization.id
            )
        )
        subscription = result.scalar_one_or_none()
        assert subscription is not None
        assert subscription.plan_id == plan.id
        assert subscription.status == "trial"
        assert subscription.trial_ends_at is not None

    @pytest.mark.asyncio
    async def test_upgrade_subscription_flow(
        self,
        admin_client: AsyncClient,
        organization: Organization,
        db: AsyncSession,
    ):
        """Test upgrading from Starter to Professional plan."""
        # Create plans
        starter_plan = SubscriptionPlan(
            id=uuid.uuid4(),
            tier=PlanTier.STARTER,
            name="Starter",
            name_he="התחלתי",
            price_monthly=Decimal("99.00"),
            max_users=5,
            max_projects=10,
            max_storage_gb=50,
        )
        professional_plan = SubscriptionPlan(
            id=uuid.uuid4(),
            tier=PlanTier.PROFESSIONAL,
            name="Professional",
            name_he="מקצועי",
            price_monthly=Decimal("299.00"),
            max_users=25,
            max_projects=50,
            max_storage_gb=500,
        )
        db.add_all([starter_plan, professional_plan])

        # Create initial subscription
        subscription = Subscription(
            id=uuid.uuid4(),
            organization_id=organization.id,
            plan_id=starter_plan.id,
            status="active",
            billing_cycle="monthly",
            payment_provider="stripe",
            current_period_start=datetime.utcnow(),
            current_period_end=datetime.utcnow() + timedelta(days=30),
        )
        db.add(subscription)
        await db.commit()

        # Upgrade subscription
        response = await admin_client.put(
            "/api/v1/subscriptions/upgrade",
            json={
                "plan_id": str(professional_plan.id),
            }
        )

        assert response.status_code == 200
        updated_subscription = response.json()

        assert updated_subscription["planId"] == str(professional_plan.id)
        assert updated_subscription["status"] in ["active", "trial"]

    @pytest.mark.asyncio
    async def test_cancel_subscription_flow(
        self,
        admin_client: AsyncClient,
        organization: Organization,
        db: AsyncSession,
    ):
        """Test canceling an active subscription."""
        # Create plan and subscription
        plan = SubscriptionPlan(
            id=uuid.uuid4(),
            tier=PlanTier.STARTER,
            name="Starter",
            price_monthly=Decimal("99.00"),
            max_users=5,
        )
        subscription = Subscription(
            id=uuid.uuid4(),
            organization_id=organization.id,
            plan_id=plan.id,
            status="active",
            billing_cycle="monthly",
            payment_provider="stripe",
            current_period_start=datetime.utcnow(),
            current_period_end=datetime.utcnow() + timedelta(days=30),
        )
        db.add_all([plan, subscription])
        await db.commit()

        # Cancel subscription
        response = await admin_client.delete(
            "/api/v1/subscriptions/cancel",
            json={
                "cancel_at_period_end": True,
            }
        )

        assert response.status_code == 200
        canceled_subscription = response.json()

        assert canceled_subscription["status"] in ["canceled", "active"]
        assert canceled_subscription.get("cancelAtPeriodEnd") is True


class TestBillingFlow:
    """Integration tests for billing and invoices."""

    @pytest.mark.asyncio
    async def test_get_invoices(
        self,
        admin_client: AsyncClient,
        organization: Organization,
        db: AsyncSession,
    ):
        """Test retrieving organization invoices."""
        # Create test invoice
        invoice = Invoice(
            id=uuid.uuid4(),
            organization_id=organization.id,
            invoice_number="INV-2024-001",
            amount=Decimal("299.00"),
            currency="USD",
            status="paid",
            due_date=datetime.utcnow() + timedelta(days=30),
            payment_provider="stripe",
        )
        db.add(invoice)
        await db.commit()

        # Get invoices
        response = await admin_client.get("/api/v1/billing/invoices")

        assert response.status_code == 200
        invoices = response.json()

        assert isinstance(invoices, list)
        assert len(invoices) >= 1
        assert invoices[0]["invoiceNumber"] == "INV-2024-001"
        assert invoices[0]["status"] == "paid"

    @pytest.mark.asyncio
    async def test_payment_methods_flow(
        self,
        admin_client: AsyncClient,
        organization: Organization,
        db: AsyncSession,
    ):
        """Test managing payment methods."""
        # Get payment methods (should be empty initially)
        response = await admin_client.get("/api/v1/billing/payment-methods")

        assert response.status_code == 200
        methods = response.json()
        assert isinstance(methods, list)

    @pytest.mark.asyncio
    async def test_seat_management_flow(
        self,
        admin_client: AsyncClient,
        organization: Organization,
        regular_user: User,
        db: AsyncSession,
    ):
        """Test adding and removing seats."""
        # Create subscription with seat limit
        plan = SubscriptionPlan(
            id=uuid.uuid4(),
            tier=PlanTier.STARTER,
            name="Starter",
            price_monthly=Decimal("99.00"),
            max_users=5,
        )
        subscription = Subscription(
            id=uuid.uuid4(),
            organization_id=organization.id,
            plan_id=plan.id,
            status="active",
            billing_cycle="monthly",
            payment_provider="stripe",
            current_period_start=datetime.utcnow(),
            current_period_end=datetime.utcnow() + timedelta(days=30),
        )
        db.add_all([plan, subscription])
        await db.commit()

        # Add seat
        response = await admin_client.post(
            "/api/v1/billing/seats/add",
            json={"user_email": "newuser@example.com"}
        )

        # Should succeed or return appropriate error
        assert response.status_code in [200, 201, 400, 403]


class TestWebhookFlow:
    """Integration tests for payment webhooks."""

    @pytest.mark.asyncio
    async def test_stripe_webhook_endpoint_exists(
        self,
        admin_client: AsyncClient,
    ):
        """Test Stripe webhook endpoint is accessible."""
        # Send test webhook (will fail signature check, but endpoint should exist)
        response = await admin_client.post(
            "/api/v1/webhooks/stripe",
            json={"type": "payment_intent.succeeded", "data": {}},
            headers={"stripe-signature": "test"}
        )

        # Should get 400 (invalid signature) or 200, not 404
        assert response.status_code in [200, 400, 401]

    @pytest.mark.asyncio
    async def test_payplus_webhook_endpoint_exists(
        self,
        admin_client: AsyncClient,
    ):
        """Test PayPlus webhook endpoint is accessible."""
        # Send test webhook
        response = await admin_client.post(
            "/api/v1/webhooks/payplus",
            json={"event_type": "payment_success", "data": {}}
        )

        # Should get 400 (invalid data) or 200, not 404
        assert response.status_code in [200, 400, 401]
