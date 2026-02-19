from datetime import datetime, timedelta
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Path, Query
from sqlalchemy import Date, case, cast, func, select
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
from app.utils import utcnow

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
        end_datetime = utcnow()
    else:
        end_datetime = datetime.fromisoformat(end_date)

    if not start_date:
        start_datetime = end_datetime - timedelta(days=30)
    else:
        start_datetime = datetime.fromisoformat(start_date)

    accessible_projects = select(ProjectMember.project_id).where(
        ProjectMember.user_id == current_user.id
    ).scalar_subquery()

    def build_daily_count(model, date_col, extra_filters=None):
        q = (
            select(cast(date_col, Date).label("day"), func.count().label("cnt"))
            .where(model.project_id.in_(accessible_projects))
            .where(date_col >= start_datetime)
            .where(date_col < end_datetime + timedelta(days=1))
        )
        if extra_filters:
            for f in extra_filters:
                q = q.where(f)
        return q.group_by(cast(date_col, Date))

    inspection_q = build_daily_count(Inspection, Inspection.created_at)
    equipment_q = build_daily_count(Equipment, Equipment.created_at)
    material_q = build_daily_count(Material, Material.created_at)
    rfi_created_q = build_daily_count(RFI, RFI.created_at)
    rfi_closed_q = build_daily_count(RFI, RFI.updated_at, [RFI.status == RFIStatus.CLOSED.value])

    equip_sub_q = build_daily_count(EquipmentApprovalSubmission, EquipmentApprovalSubmission.submitted_at)
    mat_sub_q = build_daily_count(MaterialApprovalSubmission, MaterialApprovalSubmission.submitted_at)

    decided_statuses = ("approved", "rejected", "conditionally_approved")
    equip_dec_q = build_daily_count(
        EquipmentApprovalSubmission, EquipmentApprovalSubmission.updated_at,
        [EquipmentApprovalSubmission.status.in_(decided_statuses)],
    )
    mat_dec_q = build_daily_count(
        MaterialApprovalSubmission, MaterialApprovalSubmission.updated_at,
        [MaterialApprovalSubmission.status.in_(decided_statuses)],
    )

    results = {}
    for key, q in [
        ("inspections", inspection_q), ("equipment", equipment_q),
        ("materials", material_q), ("rfi_created", rfi_created_q),
        ("rfi_closed", rfi_closed_q), ("equip_sub", equip_sub_q),
        ("mat_sub", mat_sub_q), ("equip_dec", equip_dec_q), ("mat_dec", mat_dec_q),
    ]:
        res = await db.execute(q)
        results[key] = {str(row.day): row.cnt for row in res.all()}

    data_points = []
    current_date = start_datetime
    while current_date <= end_datetime:
        day_str = current_date.strftime('%Y-%m-%d')
        data_points.append(TrendDataPoint(
            date=day_str,
            inspections=results["inspections"].get(day_str, 0),
            equipment_submissions=results["equipment"].get(day_str, 0),
            material_submissions=results["materials"].get(day_str, 0),
            rfi_created=results["rfi_created"].get(day_str, 0),
            rfi_closed=results["rfi_closed"].get(day_str, 0),
            approvals_submitted=results["equip_sub"].get(day_str, 0) + results["mat_sub"].get(day_str, 0),
            approvals_decided=results["equip_dec"].get(day_str, 0) + results["mat_dec"].get(day_str, 0),
        ))
        current_date += timedelta(days=1)

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

    today = utcnow().date()
    start_date = today - timedelta(days=13)
    day_start = datetime.combine(start_date, datetime.min.time())
    day_end = datetime.combine(today + timedelta(days=1), datetime.min.time())

    activity_result = await db.execute(
        select(
            cast(AuditLog.created_at, Date).label("day"),
            AuditLog.entity_type,
            func.count().label("cnt"),
        )
        .where(
            AuditLog.project_id == project_id,
            AuditLog.entity_type.in_(["equipment", "material", "inspection", "rfi"]),
            AuditLog.created_at >= day_start,
            AuditLog.created_at < day_end,
        )
        .group_by(cast(AuditLog.created_at, Date), AuditLog.entity_type)
    )
    activity_map = {}
    for row in activity_result.all():
        key = (str(row.day), row.entity_type)
        activity_map[key] = row.cnt

    weekly_activity = []
    for day_offset in range(14):
        day = start_date + timedelta(days=day_offset)
        day_str = day.isoformat()
        weekly_activity.append(WeeklyActivityPoint(
            date=day_str,
            equipment=activity_map.get((day_str, "equipment"), 0),
            materials=activity_map.get((day_str, "material"), 0),
            inspections=activity_map.get((day_str, "inspection"), 0),
            rfis=activity_map.get((day_str, "rfi"), 0),
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
