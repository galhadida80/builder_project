from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.middleware.base import BaseHTTPMiddleware

from app.config import get_settings
from app.api.v1.router import api_router
from app.exception_handlers import http_exception_handler, validation_exception_handler, generic_exception_handler
from app.middleware import RequestIDMiddleware, RateLimitHeadersMiddleware, CacheControlMiddleware
from app.utils.localization import get_language_from_request

settings = get_settings()


class LanguageDetectionMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        language = get_language_from_request(request)
        request.state.language = language
        request.state.accept_language = request.headers.get('Accept-Language', 'en')
        response = await call_next(request)
        return response


app = FastAPI(
    title=settings.app_name,
    openapi_url=f"{settings.api_v1_prefix}/openapi.json",
    docs_url=f"{settings.api_v1_prefix}/docs",
)

app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, generic_exception_handler)

app.add_middleware(CacheControlMiddleware)
app.add_middleware(RateLimitHeadersMiddleware)
app.add_middleware(LanguageDetectionMiddleware)
app.add_middleware(RequestIDMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID", "X-RateLimit-Limit", "X-RateLimit-Remaining", "X-RateLimit-Reset"],
)

app.include_router(api_router, prefix=settings.api_v1_prefix)


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
