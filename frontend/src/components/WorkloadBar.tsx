import { Box, Typography, LinearProgress } from '@mui/material'
import { styled } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { getWorkloadColor } from '../utils/workloadCalculation'

interface WorkloadBarProps {
  value: number
  label?: string
  showValue?: boolean
  size?: 'small' | 'medium' | 'large'
  showHours?: boolean
  assignedHours?: number
  availableHours?: number
}

const StyledLinearProgress = styled(LinearProgress, {
  shouldForwardProp: (prop) => prop !== 'barSize',
})<{ barSize: 'small' | 'medium' | 'large' }>(({ theme, barSize }) => ({
  borderRadius: 4,
  height: barSize === 'small' ? 4 : barSize === 'medium' ? 8 : 12,
  backgroundColor: theme.palette.mode === 'dark' ? theme.palette.grey[800] : theme.palette.grey[200],
  '& .MuiLinearProgress-bar': {
    borderRadius: 4,
  },
}))

function getWorkloadLabelKey(percent: number): string {
  if (percent <= 60) return 'workloadBar.underUtilized'
  if (percent <= 90) return 'workloadBar.optimal'
  if (percent <= 100) return 'workloadBar.high'
  return 'workloadBar.overAllocated'
}

export function WorkloadBar({
  value,
  label,
  showValue = true,
  size = 'medium',
  showHours = false,
  assignedHours,
  availableHours,
}: WorkloadBarProps) {
  const { t } = useTranslation()
  const normalizedValue = Math.min(100, Math.max(0, value))
  const color = getWorkloadColor(value)
  const workloadLabel = t(getWorkloadLabelKey(value))

  return (
    <Box sx={{ width: '100%' }}>
      {(label || showValue) && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5, alignItems: 'center' }}>
          {label && (
            <Typography variant="body2" color="text.secondary" fontWeight={500}>
              {label}
            </Typography>
          )}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {showHours && assignedHours !== undefined && availableHours !== undefined && (
              <Typography variant="caption" color="text.secondary">
                {assignedHours}h / {availableHours}h
              </Typography>
            )}
            {showValue && (
              <Typography
                variant="body2"
                fontWeight={600}
                sx={{
                  color: `${color}.main`,
                }}
              >
                {Math.round(value)}%
              </Typography>
            )}
          </Box>
        </Box>
      )}
      <StyledLinearProgress
        variant="determinate"
        value={normalizedValue}
        color={color}
        barSize={size}
      />
      {value > 100 && (
        <Typography
          variant="caption"
          color="error"
          sx={{
            display: 'block',
            mt: 0.5,
            fontWeight: 500,
          }}
        >
          {workloadLabel} - {Math.round(value - 100)}% {t('workloadBar.overCapacity')}
        </Typography>
      )}
    </Box>
  )
}
