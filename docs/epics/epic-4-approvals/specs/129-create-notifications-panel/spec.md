# Specification: Create Notifications Panel

## Overview

This task involves building a slide-out notifications panel component with category support for the Construction Operations Platform. The panel will provide users with a centralized location to view and manage their notifications, organized by categories for improved usability. The design reference is available in `14-notifications.png`.

## Workflow Type

**Type**: feature

**Rationale**: This is a new UI component that adds notification viewing functionality to the application. It requires creating new React components, potentially adding new API endpoints, and integrating with the existing application layout.

## Task Scope

### Services Involved
- **frontend** (primary) - React/TypeScript application where the notifications panel will be implemented
- **backend** (integration) - May require API endpoints for fetching notifications data

### This Task Will:
- [ ] Create a slide-out drawer component for displaying notifications
- [ ] Implement category-based organization of notifications
- [ ] Add visual design matching the reference image (14-notifications.png)
- [ ] Integrate the panel with the existing application layout
- [ ] Connect to backend API for notifications data (if applicable)
- [ ] Implement read/unread state management
- [ ] Add smooth open/close animations

### Out of Scope:
- Real-time notification delivery via WebSockets (unless explicitly shown in design)
- Email notification preferences
- Push notifications
- Notification creation logic (assumed to exist in backend)
- Historical notification archiving beyond what's shown in the design

## Service Context

### Frontend Service

**Tech Stack:**
- Language: TypeScript
- Framework: React
- Build Tool: Vite
- Styling: Emotion (CSS-in-JS)
- Component Library: Material-UI (MUI)
- Key Dependencies: @mui/material, @mui/icons-material, react-router-dom, axios

**Entry Point:** `src/App.tsx`

**How to Run:**
```bash
cd frontend
npm run dev
```

**Port:** 3000

**Key Directories:**
- `src/` - Source code
- `src/components/` - React components (expected location for notifications panel)
- `src/hooks/` - Custom React hooks (potential location for notifications logic)
- `src/api/` - API client code (expected location for notifications API calls)

### Backend Service

**Tech Stack:**
- Language: Python
- Framework: FastAPI
- ORM: SQLAlchemy
- Database: PostgreSQL

**API Endpoints (to be determined):**
- Likely needs: `/api/v1/notifications` or `/api/v1/me/notifications`
- Potential category filtering: `/api/v1/notifications?category={category}`

**Port:** 8000

## Files to Modify

⚠️ **Note:** The context phase did not identify specific files. The following are expected files based on typical React application structure:

| File | Service | What to Change |
|------|---------|---------------|
| `frontend/src/components/NotificationsPanel.tsx` | frontend | Create new slide-out drawer component |
| `frontend/src/components/NotificationItem.tsx` | frontend | Create individual notification item component |
| `frontend/src/components/Layout.tsx` or `frontend/src/App.tsx` | frontend | Integrate notifications panel trigger/button |
| `frontend/src/api/notifications.ts` | frontend | Create API client for notifications endpoints |
| `frontend/src/hooks/useNotifications.ts` | frontend | Create custom hook for notifications state management |
| `backend/app/api/v1/notifications.py` | backend | Create notifications API endpoint (if not exists) |
| `backend/app/models/notification.py` | backend | Create notification database model (if not exists) |

## Files to Reference

⚠️ **Note:** The context phase did not identify specific reference files. The following patterns should be discovered during implementation:

| File | Pattern to Copy |
|------|----------------|
| Existing drawer/modal components | MUI Drawer implementation pattern |
| Existing list components | Item rendering and state management |
| Existing API hooks | API data fetching pattern with axios |
| `14-notifications.png` | Visual design, layout, and category structure |

## Patterns to Follow

### MUI Drawer Pattern

The frontend uses Material-UI, so the notifications panel should use the MUI `Drawer` component:

```typescript
import { Drawer, List, ListItem, Divider } from '@mui/material';
import { styled } from '@mui/material/styles';

const NotificationsPanel = ({ open, onClose }: NotificationsPanelProps) => {
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
    >
      {/* Panel content */}
    </Drawer>
  );
};
```

**Key Points:**
- Use MUI Drawer component for slide-out behavior
- Apply Emotion styling for custom appearance
- Follow existing component structure in the frontend codebase

### API Data Fetching Pattern

Based on existing dependencies (axios), notifications should be fetched using a similar pattern to other API calls:

```typescript
import axios from 'axios';

export const fetchNotifications = async (category?: string) => {
  const response = await axios.get('/api/v1/notifications', {
    params: { category }
  });
  return response.data;
};
```

**Key Points:**
- Use axios for HTTP requests
- Handle loading and error states
- Implement caching/state management (potentially with React Query if available)

## Requirements

### Functional Requirements

1. **Slide-Out Panel**
   - Description: A drawer component that slides in from the right side of the screen
   - Acceptance: Panel smoothly animates in/out when triggered, overlays main content

2. **Category Organization**
   - Description: Notifications grouped by categories (specific categories defined in 14-notifications.png)
   - Acceptance: Categories are clearly labeled, notifications properly grouped, ability to filter by category

3. **Notification Display**
   - Description: Each notification shows relevant information (title, message, timestamp, read status)
   - Acceptance: Information is clearly visible, timestamps are human-readable, read/unread visually distinct

4. **Read/Unread State**
   - Description: Visual indication of read vs unread notifications
   - Acceptance: Unread notifications visually distinct, clicking marks as read, state persists

5. **Responsive Design**
   - Description: Panel adapts to different screen sizes
   - Acceptance: Works on desktop and mobile viewports, appropriate width on each

### Edge Cases

1. **Empty State** - Display friendly message when no notifications exist
2. **Loading State** - Show skeleton/spinner while fetching notifications
3. **Error State** - Handle and display API errors gracefully
4. **Long Content** - Truncate or wrap long notification messages appropriately
5. **Many Notifications** - Implement virtual scrolling or pagination for performance
6. **Click Outside** - Close panel when clicking outside (standard drawer behavior)

## Implementation Notes

### DO
- Follow the design in `14-notifications.png` exactly for visual consistency
- Use MUI Drawer component as the foundation
- Apply Emotion styling for custom appearance
- Reuse existing icon components from @mui/icons-material
- Implement proper TypeScript types for notification data
- Add loading and error states for better UX
- Make the panel accessible (ARIA labels, keyboard navigation)
- Use existing API patterns and authentication

### DON'T
- Create custom drawer logic when MUI Drawer provides it
- Mix CSS modules with Emotion - stick to Emotion styling
- Hard-code notification data - fetch from API
- Ignore mobile responsiveness
- Skip error handling on API calls
- Forget to handle the case where notifications array is empty

## Development Environment

### Start Services

```bash
# Terminal 1 - Backend
cd backend
source venv/bin/activate  # or appropriate activation command
uvicorn app.main:app --reload --port 8000

# Terminal 2 - Frontend
cd frontend
npm run dev

# Terminal 3 - Database (if not using Docker)
# PostgreSQL should be running on default port 5432
```

### Using Docker Compose

```bash
docker-compose up
```

### Service URLs
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs

### Required Environment Variables

**Frontend (.env):**
- `VITE_API_URL`: http://localhost:8000/api/v1

**Backend (.env):**
- Standard backend environment variables (DATABASE_URL, etc.) already configured

## Success Criteria

The task is complete when:

1. [ ] Notifications panel component is created and renders correctly
2. [ ] Panel slides in/out smoothly with appropriate animations
3. [ ] Categories are implemented and notifications are properly grouped
4. [ ] Design matches the reference image (14-notifications.png)
5. [ ] Read/unread states work correctly
6. [ ] API integration is functional (or mock data if API doesn't exist yet)
7. [ ] Panel is accessible via keyboard and screen readers
8. [ ] No console errors
9. [ ] Existing tests still pass
10. [ ] Component is responsive on mobile and desktop
11. [ ] Empty, loading, and error states are handled

## QA Acceptance Criteria

**CRITICAL**: These criteria must be verified by the QA Agent before sign-off.

### Unit Tests
| Test | File | What to Verify |
|------|------|----------------|
| NotificationsPanel renders correctly | `frontend/src/components/__tests__/NotificationsPanel.test.tsx` | Component mounts without errors, props are handled correctly |
| Drawer opens and closes | `frontend/src/components/__tests__/NotificationsPanel.test.tsx` | Open/close state transitions work |
| Categories filter notifications | `frontend/src/components/__tests__/NotificationsPanel.test.tsx` | Category filtering logic works correctly |
| Read/unread state toggles | `frontend/src/components/__tests__/NotificationsPanel.test.tsx` | Marking notifications as read works |

### Integration Tests
| Test | Services | What to Verify |
|------|----------|----------------|
| Fetch notifications API | frontend ↔ backend | API call succeeds and returns notifications data |
| Mark as read API | frontend ↔ backend | Updating read status persists to backend |
| Category filtering | frontend ↔ backend | Category parameter is sent correctly |

### End-to-End Tests
| Flow | Steps | Expected Outcome |
|------|-------|------------------|
| Open notifications panel | 1. Click notification icon/button 2. Panel slides in | Panel appears from right with notifications |
| Filter by category | 1. Open panel 2. Click category filter | Only notifications in that category show |
| Mark notification as read | 1. Open panel 2. Click unread notification | Notification visual state changes to "read" |
| Close panel | 1. Open panel 2. Click outside or close button | Panel smoothly slides out |

### Browser Verification (Frontend)
| Page/Component | URL | Checks |
|----------------|-----|--------|
| Notifications Panel | `http://localhost:3000` (open panel) | Panel slides in smoothly, no layout shift |
| Category Filtering | `http://localhost:3000` (test filters) | Categories filter notifications correctly |
| Responsive Design | `http://localhost:3000` (resize browser) | Panel adapts to mobile/desktop viewports |
| Accessibility | `http://localhost:3000` (keyboard navigation) | Can open/close with keyboard, screen reader compatible |

### Database Verification (if applicable)
| Check | Query/Command | Expected |
|-------|---------------|----------|
| Notifications table exists | `\dt notifications` in psql | Table present with correct schema |
| Read status persists | `SELECT * FROM notifications WHERE id = {id}` | `is_read` field updates correctly |

### API Verification (if new endpoints created)
| Endpoint | Method | Expected Response |
|----------|--------|-------------------|
| `/api/v1/notifications` | GET | 200 with array of notifications |
| `/api/v1/notifications?category={category}` | GET | 200 with filtered notifications |
| `/api/v1/notifications/{id}/read` | PUT/PATCH | 200 with updated notification |

### QA Sign-off Requirements
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] All E2E tests pass
- [ ] Browser verification complete
- [ ] Visual design matches reference image exactly
- [ ] Responsive behavior verified on mobile and desktop
- [ ] Accessibility verified (keyboard navigation, screen reader)
- [ ] Empty, loading, and error states all display correctly
- [ ] No regressions in existing functionality
- [ ] Code follows established patterns (TypeScript types, Emotion styling, MUI components)
- [ ] No security vulnerabilities introduced
- [ ] API endpoints secured with authentication (if applicable)
- [ ] No console errors or warnings

## Additional Notes

### Design Reference
- **File:** `14-notifications.png`
- **Action Required:** Review this file before starting implementation to understand:
  - Exact category names and structure
  - Visual styling (colors, spacing, typography)
  - Icon usage
  - Read/unread visual treatment
  - Empty state design (if shown)

### Potential Backend Work
If notifications endpoints don't exist:
1. Create `Notification` database model with fields: id, user_id, category, title, message, is_read, created_at
2. Create migration: `alembic revision --autogenerate -m "add notifications table"`
3. Create CRUD operations in `backend/app/api/v1/notifications.py`
4. Add authentication middleware to protect endpoints

### Implementation Priority
1. **Phase 1:** Create basic panel structure with MUI Drawer
2. **Phase 2:** Add static/mock notifications for UI development
3. **Phase 3:** Implement category filtering
4. **Phase 4:** Integrate with backend API
5. **Phase 5:** Add read/unread state management
6. **Phase 6:** Polish animations, accessibility, and edge cases

### Questions for Clarification (to be resolved during implementation)
- Where should the notification trigger button be placed in the UI?
- Should notifications auto-refresh or require manual refresh?
- What are the specific category names?
- Is there a limit on number of notifications to display?
- Should old notifications be archived or remain visible indefinitely?
