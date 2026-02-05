# Specification: Create Material Inventory Grid

## Overview

Create a Material Inventory Grid component that displays material items in a card-based layout with quantity information. This feature will provide construction project managers with a visual overview of material inventory, enabling them to quickly assess quantities and material status at a glance. The design will follow the reference image `17-material-inventory.png`.

## Workflow Type

**Type**: feature

**Rationale**: This is a new UI feature that adds material inventory visualization capabilities to the platform. It requires creating new components and integrating with existing backend APIs to display material data in a card grid format.

## Task Scope

### Services Involved
- **frontend** (primary) - Create the grid component, card layout, and integrate with materials API
- **backend** (integration) - Use existing materials API endpoints for data fetching

### This Task Will:
- [ ] Create a new MaterialInventoryGrid component to display materials
- [ ] Implement card-based layout showing material details and quantities
- [ ] Integrate with existing `/projects/{project_id}/materials` API endpoint
- [ ] Display material information in an organized, scannable grid format
- [ ] Match the visual design from reference image `17-material-inventory.png`
- [ ] Ensure responsive layout for different screen sizes

### Out of Scope:
- Backend API modifications (using existing endpoints)
- Material creation or editing functionality (view-only grid)
- Advanced filtering or search features (initial MVP)
- Material template management
- Export or reporting features

## Service Context

### Frontend

**Tech Stack:**
- Language: TypeScript
- Framework: React
- Key directories: src/
- UI Library: Material-UI (@mui/material)
- Grid Components: @mui/x-data-grid (available)
- Styling: Emotion

**Entry Point:** `src/App.tsx`

**How to Run:**
```bash
cd frontend
npm run dev
```

**Port:** 3000

**Key Dependencies:**
- `@mui/material` - UI components
- `@mui/x-data-grid` - Data grid component (if needed)
- `axios` - API calls
- `react` - UI framework

### Backend

**Tech Stack:**
- Language: Python
- Framework: FastAPI
- ORM: SQLAlchemy
- Database: PostgreSQL

**Existing Materials API Endpoints:**
- `GET /api/v1/projects/{project_id}/materials` - Fetch all materials for a project
- `GET /api/v1/projects/{project_id}/materials/{material_id}` - Fetch single material
- `POST /api/v1/projects/{project_id}/materials` - Create material (not needed for this task)
- `PUT /api/v1/projects/{project_id}/materials/{material_id}` - Update material (not needed)
- `DELETE /api/v1/projects/{project_id}/materials/{material_id}` - Delete material (not needed)

**Port:** 8000

## Files to Modify

| File | Service | What to Change |
|------|---------|---------------|
| `frontend/src/components/materials/MaterialInventoryGrid.tsx` | frontend | Create new component for material inventory grid (new file) |
| `frontend/src/components/materials/MaterialCard.tsx` | frontend | Create new card component to display individual materials (new file) |
| `frontend/src/api/materials.ts` | frontend | Add API function to fetch materials (if not exists) |
| `frontend/src/types/material.ts` | frontend | Add TypeScript interfaces for Material type (if not exists) |
| `frontend/src/pages/Materials/MaterialsPage.tsx` | frontend | Integrate MaterialInventoryGrid into materials page (or create new page) |

## Files to Reference

These files show patterns to follow:

| File | Pattern to Copy |
|------|----------------|
| Existing MUI components in `frontend/src/components/` | MUI component structure and styling patterns |
| Existing API integration files in `frontend/src/api/` | API call patterns with axios and error handling |
| Existing type definitions in `frontend/src/types/` | TypeScript interface patterns |
| Other grid/card layouts in the application | Layout and responsive design patterns |

## Patterns to Follow

### MUI Component Pattern

Standard MUI component structure:

```typescript
import { Box, Card, CardContent, Typography, Grid } from '@mui/material';
import { styled } from '@mui/material/styles';

// Use styled components for custom styling
const StyledCard = styled(Card)(({ theme }) => ({
  // Custom styles here
}));

export const ComponentName: React.FC<Props> = ({ ...props }) => {
  return (
    <Box>
      {/* Component content */}
    </Box>
  );
};
```

**Key Points:**
- Use MUI components for consistent design
- Leverage Grid component for responsive layouts
- Use styled() for custom component styles
- Follow Emotion styling patterns

### API Integration Pattern

Standard API call structure:

```typescript
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export const fetchMaterials = async (projectId: string) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/projects/${projectId}/materials`);
    return response.data;
  } catch (error) {
    console.error('Error fetching materials:', error);
    throw error;
  }
};
```

**Key Points:**
- Use axios for API calls
- Handle errors appropriately
- Use environment variables for API base URL
- Return typed responses

### Card Grid Layout Pattern

Responsive card grid using MUI Grid:

```typescript
<Grid container spacing={2}>
  {items.map((item) => (
    <Grid item xs={12} sm={6} md={4} lg={3} key={item.id}>
      <Card>
        {/* Card content */}
      </Card>
    </Grid>
  ))}
</Grid>
```

**Key Points:**
- Use Grid container with spacing
- Define responsive breakpoints (xs, sm, md, lg)
- Map over data to create cards
- Include proper key props

## Requirements

### Functional Requirements

1. **Display Material Cards**
   - Description: Render each material as a card with visual hierarchy
   - Acceptance: Each material appears as a distinct card with clear separation

2. **Show Material Quantities**
   - Description: Display quantity information prominently on each card
   - Acceptance: Quantity is visible and clearly labeled on each material card

3. **Fetch Materials from API**
   - Description: Retrieve material data from existing backend endpoint
   - Acceptance: Component successfully fetches and displays materials for a given project

4. **Responsive Grid Layout**
   - Description: Grid adapts to different screen sizes
   - Acceptance: Cards rearrange appropriately on mobile, tablet, and desktop views

5. **Loading and Error States**
   - Description: Show appropriate UI during data loading and on errors
   - Acceptance: Loading indicator appears while fetching, error message shown on failure

6. **Match Design Reference**
   - Description: Visual design matches `17-material-inventory.png`
   - Acceptance: Layout, spacing, and visual elements match the reference image

### Edge Cases

1. **Empty State** - Display helpful message when no materials exist in the project
2. **Large Datasets** - Handle projects with many materials efficiently (pagination or virtualization may be needed)
3. **Missing Data** - Gracefully handle materials with incomplete information
4. **API Errors** - Show user-friendly error messages when API calls fail
5. **Zero Quantities** - Clearly indicate materials with zero quantity (visual distinction)

## Implementation Notes

### DO
- Use existing MUI components for consistency (Card, Grid, Typography)
- Follow the project's existing component structure and file organization
- Implement TypeScript interfaces for type safety
- Include proper error handling for API calls
- Use the existing axios instance for API calls
- Make the grid responsive using MUI Grid breakpoints
- Add loading states using MUI CircularProgress or Skeleton components
- Reference `17-material-inventory.png` for exact visual specifications

### DON'T
- Don't modify backend API endpoints (use existing ones)
- Don't add complex filtering/search in initial implementation
- Don't create new material CRUD functionality (view-only for now)
- Don't reinvent layout patterns - use MUI Grid system
- Don't hardcode API URLs - use environment variables

## Development Environment

### Start Services

```bash
# Terminal 1 - Backend
cd backend
# Activate virtual environment if needed
uvicorn app.main:app --reload --port 8000

# Terminal 2 - Frontend
cd frontend
npm run dev
# Runs on port 3000
```

### Service URLs
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

### Required Environment Variables
- `VITE_API_URL`: Backend API URL (default: `http://localhost:8000/api/v1`)

## Success Criteria

The task is complete when:

1. [ ] MaterialInventoryGrid component displays materials in a card grid layout
2. [ ] Each card shows material name, description, and quantity
3. [ ] Grid is responsive across mobile, tablet, and desktop views
4. [ ] Component successfully fetches materials from `/projects/{project_id}/materials` endpoint
5. [ ] Loading state displays while fetching data
6. [ ] Error state shows user-friendly message when API fails
7. [ ] Empty state displays when no materials exist
8. [ ] Visual design matches reference image `17-material-inventory.png`
9. [ ] No console errors in browser
10. [ ] Existing tests still pass
11. [ ] Component integrates into the appropriate page/route
12. [ ] TypeScript types are properly defined with no type errors

## QA Acceptance Criteria

**CRITICAL**: These criteria must be verified by the QA Agent before sign-off.

### Unit Tests
| Test | File | What to Verify |
|------|------|----------------|
| MaterialInventoryGrid renders | `frontend/src/components/materials/__tests__/MaterialInventoryGrid.test.tsx` | Component renders without crashing |
| MaterialCard renders with props | `frontend/src/components/materials/__tests__/MaterialCard.test.tsx` | Card displays material data correctly |
| API integration | `frontend/src/api/__tests__/materials.test.ts` | API calls work correctly with mock data |
| Empty state handling | `frontend/src/components/materials/__tests__/MaterialInventoryGrid.test.tsx` | Shows empty state when no materials |
| Loading state | `frontend/src/components/materials/__tests__/MaterialInventoryGrid.test.tsx` | Shows loading indicator while fetching |

### Integration Tests
| Test | Services | What to Verify |
|------|----------|----------------|
| Fetch materials from API | frontend ↔ backend | Grid successfully fetches and displays materials from backend |
| Error handling | frontend ↔ backend | Proper error message when API is unavailable |
| Project context | frontend ↔ backend | Correct project_id is passed to API endpoint |

### End-to-End Tests
| Flow | Steps | Expected Outcome |
|------|-------|------------------|
| View Material Inventory | 1. Navigate to materials page 2. View grid | Materials display in card grid format with quantities |
| Responsive behavior | 1. Resize browser window 2. View on different devices | Grid adapts layout at different breakpoints |
| Error recovery | 1. Disconnect backend 2. View error 3. Reconnect backend 4. Retry | Error state displays, then recovers on retry |

### Browser Verification (if frontend)
| Page/Component | URL | Checks |
|----------------|-----|--------|
| Material Inventory Grid | `http://localhost:3000/materials` (or integrated page) | Grid displays, cards are properly styled, quantities visible |
| Mobile view | Same URL on mobile viewport | Grid stacks vertically, cards remain readable |
| Loading state | Same URL (throttle network) | Loading spinner displays before content |
| Empty state | Project with no materials | Empty state message displays |

### Database Verification (if applicable)
| Check | Query/Command | Expected |
|-------|---------------|----------|
| Materials exist | `SELECT * FROM materials WHERE project_id = ?` | Query returns materials for testing |

### Visual Verification
| Check | Reference | Expected |
|-------|-----------|----------|
| Design match | `17-material-inventory.png` | Layout, spacing, typography match reference |
| Card layout | Reference image | Cards show material name, quantity, and other details |
| Grid spacing | Reference image | Consistent spacing between cards |
| Typography | Reference image | Font sizes and weights match design |

### QA Sign-off Requirements
- [ ] All unit tests pass
- [ ] Integration with backend API works correctly
- [ ] Browser verification complete on Chrome, Firefox, Safari
- [ ] Mobile responsiveness verified (iPhone and Android viewports)
- [ ] Visual design matches `17-material-inventory.png` reference
- [ ] Loading and error states work correctly
- [ ] Empty state displays appropriately
- [ ] No TypeScript errors or warnings
- [ ] No console errors or warnings in browser
- [ ] No regressions in existing functionality
- [ ] Code follows established React/TypeScript patterns
- [ ] Component is properly typed with TypeScript
- [ ] Performance is acceptable (renders smoothly with 50+ materials)
