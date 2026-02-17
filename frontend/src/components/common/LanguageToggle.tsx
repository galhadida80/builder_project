import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LanguageIcon } from '@/icons'
import { IconButton, Tooltip, Menu, MenuItem, ListItemIcon, ListItemText } from '@/mui'

export function LanguageToggle() {
  const { t, i18n } = useTranslation()
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const open = Boolean(anchorEl)

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  const handleSelect = (lng: 'en' | 'he' | 'es') => {
    i18n.changeLanguage(lng)
    handleClose()
  }

  const getLanguageFlag = (lng: string) => {
    switch (lng) {
      case 'en':
        return '🇺🇸'
      case 'he':
        return '🇮🇱'
      case 'es':
        return '🇪🇸'
      default:
        return '🌐'
    }
  }

  const getLanguageName = (lng: string) => {
    switch (lng) {
      case 'en':
        return 'English'
      case 'he':
        return 'עברית'
      case 'es':
        return 'Español'
      default:
        return lng.toUpperCase()
    }
  }

  return (
    <>
      <Tooltip title="Language">
        <IconButton
          onClick={handleClick}
          size="small"
          aria-label={t('language.selectLanguage')}
          sx={{
            color: 'text.secondary',
            '&:hover': { color: 'text.primary' },
          }}
        >
          <LanguageIcon />
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
          onClick={() => handleSelect('en')}
          selected={i18n.language === 'en'}
        >
          <ListItemIcon sx={{ fontSize: '1.5rem' }}>
            {getLanguageFlag('en')}
          </ListItemIcon>
          <ListItemText>{getLanguageName('en')}</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => handleSelect('he')}
          selected={i18n.language === 'he'}
        >
          <ListItemIcon sx={{ fontSize: '1.5rem' }}>
            {getLanguageFlag('he')}
          </ListItemIcon>
          <ListItemText>{getLanguageName('he')}</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => handleSelect('es')}
          selected={i18n.language === 'es'}
        >
          <ListItemIcon sx={{ fontSize: '1.5rem' }}>
            {getLanguageFlag('es')}
          </ListItemIcon>
          <ListItemText>{getLanguageName('es')}</ListItemText>
        </MenuItem>
      </Menu>
    </>
  )
}
