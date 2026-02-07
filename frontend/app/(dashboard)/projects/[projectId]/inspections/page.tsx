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
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Paper from '@mui/material/Paper'
import AddIcon from '@mui/icons-material/Add'
import { apiClient } from '@/lib/api/client'

interface ConsultantType {
  id: string
  name: string
  nameEn?: string
}

interface Inspection {
  id: string
  consultantTypeId?: string
  consultantType?: ConsultantType
  status?: string
  scheduledDate?: string
  currentStage?: string
  notes?: string
}

const STATUS_CHIP: Record<string, 'info' | 'warning' | 'success' | 'error' | 'default'> = {
  pending: 'info',
  scheduled: 'info',
  in_progress: 'warning',
  completed: 'success',
  cancelled: 'error',
  failed: 'error',
}

const INITIAL_FORM = { consultant_type_id: '', scheduled_date: '', notes: '' }

function formatDate(dateStr?: string): string {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

export default function InspectionsPage() {
  const t = useTranslations()
  const params = useParams()!
  const projectId = params.projectId as string
  const [inspections, setInspections] = useState<Inspection[]>([])
  const [consultantTypes, setConsultantTypes] = useState<ConsultantType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState(INITIAL_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const [inspRes, typesRes] = await Promise.allSettled([
        apiClient.get(`/projects/${projectId}/inspections`),
        apiClient.get('/inspection-consultant-types'),
      ])
      if (inspRes.status === 'fulfilled') setInspections(inspRes.value.data || [])
      if (typesRes.status === 'fulfilled') setConsultantTypes(typesRes.value.data || [])
    } catch {
      setError(t('errors.serverError'))
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => { loadData() }, [loadData])

  const handleCreate = async () => {
    if (!form.consultant_type_id || !form.scheduled_date) return
    try {
      setSubmitting(true)
      setSubmitError('')
      await apiClient.post(`/projects/${projectId}/inspections`, {
        consultant_type_id: form.consultant_type_id,
        scheduled_date: new Date(form.scheduled_date).toISOString(),
        notes: form.notes || undefined,
      })
      setDialogOpen(false)
      setForm(INITIAL_FORM)
      await loadData()
    } catch {
      setSubmitError(t('errors.serverError'))
    } finally {
      setSubmitting(false)
    }
  }

  const getConsultantName = (inspection: Inspection) => {
    if (inspection.consultantType?.nameEn) return inspection.consultantType.nameEn
    if (inspection.consultantType?.name) return inspection.consultantType.name
    const ct = consultantTypes.find(t => t.id === inspection.consultantTypeId)
    return ct?.nameEn || ct?.name || '-'
  }

  const total = inspections.length
  const pending = inspections.filter(i => i.status === 'pending' || i.status === 'scheduled').length
  const completed = inspections.filter(i => i.status === 'completed').length

  if (loading) {
    return (
      <Box sx={{ p: 3, width: '100%' }}>
        <Skeleton variant="text" width={250} height={48} sx={{ mb: 1 }} />
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 3, mb: 3 }}>
          {[...Array(3)].map((_, i) => <Skeleton key={i} variant="rounded" height={100} sx={{ borderRadius: 3 }} />)}
        </Box>
        <Skeleton variant="rounded" height={400} sx={{ borderRadius: 3 }} />
      </Box>
    )
  }

  return (
    <Box sx={{ p: 3, width: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 4 }}>
        <Box>
          <Typography variant="h4" fontWeight={700}>{t('inspections.title')}</Typography>
          <Typography variant="body1" color="text.secondary">{t('inspections.subtitle')}</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
          {t('inspections.addInspection')}
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{error}</Alert>}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 3, mb: 3 }}>
        {[
          { label: t('inspections.total'), value: total, color: 'primary.main' },
          { label: t('inspections.scheduled'), value: pending, color: 'info.main' },
          { label: t('inspections.completed'), value: completed, color: 'success.main' },
        ].map((kpi) => (
          <Card key={kpi.label} sx={{ borderRadius: 3 }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="h4" fontWeight={700} color={kpi.color}>{kpi.value}</Typography>
              <Typography variant="body2" color="text.secondary">{kpi.label}</Typography>
            </CardContent>
          </Card>
        ))}
      </Box>

      <TableContainer component={Paper} sx={{ borderRadius: 3 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>{t('inspections.consultantType')}</TableCell>
              <TableCell>{t('inspections.status')}</TableCell>
              <TableCell>{t('inspections.scheduledDate')}</TableCell>
              <TableCell>{t('inspections.stage')}</TableCell>
              <TableCell>{t('inspections.notes')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {inspections.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} sx={{ textAlign: 'center', py: 6 }}>
                  <Typography variant="body2" color="text.secondary">{t('inspections.noInspectionsYet')}</Typography>
                </TableCell>
              </TableRow>
            ) : (
              inspections.map((ins) => (
                <TableRow key={ins.id} hover>
                  <TableCell><Typography variant="body2" fontWeight={500}>{getConsultantName(ins)}</Typography></TableCell>
                  <TableCell>
                    <Chip
                      label={(ins.status || 'pending').replace('_', ' ')}
                      size="small"
                      color={STATUS_CHIP[ins.status || ''] || 'default'}
                      sx={{ textTransform: 'capitalize', fontWeight: 600, fontSize: '0.7rem' }}
                    />
                  </TableCell>
                  <TableCell><Typography variant="body2" color="text.secondary">{formatDate(ins.scheduledDate)}</Typography></TableCell>
                  <TableCell><Typography variant="body2" color="text.secondary">{ins.currentStage || '-'}</Typography></TableCell>
                  <TableCell><Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 200 }}>{ins.notes || '-'}</Typography></TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('inspections.addInspection')}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
          {submitError && <Alert severity="error" sx={{ borderRadius: 2 }}>{submitError}</Alert>}
          <TextField
            label={t('inspections.consultantType')}
            value={form.consultant_type_id}
            onChange={(e) => setForm({ ...form, consultant_type_id: e.target.value })}
            select
            required
            fullWidth
          >
            {consultantTypes.map((ct) => (
              <MenuItem key={ct.id} value={ct.id}>{ct.nameEn || ct.name}</MenuItem>
            ))}
          </TextField>
          <TextField
            label={t('inspections.scheduledDate')}
            type="date"
            value={form.scheduled_date}
            onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })}
            InputLabelProps={{ shrink: true }}
            required
            fullWidth
          />
          <TextField label={t('inspections.notes')} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} multiline rows={3} fullWidth />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>{t('common.cancel')}</Button>
          <Button variant="contained" onClick={handleCreate} disabled={submitting || !form.consultant_type_id || !form.scheduled_date}>
            {submitting ? t('common.creating') : t('common.create')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
