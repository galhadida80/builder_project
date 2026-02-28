# Epic 20: Meeting Enhancements (RSVP & Time Slots)

**Status:** COMPLETED
**Priority:** P1 - High
**Estimate:** 8 points (3 stories)
**Sprint:** 12

## Description

Enhanced meeting management with RSVP status tracking, time slot voting for scheduling, meeting format (in-person/online), and online meeting link support.

## User Stories

See `docs/LINEAR_EPICS_STORIES.md` — US-20.1 through US-20.3.

## Audit Trail

### Models
- `backend/app/models/meeting.py` — Meeting, MeetingAttendee (with RSVP status), MeetingTimeSlot, MeetingTimeSlotVote

### Schemas
- `backend/app/schemas/meeting.py`

### API Endpoints
- `backend/app/api/v1/meetings.py` — Meeting CRUD, attendee management, time slot voting, calendar integration, email notifications

### Migrations
- `033` — RSVP status enum on `meeting_attendees`
- `034` — `meeting_time_slots` and `meeting_time_slot_votes` tables
- `049` — `meeting_format` and `online_link` fields on `meetings`

### Frontend
- `frontend/src/pages/MeetingsPage.tsx` — Calendar grid/agenda views, RSVP management, time slot voting, attendee management
- `frontend/src/pages/MeetingRSVPPage.tsx` — Dedicated RSVP voting interface

## Implementation Notes

- RSVP statuses: pending, accepted, declined, tentative
- Time slot voting enables democratic scheduling
- Meeting format: in-person or online (with link)
