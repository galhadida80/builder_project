import { useState, useEffect } from 'react'
import { Outlet, useParams, useNavigate, useLocation } from 'react-router-dom'
import Box from '@mui/material/Box'
import Toolbar from '@mui/material/Toolbar'
import CircularProgress from '@mui/material/CircularProgress'
import useTheme from '@mui/material/styles/useTheme'
import useMediaQuery from '@mui/material/useMediaQuery'
import Sidebar from './Sidebar'
import Header from './Header'
import { projectsApi } from '../../api/projects'
import { authApi } from '../../api/auth'
import type { Project, User } from '../../types'

const DRAWER_WIDTH = 260

export default function Layout() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const theme = useTheme()
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'))
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>(projectId)
  const [projects, setProjects] = useState<Project[]>([])
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)

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

  const handleMobileDrawerToggle = () => {
    setMobileDrawerOpen(!mobileDrawerOpen)
  }

  const handleMobileDrawerClose = () => {
    setMobileDrawerOpen(false)
  }

  // Close drawer when navigating on mobile
  useEffect(() => {
    if (!isDesktop) {
      handleMobileDrawerClose()
    }
  }, [location.pathname, isDesktop])

  // Close drawer when resizing to desktop
  useEffect(() => {
    if (isDesktop) {
      handleMobileDrawerClose()
    }
  }, [isDesktop])

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
        onMobileMenuClick={handleMobileDrawerToggle}
      />
      <Sidebar
        projectId={selectedProjectId}
        mobileOpen={mobileDrawerOpen}
        onMobileClose={handleMobileDrawerClose}
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
        <Outlet context={{ projectId: selectedProjectId, project: currentProject }} />
      </Box>
    </Box>
  )
}
