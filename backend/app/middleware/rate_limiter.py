"""Rate limiting middleware using slowapi."""

import logging
from functools import lru_cache

from fastapi import Request
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


def get_client_identifier(request: Request) -> str:
    """
    Get a unique identifier for rate limiting.

    Uses the client IP address from X-Forwarded-For header if present,
    otherwise falls back to the remote address.

    Args:
        request: The FastAPI request object

    Returns:
        str: The client identifier (IP address)
    """
    # Check for X-Forwarded-For header (for proxied requests)
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        # X-Forwarded-For can contain multiple IPs, use the first one
        return forwarded.split(",")[0].strip()

    # Fall back to direct remote address
    return get_remote_address(request)


@lru_cache
def get_rate_limiter() -> Limiter:
    """
    Get the configured rate limiter instance.

    This function creates and caches a Limiter instance configured with:
    - Redis storage backend for distributed rate limiting
    - Custom key function to identify clients by IP address
    - Settings from application configuration

    Returns:
        Limiter: Configured slowapi Limiter instance
    """
    limiter = Limiter(
        key_func=get_client_identifier,
        storage_uri=settings.redis_url,
        enabled=settings.rate_limit_enabled,
        headers_enabled=True,  # Add rate limit headers to responses
    )

    logger.info(
        f"Rate limiter initialized: enabled={settings.rate_limit_enabled}, "
        f"storage={settings.redis_url}"
    )

    return limiter
