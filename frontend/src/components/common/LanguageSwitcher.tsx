import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '../../i18n'
import { SUPPORTED_LANGUAGES, type LanguageCode } from '../../i18n/config'
import { LanguageIcon } from '@/icons'
import { IconButton, Tooltip, Menu, MenuItem, ListItemIcon, ListItemText } from '@/mui'

export function LanguageSwitcher() {
  const { t } = useTranslation()
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
          aria-label={t('common.selectLanguage')}
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
        {SUPPORTED_LANGUAGES.map((lang) => (
          <MenuItem
            key={lang.code}
            onClick={() => handleSelect(lang.code)}
            selected={language === lang.code}
          >
            <ListItemIcon>
              <span style={{ fontSize: '1.2em' }}>{lang.flag}</span>
            </ListItemIcon>
            <ListItemText>{lang.name}</ListItemText>
          </MenuItem>
        ))}
      </Menu>
    </>
  )
}
