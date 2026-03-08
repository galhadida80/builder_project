import logging
import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import get_settings
from app.models.project import Project
from app.models.rfi import RFI
from app.services.acc_conflict_resolver import ACCConflictResolver
from app.services.acc_polling_service import ACCPollingService
from app.services.acc_rfi_mapper import ACCRFIMapper
from app.services.acc_user_mapper import ACCUserMapper
from app.services.aps_service import APSService
from app.utils import utcnow

logger = logging.getLogger(__name__)


class ACCRFISyncService:
    """Orchestrates ACC RFI sync operations."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.settings = get_settings()
        self.aps_service = APSService(self.settings)
        self.mapper = ACCRFIMapper(db)
        self.conflict_resolver = ACCConflictResolver(db)
        self.user_mapper = ACCUserMapper(db)
        self.poller = ACCPollingService(db, self.aps_service)
        self.poller.sync_service = self  # Set reference for polling

    async def sync_project_rfis(
        self,
        project_id: uuid.UUID,
        user_id: uuid.UUID,
        container_id: str
    ) -> dict[str, Any]:
        """
        Pull RFIs from ACC and sync them to BuilderOps.
        Returns sync summary with created/updated counts and conflicts.
        """
        try:
            user_token = await self.aps_service.get_user_token(self.db, user_id)

            result = await self.db.execute(
                select(Project).where(Project.id == project_id)
            )
            project = result.scalar_one_or_none()
            if not project:
                raise ValueError(f"Project not found: {project_id}")

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
                            result = await self._sync_single_rfi(
                                acc_issue=acc_issue,
                                project_id=project_id,
                                container_id=container_id
                            )

                            if result == "created":
                                created_count += 1
                            elif result == "updated":
                                updated_count += 1
                            elif result == "conflict":
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

            await self.db.commit()

            return {
                "created": created_count,
                "updated": updated_count,
                "conflicts": conflict_count,
                "errors": errors,
                "synced_at": utcnow().isoformat()
            }

        except Exception as e:
            logger.error(f"Failed to sync project RFIs: {e}")
            raise

    async def _sync_single_rfi(
        self,
        acc_issue: dict[str, Any],
        project_id: uuid.UUID,
        container_id: str
    ) -> str:
        """
        Sync a single ACC issue to BuilderOps.
        Uses mapper, conflict_resolver, user_mapper.
        Returns: 'created' | 'updated' | 'conflict'
        """
        acc_rfi_id = acc_issue.get("id")

        result = await self.db.execute(
            select(RFI)
            .options(selectinload(RFI.created_by))
            .where(RFI.acc_rfi_id == acc_rfi_id)
        )
        existing_rfi = result.scalar_one_or_none()

        if existing_rfi:
            conflict = await self.conflict_resolver.detect_conflicts(
                existing_rfi,
                acc_issue,
                self.mapper
            )
            if conflict:
                existing_rfi.sync_status = "conflict"
                await self.db.flush()
                return "conflict"

            await self._update_rfi_from_acc(existing_rfi, acc_issue)
            return "updated"
        else:
            await self._create_rfi_from_acc(acc_issue, project_id)
            return "created"

    async def _create_rfi_from_acc(
        self,
        acc_issue: dict[str, Any],
        project_id: uuid.UUID,
    ) -> RFI:
        """Create a new RFI from ACC issue data."""
        rfi_data = await self.mapper.map_acc_issue_to_rfi(
            acc_issue,
            project_id,
            self.user_mapper
        )

        rfi = RFI(
            project_id=project_id,
            rfi_number=rfi_data["rfi_number"],
            subject=rfi_data["subject"],
            question=rfi_data["question"],
            category=rfi_data["category"],
            priority=rfi_data["priority"],
            status=rfi_data["status"],
            created_by_id=rfi_data["created_by_id"],
            assigned_to_id=rfi_data.get("assigned_to_id"),
            to_email=rfi_data["to_email"],
            to_name=rfi_data.get("to_name"),
            cc_emails=rfi_data.get("cc_emails", []),
            due_date=rfi_data.get("due_date"),
            location=rfi_data.get("location"),
            attachments=rfi_data.get("attachments", []),
            acc_rfi_id=acc_issue.get("id"),
            acc_origin=True,
            sync_status="synced",
            last_synced_at=utcnow(),
        )

        self.db.add(rfi)
        await self.db.flush()
        await self.db.refresh(rfi)

        logger.info(f"Created RFI {rfi.rfi_number} from ACC issue {acc_issue.get('id')}")
        return rfi

    async def _update_rfi_from_acc(
        self,
        rfi: RFI,
        acc_issue: dict[str, Any],
    ) -> None:
        """Update existing RFI with ACC issue data."""
        rfi_data = await self.mapper.map_acc_issue_to_rfi(
            acc_issue,
            rfi.project_id,
            self.user_mapper
        )

        rfi.subject = rfi_data["subject"]
        rfi.question = rfi_data["question"]
        rfi.category = rfi_data["category"]
        rfi.priority = rfi_data["priority"]
        rfi.status = rfi_data["status"]
        rfi.assigned_to_id = rfi_data.get("assigned_to_id")
        rfi.to_email = rfi_data["to_email"]
        rfi.to_name = rfi_data.get("to_name")
        rfi.cc_emails = rfi_data.get("cc_emails", [])
        rfi.due_date = rfi_data.get("due_date")
        rfi.location = rfi_data.get("location")
        rfi.attachments = rfi_data.get("attachments", [])
        rfi.sync_status = "synced"
        rfi.last_synced_at = utcnow()

        await self.db.flush()
        logger.info(f"Updated RFI {rfi.rfi_number} from ACC issue {acc_issue.get('id')}")

    async def resolve_conflict(
        self,
        rfi: RFI,
        strategy: str = "last_write_wins"
    ) -> dict[str, Any]:
        """
        Resolve RFI conflict using specified strategy.
        Delegates to conflict_resolver and applies result.
        """
        resolution = await self.conflict_resolver.resolve_conflict(
            rfi,
            None,
            strategy
        )

        if resolution["chosen_version"] == "acc":
            rfi.sync_status = "synced"
            rfi.last_synced_at = utcnow()
        else:
            rfi.sync_status = "synced"
            rfi.last_synced_at = utcnow()

        return resolution

    async def poll_acc_rfis_for_all_projects(self) -> dict[str, Any]:
        """
        Fallback polling mechanism: check all projects with ACC connections.
        Delegates to polling service.
        """
        return await self.poller.poll_acc_rfis_for_all_projects()
