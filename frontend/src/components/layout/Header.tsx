import { useState, useEffect } from 'react'
import AppBar from '@mui/material/AppBar'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import Badge from '@mui/material/Badge'
import Avatar from '@mui/material/Avatar'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Divider from '@mui/material/Divider'
import ListItemIcon from '@mui/material/ListItemIcon'
import Box from '@mui/material/Box'
import NotificationsIcon from '@mui/icons-material/Notifications'
import PersonIcon from '@mui/icons-material/Person'
import SettingsIcon from '@mui/icons-material/Settings'
import LogoutIcon from '@mui/icons-material/Logout'
import type { User, Project } from '../../types'
import ProjectSelector from './ProjectSelector'
import { useToast } from '../common/ToastProvider'
import { ThemeToggle } from '../common/ThemeToggle'
import { LanguageToggle } from '../common/LanguageToggle'
import { NotificationsPanel } from '../notifications/NotificationsPanel'
import { useNotifications } from '../../hooks/useNotifications'

interface HeaderProps {
  user: User
  currentProject?: Project
  projects: Project[]
  onProjectChange: (projectId: string) => void
  onLogout: () => void
}

export default function Header({ user, currentProject, projects, onProjectChange, onLogout }: HeaderProps) {
  const { showInfo } = useToast()
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [notificationsPanelOpen, setNotificationsPanelOpen] = useState(false)

  const {
    notifications,
    unreadCount,
    loading,
    hasMore,
    markAsRead,
    markAllAsRead,
    loadMore,
    refresh,
  } = useNotifications()

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
  }

  const handleNotificationOpen = () => {
    setNotificationsPanelOpen(true)
  }

  const handleNotificationClose = () => {
    setNotificationsPanelOpen(false)
  }

  // Refresh notifications when panel opens
  useEffect(() => {
    if (notificationsPanelOpen) {
      refresh()
    }
  }, [notificationsPanelOpen, refresh])

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  return (
    <AppBar
      position="fixed"
      color="inherit"
      elevation={0}
      sx={{
        zIndex: (theme) => theme.zIndex.drawer + 1,
        borderBottom: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        ml: '260px',
        width: 'calc(100% - 260px)',
      }}
    >
      <Toolbar sx={{ justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <ProjectSelector
            projects={projects}
            currentProject={currentProject}
            onProjectChange={onProjectChange}
          />
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <LanguageToggle />
          <ThemeToggle />

          <IconButton onClick={handleNotificationOpen}>
            <Badge badgeContent={unreadCount} color="error">
              <NotificationsIcon />
            </Badge>
          </IconButton>

          <IconButton onClick={handleMenuOpen} sx={{ ml: 1 }}>
            <Avatar sx={{ width: 36, height: 36, bgcolor: 'primary.main' }}>
              {getInitials(user.fullName || user.email)}
            </Avatar>
          </IconButton>
        </Box>

        <NotificationsPanel
          open={notificationsPanelOpen}
          onClose={handleNotificationClose}
          notifications={notifications}
          unreadCount={unreadCount}
          onMarkAsRead={markAsRead}
          onMarkAllAsRead={markAllAsRead}
          onLoadMore={loadMore}
          hasMore={hasMore}
          loading={loading}
        />

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
          PaperProps={{ sx: { width: 200 } }}
        >
          <Box sx={{ px: 2, py: 1 }}>
            <Typography variant="subtitle2">{user.fullName}</Typography>
            <Typography variant="caption" color="text.secondary">{user.email}</Typography>
          </Box>
          <Divider />
          <MenuItem onClick={() => { handleMenuClose(); showInfo('Profile page coming soon!'); }}>
            <ListItemIcon><PersonIcon fontSize="small" /></ListItemIcon>
            Profile
          </MenuItem>
          <MenuItem onClick={() => { handleMenuClose(); showInfo('Settings page coming soon!'); }}>
            <ListItemIcon><SettingsIcon fontSize="small" /></ListItemIcon>
            Settings
          </MenuItem>
          <Divider />
          <MenuItem onClick={onLogout}>
            <ListItemIcon><LogoutIcon fontSize="small" /></ListItemIcon>
            Logout
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  )
}
