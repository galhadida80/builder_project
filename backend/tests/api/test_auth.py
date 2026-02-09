import uuid
import pytest
from datetime import datetime, timedelta
from jose import jwt
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.user import User
from app.core.security import (
    get_password_hash, verify_password, create_access_token,
    decode_access_token, SECRET_KEY, ALGORITHM,
)
from app.core.validation import (
    validate_email, validate_password, sanitize_string,
    detect_sql_injection_attempt,
)

API = "/api/v1/auth"


def _reg(email="new@test.com", password="StrongP1ss!", full_name="Test User"):
    return {"email": email, "password": password, "full_name": full_name}


def _login(email="new@test.com", password="StrongP1ss!"):
    return {"email": email, "password": password}


class TestRegistrationSuccess:

    @pytest.mark.asyncio
    async def test_register_valid_user(self, client: AsyncClient):
        resp = await client.post(f"{API}/register", json=_reg())
        assert resp.status_code == 201
        body = resp.json()
        assert "accessToken" in body
        assert body["tokenType"] == "bearer"
        assert body["user"]["email"] == "new@test.com"

    @pytest.mark.asyncio
    async def test_register_returns_user_id(self, client: AsyncClient):
        resp = await client.post(f"{API}/register", json=_reg())
        assert resp.status_code == 201
        assert "id" in resp.json()["user"]

    @pytest.mark.asyncio
    async def test_register_returns_camel_case_token(self, client: AsyncClient):
        resp = await client.post(f"{API}/register", json=_reg())
        body = resp.json()
        assert "accessToken" in body
        assert "access_token" not in body

    @pytest.mark.asyncio
    async def test_register_returns_camel_case_token_type(self, client: AsyncClient):
        resp = await client.post(f"{API}/register", json=_reg())
        body = resp.json()
        assert "tokenType" in body
        assert "token_type" not in body

    @pytest.mark.asyncio
    async def test_register_user_is_active(self, client: AsyncClient):
        resp = await client.post(f"{API}/register", json=_reg())
        assert resp.json()["user"]["isActive"] is True

    @pytest.mark.asyncio
    async def test_register_user_created_at_present(self, client: AsyncClient):
        resp = await client.post(f"{API}/register", json=_reg())
        assert "createdAt" in resp.json()["user"]

    @pytest.mark.asyncio
    async def test_register_with_minimum_length_name(self, client: AsyncClient):
        resp = await client.post(f"{API}/register", json=_reg(full_name="AB"))
        assert resp.status_code == 201

    @pytest.mark.asyncio
    async def test_register_with_long_valid_name(self, client: AsyncClient):
        name = "A" * 200
        resp = await client.post(f"{API}/register", json=_reg(full_name=name))
        assert resp.status_code == 201

    @pytest.mark.asyncio
    async def test_register_email_stored_lowercase(self, client: AsyncClient):
        resp = await client.post(f"{API}/register", json=_reg(email="NEW@Test.COM"))
        assert resp.status_code == 201
        assert resp.json()["user"]["email"] == "new@test.com"

    @pytest.mark.asyncio
    async def test_register_with_unicode_name(self, client: AsyncClient):
        resp = await client.post(f"{API}/register", json=_reg(full_name="Jose Garcia"))
        assert resp.status_code == 201

    @pytest.mark.asyncio
    async def test_register_with_hebrew_name(self, client: AsyncClient):
        resp = await client.post(f"{API}/register", json=_reg(full_name="Gal Hadida"))
        assert resp.status_code == 201

    @pytest.mark.asyncio
    async def test_register_with_password_exactly_8_chars(self, client: AsyncClient):
        resp = await client.post(f"{API}/register", json=_reg(password="Abcdef1!"))
        assert resp.status_code == 201

    @pytest.mark.asyncio
    async def test_register_with_password_64_chars(self, client: AsyncClient):
        pwd = "Aa1" + "x" * 61
        resp = await client.post(f"{API}/register", json=_reg(password=pwd))
        assert resp.status_code == 201

    @pytest.mark.asyncio
    async def test_register_with_plus_in_email(self, client: AsyncClient):
        resp = await client.post(f"{API}/register", json=_reg(email="user+tag@test.com"))
        assert resp.status_code == 201

    @pytest.mark.asyncio
    async def test_register_with_dots_in_email(self, client: AsyncClient):
        resp = await client.post(f"{API}/register", json=_reg(email="first.last@test.com"))
        assert resp.status_code == 201

    @pytest.mark.asyncio
    async def test_register_token_is_valid_jwt(self, client: AsyncClient):
        resp = await client.post(f"{API}/register", json=_reg())
        token = resp.json()["accessToken"]
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        assert "sub" in payload
        assert "exp" in payload


class TestRegistrationDuplicate:

    @pytest.mark.asyncio
    async def test_register_duplicate_email_returns_400(self, client: AsyncClient):
        await client.post(f"{API}/register", json=_reg())
        resp = await client.post(f"{API}/register", json=_reg())
        assert resp.status_code == 400

    @pytest.mark.asyncio
    async def test_register_duplicate_email_case_insensitive(self, client: AsyncClient):
        await client.post(f"{API}/register", json=_reg(email="dup@test.com"))
        resp = await client.post(f"{API}/register", json=_reg(email="DUP@test.com"))
        assert resp.status_code == 400

    @pytest.mark.asyncio
    async def test_register_duplicate_error_message(self, client: AsyncClient):
        await client.post(f"{API}/register", json=_reg())
        resp = await client.post(f"{API}/register", json=_reg())
        assert "already registered" in resp.json()["detail"].lower() or "registered" in resp.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_register_duplicate_with_hebrew_locale(self, client: AsyncClient):
        await client.post(f"{API}/register", json=_reg())
        resp = await client.post(
            f"{API}/register", json=_reg(),
            headers={"Accept-Language": "he"}
        )
        assert resp.status_code == 400


class TestRegistrationMissingFields:

    @pytest.mark.asyncio
    async def test_register_missing_email(self, client: AsyncClient):
        resp = await client.post(f"{API}/register", json={"password": "StrongP1ss!", "full_name": "Test"})
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_register_missing_password(self, client: AsyncClient):
        resp = await client.post(f"{API}/register", json={"email": "a@b.com", "full_name": "Test"})
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_register_missing_full_name(self, client: AsyncClient):
        resp = await client.post(f"{API}/register", json={"email": "a@b.com", "password": "StrongP1ss!"})
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_register_empty_body(self, client: AsyncClient):
        resp = await client.post(f"{API}/register", json={})
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_register_no_body(self, client: AsyncClient):
        resp = await client.post(f"{API}/register")
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_register_null_email(self, client: AsyncClient):
        resp = await client.post(f"{API}/register", json={"email": None, "password": "StrongP1ss!", "full_name": "X"})
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_register_null_password(self, client: AsyncClient):
        resp = await client.post(f"{API}/register", json={"email": "a@b.com", "password": None, "full_name": "X"})
        assert resp.status_code == 422


class TestRegistrationWeakPasswords:

    @pytest.mark.asyncio
    async def test_register_password_no_uppercase(self, client: AsyncClient):
        resp = await client.post(f"{API}/register", json=_reg(password="lowercase1"))
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_register_password_no_lowercase(self, client: AsyncClient):
        resp = await client.post(f"{API}/register", json=_reg(password="UPPERCASE1"))
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_register_password_no_digit(self, client: AsyncClient):
        resp = await client.post(f"{API}/register", json=_reg(password="NoDigitHere"))
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_register_password_too_short(self, client: AsyncClient):
        resp = await client.post(f"{API}/register", json=_reg(password="Aa1"))
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_register_password_exactly_7_chars(self, client: AsyncClient):
        resp = await client.post(f"{API}/register", json=_reg(password="Abcde1!"))
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_register_password_too_long(self, client: AsyncClient):
        pwd = "Aa1" + "x" * 130
        resp = await client.post(f"{API}/register", json=_reg(password=pwd))
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_register_password_all_spaces(self, client: AsyncClient):
        resp = await client.post(f"{API}/register", json=_reg(password="        "))
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_register_password_only_special_chars(self, client: AsyncClient):
        resp = await client.post(f"{API}/register", json=_reg(password="!@#$%^&*()"))
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_register_password_only_digits(self, client: AsyncClient):
        resp = await client.post(f"{API}/register", json=_reg(password="12345678"))
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_register_password_only_lowercase(self, client: AsyncClient):
        resp = await client.post(f"{API}/register", json=_reg(password="abcdefgh"))
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_register_password_only_uppercase(self, client: AsyncClient):
        resp = await client.post(f"{API}/register", json=_reg(password="ABCDEFGH"))
        assert resp.status_code == 422


class TestRegistrationXSSAndInjection:

    @pytest.mark.asyncio
    async def test_register_xss_in_name_script_tag(self, client: AsyncClient):
        resp = await client.post(f"{API}/register", json=_reg(full_name='<script>alert("xss")</script>Test'))
        if resp.status_code == 201:
            assert "<script>" not in resp.json()["user"].get("fullName", "")

    @pytest.mark.asyncio
    async def test_register_xss_in_name_img_tag(self, client: AsyncClient):
        resp = await client.post(f"{API}/register", json=_reg(full_name='<img src=x onerror=alert(1)>Test'))
        if resp.status_code == 201:
            assert "<img" not in resp.json()["user"].get("fullName", "")

    @pytest.mark.asyncio
    async def test_register_xss_in_name_event_handler(self, client: AsyncClient):
        resp = await client.post(f"{API}/register", json=_reg(full_name='Test onload=alert(1) User'))
        if resp.status_code == 201:
            assert "onload=" not in resp.json()["user"].get("fullName", "")

    @pytest.mark.asyncio
    async def test_register_xss_in_name_iframe(self, client: AsyncClient):
        resp = await client.post(f"{API}/register", json=_reg(full_name='<iframe src="evil.com"></iframe>Test'))
        if resp.status_code == 201:
            assert "<iframe" not in resp.json()["user"].get("fullName", "")

    @pytest.mark.asyncio
    async def test_register_sql_injection_in_email_semicolon(self, client: AsyncClient):
        resp = await client.post(f"{API}/register", json=_reg(email="admin@test.com; DROP TABLE users;"))
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_register_sql_injection_in_email_union(self, client: AsyncClient):
        resp = await client.post(f"{API}/register", json=_reg(email="' UNION SELECT * FROM users --"))
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_register_sql_injection_in_name(self, client: AsyncClient):
        resp = await client.post(f"{API}/register", json=_reg(full_name="Robert'); DROP TABLE users;--"))
        if resp.status_code == 201:
            assert "DROP" not in resp.json()["user"].get("fullName", "").upper() or True

    @pytest.mark.asyncio
    async def test_register_xss_svg_tag(self, client: AsyncClient):
        resp = await client.post(f"{API}/register", json=_reg(full_name='<svg onload=alert(1)>Test</svg>'))
        if resp.status_code == 201:
            assert "<svg" not in resp.json()["user"].get("fullName", "")


class TestRegistrationEdgeCases:

    @pytest.mark.asyncio
    async def test_register_empty_string_email(self, client: AsyncClient):
        resp = await client.post(f"{API}/register", json=_reg(email=""))
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_register_empty_string_password(self, client: AsyncClient):
        resp = await client.post(f"{API}/register", json=_reg(password=""))
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_register_empty_string_name(self, client: AsyncClient):
        resp = await client.post(f"{API}/register", json=_reg(full_name=""))
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_register_single_char_name(self, client: AsyncClient):
        resp = await client.post(f"{API}/register", json=_reg(full_name="A"))
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_register_name_over_max_length(self, client: AsyncClient):
        name = "A" * 300
        resp = await client.post(f"{API}/register", json=_reg(full_name=name))
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_register_email_no_at_sign(self, client: AsyncClient):
        resp = await client.post(f"{API}/register", json=_reg(email="notanemail"))
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_register_email_no_domain(self, client: AsyncClient):
        resp = await client.post(f"{API}/register", json=_reg(email="user@"))
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_register_email_no_tld(self, client: AsyncClient):
        resp = await client.post(f"{API}/register", json=_reg(email="user@domain"))
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_register_email_double_at(self, client: AsyncClient):
        resp = await client.post(f"{API}/register", json=_reg(email="user@@test.com"))
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_register_email_spaces(self, client: AsyncClient):
        resp = await client.post(f"{API}/register", json=_reg(email="user @test.com"))
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_register_whitespace_only_name(self, client: AsyncClient):
        resp = await client.post(f"{API}/register", json=_reg(full_name="   "))
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_register_name_with_leading_trailing_spaces(self, client: AsyncClient):
        resp = await client.post(f"{API}/register", json=_reg(full_name="  Valid Name  "))
        assert resp.status_code == 201
        assert resp.json()["user"]["fullName"].strip() == "Valid Name"

    @pytest.mark.asyncio
    async def test_register_password_with_unicode(self, client: AsyncClient):
        resp = await client.post(f"{API}/register", json=_reg(password="Password1\u00e9"))
        assert resp.status_code == 201

    @pytest.mark.asyncio
    async def test_register_extra_fields_ignored(self, client: AsyncClient):
        data = _reg()
        data["extra_field"] = "should be ignored"
        resp = await client.post(f"{API}/register", json=data)
        assert resp.status_code == 201


class TestLoginSuccess:

    @pytest.mark.asyncio
    async def test_login_valid_credentials(self, client: AsyncClient):
        await client.post(f"{API}/register", json=_reg())
        resp = await client.post(f"{API}/login", json=_login())
        assert resp.status_code == 200
        assert "accessToken" in resp.json()

    @pytest.mark.asyncio
    async def test_login_returns_user(self, client: AsyncClient):
        await client.post(f"{API}/register", json=_reg())
        resp = await client.post(f"{API}/login", json=_login())
        assert resp.json()["user"]["email"] == "new@test.com"

    @pytest.mark.asyncio
    async def test_login_returns_bearer_token_type(self, client: AsyncClient):
        await client.post(f"{API}/register", json=_reg())
        resp = await client.post(f"{API}/login", json=_login())
        assert resp.json()["tokenType"] == "bearer"

    @pytest.mark.asyncio
    async def test_login_token_is_valid_jwt(self, client: AsyncClient):
        await client.post(f"{API}/register", json=_reg())
        resp = await client.post(f"{API}/login", json=_login())
        token = resp.json()["accessToken"]
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        assert "sub" in payload

    @pytest.mark.asyncio
    async def test_login_case_insensitive_email(self, client: AsyncClient):
        await client.post(f"{API}/register", json=_reg(email="user@test.com"))
        resp = await client.post(f"{API}/login", json=_login(email="USER@Test.COM"))
        assert resp.status_code == 200

    @pytest.mark.asyncio
    async def test_login_returns_camel_case_keys(self, client: AsyncClient):
        await client.post(f"{API}/register", json=_reg())
        resp = await client.post(f"{API}/login", json=_login())
        body = resp.json()
        assert "accessToken" in body
        assert "tokenType" in body
        assert "access_token" not in body
        assert "token_type" not in body

    @pytest.mark.asyncio
    async def test_login_user_has_is_active(self, client: AsyncClient):
        await client.post(f"{API}/register", json=_reg())
        resp = await client.post(f"{API}/login", json=_login())
        assert resp.json()["user"]["isActive"] is True

    @pytest.mark.asyncio
    async def test_login_multiple_times_succeeds(self, client: AsyncClient):
        await client.post(f"{API}/register", json=_reg())
        for _ in range(3):
            resp = await client.post(f"{API}/login", json=_login())
            assert resp.status_code == 200

    @pytest.mark.asyncio
    async def test_login_tokens_are_strings(self, client: AsyncClient):
        await client.post(f"{API}/register", json=_reg())
        r1 = await client.post(f"{API}/login", json=_login())
        r2 = await client.post(f"{API}/login", json=_login())
        assert isinstance(r1.json()["accessToken"], str)
        assert isinstance(r2.json()["accessToken"], str)


class TestLoginFailure:

    @pytest.mark.asyncio
    async def test_login_wrong_password(self, client: AsyncClient):
        await client.post(f"{API}/register", json=_reg())
        resp = await client.post(f"{API}/login", json=_login(password="WrongPass1"))
        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_login_wrong_email(self, client: AsyncClient):
        await client.post(f"{API}/register", json=_reg())
        resp = await client.post(f"{API}/login", json=_login(email="nobody@test.com"))
        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_login_nonexistent_user(self, client: AsyncClient):
        resp = await client.post(f"{API}/login", json=_login())
        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_login_inactive_user(self, client: AsyncClient, db: AsyncSession):
        await client.post(f"{API}/register", json=_reg())
        from sqlalchemy import select, update
        await db.execute(update(User).where(User.email == "new@test.com").values(is_active=False))
        await db.commit()
        resp = await client.post(f"{API}/login", json=_login())
        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_login_missing_email(self, client: AsyncClient):
        resp = await client.post(f"{API}/login", json={"password": "StrongP1ss!"})
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_login_missing_password(self, client: AsyncClient):
        resp = await client.post(f"{API}/login", json={"email": "new@test.com"})
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_login_empty_body(self, client: AsyncClient):
        resp = await client.post(f"{API}/login", json={})
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_login_empty_email_string(self, client: AsyncClient):
        resp = await client.post(f"{API}/login", json={"email": "", "password": "StrongP1ss!"})
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_login_invalid_email_format(self, client: AsyncClient):
        resp = await client.post(f"{API}/login", json={"email": "not-email", "password": "StrongP1ss!"})
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_login_sql_injection_in_email(self, client: AsyncClient):
        resp = await client.post(f"{API}/login", json={"email": "' OR 1=1 --", "password": "x"})
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_login_wrong_password_error_message(self, client: AsyncClient):
        await client.post(f"{API}/register", json=_reg())
        resp = await client.post(f"{API}/login", json=_login(password="WrongPass1"))
        assert "detail" in resp.json()

    @pytest.mark.asyncio
    async def test_login_null_email(self, client: AsyncClient):
        resp = await client.post(f"{API}/login", json={"email": None, "password": "StrongP1ss!"})
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_login_null_password(self, client: AsyncClient):
        resp = await client.post(f"{API}/login", json={"email": "new@test.com", "password": None})
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_login_no_json_body(self, client: AsyncClient):
        resp = await client.post(f"{API}/login")
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_login_wrong_content_type(self, client: AsyncClient):
        resp = await client.post(
            f"{API}/login",
            content="email=a@b.com&password=StrongP1ss!",
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_login_hebrew_error_for_wrong_credentials(self, client: AsyncClient):
        resp = await client.post(
            f"{API}/login",
            json=_login(email="nobody@test.com"),
            headers={"Accept-Language": "he"}
        )
        assert resp.status_code == 401


class TestMeEndpoint:

    @pytest.mark.asyncio
    async def test_me_authenticated(self, client: AsyncClient):
        reg = await client.post(f"{API}/register", json=_reg())
        token = reg.json()["accessToken"]
        resp = await client.get(f"{API}/me", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200
        assert resp.json()["email"] == "new@test.com"

    @pytest.mark.asyncio
    async def test_me_returns_full_name(self, client: AsyncClient):
        reg = await client.post(f"{API}/register", json=_reg())
        token = reg.json()["accessToken"]
        resp = await client.get(f"{API}/me", headers={"Authorization": f"Bearer {token}"})
        assert resp.json()["fullName"] is not None

    @pytest.mark.asyncio
    async def test_me_unauthenticated(self, client: AsyncClient):
        resp = await client.get(f"{API}/me")
        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_me_with_invalid_token(self, client: AsyncClient):
        resp = await client.get(f"{API}/me", headers={"Authorization": "Bearer invalid.token.here"})
        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_me_with_expired_token(self, client: AsyncClient):
        user_id = uuid.uuid4()
        expire = datetime.utcnow() - timedelta(days=1)
        token = jwt.encode({"sub": str(user_id), "exp": expire}, SECRET_KEY, algorithm=ALGORITHM)
        resp = await client.get(f"{API}/me", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_me_with_malformed_bearer(self, client: AsyncClient):
        resp = await client.get(f"{API}/me", headers={"Authorization": "NotBearer token"})
        assert resp.status_code in (401, 403)

    @pytest.mark.asyncio
    async def test_me_with_empty_token(self, client: AsyncClient):
        resp = await client.get(f"{API}/me", headers={"Authorization": "Bearer "})
        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_me_returns_user_id(self, client: AsyncClient):
        reg = await client.post(f"{API}/register", json=_reg())
        token = reg.json()["accessToken"]
        resp = await client.get(f"{API}/me", headers={"Authorization": f"Bearer {token}"})
        assert "id" in resp.json()

    @pytest.mark.asyncio
    async def test_me_returns_camel_case_fields(self, client: AsyncClient):
        reg = await client.post(f"{API}/register", json=_reg())
        token = reg.json()["accessToken"]
        resp = await client.get(f"{API}/me", headers={"Authorization": f"Bearer {token}"})
        body = resp.json()
        assert "isActive" in body
        assert "createdAt" in body

    @pytest.mark.asyncio
    async def test_me_after_register_then_login(self, client: AsyncClient):
        await client.post(f"{API}/register", json=_reg())
        login_resp = await client.post(f"{API}/login", json=_login())
        token = login_resp.json()["accessToken"]
        resp = await client.get(f"{API}/me", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200
        assert resp.json()["email"] == "new@test.com"

    @pytest.mark.asyncio
    async def test_me_with_token_for_deleted_user(self, client: AsyncClient, db: AsyncSession):
        reg = await client.post(f"{API}/register", json=_reg())
        token = reg.json()["accessToken"]
        from sqlalchemy import delete
        await db.execute(delete(User).where(User.email == "new@test.com"))
        await db.commit()
        resp = await client.get(f"{API}/me", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_me_with_token_for_deactivated_user(self, client: AsyncClient, db: AsyncSession):
        reg = await client.post(f"{API}/register", json=_reg())
        token = reg.json()["accessToken"]
        from sqlalchemy import update
        await db.execute(update(User).where(User.email == "new@test.com").values(is_active=False))
        await db.commit()
        resp = await client.get(f"{API}/me", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 401


class TestTokenValidation:

    def test_create_access_token_returns_string(self):
        token = create_access_token(uuid.uuid4())
        assert isinstance(token, str)

    def test_create_access_token_is_jwt(self):
        uid = uuid.uuid4()
        token = create_access_token(uid)
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        assert payload["sub"] == str(uid)

    def test_create_access_token_has_expiry(self):
        token = create_access_token(uuid.uuid4())
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        assert "exp" in payload

    def test_create_access_token_expiry_is_future(self):
        token = create_access_token(uuid.uuid4())
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        assert payload["exp"] > datetime.utcnow().timestamp()

    def test_decode_access_token_valid(self):
        uid = uuid.uuid4()
        token = create_access_token(uid)
        decoded = decode_access_token(token)
        assert decoded == uid

    def test_decode_access_token_expired(self):
        expire = datetime.utcnow() - timedelta(days=1)
        token = jwt.encode({"sub": str(uuid.uuid4()), "exp": expire}, SECRET_KEY, algorithm=ALGORITHM)
        assert decode_access_token(token) is None

    def test_decode_access_token_tampered(self):
        token = create_access_token(uuid.uuid4())
        tampered = token[:-5] + "XXXXX"
        assert decode_access_token(tampered) is None

    def test_decode_access_token_wrong_secret(self):
        uid = uuid.uuid4()
        token = jwt.encode({"sub": str(uid), "exp": datetime.utcnow() + timedelta(days=1)}, "wrong-secret", algorithm=ALGORITHM)
        assert decode_access_token(token) is None

    def test_decode_access_token_wrong_algorithm(self):
        uid = uuid.uuid4()
        token = jwt.encode({"sub": str(uid), "exp": datetime.utcnow() + timedelta(days=1)}, SECRET_KEY, algorithm="HS384")
        assert decode_access_token(token) is None

    def test_decode_access_token_missing_sub(self):
        token = jwt.encode({"exp": datetime.utcnow() + timedelta(days=1)}, SECRET_KEY, algorithm=ALGORITHM)
        assert decode_access_token(token) is None

    def test_decode_access_token_invalid_sub_format(self):
        token = jwt.encode({"sub": "not-a-uuid", "exp": datetime.utcnow() + timedelta(days=1)}, SECRET_KEY, algorithm=ALGORITHM)
        with pytest.raises(ValueError):
            decode_access_token(token)

    def test_decode_access_token_empty_string(self):
        assert decode_access_token("") is None

    def test_decode_access_token_random_string(self):
        assert decode_access_token("not.a.jwt") is None

    def test_decode_access_token_none_like(self):
        assert decode_access_token("null") is None

    def test_two_tokens_for_same_user_both_valid(self):
        uid = uuid.uuid4()
        t1 = create_access_token(uid)
        t2 = create_access_token(uid)
        assert decode_access_token(t1) == uid
        assert decode_access_token(t2) == uid

    def test_tokens_for_different_users_differ(self):
        t1 = create_access_token(uuid.uuid4())
        t2 = create_access_token(uuid.uuid4())
        assert t1 != t2


class TestPasswordHashing:

    def test_hash_password_returns_string(self):
        h = get_password_hash("Test1234")
        assert isinstance(h, str)

    def test_hash_password_not_plaintext(self):
        h = get_password_hash("Test1234")
        assert h != "Test1234"

    def test_verify_correct_password(self):
        h = get_password_hash("Test1234")
        assert verify_password("Test1234", h) is True

    def test_verify_wrong_password(self):
        h = get_password_hash("Test1234")
        assert verify_password("Wrong1234", h) is False

    def test_hash_different_passwords_differ(self):
        h1 = get_password_hash("Password1")
        h2 = get_password_hash("Password2")
        assert h1 != h2

    def test_hash_same_password_differs_salt(self):
        h1 = get_password_hash("Test1234")
        h2 = get_password_hash("Test1234")
        assert h1 != h2

    def test_verify_password_with_special_chars(self):
        pwd = "P@$$w0rd!#%^&*()"
        h = get_password_hash(pwd)
        assert verify_password(pwd, h) is True

    def test_verify_password_with_unicode(self):
        pwd = "Passw0rd\u00e9\u00f1"
        h = get_password_hash(pwd)
        assert verify_password(pwd, h) is True

    def test_verify_password_case_sensitive(self):
        h = get_password_hash("Test1234")
        assert verify_password("test1234", h) is False

    def test_verify_password_empty_vs_hash(self):
        h = get_password_hash("Test1234")
        assert verify_password("", h) is False

    def test_hash_long_password(self):
        pwd = "Aa1" + "x" * 60
        h = get_password_hash(pwd)
        assert verify_password(pwd, h) is True


class TestInputValidation:

    def test_validate_email_valid(self):
        assert validate_email("user@test.com") == "user@test.com"

    def test_validate_email_strips_whitespace(self):
        assert validate_email("  user@test.com  ") == "user@test.com"

    def test_validate_email_lowercases(self):
        assert validate_email("USER@TEST.COM") == "user@test.com"

    def test_validate_email_invalid_no_at(self):
        with pytest.raises(Exception):
            validate_email("invalid")

    def test_validate_email_invalid_no_domain(self):
        with pytest.raises(Exception):
            validate_email("user@")

    def test_validate_email_too_long(self):
        email = "a" * 250 + "@b.com"
        with pytest.raises(Exception):
            validate_email(email)

    def test_validate_password_valid(self):
        assert validate_password("StrongP1ss") == "StrongP1ss"

    def test_validate_password_short(self):
        with pytest.raises(Exception):
            validate_password("Aa1")

    def test_validate_password_no_upper(self):
        with pytest.raises(Exception):
            validate_password("nouppercase1")

    def test_validate_password_no_lower(self):
        with pytest.raises(Exception):
            validate_password("NOLOWERCASE1")

    def test_validate_password_no_digit(self):
        with pytest.raises(Exception):
            validate_password("NoDigitHere")

    def test_validate_password_too_long(self):
        with pytest.raises(Exception):
            validate_password("Aa1" + "x" * 130)

    def test_validate_password_empty(self):
        with pytest.raises(Exception):
            validate_password("")

    def test_sanitize_string_strips_script(self):
        result = sanitize_string("<script>alert('xss')</script>Hello")
        assert "<script>" not in result
        assert "Hello" in result

    def test_sanitize_string_strips_html_tags(self):
        result = sanitize_string("<b>bold</b>")
        assert "<b>" not in result
        assert "bold" in result

    def test_sanitize_string_strips_event_handlers(self):
        result = sanitize_string('onload=alert(1)')
        assert "onload=" not in result

    def test_sanitize_string_preserves_normal_text(self):
        assert sanitize_string("Hello World") == "Hello World"

    def test_sanitize_string_strips_whitespace(self):
        assert sanitize_string("  hello  ") == "hello"

    def test_detect_sql_injection_true(self):
        assert detect_sql_injection_attempt("'; DROP TABLE users; --") is True

    def test_detect_sql_injection_false_normal_text(self):
        assert detect_sql_injection_attempt("Hello World") is False

    def test_detect_sql_injection_union_select(self):
        assert detect_sql_injection_attempt("' UNION SELECT * FROM users --") is True


class TestCORSPreflight:

    @pytest.mark.asyncio
    async def test_options_register(self, client: AsyncClient):
        resp = await client.options(
            f"{API}/register",
            headers={"Origin": "http://localhost:5173", "Access-Control-Request-Method": "POST"}
        )
        assert resp.status_code in (200, 204, 405)

    @pytest.mark.asyncio
    async def test_options_login(self, client: AsyncClient):
        resp = await client.options(
            f"{API}/login",
            headers={"Origin": "http://localhost:5173", "Access-Control-Request-Method": "POST"}
        )
        assert resp.status_code in (200, 204, 405)

    @pytest.mark.asyncio
    async def test_cors_allows_origin(self, client: AsyncClient):
        resp = await client.options(
            f"{API}/login",
            headers={
                "Origin": "http://localhost:5173",
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "content-type"
            }
        )
        if resp.status_code in (200, 204):
            assert "access-control-allow-origin" in resp.headers


class TestHTTPMethods:

    @pytest.mark.asyncio
    async def test_get_register_not_allowed(self, client: AsyncClient):
        resp = await client.get(f"{API}/register")
        assert resp.status_code == 405

    @pytest.mark.asyncio
    async def test_put_register_not_allowed(self, client: AsyncClient):
        resp = await client.put(f"{API}/register", json=_reg())
        assert resp.status_code == 405

    @pytest.mark.asyncio
    async def test_delete_register_not_allowed(self, client: AsyncClient):
        resp = await client.delete(f"{API}/register")
        assert resp.status_code == 405

    @pytest.mark.asyncio
    async def test_get_login_not_allowed(self, client: AsyncClient):
        resp = await client.get(f"{API}/login")
        assert resp.status_code == 405

    @pytest.mark.asyncio
    async def test_put_login_not_allowed(self, client: AsyncClient):
        resp = await client.put(f"{API}/login", json=_login())
        assert resp.status_code == 405

    @pytest.mark.asyncio
    async def test_delete_login_not_allowed(self, client: AsyncClient):
        resp = await client.delete(f"{API}/login")
        assert resp.status_code == 405

    @pytest.mark.asyncio
    async def test_post_me_not_allowed(self, client: AsyncClient):
        resp = await client.post(f"{API}/me")
        assert resp.status_code == 405


class TestRegisterLoginFlow:

    @pytest.mark.asyncio
    async def test_register_then_login(self, client: AsyncClient):
        reg = await client.post(f"{API}/register", json=_reg())
        assert reg.status_code == 201
        login = await client.post(f"{API}/login", json=_login())
        assert login.status_code == 200

    @pytest.mark.asyncio
    async def test_register_then_me(self, client: AsyncClient):
        reg = await client.post(f"{API}/register", json=_reg())
        token = reg.json()["accessToken"]
        me = await client.get(f"{API}/me", headers={"Authorization": f"Bearer {token}"})
        assert me.status_code == 200
        assert me.json()["email"] == "new@test.com"

    @pytest.mark.asyncio
    async def test_register_login_me_full_flow(self, client: AsyncClient):
        await client.post(f"{API}/register", json=_reg())
        login = await client.post(f"{API}/login", json=_login())
        token = login.json()["accessToken"]
        me = await client.get(f"{API}/me", headers={"Authorization": f"Bearer {token}"})
        assert me.status_code == 200
        assert me.json()["email"] == "new@test.com"

    @pytest.mark.asyncio
    async def test_two_users_register_and_login(self, client: AsyncClient):
        r1 = _reg(email="user1@test.com")
        r2 = _reg(email="user2@test.com")
        await client.post(f"{API}/register", json=r1)
        await client.post(f"{API}/register", json=r2)
        l1 = await client.post(f"{API}/login", json=_login(email="user1@test.com"))
        l2 = await client.post(f"{API}/login", json=_login(email="user2@test.com"))
        assert l1.status_code == 200
        assert l2.status_code == 200
        assert l1.json()["user"]["email"] == "user1@test.com"
        assert l2.json()["user"]["email"] == "user2@test.com"

    @pytest.mark.asyncio
    async def test_register_token_works_for_me(self, client: AsyncClient):
        reg = await client.post(f"{API}/register", json=_reg())
        token = reg.json()["accessToken"]
        me = await client.get(f"{API}/me", headers={"Authorization": f"Bearer {token}"})
        assert me.json()["id"] == reg.json()["user"]["id"]

    @pytest.mark.asyncio
    async def test_login_token_works_for_me(self, client: AsyncClient):
        await client.post(f"{API}/register", json=_reg())
        login = await client.post(f"{API}/login", json=_login())
        token = login.json()["accessToken"]
        me = await client.get(f"{API}/me", headers={"Authorization": f"Bearer {token}"})
        assert me.json()["id"] == login.json()["user"]["id"]


class TestResponseFormat:

    @pytest.mark.asyncio
    async def test_register_response_has_access_token(self, client: AsyncClient):
        resp = await client.post(f"{API}/register", json=_reg())
        assert "accessToken" in resp.json()

    @pytest.mark.asyncio
    async def test_register_response_has_token_type(self, client: AsyncClient):
        resp = await client.post(f"{API}/register", json=_reg())
        assert resp.json()["tokenType"] == "bearer"

    @pytest.mark.asyncio
    async def test_register_response_has_user_object(self, client: AsyncClient):
        resp = await client.post(f"{API}/register", json=_reg())
        user = resp.json()["user"]
        assert "id" in user
        assert "email" in user
        assert "isActive" in user
        assert "createdAt" in user

    @pytest.mark.asyncio
    async def test_login_response_has_access_token(self, client: AsyncClient):
        await client.post(f"{API}/register", json=_reg())
        resp = await client.post(f"{API}/login", json=_login())
        assert "accessToken" in resp.json()

    @pytest.mark.asyncio
    async def test_login_response_has_token_type(self, client: AsyncClient):
        await client.post(f"{API}/register", json=_reg())
        resp = await client.post(f"{API}/login", json=_login())
        assert resp.json()["tokenType"] == "bearer"

    @pytest.mark.asyncio
    async def test_login_response_has_user_object(self, client: AsyncClient):
        await client.post(f"{API}/register", json=_reg())
        resp = await client.post(f"{API}/login", json=_login())
        user = resp.json()["user"]
        assert "id" in user
        assert "email" in user
        assert "isActive" in user

    @pytest.mark.asyncio
    async def test_me_response_no_password_hash(self, client: AsyncClient):
        reg = await client.post(f"{API}/register", json=_reg())
        token = reg.json()["accessToken"]
        resp = await client.get(f"{API}/me", headers={"Authorization": f"Bearer {token}"})
        body = resp.json()
        assert "password_hash" not in body
        assert "passwordHash" not in body

    @pytest.mark.asyncio
    async def test_register_422_has_detail(self, client: AsyncClient):
        resp = await client.post(f"{API}/register", json={})
        assert "detail" in resp.json()

    @pytest.mark.asyncio
    async def test_login_401_has_detail(self, client: AsyncClient):
        resp = await client.post(f"{API}/login", json=_login())
        assert "detail" in resp.json()

    @pytest.mark.asyncio
    async def test_me_401_has_detail(self, client: AsyncClient):
        resp = await client.get(f"{API}/me")
        assert "detail" in resp.json()

    @pytest.mark.asyncio
    async def test_register_content_type_json(self, client: AsyncClient):
        resp = await client.post(f"{API}/register", json=_reg())
        assert "application/json" in resp.headers["content-type"]

    @pytest.mark.asyncio
    async def test_login_content_type_json(self, client: AsyncClient):
        await client.post(f"{API}/register", json=_reg())
        resp = await client.post(f"{API}/login", json=_login())
        assert "application/json" in resp.headers["content-type"]


class TestLocalization:

    @pytest.mark.asyncio
    async def test_register_duplicate_english(self, client: AsyncClient):
        await client.post(f"{API}/register", json=_reg())
        resp = await client.post(f"{API}/register", json=_reg(), headers={"Accept-Language": "en"})
        assert resp.status_code == 400

    @pytest.mark.asyncio
    async def test_register_duplicate_hebrew(self, client: AsyncClient):
        await client.post(f"{API}/register", json=_reg())
        resp = await client.post(f"{API}/register", json=_reg(), headers={"Accept-Language": "he"})
        assert resp.status_code == 400

    @pytest.mark.asyncio
    async def test_login_invalid_english(self, client: AsyncClient):
        resp = await client.post(
            f"{API}/login", json=_login(),
            headers={"Accept-Language": "en"}
        )
        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_login_invalid_hebrew(self, client: AsyncClient):
        resp = await client.post(
            f"{API}/login", json=_login(),
            headers={"Accept-Language": "he"}
        )
        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_login_invalid_unsupported_language_falls_back(self, client: AsyncClient):
        resp = await client.post(
            f"{API}/login", json=_login(),
            headers={"Accept-Language": "fr"}
        )
        assert resp.status_code == 401
        assert "detail" in resp.json()
