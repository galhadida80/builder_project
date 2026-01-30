"""
Localization utilities for translating API messages based on Accept-Language header.

This module provides functions to:
- Extract language preference from request headers
- Translate error messages and API responses
- Support multiple languages (currently English and Hebrew)
"""

from typing import Dict, Optional
from fastapi import Request


# Default translation messages
# These will be expanded with JSON-based translation files in subtask-3-2
DEFAULT_MESSAGES: Dict[str, Dict[str, str]] = {
    'en': {
        'email_already_registered': 'Email already registered',
        'invalid_credentials': 'Invalid email or password',
        'account_inactive': 'Account is inactive',
        'not_authenticated': 'Not authenticated',
        'invalid_or_expired_token': 'Invalid or expired token',
        'user_not_found': 'User not found',
        'user_inactive': 'User is inactive',
        'access_denied': 'Access denied',
        'resource_not_found': 'Resource not found',
        'invalid_input': 'Invalid input provided',
        'server_error': 'Internal server error occurred',
        'unauthorized_access': 'Unauthorized access',
        'method_not_allowed': 'Method not allowed',
        'conflict': 'Resource conflict',
        'validation_error': 'Validation error',
    },
    'he': {
        'email_already_registered': 'הדוא״ל כבר רשום',
        'invalid_credentials': 'דוא״ל או סיסמה לא תקינים',
        'account_inactive': 'החשבון אינו פעיל',
        'not_authenticated': 'לא מאומת',
        'invalid_or_expired_token': 'טוקן לא תקין או פג תוקף',
        'user_not_found': 'משתמש לא נמצא',
        'user_inactive': 'משתמש אינו פעיל',
        'access_denied': 'גישה נדחתה',
        'resource_not_found': 'הרסורס לא נמצא',
        'invalid_input': 'קלט לא תקין',
        'server_error': 'שגיאה בשרת פנימית',
        'unauthorized_access': 'גישה לא מורשית',
        'method_not_allowed': 'שיטה לא מותרת',
        'conflict': 'ניגוד משאבים',
        'validation_error': 'שגיאת תיקוף',
    }
}

# Supported languages
SUPPORTED_LANGUAGES = ['en', 'he']
DEFAULT_LANGUAGE = 'en'


def parse_accept_language_header(accept_language: str) -> str:
    """
    Parse Accept-Language header to extract the primary language code.

    Args:
        accept_language: The Accept-Language header value (e.g., 'he-IL,he;q=0.9,en;q=0.8')

    Returns:
        Language code (e.g., 'he', 'en'). Returns 'en' if unable to parse.
    """
    if not accept_language:
        return DEFAULT_LANGUAGE

    # Split by comma to get language preferences
    languages = accept_language.split(',')
    for lang_pref in languages:
        # Split by semicolon to separate language from quality factor
        lang_code = lang_pref.split(';')[0].strip()
        # Get the primary language code (before '-' in cases like 'he-IL')
        primary_lang = lang_code.split('-')[0].lower()
        # Return the first supported language found
        if primary_lang in SUPPORTED_LANGUAGES:
            return primary_lang

    return DEFAULT_LANGUAGE


def get_language_from_request(request: Request) -> str:
    """
    Extract the user's preferred language from the request.

    First checks the Accept-Language header, then falls back to default language.

    Args:
        request: FastAPI Request object

    Returns:
        Language code ('en' or 'he')
    """
    accept_language = request.headers.get('Accept-Language', DEFAULT_LANGUAGE)
    return parse_accept_language_header(accept_language)


def translate_message(message_key: str, language: str, messages: Optional[Dict[str, Dict[str, str]]] = None) -> str:
    """
    Translate a message key to the specified language.

    Falls back to English if the key is not found in the specified language.
    If the language is not supported, uses English as fallback.

    Args:
        message_key: The translation key (e.g., 'email_already_registered')
        language: Language code ('en' or 'he')
        messages: Optional custom messages dictionary. Uses DEFAULT_MESSAGES if not provided.

    Returns:
        Translated message string, or the key itself if translation not found
    """
    if messages is None:
        messages = DEFAULT_MESSAGES

    # Normalize language to supported languages
    if language not in SUPPORTED_LANGUAGES:
        language = DEFAULT_LANGUAGE

    # Try to get translation in requested language
    if language in messages and message_key in messages[language]:
        return messages[language][message_key]

    # Fallback to English if key not found in requested language
    if message_key in messages[DEFAULT_LANGUAGE]:
        return messages[DEFAULT_LANGUAGE][message_key]

    # Return the key itself if no translation found
    return message_key


def get_error_message(message_key: str, request: Request, messages: Optional[Dict[str, Dict[str, str]]] = None) -> str:
    """
    Get an error message translated to the user's preferred language from request.

    Convenience function that combines language detection and translation.

    Args:
        message_key: The translation key for the error message
        request: FastAPI Request object
        messages: Optional custom messages dictionary

    Returns:
        Translated error message
    """
    language = get_language_from_request(request)
    return translate_message(message_key, language, messages)


def is_language_supported(language: str) -> bool:
    """
    Check if a language is supported.

    Args:
        language: Language code to check

    Returns:
        True if language is supported, False otherwise
    """
    return language.lower() in SUPPORTED_LANGUAGES
