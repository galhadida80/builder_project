#!/usr/bin/env python3
"""
Test Alembic migration rollback functionality.
This script tests both downgrade and upgrade operations using the Python API.
"""

import sys
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from alembic.config import Config

from alembic import command


def test_migration_rollback():
    """Test migration rollback by downgrading and then upgrading."""
    try:
        # Create Alembic config
        alembic_cfg = Config(str(backend_dir / "alembic.ini"))
        alembic_cfg.set_main_option("script_location", str(backend_dir / "alembic"))

        print("=" * 60)
        print("MIGRATION ROLLBACK TEST")
        print("=" * 60)

        # Test downgrade
        print("\n[1/2] Running migration downgrade -1...")
        try:
            command.downgrade(alembic_cfg, "-1")
            print("✓ Downgrade completed successfully!")
        except Exception as e:
            print(f"✗ Downgrade failed: {e}", file=sys.stderr)
            return 1

        # Test upgrade
        print("\n[2/2] Running migration upgrade head...")
        try:
            command.upgrade(alembic_cfg, "head")
            print("✓ Upgrade completed successfully!")
        except Exception as e:
            print(f"✗ Upgrade failed: {e}", file=sys.stderr)
            return 1

        print("\n" + "=" * 60)
        print("✓ ROLLBACK TEST PASSED")
        print("=" * 60)
        print("\nBoth downgrade and upgrade operations succeeded.")
        print("Migration is reversible and can be safely applied/rolled back.")
        return 0

    except Exception as e:
        print(f"\n✗ Rollback test failed: {e}", file=sys.stderr)
        return 1

if __name__ == "__main__":
    sys.exit(test_migration_rollback())
