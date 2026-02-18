#!/bin/sh
set -e

echo "=== Running database migrations ==="
if alembic upgrade head; then
    echo "=== Migrations completed successfully ==="
else
    echo "=== WARNING: Migrations failed (exit code $?) ==="
    echo "=== Starting server anyway — app may work with partial schema ==="
fi

echo "=== Testing route imports one by one ==="
python3 -u -c "
import sys, importlib

def log(msg):
    sys.stderr.write(msg + '\n')
    sys.stderr.flush()

modules = [
    'admin', 'analytics', 'analytics_bi', 'approvals', 'areas', 'audit',
    'auth', 'bim', 'bim_extract', 'budget', 'chat', 'checklists',
    'consultant_assignments', 'consultant_types', 'contact_groups', 'contacts',
    'daily_summary', 'defects', 'discussions', 'document_analysis',
    'document_reviews', 'equipment', 'equipment_templates', 'files',
    'inspections', 'invitations', 'material_templates', 'materials',
    'meetings', 'notifications', 'organizations', 'projects', 'reports',
    'rfis', 'tasks_api', 'webhooks', 'workload', 'ws',
]

for mod in modules:
    log(f'Importing app.api.v1.{mod}...')
    importlib.import_module(f'app.api.v1.{mod}')

log('ALL ROUTE IMPORTS OK')
" 2>&1 || echo "=== ROUTE IMPORT FAILED ==="

echo "=== Starting uvicorn on port ${PORT:-8080} ==="
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8080}" --log-level info
