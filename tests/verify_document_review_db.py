#!/usr/bin/env python3
"""
Verify database state and migrations for document review feature.
This script checks:
1. Current alembic migration state
2. Existence of document_reviews and document_comments tables
3. Table schema and indexes
"""

import sys
import os
from pathlib import Path

# Add backend to path
backend_path = Path(__file__).parent / "backend"
sys.path.insert(0, str(backend_path))

def check_alembic_state():
    """Check the current alembic migration state"""
    print("=" * 60)
    print("CHECKING ALEMBIC MIGRATION STATE")
    print("=" * 60)

    try:
        from alembic.config import Config
        from alembic.script import ScriptDirectory
        from alembic.runtime.migration import MigrationContext
        from sqlalchemy import create_engine

        # Load alembic config
        alembic_ini = backend_path / "alembic.ini"
        if not alembic_ini.exists():
            print("❌ alembic.ini not found")
            return False

        config = Config(str(alembic_ini))
        config.set_main_option("script_location", str(backend_path / "alembic"))

        # Get script directory
        script = ScriptDirectory.from_config(config)

        # Get database URL from config or env
        db_url = os.getenv("DATABASE_URL_SYNC", "postgresql://postgres:postgres@localhost:5432/builder_db")
        engine = create_engine(db_url)

        # Check current revision
        with engine.connect() as conn:
            context = MigrationContext.configure(conn)
            current_rev = context.get_current_revision()

            print(f"✓ Current migration revision: {current_rev}")

            # Check if 004 migration exists
            head_rev = script.get_current_head()
            print(f"✓ Head migration revision: {head_rev}")

            if current_rev == '004' or current_rev == head_rev:
                print("✓ Migration 004 (document reviews) is applied")
                return True
            elif current_rev == '003':
                print("⚠️  Migration 004 NOT applied. Current revision is 003.")
                print("   Run: cd backend && python3 -m alembic upgrade head")
                return False
            else:
                print(f"⚠️  Unexpected migration state: {current_rev}")
                return False

    except ImportError as e:
        print(f"❌ Failed to import required modules: {e}")
        print("   Make sure dependencies are installed: pip install alembic sqlalchemy psycopg2-binary")
        return False
    except Exception as e:
        print(f"❌ Error checking alembic state: {e}")
        return False

def check_database_tables():
    """Check if document_reviews and document_comments tables exist"""
    print("\n" + "=" * 60)
    print("CHECKING DATABASE TABLES")
    print("=" * 60)

    try:
        from sqlalchemy import create_engine, inspect, text

        # Get database URL
        db_url = os.getenv("DATABASE_URL_SYNC", "postgresql://postgres:postgres@localhost:5432/builder_db")
        engine = create_engine(db_url)

        # Check tables
        inspector = inspect(engine)
        all_tables = inspector.get_table_names()

        print(f"✓ Connected to database")
        print(f"✓ Total tables in database: {len(all_tables)}")

        # Check for document review tables
        document_tables = [t for t in all_tables if 'document' in t.lower()]
        print(f"\nDocument-related tables: {document_tables}")

        required_tables = ['document_reviews', 'document_comments']
        missing_tables = []

        for table in required_tables:
            if table in all_tables:
                print(f"✓ Table '{table}' exists")

                # Get columns
                columns = inspector.get_columns(table)
                print(f"  Columns ({len(columns)}):")
                for col in columns:
                    nullable = "NULL" if col['nullable'] else "NOT NULL"
                    print(f"    - {col['name']}: {col['type']} {nullable}")

                # Get indexes
                indexes = inspector.get_indexes(table)
                if indexes:
                    print(f"  Indexes ({len(indexes)}):")
                    for idx in indexes:
                        print(f"    - {idx['name']}: {idx['column_names']}")

                # Get foreign keys
                fks = inspector.get_foreign_keys(table)
                if fks:
                    print(f"  Foreign Keys ({len(fks)}):")
                    for fk in fks:
                        print(f"    - {fk['constrained_columns']} -> {fk['referred_table']}.{fk['referred_columns']}")

                print()
            else:
                print(f"❌ Table '{table}' NOT FOUND")
                missing_tables.append(table)

        if missing_tables:
            print(f"\n❌ Missing tables: {missing_tables}")
            print("   Run migration: cd backend && python3 -m alembic upgrade head")
            return False
        else:
            print("✓ All required tables exist with proper schema")
            return True

    except ImportError as e:
        print(f"❌ Failed to import required modules: {e}")
        return False
    except Exception as e:
        print(f"❌ Error checking database tables: {e}")
        print(f"   Error details: {type(e).__name__}: {str(e)}")
        return False

def main():
    """Main verification function"""
    print("\n" + "=" * 60)
    print("DOCUMENT REVIEW DATABASE VERIFICATION")
    print("=" * 60 + "\n")

    # Check if backend directory exists
    if not backend_path.exists():
        print(f"❌ Backend directory not found at {backend_path}")
        sys.exit(1)

    # Run checks
    alembic_ok = check_alembic_state()
    tables_ok = check_database_tables()

    # Summary
    print("\n" + "=" * 60)
    print("VERIFICATION SUMMARY")
    print("=" * 60)
    print(f"Alembic Migration State: {'✓ PASS' if alembic_ok else '❌ FAIL'}")
    print(f"Database Tables: {'✓ PASS' if tables_ok else '❌ FAIL'}")

    if alembic_ok and tables_ok:
        print("\n✅ ALL CHECKS PASSED - Database is ready for document review feature")
        sys.exit(0)
    else:
        print("\n⚠️  SOME CHECKS FAILED - See details above")
        sys.exit(1)

if __name__ == "__main__":
    main()
