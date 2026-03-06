# Codebase Concerns

**Analysis Date:** 2026-03-06

## Tech Debt

**Massive File Sizes Violating 300-Line Limit:**
- Issue: Project convention mandates files under 300 lines, but dozens of files far exceed this
- Files:
  - `backend/app/services/email_renderer.py` (1269 lines)
  - `backend/app/api/v1/checklists.py` (936 lines)
  - `backend/app/services/chat_tools.py` (930 lines)
  - `backend/app/api/v1/auth.py` (886 lines)
  - `backend/app/services/schedule_risk_service.py` (869 lines)
  - `backend/app/services/chat_service.py` (854 lines)
  - `backend/app/api/v1/meetings.py` (806 lines)
  - `backend/app/services/quantity_extraction_service.py` (768 lines)
  - `backend/app/services/export_service.py` (752 lines)
  - `backend/app/services/risk_prediction_service.py` (702 lines)
  - `frontend/src/pages/MeetingsPage.tsx` (1661 lines)
  - `frontend/src/types/index.ts` (1123 lines)
  - `frontend/src/pages/RFIPage.tsx` (771 lines)
  - `frontend/src/pages/InspectionsPage.tsx` (771 lines)
  - `frontend/src/pages/ProjectDetailPage.tsx` (770 lines)
  - `frontend/src/pages/AuditLogPage.tsx` (762 lines)
  - `frontend/src/pages/ProfilePage.tsx` (727 lines)
  - `frontend/src/components/bim/BimImportWizard.tsx` (714 lines)
  - `frontend/src/theme/theme.ts` (698 lines)
  - `frontend/src/pages/LoginPage.tsx` (677 lines)
- Impact: Hard to maintain, violates project coding standard, increases merge conflict risk
- Fix approach: Split into sub-modules. For API endpoints, extract service logic. For frontend pages, extract sub-components. For `types/index.ts`, split into domain-specific type files.

**34 Stale Verification/Test Scripts in Backend Root:**
- Issue: One-off verification scripts, markdown reports, and shell scripts accumulated in `backend/` root
- Files: `backend/verify_*.py`, `backend/test_*.py`, `backend/*.md` (34 files total, ~170KB)
- Impact: Clutters project root, confuses new developers about what's canonical
- Fix approach: Delete all verification scripts and markdown reports from `backend/` root. Any reusable tests belong in `backend/tests/`.

**Stale Frontend Directories Outside `src/`:**
- Issue: `frontend/components/`, `frontend/pages/`, `frontend/messages/` directories exist alongside `frontend/src/` which is the actual source
- Files: `frontend/components/` (3 components), `frontend/pages/` (empty), `frontend/messages/` (includes `es.json` for removed Spanish locale)
- Impact: Confusing directory structure; developers may edit wrong files
- Fix approach: Move any needed components into `frontend/src/components/`, delete the rest. Delete `frontend/messages/` (Spanish removed).

**Duplicate Router Registrations:**
- Issue: Several routers are registered twice in the API router, which creates duplicate endpoint routes
- Files: `backend/app/api/v1/router.py` (lines 92+180 acc_sync, 108+177 batch_uploads, 156+176 qr_codes, 166+175 vendors)
- Impact: Duplicate routes in OpenAPI docs, potential confusion, possible double execution of middleware
- Fix approach: Remove the duplicate `include_router` calls at lines 175-181.

**No Token Revocation/Logout:**
- Issue: JWT tokens have 7-day expiry but no blacklist or revocation mechanism exists
- Files: `backend/app/core/security.py` (ACCESS_TOKEN_EXPIRE_DAYS = 7)
- Impact: Stolen tokens remain valid for 7 days. No way to force-logout compromised accounts.
- Fix approach: Implement a Redis-based token blacklist checked in `get_current_user`, or switch to shorter-lived tokens with refresh token rotation.

**No Database Connection Pool Configuration:**
- Issue: SQLAlchemy async engine uses default pool settings (pool_size=5, max_overflow=10)
- Files: `backend/app/db/session.py`
- Impact: Under load, connection pool exhaustion will cause 500 errors. Cloud Run can scale to multiple instances, each with default pools.
- Fix approach: Add explicit pool configuration: `pool_size`, `max_overflow`, `pool_recycle`, `pool_pre_ping=True`.

**Most API Endpoints Lack Pagination:**
- Issue: Many list endpoints return all records without skip/limit/offset parameters
- Files: `backend/app/api/v1/areas.py`, `backend/app/api/v1/budget.py`, `backend/app/api/v1/discussions.py`, `backend/app/api/v1/contacts.py`, `backend/app/api/v1/near_misses.py`, and 15+ more
- Impact: As data grows, these endpoints will return unbounded result sets causing slow responses and memory pressure
- Fix approach: Add standard `skip: int = 0, limit: int = 50` query parameters to all list endpoints.

## Known Bugs

**Duplicate Router Mounts Cause Double OpenAPI Entries:**
- Symptoms: OpenAPI docs show duplicate endpoint entries for vendors, qr_codes, batch_uploads, acc_sync
- Files: `backend/app/api/v1/router.py` (lines 166+175 vendors, 156+176 qr_codes, 108+177 batch_uploads, 92+180 acc_sync)
- Trigger: Visit `/api/v1/docs`
- Workaround: None (cosmetic issue, both routes work)

**ToolboxTalksPage Has TODO Placeholder:**
- Symptoms: Form modal for toolbox talks is not implemented
- Files: `frontend/src/pages/ToolboxTalksPage.tsx` (line 191)
- Trigger: Attempting to create a new toolbox talk
- Workaround: None

**ACCSyncDashboard Uses Hardcoded Mock Data:**
- Symptoms: ACC sync dashboard shows fake data instead of real sync status
- Files: `frontend/src/components/ACCSyncDashboard.tsx` (lines 39, 62)
- Trigger: Opening the ACC sync dashboard
- Workaround: None (feature incomplete)

## Security Considerations

**Hardcoded Sentry DSN:**
- Risk: Sentry DSN is hardcoded in source code, visible to anyone with repo access
- Files: `backend/app/main.py` (line 39)
- Current mitigation: DSN is a public key (not a secret), but best practice is to configure via env var
- Recommendations: Move to `settings.sentry_dsn` env var, default to empty string (disabled)

**JWT Tokens in localStorage (XSS Risk):**
- Risk: Auth tokens stored in `localStorage` are accessible to any XSS attack
- Files: `frontend/src/api/client.ts` (line 14), `frontend/src/contexts/AuthContext.tsx` (line 27)
- Current mitigation: CSP headers in `backend/app/main.py`, but CSP allows `unsafe-inline` and `unsafe-eval` for Forge viewer
- Recommendations: Consider httpOnly cookies for token storage, or ensure CSP is tightened when Forge viewer is not needed

**Weak Default Secrets in Config:**
- Risk: Default `secret_key` and `scheduler_secret` are weak development values that could leak to production
- Files: `backend/app/config.py` (lines 21, 84, 103)
- Current mitigation: Pydantic validator warns in production but does not raise
- Recommendations: Raise an exception (not just warn) when default secrets are used in production environment

**CSP Allows unsafe-inline and unsafe-eval:**
- Risk: Content Security Policy is weakened to support Autodesk Forge viewer
- Files: `backend/app/main.py` (lines 109-111)
- Current mitigation: Comment documents why it's needed
- Recommendations: Apply strict CSP on non-BIM routes; only relax for `/bim/*` pages

**CORS Allows Wildcard:**
- Risk: If `CORS_ORIGINS` env var is set to `"*"`, all origins are allowed with credentials
- Files: `backend/app/main.py` (line 152)
- Current mitigation: Default value lists specific localhost origins
- Recommendations: Remove the `"*"` wildcard path entirely; always require explicit origins

## Performance Bottlenecks

**Seed Data Runs on Every Startup:**
- Problem: 6 seed functions execute on every application boot (lifespan hook)
- Files: `backend/app/main.py` (lines 53-59)
- Cause: Seeds check for existing data each time, but still open DB sessions and run queries
- Improvement path: Use a migration or a one-time seed flag; skip seed queries entirely in production after initial setup

**Broad `except Exception` Swallowing:**
- Problem: 40+ instances of `except Exception` catch-all across backend services, many silently swallow errors
- Files: `backend/app/services/acc_polling_service.py`, `backend/app/services/payplus_service.py`, `backend/app/services/gmail_service.py`, `backend/app/services/rfi_service.py`, and 20+ more
- Cause: Defensive coding without specific exception types
- Improvement path: Catch specific exceptions (e.g., `httpx.HTTPError`, `sqlalchemy.exc.IntegrityError`). Log and re-raise where appropriate.

**Frontend types/index.ts is a Single 1123-Line File:**
- Problem: All TypeScript interfaces are in one file, causing large bundle parse and IDE slowness
- Files: `frontend/src/types/index.ts`
- Cause: Incremental additions without refactoring
- Improvement path: Split into domain-specific type files: `types/equipment.ts`, `types/meetings.ts`, etc.

## Fragile Areas

**Router Registration in router.py:**
- Files: `backend/app/api/v1/router.py`
- Why fragile: 87 `include_router` calls with duplicates already present. Adding new routers risks more duplication.
- Safe modification: Always search for existing registrations before adding. Remove the 4 duplicate entries.
- Test coverage: No tests verify router registration uniqueness.

**Email Renderer (1269 lines):**
- Files: `backend/app/services/email_renderer.py`
- Why fragile: Single file generates HTML for all email types with inline CSS. Any template change risks breaking other emails.
- Safe modification: Extract each email type into its own renderer function/file.
- Test coverage: No email rendering tests found.

**Auth Endpoint (886 lines):**
- Files: `backend/app/api/v1/auth.py`
- Why fragile: Handles login, registration, 2FA, WebAuthn, Google OAuth, password reset, profile updates, avatar upload all in one file.
- Safe modification: Split into sub-routers: `auth_login.py`, `auth_register.py`, `auth_2fa.py`, `auth_webauthn.py`, `auth_google.py`.
- Test coverage: Rate limiting is applied but no integration tests for auth flows.

## Scaling Limits

**Monolithic API Router (87 Endpoints):**
- Current capacity: 87 registered routers, all loaded at startup
- Limit: FastAPI handles this fine, but developer cognitive load is high
- Scaling path: Group related routers into sub-packages (e.g., `api/v1/safety/`, `api/v1/subcontractor/`)

**Local File Storage Default:**
- Current capacity: Works for development, but Cloud Run instances are ephemeral
- Limit: Files uploaded to local storage are lost on container restart
- Scaling path: Production uses GCS (`storage_type=gcs`), but the fallback is dangerous if misconfigured

## Dependencies at Risk

**floorplan_env Virtual Environment in Repo (1.5GB):**
- Risk: A 1.5GB Python virtual environment exists at `backend/floorplan_env/` and is NOT in `.gitignore`
- Impact: Not currently tracked by git (no files listed by `git ls-files`), but could accidentally be committed. Bloats the working directory.
- Migration plan: Add `backend/floorplan_env/` to `.gitignore` and remove the directory from the repo.

**Large Number of Migrations (83):**
- Risk: 83 Alembic migrations make fresh database setup slow and migration conflicts more likely
- Impact: New developers must run all 83 migrations; any schema conflict requires careful resolution
- Migration plan: Consider squashing old migrations into a single baseline migration periodically.

## Test Coverage Gaps

**Minimal Frontend Tests (22 test files for 338 components/pages):**
- What's not tested: 82 page files, 256 component files, but only 22 test files exist
- Files: `frontend/src/__tests__/` (2 files), scattered `.test.tsx` files (20 files)
- Risk: UI regressions go unnoticed; no integration tests for critical flows (auth, project creation, approvals)
- Priority: High

**No API Integration Tests for Core Flows:**
- What's not tested: Backend tests focus on models/schemas but lack HTTP-level integration tests for most endpoints
- Files: `backend/tests/api/` (3 test files for 87 routers)
- Risk: Endpoint regressions, schema mismatches, and permission bypass go undetected
- Priority: High

**No Email Rendering Tests:**
- What's not tested: `email_renderer.py` (1269 lines) generates HTML for all email types
- Files: `backend/app/services/email_renderer.py`
- Risk: Email template changes can break formatting, links, or i18n without detection
- Priority: Medium

**No Tests for RBAC/Permission System:**
- What's not tested: Permission checks, role-based access, permission overrides
- Files: `backend/app/core/permissions.py`, `backend/app/services/rbac_service.py`
- Risk: Permission bypass vulnerabilities could be introduced without detection
- Priority: High

**111 console.log/warn/error Calls in Production Frontend:**
- What's not tested: Console logging is used as debugging, not structured logging
- Files: 43 frontend files with `console.log/error/warn` calls (111 total)
- Risk: Leaks internal state to browser console; not a substitute for error tracking
- Priority: Low - cosmetic, but indicates missing error boundary coverage

---

*Concerns audit: 2026-03-06*
