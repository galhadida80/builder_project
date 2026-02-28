from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.security import get_current_user
from app.db.session import get_db
from app.models.organization import Organization, OrganizationMember
from app.models.subscription import Subscription, SubscriptionPlan
from app.models.user import User
from app.schemas.subscription import (
    PlanResponse,
    SubscriptionCancel,
    SubscriptionCreate,
    SubscriptionResponse,
    SubscriptionUpgrade,
)
from app.services.subscription_service import SubscriptionService

router = APIRouter()


async def verify_org_admin(
    org_id: UUID, user: User, db: AsyncSession
) -> OrganizationMember | None:
    """Verify user is an org admin"""
    result = await db.execute(
        select(OrganizationMember).where(
            OrganizationMember.organization_id == org_id,
            OrganizationMember.user_id == user.id,
        )
    )
    member = result.scalar_one_or_none()
    if not member:
        if user.is_super_admin:
            return None
        raise HTTPException(status_code=403, detail="Not an organization member")
    if member.role != "org_admin" and not user.is_super_admin:
        raise HTTPException(status_code=403, detail="Organization admin required")
    return member


@router.get("/subscriptions/plans", response_model=list[PlanResponse])
async def list_plans(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all available subscription plans"""
    query = (
        select(SubscriptionPlan)
        .where(SubscriptionPlan.is_active == True)
        .order_by(SubscriptionPlan.monthly_price)
    )
    result = await db.execute(query)
    plans = result.scalars().all()

    return [
        PlanResponse(
            id=plan.id,
            tier=plan.tier,
            name=plan.name,
            description=plan.description,
            monthly_price=float(plan.monthly_price),
            annual_price=float(plan.annual_price),
            max_users=plan.max_users,
            max_projects=plan.max_projects,
            max_storage_gb=plan.max_storage_gb,
            is_active=plan.is_active,
            created_at=plan.created_at,
            updated_at=plan.updated_at,
        )
        for plan in plans
    ]


@router.get("/subscriptions/current", response_model=SubscriptionResponse)
async def get_current_subscription(
    organization_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get current subscription for an organization"""
    result = await db.execute(
        select(OrganizationMember).where(
            OrganizationMember.organization_id == organization_id,
            OrganizationMember.user_id == current_user.id,
        )
    )
    member = result.scalar_one_or_none()
    if not member and not current_user.is_super_admin:
        raise HTTPException(status_code=403, detail="Not an organization member")

    query = (
        select(Subscription)
        .where(Subscription.organization_id == organization_id)
        .options(selectinload(Subscription.plan))
    )
    result = await db.execute(query)
    subscription = result.scalar_one_or_none()

    if not subscription:
        raise HTTPException(status_code=404, detail="No subscription found")

    plan_response = None
    if subscription.plan:
        plan_response = PlanResponse(
            id=subscription.plan.id,
            tier=subscription.plan.tier,
            name=subscription.plan.name,
            description=subscription.plan.description,
            monthly_price=float(subscription.plan.monthly_price),
            annual_price=float(subscription.plan.annual_price),
            max_users=subscription.plan.max_users,
            max_projects=subscription.plan.max_projects,
            max_storage_gb=subscription.plan.max_storage_gb,
            is_active=subscription.plan.is_active,
            created_at=subscription.plan.created_at,
            updated_at=subscription.plan.updated_at,
        )

    return SubscriptionResponse(
        id=subscription.id,
        organization_id=subscription.organization_id,
        plan_id=subscription.plan_id,
        billing_cycle=subscription.billing_cycle,
        status=subscription.status,
        trial_ends_at=subscription.trial_ends_at,
        current_period_start=subscription.current_period_start,
        current_period_end=subscription.current_period_end,
        canceled_at=subscription.canceled_at,
        stripe_subscription_id=subscription.stripe_subscription_id,
        payplus_subscription_id=subscription.payplus_subscription_id,
        created_at=subscription.created_at,
        updated_at=subscription.updated_at,
        plan=plan_response,
    )


@router.post("/subscriptions/subscribe", response_model=SubscriptionResponse, status_code=201)
async def create_subscription(
    data: SubscriptionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new subscription for an organization"""
    await verify_org_admin(data.organization_id, current_user, db)

    result = await db.execute(
        select(Organization).where(Organization.id == data.organization_id)
    )
    org = result.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    service = SubscriptionService(db)
    try:
        subscription = await service.create_subscription(
            organization_id=data.organization_id,
            plan_id=data.plan_id,
            billing_cycle=data.billing_cycle,
            trial_days=data.trial_days or 14,
        )
        await db.commit()
        await db.refresh(subscription)

        await db.refresh(subscription, ["plan"])

        plan_response = None
        if subscription.plan:
            plan_response = PlanResponse(
                id=subscription.plan.id,
                tier=subscription.plan.tier,
                name=subscription.plan.name,
                description=subscription.plan.description,
                monthly_price=float(subscription.plan.monthly_price),
                annual_price=float(subscription.plan.annual_price),
                max_users=subscription.plan.max_users,
                max_projects=subscription.plan.max_projects,
                max_storage_gb=subscription.plan.max_storage_gb,
                is_active=subscription.plan.is_active,
                created_at=subscription.plan.created_at,
                updated_at=subscription.plan.updated_at,
            )

        return SubscriptionResponse(
            id=subscription.id,
            organization_id=subscription.organization_id,
            plan_id=subscription.plan_id,
            billing_cycle=subscription.billing_cycle,
            status=subscription.status,
            trial_ends_at=subscription.trial_ends_at,
            current_period_start=subscription.current_period_start,
            current_period_end=subscription.current_period_end,
            canceled_at=subscription.canceled_at,
            stripe_subscription_id=subscription.stripe_subscription_id,
            payplus_subscription_id=subscription.payplus_subscription_id,
            created_at=subscription.created_at,
            updated_at=subscription.updated_at,
            plan=plan_response,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/subscriptions/upgrade", response_model=SubscriptionResponse)
async def upgrade_subscription(
    organization_id: UUID,
    data: SubscriptionUpgrade,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Upgrade subscription to a higher tier"""
    await verify_org_admin(organization_id, current_user, db)

    service = SubscriptionService(db)
    try:
        subscription = await service.upgrade_plan(
            organization_id=organization_id,
            new_plan_id=data.plan_id,
            billing_cycle=data.billing_cycle,
        )
        await db.commit()
        await db.refresh(subscription)

        await db.refresh(subscription, ["plan"])

        plan_response = None
        if subscription.plan:
            plan_response = PlanResponse(
                id=subscription.plan.id,
                tier=subscription.plan.tier,
                name=subscription.plan.name,
                description=subscription.plan.description,
                monthly_price=float(subscription.plan.monthly_price),
                annual_price=float(subscription.plan.annual_price),
                max_users=subscription.plan.max_users,
                max_projects=subscription.plan.max_projects,
                max_storage_gb=subscription.plan.max_storage_gb,
                is_active=subscription.plan.is_active,
                created_at=subscription.plan.created_at,
                updated_at=subscription.plan.updated_at,
            )

        return SubscriptionResponse(
            id=subscription.id,
            organization_id=subscription.organization_id,
            plan_id=subscription.plan_id,
            billing_cycle=subscription.billing_cycle,
            status=subscription.status,
            trial_ends_at=subscription.trial_ends_at,
            current_period_start=subscription.current_period_start,
            current_period_end=subscription.current_period_end,
            canceled_at=subscription.canceled_at,
            stripe_subscription_id=subscription.stripe_subscription_id,
            payplus_subscription_id=subscription.payplus_subscription_id,
            created_at=subscription.created_at,
            updated_at=subscription.updated_at,
            plan=plan_response,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/subscriptions/cancel", response_model=SubscriptionResponse)
async def cancel_subscription(
    organization_id: UUID,
    data: SubscriptionCancel,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Cancel a subscription"""
    await verify_org_admin(organization_id, current_user, db)

    service = SubscriptionService(db)
    try:
        subscription = await service.cancel_subscription(
            organization_id=organization_id,
            immediate=data.immediate,
        )
        await db.commit()
        await db.refresh(subscription)

        await db.refresh(subscription, ["plan"])

        plan_response = None
        if subscription.plan:
            plan_response = PlanResponse(
                id=subscription.plan.id,
                tier=subscription.plan.tier,
                name=subscription.plan.name,
                description=subscription.plan.description,
                monthly_price=float(subscription.plan.monthly_price),
                annual_price=float(subscription.plan.annual_price),
                max_users=subscription.plan.max_users,
                max_projects=subscription.plan.max_projects,
                max_storage_gb=subscription.plan.max_storage_gb,
                is_active=subscription.plan.is_active,
                created_at=subscription.plan.created_at,
                updated_at=subscription.plan.updated_at,
            )

        return SubscriptionResponse(
            id=subscription.id,
            organization_id=subscription.organization_id,
            plan_id=subscription.plan_id,
            billing_cycle=subscription.billing_cycle,
            status=subscription.status,
            trial_ends_at=subscription.trial_ends_at,
            current_period_start=subscription.current_period_start,
            current_period_end=subscription.current_period_end,
            canceled_at=subscription.canceled_at,
            stripe_subscription_id=subscription.stripe_subscription_id,
            payplus_subscription_id=subscription.payplus_subscription_id,
            created_at=subscription.created_at,
            updated_at=subscription.updated_at,
            plan=plan_response,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
