import json
import time

from google import genai
from google.genai import types

from app.config import get_settings

QUANTITY_EXTRACTION_PROMPT = """You are a construction quantity surveyor expert. Analyze this garmoshka (accordion-style) construction planning PDF document.

Extract ALL building quantity data you can find, including:
- Floors and their details
- Rooms per floor (name, area in sqm, type)
- Doors (type, dimensions, quantity)
- Windows (type, dimensions, quantity)
- Room finishes (floor, walls, ceiling materials)

Respond in {language} language for all descriptive text fields.

Return ONLY valid JSON with this exact structure:
{{
  "floors": [
    {{
      "floor_number": 1,
      "floor_name": "...",
      "total_area_sqm": 0.0,
      "rooms": [
        {{
          "name": "...",
          "room_type": "...",
          "area_sqm": 0.0,
          "perimeter_m": 0.0,
          "height_m": 0.0,
          "doors": [
            {{"door_type": "...", "width_cm": 0, "height_cm": 0, "quantity": 1}}
          ],
          "windows": [
            {{"window_type": "...", "width_cm": 0, "height_cm": 0, "quantity": 1}}
          ],
          "finishes": {{
            "floor_material": "...",
            "wall_material": "...",
            "ceiling_material": "..."
          }}
        }}
      ]
    }}
  ],
  "summary": {{
    "total_floors": 0,
    "total_rooms": 0,
    "total_area_sqm": 0.0,
    "total_doors": 0,
    "total_windows": 0
  }}
}}

If certain data is not found in the document, omit those fields or use null.
Extract as much as possible from the document. Be thorough and accurate."""


def extract_quantities(file_content: bytes, file_type: str, language: str = "he") -> dict:
    settings = get_settings()
    api_key = settings.gemini_api_key
    if not api_key:
        raise ValueError("GEMINI_API_KEY is not configured")

    lang_name = {"en": "English", "he": "Hebrew"}.get(language, "Hebrew")
    prompt = QUANTITY_EXTRACTION_PROMPT.format(language=lang_name)

    client = genai.Client(api_key=api_key)
    mime_type = file_type or "application/pdf"
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
    return {"result": result, "processing_time_ms": elapsed_ms}
