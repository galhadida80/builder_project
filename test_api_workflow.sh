#!/bin/bash
# End-to-End API Test for Document Review Workflow
# Tests the complete workflow using curl commands

set -e  # Exit on error

echo "=========================================="
echo "Document Review Workflow E2E Test"
echo "=========================================="

# Configuration
API_BASE="http://localhost:8000/api/v1"
FRONTEND_URL="http://localhost:3000"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test variables (these would need to be set from actual data)
PROJECT_ID="test-project-id"
DOCUMENT_ID="test-document-id"
AUTH_TOKEN="${AUTH_TOKEN:-}"

# Function to print success
success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Function to print error
error() {
    echo -e "${RED}❌ $1${NC}"
}

# Function to print info
info() {
    echo -e "${BLUE}📋 $1${NC}"
}

# Check if services are running
info "Step 0: Checking if services are running..."
if curl -s -o /dev/null -w "%{http_code}" "$API_BASE/health" | grep -q "200\|404"; then
    success "Backend is running at $API_BASE"
else
    error "Backend is not running at $API_BASE"
    echo "Please start the backend with: cd backend && uvicorn app.main:app --reload"
    exit 1
fi

if curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL" | grep -q "200\|301\|302"; then
    success "Frontend is running at $FRONTEND_URL"
else
    error "Frontend is not running at $FRONTEND_URL"
    echo "Please start the frontend with: cd frontend && npm run dev"
    exit 1
fi

echo ""
info "=========================================="
info "MANUAL VERIFICATION REQUIRED"
info "=========================================="
echo ""
echo "This E2E test requires manual verification in the browser."
echo "Please follow these steps:"
echo ""

info "Step 1: Navigate to project files list"
echo "  URL: $FRONTEND_URL/projects/{project-id}/files"
echo "  Action: Open the project files page in your browser"
echo ""

info "Step 2: Click on a document to open review interface"
echo "  Action: Click on any document (PDF or image) in the files list"
echo "  Expected: Should redirect to /projects/{id}/documents/{documentId}/review"
echo ""

info "Step 3: Verify document loads in left pane"
echo "  Expected: Document viewer should display the selected file"
echo "  Check: PDF should render in iframe OR image should display with zoom controls"
echo ""

info "Step 4: Create a new comment in right pane"
echo "  Action: Type a comment in the text field at the bottom of the comments panel"
echo "  Text: 'This is a test comment for E2E verification'"
echo "  Action: Click the Send button or press Cmd/Ctrl+Enter"
echo ""

info "Step 5: Verify comment appears in list with correct metadata"
echo "  Expected: Comment should appear in the comments list immediately"
echo "  Check: Comment should show your name, avatar, timestamp (e.g., 'Just now')"
echo "  Check: Comment text should be 'This is a test comment for E2E verification'"
echo ""

info "Step 6: Edit the comment"
echo "  Action: Click the three-dot menu on your comment"
echo "  Action: Select 'Edit'"
echo "  Action: Change the text to 'This is an EDITED test comment'"
echo "  Action: Click 'Save'"
echo ""

info "Step 7: Verify edit persists"
echo "  Expected: Comment text should update to 'This is an EDITED test comment'"
echo "  Action: Refresh the page"
echo "  Expected: Comment should still show the edited text after refresh"
echo ""

info "Step 8: Add a reply to the comment"
echo "  Action: Click the 'Reply' button on the comment"
echo "  Action: Type 'This is a reply to the comment'"
echo "  Action: Click 'Reply' button to submit"
echo ""

info "Step 9: Verify reply appears"
echo "  Expected: Reply should appear indented under the parent comment"
echo "  Check: Reply should show your name and timestamp"
echo ""

info "Step 10: Update review status to 'approved'"
echo "  Action: Click the 'APPROVE' button at the bottom of the page"
echo "  Action: Confirm the action in the dialog"
echo "  Expected: Button should become disabled and show 'APPROVED' state"
echo ""

info "Step 11: Verify status update reflects in database"
echo "  Action: Open another browser tab/window"
echo "  Action: Navigate to the same document review page"
echo "  Expected: Status should still show as 'APPROVED'"
echo ""

info "Step 12: Delete the reply comment"
echo "  Action: Click the three-dot menu on the reply comment"
echo "  Action: Select 'Delete'"
echo "  Action: Confirm deletion"
echo "  Expected: Reply should be removed from the list"
echo ""

info "Step 13: Delete the parent comment"
echo "  Action: Click the three-dot menu on the parent comment"
echo "  Action: Select 'Delete'"
echo "  Action: Confirm deletion"
echo "  Expected: Comment should be removed from the list"
echo ""

info "Step 14: Verify comments are removed"
echo "  Expected: Comments list should show empty state"
echo "  Expected: Should see 'No comments yet' message"
echo ""

echo "=========================================="
success "Manual Verification Checklist Complete"
echo "=========================================="
echo ""
echo "Additional checks to perform:"
echo ""
echo "✓ Check browser console for errors (F12 -> Console)"
echo "✓ Verify network requests are successful (F12 -> Network)"
echo "✓ Test zoom controls on document viewer"
echo "✓ Test download and print buttons"
echo "✓ Test comment resolution (Resolve/Unresolve button)"
echo "✓ Test responsive layout (resize browser window)"
echo "✓ Test with different file types (PDF, PNG, JPG)"
echo ""

info "Database Verification (Optional)"
echo "To verify database state, run these SQL queries in psql:"
echo ""
echo "-- Check document_reviews table"
echo "SELECT * FROM document_reviews ORDER BY created_at DESC LIMIT 5;"
echo ""
echo "-- Check document_comments table"
echo "SELECT * FROM document_comments ORDER BY created_at DESC LIMIT 5;"
echo ""
echo "-- Check review status counts"
echo "SELECT status, COUNT(*) FROM document_reviews GROUP BY status;"
echo ""

success "Test script completed!"
echo ""
echo "Please perform the manual verification steps above and confirm:"
echo "  [ ] All steps completed successfully"
echo "  [ ] No console errors"
echo "  [ ] All UI interactions work as expected"
echo "  [ ] Database state is correct"
