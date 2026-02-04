import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import IconButton from '@mui/material/IconButton'
import Skeleton from '@mui/material/Skeleton'
import Chip from '@mui/material/Chip'
import AddIcon from '@mui/icons-material/Add'
import LocationOnIcon from '@mui/icons-material/LocationOn'
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import FolderIcon from '@mui/icons-material/Folder'
import GridViewIcon from '@mui/icons-material/GridView'
import ViewListIcon from '@mui/icons-material/ViewList'
import FilterListIcon from '@mui/icons-material/FilterList'
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

export default function ProjectsPage() {
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
      showError('Failed to load projects. Please try again.')
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
        showSuccess('Project updated successfully!')
      } else {
        await projectsApi.create({
          name: formData.name,
          code: formData.code,
          description: formData.description || undefined,
          address: formData.address || undefined,
          start_date: formData.startDate || undefined,
          estimated_end_date: formData.estimatedEndDate || undefined
        })
        showSuccess('Project created successfully!')
      }
      handleCloseDialog()
      loadProjects()
    } catch {
      showError(`Failed to ${editingProject ? 'update' : 'create'} project. Please try again.`)
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
      showSuccess('Project deleted successfully!')
      setDeleteDialogOpen(false)
      setProjectToDelete(null)
      loadProjects()
    } catch {
      showError('Failed to delete project. Please try again.')
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
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 2, mb: 4 }}>
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} variant="rounded" height={100} sx={{ borderRadius: 3 }} />
          ))}
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }, gap: 3 }}>
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
        title="Projects"
        subtitle="Manage your construction projects"
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Projects' }]}
        actions={
          <Button variant="primary" icon={<AddIcon />} onClick={handleOpenCreate}>
            New Project
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
          title="Total Projects"
          value={projects.length}
          icon={<FolderIcon />}
          color="primary"
        />
        <KPICard
          title="Active"
          value={activeProjects}
          icon={<FolderIcon />}
          color="success"
        />
        <KPICard
          title="On Hold"
          value={onHoldProjects}
          icon={<FolderIcon />}
          color="warning"
        />
        <KPICard
          title="Completed"
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
                placeholder="Search projects..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <Button variant="secondary" size="small" icon={<FilterListIcon />}>
                Filters
              </Button>
            </Box>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <Chip label={`${filteredProjects.length} projects`} size="small" />
              <SegmentedTabs
                items={[
                  { label: 'Grid', value: 'grid', icon: <GridViewIcon sx={{ fontSize: 18 }} /> },
                  { label: 'List', value: 'list', icon: <ViewListIcon sx={{ fontSize: 18 }} /> },
                ]}
                value={viewMode}
                onChange={(v) => setViewMode(v as 'grid' | 'list')}
              />
            </Box>
          </Box>

          <Tabs
            items={[
              { label: 'All', value: 'all', badge: projects.length },
              { label: 'Active', value: 'active', badge: activeProjects },
              { label: 'On Hold', value: 'on_hold', badge: onHoldProjects },
              { label: 'Completed', value: 'completed', badge: completedProjects },
            ]}
            value={statusFilter}
            onChange={setStatusFilter}
            size="small"
          />

          {filteredProjects.length === 0 ? (
            <Box sx={{ mt: 4 }}>
              <EmptyState
                variant="no-results"
                title="No projects found"
                description="Try adjusting your search or create a new project"
                action={{ label: 'Create Project', onClick: handleOpenCreate }}
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
                            {new Date(project.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            {project.estimatedEndDate && (
                              <> - {new Date(project.estimatedEndDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</>
                            )}
                          </Typography>
                        </Box>
                      )}
                    </Box>

                    <Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="caption" color="text.secondary">Status</Typography>
                        <Typography variant="caption" fontWeight={600} sx={{ textTransform: 'capitalize' }}>
                          {project.status.replace('_', ' ')}
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
        <MenuItem onClick={() => selectedProject && handleOpenEdit(selectedProject)}>Edit Project</MenuItem>
        <MenuItem onClick={handleMenuClose}>View Team</MenuItem>
        <MenuItem onClick={handleMenuClose}>Export Report</MenuItem>
        <MenuItem onClick={handleDeleteClick} sx={{ color: 'error.main' }}>Delete Project</MenuItem>
      </Menu>

      <FormModal
        open={openDialog}
        onClose={handleCloseDialog}
        onSubmit={handleSaveProject}
        title={editingProject ? 'Edit Project' : 'Create New Project'}
        submitLabel={editingProject ? 'Save Changes' : 'Create Project'}
        loading={saving}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField
            fullWidth
            label="Project Name"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            error={!!errors.name || formData.name.length >= VALIDATION.MAX_NAME_LENGTH}
            helperText={errors.name || (formData.name.length > 0 ? `${formData.name.length}/${VALIDATION.MAX_NAME_LENGTH}` : undefined)}
            inputProps={{ maxLength: VALIDATION.MAX_NAME_LENGTH }}
          />
          <TextField
            fullWidth
            label="Project Code"
            required
            disabled={!!editingProject}
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
            error={!!errors.code}
            helperText={editingProject ? 'Code cannot be changed' : (errors.code || 'Letters, numbers, hyphens only')}
            inputProps={{ maxLength: VALIDATION.MAX_CODE_LENGTH }}
          />
          <TextField
            fullWidth
            label="Description"
            multiline
            rows={3}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            error={!!errors.description}
            helperText={errors.description || (formData.description.length > 0 ? `${formData.description.length}/${VALIDATION.MAX_DESCRIPTION_LENGTH}` : undefined)}
          />
          <TextField
            fullWidth
            label="Address"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            error={!!errors.address}
            helperText={errors.address}
          />
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <TextField
              fullWidth
              label="Start Date"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              error={!!errors.startDate}
              helperText={errors.startDate}
            />
            <TextField
              fullWidth
              label="End Date"
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
        title="Delete Project"
        message={`Are you sure you want to delete "${projectToDelete?.name}"? This will permanently remove the project and all associated data. This action cannot be undone.`}
        confirmLabel="Delete Project"
        variant="danger"
      />
    </Box>
  )
}
