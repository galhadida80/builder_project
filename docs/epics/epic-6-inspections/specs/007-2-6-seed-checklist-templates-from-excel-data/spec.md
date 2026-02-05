# Specification: Seed Checklist Templates from Excel Data

## Overview

Create a database seed script that populates checklist templates from an Excel data source containing 5 apartment handover checklist templates. The script will parse Hebrew-language Excel data and create a hierarchical structure of templates, sub-sections, and items in the PostgreSQL database. This foundation enables the checklist management system to support property delivery workflows across 321 total checklist items spanning multiple apartment inspection areas.

## Workflow Type

**Type**: feature

**Rationale**: This is a new database seeding capability that creates foundational data for the checklist template system. It involves creating a new seed script, parsing Excel data, and populating hierarchical database models with bilingual Hebrew-English content.

## Task Scope

### Services Involved
- **backend** (primary) - Python/FastAPI service that handles database operations, Excel parsing, and seed scripts

### This Task Will:
- [ ] Create seed script at `backend/app/db/seeds/checklist_templates.py`
- [ ] Parse Excel file `צקליסטים לדירה - לעיון.xlsx` (Apartment Checklists - For Review)
- [ ] Seed 5 checklist templates with bilingual names (Hebrew primary, English translations)
- [ ] Create nested hierarchy: Templates → Sub-sections → Items
- [ ] Seed "פרוטוקול מסירה לדייר" (Handover Protocol) with 125 items across 7 sections
- [ ] Seed "פרוטוקול פנימי - לפי חללים" (Internal Protocol) with 127 items
- [ ] Seed "תיק דייר" (Resident File) with 36 items
- [ ] Seed "לובי קומתי" (Floor Lobby) with 30 items
- [ ] Seed "פרוטוקול קבלת חזקה בדירה" (Possession Protocol) with 3 items
- [ ] Add Excel parsing library (openpyxl) to requirements.txt
- [ ] Implement idempotent seed execution (skip if data exists)

### Out of Scope:
- Creating the database models (ChecklistTemplate, ChecklistSubSection, ChecklistItemTemplate already exist)
- Creating database migration (migration already exists or created separately)
- Creating API endpoints for checklist templates (separate task)
- Frontend integration or UI components
- Modifying existing equipment checklist functionality
- Real-time Excel file synchronization

## Service Context

### Backend

**Tech Stack:**
- Language: Python 3.10+
- Framework: FastAPI
- ORM: SQLAlchemy 2.0+ (with async support)
- Database: PostgreSQL (with JSONB support)
- Migration Tool: Alembic
- Excel Library: openpyxl (to be added)
- Key directories: app/, app/db/seeds/, alembic/versions/

**Entry Point:** `app/main.py`

**How to Run:**
```bash
# From backend directory
cd backend

# Install dependencies (including openpyxl)
pip install -r requirements.txt

# Run migrations
alembic upgrade head

# Run seed script
python -m app.db.seeds.checklist_templates

# Start server
uvicorn app.main:app --reload --port 8000
```

**Port:** 8000

**Database:**
- Type: PostgreSQL
- Connection managed via async SQLAlchemy session
- Migrations via Alembic

## Files to Modify

| File | Service | What to Change |
|------|---------|---------------|
| `backend/requirements.txt` | backend | Add `openpyxl==3.1.2` for Excel file parsing |

## Files to Create

| File | Service | Purpose |
|------|---------|---------|
| `backend/app/db/seeds/checklist_templates.py` | backend | New seed script to parse Excel and populate checklist templates |
| `backend/app/db/seeds/__init__.py` | backend | Create package initializer if it doesn't exist |

## Files to Reference

These files show patterns to follow:

| File | Pattern to Copy |
|------|----------------|
| `backend/app/models/checklist_template.py` | Model structure for ChecklistTemplate, ChecklistSubSection, ChecklistItemTemplate |
| `backend/app/models/equipment.py` | UUID generation, JSONB field usage, relationship patterns |
| `backend/app/db/session.py` | Async session management, Base class import |
| `./.auto-claude/specs/001-3-6-seed-inspection-templates-from-excel-data/spec.md` | Seed script pattern, idempotency, error handling |
| `./.auto-claude/specs/012-2-1-create-checklisttemplate-and-related-models/spec.md` | Complete model specifications and field definitions |

## Patterns to Follow

### Pattern 1: Async Session Management

From `backend/app/db/session.py`:

```python
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import AsyncSessionLocal

async def seed_checklist_templates():
    """Seed checklist templates from Excel data"""
    async with AsyncSessionLocal() as session:
        try:
            # Perform seed operations
            await session.commit()
        except Exception as e:
            await session.rollback()
            raise
```

**Key Points:**
- Use `async with AsyncSessionLocal()` for session management
- Always wrap in try/except with rollback on error
- Use `await` for all database operations (commit, query, add)
- Database operations in this project use async patterns

### Pattern 2: Excel Parsing with openpyxl

```python
from openpyxl import load_workbook
from pathlib import Path

def parse_excel_templates(excel_path: str) -> list[dict]:
    """Parse Excel file and extract template data"""
    wb = load_workbook(excel_path, read_only=True, data_only=True)

    templates = []
    for sheet_name in wb.sheetnames:
        sheet = wb[sheet_name]

        # Extract template data
        template_data = {
            "name": sheet_name,
            "name_he": sheet_name,  # Excel has Hebrew names
            "sections": []
        }

        # Parse rows to build hierarchy
        current_section = None
        for row in sheet.iter_rows(min_row=2, values_only=True):
            # Logic to identify sections vs items
            # Build nested structure
            pass

        templates.append(template_data)

    return templates
```

**Key Points:**
- Use `read_only=True` for memory efficiency
- Use `data_only=True` to get calculated values, not formulas
- Excel file is Hebrew-language; preserve Hebrew text
- Build hierarchical data structure before database insertion
- Handle empty rows and malformed data gracefully

### Pattern 3: Idempotent Seed Script

From inspection seed pattern:

```python
from sqlalchemy import select
from app.models.checklist_template import ChecklistTemplate

async def seed_checklist_templates():
    async with AsyncSessionLocal() as session:
        try:
            # Check if data already exists
            result = await session.execute(
                select(ChecklistTemplate).limit(1)
            )
            existing = result.scalar_one_or_none()

            if existing:
                print("Checklist templates already seeded")
                return

            # Proceed with seeding
            # ...

        except Exception as e:
            await session.rollback()
            print(f"Error seeding checklist templates: {e}")
            raise
```

**Key Points:**
- Check for existing data before seeding (idempotent)
- Return early if templates already exist
- Use `scalar_one_or_none()` for checking existence
- Print progress messages for debugging

### Pattern 4: Hierarchical Data Creation

From model relationships:

```python
from app.models.checklist_template import (
    ChecklistTemplate,
    ChecklistSubSection,
    ChecklistItemTemplate
)

async def create_template_hierarchy(session: AsyncSession, template_data: dict):
    """Create template with nested sections and items"""

    # Create template
    template = ChecklistTemplate(
        name=template_data["name"],
        name_he=template_data["name_he"],
        level="project",
        group_name=template_data["group_name"],
        is_active=True
    )
    session.add(template)
    await session.flush()  # Get template.id

    # Create sub-sections
    for section_idx, section_data in enumerate(template_data["sections"], start=1):
        section = ChecklistSubSection(
            template_id=template.id,
            name=section_data["name"],
            name_he=section_data["name_he"],
            order=section_idx
        )
        session.add(section)
        await session.flush()  # Get section.id

        # Create items
        for item_idx, item_data in enumerate(section_data["items"], start=1):
            item = ChecklistItemTemplate(
                sub_section_id=section.id,
                name=item_data["name"],
                name_he=item_data["name_he"],
                order=item_idx,
                must_image=False,
                must_note=False,
                must_signature=False,
                file_names=[],
                additional_config={}
            )
            session.add(item)

    await session.commit()
```

**Key Points:**
- Use `flush()` to get IDs before creating child records
- Preserve order with sequential order fields
- Set default values for boolean flags (must_image, must_note, must_signature)
- Initialize JSONB fields with empty list/dict

### Pattern 5: Error Handling and Logging

```python
import logging

logger = logging.getLogger(__name__)

async def seed_checklist_templates():
    try:
        logger.info("Starting checklist template seeding")

        # Parse Excel
        excel_path = Path(__file__).parent.parent.parent.parent / "צקליסטים לדירה - לעיון.xlsx"
        if not excel_path.exists():
            raise FileNotFoundError(f"Excel file not found: {excel_path}")

        templates = parse_excel_templates(str(excel_path))
        logger.info(f"Parsed {len(templates)} templates from Excel")

        # Seed database
        async with AsyncSessionLocal() as session:
            # ... seeding logic
            logger.info(f"Successfully seeded {len(templates)} checklist templates")

    except FileNotFoundError as e:
        logger.error(f"Excel file not found: {e}")
        raise
    except Exception as e:
        logger.error(f"Error seeding checklist templates: {e}")
        raise
```

**Key Points:**
- Use logging for progress and error messages
- Validate Excel file existence before parsing
- Provide informative error messages
- Re-raise exceptions after logging for debugging

## Requirements

### Functional Requirements

1. **Excel Parsing**
   - Description: Parse `צקליסטים לדירה - לעיון.xlsx` and extract 5 template structures
   - Excel Structure:
     - File contains 5 sheets (one per template)
     - Each sheet has sections (רכיבים/sub-sections)
     - Each section has multiple checklist items
     - Hebrew text encoding must be preserved
   - Acceptance: Successfully parse all 5 templates with correct item counts (125, 127, 36, 30, 3)

2. **Template 1: פרוטוקול מסירה לדייר (Handover Protocol to Tenant)**
   - Description: 125 items across 7 sections
   - Group: `מסירות` (Handovers)
   - Sections:
     1. כניסה (Entrance)
     2. מטבח (Kitchen)
     3. סלון ומעברים (Living Room & Hallways)
     4. ממד (Safe Room)
     5. חדר רחצה (Bathroom)
     6. חדרים (Bedrooms)
     7. מרפסות (Balconies)
   - Acceptance: Template created with 7 sub-sections and 125 total items

3. **Template 2: פרוטוקול פנימי - לפי חללים (Internal Protocol - By Spaces)**
   - Description: 127 items with similar section structure
   - Group: `מסירות - פנימי` (Handovers - Internal)
   - Sections: Similar to Template 1
   - Acceptance: Template created with 127 items across sections

4. **Template 3: תיק דייר (Resident File)**
   - Description: 36 items for resident documentation
   - Group: `מסירות`
   - Acceptance: Template created with 36 items

5. **Template 4: לובי קומתי (Floor Lobby)**
   - Description: 30 items for floor lobby inspection
   - Group: `מסירות`
   - Acceptance: Template created with 30 items

6. **Template 5: פרוטוקול קבלת חזקה בדירה (Apartment Possession Protocol)**
   - Description: 3 items for possession documentation
   - Group: `מסירות`
   - Acceptance: Template created with 3 items

7. **Bilingual Support**
   - Description: Store Hebrew names from Excel, generate English translations
   - Primary language: Hebrew (from Excel)
   - Secondary language: English (generated or translated)
   - Acceptance: Both `name` and `name_he` fields populated for all entities

8. **Idempotent Execution**
   - Description: Seed script can run multiple times without duplicating data
   - Acceptance: Running seed twice results in same data (no duplicates)

### Edge Cases

1. **Hebrew Character Encoding** - Ensure UTF-8 encoding throughout parsing and database storage
2. **Empty Cells in Excel** - Handle missing or empty cells gracefully (skip or use defaults)
3. **Section Detection** - Distinguish between section headers and regular items in Excel
4. **Order Preservation** - Maintain exact order of sections and items from Excel
5. **Excel File Location** - Script should work from both project root and backend directory
6. **Missing Excel File** - Gracefully handle case where Excel file doesn't exist
7. **Database Already Seeded** - Check for existing data and skip if already populated

## Implementation Notes

### DO
- Follow the async session pattern from `app/db/session.py`
- Use `openpyxl` for Excel parsing (add to requirements.txt)
- Implement idempotent seeding (check for existing data)
- Preserve Hebrew text encoding from Excel
- Use `flush()` to get IDs before creating child records
- Set `level="project"` for all templates (per domain context)
- Initialize JSONB fields with empty list/dict
- Add logging for progress and debugging
- Validate Excel file exists before parsing
- Use Path for cross-platform file path handling

### DON'T
- Don't use synchronous session patterns (project uses async)
- Don't hardcode file paths without Path handling
- Don't skip error handling or rollback logic
- Don't modify existing models or migrations
- Don't create duplicate templates on re-run
- Don't use pandas if openpyxl is sufficient
- Don't strip or modify Hebrew characters
- Don't assume Excel structure - validate before parsing

### Excel Parsing Strategy

```python
# Recommended approach for parsing Excel with section detection:

def parse_excel_templates(excel_path: str) -> list[dict]:
    """
    Parse Excel file structure:
    - Sheet name = Template name
    - Bold rows or specific column pattern = Section headers
    - Regular rows = Checklist items
    """
    wb = load_workbook(excel_path, read_only=True, data_only=True)
    templates = []

    for sheet_name in wb.sheetnames:
        sheet = wb[sheet_name]

        template_data = {
            "name": translate_to_english(sheet_name),  # Generate translation
            "name_he": sheet_name,
            "group_name": extract_group_name(sheet_name),
            "sections": []
        }

        current_section = None

        for row_idx, row in enumerate(sheet.iter_rows(min_row=2, values_only=True), start=2):
            # Detect if row is section header (based on your Excel structure)
            if is_section_header(row):
                if current_section:
                    template_data["sections"].append(current_section)
                current_section = {
                    "name": translate_to_english(row[0]),
                    "name_he": row[0],
                    "items": []
                }
            elif current_section and row[0]:  # Regular item row
                current_section["items"].append({
                    "name": translate_to_english(row[0]),
                    "name_he": row[0]
                })

        # Add last section
        if current_section:
            template_data["sections"].append(current_section)

        templates.append(template_data)

    return templates
```

### Translation Helper

```python
# Simple translation mapping for common terms
TRANSLATIONS = {
    "פרוטוקול מסירה לדייר": "Handover Protocol to Tenant",
    "פרוטוקול פנימי - לפי חללים": "Internal Protocol - By Spaces",
    "תיק דייר": "Resident File",
    "לובי קומתי": "Floor Lobby",
    "פרוטוקול קבלת חזקה בדירה": "Apartment Possession Protocol",
    "כניסה": "Entrance",
    "מטבח": "Kitchen",
    "סלון ומעברים": "Living Room & Hallways",
    "ממד": "Safe Room",
    "חדר רחצה": "Bathroom",
    "חדרים": "Bedrooms",
    "מרפסות": "Balconies",
    "מסירות": "Handovers",
    "מסירות - פנימי": "Handovers - Internal"
}

def translate_to_english(hebrew_text: str) -> str:
    """Translate Hebrew text to English, fallback to transliteration"""
    return TRANSLATIONS.get(hebrew_text, hebrew_text)
```

## Development Environment

### Start Services

```bash
# Start PostgreSQL database (via Docker Compose)
docker-compose up db -d

# Start backend server
cd backend
uvicorn app.main:app --reload --port 8000

# Run seed script
cd backend
python -m app.db.seeds.checklist_templates
```

### Service URLs
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs
- PostgreSQL: localhost:5432 (internal Docker network)

### Required Environment Variables
- `DATABASE_URL`: PostgreSQL async connection string (e.g., `postgresql+asyncpg://user:pass@localhost/db`)
- Database credentials from docker-compose.yml or .env file

### Testing Seed Execution

```bash
# From backend directory

# 1. Ensure database is running
docker-compose up db -d

# 2. Run migrations
alembic upgrade head

# 3. Run seed script
python -m app.db.seeds.checklist_templates

# Expected output:
# INFO: Starting checklist template seeding
# INFO: Parsed 5 templates from Excel
# INFO: Seeding template: פרוטוקול מסירה לדייר (125 items)
# INFO: Seeding template: פרוטוקול פנימי - לפי חללים (127 items)
# INFO: Seeding template: תיק דייר (36 items)
# INFO: Seeding template: לובי קומתי (30 items)
# INFO: Seeding template: פרוטוקול קבלת חזקה בדירה (3 items)
# INFO: Successfully seeded 5 checklist templates

# 4. Verify in database
psql $DATABASE_URL -c "SELECT COUNT(*) FROM checklist_templates;"
# Expected: 5

psql $DATABASE_URL -c "SELECT COUNT(*) FROM checklist_item_templates;"
# Expected: 321 (125 + 127 + 36 + 30 + 3)

# 5. Run seed script again (test idempotency)
python -m app.db.seeds.checklist_templates
# Expected: "Checklist templates already seeded"
```

## Success Criteria

The task is complete when:

1. [ ] `openpyxl==3.1.2` added to `backend/requirements.txt`
2. [ ] Seed script created at `backend/app/db/seeds/checklist_templates.py`
3. [ ] `backend/app/db/seeds/__init__.py` exists (package initializer)
4. [ ] Running seed script populates 5 checklist templates
5. [ ] All templates have correct group names (מסירות or מסירות - פנימי)
6. [ ] Template 1 has 125 items across 7 sections
7. [ ] Template 2 has 127 items
8. [ ] Templates 3, 4, 5 have 36, 30, and 3 items respectively
9. [ ] Hebrew text is correctly encoded and stored
10. [ ] Bilingual support: both `name` and `name_he` populated
11. [ ] Seed script is idempotent (running twice doesn't duplicate data)
12. [ ] No console errors when running seed script
13. [ ] Database queries confirm all 5 templates and 321 items exist
14. [ ] Order of sections and items preserved from Excel

## QA Acceptance Criteria

**CRITICAL**: These criteria must be verified by the QA Agent before sign-off.

### Unit Tests

| Test | File | What to Verify |
|------|------|----------------|
| Excel Parsing | `backend/tests/seeds/test_checklist_templates.py` | `parse_excel_templates()` returns 5 templates with correct structure |
| Template Count Validation | `backend/tests/seeds/test_checklist_templates.py` | Template 1 has 125 items, Template 2 has 127 items, etc. |
| Section Hierarchy | `backend/tests/seeds/test_checklist_templates.py` | Sections are correctly parsed and ordered |
| Idempotency | `backend/tests/seeds/test_checklist_templates.py` | Running seed twice doesn't create duplicates |
| Hebrew Encoding | `backend/tests/seeds/test_checklist_templates.py` | Hebrew characters preserved in parsed data |

### Integration Tests

| Test | Services | What to Verify |
|------|----------|----------------|
| Seed Execution | backend ↔ PostgreSQL | Seed script successfully populates database |
| Template Retrieval | backend ↔ PostgreSQL | All 5 templates can be queried with relationships |
| Hierarchy Integrity | backend ↔ PostgreSQL | Foreign keys correctly link templates → sections → items |
| Bilingual Data Storage | backend ↔ PostgreSQL | Both `name` and `name_he` stored and retrievable |

### End-to-End Tests

| Flow | Steps | Expected Outcome |
|------|-------|------------------|
| Fresh Database Seed | 1. Drop tables 2. Run migration 3. Run seed script 4. Query data | 5 templates with 321 total items exist |
| Idempotent Re-run | 1. Run seed script 2. Run seed script again 3. Check counts | Counts remain 5 templates, 321 items |
| Excel File Validation | 1. Manually verify Excel 2. Compare with database | All sections and items match Excel structure |

### Database Verification

| Check | Query/Command | Expected |
|-------|---------------|----------|
| Template Count | `SELECT COUNT(*) FROM checklist_templates;` | 5 |
| Total Items Count | `SELECT COUNT(*) FROM checklist_item_templates;` | 321 |
| Template 1 Items | `SELECT COUNT(*) FROM checklist_item_templates WHERE sub_section_id IN (SELECT id FROM checklist_sub_sections WHERE template_id = (SELECT id FROM checklist_templates WHERE name_he = 'פרוטוקול מסירה לדייר'));` | 125 |
| Template 1 Sections | `SELECT COUNT(*) FROM checklist_sub_sections WHERE template_id = (SELECT id FROM checklist_templates WHERE name_he = 'פרוטוקול מסירה לדייר');` | 7 |
| Template 2 Items | `SELECT COUNT(*) FROM checklist_item_templates WHERE sub_section_id IN (SELECT id FROM checklist_sub_sections WHERE template_id = (SELECT id FROM checklist_templates WHERE name_he = 'פרוטוקול פנימי - לפי חללים'));` | 127 |
| Hebrew Encoding Check | `SELECT name_he FROM checklist_templates LIMIT 5;` | Returns Hebrew text correctly |
| Group Names | `SELECT DISTINCT group_name FROM checklist_templates;` | Returns "מסירות" and "מסירות - פנימי" |
| Active Templates | `SELECT COUNT(*) FROM checklist_templates WHERE is_active = true;` | 5 |

### Manual Verification

| Step | Action | Expected Result |
|------|--------|----------------|
| 1 | Navigate to project root | Verify Excel file exists: `צקליסטים לדירה - לעיון.xlsx` |
| 2 | Check requirements.txt | Verify `openpyxl==3.1.2` is present |
| 3 | Run `pip install -r backend/requirements.txt` | openpyxl installs successfully |
| 4 | Run migrations: `cd backend && alembic upgrade head` | Tables created: checklist_templates, checklist_sub_sections, checklist_item_templates |
| 5 | Run seed: `python -m app.db.seeds.checklist_templates` | Success message appears, no errors |
| 6 | Run seed again | "Already seeded" message (idempotent) |
| 7 | Connect to database and run verification queries | All counts match specifications |
| 8 | Query Hebrew text: `SELECT name_he FROM checklist_templates;` | Hebrew displays correctly (not garbled) |

### QA Sign-off Requirements

- [ ] All unit tests pass (or created if test infrastructure exists)
- [ ] All integration tests pass
- [ ] All database verification queries return expected counts
- [ ] Seed script executes without errors
- [ ] Idempotent execution verified (no duplicates on re-run)
- [ ] Hebrew text correctly encoded and displayed
- [ ] Excel file parsed completely (all 5 templates)
- [ ] Item counts match Excel data (125, 127, 36, 30, 3)
- [ ] Section structure preserved from Excel
- [ ] No regressions in existing functionality
- [ ] Code follows async patterns from existing backend code
- [ ] Proper error handling and rollback implemented
- [ ] openpyxl added to requirements.txt

### Additional Verification Steps

1. **Excel Data Accuracy**: Manually compare database contents against `צקליסטים לדירה - לעיון.xlsx` for at least one template
2. **Character Encoding**: Test Hebrew text in database queries and application (if APIs available)
3. **Foreign Key Integrity**: Verify cascade delete works (delete template → sections and items deleted)
4. **Order Preservation**: Verify `order` fields maintain sequence from Excel
5. **JSONB Defaults**: Confirm `file_names` and `additional_config` are empty list/dict (not NULL)

---

## Data Reference

### Complete Template Summary

| # | Template Name (Hebrew) | English Translation | Group | Items | Sections |
|---|------------------------|---------------------|-------|-------|----------|
| 1 | פרוטוקול מסירה לדייר | Handover Protocol to Tenant | מסירות | 125 | 7 |
| 2 | פרוטוקול פנימי - לפי חללים | Internal Protocol - By Spaces | מסירות - פנימי | 127 | ~7 |
| 3 | תיק דייר | Resident File | מסירות | 36 | varies |
| 4 | לובי קומתי | Floor Lobby | מסירות | 30 | varies |
| 5 | פרוטוקול קבלת חזקה בדירה | Apartment Possession Protocol | מסירות | 3 | 1-2 |
| **Total** | | | | **321** | |

### Section Names for Template 1 (פרוטוקול מסירה לדייר)

| Order | Hebrew | English |
|-------|--------|---------|
| 1 | כניסה | Entrance |
| 2 | מטבח | Kitchen |
| 3 | סלון ומעברים | Living Room & Hallways |
| 4 | ממד | Safe Room |
| 5 | חדר רחצה | Bathroom |
| 6 | חדרים | Bedrooms |
| 7 | מרפסות | Balconies |

### Excel File Information

- **Filename**: `צקליסטים לדירה - לעיון.xlsx`
- **Location**: Project root directory
- **Language**: Hebrew (primary)
- **Structure**: Multi-sheet workbook, one sheet per template
- **Total Templates**: 5
- **Total Items**: 321 across all templates
- **Encoding**: UTF-8 (Hebrew characters)

## Next Steps (Out of Scope for This Task)

1. Create API endpoints for checklist template CRUD operations
2. Create Pydantic schemas for checklist templates
3. Integrate templates with frontend UI
4. Add template versioning or audit trail
5. Implement template cloning/duplication functionality
6. Add search and filtering capabilities for templates
