'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
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
import GroupIcon from '@mui/icons-material/Group'
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

export const DRAWER_WIDTH = 260

interface NavItemDef {
  key: string
  path: string
  icon: React.ReactNode
}

const mainNavDefs: NavItemDef[] = [
  { key: 'sidebar.dashboard', path: '/dashboard', icon: <DashboardIcon /> },
  { key: 'sidebar.projects', path: '/projects', icon: <FolderIcon /> },
  { key: 'sidebar.teamWorkload', path: '/team-workload', icon: <GroupIcon /> },
]

const projectNavDefs: NavItemDef[] = [
  { key: 'sidebar.equipment', path: '/equipment', icon: <BuildIcon /> },
  { key: 'sidebar.materials', path: '/materials', icon: <InventoryIcon /> },
  { key: 'sidebar.meetings', path: '/meetings', icon: <EventIcon /> },
  { key: 'sidebar.approvals', path: '/approvals', icon: <CheckCircleIcon /> },
  { key: 'sidebar.areas', path: '/areas', icon: <AccountTreeIcon /> },
  { key: 'sidebar.contacts', path: '/contacts', icon: <ContactsIcon /> },
  { key: 'sidebar.inspections', path: '/inspections', icon: <AssignmentIcon /> },
  { key: 'sidebar.rfis', path: '/rfis', icon: <EmailIcon /> },
]

const systemNavDefs: NavItemDef[] = [
  { key: 'sidebar.auditLog', path: '/audit', icon: <HistoryIcon /> },
  { key: 'sidebar.settings', path: '/settings', icon: <SettingsIcon /> },
]

interface AppSidebarProps {
  projectId?: string | null
}

const navButtonSx = {
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
}

export default function AppSidebar({ projectId }: AppSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const t = useTranslations()

  const isActive = (path: string) => {
    if (!pathname) return false
    if (path === '/projects' && pathname.startsWith('/projects')) {
      return pathname === '/projects'
    }
    return pathname.startsWith(path)
  }

  const handleNavigation = (path: string, requiresProject: boolean) => {
    if (requiresProject && projectId) {
      router.push(`/projects/${projectId}${path}`)
    } else {
      router.push(path)
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
      <Box sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
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
            sx={{ fontWeight: 700, fontSize: '1.125rem', color: 'text.primary', lineHeight: 1.2 }}
          >
            {t('sidebar.appName')}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
            {t('sidebar.appSubtitle')}
          </Typography>
        </Box>
      </Box>

      <Divider />

      <List sx={{ px: 1.5, py: 1 }}>
        {mainNavDefs.map((item) => (
          <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton
              selected={isActive(item.path)}
              onClick={() => handleNavigation(item.path, false)}
              sx={navButtonSx}
            >
              <ListItemIcon sx={{ minWidth: 40, color: 'text.secondary' }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={t(item.key)}
                primaryTypographyProps={{ fontWeight: 500, fontSize: '0.875rem' }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

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
          {t('sidebar.currentProject')}
        </Typography>
        {!projectId && (
          <Typography
            variant="caption"
            sx={{
              px: 3,
              pb: 1,
              display: 'block',
              color: 'text.disabled',
              fontSize: '0.7rem',
              fontStyle: 'italic',
            }}
          >
            {t('sidebar.selectProjectFirst')}
          </Typography>
        )}
        <List sx={{ px: 1.5, py: 0 }}>
          {projectNavDefs.map((item) => {
            const fullPath = projectId ? `/projects/${projectId}${item.path}` : ''
            return (
              <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
                <ListItemButton
                  selected={pathname === fullPath || false}
                  onClick={() => handleNavigation(item.path, true)}
                  disabled={!projectId}
                  sx={{
                    ...navButtonSx,
                    ...((!projectId) && { opacity: 0.4, pointerEvents: 'none' }),
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 40, color: 'text.secondary' }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={t(item.key)}
                    primaryTypographyProps={{ fontWeight: 500, fontSize: '0.875rem' }}
                  />
                </ListItemButton>
              </ListItem>
            )
          })}
        </List>
      </>

      <Box sx={{ flexGrow: 1 }} />

      <Divider sx={{ mx: 2 }} />
      <List sx={{ px: 1.5, py: 1 }}>
        {systemNavDefs.map((item) => (
          <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton
              selected={isActive(item.path)}
              onClick={() => handleNavigation(item.path, false)}
              sx={navButtonSx}
            >
              <ListItemIcon sx={{ minWidth: 40, color: 'text.secondary' }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={t(item.key)}
                primaryTypographyProps={{ fontWeight: 500, fontSize: '0.875rem' }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      <Box sx={{ p: 2, pt: 0 }}>
        <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.65rem' }}>
          {t('sidebar.version')}
        </Typography>
      </Box>
    </Drawer>
  )
}
