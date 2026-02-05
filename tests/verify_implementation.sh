#!/bin/bash

# Verification Script for Consultant Assignment UI Implementation
# This script checks that all required files exist and have the expected structure

echo "=================================="
echo "Consultant Assignment UI - Code Verification"
echo "=================================="
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0

# Function to check file exists
check_file() {
    local file=$1
    local description=$2

    if [ -f "$file" ]; then
        echo -e "${GREEN}✓${NC} $description"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC} $description - FILE NOT FOUND"
        ((FAILED++))
    fi
}

# Function to check content in file
check_content() {
    local file=$1
    local pattern=$2
    local description=$3

    if [ -f "$file" ] && grep -q "$pattern" "$file"; then
        echo -e "${GREEN}✓${NC} $description"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC} $description - PATTERN NOT FOUND"
        ((FAILED++))
    fi
}

echo "Backend Files:"
echo "--------------"
check_file "backend/app/models/consultant_assignment.py" "ConsultantAssignment model"
check_file "backend/app/schemas/consultant_assignment.py" "ConsultantAssignment schemas"
check_file "backend/app/api/v1/consultant_assignments.py" "Consultant assignments API router"
check_file "backend/alembic/versions/004_add_consultant_assignments.py" "Database migration"

echo ""
echo "Backend Integration:"
echo "-------------------"
check_content "backend/app/api/v1/router.py" "consultant_assignments" "Router registered in main router"
check_content "backend/app/models/__init__.py" "ConsultantAssignment" "Model exported in __init__"
check_content "backend/app/api/v1/consultant_assignments.py" "@router.get.*consultant-assignments" "GET list endpoint"
check_content "backend/app/api/v1/consultant_assignments.py" "@router.post.*consultant-assignments" "POST create endpoint"
check_content "backend/app/api/v1/consultant_assignments.py" "@router.put.*consultant-assignments" "PUT update endpoint"
check_content "backend/app/api/v1/consultant_assignments.py" "@router.delete.*consultant-assignments" "DELETE endpoint"
check_content "backend/app/api/v1/consultant_assignments.py" "selectinload" "Relationship loading"
check_content "backend/app/api/v1/consultant_assignments.py" "create_audit_log" "Audit logging"

echo ""
echo "Frontend Files:"
echo "---------------"
check_file "frontend/src/types/consultantAssignment.ts" "TypeScript types"
check_file "frontend/src/api/consultantAssignments.ts" "API client"
check_file "frontend/src/components/consultants/AssignmentList.tsx" "AssignmentList component"
check_file "frontend/src/components/consultants/AssignmentCalendar.tsx" "AssignmentCalendar component"
check_file "frontend/src/components/consultants/AssignmentForm.tsx" "AssignmentForm component"
check_file "frontend/src/pages/ConsultantAssignmentsPage.tsx" "Main page component"

echo ""
echo "Frontend Integration:"
echo "--------------------"
check_content "frontend/src/App.tsx" "ConsultantAssignmentsPage" "Route imported"
check_content "frontend/src/App.tsx" "/consultants/assignments" "Route path registered"
check_content "frontend/src/pages/ConsultantAssignmentsPage.tsx" "consultantAssignmentsApi" "API client imported and used"
check_content "frontend/src/pages/ConsultantAssignmentsPage.tsx" "AssignmentList" "AssignmentList imported and used"
check_content "frontend/src/pages/ConsultantAssignmentsPage.tsx" "AssignmentCalendar" "AssignmentCalendar imported and used"
check_content "frontend/src/pages/ConsultantAssignmentsPage.tsx" "AssignmentForm" "AssignmentForm imported and used"
check_content "frontend/src/pages/ConsultantAssignmentsPage.tsx" "ToggleButtonGroup" "View toggle implemented"
check_content "frontend/src/pages/ConsultantAssignmentsPage.tsx" "filteredAssignments" "Filtering logic implemented"

echo ""
echo "API Client Methods:"
echo "------------------"
check_content "frontend/src/api/consultantAssignments.ts" "list.*async" "list() method"
check_content "frontend/src/api/consultantAssignments.ts" "get.*async" "get() method"
check_content "frontend/src/api/consultantAssignments.ts" "create.*async" "create() method"
check_content "frontend/src/api/consultantAssignments.ts" "update.*async" "update() method"
check_content "frontend/src/api/consultantAssignments.ts" "delete.*async" "delete() method"

echo ""
echo "Component Features:"
echo "------------------"
check_content "frontend/src/components/consultants/AssignmentList.tsx" "DataTable" "Uses DataTable component"
check_content "frontend/src/components/consultants/AssignmentList.tsx" "getStatusColor" "Status color mapping"
check_content "frontend/src/components/consultants/AssignmentList.tsx" "onEdit\|onDelete" "Action handlers"
check_content "frontend/src/components/consultants/AssignmentCalendar.tsx" "dayjs" "Date handling with dayjs"
check_content "frontend/src/components/consultants/AssignmentCalendar.tsx" "isBetween" "Date range plugin"
check_content "frontend/src/components/consultants/AssignmentCalendar.tsx" "AssignmentBar" "Timeline visualization"
check_content "frontend/src/components/consultants/AssignmentForm.tsx" "FormModal" "Form modal wrapper"
check_content "frontend/src/components/consultants/AssignmentForm.tsx" "validateForm" "Form validation"

echo ""
echo "Code Quality:"
echo "------------"

# Check for console.log in new files
CONSOLE_LOGS=$(grep -r "console\\.log" frontend/src/components/consultants/ frontend/src/pages/ConsultantAssignmentsPage.tsx frontend/src/api/consultantAssignments.ts 2>/dev/null | wc -l)
if [ "$CONSOLE_LOGS" -eq 0 ]; then
    echo -e "${GREEN}✓${NC} No console.log statements in new code"
    ((PASSED++))
else
    echo -e "${RED}✗${NC} Found $CONSOLE_LOGS console.log statements in new code"
    ((FAILED++))
fi

# Check for proper TypeScript types
if grep -q "any" frontend/src/types/consultantAssignment.ts; then
    echo -e "${YELLOW}⚠${NC} Warning: 'any' types found in consultantAssignment.ts"
else
    echo -e "${GREEN}✓${NC} No 'any' types in TypeScript definitions"
    ((PASSED++))
fi

echo ""
echo "=================================="
echo "Summary:"
echo "=================================="
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"
echo ""

if [ "$FAILED" -eq 0 ]; then
    echo -e "${GREEN}✓ All code verification checks passed!${NC}"
    echo ""
    echo "Next Steps:"
    echo "1. Start backend: cd backend && uvicorn app.main:app --reload --port 8000"
    echo "2. Run migrations: cd backend && alembic upgrade head"
    echo "3. Start frontend: cd frontend && npm run dev"
    echo "4. Open browser: http://localhost:3000/consultants/assignments"
    echo "5. Complete manual testing using E2E_VERIFICATION_CHECKLIST.md"
    exit 0
else
    echo -e "${RED}✗ Some verification checks failed. Please review the output above.${NC}"
    exit 1
fi
