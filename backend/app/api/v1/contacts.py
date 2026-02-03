from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.models.contact import Contact
from app.models.user import User
from app.schemas.contact import ContactCreate, ContactUpdate, ContactResponse
from app.services.audit_service import create_audit_log, get_model_dict
from app.models.audit import AuditAction
from app.core.security import get_current_user
from app.utils.localization import get_language_from_request, translate_message

router = APIRouter()


@router.get("/projects/{project_id}/contacts", response_model=list[ContactResponse])
async def list_contacts(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Contact)
        .where(Contact.project_id == project_id)
        .order_by(Contact.company_name, Contact.contact_name)
    )
    return result.scalars().all()


@router.post("/projects/{project_id}/contacts", response_model=ContactResponse)
async def create_contact(
    project_id: UUID,
    data: ContactCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    contact = Contact(**data.model_dump(), project_id=project_id)
    db.add(contact)
    await db.flush()

    await create_audit_log(db, current_user, "contact", contact.id, AuditAction.CREATE,
                          project_id=project_id, new_values=get_model_dict(contact))

    await db.refresh(contact)
    return contact


@router.get("/projects/{project_id}/contacts/{contact_id}", response_model=ContactResponse)
async def get_contact(project_id: UUID, contact_id: UUID, db: AsyncSession = Depends(get_db), request: Request = None):
    result = await db.execute(
        select(Contact)
        .where(Contact.id == contact_id, Contact.project_id == project_id)
    )
    contact = result.scalar_one_or_none()
    if not contact:
        language = get_language_from_request(request)
        error_message = translate_message('resources.contact_not_found', language)
        raise HTTPException(status_code=404, detail=error_message)
    return contact


@router.put("/projects/{project_id}/contacts/{contact_id}", response_model=ContactResponse)
async def update_contact(
    project_id: UUID,
    contact_id: UUID,
    data: ContactUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    request: Request = None
):
    result = await db.execute(select(Contact).where(Contact.id == contact_id))
    contact = result.scalar_one_or_none()
    if not contact:
        language = get_language_from_request(request)
        error_message = translate_message('resources.contact_not_found', language)
        raise HTTPException(status_code=404, detail=error_message)

    old_values = get_model_dict(contact)
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(contact, key, value)

    await create_audit_log(db, current_user, "contact", contact.id, AuditAction.UPDATE,
                          project_id=project_id, old_values=old_values, new_values=get_model_dict(contact))

    return contact


@router.delete("/projects/{project_id}/contacts/{contact_id}")
async def delete_contact(
    project_id: UUID,
    contact_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    request: Request = None
):
    result = await db.execute(select(Contact).where(Contact.id == contact_id))
    contact = result.scalar_one_or_none()
    if not contact:
        language = get_language_from_request(request)
        error_message = translate_message('resources.contact_not_found', language)
        raise HTTPException(status_code=404, detail=error_message)

    await create_audit_log(db, current_user, "contact", contact.id, AuditAction.DELETE,
                          project_id=project_id, old_values=get_model_dict(contact))

    await db.delete(contact)
    return {"message": "Contact deleted"}
