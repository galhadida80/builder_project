import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Box, Typography, Skeleton, Paper, styled, Chip, Tooltip } from '@/mui'
import { WarningAmberIcon, ErrorIcon, CheckCircleIcon, InfoIcon } from '@/icons'
import type { RiskScore, RiskLevel } from '../types/riskScore'

interface RiskHeatmapProps {
  riskScores: RiskScore[]
  loading?: boolean
  height?: number
  onAreaClick?: (areaId: string) => void
}

interface RiskLevelConfig {
  color: string
  bgColor: string
  icon: React.ReactNode
  label: string
}

const HeatmapContainer = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  borderRadius: 12,
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
}))

const AreaGrid = styled(Box)(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
  gap: theme.spacing(1.5),
  flex: 1,
  [theme.breakpoints.down('sm')]: {
    gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
    gap: theme.spacing(1),
  },
}))

interface AreaCellProps {
  riskLevel: RiskLevel
}

const AreaCell = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'riskLevel',
})<AreaCellProps>(({ theme, riskLevel }) => {
  const getRiskColors = (level: RiskLevel) => {
    switch (level) {
      case 'critical':
        return {
          bg: theme.palette.mode === 'dark' ? 'rgba(211, 47, 47, 0.15)' : 'rgba(211, 47, 47, 0.1)',
          border: theme.palette.error.main,
          text: theme.palette.error.main,
        }
      case 'high':
        return {
          bg: theme.palette.mode === 'dark' ? 'rgba(237, 108, 2, 0.15)' : 'rgba(237, 108, 2, 0.1)',
          border: theme.palette.warning.main,
          text: theme.palette.warning.main,
        }
      case 'medium':
        return {
          bg: theme.palette.mode === 'dark' ? 'rgba(224, 120, 66, 0.15)' : 'rgba(224, 120, 66, 0.1)',
          border: theme.palette.primary.main,
          text: theme.palette.primary.main,
        }
      case 'low':
      default:
        return {
          bg: theme.palette.mode === 'dark' ? 'rgba(46, 125, 50, 0.15)' : 'rgba(46, 125, 50, 0.1)',
          border: theme.palette.success.main,
          text: theme.palette.success.main,
        }
    }
  }

  const colors = getRiskColors(riskLevel)

  return {
    backgroundColor: colors.bg,
    border: `2px solid ${colors.border}`,
    borderRadius: 8,
    padding: theme.spacing(1.5),
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: `0 4px 12px ${colors.border}40`,
    },
    '& .area-name': {
      color: theme.palette.text.primary,
      fontWeight: 600,
      fontSize: '0.875rem',
      textAlign: 'center',
      marginBottom: theme.spacing(0.5),
    },
    '& .risk-score': {
      color: colors.text,
      fontWeight: 700,
      fontSize: '1.25rem',
    },
    '& .defect-count': {
      color: theme.palette.text.secondary,
      fontSize: '0.75rem',
      marginTop: theme.spacing(0.5),
    },
  }
})

export default function RiskHeatmap({
  riskScores,
  loading = false,
  height = 400,
  onAreaClick,
}: RiskHeatmapProps) {
  const { t } = useTranslation()
  const [selectedFloor, setSelectedFloor] = useState<number | 'all'>('all')

  const getRiskLevelConfig = (level: RiskLevel): RiskLevelConfig => {
    switch (level) {
      case 'critical':
        return {
          color: 'error.main',
          bgColor: 'error.light',
          icon: <ErrorIcon fontSize="small" />,
          label: t('riskPrediction.riskLevel.critical'),
        }
      case 'high':
        return {
          color: 'warning.main',
          bgColor: 'warning.light',
          icon: <WarningAmberIcon fontSize="small" />,
          label: t('riskPrediction.riskLevel.high'),
        }
      case 'medium':
        return {
          color: 'primary.main',
          bgColor: 'primary.light',
          icon: <InfoIcon fontSize="small" />,
          label: t('riskPrediction.riskLevel.medium'),
        }
      case 'low':
      default:
        return {
          color: 'success.main',
          bgColor: 'success.light',
          icon: <CheckCircleIcon fontSize="small" />,
          label: t('riskPrediction.riskLevel.low'),
        }
    }
  }

  const getUniqueFloors = () => {
    const floors = riskScores
      .map((rs) => rs.area?.floorNumber)
      .filter((f): f is number => f !== undefined && f !== null)
    return Array.from(new Set(floors)).sort((a, b) => a - b)
  }

  const filteredRiskScores = selectedFloor === 'all'
    ? riskScores
    : riskScores.filter((rs) => rs.area?.floorNumber === selectedFloor)

  if (loading) {
    return (
      <HeatmapContainer>
        <Skeleton width={200} height={28} sx={{ mb: 2 }} />
        <Skeleton variant="rectangular" width="100%" height={height - 60} sx={{ borderRadius: 2 }} />
      </HeatmapContainer>
    )
  }

  if (riskScores.length === 0) {
    return (
      <HeatmapContainer>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
          {t('riskPrediction.heatmap.title')}
        </Typography>
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'text.secondary',
          }}
        >
          <Typography variant="body2">{t('riskPrediction.heatmap.noData')}</Typography>
        </Box>
      </HeatmapContainer>
    )
  }

  const uniqueFloors = getUniqueFloors()

  return (
    <HeatmapContainer>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          {t('riskPrediction.heatmap.title')}
        </Typography>
        {uniqueFloors.length > 0 && (
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <Chip
              label={t('riskPrediction.heatmap.allFloors')}
              size="small"
              onClick={() => setSelectedFloor('all')}
              sx={{
                fontWeight: 600,
                bgcolor: selectedFloor === 'all' ? 'primary.main' : 'action.hover',
                color: selectedFloor === 'all' ? 'white' : 'text.primary',
              }}
            />
            {uniqueFloors.map((floor) => (
              <Chip
                key={floor}
                label={`${t('riskPrediction.heatmap.floor')} ${floor}`}
                size="small"
                onClick={() => setSelectedFloor(floor)}
                sx={{
                  fontWeight: 600,
                  bgcolor: selectedFloor === floor ? 'primary.main' : 'action.hover',
                  color: selectedFloor === floor ? 'white' : 'text.primary',
                }}
              />
            ))}
          </Box>
        )}
      </Box>

      <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
        {(['low', 'medium', 'high', 'critical'] as RiskLevel[]).map((level) => {
          const config = getRiskLevelConfig(level)
          const count = filteredRiskScores.filter((rs) => rs.riskLevel === level).length
          return (
            <Box
              key={level}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                px: 1,
                py: 0.5,
                borderRadius: 1,
                bgcolor: 'action.hover',
              }}
            >
              <Box sx={{ color: config.color, display: 'flex' }}>{config.icon}</Box>
              <Typography variant="caption" fontWeight={600}>
                {config.label}: {count}
              </Typography>
            </Box>
          )
        })}
      </Box>

      <AreaGrid sx={{ maxHeight: height, overflowY: 'auto' }}>
        {filteredRiskScores.map((riskScore) => (
          <Tooltip
            key={riskScore.id}
            title={
              <Box>
                <Typography variant="caption" fontWeight={600}>
                  {riskScore.area?.name || t('riskPrediction.heatmap.unknownArea')}
                </Typography>
                <Typography variant="caption" display="block">
                  {t('riskPrediction.heatmap.riskScore')}: {riskScore.riskScore.toFixed(1)}
                </Typography>
                <Typography variant="caption" display="block">
                  {t('riskPrediction.heatmap.defects')}: {riskScore.defectCount}
                </Typography>
                {riskScore.predictedDefectTypes.length > 0 && (
                  <Typography variant="caption" display="block">
                    {t('riskPrediction.heatmap.predictedDefects')}: {riskScore.predictedDefectTypes.join(', ')}
                  </Typography>
                )}
              </Box>
            }
            arrow
          >
            <AreaCell
              riskLevel={riskScore.riskLevel}
              onClick={() => onAreaClick?.(riskScore.areaId!)}
            >
              <Typography className="area-name">
                {riskScore.area?.areaCode || riskScore.area?.name || t('riskPrediction.heatmap.area')}
              </Typography>
              <Typography className="risk-score">{riskScore.riskScore.toFixed(1)}</Typography>
              <Typography className="defect-count">
                {riskScore.defectCount} {t('riskPrediction.heatmap.defectsShort')}
              </Typography>
            </AreaCell>
          </Tooltip>
        ))}
      </AreaGrid>
    </HeatmapContainer>
  )
}
