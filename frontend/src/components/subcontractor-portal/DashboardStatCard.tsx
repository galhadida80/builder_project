import { Box, Typography, Paper, alpha } from '@/mui'

interface StatItemProps {
  value: number
  label: string
  icon: React.ReactNode
  color: string
}

interface DashboardStatCardProps {
  title: string
  icon: React.ReactNode
  color: string
  stats: StatItemProps[]
}

export function DashboardStatCard({ title, icon, color, stats }: DashboardStatCardProps) {
  return (
    <Paper sx={{ borderRadius: 3, p: { xs: 2.5, sm: 3 }, height: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 40,
            height: 40,
            borderRadius: 2,
            background: (theme) =>
              `linear-gradient(135deg, ${alpha(color, 0.2)}, ${alpha(color, 0.08)})`,
            color,
            flexShrink: 0,
          }}
        >
          {icon}
        </Box>
        <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1rem' }}>
          {title}
        </Typography>
      </Box>

      <Box sx={{ display: 'grid', gap: 1.5 }}>
        {stats.map((stat, index) => (
          <Box
            key={index}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              p: 1.5,
              borderRadius: 1.5,
              bgcolor: (theme) => alpha(stat.color, 0.06),
              border: 1,
              borderColor: (theme) => alpha(stat.color, 0.15),
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0, flex: 1 }}>
              <Box sx={{ color: stat.color, display: 'flex', flexShrink: 0 }}>{stat.icon}</Box>
              <Typography
                variant="body2"
                sx={{
                  color: 'text.secondary',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {stat.label}
              </Typography>
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: stat.color, flexShrink: 0, ml: 1 }}>
              {stat.value}
            </Typography>
          </Box>
        ))}
      </Box>
    </Paper>
  )
}
