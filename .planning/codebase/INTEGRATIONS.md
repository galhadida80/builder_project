# External Integrations

**Analysis Date:** 2026-03-06

## APIs & External Services

**AI / Machine Learning:**
- Google Gemini (gemini-2.0-flash) - AI chat assistant for construction project management
  - SDK/Client: `pydantic-ai` with `GoogleGLAProvider` (`backend/app/services/chat_service.py`)
  - Auth: `GEMINI_API_KEY` env var
  - MCP server exposed at `/mcp` endpoint (`backend/app/services/mcp_server.py`)

**Autodesk Platform Services (APS):**
- Autodesk Forge Viewer - 3D BIM model viewing in browser
  - SDK/Client: httpx async client (`backend/app/services/aps_service.py`)
  - Auth: 2-legged OAuth, cached token (`APS_CLIENT_ID`, `APS_CLIENT_SECRET`)
  - Callback: `APS_CALLBACK_URL`
  - Endpoints: 9 routes under `/projects/{project_id}/bim` + `/bim/oauth/*`
- Autodesk Construction Cloud (ACC) - RFI sync with ACC platform
  - SDK/Client: httpx (`backend/app/services/acc_rfi_service.py`, `acc_rfi_sync_service.py`)
  - Polling service: `backend/app/services/acc_polling_service.py`
  - Webhook client: `backend/app/services/acc_webhook_client.py`
  - API Base: `https://developer.api.autodesk.com/construction/rfis/v2`

**Google Document AI:**
- Document extraction for quantity takeoffs from PDFs
  - SDK/Client: `google-cloud-documentai` (`backend/app/services/quantity_docai_service.py`)
  - Auth: `DOCAI_PROCESSOR_ID`, `DOCAI_LOCATION` (eu), `DOCAI_PROJECT_ID`

**Google Maps:**
- Map display in frontend
  - SDK/Client: `@react-google-maps/api` (frontend)
  - Auth: `VITE_GOOGLE_MAPS_KEY` env var (build-time)

**Payments:**
- Stripe - International payment processing
  - SDK/Client: `stripe` Python SDK (`backend/app/services/stripe_service.py`)
  - Auth: `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`
  - Features: Customer creation, subscriptions, webhook handling
- PayPlus - Israeli payment gateway
  - SDK/Client: httpx async client (`backend/app/services/payplus_service.py`)
  - Auth: `PAYPLUS_API_KEY`, `PAYPLUS_SECRET_KEY`, `PAYPLUS_WEBHOOK_SECRET`
  - API Base: `https://restapi.payplus.co.il`

**RasterScan (Self-hosted):**
- Floor plan recognition AI service
  - SDK/Client: httpx (`backend/app/services/rasterscan_service.py`)
  - Base URL: `RASTERSCAN_URL` (defaults to `http://localhost:5555`)
  - Endpoints: `/health`, `/analyze`

## Email Providers

**Gmail (Production):**
- OAuth 2.0 for sending emails via Gmail API
  - SDK/Client: `google-api-python-client` (`backend/app/services/gmail_service.py`)
  - Auth: `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`
  - Token endpoint: `https://oauth2.googleapis.com/token`
  - Features: Send with attachments, retry with backoff (3 retries)

**SendGrid (Alternative):**
- Transactional email delivery
  - SDK/Client: `sendgrid` Python SDK (`backend/app/services/sendgrid_service.py`)
  - Auth: `SENDGRID_API_KEY`
  - Config: `SENDGRID_FROM_EMAIL`, `SENDGRID_FROM_NAME`

**Fake (Development):**
- Console-only email logging for development (`backend/app/services/fake_email_service.py`)
- Selected via `EMAIL_PROVIDER=fake` (default)

**Provider Selection:**
- Configured via `EMAIL_PROVIDER` env var: `fake` | `gmail` | `sendgrid`
- Abstracted through `EmailService` (`backend/app/services/email_service.py`)

## Messaging

**Twilio WhatsApp:**
- WhatsApp notifications for RFIs, equipment approvals, meeting reminders
  - SDK/Client: `twilio` Python SDK (`backend/app/services/whatsapp_service.py`)
  - Auth: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM`
  - Webhook: `WHATSAPP_WEBHOOK_URL`
  - Supports HE/EN localized message templates

## Data Storage

**Databases:**
- PostgreSQL 15 (primary data store)
  - Connection (async): `DATABASE_URL` (postgresql+asyncpg://...)
  - Connection (sync): `DATABASE_URL_SYNC` (postgresql://... for Alembic)
  - Client: SQLAlchemy 2.0+ AsyncSession (`backend/app/db/session.py`)
  - 61 migrations in `backend/alembic/versions/`

**Caching / Task Queue:**
- Redis 7
  - Connection: `REDIS_URL` (redis://localhost:6379/0)
  - Used by: Celery task queue, rate limiting (slowapi)
  - Celery worker: `celery -A app.celery_app worker`

**File Storage:**
- Pluggable backend via `StorageBackend` ABC (`backend/app/services/storage_service.py`)
- Three implementations:
  - `LocalStorageBackend` - Local filesystem (`./uploads`), dev default
  - `GCSStorageBackend` - Google Cloud Storage (production)
    - Config: `GCS_BUCKET_NAME`, `GCS_PROJECT_ID`
  - `S3StorageBackend` - AWS S3 (optional)
    - Config: `S3_BUCKET_NAME`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`
- Selected via `STORAGE_TYPE` env var: `local` | `gcs` | `s3`

**Offline Storage (Frontend):**
- IndexedDB via `idb` library for offline-first PWA support

## Authentication & Identity

**Primary Auth (Custom JWT):**
- JWT tokens via python-jose (`backend/app/core/`)
- Password hashing via passlib + bcrypt
- Token stored as `authToken` in localStorage
- Login: `POST /api/v1/auth/login` -> `{accessToken, user}`
- Validation: `GET /api/v1/auth/me`

**Google OAuth:**
- Backend: `GOOGLE_AUTH_CLIENT_ID` env var
- Frontend: `@react-oauth/google` (`VITE_GOOGLE_CLIENT_ID`)
- User model has `google_id` column (migration 048)

**WebAuthn (Passwordless):**
- FIDO2/WebAuthn passwordless login
  - SDK/Client: `webauthn` Python library
  - Config: `WEBAUTHN_RP_ID` (localhost), `WEBAUTHN_RP_NAME` (BuilderOps)
  - Model: WebAuthn credentials table (migration 027)

**Two-Factor Authentication:**
- TOTP-based 2FA
  - SDK/Client: `pyotp` library
  - User model has 2FA columns (migration 046)

**Firebase:**
- Firebase Admin SDK configured (`FIREBASE_CREDENTIALS_PATH`)
- Frontend: `firebase` client SDK
- Usage: Likely push notifications (not primary auth)

## Google Calendar Integration

**Google Calendar API:**
- Sync meetings to Google Calendar
  - SDK/Client: httpx (`backend/app/services/calendar_service.py`)
  - Auth: OAuth 2.0 (`GOOGLE_CALENDAR_CLIENT_ID`, `GOOGLE_CALENDAR_CLIENT_SECRET`)
  - Callback: `GOOGLE_CALENDAR_REDIRECT_URI`
  - API Base: `https://www.googleapis.com/calendar/v3`
  - iCal feed with signed URLs (`ICAL_FEED_SECRET`)

## Google Pub/Sub

**Gmail Push Notifications:**
- Receive Gmail push notifications for RFI email replies
  - SDK/Client: `google-cloud-pubsub` (`backend/app/services/rfi_email_parser.py`)
  - Config: `GOOGLE_PUBSUB_TOPIC`, `GOOGLE_PUBSUB_AUDIENCE`, `GOOGLE_PUBSUB_VERIFY`

## Real-Time Communication

**WebSockets:**
- Project-scoped real-time notifications
  - Implementation: FastAPI WebSocket (`backend/app/services/websocket_manager.py`)
  - Pattern: ConnectionManager with per-project broadcast
  - Used for: Notifications, real-time updates

**Collaborative Editing:**
- Yjs CRDT with WebSocket transport
  - Frontend: `yjs` + `y-websocket` + `@tiptap/extension-collaboration`
  - Used in collaborative document editing

## Monitoring & Observability

**Error Tracking:**
- Sentry (backend)
  - DSN: Configured in `backend/app/main.py`
  - Integrations: FastAPI, logging
  - Traces sample rate: 10%, profile session sample rate: 10%
  - Environment-aware (`settings.environment`)

**Logs:**
- Python `logging` module with structured logging (`backend/app/core/logging.py`)
- Request logging middleware tracks all API requests
- Frontend: Console-based logging

## CI/CD & Deployment

**Hosting:**
- GCP Cloud Run (me-west1 region)
- Backend: `builderops-backend` (2 CPU, 4GB, min 0 / max 2 instances)
- Frontend: `builderops-frontend` (1 CPU, 256MB, min 0 / max 2 instances)
- Cloud SQL for managed PostgreSQL

**CI Pipeline:**
- GitHub Actions (`.github/workflows/ci.yml`)
- Backend: ruff lint + pytest + pip-audit + file size check (300-line limit)
- Frontend: ESLint + tsc --noEmit + vitest + vite build + bundle size report
- Change detection: Only runs affected jobs (dorny/paths-filter)

**CD Pipeline:**
- GitHub Actions (`.github/workflows/cd.yml`)
- Triggers: Push to main, manual dispatch
- Auth: GCP Workload Identity Federation (`GCP_WIF_PROVIDER`, `GCP_SA_EMAIL`)
- Registry: GCP Artifact Registry (`me-west1-docker.pkg.dev/builderops-poc-il/builderops/`)
- Frontend depends on backend deploy (sequential)

**Scheduled Tasks:**
- GCP Cloud Scheduler (europe-west1 region)
- Daily summary email: `0 18 * * 0-4` (6 PM Israel, Sun-Thu)
- Auth: `X-Scheduler-Secret` header (`SCHEDULER_SECRET`)
- Endpoint: `POST /api/v1/tasks/daily-summary`

## Environment Configuration

**Required env vars (production):**
- `DATABASE_URL` - PostgreSQL async connection string
- `DATABASE_URL_SYNC` - PostgreSQL sync connection string (Alembic)
- `SECRET_KEY` - JWT signing key (min 32 chars)
- `ENVIRONMENT` - `production`
- `STORAGE_TYPE` - `gcs`
- `GCS_BUCKET_NAME` - Cloud Storage bucket
- `EMAIL_PROVIDER` - `gmail`
- `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN` - Gmail OAuth
- `GEMINI_API_KEY` - AI chat
- `SCHEDULER_SECRET` - Cloud Scheduler auth
- `GOOGLE_AUTH_CLIENT_ID` - Google login

**Optional env vars:**
- `APS_CLIENT_ID`, `APS_CLIENT_SECRET` - Autodesk BIM (disabled if empty)
- `STRIPE_SECRET_KEY` - Payments (disabled if empty)
- `PAYPLUS_API_KEY`, `PAYPLUS_SECRET_KEY` - Israeli payments (disabled if empty)
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` - WhatsApp (disabled if empty)
- `DOCAI_PROCESSOR_ID` - Document AI (disabled if empty)
- `GOOGLE_CALENDAR_CLIENT_ID` - Calendar sync (disabled if empty)
- `SENDGRID_API_KEY` - Alternative email (disabled if empty)

**Secrets location:**
- GitHub Secrets (CI/CD deployment)
- Cloud Run environment variables (runtime)
- Local `.env` file (development, gitignored)

## Webhooks & Callbacks

**Incoming:**
- `POST /api/v1/payment-webhooks/stripe` - Stripe payment events (`STRIPE_WEBHOOK_SECRET`)
- `POST /api/v1/payment-webhooks/payplus` - PayPlus payment events (`PAYPLUS_WEBHOOK_SECRET`)
- `POST /api/v1/acc-webhooks/` - Autodesk Construction Cloud events
- `POST /api/v1/tasks/daily-summary` - Cloud Scheduler trigger (`X-Scheduler-Secret`)
- Google Pub/Sub push endpoint for Gmail notifications
- WhatsApp webhook endpoint (`WHATSAPP_WEBHOOK_URL`)

**Outgoing:**
- Gmail API - Email notifications (RFIs, approvals, daily summaries, invitations)
- Twilio WhatsApp API - WhatsApp notifications
- Google Calendar API - Meeting sync events
- Autodesk ACC API - RFI sync (bidirectional)

---

*Integration audit: 2026-03-06*
