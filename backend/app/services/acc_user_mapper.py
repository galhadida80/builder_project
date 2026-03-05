import logging
import uuid
from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User

logger = logging.getLogger(__name__)


class ACCUserMapper:
    """Maps ACC users to BuilderOps users."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def map_acc_user_to_builderops_user(
        self,
        acc_user_email: str,
        project_id: uuid.UUID
    ) -> uuid.UUID:
        """
        Find or create BuilderOps user from ACC user email.

        Steps:
        1. Search for existing user (case-insensitive email match)
        2. If not found, create placeholder external user
        3. Return user_id

        Returns:
        - UUID of matched/created user

        Handles three scenarios:
        1. Exact email match (case-insensitive) - returns existing user ID
        2. Missing user - creates external contact with company="External (ACC)"
        3. Empty email - returns/creates system user
        """
        if not acc_user_email:
            logger.debug("No ACC email provided, using system user")
            return await self._get_or_create_system_user()

        email_lower = acc_user_email.lower()
        logger.debug(f"Looking up user by email: {email_lower}")

        user = await self._find_user_by_email(email_lower)

        if user:
            logger.debug(f"Found existing user {user.id} for email: {email_lower}")
            return user.id

        logger.info(f"No user found for {email_lower}, creating external contact")
        new_user = await self._create_placeholder_user(email_lower)
        return new_user.id

    async def _find_user_by_email(self, email: str) -> Optional[User]:
        """Find user by email (case-insensitive)."""
        result = await self.db.execute(
            select(User).where(func.lower(User.email) == email)
        )
        return result.scalar_one_or_none()

    async def _create_placeholder_user(self, email: str) -> User:
        """Create external/placeholder user for ACC user."""
        full_name = email.split("@")[0].title()
        new_user = User(
            email=email,
            full_name=full_name,
            is_active=True,
            company="External (ACC)"
        )
        self.db.add(new_user)
        await self.db.flush()
        await self.db.refresh(new_user)
        logger.info(
            f"Created external user {new_user.id} ({full_name}) for email: {email}"
        )
        return new_user

    async def _get_or_create_system_user(self) -> uuid.UUID:
        """Get or create system user for missing ACC emails."""
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
