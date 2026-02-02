import { useState, useEffect } from 'react'
import { Outlet, useParams, useNavigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import Toolbar from '@mui/material/Toolbar'
import CircularProgress from '@mui/material/CircularProgress'
import Sidebar from './Sidebar'
import Header from './Header'
import { projectsApi } from '../../api/projects'
import { authApi } from '../../api/auth'
import { rfiApi } from '../../api/rfi'
import type { Project, User } from '../../types'

const DRAWER_WIDTH = 260

export default function Layout() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>(projectId)
  const [projects, setProjects] = useState<Project[]>([])
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [rfiCount, setRfiCount] = useState(0)

  useEffect(() => {
    loadUserAndProjects()
  }, [])

  useEffect(() => {
    if (selectedProjectId) {
      loadRfiCount(selectedProjectId)
    } else {
      setRfiCount(0)
    }
  }, [selectedProjectId])

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

  const loadRfiCount = async (projectId: string) => {
    try {
      const summary = await rfiApi.getSummary(projectId)
      const pendingCount = summary.open_count + summary.waiting_response_count
      setRfiCount(pendingCount)
    } catch (error) {
      console.error('Failed to load RFI count:', error)
      setRfiCount(0)
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
      />
      <Sidebar projectId={selectedProjectId} rfiBadgeCount={rfiCount} />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          ml: `${DRAWER_WIDTH}px`,
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
