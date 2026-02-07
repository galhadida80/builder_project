'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
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

interface RFI {
  id: string
  rfiNumber?: string
  subject: string
  question?: string
  toEmail?: string
  toName?: string
  category?: string
  priority?: string
  status?: string
  createdAt?: string
  dueDate?: string
}

const CATEGORIES = ['design', 'structural', 'mep', 'architectural', 'specifications', 'schedule', 'cost', 'other']
const PRIORITIES = ['low', 'medium', 'high', 'urgent']

const PRIORITY_CHIP: Record<string, 'default' | 'info' | 'warning' | 'error'> = {
  low: 'default',
  medium: 'info',
  high: 'warning',
  urgent: 'error',
}

const STATUS_CHIP: Record<string, 'warning' | 'success' | 'default' | 'info'> = {
  draft: 'default',
  open: 'warning',
  waiting_response: 'info',
  answered: 'success',
  closed: 'default',
}

const INITIAL_FORM = { subject: '', question: '', to_email: '', to_name: '', category: '', priority: '', due_date: '' }

function formatDate(dateStr?: string): string {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

export default function RFIsPage() {
  const t = useTranslations()
  const router = useRouter()
  const params = useParams()!
  const projectId = params.projectId as string
  const [rfis, setRfis] = useState<RFI[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState(INITIAL_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const loadRFIs = useCallback(async () => {
    try {
      setLoading(true)
      const res = await apiClient.get(`/projects/${projectId}/rfis`)
      setRfis(res.data?.items || res.data || [])
    } catch {
      setError(t('pages.rfis.messages.failedToLoad'))
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => { loadRFIs() }, [loadRFIs])

  const handleCreate = async () => {
    if (!form.subject || !form.question || !form.to_email) return
    try {
      setSubmitting(true)
      setSubmitError('')
      const payload: Record<string, string | undefined> = {
        subject: form.subject,
        question: form.question,
        to_email: form.to_email,
        to_name: form.to_name || undefined,
        category: form.category || 'other',
        priority: form.priority || 'medium',
        due_date: form.due_date || undefined,
      }
      await apiClient.post(`/projects/${projectId}/rfis`, payload)
      setDialogOpen(false)
      setForm(INITIAL_FORM)
      await loadRFIs()
    } catch {
      setSubmitError(t('pages.rfis.messages.failedToSend'))
    } finally {
      setSubmitting(false)
    }
  }

  const total = rfis.length
  const open = rfis.filter(r => r.status === 'open' || r.status === 'waiting_response').length
  const answered = rfis.filter(r => r.status === 'answered').length

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
          <Typography variant="h4" fontWeight={700}>{t('rfis.title')}</Typography>
          <Typography variant="body1" color="text.secondary">{t('rfis.subtitle')}</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
          {t('rfis.addRfi')}
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{error}</Alert>}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 3, mb: 3 }}>
        {[
          { label: t('rfis.total'), value: total, color: 'primary.main' },
          { label: t('rfis.open'), value: open, color: 'warning.main' },
          { label: t('rfis.answered'), value: answered, color: 'success.main' },
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
              <TableCell>#</TableCell>
              <TableCell>Subject</TableCell>
              <TableCell>To</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Priority</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Due Date</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rfis.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} sx={{ textAlign: 'center', py: 6 }}>
                  <Typography variant="body2" color="text.secondary">No RFIs yet</Typography>
                </TableCell>
              </TableRow>
            ) : (
              rfis.map((rfi) => (
                <TableRow
                  key={rfi.id}
                  hover
                  onClick={() => router.push(`/projects/${projectId}/rfis/${rfi.id}`)}
                  sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                >
                  <TableCell><Typography variant="body2" color="text.secondary">{rfi.rfiNumber || '-'}</Typography></TableCell>
                  <TableCell><Typography variant="body2" fontWeight={500}>{rfi.subject}</Typography></TableCell>
                  <TableCell><Typography variant="body2" color="text.secondary">{rfi.toName || rfi.toEmail || '-'}</Typography></TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
                      {rfi.category || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={rfi.priority || 'medium'}
                      size="small"
                      color={PRIORITY_CHIP[rfi.priority || ''] || 'default'}
                      sx={{ textTransform: 'capitalize', fontWeight: 600, fontSize: '0.7rem' }}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={(rfi.status || 'draft').replace('_', ' ')}
                      size="small"
                      color={STATUS_CHIP[rfi.status || ''] || 'default'}
                      sx={{ textTransform: 'capitalize', fontWeight: 600, fontSize: '0.7rem' }}
                    />
                  </TableCell>
                  <TableCell><Typography variant="body2" color="text.secondary">{formatDate(rfi.dueDate)}</Typography></TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('rfis.addRfi')}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
          {submitError && <Alert severity="error" sx={{ borderRadius: 2 }}>{submitError}</Alert>}
          <TextField label="Subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} required fullWidth />
          <TextField label="Question" value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} multiline rows={3} required fullWidth />
          <TextField label="To Email" value={form.to_email} onChange={(e) => setForm({ ...form, to_email: e.target.value })} type="email" required fullWidth />
          <TextField label="To Name" value={form.to_name} onChange={(e) => setForm({ ...form, to_name: e.target.value })} fullWidth />
          <TextField label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} select fullWidth>
            {CATEGORIES.map((cat) => (
              <MenuItem key={cat} value={cat} sx={{ textTransform: 'capitalize' }}>{cat}</MenuItem>
            ))}
          </TextField>
          <TextField label="Priority" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} select fullWidth>
            {PRIORITIES.map((p) => (
              <MenuItem key={p} value={p} sx={{ textTransform: 'capitalize' }}>{p}</MenuItem>
            ))}
          </TextField>
          <TextField
            label="Due Date"
            type="date"
            value={form.due_date}
            onChange={(e) => setForm({ ...form, due_date: e.target.value })}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>{t('common.cancel')}</Button>
          <Button variant="contained" onClick={handleCreate} disabled={submitting || !form.subject || !form.question || !form.to_email}>
            {submitting ? t('common.creating') : t('common.create')}
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  )
}
