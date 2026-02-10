"""
Database verification script for subtask-3-3.
Verifies Hebrew text encoding, consultant mappings, and JSONB fields.

Run with: python verify_database_encoding.py
"""
import asyncio
import json

from sqlalchemy import func, select

from app.db.session import AsyncSessionLocal
from app.models.equipment_template import EquipmentTemplate, TemplateConsultant


async def verify_database():
    """
    Verify database contains properly encoded data:
    1. Hebrew text in 'name' field displays correctly
    2. English text in 'name_en' field exists
    3. template_consultants association table has 18+ mappings
    4. JSONB fields contain valid JSON arrays
    """
    async with AsyncSessionLocal() as session:
        print("=" * 70)
        print("DATABASE VERIFICATION FOR SUBTASK-3-3")
        print("=" * 70)

        all_checks_passed = True

        # Check 1: Count equipment templates
        print("\n[CHECK 1] Counting equipment templates...")
        result = await session.execute(select(func.count(EquipmentTemplate.id)))
        template_count = result.scalar()
        print(f"  ✓ Found {template_count} equipment templates")
        if template_count != 11:
            print(f"  ✗ ERROR: Expected 11 templates, found {template_count}")
            all_checks_passed = False

        # Check 2: Verify Hebrew text encoding and English names
        print("\n[CHECK 2] Verifying Hebrew text encoding and English names...")
        result = await session.execute(
            select(EquipmentTemplate).order_by(EquipmentTemplate.name)
        )
        templates = result.scalars().all()

        hebrew_check_passed = True
        english_check_passed = True

        for i, template in enumerate(templates, 1):
            # Check Hebrew name exists and contains Hebrew characters
            if not template.name:
                print(f"  ✗ Template {i}: Missing Hebrew name")
                hebrew_check_passed = False
            elif not any('\u0590' <= c <= '\u05FF' for c in template.name):
                print(f"  ✗ Template {i}: Name '{template.name}' doesn't contain Hebrew characters")
                hebrew_check_passed = False
            else:
                print(f"  ✓ Template {i}: Hebrew name: {template.name}")

            # Check English name exists
            if not template.name_en:
                print(f"  ✗ Template {i}: Missing English name")
                english_check_passed = False
            else:
                print(f"    English name: {template.name_en}")

        if not hebrew_check_passed:
            all_checks_passed = False
        if not english_check_passed:
            all_checks_passed = False

        # Check 3: Verify consultant mappings count
        print("\n[CHECK 3] Counting template_consultants mappings...")
        result = await session.execute(select(func.count(TemplateConsultant.id)))
        consultant_count = result.scalar()
        print(f"  ✓ Found {consultant_count} consultant mappings")
        if consultant_count < 18:
            print(f"  ✗ ERROR: Expected at least 18 mappings, found {consultant_count}")
            all_checks_passed = False

        # Check 3b: Show consultant mapping breakdown
        print("\n[CHECK 3b] Consultant mapping breakdown by template...")
        for template in templates:
            # Reload with consultants relationship
            result = await session.execute(
                select(EquipmentTemplate)
                .where(EquipmentTemplate.id == template.id)
            )
            t = result.scalar_one()

            # Get consultants for this template
            result = await session.execute(
                select(TemplateConsultant)
                .where(TemplateConsultant.template_id == t.id)
            )
            consultants = result.scalars().all()
            consultant_roles = [c.consultant_role for c in consultants]

            print(f"  {t.name}: {len(consultant_roles)} consultant(s)")
            for role in consultant_roles:
                print(f"    - {role}")

        # Check 4: Verify JSONB fields contain valid JSON arrays
        print("\n[CHECK 4] Verifying JSONB fields contain valid JSON arrays...")
        jsonb_check_passed = True

        for i, template in enumerate(templates, 1):
            # Check required_documents
            if not isinstance(template.required_documents, list):
                print(f"  ✗ Template {i} ({template.name}): required_documents is not a list")
                jsonb_check_passed = False
            elif len(template.required_documents) == 0:
                print(f"  ✗ Template {i} ({template.name}): required_documents is empty")
                jsonb_check_passed = False
            else:
                print(f"  ✓ Template {i} ({template.name}): required_documents has {len(template.required_documents)} items")

            # Check required_specifications
            if not isinstance(template.required_specifications, list):
                print(f"  ✗ Template {i} ({template.name}): required_specifications is not a list")
                jsonb_check_passed = False
            elif len(template.required_specifications) == 0:
                print(f"  ✗ Template {i} ({template.name}): required_specifications is empty")
                jsonb_check_passed = False
            else:
                print(f"  ✓ Template {i} ({template.name}): required_specifications has {len(template.required_specifications)} items")

            # Check submission_checklist
            if not isinstance(template.submission_checklist, list):
                print(f"  ✗ Template {i} ({template.name}): submission_checklist is not a list")
                jsonb_check_passed = False
            elif len(template.submission_checklist) == 0:
                print(f"  ✗ Template {i} ({template.name}): submission_checklist is empty")
                jsonb_check_passed = False
            else:
                print(f"  ✓ Template {i} ({template.name}): submission_checklist has {len(template.submission_checklist)} items")

        if not jsonb_check_passed:
            all_checks_passed = False

        # Check 5: Sample data display
        print("\n[CHECK 5] Sample data display for first template...")
        if templates:
            t = templates[0]
            print(f"  Template: {t.name} / {t.name_en}")
            print(f"  Required Documents: {json.dumps(t.required_documents, ensure_ascii=False, indent=4)}")
            print(f"  Required Specifications: {json.dumps(t.required_specifications, ensure_ascii=False, indent=4)}")
            print(f"  Submission Checklist: {json.dumps(t.submission_checklist, ensure_ascii=False, indent=4)}")

        # Final summary
        print("\n" + "=" * 70)
        if all_checks_passed:
            print("✓ ALL VERIFICATION CHECKS PASSED")
        else:
            print("✗ SOME VERIFICATION CHECKS FAILED")
        print("=" * 70)

        return all_checks_passed


async def main():
    try:
        success = await verify_database()
        exit(0 if success else 1)
    except Exception as e:
        print("\n✗ ERROR: Database verification failed with exception:")
        print(f"  {type(e).__name__}: {e}")
        print("\nThis is expected if the database hasn't been set up yet.")
        print("To set up the database, run:")
        print("  1. docker-compose up -d db")
        print("  2. cd backend && alembic upgrade head")
        print("  3. cd backend && python -m app.db.seeds.equipment_templates")
        exit(1)


if __name__ == "__main__":
    asyncio.run(main())
