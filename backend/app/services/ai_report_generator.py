import base64
import json
import logging
import time
from datetime import date
from uuid import UUID

from google import genai
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.services.email_service import EmailService, validate_email

logger = logging.getLogger(__name__)

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

PHOTO_CURATION_PROMPT_EN = """You are an AI assistant helping to curate photos for a construction project report.

Analyze the following photos and their metadata, and score each photo based on its relevance and importance for the report.

REPORT CONTEXT:
{context}

PHOTOS:
{photos}

For each photo, assign a relevance score from 0.0 to 1.0, where:
- 1.0 = Highly relevant, critical for report (major milestone, critical defect, key inspection)
- 0.7-0.9 = Very relevant (important progress, significant findings)
- 0.5-0.6 = Moderately relevant (routine work, minor issues)
- 0.3-0.4 = Somewhat relevant (background context)
- 0.0-0.2 = Low relevance (redundant, poor quality, not report-worthy)

Consider:
1. Visual quality and clarity
2. Relevance to report timeframe and context
3. Importance of what's shown (defects, milestones, inspections)
4. Uniqueness (avoid duplicates of same area/issue)
5. Documentation value (does it add meaningful information?)

Return ONLY valid JSON as an array of objects:
[
  {{"id": "photo_id", "relevance_score": 0.85, "reason": "Brief explanation"}},
  ...
]

Order by relevance_score descending. Maximum {max_photos} photos."""

PHOTO_CURATION_PROMPT_HE = """אתה עוזר AI המסייע באיסוף תמונות עבור דוח פרויקט בנייה.

נתח את התמונות הבאות והמטא-דאטה שלהן, והקצה לכל תמונה ציון על פי הרלוונטיות והחשיבות שלה לדוח.

הקשר הדוח:
{context}

תמונות:
{photos}

עבור כל תמונה, הקצה ציון רלוונטיות מ-0.0 עד 1.0, כאשר:
- 1.0 = רלוונטיות גבוהה מאוד, קריטית לדוח (אבן דרך משמעותית, ליקוי קריטי, בדיקה מרכזית)
- 0.7-0.9 = רלוונטית מאוד (התקדמות חשובה, ממצאים משמעותיים)
- 0.5-0.6 = רלוונטיות בינונית (עבודה שגרתית, בעיות קלות)
- 0.3-0.4 = רלוונטיות מסוימת (הקשר רקע)
- 0.0-0.2 = רלוונטיות נמוכה (מיותר, איכות ירודה, לא ראוי לדוח)

שקול:
1. איכות חזותית ובהירות
2. רלוונטיות למסגרת הזמן והקשר הדוח
3. חשיבות מה שמוצג (ליקויים, אבני דרך, בדיקות)
4. ייחודיות (הימנע מכפילויות של אותו אזור/בעיה)
5. ערך תיעודי (האם זה מוסיף מידע משמעותי?)

החזר JSON תקני בלבד כמערך של אובייקטים:
[
  {{"id": "photo_id", "relevance_score": 0.85, "reason": "הסבר קצר"}},
  ...
]

סדר לפי relevance_score בסדר יורד. מקסימום {max_photos} תמונות."""


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
    photos: list[dict],
    context: str,
    language: str = "en",
    max_photos: int = 10,
) -> list[dict]:
    """
    Use AI to curate and select the most relevant photos for a report.

    Args:
        photos: List of photo metadata dicts (must include 'id' field, optionally: caption, category, date, etc.)
        context: Report context description (e.g., "Weekly progress report for week of 2024-01-15")
        language: Language code ("en" or "he")
        max_photos: Maximum number of photos to return

    Returns:
        list of photo dicts with added 'relevance_score' and 'selection_reason' fields, ordered by relevance
    """
    settings = get_settings()
    api_key = settings.gemini_api_key
    if not api_key:
        raise ValueError("GEMINI_API_KEY is not configured")

    # If no photos provided, return empty list
    if not photos:
        return []

    # If photos count is already under max, return all with default scores
    if len(photos) <= max_photos:
        return [
            {
                **photo,
                "relevance_score": 0.8,
                "selection_reason": "Included by default (under limit)",
            }
            for photo in photos
        ]

    # Prepare photo data for AI analysis (send metadata, not actual image bytes)
    photo_metadata = []
    for idx, photo in enumerate(photos):
        metadata = {
            "id": photo.get("id", f"photo_{idx}"),
            "index": idx,
            "caption": photo.get("caption", ""),
            "category": photo.get("category", "general"),
            "date": str(photo.get("created_at", photo.get("date", ""))),
            "tags": photo.get("tags", []),
        }
        photo_metadata.append(metadata)

    # Select prompt based on language
    prompt_template = PHOTO_CURATION_PROMPT_HE if language == "he" else PHOTO_CURATION_PROMPT_EN
    prompt = prompt_template.format(
        context=context,
        photos=json.dumps(photo_metadata, indent=2, ensure_ascii=False),
        max_photos=max_photos,
    )

    client = genai.Client(api_key=api_key)
    model_name = settings.gemini_model

    contents = [prompt]

    start = time.time()
    response = client.models.generate_content(model=model_name, contents=contents)
    elapsed_ms = int((time.time() - start) * 1000)

    if not response.text:
        # Fallback: return first max_photos with default scores
        return [
            {
                **photo,
                "relevance_score": 0.5,
                "selection_reason": "AI response unavailable",
                "processing_time_ms": elapsed_ms,
            }
            for photo in photos[:max_photos]
        ]

    # Parse AI response
    text = response.text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1] if "\n" in text else text[3:]
        if text.endswith("```"):
            text = text[:-3].strip()

    try:
        scored_photos = json.loads(text)
        if not isinstance(scored_photos, list):
            scored_photos = [scored_photos]
    except json.JSONDecodeError:
        # Fallback: return first max_photos with default scores
        return [
            {
                **photo,
                "relevance_score": 0.5,
                "selection_reason": "JSON parse error",
                "processing_time_ms": elapsed_ms,
            }
            for photo in photos[:max_photos]
        ]

    # Build result by matching scored photos with original photo data
    result = []
    for scored in scored_photos[:max_photos]:
        photo_id = scored.get("id")
        # Find original photo by id or index
        original_photo = None
        for photo in photos:
            if photo.get("id") == photo_id:
                original_photo = photo
                break

        if original_photo:
            result.append({
                **original_photo,
                "relevance_score": float(scored.get("relevance_score", 0.5)),
                "selection_reason": scored.get("reason", "Selected by AI"),
                "processing_time_ms": elapsed_ms,
            })

    # If AI didn't return enough photos, fill with highest unselected
    if len(result) < max_photos:
        selected_ids = {r.get("id") for r in result}
        for photo in photos:
            if photo.get("id") not in selected_ids:
                result.append({
                    **photo,
                    "relevance_score": 0.4,
                    "selection_reason": "Fallback selection",
                    "processing_time_ms": elapsed_ms,
                })
                if len(result) >= max_photos:
                    break

    return result


def send_report_email(
    recipients: list[str],
    project_name: str,
    report_type: str,
    pdf_bytes: bytes,
    language: str = "he",
    report_date: str | None = None,
) -> dict:
    """
    Send AI-generated report via email to recipients.

    Args:
        recipients: List of email addresses to send the report to
        project_name: Name of the project for the email subject
        report_type: Type of report (e.g., "weekly-ai", "inspection-summary-ai")
        pdf_bytes: PDF file content as bytes
        language: Language code ("he" or "en") for email content
        report_date: Optional date string for the report period

    Returns:
        dict with keys: success, sent_count, failed_count, errors

    Raises:
        ValueError: If recipients list is empty or all emails are invalid
        RuntimeError: If email service is not configured
    """
    if not recipients:
        raise ValueError("Recipients list cannot be empty")

    # Validate all email addresses
    valid_recipients = []
    invalid_emails = []
    for email in recipients:
        if validate_email(email):
            valid_recipients.append(email.strip())
        else:
            invalid_emails.append(email)
            logger.warning(f"Invalid email address skipped: {email}")

    if not valid_recipients:
        raise ValueError(f"No valid email addresses found in recipients: {recipients}")

    # Initialize email service
    email_service = EmailService()
    if not email_service.enabled:
        raise RuntimeError("Email service is not configured")

    # Prepare email subject based on report type and language
    report_type_labels = {
        "weekly-ai": {
            "he": "דוח התקדמות שבועי",
            "en": "Weekly Progress Report"
        },
        "inspection-summary-ai": {
            "he": "סיכום בדיקות",
            "en": "Inspection Summary Report"
        },
        "executive-summary-ai": {
            "he": "סיכום מנהלים",
            "en": "Executive Summary Report"
        }
    }

    report_label = report_type_labels.get(report_type, {}).get(language, report_type)
    date_suffix = f" - {report_date}" if report_date else ""
    subject = f"{report_label} - {project_name}{date_suffix}"

    # Prepare email body based on language
    if language == "he":
        body_html = f"""
        <div dir="rtl">
            <h2>דוח פרויקט - {project_name}</h2>
            <p>שלום,</p>
            <p>מצורף {report_label} עבור פרויקט {project_name}.</p>
            <p>הדוח נוצר באופן אוטומטי על ידי מערכת BuilderOps.</p>
            <p>בברכה,<br>מערכת BuilderOps</p>
        </div>
        """
    else:
        body_html = f"""
        <div dir="ltr">
            <h2>Project Report - {project_name}</h2>
            <p>Hello,</p>
            <p>Attached is the {report_label} for project {project_name}.</p>
            <p>This report was automatically generated by the BuilderOps system.</p>
            <p>Best regards,<br>BuilderOps System</p>
        </div>
        """

    # Convert PDF bytes to base64 for attachment
    pdf_base64 = base64.b64encode(pdf_bytes).decode('utf-8')

    # Determine filename based on report type
    filename = f"{report_type}_{project_name.replace(' ', '_')}{date_suffix}.pdf"

    attachment = {
        'content_base64': pdf_base64,
        'filename': filename,
        'mime_type': 'application/pdf'
    }

    # Send emails
    sent_count = 0
    failed_count = 0
    errors = []

    for recipient in valid_recipients:
        try:
            result = email_service.send_notification(
                to_email=recipient,
                subject=subject,
                body_html=body_html
            )

            # For providers that support attachments via send_rfi_email
            if hasattr(email_service.provider, 'send_rfi_email'):
                result = email_service.provider.send_rfi_email(
                    rfi_number="REPORT",
                    to_email=recipient,
                    subject=subject,
                    body_html=body_html,
                    attachments=[attachment]
                )

            if result.get('success'):
                sent_count += 1
                logger.info(
                    f"Report email sent successfully to {recipient}",
                    extra={
                        "recipient": recipient,
                        "report_type": report_type,
                        "project": project_name,
                        "status": "success"
                    }
                )
            else:
                failed_count += 1
                error_msg = result.get('error', 'Unknown error')
                errors.append({"email": recipient, "error": error_msg})
                logger.error(
                    f"Failed to send report email to {recipient}: {error_msg}",
                    extra={
                        "recipient": recipient,
                        "report_type": report_type,
                        "project": project_name,
                        "status": "failure"
                    }
                )

        except Exception as e:
            failed_count += 1
            error_msg = str(e)
            errors.append({"email": recipient, "error": error_msg})
            logger.error(
                f"Exception while sending report email to {recipient}: {error_msg}",
                extra={
                    "recipient": recipient,
                    "report_type": report_type,
                    "project": project_name,
                    "status": "error"
                },
                exc_info=True
            )

    # Log summary
    logger.info(
        f"Report email distribution complete: {sent_count} sent, {failed_count} failed",
        extra={
            "report_type": report_type,
            "project": project_name,
            "sent_count": sent_count,
            "failed_count": failed_count,
            "invalid_emails": invalid_emails
        }
    )

    return {
        "success": sent_count > 0,
        "sent_count": sent_count,
        "failed_count": failed_count,
        "invalid_emails": invalid_emails,
        "errors": errors
    }
