'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardActionArea from '@mui/material/CardActionArea'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Skeleton from '@mui/material/Skeleton'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'
import Alert from '@mui/material/Alert'
import AddIcon from '@mui/icons-material/Add'
import FolderIcon from '@mui/icons-material/Folder'
import { useProject } from '@/lib/contexts/ProjectContext'
import { apiClient } from '@/lib/api/client'

interface Project {
  id: string
  name: string
  code: string
  status: string
  startDate?: string
  description?: string
}

const STATUS_COLORS: Record<string, 'success' | 'warning' | 'error' | 'default' | 'info'> = {
  active: 'success',
  on_hold: 'warning',
  completed: 'info',
  archived: 'default',
}

const INITIAL_FORM = {
  name: '',
  code: '',
  description: '',
  address: '',
  startDate: '',
  estimatedEndDate: '',
}

export default function ProjectsPage() {
  const t = useTranslations()
  const router = useRouter()
  const { setSelectedProjectId } = useProject()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState(INITIAL_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    loadProjects()
  }, [])

  const loadProjects = async () => {
    try {
      setLoading(true)
      const response = await apiClient.get('/projects')
      setProjects(response.data || [])
    } catch (err) {
      console.error('Failed to load projects:', err)
      setError(t('pages.projects.failedToLoad'))
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!form.name || !form.code) return
    try {
      setSubmitting(true)
      setSubmitError('')
      await apiClient.post('/projects', {
        name: form.name,
        code: form.code,
        description: form.description || undefined,
        address: form.address || undefined,
        startDate: form.startDate || undefined,
        estimatedEndDate: form.estimatedEndDate || undefined,
      })
      setDialogOpen(false)
      setForm(INITIAL_FORM)
      await loadProjects()
    } catch (err) {
      console.error('Failed to create project:', err)
      setSubmitError(t('pages.projects.failedToCreate'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleCardClick = (projectId: string) => {
    setSelectedProjectId(projectId)
    router.push(`/projects/${projectId}/equipment`)
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return null
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  if (loading) {
    return (
      <Box sx={{ p: 3, width: '100%' }}>
        <Skeleton variant="text" width={250} height={48} sx={{ mb: 1 }} />
        <Skeleton variant="text" width={350} height={24} sx={{ mb: 4 }} />
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 3 }}>
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} variant="rounded" height={180} sx={{ borderRadius: 3 }} />
          ))}
        </Box>
      </Box>
    )
  }

  return (
    <Box sx={{ p: 3, width: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 4 }}>
        <Box>
          <Typography variant="h4" fontWeight={700} color="text.primary" sx={{ mb: 0.5 }}>
            {t('projects.title')}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {t('projects.subtitle')}
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
          {t('projects.create')}
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{error}</Alert>}

      {projects.length === 0 ? (
        <Card sx={{ borderRadius: 3 }}>
          <CardContent sx={{ textAlign: 'center', py: 8 }}>
            <FolderIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" fontWeight={600} sx={{ mb: 1 }}>
              {t('projects.noProjects')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {t('projects.createFirst')}
            </Typography>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
              {t('projects.create')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 3 }}>
          {projects.map((project) => (
            <Card key={project.id} sx={{ borderRadius: 3 }}>
              <CardActionArea onClick={() => handleCardClick(project.id)} sx={{ height: '100%' }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                    <Typography variant="h6" fontWeight={600} noWrap sx={{ flex: 1, mr: 1 }}>
                      {project.name}
                    </Typography>
                    <Chip
                      label={project.status?.replace('_', ' ') || 'active'}
                      size="small"
                      color={STATUS_COLORS[project.status] || 'default'}
                      sx={{ textTransform: 'capitalize', fontWeight: 600, fontSize: '0.7rem' }}
                    />
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {t('projects.code')}: {project.code}
                  </Typography>
                  {project.description && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {project.description}
                    </Typography>
                  )}
                  {project.startDate && (
                    <Typography variant="caption" color="text.disabled">
                      {t('projects.started')}: {formatDate(project.startDate)}
                    </Typography>
                  )}
                </CardContent>
              </CardActionArea>
            </Card>
          ))}
        </Box>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('projects.createProject')}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
          {submitError && <Alert severity="error" sx={{ borderRadius: 2 }}>{submitError}</Alert>}
          <TextField label={t('projects.name')} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required fullWidth />
          <TextField label={t('projects.codeLabel')} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required fullWidth />
          <TextField label={t('projects.description')} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} multiline rows={3} fullWidth />
          <TextField label={t('projects.address')} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} fullWidth />
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <TextField label={t('projects.startDate')} type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} InputLabelProps={{ shrink: true }} fullWidth />
            <TextField label={t('projects.endDate')} type="date" value={form.estimatedEndDate} onChange={(e) => setForm({ ...form, estimatedEndDate: e.target.value })} InputLabelProps={{ shrink: true }} fullWidth />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>{t('common.cancel')}</Button>
          <Button variant="contained" onClick={handleCreate} disabled={submitting || !form.name || !form.code}>
            {submitting ? t('common.creating') : t('projects.create')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
