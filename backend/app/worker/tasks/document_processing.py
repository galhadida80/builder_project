"""Document processing Celery tasks for batch uploads."""

import uuid
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.db.session import AsyncSessionLocal
from app.models.batch_upload import BatchUpload
from app.models.file import File
from app.models.processing_task import ProcessingTask
from app.services.pdf_service import get_pdf_page_count, split_pdf_pages
from app.services.storage_service import _create_storage_backend, generate_storage_path
from app.services.thumbnail_service import generate_thumbnail
from app.utils import utcnow
from app.worker.celery_app import celery_app


@celery_app.task(name="process_batch_upload")
def process_batch_upload(batch_id: str) -> dict:
    """Process all files in a batch upload.

    Args:
        batch_id: UUID of the BatchUpload record

    Returns:
        Dict with processing summary
    """
    import asyncio

    return asyncio.run(_process_batch_upload_async(batch_id))


async def _process_batch_upload_async(batch_id: str) -> dict:
    """Async implementation of batch upload processing."""
    async with AsyncSessionLocal() as session:
        # Fetch batch upload
        result = await session.execute(
            select(BatchUpload).where(BatchUpload.id == uuid.UUID(batch_id))
        )
        batch = result.scalar_one_or_none()

        if not batch:
            return {"error": f"BatchUpload {batch_id} not found"}

        # Update batch status
        batch.status = "processing"
        await session.commit()

        # Get all processing tasks for this batch
        tasks_result = await session.execute(
            select(ProcessingTask).where(ProcessingTask.batch_upload_id == batch.id)
        )
        tasks = tasks_result.scalars().all()

        processed_count = 0
        failed_count = 0

        # Process each task
        for task in tasks:
            try:
                # Call process_single_file for each task
                process_single_file.delay(str(task.id))
                processed_count += 1
            except Exception as e:
                failed_count += 1
                task.status = "failed"
                task.error_message = str(e)
                task.completed_at = utcnow()

        await session.commit()

        return {
            "batch_id": batch_id,
            "total_tasks": len(tasks),
            "processed": processed_count,
            "failed": failed_count,
        }


@celery_app.task(name="process_single_file")
def process_single_file(task_id: str) -> dict:
    """Process a single file based on its task configuration.

    Args:
        task_id: UUID of the ProcessingTask record

    Returns:
        Dict with processing result
    """
    import asyncio

    return asyncio.run(_process_single_file_async(task_id))


async def _process_single_file_async(task_id: str) -> dict:
    """Async implementation of single file processing."""
    async with AsyncSessionLocal() as session:
        # Fetch processing task
        result = await session.execute(
            select(ProcessingTask).where(ProcessingTask.id == uuid.UUID(task_id))
        )
        task = result.scalar_one_or_none()

        if not task:
            return {"error": f"ProcessingTask {task_id} not found"}

        # Update task status
        task.status = "processing"
        task.started_at = utcnow()
        task.progress_percent = 0
        await session.commit()

        try:
            # Fetch associated file
            file_result = await session.execute(
                select(File).where(File.id == task.file_id)
            )
            file = file_result.scalar_one_or_none()

            if not file:
                raise ValueError(f"File {task.file_id} not found")

            # Process based on task type
            if task.task_type == "thumbnail":
                await _generate_thumbnail(session, file, task)
            elif task.task_type == "pdf_split":
                await _split_pdf(session, file, task)
            else:
                raise ValueError(f"Unknown task type: {task.task_type}")

            # Update task as completed
            task.status = "completed"
            task.progress_percent = 100
            task.completed_at = utcnow()

            # Update batch upload counters
            batch_result = await session.execute(
                select(BatchUpload).where(BatchUpload.id == task.batch_upload_id)
            )
            batch = batch_result.scalar_one()
            batch.completed_files += 1

            # Check if all tasks are done
            pending_tasks = await session.execute(
                select(ProcessingTask).where(
                    ProcessingTask.batch_upload_id == batch.id,
                    ProcessingTask.status.in_(["pending", "processing"]),
                )
            )
            if not pending_tasks.scalars().first():
                batch.status = "completed"

            await session.commit()

            return {"task_id": task_id, "status": "completed"}

        except Exception as e:
            task.status = "failed"
            task.error_message = str(e)
            task.completed_at = utcnow()

            # Update batch upload failed counter
            batch_result = await session.execute(
                select(BatchUpload).where(BatchUpload.id == task.batch_upload_id)
            )
            batch = batch_result.scalar_one()
            batch.failed_files += 1

            await session.commit()

            return {"task_id": task_id, "status": "failed", "error": str(e)}


async def _generate_thumbnail(session: AsyncSession, file: File, task: ProcessingTask) -> None:
    """Generate thumbnail for a file."""
    settings = get_settings()
    storage = _create_storage_backend(settings)

    # Get file content
    file_content = await storage.get_file_content(file.storage_path)

    # Generate thumbnail
    task.progress_percent = 50
    await session.commit()

    thumbnail_bytes = generate_thumbnail(file_content, file.file_type or "application/pdf")

    # Save thumbnail to storage
    thumbnail_path = f"{file.storage_path}_thumb.png"
    await storage.save_bytes(thumbnail_bytes, thumbnail_path, "image/png")

    task.progress_percent = 100


async def _split_pdf(session: AsyncSession, file: File, task: ProcessingTask) -> None:
    """Split multi-page PDF into individual pages."""
    settings = get_settings()
    storage = _create_storage_backend(settings)

    # Get file content
    file_content = await storage.get_file_content(file.storage_path)

    # Check page count
    page_count = get_pdf_page_count(file_content)

    if page_count <= 1:
        # No need to split single-page PDFs
        task.progress_percent = 100
        return

    task.progress_percent = 20
    await session.commit()

    # Split PDF into pages
    pages = split_pdf_pages(file_content)

    task.progress_percent = 50
    await session.commit()

    # Create File record for each page and save to storage
    for i, page_bytes in enumerate(pages, start=1):
        # Generate storage path for the page
        page_filename = f"{file.filename.rsplit('.', 1)[0]}_page_{i}.pdf"
        storage_path = generate_storage_path(
            user_id=file.uploaded_by_id or uuid.uuid4(),
            project_id=file.project_id,
            entity_type=file.entity_type,
            entity_id=file.entity_id,
            filename=page_filename,
        )

        # Save page to storage
        await storage.save_bytes(page_bytes, storage_path, "application/pdf")

        # Create File record
        page_file = File(
            project_id=file.project_id,
            entity_type=file.entity_type,
            entity_id=file.entity_id,
            filename=page_filename,
            file_type="application/pdf",
            file_size=len(page_bytes),
            storage_path=storage_path,
            uploaded_by_id=file.uploaded_by_id,
        )
        session.add(page_file)

    task.progress_percent = 90
    await session.commit()


@celery_app.task(name="generate_thumbnail_task")
def generate_thumbnail_task(file_id: str) -> dict:
    """Generate thumbnail for a specific file.

    Args:
        file_id: UUID of the File record

    Returns:
        Dict with thumbnail generation result
    """
    import asyncio

    return asyncio.run(_generate_thumbnail_task_async(file_id))


async def _generate_thumbnail_task_async(file_id: str) -> dict:
    """Async implementation of thumbnail generation."""
    async with AsyncSessionLocal() as session:
        # Fetch file
        result = await session.execute(
            select(File).where(File.id == uuid.UUID(file_id))
        )
        file = result.scalar_one_or_none()

        if not file:
            return {"error": f"File {file_id} not found"}

        try:
            settings = get_settings()
            storage = _create_storage_backend(settings)

            # Get file content
            file_content = await storage.get_file_content(file.storage_path)

            # Generate thumbnail
            thumbnail_bytes = generate_thumbnail(file_content, file.file_type or "application/pdf")

            # Save thumbnail to storage
            thumbnail_path = f"{file.storage_path}_thumb.png"
            await storage.save_bytes(thumbnail_bytes, thumbnail_path, "image/png")

            return {"file_id": file_id, "status": "completed", "thumbnail_path": thumbnail_path}

        except Exception as e:
            return {"file_id": file_id, "status": "failed", "error": str(e)}


@celery_app.task(name="split_pdf_task")
def split_pdf_task(file_id: str) -> dict:
    """Split a multi-page PDF file into individual pages.

    Args:
        file_id: UUID of the File record

    Returns:
        Dict with split result
    """
    import asyncio

    return asyncio.run(_split_pdf_task_async(file_id))


async def _split_pdf_task_async(file_id: str) -> dict:
    """Async implementation of PDF splitting."""
    async with AsyncSessionLocal() as session:
        # Fetch file
        result = await session.execute(
            select(File).where(File.id == uuid.UUID(file_id))
        )
        file = result.scalar_one_or_none()

        if not file:
            return {"error": f"File {file_id} not found"}

        try:
            settings = get_settings()
            storage = _create_storage_backend(settings)

            # Get file content
            file_content = await storage.get_file_content(file.storage_path)

            # Check page count
            page_count = get_pdf_page_count(file_content)

            if page_count <= 1:
                return {"file_id": file_id, "status": "completed", "pages": 1, "message": "No split needed"}

            # Split PDF into pages
            pages = split_pdf_pages(file_content)

            # Create File record for each page and save to storage
            page_files = []
            for i, page_bytes in enumerate(pages, start=1):
                # Generate storage path for the page
                page_filename = f"{file.filename.rsplit('.', 1)[0]}_page_{i}.pdf"
                storage_path = generate_storage_path(
                    user_id=file.uploaded_by_id or uuid.uuid4(),
                    project_id=file.project_id,
                    entity_type=file.entity_type,
                    entity_id=file.entity_id,
                    filename=page_filename,
                )

                # Save page to storage
                await storage.save_bytes(page_bytes, storage_path, "application/pdf")

                # Create File record
                page_file = File(
                    project_id=file.project_id,
                    entity_type=file.entity_type,
                    entity_id=file.entity_id,
                    filename=page_filename,
                    file_type="application/pdf",
                    file_size=len(page_bytes),
                    storage_path=storage_path,
                    uploaded_by_id=file.uploaded_by_id,
                )
                session.add(page_file)
                page_files.append(str(page_file.id))

            await session.commit()

            return {
                "file_id": file_id,
                "status": "completed",
                "pages": len(pages),
                "page_file_ids": page_files,
            }

        except Exception as e:
            return {"file_id": file_id, "status": "failed", "error": str(e)}
