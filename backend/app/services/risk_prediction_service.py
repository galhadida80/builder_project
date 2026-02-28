from datetime import datetime, timedelta
from decimal import Decimal
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.area import ConstructionArea
from app.models.defect import Defect
from app.models.inspection import Inspection
from app.models.risk_score import RiskLevel
from app.utils import utcnow

SEVERITY_WEIGHTS = {
    "low": 1.0,
    "medium": 2.5,
    "high": 5.0,
    "critical": 10.0,
}

RISK_THRESHOLDS = {
    "low": 0.0,
    "medium": 25.0,
    "high": 50.0,
    "critical": 75.0,
}


def calculate_severity_score(defects: list[Defect]) -> Decimal:
    if not defects:
        return Decimal("0.00")

    total_weight = sum(SEVERITY_WEIGHTS.get(d.severity, 1.0) for d in defects)
    return Decimal(str(round(total_weight, 2)))


def determine_risk_level(risk_score: Decimal) -> str:
    score_float = float(risk_score)

    if score_float >= RISK_THRESHOLDS["critical"]:
        return RiskLevel.CRITICAL.value
    elif score_float >= RISK_THRESHOLDS["high"]:
        return RiskLevel.HIGH.value
    elif score_float >= RISK_THRESHOLDS["medium"]:
        return RiskLevel.MEDIUM.value
    else:
        return RiskLevel.LOW.value


def analyze_defect_patterns(defects: list[Defect]) -> dict:
    if not defects:
        return {
            "top_categories": [],
            "severity_distribution": {},
            "repeated_defects_count": 0,
            "average_resolution_days": None,
        }

    category_counts: dict[str, int] = {}
    severity_counts: dict[str, int] = {}
    repeated_count = 0
    resolution_days: list[float] = []

    for defect in defects:
        category_counts[defect.category] = category_counts.get(defect.category, 0) + 1
        severity_counts[defect.severity] = severity_counts.get(defect.severity, 0) + 1

        if defect.is_repeated:
            repeated_count += 1

        if defect.resolved_at and defect.created_at:
            delta = (defect.resolved_at - defect.created_at).total_seconds() / 86400
            resolution_days.append(delta)

    top_categories = sorted(
        [{"category": k, "count": v} for k, v in category_counts.items()],
        key=lambda x: x["count"],
        reverse=True,
    )[:5]

    avg_resolution = round(sum(resolution_days) / len(resolution_days), 1) if resolution_days else None

    return {
        "top_categories": top_categories,
        "severity_distribution": severity_counts,
        "repeated_defects_count": repeated_count,
        "average_resolution_days": avg_resolution,
    }


async def calculate_area_risk_score(
    db: AsyncSession,
    project_id: UUID,
    area_id: UUID | None = None,
    lookback_days: int = 90,
) -> dict:
    cutoff_date = utcnow() - timedelta(days=lookback_days)

    query = select(Defect).where(
        Defect.project_id == project_id,
        Defect.created_at >= cutoff_date,
    )

    if area_id is not None:
        query = query.where(Defect.area_id == area_id)

    result = await db.execute(query)
    defects = list(result.scalars().all())

    defect_count = len(defects)
    severity_score = calculate_severity_score(defects)

    base_score = float(severity_score)
    frequency_multiplier = min(defect_count / 10.0, 3.0)
    risk_score = Decimal(str(round(base_score * (1 + frequency_multiplier), 2)))
    risk_score = min(risk_score, Decimal("100.00"))

    risk_level = determine_risk_level(risk_score)
    patterns = analyze_defect_patterns(defects)

    predicted_types = [cat["category"] for cat in patterns["top_categories"][:3]]

    contributing_factors = {
        "defect_frequency": defect_count,
        "severity_mix": patterns["severity_distribution"],
        "repeated_defects": patterns["repeated_defects_count"],
        "lookback_days": lookback_days,
    }

    calculation_metadata = {
        "calculated_at": utcnow().isoformat(),
        "lookback_period_days": lookback_days,
        "defects_analyzed": defect_count,
        "severity_score": float(severity_score),
        "frequency_multiplier": round(frequency_multiplier, 2),
    }

    return {
        "risk_score": risk_score,
        "risk_level": risk_level,
        "defect_count": defect_count,
        "severity_score": severity_score,
        "predicted_defect_types": predicted_types,
        "contributing_factors": contributing_factors,
        "calculation_metadata": calculation_metadata,
        "patterns": patterns,
    }


async def get_high_risk_areas(
    db: AsyncSession,
    project_id: UUID,
    min_risk_level: str = "high",
    limit: int = 10,
) -> list[dict]:
    areas_query = select(ConstructionArea).where(
        ConstructionArea.project_id == project_id
    )
    areas_result = await db.execute(areas_query)
    areas = list(areas_result.scalars().all())

    area_risks = []
    for area in areas:
        risk_data = await calculate_area_risk_score(db, project_id, area.id)

        if should_include_risk(risk_data["risk_level"], min_risk_level):
            area_risks.append({
                "area_id": area.id,
                "area_name": area.name,
                "floor_number": area.floor_number,
                "area_code": area.area_code,
                **risk_data,
            })

    area_risks.sort(key=lambda x: float(x["risk_score"]), reverse=True)
    return area_risks[:limit]


def should_include_risk(current_level: str, min_level: str) -> bool:
    level_order = {"low": 0, "medium": 1, "high": 2, "critical": 3}
    return level_order.get(current_level, 0) >= level_order.get(min_level, 0)


async def get_inspection_risk_briefing(
    db: AsyncSession,
    inspection_id: UUID,
) -> dict:
    inspection_query = select(Inspection).where(Inspection.id == inspection_id)
    inspection_result = await db.execute(inspection_query)
    inspection = inspection_result.scalar_one_or_none()

    if not inspection:
        return {"error": "Inspection not found", "high_risk_areas": [], "recommendations": []}

    high_risk_areas = await get_high_risk_areas(
        db,
        inspection.project_id,
        min_risk_level="medium",
        limit=5,
    )

    recommendations = []
    for area_risk in high_risk_areas:
        if area_risk["predicted_defect_types"]:
            recommendations.append({
                "area": area_risk["area_name"],
                "focus_on": area_risk["predicted_defect_types"],
                "priority": area_risk["risk_level"],
            })

    return {
        "inspection_id": inspection_id,
        "project_id": inspection.project_id,
        "high_risk_areas": high_risk_areas,
        "recommendations": recommendations,
        "generated_at": utcnow().isoformat(),
    }


async def get_project_risk_summary(
    db: AsyncSession,
    project_id: UUID,
) -> dict:
    overall_risk = await calculate_area_risk_score(db, project_id, area_id=None)

    high_risk_areas = await get_high_risk_areas(
        db,
        project_id,
        min_risk_level="high",
        limit=10,
    )

    defects_query = select(func.count(Defect.id)).where(
        Defect.project_id == project_id,
        Defect.status != "closed",
    )
    open_defects_result = await db.execute(defects_query)
    open_defects = open_defects_result.scalar() or 0

    return {
        "project_id": project_id,
        "overall_risk_score": overall_risk["risk_score"],
        "overall_risk_level": overall_risk["risk_level"],
        "total_defects": overall_risk["defect_count"],
        "open_defects": open_defects,
        "high_risk_area_count": len(high_risk_areas),
        "high_risk_areas": high_risk_areas,
        "patterns": overall_risk["patterns"],
        "generated_at": utcnow().isoformat(),
    }
