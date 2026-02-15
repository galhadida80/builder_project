import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Outlet, useParams, useNavigate } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import ChatDrawer from '../chat/ChatDrawer'
import { projectsApi } from '../../api/projects'
import { useAuth } from '../../contexts/AuthContext'
import { useProject } from '../../contexts/ProjectContext'
import type { Project } from '../../types'
import { SmartToyIcon } from '@/icons'
import { Box, Toolbar, CircularProgress, Fab, useMediaQuery } from '@/mui'
import { useTheme } from '@/mui'

export default function Layout() {
  const { t } = useTranslation()
  const { projectId } = useParams()
  const navigate = useNavigate()
  const { user: currentUser, logout } = useAuth()
  const { setSelectedProjectId } = useProject()
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
    if (projectId) {
      setSelectedProjectId(projectId)
    }
  }, [projectId, setSelectedProjectId])

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

  const currentProject = projects.find(p => p.id === projectId)

  const handleProjectChange = useCallback((newProjectId: string) => {
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
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100dvh' }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100dvh' }}>
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
        projectId={projectId}
        mobileOpen={mobileDrawerOpen}
        onMobileClose={handleMobileClose}
        isMobile={isMobile}
      />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 1, sm: 1.5, md: 2 },
          bgcolor: 'background.default',
          minHeight: '100dvh',
          maxWidth: '100%',
          minWidth: 0,
        }}
      >
        <Toolbar />
        <Outlet />
      </Box>

      {projectId && (
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
            projectId={projectId}
          />
        </>
      )}
    </Box>
  )
}
