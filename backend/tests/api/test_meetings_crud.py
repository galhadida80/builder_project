import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.project import Project, ProjectMember
from app.models.user import User

API_V1 = "/api/v1"
FAKE_PROJECT_ID = str(uuid.uuid4())
FAKE_MEETING_ID = str(uuid.uuid4())


def meetings_url(project_id: str) -> str:
    return f"{API_V1}/projects/{project_id}/meetings"


def meeting_detail_url(project_id: str, meeting_id: str) -> str:
    return f"{API_V1}/projects/{project_id}/meetings/{meeting_id}"


def attendees_url(project_id: str, meeting_id: str) -> str:
    return f"{API_V1}/projects/{project_id}/meetings/{meeting_id}/attendees"


def attendee_url(project_id: str, meeting_id: str, user_id: str) -> str:
    return f"{API_V1}/projects/{project_id}/meetings/{meeting_id}/attendees/{user_id}"


def confirm_url(project_id: str, meeting_id: str, user_id: str) -> str:
    return f"{API_V1}/projects/{project_id}/meetings/{meeting_id}/attendees/{user_id}/confirm"


def valid_meeting_payload(**overrides) -> dict:
    base = {
        "title": "Weekly Standup",
        "description": "Team sync meeting",
        "meeting_type": "standup",
        "location": "Conference Room A",
        "scheduled_date": "2025-06-15T10:00:00",
    }
    base.update(overrides)
    return base


async def create_meeting_via_api(client: AsyncClient, project_id: str, payload: dict = None) -> dict:
    data = payload or valid_meeting_payload()
    resp = await client.post(meetings_url(project_id), json=data)
    assert resp.status_code == 200
    return resp.json()


class TestCreateMeeting:

    @pytest.mark.asyncio
    async def test_create_meeting_success(self, admin_client: AsyncClient, project: Project):
        payload = valid_meeting_payload()
        resp = await admin_client.post(meetings_url(str(project.id)), json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["title"] == "Weekly Standup"
        assert "id" in data

    @pytest.mark.asyncio
    async def test_create_returns_camel_case_fields(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.post(meetings_url(str(project.id)), json=valid_meeting_payload())
        data = resp.json()
        assert "projectId" in data
        assert "meetingType" in data
        assert "scheduledDate" in data
        assert "createdAt" in data
        assert "scheduledTime" in data

    @pytest.mark.asyncio
    async def test_create_sets_project_id(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.post(meetings_url(str(project.id)), json=valid_meeting_payload())
        assert resp.json()["projectId"] == str(project.id)

    @pytest.mark.asyncio
    async def test_create_sets_default_status_scheduled(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.post(meetings_url(str(project.id)), json=valid_meeting_payload())
        assert resp.json()["status"] == "scheduled"

    @pytest.mark.asyncio
    async def test_create_sets_created_by(self, admin_client: AsyncClient, project: Project, admin_user: User):
        resp = await admin_client.post(meetings_url(str(project.id)), json=valid_meeting_payload())
        data = resp.json()
        assert data["createdBy"] is not None
        assert data["createdBy"]["id"] == str(admin_user.id)

    @pytest.mark.asyncio
    async def test_create_with_minimal_fields(self, admin_client: AsyncClient, project: Project):
        payload = {"title": "Quick Meeting", "scheduled_date": "2025-06-15T10:00:00"}
        resp = await admin_client.post(meetings_url(str(project.id)), json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["title"] == "Quick Meeting"
        assert data["description"] is None
        assert data["meetingType"] is None
        assert data["location"] is None

    @pytest.mark.asyncio
    async def test_create_attendees_empty_initially(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.post(meetings_url(str(project.id)), json=valid_meeting_payload())
        assert resp.json()["attendees"] == []

    @pytest.mark.asyncio
    async def test_create_with_all_fields(self, admin_client: AsyncClient, project: Project):
        payload = valid_meeting_payload(
            scheduled_time="10:00",
        )
        resp = await admin_client.post(meetings_url(str(project.id)), json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["scheduledTime"] == "10:00"
        assert data["location"] == "Conference Room A"

    @pytest.mark.asyncio
    async def test_create_missing_title(self, admin_client: AsyncClient, project: Project):
        payload = {"scheduled_date": "2025-06-15T10:00:00"}
        resp = await admin_client.post(meetings_url(str(project.id)), json=payload)
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_create_missing_scheduled_date(self, admin_client: AsyncClient, project: Project):
        payload = {"title": "No Date Meeting"}
        resp = await admin_client.post(meetings_url(str(project.id)), json=payload)
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_create_empty_payload(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.post(meetings_url(str(project.id)), json={})
        assert resp.status_code == 422

    @pytest.mark.asyncio
    @pytest.mark.parametrize("title,expected_status", [
        ("AB", 200),
        ("A" * 255, 200),
        ("Valid Meeting Title", 200),
    ])
    async def test_create_valid_titles(self, admin_client: AsyncClient, project: Project, title, expected_status):
        payload = valid_meeting_payload(title=title)
        resp = await admin_client.post(meetings_url(str(project.id)), json=payload)
        assert resp.status_code == expected_status

    @pytest.mark.asyncio
    @pytest.mark.parametrize("title,desc", [
        ("", "empty title"),
        ("A", "single char too short"),
        ("A" * 256, "256 chars too long"),
    ])
    async def test_create_invalid_titles(self, admin_client: AsyncClient, project: Project, title, desc):
        payload = valid_meeting_payload(title=title)
        resp = await admin_client.post(meetings_url(str(project.id)), json=payload)
        assert resp.status_code == 422, f"Failed for: {desc}"

    @pytest.mark.asyncio
    async def test_create_description_max_length(self, admin_client: AsyncClient, project: Project):
        payload = valid_meeting_payload(description="A" * 2000)
        resp = await admin_client.post(meetings_url(str(project.id)), json=payload)
        assert resp.status_code == 200

    @pytest.mark.asyncio
    async def test_create_description_too_long(self, admin_client: AsyncClient, project: Project):
        payload = valid_meeting_payload(description="A" * 2001)
        resp = await admin_client.post(meetings_url(str(project.id)), json=payload)
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_create_meeting_type_max_length(self, admin_client: AsyncClient, project: Project):
        payload = valid_meeting_payload(meeting_type="A" * 50)
        resp = await admin_client.post(meetings_url(str(project.id)), json=payload)
        assert resp.status_code == 200

    @pytest.mark.asyncio
    async def test_create_meeting_type_too_long(self, admin_client: AsyncClient, project: Project):
        payload = valid_meeting_payload(meeting_type="A" * 51)
        resp = await admin_client.post(meetings_url(str(project.id)), json=payload)
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_create_location_max_length(self, admin_client: AsyncClient, project: Project):
        payload = valid_meeting_payload(location="A" * 255)
        resp = await admin_client.post(meetings_url(str(project.id)), json=payload)
        assert resp.status_code == 200

    @pytest.mark.asyncio
    async def test_create_location_too_long(self, admin_client: AsyncClient, project: Project):
        payload = valid_meeting_payload(location="A" * 256)
        resp = await admin_client.post(meetings_url(str(project.id)), json=payload)
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_create_scheduled_time_max_length(self, admin_client: AsyncClient, project: Project):
        payload = valid_meeting_payload(scheduled_time="A" * 20)
        resp = await admin_client.post(meetings_url(str(project.id)), json=payload)
        assert resp.status_code == 200

    @pytest.mark.asyncio
    async def test_create_scheduled_time_too_long(self, admin_client: AsyncClient, project: Project):
        payload = valid_meeting_payload(scheduled_time="A" * 21)
        resp = await admin_client.post(meetings_url(str(project.id)), json=payload)
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_create_with_null_optional_fields(self, admin_client: AsyncClient, project: Project):
        payload = {
            "title": "Null Fields Meeting",
            "scheduled_date": "2025-06-15T10:00:00",
            "description": None,
            "meeting_type": None,
            "location": None,
            "scheduled_time": None,
        }
        resp = await admin_client.post(meetings_url(str(project.id)), json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["description"] is None
        assert data["meetingType"] is None
        assert data["location"] is None

    @pytest.mark.asyncio
    async def test_create_id_is_valid_uuid(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.post(meetings_url(str(project.id)), json=valid_meeting_payload())
        meeting_id = resp.json()["id"]
        uuid.UUID(meeting_id)


class TestCreateMeetingDateValidation:

    @pytest.mark.asyncio
    @pytest.mark.parametrize("date_str", [
        "2025-01-15T10:00:00",
        "2025-12-31T23:59:59",
        "2024-06-15T00:00:00",
    ])
    async def test_valid_dates(self, admin_client: AsyncClient, project: Project, date_str):
        payload = valid_meeting_payload(scheduled_date=date_str)
        resp = await admin_client.post(meetings_url(str(project.id)), json=payload)
        assert resp.status_code == 200
        assert resp.json()["scheduledDate"] is not None

    @pytest.mark.asyncio
    @pytest.mark.parametrize("bad_date", [
        "not-a-date",
        "2024-13-01T00:00:00",
        "yesterday",
        "tomorrow",
        "",
        "2024-01",
    ])
    async def test_invalid_date_formats(self, admin_client: AsyncClient, project: Project, bad_date):
        payload = valid_meeting_payload(scheduled_date=bad_date)
        resp = await admin_client.post(meetings_url(str(project.id)), json=payload)
        assert resp.status_code == 422


class TestCreateMeetingXSS:

    @pytest.mark.asyncio
    @pytest.mark.parametrize("field", ["title", "description", "meeting_type", "location"])
    @pytest.mark.parametrize("xss_payload,marker", [
        ('<script>alert("xss")</script>', "<script"),
        ('javascript:alert(1)', "javascript:"),
        ('<img src=x onerror=alert(1)>', "<img"),
        ('<iframe src="evil"></iframe>', "<iframe"),
    ])
    async def test_xss_sanitization(self, admin_client: AsyncClient, project: Project, field, xss_payload, marker):
        if field == "title":
            payload = valid_meeting_payload(title=f"Safe {xss_payload} Title")
        else:
            payload = valid_meeting_payload(**{field: f"Safe {xss_payload} Text"})
        resp = await admin_client.post(meetings_url(str(project.id)), json=payload)
        if resp.status_code == 200:
            camel_map = {
                "title": "title", "description": "description",
                "meeting_type": "meetingType", "location": "location",
            }
            val = resp.json().get(camel_map[field], "")
            if val:
                assert marker not in val.lower()


class TestGetMeeting:

    @pytest.mark.asyncio
    async def test_get_meeting_by_id(self, admin_client: AsyncClient, project: Project):
        created = await create_meeting_via_api(admin_client, str(project.id))
        resp = await admin_client.get(meeting_detail_url(str(project.id), created["id"]))
        assert resp.status_code == 200
        assert resp.json()["id"] == created["id"]
        assert resp.json()["title"] == created["title"]

    @pytest.mark.asyncio
    async def test_get_meeting_returns_camel_case(self, admin_client: AsyncClient, project: Project):
        created = await create_meeting_via_api(admin_client, str(project.id))
        resp = await admin_client.get(meeting_detail_url(str(project.id), created["id"]))
        data = resp.json()
        assert "projectId" in data
        assert "meetingType" in data
        assert "scheduledDate" in data
        assert "createdAt" in data

    @pytest.mark.asyncio
    async def test_get_nonexistent_meeting(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.get(meeting_detail_url(str(project.id), FAKE_MEETING_ID))
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_get_meeting_nonexistent_project(self, admin_client: AsyncClient):
        resp = await admin_client.get(meeting_detail_url(FAKE_PROJECT_ID, FAKE_MEETING_ID))
        assert resp.status_code == 403

    @pytest.mark.asyncio
    async def test_get_meeting_wrong_project(self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User):
        created = await create_meeting_via_api(admin_client, str(project.id))
        other_project = Project(
            id=uuid.uuid4(), name="Other Project", code="OTH-MTG",
            status="active", created_by_id=admin_user.id,
        )
        db.add(other_project)
        await db.flush()
        db.add(ProjectMember(project_id=other_project.id, user_id=admin_user.id, role="project_admin"))
        await db.commit()
        resp = await admin_client.get(meeting_detail_url(str(other_project.id), created["id"]))
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_get_meeting_invalid_uuid_format(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.get(f"{API_V1}/projects/{project.id}/meetings/not-a-uuid")
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_get_meeting_includes_attendees(self, admin_client: AsyncClient, project: Project, admin_user: User):
        created = await create_meeting_via_api(admin_client, str(project.id))
        await admin_client.post(
            attendees_url(str(project.id), created["id"]),
            json={"user_id": str(admin_user.id), "role": "organizer"},
        )
        resp = await admin_client.get(meeting_detail_url(str(project.id), created["id"]))
        assert len(resp.json()["attendees"]) == 1

    @pytest.mark.asyncio
    async def test_get_meeting_has_all_expected_fields(self, admin_client: AsyncClient, project: Project):
        created = await create_meeting_via_api(admin_client, str(project.id))
        resp = await admin_client.get(meeting_detail_url(str(project.id), created["id"]))
        data = resp.json()
        expected_fields = [
            "id", "projectId", "title", "description", "meetingType",
            "location", "scheduledDate", "scheduledTime", "status",
            "createdAt", "createdBy", "attendees",
        ]
        for field in expected_fields:
            assert field in data, f"Missing field: {field}"


class TestListMeetings:

    @pytest.mark.asyncio
    async def test_list_empty(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.get(meetings_url(str(project.id)))
        assert resp.status_code == 200
        assert resp.json() == []

    @pytest.mark.asyncio
    async def test_list_single_item(self, admin_client: AsyncClient, project: Project):
        await create_meeting_via_api(admin_client, str(project.id))
        resp = await admin_client.get(meetings_url(str(project.id)))
        assert resp.status_code == 200
        assert len(resp.json()) == 1

    @pytest.mark.asyncio
    async def test_list_multiple_items(self, admin_client: AsyncClient, project: Project):
        for i in range(3):
            await create_meeting_via_api(
                admin_client, str(project.id),
                valid_meeting_payload(title=f"Meeting {i}")
            )
        resp = await admin_client.get(meetings_url(str(project.id)))
        assert resp.status_code == 200
        assert len(resp.json()) == 3

    @pytest.mark.asyncio
    async def test_list_scoped_to_project(self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User):
        await create_meeting_via_api(admin_client, str(project.id))
        other_project = Project(
            id=uuid.uuid4(), name="Other", code="OTH-MTG2",
            status="active", created_by_id=admin_user.id,
        )
        db.add(other_project)
        await db.flush()
        db.add(ProjectMember(project_id=other_project.id, user_id=admin_user.id, role="project_admin"))
        await db.commit()
        resp = await admin_client.get(meetings_url(str(other_project.id)))
        assert resp.status_code == 200
        assert len(resp.json()) == 0

    @pytest.mark.asyncio
    async def test_list_returns_camel_case(self, admin_client: AsyncClient, project: Project):
        await create_meeting_via_api(admin_client, str(project.id))
        resp = await admin_client.get(meetings_url(str(project.id)))
        item = resp.json()[0]
        assert "meetingType" in item
        assert "scheduledDate" in item

    @pytest.mark.asyncio
    async def test_list_ordered_by_scheduled_date_desc(self, admin_client: AsyncClient, project: Project):
        dates = ["2025-01-01T10:00:00", "2025-06-15T10:00:00", "2025-03-10T10:00:00"]
        for d in dates:
            await create_meeting_via_api(
                admin_client, str(project.id),
                valid_meeting_payload(title=f"Meeting {d}", scheduled_date=d)
            )
        resp = await admin_client.get(meetings_url(str(project.id)))
        items = resp.json()
        scheduled_dates = [item["scheduledDate"] for item in items]
        assert scheduled_dates == sorted(scheduled_dates, reverse=True)

    @pytest.mark.asyncio
    async def test_list_response_is_array(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.get(meetings_url(str(project.id)))
        assert isinstance(resp.json(), list)

    @pytest.mark.asyncio
    @pytest.mark.parametrize("count", [1, 5, 10])
    async def test_list_n_meetings(self, admin_client: AsyncClient, project: Project, count):
        for i in range(count):
            await create_meeting_via_api(
                admin_client, str(project.id),
                valid_meeting_payload(title=f"Meeting #{i}")
            )
        resp = await admin_client.get(meetings_url(str(project.id)))
        assert len(resp.json()) == count


class TestFlatListMeetings:

    @pytest.mark.asyncio
    async def test_flat_list_returns_meetings(self, admin_client: AsyncClient, project: Project):
        await create_meeting_via_api(admin_client, str(project.id))
        resp = await admin_client.get(f"{API_V1}/meetings")
        assert resp.status_code == 200
        assert len(resp.json()) >= 1

    @pytest.mark.asyncio
    async def test_flat_list_empty(self, admin_client: AsyncClient):
        resp = await admin_client.get(f"{API_V1}/meetings")
        assert resp.status_code == 200
        assert resp.json() == []

    @pytest.mark.asyncio
    async def test_flat_list_includes_only_user_projects(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        await create_meeting_via_api(admin_client, str(project.id))
        other_project = Project(
            id=uuid.uuid4(), name="Other", code="OTH-MTG3",
            status="active", created_by_id=admin_user.id,
        )
        db.add(other_project)
        await db.flush()
        db.add(ProjectMember(project_id=other_project.id, user_id=admin_user.id, role="project_admin"))
        await db.commit()
        await create_meeting_via_api(admin_client, str(other_project.id),
                                     valid_meeting_payload(title="Other Meeting"))
        resp = await admin_client.get(f"{API_V1}/meetings")
        assert len(resp.json()) == 2

    @pytest.mark.asyncio
    async def test_flat_list_returns_camel_case(self, admin_client: AsyncClient, project: Project):
        await create_meeting_via_api(admin_client, str(project.id))
        resp = await admin_client.get(f"{API_V1}/meetings")
        item = resp.json()[0]
        assert "meetingType" in item
        assert "scheduledDate" in item

    @pytest.mark.asyncio
    async def test_flat_list_response_is_array(self, admin_client: AsyncClient):
        resp = await admin_client.get(f"{API_V1}/meetings")
        assert isinstance(resp.json(), list)


class TestUpdateMeeting:

    @pytest.mark.asyncio
    async def test_update_title(self, admin_client: AsyncClient, project: Project):
        created = await create_meeting_via_api(admin_client, str(project.id))
        resp = await admin_client.put(
            meeting_detail_url(str(project.id), created["id"]),
            json={"title": "Updated Title"},
        )
        assert resp.status_code == 200
        assert resp.json()["title"] == "Updated Title"

    @pytest.mark.asyncio
    async def test_update_description(self, admin_client: AsyncClient, project: Project):
        created = await create_meeting_via_api(admin_client, str(project.id))
        resp = await admin_client.put(
            meeting_detail_url(str(project.id), created["id"]),
            json={"description": "Updated description"},
        )
        assert resp.status_code == 200
        assert resp.json()["description"] == "Updated description"

    @pytest.mark.asyncio
    async def test_update_meeting_type(self, admin_client: AsyncClient, project: Project):
        created = await create_meeting_via_api(admin_client, str(project.id))
        resp = await admin_client.put(
            meeting_detail_url(str(project.id), created["id"]),
            json={"meeting_type": "review"},
        )
        assert resp.status_code == 200
        assert resp.json()["meetingType"] == "review"

    @pytest.mark.asyncio
    async def test_update_location(self, admin_client: AsyncClient, project: Project):
        created = await create_meeting_via_api(admin_client, str(project.id))
        resp = await admin_client.put(
            meeting_detail_url(str(project.id), created["id"]),
            json={"location": "Room B"},
        )
        assert resp.status_code == 200
        assert resp.json()["location"] == "Room B"

    @pytest.mark.asyncio
    async def test_update_scheduled_date(self, admin_client: AsyncClient, project: Project):
        created = await create_meeting_via_api(admin_client, str(project.id))
        resp = await admin_client.put(
            meeting_detail_url(str(project.id), created["id"]),
            json={"scheduled_date": "2025-12-25T14:00:00"},
        )
        assert resp.status_code == 200
        assert resp.json()["scheduledDate"] is not None

    @pytest.mark.asyncio
    @pytest.mark.parametrize("status_val", ["scheduled", "invitations_sent", "completed", "cancelled"])
    async def test_update_status(self, admin_client: AsyncClient, project: Project, status_val):
        created = await create_meeting_via_api(admin_client, str(project.id))
        resp = await admin_client.put(
            meeting_detail_url(str(project.id), created["id"]),
            json={"status": status_val},
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == status_val

    @pytest.mark.asyncio
    async def test_update_summary(self, admin_client: AsyncClient, project: Project):
        created = await create_meeting_via_api(admin_client, str(project.id))
        resp = await admin_client.put(
            meeting_detail_url(str(project.id), created["id"]),
            json={"summary": "Meeting went well, action items assigned."},
        )
        assert resp.status_code == 200
        assert resp.json()["summary"] == "Meeting went well, action items assigned."

    @pytest.mark.asyncio
    async def test_update_action_items(self, admin_client: AsyncClient, project: Project):
        created = await create_meeting_via_api(admin_client, str(project.id))
        action_items = [
            {"id": "a1", "description": "Follow up on design", "is_completed": False}
        ]
        resp = await admin_client.put(
            meeting_detail_url(str(project.id), created["id"]),
            json={"action_items": action_items},
        )
        assert resp.status_code == 200
        assert resp.json()["actionItems"] is not None

    @pytest.mark.asyncio
    async def test_update_preserves_unchanged_fields(self, admin_client: AsyncClient, project: Project):
        created = await create_meeting_via_api(admin_client, str(project.id))
        original_description = created["description"]
        resp = await admin_client.put(
            meeting_detail_url(str(project.id), created["id"]),
            json={"title": "Only Title Changed"},
        )
        assert resp.status_code == 200
        assert resp.json()["description"] == original_description

    @pytest.mark.asyncio
    async def test_update_nonexistent_meeting(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.put(
            meeting_detail_url(str(project.id), FAKE_MEETING_ID),
            json={"title": "Ghost"},
        )
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_update_returns_camel_case(self, admin_client: AsyncClient, project: Project):
        created = await create_meeting_via_api(admin_client, str(project.id))
        resp = await admin_client.put(
            meeting_detail_url(str(project.id), created["id"]),
            json={"title": "Camel Test"},
        )
        data = resp.json()
        assert "meetingType" in data
        assert "scheduledDate" in data

    @pytest.mark.asyncio
    @pytest.mark.parametrize("title,expected_status", [
        ("AB", 200),
        ("A" * 255, 200),
        ("A", 422),
        ("", 422),
        ("A" * 256, 422),
    ])
    async def test_update_title_validation(self, admin_client: AsyncClient, project: Project, title, expected_status):
        created = await create_meeting_via_api(admin_client, str(project.id))
        resp = await admin_client.put(
            meeting_detail_url(str(project.id), created["id"]),
            json={"title": title},
        )
        assert resp.status_code == expected_status

    @pytest.mark.asyncio
    async def test_update_description_too_long(self, admin_client: AsyncClient, project: Project):
        created = await create_meeting_via_api(admin_client, str(project.id))
        resp = await admin_client.put(
            meeting_detail_url(str(project.id), created["id"]),
            json={"description": "A" * 2001},
        )
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_update_meeting_type_too_long(self, admin_client: AsyncClient, project: Project):
        created = await create_meeting_via_api(admin_client, str(project.id))
        resp = await admin_client.put(
            meeting_detail_url(str(project.id), created["id"]),
            json={"meeting_type": "A" * 51},
        )
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_update_location_too_long(self, admin_client: AsyncClient, project: Project):
        created = await create_meeting_via_api(admin_client, str(project.id))
        resp = await admin_client.put(
            meeting_detail_url(str(project.id), created["id"]),
            json={"location": "A" * 256},
        )
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_update_summary_max_length(self, admin_client: AsyncClient, project: Project):
        created = await create_meeting_via_api(admin_client, str(project.id))
        resp = await admin_client.put(
            meeting_detail_url(str(project.id), created["id"]),
            json={"summary": "A" * 5000},
        )
        assert resp.status_code == 200

    @pytest.mark.asyncio
    async def test_update_summary_too_long(self, admin_client: AsyncClient, project: Project):
        created = await create_meeting_via_api(admin_client, str(project.id))
        resp = await admin_client.put(
            meeting_detail_url(str(project.id), created["id"]),
            json={"summary": "A" * 5001},
        )
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_update_multiple_fields_at_once(self, admin_client: AsyncClient, project: Project):
        created = await create_meeting_via_api(admin_client, str(project.id))
        resp = await admin_client.put(
            meeting_detail_url(str(project.id), created["id"]),
            json={
                "title": "Multi Update",
                "description": "New desc",
                "location": "New location",
                "status": "completed",
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["title"] == "Multi Update"
        assert data["description"] == "New desc"
        assert data["location"] == "New location"
        assert data["status"] == "completed"

    @pytest.mark.asyncio
    @pytest.mark.parametrize("field", ["title", "description", "meeting_type", "location", "summary"])
    async def test_update_xss_sanitization(self, admin_client: AsyncClient, project: Project, field):
        created = await create_meeting_via_api(admin_client, str(project.id))
        xss = '<script>alert("xss")</script>'
        val = f"Safe {xss}" if field != "title" else f"Safe {xss} Name"
        resp = await admin_client.put(
            meeting_detail_url(str(project.id), created["id"]),
            json={field: val},
        )
        if resp.status_code == 200:
            camel_map = {
                "title": "title", "description": "description",
                "meeting_type": "meetingType", "location": "location",
                "summary": "summary",
            }
            result_val = resp.json().get(camel_map[field], "")
            if result_val:
                assert "<script" not in result_val.lower()


class TestDeleteMeeting:

    @pytest.mark.asyncio
    async def test_delete_meeting_success(self, admin_client: AsyncClient, project: Project):
        created = await create_meeting_via_api(admin_client, str(project.id))
        resp = await admin_client.delete(meeting_detail_url(str(project.id), created["id"]))
        assert resp.status_code == 200
        assert resp.json()["message"] == "Meeting deleted"

    @pytest.mark.asyncio
    async def test_delete_then_get_returns_404(self, admin_client: AsyncClient, project: Project):
        created = await create_meeting_via_api(admin_client, str(project.id))
        await admin_client.delete(meeting_detail_url(str(project.id), created["id"]))
        resp = await admin_client.get(meeting_detail_url(str(project.id), created["id"]))
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_delete_nonexistent_meeting(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.delete(meeting_detail_url(str(project.id), FAKE_MEETING_ID))
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_delete_removes_from_list(self, admin_client: AsyncClient, project: Project):
        created = await create_meeting_via_api(admin_client, str(project.id))
        await admin_client.delete(meeting_detail_url(str(project.id), created["id"]))
        resp = await admin_client.get(meetings_url(str(project.id)))
        assert len(resp.json()) == 0

    @pytest.mark.asyncio
    @pytest.mark.parametrize("delete_index", [0, 1, 2])
    async def test_delete_one_of_three(self, admin_client: AsyncClient, project: Project, delete_index):
        ids = []
        for i in range(3):
            m = await create_meeting_via_api(
                admin_client, str(project.id),
                valid_meeting_payload(title=f"Meeting {i}")
            )
            ids.append(m["id"])
        await admin_client.delete(meeting_detail_url(str(project.id), ids[delete_index]))
        resp = await admin_client.get(meetings_url(str(project.id)))
        remaining_ids = [m["id"] for m in resp.json()]
        assert ids[delete_index] not in remaining_ids
        assert len(remaining_ids) == 2

    @pytest.mark.asyncio
    async def test_delete_meeting_from_wrong_project(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        created = await create_meeting_via_api(admin_client, str(project.id))
        other_project = Project(
            id=uuid.uuid4(), name="Other", code="OTH-DEL",
            status="active", created_by_id=admin_user.id,
        )
        db.add(other_project)
        await db.flush()
        db.add(ProjectMember(project_id=other_project.id, user_id=admin_user.id, role="project_admin"))
        await db.commit()
        resp = await admin_client.delete(meeting_detail_url(str(other_project.id), created["id"]))
        assert resp.status_code == 404


class TestMeetingAttendees:

    @pytest.mark.asyncio
    async def test_add_attendee(self, admin_client: AsyncClient, project: Project, admin_user: User):
        created = await create_meeting_via_api(admin_client, str(project.id))
        resp = await admin_client.post(
            attendees_url(str(project.id), created["id"]),
            json={"user_id": str(admin_user.id), "role": "organizer"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["userId"] == str(admin_user.id)
        assert data["role"] == "organizer"
        assert data["confirmed"] is False

    @pytest.mark.asyncio
    async def test_add_attendee_without_role(self, admin_client: AsyncClient, project: Project, admin_user: User):
        created = await create_meeting_via_api(admin_client, str(project.id))
        resp = await admin_client.post(
            attendees_url(str(project.id), created["id"]),
            json={"user_id": str(admin_user.id)},
        )
        assert resp.status_code == 200
        assert resp.json()["role"] is None

    @pytest.mark.asyncio
    async def test_remove_attendee(self, admin_client: AsyncClient, project: Project, admin_user: User):
        created = await create_meeting_via_api(admin_client, str(project.id))
        await admin_client.post(
            attendees_url(str(project.id), created["id"]),
            json={"user_id": str(admin_user.id), "role": "organizer"},
        )
        resp = await admin_client.delete(
            attendee_url(str(project.id), created["id"], str(admin_user.id))
        )
        assert resp.status_code == 200
        assert resp.json()["message"] == "Attendee removed"

    @pytest.mark.asyncio
    async def test_remove_nonexistent_attendee(self, admin_client: AsyncClient, project: Project):
        created = await create_meeting_via_api(admin_client, str(project.id))
        resp = await admin_client.delete(
            attendee_url(str(project.id), created["id"], str(uuid.uuid4()))
        )
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_confirm_attendance(self, admin_client: AsyncClient, project: Project, admin_user: User):
        created = await create_meeting_via_api(admin_client, str(project.id))
        await admin_client.post(
            attendees_url(str(project.id), created["id"]),
            json={"user_id": str(admin_user.id), "role": "participant"},
        )
        resp = await admin_client.put(
            confirm_url(str(project.id), created["id"], str(admin_user.id))
        )
        assert resp.status_code == 200

    @pytest.mark.asyncio
    async def test_confirm_nonexistent_attendee(self, admin_client: AsyncClient, project: Project):
        created = await create_meeting_via_api(admin_client, str(project.id))
        resp = await admin_client.put(
            confirm_url(str(project.id), created["id"], str(uuid.uuid4()))
        )
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_add_multiple_attendees(
        self, admin_client: AsyncClient, project: Project, admin_user: User,
        db: AsyncSession, regular_user: User
    ):
        db.add(ProjectMember(project_id=project.id, user_id=regular_user.id, role="contractor"))
        await db.commit()
        created = await create_meeting_via_api(admin_client, str(project.id))
        await admin_client.post(
            attendees_url(str(project.id), created["id"]),
            json={"user_id": str(admin_user.id), "role": "organizer"},
        )
        await admin_client.post(
            attendees_url(str(project.id), created["id"]),
            json={"user_id": str(regular_user.id), "role": "participant"},
        )
        resp = await admin_client.get(meeting_detail_url(str(project.id), created["id"]))
        assert len(resp.json()["attendees"]) == 2

    @pytest.mark.asyncio
    async def test_attendee_role_max_length(self, admin_client: AsyncClient, project: Project, admin_user: User):
        created = await create_meeting_via_api(admin_client, str(project.id))
        resp = await admin_client.post(
            attendees_url(str(project.id), created["id"]),
            json={"user_id": str(admin_user.id), "role": "A" * 100},
        )
        assert resp.status_code == 200

    @pytest.mark.asyncio
    async def test_attendee_role_too_long(self, admin_client: AsyncClient, project: Project, admin_user: User):
        created = await create_meeting_via_api(admin_client, str(project.id))
        resp = await admin_client.post(
            attendees_url(str(project.id), created["id"]),
            json={"user_id": str(admin_user.id), "role": "A" * 101},
        )
        assert resp.status_code == 422


class TestMeetingStatusValues:

    @pytest.mark.asyncio
    @pytest.mark.parametrize("status_val", ["scheduled", "invitations_sent", "completed", "cancelled"])
    async def test_valid_status_values(self, admin_client: AsyncClient, project: Project, status_val):
        created = await create_meeting_via_api(admin_client, str(project.id))
        resp = await admin_client.put(
            meeting_detail_url(str(project.id), created["id"]),
            json={"status": status_val},
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == status_val

    @pytest.mark.asyncio
    async def test_default_status_is_scheduled(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.post(meetings_url(str(project.id)), json=valid_meeting_payload())
        assert resp.json()["status"] == "scheduled"

    @pytest.mark.asyncio
    async def test_status_transition_scheduled_to_completed(self, admin_client: AsyncClient, project: Project):
        created = await create_meeting_via_api(admin_client, str(project.id))
        assert created["status"] == "scheduled"
        resp = await admin_client.put(
            meeting_detail_url(str(project.id), created["id"]),
            json={"status": "completed"},
        )
        assert resp.json()["status"] == "completed"

    @pytest.mark.asyncio
    async def test_status_transition_scheduled_to_cancelled(self, admin_client: AsyncClient, project: Project):
        created = await create_meeting_via_api(admin_client, str(project.id))
        resp = await admin_client.put(
            meeting_detail_url(str(project.id), created["id"]),
            json={"status": "cancelled"},
        )
        assert resp.json()["status"] == "cancelled"


class TestMeetingMeetingTypes:

    @pytest.mark.asyncio
    @pytest.mark.parametrize("meeting_type", [
        "standup", "review", "planning", "retrospective", "kickoff",
        "site_inspection", "safety_briefing", "client_meeting",
    ])
    async def test_various_meeting_types(self, admin_client: AsyncClient, project: Project, meeting_type):
        payload = valid_meeting_payload(meeting_type=meeting_type)
        resp = await admin_client.post(meetings_url(str(project.id)), json=payload)
        assert resp.status_code == 200
        assert resp.json()["meetingType"] == meeting_type

    @pytest.mark.asyncio
    async def test_null_meeting_type(self, admin_client: AsyncClient, project: Project):
        payload = valid_meeting_payload(meeting_type=None)
        resp = await admin_client.post(meetings_url(str(project.id)), json=payload)
        assert resp.status_code == 200
        assert resp.json()["meetingType"] is None


class TestAuthRequirements:

    @pytest.mark.asyncio
    async def test_list_requires_auth(self, client: AsyncClient, project: Project):
        resp = await client.get(meetings_url(str(project.id)))
        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_flat_list_requires_auth(self, client: AsyncClient):
        resp = await client.get(f"{API_V1}/meetings")
        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_get_requires_auth(self, client: AsyncClient, project: Project):
        resp = await client.get(meeting_detail_url(str(project.id), FAKE_MEETING_ID))
        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_create_requires_auth(self, client: AsyncClient, project: Project):
        resp = await client.post(meetings_url(str(project.id)), json=valid_meeting_payload())
        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_update_requires_auth(self, client: AsyncClient, project: Project):
        resp = await client.put(
            meeting_detail_url(str(project.id), FAKE_MEETING_ID),
            json={"title": "Auth Test"},
        )
        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_delete_requires_auth(self, client: AsyncClient, project: Project):
        resp = await client.delete(meeting_detail_url(str(project.id), FAKE_MEETING_ID))
        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_add_attendee_requires_auth(self, client: AsyncClient, project: Project):
        resp = await client.post(
            attendees_url(str(project.id), FAKE_MEETING_ID),
            json={"user_id": str(uuid.uuid4())},
        )
        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_remove_attendee_requires_auth(self, client: AsyncClient, project: Project):
        resp = await client.delete(
            attendee_url(str(project.id), FAKE_MEETING_ID, str(uuid.uuid4()))
        )
        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_confirm_attendance_requires_auth(self, client: AsyncClient, project: Project):
        resp = await client.put(
            confirm_url(str(project.id), FAKE_MEETING_ID, str(uuid.uuid4()))
        )
        assert resp.status_code == 401


class TestProjectAccessControl:

    @pytest.mark.asyncio
    async def test_create_on_nonexistent_project(self, admin_client: AsyncClient):
        resp = await admin_client.post(meetings_url(FAKE_PROJECT_ID), json=valid_meeting_payload())
        assert resp.status_code == 403

    @pytest.mark.asyncio
    async def test_list_on_nonexistent_project(self, admin_client: AsyncClient):
        resp = await admin_client.get(meetings_url(FAKE_PROJECT_ID))
        assert resp.status_code == 403

    @pytest.mark.asyncio
    async def test_get_on_nonexistent_project(self, admin_client: AsyncClient):
        resp = await admin_client.get(meeting_detail_url(FAKE_PROJECT_ID, FAKE_MEETING_ID))
        assert resp.status_code == 403

    @pytest.mark.asyncio
    async def test_update_on_nonexistent_project(self, admin_client: AsyncClient):
        resp = await admin_client.put(
            meeting_detail_url(FAKE_PROJECT_ID, FAKE_MEETING_ID),
            json={"title": "No Access"},
        )
        assert resp.status_code == 403

    @pytest.mark.asyncio
    async def test_delete_on_nonexistent_project(self, admin_client: AsyncClient):
        resp = await admin_client.delete(meeting_detail_url(FAKE_PROJECT_ID, FAKE_MEETING_ID))
        assert resp.status_code == 403

    @pytest.mark.asyncio
    async def test_user_with_project_access_can_create(
        self, user_client: AsyncClient, project: Project, db: AsyncSession, regular_user: User
    ):
        db.add(ProjectMember(project_id=project.id, user_id=regular_user.id, role="contractor"))
        await db.commit()
        resp = await user_client.post(meetings_url(str(project.id)), json=valid_meeting_payload())
        assert resp.status_code == 200

    @pytest.mark.asyncio
    async def test_user_without_project_access_cannot_create(
        self, user_client: AsyncClient, project: Project
    ):
        resp = await user_client.post(meetings_url(str(project.id)), json=valid_meeting_payload())
        assert resp.status_code == 403

    @pytest.mark.asyncio
    async def test_user_without_project_access_cannot_list(
        self, user_client: AsyncClient, project: Project
    ):
        resp = await user_client.get(meetings_url(str(project.id)))
        assert resp.status_code == 403


class TestFullCRUDWorkflow:

    @pytest.mark.asyncio
    async def test_full_meeting_lifecycle(self, admin_client: AsyncClient, project: Project, admin_user: User):
        payload = valid_meeting_payload()
        create_resp = await admin_client.post(meetings_url(str(project.id)), json=payload)
        assert create_resp.status_code == 200
        mtg_id = create_resp.json()["id"]

        get_resp = await admin_client.get(meeting_detail_url(str(project.id), mtg_id))
        assert get_resp.status_code == 200
        assert get_resp.json()["title"] == payload["title"]

        list_resp = await admin_client.get(meetings_url(str(project.id)))
        assert any(m["id"] == mtg_id for m in list_resp.json())

        await admin_client.post(
            attendees_url(str(project.id), mtg_id),
            json={"user_id": str(admin_user.id), "role": "organizer"},
        )

        update_resp = await admin_client.put(
            meeting_detail_url(str(project.id), mtg_id),
            json={"status": "completed", "summary": "All items discussed"},
        )
        assert update_resp.status_code == 200
        assert update_resp.json()["status"] == "completed"

        delete_resp = await admin_client.delete(meeting_detail_url(str(project.id), mtg_id))
        assert delete_resp.status_code == 200

        gone_resp = await admin_client.get(meeting_detail_url(str(project.id), mtg_id))
        assert gone_resp.status_code == 404

    @pytest.mark.asyncio
    async def test_create_update_then_verify(self, admin_client: AsyncClient, project: Project):
        created = await create_meeting_via_api(admin_client, str(project.id))
        await admin_client.put(
            meeting_detail_url(str(project.id), created["id"]),
            json={"title": "Updated Meeting", "description": "Modified", "status": "invitations_sent"},
        )
        get_resp = await admin_client.get(meeting_detail_url(str(project.id), created["id"]))
        data = get_resp.json()
        assert data["title"] == "Updated Meeting"
        assert data["description"] == "Modified"
        assert data["status"] == "invitations_sent"


class TestParametrizedCreateAllFields:

    @pytest.mark.asyncio
    @pytest.mark.parametrize("payload,expected_status,desc", [
        ({"title": "AB", "scheduled_date": "2025-06-15T10:00:00"}, 200, "minimal payload"),
        ({"title": "Meeting", "scheduled_date": "2025-06-15T10:00:00", "meeting_type": "review"}, 200, "with type"),
        ({"title": "Meeting", "scheduled_date": "2025-06-15T10:00:00", "location": "Room A"}, 200, "with location"),
        ({"title": "Meeting", "scheduled_date": "2025-06-15T10:00:00", "description": "Desc"}, 200, "with desc"),
        ({"title": "Meeting", "scheduled_date": "2025-06-15T10:00:00", "scheduled_time": "14:00"}, 200, "with time"),
        ({}, 422, "empty payload"),
        ({"scheduled_date": "2025-06-15T10:00:00"}, 422, "missing title"),
        ({"title": "No Date"}, 422, "missing date"),
        ({"title": "", "scheduled_date": "2025-06-15T10:00:00"}, 422, "empty title"),
        ({"title": "A", "scheduled_date": "2025-06-15T10:00:00"}, 422, "title too short"),
        ({"title": "A" * 256, "scheduled_date": "2025-06-15T10:00:00"}, 422, "title too long"),
    ])
    async def test_create_parametrized(self, admin_client: AsyncClient, project: Project, payload, expected_status, desc):
        resp = await admin_client.post(meetings_url(str(project.id)), json=payload)
        assert resp.status_code == expected_status, f"Failed: {desc}"


class TestParametrizedUpdateFields:

    @pytest.mark.asyncio
    @pytest.mark.parametrize("field,value,camel_key,expected_status", [
        ("title", "Updated", "title", 200),
        ("title", "AB", "title", 200),
        ("title", "A" * 255, "title", 200),
        ("title", "A", "title", 422),
        ("title", "A" * 256, "title", 422),
        ("description", "Short", "description", 200),
        ("description", "A" * 2000, "description", 200),
        ("description", "A" * 2001, "description", 422),
        ("meeting_type", "review", "meetingType", 200),
        ("meeting_type", "A" * 50, "meetingType", 200),
        ("meeting_type", "A" * 51, "meetingType", 422),
        ("location", "Room B", "location", 200),
        ("location", "A" * 255, "location", 200),
        ("location", "A" * 256, "location", 422),
    ])
    async def test_update_field_parametrized(
        self, admin_client: AsyncClient, project: Project, field, value, camel_key, expected_status
    ):
        created = await create_meeting_via_api(admin_client, str(project.id))
        resp = await admin_client.put(
            meeting_detail_url(str(project.id), created["id"]),
            json={field: value},
        )
        assert resp.status_code == expected_status, f"Update {field}={repr(value)[:40]}"
        if expected_status == 200:
            assert resp.json()[camel_key] == value


class TestResponseFormat:

    @pytest.mark.asyncio
    async def test_response_id_is_uuid_string(self, admin_client: AsyncClient, project: Project):
        created = await create_meeting_via_api(admin_client, str(project.id))
        try:
            uuid.UUID(created["id"])
        except ValueError:
            pytest.fail("id is not a valid UUID string")

    @pytest.mark.asyncio
    async def test_response_project_id_matches(self, admin_client: AsyncClient, project: Project):
        created = await create_meeting_via_api(admin_client, str(project.id))
        assert created["projectId"] == str(project.id)

    @pytest.mark.asyncio
    async def test_response_created_by_structure(self, admin_client: AsyncClient, project: Project):
        created = await create_meeting_via_api(admin_client, str(project.id))
        cb = created["createdBy"]
        assert cb is not None
        assert "id" in cb
        assert "email" in cb

    @pytest.mark.asyncio
    @pytest.mark.parametrize("camel_field", [
        "projectId", "meetingType", "scheduledDate", "scheduledTime",
        "createdAt", "googleEventId", "actionItems",
    ])
    async def test_camel_case_field_present(self, admin_client: AsyncClient, project: Project, camel_field):
        resp = await admin_client.post(meetings_url(str(project.id)), json=valid_meeting_payload())
        assert camel_field in resp.json()

    @pytest.mark.asyncio
    async def test_list_response_items_have_attendees_array(self, admin_client: AsyncClient, project: Project):
        await create_meeting_via_api(admin_client, str(project.id))
        resp = await admin_client.get(meetings_url(str(project.id)))
        for item in resp.json():
            assert isinstance(item["attendees"], list)

    @pytest.mark.asyncio
    async def test_created_at_is_set(self, admin_client: AsyncClient, project: Project):
        created = await create_meeting_via_api(admin_client, str(project.id))
        assert created["createdAt"] is not None

    @pytest.mark.asyncio
    async def test_google_event_id_null_by_default(self, admin_client: AsyncClient, project: Project):
        created = await create_meeting_via_api(admin_client, str(project.id))
        assert created["googleEventId"] is None

    @pytest.mark.asyncio
    async def test_summary_null_by_default(self, admin_client: AsyncClient, project: Project):
        created = await create_meeting_via_api(admin_client, str(project.id))
        assert created["summary"] is None

    @pytest.mark.asyncio
    async def test_action_items_null_or_list_by_default(self, admin_client: AsyncClient, project: Project):
        created = await create_meeting_via_api(admin_client, str(project.id))
        assert created["actionItems"] is None or isinstance(created["actionItems"], list)


class TestScheduledTimeField:

    @pytest.mark.asyncio
    @pytest.mark.parametrize("time_val", ["10:00", "14:30", "23:59", "00:00", "09:00 AM"])
    async def test_valid_scheduled_times(self, admin_client: AsyncClient, project: Project, time_val):
        payload = valid_meeting_payload(scheduled_time=time_val)
        resp = await admin_client.post(meetings_url(str(project.id)), json=payload)
        assert resp.status_code == 200
        assert resp.json()["scheduledTime"] == time_val

    @pytest.mark.asyncio
    async def test_null_scheduled_time(self, admin_client: AsyncClient, project: Project):
        payload = valid_meeting_payload(scheduled_time=None)
        resp = await admin_client.post(meetings_url(str(project.id)), json=payload)
        assert resp.status_code == 200
        assert resp.json()["scheduledTime"] is None

    @pytest.mark.asyncio
    async def test_update_scheduled_time(self, admin_client: AsyncClient, project: Project):
        created = await create_meeting_via_api(admin_client, str(project.id))
        resp = await admin_client.put(
            meeting_detail_url(str(project.id), created["id"]),
            json={"scheduled_time": "15:30"},
        )
        assert resp.status_code == 200
        assert resp.json()["scheduledTime"] == "15:30"


class TestNotFoundAndEdgeCases:

    @pytest.mark.asyncio
    async def test_double_delete(self, admin_client: AsyncClient, project: Project):
        created = await create_meeting_via_api(admin_client, str(project.id))
        await admin_client.delete(meeting_detail_url(str(project.id), created["id"]))
        resp = await admin_client.delete(meeting_detail_url(str(project.id), created["id"]))
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_update_deleted_meeting(self, admin_client: AsyncClient, project: Project):
        created = await create_meeting_via_api(admin_client, str(project.id))
        await admin_client.delete(meeting_detail_url(str(project.id), created["id"]))
        resp = await admin_client.put(
            meeting_detail_url(str(project.id), created["id"]),
            json={"title": "Ghost"},
        )
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_create_meeting_with_empty_string_description(self, admin_client: AsyncClient, project: Project):
        payload = valid_meeting_payload(description="")
        resp = await admin_client.post(meetings_url(str(project.id)), json=payload)
        assert resp.status_code == 200

    @pytest.mark.asyncio
    async def test_create_meeting_with_whitespace_title(self, admin_client: AsyncClient, project: Project):
        payload = valid_meeting_payload(title="   Valid Title   ")
        resp = await admin_client.post(meetings_url(str(project.id)), json=payload)
        assert resp.status_code == 200

    @pytest.mark.asyncio
    async def test_create_meeting_with_special_chars_in_title(self, admin_client: AsyncClient, project: Project):
        payload = valid_meeting_payload(title="Meeting #1 - Q&A (Final)")
        resp = await admin_client.post(meetings_url(str(project.id)), json=payload)
        assert resp.status_code == 200

    @pytest.mark.asyncio
    async def test_create_meeting_with_unicode_title(self, admin_client: AsyncClient, project: Project):
        payload = valid_meeting_payload(title="פגישת צוות שבועית")
        resp = await admin_client.post(meetings_url(str(project.id)), json=payload)
        assert resp.status_code == 200
        assert resp.json()["title"] == "פגישת צוות שבועית"

    @pytest.mark.asyncio
    async def test_update_with_empty_json(self, admin_client: AsyncClient, project: Project):
        created = await create_meeting_via_api(admin_client, str(project.id))
        resp = await admin_client.put(
            meeting_detail_url(str(project.id), created["id"]),
            json={},
        )
        assert resp.status_code == 200
        assert resp.json()["title"] == created["title"]

    @pytest.mark.asyncio
    async def test_meeting_from_different_projects_not_visible(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        proj_a = project
        proj_b = Project(
            id=uuid.uuid4(), name="Project B", code="PRJ-B",
            status="active", created_by_id=admin_user.id,
        )
        db.add(proj_b)
        await db.flush()
        db.add(ProjectMember(project_id=proj_b.id, user_id=admin_user.id, role="project_admin"))
        await db.commit()
        await create_meeting_via_api(admin_client, str(proj_a.id), valid_meeting_payload(title="Meeting A"))
        await create_meeting_via_api(admin_client, str(proj_b.id), valid_meeting_payload(title="Meeting B"))
        resp_a = await admin_client.get(meetings_url(str(proj_a.id)))
        resp_b = await admin_client.get(meetings_url(str(proj_b.id)))
        titles_a = [m["title"] for m in resp_a.json()]
        titles_b = [m["title"] for m in resp_b.json()]
        assert "Meeting A" in titles_a
        assert "Meeting B" not in titles_a
        assert "Meeting B" in titles_b
        assert "Meeting A" not in titles_b
