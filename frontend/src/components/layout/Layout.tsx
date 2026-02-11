import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
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
import { useAuth } from '../../contexts/AuthContext'
import type { Project } from '../../types'

const DRAWER_WIDTH = 260

export default function Layout() {
  const { t } = useTranslation()
  const { projectId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { user: currentUser, logout } = useAuth()
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>(projectId)
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [chatOpen, setChatOpen] = useState(false)
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))

  const handleDrawerToggle = useCallback(() => {
    setMobileDrawerOpen(prev => !prev)
  }, [])

  useEffect(() => {
    loadProjects()
  }, [])

  const loadProjects = async () => {
    try {
      const data = await projectsApi.list()
      setProjects(data)
    } catch (error) {
      console.error('Failed to load projects:', error)
    } finally {
      setLoading(false)
    }
  }

  const currentProject = projects.find(p => p.id === selectedProjectId)

  const handleProjectChange = useCallback((newProjectId: string) => {
    setSelectedProjectId(newProjectId)
    navigate(`/projects/${newProjectId}`)
  }, [navigate])

  const handleLogout = useCallback(() => {
    logout()
  }, [logout])

  const handleChatOpen = useCallback(() => setChatOpen(true), [])
  const handleChatClose = useCallback(() => setChatOpen(false), [])
  const handleMobileClose = useCallback(() => setMobileDrawerOpen(false), [])

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
        onMobileClose={handleMobileClose}
        isMobile={isMobile}
      />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 1, md: 2 },
          ml: { xs: 0, md: `${DRAWER_WIDTH}px` },
          bgcolor: 'background.default',
          minHeight: '100vh',
        }}
      >
        <Toolbar />
        <Box sx={{ position: 'relative', minHeight: '400px' }}>
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
            aria-label={t('common.openAIChat')}
            onClick={handleChatOpen}
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
            onClose={handleChatClose}
            projectId={selectedProjectId}
          />
        </>
      )}
    </Box>
  )
}
