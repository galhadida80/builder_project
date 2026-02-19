import { useState, useEffect, useRef, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import dayjs from 'dayjs'
import { Card, KPICard } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { StatusBadge } from '../components/ui/StatusBadge'
import { PageHeader } from '../components/ui/Breadcrumbs'
import { TextField } from '../components/ui/TextField'
import { FormModal, ConfirmModal } from '../components/ui/Modal'
import { Tabs, SegmentedTabs } from '../components/ui/Tabs'
import { EmptyState } from '../components/ui/EmptyState'
import { AvatarGroup } from '../components/ui/Avatar'
import { MeetingCalendarGrid } from '../components/meetings/MeetingCalendarGrid'
import { MeetingCalendarAgenda } from '../components/meetings/MeetingCalendarAgenda'
import { useResponsive } from '../hooks/useResponsive'
import { useAuth } from '../contexts/AuthContext'
import { meetingsApi } from '../api/meetings'
import { teamMembersApi } from '../api/teamMembers'
import { filesApi, type FileRecord } from '../api/files'
import type { Meeting, MeetingAttendee, MeetingTimeSlot } from '../types'
import { validateMeetingForm, hasErrors, type ValidationError } from '../utils/validation'
import { useToast } from '../components/common/ToastProvider'
import { parseValidationErrors } from '../utils/apiErrors'
import { withMinDuration } from '../utils/async'
import { getDateLocale } from '../utils/dateLocale'
import {
  AddIcon, EditIcon, DeleteIcon, EventIcon, LocationOnIcon,
  AccessTimeIcon, CalendarMonthIcon, CloseIcon, DownloadIcon,
  ViewListIcon, PersonAddIcon, AddPhotoAlternateIcon, CheckCircleIcon,
} from '@/icons'
import {
  Box, Typography, MenuItem, TextField as MuiTextField, Skeleton,
  Chip, IconButton, Drawer, Divider, Autocomplete, Avatar,
  Switch, FormControlLabel, LinearProgress,
} from '@/mui'

interface TeamMemberOption {
  id: string
  name: string
  email?: string
}

const RSVP_COLORS: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
  accepted: 'success',
  tentative: 'warning',
  declined: 'error',
  pending: 'default',
}

export default function MeetingsPage() {
  const { projectId } = useParams()
  const { showError, showSuccess } = useToast()
  const { t } = useTranslation()
  const { user: currentUser } = useAuth()

  const meetingTypes = [
    { value: 'site_inspection', label: t('meetings.typeSiteInspection') },
    { value: 'approval_meeting', label: t('meetings.typeApprovalMeeting') },
    { value: 'coordination', label: t('meetings.typeCoordination') },
    { value: 'safety_review', label: t('meetings.typeSafetyReview') },
    { value: 'other', label: t('meetings.typeOther') },
  ]

  const { isMobile } = useResponsive()
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list')
  const [calendarMonth, setCalendarMonth] = useState(dayjs())
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
  const [deleting, setDeleting] = useState(false)
  const [errors, setErrors] = useState<ValidationError>({})
  const [formData, setFormData] = useState({
    title: '',
    meetingType: '',
    description: '',
    location: '',
    date: '',
    startTime: '',
  })

  const [teamMembers, setTeamMembers] = useState<TeamMemberOption[]>([])
  const [selectedAttendees, setSelectedAttendees] = useState<TeamMemberOption[]>([])
  const [meetingPhotos, setMeetingPhotos] = useState<FileRecord[]>([])
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({})
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [proposeTimeSlots, setProposeTimeSlots] = useState(false)
  const [timeSlotInputs, setTimeSlotInputs] = useState([
    { date: '', time: '' },
    { date: '', time: '' },
    { date: '', time: '' },
  ])
  const [confirmingSlot, setConfirmingSlot] = useState(false)

  useEffect(() => {
    if (!projectId) return
    loadMeetings()
    loadTeamMembers()
  }, [projectId])

  const loadMeetings = async () => {
    try {
      setLoading(true)
      const data = await meetingsApi.list(projectId)
      setMeetings(data)
    } catch {
      showError(t('meetings.failedToLoad'))
    } finally {
      setLoading(false)
    }
  }

  const loadTeamMembers = async () => {
    if (!projectId) return
    try {
      const members = await teamMembersApi.list(projectId)
      setTeamMembers(members.map((m: any) => ({ id: m.userId, name: m.user?.fullName || m.user?.email || '', email: m.user?.email })))
    } catch {
      // non-critical
    }
  }

  const loadMeetingPhotos = async (meetingId: string) => {
    if (!projectId) return
    try {
      const files = await filesApi.list(projectId, 'meeting', meetingId)
      const imageFiles = files.filter(f => f.fileType?.startsWith('image/'))
      setMeetingPhotos(imageFiles)
      const urls: Record<string, string> = {}
      for (const file of imageFiles) {
        try {
          urls[file.id] = await filesApi.getFileBlob(projectId, file.id)
        } catch {
          // skip failed
        }
      }
      setPhotoUrls(urls)
    } catch {
      setMeetingPhotos([])
    }
  }

  const validateField = (field: string, value: string) => {
    const testData = { ...formData, [field]: value }
    const allErrors = validateMeetingForm({
      title: testData.title,
      description: testData.description,
      meeting_type: testData.meetingType,
      location: testData.location,
    })
    if (field === 'date' && !testData.date) allErrors.date = t('meetings.dateRequired')
    if (field === 'startTime' && !testData.startTime) allErrors.startTime = t('meetings.startTimeRequired')
    setErrors(prev => ({ ...prev, [field]: allErrors[field] || null }))
  }

  const resetForm = () => {
    setFormData({ title: '', meetingType: '', description: '', location: '', date: '', startTime: '' })
    setErrors({})
    setEditingMeeting(null)
    setSelectedAttendees([])
    setProposeTimeSlots(false)
    setTimeSlotInputs([{ date: '', time: '' }, { date: '', time: '' }, { date: '', time: '' }])
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
    const year = startDate.getFullYear()
    const month = String(startDate.getMonth() + 1).padStart(2, '0')
    const day = String(startDate.getDate()).padStart(2, '0')
    const hours = String(startDate.getHours()).padStart(2, '0')
    const minutes = String(startDate.getMinutes()).padStart(2, '0')
    setFormData({
      title: meeting.title,
      meetingType: meeting.meetingType || '',
      description: meeting.description || '',
      location: meeting.location || '',
      date: `${year}-${month}-${day}`,
      startTime: `${hours}:${minutes}`,
    })
    setErrors({})
    setDialogOpen(true)
    setDetailsOpen(false)
  }

  const handleSaveMeeting = async () => {
    if (!projectId) return
    const validationErrors = validateMeetingForm({
      title: formData.title,
      description: formData.description,
      meeting_type: formData.meetingType,
      location: formData.location,
    })

    if (proposeTimeSlots && !editingMeeting) {
      const filledSlots = timeSlotInputs.filter(s => s.date && s.time)
      if (filledSlots.length < 2) {
        validationErrors.date = t('meetings.atLeastTwoSlots')
      }
    } else {
      if (!formData.date) validationErrors.date = t('meetings.dateRequired')
      if (!formData.startTime) validationErrors.startTime = t('meetings.startTimeRequired')
    }

    setErrors(validationErrors)
    if (hasErrors(validationErrors)) return

    setSaving(true)
    try {
      const scheduled_date = proposeTimeSlots && !editingMeeting && timeSlotInputs[0].date && timeSlotInputs[0].time
        ? `${timeSlotInputs[0].date}T${timeSlotInputs[0].time}:00`
        : `${formData.date}T${formData.startTime}:00`
      if (editingMeeting) {
        await withMinDuration(meetingsApi.update(projectId, editingMeeting.id, {
          title: formData.title,
          meeting_type: formData.meetingType || undefined,
          description: formData.description || undefined,
          location: formData.location || undefined,
          scheduled_date
        }))
        showSuccess(t('meetings.updatedSuccessfully'))
      } else {
        const time_slots = proposeTimeSlots
          ? timeSlotInputs
              .filter(s => s.date && s.time)
              .map(s => ({ proposed_start: `${s.date}T${s.time}:00` }))
          : undefined

        await withMinDuration(meetingsApi.create(projectId, {
          title: formData.title,
          meeting_type: formData.meetingType || undefined,
          description: formData.description || undefined,
          location: formData.location || undefined,
          scheduled_date,
          attendee_ids: selectedAttendees.map(a => a.id),
          time_slots,
        }))
        if (proposeTimeSlots && selectedAttendees.length > 0) {
          showSuccess(t('meetings.voteEmailsSent', { count: selectedAttendees.length }))
        } else if (selectedAttendees.length > 0) {
          showSuccess(t('meetings.invitationSent', { count: selectedAttendees.length }))
        } else {
          showSuccess(t('meetings.scheduledSuccessfully'))
        }
      }
      handleCloseDialog()
      loadMeetings()
    } catch (err) {
      const serverErrors = parseValidationErrors(err)
      if (Object.keys(serverErrors).length > 0) {
        setErrors(prev => ({ ...prev, ...serverErrors }))
        showError(t('validation.checkFields'))
        return
      }
      showError(t('meetings.failedToSave', { action: editingMeeting ? 'update' : 'schedule' }))
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
    setDeleting(true)
    try {
      await withMinDuration(meetingsApi.delete(projectId, meetingToDelete.id))
      showSuccess(t('meetings.deletedSuccessfully'))
      setDeleteDialogOpen(false)
      setMeetingToDelete(null)
      loadMeetings()
    } catch {
      showError(t('meetings.failedToDelete'))
    } finally {
      setDeleting(false)
    }
  }

  const handleRsvp = async (attendee: MeetingAttendee, status: string) => {
    if (!projectId || !selectedMeeting || !attendee.userId) return
    try {
      await meetingsApi.rsvpAttendee(projectId, selectedMeeting.id, attendee.userId, status)
      showSuccess(t('meetings.rsvp.confirmMessage'))
      const updated = await meetingsApi.get(projectId, selectedMeeting.id)
      setSelectedMeeting(updated)
      loadMeetings()
    } catch {
      showError(t('meetings.failedToSave', { action: 'RSVP' }))
    }
  }

  const handleConfirmTimeSlot = async (slot: MeetingTimeSlot) => {
    if (!projectId || !selectedMeeting) return
    setConfirmingSlot(true)
    try {
      const updated = await meetingsApi.confirmTimeSlot(projectId, selectedMeeting.id, slot.id)
      setSelectedMeeting(updated)
      showSuccess(t('meetings.timeConfirmed'))
      loadMeetings()
    } catch {
      showError(t('meetings.failedToSave', { action: 'confirm' }))
    } finally {
      setConfirmingSlot(false)
    }
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!projectId || !selectedMeeting || !e.target.files) return
    for (const file of Array.from(e.target.files)) {
      try {
        await filesApi.upload(projectId, 'meeting', selectedMeeting.id, file)
      } catch {
        showError(t('meetings.failedToSave', { action: 'upload' }))
      }
    }
    loadMeetingPhotos(selectedMeeting.id)
  }

  const upcomingMeetings = useMemo(() => {
    const now = new Date()
    return meetings.filter(m =>
      (m.status === 'scheduled' || m.status === 'invitations_sent' || m.status === 'pending_votes') &&
      m.scheduledDate && new Date(m.scheduledDate) >= now
    )
  }, [meetings])
  const pastMeetings = useMemo(() => {
    const now = new Date()
    return meetings.filter(m =>
      m.status === 'completed' || m.status === 'cancelled' ||
      (m.scheduledDate && new Date(m.scheduledDate) < now)
    )
  }, [meetings])
  const displayedMeetings = tabValue === 'upcoming' ? upcomingMeetings : pastMeetings

  const getMeetingTypeLabel = (type?: string) => {
    return meetingTypes.find(mt => mt.value === type)?.label || type || t('meetings.meeting')
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString(getDateLocale(), { hour: '2-digit', minute: '2-digit' })
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(getDateLocale(), { weekday: 'long', month: 'long', day: 'numeric' })
  }

  const getRsvpLabel = (status: string) => {
    const key = `meetings.rsvp.${status}` as const
    return t(key)
  }

  const [calendarLinks, setCalendarLinks] = useState<{ google_url: string; outlook_url: string; ics_download_url: string } | null>(null)

  const handleMeetingClick = async (meeting: Meeting) => {
    setSelectedMeeting(meeting)
    setDetailsOpen(true)
    setCalendarLinks(null)
    setMeetingPhotos([])
    setPhotoUrls({})
    if (projectId) {
      try {
        const links = await meetingsApi.getCalendarLinks(projectId, meeting.id)
        setCalendarLinks(links)
      } catch {
        // calendar links are optional
      }
      loadMeetingPhotos(meeting.id)
    }
  }

  const handleDayClick = (date: dayjs.Dayjs) => {
    resetForm()
    setFormData((prev) => ({ ...prev, date: date.format('YYYY-MM-DD') }))
    setDialogOpen(true)
  }

  const currentUserAttendee = selectedMeeting?.attendees?.find(
    a => a.userId === currentUser?.id
  )

  if (loading) {
    return (
      <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
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
    <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 }, maxWidth: '100%', overflow: 'hidden' }}>
      <PageHeader
        title={t('meetings.title')}
        subtitle={t('meetings.subtitle')}
        breadcrumbs={[{ label: t('nav.projects'), href: '/projects' }, { label: t('meetings.title') }]}
        actions={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
              <SegmentedTabs
                items={[
                  { label: t('meetings.listView'), value: 'list', icon: <ViewListIcon sx={{ fontSize: 18 }} /> },
                  { label: t('meetings.calendarView'), value: 'calendar', icon: <CalendarMonthIcon sx={{ fontSize: 18 }} /> },
                ]}
                value={viewMode}
                onChange={(v) => setViewMode(v as 'list' | 'calendar')}
              />
            </Box>
            <Button variant="primary" icon={<AddIcon />} onClick={handleOpenCreate}>
              {t('meetings.scheduleMeeting')}
            </Button>
          </Box>
        }
      />

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
          gap: 1.5,
          mb: 3,
        }}
      >
        <KPICard
          title={t('meetings.totalMeetings')}
          value={meetings.length}
          icon={<EventIcon />}
          color="primary"
        />
        <KPICard
          title={t('meetings.upcoming')}
          value={upcomingMeetings.length}
          icon={<CalendarMonthIcon />}
          color="info"
        />
        <KPICard
          title={t('meetings.completed')}
          value={pastMeetings.filter(m => m.status === 'completed').length}
          icon={<EventIcon />}
          color="success"
        />
      </Box>

      {viewMode === 'calendar' ? (
        isMobile ? (
          <MeetingCalendarAgenda
            meetings={meetings}
            currentMonth={calendarMonth}
            onMonthChange={setCalendarMonth}
            onMeetingClick={handleMeetingClick}
            onDayClick={handleDayClick}
          />
        ) : (
          <MeetingCalendarGrid
            meetings={meetings}
            currentMonth={calendarMonth}
            onMonthChange={setCalendarMonth}
            onMeetingClick={handleMeetingClick}
            onDayClick={handleDayClick}
          />
        )
      ) : (
        <Card>
          <Box sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, gap: { xs: 1, sm: 0 }, mb: 2 }}>
              <Tabs
                items={[
                  { label: t('meetings.upcomingMeetings'), value: 'upcoming', badge: upcomingMeetings.length },
                  { label: t('meetings.pastMeetings'), value: 'past', badge: pastMeetings.length },
                ]}
                value={tabValue}
                onChange={setTabValue}
                size="small"
              />
              <Chip label={`${displayedMeetings.length} ${t('meetings.meetingCount')}`} size="small" sx={{ alignSelf: { xs: 'flex-start', sm: 'center' } }} />
            </Box>

            {displayedMeetings.length === 0 ? (
              <EmptyState
                title={tabValue === 'upcoming' ? t('meetings.noUpcoming') : t('meetings.noPast')}
                description={tabValue === 'upcoming' ? t('meetings.scheduleFirstMeeting') : t('meetings.pastMeetingsWillAppear')}
                icon={<EventIcon sx={{ color: 'text.secondary' }} />}
                action={tabValue === 'upcoming' ? { label: t('meetings.scheduleMeeting'), onClick: handleOpenCreate } : undefined}
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
                    <Box sx={{ p: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5, gap: 1 }}>
                        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start', minWidth: 0, flex: 1 }}>
                          <Box
                            sx={{
                              width: 44,
                              height: 44,
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
                              {new Date(meeting.scheduledDate).toLocaleDateString(getDateLocale(), { month: 'short' })}
                            </Typography>
                          </Box>
                          <Box sx={{ minWidth: 0 }}>
                            <Typography variant="body2" fontWeight={600} sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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

                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mb: 1.5 }}>
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
                          users={(meeting.attendees || []).map(a => ({ name: a.user?.fullName || a.email || 'User' }))}
                          max={4}
                          size="small"
                        />
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <IconButton
                            size="small"
                            onClick={(e) => { e.stopPropagation(); handleOpenEdit(meeting); }}
                            aria-label={t('meetings.editMeeting')}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={(e) => { e.stopPropagation(); handleDeleteClick(meeting); }}
                            aria-label={t('meetings.deleteMeeting')}
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
      )}

      {/* Details Drawer */}
      <Drawer
        anchor="right"
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        sx={{ zIndex: 1400 }}
        PaperProps={{ sx: { width: { xs: '100%', sm: 420 }, borderRadius: '16px 0 0 16px' } }}
      >
        {selectedMeeting && (
          <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 }, overflowY: 'auto', height: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6" fontWeight={600}>{t('meetings.details')}</Typography>
              <IconButton aria-label={t('meetings.closeMeetingDetails')} onClick={() => setDetailsOpen(false)} size="small">
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
                  {new Date(selectedMeeting.scheduledDate).toLocaleDateString(getDateLocale(), { month: 'short' })}
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

            {selectedMeeting.createdBy && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <Avatar sx={{ width: 28, height: 28, fontSize: 12 }}>
                  {selectedMeeting.createdBy.fullName?.charAt(0) || '?'}
                </Avatar>
                <Box>
                  <Typography variant="caption" color="text.secondary">{t('meetings.createdBy')}</Typography>
                  <Typography variant="body2" fontWeight={500}>{selectedMeeting.createdBy.fullName}</Typography>
                </Box>
              </Box>
            )}

            {selectedMeeting.description && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>{t('meetings.description').toUpperCase()}</Typography>
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
                  <Typography variant="caption" color="text.secondary">{t('meetings.date')}</Typography>
                  <Typography variant="body2" fontWeight={500}>{formatDate(selectedMeeting.scheduledDate)}</Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ width: 36, height: 36, borderRadius: 1, bgcolor: 'action.hover', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AccessTimeIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">{t('meetings.time')}</Typography>
                  <Typography variant="body2" fontWeight={500}>{formatTime(selectedMeeting.scheduledDate)}</Typography>
                </Box>
              </Box>
              {selectedMeeting.location && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ width: 36, height: 36, borderRadius: 1, bgcolor: 'action.hover', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <LocationOnIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">{t('meetings.location')}</Typography>
                    <Typography variant="body2" fontWeight={500}>{selectedMeeting.location}</Typography>
                  </Box>
                </Box>
              )}
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Attendees with RSVP status */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>{t('meetings.attendees').toUpperCase()}</Typography>
              {(selectedMeeting.attendees && selectedMeeting.attendees.length > 0) ? (
                <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {selectedMeeting.attendees.map((att) => (
                    <Box key={att.id} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ width: 28, height: 28, fontSize: 12 }}>
                          {(att.user?.fullName || att.email || '?').charAt(0)}
                        </Avatar>
                        <Typography variant="body2">{att.user?.fullName || att.email}</Typography>
                      </Box>
                      <Chip
                        label={getRsvpLabel(att.attendanceStatus)}
                        size="small"
                        color={RSVP_COLORS[att.attendanceStatus] || 'default'}
                        variant={att.attendanceStatus === 'pending' ? 'outlined' : 'filled'}
                      />
                    </Box>
                  ))}
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{t('meetings.noAttendees')}</Typography>
              )}
            </Box>

            {/* Time Slot Votes */}
            {selectedMeeting.hasTimeSlots && selectedMeeting.timeSlots && selectedMeeting.timeSlots.length > 0 && (
              <>
                <Divider sx={{ my: 2 }} />
                <Box sx={{ mb: 3 }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>
                    {t('meetings.timeSlotVotes').toUpperCase()}
                  </Typography>
                  <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    {selectedMeeting.timeSlots.map((slot) => {
                      const totalVotes = selectedMeeting.timeSlots!.reduce((sum, s) => sum + s.voteCount, 0)
                      const pct = totalVotes > 0 ? (slot.voteCount / totalVotes) * 100 : 0
                      const voterNames = (selectedMeeting.timeVotes || [])
                        .filter(v => v.timeSlotId === slot.id)
                        .map(v => {
                          const att = selectedMeeting.attendees?.find(a => a.id === v.attendeeId)
                          return att?.user?.fullName || att?.email || ''
                        })
                        .filter(Boolean)

                      return (
                        <Box key={slot.id} sx={{ p: 1.5, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                            <Typography variant="body2" fontWeight={600}>
                              {t('meetings.option')} {slot.slotNumber}
                            </Typography>
                            <Chip label={`${slot.voteCount} ${t('meetings.votes')}`} size="small" />
                          </Box>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            {new Date(slot.proposedStart).toLocaleDateString(getDateLocale(), { weekday: 'short', month: 'short', day: 'numeric' })}
                            {' '}
                            {new Date(slot.proposedStart).toLocaleTimeString(getDateLocale(), { hour: '2-digit', minute: '2-digit' })}
                            {slot.proposedEnd && ` - ${new Date(slot.proposedEnd).toLocaleTimeString(getDateLocale(), { hour: '2-digit', minute: '2-digit' })}`}
                          </Typography>
                          <LinearProgress variant="determinate" value={pct} sx={{ mb: 0.5, borderRadius: 1, height: 6 }} />
                          {voterNames.length > 0 && (
                            <Typography variant="caption" color="text.secondary">
                              {voterNames.join(', ')}
                            </Typography>
                          )}
                          {selectedMeeting.status === 'pending_votes' && selectedMeeting.createdBy?.id === currentUser?.id && (
                            <Button
                              variant="primary"
                              size="small"
                              icon={<CheckCircleIcon />}
                              onClick={() => handleConfirmTimeSlot(slot)}
                              disabled={confirmingSlot}
                              sx={{ mt: 1 }}
                            >
                              {t('meetings.confirmThisTime')}
                            </Button>
                          )}
                        </Box>
                      )
                    })}
                  </Box>
                </Box>
              </>
            )}

            {/* Current user RSVP actions */}
            {currentUserAttendee && selectedMeeting.status !== 'cancelled' && selectedMeeting.status !== 'completed' && (
              <>
                <Divider sx={{ my: 2 }} />
                <Box sx={{ mb: 3 }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>{t('meetings.rsvp.yourResponse').toUpperCase()}</Typography>
                  <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                    <Button
                      variant={currentUserAttendee.attendanceStatus === 'accepted' ? 'primary' : 'secondary'}
                      size="small"
                      onClick={() => handleRsvp(currentUserAttendee, 'accepted')}
                    >
                      {t('meetings.rsvp.accept')}
                    </Button>
                    <Button
                      variant={currentUserAttendee.attendanceStatus === 'tentative' ? 'primary' : 'secondary'}
                      size="small"
                      onClick={() => handleRsvp(currentUserAttendee, 'tentative')}
                    >
                      {t('meetings.rsvp.tentativeAction')}
                    </Button>
                    <Button
                      variant={currentUserAttendee.attendanceStatus === 'declined' ? 'danger' : 'secondary'}
                      size="small"
                      onClick={() => handleRsvp(currentUserAttendee, 'declined')}
                    >
                      {t('meetings.rsvp.decline')}
                    </Button>
                  </Box>
                </Box>
              </>
            )}

            {/* Meeting Photos */}
            <Divider sx={{ my: 2 }} />
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>{t('meetings.photos').toUpperCase()}</Typography>
                <IconButton size="small" onClick={() => fileInputRef.current?.click()}>
                  <AddPhotoAlternateIcon fontSize="small" />
                </IconButton>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  hidden
                  onChange={handlePhotoUpload}
                />
              </Box>
              {meetingPhotos.length > 0 ? (
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1 }}>
                  {meetingPhotos.map(photo => (
                    <Box
                      key={photo.id}
                      sx={{
                        aspectRatio: '1',
                        borderRadius: 1,
                        overflow: 'hidden',
                        bgcolor: 'action.hover',
                      }}
                    >
                      {photoUrls[photo.id] && (
                        <img
                          src={photoUrls[photo.id]}
                          alt={photo.filename}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      )}
                    </Box>
                  ))}
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">{t('meetings.addPhotos')}</Typography>
              )}
            </Box>

            {calendarLinks && (
              <>
                <Divider sx={{ my: 2 }} />
                <Box sx={{ mb: 3 }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>{t('meetings.calendar.addToCalendar').toUpperCase()}</Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1 }}>
                    <Button variant="secondary" fullWidth icon={<CalendarMonthIcon />} onClick={() => window.open(calendarLinks.google_url, '_blank')}>
                      {t('meetings.calendar.google')}
                    </Button>
                    <Button variant="secondary" fullWidth icon={<EventIcon />} onClick={() => window.open(calendarLinks.outlook_url, '_blank')}>
                      {t('meetings.calendar.outlook')}
                    </Button>
                    <Button variant="secondary" fullWidth icon={<DownloadIcon />} onClick={() => window.open(calendarLinks.ics_download_url, '_blank')}>
                      {t('meetings.calendar.downloadIcs')}
                    </Button>
                  </Box>
                </Box>
              </>
            )}

            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button variant="secondary" fullWidth onClick={() => handleOpenEdit(selectedMeeting)}>
                {t('meetings.editMeeting')}
              </Button>
              <Button variant="danger" fullWidth onClick={() => handleDeleteClick(selectedMeeting)}>
                {t('common.delete')}
              </Button>
            </Box>
          </Box>
        )}
      </Drawer>

      {/* Create/Edit Form Modal */}
      <FormModal
        open={dialogOpen}
        onClose={handleCloseDialog}
        onSubmit={handleSaveMeeting}
        title={editingMeeting ? t('meetings.editMeeting') : t('meetings.scheduleMeeting')}
        submitLabel={editingMeeting ? t('common.saveChanges') : t('meetings.scheduleMeeting')}
        loading={saving}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField
            fullWidth
            label={t('meetings.meetingTitle')}
            required
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            onBlur={() => validateField('title', formData.title)}
            error={!!errors.title}
            helperText={errors.title}
          />
          <MuiTextField
            fullWidth
            select
            label={t('meetings.meetingTypeLabel')}
            value={formData.meetingType}
            onChange={(e) => setFormData({ ...formData, meetingType: e.target.value })}
          >
            <MenuItem value="">{t('meetings.selectType')}</MenuItem>
            {meetingTypes.map(type => <MenuItem key={type.value} value={type.value}>{type.label}</MenuItem>)}
          </MuiTextField>
          <TextField
            fullWidth
            label={t('meetings.description')}
            multiline
            rows={2}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            onBlur={() => validateField('description', formData.description)}
            error={!!errors.description}
            helperText={errors.description}
          />
          <TextField
            fullWidth
            label={t('meetings.location')}
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            error={!!errors.location}
            helperText={errors.location}
          />
          {!editingMeeting && (
            <FormControlLabel
              control={
                <Switch
                  checked={proposeTimeSlots}
                  onChange={(e) => setProposeTimeSlots(e.target.checked)}
                />
              }
              label={t('meetings.proposeTimeSlots')}
            />
          )}

          {proposeTimeSlots && !editingMeeting ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {timeSlotInputs.map((slot, idx) => (
                <Box key={idx} sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                  <TextField
                    fullWidth
                    label={`${t('meetings.option')} ${idx + 1} - ${t('meetings.date')}`}
                    type="date"
                    InputLabelProps={{ shrink: true }}
                    required={idx < 2}
                    value={slot.date}
                    onChange={(e) => {
                      const updated = [...timeSlotInputs]
                      updated[idx] = { ...updated[idx], date: e.target.value }
                      setTimeSlotInputs(updated)
                    }}
                  />
                  <TextField
                    fullWidth
                    label={t('meetings.time')}
                    type="time"
                    InputLabelProps={{ shrink: true }}
                    required={idx < 2}
                    value={slot.time}
                    onChange={(e) => {
                      const updated = [...timeSlotInputs]
                      updated[idx] = { ...updated[idx], time: e.target.value }
                      setTimeSlotInputs(updated)
                    }}
                  />
                </Box>
              ))}
            </Box>
          ) : (
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
              <TextField
                fullWidth
                label={t('meetings.date')}
                type="date"
                InputLabelProps={{ shrink: true }}
                required
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                onBlur={() => validateField('date', formData.date)}
                error={!!errors.date}
                helperText={errors.date}
              />
              <TextField
                fullWidth
                label={t('meetings.startTime')}
                type="time"
                InputLabelProps={{ shrink: true }}
                required
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                onBlur={() => validateField('startTime', formData.startTime)}
                error={!!errors.startTime}
                helperText={errors.startTime}
              />
            </Box>
          )}

          {/* Attendee Picker (create mode only) */}
          {!editingMeeting && (
            <Autocomplete
              multiple
              options={teamMembers}
              getOptionLabel={(opt) => opt.name}
              value={selectedAttendees}
              onChange={(_, val) => setSelectedAttendees(val)}
              renderOption={(props, option) => (
                <li {...props} key={option.id}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Avatar sx={{ width: 28, height: 28, fontSize: 12 }}>{option.name.charAt(0)}</Avatar>
                    <Box>
                      <Typography variant="body2">{option.name}</Typography>
                      {option.email && <Typography variant="caption" color="text.secondary">{option.email}</Typography>}
                    </Box>
                  </Box>
                </li>
              )}
              renderTags={(value, getTagProps) =>
                value.map((opt, index) => (
                  <Chip
                    {...getTagProps({ index })}
                    key={opt.id}
                    label={opt.name}
                    size="small"
                    avatar={<Avatar sx={{ width: 20, height: 20, fontSize: 10 }}>{opt.name.charAt(0)}</Avatar>}
                  />
                ))
              }
              renderInput={(params) => (
                <MuiTextField
                  {...params}
                  label={t('meetings.selectAttendees')}
                  placeholder={selectedAttendees.length === 0 ? t('meetings.selectAttendees') : ''}
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: (
                      <>
                        <PersonAddIcon sx={{ fontSize: 20, color: 'text.secondary', mr: 0.5 }} />
                        {params.InputProps.startAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />
          )}
        </Box>
      </FormModal>

      <ConfirmModal
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        title={t('meetings.deleteConfirmation')}
        message={t('meetings.deleteConfirmationMessage', { title: meetingToDelete?.title || '' })}
        confirmLabel={t('common.delete')}
        variant="danger"
        loading={deleting}
      />
    </Box>
  )
}
