#!/bin/bash
#
# Helper script to run consultant types seeding with verification
#
# Usage:
#   ./run_seeding.sh              # Run seeding and verify
#   ./run_seeding.sh --dry-run    # Test without database
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "========================================================================"
echo "Consultant Types Seeding Script"
echo "========================================================================"
echo ""

# Check if dry-run mode
if [ "$1" == "--dry-run" ]; then
    echo "Running in DRY-RUN mode (no database required)..."
    echo ""
    source venv/bin/activate
    python scripts/seed_consultant_types.py --dry-run
    exit 0
fi

# Check if database is accessible
echo "Step 1: Checking database connection..."
if ! python -c "import psycopg2; conn = psycopg2.connect('dbname=builder_db user=postgres password=postgres host=localhost'); conn.close()" 2>/dev/null; then
    echo "❌ Database not accessible"
    echo ""
    echo "To start the database:"
    echo "  docker-compose up -d db"
    echo ""
    echo "Or run in dry-run mode to verify the script:"
    echo "  ./run_seeding.sh --dry-run"
    echo ""
    exit 1
fi
echo "✓ Database accessible"
echo ""

# Activate virtual environment and run seeding
echo "Step 2: Running seeding script..."
source venv/bin/activate
python scripts/seed_consultant_types.py

echo ""
echo "Step 3: Verifying count..."
python verify_seeding.py

echo ""
echo "========================================================================"
echo "✓ Seeding completed successfully!"
echo "========================================================================"
