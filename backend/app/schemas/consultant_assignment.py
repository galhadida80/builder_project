from uuid import UUID
from datetime import datetime, date
from typing import Literal
from pydantic import BaseModel, Field, field_validator, model_validator
from app.schemas.user import UserResponse
from app.schemas.project import ProjectResponse
from app.schemas.equipment_template import ConsultantTypeResponse
from app.core.validators import (
    sanitize_string,
    MAX_NOTES_LENGTH,
    CamelCaseModel
)


class ConsultantAssignmentBase(BaseModel):
    consultant_id: UUID
    project_id: UUID
    consultant_type_id: UUID | None = None
    start_date: date
    end_date: date
    status: Literal["pending", "active", "completed", "cancelled"] = "pending"
    notes: str | None = Field(default=None, max_length=MAX_NOTES_LENGTH)

    @field_validator('notes', mode='before')
    @classmethod
    def sanitize_text(cls, v: str | None) -> str | None:
        return sanitize_string(v)

    @model_validator(mode='after')
    def validate_dates(self):
        if self.start_date and self.end_date and self.end_date < self.start_date:
            raise ValueError('end_date must be after or equal to start_date')
        return self


class ConsultantAssignmentCreate(ConsultantAssignmentBase):
    pass


class ConsultantAssignmentUpdate(BaseModel):
    consultant_id: UUID | None = None
    project_id: UUID | None = None
    consultant_type_id: UUID | None = None
    start_date: date | None = None
    end_date: date | None = None
    status: Literal["pending", "active", "completed", "cancelled"] | None = None
    notes: str | None = Field(default=None, max_length=MAX_NOTES_LENGTH)

    @field_validator('notes', mode='before')
    @classmethod
    def sanitize_text(cls, v: str | None) -> str | None:
        return sanitize_string(v)

    @model_validator(mode='after')
    def validate_dates(self):
        if self.start_date and self.end_date and self.end_date < self.start_date:
            raise ValueError('end_date must be after or equal to start_date')
        return self


class ConsultantAssignmentResponse(CamelCaseModel):
    id: UUID
    consultant_id: UUID
    project_id: UUID
    consultant_type_id: UUID | None = None
    start_date: date
    end_date: date
    status: str
    notes: str | None = None
    created_at: datetime
    updated_at: datetime
    consultant: UserResponse | None = None
    project: ProjectResponse | None = None
    consultant_type: ConsultantTypeResponse | None = None
