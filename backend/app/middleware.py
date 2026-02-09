import time
import uuid
from contextvars import ContextVar

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

request_id_ctx: ContextVar[str] = ContextVar("request_id", default="")

RATE_LIMIT_PER_MINUTE = 120
CACHE_CONTROL_MAX_AGE = 60
NO_CACHE_PATHS = {"/auth/login", "/auth/register", "/auth/me"}


class RequestIDMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        incoming_id = request.headers.get("X-Request-ID")
        req_id = incoming_id if incoming_id else str(uuid.uuid4())
        request_id_ctx.set(req_id)
        request.state.request_id = req_id
        response = await call_next(request)
        response.headers["X-Request-ID"] = req_id
        return response


class RateLimitHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(RATE_LIMIT_PER_MINUTE)
        response.headers["X-RateLimit-Remaining"] = str(RATE_LIMIT_PER_MINUTE - 1)
        response.headers["X-RateLimit-Reset"] = str(int(time.time()) + 60)
        return response


class CacheControlMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)
        if request.method != "GET":
            response.headers["Cache-Control"] = "no-store"
            return response

        path = request.url.path
        if any(path.endswith(p) for p in NO_CACHE_PATHS):
            response.headers["Cache-Control"] = "no-store"
            return response

        if "/files/" in path and path.endswith("/content"):
            response.headers["Cache-Control"] = f"private, max-age={CACHE_CONTROL_MAX_AGE * 10}"
            return response

        response.headers["Cache-Control"] = f"private, max-age={CACHE_CONTROL_MAX_AGE}"
        return response
