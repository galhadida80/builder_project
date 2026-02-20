import { Box, Typography, Divider } from '@/mui'

interface SummaryItem {
  label: string
  value: string | number
  color?: string
}

interface SummaryBarProps {
  items: SummaryItem[]
}

export default function SummaryBar({ items }: SummaryBarProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 3,
        overflow: 'hidden',
      }}
    >
      {items.map((item, i) => (
        <Box key={i} sx={{ display: 'contents' }}>
          {i > 0 && <Divider orientation="vertical" flexItem />}
          <Box sx={{ flex: 1, py: 1.5, px: 2, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, display: 'block', mb: 0.25 }}>
              {item.label}
            </Typography>
            <Typography variant="h6" fontWeight={700} sx={{ color: item.color || 'text.primary', lineHeight: 1.2 }}>
              {item.value}
            </Typography>
          </Box>
        </Box>
      ))}
    </Box>
  )
}
