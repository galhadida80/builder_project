import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { meetingsApi } from '../api/meetings'
import { getDateLocale } from '../utils/dateLocale'
import { Box, Typography, CircularProgress } from '@/mui'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { EventIcon, LocationOnIcon, AccessTimeIcon, CalendarMonthIcon } from '@/icons'

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
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', bgcolor: '#F1F5F9' }}>
        <CircularProgress />
      </Box>
    )
  }

  if (error || !info) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', bgcolor: '#F1F5F9' }}>
        <Card>
          <Box sx={{ p: 4, textAlign: 'center', maxWidth: 400 }}>
            <EventIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" fontWeight={600} sx={{ mb: 1 }}>{t('meetings.rsvp.title')}</Typography>
            <Typography variant="body2" color="text.secondary">{t('meetings.rsvp.expired')}</Typography>
          </Box>
        </Card>
      </Box>
    )
  }

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', bgcolor: '#F1F5F9', p: 2 }}>
      <Card>
        <Box sx={{ p: { xs: 3, sm: 4 }, maxWidth: 480 }}>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Box
              sx={{
                width: 64,
                height: 64,
                borderRadius: 2,
                bgcolor: 'primary.main',
                color: 'white',
                display: 'inline-flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 2,
              }}
            >
              <Typography variant="h5" sx={{ lineHeight: 1, fontWeight: 700 }}>
                {new Date(info.meetingDate).getDate()}
              </Typography>
              <Typography variant="caption" sx={{ lineHeight: 1, textTransform: 'uppercase', color: 'rgba(255,255,255,0.8)' }}>
                {new Date(info.meetingDate).toLocaleDateString(undefined, { month: 'short' })}
              </Typography>
            </Box>
            <Typography variant="h5" fontWeight={700} sx={{ mb: 0.5 }}>{info.meetingTitle}</Typography>
            {info.attendeeName && (
              <Typography variant="body2" color="text.secondary">
                {t('meetings.rsvp.respondToInvitation')}
              </Typography>
            )}
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <CalendarMonthIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
              <Typography variant="body2">{formatDate(info.meetingDate)}</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <AccessTimeIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
              <Typography variant="body2">{formatTime(info.meetingDate)}</Typography>
            </Box>
            {info.meetingLocation && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <LocationOnIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
                <Typography variant="body2">{info.meetingLocation}</Typography>
              </Box>
            )}
            {info.organizerName && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <EventIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
                <Typography variant="body2">{t('meetings.rsvp.organizedBy')}: {info.organizerName}</Typography>
              </Box>
            )}
          </Box>

          {responded ? (
            <Box sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h6" fontWeight={600} color="success.main" sx={{ mb: 1 }}>
                {t('meetings.rsvp.confirmMessage')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t(`meetings.rsvp.${info.attendanceStatus}`)}
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <Button
                variant="primary"
                fullWidth
                onClick={() => submitRsvp('accepted')}
                disabled={submitting}
              >
                {t('meetings.rsvp.accept')}
              </Button>
              <Button
                variant="secondary"
                fullWidth
                onClick={() => submitRsvp('tentative')}
                disabled={submitting}
              >
                {t('meetings.rsvp.tentativeAction')}
              </Button>
              <Button
                variant="danger"
                fullWidth
                onClick={() => submitRsvp('declined')}
                disabled={submitting}
              >
                {t('meetings.rsvp.decline')}
              </Button>
            </Box>
          )}
        </Box>
      </Card>
    </Box>
  )
}
