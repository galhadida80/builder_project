import { useState } from 'react'
import { Tabs } from '../ui/Tabs'
import { NotificationItem } from './NotificationItem'
import { Notification, NotificationCategory } from '../../types/notification'
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
  '& .MuiDrawer-paper': {
    width: 400,
    maxWidth: '100vw',
    backgroundColor: theme.palette.background.default,
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

const EmptyState = styled(Box)(({ theme }) => ({
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
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  const tabItems = [
    { label: 'All', value: 'all' },
    { label: 'Approvals', value: 'approval' },
    { label: 'Inspections', value: 'inspection' },
    { label: 'Updates', value: 'update' },
  ]

  const filteredNotifications =
    selectedCategory === 'all'
      ? notifications
      : notifications.filter((n) => n.category === selectedCategory)

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
            Notifications
          </Typography>
          {unreadCount > 0 && <UnreadBadge>{unreadCount}</UnreadBadge>}
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon fontSize="small" />
        </IconButton>
      </Header>

      <TabsContainer>
        <Tabs items={tabItems} value={selectedCategory} onChange={setSelectedCategory} variant="scrollable" size="small" />
      </TabsContainer>

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
            Mark all as read
          </MuiButton>
        </Box>
      )}

      {filteredNotifications.length === 0 ? (
        <EmptyState>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No notifications
          </Typography>
          <Typography variant="body2" color="text.disabled">
            {selectedCategory === 'all'
              ? "You're all caught up!"
              : `No ${selectedCategory} notifications at this time.`}
          </Typography>
        </EmptyState>
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
              {loading ? 'Loading...' : 'Load More'}
            </LoadMoreButton>
          )}
        </>
      )}
    </StyledDrawer>
  )
}
