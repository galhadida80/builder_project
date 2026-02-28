# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Run Commands

### Backend (FastAPI + Python 3.11+)
```bash
cd backend
alembic upgrade head                          # Run migrations
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload  # Dev server
ruff check .                                  # Lint
pytest -v                                     # Tests
alembic revision --autogenerate -m "desc"     # New migration
```

### Frontend (Vite + React 18 + TypeScript)
```bash
cd frontend
npm install                   # Install deps
npm run dev                   # Dev server (port 5173, proxies /api → :8000)
npm run build                 # tsc + vite build
npm run type-check            # tsc --noEmit (run after every TS change)
npm run lint                  # ESLint
npm run test                  # Vitest watch mode
npm run test:run              # Single test run
```

### Docker (local full stack)
```bash
docker-compose up --build     # Postgres:5432 + Redis:6379 + backend:8000 + frontend:5173
```

## Architecture

### Backend (`backend/`)
- **Framework**: FastAPI, async SQLAlchemy 2.0+, PostgreSQL 15
- **Entry**: `app/main.py` → mounts `/api/v1` router from `app/api/v1/router.py` (50+ endpoint modules)
- **Config**: `app/config.py` (Pydantic BaseSettings, loads from env vars)
- **DB Session**: `app/db/session.py` → `get_db` dependency, AsyncSession
- **Models**: `app/models/` (46 files) — SQLAlchemy models, snake_case columns
- **Schemas**: `app/schemas/` (49 files) — Response schemas extend `CamelCaseModel` (auto snake→camelCase), request schemas use plain `BaseModel`
- **Services**: `app/services/` (42 files) — business logic layer
- **Migrations**: `alembic/versions/` — 51 migrations, latest: 051 (template_id FK)
- **Seeds**: Auto-run on startup via lifespan hook (equipment_templates, material_templates, checklist_templates, inspection_templates, consultant_types)
- **Middleware stack**: RequestLogging → LanguageDetection → SecurityHeaders → CORS

### Frontend (`frontend/`)
- **Framework**: Vite 6 SPA, React 18, TypeScript, React Router v6 (NOT Next.js)
- **Entry**: `src/main.tsx` → `src/App.tsx` (routes)
- **UI**: MUI v5 with emotion, RTL support via `@mui/stylis-plugin-rtl`
- **State**: Context providers (AuthContext, ProjectContext, ReferenceDataContext, LanguageContext, NetworkContext)
- **API Client**: Axios in `src/api/client.ts`, base URL from `VITE_API_URL`
- **Forms**: react-hook-form + Zod schemas
- **i18n**: react-i18next — locale files at `src/i18n/locales/{he,en}.json`
- **Theme**: `src/theme/` — dark/light variants, theme-aware colors only
- **Path alias**: `@/` → `src/`
- **Tests**: Vitest + @testing-library/react, E2E with Playwright (`e2e/` folder)

### Deployment
- **CI**: GitHub Actions (`.github/workflows/ci.yml`) — ruff + pytest (backend), eslint + tsc + vitest + build (frontend)
- **CD**: GitHub Actions (`.github/workflows/cd.yml`) — GCP Cloud Run, me-west1 region, Artifact Registry
- **Services**: `builderops-backend` (2 CPU, 4GB), `builderops-frontend` (1 CPU, 256MB)

## Critical Patterns

### API Endpoint Convention
- Nested: `GET/POST /projects/{project_id}/equipment` (most resources)
- Flat GET exceptions: equipment, materials, meetings, approvals accept `?project_id=` query param
- POST always nested: `POST /projects/{project_id}/RESOURCE`

### CamelCase Response Mismatch
Response schemas extend `CamelCaseModel` → all snake_case fields auto-convert to camelCase in JSON:
- `equipment_type` → `equipmentType`, `floor_number` → `floorNumber`
- Frontend interfaces MUST use camelCase to match API responses
- POST/create request schemas use regular `BaseModel` → accept snake_case input

### Schema Field Names (Common Gotchas)
- **Contact**: `contact_name` (not `name`), `contact_type` (required), `company_name`, `role_description`
- **Inspection**: requires `consultant_type_id` (UUID FK), `scheduled_date` (datetime) — no `title` field
- **Area**: `floor_number` (int), `area_code`, `total_units` — no `description` field
- **RFI**: `question` (not `description`), `to_email` (required EmailStr)
- **Meeting**: `description` (not `agenda`), `scheduled_date` (ISO datetime)

### RBAC
- 5 roles: project_admin, project_member, consultant, inspector, viewer
- Use `require_permission(Permission.XXX)` as a dependency — do NOT wrap in extra `Depends()`
- `check_permission()` for async manual checks (no project_id in path)
- `User.is_super_admin` bypasses all checks

### Auth Flow
- `POST /auth/login` → `{accessToken, user}` (camelCase response)
- Token stored in localStorage as `authToken`
- `GET /auth/me` validates current token
- Frontend: `AuthProvider` → `useAuth()`, `usePermissions()`, `PermissionGate`

## Working Conventions

### Auto-Claude Task Review (MANDATORY - On Session Start)
At the start of every session, check `.auto-claude/specs/` for task statuses:
1. Scan all spec folders — check `status` field in BOTH `task_metadata.json` AND `implementation_plan.json`
2. `human_review`: Review the branch diff, merge into main if the code is correct
3. `error`: Investigate what failed, fix the issue, and complete the task
4. `ai_review`: Review the implementation, approve or request fixes
5. `in_progress` / `queue`: Do not touch — another agent is handling these
6. Report the status summary to the user
7. After merging/completing a task, update status to `done` in ALL JSON files in the spec folder

### Auto-Claude Merge Protocol (MANDATORY - Before Every Merge)
Before merging or cherry-picking any auto-claude branch:
1. **Duplicate check**: Many auto-claude branches fix the same underlying issue (e.g., multiple branches for "notification email failure" all touch `gmail_service.py`). Group branches by the files they modify and identify overlaps
2. **Pick the best**: When multiple branches fix the same file/issue, pick the most comprehensive and clean implementation. Mark the rest as `done` (covered by the chosen fix)
3. **Conflict check**: If a branch reverts changes already merged from another branch, skip it — it's stale
4. **0-commit branches**: Branches with 0 unique commits vs main have no actual work — mark as `done` immediately
5. **Cherry-pick over merge**: Always cherry-pick specific commits rather than merging entire branches, since branches share a common divergence point with accumulated unrelated changes
6. **Verify after cherry-pick**: Run `git diff --cached --stat` to confirm only the expected files are staged

### File Size Limit
Every file must be under 300 lines. If a solution risks exceeding this, refactor or split the logic into separate files.

### Epic-Driven Development (MANDATORY)
Before starting ANY task:
1. Read `docs/LINEAR_EPICS_STORIES.md` to identify relevant epic(s) and stories
2. Read the relevant epic folder(s) under `docs/epics/epic-{N}-{name}/` for detailed specs and context
3. Use the epic requirements to guide implementation decisions

After completing ANY task:
1. Update `docs/LINEAR_EPICS_STORIES.md` to reflect progress — mark stories as completed, update status, add notes
2. If a new epic folder is needed, create it under `docs/epics/`
3. Keep the documentation in sync with the actual codebase state

### Mobile-First & RTL Layout
- ALL UI/UX must be designed and built mobile-first. Always start with the mobile layout, then scale up to desktop.
- This is an RTL (right-to-left) application — Hebrew is the primary language. When positioning UI elements (tooltips, buttons, icons), always consider RTL ordering. Elements that appear "after" in LTR should appear "before" in RTL.

### i18n
- Write Hebrew translations (`he.json`) FIRST, then English (`en.json`)
- Only EN and HE supported (Spanish removed)
- All user-facing strings must use `t('key.path')` — no hardcoded text

### Styling & Design
- Use theme-aware values (`theme.palette.*`), never hardcoded colors
- Match existing MUI design system — no oversized fonts, no emoji icons
- For any UI/UX work, use the Stitch MCP to create new designs before implementing
- Keep the design folder organized: update existing designs in place, move outdated ones to an archive subfolder, never leave stale designs in the root design directory

### Approach Constraints
- Before every task, check if there is a skill (`/skill`) or MCP tool that can help — use them first
- Always search for the best approach and design pattern to solve the problem. If unsure, search the web for current best practices. If a skill or plugin would help, download and use it
- Never run Docker commands in this environment
- When a first approach fails, pivot quickly — do NOT try 5+ variations of the same blocked approach
- Prefer targeted, minimal fixes over broad exploratory changes
- Do NOT make changes the user didn't ask for

### Deployment & Git
- Never include `node_modules` in deployments
- Do not excessively poll build/deploy status — max 5 polls
- Always run `tsc --noEmit` after TypeScript changes
- For every big change, test locally with Docker first (`docker-compose up --build`). If Docker is not available, push to GitHub and verify via CI/CD
- After every `git push`, verify CI/CD passes (`gh run list --limit 1`). If it fails, diagnose and fix before moving on
- After every `git push`, check for open GitHub issues (`gh issue list --state open`). If any exist, review and address them

### GCP Expertise
- This project runs entirely on Google Cloud Platform — you must operate as a GCP expert
- Services: Cloud Run (me-west1), Artifact Registry, Cloud SQL (PostgreSQL), Cloud Storage, Cloud Scheduler, Document AI, Pub/Sub
- Project ID: `builderops-poc-il`
- Use `gcloud` CLI for all GCP operations (logging, deployments, service management, IAM)
- Cloud Scheduler: use `europe-west1` (me-west1 not available for Scheduler)

### Environment Notes
- Python via Homebrew (python3.13) — pip requires `--break-system-packages`
- Local Postgres uses trust auth (no user:password in connection string)
- `useParams()` returns nullable — use `useParams()!` with non-null assertion
