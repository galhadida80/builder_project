import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getDateLocale } from '../utils/dateLocale'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { DataTable, Column } from '../components/ui/DataTable'
import { StatusBadge } from '../components/ui/StatusBadge'
import { PageHeader } from '../components/ui/Breadcrumbs'
import { SearchField } from '../components/ui/TextField'
import FilterChips from '../components/ui/FilterChips'
import { safetyApi } from '../api/safety'
import { contactsApi } from '../api/contacts'
import type { ToolboxTalk, ToolboxTalkStatus, TalkAttendee } from '../types/safety'
import type { Contact } from '../types'
import { useToast } from '../components/common/ToastProvider'
import { validateRequired, type ValidationError, hasErrors } from '../utils/validation'
import { AddIcon, PersonIcon, CheckCircleIcon, CancelIcon } from '@/icons'
import {
  Box,
  Typography,
  Chip,
  MenuItem,
  Skeleton,
  TextField as MuiTextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useMediaQuery,
  useTheme,
  Stack,
  IconButton,
  Checkbox,
  FormControlLabel,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
} from '@/mui'

const STATUS_COLORS: Record<ToolboxTalkStatus, 'default' | 'success' | 'error'> = {
  scheduled: 'default',
  completed: 'success',
  cancelled: 'error',
}

interface TalkCard {
  talk: ToolboxTalk
  onClick: () => void
}

function TalkCardComponent({ talk, onClick }: TalkCard) {
  const { t } = useTranslation()
  const theme = useTheme()
  const attendedCount = talk.attendees.filter((a) => a.attended).length
  const totalAttendees = talk.attendees.length

  return (
    <Card
      onClick={onClick}
      sx={{
        p: 2,
        cursor: 'pointer',
        '&:hover': { boxShadow: theme.shadows[4] },
      }}
    >
      <Stack spacing={1.5}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Typography variant="subtitle1" fontWeight={600}>
            {talk.title}
          </Typography>
          <StatusBadge status={talk.status} />
        </Box>

        <Typography variant="body2" color="text.secondary">
          {talk.topic}
        </Typography>

        <Box display="flex" gap={2} flexWrap="wrap">
          <Box>
            <Typography variant="caption" color="text.secondary">
              {t('toolboxTalks.scheduledDate')}
            </Typography>
            <Typography variant="body2">
              {new Date(talk.scheduledDate).toLocaleDateString(getDateLocale())}
            </Typography>
          </Box>
          {talk.presenter && (
            <Box>
              <Typography variant="caption" color="text.secondary">
                {t('toolboxTalks.presenter')}
              </Typography>
              <Typography variant="body2">{talk.presenter}</Typography>
            </Box>
          )}
          <Box>
            <Typography variant="caption" color="text.secondary">
              {t('toolboxTalks.attendance')}
            </Typography>
            <Typography variant="body2">
              {attendedCount}/{totalAttendees}
            </Typography>
          </Box>
        </Box>
      </Stack>
    </Card>
  )
}

interface TalkFormData {
  title: string
  topic: string
  description: string
  scheduledDate: string
  scheduledTime: string
  location: string
  presenter: string
  durationMinutes: string
  attendeeIds: string[]
}

export default function ToolboxTalksPage() {
  const { t } = useTranslation()
  const { projectId } = useParams()
  const { showError, showSuccess } = useToast()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  const [talks, setTalks] = useState<ToolboxTalk[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [attendanceDialogOpen, setAttendanceDialogOpen] = useState(false)
  const [editingTalk, setEditingTalk] = useState<ToolboxTalk | null>(null)
  const [selectedTalk, setSelectedTalk] = useState<ToolboxTalk | null>(null)
  const [activeTab, setActiveTab] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formErrors, setFormErrors] = useState<ValidationError>({})
  const [form, setForm] = useState<TalkFormData>({
    title: '',
    topic: '',
    description: '',
    scheduledDate: new Date().toISOString().split('T')[0],
    scheduledTime: '09:00',
    location: '',
    presenter: '',
    durationMinutes: '30',
    attendeeIds: [],
  })
  const [attendanceStates, setAttendanceStates] = useState<Record<string, boolean>>({})

  const validateForm = (data: TalkFormData): ValidationError => {
    const errors: ValidationError = {}
    errors.title = validateRequired(data.title, t('toolboxTalks.title'))
    errors.topic = validateRequired(data.topic, t('toolboxTalks.topic'))
    errors.scheduledDate = validateRequired(data.scheduledDate, t('toolboxTalks.scheduledDate'))
    return errors
  }

  const validateField = (field: string) => {
    const allErrors = validateForm(form)
    setFormErrors((prev) => ({ ...prev, [field]: allErrors[field] || null }))
  }

  useEffect(() => {
    if (projectId) loadReferenceData()
  }, [projectId])

  useEffect(() => {
    if (projectId) loadTalks()
  }, [projectId, activeTab, searchQuery])

  const loadReferenceData = async () => {
    if (!projectId) return
    try {
      const contactList = await contactsApi.list(projectId).catch(() => [])
      setContacts(contactList.filter((c) => c.contactType === 'worker' || c.contactType === 'subcontractor'))
    } catch (error) {
      console.error('Failed to load reference data:', error)
    }
  }

  const loadTalks = async () => {
    if (!projectId) return
    setLoading(true)
    try {
      const params: { status?: ToolboxTalkStatus } = {}
      if (activeTab !== 'all') params.status = activeTab as ToolboxTalkStatus
      const result = await safetyApi.toolboxTalks.list(projectId, params)

      let filtered = result
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        filtered = result.filter(
          (t) =>
            t.title.toLowerCase().includes(query) ||
            t.topic.toLowerCase().includes(query) ||
            t.presenter?.toLowerCase().includes(query)
        )
      }

      setTalks(filtered)
    } catch (error) {
      console.error('Failed to load talks:', error)
      showError(t('toolboxTalks.loadFailed'))
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!projectId) return

    const errors = validateForm(form)
    if (hasErrors(errors)) {
      setFormErrors(errors)
      return
    }

    setSubmitting(true)
    try {
      const scheduledDateTime = `${form.scheduledDate}T${form.scheduledTime}:00`

      await safetyApi.toolboxTalks.create(projectId, {
        title: form.title,
        topic: form.topic,
        description: form.description || undefined,
        scheduledDate: scheduledDateTime,
        location: form.location || undefined,
        presenter: form.presenter || undefined,
        durationMinutes: form.durationMinutes ? parseInt(form.durationMinutes) : undefined,
        attendeeIds: form.attendeeIds.length > 0 ? form.attendeeIds : undefined,
      })

      showSuccess(t('toolboxTalks.createSuccess'))
      setDialogOpen(false)
      resetForm()
      loadTalks()
    } catch (error) {
      console.error('Failed to create talk:', error)
      showError(t('toolboxTalks.createFailed'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdate = async () => {
    if (!projectId || !editingTalk) return

    const errors = validateForm(form)
    if (hasErrors(errors)) {
      setFormErrors(errors)
      return
    }

    setSubmitting(true)
    try {
      const scheduledDateTime = `${form.scheduledDate}T${form.scheduledTime}:00`

      await safetyApi.toolboxTalks.update(editingTalk.id, {
        title: form.title,
        topic: form.topic,
        description: form.description || undefined,
        scheduledDate: scheduledDateTime,
        location: form.location || undefined,
        presenter: form.presenter || undefined,
        durationMinutes: form.durationMinutes ? parseInt(form.durationMinutes) : undefined,
        attendeeIds: form.attendeeIds.length > 0 ? form.attendeeIds : undefined,
      })

      showSuccess(t('toolboxTalks.updateSuccess'))
      setDialogOpen(false)
      setEditingTalk(null)
      resetForm()
      loadTalks()
    } catch (error) {
      console.error('Failed to update talk:', error)
      showError(t('toolboxTalks.updateFailed'))
    } finally {
      setSubmitting(false)
    }
  }

  const resetForm = () => {
    setForm({
      title: '',
      topic: '',
      description: '',
      scheduledDate: new Date().toISOString().split('T')[0],
      scheduledTime: '09:00',
      location: '',
      presenter: '',
      durationMinutes: '30',
      attendeeIds: [],
    })
    setFormErrors({})
  }

  const handleEdit = (talk: ToolboxTalk) => {
    setEditingTalk(talk)
    const dateTime = new Date(talk.scheduledDate)
    setForm({
      title: talk.title,
      topic: talk.topic,
      description: talk.description || '',
      scheduledDate: talk.scheduledDate.split('T')[0],
      scheduledTime: talk.scheduledDate.split('T')[1]?.substring(0, 5) || '09:00',
      location: talk.location || '',
      presenter: talk.presenter || '',
      durationMinutes: talk.durationMinutes?.toString() || '30',
      attendeeIds: talk.attendees.map((a) => a.workerId || '').filter(Boolean),
    })
    setDialogOpen(true)
  }

  const handleDialogClose = () => {
    setDialogOpen(false)
    setEditingTalk(null)
    resetForm()
  }

  const handleManageAttendance = (talk: ToolboxTalk) => {
    setSelectedTalk(talk)
    const states: Record<string, boolean> = {}
    talk.attendees.forEach((a) => {
      states[a.id] = a.attended
    })
    setAttendanceStates(states)
    setAttendanceDialogOpen(true)
  }

  const handleAttendanceToggle = async (attendeeId: string) => {
    if (!selectedTalk) return

    const newAttended = !attendanceStates[attendeeId]
    setAttendanceStates((prev) => ({ ...prev, [attendeeId]: newAttended }))

    try {
      await safetyApi.toolboxTalks.updateAttendance(selectedTalk.id, attendeeId, newAttended)
      showSuccess(t('toolboxTalks.attendanceUpdated'))
      loadTalks()
    } catch (error) {
      console.error('Failed to update attendance:', error)
      showError(t('toolboxTalks.attendanceFailed'))
      setAttendanceStates((prev) => ({ ...prev, [attendeeId]: !newAttended }))
    }
  }

  const filterItems = [
    { label: t('toolboxTalks.tabs.all'), value: 'all' },
    { label: t('toolboxTalks.tabs.scheduled'), value: 'scheduled' },
    { label: t('toolboxTalks.tabs.completed'), value: 'completed' },
    { label: t('toolboxTalks.tabs.cancelled'), value: 'cancelled' },
  ]

  const columns: Column<ToolboxTalk>[] = [
    {
      id: 'title',
      label: t('toolboxTalks.title'),
      render: (talk) => talk.title,
    },
    {
      id: 'topic',
      label: t('toolboxTalks.topic'),
      render: (talk) => talk.topic,
    },
    {
      id: 'scheduledDate',
      label: t('toolboxTalks.scheduledDate'),
      render: (talk) => new Date(talk.scheduledDate).toLocaleDateString(getDateLocale()),
    },
    {
      id: 'presenter',
      label: t('toolboxTalks.presenter'),
      render: (talk) => talk.presenter || '—',
    },
    {
      id: 'attendance',
      label: t('toolboxTalks.attendance'),
      render: (talk) => {
        const attended = talk.attendees.filter((a) => a.attended).length
        const total = talk.attendees.length
        return `${attended}/${total}`
      },
    },
    {
      id: 'status',
      label: t('common.status'),
      render: (talk) => <StatusBadge status={talk.status} />,
    },
    {
      id: 'actions',
      label: t('common.actions'),
      render: (talk) => (
        <Button size="small" onClick={(e) => {
          e.stopPropagation()
          handleManageAttendance(talk)
        }} startIcon={<PersonIcon />}>
          {t('toolboxTalks.manageAttendance')}
        </Button>
      ),
    },
  ]

  return (
    <Box>
      <PageHeader
        title={t('toolboxTalks.title')}
        actions={
          <Button onClick={() => setDialogOpen(true)} startIcon={<AddIcon />}>
            {t('toolboxTalks.createNew')}
          </Button>
        }
      />

      {loading ? (
        <Card sx={{ p: 3 }}>
          <Skeleton variant="rectangular" height={60} sx={{ mb: 2 }} />
          <Skeleton variant="rectangular" height={400} />
        </Card>
      ) : (
        <Card sx={{ p: isMobile ? 2 : 3 }}>
          <Box mb={3}>
            <SearchField
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('toolboxTalks.searchPlaceholder')}
            />
          </Box>

          <FilterChips items={filterItems} value={activeTab} onChange={setActiveTab} />

          {talks.length === 0 ? (
            <Box py={8} textAlign="center">
              <Typography variant="h6" color="text.secondary" gutterBottom>
                {t('toolboxTalks.noTalks')}
              </Typography>
            </Box>
          ) : isMobile ? (
            <Stack spacing={2}>
              {talks.map((talk) => (
                <Box key={talk.id}>
                  <TalkCardComponent talk={talk} onClick={() => handleEdit(talk)} />
                  <Box mt={1} display="flex" justifyContent="flex-end">
                    <Button size="small" onClick={() => handleManageAttendance(talk)} startIcon={<PersonIcon />}>
                      {t('toolboxTalks.manageAttendance')}
                    </Button>
                  </Box>
                </Box>
              ))}
            </Stack>
          ) : (
            <DataTable
              columns={columns}
              rows={talks}
              getRowId={(talk) => talk.id}
              onRowClick={handleEdit}
            />
          )}
        </Card>
      )}

      <Dialog open={dialogOpen} onClose={handleDialogClose} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingTalk ? t('toolboxTalks.editTalk') : t('toolboxTalks.createNew')}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <MuiTextField
              label={t('toolboxTalks.title')}
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              onBlur={() => validateField('title')}
              error={!!formErrors.title}
              helperText={formErrors.title}
              required
              fullWidth
            />

            <MuiTextField
              label={t('toolboxTalks.topic')}
              value={form.topic}
              onChange={(e) => setForm({ ...form, topic: e.target.value })}
              onBlur={() => validateField('topic')}
              error={!!formErrors.topic}
              helperText={formErrors.topic}
              required
              fullWidth
            />

            <MuiTextField
              label={t('toolboxTalks.description')}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              multiline
              rows={3}
              fullWidth
            />

            <Box display="flex" gap={2}>
              <MuiTextField
                type="date"
                label={t('toolboxTalks.scheduledDate')}
                value={form.scheduledDate}
                onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })}
                onBlur={() => validateField('scheduledDate')}
                error={!!formErrors.scheduledDate}
                helperText={formErrors.scheduledDate}
                InputLabelProps={{ shrink: true }}
                required
                fullWidth
              />

              <MuiTextField
                type="time"
                label={t('toolboxTalks.scheduledTime')}
                value={form.scheduledTime}
                onChange={(e) => setForm({ ...form, scheduledTime: e.target.value })}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
            </Box>

            <MuiTextField
              label={t('toolboxTalks.location')}
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              fullWidth
            />

            <MuiTextField
              label={t('toolboxTalks.presenter')}
              value={form.presenter}
              onChange={(e) => setForm({ ...form, presenter: e.target.value })}
              fullWidth
            />

            <MuiTextField
              type="number"
              label={t('toolboxTalks.durationMinutes')}
              value={form.durationMinutes}
              onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })}
              fullWidth
            />

            <MuiTextField
              select
              label={t('toolboxTalks.attendees')}
              value={form.attendeeIds}
              onChange={(e) => {
                const value = e.target.value
                setForm({ ...form, attendeeIds: typeof value === 'string' ? [value] : value })
              }}
              SelectProps={{ multiple: true }}
              fullWidth
            >
              {contacts.map((contact) => (
                <MenuItem key={contact.id} value={contact.id}>
                  {contact.contactName} {contact.companyName ? `(${contact.companyName})` : ''}
                </MenuItem>
              ))}
            </MuiTextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose} disabled={submitting}>
            {t('common.cancel')}
          </Button>
          <Button onClick={editingTalk ? handleUpdate : handleCreate} variant="primary" disabled={submitting}>
            {editingTalk ? t('common.update') : t('common.create')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={attendanceDialogOpen}
        onClose={() => setAttendanceDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{t('toolboxTalks.manageAttendance')}</DialogTitle>
        <DialogContent>
          {selectedTalk && (
            <>
              <Typography variant="subtitle1" gutterBottom>
                {selectedTalk.title}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {t('toolboxTalks.scheduledDate')}:{' '}
                {new Date(selectedTalk.scheduledDate).toLocaleDateString(getDateLocale())}
              </Typography>
              <Divider sx={{ my: 2 }} />
              <List>
                {selectedTalk.attendees.map((attendee) => (
                  <ListItem key={attendee.id}>
                    <ListItemText
                      primary={attendee.workerName || t('common.unknown')}
                      secondary={attendee.signedAt ? `Signed: ${new Date(attendee.signedAt).toLocaleString(getDateLocale())}` : null}
                    />
                    <ListItemSecondaryAction>
                      <IconButton
                        edge="end"
                        onClick={() => handleAttendanceToggle(attendee.id)}
                        color={attendanceStates[attendee.id] ? 'success' : 'default'}
                      >
                        {attendanceStates[attendee.id] ? <CheckCircleIcon /> : <CancelIcon />}
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
                {selectedTalk.attendees.length === 0 && (
                  <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 2 }}>
                    {t('toolboxTalks.noAttendees')}
                  </Typography>
                )}
              </List>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAttendanceDialogOpen(false)}>{t('common.close')}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
