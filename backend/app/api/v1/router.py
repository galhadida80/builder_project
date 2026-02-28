from fastapi import APIRouter

from app.api.v1 import (
    admin,
    analytics,
    analytics_bi,
    approvals,
    area_structure,
    areas,
    audit,
    auth,
    billing,
    bim,
    bim_extract,
    blueprints,
    budget,
    calendar,
    chat,
    checklists,
    consultant_assignments,
    consultant_types,
    contact_groups,
    contacts,
    daily_summary,
    defects,
    discussions,
    document_analysis,
    document_reviews,
    document_versions,
    equipment,
    equipment_templates,
    exports,
    files,
    inspections,
    invitations,
    material_templates,
    materials,
    meetings,
    notifications,
    organization_exports,
    organizations,
    payment_webhooks,
    projects,
    quantity_extraction,
    reports,
    rfis,
    subscriptions,
    tasks_api,
    webhooks,
    whatsapp,
    work_summary,
    workload,
    subcontractors,
    ws,
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
api_router.include_router(area_structure.router, tags=["area_structure"])
api_router.include_router(contacts.router, tags=["contacts"])
api_router.include_router(contact_groups.router, tags=["contact_groups"])
api_router.include_router(files.router, tags=["files"])
api_router.include_router(audit.router, tags=["audit"])
api_router.include_router(checklists.router, tags=["checklists"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
api_router.include_router(rfis.router, tags=["rfis"])
api_router.include_router(webhooks.router, tags=["webhooks"])
api_router.include_router(whatsapp.router, prefix="/whatsapp", tags=["whatsapp"])
api_router.include_router(subscriptions.router, tags=["subscriptions"])
api_router.include_router(billing.router, tags=["billing"])
api_router.include_router(payment_webhooks.router, tags=["payment_webhooks"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["notifications"])
api_router.include_router(workload.router, tags=["workload"])
api_router.include_router(consultant_types.router, tags=["consultant_types"])
api_router.include_router(consultant_assignments.router, tags=["consultant_assignments"])
api_router.include_router(document_reviews.router, tags=["document_reviews"])
api_router.include_router(document_analysis.router, tags=["document_analysis"])
api_router.include_router(document_versions.router, tags=["document_versions"])
api_router.include_router(chat.router, tags=["chat"])
api_router.include_router(inspections.router, tags=["inspections"])
api_router.include_router(invitations.router, tags=["invitations"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
api_router.include_router(daily_summary.router, prefix="/tasks", tags=["tasks"])
api_router.include_router(bim.router, tags=["bim"])
api_router.include_router(blueprints.router, tags=["blueprints"])
api_router.include_router(bim_extract.router, tags=["bim_extract"])
api_router.include_router(defects.router, tags=["defects"])
api_router.include_router(tasks_api.router, tags=["project_tasks"])
api_router.include_router(budget.router, tags=["budget"])
api_router.include_router(organizations.router, tags=["organizations"])
api_router.include_router(analytics_bi.router, prefix="/analytics", tags=["analytics_bi"])
api_router.include_router(ws.router, tags=["websocket"])
api_router.include_router(calendar.router, tags=["calendar"])
api_router.include_router(discussions.router, tags=["discussions"])
api_router.include_router(quantity_extraction.router, tags=["quantity_extraction"])
api_router.include_router(reports.router, tags=["reports"])
api_router.include_router(exports.router, tags=["exports"])
api_router.include_router(organization_exports.router, tags=["exports"])
api_router.include_router(subcontractors.router, tags=["subcontractors"])
api_router.include_router(work_summary.router, prefix="/auth", tags=["auth"])
