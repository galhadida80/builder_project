from pydantic import BaseModel, Field, field_validator

from app.core.validators import CamelCaseModel


class WhatsAppWebhookRequest(BaseModel):
    """Twilio WhatsApp webhook request payload"""
    From: str = Field(..., alias="From", description="Sender's WhatsApp number (e.g., whatsapp:+972501234567)")
    Body: str = Field(..., alias="Body", min_length=1, max_length=2000, description="Message content")
    MessageSid: str = Field(..., alias="MessageSid", description="Twilio message ID")

    class Config:
        populate_by_name = True


class WhatsAppLinkRequest(BaseModel):
    """Request to link a WhatsApp number to user account"""
    whatsapp_number: str = Field(
        ...,
        min_length=10,
        max_length=50,
        description="WhatsApp phone number in E.164 format (e.g., +972501234567)"
    )

    @field_validator("whatsapp_number")
    @classmethod
    def validate_whatsapp_number(cls, v: str) -> str:
        """Validate WhatsApp number format"""
        # Remove whitespace
        v = v.strip()

        # Must start with +
        if not v.startswith("+"):
            raise ValueError("WhatsApp number must start with + and include country code (e.g., +972501234567)")

        # Remove + and check if remaining chars are digits
        digits = v[1:]
        if not digits.isdigit():
            raise ValueError("WhatsApp number must contain only digits after the + sign")

        # Must have at least 10 digits (country code + number)
        if len(digits) < 10:
            raise ValueError("WhatsApp number must have at least 10 digits")

        return v


class WhatsAppVerifyRequest(BaseModel):
    """Request to verify WhatsApp number with code"""
    code: str = Field(..., min_length=4, max_length=10, description="Verification code sent via WhatsApp")


class WhatsAppLinkResponse(CamelCaseModel):
    """Response after initiating WhatsApp link"""
    message: str
    whatsapp_number: str
    verification_required: bool = True


class WhatsAppVerifyResponse(CamelCaseModel):
    """Response after successful WhatsApp verification"""
    message: str
    whatsapp_number: str
    verified: bool


class WhatsAppUnlinkResponse(CamelCaseModel):
    """Response after unlinking WhatsApp"""
    message: str
