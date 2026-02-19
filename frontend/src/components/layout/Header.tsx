import { useState, memo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import type { User, Project } from '../../types'
import ProjectSelector from './ProjectSelector'
import { useToast } from '../common/ToastProvider'
import { ThemeToggle } from '../common/ThemeToggle'
import { LanguageSwitcher } from '../common/LanguageSwitcher'
import { NotificationsPanel } from '../notifications/NotificationsPanel'
import { useNotifications } from '../../hooks/useNotifications'
import { NotificationsIcon, PersonIcon, SettingsIcon, LogoutIcon } from '@/icons'
import { AppBar, Toolbar, Typography, IconButton, Avatar, Badge, Menu, MenuItem, Divider, ListItemIcon, Box } from '@/mui'

interface HeaderProps {
  user: User
  currentProject?: Project
  projects: Project[]
  onProjectChange: (projectId: string) => void
  onLogout: () => void
}

export default memo(function Header({ user, currentProject, projects, onProjectChange, onLogout }: HeaderProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { showInfo } = useToast()
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [notificationPanelOpen, setNotificationPanelOpen] = useState(false)

  const { notifications, unreadCount, markAsRead, markAllAsRead, loadMore, hasMore, loading } = useNotifications()

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  return (
    <AppBar
      position="fixed"
      color="inherit"
      elevation={0}
      sx={{
        zIndex: 1201,
        borderBottom: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        ms: { xs: 0, md: '260px' },
        width: { xs: '100%', md: 'calc(100% - 260px)' },
      }}
    >
      <Toolbar sx={{ justifyContent: 'space-between', px: { xs: 0.5, sm: 2 }, gap: 0.5, minHeight: { xs: 56, sm: 64 }, minWidth: 0, '& .MuiIconButton-root:focus-visible': { outline: (theme) => `2px solid ${theme.palette.primary.main}`, outlineOffset: 2, borderRadius: '50%' } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0, flex: 1, overflow: 'hidden' }}>
          <ProjectSelector
            projects={projects}
            currentProject={currentProject}
            onProjectChange={onProjectChange}
          />
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0, flexShrink: 0 }}>
          <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center' }}>
            <ThemeToggle />
            <LanguageSwitcher />
          </Box>

          <IconButton aria-label={t('common.notifications')} onClick={() => setNotificationPanelOpen(true)} size="small">
            <Badge badgeContent={unreadCount} color="error">
              <NotificationsIcon fontSize="small" />
            </Badge>
          </IconButton>

          <IconButton aria-label={t('common.userMenu')} onClick={handleMenuOpen} size="small">
            <Avatar sx={{ width: 30, height: 30, bgcolor: 'primary.main', fontSize: '0.75rem' }}>
              {getInitials(user.fullName || user.email)}
            </Avatar>
          </IconButton>
        </Box>

        <NotificationsPanel
          open={notificationPanelOpen}
          onClose={() => setNotificationPanelOpen(false)}
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
          PaperProps={{ sx: { width: 220 } }}
        >
          <Box sx={{ px: 2, py: 1 }}>
            <Typography variant="subtitle2">{user.fullName}</Typography>
            <Typography variant="caption" color="text.secondary">{user.email}</Typography>
          </Box>
          <Divider />
          <Box sx={{ display: { xs: 'flex', md: 'none' }, justifyContent: 'center', gap: 1, py: 1, px: 2 }}>
            <ThemeToggle />
            <LanguageSwitcher />
          </Box>
          <Divider sx={{ display: { xs: 'block', md: 'none' } }} />
          <MenuItem onClick={() => { handleMenuClose(); navigate('/profile'); }}>
            <ListItemIcon><PersonIcon fontSize="small" /></ListItemIcon>
            {t('header.profile')}
          </MenuItem>
          <MenuItem onClick={() => { handleMenuClose(); navigate('/settings'); }}>
            <ListItemIcon><SettingsIcon fontSize="small" /></ListItemIcon>
            {t('nav.settings')}
          </MenuItem>
          <Divider />
          <MenuItem onClick={onLogout}>
            <ListItemIcon><LogoutIcon fontSize="small" /></ListItemIcon>
            {t('header.logout')}
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  )
})
