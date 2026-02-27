import { Box, Typography } from '@/mui'

interface PageHeaderProps {
  title: string
  breadcrumbs?: unknown[]
  actions?: React.ReactNode
  subtitle?: string
  icon?: React.ReactNode
}

export function PageHeader({ title, actions, subtitle, icon }: PageHeaderProps) {
  return (
    <Box sx={{
      position: 'sticky', top: 0, zIndex: 20,
      bgcolor: 'background.default',
      px: { xs: 2, sm: 3 }, py: 1.5,
      borderBottom: 1, borderColor: 'divider',
      mb: 0,
    }}>
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 1,
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0, flex: 1 }}>
          {icon && <Box sx={{ color: 'primary.main', display: 'flex' }}>{icon}</Box>}
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 700,
                letterSpacing: '-0.02em',
                color: 'text.primary',
                lineHeight: 1.3,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {title}
            </Typography>
            {subtitle && (
              <Typography
                variant="caption"
                sx={{
                  color: 'text.secondary',
                  display: 'block',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {subtitle}
              </Typography>
            )}
          </Box>
        </Box>
        {actions && (
          <Box sx={{ display: 'flex', gap: 1, flexShrink: 0, alignItems: 'center' }}>
            {actions}
          </Box>
        )}
      </Box>
    </Box>
  )
}

export function Breadcrumbs() {
  return null
}
