import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { withMinDuration } from '../utils/async'
import { getDateLocale } from '../utils/dateLocale'
import { Button } from '../components/ui/Button'
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
import { AddIcon, LocationOnIcon, CalendarTodayIcon, MoreVertIcon, AssignmentIcon } from '@/icons'
import { Box, Typography, Menu, MenuItem, IconButton, Skeleton, Chip, Paper } from '@/mui'

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
    name: '',
    code: '',
    description: '',
    address: '',
    startDate: '',
    estimatedEndDate: ''
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
    setFormData({ name: '', code: '', description: '', address: '', startDate: '', estimatedEndDate: '' })
    setErrors({})
    setEditingProject(null)
  }

  const handleCloseDialog = () => {
    setOpenDialog(false)
    resetForm()
  }

  const handleOpenCreate = () => {
    resetForm()
    setOpenDialog(true)
  }

  const handleOpenEdit = (project: Project) => {
    setEditingProject(project)
    setFormData({
      name: project.name,
      code: project.code,
      description: project.description || '',
      address: project.address || '',
      startDate: project.startDate || '',
      estimatedEndDate: project.estimatedEndDate || ''
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
          name: formData.name,
          description: formData.description || undefined,
          address: formData.address || undefined,
          start_date: formData.startDate || undefined,
          estimated_end_date: formData.estimatedEndDate || undefined
        }))
        showSuccess(t('pages.projects.updateSuccess'))
      } else {
        await withMinDuration(projectsApi.create({
          name: formData.name,
          code: formData.code,
          description: formData.description || undefined,
          address: formData.address || undefined,
          start_date: formData.startDate || undefined,
          estimated_end_date: formData.estimatedEndDate || undefined
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
        const axiosErr = err as { response?: { status?: number; data?: { detail?: string } } }
        const detail = axiosErr?.response?.data?.detail
        if (axiosErr?.response?.status === 409 && detail) {
          setErrors(prev => ({ ...prev, code: detail }))
          showError(detail)
        } else {
          showError(editingProject ? t('pages.projects.failedToUpdate') : t('pages.projects.failedToCreate'))
        }
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteClick = () => {
    const project = selectedProject
    setProjectToDelete(project)
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
    } catch {
      showError(t('pages.projects.failedToDelete'))
    } finally {
      setDeleting(false)
    }
  }

  const filteredProjects = projects.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.code.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, project: Project) => {
    event.stopPropagation()
    setAnchorEl(event.currentTarget)
    setSelectedProject(project)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
    setSelectedProject(null)
  }

  const handleProjectClick = (projectId: string) => {
    navigate(`/projects/${projectId}`)
  }

  const activeProjects = projects.filter(p => p.status === 'active').length
  const completedProjects = projects.filter(p => p.status === 'completed').length
  const onHoldProjects = projects.filter(p => p.status === 'on_hold').length

  const statusFilters = [
    { label: t('common.all'), value: 'all', count: projects.length },
    { label: t('pages.projects.active'), value: 'active', count: activeProjects },
    { label: t('pages.projects.completed'), value: 'completed', count: completedProjects },
    { label: t('pages.projects.onHold'), value: 'on_hold', count: onHoldProjects },
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success.main'
      case 'completed': return 'info.main'
      case 'on_hold': return 'warning.main'
      default: return 'text.secondary'
    }
  }

  if (loading) {
    return (
      <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: '100%', overflow: 'hidden' }}>
        <Skeleton variant="text" width={160} height={32} sx={{ mb: 1 }} />
        <Skeleton variant="rounded" width="100%" height={48} sx={{ mb: 2, borderRadius: 3 }} />
        <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
          {[...Array(4)].map((_, i) => <Skeleton key={i} variant="rounded" width={70} height={36} sx={{ borderRadius: 5 }} />)}
        </Box>
        {[...Array(3)].map((_, i) => <Skeleton key={i} variant="rounded" height={160} sx={{ mb: 2, borderRadius: 3 }} />)}
      </Box>
    )
  }

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: '100%', overflow: 'hidden' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
          {t('pages.projects.title')}
        </Typography>
        <IconButton
          onClick={handleOpenCreate}
          sx={{
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            width: 44,
            height: 44,
            '&:hover': { bgcolor: 'primary.dark' },
            boxShadow: 2,
          }}
        >
          <AddIcon />
        </IconButton>
      </Box>

      <SearchField
        placeholder={t('pages.projects.searchPlaceholder')}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        sx={{ mb: 2 }}
      />

      <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', pb: 1, mb: 2, '&::-webkit-scrollbar': { display: 'none' }, msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
        {statusFilters.map((filter) => (
          <Chip
            key={filter.value}
            label={filter.label}
            onClick={() => setStatusFilter(filter.value)}
            sx={{
              borderRadius: 5,
              fontWeight: statusFilter === filter.value ? 600 : 400,
              bgcolor: statusFilter === filter.value ? 'primary.main' : 'action.selected',
              color: statusFilter === filter.value ? 'primary.contrastText' : 'text.primary',
              '&:hover': { bgcolor: statusFilter === filter.value ? 'primary.dark' : 'action.hover' },
              whiteSpace: 'nowrap',
              px: 1,
            }}
          />
        ))}
      </Box>

      {filteredProjects.length === 0 ? (
        <Box sx={{ mt: 4 }}>
          <EmptyState
            variant="no-results"
            title={t('pages.projects.noProjectsFound')}
            description={t('pages.projects.noProjectsDescription')}
            action={{ label: t('pages.projects.createProject'), onClick: handleOpenCreate }}
          />
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {filteredProjects.map((project) => (
            <Paper
              key={project.id}
              onClick={() => handleProjectClick(project.id)}
              sx={{
                borderRadius: 3,
                overflow: 'hidden',
                cursor: 'pointer',
                borderInlineStart: project.status === 'active' ? '4px solid' : 'none',
                borderInlineStartColor: 'primary.main',
                transition: 'box-shadow 0.2s',
                '&:hover': { boxShadow: 3 },
              }}
            >
              <Box sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body1" fontWeight={700} noWrap>{project.name}</Typography>
                    <Chip label={project.code} size="small" variant="outlined" sx={{ fontSize: '0.65rem', height: 20, mt: 0.5 }} />
                  </Box>
                  <IconButton size="small" onClick={(e) => handleMenuOpen(e, project)} sx={{ mt: -0.5, mr: -0.5 }}>
                    <MoreVertIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1, mb: 2 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: getStatusColor(project.status), flexShrink: 0 }} />
                  <StatusBadge status={project.status} size="small" />
                </Box>

                {project.description && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: '-webkit-box', overflow: 'hidden', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', mb: 1.5, lineHeight: 1.4 }}>
                    {project.description}
                  </Typography>
                )}

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mb: 2 }}>
                  {project.address && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <LocationOnIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                      <Typography variant="caption" color="text.secondary" noWrap>{project.address}</Typography>
                    </Box>
                  )}
                  {project.startDate && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <CalendarTodayIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                      <Typography variant="caption" color="text.secondary">
                        {new Date(project.startDate).toLocaleDateString(getDateLocale())}
                        {project.estimatedEndDate && <> - {new Date(project.estimatedEndDate).toLocaleDateString(getDateLocale())}</>}
                      </Typography>
                    </Box>
                  )}
                </Box>

                <Box sx={{ borderTop: 1, borderColor: 'divider', pt: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
                    <AssignmentIcon sx={{ fontSize: 18 }} />
                    <Typography variant="caption">{t('pages.projects.projectCode')}: {project.code}</Typography>
                  </Box>
                </Box>
              </Box>
            </Paper>
          ))}
        </Box>
      )}

      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
        <MenuItem onClick={() => selectedProject && handleOpenEdit(selectedProject)}>{t('pages.projects.editProject')}</MenuItem>
        <MenuItem onClick={() => { const pid = selectedProject?.id; handleMenuClose(); if (pid) navigate(`/projects/${pid}/contacts`); }}>{t('pages.projects.viewTeam')}</MenuItem>
        <MenuItem onClick={handleDeleteClick} sx={{ color: 'error.main' }}>{t('pages.projects.deleteProject')}</MenuItem>
      </Menu>

      <FormModal
        open={openDialog}
        onClose={handleCloseDialog}
        onSubmit={handleSaveProject}
        title={editingProject ? t('pages.projects.editProjectTitle') : t('pages.projects.createNewProject')}
        submitLabel={editingProject ? t('common.saveChanges') : t('pages.projects.createProject')}
        loading={saving}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField
            fullWidth label={t('pages.projects.projectName')} required
            value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            error={!!errors.name || formData.name.length > VALIDATION.MAX_NAME_LENGTH}
            helperText={errors.name || (formData.name.length > 0 ? `${formData.name.length}/${VALIDATION.MAX_NAME_LENGTH}` : undefined)}
            inputProps={{ maxLength: VALIDATION.MAX_NAME_LENGTH }}
          />
          <TextField
            fullWidth label={t('pages.projects.projectCode')} required disabled={!!editingProject}
            value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
            error={!!errors.code}
            helperText={editingProject ? t('pages.projects.codeCannotBeChanged') : (errors.code || t('pages.projects.codeHint'))}
            inputProps={{ maxLength: VALIDATION.MAX_CODE_LENGTH }}
          />
          <TextField
            fullWidth label={t('pages.projects.description')} multiline rows={3}
            value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            error={!!errors.description}
            helperText={errors.description || (formData.description.length > 0 ? `${formData.description.length}/${VALIDATION.MAX_DESCRIPTION_LENGTH}` : undefined)}
          />
          <TextField
            fullWidth label={t('pages.projects.address')}
            value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            error={!!errors.address} helperText={errors.address}
          />
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <TextField
              fullWidth label={t('pages.projects.startDate')} type="date" InputLabelProps={{ shrink: true }}
              value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              error={!!errors.startDate} helperText={errors.startDate}
            />
            <TextField
              fullWidth label={t('pages.projects.endDate')} type="date" InputLabelProps={{ shrink: true }}
              value={formData.estimatedEndDate} onChange={(e) => setFormData({ ...formData, estimatedEndDate: e.target.value })}
              error={!!errors.estimatedEndDate} helperText={errors.estimatedEndDate}
            />
          </Box>
        </Box>
      </FormModal>

      <ConfirmModal
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        title={t('pages.projects.deleteConfirmation')}
        message={t('pages.projects.deleteConfirmationMessage', { name: projectToDelete?.name })}
        confirmLabel={t('pages.projects.deleteProject')}
        variant="danger"
        loading={deleting}
      />
    </Box>
  )
}
