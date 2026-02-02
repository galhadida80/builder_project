import { useState, useEffect } from 'react'
import { useParams, useNavigate, Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Skeleton from '@mui/material/Skeleton'
import IconButton from '@mui/material/IconButton'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import EditIcon from '@mui/icons-material/Edit'
import LocationOnIcon from '@mui/icons-material/LocationOn'
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
import GroupIcon from '@mui/icons-material/Group'
import ConstructionIcon from '@mui/icons-material/Construction'
import InventoryIcon from '@mui/icons-material/Inventory'
import EventIcon from '@mui/icons-material/Event'
import TaskAltIcon from '@mui/icons-material/TaskAlt'
import AccountTreeIcon from '@mui/icons-material/AccountTree'
import ContactsIcon from '@mui/icons-material/Contacts'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import EmailIcon from '@mui/icons-material/Email'
import AssignmentIcon from '@mui/icons-material/Assignment'
import { Card, KPICard } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { StatusBadge } from '../components/ui/StatusBadge'
import { Tabs } from '../components/ui/Tabs'
import { CircularProgressDisplay } from '../components/ui/ProgressBar'
import { EmptyState } from '../components/ui/EmptyState'
import { projectsApi } from '../api/projects'
import { equipmentApi } from '../api/equipment'
import { materialsApi } from '../api/materials'
import { meetingsApi } from '../api/meetings'
import type { Project, Equipment, Material, Meeting } from '../types'

const tabsConfig = [
  { labelKey: 'projects.overview', value: '', icon: <TrendingUpIcon sx={{ fontSize: 18 }} /> },
  { labelKey: 'equipment.title', value: 'equipment', icon: <ConstructionIcon sx={{ fontSize: 18 }} /> },
  { labelKey: 'materials.title', value: 'materials', icon: <InventoryIcon sx={{ fontSize: 18 }} /> },
  { labelKey: 'meetings.title', value: 'meetings', icon: <EventIcon sx={{ fontSize: 18 }} /> },
  { labelKey: 'approvals.title', value: 'approvals', icon: <TaskAltIcon sx={{ fontSize: 18 }} /> },
  { labelKey: 'areas.title', value: 'areas', icon: <AccountTreeIcon sx={{ fontSize: 18 }} /> },
  { labelKey: 'contacts.title', value: 'contacts', icon: <ContactsIcon sx={{ fontSize: 18 }} /> },
  { labelKey: 'inspections.title', value: 'inspections', icon: <AssignmentIcon sx={{ fontSize: 18 }} /> },
  { labelKey: 'rfis.title', value: 'rfis', icon: <EmailIcon sx={{ fontSize: 18 }} /> },
]

export default function ProjectDetailPage() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [project, setProject] = useState<Project | null>(null)
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [materials, setMaterials] = useState<Material[]>([])
  const [meetings, setMeetings] = useState<Meeting[]>([])

  const currentPath = window.location.pathname.split('/').pop() || ''
  const currentTab = tabsConfig.find(t => t.value === currentPath)?.value || ''

  useEffect(() => {
    loadProjectData()
  }, [projectId])

  const loadProjectData = async () => {
    if (!projectId) return
    try {
      setLoading(true)
      const [projectData, equipmentData, materialsData, meetingsData] = await Promise.all([
        projectsApi.get(projectId).catch(() => null),
        equipmentApi.list(projectId).catch(() => []),
        materialsApi.list(projectId).catch(() => []),
        meetingsApi.list(projectId).catch(() => [])
      ])
      setProject(projectData)
      setEquipment(equipmentData)
      setMaterials(materialsData)
      setMeetings(meetingsData)
    } catch {
      // Error handled silently
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton variant="text" width={120} height={32} sx={{ mb: 2 }} />
        <Skeleton variant="text" width={300} height={48} sx={{ mb: 1 }} />
        <Skeleton variant="text" width={450} height={24} sx={{ mb: 4 }} />
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2, mb: 4 }}>
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} variant="rounded" height={100} sx={{ borderRadius: 3 }} />
          ))}
        </Box>
        <Skeleton variant="rounded" height={400} sx={{ borderRadius: 3 }} />
      </Box>
    )
  }

  if (!project) {
    return (
      <Box sx={{ p: 3 }}>
        <EmptyState
          variant="not-found"
          title={t('projects.notFound')}
          description={t('projects.notFoundMessage')}
          action={{ label: t('projects.backToProjects'), onClick: () => navigate('/projects') }}
        />
      </Box>
    )
  }

  const handleTabChange = (value: string) => {
    navigate(`/projects/${projectId}${value ? `/${value}` : ''}`)
  }

  const pendingApprovals = equipment.filter(e => e.status !== 'approved' && e.status !== 'draft').length +
    materials.filter(m => m.status !== 'approved' && m.status !== 'draft').length

  const isOverview = currentTab === ''

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <IconButton onClick={() => navigate('/projects')} size="small">
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="body2" color="text.secondary">
          {t('projects.backToProjects')}
        </Typography>
      </Box>

      <Card sx={{ mb: 4 }}>
        <Box
          sx={{
            p: 3,
            background: (theme) =>
              theme.palette.mode === 'dark'
                ? 'linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)'
                : 'linear-gradient(135deg, #0369A1 0%, #0F172A 100%)',
            borderRadius: 3,
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                <Typography variant="h4" fontWeight={700} color="white">
                  {project.name}
                </Typography>
                <Chip
                  label={project.code}
                  size="small"
                  sx={{
                    bgcolor: 'rgba(255,255,255,0.2)',
                    color: 'white',
                    fontWeight: 600,
                  }}
                />
                <StatusBadge status={project.status} />
              </Box>
              {project.description && (
                <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.8)', mb: 2, maxWidth: 600 }}>
                  {project.description}
                </Typography>
              )}
              <Box sx={{ display: 'flex', gap: 4, mt: 2 }}>
                {project.address && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LocationOnIcon sx={{ fontSize: 18, color: 'rgba(255,255,255,0.7)' }} />
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                      {project.address}
                    </Typography>
                  </Box>
                )}
                {project.startDate && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CalendarTodayIcon sx={{ fontSize: 18, color: 'rgba(255,255,255,0.7)' }} />
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                      {new Date(project.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      {project.estimatedEndDate && ` - ${new Date(project.estimatedEndDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>
            <Button variant="secondary" icon={<EditIcon />} sx={{ bgcolor: 'rgba(255,255,255,0.1)', color: 'white', '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' } }}>
              {t('projects.editProject')}
            </Button>
          </Box>
        </Box>
      </Card>

      <Box sx={{ mb: 4 }}>
        <Tabs
          items={tabsConfig.map(tab => ({ label: t(tab.labelKey), value: tab.value }))}
          value={currentTab}
          onChange={handleTabChange}
          variant="scrollable"
        />
      </Box>

      {isOverview ? (
        <Box>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
              gap: 2,
              mb: 4,
            }}
          >
            <KPICard
              title={t('projects.equipmentCount')}
              value={equipment.length}
              icon={<ConstructionIcon />}
              color="primary"
              onClick={() => handleTabChange('equipment')}
            />
            <KPICard
              title={t('projects.materialsCount')}
              value={materials.length}
              icon={<InventoryIcon />}
              color="warning"
              onClick={() => handleTabChange('materials')}
            />
            <KPICard
              title={t('projects.meetingsCount')}
              value={meetings.length}
              icon={<EventIcon />}
              color="info"
              onClick={() => handleTabChange('meetings')}
            />
            <KPICard
              title={t('projects.pendingApprovals')}
              value={pendingApprovals}
              icon={<WarningAmberIcon />}
              color={pendingApprovals > 0 ? 'error' : 'success'}
              onClick={() => handleTabChange('approvals')}
            />
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' }, gap: 3 }}>
            <Card>
              <Box sx={{ p: 3 }}>
                <Typography variant="h6" fontWeight={600} sx={{ mb: 3 }}>
                  {t('projects.projectProgress')}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 4 }}>
                  <Box sx={{ textAlign: 'center' }}>
                    <CircularProgressDisplay value={67} size={140} thickness={8} showLabel />
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                      {t('projects.overallCompletion')}
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2, mt: 2 }}>
                  <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
                    <Typography variant="h5" fontWeight={700} color="success.main">45</Typography>
                    <Typography variant="caption" color="text.secondary">{t('projects.completedTasks')}</Typography>
                  </Box>
                  <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
                    <Typography variant="h5" fontWeight={700} color="info.main">12</Typography>
                    <Typography variant="caption" color="text.secondary">{t('projects.inProgress')}</Typography>
                  </Box>
                  <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
                    <Typography variant="h5" fontWeight={700} color="warning.main">8</Typography>
                    <Typography variant="caption" color="text.secondary">{t('projects.pending')}</Typography>
                  </Box>
                </Box>
              </Box>
            </Card>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Card>
                <Box sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6" fontWeight={600}>{t('projects.quickStats')}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <ConstructionIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary">{t('equipment.title')}</Typography>
                      </Box>
                      <Typography variant="body2" fontWeight={600}>{equipment.length}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <InventoryIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary">{t('materials.title')}</Typography>
                      </Box>
                      <Typography variant="body2" fontWeight={600}>{materials.length}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <EventIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary">{t('meetings.title')}</Typography>
                      </Box>
                      <Typography variant="body2" fontWeight={600}>{meetings.length}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <WarningAmberIcon sx={{ fontSize: 18, color: pendingApprovals > 0 ? 'warning.main' : 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary">{t('projects.pendingApprovals')}</Typography>
                      </Box>
                      <Chip
                        label={pendingApprovals}
                        size="small"
                        color={pendingApprovals > 0 ? 'warning' : 'default'}
                        sx={{ fontWeight: 600 }}
                      />
                    </Box>
                  </Box>
                </Box>
              </Card>

              <Card>
                <Box sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6" fontWeight={600}>{t('projects.team')}</Typography>
                    <GroupIcon sx={{ color: 'text.secondary' }} />
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {t('projects.teamMembersDescription')}
                  </Typography>
                  <Button variant="secondary" size="small" onClick={() => handleTabChange('contacts')}>
                    {t('projects.viewTeam')}
                  </Button>
                </Box>
              </Card>
            </Box>
          </Box>
        </Box>
      ) : (
        <Outlet />
      )}
    </Box>
  )
}
