import { PieChart } from '@mui/x-charts/PieChart'
import { Box, Typography, Skeleton, Paper, styled, useTheme, useMediaQuery } from '@/mui'

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
  padding: theme.spacing(2),
  [theme.breakpoints.up('md')]: {
    padding: theme.spacing(3),
  },
  borderRadius: 12,
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
}))

const defaultColors = [
  '#e07842', // primary orange
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
  const theme = useTheme()
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'))
  const isLargeDesktop = useMediaQuery(theme.breakpoints.up('lg'))

  const responsiveHeight = isLargeDesktop ? Math.max(height, 320) : isDesktop ? Math.max(height, 280) : height
  const responsiveOuter = isLargeDesktop ? outerRadius * 1.4 : isDesktop ? outerRadius * 1.2 : outerRadius
  const responsiveInner = isLargeDesktop ? innerRadius * 1.4 : isDesktop ? innerRadius * 1.2 : innerRadius

  if (loading) {
    return (
      <ChartContainer>
        <Skeleton width={200} height={28} sx={{ mb: 2 }} />
        <Skeleton variant="rectangular" width="100%" height={responsiveHeight - 60} sx={{ borderRadius: 2 }} />
      </ChartContainer>
    )
  }

  const chartData = data.map((item, index) => ({
    ...item,
    color: item.color || defaultColors[index % defaultColors.length],
  }))

  const total = chartData.reduce((sum, item) => sum + item.value, 0)

  const formattedData = chartData.map((item) => ({
    ...item,
    label: showLabels && total > 0 ? `${item.label} (${((item.value / total) * 100).toFixed(1)}%)` : item.label,
  }))

  return (
    <ChartContainer>
      <Typography
        variant={isDesktop ? 'subtitle1' : 'h6'}
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
          minHeight: responsiveHeight,
        }}
      >
        <PieChart
          series={[
            {
              data: formattedData,
              innerRadius: responsiveInner,
              outerRadius: responsiveOuter,
              paddingAngle: 2,
              cornerRadius: 4,
              highlightScope: { fade: 'global', highlight: 'item' },
            },
          ]}
          height={responsiveHeight}
          margin={{ top: 10, right: isDesktop ? 30 : 20, bottom: 30, left: isDesktop ? 30 : 20 }}
          slotProps={{
            legend: {
              direction: isDesktop ? 'column' : 'row',
              position: { vertical: isDesktop ? 'middle' : 'bottom', horizontal: isDesktop ? 'right' : 'middle' },
            },
          }}
          sx={(theme) => ({
            width: '100%',
            '& .MuiChartsLegend-series text': {
              fill: theme.palette.text.primary,
              fontSize: isDesktop ? '0.8125rem' : '0.75rem',
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
