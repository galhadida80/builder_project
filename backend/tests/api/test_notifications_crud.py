import uuid
from datetime import datetime, timedelta

import pytest

from app.models.notification import Notification

API = "/api/v1/notifications"
FAKE_ID = str(uuid.uuid4())


async def mkn(db, user, category="general", title="Note", message="Body",
              is_read=False, entity_type=None, entity_id=None, created_at=None):
    n = Notification(id=uuid.uuid4(), user_id=user.id, category=category, title=title,
                     message=message, is_read=is_read, related_entity_type=entity_type,
                     related_entity_id=entity_id, created_at=created_at or datetime.utcnow(),
                     updated_at=datetime.utcnow())
    db.add(n); await db.commit(); await db.refresh(n)
    return n


async def mkn_many(db, user, count, **kw):
    return [await mkn(db, user, title=f"N-{i}", **kw) for i in range(count)]


class TestListNotifications:
    async def test_empty(self, admin_client, db, admin_user):
        assert (await admin_client.get(API)).status_code == 200
        assert (await admin_client.get(API)).json() == []
    async def test_returns_own(self, admin_client, db, admin_user):
        await mkn(db, admin_user)
        assert len((await admin_client.get(API)).json()) == 1
    async def test_multiple(self, admin_client, db, admin_user):
        await mkn_many(db, admin_user, 5)
        assert len((await admin_client.get(API)).json()) == 5
    async def test_excludes_other_users(self, admin_client, db, admin_user, regular_user):
        await mkn(db, admin_user); await mkn(db, regular_user)
        assert len((await admin_client.get(API)).json()) == 1
    async def test_ordered_desc(self, admin_client, db, admin_user):
        await mkn(db, admin_user, title="Old", created_at=datetime.utcnow() - timedelta(hours=2))
        await mkn(db, admin_user, title="New")
        assert (await admin_client.get(API)).json()[0]["title"] == "New"
    async def test_includes_read_and_unread(self, admin_client, db, admin_user):
        await mkn(db, admin_user, is_read=True); await mkn(db, admin_user)
        assert len((await admin_client.get(API)).json()) == 2
    async def test_large_count(self, admin_client, db, admin_user):
        await mkn_many(db, admin_user, 20)
        assert len((await admin_client.get(API)).json()) == 20
    async def test_camel_case_fields(self, admin_client, db, admin_user):
        await mkn(db, admin_user, entity_type="eq", entity_id=uuid.uuid4())
        d = (await admin_client.get(API)).json()[0]
        for k in ("userId", "isRead", "createdAt", "updatedAt", "relatedEntityType", "relatedEntityId"):
            assert k in d
    async def test_id_format(self, admin_client, db, admin_user):
        n = await mkn(db, admin_user)
        assert (await admin_client.get(API)).json()[0]["id"] == str(n.id)
    async def test_user_id_matches(self, admin_client, db, admin_user):
        await mkn(db, admin_user)
        assert (await admin_client.get(API)).json()[0]["userId"] == str(admin_user.id)
    async def test_title_preserved(self, admin_client, db, admin_user):
        await mkn(db, admin_user, title="My Title")
        assert (await admin_client.get(API)).json()[0]["title"] == "My Title"
    async def test_message_preserved(self, admin_client, db, admin_user):
        await mkn(db, admin_user, message="Detail msg")
        assert (await admin_client.get(API)).json()[0]["message"] == "Detail msg"


class TestNotificationFiltering:
    @pytest.mark.parametrize("cat", ["approval", "inspection", "update", "general"])
    async def test_filter_by_category(self, admin_client, db, admin_user, cat):
        await mkn(db, admin_user, category=cat)
        await mkn(db, admin_user, category="approval" if cat != "approval" else "general")
        data = (await admin_client.get(API, params={"category": cat})).json()
        assert len(data) == 1 and data[0]["category"] == cat
    async def test_no_match_empty(self, admin_client, db, admin_user):
        await mkn(db, admin_user, category="general")
        assert (await admin_client.get(API, params={"category": "approval"})).json() == []
    async def test_no_filter_returns_all(self, admin_client, db, admin_user):
        for c in ("approval", "inspection", "general"):
            await mkn(db, admin_user, category=c)
        assert len((await admin_client.get(API)).json()) == 3
    async def test_multiple_same_category(self, admin_client, db, admin_user):
        await mkn_many(db, admin_user, 4, category="inspection"); await mkn(db, admin_user, category="general")
        assert len((await admin_client.get(API, params={"category": "inspection"})).json()) == 4
    async def test_filter_scoped_to_user(self, admin_client, db, admin_user, regular_user):
        await mkn(db, admin_user, category="approval"); await mkn(db, regular_user, category="approval")
        assert len((await admin_client.get(API, params={"category": "approval"})).json()) == 1
    async def test_empty_after_filtering(self, admin_client, db, admin_user):
        await mkn(db, admin_user, category="general")
        assert (await admin_client.get(API, params={"category": "inspection"})).json() == []


class TestUnreadCount:
    async def test_zero(self, admin_client, db, admin_user):
        r = await admin_client.get(f"{API}/unread-count")
        assert r.status_code == 200 and r.json()["unreadCount"] == 0
    async def test_with_unread(self, admin_client, db, admin_user):
        await mkn_many(db, admin_user, 3)
        assert (await admin_client.get(f"{API}/unread-count")).json()["unreadCount"] == 3
    async def test_excludes_read(self, admin_client, db, admin_user):
        await mkn(db, admin_user, is_read=True); await mkn(db, admin_user)
        assert (await admin_client.get(f"{API}/unread-count")).json()["unreadCount"] == 1
    async def test_all_read(self, admin_client, db, admin_user):
        await mkn_many(db, admin_user, 5, is_read=True)
        assert (await admin_client.get(f"{API}/unread-count")).json()["unreadCount"] == 0
    async def test_excludes_other_users(self, admin_client, db, admin_user, regular_user):
        await mkn(db, admin_user); await mkn_many(db, regular_user, 10)
        assert (await admin_client.get(f"{API}/unread-count")).json()["unreadCount"] == 1
    async def test_response_shape(self, admin_client, db, admin_user):
        d = (await admin_client.get(f"{API}/unread-count")).json()
        assert "unreadCount" in d and isinstance(d["unreadCount"], int)
    async def test_large(self, admin_client, db, admin_user):
        await mkn_many(db, admin_user, 50)
        assert (await admin_client.get(f"{API}/unread-count")).json()["unreadCount"] == 50
    async def test_mixed_categories(self, admin_client, db, admin_user):
        await mkn(db, admin_user, category="approval"); await mkn(db, admin_user, category="inspection")
        await mkn(db, admin_user, category="general", is_read=True)
        assert (await admin_client.get(f"{API}/unread-count")).json()["unreadCount"] == 2
    async def test_after_mark_single(self, admin_client, db, admin_user):
        n = await mkn(db, admin_user); await mkn(db, admin_user)
        await admin_client.put(f"{API}/{n.id}/mark-read")
        assert (await admin_client.get(f"{API}/unread-count")).json()["unreadCount"] == 1
    async def test_after_mark_all(self, admin_client, db, admin_user):
        await mkn_many(db, admin_user, 7); await admin_client.put(f"{API}/mark-all-read")
        assert (await admin_client.get(f"{API}/unread-count")).json()["unreadCount"] == 0


class TestMarkRead:
    async def test_success(self, admin_client, db, admin_user):
        n = await mkn(db, admin_user)
        r = await admin_client.put(f"{API}/{n.id}/mark-read")
        assert r.status_code == 200 and r.json()["isRead"] is True
    async def test_already_read(self, admin_client, db, admin_user):
        n = await mkn(db, admin_user, is_read=True)
        assert (await admin_client.put(f"{API}/{n.id}/mark-read")).json()["isRead"] is True
    async def test_not_found(self, admin_client, db, admin_user):
        assert (await admin_client.put(f"{API}/{FAKE_ID}/mark-read")).status_code == 404
    async def test_wrong_user(self, admin_client, db, admin_user, regular_user):
        n = await mkn(db, regular_user)
        assert (await admin_client.put(f"{API}/{n.id}/mark-read")).status_code == 404
    async def test_invalid_uuid(self, admin_client, db, admin_user):
        assert (await admin_client.put(f"{API}/not-a-uuid/mark-read")).status_code == 422
    async def test_returns_full_response(self, admin_client, db, admin_user):
        n = await mkn(db, admin_user, category="approval", title="Check", entity_type="equipment")
        d = (await admin_client.put(f"{API}/{n.id}/mark-read")).json()
        assert d["id"] == str(n.id) and d["category"] == "approval" and d["relatedEntityType"] == "equipment"
    async def test_idempotent(self, admin_client, db, admin_user):
        n = await mkn(db, admin_user); await admin_client.put(f"{API}/{n.id}/mark-read")
        r = await admin_client.put(f"{API}/{n.id}/mark-read")
        assert r.status_code == 200 and r.json()["isRead"] is True
    async def test_preserves_fields(self, admin_client, db, admin_user):
        eid = uuid.uuid4()
        n = await mkn(db, admin_user, category="inspection", message="Chk", entity_type="area", entity_id=eid)
        d = (await admin_client.put(f"{API}/{n.id}/mark-read")).json()
        assert d["category"] == "inspection" and d["relatedEntityId"] == str(eid)
    async def test_does_not_affect_others(self, admin_client, db, admin_user):
        n1 = await mkn(db, admin_user); await mkn(db, admin_user)
        await admin_client.put(f"{API}/{n1.id}/mark-read")
        assert (await admin_client.get(f"{API}/unread-count")).json()["unreadCount"] == 1
    async def test_updated_at_returned(self, admin_client, db, admin_user):
        n = await mkn(db, admin_user)
        assert (await admin_client.put(f"{API}/{n.id}/mark-read")).json()["updatedAt"] is not None
    async def test_numeric_id_422(self, admin_client, db, admin_user):
        assert (await admin_client.put(f"{API}/123/mark-read")).status_code == 422
    async def test_mark_read_then_list(self, admin_client, db, admin_user):
        n = await mkn(db, admin_user); await admin_client.put(f"{API}/{n.id}/mark-read")
        assert (await admin_client.get(API)).json()[0]["isRead"] is True


class TestMarkAllRead:
    async def test_empty(self, admin_client, db, admin_user):
        r = await admin_client.put(f"{API}/mark-all-read")
        assert r.status_code == 200 and "0" in r.json()["message"]
    async def test_marks_multiple(self, admin_client, db, admin_user):
        await mkn_many(db, admin_user, 5)
        assert "5" in (await admin_client.put(f"{API}/mark-all-read")).json()["message"]
    async def test_sets_count_zero(self, admin_client, db, admin_user):
        await mkn_many(db, admin_user, 3); await admin_client.put(f"{API}/mark-all-read")
        assert (await admin_client.get(f"{API}/unread-count")).json()["unreadCount"] == 0
    async def test_skips_already_read(self, admin_client, db, admin_user):
        await mkn_many(db, admin_user, 2, is_read=True); await mkn_many(db, admin_user, 3)
        assert "3" in (await admin_client.put(f"{API}/mark-all-read")).json()["message"]
    async def test_only_current_user(self, admin_client, db, admin_user, regular_user):
        await mkn_many(db, admin_user, 2); await mkn_many(db, regular_user, 5)
        assert "2" in (await admin_client.put(f"{API}/mark-all-read")).json()["message"]
    async def test_idempotent(self, admin_client, db, admin_user):
        await mkn_many(db, admin_user, 3); await admin_client.put(f"{API}/mark-all-read")
        assert "0" in (await admin_client.put(f"{API}/mark-all-read")).json()["message"]
    async def test_then_list_all_read(self, admin_client, db, admin_user):
        await mkn_many(db, admin_user, 4); await admin_client.put(f"{API}/mark-all-read")
        assert all(n["isRead"] for n in (await admin_client.get(API)).json())
    async def test_response_shape(self, admin_client, db, admin_user):
        await mkn(db, admin_user)
        d = (await admin_client.put(f"{API}/mark-all-read")).json()
        assert "message" in d and isinstance(d["message"], str)
    async def test_large_batch(self, admin_client, db, admin_user):
        await mkn_many(db, admin_user, 30)
        assert (await admin_client.put(f"{API}/mark-all-read")).status_code == 200
    async def test_mixed_categories(self, admin_client, db, admin_user):
        for c in ("approval", "inspection", "update", "general"):
            await mkn(db, admin_user, category=c)
        assert "4" in (await admin_client.put(f"{API}/mark-all-read")).json()["message"]
    async def test_does_not_affect_other_user(self, admin_client, db, admin_user, regular_user):
        await mkn_many(db, admin_user, 2); await mkn_many(db, regular_user, 3)
        await admin_client.put(f"{API}/mark-all-read")
        from sqlalchemy import func, select
        r = await db.execute(select(func.count(Notification.id)).where(
            Notification.user_id == regular_user.id, Notification.is_read == False))
        assert r.scalar() == 3
    async def test_mark_all_then_single_ok(self, admin_client, db, admin_user):
        n = await mkn(db, admin_user); await admin_client.put(f"{API}/mark-all-read")
        assert (await admin_client.put(f"{API}/{n.id}/mark-read")).status_code == 200


class TestNotificationNoAuth:
    async def test_list(self, client):
        assert (await client.get(API)).status_code == 401
    async def test_unread_count(self, client):
        assert (await client.get(f"{API}/unread-count")).status_code == 401
    async def test_mark_read(self, client):
        assert (await client.put(f"{API}/{FAKE_ID}/mark-read")).status_code == 401
    async def test_mark_all_read(self, client):
        assert (await client.put(f"{API}/mark-all-read")).status_code == 401


class TestNotificationCategories:
    @pytest.mark.parametrize("cat", ["approval", "inspection", "update", "general"])
    async def test_category_stored(self, admin_client, db, admin_user, cat):
        await mkn(db, admin_user, category=cat)
        assert (await admin_client.get(API)).json()[0]["category"] == cat
    async def test_all_coexist(self, admin_client, db, admin_user):
        for c in ("approval", "inspection", "update", "general"):
            await mkn(db, admin_user, category=c)
        cats = {n["category"] for n in (await admin_client.get(API)).json()}
        assert cats == {"approval", "inspection", "update", "general"}


class TestNotificationRelatedEntity:
    async def test_with_entity(self, admin_client, db, admin_user):
        eid = uuid.uuid4()
        await mkn(db, admin_user, entity_type="equipment", entity_id=eid)
        d = (await admin_client.get(API)).json()[0]
        assert d["relatedEntityType"] == "equipment" and d["relatedEntityId"] == str(eid)
    async def test_without_entity(self, admin_client, db, admin_user):
        await mkn(db, admin_user)
        d = (await admin_client.get(API)).json()[0]
        assert d["relatedEntityType"] is None and d["relatedEntityId"] is None
    @pytest.mark.parametrize("etype", ["equipment", "material", "inspection", "rfi", "meeting"])
    async def test_various_types(self, admin_client, db, admin_user, etype):
        await mkn(db, admin_user, entity_type=etype, entity_id=uuid.uuid4())
        assert (await admin_client.get(API)).json()[0]["relatedEntityType"] == etype


class TestNotificationUserIsolation:
    async def test_cannot_see_other(self, admin_client, db, admin_user, regular_user):
        await mkn_many(db, regular_user, 5)
        assert (await admin_client.get(API)).json() == []
    async def test_cannot_mark_other(self, admin_client, db, admin_user, regular_user):
        n = await mkn(db, regular_user)
        assert (await admin_client.put(f"{API}/{n.id}/mark-read")).status_code == 404
    async def test_unread_isolated(self, admin_client, db, admin_user, regular_user):
        await mkn(db, admin_user); await mkn_many(db, regular_user, 10)
        assert (await admin_client.get(f"{API}/unread-count")).json()["unreadCount"] == 1


class TestNotificationEdgeCases:
    async def test_long_title(self, admin_client, db, admin_user):
        await mkn(db, admin_user, title="A" * 200)
        assert len((await admin_client.get(API)).json()) == 1
    async def test_long_message(self, admin_client, db, admin_user):
        await mkn(db, admin_user, message="B" * 500)
        assert (await admin_client.get(API)).json()[0]["message"] == "B" * 500
    async def test_unicode_content(self, admin_client, db, admin_user):
        await mkn(db, admin_user, title="התראה חדשה", message="יש לך אישור")
        assert (await admin_client.get(API)).json()[0]["title"] == "התראה חדשה"
    async def test_created_at_present(self, admin_client, db, admin_user):
        await mkn(db, admin_user)
        assert (await admin_client.get(API)).json()[0]["createdAt"] is not None
    async def test_default_unread(self, admin_client, db, admin_user):
        await mkn(db, admin_user)
        assert (await admin_client.get(API)).json()[0]["isRead"] is False
    async def test_per_category_count(self, admin_client, db, admin_user):
        await mkn_many(db, admin_user, 3, category="approval")
        await mkn_many(db, admin_user, 2, category="update")
        total = (await admin_client.get(API)).json()
        assert len([n for n in total if n["category"] == "approval"]) == 3
    async def test_only_own_in_list(self, admin_client, db, admin_user, regular_user):
        await mkn(db, admin_user, title="Mine"); await mkn(db, regular_user, title="Theirs")
        titles = [n["title"] for n in (await admin_client.get(API)).json()]
        assert "Mine" in titles and "Theirs" not in titles
