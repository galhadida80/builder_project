from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.security import get_current_user, verify_project_access
from app.db.session import get_db
from app.models.audit import AuditAction
from app.models.document_review import DocumentComment, DocumentReview, ReviewStatus
from app.models.user import User
from app.schemas.document_review import (
    DocumentCommentCreate,
    DocumentCommentResponse,
    DocumentCommentUpdate,
    DocumentReviewResponse,
    DocumentReviewUpdate,
)
from app.services.audit_service import create_audit_log, get_model_dict

router = APIRouter()


# Document Review Endpoints
@router.get("/projects/{project_id}/documents/{document_id}/review", response_model=DocumentReviewResponse)
async def get_document_review(
    project_id: UUID,
    document_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get or create a document review for a specific document"""
    await verify_project_access(project_id, current_user, db)
    result = await db.execute(
        select(DocumentReview)
        .options(
            selectinload(DocumentReview.created_by),
            selectinload(DocumentReview.reviewed_by),
            selectinload(DocumentReview.document),
            selectinload(DocumentReview.comments).selectinload(DocumentComment.created_by),
            selectinload(DocumentReview.comments).selectinload(DocumentComment.replies).selectinload(DocumentComment.created_by)
        )
        .where(
            DocumentReview.project_id == project_id,
            DocumentReview.document_id == document_id
        )
    )
    review = result.scalar_one_or_none()
    if not review:
        raise HTTPException(status_code=404, detail="Document review not found")
    return review


@router.post("/projects/{project_id}/documents/{document_id}/review", response_model=DocumentReviewResponse, status_code=status.HTTP_201_CREATED)
async def create_document_review(
    project_id: UUID,
    document_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new document review"""
    await verify_project_access(project_id, current_user, db)
    # Check if review already exists
    existing = await db.execute(
        select(DocumentReview)
        .where(
            DocumentReview.project_id == project_id,
            DocumentReview.document_id == document_id
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Document review already exists")

    review = DocumentReview(
        project_id=project_id,
        document_id=document_id,
        created_by_id=current_user.id,
        status=ReviewStatus.PENDING.value
    )
    db.add(review)
    await db.flush()

    await create_audit_log(
        db, current_user, "document_review", review.id, AuditAction.CREATE,
        project_id=project_id,
        new_values=get_model_dict(review)
    )

    await db.commit()
    await db.refresh(review, ["created_by", "reviewed_by", "document", "comments"])
    return review


@router.patch("/projects/{project_id}/documents/{document_id}/review", response_model=DocumentReviewResponse)
async def update_document_review(
    project_id: UUID,
    document_id: UUID,
    data: DocumentReviewUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a document review status"""
    await verify_project_access(project_id, current_user, db)
    result = await db.execute(
        select(DocumentReview)
        .where(
            DocumentReview.project_id == project_id,
            DocumentReview.document_id == document_id
        )
    )
    review = result.scalar_one_or_none()
    if not review:
        raise HTTPException(status_code=404, detail="Document review not found")

    old_values = get_model_dict(review)

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(review, key, value)

    if data.status is not None:
        review.reviewed_by_id = current_user.id
        review.reviewed_at = datetime.now(timezone.utc)

    await create_audit_log(
        db, current_user, "document_review", review.id, AuditAction.UPDATE,
        project_id=project_id,
        old_values=old_values,
        new_values=get_model_dict(review)
    )

    await db.commit()
    await db.refresh(review, ["created_by", "reviewed_by", "document", "comments"])
    return review


# Document Comment Endpoints
@router.get("/projects/{project_id}/documents/{document_id}/comments", response_model=list[DocumentCommentResponse])
async def list_document_comments(
    project_id: UUID,
    document_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all comments for a document"""
    await verify_project_access(project_id, current_user, db)
    # First get the review
    review_result = await db.execute(
        select(DocumentReview)
        .where(
            DocumentReview.project_id == project_id,
            DocumentReview.document_id == document_id
        )
    )
    review = review_result.scalar_one_or_none()
    if not review:
        raise HTTPException(status_code=404, detail="Document review not found")

    # Get all root comments (those without a parent)
    result = await db.execute(
        select(DocumentComment)
        .options(
            selectinload(DocumentComment.created_by),
            selectinload(DocumentComment.replies).selectinload(DocumentComment.created_by),
            selectinload(DocumentComment.replies).selectinload(DocumentComment.replies).selectinload(DocumentComment.created_by),
        )
        .where(
            DocumentComment.review_id == review.id,
            DocumentComment.parent_comment_id.is_(None)
        )
        .order_by(DocumentComment.created_at.asc())
    )
    return result.scalars().all()


@router.post("/projects/{project_id}/documents/{document_id}/comments", response_model=DocumentCommentResponse, status_code=status.HTTP_201_CREATED)
async def create_document_comment(
    project_id: UUID,
    document_id: UUID,
    data: DocumentCommentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new comment on a document"""
    await verify_project_access(project_id, current_user, db)
    # Get or create review
    review_result = await db.execute(
        select(DocumentReview)
        .where(
            DocumentReview.project_id == project_id,
            DocumentReview.document_id == document_id
        )
    )
    review = review_result.scalar_one_or_none()

    if not review:
        # Auto-create review if it doesn't exist
        review = DocumentReview(
            project_id=project_id,
            document_id=document_id,
            created_by_id=current_user.id,
            status=ReviewStatus.IN_REVIEW.value
        )
        db.add(review)
        await db.flush()

    # Validate parent comment if specified
    if data.parent_comment_id:
        parent_result = await db.execute(
            select(DocumentComment)
            .where(
                DocumentComment.id == data.parent_comment_id,
                DocumentComment.review_id == review.id
            )
        )
        if not parent_result.scalar_one_or_none():
            raise HTTPException(status_code=404, detail="Parent comment not found")

    comment = DocumentComment(
        review_id=review.id,
        comment_text=data.comment_text,
        parent_comment_id=data.parent_comment_id,
        created_by_id=current_user.id
    )
    db.add(comment)
    await db.flush()

    await create_audit_log(
        db, current_user, "document_comment", comment.id, AuditAction.CREATE,
        project_id=project_id,
        new_values=get_model_dict(comment)
    )

    await db.commit()
    await db.refresh(comment, ["created_by", "replies"])
    return comment


@router.put("/comments/{comment_id}", response_model=DocumentCommentResponse)
async def update_document_comment(
    comment_id: UUID,
    data: DocumentCommentUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a comment"""
    result = await db.execute(
        select(DocumentComment)
        .options(
            selectinload(DocumentComment.review),
            selectinload(DocumentComment.created_by)
        )
        .where(DocumentComment.id == comment_id)
    )
    comment = result.scalar_one_or_none()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")

    # Check if user owns the comment
    if comment.created_by_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this comment")

    old_values = get_model_dict(comment)

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(comment, key, value)

    await create_audit_log(
        db, current_user, "document_comment", comment.id, AuditAction.UPDATE,
        project_id=comment.review.project_id,
        old_values=old_values,
        new_values=get_model_dict(comment)
    )

    await db.commit()
    await db.refresh(comment, ["created_by", "replies"])
    return comment


@router.delete("/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document_comment(
    comment_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a comment"""
    result = await db.execute(
        select(DocumentComment)
        .options(selectinload(DocumentComment.review))
        .where(DocumentComment.id == comment_id)
    )
    comment = result.scalar_one_or_none()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")

    # Check if user owns the comment
    if comment.created_by_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this comment")

    await create_audit_log(
        db, current_user, "document_comment", comment.id, AuditAction.DELETE,
        project_id=comment.review.project_id,
        old_values=get_model_dict(comment)
    )

    await db.delete(comment)
    await db.commit()
    return None
