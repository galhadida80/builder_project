import os
import uuid
from datetime import datetime, timedelta

os.environ["EMAIL_PROVIDER"] = "fake"

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.rfi import RFI, RFIResponse as RFIResponseModel, RFIEmailLog
from app.models.area import ConstructionArea
from app.models.approval import ApprovalRequest, ApprovalStep
from app.models.equipment import Equipment
from app.models.project import Project, ProjectMember
from app.models.user import User

API_V1 = "/api/v1"
FAKE_UUID = str(uuid.uuid4())


def rfi_url(project_id: str) -> str:
    return f"{API_V1}/projects/{project_id}/rfis"


def rfi_detail_url(rfi_id: str) -> str:
    return f"{API_V1}/rfis/{rfi_id}"


def area_url(project_id: str) -> str:
    return f"{API_V1}/projects/{project_id}/areas"


def area_detail_url(project_id: str, area_id: str) -> str:
    return f"{API_V1}/projects/{project_id}/areas/{area_id}"


def approval_url(project_id: str) -> str:
    return f"{API_V1}/projects/{project_id}/approvals"


def approval_detail_url(project_id: str, approval_id: str) -> str:
    return f"{API_V1}/projects/{project_id}/approvals/{approval_id}"


def valid_rfi_payload(**overrides) -> dict:
    base = {
        "subject": "Concrete Mix Design Clarification",
        "question": "What is the specified concrete mix ratio for the foundation?",
        "to_email": "engineer@example.com",
        "category": "structural",
        "priority": "high",
    }
    base.update(overrides)
    return base


def valid_area_payload(**overrides) -> dict:
    base = {
        "name": "Ground Floor Section A",
        "area_code": "GF-A",
        "floor_number": 0,
        "total_units": 12,
        "area_type": "residential",
    }
    base.update(overrides)
    return base


async def create_rfi_via_api(client: AsyncClient, project_id: str, payload: dict = None) -> dict:
    data = payload or valid_rfi_payload()
    resp = await client.post(rfi_url(project_id), json=data)
    assert resp.status_code == 201
    return resp.json()


async def create_area_via_api(client: AsyncClient, project_id: str, payload: dict = None) -> dict:
    data = payload or valid_area_payload()
    resp = await client.post(area_url(project_id), json=data)
    assert resp.status_code == 200
    return resp.json()


async def create_rfi_in_db(db: AsyncSession, project: Project, admin_user: User, **overrides) -> RFI:
    defaults = {
        "project_id": project.id,
        "rfi_number": f"RFI-{datetime.utcnow().year}-{uuid.uuid4().hex[:5]}",
        "subject": "DB Test RFI",
        "question": "A test question created directly in DB",
        "to_email": "test@example.com",
        "category": "structural",
        "priority": "high",
        "status": "draft",
        "created_by_id": admin_user.id,
    }
    defaults.update(overrides)
    rfi = RFI(**defaults)
    db.add(rfi)
    await db.commit()
    await db.refresh(rfi)
    return rfi


async def create_approval_in_db(
    db: AsyncSession, project: Project, admin_user: User, entity_type: str = "equipment"
) -> ApprovalRequest:
    entity_id = uuid.uuid4()
    if entity_type == "equipment":
        eq = Equipment(
            id=entity_id,
            project_id=project.id,
            name="Test Equipment",
            status="submitted",
        )
        db.add(eq)
        await db.flush()

    approval = ApprovalRequest(
        id=uuid.uuid4(),
        project_id=project.id,
        entity_type=entity_type,
        entity_id=entity_id,
        current_status="submitted",
        created_by_id=admin_user.id,
    )
    db.add(approval)
    await db.flush()

    step = ApprovalStep(
        id=uuid.uuid4(),
        approval_request_id=approval.id,
        step_order=1,
        approver_role="project_admin",
        status="pending",
    )
    db.add(step)
    await db.commit()
    await db.refresh(approval)
    return approval


# =====================================================================
# RFI CRUD Tests (~35 tests)
# =====================================================================

class TestRFICreate:

    @pytest.mark.asyncio
    async def test_create_rfi_success(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.post(rfi_url(str(project.id)), json=valid_rfi_payload())
        assert resp.status_code == 201
        data = resp.json()
        assert data["subject"] == "Concrete Mix Design Clarification"
        assert data["question"] == "What is the specified concrete mix ratio for the foundation?"
        assert data["to_email"] == "engineer@example.com"
        assert data["category"] == "structural"
        assert data["priority"] == "high"
        assert data["status"] == "draft"
        assert "id" in data
        assert "rfi_number" in data

    @pytest.mark.asyncio
    async def test_create_rfi_missing_subject(self, admin_client: AsyncClient, project: Project):
        payload = valid_rfi_payload()
        del payload["subject"]
        resp = await admin_client.post(rfi_url(str(project.id)), json=payload)
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_create_rfi_missing_question(self, admin_client: AsyncClient, project: Project):
        payload = valid_rfi_payload()
        del payload["question"]
        resp = await admin_client.post(rfi_url(str(project.id)), json=payload)
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_create_rfi_missing_to_email(self, admin_client: AsyncClient, project: Project):
        payload = valid_rfi_payload()
        del payload["to_email"]
        resp = await admin_client.post(rfi_url(str(project.id)), json=payload)
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_create_rfi_invalid_email(self, admin_client: AsyncClient, project: Project):
        payload = valid_rfi_payload(to_email="not-an-email")
        resp = await admin_client.post(rfi_url(str(project.id)), json=payload)
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_create_rfi_empty_subject(self, admin_client: AsyncClient, project: Project):
        payload = valid_rfi_payload(subject="")
        resp = await admin_client.post(rfi_url(str(project.id)), json=payload)
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_create_rfi_empty_question(self, admin_client: AsyncClient, project: Project):
        payload = valid_rfi_payload(question="")
        resp = await admin_client.post(rfi_url(str(project.id)), json=payload)
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_create_rfi_category_design(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.post(
            rfi_url(str(project.id)), json=valid_rfi_payload(category="design")
        )
        assert resp.status_code == 201
        assert resp.json()["category"] == "design"

    @pytest.mark.asyncio
    async def test_create_rfi_category_mep(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.post(
            rfi_url(str(project.id)), json=valid_rfi_payload(category="mep")
        )
        assert resp.status_code == 201
        assert resp.json()["category"] == "mep"

    @pytest.mark.asyncio
    async def test_create_rfi_category_architectural(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.post(
            rfi_url(str(project.id)), json=valid_rfi_payload(category="architectural")
        )
        assert resp.status_code == 201
        assert resp.json()["category"] == "architectural"

    @pytest.mark.asyncio
    async def test_create_rfi_category_specifications(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.post(
            rfi_url(str(project.id)), json=valid_rfi_payload(category="specifications")
        )
        assert resp.status_code == 201
        assert resp.json()["category"] == "specifications"

    @pytest.mark.asyncio
    async def test_create_rfi_category_schedule(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.post(
            rfi_url(str(project.id)), json=valid_rfi_payload(category="schedule")
        )
        assert resp.status_code == 201
        assert resp.json()["category"] == "schedule"

    @pytest.mark.asyncio
    async def test_create_rfi_category_cost(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.post(
            rfi_url(str(project.id)), json=valid_rfi_payload(category="cost")
        )
        assert resp.status_code == 201
        assert resp.json()["category"] == "cost"

    @pytest.mark.asyncio
    async def test_create_rfi_category_other(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.post(
            rfi_url(str(project.id)), json=valid_rfi_payload(category="other")
        )
        assert resp.status_code == 201
        assert resp.json()["category"] == "other"

    @pytest.mark.asyncio
    async def test_create_rfi_invalid_category_defaults_to_other(
        self, admin_client: AsyncClient, project: Project
    ):
        resp = await admin_client.post(
            rfi_url(str(project.id)), json=valid_rfi_payload(category="nonexistent")
        )
        assert resp.status_code == 201
        assert resp.json()["category"] == "other"

    @pytest.mark.asyncio
    async def test_create_rfi_priority_low(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.post(
            rfi_url(str(project.id)), json=valid_rfi_payload(priority="low")
        )
        assert resp.status_code == 201
        assert resp.json()["priority"] == "low"

    @pytest.mark.asyncio
    async def test_create_rfi_priority_medium(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.post(
            rfi_url(str(project.id)), json=valid_rfi_payload(priority="medium")
        )
        assert resp.status_code == 201
        assert resp.json()["priority"] == "medium"

    @pytest.mark.asyncio
    async def test_create_rfi_priority_urgent(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.post(
            rfi_url(str(project.id)), json=valid_rfi_payload(priority="urgent")
        )
        assert resp.status_code == 201
        assert resp.json()["priority"] == "urgent"

    @pytest.mark.asyncio
    async def test_create_rfi_invalid_priority_defaults_to_medium(
        self, admin_client: AsyncClient, project: Project
    ):
        resp = await admin_client.post(
            rfi_url(str(project.id)), json=valid_rfi_payload(priority="critical")
        )
        assert resp.status_code == 201
        assert resp.json()["priority"] == "medium"

    @pytest.mark.asyncio
    async def test_create_rfi_with_optional_fields(self, admin_client: AsyncClient, project: Project):
        payload = valid_rfi_payload(
            to_name="John Engineer",
            cc_emails=["pm@example.com", "arch@example.com"],
            due_date="2025-12-31T00:00:00",
            location="Building A, Floor 3",
            drawing_reference="DWG-001-REV-A",
        )
        resp = await admin_client.post(rfi_url(str(project.id)), json=payload)
        assert resp.status_code == 201
        data = resp.json()
        assert data["to_name"] == "John Engineer"
        assert data["location"] == "Building A, Floor 3"
        assert data["drawing_reference"] == "DWG-001-REV-A"

    @pytest.mark.asyncio
    async def test_create_rfi_with_cc_emails(self, admin_client: AsyncClient, project: Project):
        payload = valid_rfi_payload(cc_emails=["cc1@example.com", "cc2@example.com"])
        resp = await admin_client.post(rfi_url(str(project.id)), json=payload)
        assert resp.status_code == 201
        data = resp.json()
        assert len(data["cc_emails"]) == 2

    @pytest.mark.asyncio
    async def test_create_rfi_defaults_status_to_draft(
        self, admin_client: AsyncClient, project: Project
    ):
        resp = await admin_client.post(rfi_url(str(project.id)), json=valid_rfi_payload())
        assert resp.status_code == 201
        assert resp.json()["status"] == "draft"

    @pytest.mark.asyncio
    async def test_create_rfi_nonexistent_project(self, admin_client: AsyncClient):
        resp = await admin_client.post(rfi_url(FAKE_UUID), json=valid_rfi_payload())
        assert resp.status_code == 403


class TestRFIList:

    @pytest.mark.asyncio
    async def test_list_rfis_empty(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.get(rfi_url(str(project.id)))
        assert resp.status_code == 200
        data = resp.json()
        assert data["items"] == []
        assert data["total"] == 0

    @pytest.mark.asyncio
    async def test_list_rfis_with_data(self, admin_client: AsyncClient, project: Project):
        await create_rfi_via_api(admin_client, str(project.id))
        await create_rfi_via_api(
            admin_client, str(project.id),
            valid_rfi_payload(subject="Second RFI", question="Another question here")
        )
        resp = await admin_client.get(rfi_url(str(project.id)))
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 2
        assert len(data["items"]) == 2

    @pytest.mark.asyncio
    async def test_list_rfis_filter_by_status(self, admin_client: AsyncClient, project: Project):
        rfi_data = await create_rfi_via_api(admin_client, str(project.id))
        rfi_id = rfi_data["id"]
        await admin_client.patch(
            rfi_detail_url(rfi_id) + "/status",
            json={"status": "open"}
        )
        resp = await admin_client.get(rfi_url(str(project.id)) + "?status=open")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] >= 1
        for item in data["items"]:
            assert item["status"] == "open"

    @pytest.mark.asyncio
    async def test_list_rfis_filter_by_priority(self, admin_client: AsyncClient, project: Project):
        await create_rfi_via_api(
            admin_client, str(project.id), valid_rfi_payload(priority="urgent")
        )
        await create_rfi_via_api(
            admin_client, str(project.id),
            valid_rfi_payload(subject="Low RFI", question="Low priority question", priority="low")
        )
        resp = await admin_client.get(rfi_url(str(project.id)) + "?priority=urgent")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] >= 1
        for item in data["items"]:
            assert item["priority"] == "urgent"

    @pytest.mark.asyncio
    async def test_list_rfis_pagination(self, admin_client: AsyncClient, project: Project):
        for i in range(5):
            await create_rfi_via_api(
                admin_client, str(project.id),
                valid_rfi_payload(subject=f"RFI Number {i}", question=f"Question number {i} text")
            )
        resp = await admin_client.get(rfi_url(str(project.id)) + "?page=1&page_size=2")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["items"]) == 2
        assert data["total"] == 5
        assert data["total_pages"] == 3

    @pytest.mark.asyncio
    async def test_list_rfis_search(self, admin_client: AsyncClient, project: Project):
        await create_rfi_via_api(
            admin_client, str(project.id),
            valid_rfi_payload(subject="Plumbing Issue", question="Question about plumbing")
        )
        await create_rfi_via_api(
            admin_client, str(project.id),
            valid_rfi_payload(subject="Electrical Wiring", question="Question about electrical")
        )
        resp = await admin_client.get(rfi_url(str(project.id)) + "?search=Plumbing")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] >= 1


class TestRFIGetSingle:

    @pytest.mark.asyncio
    async def test_get_rfi_success(self, admin_client: AsyncClient, project: Project):
        created = await create_rfi_via_api(admin_client, str(project.id))
        resp = await admin_client.get(rfi_detail_url(created["id"]))
        assert resp.status_code == 200
        data = resp.json()
        assert data["id"] == created["id"]
        assert data["subject"] == "Concrete Mix Design Clarification"

    @pytest.mark.asyncio
    async def test_get_rfi_not_found(self, admin_client: AsyncClient):
        resp = await admin_client.get(rfi_detail_url(FAKE_UUID))
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_get_rfi_includes_responses_list(self, admin_client: AsyncClient, project: Project):
        created = await create_rfi_via_api(admin_client, str(project.id))
        resp = await admin_client.get(rfi_detail_url(created["id"]))
        assert resp.status_code == 200
        assert "responses" in resp.json()
        assert isinstance(resp.json()["responses"], list)


class TestRFIUpdate:

    @pytest.mark.asyncio
    async def test_update_rfi_subject(self, admin_client: AsyncClient, project: Project):
        created = await create_rfi_via_api(admin_client, str(project.id))
        resp = await admin_client.patch(
            rfi_detail_url(created["id"]),
            json={"subject": "Updated Subject Line"}
        )
        assert resp.status_code == 200
        assert resp.json()["subject"] == "Updated Subject Line"

    @pytest.mark.asyncio
    async def test_update_rfi_question(self, admin_client: AsyncClient, project: Project):
        created = await create_rfi_via_api(admin_client, str(project.id))
        resp = await admin_client.patch(
            rfi_detail_url(created["id"]),
            json={"question": "Updated question content here"}
        )
        assert resp.status_code == 200
        assert resp.json()["question"] == "Updated question content here"

    @pytest.mark.asyncio
    async def test_update_rfi_priority(self, admin_client: AsyncClient, project: Project):
        created = await create_rfi_via_api(admin_client, str(project.id))
        resp = await admin_client.patch(
            rfi_detail_url(created["id"]),
            json={"priority": "urgent"}
        )
        assert resp.status_code == 200
        assert resp.json()["priority"] == "urgent"

    @pytest.mark.asyncio
    async def test_update_rfi_category(self, admin_client: AsyncClient, project: Project):
        created = await create_rfi_via_api(admin_client, str(project.id))
        resp = await admin_client.patch(
            rfi_detail_url(created["id"]),
            json={"category": "mep"}
        )
        assert resp.status_code == 200
        assert resp.json()["category"] == "mep"

    @pytest.mark.asyncio
    async def test_update_rfi_multiple_fields(self, admin_client: AsyncClient, project: Project):
        created = await create_rfi_via_api(admin_client, str(project.id))
        resp = await admin_client.patch(
            rfi_detail_url(created["id"]),
            json={
                "subject": "Fully Updated RFI",
                "priority": "low",
                "location": "New Location",
            }
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["subject"] == "Fully Updated RFI"
        assert data["priority"] == "low"
        assert data["location"] == "New Location"

    @pytest.mark.asyncio
    async def test_update_rfi_not_found(self, admin_client: AsyncClient):
        resp = await admin_client.patch(
            rfi_detail_url(FAKE_UUID),
            json={"subject": "Does not exist"}
        )
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_update_rfi_to_email(self, admin_client: AsyncClient, project: Project):
        created = await create_rfi_via_api(admin_client, str(project.id))
        resp = await admin_client.patch(
            rfi_detail_url(created["id"]),
            json={"to_email": "new@example.com"}
        )
        assert resp.status_code == 200
        assert resp.json()["to_email"] == "new@example.com"


class TestRFIStatusChange:

    @pytest.mark.asyncio
    async def test_change_status_draft_to_open(self, admin_client: AsyncClient, project: Project):
        created = await create_rfi_via_api(admin_client, str(project.id))
        resp = await admin_client.patch(
            rfi_detail_url(created["id"]) + "/status",
            json={"status": "open"}
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "open"

    @pytest.mark.asyncio
    async def test_change_status_to_waiting_response(
        self, admin_client: AsyncClient, project: Project
    ):
        created = await create_rfi_via_api(admin_client, str(project.id))
        await admin_client.patch(
            rfi_detail_url(created["id"]) + "/status", json={"status": "open"}
        )
        resp = await admin_client.patch(
            rfi_detail_url(created["id"]) + "/status",
            json={"status": "waiting_response"}
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "waiting_response"

    @pytest.mark.asyncio
    async def test_change_status_to_answered(self, admin_client: AsyncClient, project: Project):
        created = await create_rfi_via_api(admin_client, str(project.id))
        resp = await admin_client.patch(
            rfi_detail_url(created["id"]) + "/status",
            json={"status": "answered"}
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "answered"

    @pytest.mark.asyncio
    async def test_change_status_to_closed_sets_closed_at(
        self, admin_client: AsyncClient, project: Project
    ):
        created = await create_rfi_via_api(admin_client, str(project.id))
        resp = await admin_client.patch(
            rfi_detail_url(created["id"]) + "/status",
            json={"status": "closed"}
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "closed"
        assert resp.json()["closed_at"] is not None

    @pytest.mark.asyncio
    async def test_change_status_to_cancelled(self, admin_client: AsyncClient, project: Project):
        created = await create_rfi_via_api(admin_client, str(project.id))
        resp = await admin_client.patch(
            rfi_detail_url(created["id"]) + "/status",
            json={"status": "cancelled"}
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "cancelled"

    @pytest.mark.asyncio
    async def test_change_status_invalid_value(self, admin_client: AsyncClient, project: Project):
        created = await create_rfi_via_api(admin_client, str(project.id))
        resp = await admin_client.patch(
            rfi_detail_url(created["id"]) + "/status",
            json={"status": "invalid_status"}
        )
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_change_status_rfi_not_found(self, admin_client: AsyncClient):
        resp = await admin_client.patch(
            rfi_detail_url(FAKE_UUID) + "/status",
            json={"status": "open"}
        )
        assert resp.status_code == 404


class TestRFINumberAutoGeneration:

    @pytest.mark.asyncio
    async def test_rfi_number_generated_on_create(
        self, admin_client: AsyncClient, project: Project
    ):
        created = await create_rfi_via_api(admin_client, str(project.id))
        assert "rfi_number" in created
        assert created["rfi_number"].startswith("RFI-")

    @pytest.mark.asyncio
    async def test_rfi_numbers_are_unique(self, admin_client: AsyncClient, project: Project):
        rfi1 = await create_rfi_via_api(admin_client, str(project.id))
        rfi2 = await create_rfi_via_api(
            admin_client, str(project.id),
            valid_rfi_payload(subject="Second RFI", question="Second question here")
        )
        assert rfi1["rfi_number"] != rfi2["rfi_number"]

    @pytest.mark.asyncio
    async def test_rfi_number_format(self, admin_client: AsyncClient, project: Project):
        created = await create_rfi_via_api(admin_client, str(project.id))
        year = datetime.utcnow().year
        assert created["rfi_number"].startswith(f"RFI-{year}-")

    @pytest.mark.asyncio
    async def test_rfi_number_sequential(self, admin_client: AsyncClient, project: Project):
        rfi1 = await create_rfi_via_api(admin_client, str(project.id))
        rfi2 = await create_rfi_via_api(
            admin_client, str(project.id),
            valid_rfi_payload(subject="Sequential RFI", question="Another question text")
        )
        num1 = int(rfi1["rfi_number"].split("-")[-1])
        num2 = int(rfi2["rfi_number"].split("-")[-1])
        assert num2 == num1 + 1


class TestRFIDelete:

    @pytest.mark.asyncio
    async def test_delete_draft_rfi(self, admin_client: AsyncClient, project: Project):
        created = await create_rfi_via_api(admin_client, str(project.id))
        resp = await admin_client.delete(rfi_detail_url(created["id"]))
        assert resp.status_code == 204

    @pytest.mark.asyncio
    async def test_delete_non_draft_rfi_fails(self, admin_client: AsyncClient, project: Project):
        created = await create_rfi_via_api(admin_client, str(project.id))
        await admin_client.patch(
            rfi_detail_url(created["id"]) + "/status", json={"status": "open"}
        )
        resp = await admin_client.delete(rfi_detail_url(created["id"]))
        assert resp.status_code == 400

    @pytest.mark.asyncio
    async def test_delete_rfi_not_found(self, admin_client: AsyncClient):
        resp = await admin_client.delete(rfi_detail_url(FAKE_UUID))
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_delete_cancelled_rfi_succeeds(self, admin_client: AsyncClient, project: Project):
        created = await create_rfi_via_api(admin_client, str(project.id))
        await admin_client.patch(
            rfi_detail_url(created["id"]) + "/status", json={"status": "cancelled"}
        )
        resp = await admin_client.delete(rfi_detail_url(created["id"]))
        assert resp.status_code == 204


# =====================================================================
# RFI Responses & Communication Tests (~15 tests)
# =====================================================================

class TestRFIResponses:

    @pytest.mark.asyncio
    async def test_add_response_success(self, admin_client: AsyncClient, project: Project):
        created = await create_rfi_via_api(admin_client, str(project.id))
        resp = await admin_client.post(
            rfi_detail_url(created["id"]) + "/responses?send_email=false",
            json={"response_text": "The concrete mix is C30/37 as per spec."}
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["response_text"] == "The concrete mix is C30/37 as per spec."
        assert data["source"] == "crm"

    @pytest.mark.asyncio
    async def test_add_response_empty_text_fails(self, admin_client: AsyncClient, project: Project):
        created = await create_rfi_via_api(admin_client, str(project.id))
        resp = await admin_client.post(
            rfi_detail_url(created["id"]) + "/responses?send_email=false",
            json={"response_text": ""}
        )
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_add_response_missing_text_fails(
        self, admin_client: AsyncClient, project: Project
    ):
        created = await create_rfi_via_api(admin_client, str(project.id))
        resp = await admin_client.post(
            rfi_detail_url(created["id"]) + "/responses?send_email=false",
            json={}
        )
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_add_response_rfi_not_found(self, admin_client: AsyncClient):
        resp = await admin_client.post(
            rfi_detail_url(FAKE_UUID) + "/responses?send_email=false",
            json={"response_text": "Response to non-existent RFI"}
        )
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_add_response_with_attachments(
        self, admin_client: AsyncClient, project: Project
    ):
        created = await create_rfi_via_api(admin_client, str(project.id))
        resp = await admin_client.post(
            rfi_detail_url(created["id"]) + "/responses?send_email=false",
            json={
                "response_text": "Please see attached document.",
                "attachments": [{"filename": "spec.pdf", "url": "https://example.com/spec.pdf"}],
            }
        )
        assert resp.status_code == 201

    @pytest.mark.asyncio
    async def test_list_responses_empty(self, admin_client: AsyncClient, project: Project):
        created = await create_rfi_via_api(admin_client, str(project.id))
        resp = await admin_client.get(rfi_detail_url(created["id"]) + "/responses")
        assert resp.status_code == 200
        assert resp.json() == []

    @pytest.mark.asyncio
    async def test_list_responses_with_data(self, admin_client: AsyncClient, project: Project):
        created = await create_rfi_via_api(admin_client, str(project.id))
        rfi_id = created["id"]
        await admin_client.post(
            rfi_detail_url(rfi_id) + "/responses?send_email=false",
            json={"response_text": "First response"}
        )
        await admin_client.post(
            rfi_detail_url(rfi_id) + "/responses?send_email=false",
            json={"response_text": "Second response"}
        )
        resp = await admin_client.get(rfi_detail_url(rfi_id) + "/responses")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 2

    @pytest.mark.asyncio
    async def test_list_responses_rfi_not_found(self, admin_client: AsyncClient):
        resp = await admin_client.get(rfi_detail_url(FAKE_UUID) + "/responses")
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_response_is_marked_internal(self, admin_client: AsyncClient, project: Project):
        created = await create_rfi_via_api(admin_client, str(project.id))
        resp = await admin_client.post(
            rfi_detail_url(created["id"]) + "/responses?send_email=false",
            json={"response_text": "Internal note about the RFI"}
        )
        assert resp.status_code == 201
        assert resp.json()["is_internal"] is True

    @pytest.mark.asyncio
    async def test_response_from_email_is_user_email(
        self, admin_client: AsyncClient, project: Project
    ):
        created = await create_rfi_via_api(admin_client, str(project.id))
        resp = await admin_client.post(
            rfi_detail_url(created["id"]) + "/responses?send_email=false",
            json={"response_text": "Check from_email field"}
        )
        assert resp.status_code == 201
        assert resp.json()["from_email"] == "admin@test.com"

    @pytest.mark.asyncio
    async def test_multiple_responses_ordered(self, admin_client: AsyncClient, project: Project):
        created = await create_rfi_via_api(admin_client, str(project.id))
        rfi_id = created["id"]
        for i in range(3):
            await admin_client.post(
                rfi_detail_url(rfi_id) + "/responses?send_email=false",
                json={"response_text": f"Response number {i}"}
            )
        resp = await admin_client.get(rfi_detail_url(rfi_id) + "/responses")
        assert resp.status_code == 200
        assert len(resp.json()) == 3


class TestRFIEmailLog:

    @pytest.mark.asyncio
    async def test_email_log_empty(self, admin_client: AsyncClient, project: Project):
        created = await create_rfi_via_api(admin_client, str(project.id))
        resp = await admin_client.get(rfi_detail_url(created["id"]) + "/email-log")
        assert resp.status_code == 200
        assert resp.json() == []

    @pytest.mark.asyncio
    async def test_email_log_rfi_not_found(self, admin_client: AsyncClient):
        resp = await admin_client.get(rfi_detail_url(FAKE_UUID) + "/email-log")
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_email_log_with_entries(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession
    ):
        created = await create_rfi_via_api(admin_client, str(project.id))
        log = RFIEmailLog(
            id=uuid.uuid4(),
            rfi_id=uuid.UUID(created["id"]),
            event_type="sent",
            from_email="system@example.com",
            to_email="engineer@example.com",
            subject="RFI Sent",
        )
        db.add(log)
        await db.commit()
        resp = await admin_client.get(rfi_detail_url(created["id"]) + "/email-log")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["event_type"] == "sent"

    @pytest.mark.asyncio
    async def test_email_log_multiple_entries(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession
    ):
        created = await create_rfi_via_api(admin_client, str(project.id))
        rfi_id = uuid.UUID(created["id"])
        for event in ["sent", "received", "response_sent"]:
            log = RFIEmailLog(
                id=uuid.uuid4(),
                rfi_id=rfi_id,
                event_type=event,
                from_email="system@example.com",
                to_email="engineer@example.com",
            )
            db.add(log)
        await db.commit()
        resp = await admin_client.get(rfi_detail_url(created["id"]) + "/email-log")
        assert resp.status_code == 200
        assert len(resp.json()) == 3


# =====================================================================
# Approval Tests (~15 tests)
# =====================================================================

class TestApprovalList:

    @pytest.mark.asyncio
    async def test_list_approvals_empty(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.get(approval_url(str(project.id)))
        assert resp.status_code == 200
        assert resp.json() == []

    @pytest.mark.asyncio
    async def test_list_approvals_with_data(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        await create_approval_in_db(db, project, admin_user)
        resp = await admin_client.get(approval_url(str(project.id)))
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["entityType"] == "equipment"
        assert data[0]["currentStatus"] == "submitted"

    @pytest.mark.asyncio
    async def test_list_approvals_multiple(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        await create_approval_in_db(db, project, admin_user, "equipment")
        await create_approval_in_db(db, project, admin_user, "equipment")
        resp = await admin_client.get(approval_url(str(project.id)))
        assert resp.status_code == 200
        assert len(resp.json()) == 2

    @pytest.mark.asyncio
    async def test_list_approvals_nonexistent_project(self, admin_client: AsyncClient):
        resp = await admin_client.get(approval_url(FAKE_UUID))
        assert resp.status_code == 403


class TestApprovalGetSingle:

    @pytest.mark.asyncio
    async def test_get_approval_success(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        approval = await create_approval_in_db(db, project, admin_user)
        resp = await admin_client.get(approval_detail_url(str(project.id), str(approval.id)))
        assert resp.status_code == 200
        data = resp.json()
        assert data["id"] == str(approval.id)
        assert data["entityType"] == "equipment"

    @pytest.mark.asyncio
    async def test_get_approval_not_found(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.get(approval_detail_url(str(project.id), FAKE_UUID))
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_get_approval_includes_steps(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        approval = await create_approval_in_db(db, project, admin_user)
        resp = await admin_client.get(approval_detail_url(str(project.id), str(approval.id)))
        assert resp.status_code == 200
        data = resp.json()
        assert "steps" in data
        assert len(data["steps"]) >= 1

    @pytest.mark.asyncio
    async def test_get_approval_wrong_project(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        approval = await create_approval_in_db(db, project, admin_user)
        other_proj_id = str(uuid.uuid4())
        resp = await admin_client.get(approval_detail_url(other_proj_id, str(approval.id)))
        assert resp.status_code == 403


class TestApprovalFlatList:

    @pytest.mark.asyncio
    async def test_flat_list_approvals(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        await create_approval_in_db(db, project, admin_user)
        resp = await admin_client.get(f"{API_V1}/approvals")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) >= 1

    @pytest.mark.asyncio
    async def test_flat_list_empty(self, admin_client: AsyncClient):
        resp = await admin_client.get(f"{API_V1}/approvals")
        assert resp.status_code == 200
        assert resp.json() == []

    @pytest.mark.asyncio
    async def test_flat_list_only_accessible_projects(
        self, user_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        await create_approval_in_db(db, project, admin_user)
        resp = await user_client.get(f"{API_V1}/approvals")
        assert resp.status_code == 200
        assert len(resp.json()) == 0


class TestApprovalActions:

    @pytest.mark.asyncio
    async def test_approve_request(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        approval = await create_approval_in_db(db, project, admin_user)
        resp = await admin_client.post(
            f"{API_V1}/approvals/{approval.id}/approve",
            json={"comments": "Looks good"}
        )
        assert resp.status_code == 200
        assert resp.json()["currentStatus"] == "approved"

    @pytest.mark.asyncio
    async def test_reject_request(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        approval = await create_approval_in_db(db, project, admin_user)
        resp = await admin_client.post(
            f"{API_V1}/approvals/{approval.id}/reject",
            json={"comments": "Needs revision"}
        )
        assert resp.status_code == 200
        assert resp.json()["currentStatus"] == "rejected"

    @pytest.mark.asyncio
    async def test_approve_not_found(self, admin_client: AsyncClient):
        resp = await admin_client.post(
            f"{API_V1}/approvals/{FAKE_UUID}/approve",
            json={"comments": "test"}
        )
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_reject_not_found(self, admin_client: AsyncClient):
        resp = await admin_client.post(
            f"{API_V1}/approvals/{FAKE_UUID}/reject",
            json={"comments": "test"}
        )
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_approve_already_approved_fails(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        approval = await create_approval_in_db(db, project, admin_user)
        await admin_client.post(
            f"{API_V1}/approvals/{approval.id}/approve",
            json={"comments": "First approval"}
        )
        resp = await admin_client.post(
            f"{API_V1}/approvals/{approval.id}/approve",
            json={"comments": "Second approval attempt"}
        )
        assert resp.status_code == 400


# =====================================================================
# Area Tests (~15 tests)
# =====================================================================

class TestAreaCreate:

    @pytest.mark.asyncio
    async def test_create_area_success(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.post(area_url(str(project.id)), json=valid_area_payload())
        assert resp.status_code == 200
        data = resp.json()
        assert data["name"] == "Ground Floor Section A"
        assert data["areaCode"] == "GF-A"
        assert data["floorNumber"] == 0
        assert data["totalUnits"] == 12

    @pytest.mark.asyncio
    async def test_create_area_missing_name(self, admin_client: AsyncClient, project: Project):
        payload = valid_area_payload()
        del payload["name"]
        resp = await admin_client.post(area_url(str(project.id)), json=payload)
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_create_area_empty_name(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.post(
            area_url(str(project.id)), json=valid_area_payload(name="")
        )
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_create_area_negative_floor(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.post(
            area_url(str(project.id)), json=valid_area_payload(floor_number=-1)
        )
        assert resp.status_code == 200
        assert resp.json()["floorNumber"] == -1

    @pytest.mark.asyncio
    async def test_create_area_minimal_fields(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.post(
            area_url(str(project.id)), json={"name": "Minimal Area"}
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["name"] == "Minimal Area"
        assert data["totalUnits"] == 1

    @pytest.mark.asyncio
    async def test_create_area_with_parent(
        self, admin_client: AsyncClient, project: Project
    ):
        parent = await create_area_via_api(admin_client, str(project.id))
        child_payload = valid_area_payload(
            name="Sub Area B", area_code="GF-B", parent_id=parent["id"]
        )
        resp = await admin_client.post(area_url(str(project.id)), json=child_payload)
        assert resp.status_code == 200
        assert resp.json()["parentId"] == parent["id"]

    @pytest.mark.asyncio
    async def test_create_area_high_floor_number(
        self, admin_client: AsyncClient, project: Project
    ):
        resp = await admin_client.post(
            area_url(str(project.id)), json=valid_area_payload(floor_number=50)
        )
        assert resp.status_code == 200
        assert resp.json()["floorNumber"] == 50

    @pytest.mark.asyncio
    async def test_create_area_floor_number_too_high(
        self, admin_client: AsyncClient, project: Project
    ):
        resp = await admin_client.post(
            area_url(str(project.id)), json=valid_area_payload(floor_number=1000)
        )
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_create_area_nonexistent_project(self, admin_client: AsyncClient):
        resp = await admin_client.post(area_url(FAKE_UUID), json=valid_area_payload())
        assert resp.status_code == 403


class TestAreaList:

    @pytest.mark.asyncio
    async def test_list_areas_empty(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.get(area_url(str(project.id)))
        assert resp.status_code == 200
        assert resp.json() == []

    @pytest.mark.asyncio
    async def test_list_areas_with_data(self, admin_client: AsyncClient, project: Project):
        await create_area_via_api(admin_client, str(project.id))
        await create_area_via_api(
            admin_client, str(project.id),
            valid_area_payload(name="Second Area", area_code="GF-B")
        )
        resp = await admin_client.get(area_url(str(project.id)))
        assert resp.status_code == 200
        assert len(resp.json()) == 2

    @pytest.mark.asyncio
    async def test_list_areas_ordered_by_name(self, admin_client: AsyncClient, project: Project):
        await create_area_via_api(
            admin_client, str(project.id),
            valid_area_payload(name="Zebra Zone", area_code="ZZ-1")
        )
        await create_area_via_api(
            admin_client, str(project.id),
            valid_area_payload(name="Alpha Zone", area_code="AZ-1")
        )
        resp = await admin_client.get(area_url(str(project.id)))
        assert resp.status_code == 200
        data = resp.json()
        assert data[0]["name"] == "Alpha Zone"
        assert data[1]["name"] == "Zebra Zone"


class TestAreaGetSingle:

    @pytest.mark.asyncio
    async def test_get_area_success(self, admin_client: AsyncClient, project: Project):
        created = await create_area_via_api(admin_client, str(project.id))
        resp = await admin_client.get(
            area_detail_url(str(project.id), created["id"])
        )
        assert resp.status_code == 200
        assert resp.json()["id"] == created["id"]

    @pytest.mark.asyncio
    async def test_get_area_not_found(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.get(area_detail_url(str(project.id), FAKE_UUID))
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_get_area_includes_children(self, admin_client: AsyncClient, project: Project):
        created = await create_area_via_api(admin_client, str(project.id))
        resp = await admin_client.get(area_detail_url(str(project.id), created["id"]))
        assert resp.status_code == 200
        assert "children" in resp.json()


class TestAreaUpdate:

    @pytest.mark.asyncio
    async def test_update_area_name(self, admin_client: AsyncClient, project: Project):
        created = await create_area_via_api(admin_client, str(project.id))
        resp = await admin_client.put(
            area_detail_url(str(project.id), created["id"]),
            json={"name": "Updated Area Name"}
        )
        assert resp.status_code == 200
        assert resp.json()["name"] == "Updated Area Name"

    @pytest.mark.asyncio
    async def test_update_area_floor_number(self, admin_client: AsyncClient, project: Project):
        created = await create_area_via_api(admin_client, str(project.id))
        resp = await admin_client.put(
            area_detail_url(str(project.id), created["id"]),
            json={"floor_number": 5}
        )
        assert resp.status_code == 200
        assert resp.json()["floorNumber"] == 5

    @pytest.mark.asyncio
    async def test_update_area_total_units(self, admin_client: AsyncClient, project: Project):
        created = await create_area_via_api(admin_client, str(project.id))
        resp = await admin_client.put(
            area_detail_url(str(project.id), created["id"]),
            json={"total_units": 24}
        )
        assert resp.status_code == 200
        assert resp.json()["totalUnits"] == 24

    @pytest.mark.asyncio
    async def test_update_area_not_found(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.put(
            area_detail_url(str(project.id), FAKE_UUID),
            json={"name": "Does not exist"}
        )
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_update_area_multiple_fields(self, admin_client: AsyncClient, project: Project):
        created = await create_area_via_api(admin_client, str(project.id))
        resp = await admin_client.put(
            area_detail_url(str(project.id), created["id"]),
            json={"name": "Full Update", "floor_number": 10, "total_units": 50}
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["name"] == "Full Update"
        assert data["floorNumber"] == 10
        assert data["totalUnits"] == 50


class TestAreaDelete:

    @pytest.mark.asyncio
    async def test_delete_area_success(self, admin_client: AsyncClient, project: Project):
        created = await create_area_via_api(admin_client, str(project.id))
        resp = await admin_client.delete(area_detail_url(str(project.id), created["id"]))
        assert resp.status_code == 200
        get_resp = await admin_client.get(area_detail_url(str(project.id), created["id"]))
        assert get_resp.status_code == 404

    @pytest.mark.asyncio
    async def test_delete_area_not_found(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.delete(area_detail_url(str(project.id), FAKE_UUID))
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_delete_area_idempotent(self, admin_client: AsyncClient, project: Project):
        created = await create_area_via_api(admin_client, str(project.id))
        await admin_client.delete(area_detail_url(str(project.id), created["id"]))
        resp = await admin_client.delete(area_detail_url(str(project.id), created["id"]))
        assert resp.status_code == 404


# =====================================================================
# Security & Access Control Tests (~10 tests)
# =====================================================================

class TestSecurityUnauthenticated:

    @pytest.mark.asyncio
    async def test_unauthenticated_rfi_list(self, client: AsyncClient, project: Project):
        resp = await client.get(rfi_url(str(project.id)))
        assert resp.status_code in (401, 403)

    @pytest.mark.asyncio
    async def test_unauthenticated_rfi_create(self, client: AsyncClient, project: Project):
        resp = await client.post(rfi_url(str(project.id)), json=valid_rfi_payload())
        assert resp.status_code in (401, 403)

    @pytest.mark.asyncio
    async def test_unauthenticated_area_list(self, client: AsyncClient, project: Project):
        resp = await client.get(area_url(str(project.id)))
        assert resp.status_code in (401, 403)

    @pytest.mark.asyncio
    async def test_unauthenticated_area_create(self, client: AsyncClient, project: Project):
        resp = await client.post(area_url(str(project.id)), json=valid_area_payload())
        assert resp.status_code in (401, 403)

    @pytest.mark.asyncio
    async def test_unauthenticated_approval_list(self, client: AsyncClient, project: Project):
        resp = await client.get(approval_url(str(project.id)))
        assert resp.status_code in (401, 403)


class TestCrossProjectIsolation:

    @pytest.mark.asyncio
    async def test_area_cross_project_forbidden(
        self, user_client: AsyncClient, project: Project
    ):
        resp = await user_client.get(area_url(str(project.id)))
        assert resp.status_code == 403

    @pytest.mark.asyncio
    async def test_area_create_cross_project_forbidden(
        self, user_client: AsyncClient, project: Project
    ):
        resp = await user_client.post(area_url(str(project.id)), json=valid_area_payload())
        assert resp.status_code == 403

    @pytest.mark.asyncio
    async def test_approval_cross_project_forbidden(
        self, user_client: AsyncClient, project: Project
    ):
        resp = await user_client.get(approval_url(str(project.id)))
        assert resp.status_code == 403

    @pytest.mark.asyncio
    async def test_rfi_create_cross_project_forbidden(
        self, user_client: AsyncClient, project: Project
    ):
        resp = await user_client.post(rfi_url(str(project.id)), json=valid_rfi_payload())
        assert resp.status_code == 403

    @pytest.mark.asyncio
    async def test_rfi_list_cross_project_forbidden(
        self, user_client: AsyncClient, project: Project
    ):
        resp = await user_client.get(rfi_url(str(project.id)))
        assert resp.status_code == 403

    @pytest.mark.asyncio
    async def test_rfi_detail_idor_prevention(
        self, user_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        rfi = await create_rfi_in_db(db, project, admin_user)
        resp = await user_client.get(rfi_detail_url(str(rfi.id)))
        assert resp.status_code == 403

    @pytest.mark.asyncio
    async def test_approval_detail_cross_project_forbidden(
        self, user_client: AsyncClient,
        project: Project, db: AsyncSession, admin_user: User
    ):
        approval = await create_approval_in_db(db, project, admin_user)
        resp = await user_client.get(approval_detail_url(str(project.id), str(approval.id)))
        assert resp.status_code == 403

    @pytest.mark.asyncio
    async def test_rfi_status_change_cross_project_forbidden(
        self, user_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        rfi = await create_rfi_in_db(db, project, admin_user)
        resp = await user_client.patch(
            rfi_detail_url(str(rfi.id)) + "/status",
            json={"status": "open"}
        )
        assert resp.status_code == 403

    @pytest.mark.asyncio
    async def test_area_detail_cross_project_forbidden(
        self, user_client: AsyncClient, project: Project, db: AsyncSession
    ):
        area = ConstructionArea(
            project_id=project.id,
            name="Restricted Area",
        )
        db.add(area)
        await db.commit()
        await db.refresh(area)
        resp = await user_client.get(area_detail_url(str(project.id), str(area.id)))
        assert resp.status_code == 403

    @pytest.mark.asyncio
    async def test_area_delete_cross_project_forbidden(
        self, user_client: AsyncClient, project: Project, db: AsyncSession
    ):
        area = ConstructionArea(
            project_id=project.id,
            name="Protected Area",
        )
        db.add(area)
        await db.commit()
        await db.refresh(area)
        resp = await user_client.delete(area_detail_url(str(project.id), str(area.id)))
        assert resp.status_code == 403
