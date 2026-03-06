# Codebase Structure

**Analysis Date:** 2026-03-06

## Directory Layout

```
builder_program/
├── backend/                    # FastAPI backend application
│   ├── app/                    # Application source code
│   │   ├── api/v1/             # API route handlers (87 modules)
│   │   │   └── marketplace/    # Marketplace sub-routes (actions, templates)
│   │   ├── core/               # Auth, permissions, validation, logging
│   │   ├── db/                 # Database session and seeds
│   │   │   └── seeds/          # Startup seed data (7 seed modules)
│   │   ├── middleware/         # Rate limiter middleware
│   │   ├── models/             # SQLAlchemy ORM models (69 files)
│   │   ├── schemas/            # Pydantic request/response schemas (72 files)
│   │   ├── services/           # Business logic layer (79 files)
│   │   └── utils/              # Localization utilities
│   ├── alembic/                # Database migrations
│   │   └── versions/           # Migration files (061 migrations)
│   ├── Dockerfile              # Backend container definition
│   ├── requirements.txt        # Python dependencies
│   └── alembic.ini             # Alembic configuration
├── frontend/                   # Vite + React SPA
│   ├── src/
│   │   ├── api/                # API client modules (61 files)
│   │   ├── assets/             # Static assets (logos)
│   │   ├── components/         # React components by feature (40+ dirs)
│   │   │   ├── auth/           # Login, register, password reset
│   │   │   ├── billing/        # Billing and subscription UI
│   │   │   ├── bim/            # BIM/3D viewer components
│   │   │   ├── chat/           # AI chat drawer and messages
│   │   │   ├── common/         # Shared utilities (ErrorBoundary, LoadingPage, etc.)
│   │   │   ├── dashboard/      # Dashboard widgets and cards
│   │   │   ├── forms/          # Form-related components
│   │   │   ├── layout/         # Layout, Header, Sidebar, MobileBottomNav
│   │   │   ├── mobile/         # Mobile-specific components
│   │   │   ├── ui/             # Reusable UI primitives (26 components)
│   │   │   └── [feature]/      # Feature-specific components
│   │   ├── contexts/           # React Context providers (5 files)
│   │   ├── hooks/              # Custom React hooks (38 files)
│   │   ├── i18n/               # i18n config and locale files
│   │   │   └── locales/        # {he,en}.json translation files
│   │   ├── pages/              # Top-level page components (74 files)
│   │   ├── schemas/            # Zod validation schemas
│   │   ├── services/           # Frontend services (analytics, offline queue)
│   │   ├── styles/             # Global styles
│   │   ├── test/               # Test setup and utilities
│   │   ├── theme/              # MUI theme config (dark/light)
│   │   ├── types/              # TypeScript type definitions (15 files)
│   │   └── utils/              # Utility functions
│   ├── e2e/                    # Playwright E2E tests
│   ├── public/                 # Static public assets
│   ├── index.html              # SPA entry HTML
│   ├── vite.config.ts          # Vite configuration
│   ├── tsconfig.json           # TypeScript configuration
│   └── package.json            # Node dependencies
├── infra/                      # Infrastructure scripts
│   ├── gcp-setup.sh            # GCP provisioning script
│   ├── cloud-scheduler-permit-alerts.sh  # Cloud Scheduler setup
│   └── log_monitor.py          # Log monitoring script
├── .github/workflows/          # CI/CD pipelines
│   ├── ci.yml                  # Lint + test + build
│   ├── cd.yml                  # Deploy to Cloud Run
│   └── log-monitor.yml         # Log monitoring workflow
├── docker-compose.yml          # Local full-stack development
├── scripts/                    # Miscellaneous scripts
├── docs/                       # Project documentation and epics
├── design/                     # UI/UX design files
├── e2e/                        # Additional E2E test resources
└── CLAUDE.md                   # AI assistant instructions
```

## Directory Purposes

**`backend/app/api/v1/`:**
- Purpose: All REST API endpoint definitions
- Contains: One Python module per resource/feature (e.g., `equipment.py`, `meetings.py`, `chat.py`)
- Key files: `router.py` (aggregates all routers), `auth.py` (login/register), `admin.py` (super admin routes)
- Pattern: Each file exports `router = APIRouter()` with route handlers

**`backend/app/models/`:**
- Purpose: SQLAlchemy ORM model definitions
- Contains: One file per database table/entity
- Key files: `user.py`, `project.py`, `equipment.py`, `notification.py`, `chat.py`
- Pattern: All models inherit from `Base` (defined in `backend/app/db/session.py`)

**`backend/app/schemas/`:**
- Purpose: Pydantic schemas for API request/response validation
- Contains: Create/Update/Response schema classes per resource
- Key files: Match model names (e.g., `equipment.py` has `EquipmentCreate`, `EquipmentResponse`)
- Pattern: Response schemas extend `CamelCaseModel`; request schemas use `BaseModel`

**`backend/app/services/`:**
- Purpose: Business logic, external integrations, background processing
- Contains: Service functions organized by domain
- Key files: `chat_service.py` (AI), `notification_service.py`, `email_service.py`, `storage_service.py`, `rbac_service.py`
- Pattern: Async functions accepting `db: AsyncSession` and domain parameters

**`backend/app/core/`:**
- Purpose: Framework-level concerns shared across all features
- Key files:
  - `security.py`: `get_current_user`, `verify_project_access`, JWT functions
  - `permissions.py`: `Permission` enum, `require_permission()`, `check_permission()`
  - `validators.py`: `CamelCaseModel`, `sanitize_string()`, field type aliases
  - `logging.py`: Request logging middleware, log setup

**`frontend/src/components/ui/`:**
- Purpose: Reusable, feature-agnostic UI primitives
- Contains: 26 components (DataTable, Modal, TextField, Button, Card, StatusBadge, TemplatePicker, etc.)
- Key files: `DataTable.tsx` (sortable/filterable table), `TemplatePicker.tsx` (template selector), `SignaturePad.tsx`

**`frontend/src/components/layout/`:**
- Purpose: Application shell and navigation
- Key files: `Layout.tsx` (main shell with sidebar + header + outlet), `Sidebar.tsx`, `Header.tsx`, `MobileBottomNav.tsx`, `ProjectSelector.tsx`

**`frontend/src/components/common/`:**
- Purpose: Shared utility components (non-UI-primitive)
- Key files: `ErrorBoundary.tsx`, `LoadingPage.tsx`, `ToastProvider.tsx`, `OfflineIndicator.tsx`, `PWAInstallPrompt.tsx`

**`frontend/src/contexts/`:**
- Purpose: Global and scoped state providers
- Key files: `AuthContext.tsx` (user/login/logout), `ProjectContext.tsx` (selected project), `ReferenceDataContext.tsx` (templates/consultant types)

**`frontend/src/hooks/`:**
- Purpose: Reusable stateful logic
- Key files: `usePermissions.ts` (RBAC), `useWebSocket.ts`, `useFormShake.ts`, `useSignatureStamp.ts`, `useResponsive.ts`, `useDocuments.ts`

**`frontend/src/api/`:**
- Purpose: API communication layer (one module per backend resource)
- Key files: `client.ts` (shared axios instance), `auth.ts`, `projects.ts`, `equipment.ts`, etc.
- Pattern: Export object with typed async methods mapping to backend endpoints

**`frontend/src/types/`:**
- Purpose: TypeScript interfaces and type definitions
- Key files: `index.ts` (main types), `equipment.ts`, `notification.ts`, `permit.ts`, `safety.ts`, `billing.ts`, `subscription.ts`

## Key File Locations

**Entry Points:**
- `backend/app/main.py`: FastAPI app creation, middleware, lifespan seeds
- `frontend/src/main.tsx`: React root render with provider hierarchy
- `frontend/src/App.tsx`: Route definitions and protected route wrappers

**Configuration:**
- `backend/app/config.py`: All backend settings via Pydantic BaseSettings (env vars)
- `frontend/vite.config.ts`: Vite build config, dev server proxy
- `frontend/tsconfig.json`: TypeScript compiler config, `@/` path alias
- `docker-compose.yml`: Local development stack (Postgres, Redis, backend, frontend)
- `backend/alembic.ini`: Migration configuration

**Core Logic:**
- `backend/app/core/security.py`: Authentication (JWT, bcrypt, user resolution)
- `backend/app/core/permissions.py`: RBAC permission system
- `backend/app/core/validators.py`: CamelCaseModel, input sanitization, field aliases
- `backend/app/db/session.py`: Database engine, session factory, `get_db` dependency

**Routing:**
- `backend/app/api/v1/router.py`: All backend route registration (87 routers)
- `frontend/src/App.tsx`: All frontend route definitions

**Testing:**
- `frontend/src/__tests__/`: Frontend unit tests
- `frontend/src/test/`: Test setup utilities
- `frontend/e2e/`: Playwright E2E tests
- `backend/` root: pytest configuration

## Naming Conventions

**Files:**
- Backend Python: `snake_case.py` (e.g., `equipment_templates.py`, `chat_service.py`)
- Frontend TypeScript pages: `PascalCase.tsx` (e.g., `EquipmentPage.tsx`, `DashboardPage.tsx`)
- Frontend TypeScript components: `PascalCase.tsx` (e.g., `DataTable.tsx`, `TemplatePicker.tsx`)
- Frontend TypeScript hooks: `camelCase.ts` prefixed with `use` (e.g., `usePermissions.ts`)
- Frontend TypeScript API modules: `camelCase.ts` (e.g., `equipmentTemplates.ts`)
- Frontend TypeScript contexts: `PascalCase.tsx` suffixed with `Context` (e.g., `AuthContext.tsx`)

**Directories:**
- Backend: `snake_case` (e.g., `app/api/v1/`, `app/db/seeds/`)
- Frontend components: `camelCase` or feature name (e.g., `components/equipment/`, `components/timeTracking/`)

**Database:**
- Tables: `snake_case` plural (e.g., `equipment`, `project_members`, `audit_logs`)
- Columns: `snake_case` (e.g., `created_at`, `project_id`, `contact_name`)

**API:**
- Endpoints: kebab-case or snake_case paths (e.g., `/projects/{project_id}/equipment`, `/client-portal/login`)
- Response fields: camelCase (auto-converted from snake_case by CamelCaseModel)

## Where to Add New Code

**New Backend Feature (e.g., "work orders"):**
1. Model: `backend/app/models/work_order.py` (SQLAlchemy model)
2. Schema: `backend/app/schemas/work_order.py` (Create/Update with BaseModel, Response with CamelCaseModel)
3. Service: `backend/app/services/work_order_service.py` (business logic)
4. Router: `backend/app/api/v1/work_orders.py` (API endpoints)
5. Register router: Add import and `api_router.include_router()` in `backend/app/api/v1/router.py`
6. Migration: `cd backend && alembic revision --autogenerate -m "add work orders"`
7. Update `backend/app/models/__init__.py` if model needs to be imported for Alembic detection

**New Frontend Page:**
1. Page component: `frontend/src/pages/WorkOrdersPage.tsx`
2. Feature components: `frontend/src/components/workOrders/` (dialogs, cards, forms)
3. API module: `frontend/src/api/workOrders.ts`
4. Types: Add interfaces to `frontend/src/types/index.ts` or new `frontend/src/types/workOrder.ts`
5. Route: Add `<Route>` in `frontend/src/App.tsx` under the project detail routes
6. i18n: Add keys to `frontend/src/i18n/locales/he.json` first, then `en.json`
7. Sidebar: Add navigation item in `frontend/src/components/layout/Sidebar.tsx`

**New Shared UI Component:**
- Implementation: `frontend/src/components/ui/ComponentName.tsx`
- Export: Add to `frontend/src/components/ui/index.ts`

**New Custom Hook:**
- Implementation: `frontend/src/hooks/useHookName.ts`
- Export: Add to `frontend/src/hooks/index.ts`

**New Backend Seed Data:**
- Seed file: `backend/app/db/seeds/seed_name.py`
- Register: Add import and call in `backend/app/main.py` lifespan function

**New Migration:**
- Run: `cd backend && alembic revision --autogenerate -m "description"`
- Location: `backend/alembic/versions/` (auto-numbered, currently at 061)

**Utilities:**
- Backend shared helpers: `backend/app/utils/` or add to `backend/app/core/validators.py`
- Frontend shared helpers: `frontend/src/utils/`

## Special Directories

**`backend/alembic/versions/`:**
- Purpose: Database migration history (061 migrations)
- Generated: Yes (by `alembic revision --autogenerate`)
- Committed: Yes

**`backend/app/db/seeds/`:**
- Purpose: Reference data seeded on application startup
- Generated: No (manually maintained)
- Committed: Yes

**`frontend/src/i18n/locales/`:**
- Purpose: Translation JSON files (he.json, en.json)
- Generated: No (manually maintained)
- Committed: Yes
- Rule: Write Hebrew (he.json) first, then English (en.json)

**`uploads/`:**
- Purpose: Local file storage for development
- Generated: Yes (by file upload operations)
- Committed: No

**`infra/`:**
- Purpose: GCP infrastructure provisioning scripts
- Generated: No
- Committed: Yes

**`.github/workflows/`:**
- Purpose: CI/CD pipeline definitions
- Files: `ci.yml` (lint/test/build), `cd.yml` (deploy to Cloud Run), `log-monitor.yml`
- Committed: Yes

**`design/`:**
- Purpose: UI/UX design files and mockups
- Generated: Via Stitch MCP tool
- Committed: Yes
- Rule: Update existing designs in place, archive outdated ones

---

*Structure analysis: 2026-03-06*
