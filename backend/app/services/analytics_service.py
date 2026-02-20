from datetime import date, timedelta
from uuid import UUID

from sqlalchemy import func, select, text
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.analytics import CustomKpiDefinition, KpiSnapshot
from app.models.area import ConstructionArea
from app.models.budget import BudgetLineItem, CostEntry
from app.models.checklist import ChecklistInstance
from app.models.defect import Defect
from app.models.equipment import Equipment
from app.models.inspection import Inspection
from app.models.material import Material
from app.models.project import Project, ProjectMember
from app.models.rfi import RFI
from app.models.task import Task
from app.models.user import User
from app.utils import utcnow

ENTITY_MODEL_MAP = {
    "equipment": Equipment,
    "material": Material,
    "inspection": Inspection,
    "rfi": RFI,
    "defect": Defect,
    "task": Task,
    "budget": BudgetLineItem,
    "checklist": ChecklistInstance,
    "area": ConstructionArea,
}


async def compute_kpi_value(db: AsyncSession, kpi: CustomKpiDefinition) -> float:
    entity_type = kpi.entity_type

    if entity_type == "budget" and kpi.calculation in ("sum", "average"):
        return await compute_budget_kpi(db, kpi)

    model = ENTITY_MODEL_MAP.get(entity_type)
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


async def compute_budget_kpi(db: AsyncSession, kpi: CustomKpiDefinition) -> float:
    field_name = kpi.field_name or "amount"
    column = getattr(CostEntry, field_name, None)
    if column is None:
        column = CostEntry.amount

    agg_func = func.avg if kpi.calculation == "average" else func.sum
    query = select(agg_func(column))

    if kpi.project_id is not None:
        query = query.where(CostEntry.project_id == kpi.project_id)

    result = await db.execute(query)
    value = result.scalar()
    return float(value) if value is not None else 0.0


def compute_kpi_status(value: float, target: float | None, threshold: float | None) -> str:
    if target is None:
        return "no_target"
    if value >= target:
        return "on_track"
    if threshold is not None and value >= threshold:
        return "warning"
    return "off_track"


async def record_kpi_snapshots(db: AsyncSession, project_id: UUID) -> int:
    today = utcnow().date()
    query = select(CustomKpiDefinition).where(
        CustomKpiDefinition.project_id == project_id,
        CustomKpiDefinition.is_active == True,
    )
    result = await db.execute(query)
    kpis = result.scalars().all()

    count = 0
    for kpi in kpis:
        value = await compute_kpi_value(db, kpi)
        stmt = pg_insert(KpiSnapshot).values(
            kpi_id=kpi.id,
            value=value,
            snapshot_date=today,
        ).on_conflict_do_update(
            constraint="uq_kpi_snapshot_date",
            set_={"value": value},
        )
        await db.execute(stmt)
        count += 1

    await db.flush()
    return count


async def get_kpi_trend(db: AsyncSession, kpi_id: UUID, days: int = 14) -> list[dict]:
    start_date = utcnow().date() - timedelta(days=days)
    query = (
        select(KpiSnapshot.snapshot_date, KpiSnapshot.value)
        .where(
            KpiSnapshot.kpi_id == kpi_id,
            KpiSnapshot.snapshot_date >= start_date,
        )
        .order_by(KpiSnapshot.snapshot_date)
    )
    result = await db.execute(query)
    return [{"snapshot_date": row.snapshot_date, "value": row.value} for row in result.all()]


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

    date_trunc = func.date_trunc("day", model.created_at)

    query = (
        select(date_trunc.label("day"), func.count(model.id).label("count"))
        .where(model.created_at >= func.now() - text(f"interval '{days} days'"))
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
