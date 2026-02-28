#!/bin/bash

# Database Schema Verification Script for ChecklistInstance Models
# This script verifies that the database tables were created correctly

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=========================================="
echo "Database Schema Verification"
echo "ChecklistInstance Models"
echo "=========================================="
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo -e "${YELLOW}Warning: DATABASE_URL not set${NC}"
    echo "Checking for .env file..."
    if [ -f "backend/.env" ]; then
        source backend/.env
    else
        echo -e "${RED}Error: No .env file found and DATABASE_URL not set${NC}"
        echo "Please set DATABASE_URL or create backend/.env file"
        exit 1
    fi
fi

# Function to run SQL and check result
run_check() {
    local description=$1
    local sql=$2
    local expected=$3

    echo -n "Checking $description... "

    result=$(psql "$DATABASE_URL" -t -c "$sql" 2>&1)
    exit_code=$?

    if [ $exit_code -eq 0 ]; then
        if [ -n "$expected" ]; then
            if echo "$result" | grep -q "$expected"; then
                echo -e "${GREEN}✓ PASS${NC}"
                return 0
            else
                echo -e "${RED}✗ FAIL${NC}"
                echo "  Expected: $expected"
                echo "  Got: $result"
                return 1
            fi
        else
            echo -e "${GREEN}✓ PASS${NC}"
            return 0
        fi
    else
        echo -e "${RED}✗ FAIL${NC}"
        echo "  Error: $result"
        return 1
    fi
}

# Function to count columns
count_columns() {
    local table=$1
    local expected=$2

    echo -n "Checking $table column count... "

    count=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM information_schema.columns WHERE table_name='$table';" 2>&1 | xargs)
    exit_code=$?

    if [ $exit_code -eq 0 ]; then
        if [ "$count" = "$expected" ]; then
            echo -e "${GREEN}✓ PASS${NC} (${count}/${expected} columns)"
            return 0
        else
            echo -e "${RED}✗ FAIL${NC} (${count}/${expected} columns)"
            return 1
        fi
    else
        echo -e "${RED}✗ FAIL${NC}"
        echo "  Error: $count"
        return 1
    fi
}

# Function to count foreign keys
count_fks() {
    local table=$1
    local expected=$2

    echo -n "Checking $table foreign key count... "

    count=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM information_schema.table_constraints WHERE table_name='$table' AND constraint_type='FOREIGN KEY';" 2>&1 | xargs)
    exit_code=$?

    if [ $exit_code -eq 0 ]; then
        if [ "$count" = "$expected" ]; then
            echo -e "${GREEN}✓ PASS${NC} (${count}/${expected} FKs)"
            return 0
        else
            echo -e "${RED}✗ FAIL${NC} (${count}/${expected} FKs)"
            return 1
        fi
    else
        echo -e "${RED}✗ FAIL${NC}"
        echo "  Error: $count"
        return 1
    fi
}

# Counter for passed/failed tests
passed=0
failed=0

echo "=== Table Existence ==="
echo ""

# Check if checklist_instances table exists
if run_check "checklist_instances table exists" "SELECT to_regclass('public.checklist_instances');" "checklist_instances"; then
    ((passed++))
else
    ((failed++))
fi

# Check if checklist_item_responses table exists
if run_check "checklist_item_responses table exists" "SELECT to_regclass('public.checklist_item_responses');" "checklist_item_responses"; then
    ((passed++))
else
    ((failed++))
fi

echo ""
echo "=== Column Counts ==="
echo ""

# Check column counts
if count_columns "checklist_instances" "12"; then
    ((passed++))
else
    ((failed++))
fi

if count_columns "checklist_item_responses" "10"; then
    ((passed++))
else
    ((failed++))
fi

echo ""
echo "=== Foreign Key Constraints ==="
echo ""

# Check foreign key counts
if count_fks "checklist_instances" "4"; then
    ((passed++))
else
    ((failed++))
fi

if count_fks "checklist_item_responses" "3"; then
    ((passed++))
else
    ((failed++))
fi

echo ""
echo "=== Specific Column Checks ==="
echo ""

# Check specific columns exist in checklist_instances
columns_to_check=(
    "id"
    "project_id"
    "template_id"
    "area_id"
    "unit_identifier"
    "status"
    "started_at"
    "completed_at"
    "completed_by"
    "additional_data"
    "created_at"
    "updated_at"
)

for col in "${columns_to_check[@]}"; do
    if run_check "checklist_instances.$col exists" "SELECT column_name FROM information_schema.columns WHERE table_name='checklist_instances' AND column_name='$col';" "$col"; then
        ((passed++))
    else
        ((failed++))
    fi
done

# Check specific columns exist in checklist_item_responses
item_columns=(
    "id"
    "instance_id"
    "item_template_id"
    "status"
    "note"
    "image_file_ids"
    "signature_file_id"
    "responded_by"
    "responded_at"
    "additional_data"
)

for col in "${item_columns[@]}"; do
    if run_check "checklist_item_responses.$col exists" "SELECT column_name FROM information_schema.columns WHERE table_name='checklist_item_responses' AND column_name='$col';" "$col"; then
        ((passed++))
    else
        ((failed++))
    fi
done

echo ""
echo "=== JSONB Column Verification ==="
echo ""

# Check JSONB columns
if run_check "checklist_instances.additional_data is JSONB" "SELECT data_type FROM information_schema.columns WHERE table_name='checklist_instances' AND column_name='additional_data';" "jsonb"; then
    ((passed++))
else
    ((failed++))
fi

if run_check "checklist_item_responses.image_file_ids is JSONB" "SELECT data_type FROM information_schema.columns WHERE table_name='checklist_item_responses' AND column_name='image_file_ids';" "jsonb"; then
    ((passed++))
else
    ((failed++))
fi

if run_check "checklist_item_responses.additional_data is JSONB" "SELECT data_type FROM information_schema.columns WHERE table_name='checklist_item_responses' AND column_name='additional_data';" "jsonb"; then
    ((passed++))
else
    ((failed++))
fi

echo ""
echo "=== UUID Column Verification ==="
echo ""

# Check UUID columns
uuid_checks=(
    "checklist_instances.id"
    "checklist_instances.project_id"
    "checklist_instances.template_id"
    "checklist_instances.area_id"
    "checklist_instances.completed_by"
    "checklist_item_responses.id"
    "checklist_item_responses.instance_id"
    "checklist_item_responses.item_template_id"
    "checklist_item_responses.signature_file_id"
    "checklist_item_responses.responded_by"
)

for uuid_col in "${uuid_checks[@]}"; do
    IFS='.' read -r table column <<< "$uuid_col"
    if run_check "$uuid_col is UUID" "SELECT data_type FROM information_schema.columns WHERE table_name='$table' AND column_name='$column';" "uuid"; then
        ((passed++))
    else
        ((failed++))
    fi
done

echo ""
echo "=========================================="
echo "Verification Summary"
echo "=========================================="
echo ""
echo -e "Tests Passed: ${GREEN}$passed${NC}"
echo -e "Tests Failed: ${RED}$failed${NC}"
echo "Total Tests: $((passed + failed))"
echo ""

if [ $failed -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed!${NC}"
    echo ""
    echo "Database schema verification complete."
    exit 0
else
    echo -e "${RED}✗ Some checks failed.${NC}"
    echo ""
    echo "Please review the failed checks above."
    echo "You may need to:"
    echo "  1. Re-run the migration: cd backend && alembic upgrade head"
    echo "  2. Check for migration errors in the database logs"
    echo "  3. Verify that dependent tables exist (projects, users, construction_areas, etc.)"
    exit 1
fi
