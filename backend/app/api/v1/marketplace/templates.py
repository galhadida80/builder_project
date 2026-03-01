from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.security import get_current_user
from app.db.session import get_db
from app.models.audit import AuditAction
from app.models.marketplace_template import (
    ListingStatus,
    MarketplaceListing,
    MarketplaceTemplate,
)
from app.models.organization import OrganizationMember
from app.models.user import User
from app.schemas.marketplace_template import (
    MarketplaceTemplateCreate,
    MarketplaceTemplateDetailResponse,
    MarketplaceTemplateWithListingResponse,
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
            selectinload(MarketplaceTemplate.ratings).selectinload("user"),
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
