import { useTranslation } from 'react-i18next'
import { Chip, useTheme } from '@/mui'
import { WarningIcon } from '@/icons'
import { formatFutureRelativeTime } from '../../utils/dateUtils'
import type { TrainingStatus } from '../../types/safety'

interface TrainingStatusBadgeProps {
  status: TrainingStatus
  expiryDate?: string
  size?: 'small' | 'medium'
}

export function TrainingStatusBadge({ status, expiryDate, size = 'small' }: TrainingStatusBadgeProps) {
  const { t } = useTranslation()
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  const statusConfig: Record<
    TrainingStatus,
    { light: { bg: string; text: string }; dark: { bg: string; text: string }; icon?: React.ReactNode }
  > = {
    valid: {
      light: { bg: '#F0FDF4', text: '#16A34A' },
      dark: { bg: 'rgba(34,197,94,0.14)', text: '#86EFAC' },
    },
    expiring_soon: {
      light: { bg: '#FEFCE8', text: '#CA8A04' },
      dark: { bg: 'rgba(234,179,8,0.14)', text: '#FDE047' },
      icon: <WarningIcon />,
    },
    expired: {
      light: { bg: '#FEF2F2', text: '#DC2626' },
      dark: { bg: 'rgba(239,68,68,0.14)', text: '#FCA5A5' },
      icon: <WarningIcon />,
    },
  }

  const config = statusConfig[status]
  const colors = isDark ? config.dark : config.light
  const label =
    status === 'expiring_soon' && expiryDate
      ? formatFutureRelativeTime(expiryDate, t)
      : t(`safetyTraining.status.${status}`, status)

  return (
    <Chip
      label={label}
      size={size}
      icon={config.icon as React.ReactElement | undefined}
      sx={{
        bgcolor: colors.bg,
        color: colors.text,
        fontWeight: 600,
        fontSize: '0.75rem',
        letterSpacing: '0.02em',
        borderRadius: 1.5,
        '& .MuiChip-icon': { fontSize: '1rem', color: colors.text },
      }}
    />
  )
}
