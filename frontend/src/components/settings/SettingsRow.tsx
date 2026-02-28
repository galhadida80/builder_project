import { Box, Typography } from '@/mui'

interface SettingsRowProps {
  icon: React.ReactNode
  label: string
  subtitle?: string
  action: React.ReactNode
  onClick?: () => void
}

export function SettingsRow({ icon, label, subtitle, action, onClick }: SettingsRowProps) {
  return (
    <Box
      onClick={onClick}
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        px: 2,
        py: 1.5,
        cursor: onClick ? 'pointer' : 'default',
        '&:hover': onClick ? { bgcolor: 'action.hover' } : {},
        transition: 'background-color 0.15s',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1, minWidth: 0 }}>
        {icon}
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" fontWeight={500}>{label}</Typography>
          {subtitle && <Typography variant="caption" color="text.secondary">{subtitle}</Typography>}
        </Box>
      </Box>
      <Box sx={{ flexShrink: 0, ml: 1 }}>{action}</Box>
    </Box>
  )
}
