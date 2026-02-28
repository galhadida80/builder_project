import json
import time
from datetime import date
from uuid import UUID

from google import genai
from google.genai import types
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings

WEEKLY_PROGRESS_PROMPT_EN = """You are a construction project manager writing a weekly progress report narrative.

Analyze the following project data and generate a professional, coherent narrative summary for the week.

PROJECT DATA:
{data}

Your narrative should:
1. Provide an executive summary (2-3 sentences) of the week's overall progress
2. Highlight key accomplishments and milestones reached
3. Identify any concerns, delays, or critical issues that need attention
4. Mention significant activities (inspections, approvals, RFIs, defects)
5. Note upcoming important events or deadlines
6. Use professional but accessible language
7. Be specific with numbers and metrics where relevant
8. Keep the total narrative to 3-5 paragraphs

Return ONLY valid JSON with this structure:
{{
  "executive_summary": "2-3 sentence overview",
  "accomplishments": ["bullet point 1", "bullet point 2", ...],
  "concerns": ["concern 1", "concern 2", ...],
  "narrative": "Full narrative text (3-5 paragraphs)"
}}

Write in a confident, professional tone. Focus on actionable insights."""

WEEKLY_PROGRESS_PROMPT_HE = """אתה מנהל פרויקט בנייה שכותב דוח התקדמות שבועי.

נתח את הנתונים הבאים של הפרויקט וצור תקציר נרטיבי מקצועי עבור השבוע.

נתוני הפרויקט:
{data}

הנרטיב שלך צריך:
1. לספק סיכום מנהלים (2-3 משפטים) של ההתקדמות הכללית של השבוע
2. להדגיש הישגים עיקריים ואבני דרך שהושגו
3. לזהות כל חשש, עיכוב או בעיה קריטית שדורשת תשומת לב
4. לציין פעילויות משמעותיות (בדיקות, אישורים, RFI, ליקויים)
5. לציין אירועים חשובים או מועדים קרובים
6. להשתמש בשפה מקצועית אך נגישה
7. להיות ספציפי עם מספרים ומדדים במידת הרלוונטיות
8. לשמור על נרטיב כולל של 3-5 פסקאות

החזר JSON תקני בלבד עם המבנה הזה:
{{
  "executive_summary": "סקירה כללית ב-2-3 משפטים",
  "accomplishments": ["נקודה 1", "נקודה 2", ...],
  "concerns": ["חשש 1", "חשש 2", ...],
  "narrative": "טקסט נרטיבי מלא (3-5 פסקאות)"
}}

כתוב בטון בטוח ומקצועי. התמקד בתובנות ניתנות לפעולה."""

INSPECTION_SUMMARY_PROMPT_EN = """You are a construction inspector writing an inspection summary report.

Analyze the following inspection data and generate a comprehensive summary narrative.

INSPECTION DATA:
{data}

Your summary should:
1. Provide an overview of the inspection scope and findings
2. Categorize findings by severity and type
3. Highlight critical issues requiring immediate attention
4. Summarize compliance status and any regulatory concerns
5. Note positive observations and areas of good practice
6. Use technical but clear language
7. Be specific about locations, quantities, and standards referenced
8. Keep the summary to 3-4 paragraphs

Return ONLY valid JSON with this structure:
{{
  "overview": "Brief inspection overview (1-2 sentences)",
  "critical_findings": ["critical finding 1", "critical finding 2", ...],
  "recommendations": ["recommendation 1", "recommendation 2", ...],
  "narrative": "Full summary text (3-4 paragraphs)"
}}

Write in a factual, professional tone. Be clear and specific."""

INSPECTION_SUMMARY_PROMPT_HE = """אתה בודק בנייה שכותב דוח סיכום בדיקה.

נתח את נתוני הבדיקה הבאים וצור נרטיב סיכום מקיף.

נתוני הבדיקה:
{data}

הסיכום שלך צריך:
1. לספק סקירה כללית של היקף הבדיקה והממצאים
2. לסווג ממצאים לפי חומרה וסוג
3. להדגיש בעיות קריטיות הדורשות תשומת לב מיידית
4. לסכם סטטוס תאימות וכל חשש רגולטורי
5. לציין תצפיות חיוביות ותחומים של נוהלים טובים
6. להשתמש בשפה טכנית אך ברורה
7. להיות ספציפי לגבי מיקומים, כמויות ותקנים שאוזכרו
8. לשמור על סיכום של 3-4 פסקאות

החזר JSON תקני בלבד עם המבנה הזה:
{{
  "overview": "סקירה כללית קצרה של הבדיקה (1-2 משפטים)",
  "critical_findings": ["ממצא קריטי 1", "ממצא קריטי 2", ...],
  "recommendations": ["המלצה 1", "המלצה 2", ...],
  "narrative": "טקסט סיכום מלא (3-4 פסקאות)"
}}

כתוב בטון עובדתי ומקצועי. היה ברור וספציפי."""


def _parse_json_response(text: str) -> dict:
    """Parse JSON response from AI, handling markdown code blocks."""
    if text.startswith("```"):
        text = text.split("\n", 1)[1] if "\n" in text else text[3:]
        if text.endswith("```"):
            text = text[:-3].strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return {"narrative": text, "error": "Failed to parse JSON response"}


async def generate_weekly_progress_narrative(
    db: AsyncSession,
    project_id: UUID,
    date_from: date,
    date_to: date,
    language: str = "en",
    weekly_data: dict | None = None,
) -> dict:
    """
    Generate AI narrative for weekly progress report.

    Args:
        db: Database session
        project_id: Project UUID
        date_from: Start date of reporting period
        date_to: End date of reporting period
        language: Language code ("en" or "he")
        weekly_data: Optional pre-fetched weekly data (if None, will fetch from daily_summary_service)

    Returns:
        dict with keys: narrative, executive_summary, accomplishments, concerns, processing_time_ms
    """
    settings = get_settings()
    api_key = settings.gemini_api_key
    if not api_key:
        raise ValueError("GEMINI_API_KEY is not configured")

    # If weekly_data not provided, collect it (placeholder for now)
    if weekly_data is None:
        # In future subtasks, we'll integrate with daily_summary_service
        # For now, use placeholder data
        weekly_data = {
            "date_from": str(date_from),
            "date_to": str(date_to),
            "project_id": str(project_id),
            "equipment": {"created": 0, "approved": 0, "rejected": 0},
            "materials": {"created": 0, "approved": 0, "rejected": 0},
            "inspections": {"completed": 0, "new_findings": 0},
            "rfis": {"opened": 0, "answered": 0, "closed": 0, "overdue": 0},
            "defects": {"new": 0, "resolved": 0, "critical_open": 0},
            "overall_progress": 0.0,
        }

    # Select prompt based on language
    prompt_template = WEEKLY_PROGRESS_PROMPT_HE if language == "he" else WEEKLY_PROGRESS_PROMPT_EN
    prompt = prompt_template.format(data=json.dumps(weekly_data, indent=2))

    client = genai.Client(api_key=api_key)
    model_name = settings.gemini_model

    contents = [prompt]

    start = time.time()
    response = client.models.generate_content(model=model_name, contents=contents)
    elapsed_ms = int((time.time() - start) * 1000)

    if not response.text:
        return {
            "narrative": "",
            "executive_summary": "",
            "accomplishments": [],
            "concerns": [],
            "processing_time_ms": elapsed_ms,
            "model_used": model_name,
        }

    parsed = _parse_json_response(response.text.strip())

    return {
        "narrative": parsed.get("narrative", ""),
        "executive_summary": parsed.get("executive_summary", ""),
        "accomplishments": parsed.get("accomplishments", []),
        "concerns": parsed.get("concerns", []),
        "processing_time_ms": elapsed_ms,
        "model_used": model_name,
        "language": language,
    }


async def generate_inspection_summary_narrative(
    db: AsyncSession,
    project_id: UUID,
    date_from: date,
    date_to: date,
    language: str = "en",
    inspection_data: dict | None = None,
) -> dict:
    """
    Generate AI narrative for inspection summary report.

    Args:
        db: Database session
        project_id: Project UUID
        date_from: Start date of reporting period
        date_to: End date of reporting period
        language: Language code ("en" or "he")
        inspection_data: Optional pre-fetched inspection data

    Returns:
        dict with keys: narrative, overview, critical_findings, recommendations, processing_time_ms
    """
    settings = get_settings()
    api_key = settings.gemini_api_key
    if not api_key:
        raise ValueError("GEMINI_API_KEY is not configured")

    # If inspection_data not provided, collect it (placeholder for now)
    if inspection_data is None:
        inspection_data = {
            "date_from": str(date_from),
            "date_to": str(date_to),
            "project_id": str(project_id),
            "inspections_completed": 0,
            "findings_total": 0,
            "findings_by_severity": {"critical": 0, "high": 0, "medium": 0, "low": 0},
            "compliance_rate": 0.0,
        }

    # Select prompt based on language
    prompt_template = INSPECTION_SUMMARY_PROMPT_HE if language == "he" else INSPECTION_SUMMARY_PROMPT_EN
    prompt = prompt_template.format(data=json.dumps(inspection_data, indent=2))

    client = genai.Client(api_key=api_key)
    model_name = settings.gemini_model

    contents = [prompt]

    start = time.time()
    response = client.models.generate_content(model=model_name, contents=contents)
    elapsed_ms = int((time.time() - start) * 1000)

    if not response.text:
        return {
            "narrative": "",
            "overview": "",
            "critical_findings": [],
            "recommendations": [],
            "processing_time_ms": elapsed_ms,
            "model_used": model_name,
        }

    parsed = _parse_json_response(response.text.strip())

    return {
        "narrative": parsed.get("narrative", ""),
        "overview": parsed.get("overview", ""),
        "critical_findings": parsed.get("critical_findings", []),
        "recommendations": parsed.get("recommendations", []),
        "processing_time_ms": elapsed_ms,
        "model_used": model_name,
        "language": language,
    }


async def select_relevant_photos(
    db: AsyncSession,
    project_id: UUID,
    date_from: date,
    date_to: date,
    max_photos: int = 10,
    category_filter: str | None = None,
) -> list[dict]:
    """
    Select relevant photos for report based on date range and optional category.

    Args:
        db: Database session
        project_id: Project UUID
        date_from: Start date for photo selection
        date_to: End date for photo selection
        max_photos: Maximum number of photos to return
        category_filter: Optional category to filter by (e.g., "defect", "inspection")

    Returns:
        list of photo metadata dicts with keys: id, url, caption, category, created_at
    """
    # Placeholder implementation - will be enhanced in subtask-1-3
    # For now, return empty list
    return []
