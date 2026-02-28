# Epic 12: AI Chat with Project Data

**Status:** COMPLETED (Phase 1)
**Priority:** P0 - Critical
**Estimate:** 26 points (7 stories)
**Sprint:** 8

## Description

AI-powered chat assistant integrated into the project dashboard. Uses Pydantic AI with Google Gemini (`google-gla:gemini-2.0-flash`) to answer project questions, list entities, and propose actions (create, update, approve) via a propose-confirm workflow.

## User Stories

See `docs/LINEAR_EPICS_STORIES.md` — US-12.1 through US-12.7.

## Audit Trail

### Models
- `backend/app/models/chat.py` — ChatConversation, ChatMessage
- `backend/app/models/chat_action.py` — ChatAction (propose-confirm system)

### Schemas
- `backend/app/schemas/chat.py`
- `backend/app/schemas/chat_action.py`

### Services
- `backend/app/services/chat_service.py` — Pydantic AI agent, 11 `propose_*` tools, message history serialization
- `backend/app/services/chat_action_executor.py` — 10 handlers for executing approved actions
- `backend/app/services/chat_tools.py` — List/detail tools (list_equipment, get_inspection_details, etc.)

### API Endpoints
- `backend/app/api/v1/chat.py` — Chat message CRUD, action execute/reject

### Migrations
- `015` — `chat_actions` table with FK to conversations & messages

### Frontend
- `frontend/src/components/chat/ChatDrawer.tsx` — Main chat UI drawer
- `frontend/src/components/chat/ChatMessage.tsx` — Message rendering
- `frontend/src/components/chat/ChatActionCard.tsx` — Approve/Reject action cards
- `frontend/src/components/chat/ChatInput.tsx` — Message input with voice
- `frontend/src/components/chat/VoiceSettingsDialog.tsx`
- `frontend/src/api/chat.ts` — API client

## Implementation Notes

- ChatDeps has `db`, `project_id`, `conversation_id`, `message_id`
- Message history: serialize with `to_jsonable_python()`, deserialize with `ModelMessagesTypeAdapter.validate_python()`
- Pre-creates assistant ChatMessage before `agent.run()` for FK linking
- All list tools include `id`; 8 detail tools for get_*_details
- Remaining: US-12.7 (WhatsApp AI Chat) not yet implemented
