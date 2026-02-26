import csv
import io
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.permissions import Permission, require_permission
from app.core.security import get_current_user, verify_project_access
from app.db.session import get_db
from app.models.approval import ApprovalStep
from app.models.audit import AuditAction
from app.models.contact import Contact
from app.models.project import ProjectMember
from app.models.user import User
from app.schemas.contact import BulkContactImport, BulkImportResponse, ContactCreate, ContactResponse, ContactUpdate
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

    pending_counts_subq = (
        select(ApprovalStep.contact_id, func.count().label("cnt"))
        .where(ApprovalStep.status == "pending", ApprovalStep.contact_id.isnot(None))
        .group_by(ApprovalStep.contact_id)
        .subquery()
    )

    result = await db.execute(
        select(Contact)
        .options(selectinload(Contact.user))
        .where(Contact.project_id == project_id)
        .order_by(Contact.company_name, Contact.contact_name)
    )
    contacts = result.scalars().all()

    count_result = await db.execute(
        select(pending_counts_subq.c.contact_id, pending_counts_subq.c.cnt)
    )
    counts_map = {row.contact_id: row.cnt for row in count_result}

    response = []
    for contact in contacts:
        contact_data = ContactResponse.model_validate(contact)
        contact_data.pending_approvals_count = counts_map.get(contact.id, 0)
        response.append(contact_data)

    return response


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
    output.write("\ufeff")
    writer = csv.DictWriter(output, fieldnames=CSV_HEADERS)
    writer.writeheader()
    for contact in contacts:
        writer.writerow({h: getattr(contact, h, "") or "" for h in CSV_HEADERS})

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f"attachment; filename=contacts_{project_id}.csv"},
    )


@router.post("/projects/{project_id}/contacts/import", response_model=BulkImportResponse)
async def import_contacts_csv(
    project_id: UUID,
    file: UploadFile = File(...),
    member: ProjectMember = require_permission(Permission.CREATE),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    existing = await db.execute(
        select(Contact.contact_name, Contact.phone, Contact.email)
        .where(Contact.project_id == project_id)
    )
    existing_set = set()
    for row in existing:
        key = (row.contact_name.strip().lower(), (row.phone or "").strip(), (row.email or "").strip().lower())
        existing_set.add(key)

    content = await file.read()
    text = content.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))

    imported_count = 0
    skipped_count = 0
    errors = []
    for line_num, row in enumerate(reader, start=2):
        contact_name = (row.get("contact_name") or "").strip()
        contact_type = (row.get("contact_type") or "").strip()
        if not contact_name or not contact_type:
            continue

        email = (row.get("email") or "").strip() or None
        if email and ("@" not in email or len(email) > 255):
            errors.append(f"Row {line_num}: invalid email '{email}'")
            continue

        phone = (row.get("phone") or "").strip() or None
        if phone and len(phone) > 50:
            errors.append(f"Row {line_num}: phone too long")
            continue

        if len(contact_name) > 255 or len(contact_type) > 100:
            errors.append(f"Row {line_num}: field too long")
            continue

        dedup_key = (contact_name.lower(), phone or "", (email or "").lower())
        if dedup_key in existing_set:
            skipped_count += 1
            continue

        contact = Contact(
            project_id=project_id,
            contact_name=contact_name,
            contact_type=contact_type,
            company_name=(row.get("company_name") or "").strip()[:255] or None,
            role_description=(row.get("role_description") or "").strip()[:255] or None,
            email=email,
            phone=phone,
        )
        db.add(contact)
        existing_set.add(dedup_key)
        imported_count += 1

    await db.commit()
    return BulkImportResponse(
        imported_count=imported_count,
        skipped_count=skipped_count,
        errors=errors[:20],
    )


@router.post("/projects/{project_id}/contacts/import-bulk", response_model=BulkImportResponse)
async def import_contacts_bulk(
    project_id: UUID,
    data: BulkContactImport,
    member: ProjectMember = require_permission(Permission.CREATE),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    existing = await db.execute(
        select(Contact.contact_name, Contact.phone, Contact.email)
        .where(Contact.project_id == project_id)
    )
    existing_set = set()
    for row in existing:
        key = (row.contact_name.strip().lower(), (row.phone or "").strip(), (row.email or "").strip().lower())
        existing_set.add(key)

    imported_count = 0
    skipped_count = 0
    errors = []

    for i, item in enumerate(data.contacts):
        name = item.contact_name.strip()
        phone = (item.phone or "").strip() or None
        email = (item.email or "").strip() or None

        dedup_key = (name.lower(), phone or "", (email or "").lower())
        if dedup_key in existing_set:
            skipped_count += 1
            continue

        if email and ("@" not in email or len(email) > 255):
            errors.append(f"Row {i + 1}: invalid email '{email}'")
            continue

        contact = Contact(
            project_id=project_id,
            contact_name=name,
            contact_type=item.contact_type.strip(),
            company_name=(item.company_name or "").strip()[:255] or None,
            role_description=(item.role_description or "").strip()[:255] or None,
            email=email,
            phone=phone,
        )
        db.add(contact)
        existing_set.add(dedup_key)
        imported_count += 1

    await db.commit()
    return BulkImportResponse(
        imported_count=imported_count,
        skipped_count=skipped_count,
        errors=errors[:20],
    )


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

    await db.refresh(contact, ["user"])
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
        .options(selectinload(Contact.user))
        .where(Contact.id == contact_id, Contact.project_id == project_id)
    )
    contact = result.scalar_one_or_none()
    if not contact:
        language = get_language_from_request(request)
        error_message = translate_message('resources.contact_not_found', language)
        raise HTTPException(status_code=404, detail=error_message)

    count_result = await db.execute(
        select(func.count()).where(
            ApprovalStep.contact_id == contact_id,
            ApprovalStep.status == "pending"
        )
    )
    contact_data = ContactResponse.model_validate(contact)
    contact_data.pending_approvals_count = count_result.scalar() or 0
    return contact_data


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

    await db.commit()
    await db.refresh(contact, ["user"])
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
    await db.commit()
    return {"message": "Contact deleted"}
