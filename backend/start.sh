#!/bin/sh
set -e

echo "=== Running database migrations ==="
if alembic upgrade head; then
    echo "=== Migrations completed successfully ==="
else
    echo "=== WARNING: Migrations failed (exit code $?) ==="
    echo "=== Starting server anyway — app may work with partial schema ==="
fi

echo "=== Pre-loading route modules ==="
python3 -u -c "
import importlib
modules = [
    'admin', 'analytics', 'analytics_bi', 'approvals', 'area_structure',
    'areas', 'audit', 'auth', 'bim', 'bim_extract', 'budget', 'calendar',
    'chat', 'checklists', 'consultant_assignments', 'consultant_types',
    'contact_groups', 'contacts', 'daily_summary', 'defects', 'discussions',
    'document_analysis', 'document_reviews', 'document_versions', 'equipment',
    'equipment_templates', 'files', 'inspections', 'invitations',
    'material_templates', 'materials', 'meetings', 'notifications',
    'organizations', 'projects', 'quantity_extraction', 'reports', 'rfis',
    'subcontractors', 'tasks_api', 'webhooks', 'work_summary', 'workload',
    'ws',
]
for mod in modules:
    importlib.import_module(f'app.api.v1.{mod}')
print('All route modules loaded')
" || echo "=== WARNING: Module pre-load failed ==="

echo "=== Starting uvicorn on port ${PORT:-8080} ==="
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8080}" --log-level info
