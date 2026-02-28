import asyncio
import base64
import logging
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

logger = logging.getLogger(__name__)

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

    async def register_acc_webhook(
        self,
        user_token: str,
        container_id: str,
        callback_url: str,
        event_types: Optional[list[str]] = None,
    ) -> dict[str, Any]:
        """
        Register a webhook for ACC Issues events.

        Args:
            user_token: User's 3-legged OAuth token
            container_id: ACC container ID (project container)
            callback_url: HTTPS URL to receive webhook notifications
            event_types: List of events to subscribe to. Defaults to all issue events.

        Returns:
            dict containing hook_id and other webhook details

        Raises:
            HTTPException: If webhook registration fails
        """
        if event_types is None:
            event_types = [
                "issue.created",
                "issue.updated",
                "issue.deleted",
                "issue.restored",
                "issue.unlinked",
            ]

        logger.info(
            f"Registering ACC webhook for container {container_id}, "
            f"events: {event_types}, callback: {callback_url}"
        )

        try:
            async with httpx.AsyncClient() as client:
                # Register webhook for each event type
                # ACC Issues uses the 'data' system with issue events
                hook_responses = []
                for event_type in event_types:
                    webhook_payload = {
                        "callbackUrl": callback_url,
                        "scope": {
                            "container": container_id,
                        },
                        "hookAttribute": {
                            "containerId": container_id,
                        },
                        "filter": "$[?(@.payload.containerId == '" + container_id + "')]",
                    }

                    resp = await client.post(
                        f"{APS_BASE_URL}/webhooks/v1/systems/data/events/{event_type}-1.0/hooks",
                        json=webhook_payload,
                        headers={
                            "Authorization": f"Bearer {user_token}",
                            "Content-Type": "application/json",
                        },
                    )
                    resp.raise_for_status()
                    hook_data = resp.json()
                    hook_responses.append({
                        "event_type": event_type,
                        "hook_id": hook_data.get("hookId"),
                        "status": hook_data.get("status"),
                    })

                    logger.info(
                        f"Registered webhook hook_id={hook_data.get('hookId')} "
                        f"for event {event_type} on container {container_id}"
                    )

                return {
                    "container_id": container_id,
                    "callback_url": callback_url,
                    "hooks": hook_responses,
                }

        except httpx.HTTPStatusError as e:
            logger.error(
                f"Failed to register ACC webhook: status={e.response.status_code}, "
                f"body={e.response.text}"
            )
            raise HTTPException(
                status_code=e.response.status_code,
                detail=f"Failed to register ACC webhook: {e.response.text}",
            )
        except Exception as e:
            logger.error(f"Unexpected error registering ACC webhook: {e}")
            raise HTTPException(
                status_code=500,
                detail=f"Unexpected error registering ACC webhook: {str(e)}",
            )

    async def unregister_acc_webhook(
        self,
        user_token: str,
        system: str,
        event: str,
        hook_id: str,
    ) -> bool:
        """
        Unregister a specific ACC webhook.

        Args:
            user_token: User's 3-legged OAuth token
            system: Webhook system (e.g., 'data')
            event: Event type with version (e.g., 'issue.created-1.0')
            hook_id: The hook ID to unregister

        Returns:
            True if webhook was successfully unregistered

        Raises:
            HTTPException: If webhook unregistration fails
        """
        logger.info(
            f"Unregistering ACC webhook: system={system}, event={event}, hook_id={hook_id}"
        )

        try:
            async with httpx.AsyncClient() as client:
                resp = await client.delete(
                    f"{APS_BASE_URL}/webhooks/v1/systems/{system}/events/{event}/hooks/{hook_id}",
                    headers={"Authorization": f"Bearer {user_token}"},
                )
                # 200 = deleted, 204 = no content (also success), 404 = already deleted
                if resp.status_code in (200, 204, 404):
                    logger.info(f"Successfully unregistered webhook {hook_id}")
                    return True

                resp.raise_for_status()
                return True

        except httpx.HTTPStatusError as e:
            logger.error(
                f"Failed to unregister ACC webhook {hook_id}: "
                f"status={e.response.status_code}, body={e.response.text}"
            )
            # Don't raise exception for 404 (already deleted)
            if e.response.status_code == 404:
                logger.warning(f"Webhook {hook_id} not found (may have been already deleted)")
                return True
            raise HTTPException(
                status_code=e.response.status_code,
                detail=f"Failed to unregister ACC webhook: {e.response.text}",
            )
        except Exception as e:
            logger.error(f"Unexpected error unregistering ACC webhook {hook_id}: {e}")
            raise HTTPException(
                status_code=500,
                detail=f"Unexpected error unregistering ACC webhook: {str(e)}",
            )
