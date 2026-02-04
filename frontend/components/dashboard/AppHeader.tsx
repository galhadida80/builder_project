'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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
import ListItemText from '@mui/material/ListItemText'
import Box from '@mui/material/Box'
import Tooltip from '@mui/material/Tooltip'
import FormControl from '@mui/material/FormControl'
import Select, { SelectChangeEvent } from '@mui/material/Select'
import Chip from '@mui/material/Chip'
import NotificationsIcon from '@mui/icons-material/Notifications'
import PersonIcon from '@mui/icons-material/Person'
import SettingsIcon from '@mui/icons-material/Settings'
import LogoutIcon from '@mui/icons-material/Logout'
import LightModeIcon from '@mui/icons-material/LightMode'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import LanguageIcon from '@mui/icons-material/Language'
import { useThemeContext } from '@/components/providers/ThemeRegistry'
import { DRAWER_WIDTH } from './AppSidebar'

interface User {
  id: string
  email: string
  fullName: string
  role?: string
}

interface Project {
  id: string
  name: string
  code: string
  status?: string
}

interface AppHeaderProps {
  user: User | null
  projects: Project[]
  currentProject: Project | null
  onProjectChange: (projectId: string) => void
  onLogout: () => void
}

export default function AppHeader({ user, projects, currentProject, onProjectChange, onLogout }: AppHeaderProps) {
  const router = useRouter()
  const { mode, toggleMode, direction, setDirection } = useThemeContext()
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null)
  const [langMenuAnchor, setLangMenuAnchor] = useState<null | HTMLElement>(null)

  const handleProjectChange = (event: SelectChangeEvent<string>) => {
    onProjectChange(event.target.value)
  }

  const handleLanguageChange = (lng: 'en' | 'he' | 'es') => {
    document.cookie = `NEXT_LOCALE=${lng}; path=/; max-age=${60 * 60 * 24 * 365}`
    if (lng === 'he') {
      setDirection('rtl')
    } else {
      setDirection('ltr')
    }
    setLangMenuAnchor(null)
    window.location.reload()
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const getStatusColor = (status?: string): 'success' | 'warning' | 'info' | 'default' => {
    switch (status) {
      case 'active': return 'success'
      case 'on_hold': return 'warning'
      case 'completed': return 'info'
      default: return 'default'
    }
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
        marginInlineStart: `${DRAWER_WIDTH}px`,
        width: `calc(100% - ${DRAWER_WIDTH}px)`,
      }}
    >
      <Toolbar sx={{ justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <FormControl size="small" sx={{ minWidth: 280 }}>
            <Select
              value={currentProject?.id || ''}
              onChange={handleProjectChange}
              displayEmpty
              sx={{
                bgcolor: 'action.hover',
                '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                borderRadius: 2,
              }}
              renderValue={(selected) => {
                if (!selected) {
                  return <Typography color="text.secondary">Select a project</Typography>
                }
                const project = projects.find(p => p.id === selected)
                return (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography>{project?.name}</Typography>
                    <Chip label={project?.code} size="small" sx={{ height: 20, fontSize: '0.7rem' }} />
                  </Box>
                )
              }}
            >
              <MenuItem value="" disabled>
                <Typography color="text.secondary">Select a project</Typography>
              </MenuItem>
              {projects.map((project) => (
                <MenuItem key={project.id} value={project.id}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <Box>
                      <Typography variant="body2">{project.name}</Typography>
                      <Typography variant="caption" color="text.secondary">{project.code}</Typography>
                    </Box>
                    <Chip
                      label={project.status || 'active'}
                      size="small"
                      color={getStatusColor(project.status)}
                      sx={{ height: 20, fontSize: '0.65rem', textTransform: 'capitalize' }}
                    />
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Tooltip title="Language">
            <IconButton
              onClick={(e) => setLangMenuAnchor(e.currentTarget)}
              size="small"
              sx={{ color: 'text.secondary', '&:hover': { color: 'text.primary' } }}
            >
              <LanguageIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title="Theme">
            <IconButton
              onClick={toggleMode}
              size="small"
              sx={{ color: 'text.secondary', '&:hover': { color: 'text.primary' } }}
            >
              {mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
            </IconButton>
          </Tooltip>

          <IconButton size="small">
            <Badge badgeContent={0} color="error">
              <NotificationsIcon />
            </Badge>
          </IconButton>

          <IconButton onClick={(e) => setUserMenuAnchor(e.currentTarget)} sx={{ ml: 1 }}>
            <Avatar sx={{ width: 36, height: 36, bgcolor: 'primary.main' }}>
              {user ? getInitials(user.fullName || user.email) : '?'}
            </Avatar>
          </IconButton>
        </Box>

        <Menu
          anchorEl={langMenuAnchor}
          open={Boolean(langMenuAnchor)}
          onClose={() => setLangMenuAnchor(null)}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          slotProps={{ paper: { sx: { mt: 1, minWidth: 160 } } }}
        >
          <MenuItem onClick={() => handleLanguageChange('en')}>
            <ListItemIcon sx={{ fontSize: '1.5rem' }}>🇺🇸</ListItemIcon>
            <ListItemText>English</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => handleLanguageChange('he')}>
            <ListItemIcon sx={{ fontSize: '1.5rem' }}>🇮🇱</ListItemIcon>
            <ListItemText>עברית</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => handleLanguageChange('es')}>
            <ListItemIcon sx={{ fontSize: '1.5rem' }}>🇪🇸</ListItemIcon>
            <ListItemText>Español</ListItemText>
          </MenuItem>
        </Menu>

        <Menu
          anchorEl={userMenuAnchor}
          open={Boolean(userMenuAnchor)}
          onClose={() => setUserMenuAnchor(null)}
          slotProps={{ paper: { sx: { width: 200 } } }}
        >
          <Box sx={{ px: 2, py: 1 }}>
            <Typography variant="subtitle2">{user?.fullName}</Typography>
            <Typography variant="caption" color="text.secondary">{user?.email}</Typography>
          </Box>
          <Divider />
          <MenuItem onClick={() => { setUserMenuAnchor(null) }}>
            <ListItemIcon><PersonIcon fontSize="small" /></ListItemIcon>
            Profile
          </MenuItem>
          <MenuItem onClick={() => { setUserMenuAnchor(null); router.push('/settings') }}>
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
