import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
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
import { parseValidationErrors } from '../utils/apiErrors'
import { getDateLocale } from '../utils/dateLocale'
import { AddIcon, EditIcon, DeleteIcon, EventIcon, LocationOnIcon, AccessTimeIcon, CalendarMonthIcon, SyncIcon, CloseIcon, DownloadIcon } from '@/icons'
import { Box, Typography, MenuItem, TextField as MuiTextField, Skeleton, Chip, IconButton, Drawer, Divider } from '@/mui'

export default function MeetingsPage() {
  const { projectId } = useParams()
  const { showError, showSuccess } = useToast()
  const { t } = useTranslation()

  const meetingTypes = [
    { value: 'site_inspection', label: t('meetings.typeSiteInspection') },
    { value: 'approval_meeting', label: t('meetings.typeApprovalMeeting') },
    { value: 'coordination', label: t('meetings.typeCoordination') },
    { value: 'safety_review', label: t('meetings.typeSafetyReview') },
    { value: 'other', label: t('meetings.typeOther') },
  ]

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
      showError(t('meetings.failedToLoad'))
    } finally {
      setLoading(false)
    }
  }

  const validateField = (field: string, value: string) => {
    const testData = { ...formData, [field]: value }
    const allErrors = validateMeetingForm({
      title: testData.title,
      description: testData.description,
    })
    if (field === 'date' && !testData.date) allErrors.date = t('meetings.dateRequired')
    if (field === 'startTime' && !testData.startTime) allErrors.startTime = t('meetings.startTimeRequired')
    setErrors(prev => ({ ...prev, [field]: allErrors[field] || null }))
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
    if (!formData.date) validationErrors.date = t('meetings.dateRequired')
    if (!formData.startTime) validationErrors.startTime = t('meetings.startTimeRequired')
    setErrors(validationErrors)
    if (hasErrors(validationErrors)) return

    setSaving(true)
    try {
      const scheduled_date = `${formData.date}T${formData.startTime}:00`
      if (editingMeeting) {
        await meetingsApi.update(projectId, editingMeeting.id, {
          title: formData.title,
          meeting_type: formData.meetingType || undefined,
          description: formData.description || undefined,
          location: formData.location || undefined,
          scheduled_date
        })
        showSuccess(t('meetings.updatedSuccessfully'))
      } else {
        await meetingsApi.create(projectId, {
          title: formData.title,
          meeting_type: formData.meetingType || undefined,
          description: formData.description || undefined,
          location: formData.location || undefined,
          scheduled_date
        })
        showSuccess(t('meetings.scheduledSuccessfully'))
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
    try {
      await meetingsApi.delete(projectId, meetingToDelete.id)
      showSuccess(t('meetings.deletedSuccessfully'))
      setDeleteDialogOpen(false)
      setMeetingToDelete(null)
      loadMeetings()
    } catch {
      showError(t('meetings.failedToDelete'))
    }
  }

  const upcomingMeetings = meetings.filter(m => m.status === 'scheduled' || m.status === 'invitations_sent')
  const pastMeetings = meetings.filter(m => m.status === 'completed' || m.status === 'cancelled')
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

  const [calendarLinks, setCalendarLinks] = useState<{ google_url: string; outlook_url: string; ics_download_url: string } | null>(null)

  const handleMeetingClick = async (meeting: Meeting) => {
    setSelectedMeeting(meeting)
    setDetailsOpen(true)
    setCalendarLinks(null)
    if (projectId) {
      try {
        const links = await meetingsApi.getCalendarLinks(projectId, meeting.id)
        setCalendarLinks(links)
      } catch {
        // calendar links are optional, don't block the UI
      }
    }
  }

  const handleSyncCalendar = () => {
    showSuccess(t('meetings.syncCalendarComingSoon'))
  }

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
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 1 }}>
            <Button variant="secondary" icon={<SyncIcon />} onClick={handleSyncCalendar}>
              {t('meetings.syncCalendar')}
            </Button>
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
                        users={[{ name: 'User' }]}
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

      <Drawer
        anchor="right"
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        sx={{ zIndex: 1400 }}
        PaperProps={{ sx: { width: { xs: '100%', sm: 420 }, borderRadius: '16px 0 0 16px' } }}
      >
        {selectedMeeting && (
          <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
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

            <Box sx={{ mb: 3 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>{t('meetings.attendees').toUpperCase()}</Typography>
              <Box sx={{ mt: 1 }}>
                <AvatarGroup users={[{ name: 'User' }]} max={10} size="medium" />
              </Box>
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
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 2 }}>
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
            <TextField
              fullWidth
              label={t('meetings.endTime')}
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
        title={t('meetings.deleteConfirmation')}
        message={t('meetings.deleteConfirmationMessage', { title: meetingToDelete?.title || '' })}
        confirmLabel={t('common.delete')}
        variant="danger"
      />
    </Box>
  )
}
