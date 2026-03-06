# Technology Stack

**Analysis Date:** 2026-03-06

## Languages

**Primary:**
- Python 3.11+ - Backend API, services, migrations, AI chat (`backend/`)
- TypeScript 5.3+ - Frontend SPA (`frontend/`)

**Secondary:**
- SQL - Database migrations (`backend/alembic/versions/`)
- HTML/CSS (inline) - Email templates (`backend/app/services/email_renderer.py`)

## Runtime

**Environment:**
- Python 3.11 (CI), 3.13 (local via Homebrew)
- Node.js 20 (CI and development)

**Package Manager:**
- pip (Python) - `backend/requirements.txt`
- npm (Node) - `frontend/package-lock.json` present
- Lockfile: Both present

## Frameworks

**Core:**
- FastAPI >=0.109.0 - Backend REST API (`backend/app/main.py`)
- React 18.2 - Frontend UI (`frontend/src/main.tsx`)
- Vite 6.4 - Frontend build tool and dev server (`frontend/vite.config.ts`)

**Testing:**
- pytest >=8.0.0 + pytest-asyncio - Backend tests
- Vitest 1.1 + @testing-library/react 14.1 - Frontend unit tests
- Playwright 1.58 - E2E tests (`frontend/e2e/`)

**Build/Dev:**
- Vite 6.4 - Frontend bundler with HMR (`frontend/vite.config.ts`)
- Alembic >=1.13.1 - Database migrations (`backend/alembic/`)
- Docker Compose - Local full-stack development (`docker-compose.yml`)
- Ruff - Python linting (CI only, no config file)
- ESLint 8.56 - TypeScript/React linting (`frontend/`)

## Key Dependencies

**Critical (Backend):**
- SQLAlchemy >=2.0.25 - Async ORM with PostgreSQL (`backend/app/db/session.py`)
- asyncpg >=0.29.0 - Async PostgreSQL driver
- Pydantic >=2.9.0 + pydantic-settings - Config, request/response validation (`backend/app/config.py`)
- python-jose[cryptography] >=3.3.0 - JWT token handling
- passlib[bcrypt] + bcrypt >=4.0.1 - Password hashing
- Celery[redis] >=5.3.6 - Async task queue (`docker-compose.yml` runs celery worker)
- slowapi >=0.1.9 - Rate limiting middleware (`backend/app/middleware/rate_limiter.py`)
- sentry-sdk[fastapi] >=2.0.0 - Error tracking (`backend/app/main.py`)
- pydantic-ai[google] >=0.1.0 - AI agent framework (`backend/app/services/chat_service.py`)
- google-genai >=1.0.0 - Google Gemini AI model access
- fastmcp >=0.1.0 - MCP server for tool exposure (`backend/app/services/mcp_server.py`)
- httpx >=0.27.0 - Async HTTP client for external APIs

**Critical (Frontend):**
- MUI v5 (@mui/material 5.16.14) - UI component library with RTL support
- @mui/x-charts, @mui/x-data-grid, @mui/x-date-pickers - Extended MUI components
- Axios 1.6.7 - HTTP client (`frontend/src/api/client.ts`)
- react-hook-form 7.71 + @hookform/resolvers 5.2 - Form management
- Zod 4.3 - Schema validation for forms
- react-i18next 16.5 + i18next 25.8 - Internationalization (HE/EN)
- react-router-dom 6.21 - Client-side routing
- @emotion/react + @emotion/styled - CSS-in-JS for MUI

**Infrastructure (Backend):**
- google-cloud-storage >=2.14.0 - GCS file storage (production)
- google-cloud-pubsub >=2.19.0 - Pub/Sub messaging
- google-cloud-documentai >=2.20.0 - Document AI processing
- google-api-python-client >=2.111.0 - Gmail API integration
- firebase-admin >=6.4.0 - Firebase integration
- boto3 >=1.35.74 - AWS S3 storage (optional backend)
- stripe >=11.0.0 - Payment processing
- sendgrid >=6.11.0 - Email delivery (alternative provider)
- twilio >=9.0.0 - WhatsApp messaging
- webauthn >=2.0.0 - Passwordless authentication
- pyotp >=2.9.0 - Two-factor authentication (TOTP)

**Document/Media Processing (Backend):**
- weasyprint >=62.0 - PDF report generation
- openpyxl >=3.1.2 - Excel export
- pdfplumber >=0.10.0 - PDF text extraction
- pymupdf >=1.24.0 - PDF rendering
- opencv-python-headless >=4.9.0 - Image processing
- ifcopenshell >=0.8.0 - IFC/BIM file parsing
- matplotlib >=3.8.0 - Chart generation
- qrcode[pil] >=7.4.0 - QR code generation
- jinja2 >=3.1.3 - HTML email templating

**Specialized (Frontend):**
- @tiptap/react + @tiptap/starter-kit + mui-tiptap - Rich text editor
- yjs + y-websocket - Real-time collaboration (CRDT)
- three + @types/three + web-ifc - 3D BIM model viewer
- fabric 6.9 - Canvas-based annotation/drawing
- @react-google-maps/api - Google Maps integration
- @react-oauth/google - Google OAuth login
- gantt-task-react - Gantt chart for scheduling
- react-signature-canvas - Digital signature capture
- html2canvas + jspdf - Client-side PDF generation
- react-dropzone - File upload drag-and-drop
- react-markdown + remark-gfm - Markdown rendering
- dayjs - Date manipulation
- idb 8.0 - IndexedDB wrapper (offline support)
- vite-plugin-pwa - Progressive Web App support

## Configuration

**Environment:**
- Backend: Pydantic BaseSettings loads from `.env` file and env vars (`backend/app/config.py`)
- Frontend: Vite env vars prefixed `VITE_` (`VITE_API_URL`, `VITE_GOOGLE_CLIENT_ID`, `VITE_GOOGLE_MAPS_KEY`)
- Storage type configurable: `local` (dev), `gcs` (prod), `s3` (optional)
- Email provider configurable: `fake` (dev), `gmail` (prod), `sendgrid` (alternative)

**Build:**
- `frontend/vite.config.ts` - Vite config with path alias `@/` -> `src/`, proxy `/api` -> `:8000`
- `frontend/tsconfig.json` - TypeScript strict mode, ES2020 target, path alias
- `backend/alembic.ini` + `backend/alembic/env.py` - Migration configuration

## Platform Requirements

**Development:**
- PostgreSQL 15 (via Docker or local)
- Redis 7 (via Docker or local, required for Celery)
- Python 3.11+
- Node.js 20

**Production:**
- GCP Cloud Run (me-west1 region)
  - Backend: 2 CPU, 4GB RAM, port 8080
  - Frontend: 1 CPU, 256MB RAM, port 8080
- GCP Artifact Registry (`builderops` repo in me-west1)
- Cloud SQL PostgreSQL
- Google Cloud Storage
- Cloud Scheduler (europe-west1 - not available in me-west1)
- GCP Project ID: `builderops-poc-il`

---

*Stack analysis: 2026-03-06*
