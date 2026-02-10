import uuid
from datetime import datetime, timedelta

import pytest
from jose import jwt

from app.core.csrf import CSRFTokenManager
from app.core.security import (
    ACCESS_TOKEN_EXPIRE_DAYS,
    ALGORITHM,
    SECRET_KEY,
    create_access_token,
    decode_access_token,
    get_password_hash,
    verify_password,
)


class TestGetPasswordHash:

    def test_returns_string(self):
        result = get_password_hash("MyPassword1")
        assert isinstance(result, str)

    def test_not_equal_to_plaintext(self):
        password = "SecurePass123"
        hashed = get_password_hash(password)
        assert hashed != password

    def test_different_hashes_for_same_password(self):
        password = "SamePassword1"
        hash1 = get_password_hash(password)
        hash2 = get_password_hash(password)
        assert hash1 != hash2

    def test_hash_starts_with_bcrypt_prefix(self):
        hashed = get_password_hash("TestPass1")
        assert hashed.startswith("$2")

    def test_hash_has_correct_length(self):
        hashed = get_password_hash("TestPass1")
        assert len(hashed) == 60

    def test_hash_empty_password(self):
        hashed = get_password_hash("")
        assert isinstance(hashed, str)
        assert len(hashed) == 60

    def test_hash_unicode_password(self):
        hashed = get_password_hash("Pässw0rd")
        assert isinstance(hashed, str)
        assert hashed.startswith("$2")

    def test_hash_long_password(self):
        password = "A" * 72
        hashed = get_password_hash(password)
        assert isinstance(hashed, str)

    def test_hash_special_characters(self):
        hashed = get_password_hash("P@ss!w0rd#$%^&*()")
        assert isinstance(hashed, str)
        assert hashed.startswith("$2")

    def test_hash_with_spaces(self):
        hashed = get_password_hash("pass word 123")
        assert isinstance(hashed, str)

    def test_hash_with_newlines(self):
        hashed = get_password_hash("pass\nword")
        assert isinstance(hashed, str)

    def test_hash_contains_dollar_signs(self):
        hashed = get_password_hash("test")
        assert hashed.count("$") >= 3

    def test_hash_single_char(self):
        hashed = get_password_hash("x")
        assert isinstance(hashed, str)
        assert len(hashed) == 60

    def test_hash_tab_character(self):
        hashed = get_password_hash("pass\tword")
        assert isinstance(hashed, str)

    def test_hash_is_decodable_utf8(self):
        hashed = get_password_hash("test123")
        hashed.encode("utf-8")

    def test_hash_different_passwords_produce_different_hashes(self):
        h1 = get_password_hash("PasswordA1")
        h2 = get_password_hash("PasswordB1")
        assert h1 != h2

    def test_hash_numeric_string(self):
        hashed = get_password_hash("9876543210")
        assert isinstance(hashed, str)
        assert len(hashed) == 60


class TestVerifyPassword:

    def test_correct_password_returns_true(self):
        password = "CorrectPass1"
        hashed = get_password_hash(password)
        assert verify_password(password, hashed) is True

    def test_wrong_password_returns_false(self):
        hashed = get_password_hash("CorrectPass1")
        assert verify_password("WrongPass1", hashed) is False

    def test_empty_password_against_empty_hash(self):
        hashed = get_password_hash("")
        assert verify_password("", hashed) is True

    def test_empty_password_against_real_hash(self):
        hashed = get_password_hash("RealPass1")
        assert verify_password("", hashed) is False

    def test_unicode_password(self):
        password = "Pässwörd1"
        hashed = get_password_hash(password)
        assert verify_password(password, hashed) is True

    def test_unicode_password_wrong(self):
        hashed = get_password_hash("Pässwörd1")
        assert verify_password("Passwörd1", hashed) is False

    def test_long_password(self):
        password = "Aa1" + "x" * 69
        hashed = get_password_hash(password)
        assert verify_password(password, hashed) is True

    def test_case_sensitive(self):
        hashed = get_password_hash("Password1")
        assert verify_password("password1", hashed) is False

    def test_trailing_space_matters(self):
        hashed = get_password_hash("Password1")
        assert verify_password("Password1 ", hashed) is False

    def test_leading_space_matters(self):
        hashed = get_password_hash("Password1")
        assert verify_password(" Password1", hashed) is False

    def test_special_characters_password(self):
        password = "P@$$w0rd!#%"
        hashed = get_password_hash(password)
        assert verify_password(password, hashed) is True

    def test_numeric_only_password(self):
        password = "12345678"
        hashed = get_password_hash(password)
        assert verify_password(password, hashed) is True

    def test_verify_against_different_hash_of_same_password(self):
        password = "SamePass1"
        hash1 = get_password_hash(password)
        hash2 = get_password_hash(password)
        assert hash1 != hash2
        assert verify_password(password, hash1) is True
        assert verify_password(password, hash2) is True

    def test_hebrew_password(self):
        password = "סיסמה123Ab"
        hashed = get_password_hash(password)
        assert verify_password(password, hashed) is True

    def test_similar_passwords_not_interchangeable(self):
        hashed = get_password_hash("Password1")
        assert verify_password("Password2", hashed) is False

    def test_password_with_null_byte(self):
        password = "pass\x00word"
        hashed = get_password_hash(password)
        assert verify_password(password, hashed) is True

    def test_password_with_tab(self):
        password = "Pass\tw0rd"
        hashed = get_password_hash(password)
        assert verify_password(password, hashed) is True

    def test_all_special_chars(self):
        password = "!@#$%^&*()_+-=[]{}|;':\",./<>?"
        hashed = get_password_hash(password)
        assert verify_password(password, hashed) is True

    def test_password_swap_case_fails(self):
        hashed = get_password_hash("AbCdEf1")
        assert verify_password("aBcDeF1", hashed) is False

    def test_multiple_verify_calls_same_hash(self):
        password = "MultiVerify1"
        hashed = get_password_hash(password)
        for _ in range(5):
            assert verify_password(password, hashed) is True

    def test_wrong_password_multiple_times(self):
        hashed = get_password_hash("RealPass1")
        for wrong in ["Wrong1Pass", "BadPass1", "NoMatch1", "Fail1Here"]:
            assert verify_password(wrong, hashed) is False


class TestCreateAccessToken:

    def test_returns_string(self):
        user_id = uuid.uuid4()
        token = create_access_token(user_id)
        assert isinstance(token, str)

    def test_returns_non_empty(self):
        user_id = uuid.uuid4()
        token = create_access_token(user_id)
        assert len(token) > 0

    def test_token_is_valid_jwt(self):
        user_id = uuid.uuid4()
        token = create_access_token(user_id)
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        assert payload is not None

    def test_token_contains_sub_with_user_id(self):
        user_id = uuid.uuid4()
        token = create_access_token(user_id)
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        assert payload["sub"] == str(user_id)

    def test_token_contains_exp(self):
        user_id = uuid.uuid4()
        token = create_access_token(user_id)
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        assert "exp" in payload

    def test_token_expiry_is_in_future(self):
        user_id = uuid.uuid4()
        token = create_access_token(user_id)
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        exp = datetime.utcfromtimestamp(payload["exp"])
        assert exp > datetime.utcnow()

    def test_token_expiry_approximately_7_days(self):
        user_id = uuid.uuid4()
        token = create_access_token(user_id)
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        exp = datetime.utcfromtimestamp(payload["exp"])
        expected = datetime.utcnow() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
        diff = abs((exp - expected).total_seconds())
        assert diff < 5

    def test_different_users_get_different_tokens(self):
        user1 = uuid.uuid4()
        user2 = uuid.uuid4()
        token1 = create_access_token(user1)
        token2 = create_access_token(user2)
        assert token1 != token2

    def test_same_user_same_second_gets_same_token(self):
        user_id = uuid.uuid4()
        token1 = create_access_token(user_id)
        token2 = create_access_token(user_id)
        assert token1 == token2

    def test_token_has_three_parts(self):
        user_id = uuid.uuid4()
        token = create_access_token(user_id)
        parts = token.split(".")
        assert len(parts) == 3

    def test_token_algorithm_is_hs256(self):
        assert ALGORITHM == "HS256"

    def test_access_token_expire_days_is_7(self):
        assert ACCESS_TOKEN_EXPIRE_DAYS == 7

    def test_token_payload_only_has_sub_and_exp(self):
        user_id = uuid.uuid4()
        token = create_access_token(user_id)
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        assert set(payload.keys()) == {"sub", "exp"}

    def test_token_sub_is_string_uuid(self):
        user_id = uuid.uuid4()
        token = create_access_token(user_id)
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        parsed = uuid.UUID(payload["sub"])
        assert parsed == user_id

    def test_token_exp_is_integer(self):
        user_id = uuid.uuid4()
        token = create_access_token(user_id)
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        assert isinstance(payload["exp"], int)

    def test_create_multiple_tokens_for_different_users(self):
        tokens = {}
        for _ in range(10):
            uid = uuid.uuid4()
            tokens[uid] = create_access_token(uid)
        assert len(set(tokens.values())) == 10

    def test_token_header_has_alg_field(self):
        user_id = uuid.uuid4()
        token = create_access_token(user_id)
        header = jwt.get_unverified_header(token)
        assert "alg" in header

    def test_token_decodable_without_verification(self):
        user_id = uuid.uuid4()
        token = create_access_token(user_id)
        payload = jwt.get_unverified_claims(token)
        assert payload["sub"] == str(user_id)


class TestDecodeAccessToken:

    def test_valid_token_returns_uuid(self):
        user_id = uuid.uuid4()
        token = create_access_token(user_id)
        result = decode_access_token(token)
        assert result == user_id

    def test_valid_token_returns_uuid_type(self):
        user_id = uuid.uuid4()
        token = create_access_token(user_id)
        result = decode_access_token(token)
        assert isinstance(result, uuid.UUID)

    def test_expired_token_returns_none(self):
        user_id = uuid.uuid4()
        past = datetime.utcnow() - timedelta(hours=1)
        payload = {"sub": str(user_id), "exp": past}
        token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
        result = decode_access_token(token)
        assert result is None

    def test_tampered_payload_returns_none(self):
        user_id = uuid.uuid4()
        token = create_access_token(user_id)
        parts = token.split(".")
        tampered = parts[0] + "." + "xxxxxx" + "." + parts[2]
        result = decode_access_token(tampered)
        assert result is None

    def test_wrong_secret_returns_none(self):
        user_id = uuid.uuid4()
        payload = {"sub": str(user_id), "exp": datetime.utcnow() + timedelta(days=1)}
        token = jwt.encode(payload, "wrong-secret-key", algorithm=ALGORITHM)
        result = decode_access_token(token)
        assert result is None

    def test_missing_sub_returns_none(self):
        payload = {"exp": datetime.utcnow() + timedelta(days=1)}
        token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
        result = decode_access_token(token)
        assert result is None

    def test_invalid_format_returns_none(self):
        result = decode_access_token("not.a.valid.token")
        assert result is None

    def test_empty_string_returns_none(self):
        result = decode_access_token("")
        assert result is None

    def test_random_string_returns_none(self):
        result = decode_access_token("randomgarbage")
        assert result is None

    def test_none_sub_value_returns_none(self):
        payload = {"sub": None, "exp": datetime.utcnow() + timedelta(days=1)}
        token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
        result = decode_access_token(token)
        assert result is None

    def test_invalid_uuid_in_sub_raises_error(self):
        payload = {"sub": "not-a-uuid", "exp": datetime.utcnow() + timedelta(days=1)}
        token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
        with pytest.raises(ValueError):
            decode_access_token(token)

    def test_token_just_expired(self):
        user_id = uuid.uuid4()
        just_expired = datetime.utcnow() - timedelta(seconds=1)
        payload = {"sub": str(user_id), "exp": just_expired}
        token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
        result = decode_access_token(token)
        assert result is None

    def test_token_expiring_far_future(self):
        user_id = uuid.uuid4()
        far_future = datetime.utcnow() + timedelta(days=365)
        payload = {"sub": str(user_id), "exp": far_future}
        token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
        result = decode_access_token(token)
        assert result == user_id

    def test_extra_claims_ignored(self):
        user_id = uuid.uuid4()
        payload = {
            "sub": str(user_id),
            "exp": datetime.utcnow() + timedelta(days=1),
            "role": "admin",
            "email": "test@example.com",
        }
        token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
        result = decode_access_token(token)
        assert result == user_id

    def test_decode_roundtrip_multiple_users(self):
        for _ in range(10):
            user_id = uuid.uuid4()
            token = create_access_token(user_id)
            result = decode_access_token(token)
            assert result == user_id

    def test_token_with_different_algorithm_returns_none(self):
        user_id = uuid.uuid4()
        payload = {"sub": str(user_id), "exp": datetime.utcnow() + timedelta(days=1)}
        token = jwt.encode(payload, SECRET_KEY, algorithm="HS384")
        result = decode_access_token(token)
        assert result is None

    def test_integer_sub_returns_none(self):
        payload = {"sub": 12345, "exp": datetime.utcnow() + timedelta(days=1)}
        token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
        result = decode_access_token(token)
        assert result is None

    def test_empty_sub_string_raises_error(self):
        payload = {"sub": "", "exp": datetime.utcnow() + timedelta(days=1)}
        token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
        with pytest.raises(ValueError):
            decode_access_token(token)

    def test_float_sub_returns_none(self):
        payload = {"sub": 3.14, "exp": datetime.utcnow() + timedelta(days=1)}
        token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
        result = decode_access_token(token)
        assert result is None

    def test_boolean_sub_returns_none(self):
        payload = {"sub": True, "exp": datetime.utcnow() + timedelta(days=1)}
        token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
        result = decode_access_token(token)
        assert result is None

    def test_token_with_no_exp_still_decodes(self):
        user_id = uuid.uuid4()
        payload = {"sub": str(user_id)}
        token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
        result = decode_access_token(token)
        assert result == user_id

    def test_two_dots_only_returns_none(self):
        result = decode_access_token("..")
        assert result is None

    def test_valid_header_invalid_payload_returns_none(self):
        import base64
        header = base64.urlsafe_b64encode(b'{"alg":"HS256","typ":"JWT"}').rstrip(b"=").decode()
        bad_payload = base64.urlsafe_b64encode(b'{"invalid"}').rstrip(b"=").decode()
        bad_sig = "badsig"
        token = f"{header}.{bad_payload}.{bad_sig}"
        result = decode_access_token(token)
        assert result is None

    def test_expired_by_one_minute(self):
        user_id = uuid.uuid4()
        expired = datetime.utcnow() - timedelta(minutes=1)
        payload = {"sub": str(user_id), "exp": expired}
        token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
        result = decode_access_token(token)
        assert result is None

    def test_token_expiring_in_one_second(self):
        user_id = uuid.uuid4()
        soon = datetime.utcnow() + timedelta(seconds=30)
        payload = {"sub": str(user_id), "exp": soon}
        token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
        result = decode_access_token(token)
        assert result == user_id

    def test_decode_preserves_uuid_version(self):
        user_id = uuid.uuid4()
        assert user_id.version == 4
        token = create_access_token(user_id)
        decoded = decode_access_token(token)
        assert decoded.version == 4


class TestJWTAlgorithm:

    def test_algorithm_constant_is_hs256(self):
        assert ALGORITHM == "HS256"

    def test_secret_key_is_not_empty(self):
        assert SECRET_KEY is not None
        assert len(SECRET_KEY) > 0

    def test_token_uses_hs256(self):
        user_id = uuid.uuid4()
        token = create_access_token(user_id)
        header = jwt.get_unverified_header(token)
        assert header["alg"] == "HS256"

    def test_token_type_is_jwt(self):
        user_id = uuid.uuid4()
        token = create_access_token(user_id)
        header = jwt.get_unverified_header(token)
        assert header.get("typ", "JWT") == "JWT"

    def test_secret_key_from_settings(self):
        from app.config import get_settings
        settings = get_settings()
        assert SECRET_KEY == settings.secret_key

    def test_decode_with_wrong_algorithm_list(self):
        user_id = uuid.uuid4()
        token = create_access_token(user_id)
        with pytest.raises(Exception):
            jwt.decode(token, SECRET_KEY, algorithms=["HS384"])

    def test_unverified_header_readable(self):
        user_id = uuid.uuid4()
        token = create_access_token(user_id)
        header = jwt.get_unverified_header(token)
        assert isinstance(header, dict)

    def test_token_parts_are_base64(self):
        import base64
        user_id = uuid.uuid4()
        token = create_access_token(user_id)
        parts = token.split(".")
        for part in parts:
            padded = part + "=" * (4 - len(part) % 4)
            decoded = base64.urlsafe_b64decode(padded)
            assert len(decoded) > 0


class TestCSRFTokenGenerate:

    def test_generate_returns_string(self):
        manager = CSRFTokenManager()
        token = manager.generate_token("user-1")
        assert isinstance(token, str)

    def test_generate_non_empty(self):
        manager = CSRFTokenManager()
        token = manager.generate_token("user-1")
        assert len(token) > 0

    def test_generate_unique_tokens(self):
        manager = CSRFTokenManager()
        tokens = {manager.generate_token("user-1") for _ in range(100)}
        assert len(tokens) == 100

    def test_generate_stores_token(self):
        manager = CSRFTokenManager()
        token = manager.generate_token("user-1")
        assert len(manager.token_store) == 1

    def test_generate_stores_user_id(self):
        manager = CSRFTokenManager()
        manager.generate_token("user-1")
        stored = list(manager.token_store.values())[0]
        assert stored["user_id"] == "user-1"

    def test_generate_stores_created_at(self):
        manager = CSRFTokenManager()
        manager.generate_token("user-1")
        stored = list(manager.token_store.values())[0]
        assert "created_at" in stored
        assert isinstance(stored["created_at"], datetime)

    def test_generate_stores_expires_at(self):
        manager = CSRFTokenManager()
        manager.generate_token("user-1")
        stored = list(manager.token_store.values())[0]
        assert "expires_at" in stored
        assert stored["expires_at"] > stored["created_at"]

    def test_generate_multiple_for_same_user(self):
        manager = CSRFTokenManager()
        t1 = manager.generate_token("user-1")
        t2 = manager.generate_token("user-1")
        assert t1 != t2
        assert len(manager.token_store) == 2

    def test_custom_lifetime(self):
        manager = CSRFTokenManager(token_lifetime_hours=1)
        manager.generate_token("user-1")
        stored = list(manager.token_store.values())[0]
        diff = stored["expires_at"] - stored["created_at"]
        assert abs(diff.total_seconds() - 3600) < 2

    def test_generate_token_length_min_40_chars(self):
        manager = CSRFTokenManager()
        token = manager.generate_token("user-1")
        assert len(token) >= 40

    def test_generate_token_url_safe(self):
        manager = CSRFTokenManager()
        token = manager.generate_token("user-1")
        safe_chars = set("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_=")
        assert all(c in safe_chars for c in token)

    def test_generate_for_different_users(self):
        manager = CSRFTokenManager()
        t1 = manager.generate_token("alice")
        t2 = manager.generate_token("bob")
        assert t1 != t2
        assert len(manager.token_store) == 2

    def test_generate_stores_hash_not_raw_token(self):
        manager = CSRFTokenManager()
        token = manager.generate_token("user-1")
        assert token not in manager.token_store

    def test_default_lifetime_is_24_hours(self):
        manager = CSRFTokenManager()
        manager.generate_token("user-1")
        stored = list(manager.token_store.values())[0]
        diff = stored["expires_at"] - stored["created_at"]
        assert abs(diff.total_seconds() - 86400) < 2

    def test_generate_48_hour_lifetime(self):
        manager = CSRFTokenManager(token_lifetime_hours=48)
        manager.generate_token("user-1")
        stored = list(manager.token_store.values())[0]
        diff = stored["expires_at"] - stored["created_at"]
        assert abs(diff.total_seconds() - 172800) < 2

    def test_generate_with_empty_user_id(self):
        manager = CSRFTokenManager()
        token = manager.generate_token("")
        assert isinstance(token, str)
        stored = list(manager.token_store.values())[0]
        assert stored["user_id"] == ""

    def test_generate_with_uuid_user_id(self):
        manager = CSRFTokenManager()
        uid = str(uuid.uuid4())
        token = manager.generate_token(uid)
        stored = list(manager.token_store.values())[0]
        assert stored["user_id"] == uid


class TestCSRFTokenValidate:

    def test_valid_token_returns_true(self):
        manager = CSRFTokenManager()
        token = manager.generate_token("user-1")
        assert manager.validate_token(token, "user-1") is True

    def test_wrong_user_returns_false(self):
        manager = CSRFTokenManager()
        token = manager.generate_token("user-1")
        assert manager.validate_token(token, "user-2") is False

    def test_invalid_token_returns_false(self):
        manager = CSRFTokenManager()
        manager.generate_token("user-1")
        assert manager.validate_token("fake-token", "user-1") is False

    def test_token_not_consumed_after_validate(self):
        manager = CSRFTokenManager()
        token = manager.generate_token("user-1")
        manager.validate_token(token, "user-1")
        assert manager.validate_token(token, "user-1") is True

    def test_expired_token_returns_false(self):
        manager = CSRFTokenManager(token_lifetime_hours=0)
        token = manager.generate_token("user-1")
        token_hash = list(manager.token_store.keys())[0]
        manager.token_store[token_hash]["expires_at"] = datetime.utcnow() - timedelta(seconds=1)
        assert manager.validate_token(token, "user-1") is False

    def test_expired_token_removed_from_store(self):
        manager = CSRFTokenManager(token_lifetime_hours=0)
        token = manager.generate_token("user-1")
        token_hash = list(manager.token_store.keys())[0]
        manager.token_store[token_hash]["expires_at"] = datetime.utcnow() - timedelta(seconds=1)
        manager.validate_token(token, "user-1")
        assert len(manager.token_store) == 0

    def test_empty_token_returns_false(self):
        manager = CSRFTokenManager()
        manager.generate_token("user-1")
        assert manager.validate_token("", "user-1") is False

    def test_validate_nonexistent_user(self):
        manager = CSRFTokenManager()
        token = manager.generate_token("user-1")
        assert manager.validate_token(token, "nonexistent") is False

    def test_validate_multiple_times_succeeds(self):
        manager = CSRFTokenManager()
        token = manager.generate_token("user-1")
        for _ in range(10):
            assert manager.validate_token(token, "user-1") is True

    def test_validate_preserves_store_size(self):
        manager = CSRFTokenManager()
        token = manager.generate_token("user-1")
        manager.validate_token(token, "user-1")
        assert len(manager.token_store) == 1

    def test_validate_token_from_different_manager(self):
        manager1 = CSRFTokenManager()
        manager2 = CSRFTokenManager()
        token = manager1.generate_token("user-1")
        assert manager2.validate_token(token, "user-1") is False

    def test_validate_with_uuid_user_id(self):
        manager = CSRFTokenManager()
        uid = str(uuid.uuid4())
        token = manager.generate_token(uid)
        assert manager.validate_token(token, uid) is True

    def test_validate_user_id_case_sensitive(self):
        manager = CSRFTokenManager()
        token = manager.generate_token("User-1")
        assert manager.validate_token(token, "user-1") is False

    def test_validate_token_with_whitespace_user_fails(self):
        manager = CSRFTokenManager()
        token = manager.generate_token("user-1")
        assert manager.validate_token(token, " user-1") is False


class TestCSRFTokenConsume:

    def test_consume_valid_token_returns_true(self):
        manager = CSRFTokenManager()
        token = manager.generate_token("user-1")
        assert manager.consume_token(token, "user-1") is True

    def test_consume_removes_token(self):
        manager = CSRFTokenManager()
        token = manager.generate_token("user-1")
        manager.consume_token(token, "user-1")
        assert len(manager.token_store) == 0

    def test_consume_same_token_twice_fails(self):
        manager = CSRFTokenManager()
        token = manager.generate_token("user-1")
        assert manager.consume_token(token, "user-1") is True
        assert manager.consume_token(token, "user-1") is False

    def test_consume_wrong_user_returns_false(self):
        manager = CSRFTokenManager()
        token = manager.generate_token("user-1")
        assert manager.consume_token(token, "user-2") is False

    def test_consume_invalid_token_returns_false(self):
        manager = CSRFTokenManager()
        assert manager.consume_token("fake-token", "user-1") is False

    def test_consume_expired_token_returns_false(self):
        manager = CSRFTokenManager()
        token = manager.generate_token("user-1")
        token_hash = list(manager.token_store.keys())[0]
        manager.token_store[token_hash]["expires_at"] = datetime.utcnow() - timedelta(seconds=1)
        assert manager.consume_token(token, "user-1") is False

    def test_consume_does_not_affect_other_tokens(self):
        manager = CSRFTokenManager()
        token1 = manager.generate_token("user-1")
        token2 = manager.generate_token("user-1")
        manager.consume_token(token1, "user-1")
        assert manager.validate_token(token2, "user-1") is True

    def test_consume_preserves_store_count(self):
        manager = CSRFTokenManager()
        manager.generate_token("user-1")
        token2 = manager.generate_token("user-2")
        manager.generate_token("user-3")
        manager.consume_token(token2, "user-2")
        assert len(manager.token_store) == 2

    def test_consume_wrong_user_preserves_token(self):
        manager = CSRFTokenManager()
        token = manager.generate_token("user-1")
        manager.consume_token(token, "user-2")
        assert len(manager.token_store) == 1
        assert manager.validate_token(token, "user-1") is True

    def test_consume_then_validate_fails(self):
        manager = CSRFTokenManager()
        token = manager.generate_token("user-1")
        manager.consume_token(token, "user-1")
        assert manager.validate_token(token, "user-1") is False

    def test_consume_empty_store(self):
        manager = CSRFTokenManager()
        assert manager.consume_token("any-token", "user-1") is False

    def test_consume_all_tokens_one_by_one(self):
        manager = CSRFTokenManager()
        tokens = [manager.generate_token(f"user-{i}") for i in range(5)]
        for i, token in enumerate(tokens):
            assert manager.consume_token(token, f"user-{i}") is True
        assert len(manager.token_store) == 0


class TestCSRFTokenCleanup:

    def test_cleanup_removes_expired_tokens(self):
        manager = CSRFTokenManager()
        manager.generate_token("user-1")
        token_hash = list(manager.token_store.keys())[0]
        manager.token_store[token_hash]["expires_at"] = datetime.utcnow() - timedelta(seconds=1)
        manager.cleanup_expired_tokens()
        assert len(manager.token_store) == 0

    def test_cleanup_keeps_valid_tokens(self):
        manager = CSRFTokenManager()
        manager.generate_token("user-1")
        manager.cleanup_expired_tokens()
        assert len(manager.token_store) == 1

    def test_cleanup_mixed_expired_and_valid(self):
        manager = CSRFTokenManager()
        manager.generate_token("user-1")
        manager.generate_token("user-2")
        expired_hash = list(manager.token_store.keys())[0]
        manager.token_store[expired_hash]["expires_at"] = datetime.utcnow() - timedelta(hours=1)
        manager.cleanup_expired_tokens()
        assert len(manager.token_store) == 1

    def test_cleanup_empty_store(self):
        manager = CSRFTokenManager()
        manager.cleanup_expired_tokens()
        assert len(manager.token_store) == 0

    def test_cleanup_all_expired(self):
        manager = CSRFTokenManager()
        for i in range(5):
            manager.generate_token(f"user-{i}")
        for token_hash in manager.token_store:
            manager.token_store[token_hash]["expires_at"] = datetime.utcnow() - timedelta(seconds=1)
        manager.cleanup_expired_tokens()
        assert len(manager.token_store) == 0

    def test_cleanup_none_expired(self):
        manager = CSRFTokenManager()
        for i in range(5):
            manager.generate_token(f"user-{i}")
        manager.cleanup_expired_tokens()
        assert len(manager.token_store) == 5

    def test_cleanup_idempotent(self):
        manager = CSRFTokenManager()
        manager.generate_token("user-1")
        token_hash = list(manager.token_store.keys())[0]
        manager.token_store[token_hash]["expires_at"] = datetime.utcnow() - timedelta(seconds=1)
        manager.cleanup_expired_tokens()
        manager.cleanup_expired_tokens()
        assert len(manager.token_store) == 0
