# Specification: Create Finding Documentation Card

## Overview

Create a reusable Finding Documentation Card component for the construction inspection platform. This card will display inspection findings with severity badges and photo attachments, following the design specified in `22-finding-card.png`. The component will be used within the inspections module to document issues discovered during site inspections.

## Workflow Type

**Type**: feature

**Rationale**: This is a new UI component that adds functionality to the inspections module. It requires creating a new React component with associated types, styling, and integration with existing inspection data structures.

## Task Scope

### Services Involved
- **frontend** (primary) - Create the Finding Documentation Card React component
- **backend** (reference) - API already exists for findings data

### This Task Will:
- [ ] Create a Finding Documentation Card component with severity badge display
- [ ] Implement photo/image display within the card
- [ ] Add TypeScript types for finding data structure
- [ ] Style the component following the reference design (22-finding-card.png)
- [ ] Integrate with existing inspection findings API
- [ ] Ensure responsive design and accessibility

### Out of Scope:
- Backend API modifications (findings endpoints already exist)
- Creating new database models
- Implementing finding creation/edit forms
- Photo upload functionality (assumes photos already attached to findings)

## Service Context

### Frontend

**Tech Stack:**
- Language: TypeScript
- Framework: React
- Key directories: src/
- Build Tool: Vite
- Styling: Emotion (CSS-in-JS)
- Component Library: Material-UI (MUI)

**Entry Point:** `src/App.tsx`

**How to Run:**
```bash
cd frontend
npm run dev
```

**Port:** 3000

**Key Dependencies:**
- @emotion/react, @emotion/styled - CSS-in-JS styling
- @mui/material, @mui/icons-material - UI components and icons
- react-router-dom - Routing
- axios - HTTP client for API calls

### Backend (Reference Only)

**Tech Stack:**
- Language: Python
- Framework: FastAPI
- ORM: SQLAlchemy

**Relevant API Endpoints:**
- `POST /projects/{project_id}/inspections/{inspection_id}/findings` - Create finding
- `PUT /inspections/findings/{finding_id}` - Update finding
- Findings are nested under inspections

**How to Run:**
```bash
cd backend
uvicorn app.main:app --reload
```

**Port:** 8000

## Files to Modify

| File | Service | What to Change |
|------|---------|---------------|
| `frontend/src/components/inspections/FindingCard.tsx` | frontend | Create new component for finding documentation card |
| `frontend/src/types/inspection.ts` | frontend | Add Finding type definition with severity and photos |
| `frontend/src/components/inspections/index.ts` | frontend | Export new FindingCard component |

## Files to Reference

These files show patterns to follow:

| File | Pattern to Copy |
|------|----------------|
| `frontend/src/components/` (existing MUI card components) | Card layout patterns, MUI component usage |
| `frontend/src/types/` (existing type files) | TypeScript type definition patterns |
| `frontend/src/` (existing Emotion styled components) | CSS-in-JS styling patterns with Emotion |

## Patterns to Follow

### MUI Card Component Pattern

The project uses Material-UI components. The FindingCard should follow MUI patterns:

```typescript
import { Card, CardContent, CardMedia, Typography, Chip } from '@mui/material';
import { styled } from '@emotion/styled';

// Use MUI Card as base with Emotion for custom styling
const StyledCard = styled(Card)`
  /* Custom styles */
`;
```

**Key Points:**
- Use MUI Card, CardContent, CardMedia for structure
- Use Emotion's `styled` for custom styling
- Use MUI Chip component for severity badges
- Follow MUI theming conventions

### TypeScript Type Definitions

Define clear interfaces for finding data:

```typescript
interface Finding {
  id: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  photos: Photo[];
  created_at: string;
  location?: string;
}

interface Photo {
  id: string;
  url: string;
  thumbnail_url?: string;
  caption?: string;
}
```

**Key Points:**
- Use discriminated unions for severity levels
- Include optional fields for flexible usage
- Match backend API response structure

### Photo Display Pattern

For displaying photos, use MUI's CardMedia or ImageList:

```typescript
<CardMedia
  component="img"
  height="200"
  image={photo.url}
  alt={photo.caption || 'Finding photo'}
/>
```

**Key Points:**
- Handle multiple photos (gallery view)
- Show thumbnails for performance
- Include alt text for accessibility
- Support click-to-enlarge functionality

## Requirements

### Functional Requirements

1. **Severity Badge Display**
   - Description: Display severity level as a colored badge/chip
   - Severity levels: Critical (red), High (orange), Medium (yellow), Low (blue)
   - Acceptance: Badge color matches severity level and is clearly visible

2. **Photo Display**
   - Description: Show attached photos within the card
   - Support multiple photos in a gallery layout
   - Acceptance: Photos load and display correctly, with fallback for missing images

3. **Finding Information**
   - Description: Display finding description, date, location
   - Clear typography hierarchy
   - Acceptance: All finding metadata is readable and well-organized

4. **Responsive Design**
   - Description: Card adapts to mobile, tablet, and desktop viewports
   - Acceptance: Card looks good and is usable on all screen sizes

### Edge Cases

1. **No Photos Attached** - Show placeholder or hide photo section entirely
2. **Very Long Descriptions** - Truncate with "Read more" or show in expandable section
3. **Missing Severity** - Default to "medium" or show "unclassified"
4. **Image Load Failures** - Show broken image placeholder with retry option
5. **Accessibility** - Ensure screen readers can navigate card content

## Implementation Notes

### DO
- Follow MUI component patterns used elsewhere in the codebase
- Use Emotion for styling to match project conventions
- Define TypeScript interfaces in `src/types/inspection.ts`
- Use MUI Chip component for severity badges with appropriate colors
- Handle photo arrays gracefully (0, 1, or many photos)
- Add proper ARIA labels for accessibility
- Use existing theme colors and spacing from MUI theme
- Make the component reusable and prop-driven

### DON'T
- Create custom card components from scratch (use MUI Card)
- Hard-code severity colors (use theme or constants)
- Make API calls within the component (pass data as props)
- Implement photo upload in this component (out of scope)
- Create new CSS files (use Emotion CSS-in-JS)

## Development Environment

### Start Services

```bash
# Terminal 1 - Frontend
cd frontend
npm run dev

# Terminal 2 - Backend (if testing API integration)
cd backend
uvicorn app.main:app --reload --port 8000

# Terminal 3 - Database (if needed)
docker-compose up db
```

### Service URLs
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

### Required Environment Variables
- `VITE_API_URL`: http://localhost:8001/api/v1 (frontend)

## Success Criteria

The task is complete when:

1. [ ] FindingCard component created in `frontend/src/components/inspections/FindingCard.tsx`
2. [ ] TypeScript types defined for Finding and related data structures
3. [ ] Severity badges display with appropriate colors (critical/high/medium/low)
4. [ ] Photos display in the card with proper layout
5. [ ] Component is responsive and works on mobile/tablet/desktop
6. [ ] Component matches the reference design (22-finding-card.png)
7. [ ] No console errors or warnings
8. [ ] Component can be imported and used in other parts of the application
9. [ ] Accessibility: keyboard navigation and screen reader support

## QA Acceptance Criteria

**CRITICAL**: These criteria must be verified by the QA Agent before sign-off.

### Unit Tests
| Test | File | What to Verify |
|------|------|----------------|
| FindingCard renders with props | `frontend/src/components/inspections/FindingCard.test.tsx` | Component renders without errors when provided valid props |
| Severity badge color mapping | `frontend/src/components/inspections/FindingCard.test.tsx` | Each severity level renders correct color badge |
| Photo handling | `frontend/src/components/inspections/FindingCard.test.tsx` | Component handles 0, 1, and multiple photos correctly |
| Missing data handling | `frontend/src/components/inspections/FindingCard.test.tsx` | Component handles optional fields gracefully |

### Integration Tests
| Test | Services | What to Verify |
|------|----------|----------------|
| Finding data from API | frontend ↔ backend | Component correctly displays findings fetched from backend API |

### End-to-End Tests
| Flow | Steps | Expected Outcome |
|------|-------|------------------|
| View inspection findings | 1. Navigate to inspection detail page 2. Scroll to findings section | Finding cards display with severity badges and photos |

### Browser Verification (if frontend)
| Page/Component | URL | Checks |
|----------------|-----|--------|
| FindingCard in Storybook/Isolation | `http://localhost:3000` (component demo page) | Card displays correctly, severity colors are accurate, photos load |
| FindingCard in Inspection Page | `http://localhost:3000/projects/{id}/inspections/{id}` | Card integrates properly in parent context |

**Visual Checks:**
- [ ] Severity badge colors match reference design (22-finding-card.png)
- [ ] Card layout matches reference design
- [ ] Photos display with proper aspect ratio and sizing
- [ ] Typography is clear and hierarchical
- [ ] Spacing and padding are consistent with design system
- [ ] Responsive behavior works on mobile (< 768px), tablet (768-1024px), desktop (> 1024px)

**Accessibility Checks:**
- [ ] Tab navigation works through all interactive elements
- [ ] Screen reader announces severity level correctly
- [ ] Images have descriptive alt text
- [ ] Color contrast meets WCAG AA standards (severity badges still readable)
- [ ] Focus indicators are visible

### Database Verification (if applicable)
Not applicable - this is a read-only display component with no database modifications.

### QA Sign-off Requirements
- [ ] All unit tests pass
- [ ] Component renders correctly with various finding data
- [ ] Severity badges display with correct colors
- [ ] Photos display properly (or gracefully handle absence)
- [ ] Browser verification complete (visual checks match reference design)
- [ ] No regressions in existing functionality
- [ ] Code follows established patterns (MUI + Emotion + TypeScript)
- [ ] No console errors or warnings
- [ ] Component is accessible (keyboard + screen reader)
- [ ] Responsive design works on all viewport sizes
