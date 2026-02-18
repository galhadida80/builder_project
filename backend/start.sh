#!/bin/sh
set -e

echo "=== Running database migrations ==="
if alembic upgrade head; then
    echo "=== Migrations completed successfully ==="
else
    echo "=== WARNING: Migrations failed (exit code $?) ==="
    echo "=== Starting server anyway — app may work with partial schema ==="
fi

echo "=== Testing app import step by step ==="
python3 -u -c "
import sys
def log(msg):
    sys.stderr.write(msg + '\n')
    sys.stderr.flush()

log('STEP 1: importing fastapi')
import fastapi
log('STEP 2: importing app.config')
from app.config import get_settings
log('STEP 3: get_settings()')
settings = get_settings()
log('STEP 4: importing app.db.session')
from app.db.session import Base, AsyncSessionLocal
log('STEP 5: importing app.api.v1.router')
from app.api.v1.router import api_router
log('STEP 6: importing app.middleware.rate_limiter')
from app.middleware.rate_limiter import get_rate_limiter
log('STEP 7: importing app.services.mcp_server')
from app.services.mcp_server import mcp
log('STEP 8: importing app.main')
from app.main import app
log('ALL IMPORTS OK')
" 2>&1 || echo "=== IMPORT FAILED ==="

echo "=== Starting uvicorn on port ${PORT:-8080} ==="
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8080}" --log-level info
