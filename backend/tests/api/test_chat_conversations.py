import uuid
from datetime import datetime, timedelta
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.user import User
from app.models.project import Project, ProjectMember
from app.models.chat import ChatConversation, ChatMessage

API, FAKE = "/api/v1", str(uuid.uuid4())
L = lambda pid: f"{API}/projects/{pid}/chat/conversations"
D = lambda pid, cid: f"{API}/projects/{pid}/chat/conversations/{cid}"

async def mk_conv(db, pid, uid, title="Chat", ago=0):
    t = datetime.utcnow() - timedelta(minutes=ago)
    c = ChatConversation(id=uuid.uuid4(), project_id=pid, user_id=uid, title=title, created_at=t, updated_at=t)
    db.add(c); await db.flush()
    return c


async def mk_msg(db, cid, role="user", content="hi", ago=0):
    m = ChatMessage(id=uuid.uuid4(), conversation_id=cid, role=role, content=content, created_at=datetime.utcnow() - timedelta(minutes=ago))
    db.add(m); await db.flush()
    return m


async def mk_proj(db, uid, code="OTH-X"):
    p = Project(id=uuid.uuid4(), name="Other", code=code, status="active", created_by_id=uid)
    db.add(p); await db.flush()
    db.add(ProjectMember(project_id=p.id, user_id=uid, role="project_admin"))
    await db.commit()
    return p


class TestListConversations:
    @pytest.mark.asyncio
    async def test_empty(self, admin_client: AsyncClient, project: Project):
        r = await admin_client.get(L(project.id))
        assert r.status_code == 200 and r.json() == []

    @pytest.mark.asyncio
    async def test_returns_multiple(self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User):
        await mk_conv(db, project.id, admin_user.id, "A"); await mk_conv(db, project.id, admin_user.id, "B"); await db.commit()
        assert len((await admin_client.get(L(project.id))).json()) == 2

    @pytest.mark.asyncio
    async def test_sorted_desc(self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User):
        for name, ago in [("Old", 30), ("New", 0), ("Mid", 15)]:
            await mk_conv(db, project.id, admin_user.id, name, ago)
        await db.commit()
        assert [c["title"] for c in (await admin_client.get(L(project.id))).json()] == ["New", "Mid", "Old"]

    @pytest.mark.asyncio
    async def test_limit_50(self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User):
        for i in range(55): await mk_conv(db, project.id, admin_user.id, f"C{i}", i)
        await db.commit()
        assert len((await admin_client.get(L(project.id))).json()) == 50

    @pytest.mark.asyncio
    async def test_only_own(self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User, regular_user: User):
        await mk_conv(db, project.id, admin_user.id, "Mine"); await mk_conv(db, project.id, regular_user.id, "Theirs"); await db.commit()
        items = (await admin_client.get(L(project.id))).json()
        assert len(items) == 1 and items[0]["title"] == "Mine"

    @pytest.mark.asyncio
    async def test_scoped_to_project(self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User):
        other = await mk_proj(db, admin_user.id, "OTH-L")
        await mk_conv(db, project.id, admin_user.id, "P1"); await mk_conv(db, other.id, admin_user.id, "P2"); await db.commit()
        items = (await admin_client.get(L(project.id))).json()
        assert len(items) == 1 and items[0]["title"] == "P1"

    @pytest.mark.asyncio
    async def test_msg_count(self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User):
        c = await mk_conv(db, project.id, admin_user.id)
        await mk_msg(db, c.id); await mk_msg(db, c.id, "assistant", "reply"); await db.commit()
        assert (await admin_client.get(L(project.id))).json()[0]["messageCount"] == 2

    @pytest.mark.asyncio
    async def test_msg_count_zero(self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User):
        await mk_conv(db, project.id, admin_user.id); await db.commit()
        assert (await admin_client.get(L(project.id))).json()[0]["messageCount"] == 0

    @pytest.mark.asyncio
    async def test_camel_case_fields(self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User):
        await mk_conv(db, project.id, admin_user.id); await db.commit()
        item = (await admin_client.get(L(project.id))).json()[0]
        for f in ["id", "title", "createdAt", "updatedAt", "messageCount"]: assert f in item

    @pytest.mark.asyncio
    async def test_id_is_uuid(self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User):
        await mk_conv(db, project.id, admin_user.id); await db.commit()
        uuid.UUID((await admin_client.get(L(project.id))).json()[0]["id"])

    @pytest.mark.asyncio
    async def test_null_title(self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User):
        db.add(ChatConversation(id=uuid.uuid4(), project_id=project.id, user_id=admin_user.id, title=None)); await db.commit()
        assert (await admin_client.get(L(project.id))).json()[0]["title"] is None

    @pytest.mark.asyncio
    async def test_is_list(self, admin_client: AsyncClient, project: Project):
        assert isinstance((await admin_client.get(L(project.id))).json(), list)

    @pytest.mark.asyncio
    @pytest.mark.parametrize("count", [1, 3, 10])
    async def test_n_conversations(self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User, count):
        for i in range(count): await mk_conv(db, project.id, admin_user.id, f"C{i}", i)
        await db.commit()
        assert len((await admin_client.get(L(project.id))).json()) == count

    @pytest.mark.asyncio
    async def test_different_msg_counts(self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User):
        c1 = await mk_conv(db, project.id, admin_user.id, "Few", 0)
        c2 = await mk_conv(db, project.id, admin_user.id, "Many", 1)
        await mk_msg(db, c1.id)
        for i in range(5): await mk_msg(db, c2.id, "user", f"m{i}")
        await db.commit()
        counts = {i["title"]: i["messageCount"] for i in (await admin_client.get(L(project.id))).json()}
        assert counts["Few"] == 1 and counts["Many"] == 5


class TestGetConversation:
    @pytest.mark.asyncio
    async def test_success(self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User):
        c = await mk_conv(db, project.id, admin_user.id, "Detail"); await db.commit()
        r = await admin_client.get(D(project.id, c.id))
        assert r.status_code == 200 and r.json()["title"] == "Detail"

    @pytest.mark.asyncio
    async def test_includes_messages(self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User):
        c = await mk_conv(db, project.id, admin_user.id)
        await mk_msg(db, c.id, "user", "Hello"); await mk_msg(db, c.id, "assistant", "Hi"); await db.commit()
        msgs = (await admin_client.get(D(project.id, c.id))).json()["messages"]
        assert len(msgs) == 2 and msgs[0]["role"] == "user" and msgs[1]["role"] == "assistant"

    @pytest.mark.asyncio
    async def test_messages_asc(self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User):
        c = await mk_conv(db, project.id, admin_user.id)
        for r, t, a in [("user", "first", 10), ("assistant", "second", 5), ("user", "third", 0)]: await mk_msg(db, c.id, r, t, a)
        await db.commit()
        assert [m["content"] for m in (await admin_client.get(D(project.id, c.id))).json()["messages"]] == ["first", "second", "third"]

    @pytest.mark.asyncio
    async def test_empty_messages(self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User):
        c = await mk_conv(db, project.id, admin_user.id); await db.commit()
        assert (await admin_client.get(D(project.id, c.id))).json()["messages"] == []

    @pytest.mark.asyncio
    async def test_not_found(self, admin_client: AsyncClient, project: Project):
        assert (await admin_client.get(D(project.id, FAKE))).status_code == 404

    @pytest.mark.asyncio
    async def test_wrong_project(self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User):
        other = await mk_proj(db, admin_user.id, "OTH-G")
        c = await mk_conv(db, project.id, admin_user.id); await db.commit()
        assert (await admin_client.get(D(other.id, c.id))).status_code == 404

    @pytest.mark.asyncio
    async def test_wrong_user(self, admin_client: AsyncClient, project: Project, db: AsyncSession, regular_user: User):
        c = await mk_conv(db, project.id, regular_user.id); await db.commit()
        assert (await admin_client.get(D(project.id, c.id))).status_code == 404

    @pytest.mark.asyncio
    async def test_camel_case(self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User):
        c = await mk_conv(db, project.id, admin_user.id); await mk_msg(db, c.id); await db.commit()
        d = (await admin_client.get(D(project.id, c.id))).json()
        assert "createdAt" in d and "updatedAt" in d and "conversationId" in d["messages"][0]

    @pytest.mark.asyncio
    async def test_msg_fields(self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User):
        c = await mk_conv(db, project.id, admin_user.id); await mk_msg(db, c.id, "user", "test"); await db.commit()
        msg = (await admin_client.get(D(project.id, c.id))).json()["messages"][0]
        for f in ["id", "conversationId", "role", "content", "createdAt"]: assert f in msg

    @pytest.mark.asyncio
    async def test_null_content(self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User):
        c = await mk_conv(db, project.id, admin_user.id); await mk_msg(db, c.id, "assistant", None); await db.commit()
        assert (await admin_client.get(D(project.id, c.id))).json()["messages"][0]["content"] is None

    @pytest.mark.asyncio
    async def test_invalid_uuid(self, admin_client: AsyncClient, project: Project):
        assert (await admin_client.get(D(project.id, "bad"))).status_code == 422

    @pytest.mark.asyncio
    async def test_top_level_fields(self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User):
        c = await mk_conv(db, project.id, admin_user.id); await db.commit()
        d = (await admin_client.get(D(project.id, c.id))).json()
        for f in ["id", "title", "createdAt", "updatedAt", "messages"]: assert f in d


class TestDeleteConversation:
    @pytest.mark.asyncio
    async def test_success(self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User):
        c = await mk_conv(db, project.id, admin_user.id); await db.commit()
        r = await admin_client.delete(D(project.id, c.id))
        assert r.status_code == 200 and r.json()["detail"] == "Conversation deleted"

    @pytest.mark.asyncio
    async def test_removes_from_list(self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User):
        c = await mk_conv(db, project.id, admin_user.id); await db.commit()
        await admin_client.delete(D(project.id, c.id))
        assert len((await admin_client.get(L(project.id))).json()) == 0

    @pytest.mark.asyncio
    async def test_then_get_404(self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User):
        c = await mk_conv(db, project.id, admin_user.id); await db.commit()
        await admin_client.delete(D(project.id, c.id))
        assert (await admin_client.get(D(project.id, c.id))).status_code == 404

    @pytest.mark.asyncio
    async def test_double_delete(self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User):
        c = await mk_conv(db, project.id, admin_user.id); await db.commit()
        await admin_client.delete(D(project.id, c.id))
        assert (await admin_client.delete(D(project.id, c.id))).status_code == 404

    @pytest.mark.asyncio
    async def test_not_found(self, admin_client: AsyncClient, project: Project):
        assert (await admin_client.delete(D(project.id, FAKE))).status_code == 404

    @pytest.mark.asyncio
    async def test_wrong_project(self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User):
        other = await mk_proj(db, admin_user.id, "OTH-D")
        c = await mk_conv(db, project.id, admin_user.id); await db.commit()
        assert (await admin_client.delete(D(other.id, c.id))).status_code == 404

    @pytest.mark.asyncio
    async def test_wrong_user(self, admin_client: AsyncClient, project: Project, db: AsyncSession, regular_user: User):
        c = await mk_conv(db, project.id, regular_user.id); await db.commit()
        assert (await admin_client.delete(D(project.id, c.id))).status_code == 404

    @pytest.mark.asyncio
    async def test_cascades_messages(self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User):
        c = await mk_conv(db, project.id, admin_user.id)
        await mk_msg(db, c.id); await mk_msg(db, c.id, "assistant", "bye"); await db.commit()
        assert (await admin_client.delete(D(project.id, c.id))).status_code == 200

    @pytest.mark.asyncio
    async def test_one_of_many(self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User):
        c1 = await mk_conv(db, project.id, admin_user.id, "Keep"); c2 = await mk_conv(db, project.id, admin_user.id, "Remove"); await db.commit()
        await admin_client.delete(D(project.id, c2.id))
        items = (await admin_client.get(L(project.id))).json()
        assert len(items) == 1 and items[0]["title"] == "Keep"

    @pytest.mark.asyncio
    async def test_invalid_uuid(self, admin_client: AsyncClient, project: Project):
        assert (await admin_client.delete(D(project.id, "bad"))).status_code == 422


class TestAuthAndAccess:
    @pytest.mark.asyncio
    async def test_unauth_list_401(self, client: AsyncClient, project: Project):
        assert (await client.get(L(project.id))).status_code == 401

    @pytest.mark.asyncio
    async def test_unauth_get_401(self, client: AsyncClient, project: Project):
        assert (await client.get(D(project.id, FAKE))).status_code == 401

    @pytest.mark.asyncio
    async def test_unauth_delete_401(self, client: AsyncClient, project: Project):
        assert (await client.delete(D(project.id, FAKE))).status_code == 401

    @pytest.mark.asyncio
    @pytest.mark.parametrize("method,use_detail", [("get", False), ("get", True), ("delete", True)])
    async def test_non_member_403(self, user_client: AsyncClient, project: Project, method, use_detail):
        path = D(project.id, FAKE) if use_detail else L(project.id)
        assert (await getattr(user_client, method)(path)).status_code == 403

    @pytest.mark.asyncio
    @pytest.mark.parametrize("method,use_detail", [("get", False), ("get", True), ("delete", True)])
    async def test_fake_project_403(self, admin_client: AsyncClient, method, use_detail):
        path = D(FAKE, FAKE) if use_detail else L(FAKE)
        assert (await getattr(admin_client, method)(path)).status_code == 403

    @pytest.mark.asyncio
    async def test_member_can_list(self, user_client: AsyncClient, project: Project, db: AsyncSession, regular_user: User):
        db.add(ProjectMember(project_id=project.id, user_id=regular_user.id, role="contractor")); await db.commit()
        assert (await user_client.get(L(project.id))).status_code == 200

    @pytest.mark.asyncio
    async def test_member_get_own(self, user_client: AsyncClient, project: Project, db: AsyncSession, regular_user: User):
        db.add(ProjectMember(project_id=project.id, user_id=regular_user.id, role="contractor"))
        c = await mk_conv(db, project.id, regular_user.id); await db.commit()
        assert (await user_client.get(D(project.id, c.id))).status_code == 200

    @pytest.mark.asyncio
    async def test_member_cant_see_other(self, user_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User, regular_user: User):
        db.add(ProjectMember(project_id=project.id, user_id=regular_user.id, role="contractor"))
        c = await mk_conv(db, project.id, admin_user.id); await db.commit()
        assert (await user_client.get(D(project.id, c.id))).status_code == 404

    @pytest.mark.asyncio
    async def test_member_delete_own(self, user_client: AsyncClient, project: Project, db: AsyncSession, regular_user: User):
        db.add(ProjectMember(project_id=project.id, user_id=regular_user.id, role="contractor"))
        c = await mk_conv(db, project.id, regular_user.id); await db.commit()
        assert (await user_client.delete(D(project.id, c.id))).status_code == 200

    @pytest.mark.asyncio
    async def test_member_cant_delete_other(self, user_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User, regular_user: User):
        db.add(ProjectMember(project_id=project.id, user_id=regular_user.id, role="contractor"))
        c = await mk_conv(db, project.id, admin_user.id); await db.commit()
        assert (await user_client.delete(D(project.id, c.id))).status_code == 404
