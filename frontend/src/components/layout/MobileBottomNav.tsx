import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { DashboardIcon, FolderIcon, PersonIcon, MenuIcon, AssignmentIcon, ReportProblemIcon, ChecklistIcon } from '@/icons'
import { BottomNavigation, BottomNavigationAction, Paper } from '@/mui'

interface NavTab {
  labelKey: string
  path: string
  icon: React.ReactNode
  action?: 'menu'
}

const globalTabs: NavTab[] = [
  { labelKey: 'mobileNav.dashboard', path: '/dashboard', icon: <DashboardIcon /> },
  { labelKey: 'mobileNav.projects', path: '/projects', icon: <FolderIcon /> },
  { labelKey: 'mobileNav.profile', path: '/profile', icon: <PersonIcon /> },
  { labelKey: 'mobileNav.menu', path: '', icon: <MenuIcon />, action: 'menu' },
]

const projectTabs = (projectId: string): NavTab[] => [
  { labelKey: 'mobileNav.overview', path: `/projects/${projectId}/overview`, icon: <DashboardIcon /> },
  { labelKey: 'mobileNav.inspections', path: `/projects/${projectId}/inspections`, icon: <AssignmentIcon /> },
  { labelKey: 'mobileNav.checklists', path: `/projects/${projectId}/checklists`, icon: <ChecklistIcon /> },
  { labelKey: 'mobileNav.defects', path: `/projects/${projectId}/defects`, icon: <ReportProblemIcon /> },
  { labelKey: 'mobileNav.menu', path: '', icon: <MenuIcon />, action: 'menu' },
]

interface MobileBottomNavProps {
  projectId?: string
  onMenuOpen?: () => void
}

export default function MobileBottomNav({ projectId, onMenuOpen }: MobileBottomNavProps) {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()

  const tabs = projectId ? projectTabs(projectId) : globalTabs

  const getActiveTab = () => {
    const activeIndex = tabs.findIndex((tab) => {
      if (tab.action === 'menu') return false
      if (!tab.path) return false
      return location.pathname === tab.path || location.pathname.startsWith(tab.path + '/')
    })
    return activeIndex >= 0 ? activeIndex : -1
  }

  const handleNavigation = (index: number) => {
    const tab = tabs[index]
    if (tab.action === 'menu') {
      onMenuOpen?.()
      return
    }
    navigate(tab.path)
  }

  return (
    <Paper
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1200,
        borderTop: '1px solid',
        borderColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(242, 140, 38, 0.15)' : 'divider',
        display: { xs: 'block', md: 'none' },
        bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(26, 22, 18, 0.9)' : 'background.paper',
        backdropFilter: 'blur(24px)',
        boxShadow: '0 -4px 30px rgba(0, 0, 0, 0.15)',
      }}
      elevation={0}
    >
      <BottomNavigation
        value={getActiveTab()}
        onChange={(_, newValue) => handleNavigation(newValue)}
        showLabels
        sx={{
          height: 64,
          '& .MuiBottomNavigationAction-root': {
            minWidth: 'auto',
            padding: '6px 0',
            transition: 'color 200ms ease-out',
            '&.Mui-selected': {
              color: 'primary.main',
              '& .MuiBottomNavigationAction-label': {
                fontWeight: 600,
                fontSize: '0.7rem',
              },
            },
            '&:focus-visible': {
              outline: (theme) => `2px solid ${theme.palette.primary.main}`,
              outlineOffset: -2,
              borderRadius: 1,
            },
          },
          '& .MuiBottomNavigationAction-label': {
            fontSize: '0.65rem',
            fontWeight: 500,
            marginTop: '2px',
          },
        }}
      >
        {tabs.map((tab) => (
          <BottomNavigationAction
            key={tab.labelKey}
            label={t(tab.labelKey)}
            icon={tab.icon}
            aria-label={tab.action === 'menu' ? t('common.openNavMenu') : undefined}
          />
        ))}
      </BottomNavigation>
    </Paper>
  )
}
