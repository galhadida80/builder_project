import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Box from '@mui/material/Box'
import Drawer from '@mui/material/Drawer'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Divider from '@mui/material/Divider'
import Typography from '@mui/material/Typography'
import DashboardIcon from '@mui/icons-material/Dashboard'
import FolderIcon from '@mui/icons-material/Folder'
import BuildIcon from '@mui/icons-material/Build'
import InventoryIcon from '@mui/icons-material/Inventory'
import EventIcon from '@mui/icons-material/Event'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import AccountTreeIcon from '@mui/icons-material/AccountTree'
import ContactsIcon from '@mui/icons-material/Contacts'
import HistoryIcon from '@mui/icons-material/History'
import SettingsIcon from '@mui/icons-material/Settings'

const DRAWER_WIDTH = 260

interface NavItem {
  label: string
  translationKey: string
  path: string
  icon: React.ReactNode
}

const getNavItems = (t: (key: string) => string): {
  main: NavItem[]
  project: NavItem[]
  system: NavItem[]
} => ({
  main: [
    { label: t('sidebar.dashboard'), translationKey: 'sidebar.dashboard', path: '/dashboard', icon: <DashboardIcon /> },
    { label: t('sidebar.projects'), translationKey: 'sidebar.projects', path: '/projects', icon: <FolderIcon /> },
  ],
  project: [
    { label: t('sidebar.equipment'), translationKey: 'sidebar.equipment', path: '/equipment', icon: <BuildIcon /> },
    { label: t('sidebar.materials'), translationKey: 'sidebar.materials', path: '/materials', icon: <InventoryIcon /> },
    { label: t('sidebar.meetings'), translationKey: 'sidebar.meetings', path: '/meetings', icon: <EventIcon /> },
    { label: t('sidebar.approvals'), translationKey: 'sidebar.approvals', path: '/approvals', icon: <CheckCircleIcon /> },
    { label: t('sidebar.areas'), translationKey: 'sidebar.areas', path: '/areas', icon: <AccountTreeIcon /> },
    { label: t('sidebar.contacts'), translationKey: 'sidebar.contacts', path: '/contacts', icon: <ContactsIcon /> },
  ],
  system: [
    { label: t('sidebar.auditLog'), translationKey: 'sidebar.auditLog', path: '/audit', icon: <HistoryIcon /> },
    { label: t('sidebar.settings'), translationKey: 'sidebar.settings', path: '/settings', icon: <SettingsIcon /> },
  ],
})

interface SidebarProps {
  projectId?: string
}

export default function Sidebar({ projectId }: SidebarProps) {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const { main: mainNavItems, project: projectNavItems, system: systemNavItems } = getNavItems(t)

  const isActive = (path: string) => {
    if (path === '/projects' && location.pathname.startsWith('/projects')) {
      return location.pathname === '/projects'
    }
    return location.pathname.startsWith(path)
  }

  const handleNavigation = (path: string, requiresProject: boolean) => {
    if (requiresProject && projectId) {
      navigate(`/projects/${projectId}${path}`)
    } else {
      navigate(path)
    }
  }

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: DRAWER_WIDTH,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: DRAWER_WIDTH,
          boxSizing: 'border-box',
          bgcolor: 'background.paper',
        },
      }}
    >
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <BuildIcon color="primary" sx={{ fontSize: 32 }} />
        <Typography variant="h6" color="primary" fontWeight="bold">
          BuilderOps
        </Typography>
      </Box>

      <Divider />

      <List>
        {mainNavItems.map((item) => (
          <ListItem key={item.path} disablePadding>
            <ListItemButton
              selected={isActive(item.path)}
              onClick={() => handleNavigation(item.path, false)}
              sx={{
                mx: 1,
                borderRadius: 2,
                '&.Mui-selected': {
                  bgcolor: 'primary.light',
                  color: 'primary.contrastText',
                  '& .MuiListItemIcon-root': { color: 'primary.contrastText' },
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      {projectId && (
        <>
          <Divider sx={{ my: 1 }} />
          <Typography variant="caption" sx={{ px: 3, py: 1, color: 'text.secondary', fontWeight: 500 }}>
            {t('sidebar.projectSection')}
          </Typography>
          <List>
            {projectNavItems.map((item) => {
              const fullPath = `/projects/${projectId}${item.path}`
              return (
                <ListItem key={item.path} disablePadding>
                  <ListItemButton
                    selected={location.pathname === fullPath}
                    onClick={() => handleNavigation(item.path, true)}
                    sx={{
                      mx: 1,
                      borderRadius: 2,
                      '&.Mui-selected': {
                        bgcolor: 'primary.light',
                        color: 'primary.contrastText',
                        '& .MuiListItemIcon-root': { color: 'primary.contrastText' },
                      },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
                    <ListItemText primary={item.label} />
                  </ListItemButton>
                </ListItem>
              )
            })}
          </List>
        </>
      )}

      <Box sx={{ flexGrow: 1 }} />

      <Divider />
      <List>
        {systemNavItems.map((item) => (
          <ListItem key={item.path} disablePadding>
            <ListItemButton
              selected={isActive(item.path)}
              onClick={() => handleNavigation(item.path, false)}
              sx={{ mx: 1, borderRadius: 2 }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Drawer>
  )
}
