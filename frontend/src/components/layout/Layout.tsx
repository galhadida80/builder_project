import { useState, useEffect } from 'react'
import { Outlet, useParams, useNavigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import Toolbar from '@mui/material/Toolbar'
import Sidebar from './Sidebar'
import Header from './Header'
import { projectsApi } from '../../api/projects'
import type { Project, User } from '../../types'

const DRAWER_WIDTH = 260

const defaultUser: User = {
  id: '1',
  email: 'user@example.com',
  fullName: 'Current User',
  role: 'contractor',
  isActive: true,
  createdAt: new Date().toISOString()
}

export default function Layout() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>(projectId)
  const [projects, setProjects] = useState<Project[]>([])
  const [currentUser] = useState<User>(defaultUser)

  useEffect(() => {
    loadProjects()
  }, [])

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
    navigate('/login')
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
      <Sidebar projectId={selectedProjectId} />
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
