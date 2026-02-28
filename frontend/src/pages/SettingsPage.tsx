import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../components/common/ToastProvider'
import { useAuth } from '../contexts/AuthContext'
import { useProject } from '../contexts/ProjectContext'
import { meetingsApi } from '../api/meetings'
import { projectsApi } from '../api/projects'
import { LogoutIcon, CalendarTodayIcon, CameraAltIcon, EditIcon } from '@/icons'
import { Box, Typography, CircularProgress, Chip, IconButton, useTheme, Button, alpha } from '@/mui'
import { Card } from '../components/ui/Card'
import { Avatar } from '../components/ui/Avatar'
import SettingsPreferences from '../components/settings/SettingsPreferences'
import SettingsSecurity from '../components/settings/SettingsSecurity'
import { SettingsRow } from '../components/settings/SettingsRow'

export default function SettingsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { showSuccess, showError } = useToast()
  const { user, logout } = useAuth()
  const theme = useTheme()
  const isRtl = theme.direction === 'rtl'

  const [notifications, setNotifications] = useState(() => {
    const saved = localStorage.getItem('builderops_notification_prefs')
    if (saved) return JSON.parse(saved)
    return { email: true, push: true, rfis: true, approvals: true }
  })

  const [dailySummary, setDailySummary] = useState(() => {
    const saved = localStorage.getItem('builderops_daily_summary')
    return saved !== null ? JSON.parse(saved) : true
  })

  const [calendarConnected, setCalendarConnected] = useState(false)
  const [calendarConfigured, setCalendarConfigured] = useState(false)
  const [calendarLoading, setCalendarLoading] = useState(true)

  const { selectedProjectId, projects } = useProject()
  const selectedProject = projects.find(p => p.id === selectedProjectId)
  const [digestInterval, setDigestInterval] = useState<number>(selectedProject?.notificationDigestIntervalHours ?? 48)

  useEffect(() => {
    setDigestInterval(selectedProject?.notificationDigestIntervalHours ?? 48)
  }, [selectedProject?.notificationDigestIntervalHours])

  const handleDigestIntervalChange = async (value: number) => {
    if (!selectedProjectId) return
    setDigestInterval(value)
    try {
      await projectsApi.update(selectedProjectId, { notification_digest_interval_hours: value })
      showSuccess(t('settings.settingsUpdated'))
    } catch {
      showError(t('settings.digestUpdateError'))
      setDigestInterval(selectedProject?.notificationDigestIntervalHours ?? 48)
    }
  }

  useEffect(() => {
    const calendarParam = searchParams.get('calendar')
    if (calendarParam === 'connected') {
      showSuccess(t('settings.calendarConnectedSuccess'))
      searchParams.delete('calendar')
      setSearchParams(searchParams, { replace: true })
    } else if (calendarParam === 'error') {
      showError(t('settings.calendarError'))
      searchParams.delete('calendar')
      setSearchParams(searchParams, { replace: true })
    }
    loadCalendarStatus()
  }, [])

  const loadCalendarStatus = async () => {
    try {
      const status = await meetingsApi.getCalendarStatus()
      setCalendarConnected(status.google_connected)
      setCalendarConfigured(status.google_configured)
    } catch {
      // calendar status is optional
    } finally {
      setCalendarLoading(false)
    }
  }

  const handleConnectCalendar = async () => {
    try {
      const { auth_url } = await meetingsApi.getCalendarAuthUrl()
      window.location.href = auth_url
    } catch {
      showError(t('settings.calendarError'))
    }
  }

  const handleDisconnectCalendar = async () => {
    try {
      await meetingsApi.disconnectCalendar()
      setCalendarConnected(false)
      showSuccess(t('settings.calendarDisconnected'))
    } catch {
      showError(t('settings.calendarError'))
    }
  }

  const handleNotificationChange = (key: keyof typeof notifications) => {
    setNotifications((prev: typeof notifications) => {
      const updated = { ...prev, [key]: !prev[key] }
      localStorage.setItem('builderops_notification_prefs', JSON.stringify(updated))
      return updated
    })
    showSuccess(t('settings.settingsUpdated'))
  }

  const handleDailySummaryChange = () => {
    const next = !dailySummary
    setDailySummary(next)
    localStorage.setItem('builderops_daily_summary', JSON.stringify(next))
    showSuccess(t('settings.settingsUpdated'))
  }

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, pb: { xs: 12, sm: 4 } }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary', mb: 0.5, fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
          {t('settings.title')}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t('settings.subtitle')}
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, maxWidth: 600 }}>
        <Card sx={{ p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
          <Box sx={{ position: 'relative', mb: 1 }}>
            <Avatar name={user?.fullName || ''} size="xlarge" />
            <IconButton
              size="small"
              onClick={() => navigate('/profile')}
              aria-label={t('profile.changeAvatar')}
              sx={{
                position: 'absolute',
                bottom: 0,
                [isRtl ? 'right' : 'left']: 0,
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                width: 32,
                height: 32,
                '&:hover': { bgcolor: 'primary.dark' },
              }}
            >
              <CameraAltIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Box>
          <Typography variant="h6" fontWeight={700}>
            {user?.fullName || ''}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {user?.email || ''}
          </Typography>
          {user?.role && (
            <Chip
              label={t(`roles.${user.role}`)}
              size="small"
              sx={{ bgcolor: 'warning.main', color: 'warning.contrastText', fontWeight: 600, mt: 0.5 }}
            />
          )}
          <Box
            onClick={() => navigate('/profile')}
            sx={{ display: 'flex', alignItems: 'center', gap: 0.5, cursor: 'pointer', mt: 0.5 }}
          >
            <EditIcon sx={{ fontSize: 16, color: 'primary.main' }} />
            <Typography variant="body2" color="primary.main" fontWeight={500}>
              {t('settings.editProfile')}
            </Typography>
          </Box>
        </Card>

        <SettingsPreferences
          notifications={notifications}
          onNotificationChange={handleNotificationChange}
          dailySummary={dailySummary}
          onDailySummaryChange={handleDailySummaryChange}
          digestInterval={digestInterval}
          onDigestIntervalChange={handleDigestIntervalChange}
          selectedProjectId={selectedProjectId}
        />

        {calendarConfigured && (
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em', px: 1, mb: 1, display: 'block' }}>
              {t('settings.integrations')}
            </Typography>
            <Card>
              <SettingsRow
                icon={<CalendarTodayIcon sx={{ color: 'primary.main' }} />}
                label={t('settings.googleCalendar')}
                subtitle={calendarConnected ? t('settings.calendarConnected') : t('settings.calendarNotConnected')}
                action={
                  calendarLoading ? (
                    <CircularProgress size={20} />
                  ) : calendarConnected ? (
                    <Button size="small" color="error" variant="outlined" onClick={handleDisconnectCalendar} sx={{ textTransform: 'none', fontSize: '0.75rem' }}>
                      {t('settings.disconnectCalendar')}
                    </Button>
                  ) : (
                    <Button size="small" variant="contained" onClick={handleConnectCalendar} sx={{ textTransform: 'none', fontSize: '0.75rem' }}>
                      {t('settings.connectCalendar')}
                    </Button>
                  )
                }
              />
            </Card>
          </Box>
        )}

        <SettingsSecurity />

        <Card
          onClick={() => logout()}
          sx={{
            p: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1,
            cursor: 'pointer',
            bgcolor: (t) => alpha(t.palette.error.main, 0.08),
            border: (t) => `1px solid ${alpha(t.palette.error.main, 0.2)}`,
            '&:hover': { bgcolor: (t) => alpha(t.palette.error.main, 0.15) },
            transition: 'background-color 0.2s',
          }}
        >
          <LogoutIcon sx={{ color: 'error.main' }} />
          <Typography variant="body1" fontWeight={700} color="error.main">
            {t('settings.logout')}
          </Typography>
        </Card>
      </Box>
    </Box>
  )
}
