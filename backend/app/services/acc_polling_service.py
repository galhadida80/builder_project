import logging
from datetime import datetime
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.acc_sync import AccProjectLink
from app.models.rfi import RFI
from app.services.aps_service import APSService
from app.utils import utcnow

logger = logging.getLogger(__name__)

POLLING_INTERVAL_MINUTES = 15


class ACCPollingService:
    """Polls ACC for RFI changes when webhooks are unavailable."""

    def __init__(self, db: AsyncSession, aps_service: APSService):
        self.db = db
        self.aps_service = aps_service
        self.sync_service = None  # Set externally to avoid circular import

    async def poll_acc_rfis_for_all_projects(self) -> dict[str, Any]:
        """
        Poll all projects with ACC connections for updates.

        Returns summary: synced_projects, created, updated, conflicts.
        """
        now = utcnow()

        result = await self.db.execute(
            select(AccProjectLink).where(AccProjectLink.enabled.is_(True))
        )
        acc_links = result.scalars().all()

        synced_projects = 0
        total_created = 0
        total_updated = 0
        total_conflicts = 0
        errors = []

        for link in acc_links:
            try:
                sync_result = await self._poll_project_rfis(link)

                if sync_result["should_sync"]:
                    synced_projects += 1
                    total_created += sync_result["created"]
                    total_updated += sync_result["updated"]
                    total_conflicts += sync_result["conflicts"]

                    if sync_result.get("errors"):
                        errors.extend(sync_result["errors"])

            except Exception as e:
                logger.error(f"Failed to poll project {link.project_id}: {e}")
                errors.append({
                    "project_id": str(link.project_id),
                    "error": str(e)
                })

        if synced_projects > 0:
            await self.db.commit()

        logger.info(
            f"ACC RFI polling complete: {synced_projects} projects synced, "
            f"{total_created} created, {total_updated} updated, "
            f"{total_conflicts} conflicts"
        )

        return {
            "synced_projects": synced_projects,
            "created": total_created,
            "updated": total_updated,
            "conflicts": total_conflicts,
            "errors": errors,
            "polled_at": now.isoformat()
        }

    async def _poll_project_rfis(self, link: AccProjectLink) -> dict[str, Any]:
        """
        Poll a single project for updated ACC RFIs.
        Only syncs if issues have been modified since last sync.
        """
        result = await self.db.execute(
            select(func.max(RFI.last_synced_at))
            .where(
                RFI.project_id == link.project_id,
                RFI.acc_rfi_id.isnot(None),
                RFI.last_synced_at.isnot(None)
            )
        )
        last_synced_at = result.scalar()

        if not last_synced_at:
            logger.debug(f"Project {link.project_id} has no synced RFIs, skipping poll")
            return {
                "should_sync": False,
                "created": 0,
                "updated": 0,
                "conflicts": 0
            }

        container_id = link.acc_project_id

        try:
            user_result = await self.db.execute(
                select(RFI.created_by_id)
                .where(
                    RFI.project_id == link.project_id,
                    RFI.acc_rfi_id.isnot(None),
                    RFI.created_by_id.isnot(None)
                )
                .limit(1)
            )
            user_id = user_result.scalar()
            if not user_id:
                return {"should_sync": False, "created": 0, "updated": 0, "conflicts": 0}

            user_token = await self.aps_service.get_user_token(self.db, user_id)
        except Exception as e:
            logger.error(f"Failed to get user token for project {link.project_id}: {e}")
            return {
                "should_sync": False,
                "created": 0,
                "updated": 0,
                "conflicts": 0,
                "errors": [{"error": str(e)}]
            }

        created_count = 0
        updated_count = 0
        conflict_count = 0
        errors = []

        offset = 0
        limit = 100
        has_more = True

        while has_more:
            try:
                acc_data = await self.aps_service.list_acc_rfis(
                    user_token=user_token,
                    container_id=container_id,
                    limit=limit,
                    offset=offset
                )

                acc_issues = acc_data.get("results", [])
                if not acc_issues:
                    has_more = False
                    break

                for acc_issue in acc_issues:
                    try:
                        acc_updated_str = acc_issue.get("updatedAt")
                        if acc_updated_str:
                            try:
                                acc_updated_at = datetime.fromisoformat(
                                    acc_updated_str.replace("Z", "+00:00")
                                )
                                if acc_updated_at <= last_synced_at:
                                    continue
                            except Exception:
                                pass

                        if self.sync_service:
                            sync_result = await self.sync_service._sync_single_rfi(
                                acc_issue=acc_issue,
                                project_id=link.project_id,
                                container_id=container_id
                            )

                            if sync_result == "created":
                                created_count += 1
                            elif sync_result == "updated":
                                updated_count += 1
                            elif sync_result == "conflict":
                                conflict_count += 1

                    except Exception as e:
                        logger.error(f"Failed to sync ACC issue {acc_issue.get('id')}: {e}")
                        errors.append({
                            "issue_id": acc_issue.get("id"),
                            "error": str(e)
                        })

                offset += limit
                pagination = acc_data.get("pagination", {})
                total_results = pagination.get("totalResults", 0)
                has_more = offset < total_results

            except Exception as e:
                logger.error(f"Failed to fetch ACC RFIs at offset {offset}: {e}")
                errors.append({"offset": offset, "error": str(e)})
                has_more = False

        should_sync = created_count > 0 or updated_count > 0 or conflict_count > 0

        if should_sync:
            logger.info(
                f"Polled project {link.project_id}: {created_count} created, "
                f"{updated_count} updated, {conflict_count} conflicts"
            )

        return {
            "should_sync": should_sync,
            "created": created_count,
            "updated": updated_count,
            "conflicts": conflict_count,
            "errors": errors if errors else None
        }
