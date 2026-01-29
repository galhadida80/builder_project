#!/bin/bash
# Equipment Template API Testing Script
# This script tests all CRUD operations for equipment templates via the API

set -e

BASE_URL="http://localhost:8000/api/v1"
ADMIN_TOKEN=""
USER_TOKEN=""

echo "=========================================="
echo "Equipment Template API Testing"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if server is running
check_server() {
    echo "1. Checking if server is running..."
    if curl -s -f "$BASE_URL/docs" > /dev/null; then
        echo -e "${GREEN}✓ Server is running${NC}"
    else
        echo -e "${RED}✗ Server is not running${NC}"
        echo "Please start the server first:"
        echo "  cd backend && uvicorn app.main:app --reload --port 8000"
        exit 1
    fi
}

# Function to get admin token
get_admin_token() {
    echo ""
    echo "2. Getting admin authentication token..."
    echo "Please provide admin credentials:"
    read -p "Admin email: " ADMIN_EMAIL
    read -s -p "Admin password: " ADMIN_PASSWORD
    echo ""

    RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")

    ADMIN_TOKEN=$(echo $RESPONSE | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

    if [ -z "$ADMIN_TOKEN" ]; then
        echo -e "${RED}✗ Failed to get admin token${NC}"
        echo "Response: $RESPONSE"
        exit 1
    fi
    echo -e "${GREEN}✓ Admin token obtained${NC}"
}

# Function to get regular user token
get_user_token() {
    echo ""
    echo "3. Getting regular user authentication token..."
    echo "Please provide regular user credentials:"
    read -p "User email: " USER_EMAIL
    read -s -p "User password: " USER_PASSWORD
    echo ""

    RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"$USER_EMAIL\",\"password\":\"$USER_PASSWORD\"}")

    USER_TOKEN=$(echo $RESPONSE | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

    if [ -z "$USER_TOKEN" ]; then
        echo -e "${RED}✗ Failed to get user token${NC}"
        echo "Response: $RESPONSE"
        exit 1
    fi
    echo -e "${GREEN}✓ User token obtained${NC}"
}

# Test 1: GET /equipment-templates (list all)
test_list_templates() {
    echo ""
    echo "=========================================="
    echo "TEST 1: GET /equipment-templates"
    echo "=========================================="

    RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/equipment-templates" \
        -H "Content-Type: application/json")

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | head -n-1)

    if [ "$HTTP_CODE" = "200" ]; then
        echo -e "${GREEN}✓ Status: 200 OK${NC}"
        echo "Response: $BODY"
    else
        echo -e "${RED}✗ Status: $HTTP_CODE (expected 200)${NC}"
        echo "Response: $BODY"
    fi
}

# Test 2: POST /equipment-templates as admin (should succeed)
test_create_template_admin() {
    echo ""
    echo "=========================================="
    echo "TEST 2: POST /equipment-templates (Admin)"
    echo "=========================================="

    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/equipment-templates" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -d '{
            "name": "Test Excavator Template",
            "category": "Heavy Equipment",
            "description": "Standard excavator template for construction sites",
            "specifications": {
                "type": "Hydraulic Excavator",
                "bucket_capacity": "1.5 cubic yards",
                "operating_weight": "45000 lbs"
            }
        }')

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | head -n-1)

    if [ "$HTTP_CODE" = "201" ]; then
        echo -e "${GREEN}✓ Status: 201 Created${NC}"
        TEMPLATE_ID=$(echo $BODY | grep -o '"id":"[^"]*' | cut -d'"' -f4)
        echo "Template ID: $TEMPLATE_ID"
        echo "Response: $BODY"
        echo "$TEMPLATE_ID" > /tmp/template_id.txt
    else
        echo -e "${RED}✗ Status: $HTTP_CODE (expected 201)${NC}"
        echo "Response: $BODY"
    fi
}

# Test 3: POST /equipment-templates as regular user (should fail with 403)
test_create_template_user() {
    echo ""
    echo "=========================================="
    echo "TEST 3: POST /equipment-templates (User)"
    echo "=========================================="

    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/equipment-templates" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $USER_TOKEN" \
        -d '{
            "name": "Unauthorized Template",
            "category": "Test",
            "description": "This should fail"
        }')

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | head -n-1)

    if [ "$HTTP_CODE" = "403" ]; then
        echo -e "${GREEN}✓ Status: 403 Forbidden (correct!)${NC}"
        echo "Response: $BODY"
    else
        echo -e "${RED}✗ Status: $HTTP_CODE (expected 403)${NC}"
        echo "Response: $BODY"
    fi
}

# Test 4: GET /equipment-templates/{id} (get single template)
test_get_template() {
    echo ""
    echo "=========================================="
    echo "TEST 4: GET /equipment-templates/{id}"
    echo "=========================================="

    if [ ! -f /tmp/template_id.txt ]; then
        echo -e "${YELLOW}⚠ No template ID found, skipping test${NC}"
        return
    fi

    TEMPLATE_ID=$(cat /tmp/template_id.txt)

    RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/equipment-templates/$TEMPLATE_ID" \
        -H "Content-Type: application/json")

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | head -n-1)

    if [ "$HTTP_CODE" = "200" ]; then
        echo -e "${GREEN}✓ Status: 200 OK${NC}"
        echo "Response: $BODY"
    else
        echo -e "${RED}✗ Status: $HTTP_CODE (expected 200)${NC}"
        echo "Response: $BODY"
    fi
}

# Test 5: PUT /equipment-templates/{id} (update template)
test_update_template() {
    echo ""
    echo "=========================================="
    echo "TEST 5: PUT /equipment-templates/{id}"
    echo "=========================================="

    if [ ! -f /tmp/template_id.txt ]; then
        echo -e "${YELLOW}⚠ No template ID found, skipping test${NC}"
        return
    fi

    TEMPLATE_ID=$(cat /tmp/template_id.txt)

    RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT "$BASE_URL/equipment-templates/$TEMPLATE_ID" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -d '{
            "name": "Updated Excavator Template",
            "description": "Updated description with new specifications"
        }')

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | head -n-1)

    if [ "$HTTP_CODE" = "200" ]; then
        echo -e "${GREEN}✓ Status: 200 OK${NC}"
        echo "Response: $BODY"
    else
        echo -e "${RED}✗ Status: $HTTP_CODE (expected 200)${NC}"
        echo "Response: $BODY"
    fi
}

# Test 6: DELETE /equipment-templates/{id} (delete template)
test_delete_template() {
    echo ""
    echo "=========================================="
    echo "TEST 6: DELETE /equipment-templates/{id}"
    echo "=========================================="

    if [ ! -f /tmp/template_id.txt ]; then
        echo -e "${YELLOW}⚠ No template ID found, skipping test${NC}"
        return
    fi

    TEMPLATE_ID=$(cat /tmp/template_id.txt)

    RESPONSE=$(curl -s -w "\n%{http_code}" -X DELETE "$BASE_URL/equipment-templates/$TEMPLATE_ID" \
        -H "Authorization: Bearer $ADMIN_TOKEN")

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | head -n-1)

    if [ "$HTTP_CODE" = "200" ]; then
        echo -e "${GREEN}✓ Status: 200 OK${NC}"
        echo "Response: $BODY"
        rm -f /tmp/template_id.txt
    else
        echo -e "${RED}✗ Status: $HTTP_CODE (expected 200)${NC}"
        echo "Response: $BODY"
    fi
}

# Main execution
main() {
    check_server

    echo ""
    echo "This test requires authentication. You can:"
    echo "1. Provide credentials interactively"
    echo "2. Skip authentication tests (Ctrl+C)"
    echo ""
    read -p "Continue with authentication tests? (y/n): " CONTINUE

    if [ "$CONTINUE" != "y" ]; then
        echo "Running unauthenticated tests only..."
        test_list_templates
        exit 0
    fi

    get_admin_token
    get_user_token

    # Run all tests
    test_list_templates
    test_create_template_admin
    test_create_template_user
    test_get_template
    test_update_template
    test_delete_template

    echo ""
    echo "=========================================="
    echo "All tests completed!"
    echo "=========================================="
}

main
