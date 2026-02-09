import logging
import traceback
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from app.config import get_settings
from app.api.v1.router import api_router
from app.utils.localization import get_language_from_request
from app.core.security_middleware import (
    SecurityHeadersMiddleware,
    validate_cors_origins,
)

logger = logging.getLogger(__name__)

settings = get_settings()


class LanguageDetectionMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        language = get_language_from_request(request)
        request.state.language = language
        request.state.accept_language = request.headers.get('Accept-Language', 'en')
        response = await call_next(request)
        return response


validated_origins = validate_cors_origins(settings.cors_origins, settings.environment)

app = FastAPI(
    title=settings.app_name,
    openapi_url=f"{settings.api_v1_prefix}/openapi.json",
    docs_url=f"{settings.api_v1_prefix}/docs" if settings.environment != "production" else None,
    redoc_url=f"{settings.api_v1_prefix}/redoc" if settings.environment != "production" else None,
)

app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(LanguageDetectionMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=validated_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept", "Accept-Language", "X-CSRF-Token"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Catch unhandled exceptions and return a sanitized error response."""
    if settings.environment == "development":
        logger.error("Unhandled exception: %s\n%s", str(exc), traceback.format_exc())
        return JSONResponse(
            status_code=500,
            content={"detail": f"Internal server error: {str(exc)}"},
        )

    logger.error("Unhandled exception on %s %s: %s", request.method, request.url.path, str(exc))
    return JSONResponse(
        status_code=500,
        content={"detail": "An unexpected error occurred. Please try again later."},
    )


app.include_router(api_router, prefix=settings.api_v1_prefix)


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
