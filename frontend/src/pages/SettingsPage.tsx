import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../components/common/ToastProvider'
import { useThemeMode } from '../theme'
import { useAuth } from '../contexts/AuthContext'
import { LanguageIcon, DarkModeIcon, NotificationsIcon, LockIcon, FingerprintIcon, InfoIcon, DescriptionIcon, SecurityIcon, LogoutIcon, ChevronLeftIcon, ChevronRightIcon, AdminPanelSettingsIcon, EmailIcon } from '@/icons'
import { Box, Typography, Paper, Switch, Divider, Select, MenuItem, FormControl, useTheme } from '@/mui'

export default function SettingsPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { showSuccess } = useToast()
  const { logout } = useAuth()
  const theme = useTheme()
  const isRtl = theme.direction === 'rtl'
  const ChevronIcon = isRtl ? ChevronLeftIcon : ChevronRightIcon

  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    rfis: true,
    approvals: true,
  })

  const { mode, setMode } = useThemeMode()

  const handleNotificationChange = (key: keyof typeof notifications) => {
    setNotifications(prev => ({ ...prev, [key]: !prev[key] }))
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
            <SettingsRow
              icon={<NotificationsIcon sx={{ color: 'primary.main' }} />}
              label={t('settings.pushNotifications')}
              subtitle={t('settings.pushNotificationsDescription')}
              action={<Switch checked={notifications.push} onChange={() => handleNotificationChange('push')} color="primary" />}
            />
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
          </Paper>
        </Box>

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
