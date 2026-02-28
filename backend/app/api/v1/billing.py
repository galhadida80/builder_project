from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.security import get_current_user
from app.db.session import get_db
from app.models.billing import Invoice, PaymentMethod
from app.models.organization import OrganizationMember
from app.models.subscription import Subscription
from app.models.user import User
from app.schemas.billing import (
    InvoiceResponse,
    PaymentMethodCreate,
    PaymentMethodResponse,
)
from app.schemas.subscription import PlanResponse, SubscriptionResponse
from app.services.subscription_service import SubscriptionService

router = APIRouter()


async def verify_org_access(
    org_id: UUID, user: User, db: AsyncSession
) -> OrganizationMember | None:
    """Verify user has access to organization"""
    result = await db.execute(
        select(OrganizationMember).where(
            OrganizationMember.organization_id == org_id,
            OrganizationMember.user_id == user.id,
        )
    )
    member = result.scalar_one_or_none()
    if not member and not user.is_super_admin:
        raise HTTPException(status_code=403, detail="Not an organization member")
    return member


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


@router.get("/billing/invoices", response_model=list[InvoiceResponse])
async def list_invoices(
    organization_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all invoices for an organization"""
    await verify_org_access(organization_id, current_user, db)

    query = (
        select(Invoice)
        .where(Invoice.organization_id == organization_id)
        .options(selectinload(Invoice.subscription).selectinload(Subscription.plan))
        .order_by(Invoice.issued_at.desc())
    )
    result = await db.execute(query)
    invoices = result.scalars().all()

    response_list = []
    for invoice in invoices:
        subscription_response = None
        if invoice.subscription:
            plan_response = None
            if invoice.subscription.plan:
                plan_response = PlanResponse(
                    id=invoice.subscription.plan.id,
                    tier=invoice.subscription.plan.tier,
                    name=invoice.subscription.plan.name,
                    description=invoice.subscription.plan.description,
                    monthly_price=float(invoice.subscription.plan.monthly_price),
                    annual_price=float(invoice.subscription.plan.annual_price),
                    max_users=invoice.subscription.plan.max_users,
                    max_projects=invoice.subscription.plan.max_projects,
                    max_storage_gb=invoice.subscription.plan.max_storage_gb,
                    is_active=invoice.subscription.plan.is_active,
                    created_at=invoice.subscription.plan.created_at,
                    updated_at=invoice.subscription.plan.updated_at,
                )
            subscription_response = SubscriptionResponse(
                id=invoice.subscription.id,
                organization_id=invoice.subscription.organization_id,
                plan_id=invoice.subscription.plan_id,
                billing_cycle=invoice.subscription.billing_cycle,
                status=invoice.subscription.status,
                trial_ends_at=invoice.subscription.trial_ends_at,
                current_period_start=invoice.subscription.current_period_start,
                current_period_end=invoice.subscription.current_period_end,
                canceled_at=invoice.subscription.canceled_at,
                stripe_subscription_id=invoice.subscription.stripe_subscription_id,
                payplus_subscription_id=invoice.subscription.payplus_subscription_id,
                created_at=invoice.subscription.created_at,
                updated_at=invoice.subscription.updated_at,
                plan=plan_response,
            )

        response_list.append(
            InvoiceResponse(
                id=invoice.id,
                organization_id=invoice.organization_id,
                subscription_id=invoice.subscription_id,
                invoice_number=invoice.invoice_number,
                amount=float(invoice.amount),
                currency=invoice.currency,
                status=invoice.status,
                billing_period_start=invoice.billing_period_start,
                billing_period_end=invoice.billing_period_end,
                issued_at=invoice.issued_at,
                due_date=invoice.due_date,
                paid_at=invoice.paid_at,
                stripe_invoice_id=invoice.stripe_invoice_id,
                payplus_invoice_id=invoice.payplus_invoice_id,
                pdf_url=invoice.pdf_url,
                meta=invoice.meta,
                created_at=invoice.created_at,
                updated_at=invoice.updated_at,
                subscription=subscription_response,
            )
        )

    return response_list


@router.get("/billing/invoices/{invoice_id}/download")
async def download_invoice(
    invoice_id: UUID,
    organization_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Download invoice PDF"""
    await verify_org_access(organization_id, current_user, db)

    result = await db.execute(
        select(Invoice).where(
            Invoice.id == invoice_id,
            Invoice.organization_id == organization_id,
        )
    )
    invoice = result.scalar_one_or_none()

    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    if not invoice.pdf_url:
        raise HTTPException(status_code=404, detail="Invoice PDF not available")

    return RedirectResponse(url=invoice.pdf_url)


@router.get("/billing/payment-methods", response_model=list[PaymentMethodResponse])
async def list_payment_methods(
    organization_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all payment methods for an organization"""
    await verify_org_access(organization_id, current_user, db)

    query = (
        select(PaymentMethod)
        .where(PaymentMethod.organization_id == organization_id)
        .order_by(PaymentMethod.is_default.desc(), PaymentMethod.created_at.desc())
    )
    result = await db.execute(query)
    payment_methods = result.scalars().all()

    return [
        PaymentMethodResponse(
            id=pm.id,
            organization_id=pm.organization_id,
            type=pm.type,
            card_brand=pm.card_brand,
            card_last4=pm.card_last4,
            card_exp_month=pm.card_exp_month,
            card_exp_year=pm.card_exp_year,
            is_default=pm.is_default,
            stripe_payment_method_id=pm.stripe_payment_method_id,
            payplus_payment_method_id=pm.payplus_payment_method_id,
            meta=pm.meta,
            created_at=pm.created_at,
            updated_at=pm.updated_at,
        )
        for pm in payment_methods
    ]


@router.post("/billing/payment-methods", response_model=PaymentMethodResponse, status_code=201)
async def create_payment_method(
    data: PaymentMethodCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add a new payment method"""
    await verify_org_admin(data.organization_id, current_user, db)

    if data.is_default:
        existing_default = await db.execute(
            select(PaymentMethod).where(
                PaymentMethod.organization_id == data.organization_id,
                PaymentMethod.is_default == True,
            )
        )
        existing = existing_default.scalar_one_or_none()
        if existing:
            existing.is_default = False

    payment_method = PaymentMethod(
        organization_id=data.organization_id,
        type=data.type,
        card_brand=data.card_brand,
        card_last4=data.card_last4,
        card_exp_month=data.card_exp_month,
        card_exp_year=data.card_exp_year,
        is_default=data.is_default,
        stripe_payment_method_id=data.stripe_payment_method_id,
        payplus_payment_method_id=data.payplus_payment_method_id,
        meta=data.meta,
    )
    db.add(payment_method)
    await db.commit()
    await db.refresh(payment_method)

    return PaymentMethodResponse(
        id=payment_method.id,
        organization_id=payment_method.organization_id,
        type=payment_method.type,
        card_brand=payment_method.card_brand,
        card_last4=payment_method.card_last4,
        card_exp_month=payment_method.card_exp_month,
        card_exp_year=payment_method.card_exp_year,
        is_default=payment_method.is_default,
        stripe_payment_method_id=payment_method.stripe_payment_method_id,
        payplus_payment_method_id=payment_method.payplus_payment_method_id,
        meta=payment_method.meta,
        created_at=payment_method.created_at,
        updated_at=payment_method.updated_at,
    )


@router.delete("/billing/payment-methods/{payment_method_id}", status_code=204)
async def delete_payment_method(
    payment_method_id: UUID,
    organization_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Remove a payment method"""
    await verify_org_admin(organization_id, current_user, db)

    result = await db.execute(
        select(PaymentMethod).where(
            PaymentMethod.id == payment_method_id,
            PaymentMethod.organization_id == organization_id,
        )
    )
    payment_method = result.scalar_one_or_none()

    if not payment_method:
        raise HTTPException(status_code=404, detail="Payment method not found")

    if payment_method.is_default:
        count_result = await db.execute(
            select(PaymentMethod).where(
                PaymentMethod.organization_id == organization_id
            )
        )
        total = len(count_result.scalars().all())
        if total <= 1:
            raise HTTPException(
                status_code=400,
                detail="Cannot delete the only payment method. Add another first.",
            )

    await db.delete(payment_method)
    await db.commit()


@router.post("/billing/seats/add", status_code=201)
async def add_seat(
    organization_id: UUID,
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add a seat (user) to the organization"""
    await verify_org_admin(organization_id, current_user, db)

    existing = await db.execute(
        select(OrganizationMember).where(
            OrganizationMember.organization_id == organization_id,
            OrganizationMember.user_id == user_id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="User already a member")

    result = await db.execute(
        select(User).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Check subscription limits before adding user
    subscription_service = SubscriptionService(db)
    try:
        seat_result = await subscription_service.add_seat(organization_id, user_id)
    except ValueError as e:
        raise HTTPException(status_code=403, detail=str(e))

    # Add user to organization
    member = OrganizationMember(
        organization_id=organization_id,
        user_id=user_id,
        role="project_member",
    )
    db.add(member)
    await db.commit()

    return {
        "message": "Seat added successfully",
        "user_id": str(user_id),
        "current_seats": seat_result.get("current_seats"),
        "max_seats": seat_result.get("max_seats"),
    }


@router.delete("/billing/seats/{user_id}", status_code=204)
async def remove_seat(
    user_id: UUID,
    organization_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Remove a seat (user) from the organization"""
    await verify_org_admin(organization_id, current_user, db)

    result = await db.execute(
        select(OrganizationMember).where(
            OrganizationMember.organization_id == organization_id,
            OrganizationMember.user_id == user_id,
        )
    )
    member = result.scalar_one_or_none()

    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    if member.role == "org_admin":
        admin_count_result = await db.execute(
            select(OrganizationMember).where(
                OrganizationMember.organization_id == organization_id,
                OrganizationMember.role == "org_admin",
            )
        )
        admin_count = len(admin_count_result.scalars().all())
        if admin_count <= 1:
            raise HTTPException(
                status_code=400,
                detail="Cannot remove the only organization admin",
            )

    await db.delete(member)
    await db.commit()
