from __future__ import annotations

from datetime import timedelta
from decimal import Decimal
from uuid import UUID

from sqlalchemy import func, select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.budget import CostEntry
from app.models.equipment import Equipment
from app.models.material import Material
from app.models.vendor import Vendor
from app.services.vendor_service import get_vendor, list_vendors
from app.utils import utcnow


async def get_vendor_analytics(db: AsyncSession, vendor_id: UUID) -> dict:
    vendor = await get_vendor(db, vendor_id, include_performances=True)
    if not vendor:
        return {}

    cost_result = await db.execute(
        select(func.sum(CostEntry.amount)).where(CostEntry.vendor_id == vendor_id)
    )
    total_spending = cost_result.scalar() or Decimal(0)

    materials_result = await db.execute(
        select(func.count(Material.id)).where(Material.vendor_id == vendor_id)
    )
    materials_count = materials_result.scalar() or 0

    equipment_result = await db.execute(
        select(func.count(Equipment.id)).where(Equipment.vendor_id == vendor_id)
    )
    equipment_count = equipment_result.scalar() or 0

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
        "certifications_count": len(vendor.certifications),
    }


async def get_all_vendors_analytics(db: AsyncSession) -> list[dict]:
    vendors = await list_vendors(db, include_performances=True)
    analytics = []
    for vendor in vendors:
        vendor_analytics = await get_vendor_analytics(db, vendor.id)
        analytics.append(vendor_analytics)
    analytics.sort(key=lambda x: x["total_spending"], reverse=True)
    return analytics


async def get_vendors_by_trade(db: AsyncSession) -> dict:
    query = select(Vendor.trade, func.count(Vendor.id)).group_by(Vendor.trade)
    result = await db.execute(query)
    trade_counts = {}
    for trade, count in result:
        trade_counts[trade] = count
    return trade_counts


async def get_expiring_insurances(db: AsyncSession, days_threshold: int = 30) -> list[Vendor]:
    expiry_threshold = utcnow() + timedelta(days=days_threshold)
    query = (
        select(Vendor)
        .where(
            and_(
                Vendor.insurance_expiry.isnot(None),
                Vendor.insurance_expiry <= expiry_threshold,
                Vendor.insurance_expiry >= utcnow(),
            )
        )
        .order_by(Vendor.insurance_expiry)
    )
    result = await db.execute(query)
    return list(result.scalars().all())
