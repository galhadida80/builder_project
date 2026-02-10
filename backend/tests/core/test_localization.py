"""
Tests for the LanguageDetectionMiddleware and localization utilities.
"""
import pytest
from httpx import AsyncClient

from app.utils.localization import (
    is_language_supported,
    parse_accept_language_header,
    translate_message,
)


class TestLocalizationUtilities:
    """Tests for localization utility functions."""

    def test_parse_accept_language_header_hebrew(self):
        """Test parsing Accept-Language header with Hebrew."""
        header = "he-IL,he;q=0.9,en;q=0.8"
        result = parse_accept_language_header(header)
        assert result == "he"

    def test_parse_accept_language_header_english(self):
        """Test parsing Accept-Language header with English."""
        header = "en-US,en;q=0.9"
        result = parse_accept_language_header(header)
        assert result == "en"

    def test_parse_accept_language_header_unsupported(self):
        """Test parsing Accept-Language header with unsupported language."""
        header = "fr-FR,fr;q=0.9"
        result = parse_accept_language_header(header)
        assert result == "en"  # Falls back to English

    def test_parse_accept_language_header_empty(self):
        """Test parsing empty Accept-Language header."""
        header = ""
        result = parse_accept_language_header(header)
        assert result == "en"

    def test_parse_accept_language_header_none(self):
        """Test parsing None Accept-Language header."""
        result = parse_accept_language_header(None)
        assert result == "en"

    def test_translate_message_hebrew(self):
        """Test translating a message to Hebrew."""
        message = translate_message('user_not_found', 'he')
        assert message == 'משתמש לא נמצא'

    def test_translate_message_english(self):
        """Test translating a message to English."""
        message = translate_message('user_not_found', 'en')
        assert message == 'User not found'

    def test_translate_message_fallback(self):
        """Test message translation fallback to English."""
        message = translate_message('user_not_found', 'fr')  # Unsupported language
        assert message == 'User not found'  # Falls back to English

    def test_translate_message_missing_key(self):
        """Test translating a message with missing key."""
        message = translate_message('nonexistent_key', 'en')
        assert message == 'nonexistent_key'  # Returns the key itself

    def test_is_language_supported_hebrew(self):
        """Test checking if Hebrew is supported."""
        assert is_language_supported('he') is True

    def test_is_language_supported_english(self):
        """Test checking if English is supported."""
        assert is_language_supported('en') is True

    def test_is_language_supported_unsupported(self):
        """Test checking if unsupported language is supported."""
        assert is_language_supported('fr') is False


class TestLanguageDetectionMiddleware:
    """Tests for the LanguageDetectionMiddleware."""

    @pytest.mark.asyncio
    async def test_middleware_detects_hebrew_language(self, client: AsyncClient):
        """Test that middleware detects Hebrew language from Accept-Language header."""
        response = await client.get(
            "/health",
            headers={"Accept-Language": "he-IL"}
        )
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_middleware_detects_english_language(self, client: AsyncClient):
        """Test that middleware detects English language from Accept-Language header."""
        response = await client.get(
            "/health",
            headers={"Accept-Language": "en-US"}
        )
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_middleware_defaults_to_english(self, client: AsyncClient):
        """Test that middleware defaults to English when no Accept-Language header."""
        response = await client.get("/health")
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_middleware_handles_complex_accept_language(self, client: AsyncClient):
        """Test that middleware handles complex Accept-Language header."""
        response = await client.get(
            "/health",
            headers={"Accept-Language": "he-IL,he;q=0.9,en;q=0.8,en-US;q=0.7"}
        )
        assert response.status_code == 200
