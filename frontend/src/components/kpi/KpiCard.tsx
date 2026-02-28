import { useTranslation } from 'react-i18next'
import { Box, Card, CardContent, LinearProgress, Typography, Chip, IconButton } from '@/mui'
import { EditIcon, DeleteIcon } from '@/icons'
import KpiSparkline from './KpiSparkline'
import type { KpiValue } from '../../types'

interface KpiCardProps {
  kpiValue: KpiValue
  onEdit: () => void
  onDelete: () => void
}

const STATUS_COLORS: Record<string, string> = {
  on_track: '#4caf50',
  warning: '#ff9800',
  off_track: '#f44336',
  no_target: '#9e9e9e',
}

export default function KpiCard({ kpiValue, onEdit, onDelete }: KpiCardProps) {
  const { t } = useTranslation()

  const statusColor = kpiValue.color || STATUS_COLORS[kpiValue.status] || '#9e9e9e'
  const progress = kpiValue.targetValue
    ? Math.min((kpiValue.value / kpiValue.targetValue) * 100, 100)
    : 0

  const statusKey = kpiValue.status === 'on_track' ? 'onTrack'
    : kpiValue.status === 'off_track' ? 'offTrack'
    : kpiValue.status === 'no_target' ? 'noTarget'
    : 'warning'

  return (
    <Card
      sx={{
        height: '100%',
        borderTop: 3,
        borderColor: statusColor,
        cursor: 'pointer',
        transition: 'box-shadow 0.2s',
        '&:hover': { boxShadow: 4 },
      }}
      onClick={onEdit}
    >
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Typography variant="body2" color="text.secondary" noWrap sx={{ flex: 1, fontWeight: 500 }}>
            {kpiValue.name}
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5, ml: 1, flexShrink: 0 }}>
            <IconButton
              size="small"
              onClick={(e) => { e.stopPropagation(); onEdit() }}
              aria-label={t('kpi.editKpi')}
              sx={{ p: 0.5 }}
            >
              <EditIcon fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              onClick={(e) => { e.stopPropagation(); onDelete() }}
              aria-label={t('common.delete')}
              sx={{ p: 0.5 }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5, mb: 1 }}>
          <Typography variant="h4" sx={{ fontWeight: 700, lineHeight: 1 }}>
            {Number.isInteger(kpiValue.value) ? kpiValue.value : kpiValue.value.toFixed(1)}
          </Typography>
          {kpiValue.unit && (
            <Typography variant="body2" color="text.secondary">
              {kpiValue.unit}
            </Typography>
          )}
        </Box>

        {kpiValue.targetValue != null && (
          <Box sx={{ mb: 1.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="caption" color="text.secondary">
                {t('kpi.of')} {kpiValue.targetValue} {kpiValue.unit || ''}
              </Typography>
              <Typography variant="caption" sx={{ color: statusColor, fontWeight: 600 }}>
                {Math.round(progress)}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{
                height: 6,
                borderRadius: 3,
                bgcolor: 'action.hover',
                '& .MuiLinearProgress-bar': {
                  bgcolor: statusColor,
                  borderRadius: 3,
                },
              }}
            />
          </Box>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Chip
            label={t(`kpi.statuses.${statusKey}`)}
            size="small"
            sx={{
              bgcolor: `${statusColor}18`,
              color: statusColor,
              fontWeight: 600,
              fontSize: '0.7rem',
              height: 22,
            }}
          />
          {kpiValue.trend.length >= 2 && (
            <KpiSparkline data={kpiValue.trend} color={statusColor} width={80} height={30} />
          )}
        </Box>

        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          {t(`kpi.entityTypes.${kpiValue.entityType}`)} &middot; {t(`kpi.calculations.${kpiValue.kpiType}`)}
        </Typography>
      </CardContent>
    </Card>
  )
}
