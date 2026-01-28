import re
from typing import Annotated
from pydantic import Field, field_validator
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
]


def sanitize_string(value: str | None) -> str | None:
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


def validate_phone(value: str | None) -> str | None:
    if value is None:
        return None
    value = value.strip()
    if value and not re.match(r'^[\d\s\-\+\(\)\.]+$', value):
        raise ValueError('Phone must contain only digits, spaces, and standard phone characters')
    return value


SanitizedStr = Annotated[str, BeforeValidator(sanitize_string)]
SanitizedStrOptional = Annotated[str | None, BeforeValidator(sanitize_string)]
CodeStr = Annotated[str, BeforeValidator(validate_code)]
PhoneStr = Annotated[str | None, BeforeValidator(validate_phone)]

NameField = Annotated[str, Field(min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)]
CodeField = Annotated[str, Field(min_length=2, max_length=MAX_CODE_LENGTH)]
DescriptionField = Annotated[str | None, Field(max_length=MAX_DESCRIPTION_LENGTH)]
NotesField = Annotated[str | None, Field(max_length=MAX_NOTES_LENGTH)]
AddressField = Annotated[str | None, Field(max_length=MAX_ADDRESS_LENGTH)]
PhoneField = Annotated[str | None, Field(max_length=MAX_PHONE_LENGTH)]
ShortTextField = Annotated[str | None, Field(max_length=MAX_NAME_LENGTH)]
