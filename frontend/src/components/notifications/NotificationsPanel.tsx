import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Tabs } from '../ui/Tabs'
import { NotificationItem } from './NotificationItem'
import { Notification, NotificationCategory, UrgencyLevel } from '../../types/notification'
import { CloseIcon } from '@/icons'
import { Drawer, Box, Typography, IconButton, List, Divider, Button as MuiButton, styled } from '@/mui'

interface NotificationsPanelProps {
  open: boolean
  onClose: () => void
  notifications?: Notification[]
  unreadCount?: number
  onMarkAsRead?: (notification: Notification) => void
  onMarkAllAsRead?: () => void
  onLoadMore?: () => void
  hasMore?: boolean
  loading?: boolean
}

const StyledDrawer = styled(Drawer)(({ theme }) => ({
  zIndex: 1400,
  '& .MuiDrawer-paper': {
    width: 400,
    maxWidth: '100vw',
    backgroundColor: theme.palette.background.default,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  '& .MuiBackdrop-root': {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    backdropFilter: 'blur(4px)',
  },
}))

const Header = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: theme.spacing(2, 3),
  borderBottom: `1px solid ${theme.palette.divider}`,
  position: 'sticky',
  top: 0,
  backgroundColor: theme.palette.background.default,
  zIndex: 1,
}))

const TabsContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2, 3, 1),
  borderBottom: `1px solid ${theme.palette.divider}`,
  position: 'sticky',
  top: 72,
  backgroundColor: theme.palette.background.default,
  zIndex: 1,
}))

const NotificationsList = styled(List)(({ theme }) => ({
  padding: theme.spacing(2, 3),
  overflowY: 'auto',
  flexGrow: 1,
}))

const LoadMoreButton = styled(MuiButton)(({ theme }) => ({
  margin: theme.spacing(2, 3),
  textTransform: 'none',
  fontWeight: 500,
}))

const EmptyStateBox = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: theme.spacing(6, 3),
  textAlign: 'center',
}))

const UnreadBadge = styled(Box)(({ theme }) => ({
  minWidth: 22,
  height: 22,
  borderRadius: 11,
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  fontSize: '0.7rem',
  fontWeight: 600,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: theme.spacing(0, 0.75),
  marginLeft: theme.spacing(1),
}))

export function NotificationsPanel({
  open,
  onClose,
  notifications = [],
  unreadCount = 0,
  onMarkAsRead,
  onMarkAllAsRead,
  onLoadMore,
  hasMore = false,
  loading = false,
}: NotificationsPanelProps) {
  const { t } = useTranslation()
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedUrgency, setSelectedUrgency] = useState<string>('all')

  const tabItems = [
    { label: t('notificationsPanel.all'), value: 'all' },
    { label: t('notificationsPanel.approvals'), value: 'approval' },
    { label: t('notificationsPanel.inspections'), value: 'inspection' },
    { label: t('notificationsPanel.updates'), value: 'update' },
  ]

  const urgencyItems = [
    { label: t('notificationsPanel.allUrgencies'), value: 'all' },
    { label: t('notifications.urgency.critical'), value: 'critical' },
    { label: t('notifications.urgency.high'), value: 'high' },
    { label: t('notifications.urgency.medium'), value: 'medium' },
    { label: t('notifications.urgency.low'), value: 'low' },
  ]

  let filteredNotifications = notifications

  // Filter by category
  if (selectedCategory !== 'all') {
    filteredNotifications = filteredNotifications.filter((n) => n.category === selectedCategory)
  }

  // Filter by urgency
  if (selectedUrgency !== 'all') {
    filteredNotifications = filteredNotifications.filter((n) => n.urgency === selectedUrgency)
  }

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead && onMarkAsRead) {
      onMarkAsRead(notification)
    }
  }

  return (
    <StyledDrawer anchor="right" open={open} onClose={onClose}>
      <Header>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Typography variant="h6" component="div" fontWeight={600}>
            {t('notificationsPanel.title')}
          </Typography>
          {unreadCount > 0 && <UnreadBadge>{unreadCount}</UnreadBadge>}
        </Box>
        <IconButton aria-label={t('notifications.closePanel')} onClick={onClose} size="small">
          <CloseIcon fontSize="small" />
        </IconButton>
      </Header>

      <TabsContainer>
        <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block', fontWeight: 500 }}>
          {t('notificationsPanel.categoryFilter')}
        </Typography>
        <Tabs items={tabItems} value={selectedCategory} onChange={setSelectedCategory} variant="scrollable" size="small" />
      </TabsContainer>

      <Box sx={{ px: 3, pt: 2, pb: 1, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block', fontWeight: 500 }}>
          {t('notificationsPanel.urgencyFilter')}
        </Typography>
        <Tabs items={urgencyItems} value={selectedUrgency} onChange={setSelectedUrgency} variant="scrollable" size="small" />
      </Box>

      {onMarkAllAsRead && unreadCount > 0 && (
        <Box sx={{ px: 3, pt: 2, pb: 1 }}>
          <MuiButton
            variant="text"
            size="small"
            onClick={onMarkAllAsRead}
            sx={{
              textTransform: 'none',
              fontWeight: 500,
              fontSize: '0.85rem',
              color: 'primary.main',
            }}
          >
            {t('notificationsPanel.markAllAsRead')}
          </MuiButton>
        </Box>
      )}

      {filteredNotifications.length === 0 ? (
        <EmptyStateBox>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {t('notificationsPanel.noNotifications')}
          </Typography>
          <Typography variant="body2" color="text.disabled">
            {selectedCategory === 'all'
              ? t('notificationsPanel.allCaughtUp')
              : t('notificationsPanel.noCategoryNotifications', { category: selectedCategory })}
          </Typography>
        </EmptyStateBox>
      ) : (
        <>
          <NotificationsList>
            {filteredNotifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onClick={handleNotificationClick}
              />
            ))}
          </NotificationsList>

          {hasMore && (
            <LoadMoreButton
              variant="outlined"
              fullWidth
              onClick={onLoadMore}
              disabled={loading}
            >
              {loading ? t('common.loading') : t('notificationsPanel.loadMore')}
            </LoadMoreButton>
          )}
        </>
      )}
    </StyledDrawer>
  )
}
