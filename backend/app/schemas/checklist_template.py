from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from app.core.validators import MAX_DESCRIPTION_LENGTH, MAX_NAME_LENGTH, MIN_NAME_LENGTH, sanitize_string


class ChecklistItemTemplateBase(BaseModel):
    name: str = Field(min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)
    name_he: str = Field(min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)
    description: str | None = Field(default=None, max_length=MAX_DESCRIPTION_LENGTH)
    description_he: str | None = Field(default=None, max_length=MAX_DESCRIPTION_LENGTH)
    order_position: int = Field(default=0, ge=0)

    @field_validator('name', 'name_he', 'description', 'description_he', mode='before')
    @classmethod
    def sanitize_text(cls, v: str | None) -> str | None:
        return sanitize_string(v)


class ChecklistItemTemplateCreate(ChecklistItemTemplateBase):
    pass


class ChecklistItemTemplateUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)
    name_he: str | None = Field(default=None, min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)
    description: str | None = Field(default=None, max_length=MAX_DESCRIPTION_LENGTH)
    description_he: str | None = Field(default=None, max_length=MAX_DESCRIPTION_LENGTH)
    order_position: int | None = Field(default=None, ge=0)

    @field_validator('name', 'name_he', 'description', 'description_he', mode='before')
    @classmethod
    def sanitize_text(cls, v: str | None) -> str | None:
        return sanitize_string(v)


class ChecklistItemTemplateResponse(BaseModel):
    id: UUID
    subsection_id: UUID
    name: str
    name_he: str
    description: str | None = None
    description_he: str | None = None
    order_position: int = 0
    created_at: datetime

    class Config:
        from_attributes = True


class ChecklistSubSectionBase(BaseModel):
    name: str = Field(min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)
    name_he: str = Field(min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)
    description: str | None = Field(default=None, max_length=MAX_DESCRIPTION_LENGTH)
    description_he: str | None = Field(default=None, max_length=MAX_DESCRIPTION_LENGTH)
    order_position: int = Field(default=0, ge=0)

    @field_validator('name', 'name_he', 'description', 'description_he', mode='before')
    @classmethod
    def sanitize_text(cls, v: str | None) -> str | None:
        return sanitize_string(v)


class ChecklistSubSectionCreate(ChecklistSubSectionBase):
    pass


class ChecklistSubSectionUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)
    name_he: str | None = Field(default=None, min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)
    description: str | None = Field(default=None, max_length=MAX_DESCRIPTION_LENGTH)
    description_he: str | None = Field(default=None, max_length=MAX_DESCRIPTION_LENGTH)
    order_position: int | None = Field(default=None, ge=0)

    @field_validator('name', 'name_he', 'description', 'description_he', mode='before')
    @classmethod
    def sanitize_text(cls, v: str | None) -> str | None:
        return sanitize_string(v)


class ChecklistSubSectionResponse(BaseModel):
    id: UUID
    template_id: UUID
    name: str
    name_he: str
    description: str | None = None
    description_he: str | None = None
    order_position: int = 0
    created_at: datetime
    items: list[ChecklistItemTemplateResponse] = []

    class Config:
        from_attributes = True


class ChecklistTemplateBase(BaseModel):
    name: str = Field(min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)
    name_he: str = Field(min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)
    description: str | None = Field(default=None, max_length=MAX_DESCRIPTION_LENGTH)
    description_he: str | None = Field(default=None, max_length=MAX_DESCRIPTION_LENGTH)
    level: str | None = Field(default=None, max_length=50)
    group_name: str | None = Field(default=None, max_length=MAX_NAME_LENGTH)
    is_active: bool = Field(default=True)

    @field_validator('name', 'name_he', 'description', 'description_he', 'level', 'group_name', mode='before')
    @classmethod
    def sanitize_text(cls, v: str | None) -> str | None:
        return sanitize_string(v)


class ChecklistTemplateCreate(ChecklistTemplateBase):
    pass


class ChecklistTemplateUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)
    name_he: str | None = Field(default=None, min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)
    description: str | None = Field(default=None, max_length=MAX_DESCRIPTION_LENGTH)
    description_he: str | None = Field(default=None, max_length=MAX_DESCRIPTION_LENGTH)
    level: str | None = Field(default=None, max_length=50)
    group_name: str | None = Field(default=None, max_length=MAX_NAME_LENGTH)
    is_active: bool | None = Field(default=None)

    @field_validator('name', 'name_he', 'description', 'description_he', 'level', 'group_name', mode='before')
    @classmethod
    def sanitize_text(cls, v: str | None) -> str | None:
        return sanitize_string(v)


class ChecklistTemplateResponse(BaseModel):
    id: UUID
    name: str
    name_he: str
    description: str | None = None
    description_he: str | None = None
    level: str | None = None
    group_name: str | None = None
    is_active: bool = True
    created_at: datetime
    sub_sections: list[ChecklistSubSectionResponse] = []

    class Config:
        from_attributes = True


class ChecklistInstanceCreate(BaseModel):
    project_id: UUID
    template_id: UUID
    status: str | None = Field(default=None, max_length=50)
    notes: str | None = Field(default=None, max_length=MAX_DESCRIPTION_LENGTH)

    @field_validator('status', 'notes', mode='before')
    @classmethod
    def sanitize_text(cls, v: str | None) -> str | None:
        return sanitize_string(v)


class ChecklistInstanceUpdate(BaseModel):
    status: str | None = Field(default=None, max_length=50)
    notes: str | None = Field(default=None, max_length=MAX_DESCRIPTION_LENGTH)

    @field_validator('status', 'notes', mode='before')
    @classmethod
    def sanitize_text(cls, v: str | None) -> str | None:
        return sanitize_string(v)


class ChecklistInstanceResponse(BaseModel):
    id: UUID
    project_id: UUID
    template_id: UUID
    status: str | None = None
    notes: str | None = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ChecklistItemResponseCreate(BaseModel):
    instance_id: UUID
    item_template_id: UUID
    is_completed: bool = Field(default=False)
    response_text: str | None = Field(default=None, max_length=MAX_DESCRIPTION_LENGTH)

    @field_validator('response_text', mode='before')
    @classmethod
    def sanitize_text(cls, v: str | None) -> str | None:
        return sanitize_string(v)


class ChecklistItemResponseUpdate(BaseModel):
    is_completed: bool | None = None
    response_text: str | None = Field(default=None, max_length=MAX_DESCRIPTION_LENGTH)

    @field_validator('response_text', mode='before')
    @classmethod
    def sanitize_text(cls, v: str | None) -> str | None:
        return sanitize_string(v)


class ChecklistItemResponseResponse(BaseModel):
    id: UUID
    instance_id: UUID
    item_template_id: UUID
    is_completed: bool = False
    response_text: str | None = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
