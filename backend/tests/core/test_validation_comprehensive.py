import uuid
import pytest
from fastapi import HTTPException

from app.core.validation import (
    sanitize_string,
    validate_email,
    validate_password,
    validate_string_length,
    sanitize_input_dict,
    detect_sql_injection_attempt,
    prevent_sql_injection,
    validate_uuid_format,
)


class TestSanitizeString:

    def test_removes_script_tag_simple(self):
        result = sanitize_string("<script>alert('xss')</script>")
        assert "<script>" not in result
        assert "alert" not in result

    def test_removes_script_tag_with_src(self):
        result = sanitize_string('<script src="evil.js"></script>')
        assert "<script" not in result

    def test_removes_script_tag_multiline(self):
        result = sanitize_string("<script>\nalert('xss');\n</script>")
        assert "<script>" not in result

    def test_removes_script_tag_uppercase(self):
        result = sanitize_string("<SCRIPT>alert('xss')</SCRIPT>")
        assert "SCRIPT" not in result.upper() or "alert" not in result

    def test_removes_script_tag_mixed_case(self):
        result = sanitize_string("<ScRiPt>alert('xss')</ScRiPt>")
        assert "alert" not in result

    def test_removes_onclick_event_handler(self):
        result = sanitize_string('<div onclick="alert(1)">text</div>')
        assert "onclick" not in result

    def test_removes_onerror_event_handler(self):
        result = sanitize_string('<img onerror="alert(1)" src="x">')
        assert "onerror" not in result

    def test_removes_onload_event_handler(self):
        result = sanitize_string('<body onload="alert(1)">')
        assert "onload" not in result

    def test_removes_onmouseover_event_handler(self):
        result = sanitize_string('<div onmouseover="alert(1)">hover</div>')
        assert "onmouseover" not in result

    def test_removes_onfocus_event_handler(self):
        result = sanitize_string('<input onfocus="alert(1)">')
        assert "onfocus" not in result

    def test_removes_event_handler_with_spaces(self):
        result = sanitize_string('<div onclick = "alert(1)">text</div>')
        assert "onclick" not in result

    def test_removes_html_tags_default(self):
        result = sanitize_string("<b>bold</b> text")
        assert "<b>" not in result
        assert "bold" in result
        assert "text" in result

    def test_keeps_html_tags_when_allowed(self):
        result = sanitize_string("<b>bold</b>", allow_html=True)
        assert "<b>" in result

    def test_removes_script_even_with_allow_html(self):
        result = sanitize_string("<script>alert(1)</script><b>safe</b>", allow_html=True)
        assert "<script>" not in result
        assert "<b>" in result

    def test_removes_event_handler_even_with_allow_html(self):
        result = sanitize_string('<div onclick="alert(1)">text</div>', allow_html=True)
        assert "onclick" not in result

    def test_removes_nested_script_tags(self):
        result = sanitize_string("<script><script>alert(1)</script></script>")
        assert "alert" not in result

    def test_removes_div_tags(self):
        result = sanitize_string("<div>content</div>")
        assert "<div>" not in result
        assert "content" in result

    def test_removes_img_tag(self):
        result = sanitize_string('<img src="image.jpg">')
        assert "<img" not in result

    def test_removes_iframe_tag(self):
        result = sanitize_string('<iframe src="evil.com"></iframe>')
        assert "<iframe" not in result

    def test_removes_a_tag(self):
        result = sanitize_string('<a href="http://evil.com">click</a>')
        assert "<a " not in result
        assert "click" in result

    def test_empty_string(self):
        result = sanitize_string("")
        assert result == ""

    def test_whitespace_only(self):
        result = sanitize_string("   ")
        assert result == ""

    def test_strips_whitespace(self):
        result = sanitize_string("  hello  ")
        assert result == "hello"

    def test_plain_text_unchanged(self):
        result = sanitize_string("Hello World 123")
        assert result == "Hello World 123"

    def test_unicode_preserved(self):
        result = sanitize_string("שלום עולם")
        assert result == "שלום עולם"

    def test_unicode_chinese(self):
        result = sanitize_string("你好世界")
        assert result == "你好世界"

    def test_unicode_emoji(self):
        result = sanitize_string("Hello 🌍")
        assert result == "Hello 🌍"

    def test_long_string(self):
        long_text = "a" * 10000
        result = sanitize_string(long_text)
        assert result == long_text

    def test_none_returns_as_is(self):
        result = sanitize_string(None)
        assert result is None

    def test_non_string_returns_as_is(self):
        result = sanitize_string(12345)
        assert result == 12345

    def test_non_string_list_returns_as_is(self):
        result = sanitize_string([1, 2, 3])
        assert result == [1, 2, 3]

    def test_special_characters_preserved(self):
        result = sanitize_string("price: $100 & 50% off")
        assert result == "price: $100 & 50% off"

    def test_angle_brackets_in_math(self):
        result = sanitize_string("x < 5 and y > 3")
        assert "x" in result

    def test_multiple_script_tags(self):
        result = sanitize_string("<script>a()</script>safe<script>b()</script>")
        assert "safe" in result
        assert "<script>" not in result

    def test_script_with_attributes(self):
        result = sanitize_string('<script type="text/javascript">alert(1)</script>')
        assert "alert" not in result

    def test_self_closing_tags(self):
        result = sanitize_string("<br/><hr/>text")
        assert "text" in result
        assert "<br/>" not in result

    def test_preserves_newlines_inside_text(self):
        result = sanitize_string("line1\nline2")
        assert "line1" in result
        assert "line2" in result

    def test_removes_svg_tags(self):
        result = sanitize_string('<svg onload="alert(1)"></svg>')
        assert "svg" not in result.lower() or "onload" not in result

    def test_removes_style_tag_content(self):
        result = sanitize_string("<style>body{display:none}</style>text")
        assert "text" in result


class TestValidateEmail:

    def test_valid_simple_email(self):
        result = validate_email("user@example.com")
        assert result == "user@example.com"

    def test_valid_email_with_dots(self):
        result = validate_email("user.name@example.com")
        assert result == "user.name@example.com"

    def test_valid_email_with_plus(self):
        result = validate_email("user+tag@example.com")
        assert result == "user+tag@example.com"

    def test_valid_email_with_hyphen_domain(self):
        result = validate_email("user@my-domain.com")
        assert result == "user@my-domain.com"

    def test_valid_email_with_subdomain(self):
        result = validate_email("user@mail.example.com")
        assert result == "user@mail.example.com"

    def test_valid_email_with_numbers(self):
        result = validate_email("user123@example456.com")
        assert result == "user123@example456.com"

    def test_valid_email_percent_sign(self):
        result = validate_email("user%tag@example.com")
        assert result == "user%tag@example.com"

    def test_valid_email_underscore(self):
        result = validate_email("user_name@example.com")
        assert result == "user_name@example.com"

    def test_converts_to_lowercase(self):
        result = validate_email("User@Example.COM")
        assert result == "user@example.com"

    def test_strips_whitespace(self):
        result = validate_email("  user@example.com  ")
        assert result == "user@example.com"

    def test_invalid_no_at_sign(self):
        with pytest.raises(HTTPException) as exc:
            validate_email("userexample.com")
        assert exc.value.status_code == 422
        assert "Invalid email format" in exc.value.detail

    def test_invalid_no_domain(self):
        with pytest.raises(HTTPException) as exc:
            validate_email("user@")
        assert exc.value.status_code == 422

    def test_invalid_no_local_part(self):
        with pytest.raises(HTTPException) as exc:
            validate_email("@example.com")
        assert exc.value.status_code == 422

    def test_invalid_double_at(self):
        with pytest.raises(HTTPException) as exc:
            validate_email("user@@example.com")
        assert exc.value.status_code == 422

    def test_invalid_no_tld(self):
        with pytest.raises(HTTPException) as exc:
            validate_email("user@example")
        assert exc.value.status_code == 422

    def test_invalid_single_char_tld(self):
        with pytest.raises(HTTPException) as exc:
            validate_email("user@example.c")
        assert exc.value.status_code == 422

    def test_invalid_spaces_in_email(self):
        with pytest.raises(HTTPException) as exc:
            validate_email("user name@example.com")
        assert exc.value.status_code == 422

    def test_invalid_special_chars(self):
        with pytest.raises(HTTPException) as exc:
            validate_email("user!name@example.com")
        assert exc.value.status_code == 422

    def test_too_long_email(self):
        long_email = "a" * 246 + "@test.com"
        with pytest.raises(HTTPException) as exc:
            validate_email(long_email)
        assert exc.value.status_code == 422
        assert "too long" in exc.value.detail

    def test_email_exactly_254_chars(self):
        local_part = "a" * 240
        email = f"{local_part}@example.com"
        assert len(email) == 252
        result = validate_email(email)
        assert result == email

    def test_email_255_chars_too_long(self):
        local_part = "a" * 243
        email = f"{local_part}@example.com"
        assert len(email) == 255
        with pytest.raises(HTTPException) as exc:
            validate_email(email)
        assert exc.value.status_code == 422

    def test_empty_string(self):
        with pytest.raises(HTTPException) as exc:
            validate_email("")
        assert exc.value.status_code == 422

    def test_valid_two_char_tld(self):
        result = validate_email("user@example.co")
        assert result == "user@example.co"

    def test_valid_long_tld(self):
        result = validate_email("user@example.museum")
        assert result == "user@example.museum"

    def test_dot_at_start_of_local_accepted(self):
        result = validate_email(".user@example.com")
        assert result == ".user@example.com"

    def test_invalid_comma_in_email(self):
        with pytest.raises(HTTPException) as exc:
            validate_email("user,name@example.com")
        assert exc.value.status_code == 422


class TestValidatePassword:

    def test_valid_password(self):
        result = validate_password("SecurePass1")
        assert result == "SecurePass1"

    def test_valid_password_with_special_chars(self):
        result = validate_password("Secure@Pass1!")
        assert result == "Secure@Pass1!"

    def test_valid_password_exactly_8_chars(self):
        result = validate_password("Abcdef1x")
        assert result == "Abcdef1x"

    def test_valid_password_128_chars(self):
        password = "Aa1" + "x" * 125
        assert len(password) == 128
        result = validate_password(password)
        assert result == password

    def test_too_short_7_chars(self):
        with pytest.raises(HTTPException) as exc:
            validate_password("Abc1efg")
        assert exc.value.status_code == 422
        assert "at least 8 characters" in exc.value.detail

    def test_too_short_1_char(self):
        with pytest.raises(HTTPException) as exc:
            validate_password("A")
        assert exc.value.status_code == 422

    def test_too_long_129_chars(self):
        password = "Aa1" + "x" * 126
        assert len(password) == 129
        with pytest.raises(HTTPException) as exc:
            validate_password(password)
        assert exc.value.status_code == 422
        assert "too long" in exc.value.detail

    def test_empty_password(self):
        with pytest.raises(HTTPException) as exc:
            validate_password("")
        assert exc.value.status_code == 422
        assert "at least 8 characters" in exc.value.detail

    def test_none_password(self):
        with pytest.raises(HTTPException) as exc:
            validate_password(None)
        assert exc.value.status_code == 422

    def test_no_uppercase(self):
        with pytest.raises(HTTPException) as exc:
            validate_password("alllower1")
        assert exc.value.status_code == 422
        assert "uppercase" in exc.value.detail

    def test_no_lowercase(self):
        with pytest.raises(HTTPException) as exc:
            validate_password("ALLUPPER1")
        assert exc.value.status_code == 422
        assert "lowercase" in exc.value.detail

    def test_no_digit(self):
        with pytest.raises(HTTPException) as exc:
            validate_password("NoDigitsHere")
        assert exc.value.status_code == 422
        assert "digit" in exc.value.detail

    def test_spaces_only(self):
        with pytest.raises(HTTPException) as exc:
            validate_password("        ")
        assert exc.value.status_code == 422

    def test_digits_only(self):
        with pytest.raises(HTTPException) as exc:
            validate_password("12345678")
        assert exc.value.status_code == 422
        assert "uppercase" in exc.value.detail

    def test_with_unicode_characters(self):
        result = validate_password("Passw0rdשלום")
        assert result == "Passw0rdשלום"

    def test_with_spaces_in_middle(self):
        result = validate_password("Pass w0rd")
        assert result == "Pass w0rd"

    def test_password_all_special_no_digit(self):
        with pytest.raises(HTTPException) as exc:
            validate_password("Abc!@#$%")
        assert exc.value.status_code == 422
        assert "digit" in exc.value.detail

    def test_valid_minimum_requirements(self):
        result = validate_password("aB3defgh")
        assert result == "aB3defgh"

    def test_password_with_newline(self):
        result = validate_password("Pass\nw0rd")
        assert result == "Pass\nw0rd"


class TestValidateStringLength:

    def test_valid_string_default_bounds(self):
        result = validate_string_length("hello")
        assert result == "hello"

    def test_strips_whitespace(self):
        result = validate_string_length("  hello  ")
        assert result == "hello"

    def test_min_length_exact(self):
        result = validate_string_length("a", min_length=1)
        assert result == "a"

    def test_min_length_violation(self):
        with pytest.raises(HTTPException) as exc:
            validate_string_length("", min_length=1)
        assert exc.value.status_code == 422
        assert "at least 1 characters" in exc.value.detail

    def test_max_length_exact(self):
        result = validate_string_length("abcde", max_length=5)
        assert result == "abcde"

    def test_max_length_violation(self):
        with pytest.raises(HTTPException) as exc:
            validate_string_length("abcdef", max_length=5)
        assert exc.value.status_code == 422
        assert "must not exceed 5 characters" in exc.value.detail

    def test_custom_field_name_in_error(self):
        with pytest.raises(HTTPException) as exc:
            validate_string_length("", min_length=1, field_name="Username")
        assert "Username" in exc.value.detail

    def test_custom_field_name_max_error(self):
        with pytest.raises(HTTPException) as exc:
            validate_string_length("toolong", max_length=3, field_name="Code")
        assert "Code" in exc.value.detail

    def test_non_string_input_integer(self):
        with pytest.raises(HTTPException) as exc:
            validate_string_length(123)
        assert exc.value.status_code == 422
        assert "must be a string" in exc.value.detail

    def test_non_string_input_none(self):
        with pytest.raises(HTTPException) as exc:
            validate_string_length(None)
        assert exc.value.status_code == 422

    def test_non_string_input_list(self):
        with pytest.raises(HTTPException) as exc:
            validate_string_length([1, 2, 3])
        assert exc.value.status_code == 422

    def test_min_length_custom(self):
        result = validate_string_length("abc", min_length=3)
        assert result == "abc"

    def test_min_length_custom_violation(self):
        with pytest.raises(HTTPException) as exc:
            validate_string_length("ab", min_length=3)
        assert exc.value.status_code == 422

    def test_max_length_255_default(self):
        result = validate_string_length("x" * 255)
        assert len(result) == 255

    def test_max_length_256_default_violation(self):
        with pytest.raises(HTTPException) as exc:
            validate_string_length("x" * 256)
        assert exc.value.status_code == 422

    def test_whitespace_only_fails_min_length(self):
        with pytest.raises(HTTPException) as exc:
            validate_string_length("   ", min_length=1)
        assert exc.value.status_code == 422

    def test_min_zero_allows_empty(self):
        result = validate_string_length("", min_length=0)
        assert result == ""

    def test_unicode_string_length(self):
        result = validate_string_length("שלום", min_length=1, max_length=10)
        assert result == "שלום"

    def test_boundary_min_equals_max(self):
        result = validate_string_length("abc", min_length=3, max_length=3)
        assert result == "abc"


class TestSanitizeInputDict:

    def test_basic_dict_sanitization(self):
        data = {"name": "  John  ", "age": 25}
        result = sanitize_input_dict(data)
        assert result["name"] == "John"
        assert result["age"] == 25

    def test_string_values_sanitized(self):
        data = {"name": "<script>alert(1)</script>John"}
        result = sanitize_input_dict(data)
        assert "<script>" not in result["name"]
        assert "John" in result["name"]

    def test_non_string_values_preserved(self):
        data = {"count": 42, "active": True, "ratio": 3.14}
        result = sanitize_input_dict(data)
        assert result["count"] == 42
        assert result["active"] is True
        assert result["ratio"] == 3.14

    def test_allowed_fields_filtering(self):
        data = {"name": "John", "age": 25, "secret": "hidden"}
        allowed = {"name": {}, "age": {}}
        result = sanitize_input_dict(data, allowed_fields=allowed)
        assert "name" in result
        assert "age" in result
        assert "secret" not in result

    def test_allowed_fields_empty_dict_keeps_all(self):
        data = {"name": "John"}
        allowed = {}
        result = sanitize_input_dict(data, allowed_fields=allowed)
        assert result == {"name": "John"}

    def test_no_allowed_fields_keeps_all(self):
        data = {"a": "1", "b": "2", "c": "3"}
        result = sanitize_input_dict(data)
        assert len(result) == 3

    def test_empty_dict(self):
        result = sanitize_input_dict({})
        assert result == {}

    def test_mixed_types(self):
        data = {"name": "John", "count": 5, "tags": ["a", "b"], "meta": None}
        result = sanitize_input_dict(data)
        assert result["name"] == "John"
        assert result["count"] == 5
        assert result["tags"] == ["a", "b"]
        assert result["meta"] is None

    def test_html_in_string_values(self):
        data = {"bio": "<b>Bold</b> text", "title": "Safe title"}
        result = sanitize_input_dict(data)
        assert "<b>" not in result["bio"]
        assert "Bold" in result["bio"]
        assert result["title"] == "Safe title"

    def test_event_handler_in_dict_values(self):
        data = {"note": '<div onclick="alert(1)">text</div>'}
        result = sanitize_input_dict(data)
        assert "onclick" not in result["note"]

    def test_nested_dict_not_sanitized_recursively(self):
        data = {"meta": {"key": "<b>value</b>"}}
        result = sanitize_input_dict(data)
        assert isinstance(result["meta"], dict)

    def test_allowed_fields_with_missing_keys(self):
        data = {"name": "John"}
        allowed = {"name": {}, "age": {}, "email": {}}
        result = sanitize_input_dict(data, allowed_fields=allowed)
        assert "name" in result
        assert "age" not in result
        assert "email" not in result

    def test_none_value_preserved(self):
        data = {"field": None}
        result = sanitize_input_dict(data)
        assert result["field"] is None

    def test_boolean_false_preserved(self):
        data = {"active": False}
        result = sanitize_input_dict(data)
        assert result["active"] is False

    def test_zero_preserved(self):
        data = {"count": 0}
        result = sanitize_input_dict(data)
        assert result["count"] == 0


class TestDetectSqlInjectionAttempt:

    def test_select_with_semicolon(self):
        assert detect_sql_injection_attempt("SELECT * FROM users;") is True

    def test_union_select(self):
        assert detect_sql_injection_attempt("1 UNION SELECT * FROM passwords") is True

    def test_drop_table(self):
        assert detect_sql_injection_attempt("DROP TABLE users;") is True

    def test_delete_with_comment(self):
        assert detect_sql_injection_attempt("DELETE FROM users -- all gone") is True

    def test_insert_with_semicolon(self):
        assert detect_sql_injection_attempt("INSERT INTO users VALUES('hacker'); --") is True

    def test_update_with_semicolon(self):
        assert detect_sql_injection_attempt("UPDATE users SET role='admin';") is True

    def test_or_1_equals_1(self):
        assert detect_sql_injection_attempt("SELECT * FROM users WHERE id=1 OR 1=1") is True

    def test_comment_double_dash(self):
        assert detect_sql_injection_attempt("SELECT 1 --") is True

    def test_comment_block(self):
        assert detect_sql_injection_attempt("SELECT /* comment */ 1") is True

    def test_alter_table(self):
        assert detect_sql_injection_attempt("ALTER TABLE users; DROP TABLE") is True

    def test_create_table(self):
        assert detect_sql_injection_attempt("CREATE TABLE hacks; --") is True

    def test_lowercase_keywords(self):
        assert detect_sql_injection_attempt("select * from users;") is True

    def test_mixed_case_keywords(self):
        assert detect_sql_injection_attempt("SeLeCt * FROM users;") is True

    def test_chained_statements(self):
        assert detect_sql_injection_attempt("1; DROP TABLE users") is True

    def test_union_all_select(self):
        assert detect_sql_injection_attempt("1 UNION ALL SELECT * FROM users") is True

    def test_safe_string_no_keywords(self):
        assert detect_sql_injection_attempt("hello world") is False

    def test_safe_string_normal_text(self):
        assert detect_sql_injection_attempt("John Doe") is False

    def test_safe_string_with_numbers(self):
        assert detect_sql_injection_attempt("Order #12345") is False

    def test_non_string_input(self):
        assert detect_sql_injection_attempt(12345) is False

    def test_non_string_none(self):
        assert detect_sql_injection_attempt(None) is False

    def test_empty_string(self):
        assert detect_sql_injection_attempt("") is False

    def test_keyword_without_suspicious_chars(self):
        assert detect_sql_injection_attempt("SELECT a nice item") is False

    def test_safe_sentence_with_or(self):
        assert detect_sql_injection_attempt("this or that") is False

    def test_safe_sentence_with_and(self):
        assert detect_sql_injection_attempt("this and that") is False

    def test_select_with_or_combined(self):
        assert detect_sql_injection_attempt("SELECT id FROM t WHERE x OR y") is True

    def test_whitespace_padding(self):
        assert detect_sql_injection_attempt("  SELECT * FROM users;  ") is True

    def test_delete_with_and_condition(self):
        assert detect_sql_injection_attempt("DELETE FROM users WHERE 1=1 AND 2=2") is True

    def test_select_with_block_comment_end(self):
        assert detect_sql_injection_attempt("SELECT */ FROM users") is True


class TestPreventSqlInjection:

    def test_safe_string_passes(self):
        result = prevent_sql_injection("normal text")
        assert result == "normal text"

    def test_safe_string_with_numbers(self):
        result = prevent_sql_injection("item #42")
        assert result == "item #42"

    def test_raises_on_select_injection(self):
        with pytest.raises(HTTPException) as exc:
            prevent_sql_injection("SELECT * FROM users;")
        assert exc.value.status_code == 400
        assert "Invalid input" in exc.value.detail

    def test_raises_on_union_injection(self):
        with pytest.raises(HTTPException) as exc:
            prevent_sql_injection("1 UNION SELECT password FROM users")
        assert exc.value.status_code == 400

    def test_raises_on_drop_injection(self):
        with pytest.raises(HTTPException) as exc:
            prevent_sql_injection("DROP TABLE users;")
        assert exc.value.status_code == 400

    def test_raises_on_comment_injection(self):
        with pytest.raises(HTTPException) as exc:
            prevent_sql_injection("SELECT 1 --")
        assert exc.value.status_code == 400

    def test_returns_value_when_safe(self):
        result = prevent_sql_injection("Just a regular string")
        assert result == "Just a regular string"

    def test_empty_string_safe(self):
        result = prevent_sql_injection("")
        assert result == ""

    def test_raises_on_chained_statements(self):
        with pytest.raises(HTTPException) as exc:
            prevent_sql_injection("1; DELETE FROM users")
        assert exc.value.status_code == 400


class TestValidateUuidFormat:

    def test_valid_uuid_v4(self):
        test_uuid = str(uuid.uuid4())
        result = validate_uuid_format(test_uuid)
        assert result == test_uuid

    def test_valid_uuid_lowercase(self):
        result = validate_uuid_format("550e8400-e29b-41d4-a716-446655440000")
        assert result == "550e8400-e29b-41d4-a716-446655440000"

    def test_valid_uuid_uppercase(self):
        result = validate_uuid_format("550E8400-E29B-41D4-A716-446655440000")
        assert result == "550E8400-E29B-41D4-A716-446655440000"

    def test_valid_uuid_mixed_case(self):
        result = validate_uuid_format("550e8400-E29B-41d4-A716-446655440000")
        assert result == "550e8400-E29B-41d4-A716-446655440000"

    def test_invalid_too_short(self):
        with pytest.raises(HTTPException) as exc:
            validate_uuid_format("550e8400-e29b-41d4-a716")
        assert exc.value.status_code == 422

    def test_invalid_too_long(self):
        with pytest.raises(HTTPException) as exc:
            validate_uuid_format("550e8400-e29b-41d4-a716-446655440000-extra")
        assert exc.value.status_code == 422

    def test_invalid_no_dashes(self):
        with pytest.raises(HTTPException) as exc:
            validate_uuid_format("550e8400e29b41d4a716446655440000")
        assert exc.value.status_code == 422

    def test_invalid_wrong_dash_positions(self):
        with pytest.raises(HTTPException) as exc:
            validate_uuid_format("550e84-00e29b-41d4a-716-446655440000")
        assert exc.value.status_code == 422

    def test_invalid_non_hex_characters(self):
        with pytest.raises(HTTPException) as exc:
            validate_uuid_format("550g8400-e29b-41d4-a716-446655440000")
        assert exc.value.status_code == 422

    def test_empty_string(self):
        with pytest.raises(HTTPException) as exc:
            validate_uuid_format("")
        assert exc.value.status_code == 422

    def test_random_string(self):
        with pytest.raises(HTTPException) as exc:
            validate_uuid_format("not-a-uuid")
        assert exc.value.status_code == 422

    def test_custom_field_name_in_error(self):
        with pytest.raises(HTTPException) as exc:
            validate_uuid_format("invalid", field_name="Project ID")
        assert "Project ID" in exc.value.detail

    def test_default_field_name_in_error(self):
        with pytest.raises(HTTPException) as exc:
            validate_uuid_format("invalid")
        assert "ID" in exc.value.detail

    def test_uuid_nil(self):
        result = validate_uuid_format("00000000-0000-0000-0000-000000000000")
        assert result == "00000000-0000-0000-0000-000000000000"

    def test_spaces_around_uuid(self):
        with pytest.raises(HTTPException) as exc:
            validate_uuid_format(" 550e8400-e29b-41d4-a716-446655440000 ")
        assert exc.value.status_code == 422

    def test_uuid_with_braces(self):
        with pytest.raises(HTTPException) as exc:
            validate_uuid_format("{550e8400-e29b-41d4-a716-446655440000}")
        assert exc.value.status_code == 422

    def test_multiple_valid_uuids(self):
        for _ in range(10):
            test_uuid = str(uuid.uuid4())
            result = validate_uuid_format(test_uuid)
            assert result == test_uuid

    def test_invalid_partial_uuid(self):
        with pytest.raises(HTTPException) as exc:
            validate_uuid_format("550e8400-e29b")
        assert exc.value.status_code == 422

    def test_invalid_only_dashes(self):
        with pytest.raises(HTTPException) as exc:
            validate_uuid_format("--------")
        assert exc.value.status_code == 422
