"""Security middleware for HTTP response headers and rate limiting."""

import time
import logging
from collections import defaultdict
from typing import Callable, Dict, List
from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

logger = logging.getLogger(__name__)

SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    "Cache-Control": "no-store, no-cache, must-revalidate",
    "Pragma": "no-cache",
}


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Adds security headers to all HTTP responses."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        response = await call_next(request)
        for header_name, header_value in SECURITY_HEADERS.items():
            response.headers[header_name] = header_value
        return response


class RateLimitEntry:
    """Tracks request timestamps for a single client."""

    def __init__(self):
        self.timestamps: List[float] = []

    def clean_old(self, window_seconds: int, now: float) -> None:
        cutoff = now - window_seconds
        self.timestamps = [t for t in self.timestamps if t > cutoff]

    def add(self, now: float) -> None:
        self.timestamps.append(now)

    def count(self) -> int:
        return len(self.timestamps)


class RateLimiter:
    """In-memory rate limiter using sliding window per client IP."""

    def __init__(self, max_requests: int = 10, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.clients: Dict[str, RateLimitEntry] = defaultdict(RateLimitEntry)

    def is_rate_limited(self, client_ip: str) -> bool:
        now = time.monotonic()
        entry = self.clients[client_ip]
        entry.clean_old(self.window_seconds, now)

        if entry.count() >= self.max_requests:
            return True

        entry.add(now)
        return False

    def get_retry_after(self, client_ip: str) -> int:
        now = time.monotonic()
        entry = self.clients[client_ip]
        if not entry.timestamps:
            return 0
        oldest_in_window = min(entry.timestamps)
        return max(1, int(self.window_seconds - (now - oldest_in_window)))


auth_rate_limiter = RateLimiter(max_requests=10, window_seconds=60)


def check_rate_limit(request: Request) -> None:
    """Check rate limit for the current request. Raises 429 if exceeded."""
    client_ip = request.client.host if request.client else "unknown"
    if auth_rate_limiter.is_rate_limited(client_ip):
        retry_after = auth_rate_limiter.get_retry_after(client_ip)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many requests. Please try again later.",
            headers={"Retry-After": str(retry_after)},
        )


def validate_cors_origins(origins: list, environment: str) -> list:
    """Validate CORS origins and reject wildcard in production."""
    if environment == "production":
        if "*" in origins:
            logger.warning(
                "Wildcard CORS origin '*' is not allowed in production. "
                "Removing wildcard and using only explicit origins."
            )
            origins = [o for o in origins if o != "*"]

        validated = []
        for origin in origins:
            if not origin.startswith(("http://", "https://")):
                logger.warning("Skipping invalid CORS origin: %s", origin)
                continue
            validated.append(origin)
        return validated

    return origins
