import { useTranslation } from 'react-i18next'
import { UrgencyLevel } from '../../types/notification'
import { ErrorIcon, WarningIcon, InfoIcon, TrendingUpIcon } from '@/icons'
import { Box, Chip, styled, useTheme, alpha } from '@/mui'

interface UrgencyBadgeProps {
  urgency: UrgencyLevel
  size?: 'small' | 'medium'
  variant?: 'filled' | 'outlined'
}

const StyledChip = styled(Chip, {
  shouldForwardProp: (prop) => prop !== 'urgencyColor',
})<{ urgencyColor: string }>(({ theme, urgencyColor }) => ({
  fontWeight: 600,
  fontSize: '0.75rem',
  height: 24,
  '& .MuiChip-label': {
    paddingLeft: theme.spacing(1),
    paddingRight: theme.spacing(1),
  },
  '& .MuiChip-icon': {
    marginLeft: theme.spacing(0.5),
  },
  backgroundColor: alpha(urgencyColor, 0.1),
  color: urgencyColor,
  borderColor: urgencyColor,
}))

function getUrgencyConfig(palette: {
  info: { main: string }
  warning: { main: string }
  error: { main: string }
  success: { main: string }
}): Record<
  UrgencyLevel,
  { icon: React.ReactElement; color: string; labelKey: string }
> {
  return {
    low: {
      icon: <InfoIcon sx={{ fontSize: 14 }} />,
      color: palette.info.main,
      labelKey: 'notifications.urgency.low',
    },
    medium: {
      icon: <TrendingUpIcon sx={{ fontSize: 14 }} />,
      color: palette.warning.main,
      labelKey: 'notifications.urgency.medium',
    },
    high: {
      icon: <WarningIcon sx={{ fontSize: 14 }} />,
      color: palette.error.main,
      labelKey: 'notifications.urgency.high',
    },
    critical: {
      icon: <ErrorIcon sx={{ fontSize: 14 }} />,
      color: palette.error.main,
      labelKey: 'notifications.urgency.critical',
    },
  }
}

export function UrgencyBadge({
  urgency,
  size = 'small',
  variant = 'filled',
}: UrgencyBadgeProps) {
  const { t } = useTranslation()
  const theme = useTheme()
  const urgencyConfig = getUrgencyConfig(theme.palette)
  const config = urgencyConfig[urgency]

  return (
    <StyledChip
      icon={config.icon}
      label={t(config.labelKey)}
      size={size}
      variant={variant}
      urgencyColor={config.color}
      sx={{
        ...(urgency === 'critical' && {
          animation: 'pulse 2s ease-in-out infinite',
          '@keyframes pulse': {
            '0%, 100%': {
              opacity: 1,
            },
            '50%': {
              opacity: 0.7,
            },
          },
        }),
      }}
    />
  )
}
