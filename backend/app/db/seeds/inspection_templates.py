"""Seed inspection consultant types and stages from Excel data.

Data source: פיקוחים עליונים - כמות בדיקות.xlsx
22 consultant types with real Hebrew stage descriptions.
"""
from sqlalchemy import delete, select

from app.db.session import AsyncSessionLocal
from app.models.inspection_template import InspectionConsultantType, InspectionStageTemplate

CONSULTANT_DATA = [
    {
        "name": "Agronomist",
        "name_he": "אגרונום",
        "category": "site",
        "stages": [
            ("Start of works - after tree protection and pruning details",
             "תחילת עבודות - לאחר סיום ביצוע הגנה ופרטים לעצים לשימור + גיזום"),
        ],
    },
    {
        "name": "Soil",
        "name_he": "קרקע",
        "category": "structural",
        "stages": [
            ("Drilling - first borehole", "קידוחים - קידוח ראשון"),
            ("Anchors", "עוגנים"),
            ("Steel supports", "תמיכות פלדה"),
            ("Mid/end excavation", "באמצע שלב החפירה/סיום חפירה"),
        ],
    },
    {
        "name": "Hydrologist",
        "name_he": "הידרולוג",
        "category": "structural",
        "stages": [
            ("Before groundwater pumping", "לפני שאיבת מי תהום"),
            ("During groundwater pumping", "במהלך שאיבות מי תהום"),
            ("End of groundwater pumping", "סיום שאיבת מי תהום"),
            ("Infiltration borehole", "קידוח החדרה"),
        ],
    },
    {
        "name": "Waterproofing",
        "name_he": "איטום",
        "category": "envelope",
        "stages": [
            ("Foundation slab waterproofing", "איטום רפסודה"),
            ("Retaining wall waterproofing", "איטום קירות דיפון"),
            ("Wet room waterproofing", "איטום חדרים רטובים"),
            ("Roof waterproofing", "איטום גגות"),
            ("Basement ceiling waterproofing", "איטום תקרת מרתף"),
        ],
    },
    {
        "name": "Structural",
        "name_he": "קונסטרוקטור",
        "category": "structural",
        "stages": [
            ("Grade beam", "קורת ראש"),
            ("Steel supports", "תמיכות פלדה"),
            ("Foundation - bottom rebar complete", "ביסוס - בסיום ברזל תחתון"),
            ("Foundation - top rebar complete", "ביסוס - בסיום ברזל עליון"),
            ("Slab inspection per floor", "תקרות - פיקוח עליון לכל תקרה"),
        ],
    },
    {
        "name": "Architect",
        "name_he": "אדריכל",
        "category": "design",
        "stages": [
            ("Basement shell complete - after cleanup", "בסיום שלד מרתפים - לאחר ניקיון המרתף"),
            ("Model apartment", "דירה הנדסית"),
            ("Model lobby", "לובי הנדסי"),
            ("Shell complete", "בסיום שלד"),
            ("Before scaffold removal", "לפני פירוק פיגום"),
            ("Form 4", "טופס 4"),
        ],
    },
    {
        "name": "Electrical",
        "name_he": "חשמל",
        "category": "mep",
        "stages": [
            ("Grade beam grounding", "הארקות קורת ראש"),
            ("Foundation grounding", "הארקת יסודות"),
            ("Model apt - after wiring + panel install",
             "דירה הנדסית - לאחר השחלות בדירה + התקנת לוח חשמל דירתי"),
            ("After basement cable trays complete", "לאחר סיום תעלות במרתפים"),
            ("After main electrical panels complete", "לאחר סיום לוחות חשמל ראשיים לבניין"),
            ("After pump panels + generator install",
             "לאחר סיום התקנת לוחות חשמל משאבות + גנרטור"),
        ],
    },
    {
        "name": "Plumbing",
        "name_he": "אינסטלציה",
        "category": "mep",
        "stages": [
            ("Foundation - underground piping complete",
             "ביסוס - לאחר סיום הנחת צנרת מתחת לבניין"),
            ("Before water reservoir pour",
             "לפני יציקת מאגר מים - סגירת תפסות ומיקומי צינורות ופתח מאגרים"),
            ("Basement gravity system near complete",
             "לקראת סיום התקנת מערכת גרביצטיה במרתף"),
            ("After sprinkler installation", "בסיום התקנת ספרינקלרים"),
            ("Apartment water supply + model lobby",
             "מערכת אספקת מים בדירה + לובי הנדסי"),
            ("After pump room installation", "לאחר התקנת חדר משאבות"),
            ("Before Form 4", "לפני טופס 4"),
        ],
    },
    {
        "name": "HVAC",
        "name_he": "מיזוג אוויר",
        "category": "mep",
        "stages": [
            ("After parking smoke ducts + fans install",
             "לאחר התקנת תעלות שחרור עשן בחניון + מפוחים"),
            ("Model lobby - after smoke dampers",
             "לובי הנדסי - לאחר התקנת תריסי שחרור עשן"),
            ("Model apt - after evaporators + ducts",
             "דירה הנדסית - לאחר התקנת מאיידים + תעלות/שרשורי בדירות"),
            ("After fan panel + system activation",
             "לאחר התקנת לוח מפוחים + הפעלות מערכת"),
        ],
    },
    {
        "name": "Safety",
        "name_he": "בטיחות",
        "category": "safety",
        "stages": [
            ("Basement shell complete - after cleanup",
             "בסיום שלד מרתפים - לאחר ניקיון המרתף"),
            ("Model lobby - after smoke dampers + sample signage",
             "לובי הנדסי - לאחר התקנת תריסי שחרור עשן + שילוט לדוגמה"),
            ("Stairwell - after railing and handrail",
             "חדר מדרגות - לאחר התקנת מעקה ומאחז יד"),
            ("Roof - after solar + condensers + louvers",
             "גגות - לאחר התקנת מערכות סולאריות + מעבים והתקנת רפפות"),
            ("Before fire dept. inspection - Form A-2",
             "לפני בדיקת כבאות - אישור טופס א-2"),
        ],
    },
    {
        "name": "Accessibility",
        "name_he": "נגישות",
        "category": "regulatory",
        "stages": [
            ("End of development before Form 4", "בסיום פיתוח לפני טופס 4"),
        ],
    },
    {
        "name": "Traffic",
        "name_he": "תנועה",
        "category": "regulatory",
        "stages": [
            ("Basement shell complete - after cleanup",
             "בסיום שלד מרתפים - לאחר ניקיון המרתף"),
        ],
    },
    {
        "name": "Protection",
        "name_he": "מיגון",
        "category": "safety",
        "stages": [],
    },
    {
        "name": "Lighting",
        "name_he": "תאורה",
        "category": "mep",
        "stages": [
            ("Model lobby + parking - after fixtures install",
             "לובי הנדסי + חניון - לאחר התקנת גופי תאורה"),
            ("Exterior lighting - after all building fixtures",
             "תאורת חוץ - לאחר התקנת גופי תאורת חוץ ושאר הבניין"),
        ],
    },
    {
        "name": "Signage",
        "name_he": "שילוט",
        "category": "finishing",
        "stages": [
            ("Model lobby + parking - after signage install",
             "לובי הנדסי + חניון - לאחר התקנת גופי שילוט"),
            ("After all building signage complete",
             "לאחר סיום התקנת כלל השילוט בבניין"),
        ],
    },
    {
        "name": "Radiation",
        "name_he": "קרינה",
        "category": "regulatory",
        "stages": [
            ("After radiation works complete", "לאחר סיום עבודות קרינה"),
        ],
    },
    {
        "name": "Aluminum",
        "name_he": "אלומיניום",
        "category": "envelope",
        "stages": [
            ("Blind frame installation", "התקנת משקופים עיוורים"),
            ("Model apartment - aluminum install",
             "דירה הנדסית - התקנת אלומיניום בדירה הנדסית"),
            ("During building aluminum installation",
             "במהלך התקנת אלומיניום בבניין"),
            ("Building aluminum installation complete",
             "סיום התקנת אלומיניום בבניין"),
        ],
    },
    {
        "name": "Elevator",
        "name_he": "מעליות",
        "category": "mep",
        "stages": [
            ("Elevator pit base", "פיר תחתית בור מעלית"),
            ("After elevator installation complete", "בסיום התקנת מעלית"),
            ("After standards institute approval", "אחרי קבלת מכון תקנים"),
        ],
    },
    {
        "name": "Acoustics",
        "name_he": "אקוסטיקה",
        "category": "design",
        "stages": [
            ("Model apt - elevator wall + insulation + floating floor + absorbers",
             "דירה הנדסית - פרטים אקוסטיים לקיר מעלית + בידוד בין דירות + פלציב מתחת לריצוף + קולטנים"),
            ("Roof - condenser + generator acoustic base",
             "גג - אקוסטיקה לבסיס מעבים + בסיס גנרטור (אם נמצא בגג אם לא בחדר גנרטור)"),
            ("Measurement for Form 4", "מדידה לטופס 4"),
        ],
    },
    {
        "name": "Green Building",
        "name_he": "בנייה ירוקה/תרמי",
        "category": "regulatory",
        "stages": [
            ("Finish selection briefing - ground floor",
             "הסבר בחירת תגמירים לקבלן - קומת קרקע"),
            ("Model floor - thermal plaster application",
             "קומה הנדסית - יישום טיח תרמי"),
            ("Shell complete + certification institute",
             "סיום שלד + מכון התעדה"),
            ("Form 4", "טופס 4"),
        ],
    },
    {
        "name": "Development",
        "name_he": "פיתוח",
        "category": "site",
        "stages": [
            ("Development execution complete", "סיום ביצוע פיתוח"),
            ("Planting and system header complete", "סיום שתילה וראש מערכת"),
        ],
    },
    {
        "name": "Interior Design",
        "name_he": "עיצוב פנים",
        "category": "design",
        "stages": [
            ("Model lobby", "לובי הנדסי"),
            ("Main lobby", "לובי ראשי"),
            ("Basements", "מרתפים"),
        ],
    },
]


async def seed_inspection_templates():
    async with AsyncSessionLocal() as session:
        try:
            result = await session.execute(select(InspectionConsultantType))
            existing = result.scalars().all()

            if existing:
                await session.execute(delete(InspectionStageTemplate))
                await session.execute(delete(InspectionConsultantType))
                await session.flush()
                print("Cleared old inspection templates for reseed")

            total_stages = 0
            for data in CONSULTANT_DATA:
                consultant = InspectionConsultantType(
                    name=data["name"],
                    name_he=data["name_he"],
                    category=data["category"],
                )
                session.add(consultant)
                await session.flush()

                for order, (name_en, name_he) in enumerate(data["stages"], start=1):
                    stage = InspectionStageTemplate(
                        consultant_type_id=consultant.id,
                        name=name_en,
                        name_he=name_he,
                        stage_order=order,
                    )
                    session.add(stage)
                    total_stages += 1

            await session.commit()
            print(f"Seeded {len(CONSULTANT_DATA)} consultant types with {total_stages} stages")

        except Exception as e:
            await session.rollback()
            print(f"Error seeding inspection templates: {e}")
            raise
