import { useState, useEffect, useCallback } from 'react'
import { Outlet, useParams, useNavigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import Toolbar from '@mui/material/Toolbar'
import CircularProgress from '@mui/material/CircularProgress'
import Sidebar from './Sidebar'
import Header from './Header'
import { projectsApi } from '../../api/projects'
import { authApi } from '../../api/auth'
import { useSwipeGesture } from '../../hooks/useSwipeGesture'
import type { Project, User } from '../../types'

const DRAWER_WIDTH = 260
const EDGE_SWIPE_THRESHOLD = 20 // px from edge to trigger swipe

export default function Layout() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>(projectId)
  const [projects, setProjects] = useState<Project[]>([])
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(true)

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

  /**
   * Handle swipe gestures for sidebar toggle
   * Opens sidebar on swipe-in from left edge (LTR) or right edge (RTL)
   * Closes sidebar on swipe-out
   */
  const handleSidebarSwipeLeft = useCallback(() => {
    // In LTR mode, swiping left closes the sidebar
    // In RTL mode, swiping left means swiping right physically, which opens sidebar
    setSidebarOpen(false)
  }, [])

  const handleSidebarSwipeRight = useCallback(() => {
    // In LTR mode, swiping right opens the sidebar
    // In RTL mode, swiping right means swiping left physically, which closes sidebar
    setSidebarOpen(true)
  }, [])


  const { onTouchStart: mainTouchStart, onTouchMove: mainTouchMove, onTouchEnd: mainTouchEnd, isRTL } = useSwipeGesture({
    onSwipeLeft: handleSidebarSwipeLeft,
    onSwipeRight: handleSidebarSwipeRight,
    minDistance: 30, // Slightly lower threshold for sidebar swipes
    angleThreshold: 30,
    debug: false,
  })

  /**
   * Wrap touch handlers with edge detection
   */
  const handleMainTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0]
    if (!touch) return

    const touchX = touch.clientX
    const isNearLeftEdge = touchX < EDGE_SWIPE_THRESHOLD
    const isNearRightEdge = touchX > window.innerWidth - EDGE_SWIPE_THRESHOLD

    // Only process swipes from the edges
    if (isNearLeftEdge || isNearRightEdge) {
      mainTouchStart(e)
    }
  }, [mainTouchStart])

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
        sidebarOpen={sidebarOpen}
        onSidebarToggle={() => setSidebarOpen(!sidebarOpen)}
      />
      <Sidebar projectId={selectedProjectId} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          ml: `${DRAWER_WIDTH}px`,
          bgcolor: 'background.default',
          minHeight: '100vh',
          position: 'relative',
          touchAction: 'manipulation',
          // Swipe-friendly touch target at the left/right edges
          '&::before': {
            content: '""',
            position: 'absolute',
            left: 0,
            top: 0,
            width: `${EDGE_SWIPE_THRESHOLD}px`,
            height: '100%',
            zIndex: 1,
          },
          '&::after': {
            content: '""',
            position: 'absolute',
            right: 0,
            top: 0,
            width: `${EDGE_SWIPE_THRESHOLD}px`,
            height: '100%',
            zIndex: 1,
          },
        }}
        onTouchStart={handleMainTouchStart}
        onTouchMove={mainTouchMove}
        onTouchEnd={mainTouchEnd}
      >
        <Toolbar />
        <Outlet context={{ projectId: selectedProjectId, project: currentProject }} />
      </Box>
    </Box>
  )
}
