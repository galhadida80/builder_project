import { Card as MuiCard, CardContent, CardHeader, CardActions, Box, Typography, Skeleton, SxProps, Theme } from '@mui/material'
import { styled, alpha } from '@mui/material/styles'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import TrendingDownIcon from '@mui/icons-material/TrendingDown'
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat'
import { useState } from 'react'
import { useSwipeGesture, SwipeEvent } from '../../hooks/useSwipeGesture'

interface BaseCardProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
  hoverable?: boolean
  sx?: SxProps<Theme>
  onSwipeLeft?: (event: SwipeEvent) => void
  onSwipeRight?: (event: SwipeEvent) => void
}

const StyledCard = styled(MuiCard, {
  shouldForwardProp: (prop) => prop !== 'hoverable' && prop !== 'isSwipingLeft' && prop !== 'isSwipingRight',
})<{ hoverable?: boolean; isSwipingLeft?: boolean; isSwipingRight?: boolean }>(
  ({ theme, hoverable, isSwipingLeft, isSwipingRight }) => ({
    borderRadius: 12,
    transition: isSwipingLeft || isSwipingRight ? 'transform 100ms ease-out' : 'all 200ms ease-out',
    cursor: hoverable ? 'pointer' : 'default',
    ...(isSwipingLeft && {
      transform: 'translateX(-8px)',
      opacity: 0.95,
    }),
    ...(isSwipingRight && {
      transform: 'translateX(8px)',
      opacity: 0.95,
    }),
    ...(hoverable && !isSwipingLeft && !isSwipingRight && {
      '&:hover': {
        transform: 'translateY(-2px)',
        boxShadow: theme.shadows[4],
      },
    }),
  })
)

export function Card({ children, hoverable = false, onClick, onSwipeLeft, onSwipeRight, ...props }: BaseCardProps) {
  const [isSwipingLeft, setIsSwipingLeft] = useState(false)
  const [isSwipingRight, setIsSwipingRight] = useState(false)

  const { onTouchStart, onTouchMove, onTouchEnd } = useSwipeGesture({
    onSwipeLeft: (event) => {
      setIsSwipingLeft(true)
      setTimeout(() => setIsSwipingLeft(false), 200)
      onSwipeLeft?.(event)
    },
    onSwipeRight: (event) => {
      setIsSwipingRight(true)
      setTimeout(() => setIsSwipingRight(false), 200)
      onSwipeRight?.(event)
    },
  })

  return (
    <StyledCard
      hoverable={hoverable}
      onClick={onClick}
      isSwipingLeft={isSwipingLeft}
      isSwipingRight={isSwipingRight}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      {...props}
    >
      {children}
    </StyledCard>
  )
}

const GlassCard = styled(MuiCard)(({ theme }) => ({
  background: alpha(theme.palette.background.paper, 0.85),
  backdropFilter: 'blur(12px)',
  border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
  borderRadius: 16,
  transition: 'all 200ms ease-out',
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
  onSwipeLeft?: (event: SwipeEvent) => void
  onSwipeRight?: (event: SwipeEvent) => void
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
  onSwipeLeft,
  onSwipeRight,
}: KPICardProps) {
  const [isSwipingLeft, setIsSwipingLeft] = useState(false)
  const [isSwipingRight, setIsSwipingRight] = useState(false)

  const { onTouchStart, onTouchMove, onTouchEnd } = useSwipeGesture({
    onSwipeLeft: (event) => {
      setIsSwipingLeft(true)
      setTimeout(() => setIsSwipingLeft(false), 200)
      onSwipeLeft?.(event)
    },
    onSwipeRight: (event) => {
      setIsSwipingRight(true)
      setTimeout(() => setIsSwipingRight(false), 200)
      onSwipeRight?.(event)
    },
  })

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
    <StyledCard
      hoverable={!!onClick}
      onClick={onClick}
      isSwipingLeft={isSwipingLeft}
      isSwipingRight={isSwipingRight}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      sx={{ cursor: onClick ? 'pointer' : 'default' }}
    >
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

interface FeatureCardProps {
  icon: React.ReactNode
  title: string
  description: string
  onClick?: () => void
  onSwipeLeft?: (event: SwipeEvent) => void
  onSwipeRight?: (event: SwipeEvent) => void
}

export function FeatureCard({ icon, title, description, onClick, onSwipeLeft, onSwipeRight }: FeatureCardProps) {
  const [isSwipingLeft, setIsSwipingLeft] = useState(false)
  const [isSwipingRight, setIsSwipingRight] = useState(false)

  const { onTouchStart, onTouchMove, onTouchEnd } = useSwipeGesture({
    onSwipeLeft: (event) => {
      setIsSwipingLeft(true)
      setTimeout(() => setIsSwipingLeft(false), 200)
      onSwipeLeft?.(event)
    },
    onSwipeRight: (event) => {
      setIsSwipingRight(true)
      setTimeout(() => setIsSwipingRight(false), 200)
      onSwipeRight?.(event)
    },
  })

  return (
    <StyledCard
      hoverable
      onClick={onClick}
      isSwipingLeft={isSwipingLeft}
      isSwipingRight={isSwipingRight}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <CardContent sx={{ p: 3 }}>
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: 2,
            bgcolor: 'primary.main',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mb: 2,
          }}
        >
          {icon}
        </Box>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
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
  onSwipeLeft?: (event: SwipeEvent) => void
  onSwipeRight?: (event: SwipeEvent) => void
}

export function ProjectCard({ name, code, progress, status, imageUrl, onClick, onSwipeLeft, onSwipeRight }: ProjectCardProps) {
  const [isSwipingLeft, setIsSwipingLeft] = useState(false)
  const [isSwipingRight, setIsSwipingRight] = useState(false)

  const { onTouchStart, onTouchMove, onTouchEnd } = useSwipeGesture({
    onSwipeLeft: (event) => {
      setIsSwipingLeft(true)
      setTimeout(() => setIsSwipingLeft(false), 200)
      onSwipeLeft?.(event)
    },
    onSwipeRight: (event) => {
      setIsSwipingRight(true)
      setTimeout(() => setIsSwipingRight(false), 200)
      onSwipeRight?.(event)
    },
  })

  const getStatusColor = () => {
    switch (status) {
      case 'active': return 'success'
      case 'on_hold': return 'warning'
      case 'completed': return 'info'
      case 'archived': return 'default'
      default: return 'default'
    }
  }

  return (
    <StyledCard
      hoverable
      onClick={onClick}
      isSwipingLeft={isSwipingLeft}
      isSwipingRight={isSwipingRight}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {imageUrl && (
        <Box
          sx={{
            height: 140,
            backgroundImage: `url(${imageUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
      )}
      <CardContent sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            {name}
          </Typography>
          <Box
            sx={{
              px: 1,
              py: 0.25,
              borderRadius: 1,
              bgcolor: `${getStatusColor()}.main`,
              color: 'white',
              fontSize: '0.65rem',
              fontWeight: 600,
              textTransform: 'uppercase',
            }}
          >
            {status.replace('_', ' ')}
          </Box>
        </Box>
        {code && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
            {code}
          </Typography>
        )}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box
            sx={{
              flex: 1,
              height: 6,
              borderRadius: 3,
              bgcolor: 'action.hover',
              overflow: 'hidden',
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
          <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
            {progress}%
          </Typography>
        </Box>
      </CardContent>
    </StyledCard>
  )
}

export { CardContent, CardHeader, CardActions }
