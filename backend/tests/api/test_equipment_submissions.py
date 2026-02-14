import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.validators import MAX_DESCRIPTION_LENGTH, MAX_NAME_LENGTH, MAX_NOTES_LENGTH
from app.models.approval_decision import ApprovalDecision
from app.models.equipment_submission import EquipmentSubmission
from app.models.equipment_template import EquipmentTemplate
from app.models.project import Project, ProjectMember
from app.models.user import User

BASE = "/api/v1"
FAKE_UUID = "00000000-0000-0000-0000-000000000000"


async def make_template(db: AsyncSession) -> EquipmentTemplate:
    template = EquipmentTemplate(
        id=uuid.uuid4(),
        name="Test Template",
        name_he="תבנית בדיקה",
        category="Testing",
    )
    db.add(template)
    await db.flush()
    return template


async def make_project(db: AsyncSession, user: User) -> Project:
    proj = Project(
        id=uuid.uuid4(),
        name="Sub Test Project",
        code=f"STP-{uuid.uuid4().hex[:6].upper()}",
        description="For submission tests",
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
    await db.flush()
    return proj


async def make_submission(
    db: AsyncSession,
    project: Project,
    template: EquipmentTemplate,
    user: User,
    status: str = "draft",
    name: str = "Test Submission",
) -> EquipmentSubmission:
    sub = EquipmentSubmission(
        id=uuid.uuid4(),
        project_id=project.id,
        template_id=template.id,
        name=name,
        description="Test description",
        specifications={"key": "value"},
        status=status,
        notes="Test notes",
        created_by_id=user.id,
    )
    db.add(sub)
    await db.flush()
    return sub


async def make_decision(
    db: AsyncSession,
    submission: EquipmentSubmission,
    user: User,
    decision: str = "approved",
    comments: str | None = None,
) -> ApprovalDecision:
    dec = ApprovalDecision(
        id=uuid.uuid4(),
        submission_id=submission.id,
        decision=decision,
        comments=comments,
        decided_by_id=user.id,
    )
    db.add(dec)
    await db.flush()
    return dec


class TestSubmissionListEndpoint:

    async def test_list_empty(self, admin_client: AsyncClient, db: AsyncSession, admin_user: User):
        proj = await make_project(db, admin_user)
        resp = await admin_client.get(f"{BASE}/projects/{proj.id}/equipment-submissions")
        assert resp.status_code == 200
        assert resp.json() == []

    async def test_list_returns_submissions(self, admin_client: AsyncClient, db: AsyncSession, admin_user: User):
        proj = await make_project(db, admin_user)
        tpl = await make_template(db)
        await make_submission(db, proj, tpl, admin_user, name="Sub A")
        await make_submission(db, proj, tpl, admin_user, name="Sub B")
        await db.commit()
        resp = await admin_client.get(f"{BASE}/projects/{proj.id}/equipment-submissions")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 2

    async def test_list_filters_by_project(self, admin_client: AsyncClient, db: AsyncSession, admin_user: User):
        proj1 = await make_project(db, admin_user)
        proj2 = await make_project(db, admin_user)
        tpl = await make_template(db)
        await make_submission(db, proj1, tpl, admin_user, name="Proj1 Sub")
        await make_submission(db, proj2, tpl, admin_user, name="Proj2 Sub")
        await db.commit()
        resp = await admin_client.get(f"{BASE}/projects/{proj1.id}/equipment-submissions")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["name"] == "Proj1 Sub"

    async def test_list_nonexistent_project_returns_403(self, admin_client: AsyncClient):
        resp = await admin_client.get(f"{BASE}/projects/{FAKE_UUID}/equipment-submissions")
        assert resp.status_code == 403

    @pytest.mark.parametrize("count", [1, 3, 5])
    async def test_list_multiple_counts(self, admin_client: AsyncClient, db: AsyncSession, admin_user: User, count: int):
        proj = await make_project(db, admin_user)
        tpl = await make_template(db)
        for i in range(count):
            await make_submission(db, proj, tpl, admin_user, name=f"Sub {i}")
        await db.commit()
        resp = await admin_client.get(f"{BASE}/projects/{proj.id}/equipment-submissions")
        assert resp.status_code == 200
        assert len(resp.json()) == count


class TestSubmissionCreateEndpoint:

    async def test_create_success(self, admin_client: AsyncClient, db: AsyncSession, admin_user: User):
        proj = await make_project(db, admin_user)
        tpl = await make_template(db)
        await db.commit()
        payload = {"template_id": str(tpl.id), "name": "New Submission"}
        resp = await admin_client.post(f"{BASE}/projects/{proj.id}/equipment-submissions", json=payload)
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "New Submission"
        assert data["status"] == "draft"

    async def test_create_with_all_fields(self, admin_client: AsyncClient, db: AsyncSession, admin_user: User):
        proj = await make_project(db, admin_user)
        tpl = await make_template(db)
        await db.commit()
        payload = {
            "template_id": str(tpl.id),
            "name": "Full Submission",
            "description": "A detailed description",
            "specifications": {"weight": "100kg"},
            "notes": "Some notes here",
        }
        resp = await admin_client.post(f"{BASE}/projects/{proj.id}/equipment-submissions", json=payload)
        assert resp.status_code == 201
        data = resp.json()
        assert data["description"] == "A detailed description"
        assert data["specifications"] == {"weight": "100kg"}
        assert data["notes"] == "Some notes here"

    async def test_create_unauthenticated(self, client: AsyncClient, db: AsyncSession, admin_user: User):
        proj = await make_project(db, admin_user)
        tpl = await make_template(db)
        await db.commit()
        payload = {"template_id": str(tpl.id), "name": "Unauth Sub"}
        resp = await client.post(f"{BASE}/projects/{proj.id}/equipment-submissions", json=payload)
        assert resp.status_code == 401

    async def test_create_missing_name(self, admin_client: AsyncClient, db: AsyncSession, admin_user: User):
        proj = await make_project(db, admin_user)
        tpl = await make_template(db)
        await db.commit()
        payload = {"template_id": str(tpl.id)}
        resp = await admin_client.post(f"{BASE}/projects/{proj.id}/equipment-submissions", json=payload)
        assert resp.status_code == 422

    async def test_create_missing_template_id(self, admin_client: AsyncClient, db: AsyncSession, admin_user: User):
        proj = await make_project(db, admin_user)
        await db.commit()
        payload = {"name": "No Template"}
        resp = await admin_client.post(f"{BASE}/projects/{proj.id}/equipment-submissions", json=payload)
        assert resp.status_code == 422

    @pytest.mark.parametrize(
        "name,expected_status",
        [
            ("", 422),
            ("A", 422),
            ("AB", 201),
            ("A" * 255, 201),
            ("A" * 256, 422),
            ("A" * 300, 422),
            ("  AB  ", 201),
            ("Ab", 201),
            ("A" * MAX_NAME_LENGTH, 201),
        ],
        ids=[
            "empty_name",
            "one_char_name",
            "min_valid_name",
            "max_valid_name_255",
            "over_max_name_256",
            "way_over_name_300",
            "trimmed_valid_name",
            "two_char_mixed_case",
            "exact_max_name_length",
        ],
    )
    async def test_create_name_validation(
        self, admin_client: AsyncClient, db: AsyncSession, admin_user: User, name: str, expected_status: int
    ):
        proj = await make_project(db, admin_user)
        tpl = await make_template(db)
        await db.commit()
        payload = {"template_id": str(tpl.id), "name": name}
        resp = await admin_client.post(f"{BASE}/projects/{proj.id}/equipment-submissions", json=payload)
        assert resp.status_code == expected_status

    @pytest.mark.parametrize(
        "description,expected_status",
        [
            (None, 201),
            ("Valid description", 201),
            ("D" * MAX_DESCRIPTION_LENGTH, 201),
            ("D" * (MAX_DESCRIPTION_LENGTH + 1), 422),
            ("", 201),
            ("Short", 201),
        ],
        ids=[
            "none_description",
            "valid_description",
            "max_length_description",
            "over_max_description",
            "empty_string_description",
            "short_description",
        ],
    )
    async def test_create_description_validation(
        self, admin_client: AsyncClient, db: AsyncSession, admin_user: User, description: str | None, expected_status: int
    ):
        proj = await make_project(db, admin_user)
        tpl = await make_template(db)
        await db.commit()
        payload = {"template_id": str(tpl.id), "name": "Desc Test"}
        if description is not None:
            payload["description"] = description
        resp = await admin_client.post(f"{BASE}/projects/{proj.id}/equipment-submissions", json=payload)
        assert resp.status_code == expected_status

    @pytest.mark.parametrize(
        "notes,expected_status",
        [
            (None, 201),
            ("Valid notes", 201),
            ("N" * MAX_NOTES_LENGTH, 201),
            ("N" * (MAX_NOTES_LENGTH + 1), 422),
            ("", 201),
            ("Quick note", 201),
        ],
        ids=[
            "none_notes",
            "valid_notes",
            "max_length_notes",
            "over_max_notes",
            "empty_string_notes",
            "short_notes",
        ],
    )
    async def test_create_notes_validation(
        self, admin_client: AsyncClient, db: AsyncSession, admin_user: User, notes: str | None, expected_status: int
    ):
        proj = await make_project(db, admin_user)
        tpl = await make_template(db)
        await db.commit()
        payload = {"template_id": str(tpl.id), "name": "Notes Test"}
        if notes is not None:
            payload["notes"] = notes
        resp = await admin_client.post(f"{BASE}/projects/{proj.id}/equipment-submissions", json=payload)
        assert resp.status_code == expected_status

    async def test_create_nonexistent_template_id(self, admin_client: AsyncClient, db: AsyncSession, admin_user: User):
        proj = await make_project(db, admin_user)
        await db.commit()
        payload = {"template_id": FAKE_UUID, "name": "Bad Template"}
        resp = await admin_client.post(f"{BASE}/projects/{proj.id}/equipment-submissions", json=payload)
        assert resp.status_code in (201, 400, 422, 500)

    async def test_create_invalid_template_id_format(self, admin_client: AsyncClient, db: AsyncSession, admin_user: User):
        proj = await make_project(db, admin_user)
        await db.commit()
        payload = {"template_id": "not-a-uuid", "name": "Bad Format"}
        resp = await admin_client.post(f"{BASE}/projects/{proj.id}/equipment-submissions", json=payload)
        assert resp.status_code == 422

    @pytest.mark.parametrize(
        "specifications",
        [
            None,
            {},
            {"key": "value"},
            {"nested": "data", "count": 42},
            {"bool_val": True, "null_val": None, "num": 3.14},
        ],
        ids=["none_specs", "empty_dict", "simple_kv", "mixed_types", "bool_null_number"],
    )
    async def test_create_specifications_variants(
        self, admin_client: AsyncClient, db: AsyncSession, admin_user: User, specifications: dict | None
    ):
        proj = await make_project(db, admin_user)
        tpl = await make_template(db)
        await db.commit()
        payload = {"template_id": str(tpl.id), "name": "Spec Test"}
        if specifications is not None:
            payload["specifications"] = specifications
        resp = await admin_client.post(f"{BASE}/projects/{proj.id}/equipment-submissions", json=payload)
        assert resp.status_code == 201

    @pytest.mark.parametrize(
        "xss_input",
        [
            '<script>alert("xss")</script>',
            'javascript:alert(1)',
            '<img src=x onerror=alert(1)>',
            '<iframe src="evil.com"></iframe>',
            '<svg onload=alert(1)></svg>',
            '<style>body{display:none}</style>',
            '<object data="evil.swf"></object>',
            '<embed src="evil.swf">',
            '<link rel="stylesheet" href="evil.css">',
            '<meta http-equiv="refresh" content="0;url=evil.com">',
        ],
        ids=[
            "script_tag",
            "javascript_protocol",
            "img_onerror",
            "iframe_injection",
            "svg_onload",
            "style_injection",
            "object_injection",
            "embed_injection",
            "link_injection",
            "meta_refresh",
        ],
    )
    async def test_create_xss_sanitized_in_name(
        self, admin_client: AsyncClient, db: AsyncSession, admin_user: User, xss_input: str
    ):
        proj = await make_project(db, admin_user)
        tpl = await make_template(db)
        await db.commit()
        safe_prefix = "Safe Name "
        payload = {"template_id": str(tpl.id), "name": safe_prefix + xss_input}
        resp = await admin_client.post(f"{BASE}/projects/{proj.id}/equipment-submissions", json=payload)
        if resp.status_code == 201:
            data = resp.json()
            assert "<script" not in data["name"].lower()
            assert "javascript:" not in data["name"].lower()
            assert "onerror=" not in data["name"].lower()

    @pytest.mark.parametrize(
        "xss_input",
        [
            '<script>alert("xss")</script>',
            '<img src=x onerror=alert(1)>',
            '<iframe src="evil.com"></iframe>',
        ],
        ids=["script_in_desc", "img_in_desc", "iframe_in_desc"],
    )
    async def test_create_xss_sanitized_in_description(
        self, admin_client: AsyncClient, db: AsyncSession, admin_user: User, xss_input: str
    ):
        proj = await make_project(db, admin_user)
        tpl = await make_template(db)
        await db.commit()
        payload = {"template_id": str(tpl.id), "name": "XSS Desc", "description": xss_input}
        resp = await admin_client.post(f"{BASE}/projects/{proj.id}/equipment-submissions", json=payload)
        if resp.status_code == 201:
            data = resp.json()
            assert "<script" not in (data.get("description") or "").lower()

    @pytest.mark.parametrize(
        "xss_input",
        [
            '<script>alert("xss")</script>',
            '<img src=x onerror=alert(1)>',
            '<iframe src="evil.com"></iframe>',
        ],
        ids=["script_in_notes", "img_in_notes", "iframe_in_notes"],
    )
    async def test_create_xss_sanitized_in_notes(
        self, admin_client: AsyncClient, db: AsyncSession, admin_user: User, xss_input: str
    ):
        proj = await make_project(db, admin_user)
        tpl = await make_template(db)
        await db.commit()
        payload = {"template_id": str(tpl.id), "name": "XSS Notes", "notes": xss_input}
        resp = await admin_client.post(f"{BASE}/projects/{proj.id}/equipment-submissions", json=payload)
        if resp.status_code == 201:
            data = resp.json()
            assert "<script" not in (data.get("notes") or "").lower()


class TestSubmissionGetEndpoint:

    async def test_get_existing(self, admin_client: AsyncClient, db: AsyncSession, admin_user: User):
        proj = await make_project(db, admin_user)
        tpl = await make_template(db)
        sub = await make_submission(db, proj, tpl, admin_user)
        await db.commit()
        resp = await admin_client.get(f"{BASE}/projects/{proj.id}/equipment-submissions/{sub.id}")
        assert resp.status_code == 200
        assert resp.json()["name"] == "Test Submission"

    async def test_get_nonexistent_submission(self, admin_client: AsyncClient, db: AsyncSession, admin_user: User):
        proj = await make_project(db, admin_user)
        await db.commit()
        resp = await admin_client.get(f"{BASE}/projects/{proj.id}/equipment-submissions/{FAKE_UUID}")
        assert resp.status_code == 404

    async def test_get_nonexistent_project(self, admin_client: AsyncClient, db: AsyncSession, admin_user: User):
        proj = await make_project(db, admin_user)
        tpl = await make_template(db)
        sub = await make_submission(db, proj, tpl, admin_user)
        await db.commit()
        resp = await admin_client.get(f"{BASE}/projects/{FAKE_UUID}/equipment-submissions/{sub.id}")
        assert resp.status_code == 403

    async def test_get_wrong_project(self, admin_client: AsyncClient, db: AsyncSession, admin_user: User):
        proj1 = await make_project(db, admin_user)
        proj2 = await make_project(db, admin_user)
        tpl = await make_template(db)
        sub = await make_submission(db, proj1, tpl, admin_user)
        await db.commit()
        resp = await admin_client.get(f"{BASE}/projects/{proj2.id}/equipment-submissions/{sub.id}")
        assert resp.status_code == 404

    @pytest.mark.parametrize(
        "invalid_id",
        ["not-a-uuid", "12345"],
        ids=["text_id", "numeric_id"],
    )
    async def test_get_invalid_submission_id_format(
        self, admin_client: AsyncClient, db: AsyncSession, admin_user: User, invalid_id: str
    ):
        proj = await make_project(db, admin_user)
        await db.commit()
        resp = await admin_client.get(f"{BASE}/projects/{proj.id}/equipment-submissions/{invalid_id}")
        assert resp.status_code == 422 or resp.status_code == 404


class TestSubmissionUpdateEndpoint:

    async def test_update_name(self, admin_client: AsyncClient, db: AsyncSession, admin_user: User):
        proj = await make_project(db, admin_user)
        tpl = await make_template(db)
        sub = await make_submission(db, proj, tpl, admin_user)
        await db.commit()
        resp = await admin_client.put(
            f"{BASE}/projects/{proj.id}/equipment-submissions/{sub.id}",
            json={"name": "Updated Name"},
        )
        assert resp.status_code == 200
        assert resp.json()["name"] == "Updated Name"

    async def test_update_description(self, admin_client: AsyncClient, db: AsyncSession, admin_user: User):
        proj = await make_project(db, admin_user)
        tpl = await make_template(db)
        sub = await make_submission(db, proj, tpl, admin_user)
        await db.commit()
        resp = await admin_client.put(
            f"{BASE}/projects/{proj.id}/equipment-submissions/{sub.id}",
            json={"description": "New desc"},
        )
        assert resp.status_code == 200
        assert resp.json()["description"] == "New desc"

    async def test_update_notes(self, admin_client: AsyncClient, db: AsyncSession, admin_user: User):
        proj = await make_project(db, admin_user)
        tpl = await make_template(db)
        sub = await make_submission(db, proj, tpl, admin_user)
        await db.commit()
        resp = await admin_client.put(
            f"{BASE}/projects/{proj.id}/equipment-submissions/{sub.id}",
            json={"notes": "Updated notes"},
        )
        assert resp.status_code == 200
        assert resp.json()["notes"] == "Updated notes"

    async def test_update_specifications(self, admin_client: AsyncClient, db: AsyncSession, admin_user: User):
        proj = await make_project(db, admin_user)
        tpl = await make_template(db)
        sub = await make_submission(db, proj, tpl, admin_user)
        await db.commit()
        new_specs = {"voltage": "220V", "amps": 15}
        resp = await admin_client.put(
            f"{BASE}/projects/{proj.id}/equipment-submissions/{sub.id}",
            json={"specifications": new_specs},
        )
        assert resp.status_code == 200
        assert resp.json()["specifications"]["voltage"] == "220V"

    async def test_update_multiple_fields(self, admin_client: AsyncClient, db: AsyncSession, admin_user: User):
        proj = await make_project(db, admin_user)
        tpl = await make_template(db)
        sub = await make_submission(db, proj, tpl, admin_user)
        await db.commit()
        resp = await admin_client.put(
            f"{BASE}/projects/{proj.id}/equipment-submissions/{sub.id}",
            json={"name": "Multi Update", "description": "Multi desc", "notes": "Multi notes"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["name"] == "Multi Update"
        assert data["description"] == "Multi desc"
        assert data["notes"] == "Multi notes"

    async def test_update_unauthenticated(self, client: AsyncClient, db: AsyncSession, admin_user: User):
        proj = await make_project(db, admin_user)
        tpl = await make_template(db)
        sub = await make_submission(db, proj, tpl, admin_user)
        await db.commit()
        resp = await client.put(
            f"{BASE}/projects/{proj.id}/equipment-submissions/{sub.id}",
            json={"name": "Unauth Update"},
        )
        assert resp.status_code == 401

    async def test_update_nonexistent_submission(self, admin_client: AsyncClient, db: AsyncSession, admin_user: User):
        proj = await make_project(db, admin_user)
        await db.commit()
        resp = await admin_client.put(
            f"{BASE}/projects/{proj.id}/equipment-submissions/{FAKE_UUID}",
            json={"name": "Ghost"},
        )
        assert resp.status_code == 404

    async def test_update_approved_submission_blocked(self, admin_client: AsyncClient, db: AsyncSession, admin_user: User):
        proj = await make_project(db, admin_user)
        tpl = await make_template(db)
        sub = await make_submission(db, proj, tpl, admin_user, status="approved")
        await db.commit()
        resp = await admin_client.put(
            f"{BASE}/projects/{proj.id}/equipment-submissions/{sub.id}",
            json={"name": "Blocked Update"},
        )
        assert resp.status_code == 400

    @pytest.mark.parametrize(
        "name,expected_status",
        [
            ("A", 422),
            ("AB", 200),
            ("A" * 255, 200),
            ("A" * 256, 422),
        ],
        ids=["one_char_update", "min_valid_update", "max_valid_update", "over_max_update"],
    )
    async def test_update_name_validation(
        self, admin_client: AsyncClient, db: AsyncSession, admin_user: User, name: str, expected_status: int
    ):
        proj = await make_project(db, admin_user)
        tpl = await make_template(db)
        sub = await make_submission(db, proj, tpl, admin_user)
        await db.commit()
        resp = await admin_client.put(
            f"{BASE}/projects/{proj.id}/equipment-submissions/{sub.id}",
            json={"name": name},
        )
        assert resp.status_code == expected_status

    @pytest.mark.parametrize(
        "description,expected_status",
        [
            ("D" * MAX_DESCRIPTION_LENGTH, 200),
            ("D" * (MAX_DESCRIPTION_LENGTH + 1), 422),
            ("Valid", 200),
            (None, 200),
        ],
        ids=["max_desc_update", "over_max_desc_update", "valid_desc_update", "null_desc_update"],
    )
    async def test_update_description_validation(
        self, admin_client: AsyncClient, db: AsyncSession, admin_user: User, description: str | None, expected_status: int
    ):
        proj = await make_project(db, admin_user)
        tpl = await make_template(db)
        sub = await make_submission(db, proj, tpl, admin_user)
        await db.commit()
        payload = {}
        if description is not None:
            payload["description"] = description
        else:
            payload["description"] = None
        resp = await admin_client.put(
            f"{BASE}/projects/{proj.id}/equipment-submissions/{sub.id}",
            json=payload,
        )
        assert resp.status_code == expected_status

    @pytest.mark.parametrize(
        "notes,expected_status",
        [
            ("N" * MAX_NOTES_LENGTH, 200),
            ("N" * (MAX_NOTES_LENGTH + 1), 422),
            ("Valid note", 200),
            (None, 200),
        ],
        ids=["max_notes_update", "over_max_notes_update", "valid_notes_update", "null_notes_update"],
    )
    async def test_update_notes_validation(
        self, admin_client: AsyncClient, db: AsyncSession, admin_user: User, notes: str | None, expected_status: int
    ):
        proj = await make_project(db, admin_user)
        tpl = await make_template(db)
        sub = await make_submission(db, proj, tpl, admin_user)
        await db.commit()
        payload = {}
        if notes is not None:
            payload["notes"] = notes
        else:
            payload["notes"] = None
        resp = await admin_client.put(
            f"{BASE}/projects/{proj.id}/equipment-submissions/{sub.id}",
            json=payload,
        )
        assert resp.status_code == expected_status

    @pytest.mark.parametrize(
        "xss_input",
        [
            '<script>alert("xss")</script>',
            '<img src=x onerror=alert(1)>',
            '<iframe src="evil.com"></iframe>',
        ],
        ids=["script_update", "img_update", "iframe_update"],
    )
    async def test_update_xss_sanitized_in_name(
        self, admin_client: AsyncClient, db: AsyncSession, admin_user: User, xss_input: str
    ):
        proj = await make_project(db, admin_user)
        tpl = await make_template(db)
        sub = await make_submission(db, proj, tpl, admin_user)
        await db.commit()
        resp = await admin_client.put(
            f"{BASE}/projects/{proj.id}/equipment-submissions/{sub.id}",
            json={"name": "Clean " + xss_input},
        )
        if resp.status_code == 200:
            data = resp.json()
            assert "<script" not in data["name"].lower()
            assert "onerror=" not in data["name"].lower()

    @pytest.mark.parametrize(
        "xss_input",
        [
            '<script>alert("xss")</script>',
            '<img src=x onerror=alert(1)>',
        ],
        ids=["script_update_desc", "img_update_desc"],
    )
    async def test_update_xss_sanitized_in_description(
        self, admin_client: AsyncClient, db: AsyncSession, admin_user: User, xss_input: str
    ):
        proj = await make_project(db, admin_user)
        tpl = await make_template(db)
        sub = await make_submission(db, proj, tpl, admin_user)
        await db.commit()
        resp = await admin_client.put(
            f"{BASE}/projects/{proj.id}/equipment-submissions/{sub.id}",
            json={"description": xss_input},
        )
        if resp.status_code == 200:
            data = resp.json()
            assert "<script" not in (data.get("description") or "").lower()

    @pytest.mark.parametrize(
        "xss_input",
        [
            '<script>alert("xss")</script>',
            '<img src=x onerror=alert(1)>',
        ],
        ids=["script_update_notes", "img_update_notes"],
    )
    async def test_update_xss_sanitized_in_notes(
        self, admin_client: AsyncClient, db: AsyncSession, admin_user: User, xss_input: str
    ):
        proj = await make_project(db, admin_user)
        tpl = await make_template(db)
        sub = await make_submission(db, proj, tpl, admin_user)
        await db.commit()
        resp = await admin_client.put(
            f"{BASE}/projects/{proj.id}/equipment-submissions/{sub.id}",
            json={"notes": xss_input},
        )
        if resp.status_code == 200:
            data = resp.json()
            assert "<script" not in (data.get("notes") or "").lower()

    @pytest.mark.parametrize(
        "status_before",
        ["draft", "rejected", "revision_requested"],
        ids=["update_draft", "update_rejected", "update_revision_requested"],
    )
    async def test_update_allowed_for_non_approved_statuses(
        self, admin_client: AsyncClient, db: AsyncSession, admin_user: User, status_before: str
    ):
        proj = await make_project(db, admin_user)
        tpl = await make_template(db)
        sub = await make_submission(db, proj, tpl, admin_user, status=status_before)
        await db.commit()
        resp = await admin_client.put(
            f"{BASE}/projects/{proj.id}/equipment-submissions/{sub.id}",
            json={"name": "Allowed Update"},
        )
        assert resp.status_code == 200


class TestSubmissionDeleteEndpoint:

    async def test_delete_success(self, admin_client: AsyncClient, db: AsyncSession, admin_user: User):
        proj = await make_project(db, admin_user)
        tpl = await make_template(db)
        sub = await make_submission(db, proj, tpl, admin_user)
        await db.commit()
        resp = await admin_client.delete(f"{BASE}/projects/{proj.id}/equipment-submissions/{sub.id}")
        assert resp.status_code == 200

    async def test_delete_unauthenticated(self, client: AsyncClient, db: AsyncSession, admin_user: User):
        proj = await make_project(db, admin_user)
        tpl = await make_template(db)
        sub = await make_submission(db, proj, tpl, admin_user)
        await db.commit()
        resp = await client.delete(f"{BASE}/projects/{proj.id}/equipment-submissions/{sub.id}")
        assert resp.status_code == 401

    async def test_delete_nonexistent(self, admin_client: AsyncClient, db: AsyncSession, admin_user: User):
        proj = await make_project(db, admin_user)
        await db.commit()
        resp = await admin_client.delete(f"{BASE}/projects/{proj.id}/equipment-submissions/{FAKE_UUID}")
        assert resp.status_code == 404

    async def test_delete_removes_from_list(self, admin_client: AsyncClient, db: AsyncSession, admin_user: User):
        proj = await make_project(db, admin_user)
        tpl = await make_template(db)
        sub = await make_submission(db, proj, tpl, admin_user)
        await db.commit()
        await admin_client.delete(f"{BASE}/projects/{proj.id}/equipment-submissions/{sub.id}")
        resp = await admin_client.get(f"{BASE}/projects/{proj.id}/equipment-submissions")
        assert resp.status_code == 200
        assert len(resp.json()) == 0

    async def test_delete_cascade_removes_decisions(self, admin_client: AsyncClient, db: AsyncSession, admin_user: User):
        proj = await make_project(db, admin_user)
        tpl = await make_template(db)
        sub = await make_submission(db, proj, tpl, admin_user)
        await make_decision(db, sub, admin_user, decision="approved")
        await make_decision(db, sub, admin_user, decision="rejected")
        await db.commit()
        sub_id = sub.id
        await admin_client.delete(f"{BASE}/projects/{proj.id}/equipment-submissions/{sub.id}")
        result = await db.execute(select(ApprovalDecision).where(ApprovalDecision.submission_id == sub_id))
        remaining = result.scalars().all()
        assert len(remaining) == 0

    @pytest.mark.parametrize(
        "status",
        ["draft", "rejected", "revision_requested", "approved"],
        ids=["delete_draft", "delete_rejected", "delete_revision", "delete_approved"],
    )
    async def test_delete_any_status(self, admin_client: AsyncClient, db: AsyncSession, admin_user: User, status: str):
        proj = await make_project(db, admin_user)
        tpl = await make_template(db)
        sub = await make_submission(db, proj, tpl, admin_user, status=status)
        await db.commit()
        resp = await admin_client.delete(f"{BASE}/projects/{proj.id}/equipment-submissions/{sub.id}")
        assert resp.status_code == 200


class TestApprovalDecisionCreateEndpoint:

    @pytest.mark.parametrize(
        "decision,expected_status",
        [
            ("approved", "approved"),
            ("rejected", "rejected"),
            ("revision_requested", "revision_requested"),
        ],
        ids=["approve_decision", "reject_decision", "revision_decision"],
    )
    async def test_decision_changes_submission_status(
        self,
        admin_client: AsyncClient,
        db: AsyncSession,
        admin_user: User,
        decision: str,
        expected_status: str,
    ):
        proj = await make_project(db, admin_user)
        tpl = await make_template(db)
        sub = await make_submission(db, proj, tpl, admin_user)
        await db.commit()
        resp = await admin_client.post(
            f"{BASE}/equipment-submissions/{sub.id}/decisions",
            json={"decision": decision},
        )
        assert resp.status_code == 201
        get_resp = await admin_client.get(f"{BASE}/projects/{proj.id}/equipment-submissions/{sub.id}")
        assert get_resp.json()["status"] == expected_status

    async def test_decision_unauthenticated(self, client: AsyncClient, db: AsyncSession, admin_user: User):
        proj = await make_project(db, admin_user)
        tpl = await make_template(db)
        sub = await make_submission(db, proj, tpl, admin_user)
        await db.commit()
        resp = await client.post(
            f"{BASE}/equipment-submissions/{sub.id}/decisions",
            json={"decision": "approved"},
        )
        assert resp.status_code == 401

    async def test_decision_nonexistent_submission(self, admin_client: AsyncClient):
        resp = await admin_client.post(
            f"{BASE}/equipment-submissions/{FAKE_UUID}/decisions",
            json={"decision": "approved"},
        )
        assert resp.status_code == 404

    @pytest.mark.parametrize(
        "invalid_decision",
        ["accepted", "denied", "pending", "", "APPROVED", "Rejected", "unknown", "123"],
        ids=[
            "accepted_invalid",
            "denied_invalid",
            "pending_invalid",
            "empty_invalid",
            "uppercase_approved",
            "capitalized_rejected",
            "unknown_invalid",
            "numeric_invalid",
        ],
    )
    async def test_decision_invalid_value(
        self, admin_client: AsyncClient, db: AsyncSession, admin_user: User, invalid_decision: str
    ):
        proj = await make_project(db, admin_user)
        tpl = await make_template(db)
        sub = await make_submission(db, proj, tpl, admin_user)
        await db.commit()
        resp = await admin_client.post(
            f"{BASE}/equipment-submissions/{sub.id}/decisions",
            json={"decision": invalid_decision},
        )
        assert resp.status_code == 422

    @pytest.mark.parametrize(
        "comments",
        [
            None,
            "Looks good",
            "Needs revision on section 3.2",
            "",
            "A" * 1000,
        ],
        ids=["no_comments", "short_comments", "detailed_comments", "empty_comments", "long_comments"],
    )
    async def test_decision_with_comments(
        self, admin_client: AsyncClient, db: AsyncSession, admin_user: User, comments: str | None
    ):
        proj = await make_project(db, admin_user)
        tpl = await make_template(db)
        sub = await make_submission(db, proj, tpl, admin_user)
        await db.commit()
        payload = {"decision": "approved"}
        if comments is not None:
            payload["comments"] = comments
        resp = await admin_client.post(
            f"{BASE}/equipment-submissions/{sub.id}/decisions",
            json=payload,
        )
        assert resp.status_code == 201
        data = resp.json()
        if comments is not None:
            assert data["comments"] == comments
        else:
            assert data["comments"] is None

    async def test_decision_returns_decided_by_id(self, admin_client: AsyncClient, db: AsyncSession, admin_user: User):
        proj = await make_project(db, admin_user)
        tpl = await make_template(db)
        sub = await make_submission(db, proj, tpl, admin_user)
        await db.commit()
        resp = await admin_client.post(
            f"{BASE}/equipment-submissions/{sub.id}/decisions",
            json={"decision": "approved"},
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["decidedById"] == str(admin_user.id)

    async def test_decision_returns_submission_id(self, admin_client: AsyncClient, db: AsyncSession, admin_user: User):
        proj = await make_project(db, admin_user)
        tpl = await make_template(db)
        sub = await make_submission(db, proj, tpl, admin_user)
        await db.commit()
        resp = await admin_client.post(
            f"{BASE}/equipment-submissions/{sub.id}/decisions",
            json={"decision": "rejected"},
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["submissionId"] == str(sub.id)


class TestApprovedSubmissionProtection:

    async def test_approve_then_update_blocked(self, admin_client: AsyncClient, db: AsyncSession, admin_user: User):
        proj = await make_project(db, admin_user)
        tpl = await make_template(db)
        sub = await make_submission(db, proj, tpl, admin_user)
        await db.commit()
        approve_resp = await admin_client.post(
            f"{BASE}/equipment-submissions/{sub.id}/decisions",
            json={"decision": "approved"},
        )
        assert approve_resp.status_code == 201
        update_resp = await admin_client.put(
            f"{BASE}/projects/{proj.id}/equipment-submissions/{sub.id}",
            json={"name": "Should Fail"},
        )
        assert update_resp.status_code == 400

    @pytest.mark.parametrize(
        "field,value",
        [
            ("name", "New Name After Approve"),
            ("description", "New Description After Approve"),
            ("notes", "New Notes After Approve"),
            ("specifications", {"new_key": "new_val"}),
        ],
        ids=["update_name_after_approve", "update_desc_after_approve", "update_notes_after_approve", "update_specs_after_approve"],
    )
    async def test_approved_blocks_all_field_updates(
        self, admin_client: AsyncClient, db: AsyncSession, admin_user: User, field: str, value
    ):
        proj = await make_project(db, admin_user)
        tpl = await make_template(db)
        sub = await make_submission(db, proj, tpl, admin_user)
        await db.commit()
        await admin_client.post(
            f"{BASE}/equipment-submissions/{sub.id}/decisions",
            json={"decision": "approved"},
        )
        resp = await admin_client.put(
            f"{BASE}/projects/{proj.id}/equipment-submissions/{sub.id}",
            json={field: value},
        )
        assert resp.status_code == 400

    async def test_reject_then_update_allowed(self, admin_client: AsyncClient, db: AsyncSession, admin_user: User):
        proj = await make_project(db, admin_user)
        tpl = await make_template(db)
        sub = await make_submission(db, proj, tpl, admin_user)
        await db.commit()
        await admin_client.post(
            f"{BASE}/equipment-submissions/{sub.id}/decisions",
            json={"decision": "rejected"},
        )
        resp = await admin_client.put(
            f"{BASE}/projects/{proj.id}/equipment-submissions/{sub.id}",
            json={"name": "After Reject"},
        )
        assert resp.status_code == 200
        assert resp.json()["name"] == "After Reject"

    async def test_revision_then_update_allowed(self, admin_client: AsyncClient, db: AsyncSession, admin_user: User):
        proj = await make_project(db, admin_user)
        tpl = await make_template(db)
        sub = await make_submission(db, proj, tpl, admin_user)
        await db.commit()
        await admin_client.post(
            f"{BASE}/equipment-submissions/{sub.id}/decisions",
            json={"decision": "revision_requested"},
        )
        resp = await admin_client.put(
            f"{BASE}/projects/{proj.id}/equipment-submissions/{sub.id}",
            json={"name": "After Revision"},
        )
        assert resp.status_code == 200
        assert resp.json()["name"] == "After Revision"


class TestMultipleDecisions:

    async def test_approve_then_reject_changes_status(self, admin_client: AsyncClient, db: AsyncSession, admin_user: User):
        proj = await make_project(db, admin_user)
        tpl = await make_template(db)
        sub = await make_submission(db, proj, tpl, admin_user)
        await db.commit()
        await admin_client.post(
            f"{BASE}/equipment-submissions/{sub.id}/decisions",
            json={"decision": "approved"},
        )
        await admin_client.post(
            f"{BASE}/equipment-submissions/{sub.id}/decisions",
            json={"decision": "rejected"},
        )
        get_resp = await admin_client.get(f"{BASE}/projects/{proj.id}/equipment-submissions/{sub.id}")
        assert get_resp.json()["status"] == "rejected"

    async def test_reject_then_revision_changes_status(self, admin_client: AsyncClient, db: AsyncSession, admin_user: User):
        proj = await make_project(db, admin_user)
        tpl = await make_template(db)
        sub = await make_submission(db, proj, tpl, admin_user)
        await db.commit()
        await admin_client.post(
            f"{BASE}/equipment-submissions/{sub.id}/decisions",
            json={"decision": "rejected"},
        )
        await admin_client.post(
            f"{BASE}/equipment-submissions/{sub.id}/decisions",
            json={"decision": "revision_requested"},
        )
        get_resp = await admin_client.get(f"{BASE}/projects/{proj.id}/equipment-submissions/{sub.id}")
        assert get_resp.json()["status"] == "revision_requested"

    async def test_revision_then_approve_changes_status(self, admin_client: AsyncClient, db: AsyncSession, admin_user: User):
        proj = await make_project(db, admin_user)
        tpl = await make_template(db)
        sub = await make_submission(db, proj, tpl, admin_user)
        await db.commit()
        await admin_client.post(
            f"{BASE}/equipment-submissions/{sub.id}/decisions",
            json={"decision": "revision_requested"},
        )
        await admin_client.post(
            f"{BASE}/equipment-submissions/{sub.id}/decisions",
            json={"decision": "approved"},
        )
        get_resp = await admin_client.get(f"{BASE}/projects/{proj.id}/equipment-submissions/{sub.id}")
        assert get_resp.json()["status"] == "approved"

    @pytest.mark.parametrize(
        "sequence,final_status",
        [
            (["approved"], "approved"),
            (["rejected"], "rejected"),
            (["revision_requested"], "revision_requested"),
            (["approved", "rejected"], "rejected"),
            (["rejected", "approved"], "approved"),
            (["revision_requested", "approved"], "approved"),
            (["approved", "revision_requested"], "revision_requested"),
            (["rejected", "revision_requested", "approved"], "approved"),
            (["approved", "rejected", "revision_requested"], "revision_requested"),
        ],
        ids=[
            "single_approve",
            "single_reject",
            "single_revision",
            "approve_then_reject",
            "reject_then_approve",
            "revision_then_approve",
            "approve_then_revision",
            "reject_revision_approve",
            "approve_reject_revision",
        ],
    )
    async def test_decision_sequences(
        self,
        admin_client: AsyncClient,
        db: AsyncSession,
        admin_user: User,
        sequence: list[str],
        final_status: str,
    ):
        proj = await make_project(db, admin_user)
        tpl = await make_template(db)
        sub = await make_submission(db, proj, tpl, admin_user)
        await db.commit()
        for dec in sequence:
            resp = await admin_client.post(
                f"{BASE}/equipment-submissions/{sub.id}/decisions",
                json={"decision": dec},
            )
            assert resp.status_code == 201
        get_resp = await admin_client.get(f"{BASE}/projects/{proj.id}/equipment-submissions/{sub.id}")
        assert get_resp.json()["status"] == final_status


class TestListDecisionsEndpoint:

    async def test_list_decisions_empty(self, admin_client: AsyncClient, db: AsyncSession, admin_user: User):
        proj = await make_project(db, admin_user)
        tpl = await make_template(db)
        sub = await make_submission(db, proj, tpl, admin_user)
        await db.commit()
        resp = await admin_client.get(f"{BASE}/equipment-submissions/{sub.id}/decisions")
        assert resp.status_code == 200
        assert resp.json() == []

    async def test_list_decisions_single(self, admin_client: AsyncClient, db: AsyncSession, admin_user: User):
        proj = await make_project(db, admin_user)
        tpl = await make_template(db)
        sub = await make_submission(db, proj, tpl, admin_user)
        await db.commit()
        await admin_client.post(
            f"{BASE}/equipment-submissions/{sub.id}/decisions",
            json={"decision": "approved", "comments": "LGTM"},
        )
        resp = await admin_client.get(f"{BASE}/equipment-submissions/{sub.id}/decisions")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["decision"] == "approved"
        assert data[0]["comments"] == "LGTM"

    async def test_list_decisions_multiple(self, admin_client: AsyncClient, db: AsyncSession, admin_user: User):
        proj = await make_project(db, admin_user)
        tpl = await make_template(db)
        sub = await make_submission(db, proj, tpl, admin_user)
        await db.commit()
        await admin_client.post(
            f"{BASE}/equipment-submissions/{sub.id}/decisions",
            json={"decision": "revision_requested", "comments": "Please fix"},
        )
        await admin_client.post(
            f"{BASE}/equipment-submissions/{sub.id}/decisions",
            json={"decision": "approved", "comments": "Fixed, approved"},
        )
        resp = await admin_client.get(f"{BASE}/equipment-submissions/{sub.id}/decisions")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 2

    async def test_list_decisions_nonexistent_submission(self, admin_client: AsyncClient):
        resp = await admin_client.get(f"{BASE}/equipment-submissions/{FAKE_UUID}/decisions")
        assert resp.status_code == 404

    @pytest.mark.parametrize("count", [1, 2, 3, 5])
    async def test_list_decisions_counts(
        self, admin_client: AsyncClient, db: AsyncSession, admin_user: User, count: int
    ):
        proj = await make_project(db, admin_user)
        tpl = await make_template(db)
        sub = await make_submission(db, proj, tpl, admin_user)
        await db.commit()
        decisions = ["approved", "rejected", "revision_requested", "approved", "rejected"]
        for i in range(count):
            await admin_client.post(
                f"{BASE}/equipment-submissions/{sub.id}/decisions",
                json={"decision": decisions[i % 3]},
            )
        resp = await admin_client.get(f"{BASE}/equipment-submissions/{sub.id}/decisions")
        assert resp.status_code == 200
        assert len(resp.json()) == count


class TestResponseFormat:

    async def test_submission_response_camel_case(self, admin_client: AsyncClient, db: AsyncSession, admin_user: User):
        proj = await make_project(db, admin_user)
        tpl = await make_template(db)
        await db.commit()
        payload = {
            "template_id": str(tpl.id),
            "name": "CamelCase Test",
            "description": "Testing camel",
            "specifications": {"key": "val"},
            "notes": "Some notes",
        }
        resp = await admin_client.post(f"{BASE}/projects/{proj.id}/equipment-submissions", json=payload)
        assert resp.status_code == 201
        data = resp.json()
        assert "projectId" in data
        assert "templateId" in data
        assert "createdAt" in data
        assert "updatedAt" in data

    async def test_submission_response_has_id(self, admin_client: AsyncClient, db: AsyncSession, admin_user: User):
        proj = await make_project(db, admin_user)
        tpl = await make_template(db)
        await db.commit()
        payload = {"template_id": str(tpl.id), "name": "ID Test"}
        resp = await admin_client.post(f"{BASE}/projects/{proj.id}/equipment-submissions", json=payload)
        assert resp.status_code == 201
        data = resp.json()
        assert "id" in data
        assert data["id"] is not None

    async def test_submission_response_project_id_matches(self, admin_client: AsyncClient, db: AsyncSession, admin_user: User):
        proj = await make_project(db, admin_user)
        tpl = await make_template(db)
        await db.commit()
        payload = {"template_id": str(tpl.id), "name": "ProjID Test"}
        resp = await admin_client.post(f"{BASE}/projects/{proj.id}/equipment-submissions", json=payload)
        assert resp.status_code == 201
        data = resp.json()
        assert data["projectId"] == str(proj.id)

    async def test_submission_response_template_id_matches(self, admin_client: AsyncClient, db: AsyncSession, admin_user: User):
        proj = await make_project(db, admin_user)
        tpl = await make_template(db)
        await db.commit()
        payload = {"template_id": str(tpl.id), "name": "TplID Test"}
        resp = await admin_client.post(f"{BASE}/projects/{proj.id}/equipment-submissions", json=payload)
        assert resp.status_code == 201
        data = resp.json()
        assert data["templateId"] == str(tpl.id)

    async def test_decision_response_camel_case(self, admin_client: AsyncClient, db: AsyncSession, admin_user: User):
        proj = await make_project(db, admin_user)
        tpl = await make_template(db)
        sub = await make_submission(db, proj, tpl, admin_user)
        await db.commit()
        resp = await admin_client.post(
            f"{BASE}/equipment-submissions/{sub.id}/decisions",
            json={"decision": "approved", "comments": "OK"},
        )
        assert resp.status_code == 201
        data = resp.json()
        assert "submissionId" in data
        assert "decidedById" in data
        assert "decidedAt" in data
        assert "createdAt" in data

    @pytest.mark.parametrize(
        "field",
        ["id", "projectId", "templateId", "name", "status", "createdAt", "updatedAt"],
        ids=["has_id", "has_projectId", "has_templateId", "has_name", "has_status", "has_createdAt", "has_updatedAt"],
    )
    async def test_submission_response_contains_field(
        self, admin_client: AsyncClient, db: AsyncSession, admin_user: User, field: str
    ):
        proj = await make_project(db, admin_user)
        tpl = await make_template(db)
        await db.commit()
        payload = {"template_id": str(tpl.id), "name": "Field Test"}
        resp = await admin_client.post(f"{BASE}/projects/{proj.id}/equipment-submissions", json=payload)
        assert resp.status_code == 201
        assert field in resp.json()

    @pytest.mark.parametrize(
        "field",
        ["id", "submissionId", "decision", "decidedById", "decidedAt", "createdAt"],
        ids=["dec_id", "dec_submissionId", "dec_decision", "dec_decidedById", "dec_decidedAt", "dec_createdAt"],
    )
    async def test_decision_response_contains_field(
        self, admin_client: AsyncClient, db: AsyncSession, admin_user: User, field: str
    ):
        proj = await make_project(db, admin_user)
        tpl = await make_template(db)
        sub = await make_submission(db, proj, tpl, admin_user)
        await db.commit()
        resp = await admin_client.post(
            f"{BASE}/equipment-submissions/{sub.id}/decisions",
            json={"decision": "approved"},
        )
        assert resp.status_code == 201
        assert field in resp.json()

    async def test_list_response_is_array(self, admin_client: AsyncClient, db: AsyncSession, admin_user: User):
        proj = await make_project(db, admin_user)
        await db.commit()
        resp = await admin_client.get(f"{BASE}/projects/{proj.id}/equipment-submissions")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    async def test_submission_no_snake_case_keys(self, admin_client: AsyncClient, db: AsyncSession, admin_user: User):
        proj = await make_project(db, admin_user)
        tpl = await make_template(db)
        await db.commit()
        payload = {"template_id": str(tpl.id), "name": "Snake Check"}
        resp = await admin_client.post(f"{BASE}/projects/{proj.id}/equipment-submissions", json=payload)
        assert resp.status_code == 201
        data = resp.json()
        assert "project_id" not in data
        assert "template_id" not in data
        assert "created_at" not in data
        assert "updated_at" not in data
        assert "created_by_id" not in data


class TestSpecificationsJSONB:

    @pytest.mark.parametrize(
        "specs,label",
        [
            (None, "null_specs"),
            ({}, "empty_dict_specs"),
            ({"key": "value"}, "simple_kv_specs"),
            ({"a": 1, "b": 2.5, "c": True}, "mixed_types_specs"),
            ({"key": None}, "null_value_specs"),
            ({"k1": "v1", "k2": "v2", "k3": "v3", "k4": "v4", "k5": "v5"}, "many_keys_specs"),
        ],
        ids=["null_specs", "empty_dict_specs", "simple_kv_specs", "mixed_types_specs", "null_value_specs", "many_keys_specs"],
    )
    async def test_create_with_specifications(
        self, admin_client: AsyncClient, db: AsyncSession, admin_user: User, specs, label
    ):
        proj = await make_project(db, admin_user)
        tpl = await make_template(db)
        await db.commit()
        payload = {"template_id": str(tpl.id), "name": f"Spec {label}"}
        if specs is not None:
            payload["specifications"] = specs
        resp = await admin_client.post(f"{BASE}/projects/{proj.id}/equipment-submissions", json=payload)
        assert resp.status_code == 201

    @pytest.mark.parametrize(
        "specs",
        [
            {"updated": "val"},
            {},
            None,
            {"a": 1, "b": "two", "c": True, "d": None},
        ],
        ids=["update_simple", "update_empty", "update_null", "update_mixed"],
    )
    async def test_update_specifications(
        self, admin_client: AsyncClient, db: AsyncSession, admin_user: User, specs
    ):
        proj = await make_project(db, admin_user)
        tpl = await make_template(db)
        sub = await make_submission(db, proj, tpl, admin_user)
        await db.commit()
        resp = await admin_client.put(
            f"{BASE}/projects/{proj.id}/equipment-submissions/{sub.id}",
            json={"specifications": specs},
        )
        assert resp.status_code == 200


class TestCascadeDelete:

    async def test_delete_submission_cascades_decisions_via_api(
        self, admin_client: AsyncClient, db: AsyncSession, admin_user: User
    ):
        proj = await make_project(db, admin_user)
        tpl = await make_template(db)
        sub = await make_submission(db, proj, tpl, admin_user)
        await db.commit()
        await admin_client.post(
            f"{BASE}/equipment-submissions/{sub.id}/decisions",
            json={"decision": "revision_requested", "comments": "Fix this"},
        )
        await admin_client.post(
            f"{BASE}/equipment-submissions/{sub.id}/decisions",
            json={"decision": "approved", "comments": "Now OK"},
        )
        decisions_resp = await admin_client.get(f"{BASE}/equipment-submissions/{sub.id}/decisions")
        assert len(decisions_resp.json()) == 2
        del_resp = await admin_client.delete(f"{BASE}/projects/{proj.id}/equipment-submissions/{sub.id}")
        assert del_resp.status_code == 200
        sub_id = sub.id
        result = await db.execute(select(ApprovalDecision).where(ApprovalDecision.submission_id == sub_id))
        assert len(result.scalars().all()) == 0

    async def test_delete_submission_with_many_decisions(
        self, admin_client: AsyncClient, db: AsyncSession, admin_user: User
    ):
        proj = await make_project(db, admin_user)
        tpl = await make_template(db)
        sub = await make_submission(db, proj, tpl, admin_user)
        await db.commit()
        for dec_val in ["revision_requested", "rejected", "revision_requested", "approved", "rejected"]:
            await admin_client.post(
                f"{BASE}/equipment-submissions/{sub.id}/decisions",
                json={"decision": dec_val},
            )
        del_resp = await admin_client.delete(f"{BASE}/projects/{proj.id}/equipment-submissions/{sub.id}")
        assert del_resp.status_code == 200


class TestAuthEndpoints:

    @pytest.mark.parametrize(
        "method,path_suffix",
        [
            ("POST", "/projects/{pid}/equipment-submissions"),
            ("PUT", "/projects/{pid}/equipment-submissions/{sid}"),
            ("DELETE", "/projects/{pid}/equipment-submissions/{sid}"),
            ("POST", "/equipment-submissions/{sid}/decisions"),
        ],
        ids=["create_unauth", "update_unauth", "delete_unauth", "decision_unauth"],
    )
    async def test_unauthenticated_returns_401(
        self, client: AsyncClient, db: AsyncSession, admin_user: User, method: str, path_suffix: str
    ):
        proj = await make_project(db, admin_user)
        tpl = await make_template(db)
        sub = await make_submission(db, proj, tpl, admin_user)
        await db.commit()
        path = f"{BASE}" + path_suffix.format(pid=proj.id, sid=sub.id)
        if method == "POST" and "decisions" in path_suffix:
            resp = await client.post(path, json={"decision": "approved"})
        elif method == "POST":
            resp = await client.post(path, json={"template_id": str(tpl.id), "name": "Test"})
        elif method == "PUT":
            resp = await client.put(path, json={"name": "Test"})
        elif method == "DELETE":
            resp = await client.delete(path)
        assert resp.status_code == 401

    @pytest.mark.parametrize(
        "method,path_suffix",
        [
            ("GET", "/projects/{pid}/equipment-submissions"),
            ("GET", "/projects/{pid}/equipment-submissions/{sid}"),
            ("GET", "/equipment-submissions/{sid}/decisions"),
        ],
        ids=["list_no_auth", "get_no_auth", "list_decisions_no_auth"],
    )
    async def test_get_endpoints_require_auth(
        self, client: AsyncClient, db: AsyncSession, admin_user: User, method: str, path_suffix: str
    ):
        proj = await make_project(db, admin_user)
        tpl = await make_template(db)
        sub = await make_submission(db, proj, tpl, admin_user)
        await db.commit()
        path = f"{BASE}" + path_suffix.format(pid=proj.id, sid=sub.id)
        resp = await client.get(path)
        assert resp.status_code == 401

    async def test_regular_user_can_create(self, user_client: AsyncClient, db: AsyncSession, regular_user: User):
        proj = await make_project(db, regular_user)
        tpl = await make_template(db)
        await db.commit()
        payload = {"template_id": str(tpl.id), "name": "User Submission"}
        resp = await user_client.post(f"{BASE}/projects/{proj.id}/equipment-submissions", json=payload)
        assert resp.status_code == 201

    async def test_regular_user_can_decide(self, user_client: AsyncClient, db: AsyncSession, regular_user: User):
        proj = await make_project(db, regular_user)
        tpl = await make_template(db)
        sub = await make_submission(db, proj, tpl, regular_user)
        await db.commit()
        resp = await user_client.post(
            f"{BASE}/equipment-submissions/{sub.id}/decisions",
            json={"decision": "approved"},
        )
        assert resp.status_code == 201


class TestNotFoundResponses:

    async def test_get_submission_fake_project_returns_403(
        self, admin_client: AsyncClient, db: AsyncSession, admin_user: User
    ):
        proj = await make_project(db, admin_user)
        tpl = await make_template(db)
        sub = await make_submission(db, proj, tpl, admin_user)
        await db.commit()
        path = f"{BASE}/projects/{FAKE_UUID}/equipment-submissions/{sub.id}"
        resp = await admin_client.get(path)
        assert resp.status_code == 403

    async def test_get_submission_fake_submission_returns_404(
        self, admin_client: AsyncClient, db: AsyncSession, admin_user: User
    ):
        proj = await make_project(db, admin_user)
        tpl = await make_template(db)
        sub = await make_submission(db, proj, tpl, admin_user)
        await db.commit()
        path = f"{BASE}/projects/{proj.id}/equipment-submissions/{FAKE_UUID}"
        resp = await admin_client.get(path)
        assert resp.status_code == 404

    async def test_update_nonexistent_404(self, admin_client: AsyncClient, db: AsyncSession, admin_user: User):
        proj = await make_project(db, admin_user)
        await db.commit()
        resp = await admin_client.put(
            f"{BASE}/projects/{proj.id}/equipment-submissions/{FAKE_UUID}",
            json={"name": "Ghost"},
        )
        assert resp.status_code == 404

    async def test_delete_nonexistent_404(self, admin_client: AsyncClient, db: AsyncSession, admin_user: User):
        proj = await make_project(db, admin_user)
        await db.commit()
        resp = await admin_client.delete(f"{BASE}/projects/{proj.id}/equipment-submissions/{FAKE_UUID}")
        assert resp.status_code == 404

    async def test_decision_nonexistent_submission_404(self, admin_client: AsyncClient):
        resp = await admin_client.post(
            f"{BASE}/equipment-submissions/{FAKE_UUID}/decisions",
            json={"decision": "approved"},
        )
        assert resp.status_code == 404

    async def test_list_decisions_nonexistent_submission_404(self, admin_client: AsyncClient):
        resp = await admin_client.get(f"{BASE}/equipment-submissions/{FAKE_UUID}/decisions")
        assert resp.status_code == 404


class TestSubmissionCRUDHappyPath:

    async def test_full_crud_lifecycle(self, admin_client: AsyncClient, db: AsyncSession, admin_user: User):
        proj = await make_project(db, admin_user)
        tpl = await make_template(db)
        await db.commit()

        create_resp = await admin_client.post(
            f"{BASE}/projects/{proj.id}/equipment-submissions",
            json={"template_id": str(tpl.id), "name": "Lifecycle Sub", "description": "Initial"},
        )
        assert create_resp.status_code == 201
        sub_id = create_resp.json()["id"]

        get_resp = await admin_client.get(f"{BASE}/projects/{proj.id}/equipment-submissions/{sub_id}")
        assert get_resp.status_code == 200
        assert get_resp.json()["name"] == "Lifecycle Sub"

        update_resp = await admin_client.put(
            f"{BASE}/projects/{proj.id}/equipment-submissions/{sub_id}",
            json={"name": "Updated Lifecycle", "description": "Changed"},
        )
        assert update_resp.status_code == 200
        assert update_resp.json()["name"] == "Updated Lifecycle"

        list_resp = await admin_client.get(f"{BASE}/projects/{proj.id}/equipment-submissions")
        assert list_resp.status_code == 200
        assert len(list_resp.json()) == 1

        del_resp = await admin_client.delete(f"{BASE}/projects/{proj.id}/equipment-submissions/{sub_id}")
        assert del_resp.status_code == 200

        list_after = await admin_client.get(f"{BASE}/projects/{proj.id}/equipment-submissions")
        assert list_after.status_code == 200
        assert len(list_after.json()) == 0

    async def test_create_and_decide_lifecycle(self, admin_client: AsyncClient, db: AsyncSession, admin_user: User):
        proj = await make_project(db, admin_user)
        tpl = await make_template(db)
        await db.commit()

        create_resp = await admin_client.post(
            f"{BASE}/projects/{proj.id}/equipment-submissions",
            json={"template_id": str(tpl.id), "name": "Decision Lifecycle"},
        )
        assert create_resp.status_code == 201
        sub_id = create_resp.json()["id"]
        assert create_resp.json()["status"] == "draft"

        rev_resp = await admin_client.post(
            f"{BASE}/equipment-submissions/{sub_id}/decisions",
            json={"decision": "revision_requested", "comments": "Need more info"},
        )
        assert rev_resp.status_code == 201

        get_resp = await admin_client.get(f"{BASE}/projects/{proj.id}/equipment-submissions/{sub_id}")
        assert get_resp.json()["status"] == "revision_requested"

        update_resp = await admin_client.put(
            f"{BASE}/projects/{proj.id}/equipment-submissions/{sub_id}",
            json={"description": "Added more info"},
        )
        assert update_resp.status_code == 200

        app_resp = await admin_client.post(
            f"{BASE}/equipment-submissions/{sub_id}/decisions",
            json={"decision": "approved", "comments": "Looks good now"},
        )
        assert app_resp.status_code == 201

        final_resp = await admin_client.get(f"{BASE}/projects/{proj.id}/equipment-submissions/{sub_id}")
        assert final_resp.json()["status"] == "approved"

        blocked_resp = await admin_client.put(
            f"{BASE}/projects/{proj.id}/equipment-submissions/{sub_id}",
            json={"name": "Should Fail"},
        )
        assert blocked_resp.status_code == 400

        decisions_resp = await admin_client.get(f"{BASE}/equipment-submissions/{sub_id}/decisions")
        assert len(decisions_resp.json()) == 2


class TestEdgeCases:

    async def test_empty_update_body(self, admin_client: AsyncClient, db: AsyncSession, admin_user: User):
        proj = await make_project(db, admin_user)
        tpl = await make_template(db)
        sub = await make_submission(db, proj, tpl, admin_user)
        await db.commit()
        resp = await admin_client.put(
            f"{BASE}/projects/{proj.id}/equipment-submissions/{sub.id}",
            json={},
        )
        assert resp.status_code == 200

    async def test_create_with_only_required_fields(self, admin_client: AsyncClient, db: AsyncSession, admin_user: User):
        proj = await make_project(db, admin_user)
        tpl = await make_template(db)
        await db.commit()
        payload = {"template_id": str(tpl.id), "name": "Minimal"}
        resp = await admin_client.post(f"{BASE}/projects/{proj.id}/equipment-submissions", json=payload)
        assert resp.status_code == 201
        data = resp.json()
        assert data["description"] is None
        assert data["notes"] is None

    async def test_create_submission_default_status_is_draft(
        self, admin_client: AsyncClient, db: AsyncSession, admin_user: User
    ):
        proj = await make_project(db, admin_user)
        tpl = await make_template(db)
        await db.commit()
        payload = {"template_id": str(tpl.id), "name": "Draft Check"}
        resp = await admin_client.post(f"{BASE}/projects/{proj.id}/equipment-submissions", json=payload)
        assert resp.status_code == 201
        assert resp.json()["status"] == "draft"

    @pytest.mark.parametrize(
        "name",
        [
            "Simple",
            "Name With Spaces",
            "Name-With-Dashes",
            "Name_With_Underscores",
            "Name.With.Dots",
            "Name (With Parens)",
            "Name/With/Slashes",
            "123 Numeric Start",
            "Unicode שם בעברית",
            "Emoji in name is fine 🏗️",
        ],
        ids=[
            "simple_name",
            "spaces_name",
            "dashes_name",
            "underscores_name",
            "dots_name",
            "parens_name",
            "slashes_name",
            "numeric_start_name",
            "hebrew_name",
            "emoji_name",
        ],
    )
    async def test_create_name_character_variants(
        self, admin_client: AsyncClient, db: AsyncSession, admin_user: User, name: str
    ):
        proj = await make_project(db, admin_user)
        tpl = await make_template(db)
        await db.commit()
        payload = {"template_id": str(tpl.id), "name": name}
        resp = await admin_client.post(f"{BASE}/projects/{proj.id}/equipment-submissions", json=payload)
        assert resp.status_code == 201

    async def test_decision_missing_decision_field(self, admin_client: AsyncClient, db: AsyncSession, admin_user: User):
        proj = await make_project(db, admin_user)
        tpl = await make_template(db)
        sub = await make_submission(db, proj, tpl, admin_user)
        await db.commit()
        resp = await admin_client.post(
            f"{BASE}/equipment-submissions/{sub.id}/decisions",
            json={"comments": "No decision field"},
        )
        assert resp.status_code == 422

    async def test_decision_empty_body(self, admin_client: AsyncClient, db: AsyncSession, admin_user: User):
        proj = await make_project(db, admin_user)
        tpl = await make_template(db)
        sub = await make_submission(db, proj, tpl, admin_user)
        await db.commit()
        resp = await admin_client.post(
            f"{BASE}/equipment-submissions/{sub.id}/decisions",
            json={},
        )
        assert resp.status_code == 422

    @pytest.mark.parametrize(
        "decision_value,expected_code",
        [
            ("approved", 201),
            ("rejected", 201),
            ("revision_requested", 201),
            ("APPROVED", 422),
            ("Approved", 422),
            ("approve", 422),
            ("reject", 422),
            ("revision", 422),
            ("pending", 422),
            ("cancel", 422),
            (" approved ", 422),
            ("approved ", 422),
        ],
        ids=[
            "lowercase_approved",
            "lowercase_rejected",
            "lowercase_revision_requested",
            "uppercase_approved_fail",
            "capitalized_approved_fail",
            "old_approve_fail",
            "old_reject_fail",
            "old_revision_fail",
            "pending_fail",
            "cancel_fail",
            "padded_approved_fail",
            "trailing_space_approved_fail",
        ],
    )
    async def test_decision_value_exactness(
        self, admin_client: AsyncClient, db: AsyncSession, admin_user: User, decision_value: str, expected_code: int
    ):
        proj = await make_project(db, admin_user)
        tpl = await make_template(db)
        sub = await make_submission(db, proj, tpl, admin_user)
        await db.commit()
        resp = await admin_client.post(
            f"{BASE}/equipment-submissions/{sub.id}/decisions",
            json={"decision": decision_value},
        )
        assert resp.status_code == expected_code

    async def test_create_submission_created_by_reflects_user(
        self, user_client: AsyncClient, db: AsyncSession, regular_user: User
    ):
        proj = await make_project(db, regular_user)
        tpl = await make_template(db)
        await db.commit()
        payload = {"template_id": str(tpl.id), "name": "User Created"}
        resp = await user_client.post(f"{BASE}/projects/{proj.id}/equipment-submissions", json=payload)
        assert resp.status_code == 201
        data = resp.json()
        if data.get("createdBy"):
            assert data["createdBy"]["id"] == str(regular_user.id)

    async def test_update_does_not_change_template_id(
        self, admin_client: AsyncClient, db: AsyncSession, admin_user: User
    ):
        proj = await make_project(db, admin_user)
        tpl = await make_template(db)
        sub = await make_submission(db, proj, tpl, admin_user)
        await db.commit()
        resp = await admin_client.put(
            f"{BASE}/projects/{proj.id}/equipment-submissions/{sub.id}",
            json={"name": "Template ID Same"},
        )
        assert resp.status_code == 200
        assert resp.json()["templateId"] == str(tpl.id)

    async def test_update_preserves_status(self, admin_client: AsyncClient, db: AsyncSession, admin_user: User):
        proj = await make_project(db, admin_user)
        tpl = await make_template(db)
        sub = await make_submission(db, proj, tpl, admin_user, status="rejected")
        await db.commit()
        resp = await admin_client.put(
            f"{BASE}/projects/{proj.id}/equipment-submissions/{sub.id}",
            json={"name": "Status Preserved"},
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "rejected"
