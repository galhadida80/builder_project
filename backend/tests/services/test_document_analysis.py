"""Tests for document analysis schema validation and model."""
import uuid
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from pydantic import ValidationError

from app.schemas.document_analysis import (
    DocumentAnalysisCreate,
    DocumentAnalysisListResponse,
    DocumentAnalysisResponse,
)


class TestDocumentAnalysisCreateSchema:

    @pytest.mark.parametrize("analysis_type", ["ocr", "summary", "extraction"])
    def test_valid_analysis_types(self, analysis_type):
        schema = DocumentAnalysisCreate(
            file_id=uuid.uuid4(),
            analysis_type=analysis_type,
        )
        assert schema.analysis_type == analysis_type

    def test_requires_file_id(self):
        with pytest.raises(ValidationError):
            DocumentAnalysisCreate(analysis_type="ocr")

    def test_requires_analysis_type(self):
        with pytest.raises(ValidationError):
            DocumentAnalysisCreate(file_id=uuid.uuid4())

    def test_analysis_type_min_length(self):
        with pytest.raises(ValidationError):
            DocumentAnalysisCreate(file_id=uuid.uuid4(), analysis_type="")

    def test_analysis_type_max_length(self):
        with pytest.raises(ValidationError):
            DocumentAnalysisCreate(file_id=uuid.uuid4(), analysis_type="x" * 51)

    def test_valid_uuid_file_id(self):
        fid = uuid.uuid4()
        schema = DocumentAnalysisCreate(file_id=fid, analysis_type="ocr")
        assert schema.file_id == fid


class TestDocumentAnalysisResponseSchema:

    def test_camelcase_serialization(self):
        now = datetime.utcnow()
        resp = DocumentAnalysisResponse(
            id=uuid.uuid4(),
            file_id=uuid.uuid4(),
            project_id=uuid.uuid4(),
            analysis_type="ocr",
            result={"extracted_text": "hello"},
            model_used="gemini-2.0-flash",
            status="completed",
            error_message=None,
            processing_time_ms=1500,
            created_at=now,
            updated_at=now,
        )
        data = resp.model_dump(by_alias=True)
        assert "fileId" in data
        assert "projectId" in data
        assert "analysisType" in data
        assert "modelUsed" in data
        assert "errorMessage" in data
        assert "processingTimeMs" in data
        assert "createdAt" in data
        assert "updatedAt" in data

    def test_result_nullable(self):
        now = datetime.utcnow()
        resp = DocumentAnalysisResponse(
            id=uuid.uuid4(),
            file_id=uuid.uuid4(),
            project_id=uuid.uuid4(),
            analysis_type="summary",
            result=None,
            model_used="gemini-2.0-flash",
            status="failed",
            error_message="API key not configured",
            processing_time_ms=None,
            created_at=now,
            updated_at=now,
        )
        assert resp.result is None
        assert resp.error_message == "API key not configured"
        assert resp.processing_time_ms is None

    def test_all_status_values(self):
        now = datetime.utcnow()
        for status in ["pending", "processing", "completed", "failed"]:
            resp = DocumentAnalysisResponse(
                id=uuid.uuid4(),
                file_id=uuid.uuid4(),
                project_id=uuid.uuid4(),
                analysis_type="ocr",
                result=None,
                model_used="test",
                status=status,
                created_at=now,
                updated_at=now,
            )
            assert resp.status == status


class TestDocumentAnalysisListResponseSchema:

    def test_list_with_items(self):
        now = datetime.utcnow()
        item = DocumentAnalysisResponse(
            id=uuid.uuid4(),
            file_id=uuid.uuid4(),
            project_id=uuid.uuid4(),
            analysis_type="ocr",
            result={"text": "hello"},
            model_used="gemini-2.0-flash",
            status="completed",
            processing_time_ms=500,
            created_at=now,
            updated_at=now,
        )
        lst = DocumentAnalysisListResponse(items=[item], total=1)
        assert lst.total == 1
        assert len(lst.items) == 1
        assert lst.items[0].analysis_type == "ocr"

    def test_empty_list(self):
        lst = DocumentAnalysisListResponse(items=[], total=0)
        assert lst.total == 0
        assert len(lst.items) == 0


class TestDocumentAnalysisModel:

    @pytest.mark.asyncio
    async def test_model_creation(self, db):
        from app.models.document_analysis import DocumentAnalysis
        from app.models.file import File
        from app.models.project import Project
        from app.models.user import User

        user = User(
            id=uuid.uuid4(),
            firebase_uid="test-uid-analysis",
            email="analysis@test.com",
            full_name="Analysis Tester",
            role="admin",
            is_active=True,
        )
        db.add(user)
        await db.flush()

        project = Project(
            id=uuid.uuid4(),
            name="Analysis Project",
            code="ANL-001",
            status="active",
            created_by_id=user.id,
        )
        db.add(project)
        await db.flush()

        file = File(
            id=uuid.uuid4(),
            project_id=project.id,
            entity_type="equipment",
            entity_id=uuid.uuid4(),
            filename="test.pdf",
            file_type="application/pdf",
            file_size=1024,
            storage_path="test/path/test.pdf",
            uploaded_by_id=user.id,
        )
        db.add(file)
        await db.flush()

        analysis = DocumentAnalysis(
            id=uuid.uuid4(),
            file_id=file.id,
            project_id=project.id,
            analysis_type="ocr",
            result={"extracted_text": "test content"},
            model_used="gemini-2.0-flash",
            status="completed",
            processing_time_ms=1200,
        )
        db.add(analysis)
        await db.commit()

        from sqlalchemy import select
        result = await db.execute(
            select(DocumentAnalysis).where(DocumentAnalysis.id == analysis.id)
        )
        saved = result.scalar_one()
        assert saved.analysis_type == "ocr"
        assert saved.model_used == "gemini-2.0-flash"
        assert saved.status == "completed"
        assert saved.processing_time_ms == 1200
        assert saved.result["extracted_text"] == "test content"

    @pytest.mark.asyncio
    async def test_model_table_exists(self, db):
        from sqlalchemy import text
        result = await db.execute(
            text("SELECT name FROM sqlite_master WHERE type='table' AND name='document_analyses'")
        )
        row = result.scalar_one_or_none()
        assert row == "document_analyses"

    @pytest.mark.asyncio
    async def test_model_columns(self, db):
        from sqlalchemy import text
        result = await db.execute(text("PRAGMA table_info(document_analyses)"))
        columns = {row[1] for row in result.fetchall()}
        expected = {
            "id", "file_id", "project_id", "analysis_type", "result",
            "model_used", "status", "error_message", "processing_time_ms",
            "created_at", "updated_at",
        }
        for col in expected:
            assert col in columns, f"Missing column: {col}"


class TestDocumentAnalysisAPI:

    @pytest.mark.asyncio
    async def test_analyze_endpoint_file_not_found(self, admin_client, project):
        fake_file_id = uuid.uuid4()
        response = await admin_client.post(
            f"/api/v1/projects/{project.id}/files/{fake_file_id}/analyze",
            json={"file_id": str(fake_file_id), "analysis_type": "ocr"},
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_get_file_analyses_empty(self, admin_client, project):
        fake_file_id = uuid.uuid4()
        response = await admin_client.get(
            f"/api/v1/projects/{project.id}/files/{fake_file_id}/analysis",
        )
        assert response.status_code == 200
        assert response.json() == []

    @pytest.mark.asyncio
    async def test_list_project_analyses_empty(self, admin_client, project):
        response = await admin_client.get(
            f"/api/v1/projects/{project.id}/analyses",
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 0
        assert data["items"] == []

    @pytest.mark.asyncio
    async def test_analyze_with_file(self, admin_client, admin_user, project, db):
        from app.models.file import File

        file = File(
            id=uuid.uuid4(),
            project_id=project.id,
            entity_type="equipment",
            entity_id=uuid.uuid4(),
            filename="test.pdf",
            file_type="application/pdf",
            file_size=100,
            storage_path="test/path.pdf",
            uploaded_by_id=admin_user.id,
        )
        db.add(file)
        await db.commit()

        with patch("app.api.v1.document_analysis.analyze_document") as mock_analyze:
            mock_analyze.return_value = {
                "result": {"extracted_text": "test content from OCR"},
                "processing_time_ms": 800,
                "model_used": "gemini-2.0-flash",
            }

            from app.services.storage_service import StorageBackend
            mock_storage = MagicMock(spec=StorageBackend)
            mock_storage.get_file_content = AsyncMock(return_value=b"fake pdf content")

            from app.main import app
            from app.services.storage_service import get_storage_backend

            app.dependency_overrides[get_storage_backend] = lambda: mock_storage

            response = await admin_client.post(
                f"/api/v1/projects/{project.id}/files/{file.id}/analyze",
                json={"file_id": str(file.id), "analysis_type": "ocr"},
            )

            del app.dependency_overrides[get_storage_backend]

        assert response.status_code == 201
        data = response.json()
        assert data["status"] == "completed"
        assert data["analysisType"] == "ocr"
        assert data["modelUsed"] == "gemini-2.0-flash"
        assert data["result"]["extracted_text"] == "test content from OCR"

    @pytest.mark.asyncio
    async def test_analyze_failure_returns_failed_status(self, admin_client, admin_user, project, db):
        from app.models.file import File

        file = File(
            id=uuid.uuid4(),
            project_id=project.id,
            entity_type="material",
            entity_id=uuid.uuid4(),
            filename="bad.pdf",
            file_type="application/pdf",
            file_size=50,
            storage_path="test/bad.pdf",
            uploaded_by_id=admin_user.id,
        )
        db.add(file)
        await db.commit()

        with patch("app.api.v1.document_analysis.analyze_document") as mock_analyze:
            mock_analyze.side_effect = ValueError("GEMINI_API_KEY is not configured")

            from app.main import app
            from app.services.storage_service import StorageBackend, get_storage_backend
            mock_storage = MagicMock(spec=StorageBackend)
            mock_storage.get_file_content = AsyncMock(return_value=b"fake")
            app.dependency_overrides[get_storage_backend] = lambda: mock_storage

            response = await admin_client.post(
                f"/api/v1/projects/{project.id}/files/{file.id}/analyze",
                json={"file_id": str(file.id), "analysis_type": "summary"},
            )

            del app.dependency_overrides[get_storage_backend]

        assert response.status_code == 201
        data = response.json()
        assert data["status"] == "failed"
        assert "GEMINI_API_KEY" in data["errorMessage"]


class TestAIServicePrompts:

    def test_prompt_templates_exist(self):
        from app.services.ai_service import PROMPTS
        assert "ocr" in PROMPTS
        assert "summary" in PROMPTS
        assert "extraction" in PROMPTS
        assert len(PROMPTS) == 3

    def test_analyze_document_rejects_unknown_type(self):
        from app.services.ai_service import analyze_document
        with patch("app.services.ai_service.get_settings") as mock_settings:
            mock_settings.return_value.gemini_api_key = "test-key"
            mock_settings.return_value.gemini_model = "gemini-2.0-flash"
            with pytest.raises(ValueError, match="Unknown analysis type"):
                analyze_document(b"content", "application/pdf", "invalid_type")

    def test_analyze_document_rejects_empty_api_key(self):
        from app.services.ai_service import analyze_document
        with patch("app.services.ai_service.get_settings") as mock_settings:
            mock_settings.return_value.gemini_api_key = ""
            with pytest.raises(ValueError, match="GEMINI_API_KEY"):
                analyze_document(b"content", "application/pdf", "ocr")
