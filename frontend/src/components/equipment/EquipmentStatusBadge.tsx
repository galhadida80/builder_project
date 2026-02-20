import { useTranslation } from 'react-i18next'
import type { ApprovalStatus } from '../../types'
import { Chip } from '@/mui'

interface EquipmentStatusBadgeProps {
  status: ApprovalStatus
  size?: 'small' | 'medium'
}

const statusColors: Record<ApprovalStatus, 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
  draft: 'default',
  submitted: 'info',
  under_review: 'warning',
  approved: 'success',
  rejected: 'error',
  revision_requested: 'secondary',
}

export default function EquipmentStatusBadge({ status, size = 'small' }: EquipmentStatusBadgeProps) {
  const { t } = useTranslation()

  return (
    <Chip
      label={t(`common.statuses.${status}`)}
      color={statusColors[status]}
      size={size}
      sx={{
        fontWeight: 500,
        fontSize: size === 'small' ? '0.75rem' : '0.875rem',
      }}
    />
  )
}
