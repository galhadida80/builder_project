"""
Localization utilities for translating API messages based on Accept-Language header.

This module provides functions to:
- Extract language preference from request headers
- Translate error messages and API responses
- Support multiple languages (currently English and Hebrew)
- Load translations from JSON files
"""

import json
import os
from typing import Dict, Optional, Any
from fastapi import Request


# Load translation files
def _load_translation_files() -> Dict[str, Dict[str, Any]]:
    """
    Load translation files from the locales directory.

    Returns:
        Dictionary with language codes as keys and translation dictionaries as values
    """
    translations = {}
    locales_dir = os.path.join(os.path.dirname(__file__), '..', 'locales')

    for lang in ['en', 'he']:
        file_path = os.path.join(locales_dir, f'{lang}.json')
        if os.path.exists(file_path):
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    translations[lang] = json.load(f)
            except (json.JSONDecodeError, IOError) as e:
                print(f"Warning: Failed to load {lang}.json: {e}")
                translations[lang] = {}
        else:
            translations[lang] = {}

    return translations


# Load messages on module import
_LOADED_MESSAGES = _load_translation_files()

# Default translation messages (flat structure for backward compatibility)
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
        'project_not_found': 'Project not found',
        'equipment_not_found': 'Equipment not found',
        'material_not_found': 'Material not found',
        'meeting_not_found': 'Meeting not found',
        'approval_not_found': 'Approval not found',
        'area_not_found': 'Area not found',
        'contact_not_found': 'Contact not found',
        'file_not_found': 'File not found',
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
        'project_not_found': 'הפרויקט לא נמצא',
        'equipment_not_found': 'הציוד לא נמצא',
        'material_not_found': 'החומר לא נמצא',
        'meeting_not_found': 'הפגישה לא נמצאה',
        'approval_not_found': 'האישור לא נמצא',
        'area_not_found': 'האזור לא נמצא',
        'contact_not_found': 'איש הקשר לא נמצא',
        'file_not_found': 'הקובץ לא נמצא',
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


def _get_nested_value(obj: Dict[str, Any], path: str) -> Optional[str]:
    """
    Get a value from a nested dictionary using dot notation.

    Args:
        obj: The dictionary to search
        path: The path to the value (e.g., 'auth.invalid_credentials')

    Returns:
        The value if found, None otherwise
    """
    keys = path.split('.')
    current = obj
    for key in keys:
        if isinstance(current, dict) and key in current:
            current = current[key]
        else:
            return None
    return str(current) if current is not None else None


def translate_message(message_key: str, language: str, messages: Optional[Dict[str, Any]] = None) -> str:
    """
    Translate a message key to the specified language.

    Falls back to English if the key is not found in the specified language.
    If the language is not supported, uses English as fallback.

    Supports both flat keys (e.g., 'invalid_credentials') and hierarchical keys (e.g., 'auth.invalid_credentials').

    Args:
        message_key: The translation key (e.g., 'email_already_registered' or 'auth.invalid_credentials')
        language: Language code ('en' or 'he')
        messages: Optional custom messages dictionary. Uses loaded JSON files if not provided.

    Returns:
        Translated message string, or the key itself if translation not found
    """
    # Normalize language to supported languages
    if language not in SUPPORTED_LANGUAGES:
        language = DEFAULT_LANGUAGE

    # Build ordered list of message sources to try
    sources = []
    if messages is not None:
        sources.append(messages)
    else:
        if _LOADED_MESSAGES and _LOADED_MESSAGES.get('en'):
            sources.append(_LOADED_MESSAGES)
        sources.append(DEFAULT_MESSAGES)

    for msgs in sources:
        # Try to get translation in requested language
        if language in msgs:
            lang_msgs = msgs[language]
            if '.' in message_key:
                result = _get_nested_value(lang_msgs, message_key)
                if result:
                    return result
            if isinstance(lang_msgs, dict) and message_key in lang_msgs:
                value = lang_msgs[message_key]
                return str(value) if value is not None else message_key

        # Fallback to English if key not found in requested language
        if DEFAULT_LANGUAGE in msgs:
            en_msgs = msgs[DEFAULT_LANGUAGE]
            if '.' in message_key:
                result = _get_nested_value(en_msgs, message_key)
                if result:
                    return result
            if isinstance(en_msgs, dict) and message_key in en_msgs:
                value = en_msgs[message_key]
                return str(value) if value is not None else message_key

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
