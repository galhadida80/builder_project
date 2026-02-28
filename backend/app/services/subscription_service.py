import logging
from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.billing import BillingHistory, Invoice, PaymentMethod
from app.models.organization import Organization, OrganizationMember
from app.models.project import Project
from app.models.subscription import Subscription, SubscriptionPlan
from app.services.payplus_service import PayPlusService
from app.services.stripe_service import StripeService
from app.utils import utcnow

logger = logging.getLogger(__name__)


class SubscriptionService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.stripe_service = StripeService()
        self.payplus_service = PayPlusService()

    async def get_subscription(self, organization_id: UUID) -> Subscription | None:
        """Get active subscription for an organization"""
        query = (
            select(Subscription)
            .where(Subscription.organization_id == organization_id)
            .where(Subscription.status.in_(["trial", "active"]))
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def create_subscription(
        self,
        organization_id: UUID,
        plan_id: UUID,
        billing_cycle: str = "monthly",
        trial_days: int = 14,
        payment_provider: Optional[str] = None,
    ) -> Subscription:
        """Create a new subscription with trial period"""
        plan = await self.db.get(SubscriptionPlan, plan_id)
        if not plan:
            raise ValueError(f"Plan {plan_id} not found")

        if not plan.is_active:
            raise ValueError(f"Plan {plan_id} is not active")

        existing = await self.get_subscription(organization_id)
        if existing:
            raise ValueError(f"Organization {organization_id} already has an active subscription")

        now = utcnow()
        trial_ends_at = now + timedelta(days=trial_days) if trial_days > 0 else None

        if billing_cycle == "monthly":
            period_end = now + timedelta(days=30)
        else:
            period_end = now + timedelta(days=365)

        subscription = Subscription(
            organization_id=organization_id,
            plan_id=plan_id,
            billing_cycle=billing_cycle,
            status="trial" if trial_days > 0 else "active",
            trial_ends_at=trial_ends_at,
            current_period_start=now,
            current_period_end=period_end,
        )

        self.db.add(subscription)
        await self.db.flush()

        await self._log_billing_event(
            organization_id=organization_id,
            subscription_id=subscription.id,
            event_type="subscription_created",
            description=f"Subscription created for plan {plan.name} ({billing_cycle})",
        )

        return subscription

    async def upgrade_plan(
        self,
        organization_id: UUID,
        new_plan_id: UUID,
        billing_cycle: Optional[str] = None,
    ) -> Subscription:
        """Upgrade subscription to a higher tier plan"""
        subscription = await self.get_subscription(organization_id)
        if not subscription:
            raise ValueError(f"No active subscription found for organization {organization_id}")

        new_plan = await self.db.get(SubscriptionPlan, new_plan_id)
        if not new_plan:
            raise ValueError(f"Plan {new_plan_id} not found")

        if not new_plan.is_active:
            raise ValueError(f"Plan {new_plan_id} is not active")

        old_plan = await self.db.get(SubscriptionPlan, subscription.plan_id)

        subscription.plan_id = new_plan_id
        if billing_cycle:
            subscription.billing_cycle = billing_cycle

        await self.db.flush()

        await self._log_billing_event(
            organization_id=organization_id,
            subscription_id=subscription.id,
            event_type="plan_upgraded",
            description=f"Upgraded from {old_plan.name} to {new_plan.name}",
        )

        if subscription.stripe_subscription_id and self.stripe_service.enabled:
            await self._update_stripe_subscription(subscription, new_plan)
        elif subscription.payplus_subscription_id and self.payplus_service.enabled:
            await self._update_payplus_subscription(subscription, new_plan)

        return subscription

    async def downgrade_plan(
        self,
        organization_id: UUID,
        new_plan_id: UUID,
    ) -> Subscription:
        """Downgrade subscription to a lower tier plan"""
        subscription = await self.get_subscription(organization_id)
        if not subscription:
            raise ValueError(f"No active subscription found for organization {organization_id}")

        new_plan = await self.db.get(SubscriptionPlan, new_plan_id)
        if not new_plan:
            raise ValueError(f"Plan {new_plan_id} not found")

        limits_ok = await self.check_usage_limits(organization_id, new_plan_id)
        if not limits_ok["within_limits"]:
            raise ValueError(f"Cannot downgrade: {limits_ok['violations']}")

        old_plan = await self.db.get(SubscriptionPlan, subscription.plan_id)

        subscription.plan_id = new_plan_id
        await self.db.flush()

        await self._log_billing_event(
            organization_id=organization_id,
            subscription_id=subscription.id,
            event_type="plan_downgraded",
            description=f"Downgraded from {old_plan.name} to {new_plan.name}",
        )

        if subscription.stripe_subscription_id and self.stripe_service.enabled:
            await self._update_stripe_subscription(subscription, new_plan)
        elif subscription.payplus_subscription_id and self.payplus_service.enabled:
            await self._update_payplus_subscription(subscription, new_plan)

        return subscription

    async def cancel_subscription(
        self,
        organization_id: UUID,
        immediate: bool = False,
    ) -> Subscription:
        """Cancel subscription immediately or at period end"""
        subscription = await self.get_subscription(organization_id)
        if not subscription:
            raise ValueError(f"No active subscription found for organization {organization_id}")

        now = utcnow()
        subscription.canceled_at = now

        if immediate:
            subscription.status = "canceled"
            subscription.current_period_end = now
        else:
            subscription.status = "canceled"

        await self.db.flush()

        await self._log_billing_event(
            organization_id=organization_id,
            subscription_id=subscription.id,
            event_type="subscription_canceled",
            description=f"Subscription canceled ({'immediate' if immediate else 'at period end'})",
        )

        if subscription.stripe_subscription_id and self.stripe_service.enabled:
            self.stripe_service.cancel_subscription(
                subscription.stripe_subscription_id,
                cancel_at_period_end=not immediate
            )
        elif subscription.payplus_subscription_id and self.payplus_service.enabled:
            await self.payplus_service.cancel_subscription(subscription.payplus_subscription_id)

        return subscription

    async def check_usage_limits(
        self,
        organization_id: UUID,
        plan_id: Optional[UUID] = None,
    ) -> dict:
        """Check if organization is within plan limits"""
        subscription = await self.get_subscription(organization_id)

        if plan_id:
            plan = await self.db.get(SubscriptionPlan, plan_id)
        elif subscription:
            plan = await self.db.get(SubscriptionPlan, subscription.plan_id)
        else:
            return {"within_limits": True, "violations": []}

        if not plan:
            return {"within_limits": True, "violations": []}

        violations = []

        user_count = await self._get_user_count(organization_id)
        if plan.max_users and user_count > plan.max_users:
            violations.append(
                f"User count ({user_count}) exceeds plan limit ({plan.max_users})"
            )

        project_count = await self._get_project_count(organization_id)
        if plan.max_projects and project_count > plan.max_projects:
            violations.append(
                f"Project count ({project_count}) exceeds plan limit ({plan.max_projects})"
            )

        storage_gb = await self._get_storage_usage_gb(organization_id)
        if plan.max_storage_gb and storage_gb > plan.max_storage_gb:
            violations.append(
                f"Storage usage ({storage_gb:.2f}GB) exceeds plan limit ({plan.max_storage_gb}GB)"
            )

        return {
            "within_limits": len(violations) == 0,
            "violations": violations,
            "usage": {
                "users": user_count,
                "max_users": plan.max_users,
                "projects": project_count,
                "max_projects": plan.max_projects,
                "storage_gb": storage_gb,
                "max_storage_gb": plan.max_storage_gb,
            },
        }

    async def add_seat(self, organization_id: UUID, user_id: UUID) -> dict:
        """Add a user seat and check if additional billing is needed"""
        subscription = await self.get_subscription(organization_id)
        if not subscription:
            raise ValueError(f"No active subscription found for organization {organization_id}")

        plan = await self.db.get(SubscriptionPlan, subscription.plan_id)
        user_count = await self._get_user_count(organization_id)

        if plan.max_users and user_count >= plan.max_users:
            raise ValueError(
                f"User limit ({plan.max_users}) reached. Upgrade plan to add more users."
            )

        await self._log_billing_event(
            organization_id=organization_id,
            subscription_id=subscription.id,
            event_type="seat_added",
            description=f"User seat added (user_id: {user_id})",
        )

        return {
            "success": True,
            "current_seats": user_count + 1,
            "max_seats": plan.max_users,
        }

    async def remove_seat(self, organization_id: UUID, user_id: UUID) -> dict:
        """Remove a user seat"""
        subscription = await self.get_subscription(organization_id)
        if subscription:
            await self._log_billing_event(
                organization_id=organization_id,
                subscription_id=subscription.id,
                event_type="seat_removed",
                description=f"User seat removed (user_id: {user_id})",
            )

        user_count = await self._get_user_count(organization_id)

        return {
            "success": True,
            "current_seats": max(0, user_count - 1),
        }

    async def check_trial_status(self, organization_id: UUID) -> dict:
        """Check trial period status"""
        subscription = await self.get_subscription(organization_id)
        if not subscription:
            return {"has_trial": False, "is_trial_active": False}

        if subscription.status != "trial" or not subscription.trial_ends_at:
            return {"has_trial": False, "is_trial_active": False}

        now = utcnow()
        is_active = subscription.trial_ends_at > now
        days_remaining = (subscription.trial_ends_at - now).days if is_active else 0

        return {
            "has_trial": True,
            "is_trial_active": is_active,
            "trial_ends_at": subscription.trial_ends_at,
            "days_remaining": max(0, days_remaining),
        }

    async def end_trial(self, organization_id: UUID) -> Subscription:
        """End trial period and activate subscription"""
        subscription = await self.get_subscription(organization_id)
        if not subscription:
            raise ValueError(f"No active subscription found for organization {organization_id}")

        if subscription.status != "trial":
            raise ValueError("Subscription is not in trial status")

        has_payment = await self._has_valid_payment_method(organization_id)
        if not has_payment:
            raise ValueError("No valid payment method found. Add payment method to activate.")

        subscription.status = "active"
        subscription.trial_ends_at = utcnow()
        await self.db.flush()

        await self._log_billing_event(
            organization_id=organization_id,
            subscription_id=subscription.id,
            event_type="trial_ended",
            description="Trial period ended, subscription activated",
        )

        return subscription

    async def generate_invoice(
        self,
        subscription_id: UUID,
        billing_period_start: datetime,
        billing_period_end: datetime,
    ) -> Invoice:
        """Generate invoice for billing period"""
        subscription = await self.db.get(Subscription, subscription_id)
        if not subscription:
            raise ValueError(f"Subscription {subscription_id} not found")

        plan = await self.db.get(SubscriptionPlan, subscription.plan_id)

        amount = plan.monthly_price if subscription.billing_cycle == "monthly" else plan.annual_price

        invoice_number = await self._generate_invoice_number(subscription.organization_id)

        invoice = Invoice(
            organization_id=subscription.organization_id,
            subscription_id=subscription.id,
            invoice_number=invoice_number,
            amount=amount,
            currency="ILS",
            status="pending",
            billing_period_start=billing_period_start,
            billing_period_end=billing_period_end,
            issued_at=utcnow(),
            due_date=utcnow() + timedelta(days=14),
        )

        self.db.add(invoice)
        await self.db.flush()

        await self._log_billing_event(
            organization_id=subscription.organization_id,
            subscription_id=subscription.id,
            event_type="invoice_generated",
            description=f"Invoice {invoice_number} generated for {amount} ILS",
            amount=amount,
        )

        return invoice

    async def _get_user_count(self, organization_id: UUID) -> int:
        """Get count of users in organization"""
        query = select(func.count(OrganizationMember.id)).where(
            OrganizationMember.organization_id == organization_id
        )
        result = await self.db.execute(query)
        return result.scalar() or 0

    async def _get_project_count(self, organization_id: UUID) -> int:
        """Get count of projects in organization"""
        query = select(func.count(Project.id)).where(
            Project.organization_id == organization_id
        )
        result = await self.db.execute(query)
        return result.scalar() or 0

    async def _get_storage_usage_gb(self, organization_id: UUID) -> float:
        """Get storage usage in GB (placeholder - implement actual storage tracking)"""
        return 0.0

    async def _has_valid_payment_method(self, organization_id: UUID) -> bool:
        """Check if organization has a valid payment method"""
        query = select(func.count(PaymentMethod.id)).where(
            PaymentMethod.organization_id == organization_id
        )
        result = await self.db.execute(query)
        count = result.scalar() or 0
        return count > 0

    async def _generate_invoice_number(self, organization_id: UUID) -> str:
        """Generate unique invoice number"""
        org = await self.db.get(Organization, organization_id)
        org_code = org.code if org else "ORG"

        now = utcnow()
        date_part = now.strftime("%Y%m")

        query = select(func.count(Invoice.id)).where(
            Invoice.organization_id == organization_id,
            func.date_trunc("month", Invoice.issued_at) == func.date_trunc("month", now)
        )
        result = await self.db.execute(query)
        count = (result.scalar() or 0) + 1

        return f"INV-{org_code}-{date_part}-{count:04d}"

    async def _log_billing_event(
        self,
        organization_id: UUID,
        subscription_id: UUID,
        event_type: str,
        description: str,
        amount: Optional[float] = None,
    ) -> None:
        """Log billing event to history"""
        event = BillingHistory(
            organization_id=organization_id,
            subscription_id=subscription_id,
            event_type=event_type,
            description=description,
            amount=amount,
            currency="ILS" if amount else None,
        )
        self.db.add(event)
        await self.db.flush()

    async def _update_stripe_subscription(
        self,
        subscription: Subscription,
        new_plan: SubscriptionPlan,
    ) -> None:
        """Update Stripe subscription (placeholder for actual implementation)"""
        logger.info(
            f"Updating Stripe subscription {subscription.stripe_subscription_id} "
            f"to plan {new_plan.name}"
        )

    async def _update_payplus_subscription(
        self,
        subscription: Subscription,
        new_plan: SubscriptionPlan,
    ) -> None:
        """Update PayPlus subscription (placeholder for actual implementation)"""
        logger.info(
            f"Updating PayPlus subscription {subscription.payplus_subscription_id} "
            f"to plan {new_plan.name}"
        )
