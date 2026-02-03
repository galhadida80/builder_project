import { IconButton, Menu, MenuItem, ListItemText } from '@mui/material'
import LanguageIcon from '@mui/icons-material/Language'
import { useState } from 'react'
import { useLanguage } from '../../hooks/useLanguage'

export function LanguageToggle() {
  const { currentLanguage, changeLanguage } = useLanguage()
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  const handleLanguageChange = (lng: string) => {
    changeLanguage(lng)
    handleClose()
  }

  return (
    <>
      <IconButton onClick={handleClick} color="inherit">
        <LanguageIcon />
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
      >
        <MenuItem
          selected={currentLanguage === 'en'}
          onClick={() => handleLanguageChange('en')}
        >
          <ListItemText primary="English" />
        </MenuItem>
        <MenuItem
          selected={currentLanguage === 'he'}
          onClick={() => handleLanguageChange('he')}
        >
          <ListItemText primary="עברית" />
        </MenuItem>
      </Menu>
    </>
  )
}
