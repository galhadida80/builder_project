"""
Seed script to populate equipment templates from predefined data.
Run with: python -m app.db.seeds.equipment_templates
"""
import asyncio
from sqlalchemy import select
from app.db.session import AsyncSessionLocal
from app.models.equipment_template import EquipmentTemplate, EquipmentTemplateConsultant, ConsultantType


# Equipment template data based on רשימת ציוד לאישור.xlsx
# All 44 equipment categories from the Excel file
EQUIPMENT_TEMPLATES = [
    # === STRUCTURAL ===
    {
        "name": "קירות סלארים",
        "name_en": "Slurry Walls",
        "category": "structural",
        "required_documents": ["תכניות קונסטרוקציה", "מפרט טכני מיוחד", "תכנית העמדת מרתף", "מפרט יועץ קרקע"],
        "required_specifications": ["כמות", "עובי", "עומק", "סוג בטון"],
        "submission_checklist": ["מפרט יועץ נבדק", "צינורות גמה מתאימים", "תכנית העמדת סלארי", "תכניות ברזל אלמנטים"],
        "consultants": ["קונסטרוקטור", "יועץ קרקע", "אדריכל"]
    },
    {
        "name": "מעקות מרפסות",
        "name_en": "Balcony Railings",
        "category": "structural",
        "required_documents": ["פרט מרשימת מסגרות", "גוון"],
        "required_specifications": ["גובה", "חומר", "מרווח בין מוטות", "עומס"],
        "submission_checklist": ["סכמה סטטית לאישור קונסטרוקטור", "חלוקת סגמנטים לאישור אדריכל"],
        "consultants": ["אדריכל", "קונסטרוקטור"]
    },
    {
        "name": "מעקה חדר מדרגות",
        "name_en": "Stairway Railing",
        "category": "structural",
        "required_documents": ["פרט מרשימת מסגרות", "מפרט טכני"],
        "required_specifications": ["גובה", "חומר", "מרווח בין מוטות"],
        "submission_checklist": ["סכמה סטטית", "תכניות מאושרות"],
        "consultants": ["אדריכל", "קונסטרוקטור"]
    },
    {
        "name": "העמדת גג עליון",
        "name_en": "Roof Installation",
        "category": "structural",
        "required_documents": ["תכניות קונסטרוקציה", "מפרט טכני", "תכניות איטום"],
        "required_specifications": ["שטח", "שיפוע", "סוג איטום"],
        "submission_checklist": ["תכניות מאושרות", "אישור קונסטרוקטור"],
        "consultants": ["קונסטרוקטור", "אדריכל"]
    },
    # === PLUMBING/PUMPS ===
    {
        "name": "משאבת ספרינקלרים",
        "name_en": "Sprinkler Pumps",
        "category": "plumbing",
        "required_documents": ["מפרט טכני", "מפרט טכני מיוחד", "כמות", "ספיקה"],
        "required_specifications": ["ספיקה", "לחץ", "הספק", "מתח"],
        "submission_checklist": ["מפרט יועץ נבדק", "נתוני ספיקה + אופיין משאבה", "נתוני הספקים KW לגיבוי גנרטור", "שם ספק ויצרן"],
        "consultants": ["יועץ אינסטלציה"]
    },
    {
        "name": "משאבת צריכה",
        "name_en": "Consumption Pumps",
        "category": "plumbing",
        "required_documents": ["מפרט טכני", "מפרט טכני מיוחד", "כמות", "ספיקה"],
        "required_specifications": ["ספיקה", "לחץ", "הספק", "סוג מנוע"],
        "submission_checklist": ["מפרט יועץ נבדק", "נתוני ספיקה + אופיין משאבה", "נתוני הספקים KW לגיבוי גנרטור", "האם נדרש התקן לשומרי שבת", "שם ספק ויצרן"],
        "consultants": ["יועץ אינסטלציה"]
    },
    {
        "name": "משאבת הגברת לחץ גוקי",
        "name_en": "Jockey Pump",
        "category": "plumbing",
        "required_documents": ["מפרט טכני", "מפרט טכני מיוחד", "כמות", "ספיקה"],
        "required_specifications": ["ספיקה", "לחץ", "הספק", "טווח פעולה"],
        "submission_checklist": ["מפרט יועץ נבדק", "נתוני ספיקה + אופיין משאבה", "נתוני הספקים KW לגיבוי גנרטור", "שם ספק ויצרן"],
        "consultants": ["יועץ אינסטלציה"]
    },
    {
        "name": "משאבות כיבוי אש",
        "name_en": "Fire Pumps",
        "category": "plumbing",
        "required_documents": ["מפרט טכני", "מפרט טכני מיוחד", "כמות", "ספיקה"],
        "required_specifications": ["ספיקה", "לחץ", "הספק", "סוג דיזל/חשמלי"],
        "submission_checklist": ["מפרט יועץ נבדק", "נתוני ספיקה + אופיין משאבה", "נתוני הספקים KW לגיבוי גנרטור", "שם ספק ויצרן"],
        "consultants": ["יועץ אינסטלציה"]
    },
    {
        "name": "משאבות טבולות",
        "name_en": "Submersible Pumps",
        "category": "plumbing",
        "required_documents": ["מפרט טכני", "מפרט טכני מיוחד", "כמות", "ספיקה"],
        "required_specifications": ["ספיקה", "גובה הרמה", "הספק", "דרגת הגנה"],
        "submission_checklist": ["מפרט יועץ נבדק", "נתוני ספיקה + אופיין משאבה", "נתוני הספקים KW לגיבוי גנרטור", "שם ספק ויצרן"],
        "consultants": ["יועץ אינסטלציה"]
    },
    {
        "name": "חדר משאבות",
        "name_en": "Pump Room",
        "category": "plumbing",
        "required_documents": ["תכניות חדר משאבות", "מפרט טכני", "תכנית ניקוז"],
        "required_specifications": ["שטח", "גובה", "מערכות ניקוז"],
        "submission_checklist": ["תכניות מאושרות", "אישור יועץ אינסטלציה"],
        "consultants": ["יועץ אינסטלציה", "קונסטרוקטור"]
    },
    {
        "name": "ציוד אינסטלציה",
        "name_en": "Plumbing Equipment",
        "category": "plumbing",
        "required_documents": ["מפרט טכני", "קטלוג יצרן"],
        "required_specifications": ["סוג", "כמות", "תקן"],
        "submission_checklist": ["תעודת יצרן", "אישור תקן"],
        "consultants": ["יועץ אינסטלציה"]
    },
    {
        "name": "בריכות",
        "name_en": "Pools",
        "category": "plumbing",
        "required_documents": ["תכניות בריכה", "מפרט טכני", "תכנית מערכות"],
        "required_specifications": ["נפח", "מידות", "עומק", "מערכת סינון"],
        "submission_checklist": ["תכניות מאושרות", "אישור בטיחות", "אישור משרד הבריאות"],
        "consultants": ["יועץ אינסטלציה", "קונסטרוקטור", "אדריכל"]
    },
    {
        "name": "תעלת ניקוז רמפה",
        "name_en": "Ramp Drainage Channel",
        "category": "plumbing",
        "required_documents": ["מפרט טכני", "תכניות ניקוז"],
        "required_specifications": ["אורך", "רוחב", "ספיקה"],
        "submission_checklist": ["תכניות מאושרות", "אישור יועץ אינסטלציה"],
        "consultants": ["יועץ אינסטלציה"]
    },
    # === ELECTRICAL ===
    {
        "name": "גנרטור",
        "name_en": "Generator",
        "category": "electrical",
        "required_documents": ["מפרט טכני", "מפרט טכני מיוחד", "גודל גנרטור"],
        "required_specifications": ["הספק", "מתח", "תדר", "סוג דלק"],
        "submission_checklist": ["מפרט יועץ נבדק", "טבלת ציוד חירום ו/או שגרה מגובים על ידי הגנרטור עם הספקים", "בדיקת מפרט דיירים בנושא גנרטור", "תכנית העמדה", "שם ספק ויצרן"],
        "consultants": ["יועץ חשמל", "יועץ אקוסטיקה"]
    },
    {
        "name": "לוחות חשמל",
        "name_en": "Electrical Panels",
        "category": "electrical",
        "required_documents": ["מפרט טכני", "מפרט טכני מיוחד", "מפרט דיירים"],
        "required_specifications": ["זרם", "מתח", "דרגת הגנה", "מספר יציאות"],
        "submission_checklist": ["תכנית לוחות חשמל", "אישור מת\"י ליצרן לוחות"],
        "consultants": ["יועץ חשמל", "בניה ירוקה"]
    },
    {
        "name": "גופי תאורה ציבורי",
        "name_en": "Public Lighting Fixtures",
        "category": "electrical",
        "required_documents": ["מפרט טכני", "קטלוג יצרן", "תכנית תאורה"],
        "required_specifications": ["הספק", "עוצמת אור", "סוג נורה", "דרגת הגנה"],
        "submission_checklist": ["תעודת יצרן", "תכניות מאושרות", "אישור תקן"],
        "consultants": ["יועץ חשמל", "אדריכל"]
    },
    {
        "name": "מערכת סולארית",
        "name_en": "Solar System",
        "category": "electrical",
        "required_documents": ["מפרט טכני", "תכנית הצללה", "תכנית חשמל"],
        "required_specifications": ["הספק", "שטח פאנלים", "סוג ממיר"],
        "submission_checklist": ["תכניות מאושרות", "אישור חברת חשמל", "אישור בניה ירוקה"],
        "consultants": ["יועץ חשמל", "בניה ירוקה"]
    },
    # === HVAC ===
    {
        "name": "מפוחים",
        "name_en": "Fans/Blowers",
        "category": "hvac",
        "required_documents": ["מפרט טכני", "מפרט טכני מיוחד", "כמות"],
        "required_specifications": ["ספיקה", "לחץ סטטי", "הספק", "רמת רעש"],
        "submission_checklist": ["מפרט יועץ נבדק", "נתוני מפוחים ונתוני משתיקים", "נתוני הספקים KW לגיבוי גנרטור", "שם ספק ויצרן"],
        "consultants": ["יועץ מיזוג", "יועץ אקוסטיקה"]
    },
    {
        "name": "מיזוג אוויר ציבורי",
        "name_en": "Public Air Conditioning",
        "category": "hvac",
        "required_documents": ["מפרט טכני", "תכנית מיזוג", "חישוב עומסים"],
        "required_specifications": ["הספק קירור", "ספיקת אוויר", "רמת רעש"],
        "submission_checklist": ["תכניות מאושרות", "אישור יועץ מיזוג", "נתוני KW לגנרטור"],
        "consultants": ["יועץ מיזוג", "יועץ אקוסטיקה"]
    },
    {
        "name": "מיזוג אוויר דירות",
        "name_en": "Apartment Air Conditioning",
        "category": "hvac",
        "required_documents": ["מפרט טכני", "מפרט דיירים", "תכנית מיזוג"],
        "required_specifications": ["הספק קירור", "סוג מערכת", "רמת רעש"],
        "submission_checklist": ["תכניות מאושרות", "אישור בניה ירוקה"],
        "consultants": ["יועץ מיזוג", "בניה ירוקה"]
    },
    {
        "name": "וונטות",
        "name_en": "Vents",
        "category": "hvac",
        "required_documents": ["מפרט טכני", "תכנית אוורור"],
        "required_specifications": ["מידות", "ספיקה", "סוג"],
        "submission_checklist": ["תכניות מאושרות", "אישור יועץ מיזוג"],
        "consultants": ["יועץ מיזוג"]
    },
    # === FIRE SAFETY ===
    {
        "name": "ציוד כיבוי אש מתח נמוך",
        "name_en": "Low Voltage Fire Equipment",
        "category": "fire_safety",
        "required_documents": ["מפרט טכני", "תכנית גילוי אש", "אישור כיבוי אש"],
        "required_specifications": ["סוג גלאים", "כמות", "אזורי כיסוי"],
        "submission_checklist": ["תכניות מאושרות", "אישור רשות הכבאות", "תעודת יצרן"],
        "consultants": ["יועץ בטיחות אש", "יועץ חשמל"]
    },
    # === DOORS ===
    {
        "name": "דלת כניסה",
        "name_en": "Entry Door",
        "category": "doors",
        "required_documents": ["מפרט טכני", "מפרט טכני מיוחד", "מפרט דיירים"],
        "required_specifications": ["רוחב דלת", "גובה דלת", "סוג משקוף"],
        "submission_checklist": ["רוחב דלת - ווידוא מול מפרט דיירי תמורה", "גובה דלת - ווידוא מול מפרט דיירי תמורה", "סוג משקוף", "SD מלא"],
        "consultants": ["אדריכל"]
    },
    {
        "name": "דלת אש",
        "name_en": "Fire Door",
        "category": "doors",
        "required_documents": ["מפרט טכני", "תעודת עמידות אש", "אישור כיבוי אש"],
        "required_specifications": ["דרגת אש", "מידות", "סוג חומר"],
        "submission_checklist": ["תעודת יצרן", "אישור תקן ישראלי", "אישור רשות הכבאות"],
        "consultants": ["יועץ בטיחות אש", "אדריכל"]
    },
    {
        "name": "שער חניון",
        "name_en": "Parking Gate",
        "category": "doors",
        "required_documents": ["מפרט טכני", "תכנית העמדה", "תכנית חשמל"],
        "required_specifications": ["מידות", "סוג מנגנון", "מערכת בטיחות"],
        "submission_checklist": ["תכניות מאושרות", "תעודת יצרן", "אישור בטיחות"],
        "consultants": ["אדריכל", "יועץ חשמל"]
    },
    # === SAFE ROOM (ממ"ד) ===
    {
        "name": "מסגרות ממ\"ד",
        "name_en": "Safe Room Frames",
        "category": "safe_room",
        "required_documents": ["מפרט טכני", "תכניות מסגרות", "אישור פיקוד העורף"],
        "required_specifications": ["מידות", "סוג חומר", "עובי"],
        "submission_checklist": ["תכניות מאושרות", "אישור קונסטרוקטור", "אישור פיקוד העורף"],
        "consultants": ["קונסטרוקטור", "יועץ ממ\"ד"]
    },
    {
        "name": "מסנן ממ\"ד",
        "name_en": "Safe Room Filter",
        "category": "safe_room",
        "required_documents": ["מפרט טכני", "אישור פיקוד העורף", "קטלוג יצרן"],
        "required_specifications": ["סוג מסנן", "ספיקה", "דרגת סינון"],
        "submission_checklist": ["תעודת יצרן", "אישור פיקוד העורף", "הוראות התקנה"],
        "consultants": ["יועץ ממ\"ד"]
    },
    # === ELEVATOR ===
    {
        "name": "מעלית",
        "name_en": "Elevator",
        "category": "elevator",
        "required_documents": ["מפרט טכני", "תכניות פיר", "תכנית חשמל"],
        "required_specifications": ["עומס", "מהירות", "מספר תחנות", "מידות תא"],
        "submission_checklist": ["תכניות מאושרות", "אישור משרד העבודה", "תעודת יצרן"],
        "consultants": ["יועץ מעליות", "קונסטרוקטור", "יועץ חשמל"]
    },
    # === SMART HOME ===
    {
        "name": "בית חכם",
        "name_en": "Smart Home",
        "category": "smart_home",
        "required_documents": ["מפרט טכני", "תכנית מערכות", "מפרט דיירים"],
        "required_specifications": ["סוג מערכת", "רכיבים", "תאימות"],
        "submission_checklist": ["תכניות מאושרות", "מדריך משתמש", "אישור תקן"],
        "consultants": ["יועץ חשמל", "יועץ תקשורת"]
    },
    {
        "name": "אינטרקום",
        "name_en": "Intercom",
        "category": "smart_home",
        "required_documents": ["מפרט טכני", "תכנית מערכת", "קטלוג יצרן"],
        "required_specifications": ["סוג מערכת", "מספר תחנות", "תאימות וידאו"],
        "submission_checklist": ["תכניות מאושרות", "תעודת יצרן", "מדריך התקנה"],
        "consultants": ["יועץ חשמל"]
    },
    # === CABINETS & FURNITURE ===
    {
        "name": "ארונות פח",
        "name_en": "Metal Cabinets",
        "category": "cabinets",
        "required_documents": ["מפרט טכני", "תכניות ייצור", "גוון"],
        "required_specifications": ["מידות", "חומר", "גוון"],
        "submission_checklist": ["תכניות מאושרות", "אישור אדריכל"],
        "consultants": ["אדריכל"]
    },
    {
        "name": "ארונות נגרות",
        "name_en": "Wooden Cabinets",
        "category": "cabinets",
        "required_documents": ["מפרט טכני", "תכניות ייצור", "דוגמאות חומר"],
        "required_specifications": ["מידות", "סוג עץ", "גמר"],
        "submission_checklist": ["תכניות מאושרות", "אישור אדריכל", "דוגמאות מאושרות"],
        "consultants": ["אדריכל"]
    },
    {
        "name": "מראות",
        "name_en": "Mirrors",
        "category": "cabinets",
        "required_documents": ["מפרט טכני", "תכניות התקנה"],
        "required_specifications": ["מידות", "עובי", "סוג זכוכית"],
        "submission_checklist": ["תכניות מאושרות", "אישור אדריכל"],
        "consultants": ["אדריכל"]
    },
    # === OUTDOOR ===
    {
        "name": "פרגולה",
        "name_en": "Pergola",
        "category": "outdoor",
        "required_documents": ["מפרט טכני", "תכניות ייצור", "חישוב סטטי"],
        "required_specifications": ["מידות", "חומר", "סוג כיסוי"],
        "submission_checklist": ["תכניות מאושרות", "אישור קונסטרוקטור", "אישור אדריכל"],
        "consultants": ["אדריכל", "קונסטרוקטור"]
    },
    {
        "name": "סולמות",
        "name_en": "Ladders",
        "category": "outdoor",
        "required_documents": ["מפרט טכני", "תכניות ייצור"],
        "required_specifications": ["גובה", "חומר", "עומס מותר"],
        "submission_checklist": ["תכניות מאושרות", "אישור בטיחות"],
        "consultants": ["קונסטרוקטור"]
    },
    # === ALUMINUM ===
    {
        "name": "אלומיניום",
        "name_en": "Aluminum",
        "category": "aluminum",
        "required_documents": ["מפרט טכני", "תכניות ייצור", "פרטי חיבור"],
        "required_specifications": ["סוג פרופיל", "צבע", "סוג זיגוג"],
        "submission_checklist": ["תכניות מאושרות", "אישור אדריכל", "אישור קונסטרוקטור"],
        "consultants": ["אדריכל", "קונסטרוקטור"]
    },
    # === TENANT ===
    {
        "name": "תיק דייר",
        "name_en": "Tenant File",
        "category": "tenant",
        "required_documents": ["מפרט דיירים", "תכניות דירה", "מערכות"],
        "required_specifications": ["תכולה", "פורמט"],
        "submission_checklist": ["אישור פיקוח", "אישור קבלן"],
        "consultants": ["מנהל פרויקט"]
    },
    # === SOLAR WATER ===
    {
        "name": "דוד שמש",
        "name_en": "Solar Water Heater",
        "category": "plumbing",
        "required_documents": ["מפרט טכני", "תעודת תקן ישראלי", "תכנית העמדה על גג"],
        "required_specifications": ["נפח", "שטח קולט", "סוג קולט", "חומר מיכל"],
        "submission_checklist": ["אישור קונסטרוקטור להעמסה", "אישור בניה ירוקה", "תעודת יצרן"],
        "consultants": ["יועץ אינסטלציה", "בניה ירוקה", "קונסטרוקטור"]
    },
    # === GAS ===
    {
        "name": "מערכת גז",
        "name_en": "Gas System",
        "category": "plumbing",
        "required_documents": ["מפרט טכני", "תכנית גז", "אישור בטיחות"],
        "required_specifications": ["סוג גז", "לחץ עבודה", "קוטר צנרת", "סוג ווסת"],
        "submission_checklist": ["תכניות מאושרות", "אישור מהנדס גז", "אישור כיבוי אש"],
        "consultants": ["יועץ אינסטלציה", "יועץ בטיחות אש"]
    },
    # === SPRINKLER SYSTEM ===
    {
        "name": "מערכת ספרינקלרים",
        "name_en": "Sprinkler System",
        "category": "fire_safety",
        "required_documents": ["מפרט טכני", "תכנית ספרינקלרים", "חישוב הידראולי"],
        "required_specifications": ["סוג ראשים", "צפיפות התקנה", "קוטר צנרת", "לחץ עבודה"],
        "submission_checklist": ["תכניות מאושרות", "אישור רשות הכבאות", "חישוב הידראולי מאושר"],
        "consultants": ["יועץ בטיחות אש", "יועץ אינסטלציה"]
    },
    # === SECURITY ===
    {
        "name": "מערכת אזעקה ואבטחה",
        "name_en": "Alarm & Security System",
        "category": "smart_home",
        "required_documents": ["מפרט טכני", "תכנית מערכת", "מפרט דיירים"],
        "required_specifications": ["סוג מערכת", "מספר אזורים", "סוג גלאים", "חיבור מוקד"],
        "submission_checklist": ["תכניות מאושרות", "אישור יועץ חשמל", "תעודת יצרן"],
        "consultants": ["יועץ חשמל", "יועץ תקשורת"]
    },
    # === CEILINGS ===
    {
        "name": "תקרות אקוסטיות",
        "name_en": "Acoustic Ceilings",
        "category": "finishes",
        "required_documents": ["מפרט טכני", "תכניות תקרה", "דוגמאות"],
        "required_specifications": ["סוג", "מידות", "מקדם ספיגה אקוסטי", "עמידות אש"],
        "submission_checklist": ["דוגמה מאושרת", "אישור אדריכל", "אישור יועץ אקוסטיקה"],
        "consultants": ["אדריכל", "יועץ אקוסטיקה"]
    },
    # === WINDOWS ===
    {
        "name": "חלונות",
        "name_en": "Windows",
        "category": "aluminum",
        "required_documents": ["מפרט טכני", "תכניות ייצור", "פרט חיתוך", "מפרט דיירים"],
        "required_specifications": ["סוג פרופיל", "סוג זיגוג", "מידות", "צבע", "מקדם U"],
        "submission_checklist": ["תכניות מאושרות", "אישור אדריכל", "אישור בניה ירוקה", "אישור קונסטרוקטור"],
        "consultants": ["אדריכל", "קונסטרוקטור", "בניה ירוקה"]
    },
    # === INTERIOR DOORS ===
    {
        "name": "דלתות פנים",
        "name_en": "Interior Doors",
        "category": "doors",
        "required_documents": ["מפרט טכני", "מפרט דיירים", "דוגמאות גמר"],
        "required_specifications": ["רוחב", "גובה", "סוג חומר", "סוג משקוף", "גמר"],
        "submission_checklist": ["SD מלא", "אישור אדריכל", "דוגמה מאושרת"],
        "consultants": ["אדריכל"]
    },
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

            # Get existing consultant types
            result = await session.execute(select(ConsultantType))
            consultant_types = {ct.name: ct.id for ct in result.scalars().all()}

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
                    name_he=template_data["name"],
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
                        template_consultant = EquipmentTemplateConsultant(
                            template_id=template.id,
                            consultant_type_id=consultant_types[consultant_name]
                        )
                        session.add(template_consultant)

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
