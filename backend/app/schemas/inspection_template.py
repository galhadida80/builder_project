from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field, field_validator
from app.core.validators import (
    sanitize_string,
    MIN_NAME_LENGTH, MAX_NAME_LENGTH
)


class InspectionConsultantTypeResponse(BaseModel):
    id: UUID
    name: str
    name_he: str
    category: str
    created_at: datetime

    class Config:
        from_attributes = True
