import { useState } from 'react'
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
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import ListItemAvatar from '@mui/material/ListItemAvatar'
import IconButton from '@mui/material/IconButton'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import AddIcon from '@mui/icons-material/Add'
import EventIcon from '@mui/icons-material/Event'
import LocationOnIcon from '@mui/icons-material/LocationOn'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import SyncIcon from '@mui/icons-material/Sync'
import EditIcon from '@mui/icons-material/Edit'
import { mockMeetings, mockUsers } from '../mocks/data'
import type { Meeting } from '../types'

const meetingTypes = [
  { value: 'site_inspection', label: 'Site Inspection' },
  { value: 'approval_meeting', label: 'Approval Meeting' },
  { value: 'coordination', label: 'Coordination' },
  { value: 'safety_review', label: 'Safety Review' },
  { value: 'other', label: 'Other' },
]

export default function MeetingsPage() {
  const { projectId } = useParams()
  const [tabValue, setTabValue] = useState(0)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)

  const projectMeetings = mockMeetings.filter(m => m.projectId === projectId)
  const upcomingMeetings = projectMeetings.filter(m => m.status === 'scheduled' || m.status === 'invitations_sent')
  const pastMeetings = projectMeetings.filter(m => m.status === 'completed' || m.status === 'cancelled')

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

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight="bold">Meetings</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" startIcon={<SyncIcon />}>
            Sync Calendar
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
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
            <Card
              sx={{ cursor: 'pointer', '&:hover': { boxShadow: 4 } }}
              onClick={() => handleMeetingClick(meeting)}
            >
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Avatar sx={{ bgcolor: 'primary.light', width: 48, height: 48 }}>
                      <EventIcon />
                    </Avatar>
                    <Box>
                      <Typography variant="h6">{meeting.title}</Typography>
                      <Chip
                        label={getMeetingTypeLabel(meeting.meetingType)}
                        size="small"
                        variant="outlined"
                        sx={{ mt: 0.5 }}
                      />
                    </Box>
                  </Box>
                  <Chip
                    label={meeting.status.replace('_', ' ')}
                    size="small"
                    color={getStatusColor(meeting.status)}
                    sx={{ textTransform: 'capitalize' }}
                  />
                </Box>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CalendarMonthIcon fontSize="small" color="action" />
                    <Typography variant="body2">{formatDate(meeting.startTime)}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AccessTimeIcon fontSize="small" color="action" />
                    <Typography variant="body2">
                      {formatTime(meeting.startTime)} - {formatTime(meeting.endTime)}
                    </Typography>
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
                    {mockUsers.slice(0, 4).map(user => (
                      <Avatar key={user.id}>{user.fullName.split(' ').map(n => n[0]).join('')}</Avatar>
                    ))}
                  </AvatarGroup>
                  <IconButton size="small"><EditIcon fontSize="small" /></IconButton>
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

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Schedule Meeting</DialogTitle>
        <DialogContent>
          <TextField fullWidth label="Meeting Title" margin="normal" required />
          <TextField fullWidth select label="Meeting Type" margin="normal">
            {meetingTypes.map(type => <MenuItem key={type.value} value={type.value}>{type.label}</MenuItem>)}
          </TextField>
          <TextField fullWidth label="Description" margin="normal" multiline rows={2} />
          <TextField fullWidth label="Location" margin="normal" />
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField fullWidth label="Date" type="date" margin="normal" InputLabelProps={{ shrink: true }} required />
            <TextField fullWidth label="Start Time" type="time" margin="normal" InputLabelProps={{ shrink: true }} required />
            <TextField fullWidth label="End Time" type="time" margin="normal" InputLabelProps={{ shrink: true }} required />
          </Box>
          <TextField fullWidth label="Attendees" margin="normal" placeholder="Enter email addresses" helperText="Separate multiple emails with commas" />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => setDialogOpen(false)}>Schedule & Send Invites</Button>
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

              <Typography variant="subtitle2" gutterBottom>Attendees</Typography>
              <List dense>
                {mockUsers.slice(0, 3).map(user => (
                  <ListItem key={user.id}>
                    <ListItemAvatar>
                      <Avatar sx={{ width: 32, height: 32 }}>{user.fullName.split(' ').map(n => n[0]).join('')}</Avatar>
                    </ListItemAvatar>
                    <ListItemText primary={user.fullName} secondary={user.email} />
                  </ListItem>
                ))}
              </List>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDetailsOpen(false)}>Close</Button>
              <Button variant="outlined">Edit Meeting</Button>
              {selectedMeeting.status === 'completed' && <Button variant="contained">Add Summary</Button>}
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  )
}
