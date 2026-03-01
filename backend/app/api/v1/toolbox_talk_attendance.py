import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.permissions import Permission, require_permission
from app.core.security import get_current_user, verify_project_access
from app.db.session import get_db
from app.models.toolbox_talk import ToolboxTalk, TalkAttendee
from app.models.user import User
from app.schemas.toolbox_talk import TalkAttendeeCreate, TalkAttendeeResponse
from app.utils import utcnow

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/toolbox-talks/{talk_id}/attendees", response_model=TalkAttendeeResponse)
async def add_attendee(
    talk_id: UUID,
    attendee_data: TalkAttendeeCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _=require_permission(Permission.EDIT),
):
    result = await db.execute(select(ToolboxTalk).where(ToolboxTalk.id == talk_id))
    talk = result.scalar_one_or_none()

    if not talk:
        raise HTTPException(status_code=404, detail="Toolbox talk not found")

    await verify_project_access(db, current_user.id, talk.project_id)

    attendee = TalkAttendee(
        talk_id=talk_id,
        worker_id=attendee_data.worker_id,
        worker_name=attendee_data.worker_name,
        attended=attendee_data.attended,
    )

    db.add(attendee)
    await db.commit()
    await db.refresh(attendee)

    return attendee


@router.put("/toolbox-talks/{talk_id}/attendance/{attendee_id}", response_model=TalkAttendeeResponse)
async def update_attendance(
    talk_id: UUID,
    attendee_id: UUID,
    attended: bool = Query(..., description="Attendance status"),
    signature: str | None = Query(None, description="Digital signature"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _=require_permission(Permission.EDIT),
):
    result = await db.execute(
        select(TalkAttendee).where(
            TalkAttendee.id == attendee_id,
            TalkAttendee.talk_id == talk_id
        )
    )
    attendee = result.scalar_one_or_none()

    if not attendee:
        raise HTTPException(status_code=404, detail="Attendee not found")

    # Verify project access through talk
    result = await db.execute(select(ToolboxTalk).where(ToolboxTalk.id == talk_id))
    talk = result.scalar_one_or_none()
    if not talk:
        raise HTTPException(status_code=404, detail="Toolbox talk not found")

    await verify_project_access(db, current_user.id, talk.project_id)

    attendee.attended = attended
    if signature:
        attendee.signature = signature
        attendee.signed_at = utcnow()

    await db.commit()
    await db.refresh(attendee)

    return attendee


@router.get("/toolbox-talks/{talk_id}/summary")
async def get_attendance_summary(
    talk_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(ToolboxTalk).where(ToolboxTalk.id == talk_id))
    talk = result.scalar_one_or_none()

    if not talk:
        raise HTTPException(status_code=404, detail="Toolbox talk not found")

    await verify_project_access(db, current_user.id, talk.project_id)

    # Get attendance stats
    total_result = await db.execute(
        select(func.count()).where(TalkAttendee.talk_id == talk_id)
    )
    total_attendees = total_result.scalar() or 0

    attended_result = await db.execute(
        select(func.count()).where(
            TalkAttendee.talk_id == talk_id,
            TalkAttendee.attended == True
        )
    )
    total_attended = attended_result.scalar() or 0

    signed_result = await db.execute(
        select(func.count()).where(
            TalkAttendee.talk_id == talk_id,
            TalkAttendee.signature.isnot(None)
        )
    )
    total_signed = signed_result.scalar() or 0

    return {
        "talkId": str(talk_id),
        "totalAttendees": total_attendees,
        "totalAttended": total_attended,
        "totalSigned": total_signed,
        "attendanceRate": round((total_attended / total_attendees * 100) if total_attendees > 0 else 0, 2),
        "signatureRate": round((total_signed / total_attendees * 100) if total_attendees > 0 else 0, 2),
    }
