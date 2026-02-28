import asyncio
import base64
import time
import urllib.parse
from datetime import datetime, timedelta
from typing import Any, Optional
from uuid import UUID

import httpx
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings
from app.models.bim import AutodeskConnection
from app.utils import utcnow

APS_BASE_URL = "https://developer.api.autodesk.com"


class APSService:
    cached_token: Optional[str] = None
    token_expires_at: float = 0
    token_lock: asyncio.Lock = asyncio.Lock()

    def __init__(self, settings: Settings):
        self.client_id = settings.aps_client_id
        self.client_secret = settings.aps_client_secret
        self.callback_url = settings.aps_callback_url

    async def get_2legged_token(self) -> str:
        if APSService.cached_token and time.time() < APSService.token_expires_at:
            return APSService.cached_token

        async with APSService.token_lock:
            if APSService.cached_token and time.time() < APSService.token_expires_at:
                return APSService.cached_token

            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    f"{APS_BASE_URL}/authentication/v2/token",
                    data={
                        "grant_type": "client_credentials",
                        "scope": "data:read data:write data:create bucket:read bucket:create",
                    },
                    headers={"Content-Type": "application/x-www-form-urlencoded"},
                    auth=(self.client_id, self.client_secret),
                )
                resp.raise_for_status()
                data = resp.json()

            APSService.cached_token = data["access_token"]
            APSService.token_expires_at = time.time() + data.get("expires_in", 3600) - 60
            return APSService.cached_token

    async def ensure_bucket(self, bucket_key: str) -> dict[str, Any]:
        token = await self.get_2legged_token()
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{APS_BASE_URL}/oss/v2/buckets",
                json={
                    "bucketKey": bucket_key,
                    "policyKey": "persistent",
                },
                headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            )
            if resp.status_code == 409:
                return {"bucketKey": bucket_key}
            resp.raise_for_status()
            return resp.json()

    async def upload_object(self, bucket_key: str, object_key: str, content: bytes, content_type: str) -> dict[str, Any]:
        token = await self.get_2legged_token()
        async with httpx.AsyncClient(timeout=300.0) as client:
            resp = await client.put(
                f"{APS_BASE_URL}/oss/v2/buckets/{bucket_key}/objects/{urllib.parse.quote(object_key, safe='')}",
                content=content,
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": content_type,
                },
            )
            resp.raise_for_status()
            return resp.json()

    async def translate_model(self, urn: str) -> dict[str, Any]:
        token = await self.get_2legged_token()
        encoded_urn = base64.urlsafe_b64encode(urn.encode()).decode().rstrip("=")
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{APS_BASE_URL}/modelderivative/v2/designdata/job",
                json={
                    "input": {"urn": encoded_urn},
                    "output": {
                        "formats": [
                            {
                                "type": "svf2",
                                "views": ["2d", "3d"],
                                "advanced": {"generateMasterViews": True},
                            }
                        ]
                    },
                },
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json",
                    "x-ads-force": "true",
                },
            )
            resp.raise_for_status()
            return resp.json()

    async def get_translation_status(self, urn: str) -> dict[str, Any]:
        token = await self.get_2legged_token()
        encoded_urn = base64.urlsafe_b64encode(urn.encode()).decode().rstrip("=")
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{APS_BASE_URL}/modelderivative/v2/designdata/{encoded_urn}/manifest",
                headers={"Authorization": f"Bearer {token}"},
            )
            resp.raise_for_status()
            data = resp.json()

        status = data.get("status", "pending")
        progress_str = data.get("progress", "0%")
        try:
            progress = int(progress_str.replace("%", "").replace("complete", "100")) if isinstance(progress_str, str) else 0
        except (ValueError, TypeError):
            progress = 0

        status_map = {
            "pending": "translating",
            "inprogress": "translating",
            "success": "complete",
            "failed": "failed",
            "timeout": "failed",
        }
        return {
            "status": status_map.get(status, "translating"),
            "progress": min(progress, 100),
        }

    def get_auth_url(self, state: str) -> str:
        params = urllib.parse.urlencode({
            "response_type": "code",
            "client_id": self.client_id,
            "redirect_uri": self.callback_url,
            "scope": "data:read data:write data:create account:read",
            "state": state,
        })
        return f"{APS_BASE_URL}/authentication/v2/authorize?{params}"

    async def exchange_code(self, code: str) -> dict[str, Any]:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{APS_BASE_URL}/authentication/v2/token",
                data={
                    "grant_type": "authorization_code",
                    "code": code,
                    "redirect_uri": self.callback_url,
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"},
                auth=(self.client_id, self.client_secret),
            )
            resp.raise_for_status()
            return resp.json()

    async def refresh_token(self, refresh_token_value: str) -> dict[str, Any]:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{APS_BASE_URL}/authentication/v2/token",
                data={
                    "grant_type": "refresh_token",
                    "refresh_token": refresh_token_value,
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"},
                auth=(self.client_id, self.client_secret),
            )
            resp.raise_for_status()
            return resp.json()

    async def get_user_token(self, db: AsyncSession, user_id: UUID) -> str:
        stmt = select(AutodeskConnection).where(AutodeskConnection.user_id == user_id)
        result = await db.execute(stmt)
        connection = result.scalar_one_or_none()

        if not connection:
            raise HTTPException(status_code=404, detail="Autodesk connection not found for user")

        if not connection.access_token or not connection.refresh_token:
            raise HTTPException(status_code=401, detail="User not authenticated with Autodesk")

        now = utcnow()
        if connection.token_expires_at and connection.token_expires_at > now:
            return connection.access_token

        try:
            token_data = await self.refresh_token(connection.refresh_token)

            connection.access_token = token_data["access_token"]
            if "refresh_token" in token_data:
                connection.refresh_token = token_data["refresh_token"]

            expires_in = token_data.get("expires_in", 3600)
            connection.token_expires_at = now + timedelta(seconds=expires_in)

            await db.commit()
            await db.refresh(connection)

            return connection.access_token

        except httpx.HTTPStatusError as e:
            if e.response.status_code == 400:
                raise HTTPException(
                    status_code=401,
                    detail="Failed to refresh Autodesk token. Please re-authenticate.",
                )
            raise HTTPException(status_code=500, detail=f"Error refreshing Autodesk token: {str(e)}")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Unexpected error managing Autodesk token: {str(e)}")

    async def get_model_views(self, urn: str) -> list[dict[str, Any]]:
        token = await self.get_2legged_token()
        encoded_urn = base64.urlsafe_b64encode(urn.encode()).decode().rstrip("=")
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{APS_BASE_URL}/modelderivative/v2/designdata/{encoded_urn}/metadata",
                headers={"Authorization": f"Bearer {token}"},
            )
            resp.raise_for_status()
            data = resp.json()
        return data.get("data", {}).get("metadata", [])

    async def get_object_tree(self, urn: str, guid: str) -> dict[str, Any]:
        token = await self.get_2legged_token()
        encoded_urn = base64.urlsafe_b64encode(urn.encode()).decode().rstrip("=")
        async with httpx.AsyncClient(timeout=180.0) as client:
            resp = await client.get(
                f"{APS_BASE_URL}/modelderivative/v2/designdata/{encoded_urn}/metadata/{guid}",
                headers={"Authorization": f"Bearer {token}"},
            )
            resp.raise_for_status()
            return resp.json()

    async def get_object_properties(self, urn: str, guid: str) -> list[dict[str, Any]]:
        token = await self.get_2legged_token()
        encoded_urn = base64.urlsafe_b64encode(urn.encode()).decode().rstrip("=")
        async with httpx.AsyncClient(timeout=180.0) as client:
            resp = await client.get(
                f"{APS_BASE_URL}/modelderivative/v2/designdata/{encoded_urn}/metadata/{guid}/properties",
                headers={"Authorization": f"Bearer {token}"},
            )
            resp.raise_for_status()
            data = resp.json()
        return data.get("data", {}).get("collection", [])

    async def get_acc_projects(self, user_token: str) -> list[dict[str, Any]]:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{APS_BASE_URL}/construction/admin/v1/projects",
                headers={"Authorization": f"Bearer {user_token}"},
            )
            resp.raise_for_status()
            data = resp.json()
        return data.get("results", [])

    async def list_acc_rfis(
        self,
        user_token: str,
        container_id: str,
        limit: int = 100,
        offset: int = 0,
    ) -> dict[str, Any]:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{APS_BASE_URL}/issues/v2/containers/{container_id}/issues",
                headers={"Authorization": f"Bearer {user_token}"},
                params={
                    "limit": limit,
                    "offset": offset,
                },
            )
            resp.raise_for_status()
            return resp.json()

    async def get_acc_rfi(self, user_token: str, container_id: str, issue_id: str) -> dict[str, Any]:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{APS_BASE_URL}/issues/v2/containers/{container_id}/issues/{issue_id}",
                headers={"Authorization": f"Bearer {user_token}"},
            )
            resp.raise_for_status()
            return resp.json()

    async def create_acc_rfi(self, user_token: str, container_id: str, issue_data: dict[str, Any]) -> dict[str, Any]:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{APS_BASE_URL}/issues/v2/containers/{container_id}/issues",
                json=issue_data,
                headers={
                    "Authorization": f"Bearer {user_token}",
                    "Content-Type": "application/json",
                },
            )
            resp.raise_for_status()
            return resp.json()
