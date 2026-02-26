import { useState, useCallback, useEffect, Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import { Outlet, useParams, useNavigate, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import MobileBottomNav from './MobileBottomNav'
import ChatDrawer from '../chat/ChatDrawer'
import { RouteProgressBar } from '../common/RouteProgressBar'
import PageTransition from '../common/PageTransition'
import { useAuth } from '../../contexts/AuthContext'
import { useProject } from '../../contexts/ProjectContext'
import { useRouteProgress } from '../../hooks/useRouteProgress'
import { LoadingPage } from '../common/LoadingPage'
import OnboardingTour from '../onboarding/OnboardingTour'
import { useOnboarding } from '../../hooks/useOnboarding'
import { SmartToyIcon } from '@/icons'
import { Box, Toolbar, CircularProgress, Fab, useMediaQuery } from '@/mui'
import { useTheme } from '@/mui'

export default function Layout() {
  const { t } = useTranslation()
  const { projectId } = useParams()
  const navigate = useNavigate()
  const { user: currentUser, logout } = useAuth()
  const { setSelectedProjectId, projects, projectsLoading } = useProject()
  const { isLoading, progress } = useRouteProgress()
  const [chatOpen, setChatOpen] = useState(false)
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)
  const { showTour, completeTour } = useOnboarding()
  const location = useLocation()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))

  useEffect(() => {
    if (!isMobile) {
      setMobileDrawerOpen(false)
    }
  }, [isMobile])

  const handleDrawerToggle = useCallback(() => {
    setMobileDrawerOpen(prev => !prev)
  }, [])

  useEffect(() => {
    if (projectId) {
      setSelectedProjectId(projectId)
    }
  }, [projectId, setSelectedProjectId])

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

  if (projectsLoading || !currentUser) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100dvh' }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100dvh' }}>
      <RouteProgressBar loading={isLoading} progress={progress} />
      <Header
        user={currentUser}
        currentProject={currentProject}
        projects={projects}
        onProjectChange={handleProjectChange}
        onLogout={handleLogout}
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
          pb: { xs: '80px', md: 2 },
          bgcolor: 'background.default',
          minHeight: '100dvh',
          width: { xs: '100%', md: `calc(100% - 260px)` },
          maxWidth: '100%',
          minWidth: 0,
          overflowX: 'hidden',
        }}
      >
        <Toolbar />
        <Suspense fallback={<LoadingPage />}>
          <PageTransition key={location.pathname}>
            <Box>
              <Outlet />
            </Box>
          </PageTransition>
        </Suspense>
      </Box>

      {isMobile && (
        <MobileBottomNav projectId={projectId} onMenuOpen={handleDrawerToggle} />
      )}

      <OnboardingTour open={showTour} onComplete={completeTour} />

      {projectId && (
        <>
          <Fab
            data-tour="chat"
            color="primary"
            aria-label={t('common.openAIChat')}
            onClick={handleChatOpen}
            sx={{
              position: 'fixed',
              bottom: { xs: 80, md: 24 },
              insetInlineEnd: { xs: 16, md: 24 },
              zIndex: 1100,
              display: chatOpen ? 'none' : 'flex',
              '&:focus-visible': {
                outline: (theme) => `2px solid ${theme.palette.primary.main}`,
                outlineOffset: 2,
              },
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
