from datetime import date, datetime
from uuid import UUID

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.security import get_current_user, verify_project_access
from app.db.session import get_db
from app.models.project import Project
from app.models.scheduled_report import ReportTemplate, ScheduledReport
from app.models.user import User
from app.schemas.scheduled_report import (
    ReportTemplateCreate,
    ReportTemplateResponse,
    ScheduledReportCreate,
    ScheduledReportResponse,
    ScheduledReportUpdate,
)
from app.services.audit_export_service import generate_audit_package
from app.services.inspection_report_service import generate_ai_weekly_report_pdf
from app.services.report_service import (
    generate_approval_report,
    generate_csv_export,
    generate_inspection_summary,
    generate_rfi_aging_report,
)

router = APIRouter()


class GenerateWeeklyReportRequest(BaseModel):
    date_from: date
    date_to: date
    language: str = "he"


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


@router.post("/projects/{project_id}/reports/generate-weekly")
async def generate_weekly_report(
    project_id: UUID,
    request: GenerateWeeklyReportRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await verify_project_access(project_id, current_user, db)

    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    pdf_bytes = await generate_ai_weekly_report_pdf(
        db, project_id, project, request.date_from, request.date_to, request.language
    )

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": 'attachment; filename="weekly-progress-report.pdf"'},
    )


@router.get("/projects/{project_id}/report-templates", response_model=list[ReportTemplateResponse])
async def list_report_templates(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await verify_project_access(project_id, current_user, db)
    result = await db.execute(
        select(ReportTemplate)
        .options(selectinload(ReportTemplate.created_by))
        .where(ReportTemplate.project_id == project_id)
        .order_by(ReportTemplate.created_at.desc())
    )
    return result.scalars().all()


@router.post("/projects/{project_id}/report-templates", response_model=ReportTemplateResponse, status_code=201)
async def create_report_template(
    project_id: UUID,
    data: ReportTemplateCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await verify_project_access(project_id, current_user, db)
    template = ReportTemplate(
        project_id=project_id,
        name=data.name,
        description=data.description,
        report_type=data.report_type,
        config=data.config,
        created_by_id=current_user.id,
    )
    db.add(template)
    await db.commit()
    await db.refresh(template, ["created_by"])
    return template


@router.delete("/report-templates/{template_id}", status_code=204)
async def delete_report_template(
    template_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(ReportTemplate).where(ReportTemplate.id == template_id))
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    await db.delete(template)
    await db.commit()
    return None


@router.get("/projects/{project_id}/scheduled-reports", response_model=list[ScheduledReportResponse])
async def list_scheduled_reports(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await verify_project_access(project_id, current_user, db)
    result = await db.execute(
        select(ScheduledReport)
        .options(selectinload(ScheduledReport.created_by))
        .where(ScheduledReport.project_id == project_id)
        .order_by(ScheduledReport.created_at.desc())
    )
    return result.scalars().all()


@router.post("/projects/{project_id}/scheduled-reports", response_model=ScheduledReportResponse, status_code=201)
async def create_scheduled_report(
    project_id: UUID,
    data: ScheduledReportCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await verify_project_access(project_id, current_user, db)
    report = ScheduledReport(
        project_id=project_id,
        template_id=data.template_id,
        name=data.name,
        report_type=data.report_type,
        schedule_cron=data.schedule_cron,
        recipients=data.recipients,
        config=data.config,
        created_by_id=current_user.id,
    )
    db.add(report)
    await db.commit()
    await db.refresh(report, ["created_by"])
    return report


@router.patch("/scheduled-reports/{report_id}", response_model=ScheduledReportResponse)
async def update_scheduled_report(
    report_id: UUID,
    data: ScheduledReportUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(ScheduledReport)
        .options(selectinload(ScheduledReport.created_by))
        .where(ScheduledReport.id == report_id)
    )
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Scheduled report not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(report, key, value)
    await db.commit()
    await db.refresh(report, ["created_by"])
    return report


@router.delete("/scheduled-reports/{report_id}", status_code=204)
async def delete_scheduled_report(
    report_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(ScheduledReport).where(ScheduledReport.id == report_id))
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Scheduled report not found")
    await db.delete(report)
    await db.commit()
    return None
