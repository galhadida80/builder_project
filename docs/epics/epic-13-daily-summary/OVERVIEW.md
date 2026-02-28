# Epic 13: Daily Work Summary Email

**Status:** COMPLETED
**Priority:** P1 - High
**Estimate:** 11 points (6 stories)
**Sprint:** 9

## Description

Automated daily email summarizing project activity. Sends per-project summaries to project admins in their preferred language (Hebrew/English). Triggered by Cloud Scheduler at 6 PM Israel time (Sun-Thu).

## User Stories

See `docs/LINEAR_EPICS_STORIES.md` — US-13.1 through US-13.6.

## Audit Trail

### Services
- `backend/app/services/daily_summary_service.py` — `collect_project_daily_summary(db, project_id, date)` returns dict with `has_activity` flag

### API Endpoints
- `backend/app/api/v1/daily_summary.py` — `POST /api/v1/tasks/daily-summary` secured by `X-Scheduler-Secret` header (no JWT)

### Email Template
- `backend/app/templates/daily_summary.html` — Jinja2 template with inline CSS, RTL support for Hebrew

### Migrations
- `020` — Adds `daily_summary_enabled` Boolean column to `projects` table (default=true)

### Frontend
- No dedicated frontend page — controlled via project settings toggle

## Implementation Notes

- Skips projects with zero activity (no spam on quiet days)
- Sends per `project_admin` member in their `user.language`
- Config: `settings.scheduler_secret` (env var `SCHEDULER_SECRET`)
- Cloud Scheduler: `europe-west1` (me-west1 not available), job `builderops-daily-summary`
- Schedule: `0 18 * * 0-4` (6 PM, Sun-Thu), timezone `Asia/Jerusalem`
