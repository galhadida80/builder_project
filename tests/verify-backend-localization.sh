#!/bin/bash

# Subtask 5-3: Verify Backend API Localization
# This script tests that the backend API returns localized messages based on Accept-Language header

set -e

echo "=========================================="
echo "Backend API Localization Verification"
echo "=========================================="

# Check if backend is running
check_backend() {
    echo ""
    echo "Checking if backend is running..."
    if ! curl -s http://localhost:8000/health >/dev/null 2>&1; then
        echo "Backend is not running on http://localhost:8000"
        echo "Please start the backend with: cd backend && uvicorn app.main:app --reload"
        exit 1
    fi
    echo "OK - Backend is running"
}

# Test 1: Login with invalid credentials in English
test_login_english() {
    echo ""
    echo "Test 1: Login with invalid credentials (English)"
    response=$(curl -s -X POST http://localhost:8000/api/v1/auth/login \
        -H "Content-Type: application/json" \
        -H "Accept-Language: en" \
        -d '{"email": "nonexistent@example.com", "password": "wrongpass"}')

    echo "Response: $response"

    if echo "$response" | grep -q "Invalid email or password"; then
        echo "PASS - Got English error message"
        return 0
    else
        echo "FAIL - Did not get English error message"
        return 1
    fi
}

# Test 2: Login with invalid credentials in Hebrew
test_login_hebrew() {
    echo ""
    echo "Test 2: Login with invalid credentials (Hebrew)"
    response=$(curl -s -X POST http://localhost:8000/api/v1/auth/login \
        -H "Content-Type: application/json" \
        -H "Accept-Language: he-IL" \
        -d '{"email": "nonexistent@example.com", "password": "wrongpass"}')

    echo "Response: $response"

    if echo "$response" | grep -q "דוא"; then
        echo "PASS - Got Hebrew error message"
        return 0
    else
        echo "FAIL - Did not get Hebrew error message"
        return 1
    fi
}

# Test 3: No Accept-Language header (should default to English)
test_no_header() {
    echo ""
    echo "Test 3: Login without Accept-Language header (should default to English)"
    response=$(curl -s -X POST http://localhost:8000/api/v1/auth/login \
        -H "Content-Type: application/json" \
        -d '{"email": "nonexistent@example.com", "password": "wrongpass"}')

    echo "Response: $response"

    if echo "$response" | grep -q "Invalid email or password"; then
        echo "PASS - Got English error message (default)"
        return 0
    else
        echo "FAIL - Did not get English error message (default)"
        return 1
    fi
}

# Main execution
check_backend
test_login_english || true
test_login_hebrew || true
test_no_header || true

echo ""
echo "=========================================="
echo "Verification Complete!"
echo "==========================================="
