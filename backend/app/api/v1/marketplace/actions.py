from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.core.security import get_current_user
from app.db.session import get_db
from app.models.audit import AuditAction
from app.models.marketplace_template import (
    ListingStatus,
    MarketplaceListing,
    MarketplaceTemplate,
    TemplateInstallation,
    TemplateRating,
)
from app.models.organization import OrganizationMember
from app.models.user import User
from app.schemas.marketplace_template import (
    TemplateInstallationCreate,
    TemplateInstallationResponse,
    TemplateRatingCreate,
    TemplateRatingResponse,
    TemplateRatingUpdate,
)
from app.services.audit_service import create_audit_log, get_model_dict

router = APIRouter()


async def _update_listing_rating_stats(db: AsyncSession, template_id: UUID):
    """Recalculate and update average_rating and review_count for a template's listing."""
    rating_stats = await db.execute(
        select(
            func.avg(TemplateRating.rating).label("avg_rating"),
            func.count(TemplateRating.id).label("count")
        ).where(TemplateRating.template_id == template_id)
    )
    stats = rating_stats.one()
    # Update the listing
    listing_result = await db.execute(
        select(MarketplaceListing).where(MarketplaceListing.template_id == template_id)
    )
    listing = listing_result.scalar_one_or_none()
    if listing:
        listing.average_rating = float(stats.avg_rating) if stats.avg_rating else None
        listing.review_count = stats.count


@router.post("/marketplace/templates/{template_id}/install", response_model=TemplateInstallationResponse, status_code=201)
async def install_marketplace_template(
    template_id: UUID,
    data: TemplateInstallationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Install a marketplace template to an organization.
    One-click install that:
    - Verifies user is a member of the target organization
    - Checks template is approved and available
    - Prevents duplicate installations
    - Increments install count
    - Creates audit log entry
    """
    # Verify template_id matches the path parameter
    if data.template_id != template_id:
        raise HTTPException(status_code=400, detail="Template ID mismatch")

    # Verify user is a member of the target organization
    org_member_result = await db.execute(
        select(OrganizationMember).where(
            OrganizationMember.organization_id == data.organization_id,
            OrganizationMember.user_id == current_user.id,
        )
    )
    org_member = org_member_result.scalar_one_or_none()
    if not org_member and not current_user.is_super_admin:
        raise HTTPException(status_code=403, detail="Not a member of the target organization")

    # Verify template exists and is approved
    template_result = await db.execute(
        select(MarketplaceTemplate)
        .join(MarketplaceListing, MarketplaceTemplate.id == MarketplaceListing.template_id)
        .options(selectinload(MarketplaceTemplate.listing))
        .where(
            MarketplaceTemplate.id == template_id,
            MarketplaceListing.status == ListingStatus.APPROVED.value
        )
    )
    template = template_result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found or not approved")

    # Check if already installed for this organization
    existing_installation = await db.execute(
        select(TemplateInstallation).where(
            TemplateInstallation.template_id == template_id,
            TemplateInstallation.organization_id == data.organization_id,
            TemplateInstallation.is_active == True
        )
    )
    if existing_installation.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Template already installed for this organization")

    # Create installation record
    installation = TemplateInstallation(
        template_id=template_id,
        organization_id=data.organization_id,
        installed_by_id=current_user.id,
        installed_version=template.version,
        custom_name=data.custom_name,
    )
    db.add(installation)
    await db.flush()

    # Increment install count
    if template.listing:
        template.listing.install_count += 1

    # Create audit log
    await create_audit_log(
        db,
        current_user,
        "template_installation",
        installation.id,
        AuditAction.CREATE,
        new_values=get_model_dict(installation)
    )

    await db.commit()
    await db.refresh(installation, ["installed_by"])
    return installation


@router.post("/marketplace/templates/{template_id}/ratings", response_model=TemplateRatingResponse, status_code=201)
async def create_template_rating(
    template_id: UUID,
    data: TemplateRatingCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Create a rating/review for a marketplace template.
    Users can only rate templates once. Rating must be between 1-5.
    """
    # Verify template_id matches the path parameter
    if data.template_id != template_id:
        raise HTTPException(status_code=400, detail="Template ID mismatch")

    # Verify template exists and is approved
    template_result = await db.execute(
        select(MarketplaceTemplate)
        .join(MarketplaceListing, MarketplaceTemplate.id == MarketplaceListing.template_id)
        .where(
            MarketplaceTemplate.id == template_id,
            MarketplaceListing.status == ListingStatus.APPROVED.value
        )
    )
    template = template_result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found or not approved")

    # Check if user already rated this template
    existing_rating = await db.execute(
        select(TemplateRating).where(
            TemplateRating.template_id == template_id,
            TemplateRating.user_id == current_user.id
        )
    )
    if existing_rating.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="You have already rated this template")

    # Create rating
    rating = TemplateRating(
        template_id=template_id,
        user_id=current_user.id,
        rating=data.rating,
        comment=data.comment,
    )
    db.add(rating)
    await db.flush()

    # Update listing stats
    await _update_listing_rating_stats(db, template_id)

    # Create audit log
    await create_audit_log(
        db,
        current_user,
        "template_rating",
        rating.id,
        AuditAction.CREATE,
        new_values=get_model_dict(rating)
    )

    await db.commit()
    await db.refresh(rating, ["user"])
    return rating


@router.put("/marketplace/templates/{template_id}/ratings/{rating_id}", response_model=TemplateRatingResponse)
async def update_template_rating(
    template_id: UUID,
    rating_id: UUID,
    data: TemplateRatingUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Update an existing rating/review.
    Users can only update their own ratings.
    """
    # Get the rating
    result = await db.execute(
        select(TemplateRating).where(
            TemplateRating.id == rating_id,
            TemplateRating.template_id == template_id
        )
    )
    rating = result.scalar_one_or_none()
    if not rating:
        raise HTTPException(status_code=404, detail="Rating not found")

    # Verify user owns this rating
    if rating.user_id != current_user.id and not current_user.is_super_admin:
        raise HTTPException(status_code=403, detail="You can only update your own ratings")

    old_values = get_model_dict(rating)

    # Update rating fields
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(rating, key, value)

    await db.flush()

    # Update listing stats
    await _update_listing_rating_stats(db, template_id)

    # Create audit log
    await create_audit_log(
        db,
        current_user,
        "template_rating",
        rating.id,
        AuditAction.UPDATE,
        old_values=old_values,
        new_values=get_model_dict(rating)
    )

    await db.commit()
    await db.refresh(rating, ["user"])
    return rating


@router.delete("/marketplace/templates/{template_id}/ratings/{rating_id}")
async def delete_template_rating(
    template_id: UUID,
    rating_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Delete a rating/review.
    Users can only delete their own ratings.
    """
    # Get the rating
    result = await db.execute(
        select(TemplateRating).where(
            TemplateRating.id == rating_id,
            TemplateRating.template_id == template_id
        )
    )
    rating = result.scalar_one_or_none()
    if not rating:
        raise HTTPException(status_code=404, detail="Rating not found")

    # Verify user owns this rating
    if rating.user_id != current_user.id and not current_user.is_super_admin:
        raise HTTPException(status_code=403, detail="You can only delete your own ratings")

    # Create audit log before deleting
    await create_audit_log(
        db,
        current_user,
        "template_rating",
        rating.id,
        AuditAction.DELETE,
        old_values=get_model_dict(rating)
    )

    await db.delete(rating)
    await db.flush()

    # Update listing stats
    await _update_listing_rating_stats(db, template_id)

    await db.commit()
    return {"message": "Rating deleted"}
