import csv
import io
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_user, verify_project_access
from app.db.session import get_db
from app.models.analytics import CustomKpiDefinition
from app.models.defect import Defect
from app.models.equipment import Equipment
from app.models.inspection import Inspection
from app.models.material import Material
from app.models.project import ProjectMember
from app.models.rfi import RFI
from app.models.user import User
from app.schemas.analytics_bi import (
    BenchmarkResponse,
    KpiCreate,
    KpiResponse,
    KpiSnapshotPoint,
    KpiSnapshotResponse,
    KpiUpdate,
    KpiValueResponse,
    TrendAnalysisResponse,
    TrendPoint,
)
from app.services.analytics_service import (
    compute_kpi_status,
    compute_kpi_value,
    get_entity_trends,
    get_kpi_trend,
    get_project_benchmarks,
    record_kpi_snapshots,
)

router = APIRouter()

EXPORT_MODEL_MAP = {
    "equipment": Equipment,
    "material": Material,
    "inspection": Inspection,
    "rfi": RFI,
    "defect": Defect,
}


@router.get("/trends", response_model=TrendAnalysisResponse)
async def get_trends(
    entity_type: str = Query(..., description="Entity type to analyze"),
    project_id: Optional[UUID] = Query(None, description="Filter by project"),
    days: int = Query(30, ge=1, le=365, description="Number of days to look back"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if project_id:
        await verify_project_access(project_id, current_user, db)
    data = await get_entity_trends(db, entity_type, project_id, days, user_id=current_user.id)
    return TrendAnalysisResponse(
        entity_type=entity_type,
        period=f"{days}d",
        data_points=[TrendPoint(date=d["date"], count=d["count"]) for d in data],
    )


@router.get("/benchmarks", response_model=BenchmarkResponse)
async def get_benchmarks(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    benchmarks = await get_project_benchmarks(db, current_user)
    return BenchmarkResponse(projects=benchmarks)


@router.post("/kpi-definitions", response_model=KpiResponse, status_code=201)
async def create_kpi_definition(
    payload: KpiCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if payload.project_id:
        await verify_project_access(payload.project_id, current_user, db)

    kpi = CustomKpiDefinition(
        name=payload.name,
        description=payload.description,
        kpi_type=payload.kpi_type,
        entity_type=payload.entity_type,
        filter_config=payload.filter_config,
        calculation=payload.calculation,
        field_name=payload.field_name,
        project_id=payload.project_id,
        target_value=payload.target_value,
        warning_threshold=payload.warning_threshold,
        unit=payload.unit,
        display_order=payload.display_order,
        icon=payload.icon,
        color=payload.color,
        created_by_id=current_user.id,
    )
    db.add(kpi)
    await db.flush()
    await db.refresh(kpi)
    return kpi


@router.get("/kpi-definitions", response_model=list[KpiResponse])
async def list_kpi_definitions(
    project_id: Optional[UUID] = Query(None, description="Filter by project"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    accessible_projects = select(ProjectMember.project_id).where(
        ProjectMember.user_id == current_user.id
    )
    query = select(CustomKpiDefinition).where(
        CustomKpiDefinition.project_id.in_(accessible_projects)
    )
    if project_id is not None:
        await verify_project_access(project_id, current_user, db)
        query = select(CustomKpiDefinition).where(
            CustomKpiDefinition.project_id == project_id
        )
    result = await db.execute(query.order_by(CustomKpiDefinition.display_order, CustomKpiDefinition.created_at.desc()))
    return result.scalars().all()


@router.put("/kpi-definitions/{kpi_id}", response_model=KpiResponse)
async def update_kpi_definition(
    kpi_id: UUID,
    payload: KpiUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(CustomKpiDefinition).where(CustomKpiDefinition.id == kpi_id)
    )
    kpi = result.scalar_one_or_none()
    if kpi is None:
        raise HTTPException(status_code=404, detail="KPI definition not found")

    if kpi.project_id:
        await verify_project_access(kpi.project_id, current_user, db)

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(kpi, field, value)

    await db.flush()
    await db.refresh(kpi)
    return kpi


@router.delete("/kpi-definitions/{kpi_id}", status_code=204)
async def delete_kpi_definition(
    kpi_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(CustomKpiDefinition).where(CustomKpiDefinition.id == kpi_id)
    )
    kpi = result.scalar_one_or_none()
    if kpi is None:
        raise HTTPException(status_code=404, detail="KPI definition not found")

    if kpi.project_id:
        await verify_project_access(kpi.project_id, current_user, db)

    await db.delete(kpi)
    await db.flush()


@router.get("/kpi-values", response_model=list[KpiValueResponse])
async def get_kpi_values(
    project_id: Optional[UUID] = Query(None, description="Filter KPIs by project"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    accessible_projects = select(ProjectMember.project_id).where(
        ProjectMember.user_id == current_user.id
    )
    query = select(CustomKpiDefinition).where(
        CustomKpiDefinition.project_id.in_(accessible_projects)
    )
    if project_id is not None:
        await verify_project_access(project_id, current_user, db)
        query = select(CustomKpiDefinition).where(
            CustomKpiDefinition.project_id == project_id
        )

    result = await db.execute(query.order_by(CustomKpiDefinition.display_order))
    kpis = result.scalars().all()

    values = []
    for kpi in kpis:
        computed = await compute_kpi_value(db, kpi)
        status = compute_kpi_status(computed, kpi.target_value, kpi.warning_threshold)
        trend_data = await get_kpi_trend(db, kpi.id, days=14)
        trend = [KpiSnapshotPoint(snapshot_date=t["snapshot_date"], value=t["value"]) for t in trend_data]
        values.append(
            KpiValueResponse(
                kpi_id=kpi.id,
                name=kpi.name,
                value=computed,
                entity_type=kpi.entity_type,
                kpi_type=kpi.kpi_type,
                target_value=kpi.target_value,
                warning_threshold=kpi.warning_threshold,
                unit=kpi.unit,
                icon=kpi.icon,
                color=kpi.color,
                status=status,
                trend=trend,
            )
        )
    return values


@router.post("/kpi-snapshots/record", status_code=200)
async def record_snapshots(
    project_id: UUID = Query(..., description="Project to record snapshots for"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await verify_project_access(project_id, current_user, db)
    count = await record_kpi_snapshots(db, project_id)
    return {"recorded": count}


@router.get("/kpi-definitions/{kpi_id}/history", response_model=list[KpiSnapshotResponse])
async def get_kpi_history(
    kpi_id: UUID,
    days: int = Query(30, ge=1, le=365, description="Number of days to look back"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(CustomKpiDefinition).where(CustomKpiDefinition.id == kpi_id)
    )
    kpi = result.scalar_one_or_none()
    if kpi is None:
        raise HTTPException(status_code=404, detail="KPI definition not found")

    if kpi.project_id:
        await verify_project_access(kpi.project_id, current_user, db)

    trend_data = await get_kpi_trend(db, kpi_id, days=days)
    return [
        KpiSnapshotResponse(kpi_id=kpi_id, value=t["value"], snapshot_date=t["snapshot_date"])
        for t in trend_data
    ]


@router.get("/export")
async def export_csv(
    entity_type: str = Query(..., description="Entity type to export"),
    project_id: Optional[UUID] = Query(None, description="Filter by project"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    model = EXPORT_MODEL_MAP.get(entity_type)
    if model is None:
        raise HTTPException(status_code=400, detail=f"Unsupported entity type: {entity_type}")

    if project_id:
        await verify_project_access(project_id, current_user, db)

    query = select(model)
    if project_id is not None and hasattr(model, "project_id"):
        query = query.where(model.project_id == project_id)
    elif hasattr(model, "project_id"):
        accessible_projects = select(ProjectMember.project_id).where(
            ProjectMember.user_id == current_user.id
        )
        query = query.where(model.project_id.in_(accessible_projects))

    result = await db.execute(query)
    rows = result.scalars().all()

    if not rows:
        columns = ["id"]
    else:
        columns = [c.key for c in model.__table__.columns]

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(columns)
    for row in rows:
        writer.writerow([getattr(row, col, "") for col in columns])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={entity_type}_export.csv"},
    )
