import io
import uuid

import pytest
from httpx import AsyncClient

from app.models.equipment_template import EquipmentTemplate
from app.models.project import Project
from app.models.user import User

EQUIPMENT_TEMPLATE_PAYLOAD = {
    "name": "Tower Crane",
    "name_he": "עגורן מגדלי",
    "category": "Heavy Machinery",
    "required_documents": [],
    "required_specifications": [],
    "submission_checklist": [],
}

MATERIAL_TEMPLATE_PAYLOAD = {
    "name": "Concrete Mix B30",
    "name_he": "תערובת בטון B30",
    "category": "Concrete",
    "required_documents": [],
    "required_specifications": [],
    "submission_checklist": [],
}


def make_file(name: str = "test.pdf", content: bytes = b"fake pdf content", mime: str = "application/pdf"):
    return {"file": (name, io.BytesIO(content), mime)}


# ---------------------------------------------------------------------------
# FILE UPLOAD TESTS
# ---------------------------------------------------------------------------

class TestFileUpload:

    @pytest.mark.asyncio
    async def test_upload_file_valid(self, admin_client: AsyncClient, project: Project):
        entity_id = str(uuid.uuid4())
        resp = await admin_client.post(
            f"/api/v1/projects/{project.id}/files",
            params={"entity_type": "equipment", "entity_id": entity_id},
            files=make_file(),
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["filename"] == "test.pdf"
        assert data["entityType"] == "equipment"
        assert data["entityId"] == entity_id
        assert data["fileSize"] == len(b"fake pdf content")

    @pytest.mark.asyncio
    async def test_upload_file_tracks_size(self, admin_client: AsyncClient, project: Project):
        content = b"x" * 4096
        entity_id = str(uuid.uuid4())
        resp = await admin_client.post(
            f"/api/v1/projects/{project.id}/files",
            params={"entity_type": "equipment", "entity_id": entity_id},
            files=make_file(content=content),
        )
        assert resp.status_code == 200
        assert resp.json()["fileSize"] == 4096

    @pytest.mark.asyncio
    async def test_upload_pdf_file(self, admin_client: AsyncClient, project: Project):
        entity_id = str(uuid.uuid4())
        resp = await admin_client.post(
            f"/api/v1/projects/{project.id}/files",
            params={"entity_type": "equipment", "entity_id": entity_id},
            files=make_file("report.pdf", b"%PDF-1.4 fake", "application/pdf"),
        )
        assert resp.status_code == 200
        assert resp.json()["fileType"] == "application/pdf"

    @pytest.mark.asyncio
    async def test_upload_jpg_file(self, admin_client: AsyncClient, project: Project):
        entity_id = str(uuid.uuid4())
        resp = await admin_client.post(
            f"/api/v1/projects/{project.id}/files",
            params={"entity_type": "material", "entity_id": entity_id},
            files=make_file("photo.jpg", b"\xff\xd8\xff\xe0 fake jpg", "image/jpeg"),
        )
        assert resp.status_code == 200
        assert resp.json()["fileType"] == "image/jpeg"

    @pytest.mark.asyncio
    async def test_upload_png_file(self, admin_client: AsyncClient, project: Project):
        entity_id = str(uuid.uuid4())
        resp = await admin_client.post(
            f"/api/v1/projects/{project.id}/files",
            params={"entity_type": "inspection", "entity_id": entity_id},
            files=make_file("image.png", b"\x89PNG fake", "image/png"),
        )
        assert resp.status_code == 200
        assert resp.json()["fileType"] == "image/png"

    @pytest.mark.asyncio
    async def test_upload_docx_file(self, admin_client: AsyncClient, project: Project):
        entity_id = str(uuid.uuid4())
        resp = await admin_client.post(
            f"/api/v1/projects/{project.id}/files",
            params={"entity_type": "rfi", "entity_id": entity_id},
            files=make_file("doc.docx", b"PK fake docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
        )
        assert resp.status_code == 200

    @pytest.mark.asyncio
    async def test_upload_file_large_filename(self, admin_client: AsyncClient, project: Project):
        long_name = "a" * 200 + ".pdf"
        entity_id = str(uuid.uuid4())
        resp = await admin_client.post(
            f"/api/v1/projects/{project.id}/files",
            params={"entity_type": "equipment", "entity_id": entity_id},
            files=make_file(long_name),
        )
        assert resp.status_code == 200
        assert resp.json()["filename"] == long_name

    @pytest.mark.asyncio
    async def test_upload_file_response_has_uploaded_at(self, admin_client: AsyncClient, project: Project):
        entity_id = str(uuid.uuid4())
        resp = await admin_client.post(
            f"/api/v1/projects/{project.id}/files",
            params={"entity_type": "equipment", "entity_id": entity_id},
            files=make_file(),
        )
        assert resp.status_code == 200
        assert "uploadedAt" in resp.json()

    @pytest.mark.asyncio
    async def test_upload_file_response_has_storage_path(self, admin_client: AsyncClient, project: Project):
        entity_id = str(uuid.uuid4())
        resp = await admin_client.post(
            f"/api/v1/projects/{project.id}/files",
            params={"entity_type": "equipment", "entity_id": entity_id},
            files=make_file(),
        )
        assert resp.status_code == 200
        assert "storagePath" in resp.json()
        assert resp.json()["storagePath"] != ""

    @pytest.mark.asyncio
    async def test_upload_file_unauthenticated(self, client: AsyncClient, project: Project):
        entity_id = str(uuid.uuid4())
        resp = await client.post(
            f"/api/v1/projects/{project.id}/files",
            params={"entity_type": "equipment", "entity_id": entity_id},
            files=make_file(),
        )
        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_upload_file_cross_project_access(self, user_client: AsyncClient, project: Project):
        entity_id = str(uuid.uuid4())
        resp = await user_client.post(
            f"/api/v1/projects/{project.id}/files",
            params={"entity_type": "equipment", "entity_id": entity_id},
            files=make_file(),
        )
        assert resp.status_code == 403

    @pytest.mark.asyncio
    async def test_upload_file_nonexistent_project(self, admin_client: AsyncClient):
        fake_project_id = uuid.uuid4()
        entity_id = str(uuid.uuid4())
        resp = await admin_client.post(
            f"/api/v1/projects/{fake_project_id}/files",
            params={"entity_type": "equipment", "entity_id": entity_id},
            files=make_file(),
        )
        assert resp.status_code == 403


# ---------------------------------------------------------------------------
# FILE LIST TESTS
# ---------------------------------------------------------------------------

class TestFileList:

    @pytest.mark.asyncio
    async def test_list_files_empty(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.get(f"/api/v1/projects/{project.id}/files")
        assert resp.status_code == 200
        assert resp.json() == []

    @pytest.mark.asyncio
    async def test_list_files_with_files(self, admin_client: AsyncClient, project: Project):
        entity_id = str(uuid.uuid4())
        for name in ["a.pdf", "b.pdf"]:
            await admin_client.post(
                f"/api/v1/projects/{project.id}/files",
                params={"entity_type": "equipment", "entity_id": entity_id},
                files=make_file(name),
            )
        resp = await admin_client.get(f"/api/v1/projects/{project.id}/files")
        assert resp.status_code == 200
        assert len(resp.json()) == 2

    @pytest.mark.asyncio
    async def test_list_files_filter_by_entity_type(self, admin_client: AsyncClient, project: Project):
        eid1 = str(uuid.uuid4())
        eid2 = str(uuid.uuid4())
        await admin_client.post(
            f"/api/v1/projects/{project.id}/files",
            params={"entity_type": "equipment", "entity_id": eid1},
            files=make_file("eq.pdf"),
        )
        await admin_client.post(
            f"/api/v1/projects/{project.id}/files",
            params={"entity_type": "material", "entity_id": eid2},
            files=make_file("mat.pdf"),
        )
        resp = await admin_client.get(
            f"/api/v1/projects/{project.id}/files",
            params={"entity_type": "equipment"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["entityType"] == "equipment"

    @pytest.mark.asyncio
    async def test_list_files_filter_by_entity_id(self, admin_client: AsyncClient, project: Project):
        eid1 = str(uuid.uuid4())
        eid2 = str(uuid.uuid4())
        await admin_client.post(
            f"/api/v1/projects/{project.id}/files",
            params={"entity_type": "equipment", "entity_id": eid1},
            files=make_file("f1.pdf"),
        )
        await admin_client.post(
            f"/api/v1/projects/{project.id}/files",
            params={"entity_type": "equipment", "entity_id": eid2},
            files=make_file("f2.pdf"),
        )
        resp = await admin_client.get(
            f"/api/v1/projects/{project.id}/files",
            params={"entity_id": eid1},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["entityId"] == eid1

    @pytest.mark.asyncio
    async def test_list_files_unauthenticated(self, client: AsyncClient, project: Project):
        resp = await client.get(f"/api/v1/projects/{project.id}/files")
        assert resp.status_code == 401


# ---------------------------------------------------------------------------
# FILE GET / DELETE / DOWNLOAD TESTS
# ---------------------------------------------------------------------------

class TestFileGetDeleteDownload:

    async def _upload(self, admin_client, project):
        entity_id = str(uuid.uuid4())
        resp = await admin_client.post(
            f"/api/v1/projects/{project.id}/files",
            params={"entity_type": "equipment", "entity_id": entity_id},
            files=make_file(),
        )
        return resp.json()

    @pytest.mark.asyncio
    async def test_get_file_metadata(self, admin_client: AsyncClient, project: Project):
        uploaded = await self._upload(admin_client, project)
        resp = await admin_client.get(f"/api/v1/projects/{project.id}/files/{uploaded['id']}")
        assert resp.status_code == 200
        data = resp.json()
        assert data["id"] == uploaded["id"]
        assert data["filename"] == "test.pdf"

    @pytest.mark.asyncio
    async def test_get_file_not_found(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.get(f"/api/v1/projects/{project.id}/files/{uuid.uuid4()}")
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_delete_file_valid(self, admin_client: AsyncClient, project: Project):
        uploaded = await self._upload(admin_client, project)
        resp = await admin_client.delete(f"/api/v1/projects/{project.id}/files/{uploaded['id']}")
        assert resp.status_code == 200
        assert "message" in resp.json()

    @pytest.mark.asyncio
    async def test_delete_file_not_found(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.delete(f"/api/v1/projects/{project.id}/files/{uuid.uuid4()}")
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_delete_file_then_get_returns_404(self, admin_client: AsyncClient, project: Project):
        uploaded = await self._upload(admin_client, project)
        await admin_client.delete(f"/api/v1/projects/{project.id}/files/{uploaded['id']}")
        resp = await admin_client.get(f"/api/v1/projects/{project.id}/files/{uploaded['id']}")
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_download_url_valid(self, admin_client: AsyncClient, project: Project):
        uploaded = await self._upload(admin_client, project)
        resp = await admin_client.get(f"/api/v1/projects/{project.id}/files/{uploaded['id']}/download")
        assert resp.status_code == 200
        data = resp.json()
        assert "download_url" in data
        assert "filename" in data
        assert data["filename"] == "test.pdf"

    @pytest.mark.asyncio
    async def test_download_url_not_found(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.get(f"/api/v1/projects/{project.id}/files/{uuid.uuid4()}/download")
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_get_file_unauthenticated(self, client: AsyncClient, project: Project):
        resp = await client.get(f"/api/v1/projects/{project.id}/files/{uuid.uuid4()}")
        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_delete_file_cross_project(self, user_client: AsyncClient, project: Project):
        resp = await user_client.delete(f"/api/v1/projects/{project.id}/files/{uuid.uuid4()}")
        assert resp.status_code == 403


# ---------------------------------------------------------------------------
# EQUIPMENT TEMPLATE TESTS
# ---------------------------------------------------------------------------

class TestEquipmentTemplateList:

    @pytest.mark.asyncio
    async def test_list_equipment_templates(self, admin_client: AsyncClient):
        resp = await admin_client.get("/api/v1/equipment-templates")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    @pytest.mark.asyncio
    async def test_list_equipment_templates_returns_seeded(
        self, admin_client: AsyncClient, equipment_template: EquipmentTemplate
    ):
        resp = await admin_client.get("/api/v1/equipment-templates")
        assert resp.status_code == 200
        names = [t["name"] for t in resp.json()]
        assert "Test Equipment Template" in names

    @pytest.mark.asyncio
    async def test_list_equipment_templates_has_approving_consultants_field(self, admin_client: AsyncClient):
        resp = await admin_client.get("/api/v1/equipment-templates")
        assert resp.status_code == 200
        for t in resp.json():
            assert "approving_consultants" in t


class TestEquipmentTemplateGet:

    @pytest.mark.asyncio
    async def test_get_equipment_template(self, admin_client: AsyncClient, equipment_template: EquipmentTemplate):
        resp = await admin_client.get(f"/api/v1/equipment-templates/{equipment_template.id}")
        assert resp.status_code == 200
        data = resp.json()
        assert data["name"] == "Test Equipment Template"
        assert data["name_he"] == "תבנית ציוד בדיקה"

    @pytest.mark.asyncio
    async def test_get_equipment_template_not_found(self, admin_client: AsyncClient):
        resp = await admin_client.get(f"/api/v1/equipment-templates/{uuid.uuid4()}")
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_get_equipment_template_has_category(self, admin_client: AsyncClient, equipment_template: EquipmentTemplate):
        resp = await admin_client.get(f"/api/v1/equipment-templates/{equipment_template.id}")
        assert resp.json()["category"] == "Heavy Machinery"


class TestEquipmentTemplateCreate:

    @pytest.mark.asyncio
    async def test_create_equipment_template_valid(self, admin_client: AsyncClient):
        resp = await admin_client.post("/api/v1/equipment-templates", json=EQUIPMENT_TEMPLATE_PAYLOAD)
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "Tower Crane"
        assert data["name_he"] == "עגורן מגדלי"
        assert "id" in data

    @pytest.mark.asyncio
    async def test_create_equipment_template_missing_name(self, admin_client: AsyncClient):
        payload = {**EQUIPMENT_TEMPLATE_PAYLOAD}
        del payload["name"]
        resp = await admin_client.post("/api/v1/equipment-templates", json=payload)
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_create_equipment_template_missing_name_he(self, admin_client: AsyncClient):
        payload = {**EQUIPMENT_TEMPLATE_PAYLOAD}
        del payload["name_he"]
        resp = await admin_client.post("/api/v1/equipment-templates", json=payload)
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_create_equipment_template_with_hebrew_name(self, admin_client: AsyncClient):
        resp = await admin_client.post("/api/v1/equipment-templates", json=EQUIPMENT_TEMPLATE_PAYLOAD)
        assert resp.status_code == 201
        assert resp.json()["name_he"] == "עגורן מגדלי"

    @pytest.mark.asyncio
    async def test_create_equipment_template_with_required_documents(self, admin_client: AsyncClient):
        doc = {"name": "Safety Certificate", "name_he": "תעודת בטיחות", "source": "consultant", "required": True}
        payload = {**EQUIPMENT_TEMPLATE_PAYLOAD, "required_documents": [doc]}
        resp = await admin_client.post("/api/v1/equipment-templates", json=payload)
        assert resp.status_code == 201
        assert len(resp.json()["required_documents"]) == 1

    @pytest.mark.asyncio
    async def test_create_equipment_template_with_submission_checklist(self, admin_client: AsyncClient):
        item = {"name": "Visual Inspection", "name_he": "בדיקה חזותית", "requires_file": False}
        payload = {**EQUIPMENT_TEMPLATE_PAYLOAD, "submission_checklist": [item]}
        resp = await admin_client.post("/api/v1/equipment-templates", json=payload)
        assert resp.status_code == 201
        assert len(resp.json()["submission_checklist"]) == 1

    @pytest.mark.asyncio
    async def test_create_equipment_template_with_specifications(self, admin_client: AsyncClient):
        spec = {"name": "Max Load", "name_he": "עומס מקסימלי", "field_type": "number", "required": True}
        payload = {**EQUIPMENT_TEMPLATE_PAYLOAD, "required_specifications": [spec]}
        resp = await admin_client.post("/api/v1/equipment-templates", json=payload)
        assert resp.status_code == 201
        assert len(resp.json()["required_specifications"]) == 1

    @pytest.mark.asyncio
    async def test_create_equipment_template_non_admin_forbidden(self, user_client: AsyncClient):
        resp = await user_client.post("/api/v1/equipment-templates", json=EQUIPMENT_TEMPLATE_PAYLOAD)
        assert resp.status_code == 403

    @pytest.mark.asyncio
    async def test_create_equipment_template_has_timestamps(self, admin_client: AsyncClient):
        resp = await admin_client.post("/api/v1/equipment-templates", json=EQUIPMENT_TEMPLATE_PAYLOAD)
        assert resp.status_code == 201
        data = resp.json()
        assert "created_at" in data
        assert "updated_at" in data


class TestEquipmentTemplateUpdate:

    @pytest.mark.asyncio
    async def test_update_equipment_template_full(self, admin_client: AsyncClient, equipment_template: EquipmentTemplate):
        payload = {"name": "Updated Crane", "name_he": "עגורן מעודכן", "category": "Updated Category"}
        resp = await admin_client.put(f"/api/v1/equipment-templates/{equipment_template.id}", json=payload)
        assert resp.status_code == 200
        assert resp.json()["name"] == "Updated Crane"
        assert resp.json()["name_he"] == "עגורן מעודכן"

    @pytest.mark.asyncio
    async def test_update_equipment_template_partial(self, admin_client: AsyncClient, equipment_template: EquipmentTemplate):
        resp = await admin_client.put(
            f"/api/v1/equipment-templates/{equipment_template.id}",
            json={"name": "Partial Update Name"},
        )
        assert resp.status_code == 200
        assert resp.json()["name"] == "Partial Update Name"

    @pytest.mark.asyncio
    async def test_update_equipment_template_not_found(self, admin_client: AsyncClient):
        resp = await admin_client.put(
            f"/api/v1/equipment-templates/{uuid.uuid4()}",
            json={"name": "Ghost"},
        )
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_update_equipment_template_non_admin(self, user_client: AsyncClient, equipment_template: EquipmentTemplate):
        resp = await user_client.put(
            f"/api/v1/equipment-templates/{equipment_template.id}",
            json={"name": "Should Fail"},
        )
        assert resp.status_code == 403


# ---------------------------------------------------------------------------
# MATERIAL TEMPLATE TESTS
# ---------------------------------------------------------------------------

class TestMaterialTemplateList:

    @pytest.mark.asyncio
    async def test_list_material_templates(self, admin_client: AsyncClient):
        resp = await admin_client.get("/api/v1/material-templates")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    @pytest.mark.asyncio
    async def test_list_material_templates_after_create(self, admin_client: AsyncClient):
        await admin_client.post("/api/v1/material-templates", json=MATERIAL_TEMPLATE_PAYLOAD)
        resp = await admin_client.get("/api/v1/material-templates")
        assert resp.status_code == 200
        names = [t["name"] for t in resp.json()]
        assert "Concrete Mix B30" in names

    @pytest.mark.asyncio
    async def test_list_material_templates_filter_by_category(self, admin_client: AsyncClient):
        await admin_client.post("/api/v1/material-templates", json=MATERIAL_TEMPLATE_PAYLOAD)
        resp = await admin_client.get("/api/v1/material-templates", params={"category": "Concrete"})
        assert resp.status_code == 200
        for t in resp.json():
            assert t["category"] == "Concrete"

    @pytest.mark.asyncio
    async def test_list_material_templates_filter_active(self, admin_client: AsyncClient):
        await admin_client.post("/api/v1/material-templates", json=MATERIAL_TEMPLATE_PAYLOAD)
        resp = await admin_client.get("/api/v1/material-templates", params={"is_active": True})
        assert resp.status_code == 200
        for t in resp.json():
            assert t["is_active"] is True

    @pytest.mark.asyncio
    async def test_list_material_templates_has_approving_consultants(self, admin_client: AsyncClient):
        await admin_client.post("/api/v1/material-templates", json=MATERIAL_TEMPLATE_PAYLOAD)
        resp = await admin_client.get("/api/v1/material-templates")
        for t in resp.json():
            assert "approving_consultants" in t


class TestMaterialTemplateGet:

    @pytest.mark.asyncio
    async def test_get_material_template(self, admin_client: AsyncClient):
        create_resp = await admin_client.post("/api/v1/material-templates", json=MATERIAL_TEMPLATE_PAYLOAD)
        tid = create_resp.json()["id"]
        resp = await admin_client.get(f"/api/v1/material-templates/{tid}")
        assert resp.status_code == 200
        assert resp.json()["name"] == "Concrete Mix B30"

    @pytest.mark.asyncio
    async def test_get_material_template_not_found(self, admin_client: AsyncClient):
        resp = await admin_client.get(f"/api/v1/material-templates/{uuid.uuid4()}")
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_get_material_template_has_hebrew(self, admin_client: AsyncClient):
        create_resp = await admin_client.post("/api/v1/material-templates", json=MATERIAL_TEMPLATE_PAYLOAD)
        tid = create_resp.json()["id"]
        resp = await admin_client.get(f"/api/v1/material-templates/{tid}")
        assert resp.json()["name_he"] == "תערובת בטון B30"


class TestMaterialTemplateCreate:

    @pytest.mark.asyncio
    async def test_create_material_template_valid(self, admin_client: AsyncClient):
        resp = await admin_client.post("/api/v1/material-templates", json=MATERIAL_TEMPLATE_PAYLOAD)
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "Concrete Mix B30"
        assert data["is_active"] is True

    @pytest.mark.asyncio
    async def test_create_material_template_missing_name(self, admin_client: AsyncClient):
        payload = {**MATERIAL_TEMPLATE_PAYLOAD}
        del payload["name"]
        resp = await admin_client.post("/api/v1/material-templates", json=payload)
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_create_material_template_missing_name_he(self, admin_client: AsyncClient):
        payload = {**MATERIAL_TEMPLATE_PAYLOAD}
        del payload["name_he"]
        resp = await admin_client.post("/api/v1/material-templates", json=payload)
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_create_material_template_missing_category(self, admin_client: AsyncClient):
        payload = {**MATERIAL_TEMPLATE_PAYLOAD}
        del payload["category"]
        resp = await admin_client.post("/api/v1/material-templates", json=payload)
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_create_material_template_non_admin(self, user_client: AsyncClient):
        resp = await user_client.post("/api/v1/material-templates", json=MATERIAL_TEMPLATE_PAYLOAD)
        assert resp.status_code == 403

    @pytest.mark.asyncio
    async def test_create_material_template_with_documents(self, admin_client: AsyncClient):
        doc = {"name": "Mill Certificate", "name_he": "תעודת טחנה", "source": "contractor", "required": True}
        payload = {**MATERIAL_TEMPLATE_PAYLOAD, "required_documents": [doc]}
        resp = await admin_client.post("/api/v1/material-templates", json=payload)
        assert resp.status_code == 201
        assert len(resp.json()["required_documents"]) == 1

    @pytest.mark.asyncio
    async def test_create_material_template_with_specifications(self, admin_client: AsyncClient):
        spec = {"name": "Compressive Strength", "name_he": "חוזק לחץ", "field_type": "number", "required": True}
        payload = {**MATERIAL_TEMPLATE_PAYLOAD, "required_specifications": [spec]}
        resp = await admin_client.post("/api/v1/material-templates", json=payload)
        assert resp.status_code == 201
        assert len(resp.json()["required_specifications"]) == 1

    @pytest.mark.asyncio
    async def test_create_material_template_has_timestamps(self, admin_client: AsyncClient):
        resp = await admin_client.post("/api/v1/material-templates", json=MATERIAL_TEMPLATE_PAYLOAD)
        assert resp.status_code == 201
        data = resp.json()
        assert "created_at" in data
        assert "updated_at" in data

    @pytest.mark.asyncio
    async def test_create_material_template_inactive(self, admin_client: AsyncClient):
        payload = {**MATERIAL_TEMPLATE_PAYLOAD, "is_active": False}
        resp = await admin_client.post("/api/v1/material-templates", json=payload)
        assert resp.status_code == 201
        assert resp.json()["is_active"] is False


class TestMaterialTemplateUpdate:

    @pytest.mark.asyncio
    async def test_update_material_template_full(self, admin_client: AsyncClient):
        create_resp = await admin_client.post("/api/v1/material-templates", json=MATERIAL_TEMPLATE_PAYLOAD)
        tid = create_resp.json()["id"]
        payload = {"name": "Updated Concrete", "name_he": "בטון מעודכן", "category": "Updated"}
        resp = await admin_client.put(f"/api/v1/material-templates/{tid}", json=payload)
        assert resp.status_code == 200
        assert resp.json()["name"] == "Updated Concrete"

    @pytest.mark.asyncio
    async def test_update_material_template_partial(self, admin_client: AsyncClient):
        create_resp = await admin_client.post("/api/v1/material-templates", json=MATERIAL_TEMPLATE_PAYLOAD)
        tid = create_resp.json()["id"]
        resp = await admin_client.put(f"/api/v1/material-templates/{tid}", json={"name": "Partial Only"})
        assert resp.status_code == 200
        assert resp.json()["name"] == "Partial Only"

    @pytest.mark.asyncio
    async def test_update_material_template_not_found(self, admin_client: AsyncClient):
        resp = await admin_client.put(f"/api/v1/material-templates/{uuid.uuid4()}", json={"name": "Ghost"})
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_update_material_template_non_admin(self, user_client: AsyncClient):
        resp = await user_client.put(f"/api/v1/material-templates/{uuid.uuid4()}", json={"name": "No Access"})
        assert resp.status_code == 403

    @pytest.mark.asyncio
    async def test_update_material_template_toggle_active(self, admin_client: AsyncClient):
        create_resp = await admin_client.post("/api/v1/material-templates", json=MATERIAL_TEMPLATE_PAYLOAD)
        tid = create_resp.json()["id"]
        resp = await admin_client.put(f"/api/v1/material-templates/{tid}", json={"is_active": False})
        assert resp.status_code == 200
        assert resp.json()["is_active"] is False

    @pytest.mark.asyncio
    async def test_update_material_template_data_integrity(self, admin_client: AsyncClient):
        create_resp = await admin_client.post("/api/v1/material-templates", json=MATERIAL_TEMPLATE_PAYLOAD)
        tid = create_resp.json()["id"]
        await admin_client.put(f"/api/v1/material-templates/{tid}", json={"name": "Renamed"})
        get_resp = await admin_client.get(f"/api/v1/material-templates/{tid}")
        assert get_resp.json()["name"] == "Renamed"
        assert get_resp.json()["category"] == "Concrete"


# ---------------------------------------------------------------------------
# AUDIT LOG TESTS
# ---------------------------------------------------------------------------

class TestAuditLogList:

    @pytest.mark.asyncio
    async def test_audit_logs_empty_project(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.get(f"/api/v1/projects/{project.id}/audit")
        assert resp.status_code == 200
        assert resp.json() == []

    @pytest.mark.asyncio
    async def test_audit_logs_unauthenticated(self, client: AsyncClient, project: Project):
        resp = await client.get(f"/api/v1/projects/{project.id}/audit")
        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_audit_logs_non_member(self, user_client: AsyncClient, project: Project):
        resp = await user_client.get(f"/api/v1/projects/{project.id}/audit")
        assert resp.status_code == 403


class TestAuditLogOnFileOperations:

    @pytest.mark.asyncio
    async def test_audit_log_created_on_file_upload(self, admin_client: AsyncClient, project: Project):
        entity_id = str(uuid.uuid4())
        await admin_client.post(
            f"/api/v1/projects/{project.id}/files",
            params={"entity_type": "equipment", "entity_id": entity_id},
            files=make_file(),
        )
        resp = await admin_client.get(
            f"/api/v1/projects/{project.id}/audit",
            params={"entity_type": "file"},
        )
        assert resp.status_code == 200
        logs = resp.json()
        assert len(logs) >= 1
        create_logs = [l for l in logs if l["action"] == "create"]
        assert len(create_logs) >= 1

    @pytest.mark.asyncio
    async def test_audit_log_on_file_upload_has_new_values(self, admin_client: AsyncClient, project: Project):
        entity_id = str(uuid.uuid4())
        await admin_client.post(
            f"/api/v1/projects/{project.id}/files",
            params={"entity_type": "equipment", "entity_id": entity_id},
            files=make_file(),
        )
        resp = await admin_client.get(
            f"/api/v1/projects/{project.id}/audit",
            params={"entity_type": "file", "action": "create"},
        )
        logs = resp.json()
        assert len(logs) >= 1
        assert logs[0]["newValues"] is not None
        assert "filename" in logs[0]["newValues"]

    @pytest.mark.asyncio
    async def test_audit_log_created_on_file_delete(self, admin_client: AsyncClient, project: Project):
        entity_id = str(uuid.uuid4())
        upload_resp = await admin_client.post(
            f"/api/v1/projects/{project.id}/files",
            params={"entity_type": "equipment", "entity_id": entity_id},
            files=make_file(),
        )
        file_id = upload_resp.json()["id"]
        await admin_client.delete(f"/api/v1/projects/{project.id}/files/{file_id}")
        resp = await admin_client.get(
            f"/api/v1/projects/{project.id}/audit",
            params={"entity_type": "file", "action": "delete"},
        )
        logs = resp.json()
        assert len(logs) >= 1

    @pytest.mark.asyncio
    async def test_audit_log_on_file_delete_has_old_values(self, admin_client: AsyncClient, project: Project):
        entity_id = str(uuid.uuid4())
        upload_resp = await admin_client.post(
            f"/api/v1/projects/{project.id}/files",
            params={"entity_type": "equipment", "entity_id": entity_id},
            files=make_file(),
        )
        file_id = upload_resp.json()["id"]
        await admin_client.delete(f"/api/v1/projects/{project.id}/files/{file_id}")
        resp = await admin_client.get(
            f"/api/v1/projects/{project.id}/audit",
            params={"entity_type": "file", "action": "delete"},
        )
        logs = resp.json()
        assert logs[0]["oldValues"] is not None


class TestAuditLogOnContactOperations:

    @pytest.mark.asyncio
    async def test_audit_log_on_contact_create(self, admin_client: AsyncClient, project: Project):
        await admin_client.post(
            f"/api/v1/projects/{project.id}/contacts",
            json={"contact_name": "John Doe", "contact_type": "contractor", "company_name": "BuildCo", "email": "john@buildco.com"},
        )
        resp = await admin_client.get(
            f"/api/v1/projects/{project.id}/audit",
            params={"entity_type": "contact", "action": "create"},
        )
        assert resp.status_code == 200
        logs = resp.json()
        assert len(logs) >= 1
        assert logs[0]["newValues"] is not None

    @pytest.mark.asyncio
    async def test_audit_log_on_contact_update(self, admin_client: AsyncClient, project: Project):
        create_resp = await admin_client.post(
            f"/api/v1/projects/{project.id}/contacts",
            json={"contact_name": "Jane Smith", "contact_type": "engineer", "email": "jane@test.com"},
        )
        contact_id = create_resp.json()["id"]
        await admin_client.put(
            f"/api/v1/projects/{project.id}/contacts/{contact_id}",
            json={"contact_name": "Jane Updated"},
        )
        resp = await admin_client.get(
            f"/api/v1/projects/{project.id}/audit",
            params={"entity_type": "contact", "action": "update"},
        )
        assert resp.status_code == 200
        logs = resp.json()
        assert len(logs) >= 1
        assert logs[0]["oldValues"] is not None
        assert logs[0]["newValues"] is not None

    @pytest.mark.asyncio
    async def test_audit_log_on_contact_delete(self, admin_client: AsyncClient, project: Project):
        create_resp = await admin_client.post(
            f"/api/v1/projects/{project.id}/contacts",
            json={"contact_name": "Delete Me", "contact_type": "subcontractor", "email": "delete@test.com"},
        )
        contact_id = create_resp.json()["id"]
        await admin_client.delete(f"/api/v1/projects/{project.id}/contacts/{contact_id}")
        resp = await admin_client.get(
            f"/api/v1/projects/{project.id}/audit",
            params={"entity_type": "contact", "action": "delete"},
        )
        assert resp.status_code == 200
        logs = resp.json()
        assert len(logs) >= 1
        assert logs[0]["oldValues"] is not None


class TestAuditLogFields:

    @pytest.mark.asyncio
    async def test_audit_log_has_entity_type(self, admin_client: AsyncClient, project: Project):
        await admin_client.post(
            f"/api/v1/projects/{project.id}/contacts",
            json={"contact_name": "Field Test", "contact_type": "architect", "email": "field@test.com"},
        )
        resp = await admin_client.get(f"/api/v1/projects/{project.id}/audit")
        logs = resp.json()
        assert len(logs) >= 1
        assert "entityType" in logs[0]
        assert logs[0]["entityType"] == "contact"

    @pytest.mark.asyncio
    async def test_audit_log_has_action(self, admin_client: AsyncClient, project: Project):
        await admin_client.post(
            f"/api/v1/projects/{project.id}/contacts",
            json={"contact_name": "Action Test", "contact_type": "inspector", "email": "action@test.com"},
        )
        resp = await admin_client.get(f"/api/v1/projects/{project.id}/audit")
        logs = resp.json()
        assert logs[0]["action"] == "create"

    @pytest.mark.asyncio
    async def test_audit_log_has_user_id(self, admin_client: AsyncClient, project: Project, admin_user: User):
        await admin_client.post(
            f"/api/v1/projects/{project.id}/contacts",
            json={"contact_name": "UserId Test", "contact_type": "pm", "email": "userid@test.com"},
        )
        resp = await admin_client.get(f"/api/v1/projects/{project.id}/audit")
        logs = resp.json()
        assert logs[0]["userId"] == str(admin_user.id)

    @pytest.mark.asyncio
    async def test_audit_log_has_entity_id(self, admin_client: AsyncClient, project: Project):
        create_resp = await admin_client.post(
            f"/api/v1/projects/{project.id}/contacts",
            json={"contact_name": "EntityId Test", "contact_type": "owner", "email": "entity@test.com"},
        )
        contact_id = create_resp.json()["id"]
        resp = await admin_client.get(f"/api/v1/projects/{project.id}/audit")
        logs = resp.json()
        assert logs[0]["entityId"] == contact_id

    @pytest.mark.asyncio
    async def test_audit_log_has_project_id(self, admin_client: AsyncClient, project: Project):
        await admin_client.post(
            f"/api/v1/projects/{project.id}/contacts",
            json={"contact_name": "ProjectId Test", "contact_type": "consultant", "email": "projid@test.com"},
        )
        resp = await admin_client.get(f"/api/v1/projects/{project.id}/audit")
        logs = resp.json()
        assert logs[0]["projectId"] == str(project.id)

    @pytest.mark.asyncio
    async def test_audit_log_has_created_at(self, admin_client: AsyncClient, project: Project):
        await admin_client.post(
            f"/api/v1/projects/{project.id}/contacts",
            json={"contact_name": "Timestamp Test", "contact_type": "safety", "email": "timestamp@test.com"},
        )
        resp = await admin_client.get(f"/api/v1/projects/{project.id}/audit")
        logs = resp.json()
        assert "createdAt" in logs[0]


class TestAuditLogFiltering:

    @pytest.mark.asyncio
    async def test_audit_filter_by_entity_type(self, admin_client: AsyncClient, project: Project):
        await admin_client.post(
            f"/api/v1/projects/{project.id}/contacts",
            json={"contact_name": "Filter Entity", "contact_type": "contractor", "email": "filter-entity@test.com"},
        )
        entity_id = str(uuid.uuid4())
        await admin_client.post(
            f"/api/v1/projects/{project.id}/files",
            params={"entity_type": "equipment", "entity_id": entity_id},
            files=make_file(),
        )
        resp = await admin_client.get(
            f"/api/v1/projects/{project.id}/audit",
            params={"entity_type": "contact"},
        )
        logs = resp.json()
        for log in logs:
            assert log["entityType"] == "contact"

    @pytest.mark.asyncio
    async def test_audit_filter_by_action(self, admin_client: AsyncClient, project: Project):
        create_resp = await admin_client.post(
            f"/api/v1/projects/{project.id}/contacts",
            json={"contact_name": "Filter Action", "contact_type": "contractor", "email": "filter-action@test.com"},
        )
        contact_id = create_resp.json()["id"]
        await admin_client.put(
            f"/api/v1/projects/{project.id}/contacts/{contact_id}",
            json={"contact_name": "Updated Action"},
        )
        resp = await admin_client.get(
            f"/api/v1/projects/{project.id}/audit",
            params={"action": "update"},
        )
        logs = resp.json()
        for log in logs:
            assert log["action"] == "update"

    @pytest.mark.asyncio
    async def test_audit_filter_by_user_id(self, admin_client: AsyncClient, project: Project, admin_user: User):
        await admin_client.post(
            f"/api/v1/projects/{project.id}/contacts",
            json={"contact_name": "Filter User", "contact_type": "contractor", "email": "filter-user@test.com"},
        )
        resp = await admin_client.get(
            f"/api/v1/projects/{project.id}/audit",
            params={"user_id": str(admin_user.id)},
        )
        logs = resp.json()
        for log in logs:
            assert log["userId"] == str(admin_user.id)

    @pytest.mark.asyncio
    async def test_audit_pagination_limit(self, admin_client: AsyncClient, project: Project):
        for i in range(5):
            await admin_client.post(
                f"/api/v1/projects/{project.id}/contacts",
                json={"contact_name": f"Contact {i}", "contact_type": "contractor", "email": f"contact{i}@test.com"},
            )
        resp = await admin_client.get(
            f"/api/v1/projects/{project.id}/audit",
            params={"limit": 2},
        )
        assert len(resp.json()) == 2

    @pytest.mark.asyncio
    async def test_audit_pagination_offset(self, admin_client: AsyncClient, project: Project):
        for i in range(5):
            await admin_client.post(
                f"/api/v1/projects/{project.id}/contacts",
                json={"contact_name": f"Offset Contact {i}", "contact_type": "contractor", "email": f"offset{i}@test.com"},
            )
        all_resp = await admin_client.get(f"/api/v1/projects/{project.id}/audit")
        all_logs = all_resp.json()
        offset_resp = await admin_client.get(
            f"/api/v1/projects/{project.id}/audit",
            params={"offset": 2},
        )
        offset_logs = offset_resp.json()
        assert len(offset_logs) == len(all_logs) - 2


class TestAuditLogGlobal:

    @pytest.mark.asyncio
    async def test_global_audit_endpoint(self, admin_client: AsyncClient, project: Project):
        await admin_client.post(
            f"/api/v1/projects/{project.id}/contacts",
            json={"contact_name": "Global Audit", "contact_type": "contractor", "email": "global@test.com"},
        )
        resp = await admin_client.get("/api/v1/audit")
        assert resp.status_code == 200
        assert len(resp.json()) >= 1

    @pytest.mark.asyncio
    async def test_global_audit_unauthenticated(self, client: AsyncClient):
        resp = await client.get("/api/v1/audit")
        assert resp.status_code == 401
