import csv
import io
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.permissions import Permission, require_permission
from app.core.security import get_current_user, verify_project_access
from app.db.session import get_db
from app.models.audit import AuditAction
from app.models.contact import Contact
from app.models.project import ProjectMember
from app.models.user import User
from app.schemas.contact import ContactCreate, ContactResponse, ContactUpdate
from app.services.audit_service import create_audit_log, get_model_dict
from app.utils.localization import get_language_from_request, translate_message

router = APIRouter()


@router.get("/projects/{project_id}/contacts", response_model=list[ContactResponse])
async def list_contacts(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    await verify_project_access(project_id, current_user, db)
    result = await db.execute(
        select(Contact)
        .where(Contact.project_id == project_id)
        .order_by(Contact.company_name, Contact.contact_name)
    )
    return result.scalars().all()


CSV_HEADERS = ["contact_name", "contact_type", "company_name", "role_description", "email", "phone", "notes"]


@router.get("/projects/{project_id}/contacts/export")
async def export_contacts_csv(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await verify_project_access(project_id, current_user, db)
    result = await db.execute(
        select(Contact)
        .where(Contact.project_id == project_id)
        .order_by(Contact.company_name, Contact.contact_name)
    )
    contacts = result.scalars().all()

    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=CSV_HEADERS)
    writer.writeheader()
    for contact in contacts:
        writer.writerow({h: getattr(contact, h, "") or "" for h in CSV_HEADERS})

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=contacts_{project_id}.csv"},
    )


@router.post("/projects/{project_id}/contacts/import")
async def import_contacts_csv(
    project_id: UUID,
    file: UploadFile = File(...),
    member: ProjectMember = require_permission(Permission.CREATE),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):

    content = await file.read()
    text = content.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))

    imported_count = 0
    for row in reader:
        contact_name = (row.get("contact_name") or "").strip()
        contact_type = (row.get("contact_type") or "").strip()
        if not contact_name or not contact_type:
            continue

        contact = Contact(
            project_id=project_id,
            contact_name=contact_name,
            contact_type=contact_type,
            company_name=(row.get("company_name") or "").strip() or None,
            role_description=(row.get("role_description") or "").strip() or None,
            email=(row.get("email") or "").strip() or None,
            phone=(row.get("phone") or "").strip() or None,
        )
        db.add(contact)
        imported_count += 1

    await db.flush()
    return {"imported_count": imported_count}


@router.post("/projects/{project_id}/contacts", response_model=ContactResponse)
async def create_contact(
    project_id: UUID,
    data: ContactCreate,
    member: ProjectMember = require_permission(Permission.CREATE),
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
async def get_contact(
    project_id: UUID,
    contact_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    request: Request = None
):
    await verify_project_access(project_id, current_user, db)
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
    member: ProjectMember = require_permission(Permission.EDIT),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    request: Request = None
):
    result = await db.execute(
        select(Contact).where(Contact.id == contact_id, Contact.project_id == project_id)
    )
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
    member: ProjectMember = require_permission(Permission.DELETE),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    request: Request = None
):
    result = await db.execute(
        select(Contact).where(Contact.id == contact_id, Contact.project_id == project_id)
    )
    contact = result.scalar_one_or_none()
    if not contact:
        language = get_language_from_request(request)
        error_message = translate_message('resources.contact_not_found', language)
        raise HTTPException(status_code=404, detail=error_message)

    await create_audit_log(db, current_user, "contact", contact.id, AuditAction.DELETE,
                          project_id=project_id, old_values=get_model_dict(contact))

    await db.delete(contact)
    return {"message": "Contact deleted"}
