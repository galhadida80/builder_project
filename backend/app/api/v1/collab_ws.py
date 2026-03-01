import json
import logging
from uuid import UUID

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decode_access_token
from app.db.session import AsyncSessionLocal
from app.models.collaborative_document import CollaborativeDocument, DocumentCollaborator
from app.utils import utcnow

logger = logging.getLogger(__name__)

router = APIRouter()


class CollabRoom:
    def __init__(self):
        self.connections: dict[str, WebSocket] = {}
        self.user_names: dict[str, str] = {}

    def add(self, user_id: str, ws: WebSocket, user_name: str):
        self.connections[user_id] = ws
        self.user_names[user_id] = user_name

    def remove(self, user_id: str):
        self.connections.pop(user_id, None)
        self.user_names.pop(user_id, None)

    def is_empty(self) -> bool:
        return len(self.connections) == 0

    def get_presence(self) -> list[dict]:
        return [
            {"userId": uid, "name": name}
            for uid, name in self.user_names.items()
        ]


collab_rooms: dict[str, CollabRoom] = {}


async def broadcast_to_room(room: CollabRoom, message: bytes | str, exclude_user: str | None = None):
    disconnected = []
    for uid, ws in room.connections.items():
        if uid == exclude_user:
            continue
        try:
            if isinstance(message, bytes):
                await ws.send_bytes(message)
            else:
                await ws.send_text(message)
        except Exception:
            disconnected.append(uid)
    for uid in disconnected:
        room.remove(uid)


async def broadcast_presence(room: CollabRoom, document_id: str):
    presence_msg = json.dumps({
        "type": "presence",
        "documentId": document_id,
        "users": room.get_presence(),
    })
    await broadcast_to_room(room, presence_msg)


async def mark_collaborator_active(db: AsyncSession, document_id: UUID, user_id: UUID, active: bool):
    result = await db.execute(
        select(DocumentCollaborator).where(
            DocumentCollaborator.document_id == document_id,
            DocumentCollaborator.user_id == user_id,
        )
    )
    collab = result.scalar_one_or_none()
    if collab:
        collab.is_active = active
        collab.last_seen_at = utcnow()
    elif active:
        collab = DocumentCollaborator(
            document_id=document_id,
            user_id=user_id,
            is_active=True,
            last_seen_at=utcnow(),
        )
        db.add(collab)
    await db.commit()


async def save_yjs_state(db: AsyncSession, document_id: UUID, state: bytes):
    await db.execute(
        update(CollaborativeDocument)
        .where(CollaborativeDocument.id == document_id)
        .values(yjs_state=state, updated_at=utcnow())
    )
    await db.commit()


async def get_user_name(db: AsyncSession, user_id: UUID) -> str:
    from app.models.user import User
    result = await db.execute(select(User.full_name).where(User.id == user_id))
    row = result.scalar_one_or_none()
    return row or "Unknown"


@router.websocket("/ws/collab/{document_id}")
async def collab_websocket(
    websocket: WebSocket,
    document_id: str,
    token: str = Query(None),
):
    if not token:
        await websocket.close(code=4001, reason="Authentication required")
        return

    user_id = decode_access_token(token)
    if not user_id:
        await websocket.close(code=4001, reason="Invalid token")
        return

    user_id_str = str(user_id)
    doc_uuid = UUID(document_id)

    async with AsyncSessionLocal() as db:
        doc_result = await db.execute(
            select(CollaborativeDocument.id).where(CollaborativeDocument.id == doc_uuid)
        )
        if not doc_result.scalar_one_or_none():
            await websocket.close(code=4004, reason="Document not found")
            return
        user_name = await get_user_name(db, UUID(user_id_str))

    await websocket.accept()

    if document_id not in collab_rooms:
        collab_rooms[document_id] = CollabRoom()
    room = collab_rooms[document_id]
    room.add(user_id_str, websocket, user_name)

    async with AsyncSessionLocal() as db:
        await mark_collaborator_active(db, doc_uuid, UUID(user_id_str), True)
        doc_result = await db.execute(
            select(CollaborativeDocument.yjs_state).where(CollaborativeDocument.id == doc_uuid)
        )
        yjs_state = doc_result.scalar_one_or_none()

    if yjs_state:
        try:
            await websocket.send_bytes(b"\x00" + yjs_state)
        except Exception:
            pass

    await broadcast_presence(room, document_id)

    try:
        while True:
            data = await websocket.receive()
            if "bytes" in data and data["bytes"]:
                raw = data["bytes"]
                msg_type = raw[0] if raw else None
                if msg_type in (0, 1):
                    await broadcast_to_room(room, raw, exclude_user=user_id_str)
                elif msg_type == 2:
                    await broadcast_to_room(room, raw, exclude_user=user_id_str)
                    async with AsyncSessionLocal() as db:
                        await save_yjs_state(db, doc_uuid, raw[1:])
            elif "text" in data and data["text"]:
                try:
                    msg = json.loads(data["text"])
                    if msg.get("type") == "cursor":
                        cursor_msg = json.dumps({
                            "type": "cursor",
                            "userId": user_id_str,
                            "name": user_name,
                            "position": msg.get("position"),
                        })
                        await broadcast_to_room(room, cursor_msg, exclude_user=user_id_str)
                except (json.JSONDecodeError, KeyError):
                    pass
    except WebSocketDisconnect:
        pass
    except Exception:
        logger.exception("WebSocket error for document %s", document_id)
    finally:
        room.remove(user_id_str)
        if room.is_empty():
            collab_rooms.pop(document_id, None)
        else:
            await broadcast_presence(room, document_id)
        async with AsyncSessionLocal() as db:
            await mark_collaborator_active(db, doc_uuid, UUID(user_id_str), False)
