from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.security import get_current_user, verify_project_access
from app.db.session import get_db
from app.models.collaborative_document import CollaborativeDocument, DocumentCollaborator
from app.models.user import User
from app.schemas.collaborative_document import (
    CollaborativeDocumentCreate,
    CollaborativeDocumentListResponse,
    CollaborativeDocumentResponse,
    CollaborativeDocumentUpdate,
    CollaboratorBrief,
)
from app.utils import utcnow

router = APIRouter()

LOAD_OPTIONS = [
    selectinload(CollaborativeDocument.creator),
    selectinload(CollaborativeDocument.collaborators).selectinload(DocumentCollaborator.user),
]


def build_document_response(doc: CollaborativeDocument) -> CollaborativeDocumentResponse:
    collabs = [
        CollaboratorBrief(
            id=c.id, user_id=c.user_id,
            full_name=c.user.full_name if c.user else "",
            email=c.user.email if c.user else "",
            is_active=c.is_active, last_seen_at=c.last_seen_at,
            cursor_position=c.cursor_position,
        )
        for c in (doc.collaborators or [])
    ]
    return CollaborativeDocumentResponse(
        id=doc.id, project_id=doc.project_id, title=doc.title,
        content_type=doc.content_type, created_by=doc.created_by,
        created_at=doc.created_at, updated_at=doc.updated_at,
        creator_name=doc.creator.full_name if doc.creator else "",
        collaborators=collabs,
        active_count=sum(1 for c in collabs if c.is_active),
    )


async def load_doc(db: AsyncSession, project_id: UUID, doc_id: UUID) -> CollaborativeDocument:
    result = await db.execute(
        select(CollaborativeDocument).options(*LOAD_OPTIONS).where(
            CollaborativeDocument.id == doc_id,
            CollaborativeDocument.project_id == project_id,
        )
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc


@router.get(
    "/projects/{project_id}/collaborative-documents",
    response_model=list[CollaborativeDocumentListResponse],
)
async def list_collaborative_documents(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await verify_project_access(project_id, current_user, db)
    active_subq = (
        select(DocumentCollaborator.document_id, func.count().label("active_count"))
        .where(DocumentCollaborator.is_active.is_(True))
        .group_by(DocumentCollaborator.document_id)
        .subquery()
    )
    result = await db.execute(
        select(CollaborativeDocument, func.coalesce(active_subq.c.active_count, 0))
        .outerjoin(active_subq, CollaborativeDocument.id == active_subq.c.document_id)
        .options(selectinload(CollaborativeDocument.creator))
        .where(CollaborativeDocument.project_id == project_id)
        .order_by(CollaborativeDocument.updated_at.desc())
    )
    return [
        CollaborativeDocumentListResponse(
            id=doc.id, project_id=doc.project_id, title=doc.title,
            content_type=doc.content_type, created_by=doc.created_by,
            created_at=doc.created_at, updated_at=doc.updated_at,
            creator_name=doc.creator.full_name if doc.creator else "",
            active_count=count,
        )
        for doc, count in result.all()
    ]


@router.post(
    "/projects/{project_id}/collaborative-documents",
    response_model=CollaborativeDocumentResponse,
)
async def create_collaborative_document(
    project_id: UUID,
    data: CollaborativeDocumentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await verify_project_access(project_id, current_user, db)
    doc = CollaborativeDocument(
        project_id=project_id, title=data.title,
        content_type=data.content_type, created_by=current_user.id,
    )
    db.add(doc)
    await db.flush()
    result = await db.execute(
        select(CollaborativeDocument).options(*LOAD_OPTIONS)
        .where(CollaborativeDocument.id == doc.id)
    )
    return build_document_response(result.scalar_one())


@router.get(
    "/projects/{project_id}/collaborative-documents/{doc_id}",
    response_model=CollaborativeDocumentResponse,
)
async def get_collaborative_document(
    project_id: UUID, doc_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await verify_project_access(project_id, current_user, db)
    return build_document_response(await load_doc(db, project_id, doc_id))


@router.put(
    "/projects/{project_id}/collaborative-documents/{doc_id}",
    response_model=CollaborativeDocumentResponse,
)
async def update_collaborative_document(
    project_id: UUID, doc_id: UUID, data: CollaborativeDocumentUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await verify_project_access(project_id, current_user, db)
    doc = await load_doc(db, project_id, doc_id)
    if data.title is not None:
        doc.title = data.title
    await db.flush()
    return build_document_response(await load_doc(db, project_id, doc_id))


@router.delete("/projects/{project_id}/collaborative-documents/{doc_id}")
async def delete_collaborative_document(
    project_id: UUID, doc_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await verify_project_access(project_id, current_user, db)
    result = await db.execute(
        select(CollaborativeDocument).where(
            CollaborativeDocument.id == doc_id,
            CollaborativeDocument.project_id == project_id,
        )
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if doc.created_by != current_user.id and not current_user.is_super_admin:
        raise HTTPException(status_code=403, detail="Only the creator can delete this document")
    await db.delete(doc)
    return {"message": "Document deleted"}


@router.post("/projects/{project_id}/collaborative-documents/{doc_id}/collaborators")
async def join_document(
    project_id: UUID, doc_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await verify_project_access(project_id, current_user, db)
    doc_result = await db.execute(
        select(CollaborativeDocument.id).where(
            CollaborativeDocument.id == doc_id,
            CollaborativeDocument.project_id == project_id,
        )
    )
    if not doc_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Document not found")
    existing = await db.execute(
        select(DocumentCollaborator).where(
            DocumentCollaborator.document_id == doc_id,
            DocumentCollaborator.user_id == current_user.id,
        )
    )
    collab = existing.scalar_one_or_none()
    if collab:
        collab.is_active = True
        collab.last_seen_at = utcnow()
    else:
        collab = DocumentCollaborator(
            document_id=doc_id, user_id=current_user.id,
            is_active=True, last_seen_at=utcnow(),
        )
        db.add(collab)
    await db.flush()
    return {"message": "Joined document", "collaborator_id": str(collab.id)}


@router.delete("/projects/{project_id}/collaborative-documents/{doc_id}/collaborators")
async def leave_document(
    project_id: UUID, doc_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await verify_project_access(project_id, current_user, db)
    result = await db.execute(
        select(DocumentCollaborator).where(
            DocumentCollaborator.document_id == doc_id,
            DocumentCollaborator.user_id == current_user.id,
        )
    )
    collab = result.scalar_one_or_none()
    if collab:
        collab.is_active = False
    return {"message": "Left document"}
