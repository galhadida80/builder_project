from uuid import UUID
from datetime import datetime, date
from pydantic import BaseModel
from app.schemas.user import UserResponse


class ProjectBase(BaseModel):
    name: str
    code: str
    description: str | None = None
    address: str | None = None
    start_date: date | None = None
    estimated_end_date: date | None = None


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    address: str | None = None
    start_date: date | None = None
    estimated_end_date: date | None = None
    status: str | None = None


class ProjectMemberCreate(BaseModel):
    user_id: UUID
    role: str


class ProjectMemberResponse(BaseModel):
    id: UUID
    user_id: UUID
    user: UserResponse
    role: str
    joined_at: datetime

    class Config:
        from_attributes = True


class ProjectResponse(ProjectBase):
    id: UUID
    status: str
    created_at: datetime
    updated_at: datetime
    members: list[ProjectMemberResponse] = []

    class Config:
        from_attributes = True
