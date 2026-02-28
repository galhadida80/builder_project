import { useTranslation } from 'react-i18next'
import { useToast } from '../common/ToastProvider'
import { useThemeMode } from '../../theme'
import { LanguageIcon, DarkModeIcon, EmailIcon, NotificationsIcon, DescriptionIcon, AdminPanelSettingsIcon, ViewListIcon } from '@/icons'
import { Box, Typography, Switch, Divider, Select, MenuItem, FormControl } from '@/mui'
import { Card } from '../ui/Card'
import PushNotificationToggle from '../notifications/PushNotificationToggle'
import { SettingsRow } from './SettingsRow'

interface NotificationPrefs {
  email: boolean
  push: boolean
  rfis: boolean
  approvals: boolean
}

interface SettingsPreferencesProps {
  notifications: NotificationPrefs
  onNotificationChange: (key: keyof NotificationPrefs) => void
  dailySummary: boolean
  onDailySummaryChange: () => void
  digestInterval: number
  onDigestIntervalChange: (value: number) => void
  selectedProjectId: string | undefined
}

export default function SettingsPreferences({
  notifications,
  onNotificationChange,
  dailySummary,
  onDailySummaryChange,
  digestInterval,
  onDigestIntervalChange,
  selectedProjectId,
}: SettingsPreferencesProps) {
  const { t, i18n } = useTranslation()
  const { showSuccess } = useToast()
  const { mode, setMode } = useThemeMode()

  const handleLanguageChange = (lang: string) => {
    i18n.changeLanguage(lang)
    showSuccess(t('settings.languageChanged'))
  }

  return (
    <>
      <Box>
        <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em', px: 1, mb: 1, display: 'block' }}>
          {t('settings.preferences')}
        </Typography>
        <Card>
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
        </Card>
      </Box>

      <Box>
        <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em', px: 1, mb: 1, display: 'block' }}>
          {t('settings.notifications')}
        </Typography>
        <Card>
          <SettingsRow
            icon={<EmailIcon sx={{ color: 'primary.main' }} />}
            label={t('settings.emailNotifications')}
            subtitle={t('settings.emailNotificationsDescription')}
            action={<Switch checked={notifications.email} onChange={() => onNotificationChange('email')} color="primary" />}
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
            action={<Switch checked={notifications.rfis} onChange={() => onNotificationChange('rfis')} color="primary" />}
          />
          <Divider />
          <SettingsRow
            icon={<AdminPanelSettingsIcon sx={{ color: 'primary.main' }} />}
            label={t('settings.approvalRequests')}
            subtitle={t('settings.approvalRequestsDescription')}
            action={<Switch checked={notifications.approvals} onChange={() => onNotificationChange('approvals')} color="primary" />}
          />
          <Divider />
          <SettingsRow
            icon={<ViewListIcon sx={{ color: 'primary.main' }} />}
            label={t('settings.dailySummary')}
            subtitle={t('settings.dailySummaryDescription')}
            action={<Switch checked={dailySummary} onChange={onDailySummaryChange} color="primary" />}
          />
          {selectedProjectId && (
            <>
              <Divider />
              <SettingsRow
                icon={<NotificationsIcon sx={{ color: 'primary.main' }} />}
                label={t('settings.digestInterval')}
                subtitle={t('settings.digestIntervalDescription')}
                action={
                  <FormControl size="small" sx={{ minWidth: 120 }}>
                    <Select
                      value={digestInterval}
                      onChange={(e) => onDigestIntervalChange(Number(e.target.value))}
                      variant="standard"
                      disableUnderline
                      sx={{ fontSize: '0.875rem', color: 'text.secondary' }}
                    >
                      <MenuItem value={0}>{t('settings.digestOff')}</MenuItem>
                      <MenuItem value={12}>{t('settings.digestEvery12h')}</MenuItem>
                      <MenuItem value={24}>{t('settings.digestEvery24h')}</MenuItem>
                      <MenuItem value={48}>{t('settings.digestEvery48h')}</MenuItem>
                      <MenuItem value={72}>{t('settings.digestEvery72h')}</MenuItem>
                      <MenuItem value={168}>{t('settings.digestWeekly')}</MenuItem>
                    </Select>
                  </FormControl>
                }
              />
            </>
          )}
        </Card>
      </Box>
    </>
  )
}
