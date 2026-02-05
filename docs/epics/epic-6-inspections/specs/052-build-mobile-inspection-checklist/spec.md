# Specification: Build Mobile Inspection Checklist

## Overview

Build a mobile-optimized inspection checklist interface that allows field inspectors to complete checklists on mobile devices, capture photos, and collect digital signatures for sign-off. This feature integrates with the existing checklist infrastructure (templates, instances, responses) and inspections API to provide a complete mobile inspection workflow.

## Workflow Type

**Type**: feature

**Rationale**: This is a new feature that adds mobile-specific UI and capabilities (photo capture, signature) to the existing checklist system. It extends functionality rather than refactoring or investigating existing code.

## Task Scope

### Services Involved
- **frontend** (primary) - Implement mobile checklist UI, photo capture, and signature components
- **backend** (integration) - Use existing checklist and inspection APIs

### This Task Will:
- [ ] Create mobile-optimized checklist interface with section navigation
- [ ] Implement photo capture/upload functionality using react-dropzone (already installed)
- [ ] Add digital signature capture using react-signature-canvas
- [ ] Integrate with existing checklist instance and response APIs
- [ ] Connect to inspection completion workflow
- [ ] Handle offline-friendly form state management
- [ ] Ensure responsive design for mobile devices (phones/tablets)

### Out of Scope:
- Modifications to backend checklist APIs (already exist)
- Template creation/editing (separate admin feature)
- Offline sync capabilities (future enhancement)
- PDF generation of completed checklists (future enhancement)

## Service Context

### Frontend

**Tech Stack:**
- Language: TypeScript
- Framework: React
- Build Tool: Vite
- Styling: Emotion + Material-UI (@mui/material)
- Key directories: src/

**Entry Point:** `src/App.tsx`

**How to Run:**
```bash
cd frontend
npm run dev
```

**Port:** 3000

**Existing Dependencies:**
- `react-dropzone` (v14.2.3) - Already installed for file uploads
- `@mui/material` - UI components
- `@mui/icons-material` - Icons
- `axios` - API calls
- `react-router-dom` - Routing

**Dependencies to Add:**
- `react-signature-canvas` - Digital signature capture

### Backend

**Tech Stack:**
- Language: Python
- Framework: FastAPI
- ORM: SQLAlchemy
- Key directories: app/

**Port:** 8000

**Existing APIs (to be consumed):**
- `GET /projects/{project_id}/checklist-instances` - List checklists
- `POST /projects/{project_id}/checklist-instances` - Create instance
- `GET /checklist-instances/{instance_id}` - Get checklist details with sections
- `POST /checklist-instances/{instance_id}/responses` - Submit responses
- `PUT /checklist-instances/{instance_id}/responses/{response_id}` - Update response
- `POST /projects/{project_id}/files` - Upload files (photos)
- `POST /projects/{project_id}/inspections/{inspection_id}/complete` - Complete inspection

## Files to Modify

| File | Service | What to Change |
|------|---------|---------------|
| `frontend/package.json` | frontend | Add `react-signature-canvas` dependency |
| `frontend/src/App.tsx` | frontend | Add route for mobile checklist page |
| (New) `frontend/src/pages/MobileChecklistPage.tsx` | frontend | Create main mobile checklist page component |
| (New) `frontend/src/components/checklist/ChecklistSection.tsx` | frontend | Create section display component |
| (New) `frontend/src/components/checklist/PhotoCapture.tsx` | frontend | Create photo capture component using react-dropzone |
| (New) `frontend/src/components/checklist/SignaturePad.tsx` | frontend | Create signature capture component |
| (New) `frontend/src/hooks/useChecklistInstance.ts` | frontend | Create hook for checklist data fetching and state |
| (New) `frontend/src/api/checklists.ts` | frontend | Create API client functions for checklist endpoints |

## Files to Reference

These files show patterns to follow:

| File | Pattern to Copy |
|------|----------------|
| Existing Material-UI components | Component structure, styling patterns, responsive design |
| Existing API integration files | Axios usage, error handling, TypeScript types |
| Existing form components | Form state management, validation patterns |

## Patterns to Follow

### Photo Capture with react-dropzone

**Pattern:** Mobile camera trigger using existing dependency

```typescript
import { useDropzone } from 'react-dropzone';

const { getRootProps, getInputProps } = useDropzone({
  accept: { 'image/*': [] },
  capture: 'environment', // Forces back camera on mobile
  onDrop: (acceptedFiles) => {
    // Handle file upload
  }
});
```

**Key Points:**
- `react-dropzone` is already installed - no new dependency needed for photos
- Use `capture: 'environment'` to default to back camera (for field inspections)
- Handle base64 conversion for preview and upload
- Compress images before upload to reduce bandwidth

### Signature Capture with react-signature-canvas

**Pattern:** Digital signature with ref-based API

```typescript
import SignatureCanvas from 'react-signature-canvas';
import { useRef } from 'react';

const sigCanvas = useRef<SignatureCanvas>(null);

<SignatureCanvas
  ref={sigCanvas}
  penColor='black'
  canvasProps={{
    width: 500,
    height: 200,
    className: 'signature-canvas'
  }}
/>

// Key methods:
sigCanvas.current?.isEmpty() // Check if signed
sigCanvas.current?.toDataURL() // Export as base64
sigCanvas.current?.clear() // Reset
```

**Key Points:**
- **NEVER resize via CSS** - use canvasProps width/height to avoid zoom artifacts
- All methods accessed via ref, not props
- Responsive sizing: Set dimensions based on viewport or use fixed mobile-friendly size
- Export as base64 data URL for API submission

### API Integration Pattern

**Pattern:** Type-safe API calls with error handling

```typescript
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8001/api/v1';

export const checklistApi = {
  getInstance: async (instanceId: string) => {
    const response = await axios.get(`${API_BASE}/checklist-instances/${instanceId}`);
    return response.data;
  },

  submitResponse: async (instanceId: string, data: ChecklistResponse) => {
    const response = await axios.post(
      `${API_BASE}/checklist-instances/${instanceId}/responses`,
      data
    );
    return response.data;
  }
};
```

**Key Points:**
- Use environment variable for API URL
- Define TypeScript interfaces for request/response types
- Handle loading states and errors
- Show user-friendly error messages

## Requirements

### Functional Requirements

1. **Section-Based Checklist Display**
   - Description: Display checklist organized into collapsible sections with items
   - Acceptance: User can navigate between sections, see all items, and collapse/expand sections

2. **Response Input**
   - Description: Allow users to input responses for each checklist item (text, checkboxes, selections)
   - Acceptance: Responses are captured and saved per item, with visual feedback on completion status

3. **Photo Capture**
   - Description: Capture photos from mobile camera or select from gallery
   - Acceptance: User can add multiple photos per checklist item, preview photos, remove photos, photos upload successfully

4. **Digital Signature**
   - Description: Capture inspector's signature for checklist sign-off
   - Acceptance: User can draw signature, clear and retry, signature is captured as image data, signature is required for completion

5. **Progress Tracking**
   - Description: Show completion progress across sections
   - Acceptance: Visual indicator shows percentage complete, highlights incomplete required items

6. **Submission**
   - Description: Submit completed checklist with all responses, photos, and signature
   - Acceptance: All data submits successfully, user receives confirmation, checklist marked complete in inspection

### Edge Cases

1. **Network Interruption** - Save form state locally, allow retry on failed submission
2. **Large Photo Files** - Compress images before upload to prevent timeout/memory issues
3. **Signature Canvas Resize** - Handle device orientation changes without losing signature
4. **Missing Required Fields** - Prevent submission and highlight incomplete required items
5. **Camera Permission Denied** - Show helpful message, allow file selection fallback
6. **Multiple Photo Attachments** - Handle batch upload with progress indication

## Implementation Notes

### DO
- Use Material-UI components for consistent styling (Button, TextField, Card, etc.)
- Implement progressive saving - save responses as user completes items
- Use responsive design principles - test on various mobile screen sizes
- Compress photos before upload (consider image quality vs file size tradeoff)
- Store signature as base64 in separate field for easy retrieval
- Follow existing TypeScript typing patterns from codebase
- Use react-dropzone's mobile-friendly features (already installed)
- Set signature canvas dimensions via props, not CSS

### DON'T
- Don't create new file upload infrastructure - use existing `/files` endpoint
- Don't resize signature canvas with CSS - causes zoom artifacts
- Don't assume HTTPS in development (camera may not work on HTTP in production)
- Don't submit large uncompressed images
- Don't modify backend APIs - they already support all needed operations
- Don't add offline sync yet - future enhancement

## Development Environment

### Start Services

```bash
# Backend
cd backend
source venv/bin/activate  # or venv\Scripts\activate on Windows
uvicorn app.main:app --reload --port 8000

# Frontend
cd frontend
npm install  # Add react-signature-canvas if not installed
npm run dev
```

### Service URLs
- Frontend: http://localhost:3000
- Backend: http://localhost:8000
- API Docs: http://localhost:8000/docs

### Required Environment Variables

**Frontend (.env):**
```
VITE_API_URL=http://localhost:8001/api/v1
```

**Backend (.env):**
- `DATABASE_URL` - PostgreSQL connection
- `STORAGE_TYPE=local` - File storage (local or S3)
- `LOCAL_STORAGE_PATH=./uploads` - Local storage path
- All other variables per project_index.json

### Install New Dependencies

```bash
cd frontend
npm install react-signature-canvas
npm install --save-dev @types/react-signature-canvas
```

## Success Criteria

The task is complete when:

1. [ ] Mobile checklist page displays with sections, items, and navigation
2. [ ] User can capture photos using mobile camera via react-dropzone
3. [ ] User can draw and save digital signature
4. [ ] All checklist responses submit successfully to backend
5. [ ] Photos upload and associate with checklist instance
6. [ ] Signature saves with checklist completion
7. [ ] Progress indicator shows completion status
8. [ ] Form validates required fields before submission
9. [ ] Success confirmation shown after submission
10. [ ] No console errors
11. [ ] Responsive design works on mobile devices (320px - 768px widths)
12. [ ] Existing tests still pass

## QA Acceptance Criteria

**CRITICAL**: These criteria must be verified by the QA Agent before sign-off.

### Unit Tests
| Test | File | What to Verify |
|------|------|----------------|
| ChecklistSection renders items | `frontend/src/components/checklist/ChecklistSection.test.tsx` | Section displays items correctly, handles collapse/expand |
| PhotoCapture handles file selection | `frontend/src/components/checklist/PhotoCapture.test.tsx` | Accepts images, rejects invalid files, shows previews |
| SignaturePad captures signature | `frontend/src/components/checklist/SignaturePad.test.tsx` | Signature can be drawn and exported as data URL |
| useChecklistInstance hook fetches data | `frontend/src/hooks/useChecklistInstance.test.ts` | Hook fetches checklist, handles loading/error states |

### Integration Tests
| Test | Services | What to Verify |
|------|----------|----------------|
| Checklist submission | frontend ↔ backend | POST to /checklist-instances/{id}/responses succeeds with valid data |
| Photo upload | frontend ↔ backend | POST to /projects/{id}/files uploads image successfully |
| Checklist retrieval | frontend ↔ backend | GET /checklist-instances/{id} returns sections and items |

### End-to-End Tests
| Flow | Steps | Expected Outcome |
|------|-------|------------------|
| Complete inspection checklist | 1. Open mobile checklist 2. Fill responses 3. Capture photo 4. Sign 5. Submit | Checklist submits successfully, confirmation shown |
| Photo capture from camera | 1. Click photo button 2. Camera opens 3. Take photo 4. Photo previews | Photo captured and ready for upload |
| Signature capture | 1. Open signature pad 2. Draw signature 3. Save | Signature saves as image, can be cleared and redrawn |
| Validation on incomplete | 1. Leave required fields empty 2. Attempt submit | Validation errors show, submission blocked |

### Browser Verification (Mobile)
| Page/Component | URL | Checks |
|----------------|-----|--------|
| Mobile Checklist Page | `http://localhost:3000/projects/{id}/inspections/{id}/checklist` | Renders on mobile viewport (375x667), sections collapsible, scrolling works |
| Photo Capture | Mobile checklist page | Camera permission prompt appears (HTTPS only), file picker fallback works, previews display |
| Signature Pad | Mobile checklist page | Signature canvas responsive, drawing smooth, clear button works |
| Submission Flow | Mobile checklist page | Form submits, loading indicator shows, success message displays |

### Device Testing Checklist
- [ ] iOS Safari (iPhone)
- [ ] Android Chrome
- [ ] Tablet (iPad/Android) - 768px width
- [ ] Small phone - 320px width
- [ ] Test both portrait and landscape orientations

### API Verification
| Endpoint | Method | Payload | Expected |
|----------|--------|---------|----------|
| `/checklist-instances/{id}` | GET | - | Returns checklist with sections and items |
| `/checklist-instances/{id}/responses` | POST | `{item_id, value, photos}` | Creates response, returns ID |
| `/checklist-instances/{id}/responses/{id}` | PUT | `{value, photos}` | Updates response |
| `/projects/{id}/files` | POST | Form data with image | Uploads file, returns file object |
| `/projects/{id}/inspections/{id}/complete` | POST | `{signature}` | Marks inspection complete |

### Performance Checks
- [ ] Photo compression reduces file size by >70% without visible quality loss
- [ ] Page loads in <2s on 3G connection
- [ ] Signature canvas responds to touch within 50ms
- [ ] Form submission completes in <3s with 5 photos

### Security Checks
- [ ] Camera access only requests permission when needed
- [ ] Photo upload uses authenticated API endpoint
- [ ] Signature data transmitted securely (HTTPS in production)
- [ ] No sensitive data logged to console

### QA Sign-off Requirements
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] All E2E tests pass
- [ ] Browser verification complete on iOS and Android
- [ ] Device testing complete (minimum 2 physical devices)
- [ ] API endpoints respond correctly
- [ ] Performance benchmarks met
- [ ] Security checks passed
- [ ] No regressions in existing checklist functionality
- [ ] Code follows established React/TypeScript patterns
- [ ] No critical accessibility issues (touch targets >44px, sufficient contrast)
- [ ] Design matches reference screenshot (21-checklist-mobile.png)

### Known Constraints
- **HTTPS Required**: Camera access via WebRTC requires HTTPS in production (localhost exempt)
- **Browser Compatibility**: Signature canvas may have slight rendering differences across browsers
- **File Size Limits**: Enforce max photo size (5MB per image) to prevent upload failures
- **Signature Canvas**: Never resize with CSS - always use canvasProps dimensions
