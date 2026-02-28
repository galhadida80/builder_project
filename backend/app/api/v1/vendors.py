from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_admin_user, get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.vendor import (
    VendorCreate,
    VendorPerformanceCreate,
    VendorPerformanceResponse,
    VendorResponse,
    VendorUpdate,
)
from app.services import vendor_service

router = APIRouter()


@router.get("/vendors", response_model=list[VendorResponse])
async def list_vendors(
    search: Optional[str] = Query(None, description="Search by company name, email, or phone"),
    trade: Optional[str] = Query(None, description="Filter by trade"),
    min_rating: Optional[float] = Query(None, ge=0, le=10, description="Minimum rating"),
    verified_only: bool = Query(False, description="Show only verified vendors"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all vendors with optional filters"""
    vendors = await vendor_service.list_vendors(
        db=db,
        search=search,
        trade=trade,
        min_rating=min_rating,
        verified_only=verified_only,
        include_performances=True
    )
    return [VendorResponse.model_validate(vendor) for vendor in vendors]


@router.post("/vendors", response_model=VendorResponse, status_code=201)
async def create_vendor(
    vendor_data: VendorCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Create a new vendor"""
    vendor = await vendor_service.create_vendor(db=db, vendor_data=vendor_data)
    return VendorResponse.model_validate(vendor)


@router.get("/vendors/{vendor_id}", response_model=VendorResponse)
async def get_vendor(
    vendor_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a vendor by ID"""
    vendor = await vendor_service.get_vendor(db=db, vendor_id=vendor_id, include_performances=True)
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    return VendorResponse.model_validate(vendor)


@router.patch("/vendors/{vendor_id}", response_model=VendorResponse)
async def update_vendor(
    vendor_id: UUID,
    vendor_data: VendorUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Update a vendor"""
    vendor = await vendor_service.update_vendor(db=db, vendor_id=vendor_id, vendor_data=vendor_data)
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    return VendorResponse.model_validate(vendor)


@router.delete("/vendors/{vendor_id}", status_code=204)
async def delete_vendor(
    vendor_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Delete a vendor"""
    success = await vendor_service.delete_vendor(db=db, vendor_id=vendor_id)
    if not success:
        raise HTTPException(status_code=404, detail="Vendor not found")


@router.get("/vendors/{vendor_id}/analytics")
async def get_vendor_analytics(
    vendor_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get analytics for a specific vendor"""
    analytics = await vendor_service.get_vendor_analytics(db=db, vendor_id=vendor_id)
    if not analytics:
        raise HTTPException(status_code=404, detail="Vendor not found")
    return analytics


@router.get("/vendors/analytics/all")
async def get_all_vendors_analytics(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get analytics for all vendors"""
    analytics = await vendor_service.get_all_vendors_analytics(db=db)
    return {"vendors": analytics}


@router.get("/vendors/analytics/by-trade")
async def get_vendors_by_trade(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get vendor count grouped by trade"""
    trade_counts = await vendor_service.get_vendors_by_trade(db=db)
    return {"trade_counts": trade_counts}


@router.get("/vendors/expiring-insurances", response_model=list[VendorResponse])
async def get_expiring_insurances(
    days: int = Query(30, ge=1, le=365, description="Days threshold for expiring insurance"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get vendors with insurance expiring within specified days"""
    vendors = await vendor_service.get_expiring_insurances(db=db, days_threshold=days)
    return [VendorResponse.model_validate(vendor) for vendor in vendors]


@router.post("/vendors/{vendor_id}/performances", response_model=VendorPerformanceResponse, status_code=201)
async def create_vendor_performance(
    vendor_id: UUID,
    performance_data: VendorPerformanceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Record vendor performance for a project"""
    # Verify vendor exists
    vendor = await vendor_service.get_vendor(db=db, vendor_id=vendor_id)
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")

    performance = await vendor_service.record_performance(
        db=db,
        vendor_id=vendor_id,
        project_id=performance_data.project_id,
        delivery_score=performance_data.delivery_score,
        quality_score=performance_data.quality_score,
        price_score=performance_data.price_score,
        notes=performance_data.notes
    )
    return VendorPerformanceResponse.model_validate(performance)


@router.get("/vendors/{vendor_id}/performances", response_model=list[VendorPerformanceResponse])
async def list_vendor_performances(
    vendor_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all performance records for a vendor"""
    vendor = await vendor_service.get_vendor(db=db, vendor_id=vendor_id, include_performances=True)
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    return [VendorPerformanceResponse.model_validate(perf) for perf in vendor.performances]


@router.post("/vendors/{vendor_id}/recalculate-rating")
async def recalculate_vendor_rating(
    vendor_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Recalculate vendor's overall rating based on performances"""
    vendor = await vendor_service.get_vendor(db=db, vendor_id=vendor_id)
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")

    new_rating = await vendor_service.calculate_vendor_rating(db=db, vendor_id=vendor_id)
    return {"vendor_id": vendor_id, "new_rating": new_rating}
