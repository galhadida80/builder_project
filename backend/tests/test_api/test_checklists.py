import pytest
from httpx import AsyncClient
from sqlalchemy import select
from app.main import app

# Template CRUD Tests
@pytest.mark.asyncio
async def test_create_template_returns_201(async_client: AsyncClient, test_project_id):
    """Test POST /projects/{id}/checklist-templates returns 201"""
    response = await async_client.post(
        f"/api/v1/projects/{test_project_id}/checklist-templates",
        json={
            "name": "פרוטוקול מסירה לדייר",
            "level": "project",
            "group": "מסירות",
            "category": "דירה"
        }
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "פרוטוקול מסירה לדייר"
    assert "id" in data

@pytest.mark.asyncio
async def test_get_template_returns_full_hierarchy(async_client: AsyncClient, test_template_with_subsections):
    """Test GET template returns subsections and items"""
    template_id, project_id = test_template_with_subsections
    response = await async_client.get(
        f"/api/v1/projects/{project_id}/checklist-templates/{template_id}"
    )
    assert response.status_code == 200
    data = response.json()
    assert "subsections" in data
    assert len(data["subsections"]) > 0

@pytest.mark.asyncio
async def test_update_template_returns_updated_data(async_client: AsyncClient, test_template):
    """Test PUT template updates and returns new data"""
    template_id, project_id = test_template
    response = await async_client.put(
        f"/api/v1/projects/{project_id}/checklist-templates/{template_id}",
        json={"name": "Updated Name"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Updated Name"

@pytest.mark.asyncio
async def test_delete_template_cascades_to_subsections(async_client: AsyncClient, async_session, test_template_with_subsections):
    """Test DELETE template deletes subsections via cascade"""
    template_id, project_id = test_template_with_subsections

    # Delete template
    response = await async_client.delete(
        f"/api/v1/projects/{project_id}/checklist-templates/{template_id}"
    )
    assert response.status_code == 200

    # Verify subsections deleted
    from app.models.checklist import ChecklistSubSection
    result = await async_session.execute(
        select(ChecklistSubSection).where(ChecklistSubSection.template_id == template_id)
    )
    assert result.scalar_one_or_none() is None

# SubSection Tests
@pytest.mark.asyncio
async def test_create_subsection_under_template(async_client: AsyncClient, test_template):
    """Test POST subsection under template"""
    template_id, project_id = test_template
    response = await async_client.post(
        f"/api/v1/checklist-templates/{template_id}/subsections",
        json={"name": "כניסה", "order": 1}
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "כניסה"
    assert data["templateId"] == str(template_id)

# ItemTemplate Tests
@pytest.mark.asyncio
async def test_create_item_template_with_must_flags(async_client: AsyncClient, test_subsection):
    """Test POST item template with must_image=True"""
    subsection_id = test_subsection
    response = await async_client.post(
        f"/api/v1/subsections/{subsection_id}/items",
        json={
            "name": "בדיקת צבע קירות",
            "must_image": True,
            "must_note": False,
            "must_signature": False
        }
    )
    assert response.status_code == 201
    data = response.json()
    assert data["mustImage"] is True

# Audit Logging Tests
@pytest.mark.asyncio
async def test_template_create_generates_audit_log(async_client: AsyncClient, async_session, test_project_id):
    """Test creating template generates audit log entry"""
    response = await async_client.post(
        f"/api/v1/projects/{test_project_id}/checklist-templates",
        json={"name": "Test", "level": "project", "group": "test"}
    )
    template_id = response.json()["id"]

    # Check audit log
    from app.models.audit import AuditLog
    result = await async_session.execute(
        select(AuditLog).where(
            AuditLog.entity_type == "checklist_template",
            AuditLog.entity_id == template_id,
            AuditLog.action == "CREATE"
        )
    )
    log = result.scalar_one_or_none()
    assert log is not None

# Error Handling Tests
@pytest.mark.asyncio
async def test_get_template_nonexistent_returns_404(async_client: AsyncClient, test_project_id):
    """Test GET nonexistent template returns 404"""
    import uuid
    fake_id = uuid.uuid4()
    response = await async_client.get(
        f"/api/v1/projects/{test_project_id}/checklist-templates/{fake_id}"
    )
    assert response.status_code == 404
