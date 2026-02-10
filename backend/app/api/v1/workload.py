import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_user, verify_project_access
from app.db.session import get_db
from app.models.project import ProjectMember
from app.models.user import User
from app.schemas.workload import TeamMemberResponse, UserInfo, WorkloadResponse

router = APIRouter()


@router.get("/team-members", response_model=list[TeamMemberResponse])
async def get_team_members(
    project_id: Optional[uuid.UUID] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if project_id:
        await verify_project_access(project_id, current_user, db)
        result = await db.execute(
            select(ProjectMember, User)
            .join(User, ProjectMember.user_id == User.id)
            .where(ProjectMember.project_id == project_id)
        )
        rows = result.all()
        return [
            TeamMemberResponse(
                id=member.id,
                userId=user.id,
                user=UserInfo(id=user.id, email=user.email, fullName=user.full_name),
                role=member.role or "team_member",
                teamName=member.role or "General",
                workloadPercent=75,
                assignedHours=30,
                availableHours=40,
                createdAt=datetime.utcnow().isoformat()
            )
            for member, user in rows
        ]
    else:
        result = await db.execute(select(User).where(User.is_active == True))
        users = result.scalars().all()
        return [
            TeamMemberResponse(
                id=user.id,
                userId=user.id,
                user=UserInfo(id=user.id, email=user.email, fullName=user.full_name),
                role=user.role or "team_member",
                teamName=user.company or "General",
                workloadPercent=75,
                assignedHours=30,
                availableHours=40,
                createdAt=datetime.utcnow().isoformat()
            )
            for user in users
        ]


@router.get("/workload", response_model=list[WorkloadResponse])
async def get_workload(
    start_date: Optional[str] = Query(None, alias="startDate"),
    end_date: Optional[str] = Query(None, alias="endDate"),
    project_id: Optional[uuid.UUID] = Query(None, alias="projectId"),
    user_id: Optional[uuid.UUID] = Query(None, alias="userId"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return []


@router.get("/projects/{project_id}/members", response_model=list[TeamMemberResponse])
async def get_project_members(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    await verify_project_access(project_id, current_user, db)
    result = await db.execute(
        select(ProjectMember, User)
        .join(User, ProjectMember.user_id == User.id)
        .where(ProjectMember.project_id == project_id)
    )
    rows = result.all()
    return [
        TeamMemberResponse(
            id=member.id,
            userId=user.id,
            user=UserInfo(id=user.id, email=user.email, fullName=user.full_name),
            role=member.role or "team_member",
            teamName=member.role or "General",
            workloadPercent=75,
            assignedHours=30,
            availableHours=40,
            createdAt=datetime.utcnow().isoformat()
        )
        for member, user in rows
    ]


@router.get("/team-members/{team_member_id}/assignments")
async def get_member_assignments(
    team_member_id: uuid.UUID,
    start_date: Optional[str] = Query(None, alias="startDate"),
    end_date: Optional[str] = Query(None, alias="endDate"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return []
