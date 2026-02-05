#!/bin/bash

# Set up environment and run RFI system integration tests

set -e

echo "=== RFI System Integration Tests ==="
echo

# Navigate to backend directory
cd "$(dirname "$0")/backend"

# Create virtual environment if it doesn't exist
if [ ! -d "test_env" ]; then
    echo "Creating virtual environment..."
    python3 -m venv test_env
fi

# Activate virtual environment
echo "Activating virtual environment..."
source test_env/bin/activate

# Install dependencies
echo "Installing dependencies..."
pip install -q --upgrade pip
pip install -q -r requirements.txt

echo
echo "=== Running RFI System Integration Tests ==="
echo

# Run RFI integration tests
echo "Step 1: Running RFI system integration tests..."
python3 -m pytest tests/integration/test_rfi_system.py -v --tb=short

TEST_RESULT=$?

echo
echo "=== Running All Backend Tests ==="
echo

# Run all backend tests to check for regressions
echo "Step 2: Running all backend tests (regression check)..."
python3 -m pytest tests/ -v --tb=short

ALL_TESTS_RESULT=$?

echo
echo "=== Test Coverage Report ==="
echo

# Run coverage report
echo "Step 3: Generating test coverage report..."
python3 -m pytest tests/integration/test_rfi_system.py --cov=app/services --cov=app/api --cov-report=term-missing --cov-report=html

COVERAGE_RESULT=$?

echo
echo "=== Results Summary ==="
echo "RFI Integration Tests: $([ $TEST_RESULT -eq 0 ] && echo 'PASSED ✓' || echo 'FAILED ✗')"
echo "Regression Tests: $([ $ALL_TESTS_RESULT -eq 0 ] && echo 'PASSED ✓' || echo 'FAILED ✗')"
echo "Coverage Report: $([ $COVERAGE_RESULT -eq 0 ] && echo 'GENERATED ✓' || echo 'FAILED ✗')"

# Return combined exit code
if [ $TEST_RESULT -ne 0 ] || [ $ALL_TESTS_RESULT -ne 0 ]; then
    exit 1
fi

exit 0
