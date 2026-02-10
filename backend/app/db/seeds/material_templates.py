"""
Seed script to populate material templates from predefined data.
Run with: python -m app.db.seeds.material_templates
"""
import asyncio

from sqlalchemy import select

from app.db.session import AsyncSessionLocal
from app.models.equipment_template import ConsultantType
from app.models.material_template import MaterialTemplate, MaterialTemplateConsultant

# Material template data - construction materials requiring approval
MATERIAL_TEMPLATES = [
    # === CONCRETE & CEMENT ===
    {
        "name": "Concrete",
        "name_he": "בטון",
        "category": "concrete",
        "required_documents": ["מפרט טכני", "תעודת בדיקת מעבדה", "אישור תקן"],
        "required_specifications": ["חוזק", "סוג", "תוספים", "יחס מים/צמנט"],
        "submission_checklist": ["תעודת מעבדה", "אישור יועץ קונסטרוקציה", "דוגמה מאושרת"],
        "consultants": ["קונסטרוקטור"]
    },
    {
        "name": "Reinforcement Steel",
        "name_he": "ברזל זיון",
        "category": "concrete",
        "required_documents": ["מפרט טכני", "תעודת מעבדה", "אישור תקן ישראלי"],
        "required_specifications": ["קוטר", "סוג פלדה", "חוזק משיכה"],
        "submission_checklist": ["תעודת יצרן", "בדיקת מעבדה", "אישור קונסטרוקטור"],
        "consultants": ["קונסטרוקטור"]
    },
    {
        "name": "Cement",
        "name_he": "צמנט",
        "category": "concrete",
        "required_documents": ["מפרט טכני", "תעודת יצרן"],
        "required_specifications": ["סוג", "חוזק", "תקן"],
        "submission_checklist": ["תעודת יצרן", "אישור תקן"],
        "consultants": ["קונסטרוקטור"]
    },
    # === MASONRY ===
    {
        "name": "Concrete Blocks",
        "name_he": "בלוקים",
        "category": "masonry",
        "required_documents": ["מפרט טכני", "תעודת מעבדה"],
        "required_specifications": ["מידות", "צפיפות", "חוזק לחיצה"],
        "submission_checklist": ["תעודת יצרן", "בדיקת מעבדה", "אישור תקן"],
        "consultants": ["קונסטרוקטור"]
    },
    {
        "name": "Bricks",
        "name_he": "לבנים",
        "category": "masonry",
        "required_documents": ["מפרט טכני", "קטלוג יצרן"],
        "required_specifications": ["מידות", "צבע", "סוג"],
        "submission_checklist": ["דוגמה מאושרת", "אישור אדריכל"],
        "consultants": ["אדריכל"]
    },
    {
        "name": "AAC Blocks (Ytong)",
        "name_he": "בלוקים תרמיים (איטונג)",
        "category": "masonry",
        "required_documents": ["מפרט טכני", "תעודת בידוד תרמי"],
        "required_specifications": ["מידות", "צפיפות", "מקדם בידוד"],
        "submission_checklist": ["תעודת יצרן", "אישור בניה ירוקה", "בדיקת תקן"],
        "consultants": ["קונסטרוקטור", "בניה ירוקה"]
    },
    # === WATERPROOFING & INSULATION ===
    {
        "name": "Waterproofing Membrane",
        "name_he": "יריעות איטום",
        "category": "waterproofing",
        "required_documents": ["מפרט טכני", "תעודת איכות", "הוראות יישום"],
        "required_specifications": ["עובי", "סוג חומר", "עמידות UV"],
        "submission_checklist": ["תעודת יצרן", "אישור קונסטרוקטור", "דוגמה"],
        "consultants": ["קונסטרוקטור"]
    },
    {
        "name": "Thermal Insulation",
        "name_he": "בידוד תרמי",
        "category": "insulation",
        "required_documents": ["מפרט טכני", "תעודת בידוד", "אישור בניה ירוקה"],
        "required_specifications": ["עובי", "מקדם בידוד", "סוג חומר"],
        "submission_checklist": ["תעודת יצרן", "חישוב תרמי", "אישור בניה ירוקה"],
        "consultants": ["בניה ירוקה", "קונסטרוקטור"]
    },
    {
        "name": "Acoustic Insulation",
        "name_he": "בידוד אקוסטי",
        "category": "insulation",
        "required_documents": ["מפרט טכני", "תעודת בידוד אקוסטי"],
        "required_specifications": ["עובי", "מקדם הנחתה", "סוג חומר"],
        "submission_checklist": ["תעודת יצרן", "בדיקת אקוסטיקה", "אישור יועץ"],
        "consultants": ["יועץ אקוסטיקה"]
    },
    # === TILES & FLOORING ===
    {
        "name": "Floor Tiles",
        "name_he": "אריחי רצפה",
        "category": "flooring",
        "required_documents": ["מפרט טכני", "קטלוג יצרן", "דוגמאות"],
        "required_specifications": ["מידות", "חומר", "עמידות החלקה", "גוון"],
        "submission_checklist": ["דוגמה מאושרת", "אישור אדריכל", "תעודת יצרן"],
        "consultants": ["אדריכל"]
    },
    {
        "name": "Wall Tiles",
        "name_he": "אריחי קיר",
        "category": "flooring",
        "required_documents": ["מפרט טכני", "קטלוג יצרן", "דוגמאות"],
        "required_specifications": ["מידות", "חומר", "גוון"],
        "submission_checklist": ["דוגמה מאושרת", "אישור אדריכל"],
        "consultants": ["אדריכל"]
    },
    {
        "name": "Porcelain Tiles",
        "name_he": "גרניט פורצלן",
        "category": "flooring",
        "required_documents": ["מפרט טכני", "תעודת איכות", "דוגמאות"],
        "required_specifications": ["מידות", "עובי", "עמידות החלקה", "ספיגת מים"],
        "submission_checklist": ["דוגמה מאושרת", "אישור אדריכל", "תעודת יצרן"],
        "consultants": ["אדריכל"]
    },
    {
        "name": "Natural Stone",
        "name_he": "אבן טבעית",
        "category": "flooring",
        "required_documents": ["מפרט טכני", "מקור האבן", "דוגמאות"],
        "required_specifications": ["סוג אבן", "מידות", "עובי", "גמר"],
        "submission_checklist": ["דוגמה מאושרת", "אישור אדריכל", "תעודת מקור"],
        "consultants": ["אדריכל"]
    },
    # === PLASTER & FINISHES ===
    {
        "name": "Plaster",
        "name_he": "טיח",
        "category": "finishes",
        "required_documents": ["מפרט טכני", "הוראות יישום"],
        "required_specifications": ["סוג", "עובי", "גמר"],
        "submission_checklist": ["תעודת יצרן", "דוגמה על קיר"],
        "consultants": ["אדריכל"]
    },
    {
        "name": "Paint",
        "name_he": "צבע",
        "category": "finishes",
        "required_documents": ["מפרט טכני", "קטלוג צבעים", "תעודת VOC"],
        "required_specifications": ["סוג", "גוון", "גמר", "רמת VOC"],
        "submission_checklist": ["דוגמה מאושרת", "אישור אדריכל", "אישור בניה ירוקה"],
        "consultants": ["אדריכל", "בניה ירוקה"]
    },
    # === DRYWALL ===
    {
        "name": "Gypsum Board",
        "name_he": "גבס",
        "category": "drywall",
        "required_documents": ["מפרט טכני", "תעודת אש", "תעודת רטיבות"],
        "required_specifications": ["עובי", "סוג", "עמידות אש", "עמידות רטיבות"],
        "submission_checklist": ["תעודת יצרן", "אישור תקן"],
        "consultants": ["אדריכל"]
    },
    {
        "name": "Metal Studs",
        "name_he": "פרופילי מתכת לגבס",
        "category": "drywall",
        "required_documents": ["מפרט טכני", "תכניות הרכבה"],
        "required_specifications": ["מידות", "עובי מתכת", "ציפוי"],
        "submission_checklist": ["תעודת יצרן", "אישור קונסטרוקטור"],
        "consultants": ["קונסטרוקטור"]
    },
    # === SANITARY ===
    {
        "name": "Sanitary Fixtures",
        "name_he": "כלים סניטריים",
        "category": "sanitary",
        "required_documents": ["מפרט טכני", "קטלוג יצרן", "תעודת תקן"],
        "required_specifications": ["סוג", "צבע", "מידות"],
        "submission_checklist": ["דוגמה מאושרת", "אישור אדריכל", "אישור יועץ אינסטלציה"],
        "consultants": ["אדריכל", "יועץ אינסטלציה"]
    },
    {
        "name": "Faucets",
        "name_he": "ברזים",
        "category": "sanitary",
        "required_documents": ["מפרט טכני", "קטלוג יצרן", "תעודת חיסכון מים"],
        "required_specifications": ["סוג", "גמר", "ספיקה"],
        "submission_checklist": ["דוגמה מאושרת", "אישור אדריכל", "אישור בניה ירוקה"],
        "consultants": ["אדריכל", "בניה ירוקה"]
    },
    # === PIPING ===
    {
        "name": "PVC Pipes",
        "name_he": "צנרת PVC",
        "category": "piping",
        "required_documents": ["מפרט טכני", "תעודת תקן"],
        "required_specifications": ["קוטר", "עובי דופן", "לחץ עבודה"],
        "submission_checklist": ["תעודת יצרן", "אישור יועץ אינסטלציה"],
        "consultants": ["יועץ אינסטלציה"]
    },
    {
        "name": "Copper Pipes",
        "name_he": "צנרת נחושת",
        "category": "piping",
        "required_documents": ["מפרט טכני", "תעודת תקן"],
        "required_specifications": ["קוטר", "עובי דופן", "סוג"],
        "submission_checklist": ["תעודת יצרן", "אישור יועץ אינסטלציה"],
        "consultants": ["יועץ אינסטלציה"]
    },
    # === ELECTRICAL ===
    {
        "name": "Electrical Cables",
        "name_he": "כבלים חשמליים",
        "category": "electrical",
        "required_documents": ["מפרט טכני", "תעודת תקן", "אישור מכון התקנים"],
        "required_specifications": ["שטח חתך", "מספר גידים", "סוג בידוד"],
        "submission_checklist": ["תעודת יצרן", "אישור יועץ חשמל"],
        "consultants": ["יועץ חשמל"]
    },
    {
        "name": "Electrical Outlets",
        "name_he": "שקעים חשמליים",
        "category": "electrical",
        "required_documents": ["מפרט טכני", "קטלוג יצרן"],
        "required_specifications": ["סוג", "צבע", "דירוג זרם"],
        "submission_checklist": ["דוגמה מאושרת", "אישור אדריכל", "אישור יועץ חשמל"],
        "consultants": ["יועץ חשמל", "אדריכל"]
    },
    {
        "name": "Light Switches",
        "name_he": "מתגי תאורה",
        "category": "electrical",
        "required_documents": ["מפרט טכני", "קטלוג יצרן"],
        "required_specifications": ["סוג", "צבע", "דירוג"],
        "submission_checklist": ["דוגמה מאושרת", "אישור אדריכל"],
        "consultants": ["אדריכל", "יועץ חשמל"]
    },
    # === ADHESIVES & SEALANTS ===
    {
        "name": "Tile Adhesive",
        "name_he": "דבק אריחים",
        "category": "finishes",
        "required_documents": ["מפרט טכני", "תעודת תקן", "הוראות יישום"],
        "required_specifications": ["סוג", "חוזק הצמדה", "זמן ייבוש", "תאימות לחומר"],
        "submission_checklist": ["תעודת יצרן", "אישור תקן ישראלי"],
        "consultants": ["אדריכל"]
    },
    {
        "name": "Grout",
        "name_he": "רובה",
        "category": "finishes",
        "required_documents": ["מפרט טכני", "קטלוג צבעים"],
        "required_specifications": ["סוג", "צבע", "רוחב מרווח", "עמידות למים"],
        "submission_checklist": ["דוגמה מאושרת", "אישור אדריכל"],
        "consultants": ["אדריכל"]
    },
    {
        "name": "Sealant",
        "name_he": "חומרי אטימה",
        "category": "waterproofing",
        "required_documents": ["מפרט טכני", "תעודת תקן", "הוראות יישום"],
        "required_specifications": ["סוג", "גמישות", "עמידות UV", "תאימות למשטח"],
        "submission_checklist": ["תעודת יצרן", "אישור קונסטרוקטור"],
        "consultants": ["קונסטרוקטור"]
    },
    {
        "name": "Mortar",
        "name_he": "מלט",
        "category": "concrete",
        "required_documents": ["מפרט טכני", "תעודת יצרן"],
        "required_specifications": ["סוג", "חוזק", "יחס ערבוב", "זמן התקשות"],
        "submission_checklist": ["תעודת יצרן", "אישור תקן", "אישור קונסטרוקטור"],
        "consultants": ["קונסטרוקטור"]
    },
]


async def seed_material_templates():
    """
    Seed material templates with their consultant associations.
    This function is idempotent - running it multiple times won't create duplicates.
    """
    async with AsyncSessionLocal() as session:
        try:
            templates_created = 0
            templates_skipped = 0

            # Get existing consultant types
            result = await session.execute(select(ConsultantType))
            consultant_types = {ct.name: ct.id for ct in result.scalars().all()}

            for template_data in MATERIAL_TEMPLATES:
                # Check if template already exists by name (idempotent)
                result = await session.execute(
                    select(MaterialTemplate).where(MaterialTemplate.name == template_data["name"])
                )
                existing_template = result.scalar_one_or_none()

                if existing_template:
                    templates_skipped += 1
                    continue

                # Create new template
                template = MaterialTemplate(
                    name=template_data["name"],
                    name_he=template_data["name_he"],
                    category=template_data.get("category", "general"),
                    required_documents=template_data["required_documents"],
                    required_specifications=template_data["required_specifications"],
                    submission_checklist=template_data["submission_checklist"]
                )
                session.add(template)
                await session.flush()

                # Add consultant associations
                for consultant_name in template_data["consultants"]:
                    if consultant_name in consultant_types:
                        template_consultant = MaterialTemplateConsultant(
                            template_id=template.id,
                            consultant_type_id=consultant_types[consultant_name]
                        )
                        session.add(template_consultant)

                templates_created += 1

            await session.commit()

            print(f"Successfully seeded {templates_created} material templates")
            if templates_skipped > 0:
                print(f"Skipped {templates_skipped} existing templates")

        except Exception as e:
            await session.rollback()
            print(f"Error seeding material templates: {e}")
            raise


def main():
    """Entry point for running the seed script."""
    asyncio.run(seed_material_templates())


if __name__ == "__main__":
    main()
