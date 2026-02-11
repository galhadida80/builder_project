import uuid
from datetime import datetime, timedelta

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.chat import ChatConversation, ChatMessage
from app.models.chat_action import ChatAction
from app.models.project import Project, ProjectMember
from app.models.user import User

API = "/api/v1"
FAKE = str(uuid.uuid4())
EX = lambda pid, aid: f"{API}/projects/{pid}/chat/actions/{aid}/execute"
RJ = lambda pid, aid: f"{API}/projects/{pid}/chat/actions/{aid}/reject"


async def mk_conv(db, pid, uid, title="Chat"):
    c = ChatConversation(id=uuid.uuid4(), project_id=pid, user_id=uid, title=title,
                         created_at=datetime.utcnow(), updated_at=datetime.utcnow())
    db.add(c)
    await db.flush()
    return c


async def mk_msg(db, cid, role="assistant", content="I propose..."):
    m = ChatMessage(id=uuid.uuid4(), conversation_id=cid, role=role, content=content,
                    created_at=datetime.utcnow())
    db.add(m)
    await db.flush()
    return m


async def mk_action(db, conv_id, msg_id, status="proposed", action_type="propose_create_contact",
                     entity_type="contact", params=None):
    a = ChatAction(
        id=uuid.uuid4(), conversation_id=conv_id, message_id=msg_id,
        action_type=action_type, entity_type=entity_type,
        parameters=params or {"contact_name": "Test", "contact_type": "contractor"},
        description="Create contact Test", status=status,
        created_at=datetime.utcnow(),
    )
    db.add(a)
    await db.flush()
    return a


async def mk_proj(db, uid, code="ACT-X"):
    p = Project(id=uuid.uuid4(), name="Action Test", code=code, status="active", created_by_id=uid)
    db.add(p)
    await db.flush()
    db.add(ProjectMember(project_id=p.id, user_id=uid, role="project_admin"))
    await db.commit()
    return p


class TestExecuteAction:
    @pytest.mark.asyncio
    async def test_execute_requires_auth(self, client: AsyncClient, project: Project):
        r = await client.post(EX(project.id, FAKE))
        assert r.status_code == 401

    @pytest.mark.asyncio
    async def test_execute_not_found(self, admin_client: AsyncClient, project: Project):
        r = await admin_client.post(EX(project.id, uuid.uuid4()))
        assert r.status_code == 404

    @pytest.mark.asyncio
    async def test_execute_wrong_project(self, admin_client: AsyncClient, project: Project,
                                          db: AsyncSession, admin_user: User):
        other = await mk_proj(db, admin_user.id, "OTH-A")
        conv = await mk_conv(db, other.id, admin_user.id)
        msg = await mk_msg(db, conv.id)
        action = await mk_action(db, conv.id, msg.id)
        await db.commit()
        r = await admin_client.post(EX(project.id, action.id))
        assert r.status_code == 404

    @pytest.mark.asyncio
    async def test_execute_already_executed(self, admin_client: AsyncClient, project: Project,
                                             db: AsyncSession, admin_user: User):
        conv = await mk_conv(db, project.id, admin_user.id)
        msg = await mk_msg(db, conv.id)
        action = await mk_action(db, conv.id, msg.id, status="executed")
        await db.commit()
        r = await admin_client.post(EX(project.id, action.id))
        assert r.status_code == 400
        assert "already" in r.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_execute_already_rejected(self, admin_client: AsyncClient, project: Project,
                                             db: AsyncSession, admin_user: User):
        conv = await mk_conv(db, project.id, admin_user.id)
        msg = await mk_msg(db, conv.id)
        action = await mk_action(db, conv.id, msg.id, status="rejected")
        await db.commit()
        r = await admin_client.post(EX(project.id, action.id))
        assert r.status_code == 400


class TestRejectAction:
    @pytest.mark.asyncio
    async def test_reject_requires_auth(self, client: AsyncClient, project: Project):
        r = await client.post(RJ(project.id, FAKE))
        assert r.status_code == 401

    @pytest.mark.asyncio
    async def test_reject_not_found(self, admin_client: AsyncClient, project: Project):
        r = await admin_client.post(RJ(project.id, uuid.uuid4()))
        assert r.status_code == 404

    @pytest.mark.asyncio
    async def test_reject_proposed_action(self, admin_client: AsyncClient, project: Project,
                                           db: AsyncSession, admin_user: User):
        conv = await mk_conv(db, project.id, admin_user.id)
        msg = await mk_msg(db, conv.id)
        action = await mk_action(db, conv.id, msg.id)
        await db.commit()
        r = await admin_client.post(RJ(project.id, action.id))
        assert r.status_code == 200
        data = r.json()
        assert data["status"] == "rejected"
        assert data["id"] == str(action.id)
        assert data["executedById"] is not None

    @pytest.mark.asyncio
    async def test_reject_with_reason(self, admin_client: AsyncClient, project: Project,
                                       db: AsyncSession, admin_user: User):
        conv = await mk_conv(db, project.id, admin_user.id)
        msg = await mk_msg(db, conv.id)
        action = await mk_action(db, conv.id, msg.id)
        await db.commit()
        r = await admin_client.post(RJ(project.id, action.id), json={"reason": "Not needed"})
        assert r.status_code == 200
        data = r.json()
        assert data["result"]["reason"] == "Not needed"

    @pytest.mark.asyncio
    async def test_reject_already_rejected(self, admin_client: AsyncClient, project: Project,
                                            db: AsyncSession, admin_user: User):
        conv = await mk_conv(db, project.id, admin_user.id)
        msg = await mk_msg(db, conv.id)
        action = await mk_action(db, conv.id, msg.id, status="rejected")
        await db.commit()
        r = await admin_client.post(RJ(project.id, action.id))
        assert r.status_code == 400

    @pytest.mark.asyncio
    async def test_reject_wrong_project(self, admin_client: AsyncClient, project: Project,
                                         db: AsyncSession, admin_user: User):
        other = await mk_proj(db, admin_user.id, "OTH-R")
        conv = await mk_conv(db, other.id, admin_user.id)
        msg = await mk_msg(db, conv.id)
        action = await mk_action(db, conv.id, msg.id)
        await db.commit()
        r = await admin_client.post(RJ(project.id, action.id))
        assert r.status_code == 404


class TestActionResponseSchema:
    @pytest.mark.asyncio
    async def test_reject_returns_camel_case(self, admin_client: AsyncClient, project: Project,
                                              db: AsyncSession, admin_user: User):
        conv = await mk_conv(db, project.id, admin_user.id)
        msg = await mk_msg(db, conv.id)
        action = await mk_action(db, conv.id, msg.id)
        await db.commit()
        r = await admin_client.post(RJ(project.id, action.id))
        data = r.json()
        assert "conversationId" in data
        assert "messageId" in data
        assert "actionType" in data
        assert "entityType" in data
        assert "createdAt" in data
        assert "executedAt" in data
        assert "executedById" in data

    @pytest.mark.asyncio
    async def test_reject_response_has_executed_by_id(self, admin_client: AsyncClient, project: Project,
                                                       db: AsyncSession, admin_user: User):
        conv = await mk_conv(db, project.id, admin_user.id)
        msg = await mk_msg(db, conv.id)
        action = await mk_action(db, conv.id, msg.id)
        await db.commit()
        r = await admin_client.post(RJ(project.id, action.id))
        data = r.json()
        assert data["executedById"] == str(admin_user.id)

    @pytest.mark.asyncio
    async def test_action_in_conversation_detail(self, admin_client: AsyncClient, project: Project,
                                                  db: AsyncSession, admin_user: User):
        conv = await mk_conv(db, project.id, admin_user.id)
        msg = await mk_msg(db, conv.id)
        await mk_action(db, conv.id, msg.id)
        await db.commit()
        r = await admin_client.get(f"{API}/projects/{project.id}/chat/conversations/{conv.id}")
        assert r.status_code == 200
        msgs = r.json()["messages"]
        assert len(msgs) == 1
        assert len(msgs[0]["pendingActions"]) == 1
        action_data = msgs[0]["pendingActions"][0]
        assert action_data["status"] == "proposed"
        assert "executedById" in action_data
        assert action_data["entityType"] == "contact"
