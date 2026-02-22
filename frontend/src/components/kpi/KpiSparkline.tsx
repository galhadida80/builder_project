import { Box } from '@/mui'
import type { KpiSnapshotPoint } from '../../types'

interface KpiSparklineProps {
  data: KpiSnapshotPoint[]
  color?: string
  height?: number
  width?: number
}

export default function KpiSparkline({ data, color = '#c8956a', height = 40, width = 120 }: KpiSparklineProps) {
  if (data.length < 2) {
    return (
      <Box sx={{ width, height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Box sx={{ width: '60%', height: 1, bgcolor: 'divider' }} />
      </Box>
    )
  }

  const values = data.map(d => d.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const padding = 2

  const points = values.map((v, i) => {
    const x = padding + (i / (values.length - 1)) * (width - padding * 2)
    const y = height - padding - ((v - min) / range) * (height - padding * 2)
    return `${x},${y}`
  }).join(' ')

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={parseFloat(points.split(' ').pop()!.split(',')[0])}
        cy={parseFloat(points.split(' ').pop()!.split(',')[1])}
        r={3}
        fill={color}
      />
    </svg>
  )
}
