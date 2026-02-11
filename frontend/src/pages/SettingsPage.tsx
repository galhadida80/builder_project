import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useToast } from '../components/common/ToastProvider'
import { useThemeMode } from '../theme'
import { Box, Typography, Paper, Switch, List, ListItem, ListItemText, ListItemSecondaryAction, Divider, Select, MenuItem, FormControl } from '@/mui'

export default function SettingsPage() {
  const { t, i18n } = useTranslation()
  const { showSuccess } = useToast()

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
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="h4"
          sx={{
            fontWeight: 700,
            color: 'text.primary',
            mb: 0.5,
            fontSize: { xs: '1.75rem', sm: '2.125rem' },
          }}
        >
          {t('settings.title')}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {t('settings.subtitle')}
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, maxWidth: 800 }}>
        <Paper sx={{ p: 0 }}>
          <Box sx={{ p: 2.5, pb: 1 }}>
            <Typography variant="h6" fontWeight={600}>
              {t('settings.preferences')}
            </Typography>
          </Box>
          <List>
            <ListItem>
              <ListItemText
                primary={t('settings.language')}
                secondary={t('settings.languageDescription')}
              />
              <ListItemSecondaryAction>
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <Select
                    value={i18n.language}
                    onChange={(e) => handleLanguageChange(e.target.value)}
                  >
                    <MenuItem value="en">{t('common.english')}</MenuItem>
                    <MenuItem value="he">{t('common.hebrew')}</MenuItem>
                    <MenuItem value="es">{t('settings.spanish')}</MenuItem>
                  </Select>
                </FormControl>
              </ListItemSecondaryAction>
            </ListItem>
            <Divider component="li" />
            <ListItem>
              <ListItemText
                primary={t('settings.theme')}
                secondary={t('settings.themeDescription')}
              />
              <ListItemSecondaryAction>
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <Select
                    value={mode}
                    onChange={(e) => {
                      setMode(e.target.value as 'light' | 'dark' | 'system')
                      showSuccess(t('settings.themeUpdated'))
                    }}
                  >
                    <MenuItem value="system">{t('settings.system')}</MenuItem>
                    <MenuItem value="light">{t('settings.light')}</MenuItem>
                    <MenuItem value="dark">{t('settings.dark')}</MenuItem>
                  </Select>
                </FormControl>
              </ListItemSecondaryAction>
            </ListItem>
          </List>
        </Paper>

        <Paper sx={{ p: 0 }}>
          <Box sx={{ p: 2.5, pb: 1 }}>
            <Typography variant="h6" fontWeight={600}>
              {t('settings.notifications')}
            </Typography>
          </Box>
          <List>
            <ListItem>
              <ListItemText
                primary={t('settings.emailNotifications')}
                secondary={t('settings.emailNotificationsDescription')}
              />
              <ListItemSecondaryAction>
                <Switch
                  checked={notifications.email}
                  onChange={() => handleNotificationChange('email')}
                />
              </ListItemSecondaryAction>
            </ListItem>
            <Divider component="li" />
            <ListItem>
              <ListItemText
                primary={t('settings.pushNotifications')}
                secondary={t('settings.pushNotificationsDescription')}
              />
              <ListItemSecondaryAction>
                <Switch
                  checked={notifications.push}
                  onChange={() => handleNotificationChange('push')}
                />
              </ListItemSecondaryAction>
            </ListItem>
            <Divider component="li" />
            <ListItem>
              <ListItemText
                primary={t('settings.rfiUpdates')}
                secondary={t('settings.rfiUpdatesDescription')}
              />
              <ListItemSecondaryAction>
                <Switch
                  checked={notifications.rfis}
                  onChange={() => handleNotificationChange('rfis')}
                />
              </ListItemSecondaryAction>
            </ListItem>
            <Divider component="li" />
            <ListItem>
              <ListItemText
                primary={t('settings.approvalRequests')}
                secondary={t('settings.approvalRequestsDescription')}
              />
              <ListItemSecondaryAction>
                <Switch
                  checked={notifications.approvals}
                  onChange={() => handleNotificationChange('approvals')}
                />
              </ListItemSecondaryAction>
            </ListItem>
          </List>
        </Paper>

        <Paper sx={{ p: 0 }}>
          <Box sx={{ p: 2.5, pb: 1 }}>
            <Typography variant="h6" fontWeight={600}>
              {t('settings.dataPrivacy')}
            </Typography>
          </Box>
          <List>
            <ListItem>
              <ListItemText
                primary={t('settings.exportData')}
                secondary={t('settings.exportDataDescription')}
              />
              <ListItemSecondaryAction>
                <Typography
                  component="button"
                  variant="body2"
                  onClick={() => showSuccess(t('settings.exportStarted'))}
                  sx={{
                    color: 'primary.main',
                    cursor: 'pointer',
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    font: 'inherit',
                    '&:hover': { textDecoration: 'underline' }
                  }}
                >
                  {t('buttons.download')}
                </Typography>
              </ListItemSecondaryAction>
            </ListItem>
          </List>
        </Paper>
      </Box>
    </Box>
  )
}
