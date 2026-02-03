# RFI (Request for Information) System

## Overview

The RFI system enables construction teams to formally request information from architects, engineers, and other stakeholders via email, with full tracking and conversation threading.

## Features

- Create and manage RFIs with categories, priorities, and due dates
- Send RFIs via email (SendGrid integration)
- Track email conversations with threading
- Automatic response tracking
- Status management (Draft → Open → Waiting Response → Answered → Closed)
- Overdue detection and alerts
- Full audit trail of all email events

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Frontend      │────▶│   Backend API   │────▶│   Database      │
│   (React)       │     │   (FastAPI)     │     │   (PostgreSQL)  │
└─────────────────┘     └────────┬────────┘     └─────────────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │  Email Service  │
                        │  (SendGrid)     │
                        └─────────────────┘
```

## Database Schema

### Tables

1. **rfis** - Main RFI records
2. **rfi_responses** - Responses to RFIs (email or internal)
3. **rfi_email_logs** - Audit trail of all email events

### RFI Statuses

| Status | Description |
|--------|-------------|
| `draft` | RFI created but not sent |
| `open` | RFI opened for review |
| `waiting_response` | RFI sent, awaiting response |
| `answered` | Response received |
| `closed` | RFI resolved and closed |
| `cancelled` | RFI cancelled |

### RFI Priorities

- `low` - Can wait
- `medium` - Standard priority
- `high` - Needs attention soon
- `urgent` - Immediate attention required

### RFI Categories

- `design` - Design-related questions
- `structural` - Structural engineering
- `mep` - Mechanical, Electrical, Plumbing
- `architectural` - Architectural details
- `specifications` - Spec clarifications
- `schedule` - Timeline questions
- `cost` - Budget/cost questions
- `other` - General questions

## API Endpoints

### RFI Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/projects/{project_id}/rfis` | List RFIs with filtering |
| POST | `/api/v1/projects/{project_id}/rfis` | Create new RFI |
| GET | `/api/v1/projects/{project_id}/rfis/summary` | Get RFI statistics |
| GET | `/api/v1/rfis/{rfi_id}` | Get RFI details |
| PATCH | `/api/v1/rfis/{rfi_id}` | Update RFI |
| DELETE | `/api/v1/rfis/{rfi_id}` | Delete draft/cancelled RFI |

### RFI Actions

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/rfis/{rfi_id}/send` | Send RFI via email |
| PATCH | `/api/v1/rfis/{rfi_id}/status` | Update RFI status |
| POST | `/api/v1/rfis/{rfi_id}/responses` | Add internal response |
| GET | `/api/v1/rfis/{rfi_id}/responses` | Get all responses |
| GET | `/api/v1/rfis/{rfi_id}/email-log` | Get email audit trail |

### Development

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/dev/emails` | View fake emails (dev only) |

## Email Configuration

### Environment Variables

```bash
# Email Provider: "fake" for development, "sendgrid" for production
EMAIL_PROVIDER=sendgrid

# RFI email address (from address)
RFI_EMAIL_ADDRESS=rfis@your-company.com

# SendGrid Configuration
SENDGRID_API_KEY=SG.xxxxx
SENDGRID_FROM_EMAIL=rfis@your-company.com
SENDGRID_FROM_NAME=Construction Platform
```

### Email Providers

1. **FakeEmailService** (Development)
   - Logs emails to `uploads/email_logs/`
   - Generates HTML previews
   - No actual email sending

2. **SendGridService** (Production)
   - Real email delivery via SendGrid
   - Requires verified sender identity
   - Tracks message IDs for threading

## Usage Examples

### Creating an RFI

```python
from app.services.rfi_service import RFIService

service = RFIService(db)
rfi = await service.create_rfi(
    project_id=project_id,
    created_by_id=user_id,
    to_email="architect@example.com",
    to_name="John Smith",
    subject="Foundation Clarification",
    question="What is the required footing depth?",
    category="structural",
    priority="high",
    due_date=datetime.now() + timedelta(days=7)
)
```

### Sending an RFI

```python
rfi = await service.send_rfi(rfi.id)
# Status changes to 'waiting_response'
# Email sent via configured provider
```

### Adding a Response

```python
response = await service.add_internal_response(
    rfi_id=rfi.id,
    user_id=user_id,
    response_text="The footing depth should be 14 inches.",
    send_email=True  # Also sends email to recipient
)
```

## Frontend Integration

### RFI Page Location

- Route: `/projects/:projectId/rfis`
- Component: `frontend/src/pages/RFIPage.tsx`

### Features

- Data table with sorting and filtering
- Status-based tab filtering
- Create/Edit modal
- Detail drawer with response thread
- Send, Edit, Delete actions
- Pagination
- Search functionality

## File Structure

```
backend/
├── app/
│   ├── api/v1/
│   │   └── rfis.py              # API endpoints
│   ├── models/
│   │   └── rfi.py               # Database models
│   ├── schemas/
│   │   └── rfi.py               # Pydantic schemas
│   └── services/
│       ├── rfi_service.py       # Business logic
│       ├── email_service.py     # Email provider abstraction
│       ├── sendgrid_service.py  # SendGrid implementation
│       └── fake_email_service.py # Development mock
├── alembic/versions/
│   └── 004_add_rfi_system_tables.py

frontend/
├── src/
│   ├── api/
│   │   └── rfi.ts               # API client
│   └── pages/
│       └── RFIPage.tsx          # RFI management page
```

## Testing

### Run Test Script

```bash
cd backend
source venv/bin/activate
python test_rfi_conversation.py
```

This creates an RFI and simulates a 4-message conversation.

### View Fake Emails

When using `EMAIL_PROVIDER=fake`:
- JSON logs: `uploads/email_logs/*.json`
- HTML previews: `uploads/email_logs/*.html`

## Troubleshooting

### SendGrid 403 Forbidden

1. Verify sender identity at https://app.sendgrid.com/settings/sender_auth
2. Check API key has `mail.send` permission
3. Ensure from_email matches verified sender

### Emails Not Sending

1. Check `EMAIL_PROVIDER` in `.env`
2. Verify `SENDGRID_API_KEY` is set
3. Check logs for error messages

### Database Migration

```bash
cd backend
source venv/bin/activate
alembic upgrade head
```
