import { useTranslation } from 'react-i18next'
import { getDateLocale } from '../../utils/dateLocale'
import { Notification, NotificationCategory } from '../../types/notification'
import { CheckCircleIcon, WarningIcon, UpdateIcon, InfoIcon, MoreVertIcon } from '@/icons'
import { ListItem, ListItemAvatar, ListItemText, Box, Typography, IconButton, Avatar as MuiAvatar, styled } from '@/mui'

interface NotificationItemProps {
  notification: Notification
  onClick?: (notification: Notification) => void
  onActionClick?: (notification: Notification) => void
}

const StyledListItem = styled(ListItem, {
  shouldForwardProp: (prop) => prop !== 'isRead',
})<{ isRead: boolean }>(({ theme, isRead }) => ({
  padding: theme.spacing(2),
  borderRadius: 8,
  marginBottom: theme.spacing(1),
  cursor: 'pointer',
  transition: 'all 150ms ease-out',
  backgroundColor: isRead ? 'transparent' : theme.palette.action.hover,
  '&:hover': {
    backgroundColor: theme.palette.action.selected,
  },
  position: 'relative',
}))

const UnreadIndicator = styled(Box)(({ theme }) => ({
  width: 8,
  height: 8,
  borderRadius: '50%',
  backgroundColor: theme.palette.primary.main,
  position: 'absolute',
  left: theme.spacing(0.5),
  top: theme.spacing(2.5),
}))

const CategoryBadge = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'categoryColor',
})<{ categoryColor: string }>(({ theme, categoryColor }) => ({
  position: 'absolute',
  bottom: -2,
  right: -2,
  width: 20,
  height: 20,
  borderRadius: '50%',
  backgroundColor: categoryColor,
  border: `2px solid ${theme.palette.background.paper}`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'white',
}))

const categoryConfig: Record<NotificationCategory, { icon: React.ReactNode; color: string; labelKey: string }> = {
  approval: {
    icon: <CheckCircleIcon sx={{ fontSize: 12 }} />,
    color: '#16A34A',
    labelKey: 'notifications.categories.approval',
  },
  inspection: {
    icon: <WarningIcon sx={{ fontSize: 12 }} />,
    color: '#EA580C',
    labelKey: 'notifications.categories.inspection',
  },
  update: {
    icon: <UpdateIcon sx={{ fontSize: 12 }} />,
    color: '#0369A1',
    labelKey: 'notifications.categories.update',
  },
  general: {
    icon: <InfoIcon sx={{ fontSize: 12 }} />,
    color: '#7C3AED',
    labelKey: 'notifications.categories.general',
  },
}

function getRelativeTime(timestamp: string, t: (key: string, opts?: Record<string, unknown>) => string): string {
  const now = new Date()
  const date = new Date(timestamp)
  const diffInMs = now.getTime() - date.getTime()
  const diffInMinutes = Math.floor(diffInMs / 60000)
  const diffInHours = Math.floor(diffInMs / 3600000)
  const diffInDays = Math.floor(diffInMs / 86400000)

  if (diffInMinutes < 1) return t('notifications.justNow')
  if (diffInMinutes < 60) return t('notifications.minutesAgo', { count: diffInMinutes })
  if (diffInHours < 24) return t('notifications.hoursAgo', { count: diffInHours })
  if (diffInDays < 7) return t('notifications.daysAgo', { count: diffInDays })
  if (diffInDays < 30) return t('notifications.weeksAgo', { count: Math.floor(diffInDays / 7) })
  return date.toLocaleDateString(getDateLocale())
}

function getInitials(title: string): string {
  return title
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function NotificationItem({ notification, onClick, onActionClick }: NotificationItemProps) {
  const { t } = useTranslation()
  const config = categoryConfig[notification.category] ?? categoryConfig.general

  const handleClick = () => {
    if (onClick) {
      onClick(notification)
    }
  }

  const handleActionClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onActionClick) {
      onActionClick(notification)
    }
  }

  return (
    <StyledListItem isRead={notification.isRead} onClick={handleClick}>
      {!notification.isRead && <UnreadIndicator />}

      <ListItemAvatar>
        <Box sx={{ position: 'relative' }}>
          <MuiAvatar
            sx={{
              bgcolor: config.color,
              width: 40,
              height: 40,
              fontSize: '0.875rem',
              fontWeight: 600,
            }}
          >
            {getInitials(notification.title)}
          </MuiAvatar>
          <CategoryBadge categoryColor={config.color}>
            {config.icon}
          </CategoryBadge>
        </Box>
      </ListItemAvatar>

      <ListItemText
        sx={{ overflow: 'hidden', minWidth: 0 }}
        primary={
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
            <Typography
              variant="caption"
              sx={{
                color: config.color,
                fontWeight: 600,
                textTransform: 'uppercase',
                fontSize: '0.65rem',
                letterSpacing: '0.5px',
              }}
            >
              {t(config.labelKey)}
            </Typography>
            <Typography
              variant="body2"
              noWrap
              sx={{
                fontWeight: 600,
                color: 'text.primary',
                lineHeight: 1.3,
              }}
            >
              {notification.title}
            </Typography>
          </Box>
        }
        secondary={
          <Box sx={{ mt: 0.5 }}>
            <Typography
              variant="body2"
              sx={{
                color: 'text.secondary',
                fontSize: '0.8rem',
                lineHeight: 1.4,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {notification.message}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: 'text.disabled',
                fontSize: '0.7rem',
                mt: 0.5,
                display: 'block',
              }}
            >
              {getRelativeTime(notification.createdAt, t)}
            </Typography>
          </Box>
        }
      />

      {onActionClick && (
        <IconButton aria-label={t('common.actions')}
          size="small"
          onClick={handleActionClick}
          sx={{ ml: 1, color: 'text.secondary' }}
        >
          <MoreVertIcon fontSize="small" />
        </IconButton>
      )}
    </StyledListItem>
  )
}
