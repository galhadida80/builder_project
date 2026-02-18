import json
import logging
from typing import Any

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[str, list[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, project_id: str):
        await websocket.accept()
        if project_id not in self.active_connections:
            self.active_connections[project_id] = []
        self.active_connections[project_id].append(websocket)
        logger.info(f"WebSocket connected for project {project_id}. Total: {len(self.active_connections[project_id])}")

    def disconnect(self, websocket: WebSocket, project_id: str):
        if project_id in self.active_connections:
            self.active_connections[project_id] = [
                ws for ws in self.active_connections[project_id] if ws != websocket
            ]
            if not self.active_connections[project_id]:
                del self.active_connections[project_id]
            logger.info(f"WebSocket disconnected from project {project_id}")

    async def broadcast_to_project(self, project_id: str, message_data: dict[str, Any]):
        if project_id not in self.active_connections:
            return
        disconnected = []
        message_json = json.dumps(message_data)
        for ws in self.active_connections[project_id]:
            try:
                await ws.send_text(message_json)
            except Exception:
                disconnected.append(ws)
        for ws in disconnected:
            self.disconnect(ws, project_id)

    def get_connection_count(self, project_id: str) -> int:
        return len(self.active_connections.get(project_id, []))


manager = ConnectionManager()
