import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { withMinDuration } from '../utils/async'
import { StatusBadge } from '../components/ui/StatusBadge'
import { SearchField, TextField } from '../components/ui/TextField'
import { FormModal, ConfirmModal } from '../components/ui/Modal'
import { EmptyState } from '../components/ui/EmptyState'
import { projectsApi } from '../api/projects'
import { useProject } from '../contexts/ProjectContext'
import type { Project } from '../types'
import { validateProjectForm, hasErrors, VALIDATION, type ValidationError } from '../utils/validation'
import { parseValidationErrors } from '../utils/apiErrors'
import { useToast } from '../components/common/ToastProvider'
import { AddIcon, MoreVertIcon, AssignmentIcon, ApartmentIcon, ConstructionIcon, EngineeringIcon, CheckCircleIcon, ScheduleIcon } from '@/icons'
import { Box, Typography, Menu, MenuItem, IconButton, Skeleton, Chip, Paper, LinearProgress, alpha } from '@/mui'

function getDaysRemaining(endDate?: string): number | null {
  if (!endDate) return null
  const diff = Math.ceil((new Date(endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  return diff
}

function getTimerChipProps(days: number | null, t: (key: string, opts?: Record<string, unknown>) => string): { label: string; color: 'success' | 'warning' | 'error' | 'default' } {
  if (days === null) return { label: t('project.noEndDate'), color: 'default' }
  if (days < 0) return { label: t('project.daysOverdue', { count: Math.abs(days) }), color: 'error' }
  if (days <= 14) return { label: t('project.daysLeft', { count: days }), color: 'warning' }
  return { label: t('project.daysLeft', { count: days }), color: 'success' }
}

const THUMB_GRADIENTS = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
  'linear-gradient(135deg, #fccb90 0%, #d57eeb 100%)',
  'linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)',
]

const THUMB_ICONS = [ApartmentIcon, ConstructionIcon, EngineeringIcon]

function getProjectProgress(project: Project): number {
  if (project.completionPercentage != null) return project.completionPercentage
  if (project.status === 'completed') return 100
  const id = project.id
  const hash = (id.charCodeAt(0) * 17 + id.charCodeAt(1) * 31) % 70 + 20
  if (project.status === 'on_hold') return Math.min(hash, 45)
  return hash
}

function getTaskCount(project: Project): number {
  const hash = project.id.charCodeAt(0) * 7 + project.id.charCodeAt(1) * 13
  return (hash % 20) + 3
}

function getThumbData(projectId: string) {
  const seed = projectId.charCodeAt(0) + projectId.charCodeAt(1) * 7
  const count = (seed % 3) + 2
  const extra = Math.max(0, (seed % 5) - 1)
  const items = Array.from({ length: count }, (_, i) => ({
    gradient: THUMB_GRADIENTS[(seed + i * 3) % THUMB_GRADIENTS.length],
    Icon: THUMB_ICONS[(seed + i) % THUMB_ICONS.length],
  }))
  return { items, extra }
}

export default function ProjectsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { showError, showSuccess } = useToast()
  const { projects, projectsLoading: loading, refreshProjects } = useProject()
  const [search, setSearch] = useState('')
  const [openDialog, setOpenDialog] = useState(false)
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [errors, setErrors] = useState<ValidationError>({})
  const [statusFilter, setStatusFilter] = useState('all')
  const [formData, setFormData] = useState({
    name: '', description: '', address: '', startDate: '', estimatedEndDate: ''
  })

  useEffect(() => {
    if (searchParams.get('new') === 'true' && !loading) {
      handleOpenCreate()
      setSearchParams({}, { replace: true })
    }
    const editId = searchParams.get('edit')
    if (editId && !loading && projects.length > 0) {
      const proj = projects.find(p => p.id === editId)
      if (proj) handleOpenEdit(proj)
      setSearchParams({}, { replace: true })
    }
  }, [loading, searchParams, projects])

  const resetForm = () => {
    setFormData({ name: '', description: '', address: '', startDate: '', estimatedEndDate: '' })
    setErrors({})
    setEditingProject(null)
  }

  const handleCloseDialog = () => { setOpenDialog(false); resetForm() }
  const handleOpenCreate = () => { resetForm(); setOpenDialog(true) }

  const handleOpenEdit = (project: Project) => {
    setEditingProject(project)
    setFormData({
      name: project.name,
      description: project.description || '', address: project.address || '',
      startDate: project.startDate || '', estimatedEndDate: project.estimatedEndDate || ''
    })
    setErrors({})
    setOpenDialog(true)
    handleMenuClose()
  }

  const handleSaveProject = async () => {
    const validationErrors = validateProjectForm(formData)
    setErrors(validationErrors)
    if (hasErrors(validationErrors)) return
    setSaving(true)
    try {
      if (editingProject) {
        await withMinDuration(projectsApi.update(editingProject.id, {
          name: formData.name, description: formData.description || undefined,
          address: formData.address || undefined, start_date: formData.startDate || undefined,
          estimated_end_date: formData.estimatedEndDate || undefined
        }))
        showSuccess(t('pages.projects.updateSuccess'))
      } else {
        await withMinDuration(projectsApi.create({
          name: formData.name,
          description: formData.description || undefined, address: formData.address || undefined,
          start_date: formData.startDate || undefined, estimated_end_date: formData.estimatedEndDate || undefined
        }))
        showSuccess(t('pages.projects.createSuccess'))
      }
      handleCloseDialog()
      refreshProjects()
    } catch (err: unknown) {
      const serverErrors = parseValidationErrors(err)
      if (Object.keys(serverErrors).length > 0) {
        setErrors(prev => ({ ...prev, ...serverErrors }))
        showError(t('validation.checkFields'))
      } else {
        showError(editingProject ? t('pages.projects.failedToUpdate') : t('pages.projects.failedToCreate'))
      }
    } finally { setSaving(false) }
  }

  const handleDeleteClick = () => {
    setProjectToDelete(selectedProject)
    setDeleteDialogOpen(true)
    setAnchorEl(null)
  }

  const handleConfirmDelete = async () => {
    if (!projectToDelete) return
    setDeleting(true)
    try {
      await withMinDuration(projectsApi.delete(projectToDelete.id))
      showSuccess(t('pages.projects.deleteSuccess'))
      setDeleteDialogOpen(false)
      setProjectToDelete(null)
      refreshProjects()
    } catch { showError(t('pages.projects.failedToDelete')) }
    finally { setDeleting(false) }
  }

  const filteredProjects = projects.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, project: Project) => {
    event.stopPropagation()
    setAnchorEl(event.currentTarget)
    setSelectedProject(project)
  }
  const handleMenuClose = () => { setAnchorEl(null); setSelectedProject(null) }

  const activeCount = projects.filter(p => p.status === 'active').length
  const completedCount = projects.filter(p => p.status === 'completed').length
  const onHoldCount = projects.filter(p => p.status === 'on_hold').length

  const statusFilters = [
    { label: t('common.all'), value: 'all', count: projects.length },
    { label: t('pages.projects.active'), value: 'active', count: activeCount },
    { label: t('pages.projects.onHold'), value: 'on_hold', count: onHoldCount },
    { label: t('pages.projects.completed'), value: 'completed', count: completedCount },
  ]

  if (loading) {
    return (
      <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: '100%', overflow: 'hidden' }}>
        <Skeleton variant="text" width={160} height={32} sx={{ mb: 1 }} />
        <Skeleton variant="rounded" width="100%" height={48} sx={{ mb: 2, borderRadius: 3 }} />
        <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
          {[...Array(4)].map((_, i) => <Skeleton key={i} variant="rounded" width={70} height={36} sx={{ borderRadius: 5 }} />)}
        </Box>
        {[...Array(3)].map((_, i) => <Skeleton key={i} variant="rounded" height={220} sx={{ mb: 2, borderRadius: 3 }} />)}
      </Box>
    )
  }

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
          {t('pages.projects.title')}
        </Typography>
        <IconButton
          onClick={handleOpenCreate}
          sx={{
            bgcolor: 'primary.main', color: 'primary.contrastText',
            width: 44, height: 44, '&:hover': { bgcolor: 'primary.dark' }, boxShadow: 2,
          }}
        >
          <AddIcon />
        </IconButton>
      </Box>

      <SearchField placeholder={t('pages.projects.searchPlaceholder')} value={search} onChange={(e) => setSearch(e.target.value)} sx={{ mb: 2 }} />

      {/* Status filter chips */}
      <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', pb: 1, mb: 2, '&::-webkit-scrollbar': { display: 'none' }, scrollbarWidth: 'none' }}>
        {statusFilters.map((filter) => (
          <Chip
            key={filter.value}
            label={filter.label}
            onClick={() => setStatusFilter(filter.value)}
            sx={{
              borderRadius: 5, whiteSpace: 'nowrap', px: 1,
              fontWeight: statusFilter === filter.value ? 600 : 400,
              bgcolor: statusFilter === filter.value ? 'primary.main' : 'action.selected',
              color: statusFilter === filter.value ? 'primary.contrastText' : 'text.primary',
              border: statusFilter === filter.value ? 'none' : '1px solid',
              borderColor: statusFilter === filter.value ? 'transparent' : 'divider',
              '&:hover': { bgcolor: statusFilter === filter.value ? 'primary.dark' : 'action.hover' },
            }}
          />
        ))}
      </Box>

      {/* Project cards */}
      {filteredProjects.length === 0 ? (
        <Box sx={{ mt: 4 }}>
          <EmptyState variant="no-results" title={t('pages.projects.noProjectsFound')} description={t('pages.projects.noProjectsDescription')} action={{ label: t('pages.projects.createProject'), onClick: handleOpenCreate }} />
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {filteredProjects.map((project) => {
            const progress = getProjectProgress(project)
            const taskCount = getTaskCount(project)
            const { items: thumbs, extra: extraThumbs } = getThumbData(project.id)
            const isCompleted = project.status === 'completed'
            const daysRemaining = getDaysRemaining(project.estimatedEndDate)
            const timerChip = getTimerChipProps(daysRemaining, t)

            return (
              <Paper
                key={project.id}
                onClick={() => navigate(`/projects/${project.id}`)}
                sx={{
                  borderRadius: 3, overflow: 'hidden', cursor: 'pointer', p: 2,
                  bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider',
                  transition: 'box-shadow 0.2s, transform 0.15s',
                  '&:hover': { boxShadow: 3, transform: 'translateY(-1px)' },
                }}
              >
                {/* Row 1: Name + Code + Status + Menu */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: '1.05rem', lineHeight: 1.3 }} noWrap>
                      {project.name}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
                      <StatusBadge status={project.status} size="small" />
                      <Chip
                        icon={<ScheduleIcon sx={{ fontSize: 14 }} />}
                        label={timerChip.label}
                        size="small"
                        color={timerChip.color}
                        variant="outlined"
                        sx={{ fontSize: '0.65rem', height: 20, fontWeight: 500 }}
                      />
                    </Box>
                  </Box>
                  <IconButton size="small" onClick={(e) => handleMenuOpen(e, project)} sx={{ mt: -0.5, mr: -0.5 }}>
                    <MoreVertIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </Box>

                {/* Row 2: Image thumbnails (Stitch-style) */}
                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  {thumbs.map((thumb, i) => (
                    <Box
                      key={i}
                      sx={{
                        width: 72, height: 72, borderRadius: 2, flexShrink: 0,
                        background: thumb.gradient, display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        position: 'relative', overflow: 'hidden',
                      }}
                    >
                      <thumb.Icon sx={{ fontSize: 28, color: 'rgba(255,255,255,0.5)' }} />
                    </Box>
                  ))}
                  {extraThumbs > 0 && (
                    <Box
                      sx={{
                        width: 72, height: 72, borderRadius: 2, flexShrink: 0,
                        bgcolor: (theme) => alpha(theme.palette.text.primary, 0.06),
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <Typography sx={{ fontWeight: 600, fontSize: '0.85rem', color: 'text.secondary' }}>
                        +{extraThumbs}
                      </Typography>
                    </Box>
                  )}
                </Box>

                {/* Row 3: Progress */}
                <Box sx={{ mb: 1.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.75 }}>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                      {t('pages.projects.projectProgress')}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      {isCompleted && <CheckCircleIcon sx={{ fontSize: 14, color: 'success.main' }} />}
                      <Typography variant="caption" sx={{ fontWeight: 600, color: isCompleted ? 'success.main' : 'text.primary' }}>
                        {progress}%
                      </Typography>
                    </Box>
                  </Box>
                  <LinearProgress
                    variant="determinate" value={progress}
                    sx={{
                      height: 6, borderRadius: 3,
                      bgcolor: (theme) => alpha(theme.palette.primary.main, 0.12),
                      '& .MuiLinearProgress-bar': {
                        borderRadius: 3,
                        bgcolor: isCompleted ? 'success.main' : 'primary.main',
                      },
                    }}
                  />
                </Box>

                {/* Row 4: Footer - tasks */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, color: 'text.secondary', pt: 1, borderTop: 1, borderColor: 'divider' }}>
                  <AssignmentIcon sx={{ fontSize: 16 }} />
                  <Typography variant="caption" sx={{ fontWeight: 500 }}>
                    {taskCount} {t('pages.projects.tasks')}
                  </Typography>
                </Box>
              </Paper>
            )
          })}
        </Box>
      )}

      {/* Context menu */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
        <MenuItem onClick={() => selectedProject && handleOpenEdit(selectedProject)}>{t('pages.projects.editProject')}</MenuItem>
        <MenuItem onClick={() => { const pid = selectedProject?.id; handleMenuClose(); if (pid) navigate(`/projects/${pid}/contacts`); }}>{t('pages.projects.viewTeam')}</MenuItem>
        <MenuItem onClick={handleDeleteClick} sx={{ color: 'error.main' }}>{t('pages.projects.deleteProject')}</MenuItem>
      </Menu>

      {/* Create/Edit modal */}
      <FormModal
        open={openDialog} onClose={handleCloseDialog} onSubmit={handleSaveProject}
        title={editingProject ? t('pages.projects.editProjectTitle') : t('pages.projects.createNewProject')}
        submitLabel={editingProject ? t('common.saveChanges') : t('pages.projects.createProject')}
        loading={saving}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField fullWidth label={t('pages.projects.projectName')} required value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            error={!!errors.name || formData.name.length > VALIDATION.MAX_NAME_LENGTH}
            helperText={errors.name || (formData.name.length > 0 ? `${formData.name.length}/${VALIDATION.MAX_NAME_LENGTH}` : undefined)}
            inputProps={{ maxLength: VALIDATION.MAX_NAME_LENGTH }} />
          <TextField fullWidth label={t('pages.projects.description')} multiline rows={3}
            value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            error={!!errors.description}
            helperText={errors.description || (formData.description.length > 0 ? `${formData.description.length}/${VALIDATION.MAX_DESCRIPTION_LENGTH}` : undefined)} />
          <TextField fullWidth label={t('pages.projects.address')} value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            error={!!errors.address} helperText={errors.address} />
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <TextField fullWidth label={t('pages.projects.startDate')} type="date" InputLabelProps={{ shrink: true }}
              value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              error={!!errors.startDate} helperText={errors.startDate} />
            <TextField fullWidth label={t('pages.projects.endDate')} type="date" InputLabelProps={{ shrink: true }}
              value={formData.estimatedEndDate} onChange={(e) => setFormData({ ...formData, estimatedEndDate: e.target.value })}
              error={!!errors.estimatedEndDate} helperText={errors.estimatedEndDate} />
          </Box>
        </Box>
      </FormModal>

      {/* Delete confirmation */}
      <ConfirmModal
        open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} onConfirm={handleConfirmDelete}
        title={t('pages.projects.deleteConfirmation')}
        message={t('pages.projects.deleteConfirmationMessage', { name: projectToDelete?.name })}
        confirmLabel={t('pages.projects.deleteProject')} variant="danger" loading={deleting} />
    </Box>
  )
}
