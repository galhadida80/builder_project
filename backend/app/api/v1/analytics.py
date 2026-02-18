from datetime import datetime, timedelta
from uuid import UUID

from fastapi import APIRouter, Depends, Path, Query
from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_user
from app.db.session import get_db
from app.models.approval import ApprovalRequest
from app.models.area import ConstructionArea
from app.models.audit import AuditLog
from app.models.equipment import ApprovalStatus, Equipment
from app.models.equipment_template import EquipmentApprovalSubmission
from app.models.inspection import Finding, Inspection, InspectionStatus
from app.models.material import Material
from app.models.material_template import MaterialApprovalSubmission
from app.models.meeting import Meeting
from app.models.project import Project, ProjectMember, ProjectStatus
from app.models.rfi import RFI, RFIStatus
from app.models.user import User
from app.schemas.analytics import (
    DashboardStatsResponse,
    DistributionItem,
    DistributionsResponse,
    FloorProgress,
    MetricsResponse,
    ProjectTrendsResponse,
    TrendDataPoint,
    WeeklyActivityPoint,
)

router = APIRouter()


@router.get("/metrics", response_model=MetricsResponse)
async def get_analytics_metrics(
    start_date: str = Query(None, description="Start date in ISO format (YYYY-MM-DD)"),
    end_date: str = Query(None, description="End date in ISO format (YYYY-MM-DD)"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get overall analytics metrics (KPIs) for the dashboard"""

    # Parse dates if provided
    date_filter_start = None
    date_filter_end = None
    if start_date:
        date_filter_start = datetime.fromisoformat(start_date)
    if end_date:
        date_filter_end = datetime.fromisoformat(end_date)

    accessible_projects = select(ProjectMember.project_id).where(
        ProjectMember.user_id == current_user.id
    ).scalar_subquery()

    # Get project counts
    project_query = select(
        func.count().label('total'),
        func.sum(case((Project.status == ProjectStatus.ACTIVE.value, 1), else_=0)).label('active')
    ).where(Project.id.in_(accessible_projects))
    if date_filter_start:
        project_query = project_query.where(Project.created_at >= date_filter_start)
    if date_filter_end:
        project_query = project_query.where(Project.created_at <= date_filter_end)

    project_result = await db.execute(project_query)
    project_counts = project_result.first()

    # Get inspection counts
    inspection_query = select(
        func.count().label('total'),
        func.sum(case((Inspection.status == InspectionStatus.PENDING.value, 1), else_=0)).label('pending'),
        func.sum(case((Inspection.status == InspectionStatus.COMPLETED.value, 1), else_=0)).label('completed')
    ).where(Inspection.project_id.in_(accessible_projects))
    if date_filter_start:
        inspection_query = inspection_query.where(Inspection.created_at >= date_filter_start)
    if date_filter_end:
        inspection_query = inspection_query.where(Inspection.created_at <= date_filter_end)

    inspection_result = await db.execute(inspection_query)
    inspection_counts = inspection_result.first()

    # Get equipment counts
    equipment_query = select(
        func.count().label('total'),
        func.sum(case((Equipment.status == ApprovalStatus.APPROVED.value, 1), else_=0)).label('approved')
    ).where(Equipment.project_id.in_(accessible_projects))
    if date_filter_start:
        equipment_query = equipment_query.where(Equipment.created_at >= date_filter_start)
    if date_filter_end:
        equipment_query = equipment_query.where(Equipment.created_at <= date_filter_end)

    equipment_result = await db.execute(equipment_query)
    equipment_counts = equipment_result.first()

    # Get material counts
    material_query = select(
        func.count().label('total'),
        func.sum(case((Material.status == ApprovalStatus.APPROVED.value, 1), else_=0)).label('approved')
    ).where(Material.project_id.in_(accessible_projects))
    if date_filter_start:
        material_query = material_query.where(Material.created_at >= date_filter_start)
    if date_filter_end:
        material_query = material_query.where(Material.created_at <= date_filter_end)

    material_result = await db.execute(material_query)
    material_counts = material_result.first()

    # Get meeting counts
    meeting_query = select(func.count()).where(Meeting.project_id.in_(accessible_projects))
    if date_filter_start:
        meeting_query = meeting_query.where(Meeting.created_at >= date_filter_start)
    if date_filter_end:
        meeting_query = meeting_query.where(Meeting.created_at <= date_filter_end)

    meeting_result = await db.execute(meeting_query)
    total_meetings = meeting_result.scalar() or 0

    # Get RFI counts
    rfi_query = select(
        func.count().label('total'),
        func.sum(case((RFI.status == RFIStatus.OPEN.value, 1), else_=0)).label('open'),
        func.sum(case((RFI.status == RFIStatus.CLOSED.value, 1), else_=0)).label('closed')
    ).where(RFI.project_id.in_(accessible_projects))
    if date_filter_start:
        rfi_query = rfi_query.where(RFI.created_at >= date_filter_start)
    if date_filter_end:
        rfi_query = rfi_query.where(RFI.created_at <= date_filter_end)

    rfi_result = await db.execute(rfi_query)
    rfi_counts = rfi_result.first()

    # Get approval request counts
    approval_query = select(
        func.count().label('total'),
        func.sum(case((ApprovalRequest.current_status == "pending", 1), else_=0)).label('pending'),
        func.sum(case((ApprovalRequest.current_status == "approved", 1), else_=0)).label('approved')
    ).where(ApprovalRequest.project_id.in_(accessible_projects))
    if date_filter_start:
        approval_query = approval_query.where(ApprovalRequest.created_at >= date_filter_start)
    if date_filter_end:
        approval_query = approval_query.where(ApprovalRequest.created_at <= date_filter_end)

    approval_result = await db.execute(approval_query)
    approval_counts = approval_result.first()

    # Calculate approval rate (equipment + materials)
    total_approval_items = (equipment_counts.total or 0) + (material_counts.total or 0)
    total_approved_items = (equipment_counts.approved or 0) + (material_counts.approved or 0)
    approval_rate = (total_approved_items / total_approval_items * 100) if total_approval_items > 0 else 0.0

    return MetricsResponse(
        total_projects=project_counts.total or 0,
        active_projects=project_counts.active or 0,
        total_inspections=inspection_counts.total or 0,
        pending_inspections=inspection_counts.pending or 0,
        completed_inspections=inspection_counts.completed or 0,
        total_equipment=equipment_counts.total or 0,
        approved_equipment=equipment_counts.approved or 0,
        total_materials=material_counts.total or 0,
        approved_materials=material_counts.approved or 0,
        total_meetings=total_meetings,
        approval_rate=round(approval_rate, 2),
        total_rfis=rfi_counts.total or 0,
        open_rfis=rfi_counts.open or 0,
        closed_rfis=rfi_counts.closed or 0,
        total_approvals=approval_counts.total or 0,
        pending_approvals=approval_counts.pending or 0,
        approved_approvals=approval_counts.approved or 0,
    )


@router.get("/project-trends", response_model=ProjectTrendsResponse)
async def get_project_trends(
    start_date: str = Query(None, description="Start date in ISO format (YYYY-MM-DD)"),
    end_date: str = Query(None, description="End date in ISO format (YYYY-MM-DD)"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get time series data for project trends (line/bar chart)"""

    # Default to last 30 days if no dates provided
    if not end_date:
        end_datetime = datetime.utcnow()
    else:
        end_datetime = datetime.fromisoformat(end_date)

    if not start_date:
        start_datetime = end_datetime - timedelta(days=30)
    else:
        start_datetime = datetime.fromisoformat(start_date)

    accessible_projects = select(ProjectMember.project_id).where(
        ProjectMember.user_id == current_user.id
    ).scalar_subquery()

    # Generate daily data points
    data_points = []
    current_date = start_datetime

    while current_date <= end_datetime:
        next_date = current_date + timedelta(days=1)

        # Count inspections created on this day
        inspection_count = await db.execute(
            select(func.count())
            .select_from(Inspection)
            .where(Inspection.project_id.in_(accessible_projects))
            .where(Inspection.created_at >= current_date)
            .where(Inspection.created_at < next_date)
        )
        inspections = inspection_count.scalar() or 0

        # Count equipment submissions on this day
        equipment_count = await db.execute(
            select(func.count())
            .select_from(Equipment)
            .where(Equipment.project_id.in_(accessible_projects))
            .where(Equipment.created_at >= current_date)
            .where(Equipment.created_at < next_date)
        )
        equipment_submissions = equipment_count.scalar() or 0

        # Count material submissions on this day
        material_count = await db.execute(
            select(func.count())
            .select_from(Material)
            .where(Material.project_id.in_(accessible_projects))
            .where(Material.created_at >= current_date)
            .where(Material.created_at < next_date)
        )
        material_submissions = material_count.scalar() or 0

        # Count RFIs created on this day
        rfi_created_count = await db.execute(
            select(func.count())
            .select_from(RFI)
            .where(RFI.project_id.in_(accessible_projects))
            .where(RFI.created_at >= current_date)
            .where(RFI.created_at < next_date)
        )
        rfi_created = rfi_created_count.scalar() or 0

        # Count RFIs closed on this day
        rfi_closed_count = await db.execute(
            select(func.count())
            .select_from(RFI)
            .where(RFI.project_id.in_(accessible_projects))
            .where(RFI.status == RFIStatus.CLOSED.value)
            .where(RFI.updated_at >= current_date)
            .where(RFI.updated_at < next_date)
        )
        rfi_closed = rfi_closed_count.scalar() or 0

        # Count approval submissions submitted on this day (equipment + material)
        equip_sub_count = await db.execute(
            select(func.count())
            .select_from(EquipmentApprovalSubmission)
            .where(EquipmentApprovalSubmission.project_id.in_(accessible_projects))
            .where(EquipmentApprovalSubmission.submitted_at >= current_date)
            .where(EquipmentApprovalSubmission.submitted_at < next_date)
        )
        mat_sub_count = await db.execute(
            select(func.count())
            .select_from(MaterialApprovalSubmission)
            .where(MaterialApprovalSubmission.project_id.in_(accessible_projects))
            .where(MaterialApprovalSubmission.submitted_at >= current_date)
            .where(MaterialApprovalSubmission.submitted_at < next_date)
        )
        approvals_submitted = (equip_sub_count.scalar() or 0) + (mat_sub_count.scalar() or 0)

        # Count approval submissions decided on this day
        decided_statuses = ("approved", "rejected", "conditionally_approved")
        equip_decided_count = await db.execute(
            select(func.count())
            .select_from(EquipmentApprovalSubmission)
            .where(EquipmentApprovalSubmission.project_id.in_(accessible_projects))
            .where(EquipmentApprovalSubmission.status.in_(decided_statuses))
            .where(EquipmentApprovalSubmission.updated_at >= current_date)
            .where(EquipmentApprovalSubmission.updated_at < next_date)
        )
        mat_decided_count = await db.execute(
            select(func.count())
            .select_from(MaterialApprovalSubmission)
            .where(MaterialApprovalSubmission.project_id.in_(accessible_projects))
            .where(MaterialApprovalSubmission.status.in_(decided_statuses))
            .where(MaterialApprovalSubmission.updated_at >= current_date)
            .where(MaterialApprovalSubmission.updated_at < next_date)
        )
        approvals_decided = (equip_decided_count.scalar() or 0) + (mat_decided_count.scalar() or 0)

        data_points.append(TrendDataPoint(
            date=current_date.strftime('%Y-%m-%d'),
            inspections=inspections,
            equipment_submissions=equipment_submissions,
            material_submissions=material_submissions,
            rfi_created=rfi_created,
            rfi_closed=rfi_closed,
            approvals_submitted=approvals_submitted,
            approvals_decided=approvals_decided,
        ))

        current_date = next_date

    return ProjectTrendsResponse(data_points=data_points)


@router.get("/distributions", response_model=DistributionsResponse)
async def get_distributions(
    start_date: str = Query(None, description="Start date in ISO format (YYYY-MM-DD)"),
    end_date: str = Query(None, description="End date in ISO format (YYYY-MM-DD)"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get distribution data for pie/donut charts"""

    # Parse dates if provided
    date_filter_start = None
    date_filter_end = None
    if start_date:
        date_filter_start = datetime.fromisoformat(start_date)
    if end_date:
        date_filter_end = datetime.fromisoformat(end_date)

    accessible_projects = select(ProjectMember.project_id).where(
        ProjectMember.user_id == current_user.id
    ).scalar_subquery()

    # Get inspection status distribution
    inspection_query = select(Inspection.status, func.count(Inspection.id).label('count')).where(
        Inspection.project_id.in_(accessible_projects)
    )
    if date_filter_start:
        inspection_query = inspection_query.where(Inspection.created_at >= date_filter_start)
    if date_filter_end:
        inspection_query = inspection_query.where(Inspection.created_at <= date_filter_end)
    inspection_query = inspection_query.group_by(Inspection.status)

    inspection_result = await db.execute(inspection_query)
    inspection_distribution = [
        DistributionItem(label=row.status, value=row.count)
        for row in inspection_result.all()
    ]

    # Get equipment status distribution
    equipment_query = select(Equipment.status, func.count(Equipment.id).label('count')).where(
        Equipment.project_id.in_(accessible_projects)
    )
    if date_filter_start:
        equipment_query = equipment_query.where(Equipment.created_at >= date_filter_start)
    if date_filter_end:
        equipment_query = equipment_query.where(Equipment.created_at <= date_filter_end)
    equipment_query = equipment_query.group_by(Equipment.status)

    equipment_result = await db.execute(equipment_query)
    equipment_distribution = [
        DistributionItem(label=row.status, value=row.count)
        for row in equipment_result.all()
    ]

    # Get material status distribution
    material_query = select(Material.status, func.count(Material.id).label('count')).where(
        Material.project_id.in_(accessible_projects)
    )
    if date_filter_start:
        material_query = material_query.where(Material.created_at >= date_filter_start)
    if date_filter_end:
        material_query = material_query.where(Material.created_at <= date_filter_end)
    material_query = material_query.group_by(Material.status)

    material_result = await db.execute(material_query)
    material_distribution = [
        DistributionItem(label=row.status, value=row.count)
        for row in material_result.all()
    ]

    # Get project status distribution
    project_query = select(Project.status, func.count(Project.id).label('count')).where(
        Project.id.in_(accessible_projects)
    )
    if date_filter_start:
        project_query = project_query.where(Project.created_at >= date_filter_start)
    if date_filter_end:
        project_query = project_query.where(Project.created_at <= date_filter_end)
    project_query = project_query.group_by(Project.status)

    project_result = await db.execute(project_query)
    project_distribution = [
        DistributionItem(label=row.status, value=row.count)
        for row in project_result.all()
    ]

    # Get RFI status distribution
    rfi_query = select(RFI.status, func.count(RFI.id).label('count')).where(
        RFI.project_id.in_(accessible_projects)
    )
    if date_filter_start:
        rfi_query = rfi_query.where(RFI.created_at >= date_filter_start)
    if date_filter_end:
        rfi_query = rfi_query.where(RFI.created_at <= date_filter_end)
    rfi_query = rfi_query.group_by(RFI.status)

    rfi_result = await db.execute(rfi_query)
    rfi_distribution = [
        DistributionItem(label=row.status, value=row.count)
        for row in rfi_result.all()
    ]

    # Get approval status distribution
    approval_query = select(
        ApprovalRequest.current_status, func.count(ApprovalRequest.id).label('count')
    ).where(
        ApprovalRequest.project_id.in_(accessible_projects)
    )
    if date_filter_start:
        approval_query = approval_query.where(ApprovalRequest.created_at >= date_filter_start)
    if date_filter_end:
        approval_query = approval_query.where(ApprovalRequest.created_at <= date_filter_end)
    approval_query = approval_query.group_by(ApprovalRequest.current_status)

    approval_result = await db.execute(approval_query)
    approval_distribution = [
        DistributionItem(label=row.current_status, value=row.count)
        for row in approval_result.all()
    ]

    return DistributionsResponse(
        inspection_status=inspection_distribution,
        equipment_status=equipment_distribution,
        material_status=material_distribution,
        project_status=project_distribution,
        rfi_status=rfi_distribution,
        approval_status=approval_distribution,
    )


@router.get("/projects/{project_id}/dashboard-stats", response_model=DashboardStatsResponse)
async def get_dashboard_stats(
    project_id: UUID = Path(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    membership = await db.execute(
        select(ProjectMember).where(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == current_user.id,
        )
    )
    if not membership.scalar_one_or_none() and not current_user.is_super_admin:
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Not a project member")

    equip_result = await db.execute(
        select(Equipment.status, func.count(Equipment.id).label("count"))
        .where(Equipment.project_id == project_id)
        .group_by(Equipment.status)
    )
    equipment_distribution = [
        DistributionItem(label=row.status, value=row.count)
        for row in equip_result.all()
    ]

    mat_result = await db.execute(
        select(Material.status, func.count(Material.id).label("count"))
        .where(Material.project_id == project_id)
        .group_by(Material.status)
    )
    material_distribution = [
        DistributionItem(label=row.status, value=row.count)
        for row in mat_result.all()
    ]

    rfi_result = await db.execute(
        select(RFI.status, func.count(RFI.id).label("count"))
        .where(RFI.project_id == project_id)
        .group_by(RFI.status)
    )
    rfi_distribution = [
        DistributionItem(label=row.status, value=row.count)
        for row in rfi_result.all()
    ]

    approval_result = await db.execute(
        select(ApprovalRequest.current_status, func.count(ApprovalRequest.id).label("count"))
        .where(ApprovalRequest.project_id == project_id)
        .group_by(ApprovalRequest.current_status)
    )
    approval_distribution = [
        DistributionItem(label=row.current_status, value=row.count)
        for row in approval_result.all()
    ]

    findings_result = await db.execute(
        select(Finding.severity, func.count(Finding.id).label("count"))
        .join(Inspection, Finding.inspection_id == Inspection.id)
        .where(Inspection.project_id == project_id)
        .group_by(Finding.severity)
    )
    findings_severity = [
        DistributionItem(label=row.severity, value=row.count)
        for row in findings_result.all()
    ]

    today = datetime.utcnow().date()
    start_date = today - timedelta(days=13)
    weekly_activity = []
    for day_offset in range(14):
        day = start_date + timedelta(days=day_offset)
        day_start = datetime.combine(day, datetime.min.time())
        day_end = datetime.combine(day + timedelta(days=1), datetime.min.time())

        counts = {}
        for entity_type in ["equipment", "material", "inspection", "rfi"]:
            result = await db.execute(
                select(func.count())
                .select_from(AuditLog)
                .where(
                    AuditLog.project_id == project_id,
                    AuditLog.entity_type == entity_type,
                    AuditLog.created_at >= day_start,
                    AuditLog.created_at < day_end,
                )
            )
            counts[entity_type] = result.scalar() or 0

        weekly_activity.append(WeeklyActivityPoint(
            date=day.isoformat(),
            equipment=counts["equipment"],
            materials=counts["material"],
            inspections=counts["inspection"],
            rfis=counts["rfi"],
        ))

    area_result = await db.execute(
        select(
            ConstructionArea.floor_number,
            func.count(ConstructionArea.id).label("area_count"),
            func.avg(ConstructionArea.current_progress).label("avg_progress"),
        )
        .where(
            ConstructionArea.project_id == project_id,
            ConstructionArea.floor_number.isnot(None),
        )
        .group_by(ConstructionArea.floor_number)
        .order_by(ConstructionArea.floor_number)
    )
    area_progress_by_floor = [
        FloorProgress(
            floor=row.floor_number,
            area_count=row.area_count,
            avg_progress=round(float(row.avg_progress or 0), 1),
        )
        for row in area_result.all()
    ]

    overall_result = await db.execute(
        select(func.avg(ConstructionArea.current_progress))
        .where(ConstructionArea.project_id == project_id)
    )
    overall_progress = round(float(overall_result.scalar() or 0), 1)

    return DashboardStatsResponse(
        equipment_distribution=equipment_distribution,
        material_distribution=material_distribution,
        rfi_distribution=rfi_distribution,
        approval_distribution=approval_distribution,
        findings_severity=findings_severity,
        weekly_activity=weekly_activity,
        area_progress_by_floor=area_progress_by_floor,
        overall_progress=overall_progress,
    )
