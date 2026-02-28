import { useTranslation } from 'react-i18next'
import type { Notification } from '../../types/notification'
import { Card } from '../ui/Card'
import {
  NotificationsIcon, CheckCircleOutlineIcon, ErrorOutlineIcon,
  WarningAmberIcon, InfoOutlinedIcon, MoreVertIcon,
} from '@/icons'
import { Box, Typography, Checkbox, Badge, IconButton, Stack, alpha, useTheme } from '@/mui'

export const CATEGORY_COLORS: Record<string, string> = {
  all: 'text.secondary', approval: 'success.main', inspection: 'info.main',
  defect: 'error.main', update: 'warning.main', general: 'text.disabled',
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  approval: <CheckCircleOutlineIcon fontSize="small" />, inspection: <InfoOutlinedIcon fontSize="small" />,
  defect: <ErrorOutlineIcon fontSize="small" />, update: <WarningAmberIcon fontSize="small" />,
  general: <NotificationsIcon fontSize="small" />,
}

interface NotificationRowProps {
  notification: Notification; selected: boolean; formatTime: (dateStr: string) => string
  onToggleSelect: (id: string) => void; onToggleRead: (id: string, isRead: boolean) => void
  onMenuOpen: (e: React.MouseEvent<HTMLElement>, id: string) => void
}

function resolveColor(palette: Record<string, Record<string, string>>, path: string): string {
  const [group, key] = path.split('.')
  return palette[group]?.[key] ?? '#9e9e9e'
}

export function NotificationRow({
  notification, selected, onToggleSelect, onToggleRead, onMenuOpen, formatTime,
}: NotificationRowProps) {
  const { t } = useTranslation()
  const theme = useTheme()
  const colorPath = CATEGORY_COLORS[notification.category] || CATEGORY_COLORS.general
  const resolved = resolveColor(theme.palette as unknown as Record<string, Record<string, string>>, colorPath)

  return (
    <Card sx={{
      display: 'flex', alignItems: 'flex-start', gap: 1, p: 1.5,
      bgcolor: notification.isRead ? 'transparent' : 'action.hover',
      transition: 'background 0.2s', borderRadius: 1, border: 0,
      '&:hover': { bgcolor: 'action.selected' }, cursor: 'pointer',
    }}>
      <Checkbox
        size="small" checked={selected}
        onChange={() => onToggleSelect(notification.id)}
        onClick={e => e.stopPropagation()}
      />
      <Badge variant="dot" invisible={notification.isRead} color="primary" sx={{ mt: 0.5 }}>
        <Box sx={{
          width: 36, height: 36, borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          bgcolor: alpha(resolved, 0.13), color: resolved,
        }}>
          {CATEGORY_ICONS[notification.category] || <NotificationsIcon fontSize="small" />}
        </Box>
      </Badge>
      <Box sx={{ flex: 1, minWidth: 0, '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 2 } }} onClick={() => onToggleRead(notification.id, notification.isRead)} role="button" tabIndex={0} onKeyDown={(e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggleRead(notification.id, notification.isRead) } }} aria-label={t('accessibility.toggleReadNotification')}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="body2" fontWeight={notification.isRead ? 400 : 600} noWrap>
            {notification.title}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap', ml: 1 }}>
            {formatTime(notification.createdAt)}
          </Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary" noWrap>
          {notification.message}
        </Typography>
      </Box>
      <IconButton size="small" onClick={e => onMenuOpen(e, notification.id)}>
        <MoreVertIcon fontSize="small" />
      </IconButton>
    </Card>
  )
}
