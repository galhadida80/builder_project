import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { BarChart } from '@mui/x-charts/BarChart'
import { CircularProgressDisplay } from '../ui/ProgressBar'
import { EmptyState } from '../ui/EmptyState'
import DistributionChart from '../../pages/Analytics/components/DistributionChart'
import ProjectMetricsChart from '../../pages/Analytics/components/ProjectMetricsChart'
import type { DashboardStats } from '../../api/dashboardStats'
import { Box, Typography, Paper, Skeleton, useTheme, useMediaQuery } from '@/mui'

interface DashboardChartsProps {
  dashboardStats: DashboardStats | null
  statsLoading: boolean
  dateLocale: string
}

export default function DashboardCharts({ dashboardStats, statsLoading, dateLocale }: DashboardChartsProps) {
  const { t } = useTranslation()
  const theme = useTheme()
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'))
  const isLargeDesktop = useMediaQuery(theme.breakpoints.up('lg'))
  const barChartHeight = isLargeDesktop ? 320 : isDesktop ? 280 : 200

  const activityChartData = useMemo(() => {
    if (!dashboardStats?.weeklyActivity?.length) return { data: [], labels: [] }
    const labels = dashboardStats.weeklyActivity.map(p => {
      const d = new Date(p.date)
      return d.toLocaleDateString(dateLocale, { month: 'short', day: 'numeric' })
    })
    const data = [
      { label: t('nav.equipment'), values: dashboardStats.weeklyActivity.map(p => p.equipment) },
      { label: t('nav.materials'), values: dashboardStats.weeklyActivity.map(p => p.materials) },
      { label: t('nav.inspections'), values: dashboardStats.weeklyActivity.map(p => p.inspections) },
      { label: t('nav.rfis'), values: dashboardStats.weeklyActivity.map(p => p.rfis) },
    ]
    return { data, labels }
  }, [dashboardStats, dateLocale, t])

  const toDistChartData = (items: { label: string; value: number }[]) =>
    items.map((item, i) => ({ id: i, label: t(`statuses.${item.label}`, { defaultValue: item.label.replace(/_/g, ' ') }), value: item.value }))

  return (
    <>
      {/* Activity Trend + Overall Progress */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '3fr 2fr' }, gap: { xs: 2, md: 2 }, mb: { xs: 2.5, md: 3 } }}>
        <ProjectMetricsChart
          title={t('dashboard.charts.activityTrend')}
          data={activityChartData.data}
          xAxisLabels={activityChartData.labels}
          loading={statsLoading}
          height={barChartHeight}
        />
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, md: 3 },
            borderRadius: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
          }}
        >
          <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
            {t('dashboard.charts.overallProgress')}
          </Typography>
          {statsLoading ? (
            <Skeleton variant="circular" width={120} height={120} />
          ) : (
            <>
              <CircularProgressDisplay value={dashboardStats?.overallProgress ?? 0} size={isDesktop ? 140 : 100} thickness={8} color="primary" />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1.5 }}>
                {dashboardStats?.areaProgressByFloor.length ?? 0} {t('dashboard.charts.floorsTracked')}
              </Typography>
            </>
          )}
        </Paper>
      </Box>

      {/* Distribution Charts */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: { xs: 1.5, md: 2 }, mb: { xs: 2.5, md: 3 } }}>
        <DistributionChart title={t('dashboard.charts.equipmentStatus')} data={toDistChartData(dashboardStats?.equipmentDistribution ?? [])} loading={statsLoading} height={isDesktop ? 280 : 200} innerRadius={50} outerRadius={75} />
        <DistributionChart title={t('dashboard.charts.materialStatus')} data={toDistChartData(dashboardStats?.materialDistribution ?? [])} loading={statsLoading} height={isDesktop ? 280 : 200} innerRadius={50} outerRadius={75} />
        <DistributionChart title={t('dashboard.charts.rfiStatus')} data={toDistChartData(dashboardStats?.rfiDistribution ?? [])} loading={statsLoading} height={isDesktop ? 280 : 200} innerRadius={50} outerRadius={75} />
      </Box>

      {/* Area Progress + Findings Severity */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: { xs: 1.5, md: 2 }, mb: { xs: 2.5, md: 3 } }}>
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, md: 3 },
            borderRadius: 4,
            overflow: 'hidden',
            boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
          }}
        >
          <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
            {t('dashboard.charts.areaProgress')}
          </Typography>
          {statsLoading ? (
            <Skeleton variant="rectangular" height={barChartHeight} sx={{ borderRadius: 2 }} />
          ) : (dashboardStats?.areaProgressByFloor.length ?? 0) > 0 ? (
            <BarChart
              xAxis={[{ scaleType: 'band' as const, data: dashboardStats!.areaProgressByFloor.map(f => `${t('dashboard.charts.floor')} ${f.floor}`) }]}
              yAxis={[{ valueFormatter: (v: number | null) => v == null ? '' : `${Math.round(v)}%` }]}
              series={[{ data: dashboardStats!.areaProgressByFloor.map(f => Math.round(f.avgProgress)), label: t('dashboard.charts.avgProgress'), color: '#e07842', valueFormatter: (v: number | null) => v == null ? '' : `${Math.round(v)}%` }]}
              height={barChartHeight}
              margin={{ top: 20, right: 10, bottom: 30, left: 40 }}
            />
          ) : (
            <EmptyState variant="empty" title={t('dashboard.charts.noData')} />
          )}
        </Paper>
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, md: 3 },
            borderRadius: 4,
            overflow: 'hidden',
            boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
          }}
        >
          <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
            {t('dashboard.charts.findingsSeverity')}
          </Typography>
          {statsLoading ? (
            <Skeleton variant="rectangular" height={barChartHeight} sx={{ borderRadius: 2 }} />
          ) : (dashboardStats?.findingsSeverity.length ?? 0) > 0 ? (
            <BarChart
              xAxis={[{ scaleType: 'band' as const, data: dashboardStats!.findingsSeverity.map(f => f.label) }]}
              series={[{ data: dashboardStats!.findingsSeverity.map(f => f.value), label: t('dashboard.charts.findings'), color: '#d32f2f' }]}
              height={barChartHeight}
              margin={{ top: 20, right: 10, bottom: 30, left: 40 }}
            />
          ) : (
            <EmptyState variant="empty" title={t('dashboard.charts.noData')} />
          )}
        </Paper>
      </Box>
    </>
  )
}
