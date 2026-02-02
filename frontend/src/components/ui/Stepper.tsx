import {
  Stepper as MuiStepper,
  Step,
  StepLabel,
  StepConnector,
  Box,
  Typography,
} from '@mui/material'
import { styled } from '@mui/material/styles'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'

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
    width: 44,
    height: 44,
    minWidth: 44,
    minHeight: 44,
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
  return (
    <StepIconContainer active={active} completed={completed} error={error}>
      {completed ? <CheckCircleIcon sx={{ fontSize: 18 }} /> : icon}
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
