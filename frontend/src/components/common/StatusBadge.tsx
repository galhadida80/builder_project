import { useTranslation } from 'react-i18next'
import type { ApprovalStatus } from '../../types'
import { Chip } from '@/mui'

interface StatusBadgeProps {
  status: ApprovalStatus
  size?: 'small' | 'medium'
}

const statusColorMap: Record<ApprovalStatus, 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
  draft: 'default',
  submitted: 'info',
  under_review: 'warning',
  approved: 'success',
  rejected: 'error',
  revision_requested: 'secondary',
}

export default function StatusBadge({ status, size = 'small' }: StatusBadgeProps) {
  const { t } = useTranslation()

  const statusKey = `statusBadges.${status}`
  const label = t(statusKey)
  const color = statusColorMap[status]

  return (
    <Chip
      label={label}
      color={color}
      size={size}
      sx={{
        fontWeight: 500,
        fontSize: size === 'small' ? '0.75rem' : '0.875rem',
      }}
    />
  )
}
