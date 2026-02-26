import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useOutlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { StatusBadge } from '../components/ui/StatusBadge'
import { EmptyState } from '../components/ui/EmptyState'
import { FormModal } from '../components/ui/Modal'
import { TextField } from '../components/ui/TextField'
import { projectsApi } from '../api/projects'
import { equipmentApi } from '../api/equipment'
import { materialsApi } from '../api/materials'
import { meetingsApi } from '../api/meetings'
import { useProject } from '../contexts/ProjectContext'
import { useToast } from '../components/common/ToastProvider'
import { validateProjectForm, hasErrors, VALIDATION, type ValidationError } from '../utils/validation'
import { getDateLocale } from '../utils/dateLocale'
import { parseValidationErrors } from '../utils/apiErrors'
import type { Project, Equipment, Material, Meeting } from '../types'
import { ArrowBackIcon, EditIcon, LocationOnIcon, CalendarTodayIcon, GroupIcon, ConstructionIcon, InventoryIcon, EventIcon, WarningAmberIcon, PersonAddIcon, CheckCircleIcon, HourglassEmptyIcon, AssignmentIcon } from '@/icons'
import { Box, Typography, Chip, Skeleton, IconButton, alpha } from '@/mui'
import InviteMemberDialog from '../components/InviteMemberDialog'

function ProgressRing({ value, size = 120, strokeWidth = 10 }: { value: number; size?: number; strokeWidth?: number }) {
  const normalizedValue = Math.min(100, Math.max(0, value))
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - normalizedValue / 100)

  const getColor = () => {
    if (normalizedValue >= 75) return '#22C55E'
    if (normalizedValue >= 40) return '#e07842'
    return '#EAB308'
  }

  return (
    <Box sx={{ position: 'relative', display: 'inline-flex', width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={getColor()}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transition: 'stroke-dashoffset 800ms cubic-bezier(0.4, 0, 0.2, 1)',
            filter: `drop-shadow(0 0 6px ${getColor()}66)`,
          }}
        />
      </svg>
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Typography
          sx={{
            fontSize: { xs: '1.75rem', sm: '2rem' },
            fontWeight: 800,
            color: 'white',
            lineHeight: 1,
            letterSpacing: '-0.02em',
          }}
        >
          {normalizedValue}%
        </Typography>
      </Box>
    </Box>
  )
}

function StatPill({ label, value, color, icon }: { label: string; value: number; color: string; icon: React.ReactNode }) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        px: 2,
        py: 1.25,
        borderRadius: 2.5,
        bgcolor: alpha(color, 0.1),
        border: `1px solid ${alpha(color, 0.2)}`,
        flex: 1,
        minWidth: 0,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 32,
          height: 32,
          borderRadius: '50%',
          bgcolor: alpha(color, 0.2),
          color: color,
          flexShrink: 0,
          '& > svg': { fontSize: '1rem' },
        }}
      >
        {icon}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontSize: '1.25rem', fontWeight: 700, color: color, lineHeight: 1.1 }}>
          {value}
        </Typography>
        <Typography sx={{ fontSize: '0.7rem', fontWeight: 500, color: 'text.secondary', lineHeight: 1.2, whiteSpace: 'nowrap' }}>
          {label}
        </Typography>
      </Box>
    </Box>
  )
}

function QuickNavCard({ title, value, icon, color, onClick }: {
  title: string; value: number; icon: React.ReactNode; color: string; onClick: () => void
}) {
  return (
    <Box
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() } }}
      sx={{
        position: 'relative',
        p: { xs: 1.75, sm: 2 },
        borderRadius: 3,
        bgcolor: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
        cursor: 'pointer',
        overflow: 'hidden',
        transition: 'all 250ms cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': {
          transform: 'translateY(-2px)',
          bgcolor: 'rgba(255,255,255,0.05)',
          borderColor: alpha(color, 0.4),
          boxShadow: `0 8px 24px ${alpha(color, 0.15)}`,
        },
        '&:active': {
          transform: 'translateY(0)',
        },
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '2px',
          background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
          opacity: 0,
          transition: 'opacity 250ms ease',
        },
        '&:hover::before': {
          opacity: 1,
        },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography
            sx={{
              fontSize: { xs: '0.7rem', sm: '0.75rem' },
              fontWeight: 500,
              color: 'text.secondary',
              mb: 0.5,
              lineHeight: 1.2,
            }}
          >
            {title}
          </Typography>
          <Typography
            sx={{
              fontSize: { xs: '1.5rem', sm: '1.75rem' },
              fontWeight: 800,
              color: 'text.primary',
              lineHeight: 1,
              letterSpacing: '-0.02em',
            }}
          >
            {value}
          </Typography>
        </Box>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: { xs: 36, sm: 40 },
            height: { xs: 36, sm: 40 },
            borderRadius: 2,
            background: `linear-gradient(135deg, ${alpha(color, 0.2)}, ${alpha(color, 0.08)})`,
            color: color,
            flexShrink: 0,
            '& > svg': { fontSize: { xs: '1.15rem', sm: '1.3rem' } },
          }}
        >
          {icon}
        </Box>
      </Box>
    </Box>
  )
}

export default function ProjectDetailPage() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const outlet = useOutlet()
  const { t } = useTranslation()
  const { refreshProjects } = useProject()
  const { showError, showSuccess } = useToast()
  const [project, setProject] = useState<Project | null>(null)
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [materials, setMaterials] = useState<Material[]>([])
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const loadedProjectId = useRef<string | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [editSaving, setEditSaving] = useState(false)
  const [editErrors, setEditErrors] = useState<ValidationError>({})
  const [editForm, setEditForm] = useState({ name: '', description: '', address: '', startDate: '', estimatedEndDate: '' })
  const [inviteOpen, setInviteOpen] = useState(false)

  const isOverview = !outlet
  const dateLocale = getDateLocale()

  useEffect(() => {
    if (!projectId || projectId === loadedProjectId.current) return
    loadedProjectId.current = projectId
    projectsApi.get(projectId).then(setProject).catch(() => { loadedProjectId.current = null })
  }, [projectId])

  useEffect(() => {
    if (!projectId || !isOverview) return
    Promise.all([
      equipmentApi.list(projectId).catch(() => ({ items: [] as never[] })),
      materialsApi.list(projectId).catch(() => ({ items: [] as never[] })),
      meetingsApi.list(projectId).catch(() => [])
    ]).then(([eqRes, matRes, meet]) => {
      setEquipment(eqRes.items)
      setMaterials(matRes.items)
      setMeetings(meet)
    })
  }, [projectId, isOverview])

  if (!project) {
    if (!loadedProjectId.current) {
      return (
        <Box sx={{ p: { xs: 1.5, md: 2 } }}>
          <Skeleton variant="text" width={120} height={32} sx={{ mb: 1.5 }} />
          <Skeleton variant="rounded" height={200} sx={{ borderRadius: 3, mb: 2.5 }} />
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.5 }}>
            {[0, 1, 2, 3].map(i => (
              <Skeleton key={i} variant="rounded" height={90} sx={{ borderRadius: 3 }} />
            ))}
          </Box>
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

  const handleOpenEdit = () => {
    if (!project) return
    setEditForm({
      name: project.name,
      description: project.description || '',
      address: project.address || '',
      startDate: project.startDate || '',
      estimatedEndDate: project.estimatedEndDate || '',
    })
    setEditErrors({})
    setEditOpen(true)
  }

  const handleSaveEdit = async () => {
    const validationErrors = validateProjectForm(editForm)
    setEditErrors(validationErrors)
    if (hasErrors(validationErrors)) return
    setEditSaving(true)
    try {
      const updated = await projectsApi.update(project!.id, {
        name: editForm.name,
        description: editForm.description || undefined,
        address: editForm.address || undefined,
        start_date: editForm.startDate || undefined,
        estimated_end_date: editForm.estimatedEndDate || undefined,
      })
      setProject(updated)
      refreshProjects()
      showSuccess(t('pages.projects.updateSuccess'))
      setEditOpen(false)
    } catch (err: unknown) {
      const serverErrors = parseValidationErrors(err)
      if (Object.keys(serverErrors).length > 0) {
        setEditErrors(prev => ({ ...prev, ...serverErrors }))
      } else {
        showError(t('pages.projects.failedToUpdate'))
      }
    } finally {
      setEditSaving(false)
    }
  }

  return (
    <Box sx={{ p: { xs: 1.5, md: 2 }, maxWidth: 1200, mx: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <IconButton aria-label={t('projectDetail.backToProjects')} onClick={() => navigate('/projects')} size="small" sx={{ color: 'text.secondary' }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="body2" color="text.secondary">
          {t('projectDetail.backToProjects')}
        </Typography>
      </Box>

      {/* Hero Card */}
      <Box
        sx={{
          mb: 2.5,
          borderRadius: { xs: 3, sm: 4 },
          overflow: 'hidden',
          position: 'relative',
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box
          sx={{
            p: { xs: 2.5, sm: 3 },
            position: 'relative',
            zIndex: 1,
          }}
        >
          {/* Top row: project info + actions */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: { xs: 2.5, sm: 3 } }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                <Typography
                  sx={{
                    fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2rem' },
                    fontWeight: 800,
                    color: 'white',
                    letterSpacing: '-0.02em',
                    lineHeight: 1.2,
                  }}
                >
                  {project.name}
                </Typography>
                <StatusBadge status={project.status} />
              </Box>
              {project.description && (
                <Typography sx={{ color: 'rgba(255,255,255,0.6)', mb: 1.5, maxWidth: 600, fontSize: { xs: '0.85rem', sm: '0.95rem' }, lineHeight: 1.5 }}>
                  {project.description}
                </Typography>
              )}
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: { xs: 1.5, sm: 3 } }}>
                {project.address && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <LocationOnIcon sx={{ fontSize: 16, color: 'rgba(255,255,255,0.4)' }} />
                    <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem' }}>
                      {project.address}
                    </Typography>
                  </Box>
                )}
                {project.startDate && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <CalendarTodayIcon sx={{ fontSize: 16, color: 'rgba(255,255,255,0.4)' }} />
                    <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem' }}>
                      {new Date(project.startDate).toLocaleDateString(dateLocale, { month: 'short', day: 'numeric', year: 'numeric' })}
                      {project.estimatedEndDate && ` - ${new Date(project.estimatedEndDate).toLocaleDateString(dateLocale, { month: 'short', day: 'numeric', year: 'numeric' })}`}
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
              <Button
                variant="secondary"
                icon={<PersonAddIcon />}
                onClick={() => setInviteOpen(true)}
                sx={{
                  bgcolor: 'rgba(255,255,255,0.06)',
                  color: 'rgba(255,255,255,0.8)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  backdropFilter: 'blur(8px)',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.2)' },
                }}
              >
                <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                  {t('invite.dialogTitle')}
                </Box>
              </Button>
              <Button
                variant="secondary"
                icon={<EditIcon />}
                onClick={handleOpenEdit}
                sx={{
                  bgcolor: 'rgba(255,255,255,0.06)',
                  color: 'rgba(255,255,255,0.8)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  backdropFilter: 'blur(8px)',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.2)' },
                }}
              >
                <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                  {t('projectDetail.editProject')}
                </Box>
              </Button>
            </Box>
          </Box>

          {/* Progress ring + stat pills row */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              alignItems: { xs: 'center', sm: 'center' },
              gap: { xs: 2.5, sm: 4 },
              pt: 2,
              borderTop: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
              <ProgressRing value={completionPercent} size={110} strokeWidth={8} />
              <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', fontWeight: 500, mt: 1 }}>
                {t('projectDetail.overallCompletion')}
              </Typography>
            </Box>

            <Box
              sx={{
                display: 'flex',
                gap: 1.5,
                flex: 1,
                width: '100%',
                flexDirection: { xs: 'row', sm: 'row' },
              }}
            >
              <StatPill
                label={t('projectDetail.approved')}
                value={approvedItems}
                color="#22C55E"
                icon={<CheckCircleIcon />}
              />
              <StatPill
                label={t('projectDetail.inReview')}
                value={inProgressItems}
                color="#3B82F6"
                icon={<HourglassEmptyIcon />}
              />
              <StatPill
                label={t('projectDetail.draft')}
                value={pendingItems}
                color="#EAB308"
                icon={<AssignmentIcon />}
              />
            </Box>
          </Box>
        </Box>
      </Box>

      {isOverview ? (
        <Box>
          {/* Quick Nav KPI Cards */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
              gap: 1.5,
              mb: 2.5,
            }}
          >
            <QuickNavCard
              title={t('nav.equipment')}
              value={equipment.length}
              icon={<ConstructionIcon />}
              color="#e07842"
              onClick={() => handleNavTo('equipment')}
            />
            <QuickNavCard
              title={t('nav.materials')}
              value={materials.length}
              icon={<InventoryIcon />}
              color="#EAB308"
              onClick={() => handleNavTo('materials')}
            />
            <QuickNavCard
              title={t('nav.meetings')}
              value={meetings.length}
              icon={<EventIcon />}
              color="#3B82F6"
              onClick={() => handleNavTo('meetings')}
            />
            <QuickNavCard
              title={t('projectDetail.pendingApprovals')}
              value={pendingApprovals}
              icon={<WarningAmberIcon />}
              color={pendingApprovals > 0 ? '#EF4444' : '#22C55E'}
              onClick={() => handleNavTo('approvals')}
            />
          </Box>

          {/* Team Card */}
          <Card>
            <Box
              sx={{
                p: { xs: 2, md: 2.5 },
                display: 'flex',
                alignItems: { xs: 'flex-start', sm: 'center' },
                justifyContent: 'space-between',
                flexDirection: { xs: 'column', sm: 'row' },
                gap: 2,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 44,
                    height: 44,
                    borderRadius: 2.5,
                    background: 'linear-gradient(135deg, rgba(224, 120, 66, 0.2), rgba(224, 120, 66, 0.08))',
                    color: '#e07842',
                    flexShrink: 0,
                  }}
                >
                  <GroupIcon sx={{ fontSize: '1.3rem' }} />
                </Box>
                <Box>
                  <Typography sx={{ fontWeight: 600, fontSize: '0.95rem', color: 'text.primary' }}>
                    {t('projectDetail.team')}
                  </Typography>
                  <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary', mt: 0.25 }}>
                    {t('projectDetail.teamDescription')}
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button variant="secondary" size="small" onClick={() => handleNavTo('contacts')}>
                  {t('projectDetail.viewTeam')}
                </Button>
                <Button variant="primary" size="small" icon={<PersonAddIcon />} onClick={() => setInviteOpen(true)}>
                  {t('invite.dialogTitle')}
                </Button>
              </Box>
            </Box>
          </Card>
        </Box>
      ) : (
        outlet
      )}

      <FormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSubmit={handleSaveEdit}
        title={t('pages.projects.editProjectTitle')}
        submitLabel={t('common.saveChanges')}
        loading={editSaving}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField
            fullWidth
            label={t('pages.projects.projectName')}
            required
            value={editForm.name}
            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
            error={!!editErrors.name}
            helperText={editErrors.name}
            inputProps={{ maxLength: VALIDATION.MAX_NAME_LENGTH }}
          />
          <TextField
            fullWidth
            label={t('pages.projects.description')}
            multiline
            rows={3}
            value={editForm.description}
            onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
            error={!!editErrors.description}
            helperText={editErrors.description}
          />
          <TextField
            fullWidth
            label={t('pages.projects.address')}
            value={editForm.address}
            onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
            error={!!editErrors.address}
            helperText={editErrors.address}
          />
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <TextField
              fullWidth
              label={t('pages.projects.startDate')}
              type="date"
              InputLabelProps={{ shrink: true }}
              value={editForm.startDate}
              onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })}
              error={!!editErrors.startDate}
              helperText={editErrors.startDate}
            />
            <TextField
              fullWidth
              label={t('pages.projects.endDate')}
              type="date"
              InputLabelProps={{ shrink: true }}
              value={editForm.estimatedEndDate}
              onChange={(e) => setEditForm({ ...editForm, estimatedEndDate: e.target.value })}
              error={!!editErrors.estimatedEndDate}
              helperText={editErrors.estimatedEndDate}
            />
          </Box>
        </Box>
      </FormModal>

      {projectId && (
        <InviteMemberDialog
          open={inviteOpen}
          onClose={() => setInviteOpen(false)}
          projectId={projectId}
        />
      )}
    </Box>
  )
}
