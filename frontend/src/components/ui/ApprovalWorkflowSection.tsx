import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from './Button'
import { ApprovalStepper, ApprovalWorkflowStepper } from './Stepper'
import type { ApprovalRequestResponse } from './Stepper'
import { SendIcon, ExpandMoreIcon, ExpandLessIcon } from '@/icons'
import { Box, Typography, Collapse } from '@/mui'

type ApprovalStatus = 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'revision_requested'

interface ApprovalWorkflowSectionProps {
  status: ApprovalStatus
  approvalRequest?: ApprovalRequestResponse | null
  onSubmitForApproval?: () => void
  submitting?: boolean
  canSubmit?: boolean
  title?: string
  showActions?: boolean
}

export default function ApprovalWorkflowSection({
  status,
  approvalRequest,
  onSubmitForApproval,
  submitting = false,
  canSubmit = true,
  title,
  showActions = true,
}: ApprovalWorkflowSectionProps) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(true)

  const normalizedStatus = status === 'revision_requested' ? 'rejected' : status

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          mb: expanded ? 1.5 : 0,
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 600 }}>
          {title || t('approvalWorkflow.title')}
        </Typography>
        {expanded ? <ExpandLessIcon fontSize="small" color="action" /> : <ExpandMoreIcon fontSize="small" color="action" />}
      </Box>

      <Collapse in={expanded}>
        {approvalRequest && approvalRequest.steps?.length > 0 ? (
          <ApprovalWorkflowStepper approvalRequest={approvalRequest} orientation="vertical" />
        ) : (
          <ApprovalStepper status={normalizedStatus as 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected'} />
        )}

        {showActions && status === 'draft' && onSubmitForApproval && (
          <Box sx={{ mt: 2 }}>
            <Button
              variant="primary"
              icon={submitting ? undefined : <SendIcon />}
              loading={submitting}
              fullWidth
              onClick={onSubmitForApproval}
              disabled={!canSubmit}
            >
              {t('approvalWorkflow.submitForApproval')}
            </Button>
          </Box>
        )}

        {status === 'revision_requested' && onSubmitForApproval && showActions && (
          <Box sx={{ mt: 2 }}>
            <Button
              variant="primary"
              icon={submitting ? undefined : <SendIcon />}
              loading={submitting}
              fullWidth
              onClick={onSubmitForApproval}
              disabled={!canSubmit}
            >
              {t('approvalWorkflow.resubmit')}
            </Button>
          </Box>
        )}
      </Collapse>
    </Box>
  )
}
