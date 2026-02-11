import { useTranslation } from 'react-i18next'
import { TrendingUpIcon, TrendingDownIcon, TrendingFlatIcon } from '@/icons'
import { Card as MuiCard, CardContent, CardHeader, CardActions, Box, Typography, Skeleton, SxProps, Theme, styled, alpha } from '@/mui'

interface BaseCardProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
  hoverable?: boolean
  sx?: SxProps<Theme>
}

const StyledCard = styled(MuiCard, {
  shouldForwardProp: (prop) => prop !== 'hoverable',
})<{ hoverable?: boolean }>(({ theme, hoverable }) => ({
  borderRadius: 8,
  transition: 'box-shadow 200ms ease-out',
  cursor: hoverable ? 'pointer' : 'default',
  [theme.breakpoints.up('sm')]: {
    borderRadius: 12,
  },
  ...(hoverable && {
    '&:hover': {
      boxShadow: theme.shadows[4],
    },
  }),
}))

export function Card({ children, hoverable = false, onClick, ...props }: BaseCardProps) {
  return (
    <StyledCard hoverable={hoverable} onClick={onClick} {...props}>
      {children}
    </StyledCard>
  )
}

const GlassCard = styled(MuiCard)(({ theme }) => ({
  background: alpha(theme.palette.background.paper, 0.85),
  backdropFilter: 'blur(12px)',
  border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
  borderRadius: 12,
  transition: 'box-shadow 200ms ease-out',
  [theme.breakpoints.up('sm')]: {
    borderRadius: 16,
  },
}))

export function GlassCardComponent({ children, ...props }: BaseCardProps) {
  return <GlassCard {...props}>{children}</GlassCard>
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

  if (loading) {
    return (
      <StyledCard>
        <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
          <Skeleton width={100} height={20} />
          <Skeleton width={80} height={40} sx={{ mt: 1 }} />
          <Skeleton width={60} height={16} sx={{ mt: 1 }} />
        </CardContent>
      </StyledCard>
    )
  }

  return (
    <StyledCard hoverable={!!onClick} onClick={onClick} sx={{ cursor: onClick ? 'pointer' : 'default' }}>
      <CardContent sx={{ p: { xs: 1.5, sm: 2, md: 2.5 } }}>
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
                fontSize: { xs: '0.75rem', sm: '0.8rem' },
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
                fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2rem' },
                wordBreak: 'break-word',
              }}
            >
              {value}
            </Typography>
          </Box>
          {icon && (
            <Box
              sx={{
                p: { xs: 0.75, sm: 1 },
                borderRadius: 2,
                bgcolor: `${color}.main`,
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                '& > svg': {
                  fontSize: { xs: '1.25rem', sm: '1.5rem' }
                }
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

interface FeatureCardProps {
  icon: React.ReactNode
  title: string
  description: string
  onClick?: () => void
}

export function FeatureCard({ icon, title, description, onClick }: FeatureCardProps) {
  return (
    <StyledCard hoverable={!!onClick} onClick={onClick}>
      <CardContent sx={{ p: { xs: 2, sm: 2.5, md: 3 } }}>
        <Box
          sx={{
            width: { xs: 40, sm: 48 },
            height: { xs: 40, sm: 48 },
            borderRadius: 2,
            bgcolor: 'primary.main',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mb: { xs: 1.5, sm: 2 },
            '& > svg': {
              fontSize: { xs: '1.25rem', sm: '1.5rem' }
            }
          }}
        >
          {icon}
        </Box>
        <Typography
          variant="h6"
          sx={{
            fontWeight: 600,
            mb: 1,
            fontSize: { xs: '1rem', sm: '1.125rem', md: '1.25rem' }
          }}
        >
          {title}
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            fontSize: { xs: '0.813rem', sm: '0.875rem' },
            lineHeight: 1.5,
          }}
        >
          {description}
        </Typography>
      </CardContent>
    </StyledCard>
  )
}

interface ProjectCardProps {
  name: string
  code?: string
  progress: number
  status: 'active' | 'on_hold' | 'completed' | 'archived'
  imageUrl?: string
  onClick?: () => void
}

export function ProjectCard({ name, code, progress, status, imageUrl, onClick }: ProjectCardProps) {
  const { t } = useTranslation()
  const getStatusColor = () => {
    switch (status) {
      case 'active': return 'success'
      case 'on_hold': return 'warning'
      case 'completed': return 'info'
      case 'archived': return 'grey'
      default: return 'grey'
    }
  }

  return (
    <StyledCard hoverable onClick={onClick}>
      {imageUrl && (
        <Box
          role="img"
          aria-label={`${name} project image`}
          sx={{
            height: { xs: 120, sm: 140 },
            backgroundImage: `url(${imageUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
      )}
      <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 1,
          gap: 1,
          flexWrap: { xs: 'wrap', sm: 'nowrap' }
        }}>
          <Typography
            variant="subtitle1"
            sx={{
              fontWeight: 600,
              fontSize: { xs: '0.938rem', sm: '1rem' },
              minWidth: 0,
              flex: 1,
              wordBreak: 'break-word'
            }}
          >
            {name}
          </Typography>
          <Box
            sx={{
              px: { xs: 0.75, sm: 1 },
              py: 0.25,
              borderRadius: 1,
              bgcolor: getStatusColor() === 'grey' ? 'grey.500' : `${getStatusColor()}.main`,
              color: 'white',
              fontSize: { xs: '0.625rem', sm: '0.65rem' },
              fontWeight: 600,
              textTransform: 'uppercase',
              flexShrink: 0,
              whiteSpace: 'nowrap',
            }}
          >
            {t(`common.statuses.${status}`, { defaultValue: status.replace('_', ' ') })}
          </Box>
        </Box>
        {code && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              display: 'block',
              mb: { xs: 1, sm: 1.5 },
              fontSize: { xs: '0.75rem', sm: '0.813rem' }
            }}
          >
            {code}
          </Typography>
        )}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.75, sm: 1 } }}>
          <Box
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${name} progress`}
            sx={{
              flex: 1,
              height: { xs: 5, sm: 6 },
              borderRadius: 3,
              bgcolor: 'action.hover',
              overflow: 'hidden',
              minWidth: 0,
            }}
          >
            <Box
              sx={{
                width: `${progress}%`,
                height: '100%',
                borderRadius: 3,
                bgcolor: 'primary.main',
                transition: 'width 300ms ease-out',
              }}
            />
          </Box>
          <Typography
            variant="caption"
            sx={{
              fontWeight: 600,
              color: 'text.secondary',
              fontSize: { xs: '0.75rem', sm: '0.813rem' },
              flexShrink: 0,
            }}
          >
            {progress}%
          </Typography>
        </Box>
      </CardContent>
    </StyledCard>
  )
}

export { CardContent, CardHeader, CardActions }
