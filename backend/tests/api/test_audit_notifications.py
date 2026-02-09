import uuid
from datetime import datetime, timedelta

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit import AuditLog, AuditAction
from app.models.notification import Notification, NotificationCategory
from app.models.user import User
from app.models.project import Project, ProjectMember


API_V1 = "/api/v1"
FAKE_PROJECT_ID = str(uuid.uuid4())
FAKE_UUID = str(uuid.uuid4())


def project_audit_url(project_id: str) -> str:
    return f"{API_V1}/projects/{project_id}/audit"


def global_audit_url() -> str:
    return f"{API_V1}/audit"


def notifications_url() -> str:
    return f"{API_V1}/notifications"


def notification_mark_read_url(notification_id: str) -> str:
    return f"{API_V1}/notifications/{notification_id}/mark-read"


def notifications_mark_all_read_url() -> str:
    return f"{API_V1}/notifications/mark-all-read"


def unread_count_url() -> str:
    return f"{API_V1}/notifications/unread-count"


async def create_audit_log_in_db(
    db: AsyncSession, project_id: uuid.UUID, user_id: uuid.UUID, **overrides
) -> AuditLog:
    data = {
        "id": uuid.uuid4(),
        "project_id": project_id,
        "user_id": user_id,
        "entity_type": "equipment",
        "entity_id": uuid.uuid4(),
        "action": AuditAction.CREATE.value,
    }
    data.update(overrides)
    log = AuditLog(**data)
    db.add(log)
    await db.flush()
    await db.refresh(log)
    return log


async def create_notification_in_db(db: AsyncSession, user_id: uuid.UUID, **overrides) -> Notification:
    data = {
        "id": uuid.uuid4(),
        "user_id": user_id,
        "category": NotificationCategory.GENERAL.value,
        "title": "Test Notification",
        "message": "Test notification message body",
        "is_read": False,
    }
    data.update(overrides)
    notif = Notification(**data)
    db.add(notif)
    await db.flush()
    await db.refresh(notif)
    return notif


class TestProjectAuditLogsList:

    async def test_list_empty(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.get(project_audit_url(str(project.id)))
        assert resp.status_code == 200
        assert resp.json() == []

    async def test_list_returns_logs(self, admin_client: AsyncClient, project: Project, admin_user: User, db: AsyncSession):
        await create_audit_log_in_db(db, project.id, admin_user.id)
        await db.commit()
        resp = await admin_client.get(project_audit_url(str(project.id)))
        assert resp.status_code == 200
        assert len(resp.json()) == 1

    async def test_list_multiple_logs(self, admin_client: AsyncClient, project: Project, admin_user: User, db: AsyncSession):
        for _ in range(5):
            await create_audit_log_in_db(db, project.id, admin_user.id)
        await db.commit()
        resp = await admin_client.get(project_audit_url(str(project.id)))
        assert len(resp.json()) == 5

    async def test_list_ordered_desc(self, admin_client: AsyncClient, project: Project, admin_user: User, db: AsyncSession):
        log1 = await create_audit_log_in_db(db, project.id, admin_user.id, entity_type="first")
        log2 = await create_audit_log_in_db(db, project.id, admin_user.id, entity_type="second")
        await db.commit()
        resp = await admin_client.get(project_audit_url(str(project.id)))
        data = resp.json()
        assert data[0]["entityType"] == "second"

    async def test_filter_by_entity_type(self, admin_client: AsyncClient, project: Project, admin_user: User, db: AsyncSession):
        await create_audit_log_in_db(db, project.id, admin_user.id, entity_type="equipment")
        await create_audit_log_in_db(db, project.id, admin_user.id, entity_type="material")
        await db.commit()
        resp = await admin_client.get(
            project_audit_url(str(project.id)), params={"entity_type": "equipment"}
        )
        data = resp.json()
        assert len(data) == 1
        assert data[0]["entityType"] == "equipment"

    async def test_filter_by_action(self, admin_client: AsyncClient, project: Project, admin_user: User, db: AsyncSession):
        await create_audit_log_in_db(db, project.id, admin_user.id, action=AuditAction.CREATE.value)
        await create_audit_log_in_db(db, project.id, admin_user.id, action=AuditAction.DELETE.value)
        await db.commit()
        resp = await admin_client.get(
            project_audit_url(str(project.id)), params={"action": "create"}
        )
        data = resp.json()
        assert len(data) == 1
        assert data[0]["action"] == "create"

    async def test_filter_by_entity_id(self, admin_client: AsyncClient, project: Project, admin_user: User, db: AsyncSession):
        target_id = uuid.uuid4()
        await create_audit_log_in_db(db, project.id, admin_user.id, entity_id=target_id)
        await create_audit_log_in_db(db, project.id, admin_user.id)
        await db.commit()
        resp = await admin_client.get(
            project_audit_url(str(project.id)), params={"entity_id": str(target_id)}
        )
        assert len(resp.json()) == 1

    async def test_filter_by_user_id(self, admin_client: AsyncClient, project: Project, admin_user: User, db: AsyncSession):
        other_user_id = uuid.uuid4()
        await create_audit_log_in_db(db, project.id, admin_user.id)
        await create_audit_log_in_db(db, project.id, other_user_id)
        await db.commit()
        resp = await admin_client.get(
            project_audit_url(str(project.id)), params={"user_id": str(admin_user.id)}
        )
        assert len(resp.json()) == 1

    async def test_filter_by_start_date(self, admin_client: AsyncClient, project: Project, admin_user: User, db: AsyncSession):
        await create_audit_log_in_db(db, project.id, admin_user.id)
        await db.commit()
        future = (datetime.utcnow() + timedelta(hours=1)).isoformat()
        resp = await admin_client.get(
            project_audit_url(str(project.id)), params={"start_date": future}
        )
        assert len(resp.json()) == 0

    async def test_filter_by_end_date(self, admin_client: AsyncClient, project: Project, admin_user: User, db: AsyncSession):
        await create_audit_log_in_db(db, project.id, admin_user.id)
        await db.commit()
        past = (datetime.utcnow() - timedelta(hours=1)).isoformat()
        resp = await admin_client.get(
            project_audit_url(str(project.id)), params={"end_date": past}
        )
        assert len(resp.json()) == 0

    async def test_pagination_limit(self, admin_client: AsyncClient, project: Project, admin_user: User, db: AsyncSession):
        for _ in range(5):
            await create_audit_log_in_db(db, project.id, admin_user.id)
        await db.commit()
        resp = await admin_client.get(
            project_audit_url(str(project.id)), params={"limit": 2}
        )
        assert len(resp.json()) == 2

    async def test_pagination_offset(self, admin_client: AsyncClient, project: Project, admin_user: User, db: AsyncSession):
        for _ in range(5):
            await create_audit_log_in_db(db, project.id, admin_user.id)
        await db.commit()
        resp = await admin_client.get(
            project_audit_url(str(project.id)), params={"offset": 3}
        )
        assert len(resp.json()) == 2

    async def test_pagination_limit_and_offset(self, admin_client: AsyncClient, project: Project, admin_user: User, db: AsyncSession):
        for _ in range(10):
            await create_audit_log_in_db(db, project.id, admin_user.id)
        await db.commit()
        resp = await admin_client.get(
            project_audit_url(str(project.id)), params={"limit": 3, "offset": 2}
        )
        assert len(resp.json()) == 3

    async def test_requires_auth(self, client: AsyncClient, project: Project):
        resp = await client.get(project_audit_url(str(project.id)))
        assert resp.status_code in [401, 403]

    async def test_requires_project_access(self, user_client: AsyncClient):
        resp = await user_client.get(project_audit_url(FAKE_PROJECT_ID))
        assert resp.status_code == 403

    async def test_combined_filters(self, admin_client: AsyncClient, project: Project, admin_user: User, db: AsyncSession):
        await create_audit_log_in_db(
            db, project.id, admin_user.id,
            entity_type="equipment", action=AuditAction.CREATE.value
        )
        await create_audit_log_in_db(
            db, project.id, admin_user.id,
            entity_type="equipment", action=AuditAction.DELETE.value
        )
        await create_audit_log_in_db(
            db, project.id, admin_user.id,
            entity_type="material", action=AuditAction.CREATE.value
        )
        await db.commit()
        resp = await admin_client.get(
            project_audit_url(str(project.id)),
            params={"entity_type": "equipment", "action": "create"}
        )
        assert len(resp.json()) == 1


class TestAuditLogResponseFormat:

    async def test_response_fields(self, admin_client: AsyncClient, project: Project, admin_user: User, db: AsyncSession):
        await create_audit_log_in_db(db, project.id, admin_user.id)
        await db.commit()
        resp = await admin_client.get(project_audit_url(str(project.id)))
        item = resp.json()[0]
        assert "id" in item
        assert "projectId" in item
        assert "userId" in item
        assert "entityType" in item
        assert "entityId" in item
        assert "action" in item
        assert "createdAt" in item

    async def test_id_is_valid_uuid(self, admin_client: AsyncClient, project: Project, admin_user: User, db: AsyncSession):
        await create_audit_log_in_db(db, project.id, admin_user.id)
        await db.commit()
        resp = await admin_client.get(project_audit_url(str(project.id)))
        uuid.UUID(resp.json()[0]["id"])

    async def test_created_at_parseable(self, admin_client: AsyncClient, project: Project, admin_user: User, db: AsyncSession):
        await create_audit_log_in_db(db, project.id, admin_user.id)
        await db.commit()
        resp = await admin_client.get(project_audit_url(str(project.id)))
        datetime.fromisoformat(resp.json()[0]["createdAt"].replace("Z", "+00:00"))

    async def test_old_values_nullable(self, admin_client: AsyncClient, project: Project, admin_user: User, db: AsyncSession):
        await create_audit_log_in_db(db, project.id, admin_user.id, old_values=None)
        await db.commit()
        resp = await admin_client.get(project_audit_url(str(project.id)))
        assert resp.json()[0]["oldValues"] is None

    async def test_new_values_nullable(self, admin_client: AsyncClient, project: Project, admin_user: User, db: AsyncSession):
        await create_audit_log_in_db(db, project.id, admin_user.id, new_values=None)
        await db.commit()
        resp = await admin_client.get(project_audit_url(str(project.id)))
        assert resp.json()[0]["newValues"] is None

    async def test_with_old_and_new_values(self, admin_client: AsyncClient, project: Project, admin_user: User, db: AsyncSession):
        await create_audit_log_in_db(
            db, project.id, admin_user.id,
            old_values={"status": "draft"}, new_values={"status": "approved"}
        )
        await db.commit()
        resp = await admin_client.get(project_audit_url(str(project.id)))
        item = resp.json()[0]
        assert item["oldValues"]["status"] == "draft"
        assert item["newValues"]["status"] == "approved"

    async def test_user_field_present(self, admin_client: AsyncClient, project: Project, admin_user: User, db: AsyncSession):
        await create_audit_log_in_db(db, project.id, admin_user.id)
        await db.commit()
        resp = await admin_client.get(project_audit_url(str(project.id)))
        item = resp.json()[0]
        assert "user" in item

    async def test_camel_case_response(self, admin_client: AsyncClient, project: Project, admin_user: User, db: AsyncSession):
        await create_audit_log_in_db(db, project.id, admin_user.id)
        await db.commit()
        resp = await admin_client.get(project_audit_url(str(project.id)))
        item = resp.json()[0]
        assert "entityType" in item
        assert "entityId" in item
        assert "createdAt" in item
        assert "entity_type" not in item


class TestGlobalAuditLogs:

    async def test_list_global_empty(self, admin_client: AsyncClient):
        resp = await admin_client.get(global_audit_url())
        assert resp.status_code == 200
        assert resp.json() == []

    async def test_list_global_returns_only_accessible(
        self, admin_client: AsyncClient, project: Project, admin_user: User, db: AsyncSession
    ):
        await create_audit_log_in_db(db, project.id, admin_user.id)
        await db.commit()
        resp = await admin_client.get(global_audit_url())
        assert len(resp.json()) == 1

    async def test_global_filter_by_entity_type(
        self, admin_client: AsyncClient, project: Project, admin_user: User, db: AsyncSession
    ):
        await create_audit_log_in_db(db, project.id, admin_user.id, entity_type="equipment")
        await create_audit_log_in_db(db, project.id, admin_user.id, entity_type="material")
        await db.commit()
        resp = await admin_client.get(global_audit_url(), params={"entity_type": "material"})
        assert len(resp.json()) == 1

    async def test_global_filter_by_action(
        self, admin_client: AsyncClient, project: Project, admin_user: User, db: AsyncSession
    ):
        await create_audit_log_in_db(db, project.id, admin_user.id, action=AuditAction.UPDATE.value)
        await create_audit_log_in_db(db, project.id, admin_user.id, action=AuditAction.CREATE.value)
        await db.commit()
        resp = await admin_client.get(global_audit_url(), params={"action": "update"})
        assert len(resp.json()) == 1

    async def test_global_pagination(
        self, admin_client: AsyncClient, project: Project, admin_user: User, db: AsyncSession
    ):
        for _ in range(5):
            await create_audit_log_in_db(db, project.id, admin_user.id)
        await db.commit()
        resp = await admin_client.get(global_audit_url(), params={"limit": 3})
        assert len(resp.json()) == 3

    async def test_global_requires_auth(self, client: AsyncClient):
        resp = await client.get(global_audit_url())
        assert resp.status_code in [401, 403]

    async def test_global_filter_by_user_id(
        self, admin_client: AsyncClient, project: Project, admin_user: User, db: AsyncSession
    ):
        await create_audit_log_in_db(db, project.id, admin_user.id)
        await db.commit()
        resp = await admin_client.get(global_audit_url(), params={"user_id": str(admin_user.id)})
        assert len(resp.json()) == 1

    async def test_global_filter_start_date(
        self, admin_client: AsyncClient, project: Project, admin_user: User, db: AsyncSession
    ):
        await create_audit_log_in_db(db, project.id, admin_user.id)
        await db.commit()
        future = (datetime.utcnow() + timedelta(hours=1)).isoformat()
        resp = await admin_client.get(global_audit_url(), params={"start_date": future})
        assert len(resp.json()) == 0

    async def test_global_filter_end_date(
        self, admin_client: AsyncClient, project: Project, admin_user: User, db: AsyncSession
    ):
        await create_audit_log_in_db(db, project.id, admin_user.id)
        await db.commit()
        past = (datetime.utcnow() - timedelta(hours=1)).isoformat()
        resp = await admin_client.get(global_audit_url(), params={"end_date": past})
        assert len(resp.json()) == 0


class TestAuditLogActions:

    async def test_all_action_types(self, admin_client: AsyncClient, project: Project, admin_user: User, db: AsyncSession):
        for action in AuditAction:
            await create_audit_log_in_db(db, project.id, admin_user.id, action=action.value)
        await db.commit()
        resp = await admin_client.get(project_audit_url(str(project.id)))
        actions = [log["action"] for log in resp.json()]
        for action in AuditAction:
            assert action.value in actions

    async def test_status_change_action(self, admin_client: AsyncClient, project: Project, admin_user: User, db: AsyncSession):
        await create_audit_log_in_db(
            db, project.id, admin_user.id,
            action=AuditAction.STATUS_CHANGE.value,
            old_values={"status": "draft"},
            new_values={"status": "approved"}
        )
        await db.commit()
        resp = await admin_client.get(
            project_audit_url(str(project.id)), params={"action": "status_change"}
        )
        assert len(resp.json()) == 1


class TestListNotifications:

    async def test_list_empty(self, admin_client: AsyncClient):
        resp = await admin_client.get(notifications_url())
        assert resp.status_code == 200
        assert resp.json() == []

    async def test_list_returns_user_notifications(self, admin_client: AsyncClient, admin_user: User, db: AsyncSession):
        await create_notification_in_db(db, admin_user.id)
        await db.commit()
        resp = await admin_client.get(notifications_url())
        assert len(resp.json()) == 1

    async def test_list_only_own_notifications(self, admin_client: AsyncClient, admin_user: User, db: AsyncSession):
        other_user_id = uuid.uuid4()
        await create_notification_in_db(db, admin_user.id, title="Mine")
        await create_notification_in_db(db, other_user_id, title="Not mine")
        await db.commit()
        resp = await admin_client.get(notifications_url())
        data = resp.json()
        assert len(data) == 1
        assert data[0]["title"] == "Mine"

    async def test_list_multiple(self, admin_client: AsyncClient, admin_user: User, db: AsyncSession):
        for i in range(5):
            await create_notification_in_db(db, admin_user.id, title=f"Notif {i}")
        await db.commit()
        resp = await admin_client.get(notifications_url())
        assert len(resp.json()) == 5

    async def test_list_filter_by_category(self, admin_client: AsyncClient, admin_user: User, db: AsyncSession):
        await create_notification_in_db(db, admin_user.id, category=NotificationCategory.APPROVAL.value)
        await create_notification_in_db(db, admin_user.id, category=NotificationCategory.GENERAL.value)
        await db.commit()
        resp = await admin_client.get(notifications_url(), params={"category": "approval"})
        data = resp.json()
        assert len(data) == 1
        assert data[0]["category"] == "approval"

    async def test_list_filter_category_no_match(self, admin_client: AsyncClient, admin_user: User, db: AsyncSession):
        await create_notification_in_db(db, admin_user.id, category=NotificationCategory.GENERAL.value)
        await db.commit()
        resp = await admin_client.get(notifications_url(), params={"category": "inspection"})
        assert resp.json() == []

    async def test_list_ordered_desc(self, admin_client: AsyncClient, admin_user: User, db: AsyncSession):
        await create_notification_in_db(db, admin_user.id, title="First")
        await create_notification_in_db(db, admin_user.id, title="Second")
        await db.commit()
        resp = await admin_client.get(notifications_url())
        data = resp.json()
        assert data[0]["title"] == "Second"

    async def test_list_requires_auth(self, client: AsyncClient):
        resp = await client.get(notifications_url())
        assert resp.status_code in [401, 403]


class TestNotificationResponseFormat:

    async def test_response_fields(self, admin_client: AsyncClient, admin_user: User, db: AsyncSession):
        await create_notification_in_db(db, admin_user.id)
        await db.commit()
        resp = await admin_client.get(notifications_url())
        item = resp.json()[0]
        assert "id" in item
        assert "userId" in item
        assert "category" in item
        assert "title" in item
        assert "message" in item
        assert "isRead" in item
        assert "createdAt" in item
        assert "updatedAt" in item

    async def test_camel_case_keys(self, admin_client: AsyncClient, admin_user: User, db: AsyncSession):
        await create_notification_in_db(db, admin_user.id)
        await db.commit()
        resp = await admin_client.get(notifications_url())
        item = resp.json()[0]
        assert "userId" in item
        assert "isRead" in item
        assert "createdAt" in item
        assert "user_id" not in item
        assert "is_read" not in item

    async def test_id_is_uuid(self, admin_client: AsyncClient, admin_user: User, db: AsyncSession):
        await create_notification_in_db(db, admin_user.id)
        await db.commit()
        resp = await admin_client.get(notifications_url())
        uuid.UUID(resp.json()[0]["id"])

    async def test_is_read_boolean(self, admin_client: AsyncClient, admin_user: User, db: AsyncSession):
        await create_notification_in_db(db, admin_user.id, is_read=False)
        await db.commit()
        resp = await admin_client.get(notifications_url())
        assert resp.json()[0]["isRead"] is False

    async def test_related_entity_fields_nullable(self, admin_client: AsyncClient, admin_user: User, db: AsyncSession):
        await create_notification_in_db(db, admin_user.id, related_entity_type=None, related_entity_id=None)
        await db.commit()
        resp = await admin_client.get(notifications_url())
        item = resp.json()[0]
        assert item.get("relatedEntityType") is None
        assert item.get("relatedEntityId") is None

    async def test_related_entity_fields_present(self, admin_client: AsyncClient, admin_user: User, db: AsyncSession):
        entity_id = uuid.uuid4()
        await create_notification_in_db(
            db, admin_user.id,
            related_entity_type="equipment",
            related_entity_id=entity_id
        )
        await db.commit()
        resp = await admin_client.get(notifications_url())
        item = resp.json()[0]
        assert item["relatedEntityType"] == "equipment"
        assert item["relatedEntityId"] == str(entity_id)


class TestMarkNotificationRead:

    async def test_mark_single_read(self, admin_client: AsyncClient, admin_user: User, db: AsyncSession):
        notif = await create_notification_in_db(db, admin_user.id, is_read=False)
        await db.commit()
        resp = await admin_client.put(notification_mark_read_url(str(notif.id)))
        assert resp.status_code == 200
        assert resp.json()["isRead"] is True

    async def test_mark_read_not_found(self, admin_client: AsyncClient):
        resp = await admin_client.put(notification_mark_read_url(FAKE_UUID))
        assert resp.status_code == 404

    async def test_mark_read_wrong_user(self, admin_client: AsyncClient, db: AsyncSession):
        other_user_id = uuid.uuid4()
        notif = await create_notification_in_db(db, other_user_id)
        await db.commit()
        resp = await admin_client.put(notification_mark_read_url(str(notif.id)))
        assert resp.status_code == 404

    async def test_mark_already_read(self, admin_client: AsyncClient, admin_user: User, db: AsyncSession):
        notif = await create_notification_in_db(db, admin_user.id, is_read=True)
        await db.commit()
        resp = await admin_client.put(notification_mark_read_url(str(notif.id)))
        assert resp.status_code == 200
        assert resp.json()["isRead"] is True

    async def test_mark_read_returns_notification(self, admin_client: AsyncClient, admin_user: User, db: AsyncSession):
        notif = await create_notification_in_db(db, admin_user.id, title="My Notif")
        await db.commit()
        resp = await admin_client.put(notification_mark_read_url(str(notif.id)))
        data = resp.json()
        assert data["title"] == "My Notif"
        assert data["id"] == str(notif.id)

    async def test_mark_read_requires_auth(self, client: AsyncClient, db: AsyncSession, admin_user: User):
        notif = await create_notification_in_db(db, admin_user.id)
        await db.commit()
        resp = await client.put(notification_mark_read_url(str(notif.id)))
        assert resp.status_code in [401, 403]

    async def test_mark_read_invalid_uuid(self, admin_client: AsyncClient):
        resp = await admin_client.put(notification_mark_read_url("bad"))
        assert resp.status_code == 422

    async def test_mark_read_persists(self, admin_client: AsyncClient, admin_user: User, db: AsyncSession):
        notif = await create_notification_in_db(db, admin_user.id, is_read=False)
        await db.commit()
        await admin_client.put(notification_mark_read_url(str(notif.id)))
        resp = await admin_client.get(notifications_url())
        data = resp.json()
        matched = [n for n in data if n["id"] == str(notif.id)]
        assert matched[0]["isRead"] is True


class TestMarkAllNotificationsRead:

    async def test_mark_all_read(self, admin_client: AsyncClient, admin_user: User, db: AsyncSession):
        for _ in range(3):
            await create_notification_in_db(db, admin_user.id, is_read=False)
        await db.commit()
        resp = await admin_client.put(notifications_mark_all_read_url())
        assert resp.status_code == 200
        assert "3" in resp.json()["message"]

    async def test_mark_all_read_no_unread(self, admin_client: AsyncClient, admin_user: User, db: AsyncSession):
        await create_notification_in_db(db, admin_user.id, is_read=True)
        await db.commit()
        resp = await admin_client.put(notifications_mark_all_read_url())
        assert resp.status_code == 200
        assert "0" in resp.json()["message"]

    async def test_mark_all_read_empty(self, admin_client: AsyncClient):
        resp = await admin_client.put(notifications_mark_all_read_url())
        assert resp.status_code == 200

    async def test_mark_all_read_only_own(self, admin_client: AsyncClient, admin_user: User, db: AsyncSession):
        other_user_id = uuid.uuid4()
        await create_notification_in_db(db, admin_user.id, is_read=False)
        await create_notification_in_db(db, other_user_id, is_read=False)
        await db.commit()
        resp = await admin_client.put(notifications_mark_all_read_url())
        assert "1" in resp.json()["message"]

    async def test_mark_all_read_requires_auth(self, client: AsyncClient):
        resp = await client.put(notifications_mark_all_read_url())
        assert resp.status_code in [401, 403]

    async def test_mark_all_read_persists(self, admin_client: AsyncClient, admin_user: User, db: AsyncSession):
        for _ in range(3):
            await create_notification_in_db(db, admin_user.id, is_read=False)
        await db.commit()
        await admin_client.put(notifications_mark_all_read_url())
        resp = await admin_client.get(notifications_url())
        for notif in resp.json():
            assert notif["isRead"] is True


class TestUnreadCount:

    async def test_unread_count_zero(self, admin_client: AsyncClient):
        resp = await admin_client.get(unread_count_url())
        assert resp.status_code == 200
        assert resp.json()["unreadCount"] == 0

    async def test_unread_count_with_unread(self, admin_client: AsyncClient, admin_user: User, db: AsyncSession):
        for _ in range(3):
            await create_notification_in_db(db, admin_user.id, is_read=False)
        await db.commit()
        resp = await admin_client.get(unread_count_url())
        assert resp.json()["unreadCount"] == 3

    async def test_unread_count_excludes_read(self, admin_client: AsyncClient, admin_user: User, db: AsyncSession):
        await create_notification_in_db(db, admin_user.id, is_read=False)
        await create_notification_in_db(db, admin_user.id, is_read=True)
        await db.commit()
        resp = await admin_client.get(unread_count_url())
        assert resp.json()["unreadCount"] == 1

    async def test_unread_count_only_own(self, admin_client: AsyncClient, admin_user: User, db: AsyncSession):
        other_user_id = uuid.uuid4()
        await create_notification_in_db(db, admin_user.id, is_read=False)
        await create_notification_in_db(db, other_user_id, is_read=False)
        await db.commit()
        resp = await admin_client.get(unread_count_url())
        assert resp.json()["unreadCount"] == 1

    async def test_unread_count_requires_auth(self, client: AsyncClient):
        resp = await client.get(unread_count_url())
        assert resp.status_code in [401, 403]

    async def test_unread_count_after_mark_read(self, admin_client: AsyncClient, admin_user: User, db: AsyncSession):
        notif = await create_notification_in_db(db, admin_user.id, is_read=False)
        await db.commit()
        await admin_client.put(notification_mark_read_url(str(notif.id)))
        resp = await admin_client.get(unread_count_url())
        assert resp.json()["unreadCount"] == 0

    async def test_unread_count_after_mark_all_read(self, admin_client: AsyncClient, admin_user: User, db: AsyncSession):
        for _ in range(5):
            await create_notification_in_db(db, admin_user.id, is_read=False)
        await db.commit()
        await admin_client.put(notifications_mark_all_read_url())
        resp = await admin_client.get(unread_count_url())
        assert resp.json()["unreadCount"] == 0

    async def test_unread_count_camel_case(self, admin_client: AsyncClient):
        resp = await admin_client.get(unread_count_url())
        assert "unreadCount" in resp.json()


class TestNotificationCategories:

    async def test_approval_category(self, admin_client: AsyncClient, admin_user: User, db: AsyncSession):
        await create_notification_in_db(db, admin_user.id, category=NotificationCategory.APPROVAL.value)
        await db.commit()
        resp = await admin_client.get(notifications_url(), params={"category": "approval"})
        assert len(resp.json()) == 1

    async def test_inspection_category(self, admin_client: AsyncClient, admin_user: User, db: AsyncSession):
        await create_notification_in_db(db, admin_user.id, category=NotificationCategory.INSPECTION.value)
        await db.commit()
        resp = await admin_client.get(notifications_url(), params={"category": "inspection"})
        assert len(resp.json()) == 1

    async def test_update_category(self, admin_client: AsyncClient, admin_user: User, db: AsyncSession):
        await create_notification_in_db(db, admin_user.id, category=NotificationCategory.UPDATE.value)
        await db.commit()
        resp = await admin_client.get(notifications_url(), params={"category": "update"})
        assert len(resp.json()) == 1

    async def test_general_category(self, admin_client: AsyncClient, admin_user: User, db: AsyncSession):
        await create_notification_in_db(db, admin_user.id, category=NotificationCategory.GENERAL.value)
        await db.commit()
        resp = await admin_client.get(notifications_url(), params={"category": "general"})
        assert len(resp.json()) == 1

    async def test_all_categories_in_unfiltered_list(self, admin_client: AsyncClient, admin_user: User, db: AsyncSession):
        for cat in NotificationCategory:
            await create_notification_in_db(db, admin_user.id, category=cat.value, title=cat.value)
        await db.commit()
        resp = await admin_client.get(notifications_url())
        assert len(resp.json()) == len(NotificationCategory)


class TestNotificationEdgeCases:

    async def test_mark_read_then_list_shows_read(self, admin_client: AsyncClient, admin_user: User, db: AsyncSession):
        notif = await create_notification_in_db(db, admin_user.id, is_read=False)
        await db.commit()
        await admin_client.put(notification_mark_read_url(str(notif.id)))
        resp = await admin_client.get(notifications_url())
        matched = [n for n in resp.json() if n["id"] == str(notif.id)]
        assert matched[0]["isRead"] is True

    async def test_many_notifications_performance(self, admin_client: AsyncClient, admin_user: User, db: AsyncSession):
        for i in range(20):
            await create_notification_in_db(db, admin_user.id, title=f"Notification {i}")
        await db.commit()
        resp = await admin_client.get(notifications_url())
        assert len(resp.json()) == 20

    async def test_notification_with_related_entity(self, admin_client: AsyncClient, admin_user: User, db: AsyncSession):
        entity_id = uuid.uuid4()
        await create_notification_in_db(
            db, admin_user.id,
            related_entity_type="inspection",
            related_entity_id=entity_id
        )
        await db.commit()
        resp = await admin_client.get(notifications_url())
        item = resp.json()[0]
        assert item["relatedEntityType"] == "inspection"
        assert item["relatedEntityId"] == str(entity_id)


class TestAuditLogIsolation:

    async def test_logs_scoped_to_project(self, admin_client: AsyncClient, admin_user: User, db: AsyncSession):
        proj1 = Project(
            id=uuid.uuid4(), name="P1", code="P1-CODE",
            status="active", created_by_id=admin_user.id
        )
        proj2 = Project(
            id=uuid.uuid4(), name="P2", code="P2-CODE",
            status="active", created_by_id=admin_user.id
        )
        db.add_all([proj1, proj2])
        await db.flush()
        db.add(ProjectMember(project_id=proj1.id, user_id=admin_user.id, role="project_admin"))
        db.add(ProjectMember(project_id=proj2.id, user_id=admin_user.id, role="project_admin"))
        await db.flush()
        await create_audit_log_in_db(db, proj1.id, admin_user.id, entity_type="eq1")
        await create_audit_log_in_db(db, proj2.id, admin_user.id, entity_type="eq2")
        await db.commit()
        resp1 = await admin_client.get(project_audit_url(str(proj1.id)))
        resp2 = await admin_client.get(project_audit_url(str(proj2.id)))
        assert len(resp1.json()) == 1
        assert resp1.json()[0]["entityType"] == "eq1"
        assert len(resp2.json()) == 1
        assert resp2.json()[0]["entityType"] == "eq2"

    async def test_global_shows_all_accessible_projects(self, admin_client: AsyncClient, admin_user: User, db: AsyncSession):
        proj1 = Project(
            id=uuid.uuid4(), name="P1", code="P1-GL",
            status="active", created_by_id=admin_user.id
        )
        proj2 = Project(
            id=uuid.uuid4(), name="P2", code="P2-GL",
            status="active", created_by_id=admin_user.id
        )
        db.add_all([proj1, proj2])
        await db.flush()
        db.add(ProjectMember(project_id=proj1.id, user_id=admin_user.id, role="project_admin"))
        db.add(ProjectMember(project_id=proj2.id, user_id=admin_user.id, role="project_admin"))
        await db.flush()
        await create_audit_log_in_db(db, proj1.id, admin_user.id)
        await create_audit_log_in_db(db, proj2.id, admin_user.id)
        await db.commit()
        resp = await admin_client.get(global_audit_url())
        assert len(resp.json()) == 2


class TestAuditLogEntityTypes:

    async def test_entity_type_equipment(self, admin_client: AsyncClient, project: Project, admin_user: User, db: AsyncSession):
        await create_audit_log_in_db(db, project.id, admin_user.id, entity_type="equipment")
        await db.commit()
        resp = await admin_client.get(project_audit_url(str(project.id)), params={"entity_type": "equipment"})
        assert len(resp.json()) == 1

    async def test_entity_type_material(self, admin_client: AsyncClient, project: Project, admin_user: User, db: AsyncSession):
        await create_audit_log_in_db(db, project.id, admin_user.id, entity_type="material")
        await db.commit()
        resp = await admin_client.get(project_audit_url(str(project.id)), params={"entity_type": "material"})
        assert len(resp.json()) == 1

    async def test_entity_type_file(self, admin_client: AsyncClient, project: Project, admin_user: User, db: AsyncSession):
        await create_audit_log_in_db(db, project.id, admin_user.id, entity_type="file")
        await db.commit()
        resp = await admin_client.get(project_audit_url(str(project.id)), params={"entity_type": "file"})
        assert len(resp.json()) == 1

    async def test_entity_type_equipment_template(self, admin_client: AsyncClient, project: Project, admin_user: User, db: AsyncSession):
        await create_audit_log_in_db(db, project.id, admin_user.id, entity_type="equipment_template")
        await db.commit()
        resp = await admin_client.get(project_audit_url(str(project.id)), params={"entity_type": "equipment_template"})
        assert len(resp.json()) == 1

    async def test_entity_type_material_template(self, admin_client: AsyncClient, project: Project, admin_user: User, db: AsyncSession):
        await create_audit_log_in_db(db, project.id, admin_user.id, entity_type="material_template")
        await db.commit()
        resp = await admin_client.get(project_audit_url(str(project.id)), params={"entity_type": "material_template"})
        assert len(resp.json()) == 1

    async def test_entity_type_equipment_submission(self, admin_client: AsyncClient, project: Project, admin_user: User, db: AsyncSession):
        await create_audit_log_in_db(db, project.id, admin_user.id, entity_type="equipment_submission")
        await db.commit()
        resp = await admin_client.get(project_audit_url(str(project.id)), params={"entity_type": "equipment_submission"})
        assert len(resp.json()) == 1

    async def test_entity_type_approval_decision(self, admin_client: AsyncClient, project: Project, admin_user: User, db: AsyncSession):
        await create_audit_log_in_db(db, project.id, admin_user.id, entity_type="approval_decision")
        await db.commit()
        resp = await admin_client.get(project_audit_url(str(project.id)), params={"entity_type": "approval_decision"})
        assert len(resp.json()) == 1

    async def test_multiple_entity_types_mixed(self, admin_client: AsyncClient, project: Project, admin_user: User, db: AsyncSession):
        for et in ["equipment", "material", "file", "equipment_template"]:
            await create_audit_log_in_db(db, project.id, admin_user.id, entity_type=et)
        await db.commit()
        resp = await admin_client.get(project_audit_url(str(project.id)))
        assert len(resp.json()) == 4


class TestAuditLogDateRanges:

    async def test_start_date_inclusive(self, admin_client: AsyncClient, project: Project, admin_user: User, db: AsyncSession):
        await create_audit_log_in_db(db, project.id, admin_user.id)
        await db.commit()
        past = (datetime.utcnow() - timedelta(hours=1)).isoformat()
        resp = await admin_client.get(project_audit_url(str(project.id)), params={"start_date": past})
        assert len(resp.json()) == 1

    async def test_end_date_inclusive(self, admin_client: AsyncClient, project: Project, admin_user: User, db: AsyncSession):
        await create_audit_log_in_db(db, project.id, admin_user.id)
        await db.commit()
        future = (datetime.utcnow() + timedelta(hours=1)).isoformat()
        resp = await admin_client.get(project_audit_url(str(project.id)), params={"end_date": future})
        assert len(resp.json()) == 1

    async def test_date_range_both(self, admin_client: AsyncClient, project: Project, admin_user: User, db: AsyncSession):
        await create_audit_log_in_db(db, project.id, admin_user.id)
        await db.commit()
        start = (datetime.utcnow() - timedelta(hours=1)).isoformat()
        end = (datetime.utcnow() + timedelta(hours=1)).isoformat()
        resp = await admin_client.get(
            project_audit_url(str(project.id)),
            params={"start_date": start, "end_date": end}
        )
        assert len(resp.json()) == 1

    async def test_date_range_no_results(self, admin_client: AsyncClient, project: Project, admin_user: User, db: AsyncSession):
        await create_audit_log_in_db(db, project.id, admin_user.id)
        await db.commit()
        far_past = (datetime.utcnow() - timedelta(days=30)).isoformat()
        past = (datetime.utcnow() - timedelta(days=29)).isoformat()
        resp = await admin_client.get(
            project_audit_url(str(project.id)),
            params={"start_date": far_past, "end_date": past}
        )
        assert len(resp.json()) == 0


class TestAuditLogPaginationAdvanced:

    async def test_offset_beyond_total(self, admin_client: AsyncClient, project: Project, admin_user: User, db: AsyncSession):
        for _ in range(3):
            await create_audit_log_in_db(db, project.id, admin_user.id)
        await db.commit()
        resp = await admin_client.get(project_audit_url(str(project.id)), params={"offset": 100})
        assert len(resp.json()) == 0

    async def test_limit_zero(self, admin_client: AsyncClient, project: Project, admin_user: User, db: AsyncSession):
        await create_audit_log_in_db(db, project.id, admin_user.id)
        await db.commit()
        resp = await admin_client.get(project_audit_url(str(project.id)), params={"limit": 0})
        assert len(resp.json()) == 0

    async def test_limit_one(self, admin_client: AsyncClient, project: Project, admin_user: User, db: AsyncSession):
        for _ in range(5):
            await create_audit_log_in_db(db, project.id, admin_user.id)
        await db.commit()
        resp = await admin_client.get(project_audit_url(str(project.id)), params={"limit": 1})
        assert len(resp.json()) == 1

    async def test_default_limit(self, admin_client: AsyncClient, project: Project, admin_user: User, db: AsyncSession):
        for _ in range(3):
            await create_audit_log_in_db(db, project.id, admin_user.id)
        await db.commit()
        resp = await admin_client.get(project_audit_url(str(project.id)))
        assert len(resp.json()) == 3


class TestAuditLogWithValues:

    async def test_create_action_has_new_values(self, admin_client: AsyncClient, project: Project, admin_user: User, db: AsyncSession):
        await create_audit_log_in_db(
            db, project.id, admin_user.id,
            action=AuditAction.CREATE.value,
            new_values={"name": "New Equipment", "status": "draft"}
        )
        await db.commit()
        resp = await admin_client.get(project_audit_url(str(project.id)))
        item = resp.json()[0]
        assert item["newValues"]["name"] == "New Equipment"

    async def test_update_has_old_and_new(self, admin_client: AsyncClient, project: Project, admin_user: User, db: AsyncSession):
        await create_audit_log_in_db(
            db, project.id, admin_user.id,
            action=AuditAction.UPDATE.value,
            old_values={"name": "Old Name"},
            new_values={"name": "New Name"}
        )
        await db.commit()
        resp = await admin_client.get(project_audit_url(str(project.id)))
        item = resp.json()[0]
        assert item["oldValues"]["name"] == "Old Name"
        assert item["newValues"]["name"] == "New Name"

    async def test_delete_has_old_values(self, admin_client: AsyncClient, project: Project, admin_user: User, db: AsyncSession):
        await create_audit_log_in_db(
            db, project.id, admin_user.id,
            action=AuditAction.DELETE.value,
            old_values={"name": "Deleted Item"}
        )
        await db.commit()
        resp = await admin_client.get(project_audit_url(str(project.id)))
        item = resp.json()[0]
        assert item["oldValues"]["name"] == "Deleted Item"

    async def test_ip_address_present(self, admin_client: AsyncClient, project: Project, admin_user: User, db: AsyncSession):
        await create_audit_log_in_db(
            db, project.id, admin_user.id,
            ip_address="192.168.1.1"
        )
        await db.commit()
        resp = await admin_client.get(project_audit_url(str(project.id)))
        assert resp.json()[0]["ipAddress"] == "192.168.1.1"

    async def test_user_agent_present(self, admin_client: AsyncClient, project: Project, admin_user: User, db: AsyncSession):
        await create_audit_log_in_db(
            db, project.id, admin_user.id,
            user_agent="Mozilla/5.0 Test"
        )
        await db.commit()
        resp = await admin_client.get(project_audit_url(str(project.id)))
        assert resp.json()[0]["userAgent"] == "Mozilla/5.0 Test"


class TestNotificationMultipleUsers:

    async def test_admin_sees_only_own_notifications(self, admin_client: AsyncClient, admin_user: User, db: AsyncSession):
        other_user_id = uuid.uuid4()
        await create_notification_in_db(db, admin_user.id, title="Admin Notif")
        await create_notification_in_db(db, other_user_id, title="Other Notif")
        await db.commit()
        admin_resp = await admin_client.get(notifications_url())
        assert len(admin_resp.json()) == 1
        assert admin_resp.json()[0]["title"] == "Admin Notif"

    async def test_user_sees_only_own_notifications(self, user_client: AsyncClient, regular_user: User, db: AsyncSession):
        other_user_id = uuid.uuid4()
        await create_notification_in_db(db, regular_user.id, title="User Notif")
        await create_notification_in_db(db, other_user_id, title="Other Notif")
        await db.commit()
        user_resp = await user_client.get(notifications_url())
        assert len(user_resp.json()) == 1
        assert user_resp.json()[0]["title"] == "User Notif"

    async def test_mark_read_does_not_affect_other_user(
        self, admin_client: AsyncClient, admin_user: User, db: AsyncSession
    ):
        other_user_id = uuid.uuid4()
        admin_notif = await create_notification_in_db(db, admin_user.id, is_read=False)
        other_notif = await create_notification_in_db(db, other_user_id, is_read=False)
        await db.commit()
        await admin_client.put(notification_mark_read_url(str(admin_notif.id)))
        await db.refresh(other_notif)
        assert other_notif.is_read is False

    async def test_mark_all_read_does_not_affect_other_user(
        self, admin_client: AsyncClient, admin_user: User, db: AsyncSession
    ):
        other_user_id = uuid.uuid4()
        await create_notification_in_db(db, admin_user.id, is_read=False)
        other_notif = await create_notification_in_db(db, other_user_id, is_read=False)
        await db.commit()
        await admin_client.put(notifications_mark_all_read_url())
        await db.refresh(other_notif)
        assert other_notif.is_read is False


class TestNotificationWithRelatedEntities:

    async def test_equipment_related(self, admin_client: AsyncClient, admin_user: User, db: AsyncSession):
        eid = uuid.uuid4()
        await create_notification_in_db(
            db, admin_user.id, related_entity_type="equipment", related_entity_id=eid
        )
        await db.commit()
        resp = await admin_client.get(notifications_url())
        item = resp.json()[0]
        assert item["relatedEntityType"] == "equipment"

    async def test_material_related(self, admin_client: AsyncClient, admin_user: User, db: AsyncSession):
        mid = uuid.uuid4()
        await create_notification_in_db(
            db, admin_user.id, related_entity_type="material", related_entity_id=mid
        )
        await db.commit()
        resp = await admin_client.get(notifications_url())
        item = resp.json()[0]
        assert item["relatedEntityType"] == "material"

    async def test_inspection_related(self, admin_client: AsyncClient, admin_user: User, db: AsyncSession):
        iid = uuid.uuid4()
        await create_notification_in_db(
            db, admin_user.id, related_entity_type="inspection", related_entity_id=iid
        )
        await db.commit()
        resp = await admin_client.get(notifications_url())
        item = resp.json()[0]
        assert item["relatedEntityType"] == "inspection"

    async def test_no_related_entity(self, admin_client: AsyncClient, admin_user: User, db: AsyncSession):
        await create_notification_in_db(db, admin_user.id)
        await db.commit()
        resp = await admin_client.get(notifications_url())
        item = resp.json()[0]
        assert item.get("relatedEntityType") is None
        assert item.get("relatedEntityId") is None


class TestNotificationReadFlow:

    async def test_read_unread_mixed(self, admin_client: AsyncClient, admin_user: User, db: AsyncSession):
        await create_notification_in_db(db, admin_user.id, is_read=False, title="Unread")
        await create_notification_in_db(db, admin_user.id, is_read=True, title="Read")
        await db.commit()
        resp = await admin_client.get(notifications_url())
        assert len(resp.json()) == 2
        statuses = {n["title"]: n["isRead"] for n in resp.json()}
        assert statuses["Unread"] is False
        assert statuses["Read"] is True

    async def test_mark_read_then_count_decreases(self, admin_client: AsyncClient, admin_user: User, db: AsyncSession):
        n1 = await create_notification_in_db(db, admin_user.id, is_read=False)
        n2 = await create_notification_in_db(db, admin_user.id, is_read=False)
        await db.commit()

        resp1 = await admin_client.get(unread_count_url())
        assert resp1.json()["unreadCount"] == 2

        await admin_client.put(notification_mark_read_url(str(n1.id)))
        resp2 = await admin_client.get(unread_count_url())
        assert resp2.json()["unreadCount"] == 1

    async def test_mark_all_then_count_zero(self, admin_client: AsyncClient, admin_user: User, db: AsyncSession):
        for _ in range(5):
            await create_notification_in_db(db, admin_user.id, is_read=False)
        await db.commit()

        await admin_client.put(notifications_mark_all_read_url())
        resp = await admin_client.get(unread_count_url())
        assert resp.json()["unreadCount"] == 0

    async def test_already_read_mark_all_no_error(self, admin_client: AsyncClient, admin_user: User, db: AsyncSession):
        for _ in range(3):
            await create_notification_in_db(db, admin_user.id, is_read=True)
        await db.commit()
        resp = await admin_client.put(notifications_mark_all_read_url())
        assert resp.status_code == 200

    async def test_mark_read_idempotent(self, admin_client: AsyncClient, admin_user: User, db: AsyncSession):
        notif = await create_notification_in_db(db, admin_user.id, is_read=False)
        await db.commit()
        resp1 = await admin_client.put(notification_mark_read_url(str(notif.id)))
        resp2 = await admin_client.put(notification_mark_read_url(str(notif.id)))
        assert resp1.status_code == 200
        assert resp2.status_code == 200
        assert resp2.json()["isRead"] is True


class TestAuditLogMultiFilter:

    async def test_entity_type_and_action(self, admin_client: AsyncClient, project: Project, admin_user: User, db: AsyncSession):
        await create_audit_log_in_db(db, project.id, admin_user.id, entity_type="equipment", action=AuditAction.CREATE.value)
        await create_audit_log_in_db(db, project.id, admin_user.id, entity_type="equipment", action=AuditAction.UPDATE.value)
        await create_audit_log_in_db(db, project.id, admin_user.id, entity_type="material", action=AuditAction.CREATE.value)
        await db.commit()
        resp = await admin_client.get(
            project_audit_url(str(project.id)),
            params={"entity_type": "equipment", "action": "update"}
        )
        assert len(resp.json()) == 1
        assert resp.json()[0]["action"] == "update"

    async def test_user_and_action(self, admin_client: AsyncClient, project: Project, admin_user: User, db: AsyncSession):
        other_user_id = uuid.uuid4()
        await create_audit_log_in_db(db, project.id, admin_user.id, action=AuditAction.CREATE.value)
        await create_audit_log_in_db(db, project.id, other_user_id, action=AuditAction.CREATE.value)
        await db.commit()
        resp = await admin_client.get(
            project_audit_url(str(project.id)),
            params={"user_id": str(admin_user.id), "action": "create"}
        )
        assert len(resp.json()) == 1

    async def test_entity_type_action_and_date(self, admin_client: AsyncClient, project: Project, admin_user: User, db: AsyncSession):
        await create_audit_log_in_db(
            db, project.id, admin_user.id,
            entity_type="file", action=AuditAction.DELETE.value
        )
        await db.commit()
        start = (datetime.utcnow() - timedelta(hours=1)).isoformat()
        end = (datetime.utcnow() + timedelta(hours=1)).isoformat()
        resp = await admin_client.get(
            project_audit_url(str(project.id)),
            params={"entity_type": "file", "action": "delete", "start_date": start, "end_date": end}
        )
        assert len(resp.json()) == 1

    async def test_all_filters_combined(self, admin_client: AsyncClient, project: Project, admin_user: User, db: AsyncSession):
        target_entity = uuid.uuid4()
        await create_audit_log_in_db(
            db, project.id, admin_user.id,
            entity_type="equipment", entity_id=target_entity,
            action=AuditAction.STATUS_CHANGE.value
        )
        await create_audit_log_in_db(db, project.id, admin_user.id, entity_type="equipment", action=AuditAction.CREATE.value)
        await db.commit()
        start = (datetime.utcnow() - timedelta(hours=1)).isoformat()
        end = (datetime.utcnow() + timedelta(hours=1)).isoformat()
        resp = await admin_client.get(
            project_audit_url(str(project.id)),
            params={
                "entity_type": "equipment",
                "entity_id": str(target_entity),
                "action": "status_change",
                "user_id": str(admin_user.id),
                "start_date": start,
                "end_date": end,
            }
        )
        assert len(resp.json()) == 1


class TestAuditLogGlobalPaginationAdvanced:

    async def test_global_limit_offset(self, admin_client: AsyncClient, project: Project, admin_user: User, db: AsyncSession):
        for _ in range(10):
            await create_audit_log_in_db(db, project.id, admin_user.id)
        await db.commit()
        resp = await admin_client.get(global_audit_url(), params={"limit": 3, "offset": 2})
        assert len(resp.json()) == 3

    async def test_global_offset_beyond(self, admin_client: AsyncClient, project: Project, admin_user: User, db: AsyncSession):
        await create_audit_log_in_db(db, project.id, admin_user.id)
        await db.commit()
        resp = await admin_client.get(global_audit_url(), params={"offset": 100})
        assert len(resp.json()) == 0

    async def test_global_limit_one(self, admin_client: AsyncClient, project: Project, admin_user: User, db: AsyncSession):
        for _ in range(5):
            await create_audit_log_in_db(db, project.id, admin_user.id)
        await db.commit()
        resp = await admin_client.get(global_audit_url(), params={"limit": 1})
        assert len(resp.json()) == 1

    async def test_global_combined_filter_and_pagination(self, admin_client: AsyncClient, project: Project, admin_user: User, db: AsyncSession):
        for _ in range(5):
            await create_audit_log_in_db(db, project.id, admin_user.id, entity_type="equipment")
        for _ in range(5):
            await create_audit_log_in_db(db, project.id, admin_user.id, entity_type="material")
        await db.commit()
        resp = await admin_client.get(
            global_audit_url(),
            params={"entity_type": "equipment", "limit": 3}
        )
        assert len(resp.json()) == 3
        assert all(l["entityType"] == "equipment" for l in resp.json())


class TestNotificationCreationData:

    async def test_notification_title_preserved(self, admin_client: AsyncClient, admin_user: User, db: AsyncSession):
        await create_notification_in_db(db, admin_user.id, title="Important Alert")
        await db.commit()
        resp = await admin_client.get(notifications_url())
        assert resp.json()[0]["title"] == "Important Alert"

    async def test_notification_message_preserved(self, admin_client: AsyncClient, admin_user: User, db: AsyncSession):
        await create_notification_in_db(db, admin_user.id, message="Your submission was approved")
        await db.commit()
        resp = await admin_client.get(notifications_url())
        assert resp.json()[0]["message"] == "Your submission was approved"

    async def test_notification_category_preserved(self, admin_client: AsyncClient, admin_user: User, db: AsyncSession):
        await create_notification_in_db(db, admin_user.id, category=NotificationCategory.APPROVAL.value)
        await db.commit()
        resp = await admin_client.get(notifications_url())
        assert resp.json()[0]["category"] == "approval"

    async def test_notification_user_id_matches(self, admin_client: AsyncClient, admin_user: User, db: AsyncSession):
        await create_notification_in_db(db, admin_user.id)
        await db.commit()
        resp = await admin_client.get(notifications_url())
        assert resp.json()[0]["userId"] == str(admin_user.id)

    async def test_notification_default_unread(self, admin_client: AsyncClient, admin_user: User, db: AsyncSession):
        await create_notification_in_db(db, admin_user.id)
        await db.commit()
        resp = await admin_client.get(notifications_url())
        assert resp.json()[0]["isRead"] is False

    async def test_notification_timestamps_present(self, admin_client: AsyncClient, admin_user: User, db: AsyncSession):
        await create_notification_in_db(db, admin_user.id)
        await db.commit()
        resp = await admin_client.get(notifications_url())
        item = resp.json()[0]
        assert item["createdAt"] is not None
        assert item["updatedAt"] is not None

    async def test_notification_timestamps_parseable(self, admin_client: AsyncClient, admin_user: User, db: AsyncSession):
        await create_notification_in_db(db, admin_user.id)
        await db.commit()
        resp = await admin_client.get(notifications_url())
        item = resp.json()[0]
        datetime.fromisoformat(item["createdAt"].replace("Z", "+00:00"))
        datetime.fromisoformat(item["updatedAt"].replace("Z", "+00:00"))


class TestAuditLogResponseFormFields:

    async def test_project_id_matches(self, admin_client: AsyncClient, project: Project, admin_user: User, db: AsyncSession):
        await create_audit_log_in_db(db, project.id, admin_user.id)
        await db.commit()
        resp = await admin_client.get(project_audit_url(str(project.id)))
        assert resp.json()[0]["projectId"] == str(project.id)

    async def test_user_id_matches(self, admin_client: AsyncClient, project: Project, admin_user: User, db: AsyncSession):
        await create_audit_log_in_db(db, project.id, admin_user.id)
        await db.commit()
        resp = await admin_client.get(project_audit_url(str(project.id)))
        assert resp.json()[0]["userId"] == str(admin_user.id)

    async def test_entity_id_matches(self, admin_client: AsyncClient, project: Project, admin_user: User, db: AsyncSession):
        eid = uuid.uuid4()
        await create_audit_log_in_db(db, project.id, admin_user.id, entity_id=eid)
        await db.commit()
        resp = await admin_client.get(project_audit_url(str(project.id)))
        assert resp.json()[0]["entityId"] == str(eid)

    async def test_action_matches(self, admin_client: AsyncClient, project: Project, admin_user: User, db: AsyncSession):
        await create_audit_log_in_db(db, project.id, admin_user.id, action=AuditAction.APPROVAL.value)
        await db.commit()
        resp = await admin_client.get(project_audit_url(str(project.id)))
        assert resp.json()[0]["action"] == "approval"

    async def test_ip_address_nullable(self, admin_client: AsyncClient, project: Project, admin_user: User, db: AsyncSession):
        await create_audit_log_in_db(db, project.id, admin_user.id)
        await db.commit()
        resp = await admin_client.get(project_audit_url(str(project.id)))
        assert resp.json()[0]["ipAddress"] is None

    async def test_user_agent_nullable(self, admin_client: AsyncClient, project: Project, admin_user: User, db: AsyncSession):
        await create_audit_log_in_db(db, project.id, admin_user.id)
        await db.commit()
        resp = await admin_client.get(project_audit_url(str(project.id)))
        assert resp.json()[0]["userAgent"] is None


class TestNotificationFilterCombinations:

    async def test_filter_approval_only(self, admin_client: AsyncClient, admin_user: User, db: AsyncSession):
        await create_notification_in_db(db, admin_user.id, category=NotificationCategory.APPROVAL.value)
        await create_notification_in_db(db, admin_user.id, category=NotificationCategory.GENERAL.value)
        await create_notification_in_db(db, admin_user.id, category=NotificationCategory.INSPECTION.value)
        await db.commit()
        resp = await admin_client.get(notifications_url(), params={"category": "approval"})
        assert len(resp.json()) == 1
        assert resp.json()[0]["category"] == "approval"

    async def test_filter_inspection_only(self, admin_client: AsyncClient, admin_user: User, db: AsyncSession):
        await create_notification_in_db(db, admin_user.id, category=NotificationCategory.APPROVAL.value)
        await create_notification_in_db(db, admin_user.id, category=NotificationCategory.INSPECTION.value)
        await db.commit()
        resp = await admin_client.get(notifications_url(), params={"category": "inspection"})
        assert len(resp.json()) == 1

    async def test_filter_nonexistent_category(self, admin_client: AsyncClient, admin_user: User, db: AsyncSession):
        await create_notification_in_db(db, admin_user.id)
        await db.commit()
        resp = await admin_client.get(notifications_url(), params={"category": "nonexistent"})
        assert len(resp.json()) == 0

    async def test_unfiltered_returns_all(self, admin_client: AsyncClient, admin_user: User, db: AsyncSession):
        for cat in NotificationCategory:
            await create_notification_in_db(db, admin_user.id, category=cat.value)
        await db.commit()
        resp = await admin_client.get(notifications_url())
        assert len(resp.json()) == len(NotificationCategory)


class TestUnreadCountEdgeCases:

    async def test_unread_count_large(self, admin_client: AsyncClient, admin_user: User, db: AsyncSession):
        for _ in range(20):
            await create_notification_in_db(db, admin_user.id, is_read=False)
        await db.commit()
        resp = await admin_client.get(unread_count_url())
        assert resp.json()["unreadCount"] == 20

    async def test_unread_count_all_read(self, admin_client: AsyncClient, admin_user: User, db: AsyncSession):
        for _ in range(5):
            await create_notification_in_db(db, admin_user.id, is_read=True)
        await db.commit()
        resp = await admin_client.get(unread_count_url())
        assert resp.json()["unreadCount"] == 0

    async def test_unread_count_mixed(self, admin_client: AsyncClient, admin_user: User, db: AsyncSession):
        for _ in range(3):
            await create_notification_in_db(db, admin_user.id, is_read=False)
        for _ in range(7):
            await create_notification_in_db(db, admin_user.id, is_read=True)
        await db.commit()
        resp = await admin_client.get(unread_count_url())
        assert resp.json()["unreadCount"] == 3

    async def test_unread_count_response_type(self, admin_client: AsyncClient):
        resp = await admin_client.get(unread_count_url())
        assert isinstance(resp.json()["unreadCount"], int)


class TestAuditLogApprovalRejectionActions:

    async def test_approval_action(self, admin_client: AsyncClient, project: Project, admin_user: User, db: AsyncSession):
        await create_audit_log_in_db(db, project.id, admin_user.id, action=AuditAction.APPROVAL.value)
        await db.commit()
        resp = await admin_client.get(project_audit_url(str(project.id)), params={"action": "approval"})
        assert len(resp.json()) == 1

    async def test_rejection_action(self, admin_client: AsyncClient, project: Project, admin_user: User, db: AsyncSession):
        await create_audit_log_in_db(db, project.id, admin_user.id, action=AuditAction.REJECTION.value)
        await db.commit()
        resp = await admin_client.get(project_audit_url(str(project.id)), params={"action": "rejection"})
        assert len(resp.json()) == 1

    async def test_create_action_filter(self, admin_client: AsyncClient, project: Project, admin_user: User, db: AsyncSession):
        await create_audit_log_in_db(db, project.id, admin_user.id, action=AuditAction.CREATE.value)
        await create_audit_log_in_db(db, project.id, admin_user.id, action=AuditAction.APPROVAL.value)
        await db.commit()
        resp = await admin_client.get(project_audit_url(str(project.id)), params={"action": "create"})
        assert len(resp.json()) == 1

    async def test_update_action_filter(self, admin_client: AsyncClient, project: Project, admin_user: User, db: AsyncSession):
        await create_audit_log_in_db(db, project.id, admin_user.id, action=AuditAction.UPDATE.value)
        await create_audit_log_in_db(db, project.id, admin_user.id, action=AuditAction.DELETE.value)
        await db.commit()
        resp = await admin_client.get(project_audit_url(str(project.id)), params={"action": "update"})
        assert len(resp.json()) == 1

    async def test_delete_action_filter(self, admin_client: AsyncClient, project: Project, admin_user: User, db: AsyncSession):
        await create_audit_log_in_db(db, project.id, admin_user.id, action=AuditAction.DELETE.value)
        await create_audit_log_in_db(db, project.id, admin_user.id, action=AuditAction.CREATE.value)
        await db.commit()
        resp = await admin_client.get(project_audit_url(str(project.id)), params={"action": "delete"})
        assert len(resp.json()) == 1

    async def test_nonexistent_action_empty(self, admin_client: AsyncClient, project: Project, admin_user: User, db: AsyncSession):
        await create_audit_log_in_db(db, project.id, admin_user.id, action=AuditAction.CREATE.value)
        await db.commit()
        resp = await admin_client.get(project_audit_url(str(project.id)), params={"action": "nonexistent"})
        assert len(resp.json()) == 0

    async def test_global_approval_filter(self, admin_client: AsyncClient, project: Project, admin_user: User, db: AsyncSession):
        await create_audit_log_in_db(db, project.id, admin_user.id, action=AuditAction.APPROVAL.value)
        await create_audit_log_in_db(db, project.id, admin_user.id, action=AuditAction.REJECTION.value)
        await db.commit()
        resp = await admin_client.get(global_audit_url(), params={"action": "approval"})
        assert len(resp.json()) == 1
