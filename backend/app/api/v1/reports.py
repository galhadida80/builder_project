from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_user, verify_project_access
from app.db.session import get_db
from app.models.user import User
from app.services.audit_export_service import generate_audit_package
from app.services.report_service import (
    generate_approval_report,
    generate_csv_export,
    generate_inspection_summary,
    generate_rfi_aging_report,
)

router = APIRouter()


@router.get("/projects/{project_id}/reports/inspection-summary")
async def get_inspection_summary(
    project_id: UUID,
    date_from: datetime = Query(...),
    date_to: datetime = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await verify_project_access(project_id, current_user, db)
    return await generate_inspection_summary(db, project_id, date_from, date_to)


@router.get("/projects/{project_id}/reports/approval-status")
async def get_approval_status(
    project_id: UUID,
    date_from: datetime = Query(...),
    date_to: datetime = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await verify_project_access(project_id, current_user, db)
    return await generate_approval_report(db, project_id, date_from, date_to)


@router.get("/projects/{project_id}/reports/rfi-aging")
async def get_rfi_aging(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await verify_project_access(project_id, current_user, db)
    return await generate_rfi_aging_report(db, project_id)


@router.get("/projects/{project_id}/reports/export")
async def export_report(
    project_id: UUID,
    report_type: str = Query(..., pattern="^(inspection-summary|approval-status|rfi-aging)$"),
    format: str = Query("csv", pattern="^csv$"),
    date_from: datetime = Query(None),
    date_to: datetime = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await verify_project_access(project_id, current_user, db)

    if report_type == "rfi-aging":
        report = await generate_rfi_aging_report(db, project_id)
        csv_data = generate_csv_export(report.get("items", []))
    elif report_type == "inspection-summary":
        if not date_from or not date_to:
            raise HTTPException(status_code=400, detail="date_from and date_to are required")
        report = await generate_inspection_summary(db, project_id, date_from, date_to)
        csv_data = generate_csv_export(report.get("findings", []))
    elif report_type == "approval-status":
        if not date_from or not date_to:
            raise HTTPException(status_code=400, detail="date_from and date_to are required")
        report = await generate_approval_report(db, project_id, date_from, date_to)
        items = report.get("equipment_items", []) + report.get("material_items", [])
        csv_data = generate_csv_export(items)
    else:
        raise HTTPException(status_code=400, detail="Invalid report type")

    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{report_type}-report.csv"'},
    )


@router.get("/projects/{project_id}/reports/compliance-audit")
async def get_compliance_audit(
    project_id: UUID,
    date_from: datetime = Query(...),
    date_to: datetime = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await verify_project_access(project_id, current_user, db)
    return await generate_audit_package(db, project_id, date_from, date_to)


@router.get("/projects/{project_id}/reports/compliance-audit/export")
async def export_compliance_audit(
    project_id: UUID,
    date_from: datetime = Query(...),
    date_to: datetime = Query(...),
    format: str = Query("csv", pattern="^csv$"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await verify_project_access(project_id, current_user, db)
    package = await generate_audit_package(db, project_id, date_from, date_to)

    audit_logs = package.get("audit_logs", {}).get("data", [])
    csv_data = generate_csv_export(audit_logs)

    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="compliance-audit-report.csv"'},
    )
