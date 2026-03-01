from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_, select
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
    MarketplaceTemplateCreate,
    MarketplaceTemplateDetailResponse,
    MarketplaceTemplateWithListingResponse,
    TemplateInstallationCreate,
    TemplateInstallationResponse,
    TemplateRatingCreate,
    TemplateRatingResponse,
    TemplateRatingUpdate,
)
from app.services.audit_service import create_audit_log, get_model_dict

router = APIRouter()


@router.get("/marketplace/templates", response_model=list[MarketplaceTemplateWithListingResponse])
async def list_marketplace_templates(
    template_type: str | None = Query(None, description="Filter by template type"),
    category: str | None = Query(None, description="Filter by category"),
    trade: str | None = Query(None, description="Filter by trade"),
    building_type: str | None = Query(None, description="Filter by building type"),
    regulatory_standard: str | None = Query(None, description="Filter by regulatory standard"),
    tier: str | None = Query(None, description="Filter by tier (free/premium)"),
    is_official: bool | None = Query(None, description="Filter official templates"),
    featured: bool | None = Query(None, description="Filter featured templates"),
    search: str | None = Query(None, description="Search by name (English or Hebrew)"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Browse marketplace templates with optional filters.
    Returns only approved listings.
    """
    query = (
        select(MarketplaceTemplate)
        .join(MarketplaceListing, MarketplaceTemplate.id == MarketplaceListing.template_id)
        .options(selectinload(MarketplaceTemplate.listing))
        .where(MarketplaceListing.status == ListingStatus.APPROVED.value)
    )

    # Apply filters
    if template_type:
        query = query.where(MarketplaceTemplate.template_type == template_type)
    if category:
        query = query.where(MarketplaceTemplate.category == category)
    if trade:
        query = query.where(MarketplaceTemplate.trade == trade)
    if building_type:
        query = query.where(MarketplaceTemplate.building_type == building_type)
    if regulatory_standard:
        query = query.where(MarketplaceTemplate.regulatory_standard == regulatory_standard)
    if tier:
        query = query.where(MarketplaceTemplate.tier == tier)
    if is_official is not None:
        query = query.where(MarketplaceTemplate.is_official == is_official)
    if featured is not None:
        query = query.where(MarketplaceListing.featured == featured)
    if search:
        search_pattern = f"%{search}%"
        query = query.where(
            or_(
                MarketplaceTemplate.name.ilike(search_pattern),
                MarketplaceTemplate.name_he.ilike(search_pattern),
            )
        )

    # Order by featured first, then by install count, then by rating
    query = query.order_by(
        MarketplaceListing.featured.desc(),
        MarketplaceListing.install_count.desc(),
        MarketplaceListing.average_rating.desc().nullslast(),
        MarketplaceTemplate.created_at.desc(),
    )

    result = await db.execute(query)
    templates = result.scalars().all()

    return templates


@router.get("/marketplace/templates/{template_id}", response_model=MarketplaceTemplateDetailResponse)
async def get_marketplace_template(
    template_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get detailed information about a specific marketplace template.
    Returns only approved listings with ratings and creator information.
    """
    result = await db.execute(
        select(MarketplaceTemplate)
        .options(
            selectinload(MarketplaceTemplate.listing),
            selectinload(MarketplaceTemplate.created_by),
            selectinload(MarketplaceTemplate.ratings).selectinload(TemplateRating.user),
        )
        .join(MarketplaceListing, MarketplaceTemplate.id == MarketplaceListing.template_id)
        .where(
            MarketplaceTemplate.id == template_id,
            MarketplaceListing.status == ListingStatus.APPROVED.value
        )
    )
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found or not available")
    return template


@router.post("/marketplace/contribute", response_model=MarketplaceTemplateWithListingResponse, status_code=201)
async def contribute_marketplace_template(
    data: MarketplaceTemplateCreate,
    organization_id: UUID | None = Query(None, description="Optional organization ID to associate with this template"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Submit a template for marketplace review.
    Creates a new marketplace template with PENDING_REVIEW status.

    Workflow:
    - User submits template with all required data
    - Template is created with created_by_id set to current user
    - Listing is created with status=PENDING_REVIEW
    - Admin reviews and approves/rejects the template
    - If approved, template becomes visible in marketplace
    """
    # If organization_id provided, verify user is a member
    if organization_id:
        org_member_result = await db.execute(
            select(OrganizationMember).where(
                OrganizationMember.organization_id == organization_id,
                OrganizationMember.user_id == current_user.id,
            )
        )
        org_member = org_member_result.scalar_one_or_none()
        if not org_member and not current_user.is_super_admin:
            raise HTTPException(status_code=403, detail="Not a member of the specified organization")

    # Create marketplace template
    template = MarketplaceTemplate(
        **data.model_dump(),
        created_by_id=current_user.id,
        organization_id=organization_id,
        is_official=False  # Only admins can create official templates
    )
    db.add(template)
    await db.flush()

    # Create listing with PENDING_REVIEW status
    listing = MarketplaceListing(
        template_id=template.id,
        status=ListingStatus.PENDING_REVIEW.value,
        featured=False
    )
    db.add(listing)
    await db.flush()

    # Create audit log
    await create_audit_log(
        db,
        current_user,
        "marketplace_template",
        template.id,
        AuditAction.CREATE,
        new_values=get_model_dict(template)
    )

    await db.commit()
    await db.refresh(template, ["created_by", "listing"])
    return template


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


async def update_listing_rating_stats(db: AsyncSession, template_id: UUID):
    """
    Recalculate and update average_rating and review_count for a template's listing.
    """

    # Get all ratings for this template
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
    await update_listing_rating_stats(db, template_id)

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
    await update_listing_rating_stats(db, template_id)

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
    await update_listing_rating_stats(db, template_id)

    await db.commit()
    return {"message": "Rating deleted"}
