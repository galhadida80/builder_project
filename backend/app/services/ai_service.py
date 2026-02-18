import json
import time

from google import genai
from google.genai import types

from app.config import get_settings

PROMPTS = {
    "extract_text": (
        "Extract ALL text from this document/image. "
        "Return the text exactly as it appears, preserving structure and formatting where possible. "
        "Return the result as JSON with keys: 'extracted_text' (the full text), "
        "'metadata' (any detected document type, language, page count if applicable)."
    ),
    "classify": (
        "Classify this document/image. Determine the document type, category, "
        "and any relevant classification labels. "
        "Return as JSON with keys: 'document_type', 'category', 'labels' (list of strings), "
        "'confidence' (float), 'metadata' (dict)."
    ),
    "summarize": (
        "Analyze and summarize this document/image. Provide: "
        "1) A brief summary (2-3 sentences) "
        "2) Key findings or important points as a list "
        "3) Document metadata (type, date if visible, parties involved). "
        "Return as JSON with keys: 'summary', 'key_findings' (list of strings), 'metadata' (dict)."
    ),
    "analyze": (
        "Extract structured data from this document/image. Look for: "
        "dates, monetary amounts, names of people/companies, addresses, "
        "reference numbers, quantities, and any other structured information. "
        "Return as JSON with keys: 'extracted_data' (dict of field->value), "
        "'key_findings' (list of notable items), 'metadata' (document type info)."
    ),
}


DEFECT_CATEGORIES = [
    "concrete_structure", "wet_room_waterproofing", "plaster", "roof",
    "painting", "plumbing", "flooring", "fire_passage_sealing",
    "roof_waterproofing", "building_general", "moisture", "waterproofing",
    "hvac", "lighting", "solar_system", "other",
]

DEFECT_ANALYSIS_PROMPT = """You are a construction defect analyst. Analyze this image of a construction defect or damage.

You MUST pick the category from ONLY these options: {categories}

You MUST pick the severity from ONLY these options: low, medium, high, critical
- low: cosmetic issue, no structural concern
- medium: needs repair but not urgent
- high: significant damage, needs prompt attention
- critical: structural risk or safety hazard, immediate action required

Respond in {language} language for the description field.
Write a concise description (2-4 sentences) of the defect visible in the image.

Return ONLY valid JSON with exactly these keys:
{{"category": "...", "severity": "...", "description": "..."}}"""


def analyze_defect_image(file_content: bytes, file_type: str, language: str = "en") -> dict:
    settings = get_settings()
    api_key = settings.gemini_api_key
    if not api_key:
        raise ValueError("GEMINI_API_KEY is not configured")

    lang_name = {"en": "English", "he": "Hebrew"}.get(language, "English")
    prompt = DEFECT_ANALYSIS_PROMPT.format(
        categories=", ".join(DEFECT_CATEGORIES),
        language=lang_name,
    )

    client = genai.Client(api_key=api_key)
    mime_type = file_type or "image/jpeg"
    contents = [
        types.Part.from_bytes(data=file_content, mime_type=mime_type),
        prompt,
    ]

    model_name = settings.gemini_model
    start = time.time()
    response = client.models.generate_content(model=model_name, contents=contents)
    elapsed_ms = int((time.time() - start) * 1000)

    text = response.text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1] if "\n" in text else text[3:]
        if text.endswith("```"):
            text = text[:-3].strip()

    result = json.loads(text)
    if result.get("category") not in DEFECT_CATEGORIES:
        result["category"] = "other"
    if result.get("severity") not in ("low", "medium", "high", "critical"):
        result["severity"] = "medium"

    return {"category": result["category"], "severity": result["severity"], "description": result.get("description", ""), "processing_time_ms": elapsed_ms}


def analyze_document(file_content: bytes, file_type: str, analysis_type: str, model: str | None = None) -> dict:
    settings = get_settings()
    api_key = settings.gemini_api_key
    if not api_key:
        raise ValueError("GEMINI_API_KEY is not configured")

    model_name = model or settings.gemini_model
    client = genai.Client(api_key=api_key)

    prompt = PROMPTS.get(analysis_type)
    if not prompt:
        raise ValueError(f"Unknown analysis type: {analysis_type}. Must be one of: {list(PROMPTS.keys())}")

    mime_type = file_type or "application/octet-stream"
    contents = [
        types.Part.from_bytes(data=file_content, mime_type=mime_type),
        prompt + "\n\nRespond ONLY with valid JSON, no markdown formatting.",
    ]

    start = time.time()
    response = client.models.generate_content(model=model_name, contents=contents)
    elapsed_ms = int((time.time() - start) * 1000)

    text = response.text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1] if "\n" in text else text[3:]
        if text.endswith("```"):
            text = text[:-3].strip()

    try:
        result = json.loads(text)
    except json.JSONDecodeError:
        result = {"extracted_text": text, "key_findings": [], "metadata": {"raw_response": True}}

    return {"result": result, "processing_time_ms": elapsed_ms, "model_used": model_name}
