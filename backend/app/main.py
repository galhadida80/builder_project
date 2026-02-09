import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from app.config import get_settings
from app.api.v1.router import api_router
from app.utils.localization import get_language_from_request
from app.db.seeds.consultant_types import seed_consultant_types
from app.db.seeds.equipment_templates import seed_equipment_templates
from app.db.seeds.material_templates import seed_material_templates

logger = logging.getLogger(__name__)
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        await seed_consultant_types()
        await seed_equipment_templates()
        await seed_material_templates()
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


app = FastAPI(
    title=settings.app_name,
    openapi_url=f"{settings.api_v1_prefix}/openapi.json",
    docs_url=f"{settings.api_v1_prefix}/docs",
    lifespan=lifespan,
)

app.add_middleware(LanguageDetectionMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.api_v1_prefix)


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
