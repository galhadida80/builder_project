import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useOutlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Card, KPICard } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { StatusBadge } from '../components/ui/StatusBadge'
import { CircularProgressDisplay } from '../components/ui/ProgressBar'
import { EmptyState } from '../components/ui/EmptyState'
import { projectsApi } from '../api/projects'
import { equipmentApi } from '../api/equipment'
import { materialsApi } from '../api/materials'
import { meetingsApi } from '../api/meetings'
import type { Project, Equipment, Material, Meeting } from '../types'
import { ArrowBackIcon, EditIcon, LocationOnIcon, CalendarTodayIcon, GroupIcon, ConstructionIcon, InventoryIcon, EventIcon, WarningAmberIcon } from '@/icons'
import { Box, Typography, Chip, Skeleton, IconButton } from '@/mui'

export default function ProjectDetailPage() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const outlet = useOutlet()
  const { t, i18n } = useTranslation()
  const [project, setProject] = useState<Project | null>(null)
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [materials, setMaterials] = useState<Material[]>([])
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const loadedProjectId = useRef<string | null>(null)

  const isOverview = !outlet
  const dateLocale = i18n.language === 'he' ? 'he-IL' : i18n.language === 'es' ? 'es-ES' : 'en-US'

  useEffect(() => {
    if (!projectId || projectId === loadedProjectId.current) return
    loadedProjectId.current = projectId
    projectsApi.get(projectId).then(setProject).catch(() => null)
  }, [projectId])

  useEffect(() => {
    if (!projectId || !isOverview) return
    Promise.all([
      equipmentApi.list(projectId).catch(() => []),
      materialsApi.list(projectId).catch(() => []),
      meetingsApi.list(projectId).catch(() => [])
    ]).then(([eq, mat, meet]) => {
      setEquipment(eq)
      setMaterials(mat)
      setMeetings(meet)
    })
  }, [projectId, isOverview])

  if (!project) {
    if (!loadedProjectId.current) {
      return (
        <Box sx={{ p: { xs: 1.5, md: 2 } }}>
          <Skeleton variant="text" width={120} height={32} sx={{ mb: 1.5 }} />
          <Skeleton variant="rounded" height={140} sx={{ borderRadius: 3, mb: 2.5 }} />
        </Box>
      )
    }
    return (
      <Box sx={{ p: { xs: 1.5, md: 2 } }}>
        <EmptyState
          variant="not-found"
          title={t('projectDetail.notFound')}
          description={t('projectDetail.notFoundDescription')}
          action={{ label: t('projectDetail.backToProjects'), onClick: () => navigate('/projects') }}
        />
      </Box>
    )
  }

  const approvedItems = equipment.filter(e => e.status === 'approved').length +
    materials.filter(m => m.status === 'approved').length
  const inProgressItems = equipment.filter(e => e.status === 'under_review' || e.status === 'submitted').length +
    materials.filter(m => m.status === 'under_review' || m.status === 'submitted').length
  const pendingItems = equipment.filter(e => e.status === 'draft').length +
    materials.filter(m => m.status === 'draft').length
  const totalItems = equipment.length + materials.length
  const completionPercent = totalItems > 0 ? Math.round((approvedItems / totalItems) * 100) : 0

  const pendingApprovals = inProgressItems

  const handleNavTo = (section: string) => {
    navigate(`/projects/${projectId}/${section}`)
  }

  return (
    <Box sx={{ p: { xs: 1.5, md: 2 } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <IconButton onClick={() => navigate('/projects')} size="small">
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="body2" color="text.secondary">
          {t('projectDetail.backToProjects')}
        </Typography>
      </Box>

      <Card sx={{ mb: 2.5 }}>
        <Box
          sx={{
            p: { xs: 2, md: 2.5 },
            background: (theme) =>
              theme.palette.mode === 'dark'
                ? 'linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)'
                : 'linear-gradient(135deg, #0369A1 0%, #0F172A 100%)',
            borderRadius: 3,
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                <Typography variant="h4" fontWeight={700} color="white" sx={{ fontSize: { xs: '1.5rem', sm: '2.125rem' } }}>
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
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: { xs: 1, sm: 4 }, mt: 2 }}>
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
                      {new Date(project.startDate).toLocaleDateString(dateLocale, { month: 'short', day: 'numeric', year: 'numeric' })}
                      {project.estimatedEndDate && ` - ${new Date(project.estimatedEndDate).toLocaleDateString(dateLocale, { month: 'short', day: 'numeric', year: 'numeric' })}`}
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>
            <Button variant="secondary" icon={<EditIcon />} sx={{ bgcolor: 'rgba(255,255,255,0.1)', color: 'white', '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' }, flexShrink: 0 }}>
              <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                {t('projectDetail.editProject')}
              </Box>
            </Button>
          </Box>
        </Box>
      </Card>

      {isOverview ? (
        <Box>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
              gap: 1.5,
              mb: 2.5,
            }}
          >
            <KPICard
              title={t('nav.equipment')}
              value={equipment.length}
              icon={<ConstructionIcon />}
              color="primary"
              onClick={() => handleNavTo('equipment')}
            />
            <KPICard
              title={t('nav.materials')}
              value={materials.length}
              icon={<InventoryIcon />}
              color="warning"
              onClick={() => handleNavTo('materials')}
            />
            <KPICard
              title={t('nav.meetings')}
              value={meetings.length}
              icon={<EventIcon />}
              color="info"
              onClick={() => handleNavTo('meetings')}
            />
            <KPICard
              title={t('projectDetail.pendingApprovals')}
              value={pendingApprovals}
              icon={<WarningAmberIcon />}
              color={pendingApprovals > 0 ? 'error' : 'success'}
              onClick={() => handleNavTo('approvals')}
            />
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 1.5 }}>
            <Card>
              <Box sx={{ p: { xs: 2, md: 2.5 } }}>
                <Typography variant="h6" fontWeight={600} sx={{ mb: 1.5 }}>
                  {t('projectDetail.projectProgress')}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 1.5 }}>
                  <Box sx={{ textAlign: 'center' }}>
                    <CircularProgressDisplay value={completionPercent} size={100} thickness={8} showLabel />
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      {t('projectDetail.overallCompletion')}
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, mt: 1 }}>
                  <Box sx={{ textAlign: 'center', p: 1.5, bgcolor: 'action.hover', borderRadius: 2 }}>
                    <Typography variant="h5" fontWeight={700} color="success.main">{approvedItems}</Typography>
                    <Typography variant="caption" color="text.secondary">{t('projectDetail.approved')}</Typography>
                  </Box>
                  <Box sx={{ textAlign: 'center', p: 1.5, bgcolor: 'action.hover', borderRadius: 2 }}>
                    <Typography variant="h5" fontWeight={700} color="info.main">{inProgressItems}</Typography>
                    <Typography variant="caption" color="text.secondary">{t('projectDetail.inReview')}</Typography>
                  </Box>
                  <Box sx={{ textAlign: 'center', p: 1.5, bgcolor: 'action.hover', borderRadius: 2 }}>
                    <Typography variant="h5" fontWeight={700} color="warning.main">{pendingItems}</Typography>
                    <Typography variant="caption" color="text.secondary">{t('projectDetail.draft')}</Typography>
                  </Box>
                </Box>
              </Box>
            </Card>

            <Card>
              <Box sx={{ p: { xs: 2, md: 2.5 } }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="h6" fontWeight={600}>{t('projectDetail.team')}</Typography>
                  <GroupIcon sx={{ color: 'text.secondary' }} />
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                  {t('projectDetail.teamDescription')}
                </Typography>
                <Button variant="secondary" size="small" onClick={() => handleNavTo('contacts')}>
                  {t('projectDetail.viewTeam')}
                </Button>
              </Box>
            </Card>
          </Box>
        </Box>
      ) : (
        outlet
      )}
    </Box>
  )
}
