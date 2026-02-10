#!/usr/bin/env python3
"""
End-to-End Test for Document Review Workflow
Run this from the backend directory with: python test_document_review_e2e.py
"""
import asyncio
import sys
from datetime import datetime
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import async_session_maker
from app.models.document_review import DocumentComment, DocumentReview, ReviewStatus
from app.models.file import File
from app.models.project import Project
from app.models.user import User


async def get_or_create_test_data(db: AsyncSession):
    """Get or create test data for E2E testing"""
    print("\n📋 Getting test data...")

    # Get first user
    result = await db.execute(select(User).limit(1))
    user = result.scalar_one_or_none()
    if not user:
        print("❌ No users found. Please create a user first.")
        return None

    print(f"✅ Using user: {user.email}")

    # Get first project
    result = await db.execute(select(Project).limit(1))
    project = result.scalar_one_or_none()
    if not project:
        print("❌ No projects found. Please create a project first.")
        return None

    print(f"✅ Using project: {project.name}")

    # Get or create a test document
    result = await db.execute(
        select(File)
        .where(File.project_id == project.id)
        .limit(1)
    )
    document = result.scalar_one_or_none()

    if not document:
        # Create test document
        document = File(
            id=uuid4(),
            project_id=project.id,
            filename="e2e-test-document.pdf",
            file_path="/test/e2e-test-document.pdf",
            file_type="application/pdf",
            file_size=1024,
            uploaded_by_id=user.id,
            entity_type="document",
            entity_id=uuid4()
        )
        db.add(document)
        await db.commit()
        await db.refresh(document)
        print(f"✅ Created test document: {document.filename}")
    else:
        print(f"✅ Using document: {document.filename}")

    return {
        'user': user,
        'project': project,
        'document': document
    }


async def run_e2e_test():
    """Run the complete E2E test"""
    async with async_session_maker() as db:
        try:
            # Get test data
            test_data = await get_or_create_test_data(db)
            if not test_data:
                return False

            user = test_data['user']
            project = test_data['project']
            document = test_data['document']

            print("\n" + "="*60)
            print("Starting E2E Document Review Workflow Test")
            print("="*60)

            # Step 1: Create document review
            print("\n📋 Step 1: Creating document review...")
            review = DocumentReview(
                id=uuid4(),
                project_id=project.id,
                document_id=document.id,
                status=ReviewStatus.PENDING,
                created_by_id=user.id
            )
            db.add(review)
            await db.commit()
            await db.refresh(review)
            print(f"✅ Created review {review.id}")
            print(f"   Status: {review.status.value}")

            # Step 2: Verify review retrieval
            print("\n📋 Step 2: Retrieving document review...")
            result = await db.execute(
                select(DocumentReview)
                .where(
                    DocumentReview.project_id == project.id,
                    DocumentReview.document_id == document.id
                )
            )
            fetched_review = result.scalar_one_or_none()
            assert fetched_review is not None, "Review not found"
            print(f"✅ Retrieved review {fetched_review.id}")

            # Step 3: Create first comment
            print("\n📋 Step 3: Creating first comment...")
            comment1 = DocumentComment(
                id=uuid4(),
                review_id=review.id,
                comment_text="This is a test comment for E2E verification",
                created_by_id=user.id,
                is_resolved=False
            )
            db.add(comment1)
            await db.commit()
            await db.refresh(comment1)
            print(f"✅ Created comment {comment1.id}")
            print(f"   Text: '{comment1.comment_text}'")

            # Step 4: Verify comment in list
            print("\n📋 Step 4: Verifying comment appears in list...")
            result = await db.execute(
                select(DocumentComment)
                .where(DocumentComment.review_id == review.id)
            )
            comments = result.scalars().all()
            assert len(comments) == 1, f"Expected 1 comment, got {len(comments)}"
            assert comments[0].id == comment1.id, "Comment ID mismatch"
            print("✅ Comment found in list")
            print(f"   Created at: {comments[0].created_at}")

            # Step 5: Edit comment
            print("\n📋 Step 5: Editing comment...")
            old_text = comment1.comment_text
            new_text = "This is an EDITED test comment"
            comment1.comment_text = new_text
            comment1.updated_at = datetime.utcnow()
            await db.commit()
            await db.refresh(comment1)
            print("✅ Comment edited")
            print(f"   Old: '{old_text}'")
            print(f"   New: '{comment1.comment_text}'")

            # Step 6: Verify edit persists
            print("\n📋 Step 6: Verifying edit persists...")
            result = await db.execute(
                select(DocumentComment)
                .where(DocumentComment.id == comment1.id)
            )
            updated = result.scalar_one_or_none()
            assert updated is not None, "Comment not found after edit"
            assert updated.comment_text == new_text, "Edit did not persist"
            print(f"✅ Edit persisted: '{updated.comment_text}'")

            # Step 7: Add reply
            print("\n📋 Step 7: Adding reply to comment...")
            reply = DocumentComment(
                id=uuid4(),
                review_id=review.id,
                parent_comment_id=comment1.id,
                comment_text="This is a reply to the comment",
                created_by_id=user.id,
                is_resolved=False
            )
            db.add(reply)
            await db.commit()
            await db.refresh(reply)
            print(f"✅ Created reply {reply.id}")
            print(f"   Parent: {reply.parent_comment_id}")

            # Step 8: Verify reply relationship
            print("\n📋 Step 8: Verifying reply relationship...")
            result = await db.execute(
                select(DocumentComment)
                .where(DocumentComment.parent_comment_id == comment1.id)
            )
            replies = result.scalars().all()
            assert len(replies) == 1, f"Expected 1 reply, got {len(replies)}"
            print("✅ Reply linked correctly")

            # Step 9: Update review status
            print("\n📋 Step 9: Updating review status to APPROVED...")
            review.status = ReviewStatus.APPROVED
            review.reviewed_by_id = user.id
            review.reviewed_at = datetime.utcnow()
            await db.commit()
            await db.refresh(review)
            print(f"✅ Status updated to {review.status.value}")
            print(f"   Reviewed by: {user.email}")

            # Step 10: Verify status persists
            print("\n📋 Step 10: Verifying status persists...")
            result = await db.execute(
                select(DocumentReview)
                .where(DocumentReview.id == review.id)
            )
            updated_review = result.scalar_one_or_none()
            assert updated_review is not None, "Review not found"
            assert updated_review.status == ReviewStatus.APPROVED, "Status did not persist"
            print(f"✅ Status persisted: {updated_review.status.value}")

            # Step 11: Delete reply
            print("\n📋 Step 11: Deleting reply comment...")
            await db.delete(reply)
            await db.commit()
            print("✅ Reply deleted")

            # Step 12: Verify reply deleted
            print("\n📋 Step 12: Verifying reply deleted...")
            result = await db.execute(
                select(DocumentComment)
                .where(DocumentComment.id == reply.id)
            )
            deleted = result.scalar_one_or_none()
            assert deleted is None, "Reply still exists"
            print("✅ Reply removed from database")

            # Step 13: Delete parent comment
            print("\n📋 Step 13: Deleting parent comment...")
            await db.delete(comment1)
            await db.commit()
            print("✅ Parent comment deleted")

            # Step 14: Verify all comments removed
            print("\n📋 Step 14: Verifying comments removed...")
            result = await db.execute(
                select(DocumentComment)
                .where(DocumentComment.review_id == review.id)
            )
            remaining = result.scalars().all()
            assert len(remaining) == 0, f"Expected 0 comments, got {len(remaining)}"
            print("✅ All comments removed")

            # Cleanup
            print("\n🧹 Cleaning up test review...")
            await db.delete(review)
            await db.commit()
            print("✅ Test review deleted")

            print("\n" + "="*60)
            print("✅ ALL E2E TESTS PASSED!")
            print("="*60)
            return True

        except AssertionError as e:
            print(f"\n❌ Assertion failed: {e}")
            return False
        except Exception as e:
            print(f"\n❌ Error: {e}")
            import traceback
            traceback.print_exc()
            return False


if __name__ == "__main__":
    print("="*60)
    print("Document Review E2E Test")
    print("="*60)

    success = asyncio.run(run_e2e_test())

    if success:
        print("\n✅ Test completed successfully!")
        sys.exit(0)
    else:
        print("\n❌ Test failed!")
        sys.exit(1)
