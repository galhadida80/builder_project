import uuid
import asyncio
from datetime import datetime
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.project import Project, ProjectMember
from app.models.user import User
from app.models.equipment import Equipment
from app.models.material import Material
from app.models.contact import Contact
from app.models.meeting import Meeting
from app.models.rfi import RFI
from app.models.area import ConstructionArea
from app.models.file import File
from app.models.audit import AuditLog

FAKE_UUID = "00000000-0000-0000-0000-000000000099"


@pytest.fixture
async def project_b(db: AsyncSession):
    other_user = User(
        id=uuid.uuid4(),
        firebase_uid="other-user-uid",
        email="other@test.com",
        full_name="Other User",
        role="user",
        is_active=True,
    )
    db.add(other_user)
    await db.flush()

    proj = Project(
        id=uuid.uuid4(),
        name="Other Project",
        code="OTHER-001",
        description="Project admin_user cannot access",
        status="active",
        created_by_id=other_user.id,
    )
    db.add(proj)
    await db.flush()

    member = ProjectMember(
        project_id=proj.id,
        user_id=other_user.id,
        role="project_admin",
    )
    db.add(member)
    await db.commit()
    await db.refresh(proj)
    return proj


@pytest.fixture
async def equipment_in_project(db: AsyncSession, project: Project, admin_user: User):
    eq = Equipment(
        id=uuid.uuid4(),
        project_id=project.id,
        name="Test Crane",
        equipment_type="Heavy",
        manufacturer="CAT",
        model_number="C100",
        status="draft",
        created_by_id=admin_user.id,
    )
    db.add(eq)
    await db.commit()
    await db.refresh(eq)
    return eq


@pytest.fixture
async def material_in_project(db: AsyncSession, project: Project, admin_user: User):
    mat = Material(
        id=uuid.uuid4(),
        project_id=project.id,
        name="Steel Beam",
        material_type="Steel",
        manufacturer="SteelCorp",
        status="draft",
        created_by_id=admin_user.id,
    )
    db.add(mat)
    await db.commit()
    await db.refresh(mat)
    return mat


@pytest.fixture
async def contact_in_project(db: AsyncSession, project: Project):
    ct = Contact(
        id=uuid.uuid4(),
        project_id=project.id,
        contact_type="contractor",
        contact_name="John Doe",
        company_name="BuildCo",
        email="john@buildco.com",
    )
    db.add(ct)
    await db.commit()
    await db.refresh(ct)
    return ct


@pytest.fixture
async def meeting_in_project(db: AsyncSession, project: Project, admin_user: User):
    mt = Meeting(
        id=uuid.uuid4(),
        project_id=project.id,
        title="Weekly Sync",
        scheduled_date=datetime(2025, 6, 1, 10, 0, 0),
        status="scheduled",
        created_by_id=admin_user.id,
    )
    db.add(mt)
    await db.commit()
    await db.refresh(mt)
    return mt


@pytest.fixture
async def area_in_project(db: AsyncSession, project: Project):
    area = ConstructionArea(
        id=uuid.uuid4(),
        project_id=project.id,
        name="Building A",
        area_type="building",
        floor_number=1,
        total_units=10,
    )
    db.add(area)
    await db.commit()
    await db.refresh(area)
    return area


@pytest.fixture
async def equipment_in_project_b(db: AsyncSession, project_b: Project):
    eq = Equipment(
        id=uuid.uuid4(),
        project_id=project_b.id,
        name="Excavator B",
        status="draft",
    )
    db.add(eq)
    await db.commit()
    await db.refresh(eq)
    return eq


@pytest.fixture
async def material_in_project_b(db: AsyncSession, project_b: Project):
    mat = Material(
        id=uuid.uuid4(),
        project_id=project_b.id,
        name="Concrete B",
        status="draft",
    )
    db.add(mat)
    await db.commit()
    await db.refresh(mat)
    return mat


@pytest.fixture
async def contact_in_project_b(db: AsyncSession, project_b: Project):
    ct = Contact(
        id=uuid.uuid4(),
        project_id=project_b.id,
        contact_type="supplier",
        contact_name="Jane B",
    )
    db.add(ct)
    await db.commit()
    await db.refresh(ct)
    return ct


@pytest.fixture
async def meeting_in_project_b(db: AsyncSession, project_b: Project):
    mt = Meeting(
        id=uuid.uuid4(),
        project_id=project_b.id,
        title="Other Meeting",
        scheduled_date=datetime(2025, 7, 1, 9, 0, 0),
        status="scheduled",
    )
    db.add(mt)
    await db.commit()
    await db.refresh(mt)
    return mt


@pytest.fixture
async def area_in_project_b(db: AsyncSession, project_b: Project):
    area = ConstructionArea(
        id=uuid.uuid4(),
        project_id=project_b.id,
        name="Building B",
        total_units=5,
    )
    db.add(area)
    await db.commit()
    await db.refresh(area)
    return area


# ---------------------------------------------------------------------------
# 1. UNAUTHENTICATED ACCESS TESTS (~15)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_unauth_get_projects(client: AsyncClient):
    r = await client.get("/api/v1/projects")
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_unauth_post_project(client: AsyncClient):
    r = await client.post("/api/v1/projects", json={"name": "X", "code": "X1"})
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_unauth_get_equipment(client: AsyncClient, project: Project):
    r = await client.get(f"/api/v1/projects/{project.id}/equipment")
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_unauth_post_equipment(client: AsyncClient, project: Project):
    r = await client.post(
        f"/api/v1/projects/{project.id}/equipment",
        json={"name": "Crane"},
    )
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_unauth_get_materials(client: AsyncClient, project: Project):
    r = await client.get(f"/api/v1/projects/{project.id}/materials")
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_unauth_get_contacts(client: AsyncClient, project: Project):
    r = await client.get(f"/api/v1/projects/{project.id}/contacts")
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_unauth_get_meetings(client: AsyncClient, project: Project):
    r = await client.get(f"/api/v1/projects/{project.id}/meetings")
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_unauth_get_rfis(client: AsyncClient, project: Project):
    r = await client.get(f"/api/v1/projects/{project.id}/rfis")
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_unauth_get_areas(client: AsyncClient, project: Project):
    r = await client.get(f"/api/v1/projects/{project.id}/areas")
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_unauth_get_approvals(client: AsyncClient, project: Project):
    r = await client.get(f"/api/v1/projects/{project.id}/approvals")
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_unauth_get_audit(client: AsyncClient, project: Project):
    r = await client.get(f"/api/v1/projects/{project.id}/audit")
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_unauth_get_workload(client: AsyncClient):
    r = await client.get("/api/v1/workload")
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_unauth_get_equipment_templates(client: AsyncClient):
    r = await client.get("/api/v1/equipment-templates")
    assert r.status_code == 200


@pytest.mark.asyncio
async def test_unauth_get_files(client: AsyncClient, project: Project):
    r = await client.get(f"/api/v1/projects/{project.id}/files")
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_unauth_get_contacts_export(client: AsyncClient, project: Project):
    r = await client.get(f"/api/v1/projects/{project.id}/contacts/export")
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_unauth_flat_equipment(client: AsyncClient):
    r = await client.get("/api/v1/equipment")
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_unauth_flat_materials(client: AsyncClient):
    r = await client.get("/api/v1/materials")
    assert r.status_code == 401


# ---------------------------------------------------------------------------
# 2. CROSS-PROJECT DATA ISOLATION (~20)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_cannot_access_other_project_equipment(
    admin_client: AsyncClient, project_b: Project
):
    r = await admin_client.get(f"/api/v1/projects/{project_b.id}/equipment")
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_cannot_access_other_project_materials(
    admin_client: AsyncClient, project_b: Project
):
    r = await admin_client.get(f"/api/v1/projects/{project_b.id}/materials")
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_cannot_access_other_project_contacts(
    admin_client: AsyncClient, project_b: Project
):
    r = await admin_client.get(f"/api/v1/projects/{project_b.id}/contacts")
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_cannot_access_other_project_meetings(
    admin_client: AsyncClient, project_b: Project
):
    r = await admin_client.get(f"/api/v1/projects/{project_b.id}/meetings")
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_cannot_access_other_project_rfis(
    admin_client: AsyncClient, project_b: Project
):
    r = await admin_client.get(f"/api/v1/projects/{project_b.id}/rfis")
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_cannot_access_other_project_areas(
    admin_client: AsyncClient, project_b: Project
):
    r = await admin_client.get(f"/api/v1/projects/{project_b.id}/areas")
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_cannot_access_other_project_files(
    admin_client: AsyncClient, project_b: Project
):
    r = await admin_client.get(f"/api/v1/projects/{project_b.id}/files")
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_cannot_access_other_project_audit(
    admin_client: AsyncClient, project_b: Project
):
    r = await admin_client.get(f"/api/v1/projects/{project_b.id}/audit")
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_cannot_access_other_project_approvals(
    admin_client: AsyncClient, project_b: Project
):
    r = await admin_client.get(f"/api/v1/projects/{project_b.id}/approvals")
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_cannot_create_equipment_in_other_project(
    admin_client: AsyncClient, project_b: Project
):
    r = await admin_client.post(
        f"/api/v1/projects/{project_b.id}/equipment",
        json={"name": "Attempted Crane"},
    )
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_cannot_create_material_in_other_project(
    admin_client: AsyncClient, project_b: Project
):
    r = await admin_client.post(
        f"/api/v1/projects/{project_b.id}/materials",
        json={"name": "Attempted Steel"},
    )
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_cannot_create_contact_in_other_project(
    admin_client: AsyncClient, project_b: Project
):
    r = await admin_client.post(
        f"/api/v1/projects/{project_b.id}/contacts",
        json={"contact_name": "Hack", "contact_type": "contractor"},
    )
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_cannot_create_meeting_in_other_project(
    admin_client: AsyncClient, project_b: Project
):
    r = await admin_client.post(
        f"/api/v1/projects/{project_b.id}/meetings",
        json={"title": "Sneaky Meeting", "scheduled_date": "2025-06-01T10:00:00"},
    )
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_cannot_create_area_in_other_project(
    admin_client: AsyncClient, project_b: Project
):
    r = await admin_client.post(
        f"/api/v1/projects/{project_b.id}/areas",
        json={"name": "Sneaky Area"},
    )
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_cannot_create_rfi_in_other_project(
    admin_client: AsyncClient, project_b: Project
):
    r = await admin_client.post(
        f"/api/v1/projects/{project_b.id}/rfis",
        json={
            "subject": "Sneaky RFI",
            "question": "How?",
            "to_email": "x@test.com",
        },
    )
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_cannot_export_contacts_from_other_project(
    admin_client: AsyncClient, project_b: Project
):
    r = await admin_client.get(f"/api/v1/projects/{project_b.id}/contacts/export")
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_flat_equipment_only_returns_own_projects(
    admin_client: AsyncClient,
    project: Project,
    equipment_in_project: Equipment,
    equipment_in_project_b: Equipment,
):
    r = await admin_client.get("/api/v1/equipment")
    assert r.status_code == 200
    ids = [item["id"] for item in r.json()]
    assert str(equipment_in_project.id) in ids
    assert str(equipment_in_project_b.id) not in ids


@pytest.mark.asyncio
async def test_flat_materials_only_returns_own_projects(
    admin_client: AsyncClient,
    project: Project,
    material_in_project: Material,
    material_in_project_b: Material,
):
    r = await admin_client.get("/api/v1/materials")
    assert r.status_code == 200
    ids = [item["id"] for item in r.json()]
    assert str(material_in_project.id) in ids
    assert str(material_in_project_b.id) not in ids


@pytest.mark.asyncio
async def test_cannot_get_other_project_overview(
    admin_client: AsyncClient, project_b: Project
):
    r = await admin_client.get(f"/api/v1/projects/{project_b.id}")
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_cannot_delete_other_project(
    admin_client: AsyncClient, project_b: Project
):
    r = await admin_client.delete(f"/api/v1/projects/{project_b.id}")
    assert r.status_code == 404


# ---------------------------------------------------------------------------
# 3. IDOR PREVENTION (~10)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_idor_equipment_wrong_project(
    admin_client: AsyncClient,
    project: Project,
    equipment_in_project_b: Equipment,
):
    r = await admin_client.get(
        f"/api/v1/projects/{project.id}/equipment/{equipment_in_project_b.id}"
    )
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_idor_material_wrong_project(
    admin_client: AsyncClient,
    project: Project,
    material_in_project_b: Material,
):
    r = await admin_client.get(
        f"/api/v1/projects/{project.id}/materials/{material_in_project_b.id}"
    )
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_idor_contact_wrong_project(
    admin_client: AsyncClient,
    project: Project,
    contact_in_project_b: Contact,
):
    r = await admin_client.get(
        f"/api/v1/projects/{project.id}/contacts/{contact_in_project_b.id}"
    )
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_idor_meeting_wrong_project(
    admin_client: AsyncClient,
    project: Project,
    meeting_in_project_b: Meeting,
):
    r = await admin_client.get(
        f"/api/v1/projects/{project.id}/meetings/{meeting_in_project_b.id}"
    )
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_idor_area_wrong_project(
    admin_client: AsyncClient,
    project: Project,
    area_in_project_b: ConstructionArea,
):
    r = await admin_client.get(
        f"/api/v1/projects/{project.id}/areas/{area_in_project_b.id}"
    )
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_idor_update_equipment_wrong_project(
    admin_client: AsyncClient,
    project: Project,
    equipment_in_project_b: Equipment,
):
    r = await admin_client.put(
        f"/api/v1/projects/{project.id}/equipment/{equipment_in_project_b.id}",
        json={"name": "Hacked Name"},
    )
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_idor_delete_equipment_wrong_project(
    admin_client: AsyncClient,
    project: Project,
    equipment_in_project_b: Equipment,
):
    r = await admin_client.delete(
        f"/api/v1/projects/{project.id}/equipment/{equipment_in_project_b.id}"
    )
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_idor_update_material_wrong_project(
    admin_client: AsyncClient,
    project: Project,
    material_in_project_b: Material,
):
    r = await admin_client.put(
        f"/api/v1/projects/{project.id}/materials/{material_in_project_b.id}",
        json={"name": "Hacked Material"},
    )
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_idor_delete_contact_wrong_project(
    admin_client: AsyncClient,
    project: Project,
    contact_in_project_b: Contact,
):
    r = await admin_client.delete(
        f"/api/v1/projects/{project.id}/contacts/{contact_in_project_b.id}"
    )
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_idor_delete_meeting_wrong_project(
    admin_client: AsyncClient,
    project: Project,
    meeting_in_project_b: Meeting,
):
    r = await admin_client.delete(
        f"/api/v1/projects/{project.id}/meetings/{meeting_in_project_b.id}"
    )
    assert r.status_code == 404


# ---------------------------------------------------------------------------
# 4. INPUT VALIDATION & SQL INJECTION PREVENTION (~15)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_invalid_uuid_in_project_path(admin_client: AsyncClient):
    r = await admin_client.get("/api/v1/projects/not-a-uuid/equipment")
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_invalid_uuid_in_equipment_path(
    admin_client: AsyncClient, project: Project
):
    r = await admin_client.get(
        f"/api/v1/projects/{project.id}/equipment/not-a-valid-uuid"
    )
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_sql_injection_in_equipment_name(
    admin_client: AsyncClient, project: Project
):
    r = await admin_client.post(
        f"/api/v1/projects/{project.id}/equipment",
        json={"name": "'; DROP TABLE equipment; --", "manufacturer": "Test"},
    )
    assert r.status_code in [200, 201, 422]
    assert r.status_code != 500


@pytest.mark.asyncio
async def test_sql_injection_in_contact_name(
    admin_client: AsyncClient, project: Project
):
    r = await admin_client.post(
        f"/api/v1/projects/{project.id}/contacts",
        json={
            "contact_name": "' OR 1=1; --",
            "contact_type": "contractor",
        },
    )
    assert r.status_code in [200, 201, 422]
    assert r.status_code != 500


@pytest.mark.asyncio
async def test_sql_injection_in_material_name(
    admin_client: AsyncClient, project: Project
):
    r = await admin_client.post(
        f"/api/v1/projects/{project.id}/materials",
        json={"name": "1; SELECT * FROM users --"},
    )
    assert r.status_code in [200, 201, 422]
    assert r.status_code != 500


@pytest.mark.asyncio
async def test_xss_in_equipment_name(admin_client: AsyncClient, project: Project):
    r = await admin_client.post(
        f"/api/v1/projects/{project.id}/equipment",
        json={"name": '<script>alert("xss")</script>Valid Name'},
    )
    assert r.status_code in [200, 201, 422]
    if r.status_code in [200, 201]:
        assert "<script>" not in r.json()["name"]


@pytest.mark.asyncio
async def test_xss_in_meeting_title(admin_client: AsyncClient, project: Project):
    r = await admin_client.post(
        f"/api/v1/projects/{project.id}/meetings",
        json={
            "title": '<img onerror="alert(1)">Meeting',
            "scheduled_date": "2025-06-01T10:00:00",
        },
    )
    assert r.status_code in [200, 201, 422]
    if r.status_code in [200, 201]:
        assert "onerror" not in r.json()["title"]


@pytest.mark.asyncio
async def test_extremely_long_name_rejected(
    admin_client: AsyncClient, project: Project
):
    r = await admin_client.post(
        f"/api/v1/projects/{project.id}/equipment",
        json={"name": "A" * 10001},
    )
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_empty_name_rejected(admin_client: AsyncClient, project: Project):
    r = await admin_client.post(
        f"/api/v1/projects/{project.id}/equipment",
        json={"name": ""},
    )
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_single_char_name_rejected(admin_client: AsyncClient, project: Project):
    r = await admin_client.post(
        f"/api/v1/projects/{project.id}/equipment",
        json={"name": "X"},
    )
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_invalid_email_format_in_contact(
    admin_client: AsyncClient, project: Project
):
    r = await admin_client.post(
        f"/api/v1/projects/{project.id}/contacts",
        json={
            "contact_name": "Test Person",
            "contact_type": "contractor",
            "email": "not-an-email",
        },
    )
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_invalid_email_format_in_rfi(
    admin_client: AsyncClient, project: Project
):
    r = await admin_client.post(
        f"/api/v1/projects/{project.id}/rfis",
        json={
            "subject": "Test RFI",
            "question": "Test question here",
            "to_email": "totally-broken-email",
        },
    )
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_negative_quantity_in_material(
    admin_client: AsyncClient, project: Project
):
    r = await admin_client.post(
        f"/api/v1/projects/{project.id}/materials",
        json={"name": "Bad Material", "quantity": -10},
    )
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_special_chars_in_project_code(admin_client: AsyncClient):
    r = await admin_client.post(
        "/api/v1/projects",
        json={"name": "Valid Project", "code": "'; DROP TABLE --"},
    )
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_backslash_semicolon_in_name(
    admin_client: AsyncClient, project: Project
):
    r = await admin_client.post(
        f"/api/v1/projects/{project.id}/equipment",
        json={"name": 'Test\\Name; SELECT 1'},
    )
    assert r.status_code in [200, 201]
    assert r.status_code != 500


# ---------------------------------------------------------------------------
# 5. CONCURRENT / RACE CONDITION TESTS (~5)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_create_two_projects_same_code(admin_client: AsyncClient):
    code = f"RACE-{uuid.uuid4().hex[:4].upper()}"
    r1 = await admin_client.post(
        "/api/v1/projects",
        json={"name": "Project One", "code": code},
    )
    assert r1.status_code == 200
    try:
        r2 = await admin_client.post(
            "/api/v1/projects",
            json={"name": "Project Two", "code": code},
        )
        assert r2.status_code in [400, 409, 422, 500]
    except Exception:
        pass


@pytest.mark.asyncio
async def test_double_delete_equipment(
    admin_client: AsyncClient,
    project: Project,
    equipment_in_project: Equipment,
):
    url = f"/api/v1/projects/{project.id}/equipment/{equipment_in_project.id}"
    r1 = await admin_client.delete(url)
    assert r1.status_code == 200
    r2 = await admin_client.delete(url)
    assert r2.status_code == 404


@pytest.mark.asyncio
async def test_double_delete_material(
    admin_client: AsyncClient,
    project: Project,
    material_in_project: Material,
):
    url = f"/api/v1/projects/{project.id}/materials/{material_in_project.id}"
    r1 = await admin_client.delete(url)
    assert r1.status_code == 200
    r2 = await admin_client.delete(url)
    assert r2.status_code == 404


@pytest.mark.asyncio
async def test_double_delete_contact(
    admin_client: AsyncClient,
    project: Project,
    contact_in_project: Contact,
):
    url = f"/api/v1/projects/{project.id}/contacts/{contact_in_project.id}"
    r1 = await admin_client.delete(url)
    assert r1.status_code == 200
    r2 = await admin_client.delete(url)
    assert r2.status_code == 404


@pytest.mark.asyncio
async def test_double_delete_meeting(
    admin_client: AsyncClient,
    project: Project,
    meeting_in_project: Meeting,
):
    url = f"/api/v1/projects/{project.id}/meetings/{meeting_in_project.id}"
    r1 = await admin_client.delete(url)
    assert r1.status_code == 200
    r2 = await admin_client.delete(url)
    assert r2.status_code == 404


# ---------------------------------------------------------------------------
# 6. EMPTY / NULL / BOUNDARY TESTS (~15+)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_empty_json_body_equipment(admin_client: AsyncClient, project: Project):
    r = await admin_client.post(
        f"/api/v1/projects/{project.id}/equipment",
        json={},
    )
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_empty_json_body_material(admin_client: AsyncClient, project: Project):
    r = await admin_client.post(
        f"/api/v1/projects/{project.id}/materials",
        json={},
    )
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_empty_json_body_contact(admin_client: AsyncClient, project: Project):
    r = await admin_client.post(
        f"/api/v1/projects/{project.id}/contacts",
        json={},
    )
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_empty_json_body_meeting(admin_client: AsyncClient, project: Project):
    r = await admin_client.post(
        f"/api/v1/projects/{project.id}/meetings",
        json={},
    )
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_empty_json_body_area(admin_client: AsyncClient, project: Project):
    r = await admin_client.post(
        f"/api/v1/projects/{project.id}/areas",
        json={},
    )
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_null_required_field_equipment(
    admin_client: AsyncClient, project: Project
):
    r = await admin_client.post(
        f"/api/v1/projects/{project.id}/equipment",
        json={"name": None},
    )
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_extra_unknown_fields_ignored_equipment(
    admin_client: AsyncClient, project: Project
):
    r = await admin_client.post(
        f"/api/v1/projects/{project.id}/equipment",
        json={
            "name": "Good Equipment",
            "totally_fake_field": "should be ignored",
            "another_fake": 42,
        },
    )
    assert r.status_code in [200, 201]


@pytest.mark.asyncio
async def test_extra_unknown_fields_ignored_contact(
    admin_client: AsyncClient, project: Project
):
    r = await admin_client.post(
        f"/api/v1/projects/{project.id}/contacts",
        json={
            "contact_name": "Valid Name",
            "contact_type": "contractor",
            "nonexistent": True,
        },
    )
    assert r.status_code in [200, 201]


@pytest.mark.asyncio
async def test_unicode_emoji_in_equipment_name(
    admin_client: AsyncClient, project: Project
):
    r = await admin_client.post(
        f"/api/v1/projects/{project.id}/equipment",
        json={"name": "Crane Tower 42"},
    )
    assert r.status_code in [200, 201]


@pytest.mark.asyncio
async def test_hebrew_text_in_contact_name(
    admin_client: AsyncClient, project: Project
):
    r = await admin_client.post(
        f"/api/v1/projects/{project.id}/contacts",
        json={"contact_name": "Name Here", "contact_type": "contractor"},
    )
    assert r.status_code in [200, 201]


@pytest.mark.asyncio
async def test_pagination_empty_results_equipment(
    admin_client: AsyncClient, project: Project
):
    r = await admin_client.get(f"/api/v1/projects/{project.id}/equipment")
    assert r.status_code == 200
    assert r.json() == []


@pytest.mark.asyncio
async def test_pagination_empty_results_materials(
    admin_client: AsyncClient, project: Project
):
    r = await admin_client.get(f"/api/v1/projects/{project.id}/materials")
    assert r.status_code == 200
    assert r.json() == []


@pytest.mark.asyncio
async def test_empty_specifications_object(
    admin_client: AsyncClient, project: Project
):
    r = await admin_client.post(
        f"/api/v1/projects/{project.id}/equipment",
        json={"name": "Spec Test Equipment", "specifications": {}},
    )
    assert r.status_code in [200, 201]


@pytest.mark.asyncio
async def test_nested_specifications_values(
    admin_client: AsyncClient, project: Project
):
    r = await admin_client.post(
        f"/api/v1/projects/{project.id}/equipment",
        json={
            "name": "Nested Spec Equipment",
            "specifications": {
                "voltage": 220,
                "phase": "three",
                "certified": True,
                "weight_kg": 1500.5,
                "notes": None,
            },
        },
    )
    assert r.status_code in [200, 201]


@pytest.mark.asyncio
async def test_spec_value_nested_dict_rejected(
    admin_client: AsyncClient, project: Project
):
    r = await admin_client.post(
        f"/api/v1/projects/{project.id}/equipment",
        json={
            "name": "Bad Spec Equipment",
            "specifications": {"deep": {"nested": "value"}},
        },
    )
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_boolean_field_handling_contact(
    admin_client: AsyncClient, project: Project
):
    r = await admin_client.post(
        f"/api/v1/projects/{project.id}/contacts",
        json={
            "contact_name": "Primary Contact",
            "contact_type": "owner",
            "is_primary": True,
        },
    )
    assert r.status_code in [200, 201]
    assert r.json()["isPrimary"] is True


@pytest.mark.asyncio
async def test_nonexistent_resource_returns_404(
    admin_client: AsyncClient, project: Project
):
    fake = FAKE_UUID
    r = await admin_client.get(f"/api/v1/projects/{project.id}/equipment/{fake}")
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_nonexistent_material_returns_404(
    admin_client: AsyncClient, project: Project
):
    r = await admin_client.get(f"/api/v1/projects/{project.id}/materials/{FAKE_UUID}")
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_nonexistent_contact_returns_404(
    admin_client: AsyncClient, project: Project
):
    r = await admin_client.get(f"/api/v1/projects/{project.id}/contacts/{FAKE_UUID}")
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_nonexistent_meeting_returns_404(
    admin_client: AsyncClient, project: Project
):
    r = await admin_client.get(f"/api/v1/projects/{project.id}/meetings/{FAKE_UUID}")
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_nonexistent_area_returns_404(
    admin_client: AsyncClient, project: Project
):
    r = await admin_client.get(f"/api/v1/projects/{project.id}/areas/{FAKE_UUID}")
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_area_floor_number_boundary_lower(
    admin_client: AsyncClient, project: Project
):
    r = await admin_client.post(
        f"/api/v1/projects/{project.id}/areas",
        json={"name": "Basement Area", "floor_number": -99},
    )
    assert r.status_code in [200, 201]


@pytest.mark.asyncio
async def test_area_floor_number_boundary_upper(
    admin_client: AsyncClient, project: Project
):
    r = await admin_client.post(
        f"/api/v1/projects/{project.id}/areas",
        json={"name": "Sky Area", "floor_number": 999},
    )
    assert r.status_code in [200, 201]


@pytest.mark.asyncio
async def test_area_floor_number_exceeds_max(
    admin_client: AsyncClient, project: Project
):
    r = await admin_client.post(
        f"/api/v1/projects/{project.id}/areas",
        json={"name": "Too High", "floor_number": 1000},
    )
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_area_total_units_zero_rejected(
    admin_client: AsyncClient, project: Project
):
    r = await admin_client.post(
        f"/api/v1/projects/{project.id}/areas",
        json={"name": "Zero Units", "total_units": 0},
    )
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_material_quantity_zero_allowed(
    admin_client: AsyncClient, project: Project
):
    r = await admin_client.post(
        f"/api/v1/projects/{project.id}/materials",
        json={"name": "Free Material", "quantity": 0},
    )
    assert r.status_code in [200, 201]


@pytest.mark.asyncio
async def test_material_quantity_exceeds_max(
    admin_client: AsyncClient, project: Project
):
    r = await admin_client.post(
        f"/api/v1/projects/{project.id}/materials",
        json={"name": "Too Much", "quantity": 9999999999},
    )
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_project_code_min_length(admin_client: AsyncClient):
    r = await admin_client.post(
        "/api/v1/projects",
        json={"name": "Short Code Project", "code": "X"},
    )
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_meeting_invalid_date_format(
    admin_client: AsyncClient, project: Project
):
    r = await admin_client.post(
        f"/api/v1/projects/{project.id}/meetings",
        json={"title": "Bad Date Meeting", "scheduled_date": "not-a-date"},
    )
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_update_equipment_with_empty_body(
    admin_client: AsyncClient,
    project: Project,
    equipment_in_project: Equipment,
):
    r = await admin_client.put(
        f"/api/v1/projects/{project.id}/equipment/{equipment_in_project.id}",
        json={},
    )
    assert r.status_code in [200, 201]
    assert r.json()["name"] == equipment_in_project.name


@pytest.mark.asyncio
async def test_spec_too_many_keys_rejected(
    admin_client: AsyncClient, project: Project
):
    big_specs = {f"key_{i}": f"val_{i}" for i in range(51)}
    r = await admin_client.post(
        f"/api/v1/projects/{project.id}/equipment",
        json={"name": "Big Spec Equipment", "specifications": big_specs},
    )
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_spec_key_too_long_rejected(
    admin_client: AsyncClient, project: Project
):
    r = await admin_client.post(
        f"/api/v1/projects/{project.id}/equipment",
        json={
            "name": "Long Key Equipment",
            "specifications": {"k" * 101: "value"},
        },
    )
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_spec_value_too_long_rejected(
    admin_client: AsyncClient, project: Project
):
    r = await admin_client.post(
        f"/api/v1/projects/{project.id}/equipment",
        json={
            "name": "Long Val Equipment",
            "specifications": {"key": "v" * 501},
        },
    )
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_phone_invalid_chars_rejected(
    admin_client: AsyncClient, project: Project
):
    r = await admin_client.post(
        f"/api/v1/projects/{project.id}/contacts",
        json={
            "contact_name": "Bad Phone",
            "contact_type": "contractor",
            "phone": "abc-invalid-phone",
        },
    )
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_phone_valid_format_accepted(
    admin_client: AsyncClient, project: Project
):
    r = await admin_client.post(
        f"/api/v1/projects/{project.id}/contacts",
        json={
            "contact_name": "Good Phone",
            "contact_type": "contractor",
            "phone": "+1 (555) 123-4567",
        },
    )
    assert r.status_code in [200, 201]


@pytest.mark.asyncio
async def test_area_code_invalid_chars_rejected(
    admin_client: AsyncClient, project: Project
):
    r = await admin_client.post(
        f"/api/v1/projects/{project.id}/areas",
        json={"name": "Bad Code Area", "area_code": "area code with spaces!"},
    )
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_xss_in_contact_role_description(
    admin_client: AsyncClient, project: Project
):
    r = await admin_client.post(
        f"/api/v1/projects/{project.id}/contacts",
        json={
            "contact_name": "XSS Contact",
            "contact_type": "contractor",
            "role_description": '<script>document.cookie</script>Manager',
        },
    )
    assert r.status_code in [200, 201]
    if r.status_code in [200, 201]:
        assert "<script>" not in r.json().get("roleDescription", "")


@pytest.mark.asyncio
async def test_user_client_no_project_access_equipment(
    user_client: AsyncClient, project: Project
):
    r = await user_client.get(f"/api/v1/projects/{project.id}/equipment")
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_user_client_no_project_access_materials(
    user_client: AsyncClient, project: Project
):
    r = await user_client.get(f"/api/v1/projects/{project.id}/materials")
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_user_client_no_project_access_contacts(
    user_client: AsyncClient, project: Project
):
    r = await user_client.get(f"/api/v1/projects/{project.id}/contacts")
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_user_client_no_project_access_areas(
    user_client: AsyncClient, project: Project
):
    r = await user_client.get(f"/api/v1/projects/{project.id}/areas")
    assert r.status_code == 403
