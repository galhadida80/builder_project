import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardActions from '@mui/material/CardActions'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import TextField from '@mui/material/TextField'
import InputAdornment from '@mui/material/InputAdornment'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import IconButton from '@mui/material/IconButton'
import CircularProgress from '@mui/material/CircularProgress'
import SearchIcon from '@mui/icons-material/Search'
import AddIcon from '@mui/icons-material/Add'
import LocationOnIcon from '@mui/icons-material/LocationOn'
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import { projectsApi } from '../api/projects'
import type { Project } from '../types'
import { validateProjectForm, hasErrors, VALIDATION, type ValidationError } from '../utils/validation'
import { useToast } from '../components/common/ToastProvider'

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
    } catch (error) {
      console.error('Failed to load projects:', error)
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
    const validationErrors = validateProjectForm({
      ...formData,
      endDate: formData.estimatedEndDate
    })
    setErrors(validationErrors)
    if (hasErrors(validationErrors)) return

    setSaving(true)
    try {
      if (editingProject) {
        await projectsApi.update(editingProject.id, {
          name: formData.name,
          description: formData.description || undefined,
          location: formData.address || undefined,
          startDate: formData.startDate || undefined,
          expectedEndDate: formData.estimatedEndDate || undefined
        })
        showSuccess(t('pages.projects.updateSuccess'))
      } else {
        await projectsApi.create({
          name: formData.name,
          code: formData.code,
          description: formData.description || undefined,
          location: formData.address || undefined,
          startDate: formData.startDate || undefined,
          expectedEndDate: formData.estimatedEndDate || undefined
        })
        showSuccess(t('pages.projects.createSuccess'))
      }
      handleCloseDialog()
      loadProjects()
    } catch (error) {
      console.error('Failed to save project:', error)
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
    } catch (error) {
      console.error('Failed to delete project:', error)
      showError(t('pages.projects.failedToDelete'))
    }
  }

  const filteredProjects = projects.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.code.toLowerCase().includes(search.toLowerCase())
  )

  const getStatusColor = (status: Project['status']) => {
    switch (status) {
      case 'active': return 'success'
      case 'on_hold': return 'warning'
      case 'completed': return 'info'
      case 'archived': return 'default'
      default: return 'default'
    }
  }

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

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            {t('pages.projects.title')}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {t('pages.projects.subtitle')}
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenCreate}
        >
          {t('pages.projects.newProject')}
        </Button>
      </Box>

      <TextField
        fullWidth
        placeholder={t('pages.projects.searchProjects')}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        sx={{ mb: 3, maxWidth: 400 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon color="action" />
            </InputAdornment>
          ),
        }}
      />

      <Grid container spacing={3}>
        {filteredProjects.map((project) => (
          <Grid item xs={12} sm={6} md={4} key={project.id}>
            <Card
              sx={{
                cursor: 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 4,
                },
              }}
              onClick={() => handleProjectClick(project.id)}
            >
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box>
                    <Typography variant="h6" fontWeight="bold">
                      {project.name}
                    </Typography>
                    <Chip label={project.code} size="small" sx={{ mt: 0.5 }} />
                  </Box>
                  <IconButton size="small" onClick={(e) => handleMenuOpen(e, project)}>
                    <MoreVertIcon />
                  </IconButton>
                </Box>

                <Typography variant="body2" color="text.secondary" sx={{ mb: 2, minHeight: 40 }}>
                  {project.description}
                </Typography>

                {project.address && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                    <LocationOnIcon fontSize="small" color="action" />
                    <Typography variant="caption" color="text.secondary">
                      {project.address}
                    </Typography>
                  </Box>
                )}

                {project.startDate && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <CalendarTodayIcon fontSize="small" color="action" />
                    <Typography variant="caption" color="text.secondary">
                      {new Date(project.startDate).toLocaleDateString()} - {project.estimatedEndDate ? new Date(project.estimatedEndDate).toLocaleDateString() : t('pages.projects.ongoing')}
                    </Typography>
                  </Box>
                )}
              </CardContent>
              <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
                <Chip
                  label={t(`status.${project.status.replace(/-/g, '_')}`)}
                  size="small"
                  color={getStatusColor(project.status)}
                  sx={{ textTransform: 'capitalize' }}
                />
                <Button size="small" onClick={() => handleProjectClick(project.id)}>
                  {t('pages.projects.viewDetails')}
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {filteredProjects.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {t('pages.projects.noProjects')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('pages.projects.tryAdjusting')}
          </Typography>
        </Box>
      )}

      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
        <MenuItem onClick={() => selectedProject && handleOpenEdit(selectedProject)}>{t('pages.projects.editProject')}</MenuItem>
        <MenuItem onClick={handleMenuClose}>{t('pages.projects.viewTeam')}</MenuItem>
        <MenuItem onClick={handleMenuClose}>{t('pages.projects.exportReport')}</MenuItem>
        <MenuItem onClick={handleDeleteClick} sx={{ color: 'error.main' }}>{t('pages.projects.deleteProject')}</MenuItem>
      </Menu>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingProject ? t('pages.projects.editProject') : t('pages.projects.createNewProject')}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label={t('pages.projects.projectName')}
            margin="normal"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            error={!!errors.name || formData.name.length >= VALIDATION.MAX_NAME_LENGTH}
            helperText={errors.name || (formData.name.length > 0 ? `${formData.name.length}/${VALIDATION.MAX_NAME_LENGTH}${formData.name.length >= VALIDATION.MAX_NAME_LENGTH * 0.9 ? ` - ${t('pages.projects.approachingLimit')}` : ''}` : undefined)}
            inputProps={{ maxLength: VALIDATION.MAX_NAME_LENGTH }}
          />
          <TextField
            fullWidth
            label={t('pages.projects.projectCode')}
            margin="normal"
            required
            disabled={!!editingProject}
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
            error={!!errors.code}
            helperText={editingProject ? t('pages.projects.codeCannotChanged') : (errors.code || t('pages.projects.lettersNumbersHyphens'))}
            inputProps={{ maxLength: VALIDATION.MAX_CODE_LENGTH }}
          />
          <TextField
            fullWidth
            label={t('pages.projects.description')}
            margin="normal"
            multiline
            rows={3}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            error={!!errors.description || formData.description.length >= VALIDATION.MAX_DESCRIPTION_LENGTH}
            helperText={errors.description || (formData.description.length > 0 ? `${formData.description.length}/${VALIDATION.MAX_DESCRIPTION_LENGTH}${formData.description.length >= VALIDATION.MAX_DESCRIPTION_LENGTH * 0.9 ? ` - ${t('pages.projects.approachingLimit')}` : ''}` : undefined)}
            inputProps={{ maxLength: VALIDATION.MAX_DESCRIPTION_LENGTH }}
          />
          <TextField
            fullWidth
            label={t('pages.projects.address')}
            margin="normal"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            error={!!errors.address}
            helperText={errors.address}
            inputProps={{ maxLength: VALIDATION.MAX_ADDRESS_LENGTH }}
          />
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              fullWidth
              label={t('pages.projects.startDate')}
              type="date"
              margin="normal"
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
              margin="normal"
              InputLabelProps={{ shrink: true }}
              value={formData.estimatedEndDate}
              onChange={(e) => setFormData({ ...formData, estimatedEndDate: e.target.value })}
              error={!!errors.endDate}
              helperText={errors.endDate}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={saving}>{t('common.cancel')}</Button>
          <Button variant="contained" onClick={handleSaveProject} disabled={saving}>
            {saving ? <CircularProgress size={24} /> : (editingProject ? t('buttons.save') : t('buttons.create'))}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>{t('pages.projects.deleteProject')}</DialogTitle>
        <DialogContent>
          <Typography dangerouslySetInnerHTML={{ __html: t('pages.projects.deleteConfirmMessage', { name: projectToDelete?.name || '' }) }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>{t('common.cancel')}</Button>
          <Button variant="contained" color="error" onClick={handleConfirmDelete}>{t('pages.projects.deleteProject')}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
