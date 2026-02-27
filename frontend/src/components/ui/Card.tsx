import { useTranslation } from 'react-i18next'
import { TrendingUpIcon, TrendingDownIcon, TrendingFlatIcon } from '@/icons'
import { CardContent, CardHeader, CardActions, Box, Typography, Skeleton, SxProps, Theme, alpha } from '@/mui'

interface BaseCardProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
  hoverable?: boolean
  sx?: SxProps<Theme>
}

export function Card({ children, hoverable = false, onClick, sx, ...props }: BaseCardProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (onClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault()
      onClick()
    }
  }

  const isInteractive = !!onClick

  return (
    <Box
      onClick={onClick}
      onKeyDown={isInteractive ? handleKeyDown : undefined}
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      sx={{
        bgcolor: 'background.paper',
        borderRadius: 3,
        border: 1,
        borderColor: 'divider',
        overflow: 'hidden',
        transition: 'border-color 200ms, transform 200ms',
        cursor: hoverable || isInteractive ? 'pointer' : 'default',
        ...((hoverable || isInteractive) && {
          '&:hover': { borderColor: 'primary.main', transform: 'translateY(-1px)' },
          '&:active': { transform: 'translateY(0)' },
          '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 2 },
        }),
        ...sx as Record<string, unknown>,
      }}
      {...props}
    >
      {children}
    </Box>
  )
}

interface KPICardProps {
  title: string
  value: string | number
  trend?: number
  trendLabel?: string
  icon?: React.ReactNode
  loading?: boolean
  color?: 'primary' | 'success' | 'warning' | 'error' | 'info'
  onClick?: () => void
}

export function KPICard({
  title,
  value,
  trend,
  trendLabel,
  icon,
  loading = false,
  color = 'primary',
  onClick,
}: KPICardProps) {
  const getTrendIcon = () => {
    if (trend === undefined) return null
    if (trend > 0) return <TrendingUpIcon fontSize="small" sx={{ color: 'success.main' }} />
    if (trend < 0) return <TrendingDownIcon fontSize="small" sx={{ color: 'error.main' }} />
    return <TrendingFlatIcon fontSize="small" sx={{ color: 'text.secondary' }} />
  }

  const getTrendColor = () => {
    if (trend === undefined) return 'text.secondary'
    if (trend > 0) return 'success.main'
    if (trend < 0) return 'error.main'
    return 'text.secondary'
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (onClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault()
      onClick()
    }
  }

  const isInteractive = !!onClick

  if (loading) {
    return (
      <Box sx={{ bgcolor: 'background.paper', borderRadius: 3, border: 1, borderColor: 'divider', p: { xs: 1.5, sm: 2 } }}>
        <Skeleton width={100} height={20} />
        <Skeleton width={80} height={40} sx={{ mt: 1 }} />
        <Skeleton width={60} height={16} sx={{ mt: 1 }} />
      </Box>
    )
  }

  return (
    <Box
      onClick={onClick}
      onKeyDown={isInteractive ? handleKeyDown : undefined}
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      sx={{
        bgcolor: 'background.paper',
        borderRadius: 3,
        border: 1,
        borderColor: 'divider',
        p: { xs: 1.25, sm: 1.5, md: 2 },
        cursor: isInteractive ? 'pointer' : 'default',
        transition: 'border-color 200ms',
        ...(isInteractive && {
          '&:hover': { borderColor: 'primary.main' },
          '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 2 },
        }),
      }}
    >
      <Box sx={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 1,
        flexWrap: { xs: 'wrap', sm: 'nowrap' }
      }}>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            variant="body2"
            sx={{
              color: 'text.secondary',
              fontWeight: 500,
              fontSize: { xs: '0.7rem', sm: '0.75rem' },
              mb: 0.25,
            }}
          >
            {title}
          </Typography>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 700,
              color: 'text.primary',
              lineHeight: 1.2,
              fontSize: { xs: '1.25rem', sm: '1.5rem', md: '1.625rem' },
              wordBreak: 'break-word',
            }}
          >
            {value}
          </Typography>
        </Box>
        {icon && (
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: 2,
              bgcolor: (theme) => alpha(theme.palette[color].main, 0.15),
              color: `${color}.main`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              '& > svg': { fontSize: { xs: '1.1rem', sm: '1.25rem' } }
            }}
          >
            {icon}
          </Box>
        )}
      </Box>
      {trend !== undefined && (
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          mt: { xs: 1, sm: 1.5 },
          flexWrap: 'wrap'
        }}>
          {getTrendIcon()}
          <Typography variant="caption" sx={{ color: getTrendColor(), fontWeight: 600 }}>
            {trend > 0 ? '+' : ''}{trend}%
          </Typography>
          {trendLabel && (
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {trendLabel}
            </Typography>
          )}
        </Box>
      )}
    </Box>
  )
}

export { CardContent, CardHeader, CardActions }
