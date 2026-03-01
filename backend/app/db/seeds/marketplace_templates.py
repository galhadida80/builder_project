"""
Seed script to populate marketplace with official Israeli standard templates.
Run with: python -m app.db.seeds.marketplace_templates
"""
import asyncio

from sqlalchemy import select

from app.db.session import AsyncSessionLocal
from app.models.marketplace_template import (
    ListingStatus,
    MarketplaceListing,
    MarketplaceTemplate,
    TemplateTier,
    TemplateType,
)

MARKETPLACE_TEMPLATES = [
    {
        "template_type": TemplateType.INSPECTION.value,
        "name": "Standard Structural Inspection",
        "name_he": "פיקוח קונסטרוקציה תקני",
        "description": "Complete structural inspection template covering all stages from foundation to completion, aligned with Israeli building standards.",
        "description_he": "תבנית פיקוח קונסטרוקציה מלאה המכסה את כל השלבים מיסודות ועד השלמה, בהתאם לתקנים הישראליים.",
        "category": "structural",
        "trade": "structural",
        "building_type": "residential",
        "regulatory_standard": "Israeli Building Code",
        "tags": ["foundation", "concrete", "steel", "structural"],
        "template_data": {
            "stages": [
                {
                    "name": "Grade beam",
                    "name_he": "קורת ראש",
                    "items": ["Rebar placement", "Concrete pour", "Quality check"]
                },
                {
                    "name": "Foundation - bottom rebar complete",
                    "name_he": "ביסוס - בסיום ברזל תחתון",
                    "items": ["Bottom rebar inspection", "Spacing verification", "Coverage check"]
                },
                {
                    "name": "Foundation - top rebar complete",
                    "name_he": "ביסוס - בסיום ברזל עליון",
                    "items": ["Top rebar inspection", "Connection check", "Final approval"]
                },
                {
                    "name": "Slab inspection per floor",
                    "name_he": "תקרות - פיקוח עליון לכל תקרה",
                    "items": ["Rebar placement", "Formwork check", "Pour approval"]
                }
            ]
        },
        "tier": TemplateTier.FREE.value,
        "is_official": True
    },
    {
        "template_type": TemplateType.INSPECTION.value,
        "name": "Electrical System Inspection",
        "name_he": "פיקוח מערכות חשמל",
        "description": "Comprehensive electrical inspection template covering grounding, wiring, panels, and final testing per Israeli electrical standards.",
        "description_he": "תבנית פיקוח חשמל מקיפה המכסה הארקות, השחלות, לוחות חשמל ובדיקות סיום לפי התקן הישראלי.",
        "category": "electrical",
        "trade": "electrical",
        "building_type": "residential",
        "regulatory_standard": "Israeli Standard 1037",
        "tags": ["electrical", "grounding", "panels", "wiring"],
        "template_data": {
            "stages": [
                {
                    "name": "Grade beam grounding",
                    "name_he": "הארקות קורת ראש",
                    "items": ["Ground rod installation", "Connection test", "Documentation"]
                },
                {
                    "name": "Foundation grounding",
                    "name_he": "הארקת יסודות",
                    "items": ["Foundation electrode", "Bonding check", "Resistance measurement"]
                },
                {
                    "name": "Model apt - after wiring + panel install",
                    "name_he": "דירה הנדסית - לאחר השחלות בדירה + התקנת לוח חשמל דירתי",
                    "items": ["Wiring inspection", "Panel installation", "Circuit testing"]
                },
                {
                    "name": "After main electrical panels complete",
                    "name_he": "לאחר סיום לוחות חשמל ראשיים לבניין",
                    "items": ["Main panel check", "Load distribution", "Safety compliance"]
                }
            ]
        },
        "tier": TemplateTier.FREE.value,
        "is_official": True
    },
    {
        "template_type": TemplateType.INSPECTION.value,
        "name": "Waterproofing Inspection",
        "name_he": "פיקוח איטום",
        "description": "Detailed waterproofing inspection template for foundations, walls, wet rooms, and roofs according to Israeli standards.",
        "description_he": "תבנית פיקוח איטום מפורטת ליסודות, קירות, חדרים רטובים וגגות לפי התקנים הישראליים.",
        "category": "waterproofing",
        "trade": "waterproofing",
        "building_type": "residential",
        "regulatory_standard": "Israeli Standard 1203",
        "tags": ["waterproofing", "membrane", "wet rooms", "roof"],
        "template_data": {
            "stages": [
                {
                    "name": "Foundation slab waterproofing",
                    "name_he": "איטום רפסודה",
                    "items": ["Surface preparation", "Membrane application", "Seam inspection"]
                },
                {
                    "name": "Retaining wall waterproofing",
                    "name_he": "איטום קירות דיפון",
                    "items": ["Wall surface prep", "Coating application", "Drainage board"]
                },
                {
                    "name": "Wet room waterproofing",
                    "name_he": "איטום חדרים רטובים",
                    "items": ["Floor membrane", "Wall height check", "Water test"]
                },
                {
                    "name": "Roof waterproofing",
                    "name_he": "איטום גגות",
                    "items": ["Roof prep", "Membrane layers", "Final inspection"]
                }
            ]
        },
        "tier": TemplateTier.FREE.value,
        "is_official": True
    },
    {
        "template_type": TemplateType.INSPECTION.value,
        "name": "Plumbing Inspection",
        "name_he": "פיקוח אינסטלציה",
        "description": "Complete plumbing inspection template covering underground piping, water systems, sprinklers, and pump rooms per Israeli standards.",
        "description_he": "תבנית פיקוח אינסטלציה מלאה המכסה צנרת תת קרקעית, מערכות מים, ספרינקלרים וחדר משאבות לפי התקנים.",
        "category": "plumbing",
        "trade": "plumbing",
        "building_type": "residential",
        "regulatory_standard": "Israeli Standard 1205",
        "tags": ["plumbing", "pipes", "water", "sprinklers"],
        "template_data": {
            "stages": [
                {
                    "name": "Foundation - underground piping complete",
                    "name_he": "ביסוס - לאחר סיום הנחת צנרת מתחת לבניין",
                    "items": ["Pipe layout check", "Slope verification", "Pressure test"]
                },
                {
                    "name": "Before water reservoir pour",
                    "name_he": "לפני יציקת מאגר מים - סגירת תפסות ומיקומי צינורות ופתח מאגרים",
                    "items": ["Pipe positions", "Fixture locations", "Access opening"]
                },
                {
                    "name": "After sprinkler installation",
                    "name_he": "בסיום התקנת ספרינקלרים",
                    "items": ["Head spacing", "Hydraulic test", "Flow verification"]
                },
                {
                    "name": "After pump room installation",
                    "name_he": "לאחר התקנת חדר משאבות",
                    "items": ["Pump installation", "Piping connections", "Control panel"]
                }
            ]
        },
        "tier": TemplateTier.FREE.value,
        "is_official": True
    },
    {
        "template_type": TemplateType.CHECKLIST.value,
        "name": "Apartment Handover Checklist",
        "name_he": "רשימת בדיקה למסירת דירה",
        "description": "Comprehensive apartment handover checklist covering all rooms, fixtures, finishes, and systems for residential units.",
        "description_he": "רשימת בדיקה מקיפה למסירת דירה המכסה את כל החדרים, האביזרים, התגמירים והמערכות ליחידות מגורים.",
        "category": "handover",
        "building_type": "residential",
        "tags": ["apartment", "handover", "checklist", "inspection"],
        "template_data": {
            "sections": [
                {
                    "name": "Living Room",
                    "name_he": "סלון",
                    "items": [
                        {"name": "Floor tiles", "name_he": "ריצוף"},
                        {"name": "Walls painted", "name_he": "צבע קירות"},
                        {"name": "Ceiling finish", "name_he": "גימור תקרה"},
                        {"name": "Electrical outlets", "name_he": "שקעי חשמל"},
                        {"name": "Light switches", "name_he": "מתגי תאורה"}
                    ]
                },
                {
                    "name": "Kitchen",
                    "name_he": "מטבח",
                    "items": [
                        {"name": "Floor tiles", "name_he": "ריצוף"},
                        {"name": "Wall tiles", "name_he": "חיפוי קרמיקה"},
                        {"name": "Sink installation", "name_he": "התקנת כיור"},
                        {"name": "Faucet working", "name_he": "ברז תקין"},
                        {"name": "Water pressure", "name_he": "לחץ מים"}
                    ]
                },
                {
                    "name": "Bathroom",
                    "name_he": "חדר רחצה",
                    "items": [
                        {"name": "Floor tiles", "name_he": "ריצוף"},
                        {"name": "Wall tiles height", "name_he": "גובה חיפוי"},
                        {"name": "Toilet installation", "name_he": "אסלה"},
                        {"name": "Sink installation", "name_he": "כיור"},
                        {"name": "Shower/tub", "name_he": "מקלחת/אמבטיה"},
                        {"name": "Water drainage", "name_he": "ניקוז תקין"}
                    ]
                }
            ]
        },
        "tier": TemplateTier.FREE.value,
        "is_official": True
    },
    {
        "template_type": TemplateType.SAFETY_FORM.value,
        "name": "Fire Safety Inspection Form",
        "name_he": "טופס בדיקת בטיחות אש",
        "description": "Official fire safety inspection form aligned with Israeli Fire Department requirements and building code regulations.",
        "description_he": "טופס רשמי לבדיקת בטיחות אש בהתאם לדרישות כיבוי האש והתקנים.",
        "category": "fire_safety",
        "trade": "fire_safety",
        "building_type": "residential",
        "regulatory_standard": "Form A-2",
        "tags": ["fire", "safety", "sprinklers", "fire department"],
        "template_data": {
            "sections": [
                {
                    "name": "Sprinkler System",
                    "name_he": "מערכת ספרינקלרים",
                    "items": [
                        {"name": "Head coverage", "name_he": "כיסוי ראשים"},
                        {"name": "Water supply", "name_he": "אספקת מים"},
                        {"name": "Pump room", "name_he": "חדר משאבות"},
                        {"name": "Control valves", "name_he": "שסתומי בקרה"}
                    ]
                },
                {
                    "name": "Fire Detection",
                    "name_he": "גילוי אש",
                    "items": [
                        {"name": "Smoke detectors", "name_he": "גלאי עשן"},
                        {"name": "Control panel", "name_he": "לוח בקרה"},
                        {"name": "Alarm system", "name_he": "מערכת אזעקה"}
                    ]
                },
                {
                    "name": "Fire Exits",
                    "name_he": "יציאות חירום",
                    "items": [
                        {"name": "Exit signage", "name_he": "שילוט יציאה"},
                        {"name": "Emergency lighting", "name_he": "תאורת חירום"},
                        {"name": "Door width", "name_he": "רוחב דלתות"}
                    ]
                }
            ]
        },
        "tier": TemplateTier.FREE.value,
        "is_official": True
    },
    {
        "template_type": TemplateType.QUALITY_CONTROL.value,
        "name": "Concrete Quality Control",
        "name_he": "בקרת איכות בטון",
        "description": "Quality control template for concrete work including mix design verification, testing procedures, and compliance checks.",
        "description_he": "תבנית בקרת איכות לעבודות בטון כולל אימות תכנון תערובת, נוהלי בדיקה ובדיקות תאימות.",
        "category": "concrete",
        "trade": "structural",
        "building_type": "residential",
        "regulatory_standard": "Israeli Standard 466",
        "tags": ["concrete", "quality", "testing", "structural"],
        "template_data": {
            "sections": [
                {
                    "name": "Mix Design",
                    "name_he": "תכנון תערובת",
                    "items": [
                        {"name": "Strength grade", "name_he": "דרגת חוזק"},
                        {"name": "Water/cement ratio", "name_he": "יחס מים/צמנט"},
                        {"name": "Aggregate size", "name_he": "גודל אגרגט"},
                        {"name": "Admixtures", "name_he": "תוספים"}
                    ]
                },
                {
                    "name": "Testing",
                    "name_he": "בדיקות",
                    "items": [
                        {"name": "Slump test", "name_he": "בדיקת שקיעה"},
                        {"name": "Cube samples", "name_he": "דגימות קוביות"},
                        {"name": "Laboratory results", "name_he": "תוצאות מעבדה"}
                    ]
                },
                {
                    "name": "Documentation",
                    "name_he": "תיעוד",
                    "items": [
                        {"name": "Delivery slips", "name_he": "תעודות משלוח"},
                        {"name": "Pour location", "name_he": "מיקום יציקה"},
                        {"name": "Date and time", "name_he": "תאריך ושעה"}
                    ]
                }
            ]
        },
        "tier": TemplateTier.FREE.value,
        "is_official": True
    },
    {
        "template_type": TemplateType.INSPECTION.value,
        "name": "Green Building Inspection",
        "name_he": "פיקוח בנייה ירוקה",
        "description": "Green building inspection template aligned with Israeli Standard 5281 covering thermal, energy, and sustainability requirements.",
        "description_he": "תבנית פיקוח בנייה ירוקה בהתאם לתקן 5281 המכסה דרישות תרמיות, אנרגטיות וקיימות.",
        "category": "green_building",
        "trade": "green_building",
        "building_type": "residential",
        "regulatory_standard": "Israeli Standard 5281",
        "tags": ["green", "thermal", "energy", "sustainability"],
        "template_data": {
            "stages": [
                {
                    "name": "Finish selection briefing",
                    "name_he": "הסבר בחירת תגמירים לקבלן",
                    "items": ["Material selection", "Thermal properties", "Documentation"]
                },
                {
                    "name": "Thermal plaster application",
                    "name_he": "יישום טיח תרמי",
                    "items": ["Application method", "Thickness check", "Coverage verification"]
                },
                {
                    "name": "Shell complete + certification",
                    "name_he": "סיום שלד + מכון התעדה",
                    "items": ["Envelope inspection", "Thermal bridges", "Certification prep"]
                },
                {
                    "name": "Form 4",
                    "name_he": "טופס 4",
                    "items": ["Final inspection", "Energy certificate", "Compliance verification"]
                }
            ]
        },
        "tier": TemplateTier.FREE.value,
        "is_official": True
    }
]


async def seed_marketplace():
    """
    Seed marketplace with official Israeli standard templates.
    This function is idempotent - running it multiple times won't create duplicates.
    """
    async with AsyncSessionLocal() as session:
        try:
            templates_created = 0
            templates_skipped = 0
            listings_created = 0

            for template_data in MARKETPLACE_TEMPLATES:
                result = await session.execute(
                    select(MarketplaceTemplate).where(
                        MarketplaceTemplate.name == template_data["name"]
                    )
                )
                existing_template = result.scalar_one_or_none()

                if existing_template:
                    templates_skipped += 1
                    continue

                template = MarketplaceTemplate(
                    template_type=template_data["template_type"],
                    name=template_data["name"],
                    name_he=template_data["name_he"],
                    description=template_data.get("description"),
                    description_he=template_data.get("description_he"),
                    category=template_data["category"],
                    trade=template_data.get("trade"),
                    building_type=template_data.get("building_type"),
                    regulatory_standard=template_data.get("regulatory_standard"),
                    tags=template_data.get("tags", []),
                    template_data=template_data["template_data"],
                    tier=template_data["tier"],
                    is_official=template_data["is_official"],
                    created_by_id=None,
                    organization_id=None
                )
                session.add(template)
                await session.flush()
                templates_created += 1

                listing = MarketplaceListing(
                    template_id=template.id,
                    status=ListingStatus.APPROVED.value,
                    featured=True,
                    install_count=0,
                    average_rating=None,
                    review_count=0
                )
                session.add(listing)
                listings_created += 1

            await session.commit()

            print(f"Successfully seeded {templates_created} marketplace templates with {listings_created} listings")
            if templates_skipped > 0:
                print(f"Skipped {templates_skipped} existing templates")

        except Exception as e:
            await session.rollback()
            print(f"Error seeding marketplace templates: {e}")
            raise


def main():
    """Entry point for running the seed script."""
    asyncio.run(seed_marketplace())


if __name__ == "__main__":
    main()
