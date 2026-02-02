import { Chip, ChipProps } from '@mui/material'
import { styled } from '@mui/material/styles'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import PendingIcon from '@mui/icons-material/Pending'
import CancelIcon from '@mui/icons-material/Cancel'
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty'
import EditIcon from '@mui/icons-material/Edit'
import ErrorIcon from '@mui/icons-material/Error'
import WarningIcon from '@mui/icons-material/Warning'

export type StatusType =
  | 'draft'
  | 'pending'
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'revision_requested'
  | 'active'
  | 'inactive'
  | 'completed'
  | 'on_hold'
  | 'archived'
  | 'scheduled'
  | 'in_progress'
  | 'cancelled'
  | 'invitations_sent'
  | 'open'
  | 'closed'
  | 'waiting_response'
  | 'answered'
  | 'urgent'
  | 'critical'
  | 'high'
  | 'medium'
  | 'low'
  | string

interface StatusBadgeProps {
  status: StatusType
  size?: 'small' | 'medium'
  showIcon?: boolean
}

const statusConfig: Record<StatusType, { label: string; color: ChipProps['color']; icon: React.ReactNode }> = {
  draft: { label: 'Draft', color: 'default', icon: <EditIcon /> },
  pending: { label: 'Pending', color: 'warning', icon: <PendingIcon /> },
  submitted: { label: 'Submitted', color: 'info', icon: <HourglassEmptyIcon /> },
  under_review: { label: 'Under Review', color: 'info', icon: <HourglassEmptyIcon /> },
  approved: { label: 'Approved', color: 'success', icon: <CheckCircleIcon /> },
  rejected: { label: 'Rejected', color: 'error', icon: <CancelIcon /> },
  revision_requested: { label: 'Revision Requested', color: 'warning', icon: <EditIcon /> },
  active: { label: 'Active', color: 'success', icon: <CheckCircleIcon /> },
  inactive: { label: 'Inactive', color: 'default', icon: <CancelIcon /> },
  completed: { label: 'Completed', color: 'success', icon: <CheckCircleIcon /> },
  on_hold: { label: 'On Hold', color: 'warning', icon: <PendingIcon /> },
  archived: { label: 'Archived', color: 'default', icon: <CancelIcon /> },
  scheduled: { label: 'Scheduled', color: 'info', icon: <HourglassEmptyIcon /> },
  in_progress: { label: 'In Progress', color: 'info', icon: <PendingIcon /> },
  cancelled: { label: 'Cancelled', color: 'error', icon: <CancelIcon /> },
  invitations_sent: { label: 'Invitations Sent', color: 'info', icon: <PendingIcon /> },
  open: { label: 'Open', color: 'info', icon: <PendingIcon /> },
  closed: { label: 'Closed', color: 'default', icon: <CheckCircleIcon /> },
  waiting_response: { label: 'Waiting Response', color: 'warning', icon: <HourglassEmptyIcon /> },
  answered: { label: 'Answered', color: 'success', icon: <CheckCircleIcon /> },
  urgent: { label: 'Urgent', color: 'error', icon: <ErrorIcon /> },
  critical: { label: 'Critical', color: 'error', icon: <ErrorIcon /> },
  high: { label: 'High', color: 'error', icon: <WarningIcon /> },
  medium: { label: 'Medium', color: 'warning', icon: <WarningIcon /> },
  low: { label: 'Low', color: 'default', icon: <CheckCircleIcon /> },
}

const StyledChip = styled(Chip)(() => ({
  fontWeight: 600,
  fontSize: '0.75rem',
  letterSpacing: '0.02em',
  minHeight: 40,
  '& .MuiChip-icon': {
    fontSize: '1rem',
  },
}))

export function StatusBadge({ status, size = 'small', showIcon = false }: StatusBadgeProps) {
  const config = statusConfig[status] || { label: status, color: 'default', icon: null }

  return (
    <StyledChip
      label={config.label}
      color={config.color}
      size={size}
      icon={showIcon ? config.icon as React.ReactElement : undefined}
      sx={{
        borderRadius: 1.5,
      }}
    />
  )
}

interface SeverityBadgeProps {
  severity: 'critical' | 'high' | 'medium' | 'low'
  size?: 'small' | 'medium'
}

export function SeverityBadge({ severity, size = 'small' }: SeverityBadgeProps) {
  const colors: Record<string, { bg: string; text: string }> = {
    critical: { bg: '#FEE2E2', text: '#DC2626' },
    high: { bg: '#FFEDD5', text: '#EA580C' },
    medium: { bg: '#FEF3C7', text: '#CA8A04' },
    low: { bg: '#F1F5F9', text: '#64748B' },
  }

  const config = colors[severity] || colors.low

  return (
    <Chip
      label={severity.charAt(0).toUpperCase() + severity.slice(1)}
      size={size}
      sx={{
        bgcolor: config.bg,
        color: config.text,
        fontWeight: 600,
        fontSize: '0.7rem',
        borderRadius: 1,
        minHeight: 40,
      }}
    />
  )
}

interface PriorityBadgeProps {
  priority: 1 | 2 | 3 | 4
  size?: 'small' | 'medium'
}

export function PriorityBadge({ priority, size = 'small' }: PriorityBadgeProps) {
  const labels = ['Urgent', 'High', 'Medium', 'Low']
  const colors = ['error', 'warning', 'info', 'default'] as const

  return (
    <StyledChip
      label={labels[priority - 1]}
      color={colors[priority - 1]}
      size={size}
      sx={{ borderRadius: 1.5 }}
    />
  )
}
