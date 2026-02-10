import { Box, Typography, Skeleton, Paper } from '@mui/material'
import { PieChart } from '@mui/x-charts/PieChart'
import { styled } from '@mui/material'

interface DistributionChartProps {
  title: string
  data: Array<{
    id: string | number
    label: string
    value: number
    color?: string
  }>
  loading?: boolean
  height?: number
  innerRadius?: number
  outerRadius?: number
  showLegend?: boolean
  showLabels?: boolean
}

const ChartContainer = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  borderRadius: 12,
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
}))

const defaultColors = [
  '#1976d2', // primary blue
  '#2e7d32', // success green
  '#ed6c02', // warning orange
  '#9c27b0', // purple
  '#d32f2f', // error red
  '#0288d1', // info blue
  '#7b1fa2', // deep purple
  '#f57c00', // orange
]

export default function DistributionChart({
  title,
  data,
  loading = false,
  height = 350,
  innerRadius = 0,
  outerRadius = 100,
  showLegend = true,
  showLabels = true,
}: DistributionChartProps) {
  if (loading) {
    return (
      <ChartContainer>
        <Skeleton width={200} height={28} sx={{ mb: 2 }} />
        <Skeleton variant="rectangular" width="100%" height={height - 60} sx={{ borderRadius: 2 }} />
      </ChartContainer>
    )
  }

  // Add default colors to data if not provided
  const chartData = data.map((item, index) => ({
    ...item,
    color: item.color || defaultColors[index % defaultColors.length],
  }))

  // Calculate total for percentage display
  const total = chartData.reduce((sum, item) => sum + item.value, 0)

  // Format data for PieChart with percentages in labels
  const formattedData = chartData.map((item) => ({
    ...item,
    label: showLabels && total > 0 ? `${item.label} (${((item.value / total) * 100).toFixed(1)}%)` : item.label,
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
        <PieChart
          series={[
            {
              data: formattedData,
              innerRadius,
              outerRadius,
              paddingAngle: 2,
              cornerRadius: 4,
              highlightScope: { fade: 'global', highlight: 'item' },
            },
          ]}
          height={height}
          margin={{ top: 10, right: 20, bottom: 30, left: 20 }}
          sx={{
            width: '100%',
            '& .MuiChartsLegend-series text': {
              fill: 'text.primary',
              fontSize: '0.875rem',
            },
            '& .MuiChartsLegend-mark': {
              rx: 2,
            },
          }}
        />
      </Box>
    </ChartContainer>
  )
}
