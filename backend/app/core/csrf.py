"""CSRF token generation and validation for defense-in-depth."""

import hashlib
import secrets
from datetime import datetime, timedelta


class CSRFTokenManager:
    """Manage CSRF tokens for state-changing operations."""

    def __init__(self, token_lifetime_hours: int = 24):
        self.token_lifetime = timedelta(hours=token_lifetime_hours)
        self.token_store = {}

    def generate_token(self, user_id: str) -> str:
        """Generate a new CSRF token for a user."""
        token = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(token.encode()).hexdigest()

        self.token_store[token_hash] = {
            'user_id': user_id,
            'created_at': datetime.utcnow(),
            'expires_at': datetime.utcnow() + self.token_lifetime
        }

        return token

    def validate_token(self, token: str, user_id: str) -> bool:
        """Validate a CSRF token for a user."""
        token_hash = hashlib.sha256(token.encode()).hexdigest()

        if token_hash not in self.token_store:
            return False

        token_data = self.token_store[token_hash]

        # Check if token belongs to user
        if token_data['user_id'] != user_id:
            return False

        # Check if token is expired
        if datetime.utcnow() > token_data['expires_at']:
            del self.token_store[token_hash]
            return False

        return True

    def consume_token(self, token: str, user_id: str) -> bool:
        """Validate and consume a token (removes it after validation)."""
        if self.validate_token(token, user_id):
            token_hash = hashlib.sha256(token.encode()).hexdigest()
            del self.token_store[token_hash]
            return True
        return False

    def cleanup_expired_tokens(self):
        """Remove expired tokens from storage."""
        expired = [
            token_hash
            for token_hash, data in self.token_store.items()
            if datetime.utcnow() > data['expires_at']
        ]
        for token_hash in expired:
            del self.token_store[token_hash]


csrf_manager = CSRFTokenManager()
