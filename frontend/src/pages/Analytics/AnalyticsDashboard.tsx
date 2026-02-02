import { useState, useEffect } from 'react'
import { Box, Typography, Grid, Skeleton } from '@mui/material'
import dayjs, { Dayjs } from 'dayjs'
import DateRangeSelector from './components/DateRangeSelector'
import AnalyticsKPICard from './components/KPICard'
import ProjectMetricsChart from './components/ProjectMetricsChart'
import DistributionChart from './components/DistributionChart'
import ExportButton from './components/ExportButton'
import AssessmentIcon from '@mui/icons-material/Assessment'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import PendingActionsIcon from '@mui/icons-material/PendingActions'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import { analyticsService, MetricsData, TrendData, DistributionData } from '../../services/analyticsService'
import { useToast } from '../../components/common/ToastProvider'

export default function AnalyticsDashboard() {
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

  useEffect(() => {
    loadAnalyticsData()
  }, [startDate, endDate])

  const loadAnalyticsData = async () => {
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
    } catch (error) {
      console.error('Failed to load analytics data:', error)
      showError('Failed to load analytics data. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleDateChange = (newStartDate: Dayjs | null, newEndDate: Dayjs | null) => {
    setStartDate(newStartDate)
    setEndDate(newEndDate)
  }

  // Transform trends data for the chart
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
          label: 'Inspections Completed',
          values: trendsData.map((t) => t.inspectionsCompleted),
        },
        {
          label: 'RFIs Submitted',
          values: trendsData.map((t) => t.rfisSubmitted),
        },
      ],
      xAxisLabels: trendsData.map((t) => dayjs(t.date).format('MMM DD')),
    }
  }

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton variant="text" width={300} height={48} sx={{ mb: 1 }} />
        <Skeleton variant="text" width={400} height={24} sx={{ mb: 4 }} />
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 3, mb: 3 }}>
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} variant="rounded" height={140} sx={{ borderRadius: 3 }} />
          ))}
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr', gap: 3, mb: 3 }}>
          <Skeleton variant="rounded" height={400} sx={{ borderRadius: 3 }} />
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 3 }}>
          <Skeleton variant="rounded" height={400} sx={{ borderRadius: 3 }} />
          <Skeleton variant="rounded" height={400} sx={{ borderRadius: 3 }} />
        </Box>
      </Box>
    )
  }

  const trendsChartData = getTrendsChartData()

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              color: 'text.primary',
              mb: 0.5,
            }}
          >
            Analytics Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Comprehensive analytics and insights for your projects
          </Typography>
        </Box>
        <ExportButton />
      </Box>

      <Box id="dashboard-content">
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            Date Range
          </Typography>
          <DateRangeSelector
            startDate={startDate}
            endDate={endDate}
            onDateChange={handleDateChange}
          />
        </Box>

        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            Key Metrics
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={3}>
              <AnalyticsKPICard
                title="Total Projects"
                value={metricsData?.totalProjects ?? 0}
                trend={metricsData?.trends?.totalProjects}
                trendLabel="vs last period"
                icon={<AssessmentIcon />}
                color="primary"
                loading={loading}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <AnalyticsKPICard
                title="Active Inspections"
                value={metricsData?.activeInspections ?? 0}
                trend={metricsData?.trends?.activeInspections}
                trendLabel="vs last period"
                icon={<CheckCircleIcon />}
                color="success"
                loading={loading}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <AnalyticsKPICard
                title="Pending RFIs"
                value={metricsData?.pendingRFIs ?? 0}
                trend={metricsData?.trends?.pendingRFIs}
                trendLabel="vs last period"
                icon={<PendingActionsIcon />}
                color="warning"
                loading={loading}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <AnalyticsKPICard
                title="Approval Rate"
                value={metricsData?.approvalRate ? `${metricsData.approvalRate.toFixed(1)}%` : '0%'}
                trend={metricsData?.trends?.approvalRate}
                trendLabel="vs last period"
                icon={<TrendingUpIcon />}
                color="info"
                loading={loading}
              />
            </Grid>
          </Grid>
        </Box>

        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            Project Metrics Over Time
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <ProjectMetricsChart
                title="Inspections & RFIs"
                data={trendsChartData.data}
                xAxisLabels={trendsChartData.xAxisLabels}
                height={350}
                loading={loading}
              />
            </Grid>
          </Grid>
        </Box>

        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            Distribution Analysis
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <DistributionChart
                title="RFI Status"
                data={distributionsData?.rfiStatus ?? []}
                height={350}
                loading={loading}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <DistributionChart
                title="Equipment Status"
                data={distributionsData?.equipmentStatus ?? []}
                height={350}
                innerRadius={60}
                loading={loading}
              />
            </Grid>
          </Grid>
        </Box>

        <Box sx={{ mt: 3 }}>
          <Typography variant="body2" color="text.secondary">
            Selected Range: {startDate?.format('MMM DD, YYYY')} - {endDate?.format('MMM DD, YYYY')}
          </Typography>
        </Box>
      </Box>
    </Box>
  )
}
