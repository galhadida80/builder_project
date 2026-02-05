#!/usr/bin/env python3
"""
End-to-End Test for Document Review Workflow
Tests the complete document review workflow from API creation to deletion
"""
import asyncio
import sys
import os
from uuid import uuid4, UUID
from datetime import datetime

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select, text
from app.models.document_review import DocumentReview, DocumentComment, ReviewStatus
from app.models.user import User
from app.models.file import File
from app.models.project import Project

# Database configuration
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://localhost:5432/builder_db")

async def create_test_data(db: AsyncSession):
    """Create test project, user, and document for testing"""
    print("\n📋 Step 1: Creating test data...")

    # Create or get test user
    result = await db.execute(select(User).limit(1))
    user = result.scalar_one_or_none()
    if not user:
        print("❌ No users found in database. Please create a user first.")
        return None, None, None, None

    print(f"✅ Using test user: {user.email} (ID: {user.id})")

    # Create or get test project
    result = await db.execute(select(Project).limit(1))
    project = result.scalar_one_or_none()
    if not project:
        print("❌ No projects found in database. Please create a project first.")
        return None, None, None, None

    print(f"✅ Using test project: {project.name} (ID: {project.id})")

    # Create or get test file/document
    result = await db.execute(
        select(File)
        .where(File.project_id == project.id)
        .limit(1)
    )
    document = result.scalar_one_or_none()
    if not document:
        # Create a test document
        document = File(
            id=uuid4(),
            project_id=project.id,
            filename="test-document.pdf",
            file_path="/test/path/test-document.pdf",
            file_type="application/pdf",
            file_size=1024,
            uploaded_by_id=user.id,
            entity_type="document",
            entity_id=uuid4()
        )
        db.add(document)
        await db.commit()
        await db.refresh(document)
        print(f"✅ Created test document: {document.filename} (ID: {document.id})")
    else:
        print(f"✅ Using test document: {document.filename} (ID: {document.id})")

    return project, user, document, user.id


async def test_document_review_workflow():
    """Test the complete document review workflow"""

    # Create async engine and session
    engine = create_async_engine(DATABASE_URL, echo=False)
    async_session_maker = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session_maker() as db:
        try:
            # Step 1: Create test data
            project, user, document, user_id = await create_test_data(db)
            if not all([project, user, document, user_id]):
                print("\n❌ Failed to create test data. Exiting.")
                return False

            project_id = project.id
            document_id = document.id

            # Step 2: Create a document review
            print("\n📋 Step 2: Creating document review...")
            review = DocumentReview(
                id=uuid4(),
                project_id=project_id,
                document_id=document_id,
                status=ReviewStatus.PENDING,
                created_by_id=user_id
            )
            db.add(review)
            await db.commit()
            await db.refresh(review)
            print(f"✅ Created document review (ID: {review.id})")
            print(f"   Status: {review.status.value}")

            # Step 3: Verify document review retrieval
            print("\n📋 Step 3: Verifying document review retrieval...")
            result = await db.execute(
                select(DocumentReview)
                .where(
                    DocumentReview.project_id == project_id,
                    DocumentReview.document_id == document_id
                )
            )
            fetched_review = result.scalar_one_or_none()
            if fetched_review:
                print(f"✅ Retrieved document review (ID: {fetched_review.id})")
            else:
                print("❌ Failed to retrieve document review")
                return False

            # Step 4: Create a new comment
            print("\n📋 Step 4: Creating a new comment...")
            comment1 = DocumentComment(
                id=uuid4(),
                review_id=review.id,
                comment_text="This is a test comment for the document review.",
                created_by_id=user_id,
                is_resolved=False
            )
            db.add(comment1)
            await db.commit()
            await db.refresh(comment1)
            print(f"✅ Created comment (ID: {comment1.id})")
            print(f"   Text: '{comment1.comment_text}'")
            print(f"   Created at: {comment1.created_at}")

            # Step 5: Verify comment appears in list with correct metadata
            print("\n📋 Step 5: Verifying comment in list...")
            result = await db.execute(
                select(DocumentComment)
                .where(DocumentComment.review_id == review.id)
            )
            comments = result.scalars().all()
            if len(comments) == 1 and comments[0].id == comment1.id:
                print(f"✅ Comment found in list")
                print(f"   Comment ID: {comments[0].id}")
                print(f"   Created by: {user.email}")
                print(f"   Timestamp: {comments[0].created_at}")
            else:
                print(f"❌ Expected 1 comment, found {len(comments)}")
                return False

            # Step 6: Edit the comment
            print("\n📋 Step 6: Editing the comment...")
            original_text = comment1.comment_text
            new_text = "This is an UPDATED test comment with new content."
            comment1.comment_text = new_text
            comment1.updated_at = datetime.utcnow()
            await db.commit()
            await db.refresh(comment1)
            print(f"✅ Comment updated")
            print(f"   Old text: '{original_text}'")
            print(f"   New text: '{comment1.comment_text}'")

            # Step 7: Verify edit persists
            print("\n📋 Step 7: Verifying edit persists...")
            result = await db.execute(
                select(DocumentComment)
                .where(DocumentComment.id == comment1.id)
            )
            updated_comment = result.scalar_one_or_none()
            if updated_comment and updated_comment.comment_text == new_text:
                print(f"✅ Edit persisted successfully")
                print(f"   Current text: '{updated_comment.comment_text}'")
            else:
                print("❌ Edit did not persist")
                return False

            # Step 8: Add a reply to the comment
            print("\n📋 Step 8: Adding a reply to the comment...")
            reply_comment = DocumentComment(
                id=uuid4(),
                review_id=review.id,
                parent_comment_id=comment1.id,
                comment_text="This is a reply to the original comment.",
                created_by_id=user_id,
                is_resolved=False
            )
            db.add(reply_comment)
            await db.commit()
            await db.refresh(reply_comment)
            print(f"✅ Created reply comment (ID: {reply_comment.id})")
            print(f"   Parent comment ID: {reply_comment.parent_comment_id}")
            print(f"   Reply text: '{reply_comment.comment_text}'")

            # Verify reply relationship
            result = await db.execute(
                select(DocumentComment)
                .where(DocumentComment.parent_comment_id == comment1.id)
            )
            replies = result.scalars().all()
            if len(replies) == 1:
                print(f"✅ Reply linked to parent comment correctly")
            else:
                print(f"❌ Expected 1 reply, found {len(replies)}")
                return False

            # Step 9: Update review status to 'approved'
            print("\n📋 Step 9: Updating review status to 'approved'...")
            review.status = ReviewStatus.APPROVED
            review.reviewed_by_id = user_id
            review.reviewed_at = datetime.utcnow()
            await db.commit()
            await db.refresh(review)
            print(f"✅ Review status updated")
            print(f"   New status: {review.status.value}")
            print(f"   Reviewed by: {user.email}")
            print(f"   Reviewed at: {review.reviewed_at}")

            # Step 10: Verify status update reflects in database
            print("\n📋 Step 10: Verifying status update in database...")
            result = await db.execute(
                select(DocumentReview)
                .where(DocumentReview.id == review.id)
            )
            updated_review = result.scalar_one_or_none()
            if updated_review and updated_review.status == ReviewStatus.APPROVED:
                print(f"✅ Status update persisted in database")
                print(f"   Status: {updated_review.status.value}")
            else:
                print("❌ Status update did not persist")
                return False

            # Step 11: Delete the reply comment first (due to foreign key)
            print("\n📋 Step 11a: Deleting the reply comment...")
            await db.delete(reply_comment)
            await db.commit()
            print(f"✅ Reply comment deleted (ID: {reply_comment.id})")

            # Verify reply is deleted
            result = await db.execute(
                select(DocumentComment)
                .where(DocumentComment.id == reply_comment.id)
            )
            deleted_reply = result.scalar_one_or_none()
            if deleted_reply is None:
                print(f"✅ Reply comment removed from database")
            else:
                print("❌ Reply comment still exists in database")
                return False

            # Step 11b: Delete the parent comment
            print("\n📋 Step 11b: Deleting the parent comment...")
            await db.delete(comment1)
            await db.commit()
            print(f"✅ Parent comment deleted (ID: {comment1.id})")

            # Step 12: Verify comment is removed from list
            print("\n📋 Step 12: Verifying comment is removed from list...")
            result = await db.execute(
                select(DocumentComment)
                .where(DocumentComment.review_id == review.id)
            )
            remaining_comments = result.scalars().all()
            if len(remaining_comments) == 0:
                print(f"✅ All comments removed from list")
            else:
                print(f"❌ Expected 0 comments, found {len(remaining_comments)}")
                return False

            # Cleanup: Delete test review
            print("\n🧹 Cleanup: Deleting test review...")
            await db.delete(review)
            await db.commit()
            print(f"✅ Test review deleted")

            print("\n" + "="*60)
            print("✅ ALL END-TO-END TESTS PASSED!")
            print("="*60)
            return True

        except Exception as e:
            print(f"\n❌ Error during test: {str(e)}")
            import traceback
            traceback.print_exc()
            return False
        finally:
            await engine.dispose()


if __name__ == "__main__":
    print("="*60)
    print("End-to-End Document Review Workflow Test")
    print("="*60)

    success = asyncio.run(test_document_review_workflow())

    if success:
        print("\n✅ Test completed successfully!")
        sys.exit(0)
    else:
        print("\n❌ Test failed!")
        sys.exit(1)
