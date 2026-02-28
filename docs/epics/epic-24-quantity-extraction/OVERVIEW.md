# Epic 24: Quantity Extraction (AI Tool)

**Status:** COMPLETED
**Priority:** P1 - High
**Estimate:** 3 points (1 story)
**Sprint:** 13

## Description

AI-powered quantity extraction from PDF construction documents. Uses Google Document AI for OCR and Gemini for intelligent parsing of floor plans, room schedules, and material quantities.

## User Stories

See `docs/LINEAR_EPICS_STORIES.md` — US-24.1.

## Audit Trail

### Schemas
- `backend/app/schemas/quantity_extraction.py` — QuantityExtractionResponse (floors, summary, processing_time_ms)

### Services
- `backend/app/services/quantity_extraction_service.py` — Main extraction orchestrator
- `backend/app/services/quantity_gemini_mapper.py` — Gemini-based quantity mapping
- `backend/app/services/quantity_pdf_parser.py` — PDF parsing
- `backend/app/services/quantity_docai_service.py` — Google Document AI integration
- `backend/app/services/quantity_splitter.py` — Document page splitting

### API Endpoints
- `backend/app/api/v1/quantity_extraction.py` — `POST /tools/extract-quantities` (PDF upload, 20MB limit, supports he/en)

### Frontend
- `frontend/src/pages/QuantityExtractionPage.tsx` — Drag-drop PDF upload, extraction with loading states, results display with floors/rooms/quantities breakdown
- `frontend/src/api/quantityExtraction.ts` — API client

## Implementation Notes

- PDF only, max 20MB file size
- Supports Hebrew and English document languages
- Uses `asyncio.get_event_loop().run_in_executor()` for CPU-bound extraction
- Results structured by floors → rooms → quantities with summary totals
- No database models — extraction is stateless, results returned directly
