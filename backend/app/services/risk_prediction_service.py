import json
import time
from datetime import datetime, timedelta
from decimal import Decimal
from uuid import UUID

from google import genai
from google.genai import types
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
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

DEFECT_PREDICTION_PROMPT = """You are a construction quality analyst. Analyze these historical defect patterns and predict future defect risks.

Historical Defect Data:
{defect_summary}

IMPORTANT RULES:
- Provide actionable predictions based on clear patterns in the data
- Each prediction must include a confidence score between 0.0 and 1.0
- Only make predictions with confidence >= 0.6
- Focus on the most significant patterns and trends
- Maximum 5 predictions

You MUST pick each category from ONLY these options:
concrete_structure, structural, wet_room_waterproofing, plaster, roof, roof_waterproofing, painting, plumbing, flooring, tiling, fire_passage_sealing, fire_safety, building_general, moisture, waterproofing, insulation, hvac, electrical, lighting, solar_system, windows_doors, drainage, elevator, gas, accessibility, exterior_cladding, landscaping, other

You MUST pick each severity from ONLY these options: low, medium, high, critical

Return ONLY a valid JSON object with this exact structure:
{{
  "predictions": [
    {{
      "category": "...",
      "severity": "...",
      "likelihood": "high|medium|low",
      "confidence": 0.75,
      "reasoning": "Brief explanation of why this defect is predicted (1-2 sentences)"
    }}
  ],
  "risk_trends": {{
    "increasing_categories": ["category1", "category2"],
    "decreasing_categories": ["category1"],
    "seasonal_patterns": "Brief description if any patterns detected",
    "high_risk_periods": "Brief description if any patterns detected"
  }},
  "recommendations": [
    "Actionable recommendation 1",
    "Actionable recommendation 2"
  ]
}}

If no clear patterns exist, return empty arrays and null values."""

VALID_CATEGORIES = {
    "concrete_structure", "structural", "wet_room_waterproofing", "plaster",
    "roof", "roof_waterproofing", "painting", "plumbing", "flooring",
    "tiling", "fire_passage_sealing", "fire_safety", "building_general",
    "moisture", "waterproofing", "insulation", "hvac", "electrical",
    "lighting", "solar_system", "windows_doors", "drainage", "elevator",
    "gas", "accessibility", "exterior_cladding", "landscaping", "other",
}

VALID_SEVERITIES = {"low", "medium", "high", "critical"}
VALID_LIKELIHOODS = {"low", "medium", "high"}
MIN_PREDICTION_CONFIDENCE = 0.6
MAX_PREDICTIONS = 5


def validate_prediction_item(item: dict) -> dict:
    if not isinstance(item, dict):
        return None

    category = item.get("category", "other")
    if category not in VALID_CATEGORIES:
        category = "other"

    severity = item.get("severity", "medium")
    if severity not in VALID_SEVERITIES:
        severity = "medium"

    likelihood = item.get("likelihood", "medium")
    if likelihood not in VALID_LIKELIHOODS:
        likelihood = "medium"

    confidence = item.get("confidence", 0.5)
    if not isinstance(confidence, (int, float)):
        confidence = 0.5
    confidence = max(0.0, min(1.0, float(confidence)))

    if confidence < MIN_PREDICTION_CONFIDENCE:
        return None

    return {
        "category": category,
        "severity": severity,
        "likelihood": likelihood,
        "confidence": round(confidence, 2),
        "reasoning": item.get("reasoning", "")[:500],
    }


def parse_prediction_response(text: str) -> dict:
    if text.startswith("```"):
        text = text.split("\n", 1)[1] if "\n" in text else text[3:]
        if text.endswith("```"):
            text = text[:-3].strip()

    try:
        parsed = json.loads(text)
    except json.JSONDecodeError:
        return {
            "predictions": [],
            "risk_trends": {
                "increasing_categories": [],
                "decreasing_categories": [],
                "seasonal_patterns": None,
                "high_risk_periods": None,
            },
            "recommendations": [],
        }

    if not isinstance(parsed, dict):
        return {
            "predictions": [],
            "risk_trends": {
                "increasing_categories": [],
                "decreasing_categories": [],
                "seasonal_patterns": None,
                "high_risk_periods": None,
            },
            "recommendations": [],
        }

    predictions = parsed.get("predictions", [])
    if isinstance(predictions, list):
        validated = [validate_prediction_item(p) for p in predictions[:MAX_PREDICTIONS]]
        predictions = [p for p in validated if p is not None]
    else:
        predictions = []

    risk_trends = parsed.get("risk_trends", {})
    if not isinstance(risk_trends, dict):
        risk_trends = {
            "increasing_categories": [],
            "decreasing_categories": [],
            "seasonal_patterns": None,
            "high_risk_periods": None,
        }

    recommendations = parsed.get("recommendations", [])
    if not isinstance(recommendations, list):
        recommendations = []
    recommendations = [str(r)[:500] for r in recommendations[:10]]

    return {
        "predictions": predictions,
        "risk_trends": risk_trends,
        "recommendations": recommendations,
    }


def prepare_defect_summary(defects: list[Defect]) -> str:
    if not defects:
        return "No historical defects found."

    category_counts: dict[str, int] = {}
    severity_counts: dict[str, int] = {}
    monthly_counts: dict[str, int] = {}

    for defect in defects:
        category_counts[defect.category] = category_counts.get(defect.category, 0) + 1
        severity_counts[defect.severity] = severity_counts.get(defect.severity, 0) + 1

        if defect.created_at:
            month_key = defect.created_at.strftime("%Y-%m")
            monthly_counts[month_key] = monthly_counts.get(month_key, 0) + 1

    summary_parts = [
        f"Total defects: {len(defects)}",
        f"\nCategory breakdown: {json.dumps(category_counts, indent=2)}",
        f"\nSeverity breakdown: {json.dumps(severity_counts, indent=2)}",
        f"\nMonthly defect counts: {json.dumps(monthly_counts, indent=2)}",
    ]

    return "\n".join(summary_parts)


def predict_defect_patterns(
    defects: list[Defect],
    model: str | None = None,
) -> dict:
    settings = get_settings()
    api_key = settings.gemini_api_key
    if not api_key:
        raise ValueError("GEMINI_API_KEY is not configured")

    if not defects:
        return {
            "predictions": [],
            "risk_trends": {
                "increasing_categories": [],
                "decreasing_categories": [],
                "seasonal_patterns": None,
                "high_risk_periods": None,
            },
            "recommendations": [],
            "processing_time_ms": 0,
            "model_used": model or settings.gemini_model,
        }

    defect_summary = prepare_defect_summary(defects)
    prompt = DEFECT_PREDICTION_PROMPT.format(defect_summary=defect_summary)

    client = genai.Client(api_key=api_key)
    model_name = model or settings.gemini_model

    start = time.time()
    response = client.models.generate_content(
        model=model_name,
        contents=[prompt],
    )
    elapsed_ms = int((time.time() - start) * 1000)

    if not response.text:
        return {
            "predictions": [],
            "risk_trends": {
                "increasing_categories": [],
                "decreasing_categories": [],
                "seasonal_patterns": None,
                "high_risk_periods": None,
            },
            "recommendations": [],
            "processing_time_ms": elapsed_ms,
            "model_used": model_name,
        }

    result = parse_prediction_response(response.text.strip())
    result["processing_time_ms"] = elapsed_ms
    result["model_used"] = model_name

    return result


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
