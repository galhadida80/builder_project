#!/bin/bash

# Integration Test for Approval Decision Workflow (Subtask 7-4)
# Tests: Create submission with status=draft, add approval decision, verify status update, list decisions

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="http://localhost:8000/api/v1"
ADMIN_EMAIL="admin@example.com"
ADMIN_PASSWORD="admin123"
USER_EMAIL="user@example.com"
USER_PASSWORD="user123"

# Test results
TESTS_PASSED=0
TESTS_FAILED=0

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# Function to check if server is running
check_server() {
    print_info "Checking if backend server is running..."
    if curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/equipment-templates" | grep -q "200\|404"; then
        print_success "Server is running on port 8000"
        return 0
    else
        print_error "Server is not responding on port 8000"
        print_warning "Please start the server with: docker-compose up -d"
        exit 1
    fi
}

# Function to authenticate and get token
get_auth_token() {
    local email=$1
    local password=$2
    local role=$3

    print_info "Authenticating as $role ($email)..."

    response=$(curl -s -X POST "$BASE_URL/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"$email\",\"password\":\"$password\"}")

    token=$(echo "$response" | grep -o '"token":"[^"]*' | cut -d'"' -f4)

    if [ -z "$token" ]; then
        print_error "Failed to authenticate as $role"
        echo "Response: $response"
        return 1
    fi

    print_success "Authenticated as $role"
    echo "$token"
}

# Function to run a test
run_test() {
    local test_name=$1
    local expected_status=$2
    local actual_status=$3
    local response=$4

    if [ "$expected_status" == "$actual_status" ]; then
        print_success "$test_name - Status: $actual_status"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        return 0
    else
        print_error "$test_name - Expected: $expected_status, Got: $actual_status"
        echo "Response: $response"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
}

echo "========================================"
echo "Approval Decision Workflow Test"
echo "========================================"
echo ""

# Step 0: Check server
check_server
echo ""

# Step 1: Authenticate as admin
print_info "Step 1: Authenticating as admin"
ADMIN_TOKEN=$(get_auth_token "$ADMIN_EMAIL" "$ADMIN_PASSWORD" "admin")
if [ -z "$ADMIN_TOKEN" ]; then
    print_error "Cannot proceed without admin authentication"
    exit 1
fi
echo ""

# Step 2: Authenticate as user (for reviewer)
print_info "Step 2: Authenticating as user (for reviewer role)"
USER_TOKEN=$(get_auth_token "$USER_EMAIL" "$USER_PASSWORD" "user")
if [ -z "$USER_TOKEN" ]; then
    print_error "Cannot proceed without user authentication"
    exit 1
fi
echo ""

# Step 3: Create a template (prerequisite)
print_info "Step 3: Creating equipment template (prerequisite)"
template_response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/equipment-templates" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "name": "Approval Test Template",
        "category": "Heavy Equipment",
        "description": "Template for approval workflow testing",
        "specifications": {"type": "excavator", "capacity": "20 ton"}
    }')

template_status=$(echo "$template_response" | tail -n1)
template_body=$(echo "$template_response" | sed '$d')

run_test "Create template for approval test" "201" "$template_status" "$template_body"

TEMPLATE_ID=$(echo "$template_body" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
if [ -z "$TEMPLATE_ID" ]; then
    print_error "Failed to extract template ID"
    exit 1
fi
print_info "Template ID: $TEMPLATE_ID"
echo ""

# Step 4: Get or create a project (prerequisite)
print_info "Step 4: Getting/Creating project (prerequisite)"
projects_response=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/projects" \
    -H "Authorization: Bearer $ADMIN_TOKEN")

projects_status=$(echo "$projects_response" | tail -n1)
projects_body=$(echo "$projects_response" | sed '$d')

if [ "$projects_status" == "200" ]; then
    PROJECT_ID=$(echo "$projects_body" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
    if [ -z "$PROJECT_ID" ]; then
        # Create a test project if none exists
        print_info "No projects found, creating test project..."
        project_response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/projects" \
            -H "Authorization: Bearer $ADMIN_TOKEN" \
            -H "Content-Type: application/json" \
            -d '{
                "name": "Approval Test Project",
                "description": "Project for approval workflow testing",
                "status": "active"
            }')

        project_status=$(echo "$project_response" | tail -n1)
        project_body=$(echo "$project_response" | sed '$d')

        run_test "Create test project" "201" "$project_status" "$project_body"

        PROJECT_ID=$(echo "$project_body" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
    else
        print_success "Found existing project"
    fi
else
    print_error "Failed to get projects list"
    exit 1
fi

if [ -z "$PROJECT_ID" ]; then
    print_error "Failed to get or create project ID"
    exit 1
fi
print_info "Project ID: $PROJECT_ID"
echo ""

# ===========================
# SUBTASK 7-4 TESTS START
# ===========================

# Verification Step 1: Create submission with status=draft
print_info "VERIFICATION STEP 1: Create submission with status=draft"
submission_response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/projects/$PROJECT_ID/equipment-submissions" \
    -H "Authorization: Bearer $USER_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
        \"template_id\": \"$TEMPLATE_ID\",
        \"name\": \"Excavator for Site A\",
        \"description\": \"Heavy excavator needed for foundation work\",
        \"specifications\": {\"serialNumber\": \"EXC-2024-001\", \"operator\": \"John Doe\"},
        \"notes\": \"Need approval before ordering\"
    }")

submission_status=$(echo "$submission_response" | tail -n1)
submission_body=$(echo "$submission_response" | sed '$d')

run_test "Create submission with status=draft" "201" "$submission_status" "$submission_body"

SUBMISSION_ID=$(echo "$submission_body" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
if [ -z "$SUBMISSION_ID" ]; then
    print_error "Failed to extract submission ID"
    exit 1
fi
print_info "Submission ID: $SUBMISSION_ID"

# Verify submission status is draft
SUBMISSION_STATUS=$(echo "$submission_body" | grep -o '"status":"[^"]*' | head -1 | cut -d'"' -f4)
if [ "$SUBMISSION_STATUS" == "draft" ]; then
    print_success "Submission status is 'draft' as expected"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    print_error "Submission status is '$SUBMISSION_STATUS', expected 'draft'"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi
echo ""

# Verification Step 2: Add approval decision via POST /equipment-submissions/{id}/decisions
print_info "VERIFICATION STEP 2: Add approval decision (approve)"
decision_response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/equipment-submissions/$SUBMISSION_ID/decisions" \
    -H "Authorization: Bearer $USER_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "decision": "approve",
        "comments": "Approved for construction phase 1. Equipment meets requirements."
    }')

decision_status=$(echo "$decision_response" | tail -n1)
decision_body=$(echo "$decision_response" | sed '$d')

run_test "Add approval decision" "201" "$decision_status" "$decision_body"

DECISION_ID=$(echo "$decision_body" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
if [ -z "$DECISION_ID" ]; then
    print_error "Failed to extract decision ID"
    TESTS_FAILED=$((TESTS_FAILED + 1))
else
    print_info "Decision ID: $DECISION_ID"
    TESTS_PASSED=$((TESTS_PASSED + 1))
fi

# Verify decision fields
DECISION_TYPE=$(echo "$decision_body" | grep -o '"decision":"[^"]*' | head -1 | cut -d'"' -f4)
if [ "$DECISION_TYPE" == "approve" ]; then
    print_success "Decision type is 'approve' as expected"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    print_error "Decision type is '$DECISION_TYPE', expected 'approve'"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

DECISION_COMMENTS=$(echo "$decision_body" | grep -o '"comments":"[^"]*' | head -1 | cut -d'"' -f4)
if [[ "$DECISION_COMMENTS" == *"Approved for construction"* ]]; then
    print_success "Decision comments are present"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    print_warning "Decision comments not found or different"
fi
echo ""

# Verification Step 3: Verify submission status updates to 'approved'
print_info "VERIFICATION STEP 3: Verify submission status updated to 'approved'"
updated_submission_response=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/projects/$PROJECT_ID/equipment-submissions/$SUBMISSION_ID" \
    -H "Authorization: Bearer $USER_TOKEN")

updated_submission_status=$(echo "$updated_submission_response" | tail -n1)
updated_submission_body=$(echo "$updated_submission_response" | sed '$d')

run_test "Get updated submission" "200" "$updated_submission_status" "$updated_submission_body"

UPDATED_STATUS=$(echo "$updated_submission_body" | grep -o '"status":"[^"]*' | head -1 | cut -d'"' -f4)
if [ "$UPDATED_STATUS" == "approved" ]; then
    print_success "Submission status updated to 'approved' after approval decision"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    print_error "Submission status is '$UPDATED_STATUS', expected 'approved'"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi
echo ""

# Verification Step 4: GET /equipment-submissions/{id}/decisions returns decision list
print_info "VERIFICATION STEP 4: List approval decisions for submission"
decisions_list_response=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/equipment-submissions/$SUBMISSION_ID/decisions" \
    -H "Authorization: Bearer $USER_TOKEN")

decisions_list_status=$(echo "$decisions_list_response" | tail -n1)
decisions_list_body=$(echo "$decisions_list_response" | sed '$d')

run_test "List approval decisions" "200" "$decisions_list_status" "$decisions_list_body"

# Verify decisions list contains at least one decision
DECISION_COUNT=$(echo "$decisions_list_body" | grep -o '"id":"[^"]*' | wc -l | tr -d ' ')
if [ "$DECISION_COUNT" -ge "1" ]; then
    print_success "Decisions list contains $DECISION_COUNT decision(s)"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    print_error "Decisions list is empty or malformed"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

# Verify the decision in the list matches our created decision
if echo "$decisions_list_body" | grep -q "$DECISION_ID"; then
    print_success "Created decision found in decisions list"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    print_error "Created decision not found in decisions list"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi
echo ""

# ===========================
# ADDITIONAL TESTS
# ===========================

# Additional Test 1: Test rejection workflow
print_info "ADDITIONAL TEST 1: Create submission and test rejection workflow"

submission2_response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/projects/$PROJECT_ID/equipment-submissions" \
    -H "Authorization: Bearer $USER_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
        \"template_id\": \"$TEMPLATE_ID\",
        \"name\": \"Excavator for Site B\",
        \"description\": \"Another excavator request\",
        \"specifications\": {\"serialNumber\": \"EXC-2024-002\"},
        \"notes\": \"For rejection test\"
    }")

submission2_status=$(echo "$submission2_response" | tail -n1)
submission2_body=$(echo "$submission2_response" | sed '$d')

run_test "Create second submission for rejection test" "201" "$submission2_status" "$submission2_body"

SUBMISSION2_ID=$(echo "$submission2_body" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

if [ -n "$SUBMISSION2_ID" ]; then
    print_info "Submission 2 ID: $SUBMISSION2_ID"

    # Add rejection decision
    reject_response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/equipment-submissions/$SUBMISSION2_ID/decisions" \
        -H "Authorization: Bearer $USER_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{
            "decision": "reject",
            "comments": "Rejected due to budget constraints"
        }')

    reject_status=$(echo "$reject_response" | tail -n1)
    reject_body=$(echo "$reject_response" | sed '$d')

    run_test "Add rejection decision" "201" "$reject_status" "$reject_body"

    # Verify status changed to rejected
    submission2_check=$(curl -s -X GET "$BASE_URL/projects/$PROJECT_ID/equipment-submissions/$SUBMISSION2_ID" \
        -H "Authorization: Bearer $USER_TOKEN")

    REJECT_STATUS=$(echo "$submission2_check" | grep -o '"status":"[^"]*' | head -1 | cut -d'"' -f4)
    if [ "$REJECT_STATUS" == "rejected" ]; then
        print_success "Submission status updated to 'rejected' after rejection decision"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        print_error "Submission status is '$REJECT_STATUS', expected 'rejected'"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
fi
echo ""

# Additional Test 2: Test revision request workflow
print_info "ADDITIONAL TEST 2: Create submission and test revision request workflow"

submission3_response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/projects/$PROJECT_ID/equipment-submissions" \
    -H "Authorization: Bearer $USER_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
        \"template_id\": \"$TEMPLATE_ID\",
        \"name\": \"Excavator for Site C\",
        \"description\": \"Third excavator request\",
        \"specifications\": {\"serialNumber\": \"EXC-2024-003\"},
        \"notes\": \"For revision test\"
    }")

submission3_status=$(echo "$submission3_response" | tail -n1)
submission3_body=$(echo "$submission3_response" | sed '$d')

run_test "Create third submission for revision test" "201" "$submission3_status" "$submission3_body"

SUBMISSION3_ID=$(echo "$submission3_body" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

if [ -n "$SUBMISSION3_ID" ]; then
    print_info "Submission 3 ID: $SUBMISSION3_ID"

    # Add revision request decision
    revision_response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/equipment-submissions/$SUBMISSION3_ID/decisions" \
        -H "Authorization: Bearer $USER_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{
            "decision": "revision",
            "comments": "Please provide additional specifications for operator certification"
        }')

    revision_status=$(echo "$revision_response" | tail -n1)
    revision_body=$(echo "$revision_response" | sed '$d')

    run_test "Add revision request decision" "201" "$revision_status" "$revision_body"

    # Verify status changed to revision_requested
    submission3_check=$(curl -s -X GET "$BASE_URL/projects/$PROJECT_ID/equipment-submissions/$SUBMISSION3_ID" \
        -H "Authorization: Bearer $USER_TOKEN")

    REVISION_STATUS=$(echo "$submission3_check" | grep -o '"status":"[^"]*' | head -1 | cut -d'"' -f4)
    if [ "$REVISION_STATUS" == "revision_requested" ]; then
        print_success "Submission status updated to 'revision_requested' after revision decision"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        print_error "Submission status is '$REVISION_STATUS', expected 'revision_requested'"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
fi
echo ""

# Additional Test 3: Test multiple decisions on same submission
print_info "ADDITIONAL TEST 3: Test multiple decisions on same submission"

# Add another decision to the first submission (already approved)
second_decision_response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/equipment-submissions/$SUBMISSION_ID/decisions" \
    -H "Authorization: Bearer $USER_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "decision": "approve",
        "comments": "Re-confirmed approval after final review"
    }')

second_decision_status=$(echo "$second_decision_response" | tail -n1)
second_decision_body=$(echo "$second_decision_response" | sed '$d')

run_test "Add second decision to same submission" "201" "$second_decision_status" "$second_decision_body"

# List decisions again and verify we have 2
multi_decisions_response=$(curl -s -X GET "$BASE_URL/equipment-submissions/$SUBMISSION_ID/decisions" \
    -H "Authorization: Bearer $USER_TOKEN")

MULTI_DECISION_COUNT=$(echo "$multi_decisions_response" | grep -o '"id":"[^"]*' | wc -l | tr -d ' ')
if [ "$MULTI_DECISION_COUNT" -ge "2" ]; then
    print_success "Multiple decisions supported - Found $MULTI_DECISION_COUNT decisions"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    print_error "Expected at least 2 decisions, found $MULTI_DECISION_COUNT"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi
echo ""

# ===========================
# TEST SUMMARY
# ===========================

echo "========================================"
echo "TEST SUMMARY"
echo "========================================"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    print_success "All tests passed! ($TESTS_PASSED/$((TESTS_PASSED + TESTS_FAILED)))"
    echo ""
    echo "✅ VERIFICATION COMPLETE - ALL REQUIREMENTS MET:"
    echo "   ✓ Step 1: Create submission with status=draft"
    echo "   ✓ Step 2: Add approval decision via POST /equipment-submissions/{id}/decisions"
    echo "   ✓ Step 3: Verify submission status updates"
    echo "   ✓ Step 4: GET /equipment-submissions/{id}/decisions returns decision list"
    echo ""
    echo "Additional workflows tested:"
    echo "   ✓ Rejection workflow (draft → rejected)"
    echo "   ✓ Revision request workflow (draft → revision_requested)"
    echo "   ✓ Multiple decisions on same submission"
    echo ""
    exit 0
else
    print_error "Some tests failed ($TESTS_PASSED passed, $TESTS_FAILED failed)"
    echo ""
    exit 1
fi
