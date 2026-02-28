# Specification: Implement Approval Workflow Stepper

## Overview

Create an enhanced horizontal stepper component that visualizes the multi-step approval workflow in detail. Unlike the existing basic ApprovalStepper which only shows high-level statuses (Draft → Submitted → Under Review → Approved/Rejected), this new component will display each individual approval step with its approver role, status, comments, and timing information, matching the design specification in `26-approval-stepper.png`.

## Workflow Type

**Type**: feature

**Rationale**: This is a new UI component that enhances the existing approval workflow visualization, providing users with detailed visibility into each approval step rather than just the overall status.

## Task Scope

### Services Involved
- **frontend** (primary) - Implement the new stepper component for detailed approval workflow visualization
- **backend** (reference) - Use existing approval API endpoints and data structures

### This Task Will:
- [ ] Create a new `ApprovalWorkflowStepper` component that displays individual approval steps
- [ ] Show each step with its approver role, current status, and timing details
- [ ] Display comments and approver information for completed steps
- [ ] Support different step statuses: pending, approved, rejected, revision_requested
- [ ] Follow the design specification in `26-approval-stepper.png`
- [ ] Integrate with existing approval data structure (ApprovalRequest with multiple ApprovalSteps)

### Out of Scope:
- Modifying the backend approval API or data models
- Adding approval action buttons (approve/reject/revision) - this is display-only
- Changing the existing basic ApprovalStepper component
- Creating new approval workflow logic

## Service Context

### Frontend

**Tech Stack:**
- Language: TypeScript
- Framework: React 18
- Build Tool: Vite
- UI Library: Material-UI (MUI)
- Styling: Emotion
- Key directories: `src/components`, `src/pages`, `src/types`

**Entry Point:** `src/App.tsx`

**How to Run:**
```bash
cd frontend
npm run dev
```

**Port:** 3000

### Backend (Reference Only)

**Tech Stack:**
- Language: Python
- Framework: FastAPI
- ORM: SQLAlchemy
- Key directories: `app/api`, `app/models`, `app/schemas`

**Entry Point:** `app/main.py`

**How to Run:**
```bash
cd backend
uvicorn app.main:app --reload
```

**Port:** 8000

**Relevant API Endpoints:**
- `GET /api/v1/projects/{project_id}/approvals/{approval_id}` - Get approval with all steps
- `GET /api/v1/approvals` - List all approvals
- `GET /api/v1/my-approvals` - List pending approvals for current user

## Files to Modify

| File | Service | What to Change |
|------|---------|---------------|
| `frontend/src/components/ui/Stepper.tsx` | frontend | Add new `ApprovalWorkflowStepper` component that displays detailed step information |

## Files to Reference

These files show patterns to follow:

| File | Pattern to Copy |
|------|----------------|
| `frontend/src/components/ui/Stepper.tsx` | Existing stepper implementation, MUI styling patterns, animation utilities |
| `backend/app/api/v1/approvals.py` | Approval workflow logic, step statuses, and API structure |
| `backend/app/models/approval.py` | ApprovalRequest and ApprovalStep data models |
| `backend/app/schemas/approval.py` | Response schemas for approval data (ApprovalRequestResponse, ApprovalStepResponse) |
| `design-assets/approval/26-approval-stepper.png` | Design reference for the component UI |

## Patterns to Follow

### Existing Stepper Component Pattern

From `frontend/src/components/ui/Stepper.tsx`:

```typescript
interface StepItem {
  label: string
  description?: string
  optional?: boolean
  error?: boolean
}

interface StepperProps {
  steps: StepItem[]
  activeStep: number
  orientation?: 'horizontal' | 'vertical'
  alternativeLabel?: boolean
}
```

**Key Points:**
- Use the existing `Stepper` base component with custom step rendering
- Leverage `CustomStepIcon` for visual step indicators
- Use MUI's `StepLabel` with optional descriptions
- Apply animation utilities from `utils/animations`
- Follow the styled-components pattern with Emotion

### Approval Data Structure

From `backend/app/models/approval.py` and `backend/app/schemas/approval.py`:

```typescript
// Frontend type definitions should match backend schema
interface ApprovalStep {
  id: string
  approvalRequestId: string
  stepOrder: number
  approverRole: string
  status: 'pending' | 'approved' | 'rejected' | 'revision_requested'
  approvedById?: string
  approvedBy?: User
  approvedAt?: string
  comments?: string
}

interface ApprovalRequest {
  id: string
  projectId: string
  entityType: string
  entityId: string
  currentStatus: string
  createdAt: string
  createdBy?: User
  steps: ApprovalStep[]
}
```

**Key Points:**
- Steps are ordered by `stepOrder`
- Each step has a specific `approverRole` (e.g., "Project Manager", "Engineer", "Consultant")
- Status determines the visual state of the step
- `approvedBy`, `approvedAt`, and `comments` are only present for completed steps

### MUI Stepper Customization Pattern

```typescript
const CustomConnector = styled(StepConnector)(({ theme }) => ({
  '&.MuiStepConnector-root': {
    '&.Mui-active, &.Mui-completed': {
      '& .MuiStepConnector-line': {
        borderColor: theme.palette.primary.main,
      },
    },
  },
}))
```

**Key Points:**
- Customize connectors, icons, and labels
- Use theme colors for status indication
- Apply smooth transitions for state changes
- Support both horizontal and vertical orientations

## Requirements

### Functional Requirements

1. **Display All Approval Steps**
   - Description: Render each approval step from the ApprovalRequest.steps array in order
   - Acceptance: All steps are displayed with correct step_order sequence

2. **Show Step Status Visually**
   - Description: Use distinct visual indicators for each status (pending, approved, rejected, revision_requested)
   - Acceptance:
     - Pending steps show a numbered circle with neutral color
     - Approved steps show a check icon with success color
     - Rejected steps show an error icon with error color
     - Revision requested steps show a warning icon with warning color

3. **Display Approver Role**
   - Description: Show the approver_role for each step (e.g., "Project Manager", "Lead Engineer")
   - Acceptance: Step labels include the approver role prominently

4. **Show Approval Details**
   - Description: For completed steps, display approver name, approval timestamp, and comments
   - Acceptance: Completed steps show "Approved by [Name] on [Date]" and any comments provided

5. **Highlight Current Step**
   - Description: Visually emphasize the current pending step awaiting action
   - Acceptance: The next pending step (lowest step_order with status="pending") has enhanced visual styling

6. **Responsive Layout**
   - Description: Component adapts to different screen sizes
   - Acceptance: Horizontal layout on desktop, option to switch to vertical on mobile

### Edge Cases

1. **No Steps Available** - Show a placeholder message "No approval steps defined"
2. **All Steps Complete** - Show final approved/rejected state with completion indicator
3. **Multiple Pending Steps** - Highlight only the first pending step in sequence
4. **Long Comments** - Truncate with "Show more" option
5. **Missing Approver Information** - Show "Pending assignment" if approver details unavailable

## Implementation Notes

### DO
- Extend the existing Stepper component architecture from `Stepper.tsx`
- Use the same animation utilities (`duration`, `easing`, `createTransition`, `scaleIn`)
- Follow MUI theming conventions for colors (primary, success, error, warning)
- Use TypeScript interfaces that match backend schema structure (camelCase from CamelCaseModel)
- Add prop types for optional customization (orientation, showComments, expandable)
- Test with varying numbers of steps (1-10+ steps)
- Use the design reference `26-approval-stepper.png` as the visual guide

### DON'T
- Create a completely new stepper from scratch - reuse existing patterns
- Hardcode approval step labels - use dynamic approver_role from data
- Modify the basic ApprovalStepper (lines 165-194) - create a separate component
- Add action buttons (approve/reject) - this is a display-only component
- Make API calls directly from the component - accept data as props

## Development Environment

### Start Services

```bash
# Frontend
cd frontend
npm run dev

# Backend (for API testing)
cd backend
source venv/bin/activate  # or test_env/bin/activate
uvicorn app.main:app --reload
```

### Service URLs
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

### Required Environment Variables
- Frontend: `VITE_API_URL=http://localhost:8000/api/v1`
- Backend: See `.env` file in backend directory

## Success Criteria

The task is complete when:

1. [ ] New `ApprovalWorkflowStepper` component is implemented in `Stepper.tsx`
2. [ ] Component displays all approval steps with correct order and status
3. [ ] Each step shows approver role, status indicator, and completion details
4. [ ] Visual styling matches design reference `26-approval-stepper.png`
5. [ ] Component handles all edge cases (no steps, all complete, pending steps)
6. [ ] TypeScript types are properly defined for approval data structures
7. [ ] Component is responsive (horizontal on desktop, vertical option available)
8. [ ] Animations and transitions follow existing patterns
9. [ ] No console errors or warnings
10. [ ] Component can be imported and used in approval detail pages

## QA Acceptance Criteria

**CRITICAL**: These criteria must be verified by the QA Agent before sign-off.

### Unit Tests
| Test | File | What to Verify |
|------|------|----------------|
| ApprovalWorkflowStepper renders all steps | `frontend/src/components/ui/Stepper.test.tsx` | Component renders correct number of steps from data |
| Step statuses display correctly | `frontend/src/components/ui/Stepper.test.tsx` | Pending, approved, rejected, revision_requested all have distinct visuals |
| Approver details shown for completed steps | `frontend/src/components/ui/Stepper.test.tsx` | Approved steps show approver name and timestamp |
| Edge cases handled | `frontend/src/components/ui/Stepper.test.tsx` | Empty steps, no approver, long comments |

### Integration Tests
| Test | Services | What to Verify |
|------|----------|----------------|
| Load approval data and render stepper | frontend ↔ backend | Fetch approval from API and display in stepper |
| Status updates reflect in UI | frontend ↔ backend | When step status changes, stepper updates visually |

### End-to-End Tests
| Flow | Steps | Expected Outcome |
|------|-------|------------------|
| View approval workflow | 1. Navigate to approval detail page<br>2. Observe stepper component | All approval steps displayed with correct statuses and details |
| Review completed steps | 1. View approval with mix of pending/approved steps<br>2. Check completed step details | Approved steps show approver name, timestamp, and comments |
| Check responsive behavior | 1. Resize browser window<br>2. View on mobile viewport | Component adapts layout appropriately |

### Browser Verification (if frontend)
| Page/Component | URL | Checks |
|----------------|-----|--------|
| Stepper Component Storybook/Demo | `http://localhost:3000/` (in approval detail view) | [ ] All step statuses render correctly<br>[ ] Animations are smooth<br>[ ] Text is readable<br>[ ] Colors match theme |
| Approval Detail Page | `http://localhost:3000/projects/{project_id}/approvals/{approval_id}` | [ ] Stepper integrates seamlessly<br>[ ] Data loads and displays<br>[ ] No layout issues |

### Database Verification (if applicable)
N/A - This is a frontend display component only

### QA Sign-off Requirements
- [ ] All unit tests pass
- [ ] Integration tests verify API data flow
- [ ] Browser verification complete across Chrome, Firefox, Safari
- [ ] Component matches design reference `26-approval-stepper.png`
- [ ] Responsive behavior verified on desktop and mobile
- [ ] No console errors or warnings
- [ ] No regressions in existing ApprovalStepper or Stepper components
- [ ] TypeScript compilation successful with no errors
- [ ] Code follows established patterns and conventions
- [ ] Accessibility: keyboard navigation works, screen reader compatible
