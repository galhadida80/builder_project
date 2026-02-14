import uuid
from datetime import datetime

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.file import File
from app.models.project import Project, ProjectMember
from app.models.user import User
from app.services.storage_service import StorageBackend, get_storage_backend

API_V1 = "/api/v1"
FAKE_PROJECT_ID = str(uuid.uuid4())
FAKE_FILE_ID = str(uuid.uuid4())
FAKE_UUID = str(uuid.uuid4())


def files_url(project_id: str) -> str:
    return f"{API_V1}/projects/{project_id}/files"


def file_detail_url(project_id: str, file_id: str) -> str:
    return f"{API_V1}/projects/{project_id}/files/{file_id}"


def file_download_url(project_id: str, file_id: str) -> str:
    return f"{API_V1}/projects/{project_id}/files/{file_id}/download"


def team_members_url() -> str:
    return f"{API_V1}/team-members"


def workload_url() -> str:
    return f"{API_V1}/workload"


def project_members_url(project_id: str) -> str:
    return f"{API_V1}/projects/{project_id}/members"


def member_assignments_url(member_id: str) -> str:
    return f"{API_V1}/team-members/{member_id}/assignments"


async def create_file_in_db(
    db: AsyncSession, project_id: uuid.UUID, uploaded_by_id: uuid.UUID, **overrides
) -> File:
    data = {
        "id": uuid.uuid4(),
        "project_id": project_id,
        "entity_type": "equipment",
        "entity_id": uuid.uuid4(),
        "filename": "test_doc.pdf",
        "file_type": "application/pdf",
        "file_size": 1024,
        "storage_path": f"storage/{uuid.uuid4()}/test_doc.pdf",
        "uploaded_by_id": uploaded_by_id,
    }
    data.update(overrides)
    file_record = File(**data)
    db.add(file_record)
    await db.flush()
    await db.refresh(file_record)
    return file_record


class MockStorageBackend(StorageBackend):
    def __init__(self):
        self.saved_files = {}
        self.deleted_files = []

    async def save_file(self, file, storage_path: str) -> int:
        content = await file.read()
        self.saved_files[storage_path] = content
        await file.seek(0)
        return len(content)

    async def save_bytes(self, content: bytes, storage_path: str, content_type: str = "application/octet-stream") -> int:
        self.saved_files[storage_path] = content
        return len(content)

    async def delete_file(self, storage_path: str) -> None:
        self.deleted_files.append(storage_path)

    def get_file_url(self, storage_path: str) -> str:
        return f"/mock-storage/{storage_path}"

    async def get_file_content(self, storage_path: str) -> bytes:
        if storage_path in self.saved_files:
            return self.saved_files[storage_path]
        raise FileNotFoundError(f"Not found: {storage_path}")


@pytest.fixture
def mock_storage():
    return MockStorageBackend()


@pytest.fixture
async def file_admin_client(db: AsyncSession, admin_user: User, mock_storage: MockStorageBackend):
    from app.core.security import get_current_admin_user, get_current_user
    from app.main import app

    async def override_get_db():
        yield db

    async def override_get_current_user():
        return admin_user

    async def override_get_current_admin_user():
        return admin_user

    def override_storage():
        return mock_storage

    app.dependency_overrides[get_storage_backend] = override_storage
    app.dependency_overrides[get_current_user] = override_get_current_user
    app.dependency_overrides[get_current_admin_user] = override_get_current_admin_user

    from app.db.session import get_db as real_get_db
    app.dependency_overrides[real_get_db] = override_get_db

    from httpx import ASGITransport
    transport = ASGITransport(app=app)
    async with AsyncClient(
        transport=transport,
        base_url="http://test",
        headers={"Authorization": "Bearer admin-test-token"}
    ) as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest.fixture
async def file_user_client(db: AsyncSession, regular_user: User, mock_storage: MockStorageBackend):
    from fastapi import HTTPException

    from app.core.security import get_current_admin_user, get_current_user
    from app.main import app

    async def override_get_db():
        yield db

    async def override_get_current_user():
        return regular_user

    async def override_get_current_admin_user():
        raise HTTPException(status_code=403, detail="Admin access required")

    def override_storage():
        return mock_storage

    app.dependency_overrides[get_storage_backend] = override_storage
    app.dependency_overrides[get_current_user] = override_get_current_user
    app.dependency_overrides[get_current_admin_user] = override_get_current_admin_user

    from app.db.session import get_db as real_get_db
    app.dependency_overrides[real_get_db] = override_get_db

    from httpx import ASGITransport
    transport = ASGITransport(app=app)
    async with AsyncClient(
        transport=transport,
        base_url="http://test",
        headers={"Authorization": "Bearer user-test-token"}
    ) as ac:
        yield ac

    app.dependency_overrides.clear()


class TestListFiles:

    async def test_list_empty(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.get(files_url(str(project.id)))
        assert resp.status_code == 200
        assert resp.json() == []

    async def test_list_returns_files(self, admin_client: AsyncClient, project: Project, admin_user: User, db: AsyncSession):
        await create_file_in_db(db, project.id, admin_user.id)
        await db.commit()
        resp = await admin_client.get(files_url(str(project.id)))
        assert len(resp.json()) == 1

    async def test_list_multiple_files(self, admin_client: AsyncClient, project: Project, admin_user: User, db: AsyncSession):
        for i in range(3):
            await create_file_in_db(db, project.id, admin_user.id, filename=f"file_{i}.pdf")
        await db.commit()
        resp = await admin_client.get(files_url(str(project.id)))
        assert len(resp.json()) == 3

    async def test_list_filter_by_entity_type(self, admin_client: AsyncClient, project: Project, admin_user: User, db: AsyncSession):
        await create_file_in_db(db, project.id, admin_user.id, entity_type="equipment")
        await create_file_in_db(db, project.id, admin_user.id, entity_type="material")
        await db.commit()
        resp = await admin_client.get(
            files_url(str(project.id)), params={"entity_type": "equipment"}
        )
        assert len(resp.json()) == 1

    async def test_list_filter_by_entity_id(self, admin_client: AsyncClient, project: Project, admin_user: User, db: AsyncSession):
        target_id = uuid.uuid4()
        await create_file_in_db(db, project.id, admin_user.id, entity_id=target_id)
        await create_file_in_db(db, project.id, admin_user.id)
        await db.commit()
        resp = await admin_client.get(
            files_url(str(project.id)), params={"entity_id": str(target_id)}
        )
        assert len(resp.json()) == 1

    async def test_list_filter_combined(self, admin_client: AsyncClient, project: Project, admin_user: User, db: AsyncSession):
        target_id = uuid.uuid4()
        await create_file_in_db(db, project.id, admin_user.id, entity_type="equipment", entity_id=target_id)
        await create_file_in_db(db, project.id, admin_user.id, entity_type="material", entity_id=target_id)
        await create_file_in_db(db, project.id, admin_user.id, entity_type="equipment")
        await db.commit()
        resp = await admin_client.get(
            files_url(str(project.id)),
            params={"entity_type": "equipment", "entity_id": str(target_id)}
        )
        assert len(resp.json()) == 1

    async def test_list_requires_auth(self, client: AsyncClient, project: Project):
        resp = await client.get(files_url(str(project.id)))
        assert resp.status_code in [401, 403]

    async def test_list_requires_project_access(self, user_client: AsyncClient):
        resp = await user_client.get(files_url(FAKE_PROJECT_ID))
        assert resp.status_code == 403

    async def test_list_ordered_by_uploaded_at_desc(self, admin_client: AsyncClient, project: Project, admin_user: User, db: AsyncSession):
        await create_file_in_db(db, project.id, admin_user.id, filename="first.pdf")
        await create_file_in_db(db, project.id, admin_user.id, filename="second.pdf")
        await db.commit()
        resp = await admin_client.get(files_url(str(project.id)))
        data = resp.json()
        assert data[0]["filename"] == "second.pdf"

    async def test_list_scoped_to_project(self, admin_client: AsyncClient, admin_user: User, db: AsyncSession):
        proj1 = Project(
            id=uuid.uuid4(), name="P1", code="FILE-P1",
            status="active", created_by_id=admin_user.id
        )
        proj2 = Project(
            id=uuid.uuid4(), name="P2", code="FILE-P2",
            status="active", created_by_id=admin_user.id
        )
        db.add_all([proj1, proj2])
        await db.flush()
        db.add(ProjectMember(project_id=proj1.id, user_id=admin_user.id, role="project_admin"))
        db.add(ProjectMember(project_id=proj2.id, user_id=admin_user.id, role="project_admin"))
        await db.flush()
        await create_file_in_db(db, proj1.id, admin_user.id, filename="p1_file.pdf")
        await create_file_in_db(db, proj2.id, admin_user.id, filename="p2_file.pdf")
        await db.commit()
        resp1 = await admin_client.get(files_url(str(proj1.id)))
        resp2 = await admin_client.get(files_url(str(proj2.id)))
        assert len(resp1.json()) == 1
        assert resp1.json()[0]["filename"] == "p1_file.pdf"
        assert len(resp2.json()) == 1
        assert resp2.json()[0]["filename"] == "p2_file.pdf"


class TestGetFile:

    async def test_get_existing_file(self, admin_client: AsyncClient, project: Project, admin_user: User, db: AsyncSession):
        f = await create_file_in_db(db, project.id, admin_user.id, filename="specific.pdf")
        await db.commit()
        resp = await admin_client.get(file_detail_url(str(project.id), str(f.id)))
        assert resp.status_code == 200
        assert resp.json()["filename"] == "specific.pdf"

    async def test_get_not_found(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.get(file_detail_url(str(project.id), FAKE_FILE_ID))
        assert resp.status_code == 404

    async def test_get_wrong_project(self, admin_client: AsyncClient, project: Project, admin_user: User, db: AsyncSession):
        other_proj = Project(
            id=uuid.uuid4(), name="Other", code="OTHER-FG",
            status="active", created_by_id=admin_user.id
        )
        db.add(other_proj)
        await db.flush()
        db.add(ProjectMember(project_id=other_proj.id, user_id=admin_user.id, role="project_admin"))
        f = await create_file_in_db(db, other_proj.id, admin_user.id)
        await db.commit()
        resp = await admin_client.get(file_detail_url(str(project.id), str(f.id)))
        assert resp.status_code == 404

    async def test_get_requires_auth(self, client: AsyncClient, project: Project, admin_user: User, db: AsyncSession):
        f = await create_file_in_db(db, project.id, admin_user.id)
        await db.commit()
        resp = await client.get(file_detail_url(str(project.id), str(f.id)))
        assert resp.status_code in [401, 403]

    async def test_get_invalid_uuid(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.get(file_detail_url(str(project.id), "bad"))
        assert resp.status_code == 422


class TestFileResponseFormat:

    async def test_response_fields(self, admin_client: AsyncClient, project: Project, admin_user: User, db: AsyncSession):
        f = await create_file_in_db(db, project.id, admin_user.id)
        await db.commit()
        resp = await admin_client.get(file_detail_url(str(project.id), str(f.id)))
        data = resp.json()
        assert "id" in data
        assert "projectId" in data
        assert "entityType" in data
        assert "entityId" in data
        assert "filename" in data
        assert "fileType" in data
        assert "fileSize" in data
        assert "storagePath" in data
        assert "uploadedAt" in data

    async def test_camel_case_keys(self, admin_client: AsyncClient, project: Project, admin_user: User, db: AsyncSession):
        f = await create_file_in_db(db, project.id, admin_user.id)
        await db.commit()
        resp = await admin_client.get(file_detail_url(str(project.id), str(f.id)))
        data = resp.json()
        assert "projectId" in data
        assert "entityType" in data
        assert "fileType" in data
        assert "fileSize" in data
        assert "storagePath" in data
        assert "uploadedAt" in data
        assert "project_id" not in data
        assert "entity_type" not in data

    async def test_id_is_uuid(self, admin_client: AsyncClient, project: Project, admin_user: User, db: AsyncSession):
        f = await create_file_in_db(db, project.id, admin_user.id)
        await db.commit()
        resp = await admin_client.get(file_detail_url(str(project.id), str(f.id)))
        uuid.UUID(resp.json()["id"])

    async def test_file_size_is_int(self, admin_client: AsyncClient, project: Project, admin_user: User, db: AsyncSession):
        f = await create_file_in_db(db, project.id, admin_user.id, file_size=2048)
        await db.commit()
        resp = await admin_client.get(file_detail_url(str(project.id), str(f.id)))
        assert resp.json()["fileSize"] == 2048

    async def test_uploaded_at_parseable(self, admin_client: AsyncClient, project: Project, admin_user: User, db: AsyncSession):
        f = await create_file_in_db(db, project.id, admin_user.id)
        await db.commit()
        resp = await admin_client.get(file_detail_url(str(project.id), str(f.id)))
        datetime.fromisoformat(resp.json()["uploadedAt"].replace("Z", "+00:00"))


class TestUploadFile:

    async def test_upload_success(self, file_admin_client: AsyncClient, project: Project):
        entity_id = str(uuid.uuid4())
        resp = await file_admin_client.post(
            files_url(str(project.id)),
            params={"entity_type": "equipment", "entity_id": entity_id},
            files={"file": ("test.pdf", b"PDF content here", "application/pdf")}
        )
        assert resp.status_code == 200

    async def test_upload_returns_file_data(self, file_admin_client: AsyncClient, project: Project):
        entity_id = str(uuid.uuid4())
        resp = await file_admin_client.post(
            files_url(str(project.id)),
            params={"entity_type": "equipment", "entity_id": entity_id},
            files={"file": ("report.pdf", b"data", "application/pdf")}
        )
        data = resp.json()
        assert data["filename"] == "report.pdf"
        assert "id" in data

    async def test_upload_requires_auth(self, client: AsyncClient, project: Project):
        entity_id = str(uuid.uuid4())
        resp = await client.post(
            files_url(str(project.id)),
            params={"entity_type": "equipment", "entity_id": entity_id},
            files={"file": ("test.pdf", b"data", "application/pdf")}
        )
        assert resp.status_code in [401, 403]

    async def test_upload_requires_project_access(self, file_user_client: AsyncClient):
        entity_id = str(uuid.uuid4())
        resp = await file_user_client.post(
            files_url(FAKE_PROJECT_ID),
            params={"entity_type": "equipment", "entity_id": entity_id},
            files={"file": ("test.pdf", b"data", "application/pdf")}
        )
        assert resp.status_code == 403


class TestDeleteFile:

    async def test_delete_success(self, admin_client: AsyncClient, project: Project, admin_user: User, db: AsyncSession):
        f = await create_file_in_db(db, project.id, admin_user.id)
        await db.commit()
        resp = await admin_client.delete(file_detail_url(str(project.id), str(f.id)))
        assert resp.status_code == 200
        assert "deleted" in resp.json()["message"].lower()

    async def test_delete_not_found(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.delete(file_detail_url(str(project.id), FAKE_FILE_ID))
        assert resp.status_code == 404

    async def test_delete_actually_removes(self, admin_client: AsyncClient, project: Project, admin_user: User, db: AsyncSession):
        f = await create_file_in_db(db, project.id, admin_user.id)
        await db.commit()
        await admin_client.delete(file_detail_url(str(project.id), str(f.id)))
        resp = await admin_client.get(file_detail_url(str(project.id), str(f.id)))
        assert resp.status_code == 404

    async def test_delete_requires_auth(self, client: AsyncClient, project: Project, admin_user: User, db: AsyncSession):
        f = await create_file_in_db(db, project.id, admin_user.id)
        await db.commit()
        resp = await client.delete(file_detail_url(str(project.id), str(f.id)))
        assert resp.status_code in [401, 403]

    async def test_delete_requires_project_access(self, user_client: AsyncClient, db: AsyncSession, admin_user: User):
        proj = Project(
            id=uuid.uuid4(), name="NoAccess", code="NA-DEL",
            status="active", created_by_id=admin_user.id
        )
        db.add(proj)
        await db.flush()
        f = await create_file_in_db(db, proj.id, admin_user.id)
        await db.commit()
        resp = await user_client.delete(file_detail_url(str(proj.id), str(f.id)))
        assert resp.status_code == 403

    async def test_delete_wrong_project(self, admin_client: AsyncClient, project: Project, admin_user: User, db: AsyncSession):
        other_proj = Project(
            id=uuid.uuid4(), name="Other", code="OTH-DEL",
            status="active", created_by_id=admin_user.id
        )
        db.add(other_proj)
        await db.flush()
        db.add(ProjectMember(project_id=other_proj.id, user_id=admin_user.id, role="project_admin"))
        f = await create_file_in_db(db, other_proj.id, admin_user.id)
        await db.commit()
        resp = await admin_client.delete(file_detail_url(str(project.id), str(f.id)))
        assert resp.status_code == 404

    async def test_delete_invalid_uuid(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.delete(file_detail_url(str(project.id), "bad"))
        assert resp.status_code == 422


class TestDownloadFile:

    async def test_download_existing(self, admin_client: AsyncClient, project: Project, admin_user: User, db: AsyncSession):
        f = await create_file_in_db(db, project.id, admin_user.id, filename="downloadable.pdf")
        await db.commit()
        resp = await admin_client.get(file_download_url(str(project.id), str(f.id)))
        assert resp.status_code == 200
        data = resp.json()
        assert "download_url" in data
        assert data["filename"] == "downloadable.pdf"

    async def test_download_not_found(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.get(file_download_url(str(project.id), FAKE_FILE_ID))
        assert resp.status_code == 404

    async def test_download_requires_auth(self, client: AsyncClient, project: Project, admin_user: User, db: AsyncSession):
        f = await create_file_in_db(db, project.id, admin_user.id)
        await db.commit()
        resp = await client.get(file_download_url(str(project.id), str(f.id)))
        assert resp.status_code in [401, 403]

    async def test_download_requires_project_access(self, user_client: AsyncClient):
        resp = await user_client.get(file_download_url(FAKE_PROJECT_ID, FAKE_FILE_ID))
        assert resp.status_code == 403


class TestFileEdgeCases:

    async def test_multiple_files_same_entity(self, admin_client: AsyncClient, project: Project, admin_user: User, db: AsyncSession):
        entity_id = uuid.uuid4()
        for i in range(3):
            await create_file_in_db(
                db, project.id, admin_user.id,
                entity_type="equipment", entity_id=entity_id, filename=f"doc_{i}.pdf"
            )
        await db.commit()
        resp = await admin_client.get(
            files_url(str(project.id)),
            params={"entity_type": "equipment", "entity_id": str(entity_id)}
        )
        assert len(resp.json()) == 3

    async def test_different_file_types(self, admin_client: AsyncClient, project: Project, admin_user: User, db: AsyncSession):
        await create_file_in_db(db, project.id, admin_user.id, file_type="application/pdf", filename="a.pdf")
        await create_file_in_db(db, project.id, admin_user.id, file_type="image/png", filename="b.png")
        await create_file_in_db(db, project.id, admin_user.id, file_type="application/msword", filename="c.doc")
        await db.commit()
        resp = await admin_client.get(files_url(str(project.id)))
        types = {f["fileType"] for f in resp.json()}
        assert "application/pdf" in types
        assert "image/png" in types

    async def test_file_with_null_file_type(self, admin_client: AsyncClient, project: Project, admin_user: User, db: AsyncSession):
        await create_file_in_db(db, project.id, admin_user.id, file_type=None)
        await db.commit()
        resp = await admin_client.get(files_url(str(project.id)))
        assert resp.json()[0]["fileType"] is None

    async def test_file_with_null_file_size(self, admin_client: AsyncClient, project: Project, admin_user: User, db: AsyncSession):
        await create_file_in_db(db, project.id, admin_user.id, file_size=None)
        await db.commit()
        resp = await admin_client.get(files_url(str(project.id)))
        assert resp.json()[0]["fileSize"] is None


class TestTeamMembers:

    async def test_list_all_team_members(self, admin_client: AsyncClient):
        resp = await admin_client.get(team_members_url())
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    async def test_list_team_members_returns_users(self, admin_client: AsyncClient, admin_user: User):
        resp = await admin_client.get(team_members_url())
        data = resp.json()
        assert len(data) >= 1
        emails = [m["user"]["email"] for m in data]
        assert admin_user.email in emails

    async def test_list_team_members_by_project(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.get(team_members_url(), params={"project_id": str(project.id)})
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) >= 1

    async def test_list_team_members_response_format(self, admin_client: AsyncClient):
        resp = await admin_client.get(team_members_url())
        data = resp.json()
        if data:
            member = data[0]
            assert "id" in member
            assert "userId" in member
            assert "user" in member
            assert "role" in member
            assert "workloadPercent" in member
            assert "assignedHours" in member
            assert "availableHours" in member

    async def test_list_team_members_user_info(self, admin_client: AsyncClient):
        resp = await admin_client.get(team_members_url())
        data = resp.json()
        if data:
            user_info = data[0]["user"]
            assert "id" in user_info
            assert "email" in user_info
            assert "fullName" in user_info

    async def test_list_team_members_requires_auth(self, client: AsyncClient):
        resp = await client.get(team_members_url())
        assert resp.status_code in [401, 403]

    async def test_list_team_members_nonexistent_project(self, admin_client: AsyncClient):
        resp = await admin_client.get(team_members_url(), params={"project_id": FAKE_PROJECT_ID})
        assert resp.status_code == 403

    async def test_team_member_has_workload_fields(self, admin_client: AsyncClient):
        resp = await admin_client.get(team_members_url())
        data = resp.json()
        if data:
            member = data[0]
            assert isinstance(member["workloadPercent"], int)
            assert isinstance(member["assignedHours"], int)
            assert isinstance(member["availableHours"], int)


class TestProjectMembers:

    async def test_get_project_members(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.get(project_members_url(str(project.id)))
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) >= 1

    async def test_project_members_response_format(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.get(project_members_url(str(project.id)))
        data = resp.json()
        member = data[0]
        assert "id" in member
        assert "userId" in member
        assert "user" in member
        assert "role" in member

    async def test_project_members_requires_auth(self, client: AsyncClient, project: Project):
        resp = await client.get(project_members_url(str(project.id)))
        assert resp.status_code in [401, 403]

    async def test_project_members_requires_access(self, user_client: AsyncClient):
        resp = await user_client.get(project_members_url(FAKE_PROJECT_ID))
        assert resp.status_code == 403

    async def test_project_members_includes_admin(self, admin_client: AsyncClient, project: Project, admin_user: User):
        resp = await admin_client.get(project_members_url(str(project.id)))
        data = resp.json()
        user_ids = [m["userId"] for m in data]
        assert str(admin_user.id) in [str(uid) for uid in user_ids]

    async def test_project_members_multiple(self, admin_client: AsyncClient, project: Project, admin_user: User, db: AsyncSession):
        extra_user = User(
            id=uuid.uuid4(),
            firebase_uid="extra-uid",
            email="extra@test.com",
            full_name="Extra User",
            role="user",
            is_active=True
        )
        db.add(extra_user)
        await db.flush()
        db.add(ProjectMember(project_id=project.id, user_id=extra_user.id, role="contractor"))
        await db.commit()
        resp = await admin_client.get(project_members_url(str(project.id)))
        assert len(resp.json()) == 2


class TestWorkload:

    async def test_workload_empty(self, admin_client: AsyncClient):
        resp = await admin_client.get(workload_url())
        assert resp.status_code == 200
        assert resp.json() == []

    async def test_workload_with_params(self, admin_client: AsyncClient):
        resp = await admin_client.get(
            workload_url(),
            params={"startDate": "2024-01-01", "endDate": "2024-12-31"}
        )
        assert resp.status_code == 200

    async def test_workload_with_project_id(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.get(
            workload_url(),
            params={"projectId": str(project.id)}
        )
        assert resp.status_code == 200

    async def test_workload_with_user_id(self, admin_client: AsyncClient, admin_user: User):
        resp = await admin_client.get(
            workload_url(),
            params={"userId": str(admin_user.id)}
        )
        assert resp.status_code == 200

    async def test_workload_requires_auth(self, client: AsyncClient):
        resp = await client.get(workload_url())
        assert resp.status_code in [401, 403]

    async def test_workload_returns_list(self, admin_client: AsyncClient):
        resp = await admin_client.get(workload_url())
        assert isinstance(resp.json(), list)


class TestMemberAssignments:

    async def test_assignments_empty(self, admin_client: AsyncClient, admin_user: User):
        resp = await admin_client.get(member_assignments_url(str(admin_user.id)))
        assert resp.status_code == 200
        assert resp.json() == []

    async def test_assignments_with_dates(self, admin_client: AsyncClient, admin_user: User):
        resp = await admin_client.get(
            member_assignments_url(str(admin_user.id)),
            params={"startDate": "2024-01-01", "endDate": "2024-12-31"}
        )
        assert resp.status_code == 200

    async def test_assignments_requires_auth(self, client: AsyncClient):
        resp = await client.get(member_assignments_url(FAKE_UUID))
        assert resp.status_code in [401, 403]

    async def test_assignments_returns_list(self, admin_client: AsyncClient, admin_user: User):
        resp = await admin_client.get(member_assignments_url(str(admin_user.id)))
        assert isinstance(resp.json(), list)


class TestWorkloadAccessControl:

    async def test_team_members_admin_can_access(self, admin_client: AsyncClient):
        resp = await admin_client.get(team_members_url())
        assert resp.status_code == 200

    async def test_project_members_admin_can_access(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.get(project_members_url(str(project.id)))
        assert resp.status_code == 200

    async def test_workload_admin_can_access(self, admin_client: AsyncClient):
        resp = await admin_client.get(workload_url())
        assert resp.status_code == 200

    async def test_unauthenticated_no_team_members(self, client: AsyncClient):
        resp = await client.get(team_members_url())
        assert resp.status_code in [401, 403]

    async def test_unauthenticated_no_workload(self, client: AsyncClient):
        resp = await client.get(workload_url())
        assert resp.status_code in [401, 403]

    async def test_unauthenticated_no_assignments(self, client: AsyncClient):
        resp = await client.get(member_assignments_url(FAKE_UUID))
        assert resp.status_code in [401, 403]


class TestFileEntityAssociation:

    async def test_files_for_different_entities(self, admin_client: AsyncClient, project: Project, admin_user: User, db: AsyncSession):
        eid1 = uuid.uuid4()
        eid2 = uuid.uuid4()
        await create_file_in_db(db, project.id, admin_user.id, entity_type="equipment", entity_id=eid1)
        await create_file_in_db(db, project.id, admin_user.id, entity_type="material", entity_id=eid2)
        await db.commit()
        resp_eq = await admin_client.get(files_url(str(project.id)), params={"entity_type": "equipment"})
        resp_mat = await admin_client.get(files_url(str(project.id)), params={"entity_type": "material"})
        assert len(resp_eq.json()) == 1
        assert len(resp_mat.json()) == 1

    async def test_entity_id_filter_exact(self, admin_client: AsyncClient, project: Project, admin_user: User, db: AsyncSession):
        target = uuid.uuid4()
        other = uuid.uuid4()
        await create_file_in_db(db, project.id, admin_user.id, entity_id=target)
        await create_file_in_db(db, project.id, admin_user.id, entity_id=other)
        await db.commit()
        resp = await admin_client.get(files_url(str(project.id)), params={"entity_id": str(target)})
        assert len(resp.json()) == 1
        assert resp.json()[0]["entityId"] == str(target)

    async def test_entity_type_values(self, admin_client: AsyncClient, project: Project, admin_user: User, db: AsyncSession):
        for et in ["equipment", "material", "inspection", "rfi"]:
            await create_file_in_db(db, project.id, admin_user.id, entity_type=et, filename=f"{et}.pdf")
        await db.commit()
        resp = await admin_client.get(files_url(str(project.id)))
        assert len(resp.json()) == 4
        types = {f["entityType"] for f in resp.json()}
        assert types == {"equipment", "material", "inspection", "rfi"}


class TestFileMetadata:

    async def test_filename_preserved(self, admin_client: AsyncClient, project: Project, admin_user: User, db: AsyncSession):
        await create_file_in_db(db, project.id, admin_user.id, filename="my_report.pdf")
        await db.commit()
        resp = await admin_client.get(files_url(str(project.id)))
        assert resp.json()[0]["filename"] == "my_report.pdf"

    async def test_file_type_preserved(self, admin_client: AsyncClient, project: Project, admin_user: User, db: AsyncSession):
        await create_file_in_db(db, project.id, admin_user.id, file_type="image/jpeg")
        await db.commit()
        resp = await admin_client.get(files_url(str(project.id)))
        assert resp.json()[0]["fileType"] == "image/jpeg"

    async def test_storage_path_preserved(self, admin_client: AsyncClient, project: Project, admin_user: User, db: AsyncSession):
        path = "uploads/test/file.pdf"
        await create_file_in_db(db, project.id, admin_user.id, storage_path=path)
        await db.commit()
        resp = await admin_client.get(files_url(str(project.id)))
        assert resp.json()[0]["storagePath"] == path

    async def test_large_file_size(self, admin_client: AsyncClient, project: Project, admin_user: User, db: AsyncSession):
        await create_file_in_db(db, project.id, admin_user.id, file_size=104857600)
        await db.commit()
        resp = await admin_client.get(files_url(str(project.id)))
        assert resp.json()[0]["fileSize"] == 104857600

    async def test_zero_file_size(self, admin_client: AsyncClient, project: Project, admin_user: User, db: AsyncSession):
        await create_file_in_db(db, project.id, admin_user.id, file_size=0)
        await db.commit()
        resp = await admin_client.get(files_url(str(project.id)))
        assert resp.json()[0]["fileSize"] == 0


class TestFileDownloadUrl:

    async def test_download_url_contains_path(self, admin_client: AsyncClient, project: Project, admin_user: User, db: AsyncSession):
        f = await create_file_in_db(db, project.id, admin_user.id, storage_path="my/path/doc.pdf")
        await db.commit()
        resp = await admin_client.get(file_download_url(str(project.id), str(f.id)))
        assert resp.status_code == 200
        assert "download_url" in resp.json()

    async def test_download_filename_matches(self, admin_client: AsyncClient, project: Project, admin_user: User, db: AsyncSession):
        f = await create_file_in_db(db, project.id, admin_user.id, filename="specific_name.xlsx")
        await db.commit()
        resp = await admin_client.get(file_download_url(str(project.id), str(f.id)))
        assert resp.json()["filename"] == "specific_name.xlsx"


class TestFileDeleteCleanup:

    async def test_delete_file_then_list_empty(self, admin_client: AsyncClient, project: Project, admin_user: User, db: AsyncSession):
        f = await create_file_in_db(db, project.id, admin_user.id)
        await db.commit()
        await admin_client.delete(file_detail_url(str(project.id), str(f.id)))
        resp = await admin_client.get(files_url(str(project.id)))
        assert resp.json() == []

    async def test_delete_one_of_many(self, admin_client: AsyncClient, project: Project, admin_user: User, db: AsyncSession):
        f1 = await create_file_in_db(db, project.id, admin_user.id, filename="keep.pdf")
        f2 = await create_file_in_db(db, project.id, admin_user.id, filename="delete.pdf")
        await db.commit()
        await admin_client.delete(file_detail_url(str(project.id), str(f2.id)))
        resp = await admin_client.get(files_url(str(project.id)))
        assert len(resp.json()) == 1
        assert resp.json()[0]["filename"] == "keep.pdf"

    async def test_double_delete_fails(self, admin_client: AsyncClient, project: Project, admin_user: User, db: AsyncSession):
        f = await create_file_in_db(db, project.id, admin_user.id)
        await db.commit()
        resp1 = await admin_client.delete(file_detail_url(str(project.id), str(f.id)))
        assert resp1.status_code == 200
        resp2 = await admin_client.delete(file_detail_url(str(project.id), str(f.id)))
        assert resp2.status_code == 404


class TestTeamMemberResponseDetail:

    async def test_team_member_id_is_uuid(self, admin_client: AsyncClient):
        resp = await admin_client.get(team_members_url())
        data = resp.json()
        if data:
            uuid.UUID(str(data[0]["id"]))

    async def test_team_member_user_id_is_uuid(self, admin_client: AsyncClient):
        resp = await admin_client.get(team_members_url())
        data = resp.json()
        if data:
            uuid.UUID(str(data[0]["userId"]))

    async def test_team_member_role_is_string(self, admin_client: AsyncClient):
        resp = await admin_client.get(team_members_url())
        data = resp.json()
        if data:
            assert isinstance(data[0]["role"], str)

    async def test_team_member_available_hours_default(self, admin_client: AsyncClient):
        resp = await admin_client.get(team_members_url())
        data = resp.json()
        if data:
            assert data[0]["availableHours"] == 40

    async def test_project_members_role_present(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.get(project_members_url(str(project.id)))
        data = resp.json()
        assert data[0]["role"] == "project_admin"

    async def test_project_members_user_email(self, admin_client: AsyncClient, project: Project, admin_user: User):
        resp = await admin_client.get(project_members_url(str(project.id)))
        data = resp.json()
        assert data[0]["user"]["email"] == admin_user.email

    async def test_project_members_user_full_name(self, admin_client: AsyncClient, project: Project, admin_user: User):
        resp = await admin_client.get(project_members_url(str(project.id)))
        data = resp.json()
        assert data[0]["user"]["fullName"] == admin_user.full_name


class TestWorkloadQueryParams:

    async def test_workload_start_date_only(self, admin_client: AsyncClient):
        resp = await admin_client.get(workload_url(), params={"startDate": "2024-01-01"})
        assert resp.status_code == 200

    async def test_workload_end_date_only(self, admin_client: AsyncClient):
        resp = await admin_client.get(workload_url(), params={"endDate": "2024-12-31"})
        assert resp.status_code == 200

    async def test_workload_all_params(self, admin_client: AsyncClient, project: Project, admin_user: User):
        resp = await admin_client.get(
            workload_url(),
            params={
                "startDate": "2024-01-01",
                "endDate": "2024-12-31",
                "projectId": str(project.id),
                "userId": str(admin_user.id)
            }
        )
        assert resp.status_code == 200

    async def test_assignments_start_date_only(self, admin_client: AsyncClient, admin_user: User):
        resp = await admin_client.get(
            member_assignments_url(str(admin_user.id)),
            params={"startDate": "2024-01-01"}
        )
        assert resp.status_code == 200

    async def test_assignments_end_date_only(self, admin_client: AsyncClient, admin_user: User):
        resp = await admin_client.get(
            member_assignments_url(str(admin_user.id)),
            params={"endDate": "2024-12-31"}
        )
        assert resp.status_code == 200

    async def test_assignments_both_dates(self, admin_client: AsyncClient, admin_user: User):
        resp = await admin_client.get(
            member_assignments_url(str(admin_user.id)),
            params={"startDate": "2024-01-01", "endDate": "2024-12-31"}
        )
        assert resp.status_code == 200


class TestFileFullLifecycle:

    async def test_upload_get_download_delete(self, file_admin_client: AsyncClient, project: Project):
        entity_id = str(uuid.uuid4())
        upload_resp = await file_admin_client.post(
            files_url(str(project.id)),
            params={"entity_type": "equipment", "entity_id": entity_id},
            files={"file": ("lifecycle.pdf", b"lifecycle content", "application/pdf")}
        )
        assert upload_resp.status_code == 200
        file_id = upload_resp.json()["id"]

        get_resp = await file_admin_client.get(file_detail_url(str(project.id), file_id))
        assert get_resp.status_code == 200
        assert get_resp.json()["filename"] == "lifecycle.pdf"

        download_resp = await file_admin_client.get(file_download_url(str(project.id), file_id))
        assert download_resp.status_code == 200

        delete_resp = await file_admin_client.delete(file_detail_url(str(project.id), file_id))
        assert delete_resp.status_code == 200

        get_after = await file_admin_client.get(file_detail_url(str(project.id), file_id))
        assert get_after.status_code == 404

    async def test_upload_list_filter(self, file_admin_client: AsyncClient, project: Project):
        eid = str(uuid.uuid4())
        await file_admin_client.post(
            files_url(str(project.id)),
            params={"entity_type": "equipment", "entity_id": eid},
            files={"file": ("eq.pdf", b"eq", "application/pdf")}
        )
        await file_admin_client.post(
            files_url(str(project.id)),
            params={"entity_type": "material", "entity_id": str(uuid.uuid4())},
            files={"file": ("mat.pdf", b"mat", "application/pdf")}
        )
        resp = await file_admin_client.get(
            files_url(str(project.id)), params={"entity_type": "equipment"}
        )
        assert len(resp.json()) == 1
        assert resp.json()[0]["filename"] == "eq.pdf"


class TestTeamMembersByProject:

    async def test_project_with_multiple_roles(self, admin_client: AsyncClient, project: Project, admin_user: User, db: AsyncSession):
        for i, role in enumerate(["contractor", "consultant", "inspector"]):
            u = User(
                id=uuid.uuid4(),
                firebase_uid=f"role-{role}-uid-{i}",
                email=f"role-{role}-{i}@test.com",
                full_name=f"User {role}",
                role="user",
                is_active=True
            )
            db.add(u)
            await db.flush()
            db.add(ProjectMember(project_id=project.id, user_id=u.id, role=role))
        await db.commit()
        resp = await admin_client.get(project_members_url(str(project.id)))
        assert len(resp.json()) >= 4

    async def test_team_members_only_active(self, admin_client: AsyncClient, db: AsyncSession):
        inactive = User(
            id=uuid.uuid4(),
            firebase_uid="inactive-uid-wl",
            email="inactive-wl@test.com",
            full_name="Inactive User",
            role="user",
            is_active=False
        )
        db.add(inactive)
        await db.commit()
        resp = await admin_client.get(team_members_url())
        emails = [m["user"]["email"] for m in resp.json()]
        assert "inactive-wl@test.com" not in emails

    async def test_content_type_json_for_team_members(self, admin_client: AsyncClient):
        resp = await admin_client.get(team_members_url())
        assert "application/json" in resp.headers["content-type"]
