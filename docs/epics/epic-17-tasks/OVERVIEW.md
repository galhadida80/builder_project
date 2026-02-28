# Epic 17: Task Management

**Status:** COMPLETED
**Priority:** P1 - High
**Estimate:** 10 points (3 stories)
**Sprint:** 11

## Description

Project task management with dependencies, priority levels, status tracking, and assignee management. Supports task filtering by status, priority, and assignee.

## User Stories

See `docs/LINEAR_EPICS_STORIES.md` — US-17.1 through US-17.3.

## Audit Trail

### Models
- `backend/app/models/task.py` — Task, TaskDependency

### Schemas
- `backend/app/schemas/task.py`

### API Endpoints
- `backend/app/api/v1/tasks_api.py` — GET/POST/PATCH/DELETE `/projects/{project_id}/tasks`, task dependencies, status updates, filtering

### Migrations
- `028` — `tasks` and `task_dependencies` tables

### Frontend
- `frontend/src/pages/TasksPage.tsx` — Tabs: Active, Completed, All. Task CRUD, priority/status badges, assignee management

## Implementation Notes

- Business logic is inline in the API router (no separate service file)
- Task dependencies allow blocking/blocked-by relationships
- Priority and status badges for visual task management
