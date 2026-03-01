"""Helper functions for marketplace service."""

from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.marketplace_template import MarketplaceListing, TemplateRating
from app.models.organization import OrganizationMember


async def calculate_average_rating(db: AsyncSession, template_id: UUID) -> tuple[float | None, int]:
    """
    Calculate average rating and review count for a template.
    Returns (average_rating, review_count).
    """
    query = select(
        func.avg(TemplateRating.rating).label("avg_rating"),
        func.count(TemplateRating.id).label("count"),
    ).where(TemplateRating.template_id == template_id)

    result = await db.execute(query)
    row = result.one()

    avg_rating = float(row.avg_rating) if row.avg_rating is not None else None
    count = row.count or 0

    return avg_rating, count


async def update_listing_ratings(db: AsyncSession, template_id: UUID) -> None:
    """Update the average rating and review count on a marketplace listing."""
    avg_rating, count = await calculate_average_rating(db, template_id)

    query = select(MarketplaceListing).where(MarketplaceListing.template_id == template_id)
    result = await db.execute(query)
    listing = result.scalar_one_or_none()

    if listing:
        listing.average_rating = avg_rating
        listing.review_count = count
        await db.flush()


async def check_organization_membership(
    db: AsyncSession,
    user_id: UUID,
    organization_id: UUID,
) -> bool:
    """Check if a user is a member of an organization."""
    query = select(OrganizationMember).where(
        OrganizationMember.user_id == user_id,
        OrganizationMember.organization_id == organization_id,
        OrganizationMember.is_active == True,
    )

    result = await db.execute(query)
    member = result.scalar_one_or_none()
    return member is not None
