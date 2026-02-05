'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Avatar from '@mui/material/Avatar'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Switch from '@mui/material/Switch'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Button from '@mui/material/Button'
import PersonIcon from '@mui/icons-material/Person'
import PaletteIcon from '@mui/icons-material/Palette'
import LanguageIcon from '@mui/icons-material/Language'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import LightModeIcon from '@mui/icons-material/LightMode'
import LogoutIcon from '@mui/icons-material/Logout'
import { useAuth } from '@/lib/contexts/AuthContext'

export default function SettingsPage() {
  const t = useTranslations()
  const { user, logout } = useAuth()
  const [language, setLanguage] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('locale') || 'en'
    }
    return 'en'
  })
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('themeMode') === 'dark'
    }
    return false
  })

  const handleLanguageChange = (newLang: string) => {
    setLanguage(newLang)
    if (typeof window !== 'undefined') {
      localStorage.setItem('locale', newLang)
      window.location.reload()
    }
  }

  const handleThemeToggle = () => {
    const newMode = !darkMode
    setDarkMode(newMode)
    if (typeof window !== 'undefined') {
      localStorage.setItem('themeMode', newMode ? 'dark' : 'light')
      window.location.reload()
    }
  }

  return (
    <Box sx={{ p: 3, width: '100%', maxWidth: 800 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={700} color="text.primary" sx={{ mb: 0.5 }}>
          {t('settings.title', { defaultValue: 'Settings' })}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {t('settings.subtitle', { defaultValue: 'Manage your account and preferences' })}
        </Typography>
      </Box>

      <Card sx={{ borderRadius: 3, mb: 3 }}>
        <CardContent sx={{ p: 2.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
            <PersonIcon color="primary" />
            <Typography variant="h6" fontWeight={600}>
              {t('settings.profile', { defaultValue: 'Profile' })}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <Avatar sx={{ width: 72, height: 72, bgcolor: 'primary.main', fontSize: '1.75rem', fontWeight: 700 }}>
              {(user?.fullName || user?.email || 'U')[0].toUpperCase()}
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6" fontWeight={600}>
                {user?.fullName || t('settings.noName', { defaultValue: 'No name set' })}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {user?.email || ''}
              </Typography>
              {user?.role && (
                <Chip label={user.role} size="small" color="primary" variant="outlined" sx={{ textTransform: 'capitalize' }} />
              )}
            </Box>
          </Box>

          <Divider sx={{ my: 2.5 }} />

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
            <Box>
              <Typography variant="caption" color="text.secondary">
                {t('settings.fullName', { defaultValue: 'Full Name' })}
              </Typography>
              <Typography variant="body1" fontWeight={500}>
                {user?.fullName || '-'}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                {t('settings.email', { defaultValue: 'Email' })}
              </Typography>
              <Typography variant="body1" fontWeight={500}>
                {user?.email || '-'}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                {t('settings.role', { defaultValue: 'Role' })}
              </Typography>
              <Typography variant="body1" fontWeight={500} sx={{ textTransform: 'capitalize' }}>
                {user?.role || '-'}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                {t('settings.userId', { defaultValue: 'User ID' })}
              </Typography>
              <Typography variant="body2" fontWeight={500} sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                {user?.id || '-'}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      <Card sx={{ borderRadius: 3, mb: 3 }}>
        <CardContent sx={{ p: 2.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
            <PaletteIcon color="primary" />
            <Typography variant="h6" fontWeight={600}>
              {t('settings.preferences', { defaultValue: 'Preferences' })}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: 'primary.light', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <LanguageIcon sx={{ color: 'primary.main' }} />
              </Box>
              <Box>
                <Typography variant="subtitle2" fontWeight={600}>
                  {t('settings.language', { defaultValue: 'Language' })}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {t('settings.languageDescription', { defaultValue: 'Select your preferred language' })}
                </Typography>
              </Box>
            </Box>
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>{t('settings.language', { defaultValue: 'Language' })}</InputLabel>
              <Select value={language} label={t('settings.language', { defaultValue: 'Language' })} onChange={(e) => handleLanguageChange(e.target.value)}>
                <MenuItem value="en">English</MenuItem>
                <MenuItem value="he">Hebrew</MenuItem>
              </Select>
            </FormControl>
          </Box>

          <Divider sx={{ mb: 3 }} />

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: darkMode ? 'grey.800' : 'warning.light', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {darkMode ? <DarkModeIcon sx={{ color: 'grey.300' }} /> : <LightModeIcon sx={{ color: 'warning.main' }} />}
              </Box>
              <Box>
                <Typography variant="subtitle2" fontWeight={600}>
                  {t('settings.theme', { defaultValue: 'Theme' })}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {darkMode
                    ? t('settings.darkMode', { defaultValue: 'Dark mode is enabled' })
                    : t('settings.lightMode', { defaultValue: 'Light mode is enabled' })}
                </Typography>
              </Box>
            </Box>
            <Switch checked={darkMode} onChange={handleThemeToggle} />
          </Box>
        </CardContent>
      </Card>

      <Card sx={{ borderRadius: 3 }}>
        <CardContent sx={{ p: 2.5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography variant="subtitle1" fontWeight={600} color="error.main">
                {t('settings.signOut', { defaultValue: 'Sign Out' })}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {t('settings.signOutDescription', { defaultValue: 'Sign out of your account on this device' })}
              </Typography>
            </Box>
            <Button variant="outlined" color="error" startIcon={<LogoutIcon />} onClick={logout}>
              {t('settings.signOut', { defaultValue: 'Sign Out' })}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  )
}
