from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.vendor import VendorResponse
from app.services import vendor_analytics_service, vendor_service

router = APIRouter()


@router.get("/vendors/analytics/all")
async def get_all_vendors_analytics(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    analytics = await vendor_analytics_service.get_all_vendors_analytics(db=db)
    return {"vendors": analytics}


@router.get("/vendors/analytics/by-trade")
async def get_vendors_by_trade(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    trade_counts = await vendor_analytics_service.get_vendors_by_trade(db=db)
    return {"trade_counts": trade_counts}


@router.get("/vendors/expiring-insurances", response_model=list[VendorResponse])
async def get_expiring_insurances(
    days: int = Query(30, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    vendors = await vendor_analytics_service.get_expiring_insurances(db=db, days_threshold=days)
    return [VendorResponse.model_validate(vendor) for vendor in vendors]


@router.get("/vendors/{vendor_id}/analytics")
async def get_vendor_analytics(
    vendor_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    analytics = await vendor_analytics_service.get_vendor_analytics(db=db, vendor_id=vendor_id)
    if not analytics:
        raise HTTPException(status_code=404, detail="Vendor not found")
    return analytics
