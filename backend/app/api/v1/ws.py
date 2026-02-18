from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query

from app.core.security import decode_access_token
from app.services.websocket_manager import manager

router = APIRouter()


@router.websocket("/ws/{project_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    project_id: str,
    token: str = Query(None),
):
    user_id = None
    if token:
        user_id = decode_access_token(token)

    await manager.connect(websocket, project_id)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, project_id)
