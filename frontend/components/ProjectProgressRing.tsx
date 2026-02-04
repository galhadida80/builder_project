import { Box, Typography } from '@mui/material'
import { CircularProgressDisplay } from '../src/components/ui/ProgressBar'

interface ProjectProgressRingProps {
  value: number
  label?: string
  size?: number
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info'
  showPercentage?: boolean
  subtitle?: string
}

export function ProjectProgressRing({
  value,
  label,
  size = 120,
  color = 'primary',
  showPercentage = true,
  subtitle,
}: ProjectProgressRingProps) {
  const normalizedValue = Math.min(100, Math.max(0, value))

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
      }}
    >
      {label && (
        <Typography
          variant="h6"
          fontWeight={600}
          color="text.primary"
          textAlign="center"
        >
          {label}
        </Typography>
      )}
      <CircularProgressDisplay
        value={normalizedValue}
        size={size}
        thickness={6}
        color={color}
        showLabel={showPercentage}
      />
      {subtitle && (
        <Typography
          variant="body2"
          color="text.secondary"
          textAlign="center"
          sx={{ mt: -1 }}
        >
          {subtitle}
        </Typography>
      )}
    </Box>
  )
}
