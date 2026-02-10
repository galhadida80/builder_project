#!/usr/bin/env python3
"""
Static verification of checklist templates seed script.

This script performs static code analysis and structure validation
without requiring database access. Useful for worktree environments.
"""
import ast
import sys
from pathlib import Path


def verify_seed_script_structure():
    """Verify the seed script has the required structure and functions."""
    print("=== Static Verification of Checklist Template Seed Script ===\n")

    seed_script_path = Path("app/db/seeds/checklist_templates.py")

    if not seed_script_path.exists():
        print("✗ Seed script not found at expected path")
        return False

    print(f"✓ Seed script exists at: {seed_script_path}")

    # Read and parse the Python file
    with open(seed_script_path, 'r', encoding='utf-8') as f:
        content = f.read()

    try:
        tree = ast.parse(content)
        print("✓ Seed script has valid Python syntax")
    except SyntaxError as e:
        print(f"✗ Syntax error in seed script: {e}")
        return False

    # Check for required functions (including async functions)
    functions = [node.name for node in ast.walk(tree)
                 if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))]
    required_functions = [
        'translate_to_english',
        'is_section_header',
        'parse_excel_templates',
        'create_template_hierarchy',
        'seed_checklist_templates',
        'main'
    ]

    for func in required_functions:
        if func in functions:
            print(f"✓ Function '{func}' is defined")
        else:
            print(f"✗ Missing required function: {func}")
            return False

    # Check for required imports
    imports = []
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            imports.extend([alias.name for alias in node.names])
        elif isinstance(node, ast.ImportFrom):
            imports.append(node.module)

    required_imports = ['openpyxl', 'asyncio', 'logging', 'pathlib', 'sqlalchemy']
    for imp in required_imports:
        if any(imp in i for i in imports if i):
            print(f"✓ Import '{imp}' is present")
        else:
            print(f"✗ Missing required import: {imp}")
            return False

    # Check for translation dictionary
    if 'TRANSLATIONS' in content:
        print("✓ Translation dictionary (TRANSLATIONS) is defined")
    else:
        print("✗ Missing translation dictionary")
        return False

    # Check for group mappings
    if 'GROUP_MAPPINGS' in content:
        print("✓ Group mappings (GROUP_MAPPINGS) are defined")
    else:
        print("✗ Missing group mappings")
        return False

    # Check for Hebrew text preservation (UTF-8 support)
    hebrew_chars = [c for c in content if '\u0590' <= c <= '\u05FF']
    if hebrew_chars:
        print(f"✓ Hebrew text is present ({len(set(hebrew_chars))} unique Hebrew characters)")
    else:
        print("⚠ Warning: No Hebrew characters found in script")

    # Check for async/await patterns
    has_async = 'async def' in content
    has_await = 'await' in content
    has_asyncsession = 'AsyncSessionLocal' in content

    if has_async and has_await and has_asyncsession:
        print("✓ Async patterns are correctly used (async def, await, AsyncSessionLocal)")
    else:
        print("✗ Async patterns incomplete:")
        if not has_async:
            print("  - Missing 'async def'")
        if not has_await:
            print("  - Missing 'await'")
        if not has_asyncsession:
            print("  - Missing 'AsyncSessionLocal'")
        return False

    # Check for idempotency logic
    if 'already seeded' in content and 'scalar_one_or_none' in content:
        print("✓ Idempotency check is implemented")
    else:
        print("✗ Idempotency check not found")
        return False

    # Check for error handling
    has_try_except = 'try:' in content and 'except' in content
    has_rollback = 'rollback' in content

    if has_try_except and has_rollback:
        print("✓ Error handling with try/except and rollback is present")
    else:
        print("✗ Error handling incomplete")
        return False

    # Check for proper logging
    if 'logger' in content and 'logging.INFO' in content:
        print("✓ Logging is configured")
    else:
        print("⚠ Warning: Logging may not be properly configured")

    print("\n=== Static Verification Passed ===\n")
    return True


def verify_requirements():
    """Verify openpyxl is in requirements.txt."""
    print("=== Verifying Requirements ===\n")

    requirements_path = Path("requirements.txt")

    if not requirements_path.exists():
        print("✗ requirements.txt not found")
        return False

    with open(requirements_path, 'r') as f:
        requirements = f.read()

    if 'openpyxl' in requirements:
        # Extract version
        for line in requirements.split('\n'):
            if 'openpyxl' in line:
                print(f"✓ openpyxl dependency found: {line.strip()}")
                return True
    else:
        print("✗ openpyxl not found in requirements.txt")
        return False


def verify_directory_structure():
    """Verify the seeds directory structure is correct."""
    print("\n=== Verifying Directory Structure ===\n")

    seeds_dir = Path("app/db/seeds")

    if not seeds_dir.exists():
        print("✗ Seeds directory does not exist")
        return False

    print(f"✓ Seeds directory exists: {seeds_dir}")

    init_file = seeds_dir / "__init__.py"
    if init_file.exists():
        print(f"✓ Package initializer exists: {init_file}")
    else:
        print("✗ Missing __init__.py in seeds directory")
        return False

    seed_script = seeds_dir / "checklist_templates.py"
    if seed_script.exists():
        print(f"✓ Seed script exists: {seed_script}")
        # Check file size
        size = seed_script.stat().st_size
        print(f"  File size: {size} bytes")
        if size > 5000:  # Should be substantial
            print("  ✓ File has substantial content")
        else:
            print("  ⚠ Warning: File seems small")
    else:
        print("✗ Seed script not found")
        return False

    return True


def main():
    """Run all verification checks."""
    print("\n" + "="*70)
    print("CHECKLIST TEMPLATE SEED SCRIPT - STATIC VERIFICATION")
    print("="*70 + "\n")

    all_passed = True

    # Run verification checks
    all_passed = verify_directory_structure() and all_passed
    all_passed = verify_requirements() and all_passed
    all_passed = verify_seed_script_structure() and all_passed

    print("\n" + "="*70)
    if all_passed:
        print("✓ ALL STATIC VERIFICATION CHECKS PASSED")
        print("="*70 + "\n")
        print("Next steps:")
        print("  1. Ensure database is running: docker compose up db -d")
        print("  2. Run migrations: alembic upgrade head")
        print("  3. Run seed script: python -m app.db.seeds.checklist_templates")
        print("  4. Run full verification: ./verify_seed_script.sh")
        print("")
        return 0
    else:
        print("✗ SOME VERIFICATION CHECKS FAILED")
        print("="*70 + "\n")
        return 1


if __name__ == "__main__":
    sys.exit(main())
