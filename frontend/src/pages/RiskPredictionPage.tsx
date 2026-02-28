import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useProject } from '../contexts/ProjectContext'
import { Box, Typography, Skeleton, Grid } from '@/mui'
import { WarningAmberIcon, ErrorIcon, CheckCircleIcon, TrendingUpIcon } from '@/icons'
import AnalyticsKPICard from './Analytics/components/KPICard'
import RiskHeatmap from '../components/RiskHeatmap'
import RiskTrendAnalysis from '../components/RiskTrendAnalysis'
import { riskScoresApi } from '../api/riskScores'
import { useToast } from '../components/common/ToastProvider'
import type { RiskScore, RiskScoreSummary } from '../types/riskScore'

export default function RiskPredictionPage() {
  const { t } = useTranslation()
  const { selectedProjectId } = useProject()
  const { showError } = useToast()
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<RiskScoreSummary | null>(null)
  const [riskScores, setRiskScores] = useState<RiskScore[]>([])

  const loadData = useCallback(async () => {
    if (!selectedProjectId) return

    try {
      setLoading(true)
      const [summaryData, scoresData] = await Promise.all([
        riskScoresApi.getSummary(selectedProjectId),
        riskScoresApi.list(selectedProjectId),
      ])

      setSummary(summaryData)
      setRiskScores(scoresData)
    } catch {
      showError(t('riskPrediction.failedToLoad'))
    } finally {
      setLoading(false)
    }
  }, [selectedProjectId, showError, t])

  useEffect(() => {
    loadData()
  }, [loadData])

  if (loading) {
    return (
      <Box sx={{ maxWidth: 600, mx: 'auto', p: { xs: 2, sm: 3 } }}>
        <Skeleton variant="rounded" height={48} sx={{ borderRadius: 2, mb: 3 }} />
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.5, mb: 3 }}>
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} variant="rounded" height={100} sx={{ borderRadius: 3 }} />
          ))}
        </Box>
        <Skeleton variant="rounded" height={300} sx={{ borderRadius: 3, mb: 2 }} />
        <Skeleton variant="rounded" height={400} sx={{ borderRadius: 3 }} />
      </Box>
    )
  }

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', pb: 10 }}>
      <Box
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 20,
          bgcolor: 'background.default',
          px: { xs: 2, sm: 3 },
          py: 2,
          borderBottom: 1,
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <WarningAmberIcon sx={{ color: 'warning.main', fontSize: 24 }} />
          <Typography variant="h6" fontWeight={700} letterSpacing="-0.02em">
            {t('riskPrediction.title')}
          </Typography>
        </Box>
      </Box>

      <Box sx={{ px: { xs: 2, sm: 3 }, pt: 2 }}>
        <Typography variant="body2" color="text.secondary" fontWeight={500}>
          {t('riskPrediction.subtitle')}
        </Typography>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.5, px: { xs: 2, sm: 3 }, py: 3 }}>
        <AnalyticsKPICard
          title={t('riskPrediction.totalAreas')}
          value={summary?.totalAreas ?? 0}
          icon={<CheckCircleIcon fontSize="small" />}
          color="primary"
        />
        <AnalyticsKPICard
          title={t('riskPrediction.highRiskAreas')}
          value={summary?.highRiskCount ?? 0}
          icon={<ErrorIcon fontSize="small" />}
          color="error"
        />
        <AnalyticsKPICard
          title={t('riskPrediction.criticalAreas')}
          value={summary?.criticalRiskCount ?? 0}
          icon={<WarningAmberIcon fontSize="small" />}
          color="warning"
        />
        <AnalyticsKPICard
          title={t('riskPrediction.avgRiskScore')}
          value={summary?.averageRiskScore ? summary.averageRiskScore.toFixed(1) : '0.0'}
          icon={<TrendingUpIcon fontSize="small" />}
          color="info"
        />
      </Box>

      <Typography variant="body2" fontWeight={700} sx={{ px: { xs: 2, sm: 3 }, mb: 1.5 }}>
        {t('riskPrediction.heatmapTitle')}
      </Typography>

      <Box sx={{ px: { xs: 2, sm: 3 }, mb: 3 }}>
        <RiskHeatmap riskScores={riskScores} loading={loading} height={300} />
      </Box>

      <Typography variant="body2" fontWeight={700} sx={{ px: { xs: 2, sm: 3 }, mb: 1.5 }}>
        {t('riskPrediction.trendsTitle')}
      </Typography>

      <Box sx={{ px: { xs: 2, sm: 3 }, mb: 3 }}>
        {selectedProjectId && <RiskTrendAnalysis projectId={selectedProjectId} />}
      </Box>
    </Box>
  )
}
