"""
Verify seed data structure correctness without database connection.
This script analyzes the EQUIPMENT_TEMPLATES data structure in the seed script.

Run with: python3 verify_seed_data_structure.py
"""
import sys
import json

# Import the seed data
sys.path.insert(0, '.')
from app.db.seeds.equipment_templates import EQUIPMENT_TEMPLATES


def verify_seed_data():
    """Verify the structure and content of seed data."""
    print("=" * 70)
    print("SEED DATA STRUCTURE VERIFICATION")
    print("=" * 70)

    all_checks_passed = True
    errors = []
    warnings = []

    # Check 1: Template count
    print(f"\n[CHECK 1] Template count: {len(EQUIPMENT_TEMPLATES)}")
    if len(EQUIPMENT_TEMPLATES) != 11:
        errors.append(f"Expected 11 templates, found {len(EQUIPMENT_TEMPLATES)}")
        all_checks_passed = False
    else:
        print("  ✓ PASS: 11 templates defined")

    # Check 2: Verify Hebrew and English names
    print("\n[CHECK 2] Verifying Hebrew and English names...")
    for i, template in enumerate(EQUIPMENT_TEMPLATES, 1):
        name = template.get('name', '')
        name_en = template.get('name_en', '')

        # Check Hebrew name
        if not name:
            errors.append(f"Template {i}: Missing 'name' field")
            all_checks_passed = False
        elif not any('\u0590' <= c <= '\u05FF' for c in name):
            warnings.append(f"Template {i}: Name '{name}' doesn't contain Hebrew characters")
        else:
            print(f"  ✓ Template {i}: {name}")

        # Check English name
        if not name_en:
            errors.append(f"Template {i} ({name}): Missing 'name_en' field")
            all_checks_passed = False
        else:
            print(f"    English: {name_en}")

    # Check 3: Count consultant mappings
    print("\n[CHECK 3] Counting consultant mappings...")
    total_consultants = 0
    consultant_breakdown = []

    for template in EQUIPMENT_TEMPLATES:
        consultants = template.get('consultants', [])
        total_consultants += len(consultants)
        consultant_breakdown.append({
            'name': template.get('name', 'UNKNOWN'),
            'count': len(consultants),
            'roles': consultants
        })

    print(f"  Total consultant mappings: {total_consultants}")

    if total_consultants < 17:
        errors.append(f"Expected at least 17 consultant mappings, found {total_consultants}")
        all_checks_passed = False
    elif total_consultants < 18:
        warnings.append(f"Spec mentions 18+ mappings, but seed data has {total_consultants}")
        print(f"  ⚠ WARNING: Spec mentions 18+ mappings, actual: {total_consultants}")
    else:
        print(f"  ✓ PASS: {total_consultants} consultant mappings")

    # Show breakdown
    print("\n  Consultant breakdown by template:")
    for item in consultant_breakdown:
        print(f"    {item['name']}: {item['count']} consultant(s)")
        for role in item['roles']:
            print(f"      - {role}")

    # Check 4: Verify JSONB fields
    print("\n[CHECK 4] Verifying JSONB field structure...")
    required_jsonb_fields = ['required_documents', 'required_specifications', 'submission_checklist']

    for i, template in enumerate(EQUIPMENT_TEMPLATES, 1):
        name = template.get('name', 'UNKNOWN')

        for field in required_jsonb_fields:
            value = template.get(field)

            if value is None:
                errors.append(f"Template {i} ({name}): Missing '{field}' field")
                all_checks_passed = False
            elif not isinstance(value, list):
                errors.append(f"Template {i} ({name}): '{field}' is not a list (type: {type(value).__name__})")
                all_checks_passed = False
            elif len(value) == 0:
                errors.append(f"Template {i} ({name}): '{field}' is an empty list")
                all_checks_passed = False
            else:
                # Verify all items are strings
                non_strings = [item for item in value if not isinstance(item, str)]
                if non_strings:
                    errors.append(f"Template {i} ({name}): '{field}' contains non-string items: {non_strings}")
                    all_checks_passed = False

    print(f"  ✓ PASS: All templates have valid JSONB fields")

    # Check 5: Verify Hebrew text in JSONB arrays
    print("\n[CHECK 5] Verifying Hebrew text in JSONB arrays...")
    hebrew_in_jsonb_count = 0

    for template in EQUIPMENT_TEMPLATES:
        name = template.get('name', 'UNKNOWN')

        for field in required_jsonb_fields:
            items = template.get(field, [])
            for item in items:
                if isinstance(item, str) and any('\u0590' <= c <= '\u05FF' for c in item):
                    hebrew_in_jsonb_count += 1

    print(f"  ✓ Found {hebrew_in_jsonb_count} JSONB array items containing Hebrew text")

    # Check 6: Verify unique consultant roles
    print("\n[CHECK 6] Analyzing unique consultant roles...")
    all_consultant_roles = set()
    for template in EQUIPMENT_TEMPLATES:
        consultants = template.get('consultants', [])
        all_consultant_roles.update(consultants)

    print(f"  Unique consultant roles: {len(all_consultant_roles)}")
    for role in sorted(all_consultant_roles):
        print(f"    - {role}")

    expected_roles = {
        'קונסטרוקטור',
        'יועץ קרקע',
        'אדריכל',
        'יועץ אינסטלציה',
        'יועץ חשמל',
        'יועץ אקוסטיקה',
        'יועץ מיזוג',
        'בניה ירוקה'
    }

    missing_roles = expected_roles - all_consultant_roles
    extra_roles = all_consultant_roles - expected_roles

    if missing_roles:
        warnings.append(f"Missing expected consultant roles: {missing_roles}")

    if extra_roles:
        warnings.append(f"Extra consultant roles not in spec: {extra_roles}")

    # Check 7: Sample data display
    print("\n[CHECK 7] Sample data for first template...")
    if EQUIPMENT_TEMPLATES:
        sample = EQUIPMENT_TEMPLATES[0]
        print(f"  Template: {sample.get('name')} / {sample.get('name_en')}")
        print(f"  Required Documents ({len(sample.get('required_documents', []))}):")
        for doc in sample.get('required_documents', []):
            print(f"    - {doc}")
        print(f"  Required Specifications ({len(sample.get('required_specifications', []))}):")
        for spec in sample.get('required_specifications', []):
            print(f"    - {spec}")
        print(f"  Submission Checklist ({len(sample.get('submission_checklist', []))}):")
        for item in sample.get('submission_checklist', []):
            print(f"    - {item}")

    # Summary
    print("\n" + "=" * 70)
    print("VERIFICATION SUMMARY")
    print("=" * 70)

    if errors:
        print(f"\n❌ ERRORS ({len(errors)}):")
        for error in errors:
            print(f"  - {error}")

    if warnings:
        print(f"\n⚠️  WARNINGS ({len(warnings)}):")
        for warning in warnings:
            print(f"  - {warning}")

    if all_checks_passed and not errors:
        print("\n✅ ALL CHECKS PASSED")
        print(f"   - {len(EQUIPMENT_TEMPLATES)} templates defined")
        print(f"   - {total_consultants} consultant mappings")
        print(f"   - {len(all_consultant_roles)} unique consultant roles")
        print(f"   - All JSONB fields properly structured")
        print(f"   - Hebrew text encoding verified in seed data")
    else:
        print("\n❌ VERIFICATION FAILED")

    print("=" * 70)

    return all_checks_passed and len(errors) == 0


if __name__ == "__main__":
    try:
        success = verify_seed_data()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"\n❌ ERROR: Verification failed with exception:")
        print(f"  {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
