"""
Test that creates 1 equipment and 1 material item per template.
Ensures all templates are functional and can be used to create items.

Run with: docker exec builder_backend python -m pytest tests/test_seed_one_per_template.py -v
Or standalone: docker exec builder_backend python tests/test_seed_one_per_template.py
"""
import asyncio
import sys
from sqlalchemy import select, func
from app.db.session import AsyncSessionLocal
from app.models.equipment_template import EquipmentTemplate
from app.models.material_template import MaterialTemplate
from app.models.equipment import Equipment
from app.models.material import Material
from app.models.project import Project


EXPECTED_EQUIPMENT_TEMPLATES = 44
EXPECTED_MATERIAL_TEMPLATES = 28


async def seed_one_per_template(project_code=None):
    async with AsyncSessionLocal() as session:
        if project_code:
            result = await session.execute(
                select(Project).where(Project.code == project_code)
            )
        else:
            result = await session.execute(
                select(Project).order_by(Project.created_at.desc()).limit(1)
            )
        project = result.scalar_one_or_none()
        if not project:
            print("ERROR: No project found. Create a project first.")
            return False

        project_id = project.id
        print(f"Using project: {project.name} ({project_id})")

        eq_result = await session.execute(select(EquipmentTemplate))
        eq_templates = eq_result.scalars().all()
        print(f"\nEquipment templates found: {len(eq_templates)}")
        assert len(eq_templates) == EXPECTED_EQUIPMENT_TEMPLATES, (
            f"Expected {EXPECTED_EQUIPMENT_TEMPLATES} equipment templates, got {len(eq_templates)}"
        )

        eq_created = 0
        eq_skipped = 0
        for tmpl in eq_templates:
            existing = await session.execute(
                select(Equipment).where(
                    Equipment.project_id == project_id,
                    Equipment.name == f"[Test] {tmpl.name}"
                )
            )
            if existing.scalar_one_or_none():
                eq_skipped += 1
                continue

            equipment = Equipment(
                project_id=project_id,
                name=f"[Test] {tmpl.name}",
                equipment_type=tmpl.name_he or tmpl.name,
                manufacturer="Test Manufacturer",
                model_number=f"MOD-{tmpl.category or 'GEN'}-001",
                serial_number=f"SN-{str(tmpl.id)[:8]}",
                notes=f"Auto-created from template: {tmpl.name}",
                status="draft",
            )
            session.add(equipment)
            eq_created += 1

        mat_result = await session.execute(select(MaterialTemplate))
        mat_templates = mat_result.scalars().all()
        print(f"Material templates found: {len(mat_templates)}")
        assert len(mat_templates) == EXPECTED_MATERIAL_TEMPLATES, (
            f"Expected {EXPECTED_MATERIAL_TEMPLATES} material templates, got {len(mat_templates)}"
        )

        mat_created = 0
        mat_skipped = 0
        for tmpl in mat_templates:
            existing = await session.execute(
                select(Material).where(
                    Material.project_id == project_id,
                    Material.name == f"[Test] {tmpl.name_he}"
                )
            )
            if existing.scalar_one_or_none():
                mat_skipped += 1
                continue

            material = Material(
                project_id=project_id,
                name=f"[Test] {tmpl.name_he}",
                material_type=tmpl.category or "general",
                manufacturer="Test Manufacturer",
                model_number=f"MAT-{tmpl.category or 'GEN'}-001",
                quantity=10,
                unit="unit",
                storage_location="Warehouse A",
                notes=f"Auto-created from template: {tmpl.name} ({tmpl.name_he})",
                status="draft",
            )
            session.add(material)
            mat_created += 1

        await session.commit()

        eq_count = await session.execute(
            select(func.count()).select_from(Equipment).where(Equipment.project_id == project_id)
        )
        mat_count = await session.execute(
            select(func.count()).select_from(Material).where(Material.project_id == project_id)
        )

        print(f"\nEquipment: {eq_created} created, {eq_skipped} skipped (already existed)")
        print(f"Materials: {mat_created} created, {mat_skipped} skipped (already existed)")
        print(f"\nTotal equipment in project: {eq_count.scalar()}")
        print(f"Total materials in project: {mat_count.scalar()}")
        print("\nAll templates validated and items created successfully!")
        return True


if __name__ == "__main__":
    code = sys.argv[1] if len(sys.argv) > 1 else None
    success = asyncio.run(seed_one_per_template(project_code=code))
    sys.exit(0 if success else 1)
