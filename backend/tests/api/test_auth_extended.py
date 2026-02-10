import uuid
from datetime import datetime, timedelta

import pytest
from httpx import AsyncClient
from jose import jwt
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import ALGORITHM, SECRET_KEY, create_access_token

API = "/api/v1/auth"


def _reg(email="ext@test.com", password="StrongP1ss!", full_name="Extended User"):
    return {"email": email, "password": password, "full_name": full_name}


def _login(email="ext@test.com", password="StrongP1ss!"):
    return {"email": email, "password": password}


INVALID_EMAILS = [
    "plainaddress", "@no-local.com", "user@", "user@.com", "user@@double.com",
    "user @space.com", "user@ space.com", " @leading.com", "user@domain..com",
    "user@-domain.com", ".user@domain.com", "user.@domain.com", "user@domain.c",
    "user@123.123.123.123", "user@[IPv6:::1]", "a@b", "", "   ",
    "user<script>@evil.com", "user@evil.com<script>", "' OR 1=1 --@hack.com",
    "admin'; DROP TABLE users;--@x.com", "user\t@tab.com", "user\n@newline.com",
]

INVALID_PASSWORDS = [
    ("short1A", "7chars"), ("abcdefgh", "no_upper_digit"), ("ABCDEFGH", "no_lower_digit"),
    ("12345678", "no_letters"), ("abcdABCD", "no_digit"), ("abcd1234", "no_upper"),
    ("ABCD1234", "no_lower"), ("Aa1", "3chars"), ("Aa1234", "6chars"),
    ("       1A", "spaces"), ("!@#$%^&*()", "specials"), ("Aa1" + "x" * 130, "too_long"),
]

XSS_PAYLOADS = [
    '<script>alert("xss")</script>', '<img src=x onerror=alert(1)>',
    '<svg onload=alert(1)>', '<iframe src="evil.com"></iframe>',
    '<body onload=alert(1)>', '"><script>alert(document.cookie)</script>',
    "javascript:alert(1)", '<a href="javascript:alert(1)">click</a>',
    '<div style="background:url(javascript:alert(1))">', "<b>Bold</b>",
]

SQL_INJECTIONS = [
    "' OR '1'='1", "'; DROP TABLE users; --", "' UNION SELECT * FROM users --",
    "1; UPDATE users SET role='admin'", "admin'--", "' OR 1=1#",
]

UNICODE_NAMES = [
    "Jose Garcia", "Muller Strauss", "Gal Hadida",
    "Tanaka Yuki", "Ahmed Hassan", "Nguyen Van Anh",
]


class TestParametrizedInvalidEmails:
    @pytest.mark.asyncio
    @pytest.mark.parametrize("email", INVALID_EMAILS, ids=[f"e{i}" for i in range(len(INVALID_EMAILS))])
    async def test_register_rejects_invalid_email(self, client: AsyncClient, email: str):
        resp = await client.post(f"{API}/register", json=_reg(email=email))
        assert resp.status_code == 422


class TestParametrizedInvalidPasswords:
    @pytest.mark.asyncio
    @pytest.mark.parametrize("password,reason", INVALID_PASSWORDS, ids=[p[1] for p in INVALID_PASSWORDS])
    async def test_register_rejects_invalid_password(self, client: AsyncClient, password: str, reason: str):
        resp = await client.post(f"{API}/register", json=_reg(password=password))
        assert resp.status_code == 422


class TestParametrizedXSSInName:
    @pytest.mark.asyncio
    @pytest.mark.parametrize("payload", XSS_PAYLOADS, ids=[f"x{i}" for i in range(len(XSS_PAYLOADS))])
    async def test_xss_in_name_sanitized(self, client: AsyncClient, payload: str):
        resp = await client.post(f"{API}/register", json=_reg(
            email=f"xss{abs(hash(payload)) % 99999}@test.com", full_name=payload + " Valid"
        ))
        if resp.status_code == 201:
            fn = resp.json()["user"].get("fullName", "")
            for tag in ("<script>", "onerror=", "onload=", "<iframe", "<svg"):
                assert tag not in fn


class TestParametrizedSQLInjection:
    @pytest.mark.asyncio
    @pytest.mark.parametrize("sqli", SQL_INJECTIONS, ids=[f"s{i}" for i in range(len(SQL_INJECTIONS))])
    async def test_sqli_in_email_rejected(self, client: AsyncClient, sqli: str):
        resp = await client.post(f"{API}/register", json=_reg(email=sqli))
        assert resp.status_code == 422

    @pytest.mark.asyncio
    @pytest.mark.parametrize("sqli", SQL_INJECTIONS, ids=[f"sn{i}" for i in range(len(SQL_INJECTIONS))])
    async def test_sqli_in_name_handled(self, client: AsyncClient, sqli: str):
        resp = await client.post(f"{API}/register", json=_reg(
            email=f"sq{abs(hash(sqli)) % 99999}@test.com", full_name=sqli
        ))
        assert resp.status_code in (201, 422)


class TestParametrizedUnicodeNames:
    @pytest.mark.asyncio
    @pytest.mark.parametrize("name", UNICODE_NAMES, ids=[n.split()[0] for n in UNICODE_NAMES])
    async def test_unicode_name_accepted(self, client: AsyncClient, name: str):
        resp = await client.post(f"{API}/register", json=_reg(
            email=f"u{abs(hash(name)) % 99999}@test.com", full_name=name
        ))
        assert resp.status_code == 201
        assert resp.json()["user"]["fullName"] is not None


class TestNameEdgeCases:
    @pytest.mark.asyncio
    async def test_single_char_rejected(self, client: AsyncClient):
        assert (await client.post(f"{API}/register", json=_reg(full_name="A"))).status_code == 422

    @pytest.mark.asyncio
    async def test_two_chars_accepted(self, client: AsyncClient):
        assert (await client.post(f"{API}/register", json=_reg(full_name="AB"))).status_code == 201

    @pytest.mark.asyncio
    async def test_html_b_tag_sanitized(self, client: AsyncClient):
        resp = await client.post(f"{API}/register", json=_reg(full_name="<b>Bold Name</b>"))
        if resp.status_code == 201:
            assert "<b>" not in resp.json()["user"].get("fullName", "")

    @pytest.mark.asyncio
    async def test_html_anchor_sanitized(self, client: AsyncClient):
        resp = await client.post(f"{API}/register", json=_reg(full_name='<a href="x">Name</a>'))
        if resp.status_code == 201:
            assert "<a " not in resp.json()["user"].get("fullName", "")


class TestEmailCasing:
    @pytest.mark.asyncio
    async def test_uppercase_stored_lowercase(self, client: AsyncClient):
        resp = await client.post(f"{API}/register", json=_reg(email="UPPER@TEST.COM"))
        assert resp.status_code == 201
        assert resp.json()["user"]["email"] == "upper@test.com"

    @pytest.mark.asyncio
    async def test_mixed_case_stored_lowercase(self, client: AsyncClient):
        resp = await client.post(f"{API}/register", json=_reg(email="MiXeD@TeSt.CoM"))
        assert resp.status_code == 201
        assert resp.json()["user"]["email"] == "mixed@test.com"

    @pytest.mark.asyncio
    async def test_duplicate_different_casing_blocked(self, client: AsyncClient):
        await client.post(f"{API}/register", json=_reg(email="case@test.com"))
        assert (await client.post(f"{API}/register", json=_reg(email="CASE@TEST.COM"))).status_code == 400


class TestLoginEdgeCases:
    @pytest.mark.asyncio
    async def test_wrong_password(self, client: AsyncClient):
        await client.post(f"{API}/register", json=_reg())
        assert (await client.post(f"{API}/login", json=_login(password="WrongPass1"))).status_code == 401

    @pytest.mark.asyncio
    async def test_nonexistent_email(self, client: AsyncClient):
        assert (await client.post(f"{API}/login", json=_login(email="ghost@test.com"))).status_code == 401

    @pytest.mark.asyncio
    async def test_empty_body(self, client: AsyncClient):
        assert (await client.post(f"{API}/login", json={})).status_code == 422

    @pytest.mark.asyncio
    async def test_extra_fields_ignored(self, client: AsyncClient):
        await client.post(f"{API}/register", json=_reg())
        data = {**_login(), "role": "admin", "is_superuser": True}
        resp = await client.post(f"{API}/login", json=data)
        assert resp.status_code == 200
        assert resp.json()["user"]["email"] == "ext@test.com"

    @pytest.mark.asyncio
    async def test_full_flow_register_then_login(self, client: AsyncClient):
        reg = await client.post(f"{API}/register", json=_reg())
        login = await client.post(f"{API}/login", json=_login())
        assert login.status_code == 200
        assert login.json()["user"]["id"] == reg.json()["user"]["id"]

    @pytest.mark.asyncio
    async def test_email_different_casing(self, client: AsyncClient):
        await client.post(f"{API}/register", json=_reg(email="lcase@test.com"))
        assert (await client.post(f"{API}/login", json=_login(email="LCASE@TEST.COM"))).status_code == 200

    @pytest.mark.asyncio
    async def test_password_case_sensitive(self, client: AsyncClient):
        await client.post(f"{API}/register", json=_reg(password="StrongP1ss!"))
        assert (await client.post(f"{API}/login", json=_login(password="strongp1ss!"))).status_code == 401


class TestMeEndpointExtended:
    @pytest.mark.asyncio
    async def test_unauthenticated_401(self, client: AsyncClient):
        assert (await client.get(f"{API}/me")).status_code == 401

    @pytest.mark.asyncio
    async def test_with_register_token(self, client: AsyncClient):
        reg = await client.post(f"{API}/register", json=_reg())
        token = reg.json()["accessToken"]
        resp = await client.get(f"{API}/me", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200
        assert resp.json()["email"] == "ext@test.com"

    @pytest.mark.asyncio
    async def test_with_login_token(self, client: AsyncClient):
        await client.post(f"{API}/register", json=_reg())
        login = await client.post(f"{API}/login", json=_login())
        resp = await client.get(f"{API}/me", headers={"Authorization": f"Bearer {login.json()['accessToken']}"})
        assert resp.status_code == 200

    @pytest.mark.asyncio
    async def test_no_password_in_response(self, client: AsyncClient):
        reg = await client.post(f"{API}/register", json=_reg())
        resp = await client.get(f"{API}/me", headers={"Authorization": f"Bearer {reg.json()['accessToken']}"})
        body = resp.json()
        for key in ("password", "password_hash", "passwordHash"):
            assert key not in body


class TestTokenValidationExtended:
    @pytest.mark.asyncio
    async def test_expired_token(self, client: AsyncClient):
        token = jwt.encode(
            {"sub": str(uuid.uuid4()), "exp": datetime.utcnow() - timedelta(hours=1)},
            SECRET_KEY, algorithm=ALGORITHM
        )
        assert (await client.get(f"{API}/me", headers={"Authorization": f"Bearer {token}"})).status_code == 401

    @pytest.mark.asyncio
    async def test_malformed_token(self, client: AsyncClient):
        assert (await client.get(f"{API}/me", headers={"Authorization": "Bearer not.valid.jwt"})).status_code == 401

    @pytest.mark.asyncio
    async def test_wrong_secret(self, client: AsyncClient):
        token = jwt.encode(
            {"sub": str(uuid.uuid4()), "exp": datetime.utcnow() + timedelta(hours=1)},
            "wrong-secret", algorithm=ALGORITHM
        )
        assert (await client.get(f"{API}/me", headers={"Authorization": f"Bearer {token}"})).status_code == 401

    @pytest.mark.asyncio
    async def test_empty_bearer(self, client: AsyncClient):
        assert (await client.get(f"{API}/me", headers={"Authorization": "Bearer "})).status_code == 401

    @pytest.mark.asyncio
    async def test_no_bearer_prefix(self, client: AsyncClient):
        token = create_access_token(uuid.uuid4())
        assert (await client.get(f"{API}/me", headers={"Authorization": token})).status_code in (401, 403)

    @pytest.mark.asyncio
    async def test_missing_sub_claim(self, client: AsyncClient):
        token = jwt.encode({"exp": datetime.utcnow() + timedelta(hours=1)}, SECRET_KEY, algorithm=ALGORITHM)
        assert (await client.get(f"{API}/me", headers={"Authorization": f"Bearer {token}"})).status_code == 401

    @pytest.mark.asyncio
    async def test_nonexistent_user_id(self, client: AsyncClient):
        token = create_access_token(uuid.uuid4())
        assert (await client.get(f"{API}/me", headers={"Authorization": f"Bearer {token}"})).status_code == 401

    @pytest.mark.asyncio
    async def test_deactivated_user(self, client: AsyncClient, db: AsyncSession):
        reg = await client.post(f"{API}/register", json=_reg())
        token = reg.json()["accessToken"]
        from sqlalchemy import update

        from app.models.user import User
        await db.execute(update(User).where(User.email == "ext@test.com").values(is_active=False))
        await db.commit()
        assert (await client.get(f"{API}/me", headers={"Authorization": f"Bearer {token}"})).status_code == 401
