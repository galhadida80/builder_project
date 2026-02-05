# Specification: Create Finding Documentation Card Component

## Overview

Create a reusable React component to display and manage inspection findings in a comprehensive card format. The component will display finding details including severity level, photos, location, description, and provide actions for assignment and resolution. This addresses the need for a structured, visual way to document and track construction inspection findings as specified in Linear issue BUI-75.

## Workflow Type

**Type**: feature

**Rationale**: This is a new UI component being added to the inspection management system. It introduces new functionality for displaying finding documentation in a card format, following a provided design specification (22-finding-card.png).

## Task Scope

### Services Involved
- **frontend** (primary) - React/TypeScript component implementation with Material-UI
- **backend** (integration) - Existing API endpoints for finding data management

### This Task Will:
- [ ] Create a new `FindingDocumentationCard` React component in the frontend
- [ ] Implement severity badge selection UI (Critical, High, Medium, Low)
- [ ] Build a photo gallery display with captions and thumbnails
- [ ] Add location display with icon and editable field
- [ ] Display finding description with proper formatting
- [ ] Show inspector metadata (name, timestamp)
- [ ] Implement action buttons (Assign, Resolve, Add Photo)
- [ ] Integrate with existing finding data types and API
- [ ] Follow existing Material-UI and Emotion styling patterns

### Out of Scope:
- Backend API modifications (existing endpoints are sufficient)
- Photo upload functionality (will use existing file upload system)
- Finding creation/deletion logic (component focuses on display/edit)
- Inspector assignment workflow implementation (button placeholder only)
- Database schema changes

## Service Context

### Frontend

**Tech Stack:**
- Language: TypeScript
- Framework: React
- UI Library: Material-UI (MUI)
- Styling: Emotion
- Build Tool: Vite
- Key directories: `src/components`, `src/pages`, `src/api`, `src/types`

**Entry Point:** `src/App.tsx`

**How to Run:**
```bash
cd frontend
npm run dev
```

**Port:** 3000

**Key Dependencies:**
- `@mui/material` - UI component library
- `@mui/icons-material` - Icon components
- `@emotion/react`, `@emotion/styled` - CSS-in-JS styling
- `react-dropzone` - File upload handling
- `axios` - API requests

### Backend

**Tech Stack:**
- Language: Python
- Framework: FastAPI
- ORM: SQLAlchemy
- Database: PostgreSQL

**How to Run:**
```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

**Port:** 8000

**Relevant API Endpoints:**
- `GET /projects/{project_id}/inspections/{inspection_id}` - Get inspection with findings
- `POST /projects/{project_id}/inspections/{inspection_id}/findings` - Create finding
- `PUT /inspections/findings/{finding_id}` - Update finding
- `POST /projects/{project_id}/files` - Upload photos
- `GET /storage/{path}` - Retrieve uploaded files

## Files to Modify

| File | Service | What to Change |
|------|---------|---------------|
| *New file* `frontend/src/components/inspections/FindingDocumentationCard.tsx` | frontend | Create new component file for finding card |
| `frontend/src/pages/InspectionsPage.tsx` | frontend | Import and use new FindingDocumentationCard component |
| `frontend/src/types/index.ts` | frontend | Add any missing TypeScript interfaces if needed |

## Files to Reference

These files show patterns to follow:

| File | Pattern to Copy |
|------|----------------|
| `frontend/src/components/ui/Card.tsx` | Card component structure, StyledCard pattern, Material-UI composition |
| `frontend/src/components/ui/StatusBadge.tsx` | SeverityBadge component usage and styling patterns |
| `frontend/src/pages/InspectionsPage.tsx` | How findings are currently displayed, API integration patterns |
| `frontend/src/api/inspections.ts` | API methods for finding CRUD operations |
| `design-assets/inspection/22-finding-card.png` | Visual design reference for layout and styling |

## Patterns to Follow

### Pattern 1: Card Component Composition

From `frontend/src/components/ui/Card.tsx`:

```typescript
import { Card as MuiCard, CardContent } from '@mui/material'
import { styled } from '@mui/material/styles'

const StyledCard = styled(MuiCard)(({ theme }) => ({
  borderRadius: 12,
  transition: 'all 200ms ease-out',
  // ... styling
}))

export function MyCard({ children, ...props }) {
  return (
    <StyledCard {...props}>
      <CardContent sx={{ p: 2.5 }}>
        {children}
      </CardContent>
    </StyledCard>
  )
}
```

**Key Points:**
- Use `styled()` from Material-UI for custom styling
- Extend MuiCard rather than creating from scratch
- Use theme-based spacing (`p: 2.5`) and borderRadius values
- Apply consistent transitions for interactivity

### Pattern 2: Severity Badge Display

From `frontend/src/components/ui/StatusBadge.tsx`:

```typescript
export function SeverityBadge({ severity, size = 'small' }: SeverityBadgeProps) {
  const colors: Record<string, { bg: string; text: string }> = {
    critical: { bg: '#FEE2E2', text: '#DC2626' },
    high: { bg: '#FFEDD5', text: '#EA580C' },
    medium: { bg: '#FEF3C7', text: '#CA8A04' },
    low: { bg: '#F1F5F9', text: '#64748B' },
  }

  const config = colors[severity] || colors.low

  return (
    <Chip
      label={severity.charAt(0).toUpperCase() + severity.slice(1)}
      size={size}
      sx={{
        bgcolor: config.bg,
        color: config.text,
        fontWeight: 600,
        fontSize: '0.7rem',
        borderRadius: 1,
      }}
    />
  )
}
```

**Key Points:**
- Use MUI Chip component for badges
- Define consistent color palette for severity levels
- Support size variations (small/medium)
- Apply custom styling via sx prop

### Pattern 3: TypeScript Interface Definition

From `frontend/src/types/index.ts`:

```typescript
export type FindingSeverity = 'low' | 'medium' | 'high' | 'critical'
export type FindingStatus = 'open' | 'resolved'

export interface Finding {
  id: string
  inspectionId: string
  title: string
  description?: string
  severity: FindingSeverity
  status: FindingStatus
  location?: string
  photos?: string[]
  createdAt: string
  updatedAt: string
  createdBy?: User
}
```

**Key Points:**
- Use strict typing for enums (severity, status)
- Make optional fields explicit with `?`
- Use existing User type for creator information
- Follow camelCase naming convention

### Pattern 4: API Integration

From `frontend/src/api/inspections.ts`:

```typescript
export const inspectionsApi = {
  updateFinding: async (findingId: string, data: Partial<Finding>): Promise<Finding> => {
    const response = await apiClient.put(`/inspections/findings/${findingId}`, data)
    return response.data
  }
}
```

**Key Points:**
- Use apiClient for all HTTP requests
- Return typed responses (Promise<Finding>)
- Use Partial<T> for update operations
- Handle errors with try/catch at component level

## Requirements

### Functional Requirements

1. **Display Finding Header**
   - Description: Show finding title with ID number (e.g., "Finding #1024 - Critical Structural Issue")
   - Acceptance: Title displays with proper formatting, ID is visible, clicking navigates to finding detail

2. **Severity Badge Selection**
   - Description: Display current severity level with visual badge, allow selection between Critical/High/Medium/Low
   - Acceptance: Current severity highlighted, clicking badge updates severity via API, visual feedback on change

3. **Photo Gallery Display**
   - Description: Show uploaded photos as thumbnails with captions, support viewing full-size images
   - Acceptance: Photos display in grid layout, captions show below each photo, clicking opens full-size view

4. **Location Information**
   - Description: Display finding location with pin icon, support editing location text
   - Acceptance: Location shows with red pin icon, inline editing works, changes persist via API

5. **Description Display**
   - Description: Show finding description in formatted text area
   - Acceptance: Multi-line text displays correctly, wrapping works, description is readable

6. **Inspector Metadata**
   - Description: Show inspector name and timestamp at bottom of card
   - Acceptance: Inspector name from createdBy field, timestamp formatted as "YYYY-MM-DD HH:MM:SS"

7. **Action Buttons**
   - Description: Provide Assign (blue), Resolve (green), and Add Photo (gray) buttons
   - Acceptance: Buttons styled per design, correct icons, click handlers trigger appropriate actions

### Edge Cases

1. **Missing Photos** - Display placeholder image or "No photos" message when photos array is empty
2. **Long Descriptions** - Truncate or scroll description text if exceeds card height
3. **No Location** - Show "Location not specified" placeholder when location field is null
4. **Unknown Inspector** - Display "Unknown" if createdBy is null or undefined
5. **API Errors** - Show error toast notification if severity update or other API calls fail
6. **Loading States** - Display skeleton placeholders while finding data is loading

## Implementation Notes

### DO
- Follow the existing Card component pattern from `frontend/src/components/ui/Card.tsx`
- Reuse `SeverityBadge` component from `frontend/src/components/ui/StatusBadge.tsx`
- Use Material-UI Box, Typography, and IconButton components for layout
- Implement responsive design using MUI's sx prop and breakpoints
- Use the existing `inspectionsApi.updateFinding()` method for updates
- Add proper TypeScript types for all props and state
- Include loading and error states in the component
- Follow the design specification in `design-assets/inspection/22-finding-card.png`
- Use Emotion styled components for custom styling needs
- Implement optimistic UI updates for better UX

### DON'T
- Create custom badge components when SeverityBadge exists
- Make direct API calls without using the inspectionsApi service
- Hardcode colors or spacing - use theme values
- Implement photo upload in this component (use existing upload modal)
- Create new TypeScript interfaces if Finding type already exists
- Override Material-UI default styles unnecessarily
- Ignore loading/error states
- Break responsive design on mobile devices

## Development Environment

### Start Services

```bash
# Terminal 1 - Backend
cd backend
source venv/bin/activate  # or venv\Scripts\activate on Windows
uvicorn app.main:app --reload --port 8000

# Terminal 2 - Frontend
cd frontend
npm run dev

# Terminal 3 - Database (if not running)
docker-compose up db redis
```

### Service URLs
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

### Required Environment Variables

**Frontend** (`.env`):
- `VITE_API_URL`: http://localhost:8000/api/v1

**Backend** (`.env`):
- `DATABASE_URL`: postgresql+asyncpg://localhost:5432/builder_db
- `STORAGE_TYPE`: local
- `LOCAL_STORAGE_PATH`: ./uploads

## Success Criteria

The task is complete when:

1. [ ] FindingDocumentationCard component created and renders finding data correctly
2. [ ] Severity badges display with proper colors and support selection
3. [ ] Photo gallery shows thumbnails with captions
4. [ ] Location displays with pin icon and supports editing
5. [ ] Description shows formatted text
6. [ ] Inspector name and timestamp display at bottom
7. [ ] Action buttons (Assign, Resolve, Add Photo) render with correct styling
8. [ ] Component integrates with InspectionsPage without errors
9. [ ] TypeScript types are properly defined with no type errors
10. [ ] Responsive design works on mobile and desktop
11. [ ] No console errors or warnings
12. [ ] Existing tests still pass
13. [ ] New functionality verified via browser

## QA Acceptance Criteria

**CRITICAL**: These criteria must be verified by the QA Agent before sign-off.

### Unit Tests
| Test | File | What to Verify |
|------|------|----------------|
| FindingDocumentationCard renders correctly | `frontend/src/components/inspections/FindingDocumentationCard.test.tsx` | Component renders with finding data, all sections visible |
| Severity badge selection updates finding | `frontend/src/components/inspections/FindingDocumentationCard.test.tsx` | Clicking severity badge calls API with correct payload |
| Photo gallery displays images | `frontend/src/components/inspections/FindingDocumentationCard.test.tsx` | Photos render as thumbnails, clicking opens full view |
| Location editing works | `frontend/src/components/inspections/FindingDocumentationCard.test.tsx` | Location field editable, changes persist via API |
| Action buttons trigger callbacks | `frontend/src/components/inspections/FindingDocumentationCard.test.tsx` | Assign, Resolve, Add Photo buttons call correct handlers |

### Integration Tests
| Test | Services | What to Verify |
|------|----------|----------------|
| Finding data loads from API | frontend ↔ backend | GET /projects/{id}/inspections/{id} returns finding data |
| Severity update persists | frontend ↔ backend | PUT /inspections/findings/{id} updates severity in database |
| Photos display from storage | frontend ↔ backend | GET /storage/{path} returns uploaded images |

### End-to-End Tests
| Flow | Steps | Expected Outcome |
|------|-------|------------------|
| View Finding Card | 1. Navigate to InspectionsPage 2. Click on inspection with findings 3. View finding card | Finding card displays with all data sections populated |
| Update Severity | 1. Click on severity badge 2. Select different severity 3. Verify update | Severity changes visually, API called, database updated |
| View Photos | 1. Scroll to photo gallery 2. Click on photo thumbnail | Full-size photo displays in modal or lightbox |

### Browser Verification (if frontend)
| Page/Component | URL | Checks |
|----------------|-----|--------|
| InspectionsPage | `http://localhost:3000/projects/{id}/inspections` | Finding cards render in list or detail view |
| FindingDocumentationCard | Component within InspectionsPage | Severity badges, photos, location, description all visible |
| Responsive Layout | Same URL, resize browser | Card layout adapts to mobile (320px), tablet (768px), desktop (1024px+) |

### Database Verification (if applicable)
| Check | Query/Command | Expected |
|-------|---------------|----------|
| Finding exists | `SELECT * FROM findings WHERE id = '{finding_id}'` | Finding record with severity, location, photos fields |
| Severity update persists | Update severity via UI, then query | Database shows new severity value |
| Photos array stored | `SELECT photos FROM findings WHERE id = '{finding_id}'` | JSONB array contains photo URLs |

### QA Sign-off Requirements
- [ ] All unit tests pass (5 tests minimum)
- [ ] Integration tests verify API communication
- [ ] E2E test completes full finding card workflow
- [ ] Browser verification shows responsive design working
- [ ] Database state verified after severity update
- [ ] No regressions in existing InspectionsPage functionality
- [ ] Code follows established Material-UI and TypeScript patterns
- [ ] No security vulnerabilities (XSS via description field)
- [ ] Component matches design specification (22-finding-card.png)
- [ ] No console errors or warnings during testing
- [ ] Photo gallery handles missing images gracefully
- [ ] Loading states display skeleton UI
- [ ] Error states show user-friendly messages
