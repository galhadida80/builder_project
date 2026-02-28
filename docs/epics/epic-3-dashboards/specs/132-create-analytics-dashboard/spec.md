# Specification: Create Analytics Dashboard

## Overview

Build a comprehensive analytics dashboard for the Construction Operations Platform that visualizes key project metrics, trends, and KPIs through interactive charts. The dashboard will enable project managers and stakeholders to monitor project health, track progress, and identify issues through data-driven insights with customizable date ranges and exportable reports.

## Workflow Type

**Type**: feature

**Rationale**: This is a new feature implementation that adds significant functionality to the platform. It involves creating new UI components, integrating with existing backend APIs, and potentially adding new API endpoints for analytics data aggregation.

## Task Scope

### Services Involved
- **frontend** (primary) - Create dashboard UI with charts, date selectors, and KPI cards
- **backend** (integration) - Provide analytics data endpoints (may require new endpoints or use existing)

### This Task Will:
- [ ] Create analytics dashboard page with routing and navigation integration
- [ ] Implement interactive charts using @mui/x-charts for data visualization
- [ ] Build date range selector component using @mui/x-date-pickers
- [ ] Design and implement KPI card components displaying key metrics
- [ ] Add PDF export functionality using jsPDF and html2canvas
- [ ] Integrate with backend API endpoints to fetch analytics data
- [ ] Implement loading states, error handling, and empty states
- [ ] Ensure responsive design for mobile and tablet views
- [ ] Add filtering capabilities by project, date range, and other dimensions

### Out of Scope:
- Creating new backend database models (use existing project data)
- Real-time analytics updates (will use standard polling or manual refresh)
- Advanced filtering beyond date ranges and project selection
- Custom report builder or saved dashboard configurations
- Role-based dashboard customization

## Service Context

### Frontend

**Tech Stack:**
- Language: TypeScript
- Framework: React
- Build Tool: Vite
- Styling: Emotion
- UI Library: Material-UI (@mui/material, @mui/x-data-grid, @mui/x-date-pickers)
- Key directories: src/

**Entry Point:** `src/App.tsx`

**How to Run:**
```bash
cd frontend
npm run dev
```

**Port:** 3000

**Existing Dependencies:**
- @mui/material (UI components)
- @mui/x-date-pickers (already installed - date selection)
- dayjs (date manipulation - already installed)
- axios (API calls)
- react-router-dom (routing)

**Dependencies to Install:**
- @mui/x-charts (charting library)
- jspdf (PDF export)
- html2canvas (DOM to canvas conversion for PDF)

### Backend

**Tech Stack:**
- Language: Python
- Framework: FastAPI
- ORM: SQLAlchemy
- Key directories: app/

**How to Run:**
```bash
cd backend
uvicorn app.main:app --reload
```

**Port:** 8000

**API Prefix:** `/api/v1`

**Relevant Existing Endpoints:**
- `/api/v1/projects/{project_id}` - Project details
- `/api/v1/projects/{project_id}/equipment` - Equipment data
- `/api/v1/projects/{project_id}/materials` - Materials data
- `/api/v1/projects/{project_id}/inspections` - Inspections data
- `/api/v1/projects/{project_id}/inspections/summary` - Inspection summary
- `/api/v1/projects/{project_id}/rfis` - RFI data
- `/api/v1/projects/{project_id}/rfis/summary` - RFI summary
- `/api/v1/projects/{project_id}/approvals` - Approvals data

## Files to Modify

| File | Service | What to Change |
|------|---------|---------------|
| `frontend/package.json` | frontend | Add @mui/x-charts, jspdf, and html2canvas dependencies |
| `frontend/src/App.tsx` | frontend | Add route for analytics dashboard |
| **New:** `frontend/src/pages/Analytics/AnalyticsDashboard.tsx` | frontend | Main dashboard component with layout and state management |
| **New:** `frontend/src/pages/Analytics/components/DateRangeSelector.tsx` | frontend | Date range picker component |
| **New:** `frontend/src/pages/Analytics/components/KPICard.tsx` | frontend | Reusable KPI display card |
| **New:** `frontend/src/pages/Analytics/components/ProjectMetricsChart.tsx` | frontend | Line/bar chart for project metrics |
| **New:** `frontend/src/pages/Analytics/components/DistributionChart.tsx` | frontend | Pie/donut chart for distributions |
| **New:** `frontend/src/pages/Analytics/components/ExportButton.tsx` | frontend | PDF export functionality |
| **New:** `frontend/src/services/analyticsService.ts` | frontend | API service layer for analytics data |
| **New:** `backend/app/api/v1/analytics.py` | backend | Analytics aggregation endpoints (if needed) |

## Files to Reference

These files show patterns to follow:

| File | Pattern to Copy |
|------|----------------|
| `frontend/src/pages/*` (existing page components) | Page component structure, routing integration |
| `frontend/src/services/*` (existing API services) | API service layer pattern with axios |
| Existing Material-UI usage in frontend | Consistent component styling and theming |
| `backend/app/api/v1/*.py` (existing endpoints) | FastAPI route structure and response patterns |

## Patterns to Follow

### Frontend Page Structure

Follow the established pattern for page components:
- Use functional components with TypeScript
- Implement loading and error states
- Use Material-UI components consistently
- Apply responsive design with MUI Grid/Box
- Manage state with React hooks (useState, useEffect)

**Key Points:**
- Create a dedicated `/analytics` route
- Use consistent spacing and padding (theme.spacing())
- Implement skeleton loaders during data fetch
- Handle empty states gracefully

### Material-UI Charts (@mui/x-charts)

From research phase, use self-contained chart components:

```typescript
import { LineChart, BarChart, PieChart } from '@mui/x-charts';

// Line Chart Example
<LineChart
  series={[
    { data: [3, 4, 1, 6, 5], label: 'Series 1' },
  ]}
  xAxis={[{ data: [1, 2, 3, 4, 5], scaleType: 'point' }]}
  width={500}
  height={300}
/>

// Pie Chart Example (use innerRadius for donut)
<PieChart
  series={[
    {
      data: [
        { id: 0, value: 10, label: 'series A' },
        { id: 1, value: 15, label: 'series B' },
      ],
      innerRadius: 30, // Makes it a donut chart
    },
  ]}
  width={400}
  height={200}
/>
```

**Key Points:**
- Keep datasets under 6000 points to avoid performance issues
- Charts may not render on initial page load (renders on hover) - handle this
- Use responsive width with container queries or percentage
- Style with MUI theme colors

### Date Picker Pattern

```typescript
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';

// Use two DatePickers for start/end range (no Pro license)
<LocalizationProvider dateAdapter={AdapterDayjs}>
  <DatePicker
    label="Start Date"
    value={startDate}
    onChange={(newValue) => setStartDate(newValue)}
  />
  <DatePicker
    label="End Date"
    value={endDate}
    onChange={(newValue) => setEndDate(newValue)}
  />
</LocalizationProvider>
```

**Key Points:**
- Wrap in LocalizationProvider at component root
- Use AdapterDayjs (already installed)
- Two separate pickers instead of DateRangePicker (requires Pro license)
- Validate that end date is after start date

### PDF Export Pattern

```typescript
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const exportToPDF = async () => {
  const element = document.getElementById('dashboard-content');
  const canvas = await html2canvas(element, { scale: 2 });
  const imgData = canvas.toDataURL('image/png');

  const pdf = new jsPDF('landscape', 'mm', 'a4');
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();

  pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
  pdf.save('analytics-dashboard.pdf');
};
```

**Key Points:**
- Use inline styles for exportable elements (external stylesheets ignored)
- Set scale: 2 for better quality on high-DPI screens
- Use landscape orientation for dashboard layout
- Show loading indicator during export process

### API Service Pattern

```typescript
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export const analyticsService = {
  getProjectMetrics: async (projectId: string, startDate: string, endDate: string) => {
    const response = await axios.get(`${API_BASE_URL}/projects/${projectId}/analytics/metrics`, {
      params: { start_date: startDate, end_date: endDate }
    });
    return response.data;
  },

  // Additional methods...
};
```

**Key Points:**
- Use environment variable for API URL
- Handle errors with try-catch in calling component
- Use consistent parameter naming (snake_case for API, camelCase in frontend)

## Requirements

### Functional Requirements

1. **Dashboard Layout**
   - Description: Display dashboard with header, filters, KPI row, and charts grid
   - Acceptance: Dashboard loads with organized sections, responsive on all screen sizes

2. **KPI Cards**
   - Description: Show 4-6 key metrics (e.g., Total Projects, Active Inspections, Pending RFIs, Approval Rate, Equipment Utilization, Budget Status)
   - Acceptance: Cards display metric value, label, trend indicator (up/down), and change percentage

3. **Date Range Filtering**
   - Description: Allow users to select start and end dates to filter all dashboard data
   - Acceptance: Selecting date range updates all charts and KPIs, validates end date > start date

4. **Project Metrics Chart**
   - Description: Line or bar chart showing metrics over time (e.g., inspections completed, RFIs submitted)
   - Acceptance: Chart displays correctly with legend, axis labels, and tooltips on hover

5. **Distribution Charts**
   - Description: Pie or donut charts showing status distributions (e.g., RFI status breakdown, inspection types)
   - Acceptance: Slices are labeled, show percentages, and have distinct colors

6. **PDF Export**
   - Description: Export entire dashboard view as PDF file
   - Acceptance: Clicking export button generates downloadable PDF with all visible charts and data

7. **Loading and Error States**
   - Description: Show skeleton loaders during data fetch, error messages on API failures
   - Acceptance: Users see appropriate feedback during loading and when errors occur

8. **Empty State**
   - Description: Display helpful message when no data available for selected filters
   - Acceptance: Shows empty state with guidance when no analytics data exists

### Edge Cases

1. **No Data Available** - Display empty state message: "No data available for the selected date range. Try adjusting your filters."
2. **Date Validation** - Prevent end date from being before start date, show validation error
3. **Large Dataset** - Limit chart data points to <6000 to prevent performance issues, aggregate if needed
4. **API Timeout** - Show error message with retry button if analytics endpoint takes too long
5. **Mobile View** - Stack charts vertically, make KPI cards responsive in 2x2 or 1x4 grid
6. **Chart Rendering Issues** - If chart doesn't render initially, trigger re-render on container resize
7. **Missing Project Data** - Handle projects with no analytics data gracefully

## Implementation Notes

### DO
- Follow Material-UI design patterns and use theme values for consistency
- Implement responsive design with MUI Grid/Stack/Box for different screen sizes
- Use TypeScript interfaces for all data structures and API responses
- Add loading skeletons that match the final component layout
- Limit chart data to <6000 points for performance
- Use inline styles for elements that will be exported to PDF
- Implement proper error boundaries and error handling
- Cache analytics data when appropriate to reduce API calls
- Use dayjs for all date manipulations (already in project)

### DON'T
- Don't use DateRangePicker without verifying Pro license (use two DatePickers instead)
- Don't fetch analytics data on every re-render (use useEffect with dependencies)
- Don't hardcode API URLs (use environment variables)
- Don't ignore loading and error states
- Don't create custom charting when @mui/x-charts covers the need
- Don't exceed 6000 data points in charts (performance limit)
- Don't use external stylesheets for PDF export elements (inline styles only)

## Development Environment

### Start Services

```bash
# Terminal 1 - Backend
cd backend
uvicorn app.main:app --reload

# Terminal 2 - Frontend
cd frontend
npm install  # Install new dependencies
npm run dev

# Terminal 3 - Database (if not running)
docker-compose up db redis
```

### Service URLs
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

### Required Environment Variables

**Frontend (.env):**
- `VITE_API_URL`: http://localhost:8000/api/v1

**Backend (.env):**
- `DATABASE_URL`: postgresql+asyncpg://localhost:5432/builder_db
- All existing environment variables (no new ones required)

## Success Criteria

The task is complete when:

1. [ ] Analytics dashboard page is accessible via navigation route `/analytics`
2. [ ] Dashboard displays 4-6 KPI cards with realistic sample data
3. [ ] Date range selector allows filtering with two separate date pickers
4. [ ] At least 2 chart types are implemented (line/bar and pie/donut)
5. [ ] Charts update when date range is changed
6. [ ] PDF export button generates downloadable PDF of dashboard
7. [ ] Loading states display during data fetching
8. [ ] Error states handle API failures gracefully
9. [ ] Empty state displays when no data is available
10. [ ] Dashboard is responsive on mobile, tablet, and desktop views
11. [ ] No console errors or warnings
12. [ ] Existing tests still pass
13. [ ] New functionality verified via browser testing

## QA Acceptance Criteria

**CRITICAL**: These criteria must be verified by the QA Agent before sign-off.

### Unit Tests

| Test | File | What to Verify |
|------|------|----------------|
| Date validation logic | `frontend/src/pages/Analytics/__tests__/DateRangeSelector.test.tsx` | End date cannot be before start date |
| KPI card rendering | `frontend/src/pages/Analytics/components/__tests__/KPICard.test.tsx` | Displays value, label, and trend correctly |
| Analytics service calls | `frontend/src/services/__tests__/analyticsService.test.ts` | API calls use correct endpoints and parameters |
| Chart data transformation | `frontend/src/pages/Analytics/__tests__/AnalyticsDashboard.test.tsx` | API data is correctly formatted for charts |

### Integration Tests

| Test | Services | What to Verify |
|------|----------|----------------|
| Analytics data fetch | frontend ↔ backend | Dashboard successfully fetches and displays data from backend |
| Date filter updates | frontend ↔ backend | Changing date range triggers new API call with correct parameters |
| Error handling | frontend ↔ backend | Network errors and 404s are handled gracefully |

### End-to-End Tests (Playwright)

| Flow | Steps | Expected Outcome |
|------|-------|------------------|
| Dashboard Load | 1. Navigate to /analytics 2. Wait for loading 3. Verify content | KPIs and charts render with data |
| Date Range Filter | 1. Open start date picker 2. Select date 3. Open end date picker 4. Select later date 5. Verify charts update | Charts re-render with filtered data |
| PDF Export | 1. Navigate to dashboard 2. Click export button 3. Wait for generation | PDF file downloads successfully |
| Mobile Responsive | 1. Set mobile viewport 2. Navigate to dashboard | Layout stacks vertically, all content accessible |

### Browser Verification

| Page/Component | URL | Checks |
|----------------|-----|--------|
| Analytics Dashboard | `http://localhost:3000/analytics` | Page loads without errors, charts render |
| KPI Cards | `http://localhost:3000/analytics` | All KPI cards display with values and trends |
| Date Selector | `http://localhost:3000/analytics` | Both date pickers open and accept input |
| Charts | `http://localhost:3000/analytics` | Line/bar and pie/donut charts render, tooltips work on hover |
| PDF Export | `http://localhost:3000/analytics` | Export button triggers download, PDF contains all visible content |
| Responsive Layout | `http://localhost:3000/analytics` (resize) | Dashboard adapts to mobile/tablet/desktop screens |

### API Verification

| Check | Endpoint | Expected |
|-------|----------|----------|
| Analytics endpoint exists | `GET /api/v1/projects/{id}/analytics/metrics` or similar | Returns 200 with analytics data structure |
| Date filtering works | `GET /api/v1/projects/{id}/analytics/metrics?start_date=...&end_date=...` | Returns filtered data for date range |
| Error handling | `GET /api/v1/analytics/invalid` | Returns appropriate 404 or 400 error |

### Performance Verification

| Check | Method | Expected |
|-------|--------|----------|
| Dashboard load time | Chrome DevTools Performance | Initial load completes in <3 seconds |
| Chart rendering | Visual inspection | Charts render without lag or stuttering |
| Chart data limit | Console logs | No warnings about dataset size >6000 points |
| PDF generation time | Timer in export function | PDF generates in <5 seconds for standard dashboard |

### QA Sign-off Requirements

- [ ] All unit tests pass with >80% coverage for new components
- [ ] All integration tests pass
- [ ] All E2E tests pass in Playwright
- [ ] Browser verification complete (Chrome, Firefox, Safari)
- [ ] Mobile and tablet views verified
- [ ] API endpoints return expected data structures
- [ ] Performance metrics meet thresholds
- [ ] No regressions in existing functionality
- [ ] Code follows established frontend patterns (TypeScript, React hooks, MUI)
- [ ] No console errors or warnings
- [ ] Loading and error states verified
- [ ] Accessibility standards met (keyboard navigation, ARIA labels)
- [ ] PDF export produces readable, formatted output
- [ ] Design matches reference (11-analytics.png) or meets product requirements
