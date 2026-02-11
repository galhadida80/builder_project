import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Card, KPICard } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { StatusBadge } from '../components/ui/StatusBadge'
import { PageHeader } from '../components/ui/Breadcrumbs'
import { SearchField, TextField } from '../components/ui/TextField'
import { FormModal, ConfirmModal } from '../components/ui/Modal'
import { Tabs, SegmentedTabs } from '../components/ui/Tabs'
import { EmptyState } from '../components/ui/EmptyState'
import { ProgressBar } from '../components/ui/ProgressBar'
import { projectsApi } from '../api/projects'
import type { Project } from '../types'
import { validateProjectForm, hasErrors, VALIDATION, type ValidationError } from '../utils/validation'
import { useToast } from '../components/common/ToastProvider'
import { AddIcon, LocationOnIcon, CalendarTodayIcon, MoreVertIcon, FolderIcon, GridViewIcon, ViewListIcon } from '@/icons'
import { Box, Typography, Menu, MenuItem, IconButton, Skeleton, Chip } from '@/mui'

export default function ProjectsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { showError, showSuccess } = useToast()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [openDialog, setOpenDialog] = useState(false)
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<ValidationError>({})
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
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
    loadProjects()
  }, [])

  const loadProjects = async () => {
    try {
      setLoading(true)
      const data = await projectsApi.list()
      setProjects(data)
    } catch {
      showError(t('pages.projects.failedToLoad'))
    } finally {
      setLoading(false)
    }
  }

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
        await projectsApi.update(editingProject.id, {
          name: formData.name,
          description: formData.description || undefined,
          address: formData.address || undefined,
          start_date: formData.startDate || undefined,
          estimated_end_date: formData.estimatedEndDate || undefined
        })
        showSuccess(t('pages.projects.updateSuccess'))
      } else {
        await projectsApi.create({
          name: formData.name,
          code: formData.code,
          description: formData.description || undefined,
          address: formData.address || undefined,
          start_date: formData.startDate || undefined,
          estimated_end_date: formData.estimatedEndDate || undefined
        })
        showSuccess(t('pages.projects.createSuccess'))
      }
      handleCloseDialog()
      loadProjects()
    } catch {
      showError(editingProject ? t('pages.projects.failedToUpdate') : t('pages.projects.failedToCreate'))
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteClick = () => {
    setProjectToDelete(selectedProject)
    setDeleteDialogOpen(true)
    handleMenuClose()
  }

  const handleConfirmDelete = async () => {
    if (!projectToDelete) return
    try {
      await projectsApi.delete(projectToDelete.id)
      showSuccess(t('pages.projects.deleteSuccess'))
      setDeleteDialogOpen(false)
      setProjectToDelete(null)
      loadProjects()
    } catch {
      showError(t('pages.projects.failedToDelete'))
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

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton variant="text" width={200} height={48} sx={{ mb: 1 }} />
        <Skeleton variant="text" width={300} height={24} sx={{ mb: 4 }} />
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2, mb: 4 }}>
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} variant="rounded" height={100} sx={{ borderRadius: 3 }} />
          ))}
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 3 }}>
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} variant="rounded" height={200} sx={{ borderRadius: 3 }} />
          ))}
        </Box>
      </Box>
    )
  }

  return (
    <Box sx={{ p: 3 }}>
      <PageHeader
        title={t('pages.projects.title')}
        subtitle={t('pages.projects.subtitle')}
        breadcrumbs={[{ label: t('nav.dashboard'), href: '/dashboard' }, { label: t('nav.projects') }]}
        actions={
          <Button variant="primary" icon={<AddIcon />} onClick={handleOpenCreate}>
            {t('pages.projects.createNewProject')}
          </Button>
        }
      />

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
          gap: 2,
          mb: 4,
        }}
      >
        <KPICard
          title={t('pages.projects.totalProjects')}
          value={projects.length}
          icon={<FolderIcon />}
          color="primary"
        />
        <KPICard
          title={t('pages.projects.active')}
          value={activeProjects}
          icon={<FolderIcon />}
          color="success"
        />
        <KPICard
          title={t('pages.projects.onHold')}
          value={onHoldProjects}
          icon={<FolderIcon />}
          color="warning"
        />
        <KPICard
          title={t('pages.projects.completed')}
          value={completedProjects}
          icon={<FolderIcon />}
          color="info"
        />
      </Box>

      <Card>
        <Box sx={{ p: 2.5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <SearchField
                placeholder={t('pages.projects.searchPlaceholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <Chip label={`${filteredProjects.length} ${t('nav.projects').toLowerCase()}`} size="small" />
              <SegmentedTabs
                items={[
                  { label: t('common.gridView'), value: 'grid', icon: <GridViewIcon sx={{ fontSize: 18 }} /> },
                  { label: t('common.listView'), value: 'list', icon: <ViewListIcon sx={{ fontSize: 18 }} /> },
                ]}
                value={viewMode}
                onChange={(v) => setViewMode(v as 'grid' | 'list')}
              />
            </Box>
          </Box>

          <Tabs
            items={[
              { label: t('common.all'), value: 'all', badge: projects.length },
              { label: t('pages.projects.active'), value: 'active', badge: activeProjects },
              { label: t('pages.projects.onHold'), value: 'on_hold', badge: onHoldProjects },
              { label: t('pages.projects.completed'), value: 'completed', badge: completedProjects },
            ]}
            value={statusFilter}
            onChange={setStatusFilter}
            size="small"
          />

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
            <Box
              sx={{
                mt: 3,
                display: 'grid',
                gridTemplateColumns: viewMode === 'grid'
                  ? { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }
                  : '1fr',
                gap: 2,
              }}
            >
              {filteredProjects.map((project) => (
                <Card key={project.id} hoverable onClick={() => handleProjectClick(project.id)}>
                  <Box sx={{ p: 2.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Box sx={{ flex: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          <Typography variant="subtitle1" fontWeight={600}>
                            {project.name}
                          </Typography>
                          <StatusBadge status={project.status} size="small" />
                        </Box>
                        <Chip label={project.code} size="small" variant="outlined" sx={{ fontSize: '0.7rem' }} />
                      </Box>
                      <IconButton size="small" onClick={(e) => handleMenuOpen(e, project)}>
                        <MoreVertIcon fontSize="small" />
                      </IconButton>
                    </Box>

                    {project.description && (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          mb: 2,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                        }}
                      >
                        {project.description}
                      </Typography>
                    )}

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
                      {project.address && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                          <LocationOnIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                          <Typography variant="caption" color="text.secondary">
                            {project.address}
                          </Typography>
                        </Box>
                      )}
                      {project.startDate && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                          <CalendarTodayIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                          <Typography variant="caption" color="text.secondary">
                            {new Date(project.startDate).toLocaleDateString()}
                            {project.estimatedEndDate && (
                              <> - {new Date(project.estimatedEndDate).toLocaleDateString()}</>
                            )}
                          </Typography>
                        </Box>
                      )}
                    </Box>

                    <Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="caption" color="text.secondary">{t('common.status')}</Typography>
                        <Typography variant="caption" fontWeight={600} sx={{ textTransform: 'capitalize' }}>
                          {t(`common.statuses.${project.status}`, { defaultValue: project.status.replace('_', ' ') })}
                        </Typography>
                      </Box>
                      <ProgressBar value={project.status === 'completed' ? 100 : project.status === 'active' ? 50 : 0} showValue={false} size="small" />
                    </Box>
                  </Box>
                </Card>
              ))}
            </Box>
          )}
        </Box>
      </Card>

      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
        <MenuItem onClick={() => selectedProject && handleOpenEdit(selectedProject)}>{t('pages.projects.editProject')}</MenuItem>
        <MenuItem onClick={handleMenuClose}>{t('pages.projects.viewTeam')}</MenuItem>
        <MenuItem onClick={handleMenuClose}>{t('pages.projects.exportReport')}</MenuItem>
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
            fullWidth
            label={t('pages.projects.projectName')}
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            error={!!errors.name || formData.name.length >= VALIDATION.MAX_NAME_LENGTH}
            helperText={errors.name || (formData.name.length > 0 ? `${formData.name.length}/${VALIDATION.MAX_NAME_LENGTH}` : undefined)}
            inputProps={{ maxLength: VALIDATION.MAX_NAME_LENGTH }}
          />
          <TextField
            fullWidth
            label={t('pages.projects.projectCode')}
            required
            disabled={!!editingProject}
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
            error={!!errors.code}
            helperText={editingProject ? t('pages.projects.codeCannotBeChanged') : (errors.code || t('pages.projects.codeHint'))}
            inputProps={{ maxLength: VALIDATION.MAX_CODE_LENGTH }}
          />
          <TextField
            fullWidth
            label={t('pages.projects.description')}
            multiline
            rows={3}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            error={!!errors.description}
            helperText={errors.description || (formData.description.length > 0 ? `${formData.description.length}/${VALIDATION.MAX_DESCRIPTION_LENGTH}` : undefined)}
          />
          <TextField
            fullWidth
            label={t('pages.projects.address')}
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            error={!!errors.address}
            helperText={errors.address}
          />
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <TextField
              fullWidth
              label={t('pages.projects.startDate')}
              type="date"
              InputLabelProps={{ shrink: true }}
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              error={!!errors.startDate}
              helperText={errors.startDate}
            />
            <TextField
              fullWidth
              label={t('pages.projects.endDate')}
              type="date"
              InputLabelProps={{ shrink: true }}
              value={formData.estimatedEndDate}
              onChange={(e) => setFormData({ ...formData, estimatedEndDate: e.target.value })}
              error={!!errors.endDate}
              helperText={errors.endDate}
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
      />
    </Box>
  )
}
