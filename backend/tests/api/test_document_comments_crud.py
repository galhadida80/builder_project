import uuid

from app.models.document_review import DocumentComment, DocumentReview, ReviewStatus
from app.models.file import File
from app.models.project import ProjectMember

API = "/api/v1"
FAKE_PID, FAKE_DID, FAKE_CID = str(uuid.uuid4()), str(uuid.uuid4()), str(uuid.uuid4())
curl = lambda p, d: f"{API}/projects/{p}/documents/{d}/comments"
cid_url = lambda c: f"{API}/comments/{c}"


async def mk_file(db, proj, user):
    f = File(id=uuid.uuid4(), project_id=proj.id, entity_type="doc", entity_id=proj.id,
             filename="t.pdf", file_type="pdf", file_size=1024,
             storage_path="/f/t.pdf", uploaded_by_id=user.id)
    db.add(f); await db.commit(); await db.refresh(f); return f


async def mk_review(db, proj, doc, user):
    r = DocumentReview(id=uuid.uuid4(), project_id=proj.id, document_id=doc.id,
                       status=ReviewStatus.IN_REVIEW.value, created_by_id=user.id)
    db.add(r); await db.commit(); await db.refresh(r); return r


async def mk_comment(db, rev, user, text="Test", parent_id=None):
    c = DocumentComment(id=uuid.uuid4(), review_id=rev.id, comment_text=text,
                        created_by_id=user.id, parent_comment_id=parent_id)
    db.add(c); await db.commit(); await db.refresh(c); return c


async def setup(db, proj, user, review=True):
    doc = await mk_file(db, proj, user)
    rev = await mk_review(db, proj, doc, user) if review else None
    return doc, rev


class TestCreateComment:
    async def test_success(self, admin_client, project, db, admin_user):
        doc, rev = await setup(db, project, admin_user)
        r = await admin_client.post(curl(str(project.id), str(doc.id)), json={"comment_text": "Good"})
        assert r.status_code == 201
        d = r.json()
        assert d["commentText"] == "Good" and d["reviewId"] == str(rev.id) and d["isResolved"] is False
    async def test_auto_creates_review(self, admin_client, project, db, admin_user):
        doc, _ = await setup(db, project, admin_user, review=False)
        r = await admin_client.post(curl(str(project.id), str(doc.id)), json={"comment_text": "First"})
        assert r.status_code == 201 and r.json()["reviewId"] is not None
    async def test_reply(self, admin_client, project, db, admin_user):
        doc, rev = await setup(db, project, admin_user)
        p = await mk_comment(db, rev, admin_user, "Parent")
        r = await admin_client.post(curl(str(project.id), str(doc.id)),
                                    json={"comment_text": "Reply", "parent_comment_id": str(p.id)})
        assert r.status_code == 201 and r.json()["parentCommentId"] == str(p.id)
    async def test_invalid_parent_404(self, admin_client, project, db, admin_user):
        doc, _ = await setup(db, project, admin_user)
        r = await admin_client.post(curl(str(project.id), str(doc.id)),
                                    json={"comment_text": "X", "parent_comment_id": str(uuid.uuid4())})
        assert r.status_code == 404
    async def test_empty_text_422(self, admin_client, project, db, admin_user):
        doc, _ = await setup(db, project, admin_user, review=False)
        assert (await admin_client.post(curl(str(project.id), str(doc.id)), json={"comment_text": ""})).status_code == 422
    async def test_missing_text_422(self, admin_client, project, db, admin_user):
        doc, _ = await setup(db, project, admin_user, review=False)
        assert (await admin_client.post(curl(str(project.id), str(doc.id)), json={})).status_code == 422
    async def test_unauth_401(self, client, project, db, admin_user):
        doc, _ = await setup(db, project, admin_user, review=False)
        assert (await client.post(curl(str(project.id), str(doc.id)), json={"comment_text": "N"})).status_code == 401
    async def test_no_access_403(self, user_client, project, db, admin_user):
        doc, _ = await setup(db, project, admin_user, review=False)
        assert (await user_client.post(curl(str(project.id), str(doc.id)), json={"comment_text": "N"})).status_code == 403
    async def test_fake_project_403(self, admin_client):
        assert (await admin_client.post(curl(FAKE_PID, FAKE_DID), json={"comment_text": "N"})).status_code == 403
    async def test_returns_created_by(self, admin_client, project, db, admin_user):
        doc, _ = await setup(db, project, admin_user)
        d = (await admin_client.post(curl(str(project.id), str(doc.id)), json={"comment_text": "A"})).json()
        assert d["createdById"] == str(admin_user.id)
    async def test_has_timestamps(self, admin_client, project, db, admin_user):
        doc, _ = await setup(db, project, admin_user)
        d = (await admin_client.post(curl(str(project.id), str(doc.id)), json={"comment_text": "T"})).json()
        assert d["createdAt"] is not None and d["updatedAt"] is not None
    async def test_multiple(self, admin_client, project, db, admin_user):
        doc, _ = await setup(db, project, admin_user)
        for i in range(3):
            assert (await admin_client.post(curl(str(project.id), str(doc.id)),
                                            json={"comment_text": f"C{i}"})).status_code == 201
    async def test_reply_to_reply(self, admin_client, project, db, admin_user):
        doc, rev = await setup(db, project, admin_user)
        p = await mk_comment(db, rev, admin_user, "L1")
        assert (await admin_client.post(curl(str(project.id), str(doc.id)),
                                        json={"comment_text": "L2", "parent_comment_id": str(p.id)})).status_code == 201
    async def test_default_not_resolved(self, admin_client, project, db, admin_user):
        doc, _ = await setup(db, project, admin_user)
        assert (await admin_client.post(curl(str(project.id), str(doc.id)), json={"comment_text": "C"})).json()["isResolved"] is False
    async def test_has_id(self, admin_client, project, db, admin_user):
        doc, _ = await setup(db, project, admin_user)
        d = (await admin_client.post(curl(str(project.id), str(doc.id)), json={"comment_text": "C"})).json()
        assert "id" in d and len(d["id"]) == 36
    async def test_replies_empty(self, admin_client, project, db, admin_user):
        doc, _ = await setup(db, project, admin_user)
        assert (await admin_client.post(curl(str(project.id), str(doc.id)), json={"comment_text": "C"})).json()["replies"] == []


class TestListComments:
    async def test_empty(self, admin_client, project, db, admin_user):
        doc, _ = await setup(db, project, admin_user)
        r = await admin_client.get(curl(str(project.id), str(doc.id)))
        assert r.status_code == 200 and r.json() == []
    async def test_root_only(self, admin_client, project, db, admin_user):
        doc, rev = await setup(db, project, admin_user)
        root = await mk_comment(db, rev, admin_user, "Root")
        await mk_comment(db, rev, admin_user, "Reply", parent_id=root.id)
        data = (await admin_client.get(curl(str(project.id), str(doc.id)))).json()
        assert len(data) == 1 and data[0]["commentText"] == "Root"
    async def test_replies_nested(self, admin_client, project, db, admin_user):
        doc, rev = await setup(db, project, admin_user)
        root = await mk_comment(db, rev, admin_user, "Root")
        await mk_comment(db, rev, admin_user, "R", parent_id=root.id)
        assert len((await admin_client.get(curl(str(project.id), str(doc.id)))).json()[0]["replies"]) == 1
    async def test_no_review_404(self, admin_client, project, db, admin_user):
        doc, _ = await setup(db, project, admin_user, review=False)
        assert (await admin_client.get(curl(str(project.id), str(doc.id)))).status_code == 404
    async def test_unauth_401(self, client, project, db, admin_user):
        doc, _ = await setup(db, project, admin_user, review=False)
        assert (await client.get(curl(str(project.id), str(doc.id)))).status_code == 401
    async def test_no_access_403(self, user_client, project, db, admin_user):
        doc, _ = await setup(db, project, admin_user, review=False)
        assert (await user_client.get(curl(str(project.id), str(doc.id)))).status_code == 403
    async def test_multiple_roots(self, admin_client, project, db, admin_user):
        doc, rev = await setup(db, project, admin_user)
        for t in ("A", "B", "C"):
            await mk_comment(db, rev, admin_user, t)
        assert len((await admin_client.get(curl(str(project.id), str(doc.id)))).json()) == 3
    async def test_ordered(self, admin_client, project, db, admin_user):
        doc, rev = await setup(db, project, admin_user)
        await mk_comment(db, rev, admin_user, "Alpha")
        await mk_comment(db, rev, admin_user, "Beta")
        data = (await admin_client.get(curl(str(project.id), str(doc.id)))).json()
        assert data[0]["commentText"] == "Alpha" and data[1]["commentText"] == "Beta"
    async def test_wrong_project_403(self, admin_client):
        assert (await admin_client.get(curl(FAKE_PID, FAKE_DID))).status_code == 403
    async def test_includes_created_by(self, admin_client, project, db, admin_user):
        doc, rev = await setup(db, project, admin_user)
        await mk_comment(db, rev, admin_user, "X")
        assert (await admin_client.get(curl(str(project.id), str(doc.id)))).json()[0]["createdById"] == str(admin_user.id)


class TestUpdateComment:
    async def test_text(self, admin_client, project, db, admin_user):
        doc, rev = await setup(db, project, admin_user)
        c = await mk_comment(db, rev, admin_user, "Old")
        r = await admin_client.put(cid_url(str(c.id)), json={"comment_text": "New"})
        assert r.status_code == 200 and r.json()["commentText"] == "New"
    async def test_resolve(self, admin_client, project, db, admin_user):
        doc, rev = await setup(db, project, admin_user)
        c = await mk_comment(db, rev, admin_user)
        r = await admin_client.put(cid_url(str(c.id)), json={"is_resolved": True})
        assert r.status_code == 200 and r.json()["isResolved"] is True
    async def test_both(self, admin_client, project, db, admin_user):
        doc, rev = await setup(db, project, admin_user)
        c = await mk_comment(db, rev, admin_user)
        d = (await admin_client.put(cid_url(str(c.id)), json={"comment_text": "Done", "is_resolved": True})).json()
        assert d["commentText"] == "Done" and d["isResolved"] is True
    async def test_not_owner_403(self, user_client, project, db, admin_user, regular_user):
        doc, rev = await setup(db, project, admin_user)
        c = await mk_comment(db, rev, admin_user)
        assert (await user_client.put(cid_url(str(c.id)), json={"comment_text": "X"})).status_code == 403
    async def test_not_found_404(self, admin_client):
        assert (await admin_client.put(cid_url(FAKE_CID), json={"comment_text": "X"})).status_code == 404
    async def test_unauth_401(self, client, project, db, admin_user):
        doc, rev = await setup(db, project, admin_user)
        c = await mk_comment(db, rev, admin_user)
        assert (await client.put(cid_url(str(c.id)), json={"comment_text": "X"})).status_code == 401
    async def test_empty_text_422(self, admin_client, project, db, admin_user):
        doc, rev = await setup(db, project, admin_user)
        c = await mk_comment(db, rev, admin_user)
        assert (await admin_client.put(cid_url(str(c.id)), json={"comment_text": ""})).status_code == 422
    async def test_preserves_unset(self, admin_client, project, db, admin_user):
        doc, rev = await setup(db, project, admin_user)
        c = await mk_comment(db, rev, admin_user, "Orig")
        d = (await admin_client.put(cid_url(str(c.id)), json={"is_resolved": True})).json()
        assert d["commentText"] == "Orig" and d["isResolved"] is True
    async def test_toggle_resolved(self, admin_client, project, db, admin_user):
        doc, rev = await setup(db, project, admin_user)
        c = await mk_comment(db, rev, admin_user)
        await admin_client.put(cid_url(str(c.id)), json={"is_resolved": True})
        assert (await admin_client.put(cid_url(str(c.id)), json={"is_resolved": False})).json()["isResolved"] is False
    async def test_invalid_uuid_422(self, admin_client):
        assert (await admin_client.put(f"{API}/comments/bad", json={"comment_text": "X"})).status_code == 422


class TestDeleteComment:
    async def test_success_204(self, admin_client, project, db, admin_user):
        doc, rev = await setup(db, project, admin_user)
        c = await mk_comment(db, rev, admin_user)
        assert (await admin_client.delete(cid_url(str(c.id)))).status_code == 204
    async def test_not_owner_403(self, user_client, project, db, admin_user, regular_user):
        doc, rev = await setup(db, project, admin_user)
        c = await mk_comment(db, rev, admin_user)
        assert (await user_client.delete(cid_url(str(c.id)))).status_code == 403
    async def test_not_found_404(self, admin_client):
        assert (await admin_client.delete(cid_url(FAKE_CID))).status_code == 404
    async def test_unauth_401(self, client, project, db, admin_user):
        doc, rev = await setup(db, project, admin_user)
        c = await mk_comment(db, rev, admin_user)
        assert (await client.delete(cid_url(str(c.id)))).status_code == 401
    async def test_confirms_removal(self, admin_client, project, db, admin_user):
        doc, rev = await setup(db, project, admin_user)
        c = await mk_comment(db, rev, admin_user)
        await admin_client.delete(cid_url(str(c.id)))
        assert (await admin_client.put(cid_url(str(c.id)), json={"comment_text": "G"})).status_code == 404
    async def test_invalid_uuid_422(self, admin_client):
        assert (await admin_client.delete(f"{API}/comments/bad")).status_code == 422
    async def test_root_with_replies(self, admin_client, project, db, admin_user):
        doc, rev = await setup(db, project, admin_user)
        root = await mk_comment(db, rev, admin_user, "Root")
        await mk_comment(db, rev, admin_user, "Reply", parent_id=root.id)
        assert (await admin_client.delete(cid_url(str(root.id)))).status_code == 204
    async def test_delete_then_list(self, admin_client, project, db, admin_user):
        doc, rev = await setup(db, project, admin_user)
        c1 = await mk_comment(db, rev, admin_user, "Keep")
        c2 = await mk_comment(db, rev, admin_user, "Remove")
        await admin_client.delete(cid_url(str(c2.id)))
        data = (await admin_client.get(curl(str(project.id), str(doc.id)))).json()
        assert len(data) == 1 and data[0]["commentText"] == "Keep"


class TestAccessControl:
    async def test_non_member_create_403(self, user_client, project, db, admin_user):
        doc, _ = await setup(db, project, admin_user, review=False)
        assert (await user_client.post(curl(str(project.id), str(doc.id)), json={"comment_text": "N"})).status_code == 403
    async def test_non_member_list_403(self, user_client, project, db, admin_user):
        doc, _ = await setup(db, project, admin_user, review=False)
        assert (await user_client.get(curl(str(project.id), str(doc.id)))).status_code == 403
    async def test_unauth_update_401(self, client, project, db, admin_user):
        doc, rev = await setup(db, project, admin_user)
        c = await mk_comment(db, rev, admin_user)
        assert (await client.put(cid_url(str(c.id)), json={"comment_text": "N"})).status_code == 401
    async def test_unauth_delete_401(self, client, project, db, admin_user):
        doc, rev = await setup(db, project, admin_user)
        c = await mk_comment(db, rev, admin_user)
        assert (await client.delete(cid_url(str(c.id)))).status_code == 401
    async def test_fake_project_create_403(self, admin_client):
        assert (await admin_client.post(curl(FAKE_PID, FAKE_DID), json={"comment_text": "N"})).status_code == 403
    async def test_fake_project_list_403(self, admin_client):
        assert (await admin_client.get(curl(FAKE_PID, FAKE_DID))).status_code == 403
    async def test_member_can_create(self, user_client, project, db, admin_user, regular_user):
        db.add(ProjectMember(project_id=project.id, user_id=regular_user.id, role="member"))
        await db.commit()
        doc, _ = await setup(db, project, admin_user)
        assert (await user_client.post(curl(str(project.id), str(doc.id)), json={"comment_text": "M"})).status_code == 201
    async def test_member_can_list(self, user_client, project, db, admin_user, regular_user):
        db.add(ProjectMember(project_id=project.id, user_id=regular_user.id, role="member"))
        await db.commit()
        doc, _ = await setup(db, project, admin_user)
        assert (await user_client.get(curl(str(project.id), str(doc.id)))).status_code == 200
