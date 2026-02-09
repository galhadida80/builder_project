from uuid import UUID
from datetime import datetime
from typing import Literal
from pydantic import BaseModel, Field, field_validator, model_validator
from app.schemas.user import UserResponse
from app.core.validators import (
    sanitize_string,
    MIN_NAME_LENGTH, MAX_NAME_LENGTH, MAX_NOTES_LENGTH, MAX_DESCRIPTION_LENGTH
)


class DocumentDefinition(BaseModel):
    name: str = Field(min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)
    name_he: str = Field(min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)
    description: str | None = Field(default=None, max_length=MAX_DESCRIPTION_LENGTH)
    source: Literal["consultant", "project_manager", "contractor"]
    required: bool = True

    @field_validator('name', 'name_he', 'description', mode='before')
    @classmethod
    def sanitize_text(cls, v: str | None) -> str | None:
        return sanitize_string(v)


class SpecificationDefinition(BaseModel):
    name: str = Field(min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)
    name_he: str = Field(min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)
    field_type: Literal["text", "number", "boolean", "select", "file"]
    options: list[str] | None = Field(default=None, max_length=50)
    unit: str | None = Field(default=None, max_length=50)
    required: bool = True

    @field_validator('name', 'name_he', 'unit', mode='before')
    @classmethod
    def sanitize_text(cls, v: str | None) -> str | None:
        return sanitize_string(v)

    @field_validator('options', mode='before')
    @classmethod
    def sanitize_options(cls, v: list[str] | None) -> list[str] | None:
        if v is None:
            return None
        return [sanitize_string(option) or '' for option in v]

    @model_validator(mode='after')
    def validate_options(self):
        # Options field should only be present when field_type is "select"
        if self.field_type == "select":
            if self.options is None or len(self.options) == 0:
                raise ValueError('options field is required and must not be empty when field_type is "select"')
        else:
            if self.options is not None:
                raise ValueError('options field is only valid when field_type is "select"')
        return self


class ChecklistItemDefinition(BaseModel):
    name: str = Field(min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)
    name_he: str = Field(min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)
    requires_file: bool = False

    @field_validator('name', 'name_he', mode='before')
    @classmethod
    def sanitize_text(cls, v: str | None) -> str | None:
        return sanitize_string(v)


class EquipmentTemplateBase(BaseModel):
    name: str = Field(min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)
    name_he: str = Field(min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)
    category: str | None = Field(default=None, max_length=MAX_NAME_LENGTH)
    description: str | None = Field(default=None, max_length=MAX_DESCRIPTION_LENGTH)
    required_documents: list[DocumentDefinition] = Field(default=[], max_length=100)
    required_specifications: list[SpecificationDefinition] = Field(default=[], max_length=100)
    submission_checklist: list[ChecklistItemDefinition] = Field(default=[], max_length=100)

    @field_validator('name', 'name_he', 'category', 'description', mode='before')
    @classmethod
    def sanitize_text(cls, v: str | None) -> str | None:
        return sanitize_string(v)


class EquipmentTemplateCreate(EquipmentTemplateBase):
    pass


class EquipmentTemplateUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)
    name_he: str | None = Field(default=None, min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)
    category: str | None = Field(default=None, max_length=MAX_NAME_LENGTH)
    description: str | None = Field(default=None, max_length=MAX_DESCRIPTION_LENGTH)
    required_documents: list[DocumentDefinition] | None = Field(default=None, max_length=100)
    required_specifications: list[SpecificationDefinition] | None = Field(default=None, max_length=100)
    submission_checklist: list[ChecklistItemDefinition] | None = Field(default=None, max_length=100)

    @field_validator('name', 'name_he', 'category', 'description', mode='before')
    @classmethod
    def sanitize_text(cls, v: str | None) -> str | None:
        return sanitize_string(v)


class ConsultantTypeBase(BaseModel):
    name: str = Field(min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)
    name_he: str = Field(min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)
    category: str = Field(min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)

    @field_validator('name', 'name_he', 'category', mode='before')
    @classmethod
    def sanitize_text(cls, v: str | None) -> str | None:
        return sanitize_string(v)


class ConsultantTypeCreate(ConsultantTypeBase):
    pass


class ConsultantTypeUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)
    name_he: str | None = Field(default=None, min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)
    category: str | None = Field(default=None, min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)

    @field_validator('name', 'name_he', 'category', mode='before')
    @classmethod
    def sanitize_text(cls, v: str | None) -> str | None:
        return sanitize_string(v)


class ConsultantTypeResponse(BaseModel):
    id: UUID
    name: str
    name_he: str
    category: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class EquipmentTemplateResponse(BaseModel):
    id: UUID
    name: str
    name_he: str
    category: str | None = None
    description: str | None = None
    required_documents: list = Field(default=[])
    required_specifications: list = Field(default=[])
    submission_checklist: list = Field(default=[])
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class EquipmentTemplateWithConsultantsResponse(EquipmentTemplateResponse):
    approving_consultants: list[ConsultantTypeResponse] = []


class EquipmentApprovalSubmissionBase(BaseModel):
    comments: str | None = Field(default=None, max_length=MAX_NOTES_LENGTH)

    @field_validator('comments', mode='before')
    @classmethod
    def sanitize_text(cls, v: str | None) -> str | None:
        return sanitize_string(v)


class EquipmentApprovalSubmissionCreate(EquipmentApprovalSubmissionBase):
    equipment_id: UUID


class EquipmentApprovalSubmissionUpdate(BaseModel):
    comments: str | None = Field(default=None, max_length=MAX_NOTES_LENGTH)

    @field_validator('comments', mode='before')
    @classmethod
    def sanitize_text(cls, v: str | None) -> str | None:
        return sanitize_string(v)


class EquipmentApprovalSubmissionResponse(BaseModel):
    id: UUID
    equipment_id: UUID
    status: str
    comments: str | None = None
    submitted_at: datetime
    decided_at: datetime | None = None
    created_by: UserResponse | None = None
    decided_by: UserResponse | None = None

    class Config:
        from_attributes = True


class EquipmentApprovalDecisionCreate(BaseModel):
    submission_id: UUID
    decision: Literal["approved", "rejected"]
    comments: str | None = Field(default=None, max_length=MAX_NOTES_LENGTH)

    @field_validator('comments', mode='before')
    @classmethod
    def sanitize_text(cls, v: str | None) -> str | None:
        return sanitize_string(v)


class EquipmentApprovalDecisionResponse(BaseModel):
    id: UUID
    submission_id: UUID
    decision: str
    comments: str | None = None
    decided_at: datetime
    decided_by: UserResponse | None = None
    created_at: datetime

    class Config:
        from_attributes = True
