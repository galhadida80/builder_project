from __future__ import annotations

from typing import Optional
from uuid import UUID

from sqlalchemy import select, or_, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.vendor import Vendor, VendorPerformance
from app.schemas.vendor import VendorCreate, VendorUpdate
from app.utils import utcnow


async def create_vendor(db: AsyncSession, vendor_data: VendorCreate) -> Vendor:
    vendor = Vendor(**vendor_data.model_dump())
    db.add(vendor)
    await db.commit()
    await db.refresh(vendor)
    return vendor


async def get_vendor(
    db: AsyncSession, vendor_id: UUID, include_performances: bool = False,
) -> Optional[Vendor]:
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
    include_performances: bool = False,
) -> list[Vendor]:
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
                Vendor.contact_phone.ilike(search_term),
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
    db: AsyncSession, vendor_id: UUID, vendor_data: VendorUpdate,
) -> Optional[Vendor]:
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


async def delete_vendor(db: AsyncSession, vendor_id: UUID) -> bool:
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
    notes: Optional[str] = None,
) -> VendorPerformance:
    performance = VendorPerformance(
        vendor_id=vendor_id, project_id=project_id,
        delivery_score=delivery_score, quality_score=quality_score,
        price_score=price_score, notes=notes,
    )
    db.add(performance)
    await db.commit()
    await db.refresh(performance)
    await calculate_vendor_rating(db, vendor_id)
    return performance


async def calculate_vendor_rating(db: AsyncSession, vendor_id: UUID) -> Optional[float]:
    result = await db.execute(
        select(VendorPerformance).where(VendorPerformance.vendor_id == vendor_id)
    )
    performances = result.scalars().all()
    if not performances:
        return None

    total_scores = []
    for perf in performances:
        scores = [s for s in [perf.delivery_score, perf.quality_score, perf.price_score] if s is not None]
        if scores:
            total_scores.extend(scores)
    if not total_scores:
        return None

    avg_rating = sum(total_scores) / len(total_scores)
    vendor = await get_vendor(db, vendor_id)
    if vendor:
        vendor.rating = round(avg_rating, 2)
        vendor.updated_at = utcnow()
        await db.commit()
        await db.refresh(vendor)
        return vendor.rating
    return None
