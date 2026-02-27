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
    "concrete_structure", "structural", "wet_room_waterproofing", "plaster",
    "roof", "roof_waterproofing", "painting", "plumbing", "flooring",
    "tiling", "fire_passage_sealing", "fire_safety", "building_general",
    "moisture", "waterproofing", "insulation", "hvac", "electrical",
    "lighting", "solar_system", "windows_doors", "drainage", "elevator",
    "gas", "accessibility", "exterior_cladding", "landscaping", "other",
]

DEFECT_ANALYSIS_PROMPT = """You are a construction defect analyst. Analyze this image and identify visible defects or damages.

IMPORTANT RULES:
- Only report defects you are HIGHLY CONFIDENT about. Do NOT guess or speculate.
- Each defect must have a confidence score between 0.0 and 1.0 reflecting how certain you are.
- Only report defects with confidence >= 0.7. Skip anything you are unsure about.
- Prefer reporting fewer, accurate defects over many uncertain ones.
- Maximum 5 defects per image.

You MUST pick each category from ONLY these options: {categories}

You MUST pick each severity from ONLY these options: low, medium, high, critical
- low: cosmetic issue, no structural concern
- medium: needs repair but not urgent
- high: significant damage, needs prompt attention
- critical: structural risk or safety hazard, immediate action required

Respond in {language} language for each description field.
Write a concise description (2-4 sentences) per defect.

Return ONLY a valid JSON array. Each element must have exactly these keys:
[{{"category": "...", "severity": "...", "description": "...", "confidence": 0.85}}, ...]

If only one defect is visible, return an array with one element.
If NO clear defects are visible, return an empty array: []"""

VALID_SEVERITIES = ("low", "medium", "high", "critical")
MAX_DEFECTS = 5
MIN_CONFIDENCE = 0.7


def validate_defect_item(item: dict) -> dict:
    if not isinstance(item, dict):
        return {"category": "other", "severity": "medium", "description": "", "confidence": 0.5}
    category = item.get("category", "other")
    if category not in DEFECT_CATEGORIES:
        category = "other"
    severity = item.get("severity", "medium")
    if severity not in VALID_SEVERITIES:
        severity = "medium"
    confidence = item.get("confidence", 0.5)
    if not isinstance(confidence, (int, float)):
        confidence = 0.5
    confidence = max(0.0, min(1.0, float(confidence)))
    return {"category": category, "severity": severity, "description": item.get("description", ""), "confidence": round(confidence, 2)}


def parse_defects_response(text: str) -> list[dict]:
    if text.startswith("```"):
        text = text.split("\n", 1)[1] if "\n" in text else text[3:]
        if text.endswith("```"):
            text = text[:-3].strip()
    parsed = json.loads(text)
    if isinstance(parsed, dict):
        parsed = [parsed]
    if not isinstance(parsed, list):
        return [{"category": "other", "severity": "medium", "description": "", "confidence": 0.5}]
    validated = [validate_defect_item(item) for item in parsed[:MAX_DEFECTS]]
    high_confidence = [d for d in validated if d["confidence"] >= MIN_CONFIDENCE]
    return high_confidence if high_confidence else validated[:1]


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

    if not response.text:
        return {"defects": [{"category": "other", "severity": "medium", "description": ""}], "processing_time_ms": elapsed_ms}

    try:
        defects = parse_defects_response(response.text.strip())
    except (json.JSONDecodeError, KeyError):
        defects = [{"category": "other", "severity": "medium", "description": ""}]

    if not defects:
        defects = [{"category": "other", "severity": "medium", "description": ""}]

    return {"defects": defects, "processing_time_ms": elapsed_ms}


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

    if not response.text:
        return {"result": {"extracted_text": "", "key_findings": [], "metadata": {}}, "processing_time_ms": elapsed_ms, "model_used": model_name}

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
