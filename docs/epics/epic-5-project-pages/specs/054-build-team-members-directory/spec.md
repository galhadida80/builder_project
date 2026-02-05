# Specification: Build Team Members Directory

## Overview

Build a team members directory page that displays all team members in a card-based layout. Each card will show member information including their roles. This feature leverages the existing `/team-members` API endpoint and follows the design reference in `19-team-members.png`.

## Workflow Type

**Type**: feature

**Rationale**: This is a new user-facing feature that adds a complete team members directory page to the application. It involves creating new UI components, integrating with existing backend APIs, and adding a new route to the frontend application.

## Task Scope

### Services Involved
- **frontend** (primary) - Create team members directory page and member card components
- **backend** (integration) - Consume existing `/team-members` API endpoint

### This Task Will:
- [ ] Create a new team members directory page
- [ ] Build reusable member card components displaying name, roles, and other info
- [ ] Integrate with existing `/team-members` API endpoint
- [ ] Implement responsive grid layout for member cards
- [ ] Add navigation to the team members directory
- [ ] Style components using MUI and Emotion (existing stack)

### Out of Scope:
- Backend API modifications (endpoint already exists)
- User profile editing functionality
- Team member management (add/remove/edit)
- Authentication/authorization changes
- Database schema modifications

## Service Context

### Frontend

**Tech Stack:**
- Language: TypeScript
- Framework: Next.js
- Styling: Emotion + MUI (Material-UI)
- State Management: React hooks
- HTTP Client: axios
- Key directories: src/, app/, components/, pages/

**Entry Point:** `src/App.tsx`

**How to Run:**
```bash
cd frontend
npm run dev
```

**Port:** 3000

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

**Existing API Endpoint:**
- `GET /team-members` - Returns list of team members (in `app/api/v1/workload.py`)

## Files to Modify

| File | Service | What to Change |
|------|---------|---------------|
| `frontend/pages/team-members.tsx` OR `frontend/app/team-members/page.tsx` | frontend | Create new page component for team members directory |
| `frontend/components/TeamMemberCard.tsx` | frontend | Create new component for individual member cards |
| Navigation component (TBD based on codebase exploration) | frontend | Add link to team members directory |

## Files to Reference

These files show patterns to follow:

| File | Pattern to Copy |
|------|----------------|
| `app/api/v1/workload.py` | Backend API structure and response format for team members |
| Existing page components in `frontend/pages/` or `frontend/app/` | Next.js page structure and routing patterns |
| Existing card components (if any) | MUI Card component patterns and styling |
| Existing API integration files | axios setup and API call patterns |

## Patterns to Follow

### MUI Card Components

The project uses Material-UI components with Emotion styling. Member cards should follow this pattern:

```typescript
import { Card, CardContent, Typography, Chip } from '@mui/material';
import { styled } from '@mui/material/styles';

const StyledCard = styled(Card)(({ theme }) => ({
  // Custom styling using theme
}));

// Usage in component
<Card>
  <CardContent>
    <Typography variant="h5">{member.name}</Typography>
    {member.roles.map(role => <Chip key={role} label={role} />)}
  </CardContent>
</Card>
```

**Key Points:**
- Use MUI's Card, CardContent, and related components
- Apply custom styling using Emotion's `styled` API
- Follow Material Design principles for spacing and layout
- Use Chip components for displaying multiple roles

### API Integration Pattern

Based on the project structure, API calls should use axios:

```typescript
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

const fetchTeamMembers = async () => {
  const response = await axios.get(`${API_URL}/team-members`);
  return response.data;
};
```

**Key Points:**
- Use environment variables for API URL
- Handle loading and error states
- Use React hooks (useState, useEffect) for data fetching
- Consider using SWR or React Query if already in the project

### Next.js Page Structure

```typescript
import { useEffect, useState } from 'react';
import type { NextPage } from 'next';

const TeamMembersPage: NextPage = () => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch data
  }, []);

  return (
    <div>
      {/* Page content */}
    </div>
  );
};

export default TeamMembersPage;
```

## Requirements

### Functional Requirements

1. **Display Team Members Grid**
   - Description: Show all team members in a responsive grid layout
   - Acceptance: Grid displays all members returned from API, responsive on mobile/tablet/desktop

2. **Member Card Information**
   - Description: Each card displays member name, avatar (if available), and roles as chips/badges
   - Acceptance: All relevant member data visible, roles clearly distinguished with visual tags

3. **Loading and Error States**
   - Description: Show loading indicator while fetching, error message on failure
   - Acceptance: User sees appropriate feedback during all states

4. **Navigation Integration**
   - Description: Add "Team Members" link to main navigation
   - Acceptance: Users can navigate to team members directory from any page

### Edge Cases

1. **No Team Members** - Display empty state message: "No team members found"
2. **Member Without Roles** - Display "No roles assigned" or hide roles section
3. **Long Names or Roles** - Truncate or wrap text appropriately to maintain card layout
4. **Large Team Size** - Consider pagination or infinite scroll if team has 50+ members
5. **API Timeout/Failure** - Display user-friendly error with retry button

## Implementation Notes

### DO
- Use TypeScript for all new components with proper type definitions
- Create a separate `TeamMemberCard` component for reusability
- Follow existing MUI theming and color schemes
- Add proper TypeScript interfaces for team member data structure
- Use Grid or Box components from MUI for responsive layout
- Implement proper error boundaries
- Add accessibility attributes (ARIA labels, semantic HTML)
- Test on multiple screen sizes

### DON'T
- Create custom card components from scratch (use MUI Card)
- Hardcode API URLs (use environment variables)
- Mix styling approaches (stick to Emotion + MUI)
- Skip TypeScript types
- Ignore loading states
- Forget mobile responsiveness

## Development Environment

### Start Services

```bash
# Terminal 1 - Backend
cd backend
uvicorn app.main:app --reload --port 8000

# Terminal 2 - Frontend
cd frontend
npm run dev

# Terminal 3 - Database (if not running)
# Docker compose will start PostgreSQL and Redis
docker-compose up db redis
```

### Service URLs
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs
- Team Members API: http://localhost:8000/api/v1/team-members

### Required Environment Variables
- `NEXT_PUBLIC_API_URL`: Backend API URL (frontend/.env.local)
- Default: `http://localhost:8000/api/v1`

## Success Criteria

The task is complete when:

1. [ ] Team members directory page is accessible via navigation
2. [ ] All team members are displayed in a responsive grid layout
3. [ ] Member cards show name and roles clearly
4. [ ] Loading state displays while fetching data
5. [ ] Error states are handled gracefully with user-friendly messages
6. [ ] Page is responsive on mobile, tablet, and desktop
7. [ ] No console errors or TypeScript warnings
8. [ ] Existing tests still pass
9. [ ] New functionality verified via browser at http://localhost:3000/team-members

## QA Acceptance Criteria

**CRITICAL**: These criteria must be verified by the QA Agent before sign-off.

### Unit Tests
| Test | File | What to Verify |
|------|------|----------------|
| TeamMemberCard renders correctly | `frontend/components/__tests__/TeamMemberCard.test.tsx` | Card displays member name, roles are rendered as chips |
| TeamMemberCard handles missing data | `frontend/components/__tests__/TeamMemberCard.test.tsx` | Component handles missing avatar, empty roles gracefully |
| Page fetches team members | `frontend/pages/__tests__/team-members.test.tsx` | API call is made on mount, data is displayed |
| Page handles loading state | `frontend/pages/__tests__/team-members.test.tsx` | Loading indicator shows before data loads |
| Page handles error state | `frontend/pages/__tests__/team-members.test.tsx` | Error message displays when API fails |

### Integration Tests
| Test | Services | What to Verify |
|------|----------|----------------|
| Team members API integration | frontend ↔ backend | GET /team-members returns expected data structure |
| Full page load | frontend ↔ backend | Complete flow from page load to rendered cards |

### End-to-End Tests
| Flow | Steps | Expected Outcome |
|------|-------|------------------|
| View team directory | 1. Navigate to /team-members 2. Wait for load | Grid of member cards displays |
| Navigate from menu | 1. Click "Team Members" in nav 2. Wait for page | Team members page loads successfully |
| Responsive layout | 1. Resize browser 2. Check mobile/tablet/desktop | Cards reflow appropriately for screen size |

### Browser Verification (if frontend)
| Page/Component | URL | Checks |
|----------------|-----|--------|
| Team Members Page | `http://localhost:3000/team-members` | Grid layout displays, cards show member info |
| Member Cards | `http://localhost:3000/team-members` | Names visible, roles shown as chips, spacing correct |
| Loading State | `http://localhost:3000/team-members` | Loading spinner shows initially (throttle network to test) |
| Error State | `http://localhost:3000/team-members` | Error message displays (stop backend to test) |
| Mobile View | `http://localhost:3000/team-members` | Single column on mobile, responsive on tablet |
| Navigation Link | Any page | "Team Members" link present and functional |

### Database Verification (if applicable)
| Check | Query/Command | Expected |
|-------|---------------|----------|
| N/A | N/A | No database changes for this feature |

### API Testing
| Endpoint | Test | Expected Response |
|----------|------|------------------|
| GET /team-members | Call endpoint directly | 200 status, array of team member objects |
| GET /team-members | Check response structure | Each member has id, name, roles fields |

### Performance Checks
| Check | Metric | Threshold |
|-------|--------|-----------|
| Initial page load | Time to interactive | < 2 seconds |
| API response time | GET /team-members | < 500ms |
| Card rendering | Time to render 50 cards | < 1 second |

### Accessibility Checks
| Check | Tool/Method | Standard |
|-------|-------------|----------|
| Screen reader compatibility | Test with VoiceOver/NVDA | Member names and roles are announced |
| Keyboard navigation | Tab through cards | All interactive elements are keyboard accessible |
| Color contrast | WAVE or axe DevTools | WCAG AA compliance |
| Semantic HTML | Inspect DOM | Proper heading hierarchy, semantic elements |

### QA Sign-off Requirements
- [ ] All unit tests pass (`npm test`)
- [ ] All integration tests pass
- [ ] All E2E tests pass (if implemented)
- [ ] Browser verification complete (all checks passed)
- [ ] API returns correct data structure
- [ ] No regressions in existing functionality
- [ ] Code follows established TypeScript and React patterns
- [ ] No console errors or warnings
- [ ] Responsive design verified on mobile, tablet, desktop
- [ ] Accessibility checks passed
- [ ] Performance metrics within acceptable thresholds
- [ ] No security vulnerabilities introduced
- [ ] Loading and error states function correctly

## Technical Decisions

### Data Structure Assumptions

Based on the existing `/team-members` endpoint, expected response format:

```typescript
interface TeamMember {
  id: string | number;
  name: string;
  email?: string;
  avatar?: string;
  roles: string[];
  // Additional fields TBD based on API exploration
}

type TeamMembersResponse = TeamMember[];
```

### Component Structure

```
frontend/
├── pages/
│   └── team-members.tsx          # Main page (or app/team-members/page.tsx for App Router)
├── components/
│   ├── TeamMemberCard.tsx        # Individual member card
│   └── __tests__/
│       └── TeamMemberCard.test.tsx
└── types/
    └── team-member.ts            # TypeScript interfaces
```

### Styling Approach

- Use MUI Grid for responsive layout
- Use MUI Card for member cards
- Apply custom styling with Emotion's `styled` API
- Follow existing theme configuration
- Maintain consistent spacing using MUI's spacing system

### State Management

- Use React useState for local component state
- Use useEffect for data fetching
- Consider adding error retry mechanism
- No global state needed for this feature (unless existing pattern dictates)

## Next Steps for Implementation

1. **Exploration Phase:**
   - Examine actual response from GET `/team-members` API
   - Locate design file `19-team-members.png` for exact requirements
   - Find existing navigation component to add link
   - Identify if project uses Pages Router or App Router
   - Check for existing card component patterns

2. **Development Phase:**
   - Create TypeScript interface for TeamMember
   - Build TeamMemberCard component
   - Create team members page
   - Integrate API call
   - Add loading and error states
   - Implement responsive grid
   - Add navigation link
   - Write unit tests

3. **Testing Phase:**
   - Run unit tests
   - Test in browser
   - Verify responsive design
   - Test error scenarios
   - Check accessibility
   - Verify performance

4. **QA Phase:**
   - Complete all QA acceptance criteria
   - Fix any issues found
   - Get QA sign-off
