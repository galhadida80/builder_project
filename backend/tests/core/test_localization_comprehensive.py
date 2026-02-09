from unittest.mock import MagicMock

import pytest

from app.utils.localization import (
    parse_accept_language_header,
    get_language_from_request,
    translate_message,
    is_language_supported,
    DEFAULT_LANGUAGE,
    SUPPORTED_LANGUAGES,
    DEFAULT_MESSAGES,
)


class TestParseAcceptLanguageHeader:

    def test_simple_en(self):
        assert parse_accept_language_header("en") == "en"

    def test_simple_he(self):
        assert parse_accept_language_header("he") == "he"

    def test_en_us(self):
        assert parse_accept_language_header("en-US") == "en"

    def test_he_il(self):
        assert parse_accept_language_header("he-IL") == "he"

    def test_en_gb(self):
        assert parse_accept_language_header("en-GB") == "en"

    def test_complex_header_he_first(self):
        result = parse_accept_language_header("he-IL,he;q=0.9,en;q=0.8")
        assert result == "he"

    def test_complex_header_en_first(self):
        result = parse_accept_language_header("en-US,en;q=0.9,he;q=0.8")
        assert result == "en"

    def test_empty_string_returns_default(self):
        assert parse_accept_language_header("") == DEFAULT_LANGUAGE

    def test_none_returns_default(self):
        assert parse_accept_language_header(None) == DEFAULT_LANGUAGE

    def test_unsupported_language_returns_default(self):
        assert parse_accept_language_header("fr") == DEFAULT_LANGUAGE

    def test_unsupported_then_supported(self):
        result = parse_accept_language_header("fr,en;q=0.8")
        assert result == "en"

    def test_unsupported_then_he(self):
        result = parse_accept_language_header("de,he;q=0.5")
        assert result == "he"

    def test_all_unsupported_returns_default(self):
        result = parse_accept_language_header("fr,de,ja")
        assert result == DEFAULT_LANGUAGE

    def test_quality_factor_ordering(self):
        result = parse_accept_language_header("he;q=0.8,en;q=0.9")
        assert result == "he"

    def test_wildcard_unsupported(self):
        result = parse_accept_language_header("*")
        assert result == DEFAULT_LANGUAGE

    def test_case_insensitive_en(self):
        result = parse_accept_language_header("EN")
        assert result == "en"

    def test_case_insensitive_he(self):
        result = parse_accept_language_header("HE")
        assert result == "he"

    def test_mixed_case_en_us(self):
        result = parse_accept_language_header("En-Us")
        assert result == "en"

    def test_whitespace_around_language(self):
        result = parse_accept_language_header(" en ")
        assert result == "en"

    def test_multiple_quality_factors(self):
        result = parse_accept_language_header("he-IL;q=1.0,en;q=0.5")
        assert result == "he"

    def test_single_unsupported_language(self):
        result = parse_accept_language_header("zh-CN")
        assert result == DEFAULT_LANGUAGE

    def test_supported_after_multiple_unsupported(self):
        result = parse_accept_language_header("fr,de,ja,he;q=0.1")
        assert result == "he"

    def test_en_with_quality_zero(self):
        result = parse_accept_language_header("en;q=0")
        assert result == "en"

    def test_just_dash(self):
        result = parse_accept_language_header("-")
        assert result == DEFAULT_LANGUAGE

    def test_regional_variant_he_il_with_quality(self):
        result = parse_accept_language_header("he-IL;q=0.9")
        assert result == "he"

    def test_three_supported_and_unsupported_mixed(self):
        result = parse_accept_language_header("de,fr,he,ja")
        assert result == "he"

    def test_en_at_end_after_unsupported(self):
        result = parse_accept_language_header("ar,zh,en")
        assert result == "en"

    def test_only_quality_no_lang(self):
        result = parse_accept_language_header(";q=0.9")
        assert result == DEFAULT_LANGUAGE

    def test_comma_only(self):
        result = parse_accept_language_header(",")
        assert result == DEFAULT_LANGUAGE

    def test_semicolon_only(self):
        result = parse_accept_language_header(";")
        assert result == DEFAULT_LANGUAGE

    def test_he_and_en_both_present(self):
        result = parse_accept_language_header("he,en")
        assert result == "he"

    def test_en_and_he_both_present(self):
        result = parse_accept_language_header("en,he")
        assert result == "en"


class TestGetLanguageFromRequest:

    def test_english_header(self):
        request = MagicMock()
        request.headers = {"Accept-Language": "en"}
        result = get_language_from_request(request)
        assert result == "en"

    def test_hebrew_header(self):
        request = MagicMock()
        request.headers = {"Accept-Language": "he"}
        result = get_language_from_request(request)
        assert result == "he"

    def test_missing_header_defaults_to_en(self):
        request = MagicMock()
        request.headers = MagicMock()
        request.headers.get = MagicMock(return_value=DEFAULT_LANGUAGE)
        result = get_language_from_request(request)
        assert result == DEFAULT_LANGUAGE

    def test_complex_accept_language(self):
        request = MagicMock()
        request.headers = MagicMock()
        request.headers.get = MagicMock(return_value="he-IL,he;q=0.9,en;q=0.8")
        result = get_language_from_request(request)
        assert result == "he"

    def test_unsupported_language_header(self):
        request = MagicMock()
        request.headers = MagicMock()
        request.headers.get = MagicMock(return_value="fr")
        result = get_language_from_request(request)
        assert result == DEFAULT_LANGUAGE

    def test_en_us_header(self):
        request = MagicMock()
        request.headers = MagicMock()
        request.headers.get = MagicMock(return_value="en-US")
        result = get_language_from_request(request)
        assert result == "en"

    def test_empty_accept_language(self):
        request = MagicMock()
        request.headers = MagicMock()
        request.headers.get = MagicMock(return_value="")
        result = get_language_from_request(request)
        assert result == DEFAULT_LANGUAGE

    def test_header_with_quality_factors(self):
        request = MagicMock()
        request.headers = MagicMock()
        request.headers.get = MagicMock(return_value="en;q=0.9,he;q=0.8")
        result = get_language_from_request(request)
        assert result == "en"

    def test_he_il_regional_header(self):
        request = MagicMock()
        request.headers = MagicMock()
        request.headers.get = MagicMock(return_value="he-IL")
        result = get_language_from_request(request)
        assert result == "he"

    def test_multiple_unsupported_header(self):
        request = MagicMock()
        request.headers = MagicMock()
        request.headers.get = MagicMock(return_value="de,ja,zh")
        result = get_language_from_request(request)
        assert result == DEFAULT_LANGUAGE

    def test_wildcard_header(self):
        request = MagicMock()
        request.headers = MagicMock()
        request.headers.get = MagicMock(return_value="*")
        result = get_language_from_request(request)
        assert result == DEFAULT_LANGUAGE

    def test_returns_string_type(self):
        request = MagicMock()
        request.headers = MagicMock()
        request.headers.get = MagicMock(return_value="en")
        result = get_language_from_request(request)
        assert isinstance(result, str)


class TestTranslateMessage:

    def test_valid_key_en(self):
        result = translate_message("invalid_credentials", "en")
        assert result == "Invalid email or password"

    def test_valid_key_he(self):
        result = translate_message("invalid_credentials", "he")
        assert "דוא״ל או סיסמה לא תקינים" == result

    def test_email_already_registered_en(self):
        result = translate_message("email_already_registered", "en")
        assert result == "Email already registered"

    def test_email_already_registered_he(self):
        result = translate_message("email_already_registered", "he")
        assert result == "הדוא״ל כבר רשום"

    def test_not_authenticated_en(self):
        result = translate_message("not_authenticated", "en")
        assert result == "Not authenticated"

    def test_not_authenticated_he(self):
        result = translate_message("not_authenticated", "he")
        assert result == "לא מאומת"

    def test_resource_not_found_en(self):
        result = translate_message("resource_not_found", "en")
        assert result == "Resource not found"

    def test_resource_not_found_he(self):
        result = translate_message("resource_not_found", "he")
        assert result == "הרסורס לא נמצא"

    def test_missing_key_returns_key(self):
        result = translate_message("nonexistent_key_xyz", "en")
        assert result == "nonexistent_key_xyz"

    def test_missing_key_he_returns_key(self):
        result = translate_message("nonexistent_key_xyz", "he")
        assert result == "nonexistent_key_xyz"

    def test_unsupported_language_falls_back_to_en(self):
        result = translate_message("invalid_credentials", "fr")
        assert result == "Invalid email or password"

    def test_unsupported_language_with_missing_key(self):
        result = translate_message("nonexistent_key", "ja")
        assert result == "nonexistent_key"

    def test_custom_messages_dict(self):
        custom = {
            "en": {"greeting": "Hello"},
            "he": {"greeting": "שלום"},
        }
        result = translate_message("greeting", "en", messages=custom)
        assert result == "Hello"

    def test_custom_messages_dict_he(self):
        custom = {
            "en": {"greeting": "Hello"},
            "he": {"greeting": "שלום"},
        }
        result = translate_message("greeting", "he", messages=custom)
        assert result == "שלום"

    def test_custom_messages_missing_key_returns_key(self):
        custom = {
            "en": {"greeting": "Hello"},
        }
        result = translate_message("missing", "en", messages=custom)
        assert result == "missing"

    def test_custom_messages_fallback_to_en(self):
        custom = {
            "en": {"greeting": "Hello"},
            "he": {},
        }
        result = translate_message("greeting", "he", messages=custom)
        assert result == "Hello"

    def test_nested_key_custom_messages(self):
        custom = {
            "en": {"auth": {"login": "Log in"}},
            "he": {"auth": {"login": "כניסה"}},
        }
        result = translate_message("auth.login", "en", messages=custom)
        assert result == "Log in"

    def test_nested_key_custom_messages_he(self):
        custom = {
            "en": {"auth": {"login": "Log in"}},
            "he": {"auth": {"login": "כניסה"}},
        }
        result = translate_message("auth.login", "he", messages=custom)
        assert result == "כניסה"

    def test_nested_key_missing_returns_key(self):
        custom = {
            "en": {"auth": {"login": "Log in"}},
        }
        result = translate_message("auth.nonexistent", "en", messages=custom)
        assert result == "auth.nonexistent"

    def test_all_default_en_keys(self):
        for key, value in DEFAULT_MESSAGES["en"].items():
            result = translate_message(key, "en")
            assert result == value

    def test_all_default_he_keys(self):
        for key, value in DEFAULT_MESSAGES["he"].items():
            result = translate_message(key, "he")
            assert result == value

    def test_account_inactive_en(self):
        result = translate_message("account_inactive", "en")
        assert result == "Account is inactive"

    def test_server_error_en(self):
        result = translate_message("server_error", "en")
        assert result == "Internal server error occurred"

    def test_access_denied_en(self):
        result = translate_message("access_denied", "en")
        assert result == "Access denied"

    def test_access_denied_he(self):
        result = translate_message("access_denied", "he")
        assert result == "גישה נדחתה"

    def test_project_not_found_en(self):
        result = translate_message("project_not_found", "en")
        assert result == "Project not found"

    def test_equipment_not_found_he(self):
        result = translate_message("equipment_not_found", "he")
        assert result == "הציוד לא נמצא"

    def test_empty_key(self):
        result = translate_message("", "en")
        assert result == ""

    def test_default_language_constant(self):
        assert DEFAULT_LANGUAGE == "en"

    def test_supported_languages_list(self):
        assert "en" in SUPPORTED_LANGUAGES
        assert "he" in SUPPORTED_LANGUAGES
        assert len(SUPPORTED_LANGUAGES) == 2

    def test_user_not_found_en(self):
        result = translate_message("user_not_found", "en")
        assert result == "User not found"

    def test_user_not_found_he(self):
        result = translate_message("user_not_found", "he")
        assert result == "משתמש לא נמצא"

    def test_user_inactive_en(self):
        result = translate_message("user_inactive", "en")
        assert result == "User is inactive"

    def test_user_inactive_he(self):
        result = translate_message("user_inactive", "he")
        assert result == "משתמש אינו פעיל"

    def test_invalid_or_expired_token_en(self):
        result = translate_message("invalid_or_expired_token", "en")
        assert result == "Invalid or expired token"

    def test_invalid_or_expired_token_he(self):
        result = translate_message("invalid_or_expired_token", "he")
        assert result == "טוקן לא תקין או פג תוקף"

    def test_method_not_allowed_en(self):
        result = translate_message("method_not_allowed", "en")
        assert result == "Method not allowed"

    def test_method_not_allowed_he(self):
        result = translate_message("method_not_allowed", "he")
        assert result == "שיטה לא מותרת"

    def test_conflict_en(self):
        result = translate_message("conflict", "en")
        assert result == "Resource conflict"

    def test_conflict_he(self):
        result = translate_message("conflict", "he")
        assert result == "ניגוד משאבים"

    def test_validation_error_en(self):
        result = translate_message("validation_error", "en")
        assert result == "Validation error"

    def test_validation_error_he(self):
        result = translate_message("validation_error", "he")
        assert result == "שגיאת תיקוף"

    def test_material_not_found_en(self):
        result = translate_message("material_not_found", "en")
        assert result == "Material not found"

    def test_material_not_found_he(self):
        result = translate_message("material_not_found", "he")
        assert result == "החומר לא נמצא"

    def test_meeting_not_found_en(self):
        result = translate_message("meeting_not_found", "en")
        assert result == "Meeting not found"

    def test_meeting_not_found_he(self):
        result = translate_message("meeting_not_found", "he")
        assert result == "הפגישה לא נמצאה"

    def test_file_not_found_en(self):
        result = translate_message("file_not_found", "en")
        assert result == "File not found"

    def test_file_not_found_he(self):
        result = translate_message("file_not_found", "he")
        assert result == "הקובץ לא נמצא"

    def test_contact_not_found_en(self):
        result = translate_message("contact_not_found", "en")
        assert result == "Contact not found"

    def test_contact_not_found_he(self):
        result = translate_message("contact_not_found", "he")
        assert result == "איש הקשר לא נמצא"

    def test_area_not_found_en(self):
        result = translate_message("area_not_found", "en")
        assert result == "Area not found"

    def test_area_not_found_he(self):
        result = translate_message("area_not_found", "he")
        assert result == "האזור לא נמצא"

    def test_approval_not_found_en(self):
        result = translate_message("approval_not_found", "en")
        assert result == "Approval not found"

    def test_approval_not_found_he(self):
        result = translate_message("approval_not_found", "he")
        assert result == "האישור לא נמצא"

    def test_invalid_input_en(self):
        result = translate_message("invalid_input", "en")
        assert result == "Invalid input provided"

    def test_unauthorized_access_en(self):
        result = translate_message("unauthorized_access", "en")
        assert result == "Unauthorized access"

    def test_custom_deeply_nested_key(self):
        custom = {
            "en": {"a": {"b": {"c": "deep value"}}},
        }
        result = translate_message("a.b.c", "en", messages=custom)
        assert result == "deep value"

    def test_custom_messages_override_defaults(self):
        custom = {
            "en": {"invalid_credentials": "Custom invalid"},
        }
        result = translate_message("invalid_credentials", "en", messages=custom)
        assert result == "Custom invalid"

    def test_translate_returns_string_type(self):
        result = translate_message("invalid_credentials", "en")
        assert isinstance(result, str)


class TestIsLanguageSupported:

    def test_en_supported(self):
        assert is_language_supported("en") is True

    def test_he_supported(self):
        assert is_language_supported("he") is True

    def test_fr_unsupported(self):
        assert is_language_supported("fr") is False

    def test_de_unsupported(self):
        assert is_language_supported("de") is False

    def test_ja_unsupported(self):
        assert is_language_supported("ja") is False

    def test_zh_unsupported(self):
        assert is_language_supported("zh") is False

    def test_empty_string(self):
        assert is_language_supported("") is False

    def test_case_insensitive_en(self):
        assert is_language_supported("EN") is True

    def test_case_insensitive_he(self):
        assert is_language_supported("HE") is True

    def test_case_mixed(self):
        assert is_language_supported("En") is True

    def test_es_unsupported(self):
        assert is_language_supported("es") is False

    def test_ar_unsupported(self):
        assert is_language_supported("ar") is False

    def test_ru_unsupported(self):
        assert is_language_supported("ru") is False

    def test_whitespace_not_stripped(self):
        assert is_language_supported(" en ") is False

    def test_regional_code_not_supported(self):
        assert is_language_supported("en-US") is False

    def test_number_string(self):
        assert is_language_supported("123") is False

    def test_hyphenated_code(self):
        assert is_language_supported("he-IL") is False

    def test_pt_unsupported(self):
        assert is_language_supported("pt") is False

    def test_ko_unsupported(self):
        assert is_language_supported("ko") is False

    def test_it_unsupported(self):
        assert is_language_supported("it") is False

    def test_special_chars_unsupported(self):
        assert is_language_supported("e!") is False

    def test_single_char_unsupported(self):
        assert is_language_supported("e") is False
