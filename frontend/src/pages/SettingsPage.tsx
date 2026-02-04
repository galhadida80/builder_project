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

export default function SettingsPage() {
  const { t, i18n } = useTranslation()
  const { showSuccess } = useToast()

  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    rfis: true,
    approvals: true,
  })

  const [theme, setTheme] = useState('system')

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
                    value={theme}
                    onChange={(e) => setTheme(e.target.value)}
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
                  variant="body2"
                  sx={{
                    color: 'primary.main',
                    cursor: 'pointer',
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
