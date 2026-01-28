#!/usr/bin/env python3
"""
Run Alembic migrations programmatically.
This script bypasses the alembic CLI and uses the Python API directly.
"""

import sys
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from alembic.config import Config
from alembic import command

def run_migration_upgrade():
    """Run alembic upgrade head using the Python API."""
    try:
        # Create Alembic config
        alembic_cfg = Config(str(backend_dir / "alembic.ini"))
        alembic_cfg.set_main_option("script_location", str(backend_dir / "alembic"))

        print("Running migration upgrade to head...")
        command.upgrade(alembic_cfg, "head")
        print("✓ Migration completed successfully!")
        return 0

    except Exception as e:
        print(f"✗ Migration failed: {e}", file=sys.stderr)
        return 1

if __name__ == "__main__":
    sys.exit(run_migration_upgrade())
