import { IconButton, Tooltip, Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material'
import { useState, useEffect } from 'react'
import LanguageIcon from '@mui/icons-material/Language'

type Language = 'en' | 'he'

export function LanguageToggle() {
  const [currentLanguage, setCurrentLanguage] = useState<Language>('en')
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const open = Boolean(anchorEl)

  // Initialize from document.dir or localStorage
  useEffect(() => {
    const savedLang = localStorage.getItem('language') as Language | null
    const initialLang = savedLang || (document.dir === 'rtl' ? 'he' : 'en')
    setCurrentLanguage(initialLang)
    document.dir = initialLang === 'he' ? 'rtl' : 'ltr'
  }, [])

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  const handleSelect = (lng: Language) => {
    setCurrentLanguage(lng)
    document.dir = lng === 'he' ? 'rtl' : 'ltr'
    localStorage.setItem('language', lng)
    handleClose()
  }

  const getLanguageFlag = (lng: Language) => {
    return lng === 'en' ? '🇺🇸' : '🇮🇱'
  }

  const getLanguageName = (lng: Language) => {
    return lng === 'en' ? 'English' : 'עברית'
  }

  return (
    <>
      <Tooltip title="Language">
        <IconButton
          onClick={handleClick}
          size="small"
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
          sx: { marginBlockStart: 1, minWidth: 160 },
        }}
      >
        <MenuItem
          onClick={() => handleSelect('en')}
          selected={currentLanguage === 'en'}
        >
          <ListItemIcon sx={{ fontSize: '1.5rem' }}>
            {getLanguageFlag('en')}
          </ListItemIcon>
          <ListItemText>{getLanguageName('en')}</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => handleSelect('he')}
          selected={currentLanguage === 'he'}
        >
          <ListItemIcon sx={{ fontSize: '1.5rem' }}>
            {getLanguageFlag('he')}
          </ListItemIcon>
          <ListItemText>{getLanguageName('he')}</ListItemText>
        </MenuItem>
      </Menu>
    </>
  )
}
