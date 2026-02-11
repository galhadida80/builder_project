import { Box, Typography, LinearProgress, styled } from '@/mui'

interface ProgressBarProps {
  value: number
  label?: string
  showValue?: boolean
  size?: 'small' | 'medium' | 'large'
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info'
  variant?: 'determinate' | 'indeterminate'
}

const StyledLinearProgress = styled(LinearProgress, {
  shouldForwardProp: (prop) => prop !== 'barSize',
})<{ barSize: 'small' | 'medium' | 'large' }>(({ theme, barSize }) => ({
  borderRadius: 4,
  height: barSize === 'small' ? 4 : barSize === 'medium' ? 8 : 12,
  backgroundColor: theme.palette.mode === 'dark' ? theme.palette.grey[800] : theme.palette.grey[200],
  '& .MuiLinearProgress-bar': {
    borderRadius: 4,
    // RTL-safe: MUI LinearProgress automatically fills from correct direction based on theme.direction
  },
}))

export function ProgressBar({
  value,
  label,
  showValue = true,
  size = 'medium',
  color = 'primary',
  variant = 'determinate',
}: ProgressBarProps) {
  const normalizedValue = Math.min(100, Math.max(0, value))

  return (
    <Box sx={{ width: '100%' }}>
      {(label || showValue) && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
          {label && (
            <Typography variant="body2" color="text.secondary" fontWeight={500}>
              {label}
            </Typography>
          )}
          {showValue && variant === 'determinate' && (
            <Typography variant="body2" color="text.secondary" fontWeight={600}>
              {normalizedValue}%
            </Typography>
          )}
        </Box>
      )}
      <StyledLinearProgress
        variant={variant}
        value={normalizedValue}
        color={color}
        barSize={size}
      />
    </Box>
  )
}

interface CircularProgressDisplayProps {
  value: number
  size?: number
  thickness?: number
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info'
  showLabel?: boolean
}

export function CircularProgressDisplay({
  value,
  size = 80,
  thickness = 4,
  color = 'primary',
  showLabel = true,
}: CircularProgressDisplayProps) {
  const normalizedValue = Math.min(100, Math.max(0, value))

  return (
    <Box sx={{ position: 'relative', display: 'inline-flex' }}>
      <Box
        sx={{
          position: 'relative',
          width: size,
          height: size,
        }}
      >
        <svg
          viewBox="0 0 100 100"
          style={{ transform: 'rotate(-90deg)' }}
          role="progressbar"
          aria-valuenow={normalizedValue}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${normalizedValue}% progress`}
        >
          <circle
            cx="50"
            cy="50"
            r={50 - thickness}
            fill="none"
            stroke="currentColor"
            strokeWidth={thickness}
            style={{ opacity: 0.2 }}
          />
          <circle
            cx="50"
            cy="50"
            r={50 - thickness}
            fill="none"
            strokeWidth={thickness}
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * (50 - thickness)}`}
            strokeDashoffset={`${2 * Math.PI * (50 - thickness) * (1 - normalizedValue / 100)}`}
            style={{
              transition: 'stroke-dashoffset 500ms ease-out',
              stroke: 'currentColor',
            }}
          />
        </svg>
      </Box>
      {showLabel && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            insetInlineStart: 0,
            bottom: 0,
            insetInlineEnd: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Typography variant="h6" fontWeight={700} color={`${color}.main`}>
            {normalizedValue}%
          </Typography>
        </Box>
      )}
    </Box>
  )
}
