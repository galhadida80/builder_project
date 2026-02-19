from datetime import timedelta
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.analytics import CustomKpiDefinition
from app.models.defect import Defect
from app.models.equipment import Equipment
from app.models.inspection import Inspection
from app.models.material import Material
from app.models.project import Project, ProjectMember
from app.models.rfi import RFI
from app.models.user import User
from app.utils import utcnow

ENTITY_MODEL_MAP = {
    "equipment": Equipment,
    "material": Material,
    "inspection": Inspection,
    "rfi": RFI,
    "defect": Defect,
}


async def compute_kpi_value(db: AsyncSession, kpi: CustomKpiDefinition) -> float:
    model = ENTITY_MODEL_MAP.get(kpi.entity_type)
    if model is None:
        return 0.0

    if kpi.calculation == "count":
        query = select(func.count(model.id))
    elif kpi.calculation in ("average", "sum") and kpi.field_name:
        column = getattr(model, kpi.field_name, None)
        if column is None:
            return 0.0
        agg_func = func.avg if kpi.calculation == "average" else func.sum
        query = select(agg_func(column))
    else:
        query = select(func.count(model.id))

    if kpi.project_id is not None and hasattr(model, "project_id"):
        query = query.where(model.project_id == kpi.project_id)

    if kpi.filter_config and isinstance(kpi.filter_config, dict):
        status_filter = kpi.filter_config.get("status")
        if status_filter and hasattr(model, "status"):
            query = query.where(model.status == status_filter)

    result = await db.execute(query)
    value = result.scalar()
    return float(value) if value is not None else 0.0


async def get_entity_trends(
    db: AsyncSession,
    entity_type: str,
    project_id: UUID | None,
    days: int = 30,
    user_id: UUID | None = None,
) -> list[dict]:
    model = ENTITY_MODEL_MAP.get(entity_type)
    if model is None:
        return []

    start_date = utcnow() - timedelta(days=days)
    date_trunc = func.date_trunc("day", model.created_at)

    query = (
        select(date_trunc.label("day"), func.count(model.id).label("count"))
        .where(model.created_at >= start_date)
        .group_by(date_trunc)
        .order_by(date_trunc)
    )

    if project_id is not None and hasattr(model, "project_id"):
        query = query.where(model.project_id == project_id)
    elif user_id is not None and hasattr(model, "project_id"):
        accessible_projects = select(ProjectMember.project_id).where(
            ProjectMember.user_id == user_id
        )
        query = query.where(model.project_id.in_(accessible_projects))

    result = await db.execute(query)
    rows = result.all()

    return [
        {"date": row.day.strftime("%Y-%m-%d"), "count": row.count}
        for row in rows
    ]


async def get_project_benchmarks(db: AsyncSession, user: User) -> list[dict]:
    membership_query = (
        select(ProjectMember.project_id)
        .where(ProjectMember.user_id == user.id)
    )
    if user.is_super_admin:
        project_query = select(Project.id, Project.name)
    else:
        project_query = (
            select(Project.id, Project.name)
            .where(Project.id.in_(membership_query))
        )

    projects_result = await db.execute(project_query)
    projects = projects_result.all()

    if not projects:
        return []

    project_ids = [p.id for p in projects]
    project_name_map = {p.id: p.name for p in projects}

    metrics_map = {pid: {} for pid in project_ids}
    for entity_type, model in ENTITY_MODEL_MAP.items():
        if not hasattr(model, "project_id"):
            continue
        result = await db.execute(
            select(model.project_id, func.count(model.id))
            .where(model.project_id.in_(project_ids))
            .group_by(model.project_id)
        )
        for row in result.all():
            metrics_map[row[0]][f"{entity_type}_count"] = float(row[1])

    benchmarks = []
    for pid in project_ids:
        metrics = {}
        for entity_type in ENTITY_MODEL_MAP:
            metrics[f"{entity_type}_count"] = metrics_map.get(pid, {}).get(f"{entity_type}_count", 0.0)
        benchmarks.append({
            "project_id": pid,
            "project_name": project_name_map[pid],
            "metrics": metrics,
        })

    return benchmarks
