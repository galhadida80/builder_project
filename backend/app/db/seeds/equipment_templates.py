"""
Seed script to populate equipment templates from predefined data.
Run with: python -m app.db.seeds.equipment_templates
"""
import asyncio
from sqlalchemy import select
from app.db.session import AsyncSessionLocal
from app.models.equipment_template import EquipmentTemplate, TemplateConsultant


# Equipment template data based on רשימת ציוד לאישור.xlsx
EQUIPMENT_TEMPLATES = [
    {
        "name": "קירות סלארים",
        "name_en": "Slurry Walls",
        "required_documents": ["מפרט טכני", "מפרט טכני מיוחד", "תכניות ייצור"],
        "required_specifications": ["כמות", "עובי", "עומק", "סוג בטון"],
        "submission_checklist": ["אישור מעבדה", "תכניות מאושרות", "תעודת בדיקה"],
        "consultants": ["קונסטרוקטור", "יועץ קרקע", "אדריכל"]
    },
    {
        "name": "משאבת ספרינקלרים",
        "name_en": "Sprinkler Pumps",
        "required_documents": ["מפרט טכני", "קטלוג יצרן", "תעודת אחריות"],
        "required_specifications": ["ספיקה", "לחץ", "הספק", "מתח"],
        "submission_checklist": ["אישור UL/FM", "תעודת יצרן", "הוראות הפעלה"],
        "consultants": ["יועץ אינסטלציה"]
    },
    {
        "name": "משאבת צריכה",
        "name_en": "Consumption Pumps",
        "required_documents": ["מפרט טכני", "קטלוג יצרן", "תכנית חיבורים"],
        "required_specifications": ["ספיקה", "לחץ", "הספק", "סוג מנוע"],
        "submission_checklist": ["תעודת יצרן", "אישור תקן", "הוראות תחזוקה"],
        "consultants": ["יועץ אינסטלציה"]
    },
    {
        "name": "משאבת הגברת לחץ גוקי",
        "name_en": "Jockey Pump",
        "required_documents": ["מפרט טכני", "קטלוג יצרן", "תעודת התאמה"],
        "required_specifications": ["ספיקה", "לחץ", "הספק", "טווח פעולה"],
        "submission_checklist": ["אישור FM", "תעודת יצרן", "מדריך תפעול"],
        "consultants": ["יועץ אינסטלציה"]
    },
    {
        "name": "משאבות כיבוי אש",
        "name_en": "Fire Pumps",
        "required_documents": ["מפרט טכני", "קטלוג יצרן", "אישור כיבוי אש"],
        "required_specifications": ["ספיקה", "לחץ", "הספק", "סוג דיזל/חשמלי"],
        "submission_checklist": ["אישור UL/FM", "תעודת בדיקה", "הוראות הפעלה"],
        "consultants": ["יועץ אינסטלציה"]
    },
    {
        "name": "משאבות טבולות",
        "name_en": "Submersible Pumps",
        "required_documents": ["מפרט טכני", "קטלוג יצרן", "תעודת עמידות למים"],
        "required_specifications": ["ספיקה", "גובה הרמה", "הספק", "דרגת הגנה"],
        "submission_checklist": ["תעודת יצרן", "אישור IP68", "מדריך התקנה"],
        "consultants": ["יועץ אינסטלציה"]
    },
    {
        "name": "גנרטור",
        "name_en": "Generator",
        "required_documents": ["מפרט טכני", "קטלוג יצרן", "תכנית חיבור חשמלי"],
        "required_specifications": ["הספק", "מתח", "תדר", "סוג דלק"],
        "submission_checklist": ["תעודת יצרן", "אישור משרד הכלכלה", "מדידת רעש"],
        "consultants": ["יועץ חשמל", "יועץ אקוסטיקה"]
    },
    {
        "name": "מפוחים",
        "name_en": "Fans",
        "required_documents": ["מפרט טכני", "קטלוג יצרן", "תעודת אקוסטיקה"],
        "required_specifications": ["ספיקה", "לחץ סטטי", "הספק", "רמת רעש"],
        "submission_checklist": ["תעודת יצרן", "מדידת רעש", "אישור תקן"],
        "consultants": ["יועץ מיזוג", "יועץ אקוסטיקה"]
    },
    {
        "name": "מעקות מרפסות",
        "name_en": "Balcony Railings",
        "required_documents": ["מפרט טכני", "תכניות ייצור", "תעודת חוזק"],
        "required_specifications": ["גובה", "חומר", "מרווח בין מוטות", "עומס"],
        "submission_checklist": ["תעודת בדיקה", "אישור קונסטרוקטור", "תכניות מאושרות"],
        "consultants": ["אדריכל", "קונסטרוקטור"]
    },
    {
        "name": "לוחות חשמל",
        "name_en": "Electrical Panels",
        "required_documents": ["מפרט טכני", "תכניות חד קוויות", "אישור חשמלאי"],
        "required_specifications": ["זרם", "מתח", "דרגת הגנה", "מספר יציאות"],
        "submission_checklist": ["תעודת יצרן", "אישור משרד האנרגיה", "תקן ירוק"],
        "consultants": ["יועץ חשמל", "בניה ירוקה"]
    },
    {
        "name": "דלת כניסה",
        "name_en": "Entry Door",
        "required_documents": ["מפרט טכני", "קטלוג יצרן", "תעודת אש/פריצה"],
        "required_specifications": ["מידות", "חומר", "דרגת אש", "דרגת ביטחון"],
        "submission_checklist": ["תעודת יצרן", "אישור תקן", "הוראות התקנה"],
        "consultants": ["אדריכל"]
    }
]


async def seed_equipment_templates():
    """
    Seed equipment templates with their consultant associations.
    This function is idempotent - running it multiple times won't create duplicates.
    """
    async with AsyncSessionLocal() as session:
        try:
            templates_created = 0
            templates_skipped = 0

            for template_data in EQUIPMENT_TEMPLATES:
                # Check if template already exists by name (idempotent)
                result = await session.execute(
                    select(EquipmentTemplate).where(EquipmentTemplate.name == template_data["name"])
                )
                existing_template = result.scalar_one_or_none()

                if existing_template:
                    templates_skipped += 1
                    continue

                # Create new template
                template = EquipmentTemplate(
                    name=template_data["name"],
                    name_en=template_data["name_en"],
                    required_documents=template_data["required_documents"],
                    required_specifications=template_data["required_specifications"],
                    submission_checklist=template_data["submission_checklist"]
                )

                # Add consultant associations
                for consultant_role in template_data["consultants"]:
                    template_consultant = TemplateConsultant(
                        consultant_role=consultant_role
                    )
                    template.consultants.append(template_consultant)

                session.add(template)
                templates_created += 1

            await session.commit()

            print(f"Successfully seeded {templates_created} equipment templates")
            if templates_skipped > 0:
                print(f"Skipped {templates_skipped} existing templates")

        except Exception as e:
            await session.rollback()
            print(f"Error seeding equipment templates: {e}")
            raise


def main():
    """Entry point for running the seed script."""
    asyncio.run(seed_equipment_templates())


if __name__ == "__main__":
    main()
