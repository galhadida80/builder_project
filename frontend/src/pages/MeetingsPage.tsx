import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'
import Chip from '@mui/material/Chip'
import Avatar from '@mui/material/Avatar'
import AvatarGroup from '@mui/material/AvatarGroup'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import IconButton from '@mui/material/IconButton'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import CircularProgress from '@mui/material/CircularProgress'
import AddIcon from '@mui/icons-material/Add'
import EventIcon from '@mui/icons-material/Event'
import LocationOnIcon from '@mui/icons-material/LocationOn'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import SyncIcon from '@mui/icons-material/Sync'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import { meetingsApi } from '../api/meetings'
import type { Meeting } from '../types'
import { validateMeetingForm, hasErrors, VALIDATION, type ValidationError } from '../utils/validation'
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
  const [tabValue, setTabValue] = useState(0)
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
    } catch (error) {
      console.error('Failed to load meetings:', error)
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
    const startDate = new Date(meeting.startTime)
    const endDate = new Date(meeting.endTime)
    setFormData({
      title: meeting.title,
      meetingType: meeting.meetingType || '',
      description: meeting.description || '',
      location: meeting.location || '',
      date: startDate.toISOString().split('T')[0],
      startTime: startDate.toTimeString().slice(0, 5),
      endTime: endDate.toTimeString().slice(0, 5)
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

    if (!formData.date) {
      validationErrors.date = 'Date is required'
    }
    if (!formData.startTime) {
      validationErrors.startTime = 'Start time is required'
    }

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
    } catch (error) {
      console.error('Failed to save meeting:', error)
      showError(`Failed to ${editingMeeting ? 'update' : 'schedule'} meeting. Please try again.`)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteClick = (meeting: Meeting, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
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
    } catch (error) {
      console.error('Failed to delete meeting:', error)
      showError('Failed to delete meeting. Please try again.')
    }
  }

  const upcomingMeetings = meetings.filter(m => m.status === 'scheduled' || m.status === 'invitations_sent')
  const pastMeetings = meetings.filter(m => m.status === 'completed' || m.status === 'cancelled')
  const displayedMeetings = tabValue === 0 ? upcomingMeetings : pastMeetings

  const getStatusColor = (status: Meeting['status']) => {
    switch (status) {
      case 'scheduled': return 'info'
      case 'invitations_sent': return 'primary'
      case 'completed': return 'success'
      case 'cancelled': return 'error'
      default: return 'default'
    }
  }

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
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight="bold">Meetings</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" startIcon={<SyncIcon />}>Sync Calendar</Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreate}>
            Schedule Meeting
          </Button>
        </Box>
      </Box>

      <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ mb: 3 }}>
        <Tab label={`Upcoming (${upcomingMeetings.length})`} />
        <Tab label={`Past (${pastMeetings.length})`} />
      </Tabs>

      <Grid container spacing={2}>
        {displayedMeetings.map((meeting) => (
          <Grid item xs={12} md={6} key={meeting.id}>
            <Card sx={{ cursor: 'pointer', '&:hover': { boxShadow: 4 } }} onClick={() => handleMeetingClick(meeting)}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Avatar sx={{ bgcolor: 'primary.light', width: 48, height: 48 }}>
                      <EventIcon />
                    </Avatar>
                    <Box>
                      <Typography variant="h6">{meeting.title}</Typography>
                      <Chip label={getMeetingTypeLabel(meeting.meetingType)} size="small" variant="outlined" sx={{ mt: 0.5 }} />
                    </Box>
                  </Box>
                  <Chip label={meeting.status.replace('_', ' ')} size="small" color={getStatusColor(meeting.status)} sx={{ textTransform: 'capitalize' }} />
                </Box>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CalendarMonthIcon fontSize="small" color="action" />
                    <Typography variant="body2">{formatDate(meeting.startTime)}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AccessTimeIcon fontSize="small" color="action" />
                    <Typography variant="body2">{formatTime(meeting.startTime)} - {formatTime(meeting.endTime)}</Typography>
                  </Box>
                  {meeting.location && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LocationOnIcon fontSize="small" color="action" />
                      <Typography variant="body2">{meeting.location}</Typography>
                    </Box>
                  )}
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <AvatarGroup max={4} sx={{ '& .MuiAvatar-root': { width: 28, height: 28, fontSize: '0.75rem' } }}>
                    <Avatar>U</Avatar>
                  </AvatarGroup>
                  <Box>
                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleOpenEdit(meeting); }} title="Edit meeting">
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={(e) => handleDeleteClick(meeting, e)} title="Delete meeting" color="error">
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {displayedMeetings.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <EventIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            {tabValue === 0 ? 'No upcoming meetings' : 'No past meetings'}
          </Typography>
        </Box>
      )}

      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingMeeting ? 'Edit Meeting' : 'Schedule Meeting'}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Meeting Title"
            margin="normal"
            required
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            error={!!errors.title}
            helperText={errors.title || `${formData.title.length}/${VALIDATION.MAX_NAME_LENGTH}`}
            inputProps={{ maxLength: VALIDATION.MAX_NAME_LENGTH }}
          />
          <TextField
            fullWidth
            select
            label="Meeting Type"
            margin="normal"
            value={formData.meetingType}
            onChange={(e) => setFormData({ ...formData, meetingType: e.target.value })}
          >
            <MenuItem value="">Select type...</MenuItem>
            {meetingTypes.map(type => <MenuItem key={type.value} value={type.value}>{type.label}</MenuItem>)}
          </TextField>
          <TextField
            fullWidth
            label="Description"
            margin="normal"
            multiline
            rows={2}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            error={!!errors.description}
            helperText={errors.description || `${formData.description.length}/${VALIDATION.MAX_DESCRIPTION_LENGTH}`}
            inputProps={{ maxLength: VALIDATION.MAX_DESCRIPTION_LENGTH }}
          />
          <TextField
            fullWidth
            label="Location"
            margin="normal"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            inputProps={{ maxLength: VALIDATION.MAX_NAME_LENGTH }}
          />
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              fullWidth
              label="Date"
              type="date"
              margin="normal"
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
              margin="normal"
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
              margin="normal"
              InputLabelProps={{ shrink: true }}
              value={formData.endTime}
              onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={saving}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveMeeting} disabled={saving}>
            {saving ? <CircularProgress size={24} /> : (editingMeeting ? 'Save Changes' : 'Schedule Meeting')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} maxWidth="sm" fullWidth>
        {selectedMeeting && (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {selectedMeeting.title}
                <Chip label={selectedMeeting.status.replace('_', ' ')} size="small" color={getStatusColor(selectedMeeting.status)} />
              </Box>
            </DialogTitle>
            <DialogContent>
              <Box sx={{ mb: 2 }}>
                <Chip label={getMeetingTypeLabel(selectedMeeting.meetingType)} size="small" variant="outlined" />
              </Box>

              {selectedMeeting.description && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {selectedMeeting.description}
                </Typography>
              )}

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CalendarMonthIcon color="action" />
                  <Typography>{formatDate(selectedMeeting.startTime)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AccessTimeIcon color="action" />
                  <Typography>{formatTime(selectedMeeting.startTime)} - {formatTime(selectedMeeting.endTime)}</Typography>
                </Box>
                {selectedMeeting.location && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LocationOnIcon color="action" />
                    <Typography>{selectedMeeting.location}</Typography>
                  </Box>
                )}
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDetailsOpen(false)}>Close</Button>
              <Button variant="outlined" color="error" onClick={() => handleDeleteClick(selectedMeeting)}>Delete</Button>
              <Button variant="outlined" onClick={() => handleOpenEdit(selectedMeeting)}>Edit Meeting</Button>
              {selectedMeeting.status === 'completed' && <Button variant="contained">Add Summary</Button>}
            </DialogActions>
          </>
        )}
      </Dialog>

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Meeting</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete <strong>{meetingToDelete?.title}</strong>? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleConfirmDelete}>Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
