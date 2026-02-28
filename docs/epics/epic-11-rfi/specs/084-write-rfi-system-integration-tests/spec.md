# RFI System Integration Tests

## Overview
# Write RFI System Integration Tests

**Linear Issue:** [BUI-109](https://linear.app/builder-project/issue/BUI-109/write-rfi-system-integration-tests)
**Priority:** No priority
**Status:** Backlog


## Description

## User Story

As a developer, I need integration tests for the RFI system so that I can ensure it works correctly.

## Acceptance Criteria

- [ ] Test RFI CRUD operations
- [ ] Test RFI number generation (uniqueness)
- [ ] Test email sending (mock Gmail API)
- [ ] Test webhook processing (mock Pub/Sub)
- [ ] Test email parsing with sample emails
- [ ] Test RFI matching logic (thread_id, subject, In-Reply-To)
- [ ] Test status transitions
- [ ] Test notification triggers
- [ ] Add fixtures for test data

## Labels

backend, testing, rfi


## Workflow Type

**Type**: feature

**Rationale**: This task adds new integration test coverage for an existing feature (the RFI system). The tests represent new test infrastructure and test cases that verify system behavior across multiple components (API, services, database, external integrations).

## Task Scope

### Services Involved
- **backend** (primary) - FastAPI backend containing RFI system logic, tests, and service integrations

### This Task Will:
- [ ] Create integration test file `backend/tests/integration/test_rfi_system.py` for full RFI workflow testing
- [ ] Test RFI CRUD operations through FastAPI endpoints
- [ ] Test RFI number generation with uniqueness validation
- [ ] Test email sending with mocked Gmail API service
- [ ] Test webhook processing with mocked Pub/Sub notifications
- [ ] Test email parsing logic with sample email payloads
- [ ] Test RFI-to-response matching using thread_id, subject, and In-Reply-To headers
- [ ] Test status transition state machine (draft → open → waiting_response → answered → closed)
- [ ] Test notification triggers at status change boundaries
- [ ] Create test fixtures for RFI entities and sample email data

### Out of Scope:
- Unit tests for individual functions (focus is integration testing)
- End-to-end tests with real Gmail API or Pub/Sub (all external services will be mocked)
- Frontend RFI UI testing
- Performance or load testing
- Migration of existing RFI data

## Service Context

### Backend Service

**Tech Stack:**
- Language: Python 3.13
- Framework: FastAPI
- Testing: pytest, pytest-asyncio
- ORM: SQLAlchemy (async)
- Database: PostgreSQL (SQLite in-memory for tests)

**Entry Point:** `backend/app/main.py`

**How to Run:**
```bash
# Run backend server
cd backend
uvicorn app.main:app --reload --port 8000

# Run tests
pytest backend/tests/integration/test_rfi_system.py -v

# Run all integration tests
pytest backend/tests/integration/ -v
```

**Port:** 8000

## Files to Modify

| File | Service | What to Change |
|------|---------|---------------|
| `backend/tests/integration/test_rfi_system.py` | backend | **Create new file** - Comprehensive integration tests for RFI system covering all acceptance criteria |
| `backend/tests/conftest.py` | backend | **Add fixtures** - Add RFI-specific fixtures (rfi_instance, sample_emails, mock_gmail_service, mock_pubsub) |
| `backend/requirements.txt` | backend | **Add dependencies** - Add missing packages: `google-api-python-client`, `google-auth`, `google-cloud-pubsub`, `pytest-mock` |

## Files to Reference

These files show patterns to follow:

| File | Pattern to Copy |
|------|----------------|
| `backend/tests/conftest.py` | AsyncClient fixture pattern with dependency overrides for FastAPI testing |
| `backend/tests/integration/test_equipment_approval.py` | Integration test structure: schema validation, cascade deletes, FK constraints |
| `backend/app/models/rfi.py` | RFI model schema: enums (RFIStatus, RFIPriority, RFICategory), relationships, indexes |
| `backend/app/api/v1/rfis.py` | RFI API endpoints: CRUD operations, status transitions, response creation |
| `backend/app/services/gmail_service.py` | Gmail API integration patterns for mocking (not included in read output but identified in research phase) |

## Patterns to Follow

### Test Fixture Pattern (from conftest.py)

```python
@pytest.fixture(scope="function")
async def client(db: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Fixture that provides an async HTTP client for testing FastAPI endpoints."""
    async def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()
```

**Key Points:**
- Use `AsyncClient` with `ASGITransport` for async FastAPI routes
- Override dependencies using `app.dependency_overrides`
- Always clear overrides in cleanup to prevent test pollution
- Use function scope for database fixtures to ensure test isolation

### Integration Test Structure Pattern

```python
@pytest.mark.integration
class TestRFIWorkflow:
    """Test RFI end-to-end workflow."""

    async def test_complete_rfi_lifecycle(self, client, db, admin_user, project):
        # Arrange: Set up test data
        # Act: Perform operations through API
        # Assert: Verify database state and response data
        pass
```

**Key Points:**
- Group related tests in classes with descriptive names
- Use `@pytest.mark.integration` marker
- Follow Arrange-Act-Assert pattern
- Test database state in addition to API responses

### RFI Model Enums and Status Transitions

```python
class RFIStatus(str, Enum):
    DRAFT = "draft"
    OPEN = "open"
    WAITING_RESPONSE = "waiting_response"
    ANSWERED = "answered"
    CLOSED = "closed"
    CANCELLED = "cancelled"
```

**Key Points:**
- Valid status transitions to test:
  - draft → open (when RFI is sent)
  - open → waiting_response (after sending email)
  - waiting_response → answered (when response received)
  - answered → closed (when RFI is resolved)
  - Any status → cancelled (explicit cancellation)
- Invalid transitions should raise errors
- Test uniqueness constraint on `rfi_number`

## Requirements

### Functional Requirements

1. **RFI CRUD Operations**
   - Description: Test create, read, update, delete operations through FastAPI endpoints
   - Acceptance:
     - POST `/projects/{project_id}/rfis` creates RFI with auto-generated rfi_number
     - GET `/rfis/{rfi_id}` returns complete RFI data with relationships
     - PATCH `/rfis/{rfi_id}` updates RFI fields
     - DELETE `/rfis/{rfi_id}` removes RFI and cascades to responses/logs

2. **RFI Number Uniqueness**
   - Description: Validate that RFI numbers are unique across the system
   - Acceptance:
     - Each RFI gets a unique auto-generated number (format: `RFI-{project_code}-{sequence}`)
     - Attempting to create RFI with duplicate number raises database constraint error
     - Sequential numbering within project scope

3. **Email Sending (Mocked Gmail API)**
   - Description: Test email sending workflow without real Gmail API calls
   - Acceptance:
     - POST `/rfis/{rfi_id}/send` triggers email send
     - Gmail API service is mocked using `unittest.mock.patch`
     - Mock verifies correct email payload (to, subject, body, attachments)
     - RFI status transitions to `waiting_response` after send
     - `sent_at` timestamp is recorded
     - `RFIEmailLog` entry created with event_type="sent"

4. **Webhook Processing (Mocked Pub/Sub)**
   - Description: Test Pub/Sub webhook handling for incoming emails
   - Acceptance:
     - POST `/gmail/push` endpoint processes webhook notifications
     - Pub/Sub message payload is mocked with base64-encoded email data
     - Webhook parses email and matches to existing RFI
     - Response is created and linked to RFI
     - RFI status updates to `answered`

5. **Email Parsing**
   - Description: Test email content extraction from Gmail API message format
   - Acceptance:
     - Parse email body from base64url-encoded content
     - Extract `thread_id`, `message_id`, `In-Reply-To` headers
     - Handle plain text and HTML email bodies
     - Extract attachments metadata
     - Handle malformed or missing headers gracefully

6. **RFI Matching Logic**
   - Description: Test correlation between incoming emails and existing RFIs
   - Acceptance:
     - Match by `email_thread_id` (highest priority)
     - Fallback to `subject` line matching (extract RFI number from subject)
     - Fallback to `In-Reply-To` header matching against `email_message_id`
     - Create new RFI if no match found (optional behavior)
     - Log unmatched emails in `RFIEmailLog` with event_type="unmatched"

7. **Status Transitions**
   - Description: Test RFI state machine transitions
   - Acceptance:
     - Valid transitions succeed and update status
     - Invalid transitions raise ValidationError
     - Status changes trigger timestamp updates (responded_at, closed_at)
     - Transition validations:
       - Cannot close RFI without response
       - Cannot send draft RFI (must be status="draft")
       - Cannot re-open closed RFI

8. **Notification Triggers**
   - Description: Test notification events at status boundaries
   - Acceptance:
     - Status change to `open` triggers notification to assigned_to user
     - Status change to `answered` triggers notification to created_by user
     - Status change to `closed` triggers notification to all participants
     - Notifications recorded in audit log or event system (mocked)

9. **Test Fixtures**
   - Description: Create reusable test data fixtures
   - Acceptance:
     - `rfi_instance` fixture: Creates sample RFI with all fields populated
     - `sample_emails` fixture: Provides dict of sample email payloads (plain text, HTML, with attachments)
     - `mock_gmail_service` fixture: Mocked Gmail API service with standard responses
     - `mock_pubsub_client` fixture: Mocked Pub/Sub publisher/subscriber
     - Fixtures use function scope for isolation

### Edge Cases

1. **Duplicate RFI Numbers** - Database constraint violation should raise IntegrityError with clear message
2. **Malformed Email Headers** - Parser should handle missing thread_id, In-Reply-To gracefully with fallback matching
3. **Email Without RFI Match** - Log as unmatched in RFIEmailLog, do not create orphan response
4. **Concurrent RFI Creation** - Handle race conditions in number generation with database-level uniqueness
5. **Invalid Status Transitions** - Raise HTTPException 400 with descriptive error message
6. **Empty Email Body** - Accept but log warning, create response with empty response_text
7. **Large Attachments** - Mock attachment metadata only (no file upload in integration tests)

## Implementation Notes

### DO
- Follow the AsyncClient pattern from `conftest.py` for all API tests
- Use `@pytest.mark.asyncio` for async test functions
- Mock external services (Gmail, Pub/Sub) using `unittest.mock.patch` or `pytest-mock`
- Test database state changes in addition to API responses
- Use descriptive test names: `test_<action>_<expected_outcome>`
- Group related tests into classes by feature area
- Add docstrings to test classes and complex test functions
- Use factory pattern for creating test data with variations
- Verify cascade deletes work correctly (delete RFI should delete responses and logs)

### DON'T
- Don't make real API calls to Gmail or Pub/Sub in tests
- Don't use global state or class-scoped fixtures for database data
- Don't skip `app.dependency_overrides.clear()` in fixture cleanup
- Don't test implementation details (e.g., internal service methods) - focus on behavior
- Don't hardcode UUIDs - use `uuid.uuid4()` for test data
- Don't forget to test error paths (404s, 400s, constraint violations)

## Development Environment

### Start Services

```bash
# Start database and backend
docker-compose up -d db redis
cd backend && uvicorn app.main:app --reload --port 8000

# Run tests
pytest backend/tests/integration/test_rfi_system.py -v -s

# Run with coverage
pytest backend/tests/integration/test_rfi_system.py --cov=app --cov-report=html
```

### Service URLs
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs
- Test Database: SQLite in-memory (no external URL)

### Required Environment Variables

For running the backend (tests use mocked values):
- `RFI_EMAIL_ADDRESS`: galhadida80@gmail.com (email address for RFI system)
- `GOOGLE_SERVICE_ACCOUNT_FILE`: Path to service account credentials (mocked in tests)
- `GOOGLE_PUBSUB_TOPIC`: Pub/Sub topic name for Gmail notifications (mocked in tests)
- `EMAIL_PROVIDER`: sendgrid (for production, tests mock this)
- `DATABASE_URL`: postgresql+asyncpg://localhost:5432/builder_db (tests use SQLite)

## Success Criteria

The task is complete when:

1. [ ] All 9 acceptance criteria from requirements have passing tests
2. [ ] `backend/tests/integration/test_rfi_system.py` exists with comprehensive test coverage
3. [ ] All tests pass: `pytest backend/tests/integration/test_rfi_system.py -v`
4. [ ] Test fixtures added to `conftest.py` (rfi_instance, sample_emails, mock_gmail_service, mock_pubsub)
5. [ ] Missing dependencies added to `requirements.txt`
6. [ ] No console errors or warnings during test execution
7. [ ] Existing tests still pass (no regressions)
8. [ ] Test coverage report shows >80% coverage for RFI-related code
9. [ ] Code follows existing test patterns from `test_equipment_approval.py`

## QA Acceptance Criteria

**CRITICAL**: These criteria must be verified by the QA Agent before sign-off.

### Unit Tests

| Test | File | What to Verify |
|------|------|----------------|
| `test_create_rfi_generates_unique_number` | `backend/tests/integration/test_rfi_system.py` | Multiple RFIs get sequential unique numbers |
| `test_rfi_status_transitions` | `backend/tests/integration/test_rfi_system.py` | All valid status transitions succeed, invalid ones raise errors |
| `test_send_rfi_mocks_gmail_api` | `backend/tests/integration/test_rfi_system.py` | Gmail API service is mocked and called with correct parameters |
| `test_webhook_processes_incoming_email` | `backend/tests/integration/test_rfi_system.py` | Webhook endpoint parses email and creates response |
| `test_email_matching_by_thread_id` | `backend/tests/integration/test_rfi_system.py` | Incoming emails matched to RFIs by thread_id |
| `test_rfi_cascade_delete` | `backend/tests/integration/test_rfi_system.py` | Deleting RFI removes all related responses and email logs |

### Integration Tests

| Test | Services | What to Verify |
|------|----------|----------------|
| Complete RFI Lifecycle | Backend API → Database | Create RFI (draft) → Send (open) → Receive response (answered) → Close |
| Email-to-RFI Matching | Webhook → RFI Service → Database | Webhook processes email, matches RFI, creates response, updates status |
| RFI Number Uniqueness | API → Database | Database enforces UNIQUE constraint on rfi_number column |
| Notification Triggers | API → Event System (mocked) | Status changes trigger notification events to correct users |

### End-to-End Tests

| Flow | Steps | Expected Outcome |
|------|-------|------------------|
| Create and Send RFI | 1. POST /projects/{id}/rfis 2. POST /rfis/{id}/send | RFI created with status=draft, sending changes status to waiting_response |
| Receive Response | 1. POST /gmail/push (webhook) 2. GET /rfis/{id}/responses | Response parsed, linked to RFI, status updated to answered |
| Email Matching Fallback | 1. Webhook with no thread_id 2. Subject contains RFI number | System matches by subject line, creates response |

### Database Verification

| Check | Query/Command | Expected |
|-------|---------------|----------|
| RFI Number Uniqueness | `SELECT rfi_number, COUNT(*) FROM rfis GROUP BY rfi_number HAVING COUNT(*) > 1` | No rows (all unique) |
| Cascade Delete Works | Delete RFI → Query responses and logs | Related records deleted (CASCADE) |
| Status Enum Values | `SELECT DISTINCT status FROM rfis` | Only valid RFIStatus enum values |
| Email Thread Indexing | Check index on email_thread_id | Index exists for performance |

### QA Sign-off Requirements
- [ ] All unit tests pass (`pytest backend/tests/integration/test_rfi_system.py::test_*`)
- [ ] All integration test scenarios pass
- [ ] Gmail API and Pub/Sub are properly mocked (no real API calls)
- [ ] Database fixtures properly isolated (no test pollution between runs)
- [ ] Test coverage ≥80% for app/services/rfi_service.py and app/api/v1/rfis.py
- [ ] No regressions in existing test suite (`pytest backend/tests/`)
- [ ] Code follows existing patterns from conftest.py and test_equipment_approval.py
- [ ] No hardcoded credentials or sensitive data in test code
- [ ] All dependencies added to requirements.txt
- [ ] Test execution time reasonable (<30 seconds for integration test file)
