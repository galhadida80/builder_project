# E2E Test Bug Report - 2026-03-02

## Test Summary (4 runs)
- **Total items created**: ~2,500+
- **Entity types tested**: 14 (contacts, equipment, materials, areas, tasks, meetings, RFIs, inspections, defects, budget, change orders, discussions, checklists, KPIs)
- **Status transitions tested**: 316+ per run
- **Approval workflows tested**: Equipment submit + approve/reject
- **Reports tested**: inspection-summary, approval-status, rfi-aging (+ CSV exports)
- **Analytics tested**: Dashboard stats, KPI values

## Bugs Found

### BUG-1: Gmail OAuth Token Expired (CRITICAL)
- **Severity**: Critical
- **Endpoint**: `POST /rfis/{id}/send`
- **Error**: `"Failed to send email: Gmail OAuth token expired or revoked. Please re-authorize the application."`
- **Impact**: No RFI emails can be sent. Daily summary emails also likely affected.
- **Fix**: Re-authorize Gmail OAuth credentials in GCP/backend config

### BUG-2: CSV Export Returns 0 Bytes for Some Reports
- **Severity**: Medium
- **Endpoints**: `GET /projects/{pid}/reports/export?report_type=inspection-summary`, `approval-status`
- **Details**: Both return HTTP 200 but 0 bytes content. Only `rfi-aging` returns actual CSV data (55KB).

### BUG-3: Meeting Attendee Autocomplete (FIXED)
- **Severity**: Medium
- **File**: `frontend/src/pages/MeetingsPage.tsx:138`
- **Root cause**: `loadTeamMembers` double-mapped data
- **Fix applied**: Changed to use `m.id`, `m.name`, `m.email` directly

## Previously Found and Fixed During Testing

| Issue | Root Cause | Fix |
|-------|-----------|-----|
| Task dates rejected | Backend requires YYYY-MM-DD, not ISO datetime | Use `.strftime("%Y-%m-%d")` |
| Task status "pending" invalid | Valid: not_started, in_progress, completed, on_hold, cancelled | Fixed enum values |
| Defect categories invalid | 27 valid categories in backend schema | Fixed category list |
| Equipment status won't change | Must use submit+approve workflow, not direct PUT | Use POST submit endpoint |
| Inspections 422 error | Wrong consultant types endpoint | Use `/inspection-consultant-types` |
| Meeting status "in_progress" invalid | Valid: scheduled, invitations_sent, pending_votes, completed, cancelled | Fixed enum |

## Entities Successfully Tested

| Entity | Create | Status Transitions | Notes |
|--------|--------|-------------------|-------|
| Contacts | 62/run | N/A | Including real emails |
| Equipment | 44/run | Submit + Approve | Full approval workflow |
| Materials | 84/run | Submit + Approve | 3 per template |
| Areas | 80/run | N/A | 10 floors x 8 units |
| Tasks | 100/run | 5 statuses | + dependencies |
| Meetings | 50/run | 4 statuses | All types |
| RFIs | 50/run | 4 statuses | Email send blocked by OAuth |
| Inspections | 50/run | 3 statuses | All 25 consultant types |
| Defects | 80/run | 4 statuses | 23 categories |
| Budget | 30/run | N/A | + cost entries |
| Change Orders | 20/run | Approve/Reject | |
| Discussions | 50/run | N/A | + replies |
| Checklists | 6/run | N/A | From templates |
| KPIs | 10/run | N/A | 4 types, 8 entities |
