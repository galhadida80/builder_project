#!/bin/sh
set -e

echo "=== Running database migrations ==="
if alembic upgrade head; then
    echo "=== Migrations completed successfully ==="
else
    echo "=== WARNING: Migrations failed (exit code $?) ==="
    echo "=== Starting server anyway — app may work with partial schema ==="
fi

echo "=== Testing app import ==="
python3 -c "from app.main import app; print('App import OK')" 2>&1 || echo "=== APP IMPORT FAILED ==="

echo "=== Starting uvicorn on port ${PORT:-8080} ==="
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8080}" --log-level info
