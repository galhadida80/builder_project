import { useTranslation } from 'react-i18next'
import { Button, Menu, MenuItem } from '@mui/material'
import { Language as LanguageIcon } from '@mui/icons-material'
import { useState } from 'react'

export default function LanguageToggle() {
  const { i18n, t } = useTranslation()
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const open = Boolean(anchorEl)

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng)
    localStorage.setItem('language', lng)
    document.documentElement.setAttribute('dir', i18n.dir(lng))
    document.documentElement.setAttribute('lang', lng)
    handleClose()
  }

  return (
    <>
      <Button
        onClick={handleClick}
        startIcon={<LanguageIcon />}
        color="inherit"
      >
        {i18n.language === 'he' ? t('common.hebrew') : t('common.english')}
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
      >
        <MenuItem onClick={() => changeLanguage('en')}>
          {t('common.english')}
        </MenuItem>
        <MenuItem onClick={() => changeLanguage('he')}>
          {t('common.hebrew')}
        </MenuItem>
      </Menu>
    </>
  )
}
