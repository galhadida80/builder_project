import logging
from typing import Any, Optional

import httpx
from fastapi import HTTPException

from app.services.aps_service import APSService

logger = logging.getLogger(__name__)

APS_BASE_URL = "https://developer.api.autodesk.com"


class ACCWebhookClient:
    """Client for ACC Webhooks API v1."""

    def __init__(self, aps_service: APSService):
        self.aps_service = aps_service
        self.base_url = f"{APS_BASE_URL}/webhooks/v1"

    async def register_acc_webhook(
        self,
        user_token: str,
        container_id: str,
        callback_url: str,
        event_types: Optional[list[str]] = None,
    ) -> dict[str, Any]:
        """
        Register webhooks for ACC Issues events.

        Args:
            user_token: User's 3-legged OAuth token
            container_id: ACC container ID (project container)
            callback_url: HTTPS URL to receive webhook notifications
            event_types: List of events to subscribe to. Defaults to all issue events.

        Returns:
        {
            "container_id": str,
            "callback_url": str,
            "hooks": [{"event": str, "hook_id": str}, ...]
        }

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
                        f"{self.base_url}/systems/data/events/{event_type}-1.0/hooks",
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
        Unregister specific ACC webhook.

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
                    f"{self.base_url}/systems/{system}/events/{event}/hooks/{hook_id}",
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
