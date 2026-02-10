import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.equipment_template import ConsultantType

API = "/api/v1/consultant-types"
FAKE_ID = str(uuid.uuid4())


def url(ct_id: str) -> str:
    return f"{API}/{ct_id}"


def pl(**kw) -> dict:
    d = {"name": "Electrical Engineer", "name_he": "מהנדס חשמל", "category": "engineering"}
    d.update(kw)
    return d


async def api_create(ac: AsyncClient, **kw) -> dict:
    r = await ac.post(API, json=pl(**kw))
    assert r.status_code == 200
    return r.json()


class TestCreate:
    async def test_valid(self, admin_client: AsyncClient):
        r = await admin_client.post(API, json=pl())
        assert r.status_code == 200
        d = r.json()
        assert d["name"] == "Electrical Engineer"
        assert d["name_he"] == "מהנדס חשמל"
        assert d["category"] == "engineering"
        for f in ("id", "created_at", "updated_at"):
            assert f in d

    async def test_uuid_and_timestamps(self, admin_client: AsyncClient):
        d = (await admin_client.post(API, json=pl())).json()
        uuid.UUID(d["id"])
        assert d["created_at"] is not None and d["updated_at"] is not None

    async def test_duplicate_name(self, admin_client: AsyncClient):
        r1 = await admin_client.post(API, json=pl())
        r2 = await admin_client.post(API, json=pl())
        assert r1.status_code == 200 and r2.status_code == 200
        assert r1.json()["id"] != r2.json()["id"]

    async def test_multiple_unique_ids(self, admin_client: AsyncClient):
        ids = [(await api_create(admin_client, name=f"T{i}", name_he=f"ס{i}"))["id"] for i in range(3)]
        assert len(set(ids)) == 3

    async def test_hebrew_preserved(self, admin_client: AsyncClient):
        assert (await admin_client.post(API, json=pl(name_he="מהנדס מבנים גדול"))).json()["name_he"] == "מהנדס מבנים גדול"

    async def test_max_length(self, admin_client: AsyncClient):
        assert (await admin_client.post(API, json=pl(name="AB" * 127, name_he="אב" * 127, category="CD" * 127))).status_code == 200

    async def test_unauthenticated(self, client: AsyncClient):
        assert (await client.post(API, json=pl())).status_code in (401, 403)

    async def test_empty_body(self, admin_client: AsyncClient):
        assert (await admin_client.post(API, json={})).status_code == 422

    @pytest.mark.parametrize("field", ["name", "name_he", "category"])
    async def test_missing_required(self, admin_client: AsyncClient, field: str):
        p = pl()
        del p[field]
        assert (await admin_client.post(API, json=p)).status_code == 422

    @pytest.mark.parametrize("field", ["name", "name_he", "category"])
    async def test_empty_string(self, admin_client: AsyncClient, field: str):
        assert (await admin_client.post(API, json=pl(**{field: ""}))).status_code == 422

    @pytest.mark.parametrize("field", ["name", "name_he", "category"])
    async def test_single_char(self, admin_client: AsyncClient, field: str):
        assert (await admin_client.post(API, json=pl(**{field: "X"}))).status_code == 422

    @pytest.mark.parametrize("field", ["name", "name_he", "category"])
    async def test_over_max_length(self, admin_client: AsyncClient, field: str):
        assert (await admin_client.post(API, json=pl(**{field: "X" * 256}))).status_code == 422

    @pytest.mark.parametrize("bad", [
        {"name": None, "name_he": "he", "category": "cat"},
        {"name": "en", "name_he": None, "category": "cat"},
        {"name": "en", "name_he": "he", "category": None},
    ])
    async def test_null_fields(self, admin_client: AsyncClient, bad: dict):
        assert (await admin_client.post(API, json=bad)).status_code == 422

    @pytest.mark.parametrize("val", ["  ab  ", "  cd  ", "  ef  "])
    async def test_whitespace(self, admin_client: AsyncClient, val: str):
        assert (await admin_client.post(API, json=pl(name=val, name_he=val, category=val))).status_code in (200, 422)


class TestList:
    async def test_empty(self, client: AsyncClient):
        assert (await client.get(API)).status_code == 200 and (await client.get(API)).json() == []

    async def test_returns_all(self, admin_client: AsyncClient, client: AsyncClient):
        await api_create(admin_client, name="Alpha", name_he="אלפא")
        await api_create(admin_client, name="Beta", name_he="בטא")
        assert len((await client.get(API)).json()) == 2

    async def test_ordered_by_name(self, admin_client: AsyncClient, client: AsyncClient):
        await api_create(admin_client, name="Zebra", name_he="זברה")
        await api_create(admin_client, name="Apple", name_he="תפוח")
        names = [c["name"] for c in (await client.get(API)).json()]
        assert names == sorted(names)

    async def test_no_auth_required(self, admin_client: AsyncClient, client: AsyncClient):
        await api_create(admin_client)
        assert (await client.get(API)).status_code == 200

    async def test_json_array(self, client: AsyncClient):
        r = await client.get(API)
        assert isinstance(r.json(), list) and "application/json" in r.headers["content-type"]

    async def test_after_create(self, admin_client: AsyncClient, client: AsyncClient):
        await api_create(admin_client, name="New One", name_he="חדש אחד")
        assert "New One" in [c["name"] for c in (await client.get(API)).json()]

    async def test_after_delete(self, admin_client: AsyncClient, client: AsyncClient):
        ct_id = (await api_create(admin_client, name="ToDelete", name_he="למחיקה"))["id"]
        await admin_client.delete(url(ct_id))
        assert ct_id not in [c["id"] for c in (await client.get(API)).json()]

    async def test_multiple_categories(self, admin_client: AsyncClient, client: AsyncClient):
        await api_create(admin_client, name="TypeA", name_he="סוג א", category="safety")
        await api_create(admin_client, name="TypeB", name_he="סוג ב", category="mep")
        cats = {c["category"] for c in (await client.get(API)).json()}
        assert "safety" in cats and "mep" in cats


class TestGet:
    async def test_existing(self, admin_client: AsyncClient, client: AsyncClient):
        d = await api_create(admin_client, name="Specific", name_he="ספציפי")
        r = await client.get(url(d["id"]))
        assert r.status_code == 200 and r.json()["name"] == "Specific"

    async def test_all_fields(self, admin_client: AsyncClient, client: AsyncClient):
        d = await api_create(admin_client)
        for f in ("id", "name", "name_he", "category", "created_at", "updated_at"):
            assert f in (await client.get(url(d["id"]))).json()

    async def test_not_found(self, client: AsyncClient):
        r = await client.get(url(FAKE_ID))
        assert r.status_code == 404 and "not found" in r.json()["detail"].lower()

    async def test_invalid_uuid(self, client: AsyncClient):
        assert (await client.get(url("not-a-uuid"))).status_code == 422

    async def test_no_auth_required(self, admin_client: AsyncClient, client: AsyncClient):
        d = await api_create(admin_client)
        assert (await client.get(url(d["id"]))).status_code == 200

    async def test_valid_uuid_in_response(self, admin_client: AsyncClient, client: AsyncClient):
        d = await api_create(admin_client)
        uuid.UUID((await client.get(url(d["id"]))).json()["id"])

    async def test_matches_create(self, admin_client: AsyncClient, client: AsyncClient):
        c = await api_create(admin_client, name="Match", name_he="התאם")
        g = (await client.get(url(c["id"]))).json()
        assert c["id"] == g["id"] and c["name"] == g["name"] and c["category"] == g["category"]


class TestUpdate:
    async def test_returns_200(self, admin_client: AsyncClient):
        d = await api_create(admin_client)
        assert (await admin_client.put(url(d["id"]), json={"name": "Updated"})).status_code == 200

    async def test_response_fields(self, admin_client: AsyncClient):
        d = await api_create(admin_client)
        r = await admin_client.put(url(d["id"]), json={"name": "New Val"})
        for f in ("id", "name", "name_he", "category", "created_at", "updated_at"):
            assert f in r.json()

    async def test_preserves_id(self, admin_client: AsyncClient):
        d = await api_create(admin_client)
        assert (await admin_client.put(url(d["id"]), json={"name": "Keep"})).json()["id"] == d["id"]

    async def test_not_found(self, admin_client: AsyncClient):
        r = await admin_client.put(url(FAKE_ID), json={"name": "XX"})
        assert r.status_code == 404 and "not found" in r.json()["detail"].lower()

    async def test_unauthenticated(self, client: AsyncClient, db: AsyncSession):
        ct = ConsultantType(id=uuid.uuid4(), name="Auth Test", name_he="בדיקה", category="cat")
        db.add(ct)
        await db.flush()
        assert (await client.put(url(str(ct.id)), json={"name": "Hack"})).status_code in (401, 403)

    @pytest.mark.parametrize("field", ["name", "name_he", "category"])
    async def test_empty_string_rejected(self, admin_client: AsyncClient, field: str):
        d = await api_create(admin_client)
        assert (await admin_client.put(url(d["id"]), json={field: ""})).status_code == 422

    @pytest.mark.parametrize("field", ["name", "name_he", "category"])
    async def test_single_char_rejected(self, admin_client: AsyncClient, field: str):
        d = await api_create(admin_client)
        assert (await admin_client.put(url(d["id"]), json={field: "X"})).status_code == 422

    async def test_invalid_uuid(self, admin_client: AsyncClient):
        assert (await admin_client.put(url("bad"), json={"name": "XX"})).status_code == 422

    async def test_empty_body_accepted(self, admin_client: AsyncClient):
        d = await api_create(admin_client)
        assert (await admin_client.put(url(d["id"]), json={})).status_code == 200

    async def test_idempotent(self, admin_client: AsyncClient):
        d = await api_create(admin_client)
        up = {"name": d["name"], "name_he": d["name_he"], "category": d["category"]}
        r = await admin_client.put(url(d["id"]), json=up)
        assert r.status_code == 200 and r.json()["name"] == d["name"]


class TestDelete:
    async def test_existing(self, admin_client: AsyncClient):
        d = await api_create(admin_client)
        r = await admin_client.delete(url(d["id"]))
        assert r.status_code == 200 and "deleted" in r.json()["message"].lower()

    async def test_removes_from_db(self, admin_client: AsyncClient, client: AsyncClient):
        d = await api_create(admin_client)
        await admin_client.delete(url(d["id"]))
        assert (await client.get(url(d["id"]))).status_code == 404

    async def test_not_found(self, admin_client: AsyncClient):
        r = await admin_client.delete(url(FAKE_ID))
        assert r.status_code == 404 and "not found" in r.json()["detail"].lower()

    async def test_invalid_uuid(self, admin_client: AsyncClient):
        assert (await admin_client.delete(url("bad-uuid"))).status_code == 422

    async def test_unauthenticated(self, client: AsyncClient, db: AsyncSession):
        ct = ConsultantType(id=uuid.uuid4(), name="Auth Del", name_he="מחיקה", category="cat")
        db.add(ct)
        await db.flush()
        assert (await client.delete(url(str(ct.id)))).status_code in (401, 403)

    async def test_double_delete(self, admin_client: AsyncClient):
        d = await api_create(admin_client)
        assert (await admin_client.delete(url(d["id"]))).status_code == 200
        assert (await admin_client.delete(url(d["id"]))).status_code == 404

    async def test_excludes_from_list(self, admin_client: AsyncClient, client: AsyncClient):
        d = await api_create(admin_client, name="Remove Me", name_he="הסר")
        await admin_client.delete(url(d["id"]))
        assert d["id"] not in [c["id"] for c in (await client.get(API)).json()]


class TestLifecycle:
    async def test_create_get_delete(self, admin_client: AsyncClient, client: AsyncClient):
        ct_id = (await api_create(admin_client))["id"]
        assert (await client.get(url(ct_id))).status_code == 200
        assert (await admin_client.delete(url(ct_id))).status_code == 200
        assert (await client.get(url(ct_id))).status_code == 404

    async def test_create_list_delete_list(self, admin_client: AsyncClient, client: AsyncClient):
        ct_id = (await api_create(admin_client, name="Temp", name_he="זמני"))["id"]
        assert any(c["id"] == ct_id for c in (await client.get(API)).json())
        await admin_client.delete(url(ct_id))
        assert not any(c["id"] == ct_id for c in (await client.get(API)).json())

    async def test_bulk_create(self, admin_client: AsyncClient, client: AsyncClient):
        for i in range(5):
            await api_create(admin_client, name=f"Bulk {i}", name_he=f"בכמות {i}")
        assert len((await client.get(API)).json()) >= 5

    async def test_delete_preserves_others(self, admin_client: AsyncClient, client: AsyncClient):
        d1 = await api_create(admin_client, name="Keep", name_he="שמור")
        d2 = await api_create(admin_client, name="Drop", name_he="מחק")
        await admin_client.delete(url(d2["id"]))
        ids = [c["id"] for c in (await client.get(API)).json()]
        assert d1["id"] in ids and d2["id"] not in ids

    async def test_create_many_list_all(self, admin_client: AsyncClient, client: AsyncClient):
        created = {(await api_create(admin_client, name=f"I{i}", name_he=f"פ{i}"))["id"] for i in range(3)}
        listed = {c["id"] for c in (await client.get(API)).json()}
        assert created.issubset(listed)
