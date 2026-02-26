import { useTranslation } from 'react-i18next'
import { keyframeAnimations, easing, createAnimation } from '../../utils/animations'
import { CheckCircleIcon, PendingIcon, CancelIcon, HourglassEmptyIcon, EditIcon, ErrorIcon, WarningIcon } from '@/icons'
import { Chip, useTheme } from '@/mui'

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

interface ColorPair { bg: string; text: string }

interface StatusColors {
  icon: React.ReactNode
  light: ColorPair
  dark: ColorPair
}

const neutral = {
  light: { bg: '#F1F5F9', text: '#64748B' },
  dark: { bg: 'rgba(148,163,184,0.14)', text: '#CBD5E1' },
}
const success = {
  light: { bg: '#F0FDF4', text: '#16A34A' },
  dark: { bg: 'rgba(34,197,94,0.14)', text: '#86EFAC' },
}
const warning = {
  light: { bg: '#FEFCE8', text: '#CA8A04' },
  dark: { bg: 'rgba(234,179,8,0.14)', text: '#FDE047' },
}
const info = {
  light: { bg: '#EFF6FF', text: '#2563EB' },
  dark: { bg: 'rgba(59,130,246,0.14)', text: '#93C5FD' },
}
const error = {
  light: { bg: '#FEF2F2', text: '#DC2626' },
  dark: { bg: 'rgba(239,68,68,0.14)', text: '#FCA5A5' },
}

const statusColors: Record<string, StatusColors> = {
  draft: { icon: <EditIcon />, ...neutral },
  inactive: { icon: <CancelIcon />, ...neutral },
  archived: { icon: <CancelIcon />, ...neutral },
  closed: { icon: <CheckCircleIcon />, ...neutral },
  not_applicable: { icon: <CancelIcon />, ...neutral },
  low: { icon: <CheckCircleIcon />, ...neutral },

  approved: { icon: <CheckCircleIcon />, ...success },
  active: { icon: <CheckCircleIcon />, ...success },
  completed: { icon: <CheckCircleIcon />, ...success },
  answered: { icon: <CheckCircleIcon />, ...success },

  pending: { icon: <PendingIcon />, ...warning },
  revision_requested: { icon: <EditIcon />, ...warning },
  on_hold: { icon: <PendingIcon />, ...warning },
  waiting_response: { icon: <HourglassEmptyIcon />, ...warning },
  medium: { icon: <WarningIcon />, ...warning },
  pending_votes: { icon: <HourglassEmptyIcon />, ...warning },

  submitted: { icon: <HourglassEmptyIcon />, ...info },
  under_review: { icon: <HourglassEmptyIcon />, ...info },
  scheduled: { icon: <HourglassEmptyIcon />, ...info },
  in_progress: { icon: <PendingIcon />, ...info },
  invitations_sent: { icon: <PendingIcon />, ...info },
  open: { icon: <PendingIcon />, ...info },

  rejected: { icon: <CancelIcon />, ...error },
  cancelled: { icon: <CancelIcon />, ...error },
  urgent: { icon: <ErrorIcon />, ...error },
  critical: { icon: <ErrorIcon />, ...error },
  high: { icon: <WarningIcon />, ...error },
}

const fallbackColors: StatusColors = { icon: null, ...neutral }

const activeStatuses: StatusType[] = ['urgent', 'critical']

export function StatusBadge({ status, size = 'small', showIcon = false }: StatusBadgeProps) {
  const { t } = useTranslation()
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const config = statusColors[status] || fallbackColors
  const colors = isDark ? config.dark : config.light
  const label = t(`common.statuses.${status}`, status)
  const shouldPulse = activeStatuses.includes(status)

  return (
    <Chip
      label={label}
      size={size}
      icon={showIcon ? config.icon as React.ReactElement : undefined}
      sx={{
        bgcolor: colors.bg,
        color: colors.text,
        fontWeight: 600,
        fontSize: '0.75rem',
        letterSpacing: '0.02em',
        borderRadius: 1.5,
        '& .MuiChip-icon': { fontSize: '1rem', color: colors.text },
        ...(shouldPulse && {
          animation: createAnimation(keyframeAnimations.pulse, 2000, easing.easeInOut, 'infinite'),
          '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
        }),
      }}
    />
  )
}

interface SeverityBadgeProps {
  severity: 'critical' | 'high' | 'medium' | 'low'
  size?: 'small' | 'medium'
}

const severityColors: Record<string, { light: ColorPair; dark: ColorPair }> = {
  critical: { light: { bg: '#FEE2E2', text: '#DC2626' }, dark: { bg: 'rgba(239,68,68,0.14)', text: '#FCA5A5' } },
  high: { light: { bg: '#FFEDD5', text: '#EA580C' }, dark: { bg: 'rgba(234,88,12,0.14)', text: '#FDBA74' } },
  medium: { light: { bg: '#FEF3C7', text: '#CA8A04' }, dark: { bg: 'rgba(234,179,8,0.14)', text: '#FDE047' } },
  low: { light: { bg: '#F1F5F9', text: '#64748B' }, dark: { bg: 'rgba(148,163,184,0.14)', text: '#CBD5E1' } },
}

export function SeverityBadge({ severity, size = 'small' }: SeverityBadgeProps) {
  const { t } = useTranslation()
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const config = severityColors[severity] || severityColors.low
  const colors = isDark ? config.dark : config.light

  return (
    <Chip
      label={t(`defects.severities.${severity}`, { defaultValue: severity.charAt(0).toUpperCase() + severity.slice(1) })}
      size={size}
      sx={{
        bgcolor: colors.bg,
        color: colors.text,
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

const priorityColors = [error, warning, info, neutral]

export function PriorityBadge({ priority, size = 'small' }: PriorityBadgeProps) {
  const { t } = useTranslation()
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const labelKeys = ['common.statuses.urgent', 'common.statuses.high', 'common.statuses.medium', 'common.statuses.low']
  const config = priorityColors[priority - 1] || neutral
  const colors = isDark ? config.dark : config.light

  return (
    <Chip
      label={t(labelKeys[priority - 1])}
      size={size}
      sx={{
        bgcolor: colors.bg,
        color: colors.text,
        fontWeight: 600,
        fontSize: '0.75rem',
        letterSpacing: '0.02em',
        borderRadius: 1.5,
      }}
    />
  )
}
