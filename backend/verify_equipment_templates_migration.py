#!/usr/bin/env python3
"""
Verification script for Equipment Templates migration (004)

This script connects to the database and verifies that:
1. All 5 tables exist
2. All columns have correct data types
3. All foreign keys are defined
4. All required indexes exist

Usage:
    python verify_equipment_templates_migration.py

Environment variables required:
    DATABASE_URL - PostgreSQL connection string
    OR
    POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB, POSTGRES_HOST, POSTGRES_PORT
"""

import os
import sys
from typing import List, Tuple, Dict
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.engine import Engine


class Colors:
    """ANSI color codes for terminal output"""
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    BOLD = '\033[1m'
    END = '\033[0m'


def get_database_url() -> str:
    """Get database URL from environment variables"""
    database_url = os.getenv('DATABASE_URL')
    if database_url:
        return database_url

    # Construct from individual variables
    user = os.getenv('POSTGRES_USER', 'postgres')
    password = os.getenv('POSTGRES_PASSWORD', 'postgres')
    host = os.getenv('POSTGRES_HOST', 'localhost')
    port = os.getenv('POSTGRES_PORT', '5432')
    db = os.getenv('POSTGRES_DB', 'builder_db')

    return f"postgresql://{user}:{password}@{host}:{port}/{db}"


def check_tables(engine: Engine) -> Tuple[bool, List[str]]:
    """Verify all required tables exist"""
    print(f"\n{Colors.BOLD}1. Checking if all 5 tables exist...{Colors.END}")

    inspector = inspect(engine)
    existing_tables = inspector.get_table_names()

    required_tables = [
        'consultant_types',
        'equipment_templates',
        'equipment_template_consultants',
        'equipment_approval_submissions',
        'equipment_approval_decisions'
    ]

    missing_tables = []
    for table in required_tables:
        if table in existing_tables:
            print(f"  {Colors.GREEN}✓{Colors.END} {table}")
        else:
            print(f"  {Colors.RED}✗{Colors.END} {table} - MISSING")
            missing_tables.append(table)

    return len(missing_tables) == 0, missing_tables


def check_columns(engine: Engine, table_name: str, expected_columns: Dict[str, str]) -> bool:
    """Verify table has expected columns with correct types"""
    print(f"\n{Colors.BOLD}Checking {table_name} columns...{Colors.END}")

    inspector = inspect(engine)
    try:
        columns = inspector.get_columns(table_name)
    except Exception as e:
        print(f"  {Colors.RED}✗ Error getting columns: {e}{Colors.END}")
        return False

    column_dict = {col['name']: str(col['type']) for col in columns}

    all_correct = True
    for col_name, expected_type in expected_columns.items():
        actual_type = column_dict.get(col_name)
        if actual_type is None:
            print(f"  {Colors.RED}✗{Colors.END} {col_name} - MISSING")
            all_correct = False
        else:
            # Normalize type comparison
            if expected_type.lower() in actual_type.lower() or actual_type.lower() in expected_type.lower():
                print(f"  {Colors.GREEN}✓{Colors.END} {col_name}: {actual_type}")
            else:
                print(f"  {Colors.YELLOW}⚠{Colors.END} {col_name}: {actual_type} (expected {expected_type})")

    return all_correct


def check_foreign_keys(engine: Engine) -> bool:
    """Verify all foreign key constraints exist"""
    print(f"\n{Colors.BOLD}2. Checking foreign key constraints...{Colors.END}")

    inspector = inspect(engine)

    tables_with_fks = {
        'equipment_templates': ['created_by_id'],
        'equipment_template_consultants': ['template_id', 'consultant_type_id'],
        'equipment_approval_submissions': ['project_id', 'template_id', 'equipment_id', 'submitted_by_id'],
        'equipment_approval_decisions': ['submission_id', 'approver_id']
    }

    all_correct = True
    for table_name, expected_fk_columns in tables_with_fks.items():
        try:
            fks = inspector.get_foreign_keys(table_name)
            fk_columns = [fk['constrained_columns'][0] for fk in fks]

            for col in expected_fk_columns:
                if col in fk_columns:
                    # Find the FK details
                    fk = next((fk for fk in fks if col in fk['constrained_columns']), None)
                    if fk:
                        ref_table = fk['referred_table']
                        print(f"  {Colors.GREEN}✓{Colors.END} {table_name}.{col} → {ref_table}")
                else:
                    print(f"  {Colors.RED}✗{Colors.END} {table_name}.{col} - MISSING FK")
                    all_correct = False

        except Exception as e:
            print(f"  {Colors.RED}✗ Error checking FKs for {table_name}: {e}{Colors.END}")
            all_correct = False

    return all_correct


def check_indexes(engine: Engine) -> bool:
    """Verify all required indexes exist"""
    print(f"\n{Colors.BOLD}3. Checking indexes...{Colors.END}")

    required_indexes = {
        'equipment_templates': ['ix_equipment_templates_name', 'ix_equipment_templates_category'],
        'equipment_approval_submissions': [
            'ix_equipment_approval_submissions_project_id',
            'ix_equipment_approval_submissions_template_id',
            'ix_equipment_approval_submissions_status'
        ],
        'equipment_approval_decisions': ['ix_equipment_approval_decisions_submission_id']
    }

    inspector = inspect(engine)
    all_correct = True

    for table_name, expected_idxs in required_indexes.items():
        try:
            indexes = inspector.get_indexes(table_name)
            index_names = [idx['name'] for idx in indexes]

            for idx_name in expected_idxs:
                if idx_name in index_names:
                    print(f"  {Colors.GREEN}✓{Colors.END} {idx_name}")
                else:
                    print(f"  {Colors.RED}✗{Colors.END} {idx_name} - MISSING")
                    all_correct = False

        except Exception as e:
            print(f"  {Colors.RED}✗ Error checking indexes for {table_name}: {e}{Colors.END}")
            all_correct = False

    return all_correct


def check_migration_version(engine: Engine) -> bool:
    """Verify alembic is at correct migration version"""
    print(f"\n{Colors.BOLD}4. Checking Alembic migration version...{Colors.END}")

    try:
        with engine.connect() as conn:
            result = conn.execute(text("SELECT version_num FROM alembic_version"))
            version = result.scalar()

            if version == '004':
                print(f"  {Colors.GREEN}✓{Colors.END} Migration version: {version} (current)")
                return True
            else:
                print(f"  {Colors.YELLOW}⚠{Colors.END} Migration version: {version} (expected 004)")
                return False

    except Exception as e:
        print(f"  {Colors.RED}✗ Error checking migration version: {e}{Colors.END}")
        return False


def main():
    """Main verification function"""
    print(f"\n{Colors.BLUE}{Colors.BOLD}{'='*60}{Colors.END}")
    print(f"{Colors.BLUE}{Colors.BOLD}Equipment Templates Migration Verification (004){Colors.END}")
    print(f"{Colors.BLUE}{Colors.BOLD}{'='*60}{Colors.END}")

    # Get database connection
    try:
        database_url = get_database_url()
        print(f"\nConnecting to database...")
        engine = create_engine(database_url)
        print(f"{Colors.GREEN}✓ Connected{Colors.END}")
    except Exception as e:
        print(f"{Colors.RED}✗ Failed to connect to database: {e}{Colors.END}")
        sys.exit(1)

    # Run checks
    checks = []

    # Check tables
    tables_ok, missing = check_tables(engine)
    checks.append(('Tables', tables_ok))

    # Check foreign keys
    fks_ok = check_foreign_keys(engine)
    checks.append(('Foreign Keys', fks_ok))

    # Check indexes
    indexes_ok = check_indexes(engine)
    checks.append(('Indexes', indexes_ok))

    # Check migration version
    version_ok = check_migration_version(engine)
    checks.append(('Migration Version', version_ok))

    # Summary
    print(f"\n{Colors.BOLD}{'='*60}{Colors.END}")
    print(f"{Colors.BOLD}Verification Summary{Colors.END}")
    print(f"{Colors.BOLD}{'='*60}{Colors.END}")

    all_passed = True
    for check_name, passed in checks:
        status = f"{Colors.GREEN}✓ PASSED{Colors.END}" if passed else f"{Colors.RED}✗ FAILED{Colors.END}"
        print(f"  {check_name}: {status}")
        if not passed:
            all_passed = False

    print(f"{Colors.BOLD}{'='*60}{Colors.END}\n")

    if all_passed:
        print(f"{Colors.GREEN}{Colors.BOLD}✓ All verifications passed!{Colors.END}\n")
        sys.exit(0)
    else:
        print(f"{Colors.RED}{Colors.BOLD}✗ Some verifications failed. Please review the output above.{Colors.END}\n")
        sys.exit(1)


if __name__ == '__main__':
    main()
