import {
  Stepper as MuiStepper,
  Step,
  StepLabel,
  StepConnector,
  Box,
  Typography,
  Card,
  CardContent,
  Divider,
} from '@mui/material'
import { styled } from '@mui/material/styles'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CancelIcon from '@mui/icons-material/Cancel'
import ErrorIcon from '@mui/icons-material/Error'
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty'
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked'

// Approval workflow interfaces
export interface UserResponse {
  id: string
  email: string
  name?: string
}

export interface ApprovalStepResponse {
  id: string
  approvalRequestId: string
  stepOrder: number
  approverId?: string
  approver?: UserResponse
  approverRole?: string
  status: string
  comments?: string
  decidedAt?: string
  createdAt: string
}

export interface ApprovalRequestResponse {
  id: string
  projectId: string
  entityType: string
  entityId: string
  currentStatus: string
  createdAt: string
  createdBy?: UserResponse
  steps: ApprovalStepResponse[]
}

export interface ApprovalAction {
  comments?: string
}

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

const CustomConnector = styled(StepConnector)(({ theme }) => ({
  '&.MuiStepConnector-root': {
    '&.Mui-active, &.Mui-completed': {
      '& .MuiStepConnector-line': {
        borderColor: theme.palette.primary.main,
      },
    },
  },
  '& .MuiStepConnector-line': {
    borderColor: theme.palette.divider,
    borderTopWidth: 2,
    borderRadius: 1,
  },
}))

const StepIconContainer = styled('div')<{ active: boolean; completed: boolean; error: boolean }>(
  ({ theme, active, completed, error }) => ({
    width: 32,
    height: 32,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: completed
      ? theme.palette.primary.main
      : error
      ? theme.palette.error.main
      : active
      ? theme.palette.primary.main
      : theme.palette.action.disabledBackground,
    color: completed || active || error ? '#fff' : theme.palette.text.disabled,
    fontWeight: 600,
    fontSize: '0.875rem',
    transition: 'all 200ms ease-out',
  })
)

// Styled icon components for different step statuses
const CompletedIcon = styled(CheckCircleIcon)(({ theme }) => ({
  fontSize: 18,
  color: 'inherit',
}))

const RejectedIcon = styled(CancelIcon)(({ theme }) => ({
  fontSize: 18,
  color: 'inherit',
}))

const ErrorStepIcon = styled(ErrorIcon)(({ theme }) => ({
  fontSize: 18,
  color: 'inherit',
}))

const PendingIcon = styled(HourglassEmptyIcon)(({ theme }) => ({
  fontSize: 18,
  color: 'inherit',
}))

const InactiveIcon = styled(RadioButtonUncheckedIcon)(({ theme }) => ({
  fontSize: 18,
  color: 'inherit',
  opacity: 0.5,
}))

function CustomStepIcon({
  icon,
  active,
  completed,
  error,
}: {
  icon: React.ReactNode
  active: boolean
  completed: boolean
  error: boolean
}) {
  const getIconComponent = () => {
    if (completed) return <CompletedIcon />
    if (error) return <RejectedIcon />
    return icon
  }

  return (
    <StepIconContainer active={active} completed={completed} error={error}>
      {getIconComponent()}
    </StepIconContainer>
  )
}

export function Stepper({
  steps,
  activeStep,
  orientation = 'horizontal',
  alternativeLabel = true,
}: StepperProps) {
  return (
    <MuiStepper
      activeStep={activeStep}
      orientation={orientation}
      alternativeLabel={alternativeLabel && orientation === 'horizontal'}
      connector={<CustomConnector />}
    >
      {steps.map((step, index) => (
        <Step key={step.label} completed={index < activeStep}>
          <StepLabel
            error={step.error}
            optional={
              step.optional ? (
                <Typography variant="caption" color="text.secondary">
                  Optional
                </Typography>
              ) : step.description ? (
                <Typography variant="caption" color="text.secondary">
                  {step.description}
                </Typography>
              ) : undefined
            }
            StepIconComponent={(props) => (
              <CustomStepIcon
                icon={index + 1}
                active={props.active || false}
                completed={props.completed || false}
                error={step.error || false}
              />
            )}
          >
            <Typography
              variant="body2"
              sx={{
                fontWeight: index === activeStep ? 600 : 400,
                color: index === activeStep ? 'text.primary' : 'text.secondary',
              }}
            >
              {step.label}
            </Typography>
          </StepLabel>
        </Step>
      ))}
    </MuiStepper>
  )
}

interface ApprovalStepperProps {
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected'
}

export function ApprovalStepper({ status }: ApprovalStepperProps) {
  const steps: StepItem[] = [
    { label: 'Draft', description: 'Initial creation' },
    { label: 'Submitted', description: 'Awaiting review' },
    { label: 'Under Review', description: 'Being evaluated' },
    { label: status === 'rejected' ? 'Rejected' : 'Approved', description: 'Final decision' },
  ]

  const statusToStep: Record<string, number> = {
    draft: 0,
    submitted: 1,
    under_review: 2,
    approved: 4,
    rejected: 3,
  }

  const activeStep = statusToStep[status] ?? 0

  return (
    <Box sx={{ width: '100%', py: 2 }}>
      <Stepper
        steps={steps.map((step, index) => ({
          ...step,
          error: status === 'rejected' && index === 3,
        }))}
        activeStep={activeStep}
      />
    </Box>
  )
}

interface ProgressStepperProps {
  currentStep: number
  totalSteps: number
  labels?: string[]
}

export function ProgressStepper({ currentStep, totalSteps, labels }: ProgressStepperProps) {
  const steps: StepItem[] = Array.from({ length: totalSteps }, (_, i) => ({
    label: labels?.[i] || `Step ${i + 1}`,
  }))

  return <Stepper steps={steps} activeStep={currentStep} />
}

interface ApprovalWorkflowStepperProps {
  approvalRequest: ApprovalRequestResponse
  orientation?: 'horizontal' | 'vertical'
}

/**
 * ApprovalWorkflowStepper - Enhanced stepper component that visualizes multi-step approval workflows
 *
 * Displays each approval step with:
 * - Approver role and assignment details
 * - Current status (pending, approved, rejected, revision_requested)
 * - Completion details (approver name, timestamp, comments)
 * - Visual status indicators with appropriate icons and colors
 */
export function ApprovalWorkflowStepper({
  approvalRequest,
  orientation = 'horizontal',
}: ApprovalWorkflowStepperProps) {
  // Handle empty steps case
  if (!approvalRequest.steps || approvalRequest.steps.length === 0) {
    return (
      <Box
        sx={{
          width: '100%',
          py: 3,
          textAlign: 'center',
          color: 'text.secondary',
        }}
      >
        <Typography variant="body2">No approval steps defined</Typography>
      </Box>
    )
  }

  // Sort steps by stepOrder to ensure correct sequence
  const sortedSteps = [...approvalRequest.steps].sort((a, b) => a.stepOrder - b.stepOrder)

  // Find current step (first pending step in sequence)
  const currentStepIndex = sortedSteps.findIndex((step) => step.status === 'pending')
  const activeStep = currentStepIndex >= 0 ? currentStepIndex : sortedSteps.length

  // Map approval steps to stepper format
  const steps: StepItem[] = sortedSteps.map((step) => ({
    label: step.approverRole || `Step ${step.stepOrder}`,
    description: getStepDescription(step),
    error: step.status === 'rejected',
  }))

  return (
    <Box sx={{ width: '100%', py: 2 }}>
      <Stepper steps={steps} activeStep={activeStep} orientation={orientation} />

      {/* Step Details Panel - Shows approver info and comments for completed steps */}
      {sortedSteps.some((step) =>
        step.status !== 'pending' && (step.comments || step.approver || step.decidedAt)
      ) && (
        <Box sx={{ mt: 3 }}>
          {sortedSteps
            .filter((step) => step.status !== 'pending')
            .map((step, index) => {
              const approverName = step.approver?.name || step.approver?.email || 'Unknown'
              const formattedDate = step.decidedAt
                ? new Date(step.decidedAt).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })
                : null

              return (
                <Card
                  key={step.id}
                  sx={{
                    mb: 2,
                    borderLeft: 4,
                    borderLeftColor:
                      step.status === 'approved'
                        ? 'success.main'
                        : step.status === 'rejected'
                        ? 'error.main'
                        : 'warning.main',
                  }}
                >
                  <CardContent>
                    <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                      {step.approverRole || `Step ${step.stepOrder}`}
                    </Typography>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      {step.status === 'approved' && (
                        <CompletedIcon sx={{ fontSize: 16, color: 'success.main' }} />
                      )}
                      {step.status === 'rejected' && (
                        <RejectedIcon sx={{ fontSize: 16, color: 'error.main' }} />
                      )}
                      {step.status === 'revision_requested' && (
                        <ErrorStepIcon sx={{ fontSize: 16, color: 'warning.main' }} />
                      )}

                      <Typography variant="body2" color="text.secondary">
                        {step.status === 'approved' && 'Approved'}
                        {step.status === 'rejected' && 'Rejected'}
                        {step.status === 'revision_requested' && 'Revision Requested'}
                        {' by '}
                        <strong>{approverName}</strong>
                        {formattedDate && ` on ${formattedDate}`}
                      </Typography>
                    </Box>

                    {step.comments && (
                      <>
                        <Divider sx={{ my: 1.5 }} />
                        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                          "{step.comments}"
                        </Typography>
                      </>
                    )}
                  </CardContent>
                </Card>
              )
            })}
        </Box>
      )}
    </Box>
  )
}

/**
 * Helper function to generate step description based on status and approver info
 */
function getStepDescription(step: ApprovalStepResponse): string {
  switch (step.status) {
    case 'approved':
      if (step.approver && step.decidedAt) {
        const approverName = step.approver.name || step.approver.email
        const date = new Date(step.decidedAt).toLocaleDateString()
        return `Approved by ${approverName} on ${date}`
      }
      return 'Approved'

    case 'rejected':
      if (step.approver && step.decidedAt) {
        const approverName = step.approver.name || step.approver.email
        const date = new Date(step.decidedAt).toLocaleDateString()
        return `Rejected by ${approverName} on ${date}`
      }
      return 'Rejected'

    case 'revision_requested':
      if (step.approver && step.decidedAt) {
        const approverName = step.approver.name || step.approver.email
        return `Revision requested by ${approverName}`
      }
      return 'Revision requested'

    case 'pending':
      if (step.approver) {
        const approverName = step.approver.name || step.approver.email
        return `Assigned to ${approverName}`
      }
      return 'Pending assignment'

    default:
      return ''
  }
}
