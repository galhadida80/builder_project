"""Seed checklist templates from Excel data.

Parses apartment checklists and public area checklists into
ChecklistTemplate / ChecklistSubSection / ChecklistItemTemplate rows.
All templates are created with project_id=None (global templates).
"""
from sqlalchemy import select

from app.db.seeds.checklist_parser import load_all_checklist_data
from app.db.session import AsyncSessionLocal
from app.models.checklist import ChecklistItemTemplate, ChecklistSubSection, ChecklistTemplate


async def seed_checklist_templates():
    async with AsyncSessionLocal() as session:
        try:
            result = await session.execute(
                select(ChecklistTemplate).where(ChecklistTemplate.project_id.is_(None)).limit(1)
            )
            if result.scalar_one_or_none():
                print("Checklist templates already seeded")
                return

            all_templates = load_all_checklist_data()
            if not all_templates:
                print("No checklist Excel files found, skipping seed")
                return

            total_subsections = 0
            total_items = 0

            for tpl_data in all_templates:
                template = ChecklistTemplate(
                    project_id=None,
                    name=tpl_data["name"],
                    level=tpl_data["level"],
                    group=tpl_data["group"],
                    extra_data=tpl_data["extra_data"],
                )
                session.add(template)
                await session.flush()

                for sub_data in tpl_data["subsections"].values():
                    subsection = ChecklistSubSection(
                        template_id=template.id,
                        name=sub_data["name"],
                        order=sub_data["order"],
                    )
                    session.add(subsection)
                    await session.flush()
                    total_subsections += 1

                    for item_data in sub_data["items"]:
                        item = ChecklistItemTemplate(
                            subsection_id=subsection.id,
                            name=item_data["name"],
                            category=item_data["category"],
                            must_image=item_data["must_image"],
                            must_note=item_data["must_note"],
                            must_signature=item_data["must_signature"],
                        )
                        session.add(item)
                        total_items += 1

            await session.commit()
            print(
                f"Seeded {len(all_templates)} checklist templates, "
                f"{total_subsections} subsections, {total_items} items"
            )

        except Exception as e:
            await session.rollback()
            print(f"Error seeding checklist templates: {e}")
            raise
