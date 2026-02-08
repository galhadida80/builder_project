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
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import InputLabel from '@mui/material/InputLabel'
import FormControl from '@mui/material/FormControl'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Skeleton from '@mui/material/Skeleton'
import Alert from '@mui/material/Alert'
import AddIcon from '@mui/icons-material/Add'
import EventIcon from '@mui/icons-material/Event'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ScheduleIcon from '@mui/icons-material/Schedule'
import LocationOnIcon from '@mui/icons-material/LocationOn'
import { apiClient } from '@/lib/api/client'

interface Meeting {
  id: string
  title: string
  meeting_type: string
  scheduled_date: string
  location?: string
  status: string
  agenda?: string
}

const MEETING_TYPES = ['site_inspection', 'approval_meeting', 'coordination', 'safety_review', 'other']

const STATUS_CHIP: Record<string, 'default' | 'warning' | 'success' | 'info'> = {
  scheduled: 'info',
  completed: 'success',
  cancelled: 'default',
  invitations_sent: 'warning',
}

const INITIAL_FORM = { title: '', meeting_type: '', scheduled_date: '', location: '', description: '' }

export default function MeetingsPage() {
  const t = useTranslations()
  const params = useParams()!
  const projectId = params.projectId as string
  const [items, setItems] = useState<Meeting[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState(INITIAL_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const res = await apiClient.get(`/meetings?project_id=${projectId}`)
      setItems(res.data || [])
    } catch {
      setError(t('meetings.failedToLoadMeetings'))
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleCreate = async () => {
    if (!form.title || !form.meeting_type || !form.scheduled_date) return
    try {
      setSubmitting(true)
      setSubmitError('')
      await apiClient.post(`/projects/${projectId}/meetings`, {
        title: form.title,
        meeting_type: form.meeting_type,
        scheduled_date: new Date(form.scheduled_date).toISOString(),
        location: form.location || undefined,
        description: form.description || undefined,
      })
      setDialogOpen(false)
      setForm(INITIAL_FORM)
      await loadData()
    } catch {
      setSubmitError(t('meetings.failedToCreateMeeting'))
    } finally {
      setSubmitting(false)
    }
  }

  const upcoming = items.filter((m) => m.status === 'scheduled' || m.status === 'invitations_sent').length
  const completed = items.filter((m) => m.status === 'completed').length

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })

  if (loading) {
    return (
      <Box sx={{ p: 3, width: '100%' }}>
        <Skeleton variant="text" width={250} height={48} sx={{ mb: 2 }} />
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 3, mb: 3 }}>
          {[0, 1, 2].map((i) => <Skeleton key={i} variant="rounded" height={100} sx={{ borderRadius: 3 }} />)}
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 3 }}>
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} variant="rounded" height={160} sx={{ borderRadius: 3 }} />)}
        </Box>
      </Box>
    )
  }

  return (
    <Box sx={{ p: 3, width: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={700}>{t('meetings.title')}</Typography>
          <Typography variant="body1" color="text.secondary">
            {t('meetings.subtitle')}
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
          {t('meetings.scheduleMeeting')}
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{error}</Alert>}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 3, mb: 3 }}>
        <Card sx={{ borderRadius: 3 }}>
          <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <EventIcon color="primary" />
            <Box>
              <Typography variant="h5" fontWeight={700}>{items.length}</Typography>
              <Typography variant="body2" color="text.secondary">{t('meetings.totalMeetings')}</Typography>
            </Box>
          </CardContent>
        </Card>
        <Card sx={{ borderRadius: 3 }}>
          <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <ScheduleIcon color="info" />
            <Box>
              <Typography variant="h5" fontWeight={700}>{upcoming}</Typography>
              <Typography variant="body2" color="text.secondary">{t('meetings.upcoming')}</Typography>
            </Box>
          </CardContent>
        </Card>
        <Card sx={{ borderRadius: 3 }}>
          <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <CheckCircleIcon color="success" />
            <Box>
              <Typography variant="h5" fontWeight={700}>{completed}</Typography>
              <Typography variant="body2" color="text.secondary">{t('meetings.completed')}</Typography>
            </Box>
          </CardContent>
        </Card>
      </Box>

      {items.length === 0 ? (
        <Card sx={{ borderRadius: 3 }}>
          <CardContent sx={{ textAlign: 'center', py: 8 }}>
            <EventIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" fontWeight={600} sx={{ mb: 1 }}>{t('meetings.noMeetingsScheduled')}</Typography>
            <Typography variant="body2" color="text.secondary">{t('meetings.scheduleFirst')}</Typography>
          </CardContent>
        </Card>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 3 }}>
          {items.map((meeting) => (
            <Card key={meeting.id} sx={{ borderRadius: 3, cursor: 'pointer', transition: 'all 200ms', '&:hover': { boxShadow: 3 } }}>
              <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                  <Typography variant="h6" fontWeight={600} noWrap sx={{ flex: 1, mr: 1 }}>
                    {meeting.title}
                  </Typography>
                  <Chip
                    label={meeting.status?.replace('_', ' ')}
                    size="small"
                    color={STATUS_CHIP[meeting.status] || 'default'}
                    sx={{ textTransform: 'capitalize', fontWeight: 600 }}
                  />
                </Box>
                <Chip
                  label={meeting.meeting_type?.replace('_', ' ')}
                  size="small"
                  variant="outlined"
                  sx={{ textTransform: 'capitalize', mb: 1.5 }}
                />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                  <ScheduleIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                  <Typography variant="body2" color="text.secondary">{formatDate(meeting.scheduled_date)}</Typography>
                </Box>
                {meeting.location && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <LocationOnIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary">{meeting.location}</Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('meetings.scheduleMeeting')}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
          {submitError && <Alert severity="error" sx={{ borderRadius: 2 }}>{submitError}</Alert>}
          <TextField label={t('meetings.meetingTitle')} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required fullWidth />
          <FormControl fullWidth required>
            <InputLabel>{t('meetings.type')}</InputLabel>
            <Select value={form.meeting_type} label={t('meetings.type')} onChange={(e) => setForm({ ...form, meeting_type: e.target.value })}>
              {MEETING_TYPES.map((type) => (
                <MenuItem key={type} value={type} sx={{ textTransform: 'capitalize' }}>
                  {type.replace('_', ' ')}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label={t('meetings.scheduledDateTime')}
            type="datetime-local"
            value={form.scheduled_date}
            onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })}
            InputLabelProps={{ shrink: true }}
            required
            fullWidth
          />
          <TextField label={t('meetings.location')} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} fullWidth />
          <TextField label={t('meetings.description')} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} multiline rows={3} fullWidth />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>{t('common.cancel')}</Button>
          <Button variant="contained" onClick={handleCreate} disabled={submitting || !form.title || !form.meeting_type || !form.scheduled_date}>
            {submitting ? t('meetings.scheduling') : t('meetings.schedule')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
