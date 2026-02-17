import csv
import io
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_user
from app.db.session import get_db
from app.models.analytics import CustomKpiDefinition
from app.models.defect import Defect
from app.models.equipment import Equipment
from app.models.inspection import Inspection
from app.models.material import Material
from app.models.rfi import RFI
from app.models.user import User
from app.schemas.analytics_bi import (
    BenchmarkResponse,
    KpiCreate,
    KpiResponse,
    KpiUpdate,
    KpiValueResponse,
    TrendAnalysisResponse,
    TrendPoint,
)
from app.services.analytics_service import (
    compute_kpi_value,
    get_entity_trends,
    get_project_benchmarks,
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
    data = await get_entity_trends(db, entity_type, project_id, days)
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
    kpi = CustomKpiDefinition(
        name=payload.name,
        description=payload.description,
        kpi_type=payload.kpi_type,
        entity_type=payload.entity_type,
        filter_config=payload.filter_config,
        calculation=payload.calculation,
        field_name=payload.field_name,
        project_id=payload.project_id,
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
    query = select(CustomKpiDefinition)
    if project_id is not None:
        query = query.where(CustomKpiDefinition.project_id == project_id)
    result = await db.execute(query.order_by(CustomKpiDefinition.created_at.desc()))
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

    await db.delete(kpi)
    await db.flush()


@router.get("/kpi-values", response_model=list[KpiValueResponse])
async def get_kpi_values(
    project_id: Optional[UUID] = Query(None, description="Filter KPIs by project"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(CustomKpiDefinition)
    if project_id is not None:
        query = query.where(CustomKpiDefinition.project_id == project_id)

    result = await db.execute(query)
    kpis = result.scalars().all()

    values = []
    for kpi in kpis:
        computed = await compute_kpi_value(db, kpi)
        values.append(
            KpiValueResponse(
                kpi_id=kpi.id,
                name=kpi.name,
                value=computed,
                entity_type=kpi.entity_type,
                kpi_type=kpi.kpi_type,
            )
        )
    return values


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

    query = select(model)
    if project_id is not None and hasattr(model, "project_id"):
        query = query.where(model.project_id == project_id)

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
