import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useToast } from '../components/common/ToastProvider'
import { useThemeMode } from '../theme'
import { useAuth } from '../contexts/AuthContext'
import { meetingsApi } from '../api/meetings'
import PushNotificationToggle from '../components/notifications/PushNotificationToggle'
import { LanguageIcon, DarkModeIcon, NotificationsIcon, LockIcon, FingerprintIcon, InfoIcon, DescriptionIcon, SecurityIcon, LogoutIcon, ChevronLeftIcon, ChevronRightIcon, AdminPanelSettingsIcon, EmailIcon, CalendarTodayIcon, CameraAltIcon, EditIcon, CheckCircleIcon, ViewListIcon } from '@/icons'
import { Box, Typography, Paper, Switch, Divider, Select, MenuItem, FormControl, useTheme, Button, CircularProgress, Avatar, Chip, IconButton } from '@/mui'

export default function SettingsPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { showSuccess, showError } = useToast()
  const { user, logout } = useAuth()
  const theme = useTheme()
  const isRtl = theme.direction === 'rtl'
  const ChevronIcon = isRtl ? ChevronLeftIcon : ChevronRightIcon

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

  const { mode, setMode } = useThemeMode()

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

  const handleLanguageChange = (lang: string) => {
    i18n.changeLanguage(lang)
    showSuccess(t('settings.languageChanged'))
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
        <Paper sx={{ borderRadius: 3, p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
          <Box sx={{ position: 'relative', mb: 1 }}>
            <Avatar
              sx={{ width: 100, height: 100, fontSize: '2.5rem', bgcolor: 'primary.main' }}
            >
              {user?.fullName?.charAt(0)?.toUpperCase() || '?'}
            </Avatar>
            <IconButton
              size="small"
              onClick={() => navigate('/profile')}
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
        </Paper>

        <Box>
          <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em', px: 1, mb: 1, display: 'block' }}>
            {t('settings.preferences')}
          </Typography>
          <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
            <SettingsRow
              icon={<LanguageIcon sx={{ color: 'primary.main' }} />}
              label={t('settings.language')}
              action={
                <FormControl size="small" sx={{ minWidth: 100 }}>
                  <Select value={i18n.language} onChange={(e) => handleLanguageChange(e.target.value)} variant="standard" disableUnderline sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>
                    <MenuItem value="en">{t('common.english')}</MenuItem>
                    <MenuItem value="he">{t('common.hebrew')}</MenuItem>
                  </Select>
                </FormControl>
              }
            />
            <Divider />
            <SettingsRow
              icon={<DarkModeIcon sx={{ color: 'primary.main' }} />}
              label={t('settings.theme')}
              action={
                <FormControl size="small" sx={{ minWidth: 100 }}>
                  <Select value={mode} onChange={(e) => { setMode(e.target.value as 'light' | 'dark' | 'system'); showSuccess(t('settings.themeUpdated')); }} variant="standard" disableUnderline sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>
                    <MenuItem value="system">{t('settings.system')}</MenuItem>
                    <MenuItem value="light">{t('settings.light')}</MenuItem>
                    <MenuItem value="dark">{t('settings.dark')}</MenuItem>
                  </Select>
                </FormControl>
              }
            />
          </Paper>
        </Box>

        <Box>
          <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em', px: 1, mb: 1, display: 'block' }}>
            {t('settings.notifications')}
          </Typography>
          <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
            <SettingsRow
              icon={<EmailIcon sx={{ color: 'primary.main' }} />}
              label={t('settings.emailNotifications')}
              subtitle={t('settings.emailNotificationsDescription')}
              action={<Switch checked={notifications.email} onChange={() => handleNotificationChange('email')} color="primary" />}
            />
            <Divider />
            <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', gap: 2 }}>
              <NotificationsIcon sx={{ color: 'primary.main', fontSize: 22 }} />
              <Box sx={{ flex: 1 }}>
                <PushNotificationToggle />
              </Box>
            </Box>
            <Divider />
            <SettingsRow
              icon={<DescriptionIcon sx={{ color: 'primary.main' }} />}
              label={t('settings.rfiUpdates')}
              subtitle={t('settings.rfiUpdatesDescription')}
              action={<Switch checked={notifications.rfis} onChange={() => handleNotificationChange('rfis')} color="primary" />}
            />
            <Divider />
            <SettingsRow
              icon={<AdminPanelSettingsIcon sx={{ color: 'primary.main' }} />}
              label={t('settings.approvalRequests')}
              subtitle={t('settings.approvalRequestsDescription')}
              action={<Switch checked={notifications.approvals} onChange={() => handleNotificationChange('approvals')} color="primary" />}
            />
            <Divider />
            <SettingsRow
              icon={<ViewListIcon sx={{ color: 'primary.main' }} />}
              label={t('settings.dailySummary')}
              subtitle={t('settings.dailySummaryDescription')}
              action={<Switch checked={dailySummary} onChange={() => { const next = !dailySummary; setDailySummary(next); localStorage.setItem('builderops_daily_summary', JSON.stringify(next)); showSuccess(t('settings.settingsUpdated')); }} color="primary" />}
            />
          </Paper>
        </Box>

        {calendarConfigured && (
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em', px: 1, mb: 1, display: 'block' }}>
              {t('settings.integrations')}
            </Typography>
            <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
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
            </Paper>
          </Box>
        )}

        <Box>
          <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em', px: 1, mb: 1, display: 'block' }}>
            {t('settings.security')}
          </Typography>
          <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
            <SettingsRow
              icon={<LockIcon sx={{ color: 'primary.main' }} />}
              label={t('settings.changePassword')}
              action={<ChevronIcon sx={{ color: 'text.disabled', fontSize: 20 }} />}
              onClick={() => navigate('/forgot-password')}
            />
            <Divider />
            <SettingsRow
              icon={<FingerprintIcon sx={{ color: 'primary.main' }} />}
              label={t('settings.passkey')}
              action={<ChevronIcon sx={{ color: 'text.disabled', fontSize: 20 }} />}
              onClick={() => navigate('/profile')}
            />
            <Divider />
            <SettingsRow
              icon={<CheckCircleIcon sx={{ color: 'text.disabled' }} />}
              label={t('settings.twoFactorAuth')}
              action={
                <Chip label={t('settings.comingSoon')} size="small" sx={{ bgcolor: 'action.disabledBackground', color: 'text.secondary', fontWeight: 600, fontSize: '0.7rem', height: 24 }} />
              }
            />
          </Paper>
        </Box>

        <Box>
          <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em', px: 1, mb: 1, display: 'block' }}>
            {t('settings.info')}
          </Typography>
          <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
            <SettingsRow
              icon={<InfoIcon sx={{ color: 'primary.main' }} />}
              label={t('settings.version')}
              action={<Typography variant="body2" color="text.secondary">v2.4.1</Typography>}
            />
            <Divider />
            <SettingsRow
              icon={<SecurityIcon sx={{ color: 'primary.main' }} />}
              label={t('settings.privacyPolicy')}
              action={<ChevronIcon sx={{ color: 'text.disabled', fontSize: 20 }} />}
              onClick={() => window.open('https://builderops.dev/privacy', '_blank')}
            />
          </Paper>
        </Box>

        <Paper
          onClick={() => logout()}
          sx={{
            borderRadius: 3,
            p: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1,
            cursor: 'pointer',
            bgcolor: 'rgba(211,47,47,0.08)',
            border: '1px solid rgba(211,47,47,0.2)',
            '&:hover': { bgcolor: 'rgba(211,47,47,0.15)' },
            transition: 'background-color 0.2s',
          }}
        >
          <LogoutIcon sx={{ color: 'error.main' }} />
          <Typography variant="body1" fontWeight={700} color="error.main">
            {t('settings.logout')}
          </Typography>
        </Paper>
      </Box>
    </Box>
  )
}

function SettingsRow({ icon, label, subtitle, action, onClick }: {
  icon: React.ReactNode
  label: string
  subtitle?: string
  action: React.ReactNode
  onClick?: () => void
}) {
  return (
    <Box
      onClick={onClick}
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        px: 2,
        py: 1.5,
        cursor: onClick ? 'pointer' : 'default',
        '&:hover': onClick ? { bgcolor: 'action.hover' } : {},
        transition: 'background-color 0.15s',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1, minWidth: 0 }}>
        {icon}
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" fontWeight={500}>{label}</Typography>
          {subtitle && <Typography variant="caption" color="text.secondary">{subtitle}</Typography>}
        </Box>
      </Box>
      <Box sx={{ flexShrink: 0, ml: 1 }}>{action}</Box>
    </Box>
  )
}
