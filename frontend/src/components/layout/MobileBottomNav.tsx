import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  DashboardIcon,
  FolderIcon,
  PersonIcon,
  MenuIcon,
  AssignmentIcon,
  ReportProblemIcon,
  ChecklistIcon,
  AddIcon,
  TaskAltIcon,
  EventIcon,
  BuildIcon,
  InventoryIcon,
} from '@/icons'
import {
  BottomNavigation,
  BottomNavigationAction,
  Paper,
  Fab,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Box,
} from '@/mui'

interface NavTab {
  labelKey: string
  path: string
  icon: React.ReactNode
  action?: 'menu'
}

const globalTabs: NavTab[] = [
  { labelKey: 'mobileNav.menu', path: '', icon: <MenuIcon />, action: 'menu' },
  { labelKey: 'mobileNav.dashboard', path: '/dashboard', icon: <DashboardIcon /> },
  { labelKey: 'mobileNav.projects', path: '/projects', icon: <FolderIcon /> },
  { labelKey: 'mobileNav.profile', path: '/profile', icon: <PersonIcon /> },
]

const projectTabs = (projectId: string): NavTab[] => [
  { labelKey: 'mobileNav.menu', path: '', icon: <MenuIcon />, action: 'menu' },
  { labelKey: 'mobileNav.overview', path: `/projects/${projectId}/overview`, icon: <DashboardIcon /> },
  { labelKey: 'mobileNav.inspections', path: `/projects/${projectId}/inspections`, icon: <AssignmentIcon /> },
  { labelKey: 'mobileNav.defects', path: `/projects/${projectId}/defects`, icon: <ReportProblemIcon /> },
]

interface QuickAction {
  labelKey: string
  icon: React.ReactNode
  path: string
}

const globalQuickActions: QuickAction[] = [
  { labelKey: 'mobileNav.quickActions.newProject', icon: <FolderIcon />, path: '/projects' },
]

const projectQuickActions = (projectId: string): QuickAction[] => [
  { labelKey: 'mobileNav.quickActions.newTask', icon: <TaskAltIcon />, path: `/projects/${projectId}/tasks` },
  { labelKey: 'mobileNav.quickActions.newDefect', icon: <ReportProblemIcon />, path: `/projects/${projectId}/defects` },
  { labelKey: 'mobileNav.quickActions.newInspection', icon: <AssignmentIcon />, path: `/projects/${projectId}/inspections` },
  { labelKey: 'mobileNav.quickActions.newMeeting', icon: <EventIcon />, path: `/projects/${projectId}/meetings` },
  { labelKey: 'mobileNav.quickActions.newEquipment', icon: <BuildIcon />, path: `/projects/${projectId}/equipment` },
  { labelKey: 'mobileNav.quickActions.newMaterial', icon: <InventoryIcon />, path: `/projects/${projectId}/materials` },
]

interface MobileBottomNavProps {
  projectId?: string
  onMenuOpen?: () => void
}

export default function MobileBottomNav({ projectId, onMenuOpen }: MobileBottomNavProps) {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const [fabMenuAnchor, setFabMenuAnchor] = useState<null | HTMLElement>(null)

  const tabs = projectId ? projectTabs(projectId) : globalTabs
  const leftTabs = tabs.slice(0, 2)
  const rightTabs = tabs.slice(2)
  const quickActions = projectId ? projectQuickActions(projectId) : globalQuickActions

  const getActiveTab = () => {
    const activeIndex = tabs.findIndex((tab) => {
      if (tab.action === 'menu') return false
      if (!tab.path) return false
      return location.pathname === tab.path || location.pathname.startsWith(tab.path + '/')
    })
    return activeIndex >= 0 ? activeIndex : -1
  }

  const activeTab = getActiveTab()

  const handleNavigation = (tab: NavTab) => {
    if (tab.action === 'menu') {
      onMenuOpen?.()
      return
    }
    navigate(tab.path)
  }

  const handleFabClick = (event: React.MouseEvent<HTMLElement>) => {
    setFabMenuAnchor(event.currentTarget)
  }

  const handleQuickAction = (action: QuickAction) => {
    setFabMenuAnchor(null)
    navigate(action.path, { state: { openCreate: true } })
  }

  return (
    <>
      <Paper
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 1200,
          borderTop: '1px solid',
          borderColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.06)' : 'divider',
          display: { xs: 'block', md: 'none' },
          bgcolor: (theme) => theme.palette.mode === 'dark' ? '#111111' : 'background.paper',
          backdropFilter: 'blur(24px)',
          boxShadow: '0 -4px 30px rgba(0, 0, 0, 0.15)',
        }}
        elevation={0}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-around',
            height: 68,
            px: 1,
            pb: '4px',
          }}
        >
          {/* Left nav items */}
          <BottomNavigation
            value={activeTab < 2 ? activeTab : -1}
            showLabels
            sx={{
              flex: 1,
              bgcolor: 'transparent',
              height: '100%',
              '& .MuiBottomNavigationAction-root': {
                minWidth: 'auto',
                padding: '6px 0',
                transition: 'color 200ms ease-out',
                color: (theme) => theme.palette.mode === 'dark' ? '#475569' : 'text.secondary',
                '&.Mui-selected': {
                  color: 'primary.main',
                  '& .MuiBottomNavigationAction-label': {
                    fontWeight: 600,
                    fontSize: '0.7rem',
                  },
                },
              },
              '& .MuiBottomNavigationAction-label': {
                fontSize: '0.65rem',
                fontWeight: 500,
                marginTop: '2px',
              },
            }}
          >
            {leftTabs.map((tab, index) => (
              <BottomNavigationAction
                key={tab.labelKey}
                label={t(tab.labelKey)}
                icon={tab.icon}
                onClick={() => handleNavigation(tab)}
                value={index}
              />
            ))}
          </BottomNavigation>

          {/* Center FAB */}
          <Box sx={{ display: 'flex', justifyContent: 'center', flex: '0 0 64px', mt: '-20px' }}>
            <Fab
              aria-label={t('mobileNav.quickCreate')}
              onClick={handleFabClick}
              sx={{
                width: 50,
                height: 50,
                background: 'linear-gradient(135deg, #e07842 0%, #d06832 100%)',
                boxShadow: '0 4px 20px rgba(224, 120, 66, 0.35)',
                color: 'white',
                '&:hover': {
                  background: 'linear-gradient(135deg, #d06832 0%, #c4612e 100%)',
                  boxShadow: '0 6px 24px rgba(224, 120, 66, 0.45)',
                },
                transition: 'all 200ms ease-out',
              }}
            >
              <AddIcon sx={{ fontSize: 26 }} />
            </Fab>
          </Box>

          {/* Right nav items */}
          <BottomNavigation
            value={activeTab >= 2 ? activeTab - 2 : -1}
            showLabels
            sx={{
              flex: 1,
              bgcolor: 'transparent',
              height: '100%',
              '& .MuiBottomNavigationAction-root': {
                minWidth: 'auto',
                padding: '6px 0',
                transition: 'color 200ms ease-out',
                color: (theme) => theme.palette.mode === 'dark' ? '#475569' : 'text.secondary',
                '&.Mui-selected': {
                  color: 'primary.main',
                  '& .MuiBottomNavigationAction-label': {
                    fontWeight: 600,
                    fontSize: '0.7rem',
                  },
                },
              },
              '& .MuiBottomNavigationAction-label': {
                fontSize: '0.65rem',
                fontWeight: 500,
                marginTop: '2px',
              },
            }}
          >
            {rightTabs.map((tab, index) => (
              <BottomNavigationAction
                key={tab.labelKey}
                label={t(tab.labelKey)}
                icon={tab.icon}
                onClick={() => handleNavigation(tab)}
                aria-label={tab.action === 'menu' ? t('common.openNavMenu') : undefined}
                value={index}
              />
            ))}
          </BottomNavigation>
        </Box>
      </Paper>

      {/* Quick-create menu */}
      <Menu
        anchorEl={fabMenuAnchor}
        open={Boolean(fabMenuAnchor)}
        onClose={() => setFabMenuAnchor(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        slotProps={{
          paper: {
            sx: {
              mb: 1,
              borderRadius: 3,
              minWidth: 200,
            },
          },
        }}
      >
        {quickActions.map((action) => (
          <MenuItem key={action.labelKey} onClick={() => handleQuickAction(action)}>
            <ListItemIcon sx={{ color: 'primary.main' }}>{action.icon}</ListItemIcon>
            <ListItemText>{t(action.labelKey)}</ListItemText>
          </MenuItem>
        ))}
      </Menu>
    </>
  )
}
