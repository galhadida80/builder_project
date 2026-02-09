import uuid
from datetime import datetime, timedelta

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.rfi import RFI, RFIStatus, RFIPriority, RFICategory
from app.models.user import User
from app.models.project import Project, ProjectMember


API_V1 = "/api/v1"
FAKE_PROJECT_ID = str(uuid.uuid4())
FAKE_RFI_ID = str(uuid.uuid4())


def rfis_url(project_id: str) -> str:
    return f"{API_V1}/projects/{project_id}/rfis"


def rfi_detail_url(rfi_id: str) -> str:
    return f"{API_V1}/rfis/{rfi_id}"


def rfi_status_url(rfi_id: str) -> str:
    return f"{API_V1}/rfis/{rfi_id}/status"


def rfi_send_url(rfi_id: str) -> str:
    return f"{API_V1}/rfis/{rfi_id}/send"


def rfi_responses_url(rfi_id: str) -> str:
    return f"{API_V1}/rfis/{rfi_id}/responses"


def rfi_email_log_url(rfi_id: str) -> str:
    return f"{API_V1}/rfis/{rfi_id}/email-log"


def rfi_delete_url(rfi_id: str) -> str:
    return f"{API_V1}/rfis/{rfi_id}"


def rfi_summary_url(project_id: str) -> str:
    return f"{API_V1}/projects/{project_id}/rfis/summary"


def valid_rfi_payload(**overrides) -> dict:
    base = {
        "subject": "Concrete mix specification clarification",
        "question": "What is the required concrete mix ratio for the foundation?",
        "to_email": "engineer@example.com",
        "category": "structural",
        "priority": "high",
    }
    base.update(overrides)
    return base


async def create_rfi_via_api(client: AsyncClient, project_id: str, payload: dict = None) -> dict:
    data = payload or valid_rfi_payload()
    resp = await client.post(rfis_url(project_id), json=data)
    assert resp.status_code == 201, f"Expected 201, got {resp.status_code}: {resp.text}"
    return resp.json()


async def create_rfi_in_db(db: AsyncSession, project: Project, user: User, **overrides) -> RFI:
    rfi = RFI(
        id=uuid.uuid4(),
        project_id=project.id,
        rfi_number=f"RFI-2025-{uuid.uuid4().hex[:5]}",
        subject=overrides.get("subject", "Test RFI subject"),
        question=overrides.get("question", "Test RFI question?"),
        to_email=overrides.get("to_email", "engineer@example.com"),
        category=overrides.get("category", "structural"),
        priority=overrides.get("priority", "high"),
        status=overrides.get("status", "draft"),
        created_by_id=user.id,
    )
    db.add(rfi)
    await db.commit()
    await db.refresh(rfi)
    return rfi


async def create_second_project(db: AsyncSession, user: User) -> Project:
    proj = Project(
        id=uuid.uuid4(),
        name="Second Project",
        code="PROJ-002",
        description="Another project",
        status="active",
        created_by_id=user.id,
    )
    db.add(proj)
    await db.flush()
    member = ProjectMember(
        project_id=proj.id,
        user_id=user.id,
        role="project_admin",
    )
    db.add(member)
    await db.commit()
    await db.refresh(proj)
    return proj


class TestCreateRFI:

    async def test_create_rfi_success(self, admin_client: AsyncClient, project: Project):
        data = await create_rfi_via_api(admin_client, str(project.id))
        assert data["subject"] == "Concrete mix specification clarification"
        assert data["question"] == "What is the required concrete mix ratio for the foundation?"
        assert data["status"] == "draft"
        assert data["category"] == "structural"
        assert data["priority"] == "high"
        assert "id" in data
        assert "rfi_number" in data
        assert data["project_id"] == str(project.id)

    async def test_create_rfi_with_all_fields(self, admin_client: AsyncClient, project: Project):
        payload = valid_rfi_payload(
            to_name="John Engineer",
            cc_emails=["cc1@example.com", "cc2@example.com"],
            due_date="2025-12-31T00:00:00",
            location="Building A, Floor 3",
            drawing_reference="DWG-001-REV-A",
            specification_reference="SPEC-CONCRETE-001",
            attachments=[{"filename": "plan.pdf", "url": "https://example.com/plan.pdf"}],
        )
        data = await create_rfi_via_api(admin_client, str(project.id), payload)
        assert data["to_name"] == "John Engineer"
        assert data["location"] == "Building A, Floor 3"
        assert data["drawing_reference"] == "DWG-001-REV-A"
        assert data["specification_reference"] == "SPEC-CONCRETE-001"

    async def test_create_rfi_default_category_and_priority(self, admin_client: AsyncClient, project: Project):
        payload = {
            "subject": "General question",
            "question": "What is the timeline for phase 2?",
            "to_email": "pm@example.com",
        }
        data = await create_rfi_via_api(admin_client, str(project.id), payload)
        assert data["category"] == "other"
        assert data["priority"] == "medium"

    async def test_create_rfi_missing_subject(self, admin_client: AsyncClient, project: Project):
        payload = {
            "question": "Some question",
            "to_email": "test@example.com",
        }
        resp = await admin_client.post(rfis_url(str(project.id)), json=payload)
        assert resp.status_code == 422

    async def test_create_rfi_missing_question(self, admin_client: AsyncClient, project: Project):
        payload = {
            "subject": "Some subject",
            "to_email": "test@example.com",
        }
        resp = await admin_client.post(rfis_url(str(project.id)), json=payload)
        assert resp.status_code == 422

    async def test_create_rfi_missing_to_email(self, admin_client: AsyncClient, project: Project):
        payload = {
            "subject": "Some subject",
            "question": "Some question",
        }
        resp = await admin_client.post(rfis_url(str(project.id)), json=payload)
        assert resp.status_code == 422

    async def test_create_rfi_invalid_email(self, admin_client: AsyncClient, project: Project):
        payload = valid_rfi_payload(to_email="not-an-email")
        resp = await admin_client.post(rfis_url(str(project.id)), json=payload)
        assert resp.status_code == 422

    async def test_create_rfi_empty_subject(self, admin_client: AsyncClient, project: Project):
        payload = valid_rfi_payload(subject="")
        resp = await admin_client.post(rfis_url(str(project.id)), json=payload)
        assert resp.status_code == 422

    async def test_create_rfi_short_subject(self, admin_client: AsyncClient, project: Project):
        payload = valid_rfi_payload(subject="A")
        resp = await admin_client.post(rfis_url(str(project.id)), json=payload)
        assert resp.status_code == 422

    async def test_create_rfi_empty_question(self, admin_client: AsyncClient, project: Project):
        payload = valid_rfi_payload(question="")
        resp = await admin_client.post(rfis_url(str(project.id)), json=payload)
        assert resp.status_code == 422

    async def test_create_rfi_invalid_category_defaults_to_other(self, admin_client: AsyncClient, project: Project):
        payload = valid_rfi_payload(category="nonexistent_category")
        data = await create_rfi_via_api(admin_client, str(project.id), payload)
        assert data["category"] == "other"

    async def test_create_rfi_invalid_priority_defaults_to_medium(self, admin_client: AsyncClient, project: Project):
        payload = valid_rfi_payload(priority="super_urgent")
        data = await create_rfi_via_api(admin_client, str(project.id), payload)
        assert data["priority"] == "medium"

    async def test_create_rfi_category_case_insensitive(self, admin_client: AsyncClient, project: Project):
        payload = valid_rfi_payload(category="STRUCTURAL")
        data = await create_rfi_via_api(admin_client, str(project.id), payload)
        assert data["category"] == "structural"

    async def test_create_rfi_priority_case_insensitive(self, admin_client: AsyncClient, project: Project):
        payload = valid_rfi_payload(priority="HIGH")
        data = await create_rfi_via_api(admin_client, str(project.id), payload)
        assert data["priority"] == "high"

    async def test_create_rfi_no_project_access(self, user_client: AsyncClient):
        payload = valid_rfi_payload()
        resp = await user_client.post(rfis_url(FAKE_PROJECT_ID), json=payload)
        assert resp.status_code == 403

    async def test_create_rfi_nonexistent_project(self, admin_client: AsyncClient):
        payload = valid_rfi_payload()
        resp = await admin_client.post(rfis_url(FAKE_PROJECT_ID), json=payload)
        assert resp.status_code == 403

    async def test_create_rfi_unauthenticated(self, client: AsyncClient, project: Project):
        payload = valid_rfi_payload()
        resp = await client.post(rfis_url(str(project.id)), json=payload)
        assert resp.status_code == 401

    async def test_create_rfi_generates_rfi_number(self, admin_client: AsyncClient, project: Project):
        data = await create_rfi_via_api(admin_client, str(project.id))
        assert data["rfi_number"].startswith("RFI-")
        assert len(data["rfi_number"]) > 4

    async def test_create_rfi_sequential_numbers(self, admin_client: AsyncClient, project: Project):
        data1 = await create_rfi_via_api(admin_client, str(project.id))
        data2 = await create_rfi_via_api(admin_client, str(project.id))
        assert data1["rfi_number"] != data2["rfi_number"]

    async def test_create_rfi_xss_in_subject_sanitized(self, admin_client: AsyncClient, project: Project):
        payload = valid_rfi_payload(subject='<script>alert("xss")</script>Safe Subject')
        data = await create_rfi_via_api(admin_client, str(project.id), payload)
        assert "<script>" not in data["subject"]
        assert "Safe Subject" in data["subject"]

    async def test_create_rfi_xss_in_question_sanitized(self, admin_client: AsyncClient, project: Project):
        payload = valid_rfi_payload(question='<script>alert("xss")</script>Safe Question')
        data = await create_rfi_via_api(admin_client, str(project.id), payload)
        assert "<script>" not in data["question"]


class TestCreateRFICategories:

    @pytest.mark.parametrize("category", [
        "design", "structural", "mep", "architectural",
        "specifications", "schedule", "cost", "other",
    ])
    async def test_create_rfi_valid_category(self, admin_client: AsyncClient, project: Project, category: str):
        payload = valid_rfi_payload(category=category)
        data = await create_rfi_via_api(admin_client, str(project.id), payload)
        assert data["category"] == category


class TestCreateRFIPriorities:

    @pytest.mark.parametrize("priority", ["low", "medium", "high", "urgent"])
    async def test_create_rfi_valid_priority(self, admin_client: AsyncClient, project: Project, priority: str):
        payload = valid_rfi_payload(priority=priority)
        data = await create_rfi_via_api(admin_client, str(project.id), payload)
        assert data["priority"] == priority


class TestGetRFI:

    async def test_get_rfi_success(self, admin_client: AsyncClient, project: Project):
        created = await create_rfi_via_api(admin_client, str(project.id))
        resp = await admin_client.get(rfi_detail_url(created["id"]))
        assert resp.status_code == 200
        data = resp.json()
        assert data["id"] == created["id"]
        assert data["subject"] == created["subject"]

    async def test_get_rfi_not_found(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.get(rfi_detail_url(FAKE_RFI_ID))
        assert resp.status_code == 404

    async def test_get_rfi_includes_responses_list(self, admin_client: AsyncClient, project: Project):
        created = await create_rfi_via_api(admin_client, str(project.id))
        resp = await admin_client.get(rfi_detail_url(created["id"]))
        data = resp.json()
        assert "responses" in data
        assert isinstance(data["responses"], list)

    async def test_get_rfi_includes_created_by(self, admin_client: AsyncClient, project: Project):
        created = await create_rfi_via_api(admin_client, str(project.id))
        resp = await admin_client.get(rfi_detail_url(created["id"]))
        data = resp.json()
        assert data["created_by"] is not None
        assert "email" in data["created_by"]

    async def test_get_rfi_unauthenticated(
        self, client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        rfi = await create_rfi_in_db(db, project, admin_user)
        resp = await client.get(rfi_detail_url(str(rfi.id)))
        assert resp.status_code == 401

    async def test_get_rfi_returns_all_fields(self, admin_client: AsyncClient, project: Project):
        payload = valid_rfi_payload(
            to_name="Jane Doe",
            location="Site B",
            drawing_reference="DWG-002",
            specification_reference="SPEC-002",
        )
        created = await create_rfi_via_api(admin_client, str(project.id), payload)
        resp = await admin_client.get(rfi_detail_url(created["id"]))
        data = resp.json()
        assert data["to_name"] == "Jane Doe"
        assert data["location"] == "Site B"
        assert data["drawing_reference"] == "DWG-002"
        assert data["specification_reference"] == "SPEC-002"
        assert "created_at" in data
        assert "updated_at" in data


class TestListRFIs:

    async def test_list_rfis_empty(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.get(rfis_url(str(project.id)))
        assert resp.status_code == 200
        data = resp.json()
        assert data["items"] == []
        assert data["total"] == 0

    async def test_list_rfis_returns_created(self, admin_client: AsyncClient, project: Project):
        await create_rfi_via_api(admin_client, str(project.id))
        await create_rfi_via_api(admin_client, str(project.id), valid_rfi_payload(subject="Second RFI question"))
        resp = await admin_client.get(rfis_url(str(project.id)))
        data = resp.json()
        assert data["total"] == 2
        assert len(data["items"]) == 2

    async def test_list_rfis_pagination(self, admin_client: AsyncClient, project: Project):
        for i in range(5):
            await create_rfi_via_api(
                admin_client, str(project.id),
                valid_rfi_payload(subject=f"RFI number {i + 1} question")
            )
        resp = await admin_client.get(rfis_url(str(project.id)), params={"page": 1, "page_size": 2})
        data = resp.json()
        assert data["total"] == 5
        assert len(data["items"]) == 2
        assert data["page"] == 1
        assert data["page_size"] == 2
        assert data["total_pages"] == 3

    async def test_list_rfis_page_2(self, admin_client: AsyncClient, project: Project):
        for i in range(5):
            await create_rfi_via_api(
                admin_client, str(project.id),
                valid_rfi_payload(subject=f"RFI batch item {i + 1}")
            )
        resp = await admin_client.get(rfis_url(str(project.id)), params={"page": 2, "page_size": 2})
        data = resp.json()
        assert len(data["items"]) == 2
        assert data["page"] == 2

    async def test_list_rfis_filter_by_status(self, admin_client: AsyncClient, project: Project):
        created = await create_rfi_via_api(admin_client, str(project.id))
        resp = await admin_client.get(rfis_url(str(project.id)), params={"status": "draft"})
        data = resp.json()
        assert data["total"] >= 1
        for item in data["items"]:
            assert item["status"] == "draft"

    async def test_list_rfis_filter_by_priority(self, admin_client: AsyncClient, project: Project):
        await create_rfi_via_api(admin_client, str(project.id), valid_rfi_payload(priority="urgent"))
        await create_rfi_via_api(admin_client, str(project.id), valid_rfi_payload(priority="low", subject="Low priority RFI"))
        resp = await admin_client.get(rfis_url(str(project.id)), params={"priority": "urgent"})
        data = resp.json()
        assert data["total"] >= 1
        for item in data["items"]:
            assert item["priority"] == "urgent"

    async def test_list_rfis_filter_no_results(self, admin_client: AsyncClient, project: Project):
        await create_rfi_via_api(admin_client, str(project.id))
        resp = await admin_client.get(rfis_url(str(project.id)), params={"status": "closed"})
        data = resp.json()
        assert data["total"] == 0

    async def test_list_rfis_search_by_subject(self, admin_client: AsyncClient, project: Project):
        await create_rfi_via_api(admin_client, str(project.id), valid_rfi_payload(subject="Unique steel beam question"))
        await create_rfi_via_api(admin_client, str(project.id), valid_rfi_payload(subject="Regular concrete question"))
        resp = await admin_client.get(rfis_url(str(project.id)), params={"search": "steel beam"})
        data = resp.json()
        assert data["total"] >= 1

    async def test_list_rfis_project_scoping(self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User):
        await create_rfi_via_api(admin_client, str(project.id))
        proj2 = await create_second_project(db, admin_user)
        await create_rfi_via_api(admin_client, str(proj2.id), valid_rfi_payload(subject="Different project RFI"))
        resp1 = await admin_client.get(rfis_url(str(project.id)))
        resp2 = await admin_client.get(rfis_url(str(proj2.id)))
        data1 = resp1.json()
        data2 = resp2.json()
        assert data1["total"] == 1
        assert data2["total"] == 1

    async def test_list_rfis_no_access(self, user_client: AsyncClient):
        resp = await user_client.get(rfis_url(FAKE_PROJECT_ID))
        assert resp.status_code == 403

    async def test_list_rfis_unauthenticated(self, client: AsyncClient, project: Project):
        resp = await client.get(rfis_url(str(project.id)))
        assert resp.status_code == 401

    async def test_list_rfis_response_count_field(self, admin_client: AsyncClient, project: Project):
        created = await create_rfi_via_api(admin_client, str(project.id))
        resp = await admin_client.get(rfis_url(str(project.id)))
        data = resp.json()
        assert data["items"][0]["response_count"] == 0

    async def test_list_rfis_contains_expected_fields(self, admin_client: AsyncClient, project: Project):
        await create_rfi_via_api(admin_client, str(project.id))
        resp = await admin_client.get(rfis_url(str(project.id)))
        item = resp.json()["items"][0]
        expected_fields = ["id", "project_id", "rfi_number", "subject", "to_email", "category", "priority", "status", "created_at"]
        for field in expected_fields:
            assert field in item, f"Missing field: {field}"


class TestUpdateRFI:

    async def test_update_rfi_subject(self, admin_client: AsyncClient, project: Project):
        created = await create_rfi_via_api(admin_client, str(project.id))
        resp = await admin_client.patch(rfi_detail_url(created["id"]), json={"subject": "Updated subject text"})
        assert resp.status_code == 200
        assert resp.json()["subject"] == "Updated subject text"

    async def test_update_rfi_question(self, admin_client: AsyncClient, project: Project):
        created = await create_rfi_via_api(admin_client, str(project.id))
        resp = await admin_client.patch(rfi_detail_url(created["id"]), json={"question": "Updated question text"})
        assert resp.status_code == 200
        assert resp.json()["question"] == "Updated question text"

    async def test_update_rfi_priority(self, admin_client: AsyncClient, project: Project):
        created = await create_rfi_via_api(admin_client, str(project.id))
        resp = await admin_client.patch(rfi_detail_url(created["id"]), json={"priority": "urgent"})
        assert resp.status_code == 200
        assert resp.json()["priority"] == "urgent"

    async def test_update_rfi_category(self, admin_client: AsyncClient, project: Project):
        created = await create_rfi_via_api(admin_client, str(project.id))
        resp = await admin_client.patch(rfi_detail_url(created["id"]), json={"category": "mep"})
        assert resp.status_code == 200
        assert resp.json()["category"] == "mep"

    async def test_update_rfi_to_email(self, admin_client: AsyncClient, project: Project):
        created = await create_rfi_via_api(admin_client, str(project.id))
        resp = await admin_client.patch(rfi_detail_url(created["id"]), json={"to_email": "new@example.com"})
        assert resp.status_code == 200
        assert resp.json()["to_email"] == "new@example.com"

    async def test_update_rfi_location(self, admin_client: AsyncClient, project: Project):
        created = await create_rfi_via_api(admin_client, str(project.id))
        resp = await admin_client.patch(rfi_detail_url(created["id"]), json={"location": "Floor 5"})
        assert resp.status_code == 200
        assert resp.json()["location"] == "Floor 5"

    async def test_update_rfi_multiple_fields(self, admin_client: AsyncClient, project: Project):
        created = await create_rfi_via_api(admin_client, str(project.id))
        update = {"subject": "Multi update subject", "priority": "low", "location": "Basement"}
        resp = await admin_client.patch(rfi_detail_url(created["id"]), json=update)
        assert resp.status_code == 200
        data = resp.json()
        assert data["subject"] == "Multi update subject"
        assert data["priority"] == "low"
        assert data["location"] == "Basement"

    async def test_update_rfi_not_found(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.patch(rfi_detail_url(FAKE_RFI_ID), json={"subject": "Nope"})
        assert resp.status_code == 404

    async def test_update_rfi_unauthenticated(
        self, client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        rfi = await create_rfi_in_db(db, project, admin_user)
        resp = await client.patch(rfi_detail_url(str(rfi.id)), json={"subject": "Nope"})
        assert resp.status_code == 401

    async def test_update_rfi_partial_update_preserves_other_fields(self, admin_client: AsyncClient, project: Project):
        created = await create_rfi_via_api(admin_client, str(project.id))
        original_question = created["question"]
        resp = await admin_client.patch(rfi_detail_url(created["id"]), json={"subject": "Only subject changed"})
        data = resp.json()
        assert data["subject"] == "Only subject changed"
        assert data["question"] == original_question

    async def test_update_rfi_drawing_reference(self, admin_client: AsyncClient, project: Project):
        created = await create_rfi_via_api(admin_client, str(project.id))
        resp = await admin_client.patch(rfi_detail_url(created["id"]), json={"drawing_reference": "DWG-UPDATED"})
        assert resp.status_code == 200
        assert resp.json()["drawing_reference"] == "DWG-UPDATED"

    async def test_update_rfi_specification_reference(self, admin_client: AsyncClient, project: Project):
        created = await create_rfi_via_api(admin_client, str(project.id))
        resp = await admin_client.patch(rfi_detail_url(created["id"]), json={"specification_reference": "SPEC-UPD"})
        assert resp.status_code == 200
        assert resp.json()["specification_reference"] == "SPEC-UPD"

    async def test_update_rfi_cc_emails(self, admin_client: AsyncClient, project: Project):
        created = await create_rfi_via_api(admin_client, str(project.id))
        resp = await admin_client.patch(rfi_detail_url(created["id"]), json={"cc_emails": ["cc@example.com"]})
        assert resp.status_code == 200

    async def test_update_rfi_due_date(self, admin_client: AsyncClient, project: Project):
        created = await create_rfi_via_api(admin_client, str(project.id))
        resp = await admin_client.patch(rfi_detail_url(created["id"]), json={"due_date": "2025-06-15T00:00:00"})
        assert resp.status_code == 200
        assert resp.json()["due_date"] is not None


class TestDeleteRFI:

    async def test_delete_draft_rfi(self, admin_client: AsyncClient, project: Project):
        created = await create_rfi_via_api(admin_client, str(project.id))
        assert created["status"] == "draft"
        resp = await admin_client.delete(rfi_delete_url(created["id"]))
        assert resp.status_code == 204

    async def test_delete_rfi_not_found(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.delete(rfi_delete_url(FAKE_RFI_ID))
        assert resp.status_code == 404

    async def test_delete_rfi_confirms_removal(self, admin_client: AsyncClient, project: Project):
        created = await create_rfi_via_api(admin_client, str(project.id))
        await admin_client.delete(rfi_delete_url(created["id"]))
        resp = await admin_client.get(rfi_detail_url(created["id"]))
        assert resp.status_code == 404

    async def test_delete_non_draft_rfi_rejected(self, admin_client: AsyncClient, project: Project):
        created = await create_rfi_via_api(admin_client, str(project.id))
        await admin_client.patch(
            rfi_status_url(created["id"]),
            json={"status": "open"}
        )
        resp = await admin_client.delete(rfi_delete_url(created["id"]))
        assert resp.status_code == 400

    async def test_delete_rfi_unauthenticated(
        self, client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        rfi = await create_rfi_in_db(db, project, admin_user)
        resp = await client.delete(rfi_delete_url(str(rfi.id)))
        assert resp.status_code == 401

    async def test_delete_cancelled_rfi_allowed(self, admin_client: AsyncClient, project: Project):
        created = await create_rfi_via_api(admin_client, str(project.id))
        await admin_client.patch(rfi_status_url(created["id"]), json={"status": "cancelled"})
        resp = await admin_client.delete(rfi_delete_url(created["id"]))
        assert resp.status_code == 204

    async def test_delete_open_rfi_rejected(self, admin_client: AsyncClient, project: Project):
        created = await create_rfi_via_api(admin_client, str(project.id))
        await admin_client.patch(rfi_status_url(created["id"]), json={"status": "open"})
        resp = await admin_client.delete(rfi_delete_url(created["id"]))
        assert resp.status_code == 400
        assert "draft or cancelled" in resp.json()["detail"].lower()


class TestRFIStatusTransitions:

    async def test_status_draft_to_open(self, admin_client: AsyncClient, project: Project):
        created = await create_rfi_via_api(admin_client, str(project.id))
        resp = await admin_client.patch(rfi_status_url(created["id"]), json={"status": "open"})
        assert resp.status_code == 200
        assert resp.json()["status"] == "open"

    async def test_status_open_to_waiting_response(self, admin_client: AsyncClient, project: Project):
        created = await create_rfi_via_api(admin_client, str(project.id))
        await admin_client.patch(rfi_status_url(created["id"]), json={"status": "open"})
        resp = await admin_client.patch(rfi_status_url(created["id"]), json={"status": "waiting_response"})
        assert resp.status_code == 200
        assert resp.json()["status"] == "waiting_response"

    async def test_status_waiting_response_to_answered(self, admin_client: AsyncClient, project: Project):
        created = await create_rfi_via_api(admin_client, str(project.id))
        await admin_client.patch(rfi_status_url(created["id"]), json={"status": "open"})
        await admin_client.patch(rfi_status_url(created["id"]), json={"status": "waiting_response"})
        resp = await admin_client.patch(rfi_status_url(created["id"]), json={"status": "answered"})
        assert resp.status_code == 200
        assert resp.json()["status"] == "answered"

    async def test_status_answered_to_closed(self, admin_client: AsyncClient, project: Project):
        created = await create_rfi_via_api(admin_client, str(project.id))
        await admin_client.patch(rfi_status_url(created["id"]), json={"status": "open"})
        await admin_client.patch(rfi_status_url(created["id"]), json={"status": "answered"})
        resp = await admin_client.patch(rfi_status_url(created["id"]), json={"status": "closed"})
        assert resp.status_code == 200
        assert resp.json()["status"] == "closed"
        assert resp.json()["closed_at"] is not None

    async def test_status_to_cancelled(self, admin_client: AsyncClient, project: Project):
        created = await create_rfi_via_api(admin_client, str(project.id))
        resp = await admin_client.patch(rfi_status_url(created["id"]), json={"status": "cancelled"})
        assert resp.status_code == 200
        assert resp.json()["status"] == "cancelled"

    async def test_status_invalid_value(self, admin_client: AsyncClient, project: Project):
        created = await create_rfi_via_api(admin_client, str(project.id))
        resp = await admin_client.patch(rfi_status_url(created["id"]), json={"status": "invalid_status"})
        assert resp.status_code == 422

    async def test_status_empty_value(self, admin_client: AsyncClient, project: Project):
        created = await create_rfi_via_api(admin_client, str(project.id))
        resp = await admin_client.patch(rfi_status_url(created["id"]), json={"status": ""})
        assert resp.status_code == 422

    async def test_status_update_not_found(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.patch(rfi_status_url(FAKE_RFI_ID), json={"status": "open"})
        assert resp.status_code == 404

    async def test_status_unauthenticated(
        self, client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        rfi = await create_rfi_in_db(db, project, admin_user)
        resp = await client.patch(rfi_status_url(str(rfi.id)), json={"status": "open"})
        assert resp.status_code == 401

    @pytest.mark.parametrize("status", ["draft", "open", "waiting_response", "answered", "closed", "cancelled"])
    async def test_all_valid_status_values(self, admin_client: AsyncClient, project: Project, status: str):
        created = await create_rfi_via_api(admin_client, str(project.id))
        resp = await admin_client.patch(rfi_status_url(created["id"]), json={"status": status})
        assert resp.status_code == 200
        assert resp.json()["status"] == status

    async def test_closed_at_set_when_closed(self, admin_client: AsyncClient, project: Project):
        created = await create_rfi_via_api(admin_client, str(project.id))
        resp = await admin_client.patch(rfi_status_url(created["id"]), json={"status": "closed"})
        assert resp.status_code == 200
        assert resp.json()["closed_at"] is not None

    async def test_closed_at_not_set_for_other_statuses(self, admin_client: AsyncClient, project: Project):
        created = await create_rfi_via_api(admin_client, str(project.id))
        resp = await admin_client.patch(rfi_status_url(created["id"]), json={"status": "open"})
        assert resp.json()["closed_at"] is None


class TestRFISendFunctionality:

    async def test_send_rfi_not_found(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.post(rfi_send_url(FAKE_RFI_ID))
        assert resp.status_code == 404

    async def test_send_rfi_unauthenticated(
        self, client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        rfi = await create_rfi_in_db(db, project, admin_user)
        resp = await client.post(rfi_send_url(str(rfi.id)))
        assert resp.status_code == 401


class TestRFIResponses:

    async def test_add_response_to_rfi(self, admin_client: AsyncClient, project: Project):
        created = await create_rfi_via_api(admin_client, str(project.id))
        await admin_client.patch(rfi_status_url(created["id"]), json={"status": "open"})
        resp = await admin_client.post(
            rfi_responses_url(created["id"]),
            json={"response_text": "The concrete mix ratio is 1:2:4."},
            params={"send_email": False},
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["response_text"] == "The concrete mix ratio is 1:2:4."
        assert data["is_internal"] is True
        assert data["source"] == "crm"

    async def test_add_response_rfi_not_found(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.post(
            rfi_responses_url(FAKE_RFI_ID),
            json={"response_text": "Some answer."},
            params={"send_email": False},
        )
        assert resp.status_code == 404

    async def test_add_response_empty_text(self, admin_client: AsyncClient, project: Project):
        created = await create_rfi_via_api(admin_client, str(project.id))
        resp = await admin_client.post(
            rfi_responses_url(created["id"]),
            json={"response_text": ""},
            params={"send_email": False},
        )
        assert resp.status_code == 422

    async def test_get_responses_for_rfi(self, admin_client: AsyncClient, project: Project):
        created = await create_rfi_via_api(admin_client, str(project.id))
        await admin_client.post(
            rfi_responses_url(created["id"]),
            json={"response_text": "First answer."},
            params={"send_email": False},
        )
        await admin_client.post(
            rfi_responses_url(created["id"]),
            json={"response_text": "Second answer."},
            params={"send_email": False},
        )
        resp = await admin_client.get(rfi_responses_url(created["id"]))
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 2

    async def test_get_responses_not_found(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.get(rfi_responses_url(FAKE_RFI_ID))
        assert resp.status_code == 404

    async def test_add_response_unauthenticated(
        self, client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        rfi = await create_rfi_in_db(db, project, admin_user)
        resp = await client.post(
            rfi_responses_url(str(rfi.id)),
            json={"response_text": "Nope."},
            params={"send_email": False},
        )
        assert resp.status_code == 401

    async def test_add_response_with_attachments(self, admin_client: AsyncClient, project: Project):
        created = await create_rfi_via_api(admin_client, str(project.id))
        resp = await admin_client.post(
            rfi_responses_url(created["id"]),
            json={
                "response_text": "See attached drawings.",
                "attachments": [{"filename": "drawing.pdf", "url": "https://example.com/drawing.pdf"}],
            },
            params={"send_email": False},
        )
        assert resp.status_code == 201

    async def test_response_includes_from_email(self, admin_client: AsyncClient, project: Project):
        created = await create_rfi_via_api(admin_client, str(project.id))
        resp = await admin_client.post(
            rfi_responses_url(created["id"]),
            json={"response_text": "Response text here."},
            params={"send_email": False},
        )
        data = resp.json()
        assert "from_email" in data
        assert data["from_email"] == "admin@test.com"


class TestRFIEmailLog:

    async def test_get_email_log_empty(self, admin_client: AsyncClient, project: Project):
        created = await create_rfi_via_api(admin_client, str(project.id))
        resp = await admin_client.get(rfi_email_log_url(created["id"]))
        assert resp.status_code == 200
        assert resp.json() == []

    async def test_get_email_log_not_found(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.get(rfi_email_log_url(FAKE_RFI_ID))
        assert resp.status_code == 404

    async def test_get_email_log_unauthenticated(
        self, client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        rfi = await create_rfi_in_db(db, project, admin_user)
        resp = await client.get(rfi_email_log_url(str(rfi.id)))
        assert resp.status_code == 401


class TestRFISummary:

    async def test_summary_empty_project(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.get(rfi_summary_url(str(project.id)))
        assert resp.status_code == 200
        data = resp.json()
        assert data["total_rfis"] == 0
        assert data["draft_count"] == 0
        assert data["open_count"] == 0

    async def test_summary_counts_statuses(self, admin_client: AsyncClient, project: Project):
        rfi1 = await create_rfi_via_api(admin_client, str(project.id))
        rfi2 = await create_rfi_via_api(admin_client, str(project.id), valid_rfi_payload(subject="Second RFI inquiry"))
        await admin_client.patch(rfi_status_url(rfi2["id"]), json={"status": "open"})
        resp = await admin_client.get(rfi_summary_url(str(project.id)))
        data = resp.json()
        assert data["total_rfis"] == 2
        assert data["draft_count"] == 1
        assert data["open_count"] == 1

    async def test_summary_by_priority(self, admin_client: AsyncClient, project: Project):
        await create_rfi_via_api(admin_client, str(project.id), valid_rfi_payload(priority="high"))
        await create_rfi_via_api(admin_client, str(project.id), valid_rfi_payload(priority="low", subject="Low priority RFI item"))
        resp = await admin_client.get(rfi_summary_url(str(project.id)))
        data = resp.json()
        assert "by_priority" in data
        assert data["by_priority"].get("high", 0) >= 1
        assert data["by_priority"].get("low", 0) >= 1

    async def test_summary_by_category(self, admin_client: AsyncClient, project: Project):
        await create_rfi_via_api(admin_client, str(project.id), valid_rfi_payload(category="structural"))
        await create_rfi_via_api(admin_client, str(project.id), valid_rfi_payload(category="mep", subject="MEP category RFI"))
        resp = await admin_client.get(rfi_summary_url(str(project.id)))
        data = resp.json()
        assert "by_category" in data
        assert data["by_category"].get("structural", 0) >= 1
        assert data["by_category"].get("mep", 0) >= 1

    async def test_summary_no_access(self, user_client: AsyncClient):
        resp = await user_client.get(rfi_summary_url(FAKE_PROJECT_ID))
        assert resp.status_code == 403

    async def test_summary_unauthenticated(self, client: AsyncClient, project: Project):
        resp = await client.get(rfi_summary_url(str(project.id)))
        assert resp.status_code == 401


class TestRFIProjectScoping:

    async def test_rfis_isolated_between_projects(self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User):
        await create_rfi_via_api(admin_client, str(project.id))
        proj2 = await create_second_project(db, admin_user)
        await create_rfi_via_api(admin_client, str(proj2.id), valid_rfi_payload(subject="Project 2 RFI entry"))
        resp1 = await admin_client.get(rfis_url(str(project.id)))
        resp2 = await admin_client.get(rfis_url(str(proj2.id)))
        assert resp1.json()["total"] == 1
        assert resp2.json()["total"] == 1

    async def test_rfi_belongs_to_correct_project(self, admin_client: AsyncClient, project: Project):
        created = await create_rfi_via_api(admin_client, str(project.id))
        assert created["project_id"] == str(project.id)

    async def test_cannot_list_rfis_from_other_project(
        self, user_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        await create_rfi_in_db(db, project, admin_user)
        resp = await user_client.get(rfis_url(str(project.id)))
        assert resp.status_code == 403


class TestRFIEdgeCases:

    async def test_create_rfi_very_long_subject(self, admin_client: AsyncClient, project: Project):
        payload = valid_rfi_payload(subject="A" * 501)
        resp = await admin_client.post(rfis_url(str(project.id)), json=payload)
        assert resp.status_code == 422

    async def test_create_rfi_max_length_subject(self, admin_client: AsyncClient, project: Project):
        payload = valid_rfi_payload(subject="A" * 500)
        data = await create_rfi_via_api(admin_client, str(project.id), payload)
        assert len(data["subject"]) == 500

    async def test_create_rfi_unicode_subject(self, admin_client: AsyncClient, project: Project):
        payload = valid_rfi_payload(subject="Concrete specification question")
        data = await create_rfi_via_api(admin_client, str(project.id), payload)
        assert data["subject"] == "Concrete specification question"

    async def test_create_rfi_hebrew_subject(self, admin_client: AsyncClient, project: Project):
        payload = valid_rfi_payload(subject="בירור מפרט בטון")
        data = await create_rfi_via_api(admin_client, str(project.id), payload)
        assert data["subject"] == "בירור מפרט בטון"

    async def test_create_rfi_with_null_optional_fields(self, admin_client: AsyncClient, project: Project):
        payload = valid_rfi_payload(
            to_name=None,
            location=None,
            drawing_reference=None,
            specification_reference=None,
            due_date=None,
        )
        data = await create_rfi_via_api(admin_client, str(project.id), payload)
        assert data["to_name"] is None
        assert data["location"] is None

    async def test_create_rfi_invalid_uuid_project(self, admin_client: AsyncClient):
        payload = valid_rfi_payload()
        resp = await admin_client.post(f"{API_V1}/projects/not-a-uuid/rfis", json=payload)
        assert resp.status_code == 422

    async def test_create_multiple_rfis_same_project(self, admin_client: AsyncClient, project: Project):
        for i in range(10):
            await create_rfi_via_api(
                admin_client, str(project.id),
                valid_rfi_payload(subject=f"Batch RFI number {i + 1}")
            )
        resp = await admin_client.get(rfis_url(str(project.id)))
        assert resp.json()["total"] == 10

    async def test_update_nonexistent_rfi(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.patch(rfi_detail_url(str(uuid.uuid4())), json={"subject": "Nope"})
        assert resp.status_code == 404

    async def test_get_rfi_with_invalid_uuid(self, admin_client: AsyncClient):
        resp = await admin_client.get(f"{API_V1}/rfis/not-a-uuid")
        assert resp.status_code == 422

    async def test_list_rfis_page_beyond_range(self, admin_client: AsyncClient, project: Project):
        await create_rfi_via_api(admin_client, str(project.id))
        resp = await admin_client.get(rfis_url(str(project.id)), params={"page": 999, "page_size": 10})
        data = resp.json()
        assert data["items"] == []
        assert data["total"] == 1

    async def test_list_rfis_page_size_1(self, admin_client: AsyncClient, project: Project):
        await create_rfi_via_api(admin_client, str(project.id))
        await create_rfi_via_api(admin_client, str(project.id), valid_rfi_payload(subject="Second entry in list"))
        resp = await admin_client.get(rfis_url(str(project.id)), params={"page": 1, "page_size": 1})
        data = resp.json()
        assert len(data["items"]) == 1
        assert data["total"] == 2
        assert data["total_pages"] == 2

    async def test_create_rfi_cc_emails_list(self, admin_client: AsyncClient, project: Project):
        payload = valid_rfi_payload(cc_emails=["a@example.com", "b@example.com", "c@example.com"])
        data = await create_rfi_via_api(admin_client, str(project.id), payload)
        assert data["id"] is not None

    async def test_create_rfi_empty_cc_emails(self, admin_client: AsyncClient, project: Project):
        payload = valid_rfi_payload(cc_emails=[])
        data = await create_rfi_via_api(admin_client, str(project.id), payload)
        assert data["id"] is not None

    async def test_create_rfi_with_attachments_list(self, admin_client: AsyncClient, project: Project):
        payload = valid_rfi_payload(
            attachments=[
                {"filename": "plan.pdf", "size": 1024},
                {"filename": "spec.docx", "size": 2048},
            ]
        )
        data = await create_rfi_via_api(admin_client, str(project.id), payload)
        assert data["id"] is not None

    async def test_create_rfi_empty_attachments(self, admin_client: AsyncClient, project: Project):
        payload = valid_rfi_payload(attachments=[])
        data = await create_rfi_via_api(admin_client, str(project.id), payload)
        assert data["id"] is not None

    async def test_rfi_to_email_stored_lowercase(self, admin_client: AsyncClient, project: Project):
        payload = valid_rfi_payload(to_email="UPPER@EXAMPLE.COM")
        data = await create_rfi_via_api(admin_client, str(project.id), payload)
        assert data["to_email"] == "upper@example.com"

    async def test_rfi_status_case_insensitive(self, admin_client: AsyncClient, project: Project):
        created = await create_rfi_via_api(admin_client, str(project.id))
        resp = await admin_client.patch(rfi_status_url(created["id"]), json={"status": "OPEN"})
        assert resp.status_code == 200
        assert resp.json()["status"] == "open"

    async def test_rfi_category_case_insensitive_on_create(self, admin_client: AsyncClient, project: Project):
        payload = valid_rfi_payload(category="MEP")
        data = await create_rfi_via_api(admin_client, str(project.id), payload)
        assert data["category"] == "mep"

    async def test_rfi_preserves_question_field_not_description(self, admin_client: AsyncClient, project: Project):
        payload = valid_rfi_payload(question="This is the question field, not description")
        data = await create_rfi_via_api(admin_client, str(project.id), payload)
        assert data["question"] == "This is the question field, not description"
        assert "description" not in data or data.get("description") is None


class TestRFIAccessControl:

    async def test_admin_can_create_rfi(self, admin_client: AsyncClient, project: Project):
        data = await create_rfi_via_api(admin_client, str(project.id))
        assert data["id"] is not None

    async def test_unauthenticated_cannot_create_rfi(self, client: AsyncClient, project: Project):
        resp = await client.post(rfis_url(str(project.id)), json=valid_rfi_payload())
        assert resp.status_code == 401

    async def test_unauthenticated_cannot_list_rfis(self, client: AsyncClient, project: Project):
        resp = await client.get(rfis_url(str(project.id)))
        assert resp.status_code == 401

    async def test_unauthenticated_cannot_get_rfi(
        self, client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        rfi = await create_rfi_in_db(db, project, admin_user)
        resp = await client.get(rfi_detail_url(str(rfi.id)))
        assert resp.status_code == 401

    async def test_unauthenticated_cannot_update_rfi(
        self, client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        rfi = await create_rfi_in_db(db, project, admin_user)
        resp = await client.patch(rfi_detail_url(str(rfi.id)), json={"subject": "Nope"})
        assert resp.status_code == 401

    async def test_unauthenticated_cannot_delete_rfi(
        self, client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        rfi = await create_rfi_in_db(db, project, admin_user)
        resp = await client.delete(rfi_delete_url(str(rfi.id)))
        assert resp.status_code == 401

    async def test_non_member_cannot_create_rfi(self, user_client: AsyncClient, project: Project):
        resp = await user_client.post(rfis_url(str(project.id)), json=valid_rfi_payload())
        assert resp.status_code == 403

    async def test_non_member_cannot_list_rfis(self, user_client: AsyncClient, project: Project):
        resp = await user_client.get(rfis_url(str(project.id)))
        assert resp.status_code == 403

    async def test_member_can_access_rfis(
        self, user_client: AsyncClient,
        project: Project, db: AsyncSession, regular_user: User, admin_user: User
    ):
        member = ProjectMember(
            project_id=project.id,
            user_id=regular_user.id,
            role="member",
        )
        db.add(member)
        await db.commit()
        await create_rfi_in_db(db, project, admin_user)
        resp = await user_client.get(rfis_url(str(project.id)))
        assert resp.status_code == 200

    async def test_member_can_create_rfi(
        self, user_client: AsyncClient,
        project: Project, db: AsyncSession, regular_user: User
    ):
        member = ProjectMember(
            project_id=project.id,
            user_id=regular_user.id,
            role="member",
        )
        db.add(member)
        await db.commit()
        resp = await user_client.post(rfis_url(str(project.id)), json=valid_rfi_payload())
        assert resp.status_code == 201

    async def test_non_member_cannot_get_rfi(
        self, user_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        rfi = await create_rfi_in_db(db, project, admin_user)
        resp = await user_client.get(rfi_detail_url(str(rfi.id)))
        assert resp.status_code == 403

    async def test_non_member_cannot_update_rfi(
        self, user_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        rfi = await create_rfi_in_db(db, project, admin_user)
        resp = await user_client.patch(rfi_detail_url(str(rfi.id)), json={"subject": "Nope"})
        assert resp.status_code == 403

    async def test_non_member_cannot_delete_rfi(
        self, user_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        rfi = await create_rfi_in_db(db, project, admin_user)
        resp = await user_client.delete(rfi_delete_url(str(rfi.id)))
        assert resp.status_code == 403

    async def test_non_member_cannot_update_rfi_status(
        self, user_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        rfi = await create_rfi_in_db(db, project, admin_user)
        resp = await user_client.patch(rfi_status_url(str(rfi.id)), json={"status": "open"})
        assert resp.status_code == 403

    async def test_non_member_cannot_send_rfi(
        self, user_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        rfi = await create_rfi_in_db(db, project, admin_user)
        resp = await user_client.post(rfi_send_url(str(rfi.id)))
        assert resp.status_code == 403

    async def test_non_member_cannot_add_response(
        self, user_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        rfi = await create_rfi_in_db(db, project, admin_user)
        resp = await user_client.post(
            rfi_responses_url(str(rfi.id)),
            json={"response_text": "Nope."},
            params={"send_email": False},
        )
        assert resp.status_code == 403

    async def test_non_member_cannot_get_email_log(
        self, user_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        rfi = await create_rfi_in_db(db, project, admin_user)
        resp = await user_client.get(rfi_email_log_url(str(rfi.id)))
        assert resp.status_code == 403

    async def test_non_member_cannot_get_responses(
        self, user_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        rfi = await create_rfi_in_db(db, project, admin_user)
        resp = await user_client.get(rfi_responses_url(str(rfi.id)))
        assert resp.status_code == 403


class TestRFIFilterCombinations:

    async def test_filter_status_and_priority_combined(self, admin_client: AsyncClient, project: Project):
        await create_rfi_via_api(admin_client, str(project.id), valid_rfi_payload(priority="high"))
        await create_rfi_via_api(admin_client, str(project.id), valid_rfi_payload(priority="low", subject="Low priority item"))
        resp = await admin_client.get(
            rfis_url(str(project.id)),
            params={"status": "draft", "priority": "high"}
        )
        data = resp.json()
        assert data["total"] >= 1
        for item in data["items"]:
            assert item["status"] == "draft"
            assert item["priority"] == "high"

    async def test_filter_status_and_search_combined(self, admin_client: AsyncClient, project: Project):
        await create_rfi_via_api(admin_client, str(project.id), valid_rfi_payload(subject="Steel beam specification query"))
        await create_rfi_via_api(admin_client, str(project.id), valid_rfi_payload(subject="Concrete foundation query"))
        resp = await admin_client.get(
            rfis_url(str(project.id)),
            params={"status": "draft", "search": "Steel"}
        )
        data = resp.json()
        assert data["total"] >= 1

    async def test_filter_priority_and_search_combined(self, admin_client: AsyncClient, project: Project):
        await create_rfi_via_api(admin_client, str(project.id), valid_rfi_payload(priority="urgent", subject="Urgent steel item"))
        await create_rfi_via_api(admin_client, str(project.id), valid_rfi_payload(priority="low", subject="Low concrete item"))
        resp = await admin_client.get(
            rfis_url(str(project.id)),
            params={"priority": "urgent", "search": "steel"}
        )
        data = resp.json()
        assert data["total"] >= 1

    async def test_search_by_rfi_number(self, admin_client: AsyncClient, project: Project):
        created = await create_rfi_via_api(admin_client, str(project.id))
        rfi_number = created["rfi_number"]
        resp = await admin_client.get(rfis_url(str(project.id)), params={"search": rfi_number})
        data = resp.json()
        assert data["total"] >= 1

    async def test_search_by_to_email(self, admin_client: AsyncClient, project: Project):
        await create_rfi_via_api(admin_client, str(project.id), valid_rfi_payload(to_email="unique-search@example.com"))
        resp = await admin_client.get(rfis_url(str(project.id)), params={"search": "unique-search"})
        data = resp.json()
        assert data["total"] >= 1

    async def test_search_case_insensitive(self, admin_client: AsyncClient, project: Project):
        await create_rfi_via_api(admin_client, str(project.id), valid_rfi_payload(subject="Unique Subject For Search"))
        resp = await admin_client.get(rfis_url(str(project.id)), params={"search": "unique subject"})
        data = resp.json()
        assert data["total"] >= 1

    async def test_search_no_results(self, admin_client: AsyncClient, project: Project):
        await create_rfi_via_api(admin_client, str(project.id))
        resp = await admin_client.get(rfis_url(str(project.id)), params={"search": "xyznonexistent"})
        data = resp.json()
        assert data["total"] == 0

    async def test_filter_priority_no_results(self, admin_client: AsyncClient, project: Project):
        await create_rfi_via_api(admin_client, str(project.id), valid_rfi_payload(priority="high"))
        resp = await admin_client.get(rfis_url(str(project.id)), params={"priority": "low"})
        data = resp.json()
        assert data["total"] == 0


class TestRFIResponseFields:

    async def test_rfi_response_has_id_field(self, admin_client: AsyncClient, project: Project):
        data = await create_rfi_via_api(admin_client, str(project.id))
        assert isinstance(data["id"], str)
        assert len(data["id"]) == 36

    async def test_rfi_response_has_project_id(self, admin_client: AsyncClient, project: Project):
        data = await create_rfi_via_api(admin_client, str(project.id))
        assert data["project_id"] == str(project.id)

    async def test_rfi_response_has_rfi_number(self, admin_client: AsyncClient, project: Project):
        data = await create_rfi_via_api(admin_client, str(project.id))
        assert isinstance(data["rfi_number"], str)
        assert data["rfi_number"].startswith("RFI-")

    async def test_rfi_response_has_timestamps(self, admin_client: AsyncClient, project: Project):
        data = await create_rfi_via_api(admin_client, str(project.id))
        assert data["created_at"] is not None
        assert data["updated_at"] is not None

    async def test_rfi_list_response_has_response_count(self, admin_client: AsyncClient, project: Project):
        await create_rfi_via_api(admin_client, str(project.id))
        resp = await admin_client.get(rfis_url(str(project.id)))
        item = resp.json()["items"][0]
        assert "response_count" in item
        assert item["response_count"] == 0

    async def test_rfi_response_email_fields_null_initially(self, admin_client: AsyncClient, project: Project):
        data = await create_rfi_via_api(admin_client, str(project.id))
        assert data["email_thread_id"] is None
        assert data["email_message_id"] is None
        assert data["sent_at"] is None

    async def test_rfi_response_closed_at_null_initially(self, admin_client: AsyncClient, project: Project):
        data = await create_rfi_via_api(admin_client, str(project.id))
        assert data["closed_at"] is None
        assert data["responded_at"] is None

    async def test_paginated_response_structure(self, admin_client: AsyncClient, project: Project):
        await create_rfi_via_api(admin_client, str(project.id))
        resp = await admin_client.get(rfis_url(str(project.id)))
        data = resp.json()
        assert "items" in data
        assert "total" in data
        assert "page" in data
        assert "page_size" in data
        assert "total_pages" in data

    async def test_rfi_summary_response_structure(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.get(rfi_summary_url(str(project.id)))
        data = resp.json()
        expected_keys = [
            "total_rfis", "draft_count", "open_count",
            "waiting_response_count", "answered_count", "closed_count",
            "overdue_count", "by_priority", "by_category",
        ]
        for key in expected_keys:
            assert key in data, f"Missing key: {key}"


class TestRFIDeleteStatusRestrictions:

    async def test_cannot_delete_waiting_response_rfi(self, admin_client: AsyncClient, project: Project):
        created = await create_rfi_via_api(admin_client, str(project.id))
        await admin_client.patch(rfi_status_url(created["id"]), json={"status": "waiting_response"})
        resp = await admin_client.delete(rfi_delete_url(created["id"]))
        assert resp.status_code == 400

    async def test_cannot_delete_answered_rfi(self, admin_client: AsyncClient, project: Project):
        created = await create_rfi_via_api(admin_client, str(project.id))
        await admin_client.patch(rfi_status_url(created["id"]), json={"status": "answered"})
        resp = await admin_client.delete(rfi_delete_url(created["id"]))
        assert resp.status_code == 400

    async def test_cannot_delete_closed_rfi(self, admin_client: AsyncClient, project: Project):
        created = await create_rfi_via_api(admin_client, str(project.id))
        await admin_client.patch(rfi_status_url(created["id"]), json={"status": "closed"})
        resp = await admin_client.delete(rfi_delete_url(created["id"]))
        assert resp.status_code == 400


class TestRFIMultipleResponses:

    async def test_multiple_responses_increment_count(self, admin_client: AsyncClient, project: Project):
        created = await create_rfi_via_api(admin_client, str(project.id))
        for i in range(3):
            await admin_client.post(
                rfi_responses_url(created["id"]),
                json={"response_text": f"Response number {i + 1}."},
                params={"send_email": False},
            )
        resp = await admin_client.get(rfi_responses_url(created["id"]))
        assert len(resp.json()) == 3

    async def test_responses_ordered_by_creation(self, admin_client: AsyncClient, project: Project):
        created = await create_rfi_via_api(admin_client, str(project.id))
        for i in range(3):
            await admin_client.post(
                rfi_responses_url(created["id"]),
                json={"response_text": f"Response {i + 1}."},
                params={"send_email": False},
            )
        resp = await admin_client.get(rfi_responses_url(created["id"]))
        data = resp.json()
        assert data[0]["response_text"] == "Response 1."
        assert data[2]["response_text"] == "Response 3."

    async def test_response_has_rfi_id(self, admin_client: AsyncClient, project: Project):
        created = await create_rfi_via_api(admin_client, str(project.id))
        resp = await admin_client.post(
            rfi_responses_url(created["id"]),
            json={"response_text": "Check this."},
            params={"send_email": False},
        )
        data = resp.json()
        assert data["rfi_id"] == created["id"]

    async def test_response_has_created_at(self, admin_client: AsyncClient, project: Project):
        created = await create_rfi_via_api(admin_client, str(project.id))
        resp = await admin_client.post(
            rfi_responses_url(created["id"]),
            json={"response_text": "Timestamp check."},
            params={"send_email": False},
        )
        assert resp.json()["created_at"] is not None

    async def test_get_rfi_includes_response_count_in_list(self, admin_client: AsyncClient, project: Project):
        created = await create_rfi_via_api(admin_client, str(project.id))
        await admin_client.post(
            rfi_responses_url(created["id"]),
            json={"response_text": "A response."},
            params={"send_email": False},
        )
        resp = await admin_client.get(rfis_url(str(project.id)))
        item = resp.json()["items"][0]
        assert item["response_count"] == 1


class TestRFIStatusEdgeCases:

    async def test_status_transition_draft_to_closed(self, admin_client: AsyncClient, project: Project):
        created = await create_rfi_via_api(admin_client, str(project.id))
        resp = await admin_client.patch(rfi_status_url(created["id"]), json={"status": "closed"})
        assert resp.status_code == 200
        assert resp.json()["closed_at"] is not None

    async def test_status_transition_open_to_cancelled(self, admin_client: AsyncClient, project: Project):
        created = await create_rfi_via_api(admin_client, str(project.id))
        await admin_client.patch(rfi_status_url(created["id"]), json={"status": "open"})
        resp = await admin_client.patch(rfi_status_url(created["id"]), json={"status": "cancelled"})
        assert resp.status_code == 200
        assert resp.json()["status"] == "cancelled"

    async def test_status_transition_answered_to_waiting_response(self, admin_client: AsyncClient, project: Project):
        created = await create_rfi_via_api(admin_client, str(project.id))
        await admin_client.patch(rfi_status_url(created["id"]), json={"status": "answered"})
        resp = await admin_client.patch(rfi_status_url(created["id"]), json={"status": "waiting_response"})
        assert resp.status_code == 200

    async def test_status_multiple_transitions(self, admin_client: AsyncClient, project: Project):
        created = await create_rfi_via_api(admin_client, str(project.id))
        transitions = ["open", "waiting_response", "answered", "closed"]
        for status in transitions:
            resp = await admin_client.patch(rfi_status_url(created["id"]), json={"status": status})
            assert resp.status_code == 200
            assert resp.json()["status"] == status

    async def test_status_update_reflected_in_list(self, admin_client: AsyncClient, project: Project):
        created = await create_rfi_via_api(admin_client, str(project.id))
        await admin_client.patch(rfi_status_url(created["id"]), json={"status": "open"})
        resp = await admin_client.get(rfis_url(str(project.id)))
        items = resp.json()["items"]
        matching = [i for i in items if i["id"] == created["id"]]
        assert len(matching) == 1
        assert matching[0]["status"] == "open"

    async def test_status_update_reflected_in_detail(self, admin_client: AsyncClient, project: Project):
        created = await create_rfi_via_api(admin_client, str(project.id))
        await admin_client.patch(rfi_status_url(created["id"]), json={"status": "answered"})
        resp = await admin_client.get(rfi_detail_url(created["id"]))
        assert resp.json()["status"] == "answered"

    async def test_status_update_reflected_in_summary(self, admin_client: AsyncClient, project: Project):
        created = await create_rfi_via_api(admin_client, str(project.id))
        await admin_client.patch(rfi_status_url(created["id"]), json={"status": "open"})
        resp = await admin_client.get(rfi_summary_url(str(project.id)))
        data = resp.json()
        assert data["open_count"] == 1
        assert data["draft_count"] == 0


class TestRFIPagination:

    async def test_pagination_default_page_size(self, admin_client: AsyncClient, project: Project):
        for _ in range(3):
            await create_rfi_via_api(admin_client, str(project.id))
        resp = await admin_client.get(rfis_url(str(project.id)))
        data = resp.json()
        assert data["page"] == 1
        assert data["page_size"] == 20
        assert data["total"] == 3

    async def test_pagination_custom_page_size(self, admin_client: AsyncClient, project: Project):
        for _ in range(5):
            await create_rfi_via_api(admin_client, str(project.id))
        resp = await admin_client.get(rfis_url(str(project.id)), params={"page_size": 2})
        data = resp.json()
        assert len(data["items"]) == 2
        assert data["total"] == 5
        assert data["total_pages"] == 3

    async def test_pagination_second_page(self, admin_client: AsyncClient, project: Project):
        for _ in range(5):
            await create_rfi_via_api(admin_client, str(project.id))
        resp = await admin_client.get(rfis_url(str(project.id)), params={"page": 2, "page_size": 2})
        data = resp.json()
        assert data["page"] == 2
        assert len(data["items"]) == 2

    async def test_pagination_last_page_partial(self, admin_client: AsyncClient, project: Project):
        for _ in range(5):
            await create_rfi_via_api(admin_client, str(project.id))
        resp = await admin_client.get(rfis_url(str(project.id)), params={"page": 3, "page_size": 2})
        data = resp.json()
        assert len(data["items"]) == 1

    async def test_pagination_empty_page(self, admin_client: AsyncClient, project: Project):
        await create_rfi_via_api(admin_client, str(project.id))
        resp = await admin_client.get(rfis_url(str(project.id)), params={"page": 100, "page_size": 10})
        data = resp.json()
        assert len(data["items"]) == 0

    async def test_pagination_total_pages_single(self, admin_client: AsyncClient, project: Project):
        await create_rfi_via_api(admin_client, str(project.id))
        resp = await admin_client.get(rfis_url(str(project.id)), params={"page_size": 10})
        assert resp.json()["total_pages"] == 1


class TestRFIOptionalFields:

    async def test_create_with_to_name(self, admin_client: AsyncClient, project: Project):
        data = await create_rfi_via_api(
            admin_client, str(project.id),
            valid_rfi_payload(to_name="John Engineer"),
        )
        assert data["to_name"] == "John Engineer"

    async def test_create_with_location(self, admin_client: AsyncClient, project: Project):
        data = await create_rfi_via_api(
            admin_client, str(project.id),
            valid_rfi_payload(location="Building A, Floor 3"),
        )
        assert data["location"] == "Building A, Floor 3"

    async def test_create_with_drawing_reference(self, admin_client: AsyncClient, project: Project):
        data = await create_rfi_via_api(
            admin_client, str(project.id),
            valid_rfi_payload(drawing_reference="DWG-A101"),
        )
        assert data["drawing_reference"] == "DWG-A101"

    async def test_create_with_specification_reference(self, admin_client: AsyncClient, project: Project):
        data = await create_rfi_via_api(
            admin_client, str(project.id),
            valid_rfi_payload(specification_reference="SPEC-03100"),
        )
        assert data["specification_reference"] == "SPEC-03100"

    async def test_create_with_due_date(self, admin_client: AsyncClient, project: Project):
        data = await create_rfi_via_api(
            admin_client, str(project.id),
            valid_rfi_payload(due_date="2025-12-31T17:00:00"),
        )
        assert data["due_date"] is not None

    async def test_create_with_all_optional_fields(self, admin_client: AsyncClient, project: Project):
        payload = valid_rfi_payload(
            to_name="Lead Engineer",
            location="Site B",
            drawing_reference="DWG-B201",
            specification_reference="SPEC-06000",
            due_date="2025-08-01T10:00:00",
        )
        data = await create_rfi_via_api(admin_client, str(project.id), payload)
        assert data["to_name"] == "Lead Engineer"
        assert data["location"] == "Site B"
        assert data["drawing_reference"] == "DWG-B201"
        assert data["specification_reference"] == "SPEC-06000"

    async def test_create_without_optional_fields(self, admin_client: AsyncClient, project: Project):
        data = await create_rfi_via_api(admin_client, str(project.id))
        assert data["to_name"] is None
        assert data["location"] is None
        assert data["drawing_reference"] is None
        assert data["specification_reference"] is None
        assert data["due_date"] is None


class TestRFIUpdateFields:

    async def test_update_subject(self, admin_client: AsyncClient, project: Project):
        created = await create_rfi_via_api(admin_client, str(project.id))
        resp = await admin_client.patch(
            rfi_detail_url(created["id"]),
            json={"subject": "Updated subject text"},
        )
        assert resp.status_code == 200
        assert resp.json()["subject"] == "Updated subject text"

    async def test_update_question(self, admin_client: AsyncClient, project: Project):
        created = await create_rfi_via_api(admin_client, str(project.id))
        resp = await admin_client.patch(
            rfi_detail_url(created["id"]),
            json={"question": "What is the new requirement?"},
        )
        assert resp.status_code == 200
        assert resp.json()["question"] == "What is the new requirement?"

    async def test_update_to_email(self, admin_client: AsyncClient, project: Project):
        created = await create_rfi_via_api(admin_client, str(project.id))
        resp = await admin_client.patch(
            rfi_detail_url(created["id"]),
            json={"to_email": "newemail@test.com"},
        )
        assert resp.status_code == 200

    async def test_update_category(self, admin_client: AsyncClient, project: Project):
        created = await create_rfi_via_api(admin_client, str(project.id))
        resp = await admin_client.patch(
            rfi_detail_url(created["id"]),
            json={"category": "mep"},
        )
        assert resp.status_code == 200

    async def test_update_location(self, admin_client: AsyncClient, project: Project):
        created = await create_rfi_via_api(admin_client, str(project.id))
        resp = await admin_client.patch(
            rfi_detail_url(created["id"]),
            json={"location": "Tower B, Level 5"},
        )
        assert resp.status_code == 200
        assert resp.json()["location"] == "Tower B, Level 5"

    async def test_update_nonexistent_rfi(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.patch(
            rfi_detail_url(FAKE_RFI_ID),
            json={"subject": "Wont work"},
        )
        assert resp.status_code == 404
