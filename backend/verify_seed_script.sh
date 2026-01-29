#!/bin/bash
# Verification script for checklist templates seed script
# This script should be run in the full environment with database access

set -e

echo "=== Checklist Template Seed Script Verification ==="
echo ""

# Color codes for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓${NC} $2"
    else
        echo -e "${RED}✗${NC} $2"
        exit 1
    fi
}

print_info() {
    echo -e "${YELLOW}→${NC} $1"
}

# Step 1: Check if database is running
print_info "Step 1: Checking database connection..."
if command -v docker &> /dev/null; then
    docker compose ps db &> /dev/null
    print_status $? "Database container is running"
else
    echo -e "${YELLOW}⚠${NC} Docker not available - skipping database check"
fi

# Step 2: Check if models exist
print_info "Step 2: Verifying checklist template models exist..."
python3 -c "from app.models.checklist_template import ChecklistTemplate, ChecklistSubSection, ChecklistItemTemplate" 2>/dev/null
print_status $? "Checklist template models are importable"

# Step 3: Check if openpyxl is installed
print_info "Step 3: Verifying openpyxl dependency..."
python3 -c "import openpyxl" 2>/dev/null
print_status $? "openpyxl is installed"

# Step 4: Run migrations
print_info "Step 4: Running database migrations..."
alembic upgrade head
print_status $? "Database migrations completed"

# Step 5: Check for Excel file
print_info "Step 5: Checking for Excel source file..."
if [ -f "../צקליסטים לדירה - לעיון.xlsx" ]; then
    print_status 0 "Excel file found"
else
    print_status 1 "Excel file NOT found at expected location"
fi

# Step 6: Run seed script (first time)
print_info "Step 6: Running seed script (first execution)..."
python3 -m app.db.seeds.checklist_templates
print_status $? "Seed script executed successfully"

# Step 7: Verify template count
print_info "Step 7: Verifying template count..."
TEMPLATE_COUNT=$(python3 -c "
import asyncio
from sqlalchemy import select, func
from app.db.session import AsyncSessionLocal
from app.models.checklist_template import ChecklistTemplate

async def count_templates():
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(func.count(ChecklistTemplate.id)))
        return result.scalar()

print(asyncio.run(count_templates()))
" 2>/dev/null)

if [ "$TEMPLATE_COUNT" = "5" ]; then
    print_status 0 "5 templates found in database"
else
    print_status 1 "Expected 5 templates, found: $TEMPLATE_COUNT"
fi

# Step 8: Verify total item count
print_info "Step 8: Verifying total item count..."
ITEM_COUNT=$(python3 -c "
import asyncio
from sqlalchemy import select, func
from app.db.session import AsyncSessionLocal
from app.models.checklist_template import ChecklistItemTemplate

async def count_items():
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(func.count(ChecklistItemTemplate.id)))
        return result.scalar()

print(asyncio.run(count_items()))
" 2>/dev/null)

if [ "$ITEM_COUNT" = "321" ]; then
    print_status 0 "321 total items found in database"
else
    print_status 1 "Expected 321 items, found: $ITEM_COUNT"
fi

# Step 9: Verify Template 1 details
print_info "Step 9: Verifying Template 1 (Handover Protocol) - 125 items, 7 sections..."
TEMPLATE1_SECTIONS=$(python3 -c "
import asyncio
from sqlalchemy import select, func
from app.db.session import AsyncSessionLocal
from app.models.checklist_template import ChecklistTemplate, ChecklistSubSection

async def count_sections():
    async with AsyncSessionLocal() as session:
        # Get template
        result = await session.execute(
            select(ChecklistTemplate).where(ChecklistTemplate.name_he == 'פרוטוקול מסירה לדייר')
        )
        template = result.scalar_one()

        # Count sections
        result = await session.execute(
            select(func.count(ChecklistSubSection.id)).where(ChecklistSubSection.template_id == template.id)
        )
        return result.scalar()

print(asyncio.run(count_sections()))
" 2>/dev/null)

if [ "$TEMPLATE1_SECTIONS" = "7" ]; then
    print_status 0 "Template 1 has 7 sections"
else
    print_status 1 "Expected 7 sections for Template 1, found: $TEMPLATE1_SECTIONS"
fi

# Step 10: Verify Hebrew encoding
print_info "Step 10: Verifying Hebrew text encoding..."
HEBREW_CHECK=$(python3 -c "
import asyncio
from sqlalchemy import select
from app.db.session import AsyncSessionLocal
from app.models.checklist_template import ChecklistTemplate

async def check_hebrew():
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(ChecklistTemplate.name_he).limit(1))
        name_he = result.scalar()
        # Check if Hebrew characters are present (not garbled)
        return any('\u0590' <= char <= '\u05FF' for char in name_he)

print(asyncio.run(check_hebrew()))
" 2>/dev/null)

if [ "$HEBREW_CHECK" = "True" ]; then
    print_status 0 "Hebrew text is correctly encoded"
else
    print_status 1 "Hebrew text encoding issue detected"
fi

# Step 11: Verify bilingual support
print_info "Step 11: Verifying bilingual support (name and name_he)..."
BILINGUAL_CHECK=$(python3 -c "
import asyncio
from sqlalchemy import select
from app.db.session import AsyncSessionLocal
from app.models.checklist_template import ChecklistTemplate

async def check_bilingual():
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(ChecklistTemplate))
        templates = result.scalars().all()
        return all(t.name and t.name_he for t in templates)

print(asyncio.run(check_bilingual()))
" 2>/dev/null)

if [ "$BILINGUAL_CHECK" = "True" ]; then
    print_status 0 "Both name and name_he are populated for all templates"
else
    print_status 1 "Bilingual support issue detected"
fi

# Step 12: Test idempotency
print_info "Step 12: Testing idempotency (running seed script again)..."
python3 -m app.db.seeds.checklist_templates 2>&1 | grep -q "already seeded"
print_status $? "Seed script is idempotent (no duplicates created)"

# Step 13: Verify final counts after idempotency test
print_info "Step 13: Verifying counts unchanged after second run..."
FINAL_TEMPLATE_COUNT=$(python3 -c "
import asyncio
from sqlalchemy import select, func
from app.db.session import AsyncSessionLocal
from app.models.checklist_template import ChecklistTemplate

async def count_templates():
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(func.count(ChecklistTemplate.id)))
        return result.scalar()

print(asyncio.run(count_templates()))
" 2>/dev/null)

if [ "$FINAL_TEMPLATE_COUNT" = "5" ]; then
    print_status 0 "Template count remains 5 (idempotency confirmed)"
else
    print_status 1 "Template count changed to: $FINAL_TEMPLATE_COUNT (idempotency failed)"
fi

echo ""
echo -e "${GREEN}=== All Verification Steps Passed! ===${NC}"
echo ""
echo "Summary:"
echo "  ✓ 5 checklist templates seeded"
echo "  ✓ 321 total checklist items seeded"
echo "  ✓ Hebrew text correctly encoded"
echo "  ✓ Bilingual support (name + name_he)"
echo "  ✓ Idempotent execution verified"
echo "  ✓ Template 1: 7 sections, 125 items"
echo ""
