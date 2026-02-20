import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { meetingsApi } from '../api/meetings'
import { getDateLocale } from '../utils/dateLocale'
import { Box, Typography, CircularProgress } from '@/mui'
import { Button } from '../components/ui/Button'
import { ConstructionIcon, EventIcon, LocationOnIcon, AccessTimeIcon, CalendarMonthIcon, CheckCircleIcon, CancelIcon, HelpOutlineIcon } from '@/icons'

interface RSVPInfo {
  meetingTitle: string
  meetingDate: string
  meetingLocation?: string
  organizerName?: string
  attendeeName?: string
  attendanceStatus: string
}

export default function MeetingRSVPPage() {
  const { token } = useParams<{ token: string }>()
  const [searchParams] = useSearchParams()
  const { t } = useTranslation()

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [info, setInfo] = useState<RSVPInfo | null>(null)
  const [error, setError] = useState(false)
  const [responded, setResponded] = useState(false)

  useEffect(() => {
    loadInfo()
  }, [token])

  const loadInfo = async () => {
    if (!token) return
    try {
      const data = await meetingsApi.getRsvpInfo(token)
      setInfo(data)

      const action = searchParams.get('action')
      if (action && ['accepted', 'declined', 'tentative'].includes(action) && data.attendanceStatus === 'pending') {
        await submitRsvp(action)
      }
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  const submitRsvp = async (status: string) => {
    if (!token) return
    setSubmitting(true)
    try {
      const data = await meetingsApi.rsvpByToken(token, status)
      setInfo(data)
      setResponded(true)
    } catch {
      setError(true)
    } finally {
      setSubmitting(false)
    }
  }

  const dateLocale = getDateLocale()

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(dateLocale, {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    })
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString(dateLocale, { hour: '2-digit', minute: '2-digit' })
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100dvh', bgcolor: 'background.default' }}>
        <CircularProgress />
      </Box>
    )
  }

  if (error || !info) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '100dvh', bgcolor: 'background.default' }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 3, borderBottom: '1px solid', borderColor: 'divider', width: '100%' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ConstructionIcon sx={{ fontSize: 28, color: 'primary.main' }} />
            <Typography sx={{ fontWeight: 700, fontSize: '1.125rem', color: 'text.primary' }}>BuilderOps</Typography>
          </Box>
        </Box>
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 4 }}>
          <Box sx={{ textAlign: 'center', maxWidth: 400 }}>
            <EventIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography sx={{ fontWeight: 600, fontSize: '1.1rem', mb: 1, color: 'text.primary' }}>
              {t('meetings.rsvp.title')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('meetings.rsvp.expired')}
            </Typography>
          </Box>
        </Box>
      </Box>
    )
  }

  return (
    <Box
      sx={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        bgcolor: 'background.default',
      }}
    >
      {/* Mobile container */}
      <Box sx={{ width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>
        {/* Header */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            p: 3,
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ConstructionIcon sx={{ fontSize: 28, color: 'primary.main' }} />
            <Typography sx={{ fontWeight: 700, fontSize: '1.125rem', color: 'text.primary' }}>
              BuilderOps
            </Typography>
          </Box>
        </Box>

        {/* Main content */}
        <Box sx={{ flex: 1, p: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Invitation card */}
          <Box
            sx={{
              bgcolor: 'background.paper',
              borderRadius: 3,
              p: 2.5,
              boxShadow: (theme) => theme.palette.mode === 'dark'
                ? '0 4px 16px rgba(0,0,0,0.4)'
                : '0 4px 16px rgba(0,0,0,0.06)',
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
              <Box
                sx={{
                  bgcolor: (theme) => `${theme.palette.primary.main}33`,
                  p: 1,
                  borderRadius: 2,
                  display: 'flex',
                }}
              >
                <CalendarMonthIcon sx={{ color: 'primary.main' }} />
              </Box>
              <Typography sx={{ color: 'primary.main', fontWeight: 500, fontSize: '0.875rem' }}>
                {t('meetings.rsvp.respondToInvitation')}
              </Typography>
            </Box>
            <Typography sx={{ fontSize: '1.5rem', fontWeight: 700, lineHeight: 1.3, color: 'text.primary', mb: 2 }}>
              {info.meetingTitle}
            </Typography>
            {info.organizerName && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    bgcolor: 'primary.main',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'primary.contrastText',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                  }}
                >
                  {info.organizerName.charAt(0)}
                </Box>
                <Box>
                  <Typography sx={{ fontWeight: 600, fontSize: '0.9rem', color: 'text.primary' }}>
                    {info.organizerName}
                  </Typography>
                  <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                    {t('meetings.rsvp.organizedBy')}
                  </Typography>
                </Box>
              </Box>
            )}
          </Box>

          {/* Meeting details */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, px: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
              <Box
                sx={{
                  bgcolor: (theme) => theme.palette.mode === 'dark' ? 'grey.800' : 'grey.100',
                  p: 1,
                  borderRadius: 2,
                  flexShrink: 0,
                }}
              >
                <EventIcon sx={{ color: 'text.secondary' }} />
              </Box>
              <Box>
                <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                  {t('meetings.date')}
                </Typography>
                <Typography sx={{ fontWeight: 500, color: 'text.primary' }}>
                  {formatDate(info.meetingDate)}
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
              <Box
                sx={{
                  bgcolor: (theme) => theme.palette.mode === 'dark' ? 'grey.800' : 'grey.100',
                  p: 1,
                  borderRadius: 2,
                  flexShrink: 0,
                }}
              >
                <AccessTimeIcon sx={{ color: 'text.secondary' }} />
              </Box>
              <Box>
                <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                  {t('meetings.time')}
                </Typography>
                <Typography sx={{ fontWeight: 500, color: 'text.primary' }}>
                  {formatTime(info.meetingDate)}
                </Typography>
              </Box>
            </Box>

            {info.meetingLocation && (
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                <Box
                  sx={{
                    bgcolor: (theme) => theme.palette.mode === 'dark' ? 'grey.800' : 'grey.100',
                    p: 1,
                    borderRadius: 2,
                    flexShrink: 0,
                  }}
                >
                  <LocationOnIcon sx={{ color: 'text.secondary' }} />
                </Box>
                <Box>
                  <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                    {t('meetings.location')}
                  </Typography>
                  <Typography sx={{ fontWeight: 500, color: 'primary.main' }}>
                    {info.meetingLocation}
                  </Typography>
                </Box>
              </Box>
            )}
          </Box>

          {/* RSVP Actions */}
          <Box sx={{ px: 1, pt: 2 }}>
            {responded ? (
              <Box sx={{ textAlign: 'center', py: 3 }}>
                <CheckCircleIcon sx={{ fontSize: 48, color: 'success.main', mb: 1 }} />
                <Typography sx={{ fontWeight: 600, fontSize: '1.1rem', color: 'success.main', mb: 0.5 }}>
                  {t('meetings.rsvp.confirmMessage')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t(`meetings.rsvp.${info.attendanceStatus}`)}
                </Typography>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Button
                  fullWidth
                  variant="primary"
                  onClick={() => submitRsvp('accepted')}
                  disabled={submitting}
                  icon={<CheckCircleIcon />}
                  sx={{
                    py: 2,
                    fontWeight: 700,
                    borderRadius: 3,
                    bgcolor: 'success.main',
                    '&:hover': { bgcolor: 'success.dark' },
                  }}
                >
                  {t('meetings.rsvp.accept')}
                </Button>
                <Box sx={{ display: 'flex', gap: 1.5 }}>
                  <Button
                    fullWidth
                    variant="danger"
                    onClick={() => submitRsvp('declined')}
                    disabled={submitting}
                    icon={<CancelIcon />}
                    sx={{ py: 1.5, fontWeight: 700, borderRadius: 3 }}
                  >
                    {t('meetings.rsvp.decline')}
                  </Button>
                  <Button
                    fullWidth
                    variant="secondary"
                    onClick={() => submitRsvp('tentative')}
                    disabled={submitting}
                    icon={<HelpOutlineIcon />}
                    sx={{ py: 1.5, fontWeight: 700, borderRadius: 3 }}
                  >
                    {t('meetings.rsvp.tentativeAction')}
                  </Button>
                </Box>
              </Box>
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  )
}
