# Epic 13: Daily Work Summary Email - Specs

| Spec | Description | Status |
|------|-------------|--------|
| Migration 020 | Add daily_summary_enabled to projects table | Done |
| daily_summary_service.py | Data collection service for daily activity | Done |
| daily_summary_email.py | HTML email renderer with en/he i18n | Done |
| daily_summary.py (API) | POST /tasks/daily-summary trigger endpoint | Done |
| Config & CD | scheduler_secret setting + CD pipeline env var | Done |
| Cloud Scheduler | GCP Cloud Scheduler job (manual setup) | Planned |

**Files Created:**
- `backend/alembic/versions/020_add_daily_summary_settings.py`
- `backend/app/services/daily_summary_service.py`
- `backend/app/services/daily_summary_email.py`
- `backend/app/api/v1/daily_summary.py`

**Files Modified:**
- `backend/app/models/project.py`
- `backend/app/schemas/project.py`
- `backend/app/config.py`
- `backend/app/api/v1/router.py`
- `.github/workflows/cd.yml`
