import { useState, useEffect, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Outlet, useParams, useNavigate, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import ChatDrawer from '../chat/ChatDrawer'
import { projectsApi } from '../../api/projects'
import { useAuth } from '../../contexts/AuthContext'
import type { Project } from '../../types'
import { SmartToyIcon, MenuIcon } from '@/icons'
import { Box, Toolbar, CircularProgress, Fab, useMediaQuery, IconButton } from '@/mui'
import { useTheme } from '@/mui'

const DRAWER_WIDTH = 260

export default function Layout() {
  const { t } = useTranslation()
  const { projectId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { user: currentUser, logout } = useAuth()
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>(projectId)

  useEffect(() => {
    const match = location.pathname.match(/\/projects\/([^/]+)/)
    const urlProjectId = match ? match[1] : undefined
    if (urlProjectId !== selectedProjectId) {
      setSelectedProjectId(urlProjectId)
    }
  }, [location.pathname])
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

  const outletContext = useMemo(
    () => ({ projectId: selectedProjectId, project: currentProject }),
    [selectedProjectId, currentProject]
  )

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
          bgcolor: 'background.default',
          minHeight: '100vh',
        }}
      >
        <Toolbar />
        <Outlet context={outletContext} />
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
