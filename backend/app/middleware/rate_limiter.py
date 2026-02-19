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
    storage_uri = "memory://"

    if not settings.rate_limit_enabled:
        pass
    elif "localhost" in settings.redis_url or "127.0.0.1" in settings.redis_url:
        if settings.environment == "production":
            logger.info("Skipping localhost Redis in production, using in-memory rate limiting")
        else:
            try:
                import redis
                r = redis.from_url(settings.redis_url, socket_connect_timeout=1)
                r.ping()
                storage_uri = settings.redis_url
            except Exception:
                logger.warning("Redis unavailable, falling back to in-memory rate limiting")
    elif settings.redis_url.startswith("redis://"):
        storage_uri = settings.redis_url

    limiter = Limiter(
        key_func=get_client_identifier,
        storage_uri=storage_uri,
        enabled=settings.rate_limit_enabled,
        headers_enabled=True,
    )

    logger.info(
        f"Rate limiter initialized: enabled={settings.rate_limit_enabled}, "
        f"storage={storage_uri}"
    )

    return limiter
