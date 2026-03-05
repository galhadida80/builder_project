import logging
from datetime import datetime
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.rfi import RFI
from app.utils import utcnow

logger = logging.getLogger(__name__)


class ACCConflictResolver:
    """Handles conflict detection and resolution between ACC and BuilderOps."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def detect_conflicts(
        self,
        existing_rfi: RFI,
        acc_issue: dict[str, Any],
        mapper
    ) -> bool:
        """
        Detect if RFI has conflicting changes in both systems.

        Returns:
        - True if conflict detected, False otherwise

        Stores conflicting field-level data in acc_metadata for manual review.
        """
        if not existing_rfi.last_synced_at:
            return False

        acc_updated_str = acc_issue.get("updatedAt")
        if not acc_updated_str:
            return False

        try:
            acc_updated_at = datetime.fromisoformat(
                acc_updated_str.replace("Z", "+00:00")
            )
        except Exception as e:
            logger.warning(f"Failed to parse ACC updatedAt: {e}")
            return False

        rfi_updated_locally = existing_rfi.updated_at > existing_rfi.last_synced_at
        acc_updated_remotely = acc_updated_at > existing_rfi.last_synced_at

        if rfi_updated_locally and acc_updated_remotely:
            conflicting_fields = await self._detect_field_conflicts(
                existing_rfi,
                acc_issue,
                mapper
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
        acc_issue: dict[str, Any],
        mapper
    ) -> list[str]:
        """
        Compare individual fields to identify which ones changed.
        Returns list of field names that have conflicting changes.
        """
        conflicting_fields = []

        # We need user_mapper here, get it from the caller
        from app.services.acc_user_mapper import ACCUserMapper
        user_mapper = ACCUserMapper(self.db)

        rfi_data = await mapper.map_acc_issue_to_rfi(
            acc_issue,
            existing_rfi.project_id,
            user_mapper
        )

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
        acc_issue: dict[str, Any] | None,
        strategy: str = "last_write_wins"
    ) -> dict[str, Any]:
        """
        Resolve conflict using specified strategy.

        Strategies:
        - last_write_wins: Newer timestamp wins
        - prefer_local: Keep BuilderOps version
        - prefer_acc: Apply ACC version

        Returns resolution metadata.
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

        acc_version = acc_issue or latest_conflict.get("acc_version")
        if not acc_version:
            raise ValueError("No ACC version data available")

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

        chosen_version, resolution_reason = self._apply_strategy(
            strategy,
            rfi,
            acc_updated_at
        )

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

    def _apply_strategy(
        self,
        strategy: str,
        rfi: RFI,
        acc_updated_at: datetime
    ) -> tuple[str, str]:
        """
        Apply conflict resolution strategy.
        Returns (chosen_version, resolution_reason).
        """
        if strategy == "last_write_wins":
            if acc_updated_at > rfi.updated_at:
                return "acc", f"ACC version newer ({acc_updated_at} > {rfi.updated_at})"
            else:
                return "local", f"Local version newer ({rfi.updated_at} >= {acc_updated_at})"
        elif strategy == "prefer_local":
            return "local", "Manual preference for local version"
        elif strategy == "prefer_acc":
            return "acc", "Manual preference for ACC version"

        return "local", "Unknown strategy, defaulting to local"
