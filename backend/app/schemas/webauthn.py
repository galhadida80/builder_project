from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr

from app.core.validators import CamelCaseModel


class WebAuthnRegisterBeginRequest(BaseModel):
    device_name: str = "Device"


class WebAuthnRegisterCompleteRequest(BaseModel):
    credential: dict
    device_name: str = "Device"


class WebAuthnLoginBeginRequest(BaseModel):
    email: EmailStr


class WebAuthnLoginCompleteRequest(BaseModel):
    email: EmailStr
    credential: dict


class WebAuthnCredentialResponse(CamelCaseModel):
    id: UUID
    device_name: str
    created_at: datetime


class WebAuthnCheckResponse(CamelCaseModel):
    has_credentials: bool


class WebAuthnRegisterOptionsResponse(CamelCaseModel):
    options: dict


class WebAuthnLoginOptionsResponse(CamelCaseModel):
    options: dict
