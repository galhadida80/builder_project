from typing import Optional
from uuid import UUID

from pydantic import BaseModel


class UserInfo(BaseModel):
    id: UUID
    email: str
    fullName: Optional[str] = None

    class Config:
        from_attributes = True


class TeamMemberResponse(BaseModel):
    id: UUID
    userId: UUID
    user: UserInfo
    role: str = "team_member"
    teamName: Optional[str] = None
    workloadPercent: int = 0
    assignedHours: int = 0
    availableHours: int = 40
    createdAt: str = ""

    class Config:
        from_attributes = True


class WorkloadResponse(BaseModel):
    id: UUID
    teamMemberId: UUID
    periodStart: str
    periodEnd: str
    totalHours: int
    assignedHours: int
    workloadPercent: int

    class Config:
        from_attributes = True
