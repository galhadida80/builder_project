import asyncio
import logging
from functools import partial

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from pydantic import ValidationError

from app.core.security import get_current_user
from app.models.user import User
from app.schemas.quantity_extraction import QuantityExtractionResponse
from app.services.quantity_extraction_service import extract_quantities

logger = logging.getLogger(__name__)
router = APIRouter()

MAX_FILE_SIZE = 20 * 1024 * 1024  # 20MB


@router.post("/tools/extract-quantities", response_model=QuantityExtractionResponse)
async def extract_quantities_endpoint(
    file: UploadFile = File(...),
    language: str = Query(default="he", pattern="^(he|en)$"),
    current_user: User = Depends(get_current_user),
):
    if not file.content_type or file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File size exceeds 20MB limit")

    try:
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            partial(extract_quantities, file_content=content, file_type=file.content_type, language=language),
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to extract quantities: {e}")

    data = result.get("result", {})
    if not isinstance(data, dict):
        data = {}

    try:
        return QuantityExtractionResponse(
            floors=data.get("floors", []),
            summary=data.get("summary", {}),
            processing_time_ms=result.get("processing_time_ms", 0),
        )
    except ValidationError as e:
        logger.warning(f"Quantity extraction response validation failed: {e}")
        return QuantityExtractionResponse(
            floors=[],
            summary={},
            processing_time_ms=result.get("processing_time_ms", 0),
        )
