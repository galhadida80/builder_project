import { LineChart } from '@mui/x-charts/LineChart'
import { Box, Typography, Skeleton, Paper, styled } from '@/mui'

interface ProjectMetricsChartProps {
  title: string
  data: Array<{
    label: string
    values: number[]
  }>
  xAxisLabels: string[]
  loading?: boolean
  height?: number
  chartType?: 'line' | 'bar'
}

const ChartContainer = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  borderRadius: 12,
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
}))

export default function ProjectMetricsChart({
  title,
  data,
  xAxisLabels,
  loading = false,
  height = 350,
  chartType = 'line',
}: ProjectMetricsChartProps) {
  if (loading) {
    return (
      <ChartContainer>
        <Skeleton width={200} height={28} sx={{ mb: 2 }} />
        <Skeleton variant="rectangular" width="100%" height={height - 60} sx={{ borderRadius: 2 }} />
      </ChartContainer>
    )
  }

  // Transform data into the format expected by MUI X Charts
  const series = data.map((item) => ({
    data: item.values,
    label: item.label,
    curve: chartType === 'line' ? 'linear' as const : undefined,
  }))

  return (
    <ChartContainer>
      <Typography
        variant="h6"
        sx={{
          fontWeight: 600,
          color: 'text.primary',
          mb: 2,
        }}
      >
        {title}
      </Typography>
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: height,
        }}
      >
        <LineChart
          series={series}
          xAxis={[
            {
              data: xAxisLabels,
              scaleType: 'point',
              label: '',
            },
          ]}
          height={height}
          margin={{ top: 10, right: 20, bottom: 30, left: 50 }}
          sx={(theme) => ({
            width: '100%',
            '& .MuiChartsAxis-tickLabel': {
              fill: theme.palette.text.secondary,
            },
            '& .MuiChartsAxis-label': {
              fill: theme.palette.text.primary,
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
