from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.security import get_current_user, verify_project_access
from app.db.session import get_db
from app.models.discussion import Discussion
from app.models.user import User
from app.schemas.discussion import DiscussionCreate, DiscussionResponse, DiscussionUpdate
from app.services.websocket_manager import manager

router = APIRouter()

DISCUSSION_LOAD_OPTIONS = [
    selectinload(Discussion.author),
    selectinload(Discussion.replies).selectinload(Discussion.author),
]


@router.get("/projects/{project_id}/discussions", response_model=list[DiscussionResponse])
async def list_discussions(
    project_id: UUID,
    entity_type: str = Query(...),
    entity_id: UUID = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await verify_project_access(project_id, current_user, db)

    result = await db.execute(
        select(Discussion)
        .options(*DISCUSSION_LOAD_OPTIONS)
        .where(
            Discussion.project_id == project_id,
            Discussion.entity_type == entity_type,
            Discussion.entity_id == entity_id,
            Discussion.parent_id.is_(None),
        )
        .order_by(Discussion.created_at.asc())
    )
    return result.scalars().all()


@router.post("/projects/{project_id}/discussions", response_model=DiscussionResponse)
async def create_discussion(
    project_id: UUID,
    data: DiscussionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await verify_project_access(project_id, current_user, db)

    if data.parent_id:
        parent_result = await db.execute(
            select(Discussion).where(
                Discussion.id == data.parent_id,
                Discussion.project_id == project_id,
            )
        )
        if not parent_result.scalar_one_or_none():
            raise HTTPException(status_code=404, detail="Parent discussion not found")

    discussion = Discussion(
        project_id=project_id,
        entity_type=data.entity_type,
        entity_id=data.entity_id,
        author_id=current_user.id,
        parent_id=data.parent_id,
        content=data.content,
    )
    db.add(discussion)
    await db.flush()

    result = await db.execute(
        select(Discussion)
        .options(selectinload(Discussion.author))
        .where(Discussion.id == discussion.id)
    )
    created = result.scalar_one()

    await manager.broadcast_to_project(str(project_id), {
        "type": "discussion_created",
        "entityType": data.entity_type,
        "entityId": str(data.entity_id),
        "discussionId": str(created.id),
        "authorName": current_user.full_name,
    })

    return created


@router.put("/projects/{project_id}/discussions/{discussion_id}", response_model=DiscussionResponse)
async def update_discussion(
    project_id: UUID,
    discussion_id: UUID,
    data: DiscussionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await verify_project_access(project_id, current_user, db)

    result = await db.execute(
        select(Discussion).where(
            Discussion.id == discussion_id,
            Discussion.project_id == project_id,
        )
    )
    discussion = result.scalar_one_or_none()
    if not discussion:
        raise HTTPException(status_code=404, detail="Discussion not found")

    if discussion.author_id != current_user.id and not current_user.is_super_admin:
        raise HTTPException(status_code=403, detail="You can only edit your own comments")

    discussion.content = data.content

    result = await db.execute(
        select(Discussion)
        .options(selectinload(Discussion.author))
        .where(Discussion.id == discussion.id)
    )
    return result.scalar_one()


@router.delete("/projects/{project_id}/discussions/{discussion_id}")
async def delete_discussion(
    project_id: UUID,
    discussion_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await verify_project_access(project_id, current_user, db)

    result = await db.execute(
        select(Discussion).where(
            Discussion.id == discussion_id,
            Discussion.project_id == project_id,
        )
    )
    discussion = result.scalar_one_or_none()
    if not discussion:
        raise HTTPException(status_code=404, detail="Discussion not found")

    if discussion.author_id != current_user.id and not current_user.is_super_admin:
        raise HTTPException(status_code=403, detail="You can only delete your own comments")

    await db.delete(discussion)
    return {"message": "Discussion deleted"}
