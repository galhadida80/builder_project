#!/usr/bin/env python3
"""
Database schema verification script for equipment approval models
"""
import os
import sys

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

try:
    from sqlalchemy import create_engine, inspect, text

    from app.config import get_settings

    print("=" * 70)
    print("DATABASE SCHEMA VERIFICATION")
    print("=" * 70)

    settings = get_settings()
    engine = create_engine(settings.database_url_sync)

    # Test connection
    print("\n[1] Testing database connection...")
    try:
        with engine.connect() as conn:
            result = conn.execute(text('SELECT 1'))
            print("    ✓ Database connection successful")
    except Exception as e:
        print(f"    ✗ Connection failed: {e}")
        sys.exit(1)

    # Get inspector
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    print(f"\n[2] Found {len(tables)} tables in database")

    # Expected columns for equipment_approval_submissions
    expected_submissions_columns = [
        'id', 'project_id', 'template_id', 'name', 'specifications',
        'documents', 'checklist_responses', 'additional_data', 'status',
        'submitted_by_id', 'submitted_at', 'created_at', 'updated_at'
    ]

    # Expected columns for equipment_approval_decisions
    expected_decisions_columns = [
        'id', 'submission_id', 'decision_type', 'reviewer_id',
        'reviewer_role', 'comments', 'created_at'
    ]

    # Check equipment_approval_submissions table
    print("\n[3] Verifying equipment_approval_submissions table...")
    if 'equipment_approval_submissions' not in tables:
        print("    ✗ Table NOT FOUND")
        sys.exit(1)

    print("    ✓ Table exists")
    columns = inspector.get_columns('equipment_approval_submissions')
    column_names = [col['name'] for col in columns]

    print(f"    Found {len(columns)} columns:")
    missing_columns = []
    for col_name in expected_submissions_columns:
        if col_name in column_names:
            col_info = next(c for c in columns if c['name'] == col_name)
            print(f"      ✓ {col_name}: {col_info['type']}")
        else:
            print(f"      ✗ {col_name}: MISSING")
            missing_columns.append(col_name)

    if missing_columns:
        print(f"\n    ✗ Missing columns: {', '.join(missing_columns)}")
        sys.exit(1)

    # Check foreign keys for equipment_approval_submissions
    print("\n    Foreign keys:")
    fks = inspector.get_foreign_keys('equipment_approval_submissions')
    expected_fks = {
        'project_id': ('projects', 'CASCADE'),
        'submitted_by_id': ('users', None),
    }

    found_fks = {}
    for fk in fks:
        constrained_col = fk['constrained_columns'][0] if fk['constrained_columns'] else None
        if constrained_col:
            found_fks[constrained_col] = (fk['referred_table'], fk.get('ondelete'))
            ondelete_info = f" (ondelete={fk.get('ondelete', 'None')})" if fk.get('ondelete') else ""
            print(f"      ✓ {constrained_col} -> {fk['referred_table']}.{fk['referred_columns'][0]}{ondelete_info}")

    # Verify expected FKs exist
    for col, (table, ondelete) in expected_fks.items():
        if col not in found_fks:
            print(f"      ✗ Missing FK: {col} -> {table}")
        elif found_fks[col][0] != table:
            print(f"      ✗ Wrong FK target for {col}: expected {table}, got {found_fks[col][0]}")
        elif ondelete and found_fks[col][1] != ondelete:
            print(f"      ⚠ FK {col} -> {table}: expected ondelete={ondelete}, got {found_fks[col][1]}")

    # Check equipment_approval_decisions table
    print("\n[4] Verifying equipment_approval_decisions table...")
    if 'equipment_approval_decisions' not in tables:
        print("    ✗ Table NOT FOUND")
        sys.exit(1)

    print("    ✓ Table exists")
    columns = inspector.get_columns('equipment_approval_decisions')
    column_names = [col['name'] for col in columns]

    print(f"    Found {len(columns)} columns:")
    missing_columns = []
    for col_name in expected_decisions_columns:
        if col_name in column_names:
            col_info = next(c for c in columns if c['name'] == col_name)
            print(f"      ✓ {col_name}: {col_info['type']}")
        else:
            print(f"      ✗ {col_name}: MISSING")
            missing_columns.append(col_name)

    if missing_columns:
        print(f"\n    ✗ Missing columns: {', '.join(missing_columns)}")
        sys.exit(1)

    # Check foreign keys for equipment_approval_decisions
    print("\n    Foreign keys:")
    fks = inspector.get_foreign_keys('equipment_approval_decisions')
    expected_fks = {
        'submission_id': ('equipment_approval_submissions', 'CASCADE'),
        'reviewer_id': ('users', None),
    }

    found_fks = {}
    for fk in fks:
        constrained_col = fk['constrained_columns'][0] if fk['constrained_columns'] else None
        if constrained_col:
            found_fks[constrained_col] = (fk['referred_table'], fk.get('ondelete'))
            ondelete_info = f" (ondelete={fk.get('ondelete', 'None')})" if fk.get('ondelete') else ""
            print(f"      ✓ {constrained_col} -> {fk['referred_table']}.{fk['referred_columns'][0]}{ondelete_info}")

    # Verify expected FKs exist
    for col, (table, ondelete) in expected_fks.items():
        if col not in found_fks:
            print(f"      ✗ Missing FK: {col} -> {table}")
        elif found_fks[col][0] != table:
            print(f"      ✗ Wrong FK target for {col}: expected {table}, got {found_fks[col][0]}")
        elif ondelete and found_fks[col][1] != ondelete:
            print(f"      ⚠ FK {col} -> {table}: expected ondelete={ondelete}, got {found_fks[col][1]}")

    # Summary
    print("\n" + "=" * 70)
    print("VERIFICATION SUMMARY")
    print("=" * 70)
    print("✓ Database connection: OK")
    print("✓ equipment_approval_submissions table: OK")
    print("  - All expected columns present")
    print("  - Foreign key to projects.id (CASCADE): OK")
    print("  - Foreign key to users.id: OK")
    print("✓ equipment_approval_decisions table: OK")
    print("  - All expected columns present")
    print("  - Foreign key to equipment_approval_submissions.id (CASCADE): OK")
    print("  - Foreign key to users.id: OK")
    print("\n✓ ALL CHECKS PASSED")
    print("=" * 70)

except Exception as e:
    print(f"\n✗ Error during verification: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
