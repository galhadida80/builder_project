import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { BarChart } from '@mui/x-charts/BarChart'
import { PieChart } from '@mui/x-charts/PieChart'
import { Box, Typography, Skeleton, Paper, styled, Grid, Tabs, Tab } from '@/mui'
import { riskScoresApi } from '../api/riskScores'
import type { DefectTrendAnalysis } from '../types/riskScore'
import { useToast } from './common/ToastProvider'

interface RiskTrendAnalysisProps {
  projectId: string
  startDate?: string
  endDate?: string
}

const ChartContainer = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  borderRadius: 12,
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
}))

const severityColors = {
  low: '#2e7d32',
  medium: '#ed6c02',
  high: '#d32f2f',
  critical: '#7b1fa2',
}

export default function RiskTrendAnalysis({
  projectId,
  startDate,
  endDate,
}: RiskTrendAnalysisProps) {
  const { t } = useTranslation()
  const { showError } = useToast()
  const [loading, setLoading] = useState(true)
  const [trends, setTrends] = useState<DefectTrendAnalysis | null>(null)
  const [activeTab, setActiveTab] = useState(0)

  useEffect(() => {
    const loadTrends = async () => {
      try {
        setLoading(true)
        const data = await riskScoresApi.getTrends(projectId, startDate, endDate)
        setTrends(data)
      } catch {
        showError(t('riskPrediction.failedToLoadTrends'))
      } finally {
        setLoading(false)
      }
    }

    loadTrends()
  }, [projectId, startDate, endDate, showError, t])

  if (loading) {
    return (
      <Box sx={{ maxWidth: 600, mx: 'auto', p: { xs: 2, sm: 3 } }}>
        <Skeleton width={200} height={32} sx={{ mb: 2 }} />
        <Skeleton variant="rectangular" width="100%" height={350} sx={{ borderRadius: 2, mb: 2 }} />
        <Skeleton variant="rectangular" width="100%" height={350} sx={{ borderRadius: 2 }} />
      </Box>
    )
  }

  if (!trends || trends.totalDefects === 0) {
    return (
      <ChartContainer>
        <Typography variant="body1" color="text.secondary" align="center">
          {t('riskPrediction.noTrendData')}
        </Typography>
      </ChartContainer>
    )
  }

  const renderByTrade = () => {
    if (!trends.byTrade || trends.byTrade.length === 0) {
      return (
        <Typography variant="body2" color="text.secondary" align="center">
          {t('riskPrediction.noTradeData')}
        </Typography>
      )
    }

    const topTrades = trends.byTrade.slice(0, 10)
    const categories = topTrades.map((t) => t.category)
    const counts = topTrades.map((t) => t.count)

    return (
      <ChartContainer>
        <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary', mb: 2 }}>
          {t('riskPrediction.trendsByTrade')}
        </Typography>
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 350 }}>
          <BarChart
            series={[
              {
                data: counts,
                label: t('riskPrediction.defectCount'),
                color: '#e07842',
              },
            ]}
            xAxis={[
              {
                data: categories,
                scaleType: 'band',
              },
            ]}
            height={350}
            margin={{ top: 10, right: 20, bottom: 80, left: 50 }}
            sx={(theme) => ({
              width: '100%',
              '& .MuiChartsAxis-tickLabel': {
                fill: theme.palette.text.secondary,
                fontSize: '0.75rem',
              },
              '& .MuiChartsAxis-bottom .MuiChartsAxis-tickLabel': {
                transform: 'rotate(-45deg) translateX(-10px)',
                textAnchor: 'end',
              },
              '& .MuiChartsLegend-series text': {
                fill: theme.palette.text.primary,
              },
            })}
          />
        </Box>
      </ChartContainer>
    )
  }

  const renderByFloor = () => {
    if (!trends.byFloor || trends.byFloor.length === 0) {
      return (
        <Typography variant="body2" color="text.secondary" align="center">
          {t('riskPrediction.noFloorData')}
        </Typography>
      )
    }

    const sortedFloors = [...trends.byFloor].sort((a, b) => a.floorNumber - b.floorNumber)
    const floorLabels = sortedFloors.map((f) => `${t('riskPrediction.floor')} ${f.floorNumber}`)
    const floorCounts = sortedFloors.map((f) => f.count)

    return (
      <ChartContainer>
        <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary', mb: 2 }}>
          {t('riskPrediction.trendsByFloor')}
        </Typography>
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 350 }}>
          <BarChart
            series={[
              {
                data: floorCounts,
                label: t('riskPrediction.defectCount'),
                color: '#2e7d32',
              },
            ]}
            xAxis={[
              {
                data: floorLabels,
                scaleType: 'band',
              },
            ]}
            height={350}
            margin={{ top: 10, right: 20, bottom: 50, left: 50 }}
            sx={(theme) => ({
              width: '100%',
              '& .MuiChartsAxis-tickLabel': {
                fill: theme.palette.text.secondary,
              },
              '& .MuiChartsLegend-series text': {
                fill: theme.palette.text.primary,
              },
            })}
          />
        </Box>
      </ChartContainer>
    )
  }

  const renderByPhase = () => {
    if (!trends.byPhase || trends.byPhase.length === 0) {
      return (
        <Typography variant="body2" color="text.secondary" align="center">
          {t('riskPrediction.noPhaseData')}
        </Typography>
      )
    }

    const phaseLabels = trends.byPhase.map((p) => p.phase)
    const phaseCounts = trends.byPhase.map((p) => p.count)

    return (
      <ChartContainer>
        <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary', mb: 2 }}>
          {t('riskPrediction.trendsByPhase')}
        </Typography>
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 350 }}>
          <BarChart
            series={[
              {
                data: phaseCounts,
                label: t('riskPrediction.defectCount'),
                color: '#0288d1',
              },
            ]}
            xAxis={[
              {
                data: phaseLabels,
                scaleType: 'band',
              },
            ]}
            height={350}
            margin={{ top: 10, right: 20, bottom: 50, left: 50 }}
            sx={(theme) => ({
              width: '100%',
              '& .MuiChartsAxis-tickLabel': {
                fill: theme.palette.text.secondary,
              },
              '& .MuiChartsLegend-series text': {
                fill: theme.palette.text.primary,
              },
            })}
          />
        </Box>
      </ChartContainer>
    )
  }

  const renderBySeason = () => {
    if (!trends.bySeason || trends.bySeason.length === 0) {
      return (
        <Typography variant="body2" color="text.secondary" align="center">
          {t('riskPrediction.noSeasonData')}
        </Typography>
      )
    }

    const seasonData = trends.bySeason.map((s, index) => ({
      id: s.season,
      label: s.season,
      value: s.count,
      color: ['#e07842', '#2e7d32', '#0288d1', '#9c27b0'][index % 4],
    }))

    return (
      <ChartContainer>
        <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary', mb: 2 }}>
          {t('riskPrediction.trendsBySeason')}
        </Typography>
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 350 }}>
          <PieChart
            series={[
              {
                data: seasonData,
                innerRadius: 60,
                outerRadius: 100,
                paddingAngle: 2,
                cornerRadius: 4,
                highlightScope: { fade: 'global', highlight: 'item' },
              },
            ]}
            height={350}
            margin={{ top: 10, right: 20, bottom: 30, left: 20 }}
            sx={(theme) => ({
              width: '100%',
              '& .MuiChartsLegend-series text': {
                fill: theme.palette.text.primary,
                fontSize: '0.875rem',
              },
              '& .MuiChartsLegend-mark': {
                rx: 2,
              },
            })}
          />
        </Box>
      </ChartContainer>
    )
  }

  const tabs = [
    { label: t('riskPrediction.byTrade'), content: renderByTrade() },
    { label: t('riskPrediction.byFloor'), content: renderByFloor() },
    { label: t('riskPrediction.byPhase'), content: renderByPhase() },
    { label: t('riskPrediction.bySeason'), content: renderBySeason() },
  ]

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            '& .MuiTab-root': {
              fontWeight: 600,
              textTransform: 'none',
              fontSize: '0.875rem',
            },
          }}
        >
          {tabs.map((tab, index) => (
            <Tab key={index} label={tab.label} />
          ))}
        </Tabs>
      </Box>

      <Box>{tabs[activeTab].content}</Box>

      <Box sx={{ mt: 3, p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
        <Typography variant="caption" color="text.secondary">
          {t('riskPrediction.analyzedPeriod')}: {trends.periodStart} - {trends.periodEnd}
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
          {t('riskPrediction.totalDefects')}: {trends.totalDefects}
        </Typography>
      </Box>
    </Box>
  )
}
