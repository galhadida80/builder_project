from fastapi import APIRouter
from app.api.v1 import projects, equipment, materials, meetings, approvals, areas, contacts, files, audit, auth, consultant_types, inspections

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(projects.router, prefix="/projects", tags=["projects"])
api_router.include_router(equipment.router, tags=["equipment"])
api_router.include_router(materials.router, tags=["materials"])
api_router.include_router(meetings.router, tags=["meetings"])
api_router.include_router(approvals.router, tags=["approvals"])
api_router.include_router(areas.router, tags=["areas"])
api_router.include_router(contacts.router, tags=["contacts"])
api_router.include_router(files.router, tags=["files"])
api_router.include_router(audit.router, tags=["audit"])
api_router.include_router(consultant_types.router, tags=["consultant-types"])
api_router.include_router(inspections.router, tags=["inspections"])
