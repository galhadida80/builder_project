from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile
from fastapi import File as FastAPIFile
from fastapi.responses import RedirectResponse, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import get_settings, Settings
from app.core.permissions import Permission, require_permission
from app.core.security import get_current_user, verify_project_access
from app.db.session import get_db
from app.models.audit import AuditAction
from app.models.bim import AutodeskConnection, BimModel, TranslationStatus
from app.models.project import ProjectMember
from app.models.user import User
from app.schemas.bim import (
    BimModelResponse,
    TranslationStatusResponse,
    ViewerTokenResponse,
)
from app.services.aps_service import APSService
from app.services.audit_service import create_audit_log
from app.services.storage_service import StorageBackend, generate_storage_path, get_storage_backend
from app.utils import utcnow

router = APIRouter()

ALLOWED_EXTENSIONS = {".rvt", ".ifc", ".nwd", ".nwc", ".dwg"}
IFC_EXTENSION = ".ifc"
MAX_BIM_FILE_SIZE = 500 * 1024 * 1024  # 500MB


def get_aps_service(settings: Settings = Depends(get_settings)) -> APSService:
    return APSService(settings)


@router.get("/projects/{project_id}/bim", response_model=list[BimModelResponse])
async def list_bim_models(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await verify_project_access(project_id, current_user, db)
    query = (
        select(BimModel)
        .where(BimModel.project_id == project_id)
        .options(selectinload(BimModel.uploaded_by))
        .order_by(BimModel.created_at.desc())
    )
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/projects/{project_id}/bim/{model_id}", response_model=BimModelResponse)
async def get_bim_model(
    project_id: UUID,
    model_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await verify_project_access(project_id, current_user, db)
    query = (
        select(BimModel)
        .where(BimModel.id == model_id, BimModel.project_id == project_id)
        .options(selectinload(BimModel.uploaded_by))
    )
    result = await db.execute(query)
    model = result.scalar_one_or_none()
    if not model:
        raise HTTPException(status_code=404, detail="BIM model not found")
    return model


@router.get("/projects/{project_id}/bim/{model_id}/content")
async def get_bim_model_content(
    project_id: UUID,
    model_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    storage: StorageBackend = Depends(get_storage_backend),
):
    await verify_project_access(project_id, current_user, db)
    result = await db.execute(
        select(BimModel).where(BimModel.id == model_id, BimModel.project_id == project_id)
    )
    model = result.scalar_one_or_none()
    if not model:
        raise HTTPException(status_code=404, detail="BIM model not found")
    if not model.storage_path:
        raise HTTPException(status_code=404, detail="Model file not found in storage")

    MAX_INLINE_SIZE = 50 * 1024 * 1024
    if model.file_size and model.file_size > MAX_INLINE_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"File too large for inline download ({model.file_size} bytes). Max: {MAX_INLINE_SIZE} bytes."
        )

    content = await storage.get_file_content(model.storage_path)
    return Response(
        content=content,
        media_type="application/octet-stream",
        headers={"Content-Disposition": f'inline; filename="{model.filename}"'},
    )


@router.post("/projects/{project_id}/bim/upload", response_model=BimModelResponse, status_code=201)
async def upload_bim_model(
    project_id: UUID,
    file: UploadFile = FastAPIFile(...),
    member: ProjectMember = require_permission(Permission.CREATE),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    storage: StorageBackend = Depends(get_storage_backend),
    aps: APSService = Depends(get_aps_service),
):
    filename = file.filename or "model.rvt"
    ext = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"File type {ext} not allowed. Allowed: {', '.join(ALLOWED_EXTENSIONS)}")

    content_type = file.content_type or "application/octet-stream"
    allowed_mimes = {
        "application/octet-stream",
        "application/x-ifc",
        "model/ifc",
        "application/acad",
        "application/x-navisworks",
    }
    if content_type not in allowed_mimes and not content_type.startswith("application/"):
        raise HTTPException(status_code=400, detail=f"Invalid content type: {content_type}")

    content = await file.read()
    file_size = len(content)
    if file_size > MAX_BIM_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File size exceeds 500MB limit")

    bim_model = BimModel(
        project_id=project_id,
        filename=filename,
        file_size=file_size,
        uploaded_by_id=current_user.id,
    )
    db.add(bim_model)
    await db.flush()

    storage_path = generate_storage_path(
        user_id=current_user.id,
        project_id=project_id,
        entity_type="bim",
        entity_id=bim_model.id,
        filename=filename,
    )
    await storage.save_bytes(content, storage_path, content_type)
    bim_model.storage_path = storage_path

    if ext == IFC_EXTENSION:
        bim_model.urn = None
        bim_model.translation_status = TranslationStatus.COMPLETE.value
        bim_model.translation_progress = 100
    else:
        bucket_key = f"builderops-{str(project_id).replace('-', '')[:20]}"
        object_key = f"{bim_model.id}/{filename}"
        try:
            await aps.ensure_bucket(bucket_key)
            obj_details = await aps.upload_object(bucket_key, object_key, content, content_type)
            bim_model.urn = obj_details.get("objectId") or None
        except Exception:
            bim_model.urn = None

    try:
        await create_audit_log(db, current_user, "bim_model", bim_model.id, AuditAction.CREATE, project_id=project_id)
    except Exception:
        pass

    await db.commit()
    await db.refresh(bim_model, attribute_names=["uploaded_by"])

    return bim_model


@router.post("/projects/{project_id}/bim/{model_id}/translate", response_model=TranslationStatusResponse)
async def translate_bim_model(
    project_id: UUID,
    model_id: UUID,
    member: ProjectMember = require_permission(Permission.CREATE),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    aps: APSService = Depends(get_aps_service),
):
    await verify_project_access(project_id, current_user, db)
    result = await db.execute(
        select(BimModel).where(BimModel.id == model_id, BimModel.project_id == project_id)
    )
    model = result.scalar_one_or_none()
    if not model:
        raise HTTPException(status_code=404, detail="BIM model not found")
    if not model.urn:
        raise HTTPException(status_code=400, detail="Model has no URN. Upload to APS may have failed.")

    await aps.translate_model(model.urn)
    model.translation_status = TranslationStatus.TRANSLATING.value
    model.translation_progress = 0
    await db.commit()

    return TranslationStatusResponse(
        translation_status=model.translation_status,
        translation_progress=model.translation_progress,
    )


@router.get("/projects/{project_id}/bim/{model_id}/status", response_model=TranslationStatusResponse)
async def get_translation_status(
    project_id: UUID,
    model_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    aps: APSService = Depends(get_aps_service),
):
    await verify_project_access(project_id, current_user, db)
    result = await db.execute(
        select(BimModel).where(BimModel.id == model_id, BimModel.project_id == project_id)
    )
    model = result.scalar_one_or_none()
    if not model:
        raise HTTPException(status_code=404, detail="BIM model not found")

    if model.translation_status == TranslationStatus.TRANSLATING.value and model.urn:
        status_data = await aps.get_translation_status(model.urn)
        model.translation_status = TranslationStatus(status_data["status"]).value
        model.translation_progress = status_data["progress"]
        await db.commit()

    return TranslationStatusResponse(
        translation_status=model.translation_status,
        translation_progress=model.translation_progress,
    )


@router.get("/projects/{project_id}/bim/{model_id}/token", response_model=ViewerTokenResponse)
async def get_viewer_token(
    project_id: UUID,
    model_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    aps: APSService = Depends(get_aps_service),
):
    await verify_project_access(project_id, current_user, db)
    result = await db.execute(
        select(BimModel).where(BimModel.id == model_id, BimModel.project_id == project_id)
    )
    model = result.scalar_one_or_none()
    if not model:
        raise HTTPException(status_code=404, detail="BIM model not found")

    token = await aps.get_2legged_token()
    return ViewerTokenResponse(access_token=token, expires_in=3600)


@router.delete("/projects/{project_id}/bim/{model_id}", status_code=204)
async def delete_bim_model(
    project_id: UUID,
    model_id: UUID,
    member: ProjectMember = require_permission(Permission.DELETE),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    storage: StorageBackend = Depends(get_storage_backend),
):
    result = await db.execute(
        select(BimModel).where(BimModel.id == model_id, BimModel.project_id == project_id)
    )
    model = result.scalar_one_or_none()
    if not model:
        raise HTTPException(status_code=404, detail="BIM model not found")

    if model.storage_path:
        try:
            await storage.delete_file(model.storage_path)
        except Exception:
            pass

    await create_audit_log(db, current_user, "bim_model", model.id, AuditAction.DELETE, project_id=project_id)
    await db.delete(model)
    await db.commit()


@router.get("/bim/oauth/authorize")
async def oauth_authorize(
    current_user: User = Depends(get_current_user),
    aps: APSService = Depends(get_aps_service),
):
    state = str(current_user.id)
    auth_url = aps.get_auth_url(state)
    return {"authorize_url": auth_url}


@router.get("/bim/callback")
async def oauth_callback(
    code: str = Query(...),
    state: str = Query(...),
    db: AsyncSession = Depends(get_db),
    aps: APSService = Depends(get_aps_service),
    settings: Settings = Depends(get_settings),
):
    token_data = await aps.exchange_code(code)

    user_id = UUID(state)
    result = await db.execute(
        select(AutodeskConnection).where(AutodeskConnection.user_id == user_id)
    )
    connection = result.scalar_one_or_none()

    expires_at = utcnow() + timedelta(seconds=token_data.get("expires_in", 3600))

    if connection:
        connection.access_token = token_data["access_token"]
        connection.refresh_token = token_data.get("refresh_token")
        connection.token_expires_at = expires_at
        connection.updated_at = utcnow()
    else:
        connection = AutodeskConnection(
            user_id=user_id,
            access_token=token_data["access_token"],
            refresh_token=token_data.get("refresh_token"),
            token_expires_at=expires_at,
        )
        db.add(connection)

    await db.commit()

    return RedirectResponse(url=f"{settings.frontend_base_url}/dashboard?autodesk_connected=true")
