import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import BottomNavigation from '@mui/material/BottomNavigation'
import BottomNavigationAction from '@mui/material/BottomNavigationAction'
import Paper from '@mui/material/Paper'
import HomeIcon from '@mui/icons-material/Home'
import AssignmentIcon from '@mui/icons-material/Assignment'
import FolderIcon from '@mui/icons-material/Folder'
import PersonIcon from '@mui/icons-material/Person'

interface NavTab {
  labelKey: string
  path: string
  icon: React.ReactNode
}

const navTabs: NavTab[] = [
  { labelKey: 'mobileNav.home', path: '/inspector-dashboard', icon: <HomeIcon /> },
  { labelKey: 'mobileNav.inspections', path: '/inspections', icon: <AssignmentIcon /> },
  { labelKey: 'mobileNav.projects', path: '/projects', icon: <FolderIcon /> },
  { labelKey: 'mobileNav.profile', path: '/profile', icon: <PersonIcon /> },
]

interface MobileBottomNavProps {
  projectId?: string
}

export default function MobileBottomNav({ projectId }: MobileBottomNavProps) {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()

  const getActiveTab = () => {
    const activeIndex = navTabs.findIndex((tab) => {
      if (tab.path === '/inspector-dashboard') {
        return location.pathname === '/inspector-dashboard'
      }
      if (tab.path === '/projects') {
        return location.pathname === '/projects'
      }
      if (tab.path === '/inspections') {
        return (
          location.pathname === '/inspections' ||
          location.pathname.startsWith('/inspections/')
        )
      }
      if (tab.path === '/profile') {
        return location.pathname.startsWith('/profile')
      }
      return false
    })
    return activeIndex >= 0 ? activeIndex : 0
  }

  const handleNavigation = (path: string) => {
    if (path === '/inspections' && projectId) {
      navigate(`/projects/${projectId}/inspections`)
    } else {
      navigate(path)
    }
  }

  return (
    <Paper
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        borderTop: '1px solid',
        borderColor: 'divider',
      }}
      elevation={3}
    >
      <BottomNavigation
        value={getActiveTab()}
        onChange={(_, newValue) => {
          handleNavigation(navTabs[newValue].path)
        }}
        showLabels
        sx={{
          height: 64,
          '& .MuiBottomNavigationAction-root': {
            minWidth: 'auto',
            padding: '6px 0',
            transition: 'all 200ms ease-out',
            '&.Mui-selected': {
              color: 'primary.main',
              '& .MuiBottomNavigationAction-label': {
                fontWeight: 600,
                fontSize: '0.75rem',
              },
            },
          },
          '& .MuiBottomNavigationAction-label': {
            fontSize: '0.7rem',
            fontWeight: 500,
            marginTop: '4px',
          },
        }}
      >
        {navTabs.map((tab) => (
          <BottomNavigationAction
            key={tab.path}
            label={t(tab.labelKey)}
            icon={tab.icon}
          />
        ))}
      </BottomNavigation>
    </Paper>
  )
}
