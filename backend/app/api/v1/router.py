from fastapi import APIRouter

from app.api.v1 import (
    admin,
    analytics,
    approvals,
    areas,
    audit,
    auth,
    bim,
    bim_extract,
    chat,
    checklists,
    consultant_assignments,
    consultant_types,
    contact_groups,
    contacts,
    daily_summary,
    document_analysis,
    document_reviews,
    equipment,
    equipment_templates,
    files,
    inspections,
    invitations,
    material_templates,
    materials,
    meetings,
    notifications,
    projects,
    rfis,
    webhooks,
    workload,
)

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(projects.router, prefix="/projects", tags=["projects"])
api_router.include_router(equipment.router, tags=["equipment"])
api_router.include_router(equipment_templates.router, tags=["equipment_templates"])
api_router.include_router(material_templates.router, tags=["material_templates"])
api_router.include_router(materials.router, tags=["materials"])
api_router.include_router(meetings.router, tags=["meetings"])
api_router.include_router(approvals.router, tags=["approvals"])
api_router.include_router(areas.router, tags=["areas"])
api_router.include_router(contacts.router, tags=["contacts"])
api_router.include_router(contact_groups.router, tags=["contact_groups"])
api_router.include_router(files.router, tags=["files"])
api_router.include_router(audit.router, tags=["audit"])
api_router.include_router(checklists.router, tags=["checklists"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
api_router.include_router(rfis.router, tags=["rfis"])
api_router.include_router(webhooks.router, prefix="/webhooks", tags=["webhooks"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["notifications"])
api_router.include_router(workload.router, tags=["workload"])
api_router.include_router(consultant_types.router, tags=["consultant_types"])
api_router.include_router(consultant_assignments.router, tags=["consultant_assignments"])
api_router.include_router(document_reviews.router, tags=["document_reviews"])
api_router.include_router(document_analysis.router, tags=["document_analysis"])
api_router.include_router(chat.router, tags=["chat"])
api_router.include_router(inspections.router, tags=["inspections"])
api_router.include_router(invitations.router, tags=["invitations"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
api_router.include_router(daily_summary.router, prefix="/tasks", tags=["tasks"])
api_router.include_router(bim.router, tags=["bim"])
api_router.include_router(bim_extract.router, tags=["bim_extract"])
