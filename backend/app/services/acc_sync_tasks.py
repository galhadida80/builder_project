import logging
import uuid

from app.db.session import AsyncSessionLocal
from app.services.acc_rfi_sync_service import ACCRFISyncService

logger = logging.getLogger(__name__)


async def run_acc_sync_task(
    project_id: uuid.UUID,
    user_id: uuid.UUID,
    container_id: str
):
    """
    Background task to sync ACC RFIs for a project.

    Creates new DB session for background execution.
    Logs results and handles errors gracefully.

    Args:
        project_id: BuilderOps project ID
        user_id: User ID to use for ACC API authentication
        container_id: ACC container ID for the project
    """
    async with AsyncSessionLocal() as db:
        try:
            service = ACCRFISyncService(db)
            result = await service.sync_project_rfis(
                project_id=project_id,
                user_id=user_id,
                container_id=container_id
            )
            logger.info(
                f"ACC sync completed for project {project_id}: "
                f"{result['created']} created, {result['updated']} updated, "
                f"{result['conflicts']} conflicts"
            )
        except Exception as e:
            logger.error(f"ACC sync failed for project {project_id}: {e}")
