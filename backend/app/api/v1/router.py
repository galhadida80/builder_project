from fastapi import APIRouter
from app.api.v1 import projects, equipment, equipment_templates, materials, meetings, approvals, areas, contacts, files, audit, auth, checklist_templates, analytics, rfis, webhooks

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(projects.router, prefix="/projects", tags=["projects"])
api_router.include_router(equipment.router, tags=["equipment"])
api_router.include_router(equipment_templates.router, tags=["equipment_templates"])
api_router.include_router(materials.router, tags=["materials"])
api_router.include_router(meetings.router, tags=["meetings"])
api_router.include_router(approvals.router, tags=["approvals"])
api_router.include_router(areas.router, tags=["areas"])
api_router.include_router(contacts.router, tags=["contacts"])
api_router.include_router(files.router, tags=["files"])
api_router.include_router(audit.router, tags=["audit"])
api_router.include_router(checklist_templates.router, tags=["checklist_templates"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
api_router.include_router(rfis.router, prefix="/rfis", tags=["rfis"])
api_router.include_router(webhooks.router, prefix="/webhooks", tags=["webhooks"])
