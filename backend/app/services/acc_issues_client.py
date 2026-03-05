import logging
from typing import Any

import httpx

from app.services.aps_service import APSService

logger = logging.getLogger(__name__)

APS_BASE_URL = "https://developer.api.autodesk.com"


class ACCIssuesClient:
    """Client for ACC Issues API v2."""

    def __init__(self, aps_service: APSService):
        self.aps_service = aps_service
        self.base_url = APS_BASE_URL

    async def get_acc_projects(self, user_token: str) -> list[dict[str, Any]]:
        """
        List ACC projects for user.

        Args:
            user_token: User's 3-legged OAuth token

        Returns:
            List of ACC projects
        """
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{self.base_url}/construction/admin/v1/projects",
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
        """
        List ACC issues/RFIs with pagination.

        Args:
            user_token: User's 3-legged OAuth token
            container_id: ACC container ID (project container)
            limit: Maximum number of results per page
            offset: Pagination offset

        Returns:
            dict with 'results' and 'pagination' keys
        """
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{self.base_url}/issues/v2/containers/{container_id}/issues",
                headers={"Authorization": f"Bearer {user_token}"},
                params={
                    "limit": limit,
                    "offset": offset,
                },
            )
            resp.raise_for_status()
            return resp.json()

    async def get_acc_rfi(
        self,
        user_token: str,
        container_id: str,
        issue_id: str
    ) -> dict[str, Any]:
        """
        Get specific ACC issue by ID.

        Args:
            user_token: User's 3-legged OAuth token
            container_id: ACC container ID
            issue_id: ACC issue ID

        Returns:
            ACC issue data
        """
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{self.base_url}/issues/v2/containers/{container_id}/issues/{issue_id}",
                headers={"Authorization": f"Bearer {user_token}"},
            )
            resp.raise_for_status()
            return resp.json()

    async def create_acc_rfi(
        self,
        user_token: str,
        container_id: str,
        issue_data: dict[str, Any]
    ) -> dict[str, Any]:
        """
        Create new ACC issue.

        Args:
            user_token: User's 3-legged OAuth token
            container_id: ACC container ID
            issue_data: ACC issue payload (title, description, etc.)

        Returns:
            Created ACC issue data
        """
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{self.base_url}/issues/v2/containers/{container_id}/issues",
                json=issue_data,
                headers={
                    "Authorization": f"Bearer {user_token}",
                    "Content-Type": "application/json",
                },
            )
            resp.raise_for_status()
            return resp.json()
