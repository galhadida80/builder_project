#!/bin/bash
# End-to-end verification script for Checklist Template System
# This script starts the required services and runs the E2E verification

set -e  # Exit on error

echo "========================================="
echo "Checklist Template System E2E Verification"
echo "========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}Error: docker-compose is not installed${NC}"
    exit 1
fi

# Check if Python 3 is available
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}Error: python3 is not installed${NC}"
    exit 1
fi

# Check if requests library is available
if ! python3 -c "import requests" 2>/dev/null; then
    echo -e "${YELLOW}Installing requests library...${NC}"
    pip3 install requests
fi

echo -e "${YELLOW}Step 1: Starting Docker services...${NC}"
docker-compose up -d db redis backend

echo ""
echo -e "${YELLOW}Step 2: Waiting for services to be ready...${NC}"
echo "This may take up to 60 seconds..."
sleep 10

# Check if backend is healthy
MAX_ATTEMPTS=30
ATTEMPT=0
while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    if curl -s http://localhost:8000/health > /dev/null 2>&1; then
        echo -e "${GREEN}Backend is healthy!${NC}"
        break
    fi
    ATTEMPT=$((ATTEMPT + 1))
    echo "Attempt $ATTEMPT/$MAX_ATTEMPTS..."
    sleep 2
done

if [ $ATTEMPT -eq $MAX_ATTEMPTS ]; then
    echo -e "${RED}Backend failed to start. Checking logs:${NC}"
    docker-compose logs backend | tail -50
    exit 1
fi

echo ""
echo -e "${YELLOW}Step 3: Running E2E verification tests...${NC}"
echo ""

# Run the Python verification script
python3 ./backend/tests/e2e_checklist_verification.py

# Capture exit code
EXIT_CODE=$?

echo ""
if [ $EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}=========================================${NC}"
    echo -e "${GREEN}✓ E2E Verification PASSED!${NC}"
    echo -e "${GREEN}=========================================${NC}"
else
    echo -e "${RED}=========================================${NC}"
    echo -e "${RED}✗ E2E Verification FAILED!${NC}"
    echo -e "${RED}=========================================${NC}"
fi

echo ""
echo -e "${YELLOW}Keeping services running for inspection...${NC}"
echo "To view logs: docker-compose logs -f backend"
echo "To stop services: docker-compose down"
echo "Backend API: http://localhost:8000"
echo "API Docs: http://localhost:8000/api/v1/docs"

exit $EXIT_CODE
