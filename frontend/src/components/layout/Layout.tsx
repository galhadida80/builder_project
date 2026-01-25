import { useState } from 'react'
import { Outlet, useParams, useNavigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import Toolbar from '@mui/material/Toolbar'
import Sidebar from './Sidebar'
import Header from './Header'
import { mockProjects, currentUser } from '../../mocks/data'

const DRAWER_WIDTH = 260

export default function Layout() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>(projectId)

  const currentProject = mockProjects.find(p => p.id === selectedProjectId)

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
        projects={mockProjects}
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
