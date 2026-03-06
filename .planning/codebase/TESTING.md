# Testing Patterns

**Analysis Date:** 2026-03-06

## Test Frameworks

### Backend
**Runner:**
- pytest 9.0.2 with pytest-asyncio 1.3.0
- Config: `backend/pytest.ini`
- `asyncio_mode = auto` (all async tests run automatically)

**HTTP Client:**
- httpx 0.28.1 with `ASGITransport` for in-process testing

**DB for Tests:**
- SQLite in-memory via aiosqlite 0.22.1 (NOT Postgres)
- Custom type compilers for JSONB and UUID to work with SQLite

**Run Commands:**
```bash
cd backend
pytest -v                    # Run all tests
pytest tests/api/ -v         # Run API tests only
pytest tests/schemas/ -v     # Run schema tests only
pytest -k "test_create"      # Run tests matching pattern
```

### Frontend (Unit)
**Runner:**
- Vitest 1.1.0 with jsdom environment
- Config: `frontend/vitest.config.ts`
- `globals: true` (describe/it/expect available without imports)
- Setup file: `frontend/src/test/setup.ts`

**Assertion Library:**
- Vitest built-in `expect` + `@testing-library/jest-dom` matchers

**Run Commands:**
```bash
cd frontend
npm run test                 # Watch mode
npm run test:run             # Single run
npm run test:ui              # Vitest UI
```

### Frontend (E2E)
**Runner:**
- Playwright 1.58.0
- Config: `frontend/playwright.config.ts`
- Browser: Chromium only
- Timeout: 30s per test, 5s for assertions

**Run Commands:**
```bash
cd frontend
npx playwright test                           # Run all E2E
npx playwright test hebrew-localization.spec.ts  # Run specific
```

## Test File Organization

### Backend
**Location:** Separate `backend/tests/` directory, organized by layer

**Structure:**
```
backend/tests/
  conftest.py              # Shared fixtures (db, clients, users, projects)
  __init__.py
  api/                     # API endpoint tests (CRUD, auth, webhooks)
    test_areas_crud.py
    test_rfis_crud.py
    test_equipment_submissions.py
    test_auth.py
    test_security_headers.py
  schemas/                 # Pydantic schema validation tests
    test_validation.py
    test_inspection.py
    test_all_schemas.py
  models/                  # SQLAlchemy model tests
    test_inspection.py
    test_checklist.py
    test_all_models.py
  services/                # Service layer tests
    test_rbac_service.py
    test_storage.py
    test_notification_service.py
  integration/             # Integration/workflow tests
    test_subscription_flow.py
    test_equipment_template_workflow.py
    test_whatsapp_webhook.py
  core/                    # Core utility tests
    test_security.py
    test_localization.py
    test_validation_path.py
  manual/                  # Manual validation scripts (not auto-run)
```

**Naming:** `test_*.py` files, `Test*` classes, `test_*` methods

### Frontend (Unit)
**Location:** Co-located next to source files

**Pattern:** `ComponentName.test.tsx` or `hookName.test.ts`

**Examples:**
- `src/components/ui/DataTable.test.tsx` (alongside `DataTable.tsx`)
- `src/hooks/useDocuments.test.ts` (alongside `useDocuments.ts`)
- `src/pages/DashboardPage.test.tsx` (alongside `DashboardPage.tsx`)
- `src/__tests__/security.test.ts` (shared tests in `__tests__/` dir)
- `src/utils/workloadCalculation.test.ts` (alongside source)

### Frontend (E2E)
**Location:** `frontend/e2e/` directory

**Naming:** `feature-name.spec.ts`

**Examples:**
- `e2e/hebrew-localization.spec.ts`
- `e2e/rtl-verification.spec.ts`
- `e2e/subscription-flow.spec.ts`
- `e2e/time-tracking-clock-flow.spec.ts`

## Test Counts

- Backend tests: ~72 test files across all directories
- Frontend unit tests: ~20 test files
- Frontend E2E tests: ~20 spec files

## Backend Test Structure

**Suite Organization:**
```python
class TestCreateArea:

    @pytest.mark.asyncio
    async def test_create_area_success(self, admin_client: AsyncClient, project: Project):
        payload = valid_area_payload()
        resp = await admin_client.post(areas_url(str(project.id)), json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["name"] == "Building A - Floor 1"
        assert "id" in data

    @pytest.mark.asyncio
    async def test_create_returns_camel_case_fields(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.post(areas_url(str(project.id)), json=valid_area_payload())
        data = resp.json()
        assert "projectId" in data
        assert "areaType" in data
```

**Patterns:**
- Group related tests in classes (`TestCreateArea`, `TestUpdateArea`, `TestDeleteArea`)
- Use `@pytest.mark.asyncio` on every async test method
- URL builder helper functions at module top (`def areas_url(project_id)`)
- Valid payload factory functions (`def valid_area_payload(**overrides)`)
- Helper functions for creating entities via API or DB

**Parametrized Schema Tests:**
```python
class TestEquipmentCreateValid:
    @pytest.mark.parametrize("data", [
        {"name": "Basic Equipment"},
        {"name": MIN_VALID_NAME},
        {"name": MAX_VALID_NAME},
    ], ids=["minimal", "min_length_name", "max_length_name"])
    def test_valid_creation(self, data):
        eq = EquipmentCreate(**data)
        assert eq.name == data["name"].strip()
```

## Frontend Unit Test Structure

**Component Test Pattern:**
```typescript
import { describe, it, expect, vi } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../test/test-utils'
import { DataTable, Column } from './DataTable'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' },
  }),
}))

describe('DataTable', () => {
  describe('sort asc/desc on click', () => {
    it('sorts rows ascending on first column header click', () => {
      renderWithProviders(
        <DataTable columns={columns} rows={rows} getRowId={getRowId} pagination={false} />,
      )
      clickSortButton('Name')
      expect(getCellTexts()).toEqual(['Alice', 'Bob', 'Charlie'])
    })
  })
})
```

**Hook Test Pattern:**
```typescript
import { renderHook, act } from '@testing-library/react'
import { useDocuments } from './useDocuments'

describe('useDocuments', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('creates new folder', () => {
    const { result } = renderHook(() => useDocuments('project1'))
    act(() => {
      result.current.createFolder('New Folder', 'root')
    })
    expect(result.current.folders[0].children).toHaveLength(1)
  })
})
```

## Mocking

### Backend
**Framework:** pytest-mock (via `mocker` fixture from conftest)

**Patterns:**
```python
@pytest.fixture(scope="function")
def mock_gmail_service(mocker):
    mock_service = mocker.MagicMock()
    mock_send = mocker.MagicMock()
    mock_send.execute.return_value = {"id": "sent-msg-123", "threadId": "thread-new-123"}
    mock_messages = mocker.MagicMock()
    mock_messages.send.return_value = mock_send
    mock_users = mocker.MagicMock()
    mock_users.messages.return_value = mock_messages
    mock_service.users.return_value = mock_users
    return mock_service
```

**FastAPI Dependency Overrides:**
```python
app.dependency_overrides[get_db] = override_get_db
app.dependency_overrides[get_current_user] = override_get_current_user
```

**Settings Override in conftest:**
```python
get_settings().email_provider = "fake"
get_settings().google_pubsub_verify = False
get_settings().rate_limit_enabled = False
```

### Frontend
**Framework:** Vitest `vi.mock()`

**Common Mocks:**
```typescript
// i18n (mock in almost every test)
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' },
  }),
}))

// Router
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}))

// Context providers
vi.mock('../contexts/ProjectContext', () => ({
  useProject: () => ({ selectedProjectId: 'test-project-id' }),
}))

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1', fullName: 'Test User' }, loading: false }),
}))

// API modules
vi.mock('../api/equipment', () => ({ equipmentApi: { list: vi.fn() } }))

// Complex MUI components
vi.mock('@mui/x-charts/BarChart', () => ({
  BarChart: () => <div data-testid="bar-chart" />,
}))
```

**What to Mock:**
- `react-i18next` (always mock `useTranslation`)
- `react-router-dom` (mock `useNavigate`, `useParams`)
- Context providers (`AuthContext`, `ProjectContext`)
- API modules for component tests
- Complex third-party components (charts, maps)

**What NOT to Mock:**
- The component under test
- Simple UI components (Card, Button)
- Utility functions being tested

## Fixtures and Factories

### Backend (`backend/tests/conftest.py`)

**Core Fixtures:**
```python
@pytest.fixture(scope="function")
async def db() -> AsyncGenerator[AsyncSession, None]:
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    async with TestAsyncSessionLocal() as session:
        yield session
        await session.rollback()
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

@pytest.fixture(scope="function")
async def client(db: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    async def override_get_db():
        yield db
    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()
```

**Available Fixtures:**
- `db` - Fresh SQLite in-memory session per test
- `client` - Unauthenticated HTTP client
- `admin_client` - Authenticated as admin user
- `user_client` - Authenticated as regular user
- `admin_user` - Admin User model instance
- `regular_user` - Regular User model instance
- `project` - Project with admin_user as member
- `equipment_template` - Test equipment template
- `equipment_submission` - Test equipment submission
- `async_session` / `db_session` - Aliases for `db`
- `sample_emails` - Email payloads for RFI testing
- `mock_gmail_service` - Mocked Gmail API
- `mock_pubsub` - Mocked Pub/Sub client

**Per-Test-File Factories:**
```python
async def make_template(db: AsyncSession) -> EquipmentTemplate:
    template = EquipmentTemplate(id=uuid.uuid4(), name="Test Template", ...)
    db.add(template)
    await db.flush()
    return template

def valid_area_payload(**overrides) -> dict:
    base = {"name": "Building A", "area_type": "residential", ...}
    base.update(overrides)
    return base
```

### Frontend (`frontend/src/test/test-utils.tsx`)

**Render Helper:**
```typescript
export function renderWithProviders(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return <ThemeProvider theme={theme}>{children}</ThemeProvider>
  }
  return render(ui, { wrapper: Wrapper, ...options })
}
```

**Setup (`frontend/src/test/setup.ts`):**
```typescript
import { expect, afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import * as matchers from '@testing-library/jest-dom/matchers'

expect.extend(matchers)
afterEach(() => { cleanup() })
```

## Coverage

**Requirements:** None enforced (no coverage thresholds configured)

**Backend:** No coverage configuration in pytest.ini or CI

**Frontend:** No coverage configuration in vitest.config.ts or CI

## Test Types

**Unit Tests (Backend - `tests/schemas/`, `tests/models/`, `tests/core/`):**
- Schema validation (valid/invalid inputs, boundary values, parametrized)
- Model instantiation
- Security utilities (sanitization, email validation, SQL injection detection)

**API Tests (Backend - `tests/api/`):**
- Full CRUD endpoint testing via `AsyncClient`
- Auth-protected endpoint access testing
- CamelCase response field verification
- HTTP status code assertions
- Security header checks

**Integration Tests (Backend - `tests/integration/`):**
- Multi-step workflow tests (subscription flows, equipment template workflows)
- Webhook handling tests
- Risk prediction end-to-end tests

**Unit Tests (Frontend):**
- Component rendering and interaction (DataTable sorting, pagination)
- Hook behavior (useDocuments CRUD operations)
- Utility function tests (workloadCalculation)
- Context behavior (NetworkContext)

**E2E Tests (Frontend - `frontend/e2e/`):**
- Hebrew localization and RTL verification
- Responsive navigation
- Feature workflows (subscription, time tracking, budget)
- Uses Playwright against `http://localhost:5173`

## Common Patterns

**Async Testing (Backend):**
```python
@pytest.mark.asyncio
async def test_create_area_success(self, admin_client: AsyncClient, project: Project):
    payload = valid_area_payload()
    resp = await admin_client.post(areas_url(str(project.id)), json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["name"] == "Building A - Floor 1"
```

**Error Testing (Backend):**
```python
@pytest.mark.asyncio
async def test_create_area_invalid_project(self, admin_client: AsyncClient):
    resp = await admin_client.post(areas_url(FAKE_PROJECT_ID), json=valid_area_payload())
    assert resp.status_code in (403, 404)
```

**Validation Testing (Backend):**
```python
def test_name_too_short_raises(self):
    with pytest.raises(ValidationError):
        EquipmentCreate(name="A")
```

**E2E Helper Pattern (Frontend):**
```typescript
async function checkRTLDirection(page: Page, shouldBeRTL: boolean) {
  const direction = await page.evaluate(() => document.dir)
  if (shouldBeRTL) {
    expect(direction).toBe('rtl')
  }
}

async function login(page: Page, email: string = 'user@example.com', password: string = 'password123') {
  await page.goto('/login')
  await emailInput.fill(email)
  await passwordInput.fill(password)
  await loginButton.click()
  await page.waitForURL('/dashboard', { timeout: 10000 })
}
```

## CI Integration

**CI runs (`.github/workflows/ci.yml`):**
- Backend: `ruff check backend/` + file size check (300-line limit)
- Frontend: `eslint` + `tsc --noEmit` + `vitest run` + `vite build`
- Backend tests: pytest (not explicitly run in CI snippet viewed - may need verification)
- Change detection: only runs backend/frontend jobs when respective files change

---

*Testing analysis: 2026-03-06*
