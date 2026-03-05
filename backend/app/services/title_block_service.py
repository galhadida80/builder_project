"""Service for extracting metadata from drawing title blocks using AI."""

import json
import time

from google import genai
from google.genai import types

from app.config import get_settings

TITLE_BLOCK_EXTRACTION_PROMPT = """You are an expert in construction drawing analysis. Extract metadata from the title block in this drawing.

IMPORTANT RULES:
- Only extract information you can clearly see in the title block
- If a field is not visible or unclear, set it to null
- Return ONLY valid JSON, no markdown formatting
- All dates should be in ISO format (YYYY-MM-DD) if visible
- Scale should be extracted exactly as shown (e.g., "1:50", "1:100", "NTS")

Extract the following fields:
- drawing_number: The drawing number/ID
- drawing_title: The title or name of the drawing
- project_name: The project name
- project_number: The project number or ID
- drawing_type: Type of drawing (e.g., "Architectural", "Structural", "MEP", "Site Plan")
- scale: The scale of the drawing
- revision: Revision number or letter
- date: Date on the drawing
- drawn_by: Name of person who created the drawing
- checked_by: Name of person who checked/reviewed
- approved_by: Name of person who approved
- discipline: Engineering discipline (e.g., "Architecture", "Structural", "Mechanical")
- sheet_number: Sheet number in the set
- total_sheets: Total number of sheets in the set

Respond ONLY with valid JSON in this exact format:
{{
  "drawing_number": "...",
  "drawing_title": "...",
  "project_name": "...",
  "project_number": "...",
  "drawing_type": "...",
  "scale": "...",
  "revision": "...",
  "date": "...",
  "drawn_by": "...",
  "checked_by": "...",
  "approved_by": "...",
  "discipline": "...",
  "sheet_number": "...",
  "total_sheets": "..."
}}

Set any field to null if not visible."""


def extract_title_block(file_content: bytes, file_type: str) -> dict:
    """Extract title block metadata from a construction drawing using Gemini AI.

    Args:
        file_content: The file content as bytes
        file_type: The MIME type of the file (e.g., "application/pdf", "image/jpeg")

    Returns:
        Dict containing extracted metadata and processing info:
        {
            "metadata": {
                "drawing_number": str | None,
                "drawing_title": str | None,
                "project_name": str | None,
                ...
            },
            "processing_time_ms": int,
            "model_used": str,
            "success": bool,
            "error": str | None
        }

    Raises:
        ValueError: If GEMINI_API_KEY is not configured
    """
    settings = get_settings()
    api_key = settings.gemini_api_key

    if not api_key:
        raise ValueError("GEMINI_API_KEY is not configured")

    model_name = settings.gemini_model
    client = genai.Client(api_key=api_key)

    mime_type = file_type or "application/pdf"
    contents = [
        types.Part.from_bytes(data=file_content, mime_type=mime_type),
        TITLE_BLOCK_EXTRACTION_PROMPT,
    ]

    start = time.time()

    try:
        response = client.models.generate_content(model=model_name, contents=contents)
        elapsed_ms = int((time.time() - start) * 1000)

        if not response.text:
            return {
                "metadata": {},
                "processing_time_ms": elapsed_ms,
                "model_used": model_name,
                "success": False,
                "error": "Empty response from AI model",
            }

        # Parse response
        text = response.text.strip()

        # Remove markdown formatting if present
        if text.startswith("```"):
            text = text.split("\n", 1)[1] if "\n" in text else text[3:]
            if text.endswith("```"):
                text = text[:-3].strip()

        # Parse JSON
        try:
            metadata = json.loads(text)
        except json.JSONDecodeError as e:
            return {
                "metadata": {},
                "processing_time_ms": elapsed_ms,
                "model_used": model_name,
                "success": False,
                "error": f"Failed to parse JSON response: {str(e)}",
            }

        return {
            "metadata": metadata,
            "processing_time_ms": elapsed_ms,
            "model_used": model_name,
            "success": True,
            "error": None,
        }

    except Exception as e:
        elapsed_ms = int((time.time() - start) * 1000)
        return {
            "metadata": {},
            "processing_time_ms": elapsed_ms,
            "model_used": model_name,
            "success": False,
            "error": str(e),
        }
