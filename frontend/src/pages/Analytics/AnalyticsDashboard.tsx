import { useState, useEffect, useCallback } from 'react'
import dayjs, { Dayjs } from 'dayjs'
import { useTranslation } from 'react-i18next'
import DateRangeSelector from './components/DateRangeSelector'
import AnalyticsKPICard from './components/KPICard'
import ProjectMetricsChart from './components/ProjectMetricsChart'
import DistributionChart from './components/DistributionChart'
import ExportButton from './components/ExportButton'
import { analyticsService, MetricsData, TrendData, DistributionData } from '../../services/analyticsService'
import { useToast } from '../../components/common/ToastProvider'
import { AssessmentIcon, CheckCircleIcon, PendingActionsIcon, TrendingUpIcon } from '@/icons'
import { Box, Typography, Grid, Skeleton } from '@/mui'

export default function AnalyticsDashboard() {
  const { t } = useTranslation()
  const { showError } = useToast()
  const [startDate, setStartDate] = useState<Dayjs | null>(dayjs().subtract(30, 'day'))
  const [endDate, setEndDate] = useState<Dayjs | null>(dayjs())
  const [loading, setLoading] = useState(true)
  const [metricsData, setMetricsData] = useState<MetricsData | null>(null)
  const [trendsData, setTrendsData] = useState<TrendData[]>([])
  const [distributionsData, setDistributionsData] = useState<{
    rfiStatus: DistributionData[]
    inspectionTypes: DistributionData[]
    equipmentStatus: DistributionData[]
  } | null>(null)

  const loadAnalyticsData = useCallback(async () => {
    try {
      setLoading(true)
      const params = {
        startDate: startDate?.format('YYYY-MM-DD'),
        endDate: endDate?.format('YYYY-MM-DD'),
      }

      const [metrics, trends, distributions] = await Promise.all([
        analyticsService.getMetrics(params),
        analyticsService.getTrends(params),
        analyticsService.getDistributions(params),
      ])

      setMetricsData(metrics)
      setTrendsData(trends)
      setDistributionsData(distributions)
    } catch {
      showError(t('analytics.failedToLoad'))
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate, showError, t])

  useEffect(() => {
    loadAnalyticsData()
  }, [loadAnalyticsData])

  const handleDateChange = (newStartDate: Dayjs | null, newEndDate: Dayjs | null) => {
    setStartDate(newStartDate)
    setEndDate(newEndDate)
  }

  const getTrendsChartData = () => {
    if (!trendsData || trendsData.length === 0) {
      return {
        data: [],
        xAxisLabels: [],
      }
    }

    return {
      data: [
        {
          label: t('analytics.inspectionsCompleted'),
          values: trendsData.map((td) => td.inspectionsCompleted),
        },
        {
          label: t('analytics.rfisSubmitted'),
          values: trendsData.map((td) => td.rfisSubmitted),
        },
      ],
      xAxisLabels: trendsData.map((td) => dayjs(td.date).format('MMM DD')),
    }
  }

  if (loading) {
    return (
      <Box sx={{ maxWidth: 600, mx: 'auto', p: { xs: 2, sm: 3 } }}>
        <Skeleton variant="rounded" height={48} sx={{ borderRadius: 2, mb: 3 }} />
        <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} variant="rounded" height={36} width={70} sx={{ borderRadius: 4 }} />
          ))}
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.5, mb: 3 }}>
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} variant="rounded" height={100} sx={{ borderRadius: 3 }} />
          ))}
        </Box>
        <Skeleton variant="rounded" height={250} sx={{ borderRadius: 3, mb: 2 }} />
        <Skeleton variant="rounded" height={250} sx={{ borderRadius: 3 }} />
      </Box>
    )
  }

  const trendsChartData = getTrendsChartData()

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', pb: 10 }}>
      <Box sx={{
        position: 'sticky', top: 0, zIndex: 20,
        bgcolor: 'background.default', px: { xs: 2, sm: 3 }, py: 2,
        borderBottom: 1, borderColor: 'divider',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <AssessmentIcon sx={{ color: 'primary.main', fontSize: 24 }} />
          <Typography variant="h6" fontWeight={700} letterSpacing='-0.02em'>
            {t('analytics.title')}
          </Typography>
        </Box>
        <ExportButton />
      </Box>

      <Box id="dashboard-content">
        <Box sx={{ px: { xs: 2, sm: 3 }, pt: 2 }}>
          <DateRangeSelector
            startDate={startDate}
            endDate={endDate}
            onDateChange={handleDateChange}
          />
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.5, px: { xs: 2, sm: 3 }, py: 3 }}>
          <Box sx={{
            bgcolor: 'background.paper', border: 1, borderColor: 'divider', p: 2, borderRadius: 3,
            display: 'flex', flexDirection: 'column', gap: 1.5,
          }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <AssessmentIcon sx={{ color: 'primary.main', fontSize: 20 }} />
              {metricsData?.trends?.totalProjects !== undefined && (
                <Typography variant="caption" fontWeight={700} color="success.main">
                  +{metricsData.trends.totalProjects}
                </Typography>
              )}
            </Box>
            <Box>
              <Typography variant="h4" fontWeight={700} lineHeight={1}>
                {metricsData?.totalProjects ?? 0}
              </Typography>
              <Typography variant="caption" color="text.secondary" fontSize="0.65rem" sx={{ mt: 0.5 }}>
                {t('analytics.totalProjects')}
              </Typography>
            </Box>
          </Box>

          <Box sx={{
            bgcolor: 'background.paper', border: 1, borderColor: 'divider', p: 2, borderRadius: 3,
            display: 'flex', flexDirection: 'column', gap: 1.5,
          }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <CheckCircleIcon sx={{ color: 'primary.main', fontSize: 20 }} />
              {metricsData?.trends?.activeInspections !== undefined && (
                <Typography variant="caption" fontWeight={700} color="success.main">
                  {metricsData.trends.activeInspections}%
                </Typography>
              )}
            </Box>
            <Box>
              <Typography variant="h4" fontWeight={700} lineHeight={1}>
                {metricsData?.activeInspections ?? 0}
              </Typography>
              <Typography variant="caption" color="text.secondary" fontSize="0.65rem" sx={{ mt: 0.5 }}>
                {t('analytics.activeInspections')}
              </Typography>
            </Box>
          </Box>

          <Box sx={{
            bgcolor: 'background.paper', border: 1, borderColor: 'divider', p: 2, borderRadius: 3,
            display: 'flex', flexDirection: 'column', gap: 1.5,
          }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <PendingActionsIcon sx={{ color: 'primary.main', fontSize: 20 }} />
              {metricsData?.trends?.pendingRFIs !== undefined && (
                <Typography variant="caption" fontWeight={700} color="primary.main">
                  {metricsData.trends.pendingRFIs}%
                </Typography>
              )}
            </Box>
            <Box>
              <Typography variant="h4" fontWeight={700} lineHeight={1}>
                {metricsData?.pendingRFIs ?? 0}
              </Typography>
              <Typography variant="caption" color="text.secondary" fontSize="0.65rem" sx={{ mt: 0.5 }}>
                {t('analytics.pendingRFIs')}
              </Typography>
            </Box>
          </Box>

          <Box sx={{
            bgcolor: 'background.paper', border: 1, borderColor: 'divider', p: 2, borderRadius: 3,
            display: 'flex', flexDirection: 'column', gap: 1.5,
          }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <TrendingUpIcon sx={{ color: 'primary.main', fontSize: 20 }} />
              {metricsData?.trends?.approvalRate !== undefined && (
                <Typography variant="caption" fontWeight={700} color="success.main">
                  {t('analytics.ok', 'OK')}
                </Typography>
              )}
            </Box>
            <Box>
              <Typography variant="h4" fontWeight={700} lineHeight={1}>
                {metricsData?.approvalRate ? `${metricsData.approvalRate.toFixed(0)}%` : '0%'}
              </Typography>
              <Typography variant="caption" color="text.secondary" fontSize="0.65rem" sx={{ mt: 0.5 }}>
                {t('analytics.approvalRate')}
              </Typography>
            </Box>
          </Box>
        </Box>

        <Box sx={{ px: { xs: 2, sm: 3 }, mb: 3 }}>
          <ProjectMetricsChart
            title={t('analytics.inspectionsAndRfis')}
            data={trendsChartData.data}
            xAxisLabels={trendsChartData.xAxisLabels}
            height={250}
            loading={loading}
          />
        </Box>

        <Box sx={{ px: { xs: 2, sm: 3 }, mb: 3 }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <DistributionChart
                title={t('analytics.rfiStatus')}
                data={distributionsData?.rfiStatus ?? []}
                height={280}
                loading={loading}
              />
            </Grid>
            <Grid item xs={12}>
              <DistributionChart
                title={t('analytics.equipmentStatus')}
                data={distributionsData?.equipmentStatus ?? []}
                height={280}
                innerRadius={60}
                loading={loading}
              />
            </Grid>
          </Grid>
        </Box>

        <Box sx={{ px: { xs: 2, sm: 3 }, pb: 2 }}>
          <Typography variant="caption" color="text.secondary">
            {t('analytics.selectedRange')}: {startDate?.format('MMM DD, YYYY')} - {endDate?.format('MMM DD, YYYY')}
          </Typography>
        </Box>
      </Box>
    </Box>
  )
}
