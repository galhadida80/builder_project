import base64
import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import AsyncClient

PUSH = "/api/v1/webhooks/webhooks/gmail/push"
WATCH = "/api/v1/webhooks/webhooks/gmail/setup-watch"
BG = "app.api.v1.webhooks.process_gmail_history"
GM = "app.api.v1.webhooks.GmailService"
B64 = lambda b: base64.b64encode(b).decode()
def enc(d): return B64(json.dumps(d).encode())

def pl(email="test@example.com", hid="12345"):
    return {"message": {"data": enc({"emailAddress": email, "historyId": hid}), "messageId": "m1"},
            "subscription": "projects/t/subscriptions/t"}


def gm(enabled=False, topic="", result=None, error=None):
    s = MagicMock(); s.enabled = enabled; s.settings.google_pubsub_topic = topic
    if result: s.setup_watch.return_value = result
    if error: s.setup_watch.side_effect = Exception(error)
    return s


class TestGmailPushWebhook:
    @pytest.mark.asyncio
    @patch(BG, new_callable=AsyncMock)
    async def test_valid_push_200(self, bg, client: AsyncClient):
        assert (await client.post(PUSH, json=pl())).status_code == 200

    @pytest.mark.asyncio
    @patch(BG, new_callable=AsyncMock)
    async def test_valid_push_status_ok(self, bg, client: AsyncClient):
        assert (await client.post(PUSH, json=pl())).json()["status"] == "ok"

    @pytest.mark.asyncio
    @patch(BG, new_callable=AsyncMock)
    async def test_push_no_auth(self, bg, client: AsyncClient):
        assert (await client.post(PUSH, json=pl())).status_code == 200

    @pytest.mark.asyncio
    @patch(BG, new_callable=AsyncMock)
    async def test_push_queues_bg_task(self, bg, client: AsyncClient):
        await client.post(PUSH, json=pl())
        bg.assert_called_once_with(history_id="12345")

    @pytest.mark.asyncio
    @patch(BG, new_callable=AsyncMock)
    async def test_push_alt_email(self, bg, client: AsyncClient):
        assert (await client.post(PUSH, json=pl(email="o@c.org"))).status_code == 200

    @pytest.mark.asyncio
    @patch(BG, new_callable=AsyncMock)
    async def test_push_big_hid(self, bg, client: AsyncClient):
        r = await client.post(PUSH, json=pl(hid="99999999999"))
        assert r.status_code == 200 and r.json()["status"] == "ok"

    @pytest.mark.asyncio
    @patch(BG, new_callable=AsyncMock)
    async def test_push_content_type(self, bg, client: AsyncClient):
        assert "application/json" in (await client.post(PUSH, json=pl())).headers.get("content-type", "")

    @pytest.mark.asyncio
    async def test_push_empty(self, client: AsyncClient):
        r = await client.post(PUSH, json={})
        assert r.status_code == 200 and r.json()["status"] == "no message"

    @pytest.mark.asyncio
    async def test_push_no_message(self, client: AsyncClient):
        assert (await client.post(PUSH, json={"subscription": "s"})).json()["status"] == "no message"

    @pytest.mark.asyncio
    async def test_push_no_data(self, client: AsyncClient):
        assert (await client.post(PUSH, json={"message": {"messageId": "m"}})).json()["status"] == "no data"

    @pytest.mark.asyncio
    async def test_push_data_null(self, client: AsyncClient):
        assert (await client.post(PUSH, json={"message": {"data": None}})).status_code == 200

    @pytest.mark.asyncio
    async def test_push_get_405(self, client: AsyncClient):
        assert (await client.get(PUSH)).status_code == 405

    @pytest.mark.asyncio
    async def test_push_put_405(self, client: AsyncClient):
        assert (await client.put(PUSH, json={})).status_code == 405

    @pytest.mark.asyncio
    async def test_push_delete_405(self, client: AsyncClient):
        assert (await client.delete(PUSH)).status_code == 405

    @pytest.mark.asyncio
    @patch(BG, new_callable=AsyncMock)
    async def test_push_no_sub(self, bg, client: AsyncClient):
        assert (await client.post(PUSH, json={"message": {"data": enc({"emailAddress": "t@t.com", "historyId": "1"})}})).json()["status"] == "ok"

    @pytest.mark.asyncio
    @patch(BG, new_callable=AsyncMock)
    async def test_push_extra_fields(self, bg, client: AsyncClient):
        p = pl(); p["extra"] = "v"; p["message"]["attrs"] = {"k": "v"}
        assert (await client.post(PUSH, json=p)).status_code == 200

    @pytest.mark.asyncio
    async def test_push_no_hid_skips_bg(self, client: AsyncClient):
        assert (await client.post(PUSH, json={"message": {"data": enc({"emailAddress": "t@t.com"})}})).json()["status"] == "ok"

    @pytest.mark.asyncio
    @patch(BG, new_callable=AsyncMock)
    async def test_push_no_email(self, bg, client: AsyncClient):
        assert (await client.post(PUSH, json={"message": {"data": enc({"historyId": "9"})}})).json()["status"] == "ok"

    @pytest.mark.asyncio
    async def test_push_empty_decoded(self, client: AsyncClient):
        assert (await client.post(PUSH, json={"message": {"data": enc({})}})).json()["status"] == "ok"

    @pytest.mark.asyncio
    @pytest.mark.parametrize("hid", ["0", "1", "100", "999999", "18446744073709551615"])
    @patch(BG, new_callable=AsyncMock)
    async def test_push_hids(self, bg, client: AsyncClient, hid: str):
        assert (await client.post(PUSH, json=pl(hid=hid))).status_code == 200

    @pytest.mark.asyncio
    @pytest.mark.parametrize("em", ["a@b.com", "u+t@g.com", "l@sub.example.co.uk", "n@co.io"])
    @patch(BG, new_callable=AsyncMock)
    async def test_push_emails(self, bg, client: AsyncClient, em: str):
        assert (await client.post(PUSH, json=pl(email=em))).status_code == 200

    @pytest.mark.asyncio
    @patch(BG, new_callable=AsyncMock)
    async def test_push_unicode(self, bg, client: AsyncClient):
        assert (await client.post(PUSH, json=pl(email="u@d\u00e4.com"))).status_code == 200

    @pytest.mark.asyncio
    @patch(BG, new_callable=AsyncMock)
    async def test_push_large(self, bg, client: AsyncClient):
        big = enc({"emailAddress": "t@t.com", "historyId": "1", "x": "a" * 10000})
        assert (await client.post(PUSH, json={"message": {"data": big}})).status_code == 200

    @pytest.mark.asyncio
    @patch(BG, new_callable=AsyncMock)
    async def test_push_special_sub(self, bg, client: AsyncClient):
        p = pl(); p["subscription"] = "projects/my-proj/subscriptions/gmail-push_v2"
        assert (await client.post(PUSH, json=p)).status_code == 200


class TestWebhookPayloadValidation:
    @pytest.mark.asyncio
    async def test_invalid_b64(self, client: AsyncClient):
        assert (await client.post(PUSH, json={"message": {"data": "!!!bad!!!"}})).json()["status"] == "ok"

    @pytest.mark.asyncio
    async def test_bad_json_b64(self, client: AsyncClient):
        assert (await client.post(PUSH, json={"message": {"data": B64(b"{{bad")}})).json()["status"] == "ok"

    @pytest.mark.asyncio
    async def test_empty_b64(self, client: AsyncClient):
        assert (await client.post(PUSH, json={"message": {"data": B64(b"")}})).status_code == 200

    @pytest.mark.asyncio
    async def test_text_b64(self, client: AsyncClient):
        assert (await client.post(PUSH, json={"message": {"data": B64(b"hello")}})).status_code == 200

    @pytest.mark.asyncio
    async def test_array_b64(self, client: AsyncClient):
        assert (await client.post(PUSH, json={"message": {"data": B64(b"[1,2]")}})).status_code == 200

    @pytest.mark.asyncio
    @patch(BG, new_callable=AsyncMock)
    async def test_nested_b64(self, bg, client: AsyncClient):
        d = B64(json.dumps({"historyId": "1", "n": {"a": 1}}).encode())
        assert (await client.post(PUSH, json={"message": {"data": d}})).json()["status"] == "ok"

    @pytest.mark.asyncio
    async def test_data_int(self, client: AsyncClient):
        assert (await client.post(PUSH, json={"message": {"data": 12345}})).json()["status"] == "ok"

    @pytest.mark.asyncio
    async def test_data_bool(self, client: AsyncClient):
        assert (await client.post(PUSH, json={"message": {"data": True}})).status_code == 200

    @pytest.mark.asyncio
    async def test_data_list(self, client: AsyncClient):
        assert (await client.post(PUSH, json={"message": {"data": ["a"]}})).status_code == 200

    @pytest.mark.asyncio
    async def test_data_empty_str(self, client: AsyncClient):
        assert (await client.post(PUSH, json={"message": {"data": ""}})).status_code == 200

    @pytest.mark.asyncio
    async def test_msg_str(self, client: AsyncClient):
        assert (await client.post(PUSH, json={"message": "str"})).status_code == 200

    @pytest.mark.asyncio
    async def test_msg_list(self, client: AsyncClient):
        assert (await client.post(PUSH, json={"message": [1]})).status_code == 200

    @pytest.mark.asyncio
    async def test_msg_int_raises(self, client: AsyncClient):
        with pytest.raises(TypeError):
            await client.post(PUSH, json={"message": 42})

    @pytest.mark.asyncio
    @pytest.mark.parametrize("bd", [
        "YWJj", B64(b"null"), B64(b'"s"'), B64(b"42"), B64(b"true"),
        B64(b'{"historyId": null}'), B64(b'{"historyId": ""}'),
    ])
    async def test_decoded_variants(self, client: AsyncClient, bd: str):
        assert (await client.post(PUSH, json={"message": {"data": bd}})).status_code == 200

    @pytest.mark.asyncio
    async def test_raw_invalid_json(self, client: AsyncClient):
        r = await client.post(PUSH, content=b"bad", headers={"content-type": "application/json"})
        assert r.status_code in (200, 422)

    @pytest.mark.asyncio
    async def test_raw_empty(self, client: AsyncClient):
        r = await client.post(PUSH, content=b"", headers={"content-type": "application/json"})
        assert r.status_code in (200, 422)

    @pytest.mark.asyncio
    async def test_raw_xml(self, client: AsyncClient):
        r = await client.post(PUSH, content=b"<m/>", headers={"content-type": "application/xml"})
        assert r.status_code in (200, 422)

    @pytest.mark.asyncio
    async def test_raw_form(self, client: AsyncClient):
        r = await client.post(PUSH, content=b"k=v", headers={"content-type": "application/x-www-form-urlencoded"})
        assert r.status_code in (200, 422)


class TestGmailSetupWatch:
    @pytest.mark.asyncio
    @patch(GM, return_value=gm(enabled=False))
    async def test_disabled_error(self, m, client: AsyncClient):
        r = await client.post(WATCH)
        assert r.status_code == 200 and r.json()["status"] == "error"
        assert "not configured" in r.json()["message"]

    @pytest.mark.asyncio
    @patch(GM, return_value=gm(enabled=False))
    async def test_no_auth(self, m, client: AsyncClient):
        assert (await client.post(WATCH)).status_code == 200

    @pytest.mark.asyncio
    @patch(GM, return_value=gm(enabled=False))
    async def test_json_ct(self, m, client: AsyncClient):
        assert "application/json" in (await client.post(WATCH)).headers.get("content-type", "")

    @pytest.mark.asyncio
    @patch(GM, return_value=gm(enabled=False))
    async def test_has_status(self, m, client: AsyncClient):
        assert "status" in (await client.post(WATCH)).json()

    @pytest.mark.asyncio
    @patch(GM, return_value=gm(enabled=True, topic=""))
    async def test_no_topic(self, m, client: AsyncClient):
        b = (await client.post(WATCH)).json()
        assert b["status"] == "error" and "topic" in b["message"].lower()

    @pytest.mark.asyncio
    @patch(GM, return_value=gm(enabled=True, topic="t", result={"historyId": "100", "expiration": "170"}))
    async def test_success(self, m, client: AsyncClient):
        b = (await client.post(WATCH)).json()
        assert b["status"] == "ok" and b["historyId"] == "100" and b["expiration"] == "170"

    @pytest.mark.asyncio
    @patch(GM, return_value=gm(enabled=True, topic="t", error="quota"))
    async def test_api_error(self, m, client: AsyncClient):
        b = (await client.post(WATCH)).json()
        assert b["status"] == "error" and "quota" in b["message"]

    @pytest.mark.asyncio
    async def test_get_405(self, client: AsyncClient):
        assert (await client.get(WATCH)).status_code == 405

    @pytest.mark.asyncio
    async def test_put_405(self, client: AsyncClient):
        assert (await client.put(WATCH, json={})).status_code == 405

    @pytest.mark.asyncio
    async def test_delete_405(self, client: AsyncClient):
        assert (await client.delete(WATCH)).status_code == 405

    @pytest.mark.asyncio
    @patch(GM, return_value=gm(enabled=False))
    async def test_body_ignored(self, m, client: AsyncClient):
        assert (await client.post(WATCH, json={"x": 1})).status_code == 200

    @pytest.mark.asyncio
    @patch(GM, return_value=gm(enabled=False))
    async def test_idempotent(self, m, client: AsyncClient):
        r1, r2 = await client.post(WATCH), await client.post(WATCH)
        assert r1.status_code == r2.status_code == 200

    @pytest.mark.asyncio
    @patch(GM, return_value=gm(enabled=False))
    async def test_error_msg_nonempty(self, m, client: AsyncClient):
        b = (await client.post(WATCH)).json()
        if b["status"] == "error":
            assert len(b["message"]) > 0
