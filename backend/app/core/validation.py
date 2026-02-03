"""Input validation and sanitization module for security."""

import re
from typing import Any, Dict
from fastapi import HTTPException, status

HTML_TAG_PATTERN = re.compile(r'<[^>]+>')
SQL_KEYWORDS = {'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'DROP', 'CREATE', 'ALTER', 'UNION'}
SCRIPT_PATTERN = re.compile(r'<script[^>]*>.*?</script>', re.IGNORECASE | re.DOTALL)
EVENT_HANDLER_PATTERN = re.compile(r'on\w+\s*=', re.IGNORECASE)


def sanitize_string(value: str, allow_html: bool = False) -> str:
    """Sanitize string input by removing potentially dangerous content."""
    if not isinstance(value, str):
        return value

    # Remove script tags
    value = SCRIPT_PATTERN.sub('', value)

    # Remove event handlers
    value = EVENT_HANDLER_PATTERN.sub('', value)

    # Remove HTML tags if not allowed
    if not allow_html:
        value = HTML_TAG_PATTERN.sub('', value)

    # Strip whitespace
    value = value.strip()

    return value


def validate_email(email: str) -> str:
    """Validate and sanitize email address."""
    email = email.strip().lower()

    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(email_pattern, email):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid email format"
        )

    if len(email) > 254:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Email address too long"
        )

    return email


def validate_password(password: str) -> str:
    """Validate password strength."""
    if not password or len(password) < 8:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Password must be at least 8 characters long"
        )

    if len(password) > 128:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Password too long"
        )

    # Check for at least one uppercase, one lowercase, one digit
    if not re.search(r'[A-Z]', password):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Password must contain at least one uppercase letter"
        )

    if not re.search(r'[a-z]', password):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Password must contain at least one lowercase letter"
        )

    if not re.search(r'\d', password):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Password must contain at least one digit"
        )

    return password


def validate_string_length(value: str, min_length: int = 1, max_length: int = 255, field_name: str = "Field") -> str:
    """Validate string length constraints."""
    if not isinstance(value, str):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"{field_name} must be a string"
        )

    value = value.strip()

    if len(value) < min_length:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"{field_name} must be at least {min_length} characters"
        )

    if len(value) > max_length:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"{field_name} must not exceed {max_length} characters"
        )

    return value


def sanitize_input_dict(data: Dict[str, Any], allowed_fields: Dict[str, Dict[str, Any]] = None) -> Dict[str, Any]:
    """Sanitize and validate an input dictionary."""
    sanitized = {}

    for key, value in data.items():
        if allowed_fields and key not in allowed_fields:
            continue

        if isinstance(value, str):
            sanitized[key] = sanitize_string(value)
        else:
            sanitized[key] = value

    return sanitized


def detect_sql_injection_attempt(value: str) -> bool:
    """Detect common SQL injection patterns."""
    if not isinstance(value, str):
        return False

    upper_value = value.upper().strip()

    for keyword in SQL_KEYWORDS:
        if keyword in upper_value:
            # Check for suspicious patterns
            if any(char in upper_value for char in ['--', ';', '/*', '*/', 'UNION', 'OR', 'AND']):
                return True

    return False


def prevent_sql_injection(value: str) -> str:
    """Prevent SQL injection by validating input."""
    if detect_sql_injection_attempt(value):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid input detected"
        )
    return value


def validate_uuid_format(value: str, field_name: str = "ID") -> str:
    """Validate UUID format."""
    uuid_pattern = r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    if not re.match(uuid_pattern, value.lower()):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid {field_name} format"
        )
    return value
