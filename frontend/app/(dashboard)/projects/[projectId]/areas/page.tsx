'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Chip from '@mui/material/Chip'
import Skeleton from '@mui/material/Skeleton'
import Alert from '@mui/material/Alert'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import LinearProgress from '@mui/material/LinearProgress'
import AddIcon from '@mui/icons-material/Add'
import { apiClient } from '@/lib/api/client'

interface Area {
  id: string
  name: string
  description?: string
  floor?: string
  area_type?: string
  status?: string
  progress?: number
}

const AREA_TYPES = ['apartment', 'floor', 'building', 'common_area', 'parking', 'lobby']

const STATUS_COLORS: Record<string, 'success' | 'warning' | 'info' | 'default'> = {
  completed: 'success',
  in_progress: 'warning',
  planned: 'info',
}

const INITIAL_FORM = { name: '', area_type: '', floor_number: '', area_code: '', total_units: '1' }

export default function AreasPage() {
  const t = useTranslations()
  const params = useParams()!
  const projectId = params.projectId as string
  const [areas, setAreas] = useState<Area[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState(INITIAL_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const loadAreas = useCallback(async () => {
    try {
      setLoading(true)
      const res = await apiClient.get(`/projects/${projectId}/areas`)
      setAreas(res.data || [])
    } catch {
      setError(t('errors.serverError'))
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => { loadAreas() }, [loadAreas])

  const handleCreate = async () => {
    if (!form.name) return
    try {
      setSubmitting(true)
      setSubmitError('')
      await apiClient.post(`/projects/${projectId}/areas`, {
        name: form.name,
        area_type: form.area_type || undefined,
        floor_number: form.floor_number ? parseInt(form.floor_number) : undefined,
        area_code: form.area_code || undefined,
        total_units: form.total_units ? parseInt(form.total_units) : 1,
      })
      setDialogOpen(false)
      setForm(INITIAL_FORM)
      await loadAreas()
    } catch {
      setSubmitError(t('errors.serverError'))
    } finally {
      setSubmitting(false)
    }
  }

  const totalAreas = areas.length
  const inProgress = areas.filter(a => a.status === 'in_progress').length
  const completed = areas.filter(a => a.status === 'completed').length

  if (loading) {
    return (
      <Box sx={{ p: 3, width: '100%' }}>
        <Skeleton variant="text" width={250} height={48} sx={{ mb: 1 }} />
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 3, mb: 3 }}>
          {[...Array(3)].map((_, i) => <Skeleton key={i} variant="rounded" height={100} sx={{ borderRadius: 3 }} />)}
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 3 }}>
          {[...Array(6)].map((_, i) => <Skeleton key={i} variant="rounded" height={180} sx={{ borderRadius: 3 }} />)}
        </Box>
      </Box>
    )
  }

  return (
    <Box sx={{ p: 3, width: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 4 }}>
        <Box>
          <Typography variant="h4" fontWeight={700}>{t('areas.title')}</Typography>
          <Typography variant="body1" color="text.secondary">{t('areas.subtitle')}</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
          {t('areas.addArea')}
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{error}</Alert>}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 3, mb: 3 }}>
        {[
          { label: t('areas.total'), value: totalAreas, color: 'primary.main' },
          { label: t('areas.inProgress'), value: inProgress, color: 'warning.main' },
          { label: t('areas.completed'), value: completed, color: 'success.main' },
        ].map((kpi) => (
          <Card key={kpi.label} sx={{ borderRadius: 3 }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="h4" fontWeight={700} color={kpi.color}>{kpi.value}</Typography>
              <Typography variant="body2" color="text.secondary">{kpi.label}</Typography>
            </CardContent>
          </Card>
        ))}
      </Box>

      {areas.length === 0 ? (
        <Card sx={{ borderRadius: 3 }}>
          <CardContent sx={{ textAlign: 'center', py: 8 }}>
            <AddIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" fontWeight={600} sx={{ mb: 1 }}>{t('areas.noAreasYet')}</Typography>
            <Typography variant="body2" color="text.secondary">{t('areas.createFirstArea')}</Typography>
          </CardContent>
        </Card>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 3 }}>
          {areas.map((area) => (
          <Card key={area.id} sx={{ borderRadius: 3 }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                <Typography variant="h6" fontWeight={600} noWrap sx={{ flex: 1, mr: 1 }}>{area.name}</Typography>
                <Chip
                  label={area.status?.replace('_', ' ') || 'planned'}
                  size="small"
                  color={STATUS_COLORS[area.status || ''] || 'default'}
                  sx={{ textTransform: 'capitalize', fontWeight: 600, fontSize: '0.7rem' }}
                />
              </Box>
              {area.description && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {area.description}
                </Typography>
              )}
              <Box sx={{ display: 'flex', gap: 2, mb: 1.5 }}>
                {area.floor && <Typography variant="caption" color="text.secondary">{t('areas.floor')}: {area.floor}</Typography>}
                {area.area_type && (
                  <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
                    {area.area_type.replace('_', ' ')}
                  </Typography>
                )}
              </Box>
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="caption" color="text.secondary">{t('areas.progress')}</Typography>
                  <Typography variant="caption" fontWeight={600}>{area.progress ?? 0}%</Typography>
                </Box>
                <LinearProgress variant="determinate" value={area.progress ?? 0} sx={{ height: 6, borderRadius: 3 }} />
              </Box>
            </CardContent>
          </Card>
          ))}
        </Box>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('areas.addArea')}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
          {submitError && <Alert severity="error" sx={{ borderRadius: 2 }}>{submitError}</Alert>}
          <TextField label={t('areas.name')} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required fullWidth />
          <TextField label={t('areas.areaType')} value={form.area_type} onChange={(e) => setForm({ ...form, area_type: e.target.value })} select fullWidth>
            {AREA_TYPES.map((type) => (
              <MenuItem key={type} value={type} sx={{ textTransform: 'capitalize' }}>{type.replace('_', ' ')}</MenuItem>
            ))}
          </TextField>
          <TextField label={t('areas.floorNumber')} value={form.floor_number} onChange={(e) => setForm({ ...form, floor_number: e.target.value })} type="number" fullWidth />
          <TextField label={t('areas.areaCode')} value={form.area_code} onChange={(e) => setForm({ ...form, area_code: e.target.value })} fullWidth />
          <TextField label={t('areas.totalUnits')} value={form.total_units} onChange={(e) => setForm({ ...form, total_units: e.target.value })} type="number" fullWidth />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>{t('common.cancel')}</Button>
          <Button variant="contained" onClick={handleCreate} disabled={submitting || !form.name}>
            {submitting ? t('common.creating') : t('common.create')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
