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
  useMediaQuery,
  useTheme,
} from '@/mui'
import { useTranslation } from 'react-i18next'
import { getDateLocale } from '../../utils/dateLocale'
import { CheckCircleIcon, CancelIcon, ErrorIcon, HourglassEmptyIcon, RadioButtonUncheckedIcon } from '@/icons'
import { styled } from '@/mui'

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
  approvedById?: string
  approvedBy?: UserResponse
  approverRole?: string
  status: string
  comments?: string
  approvedAt?: string
  createdAt?: string
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
const CompletedIcon = styled(CheckCircleIcon)({
  fontSize: 18,
  color: 'inherit',
})

const RejectedIcon = styled(CancelIcon)({
  fontSize: 18,
  color: 'inherit',
})

const ErrorStepIcon = styled(ErrorIcon)({
  fontSize: 18,
  color: 'inherit',
})

const PendingIcon = styled(HourglassEmptyIcon)({
  fontSize: 18,
  color: 'inherit',
})

const InactiveIcon = styled(RadioButtonUncheckedIcon)({
  fontSize: 18,
  color: 'inherit',
  opacity: 0.5,
})

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
  const { t } = useTranslation()

  // Handle edge case: empty steps array
  if (!steps || steps.length === 0) {
    return (
      <Box
        sx={{
          width: '100%',
          py: 2,
          textAlign: 'center',
          color: 'text.secondary',
        }}
      >
        <Typography variant="body2">{t('stepper.noSteps')}</Typography>
      </Box>
    )
  }

  // Clamp activeStep to valid range
  const validActiveStep = Math.max(0, Math.min(activeStep, steps.length))

  return (
    <MuiStepper
      activeStep={validActiveStep}
      orientation={orientation}
      alternativeLabel={alternativeLabel && orientation === 'horizontal'}
      connector={<CustomConnector />}
    >
      {steps.map((step, index) => (
        <Step key={`${step.label}-${index}`} completed={index < validActiveStep}>
          <StepLabel
            error={step.error}
            optional={
              step.optional ? (
                <Typography variant="caption" color="text.secondary">
                  {t('stepper.optional')}
                </Typography>
              ) : step.description ? (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    // Ensure descriptions wrap properly
                    wordBreak: 'break-word',
                    overflowWrap: 'break-word',
                  }}
                >
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
                fontWeight: index === validActiveStep ? 600 : 400,
                color: index === validActiveStep ? 'text.primary' : 'text.secondary',
                // Ensure labels wrap properly on small screens
                wordBreak: 'break-word',
                overflowWrap: 'break-word',
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
  const { t } = useTranslation()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  const steps: StepItem[] = [
    { label: t('stepper.draft'), description: t('stepper.initialCreation') },
    { label: t('stepper.submitted'), description: t('stepper.awaitingReview') },
    { label: t('stepper.underReview'), description: t('stepper.beingEvaluated') },
    { label: status === 'rejected' ? t('approvals.rejected') : t('approvals.approved'), description: t('stepper.finalDecision') },
  ]

  const statusToStep: Record<string, number> = {
    draft: 0,
    submitted: 1,
    under_review: 2,
    approved: 4,
    rejected: 3,
  }

  // Handle unknown status gracefully
  const activeStep = statusToStep[status] ?? 0

  return (
    <Box sx={{ width: '100%', py: 2 }}>
      <Stepper
        steps={steps.map((step, index) => ({
          ...step,
          error: status === 'rejected' && index === 3,
        }))}
        activeStep={activeStep}
        orientation={isMobile ? 'vertical' : 'horizontal'}
        alternativeLabel={!isMobile}
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
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  // Handle edge cases: invalid totalSteps
  const validTotalSteps = Math.max(1, totalSteps)
  const validCurrentStep = Math.max(0, Math.min(currentStep, validTotalSteps))

  const steps: StepItem[] = Array.from({ length: validTotalSteps }, (_, i) => ({
    label: labels?.[i] || `Step ${i + 1}`,
  }))

  return (
    <Stepper
      steps={steps}
      activeStep={validCurrentStep}
      orientation={isMobile ? 'vertical' : 'horizontal'}
      alternativeLabel={!isMobile}
    />
  )
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
  orientation: orientationProp = 'horizontal',
}: ApprovalWorkflowStepperProps) {
  const { t } = useTranslation()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  // Use vertical orientation on mobile/tablet, or if explicitly set
  const orientation = orientationProp === 'vertical' || isMobile ? 'vertical' : 'horizontal'

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
        <Typography variant="body2">{t('stepper.noApprovalSteps')}</Typography>
      </Box>
    )
  }

  // Sort steps by stepOrder to ensure correct sequence
  const sortedSteps = [...approvalRequest.steps].sort((a, b) => a.stepOrder - b.stepOrder)

  // Find current step (first pending step in sequence)
  const currentStepIndex = sortedSteps.findIndex((step) => step.status === 'pending')
  const activeStep = currentStepIndex >= 0 ? currentStepIndex : sortedSteps.length

  // Check if all steps are complete
  const allStepsComplete = sortedSteps.every((step) =>
    step.status === 'approved' || step.status === 'rejected' || step.status === 'revision_requested'
  )

  // Map approval steps to stepper format
  const steps: StepItem[] = sortedSteps.map((step) => ({
    label: step.approverRole || t('stepper.stepNumber', { number: step.stepOrder }),
    description: getStepDescription(step, t),
    error: step.status === 'rejected',
  }))

  return (
    <Box sx={{ width: '100%', py: 2 }}>
      <Stepper
        steps={steps}
        activeStep={activeStep}
        orientation={orientation}
        alternativeLabel={!isMobile && orientation === 'horizontal'}
      />

      {/* Completion status message */}
      {allStepsComplete && (
        <Box
          sx={{
            mt: 3,
            p: 2,
            borderRadius: 1,
            bgcolor: approvalRequest.currentStatus === 'approved' ? 'success.light' : 'error.light',
            color: approvalRequest.currentStatus === 'approved' ? 'success.dark' : 'error.dark',
          }}
        >
          <Typography variant="body2" fontWeight={600}>
            {approvalRequest.currentStatus === 'approved'
              ? `✓ ${t('stepper.allStepsCompleted')}`
              : approvalRequest.currentStatus === 'rejected'
              ? `✗ ${t('stepper.requestRejected')}`
              : `⚠ ${t('stepper.requiresAttention')}`}
          </Typography>
        </Box>
      )}

      {/* Step Details Panel - Shows approver info and comments for completed steps */}
      {sortedSteps.some((step) =>
        step.status !== 'pending' && (step.comments || step.approvedBy || step.approvedAt)
      ) && (
        <Box sx={{ mt: 3 }}>
          {sortedSteps
            .filter((step) => step.status !== 'pending')
            .map((step) => {
              // Handle missing approver info gracefully
              const approverName = step.approvedBy?.name ||
                step.approvedBy?.email ||
                (step.approvedById ? `User ${step.approvedById.slice(0, 8)}` : 'Unknown approver')

              const formattedDate = step.approvedAt
                ? new Date(step.approvedAt).toLocaleString(getDateLocale(), {
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
                  <CardContent
                    sx={{
                      // Responsive padding
                      px: isMobile ? 2 : 3,
                      py: isMobile ? 1.5 : 2,
                    }}
                  >
                    <Typography
                      variant="subtitle2"
                      fontWeight={600}
                      gutterBottom
                      sx={{
                        // Ensure text wraps on small screens
                        wordBreak: 'break-word',
                        overflowWrap: 'break-word',
                      }}
                    >
                      {step.approverRole || `Step ${step.stepOrder}`}
                    </Typography>

                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 1,
                        mb: 1,
                        // Stack vertically on very small screens if needed
                        flexWrap: 'wrap',
                      }}
                    >
                      {step.status === 'approved' && (
                        <CompletedIcon
                          sx={{
                            fontSize: 16,
                            color: 'success.main',
                            flexShrink: 0,
                            mt: 0.25,
                          }}
                        />
                      )}
                      {step.status === 'rejected' && (
                        <RejectedIcon
                          sx={{
                            fontSize: 16,
                            color: 'error.main',
                            flexShrink: 0,
                            mt: 0.25,
                          }}
                        />
                      )}
                      {step.status === 'revision_requested' && (
                        <ErrorStepIcon
                          sx={{
                            fontSize: 16,
                            color: 'warning.main',
                            flexShrink: 0,
                            mt: 0.25,
                          }}
                        />
                      )}

                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          // Ensure text wraps properly
                          wordBreak: 'break-word',
                          overflowWrap: 'break-word',
                          flex: 1,
                        }}
                      >
                        {step.status === 'approved' && t('approvals.approved')}
                        {step.status === 'rejected' && t('approvals.rejected')}
                        {step.status === 'revision_requested' && t('stepper.revisionRequested')}
                        {` ${t('stepper.by')} `}
                        <strong>{approverName}</strong>
                        {formattedDate && ` ${t('stepper.on')} ${formattedDate}`}
                      </Typography>
                    </Box>

                    {step.comments && (
                      <>
                        <Divider sx={{ my: 1.5 }} />
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            fontStyle: 'italic',
                            // Handle long comments with proper wrapping
                            wordBreak: 'break-word',
                            overflowWrap: 'break-word',
                            whiteSpace: 'pre-wrap',
                            // Limit max height for very long comments
                            maxHeight: isMobile ? '120px' : '200px',
                            overflow: 'auto',
                          }}
                        >
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
 * Handles edge cases: missing approver data, missing dates, unknown statuses
 */
function getStepDescription(step: ApprovalStepResponse, t: (key: string, opts?: Record<string, unknown>) => string): string {
  const getApproverName = (): string => {
    if (step.approvedBy?.name) return step.approvedBy.name
    if (step.approvedBy?.email) return step.approvedBy.email
    if (step.approvedById) return step.approvedById.slice(0, 8)
    return t('approvals.unknown')
  }

  switch (step.status) {
    case 'approved':
      if (step.approvedAt) {
        try {
          const date = new Date(step.approvedAt).toLocaleDateString(getDateLocale())
          const approverName = getApproverName()
          return t('stepper.approvedByOn', { name: approverName, date })
        } catch {
          return t('stepper.approvedBy', { name: getApproverName() })
        }
      }
      return t('common.statuses.approved')

    case 'rejected':
      if (step.approvedAt) {
        try {
          const date = new Date(step.approvedAt).toLocaleDateString(getDateLocale())
          const approverName = getApproverName()
          return t('stepper.rejectedByOn', { name: approverName, date })
        } catch {
          return t('stepper.rejectedBy', { name: getApproverName() })
        }
      }
      return t('common.statuses.rejected')

    case 'revision_requested':
      return t('stepper.revisionRequestedBy', { name: getApproverName() })

    case 'pending':
      if (step.approvedBy || step.approvedById) {
        return t('stepper.assignedTo', { name: getApproverName() })
      }
      return t('stepper.pendingAssignment')

    default:
      return step.status ? t(`common.statuses.${step.status}`) : t('common.statuses.pending')
  }
}
