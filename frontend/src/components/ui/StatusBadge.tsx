import { useTranslation } from 'react-i18next'
import { keyframeAnimations, createTransition, duration, easing, createAnimation } from '../../utils/animations'
import { CheckCircleIcon, PendingIcon, CancelIcon, HourglassEmptyIcon, EditIcon, ErrorIcon, WarningIcon } from '@/icons'
import { Chip, ChipProps, styled } from '@/mui'

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
  | 'pending_votes'
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

const activeStatuses: StatusType[] = [
  'urgent',
  'critical',
]

const statusConfig: Record<string, { color: ChipProps['color']; icon: React.ReactNode }> = {
  draft: { color: 'default', icon: <EditIcon /> },
  pending: { color: 'warning', icon: <PendingIcon /> },
  submitted: { color: 'info', icon: <HourglassEmptyIcon /> },
  under_review: { color: 'info', icon: <HourglassEmptyIcon /> },
  approved: { color: 'success', icon: <CheckCircleIcon /> },
  rejected: { color: 'error', icon: <CancelIcon /> },
  revision_requested: { color: 'warning', icon: <EditIcon /> },
  active: { color: 'success', icon: <CheckCircleIcon /> },
  inactive: { color: 'default', icon: <CancelIcon /> },
  completed: { color: 'success', icon: <CheckCircleIcon /> },
  on_hold: { color: 'warning', icon: <PendingIcon /> },
  archived: { color: 'default', icon: <CancelIcon /> },
  scheduled: { color: 'info', icon: <HourglassEmptyIcon /> },
  in_progress: { color: 'info', icon: <PendingIcon /> },
  cancelled: { color: 'error', icon: <CancelIcon /> },
  invitations_sent: { color: 'info', icon: <PendingIcon /> },
  pending_votes: { color: 'warning', icon: <HourglassEmptyIcon /> },
  open: { color: 'info', icon: <PendingIcon /> },
  closed: { color: 'default', icon: <CheckCircleIcon /> },
  waiting_response: { color: 'warning', icon: <HourglassEmptyIcon /> },
  answered: { color: 'success', icon: <CheckCircleIcon /> },
  not_applicable: { color: 'default', icon: <CancelIcon /> },
  urgent: { color: 'error', icon: <ErrorIcon /> },
  critical: { color: 'error', icon: <ErrorIcon /> },
  high: { color: 'error', icon: <WarningIcon /> },
  medium: { color: 'warning', icon: <WarningIcon /> },
  low: { color: 'default', icon: <CheckCircleIcon /> },
}

const StyledChip = styled(Chip)(() => ({
  fontWeight: 600,
  fontSize: '0.75rem',
  letterSpacing: '0.02em',
  '& .MuiChip-icon': {
    fontSize: '1rem',
  },
}))

export function StatusBadge({ status, size = 'small', showIcon = false }: StatusBadgeProps) {
  const { t } = useTranslation()
  const config = statusConfig[status] || { color: 'default', icon: null }
  const label = t(`common.statuses.${status}`, status)
  const shouldPulse = activeStatuses.includes(status)

  return (
    <StyledChip
      label={label}
      color={config.color}
      size={size}
      icon={showIcon ? config.icon as React.ReactElement : undefined}
      sx={{
        borderRadius: 1.5,
        ...(shouldPulse && {
          animation: createAnimation(keyframeAnimations.pulse, 2000, easing.easeInOut, 'infinite'),
          '@media (prefers-reduced-motion: reduce)': {
            animation: 'none',
          },
        }),
      }}
    />
  )
}

interface SeverityBadgeProps {
  severity: 'critical' | 'high' | 'medium' | 'low'
  size?: 'small' | 'medium'
}

export function SeverityBadge({ severity, size = 'small' }: SeverityBadgeProps) {
  const { t } = useTranslation()
  const colors: Record<string, { bg: string; text: string }> = {
    critical: { bg: '#FEE2E2', text: '#DC2626' },
    high: { bg: '#FFEDD5', text: '#EA580C' },
    medium: { bg: '#FEF3C7', text: '#CA8A04' },
    low: { bg: '#F1F5F9', text: '#64748B' },
  }

  const config = colors[severity] || colors.low

  return (
    <Chip
      label={t(`defects.severities.${severity}`, { defaultValue: severity.charAt(0).toUpperCase() + severity.slice(1) })}
      size={size}
      sx={{
        bgcolor: config.bg,
        color: config.text,
        fontWeight: 600,
        fontSize: '0.7rem',
        borderRadius: 1,
        height: size === 'small' ? 24 : 28,
      }}
    />
  )
}

interface PriorityBadgeProps {
  priority: 1 | 2 | 3 | 4
  size?: 'small' | 'medium'
}

export function PriorityBadge({ priority, size = 'small' }: PriorityBadgeProps) {
  const { t } = useTranslation()
  const labelKeys = ['common.statuses.urgent', 'common.statuses.high', 'common.statuses.medium', 'common.statuses.low']
  const colors = ['error', 'warning', 'info', 'default'] as const

  return (
    <StyledChip
      label={t(labelKeys[priority - 1])}
      color={colors[priority - 1]}
      size={size}
      sx={{ borderRadius: 1.5 }}
    />
  )
}
