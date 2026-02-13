from __future__ import annotations

import re
from typing import Annotated, Optional

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel
from pydantic.functional_validators import BeforeValidator

MIN_NAME_LENGTH = 2
MAX_NAME_LENGTH = 255
MAX_CODE_LENGTH = 50
MAX_DESCRIPTION_LENGTH = 2000
MAX_NOTES_LENGTH = 5000
MAX_PHONE_LENGTH = 30
MAX_ADDRESS_LENGTH = 500

DANGEROUS_PATTERNS = [
    r'<script[^>]*>.*?</script>',
    r'javascript:',
    r'on\w+\s*=',
    r'<iframe[^>]*>',
    r'<img[^>]*>',
    r'<svg[^>]*>.*?</svg>',
    r'<object[^>]*>',
    r'<embed[^>]*>',
    r'<link[^>]*>',
    r'<meta[^>]*>',
    r'<style[^>]*>.*?</style>',
]


def sanitize_string(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    value = value.strip()
    for pattern in DANGEROUS_PATTERNS:
        value = re.sub(pattern, '', value, flags=re.IGNORECASE | re.DOTALL)
    return value


def validate_code(value: str) -> str:
    value = value.strip().upper()
    if not re.match(r'^[A-Z0-9][A-Z0-9\-_]{0,48}[A-Z0-9]?$', value):
        raise ValueError('Code must contain only letters, numbers, hyphens, and underscores')
    return value


def validate_phone(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    value = value.strip()
    if not value:
        return None
    if not re.match(r'^[\d\s\-\+\(\)\.]+$', value):
        raise ValueError('Phone must contain only digits, spaces, and standard phone characters')
    digits = re.sub(r'[\s\-\(\)\.]', '', value)
    if digits.startswith('+972'):
        digits = '0' + digits[4:]
    elif digits.startswith('972'):
        digits = '0' + digits[3:]
    if not re.match(r'^0[2-9]\d{7,8}$', digits):
        raise ValueError('Please enter a valid Israeli phone number (e.g. 050-1234567, 02-1234567)')
    return value


SanitizedStr = Annotated[str, BeforeValidator(sanitize_string)]
SanitizedStrOptional = Annotated[Optional[str], BeforeValidator(sanitize_string)]
CodeStr = Annotated[str, BeforeValidator(validate_code)]
PhoneStr = Annotated[Optional[str], BeforeValidator(validate_phone)]

NameField = Annotated[str, Field(min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)]
CodeField = Annotated[str, Field(min_length=2, max_length=MAX_CODE_LENGTH)]
DescriptionField = Annotated[str | None, Field(max_length=MAX_DESCRIPTION_LENGTH)]
NotesField = Annotated[str | None, Field(max_length=MAX_NOTES_LENGTH)]
AddressField = Annotated[str | None, Field(max_length=MAX_ADDRESS_LENGTH)]
PhoneField = Annotated[str | None, Field(max_length=MAX_PHONE_LENGTH)]
ShortTextField = Annotated[str | None, Field(max_length=MAX_NAME_LENGTH)]


MAX_CC_EMAILS = 20
MAX_ATTACHMENTS = 50
MAX_LIST_LENGTH = 100

MAX_SPEC_KEYS = 50
MAX_SPEC_KEY_LENGTH = 100
MAX_SPEC_VALUE_LENGTH = 500


def validate_specifications(value: Optional[dict]) -> Optional[dict]:
    if value is None:
        return None
    if not isinstance(value, dict):
        raise ValueError('Specifications must be a JSON object')
    if len(value) > MAX_SPEC_KEYS:
        raise ValueError(f'Specifications cannot have more than {MAX_SPEC_KEYS} keys')
    sanitized = {}
    for key, val in value.items():
        if not isinstance(key, str):
            raise ValueError('Specification keys must be strings')
        if len(key) > MAX_SPEC_KEY_LENGTH:
            raise ValueError(f'Specification key cannot exceed {MAX_SPEC_KEY_LENGTH} characters')
        clean_key = sanitize_string(key) or ''
        if not clean_key:
            continue
        if val is None:
            sanitized[clean_key] = None
            continue
        if isinstance(val, bool):
            sanitized[clean_key] = val
            continue
        if isinstance(val, (int, float)):
            sanitized[clean_key] = val
            continue
        if isinstance(val, str):
            if len(val) > MAX_SPEC_VALUE_LENGTH:
                raise ValueError(f'Specification value cannot exceed {MAX_SPEC_VALUE_LENGTH} characters')
            sanitized[clean_key] = sanitize_string(val)
            continue
        raise ValueError('Specification values must be string, number, boolean, or null')
    return sanitized


class CamelCaseModel(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
        alias_generator=to_camel,
        populate_by_name=True,
    )
