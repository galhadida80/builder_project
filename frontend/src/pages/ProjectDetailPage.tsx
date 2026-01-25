import { useParams, useNavigate, Outlet } from 'react-router-dom'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Chip from '@mui/material/Chip'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'
import LinearProgress from '@mui/material/LinearProgress'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import EditIcon from '@mui/icons-material/Edit'
import LocationOnIcon from '@mui/icons-material/LocationOn'
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
import GroupIcon from '@mui/icons-material/Group'
import { mockProjects, mockEquipment, mockMaterials, mockMeetings } from '../mocks/data'

const tabs = [
  { label: 'Overview', path: '' },
  { label: 'Equipment', path: 'equipment' },
  { label: 'Materials', path: 'materials' },
  { label: 'Meetings', path: 'meetings' },
  { label: 'Approvals', path: 'approvals' },
  { label: 'Areas', path: 'areas' },
  { label: 'Contacts', path: 'contacts' },
]

export default function ProjectDetailPage() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const project = mockProjects.find(p => p.id === projectId)

  const currentPath = window.location.pathname.split('/').pop() || ''
  const currentTabIndex = tabs.findIndex(t => t.path === currentPath) || 0

  if (!project) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography variant="h6">Project not found</Typography>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/projects')} sx={{ mt: 2 }}>
          Back to Projects
        </Button>
      </Box>
    )
  }

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    const tab = tabs[newValue]
    navigate(`/projects/${projectId}${tab.path ? `/${tab.path}` : ''}`)
  }

  const projectEquipment = mockEquipment.filter(e => e.projectId === projectId)
  const projectMaterials = mockMaterials.filter(m => m.projectId === projectId)
  const projectMeetings = mockMeetings.filter(m => m.projectId === projectId)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success'
      case 'on_hold': return 'warning'
      case 'completed': return 'info'
      default: return 'default'
    }
  }

  const isOverview = currentTabIndex === 0

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/projects')} color="inherit">
          Projects
        </Button>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
            <Typography variant="h4" fontWeight="bold">
              {project.name}
            </Typography>
            <Chip label={project.code} size="small" />
            <Chip label={project.status} color={getStatusColor(project.status) as 'success' | 'warning' | 'info' | 'default'} size="small" sx={{ textTransform: 'capitalize' }} />
          </Box>
          {project.description && (
            <Typography variant="body1" color="text.secondary">
              {project.description}
            </Typography>
          )}
        </Box>
        <Button variant="outlined" startIcon={<EditIcon />}>
          Edit Project
        </Button>
      </Box>

      <Tabs value={currentTabIndex} onChange={handleTabChange} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
        {tabs.map((tab) => (
          <Tab key={tab.path} label={tab.label} />
        ))}
      </Tabs>

      {isOverview ? (
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>Project Details</Typography>
                <Grid container spacing={2}>
                  {project.address && (
                    <Grid item xs={12}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LocationOnIcon color="action" />
                        <Typography>{project.address}</Typography>
                      </Box>
                    </Grid>
                  )}
                  <Grid item xs={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CalendarTodayIcon color="action" />
                      <Box>
                        <Typography variant="caption" color="text.secondary">Start Date</Typography>
                        <Typography>{project.startDate ? new Date(project.startDate).toLocaleDateString() : 'Not set'}</Typography>
                      </Box>
                    </Box>
                  </Grid>
                  <Grid item xs={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CalendarTodayIcon color="action" />
                      <Box>
                        <Typography variant="caption" color="text.secondary">End Date</Typography>
                        <Typography>{project.estimatedEndDate ? new Date(project.estimatedEndDate).toLocaleDateString() : 'Not set'}</Typography>
                      </Box>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Progress Overview</Typography>
                {['Foundation', 'Structure', 'MEP', 'Finishing'].map((phase, i) => {
                  const progress = [100, 75, 40, 10][i]
                  return (
                    <Box key={phase} sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="body2">{phase}</Typography>
                        <Typography variant="body2" color="text.secondary">{progress}%</Typography>
                      </Box>
                      <LinearProgress variant="determinate" value={progress} sx={{ height: 8, borderRadius: 4 }} />
                    </Box>
                  )
                })}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>Quick Stats</Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1, borderBottom: 1, borderColor: 'divider' }}>
                  <Typography color="text.secondary">Equipment</Typography>
                  <Typography fontWeight="bold">{projectEquipment.length}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1, borderBottom: 1, borderColor: 'divider' }}>
                  <Typography color="text.secondary">Materials</Typography>
                  <Typography fontWeight="bold">{projectMaterials.length}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1, borderBottom: 1, borderColor: 'divider' }}>
                  <Typography color="text.secondary">Meetings</Typography>
                  <Typography fontWeight="bold">{projectMeetings.length}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1 }}>
                  <Typography color="text.secondary">Pending Approvals</Typography>
                  <Typography fontWeight="bold" color="warning.main">
                    {projectEquipment.filter(e => e.status !== 'approved' && e.status !== 'draft').length +
                     projectMaterials.filter(m => m.status !== 'approved' && m.status !== 'draft').length}
                  </Typography>
                </Box>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">Team</Typography>
                  <GroupIcon color="action" />
                </Box>
                <Typography variant="body2" color="text.secondary">
                  5 team members assigned to this project
                </Typography>
                <Button size="small" sx={{ mt: 1 }}>View Team</Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      ) : (
        <Outlet />
      )}
    </Box>
  )
}
