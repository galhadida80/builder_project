#!/usr/bin/env python3
"""Script to run Alembic migrations programmatically."""
import sys
import os

# Set environment variables for database connections
os.environ.setdefault('DATABASE_URL', 'postgresql+asyncpg://postgres:postgres@localhost:5432/builder_db')
os.environ.setdefault('DATABASE_URL_SYNC', 'postgresql://postgres:postgres@localhost:5432/builder_db')
os.environ.setdefault('DEBUG', 'true')

def main():
    """Run alembic upgrade head."""
    try:
        from alembic.config import Config
        from alembic import command

        # Create Alembic configuration
        alembic_cfg = Config("alembic.ini")
        alembic_cfg.set_main_option("sqlalchemy.url", os.environ.get('DATABASE_URL'))

        # Run upgrade to head
        print("Running alembic upgrade head...")
        command.upgrade(alembic_cfg, "head")
        print("Migration completed successfully!")

        # Show current revision
        print("\nCurrent revision:")
        command.current(alembic_cfg)

        return 0
    except Exception as e:
        print(f"Error running migration: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return 1

if __name__ == "__main__":
    sys.exit(main())
