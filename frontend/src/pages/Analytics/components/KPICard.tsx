import { TrendingUpIcon, TrendingDownIcon, TrendingFlatIcon } from '@/icons'
import { Card as MuiCard, CardContent, Box, Typography, Skeleton, styled } from '@/mui'

interface AnalyticsKPICardProps {
  title: string
  value: string | number
  trend?: number
  trendLabel?: string
  icon?: React.ReactNode
  loading?: boolean
  color?: 'primary' | 'success' | 'warning' | 'error' | 'info'
  onClick?: () => void
}

const StyledCard = styled(MuiCard, {
  shouldForwardProp: (prop) => prop !== 'hoverable',
})<{ hoverable?: boolean }>(({ theme, hoverable }) => ({
  borderRadius: 12,
  transition: 'all 200ms ease-out',
  cursor: hoverable ? 'pointer' : 'default',
  ...(hoverable && {
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: theme.shadows[4],
    },
  }),
}))

export default function AnalyticsKPICard({
  title,
  value,
  trend,
  trendLabel,
  icon,
  loading = false,
  color = 'primary',
  onClick,
}: AnalyticsKPICardProps) {
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

  if (loading) {
    return (
      <StyledCard>
        <CardContent>
          <Skeleton width={100} height={20} />
          <Skeleton width={80} height={40} sx={{ mt: 1 }} />
          <Skeleton width={60} height={16} sx={{ mt: 1 }} />
        </CardContent>
      </StyledCard>
    )
  }

  return (
    <StyledCard hoverable={!!onClick} onClick={onClick} sx={{ cursor: onClick ? 'pointer' : 'default' }}>
      <CardContent sx={{ p: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <Box>
            <Typography
              variant="body2"
              sx={{
                color: 'text.secondary',
                fontWeight: 500,
                fontSize: '0.8rem',
                mb: 0.5,
              }}
            >
              {title}
            </Typography>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 700,
                color: 'text.primary',
                lineHeight: 1.2,
              }}
            >
              {value}
            </Typography>
          </Box>
          {icon && (
            <Box
              sx={{
                p: 1,
                borderRadius: 2,
                bgcolor: `${color}.main`,
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {icon}
            </Box>
          )}
        </Box>
        {trend !== undefined && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1.5 }}>
            {getTrendIcon()}
            <Typography
              variant="caption"
              sx={{ color: getTrendColor(), fontWeight: 600 }}
            >
              {trend > 0 ? '+' : ''}{trend}%
            </Typography>
            {trendLabel && (
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {trendLabel}
              </Typography>
            )}
          </Box>
        )}
      </CardContent>
    </StyledCard>
  )
}
