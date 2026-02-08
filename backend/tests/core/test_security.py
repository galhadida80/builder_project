"""Security tests for validation, CSRF protection, and input sanitization."""

import pytest
from app.core.validation import (
    sanitize_string,
    validate_email,
    validate_password,
    validate_string_length,
    detect_sql_injection_attempt,
    prevent_sql_injection,
)
from app.core.csrf import CSRFTokenManager, csrf_manager
from fastapi import HTTPException


class TestInputSanitization:
    """Test input sanitization functions."""

    def test_sanitize_string_removes_script_tags(self):
        """Test that script tags are removed."""
        malicious = '<script>alert("xss")</script>Hello'
        assert sanitize_string(malicious) == 'Hello'

    def test_sanitize_string_removes_event_handlers(self):
        """Test that event handlers are removed (default strips all HTML)."""
        malicious = '<div onclick="alert(1)">Click</div>'
        assert sanitize_string(malicious) == 'Click'

    def test_sanitize_string_removes_html_tags(self):
        """Test that HTML tags are removed when not allowed."""
        html = '<b>Bold</b> and <i>italic</i>'
        assert sanitize_string(html, allow_html=False) == 'Bold and italic'

    def test_sanitize_string_preserves_html_when_allowed(self):
        """Test that HTML is preserved when explicitly allowed."""
        html = '<b>Bold</b>'
        assert '<b>' in sanitize_string(html, allow_html=True)

    def test_sanitize_string_strips_whitespace(self):
        """Test that whitespace is stripped."""
        assert sanitize_string('  hello  ') == 'hello'


class TestEmailValidation:
    """Test email validation."""

    def test_valid_email(self):
        """Test valid email addresses."""
        valid_emails = [
            'user@example.com',
            'user.name@example.co.uk',
            'user+tag@example.com',
            'user_123@example.com',
        ]
        for email in valid_emails:
            assert validate_email(email) == email.lower()

    def test_invalid_email_format(self):
        """Test invalid email formats."""
        invalid_emails = [
            'not-an-email',
            'user@',
            '@example.com',
            'user name@example.com',
        ]
        for email in invalid_emails:
            with pytest.raises(HTTPException):
                validate_email(email)

    def test_email_too_long(self):
        """Test that overly long emails are rejected."""
        long_email = 'a' * 250 + '@example.com'
        with pytest.raises(HTTPException):
            validate_email(long_email)

    def test_email_lowercased(self):
        """Test that emails are lowercased."""
        assert validate_email('User@EXAMPLE.COM') == 'user@example.com'


class TestPasswordValidation:
    """Test password validation."""

    def test_valid_password(self):
        """Test valid passwords."""
        valid_password = 'SecurePass123'
        assert validate_password(valid_password) == valid_password

    def test_password_too_short(self):
        """Test that short passwords are rejected."""
        with pytest.raises(HTTPException):
            validate_password('Short1')

    def test_password_missing_uppercase(self):
        """Test that passwords without uppercase are rejected."""
        with pytest.raises(HTTPException):
            validate_password('securepass123')

    def test_password_missing_lowercase(self):
        """Test that passwords without lowercase are rejected."""
        with pytest.raises(HTTPException):
            validate_password('SECUREPASS123')

    def test_password_missing_digit(self):
        """Test that passwords without digits are rejected."""
        with pytest.raises(HTTPException):
            validate_password('SecurePass')

    def test_password_too_long(self):
        """Test that overly long passwords are rejected."""
        long_password = 'ValidPass1' + 'a' * 150
        with pytest.raises(HTTPException):
            validate_password(long_password)


class TestStringLengthValidation:
    """Test string length validation."""

    def test_valid_length(self):
        """Test valid string lengths."""
        result = validate_string_length('hello', min_length=1, max_length=10)
        assert result == 'hello'

    def test_too_short(self):
        """Test strings that are too short."""
        with pytest.raises(HTTPException):
            validate_string_length('hi', min_length=5)

    def test_too_long(self):
        """Test strings that are too long."""
        with pytest.raises(HTTPException):
            validate_string_length('hello world', max_length=5)

    def test_whitespace_stripped(self):
        """Test that whitespace is stripped."""
        result = validate_string_length('  hello  ', min_length=1, max_length=10)
        assert result == 'hello'


class TestSQLInjectionDetection:
    """Test SQL injection detection."""

    def test_detects_select_injection(self):
        """Test detection of SELECT injections."""
        malicious = "'; SELECT * FROM users; --"
        assert detect_sql_injection_attempt(malicious) is True

    def test_detects_union_injection(self):
        """Test detection of UNION injections."""
        malicious = "' UNION SELECT * FROM users --"
        assert detect_sql_injection_attempt(malicious) is True

    def test_allows_normal_input(self):
        """Test that normal input is not flagged."""
        normal = "john@example.com"
        assert detect_sql_injection_attempt(normal) is False

    def test_prevent_sql_injection_raises_on_attack(self):
        """Test that prevent_sql_injection raises exception."""
        malicious = "'; DROP TABLE users; --"
        with pytest.raises(HTTPException):
            prevent_sql_injection(malicious)

    def test_prevent_sql_injection_allows_normal(self):
        """Test that prevent_sql_injection allows normal input."""
        normal = "normal input"
        assert prevent_sql_injection(normal) == normal


class TestCSRFTokenManager:
    """Test CSRF token generation and validation."""

    def test_generate_token(self):
        """Test token generation."""
        manager = CSRFTokenManager()
        token = manager.generate_token('user-123')
        assert token is not None
        assert len(token) > 0

    def test_validate_token(self):
        """Test token validation."""
        manager = CSRFTokenManager()
        user_id = 'user-123'
        token = manager.generate_token(user_id)

        assert manager.validate_token(token, user_id) is True

    def test_validate_token_wrong_user(self):
        """Test that token validation fails for different user."""
        manager = CSRFTokenManager()
        token = manager.generate_token('user-123')

        assert manager.validate_token(token, 'user-456') is False

    def test_validate_token_wrong_token(self):
        """Test that invalid tokens are rejected."""
        manager = CSRFTokenManager()
        manager.generate_token('user-123')

        assert manager.validate_token('invalid-token', 'user-123') is False

    def test_consume_token(self):
        """Test token consumption."""
        manager = CSRFTokenManager()
        user_id = 'user-123'
        token = manager.generate_token(user_id)

        assert manager.consume_token(token, user_id) is True
        assert manager.validate_token(token, user_id) is False

    def test_cleanup_expired_tokens(self):
        """Test cleanup of expired tokens."""
        manager = CSRFTokenManager(token_lifetime_hours=0)
        token = manager.generate_token('user-123')

        manager.cleanup_expired_tokens()
        assert manager.validate_token(token, 'user-123') is False
