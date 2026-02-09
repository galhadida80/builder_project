import React from 'react'
import { ListItem, ListItemAvatar, ListItemText, Box, Typography, IconButton, Avatar as MuiAvatar } from '@mui/material'
import { styled } from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import WarningIcon from '@mui/icons-material/Warning'
import UpdateIcon from '@mui/icons-material/Update'
import InfoIcon from '@mui/icons-material/Info'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import { Notification, NotificationCategory } from '../../types/notification'

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

const categoryConfig: Record<NotificationCategory, { icon: React.ReactNode; color: string; label: string }> = {
  approval: {
    icon: <CheckCircleIcon sx={{ fontSize: 12 }} />,
    color: '#16A34A',
    label: 'Approval',
  },
  inspection: {
    icon: <WarningIcon sx={{ fontSize: 12 }} />,
    color: '#EA580C',
    label: 'Inspection',
  },
  update: {
    icon: <UpdateIcon sx={{ fontSize: 12 }} />,
    color: '#0369A1',
    label: 'Update',
  },
  general: {
    icon: <InfoIcon sx={{ fontSize: 12 }} />,
    color: '#7C3AED',
    label: 'General',
  },
}

function getRelativeTime(timestamp: string): string {
  const now = new Date()
  const date = new Date(timestamp)
  const diffInMs = now.getTime() - date.getTime()
  const diffInMinutes = Math.floor(diffInMs / 60000)
  const diffInHours = Math.floor(diffInMs / 3600000)
  const diffInDays = Math.floor(diffInMs / 86400000)

  if (diffInMinutes < 1) return 'Just now'
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`
  if (diffInHours < 24) return `${diffInHours}h ago`
  if (diffInDays < 7) return `${diffInDays}d ago`
  if (diffInDays < 30) return `${Math.floor(diffInDays / 7)}w ago`
  return date.toLocaleDateString()
}

function getInitials(title: string): string {
  return title
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export const NotificationItem = React.memo(function NotificationItem({ notification, onClick, onActionClick }: NotificationItemProps) {
  const config = categoryConfig[notification.category]

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
              {config.label}
            </Typography>
            <Typography
              variant="body2"
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
              {getRelativeTime(notification.createdAt)}
            </Typography>
          </Box>
        }
      />

      {onActionClick && (
        <IconButton
          size="small"
          onClick={handleActionClick}
          sx={{ ml: 1, color: 'text.secondary' }}
        >
          <MoreVertIcon fontSize="small" />
        </IconButton>
      )}
    </StyledListItem>
  )
})
