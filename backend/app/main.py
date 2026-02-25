import logging
from contextlib import asynccontextmanager

import sentry_sdk
from sentry_sdk.integrations.logging import LoggingIntegration
from sentry_sdk.integrations.pydantic_ai import PydanticAiIntegration
from fastapi import FastAPI, Request
from fastapi.exceptions import ResponseValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.api.v1.router import api_router
from app.config import get_settings
from app.core.logging import RequestLoggingMiddleware, setup_logging
from app.middleware.rate_limiter import get_rate_limiter
from app.db.seeds.checklist_templates import seed_checklist_templates
from app.db.seeds.consultant_types import seed_consultant_types
from app.db.seeds.equipment_templates import seed_equipment_templates
from app.db.seeds.inspection_templates import seed_inspection_templates
from app.db.seeds.material_templates import seed_material_templates
from app.services.mcp_server import mcp
from app.utils.localization import get_language_from_request

settings = get_settings()
setup_logging(settings.environment)
logger = logging.getLogger(__name__)

sentry_logging = LoggingIntegration(
    level=logging.INFO,
    event_level=logging.WARNING,
)

sentry_sdk.init(
    dsn="https://18f4dcb8797d8e9fecbcc2d9d1093c42@o4510923130667008.ingest.de.sentry.io/4510923206295632",
    send_default_pii=True,
    enable_logs=True,
    traces_sample_rate=0.1,
    profile_session_sample_rate=0.1,
    profile_lifecycle="trace",
    environment=settings.environment,
    integrations=[sentry_logging],
    disabled_integrations=[PydanticAiIntegration],
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        await seed_consultant_types()
        await seed_equipment_templates()
        await seed_material_templates()
        await seed_inspection_templates()
        await seed_checklist_templates()
        logger.info("Database seeds completed successfully")
    except Exception as e:
        logger.error(f"Error running database seeds: {e}")
    yield


class LanguageDetectionMiddleware(BaseHTTPMiddleware):
    """
    Middleware to detect and store the user's language preference from Accept-Language header.

    This middleware:
    1. Extracts the Accept-Language header from the request
    2. Parses it to detect the preferred language
    3. Stores the detected language in request.state for access by route handlers
    """

    async def dispatch(self, request: Request, call_next):
        # Detect language from Accept-Language header
        language = get_language_from_request(request)

        # Store language in request state for access by route handlers
        request.state.language = language
        request.state.accept_language = request.headers.get('Accept-Language', 'en')

        # Continue processing the request
        response = await call_next(request)
        return response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Middleware to add security headers to all HTTP responses.

    This middleware:
    1. Adds X-Content-Type-Options header to prevent MIME-type sniffing attacks
    2. Adds X-Frame-Options header to prevent clickjacking attacks
    3. Adds Strict-Transport-Security header to enforce HTTPS connections
    4. Adds Content-Security-Policy header to mitigate XSS and injection attacks
    """

    async def dispatch(self, request: Request, call_next):
        # Process the request
        response = await call_next(request)

        # Add security headers to the response
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Frame-Options'] = 'DENY'
        response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
        # CSP requires 'unsafe-inline' and 'unsafe-eval' in script-src because the
        # Autodesk Forge viewer SDK (loaded from cdn.jsdelivr.net) uses inline scripts
        # and eval() for 3D rendering. This is the strictest policy possible given
        # that dependency. If Forge viewer is removed, tighten to just 'self'.
        response.headers['Content-Security-Policy'] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; "
            "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
            "img-src 'self' data: https:; "
            "font-src 'self' data:; "
            "connect-src 'self' https:; "
            "frame-ancestors 'none'; "
            "base-uri 'self'; "
            "form-action 'self';"
        )

        return response


limiter = get_rate_limiter()

app = FastAPI(
    title=settings.app_name,
    openapi_url=f"{settings.api_v1_prefix}/openapi.json",
    docs_url=f"{settings.api_v1_prefix}/docs",
    lifespan=lifespan,
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


@app.exception_handler(ResponseValidationError)
async def response_validation_error_handler(request: Request, exc: ResponseValidationError):
    logger.error(
        "ResponseValidationError on %s %s: %s",
        request.method,
        request.url.path,
        exc.errors(),
    )
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})

app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(LanguageDetectionMiddleware)
app.add_middleware(SecurityHeadersMiddleware)
cors_origins = ["*"] if settings.cors_origins == "*" else [o.strip() for o in settings.cors_origins.split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.api_v1_prefix)
app.mount("/mcp", mcp.http_app(stateless_http=True))


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
