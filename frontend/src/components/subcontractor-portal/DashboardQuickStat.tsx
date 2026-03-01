import { Box, Typography, alpha } from '@/mui'

interface DashboardQuickStatProps {
  value: number
  label: string
  icon: React.ReactNode
  color: string
}

export function DashboardQuickStat({ value, label, icon, color }: DashboardQuickStatProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 0.75,
        p: { xs: 1.5, sm: 2 },
        borderRadius: 2,
        bgcolor: (theme) => alpha(theme.palette.mode === 'dark' ? color : color, 0.08),
        border: 1,
        borderColor: (theme) => alpha(color, 0.2),
      }}
    >
      <Box sx={{ color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</Box>
      <Typography variant="h4" sx={{ fontWeight: 700, fontSize: { xs: '1.75rem', sm: '2rem' }, color }}>
        {value}
      </Typography>
      <Typography
        variant="caption"
        sx={{
          color: 'text.secondary',
          fontWeight: 600,
          fontSize: { xs: '0.7rem', sm: '0.75rem' },
          textAlign: 'center',
        }}
      >
        {label}
      </Typography>
    </Box>
  )
}
