from __future__ import annotations

from decimal import Decimal
from typing import Optional
from uuid import UUID

from sqlalchemy import func, select, or_, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.budget import CostEntry
from app.models.equipment import Equipment
from app.models.material import Material
from app.models.vendor import Vendor, VendorPerformance
from app.schemas.vendor import VendorCreate, VendorUpdate
from app.utils import utcnow


async def create_vendor(
    db: AsyncSession,
    vendor_data: VendorCreate
) -> Vendor:
    """Create a new vendor"""
    vendor = Vendor(**vendor_data.model_dump())
    db.add(vendor)
    await db.commit()
    await db.refresh(vendor)
    return vendor


async def get_vendor(
    db: AsyncSession,
    vendor_id: UUID,
    include_performances: bool = False
) -> Optional[Vendor]:
    """Get a vendor by ID"""
    query = select(Vendor).where(Vendor.id == vendor_id)

    if include_performances:
        query = query.options(selectinload(Vendor.performances))

    result = await db.execute(query)
    return result.scalar_one_or_none()


async def list_vendors(
    db: AsyncSession,
    search: Optional[str] = None,
    trade: Optional[str] = None,
    min_rating: Optional[float] = None,
    verified_only: bool = False,
    include_performances: bool = False
) -> list[Vendor]:
    """List vendors with optional filters"""
    query = select(Vendor)

    if include_performances:
        query = query.options(selectinload(Vendor.performances))

    filters = []

    if search:
        search_term = f"%{search}%"
        filters.append(
            or_(
                Vendor.company_name.ilike(search_term),
                Vendor.contact_email.ilike(search_term),
                Vendor.contact_phone.ilike(search_term)
            )
        )

    if trade:
        filters.append(Vendor.trade == trade)

    if min_rating is not None:
        filters.append(Vendor.rating >= min_rating)

    if verified_only:
        filters.append(Vendor.is_verified == True)

    if filters:
        query = query.where(and_(*filters))

    query = query.order_by(Vendor.company_name)

    result = await db.execute(query)
    return list(result.scalars().all())


async def update_vendor(
    db: AsyncSession,
    vendor_id: UUID,
    vendor_data: VendorUpdate
) -> Optional[Vendor]:
    """Update a vendor"""
    vendor = await get_vendor(db, vendor_id)
    if not vendor:
        return None

    update_dict = vendor_data.model_dump(exclude_unset=True)
    for field, value in update_dict.items():
        setattr(vendor, field, value)

    vendor.updated_at = utcnow()
    await db.commit()
    await db.refresh(vendor)
    return vendor


async def delete_vendor(
    db: AsyncSession,
    vendor_id: UUID
) -> bool:
    """Delete a vendor"""
    vendor = await get_vendor(db, vendor_id)
    if not vendor:
        return False

    await db.delete(vendor)
    await db.commit()
    return True


async def record_performance(
    db: AsyncSession,
    vendor_id: UUID,
    project_id: UUID,
    delivery_score: Optional[float] = None,
    quality_score: Optional[float] = None,
    price_score: Optional[float] = None,
    notes: Optional[str] = None
) -> VendorPerformance:
    """Record vendor performance for a project"""
    performance = VendorPerformance(
        vendor_id=vendor_id,
        project_id=project_id,
        delivery_score=delivery_score,
        quality_score=quality_score,
        price_score=price_score,
        notes=notes
    )

    db.add(performance)
    await db.commit()
    await db.refresh(performance)

    # Recalculate vendor's overall rating
    await calculate_vendor_rating(db, vendor_id)

    return performance


async def calculate_vendor_rating(
    db: AsyncSession,
    vendor_id: UUID
) -> Optional[float]:
    """Calculate and update vendor's overall rating based on all performances"""
    # Get all performances for this vendor
    result = await db.execute(
        select(VendorPerformance).where(VendorPerformance.vendor_id == vendor_id)
    )
    performances = result.scalars().all()

    if not performances:
        return None

    # Calculate average of all scores
    total_scores = []
    for perf in performances:
        scores = [
            s for s in [perf.delivery_score, perf.quality_score, perf.price_score]
            if s is not None
        ]
        if scores:
            total_scores.extend(scores)

    if not total_scores:
        return None

    avg_rating = sum(total_scores) / len(total_scores)

    # Update vendor rating
    vendor = await get_vendor(db, vendor_id)
    if vendor:
        vendor.rating = round(avg_rating, 2)
        vendor.updated_at = utcnow()
        await db.commit()
        await db.refresh(vendor)
        return vendor.rating

    return None


async def get_vendor_analytics(
    db: AsyncSession,
    vendor_id: UUID
) -> dict:
    """Get analytics for a specific vendor"""
    vendor = await get_vendor(db, vendor_id, include_performances=True)
    if not vendor:
        return {}

    # Get spending data from cost entries
    cost_query = (
        select(func.sum(CostEntry.amount))
        .where(CostEntry.vendor_id == vendor_id)
    )
    cost_result = await db.execute(cost_query)
    total_spending = cost_result.scalar() or Decimal(0)

    # Count materials linked to this vendor
    materials_query = (
        select(func.count(Material.id))
        .where(Material.vendor_id == vendor_id)
    )
    materials_result = await db.execute(materials_query)
    materials_count = materials_result.scalar() or 0

    # Count equipment linked to this vendor
    equipment_query = (
        select(func.count(Equipment.id))
        .where(Equipment.vendor_id == vendor_id)
    )
    equipment_result = await db.execute(equipment_query)
    equipment_count = equipment_result.scalar() or 0

    # Calculate performance averages
    performances = vendor.performances
    avg_delivery = 0.0
    avg_quality = 0.0
    avg_price = 0.0

    if performances:
        delivery_scores = [p.delivery_score for p in performances if p.delivery_score is not None]
        quality_scores = [p.quality_score for p in performances if p.quality_score is not None]
        price_scores = [p.price_score for p in performances if p.price_score is not None]

        if delivery_scores:
            avg_delivery = sum(delivery_scores) / len(delivery_scores)
        if quality_scores:
            avg_quality = sum(quality_scores) / len(quality_scores)
        if price_scores:
            avg_price = sum(price_scores) / len(price_scores)

    return {
        "vendor_id": vendor_id,
        "company_name": vendor.company_name,
        "total_spending": float(total_spending),
        "materials_count": materials_count,
        "equipment_count": equipment_count,
        "projects_count": len(performances),
        "avg_delivery_score": round(avg_delivery, 2),
        "avg_quality_score": round(avg_quality, 2),
        "avg_price_score": round(avg_price, 2),
        "overall_rating": vendor.rating or 0.0,
        "is_verified": vendor.is_verified,
        "certifications_count": len(vendor.certifications)
    }


async def get_all_vendors_analytics(
    db: AsyncSession
) -> list[dict]:
    """Get analytics for all vendors"""
    vendors = await list_vendors(db, include_performances=True)

    analytics = []
    for vendor in vendors:
        vendor_analytics = await get_vendor_analytics(db, vendor.id)
        analytics.append(vendor_analytics)

    # Sort by total spending (descending)
    analytics.sort(key=lambda x: x["total_spending"], reverse=True)

    return analytics


async def get_vendors_by_trade(db: AsyncSession) -> dict:
    """Get vendor count grouped by trade"""
    query = select(Vendor.trade, func.count(Vendor.id)).group_by(Vendor.trade)
    result = await db.execute(query)

    trade_counts = {}
    for trade, count in result:
        trade_counts[trade] = count

    return trade_counts


async def get_expiring_insurances(
    db: AsyncSession,
    days_threshold: int = 30
) -> list[Vendor]:
    """Get vendors with insurance expiring within threshold days"""
    from datetime import timedelta

    expiry_threshold = utcnow() + timedelta(days=days_threshold)

    query = (
        select(Vendor)
        .where(
            and_(
                Vendor.insurance_expiry.isnot(None),
                Vendor.insurance_expiry <= expiry_threshold,
                Vendor.insurance_expiry >= utcnow()
            )
        )
        .order_by(Vendor.insurance_expiry)
    )

    result = await db.execute(query)
    return list(result.scalars().all())
