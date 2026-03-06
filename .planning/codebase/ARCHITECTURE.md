# Architecture

**Analysis Date:** 2026-03-06

## Pattern Overview

**Overall:** Layered monolith with separate frontend SPA and backend API server

**Key Characteristics:**
- Backend follows a 4-layer architecture: Router (API) -> Service -> Model -> Database
- Frontend follows a page-based SPA pattern with context-driven state management
- Communication via REST API with JSON (camelCase responses, snake_case DB columns)
- Real-time updates via WebSocket (`backend/app/services/websocket_manager.py`)
- MCP server mounted at `/mcp` for AI tool integration (`backend/app/services/mcp_server.py`)

## Layers

**API Layer (Routers):**
- Purpose: HTTP request handling, input validation, response serialization
- Location: `backend/app/api/v1/` (87 endpoint modules)
- Contains: FastAPI router definitions with route handlers
- Depends on: Services, Schemas, Models, Core (security/permissions)
- Used by: Frontend API client, external integrations
- Pattern: Each module defines a `router = APIRouter()` and exports it; `backend/app/api/v1/router.py` aggregates all routers under `/api/v1`

**Service Layer:**
- Purpose: Business logic, orchestration, external API calls
- Location: `backend/app/services/` (79 files)
- Contains: Async functions that operate on models, send emails, call external APIs
- Depends on: Models, Config, external SDKs
- Used by: API layer routers
- Key services: `chat_service.py` (AI chat), `email_service.py`/`gmail_service.py`/`sendgrid_service.py` (email), `storage_service.py` (file storage), `notification_service.py`, `rbac_service.py`, `stripe_service.py`, `aps_service.py` (Autodesk)

**Model Layer:**
- Purpose: Database table definitions (ORM)
- Location: `backend/app/models/` (69 files, excluding __init__ and __pycache__)
- Contains: SQLAlchemy 2.0 declarative models with snake_case columns
- Depends on: `backend/app/db/session.py` (Base class)
- Used by: Services, API layer (for direct queries in some routers)

**Schema Layer:**
- Purpose: Request/response validation and serialization
- Location: `backend/app/schemas/` (72 files)
- Contains: Pydantic BaseModel (requests) and CamelCaseModel (responses)
- Depends on: `backend/app/core/validators.py` (CamelCaseModel base, field validators)
- Used by: API layer for `response_model` and request body typing
- Critical pattern: Response schemas extend `CamelCaseModel` which auto-converts snake_case to camelCase

**Core Layer:**
- Purpose: Cross-cutting concerns (auth, permissions, validation)
- Location: `backend/app/core/`
- Contains:
  - `security.py`: JWT token creation/verification, password hashing, `get_current_user` dependency
  - `permissions.py`: RBAC with `Permission` enum, `require_permission()` dependency factory, `check_permission()` async helper
  - `validators.py`: `CamelCaseModel` base class, input sanitization, field type aliases
  - `validation.py`, `logging.py`, `webauthn_challenges.py`

**Frontend Presentation Layer:**
- Purpose: User interface rendering
- Location: `frontend/src/pages/` (74 page components), `frontend/src/components/` (40+ subdirectories)
- Contains: React components using MUI v5
- Depends on: Contexts, Hooks, API modules, Types
- Pattern: Pages are top-level route components; feature components live in `components/{feature}/`

**Frontend State Layer:**
- Purpose: Application state management via React Context
- Location: `frontend/src/contexts/` (5 context providers)
- Contains:
  - `AuthContext.tsx`: User authentication, login/logout, token management
  - `ProjectContext.tsx`: Selected project, project list
  - `ReferenceDataContext.tsx`: Shared reference data (consultant types, templates)
  - `ClientPortalContext.tsx`: Client portal session state
  - `NetworkContext.tsx`: Online/offline detection

**Frontend API Layer:**
- Purpose: HTTP communication with backend
- Location: `frontend/src/api/` (61 API modules)
- Contains: Axios-based API functions organized by domain
- Depends on: `frontend/src/api/client.ts` (shared axios instance with auth interceptor)
- Pattern: Each module exports an object with typed methods (e.g., `equipmentApi.list()`, `equipmentApi.create()`)

## Data Flow

**Typical CRUD Request:**

1. Frontend page calls API module function (e.g., `equipmentApi.create(projectId, data)`)
2. `frontend/src/api/client.ts` axios instance adds Bearer token from localStorage and Accept-Language header
3. Backend router handler in `backend/app/api/v1/equipment.py` receives request
4. `require_permission(Permission.CREATE)` dependency verifies JWT token, loads user, checks project membership and RBAC permissions
5. Router handler validates input via Pydantic schema, calls service or performs direct DB query
6. SQLAlchemy AsyncSession commits transaction (auto-commit in `get_db` dependency)
7. Response schema (CamelCaseModel) serializes snake_case model fields to camelCase JSON
8. Frontend receives camelCase JSON response

**Authentication Flow:**

1. `POST /api/v1/auth/login` with email/password (or Google OAuth credential)
2. Backend verifies credentials, returns `{accessToken, user}` (camelCase)
3. Frontend stores `authToken` in localStorage
4. All subsequent requests include `Authorization: Bearer {token}` via axios interceptor
5. 401 responses trigger `auth:logout` custom event, clearing token and redirecting to `/login`

**Real-time Updates:**

1. Frontend `useWebSocket` hook connects to `ws://.../api/v1/ws/{project_id}`
2. Backend `websocket_manager.py` broadcasts events (notifications, entity updates)
3. Frontend dispatches custom events (`ws:notification`, `ws:entity_update`)

**State Management:**

- Provider hierarchy (outer to inner): `BrowserRouter` -> `LanguageProvider` -> `ThemeProvider` -> `ToastProvider` -> `ErrorBoundary` -> `AuthProvider` -> `ProjectProvider` -> `ReferenceDataProvider` -> `Layout` -> Page
- No Redux or external state library; all state via React Context + useState/useCallback
- Selected project persisted in localStorage (`selectedProjectId`)

## Key Abstractions

**CamelCaseModel:**
- Purpose: Auto-converts snake_case Python fields to camelCase JSON responses
- Defined in: `backend/app/core/validators.py` (line 124-129)
- Pattern: All response schemas extend this; request schemas use plain `BaseModel`
- Uses Pydantic's `alias_generator=to_camel` with `populate_by_name=True`

**Permission System (RBAC):**
- Purpose: Role-based access control with per-member overrides
- Defined in: `backend/app/core/permissions.py`
- Pattern: `require_permission(Permission.XXX)` returns a `Depends()` — use directly as route parameter, never wrap in another `Depends()`
- Roles: project_admin (all), supervisor, consultant, contractor, inspector, subcontractor
- `PermissionOverride` model allows granting/revoking individual permissions per member

**get_db Dependency:**
- Purpose: Provides async database session with auto-commit/rollback
- Defined in: `backend/app/db/session.py`
- Pattern: Yields `AsyncSession`, commits on success, rolls back on exception

**Seed System:**
- Purpose: Populates reference data on application startup
- Location: `backend/app/db/seeds/` (7 seed files)
- Triggered by: FastAPI lifespan hook in `backend/app/main.py`
- Seeds: equipment_templates, material_templates, checklist_templates, inspection_templates, consultant_types, marketplace_templates

**Frontend API Client:**
- Purpose: Centralized HTTP client with auth and language headers
- Defined in: `frontend/src/api/client.ts`
- Pattern: Creates axios instance, adds request interceptor for auth token and Accept-Language, handles 401 with forced logout

## Entry Points

**Backend Application:**
- Location: `backend/app/main.py`
- Triggers: `uvicorn app.main:app`
- Responsibilities: FastAPI app creation, middleware stack setup, router mounting, seed execution via lifespan

**Frontend Application:**
- Location: `frontend/src/main.tsx` -> `frontend/src/App.tsx`
- Triggers: Vite dev server or built SPA
- Responsibilities: Provider hierarchy setup, route definitions, lazy-loaded pages

**API Router Aggregator:**
- Location: `backend/app/api/v1/router.py`
- Triggers: Mounted by `main.py` at `/api/v1`
- Responsibilities: Aggregates 87 route modules into single `api_router`

**Health Check:**
- Location: `backend/app/main.py` line 165
- Triggers: `GET /health`
- Responsibilities: Simple health probe for Cloud Run

## Error Handling

**Strategy:** Exception-based with FastAPI exception handlers and frontend error boundaries

**Backend Patterns:**
- `HTTPException` raised in routers/services with appropriate status codes (400, 401, 403, 404, 422)
- `ResponseValidationError` caught by custom handler in `backend/app/main.py` (line 139-147), returns 500 with generic message
- `RateLimitExceeded` handled by slowapi's built-in handler
- Database sessions auto-rollback on unhandled exceptions via `get_db` dependency
- Sentry SDK captures warnings and above (`backend/app/main.py` lines 33-48)

**Frontend Patterns:**
- `ErrorBoundary` component (`frontend/src/components/common/ErrorBoundary.tsx`) wraps entire app
- Axios 401 interceptor triggers forced logout (`frontend/src/api/client.ts`)
- Individual pages handle API errors with try/catch and toast notifications

## Cross-Cutting Concerns

**Middleware Stack (order matters, outermost first):**
1. `CORSMiddleware` - Cross-origin request handling
2. `SecurityHeadersMiddleware` - X-Frame-Options, CSP, HSTS headers (`backend/app/main.py` line 89)
3. `LanguageDetectionMiddleware` - Parses Accept-Language, stores in `request.state.language` (`backend/app/main.py` line 66)
4. `RequestLoggingMiddleware` - Request/response logging (`backend/app/core/logging.py`)

**Rate Limiting:**
- Config: `backend/app/middleware/rate_limiter.py`
- Uses slowapi with configurable windows for auth endpoints (5 req/5min) and general endpoints (100 req/min)

**Logging:** Python `logging` module with structured setup in `backend/app/core/logging.py`; Sentry for error tracking

**Validation:**
- Backend: Pydantic schemas with custom validators in `backend/app/core/validators.py` (sanitization, phone validation, specification validation)
- Frontend: Zod schemas in `frontend/src/schemas/validation.ts` + react-hook-form integration

**Authentication:** JWT Bearer tokens (HS256, 7-day expiry) via `backend/app/core/security.py`; optional Google OAuth and WebAuthn

**i18n:** Backend uses `backend/app/utils/localization.py`; Frontend uses react-i18next with locale files at `frontend/src/i18n/locales/{he,en}.json`

**Audit Logging:** `backend/app/services/audit_service.py` records entity changes to audit log table

---

*Architecture analysis: 2026-03-06*
