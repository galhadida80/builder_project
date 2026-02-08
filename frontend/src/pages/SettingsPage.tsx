import { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Paper from '@mui/material/Paper'
import Switch from '@mui/material/Switch'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import ListItemSecondaryAction from '@mui/material/ListItemSecondaryAction'
import Divider from '@mui/material/Divider'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import { useTranslation } from 'react-i18next'
import { useToast } from '../components/common/ToastProvider'
import { useThemeMode } from '../theme'

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
    showSuccess('Settings updated')
  }

  const handleLanguageChange = (lang: string) => {
    i18n.changeLanguage(lang)
    showSuccess('Language changed')
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
          Settings
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage your account preferences and notifications
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, maxWidth: 800 }}>
        <Paper sx={{ p: 0 }}>
          <Box sx={{ p: 2.5, pb: 1 }}>
            <Typography variant="h6" fontWeight={600}>
              Preferences
            </Typography>
          </Box>
          <List>
            <ListItem>
              <ListItemText
                primary="Language"
                secondary="Select your preferred language"
              />
              <ListItemSecondaryAction>
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <Select
                    value={i18n.language}
                    onChange={(e) => handleLanguageChange(e.target.value)}
                  >
                    <MenuItem value="en">English</MenuItem>
                    <MenuItem value="he">Hebrew</MenuItem>
                    <MenuItem value="es">Spanish</MenuItem>
                  </Select>
                </FormControl>
              </ListItemSecondaryAction>
            </ListItem>
            <Divider component="li" />
            <ListItem>
              <ListItemText
                primary="Theme"
                secondary="Choose your color theme"
              />
              <ListItemSecondaryAction>
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <Select
                    value={mode}
                    onChange={(e) => {
                      setMode(e.target.value as 'light' | 'dark' | 'system')
                      showSuccess('Theme updated')
                    }}
                  >
                    <MenuItem value="system">System</MenuItem>
                    <MenuItem value="light">Light</MenuItem>
                    <MenuItem value="dark">Dark</MenuItem>
                  </Select>
                </FormControl>
              </ListItemSecondaryAction>
            </ListItem>
          </List>
        </Paper>

        <Paper sx={{ p: 0 }}>
          <Box sx={{ p: 2.5, pb: 1 }}>
            <Typography variant="h6" fontWeight={600}>
              Notifications
            </Typography>
          </Box>
          <List>
            <ListItem>
              <ListItemText
                primary="Email Notifications"
                secondary="Receive email updates for important events"
              />
              <ListItemSecondaryAction>
                <Switch
                  checked={notifications.email}
                  onChange={() => handleNotificationChange('email')}
                  inputProps={{ 'aria-label': 'Email notifications' }}
                />
              </ListItemSecondaryAction>
            </ListItem>
            <Divider component="li" />
            <ListItem>
              <ListItemText
                primary="Push Notifications"
                secondary="Receive browser push notifications"
              />
              <ListItemSecondaryAction>
                <Switch
                  checked={notifications.push}
                  onChange={() => handleNotificationChange('push')}
                  inputProps={{ 'aria-label': 'Push notifications' }}
                />
              </ListItemSecondaryAction>
            </ListItem>
            <Divider component="li" />
            <ListItem>
              <ListItemText
                primary="RFI Updates"
                secondary="Get notified when RFIs are updated or responded to"
              />
              <ListItemSecondaryAction>
                <Switch
                  checked={notifications.rfis}
                  onChange={() => handleNotificationChange('rfis')}
                  inputProps={{ 'aria-label': 'RFI update notifications' }}
                />
              </ListItemSecondaryAction>
            </ListItem>
            <Divider component="li" />
            <ListItem>
              <ListItemText
                primary="Approval Requests"
                secondary="Get notified when items require your approval"
              />
              <ListItemSecondaryAction>
                <Switch
                  checked={notifications.approvals}
                  onChange={() => handleNotificationChange('approvals')}
                  inputProps={{ 'aria-label': 'Approval request notifications' }}
                />
              </ListItemSecondaryAction>
            </ListItem>
          </List>
        </Paper>

        <Paper sx={{ p: 0 }}>
          <Box sx={{ p: 2.5, pb: 1 }}>
            <Typography variant="h6" fontWeight={600}>
              Data & Privacy
            </Typography>
          </Box>
          <List>
            <ListItem>
              <ListItemText
                primary="Export Data"
                secondary="Download all your data in a CSV format"
              />
              <ListItemSecondaryAction>
                <Typography
                  component="button"
                  variant="body2"
                  onClick={() => showSuccess('Export started')}
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
                  Download
                </Typography>
              </ListItemSecondaryAction>
            </ListItem>
          </List>
        </Paper>
      </Box>
    </Box>
  )
}
