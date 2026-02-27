from __future__ import annotations

from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel

from app.core.validators import CamelCaseModel
from app.schemas.user import UserResponse


class BimModelResponse(CamelCaseModel):
    id: UUID
    project_id: UUID
    filename: str
    file_size: Optional[int] = None
    urn: Optional[str] = None
    translation_status: str = "uploaded"
    translation_progress: int = 0
    metadata_json: Optional[Any] = None
    uploaded_by_id: Optional[UUID] = None
    uploaded_by: Optional[UserResponse] = None
    created_at: datetime
    updated_at: datetime


class TranslationStatusResponse(CamelCaseModel):
    translation_status: str
    translation_progress: int


class AutodeskConnectionResponse(CamelCaseModel):
    id: UUID
    user_id: UUID
    acc_account_id: Optional[str] = None
    token_expires_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


class OAuthCallbackParams(BaseModel):
    code: str
    state: str


class ViewerTokenResponse(CamelCaseModel):
    access_token: str
    expires_in: int


class BimExtractedArea(CamelCaseModel):
    bim_object_id: int
    name: str
    area_type: Optional[str] = None
    floor_number: Optional[int] = None
    area_code: Optional[str] = None


class BimExtractedEquipment(CamelCaseModel):
    bim_object_id: int
    name: str
    equipment_type: Optional[str] = None
    manufacturer: Optional[str] = None
    model_number: Optional[str] = None
    specifications: Optional[dict] = None
    matched_template_id: Optional[str] = None
    matched_template_name: Optional[str] = None
    confidence: float = 0.0


class BimExtractedMaterial(CamelCaseModel):
    bim_object_id: int
    name: str
    material_type: Optional[str] = None
    manufacturer: Optional[str] = None
    model_number: Optional[str] = None
    matched_template_id: Optional[str] = None
    matched_template_name: Optional[str] = None
    confidence: float = 0.0


class BimExtractionResponse(CamelCaseModel):
    model_id: UUID
    extracted_at: Optional[str] = None
    areas: list[BimExtractedArea] = []
    equipment: list[BimExtractedEquipment] = []
    materials: list[BimExtractedMaterial] = []
    total_objects: int = 0


class BimImportItemMapping(BaseModel):
    bim_object_id: int
    template_id: Optional[str] = None


class BimImportRequest(BaseModel):
    items: list[int] = []
    item_mappings: list[BimImportItemMapping] = []


class BimImportResult(CamelCaseModel):
    imported_count: int
    skipped_count: int
    linked_count: int = 0
    entity_type: str
