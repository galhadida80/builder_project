import uuid
from unittest.mock import AsyncMock, patch
import pytest
from app.models.file import File
from app.models.document_analysis import DocumentAnalysis
from app.models.project import ProjectMember
from app.services.storage_service import StorageBackend, get_storage_backend

API = "/api/v1"
FAKE_PID, FAKE_FID = str(uuid.uuid4()), str(uuid.uuid4())
a_url = lambda p, f: f"{API}/projects/{p}/files/{f}/analyze"
fa_url = lambda p, f: f"{API}/projects/{p}/files/{f}/analysis"
pa_url = lambda p: f"{API}/projects/{p}/analyses"
AI_OK = {"result": {"text": "ok"}, "model_used": "gemini-2.0", "processing_time_ms": 42}
AI_PATCH = "app.api.v1.document_analysis.analyze_document"
BODY = lambda fid, at="ocr": {"file_id": str(fid), "analysis_type": at}


async def mk_file(db, proj, user, name="t.pdf"):
    f = File(id=uuid.uuid4(), project_id=proj.id, entity_type="doc", entity_id=proj.id,
             filename=name, file_type="application/pdf", file_size=2048,
             storage_path=f"/f/{uuid.uuid4().hex}.pdf", uploaded_by_id=user.id)
    db.add(f); await db.commit(); await db.refresh(f); return f


async def mk_analysis(db, proj, file, atype="ocr", status="completed"):
    a = DocumentAnalysis(id=uuid.uuid4(), file_id=file.id, project_id=proj.id,
                         analysis_type=atype, model_used="gemini-test", status=status,
                         result={"extracted_text": "hello"}, processing_time_ms=100)
    db.add(a); await db.commit(); await db.refresh(a); return a


@pytest.fixture(autouse=True)
def override_storage():
    from app.main import app
    mock = AsyncMock(spec=StorageBackend)
    mock.get_file_content.return_value = b"fake pdf content"
    app.dependency_overrides[get_storage_backend] = lambda: mock
    yield mock
    app.dependency_overrides.pop(get_storage_backend, None)


async def post_ok(client, pid, fid, atype="ocr", ai_ret=None, ai_err=None):
    body = BODY(fid, atype)
    if ai_err:
        with patch(AI_PATCH, side_effect=ai_err):
            return await client.post(a_url(str(pid), str(fid)), json=body)
    with patch(AI_PATCH, return_value=ai_ret or AI_OK):
        return await client.post(a_url(str(pid), str(fid)), json=body)


class TestTriggerAnalysis:
    @pytest.mark.parametrize("atype", ["ocr", "summary", "extraction"])
    async def test_trigger_201(self, admin_client, project, db, admin_user, atype):
        f = await mk_file(db, project, admin_user)
        assert (await post_ok(admin_client, project.id, f.id, atype)).status_code == 201
    async def test_camel_case_fields(self, admin_client, project, db, admin_user):
        f = await mk_file(db, project, admin_user)
        d = (await post_ok(admin_client, project.id, f.id)).json()
        for k in ("fileId", "projectId", "analysisType", "modelUsed", "status", "createdAt", "updatedAt"):
            assert k in d
    async def test_completed_on_success(self, admin_client, project, db, admin_user):
        f = await mk_file(db, project, admin_user)
        assert (await post_ok(admin_client, project.id, f.id)).json()["status"] == "completed"
    async def test_failed_on_runtime_error(self, admin_client, project, db, admin_user):
        f = await mk_file(db, project, admin_user)
        r = await post_ok(admin_client, project.id, f.id, ai_err=RuntimeError("AI down"))
        assert r.status_code == 201 and r.json()["status"] == "failed"
        assert "AI down" in r.json()["errorMessage"]
    async def test_failed_on_value_error(self, admin_client, project, db, admin_user):
        f = await mk_file(db, project, admin_user)
        d = (await post_ok(admin_client, project.id, f.id, ai_err=ValueError("bad"))).json()
        assert d["status"] == "failed" and "bad" in d["errorMessage"]
    async def test_model_none_on_failure(self, admin_client, project, db, admin_user):
        f = await mk_file(db, project, admin_user)
        assert (await post_ok(admin_client, project.id, f.id, ai_err=Exception("x"))).json()["modelUsed"] == "none"
    async def test_result_and_timing(self, admin_client, project, db, admin_user):
        f = await mk_file(db, project, admin_user)
        ai = {"result": {"s": 1}, "model_used": "g", "processing_time_ms": 7}
        d = (await post_ok(admin_client, project.id, f.id, ai_ret=ai)).json()
        assert d["result"] == {"s": 1} and d["processingTimeMs"] == 7
    async def test_file_not_found_404(self, admin_client, project):
        assert (await admin_client.post(a_url(str(project.id), FAKE_FID), json=BODY(FAKE_FID))).status_code == 404
    async def test_nonexistent_project_403(self, admin_client):
        assert (await admin_client.post(a_url(FAKE_PID, FAKE_FID), json=BODY(FAKE_FID))).status_code == 403
    async def test_missing_type_422(self, admin_client, project, db, admin_user):
        f = await mk_file(db, project, admin_user)
        assert (await admin_client.post(a_url(str(project.id), str(f.id)), json={"file_id": str(f.id)})).status_code == 422
    async def test_empty_type_422(self, admin_client, project, db, admin_user):
        f = await mk_file(db, project, admin_user)
        assert (await admin_client.post(a_url(str(project.id), str(f.id)), json=BODY(f.id, ""))).status_code == 422
    async def test_type_too_long_422(self, admin_client, project, db, admin_user):
        f = await mk_file(db, project, admin_user)
        assert (await admin_client.post(a_url(str(project.id), str(f.id)), json=BODY(f.id, "x"*51))).status_code == 422
    async def test_invalid_file_uuid_422(self, admin_client, project):
        assert (await admin_client.post(a_url(str(project.id), "bad"), json=BODY("bad"))).status_code == 422
    async def test_invalid_project_uuid_422(self, admin_client):
        assert (await admin_client.post(a_url("bad", FAKE_FID), json=BODY(FAKE_FID))).status_code == 422
    async def test_has_uuid_id(self, admin_client, project, db, admin_user):
        f = await mk_file(db, project, admin_user)
        assert len((await post_ok(admin_client, project.id, f.id)).json()["id"]) == 36
    async def test_ids_match_path(self, admin_client, project, db, admin_user):
        f = await mk_file(db, project, admin_user)
        d = (await post_ok(admin_client, project.id, f.id)).json()
        assert d["projectId"] == str(project.id) and d["fileId"] == str(f.id)
    async def test_multiple_same_file(self, admin_client, project, db, admin_user):
        f = await mk_file(db, project, admin_user)
        for at in ["ocr", "summary", "extraction"]:
            assert (await post_ok(admin_client, project.id, f.id, at)).status_code == 201
    async def test_storage_error_failed(self, admin_client, project, db, admin_user, override_storage):
        f = await mk_file(db, project, admin_user)
        override_storage.get_file_content.side_effect = FileNotFoundError("gone")
        r = await admin_client.post(a_url(str(project.id), str(f.id)), json=BODY(f.id))
        assert r.status_code == 201 and r.json()["status"] == "failed"
    @pytest.mark.parametrize("atype", ["ocr", "summary", "extraction", "custom"])
    async def test_type_preserved(self, admin_client, project, db, admin_user, atype):
        f = await mk_file(db, project, admin_user)
        assert (await post_ok(admin_client, project.id, f.id, atype)).json()["analysisType"] == atype
    async def test_error_null_on_success(self, admin_client, project, db, admin_user):
        f = await mk_file(db, project, admin_user)
        assert (await post_ok(admin_client, project.id, f.id)).json()["errorMessage"] is None
    async def test_no_body_422(self, admin_client, project, db, admin_user):
        f = await mk_file(db, project, admin_user)
        assert (await admin_client.post(a_url(str(project.id), str(f.id)))).status_code == 422
    async def test_processing_time(self, admin_client, project, db, admin_user):
        f = await mk_file(db, project, admin_user)
        ai = {"result": {}, "model_used": "m", "processing_time_ms": 999}
        assert (await post_ok(admin_client, project.id, f.id, ai_ret=ai)).json()["processingTimeMs"] == 999


class TestGetFileAnalyses:
    async def test_empty(self, admin_client, project, db, admin_user):
        f = await mk_file(db, project, admin_user)
        r = await admin_client.get(fa_url(str(project.id), str(f.id)))
        assert r.status_code == 200 and r.json() == []
    async def test_returns_analyses(self, admin_client, project, db, admin_user):
        f = await mk_file(db, project, admin_user)
        await mk_analysis(db, project, f, "ocr"); await mk_analysis(db, project, f, "summary")
        assert len((await admin_client.get(fa_url(str(project.id), str(f.id)))).json()) == 2
    async def test_no_cross_file_leak(self, admin_client, project, db, admin_user):
        f1 = await mk_file(db, project, admin_user, "a.pdf")
        f2 = await mk_file(db, project, admin_user, "b.pdf")
        await mk_analysis(db, project, f1, "ocr"); await mk_analysis(db, project, f2, "summary")
        data = (await admin_client.get(fa_url(str(project.id), str(f1.id)))).json()
        assert len(data) == 1 and data[0]["analysisType"] == "ocr"
    async def test_ordered_desc(self, admin_client, project, db, admin_user):
        f = await mk_file(db, project, admin_user)
        await mk_analysis(db, project, f, "ocr")
        a2 = await mk_analysis(db, project, f, "summary")
        assert (await admin_client.get(fa_url(str(project.id), str(f.id)))).json()[0]["id"] == str(a2.id)
    async def test_camel_case(self, admin_client, project, db, admin_user):
        f = await mk_file(db, project, admin_user); await mk_analysis(db, project, f)
        d = (await admin_client.get(fa_url(str(project.id), str(f.id)))).json()[0]
        assert "fileId" in d and "analysisType" in d and "modelUsed" in d
    async def test_fake_project_403(self, admin_client):
        assert (await admin_client.get(fa_url(FAKE_PID, FAKE_FID))).status_code == 403
    async def test_invalid_uuid_422(self, admin_client, project):
        assert (await admin_client.get(fa_url(str(project.id), "bad"))).status_code == 422
    async def test_result_present(self, admin_client, project, db, admin_user):
        f = await mk_file(db, project, admin_user); await mk_analysis(db, project, f)
        assert (await admin_client.get(fa_url(str(project.id), str(f.id)))).json()[0]["result"] == {"extracted_text": "hello"}
    async def test_failed_included(self, admin_client, project, db, admin_user):
        f = await mk_file(db, project, admin_user); await mk_analysis(db, project, f, status="failed")
        data = (await admin_client.get(fa_url(str(project.id), str(f.id)))).json()
        assert len(data) == 1 and data[0]["status"] == "failed"
    async def test_nonexistent_file_empty(self, admin_client, project):
        r = await admin_client.get(fa_url(str(project.id), FAKE_FID))
        assert r.status_code == 200 and r.json() == []


class TestListProjectAnalyses:
    async def test_empty(self, admin_client, project):
        d = (await admin_client.get(pa_url(str(project.id)))).json()
        assert d["items"] == [] and d["total"] == 0
    async def test_all_for_project(self, admin_client, project, db, admin_user):
        f1 = await mk_file(db, project, admin_user, "x.pdf")
        f2 = await mk_file(db, project, admin_user, "y.pdf")
        await mk_analysis(db, project, f1, "ocr"); await mk_analysis(db, project, f2, "summary")
        d = (await admin_client.get(pa_url(str(project.id)))).json()
        assert d["total"] == 2 and len(d["items"]) == 2
    async def test_total_equals_items(self, admin_client, project, db, admin_user):
        f = await mk_file(db, project, admin_user)
        for at in ["ocr", "summary", "extraction"]:
            await mk_analysis(db, project, f, at)
        d = (await admin_client.get(pa_url(str(project.id)))).json()
        assert d["total"] == len(d["items"]) == 3
    async def test_wrapper_keys(self, admin_client, project, db, admin_user):
        f = await mk_file(db, project, admin_user); await mk_analysis(db, project, f)
        d = (await admin_client.get(pa_url(str(project.id)))).json()
        assert "items" in d and "total" in d
    async def test_ordered_desc(self, admin_client, project, db, admin_user):
        f = await mk_file(db, project, admin_user)
        await mk_analysis(db, project, f, "ocr")
        a2 = await mk_analysis(db, project, f, "extraction")
        assert (await admin_client.get(pa_url(str(project.id)))).json()["items"][0]["id"] == str(a2.id)
    async def test_fake_project_403(self, admin_client):
        assert (await admin_client.get(pa_url(FAKE_PID))).status_code == 403
    async def test_invalid_uuid_422(self, admin_client):
        assert (await admin_client.get(pa_url("not-valid"))).status_code == 422
    async def test_items_required_fields(self, admin_client, project, db, admin_user):
        f = await mk_file(db, project, admin_user); await mk_analysis(db, project, f)
        item = (await admin_client.get(pa_url(str(project.id)))).json()["items"][0]
        for k in ("id", "fileId", "projectId", "analysisType", "status", "createdAt", "updatedAt"):
            assert k in item
    async def test_mixed_statuses(self, admin_client, project, db, admin_user):
        f = await mk_file(db, project, admin_user)
        await mk_analysis(db, project, f, "ocr", "completed")
        await mk_analysis(db, project, f, "summary", "failed")
        statuses = {i["status"] for i in (await admin_client.get(pa_url(str(project.id)))).json()["items"]}
        assert statuses == {"completed", "failed"}
    async def test_multi_file_aggregated(self, admin_client, project, db, admin_user):
        for i in range(4):
            f = await mk_file(db, project, admin_user, f"f{i}.pdf")
            await mk_analysis(db, project, f, "ocr")
        assert (await admin_client.get(pa_url(str(project.id)))).json()["total"] == 4


class TestDocumentAnalysisNoAuth:
    async def test_trigger_unauth_401(self, client, project, db, admin_user):
        f = await mk_file(db, project, admin_user)
        assert (await client.post(a_url(str(project.id), str(f.id)), json=BODY(f.id))).status_code == 401
    async def test_get_file_unauth_401(self, client, project, db, admin_user):
        f = await mk_file(db, project, admin_user)
        assert (await client.get(fa_url(str(project.id), str(f.id)))).status_code == 401
    async def test_list_project_unauth_401(self, client, project):
        assert (await client.get(pa_url(str(project.id)))).status_code == 401
    async def test_trigger_no_access_403(self, user_client, project, db, admin_user):
        f = await mk_file(db, project, admin_user)
        assert (await user_client.post(a_url(str(project.id), str(f.id)), json=BODY(f.id))).status_code == 403
    async def test_get_file_no_access_403(self, user_client, project, db, admin_user):
        f = await mk_file(db, project, admin_user)
        assert (await user_client.get(fa_url(str(project.id), str(f.id)))).status_code == 403
    async def test_list_project_no_access_403(self, user_client, project):
        assert (await user_client.get(pa_url(str(project.id)))).status_code == 403
    async def test_member_trigger_201(self, user_client, project, db, admin_user, regular_user):
        db.add(ProjectMember(project_id=project.id, user_id=regular_user.id, role="member"))
        await db.commit()
        f = await mk_file(db, project, admin_user)
        assert (await post_ok(user_client, project.id, f.id)).status_code == 201
    async def test_member_get_file_200(self, user_client, project, db, admin_user, regular_user):
        db.add(ProjectMember(project_id=project.id, user_id=regular_user.id, role="member"))
        await db.commit()
        f = await mk_file(db, project, admin_user)
        assert (await user_client.get(fa_url(str(project.id), str(f.id)))).status_code == 200
    async def test_member_list_200(self, user_client, project, db, admin_user, regular_user):
        db.add(ProjectMember(project_id=project.id, user_id=regular_user.id, role="member"))
        await db.commit()
        assert (await user_client.get(pa_url(str(project.id)))).status_code == 200
    @pytest.mark.parametrize("method,path", [
        ("post", a_url(FAKE_PID, FAKE_FID)),
        ("get", fa_url(FAKE_PID, FAKE_FID)),
        ("get", pa_url(FAKE_PID)),
    ])
    async def test_fake_project_all_403(self, admin_client, method, path):
        kw = {"json": BODY(FAKE_FID)} if method == "post" else {}
        assert (await getattr(admin_client, method)(path, **kw)).status_code == 403
    @pytest.mark.parametrize("endpoint", [fa_url(FAKE_PID, FAKE_FID), pa_url(FAKE_PID)])
    async def test_unauth_get_endpoints_401(self, client, endpoint):
        assert (await client.get(endpoint)).status_code == 401
