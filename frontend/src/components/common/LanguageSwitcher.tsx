import { IconButton, Tooltip, Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material'
import { useState } from 'react'
import LanguageIcon from '@mui/icons-material/Language'
import { useLanguage } from '../../i18n'
import { SUPPORTED_LANGUAGES, type LanguageCode } from '../../i18n/config'

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage()
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const open = Boolean(anchorEl)

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  const handleSelect = (newLanguage: LanguageCode) => {
    setLanguage(newLanguage)
    handleClose()
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
          sx: { mt: 1, minWidth: 160 },
        }}
      >
        {(Object.entries(SUPPORTED_LANGUAGES) as [LanguageCode, string][]).map(([code, name]) => (
          <MenuItem
            key={code}
            onClick={() => handleSelect(code)}
            selected={language === code}
          >
            <ListItemIcon>
              <LanguageIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>{name}</ListItemText>
          </MenuItem>
        ))}
      </Menu>
    </>
  )
}
