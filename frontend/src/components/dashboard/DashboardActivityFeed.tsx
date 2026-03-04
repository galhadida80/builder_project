import { useTranslation } from 'react-i18next'
import { Button } from '../ui/Button'
import { EmptyState } from '../ui/EmptyState'
import { TrendingUpIcon, CheckCircleIcon, WarningAmberIcon, ErrorOutlineIcon, AssignmentIcon } from '@/icons'
import { Box, Typography, Paper, alpha } from '@/mui'
import type { AuditLog } from '../../types'

interface DashboardActivityFeedProps {
  auditLogs: AuditLog[]
  onNavigate: (path: string) => void
}

const ACTION_COLORS: Record<string, { palette: string; border: string }> = {
  create: { palette: 'success', border: 'success.main' },
  approval: { palette: 'info', border: 'info.main' },
  update: { palette: 'warning', border: 'warning.main' },
  delete: { palette: 'error', border: 'error.main' },
  status_change: { palette: 'info', border: 'info.main' },
  rejection: { palette: 'error', border: 'error.main' },
}

function getActivityIcon(action: string) {
  switch (action) {
    case 'create': return <TrendingUpIcon sx={{ fontSize: 20 }} />
    case 'approval': return <CheckCircleIcon sx={{ fontSize: 20 }} />
    case 'update': return <WarningAmberIcon sx={{ fontSize: 20 }} />
    case 'delete': return <ErrorOutlineIcon sx={{ fontSize: 20 }} />
    case 'status_change': return <AssignmentIcon sx={{ fontSize: 20 }} />
    case 'rejection': return <ErrorOutlineIcon sx={{ fontSize: 20 }} />
    default: return <AssignmentIcon sx={{ fontSize: 20 }} />
  }
}

function getRelativeTime(dateStr: string, t: (key: string, opts?: Record<string, string>) => string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return t('common.justNow', { defaultValue: 'Just now' })
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  return `${days}d`
}

export default function DashboardActivityFeed({ auditLogs, onNavigate }: DashboardActivityFeedProps) {
  const { t } = useTranslation()

  return (
    <Box sx={{ mb: { xs: 2.5, md: 3 } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="subtitle1" fontWeight={700}>{t('dashboard.recentActivity')}</Typography>
        <Button variant="tertiary" size="small" onClick={() => onNavigate('/audit-log')}>
          {t('dashboard.viewAll')}
        </Button>
      </Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {auditLogs.length > 0 ? auditLogs.slice(0, 5).map((log) => {
          const actionConfig = ACTION_COLORS[log.action] || { palette: 'primary', border: 'primary.main' }
          return (
            <Paper
              key={log.id}
              elevation={0}
              sx={{
                display: 'flex',
                gap: 1.5,
                p: 1.5,
                borderRadius: 3,
                alignItems: 'center',
                borderInlineStart: 4,
                borderColor: actionConfig.border,
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                transition: 'all 0.2s',
                '&:hover': {
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  transform: 'translateY(-1px)',
                },
              }}
            >
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 2,
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: (theme) => alpha(theme.palette[actionConfig.palette as 'success' | 'info' | 'warning' | 'error' | 'primary'].main, 0.12),
                  color: actionConfig.border,
                }}
              >
                {getActivityIcon(log.action)}
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" fontWeight={600} noWrap>
                  {log.user?.fullName || t('dashboard.system')}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap>
                  {t(`dashboard.activityActions.${log.action}`, { defaultValue: log.action })}{' '}
                  {t(`dashboard.activityEntities.${log.entityType}`, { defaultValue: log.entityType })}
                </Typography>
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
                {getRelativeTime(log.createdAt, t)}
              </Typography>
            </Paper>
          )
        }) : (
          <EmptyState variant="empty" title={t('dashboard.noActivityYet')} description={t('dashboard.activityWillAppear')} />
        )}
      </Box>
    </Box>
  )
}
