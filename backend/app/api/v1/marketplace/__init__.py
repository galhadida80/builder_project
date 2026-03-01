"""
Marketplace API endpoints.
Split into templates.py (browsing, detail, contribution) and actions.py (install, ratings).
"""

from fastapi import APIRouter

from app.api.v1.marketplace.actions import router as actions_router
from app.api.v1.marketplace.templates import router as templates_router

# Combine both routers into a single router for export
router = APIRouter()
router.include_router(templates_router, tags=["marketplace"])
router.include_router(actions_router, tags=["marketplace"])

__all__ = ["router"]
