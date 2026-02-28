import logging
import uuid
from datetime import datetime, timedelta
from typing import Any, Optional

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import get_settings
from app.models.bim import AutodeskConnection
from app.models.project import Project
from app.models.rfi import RFI, RFIResponse, RFIStatus
from app.models.user import User
from app.services.aps_service import APSService
from app.utils import utcnow

logger = logging.getLogger(__name__)

POLLING_INTERVAL_MINUTES = 15


class ACCRFISyncService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.settings = get_settings()
        self.aps_service = APSService(self.settings)

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
        Returns 'created', 'updated', or 'conflict'.
        """
        acc_issue_id = acc_issue.get("id")

        result = await self.db.execute(
            select(RFI)
            .options(selectinload(RFI.created_by))
            .where(RFI.acc_issue_id == acc_issue_id)
        )
        existing_rfi = result.scalar_one_or_none()

        if existing_rfi:
            conflict = await self.detect_conflicts(existing_rfi, acc_issue)
            if conflict:
                existing_rfi.sync_status = "conflict"
                await self.db.flush()
                return "conflict"

            await self._update_rfi_from_acc(existing_rfi, acc_issue, container_id)
            return "updated"
        else:
            await self._create_rfi_from_acc(acc_issue, project_id, container_id)
            return "created"

    async def _create_rfi_from_acc(
        self,
        acc_issue: dict[str, Any],
        project_id: uuid.UUID,
        container_id: str
    ) -> RFI:
        """Create a new RFI from ACC issue data."""
        rfi_data = await self.map_acc_issue_to_rfi(acc_issue, project_id)

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
            acc_issue_id=acc_issue.get("id"),
            acc_project_id=acc_issue.get("projectId"),
            acc_container_id=container_id,
            sync_source="acc",
            sync_status="synced",
            last_synced_at=utcnow(),
            acc_metadata=acc_issue
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
        container_id: str
    ) -> None:
        """Update existing RFI with ACC issue data."""
        rfi_data = await self.map_acc_issue_to_rfi(acc_issue, rfi.project_id)

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
        rfi.acc_project_id = acc_issue.get("projectId")
        rfi.acc_container_id = container_id
        rfi.sync_status = "synced"
        rfi.last_synced_at = utcnow()
        rfi.acc_metadata = acc_issue

        await self.db.flush()
        logger.info(f"Updated RFI {rfi.rfi_number} from ACC issue {acc_issue.get('id')}")

    async def map_acc_issue_to_rfi(
        self,
        acc_issue: dict[str, Any],
        project_id: uuid.UUID
    ) -> dict[str, Any]:
        """
        Map ACC issue fields to BuilderOps RFI fields.
        """
        acc_issue_number = acc_issue.get("displayId", acc_issue.get("id", ""))
        rfi_number = f"RFI-ACC-{acc_issue_number}"

        result = await self.db.execute(
            select(RFI.rfi_number).where(RFI.rfi_number == rfi_number)
        )
        if result.scalar_one_or_none():
            year = utcnow().year
            prefix = f"RFI-ACC-{year}-"
            result = await self.db.execute(
                select(func.max(RFI.rfi_number)).where(
                    RFI.rfi_number.like(f"{prefix}%")
                )
            )
            max_number = result.scalar()
            if max_number:
                import re
                match = re.search(r"(\d+)$", max_number)
                seq = int(match.group(1)) + 1 if match else 1
            else:
                seq = 1
            rfi_number = f"{prefix}{seq:05d}"

        subject = acc_issue.get("title", "ACC RFI")
        question = acc_issue.get("description", "")

        category_mapping = {
            "design": "design",
            "structural": "structural",
            "mep": "mep",
            "architectural": "architectural",
            "specification": "specifications",
            "schedule": "schedule",
            "cost": "cost"
        }
        acc_type = acc_issue.get("issueType", {}).get("title", "").lower()
        category = category_mapping.get(acc_type, "other")

        priority_mapping = {
            "low": "low",
            "normal": "medium",
            "high": "high",
            "critical": "urgent"
        }
        acc_priority = acc_issue.get("priority", "").lower()
        priority = priority_mapping.get(acc_priority, "medium")

        status_mapping = {
            "draft": RFIStatus.DRAFT.value,
            "open": RFIStatus.OPEN.value,
            "in_review": RFIStatus.WAITING_RESPONSE.value,
            "answered": RFIStatus.ANSWERED.value,
            "closed": RFIStatus.CLOSED.value,
            "void": RFIStatus.CANCELLED.value
        }
        acc_status = acc_issue.get("status", "").lower()
        status = status_mapping.get(acc_status, RFIStatus.OPEN.value)

        created_by_email = acc_issue.get("createdBy", {}).get("email", "")
        created_by_id = await self.map_acc_user_to_builderops_user(
            created_by_email,
            project_id
        )

        assigned_to_email = acc_issue.get("assignedTo", {}).get("email")
        assigned_to_id = None
        if assigned_to_email:
            assigned_to_id = await self.map_acc_user_to_builderops_user(
                assigned_to_email,
                project_id
            )

        to_email = assigned_to_email or created_by_email or "noreply@autodesk.com"
        to_name = acc_issue.get("assignedTo", {}).get("name")

        due_date_str = acc_issue.get("dueDate")
        due_date = None
        if due_date_str:
            try:
                due_date = datetime.fromisoformat(due_date_str.replace("Z", "+00:00"))
            except Exception:
                pass

        location = acc_issue.get("location", {}).get("name")

        attachments = []
        for attachment in acc_issue.get("attachments", []):
            attachments.append({
                "name": attachment.get("name"),
                "url": attachment.get("url"),
                "size": attachment.get("size"),
                "type": attachment.get("type")
            })

        return {
            "rfi_number": rfi_number,
            "subject": subject,
            "question": question,
            "category": category,
            "priority": priority,
            "status": status,
            "created_by_id": created_by_id,
            "assigned_to_id": assigned_to_id,
            "to_email": to_email,
            "to_name": to_name,
            "cc_emails": [],
            "due_date": due_date,
            "location": location,
            "attachments": attachments
        }

    async def detect_conflicts(
        self,
        existing_rfi: RFI,
        acc_issue: dict[str, Any]
    ) -> bool:
        """
        Detect if RFI has conflicting changes.
        Returns True if conflict detected, False otherwise.
        Stores conflicting field-level data in acc_metadata for manual review.
        """
        if not existing_rfi.last_synced_at:
            return False

        acc_updated_str = acc_issue.get("updatedAt")
        if not acc_updated_str:
            return False

        try:
            acc_updated_at = datetime.fromisoformat(acc_updated_str.replace("Z", "+00:00"))
        except Exception as e:
            logger.warning(f"Failed to parse ACC updatedAt: {e}")
            return False

        rfi_updated_locally = existing_rfi.updated_at > existing_rfi.last_synced_at
        acc_updated_remotely = acc_updated_at > existing_rfi.last_synced_at

        if rfi_updated_locally and acc_updated_remotely:
            conflicting_fields = await self._detect_field_conflicts(
                existing_rfi,
                acc_issue
            )

            conflict_metadata = {
                "conflict_detected_at": utcnow().isoformat(),
                "local_updated_at": existing_rfi.updated_at.isoformat(),
                "acc_updated_at": acc_updated_at.isoformat(),
                "last_synced_at": existing_rfi.last_synced_at.isoformat(),
                "conflicting_fields": conflicting_fields,
                "local_version": {
                    "subject": existing_rfi.subject,
                    "question": existing_rfi.question,
                    "category": existing_rfi.category,
                    "priority": existing_rfi.priority,
                    "status": existing_rfi.status,
                    "assigned_to_id": str(existing_rfi.assigned_to_id) if existing_rfi.assigned_to_id else None,
                    "due_date": existing_rfi.due_date.isoformat() if existing_rfi.due_date else None,
                    "location": existing_rfi.location
                },
                "acc_version": acc_issue
            }

            existing_metadata = existing_rfi.acc_metadata or {}
            if not isinstance(existing_metadata, dict):
                existing_metadata = {}

            existing_metadata["conflict_history"] = existing_metadata.get("conflict_history", [])
            existing_metadata["conflict_history"].append(conflict_metadata)
            existing_metadata["latest_conflict"] = conflict_metadata

            existing_rfi.acc_metadata = existing_metadata

            logger.warning(
                f"Conflict detected for RFI {existing_rfi.rfi_number}: "
                f"Local updated at {existing_rfi.updated_at}, "
                f"ACC updated at {acc_updated_at}, "
                f"Last synced at {existing_rfi.last_synced_at}. "
                f"Conflicting fields: {', '.join(conflicting_fields) if conflicting_fields else 'timestamps only'}"
            )
            return True

        return False

    async def _detect_field_conflicts(
        self,
        existing_rfi: RFI,
        acc_issue: dict[str, Any]
    ) -> list[str]:
        """
        Compare individual fields to identify which ones changed.
        Returns list of field names that have conflicting changes.
        """
        conflicting_fields = []

        rfi_data = await self.map_acc_issue_to_rfi(acc_issue, existing_rfi.project_id)

        field_comparisons = {
            "subject": (existing_rfi.subject, rfi_data.get("subject")),
            "question": (existing_rfi.question, rfi_data.get("question")),
            "category": (existing_rfi.category, rfi_data.get("category")),
            "priority": (existing_rfi.priority, rfi_data.get("priority")),
            "status": (existing_rfi.status, rfi_data.get("status")),
            "location": (existing_rfi.location, rfi_data.get("location")),
            "to_email": (existing_rfi.to_email, rfi_data.get("to_email")),
            "assigned_to_id": (
                str(existing_rfi.assigned_to_id) if existing_rfi.assigned_to_id else None,
                str(rfi_data.get("assigned_to_id")) if rfi_data.get("assigned_to_id") else None
            )
        }

        if existing_rfi.due_date and rfi_data.get("due_date"):
            local_due = existing_rfi.due_date.replace(microsecond=0, tzinfo=None)
            remote_due = rfi_data["due_date"].replace(microsecond=0, tzinfo=None)
            if local_due != remote_due:
                conflicting_fields.append("due_date")
        elif existing_rfi.due_date != rfi_data.get("due_date"):
            conflicting_fields.append("due_date")

        for field_name, (local_value, remote_value) in field_comparisons.items():
            if local_value != remote_value:
                conflicting_fields.append(field_name)

        return conflicting_fields

    async def resolve_conflict(
        self,
        rfi: RFI,
        strategy: str = "last_write_wins"
    ) -> dict[str, Any]:
        """
        Resolve RFI conflict using specified strategy.
        Currently supports: 'last_write_wins', 'prefer_local', 'prefer_acc'.
        Returns resolution summary with chosen version and applied changes.
        """
        if strategy not in ["last_write_wins", "prefer_local", "prefer_acc"]:
            raise ValueError(f"Unsupported conflict resolution strategy: {strategy}")

        if not rfi.acc_metadata:
            raise ValueError("Cannot resolve conflict: no ACC metadata available")

        metadata = rfi.acc_metadata
        if not isinstance(metadata, dict):
            raise ValueError("Invalid ACC metadata format")

        latest_conflict = metadata.get("latest_conflict")
        if not latest_conflict:
            raise ValueError("No conflict data found in metadata")

        acc_version = latest_conflict.get("acc_version")
        if not acc_version:
            raise ValueError("No ACC version data in conflict metadata")

        acc_updated_str = acc_version.get("updatedAt")
        if not acc_updated_str:
            logger.info(f"No ACC update timestamp, keeping local version for RFI {rfi.rfi_number}")
            rfi.sync_status = "synced"
            await self.db.flush()
            return {
                "chosen_version": "local",
                "reason": "No ACC timestamp available",
                "conflicting_fields": latest_conflict.get("conflicting_fields", [])
            }

        try:
            acc_updated_at = datetime.fromisoformat(acc_updated_str.replace("Z", "+00:00"))
        except Exception as e:
            logger.error(f"Failed to parse ACC timestamp: {e}")
            rfi.sync_status = "synced"
            await self.db.flush()
            return {
                "chosen_version": "local",
                "reason": f"Invalid ACC timestamp: {e}",
                "conflicting_fields": latest_conflict.get("conflicting_fields", [])
            }

        chosen_version = None
        resolution_reason = None

        if strategy == "last_write_wins":
            if acc_updated_at > rfi.updated_at:
                chosen_version = "acc"
                resolution_reason = f"ACC version newer ({acc_updated_at} > {rfi.updated_at})"
            else:
                chosen_version = "local"
                resolution_reason = f"Local version newer ({rfi.updated_at} >= {acc_updated_at})"
        elif strategy == "prefer_local":
            chosen_version = "local"
            resolution_reason = "Manual preference for local version"
        elif strategy == "prefer_acc":
            chosen_version = "acc"
            resolution_reason = "Manual preference for ACC version"

        if chosen_version == "acc":
            logger.info(f"Applying ACC version to RFI {rfi.rfi_number}: {resolution_reason}")
            await self._update_rfi_from_acc(rfi, acc_version, rfi.acc_container_id)
        else:
            logger.info(f"Keeping local version for RFI {rfi.rfi_number}: {resolution_reason}")
            rfi.sync_status = "synced"
            rfi.last_synced_at = utcnow()

        if isinstance(metadata, dict):
            metadata["conflict_resolved_at"] = utcnow().isoformat()
            metadata["resolution_strategy"] = strategy
            metadata["chosen_version"] = chosen_version
            metadata["resolution_reason"] = resolution_reason
            rfi.acc_metadata = metadata

        await self.db.flush()

        return {
            "chosen_version": chosen_version,
            "reason": resolution_reason,
            "conflicting_fields": latest_conflict.get("conflicting_fields", []),
            "strategy": strategy,
            "resolved_at": utcnow().isoformat()
        }

    async def map_acc_user_to_builderops_user(
        self,
        acc_user_email: str,
        project_id: uuid.UUID
    ) -> uuid.UUID:
        """
        Map ACC user email to BuilderOps user ID.

        Handles three scenarios:
        1. Exact email match (case-insensitive) - returns existing user ID
        2. Missing user - creates external contact with company="External (ACC)"
        3. Empty email - returns/creates system user

        Returns: BuilderOps user ID
        """
        if not acc_user_email:
            logger.debug("No ACC email provided, using system user")
            result = await self.db.execute(
                select(User).where(User.email == "system@builderops.com")
            )
            system_user = result.scalar_one_or_none()
            if system_user:
                logger.debug(f"Found existing system user: {system_user.id}")
                return system_user.id

            logger.info("Creating system user")
            system_user = User(
                email="system@builderops.com",
                full_name="System User",
                is_active=True
            )
            self.db.add(system_user)
            await self.db.flush()
            await self.db.refresh(system_user)
            logger.info(f"Created system user: {system_user.id}")
            return system_user.id

        email_lower = acc_user_email.lower()
        logger.debug(f"Looking up user by email: {email_lower}")

        result = await self.db.execute(
            select(User).where(func.lower(User.email) == email_lower)
        )
        user = result.scalar_one_or_none()

        if user:
            logger.debug(f"Found existing user {user.id} for email: {email_lower}")
            return user.id

        logger.info(f"No user found for {email_lower}, creating external contact")
        full_name = acc_user_email.split("@")[0].title()
        new_user = User(
            email=email_lower,
            full_name=full_name,
            is_active=True,
            company="External (ACC)"
        )
        self.db.add(new_user)
        await self.db.flush()
        await self.db.refresh(new_user)
        logger.info(f"Created external user {new_user.id} ({full_name}) for email: {email_lower}")

        return new_user.id

    async def poll_acc_rfis_for_all_projects(self) -> dict[str, Any]:
        """
        Fallback polling mechanism: check all projects with ACC connections
        and sync RFIs that have been modified since last sync.

        Returns summary with counts of synced projects and RFIs.
        """
        now = utcnow()
        polling_threshold = now - timedelta(minutes=POLLING_INTERVAL_MINUTES)

        result = await self.db.execute(
            select(Project)
            .join(RFI, RFI.project_id == Project.id)
            .where(
                RFI.acc_issue_id.isnot(None),
                RFI.acc_container_id.isnot(None)
            )
            .distinct()
        )
        projects_with_acc = result.scalars().all()

        synced_projects = 0
        total_created = 0
        total_updated = 0
        total_conflicts = 0
        errors = []

        for project in projects_with_acc:
            try:
                sync_result = await self._poll_project_rfis(project)

                if sync_result["should_sync"]:
                    synced_projects += 1
                    total_created += sync_result["created"]
                    total_updated += sync_result["updated"]
                    total_conflicts += sync_result["conflicts"]

                    if sync_result.get("errors"):
                        errors.extend(sync_result["errors"])

            except Exception as e:
                logger.error(f"Failed to poll project {project.id}: {e}")
                errors.append({
                    "project_id": str(project.id),
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

    async def _poll_project_rfis(self, project: Project) -> dict[str, Any]:
        """
        Poll a single project for updated ACC RFIs.
        Only syncs if issues have been modified since last sync.
        """
        result = await self.db.execute(
            select(func.max(RFI.last_synced_at))
            .where(
                RFI.project_id == project.id,
                RFI.acc_issue_id.isnot(None),
                RFI.last_synced_at.isnot(None)
            )
        )
        last_synced_at = result.scalar()

        if not last_synced_at:
            logger.debug(f"Project {project.id} has no synced RFIs, skipping poll")
            return {
                "should_sync": False,
                "created": 0,
                "updated": 0,
                "conflicts": 0
            }

        result = await self.db.execute(
            select(RFI.acc_container_id, RFI.created_by_id)
            .where(
                RFI.project_id == project.id,
                RFI.acc_container_id.isnot(None),
                RFI.created_by_id.isnot(None)
            )
            .limit(1)
        )
        row = result.first()

        if not row:
            logger.debug(f"Project {project.id} has no ACC container, skipping poll")
            return {
                "should_sync": False,
                "created": 0,
                "updated": 0,
                "conflicts": 0
            }

        container_id = row[0]
        user_id = row[1]

        try:
            user_token = await self.aps_service.get_user_token(self.db, user_id)
        except Exception as e:
            logger.error(f"Failed to get user token for project {project.id}: {e}")
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

                        sync_result = await self._sync_single_rfi(
                            acc_issue=acc_issue,
                            project_id=project.id,
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
                f"Polled project {project.id}: {created_count} created, "
                f"{updated_count} updated, {conflict_count} conflicts"
            )

        return {
            "should_sync": should_sync,
            "created": created_count,
            "updated": updated_count,
            "conflicts": conflict_count,
            "errors": errors if errors else None
        }
