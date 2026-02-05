#!/bin/bash

# Test API Integration for RFI Form Dialog
# This script tests the RFI API endpoints to verify:
# 1. Create RFI with status='draft'
# 2. Create RFI with status='sent'
# 3. Proper status code 201 responses
# 4. Response includes created RFI data

API_URL="http://localhost:8000/api/v1"
PROJECT_ID="test-project-001"

echo "================================"
echo "RFI API Integration Test"
echo "================================"
echo ""
echo "Testing endpoint: POST $API_URL/projects/$PROJECT_ID/rfis"
echo ""

# Test 1: Create Draft RFI
echo "Test 1: Create Draft RFI"
echo "------------------------"

DRAFT_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/projects/$PROJECT_ID/rfis" \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "Test Draft RFI",
    "question": "<p>This is a test question</p>",
    "to_email": "test@example.com",
    "to_name": "Test Recipient",
    "category": "design",
    "priority": "high",
    "status": "draft"
  }')

# Extract status code and body
HTTP_CODE=$(echo "$DRAFT_RESPONSE" | tail -n 1)
RESPONSE_BODY=$(echo "$DRAFT_RESPONSE" | sed '$d')

echo "HTTP Status Code: $HTTP_CODE"
echo "Response Body:"
echo "$RESPONSE_BODY" | jq . 2>/dev/null || echo "$RESPONSE_BODY"
echo ""

if [ "$HTTP_CODE" = "201" ]; then
  echo "✓ Draft RFI created successfully (201)"
  DRAFT_RFI_ID=$(echo "$RESPONSE_BODY" | jq -r '.id' 2>/dev/null || echo "N/A")
  DRAFT_STATUS=$(echo "$RESPONSE_BODY" | jq -r '.status' 2>/dev/null || echo "N/A")
  echo "  ID: $DRAFT_RFI_ID"
  echo "  Status: $DRAFT_STATUS"
else
  echo "✗ Failed to create draft RFI (HTTP $HTTP_CODE)"
fi

echo ""
echo ""

# Test 2: Create Sent RFI
echo "Test 2: Create Sent RFI"
echo "----------------------"

SENT_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/projects/$PROJECT_ID/rfis" \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "Test Sent RFI",
    "question": "<p>This RFI should be sent immediately</p>",
    "to_email": "consultant@example.com",
    "to_name": "Test Consultant",
    "cc_emails": ["cc@example.com"],
    "category": "structural",
    "priority": "urgent",
    "status": "sent"
  }')

# Extract status code and body
HTTP_CODE=$(echo "$SENT_RESPONSE" | tail -n 1)
RESPONSE_BODY=$(echo "$SENT_RESPONSE" | sed '$d')

echo "HTTP Status Code: $HTTP_CODE"
echo "Response Body:"
echo "$RESPONSE_BODY" | jq . 2>/dev/null || echo "$RESPONSE_BODY"
echo ""

if [ "$HTTP_CODE" = "201" ]; then
  echo "✓ Sent RFI created successfully (201)"
  SENT_RFI_ID=$(echo "$RESPONSE_BODY" | jq -r '.id' 2>/dev/null || echo "N/A")
  SENT_STATUS=$(echo "$RESPONSE_BODY" | jq -r '.status' 2>/dev/null || echo "N/A")
  echo "  ID: $SENT_RFI_ID"
  echo "  Status: $SENT_STATUS"
else
  echo "✗ Failed to create sent RFI (HTTP $HTTP_CODE)"
fi

echo ""
echo ""

# Test 3: Validate Required Fields
echo "Test 3: Missing Required Fields (should fail)"
echo "---------------------------------------------"

INVALID_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/projects/$PROJECT_ID/rfis" \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "Missing question",
    "to_email": "test@example.com"
  }')

HTTP_CODE=$(echo "$INVALID_RESPONSE" | tail -n 1)
RESPONSE_BODY=$(echo "$INVALID_RESPONSE" | sed '$d')

echo "HTTP Status Code: $HTTP_CODE"

if [ "$HTTP_CODE" != "201" ]; then
  echo "✓ Validation error correctly returned (HTTP $HTTP_CODE)"
else
  echo "✗ Should have failed validation but succeeded"
fi

echo ""
echo "================================"
echo "Test Summary"
echo "================================"
echo "If all tests show ✓, API integration is working correctly."
echo ""
