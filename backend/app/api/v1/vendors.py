import csv
import io
from datetime import datetime
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_admin_user, get_current_user
from app.db.session import get_db
from app.models.user import User
from app.models.vendor import Vendor
from app.schemas.vendor import (
    BulkImportResponse,
    VendorCreate,
    VendorPerformanceCreate,
    VendorPerformanceResponse,
    VendorResponse,
    VendorUpdate,
)
from app.services import vendor_service

router = APIRouter()

CSV_HEADERS = [
    "company_name", "trade", "contact_email", "contact_phone",
    "address", "license_number", "insurance_expiry", "is_verified",
    "rating", "notes",
]


@router.get("/vendors", response_model=list[VendorResponse])
async def list_vendors(
    search: Optional[str] = Query(None),
    trade: Optional[str] = Query(None),
    min_rating: Optional[float] = Query(None, ge=0, le=5),
    verified_only: bool = Query(False),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    vendors = await vendor_service.list_vendors(
        db=db, search=search, trade=trade,
        min_rating=min_rating, verified_only=verified_only,
        include_performances=True,
    )
    return [VendorResponse.model_validate(vendor) for vendor in vendors]


@router.get("/vendors/export")
async def export_vendors_csv(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Vendor).order_by(Vendor.company_name, Vendor.trade))
    vendors = result.scalars().all()

    output = io.StringIO()
    output.write("\ufeff")
    writer = csv.DictWriter(output, fieldnames=CSV_HEADERS)
    writer.writeheader()
    for vendor in vendors:
        row_data = {}
        for header in CSV_HEADERS:
            value = getattr(vendor, header, "")
            if header == "insurance_expiry" and value:
                row_data[header] = value.isoformat() if isinstance(value, datetime) else ""
            elif header == "is_verified":
                row_data[header] = str(value).lower() if value is not None else "false"
            else:
                row_data[header] = value or ""
        writer.writerow(row_data)

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": "attachment; filename=vendors.csv"},
    )


@router.post("/vendors/import", response_model=BulkImportResponse)
async def import_vendors_csv(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    existing = await db.execute(
        select(Vendor.company_name, Vendor.contact_email, Vendor.contact_phone)
    )
    existing_set = set()
    for row in existing:
        key = (
            row.company_name.strip().lower(),
            (row.contact_email or "").strip().lower(),
            (row.contact_phone or "").strip(),
        )
        existing_set.add(key)

    content = await file.read()
    text = content.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))

    imported_count = 0
    skipped_count = 0
    errors: list[str] = []
    for line_num, row in enumerate(reader, start=2):
        company_name = (row.get("company_name") or "").strip()
        trade = (row.get("trade") or "").strip()
        if not company_name or not trade:
            continue

        contact_email = (row.get("contact_email") or "").strip() or None
        if contact_email and ("@" not in contact_email or len(contact_email) > 255):
            errors.append(f"Row {line_num}: invalid email '{contact_email}'")
            continue

        contact_phone = (row.get("contact_phone") or "").strip() or None
        if contact_phone and len(contact_phone) > 50:
            errors.append(f"Row {line_num}: phone too long")
            continue

        if len(company_name) > 255 or len(trade) > 100:
            errors.append(f"Row {line_num}: field too long")
            continue

        dedup_key = (company_name.lower(), (contact_email or "").lower(), contact_phone or "")
        if dedup_key in existing_set:
            skipped_count += 1
            continue

        insurance_expiry = None
        insurance_str = (row.get("insurance_expiry") or "").strip()
        if insurance_str:
            try:
                insurance_expiry = datetime.fromisoformat(insurance_str)
            except ValueError:
                errors.append(f"Row {line_num}: invalid insurance_expiry date format")
                continue

        is_verified_str = (row.get("is_verified") or "").strip().lower()
        is_verified = is_verified_str in ("true", "1", "yes")

        rating = None
        rating_str = (row.get("rating") or "").strip()
        if rating_str:
            try:
                rating = float(rating_str)
                if rating < 0 or rating > 5:
                    errors.append(f"Row {line_num}: rating must be between 0 and 5")
                    continue
            except ValueError:
                errors.append(f"Row {line_num}: invalid rating format")
                continue

        vendor = Vendor(
            company_name=company_name, trade=trade,
            contact_email=contact_email, contact_phone=contact_phone,
            address=(row.get("address") or "").strip()[:500] or None,
            license_number=(row.get("license_number") or "").strip()[:100] or None,
            insurance_expiry=insurance_expiry, is_verified=is_verified,
            rating=rating, notes=(row.get("notes") or "").strip() or None,
        )
        db.add(vendor)
        existing_set.add(dedup_key)
        imported_count += 1

    await db.commit()
    return BulkImportResponse(imported_count=imported_count, skipped_count=skipped_count, errors=errors[:20])


@router.post("/vendors", response_model=VendorResponse, status_code=201)
async def create_vendor(
    vendor_data: VendorCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    vendor = await vendor_service.create_vendor(db=db, vendor_data=vendor_data)
    return VendorResponse.model_validate(vendor)


@router.get("/vendors/{vendor_id}", response_model=VendorResponse)
async def get_vendor(
    vendor_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    vendor = await vendor_service.get_vendor(db=db, vendor_id=vendor_id, include_performances=True)
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    return VendorResponse.model_validate(vendor)


@router.put("/vendors/{vendor_id}", response_model=VendorResponse)
async def update_vendor(
    vendor_id: UUID,
    vendor_data: VendorUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    vendor = await vendor_service.update_vendor(db=db, vendor_id=vendor_id, vendor_data=vendor_data)
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    return VendorResponse.model_validate(vendor)


@router.delete("/vendors/{vendor_id}", status_code=204)
async def delete_vendor(
    vendor_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    success = await vendor_service.delete_vendor(db=db, vendor_id=vendor_id)
    if not success:
        raise HTTPException(status_code=404, detail="Vendor not found")


@router.post("/vendors/{vendor_id}/performances", response_model=VendorPerformanceResponse, status_code=201)
async def create_vendor_performance(
    vendor_id: UUID,
    performance_data: VendorPerformanceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    vendor = await vendor_service.get_vendor(db=db, vendor_id=vendor_id)
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    performance = await vendor_service.record_performance(
        db=db, vendor_id=vendor_id, project_id=performance_data.project_id,
        delivery_score=performance_data.delivery_score,
        quality_score=performance_data.quality_score,
        price_score=performance_data.price_score, notes=performance_data.notes,
    )
    return VendorPerformanceResponse.model_validate(performance)


@router.get("/vendors/{vendor_id}/performances", response_model=list[VendorPerformanceResponse])
async def list_vendor_performances(
    vendor_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    vendor = await vendor_service.get_vendor(db=db, vendor_id=vendor_id, include_performances=True)
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    return [VendorPerformanceResponse.model_validate(perf) for perf in vendor.performances]


@router.post("/vendors/{vendor_id}/recalculate-rating")
async def recalculate_vendor_rating(
    vendor_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    vendor = await vendor_service.get_vendor(db=db, vendor_id=vendor_id)
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    new_rating = await vendor_service.calculate_vendor_rating(db=db, vendor_id=vendor_id)
    return {"vendor_id": vendor_id, "new_rating": new_rating}
