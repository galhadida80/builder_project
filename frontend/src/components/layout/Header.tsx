import { useState } from 'react'
import { useTranslation } from 'react-i18next'
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

interface HeaderProps {
  user: User
  currentProject?: Project
  projects: Project[]
  onProjectChange: (projectId: string) => void
  onLogout: () => void
}

export default function Header({ user, currentProject, projects, onProjectChange, onLogout }: HeaderProps) {
  const { t } = useTranslation()
  const { showInfo } = useToast()
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [notificationAnchor, setNotificationAnchor] = useState<null | HTMLElement>(null)

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
  }

  const handleNotificationOpen = (event: React.MouseEvent<HTMLElement>) => {
    setNotificationAnchor(event.currentTarget)
  }

  const handleNotificationClose = () => {
    setNotificationAnchor(null)
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
          <ThemeToggle />

          <IconButton onClick={handleNotificationOpen}>
            <Badge badgeContent={3} color="error">
              <NotificationsIcon />
            </Badge>
          </IconButton>

          <IconButton onClick={handleMenuOpen} sx={{ ml: 1 }}>
            <Avatar sx={{ width: 36, height: 36, bgcolor: 'primary.main' }}>
              {getInitials(user.fullName || user.email)}
            </Avatar>
          </IconButton>
        </Box>

        <Menu
          anchorEl={notificationAnchor}
          open={Boolean(notificationAnchor)}
          onClose={handleNotificationClose}
          PaperProps={{ sx: { width: 320, maxHeight: 400 } }}
        >
          <Box sx={{ px: 2, py: 1 }}>
            <Typography variant="subtitle1" fontWeight="bold">{t('header.notifications')}</Typography>
          </Box>
          <Divider />
          <MenuItem onClick={handleNotificationClose}>
            <Box>
              <Typography variant="body2">{t('notifications.equipmentApprovalPending')}</Typography>
              <Typography variant="caption" color="text.secondary">{t('notifications.equipmentApprovalDesc')}</Typography>
            </Box>
          </MenuItem>
          <MenuItem onClick={handleNotificationClose}>
            <Box>
              <Typography variant="body2">{t('notifications.meetingScheduled')}</Typography>
              <Typography variant="caption" color="text.secondary">{t('notifications.meetingScheduledDesc')}</Typography>
            </Box>
          </MenuItem>
          <MenuItem onClick={handleNotificationClose}>
            <Box>
              <Typography variant="body2">{t('notifications.materialDeliveryUpdate')}</Typography>
              <Typography variant="caption" color="text.secondary">{t('notifications.materialDeliveryDesc')}</Typography>
            </Box>
          </MenuItem>
          <Divider />
          <MenuItem sx={{ justifyContent: 'center' }}>
            <Typography variant="body2" color="primary">{t('header.viewAllNotifications')}</Typography>
          </MenuItem>
        </Menu>

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
          <MenuItem onClick={() => { handleMenuClose(); showInfo(t('messages.profileComingSoon')); }}>
            <ListItemIcon><PersonIcon fontSize="small" /></ListItemIcon>
            {t('header.profile')}
          </MenuItem>
          <MenuItem onClick={() => { handleMenuClose(); showInfo(t('messages.settingsComingSoon')); }}>
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
}
