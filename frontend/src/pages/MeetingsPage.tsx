import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import MenuItem from '@mui/material/MenuItem'
import MuiTextField from '@mui/material/TextField'
import Skeleton from '@mui/material/Skeleton'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import Drawer from '@mui/material/Drawer'
import Divider from '@mui/material/Divider'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import EventIcon from '@mui/icons-material/Event'
import LocationOnIcon from '@mui/icons-material/LocationOn'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import SyncIcon from '@mui/icons-material/Sync'
import CloseIcon from '@mui/icons-material/Close'
import { Card, KPICard } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { StatusBadge } from '../components/ui/StatusBadge'
import { PageHeader } from '../components/ui/Breadcrumbs'
import { TextField } from '../components/ui/TextField'
import { FormModal, ConfirmModal } from '../components/ui/Modal'
import { Tabs } from '../components/ui/Tabs'
import { EmptyState } from '../components/ui/EmptyState'
import { AvatarGroup } from '../components/ui/Avatar'
import { meetingsApi } from '../api/meetings'
import type { Meeting } from '../types'
import { validateMeetingForm, hasErrors, type ValidationError } from '../utils/validation'
import { useToast } from '../components/common/ToastProvider'

const meetingTypes = [
  { value: 'site_inspection', label: 'Site Inspection' },
  { value: 'approval_meeting', label: 'Approval Meeting' },
  { value: 'coordination', label: 'Coordination' },
  { value: 'safety_review', label: 'Safety Review' },
  { value: 'other', label: 'Other' },
]

export default function MeetingsPage() {
  const { projectId } = useParams()
  const { showError, showSuccess } = useToast()
  const [loading, setLoading] = useState(true)
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [tabValue, setTabValue] = useState('upcoming')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null)
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [meetingToDelete, setMeetingToDelete] = useState<Meeting | null>(null)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<ValidationError>({})
  const [formData, setFormData] = useState({
    title: '',
    meetingType: '',
    description: '',
    location: '',
    date: '',
    startTime: '',
    endTime: ''
  })

  useEffect(() => {
    loadMeetings()
  }, [projectId])

  const loadMeetings = async () => {
    try {
      setLoading(true)
      const data = await meetingsApi.list(projectId)
      setMeetings(data)
    } catch {
      showError('Failed to load meetings. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({ title: '', meetingType: '', description: '', location: '', date: '', startTime: '', endTime: '' })
    setErrors({})
    setEditingMeeting(null)
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    resetForm()
  }

  const handleOpenCreate = () => {
    resetForm()
    setDialogOpen(true)
  }

  const handleOpenEdit = (meeting: Meeting) => {
    setEditingMeeting(meeting)
    const startDate = new Date(meeting.scheduledDate)
    setFormData({
      title: meeting.title,
      meetingType: meeting.meetingType || '',
      description: meeting.description || '',
      location: meeting.location || '',
      date: startDate.toISOString().split('T')[0],
      startTime: startDate.toTimeString().slice(0, 5),
      endTime: ''
    })
    setErrors({})
    setDialogOpen(true)
    setDetailsOpen(false)
  }

  const handleSaveMeeting = async () => {
    if (!projectId) return
    const validationErrors = validateMeetingForm({
      title: formData.title,
      description: formData.description
    })
    if (!formData.date) validationErrors.date = 'Date is required'
    if (!formData.startTime) validationErrors.startTime = 'Start time is required'
    setErrors(validationErrors)
    if (hasErrors(validationErrors)) return

    setSaving(true)
    try {
      const scheduledDate = `${formData.date}T${formData.startTime}:00Z`
      if (editingMeeting) {
        await meetingsApi.update(projectId, editingMeeting.id, {
          title: formData.title,
          meetingType: formData.meetingType || undefined,
          description: formData.description || undefined,
          location: formData.location || undefined,
          scheduledDate
        })
        showSuccess('Meeting updated successfully!')
      } else {
        await meetingsApi.create(projectId, {
          title: formData.title,
          meetingType: formData.meetingType || undefined,
          description: formData.description || undefined,
          location: formData.location || undefined,
          scheduledDate
        })
        showSuccess('Meeting scheduled successfully!')
      }
      handleCloseDialog()
      loadMeetings()
    } catch {
      showError(`Failed to ${editingMeeting ? 'update' : 'schedule'} meeting. Please try again.`)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteClick = (meeting: Meeting) => {
    setMeetingToDelete(meeting)
    setDeleteDialogOpen(true)
    setDetailsOpen(false)
  }

  const handleConfirmDelete = async () => {
    if (!projectId || !meetingToDelete) return
    try {
      await meetingsApi.delete(projectId, meetingToDelete.id)
      showSuccess('Meeting deleted successfully!')
      setDeleteDialogOpen(false)
      setMeetingToDelete(null)
      loadMeetings()
    } catch {
      showError('Failed to delete meeting. Please try again.')
    }
  }

  const upcomingMeetings = meetings.filter(m => m.status === 'scheduled' || m.status === 'invitations_sent')
  const pastMeetings = meetings.filter(m => m.status === 'completed' || m.status === 'cancelled')
  const displayedMeetings = tabValue === 'upcoming' ? upcomingMeetings : pastMeetings

  const getMeetingTypeLabel = (type?: string) => {
    return meetingTypes.find(t => t.value === type)?.label || type || 'Meeting'
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  }

  const handleMeetingClick = (meeting: Meeting) => {
    setSelectedMeeting(meeting)
    setDetailsOpen(true)
  }

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton variant="text" width={200} height={48} sx={{ mb: 1 }} />
        <Skeleton variant="text" width={300} height={24} sx={{ mb: 4 }} />
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2, mb: 4 }}>
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} variant="rounded" height={100} sx={{ borderRadius: 3 }} />
          ))}
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 2 }}>
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} variant="rounded" height={180} sx={{ borderRadius: 3 }} />
          ))}
        </Box>
      </Box>
    )
  }

  return (
    <Box sx={{ p: 3 }}>
      <PageHeader
        title="Meetings"
        subtitle="Schedule and manage project meetings"
        breadcrumbs={[{ label: 'Projects', href: '/projects' }, { label: 'Meetings' }]}
        actions={
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button variant="secondary" icon={<SyncIcon />}>
              Sync Calendar
            </Button>
            <Button variant="primary" icon={<AddIcon />} onClick={handleOpenCreate}>
              Schedule Meeting
            </Button>
          </Box>
        }
      />

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
          gap: 2,
          mb: 4,
        }}
      >
        <KPICard
          title="Total Meetings"
          value={meetings.length}
          icon={<EventIcon />}
          color="primary"
        />
        <KPICard
          title="Upcoming"
          value={upcomingMeetings.length}
          icon={<CalendarMonthIcon />}
          color="info"
        />
        <KPICard
          title="Completed"
          value={pastMeetings.filter(m => m.status === 'completed').length}
          icon={<EventIcon />}
          color="success"
        />
      </Box>

      <Card>
        <Box sx={{ p: 2.5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Tabs
              items={[
                { label: 'Upcoming', value: 'upcoming', badge: upcomingMeetings.length },
                { label: 'Past', value: 'past', badge: pastMeetings.length },
              ]}
              value={tabValue}
              onChange={setTabValue}
              size="small"
            />
            <Chip label={`${displayedMeetings.length} meetings`} size="small" />
          </Box>

          {displayedMeetings.length === 0 ? (
            <EmptyState
              title={tabValue === 'upcoming' ? 'No upcoming meetings' : 'No past meetings'}
              description={tabValue === 'upcoming' ? 'Schedule your first meeting to get started' : 'Past meetings will appear here'}
              icon={<EventIcon sx={{ color: 'text.secondary' }} />}
              action={tabValue === 'upcoming' ? { label: 'Schedule Meeting', onClick: handleOpenCreate } : undefined}
            />
          ) : (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
                gap: 2,
              }}
            >
              {displayedMeetings.map((meeting) => (
                <Card key={meeting.id} hoverable onClick={() => handleMeetingClick(meeting)}>
                  <Box sx={{ p: 2.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                        <Box
                          sx={{
                            width: 52,
                            height: 52,
                            borderRadius: 2,
                            bgcolor: 'primary.main',
                            color: 'white',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Typography variant="h6" sx={{ lineHeight: 1, fontWeight: 700 }}>
                            {new Date(meeting.scheduledDate).getDate()}
                          </Typography>
                          <Typography variant="caption" sx={{ lineHeight: 1, fontSize: '0.6rem', textTransform: 'uppercase' }}>
                            {new Date(meeting.scheduledDate).toLocaleDateString('en-US', { month: 'short' })}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="subtitle1" fontWeight={600}>
                            {meeting.title}
                          </Typography>
                          <Chip
                            label={getMeetingTypeLabel(meeting.meetingType)}
                            size="small"
                            variant="outlined"
                            sx={{ mt: 0.5, fontSize: '0.7rem' }}
                          />
                        </Box>
                      </Box>
                      <StatusBadge status={meeting.status} size="small" />
                    </Box>

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <AccessTimeIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary">
                          {formatTime(meeting.scheduledDate)}
                        </Typography>
                      </Box>
                      {meeting.location && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <LocationOnIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                          <Typography variant="body2" color="text.secondary">
                            {meeting.location}
                          </Typography>
                        </Box>
                      )}
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <AvatarGroup
                        users={[{ name: 'User' }]}
                        max={4}
                        size="small"
                      />
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <IconButton
                          size="small"
                          onClick={(e) => { e.stopPropagation(); handleOpenEdit(meeting); }}
                          title="Edit meeting"
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={(e) => { e.stopPropagation(); handleDeleteClick(meeting); }}
                          title="Delete meeting"
                          color="error"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </Box>
                  </Box>
                </Card>
              ))}
            </Box>
          )}
        </Box>
      </Card>

      <Drawer
        anchor="right"
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        PaperProps={{ sx: { width: { xs: '100%', sm: 420 }, borderRadius: '16px 0 0 16px' } }}
      >
        {selectedMeeting && (
          <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6" fontWeight={600}>Meeting Details</Typography>
              <IconButton onClick={() => setDetailsOpen(false)} size="small">
                <CloseIcon />
              </IconButton>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
              <Box
                sx={{
                  width: 64,
                  height: 64,
                  borderRadius: 2,
                  bgcolor: 'primary.main',
                  color: 'white',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Typography variant="h5" sx={{ lineHeight: 1, fontWeight: 700 }}>
                  {new Date(selectedMeeting.scheduledDate).getDate()}
                </Typography>
                <Typography variant="caption" sx={{ lineHeight: 1, textTransform: 'uppercase' }}>
                  {new Date(selectedMeeting.scheduledDate).toLocaleDateString('en-US', { month: 'short' })}
                </Typography>
              </Box>
              <Box>
                <Typography variant="h5" fontWeight={700}>{selectedMeeting.title}</Typography>
                <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                  <Chip label={getMeetingTypeLabel(selectedMeeting.meetingType)} size="small" variant="outlined" />
                  <StatusBadge status={selectedMeeting.status} size="small" />
                </Box>
              </Box>
            </Box>

            {selectedMeeting.description && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>DESCRIPTION</Typography>
                <Typography variant="body2" sx={{ mt: 0.5 }}>{selectedMeeting.description}</Typography>
              </Box>
            )}

            <Divider sx={{ my: 2 }} />

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ width: 36, height: 36, borderRadius: 1, bgcolor: 'action.hover', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CalendarMonthIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Date</Typography>
                  <Typography variant="body2" fontWeight={500}>{formatDate(selectedMeeting.scheduledDate)}</Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ width: 36, height: 36, borderRadius: 1, bgcolor: 'action.hover', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AccessTimeIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Time</Typography>
                  <Typography variant="body2" fontWeight={500}>{formatTime(selectedMeeting.scheduledDate)}</Typography>
                </Box>
              </Box>
              {selectedMeeting.location && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ width: 36, height: 36, borderRadius: 1, bgcolor: 'action.hover', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <LocationOnIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Location</Typography>
                    <Typography variant="body2" fontWeight={500}>{selectedMeeting.location}</Typography>
                  </Box>
                </Box>
              )}
            </Box>

            <Divider sx={{ my: 2 }} />

            <Box sx={{ mb: 3 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>ATTENDEES</Typography>
              <Box sx={{ mt: 1 }}>
                <AvatarGroup users={[{ name: 'User' }]} max={10} size="medium" />
              </Box>
            </Box>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button variant="secondary" fullWidth onClick={() => handleOpenEdit(selectedMeeting)}>
                Edit Meeting
              </Button>
              <Button variant="danger" fullWidth onClick={() => handleDeleteClick(selectedMeeting)}>
                Delete
              </Button>
            </Box>
          </Box>
        )}
      </Drawer>

      <FormModal
        open={dialogOpen}
        onClose={handleCloseDialog}
        onSubmit={handleSaveMeeting}
        title={editingMeeting ? 'Edit Meeting' : 'Schedule Meeting'}
        submitLabel={editingMeeting ? 'Save Changes' : 'Schedule Meeting'}
        loading={saving}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField
            fullWidth
            label="Meeting Title"
            required
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            error={!!errors.title}
            helperText={errors.title}
          />
          <MuiTextField
            fullWidth
            select
            label="Meeting Type"
            value={formData.meetingType}
            onChange={(e) => setFormData({ ...formData, meetingType: e.target.value })}
          >
            <MenuItem value="">Select type...</MenuItem>
            {meetingTypes.map(type => <MenuItem key={type.value} value={type.value}>{type.label}</MenuItem>)}
          </MuiTextField>
          <TextField
            fullWidth
            label="Description"
            multiline
            rows={2}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            error={!!errors.description}
            helperText={errors.description}
          />
          <TextField
            fullWidth
            label="Location"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
          />
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2 }}>
            <TextField
              fullWidth
              label="Date"
              type="date"
              InputLabelProps={{ shrink: true }}
              required
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              error={!!errors.date}
              helperText={errors.date}
            />
            <TextField
              fullWidth
              label="Start Time"
              type="time"
              InputLabelProps={{ shrink: true }}
              required
              value={formData.startTime}
              onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
              error={!!errors.startTime}
              helperText={errors.startTime}
            />
            <TextField
              fullWidth
              label="End Time"
              type="time"
              InputLabelProps={{ shrink: true }}
              value={formData.endTime}
              onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
            />
          </Box>
        </Box>
      </FormModal>

      <ConfirmModal
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Meeting"
        message={`Are you sure you want to delete "${meetingToDelete?.title}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
      />
    </Box>
  )
}
