import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useThemeMode } from '../../theme'
import { LightModeIcon, DarkModeIcon, SettingsBrightnessIcon } from '@/icons'
import { IconButton, Tooltip, Menu, MenuItem, ListItemIcon, ListItemText } from '@/mui'

export function ThemeToggle() {
  const { t } = useTranslation()
  const { mode, setMode, isDark } = useThemeMode()
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const open = Boolean(anchorEl)

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  const handleSelect = (newMode: 'light' | 'dark' | 'system') => {
    setMode(newMode)
    handleClose()
  }

  const getCurrentIcon = () => {
    if (mode === 'system') return <SettingsBrightnessIcon />
    return isDark ? <DarkModeIcon /> : <LightModeIcon />
  }

  return (
    <>
      <Tooltip title={t('settings.theme')}>
        <IconButton
          onClick={handleClick}
          size="small"
          aria-label={t('common.changeTheme')}
          sx={{
            color: 'text.secondary',
            '&:hover': { color: 'text.primary' },
          }}
        >
          {getCurrentIcon()}
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        PaperProps={{
          sx: { mt: 1, minWidth: 160 },
        }}
      >
        <MenuItem
          onClick={() => handleSelect('light')}
          selected={mode === 'light'}
        >
          <ListItemIcon>
            <LightModeIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>{t('settings.light')}</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => handleSelect('dark')}
          selected={mode === 'dark'}
        >
          <ListItemIcon>
            <DarkModeIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>{t('settings.dark')}</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => handleSelect('system')}
          selected={mode === 'system'}
        >
          <ListItemIcon>
            <SettingsBrightnessIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>{t('settings.system')}</ListItemText>
        </MenuItem>
      </Menu>
    </>
  )
}
