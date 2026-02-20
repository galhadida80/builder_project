import json
import logging
import re

from google import genai
from google.genai import types

from app.config import get_settings

logger = logging.getLogger(__name__)

SEMANTIC_MAPPING_PROMPT = """You are a construction document translator/classifier. You will receive structured data extracted from a Hebrew construction quantity document.

Your ONLY job is to provide English semantic labels. You must follow these rules STRICTLY:

1. Do NOT change any numeric values (areas, dimensions, quantities, perimeters, heights)
2. Do NOT add rooms, doors, or windows that are not in the input
3. Do NOT estimate or fill in missing numeric values — leave them as null
4. Do NOT invent data that is not present

For each room, provide:
- "room_type": English room type classification (living_room, kitchen, bedroom, bathroom, toilet, balcony, safe_room, lobby, corridor, entrance, storage, laundry, study, hallway, shelter, parking, roof, yard, room)
- "room_name_translated": English translation of the Hebrew room name

For each door, provide:
- "door_type": English door type (interior, exterior, fire_rated, sliding, french, pocket, security, bathroom, bedroom)

For each window, provide:
- "window_type": English window type (standard, sliding, fixed, casement, awning, tilt_turn, skylight, bay)

For finishes, provide:
- "floor_material_en": English translation
- "wall_material_en": English translation
- "ceiling_material_en": English translation

Respond ONLY with valid JSON matching this structure:
{{
  "floors": [
    {{
      "floor_number": <same as input>,
      "floor_name_en": "Floor X",
      "rooms": [
        {{
          "original_name": "<exact Hebrew name from input>",
          "room_type": "...",
          "room_name_translated": "...",
          "doors": [
            {{"door_type": "..."}}
          ],
          "windows": [
            {{"window_type": "..."}}
          ],
          "finishes": {{
            "floor_material_en": "...",
            "wall_material_en": "...",
            "ceiling_material_en": "..."
          }}
        }}
      ]
    }}
  ]
}}

Here is the extracted data:
{data_json}"""


def map_semantics_with_gemini(parsed_data: dict, language: str = "he") -> dict:
    settings = get_settings()
    api_key = settings.gemini_api_key
    if not api_key:
        logger.warning("No Gemini API key — skipping semantic mapping")
        return {}

    compact_data = build_compact_input(parsed_data)
    data_json = json.dumps(compact_data, ensure_ascii=False, indent=2)
    prompt = SEMANTIC_MAPPING_PROMPT.format(data_json=data_json)

    client = genai.Client(api_key=api_key)
    response = client.models.generate_content(
        model=settings.gemini_model,
        contents=[prompt],
        config=types.GenerateContentConfig(
            temperature=0.1,
            max_output_tokens=4096,
        ),
    )

    if not response.text:
        logger.warning("Gemini returned empty response for semantic mapping")
        return {}

    text = response.text.strip()
    text = re.sub(r"^```(?:json)?\s*\n?", "", text)
    text = re.sub(r"\n?```\s*$", "", text).strip()

    try:
        return json.loads(text)
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse Gemini semantic response: {e}")
        return {}


def build_compact_input(parsed_data: dict) -> dict:
    floors = []
    for floor in parsed_data.get("floors", []):
        rooms = []
        for room in floor.get("rooms", []):
            compact_room = {"name": room.get("name", "")}
            if room.get("doors"):
                compact_room["doors"] = [
                    {"type_text": d.get("type_text", "")} for d in room["doors"]
                ]
            if room.get("windows"):
                compact_room["windows"] = [
                    {"type_text": w.get("type_text", "")} for w in room["windows"]
                ]
            finishes = room.get("finishes", {})
            if any(finishes.values()):
                compact_room["finishes"] = {
                    k: v for k, v in finishes.items() if v
                }
            rooms.append(compact_room)

        floors.append({
            "floor_number": floor.get("floor_number", 0),
            "floor_name": floor.get("floor_name", ""),
            "rooms": rooms,
        })
    return {"floors": floors}


def merge_semantic_mappings(parsed_data: dict, gemini_mappings: dict) -> dict:
    if not gemini_mappings or "floors" not in gemini_mappings:
        return parsed_data

    gemini_floors = {f["floor_number"]: f for f in gemini_mappings.get("floors", [])}

    for floor in parsed_data.get("floors", []):
        floor_num = floor.get("floor_number", 0)
        gemini_floor = gemini_floors.get(floor_num, {})

        if gemini_floor.get("floor_name_en"):
            floor["floor_name_en"] = gemini_floor["floor_name_en"]

        gemini_rooms = {}
        for gr in gemini_floor.get("rooms", []):
            orig = gr.get("original_name", "")
            if orig:
                gemini_rooms[orig] = gr

        for room in floor.get("rooms", []):
            gr = gemini_rooms.get(room.get("name", ""), {})
            if gr.get("room_type"):
                room["room_type"] = gr["room_type"]
            if gr.get("room_name_translated"):
                room["room_name_translated"] = gr["room_name_translated"]

            gemini_doors = gr.get("doors", [])
            for i, door in enumerate(room.get("doors", [])):
                if i < len(gemini_doors) and gemini_doors[i].get("door_type"):
                    door["door_type"] = gemini_doors[i]["door_type"]
                elif not door.get("door_type"):
                    door["door_type"] = "interior"

            gemini_windows = gr.get("windows", [])
            for i, window in enumerate(room.get("windows", [])):
                if i < len(gemini_windows) and gemini_windows[i].get("window_type"):
                    window["window_type"] = gemini_windows[i]["window_type"]
                elif not window.get("window_type"):
                    window["window_type"] = "standard"

            gemini_finishes = gr.get("finishes", {})
            finishes = room.get("finishes", {})
            if gemini_finishes.get("floor_material_en"):
                finishes["floor_material_en"] = gemini_finishes["floor_material_en"]
            if gemini_finishes.get("wall_material_en"):
                finishes["wall_material_en"] = gemini_finishes["wall_material_en"]
            if gemini_finishes.get("ceiling_material_en"):
                finishes["ceiling_material_en"] = gemini_finishes["ceiling_material_en"]

    return parsed_data
