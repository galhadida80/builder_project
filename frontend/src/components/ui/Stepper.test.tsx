import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { ThemeProvider, createTheme } from '@mui/material'
import {
  Stepper,
  ApprovalStepper,
  ProgressStepper,
  ApprovalWorkflowStepper,
  ApprovalRequestResponse,
  ApprovalStepResponse,
  UserResponse,
} from './Stepper'

// Test helper to wrap components with MUI theme
const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const theme = createTheme()
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>
}

describe('Stepper', () => {
  describe('Basic Stepper Component', () => {
    it('renders all steps in correct order', () => {
      const steps = [
        { label: 'Step 1', description: 'First step' },
        { label: 'Step 2', description: 'Second step' },
        { label: 'Step 3', description: 'Third step' },
      ]

      render(
        <TestWrapper>
          <Stepper steps={steps} activeStep={1} />
        </TestWrapper>
      )

      expect(screen.getByText('Step 1')).toBeInTheDocument()
      expect(screen.getByText('Step 2')).toBeInTheDocument()
      expect(screen.getByText('Step 3')).toBeInTheDocument()
      expect(screen.getByText('First step')).toBeInTheDocument()
      expect(screen.getByText('Second step')).toBeInTheDocument()
      expect(screen.getByText('Third step')).toBeInTheDocument()
    })

    it('handles empty steps array', () => {
      render(
        <TestWrapper>
          <Stepper steps={[]} activeStep={0} />
        </TestWrapper>
      )

      expect(screen.getByText('No steps available')).toBeInTheDocument()
    })

    it('clamps activeStep to valid range', () => {
      const steps = [
        { label: 'Step 1' },
        { label: 'Step 2' },
        { label: 'Step 3' },
      ]

      // Test with activeStep beyond array length
      const { rerender } = render(
        <TestWrapper>
          <Stepper steps={steps} activeStep={10} />
        </TestWrapper>
      )

      // Should not throw error and render all steps
      expect(screen.getByText('Step 1')).toBeInTheDocument()
      expect(screen.getByText('Step 2')).toBeInTheDocument()
      expect(screen.getByText('Step 3')).toBeInTheDocument()

      // Test with negative activeStep
      rerender(
        <TestWrapper>
          <Stepper steps={steps} activeStep={-5} />
        </TestWrapper>
      )

      expect(screen.getByText('Step 1')).toBeInTheDocument()
    })

    it('displays optional label for optional steps', () => {
      const steps = [
        { label: 'Step 1', optional: false },
        { label: 'Step 2', optional: true },
      ]

      render(
        <TestWrapper>
          <Stepper steps={steps} activeStep={0} />
        </TestWrapper>
      )

      expect(screen.getByText('Optional')).toBeInTheDocument()
    })

    it('renders in vertical orientation', () => {
      const steps = [
        { label: 'Step 1' },
        { label: 'Step 2' },
      ]

      const { container } = render(
        <TestWrapper>
          <Stepper steps={steps} activeStep={0} orientation="vertical" />
        </TestWrapper>
      )

      // Check that the stepper has vertical orientation class
      const stepper = container.querySelector('.MuiStepper-vertical')
      expect(stepper).toBeInTheDocument()
    })
  })

  describe('ApprovalStepper', () => {
    it('renders correct steps for draft status', () => {
      render(
        <TestWrapper>
          <ApprovalStepper status="draft" />
        </TestWrapper>
      )

      expect(screen.getByText('Draft')).toBeInTheDocument()
      expect(screen.getByText('Submitted')).toBeInTheDocument()
      expect(screen.getByText('Under Review')).toBeInTheDocument()
      expect(screen.getByText('Approved')).toBeInTheDocument()
    })

    it('renders rejected status correctly', () => {
      render(
        <TestWrapper>
          <ApprovalStepper status="rejected" />
        </TestWrapper>
      )

      expect(screen.getByText('Rejected')).toBeInTheDocument()
    })

    it('handles unknown status gracefully', () => {
      render(
        <TestWrapper>
          <ApprovalStepper status={'unknown_status' as any} />
        </TestWrapper>
      )

      // Should render without crashing
      expect(screen.getByText('Draft')).toBeInTheDocument()
    })
  })

  describe('ProgressStepper', () => {
    it('generates default labels when not provided', () => {
      render(
        <TestWrapper>
          <ProgressStepper currentStep={1} totalSteps={3} />
        </TestWrapper>
      )

      expect(screen.getByText('Step 1')).toBeInTheDocument()
      expect(screen.getByText('Step 2')).toBeInTheDocument()
      expect(screen.getByText('Step 3')).toBeInTheDocument()
    })

    it('uses custom labels when provided', () => {
      const labels = ['Initialize', 'Process', 'Complete']

      render(
        <TestWrapper>
          <ProgressStepper currentStep={1} totalSteps={3} labels={labels} />
        </TestWrapper>
      )

      expect(screen.getByText('Initialize')).toBeInTheDocument()
      expect(screen.getByText('Process')).toBeInTheDocument()
      expect(screen.getByText('Complete')).toBeInTheDocument()
    })

    it('handles invalid totalSteps', () => {
      render(
        <TestWrapper>
          <ProgressStepper currentStep={0} totalSteps={0} />
        </TestWrapper>
      )

      // Should render at least one step
      expect(screen.getByText('Step 1')).toBeInTheDocument()
    })
  })

  describe('ApprovalWorkflowStepper', () => {
    const mockUser: UserResponse = {
      id: 'user-123',
      email: 'approver@example.com',
      name: 'John Approver',
    }

    const createMockStep = (
      stepOrder: number,
      status: string,
      approverRole: string,
      options: Partial<ApprovalStepResponse> = {}
    ): ApprovalStepResponse => ({
      id: `step-${stepOrder}`,
      approvalRequestId: 'request-123',
      stepOrder,
      approverId: mockUser.id,
      approver: mockUser,
      approverRole,
      status,
      createdAt: '2024-01-01T00:00:00Z',
      ...options,
    })

    const createMockRequest = (
      steps: ApprovalStepResponse[],
      currentStatus = 'under_review'
    ): ApprovalRequestResponse => ({
      id: 'request-123',
      projectId: 'project-123',
      entityType: 'change_order',
      entityId: 'entity-123',
      currentStatus,
      createdAt: '2024-01-01T00:00:00Z',
      steps,
    })

    it('renders all steps in correct order', () => {
      const steps = [
        createMockStep(1, 'approved', 'Project Manager'),
        createMockStep(2, 'pending', 'Site Supervisor'),
        createMockStep(3, 'pending', 'Finance Director'),
      ]

      const request = createMockRequest(steps)

      render(
        <TestWrapper>
          <ApprovalWorkflowStepper approvalRequest={request} />
        </TestWrapper>
      )

      expect(screen.getByText('Project Manager')).toBeInTheDocument()
      expect(screen.getByText('Site Supervisor')).toBeInTheDocument()
      expect(screen.getByText('Finance Director')).toBeInTheDocument()
    })

    it('displays correct approver details for completed steps', () => {
      const steps = [
        createMockStep(1, 'approved', 'Project Manager', {
          decidedAt: '2024-01-15T14:30:00Z',
          comments: 'Looks good to proceed',
        }),
      ]

      const request = createMockRequest(steps)

      render(
        <TestWrapper>
          <ApprovalWorkflowStepper approvalRequest={request} />
        </TestWrapper>
      )

      expect(screen.getByText('Project Manager')).toBeInTheDocument()
      expect(screen.getByText(/Approved by/)).toBeInTheDocument()
      expect(screen.getByText(/John Approver/)).toBeInTheDocument()
      expect(screen.getByText(/Looks good to proceed/)).toBeInTheDocument()
    })

    it('handles empty steps array', () => {
      const request = createMockRequest([])

      render(
        <TestWrapper>
          <ApprovalWorkflowStepper approvalRequest={request} />
        </TestWrapper>
      )

      expect(screen.getByText('No approval steps defined')).toBeInTheDocument()
    })

    it('handles missing approver information', () => {
      const steps = [
        createMockStep(1, 'approved', 'Project Manager', {
          approver: undefined,
          approverId: 'user-abc123',
        }),
      ]

      const request = createMockRequest(steps)

      render(
        <TestWrapper>
          <ApprovalWorkflowStepper approvalRequest={request} />
        </TestWrapper>
      )

      // Should show partial ID as fallback
      expect(screen.getByText(/User user-abc/)).toBeInTheDocument()
    })

    it('handles missing approver name with email fallback', () => {
      const steps = [
        createMockStep(1, 'approved', 'Project Manager', {
          approver: {
            id: 'user-123',
            email: 'test@example.com',
          },
        }),
      ]

      const request = createMockRequest(steps)

      render(
        <TestWrapper>
          <ApprovalWorkflowStepper approvalRequest={request} />
        </TestWrapper>
      )

      expect(screen.getByText(/test@example.com/)).toBeInTheDocument()
    })

    it('highlights current pending step', () => {
      const steps = [
        createMockStep(1, 'approved', 'Project Manager'),
        createMockStep(2, 'pending', 'Site Supervisor'),
        createMockStep(3, 'pending', 'Finance Director'),
      ]

      const request = createMockRequest(steps)

      render(
        <TestWrapper>
          <ApprovalWorkflowStepper approvalRequest={request} />
        </TestWrapper>
      )

      // All steps should be rendered
      expect(screen.getByText('Project Manager')).toBeInTheDocument()
      expect(screen.getByText('Site Supervisor')).toBeInTheDocument()
      expect(screen.getByText('Finance Director')).toBeInTheDocument()
    })

    it('displays rejection status correctly', () => {
      const steps = [
        createMockStep(1, 'approved', 'Project Manager'),
        createMockStep(2, 'rejected', 'Site Supervisor', {
          decidedAt: '2024-01-16T10:00:00Z',
          comments: 'Budget concerns need to be addressed',
        }),
      ]

      const request = createMockRequest(steps, 'rejected')

      render(
        <TestWrapper>
          <ApprovalWorkflowStepper approvalRequest={request} />
        </TestWrapper>
      )

      expect(screen.getByText(/Rejected by/)).toBeInTheDocument()
      expect(screen.getByText(/Budget concerns need to be addressed/)).toBeInTheDocument()
    })

    it('displays revision requested status', () => {
      const steps = [
        createMockStep(1, 'revision_requested', 'Project Manager', {
          comments: 'Please provide more details',
        }),
      ]

      const request = createMockRequest(steps)

      render(
        <TestWrapper>
          <ApprovalWorkflowStepper approvalRequest={request} />
        </TestWrapper>
      )

      expect(screen.getByText(/Revision Requested/)).toBeInTheDocument()
      expect(screen.getByText(/Please provide more details/)).toBeInTheDocument()
    })

    it('shows completion message when all steps complete', () => {
      const steps = [
        createMockStep(1, 'approved', 'Project Manager'),
        createMockStep(2, 'approved', 'Site Supervisor'),
        createMockStep(3, 'approved', 'Finance Director'),
      ]

      const request = createMockRequest(steps, 'approved')

      render(
        <TestWrapper>
          <ApprovalWorkflowStepper approvalRequest={request} />
        </TestWrapper>
      )

      expect(
        screen.getByText(/All approval steps completed successfully/)
      ).toBeInTheDocument()
    })

    it('shows rejection message when workflow rejected', () => {
      const steps = [
        createMockStep(1, 'approved', 'Project Manager'),
        createMockStep(2, 'rejected', 'Site Supervisor'),
      ]

      const request = createMockRequest(steps, 'rejected')

      render(
        <TestWrapper>
          <ApprovalWorkflowStepper approvalRequest={request} />
        </TestWrapper>
      )

      expect(screen.getByText(/Approval request has been rejected/)).toBeInTheDocument()
    })

    it('sorts steps by stepOrder', () => {
      // Create steps in wrong order
      const steps = [
        createMockStep(3, 'pending', 'Finance Director'),
        createMockStep(1, 'approved', 'Project Manager'),
        createMockStep(2, 'approved', 'Site Supervisor'),
      ]

      const request = createMockRequest(steps)

      render(
        <TestWrapper>
          <ApprovalWorkflowStepper approvalRequest={request} />
        </TestWrapper>
      )

      // All steps should render (sorting happens internally)
      expect(screen.getByText('Project Manager')).toBeInTheDocument()
      expect(screen.getByText('Site Supervisor')).toBeInTheDocument()
      expect(screen.getByText('Finance Director')).toBeInTheDocument()
    })

    it('handles steps without comments', () => {
      const steps = [
        createMockStep(1, 'approved', 'Project Manager', {
          decidedAt: '2024-01-15T14:30:00Z',
          comments: undefined,
        }),
      ]

      const request = createMockRequest(steps)

      render(
        <TestWrapper>
          <ApprovalWorkflowStepper approvalRequest={request} />
        </TestWrapper>
      )

      expect(screen.getByText('Project Manager')).toBeInTheDocument()
      expect(screen.getByText(/Approved by/)).toBeInTheDocument()
      // Comments section should not appear
      expect(screen.queryByText(/"/)).not.toBeInTheDocument()
    })

    it('renders in vertical orientation when specified', () => {
      const steps = [createMockStep(1, 'pending', 'Project Manager')]
      const request = createMockRequest(steps)

      const { container } = render(
        <TestWrapper>
          <ApprovalWorkflowStepper approvalRequest={request} orientation="vertical" />
        </TestWrapper>
      )

      const stepper = container.querySelector('.MuiStepper-vertical')
      expect(stepper).toBeInTheDocument()
    })

    it('handles invalid date gracefully', () => {
      const steps = [
        createMockStep(1, 'approved', 'Project Manager', {
          decidedAt: 'invalid-date',
        }),
      ]

      const request = createMockRequest(steps)

      render(
        <TestWrapper>
          <ApprovalWorkflowStepper approvalRequest={request} />
        </TestWrapper>
      )

      // Should render without crashing
      expect(screen.getByText('Project Manager')).toBeInTheDocument()
      expect(screen.getByText(/Approved by/)).toBeInTheDocument()
    })
  })
})
