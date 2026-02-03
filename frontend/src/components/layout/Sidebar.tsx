import { useLocation, useNavigate } from 'react-router-dom'
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
import AssignmentIcon from '@mui/icons-material/Assignment'
import ConstructionIcon from '@mui/icons-material/Construction'
import EmailIcon from '@mui/icons-material/Email'
import { useTranslation } from 'react-i18next'

const DRAWER_WIDTH = 260

interface NavItem {
  labelKey: string
  path: string
  icon: React.ReactNode
}

const mainNavItems: NavItem[] = [
  { labelKey: 'nav.dashboard', path: '/dashboard', icon: <DashboardIcon /> },
  { labelKey: 'nav.projects', path: '/projects', icon: <FolderIcon /> },
]

const projectNavItems: NavItem[] = [
  { labelKey: 'nav.equipment', path: '/equipment', icon: <BuildIcon /> },
  { labelKey: 'nav.materials', path: '/materials', icon: <InventoryIcon /> },
  { labelKey: 'nav.meetings', path: '/meetings', icon: <EventIcon /> },
  { labelKey: 'nav.approvals', path: '/approvals', icon: <CheckCircleIcon /> },
  { labelKey: 'nav.areas', path: '/areas', icon: <AccountTreeIcon /> },
  { labelKey: 'nav.contacts', path: '/contacts', icon: <ContactsIcon /> },
  { labelKey: 'nav.inspections', path: '/inspections', icon: <AssignmentIcon /> },
  { labelKey: 'nav.rfis', path: '/rfis', icon: <EmailIcon /> },
]

const systemNavItems: NavItem[] = [
  { labelKey: 'nav.auditLog', path: '/audit', icon: <HistoryIcon /> },
  { labelKey: 'profile.settings', path: '/settings', icon: <SettingsIcon /> },
]

interface SidebarProps {
  projectId?: string
}

export default function Sidebar({ projectId }: SidebarProps) {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()

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
          borderInlineEnd: '1px solid',
          borderColor: 'divider',
        },
      }}
    >
      <Box
        sx={{
          p: 2.5,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
        }}
      >
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: 2,
            bgcolor: 'primary.main',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ConstructionIcon sx={{ color: 'white', fontSize: 24 }} />
        </Box>
        <Box>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              fontSize: '1.125rem',
              color: 'text.primary',
              lineHeight: 1.2,
            }}
          >
            BuilderOps
          </Typography>
          <Typography
            variant="caption"
            sx={{ color: 'text.secondary', fontSize: '0.7rem' }}
          >
            Construction Platform
          </Typography>
        </Box>
      </Box>

      <Divider />

      <List sx={{ px: 1.5, py: 1 }}>
        {mainNavItems.map((item) => (
          <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton
              selected={isActive(item.path)}
              onClick={() => handleNavigation(item.path, false)}
              sx={{
                borderRadius: 2,
                py: 1,
                transition: 'all 200ms ease-out',
                '&:hover': {
                  bgcolor: 'action.hover',
                },
                '&.Mui-selected': {
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  '&:hover': {
                    bgcolor: 'primary.dark',
                  },
                  '& .MuiListItemIcon-root': {
                    color: 'primary.contrastText',
                  },
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40, color: 'text.secondary' }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={t(item.labelKey)}
                primaryTypographyProps={{
                  fontWeight: 500,
                  fontSize: '0.875rem',
                }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      {projectId && (
        <>
          <Divider sx={{ mx: 2 }} />
          <Typography
            variant="caption"
            sx={{
              px: 3,
              py: 1.5,
              display: 'block',
              color: 'text.secondary',
              fontWeight: 600,
              fontSize: '0.65rem',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}
          >
            Current Project
          </Typography>
          <List sx={{ px: 1.5, py: 0 }}>
            {projectNavItems.map((item) => {
              const fullPath = `/projects/${projectId}${item.path}`
              return (
                <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
                  <ListItemButton
                    selected={location.pathname === fullPath}
                    onClick={() => handleNavigation(item.path, true)}
                    sx={{
                      borderRadius: 2,
                      py: 1,
                      transition: 'all 200ms ease-out',
                      '&:hover': {
                        bgcolor: 'action.hover',
                      },
                      '&.Mui-selected': {
                        bgcolor: 'primary.main',
                        color: 'primary.contrastText',
                        '&:hover': {
                          bgcolor: 'primary.dark',
                        },
                        '& .MuiListItemIcon-root': {
                          color: 'primary.contrastText',
                        },
                      },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 40, color: 'text.secondary' }}>
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText
                      primary={t(item.labelKey)}
                      primaryTypographyProps={{
                        fontWeight: 500,
                        fontSize: '0.875rem',
                      }}
                    />
                  </ListItemButton>
                </ListItem>
              )
            })}
          </List>
        </>
      )}

      <Box sx={{ flexGrow: 1 }} />

      <Divider sx={{ mx: 2 }} />
      <List sx={{ px: 1.5, py: 1 }}>
        {systemNavItems.map((item) => (
          <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton
              selected={isActive(item.path)}
              onClick={() => handleNavigation(item.path, false)}
              sx={{
                borderRadius: 2,
                py: 1,
                transition: 'all 200ms ease-out',
                '&:hover': {
                  bgcolor: 'action.hover',
                },
                '&.Mui-selected': {
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  '& .MuiListItemIcon-root': {
                    color: 'primary.contrastText',
                  },
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40, color: 'text.secondary' }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={t(item.labelKey)}
                primaryTypographyProps={{
                  fontWeight: 500,
                  fontSize: '0.875rem',
                }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      <Box sx={{ p: 2, pt: 0 }}>
        <Typography
          variant="caption"
          sx={{
            color: 'text.disabled',
            fontSize: '0.65rem',
          }}
        >
          v1.0.0
        </Typography>
      </Box>
    </Drawer>
  )
}
