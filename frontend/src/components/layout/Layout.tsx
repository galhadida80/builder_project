import { useState, useEffect, useCallback } from 'react'
import { Outlet, useParams, useNavigate, useLocation } from 'react-router-dom'
import Box from '@mui/material/Box'
import Toolbar from '@mui/material/Toolbar'
import CircularProgress from '@mui/material/CircularProgress'
import Fab from '@mui/material/Fab'
import SmartToyIcon from '@mui/icons-material/SmartToy'
import { TransitionGroup } from 'react-transition-group'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'
import IconButton from '@mui/material/IconButton'
import MenuIcon from '@mui/icons-material/Menu'
import Sidebar from './Sidebar'
import Header from './Header'
import PageTransition from '../common/PageTransition'
import ChatDrawer from '../chat/ChatDrawer'
import { projectsApi } from '../../api/projects'
import { authApi } from '../../api/auth'
import type { Project, User } from '../../types'

const DRAWER_WIDTH = 260

export default function Layout() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>(projectId)
  const [projects, setProjects] = useState<Project[]>([])
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [chatOpen, setChatOpen] = useState(false)
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))

  const handleDrawerToggle = useCallback(() => {
    setMobileDrawerOpen(prev => !prev)
  }, [])

  useEffect(() => {
    loadUserAndProjects()
  }, [])

  const loadUserAndProjects = async () => {
    try {
      const user = await authApi.getCurrentUser()
      setCurrentUser(user)
      await loadProjects()
    } catch (error) {
      console.error('Failed to load user:', error)
      localStorage.removeItem('authToken')
      localStorage.removeItem('userId')
      navigate('/login')
    } finally {
      setLoading(false)
    }
  }

  const loadProjects = async () => {
    try {
      const data = await projectsApi.list()
      setProjects(data)
    } catch (error) {
      console.error('Failed to load projects:', error)
    }
  }

  const currentProject = projects.find(p => p.id === selectedProjectId)

  const handleProjectChange = (newProjectId: string) => {
    setSelectedProjectId(newProjectId)
    navigate(`/projects/${newProjectId}`)
  }

  const handleLogout = () => {
    localStorage.removeItem('authToken')
    localStorage.removeItem('userId')
    navigate('/login')
  }

  if (loading || !currentUser) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Header
        user={currentUser}
        currentProject={currentProject}
        projects={projects}
        onProjectChange={handleProjectChange}
        onLogout={handleLogout}
        onMenuToggle={handleDrawerToggle}
        isMobile={isMobile}
      />
      <Sidebar
        projectId={selectedProjectId}
        mobileOpen={mobileDrawerOpen}
        onMobileClose={() => setMobileDrawerOpen(false)}
        isMobile={isMobile}
      />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          ml: { xs: 0, md: `${DRAWER_WIDTH}px` },
          bgcolor: 'background.default',
          minHeight: '100vh',
        }}
      >
        <Toolbar />
        <Box sx={{ position: 'relative', minHeight: '500px' }}>
          <TransitionGroup component={null}>
            <PageTransition key={location.pathname}>
              <Box
                sx={{
                  position: 'absolute',
                  width: '100%',
                  top: 0,
                  left: 0,
                }}
              >
                <Outlet context={{ projectId: selectedProjectId, project: currentProject }} />
              </Box>
            </PageTransition>
          </TransitionGroup>
        </Box>
      </Box>

      {selectedProjectId && (
        <>
          <Fab
            color="primary"
            aria-label="Open AI assistant chat"
            onClick={() => setChatOpen(true)}
            sx={{
              position: 'fixed',
              bottom: 24,
              right: 24,
              zIndex: 1100,
              display: chatOpen ? 'none' : 'flex',
            }}
          >
            <SmartToyIcon />
          </Fab>
          <ChatDrawer
            open={chatOpen}
            onClose={() => setChatOpen(false)}
            projectId={selectedProjectId}
          />
        </>
      )}
    </Box>
  )
}
