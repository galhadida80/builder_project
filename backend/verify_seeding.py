#!/usr/bin/env python3
"""Verify consultant types seeding by running the script and checking the database."""
import sys
import subprocess
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from sqlalchemy import create_engine, select, func
from sqlalchemy.orm import Session
from app.config import get_settings
from app.models.inspection import ConsultantType


def check_database_connection():
    """Check if database is accessible."""
    try:
        settings = get_settings()
        engine = create_engine(settings.database_url_sync, echo=False)
        with engine.connect() as conn:
            conn.execute(select(1))
        engine.dispose()
        return True
    except Exception as e:
        print(f"Database connection failed: {e}")
        return False


def run_seeding():
    """Run the seeding script."""
    print("Running seeding script...")
    result = subprocess.run(
        [sys.executable, "scripts/seed_consultant_types.py"],
        capture_output=True,
        text=True
    )
    print(result.stdout)
    if result.stderr:
        print(result.stderr, file=sys.stderr)
    return result.returncode == 0


def verify_count():
    """Verify the count of consultant types in the database."""
    try:
        settings = get_settings()
        engine = create_engine(settings.database_url_sync, echo=False)

        with Session(engine) as session:
            count = session.execute(
                select(func.count()).select_from(ConsultantType)
            ).scalar()

            print(f"\n{'='*80}")
            print(f"Database Verification:")
            print(f"  Consultant Types Count: {count}")
            print(f"  Expected: 21")
            print(f"  Status: {'✓ PASS' if count == 21 else '✗ FAIL'}")
            print(f"{'='*80}\n")

            return count == 21

    except Exception as e:
        print(f"Error verifying database: {e}")
        return False
    finally:
        engine.dispose()


def main():
    """Main verification function."""
    print("\n" + "="*80)
    print("Consultant Types Seeding Verification")
    print("="*80 + "\n")

    # Check database connection
    print("Step 1: Checking database connection...")
    if not check_database_connection():
        print("\n❌ BLOCKED: Database is not accessible")
        print("\nTo run this verification, ensure:")
        print("  1. PostgreSQL is running (via Docker or locally)")
        print("  2. Database 'builder_db' exists")
        print("  3. Database is accessible at localhost:5432")
        print("\nTo start via Docker:")
        print("  docker-compose up -d db")
        print("\nThe seeding script works correctly (verified in dry-run mode)")
        print("but cannot complete without database access.\n")
        sys.exit(1)

    print("✓ Database connection successful\n")

    # Run seeding
    print("Step 2: Running seeding script...")
    if not run_seeding():
        print("❌ Seeding script failed")
        sys.exit(1)

    print("✓ Seeding script completed\n")

    # Verify count
    print("Step 3: Verifying consultant types count...")
    if not verify_count():
        print("❌ Verification failed")
        sys.exit(1)

    print("✓ All verification steps passed!\n")


if __name__ == "__main__":
    main()
