import { useTranslation } from 'react-i18next'
import type { PermitStatus } from '../../types/permit'
import { Chip } from '@/mui'

interface PermitStatusBadgeProps {
  status: PermitStatus
  size?: 'small' | 'medium'
}

const statusColors: Record<PermitStatus, 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
  not_applied: 'default',
  applied: 'info',
  under_review: 'warning',
  approved: 'success',
  conditional: 'warning',
  rejected: 'error',
  expired: 'error',
}

export default function PermitStatusBadge({ status, size = 'small' }: PermitStatusBadgeProps) {
  const { t } = useTranslation()

  return (
    <Chip
      label={t(`permits.statuses.${status}`)}
      color={statusColors[status]}
      size={size}
      sx={{
        fontWeight: 500,
        fontSize: size === 'small' ? '0.75rem' : '0.875rem',
      }}
    />
  )
}
