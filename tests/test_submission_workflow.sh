#!/bin/bash

# Integration Test for Equipment Submission Workflow (Subtask 7-3)
# Tests: Create submission from template, verify linkage, update submission, verify audit logs

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
echo "Equipment Submission Workflow Test"
echo "Subtask 7-3: Submission with Template Linkage"
echo "========================================"
echo ""

# Step 0: Check server
check_server
echo ""

# Step 1: Authenticate as admin
print_info "STEP 1: Authentication"
echo "----------------------------------------"
ADMIN_TOKEN=$(get_auth_token "$ADMIN_EMAIL" "$ADMIN_PASSWORD" "admin")
if [ $? -ne 0 ]; then
    print_error "Cannot proceed without admin authentication"
    exit 1
fi
echo ""

# Step 2: Create a template first (prerequisite)
print_info "STEP 2: Create Equipment Template (Prerequisite)"
echo "----------------------------------------"
response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/equipment-templates" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d '{
        "name": "Test Excavator Template",
        "category": "Heavy Equipment",
        "description": "Standard excavator template for testing",
        "specifications": {
            "type": "Hydraulic Excavator",
            "bucket_capacity": "1.5 cubic yards",
            "engine_power": "150 HP"
        }
    }')

status=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if run_test "Create template" "201" "$status" "$body"; then
    TEMPLATE_ID=$(echo "$body" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
    print_info "Template ID: $TEMPLATE_ID"
else
    print_error "Failed to create template. Cannot proceed with submission tests."
    exit 1
fi
echo ""

# Step 3: Get or create a project (we'll need a project_id)
print_info "STEP 3: Get Project for Testing"
echo "----------------------------------------"
response=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/projects" \
    -H "Authorization: Bearer $ADMIN_TOKEN")

status=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [ "$status" == "200" ]; then
    PROJECT_ID=$(echo "$body" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
    if [ -z "$PROJECT_ID" ]; then
        print_warning "No projects found. Creating a test project..."
        response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/projects" \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer $ADMIN_TOKEN" \
            -d '{
                "name": "Test Project for Submissions",
                "description": "Project for testing equipment submissions"
            }')
        status=$(echo "$response" | tail -n1)
        body=$(echo "$response" | sed '$d')
        PROJECT_ID=$(echo "$body" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
    fi
    print_success "Using Project ID: $PROJECT_ID"
else
    print_error "Failed to get projects"
    exit 1
fi
echo ""

# Step 4: Create equipment submission from template
print_info "STEP 4: Create Equipment Submission from Template"
echo "----------------------------------------"
response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/projects/$PROJECT_ID/equipment-submissions" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d "{
        \"template_id\": \"$TEMPLATE_ID\",
        \"name\": \"Excavator for Site A\",
        \"description\": \"Excavator needed for foundation work\",
        \"specifications\": {
            \"type\": \"Hydraulic Excavator\",
            \"bucket_capacity\": \"1.5 cubic yards\",
            \"engine_power\": \"150 HP\",
            \"location\": \"Site A\"
        },
        \"notes\": \"Urgent requirement for next phase\"
    }")

status=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if run_test "Create submission from template" "201" "$status" "$body"; then
    SUBMISSION_ID=$(echo "$body" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
    print_info "Submission ID: $SUBMISSION_ID"

    # Verify template linkage
    template_id_in_response=$(echo "$body" | grep -o '"templateId":"[^"]*' | cut -d'"' -f4)
    project_id_in_response=$(echo "$body" | grep -o '"projectId":"[^"]*' | cut -d'"' -f4)

    if [ "$template_id_in_response" == "$TEMPLATE_ID" ]; then
        print_success "Submission is linked to template: $TEMPLATE_ID"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        print_error "Submission template linkage failed"
        echo "Expected: $TEMPLATE_ID, Got: $template_id_in_response"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi

    if [ "$project_id_in_response" == "$PROJECT_ID" ]; then
        print_success "Submission is linked to project: $PROJECT_ID"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        print_error "Submission project linkage failed"
        echo "Expected: $PROJECT_ID, Got: $project_id_in_response"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
else
    print_error "Failed to create submission. Cannot proceed."
    exit 1
fi
echo ""

# Step 5: Get submission details to verify linkage
print_info "STEP 5: Verify Submission Details"
echo "----------------------------------------"
response=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/projects/$PROJECT_ID/equipment-submissions/$SUBMISSION_ID" \
    -H "Authorization: Bearer $ADMIN_TOKEN")

status=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if run_test "Get submission details" "200" "$status" "$body"; then
    # Verify all the fields are correct
    name_in_response=$(echo "$body" | grep -o '"name":"[^"]*' | head -1 | cut -d'"' -f4)
    if [ "$name_in_response" == "Excavator for Site A" ]; then
        print_success "Submission name is correct"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        print_error "Submission name mismatch"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
fi
echo ""

# Step 6: Update submission
print_info "STEP 6: Update Equipment Submission"
echo "----------------------------------------"
response=$(curl -s -w "\n%{http_code}" -X PUT "$BASE_URL/projects/$PROJECT_ID/equipment-submissions/$SUBMISSION_ID" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d '{
        "name": "Updated Excavator for Site A",
        "description": "Excavator needed for foundation work - Updated requirements",
        "specifications": {
            "type": "Hydraulic Excavator",
            "bucket_capacity": "2.0 cubic yards",
            "engine_power": "180 HP",
            "location": "Site A - Updated"
        },
        "notes": "Requirements updated based on site survey"
    }')

status=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if run_test "Update submission" "200" "$status" "$body"; then
    # Verify updated fields
    updated_name=$(echo "$body" | grep -o '"name":"[^"]*' | head -1 | cut -d'"' -f4)
    if [ "$updated_name" == "Updated Excavator for Site A" ]; then
        print_success "Submission updated successfully"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        print_error "Submission update verification failed"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
fi
echo ""

# Step 7: List all submissions for the project
print_info "STEP 7: List Project Submissions"
echo "----------------------------------------"
response=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/projects/$PROJECT_ID/equipment-submissions" \
    -H "Authorization: Bearer $ADMIN_TOKEN")

status=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if run_test "List project submissions" "200" "$status" "$body"; then
    # Check if our submission is in the list
    if echo "$body" | grep -q "$SUBMISSION_ID"; then
        print_success "Submission found in project list"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        print_error "Submission not found in project list"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
fi
echo ""

# Step 8: Verify audit logs (informational)
print_info "STEP 8: Audit Log Verification"
echo "----------------------------------------"
print_info "Audit logs should contain the following entries:"
print_info "  1. CREATE - equipment_template (Template creation)"
print_info "  2. CREATE - equipment_submission (Submission creation)"
print_info "  3. UPDATE - equipment_submission (Submission update)"
echo ""
print_warning "To verify audit logs, run the following SQL query:"
echo ""
echo "  SELECT entity_type, action, entity_id, created_at"
echo "  FROM audit_logs"
echo "  WHERE entity_type IN ('equipment_template', 'equipment_submission')"
echo "    AND entity_id IN ('$TEMPLATE_ID', '$SUBMISSION_ID')"
echo "  ORDER BY created_at DESC;"
echo ""

# Summary
echo "========================================"
echo "TEST SUMMARY"
echo "========================================"
echo -e "${GREEN}Tests Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Tests Failed: $TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    print_success "All tests passed! ✓"
    echo ""
    print_info "Verification Complete:"
    print_success "1. Submission created from template successfully"
    print_success "2. Submission linked to template: $TEMPLATE_ID"
    print_success "3. Submission linked to project: $PROJECT_ID"
    print_success "4. Submission updated successfully"
    print_success "5. Audit logs should be created (verify in database)"
    echo ""
    print_info "Test artifacts created:"
    echo "  - Template ID: $TEMPLATE_ID"
    echo "  - Project ID: $PROJECT_ID"
    echo "  - Submission ID: $SUBMISSION_ID"
    echo ""
    exit 0
else
    print_error "Some tests failed. Please review the errors above."
    exit 1
fi
