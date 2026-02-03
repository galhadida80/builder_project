import requests
import time

API_TOKEN = "lin_api_EmtAtr8ggFJGVINnUEzMButkDuOVrkdGVRZwGBEi"
TEAM_ID = "18af49f9-dd3c-451d-bbd3-0853150cf9b9"
API_URL = "https://api.linear.app/graphql"

headers = {
    "Content-Type": "application/json",
    "Authorization": API_TOKEN
}


def create_issue(title, description, estimate=None, parent_id=None, priority=None):
    mutation = """
    mutation CreateIssue($input: IssueCreateInput!) {
        issueCreate(input: $input) {
            success
            issue {
                id
                identifier
                title
            }
        }
    }
    """

    variables = {
        "input": {
            "teamId": TEAM_ID,
            "title": title,
            "description": description
        }
    }

    if estimate:
        variables["input"]["estimate"] = estimate
    if parent_id:
        variables["input"]["parentId"] = parent_id
    if priority:
        variables["input"]["priority"] = priority

    response = requests.post(API_URL, headers=headers, json={"query": mutation, "variables": variables})
    result = response.json()

    if "errors" in result:
        print(f"Error creating issue '{title}': {result['errors']}")
        return None

    issue = result["data"]["issueCreate"]["issue"]
    print(f"Created: {issue['identifier']} - {issue['title']}")
    return issue["id"]


rfi_epic = {
    "title": "[EPIC] RFI System - Email-Integrated Request for Information",
    "description": """## Overview
Implement a complete RFI (Request for Information) system with email integration via Gmail API and Google Cloud Pub/Sub.
The system allows creating, sending, tracking, and responding to RFIs through an official email address integrated with the CRM.

## Goals
- Email-based RFI creation and tracking with automatic threading
- Gmail API integration for sending/receiving emails
- Pub/Sub webhook for real-time email notifications
- Full audit trail of all RFI communications
- Status tracking: Draft → Open → Waiting Response → Answered → Closed
- Notification system for responses and due dates

## Architecture Components
1. **Database**: PostgreSQL tables for RFIs, responses, and email logs
2. **Email Service**: Gmail API via GCP service account
3. **Webhook**: Pub/Sub push notifications for incoming emails
4. **Parser**: Email parser to extract RFI data and match threads
5. **Notification**: Alert system for new responses

## GCP Services Required
- Google Workspace email account (rfi@yourdomain.com)
- Gmail API enabled
- Cloud Pub/Sub topic and subscription
- Service Account with domain-wide delegation

## Priority
P0 - Critical

## Estimated Points: 34""",
    "priority": 1,
    "stories": [
        {
            "title": "Create RFI Database Models and Migration",
            "description": """## User Story
As a developer, I need database models for RFIs so that I can store and track all RFI data.

## Acceptance Criteria
- [ ] Create `RFI` model with fields:
  - id, project_id, rfi_number (unique, format: RFI-YYYY-NNNNN)
  - email_thread_id, email_message_id (for Gmail threading)
  - subject, question, category, priority
  - to_email, to_name, cc_emails (JSONB)
  - status (draft, open, waiting_response, answered, closed)
  - due_date, sent_at, responded_at, closed_at
  - location, drawing_reference, specification_reference
  - attachments (JSONB)
  - created_by_id, assigned_to_id
- [ ] Create `RFIResponse` model with fields:
  - id, rfi_id, email_message_id, in_reply_to
  - response_text, attachments (JSONB)
  - from_email, from_name, responder_id
  - is_internal, source (email/crm/api)
  - received_at
- [ ] Create `RFIEmailLog` model for audit trail:
  - id, rfi_id, event_type, email_message_id
  - from_email, to_email, subject
  - raw_payload (JSONB), error_message
- [ ] Create Alembic migration
- [ ] Add relationships to Project model

## Technical Notes
```python
class RFIStatus(str, Enum):
    DRAFT = "draft"
    OPEN = "open"
    WAITING_RESPONSE = "waiting_response"
    ANSWERED = "answered"
    CLOSED = "closed"
```

## Labels
backend, database, rfi""",
            "estimate": 3
        },
        {
            "title": "Create RFI Pydantic Schemas",
            "description": """## User Story
As a developer, I need Pydantic schemas for RFI validation so that API requests are properly validated.

## Acceptance Criteria
- [ ] Create `RFIBase`, `RFICreate`, `RFIUpdate` schemas
- [ ] Create `RFIResponse` schema with nested responses
- [ ] Create `RFIResponseCreate`, `RFIResponseUpdate` schemas
- [ ] Create `RFISummaryResponse` for list views
- [ ] Create `RFIEmailLogResponse` schema
- [ ] Add proper validation for email addresses
- [ ] Add validation for RFI number format

## Labels
backend, schemas, rfi""",
            "estimate": 2
        },
        {
            "title": "Implement Gmail API Service",
            "description": """## User Story
As a developer, I need a Gmail API service so that I can send and receive RFI emails programmatically.

## Acceptance Criteria
- [ ] Create `GmailService` class with service account authentication
- [ ] Implement domain-wide delegation for rfi@domain.com
- [ ] Implement `send_rfi_email()` method with:
  - Subject prefix: [RFI-YYYY-NNNNN]
  - Custom X-RFI-Number header
  - In-Reply-To and References headers for threading
  - HTML email body with RFI details
  - Attachment support
- [ ] Implement `get_message()` to fetch full email details
- [ ] Implement `get_thread()` to fetch email thread
- [ ] Implement `setup_watch()` for Pub/Sub notifications
- [ ] Add proper error handling and retry logic

## Environment Variables
```
RFI_EMAIL_ADDRESS=rfi@yourdomain.com
GOOGLE_SERVICE_ACCOUNT_FILE=/path/to/service-account.json
GOOGLE_PROJECT_ID=builder-rfi-system
```

## Labels
backend, email, gmail-api, rfi""",
            "estimate": 5
        },
        {
            "title": "Implement RFI Email Parser Service",
            "description": """## User Story
As a developer, I need an email parser so that incoming emails can be processed and matched to RFIs.

## Acceptance Criteria
- [ ] Create `RFIEmailParser` class
- [ ] Implement `parse_gmail_message()` to extract:
  - message_id, thread_id
  - from_email, from_name, to_email
  - subject, body_text, body_html
  - in_reply_to, references headers
  - rfi_number from subject or X-RFI-Number header
  - attachments list
- [ ] Implement `is_new_rfi()` to distinguish new vs reply
- [ ] Implement `extract_reply_content()` to remove quoted text
- [ ] Handle multipart MIME messages
- [ ] Support base64 encoded content

## RFI Number Extraction Pattern
```python
RFI_NUMBER_PATTERN = re.compile(r'\\[?(RFI-\\d{4}-\\d{5})\\]?', re.IGNORECASE)
```

## Labels
backend, parser, email, rfi""",
            "estimate": 3
        },
        {
            "title": "Create RFI Service with Email Integration",
            "description": """## User Story
As a developer, I need an RFI service that handles business logic for creating, sending, and processing RFIs.

## Acceptance Criteria
- [ ] Create `RFIService` class
- [ ] Implement `generate_rfi_number()` - format: RFI-YYYY-NNNNN
- [ ] Implement `create_and_send_rfi()`:
  - Create RFI record in database
  - Generate HTML email body
  - Send via Gmail API
  - Update RFI with email_thread_id, email_message_id
  - Set status to WAITING_RESPONSE
  - Log email event
- [ ] Implement `process_incoming_email()`:
  - Parse incoming email
  - Find matching RFI by thread_id, rfi_number, or In-Reply-To
  - Create RFIResponse record
  - Update RFI status to ANSWERED
  - Trigger notifications
- [ ] Implement `close_rfi()`, `reopen_rfi()` methods
- [ ] Implement `add_internal_response()` for CRM replies

## Labels
backend, service, rfi""",
            "estimate": 5
        },
        {
            "title": "Create Gmail Pub/Sub Webhook Endpoint",
            "description": """## User Story
As a developer, I need a webhook endpoint to receive Gmail push notifications when new emails arrive.

## Acceptance Criteria
- [ ] Create `/api/v1/webhooks/gmail/push` POST endpoint
- [ ] Parse Pub/Sub message format (base64 encoded)
- [ ] Extract historyId from notification
- [ ] Process incoming emails in background task
- [ ] Implement `process_gmail_history()`:
  - Fetch message list from Gmail history
  - Get full message details for each new message
  - Call RFIService.process_incoming_email()
- [ ] Return 200 OK quickly to acknowledge Pub/Sub
- [ ] Add error handling and logging
- [ ] Add webhook signature verification (optional)

## Pub/Sub Message Format
```json
{
  "message": {
    "data": "base64_encoded_json",
    "messageId": "123",
    "publishTime": "2024-01-01T12:00:00Z"
  }
}
```

## Labels
backend, webhook, pubsub, rfi""",
            "estimate": 3
        },
        {
            "title": "Create RFI CRUD API Endpoints",
            "description": """## User Story
As a developer, I need REST API endpoints for RFI management so that the frontend can interact with RFIs.

## Acceptance Criteria
- [ ] `GET /api/v1/projects/{project_id}/rfis` - List RFIs with filters
- [ ] `POST /api/v1/projects/{project_id}/rfis` - Create new RFI
- [ ] `GET /api/v1/rfis/{rfi_id}` - Get RFI with responses
- [ ] `PATCH /api/v1/rfis/{rfi_id}` - Update RFI
- [ ] `POST /api/v1/rfis/{rfi_id}/send` - Send RFI email
- [ ] `POST /api/v1/rfis/{rfi_id}/responses` - Add internal response
- [ ] `PATCH /api/v1/rfis/{rfi_id}/status` - Update status
- [ ] `GET /api/v1/rfis/{rfi_id}/email-log` - Get email audit trail
- [ ] Add pagination, sorting, filtering
- [ ] Add proper authorization checks

## Labels
backend, api, rfi""",
            "estimate": 3
        },
        {
            "title": "Implement RFI Notification Service",
            "description": """## User Story
As a user, I want to receive notifications when RFI responses arrive so that I stay informed.

## Acceptance Criteria
- [ ] Create `NotificationService` class
- [ ] Implement `notify_rfi_response()`:
  - Send email notification to RFI creator
  - Include response preview (first 500 chars)
  - Link to view full response in CRM
- [ ] Implement `notify_rfi_due_soon()`:
  - Send reminder for RFIs approaching due date
  - Configurable reminder period (e.g., 2 days before)
- [ ] Implement `notify_rfi_overdue()`:
  - Daily digest of overdue RFIs
- [ ] Add in-app notification support (optional)
- [ ] Add Slack integration (optional)

## Labels
backend, notifications, rfi""",
            "estimate": 3
        },
        {
            "title": "Set Up GCP Email Infrastructure",
            "description": """## User Story
As a DevOps engineer, I need to configure GCP services so that the RFI email system works end-to-end.

## Acceptance Criteria
- [ ] Create GCP project: builder-rfi-system
- [ ] Enable APIs: Gmail API, Pub/Sub API, Secret Manager
- [ ] Create service account: rfi-email-processor
- [ ] Configure domain-wide delegation in Google Admin
- [ ] Create Pub/Sub topic: gmail-rfi-notifications
- [ ] Grant Gmail publish permission to topic
- [ ] Create Pub/Sub push subscription pointing to webhook
- [ ] Store service account key in Secret Manager
- [ ] Document all configuration steps

## GCP CLI Commands
```bash
gcloud services enable gmail.googleapis.com pubsub.googleapis.com
gcloud pubsub topics create gmail-rfi-notifications
gcloud pubsub subscriptions create gmail-rfi-push \\
  --topic=gmail-rfi-notifications \\
  --push-endpoint=https://api.yourapp.com/webhooks/gmail/push
```

## Labels
devops, gcp, infrastructure, rfi""",
            "estimate": 3
        },
        {
            "title": "Create Frontend RFI List Page",
            "description": """## User Story
As a user, I want to view all RFIs for a project so that I can track outstanding questions.

## Acceptance Criteria
- [ ] Create `/projects/{projectId}/rfis` route
- [ ] Create `RFIListPage` component
- [ ] Data table with columns:
  - RFI Number, Subject, To, Status, Priority, Due Date, Created
- [ ] Status badges with colors:
  - Draft (gray), Open (blue), Waiting (yellow), Answered (green), Closed (gray)
- [ ] Priority badges: Low, Medium, High, Urgent
- [ ] Filter by status, priority, category
- [ ] Search by subject, RFI number
- [ ] Sort by date, priority, status
- [ ] Pagination
- [ ] "New RFI" button

## Labels
frontend, page, rfi""",
            "estimate": 3
        },
        {
            "title": "Create RFI Detail Page with Thread View",
            "description": """## User Story
As a user, I want to view RFI details and conversation thread so that I can see the full context.

## Acceptance Criteria
- [ ] Create `/rfis/{rfiId}` route
- [ ] Create `RFIDetailPage` component
- [ ] Header section:
  - RFI number, subject, status badge
  - To/CC recipients
  - Category, priority, due date
  - Action buttons: Send, Close, Reopen
- [ ] Original question section:
  - Question text
  - Attachments list with download
  - Location/drawing references
- [ ] Conversation thread:
  - Chronological list of responses
  - Each response: sender, timestamp, content
  - Distinguish internal vs external responses
  - Attachment links
- [ ] Reply input at bottom:
  - Rich text editor
  - Attachment upload
  - Send button

## Labels
frontend, page, rfi""",
            "estimate": 5
        },
        {
            "title": "Create RFI Form Dialog Component",
            "description": """## User Story
As a user, I want to create new RFIs through a form so that I can submit questions to consultants.

## Acceptance Criteria
- [ ] Create `RFIFormDialog` component
- [ ] Form fields:
  - To email (required, email validation)
  - To name
  - CC emails (multi-input)
  - Subject (required)
  - Category dropdown (Design, Structural, MEP, etc.)
  - Priority dropdown (Low, Medium, High, Urgent)
  - Due date picker
  - Question (rich text editor)
  - Location reference
  - Drawing/specification reference
  - Attachments upload (multi-file)
- [ ] Form validation with error messages
- [ ] "Save as Draft" button
- [ ] "Send Now" button
- [ ] Loading states during submission

## Labels
frontend, component, rfi""",
            "estimate": 3
        },
        {
            "title": "Create Frontend RFI API Client",
            "description": """## User Story
As a developer, I need a frontend API client for RFI operations so that components can interact with the backend.

## Acceptance Criteria
- [ ] Create `frontend/src/api/rfi.ts`
- [ ] Implement functions:
  - `getRFIs(projectId, filters)` - List with pagination
  - `getRFI(rfiId)` - Get single with responses
  - `createRFI(projectId, data)` - Create new
  - `updateRFI(rfiId, data)` - Update existing
  - `sendRFI(rfiId)` - Send email
  - `addResponse(rfiId, data)` - Add internal response
  - `updateStatus(rfiId, status)` - Change status
  - `getEmailLog(rfiId)` - Get audit trail
- [ ] Add TypeScript types for all responses
- [ ] Handle errors appropriately

## Labels
frontend, api, rfi""",
            "estimate": 2
        },
        {
            "title": "Add RFI Dashboard Widget",
            "description": """## User Story
As a user, I want to see RFI statistics on my dashboard so that I can quickly assess outstanding items.

## Acceptance Criteria
- [ ] Create `RFIStatsWidget` component
- [ ] Display counts:
  - Open RFIs (awaiting response)
  - Overdue RFIs (past due date)
  - Answered today
  - Total closed this month
- [ ] Visual indicators (icons, colors)
- [ ] Click to navigate to RFI list with filter
- [ ] Add widget to main dashboard

## Labels
frontend, dashboard, rfi""",
            "estimate": 2
        },
        {
            "title": "Add RFI to Project Navigation",
            "description": """## User Story
As a user, I want to access RFIs from the project navigation so that I can easily manage them.

## Acceptance Criteria
- [ ] Add "RFIs" tab to project detail page navigation
- [ ] Add RFI icon (MessageSquare or similar)
- [ ] Show unread/pending count badge on tab
- [ ] Update router with /projects/:projectId/rfis route
- [ ] Add RFI link to sidebar navigation

## Labels
frontend, navigation, rfi""",
            "estimate": 1
        },
        {
            "title": "Write RFI System Integration Tests",
            "description": """## User Story
As a developer, I need integration tests for the RFI system so that I can ensure it works correctly.

## Acceptance Criteria
- [ ] Test RFI CRUD operations
- [ ] Test RFI number generation (uniqueness)
- [ ] Test email sending (mock Gmail API)
- [ ] Test webhook processing (mock Pub/Sub)
- [ ] Test email parsing with sample emails
- [ ] Test RFI matching logic (thread_id, subject, In-Reply-To)
- [ ] Test status transitions
- [ ] Test notification triggers
- [ ] Add fixtures for test data

## Labels
backend, testing, rfi""",
            "estimate": 3
        }
    ]
}


def main():
    print("Creating RFI System Epic and Stories in Linear...")
    print("=" * 60)

    epic_id = create_issue(
        title=rfi_epic['title'],
        description=rfi_epic['description'],
        priority=rfi_epic.get('priority', 2)
    )

    if epic_id:
        time.sleep(0.5)
        story_count = 0

        for story in rfi_epic['stories']:
            story_id = create_issue(
                title=story['title'],
                description=story['description'],
                estimate=story.get('estimate'),
                parent_id=epic_id
            )
            story_count += 1
            time.sleep(0.3)

        print("\n" + "=" * 60)
        print(f"COMPLETE: Created 1 Epic and {story_count} User Stories")
        print("=" * 60)
    else:
        print("Failed to create epic")


if __name__ == "__main__":
    main()
