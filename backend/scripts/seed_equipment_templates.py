"""
Seed equipment templates based on רשימת ציוד לאישור.xlsx
Run this script to populate the database with equipment templates
"""
import asyncio
import uuid
from datetime import datetime


EQUIPMENT_TEMPLATES = [
    {
        "name": "Sprinkler Pumps",
        "name_he": "משאבות ספרינקלרים",
        "category": "Fire Safety",
        "required_documents": [
            {"name": "Technical Specification", "name_he": "מפרט טכני", "source": "consultant", "required": True},
            {"name": "Special Technical Spec", "name_he": "מפרט טכני מיוחד", "source": "project_manager", "required": True},
            {"name": "Pump Curve Data", "name_he": "נתוני ספיקה + אופיין משאבה", "source": "contractor", "required": True},
            {"name": "Generator Backup KW Data", "name_he": "נתוני הספקים KW לגיבוי גנרטור", "source": "contractor", "required": True},
        ],
        "required_specifications": [
            {"name": "Quantity", "name_he": "כמות", "field_type": "number", "required": True},
            {"name": "Flow Rate", "name_he": "ספיקה", "field_type": "number", "unit": "L/min", "required": True},
            {"name": "Supplier Name", "name_he": "שם ספק ויצרן", "field_type": "text", "required": True},
        ],
        "submission_checklist": [
            {"name": "Consultant spec verified", "name_he": "מפרט יועץ נבדק", "requires_file": False},
            {"name": "Flow data + pump curve", "name_he": "נתוני ספיקה + אופיין משאבה", "requires_file": True},
            {"name": "Generator backup KW data", "name_he": "נתוני הספקים KW לגיבוי גנרטור", "requires_file": True},
            {"name": "Supplier and manufacturer name", "name_he": "שם ספק ויצרן", "requires_file": False},
        ],
        "approving_consultants": ["Plumbing Consultant"]
    },
    {
        "name": "Fire Pumps",
        "name_he": "משאבות כיבוי אש",
        "category": "Fire Safety",
        "required_documents": [
            {"name": "Technical Specification", "name_he": "מפרט טכני", "source": "consultant", "required": True},
            {"name": "Fire Safety Approval", "name_he": "אישור כיבוי אש", "source": "contractor", "required": True},
        ],
        "required_specifications": [
            {"name": "Quantity", "name_he": "כמות", "field_type": "number", "required": True},
            {"name": "Flow Rate", "name_he": "ספיקה", "field_type": "number", "unit": "L/min", "required": True},
            {"name": "Pressure", "name_he": "לחץ", "field_type": "number", "unit": "bar", "required": True},
        ],
        "submission_checklist": [
            {"name": "Technical spec verified", "name_he": "מפרט טכני נבדק", "requires_file": False},
            {"name": "Fire safety certification", "name_he": "אישור כיבוי אש", "requires_file": True},
        ],
        "approving_consultants": ["Fire Safety Consultant", "Plumbing Consultant"]
    },
    {
        "name": "Generator",
        "name_he": "גנרטור",
        "category": "Electrical",
        "required_documents": [
            {"name": "Technical Specification", "name_he": "מפרט טכני", "source": "consultant", "required": True},
            {"name": "Load Calculation", "name_he": "חישוב עומסים", "source": "consultant", "required": True},
            {"name": "Noise Level Certificate", "name_he": "אישור רמת רעש", "source": "contractor", "required": True},
        ],
        "required_specifications": [
            {"name": "Power Output", "name_he": "הספק", "field_type": "number", "unit": "kVA", "required": True},
            {"name": "Fuel Type", "name_he": "סוג דלק", "field_type": "select", "options": ["Diesel", "Gas", "Dual Fuel"], "required": True},
            {"name": "Noise Level", "name_he": "רמת רעש", "field_type": "number", "unit": "dB", "required": True},
        ],
        "submission_checklist": [
            {"name": "Load calculation verified", "name_he": "חישוב עומסים נבדק", "requires_file": True},
            {"name": "Noise certificate provided", "name_he": "אישור רמת רעש סופק", "requires_file": True},
        ],
        "approving_consultants": ["Electrical Consultant"]
    },
    {
        "name": "Elevator",
        "name_he": "מעלית",
        "category": "Building Systems",
        "required_documents": [
            {"name": "Technical Specification", "name_he": "מפרט טכני", "source": "consultant", "required": True},
            {"name": "Safety Certificate", "name_he": "תעודת בטיחות", "source": "contractor", "required": True},
            {"name": "Installation Plan", "name_he": "תכנית התקנה", "source": "contractor", "required": True},
        ],
        "required_specifications": [
            {"name": "Capacity", "name_he": "קיבולת", "field_type": "number", "unit": "kg", "required": True},
            {"name": "Stops", "name_he": "מספר תחנות", "field_type": "number", "required": True},
            {"name": "Speed", "name_he": "מהירות", "field_type": "number", "unit": "m/s", "required": True},
            {"name": "Elevator Type", "name_he": "סוג מעלית", "field_type": "select", "options": ["Passenger", "Freight", "Service"], "required": True},
        ],
        "submission_checklist": [
            {"name": "Safety standards compliance", "name_he": "עמידה בתקני בטיחות", "requires_file": True},
            {"name": "Installation plan approved", "name_he": "תכנית התקנה אושרה", "requires_file": True},
        ],
        "approving_consultants": ["Mechanical Consultant", "Safety Consultant"]
    },
    {
        "name": "Fire Doors",
        "name_he": "דלתות אש",
        "category": "Fire Safety",
        "required_documents": [
            {"name": "Fire Rating Certificate", "name_he": "תעודת עמידות אש", "source": "contractor", "required": True},
            {"name": "Installation Details", "name_he": "פרטי התקנה", "source": "contractor", "required": True},
        ],
        "required_specifications": [
            {"name": "Fire Rating", "name_he": "דירוג אש", "field_type": "select", "options": ["30 min", "60 min", "90 min", "120 min"], "required": True},
            {"name": "Quantity", "name_he": "כמות", "field_type": "number", "required": True},
            {"name": "Dimensions", "name_he": "מידות", "field_type": "text", "required": True},
        ],
        "submission_checklist": [
            {"name": "Fire rating certified", "name_he": "דירוג אש מאושר", "requires_file": True},
            {"name": "Hardware specification", "name_he": "מפרט פרזול", "requires_file": False},
        ],
        "approving_consultants": ["Fire Safety Consultant", "Architect"]
    },
    {
        "name": "Balcony Railings",
        "name_he": "מעקות מרפסות",
        "category": "Safety",
        "required_documents": [
            {"name": "Structural Calculation", "name_he": "חישוב קונסטרוקציה", "source": "consultant", "required": True},
            {"name": "Shop Drawings", "name_he": "שרטוטי יצור", "source": "contractor", "required": True},
        ],
        "required_specifications": [
            {"name": "Height", "name_he": "גובה", "field_type": "number", "unit": "cm", "required": True},
            {"name": "Material", "name_he": "חומר", "field_type": "select", "options": ["Aluminum", "Steel", "Glass", "Combined"], "required": True},
            {"name": "Linear Meters", "name_he": "מטרים רצים", "field_type": "number", "required": True},
        ],
        "submission_checklist": [
            {"name": "Structural calc verified", "name_he": "חישוב קונסטרוקציה נבדק", "requires_file": True},
            {"name": "Shop drawings approved", "name_he": "שרטוטי יצור אושרו", "requires_file": True},
        ],
        "approving_consultants": ["Structural Engineer", "Architect"]
    },
    {
        "name": "Electrical Panels",
        "name_he": "לוחות חשמל",
        "category": "Electrical",
        "required_documents": [
            {"name": "Single Line Diagram", "name_he": "סכמת קו אחד", "source": "consultant", "required": True},
            {"name": "Panel Schedule", "name_he": "לוח זרמים", "source": "contractor", "required": True},
        ],
        "required_specifications": [
            {"name": "Panel Type", "name_he": "סוג לוח", "field_type": "select", "options": ["Main", "Sub", "Distribution"], "required": True},
            {"name": "Amperage", "name_he": "אמפר", "field_type": "number", "unit": "A", "required": True},
            {"name": "Circuits", "name_he": "מספר מעגלים", "field_type": "number", "required": True},
        ],
        "submission_checklist": [
            {"name": "Single line diagram verified", "name_he": "סכמת קו אחד נבדקה", "requires_file": True},
            {"name": "Panel schedule approved", "name_he": "לוח זרמים אושר", "requires_file": True},
        ],
        "approving_consultants": ["Electrical Consultant"]
    },
    {
        "name": "HVAC System - Public Areas",
        "name_he": "מיזוג אוויר ציבורי",
        "category": "HVAC",
        "required_documents": [
            {"name": "Cooling Load Calculation", "name_he": "חישוב עומסי קירור", "source": "consultant", "required": True},
            {"name": "Equipment Schedule", "name_he": "לוח ציוד", "source": "contractor", "required": True},
        ],
        "required_specifications": [
            {"name": "Cooling Capacity", "name_he": "הספק קירור", "field_type": "number", "unit": "TR", "required": True},
            {"name": "System Type", "name_he": "סוג מערכת", "field_type": "select", "options": ["VRF", "Chiller", "Split", "Central"], "required": True},
        ],
        "submission_checklist": [
            {"name": "Load calculation verified", "name_he": "חישוב עומסים נבדק", "requires_file": True},
            {"name": "Equipment selection approved", "name_he": "בחירת ציוד אושרה", "requires_file": False},
        ],
        "approving_consultants": ["HVAC Consultant"]
    },
    {
        "name": "Slurry Walls",
        "name_he": "קירות סלארים",
        "category": "Structural",
        "required_documents": [
            {"name": "Structural Plans", "name_he": "תכניות קונסטרוקציה", "source": "consultant", "required": True},
            {"name": "Geotechnical Report", "name_he": "דוח גיאוטכני", "source": "consultant", "required": True},
            {"name": "Execution Method", "name_he": "שיטת ביצוע", "source": "contractor", "required": True},
        ],
        "required_specifications": [
            {"name": "Depth", "name_he": "עומק", "field_type": "number", "unit": "m", "required": True},
            {"name": "Thickness", "name_he": "עובי", "field_type": "number", "unit": "cm", "required": True},
            {"name": "Total Length", "name_he": "אורך כולל", "field_type": "number", "unit": "m", "required": True},
        ],
        "submission_checklist": [
            {"name": "Structural plans verified", "name_he": "תכניות קונסטרוקציה נבדקו", "requires_file": True},
            {"name": "Execution method approved", "name_he": "שיטת ביצוע אושרה", "requires_file": True},
        ],
        "approving_consultants": ["Structural Engineer", "Geotechnical Consultant"]
    },
    {
        "name": "Solar System",
        "name_he": "מערכת סולארית",
        "category": "Electrical",
        "required_documents": [
            {"name": "System Design", "name_he": "תכנון מערכת", "source": "consultant", "required": True},
            {"name": "Structural Approval", "name_he": "אישור קונסטרוקציה לגג", "source": "consultant", "required": True},
            {"name": "Grid Connection Approval", "name_he": "אישור חיבור לרשת", "source": "contractor", "required": True},
        ],
        "required_specifications": [
            {"name": "System Capacity", "name_he": "הספק מערכת", "field_type": "number", "unit": "kWp", "required": True},
            {"name": "Panel Count", "name_he": "מספר פאנלים", "field_type": "number", "required": True},
            {"name": "Inverter Type", "name_he": "סוג ממיר", "field_type": "select", "options": ["String", "Micro", "Hybrid"], "required": True},
        ],
        "submission_checklist": [
            {"name": "Structural load approved", "name_he": "עומס על גג אושר", "requires_file": True},
            {"name": "Grid connection permit", "name_he": "היתר חיבור לרשת", "requires_file": True},
        ],
        "approving_consultants": ["Electrical Consultant", "Structural Engineer"]
    },
]


def generate_sql():
    """Generate SQL INSERT statements for equipment templates"""
    sql_statements = []

    for template in EQUIPMENT_TEMPLATES:
        template_id = str(uuid.uuid4())
        name = template["name"].replace("'", "''")
        name_he = template["name_he"].replace("'", "''")
        category = template["category"].replace("'", "''")

        required_docs = str(template["required_documents"]).replace("'", '"')
        required_specs = str(template["required_specifications"]).replace("'", '"')
        checklist = str(template["submission_checklist"]).replace("'", '"')

        sql = f"""
INSERT INTO equipment_templates (id, name, name_he, category, is_active, required_documents, required_specifications, submission_checklist, created_at, updated_at)
VALUES (
    '{template_id}',
    '{name}',
    '{name_he}',
    '{category}',
    true,
    '{required_docs}'::jsonb,
    '{required_specs}'::jsonb,
    '{checklist}'::jsonb,
    NOW(),
    NOW()
);"""
        sql_statements.append(sql)

    return "\n".join(sql_statements)


if __name__ == "__main__":
    print("-- Equipment Templates Seed Data")
    print("-- Generated from רשימת ציוד לאישור.xlsx")
    print()
    print(generate_sql())
